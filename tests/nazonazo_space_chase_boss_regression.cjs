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
const sw = read("sw.js");

function extractFunction(source, name) {
  const match = new RegExp("function\\s+" + name + "\\s*\\([^)]*\\)\\s*\\{").exec(source);
  assert.ok(match, name + ": function missing");
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
    if (char === '"' || char === "'" || char === String.fromCharCode(96)) { quote = char; continue; }
    if (char === "{") depth += 1;
    if (char === "}" && --depth === 0) return source.slice(match.index, index + 1);
  }
  assert.fail(name + ": function is not closed");
}

function cssRule(pattern) {
  const match = new RegExp(pattern + "\\s*\\{([^}]+)\\}").exec(css);
  assert.ok(match, "CSS rule missing: " + pattern);
  return match[1];
}

function assertNoChildFacingKanji(source, label) {
  const literals = Array.from(source.matchAll(/(["'])((?:\\.|(?!\1)[^\\])*)\1/g), match => match[2]);
  for (const literal of literals.filter(value => /[ぁ-んァ-ヶ一-龠々]/.test(value))) {
    assert.doesNotMatch(literal, /[一-龠々]/, label + ": child-facing string contains kanji: " + literal);
  }
}

const layerBlock = html.match(/<div id="spaceChaseLayer"[\s\S]*?<div id="seaRoundCountdown"/)?.[0] || "";
assert.match(html, /styles\.css\?v=20260716-1327/);
assert.match(html, /js\/game\.js\?v=20260716-1327/);
assert.match(layerBlock, /id="spaceChaseRouteMap"[^>]*viewBox="0 0 1350 720"/);
assert.match(layerBlock, /class="space-chase-world"/);
assert.match(layerBlock, /id="spaceChaseCinematic"[^>]*aria-hidden="true"/);
assert.match(layerBlock, /id="spaceChaseCinematicText">デッドヒート！/);
const worldStart = layerBlock.indexOf('class="space-chase-world"');
const cinematicStart = layerBlock.indexOf('id="spaceChaseCinematic"');
const hudStart = layerBlock.indexOf('class="space-chase-hud"');
assert.ok(worldStart >= 0 && cinematicStart > worldStart && hudStart > cinematicStart);
for (const marker of ['id="spaceChaseRouteMap"', 'class="space-chase-comet"', 'class="space-chase-rocket"']) {
  const position = layerBlock.indexOf(marker);
  assert.ok(position > worldStart && position < cinematicStart, marker + " must stay inside the zoom-only world");
}
assert.equal((layerBlock.match(/data-space-chase-choice=/g) || []).length, 2);
assert.match(layerBlock, /id="spaceChaseFinalMeter"[^>]*aria-valuemax="100"[^>]*hidden/);
assert.match(layerBlock, /<button id="spaceChaseBoostButton"/);
assert.match(layerBlock, /id="spaceChaseRescuePlayfield"[^>]*tabindex="0"[^>]*ほしのこを ゆびで おいかけて[^>]*やじるしキー/);
assert.match(layerBlock, /<span id="spaceChaseRescueStar"/);
assert.match(layerBlock, /id="spaceChaseRescueTether"/);
assert.match(layerBlock, /class="space-chase-rescue-orbit-guide"[^>]*aria-hidden="true"/);
assert.match(layerBlock, /id="spaceChaseRescueAimLine"[^>]*aria-hidden="true"/);
assert.match(layerBlock, /id="spaceChaseRescueAim"[^>]*aria-hidden="true"/);
assert.match(layerBlock, /id="spaceChaseRescueDemo"[^>]*aria-hidden="true"[^>]*>[\s\S]*?data-ui-art="touch"/);
assert.match(layerBlock, /<h2 id="spaceChaseRescueTitle">ほしのこに わを あわせよう！<\/h2>/);
assert.match(layerBlock, /id="spaceChaseRescueProgress"[^>]*aria-valuemax="100"/);
assert.match(layerBlock, /<p id="spaceChaseRescueGuide"[^>]*>ほしのこを ゆびで おいかけよう！<\/p>/);
assert.match(layerBlock, /<button id="spaceChaseRescueAssist"[^>]*hidden>じしゃくで おてつだい<\/button>/);
assert.doesNotMatch(layerBlock, /data-space-chase-ribbon|space-chase-rescue-ribbons|しっぽを はらう|<button id="spaceChaseRescueStar"/);
assertNoChildFacingKanji(layerBlock, "Space chase HTML");

assert.match(cssRule("#spaceChaseLayer"), /position\s*:\s*fixed/);
assert.match(cssRule("\.space-chase-world"), /transform-origin\s*:\s*var\(--space-chase-focus-x/);
assert.match(cssRule("\.space-chase-cinematic"), /pointer-events\s*:\s*none/);
assert.match(cssRule("\.space-chase-route-choices button"), /min-height\s*:\s*58px/);
assert.match(cssRule("#spaceChaseBoostButton"), /min-height\s*:\s*70px/);
assert.match(cssRule("\.space-chase-final-meter"), /min-height\s*:\s*25px/);
assert.match(cssRule("\.space-chase-rescue-playfield"), /touch-action\s*:\s*none/);
assert.match(cssRule("\.space-chase-rescue-ring"), /left\s*:\s*var\(--rescue-ring-x/);
assert.match(cssRule("\.space-chase-rescue-star"), /left\s*:\s*var\(--rescue-star-x/);
assert.match(cssRule("\.space-chase-rescue-aim"), /left\s*:\s*var\(--rescue-aim-x/);
assert.match(cssRule("\.space-chase-rescue-aim-line"), /pointer-events\s*:\s*none/);
assert.match(cssRule("\.space-chase-rescue-demo"), /pointer-events\s*:\s*none/);
assert.match(cssRule("#spaceChaseRescueAssist"), /min-height\s*:\s*56px/);
assert.match(css, /\.space-chase-board\.is-rival-surge \.space-chase-comet/);
assert.match(css, /\.space-chase-board\.is-final #spaceChaseBoostButton/);
assert.match(css, /@media \(orientation:landscape\) and \(max-width:559px\) and \(max-height:360px\)[\s\S]*?\.space-chase-rescue-ring\{width:44px[\s\S]*?#spaceChaseRescueAssist\{[^}]*min-height:44px/);
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*?\.space-chase-world,[\s\S]*?animation:none!important[\s\S]*?\.space-chase-board\.is-cinematic \.space-chase-world\{transform:scale\(1\)!important/);
assert.match(css, /body\.space-chase-active #veh[\s\S]*?visibility:hidden!important/);

const cacheVersion = Number(sw.match(/const CACHE_VERSION = (\d+);/)?.[1]);
assert.equal(cacheVersion, 2236);
assert.match(sw, /v2236:[\s\S]{0,700}batch:1327-nazonazo-cinematic-catch/);

const constantsStart = game.indexOf("const SPACE_CHASE_WORLD_WIDTH");
const constantsEnd = game.indexOf("\nlet spaceRepairOptions", constantsStart);
assert.ok(constantsStart > 0 && constantsEnd > constantsStart);
const chaseConstants = game.slice(constantsStart, constantsEnd);
assertNoChildFacingKanji(chaseConstants, "Space chase data");

const dataSandbox = { clamp: (value, min, max) => Math.max(min, Math.min(max, value)), Math, Number, Object, Set };
vm.createContext(dataSandbox);
vm.runInContext([
  chaseConstants,
  extractFunction(game, "spaceChaseEdgeSegments"),
  extractFunction(game, "spaceChaseCurvePoint"),
  extractFunction(game, "spaceChaseBoostPositions"),
  "this.data={world:SPACE_CHASE_WORLD_WIDTH,view:SPACE_CHASE_VIEWBOX_WIDTH,startLead:SPACE_CHASE_START_LEAD,cometSpeed:SPACE_CHASE_COMET_SPEED,rocketSpeed:SPACE_CHASE_ROCKET_SPEED,boostSpeed:SPACE_CHASE_BOOST_SPEED,boostMs:SPACE_CHASE_BOOST_MS,autoBoost:SPACE_CHASE_AUTO_BOOST_MS,autoChoice:SPACE_CHASE_AUTO_CHOICE_MS,counterSpeed:SPACE_CHASE_RIVAL_COUNTER_SPEED,counterMs:SPACE_CHASE_RIVAL_COUNTER_MS,finalMin:SPACE_CHASE_FINAL_RACE_MIN_MS,assistAfter:SPACE_CHASE_FINAL_ASSIST_AFTER_MS,cinematicMs:SPACE_CHASE_CINEMATIC_MS,cinematicFinalMs:SPACE_CHASE_CINEMATIC_FINAL_MS,deadHeatDistance:SPACE_CHASE_DEAD_HEAT_DISTANCE,rescueAimRadius:SPACE_CHASE_RESCUE_AIM_RADIUS,rescuePerfectRadius:SPACE_CHASE_RESCUE_PERFECT_RADIUS,edges:SPACE_CHASE_ROUTE_EDGES,junctions:SPACE_CHASE_JUNCTIONS};",
  "this.curvePoint=spaceChaseCurvePoint;this.boostPositions=spaceChaseBoostPositions;"
].join("\n"), dataSandbox);

const data = dataSandbox.data;
assert.deepEqual([data.world, data.view], [8000, 1350]);
assert.deepEqual([data.cometSpeed, data.rocketSpeed, data.startLead], [82, 88, 162]);
assert.deepEqual([data.boostSpeed, data.boostMs, data.autoBoost], [135, 1800, 1200]);
assert.deepEqual([data.counterSpeed, data.counterMs, data.finalMin, data.assistAfter], [145, 1200, 32000, 6000]);
assert.deepEqual([data.cinematicMs, data.cinematicFinalMs, data.deadHeatDistance], [760, 900, 140]);
assert.deepEqual([data.rescueAimRadius, data.rescuePerfectRadius], [.16, .055]);
assert.equal(data.autoChoice, 3500);
assert.equal(Object.keys(data.edges).length, 10);
assert.deepEqual(Object.keys(data.junctions), ["J0", "J1", "J2"]);
assert.equal(data.edges.finish.travelLength, 2253.2);
assert.deepEqual([dataSandbox.curvePoint(data.edges.finish, 1).x, dataSandbox.curvePoint(data.edges.finish, 1).y], [8000, 360]);
assert.ok(Math.abs((data.boostSpeed - data.rocketSpeed) * data.boostMs / 1000 - 84.6) < 0.001);

function sampledVisualLength(edge) {
  let previous = dataSandbox.curvePoint(edge, 0);
  let length = 0;
  for (let index = 1; index <= 1600; index += 1) {
    const point = dataSandbox.curvePoint(edge, index / 1600);
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return length;
}
for (const [edgeId, edge] of Object.entries(data.edges)) {
  const ratio = sampledVisualLength(edge) / edge.travelLength;
  assert.ok(ratio >= 1.995 && ratio <= 2.005, edgeId + ": visual/logical speed ratio drifted to " + ratio);
}
for (const [junctionId, junction] of Object.entries(data.junctions)) {
  assert.equal(junction.fallbackIndex, 1, junctionId + ": fallback must collect boost stars");
  assert.ok(Math.abs(data.edges[junction.choices[1].edge].travelLength - data.edges[junction.choices[0].edge].travelLength - 84.6) < 0.001);
  assert.deepEqual(Array.from(dataSandbox.boostPositions(data.edges[junction.choices[1].edge])), [0.2, 0.5, 0.8]);
}

const raceSandbox = {
  FAST: 1,
  window: { __PONO_TIER_LOCKED__: false, innerWidth: 844, innerHeight: 390 },
  document: { hidden: false },
  playing: true,
  settingsOpen: false,
  spaceChaseLayer: { hidden: false },
  spaceChaseChoiceButtons: [{ hidden: false, focus() {} }, { hidden: false, focus() {} }],
  spaceChaseBoostButton: { focus() {} },
  spaceChaseCinematicText: { textContent: "" },
  spaceChaseBoostItems: [],
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  isSpaceStage: () => true,
  spaceLandscapePlayable: () => true,
  gameSettingsMenuIsOpen: () => raceSandbox.settingsOpen,
  futureReducedMotion: () => false,
  spaceChaseRescueRuntimeActive: () => false,
  setSpaceChaseGuide() {}, announce() {}, tone() {}, showStamp() {}, ensureAC() {},
  updateSpaceChaseVisual() {}, updateSpaceChaseRouteChoiceControls() {}, markSpaceChaseRoute() {},
  beginSpaceChaseRescue() {}, origin: value => value, clearSpaceChaseEncounter() {}, completeCurrentStage() {},
  _nowMs: () => 0, stg: 5,
  Math, Number, Object, Set, Map, Infinity,
};
vm.createContext(raceSandbox);
const raceFunctions = [
  "spaceChaseRuntimeActive", "spaceChaseEdgeSegments", "spaceChaseCurvePoint", "spaceChaseBoostPositions",
  "ensureSpaceChaseRouteMetrics", "spaceChasePointAtDistance", "spaceChaseRacerPoint", "collectSpaceChaseBoost",
  "nextSpaceChaseEdge", "advanceSpaceChaseRacer", "promptSpaceChaseBranch", "chooseSpaceChaseRoute",
  "spaceChaseBoostPlayable", "useSpaceChaseBoost", "spaceChaseVisualLead", "spaceChaseRacerSeparation", "startSpaceChaseCinematic", "trackSpaceChaseLead",
  "beginSpaceChaseRace", "beginSpaceChaseFinal", "addSpaceChaseFinalBoost", "beginSpaceChaseCaught", "updateSpaceChase"
];
vm.runInContext([
  chaseConstants,
  "let spaceChaseState=createSpaceChaseState(),spaceChaseDefeated=false;",
  "const spaceChaseRouteMetrics=new Map();",
  raceFunctions.map(name => extractFunction(game, name)).join("\n"),
  "ensureSpaceChaseRouteMetrics();",
  "function resetRace(){spaceChaseLayer.hidden=false;settingsOpen=false;document.hidden=false;window.innerWidth=844;window.innerHeight=390;spaceChaseState=createSpaceChaseState();spaceChaseState.phase='intro';spaceChaseState.rocket=createSpaceChaseRacer('rocket');spaceChaseState.comet=createSpaceChaseRacer('comet');spaceChaseState.cometChoices=Object.assign(Object.create(null),SPACE_CHASE_COMET_PLANS[0]);advanceSpaceChaseRacer(spaceChaseState.comet,SPACE_CHASE_START_LEAD);}",
  "function simulate(plan,fallback,tapInterval){resetRace();let now=0,nextTap=0,maxBoostRun=0,boostRun=0,guard=0;while(spaceChaseState.phase!=='caught'&&guard++<1300){if(spaceChaseState.phase==='final'&&spaceChaseState.finalMode==='sprint'&&Number.isFinite(tapInterval)&&spaceChaseState.finalSprintElapsedMs>=nextTap){addSpaceChaseFinalBoost();nextTap+=tapInterval;}now+=50;updateSpaceChase(now);if(spaceChaseState.phase==='race'&&spaceChaseState.activeJunction&&!fallback)chooseSpaceChaseRoute(plan[spaceChaseState.activeJunction]);if(spaceChaseState.phase==='race'&&spaceChaseState.boostRemainingMs>0){boostRun+=50;maxBoostRun=Math.max(maxBoostRun,boostRun);}else boostRun=0;}return {phase:spaceChaseState.phase,raceElapsedMs:spaceChaseState.raceElapsedMs,choices:Object.assign({},spaceChaseState.playerChoices),stars:spaceChaseState.collectedBoosts.size,leadChanges:spaceChaseState.leadChangeCount,maxBoostRun,finalTapCount:spaceChaseState.finalTapCount,finalAssistActive:spaceChaseState.finalAssistActive,rivalCounterUsed:spaceChaseState.rivalCounterUsed,rocketFinished:spaceChaseState.rocket.finished,cometFinished:spaceChaseState.comet.finished};}",
  "function pauseProbe(){resetRace();let now=0;for(let i=0;i<80;i++){now+=50;updateSpaceChase(now);}startSpaceChaseCinematic('rocket','ロケットが でた！',SPACE_CHASE_CINEMATIC_MS);const before={race:spaceChaseState.raceElapsedMs,rocket:spaceChaseState.rocket.distance,comet:spaceChaseState.comet.distance,cinematic:spaceChaseState.cinematicRemainingMs};settingsOpen=true;for(let i=0;i<100;i++){now+=50;updateSpaceChase(now);}const paused={race:spaceChaseState.raceElapsedMs,rocket:spaceChaseState.rocket.distance,comet:spaceChaseState.comet.distance,cinematic:spaceChaseState.cinematicRemainingMs};settingsOpen=false;now+=50;updateSpaceChase(now);return {before,paused,after:spaceChaseState.raceElapsedMs,cinematicAfter:spaceChaseState.cinematicRemainingMs};}",
  "function cinematicProbe(){resetRace();spaceChaseState.phase='race';spaceChaseState.rocket.edgeId='finish';spaceChaseState.comet.edgeId='finish';spaceChaseState.rocket.distance=300;spaceChaseState.comet.distance=350;const sameEdge=spaceChaseRacerSeparation();spaceChaseState.comet.edgeId='bridge1';spaceChaseState.comet.distance=350;const differentEdge=spaceChaseRacerSeparation();spaceChaseState.comet.edgeId='finish';const started=startSpaceChaseCinematic('rocket','ロケットが でた！',SPACE_CHASE_CINEMATIC_MS);spaceChaseState.boostCharges=1;spaceChaseState.activeJunction='';const boosted=useSpaceChaseBoost();return {sameEdge,differentEdge,started,kind:spaceChaseState.cinematicKind,remaining:spaceChaseState.cinematicRemainingMs,text:spaceChaseCinematicText.textContent,boosted};}",
  "function actionProbe(){resetRace();spaceChaseState.phase='final';spaceChaseState.finalMode='sprint';spaceChaseState.finalStartGap=80;spaceChaseState.rocket.edgeId='finish';spaceChaseState.comet.edgeId='finish';spaceChaseState.rocket.distance=300;spaceChaseState.comet.distance=380;let prevented=0;handleSpaceChaseActionPointerDown({button:0,isPrimary:true,preventDefault(){prevented++;}});handleSpaceChaseActionClick({detail:1,preventDefault(){prevented++;}});const physical=spaceChaseState.finalTapCount;handleSpaceChaseActionClick({detail:0,preventDefault(){prevented++;}});handleSpaceChaseActionPointerDown({button:2,isPrimary:true,preventDefault(){prevented++;}});handleSpaceChaseActionPointerDown({button:0,isPrimary:false,preventDefault(){prevented++;}});return {physical,total:spaceChaseState.finalTapCount,prevented};}",
  extractFunction(game, "handleSpaceChaseActionPointerDown"),
  extractFunction(game, "handleSpaceChaseActionClick"),
  "this.api={simulate,pauseProbe,cinematicProbe,actionProbe};"
].join("\n"), raceSandbox);

const raceResults = [];
for (let bits = 0; bits < 8; bits += 1) {
  const plan = { J0: bits & 1 ? 1 : 0, J1: bits & 2 ? 1 : 0, J2: bits & 4 ? 1 : 0 };
  const result = JSON.parse(JSON.stringify(raceSandbox.api.simulate(plan, false, 250)));
  const scenicCount = Object.values(plan).filter(value => value === 1).length;
  raceResults.push(result);
  assert.equal(result.phase, "caught", "route " + bits + " did not finish the final sprint");
  assert.ok(result.raceElapsedMs >= 35000 && result.raceElapsedMs <= 45000, "route " + bits + " ended at " + result.raceElapsedMs);
  assert.deepEqual(result.choices, plan);
  assert.equal(result.stars, scenicCount * 3);
  assert.ok(result.leadChanges >= 2 && result.leadChanges <= 5, "route " + bits + " lead changes: " + result.leadChanges);
  if (scenicCount) assert.ok(result.maxBoostRun >= 1750, "route " + bits + " boost was too short: " + result.maxBoostRun);
  assert.equal(result.rivalCounterUsed, true);
  assert.ok(result.finalTapCount >= 4);
  assert.equal(result.rocketFinished, false);
  assert.equal(result.cometFinished, false);
}
assert.ok(raceResults.every(result => result.raceElapsedMs === 38800), "visual-only changes must preserve the 38.8 second tuned race");
assert.ok(raceResults.every(result => result.leadChanges === 3), "visual-only changes must preserve the three tuned lead changes");
assert.ok(Math.max(...raceResults.map(result => result.raceElapsedMs)) - Math.min(...raceResults.map(result => result.raceElapsedMs)) <= 800,
  "route choice changed the race duration too much");

const fallback = JSON.parse(JSON.stringify(raceSandbox.api.simulate({}, true, 250)));
assert.equal(fallback.phase, "caught");
assert.deepEqual(fallback.choices, { J0: 1, J1: 1, J2: 1 });
assert.ok(fallback.raceElapsedMs >= 35000 && fallback.raceElapsedMs <= 45000);
const noTap = JSON.parse(JSON.stringify(raceSandbox.api.simulate({ J0: 1, J1: 1, J2: 1 }, false, Infinity)));
assert.equal(noTap.phase, "caught");
assert.equal(noTap.finalTapCount, 0);
assert.equal(noTap.finalAssistActive, true);
assert.ok(noTap.raceElapsedMs <= 44500, "no-input assist finished too late: " + noTap.raceElapsedMs);
const fastTap = JSON.parse(JSON.stringify(raceSandbox.api.simulate({ J0: 0, J1: 0, J2: 0 }, false, 100)));
assert.ok(fastTap.raceElapsedMs >= 35000, "rapid taps skipped the race build-up");
const slowTap = JSON.parse(JSON.stringify(raceSandbox.api.simulate({ J0: 1, J1: 1, J2: 1 }, false, 650)));
assert.ok(slowTap.raceElapsedMs - fastTap.raceElapsedMs >= 1000, "faster tapping must produce an earlier comeback");
const paused = JSON.parse(JSON.stringify(raceSandbox.api.pauseProbe()));
assert.deepEqual(paused.paused, paused.before);
assert.ok(paused.after - paused.before.race <= 50);
assert.ok(paused.cinematicAfter < paused.before.cinematic);
const cinematic = JSON.parse(JSON.stringify(raceSandbox.api.cinematicProbe()));
assert.ok(cinematic.sameEdge < data.deadHeatDistance);
assert.ok(cinematic.differentEdge > data.deadHeatDistance);
assert.deepEqual({ started: cinematic.started, kind: cinematic.kind, remaining: cinematic.remaining, text: cinematic.text, boosted: cinematic.boosted }, { started: true, kind: "rocket", remaining: 760, text: "ロケットが でた！", boosted: true });
assert.deepEqual(JSON.parse(JSON.stringify(raceSandbox.api.actionProbe())), { physical: 1, total: 2, prevented: 2 });

function fakeClassList() {
  const values = new Set();
  return { add(...names) { names.forEach(name => values.add(name)); }, remove(...names) { names.forEach(name => values.delete(name)); }, toggle(name, force) { const next = force === undefined ? !values.has(name) : !!force; if (next) values.add(name); else values.delete(name); return next; }, contains(name) { return values.has(name); } };
}
const field = { left: 0, top: 0, width: 844, height: 390, right: 844, bottom: 390 };
const rescueSandbox = {
  FAST: 1,
  now: 1000,
  window: { __PONO_TIER_LOCKED__: false, innerWidth: 844, innerHeight: 390 },
  document: { hidden: false },
  spaceChaseLayer: { hidden: false },
  spaceChaseRescuePanel: { hidden: false },
  spaceChaseRescuePlayfield: { getBoundingClientRect: () => field, setPointerCapture() {}, releasePointerCapture() {} },
  spaceChaseRescueStar: { classList: fakeClassList() },
  spaceChaseRescueGuide: { textContent: "" },
  spaceChaseRescueTitle: { textContent: "" },
  spaceChaseRescueAssist: { hidden: true },
  spaceChaseDefeated: false,
  settingsOpen: false,
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  spaceLandscapePlayable: () => true,
  gameSettingsMenuIsOpen: () => rescueSandbox.settingsOpen,
  futureReducedMotion: () => false,
  spaceChaseRuntimeActive: () => false,
  updateSpaceChaseVisual() {}, setSpaceChaseGuide() {}, announce() {}, tone() {}, showStamp() {}, ensureAC() {},
  confettiCalls: 0, confetti() { rescueSandbox.confettiCalls += 1; },
  clearCalls: 0, completeCalls: 0,
  clearSpaceChaseEncounter() { rescueSandbox.clearCalls += 1; rescueSandbox.spaceChaseLayer.hidden = true; },
  completeCurrentStage() { rescueSandbox.completeCalls += 1; },
  origin: value => value, stg: 5,
  _nowMs: () => rescueSandbox.now,
  Math, Number, Object, Set, Map,
};
vm.createContext(rescueSandbox);
const rescueFunctions = [
  "spaceChaseRescueRuntimeActive", "spaceChaseRescueInputActive", "resetSpaceChaseRescueStar",
  "cancelSpaceChaseRescuePointer", "setSpaceChaseRescueAimFromClient", "handleSpaceChaseRescuePointerDown",
  "moveSpaceChaseRescuePointer", "finishSpaceChaseRescuePointer", "handleSpaceChaseRescueLostPointerCapture",
  "acceptSpaceChaseRescueInput", "handleSpaceChaseRescueClick", "moveSpaceChaseRescueAimBy", "handleSpaceChaseRescueKeydown",
  "activateSpaceChaseRescueAssist", "updateSpaceChaseRescue", "finishSpaceChaseVictory", "updateSpaceChase"
];
vm.runInContext([
  chaseConstants,
  "let spaceChaseState=createSpaceChaseState();",
  rescueFunctions.map(name => extractFunction(game, name)).join("\n"),
  "function resetRescue(){spaceChaseLayer.hidden=false;spaceChaseRescuePanel.hidden=false;document.hidden=false;settingsOpen=false;spaceChaseDefeated=false;confettiCalls=0;clearCalls=0;completeCalls=0;spaceChaseState=createSpaceChaseState();spaceChaseState.phase='rescue';resetSpaceChaseRescueStar();}",
  "function clickAt(x,y){let prevented=false;const handled=handleSpaceChaseRescueClick({clientX:x,clientY:y,preventDefault(){prevented=true;}});return {handled,prevented,phase:spaceChaseState.phase,aimX:spaceChaseState.rescueAimX,aimY:spaceChaseState.rescueAimY,hasInput:spaceChaseState.rescueHasInput};}",
  "function fourClicks(){resetRescue();for(let i=0;i<4;i++){now+=500;clickAt(420,195);}return {phase:spaceChaseState.phase,power:spaceChaseState.rescueCaptureMs};}",
  "function stepRescue(duration,follow){for(let elapsed=0;elapsed<duration&&spaceChaseState.phase==='rescue';elapsed+=50){if(follow){spaceChaseState.rescueAimX=spaceChaseState.rescueStarX;spaceChaseState.rescueAimY=spaceChaseState.rescueStarY;}updateSpaceChaseRescue(50);now+=50;}return {phase:spaceChaseState.phase,elapsed:spaceChaseState.rescueElapsedMs,power:spaceChaseState.rescueCaptureMs,assisted:spaceChaseState.rescueAssistActive,confettiCalls};}",
  "function pointerProbe(){resetRescue();handleSpaceChaseRescuePointerDown({button:0,isPrimary:true,pointerId:7,clientX:200,clientY:120,preventDefault(){}});moveSpaceChaseRescuePointer({pointerId:7,clientX:600,clientY:250,preventDefault(){}});const moved={id:spaceChaseState.rescuePointerId,aimX:spaceChaseState.rescueAimX,aimY:spaceChaseState.rescueAimY,hasInput:spaceChaseState.rescueHasInput};handleSpaceChaseRescueLostPointerCapture({pointerId:7});handleSpaceChaseRescuePointerDown({button:0,isPrimary:true,pointerId:8,clientX:300,clientY:180,preventDefault(){}});return {moved,nextId:spaceChaseState.rescuePointerId};}",
  "function keyProbe(){resetRescue();const before=spaceChaseState.rescueAimX;let prevented=false;handleSpaceChaseRescueKeydown({key:'ArrowRight',preventDefault(){prevented=true;}});return {before,after:spaceChaseState.rescueAimX,prevented,hasInput:spaceChaseState.rescueHasInput};}",
  "function demoProbe(){resetRescue();updateSpaceChaseRescue(1000);return {hasInput:spaceChaseState.rescueHasInput,elapsed:spaceChaseState.rescueElapsedMs,orbit:spaceChaseState.rescueOrbitElapsedMs,assisted:spaceChaseState.rescueAssistActive};}",
  "function assistProbe(){resetRescue();const activated=activateSpaceChaseRescueAssist();return {activated,assisted:spaceChaseState.rescueAssistActive,hidden:spaceChaseRescueAssist.hidden};}",
  "function advanceVictory(){let time=0;spaceChaseState.frameAt=0;while(time<3000){time+=50;updateSpaceChase(time);}return {clearCalls,completeCalls};}",
  "this.api={resetRescue,clickAt,fourClicks,stepRescue,pointerProbe,keyProbe,demoProbe,assistProbe,advanceVictory,state:()=>({phase:spaceChaseState.phase,power:spaceChaseState.rescueCaptureMs})};"
].join("\n"), rescueSandbox);

assert.deepEqual(JSON.parse(JSON.stringify(rescueSandbox.api.fourClicks())), { phase: "rescue", power: 0 });
rescueSandbox.api.resetRescue();
const click = JSON.parse(JSON.stringify(rescueSandbox.api.clickAt(700, 100)));
assert.equal(click.handled, true);
assert.equal(click.prevented, true);
assert.equal(click.hasInput, true);
assert.ok(click.aimX > 0.8 && click.aimY < 0.3);
const pointer = JSON.parse(JSON.stringify(rescueSandbox.api.pointerProbe()));
assert.equal(pointer.moved.id, 7);
assert.ok(pointer.moved.aimX > 0.7);
assert.equal(pointer.moved.hasInput, true);
assert.equal(pointer.nextId, 8, "lost capture must not lock the next pointer");
const key = JSON.parse(JSON.stringify(rescueSandbox.api.keyProbe()));
assert.ok(key.after > key.before);
assert.equal(key.prevented, true);
assert.equal(key.hasInput, true);
assert.deepEqual(JSON.parse(JSON.stringify(rescueSandbox.api.demoProbe())), { hasInput: false, elapsed: 1000, orbit: 350, assisted: false });
const assist = JSON.parse(JSON.stringify(rescueSandbox.api.assistProbe()));
assert.deepEqual(assist, { activated: true, assisted: true, hidden: true });

rescueSandbox.api.resetRescue();
const manualCatch = JSON.parse(JSON.stringify(rescueSandbox.api.stepRescue(6000, true)));
assert.equal(manualCatch.phase, "victory");
assert.equal(manualCatch.confettiCalls, 1);
const completed = JSON.parse(JSON.stringify(rescueSandbox.api.advanceVictory()));
assert.deepEqual(completed, { clearCalls: 1, completeCalls: 1 });

rescueSandbox.api.resetRescue();
const automaticCatch = JSON.parse(JSON.stringify(rescueSandbox.api.stepRescue(20000, false)));
assert.equal(automaticCatch.phase, "victory", "no-input rescue assist must prevent another dead end");
assert.equal(automaticCatch.assisted, true);
assert.ok(automaticCatch.elapsed >= 14000 && automaticCatch.elapsed <= 17000);

const allChaseSource = [
  ...raceFunctions, ...rescueFunctions,
  "handleSpaceChaseActionPointerDown", "handleSpaceChaseActionClick"
].filter((name, index, names) => names.indexOf(name) === index).map(name => extractFunction(game, name)).join("\n");
assertNoChildFacingKanji(allChaseSource, "Space chase functions");
assert.doesNotMatch(allChaseSource, /setTimeout|setInterval|addScore|stageMiss|totalStars/);
assert.doesNotMatch(allChaseSource, /clearSpaceChaseRibbon|rescueMode===\"wipe\"|SPACE_CHASE_CATCH_DISTANCE/);
assert.match(extractFunction(game, "updateSpaceChase"), /SPACE_CHASE_FINAL_ASSIST_AFTER_MS/);
assert.match(extractFunction(game, "updateSpaceChase"), /SPACE_CHASE_RIVAL_COUNTER_SPEED/);
assert.doesNotMatch(extractFunction(game, "updateSpaceChase"), /rocket\.distance>comet\.distance\)rocket\.distance=comet\.distance/);
assert.match(extractFunction(game, "updateSpaceChaseRescue"), /SPACE_CHASE_RESCUE_AUTO_ASSIST_MS/);
assert.match(extractFunction(game, "updateSpaceChaseRescue"), /perfect\?2:1/);
assert.match(extractFunction(game, "setSpaceChaseRescueAimFromClient"), /acceptSpaceChaseRescueInput/);
assert.match(extractFunction(game, "handleSpaceChaseActionClick"), /event\.detail!==0/);
assert.match(game, /window\.addEventListener\("pointermove",event=>\{if\(spaceChaseState\.rescuePointerId!==null\)moveSpaceChaseRescuePointer\(event\)/);
assert.match(game, /window\.addEventListener\("blur",\(\)=>cancelSpaceChaseRescuePointer\(true\)\)/);

console.log("nazonazo competitive space chase and ring rescue regression checks passed");
