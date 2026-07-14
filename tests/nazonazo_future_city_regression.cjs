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
for (const [name, value] of [["FUTURE_HORIZON_PARALLAX", ".10"], ["FUTURE_MID_PARALLAX", ".32"], ["FUTURE_FOREGROUND_PARALLAX", "1.12"]]) {
  assert.match(game, new RegExp(`${name}=${value.replace(".", "\\.")}`));
}

assert.match(html, /id="futureCapsuleLayer"[^>]*role="group"[^>]*aria-labelledby="qText"[^>]*hidden/);
const layerRule = cssRule("#futureCapsuleLayer");
assert.match(layerRule, /position\s*:\s*fixed/);
assert.match(layerRule, /inset\s*:\s*0/);
const boardRule = cssRule("\\.future-capsule-board");
assert.match(boardRule, /pointer-events:auto/);
assert.match(boardRule, /touch-action:none/);
assert.match(boardRule, /overscroll-behavior:none/);

const optionFn = extractFunction(game, "futureQuestionOptions");
const optionSandbox = { shuffle: values => values.slice().reverse() };
vm.createContext(optionSandbox);
vm.runInContext(`${optionFn};this.futureQuestionOptions=futureQuestionOptions;`, optionSandbox);
const options = optionSandbox.futureQuestionOptions({ a: ["a", "せいかい"], d: [["b", "ひとつ"], ["c", "ふたつ"]] });
assert.equal(options.length, 2);
assert.equal(options.filter(option => option.ok).length, 1);
assert.equal(options.filter(option => !option.ok).length, 1);

assert.match(game, /const FUTURE_CRANE_PICKUP_MS=\[80,110,140\]/);
assert.match(game, /const FUTURE_CRANE_CORE_TOLERANCE=\[16,12,8\]/);
assert.match(game, /const FUTURE_CRANE_KEY_STEP=14/);
assert.match(game, /const FUTURE_CRANE_KEY_FAST_STEP=30/);
assert.match(game, /const FUTURE_CRANE_RETURN_MS=260/);
assert.match(game, /const FUTURE_CRANE_RETURN_REDUCED_MS=70/);
assert.doesNotMatch(game, /FUTURE_CAPSULE_TRAVEL_MS|futureCapsuleStartedAt/);

const render = extractFunction(game, "renderFutureCapsuleGame");
for (const className of ["future-crane-rail", "future-crane-trolley", "future-crane-hook-rig", "future-crane-core", "future-crane-core-slot", "future-crane-cradle"]) {
  assert.match(render, new RegExp(`className="${className}`), `${className}: missing`);
}
assert.match(render, /className="choice future-capsule-lane future-crane-pod/);
assert.match(render, /futureQuestionOptions\(cur\)\.forEach/);
assert.match(render, /createQuizArt\(o\.e,o\.t\)/);
assert.match(render, /pointerdown[\s\S]*pointermove[\s\S]*pointerup[\s\S]*pointercancel[\s\S]*lostpointercapture/);
assert.match(render, /board\.tabIndex=0/);
assert.match(render, /button\.tabIndex=-1/);
assert.doesNotMatch(render, /addEventListener\("click"|bindTap\(button/,
  "a pod tap must never submit an answer");
assert.match(render, /フックを こたえの ポッドまで うごかそう/);

const pointerDown = extractFunction(game, "handleFutureCranePointerDown");
const pointerMove = extractFunction(game, "handleFutureCranePointerMove");
assert.match(pointerDown, /futureCraneDragStartX=event\.clientX/);
assert.match(pointerDown, /futureCraneHookStartX=futureCraneX/);
assert.match(pointerDown, /setPointerCapture\(event\.pointerId\)/);
assert.match(pointerMove, /futureCraneHookStartX\+\(event\.clientX-futureCraneDragStartX\)/,
  "pointer drag must be relative 1:1 without a pointerdown jump");

const pickup = extractFunction(game, "trackFutureCranePickup");
assert.match(pickup, /FUTURE_CRANE_PICKUP_MS\[level\]/);
assert.match(pickup, /futureCranePickupIndex\(\)!==index/,
  "pickup must remain continuously inside the pickup rect until its timer fires");
assert.match(pickup, /futureCranePointerId===null/);

const geometry = extractFunction(game, "syncFutureCraneGeometry");
assert.match(geometry, /Object\.assign\(entry,futureCraneEntryGeometry\(entry,boardRect\)\)/);
const entryGeometry = extractFunction(game, "futureCraneEntryGeometry");
assert.match(entryGeometry, /entry\.cradle\.querySelector\("\.future-crane-cradle-base"\)\|\|entry\.cradle/,
  "home must be measured from the untransformed cradle base");
assert.match(entryGeometry, /homeX=\(homeRect\.left\+homeRect\.right\)\/2-boardRect\.left/);
assert.match(entryGeometry, /magnetY=homeY-payloadH\/2/);
assert.match(entryGeometry, /pickupRect:\{left:homeX-17,right:homeX\+17,top:magnetY-10,bottom:magnetY\+10\}/,
  "pickup must be restricted to the payload's upper magnetic point");
assert.doesNotMatch(entryGeometry, /homeX=.*payloadRect|homeY=.*payloadRect/,
  "a carried payload transform must never become its new home");
let activePayloadRect = { left: 108, right: 196, top: 156, bottom: 200, width: 88, height: 44 };
const stableBaseRect = { left: 100, right: 204, top: 150, bottom: 206, width: 104, height: 56 };
const payloadElement = { getBoundingClientRect: () => activePayloadRect };
const baseElement = { getBoundingClientRect: () => stableBaseRect };
const earlyEntry = {
  button: { querySelector: () => payloadElement, getBoundingClientRect: () => activePayloadRect },
  cradle: { querySelector: () => baseElement, getBoundingClientRect: () => stableBaseRect }
};
const earlyGeometrySandbox = {};
vm.createContext(earlyGeometrySandbox);
vm.runInContext(`${entryGeometry};this.futureCraneEntryGeometry=futureCraneEntryGeometry;`, earlyGeometrySandbox);
const boardRectForEarlyDrag = { left: 10, top: 20 };
const beforeEarlyDrag = earlyGeometrySandbox.futureCraneEntryGeometry(earlyEntry, boardRectForEarlyDrag);
activePayloadRect = { left: 358, right: 446, top: 84, bottom: 128, width: 88, height: 44 };
const duringEarlyDrag = earlyGeometrySandbox.futureCraneEntryGeometry(earlyEntry, boardRectForEarlyDrag);
for (const key of ["homeX", "homeY", "payloadW", "payloadH"])
  assert.equal(duringEarlyDrag[key], beforeEarlyDrag[key], `early transition sync changed stable ${key}`);
for (const edge of ["left", "right", "top", "bottom"])
  assert.equal(duringEarlyDrag.pickupRect[edge], beforeEarlyDrag.pickupRect[edge], `early transition sync changed pickup ${edge}`);
const returnPayload = extractFunction(game, "returnFutureCranePayload");
assert.match(returnPayload, /futureCraneFollowX=entry\.homeX-futureCraneX;futureCraneFollowY=entry\.homeY-futureCraneY/);
assert.match(returnPayload, /entry\.button\.style\.transform="translate3d\(0,0,0\)"/,
  "an early dropped payload must return to its unchanged cradle home");
assert.match(geometry, /entry\.homeY-liftDistance-entry\.payloadH\/2/,
  "short layouts must reserve enough upward room for the full lift threshold");
const shortHeight = 320;
const shortRailY = Math.max(52, Math.min(112, shortHeight * .16));
const shortQuizTop = shortHeight - 98;
const shortStationY = Math.min(Math.max(shortHeight * .53, 150), shortQuizTop - 36);
const shortLiftDistance = Math.max(44, Math.min(64, shortHeight * .32));
const shortMinHookY = Math.max(18, Math.min(shortRailY + 2, shortStationY - shortLiftDistance - 44 / 2));
assert.ok(shortStationY - (shortMinHookY + 44 / 2) >= shortLiftDistance,
  "568x320 must physically allow the 88x44 payload to clear the full 64px lift latch");

const safeMaxY = extractFunction(game, "futureCraneSafeMaxY");
const boundsSandbox = { Math };
vm.createContext(boundsSandbox);
vm.runInContext(`${safeMaxY};this.futureCraneSafeMaxY=futureCraneSafeMaxY;`, boundsSandbox);
for (const sample of [
  { width: 568, height: 320, quizTop: 215.6, payloadH: 44 },
  { width: 740, height: 320, quizTop: 215.6, payloadH: 44 },
  { width: 844, height: 390, quizTop: 274, payloadH: 50 },
  { width: 1024, height: 768, quizTop: 640, payloadH: 72 }
]) {
  const followY = sample.payloadH / 2;
  const maxY = boundsSandbox.futureCraneSafeMaxY(sample.quizTop, { payloadH: sample.payloadH }, followY);
  assert.ok(maxY < sample.quizTop, `${sample.width}x${sample.height}: hook maxY must stay above the final quiz top`);
  assert.ok(maxY + followY + sample.payloadH / 2 <= sample.quizTop - 8,
    `${sample.width}x${sample.height}: held payload must not enter the quiz`);
}
assert.match(geometry, /quizTop[\s\S]*maxY:futureCraneSafeMaxY\(quizTop,null,0\)/);
assert.match(geometry, /futureCraneY=clamp\(futureCraneY,[\s\S]*futureCraneCurrentMaxY\(\)/,
  "a settled quiz bound must immediately clamp the current hook and payload");
const scheduleGeometry = extractFunction(game, "scheduleFutureCraneGeometrySync");
assert.equal((scheduleGeometry.match(/requestAnimationFrame\(/g) || []).length, 2,
  "initial geometry must be checked again after two painted frames");
assert.match(scheduleGeometry, /futureCraneGeometryDirty=true;syncFutureCraneGeometry\(\)/);
const transitionGeometry = extractFunction(game, "handleFutureCraneQuizTransitionEnd");
assert.match(transitionGeometry, /event\.target!==quiz\|\|event\.propertyName!=="transform"/);
assert.match(transitionGeometry, /futureCraneGeometryDirty=true;syncFutureCraneGeometry\(\)/,
  "the final transitioned quiz top must replace the offscreen entry geometry");
assert.match(render, /syncFutureCraneGeometry\(\);scheduleFutureCraneGeometrySync\(\)/);
assert.match(game, /quiz\.addEventListener\("transitionend",handleFutureCraneQuizTransitionEnd\)/);

const latch = extractFunction(game, "latchFutureCranePod");
assert.match(latch, /futureCraneX=entry\.homeX;futureCraneY=entry\.homeY-entry\.payloadH\/2/);
assert.match(latch, /futureCraneFollowX=0;futureCraneFollowY=entry\.payloadH\/2/,
  "latching must snap to one fixed hook/payload connection");

const carry = extractFunction(game, "updateFutureCraneCarryState");
assert.match(carry, /clamp\(futureCraneGeometry\.height\*\.32,44,64\)/);
assert.match(carry, /FUTURE_CRANE_CORE_TOLERANCE\[level\]/);
assert.match(carry, /futureCraneLifted&&inner/);
assert.match(carry, /futureCraneCoreReady=/);
assert.match(carry, /payload\.x-halfW>=inner\.left-edgeTolerance&&payload\.x\+halfW<=inner\.right\+edgeTolerance/,
  "the lower-into-core guide must use the same visible horizontal opening as submission");
const edgeToleranceFn = extractFunction(game, "futureCraneCoreEdgeTolerance");
const fitsCore = extractFunction(game, "futureCranePayloadFitsCore");
const coreSandbox = { Math };
vm.createContext(coreSandbox);
vm.runInContext(`${edgeToleranceFn};${fitsCore};this.futureCraneCoreEdgeTolerance=futureCraneCoreEdgeTolerance;this.futureCranePayloadFitsCore=futureCranePayloadFitsCore;`, coreSandbox);
assert.match(edgeToleranceFn, /Math\.min\(4,/,
  "no difficulty may accept a payload more than 4px outside the visible core silhouette");
assert.match(fitsCore, /payload\.x-halfW>=inner\.left-edgeTolerance/);
assert.match(fitsCore, /payload\.x\+halfW<=inner\.right\+edgeTolerance/);
assert.match(fitsCore, /payload\.y-halfH>=inner\.top-edgeTolerance/);
assert.match(fitsCore, /payload\.y\+halfH<=inner\.bottom\+edgeTolerance/);
const shortCore = { left: 237, right: 331, top: 151, bottom: 201, width: 94, height: 50, cx: 284, cy: 176 };
for (const [difficultyTolerance, edgeAllowance] of [[16, 4], [12, 3], [8, 2]]) {
  const limitX = (shortCore.width - 88) / 2 + edgeAllowance;
  const limitY = (shortCore.height - 44) / 2 + edgeAllowance;
  for (const sign of [-1, 1]) {
    assert.equal(coreSandbox.futureCranePayloadFitsCore({ x: shortCore.cx + sign * limitX, y: shortCore.cy }, shortCore, 88, 44, difficultyTolerance), true,
      `difficulty ${difficultyTolerance}: exact horizontal edge must fit`);
    assert.equal(coreSandbox.futureCranePayloadFitsCore({ x: shortCore.cx + sign * (limitX + 1), y: shortCore.cy }, shortCore, 88, 44, difficultyTolerance), false,
      `difficulty ${difficultyTolerance}: one pixel beyond the horizontal edge must fail`);
    assert.equal(coreSandbox.futureCranePayloadFitsCore({ x: shortCore.cx, y: shortCore.cy + sign * limitY }, shortCore, 88, 44, difficultyTolerance), true,
      `difficulty ${difficultyTolerance}: exact vertical edge must fit`);
    assert.equal(coreSandbox.futureCranePayloadFitsCore({ x: shortCore.cx, y: shortCore.cy + sign * (limitY + 1) }, shortCore, 88, 44, difficultyTolerance), false,
      `difficulty ${difficultyTolerance}: one pixel beyond the vertical edge must fail`);
  }
}
const coreSlotRule = cssRule("\\.future-crane-core-slot");
for (const inset of ["left:8%", "right:8%", "top:12%", "bottom:12%"])
  assert.match(coreSlotRule, new RegExp(inset.replace("%", "\\%")), `visible core opening missing ${inset}`);
for (const text of ["つかんだ！ うえへ もちあげよう", "コアの うえまで はこぼう", "ゆっくり コアへ おろそう", "ここで はなそう！"]) assert.match(game, new RegExp(text));

const release = extractFunction(game, "releaseFutureCranePayload");
assert.match(release, /!cancelled&&futureCraneHeldIndex>=0&&futureCraneCoreReady/);
assert.match(release, /resolveFutureCapsule/);
assert.match(release, /returnFutureCranePayload\("だいじょうぶ。もう いちど！"\)/);
assert.doesNotMatch(release, /onPick|stageMiss|missInQ/,
  "motor mistakes and pointer cancellation must not be scored");

const resolve = extractFunction(game, "resolveFutureCapsule");
assert.match(resolve, /futureCraneSubmissionCommitted/);
assert.equal((resolve.match(/onPick\(entry\.button,\{ok:false,mode:"future"\}\)/g) || []).length, 1);
assert.equal((resolve.match(/onPick\(entry\.button,\{ok:true,mode:"future",skipOkSound:true\}\)/g) || []).length, 1);
assert.match(resolve, /qSeg===QN-1\?"みらいシティ かんせい！":"まちが ひかった！ リニア はっしん！"/);

const keyboard = extractFunction(game, "handleFutureCapsuleKeyDown");
assert.match(keyboard, /event\.shiftKey\?FUTURE_CRANE_KEY_FAST_STEP:FUTURE_CRANE_KEY_STEP/);
assert.match(keyboard, /event\.key==="Escape"/);
assert.match(keyboard, /futureCranePickupIndex\(\)/);
assert.match(keyboard, /moveFutureCraneHook/);
assert.match(keyboard, /releaseFutureCranePayload\(false\)/);
const keyboardLock = keyboard.indexOf('if(answerLocked||futureCapsuleResolving||futureCranePhase==="returning"||futureCranePhase==="resolving"||futureCranePhase==="complete")');
assert.ok(keyboardLock >= 0 && keyboardLock < keyboard.indexOf("moveFutureCraneHook"),
  "answer, resolving, and returning phases must consume repeated arrow/action keys before they can move a wrong payload");
assert.doesNotMatch(game, /grabFutureCraneByKeyboard|futureCraneX=entry\.homeX;futureCraneY=entry\.homeY;latchFutureCranePod/,
  "keyboard selection must not teleport a pod to the hook");

const visual = extractFunction(game, "updateFutureCapsuleVisual");
assert.match(visual, /futureCraneGeometryDirty/);
assert.doesNotMatch(visual, /createElement|append|replaceChildren|onPick/,
  "the render loop must not allocate DOM or submit answers");

const clear = extractFunction(game, "clearFutureCapsuleGame");
assert.match(clear, /releaseFutureCranePointerCapture\(\)/);
assert.match(clear, /clearFutureCranePickupTimer\(\)/);
assert.match(clear, /futureCapsuleTimers\.forEach\(clearTimeout\);futureCapsuleTimers\.clear\(\)/);
assert.match(clear, /futureCraneSubmissionCommitted=false/);
assert.match(clear, /futureCapsuleLayer\.replaceChildren\(\);futureCapsuleLayer\.hidden=true/);
for (const lifecycle of ["startJourneyAt", "showQuiz", "ending", "openMap", "nazonazoAdminPreviewArm"]) {
  assert.match(extractFunction(game, lifecycle), /clearFutureCapsuleGame\(\)/, `${lifecycle}: future cleanup missing`);
}
assert.match(extractFunction(game, "useHelp"), /futureCranePointerId!==null\|\|futureCraneHeldIndex>=0/);
const help = extractFunction(game, "assistFutureCapsuleGame");
assert.match(help, /wrong\.button\.disabled=true/);
assert.match(help, /ひかる ポッドを コアへ はこぼう/);
assert.doesNotMatch(help, /resolveFutureCapsule|onPick/);

assert.match(game, /dataset\.cranePhase=phase/);
assert.match(game, /dataset\.heldPod=/);
assert.match(game, /dataset\.pointerActive=/);
assert.match(css, /@media [^{]*max-height:360px[\s\S]*\.future-crane-hook\{width:40px;height:40px/);
assert.match(css, /max-height:360px[\s\S]*\.future-crane-cradle\{width:104px;height:56px/);
assert.match(css, /max-height:360px[\s\S]*\.future-capsule\.future-crane-payload\{width:88px;height:44px/);
assert.match(css, /max-height:360px[\s\S]*\.future-crane-core\{width:112px;height:66px/);
assert.match(css, /max-height:360px[\s\S]*\.future-capsule\.future-crane-payload \.quiz-art\{width:30px;height:30px/);
assert.match(css, /max-height:360px[\s\S]*body\.st-future\.future-capsule-active #quiz\{max-height:98px/);
assert.match(css, /prefers-reduced-motion:reduce[\s\S]*\.future-crane-core-ring[\s\S]*animation:none!important/);
assert.match(css, /prefers-reduced-motion:reduce[\s\S]*\.future-crane-trolley,[\s\S]*transition-duration:\.07s!important/);

for (const [name, source] of [["renderFutureCapsuleGame", render], ["updateFutureCraneCarryState", carry], ["returnFutureCranePayload", extractFunction(game, "returnFutureCranePayload")], ["resolveFutureCapsule", resolve], ["assistFutureCapsuleGame", help]]) {
  assertNoChildFacingKanji(source, name);
}

console.log("Nazonazo future gantry-crane regression checks passed.");
