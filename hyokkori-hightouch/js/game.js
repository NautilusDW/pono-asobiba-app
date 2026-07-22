// ── hyokkori-hightouch/js/game.js ──
// ひょっこりハイタッチ: DOM/描画/入力・ゲームループ (DOM 依存)。
// 純粋ロジック (加点/タイマー/出現カーブ/スパム対策) は js/logic.js の
// window.HyokkoriLogic を参照する。
'use strict';

(function () {
  var L = window.HyokkoriLogic;
  if (!L) { console.error('[hyokkori-hightouch] HyokkoriLogic (js/logic.js) が読み込まれていません'); return; }

  // ═══ DOM 参照 ═══
  var stageEl = document.getElementById('stage');
  var boardEl = document.getElementById('board');
  var fxCanvas = document.getElementById('fx-canvas');
  var fxCtx = fxCanvas.getContext('2d');

  // partner_*.webp 8種 (実測 512x512 正方形。 AR 厳守のため object-fit:contain の
  // 正方形の箱に必ず入れる。 絶対に stretch しない)。
  var PARTNER_IMAGES = [
    '../assets/images/puzzle/partners/partner_araiguma.webp',
    '../assets/images/puzzle/partners/partner_fukurou.webp',
    '../assets/images/puzzle/partners/partner_harinezumi.webp',
    '../assets/images/puzzle/partners/partner_karasu.webp',
    '../assets/images/puzzle/partners/partner_kitsune.webp',
    '../assets/images/puzzle/partners/partner_kojika.webp',
    '../assets/images/puzzle/partners/partner_risu.webp',
    '../assets/images/puzzle/partners/partner_usagi.webp'
  ];

  // classList を一旦外して reflow を挟んでから付け直し、CSS アニメを毎回再発火させる。
  // ms を渡すとそのミリ秒後に自動で外す (一過性エフェクト用)。
  function retriggerClass(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    if (typeof ms === 'number') setTimeout(function () { el.classList.remove(cls); }, ms);
  }

  function resizeFx() {
    var rect = stageEl.getBoundingClientRect();
    fxCanvas.width = Math.max(1, Math.round(rect.width));
    fxCanvas.height = Math.max(1, Math.round(rect.height));
  }
  resizeFx();
  window.addEventListener('resize', resizeFx);

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

  // ═══ 隠れ場所 (穴) を <template id="hh-hole-tpl"> から HOLE_COUNT 個複製生成 ═══
  // (6箇所とも同一マークアップなので index.html 側の手書き複製を避ける)
  function buildHoles() {
    var tpl = document.getElementById('hh-hole-tpl');
    if (!tpl) return; // テンプレート未読込なら何もしない (querySelectorAll側が空配列で安全に扱う)
    for (var i = 0; i < L.HOLE_COUNT; i++) {
      var node = tpl.content.firstElementChild.cloneNode(true);
      node.setAttribute('data-hole', i);
      boardEl.appendChild(node);
    }
  }
  buildHoles();

  // ═══ 隠れ場所 (穴) の DOM 参照テーブル ═══
  var holeRefs = [];
  var holeEls = boardEl.querySelectorAll('.hh-hole');
  for (var hi = 0; hi < holeEls.length; hi++) {
    var holeEl = holeEls[hi];
    holeRefs.push({
      idx: parseInt(holeEl.getAttribute('data-hole'), 10),
      hole: holeEl,
      windowEl: holeEl.querySelector('.hh-window'),
      wrap: holeEl.querySelector('.hh-char-wrap'),
      img: holeEl.querySelector('.hh-char'),
      dust: holeEl.querySelector('.hh-dust')
    });
  }

  // ═══ ゲーム状態 ═══
  var state = L.createInitialState();
  var phase = 'idle'; // idle -> countdown -> playing -> settling -> result
  var holes = []; // index合わせ: holes[i].occupant = { kind, showUntil } | null
  var recentKinds = []; // pickSpawnKind の3連続sleeping禁止用
  var spawnTimerMs = 0;
  var settleTimer = 0;
  var boardLockedUntil = 0; // OVERHEAT 演出用 (state.time 基準)

  function resetGameState() {
    state = L.createInitialState();
    holes = [];
    for (var i = 0; i < holeRefs.length; i++) {
      holes.push({ occupant: null });
      resetHoleVisual(i);
    }
    recentKinds = [];
    spawnTimerMs = 0;
    settleTimer = 0;
    boardLockedUntil = 0;
  }

  function resetHoleVisual(idx) {
    var refs = holeRefs[idx];
    if (!refs) return;
    refs.wrap.classList.remove('is-visible', 'is-sleeping', 'is-hit', 'is-wobble');
    refs.hole.classList.remove('is-locked');
  }

  // ═══ 出現・退場 ═══
  function occupiedHoleIndices() {
    var arr = [];
    for (var i = 0; i < holes.length; i++) {
      if (holes[i].occupant) arr.push(i);
    }
    return arr;
  }

  function trySpawn() {
    var occupied = occupiedHoleIndices();
    if (occupied.length >= 2) return; // 同時出現は最大2体まで
    var holeIdx = L.pickHole(occupied, Math.random);
    if (holeIdx === null) return;
    var kind = L.pickSpawnKind(state.elapsed, recentKinds, Math.random);
    recentKinds.push(kind);
    if (recentKinds.length > 6) recentKinds.shift();
    var showTime = L.showTimeAt(state.elapsed);
    var imgSrc = PARTNER_IMAGES[Math.floor(Math.random() * PARTNER_IMAGES.length)];
    holes[holeIdx].occupant = { kind: kind, showUntil: state.elapsed + showTime };
    renderSpawn(holeIdx, kind, imgSrc);
  }

  function renderSpawn(idx, kind, imgSrc) {
    var refs = holeRefs[idx];
    if (!refs) return;
    refs.img.src = imgSrc;
    refs.wrap.classList.remove('is-hit', 'is-wobble');
    refs.wrap.classList.toggle('is-sleeping', kind === 'sleeping');
    retriggerClass(refs.wrap, 'is-visible'); // translate アニメを毎回発火させる
  }

  function retractHole(idx) {
    var h = holes[idx];
    if (!h.occupant) return;
    h.occupant = null;
    var refs = holeRefs[idx];
    if (refs) refs.wrap.classList.remove('is-visible', 'is-sleeping');
  }

  function updateHoleTimeouts() {
    for (var i = 0; i < holes.length; i++) {
      var occ = holes[i].occupant;
      if (!occ) continue;
      if (state.elapsed >= occ.showUntil) {
        var wasAwake = occ.kind === 'awake';
        retractHole(i);
        if (wasAwake) L.missedAwake(state); // 取り逃しは combo リセットのみ。 減点・演出なし。
      }
    }
  }

  // ═══ 紙吹雪 (bubble/index.html の addConfetti 相当を fx-canvas 向けに簡略移植) ═══
  var confetti = [];
  function spawnConfettiBurst(x, y, count) {
    var n = count || 16;
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

  function holeCenterPoint(idx) {
    var refs = holeRefs[idx];
    var rect = refs.windowEl.getBoundingClientRect();
    var stageRect = stageEl.getBoundingClientRect();
    return { x: rect.left + rect.width / 2 - stageRect.left, y: rect.top + rect.height / 2 - stageRect.top };
  }

  // ═══ 音 (WebAudio 直接合成。 pakupaku-catch と同型の簡易トーン) ═══
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
  function playHitSound() { tone(660, 0, 0.08, 'triangle', 0.11); tone(880, 0.06, 0.1, 'triangle', 0.1); }
  function playSleepSound() { tone(220, 0, 0.16, 'sine', 0.08); }
  function playWhiffSound() { tone(180, 0, 0.08, 'sine', 0.05); }
  function playFanfare() {
    [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, i * 0.11, 0.18, 'triangle', 0.13); });
  }
  function playTick() { tone(880, 0, 0.05, 'square', 0.08); }

  // ═══ HUD ═══
  var hudTimerEl = document.getElementById('hud-timer');
  var hudScoreEl = document.getElementById('hud-score');
  var lastTickSecond = -1;

  function updateHud() {
    var remaining = Math.max(0, Math.ceil(L.GAME_DURATION - state.elapsed));
    if (hudTimerEl) {
      hudTimerEl.textContent = '⏱ ' + remaining;
      hudTimerEl.classList.toggle('hud-low', remaining <= 10);
    }
    if (hudScoreEl) hudScoreEl.textContent = '🖐️ ' + state.score;
    if (remaining <= 5 && remaining >= 1 && remaining !== lastTickSecond && phase === 'playing') {
      lastTickSecond = remaining;
      playTick();
    }
  }

  // ═══ OVERHEAT 演出 (責めない演出) ═══
  var overheatBannerEl = document.getElementById('overheat-banner');
  function triggerOverheatBanner() {
    retriggerClass(overheatBannerEl, 'show');
  }

  function updateBoardLockVisual() {
    var locked = state.time < boardLockedUntil;
    for (var i = 0; i < holeRefs.length; i++) {
      holeRefs[i].hole.classList.toggle('is-locked', locked);
    }
  }

  // ═══ タップ判定処理 ═══
  function resolveHoleFromPoint(clientX, clientY) {
    var el = document.elementFromPoint(clientX, clientY);
    if (!el || typeof el.closest !== 'function') return null;
    var holeEl = el.closest('.hh-hole');
    if (!holeEl) return null;
    var idx = parseInt(holeEl.getAttribute('data-hole'), 10);
    return isNaN(idx) ? null : idx;
  }

  function handleTapAt(clientX, clientY) {
    if (phase !== 'playing') return;
    var idx = resolveHoleFromPoint(clientX, clientY);
    var target = 'empty';
    if (idx !== null && holes[idx] && holes[idx].occupant) {
      target = holes[idx].occupant.kind;
    }
    var res = L.registerTap(state, state.time, target);
    applyTapResult(res, idx);
    updateHud();
  }

  function applyTapResult(res, idx) {
    switch (res.result) {
      case 'hit': {
        var pt = idx !== null ? holeCenterPoint(idx) : { x: fxCanvas.width / 2, y: fxCanvas.height / 2 };
        var refs = idx !== null ? holeRefs[idx] : null;
        if (refs) retriggerClass(refs.wrap, 'is-hit', 320);
        if (idx !== null) retractHole(idx);
        spawnConfettiBurst(pt.x, pt.y, 18);
        if (window.Haptics) window.Haptics.fire('stickerPaste');
        if (window.incrementStat) window.incrementStat('hyokkori_touches', 1);
        playHitSound();
        break;
      }
      case 'sleepPenalty': {
        var refsS = idx !== null ? holeRefs[idx] : null;
        if (refsS) retriggerClass(refsS.wrap, 'is-wobble', 900);
        if (window.Haptics) window.Haptics.fire('gachaTurn3');
        playSleepSound();
        break;
      }
      case 'whiff': {
        if (idx !== null) retriggerClass(holeRefs[idx].dust, 'is-active', 420);
        playWhiffSound();
        break;
      }
      case 'overheat': {
        boardLockedUntil = state.time + L.OVERHEAT_LOCK;
        triggerOverheatBanner();
        if (window.Haptics) window.Haptics.fire('capsuleCrack');
        break;
      }
      case 'locked':
      case 'finished':
      default:
        break;
    }
  }

  // ═══ 入力: iOS pointercancel 対策 (touchstart/touchend/touchcancel を必ず併用) ═══
  // memory: feedback_ios_pointercancel_native_pan — pointerdown/up だけで
  // 「指が接地中」を追跡しない。 タッチ/マウスの二重発火防止は各 pointer リスナーの
  // e.pointerType !== 'mouse' 判定で行う。
  stageEl.addEventListener('touchstart', function (e) {
    var t = e.changedTouches[0];
    if (!t) return;
    ensureAudio();
    var el = document.elementFromPoint(t.clientX, t.clientY);
    var holeEl = el && el.closest ? el.closest('.hh-hole') : null;
    if (holeEl) holeEl.classList.add('is-pressed');
    handleTapAt(t.clientX, t.clientY);
  }, { passive: true });

  function releasePressedHoles() {
    var pressed = boardEl.querySelectorAll('.hh-hole.is-pressed');
    for (var i = 0; i < pressed.length; i++) pressed[i].classList.remove('is-pressed');
  }
  stageEl.addEventListener('touchend', releasePressedHoles, { passive: true });
  stageEl.addEventListener('touchcancel', releasePressedHoles, { passive: true });

  // マウス用 (pointer系はマウスのみ処理し、タッチとの二重発火を防ぐ)
  stageEl.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;
    ensureAudio();
    handleTapAt(e.clientX, e.clientY);
  });

  // ═══ チュートリアル ═══
  var TUT_STEPS = [
    { icon: '🖐️', text: 'おきてる こが ひょっこり でてきたら<br>すぐに タップして ハイタッチしよう！' },
    { icon: '😴', text: 'ねてる こ (💤 の こ) は そっとしておいてね。<br>タップすると びっくりさせちゃうよ' }
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

  // ═══ ゲームフロー: start → countdown → playing → settling → result ═══
  function beginCountdown() {
    phase = 'countdown';
    var cdScreen = document.getElementById('countdown-screen');
    var cdText = document.getElementById('cd-text');
    if (cdScreen) cdScreen.classList.add('show');
    if (cdText) cdText.textContent = 'よーい…';
    setTimeout(function () { if (cdText) cdText.textContent = 'すたーと！'; }, 600);
    setTimeout(function () {
      if (cdScreen) cdScreen.classList.remove('show');
      phase = 'playing';
      window._achDeferPopups = true;
      lastTs = null;
    }, 1200);
  }

  function finishGame() {
    phase = 'result';
    if (window.incrementStat) window.incrementStat('hyokkori_games', 1);
    if (window.setStatMax) window.setStatMax('hyokkori_best_combo', state.bestCombo);
    if (window.flushAchievementPopups) window.flushAchievementPopups();
    window._achDeferPopups = false;
    showResult();
  }

  function showResult() {
    var scoreEl = document.getElementById('result-score');
    if (scoreEl) scoreEl.textContent = state.score + ' てん';
    var rank = window.saveHighScore ? window.saveHighScore('hyokkori-hightouch', state.score) : 0;
    var newEl = document.getElementById('result-new');
    if (rank >= 1) {
      if (newEl) newEl.classList.remove('hidden');
      spawnConfettiBurst(fxCanvas.width / 2, fxCanvas.height * 0.25, rank === 1 ? 50 : 22);
      if (window.Haptics) window.Haptics.fire('superBadgePop');
      playFanfare();
      setTimeout(function () {
        if (window.showHighScoreTable) window.showHighScoreTable('hyokkori-hightouch', '🖐️ ひょっこりハイタッチ ハイスコア');
      }, 900);
    } else {
      if (newEl) newEl.classList.add('hidden');
      playFanfare();
    }
    var overlay = document.getElementById('result-overlay');
    if (overlay) overlay.classList.add('show');
  }

  function startMenuOnce() {
    if (window._menuInited || typeof window.initMenu !== 'function') return;
    window.initMenu({
      tutorial: showTutorial,
      extraButtons: [{
        icon: '🏆',
        label: 'ハイスコア',
        onClick: function () { if (window.showHighScoreTable) window.showHighScoreTable('hyokkori-hightouch', '🖐️ ひょっこりハイタッチ ハイスコア'); }
      }]
    });
    window._menuInited = true;
  }

  var startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      ensureAudio();
      var startScreen = document.getElementById('start-screen');
      if (startScreen) startScreen.style.display = 'none';
      startMenuOnce();
      resetGameState();
      updateHud();
      beginCountdown();
    });
  }

  var retryBtn = document.getElementById('retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var overlay = document.getElementById('result-overlay');
      if (overlay) overlay.classList.remove('show');
      resetGameState();
      updateHud();
      beginCountdown();
    });
  }

  resetGameState();
  updateHud();

  // ═══ メインループ ═══
  var lastTs = null;
  function loop(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = (ts - lastTs) / 1000;
    if (dt > 0.05) dt = 0.05; // タブ切替復帰時などの大ジャンプを吸収
    lastTs = ts;

    if (phase === 'playing' || phase === 'settling') {
      // state.time (壁時計) は settling 中も進める (pakupaku-catch と同型)。
      L.tickTimer(state, dt);
      if (phase === 'playing') {
        if (state.finished) {
          phase = 'settling';
          settleTimer = 0;
        } else {
          spawnTimerMs += dt * 1000;
          var interval = L.spawnIntervalAt(state.elapsed);
          if (spawnTimerMs >= interval) {
            spawnTimerMs = 0;
            trySpawn();
          }
        }
      } else {
        settleTimer += dt;
      }

      updateHoleTimeouts();
      updateBoardLockVisual();
      updateHud();

      if (phase === 'settling' && (occupiedHoleIndices().length === 0 || settleTimer >= 2)) {
        finishGame();
      }
    }

    updateAndDrawConfetti(dt);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
