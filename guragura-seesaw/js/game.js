// ── guragura-seesaw/js/game.js ──
// ぐらぐらシーソーひろば: DOM/描画/入力・ゲームループ (DOM 依存)。
// 純粋ロジック (傾き計算/釣り合い判定/滑り落ち判定/バネ振動/セッション進行) は
// js/logic.js の window.GuraguraLogic を参照する。
'use strict';

(function () {

  // ═══ 読み込み失敗フォールバック ═══
  // logic.js のロード失敗時、game.js 全初期化が無言スキップされ
  // 「タイトルは見えるがタップ無反応」になる事故 (2026-07-22 報告) の再発防止。
  function showLoadError() {
    if (document.getElementById('loadErrorScreen')) return;
    var ov = document.createElement('div');
    ov.id = 'loadErrorScreen';
    ov.setAttribute('role', 'alert');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;background:rgba(42,74,94,0.96);color:#fff;font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN",sans-serif;text-align:center';
    var msg = document.createElement('div');
    msg.style.cssText = 'font-size:1.05rem;font-weight:900;line-height:1.6';
    msg.innerHTML = 'よみこみが うまくいかなかったよ<br>もういちど ためしてね';
    ov.appendChild(msg);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '🔄 もういちど よみこむ';
    btn.style.cssText = 'padding:12px 32px;border:none;border-radius:50px;background:linear-gradient(135deg,#60A5FA,#3B82F6);color:#fff;font-size:1rem;font-weight:900;font-family:inherit;cursor:pointer';
    btn.addEventListener('pointerdown', function () { location.reload(); });
    ov.appendChild(btn);
    document.body.appendChild(ov);
    // FOUC ガードで #app が visibility:hidden のままでもオーバーレイは body 直下なので見える。
    // ただし pono-game-ready が未付与だと背景だけ #2a4a5e になるため付与しておく。
    document.body.classList.add('pono-game-ready');
  }

  var TUT_SEEN_KEY = 'pono_guragura_tut_seen_v1'; // 初回自動チュートリアル既読フラグ (hatake-nikki/js/game.js のパターン踏襲)

  function boot() {
  var L = window.GuraguraLogic;

  // ═══ 画像パス (game.js のみが知っている。logic.js は数値/ラベルのみ持つ) ═══
  // 将来の本番アート差し替えはこのマップの張り替えのみで済む (logic.js 不変)。
  var ITEM_IMAGES = {
    cherry: '../assets/images/ocean/Cherry/Cherry_normal_1.png',
    blueberry: '../assets/images/ocean/Blueberry/Blueberry_normal_1.png',
    apple: '../assets/images/ocean/Apple/Apple_normal_1.png',
    lemon: '../assets/images/ocean/Lemon/Lemon_normal_1.png',
    frog: '../assets/images/ocean/Frog/Frog_normal_1.png',
    grapes: '../assets/images/ocean/Grapes/Grapes_normal_1.png',
    cat: '../assets/images/ocean/Cat/Cat_normal_1.png',
    carrot: '../assets/images/ocean/Carrot/Carrot_normal_1.png',
    dog: '../assets/images/ocean/Dog/Dog_normal_1.png',
    corn: '../assets/images/ocean/Corn/Corn_normal_1.png',
    bear: '../assets/images/ocean/Bear/Bear_normal_1.png',
    elephant: '../assets/images/ocean/Elephant/Elephant_normal_1.png'
  };

  // ═══ DOM 参照 ═══
  var stageEl = document.getElementById('stage');
  var plankEl = document.getElementById('plank');
  var panLeftItemsEl = document.getElementById('panLeftItems');
  var panRightItemsEl = document.getElementById('panRightItems');
  var panRightEl = document.getElementById('panRight');
  var trayEl = document.getElementById('tray');
  var balanceBannerEl = document.getElementById('balanceBanner');
  var slipBubbleEl = document.getElementById('slipBubble');
  var fxCanvas = document.getElementById('fx-canvas');
  var fxCtx = fxCanvas.getContext('2d');
  var ghostEl = null; // ドラッグ中のゴースト (#stage 直下 absolute で指に追従)

  // classList を一旦外して reflow を挟んでから付け直し、CSS アニメを毎回再発火させる。
  function retriggerClass(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    if (typeof ms === 'number') setTimeout(function () { el.classList.remove(cls); }, ms);
  }

  // ═══ #stage 実測サイズを --stage-h / --stage-w として documentElement に反映 ═══
  // アイテム箱の s/m/l サイズ (stage 高の 9/12/15%) が常に stage の実サイズに追従する。
  function updateStageVars() {
    var rect = stageEl.getBoundingClientRect();
    document.documentElement.style.setProperty('--stage-h', rect.height + 'px');
    document.documentElement.style.setProperty('--stage-w', rect.width + 'px');
    fxCanvas.width = Math.max(1, Math.round(rect.width));
    fxCanvas.height = Math.max(1, Math.round(rect.height));
  }
  updateStageVars();
  window.addEventListener('resize', updateStageVars);

  function updateLandscapeNotice() {
    var notice = document.getElementById('landscape-notice');
    if (!notice) return;
    var isPortrait = window.innerHeight >= window.innerWidth;
    var isTouch = matchMedia('(pointer: coarse)').matches;
    var show = isPortrait && isTouch;
    notice.style.display = show ? 'flex' : 'none';
    notice.setAttribute('aria-hidden', show ? 'false' : 'true');
  }
  updateLandscapeNotice();
  window.addEventListener('orientationchange', function () {
    setTimeout(updateLandscapeNotice, 100);
    setTimeout(updateLandscapeNotice, 500);
  });
  window.addEventListener('resize', updateLandscapeNotice);

  // ═══ 画面遷移 (.show クラス方式。 hidden 属性は一切使わない) ═══
  var SCREEN_IDS = ['titleScreen', 'playScreen', 'resultScreen'];
  function showScreen(id) {
    for (var i = 0; i < SCREEN_IDS.length; i++) {
      var el = document.getElementById(SCREEN_IDS[i]);
      if (el) el.classList.toggle('show', SCREEN_IDS[i] === id);
    }
  }

  // ═══ ゲーム状態 ═══
  var phase = 'idle'; // idle -> playing -> result
  var session = null; // { round, finished, leftIds, rightIds, trayIds }
  var sim = { angle: 0, vel: 0 };
  var balanceHoldStart = null; // isBalanced&&isSettled が連続成立し始めた ms タイムスタンプ
  var roundClearing = false;   // 演出中の二重発火防止
  var dragState = null;        // { itemId, source: 'tray'|'pan', el }

  // ═══ ラウンド進捗ドット ═══
  var dotEls = [];
  (function collectDots() {
    var nodes = document.querySelectorAll('#roundDots .round-dot');
    for (var i = 0; i < nodes.length; i++) dotEls.push(nodes[i]);
  })();
  function renderRoundDots() {
    var current = session ? session.round : 0;
    var finished = !!(session && session.finished);
    for (var i = 0; i < dotEls.length; i++) {
      dotEls[i].classList.toggle('is-done', finished || i < current);
      dotEls[i].classList.toggle('is-current', !finished && i === current);
    }
  }

  // ═══ アイテム箱 生成 ═══
  function createItemBoxEl(itemId, source) {
    var item = L.getItem(itemId);
    var el = document.createElement('div');
    el.className = 'item-box size-' + (item ? item.sizeClass : 'm');
    el.dataset.itemId = itemId;
    el.dataset.source = source;
    var img = document.createElement('img');
    img.src = ITEM_IMAGES[itemId] || '';
    img.alt = item ? item.label : '';
    img.draggable = false;
    el.appendChild(img);
    if (source !== 'left') attachDragHandlers(el, itemId, source);
    return el;
  }

  function renderPan(side, ids) {
    var container = side === 'left' ? panLeftItemsEl : panRightItemsEl;
    container.innerHTML = '';
    for (var i = 0; i < ids.length; i++) {
      container.appendChild(createItemBoxEl(ids[i], side === 'left' ? 'left' : 'pan'));
    }
  }

  function renderTray(ids) {
    trayEl.innerHTML = '';
    for (var i = 0; i < ids.length; i++) {
      trayEl.appendChild(createItemBoxEl(ids[i], 'tray'));
    }
  }

  function renderAll() {
    if (!session) return;
    renderRoundDots();
    renderPan('left', session.leftIds);
    renderPan('right', session.rightIds);
    renderTray(session.trayIds);
  }

  // ═══ ドラッグ入力 (iOS 実機事故対策必須) ═══
  // memory: feedback_ios_pointercancel_native_pan — pointerdown/up だけで
  // 「指が接地中」を追跡しない。 touchstart/touchmove/touchend/touchcancel を必ず使う。
  // pointer 系はマウス専用 (e.pointerType !== 'mouse' で early return)。
  function ensureGhost() {
    if (ghostEl) return ghostEl;
    ghostEl = document.createElement('div');
    ghostEl.id = 'dragGhost';
    var img = document.createElement('img');
    ghostEl.appendChild(img);
    stageEl.appendChild(ghostEl);
    return ghostEl;
  }

  function showGhost(itemId, x, y) {
    var el = ensureGhost();
    var item = L.getItem(itemId);
    el.className = 'item-box size-' + (item ? item.sizeClass : 'm') + ' is-active';
    el.id = 'dragGhost';
    el.querySelector('img').src = ITEM_IMAGES[itemId] || '';
    moveGhost(x, y);
  }

  function moveGhost(x, y) {
    if (!ghostEl) return;
    var stageRect = stageEl.getBoundingClientRect();
    var w = ghostEl.getBoundingClientRect().width || 0;
    var h = ghostEl.getBoundingClientRect().height || 0;
    ghostEl.style.left = (x - stageRect.left - w / 2) + 'px';
    ghostEl.style.top = (y - stageRect.top - h / 2) + 'px';
  }

  function hideGhost() {
    if (ghostEl) ghostEl.classList.remove('is-active');
  }

  // ═══ 無操作ヒント: ラウンド開始から6秒間ドラッグが無ければ指アイコンを表示 ═══
  var dragHintEl = null;
  var dragHintTimer = null;
  function ensureDragHint() {
    if (dragHintEl) return dragHintEl;
    dragHintEl = document.createElement('div');
    dragHintEl.id = 'dragHint';
    dragHintEl.className = 'hidden';
    dragHintEl.setAttribute('aria-hidden', 'true');
    dragHintEl.textContent = '👉';
    stageEl.appendChild(dragHintEl);
    return dragHintEl;
  }
  function scheduleDragHint() {
    clearDragHintTimer();
    dragHintTimer = setTimeout(function () {
      var el = ensureDragHint();
      el.classList.remove('hidden');
    }, 6000);
  }
  function clearDragHintTimer() {
    if (dragHintTimer) { clearTimeout(dragHintTimer); dragHintTimer = null; }
    if (dragHintEl) dragHintEl.classList.add('hidden');
  }

  function pointOverPanRight(x, y) {
    var rect = panRightEl.getBoundingClientRect();
    var margin = 20;
    return x >= rect.left - margin && x <= rect.right + margin &&
      y >= rect.top - margin && y <= rect.bottom + margin;
  }

  function beginDrag(itemId, source, el, x, y) {
    if (phase !== 'playing') return;
    if (dragState) return; // 同時多指ドラッグは無視 (1本目を優先)
    ensureAudio();
    dragState = { itemId: itemId, source: source, el: el };
    el.classList.add('is-dragging');
    balanceHoldStart = null; // ドラッグ操作中は釣り合い判定を停止
    showGhost(itemId, x, y);
    if (panRightEl) panRightEl.classList.add('is-drop-target');
    clearDragHintTimer();
  }

  function attachDragHandlers(el, itemId, source) {
    el.addEventListener('touchstart', function (e) {
      var t = e.changedTouches[0];
      if (!t) return;
      beginDrag(itemId, source, el, t.clientX, t.clientY);
    }, { passive: true });
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      beginDrag(itemId, source, el, e.clientX, e.clientY);
    });
  }

  function endDrag(x, y, cancelled) {
    var ds = dragState;
    if (!ds) return;
    dragState = null;
    hideGhost();
    if (ds.el) ds.el.classList.remove('is-dragging');
    if (panRightEl) panRightEl.classList.remove('is-drop-target');
    scheduleDragHint();

    if (cancelled) return; // 元の位置に戻すだけ (state 変化なし)

    var overPan = pointOverPanRight(x, y);

    if (ds.source === 'tray') {
      if (!overPan) return; // トレイ外へのドロップはトレイへスッと戻す (演出は控えめ、罰なし)
      var stateSnapshot = { leftIds: session.leftIds, rightIds: session.rightIds, trayIds: session.trayIds };
      var res = L.placeItem(stateSnapshot, ds.itemId);
      if (res.ok) {
        session.leftIds = res.state.leftIds;
        session.rightIds = res.state.rightIds;
        session.trayIds = res.state.trayIds;
        if (window.Haptics) window.Haptics.fire('stickerPaste');
        playPlaceSound();
        renderAll();
        var placedEl = panRightItemsEl.querySelector('[data-item-id="' + ds.itemId + '"]');
        if (placedEl) retriggerClass(placedEl, 'is-placed', 300);
      } else if (res.reason === 'slip') {
        // 滑り落ち演出: 罰にしない。「わっ」と弾んでトレイに戻る (減点・失敗音・NG表示なし)。
        retriggerClass(ds.el, 'is-slip', 500);
        showBubble(slipBubbleEl, 'おもすぎたみたい！');
        if (window.Haptics) window.Haptics.fire('gachaTurn3');
        playSlipSound();
      }
      // reason === 'full' / 'notfound': 静かに元の位置へ (演出なし)
    } else if (ds.source === 'pan') {
      if (overPan) return; // 皿へ戻された (タップ相当) は no-op
      var stateSnapshot2 = { leftIds: session.leftIds, rightIds: session.rightIds, trayIds: session.trayIds };
      var next = L.removeItem(stateSnapshot2, ds.itemId);
      session.leftIds = next.leftIds;
      session.rightIds = next.rightIds;
      session.trayIds = next.trayIds;
      renderAll();
    }
  }

  stageEl.addEventListener('touchmove', function (e) {
    if (!dragState) return;
    var t = e.changedTouches[0];
    if (!t) return;
    moveGhost(t.clientX, t.clientY);
  }, { passive: true });
  stageEl.addEventListener('touchend', function (e) {
    if (!dragState) return;
    var t = e.changedTouches[0];
    endDrag(t ? t.clientX : 0, t ? t.clientY : 0, false);
  }, { passive: true });
  stageEl.addEventListener('touchcancel', function () {
    if (!dragState) return;
    endDrag(0, 0, true);
  }, { passive: true });

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    if (!dragState) return;
    moveGhost(e.clientX, e.clientY);
  });
  window.addEventListener('pointerup', function (e) {
    if (e.pointerType !== 'mouse') return;
    if (!dragState) return;
    endDrag(e.clientX, e.clientY, false);
  });

  // ═══ 音 (WebAudio 直接合成。 hyokkori-hightouch と同型の簡易トーン) ═══
  var audioCtx = null;
  function ensureAudio() {
    if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume(); return; }
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) audioCtx = new Ctor();
    } catch (e) {}
  }
  function tone(freq, startOffset, dur, type, gainVal) {
    if (!audioCtx) return;
    try {
      var t0 = audioCtx.currentTime + (startOffset || 0);
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(gainVal || 0.12, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) {}
  }
  function playPlaceSound() { tone(520, 0, 0.09, 'triangle', 0.11); }
  function playSlipSound() { tone(260, 0, 0.14, 'sine', 0.09); tone(180, 0.05, 0.12, 'sine', 0.07); }
  function playFanfare() {
    [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, i * 0.11, 0.18, 'triangle', 0.13); });
  }

  // ═══ 紙吹雪 (hyokkori-hightouch/js/game.js の spawnConfettiBurst を移植) ═══
  var confetti = [];
  function spawnConfettiBurst(x, y, count) {
    var n = count || 24;
    var colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff9f45'];
    for (var i = 0; i < n; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 100 + Math.random() * 220;
      confetti.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 160,
        rot: Math.random() * Math.PI * 2, rotSpd: (Math.random() - 0.5) * 6,
        life: 1, size: 5 + Math.random() * 5, color: colors[i % colors.length]
      });
    }
  }

  function updateAndDrawConfetti(dt) {
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    if (confetti.length === 0) return;
    for (var i = confetti.length - 1; i >= 0; i--) {
      var c = confetti[i];
      c.vy += 340 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.rotSpd * dt;
      c.life -= dt * 0.6;
      if (c.life <= 0 || c.y > fxCanvas.height + 40) { confetti.splice(i, 1); continue; }
      fxCtx.save();
      fxCtx.globalAlpha = Math.max(0, c.life);
      fxCtx.translate(c.x, c.y);
      fxCtx.rotate(c.rot);
      fxCtx.fillStyle = c.color;
      fxCtx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
      fxCtx.restore();
    }
    fxCtx.globalAlpha = 1;
  }

  function stageCenterPoint() {
    return { x: fxCanvas.width / 2, y: fxCanvas.height * 0.4 };
  }

  // ═══ バナー/ふきだし ═══
  function showBubble(el, text) {
    if (!el) return;
    el.textContent = text;
    retriggerClass(el, 'show', 1500);
  }

  // ═══ チュートリアル (hyokkori-hightouch の tut-dim/tut-bubble パターンを流用) ═══
  var TUT_STEPS = [
    { icon: '⚖️', text: 'ひだりの おさらと おなじ おもさに<br>なるように つりあわせるよ！' },
    { icon: '👉', text: 'したの トレイから のせものを<br><b>みぎの おさら</b>まで ゆびで うごかしてね' },
    { icon: '😲', text: 'おもすぎたら「わっ」と はねかえるよ。<br>べつの のせものを ためして だいじょうぶ！' }
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
    dim.classList.remove('hidden');
    bubble.classList.remove('hidden');
    bubble.innerHTML = '<div class="tut-icon">' + step.icon + '</div>' + step.text +
      '<br><button class="tut-next-btn" id="tut-next">' + (tutStep < TUT_STEPS.length - 1 ? 'つぎへ' : 'とじる') + '</button>';
    document.getElementById('tut-next').addEventListener('pointerdown', onTutNext);
  }
  function closeTutorial() {
    var dim = document.getElementById('tut-dim');
    var bubble = document.getElementById('tut-bubble');
    if (dim) dim.classList.add('hidden');
    if (bubble) bubble.classList.add('hidden');
  }
  function onTutNext(e) {
    e.preventDefault();
    e.stopPropagation();
    tutStep++;
    if (tutStep >= TUT_STEPS.length) { closeTutorial(); return; }
    renderTutStep();
  }
  var tutDimEl = document.getElementById('tut-dim');
  if (tutDimEl) tutDimEl.addEventListener('pointerdown', closeTutorial);

  // ═══ ゲームフロー: title → playing(5ラウンド) → result ═══
  function startGame() {
    session = L.createSession();
    sim = { angle: 0, vel: 0 };
    balanceHoldStart = null;
    roundClearing = false;
    renderAll();
    phase = 'playing';
    window._achDeferPopups = true;
    showScreen('playScreen');
    scheduleDragHint();

    var tutSeen = false;
    try { tutSeen = localStorage.getItem(TUT_SEEN_KEY) === '1'; } catch (e) {}
    if (!tutSeen) {
      try { localStorage.setItem(TUT_SEEN_KEY, '1'); } catch (e) {}
      showTutorial();
    }
  }

  function onRoundBalanced() {
    if (window.Haptics) window.Haptics.fire('superBadgePop');
    if (window.incrementStat) window.incrementStat('guragura_balances', 1);
    var pt = stageCenterPoint();
    spawnConfettiBurst(pt.x, pt.y, 26);
    playFanfare();
    showBubble(balanceBannerEl, 'つりあった！');
    setTimeout(function () {
      roundClearing = false;
      balanceHoldStart = null;
      session = L.advanceRound(session);
      if (session.finished) {
        finishGame();
      } else {
        sim = { angle: 0, vel: 0 };
        renderAll();
        scheduleDragHint();
      }
    }, 1600);
  }

  function showResultUI() {
    renderRoundDots();
    showScreen('resultScreen');
  }

  function finishGame() {
    phase = 'result';
    clearDragHintTimer();
    if (window.incrementStat) window.incrementStat('guragura_games', 1);
    if (window.flushAchievementPopups) window.flushAchievementPopups();
    window._achDeferPopups = false;
    if (window.showTreasure) {
      window.showTreasure({
        name: 'つりあいめいじん',
        img: ITEM_IMAGES.bear,
        label: 'ぜんぶ つりあわせられたよ！',
        onClose: showResultUI
      });
    } else {
      showResultUI();
    }
  }

  function startMenuOnce() {
    if (window._menuInited || typeof window.initMenu !== 'function') return;
    window.initMenu({ tutorial: showTutorial });
    window._menuInited = true;
  }

  var startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      ensureAudio();
      startMenuOnce();
      startGame();
    });
  }

  var retryBtn = document.getElementById('retryBtn');
  if (retryBtn) {
    retryBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      startGame();
    });
  }

  // ═══ debug: Playwright 用に最終ラウンド達成状態まで即座に進める ═══
  // debug-mode.js が有効 (staging/localhost + セッション解錠済み) の時だけ公開する。
  if (window.PonoDebugMode && typeof window.PonoDebugMode.isAllowed === 'function' && window.PonoDebugMode.isAllowed()) {
    window.__guraguraDebugFinish = function () {
      if (!session) startGame();
      session.round = L.ROUNDS.length - 1;
      session.finished = true;
      finishGame();
    };
  }

  // ═══ メインループ ═══
  var lastTs = null;
  function loop(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = (ts - lastTs) / 1000;
    if (dt > 0.05) dt = 0.05; // タブ切替復帰時などの大ジャンプを吸収
    lastTs = ts;

    if (phase === 'playing' && session) {
      var leftWeight = L.sumWeights(session.leftIds);
      var rightWeight = L.sumWeights(session.rightIds);
      var target = L.computeTilt(leftWeight, rightWeight);
      sim = L.springStep(sim, target, dt);
      if (plankEl) {
        plankEl.style.setProperty('--tilt', sim.angle + 'deg');
        plankEl.style.transform = 'rotate(' + sim.angle + 'deg)';
      }

      if (dragState) {
        balanceHoldStart = null;
      } else {
        var balancedNow = L.isBalanced(leftWeight, rightWeight) && L.isSettled(sim, target);
        if (balancedNow && !roundClearing) {
          var nowMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
          if (balanceHoldStart === null) balanceHoldStart = nowMs;
          if (nowMs - balanceHoldStart >= 600) {
            roundClearing = true;
            onRoundBalanced();
          }
        } else if (!balancedNow) {
          balanceHoldStart = null;
        }
      }
    }

    updateAndDrawConfetti(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  }

  // ═══ ブート判定: logic.js 正常時は即起動、失敗時はキャッシュバイパスで1回だけ再試行 ═══
  if (window.GuraguraLogic) { boot(); return; }
  console.error('[guragura-seesaw] GuraguraLogic (js/logic.js) が読み込まれていません — キャッシュバイパスで再試行します');
  var retryScript = document.createElement('script');
  retryScript.src = 'js/logic.js?retry=' + Date.now(); // ?retry= で HTTP キャッシュを確実にバイパス
  retryScript.onload = function () {
    if (window.GuraguraLogic) { boot(); } else { showLoadError(); }
  };
  retryScript.onerror = function () { showLoadError(); };
  document.body.appendChild(retryScript);
})();
