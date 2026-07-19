// mojicrane/js/phys-matter.js
// もじもじクレーン round-5': physics engine swap. Re-implements the EXACT 19-member
// window.MiniPhys facade (see the removed js/miniphys.js header comment for the full
// contract) on top of vendored Matter.js (js/vendor/matter.min.js, v0.20.0, offline).
// round-7 adds one facade member (awakeDynamicCount, alongside the still-exported
// legacy pileAwakeCount) for the single-block-grip slip gate — 20 members total.
//
// Design constraint: game.js must not change its call sites. Every function below
// has the identical name/signature/return-shape as the old hand-rolled solver; the
// internals now delegate to Matter.Engine/Body/Constraint/Composite/Sleeping.
//
// Engine usage is restricted to Matter.Engine + Matter.Body/Bodies/Constraint/
// Composite/Sleeping/Vector — NEVER Matter.Render or Matter.Runner (this file drives
// its own fixed-step loop from game.js's existing step(dt, ...) call).
//
// round-7: the carry mechanism was ALREADY a real Matter.Constraint (see
// spawnCarried/stepCarried/releaseCarried below) — there was never a hand-rolled
// theta/omega pendulum ODE in this file. round-7's changes are: (1) constraint
// param alignment (length pinned to 0, damping now scales with grab offset |u|
// instead of a flat value), (2) a world-census single-block-grip slip gate
// (awakeDynamicCount), (3) a PD (damped) homing controller for chute targets +
// an overshoot snap-catch, fixing a silent-drop bug where a CLEANUP-bound block
// could fall uncaught past its catch box under undamped oscillation.
(function () {
  'use strict';

  if (!window.Matter) {
    // Vendor failed to load — game.js already guards every MiniPhys.* call site with
    // `if (window.MiniPhys)`, so simply not assigning window.MiniPhys degrades to the
    // same no-physics fallback path that existed before this swap.
    return;
  }

  const Matter = window.Matter;
  const { Engine, Bodies, Body, Composite, Constraint, Sleeping, Vector } = Matter;

  // --- tunables (ported/mirrored from the old miniphys.js constants) ----------
  const HOMING_K = 6.0; // pile/chute homing pull-toward-target strength
  const HOMING_DAMP = 4.0; // chute-target homing damping (round-7 CLEANUP silent-drop fix)
  const SLIP_DEBOUNCE = 0.12; // s sustained over-angle before slip latches
  const WAKE_CAP = 4; // bodies woken per grab/topple pass
  const PILE_TILT_CLAMP = Math.PI / 4; // forceSettleAll implausible-tilt clamp

  // Collision filtering: pile-target bodies collide with each other + the outer
  // world floor/walls; carried and chute-bound (in-flight) bodies are "ghosts" that
  // pass through everything (mirrors the old miniphys.js behavior, where the OBB
  // contact solver only ever ran for pile-target bodies — chute/carried bodies were
  // pure ballistic/pendulum motion with zero contact response).
  const CAT_STATIC = 0x0001;
  const CAT_PILE = 0x0002;
  const CAT_GHOST = 0x0004;

  function filterForTarget(target) {
    if (target && target.type === 'pile') return { category: CAT_PILE, mask: CAT_PILE | CAT_STATIC };
    return { category: CAT_GHOST, mask: 0x0000 };
  }

  let FLOOR_Y = 504;
  let BLOCK_SIZE = 62;

  let engine = null;
  let floorBody = null;
  let wallBodies = [];

  // bookkeeping mirrors (kept so bodiesForDraw()/restingBodies() return the same
  // shape as before: plain objects with x/y/angle/w/h/block, kept in sync with the
  // underlying Matter Body every step).
  let falling = []; // mirror records for awake, non-sleeping bodies with gameData
  let resting = []; // mirror records for asleep pile-target bodies
  let nextBodyId = 1;

  // carried pendulum state
  let carried = null; // { block, body, constraint, u, tipX, tipY, restTilt0, restTilt, restTiltT, broken, multiPart }
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
    if (block && block.kind === 'duo') return 1.3;
    return 1.0;
  }

  function blockSize(block) {
    if (block && block.kind === 'junk') {
      if (block.shapeKey === 'wide') return { w: 118, h: 40 };
      if (block.shapeKey === 'el') return { w: 78, h: 78 };
      if (block.shapeKey === 'tee') return { w: 96, h: 60 };
      return { w: 118, h: 40 };
    }
    if (block && block.kind === 'duo') return { w: 96, h: 54 };
    return { w: 54, h: 54 };
  }

  // --- setup -------------------------------------------------------------

  function buildWorld() {
    engine = Engine.create({ enableSleeping: true });
    engine.world.gravity.y = 1.0;
    engine.positionIterations = 8;
    engine.velocityIterations = 6;

    floorBody = Bodies.rectangle(480, FLOOR_Y + 60, 2200, 120, {
      isStatic: true,
      label: 'floor',
      friction: 0.8,
      frictionStatic: 0.9
    });
    const wallL = Bodies.rectangle(-20, 270, 40, 1200, { isStatic: true, label: 'wallL' });
    const wallR = Bodies.rectangle(980, 270, 40, 1200, { isStatic: true, label: 'wallR' });
    wallBodies = [wallL, wallR];
    Composite.add(engine.world, [floorBody, wallL, wallR]);
  }

  function configure(opts) {
    if (opts && typeof opts.floorY === 'number') FLOOR_Y = opts.floorY;
    if (opts && typeof opts.blockSize === 'number') BLOCK_SIZE = opts.blockSize;
    if (!engine) buildWorld();
  }

  function reset() {
    if (!engine) buildWorld();
    // keep the static floor/walls, drop every dynamic body + constraint
    Composite.clear(engine.world, true);
    falling = [];
    resting = [];
    carried = null;
    slipAngleTimer = 0;
    nextBodyId = 1;
  }

  // --- mirror record sync (keeps bodiesForDraw()/restingBodies() shape stable) --

  function syncMirror(rec) {
    rec.x = rec.body.position.x;
    rec.y = rec.body.position.y;
    rec.angle = rec.body.angle;
  }

  function makeMirror(body, block, target, opts) {
    const rec = {
      id: body.id,
      body,
      block,
      x: body.position.x,
      y: body.position.y,
      angle: body.angle,
      w: opts.w,
      h: opts.h,
      target: target || null,
      keepTilt: !!opts.keepTilt,
      wallMinX: typeof opts.wallMinX === 'number' ? opts.wallMinX : null,
      wallMaxX: typeof opts.wallMaxX === 'number' ? opts.wallMaxX : null,
      supports: [],
      sleepT: 0,
      settleAngleT: 0,
      watchdog: opts.watchdog != null ? opts.watchdog : 0.9
    };
    body.plugin = body.plugin || {};
    body.plugin.gameData = rec;
    return rec;
  }

  // --- carried pendulum ----------------------------------------------------

  function spawnCarried(block, u, tipX, tipY) {
    const size = blockSize(block);
    const uu = clamp(u || 0, -1, 1);
    const restTilt0 = typeof block.tilt === 'number' ? block.tilt : 0;

    // Reuse the live Matter body if this block already has one (pulled straight out
    // of resting[] by removeResting just before this call); otherwise this is a
    // defensive fallback (should not normally happen given game.js's call order).
    let body = block.__physBody || null;
    if (!body) {
      console.warn('[MiniPhys] spawnCarried: block had no __physBody (unexpected call order), creating fallback body.');
      body = Bodies.rectangle(tipX, tipY + size.h, size.w, size.h, {
        angle: restTilt0,
        density: 0.001,
        friction: 0.8,
        frictionStatic: 1.0,
        restitution: 0.05,
        chamfer: { radius: 10 }
      });
      Composite.add(engine.world, body);
    }
    Sleeping.set(body, false);
    // carried = ghost: passes through pile/floor/walls, matching the old pendulum
    // (which had zero contact response with anything while held).
    body.collisionFilter.category = CAT_GHOST;
    body.collisionFilter.mask = 0x0000;
    block.__physBody = body;

    const worldGrip = { x: body.position.x + uu * (size.w / 2) * 0.85, y: body.position.y - size.h / 2 };
    const local = Vector.rotate(
      { x: worldGrip.x - body.position.x, y: worldGrip.y - body.position.y },
      -body.angle
    );

    // Grip firmness scales continuously with |uu| (dead-center = rigid,
    // full offset = loose) instead of stepping at the uu===0 boundary. Rest
    // length is always 0 — the anchor IS the grip point, so the entire swing
    // lever comes from pointB's offset from the body center (no second,
    // redundant lever from a nonzero constraint length). Damping mirrors the
    // same firmness curve: dead-center grabs are near-critically damped (no
    // visible swing), edge grabs are underdamped (lively pendulum).
    const absU = Math.abs(uu);
    const constraint = Constraint.create({
      pointA: { x: tipX, y: tipY + 4 },
      bodyB: body,
      pointB: local,
      length: 0,
      stiffness: lerp(1, 0.15, absU),
      damping: lerp(0.3, 0.05, absU)
    });
    Composite.add(engine.world, constraint);

    carried = {
      block,
      body,
      constraint,
      u: uu,
      theta: 0, // swing angle, refreshed every stepCarried() tick; read by
                // drawBalanceMeter() via MiniPhys.currentCarried().theta
      restTilt0,
      restTilt: restTilt0,
      restTiltT: 0,
      broken: false,
      multiPart: block.multiPart === true
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

  // round-7: world-space pass-through of the real Matter body's own state (the
  // subtract-then-re-add round trip through the claw tip that used to happen here
  // was pure noise, since stepCarried keeps pointA pinned to the tip every frame).
  // Consumers: drawClaw() and drawBalanceMeter() in game.js, both rendering-only.
  // releaseCarried() below does NOT use this — it needs tip-relative offsets for
  // its spawnFalling() contract and computes that inline instead.
  function getCarriedPose() {
    if (!carried) return null;
    const c = carried;
    return {
      x: c.body.position.x,
      y: c.body.position.y,
      angle: c.body.angle + (c.restTilt || 0)
    };
  }

  function getCarriedVelocity() {
    if (!carried) return { vx: 0, vy: 0, omega: 0 };
    return { vx: carried.body.velocity.x, vy: carried.body.velocity.y, omega: carried.body.angularVelocity };
  }

  function levelSlipParams(cfg, block) {
    const isJunk = block && block.kind === 'junk';
    const slipLimit = isJunk ? ((cfg && cfg.junkSlip) || (cfg && cfg.slip) || 28) : ((cfg && cfg.slip) || 28);
    const thetaSlip = clamp(Math.atan(slipLimit / 27), 0.30, 1.05);
    const gMul = slipLimit / 28;
    return { thetaSlip, gMul };
  }

  // round-5: number of pile-target bodies currently awake — the single-block grip
  // guarantee. When this is 0 (and the carried block isn't a multi-part duo), the
  // carried block can never slip, regardless of swing angle or tension. Kept
  // exported for facade stability (drawGrabCue-adjacent tooling may still read it).
  function pileAwakeCount() {
    let n = 0;
    for (let i = 0; i < falling.length; i += 1) {
      const rec = falling[i];
      if (rec.target && rec.target.type === 'pile') n += 1;
    }
    return n;
  }

  // round-7: direct Matter world census — counts every non-sleeping, non-static
  // body (this INCLUDES the carried body itself, which is always awake by
  // construction). "The carried block is the only live thing in the world" is
  // therefore awakeDynamicCount() <= 1, matching the single-block-grip guarantee
  // literally instead of approximating it via the falling[]-pile-only mirror.
  function awakeDynamicCount() {
    if (!engine) return 0;
    return Composite.allBodies(engine.world).filter((b) => !b.isSleeping && !b.isStatic).length;
  }

  function slipTriggered() {
    if (!carried || !carried.broken) return false;
    if (awakeDynamicCount() <= 1 && carried.multiPart !== true) {
      carried.broken = false;
      slipAngleTimer = 0;
      return false;
    }
    return true;
  }

  function stepCarried(dt, clawTip, cfg, slowT) {
    if (!carried) return;
    const c = carried;
    if (c.restTilt0) {
      c.restTiltT = Math.min(1, c.restTiltT + dt / 0.3);
      c.restTilt = c.restTilt0 * (1 - c.restTiltT);
    }
    // moving anchor: the claw tip drags the constraint's world-space pointA.
    // clawTip.y already includes the +4 grip offset (see game.js step() call site),
    // matching spawnCarried's own tipY + 4 — do not add it again here.
    c.constraint.pointA.x = clawTip.x;
    c.constraint.pointA.y = clawTip.y;

    const anchor = c.constraint.pointA;
    const dx = c.body.position.x - anchor.x;
    const dy = c.body.position.y - anchor.y;
    const theta = Math.atan2(dx, dy || 1);
    c.theta = theta; // kept fresh for drawBalanceMeter() (MiniPhys.currentCarried().theta)

    if (slowT > 0) {
      slipAngleTimer = 0;
      return;
    }

    const params = levelSlipParams(cfg, c.block);
    const loneQuiet = awakeDynamicCount() <= 1 && c.multiPart !== true;
    if (loneQuiet) {
      slipAngleTimer = 0;
      return;
    }
    const over = Math.abs(theta) > params.thetaSlip;
    slipAngleTimer = over ? slipAngleTimer + dt : 0;
    if (slipAngleTimer >= SLIP_DEBOUNCE) {
      c.broken = true;
    }
  }

  function releaseCarried(extraVx, extraVy) {
    if (!carried) return { x: 0, y: 20, vx: extraVx || 0, vy: extraVy || 0, omega: 0 };
    const c = carried;
    // Tip-relative offset (NOT getCarriedPose()'s world-space return, round-7):
    // game.js's three call sites (carry-phase slip x2, release-phase x1) all do
    // spawnFalling(block, claw.tipX + rel.x, claw.tipY + rel.y, ...) — that
    // contract is preserved by computing the offset from the live anchor here.
    const anchor = c.constraint.pointA;
    const vel = getCarriedVelocity();
    const rel = { x: c.body.position.x - anchor.x, y: c.body.position.y - anchor.y };
    Composite.remove(engine.world, c.constraint);
    carried = null;
    slipAngleTimer = 0;
    return {
      x: rel.x,
      y: rel.y,
      vx: (extraVx || 0) + vel.vx,
      vy: (extraVy || 0) + vel.vy,
      omega: vel.omega
    };
  }

  function clearCarried() {
    if (carried) {
      Composite.remove(engine.world, carried.constraint);
    }
    carried = null;
    slipAngleTimer = 0;
  }

  // --- falling / settling bodies -------------------------------------------

  function spawnFalling(block, x, y, vx, vy, omega, opts) {
    opts = opts || {};
    const size = blockSize(block);

    // Retarget an already-live body (e.g. just released from the carry constraint)
    // instead of creating a duplicate — critical leak guard.
    let body = block.__physBody || null;
    if (body && Composite.get(engine.world, body.id, 'body')) {
      Body.setPosition(body, { x, y });
      Body.setVelocity(body, { x: vx || 0, y: vy || 0 });
      Body.setAngularVelocity(body, omega || 0);
      Sleeping.set(body, false);
    } else {
      body = Bodies.rectangle(x, y, size.w, size.h, {
        angle: typeof block.tilt === 'number' ? block.tilt : 0,
        density: 0.001,
        friction: 0.6,
        frictionStatic: 0.9,
        restitution: 0.15,
        chamfer: { radius: 8 }
      });
      Body.setVelocity(body, { x: vx || 0, y: vy || 0 });
      Body.setAngularVelocity(body, omega || 0);
      Composite.add(engine.world, body);
      block.__physBody = body;
    }
    const filt = filterForTarget(opts.target);
    body.collisionFilter.category = filt.category;
    body.collisionFilter.mask = filt.mask;

    const rec = makeMirror(body, block, opts.target || null, {
      w: size.w,
      h: size.h,
      keepTilt: opts.keepTilt,
      wallMinX: opts.wallMinX,
      wallMaxX: opts.wallMaxX,
      watchdog: opts.watchdog
    });
    rec.id = nextBodyId++;
    body.plugin.gameData = rec;

    // expose an `angle` setter-compatible field: game.js does `spawned.angle = x`
    // right after spawnFalling() to seed the visual pile tilt (see spawnPile()).
    Object.defineProperty(rec, 'angle', {
      configurable: true,
      enumerable: true,
      get() { return rec.body.angle; },
      set(v) { Body.setAngle(rec.body, v); }
    });

    falling.push(rec);
    return rec;
  }

  function restingBodies() {
    return resting;
  }

  function removeResting(rec) {
    if (!rec) return;
    const idx = resting.indexOf(rec);
    if (idx !== -1) resting.splice(idx, 1);
  }

  function wakeMirror(rec, vxKick) {
    const idx = resting.indexOf(rec);
    if (idx !== -1) resting.splice(idx, 1);
    Sleeping.set(rec.body, false);
    Body.setVelocity(rec.body, { x: typeof vxKick === 'number' ? vxKick : (Math.random() - 0.5) * 40, y: 0 });
    Body.setAngularVelocity(rec.body, (Math.random() - 0.5) * 0.5);
    rec.sleepT = 0;
    rec.settleAngleT = 0;
    if (falling.indexOf(rec) === -1) falling.push(rec);
  }

  const MIN_SUPPORT_OVERLAP = 14;

  function computeSupports(rec, restingArr) {
    const out = [];
    const halfA = rec.w / 2;
    restingArr.forEach((r) => {
      if (r.id === rec.id) return;
      const halfB = r.w / 2;
      const overlap = Math.min(rec.x + halfA, r.x + halfB) - Math.max(rec.x - halfA, r.x - halfB);
      if (overlap < MIN_SUPPORT_OVERLAP) return;
      const rTop = r.y - r.h / 2;
      const bBottom = rec.y + rec.h / 2;
      if (Math.abs(rTop - bBottom) <= 6) out.push(r.id);
    });
    return out;
  }

  // round-4 semantics preserved: limited depth-1 cascade off the pile bookkeeping,
  // now waking real Matter bodies (Matter's own solver drives the actual tumble).
  function computePileTopple(removedRec) {
    if (!removedRec) return { woke: [], wobbled: [] };
    const removedId = removedRec.id;
    const woke = [];
    const wobbled = [];
    const dependents = resting.filter((r) => (r.supports || []).indexOf(removedId) !== -1);
    let wakeBudget = WAKE_CAP;
    dependents.forEach((dep) => {
      if (wakeBudget <= 0) return;
      const stillResting = resting.filter((r) => r.id !== dep.id && r.id !== removedId);
      const newSupports = computeSupports(dep, stillResting);
      const onFloor = Math.abs((dep.y + dep.h / 2) - FLOOR_Y) <= 6;
      if (!newSupports.length && !onFloor) {
        wakeMirror(dep);
        woke.push(dep.id);
        wakeBudget -= 1;
        return;
      }
      dep.supports = newSupports;
      if (newSupports.length) {
        const xs = newSupports.map((id) => stillResting.find((r) => r.id === id)).filter(Boolean).map((r) => r.x);
        const minX = Math.min.apply(null, xs) - 10;
        const maxX = Math.max.apply(null, xs) + 10;
        if (dep.x < minX || dep.x > maxX) {
          wakeMirror(dep, (dep.x < minX ? -1 : 1) * (30 + Math.random() * 30));
          woke.push(dep.id);
          wakeBudget -= 1;
        } else {
          dep.block.wobble = Math.max(dep.block.wobble || 0, 1);
          wobbled.push(dep.id);
        }
      }
    });
    const stale = [removedId].concat(woke);
    resting.forEach((r) => {
      if (r.supports && r.supports.length) {
        r.supports = r.supports.filter((id) => stale.indexOf(id) === -1);
      }
    });
    return { woke, wobbled };
  }

  function forceSettleAll() {
    for (let i = falling.length - 1; i >= 0; i -= 1) {
      const rec = falling[i];
      if (!(rec.target && rec.target.type === 'pile')) continue;
      Body.setVelocity(rec.body, { x: 0, y: 0 });
      Body.setAngularVelocity(rec.body, 0);
      if (Math.abs(rec.body.angle) > PILE_TILT_CLAMP) {
        Body.setAngle(rec.body, rec.body.angle > 0 ? Math.PI / 6 : -Math.PI / 6);
      }
      Sleeping.set(rec.body, true);
      syncMirror(rec);
      falling.splice(i, 1);
      rec.supports = computeSupports(rec, resting);
      resting.push(rec);
    }
  }

  // --- per-frame homing / chute-capture / watchdog / sleep bookkeeping --------

  function applyHoming(rec, dt) {
    const t = rec.target;
    if (!t) return;
    let targetX = null;
    if (t.type === 'chute' && t.zone) targetX = t.zone.x;
    else if (t.type === 'pile' && typeof t.homingX === 'number') targetX = t.homingX;
    if (targetX == null) return;
    // round-7 CLEANUP silent-drop fix: chute-bound bodies are collision-free
    // ghosts (never touch floor/wall to bleed off energy), so a pure P-controller
    // here turns any release-time swing into a persistent, undamped horizontal
    // oscillation that can miss the one-shot catch-box test entirely. Add a
    // damping (D) term for chute targets so the perturbation decays instead of
    // oscillating; pile homing keeps the original pure-P feel (unchanged toss).
    const dvx = t.type === 'chute'
      ? (targetX - rec.body.position.x) * HOMING_K * dt - rec.body.velocity.x * HOMING_DAMP * dt
      : (targetX - rec.body.position.x) * HOMING_K * dt;
    Body.setVelocity(rec.body, { x: rec.body.velocity.x + dvx, y: rec.body.velocity.y });
  }

  function applyWallClamp(rec) {
    if (rec.wallMinX != null && rec.body.position.x < rec.wallMinX) {
      Body.setPosition(rec.body, { x: rec.wallMinX, y: rec.body.position.y });
      Body.setVelocity(rec.body, { x: Math.abs(rec.body.velocity.x) * 0.3, y: rec.body.velocity.y });
    }
    if (rec.wallMaxX != null && rec.body.position.x > rec.wallMaxX) {
      Body.setPosition(rec.body, { x: rec.wallMaxX, y: rec.body.position.y });
      Body.setVelocity(rec.body, { x: -Math.abs(rec.body.velocity.x) * 0.3, y: rec.body.velocity.y });
    }
  }

  function stepFalling(dt, hooks) {
    hooks = hooks || {};
    for (let i = falling.length - 1; i >= 0; i -= 1) {
      const rec = falling[i];
      syncMirror(rec);

      if (rec.target && rec.target.type === 'chute') {
        const zone = rec.target.zone;
        const withinX = Math.abs(rec.x - zone.x) <= 34;
        const boxTop = zone.boxY != null ? zone.boxY : zone.y - 24;
        const withinY = rec.y >= boxTop && rec.y <= zone.y + 24;
        if (withinX && withinY) {
          falling.splice(i, 1);
          Composite.remove(engine.world, rec.body);
          if (hooks.onChuteCatch) hooks.onChuteCatch(rec);
          continue;
        }
        // round-7 CLEANUP silent-drop fix (overshoot snap-catch): the catch box
        // is otherwise a one-shot y-band test — a block whose homing oscillation
        // phase puts it outside +/-34px x-tolerance the instant it crosses the
        // band falls uncaught, invisibly, until the watchdog below fires far off
        // -screen. Any block that has fallen PAST the box mouth without being
        // caught is snapped into the box that same frame, so landing always
        // happens visibly at the chute, never later off-stage.
        if (rec.y > zone.y + 24) {
          Body.setPosition(rec.body, { x: zone.x, y: boxTop + 12 });
          syncMirror(rec);
          falling.splice(i, 1);
          Composite.remove(engine.world, rec.body);
          if (hooks.onChuteCatch) hooks.onChuteCatch(rec);
          continue;
        }
        rec.watchdog -= dt;
        if (rec.watchdog <= 0) {
          // belt-and-suspenders: even a watchdog-forced catch snaps to the box
          // center first, so it stays visually coherent with evaluate()'s
          // pop/confetti effect fired at the chute position (game.js).
          Body.setPosition(rec.body, { x: zone.x, y: boxTop + 12 });
          syncMirror(rec);
          falling.splice(i, 1);
          Composite.remove(engine.world, rec.body);
          if (hooks.onChuteCatch) hooks.onChuteCatch(rec);
          continue;
        }
      }

      applyHoming(rec, dt);
      applyWallClamp(rec);

      if (rec.target && rec.target.type === 'chute') {
        // round-6 hotfix: chute-bound bodies settle ONLY via the catch-box test or
        // the 0.9s watchdog above — never via the legacy velocity-threshold check
        // further down. That legacy path has no 'chute' case in game.js's onSettle
        // hook, so a low-velocity in-flight block (the common case right after a
        // near-rest claw release) was getting silently evicted before ever
        // reaching its chute box, dropping the kana with zero feedback (fatal if
        // it was the player's last copy of a needed kana). Skip it every frame.
        continue;
      }

      if (rec.target && rec.target.type === 'pile') {
        const settled = rec.body.isSleeping;
        rec.sleepT = settled ? rec.sleepT + dt : 0;
        if (rec.sleepT > 0 && !rec.keepTilt) {
          rec.settleAngleT = Math.min(1, rec.settleAngleT + dt / 0.15);
          Body.setAngle(rec.body, lerp(rec.body.angle, 0, rec.settleAngleT * 0.02));
        }
        if (settled) {
          falling.splice(i, 1);
          syncMirror(rec);
          rec.supports = computeSupports(rec, resting);
          resting.push(rec);
          if (hooks.onSettle) hooks.onSettle(rec);
        }
        continue;
      }

      // legacy chute/column-target settle: sleep-based (Matter handles gravity/floor)
      const settled = rec.body.isSleeping ||
        (Math.abs(rec.body.velocity.x) < 8 && Math.abs(rec.body.velocity.y) < 8 && Math.abs(rec.body.angularVelocity) < 0.05);
      rec.sleepT = settled ? rec.sleepT + dt : 0;
      if (rec.sleepT > 0 && !rec.keepTilt) {
        rec.settleAngleT = Math.min(1, rec.settleAngleT + dt / 0.15);
        Body.setAngle(rec.body, lerp(rec.body.angle, 0, rec.settleAngleT));
      }
      if (rec.sleepT >= 0.25) {
        falling.splice(i, 1);
        if (hooks.onSettle) hooks.onSettle(rec);
      }
    }
  }

  const FIXED_DT = 1 / 60;
  let accMs = 0;

  function step(dt, clawTip, opts) {
    opts = opts || {};
    if (!engine) buildWorld();
    stepCarried(dt, clawTip, opts.cfg || {}, opts.slowT || 0);

    engine.timing.timeScale = (opts.slowT || 0) > 0 ? 0.58 : 1;

    accMs += Math.min(dt * 1000, 50);
    let n = 0;
    while (accMs >= FIXED_DT * 1000 && n < 3) {
      Engine.update(engine, FIXED_DT * 1000);
      accMs -= FIXED_DT * 1000;
      n += 1;
    }
    if (n === 3) accMs = 0;

    stepFalling(dt, opts);
    sweepOrphans();
  }

  // Safety net (not a call-site concern): game.js's reduceMotion 'release' branch
  // calls releaseCarried() (which detaches the constraint but intentionally leaves
  // the Matter body alive for a possible retarget) and then, under reduceMotion,
  // does NOT call spawnFalling — it animates via game.flyers instead. That leaves
  // a untracked, ownerless body drifting under gravity. Since it carries the ghost
  // collision filter (mask 0) it never affects gameplay, but left alone it would
  // accumulate in engine.world for the rest of the session. Sweep any dynamic body
  // that isn't the live carried body and isn't backed by a falling/resting mirror
  // record, once it has drifted well off-stage.
  function sweepOrphans() {
    const bodies = Composite.allBodies(engine.world);
    for (let i = 0; i < bodies.length; i += 1) {
      const b = bodies[i];
      if (b.isStatic) continue;
      if (carried && b === carried.body) continue;
      if (b.plugin && b.plugin.gameData) continue; // tracked via falling[]/resting[]
      if (b.position.y > FLOOR_Y + 400 || b.position.y < -800) {
        Composite.remove(engine.world, b);
      }
    }
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
    restingBodies,
    removeResting,
    computePileTopple,
    levelSlipParams,
    pileAwakeCount,
    awakeDynamicCount,
    forceSettleAll
  };
})();
