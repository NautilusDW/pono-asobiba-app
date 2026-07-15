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

assert.match(html, /styles\.css\?v=20260716-1310/);
assert.match(html, /js\/game\.js\?v=20260716-1310/);
assert.match(sw, /v2201: なぞなぞトレイン宇宙面の最終イベント/);
assert.match(sw, /const CACHE_VERSION = 2201;/);

/* The finale is a visible branching route, with route choice, collectible boost, and rescue. */
const layerBlock = html.match(/<div id="spaceChaseLayer"[\s\S]*?<div id="seaRoundCountdown"/)?.[0] || "";
assert.match(layerBlock, /role="group" aria-label="うちゅう おいかけっこ" hidden/);
assert.match(layerBlock, /id="spaceChaseRouteMap"[^>]*viewBox="0 0 1000 500"/);
assert.match(layerBlock, /id="spaceChaseRoutePaths"/);
assert.equal((layerBlock.match(/class="space-chase-boost-item"/g) || []).length, 3);
assert.equal((layerBlock.match(/data-space-chase-choice=/g) || []).length, 2);
assert.equal((layerBlock.match(/data-space-chase-knot=/g) || []).length, 3);
assert.match(layerBlock, /class="space-chase-star-child[^>]*data-ui-art="star"/);
assert.match(layerBlock, /id="spaceChaseBoostMeter"[^>]*aria-valuemax="2"[^>]*aria-valuenow="1"/);
assert.match(layerBlock, /class="space-chase-rounds"[^>]*aria-valuemax="3"/);
assert.match(layerBlock, /id="spaceChaseRescuePanel"[^>]*aria-hidden="true"[^>]*hidden/);
assert.doesNotMatch(layerBlock, /spaceChaseTapMeter|space-chase-tap-meter/,
  "the old four-tap loop must not survive inside the route chase");

const layerCss = cssRule("#spaceChaseLayer");
assert.match(layerCss, /position\s*:\s*fixed/);
assert.match(layerCss, /inset\s*:\s*0/);
assert.match(layerCss, /z-index\s*:\s*18/);
assert.match(cssRule("#spaceChaseBoostButton"), /min-height\s*:\s*78px/);
assert.match(cssRule("#spaceChaseBoostButton"), /touch-action\s*:\s*manipulation/);
assert.match(cssRule("\.space-chase-route-choices button"), /min-height\s*:\s*72px/);
assert.match(cssRule("\.space-chase-rescue-knots button"), /width\s*:\s*clamp\(64px/);
assert.match(css, /\.space-chase-route-edge\.is-comet-route\{[^}]*stroke:#db9df2/);
assert.match(css, /\.space-chase-route-edge\.is-rocket-route\{[^}]*stroke:#fff08a/);
assert.match(css, /\.space-chase-board\.is-victory \.space-chase-star-child\{[^}]*left:-94%/);
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*?\.space-chase-camera,[\s\S]*?animation:none!important/);
assert.match(css, /@media \(orientation:portrait\)[\s\S]*?#rotateHint\{display:flex\}/);
assert.match(css, /body\.space-chase-active #veh[\s\S]*?visibility:hidden!important/);
assert.match(css, /body\.space-chase-active #stamp\{z-index:23\}/);
assert.match(css, /@media \(orientation:landscape\) and \(max-width:559px\) and \(max-height:360px\)[\s\S]*?\.space-chase-controls\.is-choosing\{grid-template-columns:minmax\(0,1fr\) 86px\}/,
  "small admin frames must collapse route choice and boost into two usable columns");
assert.match(css, /\.space-chase-controls\.is-choosing \.space-chase-readout\{display:none\}/);

/* Space completion still queues the finale before stage clear and uses a one-shot latch. */
const buildQList = extractFunction(game, "buildQList");
const proceed = extractFunction(game, "proceed");
const gloop = extractFunction(game, "gloop");
const resetSpaceSteering = extractFunction(game, "resetSpaceSteering");
const clearChase = extractFunction(game, "clearSpaceChaseEncounter");
const showChase = extractFunction(game, "showSpaceChaseEncounter");
const updateChase = extractFunction(game, "updateSpaceChase");
assert.match(buildQList, /if\(st\.id==="space"\)spaceChaseDefeated=false/);
assert.ok(proceed.indexOf('pending="spaceChase"') < proceed.indexOf("completeCurrentStage(o)"));
assert.match(proceed, /!window\.__PONO_TIER_LOCKED__/);
assert.match(gloop, /p==="spaceChase"\)showSpaceChaseEncounter\(\)/);
assert.match(resetSpaceSteering, /clearSpaceChaseEncounter\(\)/);
assert.doesNotMatch(clearChase, /spaceChaseDefeated\s*=/);
assert.match(showChase, /prepareSpaceChaseRouteMap\(\)/);
assert.match(showChase, /advanceSpaceChaseRacer\(spaceChaseState\.comet,SPACE_CHASE_START_LEAD\)/);
assert.match(updateChase, /spaceChaseState\.completionCommitted=true;const stageOrigin=origin\(stg\);clearSpaceChaseEncounter\(\);completeCurrentStage\(stageOrigin\)/);
assert.match(updateChase, /SPACE_CHASE_ROCKET_SPEED/);
assert.match(updateChase, /SPACE_CHASE_COMET_SPEED/);
assert.match(updateChase, /SPACE_CHASE_BOOST_SPEED/);

const chaseFunctionNames = [
  "spaceChaseRuntimeActive", "spaceChaseCurvePoint", "ensureSpaceChaseRouteMetrics",
  "spaceChasePointAtDistance", "collectSpaceChaseBoost", "nextSpaceChaseEdge",
  "advanceSpaceChaseRacer", "promptSpaceChaseBranch", "chooseSpaceChaseRoute",
  "spaceChaseBoostPlayable", "useSpaceChaseBoost", "beginSpaceChaseRace",
  "beginSpaceChaseCaught", "beginSpaceChaseRescue", "releaseSpaceChaseKnot",
  "finishSpaceChaseVictory", "updateSpaceChase"
];
const chaseSource = chaseFunctionNames.map(name => extractFunction(game, name)).join("\n");
assert.doesNotMatch(chaseSource, /setTimeout|setInterval/,
  "RAF state progress avoids stale timers after map, resize, or page lifecycle changes");
assert.doesNotMatch(chaseSource, /worldX\s*=|driving\s*=|pending\s*=/,
  "the chase must not take ownership of the train journey state");
assert.doesNotMatch(chaseSource, /addScore|stageMiss|totalStars/,
  "the no-fail finale must not mutate quiz scoring before completeCurrentStage");
assert.match(extractFunction(game, "spaceChaseRuntimeActive"), /!document\.hidden/);
assert.match(extractFunction(game, "spaceChaseRuntimeActive"), /!gameSettingsMenuIsOpen\(\)/);
assert.match(extractFunction(game, "spaceChaseRuntimeActive"), /spaceLandscapePlayable\(\)/);
assertNoChildFacingKanji(chaseSource, "Space chase");

const constantsStart = game.indexOf("const SPACE_CHASE_VIEWBOX_WIDTH");
const constantsEnd = game.indexOf("\nlet spaceRepairOptions", constantsStart);
assert.ok(constantsStart > 0 && constantsEnd > constantsStart);
const chaseConstants = game.slice(constantsStart, constantsEnd);

function fakeClassList() {
  const values = new Set();
  return {
    add(value) { values.add(value); },
    remove(value) { values.delete(value); },
    contains(value) { return values.has(value); },
  };
}

const knotButtons = [0, 1, 2].map(index => ({
  dataset: { spaceChaseKnot: String(index) },
  disabled: true,
  classList: fakeClassList(),
  focus() {},
}));
const choiceButtons = [0, 1].map(() => ({ focus() {} }));
const sandbox = {
  FAST: 1,
  window: { __PONO_TIER_LOCKED__: false, innerWidth: 844, innerHeight: 390 },
  document: { hidden: false },
  playing: true,
  stg: 5,
  settingsOpen: false,
  spaceChaseLayer: { hidden: false },
  spaceChaseChoiceButtons: choiceButtons,
  spaceChaseKnotButtons: knotButtons,
  spaceChaseBoostItems: [],
  spaceChaseRescueGuide: { textContent: "" },
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  isSpaceStage: () => true,
  spaceLandscapePlayable: () => sandbox.window.innerWidth >= sandbox.window.innerHeight,
  gameSettingsMenuIsOpen: () => sandbox.settingsOpen,
  futureReducedMotion: () => false,
  ensureAC() {},
  setSpaceChaseGuide(message) { sandbox.guide = message; },
  updateSpaceChaseRouteChoiceControls() {},
  updateSpaceChaseVisual() { sandbox.visualWrites += 1; },
  markSpaceChaseRoute(edgeId, kind) { sandbox.marked.push([edgeId, kind]); },
  showStamp() {},
  tone() {},
  confetti() {},
  announce() {},
  origin: stage => stage * 1000,
  clearSpaceChaseEncounter() { sandbox.clearCalls += 1; sandbox.spaceChaseLayer.hidden = true; },
  completeCurrentStage(value) { sandbox.completeCalls.push(value); },
  _nowMs: () => sandbox.clock,
  guide: "",
  marked: [],
  visualWrites: 0,
  clearCalls: 0,
  completeCalls: [],
  clock: 0,
  Math,
  Number,
};
vm.createContext(sandbox);
vm.runInContext(`
${chaseConstants}
let spaceChaseState=createSpaceChaseState(),spaceChaseDefeated=false;
const spaceChaseRouteMetrics=new Map();
${chaseSource}
ensureSpaceChaseRouteMetrics();
function routeLength(choices){
  let edgeId="launch",total=0,branchIndex=0,guard=0;
  while(edgeId&&guard++<20){
    const metric=spaceChaseRouteMetrics.get(edgeId);total+=metric.length;
    const edge=metric.edge;
    if(edge.nextBranch!==undefined){edgeId=SPACE_CHASE_BRANCHES[edge.nextBranch].choices[choices[branchIndex++]].edge;}
    else edgeId=edge.next||"";
  }
  return total;
}
function simulateRocket(choices){
  const saved=spaceChaseState;spaceChaseState=createSpaceChaseState();spaceChaseState.phase="race";spaceChaseState.playerChoices=choices.slice();
  const racer=createSpaceChaseRacer("rocket");spaceChaseState.rocket=racer;advanceSpaceChaseRacer(racer,10000);
  const result={finished:racer.finished,branches:racer.completedBranches,boosts:spaceChaseState.collectedBoosts.size,charges:spaceChaseState.boostCharges,choices:spaceChaseState.playerChoices.slice()};spaceChaseState=saved;return result;
}
spaceChaseState.phase="intro";spaceChaseState.rocket=createSpaceChaseRacer("rocket");spaceChaseState.comet=createSpaceChaseRacer("comet");spaceChaseState.cometChoices=SPACE_CHASE_COMET_PLANS[0].slice();advanceSpaceChaseRacer(spaceChaseState.comet,SPACE_CHASE_START_LEAD);
this.getState=()=>spaceChaseState;this.getDefeated=()=>spaceChaseDefeated;this.getBranches=()=>SPACE_CHASE_BRANCHES;this.getSpeeds=()=>[SPACE_CHASE_COMET_SPEED,SPACE_CHASE_ROCKET_SPEED,SPACE_CHASE_CHOICE_SPEED,SPACE_CHASE_BOOST_SPEED];this.getEdgeLength=edgeId=>spaceChaseRouteMetrics.get(edgeId).length;this.routeLength=routeLength;this.simulateRocket=simulateRocket;this.choose=chooseSpaceChaseRoute;this.boost=useSpaceChaseBoost;this.release=releaseSpaceChaseKnot;this.update=updateSpaceChase;
`, sandbox);

assert.deepEqual(Array.from(sandbox.getSpeeds()), [50, 54, 30, 86],
  "rocket is slightly faster at base speed, slows for route choice, and visibly boosts");
assert.equal(sandbox.getBranches().length, 3);
for (const branch of sandbox.getBranches()) {
  const short = branch.choices.find(choice => choice.kind === "short");
  const power = branch.choices.find(choice => choice.kind === "power");
  assert.ok(sandbox.getEdgeLength(short.edge) < sandbox.getEdgeLength(power.edge),
    `${short.edge} must remain shorter than ${power.edge}`);
}
const shortChoices = [0, 1, 1];
const powerChoices = [1, 0, 0];
assert.ok(sandbox.routeLength(shortChoices) < sandbox.routeLength(powerChoices),
  "the three shortcut choices must actually produce a shorter route");
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.simulateRocket(shortChoices))),
  { finished: true, branches: 3, boosts: 0, charges: 1, choices: shortChoices });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.simulateRocket(powerChoices))),
  { finished: true, branches: 3, boosts: 3, charges: 2, choices: powerChoices });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.simulateRocket([null, null, null]))),
  { finished: true, branches: 3, boosts: 3, charges: 2, choices: powerChoices },
  "no input must choose the safe star routes and still finish");

function advance(ms, chooseShortcuts) {
  const end = sandbox.clock + ms;
  while (sandbox.clock < end) {
    sandbox.clock = Math.min(end, sandbox.clock + 50);
    sandbox.update(sandbox.clock);
    const state = sandbox.getState();
    if (chooseShortcuts && state.phase === "race" && state.activeBranch >= 0) {
      const branch = sandbox.getBranches()[state.activeBranch];
      const shortIndex = branch.choices.findIndex(choice => choice.kind === "short");
      assert.equal(sandbox.choose(shortIndex), true);
    }
  }
}

advance(1150, true);
assert.equal(sandbox.getState().phase, "race");
const boostStartDistance = sandbox.getState().rocket.distance;
assert.equal(sandbox.boost(), true, "the starting boost charge can be used once");
assert.equal(sandbox.getState().boostCharges, 0, "boost consumes one stored star");
assert.equal(sandbox.getState().boostRemainingMs, 1250, "boost starts with its full duration");
assert.equal(sandbox.boost(), false, "a running boost cannot consume another charge");
advance(500, true);
assert.ok(Math.abs((sandbox.getState().rocket.distance - boostStartDistance) - 43) < 0.01,
  "500ms of boost must move at 86 route units per second");
assert.equal(sandbox.getState().boostRemainingMs, 750);
const choiceStartDistance = sandbox.getState().rocket.distance;
sandbox.getState().activeBranch = 1;
advance(1000, false);
assert.ok(Math.abs((sandbox.getState().rocket.distance - choiceStartDistance) - 30) < 0.01,
  "an unanswered branch must keep auto-moving slowly for a child-sized choice window");
assert.equal(sandbox.getState().boostRemainingMs, 750,
  "an already-running boost must not be wasted while the route buttons are open");
const secondBranch = sandbox.getBranches()[1];
assert.equal(sandbox.choose(secondBranch.choices.findIndex(choice => choice.kind === "short")), true);
const pausedRocket = { edgeId: sandbox.getState().rocket.edgeId, distance: sandbox.getState().rocket.distance };
const pausedComet = { edgeId: sandbox.getState().comet.edgeId, distance: sandbox.getState().comet.distance };
sandbox.settingsOpen = true;
advance(1600, true);
assert.deepEqual(
  { edgeId: sandbox.getState().rocket.edgeId, distance: sandbox.getState().rocket.distance },
  pausedRocket,
  "settings must pause rocket movement",
);
assert.deepEqual(
  { edgeId: sandbox.getState().comet.edgeId, distance: sandbox.getState().comet.distance },
  pausedComet,
  "settings must pause comet movement",
);
sandbox.settingsOpen = false;
advance(750, true);
assert.equal(sandbox.getState().boostRemainingMs, 0, "boost ends after exactly 1250ms of active play");

for (let guard = 0; guard < 2400 && sandbox.getState().phase !== "rescue"; guard += 1) advance(50, true);
assert.equal(sandbox.getState().phase, "rescue", "the no-fail route must eventually catch the comet and open rescue");
assert.equal(sandbox.spaceChaseRescueGuide.textContent, "あと みっつ");
assert.equal(sandbox.release(knotButtons[0], 0), true);
assert.equal(sandbox.release(knotButtons[0], 0), false, "the same rescue knot cannot count twice");
for (let index = 1; index < knotButtons.length; index += 1) assert.equal(sandbox.release(knotButtons[index], index), true);
assert.equal(sandbox.getState().phase, "victory");
assert.equal(sandbox.getDefeated(), true);
assert.equal(sandbox.getState().releasedKnots.size, 3);
assert.equal(sandbox.spaceChaseRescueGuide.textContent, "なかまの ところへ かえれたよ！");
advance(1300, false);
assert.deepEqual(sandbox.completeCalls, [5000]);
assert.equal(sandbox.clearCalls, 1);
advance(2000, false);
assert.deepEqual(sandbox.completeCalls, [5000], "victory must never award stage completion twice");

console.log("nazonazo space chase boss regression: ok");
