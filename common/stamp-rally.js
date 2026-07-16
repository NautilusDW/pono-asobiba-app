/* ============================================================
   common/stamp-rally.js
   スタンプカード(スタンプラリー)システム。15マス/5x3カードで
   ログイン・実績・デイリーチャレンジのスタンプを貯め、家具/水生生物/
   壁紙をおへや (room/index.html) にアンロックする。
   play-all.html から抽出 (2026-07-16, Stage 1)。play.html 等でも
   <script src="common/stamp-rally.js"></script> + common/stamp-rally.css
   を読み込めば同じ挙動になる想定 (要素が無ければ各関数は no-op)。

   依存 (呼び出し側ページが用意するグローバル。無ければ defensive に skip):
     window.grantReward / window.showTreasure / window.incrementStat
     window.PonoMvpFlags / window.PONO_MVP_NO_REWARDS / window.PonoDebugMode
     window.ponoProfile / window.getAchievements / window.getUnlockedAchievements
     window.PonoPromo / ROOM_ITEMS (room/items.js) / window._scheduleFirstClearAfterStamps
       (first-clear celebration は別系統のため未移設。呼び出し側に残置する場合はこの
        グローバルを実装すると showStampBatch 完了後などに連鎖起動される)

   依存 DOM (無ければ該当処理のみ no-op):
     #stampRallyGames / #stampRallyBonus (renderDailyRally)
     #stampCardNum / #stampCardRowLabel / #stampCard / #stampCardSection (renderStampCard)
     .card (ゲームカード、スタンプ増分検出用クリックリスナー)

   export: window.PonoStampRally = { addStampToday, checkDailyCompletion,
     renderDailyRally, checkSlotReward, showStampBatch, showFullCardModal,
     initStampRally, CARD_SLOT_REWARDS, CARD_COMPLETE_REWARDS, ... }
   後方互換のため window._initStampRally / window.showFullCardModal /
   window.showAfterMsgOverlay もこれまで通りグローバルに生やす。
   ============================================================ */
(function() {
  'use strict';

  // ── スタンプ音（グローバルAudioContext + AudioBuffer）──
  // treasure.js と同じ window._ponoAudioCtx を共有
  function _getGlobalAC() {
    if (!window._ponoAudioCtx) {
      try { window._ponoAudioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    return window._ponoAudioCtx;
  }
  function _resumeAC() {
    var ac = _getGlobalAC();
    if (ac && ac.state === 'suspended') ac.resume().catch(function() {});
  }

  var _stampBuffer = null;
  var _stampLoading = false;
  function _loadStampBuffer() {
    if (_stampBuffer || _stampLoading) return;
    var ac = _getGlobalAC();
    if (!ac) return;
    _stampLoading = true;
    fetch('assets/sounds/se/common/success.mp3').then(function(r) { return r.arrayBuffer(); })
      .then(function(buf) { return ac.decodeAudioData(buf); })
      .then(function(decoded) { _stampBuffer = decoded; _stampLoading = false; })
      .catch(function() { _stampLoading = false; });
  }

  // ユーザージェスチャーでアンロック
  function _unlockStampAudio() { _resumeAC(); _loadStampBuffer(); }
  document.addEventListener('touchstart', _unlockStampAudio, { passive: true });
  document.addEventListener('touchend', _unlockStampAudio, { passive: true });
  document.addEventListener('click', _unlockStampAudio);
  _loadStampBuffer(); // プリロード

  function _playStampPop() {
    try {
      var ac = _getGlobalAC();
      if (!ac) return;
      _resumeAC();
      if (!_stampBuffer) return;
      var source = ac.createBufferSource();
      source.buffer = _stampBuffer;
      source.connect(ac.destination);
      source.start(0);
    } catch(e) {}
  }

  // ── Constants ──
  var LS_STAMP_LOG = 'pono_stamp_log';
  var LS_DAILY_RALLY = 'pono_daily_rally';
  var LS_STAMP_REWARDS_GIVEN = 'pono_stamp_rewards_given';
  var PONO_ICON = 'assets/ui/stamp-card/pono_red_rubber_stamp_20260716.webp';
  var SLOTS_PER_CARD = 15;
  var SLOTS_PER_ROW = 5;

  // ── Slot rewards (keyed by 1-based slot number within card) ──
  var CARD_SLOT_REWARDS = {
    1:  (function() {
          var g = 'boy';
          try { g = JSON.parse(localStorage.getItem('pono_profile') || '{}').gender || 'boy'; } catch(e) {}
          var afterMsg = ['あなただけの おもちゃばこ！\nスタンプで もらった たからものを\nここに いれられるよ。', 'スタンプを あつめて\nかぐを てに いれたら\n「わたしのおうち」で\nつかえるように なるよ！'];
          return g === 'girl'
            ? { icon: '🎁', name: 'おもちゃばこ', type: 'deco', id: 'deco_box',     img: 'assets/images/Rooms/furnitures_final/box_A.png',           afterMsg: afterMsg }
            : { icon: '🎁', name: 'おもちゃばこ', type: 'deco', id: 'deco_box_boy', img: 'assets/images/Rooms/furnitures_final/deco_box_boy_A.png', afterMsg: afterMsg };
        })(),
    5:  (function() {
          var g = 'boy';
          try { g = JSON.parse(localStorage.getItem('pono_profile') || '{}').gender || 'boy'; } catch(e) {}
          var afterMsg = 'ベッドが ついたよ！\nポノのおへやで かぐを\nじゆうに ならべて みよう！';
          return g === 'girl'
            ? { icon: '🛏️', name: 'ピンクベッド', type: 'furn', id: 'furn_bed_pink', img: 'assets/images/Rooms/furnitures_final/bed_pink_A.png', unlockRoom: true, afterMsg: afterMsg }
            : { icon: '🛏️', name: 'あおいベッド', type: 'furn', id: 'furn_bed_blue_boy', img: 'assets/images/Rooms/furnitures_final/furn_bed_blue_boy_A.png', unlockRoom: true, afterMsg: afterMsg };
        })(),
    10: (function() {
          var g = 'boy';
          try { g = JSON.parse(localStorage.getItem('pono_profile') || '{}').gender || 'boy'; } catch(e) {}
          return g === 'girl'
            ? { icon: '🧸', name: 'くまのぬいぐるみ', type: 'deco', id: 'deco_bear_ribbon', img: 'assets/images/Rooms/furnitures_final/bear_ribbon_A.png' }
            : { icon: '🧸', name: 'くまのぬいぐるみ', type: 'deco', id: 'furn_bear_1',      img: 'assets/images/Rooms/furnitures_final/bear_A.png' };
        })(),
    15: { icon: '⭐', name: 'カードかんせい！', type: 'special' },
  };

  // ── Card complete rewards (one per completed card, rotates) ──
  var CARD_COMPLETE_REWARDS = [
    { icon: '🐠', name: 'さかな',      type: 'sea',  id: 'medaka',        img: 'assets/images/ocean/Fish_S01/Fish_S01_001.png' },
    { icon: '🖼️', name: 'かべがみ',    type: 'wall', id: 'wall_mizutama', img: 'assets/images/Rooms/walls/mizutama.png' },
    { icon: '🐢', name: 'ウミガメ',     type: 'sea',  id: 'turtle',        img: 'assets/images/ocean/Turtle/Turtle_001.png' },
    { icon: '🪼', name: 'クラゲ',       type: 'sea',  id: 'jellyfish',     img: 'assets/images/ocean/JellyFish/JellyFish_001.png' },
  ];

  // レガシー: play.html の #stampRallySection は撤去済みのため実質no-op。play-all.html 専用
  var ALL_FREE_GAMES = [
    { key: 'oto',             emoji: '\uD83C\uDFB5', name: 'おとタッチ',        href: 'oto/index.html' },
    { key: 'quiz_sound',      emoji: '\uD83D\uDC3E', name: 'こだまのもりのこえさがし', href: 'quiz-sound/index.html' },
    { key: 'puzzle',          emoji: '\uD83E\uDDE9', name: 'パズル',            href: 'puzzle/index.html' },
    { key: 'bento',           emoji: '\uD83C\uDF71', name: 'おべんとう',        href: 'bento/index.html' },
    { key: 'quizland',        emoji: '\uD83E\uDDE0', name: 'フクロウ博士のなぞなぞ', href: 'quizland/index.html' },
    { key: 'maze',            emoji: '\uD83E\uDDED', name: 'めいろ',            href: 'maze/index.html' },
    { key: 'nazonazo-tunnel', emoji: '\uD83D\uDE82', name: 'なぞなぞトレイン',  href: 'nazonazo-tunnel/index.html' },
    { key: 'cooking',         emoji: '\uD83D\uDC69\u200D\uD83C\uDF73', name: 'クッキング', href: 'bento/kitchen.html' },
    { key: 'writing-mori',    emoji: '\u270F\uFE0F', name: 'もじっこファーム',  href: 'writing-mori/index.html' },
  ];

  // ── Helpers ──
  function getJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function setJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }
  function getTodayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  // common/stickers.js checkDailyLogin と同じ app-tier フォールバックパターン
  function rewardsBlocked() {
    if (window.PonoMvpFlags && typeof window.PonoMvpFlags.rewardsBlocked === 'function') {
      return window.PonoMvpFlags.rewardsBlocked();
    }
    return !!window.PONO_MVP_NO_REWARDS;
  }

  // ── Card position helpers ──
  function getCardNum(total) {
    return Math.floor(total / SLOTS_PER_CARD) + 1;
  }
  function getCardPos(total) {
    // 0-indexed position within current card (0..14)
    return total % SLOTS_PER_CARD;
  }
  function getFilledInCard(total) {
    // How many slots filled in the current card (0..15)
    if (total <= 0) return 0;
    var mod = total % SLOTS_PER_CARD;
    return mod === 0 ? SLOTS_PER_CARD : mod;
  }
  function getCurrentRow(total) {
    // Which row (0,1,2) the current position is in
    var pos = getCardPos(total);
    return Math.floor(pos / SLOTS_PER_ROW);
  }

  // ── 外部JSON読み込み（フォールバック: 上記ハードコード値） ──
  var _rewardsReady = false;
  function _loadRewardsJSON(cb) {
    try {
      var ctrl = new AbortController();
      var tid = setTimeout(function() { ctrl.abort(); }, 3000);
      fetch('assets/data/rewards.json?_=' + Date.now(), { signal: ctrl.signal })
        .then(function(r) { clearTimeout(tid); return r.json(); })
        .then(function(data) {
          if (data.slotRewards) {
            var sr = {};
            for (var k in data.slotRewards) sr[parseInt(k)] = data.slotRewards[k];
            CARD_SLOT_REWARDS = sr;
          }
          if (data.cardCompleteRewards) {
            CARD_COMPLETE_REWARDS = data.cardCompleteRewards;
          }
        })
        .catch(function() { /* フォールバック: ハードコード値をそのまま使用 */ })
        .finally(function() { _rewardsReady = true; if (cb) cb(); });
    } catch(e) { _rewardsReady = true; if (cb) cb(); }
  }

  // ── Slot reward lookup (gendered対応) ──
  // furn/deco の場合は ROOM_ITEMS から画像を解決（A角度を必ず優先）
  function _resolveRewardImg(type, id, fallbackImg) {
    if ((type === 'furn' || type === 'deco') && id && typeof ROOM_ITEMS !== 'undefined') {
      var found = ROOM_ITEMS.find(function(it) { return it.id === id; });
      if (found) {
        var a = found.roomImg || '';
        var b = found.roomImgB || '';
        // _A.pngを含む方を優先（items.jsで roomImg が _B を指している場合への対策）
        var picked = /_A\.png$/i.test(a) ? a : (/_A\.png$/i.test(b) ? b : (a || b));
        if (picked) return picked.replace(/^\.\.\//, '');
      }
    }
    // フォールバック画像も _B.png なら _A.png に置換
    if (fallbackImg && /_B\.png$/i.test(fallbackImg)) {
      return fallbackImg.replace(/_B\.png$/i, '_A.png');
    }
    return fallbackImg || '';
  }
  function getSlotRewardInfo(slotNum1Based) {
    var rw = CARD_SLOT_REWARDS[slotNum1Based] || null;
    if (!rw) return null;
    if (rw.gendered) {
      var g = 'boy';
      try { g = JSON.parse(localStorage.getItem('pono_profile') || '{}').gender || 'boy'; } catch(e) {}
      var v = rw[g] || rw['boy'] || {};
      // 男女別の名前があればそれを優先、無ければ総称名
      return { icon: rw.icon, name: v.name || rw.name, type: v.type, id: v.id,
               img: _resolveRewardImg(v.type, v.id, v.img),
               unlockRoom: v.unlockRoom || rw.unlockRoom, afterMsg: v.afterMsg || rw.afterMsg };
    }
    return rw;
  }
  function getCompleteReward(cardNum) {
    if (CARD_COMPLETE_REWARDS.length === 0) return null;
    var idx = (cardNum - 1) % CARD_COMPLETE_REWARDS.length;
    var rw = CARD_COMPLETE_REWARDS[idx];
    if (!rw) return null;
    if (rw.gendered) {
      var g = 'boy';
      try { g = JSON.parse(localStorage.getItem('pono_profile') || '{}').gender || 'boy'; } catch(e) {}
      var v = rw[g] || rw['boy'] || {};
      return {
        icon: rw.icon,
        name: v.name || rw.name,
        type: v.type,
        id:   v.id,
        img:  _resolveRewardImg(v.type, v.id, v.img),
        afterMsg: v.afterMsg || rw.afterMsg || ''
      };
    }
    // 非破壊でコピーを返す（元配列を汚さない）
    return {
      icon: rw.icon,
      name: rw.name,
      type: rw.type,
      id:   rw.id,
      img:  _resolveRewardImg(rw.type, rw.id, rw.img),
      afterMsg: rw.afterMsg || ''
    };
  }

  // ── afterMsg オーバーレイ（共通） ──
  // 宝箱演出を閉じた後や、祝賀モーダルを閉じた後に呼ぶ。
  // rw: { name, img, afterMsg } のオブジェクト
  // onDone: 閉じた後のコールバック（省略可）
  window.showAfterMsgOverlay = function(rw, onDone) {
    // MVP: 報酬制度封印中は説明モーダル (おもちゃばこ等) を一切出さない。app tier は解除。
    if (rewardsBlocked()) { if (onDone) onDone(); return; }
    if (!rw || !rw.afterMsg) { if (onDone) onDone(); return; }
    // afterMsg が配列なら複数ページ、文字列なら1ページ
    var msgs = Array.isArray(rw.afterMsg) ? rw.afterMsg : [rw.afterMsg];
    var pageIdx = 0;

    function showPage() {
      if (pageIdx >= msgs.length) { if (onDone) onDone(); return; }
      var msgOv = document.createElement('div');
      msgOv.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:20px;';

      var box = document.createElement('div');
      box.style.cssText = 'background:#fff;border-radius:20px;padding:20px;text-align:center;max-width:280px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3);transform:scale(0);transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1);';

      if (pageIdx === 0 && rw.img) {
        var img = document.createElement('img');
        img.src = rw.img;
        img.style.cssText = 'width:80px;height:80px;object-fit:contain;margin-bottom:8px;';
        img.onerror = function() { this.style.display = 'none'; };
        box.appendChild(img);
      }

      if (pageIdx === 0 && rw.name) {
        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:0.85rem;font-weight:900;color:#F2915A;margin-bottom:8px;';
        nameEl.textContent = rw.name;
        box.appendChild(nameEl);
      }

      var msgEl = document.createElement('div');
      // \n\n で段落分割、最後の段落を強調表示
      var paragraphs = msgs[pageIdx].split('\n\n');
      paragraphs.forEach(function(p, pi) {
        var pEl = document.createElement('div');
        var isLast = (pi === paragraphs.length - 1) && paragraphs.length > 1;
        if (isLast) {
          pEl.style.cssText = 'font-size:1.05rem;font-weight:900;color:#F2915A;line-height:1.6;white-space:pre-line;margin-top:10px;';
        } else {
          pEl.style.cssText = 'font-size:0.9rem;font-weight:700;color:#5D4E37;line-height:1.7;white-space:pre-line;';
        }
        pEl.textContent = p;
        msgEl.appendChild(pEl);
      });
      box.appendChild(msgEl);

      var btn = document.createElement('button');
      btn.textContent = pageIdx < msgs.length - 1 ? 'つぎへ →' : 'わかった！';
      btn.style.cssText = 'margin-top:12px;padding:10px 28px;border:none;border-radius:50px;background:linear-gradient(135deg,#60A5FA,#3B82F6);color:#fff;font-family:inherit;font-size:0.9rem;font-weight:900;cursor:pointer;';
      btn.addEventListener('click', function() {
        box.style.transition = 'transform 0.25s cubic-bezier(0.6,-0.28,0.74,0.05)';
        box.style.transform = 'scale(0)';
        setTimeout(function() { msgOv.remove(); pageIdx++; showPage(); }, 280);
      });
      box.appendChild(btn);

      msgOv.appendChild(box);
      document.body.appendChild(msgOv);
      requestAnimationFrame(function() { box.style.transform = 'scale(1)'; });
    }
    showPage();
  };

  // ── 1. Login Stamp (daily auto-grant) ──
  function getStampLog() {
    return getJSON(LS_STAMP_LOG, { dates: [], total: 0 });
  }
  function saveStampLog(log) {
    setJSON(LS_STAMP_LOG, log);
  }
  function addStampToday() {
    var log = getStampLog();
    var today = getTodayStr();
    if (log.dates.indexOf(today) !== -1) return { added: false, log: log };
    log.dates.push(today);
    log.total = log.dates.length;
    saveStampLog(log);
    return { added: true, log: log };
  }

  // ── Reward granting ──
  function checkSlotReward(total) {
    // MVP: 報酬制度封印中は宝箱・afterMsg・おへやアンロック の連鎖を全部止める。
    // grantReward も呼ばず given にも push しないので、再公開時に貯まったスタンプ
    // ぶんの報酬がまとめて発火する (最初の1個だけ宝箱演出、残りはサイレント) 仕様。
    if (rewardsBlocked()) return;
    // rewards.json がまだロード中なら少し待ってから再試行
    if (!_rewardsReady) {
      setTimeout(function() { checkSlotReward(total); }, 200);
      return;
    }
    var given = getJSON(LS_STAMP_REWARDS_GIVEN, []);
    var filled = getFilledInCard(total);
    var cardNum = getCardNum(total);
    var isCardComplete = (total > 0 && total % SLOTS_PER_CARD === 0);
    var completedCardNum = isCardComplete ? Math.floor((total - 1) / SLOTS_PER_CARD) + 1 : 0;

    // Check ALL slot-level rewards up to current position (catch skipped ones)
    var pendingRewards = [];
    for (var s = 1; s <= filled; s++) {
      var rw = getSlotRewardInfo(s);
      if (!rw || rw.type === 'special' || !rw.id) continue;
      // slotKeyはカード番号+スロット番号で一意に
      var sk = 'card' + cardNum + '_slot' + s;
      if (given.indexOf(sk) === -1) {
        pendingRewards.push({ rw: rw, key: sk });
      }
    }

    // 順番に報酬を付与（最初の1個だけ宝箱演出、残りはサイレント）
    var firstReward = pendingRewards.length > 0 ? pendingRewards[0] : null;
    for (var i = 0; i < pendingRewards.length; i++) {
      var pr = pendingRewards[i];
      if (window.grantReward) {
        window.grantReward({ type: pr.rw.type, id: pr.rw.id });
      }
      given.push(pr.key);
      if (pr.rw.unlockRoom) {
        localStorage.setItem('pono_room_card_open', '1');
        var rc = document.getElementById('card-room');
        if (rc) { rc.classList.remove('locked'); rc.style.pointerEvents = ''; }
      }
    }
    if (pendingRewards.length > 0) setJSON(LS_STAMP_REWARDS_GIVEN, given);

    // 宝箱演出は最初の未取得報酬だけ表示
    var slotRw = firstReward ? firstReward.rw : null;
    var slotKey = firstReward ? firstReward.key : null;
    if (slotRw) {
      (function(rw) {
        function _showRoomUnlock() {
          if (!rw.unlockRoom) return;
          var unlockOv = document.createElement('div');
          unlockOv.id = '_room-unlock-ov';
          unlockOv.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
          unlockOv.innerHTML = '<div style="background:#fff;border-radius:24px;padding:24px;text-align:center;max-width:300px;box-shadow:0 8px 32px rgba(0,0,0,0.3);">' +
            '<div style="font-size:3rem;margin-bottom:8px;">🏠✨</div>' +
            '<div style="font-size:1.1rem;font-weight:900;color:#5D4E37;margin-bottom:6px;">おへやが つかえるよ！</div>' +
            '<div style="font-size:0.85rem;font-weight:700;color:#A89880;line-height:1.6;margin-bottom:14px;">いっしょに おへやを<br>アレンジしに いこう！</div>' +
            '<button id="_room-unlock-go" style="padding:12px 32px;border:none;border-radius:50px;background:linear-gradient(135deg,#ff9a3c,#ff6347);color:#fff;font-family:inherit;font-size:1rem;font-weight:900;cursor:pointer;">おへやに いく！</button>' +
            '</div>';
          document.body.appendChild(unlockOv);
          // ベッド獲得時はチュートリアルフラグをセット（room側で使用）
          localStorage.setItem('pono_bed_tutorial_pending', '1');
          document.getElementById('_room-unlock-go').addEventListener('click', function() {
            location.href = 'room/index.html';
          });
        }
        setTimeout(function() {
          if (window.showTreasure) {
            window.showTreasure({
              name: rw.name,
              img: rw.img || '',
              label: 'スタンプボーナス',
              onClose: function() {
                window.showAfterMsgOverlay(rw, _showRoomUnlock);
              }
            });
          }
        }, 200);
      })(slotRw);
    }

    // Check card completion reward (slot 15 = card complete)
    if (isCardComplete) {
      var compKey = 'card_' + completedCardNum;
      var compRw = getCompleteReward(completedCardNum);
      if (compRw && given.indexOf(compKey) === -1) {
        if (window.grantReward) {
          window.grantReward({ type: compRw.type, id: compRw.id });
        }
        given.push(compKey);
        setJSON(LS_STAMP_REWARDS_GIVEN, given);

        // Card complete sparkle + treasure
        var section = document.getElementById('stampCardSection');
        if (section) {
          section.classList.add('card-complete');
          setTimeout(function() { section.classList.remove('card-complete'); }, 1200);
        }
        (function(rw) {
          setTimeout(function() {
            if (window.showTreasure) {
              window.showTreasure({
                name: rw.name,
                img: rw.img || '',
                label: 'カードかんせいボーナス',
                onClose: function() {
                  // afterMsg があれば宝箱を閉じた後に表示
                  window.showAfterMsgOverlay(rw);
                }
              });
            }
          }, 1200);
        })(compRw);
      }
    }
  }

  // ── 2. Daily Challenge (pick 2 games per day) [レガシー: play-all.html 専用、play.html では no-op] ──
  function seededRandom(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
  function getDailySeed() {
    var d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate();
  }

  function getDailyRally() {
    var today = getTodayStr();
    var rally = getJSON(LS_DAILY_RALLY, null);
    if (rally && rally.date === today) return rally;

    var seed = getDailySeed();
    var pool = ALL_FREE_GAMES.slice();
    var picked = [];
    for (var i = 0; i < 2; i++) {
      var r = seededRandom(seed + i * 137);
      var idx = Math.floor(r * pool.length);
      picked.push(pool[idx].key);
      pool.splice(idx, 1);
    }

    rally = {
      date: today,
      games: picked,
      completed: [],
      stampEarned: false,
    };
    setJSON(LS_DAILY_RALLY, rally);
    return rally;
  }

  function checkDailyCompletion() {
    // MVP: スタンプラリーの完了判定もスキップ。pono_daily_rally / pono_stamp_log /
    // pono_stamp_pending にも書き込まない。section 自体も CSS で非表示。
    // renderDailyRally() が rally.games を参照するため app tier では null を返せない
    if (rewardsBlocked()) return null;
    // レガシー2ゲーム版デイリーラリーは play.html から撤去済み (#stampRallyGames が無い)。
    // container が無いページでは判定・LS書き込み・ボーナススタンプ付与を一切行わない
    // 完全 no-op にする (play-all.html は container が存在するため従来通り動作する)。
    // ※ renderDailyRally() 側の container チェックだけでは checkDailyCompletion() 単体呼び出し
    //   (pageshow / visibilitychange リスナー) の副作用を防げないため、ここでもガードする。
    if (!document.getElementById('stampRallyGames')) return null;
    var rally = getDailyRally();
    var today = new Date().toDateString();
    var played = [];
    try {
      played = JSON.parse(localStorage.getItem('pono_played_' + today) || '[]');
    } catch(e) { played = []; }

    var changed = false;
    for (var i = 0; i < rally.games.length; i++) {
      var g = rally.games[i];
      if (played.indexOf(g) !== -1 && rally.completed.indexOf(g) === -1) {
        rally.completed.push(g);
        changed = true;
      }
    }

    // All 2 completed -> bonus stamp
    if (rally.completed.length >= 2 && !rally.stampEarned) {
      rally.stampEarned = true;
      var log = getStampLog();
      var bonusKey = getTodayStr() + '_bonus';
      if (log.dates.indexOf(bonusKey) === -1) {
        log.dates.push(bonusKey);
        log.total = log.dates.length;
        saveStampLog(log);
        // 理由テキストを pono_stamp_pending に追加
        try {
          var _pend = JSON.parse(localStorage.getItem('pono_stamp_pending') || '[]');
          _pend.push({ name: 'きょうのスタンプラリー', desc: '2つの ゲームを クリアしたよ！' });
          localStorage.setItem('pono_stamp_pending', JSON.stringify(_pend));
        } catch(e) {}
      }
      changed = true;
    }

    if (changed) setJSON(LS_DAILY_RALLY, rally);
    return rally;
  }

  // ── 3. UI Rendering [レガシー: play-all.html 専用、play.html では no-op] ──
  function getGameInfo(key) {
    for (var i = 0; i < ALL_FREE_GAMES.length; i++) {
      if (ALL_FREE_GAMES[i].key === key) return ALL_FREE_GAMES[i];
    }
    return null;
  }

  function renderDailyRally() {
    var rally = checkDailyCompletion();
    // rewardsBlocked() 時は checkDailyCompletion() が null を返す (free/book tier)。
    // #stampRallyGames が存在しないページでは従来 container null チェックで早期 return
    // していたが、 container が存在するページ (play.html 等) では rally.games で
    // TypeError になっていたため、 container チェックより前に null ガードを追加。
    if (!rally) return;
    var container = document.getElementById('stampRallyGames');
    if (!container) return;
    container.innerHTML = '';

    for (var i = 0; i < rally.games.length; i++) {
      var info = getGameInfo(rally.games[i]);
      if (!info) continue;
      var done = rally.completed.indexOf(rally.games[i]) !== -1;
      var el = document.createElement('a');
      el.href = info.href;
      el.className = 'stamp-rally-game' + (done ? ' completed' : '');
      el.innerHTML = '<span class="stamp-rally-game-icon">' + info.emoji + '</span>' +
                     '<span class="stamp-rally-game-name">' + info.name + '</span>';
      container.appendChild(el);
    }

    var bonusEl = document.getElementById('stampRallyBonus');
    if (bonusEl) {
      var remaining = 2 - rally.completed.length;
      if (remaining <= 0) {
        bonusEl.textContent = '\uD83C\uDF89 ぜんぶクリア！ ボーナススタンプ ゲット！';
        bonusEl.classList.remove('pending');
      } else {
        bonusEl.textContent = 'あと' + remaining + 'つ あそんで ボーナススタンプ！';
        bonusEl.classList.add('pending');
      }
    }
  }

  // ── Stamp Card (15-slot, show current row of 5) Rendering ──
  function renderStampCard(animateSlotInRow) {
    var log = getStampLog();
    var total = log.total;
    var cardNum = getCardNum(total);
    var filled = getFilledInCard(total);
    var showingCompletedCard = (total > 0 && total % SLOTS_PER_CARD === 0);

    // Determine which row to show (0,1,2)
    var currentRow;
    if (showingCompletedCard) {
      currentRow = 2; // last row
    } else {
      currentRow = getCurrentRow(total);
    }
    var rowStart = currentRow * SLOTS_PER_ROW; // 0-based index within card

    // Update card number
    var displayCardNum = showingCompletedCard ? Math.floor((total - 1) / SLOTS_PER_CARD) + 1 : cardNum;
    var numEl = document.getElementById('stampCardNum');
    if (numEl) numEl.textContent = displayCardNum + 'まいめ';

    // Update row label
    var rowLabel = document.getElementById('stampCardRowLabel');
    if (rowLabel) {
      var rowNames = ['1だんめ（1〜5）', '2だんめ（6〜10）', '3だんめ（11〜15）'];
      rowLabel.textContent = rowNames[currentRow];
    }

    var container = document.getElementById('stampCard');
    if (!container) return;
    container.innerHTML = '';

    for (var i = 0; i < SLOTS_PER_ROW; i++) {
      var globalIdx = rowStart + i; // 0-based within card (0..14)
      var slotNum = globalIdx + 1;  // 1-based (1..15)
      var slot = document.createElement('div');
      slot.className = 'stamp-card-slot';
      var isStamped = (globalIdx < filled);
      var isCurrentSlot = (!showingCompletedCard && globalIdx === filled);

      // Get reward hint for this slot
      var slotRw = getSlotRewardInfo(slotNum);

      if (isStamped) {
        slot.classList.add('stamped');
        var img = document.createElement('img');
        img.src = PONO_ICON;
        img.alt = 'stamp';
        if (animateSlotInRow === i) {
          img.classList.add('stamp-bounce');
        }
        slot.appendChild(img);
      } else {
        // Number label
        var numSpan = document.createElement('span');
        numSpan.className = 'slot-num';
        numSpan.textContent = String(slotNum).padStart(2, '0');
        slot.appendChild(numSpan);
        // Reward hint icon
        // MVP: 報酬制度封印中はスロットに 🎁🛏️🧸 等の報酬ヒントを出さない。
        // タップしても「おもちゃばこ」等のプレビューが出ないようにイベントごとスキップ。
        if (slotRw && !rewardsBlocked()) {
          var hint = document.createElement('span');
          hint.className = 'slot-hint';
          hint.textContent = slotRw.icon;
          slot.appendChild(hint);
          slot.classList.add('reward-slot');
          (function(rw, el) {
            el.style.cursor = 'pointer';
            el.addEventListener('click', function(e) {
              e.stopPropagation();
              var existing = document.querySelector('.slot-detail-popup');
              if (existing) existing.remove();
              var popup = document.createElement('div');
              popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;background:#fff;border-radius:16px;padding:16px 20px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.3);min-width:180px;';
              popup.className = 'slot-detail-popup';
              popup.innerHTML = '<div style="font-size:2rem;margin-bottom:6px;">' + rw.icon + '</div><div style="font-size:0.95rem;font-weight:900;color:#5D4E37;">' + rw.name + '</div>';
              document.body.appendChild(popup);
              setTimeout(function() { popup.remove(); }, 2000);
              popup.addEventListener('click', function() { popup.remove(); });
            });
          })(slotRw, slot);
        }
        if (isCurrentSlot) {
          slot.classList.add('current-slot');
        }
      }

      container.appendChild(slot);
    }

    // Add tap handler to open full card modal
    var section = document.getElementById('stampCardSection');
    if (section && !section._modalBound) {
      section._modalBound = true;
      section.addEventListener('click', function() {
        showFullCardModal();
      });
    }
  }

  // ── Full Card Modal (5×3 grid) ──
  window.showFullCardModal = function() { return showFullCardModal.apply(this, arguments); };
  function showFullCardModal() {
    // Remove existing
    var old = document.querySelector('.stamp-full-modal-overlay');
    if (old) old.remove();

    var log = getStampLog();
    var total = log.total;
    var cardNum = getCardNum(total);
    var filled = getFilledInCard(total);
    var showingCompletedCard = (total > 0 && total % SLOTS_PER_CARD === 0);
    var displayCardNum = showingCompletedCard ? Math.floor((total - 1) / SLOTS_PER_CARD) + 1 : cardNum;

    var overlay = document.createElement('div');
    overlay.className = 'stamp-full-modal-overlay';

    var modal = document.createElement('div');
    modal.className = 'stamp-full-modal';

    var title = document.createElement('div');
    title.className = 'stamp-full-modal-title';
    title.textContent = '\uD83D\uDCCB スタンプカード ' + displayCardNum + 'まいめ';
    modal.appendChild(title);

    // 3 rows of 5
    for (var row = 0; row < 3; row++) {
      var rowDiv = document.createElement('div');
      rowDiv.className = 'stamp-full-modal-row';
      for (var col = 0; col < SLOTS_PER_ROW; col++) {
        var globalIdx = row * SLOTS_PER_ROW + col;
        var slotNum = globalIdx + 1;
        var slotDiv = document.createElement('div');
        slotDiv.className = 'stamp-full-modal-slot';
        var isStamped = (globalIdx < filled);
        var slotRw = getSlotRewardInfo(slotNum);

        if (isStamped) {
          slotDiv.classList.add('stamped');
          var img = document.createElement('img');
          img.src = PONO_ICON;
          img.alt = 'stamp';
          slotDiv.appendChild(img);
        } else {
          var numSpan = document.createElement('span');
          numSpan.className = 'slot-num';
          numSpan.textContent = String(slotNum).padStart(2, '0');
          slotDiv.appendChild(numSpan);
          // MVP: 報酬制度封印中は フルカードでも報酬ヒントとタップ詳細を出さない。
          if (slotRw && !rewardsBlocked()) {
            var hint = document.createElement('span');
            hint.className = 'slot-hint';
            hint.textContent = slotRw.icon;
            slotDiv.appendChild(hint);
            slotDiv.classList.add('reward-slot');
            // タップで報酬詳細表示
            (function(rw, el) {
              el.style.cursor = 'pointer';
              el.addEventListener('click', function(e) {
                e.stopPropagation();
                var existing = document.querySelector('.slot-detail-popup');
                if (existing) existing.remove();
                var popup = document.createElement('div');
                popup.className = 'slot-detail-popup';
                popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;background:#fff;border-radius:16px;padding:16px 20px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.3);min-width:180px;';
                popup.innerHTML = '<div style="font-size:2rem;margin-bottom:6px;">' + rw.icon + '</div>' +
                  '<div style="font-size:0.95rem;font-weight:900;color:#5D4E37;">' + rw.name + '</div>' +
                  (rw.type === 'special' ? '<div style="font-size:0.75rem;color:#999;margin-top:4px;">とくべつな ごほうび！</div>' : '');
                document.body.appendChild(popup);
                setTimeout(function() { popup.remove(); }, 2000);
                popup.addEventListener('click', function() { popup.remove(); });
              });
            })(slotRw, slotDiv);
          }
        }
        rowDiv.appendChild(slotDiv);
      }
      modal.appendChild(rowDiv);
    }

    // ボタン行: 📋 履歴 / 🏆 実績 / ✕ 閉じる（アイコンのみ）
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:4px;align-items:center;';

    var iconBtnStyle = 'width:44px;height:44px;border-radius:50%;border:none;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.1);transition:transform 0.1s;padding:0;';

    var histBtn = document.createElement('button');
    histBtn.style.cssText = iconBtnStyle + 'background:#E0F2FE;color:#0EA5E9;';
    histBtn.textContent = '📋';
    histBtn.title = 'りれき';
    histBtn.setAttribute('aria-label', 'りれき');
    histBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      showRewardHistory();
    });
    // MVP: 報酬制度封印中は「もらった ごほうび」履歴ボタンを表示しない
    if (!rewardsBlocked()) btnRow.appendChild(histBtn);

    var achBtn = document.createElement('button');
    achBtn.style.cssText = iconBtnStyle + 'background:#FEF3C7;color:#D97706;';
    achBtn.textContent = '🏆';
    achBtn.title = 'じっせき';
    achBtn.setAttribute('aria-label', 'じっせき');
    achBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      showAchievementList();
    });
    btnRow.appendChild(achBtn);

    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = iconBtnStyle + 'background:#E5E7EB;color:#5D4E37;font-weight:900;';
    closeBtn.textContent = '✕';
    closeBtn.title = 'とじる';
    closeBtn.setAttribute('aria-label', 'とじる');
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      overlay.remove();
    });
    btnRow.appendChild(closeBtn);
    modal.appendChild(btnRow);

    // Prevent clicks on modal from closing
    modal.addEventListener('click', function(e) { e.stopPropagation(); });

    overlay.appendChild(modal);
    overlay.addEventListener('click', function() { overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // ── Reward History Modal ──
  function showRewardHistory() {
    var old = document.querySelector('.reward-history-ov');
    if (old) old.remove();

    var given = getJSON(LS_STAMP_REWARDS_GIVEN, []);
    // 全報酬定義からもらったものを収集
    var items = [];
    for (var slot in CARD_SLOT_REWARDS) {
      var rw = CARD_SLOT_REWARDS[slot];
      if (!rw || rw.type === 'special') continue;
      // givenの中にこのスロットのキーがあるか
      var found = false;
      for (var g = 0; g < given.length; g++) {
        if (given[g].indexOf('_slot' + slot) !== -1) { found = true; break; }
      }
      if (found) items.push(rw);
    }
    // カード完成報酬
    for (var g = 0; g < given.length; g++) {
      if (given[g].indexOf('card_') === 0) {
        var cn = parseInt(given[g].replace('card_', ''));
        var cr = getCompleteReward(cn);
        if (cr) items.push(cr);
      }
    }

    var ov = document.createElement('div');
    ov.className = 'reward-history-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#FFF8E8;border-radius:20px;padding:20px;max-width:320px;width:90%;max-height:70vh;overflow-y:auto;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);';

    var title = document.createElement('div');
    title.style.cssText = 'font-size:1.05rem;font-weight:900;color:#5D4E37;margin-bottom:12px;';
    title.textContent = '📋 もらった ごほうび';
    box.appendChild(title);

    if (items.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'font-size:0.85rem;color:#999;padding:20px 0;';
      empty.textContent = 'まだ ごほうびは ないよ\nスタンプを あつめよう！';
      empty.style.whiteSpace = 'pre-line';
      box.appendChild(empty);
    } else {
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px;border-bottom:1px solid rgba(0,0,0,0.06);';
        var imgHtml = '';
        if (it.img) {
          imgHtml = '<img src="' + it.img + '" style="width:40px;height:40px;object-fit:contain;">';
        } else {
          imgHtml = '<span style="font-size:1.5rem;">' + (it.icon || '🎁') + '</span>';
        }
        row.innerHTML = '<div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + imgHtml + '</div>' +
          '<div style="text-align:left;font-size:0.85rem;font-weight:700;color:#5D4E37;">' + it.name + '</div>';
        box.appendChild(row);
      }
    }

    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'margin:12px auto 0;display:block;width:44px;height:44px;padding:0;border:none;border-radius:50%;background:#E5E7EB;color:#5D4E37;font-family:inherit;font-size:1.2rem;font-weight:900;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.1);';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'とじる');
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      ov.remove();
    });
    box.appendChild(closeBtn);

    ov.appendChild(box);
    ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  }

  // ── Achievement List Modal ──
  function showAchievementList() {
    var old = document.querySelector('.ach-list-ov');
    if (old) old.remove();

    var allAch = window.getAchievements ? window.getAchievements() : [];
    var unlocked = window.getUnlockedAchievements ? window.getUnlockedAchievements() : {};
    var stats = JSON.parse(localStorage.getItem('pono_stats') || '{}');

    var ov = document.createElement('div');
    ov.className = 'ach-list-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#FFF8E8;border-radius:20px;padding:16px;max-width:340px;width:92%;max-height:75vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.3);';

    // タイトル + カウント
    var doneCount = Object.keys(unlocked).length;
    var titleDiv = document.createElement('div');
    titleDiv.style.cssText = 'text-align:center;margin-bottom:12px;';
    titleDiv.innerHTML = '<div style="font-size:1.05rem;font-weight:900;color:#5D4E37;">🏆 じっせき</div>' +
      '<div style="font-size:0.8rem;font-weight:700;color:#D97706;margin-top:2px;">' + doneCount + ' / ' + allAch.length + ' かいほう</div>';
    box.appendChild(titleDiv);

    // tier別ラベル
    var tierLabels = { 1: 'はじめて', 2: 'がんばった', 3: 'マスター' };
    var tierColors = { 1: '#4CAF50', 2: '#2196F3', 3: '#FF9800' };
    var currentTier = 0;

    for (var i = 0; i < allAch.length; i++) {
      var ach = allAch[i];
      var done = !!unlocked[ach.id];
      var statVal = stats[ach.stat] || 0;

      // tierヘッダー
      if (ach.tier !== currentTier) {
        currentTier = ach.tier;
        var header = document.createElement('div');
        header.style.cssText = 'font-size:0.75rem;font-weight:900;color:' + tierColors[currentTier] + ';padding:8px 4px 4px;border-bottom:2px solid ' + tierColors[currentTier] + ';margin-bottom:4px;';
        header.textContent = tierLabels[currentTier] || '';
        box.appendChild(header);
      }

      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:7px 4px;border-bottom:1px solid rgba(0,0,0,0.05);' + (done ? '' : 'opacity:0.5;');

      // アイコン
      var iconDiv = document.createElement('div');
      iconDiv.style.cssText = 'width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;' +
        (done ? 'background:#E8F5E9;' : 'background:rgba(0,0,0,0.08);');
      iconDiv.textContent = done ? '✅' : '🔒';
      row.appendChild(iconDiv);

      // テキスト
      var textDiv = document.createElement('div');
      textDiv.style.cssText = 'flex:1;min-width:0;';
      textDiv.innerHTML = '<div style="font-size:0.8rem;font-weight:900;color:#5D4E37;">' + ach.name + '</div>' +
        '<div style="font-size:0.65rem;color:#A89880;font-weight:700;">' + ach.desc + '</div>';
      row.appendChild(textDiv);

      // 進捗
      var progDiv = document.createElement('div');
      progDiv.style.cssText = 'flex-shrink:0;text-align:right;';
      if (done) {
        progDiv.innerHTML = '<span style="font-size:0.7rem;font-weight:900;color:#4CAF50;">かんせい！</span>';
      } else {
        var pct = Math.min(100, Math.floor((statVal / ach.target) * 100));
        progDiv.innerHTML = '<div style="font-size:0.65rem;font-weight:700;color:#A89880;">' + statVal + '/' + ach.target + '</div>' +
          '<div style="width:40px;height:5px;background:rgba(0,0,0,0.1);border-radius:3px;margin-top:2px;"><div style="width:' + pct + '%;height:100%;background:' + tierColors[currentTier] + ';border-radius:3px;"></div></div>';
      }
      row.appendChild(progDiv);
      box.appendChild(row);
    }

    // 閉じるボタン（×アイコン）
    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'display:block;margin:12px auto 0;width:44px;height:44px;padding:0;border:none;border-radius:50%;background:#E5E7EB;color:#5D4E37;font-family:inherit;font-size:1.2rem;font-weight:900;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.1);';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'とじる');
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      ov.remove();
    });
    box.appendChild(closeBtn);

    ov.appendChild(box);
    ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  }

  // ── Stamp animation ──
  function animateStamp(total) {
    var filled = getFilledInCard(total);
    // Which row is the newly stamped slot in?
    var posInCard = filled - 1; // 0-based
    var posInRow = posInCard % SLOTS_PER_ROW;
    // 音は showStampModal 内で鳴らすのでここでは鳴らさない
    renderStampCard(posInRow);
  }

  // ── Stamp reason text ──
  function getStampReasonText() {
    // ログイン日数は dates 配列内の日付エントリ（YYYY-MM-DD）のみカウント
    var log = getStampLog();
    var loginDays = log.dates.filter(function(d) { return /^\d{4}-\d{2}-\d{2}$/.test(d); }).length;
    return 'ログイン ' + loginDays + 'にちめ！';
  }

  // 実績スタンプの理由をlocalStorageから取り出してテキストに変換
  // 取り出したら消去（1回限り）
  function consumeAchReasonText() {
    try {
      var pending = JSON.parse(localStorage.getItem('pono_stamp_pending') || '[]');
      localStorage.removeItem('pono_stamp_pending');
      if (pending.length === 0) return 'じっせき かいほう！🏆';
      if (pending.length === 1) {
        return '🏆「' + pending[0].name + '」\n' + pending[0].desc;
      }
      // 複数まとめて解除
      return '🏆 じっせき ' + pending.length + 'こ かいほう！\n' +
        pending.map(function(p) { return '・' + p.name; }).join('\n');
    } catch(e) {
      return 'じっせき かいほう！🏆';
    }
  }

  // スタンプ押し演出モーダル（3フェーズ構成）
  // フェーズ1: うけとるボタン / フェーズ2: 大きなスタンプ1枚ずつ / フェーズ3: 15マスカード
  // stampInfos: [{ total, text }, ...] — 1個でも配列で渡す
  function showStampBatch(stampInfos, onAllDone) {
    var count = stampInfos.length;
    if (count === 0) { if (onAllDone) onAllDone(); return; }
    // ★ first-clear celebration と被らないよう busy フラグを立てる
    window._stampBatchBusy = true;
    var _origOnAllDone = onAllDone;
    onAllDone = function() {
      window._stampBatchBusy = false;
      if (_origOnAllDone) _origOnAllDone();
      // スタンプが終わったら溜まっていた first-clear 祝賀を実行
      // (first-clear celebration は別システムのため呼び出し側ページに委譲)
      if (typeof window._scheduleFirstClearAfterStamps === 'function') {
        setTimeout(window._scheduleFirstClearAfterStamps, 400);
      }
    };

    var firstInfo = stampInfos[0];
    var lastInfo = stampInfos[count - 1];
    var cardNum = getCardNum(lastInfo.total);

    // 各スタンプのカード内位置
    var stampPositions = stampInfos.map(function(info) {
      return getFilledInCard(info.total) - 1; // 0-based
    });
    // バッチ開始前に埋まっていた数
    var preFilled = firstInfo.total - 1;
    var preFilledInCard = preFilled <= 0 ? 0 :
      (preFilled % SLOTS_PER_CARD === 0 && Math.floor(preFilled / SLOTS_PER_CARD) === cardNum - 1
        ? SLOTS_PER_CARD : preFilled % SLOTS_PER_CARD);

    // 理由テキストのHTML生成
    function formatReason(text) {
      return text.split('\n').map(function(line, i) {
        return '<span style="display:block;' + (i > 0 ? 'font-size:0.78rem;font-weight:700;color:#9C8070;margin-top:2px;' : '') + '">' + line + '</span>';
      }).join('');
    }

    // オーバーレイ作成
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;transition:background 0.3s;';

    // カード（固定サイズで3フェーズ共通）
    var cardEl = document.createElement('div');
    cardEl.id = 'stamp-b-card';
    cardEl.style.cssText = 'background:#FFF8E8;border-radius:16px;padding:20px;max-width:360px;width:90%;min-height:400px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);display:flex;flex-direction:column;align-items:center;justify-content:center;transform:scale(0);transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1);';

    // 内部コンテンツエリア（フェーズごとに差し替え）
    var contentEl = document.createElement('div');
    contentEl.id = 'stamp-b-content';
    contentEl.style.cssText = 'width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;';
    cardEl.appendChild(contentEl);

    ov.appendChild(cardEl);
    document.body.appendChild(ov);

    // スケールイン
    requestAnimationFrame(function() {
      ov.style.background = 'rgba(0,0,0,0.6)';
      cardEl.style.transform = 'scale(1)';
    });

    // 15マスグリッドHTML生成（stamp-full-modal-slot スタイルを流用）
    // mode: 'before' = 新規スタンプは空表示, 'after' = 新規スタンプは押された状態
    function buildFullGridHtml(mode) {
      var log = getStampLog();
      var currentTotal = log.total;
      var thisCardStart = (cardNum - 1) * SLOTS_PER_CARD;
      var html = '';
      for (var row = 0; row < 3; row++) {
        html += '<div class="stamp-full-modal-row">';
        for (var col = 0; col < SLOTS_PER_ROW; col++) {
          var globalIdx = row * SLOTS_PER_ROW + col;
          var slotNum = globalIdx + 1;
          var slotTotal = thisCardStart + slotNum;
          var isNew = stampPositions.indexOf(globalIdx) >= 0;
          var isPreFilled = slotTotal <= currentTotal && !isNew;
          var slotRw = (typeof getSlotRewardInfo === 'function') ? getSlotRewardInfo(slotNum) : null;

          var classes = 'stamp-full-modal-slot';
          var inner = '';

          if (isPreFilled) {
            classes += ' stamped';
            inner = '<img src="' + PONO_ICON + '" alt="">';
          } else if (isNew && mode === 'after') {
            classes += ' stamped';
            inner = '<img src="' + PONO_ICON + '" alt="">';
          } else {
            inner = '<span class="slot-num">' + String(slotNum).padStart(2, '0') + '</span>';
            if (slotRw) {
              inner += '<span class="slot-hint">' + slotRw.icon + '</span>';
              classes += ' reward-slot';
            }
          }
          html += '<div class="' + classes + '">' + inner + '</div>';
        }
        html += '</div>';
      }
      return html;
    }

    // ── フェーズ1: スタンプカード（押される前）+ うけとるボタン ──
    function phase1Receive() {
      contentEl.innerHTML =
        '<div style="font-size:1.1rem;font-weight:900;color:#F2915A;margin-bottom:4px;">\uD83C\uDF89 スタンプ ' + count + 'こ ゲット！</div>' +
        '<div class="stamp-full-modal-title" style="margin-bottom:12px;">\uD83D\uDCCB スタンプカード ' + cardNum + 'まいめ</div>' +
        '<div id="stamp-b-grid">' + buildFullGridHtml('before') + '</div>' +
        '<button id="stamp-b-btn" style="margin-top:16px;padding:14px 40px;border:none;border-radius:50px;background:linear-gradient(135deg,#FFD84D,#F5A800);color:#5C3A00;font-family:inherit;font-size:1.1rem;font-weight:900;cursor:pointer;box-shadow:0 4px 16px rgba(245,168,0,0.5);animation:stampBtnPulse 1.2s ease-in-out infinite;">うけとる！</button>';

      document.getElementById('stamp-b-btn').addEventListener('click', function() {
        _resumeAC();
        phase2BigStamps();
      });
    }

    // ── フェーズ2: 大きなスタンプを1枚ずつ表示（タップでゲット） ──
    function phase2BigStamps() {
      contentEl.innerHTML =
        '<div id="stamp-b-reason" style="font-size:1rem;font-weight:900;color:#5D4E37;min-height:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:4px;white-space:normal;"></div>' +
        '<div class="big-stamp-wrap" id="stamp-b-wrap" style="cursor:pointer;">' +
          '<div class="big-stamp-icon" id="stamp-b-big">' +
            '<img src="' + PONO_ICON + '" id="stamp-b-bigimg" alt="">' +
          '</div>' +
        '</div>' +
        '<div id="stamp-b-msg" style="font-size:1.2rem;font-weight:900;color:#F2915A;opacity:0;transition:opacity 0.3s;height:1.5em;">ゲット！\u2728</div>' +
        '<div id="stamp-b-hint" style="font-size:0.95rem;font-weight:900;color:#F2915A;margin-top:4px;animation:stampBtnPulse 1.2s ease-in-out infinite;">\uD83D\uDC46 タッチして ゲット！</div>' +
        '<div class="big-stamp-counter" id="stamp-b-counter"></div>';

      showBigStamp(0);
    }

    function spawnSparkles() {
      var wrap = document.getElementById('stamp-b-wrap');
      if (!wrap) return;
      var emojis = ['\u2728', '\u2b50', '\ud83d\udcab', '\u2728'];
      for (var i = 0; i < 8; i++) {
        var s = document.createElement('div');
        s.className = 'sparkle';
        s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        var angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
        var distance = 80 + Math.random() * 40;
        var dx = Math.cos(angle) * distance;
        var dy = Math.sin(angle) * distance;
        s.style.left = '50%';
        s.style.top = '50%';
        s.style.setProperty('--dx', dx + 'px');
        s.style.setProperty('--dy', dy + 'px');
        s.style.animationDelay = (i * 0.04) + 's';
        wrap.appendChild(s);
        (function(el) {
          setTimeout(function() { if (el.parentNode) el.remove(); }, 1500);
        })(s);
      }
    }

    function showBigStamp(idx) {
      if (idx >= count) {
        phase3FullCard();
        return;
      }

      var info = stampInfos[idx];
      document.getElementById('stamp-b-reason').innerHTML = formatReason(info.text);
      document.getElementById('stamp-b-counter').textContent = (count > 1) ? (idx + 1) + ' / ' + count : '';

      var bigEl = document.getElementById('stamp-b-big');
      var imgEl = document.getElementById('stamp-b-bigimg');
      var msg = document.getElementById('stamp-b-msg');
      var hint = document.getElementById('stamp-b-hint');
      var wrap = document.getElementById('stamp-b-wrap');

      // リセット
      imgEl.removeAttribute('style');
      bigEl.classList.remove('show');
      imgEl.classList.remove('show');
      msg.style.opacity = '0';

      // スタンプを実際に押すアニメーション
      function pressStamp() {
        if (hint) hint.style.opacity = '0';
        bigEl.classList.add('show');
        imgEl.classList.add('show');
        spawnSparkles();
        msg.style.opacity = '1';
        _playStampPop();

        // 少し見せてから次へ
        setTimeout(function() {
          if (idx < count - 1) {
            imgEl.style.cssText = 'transition:opacity 0.3s, transform 0.3s; opacity:0; transform:scale(0.8) rotate(10deg);';
            msg.style.opacity = '0';
            setTimeout(function() { showBigStamp(idx + 1); }, 350);
          } else {
            setTimeout(function() { phase3FullCard(); }, 800);
          }
        }, 1500);
      }

      if (idx === 0) {
        // 1枚目: 自動（「うけとる！」ボタンのタップ延長）
        if (hint) hint.style.opacity = '0';
        requestAnimationFrame(function() {
          requestAnimationFrame(function() { pressStamp(); });
        });
      } else {
        // 2枚目以降: 空の丸を表示してタップ待ち
        if (hint) hint.style.opacity = '1';
        var tapped = false;
        function onTap() {
          if (tapped) return;
          tapped = true;
          wrap.removeEventListener('click', onTap);
          pressStamp();
        }
        wrap.addEventListener('click', onTap);
      }
    }

    // ── フェーズ3: 15マスカード表示（スタンプ押された後） ──
    function phase3FullCard() {
      contentEl.innerHTML =
        '<div class="stamp-full-modal-title" style="margin-bottom:12px;">\uD83D\uDCCB スタンプカード ' + cardNum + 'まいめ</div>' +
        '<div>' + buildFullGridHtml('after') + '</div>' +
        '<div style="font-size:1.3rem;font-weight:900;color:#F2915A;margin:10px 0 8px;">やったー！ \uD83C\uDF89</div>' +
        '<button id="stamp-b-close" style="padding:12px 36px;border:none;border-radius:50px;background:linear-gradient(135deg,#60A5FA,#3B82F6);color:#fff;font-family:inherit;font-size:1rem;font-weight:900;cursor:pointer;box-shadow:0 4px 14px rgba(59,130,246,0.4);">やったー！</button>';

      document.getElementById('stamp-b-close').addEventListener('click', closeModal);
    }

    // モーダル閉じる
    function closeModal() {
      cardEl.style.transition = 'transform 0.3s cubic-bezier(0.6,-0.28,0.74,0.05)';
      cardEl.style.transform = 'scale(0)';
      ov.style.background = 'rgba(0,0,0,0)';
      setTimeout(function() {
        ov.remove();
        if (onAllDone) onAllDone();
      }, 350);
    }

    // フェーズ1スタート
    phase1Receive();
  }

  // ── 4. Init & Event Wiring ──

  window._initStampRally = function() {
    // MVP: スタンプ系処理を全部スキップ。addStampToday / renderDailyRally /
    // renderStampCard / 演出も呼ばない。ここが止まると checkSlotReward が一切呼ばれない
    if (rewardsBlocked()) return;
    // pono_stamp_before: 前回セッション終了時のtotal（未設定なら0＝初回）
    var _beforeGame = parseInt(localStorage.getItem('pono_stamp_before') || '0');

    var result = addStampToday();
    renderDailyRally();
    renderStampCard(-1);

    var finalTotal = getStampLog().total;
    // _beforeGame が基準。初回（0）なら全スタンプがアニメーション対象
    var startFrom = _beforeGame;
    var stampsToShow = finalTotal - startFrom;

    // 実績スタンプの理由テキストを取得
    var achReasons = [];
    try {
      var pending = JSON.parse(localStorage.getItem('pono_stamp_pending') || '[]');
      localStorage.removeItem('pono_stamp_pending');
      achReasons = pending;
    } catch(e) {}

    // 各スタンプの理由テキストを準備（ログイン→実績の順）
    // ログインスタンプは dates 配列の末尾（最新のtotal）になるので、
    // まず result.added なら最後のスタンプをログインとして扱い、
    // それ以外は実績 or 汎用テキスト
    var stampReasons = [];
    var achIdx = 0;
    var loginSlot = result.added ? (stampsToShow - 1) : -1; // ログインスタンプの位置
    for (var si = 0; si < stampsToShow; si++) {
      var stampTotal = startFrom + si + 1;
      if (si === loginSlot) {
        stampReasons.push({ total: stampTotal, text: getStampReasonText() });
      } else if (achIdx < achReasons.length) {
        var ach = achReasons[achIdx];
        stampReasons.push({ total: stampTotal, text: '🏆「' + ach.name + '」\n' + ach.desc });
        achIdx++;
      } else {
        // 理由テキスト不明なスタンプ（achReasons切れ、ログインでもない）
        stampReasons.push({ total: stampTotal, text: '🎉 スタンプ ゲット！' });
      }
    }

    _stampTotalAfterInit = finalTotal;
    localStorage.setItem('pono_stamp_before', String(finalTotal));

    if (stampReasons.length > 0) {
      setTimeout(function() {
        showStampBatch(stampReasons, function() {
          stampReasons.forEach(function(info) { animateStamp(info.total); });
          setTimeout(function() { checkSlotReward(finalTotal); }, 150);
        });
      }, 500);
    } else {
      setTimeout(function() { checkSlotReward(finalTotal); }, 150);
    }
  };

  // スタンプラリー初期化。rewards.json の取得を待たずに即起動する。
  // （スタンプ演出自体は rewards.json に依存しないため。ご褒美表示のみ
  //   checkSlotReward 内で _rewardsReady を待つ）
  _loadRewardsJSON(function() {}); // 裏でロード開始
  if (window.ponoProfile) {
    window._initStampRally();
  }

  // ── ゲームから戻った時にスタンプ増加を検出して演出 ──
  // _initStampRally完了後のtotalを記録。visibilitychangeで差分検出
  var _stampTotalAfterInit = -1;

  // ゲームカードをクリックした時に現在値を保存
  document.querySelectorAll('.card').forEach(function(card) {
    card.addEventListener('click', function(ev) {
      // 無料ユーザーがロックカードを踏んだらスクショプロモに差し替え
      if (window.PonoPromo && window.PonoPromo.shouldBlockFree && window.PonoPromo.shouldBlockFree(this.id)) {
        if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
        if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
        try { window.PonoPromo.showLockedPreview(this.id); } catch (e) {}
        return;
      }
      var t = getStampLog().total;
      _stampTotalAfterInit = t;
      localStorage.setItem('pono_stamp_before', String(t));
    });
  });

  // visibilitychange（ゲームから戻った時）
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      var now = getStampLog().total;
      var prev = _stampTotalAfterInit;
      if (prev >= 0 && now > prev) {
        _stampTotalAfterInit = now;
        // 増えた分を1つずつ表示
        var achReasons = [];
        try {
          var pend = JSON.parse(localStorage.getItem('pono_stamp_pending') || '[]');
          localStorage.removeItem('pono_stamp_pending');
          achReasons = pend;
        } catch(e) {}

        var stamps = [];
        var ai = 0;
        for (var vi = prev + 1; vi <= now; vi++) {
          if (ai < achReasons.length) {
            stamps.push({ total: vi, text: '🏆「' + achReasons[ai].name + '」\n' + achReasons[ai].desc });
            ai++;
          } else {
            stamps.push({ total: vi, text: getStampReasonText(vi) });
          }
        }

        setTimeout(function() {
          showStampBatch(stamps, function() {
            stamps.forEach(function(info) { animateStamp(info.total); });
            setTimeout(function() { checkSlotReward(now); }, 150);
          });
        }, 500);
      } else {
        _stampTotalAfterInit = now;
      }
      checkDailyCompletion();
      renderDailyRally();
      renderStampCard(-1);
      // first-clear celebration (別システム、play-all.html 側に残置) を defensive に呼ぶ
      if (typeof window._scheduleFirstClearAfterStamps === 'function') window._scheduleFirstClearAfterStamps();
    }
  });

  // pageshow
  window.addEventListener('pageshow', function() {
    checkDailyCompletion();
    renderDailyRally();
    renderStampCard(-1);
    // ★ first-clear は stamp modal を z-index で被覆してしまうので
    //   スタンプ演出が走っていない（または終わっている）時だけ実行。
    //   スタンプ中は showStampBatch 完了時に連鎖して呼ばれる。
    if (typeof window._scheduleFirstClearAfterStamps === 'function') window._scheduleFirstClearAfterStamps();
  });

  // ── 5. Daily Quest Bonus Stamp (js/daily-quest.js の PonoDailyQuestCleared と1対1連携) ──
  function grantDailyQuestBonusStamp(detail) {
    if (rewardsBlocked()) return null;
    var bonusKey = getTodayStr() + '_dailyquest_bonus';
    var log = getStampLog();
    if (log.dates.indexOf(bonusKey) !== -1) return null;
    log.dates.push(bonusKey);
    log.total = log.dates.length;
    saveStampLog(log);

    var questLabel = (detail && detail.questLabel) || 'きょうの チャレンジ';
    var finalTotal = log.total;
    // visibilitychange の汎用差分検出より先に確定させ、演出の取りこぼしを防ぐ
    setTimeout(function() {
      showStampBatch([{ total: finalTotal, text: '🎉「' + questLabel + '」\nクリアしたよ！' }], function() {
        animateStamp(finalTotal);
        setTimeout(function() { checkSlotReward(finalTotal); }, 150);
      });
    }, 500);
    _stampTotalAfterInit = finalTotal;
    localStorage.setItem('pono_stamp_before', String(finalTotal));
    return { added: true, log: log };
  }

  // ── Public API (window.PonoStampRally) ──
  window.PonoStampRally = {
    addStampToday: addStampToday,
    getStampLog: getStampLog,
    saveStampLog: saveStampLog,
    checkDailyCompletion: checkDailyCompletion,
    getDailyRally: getDailyRally,
    renderDailyRally: renderDailyRally,
    renderStampCard: renderStampCard,
    checkSlotReward: checkSlotReward,
    showStampBatch: showStampBatch,
    showFullCardModal: showFullCardModal,
    showRewardHistory: showRewardHistory,
    showAchievementList: showAchievementList,
    animateStamp: animateStamp,
    getStampReasonText: getStampReasonText,
    consumeAchReasonText: consumeAchReasonText,
    getSlotRewardInfo: getSlotRewardInfo,
    getCompleteReward: getCompleteReward,
    getCardNum: getCardNum,
    getCardPos: getCardPos,
    getFilledInCard: getFilledInCard,
    getCurrentRow: getCurrentRow,
    rewardsBlocked: rewardsBlocked,
    initStampRally: window._initStampRally,
    grantDailyQuestBonusStamp: grantDailyQuestBonusStamp
  };
  Object.defineProperty(window.PonoStampRally, 'CARD_SLOT_REWARDS', { get: function() { return CARD_SLOT_REWARDS; }, enumerable: true });
  Object.defineProperty(window.PonoStampRally, 'CARD_COMPLETE_REWARDS', { get: function() { return CARD_COMPLETE_REWARDS; }, enumerable: true });
  Object.defineProperty(window.PonoStampRally, 'ALL_FREE_GAMES', { get: function() { return ALL_FREE_GAMES; }, enumerable: true });

})();
