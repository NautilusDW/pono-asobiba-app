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
const js = read("nazonazo-tunnel/js/game.js");

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
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(match.index, index + 1);
    }
  }
  assert.fail(`${name}: function is not closed`);
}

function cssRule(selectorPattern) {
  const match = new RegExp(`${selectorPattern}\\s*\\{([^}]+)\\}`).exec(css);
  assert.ok(match, `CSS rule missing: ${selectorPattern}`);
  return match[1];
}

function assertNoChildFacingKanji(source, label) {
  const literals = [...source.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map(match => match[2]);
  for (const literal of literals.filter(value => /[ぁ-んァ-ヶ一-龠]/.test(value))) {
    assert.doesNotMatch(literal, /[一-龠]/, `${label}: child-facing string contains kanji: ${literal}`);
  }
}

/* DOM and layering: semantic targets stay separate from the full-scene pointer owner. */
assert.match(html, /id="vehicleSteerShell"[^>]*class="vehicle-steer-shell"[^>]*>[\s\S]*?<div class="vbody">/);
assert.match(html, /id="seaSteerSurface"[^>]*aria-hidden="true"/);
assert.match(html, /id="seaAnswerLayer"[^>]*(?:role="group"|aria-labelledby="qText")/);
assert.match(html, /id="seaCompanionLayer"[^>]*aria-hidden="true"/);
assert.match(html, /id="seaShotLayer"[^>]*aria-hidden="true"/);
assert.match(html, /<button id="seaFireButton"[^>]*aria-label="おしっぱなしで れんしゃ"[^>]*hidden/);

const steerShellCss = cssRule("\\.vehicle-steer-shell");
assert.match(steerShellCss, /translate3d\([^;]*var\(--sea-steer-x[^;]*var\(--sea-steer-y/, "submarine steering must be transform-only in X and Y");
assert.match(steerShellCss, /var\(--sea-steer-tilt/);
assert.doesNotMatch(steerShellCss, /(?:top|bottom|left|right)\s*:/);

const surfaceCss = cssRule("#seaSteerSurface");
assert.match(surfaceCss, /touch-action\s*:\s*none/);
assert.match(surfaceCss, /pointer-events\s*:\s*none/);
assert.match(css, /body\.st-sea[^,{]*\.sea-steer-active[^,{]*#seaSteerSurface\s*\{[^}]*pointer-events\s*:\s*auto/);
assert.match(css, /body\.st-sea[^,{]*#veh\s*\{[^}]*pointer-events\s*:\s*none/);
assert.match(css, /body\.st-sea #cars\s*\{[^}]*display\s*:\s*none/, "old yellow passenger pods must not duplicate option-like friends");

const fireCss = cssRule("#seaFireButton");
assert.match(fireCss, /width\s*:\s*clamp\(64px,10vmin,80px\)/);
assert.match(fireCss, /min-width\s*:\s*64px/);
assert.match(fireCss, /min-height\s*:\s*64px/);
assert.match(fireCss, /touch-action\s*:\s*none/);

const targetCss = cssRule("\\.sea-answer-bubble");
assert.match(targetCss, /min-width\s*:\s*64px/);
assert.match(targetCss, /min-height\s*:\s*64px/);
assert.match(targetCss, /pointer-events\s*:\s*none/, "touch must pass through targets to the shooting surface");
assert.match(css, /\.sea-answer-visual\s*\{[^}]*border-radius\s*:\s*50%/, "target motion and burst visuals need separate transform owners");
assert.match(css, /\.sea-answer-bubble\.ng \.sea-answer-visual\s*\{[^}]*animation\s*:\s*seaTargetWrong/, "wrong-answer shake must not overwrite target position");
assert.match(css, /\.sea-answer-bubble\.is-bursting \.sea-answer-visual\s*\{[^}]*seaTargetBurst/);
assert.match(css, /\.sea-shot\s*\{[^}]*will-change\s*:\s*transform/);
assert.match(css, /\.sea-companion\s*\{[^}]*will-change\s*:\s*transform/);

/* Runtime state and pointer/keyboard ownership. */
assert.match(js, /const SEA_FIRE_INTERVAL_MS=180;/);
assert.match(js, /const SEA_SHOT_LIMIT=32;/);
assert.match(js, /const SEA_COMPANION_LIMIT=3;/);
assert.match(js, /const SEA_TARGET_HIT_GOALS=\[3,4,5\];/);
assert.match(js, /let steerTargetX=0,steerX=0,steerTargetY=0,steerY=0/);
assert.match(js, /const[^;]*seaCompanionLayer=\$\("seaCompanionLayer"\)[^;]*seaShotLayer=\$\("seaShotLayer"\)[^;]*seaFireButton=\$\("seaFireButton"\)/);
assert.match(js, /vehicleSteerShell\.style\.setProperty\("--sea-steer-x"/);
assert.match(js, /vehicleSteerShell\.style\.setProperty\("--sea-steer-y"/);
const steerBoundsBody = extractFunction(js, "seaSteerBounds");
assert.match(steerBoundsBody, /viewportHeight\*\.72/, "travel must reserve the future question panel height");
assert.match(steerBoundsBody, /const maxCenterRatio=\.5;/, "travel and quiz must share the same horizontal playfield");
assert.doesNotMatch(steerBoundsBody, /\.82/, "quiz opening must not contract an 82vw travel range in one frame");

const boundsState = { quizShown: false };
const boundsSandbox = {
  window: { innerWidth: 844, innerHeight: 390 },
  veh: { offsetWidth: 135, offsetHeight: 96, offsetLeft: 169, offsetTop: 210 },
  document: { getElementById: () => ({ getBoundingClientRect: () => ({ bottom: 50 }) }) },
  quiz: {
    classList: { contains: name => name === "show" && boundsState.quizShown },
    getBoundingClientRect: () => ({ top: 304 })
  }
};
vm.createContext(boundsSandbox);
vm.runInContext(`${steerBoundsBody};this.seaSteerBounds=seaSteerBounds;`, boundsSandbox);
const travelBounds = boundsSandbox.seaSteerBounds();
boundsState.quizShown = true;
const quizBounds = boundsSandbox.seaSteerBounds();
assert.equal(travelBounds.maxX, quizBounds.maxX, "quiz opening must not snap X inward");
assert.ok(travelBounds.maxY <= quizBounds.maxY, "reserved travel floor must not snap Y upward when quiz opens");

for (const eventName of ["pointerdown", "pointermove", "pointerup", "pointercancel", "lostpointercapture"]) {
  assert.match(js, new RegExp(`seaSteerSurface\\.addEventListener\\("${eventName}"`), `steering surface is missing ${eventName}`);
}
for (const eventName of ["pointerdown", "pointerup", "pointercancel", "lostpointercapture"]) {
  assert.match(js, new RegExp(`seaFireButton\\.addEventListener\\("${eventName}"`), `fire button is missing ${eventName}`);
}
assert.match(js, /window\.addEventListener\("keydown",handleSeaKeyDown\)/);
assert.match(js, /window\.addEventListener\("keyup",handleSeaKeyUp\)/);
assert.match(js, /seaSteerSurface\.setPointerCapture\(/);
assert.match(js, /seaSteerSurface\.releasePointerCapture\(/);

const pointerDown = extractFunction(js, "handleSeaPointerDown");
const pointerMove = extractFunction(js, "handleSeaPointerMove");
const pointerUp = extractFunction(js, "handleSeaPointerUp");
assert.match(pointerDown, /setSeaSteerTarget\(ev\.clientX,ev\.clientY/);
assert.match(pointerMove, /setSeaSteerTarget\(ev\.clientX,ev\.clientY/);
assert.match(pointerDown, /setSeaFireSource\("steer",true\)/, "pressing the scene must begin autofire during a question");
assert.match(pointerUp, /cancelSeaPointer\(\)/, "release must stop its owned fire source");
assert.doesNotMatch(pointerUp, /onPick|beginSeaTargetBurst/, "movement release must never answer directly");
for (const body of [pointerDown, pointerMove, pointerUp, extractFunction(js, "setSeaSteerTarget"), extractFunction(js, "updateSeaKeyboardMovement")]) {
  assert.doesNotMatch(body, /(?:^|[;{}])\s*(?:worldX|vel|target)\s*(?:=|\+=|-=|\+\+|--)/m, "viewport steering must not mutate forced-scroll progress");
  assert.doesNotMatch(body, /\b(?:addScore|proceed|onPick)\s*\(/, "movement alone must not score or answer");
}

const keyDown = extractFunction(js, "handleSeaKeyDown");
assert.match(keyDown, /ArrowLeft/);
assert.match(keyDown, /KeyA/);
assert.match(keyDown, /Space/);
assert.match(keyDown, /setSeaFireSource\("keyboard",true\)/);
const keyUp = extractFunction(js, "handleSeaKeyUp");
assert.match(keyUp, /classList\.contains\("sea-answer-bubble"\)\)return/, "Space on a focused target must keep native button activation");
assert.match(keyUp, /setSeaFireSource\("keyboard",false\)/);
assert.match(extractFunction(js, "updateSeaKeyboardMovement"), /Math\.hypot\(axisX,axisY\)/, "diagonal keyboard movement must be normalized");
assert.match(extractFunction(js, "seaControlAvailable"), /seaLandscapeReady\(\)/, "portrait controls must stay behind the rotate gate");

/* Moving answer targets remain real buttons and reuse the common question data. */
const showQuizBody = extractFunction(js, "showQuiz");
const renderSeaBody = extractFunction(js, "renderSeaBubbleGame");
const updateTargetsBody = extractFunction(js, "updateSeaAnswerTargets");
const spawnVolleyBody = extractFunction(js, "spawnSeaVolley");
const updateShotsBody = extractFunction(js, "updateSeaShots");
const hitTargetBody = extractFunction(js, "hitSeaAnswerTarget");
const burstTargetBody = extractFunction(js, "beginSeaTargetBurst");
const clearSeaBody = extractFunction(js, "clearSeaBubbleGame");
const activeChoiceBody = extractFunction(js, "activeChoiceButtons");
const useHelpBody = extractFunction(js, "useHelp");
const onPickBody = extractFunction(js, "onPick");

assert.match(showQuizBody, /renderSeaBubbleGame\(/);
assert.match(showQuizBody, /cancelSeaPointer\(\);clearSeaBubbleGame\(\)/);
assert.match(renderSeaBody, /cur\.a/);
assert.match(renderSeaBody, /cur\.d/);
assert.match(renderSeaBody, /shuffle\(opts\)/);
assert.match(renderSeaBody, /level===0[\s\S]*?slice\(0,2\)/);
assert.match(renderSeaBody, /document\.createElement\("button"\)/);
assert.match(renderSeaBody, /button\.className="sea-answer-bubble"/);
assert.match(renderSeaBody, /button\.dataset\.ok/);
assert.match(renderSeaBody, /bindTap\(button,\(\)=>startSeaKeyboardTargetFire\(button,o\)\)/, "Enter/AT fallback must visibly autofire rather than select immediately");
assert.match(renderSeaBody, /const layout=opts\.length===2\?\[\[\.68,\.28\],\[\.81,\.7\]\]:\[\[\.67,\.17\],\[\.81,\.5\],\[\.69,\.83\]\]/);
assert.match(renderSeaBody, /SEA_TARGET_HIT_GOALS\[level\]/);
assert.match(updateTargetsBody, /seaReducedMotion\(\)/);
assert.match(updateTargetsBody, /document\.activeElement===entry\.button/, "focused targets must pause so keyboard fallback stays usable");
assert.match(updateTargetsBody, /Math\.sin/);
assert.match(updateTargetsBody, /ratio\*\.28/);
assert.doesNotMatch(updateTargetsBody, /(?:left|top)\s*=/, "target movement must remain transform-only");

/* Every volley includes all friends but can damage only one target once. */
assert.match(spawnVolleyBody, /const salvoId=\+\+seaVolleyCount/);
assert.match(spawnVolleyBody, /spawnSeaShot\([^;]*false,salvoId,aimY\)/);
assert.match(spawnVolleyBody, /seaCompanionSprites\.forEach/);
assert.match(spawnVolleyBody, /spawnSeaShot\([^;]*true,salvoId,aimY\)/);
assert.match(extractFunction(js, "syncSeaCompanions"), /slice\(-SEA_COMPANION_LIMIT\)/);
const companionRenderBody = extractFunction(js, "renderSeaCompanions");
assert.match(companionRenderBody, /seaTrailPointAt\(now-135\*\(index\+1\)/);
assert.match(companionRenderBody, /const point=reduced\?subPoint:/, "reduced motion must use a fixed formation rather than delayed trail motion");
const passengerTargetBody = extractFunction(js, "passengerSeatTargetAt");
assert.match(passengerTargetBody, /if\(isSeaStage\(\)&&vehicleSteerShell\)/, "sea boarding must target the rendered submarine instead of hidden cars");
assert.match(passengerTargetBody, /vehicleSteerShell\.getBoundingClientRect\(\)/);
assert.match(passengerTargetBody, /SEA_COMPANION_LIMIT/);
assert.ok(passengerTargetBody.indexOf("if(isSeaStage()") < passengerTargetBody.indexOf('carsEl.querySelector(".pending-seat")'), "sea target must be resolved before the display:none pending seat");
const passengerSandbox = {
  STAGES: [{ id: "sea", veh: "sub" }],
  stg: 0,
  isSeaStage: () => true,
  vehicleSteerShell: { getBoundingClientRect: () => ({ left: 190, top: 122, width: 135, height: 96 }) },
  window: { innerWidth: 844, innerHeight: 390 },
  SEA_COMPANION_LIMIT: 3,
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  carsEl: { querySelector: () => { throw new Error("hidden pending seat must not be queried in sea"); } },
  vehicleLeftVw: () => 28,
  carGap: () => 8.8
};
vm.createContext(passengerSandbox);
vm.runInContext(`${passengerTargetBody};this.passengerSeatTargetAt=passengerSeatTargetAt;`, passengerSandbox);
const seaBoardTarget = passengerSandbox.passengerSeatTargetAt(0);
assert.ok(parseFloat(seaBoardTarget.left) > 100, "rescued friend must not fly to left:0");
assert.ok(parseFloat(seaBoardTarget.bottom) > 20 && parseFloat(seaBoardTarget.bottom) < 300, "rescued friend must join beside the submarine, not the top edge");
assert.match(updateShotsBody, /seaBubbleOptions\.find/);
assert.match(updateShotsBody, /if\(shot\.companion\)shot\.y\+=\(shot\.aimY-shot\.y\)/, "friend shots must converge on the submarine aim instead of crossing another answer lane");
assert.match(updateShotsBody, /button\.disabled/);
assert.match(updateShotsBody, /classList\.contains\("dim"\)/);
assert.match(updateShotsBody, /hitSeaAnswerTarget\(targetEntry,shot\.salvoId/);
assert.match(updateShotsBody, /removeSeaShotsForSalvo\(shot\.salvoId\)/);
assert.match(hitTargetBody, /seaSalvoHits\.has\(salvoId\)/);
assert.match(hitTargetBody, /seaSalvoHits\.add\(salvoId\)/);
assert.match(hitTargetBody, /entry\.hits\+1/);
assert.match(hitTargetBody, /beginSeaTargetBurst\(entry\)/);

/* The final burst is the only bridge to the established answer/scoring flow. */
assert.match(burstTargetBody, /seaBubbleLaunchPending=true/, "collision must lock synchronously before another shot can submit");
assert.match(burstTargetBody, /activeChoiceButtons\(\)\.forEach\(choice=>\{choice\.disabled=true;/);
assert.match(burstTargetBody, /const epoch=seaShooterEpoch/);
assert.match(burstTargetBody, /epoch!==seaShooterEpoch/);
assert.match(burstTargetBody, /onPick\(entry\.button,entry\.value\)/);
assert.doesNotMatch(burstTargetBody, /\b(?:addScore|SCORE_POINTS|qSeg\+\+|proceed|boardPassenger)\b/, "shooter must not fork scoring or progression");
assert.match(burstTargetBody, /if\(seaReducedMotion\(\)\)finish\(\)/, "reduced motion must skip the burst delay");
assert.match(activeChoiceBody, /seaAnswerLayer/);
assert.match(activeChoiceBody, /choicesEl/);
assert.match(useHelpBody, /activeChoiceButtons\(\)/);
assert.match(useHelpBody, /seaBubbleLaunchPending/);
assert.match(onPickBody, /activeChoiceButtons\(\)/);
assert.match(onPickBody, /SCORE_POINTS\.correct/);

/* Execute the salvo guard: one salvo can increment one target only once. */
const classNames = new Set();
const sandbox = {
  seaSalvoHits: new Set(),
  seaBubbleLaunchPending: false,
  answerLocked: false,
  seaShooterEpoch: 7,
  _nowMs: () => 1000,
  setTimeout: callback => { callback(); return 1; },
  createSeaHitSpark: () => {},
  tone: () => {},
  burstCalls: 0,
  beginSeaTargetBurst: () => { sandbox.burstCalls += 1; }
};
vm.createContext(sandbox);
vm.runInContext(`${hitTargetBody};this.hitSeaAnswerTarget=hitSeaAnswerTarget;`, sandbox);
const targetEntry = {
  hits: 0,
  hitGoal: 3,
  flashUntil: 0,
  bursting: false,
  button: {
    disabled: false,
    dataset: {},
    classList: {
      contains: name => classNames.has(name),
      add: name => classNames.add(name),
      remove: name => classNames.delete(name)
    }
  }
};
assert.equal(sandbox.hitSeaAnswerTarget(targetEntry, 1, 100, 100), true);
assert.equal(targetEntry.hits, 1);
assert.equal(sandbox.hitSeaAnswerTarget(targetEntry, 1, 100, 100), false, "a companion shot from the same salvo must not add damage");
assert.equal(targetEntry.hits, 1);
assert.equal(sandbox.hitSeaAnswerTarget(targetEntry, 2, 100, 100), true);
assert.equal(sandbox.hitSeaAnswerTarget(targetEntry, 3, 100, 100), true);
assert.equal(targetEntry.hits, 3);
assert.equal(sandbox.burstCalls, 1);

/* Execute wrong-answer burst/resume and stale-epoch protection. */
function makeClassList(initial = []) {
  const names = new Set(initial);
  return {
    names,
    contains: name => names.has(name),
    add: (...values) => values.forEach(value => names.add(value)),
    remove: (...values) => values.forEach(value => names.delete(value))
  };
}
function makeBurstSandbox(reduced) {
  const timers = [];
  const answerButton = { disabled: false, isConnected: true, classList: makeClassList() };
  const otherButton = { disabled: false, isConnected: true, classList: makeClassList() };
  const state = {
    seaBubbleLaunchPending: false,
    answerLocked: false,
    driving: false,
    seaMoveKeys: new Set(),
    seaShooterEpoch: 4,
    seaBubbleLaunchTimer: 0,
    seaShooterResumeTimer: 0,
    quiz: { classList: { contains: name => name === "show" } },
    document: { body: { classList: { contains: name => name === "sea-quiz-active" } } },
    stopSeaFiring: () => {},
    cancelSeaPointer: () => {},
    cancelSeaFirePointer: () => {},
    removeAllSeaShots: () => {},
    activeChoiceButtons: () => [answerButton, otherButton],
    createSeaBurstParticles: () => {},
    tone: () => {},
    seaReducedMotion: () => reduced,
    clearSeaBubbleGame: () => { state.clearCalls += 1; },
    clearCalls: 0,
    pickCalls: 0,
    onPick: (button, value) => {
      state.pickCalls += 1;
      if (!value.ok) {
        button.classList.add("dim");
        button.disabled = true;
      }
    },
    setTimeout: callback => { timers.push(callback); return timers.length; },
    clearTimeout: () => {},
    timers,
    answerButton,
    otherButton
  };
  vm.createContext(state);
  vm.runInContext(`${burstTargetBody};this.beginSeaTargetBurst=beginSeaTargetBurst;`, state);
  return state;
}

const wrongBurst = makeBurstSandbox(true);
wrongBurst.beginSeaTargetBurst({ button: wrongBurst.answerButton, value: { ok: false }, bursting: false, x: 100, y: 100 });
assert.equal(wrongBurst.pickCalls, 1);
assert.equal(wrongBurst.seaBubbleLaunchPending, true, "wrong answer must stay locked through feedback");
assert.equal(wrongBurst.otherButton.disabled, true);
assert.equal(wrongBurst.timers.length, 1);
wrongBurst.timers.shift()();
assert.equal(wrongBurst.seaBubbleLaunchPending, false);
assert.equal(wrongBurst.answerButton.disabled, true, "popped wrong target must stay disabled");
assert.equal(wrongBurst.otherButton.disabled, false, "remaining targets must resume after wrong feedback");

const staleBurst = makeBurstSandbox(false);
staleBurst.beginSeaTargetBurst({ button: staleBurst.answerButton, value: { ok: true }, bursting: false, x: 100, y: 100 });
assert.equal(staleBurst.pickCalls, 0);
assert.equal(staleBurst.timers.length, 1);
staleBurst.seaShooterEpoch += 1;
staleBurst.timers.shift()();
assert.equal(staleBurst.pickCalls, 0, "an old burst timer must not answer a new question");

/* Every exit boundary clears stale pointers, timers, shots and target state. */
assert.match(clearSeaBody, /seaShooterEpoch\+\+/);
assert.match(clearSeaBody, /clearTimeout\(seaBubbleLaunchTimer\)/);
assert.match(clearSeaBody, /clearTimeout\(seaShooterResumeTimer\)/);
assert.match(clearSeaBody, /cancelSeaPointer\(\);cancelSeaFirePointer\(\);stopSeaFiring\(\)/);
assert.match(clearSeaBody, /clearSeaShotLayer\(\)/);
assert.match(clearSeaBody, /seaSalvoHits\.clear\(\)/);
for (const functionName of ["startJourneyAt", "beginStageTransit", "openMap", "ending"]) {
  assert.match(extractFunction(js, functionName), /(?:clear|reset|cancel)[A-Za-z_$]*Sea[A-Za-z_$]*\(/, `${functionName}: stale sea interaction is not cleared`);
}
assert.match(js, /if\(document\.hidden\)\{hideWeatherNotice\(\);pauseSeaInput\(\);safeSuspend\(\);\}/);
assert.match(js, /window\.addEventListener\("pagehide",\(\)=>\{hideWeatherNotice\(\);pauseSeaInput\(\)/);
assert.match(js, /window\.addEventListener\("resize",handleSeaViewportChange/);

/* Reduced motion and LP lock remain explicit. */
const buildFishBody = extractFunction(js, "buildSeaFish");
const renderFishBody = extractFunction(js, "renderSeaFish");
assert.match(buildFishBody, /14/);
assert.match(buildFishBody, /10/);
assert.match(buildFishBody, /6/);
assert.match(renderFishBody, /seaReducedMotion\(\)/);
assert.match(renderFishBody, /reduced\?0/);
assert.match(extractFunction(js, "seaControlAvailable"), /!window\.__PONO_TIER_LOCKED__/);
assert.match(extractFunction(js, "spawnSeaShot"), /window\.__PONO_TIER_LOCKED__/);
assert.match(extractFunction(js, "syncSeaCompanions"), /window\.__PONO_TIER_LOCKED__/);
const reducedCss = css.slice(css.indexOf("@media (prefers-reduced-motion:reduce)"));
assert.match(reducedCss, /\.sea-hit-spark,\.sea-burst-drop[^}]*display:none!important/);
assert.match(reducedCss, /\.vehicle-steer-shell[^}]*transition:none!important/);
assert.match(reducedCss, /body\.st-sea\.v-sub #veh \.vbody,body\.st-sea\.v-sub #veh \.submarine-art\{animation:none!important\}/);

assert.match(js, /id:"sea"[\s\S]{0,180}veh:"sub"[\s\S]{0,180}bank:SEA[\s\S]{0,180}gens:\["legsS","sizeS"\]/);
assertNoChildFacingKanji(renderSeaBody, "renderSeaBubbleGame");
assertNoChildFacingKanji(burstTargetBody, "beginSeaTargetBurst");
assertNoChildFacingKanji(extractFunction(js, "startSeaKeyboardTargetFire"), "startSeaKeyboardTargetFire");

console.log("nazonazo sea shooter regression: OK");
