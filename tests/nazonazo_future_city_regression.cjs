#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const html = read("nazonazo-tunnel/index.html");
const css = read("nazonazo-tunnel/styles.css");
const game = read("nazonazo-tunnel/js/game.js");

function extractFunction(source, name) {
  const match = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(source);
  assert.ok(match, `${name}: function missing`);
  const open = source.indexOf("{", match.index);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") { quote = char; continue; }
    if (char === "{") depth += 1;
    if (char === "}" && --depth === 0) return source.slice(match.index, index + 1);
  }
  assert.fail(`${name}: function is not closed`);
}

function cssRule(pattern) {
  const match = new RegExp(`${pattern}\\s*\\{([^}]+)\\}`).exec(css);
  assert.ok(match, `CSS rule missing: ${pattern}`);
  return match[1];
}

function assertNoChildFacingKanji(source, label) {
  const literals = [...source.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map(match => match[2]);
  for (const literal of literals.filter(value => /[ぁ-んァ-ヶ一-龠々]/.test(value))) {
    assert.doesNotMatch(literal, /[一-龠々]/, `${label}: child-facing string contains kanji: ${literal}`);
  }
}

/* Existing opaque, looped Future City scenery remains the foundation. */
assert.equal((html.match(/id="futureHorizonLoop"[\s\S]*?<\/div>/)?.[0].match(/class="future-loop-tile"/g) || []).length, 4);
assert.equal((html.match(/id="futureMidLoop"[\s\S]*?<\/div>/)?.[0].match(/class="future-loop-tile"/g) || []).length, 4);
assert.equal((html.match(/id="futureForegroundLoop"[\s\S]*?<\/div>/)?.[0].match(/class="future-loop-tile"/g) || []).length, 8);
assert.match(html, /id="futureCapsuleLayer"[^>]*role="group"[^>]*aria-labelledby="qText"[^>]*hidden/);

const optionFn = extractFunction(game, "futureQuestionOptions");
const optionSandbox = { shuffle: values => values.slice().reverse() };
vm.createContext(optionSandbox);
vm.runInContext(`${optionFn};this.futureQuestionOptions=futureQuestionOptions;`, optionSandbox);
const options = optionSandbox.futureQuestionOptions({ a: ["a", "せいかい"], d: [["b", "ひとつ"], ["c", "ふたつ"]] });
assert.equal(options.length, 2);
assert.equal(options.filter(option => option.ok).length, 1);
assert.equal(options.filter(option => !option.ok).length, 1);

/* Difficulty, timing, and animation values are the approved click-to-stop model. */
for (const pattern of [
  /FUTURE_CRANE_RAIL_PER_TURN=\[\.80,\.75,\.70\]/,
  /FUTURE_CRANE_DESCENT_SPEED=\[150,160,170\]/,
  /FUTURE_CRANE_TARGET_RADIUS=\[48,44,40\]/,
  /FUTURE_CRANE_TARGET_SPEED=\[80,88,96\]/,
  /FUTURE_CRANE_POD_STOP_Y=\[38,34,30\]/,
  /FUTURE_CRANE_POD_SNAP_X=\[42,38,34\]/,
  /FUTURE_CRANE_CORE_SNAP_X=\[60,54,48\]/,
  /FUTURE_CRANE_CORE_STOP_Y=\[42,38,34\]/,
  /FUTURE_CRANE_CUE_HOLD_MS=90/,
  /FUTURE_CRANE_CLAW_CLOSE_MS=160/,
  /FUTURE_CRANE_AUTO_LIFT_MS=320/,
  /FUTURE_CRANE_AUTO_RISE_MS=220/,
  /FUTURE_CRANE_REDUCED_MS=60/,
  /FUTURE_CRANE_RETURN_REDUCED_MS=70/
]) assert.match(game, pattern);

const podWindows = [2 * 38 / 80, 2 * 34 / 88, 2 * 30 / 96];
const coreWindows = [2 * 42 / 80, 2 * 38 / 88, 2 * 34 / 96];
assert.ok(podWindows[0] > 0.60 && podWindows[2] > 0.60, "easy and hard pod stop windows must exceed 0.60s");
assert.ok(coreWindows[0] > 0.60 && coreWindows[2] > 0.60, "easy and hard core stop windows must exceed 0.60s");
assert.ok(160 + 320 < 1000 && 220 < 1000 && 60 < 1000, "automatic feedback must finish within one second");

/* No hold/release, three-tap grip, or direct hook/pod drag state may return. */
for (const forbidden of [
  /FUTURE_CRANE_GRIP/, /futureCraneGrip/, /future-crane-grip/, /data-grip-count/,
  /futureCraneActionHeld/, /futureCraneKeyboardAction/, /futureCranePointerPhaseAtDown/,
  /startFutureCraneAction/, /finishFutureCraneAction/, /handleFutureCraneActionPointerDown/,
  /finishFutureCraneActionPointer/, /cancelFutureCraneActionPointer/,
  /trackFutureCranePickup|moveFutureCraneHook|handleFutureCranePointerDown|handleFutureCranePointerMove/
]) assert.doesNotMatch(game + css, forbidden);
assert.doesNotMatch(game, /ボタンを はな|おしている あいだ|3かい ぎゅっ/);

/* The native action button owns the two clicks and native Enter/Space activation. */
const render = extractFunction(game, "renderFutureCapsuleGame");
for (const className of ["future-crane-handle", "future-crane-action", "future-crane-rail", "future-crane-trolley", "future-crane-hook-rig", "future-crane-core", "future-crane-cradle"]) {
  assert.match(render, new RegExp(`className="${className}`), `${className}: missing`);
}
assert.match(render, /action\.type="button"/);
assert.match(render, /action\.addEventListener\("click",handleFutureCraneActionClick\)/);
assert.doesNotMatch(render, /action\.addEventListener\("pointer(?:down|up|cancel|move)"|action\.addEventListener\("lostpointercapture"/);
assert.doesNotMatch(render, /board\.addEventListener\("pointer(?:down|move|up)/);
assert.doesNotMatch(render, /button\.addEventListener\("click"|bindTap\(button/);
assert.match(render, /button\.tabIndex=-1/);
assert.match(render, /actionLabel\.textContent="おろす"/);
assert.match(render, /aria-keyshortcuts","ArrowLeft ArrowRight Escape"/);
assert.doesNotMatch(render, /aria-keyshortcuts"[^\n]*Space|aria-keyshortcuts"[^\n]*Enter/);

const controls = extractFunction(game, "updateFutureCraneControls");
assert.match(controls, /lowering\?"もういちど おして とめる":"クレーンを おろす"/);
assert.match(controls, /lowering\?"とめる！":"おろす"/);
assert.doesNotMatch(controls, /action\.setAttribute\("aria-pressed"/);
const actionClick = extractFunction(game, "handleFutureCraneActionClick");
assert.match(actionClick, /futureCranePhase==="pod-aligned"[\s\S]*startFutureCraneDescent\("lower-pod"\)/);
assert.match(actionClick, /futureCranePhase==="lower-pod"[\s\S]*finishFutureCranePodDescent\(false\)/);
assert.match(actionClick, /futureCranePhase==="core-aligned"[\s\S]*startFutureCraneDescent\("lower-core"\)/);
assert.match(actionClick, /futureCranePhase==="lower-core"\)finishFutureCraneCoreDescent\(false\)/);

const clickSandbox = {
  futureCranePhase: "pod-aligned", answerLocked: false, futureCapsuleResolving: false, futureCraneKeyboardActive: false,
  futureCraneScreenActive: () => true, ensureAC() {},
  startFutureCraneDescent(phase) { clickSandbox.starts = (clickSandbox.starts || []).concat(phase); clickSandbox.futureCranePhase = phase; },
  finishFutureCranePodDescent(automatic) { clickSandbox.podStops = (clickSandbox.podStops || []).concat(automatic); },
  finishFutureCraneCoreDescent(automatic) { clickSandbox.coreStops = (clickSandbox.coreStops || []).concat(automatic); }
};
vm.createContext(clickSandbox);
vm.runInContext(`${actionClick};this.handleFutureCraneActionClick=handleFutureCraneActionClick;`, clickSandbox);
clickSandbox.handleFutureCraneActionClick({ detail: 1 });
clickSandbox.handleFutureCraneActionClick({ detail: 1 });
assert.deepEqual(clickSandbox.starts, ["lower-pod"]);
assert.deepEqual(clickSandbox.podStops, [false]);
clickSandbox.futureCranePhase = "core-aligned";
clickSandbox.handleFutureCraneActionClick({ detail: 0 });
clickSandbox.handleFutureCraneActionClick({ detail: 0 });
assert.deepEqual(clickSandbox.starts, ["lower-pod", "lower-core"]);
assert.deepEqual(clickSandbox.coreStops, [false]);

/* Crank snap/detent behaviour remains deliberate and non-skipping. */
const normalizeAngle = extractFunction(game, "normalizeFutureCraneAngle");
const angleSandbox = { Math };
vm.createContext(angleSandbox);
vm.runInContext(`${normalizeAngle};this.normalizeFutureCraneAngle=normalizeFutureCraneAngle;`, angleSandbox);
assert.ok(Math.abs(angleSandbox.normalizeFutureCraneAngle(Math.PI * 1.5) + Math.PI / 2) < 1e-9);
const handleDown = extractFunction(game, "handleFutureCraneHandlePointerDown");
const handleMove = extractFunction(game, "handleFutureCraneHandlePointerMove");
assert.match(handleDown, /futureCranePointerRole="crank"/);
assert.match(handleDown, /setPointerCapture\(event\.pointerId\)/);
assert.match(handleMove, /normalizeFutureCraneAngle/);
assert.match(handleMove, /FUTURE_CRANE_EVENT_ANGLE_CAP/);
assert.match(handleMove, /futureCraneGestureDepartureAngle\+=delta[\s\S]*FUTURE_CRANE_DETENT_ANGLE[\s\S]*prepareFutureCraneSnapDeparture\(\)/);
assert.match(handleMove, /if\(futureCraneGestureSnapped\)return/);
const turn = extractFunction(game, "turnFutureCraneByAngle");
assert.match(turn, /angle\/\(Math\.PI\*2\)\*railSpan\*perTurn/);
assert.match(turn, /futureCraneSnapPod\(oldX,newX\)/);
assert.match(turn, /futureCraneSnapCore\(oldX,newX\)/);
assert.match(turn, /futureCraneKeyboardActive[\s\S]*future-crane-action/);
assert.match(turn, /setFutureCranePhase\("pod-aligned"\);if\(focusAction\)[\s\S]*future-crane-action[\s\S]*setFutureCranePhase\("core-aligned"\);if\(focusAction\)/,
  "keyboard focus must move only after the native action button is enabled");
const crosses = extractFunction(game, "futureCraneCrossesTarget");
const crossSandbox = {};
vm.createContext(crossSandbox);
vm.runInContext(`${crosses};this.futureCraneCrossesTarget=futureCraneCrossesTarget;`, crossSandbox);
assert.equal(crossSandbox.futureCraneCrossesTarget(120, 220, 168), true);
assert.equal(crossSandbox.futureCraneCrossesTarget(220, 120, 168), true);
assert.equal(crossSandbox.futureCraneCrossesTarget(120, 150, 168), false);
assert.match(extractFunction(game, "futureCraneSnapPod"), /FUTURE_CRANE_POD_SNAP_X\[level\]/);
assert.match(extractFunction(game, "futureCraneSnapCore"), /FUTURE_CRANE_CORE_SNAP_X\[level\]/);

/* Automatic descent uses real-time 50ms substeps, a 90ms cue, and a late auto-rise. */
const update = extractFunction(game, "updateFutureCapsuleVisual");
assert.match(update, /FUTURE_CRANE_TARGET_RADIUS\[level\]/);
assert.match(update, /FUTURE_CRANE_TARGET_SPEED\[level\]/);
assert.match(update, /FUTURE_CRANE_DESCENT_SPEED\[level\]/);
assert.match(update, /clamp\(current-last,0,250\)/);
assert.match(update, /while\(remainingMs>0[\s\S]*Math\.min\(50,remainingMs\)/);
assert.match(update, /futureCraneCuePauseUntil=current\+FUTURE_CRANE_CUE_HOLD_MS/);
assert.match(update, /いまだ！ もういちど おして とめよう/);
assert.match(update, /futureCraneY>=targetY-\.01[\s\S]*finishFutureCranePodDescent\(true\)[\s\S]*finishFutureCraneCoreDescent\(true\)/);
assert.doesNotMatch(update, /onPick|stageMiss|missInQ/);

const advance = extractFunction(game, "futureCraneAdvanceDescent");
const descentSandbox = { Math };
vm.createContext(descentSandbox);
vm.runInContext(`${advance};this.futureCraneAdvanceDescent=futureCraneAdvanceDescent;`, descentSandbox);
let stalledY = 100;
for (let remaining = 250; remaining > 0;) {
  const step = Math.min(50, remaining);
  stalledY = descentSandbox.futureCraneAdvanceDescent(stalledY, 800, 1000, step, 170, 96, 40).y;
  remaining -= step;
}
assert.ok(Math.abs(stalledY - 142.5) < 1e-9, "a 250ms stall must preserve 170px/s motion");
const sweetCrossing = descentSandbox.futureCraneAdvanceDescent(190, 200, 260, 150, 170, 96, 40);
assert.deepEqual({ y: sweetCrossing.y, crossedSweet: sweetCrossing.crossedSweet }, { y: 200, crossedSweet: true });
assert.equal(descentSandbox.futureCraneAdvanceDescent(200, 200, 260, 100, 170, 96, 40).y, 209.6);

/* Hard pod and core boundaries are inclusive by one pixel and core placement snaps visibly. */
const pickupBand = extractFunction(game, "futureCraneWithinPickupBand");
const stopTiming = extractFunction(game, "futureCraneStopTiming");
const centeredCore = extractFunction(game, "futureCranePayloadCenteredInCore");
const hitSandbox = { Math };
vm.createContext(hitSandbox);
vm.runInContext(`${pickupBand};${stopTiming};${centeredCore};this.pick=futureCraneWithinPickupBand;this.timing=futureCraneStopTiming;this.core=futureCranePayloadCenteredInCore;`, hitSandbox);
const hardPod = { homeX: 168, magnetY: 200 };
assert.equal(hitSandbox.pick(168, 170, hardPod, 34, 30), true);
assert.equal(hitSandbox.pick(168, 230, hardPod, 34, 30), true);
assert.equal(hitSandbox.pick(168, 169, hardPod, 34, 30), false);
assert.equal(hitSandbox.pick(168, 231, hardPod, 34, 30), false);
assert.equal(hitSandbox.pick(202, 200, hardPod, 34, 30), true);
assert.equal(hitSandbox.pick(203, 200, hardPod, 34, 30), false);
assert.equal(hitSandbox.timing(169, 170, 230), "early");
assert.equal(hitSandbox.timing(200, 170, 230), "sweet");
assert.equal(hitSandbox.timing(231, 170, 230), "late");
const core = { cx: 284, cy: 200 };
assert.equal(hitSandbox.core({ x: 284, y: 166 }, core, 34), true);
assert.equal(hitSandbox.core({ x: 284, y: 234 }, core, 34), true);
assert.equal(hitSandbox.core({ x: 284, y: 165 }, core, 34), false);
assert.equal(hitSandbox.core({ x: 284, y: 235 }, core, 34), false);
assert.equal(hitSandbox.core({ x: 284.001, y: 200 }, core, 34), false, "core X must be exactly centered");
const podStop = extractFunction(game, "finishFutureCranePodDescent");
const coreStop = extractFunction(game, "finishFutureCraneCoreDescent");
assert.match(podStop, /!automatic[\s\S]*futureCraneWithinPickupBand/);
assert.match(podStop, /beginFutureCranePodPickup\(entry\)/);
assert.match(podStop, /autoRiseFutureCrane\("pod-aligned"/);
assert.match(coreStop, /!automatic&&entry&&inner&&futureCraneCoreReady/);
assert.match(coreStop, /futureCraneX=inner\.cx;futureCraneFollowX=0;futureCraneY=inner\.cy-futureCraneFollowY;applyFutureCraneVisual\(\);resolveFutureCapsule\(entry\)/);
assert.match(coreStop, /autoRiseFutureCrane\("core-aligned"/);

/* Claw-close, lift, miss recovery, reduced motion, and motor actions never score. */
const pickup = extractFunction(game, "beginFutureCranePodPickup");
assert.match(pickup, /closeDuration=reduced\?FUTURE_CRANE_REDUCED_MS:FUTURE_CRANE_CLAW_CLOSE_MS/);
assert.match(pickup, /liftDuration=reduced\?FUTURE_CRANE_REDUCED_MS:FUTURE_CRANE_AUTO_LIFT_MS/);
assert.match(pickup, /setFutureCranePhase\("claw-close"\)/);
assert.match(pickup, /setFutureCranePhase\("auto-lift"\)/);
assert.match(pickup, /setFutureCranePhase\("carry"\)/);
const autoRise = extractFunction(game, "autoRiseFutureCrane");
assert.match(autoRise, /futureReducedMotion\(\)\?FUTURE_CRANE_REDUCED_MS:FUTURE_CRANE_AUTO_RISE_MS/);
assert.match(autoRise, /nextPhase==="pod-aligned"[\s\S]*futureCraneX=target\.homeX/);
assert.match(autoRise, /nextPhase==="core-aligned"[\s\S]*futureCraneX=futureCraneGeometry\.coreInner\.cx/);
assert.match(css, /\.future-capsule-board\.is-carrying \.future-crane-hook i:first-child\{transform:rotate\(-46deg\)\}/);
assert.doesNotMatch(css, /future-crane-action\[aria-pressed="true"\]/);
for (const name of ["turnFutureCraneByAngle", "startFutureCraneDescent", "finishFutureCranePodDescent", "finishFutureCraneCoreDescent", "beginFutureCranePodPickup", "autoRiseFutureCrane", "cancelFutureCraneInteraction", "handleFutureCraneViewportChange"]) {
  assert.doesNotMatch(extractFunction(game, name), /onPick|stageMiss|missInQ/, `${name}: motor interaction must not score`);
}

/* Only a successful core insertion resolves; wrong and correct each submit exactly once. */
const resolve = extractFunction(game, "resolveFutureCapsule");
assert.match(resolve, /futureCraneSubmissionCommitted/);
assert.equal((resolve.match(/onPick\(entry\.button,\{ok:false,mode:"future"\}\)/g) || []).length, 1);
assert.equal((resolve.match(/onPick\(entry\.button,\{ok:true,mode:"future",skipOkSound:true\}\)/g) || []).length, 1);

function resolveSandbox(ok) {
  const queue = [];
  const picks = [];
  const classList = { add() {}, remove() {} };
  const board = { classList };
  const cells = Array.from({ length: 3 }, () => ({ classList }));
  const sandbox = {
    futureCraneHeldIndex: 0, futureCraneCoreReady: true, futureCraneSubmissionCommitted: false,
    futureCapsuleResolving: false, futureCapsuleEpoch: 7, futureCapsuleEnergy: 0, qSeg: 0, QN: 5, FUTURE_CRANE_PULSE_MS: 110,
    futureCapsuleLayer: { querySelector(selector) { if (selector === ".future-capsule-board") return board; if (selector === ".future-capsule-energy") return { setAttribute() {} }; return null; }, querySelectorAll() { return cells; } },
    document: { body: { classList } },
    releaseFutureCranePointerCapture() {}, setFutureCranePhase() {}, futureCapsuleGuide() {}, tone() {}, confetti() {}, updateFutureCapsuleHistory() {}, clearFutureCapsuleGame() {},
    futureReducedMotion: () => false,
    setFutureCapsuleTimer(fn) { queue.push(fn); },
    onPick(_button, result) { picks.push(result.ok); },
    returnFutureCranePayload() { sandbox.returns = (sandbox.returns || 0) + 1; }
  };
  const entry = { index: 0, o: { ok }, button: { classList } };
  vm.createContext(sandbox);
  vm.runInContext(`${resolve};this.resolveFutureCapsule=resolveFutureCapsule;`, sandbox);
  sandbox.resolveFutureCapsule(entry);
  sandbox.resolveFutureCapsule(entry);
  while (queue.length) queue.shift()();
  return { picks, returns: sandbox.returns || 0 };
}
assert.deepEqual(resolveSandbox(false), { picks: [false], returns: 1 });
assert.deepEqual(resolveSandbox(true), { picks: [true], returns: 0 });
const onPick = extractFunction(game, "onPick");
assert.match(onPick, /answerLocked=false[\s\S]*o\.mode==="future"\)updateFutureCraneControls\(\)/);
const returnPayload = extractFunction(game, "returnFutureCranePayload");
assert.match(returnPayload, /futureCraneSubmissionCommitted=false/);
assert.match(returnPayload, /setFutureCranePhase\("seek"\)/);

/* Global keys are crank/Escape only; action keyboard input stays native. */
const keyboard = extractFunction(game, "handleFutureCapsuleKeyDown");
assert.match(keyboard, /event\.key==="ArrowLeft"\|\|event\.key==="ArrowRight"/);
assert.match(keyboard, /event\.key==="Escape"/);
assert.match(keyboard, /event\.shiftKey\?FUTURE_CRANE_KEY_FAST_ANGLE:FUTURE_CRANE_KEY_ANGLE/);
assert.match(keyboard, /turnFutureCraneByAngle/);
assert.doesNotMatch(keyboard, /Space|Enter|ArrowUp|ArrowDown/);
assert.doesNotMatch(game, /function handleFutureCapsuleKeyUp|addEventListener\("keyup",handleFutureCapsuleKeyUp\)/);
assert.match(render, /action\.addEventListener\("click"/);
assert.doesNotMatch(render, /action\.addEventListener\("pointercancel"/);

/* Sea's global Space keyup must not cancel Future's native button activation. */
const seaKeyUp = extractFunction(game, "handleSeaKeyUp");
assert.match(seaKeyUp, /seaShooterActive\(\)\|\|seaFireSources\.has\("keyboard"\)/);
const seaKeySandbox = {
  seaMoveKeys: new Set(), seaFireSources: new Set(), shooter: false, releases: 0,
  seaShooterActive() { return seaKeySandbox.shooter; },
  setSeaFireSource(source, active) { assert.equal(source, "keyboard"); assert.equal(active, false); seaKeySandbox.releases += 1; seaKeySandbox.seaFireSources.delete(source); }
};
vm.createContext(seaKeySandbox);
vm.runInContext(`${seaKeyUp};this.handleSeaKeyUp=handleSeaKeyUp;`, seaKeySandbox);
function spaceKeyUpEvent() {
  return { code: "Space", key: " ", target: { classList: { contains: () => false } }, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
}
const futureSpaceUp = spaceKeyUpEvent();
seaKeySandbox.handleSeaKeyUp(futureSpaceUp);
assert.equal(futureSpaceUp.defaultPrevented, false, "Future native Space keyup must remain uncancelled");
assert.equal(seaKeySandbox.releases, 0);
seaKeySandbox.shooter = true;
const activeSeaSpaceUp = spaceKeyUpEvent();
seaKeySandbox.handleSeaKeyUp(activeSeaSpaceUp);
assert.equal(activeSeaSpaceUp.defaultPrevented, true);
assert.equal(seaKeySandbox.releases, 1);
seaKeySandbox.shooter = false;seaKeySandbox.seaFireSources.add("keyboard");
const finishingSeaSpaceUp = spaceKeyUpEvent();
seaKeySandbox.handleSeaKeyUp(finishingSeaSpaceUp);
assert.equal(finishingSeaSpaceUp.defaultPrevented, true, "an already-started sea shot must still release safely");
assert.equal(seaKeySandbox.releases, 2);

/* Help, epoch cleanup, resize, and reduced-motion paths stay safe. */
assert.match(extractFunction(game, "useHelp"), /futureCraneBusy\(\)/);
assert.match(extractFunction(game, "assistFutureCapsuleGame"), /futureCraneBusy\(\)/);
const busy = extractFunction(game, "futureCraneBusy");
assert.match(busy, /\["seek","pod-aligned"\]\.includes\(futureCranePhase\)/);
const clear = extractFunction(game, "clearFutureCapsuleGame");
assert.match(clear, /releaseFutureCranePointerCapture\(\)/);
assert.match(clear, /futureCapsuleEpoch\+\+/);
assert.match(clear, /futureCapsuleTimers\.forEach\(clearTimeout\);futureCapsuleTimers\.clear\(\)/);
for (const state of ["futureCraneLastTickAt=0", "futureCraneCuePauseUntil=0", "futureCraneGestureSnapped=false", "futureCraneKeyboardSnapLatched=false", "futureCraneSubmissionCommitted=false"]) {
  assert.match(clear, new RegExp(state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
for (const lifecycle of ["startJourneyAt", "showQuiz", "ending", "openMap", "nazonazoAdminPreviewArm"]) {
  assert.match(extractFunction(game, lifecycle), /clearFutureCapsuleGame\(\)/, `${lifecycle}: future cleanup missing`);
}
const viewport = extractFunction(game, "handleFutureCraneViewportChange");
assert.match(viewport, /futureCraneGeometryDirty=true;scheduleFutureCraneGeometrySync\(\)/);
assert.doesNotMatch(viewport, /cancelFutureCraneInteraction|onPick|stageMiss|missInQ/);
assert.match(css, /prefers-reduced-motion:reduce[\s\S]*future-crane-hook i\{transition-duration:\.07s!important\}/);

/* Required viewport contract: controls stay in bounds and the station row does not collide. */
assert.match(css, /@media \(orientation:portrait\) and \(max-width:600px\)/);
assert.match(css, /future-crane-cradle\.cradle-1\{left:25%\}/);
assert.match(css, /future-crane-cradle\.cradle-2\{left:75%\}/);
const geometry = extractFunction(game, "syncFutureCraneGeometry");
assert.match(geometry, /portraitControls=boardRect\.width<=600&&height>boardRect\.width/);
assert.match(geometry, /preferredControlY=stationY\+\(portraitControls\?Math\.min\(118,height\*\.15\):0\)/);
assert.match(geometry, /futureCranePointerRole==="crank"[\s\S]*futureCranePointerAngle\(futureCraneLastPointerX,futureCraneLastPointerY\)/);

const clamp = (min, value, max) => Math.max(min, Math.min(value, max));
function layout(width, height) {
  const portrait = height > width && width <= 600;
  const short = !portrait && height <= 360;
  const handleW = portrait ? 90 : clamp(104, width * .16, 128);
  const actionW = portrait ? 80 : clamp(84, width * .12, 104);
  const podW = portrait ? 96 : short ? 104 : clamp(112, width * .18, 160);
  const coreW = portrait ? 96 : short ? 112 : clamp(124, width * .19, 178);
  const pod1 = portrait ? width * .25 : Math.max(168, width * .28);
  const pod2 = portrait ? width * .75 : width - Math.max(168, width * .28);
  return {
    portrait,
    handle: [portrait ? 8 : 4, (portrait ? 8 : 4) + handleW],
    action: [width - (portrait ? 8 : 4) - actionW, width - (portrait ? 8 : 4)],
    leftPod: [pod1 - podW / 2, pod1 + podW / 2],
    core: [width / 2 - coreW / 2, width / 2 + coreW / 2],
    rightPod: [pod2 - podW / 2, pod2 + podW / 2]
  };
}
for (const [width, height] of [[390,844], [568,320], [844,390], [1024,768], [1366,768]]) {
  const boxes = layout(width, height);
  for (const box of [boxes.handle, boxes.action, boxes.leftPod, boxes.core, boxes.rightPod]) {
    assert.ok(box[0] >= 0 && box[1] <= width, `${width}x${height}: element must remain in viewport`);
  }
  assert.ok(boxes.core[0] - boxes.leftPod[1] >= 1, `${width}x${height}: left pod/core collision`);
  assert.ok(boxes.rightPod[0] - boxes.core[1] >= 1, `${width}x${height}: core/right pod collision`);
  if (!boxes.portrait) {
    assert.ok(boxes.leftPod[0] - boxes.handle[1] >= 8, `${width}x${height}: handle/left pod collision`);
    assert.ok(boxes.action[0] - boxes.rightPod[1] >= 8, `${width}x${height}: right pod/action collision`);
  }
}

const podRule = cssRule("\\.future-capsule-lane\\.future-crane-pod");
assert.match(podRule, /pointer-events:none/);
assert.match(podRule, /cursor:default/);

for (const [name, source] of [
  ["renderFutureCapsuleGame", render],
  ["handleFutureCraneActionClick", actionClick],
  ["finishFutureCranePodDescent", podStop],
  ["finishFutureCraneCoreDescent", coreStop],
  ["resolveFutureCapsule", resolve],
  ["assistFutureCapsuleGame", extractFunction(game, "assistFutureCapsuleGame")]
]) assertNoChildFacingKanji(source, name);

console.log("Nazonazo future click-to-stop crane regression checks passed.");
