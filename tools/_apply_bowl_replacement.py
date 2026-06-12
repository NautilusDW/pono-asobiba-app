#!/usr/bin/env python3
"""One-shot transform: delete silk minigame block, insert Donguri Bowl."""
import io, os, sys

PATH = r'd:/AppDevelopment/pono-asobiba-app/maze/index.html'

with io.open(PATH, 'r', encoding='utf-8', newline='') as f:
    text = f.read()

START_MARKER = '// ── ほうき: クモの巣はらい ──'
DISP_MARKER  = '// ゲーム starter のディスパッチ表'

start = text.find(START_MARKER)
disp  = text.find(DISP_MARKER)
assert start > 0 and disp > start, (start, disp)

NEW_BLOCK = r"""// ── どんぐりボウリング (Donguri Bowl) ──
// v1052: 旧 silk 物理 (web_sweep) を全面置換。
// 3/4 俯瞰、タップ = どんぐり投掷、キノコピンを全部倒したらクリア。
// レイアウトは BOWL_PIN_LAYOUTS で拡張可能 (sway/swayPhase は v2 用予約)。
const BOWL_THROW_COOLDOWN_MS  = 700;
const BOWL_DONGURI_FLIGHT_MS  = 650;
const BOWL_PIN_FALL_MS        = 520;
const BOWL_PIN_R_REL          = 0.058;   // pin base radius as fraction of short side
const BOWL_HIT_R_REL          = 0.09;
const BOWL_CHAIN_R_REL        = 0.063;   // ≈ BOWL_HIT_R_REL * 0.7
const BOWL_TARGET_DEPTH       = 0.78;    // landing depth when tapping center
const BOWL_PONO_HEIGHT_REL    = 0.28;
const BOWL_GROUND_HORIZON_Y   = 0.34;

const BOWL_PIN_LAYOUTS = [
  {
    id: 'CLASSIC', label: '3-2-1',
    pins: [
      { x: 0.35, y: 0.72, sway: 0, swayPhase: 0 },
      { x: 0.50, y: 0.72, sway: 0, swayPhase: 0 },
      { x: 0.65, y: 0.72, sway: 0, swayPhase: 0 },
      { x: 0.425, y: 0.80, sway: 0, swayPhase: 0 },
      { x: 0.575, y: 0.80, sway: 0, swayPhase: 0 },
      { x: 0.50, y: 0.88, sway: 0, swayPhase: 0 },
    ],
  },
  {
    id: 'DIAMOND', label: '1-2-3-2-1',
    pins: [
      { x: 0.50, y: 0.66, sway: 0, swayPhase: 0 },
      { x: 0.42, y: 0.72, sway: 0, swayPhase: 0 },
      { x: 0.58, y: 0.72, sway: 0, swayPhase: 0 },
      { x: 0.34, y: 0.78, sway: 0, swayPhase: 0 },
      { x: 0.50, y: 0.78, sway: 0, swayPhase: 0 },
      { x: 0.66, y: 0.78, sway: 0, swayPhase: 0 },
      { x: 0.42, y: 0.84, sway: 0, swayPhase: 0 },
      { x: 0.58, y: 0.84, sway: 0, swayPhase: 0 },
      { x: 0.50, y: 0.90, sway: 0, swayPhase: 0 },
    ],
  },
  {
    id: 'V_SHAPE', label: 'V',
    pins: [
      { x: 0.32, y: 0.70, sway: 0, swayPhase: 0 },
      { x: 0.68, y: 0.70, sway: 0, swayPhase: 0 },
      { x: 0.40, y: 0.78, sway: 0, swayPhase: 0 },
      { x: 0.60, y: 0.78, sway: 0, swayPhase: 0 },
      { x: 0.50, y: 0.88, sway: 0, swayPhase: 0 },
    ],
  },
  {
    id: 'WALL', label: 'WALL',
    pins: [
      { x: 0.22, y: 0.78, sway: 0, swayPhase: 0 },
      { x: 0.34, y: 0.78, sway: 0, swayPhase: 0 },
      { x: 0.46, y: 0.78, sway: 0, swayPhase: 0 },
      { x: 0.58, y: 0.78, sway: 0, swayPhase: 0 },
      { x: 0.70, y: 0.78, sway: 0, swayPhase: 0 },
      { x: 0.82, y: 0.78, sway: 0, swayPhase: 0 },
    ],
  },
  {
    id: 'DOUBLE_LINE', label: '4-3',
    pins: [
      { x: 0.28, y: 0.76, sway: 0, swayPhase: 0 },
      { x: 0.43, y: 0.76, sway: 0, swayPhase: 0 },
      { x: 0.58, y: 0.76, sway: 0, swayPhase: 0 },
      { x: 0.73, y: 0.76, sway: 0, swayPhase: 0 },
      { x: 0.36, y: 0.86, sway: 0, swayPhase: 0 },
      { x: 0.50, y: 0.86, sway: 0, swayPhase: 0 },
      { x: 0.64, y: 0.86, sway: 0, swayPhase: 0 },
    ],
  },
];

let _bowlEncounterCount = 0;

function _bowlReducedMotion() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) { return false; }
}

function _clearBowlGimmickTimers() {
  _webGimmickTimers.forEach(function(t) { try { clearTimeout(t); } catch (_) {} });
  _webGimmickTimers = [];
  if (_bowlGameState && _bowlGameState.rafId) {
    try { cancelAnimationFrame(_bowlGameState.rafId); } catch (_) {}
    _bowlGameState.rafId = null;
  }
}

function _pickBowlLayoutId(creature) {
  // 決定論的: encounter 計数 + creature.id のハッシュを使う (Math.random 不使用)
  const ids = BOWL_PIN_LAYOUTS.map(function(l){ return l.id; });
  let seed = _bowlEncounterCount | 0;
  const key = (creature && creature.id) || '';
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) | 0;
  if (seed < 0) seed = -seed;
  return ids[seed % ids.length];
}

function _bowlPointer(canvasEl, e) {
  const r = canvasEl.getBoundingClientRect();
  const x = (e.clientX - r.left);
  const y = (e.clientY - r.top);
  return {
    x: Math.max(0, Math.min(r.width, x)),
    y: Math.max(0, Math.min(r.height, y)),
  };
}

function _resizeBowlCanvas(gs) {
  const r = gs.stageEl.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  gs.dpr = dpr;
  gs.w = r.width;
  gs.h = r.height;
  gs.canvas.width = Math.floor(r.width * dpr);
  gs.canvas.height = Math.floor(r.height * dpr);
  gs.canvas.style.width = r.width + 'px';
  gs.canvas.style.height = r.height + 'px';
  gs.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function _layoutBowlPins(gs, layoutId) {
  const layout = BOWL_PIN_LAYOUTS.find(function(l){ return l.id === layoutId; }) || BOWL_PIN_LAYOUTS[0];
  gs.layoutId = layout.id;
  gs.pins = layout.pins.map(function(p) {
    return {
      x: p.x, y: p.y,
      sway: p.sway || 0, swayPhase: p.swayPhase || 0,
      isDown: false, fallStartAt: null, fallProgress: 0,
    };
  });
}

function _showBowlGame(c) {
  _setEncounterMode('web_sweep'); // 互換トークン: card レイアウトは既存を流用
  _clearBowlGimmickTimers();
  _bowlEncounterCount = (_bowlEncounterCount + 1) | 0;

  const wrap = document.createElement('div');
  wrap.className = 'bowl-game';
  wrap.innerHTML =
    '<div class="bowl-game__title">どんぐり ボウリング</div>' +
    '<div class="bowl-game__stage" id="bowlStage">' +
      '<canvas class="bowl-game__canvas" id="bowlCanvas" aria-label="どんぐりを なげて キノコを たおすゲーム"></canvas>' +
      '<div class="bowl-game__stage-note">がめんを タップして どんぐりを なげよう！</div>' +
    '</div>' +
    '<div class="bowl-game__status" id="bowlStatus"></div>';
  encStageEl.innerHTML = '';
  encStageEl.appendChild(wrap);

  const stageEl  = wrap.querySelector('#bowlStage');
  const canvasEl = wrap.querySelector('#bowlCanvas');
  const ctx = canvasEl.getContext('2d');
  const gs = {
    stageEl: stageEl, canvas: canvasEl, ctx: ctx,
    w: 0, h: 0, dpr: 1,
    layoutId: null, pins: [], donguris: [],
    particles: [],
    lastThrowAt: 0, locked: false,
    pono: { throwT: 0 },
    rafId: null, lastTs: 0,
    statusEl: wrap.querySelector('#bowlStatus'),
    bgSeed: (_bowlEncounterCount * 1013904223) | 0,
  };
  _bowlGameState = gs;

  _resizeBowlCanvas(gs);
  _layoutBowlPins(gs, _pickBowlLayoutId(c));

  const onPointerDown = function(e) {
    if (gs !== _bowlGameState || gs.locked) return;
    const now = performance.now();
    if (now - gs.lastThrowAt < BOWL_THROW_COOLDOWN_MS) return;
    try { e.preventDefault(); } catch (_) {}
    const p = _bowlPointer(canvasEl, e);
    _applyBowlSweep(gs, p.x, p.y);
  };
  stageEl.addEventListener('pointerdown', onPointerDown);

  const onResize = function() {
    if (gs !== _bowlGameState) { window.removeEventListener('resize', onResize); return; }
    _resizeBowlCanvas(gs);
  };
  window.addEventListener('resize', onResize);

  _startBowlLoop(gs);
}

function _applyBowlSweep(gs, tapX, tapY) {
  const nx = Math.max(0.1, Math.min(0.9, tapX / Math.max(1, gs.w)));
  const targetX = nx;
  const targetY = BOWL_TARGET_DEPTH;
  const startX = 0.5;
  const startY = 1 - (BOWL_PONO_HEIGHT_REL * 0.65);
  const now = performance.now();
  gs.donguris.push({
    startX: startX, startY: startY,
    targetX: targetX, targetY: targetY,
    t0: now,
    landAt: now + BOWL_DONGURI_FLIGHT_MS,
    exploded: false,
    spin: ((gs.donguris.length + (gs.bgSeed | 0)) % 2 === 0) ? 1 : -1,
  });
  gs.lastThrowAt = now;
  gs.pono.throwT = now;
  try { playTap(); } catch (_) {}
}

function _startBowlLoop(gs) {
  const tick = function(ts) {
    if (gs !== _bowlGameState) return;
    const last = gs.lastTs || ts;
    const dt = Math.min(50, Math.max(8, ts - last));
    gs.lastTs = ts;
    _updateBowlPhysics(gs, dt, ts);
    _drawBowlScene(gs, ts);
    gs.rafId = requestAnimationFrame(tick);
  };
  gs.rafId = requestAnimationFrame(tick);
}

function _updateBowlPhysics(gs, dt, now) {
  // Donguri アーク走査
  for (let i = gs.donguris.length - 1; i >= 0; i--) {
    const d = gs.donguris[i];
    if (!d.exploded && now >= d.landAt) {
      d.exploded = true;
      _bowlHandleLanding(gs, d.targetX, d.targetY);
    }
    if (d.exploded && (now - d.landAt) > 220) gs.donguris.splice(i, 1);
  }
  // Pin 倒れアニメーション
  for (let i = 0; i < gs.pins.length; i++) {
    const p = gs.pins[i];
    if (p.isDown && p.fallStartAt != null) {
      p.fallProgress = Math.min(1, (now - p.fallStartAt) / BOWL_PIN_FALL_MS);
    }
  }
  // Particle decay
  for (let i = gs.particles.length - 1; i >= 0; i--) {
    const p = gs.particles[i];
    p.age += dt;
    p.x  += p.vx * (dt / 1000);
    p.y  += p.vy * (dt / 1000);
    p.vx *= Math.pow(0.86, dt / 16);
    p.vy  = p.vy * Math.pow(0.88, dt / 16) + 110 * (dt / 1000);
    if (p.age >= p.life) gs.particles.splice(i, 1);
  }
  // Clear check
  if (!gs.locked && _checkBowlCleared(gs)) {
    gs.locked = true;
    _finishBowlGame(gs);
  }
}

function _bowlHandleLanding(gs, tx, ty) {
  const px = tx * gs.w, py = ty * gs.h;
  const minDim = Math.min(gs.w, gs.h);
  const hitR2   = (minDim * BOWL_HIT_R_REL)   * (minDim * BOWL_HIT_R_REL);
  const chainR2 = (minDim * BOWL_CHAIN_R_REL) * (minDim * BOWL_CHAIN_R_REL);
  const now = performance.now();
  let directHit = null;
  let bestD = hitR2;
  for (let i = 0; i < gs.pins.length; i++) {
    const p = gs.pins[i];
    if (p.isDown) continue;
    const dx = (p.x * gs.w) - px, dy = (p.y * gs.h) - py;
    const d2 = dx*dx + dy*dy;
    if (d2 <= bestD) { bestD = d2; directHit = p; }
  }
  if (directHit) {
    directHit.isDown = true;
    directHit.fallStartAt = now;
    _spawnBowlGlob(gs, directHit.x * gs.w, directHit.y * gs.h, false);
    try { _playMzSePitch('correct', 0); } catch (_) { try { playTap(); } catch (__) {} }
    // 隣接 1 本連鎖
    let chain = null, chainBest = chainR2;
    for (let i = 0; i < gs.pins.length; i++) {
      const p = gs.pins[i];
      if (p.isDown || p === directHit) continue;
      const dx = (p.x - directHit.x) * gs.w, dy = (p.y - directHit.y) * gs.h;
      const d2 = dx*dx + dy*dy;
      if (d2 <= chainBest) { chainBest = d2; chain = p; }
    }
    if (chain) {
      chain.isDown = true;
      chain.fallStartAt = now + 90;
      _spawnBowlGlob(gs, chain.x * gs.w, chain.y * gs.h, false);
      _bowlFloatText(gs, 'コンボ！', chain.x * gs.w, chain.y * gs.h);
    }
  } else {
    _spawnBowlGlob(gs, px, py, true);
    try { playTap(); } catch (_) {}
  }
}

function _spawnBowlGlob(gs, x, y, isMiss) {
  if (_bowlReducedMotion()) return;
  const n = isMiss ? 3 : 6;
  for (let i = 0; i < n; i++) {
    // deterministic jitter via sin (no Math.random)
    const seed = (gs.particles.length + i + 1) * 13.37 + (gs.bgSeed & 0xff);
    const ang = (i / n) * Math.PI * 2 + Math.sin(seed) * 0.4;
    const sp  = 80 + Math.abs(Math.sin(seed * 1.7)) * 90;
    gs.particles.push({
      x: x, y: y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - 70,
      r: 3 + (i % 3),
      age: 0, life: isMiss ? 360 : 620,
      color: isMiss ? 'rgba(220,200,160,0.85)' : 'rgba(255,220,90,0.95)',
    });
  }
}

function _bowlFloatText(gs, text, x, y) {
  if (_bowlReducedMotion()) return;
  if (!gs.stageEl) return;
  const el = document.createElement('div');
  el.className = 'bowl-game__combo';
  el.textContent = text;
  el.style.left = (x / Math.max(1, gs.w) * 100) + '%';
  el.style.top  = (y / Math.max(1, gs.h) * 100) + '%';
  gs.stageEl.appendChild(el);
  _webGimmickSetTimeout(function() {
    try { if (el.parentNode) el.parentNode.removeChild(el); } catch (_) {}
  }, 820);
}

function _checkBowlCleared(gs) {
  if (!gs.pins.length) return false;
  for (let i = 0; i < gs.pins.length; i++) if (!gs.pins[i].isDown) return false;
  return true;
}

// ─── drawing ───
function _drawBowlScene(gs, now) {
  const ctx = gs.ctx, W = gs.w, H = gs.h;
  // sky + ground gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H * BOWL_GROUND_HORIZON_Y);
  sky.addColorStop(0, '#9bd5a8');
  sky.addColorStop(1, '#cdeacb');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * BOWL_GROUND_HORIZON_Y);
  const ground = ctx.createLinearGradient(0, H * BOWL_GROUND_HORIZON_Y, 0, H);
  ground.addColorStop(0, '#caa56b');
  ground.addColorStop(1, '#8a6534');
  ctx.fillStyle = ground;
  ctx.fillRect(0, H * BOWL_GROUND_HORIZON_Y, W, H * (1 - BOWL_GROUND_HORIZON_Y));
  // path (一点透視台形)
  ctx.fillStyle = '#e6cf99';
  ctx.beginPath();
  ctx.moveTo(W * 0.15, H);
  ctx.lineTo(W * 0.41, H * BOWL_GROUND_HORIZON_Y);
  ctx.lineTo(W * 0.59, H * BOWL_GROUND_HORIZON_Y);
  ctx.lineTo(W * 0.85, H);
  ctx.closePath();
  ctx.fill();
  // side logs (procedural)
  _drawBowlSideLogs(gs);
  // pins back-to-front (奇怚な描画順を避ける)
  const sorted = gs.pins.slice().sort(function(a,b){ return a.y - b.y; });
  for (let i = 0; i < sorted.length; i++) _drawBowlPin(gs, sorted[i], now);
  // donguris in flight
  for (let i = 0; i < gs.donguris.length; i++) _drawBowlDonguri(gs, gs.donguris[i], now);
  // particles
  ctx.save();
  for (let i = 0; i < gs.particles.length; i++) {
    const p = gs.particles[i];
    const a = 1 - (p.age / p.life);
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // pono (手前中央)
  _drawBowlPono(gs, now);
}

function _drawBowlSideLogs(gs) {
  const ctx = gs.ctx, W = gs.w, H = gs.h;
  const seed = gs.bgSeed | 0;
  ctx.save();
  // left log
  ctx.fillStyle = '#7a5a32';
  ctx.beginPath();
  ctx.ellipse(W * 0.08, H * 0.86, W * 0.10, H * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // right log
  ctx.beginPath();
  ctx.ellipse(W * 0.92, H * 0.82, W * 0.09, H * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();
  // moss highlights (sin-based jitter, deterministic per seed)
  ctx.fillStyle = 'rgba(110, 170, 90, 0.7)';
  for (let i = 0; i < 6; i++) {
    const ph = Math.sin(seed + i * 1.7);
    const lx = W * (0.04 + 0.03 * ((ph + 1) / 2));
    const ly = H * (0.83 + 0.02 * Math.sin(seed + i * 0.9));
    ctx.beginPath(); ctx.arc(lx, ly, W * 0.012, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 5; i++) {
    const ph = Math.sin(seed * 0.7 + i * 2.1);
    const rx = W * (0.90 + 0.025 * ((ph + 1) / 2));
    const ry = H * (0.79 + 0.018 * Math.sin(seed * 0.5 + i));
    ctx.beginPath(); ctx.arc(rx, ry, W * 0.011, 0, Math.PI * 2); ctx.fill();
  }
  // small distant trees on horizon
  ctx.fillStyle = '#5d8a55';
  for (let i = 0; i < 7; i++) {
    const tx = W * (0.05 + i * 0.14);
    const ty = H * BOWL_GROUND_HORIZON_Y;
    const tw = W * (0.04 + 0.02 * Math.abs(Math.sin(seed + i)));
    const th = H * (0.05 + 0.025 * Math.abs(Math.cos(seed * 0.3 + i)));
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - tw / 2, ty + th);
    ctx.lineTo(tx + tw / 2, ty + th);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function _drawBowlPin(gs, p, now) {
  const ctx = gs.ctx;
  const px = p.x * gs.w;
  const baseY = p.y * gs.h;
  // depth scale (奥さほど小さく)
  const depthT = (p.y - BOWL_GROUND_HORIZON_Y) / Math.max(0.001, 1 - BOWL_GROUND_HORIZON_Y);
  const scale = 0.45 + 0.85 * Math.max(0, Math.min(1, depthT));
  const baseR = Math.min(gs.w, gs.h) * BOWL_PIN_R_REL * scale;
  // shadow on ground
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(px, baseY + baseR * 0.55, baseR * 1.15, baseR * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // fall animation
  let rot = 0, opacity = 1;
  if (p.isDown) {
    rot = p.fallProgress * (Math.PI / 2.1);
    opacity = 1 - p.fallProgress * 0.55;
  }
  ctx.save();
  ctx.translate(px, baseY);
  ctx.rotate(-rot);
  ctx.globalAlpha = opacity;
  // stem
  ctx.fillStyle = '#f6efdc';
  ctx.beginPath();
  ctx.moveTo(-baseR * 0.4, baseR * 0.2);
  ctx.quadraticCurveTo(-baseR * 0.5, -baseR * 0.6, -baseR * 0.32, -baseR * 0.7);
  ctx.lineTo(baseR * 0.32, -baseR * 0.7);
  ctx.quadraticCurveTo(baseR * 0.5, -baseR * 0.6, baseR * 0.4, baseR * 0.2);
  ctx.closePath();
  ctx.fill();
  // stem shadow
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  ctx.fillRect(baseR * 0.1, -baseR * 0.7, baseR * 0.3, baseR * 0.9);
  // cap (red dome)
  ctx.fillStyle = '#d24a3a';
  ctx.beginPath();
  ctx.arc(0, -baseR * 0.7, baseR, Math.PI, 0);
  ctx.lineTo(baseR, -baseR * 0.55);
  ctx.lineTo(-baseR, -baseR * 0.55);
  ctx.closePath();
  ctx.fill();
  // cap highlight
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(-baseR * 0.3, -baseR * 0.95, baseR * 0.35, baseR * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // white dots
  ctx.fillStyle = '#fff';
  const dots = [[-0.4,-0.85,0.18],[0.3,-1.05,0.16],[0.55,-0.78,0.14],[-0.05,-1.00,0.18],[0.15,-0.72,0.12]];
  for (let i = 0; i < dots.length; i++) {
    const d = dots[i];
    ctx.beginPath(); ctx.arc(d[0]*baseR, d[1]*baseR, d[2]*baseR, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function _drawBowlDonguri(gs, d, now) {
  const ctx = gs.ctx;
  const t = Math.max(0, Math.min(1, (now - d.t0) / BOWL_DONGURI_FLIGHT_MS));
  const x = (d.startX + (d.targetX - d.startX) * t) * gs.w;
  const yLine = (d.startY + (d.targetY - d.startY) * t) * gs.h;
  const lift = Math.sin(t * Math.PI) * gs.h * 0.22;
  const y = yLine - lift;
  // landing predictor shadow
  if (t < 1) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    const sx = d.targetX * gs.w, sy = d.targetY * gs.h;
    const sr = Math.min(gs.w, gs.h) * 0.045;
    ctx.beginPath(); ctx.ellipse(sx, sy + sr * 0.35, sr, sr * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // donguri body
  const r = Math.min(gs.w, gs.h) * 0.032 * (1 - 0.25 * t);
  const spin = (d.spin || 1) * (now / 80) * 0.05;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  // body
  ctx.fillStyle = '#7a4a22';
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 1.15, 0, 0, Math.PI * 2); ctx.fill();
  // cap
  ctx.fillStyle = '#4d2f15';
  ctx.beginPath(); ctx.arc(0, -r * 0.55, r * 0.95, Math.PI, 0); ctx.fill();
  // cap texture lines
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.55); ctx.lineTo(r * 0.6, -r * 0.55);
  ctx.stroke();
  // stem on top
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(-r * 0.08, -r * 1.55, r * 0.16, r * 0.4);
  ctx.restore();
}

function _drawBowlPono(gs, now) {
  const ctx = gs.ctx;
  const h = gs.h * BOWL_PONO_HEIGHT_REL;
  const w = h;
  const x = gs.w / 2 - w / 2;
  const yBase = gs.h - h - gs.h * 0.015;
  const throwAge = gs.pono.throwT ? (now - gs.pono.throwT) : 9999;
  const throwT = Math.max(0, 1 - throwAge / 350);
  const dy = -throwT * h * 0.08;
  if (imgPono && imgPono.complete && imgPono.naturalWidth) {
    // 左右反転禁止 (スペック厳守)、そのまま描画
    ctx.drawImage(imgPono, x, yBase + dy, w, h);
  } else {
    ctx.save();
    ctx.font = (h * 0.8) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('🐻', gs.w / 2, gs.h - gs.h * 0.015 + dy);
    ctx.restore();
  }
}

function _finishBowlGame(gs) {
  if (gs !== _bowlGameState) return;
  try { _playMzSePitch('correct', 2); } catch (_) {}
  _webGimmickSetTimeout(function() {
    if (gs !== _bowlGameState) return;
    _resolveBowlGame();
  }, 900);
}

function _resolveBowlGame() {
  const st = _webGimmickState;
  if (st) {
    st.webCleared = true;
    st.clearedAt = performance.now();
  }
  _updateFlagInventoryHud();
  _clearBowlGimmickTimers();
  _bowlGameState = null;
  encStageEl.innerHTML =
    '<div class="enc-result win">' +
      '<div class="enc-result-title">クモさん、たすかった！</div>' +
      '<div class="enc-result-emoji">🕷️</div>' +
      '<div class="enc-result-body">「どんぐり、ありがとう！<br>みちが ひらいたよ！」</div>' +
    '</div>';
  _webGimmickSetTimeout(function() {
    if (_encounterActive) _closeEncounter(true);
  }, 950);
}

"""

# Reverse the python-escaped Japanese strings: NEW_BLOCK is already a proper unicode str.
# We just need to make sure file is written as UTF-8.

new_text = text[:start] + NEW_BLOCK + text[disp:]

# Sanity: ensure no \u 残留 (we intentionally used escape literals so they render properly)
assert 'どんぐり' in NEW_BLOCK  # どんぐり

with io.open(PATH, 'w', encoding='utf-8', newline='') as f:
    f.write(new_text)

# Report
print('Original length:', len(text))
print('New length:     ', len(new_text))
print('Removed bytes:  ', len(text) - len(new_text))
print('NEW_BLOCK chars:', len(NEW_BLOCK))
