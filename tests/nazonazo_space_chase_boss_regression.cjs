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
assert.match(html, /styles\.css\?v=20260716-1329/);
assert.match(html, /js\/game\.js\?v=20260716-1329/);
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
assert.match(layerBlock, /id="spaceChaseRescuePlayfield"[^>]*tabindex="0"[^>]*ひかる すきまへ[^>]*うえと したの キー/);
assert.match(layerBlock, /<span id="spaceChaseRescueStar"/);
assert.match(layerBlock, /id="spaceChaseRescueTether"/);
assert.match(layerBlock, /id="spaceChaseRescueAimLine"[^>]*aria-hidden="true"/);
assert.match(layerBlock, /id="spaceChaseRescueAim"[^>]*aria-hidden="true"/);
assert.match(layerBlock, /space_finale_runaway_comet_20260716\.webp/);
assert.match(layerBlock, /space_finale_rainbow_rail_20260716\.webp/);
assert.equal((layerBlock.match(/data-rescue-gate=/g) || []).length, 5);
assert.equal((layerBlock.match(/data-rescue-lock=/g) || []).length, 3);
assert.equal((layerBlock.match(/data-station=/g) || []).length, 6);
assert.match(layerBlock, /id="spaceChaseTimingPulse"[^>]*>[\s\S]*?<strong>いま！<\/strong><small>3ばい！<\/small>/);
assert.match(layerBlock, /<h2 id="spaceChaseRescueTitle">おいついた！<\/h2>/);
assert.match(layerBlock, /id="spaceChaseRescueProgress"[^>]*aria-valuemax="100"/);
assert.match(layerBlock, /<p id="spaceChaseRescueGuide"[^>]*>でも すいせいが とまれない！<\/p>/);
assert.match(layerBlock, /<button id="spaceChaseRescueMashButton"[^>]*hidden>[\s\S]*?<strong>れんだ！<\/strong>/);
assert.doesNotMatch(layerBlock, /spaceChaseRescueAssist|spaceChaseRescueDemo|space-chase-rescue-orbit-guide|<button id="spaceChaseRescueStar"/);
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
assert.match(cssRule("#spaceChaseRescueMashButton"), /min-height\s*:\s*clamp\(66px,15vmin,98px\)/);
assert.match(css, /\.space-chase-finale-scene\.is-runaway/);
assert.match(css, /\.space-chase-tail-gate\.is-current/);
assert.match(css, /\.space-chase-seal-targets>i\.is-current/);
assert.match(css, /\.space-chase-rescue-panel\[data-rescue-mode="mash"\]\.is-pulse-now/);
assert.match(css, /\.space-chase-constellation>i\.is-on/);
assert.match(css, /\.space-chase-board\.is-rival-surge \.space-chase-comet/);
assert.match(css, /\.space-chase-board\.is-final #spaceChaseBoostButton/);
assert.match(css, /@media \(orientation:landscape\) and \(max-height:360px\)[\s\S]*?#spaceChaseRescueMashButton\{[^}]*min-height:48px/);
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*?\.space-chase-world,[\s\S]*?animation:none!important[\s\S]*?\.space-chase-board\.is-cinematic \.space-chase-world\{transform:scale\(1\)!important/);
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*?\.space-chase-finale-scene,[\s\S]*?animation:none!important/);
assert.match(css, /body\.space-chase-active #veh[\s\S]*?visibility:hidden!important/);

const cacheVersion = Number(sw.match(/const CACHE_VERSION = (\d+);/)?.[1]);
assert.equal(cacheVersion, 2241);
assert.match(sw, /v2241:[\s\S]{0,700}batch:1329-nazonazo-grand-rescue/);

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
  "this.data={world:SPACE_CHASE_WORLD_WIDTH,view:SPACE_CHASE_VIEWBOX_WIDTH,startLead:SPACE_CHASE_START_LEAD,cometSpeed:SPACE_CHASE_COMET_SPEED,rocketSpeed:SPACE_CHASE_ROCKET_SPEED,boostSpeed:SPACE_CHASE_BOOST_SPEED,boostMs:SPACE_CHASE_BOOST_MS,autoBoost:SPACE_CHASE_AUTO_BOOST_MS,autoChoice:SPACE_CHASE_AUTO_CHOICE_MS,counterSpeed:SPACE_CHASE_RIVAL_COUNTER_SPEED,counterMs:SPACE_CHASE_RIVAL_COUNTER_MS,finalMin:SPACE_CHASE_FINAL_RACE_MIN_MS,assistAfter:SPACE_CHASE_FINAL_ASSIST_AFTER_MS,cinematicMs:SPACE_CHASE_CINEMATIC_MS,cinematicFinalMs:SPACE_CHASE_CINEMATIC_FINAL_MS,deadHeatDistance:SPACE_CHASE_DEAD_HEAT_DISTANCE,caughtMs:SPACE_CHASE_CAUGHT_MS,victoryMs:SPACE_CHASE_VICTORY_MS,gateCount:SPACE_CHASE_RESCUE_GATE_COUNT,gateInterval:SPACE_CHASE_RESCUE_GATE_INTERVAL_MS,gatePenalty:SPACE_CHASE_RESCUE_GATE_PENALTY_MS,lockCount:SPACE_CHASE_RESCUE_LOCK_COUNT,lockHold:SPACE_CHASE_RESCUE_LOCK_HOLD_MS,lockMin:SPACE_CHASE_RESCUE_LOCK_MIN_MS,lockSeal:SPACE_CHASE_RESCUE_LOCK_SEAL_MS,mashCount:SPACE_CHASE_RESCUE_MASH_COUNT,mashMin:SPACE_CHASE_RESCUE_MASH_MIN_STAGE_MS,mashSettle:SPACE_CHASE_RESCUE_MASH_SETTLE_MS,mashGoals:SPACE_CHASE_RESCUE_MASH_GOALS,rescueAimRadius:SPACE_CHASE_RESCUE_AIM_RADIUS,rescuePerfectRadius:SPACE_CHASE_RESCUE_PERFECT_RADIUS,edges:SPACE_CHASE_ROUTE_EDGES,junctions:SPACE_CHASE_JUNCTIONS};",
  "this.curvePoint=spaceChaseCurvePoint;this.boostPositions=spaceChaseBoostPositions;"
].join("\n"), dataSandbox);

const data = dataSandbox.data;
assert.deepEqual([data.world, data.view], [8000, 1350]);
assert.deepEqual([data.cometSpeed, data.rocketSpeed, data.startLead], [82, 88, 162]);
assert.deepEqual([data.boostSpeed, data.boostMs, data.autoBoost], [135, 1800, 1200]);
assert.deepEqual([data.counterSpeed, data.counterMs, data.finalMin, data.assistAfter], [145, 1200, 32000, 6000]);
assert.deepEqual([data.cinematicMs, data.cinematicFinalMs, data.deadHeatDistance], [760, 900, 140]);
assert.deepEqual([data.caughtMs, data.victoryMs], [3500, 6000]);
assert.deepEqual([data.gateCount, data.gateInterval, data.gatePenalty], [5, 3000, 700]);
assert.deepEqual([data.lockCount, data.lockHold, data.lockMin, data.lockSeal], [3, 1900, 4200, 600]);
assert.deepEqual([data.mashCount, data.mashMin, data.mashSettle], [3, 3600, 400]);
assert.deepEqual(Array.from(data.mashGoals), [10, 12, 14]);
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
  spaceChaseRescueStar: null,
  spaceChaseRescueTitle: { textContent: "" },
  spaceChaseRescueGuide: { textContent: "" },
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
  "beginSpaceChaseRace", "beginSpaceChaseFinal", "addSpaceChaseFinalBoost", "resetSpaceChaseRescueStar", "beginSpaceChaseCaught", "updateSpaceChase"
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
  now: 0,
  window: { __PONO_TIER_LOCKED__: false, innerWidth: 844, innerHeight: 390 },
  document: { hidden: false },
  spaceChaseLayer: { hidden: false },
  spaceChaseRescuePanel: { hidden: false },
  spaceChaseRescuePlayfield: { getBoundingClientRect: () => field, setPointerCapture() {}, releasePointerCapture() {}, setAttribute() {}, focus() {} },
  spaceChaseRescueStar: { classList: fakeClassList() },
  spaceChaseRescueGuide: { textContent: "" },
  spaceChaseRescueTitle: { textContent: "" },
  spaceChaseRescueMashButton: { hidden: true, disabled: true, focus() {} },
  spaceChaseDefeated: false,
  settingsOpen: false,
  reducedMotion: false,
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  spaceLandscapePlayable: () => rescueSandbox.window.innerWidth >= rescueSandbox.window.innerHeight,
  gameSettingsMenuIsOpen: () => rescueSandbox.settingsOpen,
  futureReducedMotion: () => rescueSandbox.reducedMotion,
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
  "spaceChaseFinalePhaseActive", "spaceChaseRescueRuntimeActive", "spaceChaseRescueInputActive", "spaceChaseRescuePlayfieldInputActive",
  "spaceChaseRescueLockTarget", "spaceChaseRescueMashPulseNow", "resetSpaceChaseRescueStar",
  "cancelSpaceChaseRescuePointer", "setSpaceChaseRescueAimFromClient", "handleSpaceChaseRescuePointerDown",
  "moveSpaceChaseRescuePointer", "finishSpaceChaseRescuePointer", "handleSpaceChaseRescueLostPointerCapture",
  "acceptSpaceChaseRescueInput", "handleSpaceChaseRescueClick", "moveSpaceChaseRescueAimBy", "handleSpaceChaseRescueKeydown",
  "advanceSpaceChaseCaughtStory", "enterSpaceChaseRescueMode", "beginSpaceChaseRescue", "advanceSpaceChaseRescueGate",
  "completeSpaceChaseRescueGate", "updateSpaceChaseRescueGates", "completeSpaceChaseRescueLock", "updateSpaceChaseRescueLocks",
  "completeSpaceChaseRescueMashStage", "addSpaceChaseRescueMash", "updateSpaceChaseRescueMash", "updateSpaceChaseRescue",
  "advanceSpaceChaseVictoryStory", "finishSpaceChaseVictory", "updateSpaceChase",
  "handleSpaceChaseRescueMashPointerDown", "handleSpaceChaseRescueMashClick"
];
vm.runInContext([
  chaseConstants,
  "let spaceChaseState=createSpaceChaseState();",
  rescueFunctions.map(name => extractFunction(game, name)).join("\n"),
  `function resetFinale(reduced){
    now=0;spaceChaseLayer.hidden=false;spaceChaseRescuePanel.hidden=false;document.hidden=false;settingsOpen=false;window.innerWidth=844;window.innerHeight=390;reducedMotion=!!reduced;spaceChaseDefeated=false;confettiCalls=0;clearCalls=0;completeCalls=0;spaceChaseState=createSpaceChaseState();spaceChaseState.phase='caught';spaceChaseState.rescueMode='tableau';spaceChaseState.frameAt=0;
  }
  function finaleKey(){return spaceChaseState.phase+':'+(spaceChaseState.rescueMode||'');}
  function skilledInput(){
    if(spaceChaseState.phase!=='rescue')return;
    if(spaceChaseState.rescueMode==='gates'){spaceChaseState.rescueModeHasInput=true;spaceChaseState.rescueHasInput=true;spaceChaseState.rescueShipAimY=SPACE_CHASE_RESCUE_GATE_Y[Math.min(spaceChaseState.rescueGateIndex,SPACE_CHASE_RESCUE_GATE_COUNT-1)];}
    else if(spaceChaseState.rescueMode==='locks'){const target=spaceChaseRescueLockTarget(spaceChaseState.rescueLockIndex,spaceChaseState.rescueLockElapsedMs+50);spaceChaseState.rescueModeHasInput=true;spaceChaseState.rescueHasInput=true;spaceChaseState.rescueAimX=target.x;spaceChaseState.rescueAimY=target.y;spaceChaseState.rescueRingX=target.x;spaceChaseState.rescueRingY=target.y;}
    else if(spaceChaseState.rescueMode==='mash'&&spaceChaseRescueMashPulseNow()&&now-spaceChaseState.rescueMashLastTapAt>=100)addSpaceChaseRescueMash();
  }
  function simulateFinale(kind,reduced){
    resetFinale(reduced);const trace=[],gateSteps=[],lockSteps=[],mashSteps=[],progress=[];let lastKey='',lastGate=-1,lastLock=-1,lastMash=-1,monotonic=true,guard=0,lastProgress=0;
    while(completeCalls===0&&guard++<2200){const key=finaleKey();if(key!==lastKey){trace.push(key);lastKey=key;}if(kind==='skilled')skilledInput();now+=50;updateSpaceChase(now);if(spaceChaseState.rescueOverallProgress+1e-9<lastProgress)monotonic=false;lastProgress=spaceChaseState.rescueOverallProgress;progress.push(lastProgress);if(spaceChaseState.rescueGatePassed!==lastGate){lastGate=spaceChaseState.rescueGatePassed;gateSteps.push(lastGate);}if(spaceChaseState.rescueLockIndex!==lastLock){lastLock=spaceChaseState.rescueLockIndex;lockSteps.push(lastLock);}if(spaceChaseState.rescueMashStage!==lastMash){lastMash=spaceChaseState.rescueMashStage;mashSteps.push(lastMash);}}
    for(let i=0;i<200;i++){now+=50;updateSpaceChase(now);}return {duration:now-10000,trace,gateSteps,lockSteps,mashSteps,monotonic,misses:spaceChaseState.rescueGateMissed,taps:spaceChaseState.rescueMashTapCount,good:spaceChaseState.rescueMashGoodCount,confettiCalls,clearCalls,completeCalls};
  }
  function snapshot(){return {phase:spaceChaseState.phase,phaseElapsedMs:spaceChaseState.phaseElapsedMs,mode:spaceChaseState.rescueMode,modeElapsed:spaceChaseState.rescueModeElapsedMs,progress:spaceChaseState.rescueOverallProgress,ship:spaceChaseState.rescueShipY,gate:spaceChaseState.rescueGateIndex,gateElapsed:spaceChaseState.rescueGateElapsedMs,lock:spaceChaseState.rescueLockIndex,lockElapsed:spaceChaseState.rescueLockElapsedMs,capture:spaceChaseState.rescueCaptureMs,mash:spaceChaseState.rescueMashStage,mashElapsed:spaceChaseState.rescueMashStageElapsedMs,power:spaceChaseState.rescueMashPower,pulse:spaceChaseState.rescueMashPulseElapsedMs,victory:spaceChaseState.victoryStep};}
  function reachMode(target){resetFinale(false);let guard=0;while(finaleKey()!==target&&guard++<1800){now+=50;updateSpaceChase(now);}return finaleKey()===target;}
  function pauseProbe(target,blocker){if(!reachMode(target))return {reached:false};const before=snapshot();if(blocker==='settings')settingsOpen=true;else if(blocker==='hidden')document.hidden=true;else{window.innerWidth=320;window.innerHeight=568;}for(let i=0;i<100;i++){now+=50;updateSpaceChase(now);}const paused=snapshot();settingsOpen=false;document.hidden=false;window.innerWidth=844;window.innerHeight=390;now+=50;updateSpaceChase(now);const after=snapshot();return {reached:true,before,paused,after};}
  function caughtGuardProbe(){resetFinale(false);let handled=0;while(now<3400){handled+=setSpaceChaseRescueAimFromClient(400,200)?1:0;handled+=addSpaceChaseRescueMash()?1:0;now+=50;updateSpaceChase(now);}return {phase:spaceChaseState.phase,mode:spaceChaseState.rescueMode,handled,elapsed:spaceChaseState.phaseElapsedMs};}
  function collisionProbe(){resetFinale(false);spaceChaseState.phase='rescue';enterSpaceChaseRescueMode('gates');spaceChaseState.rescueModeHasInput=true;spaceChaseState.rescueShipY=.83;spaceChaseState.rescueShipAimY=.83;let guard=0,minProgress=1;while(spaceChaseState.rescueGateIndex===0&&guard++<100){now+=50;updateSpaceChase(now);minProgress=Math.min(minProgress,spaceChaseState.rescueOverallProgress);}return {gate:spaceChaseState.rescueGateIndex,passed:spaceChaseState.rescueGatePassed,missed:spaceChaseState.rescueGateMissed,progress:spaceChaseState.rescueOverallProgress,minProgress,phase:spaceChaseState.phase};}
  function tapProbe(){resetFinale(false);spaceChaseState.phase='rescue';enterSpaceChaseRescueMode('mash');spaceChaseState.rescueOverallProgress=.67;now=100;spaceChaseState.rescueMashPulseElapsedMs=SPACE_CHASE_RESCUE_MASH_PULSE_MS[0]/2;let prevented=0;handleSpaceChaseRescueMashPointerDown({button:0,isPrimary:true,preventDefault(){prevented++;}});handleSpaceChaseRescueMashClick({detail:1,preventDefault(){prevented++;}});const goodPower=spaceChaseState.rescueMashPower;now=200;spaceChaseState.rescueMashPulseElapsedMs=0;handleSpaceChaseRescueMashClick({detail:0,preventDefault(){prevented++;}});return {goodPower,total:spaceChaseState.rescueMashPower,taps:spaceChaseState.rescueMashTapCount,good:spaceChaseState.rescueMashGoodCount,prevented};}
  function pointerProbe(){resetFinale(false);spaceChaseState.phase='rescue';enterSpaceChaseRescueMode('gates');handleSpaceChaseRescuePointerDown({button:0,isPrimary:true,pointerId:7,clientX:200,clientY:90,preventDefault(){}});moveSpaceChaseRescuePointer({pointerId:7,clientX:600,clientY:290,preventDefault(){}});const moved={id:spaceChaseState.rescuePointerId,shipAimY:spaceChaseState.rescueShipAimY,hasInput:spaceChaseState.rescueHasInput};handleSpaceChaseRescueLostPointerCapture({pointerId:7});handleSpaceChaseRescuePointerDown({button:0,isPrimary:true,pointerId:8,clientX:300,clientY:180,preventDefault(){}});return {moved,nextId:spaceChaseState.rescuePointerId};}
  this.api={simulateFinale,pauseProbe,caughtGuardProbe,collisionProbe,tapProbe,pointerProbe};`,
].join("\n"), rescueSandbox);

const caughtGuard = JSON.parse(JSON.stringify(rescueSandbox.api.caughtGuardProbe()));
assert.equal(caughtGuard.phase, "caught");
assert.equal(caughtGuard.mode, "tableau");
assert.equal(caughtGuard.handled, 0);
assert.ok(caughtGuard.elapsed >= 3300 && caughtGuard.elapsed < 3500);
const pointer = JSON.parse(JSON.stringify(rescueSandbox.api.pointerProbe()));
assert.equal(pointer.moved.id, 7);
assert.ok(pointer.moved.shipAimY > 0.7);
assert.equal(pointer.moved.hasInput, true);
assert.equal(pointer.nextId, 8, "lost capture must not lock the next pointer");
const tap = JSON.parse(JSON.stringify(rescueSandbox.api.tapProbe()));
assert.deepEqual(tap, { goodPower: 3, total: 4, taps: 2, good: 1, prevented: 2 });
const collision = JSON.parse(JSON.stringify(rescueSandbox.api.collisionProbe()));
assert.deepEqual({ gate: collision.gate, passed: collision.passed, missed: collision.missed, phase: collision.phase }, { gate: 1, passed: 1, missed: 1, phase: "rescue" });
assert.ok(collision.progress >= collision.minProgress && collision.progress > 0);

const skilledFinale = JSON.parse(JSON.stringify(rescueSandbox.api.simulateFinale("skilled", false)));
assert.deepEqual(skilledFinale.trace, ["caught:tableau", "rescue:gates", "rescue:locks", "rescue:mash", "victory:constellation"]);
assert.ok(skilledFinale.duration >= 50000 && skilledFinale.duration <= 52500, "skilled finale duration: " + skilledFinale.duration);
assert.equal(skilledFinale.monotonic, true);
assert.deepEqual(skilledFinale.gateSteps, [0, 1, 2, 3, 4, 5]);
assert.deepEqual(skilledFinale.lockSteps, [0, 1, 2, 3]);
assert.deepEqual(skilledFinale.mashSteps, [0, 1, 2, 3]);
assert.equal(skilledFinale.misses, 0);
assert.ok(skilledFinale.taps > 0 && skilledFinale.good > 0);
assert.deepEqual({ confetti: skilledFinale.confettiCalls, clear: skilledFinale.clearCalls, complete: skilledFinale.completeCalls }, { confetti: 1, clear: 1, complete: 1 });

const assistedFinale = JSON.parse(JSON.stringify(rescueSandbox.api.simulateFinale("assist", false)));
assert.deepEqual(assistedFinale.trace, ["caught:tableau", "rescue:gates", "rescue:locks", "rescue:mash", "victory:constellation"]);
assert.ok(assistedFinale.duration >= 60000 && assistedFinale.duration <= 68000, "assisted finale duration: " + assistedFinale.duration);
assert.equal(assistedFinale.monotonic, true);
assert.deepEqual({ clear: assistedFinale.clearCalls, complete: assistedFinale.completeCalls }, { clear: 1, complete: 1 });
const reducedFinale = JSON.parse(JSON.stringify(rescueSandbox.api.simulateFinale("assist", true)));
assert.deepEqual(reducedFinale.trace, assistedFinale.trace);
assert.ok(Math.abs(reducedFinale.duration - assistedFinale.duration) <= 100, "reduced motion must preserve story and gameplay timing");

for (const target of ["caught:tableau", "rescue:gates", "rescue:locks", "rescue:mash", "victory:constellation"]) {
  for (const blocker of ["settings", "hidden", "portrait"]) {
    const probe = JSON.parse(JSON.stringify(rescueSandbox.api.pauseProbe(target, blocker)));
    assert.equal(probe.reached, true, target + " / " + blocker + " was not reached");
    assert.deepEqual(probe.paused, probe.before, target + " / " + blocker + " advanced while blocked");
    assert.ok(probe.after.phaseElapsedMs - probe.before.phaseElapsedMs <= 50, target + " / " + blocker + " caught up after resume");
    assert.ok(probe.after.modeElapsed - probe.before.modeElapsed <= 50, target + " / " + blocker + " mode caught up after resume");
  }
}

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
assert.doesNotMatch(extractFunction(game, "updateSpaceChase"), /futureReducedMotion\(\)\?\d+:SPACE_CHASE_(?:CAUGHT|VICTORY)_MS/);
assert.match(extractFunction(game, "updateSpaceChaseRescueGates"), /SPACE_CHASE_RESCUE_GATE_MAX_MS/);
assert.match(extractFunction(game, "updateSpaceChaseRescueLocks"), /perfect\?2:1/);
assert.match(extractFunction(game, "updateSpaceChaseRescueLocks"), /SPACE_CHASE_RESCUE_LOCK_AUTO_MS/);
assert.match(extractFunction(game, "updateSpaceChaseRescueMash"), /SPACE_CHASE_RESCUE_MASH_MAX_STAGE_MS/);
assert.match(extractFunction(game, "addSpaceChaseRescueMash"), /good\?3:1/);
assert.match(extractFunction(game, "setSpaceChaseRescueAimFromClient"), /acceptSpaceChaseRescueInput/);
assert.match(extractFunction(game, "handleSpaceChaseActionClick"), /event\.detail!==0/);
assert.match(extractFunction(game, "handleSpaceChaseRescueMashClick"), /event\.detail!==0/);
assert.match(game, /window\.addEventListener\("pointermove",event=>\{if\(spaceChaseState\.rescuePointerId!==null\)moveSpaceChaseRescuePointer\(event\)/);
assert.match(game, /window\.addEventListener\("blur",\(\)=>cancelSpaceChaseRescuePointer\(true\)\)/);

console.log("nazonazo competitive space chase and grand rescue regression checks passed");
