(function () {
  'use strict';

  const W = 960;
  const H = 540;
  const BLOCK = 62;
  const FLOOR = 504;
  const RAIL_Y = 132;
  const TIP_HOME = 208;
  const MOVE_L = 195;
  const MOVE_R = 760;
  // round-4 pile pivot (graft B-5): single tunable slowdown knob. Cutting these 3
  // named speed consts + the LEVELS.*.speed fields below by the same factor keeps
  // the relative easy/normal/challenge feel while slowing overall pace ~40% per
  // user request. Staging can retune pace by changing this one number.
  const PACE_MULT = 0.6;
  const DESCEND_SPEED = Math.round(560 * PACE_MULT);
  const ASCEND_SPEED = Math.round(520 * PACE_MULT);
  const CARRY_SPEED = Math.round(315 * PACE_MULT);
  const DROP_NUDGE = 18;
  const PERFECT_GRAB = 10;
  const TEXT_CHUTE = { x: 104, y: 432, boxY: 408, label: 'もじ', fill: '#ff9eb8', stroke: '#df7898' };
  const CLEANUP_CHUTE = { x: 738, y: 356, boxY: 332, label: 'かたづけ', fill: '#8ed7ff', stroke: '#54a6d8' };
  const CHUTE = TEXT_CHUTE;
  const COLS = 9; // legacy 9-column grid width; only pickCol()/buildPile() (superseded, see spawnPile()) still read this
  const SLOT = { x0: 178, y: 28, s: 54, step: 62 };
  const FONT = '"Zen Maru Gothic","Hiragino Maru Gothic ProN","Yu Gothic",sans-serif';
  const STORAGE_KEY = 'pono_mojicrane_v1';
  const KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ';

  // round-4 pile pivot (graft B-5): tunable pile-spawn constants. PILE_MIN/PILE_MAX
  // bound cfg.pileSize (see LEVELS below); PILE_TILT_MAX caps the visual rest tilt
  // at ±30° per user request; PRESETTLE_STEPS is the
  // fixed-dt pre-round settle budget (forced-sleep safety valve lives in js/phys-matter.js).
  const PILE_MIN = 15;
  const PILE_MAX = 20;
  const PILE_TILT_MAX = Math.PI / 6; // ±30°
  // round-5: presettle budget raised 180->360 (6 simulated seconds at fixed 1/60
  // dt) to give the pile contact solver (round-5': Matter.js, via js/phys-matter.js)
  // enough iterations to converge on pathological spawn overlaps before first paint; still bounded/
  // non-hanging, and forceSettleAll() is the hard safety valve if it isn't enough.
  const PRESETTLE_STEPS = 360;
  // round-4 Phase 2: from this round index onward (0-based; round 3+) needed kana
  // are bundled 2-at-a-time into a single "duo" block (see pairNeeded()) instead of
  // one block per character.
  const DUO_FROM_ROUND = 2;
  const DUO_GRAB = 60; // grab radius for the wider two-character block
  const PILE_MIN_X = MOVE_L + 25;
  const PILE_MAX_X = MOVE_R - 25;

  const LEVELS = {
    easy: {
      label: 'やさしい',
      rounds: 3,
      speed: Math.round(112 * PACE_MULT),
      sway: 0,
      grab: 44,
      slip: 999,
      decoys: 5, // round-4: superseded by pileSize (decoy count derived from pileSize - needed - junk); kept for reference
      maxHeight: 2, // round-4: superseded by pile support-link model (see spawnPile()); kept for reference
      junkBase: 0,
      junkMax: 1,
      junkShapes: ['wide'],
      junkSlip: 999,
      slotHint: 'all',
      blockGlow: true,
      helpUses: 99,
      pileSize: 15 // round-4: total bodies pre-spawned into the pile at round start
    },
    normal: {
      label: 'ふつう',
      rounds: 4,
      speed: Math.round(152 * PACE_MULT),
      sway: 8,
      grab: 38,
      slip: 28,
      decoys: 7,
      maxHeight: 3,
      junkBase: 1,
      junkMax: 2,
      junkShapes: ['wide', 'el'],
      junkSlip: 36,
      slotHint: 'next',
      blockGlow: false,
      helpUses: 2,
      pileSize: 17
    },
    challenge: {
      label: 'チャレンジ',
      rounds: 5,
      speed: Math.round(184 * PACE_MULT),
      sway: 14,
      grab: 34,
      slip: 24,
      decoys: 9,
      maxHeight: 3,
      junkBase: 1,
      junkMax: 3,
      junkShapes: ['wide', 'el', 'tee'],
      junkSlip: 32,
      slotHint: 'none',
      blockGlow: false,
      helpUses: 1,
      pileSize: 20
    }
  };

  if (window.MiniPhys) window.MiniPhys.configure({ floorY: FLOOR, blockSize: BLOCK });

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const titleOverlay = document.getElementById('titleOverlay');
  const confirmOverlay = document.getElementById('confirmOverlay');
  const resultOverlay = document.getElementById('resultOverlay');
  const dropBtn = document.getElementById('dropBtn');
  const chuteLeftBtn = document.getElementById('chuteLeftBtn');
  const chuteRightBtn = document.getElementById('chuteRightBtn');
  const homeBtn = document.getElementById('homeBtn');
  const soundBtn = document.getElementById('soundBtn');
  const hintBtn = document.getElementById('hintBtn');
  const continueBtn = document.getElementById('continueBtn');
  const againBtn = document.getElementById('againBtn');
  const levelsBtn = document.getElementById('levelsBtn');
  const resultTitle = document.getElementById('resultTitle');
  const resultStars = document.getElementById('resultStars');
  const wordCards = document.getElementById('wordCards');
  const liveRegion = document.getElementById('liveRegion');

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const colX = (i) => 190 + i * 63;
  const slotX = (i) => SLOT.x0 + i * SLOT.step;

  let scene = 'title';
  let selectedLevel = 'easy';
  let game = null;
  let time = 0;
  let last = 0;
  let audioCtx = null;
  let soundOn = true;
  const assetCache = new Map();
  const JUNK_SHAPES = {
    wide: {
      cells: [[-0.48, 0], [0.48, 0]],
      hue: 206,
      grab: 70,
      perfect: 16,
      centerDx: 0
    },
    el: {
      cells: [[-0.34, -0.34], [-0.34, 0.44], [0.44, 0.44]],
      hue: 36,
      grab: 66,
      perfect: 14,
      centerDx: -8
    },
    tee: {
      cells: [[-0.55, -0.28], [0, -0.28], [0.55, -0.28], [0, 0.52]],
      hue: 154,
      grab: 72,
      perfect: 13,
      centerDx: 0
    }
  };

  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function chars(word) {
    return Array.from(String(word || '').normalize('NFC'));
  }

  function escapeAttr(value) {
    return String(value || '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function getAsset(src) {
    if (!src) return null;
    if (assetCache.has(src)) return assetCache.get(src);
    const entry = { img: new Image(), ready: false, failed: false };
    entry.img.onload = () => { entry.ready = true; };
    entry.img.onerror = () => { entry.failed = true; };
    entry.img.decoding = 'async';
    entry.img.src = src;
    assetCache.set(src, entry);
    return entry;
  }

  function preloadWordAssets(list) {
    list.forEach((item) => {
      if (item && item.asset) getAsset(item.asset);
    });
  }

  function hueOf(ch) {
    return (ch.codePointAt(0) * 47) % 360;
  }

  function isJunk(block) {
    return block && block.kind === 'junk';
  }

  // round-4 Phase 2: a "duo" block bundles two consecutive needed kana (block.chs)
  // into one physical body instead of block.ch holding a single character.
  function isDuo(block) {
    return block && block.kind === 'duo';
  }

  // Kana characters a block represents, for needed-kana lookups shared by junk/duo/
  // plain blocks (junk carries none).
  function blockKanaChars(block) {
    if (isJunk(block)) return [];
    if (isDuo(block)) return block.chs;
    return [block.ch];
  }

  function makeJunk(shapeKey) {
    const shape = JUNK_SHAPES[shapeKey] || JUNK_SHAPES.wide;
    return {
      kind: 'junk',
      shapeKey,
      shape,
      hue: shape.hue,
      wobble: 0,
      tilt: 0
    };
  }

  function junkCountForRound(cfg, roundIndex) {
    return Math.min(cfg.junkMax || 0, Math.max(0, (cfg.junkBase || 0) + roundIndex));
  }

  function blockGrabRadius(block) {
    if (isJunk(block)) return block.shape.grab;
    if (isDuo(block)) return DUO_GRAB;
    return game.cfg.grab;
  }

  function blockBalanceCenterX(x, block) {
    return x + (isJunk(block) ? block.shape.centerDx : 0);
  }

  function blockSlipLimit(block) {
    if (isJunk(block)) return game.cfg.junkSlip || game.cfg.slip;
    return game.cfg.slip;
  }

  function dropZoneFor(block) {
    return isJunk(block) ? CLEANUP_CHUTE : TEXT_CHUTE;
  }

  function setHidden(el, hidden) {
    el.classList.toggle('hidden', !!hidden);
  }

  function setScene(next) {
    scene = next;
    document.body.setAttribute('data-scene', next);
  }

  function announce(text) {
    liveRegion.textContent = text;
  }

  function initAudio() {
    if (!soundOn) return;
    try {
      if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } catch (err) {
      audioCtx = null;
    }
  }

  function tone(freq, duration, type, volume, delay, endFreq) {
    if (!audioCtx || !soundOn) return;
    try {
      const t0 = audioCtx.currentTime + (delay || 0);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
      gain.gain.setValueAtTime(volume || 0.12, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.04);
    } catch (err) {}
  }

  const sfx = {
    tap: () => tone(520, 0.07, 'triangle', 0.08),
    grab: () => { tone(310, 0.08, 'square', 0.06); tone(430, 0.08, 'square', 0.05, 0.06); },
    miss: () => tone(520, 0.25, 'sine', 0.09, 0, 170),
    slip: () => tone(620, 0.28, 'sine', 0.09, 0, 150),
    drop: () => tone(700, 0.14, 'sine', 0.08, 0, 260),
    ok: () => { tone(660, 0.1, 'triangle', 0.11); tone(880, 0.14, 'triangle', 0.11, 0.08); },
    no: () => { tone(330, 0.14, 'sine', 0.08); tone(262, 0.2, 'sine', 0.08, 0.12); },
    clear: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, i * 0.1)); }
  };

  function playSfx(name) {
    if (sfx[name]) sfx[name]();
  }

  function vibrate(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (err) {}
  }

  function readProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { cleared: [] };
    } catch (err) {
      return { cleared: [] };
    }
  }

  function writeProgress(words) {
    try {
      const state = readProgress();
      const map = {};
      (state.cleared || []).forEach((item) => { map[item.word] = item; });
      words.forEach((item) => { map[item.word] = { word: item.word, emoji: item.emoji, at: Date.now() }; });
      state.cleared = Object.keys(map).map((key) => map[key]).slice(-60);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {}
  }

  function setBubble(text, mood) {
    if (!game) return;
    game.bubble = text;
    game.mood = mood || 'normal';
    game.moodT = mood ? 1.4 : game.moodT;
    announce(text.replace(/[「」]/g, ''));
  }

  function hintText() {
    if (!game || !game.wordChars[game.next]) return '';
    const ch = game.wordChars[game.next];
    if (game.assist > 0 || game.cfg.slotHint !== 'none') return 'つぎは「' + ch + '」だよ';
    return 'えを みて もじを さがそう';
  }

  function wrongText(ch) {
    const need = game.wordChars[game.next];
    const later = game.wordChars.slice(game.next + 1).indexOf(ch) >= 0;
    if (later) return '「' + ch + '」は あとで つかうよ。つぎは「' + need + '」';
    return 'それは「' + ch + '」だよ。「' + need + '」を さがそう';
  }

  function chooseWords(levelKey) {
    const list = (window.PonoMojicraneWords && window.PonoMojicraneWords[levelKey]) || [];
    const cfg = LEVELS[levelKey];
    const queue = shuffle(list.slice()).slice(0, cfg.rounds);
    preloadWordAssets(queue);
    return queue;
  }

  // SUPERSEDED (round-4 pile pivot): pickCol()/buildPile() built the old 9-column
  // grid (game.cols). Kept only for reference/rollback — not called anywhere.
  // The active round-start spawn is spawnPile() below, backed by MiniPhys
  // resting[]/restingBodies() instead of game.cols.
  function pickCol(cols, maxHeight) {
    const weights = [1, 2, 3, 4, 5, 4, 3, 2, 1];
    for (let t = 0; t < 90; t += 1) {
      let r = Math.random() * 25;
      let i = 0;
      while (i < weights.length - 1 && r > weights[i]) {
        r -= weights[i];
        i += 1;
      }
      if (cols[i].blocks.length < maxHeight) return i;
    }
    for (let i = 0; i < cols.length; i += 1) {
      if (cols[i].blocks.length < maxHeight) return i;
    }
    return 0;
  }

  function buildPile(word, cfg, roundIndex) {
    const cols = Array.from({ length: COLS }, (_, i) => ({ x: colX(i), blocks: [] }));
    const needed = chars(word);
    const decoys = shuffle(chars(KANA).filter((ch) => needed.indexOf(ch) < 0)).slice(0, cfg.decoys);
    decoys.forEach((ch) => {
      const i = pickCol(cols, Math.max(1, cfg.maxHeight - 1));
      cols[i].blocks.push({ ch, hue: hueOf(ch), wobble: 0 });
    });
    shuffle(needed.slice()).forEach((ch) => {
      const i = pickCol(cols, cfg.maxHeight);
      cols[i].blocks.push({ ch, hue: hueOf(ch), wobble: 0 });
    });
    const shapes = cfg.junkShapes || [];
    const junkCount = junkCountForRound(cfg, roundIndex || 0);
    for (let n = 0; n < junkCount; n += 1) {
      const i = pickCol(cols, cfg.maxHeight + 1);
      cols[i].blocks.push(makeJunk(shapes[n % shapes.length] || 'wide'));
    }
    return cols;
  }

  // --- round-4 pile pivot: pre-spawned tilted pile, backed by MiniPhys resting[] ---
  // (replaces the 9-column buildPile()/game.cols model above)

  // Runs a bounded fixed-dt loop (no rAF dependency) so the pile is already asleep
  // before the first paint — "山は最初から静止して見える". PRESETTLE_STEPS is a hard
  // cap so a pathological configuration can never hang the round-start call.
  function presettlePile() {
    if (!window.MiniPhys) return;
    const dt = 1 / 60;
    const farTip = { x: -9999, y: -9999 };
    for (let step = 0; step < PRESETTLE_STEPS; step += 1) {
      MiniPhys.step(dt, farTip, { cfg: game.cfg, slowT: 0, onSettle: physOnPileSettle, onChuteCatch: () => {} });
      if (!MiniPhys.bodiesForDraw().length) break;
    }
    // round-5: force-sleep safety valve — any body that never converged inside the
    // step budget gets snapped onto its support so the pile is never visibly
    // floating/broken at first paint.
    if (window.MiniPhys.forceSettleAll) MiniPhys.forceSettleAll();
    // round-5 sanity check: presettle must never leave a floater or a pathological
    // tilt. Non-fatal console warning only, so a bad spawn config surfaces during
    // QA instead of shipping a silently broken-looking pile.
    if (window.MiniPhys.restingBodies) {
      const stacksHeightGuard = BLOCK * (PILE_MAX + 2);
      MiniPhys.restingBodies().forEach((b) => {
        if (b.y < FLOOR - stacksHeightGuard) {
          console.warn('[mojicrane] presettle: body above expected pile height', b.id, b.y);
        }
        if (Math.abs(b.angle) > Math.PI / 4) {
          console.warn('[mojicrane] presettle: body angle exceeds 45deg', b.id, b.angle);
        }
      });
    }
  }

  function physOnPileSettle(body) {
    if (body.target && body.target.type === 'pile') body.block.wobble = 1;
  }

  // graft B-3a (simplified): a needed kana buried under 3+ other resting bodies is
  // re-dropped from a modest height near the top of the pile so it resettles less
  // deeply buried. Bounded to 3 passes — cannot loop forever, and even if a body
  // stays buried afterward the toss-back x-bias (graft B-3b, see pileTossX()) keeps
  // giving the player future chances, so no hard starvation lock is possible.
  function antiStarvationRescue(needed) {
    if (!window.MiniPhys || !needed.length) return;
    for (let pass = 0; pass < 3; pass += 1) {
      const resting = MiniPhys.restingBodies();
      const coveredCount = new Map();
      resting.forEach((b) => {
        (b.supports || []).forEach((sid) => coveredCount.set(sid, (coveredCount.get(sid) || 0) + 1));
      });
      const buried = resting.filter((b) => !isJunk(b.block) && blockKanaChars(b.block).some((ch) => needed.indexOf(ch) >= 0) && (coveredCount.get(b.id) || 0) >= 3);
      if (!buried.length) return;
      buried.forEach((b) => {
        MiniPhys.removeResting(b);
        const x = PILE_MIN_X + Math.random() * (PILE_MAX_X - PILE_MIN_X);
        const spawned = MiniPhys.spawnFalling(b.block, x, FLOOR - BLOCK * 3, 0, 0, 0, {
          target: { type: 'pile' },
          keepTilt: true,
          wallMinX: PILE_MIN_X - 20,
          wallMaxX: PILE_MAX_X + 20
        });
        spawned.angle = (Math.random() * 2 - 1) * PILE_TILT_MAX;
      });
      presettlePile();
    }
  }

  // round-4 Phase 2: bundle needed kana 2-at-a-time (in word order) into single
  // "duo" blocks so evaluate() can match them against game.wordChars[next..next+1].
  // An odd trailing character stays a plain single-kana block.
  function pairNeeded(neededChars) {
    const blocks = [];
    for (let i = 0; i < neededChars.length; i += 2) {
      if (i + 1 < neededChars.length) {
        blocks.push({ kind: 'duo', chs: [neededChars[i], neededChars[i + 1]], hue: hueOf(neededChars[i]), wobble: 0 });
      } else {
        blocks.push({ ch: neededChars[i], hue: hueOf(neededChars[i]), wobble: 0 });
      }
    }
    return blocks;
  }

  function spawnPile(word, cfg, roundIndex) {
    if (!window.MiniPhys) return; // reduceMotion/no-physics fallback: see tossToPile()/drawPile()
    const needed = chars(word);
    const junkCount = junkCountForRound(cfg, roundIndex || 0);
    const targetTotal = clamp(cfg.pileSize || (needed.length + (cfg.decoys || 0) + junkCount), PILE_MIN, PILE_MAX);
    const blocks = (roundIndex || 0) >= DUO_FROM_ROUND
      ? pairNeeded(needed)
      : needed.map((ch) => ({ ch, hue: hueOf(ch), wobble: 0 }));
    const decoyPool = shuffle(chars(KANA).filter((ch) => needed.indexOf(ch) < 0));
    let di = 0;
    while (blocks.length < targetTotal - junkCount && di < decoyPool.length) {
      blocks.push({ ch: decoyPool[di], hue: hueOf(decoyPool[di]), wobble: 0 });
      di += 1;
    }
    const shapes = cfg.junkShapes || [];
    for (let n = 0; n < junkCount; n += 1) {
      blocks.push(makeJunk(shapes[n % shapes.length] || 'wide'));
    }
    shuffle(blocks);
    blocks.forEach((block, i) => {
      const x = PILE_MIN_X + Math.random() * (PILE_MAX_X - PILE_MIN_X);
      const y = FLOOR - BLOCK * (0.6 + Math.random() * 2.4) - i * 2;
      const spawned = MiniPhys.spawnFalling(block, x, y, (Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 0.6, {
        target: { type: 'pile' },
        keepTilt: true,
        wallMinX: PILE_MIN_X - 20,
        wallMaxX: PILE_MAX_X + 20
      });
      spawned.angle = (Math.random() * 2 - 1) * PILE_TILT_MAX;
    });
    presettlePile();
    antiStarvationRescue(needed);
  }

  // ids of resting bodies that some OTHER resting body rests on (i.e. buried/covered)
  function coveredRestingIds() {
    const set = new Set();
    if (!window.MiniPhys) return set;
    MiniPhys.restingBodies().forEach((b) => {
      (b.supports || []).forEach((sid) => set.add(sid));
    });
    return set;
  }

  // graft B-3b (simplified): pick an x for a toss-back landing that avoids re-burying
  // whichever remaining-needed kana is currently least covered (i.e. most reachable).
  function shallowestNeededX() {
    if (!window.MiniPhys) return null;
    const need = game.wordChars.slice(game.next);
    if (!need.length) return null;
    const resting = MiniPhys.restingBodies();
    const coveredCount = new Map();
    resting.forEach((b) => {
      (b.supports || []).forEach((sid) => coveredCount.set(sid, (coveredCount.get(sid) || 0) + 1));
    });
    let best = null;
    let bestCover = Infinity;
    resting.forEach((b) => {
      if (isJunk(b.block) || !blockKanaChars(b.block).some((ch) => need.indexOf(ch) >= 0)) return;
      const cover = coveredCount.get(b.id) || 0;
      if (cover < bestCover) { bestCover = cover; best = b; }
    });
    return best ? best.x : null;
  }

  function pileTossX() {
    const avoidX = shallowestNeededX();
    for (let tries = 0; tries < 8; tries += 1) {
      const x = PILE_MIN_X + Math.random() * (PILE_MAX_X - PILE_MIN_X);
      if (avoidX == null || Math.abs(x - avoidX) > 80) return x;
    }
    return PILE_MIN_X + Math.random() * (PILE_MAX_X - PILE_MIN_X);
  }

  // "small nudge impulse to the neighboring bodies so the pile visibly shifts" —
  // scoped to the existing wobble-jiggle visual (block.wobble, decayed each frame)
  // rather than a full impulse solver, since neighbors are asleep/static resting
  // bodies until their own topple check (computePileTopple) wakes them.
  function nudgeNeighborsOnGrab(removedBody) {
    if (!window.MiniPhys) return;
    const range = (removedBody.w || BLOCK) * 1.5;
    MiniPhys.restingBodies().forEach((b) => {
      if (Math.abs(b.x - removedBody.x) <= range) {
        b.block.wobble = Math.max(b.block.wobble || 0, 0.6);
      }
    });
  }

  function resetClaw() {
    game.claw = {
      tx: 480,
      dir: Math.random() < 0.5 ? -1 : 1,
      swayT: Math.random() * 4,
      off: 0,
      tipX: 480,
      tipY: TIP_HOME,
      open: 1,
      phase: 'move',
      block: null,
      col: null,
      grabBody: null,
      tgtY: 0,
      t: 0,
      slip: false,
      slipAt: 0,
      carryFrom: 0,
      targetZone: TEXT_CHUTE,
      targetX: TEXT_CHUTE.x
    };
  }

  function startRound() {
    const item = game.queue[game.roundIndex];
    game.item = item;
    game.word = item.word;
    game.wordChars = chars(item.word);
    game.slots = game.wordChars.map((ch) => ({ ch, filled: false, t: 0 }));
    game.next = 0;
    game.cleaned = 0;
    game.flyers = [];
    if (window.MiniPhys) MiniPhys.reset();
    spawnPile(item.word, game.cfg, game.roundIndex); // round-4: pile is now stored in MiniPhys resting[], not game.cols
    game.pops = [];
    game.confetti = [];
    game.mistakes = 0;
    game.assist = 0;
    game.roundClear = false;
    game.clearT = 0;
    game.hintsLeft = game.cfg.helpUses;
    game.awaitingSortDirection = false;
    hintBtn.classList.remove('is-used');
    updateHintButton();
    resetClaw();
    if (junkCountForRound(game.cfg, game.roundIndex) > 0) {
      setBubble('じゃまは みぎで おかたづけ。' + hintText());
    } else {
      setBubble(hintText());
    }
  }

  function startGame(levelKey) {
    selectedLevel = levelKey;
    const cfg = LEVELS[levelKey] || LEVELS.easy;
    game = {
      cfg,
      levelKey,
      queue: chooseWords(levelKey),
      roundIndex: 0,
      done: [],
      bubble: '',
      mood: 'normal',
      moodT: 0,
      blinkT: 1.8,
      slowT: 0,
      awaitingSortDirection: false
    };
    startRound();
    setScene('playing');
    setHidden(titleOverlay, true);
    setHidden(resultOverlay, true);
    setHidden(confirmOverlay, true);
    updateButtons();
    playSfx('tap');
  }

  function showTitle() {
    setScene('title');
    game = null;
    setHidden(titleOverlay, false);
    setHidden(resultOverlay, true);
    setHidden(confirmOverlay, true);
    updateButtons();
  }

  function showResult() {
    setScene('result');
    resultTitle.textContent = 'できたね';
    const stars = selectedLevel === 'easy' ? '★★★' : (game.done.length >= game.cfg.rounds ? '★★★' : '★★');
    resultStars.textContent = stars;
    wordCards.innerHTML = game.done.map((item) => {
      const media = item.asset
        ? '<img class="emoji word-img" src="' + escapeAttr(item.asset) + '" alt="">'
        : '<span class="emoji">' + item.emoji + '</span>';
      return '<div class="word-card">' + media + '<span class="word">' + item.word + '</span></div>';
    }).join('');
    writeProgress(game.done);
    setHidden(resultOverlay, false);
    playSfx('clear');
    updateButtons();
  }

  function updateButtons() {
    const canDrop = scene === 'playing' && game && game.claw && game.claw.phase === 'move' && !game.roundClear;
    const sortWait = scene === 'playing' && game && game.claw && game.claw.phase === 'carry' &&
      game.claw.targetZone === null && !!game.claw.block;
    dropBtn.disabled = !canDrop;
    setHidden(dropBtn, sortWait);
    setHidden(chuteLeftBtn, !sortWait);
    setHidden(chuteRightBtn, !sortWait);
    hintBtn.disabled = !(scene === 'playing' && game && game.hintsLeft > 0 && game.next < game.wordChars.length);
  }

  // round-5 sort lever: child (or LEFT/RIGHT / A/D keys) picks a chute once the
  // crane has ascended with a grabbed block. Fully guarded so stray clicks/keys
  // outside the sort-wait window are no-ops.
  function chooseChute(side) {
    if (scene !== 'playing' || !game || !game.claw || game.claw.phase !== 'carry') return;
    if (game.claw.targetZone !== null || !game.claw.block) return;
    game.claw.targetZone = side === 'left' ? TEXT_CHUTE : CLEANUP_CHUTE;
    game.claw.targetX = game.claw.targetZone.x;
    game.awaitingSortDirection = false;
    updateButtons();
    playSfx('tap');
  }

  function updateHintButton() {
    if (!game) {
      hintBtn.textContent = 'ヒント';
      return;
    }
    hintBtn.textContent = game.hintsLeft > 0 ? 'ヒント' : 'ヒント';
    hintBtn.classList.toggle('is-used', game.hintsLeft <= 0);
  }

  function pop(x, y, text, color, size) {
    game.pops.push({ x, y, text, color, size: size || 22, t: 0, dur: 0.85 });
  }

  function burstConfetti(count) {
    const colors = ['#ff6381', '#ff9f43', '#ffd166', '#33bf7a', '#58a8ff', '#9b72e7'];
    const n = reduceMotion ? Math.ceil(count * 0.35) : count;
    for (let i = 0; i < n; i += 1) {
      game.confetti.push({
        x: 160 + Math.random() * 620,
        y: -20 - Math.random() * 120,
        vx: (Math.random() - 0.5) * 90,
        vy: 125 + Math.random() * 170,
        rot: Math.random() * 6.3,
        vr: (Math.random() - 0.5) * 8,
        color: pick(colors),
        size: 5 + Math.random() * 6
      });
    }
  }

  // SUPERSEDED (round-4 pile pivot): safeCol() picked a game.cols index; the pile
  // is no longer a column grid. Kept for reference/rollback — not called anywhere.
  function safeCol() {
    const need = game.wordChars.slice(game.next);
    const candidates = [];
    game.cols.forEach((col, i) => {
      const top = col.blocks[col.blocks.length - 1];
      if (col.blocks.length < game.cfg.maxHeight && (!top || need.indexOf(top.ch) < 0)) candidates.push(i);
    });
    if (candidates.length) return pick(candidates);
    return pickCol(game.cols, game.cfg.maxHeight);
  }

  // Runs a bounded fixed-dt loop for a single body only (does not touch any other
  // concurrently-falling body's timing) until it settles into resting[] or the step
  // budget runs out. Used by tossToPile()'s reduceMotion path (B-6: instant-snap
  // placement, no visible flight) so the block is never lost mid-air.
  function settleOneBody(body, maxSteps) {
    if (!window.MiniPhys || !body) return;
    const farTip = { x: -9999, y: -9999 };
    for (let s = 0; s < maxSteps; s += 1) {
      if (MiniPhys.restingBodies().indexOf(body) !== -1) return;
      MiniPhys.step(1 / 60, farTip, { cfg: game.cfg, slowT: 0, onSettle: physOnPileSettle, onChuteCatch: () => {} });
    }
  }

  function tossToPile(block, fx, fy, vel) {
    if (!window.MiniPhys) {
      // true no-physics fallback (script failed to load): the whole grab/carry
      // mechanic is already MiniPhys-dependent post round-3, so this is a no-op
      // beyond the settle-jiggle visual (matches the pre-existing degradation level).
      block.wobble = 1;
      return;
    }
    const x = pileTossX();
    if (reduceMotion) {
      // B-6: instant-snap placement, no visible flight animation
      const body = MiniPhys.spawnFalling(block, x, FLOOR - BLOCK * 1.5, 0, 0, 0, {
        target: { type: 'pile' },
        keepTilt: true,
        wallMinX: PILE_MIN_X - 20,
        wallMaxX: PILE_MAX_X + 20
      });
      body.angle = (Math.random() * 2 - 1) * PILE_TILT_MAX;
      settleOneBody(body, 60);
      return;
    }
    const v = vel || {};
    MiniPhys.spawnFalling(block, fx, fy, v.vx || 0, v.vy || 0, v.omega || 0, {
      target: { type: 'pile', homingX: x },
      keepTilt: true,
      wallMinX: PILE_MIN_X - 20,
      wallMaxX: PILE_MAX_X + 20
    });
  }

  // physics settle hooks (mojicrane round-3/4): reconcile a settled/caught body back
  // into the existing logical stores. For 'pile' targets, MiniPhys resting[] is
  // itself the store (see spawnFalling/stepFalling in js/phys-matter.js) — this hook only
  // needs to trigger the settle wobble visual. 'chute' is handled by physOnChuteCatch.
  function physOnSettle(body) {
    if (body.target && body.target.type === 'column' && body.target.col) {
      body.target.col.blocks.push(body.block);
      body.block.wobble = 1;
    } else if (body.target && body.target.type === 'pile') {
      body.block.wobble = 1;
    }
  }

  function physOnChuteCatch(body) {
    evaluate(body.block, body.target && body.target.zone);
  }

  function markPhysCueSeen() {
    try {
      const state = readProgress();
      if (state.physCueSeen) return;
      state.physCueSeen = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      announce('まんなかを つかむと ゆれないよ');
    } catch (err) {}
  }

  function evaluate(block, zone) {
    // round-5 sort lever: routing (which chute the block physically landed in) is
    // judged separately from character-matching. Wrong-chute is zero-penalty —
    // no mistake counter, no slot fill — the block simply tosses back to the pile.
    // Correct-chute falls through to the existing junk/duo/plain matching logic
    // verbatim (a correctly-routed-but-wrong-CHARACTER kana still increments the
    // mistake counter via that unchanged logic below).
    const correctZone = dropZoneFor(block);
    if (zone && zone !== correctZone) {
      playSfx('no');
      pop(zone.x, zone.y - 34, 'あれれ', '#8d72b8', 22);
      tossToPile(block, zone.x, zone.y - 6);
      setBubble(isJunk(block) ? 'ごみは かたづけへ' : 'あれ、もじだったよ', 'oops');
      return;
    }

    if (isJunk(block)) {
      game.cleaned = (game.cleaned || 0) + 1;
      pop(CLEANUP_CHUTE.x, CLEANUP_CHUTE.y - 34, 'すっきり', '#3388c8', 22);
      if (!reduceMotion) burstConfetti(5);
      playSfx('ok');
      vibrate(18);
      setBubble(pick(['おかたづけ できたね。', 'じゃまが なくなったよ。']) + hintText(), 'happy');
      return;
    }

    if (isDuo(block)) {
      const needA = game.wordChars[game.next];
      const needB = game.wordChars[game.next + 1];
      if (needB != null && block.chs[0] === needA && block.chs[1] === needB) {
        const i = game.next;
        const j = game.next + 1;
        const midX = (slotX(i) + slotX(j)) / 2 + SLOT.s / 2;
        game.flyers.push({
          block,
          fx: CHUTE.x,
          fy: CHUTE.y,
          tx: midX,
          ty: SLOT.y + SLOT.s / 2,
          t: 0,
          dur: 0.42,
          arc: 110,
          done: () => {
            game.slots[i].filled = true;
            game.slots[i].t = 0;
            game.slots[j].filled = true;
            game.slots[j].t = 0;
            game.next += 2;
            game.mistakes = 0;
            game.slowT = 0;
            pop(midX, SLOT.y + SLOT.s + 12, 'ぴったり', '#ff8a36', 22);
            playSfx('ok');
            vibrate(20);
            if (game.next >= game.wordChars.length) {
              completeWord();
            } else {
              setBubble(pick(['いいね。', 'その ちょうし。', 'ぴったり。']) + hintText(), 'happy');
            }
          }
        });
        return;
      }
      game.mistakes += 1;
      playSfx('no');
      pop(CHUTE.x, CHUTE.y - 34, 'あれれ', '#8d72b8', 22);
      tossToPile(block, CHUTE.x, CHUTE.y - 6);
      if (game.mistakes >= 3) {
        game.assist = Math.max(game.assist, 1);
        game.slowT = 4.2;
        setBubble('ゆっくり いくよ。' + hintText(), 'oops');
      } else {
        setBubble(hintText(), 'oops');
      }
      return;
    }

    const need = game.wordChars[game.next];
    if (block.ch === need) {
      const i = game.next;
      game.flyers.push({
        block,
        fx: CHUTE.x,
        fy: CHUTE.y,
        tx: slotX(i) + SLOT.s / 2,
        ty: SLOT.y + SLOT.s / 2,
        t: 0,
        dur: 0.42,
        arc: 110,
        done: () => {
          game.slots[i].filled = true;
          game.slots[i].t = 0;
          game.next += 1;
          game.mistakes = 0;
          game.slowT = 0;
          if (block.grabQuality === 'perfect') {
            pop(slotX(i) + SLOT.s / 2, SLOT.y + SLOT.s + 12, 'まんなか', '#33bf7a', 22);
            if (!reduceMotion) burstConfetti(8);
          } else {
            pop(slotX(i) + SLOT.s / 2, SLOT.y + SLOT.s + 12, 'ぴったり', '#ff8a36', 22);
          }
          playSfx('ok');
          vibrate(20);
          if (game.next >= game.wordChars.length) {
            completeWord();
          } else {
            setBubble(pick(['いいね。', 'その ちょうし。', 'ぴったり。']) + hintText(), 'happy');
          }
        }
      });
      return;
    }

    game.mistakes += 1;
    playSfx('no');
    pop(CHUTE.x, CHUTE.y - 34, 'あれれ', '#8d72b8', 22);
    tossToPile(block, CHUTE.x, CHUTE.y - 6);
    if (game.mistakes >= 3) {
      game.assist = Math.max(game.assist, 1);
      game.slowT = 4.2;
      setBubble('ゆっくり いくよ。' + hintText(), 'oops');
    } else {
      setBubble(wrongText(block.ch), 'oops');
    }
  }

  function completeWord() {
    game.roundClear = true;
    game.clearT = 0;
    game.done.push(game.item);
    setBubble('できたね。「' + game.word + '」', 'happy');
    burstConfetti(62);
    playSfx('clear');
    vibrate(55);
  }

  function requestDrop() {
    if (scene !== 'playing' || !game || game.roundClear) return;
    const claw = game.claw;
    if (!claw || claw.phase !== 'move') return;
    initAudio();
    playSfx('tap');
    // round-4: grab targets an uncovered resting pile body (nearest to tip x, within
    // its grab radius) instead of a column top. "Uncovered" = no other resting body
    // rests on it (i.e. its id doesn't appear in any other body's supports list).
    let best = null;
    let bestScore = 1;
    const resting = window.MiniPhys ? MiniPhys.restingBodies() : [];
    const covered = coveredRestingIds();
    resting.forEach((body) => {
      if (covered.has(body.id)) return;
      const radius = blockGrabRadius(body.block);
      const d = Math.abs(body.x - claw.tipX);
      const score = d / radius;
      if (score < bestScore) {
        bestScore = score;
        best = body;
      }
    });
    claw.grabBody = best;
    claw.tgtY = best ? best.y - 8 : FLOOR - 8;
    claw.tipY = Math.min(claw.tgtY, claw.tipY + DROP_NUDGE);
    claw.t = 0;
    claw.phase = 'descend';
    updateButtons();
  }

  function useHint() {
    if (scene !== 'playing' || !game || game.hintsLeft <= 0) return;
    initAudio();
    game.hintsLeft -= 1;
    game.assist = Math.max(game.assist, 1);
    setBubble(hintText(), 'happy');
    pop(slotX(game.next) + SLOT.s / 2, SLOT.y + SLOT.s + 12, 'ここだよ', '#ff8a36', 18);
    updateHintButton();
    updateButtons();
    playSfx('tap');
  }

  function update(dt) {
    if (!game) return;
    game.blinkT -= dt;
    if (game.blinkT <= 0) game.blinkT = 2 + Math.random() * 2.5;
    if (game.moodT > 0) {
      game.moodT -= dt;
      if (game.moodT <= 0) game.mood = 'normal';
    }
    if (game.slowT > 0) game.slowT = Math.max(0, game.slowT - dt);
    if (window.MiniPhys) {
      MiniPhys.restingBodies().forEach((body) => {
        const block = body.block;
        if (block.wobble > 0) block.wobble = Math.max(0, block.wobble - dt * 1.15);
      });
    }
    game.slots.forEach((slot) => {
      if (slot.filled) slot.t += dt;
    });

    const claw = game.claw;
    const speedMul = game.slowT > 0 ? 0.58 : 1;
    switch (claw.phase) {
      case 'move':
        claw.tx += claw.dir * game.cfg.speed * speedMul * dt;
        if (claw.tx > MOVE_R) { claw.tx = MOVE_R; claw.dir = -1; }
        if (claw.tx < MOVE_L) { claw.tx = MOVE_L; claw.dir = 1; }
        claw.swayT += dt;
        claw.off = game.cfg.sway * Math.sin(claw.swayT * 2.2);
        claw.tipX = claw.tx + claw.off;
        claw.tipY = TIP_HOME;
        claw.open = 1;
        break;
      case 'descend':
        claw.tipY += DESCEND_SPEED * dt;
        if (claw.tipY >= claw.tgtY) {
          claw.tipY = claw.tgtY;
          claw.phase = 'close';
          claw.t = 0;
        }
        break;
      case 'close':
        claw.t += dt;
        claw.open = Math.max(0, 1 - claw.t / 0.2);
        if (claw.t >= 0.2) {
          if (claw.grabBody) {
            const body = claw.grabBody;
            claw.block = body.block;
            const offSigned = claw.tipX - blockBalanceCenterX(body.x, claw.block);
            const off = Math.abs(offSigned);
            const perfect = isJunk(claw.block) ? claw.block.shape.perfect : PERFECT_GRAB;
            const slipLimit = blockSlipLimit(claw.block);
            claw.block.grabQuality = off <= perfect ? 'perfect' : 'normal';
            // round-5: the carried visual starts at the block's true rest pose
            // (its settled pile angle) instead of a junk-only grab-offset formula
            // that could seed a tilt beyond thetaSlip's floor and "instant slip"
            // after just holding still. The pendulum's own swing angle (theta) is
            // reset to 0 separately in MiniPhys.spawnCarried — this tilt is purely
            // the visual restTilt that smoothly rights itself over 0.3s.
            claw.block.tilt = body.angle || 0;
            // round-4: pull the block out of the pile, cascade-check its neighbors
            // (limited depth-1 topple, see computePileTopple), then a small wobble
            // nudge on nearby resting bodies so the pile visibly shifts.
            if (window.MiniPhys) {
              MiniPhys.computePileTopple(body);
              MiniPhys.removeResting(body);
            }
            nudgeNeighborsOnGrab(body);
            // legacy random-slip trigger neutered (kept inert for compat); physics
            // (MiniPhys.slipTriggered, driven by carry-phase swing angle/tension) owns slip now.
            claw.slip = false;
            claw.slipAt = 0.35 + Math.random() * 0.35;
            if (window.MiniPhys) {
              const grabRadius = blockGrabRadius(claw.block);
              const uNorm = off <= perfect ? 0 : clamp(offSigned / grabRadius, -1, 1);
              MiniPhys.spawnCarried(claw.block, uNorm, claw.tipX, claw.tipY);
            }
            if (off <= perfect) {
              pop(claw.tipX, claw.tipY - 34, 'まんなか', '#33bf7a', 18);
            } else if (off > slipLimit && slipLimit < 900) {
              pop(claw.tipX, claw.tipY - 34, isJunk(claw.block) ? 'ぐらぐら' : 'はしっこ', '#ff8a36', 18);
            }
            playSfx('grab');
            vibrate(15);
            claw.grabBody = null;
          } else {
            game.mistakes += 1;
            pop(claw.tipX, claw.tipY - 30, 'スカッ', '#8d72b8', 24);
            if (game.mistakes >= 2) {
              game.assist = Math.max(game.assist, 1);
              setBubble('おしいね。' + hintText(), 'oops');
            } else {
              setBubble('おしいね。もういっかい', 'oops');
            }
            playSfx('miss');
          }
          claw.phase = 'ascend';
        }
        break;
      case 'ascend':
        claw.tipY -= ASCEND_SPEED * dt;
        if (claw.tipY <= TIP_HOME) {
          claw.tipY = TIP_HOME;
          if (claw.block) {
            claw.carryFrom = claw.tx;
            // round-5 sort lever: no auto-decide anymore — the child chooses the
            // chute via #chuteLeftBtn/#chuteRightBtn or ArrowLeft/ArrowRight/A/D.
            // targetZone stays null (claw horizontal motion pauses in 'carry')
            // until chooseChute() sets it.
            claw.targetZone = null;
            claw.targetX = null;
            game.awaitingSortDirection = true;
            claw.phase = 'carry';
            updateButtons();
            setBubble('どっちに おくる？', 'happy');
          } else {
            claw.phase = 'move';
            updateButtons();
          }
        }
        break;
      case 'carry': {
        // round-5 sort lever: while awaiting the child's chute choice, the claw
        // holds its x position (no horizontal advance) but the pendulum keeps
        // stepping (via MiniPhys.step below) so it visibly damps while waiting.
        // Slip is still checked but is lone-body-gated by Fix B (pileAwakeCount).
        if (claw.targetZone === null) {
          claw.off *= Math.pow(0.02, dt);
          claw.tipX = claw.tx + claw.off;
          if (window.MiniPhys && MiniPhys.slipTriggered() && claw.block) {
            const block = claw.block;
            const rel = MiniPhys.releaseCarried();
            claw.block = null;
            tossToPile(block, claw.tipX + rel.x, claw.tipY + rel.y, rel);
            setBubble(isJunk(block) ? 'ぐらぐら。まんなかを ねらおう' : 'はしっこだと すべるよ', 'oops');
            playSfx('slip');
            markPhysCueSeen();
            claw.phase = 'move';
            claw.dir = 1;
            game.awaitingSortDirection = false;
            updateButtons();
          }
          break;
        }
        const targetX = typeof claw.targetX === 'number' ? claw.targetX : TEXT_CHUTE.x;
        const dir = targetX < claw.tx ? -1 : 1;
        claw.tx += dir * CARRY_SPEED * dt;
        claw.off *= Math.pow(0.02, dt);
        claw.tipX = claw.tx + claw.off;
        if (window.MiniPhys && MiniPhys.slipTriggered() && claw.block) {
          const block = claw.block;
          const rel = MiniPhys.releaseCarried();
          claw.block = null;
          tossToPile(block, claw.tipX + rel.x, claw.tipY + rel.y, rel);
          setBubble(isJunk(block) ? 'ぐらぐら。まんなかを ねらおう' : 'はしっこだと すべるよ', 'oops');
          playSfx('slip');
          markPhysCueSeen();
          claw.phase = 'move';
          claw.dir = 1;
          updateButtons();
        }
        if ((dir < 0 && claw.tx <= targetX) || (dir > 0 && claw.tx >= targetX)) {
          claw.tx = targetX;
          claw.tipX = claw.tx + claw.off;
          claw.phase = 'release';
          claw.t = 0;
        }
        break;
      }
      case 'release':
        claw.t += dt;
        claw.open = Math.min(1, claw.t / 0.2);
        if (claw.t >= 0.2 && claw.block) {
          const block = claw.block;
          const zone = claw.targetZone || dropZoneFor(block);
          claw.block = null;
          const rel = window.MiniPhys ? MiniPhys.releaseCarried() : { x: 0, y: 20, vx: 0, vy: 0, omega: 0 };
          if (reduceMotion || !window.MiniPhys) {
            game.flyers.push({
              block,
              fx: claw.tipX,
              fy: claw.tipY + 20,
              tx: zone.x,
              ty: zone.y,
              t: 0,
              dur: 0.28,
              arc: -6,
              done: () => evaluate(block, zone)
            });
          } else {
            MiniPhys.spawnFalling(block, claw.tipX + rel.x, claw.tipY + rel.y, rel.vx, rel.vy, rel.omega, { target: { type: 'chute', zone } });
          }
          playSfx('drop');
          claw.phase = 'wait';
          claw.t = 0;
        }
        break;
      case 'wait':
        claw.t += dt;
        if (claw.t > 0.45) {
          claw.phase = 'move';
          claw.dir = 1;
          claw.targetZone = null; // round-5: force a fresh sort-lever decision on the next grab
          updateButtons();
        }
        break;
    }

    if (window.MiniPhys) {
      MiniPhys.step(dt, { x: claw.tipX, y: claw.tipY + 4 }, {
        cfg: game.cfg,
        slowT: game.slowT,
        onSettle: physOnSettle,
        onChuteCatch: physOnChuteCatch
      });
    }

    game.flyers.forEach((flyer) => { flyer.t += dt; });
    const done = game.flyers.filter((flyer) => flyer.t >= flyer.dur);
    game.flyers = game.flyers.filter((flyer) => flyer.t < flyer.dur);
    done.forEach((flyer) => {
      if (flyer.done) flyer.done();
    });

    game.pops.forEach((p) => { p.t += dt; });
    game.pops = game.pops.filter((p) => p.t < p.dur);
    game.confetti.forEach((piece) => {
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.rot += piece.vr * dt;
    });
    game.confetti = game.confetti.filter((piece) => piece.y < H + 30);

    if (game.roundClear) {
      game.clearT += dt;
      if (!reduceMotion && Math.random() < dt * 2.2) burstConfetti(4);
      if (game.clearT >= 1.85) {
        game.roundIndex += 1;
        if (game.roundIndex >= game.queue.length) showResult();
        else startRound();
      }
    }
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function circle(x, y, r, fill, stroke, lw) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.lineWidth = lw || 2;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
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
    const lines = [];
    let current = '';
    chars(str).forEach((ch) => {
      if (current && ctx.measureText(current + ch).width > maxWidth) {
        lines.push(current);
        current = ch;
      } else {
        current += ch;
      }
    });
    if (current) lines.push(current);
    return lines.slice(0, 3);
  }

  function drawBackground() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#fff9e8');
    bg.addColorStop(1, '#ffe6c5');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.28;
    for (let i = 0; i < 18; i += 1) {
      circle(40 + i * 58, 86 + Math.sin(time * 0.8 + i) * 14, 5, ['#ff6381', '#ffd166', '#33bf7a', '#58a8ff'][i % 4]);
    }
    ctx.globalAlpha = 1;
  }

  function drawCabinet() {
    rr(70, RAIL_Y, 742, 22, 10);
    ctx.fillStyle = '#8f7bd8';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#7160bf';
    ctx.stroke();
    [154, 796].forEach((x) => {
      rr(x, RAIL_Y, 14, FLOOR - RAIL_Y + 24, 6);
      ctx.fillStyle = '#a899e5';
      ctx.fill();
      ctx.strokeStyle = '#8978d6';
      ctx.stroke();
    });
    rr(154, FLOOR, 660, 26, 8);
    ctx.fillStyle = '#d8a663';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#bd8948';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.48)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(220, 184);
    ctx.lineTo(262, 404);
    ctx.moveTo(245, 178);
    ctx.lineTo(286, 388);
    ctx.stroke();
  }

  function drawChuteBox(zone) {
    const y = zone.boxY || 408;
    rr(zone.x - 50, y, 100, 100, 16);
    ctx.fillStyle = zone.fill;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = zone.stroke;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(zone.x, y + 20, 38, 13, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#4a3b5d';
    ctx.fill();
    text(zone.label, zone.x, y + 76, zone.label.length > 3 ? 14 : 17, '#fff');
  }

  function drawChute() {
    drawChuteBox(TEXT_CHUTE);
    drawChuteBox(CLEANUP_CHUTE);
  }

  function drawJunk(cx, cy, block, scale, rot) {
    const shape = block.shape || JUNK_SHAPES.wide;
    ctx.save();
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    if (block.tilt && !reduceMotion) ctx.rotate(block.tilt);
    if (block.wobble > 0 && !reduceMotion) ctx.rotate(Math.sin(block.wobble * 22) * 0.08 * block.wobble);
    if (scale !== 1) ctx.scale(scale, scale);
    shape.cells.forEach((cell) => {
      const x = cell[0] * 48;
      const y = cell[1] * 48;
      rr(x - 25, y - 25, 50, 50, 12);
      ctx.fillStyle = 'hsl(' + shape.hue + ', 78%, 82%)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'hsl(' + shape.hue + ', 55%, 54%)';
      ctx.stroke();
      circle(x - 10, y - 8, 4, 'rgba(255,255,255,0.55)');
      circle(x + 10, y + 8, 3, 'rgba(80,70,65,0.16)');
    });
    ctx.restore();
  }

  // round-4 Phase 2: wider two-character block. Same rounded-tile look as a plain
  // block (drawBlock below) but sized/glyph-laid-out for block.chs[0]/[1] side by side.
  function drawDuoBlock(cx, cy, block, scale, glow, rot) {
    const w = BLOCK * 1.55;
    ctx.save();
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    if (block.wobble > 0 && !reduceMotion) ctx.rotate(Math.sin(block.wobble * 22) * 0.08 * block.wobble);
    if (scale !== 1) ctx.scale(scale, scale);
    if (glow) {
      ctx.shadowColor = 'rgba(255, 194, 55, 0.9)';
      ctx.shadowBlur = 16;
    }
    rr(-w / 2 + 2, -BLOCK / 2 + 2, w - 4, BLOCK - 4, 13);
    ctx.fillStyle = 'hsl(' + block.hue + ', 82%, 88%)';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'hsl(' + block.hue + ', 55%, 60%)';
    ctx.stroke();
    rr(-w / 2 + 7, BLOCK / 2 - 16, w - 14, 10, 5);
    ctx.fillStyle = 'hsl(' + block.hue + ', 60%, 80%)';
    ctx.fill();
    text(block.chs[0], -w / 4, 0, 27, 'hsl(' + block.hue + ', 55%, 34%)');
    text(block.chs[1], w / 4, 0, 27, 'hsl(' + block.hue + ', 55%, 34%)');
    ctx.restore();
  }

  function drawBlock(cx, cy, block, scale, glow, rot) {
    if (isJunk(block)) {
      drawJunk(cx, cy, block, scale, rot);
      return;
    }
    if (isDuo(block)) {
      drawDuoBlock(cx, cy, block, scale, glow, rot);
      return;
    }
    ctx.save();
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    if (block.wobble > 0 && !reduceMotion) ctx.rotate(Math.sin(block.wobble * 22) * 0.08 * block.wobble);
    if (scale !== 1) ctx.scale(scale, scale);
    if (glow) {
      ctx.shadowColor = 'rgba(255, 194, 55, 0.9)';
      ctx.shadowBlur = 16;
    }
    rr(-BLOCK / 2 + 2, -BLOCK / 2 + 2, BLOCK - 4, BLOCK - 4, 13);
    ctx.fillStyle = 'hsl(' + block.hue + ', 82%, 88%)';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'hsl(' + block.hue + ', 55%, 60%)';
    ctx.stroke();
    rr(-BLOCK / 2 + 7, BLOCK / 2 - 16, BLOCK - 14, 10, 5);
    ctx.fillStyle = 'hsl(' + block.hue + ', 60%, 80%)';
    ctx.fill();
    text(block.ch, 0, 0, 32, 'hsl(' + block.hue + ', 55%, 34%)');
    ctx.restore();
  }

  function shouldGlow(block) {
    if (!game || game.roundClear || !game.wordChars[game.next]) return false;
    if (!(game.cfg.blockGlow || game.assist > 0)) return false;
    if (isDuo(block)) return block.chs[0] === game.wordChars[game.next] && block.chs[1] === game.wordChars[game.next + 1];
    return block.ch === game.wordChars[game.next];
  }

  function drawPile() {
    if (!window.MiniPhys) return;
    MiniPhys.restingBodies().forEach((body) => {
      drawBlock(body.x, body.y, body.block, 1, shouldGlow(body.block), body.angle);
    });
  }

  function drawFlyers() {
    game.flyers.forEach((flyer) => {
      const p = Math.min(1, flyer.t / flyer.dur);
      const x = flyer.fx + (flyer.tx - flyer.fx) * p;
      const y = flyer.fy + (flyer.ty - flyer.fy) * p - flyer.arc * 4 * p * (1 - p);
      const rot = flyer.spin ? p * 7 : 0;
      drawBlock(x, y, flyer.block, 1, false, rot);
    });
  }

  function drawClaw() {
    const claw = game.claw;
    rr(claw.tx - 28, RAIL_Y + 4, 56, 24, 8);
    ctx.fillStyle = '#6c5ce7';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#5142be';
    ctx.stroke();
    circle(claw.tx - 15, RAIL_Y + 29, 6, '#42378f');
    circle(claw.tx + 15, RAIL_Y + 29, 6, '#42378f');
    ctx.beginPath();
    ctx.moveTo(claw.tx, RAIL_Y + 26);
    ctx.lineTo(claw.tipX, claw.tipY - 28);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#6b6178';
    ctx.stroke();
    if (claw.block) {
      if (!reduceMotion && window.MiniPhys && MiniPhys.isCarrying()) {
        const pose = MiniPhys.getCarriedPose();
        drawBlock(claw.tipX + pose.x, claw.tipY + pose.y, claw.block, 1, false, pose.angle);
      } else {
        drawBlock(claw.tipX, claw.tipY + 20, claw.block, 1, false, 0);
      }
    }
    circle(claw.tipX, claw.tipY - 26, 10, '#ffd166', '#df9d2f', 3);
    const spread = 6 + 16 * claw.open;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#f4a742';
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(claw.tipX + s * 5, claw.tipY - 22);
      ctx.quadraticCurveTo(claw.tipX + s * (spread + 11), claw.tipY - 10, claw.tipX + s * spread, claw.tipY + 6);
      ctx.stroke();
    });
    ctx.lineCap = 'butt';
  }

  function drawPhysBodies() {
    if (!window.MiniPhys) return;
    MiniPhys.bodiesForDraw().forEach((body) => {
      drawBlock(body.x, body.y, body.block, 1, false, body.angle);
    });
  }

  // additive tutorial cue: pulsing ring over the best-aligned column top while
  // the claw is patrolling, shown on easy or once assist has kicked in (mirrors
  // requestDrop()'s own read-only grab scoring, no new game state).
  function drawGrabCue() {
    if (reduceMotion || !game || game.roundClear) return;
    const claw = game.claw;
    if (!claw || claw.phase !== 'move') return;
    if (!(game.levelKey === 'easy' || game.assist > 0)) return;
    if (!window.MiniPhys) return;
    let best = null;
    let bestScore = 1;
    const covered = coveredRestingIds();
    MiniPhys.restingBodies().forEach((body) => {
      if (covered.has(body.id)) return;
      const radius = blockGrabRadius(body.block);
      const score = Math.abs(body.x - claw.tipX) / radius;
      if (score < bestScore) {
        bestScore = score;
        best = body;
      }
    });
    if (!best) return;
    const pulse = 0.5 + 0.5 * Math.sin(time * 5);
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.25 * pulse;
    ctx.beginPath();
    ctx.arc(best.x, best.y, 30 + 4 * pulse, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffd166';
    ctx.stroke();
    ctx.restore();
  }

  // additive tutorial cue: a small leaf that tilts with the carried block's
  // swing angle and blushes orange/red as it nears the physics slip threshold.
  function drawBalanceMeter() {
    if (reduceMotion || !window.MiniPhys || !MiniPhys.isCarrying()) return;
    const c = MiniPhys.currentCarried();
    if (!c || Math.abs(c.u) <= 0.4) return;
    const params = MiniPhys.levelSlipParams(game.cfg, c.block);
    const k = clamp(Math.abs(c.theta) / params.thetaSlip, 0, 1);
    const color = k < 0.6 ? '#33bf7a' : (k < 0.85 ? '#ff9d42' : '#ff5a5a');
    const pose = MiniPhys.getCarriedPose();
    const mx = game.claw.tipX + pose.x;
    const my = game.claw.tipY + pose.y - 46;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(c.theta * 0.6);
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawPono(cx, cy, r) {
    const blink = game && game.blinkT < 0.12;
    const happy = game && game.mood === 'happy';
    const oops = game && game.mood === 'oops';
    [-1, 1].forEach((s) => {
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
    [-1, 1].forEach((s) => {
      const ex = cx + s * r * 0.38;
      const ey = cy - r * 0.12;
      if (happy) {
        ctx.beginPath();
        ctx.arc(ex, ey + 3, 5, Math.PI, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#3a2a1c';
        ctx.stroke();
      } else if (blink) {
        ctx.beginPath();
        ctx.moveTo(ex - 5, ey);
        ctx.lineTo(ex + 5, ey);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#3a2a1c';
        ctx.stroke();
      } else {
        circle(ex, ey, 4.5, '#3a2a1c');
      }
    });
    if (oops) circle(cx, cy + r * 0.42, 4, null, '#6b4a2f', 2.5);
    else {
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.36, 7, 0, Math.PI);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#6b4a2f';
      ctx.stroke();
    }
    circle(cx - r * 0.64, cy + r * 0.2, 5, 'rgba(255,150,150,.5)');
    circle(cx + r * 0.64, cy + r * 0.2, 5, 'rgba(255,150,150,.5)');
  }

  function drawBubble() {
    rr(530, 14, 306, 104, 18);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#eddcbc';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(835, 56);
    ctx.lineTo(850, 66);
    ctx.lineTo(835, 76);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    const lines = wrapText(game.bubble || '', 270, 19);
    const y0 = 64 - (lines.length - 1) * 12;
    lines.forEach((line, i) => text(line, 683, y0 + i * 24, 19, '#5b4636', '800'));
  }

  function drawWordCard() {
    rr(18, 12, 132, 118, 18);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f0c57d';
    ctx.stroke();
    const asset = getAsset(game.item.asset);
    if (asset && asset.ready) {
      drawContain(asset.img, 34, 26, 100, 76);
    } else {
      text(game.item.emoji, 84, 65, 60, '#000');
    }
    text((game.roundIndex + 1) + ' / ' + game.queue.length, 84, 117, 13, '#a88958', '800');
  }

  function drawContain(img, x, y, w, h) {
    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;
    const scale = Math.min(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function slotShouldShow(i) {
    if (game.cfg.slotHint === 'all') return true;
    if (game.cfg.slotHint === 'next' && i === game.next) return true;
    if (game.assist > 0 && i === game.next) return true;
    return false;
  }

  function drawSlots() {
    game.slots.forEach((slot, i) => {
      const x = slotX(i);
      const y = SLOT.y;
      if (slot.filled) {
        const k = Math.min(1, slot.t / 0.25);
        const scale = reduceMotion ? 1 : 1 + 0.25 * (1 - k) * Math.sin(k * Math.PI * 2);
        ctx.save();
        ctx.translate(x + SLOT.s / 2, y + SLOT.s / 2);
        ctx.scale(scale, scale);
        rr(-SLOT.s / 2, -SLOT.s / 2, SLOT.s, SLOT.s, 11);
        ctx.fillStyle = 'hsl(' + hueOf(slot.ch) + ',82%,88%)';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'hsl(' + hueOf(slot.ch) + ',55%,60%)';
        ctx.stroke();
        text(slot.ch, 0, 1, 29, 'hsl(' + hueOf(slot.ch) + ',55%,35%)');
        ctx.restore();
      } else {
        ctx.setLineDash([6, 5]);
        rr(x, y, SLOT.s, SLOT.s, 11);
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = i === game.next ? '#ff9d42' : '#dccaa5';
        ctx.stroke();
        ctx.setLineDash([]);
        if (slotShouldShow(i)) text(slot.ch, x + SLOT.s / 2, y + SLOT.s / 2 + 1, 26, 'rgba(132,112,83,0.42)');
      }
    });
    if (!game.roundClear && game.next < game.slots.length) {
      const ax = slotX(game.next) + SLOT.s / 2;
      const ay = SLOT.y + SLOT.s + 10 + (reduceMotion ? 0 : 3 * Math.sin(time * 5));
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - 9, ay + 12);
      ctx.lineTo(ax + 9, ay + 12);
      ctx.closePath();
      ctx.fillStyle = '#ff8a36';
      ctx.fill();
    }
  }

  function drawHud() {
    drawWordCard();
    drawSlots();
    drawPono(888, 82, 39);
    drawBubble();
    if (game.slowT > 0) {
      rr(374, 92, 210, 30, 15);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
      text('ゆっくりタイム', 479, 107, 17, '#7a5a30', '900');
    }
  }

  function drawFx() {
    game.pops.forEach((p) => {
      const k = p.t / p.dur;
      ctx.globalAlpha = 1 - k;
      text(p.text, p.x, p.y - 24 * k, p.size, p.color, '900');
      ctx.globalAlpha = 1;
    });
    game.confetti.forEach((piece) => {
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rot);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.size / 2, -piece.size / 3, piece.size, piece.size * 0.66);
      ctx.restore();
    });
    if (game.roundClear) {
      const scale = reduceMotion ? 1 : 1 + 0.08 * Math.sin(game.clearT * 9) * Math.exp(-game.clearT * 1.8);
      ctx.save();
      ctx.translate(486, 326);
      ctx.scale(scale, scale);
      ctx.font = '900 60px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#fff';
      ctx.strokeText(game.item.emoji + ' ' + game.word, 0, 0);
      ctx.fillStyle = '#ff8a36';
      ctx.fillText(game.item.emoji + ' ' + game.word, 0, 0);
      ctx.restore();
    }
  }

  function draw() {
    drawBackground();
    if (!game) {
      drawCabinet();
      drawChute();
      return;
    }
    drawCabinet();
    drawChute();
    drawPile();
    drawPhysBodies();
    drawFlyers();
    drawGrabCue();
    drawClaw();
    drawBalanceMeter();
    drawHud();
    drawFx();
  }

  function loop(ts) {
    const dt = Math.min(0.033, ((ts - last) / 1000) || 0.016);
    last = ts;
    time += dt;
    if (scene === 'playing') update(dt);
    draw();
    window.requestAnimationFrame(loop);
  }

  document.querySelectorAll('[data-level]').forEach((btn) => {
    btn.addEventListener('click', () => {
      initAudio();
      startGame(btn.getAttribute('data-level'));
    });
  });

  dropBtn.addEventListener('click', requestDrop);
  hintBtn.addEventListener('click', useHint);
  chuteLeftBtn.addEventListener('click', () => chooseChute('left'));
  chuteRightBtn.addEventListener('click', () => chooseChute('right'));

  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-label', soundOn ? 'おと' : 'おと なし');
    if (soundOn) initAudio();
    playSfx('tap');
  });

  homeBtn.addEventListener('click', () => {
    if (scene === 'playing') {
      setHidden(confirmOverlay, false);
      setScene('confirm');
      updateButtons();
    } else {
      window.location.href = '../play.html';
    }
  });

  continueBtn.addEventListener('click', () => {
    setHidden(confirmOverlay, true);
    setScene('playing');
    updateButtons();
    playSfx('tap');
  });

  againBtn.addEventListener('click', () => {
    initAudio();
    startGame(selectedLevel);
  });

  levelsBtn.addEventListener('click', () => {
    initAudio();
    showTitle();
    playSfx('tap');
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'Space' || ev.code === 'Enter') {
      ev.preventDefault();
      requestDrop();
    }
    if (ev.code === 'KeyH') {
      ev.preventDefault();
      useHint();
    }
    if (ev.code === 'ArrowLeft' || ev.code === 'KeyA') {
      ev.preventDefault();
      chooseChute('left');
    }
    if (ev.code === 'ArrowRight' || ev.code === 'KeyD') {
      ev.preventDefault();
      chooseChute('right');
    }
    if (ev.code === 'Escape' && scene === 'confirm') {
      setHidden(confirmOverlay, true);
      setScene('playing');
      updateButtons();
    }
  });

  showTitle();
  window.requestAnimationFrame(loop);
})();
