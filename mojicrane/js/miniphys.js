// mojicrane/js/miniphys.js
// もじもじクレーン round-3: 増分物理レイヤー (custom mini pendulum/impulse solver)。
// Matter.js 等の外部ライブラリは使わず、この 1 ファイルで完結する軽量ソルバー。
// つかんだブロックは「振り子」、離した/滑ったブロックは「弾道 + 減衰」でシミュレートし、
// 静止したら呼び出し側 (game.js) の cols[].blocks 配列へ論理的に戻す。
// 配列 (cols[].blocks) は常に唯一の正であり、このファイルは描画用の姿勢と
// 「滑ったかどうか」の判定だけを提供する読み取り専用レイヤー。
//
// 注意 (scope invariant): 列ごとの重心 (COM) 判定・将棋倒し演出は意図的に実装しない。
// 設計メモにその案があっても、cols[].blocks の配列長=列の高さという不変条件を壊す
// 状態管理の追加 (computeTowerState 相当) は行わない。
//
// 公開 API (window.MiniPhys):
//   configure({ floorY, blockSize })      … FLOOR / BLOCK 定数を注入 (起動時に一度)
//   reset()                               … ラウンド開始時に全クリア
//   spawnCarried(block, u, tipX, tipY)    … 'close' でつかんだ瞬間に振り子を生成
//   isCarrying() / currentCarried()       … 振り子が生きているか / その内部状態
//   getCarriedPose()                      … {x, y, angle} クレーン先端からの相対姿勢
//   getCarriedVelocity()                  … {vx, vy, omega} 現在の振り子速度 (離す時に使う)
//   slipTriggered()                       … 角度/張力条件で「滑った」か (debounce込み)
//   releaseCarried(extraVx, extraVy)      … 振り子を終了し、離脱時の姿勢/速度を返す
//   clearCarried()                        … 振り子を強制終了 (後始末用)
//   spawnFalling(block, x, y, vx, vy, omega, opts) … 落下体を生成 (release/toss用)
//   step(dt, clawTip, opts)               … 1フレーム進める。opts = {cfg, slowT, onSettle, onChuteCatch}
//   bodiesForDraw()                       … 落下中のブロック一覧 (描画用)
//   levelSlipParams(cfg, block)           … thetaSlip 等 (バランスメーター用に公開)
(function () {
  'use strict';

  const G = 1500; // px/s^2
  const LIN_DAMP_AIR = 0.02; // per second (exponential decay factor base)
  const ANG_DAMP_AIR = 0.5;
  const RESTITUTION_DEFAULT = 0.15;
  const HOMING_K = 6.0; // 弾道が列/シュートの中心へゆるく寄っていく (投げ物らしい軌道用)
  const SLEEP_V = 8; // px/s
  const SLEEP_OMEGA = 0.05; // rad/s
  const SLEEP_TIME = 0.25; // s
  const SLIP_DEBOUNCE = 0.12; // s sustained angle-over-limit before triggering

  let FLOOR_Y = 504;
  let BLOCK_SIZE = 62;

  let carried = null; // pendulum body while claw holds a block
  let falling = []; // free bodies (falling / settling)
  let slipAngleTimer = 0;

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function blockMass(block) {
    if (block && block.kind === 'junk') {
      if (block.shapeKey === 'wide') return 1.6;
      if (block.shapeKey === 'el') return 2.0;
      if (block.shapeKey === 'tee') return 2.0;
      return 1.6;
    }
    return 1.0;
  }

  function blockSize(block) {
    if (block && block.kind === 'junk') {
      if (block.shapeKey === 'wide') return { w: 118, h: 40 };
      if (block.shapeKey === 'el') return { w: 78, h: 78 };
      if (block.shapeKey === 'tee') return { w: 96, h: 60 };
      return { w: 118, h: 40 };
    }
    return { w: 54, h: 54 };
  }

  function configure(opts) {
    if (opts && typeof opts.floorY === 'number') FLOOR_Y = opts.floorY;
    if (opts && typeof opts.blockSize === 'number') BLOCK_SIZE = opts.blockSize;
  }

  function reset() {
    carried = null;
    falling = [];
    slipAngleTimer = 0;
  }

  // --- carried pendulum -----------------------------------------------

  function spawnCarried(block, u, tipX, tipY) {
    const size = blockSize(block);
    const uu = clamp(u || 0, -1, 1);
    const ax = uu * 0.85 * (size.w / 2);
    const L = Math.sqrt(ax * ax + Math.pow(size.h / 2 + 4, 2)) || 1;
    carried = {
      block,
      u: uu,
      L,
      theta: (typeof block.tilt === 'number' ? block.tilt : 0),
      omega: 0,
      lastTipX: tipX,
      lastClawVx: 0,
      slipAccum: 0,
      broken: false
    };
    slipAngleTimer = 0;
    return carried;
  }

  function isCarrying() {
    return !!carried;
  }

  function currentCarried() {
    return carried;
  }

  function getCarriedPose() {
    if (!carried) return null;
    const c = carried;
    return { x: c.L * Math.sin(c.theta), y: c.L * Math.cos(c.theta), angle: c.theta };
  }

  function getCarriedVelocity() {
    if (!carried) return { vx: 0, vy: 0, omega: 0 };
    const c = carried;
    return {
      vx: c.L * c.omega * Math.cos(c.theta),
      vy: c.L * c.omega * Math.sin(c.theta),
      omega: c.omega
    };
  }

  function levelSlipParams(cfg, block) {
    const isJunk = block && block.kind === 'junk';
    const slipLimit = isJunk ? ((cfg && cfg.junkSlip) || (cfg && cfg.slip) || 28) : ((cfg && cfg.slip) || 28);
    const thetaSlip = clamp(Math.atan(slipLimit / 27), 0.30, 1.05);
    const gMul = slipLimit / 28;
    return { thetaSlip, gMul };
  }

  function levelDamping(cfg, u) {
    const absU = Math.abs(u);
    const slip = cfg && typeof cfg.slip === 'number' ? cfg.slip : 28;
    if (slip >= 900) return 8.0; // easy: slip=999 => always stiff, never slips
    if (slip <= 24) return lerp(4.5, 0.9, absU); // challenge: livelier pendulum
    return lerp(6.0, 1.4, absU); // normal
  }

  function slipTriggered() {
    return !!(carried && carried.broken);
  }

  function stepCarried(dt, clawTip, cfg, slowT) {
    if (!carried) return;
    const c = carried;
    const L = c.L;
    const clawVx = (clawTip.x - c.lastTipX) / Math.max(dt, 1 / 1000);
    const clawAx = (clawVx - c.lastClawVx) / Math.max(dt, 1 / 1000);
    c.lastTipX = clawTip.x;
    c.lastClawVx = clawVx;

    const damp = levelDamping(cfg, c.u);
    const thetaAcc = -(G / L) * Math.sin(c.theta) - damp * c.omega - (clawAx / L) * Math.cos(c.theta);
    c.omega += thetaAcc * dt;
    c.theta += c.omega * dt;

    if (slowT > 0) {
      slipAngleTimer = 0; // ゆっくりタイム中は既存の slowT フォギブネスを physics 側にも適用
      return;
    }

    const params = levelSlipParams(cfg, c.block);
    const m = blockMass(c.block);
    const tension = m * (G * Math.cos(c.theta) + L * c.omega * c.omega);
    const gripBudget = m * G * params.gMul;

    const over = Math.abs(c.theta) > params.thetaSlip;
    slipAngleTimer = over ? slipAngleTimer + dt : 0;
    if (slipAngleTimer >= SLIP_DEBOUNCE || tension > gripBudget) {
      c.broken = true;
    }
  }

  // Ends the pendulum and returns its release pose+velocity (relative to claw tip).
  // Does NOT spawn a falling body itself — the caller decides the fall target
  // (column vs chute) and calls spawnFalling, keeping a single spawn entry point.
  function releaseCarried(extraVx, extraVy) {
    if (!carried) return { x: 0, y: 20, vx: extraVx || 0, vy: extraVy || 0, omega: 0 };
    const c = carried;
    const pose = getCarriedPose();
    const vel = getCarriedVelocity();
    carried = null;
    slipAngleTimer = 0;
    return {
      x: pose.x,
      y: pose.y,
      vx: (extraVx || 0) + vel.vx,
      vy: (extraVy || 0) + vel.vy,
      omega: vel.omega
    };
  }

  function clearCarried() {
    carried = null;
    slipAngleTimer = 0;
  }

  // --- falling / settling bodies ---------------------------------------

  function spawnFalling(block, x, y, vx, vy, omega, opts) {
    opts = opts || {};
    const size = blockSize(block);
    const body = {
      block,
      x, y,
      angle: (typeof block.tilt === 'number' ? block.tilt : 0),
      vx: vx || 0,
      vy: vy || 0,
      omega: omega || 0,
      w: size.w,
      h: size.h,
      m: blockMass(block),
      restitution: RESTITUTION_DEFAULT,
      target: opts.target || null, // { type:'chute', zone } or { type:'column', col }
      grounded: false,
      sleepT: 0,
      settleAngleT: 0,
      watchdog: opts.watchdog != null ? opts.watchdog : 0.9
    };
    falling.push(body);
    return body;
  }

  function groundYFor(body) {
    const t = body.target;
    if (t && t.type === 'column' && t.col) {
      return FLOOR_Y - t.col.blocks.length * BLOCK_SIZE + body.h / 2;
    }
    return FLOOR_Y - body.h / 2;
  }

  function targetXFor(body) {
    const t = body.target;
    if (!t) return null;
    if (t.type === 'column' && t.col) return t.col.x;
    if (t.type === 'chute' && t.zone) return t.zone.x;
    return null;
  }

  function stepFalling(dt, hooks) {
    hooks = hooks || {};
    for (let i = falling.length - 1; i >= 0; i -= 1) {
      const b = falling[i];

      if (b.target && b.target.type === 'chute') {
        const zone = b.target.zone;
        const withinX = Math.abs(b.x - zone.x) <= 34;
        const boxTop = zone.boxY != null ? zone.boxY : zone.y - 24;
        const withinY = b.y >= boxTop && b.y <= zone.y + 24;
        if (withinX && withinY) {
          falling.splice(i, 1);
          if (hooks.onChuteCatch) hooks.onChuteCatch(b);
          continue;
        }
        b.watchdog -= dt;
        if (b.watchdog <= 0) {
          // safety net: sensor never fired (freak bounce) — snap into the chute mouth anyway
          // so evaluate() can never be orphaned and the round can never soft-lock.
          falling.splice(i, 1);
          if (hooks.onChuteCatch) hooks.onChuteCatch(b);
          continue;
        }
      }

      const targetX = targetXFor(b);
      if (targetX != null) b.vx += (targetX - b.x) * HOMING_K * dt;

      b.vy += G * dt;
      b.vx *= Math.pow(1 - LIN_DAMP_AIR, dt);
      b.omega *= Math.pow(1 - ANG_DAMP_AIR, dt);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += b.omega * dt;

      const groundY = groundYFor(b);
      if (b.y >= groundY) {
        b.y = groundY;
        if (Math.abs(b.vy) > 12) {
          b.vy = -b.vy * b.restitution;
          b.omega *= 0.6;
        } else {
          b.vy = 0;
        }
        b.vx *= 0.5;
        b.grounded = true;
      }

      const settled = b.grounded && Math.abs(b.vx) < SLEEP_V && Math.abs(b.vy) < SLEEP_V && Math.abs(b.omega) < SLEEP_OMEGA;
      b.sleepT = settled ? b.sleepT + dt : 0;
      if (b.sleepT > 0) {
        b.settleAngleT = Math.min(1, b.settleAngleT + dt / 0.15);
        b.angle = lerp(b.angle, 0, b.settleAngleT);
      }
      if (b.sleepT >= SLEEP_TIME) {
        falling.splice(i, 1);
        if (hooks.onSettle) hooks.onSettle(b);
      }
    }
  }

  function step(dt, clawTip, opts) {
    opts = opts || {};
    stepCarried(dt, clawTip, opts.cfg || {}, opts.slowT || 0);
    stepFalling(dt, opts);
  }

  function bodiesForDraw() {
    return falling;
  }

  window.MiniPhys = {
    configure,
    reset,
    spawnCarried,
    isCarrying,
    currentCarried,
    getCarriedPose,
    getCarriedVelocity,
    slipTriggered,
    releaseCarried,
    clearCarried,
    spawnFalling,
    step,
    bodiesForDraw,
    levelSlipParams
  };
})();
