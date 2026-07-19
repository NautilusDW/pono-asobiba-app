// ═══════════════════════════════════════════════════════════════════
// 共通ヘルパー: ゲーム初回クリア報酬
// ═══════════════════════════════════════════════════════════════════
// 各ゲームは最終ステージをクリアした直後に
//   window.triggerFirstClearReward('maze')
// を呼ぶ。このヘルパーが以下を実行する:
//   1. rewards.json の firstClearRewards[gameId] を取得
//   2. すでに付与済みならスキップ（二重付与防止）
//   3. gendered かつ boy/girl 両バリアントが揃っていれば、window.showTreasure の
//      2択UIで子ども自身にタップで見た目を選ばせる (2026-07-19、batch:1370)。
//      片方欠損時や opts.skipImmediate 時は選ばせようが無いので boy優先の安全側
//      フォールバックへ倒す (旧 pono_profile.gender 自動判定は撤去済み。
//      現在のユーザー導線からは誰も書き込まない壊れたキーだったため)。
//   4. window.grantReward で部屋コレクションに追加（選択確定後）
//   5. ホーム画面で再生するスタンプ演出の情報を localStorage に記録
//   6. window.showTreasure で宝箱演出を即座に表示
//
// 前提: 呼び出し元ページは common/achievements.js と common/treasure.js を
// 既に読み込んでいること（grantReward / showTreasure が window に存在）。
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var LS_GRANTED = 'pono_first_clear_granted';   // 付与済みゲームID配列
  var LS_PENDING = 'pono_pending_first_clear';    // ホーム帰還時に演出すべき項目

  // past incident: オーバーレイが正常に閉じずページ全体のクリックを吸収した事故の再発防止 (batch:1320)
  // common/treasure.js の #treasure-overlay と揃えたタイムアウト秒数
  var AFTER_MSG_AUTO_CLOSE_MS = 10000;
  var AFTER_MSG_BG_TAP_GRACE_MS = 500;

  function _getJSON(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function _setJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  // common/achievements.js の _rewardsBlocked() と同じ3段フォールバックパターン
  // (PonoMvpFlags有無 → PONO_MVP_NO_REWARDS有無 → PonoTier.isApp()単独判定)
  function _rewardsBlocked() {
    if (window.PonoMvpFlags && typeof window.PonoMvpFlags.rewardsBlocked === 'function') {
      return window.PonoMvpFlags.rewardsBlocked();
    }
    if (window.PONO_MVP_NO_REWARDS) return true;
    return !(window.PonoTier && typeof window.PonoTier.isApp === 'function' && window.PonoTier.isApp());
  }

  // rewards.json のパス（ゲームページは ../assets/data/rewards.json）
  function _rewardsPath() {
    // このスクリプトが ../common/first-clear.js として読まれていればゲームページ
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('../common/first-clear.js') !== -1) {
        return '../assets/data/rewards.json';
      }
    }
    return 'assets/data/rewards.json';
  }

  // 画像パスをゲームページ用に補正（assets/ で始まるなら ../ を前置）
  function _resolveImgPath(p) {
    if (!p) return '';
    // 既に絶対・相対・URL・data URI ならそのまま使う
    if (/^\.\.?\//.test(p) || /^https?:/.test(p) || /^\//.test(p) || /^data:/.test(p)) return p;
    // ゲームページ用かホーム用か: _rewardsPath() と同じ判定
    if (_rewardsPath().indexOf('../') === 0) return '../' + p;
    return p;
  }

  // gendered エントリの1バリアントを正規化 (name/type/id/img/afterMsg の共通シェイプへ)
  function _normalizeVariant(rw, variantKey) {
    var v = (rw && rw[variantKey]) || {};
    return {
      icon: rw.icon,
      name: v.name || rw.name,
      type: v.type,
      id:   v.id,
      img:  v.img,
      afterMsg: v.afterMsg || rw.afterMsg || ''
    };
  }

  // gendered かつ boy/girl 両方のデータが揃っているか (2択UIを出せるか)
  function _hasBothVariants(rw) {
    return !!(rw && rw.gendered &&
      rw.boy  && rw.boy.id  && rw.boy.img &&
      rw.girl && rw.girl.id && rw.girl.img);
  }

  // 性別非対応 / データ不備時のフォールバック解決 (2択UIを出せない場面専用)。
  // 2026-07-19: pono_profile による自動判定は「現在のユーザー導線からは誰も書き込まない
  // 壊れたキー」だったため撤去 (常に'boy'優先の安全側フォールバックに統一)。
  // gendered なのに片方のバリアントしか無いデータ不備時もここに来る想定。
  function _resolveDefault(rw) {
    if (!rw) return null;
    if (rw.gendered) {
      var variantKey = rw.boy ? 'boy' : 'girl';
      return _normalizeVariant(rw, variantKey);
    }
    return {
      icon: rw.icon,
      name: rw.name,
      type: rw.type,
      id:   rw.id,
      img:  rw.img,
      afterMsg: rw.afterMsg || ''
    };
  }

  // ゲームページで showAfterMsgOverlay が無い場合のフォールバック
  function _simpleAfterMsg(name, img, msg, onDone) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:20px;padding:20px;text-align:center;max-width:280px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3);';
    if (img) {
      var i = document.createElement('img');
      i.src = img;
      i.style.cssText = 'width:80px;height:80px;object-fit:contain;margin-bottom:8px;';
      i.onerror = function () { this.style.display = 'none'; };
      box.appendChild(i);
    }
    if (name) {
      var n = document.createElement('div');
      n.style.cssText = 'font-size:0.85rem;font-weight:900;color:#F2915A;margin-bottom:8px;';
      n.textContent = name;
      box.appendChild(n);
    }
    var m = document.createElement('div');
    m.style.cssText = 'font-size:0.9rem;font-weight:900;color:#5D4E37;line-height:1.7;white-space:pre-line;';
    m.textContent = msg;
    box.appendChild(m);

    var closed = false;
    var autoCloseTimer = null;
    function _close() {
      if (closed) return;
      closed = true;
      if (autoCloseTimer) { clearTimeout(autoCloseTimer); autoCloseTimer = null; }
      ov.remove();
      if (onDone) onDone();
    }

    var btn = document.createElement('button');
    btn.textContent = 'わかった！';
    btn.style.cssText = 'margin-top:12px;padding:10px 28px;border:none;border-radius:50px;background:linear-gradient(135deg,#60A5FA,#3B82F6);color:#fff;font-family:inherit;font-size:0.9rem;font-weight:900;cursor:pointer;';
    btn.addEventListener('click', _close);
    box.appendChild(btn);
    ov.appendChild(box);

    // 背景タップで閉じる。表示直後の誤タップでの早期クローズを避けるため短い猶予を置く。
    var bgTapReady = false;
    setTimeout(function () { bgTapReady = true; }, AFTER_MSG_BG_TAP_GRACE_MS);
    ov.addEventListener('click', function (e) {
      if (e.target !== ov || !bgTapReady) return;
      _close();
    });

    document.body.appendChild(ov);
    autoCloseTimer = setTimeout(_close, AFTER_MSG_AUTO_CLOSE_MS);
  }

  // 付与済み判定
  function _isAlreadyGranted(gameId) {
    var list = _getJSON(LS_GRANTED, []);
    return Array.isArray(list) && list.indexOf(gameId) !== -1;
  }

  function _markGranted(gameId) {
    var list = _getJSON(LS_GRANTED, []);
    if (!Array.isArray(list)) list = [];
    if (list.indexOf(gameId) === -1) {
      list.push(gameId);
      _setJSON(LS_GRANTED, list);
    }
  }

  // ホーム帰還時に演出する情報をキュー
  function _queuePending(gameId, rw) {
    var pending = _getJSON(LS_PENDING, []);
    if (!Array.isArray(pending)) pending = [];
    pending.push({
      gameId:   gameId,
      name:     rw.name || '',
      icon:     rw.icon || '🎁',
      type:     rw.type || '',
      id:       rw.id || '',
      img:      rw.img || '',
      afterMsg: rw.afterMsg || '',
      ts:       Date.now()
    });
    _setJSON(LS_PENDING, pending);
  }

  // ごかんそう (rating) chain: triggerFirstClearReward の Promise 解決後 800ms 遅延で
  // PonoRating.maybeShowAfterClear(gameId) を発火。 ratings module 未ロード時は no-op。
  // 4 ゲート (既評価 / 7 日クールダウン / 累積 3 回 / 50% 確率) は PonoRating 側で判定。
  function _scheduleRatingPrompt(gameId) {
    setTimeout(function () {
      try {
        if (window.PonoRating && typeof window.PonoRating.maybeShowAfterClear === 'function') {
          window.PonoRating.maybeShowAfterClear(gameId);
        }
      } catch (e) { /* silent: rating モーダル失敗で本編動線を止めない */ }
    }, 800);
  }

  // 外部 API: ゲームから呼ばれる
  // 引数: gameId (string), opts (object, 省略可)
  //   opts.onClose: 宝箱を閉じた時に呼ばれるコールバック（次の画面遷移に使う）
  // 戻り値: Promise<boolean>  true=演出発火、false=スキップ（既に付与済み／定義なし）
  window.triggerFirstClearReward = function (gameId, opts) {
    opts = opts || {};
    if (!gameId) return Promise.resolve(false);
    // MVP: 報酬制度封印中は宝箱・afterMsg 連鎖を全部止める。
    // grantReward / _markGranted / _queuePending も呼ばないので、再公開時に
    // ゲームをもう一度クリアした時点でリワードが正規に発火する。
    if (_rewardsBlocked()) {
      try { if (typeof opts.onClose === 'function') opts.onClose(); } catch (e) {}
      _scheduleRatingPrompt(gameId);
      return Promise.resolve(false);
    }
    if (_isAlreadyGranted(gameId)) { _scheduleRatingPrompt(gameId); return Promise.resolve(false); }

    return fetch(_rewardsPath() + '?_=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.firstClearRewards) return false;
        var raw = data.firstClearRewards[gameId];
        if (!raw) return false;

        // 2択UIを出せるのは「その場でタップして選ばせる瞬間がある」時だけ。
        // skipImmediate (例: oto) はゲーム内で一切UIを見せないので、選ばせようがなく
        // 常に安全側フォールバック(_resolveDefault、boy優先)に倒す。
        // gendered なのに片方のバリアントが欠けているデータ不備時も同様にフォールバック。
        var useChoice = !opts.skipImmediate && _hasBothVariants(raw);
        var boyVariant = null, girlVariant = null, rw = null;
        if (useChoice) {
          boyVariant  = _normalizeVariant(raw, 'boy');
          girlVariant = _normalizeVariant(raw, 'girl');
        } else {
          rw = _resolveDefault(raw);
          if (!rw || !rw.id) return false;
        }

        // おうちアンロック状態に応じて afterMsg に案内文を追記
        //   ・未アンロック: 「スタンプを あつめて ベッドを もらったら、おへやに かざれるように なるよ！」
        //   ・アンロック済: 「おへやに かざってみてね！」
        // こうすることで「もらったけど今は使えない」状態でも子どもが混乱しない。
        // 2択モードでは boy/girl どちらが選ばれても案内文が付くよう両方に付記する。
        function _appendRoomHint(target) {
          try {
            var roomUnlocked = localStorage.getItem('pono_room_card_open') === '1';
            var hint = roomUnlocked
              ? 'おへやに かざってみてね！'
              : 'スタンプを あつめて ベッドを もらったら、おへやに かざれるように なるよ！';
            var base = (target.afterMsg || '').replace(/\s+$/, '');
            target.afterMsg = base ? (base + '\n\n' + hint) : hint;
          } catch (e) { /* localStorage 不能環境でも致命的ではないのでそのまま */ }
        }
        if (useChoice) { _appendRoomHint(boyVariant); _appendRoomHint(girlVariant); }
        else { _appendRoomHint(rw); }

        // 部屋コレクションへの確定処理 (grantReward は idempotent なので二重付与の心配なし)。
        // 2択モードでは「子どもがタップで選んだ後」(showTreasure の onChoose 経由) に呼ばれる。
        // 非choiceモードは今まで通り表示前に確定させる。
        var chosenRw = null;
        function _finalizeGrant(selected) {
          chosenRw = selected;
          var grantOk = false;
          try {
            if (window.grantReward) {
              window.grantReward({ type: selected.type, id: selected.id });
              grantOk = true;
            }
          } catch (e) {
            console.warn('[first-clear] grantReward failed:', e);
            // grantReward が失敗しても演出は出したいので続行
            // （マーキングはしないので次回もう1度試行される）
          }
          // grantReward 成功時のみマーキング（失敗時は次回リトライ）
          if (grantOk) _markGranted(gameId);
          // ホーム帰還時に演出する情報をキュー（選ばれた方のアイテムをそのまま記録）
          _queuePending(gameId, selected);
        }

        // 宝箱演出を即座に表示
        // 閉じた後: afterMsg があれば表示 → opts.onClose を呼ぶ
        var chainedClose = function() {
          var closeRw = chosenRw || rw;
          if (!closeRw) { if (opts.onClose) opts.onClose(); return; }
          var resolvedImg = _resolveImgPath(closeRw.img);
          if (closeRw.afterMsg && typeof window.showAfterMsgOverlay === 'function') {
            window.showAfterMsgOverlay(
              { name: closeRw.name, img: resolvedImg, afterMsg: closeRw.afterMsg },
              opts.onClose || null
            );
          } else if (closeRw.afterMsg) {
            // showAfterMsgOverlay が無いゲームページ用の簡易実装
            _simpleAfterMsg(closeRw.name, resolvedImg, closeRw.afterMsg, opts.onClose || null);
          } else if (opts.onClose) {
            opts.onClose();
          }
        };

        if (opts.skipImmediate) {
          // ゲーム内では表示しない (useChoice=false固定なのでrwが確定済み)。
          // pono_pending_first_clear にキュー済みなので play.html の checkPendingFirstClear
          // が帰還時に演出する想定 (現状 play.html 側は未実装だが oto の既存挙動を維持)。
          _finalizeGrant(rw);
          if (opts.onClose) opts.onClose();
        } else if (useChoice && window.showTreasure) {
          window.showTreasure({
            label: 'はじめての クリア！🎉',
            choices: [
              { name: boyVariant.name, img: _resolveImgPath(boyVariant.img), _rw: boyVariant },
              { name: girlVariant.name, img: _resolveImgPath(girlVariant.img), _rw: girlVariant }
            ],
            onChoose: function(picked) { _finalizeGrant(picked._rw); },
            onClose: chainedClose
          });
        } else if (!useChoice && window.showTreasure) {
          _finalizeGrant(rw);
          window.showTreasure({
            name: rw.name,
            img:  _resolveImgPath(rw.img),
            label: 'はじめての クリア！🎉',
            onClose: chainedClose
          });
        } else {
          // showTreasure 未ロード等のフォールバック環境: 選ばせようが無いので安全側(boy優先)に確定
          _finalizeGrant(useChoice ? boyVariant : rw);
          chainedClose();
        }

        return true;
      })
      .catch(function (e) {
        console.warn('[first-clear] failed to load rewards.json:', e);
        // 失敗時はスキップ扱いなので、呼び出し元は fallback 処理に入る
        return false;
      })
      .then(function (result) {
        // ごかんそう連鎖: 成功/失敗/スキップ いずれも 800ms 後に PonoRating を試行 (内部 4 ゲートで間引く)
        _scheduleRatingPrompt(gameId);
        return result;
      });
  };

  // デバッグ用: 付与記録をリセット（開発時のみ）
  // batch:887 admin-debug-leak-fix — manage unlock 後 + "first-clear-reset" feature ON
  // でのみ window.resetFirstClearRewards を露出。 disable 時は undefined のまま (本番ユーザーは触れない)。
  // 注意: first-clear.js は一部ページで debug-mode.js より先に読まれるため、 IIFE 段階で
  // window.PonoDebugMode を見ても未定義のことがある → DOMContentLoaded 後に評価する。
  function _maybeExposeFirstClearReset() {
    var allowed = false;
    try {
      allowed = !!(window.PonoDebugMode
        && typeof window.PonoDebugMode.isFeatureEnabled === 'function'
        && window.PonoDebugMode.isFeatureEnabled('first-clear-reset'));
    } catch (_e) { allowed = false; }
    if (!allowed) return;
    window.resetFirstClearRewards = function () {
      localStorage.removeItem(LS_GRANTED);
      localStorage.removeItem(LS_PENDING);
      console.log('[first-clear] reset granted + pending');
    };
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _maybeExposeFirstClearReset, { once: true });
  } else {
    _maybeExposeFirstClearReset();
  }
})();
