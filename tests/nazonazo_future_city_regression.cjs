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

/* Difficulty values are the approved crank, descent, snap, and containment model. */
for (const pattern of [
  /FUTURE_CRANE_RAIL_PER_TURN=\[\.80,\.75,\.70\]/,
  /FUTURE_CRANE_DESCENT_SPEED=\[120,130,140\]/,
  /FUTURE_CRANE_SLOW_RADIUS=\[28,24,20\]/,
  /FUTURE_CRANE_SLOW_SPEED=\[40,48,55\]/,
  /FUTURE_CRANE_PICKUP_Y_TOLERANCE=\[20,15,12\]/,
  /FUTURE_CRANE_PICKUP_X_TOLERANCE=\[32,24,18\]/,
  /FUTURE_CRANE_CORE_SNAP_X=\[34,26,20\]/,
  /FUTURE_CRANE_CORE_TOLERANCE=\[16,12,8\]/,
  /FUTURE_CRANE_KEY_ANGLE=Math\.PI\/10/,
  /FUTURE_CRANE_KEY_FAST_ANGLE=Math\.PI\/4/,
  /FUTURE_CRANE_EVENT_ANGLE_CAP=Math\.PI\/3/,
  /FUTURE_CRANE_DETENT_ANGLE=Math\.PI\/15/,
  /FUTURE_CRANE_GRIP_ARM_MS=120/,
  /FUTURE_CRANE_GRIP_GOAL=3/,
  /FUTURE_CRANE_AUTO_LIFT_MS=420/,
  /FUTURE_CRANE_SWEET_HOLD_MS=120/,
  /FUTURE_CRANE_CONTROL_SHADOW_PX=7/,
  /FUTURE_CRANE_RETURN_REDUCED_MS=70/
]) assert.match(game, pattern);
assert.doesNotMatch(game, /FUTURE_CRANE_PICKUP_MS|futureCranePickupTimer|futureCraneHoverSince|futureCraneDragStart|futureCraneHookStart/,
  "the old dwell and board-relative drag state must be gone");
assert.doesNotMatch(game, /trackFutureCranePickup|moveFutureCraneHook|handleFutureCranePointerDown|handleFutureCranePointerMove/,
  "the hook and pod must not be directly draggable");

/* The two dedicated controls replace board-wide dragging and direct pod input. */
const render = extractFunction(game, "renderFutureCapsuleGame");
for (const className of ["future-crane-handle", "future-crane-action", "future-crane-grip-meter", "future-crane-rail", "future-crane-trolley", "future-crane-hook-rig", "future-crane-core", "future-crane-cradle"]) {
  assert.match(render, new RegExp(`className="${className}`), `${className}: missing`);
}
assert.match(render, /handle\.addEventListener\("pointerdown",handleFutureCraneHandlePointerDown/);
assert.match(render, /action\.addEventListener\("pointerdown",handleFutureCraneActionPointerDown/);
assert.match(render, /pointerup[\s\S]*pointercancel[\s\S]*lostpointercapture/);
assert.doesNotMatch(render, /board\.addEventListener\("pointer(?:down|move|up)/,
  "the whole board must not move the hook");
assert.doesNotMatch(render, /button\.addEventListener\("click"|bindTap\(button/,
  "a pod tap must never choose or submit an answer");
assert.match(render, /button\.tabIndex=-1/);
assert.match(render, /guide\.textContent="ハンドルで ポッドに あわせよう"/);
assert.match(render, /board\.setAttribute\("aria-keyshortcuts","ArrowLeft ArrowRight Space Enter Escape"\)/);

const podRule = cssRule("\\.future-capsule-lane\\.future-crane-pod");
assert.match(podRule, /pointer-events:none/);
assert.match(podRule, /cursor:default/);
const handleRule = cssRule("\\.future-crane-handle");
const actionRule = css.match(/\.future-crane-action\{(right:[^}]+)/)?.[1] || "";
assert.match(handleRule, /left:4px/);
assert.match(handleRule, /top:var\(--future-crane-control-y,var\(--future-crane-station-y,53%\)\)/);
assert.match(handleRule, /width:clamp\(104px,16vw,128px\)/);
assert.match(actionRule, /right:4px/);
assert.match(actionRule, /top:var\(--future-crane-control-y,var\(--future-crane-station-y,53%\)\)/);
assert.match(actionRule, /width:clamp\(84px,12vw,104px\)/);
assert.match(actionRule, /height:clamp\(64px,10vw,84px\)/);
assert.match(css, /\.future-crane-cradle\.cradle-1\{left:max\(168px,28%\)\}/);
assert.match(css, /\.future-crane-cradle\.cradle-2\{left:calc\(100% - max\(168px,28%\)\)\}/);
assert.match(css, /max-height:360px[\s\S]*\.future-crane-cradle\{width:104px;height:56px\}/);
assert.match(css, /max-height:360px[\s\S]*\.future-crane-core\{width:112px;height:66px/);

const shortWidth = 568;
const shortLayout = {
  handle: [4, 4 + 104],
  leftPod: [168 - 104 / 2, 168 + 104 / 2],
  core: [shortWidth / 2 - 112 / 2, shortWidth / 2 + 112 / 2],
  rightPod: [shortWidth - 168 - 104 / 2, shortWidth - 168 + 104 / 2],
  action: [shortWidth - 4 - 84, shortWidth - 4]
};
assert.deepEqual(shortLayout, { handle: [4,108], leftPod: [116,220], core: [228,340], rightPod: [348,452], action: [480,564] });
assert.ok(shortLayout.leftPod[0] - shortLayout.handle[1] >= 8);
assert.ok(shortLayout.action[0] - shortLayout.rightPod[1] >= 28);

/* Circular drag is normalized, capped, dead-zone guarded, and geometry-rebased. */
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
assert.match(extractFunction(game, "futureCranePointerAngle"), /FUTURE_CRANE_CRANK_DEADZONE/);
const geometry = extractFunction(game, "syncFutureCraneGeometry");
assert.match(geometry, /handleRect=board\.querySelector\("\.future-crane-handle"\)\?\.getBoundingClientRect\(\)/);
assert.match(geometry, /controlY=futureCraneControlY\(stationY,quizTop,handleHeight\)/);
assert.match(geometry, /--future-crane-control-y/);
assert.match(geometry, /futureCranePointerRole==="crank"[\s\S]*futureCranePointerAngle\(futureCraneLastPointerX,futureCraneLastPointerY\)/,
  "an active crank must rebase its angle after transition or resize geometry changes");
const controlYFn = extractFunction(game, "futureCraneControlY");
const controlSandbox = { Math, FUTURE_CRANE_CONTROL_SHADOW_PX: 7 };
vm.createContext(controlSandbox);
vm.runInContext(`${controlYFn};this.futureCraneControlY=futureCraneControlY;`, controlSandbox);
const shortControlY = controlSandbox.futureCraneControlY(169.6, 215.6, 104);
assert.equal(shortControlY, 148.6);
assert.ok(shortControlY + 104 / 2 + 7 <= 215.6 - 8, "568x320 handle shadow must remain 8px above the actual quiz top");
const viewport = extractFunction(game, "handleFutureCraneViewportChange");
assert.doesNotMatch(viewport, /pauseFutureCraneInput/);
assert.match(viewport, /scheduleFutureCraneGeometrySync/);

/* One rotation maps to the approved rail fraction and cannot skip a snap target. */
const turn = extractFunction(game, "turnFutureCraneByAngle");
assert.match(turn, /angle\/\(Math\.PI\*2\)\*railSpan\*perTurn/);
assert.match(turn, /futureCraneSnapPod\(oldX,newX\)/);
assert.match(turn, /futureCraneSnapCore\(oldX,newX\)/);
const crosses = extractFunction(game, "futureCraneCrossesTarget");
const crossSandbox = {};
vm.createContext(crossSandbox);
vm.runInContext(`${crosses};this.futureCraneCrossesTarget=futureCraneCrossesTarget;`, crossSandbox);
assert.equal(crossSandbox.futureCraneCrossesTarget(120, 220, 168), true);
assert.equal(crossSandbox.futureCraneCrossesTarget(220, 120, 168), true);
assert.equal(crossSandbox.futureCraneCrossesTarget(120, 150, 168), false);
assert.match(extractFunction(game, "futureCraneSnapPod"), /futureCraneCrossesTarget\(oldX,newX,entry\.homeX\)/);
assert.match(extractFunction(game, "futureCraneSnapCore"), /futureCraneCrossesTarget\(oldX,newX,inner\.cx\)/);
assert.match(extractFunction(game, "prepareFutureCraneSnapDeparture"), /futureCraneSkipSnapKey="pod:"\+futureCraneTargetIndex/,
  "small crank events must accumulate away from an aligned target instead of re-snapping forever");
assert.match(handleDown, /futureCraneGestureStartAligned=futureCranePhase==="pod-aligned"\|\|futureCranePhase==="core-aligned"/);
assert.match(handleMove, /if\(futureCraneGestureSnapped\)return/,
  "the rest of the same pointer gesture must stay latched after a snap");
assert.match(handleMove, /futureCraneGestureDepartureAngle\+=delta[\s\S]*FUTURE_CRANE_DETENT_ANGLE[\s\S]*prepareFutureCraneSnapDeparture\(\)/,
  "a new pointer gesture must deliberately turn through the detent before leaving a snap");
assert.match(turn, /futureCranePointerRole==="crank"\)futureCraneGestureSnapped=true/);
assert.match(turn, /futureCraneKeyboardActive\)futureCraneKeyboardSnapLatched=true/);

/* Hold/release descends, release enters GRIP, then three independent armed taps lift. */
const startAction = extractFunction(game, "startFutureCraneAction");
assert.match(startAction, /futureCranePointerPhaseAtDown=futureCranePhase/);
assert.match(startAction, /futureCranePhase==="pod-aligned"[\s\S]*setFutureCranePhase\("lower-pod"\)/);
assert.match(startAction, /futureCranePhase==="core-aligned"[\s\S]*setFutureCranePhase\("lower-core"\)/);
const update = extractFunction(game, "updateFutureCapsuleVisual");
assert.match(update, /FUTURE_CRANE_SLOW_RADIUS\[level\]/);
assert.match(update, /FUTURE_CRANE_SLOW_SPEED\[level\]/);
assert.match(update, /FUTURE_CRANE_DESCENT_SPEED\[level\]/);
assert.match(update, /clamp\(current-last,0,250\)/,
  "an iPad main-thread stall up to 250ms must preserve real-time descent distance");
assert.match(update, /while\(remainingMs>0[\s\S]*Math\.min\(50,remainingMs\)/,
  "stalled frames must be integrated in stable 50ms substeps");
assert.match(update, /futureCraneSweetPauseUntil=current\+FUTURE_CRANE_SWEET_HOLD_MS/,
  "the success band needs a short tactile pause without becoming an endpoint");
assert.match(update, /futureCapsuleGuide\(futureCranePhase==="lower-core"\?"いまだ！ コアの なかで はなそう！":"いまだ！ ボタンを はなそう！"\)/,
  "sweet crossing must explicitly tell a first-time player when to release");
assert.match(update, /tone\(920,0,\.08,"triangle",\.05\)/,
  "sweet crossing must have an audible cue as well as a visual pause");
assert.doesNotMatch(update, /createElement|append|replaceChildren|getBoundingClientRect|onPick/,
  "the main frame loop may only update numeric descent state and existing styles");
const applyVisual = extractFunction(game, "applyFutureCraneVisual");
assert.match(applyVisual, /futureCranePhase==="lower-pod"&&futureCraneWithinPickupBand/);
assert.match(applyVisual, /classList\.toggle\("is-pickup-ready",pickupReady\)/);
assert.match(css, /is-pickup-ready[\s\S]*future-crane-hook[\s\S]*fff17d/,
  "pickup and core sweet bands must visibly light the claw");
const advanceDescent = extractFunction(game, "futureCraneAdvanceDescent");
const descentSandbox = { Math };
vm.createContext(descentSandbox);
vm.runInContext(`${advanceDescent};this.futureCraneAdvanceDescent=futureCraneAdvanceDescent;`, descentSandbox);
let stalledY = 100;
for (let remaining = 250; remaining > 0;) {
  const step = Math.min(50, remaining);
  stalledY = descentSandbox.futureCraneAdvanceDescent(stalledY, 800, 1000, step, 140, 55, 20).y;
  remaining -= step;
}
assert.ok(Math.abs(stalledY - 135) < 1e-9, "a 250ms stall must move 35px at 140px/s, not half speed");
const sweetCrossing = descentSandbox.futureCraneAdvanceDescent(140, 148, 176, 250, 140, 55, 20);
assert.deepEqual({ y: sweetCrossing.y, crossedSweet: sweetCrossing.crossedSweet }, { y: 148, crossedSweet: true });
const afterSweet = descentSandbox.futureCraneAdvanceDescent(148, 148, 176, 100, 140, 55, 20);
assert.equal(afterSweet.y, 153.5, "holding after the sweet pause must continue into the late-fail region");
const finishAction = extractFunction(game, "finishFutureCraneAction");
assert.match(finishAction, /phaseAtDown==="pod-aligned"&&futureCranePhase==="lower-pod"/);
assert.match(finishAction, /phaseAtDown==="grip"&&futureCranePhase==="grip"/);
assert.match(finishAction, /tapEligible\)performFutureCraneGripTap\(\)/);
assert.doesNotMatch(finishAction, /phaseAtDown==="pod-aligned"[\s\S]{0,120}performFutureCraneGripTap/,
  "the pickup release must never become grip tap one");
const pickupRelease = extractFunction(game, "finishFutureCranePodDescent");
assert.match(pickupRelease, /FUTURE_CRANE_PICKUP_X_TOLERANCE\[level\]/);
assert.match(pickupRelease, /FUTURE_CRANE_PICKUP_Y_TOLERANCE\[level\]/);
assert.match(pickupRelease, /futureCraneWithinPickupBand/);
assert.match(pickupRelease, /futureCraneGripArmedAt=_nowMs\(\)\+FUTURE_CRANE_GRIP_ARM_MS/);
assert.match(pickupRelease, /setFutureCranePhase\("grip"\)/);
const pickupBand = extractFunction(game, "futureCraneWithinPickupBand");
const releaseTiming = extractFunction(game, "futureCraneReleaseTiming");
const pickupSandbox = { Math };
vm.createContext(pickupSandbox);
vm.runInContext(`${pickupBand};${releaseTiming};this.futureCraneWithinPickupBand=futureCraneWithinPickupBand;this.futureCraneReleaseTiming=futureCraneReleaseTiming;`, pickupSandbox);
const hardPod = { homeX: 168, magnetY: 148 };
assert.equal(pickupSandbox.futureCraneWithinPickupBand(168, 135, hardPod, 18, 12), false, "early release must miss");
assert.equal(pickupSandbox.futureCraneWithinPickupBand(168, 148, hardPod, 18, 12), true, "sweet-band release must grip");
assert.equal(pickupSandbox.futureCraneWithinPickupBand(168, 161, hardPod, 18, 12), false, "late release must miss");
assert.equal(pickupSandbox.futureCraneReleaseTiming(135, 136, 160), "early");
assert.equal(pickupSandbox.futureCraneReleaseTiming(148, 136, 160), "sweet");
assert.equal(pickupSandbox.futureCraneReleaseTiming(161, 136, 160), "late");
assert.match(pickupRelease, /timing==="late"\?"いきすぎたよ。つぎは すこし はやく はなそう":"もう すこし おろしてみよう"/);
const gripTap = extractFunction(game, "performFutureCraneGripTap");
assert.match(gripTap, /_nowMs\(\)<futureCraneGripArmedAt/);
assert.match(gripTap, /futureCraneGripCount\+=1/);
assert.match(gripTap, /futureCraneGripCount>=FUTURE_CRANE_GRIP_GOAL\)attachFutureCranePod\(\)/);
const attach = extractFunction(game, "attachFutureCranePod");
assert.match(attach, /futureReducedMotion\(\)\?FUTURE_CRANE_RETURN_REDUCED_MS:FUTURE_CRANE_AUTO_LIFT_MS/);
assert.match(attach, /setFutureCranePhase\("auto-lift"\)/);
assert.match(attach, /setFutureCranePhase\("carry"\)/);
assert.match(css, /data-crane-phase="grip"[\s\S]*future-crane-grip-meter/);

/* Core X tolerance only snaps/enables descent; visible four-edge containment submits. */
const descentTarget = extractFunction(game, "futureCraneDescentTargetY");
assert.match(descentTarget, /futureCraneCurrentMaxY\(\)/,
  "holding must descend through the valid core window to the safe maximum");
const descentSweet = extractFunction(game, "futureCraneDescentSweetY");
assert.match(descentSweet, /entry\?entry\.magnetY/);
assert.match(descentSweet, /inner\?inner\.cy-futureCraneFollowY/);
const edgeToleranceFn = extractFunction(game, "futureCraneCoreEdgeTolerance");
const fitsCore = extractFunction(game, "futureCranePayloadFitsCore");
const coreSandbox = { Math };
vm.createContext(coreSandbox);
vm.runInContext(`${edgeToleranceFn};${fitsCore};this.futureCranePayloadFitsCore=futureCranePayloadFitsCore;`, coreSandbox);
const shortCore = { left: 237, right: 331, top: 151, bottom: 201, width: 94, height: 50, cx: 284, cy: 176 };
for (const [difficultyTolerance, edgeAllowance] of [[16,4], [12,3], [8,2]]) {
  const limitX = (shortCore.width - 88) / 2 + edgeAllowance;
  const limitY = (shortCore.height - 44) / 2 + edgeAllowance;
  assert.equal(coreSandbox.futureCranePayloadFitsCore({ x: shortCore.cx + limitX, y: shortCore.cy + limitY }, shortCore, 88, 44, difficultyTolerance), true);
  assert.equal(coreSandbox.futureCranePayloadFitsCore({ x: shortCore.cx + limitX + 1, y: shortCore.cy }, shortCore, 88, 44, difficultyTolerance), false);
  assert.equal(coreSandbox.futureCranePayloadFitsCore({ x: shortCore.cx, y: shortCore.cy + limitY + 1 }, shortCore, 88, 44, difficultyTolerance), false);
}
assert.equal(coreSandbox.futureCranePayloadFitsCore({ x: shortCore.cx, y: 170 }, shortCore, 88, 44, 8), false, "early core release must miss");
assert.equal(coreSandbox.futureCranePayloadFitsCore({ x: shortCore.cx, y: 176 }, shortCore, 88, 44, 8), true, "centered core release must fit");
assert.equal(coreSandbox.futureCranePayloadFitsCore({ x: shortCore.cx, y: 182 }, shortCore, 88, 44, 8), false, "late core release must miss");
const coreRelease = extractFunction(game, "finishFutureCraneCoreDescent");
assert.match(coreRelease, /futureCraneCoreReady\)\{resolveFutureCapsule/);
assert.match(coreRelease, /autoRiseFutureCrane\("core-aligned"/);
assert.match(coreRelease, /timing==="late"\?"いきすぎたよ。つぎは すこし はやく はなそう":"もう すこし コアへ おろそう"/);
assert.doesNotMatch(coreRelease, /onPick|stageMiss|missInQ/,
  "motor misses must auto-rise without a quiz penalty");

/* Only a completed wrong insertion scores a miss; both outcomes submit exactly once. */
const resolve = extractFunction(game, "resolveFutureCapsule");
assert.match(resolve, /futureCraneSubmissionCommitted/);
assert.equal((resolve.match(/onPick\(entry\.button,\{ok:false,mode:"future"\}\)/g) || []).length, 1);
assert.equal((resolve.match(/onPick\(entry\.button,\{ok:true,mode:"future",skipOkSound:true\}\)/g) || []).length, 1);
for (const name of ["finishFutureCranePodDescent", "performFutureCraneGripTap", "autoRiseFutureCrane", "cancelFutureCraneInteraction"]) {
  assert.doesNotMatch(extractFunction(game, name), /onPick|stageMiss|missInQ/, `${name}: motor interaction must not score`);
}

/* Wrong insertion unlocks the returned controls at t=700ms and accepts another answer. */
const onPick = extractFunction(game, "onPick");
assert.match(onPick, /answerLocked=false[\s\S]*o\.mode==="future"\)updateFutureCraneControls\(\)/);
const scheduled = [];
const wrongClassList = { add() {}, contains(name) { return name === "future-capsule-lane"; } };
const wrongButton = { classList: wrongClassList, disabled: false };
const pickSandbox = {
  answerLocked: false, driving: false, missInQ: 0, stageMiss: 0, qSeg: 0, tunnels: [], playing: true, clock: 180,
  quiz: { classList: { contains: () => true, remove() {} } },
  cur: { a: ["a", "せいかい"], pe: ["a", "せいかい"], helper: { e: "a", t: "せいかい", name: "せいかい" } },
  SCORE_POINTS: { correct: 100, firstTry: 50 },
  setTimeout(fn, delay) { scheduled.push({ at: pickSandbox.clock + delay, fn }); return scheduled.length; },
  setDriverMood() {}, sndNG() {}, sndOK() {}, sndOpen() {}, showStamp() {}, showHint() {}, showNumberCargoHint() {}, updateNumberCargoGame() {},
  isSeaStage: () => false, activeChoiceButtons: () => [], addScore() { pickSandbox.correctAccepted = (pickSandbox.correctAccepted || 0) + 1; return 150; },
  boardPassenger: () => true, showSeaRescueMessage() {}, speak() {}, proceed() {}, updateFutureCraneControls() { pickSandbox.handleDisabled = pickSandbox.answerLocked; pickSandbox.controlRefreshes = (pickSandbox.controlRefreshes || 0) + 1; }
};
vm.createContext(pickSandbox);
vm.runInContext(`${onPick};this.onPick=onPick;`, pickSandbox);
pickSandbox.onPick(wrongButton, { ok: false, mode: "future" });
assert.equal(pickSandbox.answerLocked, true);
pickSandbox.clock = 440;
pickSandbox.updateFutureCraneControls();
assert.equal(pickSandbox.handleDisabled, true, "return finishes while the wrong-answer lock is still active");
for (const timer of scheduled.filter(timer => timer.at <= 700).sort((a, b) => a.at - b.at)) { pickSandbox.clock = timer.at; timer.fn(); }
assert.equal(pickSandbox.answerLocked, false);
assert.equal(pickSandbox.handleDisabled, false, "the 520ms answer unlock must refresh and enable the handle");
pickSandbox.clock = 701;
pickSandbox.onPick(wrongButton, { ok: true, mode: "future", skipOkSound: true });
assert.equal(pickSandbox.correctAccepted, 1, "a correct second operation must be accepted after the wrong pod returns");

/* Keyboard, help, lifecycle, and reduced-motion paths share the same state machine. */
const keyboard = extractFunction(game, "handleFutureCapsuleKeyDown");
assert.match(keyboard, /event\.shiftKey\?FUTURE_CRANE_KEY_FAST_ANGLE:FUTURE_CRANE_KEY_ANGLE/);
assert.match(keyboard, /turnFutureCraneByAngle/);
assert.match(keyboard, /futureCraneKeyboardSnapLatched\)\{if\(event\.repeat\)return;futureCraneKeyboardSnapLatched=false/,
  "key repeat may turn until snap, then it must wait for the next physical key press");
assert.doesNotMatch(keyboard, /if\(event\.repeat\)return;\s*const angle/,
  "arrow key repeat must not be globally disabled");
assert.match(keyboard, /event\.key==="Enter"\?"Enter"/);
assert.match(keyboard, /startFutureCraneAction\("keyboard"\)/);
assert.match(keyboard, /isAction&&!event\.repeat&&futureCranePhase==="grip"[\s\S]*performFutureCraneGripTap/);
const keyUp = extractFunction(game, "handleFutureCapsuleKeyUp");
assert.match(keyUp, /event\.key==="Enter"\?"Enter"/);
assert.match(keyUp, /actionKey!==futureCraneKeyboardActionKey/);
assert.match(keyUp, /finishFutureCraneAction\(false,"keyboard"\)/);
assert.match(keyboard, /if\(isAction&&futureCraneActionHeld\)\{event\.preventDefault\(\);return;\}/,
  "a second action key must not overwrite an already-held Space or Enter");
const keyboardSandbox = {
  futureCraneScreenActive: () => true,
  answerLocked: false,
  futureCapsuleResolving: false,
  futureCranePhase: "pod-aligned",
  futureCranePointerId: null,
  futureCraneKeyboardActionHeld: false,
  futureCraneKeyboardActionKey: "",
  futureCraneActionHeld: false,
  futureCraneKeyboardActive: false,
  futureCraneKeyboardSnapLatched: false,
  FUTURE_CRANE_KEY_FAST_ANGLE: Math.PI / 4,
  FUTURE_CRANE_KEY_ANGLE: Math.PI / 10,
  prepareFutureCraneSnapDeparture() { keyboardSandbox.departures = (keyboardSandbox.departures || 0) + 1; },
  turnFutureCraneByAngle() { keyboardSandbox.turns = (keyboardSandbox.turns || 0) + 1; },
  startFutureCraneAction() { keyboardSandbox.futureCraneActionHeld = true; return true; },
  finishFutureCraneAction() { keyboardSandbox.futureCraneActionHeld = false; keyboardSandbox.finishes = (keyboardSandbox.finishes || 0) + 1; },
  performFutureCraneGripTap() { keyboardSandbox.grips = (keyboardSandbox.grips || 0) + 1; },
  futureCapsuleGuide() {},
  cancelFutureCraneInteraction() {}
};
vm.createContext(keyboardSandbox);
vm.runInContext(`${keyboard};${keyUp};this.handleFutureCapsuleKeyDown=handleFutureCapsuleKeyDown;this.handleFutureCapsuleKeyUp=handleFutureCapsuleKeyUp;`, keyboardSandbox);
const keyboardTarget = { closest: selector => selector === ".future-capsule-board" ? {} : null };
function keyEvent(key, code = key, repeat = false) {
  return { key, code, repeat, defaultPrevented: false, target: keyboardTarget, preventDefault() { this.defaultPrevented = true; } };
}
for (const [firstKey, firstCode, secondKey, secondCode] of [[" ", "Space", "Enter", "Enter"], ["Enter", "Enter", " ", "Space"]]) {
  keyboardSandbox.futureCranePhase = "pod-aligned";
  const firstDown = keyEvent(firstKey, firstCode);
  keyboardSandbox.handleFutureCapsuleKeyDown(firstDown);
  assert.equal(keyboardSandbox.futureCraneKeyboardActionHeld, true);
  assert.equal(keyboardSandbox.futureCraneKeyboardActionKey, firstCode);
  const secondDown = keyEvent(secondKey, secondCode);
  keyboardSandbox.handleFutureCapsuleKeyDown(secondDown);
  assert.equal(secondDown.defaultPrevented, true);
  assert.equal(keyboardSandbox.futureCraneKeyboardActionHeld, true, "mixed action keydown must preserve the original hold");
  assert.equal(keyboardSandbox.futureCraneKeyboardActionKey, firstCode);
  keyboardSandbox.handleFutureCapsuleKeyUp(keyEvent(firstKey, firstCode));
  assert.equal(keyboardSandbox.futureCraneKeyboardActionHeld, false);
}
assert.equal(keyboardSandbox.finishes, 2, "both Space→Enter and Enter→Space holds must release normally");
keyboardSandbox.futureCranePhase = "seek";
keyboardSandbox.futureCraneKeyboardSnapLatched = false;
keyboardSandbox.handleFutureCapsuleKeyDown(keyEvent("ArrowRight", "ArrowRight", true));
assert.equal(keyboardSandbox.turns, 1, "arrow repeat must continue turning before snap");
keyboardSandbox.futureCraneKeyboardSnapLatched = true;
keyboardSandbox.handleFutureCapsuleKeyDown(keyEvent("ArrowRight", "ArrowRight", true));
assert.equal(keyboardSandbox.turns, 1, "the repeating key must stay latched after snap");
keyboardSandbox.handleFutureCapsuleKeyDown(keyEvent("ArrowRight", "ArrowRight", false));
assert.equal(keyboardSandbox.turns, 2, "the next physical key press may deliberately leave the snap");
assert.match(extractFunction(game, "useHelp"), /futureCraneBusy\(\)/);
assert.match(extractFunction(game, "assistFutureCapsuleGame"), /futureCraneBusy\(\)/);
assert.match(extractFunction(game, "assistFutureCapsuleGame"), /futureCraneTargetIndex===wrong\.index[\s\S]*setFutureCranePhase\("seek"\)/);
const clear = extractFunction(game, "clearFutureCapsuleGame");
assert.match(clear, /releaseFutureCranePointerCapture\(\)/);
assert.match(clear, /futureCapsuleTimers\.forEach\(clearTimeout\);futureCapsuleTimers\.clear\(\)/);
assert.match(extractFunction(game, "releaseFutureCranePointerCapture"), /futureCranePointerCaptureTarget=null/);
for (const state of ["futureCraneKeyboardActionHeld=false", "futureCraneKeyboardActionKey=\"\"", "futureCraneActionHeld=false", "futureCraneGripCount=0", "futureCraneLastTickAt=0", "futureCraneSweetPauseUntil=0", "futureCraneGestureSnapped=false", "futureCraneKeyboardSnapLatched=false", "futureCraneSubmissionCommitted=false"]) assert.match(clear, new RegExp(state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
for (const lifecycle of ["startJourneyAt", "showQuiz", "ending", "openMap", "nazonazoAdminPreviewArm"]) {
  assert.match(extractFunction(game, lifecycle), /clearFutureCapsuleGame\(\)/, `${lifecycle}: future cleanup missing`);
}
assert.match(css, /prefers-reduced-motion:reduce[\s\S]*future-crane-handle-wheel[\s\S]*transition-duration:\.07s!important/);

for (const [name, source] of [
  ["renderFutureCapsuleGame", render],
  ["startFutureCraneAction", startAction],
  ["finishFutureCranePodDescent", pickupRelease],
  ["performFutureCraneGripTap", gripTap],
  ["resolveFutureCapsule", resolve],
  ["assistFutureCapsuleGame", extractFunction(game, "assistFutureCapsuleGame")]
]) assertNoChildFacingKanji(source, name);

console.log("Nazonazo future UFO-catcher regression checks passed.");
