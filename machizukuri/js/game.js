// ── machizukuri/js/game.js ──
// ポノのまちづくり: DOM/描画/入力・localStorage (DOM 依存)。
// 純粋ロジック (経済/区画状態) は js/logic.js の window.MachiLogic、
// SVG パーツ/レイアウト/配色データは js/parts.js の window.MachiParts を参照する。
//
// ジェスチャー設計: このゲームに drag/long-press は無い。全操作はタップ
// (click リスナー) のみ (gesture_design 仕様通り)。 touch-action:manipulation
// を styles.css 側で既に指定済みなので、click は遅延なく発火する。
'use strict';

(function () {
  if (typeof document === 'undefined') return;

  var L = window.MachiLogic;
  var P = window.MachiParts;

  function showBootError() {
    var el = document.getElementById('machi-boot-error');
    if (el) el.classList.add('show');
    if (document.body) document.body.classList.add('pono-game-ready');
  }

  // index.html 側の checkAndRecover() は、この <script> タグの load イベント
  // (=このIIFEの同期実行が終わった直後) に、同じ document 内で直後に続けて
  // 同期的に呼ばれる。MachiLogic/MachiParts が既に存在し script state も
  // 'loaded' であれば ready()===true と判定されて hideBootError() が走るため、
  // ここで同期的に showBootError() を呼んでも直後に打ち消されてしまう
  // (index.html は編集対象外のためこちら側で回避する)。setTimeout で1タスク
  // 遅延させ、index.html 側の初回チェックが完了した後に確実に表示させる。
  function boot() {
    try {
      bootInner();
    } catch (e) {
      console.error('[machizukuri] boot() 内で予期しない例外が発生しました。エラーUIを表示します:', e);
      setTimeout(showBootError, 0);
    }
  }

  function bootInner() {
    var STATE_KEY = 'pono_machi_state_v1';
    var TUT_SEEN_KEY = 'pono_machi_tut_seen_v1';
    var HOUSE_PART_ID = 'pono_house';
    var BASE_LOT_SIZE = 180; // viewBox 単位。列間隔220に対し重ならない実測値。
    var FLOWER_DISPLAY_SIZE = 90; // viewBox 単位。flower_cluster 実寸(70x70)よりやや大きく見せる。

    var appState = loadState();
    var lotElsById = {};
    var pickerLotId = null;
    var popoverLotId = null;

    // ═══ セーブ / ロード ═══
    function loadState() {
      var raw = null;
      try { raw = JSON.parse(localStorage.getItem(STATE_KEY)); } catch (e) { raw = null; }
      return L.normalizeState(raw);
    }
    function saveState() {
      try { localStorage.setItem(STATE_KEY, JSON.stringify(appState)); } catch (e) {}
    }

    // ═══ viewBox(1600x900) → % 変換 ═══
    // #stage は常に 16:9 固定 (styles.css) で STAGE_VIEWBOX も 1600:900=16:9 と
    // 完全一致するため、x/1600 と y/900 の同じ比率換算で width/height に
    // 使っても正方形が正方形のまま描画される (縦横比の歪み無し)。
    function toPctW(v) { return (v / 1600 * 100) + '%'; }
    function toPctH(v) { return (v / 900 * 100) + '%'; }

    // 各 SVG 文字列の最初の class="..." にクラスを追加注入する。
    // parts.js の SVG はどれも子要素に class 属性を持たないため、最初の
    // 出現箇所だけを置換すれば必ずルート <svg> のクラスに追加される。
    function injectClass(svgMarkup, extraClass) {
      if (!extraClass) return svgMarkup;
      return svgMarkup.replace('class="', 'class="' + extraClass + ' ');
    }

    function findLotState(lotId) {
      for (var i = 0; i < appState.lots.length; i++) {
        if (appState.lots[i] && appState.lots[i].lotId === lotId) return appState.lots[i];
      }
      return null;
    }
    function findLotDef(lotId) {
      for (var i = 0; i < P.LOTS.length; i++) {
        if (P.LOTS[i].id === lotId) return P.LOTS[i];
      }
      return null;
    }
    function findPart(partId) {
      for (var i = 0; i < P.PARTS.length; i++) {
        if (P.PARTS[i].id === partId) return P.PARTS[i];
      }
      return null;
    }
    function harvestTotal() {
      return (window.getStat) ? window.getStat('hatake_harvest') : 0;
    }

    // ═══ 横画面強制 (guragura-seesaw 踏襲。ただし表示切替は本 feature の
    // 規約に合わせて .show クラスで行う。 bare hidden 属性は使わない) ═══
    function computeIsPortrait() {
      try {
        var so = window.screen && window.screen.orientation;
        if (so && typeof so.type === 'string' && so.type.indexOf('portrait') === 0) return true;
        if (so && typeof so.type === 'string' && so.type.indexOf('landscape') === 0) return false;
        if (typeof window.matchMedia === 'function') {
          var mq = window.matchMedia('(orientation: portrait)');
          if (mq && typeof mq.matches === 'boolean') return mq.matches;
        }
        return false;
      } catch (e) {
        return false;
      }
    }
    function isCoarsePointer() {
      try {
        return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
      } catch (e) {
        return false;
      }
    }
    function updateLandscapeNotice() {
      var notice = document.getElementById('landscape-notice');
      if (!notice) return;
      var show = computeIsPortrait() && isCoarsePointer();
      notice.classList.toggle('show', show);
      notice.setAttribute('aria-hidden', show ? 'false' : 'true');
    }
    updateLandscapeNotice();
    window.addEventListener('orientationchange', function () {
      setTimeout(updateLandscapeNotice, 100);
      setTimeout(updateLandscapeNotice, 500);
    });
    window.addEventListener('resize', updateLandscapeNotice);
    window.addEventListener('pageshow', updateLandscapeNotice);
    window.addEventListener('load', updateLandscapeNotice);
    try {
      if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
        window.visualViewport.addEventListener('resize', updateLandscapeNotice);
      }
    } catch (e) {}
    try {
      if (window.screen && window.screen.orientation && typeof window.screen.orientation.addEventListener === 'function') {
        window.screen.orientation.addEventListener('change', updateLandscapeNotice);
      }
    } catch (e) {}

    // ═══ 区画 (lot) 生成・描画 ═══
    function lotBoxStyle(scale) {
      var size = BASE_LOT_SIZE * (scale || 1);
      return { width: toPctW(size), height: toPctH(size) };
    }

    function buildLots() {
      var container = document.getElementById('scene-lots');
      if (!container) return;
      container.innerHTML = '';
      lotElsById = {};
      for (var i = 0; i < P.LOTS.length; i++) {
        var def = P.LOTS[i];
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lot';
        btn.setAttribute('data-lot-id', def.id);
        var box = lotBoxStyle(def.scale);
        btn.style.left = toPctW(def.x);
        btn.style.top = toPctH(def.y);
        btn.style.width = box.width;
        btn.style.height = box.height;
        if (def.id === P.HOUSE_LOT_ID) btn.classList.add('is-house');
        btn.addEventListener('click', (function (lotId) {
          return function () { onLotTap(lotId); };
        })(def.id));
        container.appendChild(btn);
        lotElsById[def.id] = btn;
      }
    }

    function renderLot(lotId, opts) {
      var el = lotElsById[lotId];
      if (!el) return;
      var entry = findLotState(lotId);
      var partId = entry ? entry.partId : null;
      if (partId) {
        var part = findPart(partId);
        el.innerHTML = part ? injectClass(part.svg, part.idleAnimClass) : '';
        el.classList.remove('is-empty');
        el.setAttribute('aria-label', (part ? part.name : 'たてもの') + ' の くかく');
      } else {
        el.innerHTML = '';
        el.classList.add('is-empty');
        el.setAttribute('aria-label', 'あいている くかく。タップして たてよう');
      }
      if (opts && opts.grow) {
        el.classList.remove('grow-in');
        void el.offsetWidth;
        el.classList.add('grow-in');
        setTimeout(function () { el.classList.remove('grow-in'); }, 600);
      }
    }

    function renderAllLots() {
      for (var i = 0; i < P.LOTS.length; i++) renderLot(P.LOTS[i].id);
    }

    function onLotTap(lotId) {
      var entry = findLotState(lotId);
      if (!entry) return;
      if (entry.partId) {
        openPopover(lotId, entry.partId);
      } else {
        openPicker(lotId);
      }
    }

    // ═══ 道ばた はな (repeatable, HUD ボタン経由) ═══
    function renderFlowers(opts) {
      var container = document.getElementById('scene-flowers');
      if (!container) return;
      container.innerHTML = '';
      var flowerPart = findPart('flower_cluster');
      var svgMarkup = flowerPart ? flowerPart.svg : '';
      for (var i = 0; i < appState.flowers && i < P.FLOWER_SLOTS.length; i++) {
        var slot = P.FLOWER_SLOTS[i];
        var wrap = document.createElement('div');
        wrap.style.position = 'absolute';
        wrap.style.left = toPctW(slot.x);
        wrap.style.top = toPctH(slot.y);
        wrap.style.width = toPctW(FLOWER_DISPLAY_SIZE);
        wrap.style.height = toPctH(FLOWER_DISPLAY_SIZE);
        wrap.style.transform = 'translate(-50%, -50%)';
        wrap.innerHTML = svgMarkup;
        if (opts && opts.growIndex === i) wrap.classList.add('grow-in');
        container.appendChild(wrap);
      }
    }

    // ═══ ちょうちょ (アンビエント。 idleAnimClass が left/top/offset-path を
    // まとめて持つ CSS 契約なので、ルート svg にそのクラスを注入するだけでよい。
    // prefers-reduced-motion 時のアニメ停止は styles.css の該当メディアクエリが
    // 一括で担う (このファイル側での二重ガードは行わない)) ═══
    function renderButterflies() {
      var container = document.getElementById('scene-butterflies');
      if (!container) return;
      container.innerHTML = '';
      for (var i = 0; i < P.BUTTERFLIES.length; i++) {
        var b = P.BUTTERFLIES[i];
        var wrap = document.createElement('div');
        wrap.innerHTML = injectClass(b.svg, b.idleAnimClass);
        var node = wrap.firstElementChild;
        if (node) container.appendChild(node);
      }
    }

    // ═══ 昼/夕方ティント (実時計) ═══
    function updateDayNightTint() {
      var stage = document.getElementById('stage');
      if (!stage) return;
      var evening = L.isEvening(L.getNow());
      stage.classList.toggle('is-day', !evening);
      stage.classList.toggle('is-evening', evening);
    }

    // ═══ いえ の テーマ配色 (pono_room_theme を読むだけ。書き込みは一切しない) ═══
    function applyHouseTheme() {
      var theme = null;
      try { theme = localStorage.getItem('pono_room_theme'); } catch (e) { theme = null; }
      var tint = P.houseThemeTint(theme);
      var stage = document.getElementById('stage');
      if (!stage) return;
      for (var key in tint) {
        if (Object.prototype.hasOwnProperty.call(tint, key)) stage.style.setProperty(key, tint[key]);
      }
    }

    // ═══ 紙吹雪 (設置成功時の演出。CSS 側 machiConfettiFall と対) ═══
    var CONFETTI_COLORS = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#ffb4d6'];
    function spawnConfettiAtPercent(leftPct, topPct) {
      var layer = document.getElementById('confetti-layer');
      if (!layer) return;
      var count = 12;
      for (var i = 0; i < count; i++) {
        var piece = document.createElement('div');
        piece.className = 'machi-confetti-piece';
        piece.style.left = leftPct;
        piece.style.top = topPct;
        var angle = Math.random() * Math.PI * 2;
        var dist = 40 + Math.random() * 50;
        piece.style.setProperty('--machi-conf-x', (Math.cos(angle) * dist).toFixed(1) + 'px');
        piece.style.setProperty('--machi-conf-y', (60 + Math.random() * 60).toFixed(1) + 'px');
        piece.style.setProperty('--machi-conf-r', Math.round(180 + Math.random() * 360) + 'deg');
        piece.style.setProperty('--machi-conf-color', CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
        layer.appendChild(piece);
        (function (el) {
          setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 950);
        })(piece);
      }
    }
    function spawnConfettiAtLot(lotId) {
      var def = findLotDef(lotId);
      if (!def) return;
      spawnConfettiAtPercent(toPctW(def.x), toPctH(def.y));
    }
    function spawnConfettiAtFlowerSlot(index) {
      var slot = P.FLOWER_SLOTS[index];
      if (!slot) return;
      spawnConfettiAtPercent(toPctW(slot.x), toPctH(slot.y));
    }

    // ═══ HUD (やさい残高 / はな うえる) ═══
    function renderVeggieHud() {
      var el = document.getElementById('hud-veggie');
      var balance = L.availableVeggies(appState, harvestTotal());
      if (el) el.textContent = '🥕 ' + balance;
      var flowerBtn = document.getElementById('hud-flower-btn');
      if (flowerBtn) {
        flowerBtn.disabled = (appState.flowers >= L.FLOWER_SLOT_COUNT) || (balance < L.PART_COSTS.flower_cluster);
      }
      return balance;
    }
    function refreshEconomyUI() {
      renderVeggieHud();
      var sheet = document.getElementById('picker-sheet');
      if (sheet && sheet.classList.contains('show')) renderPickerParts();
    }

    // ═══ 実績/マイルストーン共通処理 (区画への設置・はな のいずれも
    // 「せいこうした設置」として扱う) ═══
    function registerPlacement() {
      if (window.incrementStat) {
        window.incrementStat('machi_part_placed', 1);
        if (window.checkAchievements) window.checkAchievements();
      }
      if (L.milestoneReached(appState)) {
        saveState();
        if (window.Haptics) window.Haptics.fire('superBadgePop');
        if (window.showTreasure) {
          window.showTreasure({
            name: 'ポノの まち',
            label: 'まちが いっぱいに なったよ！ つぎの まちも おたのしみに',
            onClose: function () {}
          });
        }
      }
    }

    // ═══ ピッカー (空区画タップ) ═══
    function openPicker(lotId) {
      pickerLotId = lotId;
      renderPickerParts();
      var sheet = document.getElementById('picker-sheet');
      if (sheet) sheet.classList.add('show');
    }
    function closePicker() {
      pickerLotId = null;
      var sheet = document.getElementById('picker-sheet');
      if (sheet) sheet.classList.remove('show');
    }
    function renderPickerParts() {
      var listEl = document.getElementById('picker-parts-list');
      var balanceEl = document.getElementById('picker-balance');
      var ctaEl = document.getElementById('picker-empty-cta');
      if (!listEl) return;
      var balance = L.availableVeggies(appState, harvestTotal());
      if (balanceEl) balanceEl.textContent = '🥕 ' + balance;
      listEl.innerHTML = '';
      for (var i = 0; i < P.PARTS.length; i++) {
        var part = P.PARTS[i];
        if (!part.buyable || part.repeatable) continue;
        var ownedCount = (appState.owned && appState.owned[part.id]) || 0;
        var free = ownedCount > 0;
        var cost = free ? 0 : L.PART_COSTS[part.id];
        var affordable = free || balance >= cost;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'part-btn';
        btn.disabled = !affordable;
        btn.innerHTML =
          '<span class="part-btn-icon">' + part.svg + '</span>' +
          '<span class="part-btn-name">' + part.name + '</span>' +
          '<span class="part-btn-cost">🥕 ' + cost + '</span>';
        btn.addEventListener('click', (function (p) {
          return function () { onPickPart(p); };
        })(part));
        listEl.appendChild(btn);
      }
      if (ctaEl) ctaEl.classList.toggle('show', balance <= 0);
    }
    function onPickPart(part) {
      if (!pickerLotId) return;
      var res = L.buyAndPlace(appState, pickerLotId, part.id, harvestTotal());
      if (!res.ok) return;
      saveState();
      var lotId = pickerLotId;
      closePicker();
      renderLot(lotId, { grow: true });
      spawnConfettiAtLot(lotId);
      if (window.Haptics) window.Haptics.fire('stickerPaste');
      refreshEconomyUI();
      registerPlacement();
    }

    // ═══ ポップオーバー (設置済み区画タップ) ═══
    function openPopover(lotId, partId) {
      popoverLotId = lotId;
      var part = findPart(partId);
      var popover = document.getElementById('part-popover');
      var iconEl = document.getElementById('popover-icon');
      var nameEl = document.getElementById('popover-name');
      if (iconEl) iconEl.innerHTML = part ? part.svg : '';
      if (nameEl) nameEl.textContent = part ? part.name : '';
      if (popover) {
        popover.classList.toggle('is-house', partId === HOUSE_PART_ID);
        popover.classList.add('show');
      }
    }
    function closePopover() {
      popoverLotId = null;
      var popover = document.getElementById('part-popover');
      if (popover) popover.classList.remove('show');
    }
    function onStorePart() {
      if (!popoverLotId) { closePopover(); return; }
      var res = L.storePart(appState, popoverLotId);
      var lotId = popoverLotId;
      closePopover();
      if (!res.ok) return;
      saveState();
      renderLot(lotId);
      refreshEconomyUI();
      if (window.Haptics) window.Haptics.fire('stickerPaste');
    }
    // 家(pono_house)は machizukuri 自体が tier:app のヘッドロックで既に
    // ガードされているため通常ここに到達する時点で isApp()===true のはずだが、
    // 判定不能/例外時は fail-open (= 遷移を許可) にする。 room/index.html 側も
    // 自前の同期ヘッドロックで再ガードするので直接遷移して安全 (room 側は
    // 一切編集していない)。
    function goToRoom() {
      var proceed = true;
      try {
        if (window.PonoTier && typeof window.PonoTier.isApp === 'function') {
          proceed = window.PonoTier.isApp();
        }
      } catch (e) {
        proceed = true;
      }
      if (!proceed) return;
      location.href = '../room/index.html';
    }
    function onDoorTap() {
      closePopover();
      goToRoom();
    }

    // ═══ はな うえる (道ばた repeatable micro-slot) ═══
    function onPlantFlower() {
      var res = L.plantFlower(appState, harvestTotal());
      if (!res.ok) return;
      saveState();
      renderFlowers({ growIndex: res.flowers - 1 });
      spawnConfettiAtFlowerSlot(res.flowers - 1);
      if (window.Haptics) window.Haptics.fire('stickerPaste');
      refreshEconomyUI();
      registerPlacement();
    }

    // ═══ 初回2ステップ チュートリアル (本 feature の規約により .show クラスで
    // 表示/非表示する。 hidden 属性は使わない) ═══
    var TUT_STEPS = [
      { icon: '✨', text: 'ひかっている ばしょを タップすると<br>たてものが たてられるよ！' },
      { icon: '🥕', text: 'はたけで やさいを しゅうかくすると<br>たてられる かずが ふえていくよ！' }
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
      dim.classList.add('show');
      bubble.classList.add('show');
      bubble.innerHTML = '<div class="tut-icon">' + step.icon + '</div>' + step.text +
        '<br><button type="button" class="tut-next-btn" id="tut-next">' +
        (tutStep < TUT_STEPS.length - 1 ? 'つぎへ' : 'とじる') + '</button>';
      var nextBtn = document.getElementById('tut-next');
      if (nextBtn) nextBtn.addEventListener('click', advanceTutorial);
    }
    function closeTutorial() {
      var dim = document.getElementById('tut-dim');
      var bubble = document.getElementById('tut-bubble');
      if (dim) dim.classList.remove('show');
      if (bubble) bubble.classList.remove('show');
    }
    function advanceTutorial() {
      tutStep++;
      if (tutStep >= TUT_STEPS.length) { closeTutorial(); return; }
      renderTutStep();
    }
    var tutDimEl = document.getElementById('tut-dim');
    if (tutDimEl) tutDimEl.addEventListener('click', closeTutorial);

    function startMenuOnce() {
      if (window._machiMenuInited || typeof window.initMenu !== 'function') return;
      window.initMenu({ tutorial: showTutorial });
      window._machiMenuInited = true;
    }

    // ═══ ゲームフロー: start-screen → town-screen [→ 初回チュートリアル] ═══
    function startGame() {
      var startScreen = document.getElementById('start-screen');
      var townScreen = document.getElementById('town-screen');
      if (startScreen) startScreen.classList.remove('show');
      if (townScreen) townScreen.classList.add('show');
      saveState(); // 初回シード分をこの時点で必ず永続化する (購入まで待たない)
      updateDayNightTint();
      renderVeggieHud();

      var tutSeen = false;
      try { tutSeen = localStorage.getItem(TUT_SEEN_KEY) === '1'; } catch (e) {}
      if (!tutSeen) {
        try { localStorage.setItem(TUT_SEEN_KEY, '1'); } catch (e) {}
        showTutorial();
      }
    }

    // ═══ 初期描画 (start 前でも town-screen の中身は先に組み立てておく) ═══
    var bgEl = document.getElementById('scene-bg');
    if (bgEl) bgEl.innerHTML = P.BG_SCENE;
    buildLots();
    renderAllLots();
    renderFlowers();
    renderButterflies();
    applyHouseTheme();
    updateDayNightTint();
    setInterval(updateDayNightTint, 60000);
    renderVeggieHud();

    // ═══ 操作バインド ═══
    var startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        startMenuOnce();
        startGame();
      });
    }
    var hudFlowerBtn = document.getElementById('hud-flower-btn');
    if (hudFlowerBtn) hudFlowerBtn.addEventListener('click', onPlantFlower);

    var pickerBackdrop = document.getElementById('picker-backdrop');
    if (pickerBackdrop) pickerBackdrop.addEventListener('click', closePicker);
    var pickerCloseBtn = document.getElementById('picker-close-btn');
    if (pickerCloseBtn) pickerCloseBtn.addEventListener('click', closePicker);

    var popoverBackdrop = document.getElementById('popover-backdrop');
    if (popoverBackdrop) popoverBackdrop.addEventListener('click', closePopover);
    var popoverCloseBtn = document.getElementById('popover-close-btn');
    if (popoverCloseBtn) popoverCloseBtn.addEventListener('click', closePopover);
    var popoverStoreBtn = document.getElementById('popover-store-btn');
    if (popoverStoreBtn) popoverStoreBtn.addEventListener('click', onStorePart);
    var popoverDoorBtn = document.getElementById('popover-door-btn');
    if (popoverDoorBtn) popoverDoorBtn.addEventListener('click', onDoorTap);
  }

  if (!L || !P) {
    console.error('[machizukuri] MachiLogic/MachiParts (js/logic.js, js/parts.js) が読み込まれていません。index.html 側のブート判定に処理を委ねます。');
    return;
  }
  boot();
})();
