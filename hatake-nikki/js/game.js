// ── hatake-nikki/js/game.js ──
// ポノのはたけにっき: DOM/描画/入力 (DOM 依存)。
// 純粋ロジック (成長段階/日付ロールオーバー/キャッチアップ) は js/logic.js の
// window.HatakeLogic を参照する。
//
// NOTE: cloud-sync (端末間同期) は意図的にスコープ外。localStorage のみで完結。
// 将来 common/cloud-sync.js に統合する場合は lastSeenKey ベースの単調マージを検討
// (時刻チートは種解放が早まる程度なので防御しない)。
'use strict';

// ═══ 純関数ブロック (トップレベル。node から vm slice して直接テスト可能) ═══
// 画面遷移は .show クラスの付け外しのみで行う (hidden 属性には依存しない。
// donguri-wakekko の hidden×無条件display事故の再発防止 / CLAUDE.md 準拠)。
function createScreenController(screens) {
  // EXCLUSIVE: 同時に1つしか表示されない排他画面。それ以外 (overlay系: diary-overlay /
  // zukan-overlay / seed-picker) は show() 呼び出し時に既存の表示状態 (=field-screen 等)
  // を一切変更せず .show を追加するだけ (排他ループを回すのは id が EXCLUSIVE 自身の
  // ときだけに限定する。ここを誤って常時ループすると overlay 表示時に field-screen の
  // show が巻き添えで外れてしまう)。
  var EXCLUSIVE = ['start-screen', 'field-screen'];
  return {
    show: function (id) {
      if (EXCLUSIVE.indexOf(id) !== -1) {
        for (var i = 0; i < EXCLUSIVE.length; i++) {
          var k = EXCLUSIVE[i];
          if (screens[k]) screens[k].classList[k === id ? 'add' : 'remove']('show');
        }
        return;
      }
      if (screens[id]) screens[id].classList.add('show'); // overlay 系
    },
    hide: function (id) {
      if (screens[id]) screens[id].classList.remove('show');
    }
  };
}

// ═══ DOM 制御ブロック (node からは実行されない) ═══
(function () {
  if (typeof document === 'undefined') return;

  var L = window.HatakeLogic;
  if (!L) { console.error('[hatake-nikki] HatakeLogic (js/logic.js) が読み込まれていません'); return; }

  var STATE_KEY = 'pono_hatake_state_v1';
  var ZUKAN_KEY = 'pono_hatake_zukan_v1';

  // ═══ 画面遷移コントローラ ═══
  var screens = {
    'start-screen': document.getElementById('start-screen'),
    'field-screen': document.getElementById('field-screen'),
    'diary-overlay': document.getElementById('diary-overlay'),
    'zukan-overlay': document.getElementById('zukan-overlay'),
    'seed-picker': document.getElementById('seed-picker')
  };
  var screenCtl = createScreenController(screens);

  // ═══ 横画面強制 ═══
  // viewport 縦横比だけで向きを推定しない。WebView 起動直後/bfcache 復帰直後は
  // innerWidth/innerHeight が 0 や古い値になることがあり「0>=0→portrait」で
  // 誤検知フルスクリーンオーバーレイが start-btn を塞ぐ事故になる。
  // 物理向き (screen.orientation) を最優先、判定不能時は fail-open (表示しない)。
  var portraitMQ = null;
  try { portraitMQ = matchMedia('(orientation: portrait)'); } catch (e) {}

  function isPortraitNow() {
    try {
      var so = window.screen && screen.orientation;
      if (so && typeof so.type === 'string' && so.type) {
        return so.type.indexOf('portrait') === 0;
      }
    } catch (e) {}
    if (portraitMQ && typeof portraitMQ.matches === 'boolean') return portraitMQ.matches;
    if (!window.innerWidth || !window.innerHeight) return false; // 未確定は landscape 扱い
    return window.innerHeight > window.innerWidth; // 厳密不等号 (正方形は landscape 扱い)
  }

  function updateLandscapeNotice() {
    var notice = document.getElementById('landscape-notice');
    if (!notice) return;
    var isTouch = false;
    try { isTouch = matchMedia('(pointer: coarse)').matches; } catch (e) {}
    var show = isPortraitNow() && isTouch;
    notice.style.display = show ? 'flex' : 'none';
    notice.setAttribute('aria-hidden', show ? 'false' : 'true');
  }
  updateLandscapeNotice();
  window.addEventListener('orientationchange', function () {
    setTimeout(updateLandscapeNotice, 100);
    setTimeout(updateLandscapeNotice, 500);
  });
  window.addEventListener('resize', updateLandscapeNotice);
  window.addEventListener('pageshow', updateLandscapeNotice); // bfcache 復帰対策
  window.addEventListener('load', updateLandscapeNotice);     // 起動直後の viewport 確定後に再評価
  try {
    if (screen.orientation && screen.orientation.addEventListener) {
      screen.orientation.addEventListener('change', updateLandscapeNotice);
    }
  } catch (e) {}
  if (portraitMQ) {
    if (portraitMQ.addEventListener) portraitMQ.addEventListener('change', updateLandscapeNotice);
    else if (portraitMQ.addListener) portraitMQ.addListener(updateLandscapeNotice); // 旧 iOS Safari
  }
  if (window.visualViewport && visualViewport.addEventListener) {
    visualViewport.addEventListener('resize', updateLandscapeNotice);
  }

  // ═══ セーブ / ロード ═══
  function loadState() {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(STATE_KEY)); } catch (e) { raw = null; }
    return L.normalizeState(raw);
  }
  function saveState() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(appState)); } catch (e) {}
  }
  function loadZukan() {
    try {
      var raw = JSON.parse(localStorage.getItem(ZUKAN_KEY));
      if (raw && typeof raw === 'object') return raw;
    } catch (e) {}
    return {};
  }
  function saveZukan() {
    try { localStorage.setItem(ZUKAN_KEY, JSON.stringify(zukanState)); } catch (e) {}
  }

  // ═══ ゲーム状態 ═══
  var appState = loadState();
  var zukanState = loadZukan();
  var activeTool = null;      // null | 'water' | 'seed'
  var pendingSeedId = null;   // 'seed' ツール選択後、次にタップした空plotへ植える
  var plotPress = new Array(L.PLOT_COUNT || appState.plots.length);
  var plotLastTouchEnd = new Array(L.PLOT_COUNT || appState.plots.length);

  // ═══ DOM 参照 ═══
  var hudDateEl = document.getElementById('hud-date');
  var zukanGridEl = document.getElementById('zukan-grid');
  var diaryTextEl = document.getElementById('diary-text');
  var toolWaterBtn = document.getElementById('tool-water-btn');
  var toolSeedBtn = document.getElementById('tool-seed-btn');
  var hintToastEl = document.getElementById('hint-toast');
  var hintToastTimer = null;
  var statusBarEl = document.getElementById('status-bar');
  var statusFlashTimer = null;
  var CROP_STAGE_LABELS = ['たね', 'めが でた', 'ちいさな かぶ', 'やさいが できはじめた', 'しゅうかく できる'];
  var PLOT_POSITION_NAMES = [
    'いちばん おく',
    'ひだり',
    'みぎ',
    'いちばん てまえ',
    'おくの ひだり',
    'おくの みぎ',
    'まんなか',
    'てまえの ひだり',
    'てまえの みぎ'
  ];

  var plotRefs = [];
  var plotEls = document.querySelectorAll('.plot');
  for (var pi = 0; pi < plotEls.length; pi++) {
    var plotEl = plotEls[pi];
    var idx = parseInt(plotEl.getAttribute('data-plot'), 10);
    plotRefs[idx] = {
      el: plotEl,
      signEl: plotEl.querySelector('.crop-sign'),
      plantEl: plotEl.querySelector('.plant'),
      bugEl: plotEl.querySelector('.bug-sprite'),
      gaugeFillEl: plotEl.querySelector('.water-gauge-fill')
    };
  }

  // ═══ 水やり discoverability: ヒントトースト + 対象畝パルス ═══
  function showHintToast(text) {
    if (!hintToastEl) return;
    hintToastEl.textContent = text;
    hintToastEl.classList.add('is-visible');
    if (hintToastTimer) clearTimeout(hintToastTimer);
    hintToastTimer = setTimeout(function () {
      hintToastEl.classList.remove('is-visible');
    }, 1600);
  }

  // activeTool や plots の状態が変わったら必ずこれを呼び、水ツール選択中の
  // 水やり可能な畝 (植栽済み) だけをパルスさせて誘導する。
  function updateWaterTargets() {
    for (var wi = 0; wi < plotRefs.length; wi++) {
      if (!plotRefs[wi]) continue;
      var p = appState.plots[wi];
      var on = (activeTool === 'water') && !!p.seedId && !p.wateredToday;
      plotRefs[wi].el.classList.toggle('is-water-target', on);
    }
  }

  // ═══ 常設ステータスバー (状態説明テキスト) ═══
  // 優先度は上から判定 (仕様書 §3 の文言マトリクス通り)。
  function computeStatusText() {
    var anyPlanted = false, anyUnwatered = false, anyHarvest = false, anyBug = false;
    for (var i = 0; i < appState.plots.length; i++) {
      var p = appState.plots[i];
      if (!p.seedId) continue;
      anyPlanted = true;
      if (!p.wateredToday) anyUnwatered = true;
      if (L.stageOf(p) === 4) anyHarvest = true;
      if (p.bug) anyBug = true;
    }
    var holding = false;
    for (var h = 0; h < plotPress.length; h++) {
      if (plotPress[h] && plotPress[h].timerId) { holding = true; break; }
    }
    if (holding) return 'そのまま ゆびを はなさないでね…';
    if (activeTool === 'seed' && pendingSeedId) return 'あいている はたけを タップ！ たねを うえるよ';
    if (activeTool === 'water') {
      if (!anyPlanted) return 'まず たねボタンで たねを うえてね';
      if (!anyUnwatered) return 'きょうの みずやりは ぜんぶ できたよ！';
      return 'ひかる はたけを ながおしして みずやり！';
    }
    if (anyBug) return 'むしを ゆびで はじいて とばそう！';
    if (anyHarvest) return 'ぴかぴかの やさいを タップして しゅうかく！';
    if (!anyPlanted) return 'たねボタンで たねを うえよう';
    if (anyUnwatered) return 'じょうろボタンを おして みずやりしよう';
    return 'きょうの おせわは ばっちり！ また あした';
  }

  // force=true の場合のみ flash 表示中でも強制的に上書きする。
  // 優先度1(長押し中の「そのまま ゆびを はなさないでね…」)は仕様上
  // いかなる flash よりも優先されるべきなので、beginPress の長押し開始時だけ
  // force で呼び出し、別畝の水やり成功flash等に埋もれないようにする。
  function updateStatusBar(force) {
    if (!statusBarEl) return;
    if (statusFlashTimer && !force) return; // flash 中は上書きしない
    if (statusFlashTimer) {
      clearTimeout(statusFlashTimer);
      statusFlashTimer = null;
    }
    statusBarEl.textContent = computeStatusText();
    statusBarEl.classList.remove('is-flash');
  }

  function flashStatus(text, ms) {
    if (!statusBarEl) return;
    if (statusFlashTimer) clearTimeout(statusFlashTimer);
    statusBarEl.textContent = text;
    statusBarEl.classList.add('is-flash');
    statusFlashTimer = setTimeout(function () {
      statusFlashTimer = null;
      updateStatusBar();
    }, ms || 1600);
  }

  // ═══ 描画 ═══
  function renderHud() {
    if (!hudDateEl) return;
    var parts = String(appState.lastSeenKey || '').split('-');
    if (parts.length === 3) {
      hudDateEl.textContent = '📅 ' + Number(parts[1]) + '/' + Number(parts[2]);
    }
  }

  function renderPlot(idx) {
    var refs = plotRefs[idx];
    if (!refs) return;
    var plot = appState.plots[idx];
    var stage = L.stageOf(plot);
    var cropInfo = plot.seedId ? L.CROPS[plot.seedId] : null;
    var crop = cropInfo;
    var signSrc = cropInfo ? cropInfo.signImg : null;
    if (plot.seedId) refs.el.setAttribute('data-crop', plot.seedId);
    else refs.el.removeAttribute('data-crop');
    if (refs.signEl) {
      if (signSrc) {
        refs.signEl.src = signSrc;
        refs.signEl.classList.add('is-visible');
      } else {
        refs.signEl.removeAttribute('src');
        refs.signEl.classList.remove('is-visible');
      }
    }
    refs.plantEl.setAttribute('data-stage', String(stage));
    refs.plantEl.classList.toggle('is-wilted', !!plot.wilted);
    refs.plantEl.innerHTML = '';
    if (stage >= 0 && crop && Array.isArray(crop.stageImages) && crop.stageImages[stage]) {
      var img = document.createElement('img');
      img.className = 'crop-stage-img';
      img.src = crop.stageImages[stage];
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.draggable = false;
      refs.plantEl.appendChild(img);
    }
    if (refs.bugEl) refs.bugEl.classList.toggle('is-visible', !!plot.bug);
    refs.el.classList.toggle('is-watered', !!plot.wateredToday);
    var positionName = PLOT_POSITION_NAMES[idx] || String(idx + 1) + 'ばん';
    if (cropInfo) {
      refs.el.setAttribute('aria-label', positionName + 'の ' + cropInfo.name + 'の はたけ。' +
        (CROP_STAGE_LABELS[stage] || '') + '。' +
        (plot.wateredToday ? 'きょうの みずやり できた' : 'きょうの みずやりは まだ'));
    } else {
      refs.el.setAttribute('aria-label', positionName + 'の あいている はたけ');
    }
  }

  function renderAllPlots() {
    for (var i = 0; i < appState.plots.length; i++) renderPlot(i);
  }

  function renderZukan() {
    if (!zukanGridEl) return;
    zukanGridEl.innerHTML = '';
    var cropIds = Object.keys(L.CROPS);
    for (var i = 0; i < cropIds.length; i++) {
      var cropId = cropIds[i];
      var crop = L.CROPS[cropId];
      var entry = zukanState[cropId] || { count: 0 };
      var wrap = document.createElement('div');
      wrap.className = 'zukan-entry' + ((entry.count || 0) > 0 ? '' : ' is-unknown');
      var img = document.createElement('img');
      img.src = crop.img;
      img.alt = crop.name;
      var name = document.createElement('div');
      name.className = 'zukan-name';
      name.textContent = crop.name;
      var count = document.createElement('div');
      count.className = 'zukan-count';
      count.textContent = (entry.count || 0) + 'こ しゅうかく';
      wrap.appendChild(img);
      wrap.appendChild(name);
      wrap.appendChild(count);
      zukanGridEl.appendChild(wrap);
    }
  }

  // ═══ アクション ═══
  function doWater(idx) {
    if (!L.waterPlot(appState, idx)) return;
    saveState();
    if (window.Haptics) window.Haptics.fire('stickerPaste');
    renderPlot(idx);
    updateWaterTargets();
    playWaterPour(idx);
    flashStatus('みずやり できた！');
  }

  function playWaterPour(idx) {
    var refs = plotRefs[idx];
    if (!refs) return;
    var staleFx = refs.el.querySelector('.watering-pour-fx');
    if (staleFx && staleFx.parentNode) staleFx.parentNode.removeChild(staleFx);

    var fx = document.createElement('div');
    fx.className = 'watering-pour-fx';
    fx.setAttribute('aria-hidden', 'true');

    var can = document.createElement('img');
    can.className = 'watering-can-fx';
    can.src = '../assets/images/Rooms/furnitures_final/deco_watering_can_B.png';
    can.alt = '';
    can.setAttribute('aria-hidden', 'true');
    can.draggable = false;

    var stream = document.createElement('span');
    stream.className = 'watering-stream-fx';
    stream.setAttribute('aria-hidden', 'true');

    var splash = document.createElement('img');
    splash.className = 'water-splash-fx';
    splash.src = '../assets/images/hatake-nikki/watered_drop_mark_v2.png';
    splash.alt = '';
    splash.setAttribute('aria-hidden', 'true');
    splash.draggable = false;

    fx.appendChild(can);
    fx.appendChild(stream);
    fx.appendChild(splash);
    refs.el.appendChild(fx);

    var cleanupTimer = null;
    var cleaned = false;
    function cleanupWaterPour() {
      if (cleaned) return;
      cleaned = true;
      if (cleanupTimer) clearTimeout(cleanupTimer);
      if (fx.parentNode) fx.parentNode.removeChild(fx);
    }
    can.addEventListener('animationend', cleanupWaterPour, { once: true });
    // background tabやanimation無効環境でも一時DOMを残さない保険。
    cleanupTimer = setTimeout(cleanupWaterPour, 1300);
  }

  function doShooBug(idx) {
    var refs = plotRefs[idx];
    L.shooBug(appState, idx);
    saveState();
    if (window.Haptics) window.Haptics.fire('capsuleCrack');
    if (refs && refs.bugEl) {
      refs.bugEl.classList.add('is-fleeing');
      setTimeout(function () {
        refs.bugEl.classList.remove('is-fleeing', 'is-visible');
      }, 400);
    }
    updateStatusBar();
  }

  function doHarvest(idx) {
    var res = L.harvest(appState, idx);
    if (!res.ok) return;
    var crop = L.CROPS[res.seedId];
    var entry = zukanState[res.seedId] || { count: 0, firstDate: null };
    if (!entry.firstDate) entry.firstDate = appState.lastSeenKey;
    entry.count = (entry.count || 0) + 1;
    zukanState[res.seedId] = entry;
    saveZukan();
    saveState();
    renderPlot(idx);
    updateWaterTargets();
    updateStatusBar();
    if (window.Haptics) window.Haptics.fire('superBadgePop');
    if (window.incrementStat) {
      window.incrementStat('hatake_harvest', 1);
      if (window.checkAchievements) window.checkAchievements();
    }
    // machizukuri やさいスタンドの計量リビール向けキュー書き込み (一方向橋渡し。
    // machizukuri → hatake-nikki 方向の書き込みはこの経路からは発生しない)。
    if (window.HatakeHarvestBridge && crop) {
      window.HatakeHarvestBridge.enqueue({
        seedId: res.seedId, name: crop.name, img: crop.img,
        weightMultiplier: res.weightMultiplier, weight: res.weight,
        wiltCount: res.wiltCount, bugsMissed: res.bugsMissed, extraDays: res.extraDays
      });
    }
    // Narration: MVP では呼ばない (キャラ肉声禁止ポリシー + 音声未生成)。
    // 将来: 女性ナレ「やさいが よろこんでいるよ」型のみ可。
    if (window.showTreasure && crop) {
      window.showTreasure({
        name: crop.name,
        img: crop.img,
        label: 'しゅうかく！',
        onClose: function () {}
      });
    }
  }

  function doPlant(idx) {
    if (!pendingSeedId) return;
    var ok = L.plantSeed(appState, idx, pendingSeedId);
    if (!ok) return;
    pendingSeedId = null;
    activeTool = null;
    if (toolSeedBtn) toolSeedBtn.classList.remove('is-active');
    saveState();
    renderPlot(idx);
    updateWaterTargets();
    updateStatusBar();
  }

  function doTapAction(idx) {
    var plot = appState.plots[idx];
    if (pendingSeedId && !plot.seedId) {
      doPlant(idx);
      return;
    }
    if (L.stageOf(plot) === 4) {
      doHarvest(idx);
    }
  }

  // ═══ ジェスチャー: 水やり(長押し800ms) / 虫のフリック / タップ(植える・しゅうかく) ═══
  // memory: feedback_ios_pointercancel_native_pan — pointerdown/up だけで
  // 「指が接地中」を追跡しない。touchstart/touchend/touchcancel を必ず併用する。
  var WATER_HOLD_MS = 800;
  var FLICK_DIST = 40;
  var TAP_MOVE_TOLERANCE = 24;

  function beginPress(idx, touch, onBug) {
    var refs = plotRefs[idx];
    var st = { x: touch.clientX, y: touch.clientY, onBug: !!onBug, timerId: null };
    plotPress[idx] = st;
    if (st.onBug) return;
    var plot = appState.plots[idx];
    // 既に本日水やり済みの畝は is-water-target(パルス)対象外だが、そのまま
    // 長押しされても水やり成功フロー(バッジ/スプラッシュ/flash/ハプティクス)を
    // 再生しない(冪等だが「済んだかどうか分かりにくい」苦情の趣旨に反するため)。
    if (activeTool === 'water' && plot.seedId && !plot.wateredToday) {
      refs.el.classList.add('is-watering');
      if (refs.gaugeFillEl) {
        // 800ms かけて 0%→100% まで満ちるアニメーション (CSS transition: width 800ms linear と対)。
        // 先に 0% へ同期リセットしてから rAF で 100% を書き込むことで、
        // ブラウザに「0%→100%への遷移」を必ず1フレーム分認識させる (即100%指定だと
        // transition がスキップされ瞬時に満タン表示になる場合があるため)。
        refs.gaugeFillEl.style.transition = 'none';
        refs.gaugeFillEl.style.width = '0%';
        // 強制 reflow でスタイル即時反映 (transition:none を確実に効かせる)
        void refs.gaugeFillEl.offsetWidth;
        refs.gaugeFillEl.style.transition = '';
        requestAnimationFrame(function () {
          if (refs.gaugeFillEl) refs.gaugeFillEl.style.width = '100%';
        });
      }
      st.timerId = setTimeout(function () {
        st.timerId = null;
        plotPress[idx] = null;
        refs.el.classList.remove('is-watering');
        if (refs.gaugeFillEl) refs.gaugeFillEl.style.width = '0%';
        doWater(idx);
      }, WATER_HOLD_MS);
    } else {
      if (activeTool === 'water' && !plot.seedId) {
        showHintToast('まず たねを うえてね');
        if (window.Haptics) window.Haptics.fire('stickerPaste');
      }
      refs.el.classList.add('is-pressed');
    }
    // 長押し(水やりタイマー始動)時のみ force: 優先度1のholding文言で
    // 直前の成功flash等を割り込んで即時反映する。
    updateStatusBar(!!st.timerId);
  }

  function endPress(idx, endX, endY) {
    var refs = plotRefs[idx];
    var st = plotPress[idx];
    plotPress[idx] = null;
    if (!st) return;
    if (st.timerId) {
      clearTimeout(st.timerId);
      st.timerId = null;
      // 早すぎるリリース (800ms未満で指を離した): 水やり対象だった時だけ再挑戦を促す。
      if (!st.onBug && activeTool === 'water' && appState.plots[idx].seedId) {
        flashStatus('もうすこし ながく おしてね');
      }
    }
    refs.el.classList.remove('is-watering', 'is-pressed');
    if (refs.gaugeFillEl) refs.gaugeFillEl.style.width = '0%';

    var dx = (typeof endX === 'number') ? endX - st.x : 0;
    var dy = (typeof endY === 'number') ? endY - st.y : 0;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (st.onBug) {
      if (dist >= FLICK_DIST) doShooBug(idx);
      return;
    }
    if (dist <= TAP_MOVE_TOLERANCE) {
      doTapAction(idx);
    }
    updateStatusBar(); // flash 中なら no-op (flashStatus が優先される)
  }

  function cancelPress(idx) {
    var refs = plotRefs[idx];
    var st = plotPress[idx];
    plotPress[idx] = null;
    if (st && st.timerId) {
      clearTimeout(st.timerId);
      // touchcancel でタイマーが生きていた = 長押し途中の中断 (コールアウト等)。
      // 無言リセットにせず、もう一度長押ししてねと案内する。
      flashStatus('もういちど ながおしして みてね');
    }
    if (refs) {
      refs.el.classList.remove('is-watering', 'is-pressed');
      if (refs.gaugeFillEl) refs.gaugeFillEl.style.width = '0%';
    }
    updateStatusBar(); // flash 中なら no-op
  }

  // 長押しを使えないキーボード・マウス・支援技術向けの1回操作。
  // 水ツール時だけ即時水やり、それ以外は既存タップ操作へ合流させる。
  function activatePlotByInput(idx) {
    var plot = appState.plots[idx];
    if (!plot) return;
    if (plot.bug) {
      doShooBug(idx);
    } else if (activeTool === 'water' && plot.seedId && !plot.wateredToday) {
      doWater(idx);
    } else {
      doTapAction(idx);
    }
  }

  // iOS/Android の長押しネイティブメニュー抑止 (issue1)。
  // NOTE: .plot の touchstart は {passive:true} のまま変えない
  // (preventDefault はここでは不要。コールアウトは CSS -webkit-touch-callout:none +
  // この contextmenu 抑止で塞ぐ)。
  var stageEl = document.getElementById('stage');
  if (stageEl) {
    stageEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  for (var gi = 0; gi < plotRefs.length; gi++) {
    (function (idx) {
      var refs = plotRefs[idx];
      if (!refs) return;
      refs.el.addEventListener('touchstart', function (e) {
        var t = e.changedTouches[0];
        if (!t) return;
        var onBug = !!(refs.bugEl && appState.plots[idx].bug && e.target && refs.bugEl.contains(e.target));
        beginPress(idx, t, onBug);
      }, { passive: true });
      refs.el.addEventListener('touchend', function (e) {
        var t = e.changedTouches[0];
        plotLastTouchEnd[idx] = performance.now();
        endPress(idx, t ? t.clientX : null, t ? t.clientY : null);
      }, { passive: true });
      refs.el.addEventListener('touchcancel', function () {
        cancelPress(idx);
      }, { passive: true });
      // role="button" のキーボード経路。水ツール中は長押しの代わりに
      // Enter / Space 1回で水やりし、それ以外は植栽・収穫のタップ操作と揃える。
      refs.el.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        activatePlotByInput(idx);
      });
      // 通常のマウス／トラックパッドと、支援技術が送るclickを受ける。
      // touchend直後の合成clickだけは、植栽→即収穫などの二重発火を防ぐため無視する。
      refs.el.addEventListener('click', function (e) {
        var lastTouchEnd = plotLastTouchEnd[idx];
        if (typeof lastTouchEnd === 'number' && performance.now() - lastTouchEnd < 700) return;
        e.preventDefault();
        activatePlotByInput(idx);
      });
    })(gi);
  }

  // ═══ HUD / ツール / モーダル操作 ═══
  // pointerdown は既存の即応性を維持し、detail=0 のclickで
  // Enter / Space・支援技術・HTMLElement.click() も同じactionへ合流させる。
  // 実ポインターのclick(detail>0)は直前のpointerdownと二重になるため無視する。
  function bindControlAction(el, action) {
    if (!el) return;
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      action();
    });
    el.addEventListener('click', function (e) {
      if (e.detail !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      action();
    });
  }

  var zukanOpenBtn = document.getElementById('zukan-open-btn');
  bindControlAction(zukanOpenBtn, function () {
    renderZukan();
    screenCtl.show('zukan-overlay');
  });
  var zukanCloseBtn = document.getElementById('zukan-close-btn');
  bindControlAction(zukanCloseBtn, function () {
    screenCtl.hide('zukan-overlay');
  });
  var diaryCloseBtn = document.getElementById('diary-close-btn');
  bindControlAction(diaryCloseBtn, function () {
    screenCtl.hide('diary-overlay');
  });
  bindControlAction(toolWaterBtn, function () {
    activeTool = (activeTool === 'water') ? null : 'water';
    pendingSeedId = null;
    toolWaterBtn.classList.toggle('is-active', activeTool === 'water');
    if (toolSeedBtn) toolSeedBtn.classList.remove('is-active');
    updateWaterTargets();
    updateStatusBar();
  });
  bindControlAction(toolSeedBtn, function () {
    screenCtl.show('seed-picker');
  });
  function warmCropStages(cropId) {
    var crop = L.CROPS[cropId];
    if (!crop || !Array.isArray(crop.stageImages)) return;
    for (var wi = 0; wi < crop.stageImages.length; wi++) {
      var preload = new Image();
      preload.src = crop.stageImages[wi];
    }
  }
  var seedChoiceEls = document.querySelectorAll('.seed-choice');
  for (var sci = 0; sci < seedChoiceEls.length; sci++) {
    (function (btn) {
      bindControlAction(btn, function () {
        pendingSeedId = btn.getAttribute('data-seed');
        warmCropStages(pendingSeedId);
        activeTool = 'seed';
        if (toolWaterBtn) toolWaterBtn.classList.remove('is-active');
        if (toolSeedBtn) toolSeedBtn.classList.add('is-active');
        screenCtl.hide('seed-picker');
        updateWaterTargets();
        updateStatusBar();
      });
    })(seedChoiceEls[sci]);
  }
  // ── 種ピッカーを閉じる導線 (diary/zukan と同様の逃げ道を用意する。
  //    誤タップで開いても閉じられないトラップ状態にしない) ──
  function closeSeedPicker() {
    pendingSeedId = null;
    activeTool = null;
    if (toolSeedBtn) toolSeedBtn.classList.remove('is-active');
    screenCtl.hide('seed-picker');
    updateWaterTargets();
    updateStatusBar();
  }
  var seedPickerCloseBtn = document.getElementById('seed-picker-close-btn');
  bindControlAction(seedPickerCloseBtn, closeSeedPicker);
  var seedPickerEl = document.getElementById('seed-picker');
  if (seedPickerEl) {
    // バックドロップ (カード外側) タップでも閉じられるようにする。
    seedPickerEl.addEventListener('pointerdown', function (e) {
      if (e.target === seedPickerEl) closeSeedPicker();
    });
  }

  // ═══ チュートリアル (共通 tut-dim/tut-bubble パターン。hyokkori-hightouch 踏襲) ═══
  var TUT_STEPS = [
    { iconSrc: '../assets/images/Rooms/furnitures_final/deco_watering_can_B.png', text: 'じょうろボタンを えらんで<br>はたけを おしつづけると みずやりできるよ' },
    { iconSrc: '../assets/images/ocean/Ladybug/Ladybug_normal_1.png', text: 'むしが きたら ゆびで はじいて<br>とばしてあげてね' },
    { iconSrc: '../assets/images/hatake-nikki/crops/ninjin_stage_4_ready.webp', text: 'ぴかぴか ひかったら しゅうかくのサイン！<br>タップして とろう' }
  ];
  var tutStep = 0;
  function showTutorial() {
    tutStep = 0;
    renderTutStep();
  }
  function renderTutStep() {
    var dim = document.getElementById('tut-dim');
    var bubble = document.getElementById('tut-bubble');
    if (!dim || !bubble) return;
    var step = TUT_STEPS[tutStep];
    var iconHtml = step.iconSrc
      ? '<img src="' + step.iconSrc + '" alt="" aria-hidden="true" draggable="false">'
      : step.icon;
    dim.classList.remove('hidden');
    bubble.classList.remove('hidden');
    bubble.innerHTML = '<div class="tut-icon">' + iconHtml + '</div>' + step.text +
      '<br><button class="tut-next-btn" id="tut-next">' + (tutStep < TUT_STEPS.length - 1 ? 'つぎへ' : 'とじる') + '</button>';
    var tutNextBtn = document.getElementById('tut-next');
    bindControlAction(tutNextBtn, advanceTutorial);
    if (tutNextBtn) tutNextBtn.focus({ preventScroll: true });
  }
  function closeTutorial() {
    var dim = document.getElementById('tut-dim');
    var bubble = document.getElementById('tut-bubble');
    if (dim) dim.classList.add('hidden');
    if (bubble) bubble.classList.add('hidden');
  }
  function advanceTutorial() {
    tutStep++;
    if (tutStep >= TUT_STEPS.length) { closeTutorial(); return; }
    renderTutStep();
  }
  var tutDimEl = document.getElementById('tut-dim');
  if (tutDimEl) tutDimEl.addEventListener('pointerdown', closeTutorial);

  function startMenuOnce() {
    if (window._hatakeMenuInited || typeof window.initMenu !== 'function') return;
    window.initMenu({ tutorial: showTutorial });
    window._hatakeMenuInited = true;
  }

  // ═══ ゲームフロー: start-screen → (catchUpDays) → field-screen [→ diary-overlay] ═══
  var TUT_SEEN_KEY = 'pono_hatake_tut_seen_v1';
  function startGame() {
    appState = loadState();
    var todayKey = L.dateKey(L.getNow());
    var result = L.catchUpDays(appState, todayKey);
    saveState();
    renderHud();
    renderAllPlots();
    updateWaterTargets();
    updateStatusBar();
    screenCtl.show('field-screen');
    if (result.daysPassed >= 1 && diaryTextEl) {
      diaryTextEl.textContent = result.daysPassed + 'にちぶり！ おかえりなさい';
      screenCtl.show('diary-overlay');
    }

    var tutSeen = false;
    try { tutSeen = localStorage.getItem(TUT_SEEN_KEY) === '1'; } catch (e) {}
    if (!tutSeen) {
      try { localStorage.setItem(TUT_SEEN_KEY, '1'); } catch (e) {}
      showTutorial();
    }
  }

  var startBtn = document.getElementById('start-btn');
  if (startBtn) {
    var startPressLocked = false;
    var onStartPress = function (e) {
      e.preventDefault(); e.stopPropagation();
      if (startPressLocked) return; // pointerdown→click の二重発火抑止
      startPressLocked = true;
      setTimeout(function () { startPressLocked = false; }, 700);
      startMenuOnce();
      startGame();
    };
    startBtn.addEventListener('pointerdown', onStartPress);
    startBtn.addEventListener('click', onStartPress); // PointerEvent 未配送環境の保険
  }
})();
