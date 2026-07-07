(function () {
  'use strict';

  // ============================================================
  // もじもじクレーン 2.0 「つみつみ もじタワー」
  // Physics-driven letter-block stacking (Matter.js, vendored locally
  // at js/vendor/matter.min.js — no CDN / runtime network dependency).
  //
  // Replaces the old scripted 7-phase auto-claw with direct one-finger
  // grab/carry/release on real physics bodies. Kana blocks are all-OBB
  // chamfered rounded rects (no concave silhouettes / no build-time
  // decomposition pipeline) with a pre-rasterized glyph drawn on top.
  //
  // Narration: reuses the existing common/narration.js pipeline only
  // (Narration.play(key) no-ops silently until manifest entries exist).
  // No new TTS audio is generated here — see TODO near NARR_KEYS below.
  // fal-ai / fal.ai is never used for audio in this project.
  // ============================================================

  var M = window.Matter;
  var Engine = M.Engine, World = M.World, Bodies = M.Bodies, Body = M.Body,
    Composite = M.Composite, Constraint = M.Constraint, Query = M.Query,
    Vector = M.Vector, Sleeping = M.Sleeping;

  var W = 960;
  var H = 540;
  var FLOOR_Y = 504; // top surface of the floor (kept from v1 layout)
  var STORAGE_KEY = 'pono_mojicrane_v1';
  var FONT = '"Zen Maru Gothic","Hiragino Maru Gothic ProN","Yu Gothic",sans-serif';
  var KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ';

  var BLOCK_SIZE = 92;
  var BLOCK_CHAMFER = 10;

  // ---- level knobs (spec: easy wide / normal mid / challenge narrow) ----
  // Easy mode's gentleness comes from: a wide pedestal (300px), fewer decoys/
  // junk, only 2 kana required, and effectively-infinite grip slip forgiveness
  // (slip/junkSlip: 999, read as Infinity budget in updateGrab) — an edge grab
  // never breaks. There is no separate placement-snapping assist; a
  // previously-declared `snapAssist` flag here was never read anywhere and
  // has been removed rather than ship a config knob that does nothing.
  var LEVELS = {
    easy: {
      label: 'やさしい', rounds: 3, kanaHint: '2もじ',
      pedestalWidth: 300, decoys: 3, junk: 0, maxKana: 2,
      slip: 999, junkSlip: 999, windGust: false
    },
    normal: {
      label: 'ふつう', rounds: 4, kanaHint: '3もじ',
      pedestalWidth: 220, decoys: 5, junk: 1, maxKana: 3,
      slip: 28, junkSlip: 36, windGust: false
    },
    challenge: {
      label: 'チャレンジ', rounds: 5, kanaHint: '4もじ',
      pedestalWidth: 150, decoys: 7, junk: 2, maxKana: 5,
      slip: 24, junkSlip: 32, windGust: true
    }
  };

  // junk shapes: all-OBB per spec (rounded rect or circle, no concave shapes)
  var JUNK_SHAPES = {
    wide: { kind: 'rect', w: 150, h: 66, hue: 206 },
    round: { kind: 'circle', r: 44, hue: 36 },
    stub: { kind: 'rect', w: 108, h: 58, hue: 154 }
  };
  var JUNK_KEYS = ['wide', 'round', 'stub'];

  // Narration keys (3rd-person female narrator style only, per project
  // voice policy). TODO: these keys are NOT yet in assets/tts/manifest.json.
  // Narration.play() no-ops silently until they are recorded via the
  // existing Gemini "Leda" pipeline (common/narration.js) and verified
  // with faster-whisper transcription — do NOT synthesize ad-hoc audio.
  var NARR = {
    tut1: 'mojicrane:tut:1',
    tut2: 'mojicrane:tut:2',
    tut3: 'mojicrane:tut:3',
    tut4: 'mojicrane:tut:4',
    tut5: 'mojicrane:tut:5',
    tut6: 'mojicrane:tut:6',
    grabCenter: 'mojicrane:grab:center',
    balanceWobble: 'mojicrane:balance:wobble',
    topple1: 'mojicrane:topple:1',
    topple2: 'mojicrane:topple:2',
    wordDone: 'mojicrane:word:done'
  };
  function narrate(key) {
    try {
      if (window.Narration && typeof window.Narration.play === 'function') window.Narration.play(key);
    } catch (err) { /* silent — narration is optional */ }
  }

  // ---- DOM refs (unchanged ids from v1 so play.html / capture / CSS keep working) ----
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var titleOverlay = document.getElementById('titleOverlay');
  var confirmOverlay = document.getElementById('confirmOverlay');
  var resultOverlay = document.getElementById('resultOverlay');
  var tutorialOverlay = document.getElementById('tutorialOverlay');
  var dropBtn = document.getElementById('dropBtn');
  var homeBtn = document.getElementById('homeBtn');
  var soundBtn = document.getElementById('soundBtn');
  var hintBtn = document.getElementById('hintBtn');
  var continueBtn = document.getElementById('continueBtn');
  var againBtn = document.getElementById('againBtn');
  var levelsBtn = document.getElementById('levelsBtn');
  var resultTitle = document.getElementById('resultTitle');
  var resultStars = document.getElementById('resultStars');
  var wordCards = document.getElementById('wordCards');
  var liveRegion = document.getElementById('liveRegion');
  var tutorialNextBtn = document.getElementById('tutorialNextBtn');
  var tutorialSkipBtn = document.getElementById('tutorialSkipBtn');
  var tutorialText = document.getElementById('tutorialText');
  var tutorialIcon = document.getElementById('tutorialIcon');

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var scene = 'title';
  var selectedLevel = 'easy';
  var game = null;
  var time = 0;
  var last = 0;
  var accumulator = 0;
  var STEP = 1000 / 60;
  var MAX_STEPS = 3;
  var MAX_ACC = 50; // ms hard clamp (spiral-of-death guard)

  var audioCtx = null;
  var soundOn = true;
  var assetCache = new Map();
  var glyphCache = new Map(); // "ch|hue" -> offscreen canvas

  // Pono brand asset (preloaded here at boot, i.e. as soon as this script
  // module runs — Image() begins fetching the instant .src is set). Replaces
  // the earlier procedural bear-face doodle in drawPono() with the real
  // brand artwork already used across maze/bento/play.html etc.
  var ponoFaceAsset = { img: new Image(), ready: false };
  ponoFaceAsset.img.onload = function () { ponoFaceAsset.ready = true; };
  ponoFaceAsset.img.decoding = 'async';
  ponoFaceAsset.img.src = '../assets/images/characters/pono/pono_face_circle.png';

  // ============================================================
  // Utilities carried over from v1
  // ============================================================
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i -= 1) {
      var j = (Math.random() * (i + 1)) | 0;
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }
  function chars(word) { return Array.from(String(word || '').normalize('NFC')); }
  function escapeAttr(value) {
    return String(value || '').replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function hueOf(ch) { return (ch.codePointAt(0) * 47) % 360; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function getAsset(src) {
    if (!src) return null;
    if (assetCache.has(src)) return assetCache.get(src);
    var entry = { img: new Image(), ready: false, failed: false };
    entry.img.onload = function () { entry.ready = true; };
    entry.img.onerror = function () { entry.failed = true; };
    entry.img.decoding = 'async';
    entry.img.src = src;
    assetCache.set(src, entry);
    return entry;
  }
  function preloadWordAssets(list) {
    list.forEach(function (item) { if (item && item.asset) getAsset(item.asset); });
  }

  function setHidden(el, hidden) { if (el) el.classList.toggle('hidden', !!hidden); }
  function setScene(next) { scene = next; document.body.setAttribute('data-scene', next); }
  function announce(text) { if (liveRegion) liveRegion.textContent = text; }

  function readProgress() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { cleared: [], tutorialDone: false };
    } catch (err) { return { cleared: [], tutorialDone: false }; }
  }
  function writeProgress(patch) {
    try {
      var state = readProgress();
      if (patch.words) {
        var map = {};
        (state.cleared || []).forEach(function (item) { map[item.word] = item; });
        patch.words.forEach(function (item) { map[item.word] = { word: item.word, emoji: item.emoji, at: Date.now() }; });
        state.cleared = Object.keys(map).map(function (key) { return map[key]; }).slice(-60);
      }
      if (typeof patch.tutorialDone === 'boolean') state.tutorialDone = patch.tutorialDone;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) { /* localStorage may be unavailable (private mode) — non-fatal */ }
  }

  // ============================================================
  // WebAudio SE (unchanged pipeline, extended with a "creak" cue)
  // ============================================================
  function initAudio() {
    if (!soundOn) return;
    try {
      if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } catch (err) { audioCtx = null; }
  }
  function tone(freq, duration, type, volume, delay, endFreq) {
    if (!audioCtx || !soundOn) return;
    try {
      var t0 = audioCtx.currentTime + (delay || 0);
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
      gain.gain.setValueAtTime(volume || 0.12, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.04);
    } catch (err) { /* ignore */ }
  }
  var sfx = {
    tap: function () { tone(520, 0.07, 'triangle', 0.08); },
    grab: function () { tone(310, 0.08, 'square', 0.06); tone(430, 0.08, 'square', 0.05, 0.06); },
    creak: function (stress) { tone(240 + stress * 90, 0.09, 'sawtooth', 0.03 + stress * 0.04); },
    slip: function () { tone(620, 0.28, 'sine', 0.09, 0, 150); },
    settle: function () { tone(700, 0.14, 'sine', 0.08, 0, 260); },
    ok: function () { tone(660, 0.1, 'triangle', 0.11); tone(880, 0.14, 'triangle', 0.11, 0.08); },
    topple: function () { tone(330, 0.14, 'sine', 0.08); tone(220, 0.24, 'sine', 0.08, 0.12); },
    clear: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.12, i * 0.1); }); }
  };
  function playSfx(name, arg) { if (sfx[name]) sfx[name](arg); }
  function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (err) {} }

  // ============================================================
  // Glyph pre-rasterization (zero fillText() in the hot loop)
  // ============================================================
  function getGlyph(ch, hue) {
    var key = ch + '|' + hue;
    if (glyphCache.has(key)) return glyphCache.get(key);
    var c = document.createElement('canvas');
    c.width = BLOCK_SIZE; c.height = BLOCK_SIZE;
    var g = c.getContext('2d');
    // block face
    rrPath(g, 2, 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4, 13);
    g.fillStyle = 'hsl(' + hue + ', 82%, 88%)';
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = 'hsl(' + hue + ', 55%, 60%)';
    g.stroke();
    rrPath(g, 7, BLOCK_SIZE - 24, BLOCK_SIZE - 14, 10, 5);
    g.fillStyle = 'hsl(' + hue + ', 60%, 80%)';
    g.fill();
    // Subtle "grab here for stable" center marker — the only prior
    // affordance for the stable-grab zone (tryGrab's d<=0.15 band) was a
    // sentence in the tutorial text, with nothing drawn on the block itself.
    g.save();
    g.globalAlpha = 0.4;
    g.beginPath();
    g.arc(BLOCK_SIZE / 2, BLOCK_SIZE / 2 - 2, BLOCK_SIZE / 2 * 0.15, 0, Math.PI * 2);
    g.fillStyle = 'hsl(' + hue + ', 70%, 97%)';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = 'hsl(' + hue + ', 60%, 68%)';
    g.stroke();
    g.restore();
    g.font = '900 34px ' + FONT;
    g.fillStyle = 'hsl(' + hue + ', 55%, 34%)';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ch, BLOCK_SIZE / 2, BLOCK_SIZE / 2 - 2);
    glyphCache.set(key, c);
    return c;
  }
  function getJunkGlyph(shapeKey, hue) {
    var key = 'junk:' + shapeKey + '|' + hue;
    if (glyphCache.has(key)) return glyphCache.get(key);
    var shape = JUNK_SHAPES[shapeKey];
    var w = shape.kind === 'circle' ? shape.r * 2 : shape.w;
    var h = shape.kind === 'circle' ? shape.r * 2 : shape.h;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    if (shape.kind === 'circle') {
      g.beginPath();
      g.arc(w / 2, h / 2, shape.r - 2, 0, Math.PI * 2);
      g.fillStyle = 'hsl(' + hue + ', 78%, 82%)';
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = 'hsl(' + hue + ', 55%, 54%)';
      g.stroke();
    } else {
      rrPath(g, 2, 2, w - 4, h - 4, 12);
      g.fillStyle = 'hsl(' + hue + ', 78%, 82%)';
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = 'hsl(' + hue + ', 55%, 54%)';
      g.stroke();
    }
    glyphCache.set(key, c);
    return c;
  }

  // ============================================================
  // Matter.js world setup
  // ============================================================
  var engine, world;
  var bodies = {
    ground: null, wallL: null, wallR: null, pedestal: null
  };

  function buildEngine() {
    engine = Engine.create();
    engine.gravity.y = 1.0;
    engine.timing.timeScale = 1;
    world = engine.world;
    world.bodies = [];

    bodies.ground = Bodies.rectangle(W / 2, FLOOR_Y + 60, W + 40, 120, {
      isStatic: true, friction: 0.9, label: 'ground'
    });
    bodies.wallL = Bodies.rectangle(-20, H / 2, 40, H, { isStatic: true, label: 'wall' });
    bodies.wallR = Bodies.rectangle(W + 20, H / 2, 40, H, { isStatic: true, label: 'wall' });
    Composite.add(world, [bodies.ground, bodies.wallL, bodies.wallR]);
  }

  function buildPedestal(width) {
    if (bodies.pedestal) Composite.remove(world, bodies.pedestal);
    var thick = 40;
    var top = FLOOR_Y - thick;
    bodies.pedestal = Bodies.rectangle(W / 2, top + thick / 2, width, thick, {
      isStatic: true, friction: 1, label: 'pedestal'
    });
    bodies.pedestal.plugin = { footprint: { x0: W / 2 - width / 2, x1: W / 2 + width / 2, top: top } };
    Composite.add(world, bodies.pedestal);
    return bodies.pedestal;
  }

  function makeKanaBody(ch, x, y) {
    var body = Bodies.rectangle(x, y, BLOCK_SIZE, BLOCK_SIZE, {
      chamfer: { radius: BLOCK_CHAMFER },
      density: 0.001,
      friction: 0.8,
      frictionStatic: 1.0,
      restitution: 0.05,
      slop: 0.02,
      label: 'kana'
    });
    body.plugin = { kind: 'kana', ch: ch, hue: hueOf(ch), halfW: BLOCK_SIZE / 2, halfH: BLOCK_SIZE / 2, grabQuality: null, filled: false };
    return body;
  }

  function makeJunkBody(shapeKey, x, y) {
    var shape = JUNK_SHAPES[shapeKey] || JUNK_SHAPES.wide;
    var opts = { density: 0.0009, friction: 0.75, frictionStatic: 0.95, restitution: 0.08, slop: 0.03, label: 'junk' };
    var body;
    if (shape.kind === 'circle') {
      body = Bodies.circle(x, y, shape.r, opts);
      body.plugin = { kind: 'junk', shapeKey: shapeKey, hue: shape.hue, halfW: shape.r, halfH: shape.r };
    } else {
      body = Bodies.rectangle(x, y, shape.w, shape.h, Object.assign({ chamfer: { radius: 12 } }, opts));
      body.plugin = { kind: 'junk', shapeKey: shapeKey, hue: shape.hue, halfW: shape.w / 2, halfH: shape.h / 2 };
    }
    return body;
  }

  // Cap on active dynamic bodies (perf budget). Our level knobs (<=5 kana +
  // <=7 decoys + <=2 junk = 14) stay comfortably under this, so no runtime
  // despawn logic is needed today — the constant documents the budget for
  // future content additions.
  var MAX_ACTIVE_BODIES = 32;

  function spawnRoundBodies(item, cfg) {
    var needed = chars(item.word).slice(0, cfg.maxKana);
    var decoyPool = shuffle(chars(KANA).filter(function (ch) { return needed.indexOf(ch) < 0; }));
    var decoys = decoyPool.slice(0, cfg.decoys);
    var spawned = [];

    var supplyLeft = 70;
    var supplyRight = W - 70;
    var n = needed.length + decoys.length + cfg.junk;
    var idx = 0;
    var order = shuffle(needed.map(function (ch) { return { type: 'kana', ch: ch }; })
      .concat(decoys.map(function (ch) { return { type: 'kana', ch: ch }; }))
      .concat(Array.from({ length: cfg.junk }, function (_, i) { return { type: 'junk', shapeKey: JUNK_KEYS[i % JUNK_KEYS.length] }; })));

    order.forEach(function (entry) {
      var x = supplyLeft + (idx + 0.5) * (supplyRight - supplyLeft) / Math.max(1, n) + (Math.random() - 0.5) * 24;
      var y = 60 + Math.random() * 140 - (idx % 3) * 18; // staggered drop height → natural avalanche
      var body;
      if (entry.type === 'kana') body = makeKanaBody(entry.ch, x, y);
      else body = makeJunkBody(entry.shapeKey, x, y);
      Body.setAngle(body, (Math.random() - 0.5) * 0.6);
      spawned.push(body);
      idx += 1;
    });

    Composite.add(world, spawned);
    return spawned;
  }

  // ============================================================
  // Round / game state
  // ============================================================
  function chooseWords(levelKey) {
    var list = (window.PonoMojicraneWords && window.PonoMojicraneWords[levelKey]) || [];
    var cfg = LEVELS[levelKey];
    var queue = shuffle(list.slice()).slice(0, cfg.rounds);
    preloadWordAssets(queue);
    return queue;
  }

  function clearDynamicBodies() {
    var all = Composite.allBodies(world).filter(function (b) { return !b.isStatic; });
    all.forEach(function (b) { Composite.remove(world, b); });
  }

  // Drops the live grab constraint (if any) from the Matter.js world without
  // the sfx/vibration/bubble side effects of releaseGrab(). Must run before
  // any path that discards game.grab / game (startRound/showTitle/showResult/
  // startGame reassignment) — otherwise a constraint held via a still-down
  // pointer (e.g. a child pausing to watch the clear animation) is orphaned:
  // it stays registered in engine.world.constraints and is solved every
  // physics step for the rest of the page session, and is never cleaned up
  // later because handlePointerEnd() short-circuits once game.grab is null.
  function discardGrab() {
    if (game && game.grab) {
      Composite.remove(world, game.grab.constraint);
      game.grab = null;
    }
  }

  function startRound() {
    var item = game.queue[game.roundIndex];
    game.item = item;
    game.word = item.word;
    game.wordChars = chars(item.word).slice(0, game.cfg.maxKana);
    game.slotsFilled = game.wordChars.map(function () { return false; });
    game.slotBody = game.wordChars.map(function () { return null; });
    game.bubble = '';
    game.mood = 'normal';
    game.moodT = 0;
    game.blinkT = 1.8;
    game.stabilityT = 0;
    game.roundClear = false;
    game.clearT = 0;
    discardGrab();
    game.stress = 0;
    game.toweredCount = 0;
    game.placements = { total: 0, center: 0 };
    game.pops = [];
    game.confetti = [];
    game.toppleCooldown = 0;

    clearDynamicBodies();
    buildPedestal(game.cfg.pedestalWidth);
    spawnRoundBodies(item, game.cfg);
    setBubble('「' + item.word + '」の もじを つみあげよう');
  }

  function startGame(levelKey) {
    discardGrab(); // guard: don't orphan a constraint from the game being replaced below
    selectedLevel = levelKey;
    var cfg = LEVELS[levelKey] || LEVELS.easy;
    game = {
      cfg: cfg, levelKey: levelKey,
      queue: chooseWords(levelKey),
      roundIndex: 0,
      done: [],
      bubble: '', mood: 'normal', moodT: 0, blinkT: 1.8, slowT: 0,
      stabilityT: 0
    };
    var progress = readProgress();
    if (!progress.tutorialDone) {
      startTutorial();
      return;
    }
    startRound();
    setScene('playing');
    setHidden(titleOverlay, true);
    setHidden(resultOverlay, true);
    setHidden(confirmOverlay, true);
    setHidden(tutorialOverlay, true);
    updateButtons();
    playSfx('tap');
  }

  function showTitle() {
    setScene('title');
    discardGrab();
    game = null;
    if (world) clearDynamicBodies();
    setHidden(titleOverlay, false);
    setHidden(resultOverlay, true);
    setHidden(confirmOverlay, true);
    setHidden(tutorialOverlay, true);
    updateButtons();
  }

  function showResult() {
    setScene('result');
    discardGrab(); // a still-held pointer through the clear animation must not carry a live grab into the result screen
    resultTitle.textContent = 'できたね';
    var stars = 1;
    if (game.done.length >= game.cfg.rounds) stars = 2;
    var placeRatio = game.placements.total ? game.placements.center / game.placements.total : 0;
    if (stars >= 2 && placeRatio >= 0.7) stars = 3;
    resultStars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    wordCards.innerHTML = game.done.map(function (item) {
      var media = item.asset
        ? '<img class="emoji word-img" src="' + escapeAttr(item.asset) + '" alt="">'
        : '<span class="emoji">' + item.emoji + '</span>';
      return '<div class="word-card">' + media + '<span class="word">' + item.word + '</span></div>';
    }).join('');
    writeProgress({ words: game.done });
    setHidden(resultOverlay, false);
    playSfx('clear');
    updateButtons();
  }

  function updateButtons() {
    var canRelease = scene === 'playing' && game && game.grab;
    dropBtn.disabled = !canRelease;
    // dropBtn is visually shown in both scene=playing and scene=tutorial
    // (see styles.css's body:not([data-scene=playing]):not([data-scene=
    // tutorial]) rule), but canRelease above is only ever true when
    // scene==='playing' — so during the tutorial it used to sit there
    // permanently disabled/inert, which reads as broken to a child. Hide it
    // outright during the tutorial; the tutorial's own gated steps are the
    // only way to release a held block while learning.
    setHidden(dropBtn, scene === 'tutorial');
    hintBtn.disabled = !(scene === 'playing' && game && !game.roundClear);
  }

  function pop(x, y, text, color, size) {
    if (!game) return;
    game.pops.push({ x: x, y: y, text: text, color: color, size: size || 22, t: 0, dur: 0.85 });
  }
  function burstConfetti(count) {
    if (!game) return;
    var colors = ['#ff6381', '#ff9f43', '#ffd166', '#33bf7a', '#58a8ff', '#9b72e7'];
    var n = reduceMotion ? Math.ceil(count * 0.35) : count;
    for (var i = 0; i < n; i += 1) {
      game.confetti.push({
        x: 160 + Math.random() * 620, y: -20 - Math.random() * 120,
        vx: (Math.random() - 0.5) * 90, vy: 125 + Math.random() * 170,
        rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 8,
        color: pick(colors), size: 5 + Math.random() * 6
      });
    }
  }
  function setBubble(text, mood) {
    if (!game) return;
    game.bubble = text;
    game.mood = mood || 'normal';
    game.moodT = mood ? 1.4 : game.moodT;
    announce(text.replace(/[「」]/g, ''));
  }

  function completeWord(stabilityBonus) {
    game.roundClear = true;
    game.clearT = 0;
    game.item.stabilityBonus = stabilityBonus;
    game.done.push(game.item);
    setBubble('できたね。「' + game.word + '」', 'happy');
    burstConfetti(62);
    playSfx('clear');
    vibrate(55);
    narrate(NARR.wordDone);
  }

  // ============================================================
  // Pointer → world coordinate mapping + grab/carry/release
  // ============================================================
  function pointerToWorld(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var x = (clientX - rect.left) * (W / rect.width);
    var y = (clientY - rect.top) * (H / rect.height);
    // Clamp to the arena: setPointerCapture() keeps delivering pointermove
    // events (with arbitrary client coords) even once the finger/cursor
    // leaves the canvas, and this value is fed straight into the live
    // Matter.js grab constraint (updateGrab) — an unbounded point can yank
    // a body through walls in a single physics step (tunneling guard).
    return { x: clamp(x, 0, W), y: clamp(y, 0, H) };
  }

  function bodyHalfExtent(body) {
    return body.plugin && body.plugin.halfW ? body.plugin.halfW : 40;
  }

  // Touch-hit generosity: Query.point() alone requires the tap to land
  // exactly inside a body's geometry, which is too precise for a young
  // child's motor control. Query.region() with a small pad around the
  // tap point catches near-misses (kids-ux tolerance, mirrors the spirit
  // of stacking/index.html's HIT_BONUS).
  var GRAB_HIT_TOLERANCE = 12;

  function tryGrab(point) {
    if (!game || game.roundClear) return;
    var all = Composite.allBodies(world).filter(function (b) { return !b.isStatic; });
    var region = {
      min: { x: point.x - GRAB_HIT_TOLERANCE, y: point.y - GRAB_HIT_TOLERANCE },
      max: { x: point.x + GRAB_HIT_TOLERANCE, y: point.y + GRAB_HIT_TOLERANCE }
    };
    var hits = Query.region(all, region);
    if (!hits.length) return;
    // Pick the hit body whose center is nearest the pointer (2D physics has
    // no z-order, so "topmost" is approximated by proximity to the tap).
    var body = null;
    var bestDist = Infinity;
    hits.forEach(function (b) {
      var d = Vector.magnitude(Vector.sub(b.position, point));
      if (d < bestDist) { bestDist = d; body = b; }
    });
    if (!body) return;
    Sleeping.set(body, false);

    var local = Vector.rotate(Vector.sub(point, body.position), -body.angle);
    var halfW = bodyHalfExtent(body);
    var d = Math.abs(local.x) / Math.max(1, halfW);
    var grabType = d <= 0.15 ? 'center' : 'edge';

    var constraint = Constraint.create({
      bodyA: body,
      pointA: local,
      pointB: point,
      length: 0,
      stiffness: grabType === 'center' ? 0.9 : 0.08,
      damping: grabType === 'center' ? 0.15 : 0.02
    });
    Composite.add(world, constraint);

    game.grab = {
      body: body, constraint: constraint, grabType: grabType,
      startX: point.x, startY: point.y, progress: 0, stressPeak: 0
    };
    body.plugin.grabQuality = grabType;
    if (grabType === 'center') narrate(NARR.grabCenter);
    playSfx('grab');
    vibrate(15);
    updateButtons();
  }

  // Max per-event displacement of the grab constraint's target point, in
  // world px. Caps how far a single pointermove can yank a held body —
  // a second tunneling guard alongside pointerToWorld()'s bounds clamp,
  // since a fast flick or a captured pointer jumping far off-canvas could
  // otherwise resolve most of that positional error in one 16.67ms step.
  var MAX_GRAB_STEP = 140;

  function updateGrab(point) {
    if (!game || !game.grab) return;
    var grab = game.grab;
    var prevPoint = grab.constraint.pointB;
    var delta = Vector.sub(point, prevPoint);
    var deltaMag = Vector.magnitude(delta);
    if (deltaMag > MAX_GRAB_STEP) {
      point = Vector.add(prevPoint, Vector.mult(delta, MAX_GRAB_STEP / deltaMag));
    }
    grab.constraint.pointB = point;
    var dist = Vector.magnitude(Vector.sub(point, { x: grab.startX, y: grab.startY }));
    grab.progress = clamp(dist / 300, 0, 1);

    // stress proxy: distance between the anchor world point and the pointer
    // target, scaled by stiffness — the softer the spring (edge grab), the
    // more a given carry speed manifests as visible pendulum stress.
    var anchorWorld = Vector.add(grab.body.position, Vector.rotate(grab.constraint.pointA, grab.body.angle));
    var stretch = Vector.magnitude(Vector.sub(anchorWorld, point));
    game.stress = clamp(stretch / 140, 0, 1.4);
    if (game.stress > grab.stressPeak) grab.stressPeak = game.stress;
    if (game.stress > 0.7 && Math.random() < 0.06) playSfx('creak', game.stress);

    if (grab.grabType === 'edge' && grab.progress >= 0.25 && grab.progress <= 0.75 && game.slowT <= 0) {
      var cfg = game.cfg;
      var isJunk = grab.body.plugin.kind === 'junk';
      var slipLimit = isJunk ? cfg.junkSlip : cfg.slip;
      var gripBudgetPx = slipLimit >= 900 ? Infinity : 40 + slipLimit * 2.4;
      var angleDeg = Math.abs(grab.body.angle) * 180 / Math.PI;
      if (angleDeg > 35 || stretch > gripBudgetPx) {
        releaseGrab(true);
      }
    }
  }

  function releaseGrab(broken) {
    if (!game || !game.grab) return;
    var grab = game.grab;
    Composite.remove(world, grab.constraint);
    game.grab = null;
    game.stress = 0;
    if (broken) {
      playSfx('slip');
      setBubble(grab.grabType === 'edge' ? 'はしっこは すべりやすいよ。まんなかを ねらおう' : 'つかみが はずれたよ', 'oops');
      vibrate(24);
    } else {
      playSfx('settle');
    }
    updateButtons();
  }

  // ============================================================
  // Tower connectivity + stability (COM vs support polygon)
  // ============================================================
  // kanaOnTower is a Map<ch, Body[]> (NOT a plain char->Body object) so that
  // words with a repeated kana (e.g. "ばなな" needs 2x な, "たんぽぽ" needs
  // 2x ぽ) can be satisfied only by 2 distinct physical blocks. A char-keyed
  // plain object would let a second same-character body silently overwrite
  // the first in the map, letting the slot-fill loop in update() resolve
  // every duplicate-letter slot to the same single block — i.e. the word
  // would complete with fewer blocks stacked than it actually needs.
  // Invariant check (manual/headless): for word "ばなな" with 1ば+2な
  // stacked, kanaOnTower.get('な').length must be 2, not 1.
  function computeTowerState() {
    if (!game || !bodies.pedestal) return { com: null, count: 0, kanaOnTower: new Map() };
    var pairs = engine.pairs.list;
    var adjacency = new Map();
    function link(a, b) {
      if (!adjacency.has(a.id)) adjacency.set(a.id, new Set());
      if (!adjacency.has(b.id)) adjacency.set(b.id, new Set());
      adjacency.get(a.id).add(b);
      adjacency.get(b.id).add(a);
    }
    for (var i = 0; i < pairs.length; i += 1) {
      var p = pairs[i];
      if (!p.isActive) continue;
      link(p.bodyA, p.bodyB);
    }
    var startNode = bodies.pedestal;
    var visited = new Set([startNode.id]);
    var queue = [startNode];
    var connected = [];
    while (queue.length) {
      var cur = queue.shift();
      var neighbors = adjacency.get(cur.id);
      if (!neighbors) continue;
      neighbors.forEach(function (n) {
        if (visited.has(n.id) || n.isStatic) return;
        visited.add(n.id);
        connected.push(n);
        queue.push(n);
      });
    }
    var totalMass = 0, sx = 0, sy = 0;
    var kanaOnTower = new Map();
    connected.forEach(function (b) {
      totalMass += b.mass;
      sx += b.position.x * b.mass;
      sy += b.position.y * b.mass;
      if (b.plugin && b.plugin.kind === 'kana' && b.speed < 0.6) {
        if (!kanaOnTower.has(b.plugin.ch)) kanaOnTower.set(b.plugin.ch, []);
        kanaOnTower.get(b.plugin.ch).push(b);
      }
    });
    var com = totalMass > 0 ? { x: sx / totalMass, y: sy / totalMass } : null;
    return { com: com, count: connected.length, kanaOnTower: kanaOnTower };
  }

  // ============================================================
  // Simulation update
  // ============================================================
  function update(dtSec) {
    if (!game) return;
    game.blinkT -= dtSec;
    if (game.blinkT <= 0) game.blinkT = 2 + Math.random() * 2.5;
    if (game.moodT > 0) { game.moodT -= dtSec; if (game.moodT <= 0) game.mood = 'normal'; }
    if (game.slowT > 0) game.slowT = Math.max(0, game.slowT - dtSec);
    engine.timing.timeScale = game.slowT > 0 ? 0.58 : 1;
    if (game.toppleCooldown > 0) game.toppleCooldown -= dtSec;

    // word slot fill detection — recomputed every frame (non-sticky: a
    // topple that knocks a kana off the tower un-fills its slot, per spec:
    // "the word is simply retried with the same live blocks").
    var towerState = computeTowerState();
    var prevOnTower = game.toweredCount || 0;
    // sum physical blocks across all kana (not distinct-character count) —
    // otherwise a repeated-kana word (2x な, 2x ぽ, ...) undercounts and
    // topple-detection below stays desensitized for those words too.
    game.toweredCount = 0;
    towerState.kanaOnTower.forEach(function (arr) { game.toweredCount += arr.length; });
    // Snapshot of which kana body ids are currently on the tower, read by
    // the tutorial's canvas cue renderer (drawTutorialCues) to point the
    // carry-path arrow at whichever block hasn't been placed yet.
    var onTowerIds = new Set();
    towerState.kanaOnTower.forEach(function (arr) { arr.forEach(function (b) { onTowerIds.add(b.id); }); });
    game.lastOnTowerIds = onTowerIds;
    // Lowered from ">= 2" so the very first block placed on the pedestal
    // also gets topple feedback (sfx/narrate/bubble) if it's knocked off —
    // previously a lone first block silently vanishing had no feedback at
    // all, which reads as a bug to a young child.
    if (prevOnTower >= 1 && game.toweredCount < prevOnTower && game.toppleCooldown <= 0) {
      game.toppleCooldown = 1.6;
      playSfx('topple');
      vibrate(35);
      var firstTopple = !game.hadTopple;
      game.hadTopple = true;
      narrate(firstTopple ? NARR.topple1 : NARR.topple2);
      setBubble(firstTopple ? 'あらら、たおれちゃった。もういちど！' : 'まんなかを つかむと はこびやすいよ', 'oops');
    }

    // Occurrence-ranked lookup: the Nth occurrence of character `ch` in
    // wordChars must resolve to the Nth distinct body of that character
    // settled on the tower (not the same single body for every occurrence).
    var newlyFilled = [];
    var seenCount = {};
    game.wordChars.forEach(function (ch, i) {
      var was = game.slotsFilled[i];
      var occ = (seenCount[ch] = (seenCount[ch] || 0) + 1) - 1;
      var arr = towerState.kanaOnTower.get(ch) || [];
      var body = arr[occ];
      game.slotsFilled[i] = !!body;
      if (!was && body) { game.slotBody[i] = body; newlyFilled.push({ i: i, body: body }); }
    });
    newlyFilled.forEach(function (entry) {
      game.placements.total += 1;
      if (entry.body.plugin.grabQuality === 'center') game.placements.center += 1;
      pop(entry.body.position.x, entry.body.position.y - 50,
        entry.body.plugin.grabQuality === 'center' ? 'まんなか' : 'ぴったり',
        entry.body.plugin.grabQuality === 'center' ? '#33bf7a' : '#ff8a36', 20);
    });

    var allFilled = game.wordChars.length > 0 && game.slotsFilled.every(Boolean);
    var footprint = bodies.pedestal.plugin.footprint;
    var centralLo = footprint.x0 + (footprint.x1 - footprint.x0) * 0.2;
    var centralHi = footprint.x1 - (footprint.x1 - footprint.x0) * 0.2;
    var comInCentral = towerState.com && towerState.com.x >= centralLo && towerState.com.x <= centralHi;

    if (allFilled && !game.roundClear) {
      if (comInCentral) {
        game.stabilityT += dtSec;
        if (game.stabilityT > 3.05) game.stabilityT = 3.05;
        // tutorial mode manages its own step-6 completion via
        // tutorialOnStable() in the main loop, not the scoring flow here.
        if (game.stabilityT >= 3 && game.stress <= 0.1 && !game.tutorial) {
          completeWord(true);
        }
      } else {
        game.stabilityT = Math.max(0, game.stabilityT - dtSec * 2);
        if (game.stabilityT === 0 && Math.random() < dtSec * 0.4) narrate(NARR.balanceWobble);
      }
    } else {
      game.stabilityT = Math.max(0, game.stabilityT - dtSec);
    }

    // gentle wind gust on challenge level (spec: level knob)
    if (game.cfg.windGust && Math.random() < dtSec * 0.15) {
      var grabbedId = game.grab ? game.grab.body.id : null;
      Composite.allBodies(world).forEach(function (b) {
        if (b.isStatic || b.id === grabbedId) return;
        Body.applyForce(b, b.position, { x: (Math.random() - 0.5) * 0.0009 * b.mass, y: 0 });
      });
    }

    // fixed-step physics via accumulator (clamped) — handled in the outer loop

    game.pops.forEach(function (p) { p.t += dtSec; });
    game.pops = game.pops.filter(function (p) { return p.t < p.dur; });
    game.confetti.forEach(function (piece) {
      piece.x += piece.vx * dtSec; piece.y += piece.vy * dtSec; piece.rot += piece.vr * dtSec;
    });
    game.confetti = game.confetti.filter(function (piece) { return piece.y < H + 30; });

    if (game.roundClear) {
      game.clearT += dtSec;
      if (!reduceMotion && Math.random() < dtSec * 2.2) burstConfetti(4);
      if (game.clearT >= 1.85) {
        game.roundIndex += 1;
        if (game.roundIndex >= game.queue.length) showResult();
        else startRound();
      }
    }
  }

  // ============================================================
  // Rendering
  // ============================================================
  function rrPath(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function rr(x, y, w, h, r) { rrPath(ctx, x, y, w, h, r); }
  function circle(x, y, r, fill, stroke, lw) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function text(str, x, y, size, color, weight, align) {
    ctx.font = (weight || '900') + ' ' + size + 'px ' + FONT;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }
  function wrapText(str, maxWidth, size) {
    ctx.font = '800 ' + size + 'px ' + FONT;
    var lines = []; var current = '';
    chars(str).forEach(function (ch) {
      if (current && ctx.measureText(current + ch).width > maxWidth) { lines.push(current); current = ch; }
      else current += ch;
    });
    if (current) lines.push(current);
    return lines.slice(0, 3);
  }
  function drawContain(img, x, y, w, h) {
    var iw = img.naturalWidth || img.width || 1;
    var ih = img.naturalHeight || img.height || 1;
    var scale = Math.min(w / iw, h / ih);
    var dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function drawBackground() {
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#fff9e8');
    bg.addColorStop(1, '#ffe6c5');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.28;
    for (var i = 0; i < 18; i += 1) {
      circle(40 + i * 58, 86 + Math.sin(time * 0.8 + i) * 14, 5, ['#ff6381', '#ffd166', '#33bf7a', '#58a8ff'][i % 4]);
    }
    ctx.globalAlpha = 1;
  }

  function drawFloor() {
    rr(0, FLOOR_Y, W, H - FLOOR_Y, 0);
    ctx.fillStyle = '#d8a663';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#bd8948';
    ctx.stroke();
  }

  function drawPedestal() {
    if (!bodies.pedestal) return;
    var fp = bodies.pedestal.plugin.footprint;
    rr(fp.x0, fp.top, fp.x1 - fp.x0, FLOOR_Y - fp.top, 10);
    ctx.fillStyle = '#c9a06a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#a67c48';
    ctx.stroke();
    // central 60% zone hint (subtle)
    var cx0 = fp.x0 + (fp.x1 - fp.x0) * 0.2;
    var cx1 = fp.x1 - (fp.x1 - fp.x0) * 0.2;
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#33bf7a';
    ctx.fillRect(cx0, fp.top, cx1 - cx0, 6);
    ctx.globalAlpha = 1;
  }

  function drawBody(body) {
    var plugin = body.plugin || {};
    var cx = body.position.x, cy = body.position.y;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(body.angle);
    if (plugin.kind === 'kana') {
      var glyph = getGlyph(plugin.ch, plugin.hue);
      ctx.drawImage(glyph, -BLOCK_SIZE / 2, -BLOCK_SIZE / 2);
    } else if (plugin.kind === 'junk') {
      var glyph2 = getJunkGlyph(plugin.shapeKey, plugin.hue);
      ctx.drawImage(glyph2, -glyph2.width / 2, -glyph2.height / 2);
    }
    ctx.restore();
  }

  function drawBodies() {
    var all = Composite.allBodies(world).filter(function (b) { return !b.isStatic; });
    all.forEach(drawBody);
  }

  function drawCrane() {
    if (!game) return;
    var grab = game.grab;
    var tipX, tipY, open;
    if (grab) {
      tipX = grab.constraint.pointB.x;
      tipY = grab.constraint.pointB.y;
      open = clamp(0.25 + game.stress * 0.5, 0.2, 1);
    } else {
      tipX = W / 2 + Math.sin(time * 0.6) * 60;
      tipY = 60;
      open = 1;
    }
    var railY = 30;
    rr(tipX - 30, railY, 60, 16, 8);
    ctx.fillStyle = '#6c5ce7';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tipX, railY + 14);
    ctx.lineTo(tipX, tipY - 20);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#6b6178';
    ctx.stroke();
    circle(tipX, tipY - 18, 9, '#ffd166', '#df9d2f', 3);
    var spread = 6 + 16 * open;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = game.stress > 0.7 ? '#ff5c5c' : '#f4a742';
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(tipX + s * 4, tipY - 14);
      ctx.quadraticCurveTo(tipX + s * (spread + 9), tipY - 4, tipX + s * spread, tipY + 8);
      ctx.stroke();
    });
    ctx.lineCap = 'butt';
  }

  function drawPono(cx, cy, r) {
    var blink = game && game.blinkT < 0.12;
    var happy = game && game.mood === 'happy';
    var oops = game && game.mood === 'oops';
    if (ponoFaceAsset.ready) {
      // Brand asset path. Per feedback_image_aspect_ratio: never stretch —
      // compute the source's actual AR and fit it within the 2r square
      // (contain, not stretch) rather than forcing destW===destH===2r. This
      // asset is a 1:1 square crop today so it happens to fill the circle
      // exactly, but the calc stays AR-safe if it's ever swapped for a
      // non-square crop.
      var img = ponoFaceAsset.img;
      var srcAR = (img.naturalWidth || img.width || 1) / (img.naturalHeight || img.height || 1);
      var size = r * 2;
      var destW = size, destH = size / srcAR;
      if (destH > size) { destH = size; destW = size * srcAR; }
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, cx - destW / 2, cy - destH / 2, destW, destH);
      ctx.restore();
      // Mood cue is round-2 residual fix: the static brand image can't grow
      // new eyes/mouth for happy/oops, so a small corner badge stands in for
      // the procedural fallback's eye-arc/mouth swap below so a first-topple
      // or word-complete moment still reads on Pono's face, not just the
      // speech bubble text.
      if (happy || oops) {
        text(happy ? '✨' : '💦', cx + r * 0.62, cy + r * 0.62, r * 0.5, '#3a2a1c', '900');
      }
      return;
    }
    // Fallback while the asset loads (or if it fails to load): procedural
    // bear-face doodle, kept as-is so nothing pops in empty on a slow load.
    [-1, 1].forEach(function (s) {
      circle(cx + s * r * 0.66, cy - r * 0.66, r * 0.34, '#c58a54', '#a96f3d', 3);
      circle(cx + s * r * 0.66, cy - r * 0.66, r * 0.17, '#e8b98b');
    });
    circle(cx, cy, r, '#c58a54', '#a96f3d', 3);
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.32, r * 0.5, r * 0.36, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f6e3c2';
    ctx.fill();
    rr(cx - 5, cy + r * 0.08, 10, 7, 3);
    ctx.fillStyle = '#6b4a2f';
    ctx.fill();
    [-1, 1].forEach(function (s) {
      var ex = cx + s * r * 0.38, ey = cy - r * 0.12;
      if (happy) {
        ctx.beginPath(); ctx.arc(ex, ey + 3, 5, Math.PI, Math.PI * 2);
        ctx.lineWidth = 3; ctx.strokeStyle = '#3a2a1c'; ctx.stroke();
      } else if (blink) {
        ctx.beginPath(); ctx.moveTo(ex - 5, ey); ctx.lineTo(ex + 5, ey);
        ctx.lineWidth = 3; ctx.strokeStyle = '#3a2a1c'; ctx.stroke();
      } else {
        circle(ex, ey, 4.5, '#3a2a1c');
      }
    });
    if (oops) circle(cx, cy + r * 0.42, 4, null, '#6b4a2f', 2.5);
    else { ctx.beginPath(); ctx.arc(cx, cy + r * 0.36, 7, 0, Math.PI); ctx.lineWidth = 2.5; ctx.strokeStyle = '#6b4a2f'; ctx.stroke(); }
    circle(cx - r * 0.64, cy + r * 0.2, 5, 'rgba(255,150,150,.5)');
    circle(cx + r * 0.64, cy + r * 0.2, 5, 'rgba(255,150,150,.5)');
  }

  function drawBubble() {
    rr(530, 14, 306, 104, 18);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#eddcbc'; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(835, 56); ctx.lineTo(850, 66); ctx.lineTo(835, 76); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill();
    var lines = wrapText(game.bubble || '', 270, 19);
    var y0 = 64 - (lines.length - 1) * 12;
    lines.forEach(function (line, i) { text(line, 683, y0 + i * 24, 19, '#5b4636', '800'); });
  }

  function drawWordCard() {
    rr(18, 12, 132, 118, 18);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#f0c57d'; ctx.stroke();
    var asset = getAsset(game.item.asset);
    if (asset && asset.ready) drawContain(asset.img, 34, 26, 100, 76);
    else text(game.item.emoji, 84, 65, 60, '#000');
    text((game.roundIndex + 1) + ' / ' + game.queue.length, 84, 117, 13, '#a88958', '800');
  }

  function drawSlots() {
    var slotSize = 54, step = 62, x0 = W / 2 - (game.wordChars.length * step) / 2 + (step - slotSize) / 2, y = 28;
    game.wordChars.forEach(function (ch, i) {
      var x = x0 + i * step;
      var filled = game.slotsFilled[i];
      if (filled) {
        rr(x, y, slotSize, slotSize, 11);
        ctx.fillStyle = 'hsl(' + hueOf(ch) + ',82%,88%)'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = 'hsl(' + hueOf(ch) + ',55%,60%)'; ctx.stroke();
        text(ch, x + slotSize / 2, y + slotSize / 2 + 1, 29, 'hsl(' + hueOf(ch) + ',55%,35%)');
      } else {
        ctx.setLineDash([6, 5]);
        rr(x, y, slotSize, slotSize, 11);
        ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#dccaa5'; ctx.stroke();
        ctx.setLineDash([]);
        text(ch, x + slotSize / 2, y + slotSize / 2 + 1, 26, 'rgba(132,112,83,0.42)');
      }
    });
  }

  // balance-leaf meter: tilts toward whichever side the tower COM is biased,
  // canvas-drawn only (no new image assets, per spec).
  function drawBalanceMeter() {
    if (!game || !bodies.pedestal || game.toweredCount < 1) return;
    var towerState = computeTowerState();
    if (!towerState.com) return;
    var fp = bodies.pedestal.plugin.footprint;
    var mid = (fp.x0 + fp.x1) / 2;
    var half = (fp.x1 - fp.x0) / 2;
    var bias = clamp((towerState.com.x - mid) / Math.max(1, half), -1, 1);
    var lx = 420, ly = 96, lw = 120;
    rr(lx - 6, ly - 12, lw + 12, 26, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fill();
    ctx.save();
    ctx.translate(lx + lw / 2, ly);
    ctx.rotate(bias * 0.35);
    ctx.beginPath();
    ctx.moveTo(-lw / 2, 0); ctx.lineTo(lw / 2, 0);
    ctx.lineWidth = 5;
    ctx.strokeStyle = Math.abs(bias) > 0.6 ? '#ff5c5c' : '#33bf7a';
    ctx.stroke();
    ctx.restore();
    text('🍃', lx + lw + 14, ly, 18, '#3f7d4f', '900');
  }

  function drawFx() {
    game.pops.forEach(function (p) {
      var k = p.t / p.dur;
      ctx.globalAlpha = 1 - k;
      text(p.text, p.x, p.y - 24 * k, p.size, p.color, '900');
      ctx.globalAlpha = 1;
    });
    game.confetti.forEach(function (piece) {
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rot);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.size / 2, -piece.size / 3, piece.size, piece.size * 0.66);
      ctx.restore();
    });
    if (game.roundClear) {
      var scale = reduceMotion ? 1 : 1 + 0.08 * Math.sin(game.clearT * 9) * Math.exp(-game.clearT * 1.8);
      ctx.save();
      ctx.translate(486, 326);
      ctx.scale(scale, scale);
      ctx.font = '900 60px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 10; ctx.strokeStyle = '#fff';
      ctx.strokeText(game.item.emoji + ' ' + game.word, 0, 0);
      ctx.fillStyle = '#ff8a36';
      ctx.fillText(game.item.emoji + ' ' + game.word, 0, 0);
      ctx.restore();
    }
  }

  function drawHud() {
    drawWordCard();
    drawSlots();
    drawBalanceMeter();
    drawPono(888, 82, 39);
    drawBubble();
    if (game.slowT > 0) {
      rr(374, 92, 210, 30, 15);
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
      text('ゆっくりタイム', 479, 107, 17, '#7a5a30', '900');
    }
  }

  function draw() {
    drawBackground();
    drawFloor();
    if (!game) return;
    drawPedestal();
    drawBodies();
    if (scene === 'tutorial') drawTutorialCues();
    drawCrane();
    drawHud();
    drawFx();
  }

  // ============================================================
  // Tutorial (per FINAL_SPEC.tutorialSteps) — a single overlay panel
  // reusing existing hidden/show conventions, no new DOM framework.
  //
  // Non-reading kids cannot rely on the on-screen sentence (tutorialText) or
  // the narration alone, so every step also gets a canvas-drawn visual
  // affordance below (drawTutorialCues): a pulsing ring on the exact zone to
  // tap, a bouncing pointer emoji, a dashed animated "carry this here" path
  // to the pedestal, a highlight on the balance-leaf meter, and a fill-ring
  // progress indicator for the final 3-second stability hold. The text/
  // narration remain a supplement for an accompanying adult, never the
  // primary instruction channel (see RESEARCH.tutorialPatterns).
  // ============================================================
  var TUTORIAL_LINES = [
    null,
    { text: '「ねこ」の もじを つんでいくよ', narr: NARR.tut1, icon: '🐱' },
    { text: 'まんなかを つかむと あんていするよ', narr: NARR.tut2, icon: '👆' },
    { text: 'はしっこを つかむと ぐらぐらするね', narr: NARR.tut3, icon: '👆' },
    { text: 'そっと おろせたね', narr: NARR.tut4, icon: '🤲' },
    { text: 'はっぱが かたむいたら ぐらぐらの あいずだよ', narr: NARR.tut5, icon: '🤲' },
    { text: 'できたね！', narr: NARR.tut6, icon: '⏳' }
  ];

  // 0..1 sine oscillation, sped up automatically if the child hasn't acted
  // for a while (inactivity escalation — nudge with motion, never more text).
  function pulse01(period, phase) {
    var stepStart = game && game.tutorial ? game.tutorial.stepStartTime || 0 : 0;
    var idle = time - stepStart > 7;
    var p = idle ? (period || 1) * 0.55 : (period || 1);
    return 0.5 + 0.5 * Math.sin((time / p) * Math.PI * 2 + (phase || 0));
  }
  function drawPulseRing(x, y, rBase, rAmp, color, lw) {
    var k = pulse01(1.1);
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.4 * k;
    ctx.beginPath();
    ctx.arc(x, y, rBase + rAmp * k, 0, Math.PI * 2);
    ctx.lineWidth = lw || 4;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  }
  function drawBouncingPointer(x, y) {
    var bob = Math.sin(time * 3.4) * 8;
    text('👇', x, y + bob, 28, '#5b4636', '900');
  }

  function drawTutorialCues() {
    if (!game || !game.tutorial || !bodies.pedestal) return;
    var step = game.tutorial.step;
    var kanaBodies = Composite.allBodies(world).filter(function (b) {
      return !b.isStatic && b.plugin && b.plugin.kind === 'kana';
    });

    if (step === 1) {
      // Card-intro step: a soft collective glow on the spawned pieces gives
      // a non-reader something to look at while narration plays, without
      // requiring any action yet.
      kanaBodies.forEach(function (b) {
        drawPulseRing(b.position.x, b.position.y, BLOCK_SIZE * 0.6, 5, 'rgba(255,255,255,0.9)', 3);
      });
      return;
    }

    if (step === 2 || step === 3) {
      // step2 teaches the CENTER grab (stable), step3 teaches the EDGE grab
      // (wobbly) — either kana block is a valid target, so the cue is drawn
      // on both simultaneously, positioned at the exact zone tryGrab()
      // classifies as that grab type (center: |local.x|/halfW<=0.15).
      var isEdge = step === 3;
      var color = isEdge ? '#ff8a36' : '#33bf7a';
      kanaBodies.forEach(function (b) {
        if (game.grab && game.grab.body === b) return; // already being carried
        var localX = isEdge ? bodyHalfExtent(b) * 0.62 : 0;
        var wp = Vector.add(b.position, Vector.rotate({ x: localX, y: 0 }, b.angle));
        drawPulseRing(wp.x, wp.y, 13, 5, color, 4);
        drawBouncingPointer(wp.x, wp.y - 44);
      });
      return;
    }

    if (step === 4 || step === 5) {
      var fp = bodies.pedestal.plugin.footprint;
      var target = { x: (fp.x0 + fp.x1) / 2, y: fp.top - 6 };
      drawPulseRing(target.x, target.y, 28, 8, '#58a8ff', 4);
      var onTower = game.lastOnTowerIds || new Set();
      var from = null;
      if (game.grab) {
        from = game.grab.body.position;
      } else {
        var pending = kanaBodies.find(function (b) { return !onTower.has(b.id); });
        if (pending) from = pending.position;
      }
      if (from) {
        ctx.save();
        ctx.setLineDash([9, 7]);
        ctx.lineDashOffset = -time * 40;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(target.x, target.y);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(88,168,255,0.8)';
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      if (step === 5) {
        // highlight the balance-leaf meter (drawBalanceMeter draws its leaf
        // glyph at lx+lw+14, ly with lx=420, lw=120, ly=96 — kept in sync).
        drawPulseRing(554, 96, 22, 6, '#3f7d4f', 3);
      }
      return;
    }

    if (step === 6) {
      // Non-text progress indicator for the 3-second stability hold: a
      // fill-ring above the pedestal that grows 0->100% with game.stabilityT
      // and visibly drains back down if stability breaks mid-hold.
      var fp2 = bodies.pedestal.plugin.footprint;
      var cx = (fp2.x0 + fp2.x1) / 2, cy = fp2.top - 30;
      var frac = clamp((game.stabilityT || 0) / 3, 0, 1);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 22, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.lineWidth = 7;
      ctx.strokeStyle = frac >= 1 ? '#33bf7a' : '#ff9356';
      ctx.stroke();
      ctx.restore();
    }
  }

  function startTutorial() {
    var cfg = { pedestalWidth: 300, decoys: 0, junk: 0, maxKana: 2, slip: 999, junkSlip: 999, windGust: false, rounds: 1, label: 'チュートリアル', kanaHint: '' };
    game = {
      cfg: cfg, levelKey: selectedLevel,
      queue: [{ word: 'ねこ', emoji: '🐱' }],
      roundIndex: 0, done: [],
      bubble: '', mood: 'normal', moodT: 0, blinkT: 1.8, slowT: 0, stabilityT: 0,
      tutorial: { step: 1, achievedCenter: false, achievedEdge: false }
    };
    startRound();
    setScene('tutorial');
    setHidden(titleOverlay, true);
    setHidden(resultOverlay, true);
    setHidden(confirmOverlay, true);
    setHidden(tutorialOverlay, false);
    updateButtons();
    showTutorialStep(1);
  }

  function showTutorialStep(step) {
    game.tutorial.step = step;
    game.tutorial.stepStartTime = time; // for pulse01's inactivity speed-up
    var line = TUTORIAL_LINES[step];
    if (tutorialText) tutorialText.textContent = line.text;
    if (tutorialIcon) tutorialIcon.textContent = line.icon || '';
    narrate(line.narr);
    // Only step 1 (the non-interactive card-intro, nothing to do yet) shows
    // an explicit "next" button. Every later step is gated on a REAL
    // grab/settle/stability event (tutorialOnGrab/tutorialOnSettle/
    // tutorialOnStable below) — previously tutorialNextBtn stayed clickable
    // on every step, letting a child bypass the gating and blow through
    // steps 2-6 without ever doing the actual action being taught.
    if (tutorialNextBtn) tutorialNextBtn.classList.toggle('hidden', step !== 1);
    if (tutorialSkipBtn) tutorialSkipBtn.classList.toggle('hidden', true); // never a hard skip mid-sequence
  }

  function advanceTutorial() {
    if (!game || !game.tutorial) return;
    var step = game.tutorial.step;
    if (step >= 6) {
      writeProgress({ tutorialDone: true });
      setHidden(tutorialOverlay, true);
      startGame(selectedLevel);
      return;
    }
    showTutorialStep(step + 1);
  }

  function tutorialOnGrab(grabType) {
    if (!game || !game.tutorial) return;
    if (game.tutorial.step === 2 && grabType === 'center') { game.tutorial.achievedCenter = true; setTimeout(advanceTutorial, 550); }
    if (game.tutorial.step === 3 && grabType === 'edge') { game.tutorial.achievedEdge = true; setTimeout(advanceTutorial, 550); }
  }
  function tutorialOnSettle() {
    if (!game || !game.tutorial) return;
    if (game.tutorial.step === 4 && game.toweredCount >= 1) setTimeout(advanceTutorial, 500);
    if (game.tutorial.step === 5 && game.toweredCount >= 2) setTimeout(advanceTutorial, 500);
  }
  function tutorialOnStable() {
    if (!game || !game.tutorial) return;
    if (game.tutorial.step === 6) advanceTutorial();
  }

  // ============================================================
  // Main loop (Engine.update via fixed-step accumulator, max 3 catch-up
  // steps, accumulator hard-clamped at 50ms — spiral-of-death guard)
  // ============================================================
  function loop(ts) {
    var frameMs = Math.min(250, ts - last || 16.6);
    last = ts;
    time += frameMs / 1000;

    if (scene === 'playing' || scene === 'tutorial') {
      update(frameMs / 1000);
      accumulator = Math.min(MAX_ACC, accumulator + frameMs);
      var steps = 0;
      while (accumulator >= STEP && steps < MAX_STEPS) {
        Engine.update(engine, STEP);
        accumulator -= STEP;
        steps += 1;
      }
      if (game && game.tutorial) {
        var towerState = computeTowerState();
        var footprint = bodies.pedestal.plugin.footprint;
        var central = towerState.com && towerState.com.x >= footprint.x0 + (footprint.x1 - footprint.x0) * 0.2 &&
          towerState.com.x <= footprint.x1 - (footprint.x1 - footprint.x0) * 0.2;
        if (game.tutorial.step === 6 && game.wordChars.every(function (_, i) { return game.slotsFilled[i]; }) && central && game.stabilityT >= 3) {
          tutorialOnStable();
        }
      }
    }
    draw();
    window.requestAnimationFrame(loop);
  }

  // ============================================================
  // Input wiring
  // ============================================================
  canvas.addEventListener('pointerdown', function (ev) {
    if (scene !== 'playing' && scene !== 'tutorial') return;
    initAudio();
    var point = pointerToWorld(ev.clientX, ev.clientY);
    var wasGrabbed = !!(game && game.grab);
    tryGrab(point);
    if (game && game.grab && !wasGrabbed) tutorialOnGrab(game.grab.grabType);
    try { canvas.setPointerCapture(ev.pointerId); } catch (err) {}
  });
  canvas.addEventListener('pointermove', function (ev) {
    if (!game || !game.grab) return;
    updateGrab(pointerToWorld(ev.clientX, ev.clientY));
  });
  function handlePointerEnd(ev) {
    if (!game || !game.grab) return;
    releaseGrab(false);
    setTimeout(tutorialOnSettle, 350);
  }
  canvas.addEventListener('pointerup', handlePointerEnd);
  canvas.addEventListener('pointercancel', handlePointerEnd);

  document.querySelectorAll('[data-level]').forEach(function (btn) {
    btn.addEventListener('click', function () { initAudio(); startGame(btn.getAttribute('data-level')); });
  });

  dropBtn.addEventListener('click', function () {
    if (game && game.grab) releaseGrab(false);
  });
  hintBtn.addEventListener('click', function () {
    if (!game || game.roundClear) return;
    initAudio();
    game.slowT = 4.5;
    setBubble('ゆっくり いくよ', 'happy');
    playSfx('tap');
  });
  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-label', soundOn ? 'おと' : 'おと なし');
    if (soundOn) initAudio();
    playSfx('tap');
  });
  homeBtn.addEventListener('click', function () {
    if (scene === 'playing') {
      setHidden(confirmOverlay, false);
      setScene('confirm');
      updateButtons();
    } else if (scene === 'tutorial') {
      window.location.href = '../play.html';
    } else {
      window.location.href = '../play.html';
    }
  });
  continueBtn.addEventListener('click', function () {
    setHidden(confirmOverlay, true);
    setScene('playing');
    updateButtons();
    playSfx('tap');
  });
  againBtn.addEventListener('click', function () { initAudio(); startGame(selectedLevel); });
  levelsBtn.addEventListener('click', function () { initAudio(); showTitle(); playSfx('tap'); });
  if (tutorialNextBtn) {
    tutorialNextBtn.addEventListener('click', function () { initAudio(); advanceTutorial(); });
  }

  window.addEventListener('keydown', function (ev) {
    if (ev.code === 'Space' || ev.code === 'Enter') {
      ev.preventDefault();
      if (game && game.grab) releaseGrab(false);
    }
    if (ev.code === 'Escape' && scene === 'confirm') {
      setHidden(confirmOverlay, true);
      setScene('playing');
      updateButtons();
    }
  });

  // ============================================================
  // Boot
  // ============================================================
  buildEngine();
  showTitle();
  window.requestAnimationFrame(loop);
})();
