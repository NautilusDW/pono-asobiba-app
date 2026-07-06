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
  const DESCEND_SPEED = 560;
  const ASCEND_SPEED = 520;
  const CARRY_SPEED = 315;
  const DROP_NUDGE = 18;
  const PERFECT_GRAB = 10;
  const TEXT_CHUTE = { x: 104, y: 432, boxY: 408, label: 'もじ', fill: '#ff9eb8', stroke: '#df7898' };
  const CLEANUP_CHUTE = { x: 738, y: 356, boxY: 332, label: 'かたづけ', fill: '#8ed7ff', stroke: '#54a6d8' };
  const CHUTE = TEXT_CHUTE;
  const COLS = 9;
  const SLOT = { x0: 178, y: 28, s: 54, step: 62 };
  const FONT = '"Zen Maru Gothic","Hiragino Maru Gothic ProN","Yu Gothic",sans-serif';
  const STORAGE_KEY = 'pono_mojicrane_v1';
  const KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ';

  const LEVELS = {
    easy: {
      label: 'やさしい',
      rounds: 3,
      speed: 112,
      sway: 0,
      grab: 44,
      slip: 999,
      decoys: 5,
      maxHeight: 2,
      junkBase: 0,
      junkMax: 1,
      junkShapes: ['wide'],
      junkSlip: 999,
      slotHint: 'all',
      blockGlow: true,
      helpUses: 99
    },
    normal: {
      label: 'ふつう',
      rounds: 4,
      speed: 152,
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
      helpUses: 2
    },
    challenge: {
      label: 'チャレンジ',
      rounds: 5,
      speed: 184,
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
      helpUses: 1
    }
  };

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const titleOverlay = document.getElementById('titleOverlay');
  const confirmOverlay = document.getElementById('confirmOverlay');
  const resultOverlay = document.getElementById('resultOverlay');
  const dropBtn = document.getElementById('dropBtn');
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
    return game.cfg.grab;
  }

  function blockBalanceCenterX(col, block) {
    return col.x + (isJunk(block) ? block.shape.centerDx : 0);
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
    game.cols = buildPile(item.word, game.cfg, game.roundIndex);
    game.cleaned = 0;
    game.flyers = [];
    game.pops = [];
    game.confetti = [];
    game.mistakes = 0;
    game.assist = 0;
    game.roundClear = false;
    game.clearT = 0;
    game.hintsLeft = game.cfg.helpUses;
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
      slowT: 0
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
    dropBtn.disabled = !canDrop;
    hintBtn.disabled = !(scene === 'playing' && game && game.hintsLeft > 0 && game.next < game.wordChars.length);
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

  function tossToPile(block, fx, fy) {
    const i = safeCol();
    const col = game.cols[i];
    const ty = FLOOR - (col.blocks.length + 1) * BLOCK + BLOCK / 2;
    game.flyers.push({
      block,
      fx,
      fy,
      tx: col.x,
      ty,
      t: 0,
      dur: 0.55,
      arc: 135,
      spin: true,
      done: () => {
        col.blocks.push(block);
        block.wobble = 1;
      }
    });
  }

  function evaluate(block) {
    if (isJunk(block)) {
      game.cleaned = (game.cleaned || 0) + 1;
      pop(CLEANUP_CHUTE.x, CLEANUP_CHUTE.y - 34, 'すっきり', '#3388c8', 22);
      if (!reduceMotion) burstConfetti(5);
      playSfx('ok');
      vibrate(18);
      setBubble(pick(['おかたづけ できたね。', 'じゃまが なくなったよ。']) + hintText(), 'happy');
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
    let best = null;
    let bestScore = 1;
    game.cols.forEach((col, i) => {
      if (!col.blocks.length) return;
      const top = col.blocks[col.blocks.length - 1];
      const radius = blockGrabRadius(top);
      const d = Math.abs(col.x - claw.tipX);
      const score = d / radius;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    claw.col = best;
    claw.tgtY = best === null ? FLOOR - 8 : FLOOR - game.cols[best].blocks.length * BLOCK + 8;
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
    game.cols.forEach((col) => col.blocks.forEach((block) => {
      if (block.wobble > 0) block.wobble = Math.max(0, block.wobble - dt * 1.15);
    }));
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
          if (claw.col !== null && game.cols[claw.col].blocks.length) {
            const col = game.cols[claw.col];
            claw.block = col.blocks.pop();
            const off = Math.abs(claw.tipX - blockBalanceCenterX(col, claw.block));
            const perfect = isJunk(claw.block) ? claw.block.shape.perfect : PERFECT_GRAB;
            const slipLimit = blockSlipLimit(claw.block);
            claw.block.grabQuality = off <= perfect ? 'perfect' : 'normal';
            claw.block.tilt = isJunk(claw.block)
              ? Math.max(-0.42, Math.min(0.42, (claw.tipX - blockBalanceCenterX(col, claw.block)) / Math.max(1, slipLimit) * 0.28))
              : 0;
            claw.slip = off > slipLimit && game.slowT <= 0;
            claw.slipAt = 0.35 + Math.random() * 0.35;
            if (off <= perfect) {
              pop(claw.tipX, claw.tipY - 34, 'まんなか', '#33bf7a', 18);
            } else if (off > slipLimit && slipLimit < 900) {
              pop(claw.tipX, claw.tipY - 34, isJunk(claw.block) ? 'ぐらぐら' : 'はしっこ', '#ff8a36', 18);
            }
            playSfx('grab');
            vibrate(15);
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
            claw.targetZone = dropZoneFor(claw.block);
            claw.targetX = claw.targetZone.x;
            claw.phase = 'carry';
          } else {
            claw.phase = 'move';
            updateButtons();
          }
        }
        break;
      case 'carry': {
        const targetX = typeof claw.targetX === 'number' ? claw.targetX : TEXT_CHUTE.x;
        const dir = targetX < claw.tx ? -1 : 1;
        claw.tx += dir * CARRY_SPEED * dt;
        claw.off *= Math.pow(0.02, dt);
        claw.tipX = claw.tx + claw.off;
        const p = Math.abs(claw.carryFrom - claw.tx) / Math.max(1, Math.abs(claw.carryFrom - targetX));
        if (claw.slip && p >= claw.slipAt && claw.block) {
          const block = claw.block;
          claw.block = null;
          claw.slip = false;
          tossToPile(block, claw.tipX, claw.tipY + 20);
          setBubble(isJunk(block) ? 'ぐらぐら。まんなかを ねらおう' : 'はしっこだと すべるよ', 'oops');
          playSfx('slip');
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
          game.flyers.push({
            block,
            fx: claw.tipX,
            fy: claw.tipY + 20,
            tx: zone.x,
            ty: zone.y,
            t: 0,
            dur: 0.28,
            arc: -6,
            done: () => evaluate(block)
          });
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
          updateButtons();
        }
        break;
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

  function drawBlock(cx, cy, block, scale, glow, rot) {
    if (isJunk(block)) {
      drawJunk(cx, cy, block, scale, rot);
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
    return (game.cfg.blockGlow || game.assist > 0) && block.ch === game.wordChars[game.next];
  }

  function drawPile() {
    game.cols.forEach((col) => {
      col.blocks.forEach((block, i) => {
        const y = FLOOR - (i + 1) * BLOCK + BLOCK / 2;
        drawBlock(col.x, y, block, 1, shouldGlow(block), 0);
      });
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
    if (claw.block) drawBlock(claw.tipX, claw.tipY + 20, claw.block, 1, false, 0);
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
    drawFlyers();
    drawClaw();
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
    if (ev.code === 'Escape' && scene === 'confirm') {
      setHidden(confirmOverlay, true);
      setScene('playing');
      updateButtons();
    }
  });

  showTitle();
  window.requestAnimationFrame(loop);
})();
