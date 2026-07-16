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

assert.match(html, /styles\.css\?v=20260716-1316/);
assert.match(html, /js\/game\.js\?v=20260716-1316/);
assert.match(sw, /const CACHE_VERSION = \d+;/);

/* Only the current two-way fork is interactive; route arithmetic is gone. */
const layerBlock = html.match(/<div id="spaceChaseLayer"[\s\S]*?<div id="seaRoundCountdown"/)?.[0] || "";
assert.match(layerBlock, /id="spaceChaseRouteMap"[^>]*viewBox="0 0 1350 720"/);
assert.equal((layerBlock.match(/data-space-chase-choice=/g) || []).length, 2);
assert.match(layerBlock, /data-space-chase-choice="0"[^>]*>[\s\S]*?data-ui-art="rocket"[\s\S]*?<strong>ちかみち<\/strong>/);
assert.match(layerBlock, /data-space-chase-choice="1"[^>]*>[\s\S]*?data-ui-art="star"[\s\S]*?<strong>スターみち<\/strong>/);
assert.doesNotMatch(layerBlock, /びょう|data-space-chase-choice="2"|space-chase-choice-arrow/);
assert.match(layerBlock, /id="spaceChaseBoostMeter"[^>]*aria-valuemax="3"[^>]*aria-valuenow="0"/);
assert.equal((layerBlock.match(/id="spaceChaseBoostMeter"[\s\S]*?<\/div>/)?.[0].match(/<i/g) || []).length, 3);
assert.match(layerBlock, /class="space-chase-star-child[^>]*data-ui-art="star"/);
assert.match(layerBlock, /space_vehicle_exploration_rocket_pono_20260713\.png/);

/* Rescue is a separate wipe-then-carry game. */
assert.equal((layerBlock.match(/data-space-chase-ribbon=/g) || []).length, 3);
assert.match(layerBlock, /id="spaceChaseRescuePlayfield"/);
assert.match(layerBlock, /id="spaceChaseRescueRing"/);
assert.match(layerBlock, /id="spaceChaseRescueStar"/);
assert.match(layerBlock, /id="spaceChaseRescueProgress"[^>]*aria-valuemax="3"/);
assert.match(layerBlock, /ひかる しっぽを みぎへ すーっ！/);
assert.doesNotMatch(layerBlock, /spaceChaseKnot|space-chase-rescue-knots|むすびめ/);

assert.match(cssRule("#spaceChaseLayer"), /position\s*:\s*fixed/);
assert.match(cssRule("\.space-chase-route-hit"), /stroke-width\s*:\s*54/);
assert.match(css, /\.space-chase-route-hit\.is-choice-active\{pointer-events:stroke;cursor:pointer\}/);
assert.match(cssRule("\.space-chase-route-choices button"), /min-height\s*:\s*58px/);
assert.match(css, /\.space-chase-board\.is-choosing \.space-chase-controls[^{}]*\{visibility:hidden\}/);
assert.match(cssRule("\.space-chase-boost-meter"), /repeat\(3,minmax\(28px,1fr\)\)/);
assert.match(cssRule("\.space-chase-comet"), /width\s*:\s*clamp\(58px,6\.25vw,85px\)/);
assert.match(css, /\.space-chase-rocket\{[^}]*width:clamp\(92px,10\.5vw,140px\)/);
assert.match(cssRule("\.space-chase-rescue-panel"), /space_nebula_sky_back_20260713\.webp/);
assert.match(cssRule("\.space-chase-rescue-ribbons button"), /min-height\s*:\s*48px/);
assert.match(cssRule("\.space-chase-rescue-star"), /touch-action\s*:\s*none/);
assert.match(cssRule("\.space-chase-rescue-ring"), /border-radius\s*:\s*50%/);
assert.match(css, /@media \(orientation:landscape\) and \(max-width:559px\) and \(max-height:360px\)[\s\S]*?\.space-chase-rescue-ribbons button\{left:48%;width:40%;min-height:44px\}/);
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*?\.space-chase-rescue-comet,[\s\S]*?animation:none!important/);
assert.match(css, /body\.space-chase-active #veh[\s\S]*?visibility:hidden!important/);

/* Existing stage integration and the one-shot clear latch remain intact. */
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
assert.match(showChase, /advanceSpaceChaseRacer\(spaceChaseState\.comet,SPACE_CHASE_START_LEAD\)/);
assert.match(updateChase, /spaceChaseState\.completionCommitted=true;const stageOrigin=origin\(stg\);clearSpaceChaseEncounter\(\);completeCurrentStage\(stageOrigin\)/);

const coreFunctionNames = [
  "spaceChaseRuntimeActive", "spaceChaseEdgeSegments", "spaceChaseCurvePoint",
  "spaceChaseEdgePathData", "spaceChaseBoostPositions", "spaceChaseYPercent",
  "ensureSpaceChaseRouteMetrics", "spaceChaseChoiceMetrics", "spaceChasePointAtDistance",
  "prepareSpaceChaseRouteMap", "collectSpaceChaseBoost", "nextSpaceChaseEdge",
  "advanceSpaceChaseRacer", "promptSpaceChaseBranch", "chooseSpaceChaseRoute",
  "spaceChaseBoostPlayable", "useSpaceChaseBoost", "spaceChaseCameraLeft",
  "updateSpaceChaseVisual", "beginSpaceChaseRace", "beginSpaceChaseCaught",
  "beginSpaceChaseRescue", "clearSpaceChaseRibbon", "spaceChaseRescueSwipeThreshold",
  "moveSpaceChaseRescuePointer", "finishSpaceChaseRescuePointer",
  "cancelSpaceChaseRescuePointer", "finishSpaceChaseVictory", "updateSpaceChase"
];
const allChaseSource = coreFunctionNames.map(name => extractFunction(game, name)).join("\n");
assert.doesNotMatch(allChaseSource, /setTimeout|setInterval/);
assert.doesNotMatch(allChaseSource, /addScore|stageMiss|totalStars/);
assert.doesNotMatch(allChaseSource, /びょう/);
assert.match(extractFunction(game, "prepareSpaceChaseRouteMap"), /space-chase-route-hit/);
assert.match(extractFunction(game, "prepareSpaceChaseRouteMap"), /bindTap\(hit,/);
assert.match(extractFunction(game, "spaceChaseRuntimeActive"), /!document\.hidden/);
assert.match(extractFunction(game, "spaceChaseRuntimeActive"), /!gameSettingsMenuIsOpen\(\)/);
assert.match(extractFunction(game, "updateSpaceChase"), /SPACE_CHASE_AUTO_BOOST_MS/);
assert.match(extractFunction(game, "updateSpaceChase"), /rocket\.distance>comet\.distance\)rocket\.distance=comet\.distance/);
assert.match(extractFunction(game, "finishSpaceChaseRescuePointer"), /dx>=spaceChaseRescueSwipeThreshold\(\)&&dx>=Math\.abs\(dy\)\*1\.2/);
assert.match(extractFunction(game, "finishSpaceChaseRescuePointer"), /distance<=ring\.width\*\.58/);
assertNoChildFacingKanji(allChaseSource, "Space chase");

/* Audit the 3 x 2 route graph and economy. */
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
  "this.routeData={world:SPACE_CHASE_WORLD_WIDTH,view:SPACE_CHASE_VIEWBOX_WIDTH,top:SPACE_CHASE_VIEWBOX_TOP,height:SPACE_CHASE_VIEWBOX_HEIGHT,startLead:SPACE_CHASE_START_LEAD,catchDistance:SPACE_CHASE_CATCH_DISTANCE,cometSpeed:SPACE_CHASE_COMET_SPEED,rocketSpeed:SPACE_CHASE_ROCKET_SPEED,choiceSpeed:SPACE_CHASE_CHOICE_SPEED,boostSpeed:SPACE_CHASE_BOOST_SPEED,boostMs:SPACE_CHASE_BOOST_MS,autoBoost:SPACE_CHASE_AUTO_BOOST_MS,promptDistance:SPACE_CHASE_BRANCH_PROMPT_DISTANCE,edges:SPACE_CHASE_ROUTE_EDGES,junctions:SPACE_CHASE_JUNCTIONS,plans:SPACE_CHASE_COMET_PLANS};",
  "this.curvePoint=spaceChaseCurvePoint;this.boostPositions=spaceChaseBoostPositions;"
].join("\n"), dataSandbox);

const routeData = dataSandbox.routeData;
const edges = routeData.edges;
const junctions = routeData.junctions;
assert.deepEqual([routeData.world, routeData.view, routeData.top, routeData.height], [6000, 1350, 0, 720]);
assert.deepEqual([routeData.cometSpeed, routeData.rocketSpeed, routeData.choiceSpeed, routeData.boostSpeed, routeData.boostMs, routeData.autoBoost], [100, 112, 38, 355, 400, 2500]);
assert.equal(routeData.startLead, 336);
assert.equal(routeData.catchDistance, 42);
assert.equal(Object.keys(edges).length, 10);
assert.deepEqual(Object.keys(junctions), ["J0", "J1", "J2"]);
assert.ok(Object.values(junctions).every(junction => junction.choices.length === 2));
assert.deepEqual(JSON.parse(JSON.stringify(routeData.plans)), [{ J0: 0, J1: 0, J2: 0 }]);

const endpoint = edge => edge.segments?.length ? edge.segments[edge.segments.length - 1].to : edge.to;
for (const [edgeId, edge] of Object.entries(edges)) {
  assert.ok(edge.travelLength > 0, edgeId + ": logical travel length missing");
  if (edge.next) {
    assert.ok(edges[edge.next], edgeId + ": missing next edge");
    assert.deepEqual(Array.from(endpoint(edge)), Array.from(edges[edge.next].from), edgeId + ": visible join jumps");
  }
  if (edge.nextJunction) {
    assert.ok(junctions[edge.nextJunction], edgeId + ": missing junction");
    assert.deepEqual(Array.from(endpoint(edge)), Array.from(junctions[edge.nextJunction].at), edgeId + ": junction jumps");
  }
}
for (const [junctionId, junction] of Object.entries(junctions)) {
  assert.equal(junction.fallbackIndex, 1, junctionId + ": no-input must choose the star route");
  const short = edges[junction.choices[0].edge];
  const scenic = edges[junction.choices[1].edge];
  assert.equal(short.travelLength, 266.3);
  assert.equal(scenic.travelLength, 350.9);
  assert.ok(scenic.travelLength / short.travelLength > 1.31);
  assert.ok(scenic.travelLength / short.travelLength < 1.32);
  assert.deepEqual(Array.from(dataSandbox.boostPositions(short)), []);
  assert.deepEqual(Array.from(dataSandbox.boostPositions(scenic)), [0.2, 0.5, 0.8]);
}

function sampledVisualLength(edge) {
  let previous = dataSandbox.curvePoint(edge, 0);
  let length = 0;
  for (let index = 1; index <= 1200; index += 1) {
    const point = dataSandbox.curvePoint(edge, index / 1200);
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return length;
}
for (const [edgeId, edge] of Object.entries(edges)) {
  const visualScale = sampledVisualLength(edge) / edge.travelLength;
  assert.ok(visualScale >= 1.995 && visualScale <= 2.005,
    edgeId + ": on-screen speed scale drifted to " + visualScale);
}
for (const junction of Object.values(junctions)) {
  const short = edges[junction.choices[0].edge];
  const scenic = edges[junction.choices[1].edge];
  const logicalRatio = scenic.travelLength / short.travelLength;
  const visualRatio = sampledVisualLength(scenic) / sampledVisualLength(short);
  assert.ok(Math.abs(logicalRatio - visualRatio) <= 0.005);
}

const routes = [];
function enumerate(edgeId, choices, logicalLength, stars) {
  const edge = edges[edgeId];
  const nextLength = logicalLength + edge.travelLength;
  const nextStars = stars + dataSandbox.boostPositions(edge).length;
  if (edge.finish) { routes.push({ choices, logicalLength: nextLength, stars: nextStars }); return; }
  if (edge.next) { enumerate(edge.next, choices, nextLength, nextStars); return; }
  const junction = junctions[edge.nextJunction];
  junction.choices.forEach((choice, index) => enumerate(
    choice.edge,
    Object.assign({}, choices, { [edge.nextJunction]: index }),
    nextLength,
    nextStars
  ));
}
enumerate("launch", {}, 0, 0);
assert.equal(routes.length, 8);
assert.equal(new Set(routes.map(route => JSON.stringify(route.choices))).size, 8);
for (const route of routes) {
  const scenicCount = Object.values(route.choices).filter(value => value === 1).length;
  assert.equal(route.stars, scenicCount * 3);
  assert.ok(Math.abs(route.logicalLength - (3052.6 + scenicCount * 84.6)) <= 0.001);
}
assert.ok(6000 / 1350 > 4.4);

/* Run the real race state machine for all eight route orders. */
const runtimeSandbox = {
  FAST: 1,
  window: { __PONO_TIER_LOCKED__: false, innerWidth: 844, innerHeight: 390 },
  document: { hidden: false },
  playing: true,
  spaceChaseLayer: { hidden: false },
  spaceChaseChoiceButtons: [{ hidden: false, focus() {} }, { hidden: false, focus() {} }],
  spaceChaseBoostItems: [],
  settingsOpen: false,
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  isSpaceStage: () => true,
  spaceLandscapePlayable: () => true,
  gameSettingsMenuIsOpen: () => runtimeSandbox.settingsOpen,
  futureReducedMotion: () => false,
  setSpaceChaseGuide() {}, announce() {}, tone() {}, showStamp() {}, ensureAC() {},
  updateSpaceChaseVisual() {}, updateSpaceChaseRouteChoiceControls() {}, markSpaceChaseRoute() {},
  beginSpaceChaseRescue() {}, origin: value => value, clearSpaceChaseEncounter() {},
  completeCurrentStage() {}, _nowMs: () => 0, stg: 5,
  Math, Number, Object, Set, Map, Infinity,
};
vm.createContext(runtimeSandbox);
const runtimeFunctions = [
  "spaceChaseRuntimeActive", "spaceChaseEdgeSegments", "spaceChaseCurvePoint",
  "spaceChaseBoostPositions", "ensureSpaceChaseRouteMetrics", "spaceChasePointAtDistance",
  "spaceChaseRacerPoint", "collectSpaceChaseBoost", "nextSpaceChaseEdge",
  "advanceSpaceChaseRacer", "promptSpaceChaseBranch", "chooseSpaceChaseRoute",
  "spaceChaseBoostPlayable", "useSpaceChaseBoost", "beginSpaceChaseRace",
  "beginSpaceChaseCaught", "updateSpaceChase"
];
vm.runInContext([
  chaseConstants,
  "let spaceChaseState=createSpaceChaseState(),spaceChaseDefeated=false;",
  "const spaceChaseRouteMetrics=new Map();",
  runtimeFunctions.map(name => extractFunction(game, name)).join("\n"),
  "ensureSpaceChaseRouteMetrics();",
  "function resetSimulation(){spaceChaseLayer.hidden=false;spaceChaseState=createSpaceChaseState();spaceChaseState.phase='intro';spaceChaseState.rocket=createSpaceChaseRacer('rocket');spaceChaseState.comet=createSpaceChaseRacer('comet');spaceChaseState.cometChoices=Object.assign(Object.create(null),SPACE_CHASE_COMET_PLANS[0]);advanceSpaceChaseRacer(spaceChaseState.comet,SPACE_CHASE_START_LEAD);}",
  "function simulate(plan,fallback){resetSimulation();let now=0,boostUses=0,minVisualLead=Infinity,maxVisualLead=-Infinity,guard=0;while(spaceChaseState.phase!=='caught'&&guard++<1000){const beforeCharges=spaceChaseState.boostCharges,beforeBoost=spaceChaseState.boostRemainingMs;now+=50;updateSpaceChase(now);if(spaceChaseState.phase==='race'&&spaceChaseState.activeJunction&&!fallback)chooseSpaceChaseRoute(plan[spaceChaseState.activeJunction]);if(beforeBoost<=0&&spaceChaseState.boostRemainingMs>0&&spaceChaseState.boostCharges<beforeCharges)boostUses++;if(spaceChaseState.phase==='race'){const rp=spaceChaseRacerPoint(spaceChaseState.rocket),cp=spaceChaseRacerPoint(spaceChaseState.comet),visualLead=cp.x-rp.x;minVisualLead=Math.min(minVisualLead,visualLead);maxVisualLead=Math.max(maxVisualLead,visualLead);}}return {phase:spaceChaseState.phase,raceElapsedMs:spaceChaseState.raceElapsedMs,choices:Object.assign({},spaceChaseState.playerChoices),stars:spaceChaseState.collectedBoosts.size,fuel:spaceChaseState.starFuel,charges:spaceChaseState.boostCharges,boostUses,minVisualLead,maxVisualLead,gap:spaceChaseState.comet.distance-spaceChaseState.rocket.distance,cometEdge:spaceChaseState.comet.edgeId,rocketEdge:spaceChaseState.rocket.edgeId,cometFinished:spaceChaseState.comet.finished,rocketFinished:spaceChaseState.rocket.finished};}",
  "function slowChoiceProbe(){resetSimulation();let now=0,guard=0;while(!spaceChaseState.activeJunction&&guard++<300){now+=50;updateSpaceChase(now);}const junction=spaceChaseState.activeJunction,started=spaceChaseState.raceElapsedMs;while(spaceChaseState.activeJunction&&spaceChaseState.raceElapsedMs-started<5500&&guard++<500){now+=50;updateSpaceChase(now);}const stillActive=spaceChaseState.activeJunction===junction,selected=stillActive?chooseSpaceChaseRoute(0):false;return {junction,waited:spaceChaseState.raceElapsedMs-started,stillActive,selected,choice:spaceChaseState.playerChoices[junction]};}",
  "function boostProbe(){resetSimulation();spaceChaseState.phase='race';spaceChaseState.frameAt=50;spaceChaseState.rocket={kind:'rocket',edgeId:'finish',distance:300,finished:false,progress:3,visitedJunctions:new Set()};spaceChaseState.comet={kind:'comet',edgeId:'finish',distance:636,finished:false,progress:3,visitedJunctions:new Set()};spaceChaseState.boostCharges=2;const first=useSpaceChaseBoost(),second=useSpaceChaseBoost();let now=50;while(now<450){now+=50;updateSpaceChase(now);}return {first,second,gap:spaceChaseState.comet.distance-spaceChaseState.rocket.distance,charges:spaceChaseState.boostCharges,remaining:spaceChaseState.boostRemainingMs};}",
  "this.api={simulate,slowChoiceProbe,boostProbe};"
].join("\n"), runtimeSandbox);

const allResults = [];
for (let bits = 0; bits < 8; bits += 1) {
  const plan = { J0: bits & 1 ? 1 : 0, J1: bits & 2 ? 1 : 0, J2: bits & 4 ? 1 : 0 };
  const result = JSON.parse(JSON.stringify(runtimeSandbox.api.simulate(plan, false)));
  const scenicCount = Object.values(plan).filter(value => value === 1).length;
  allResults.push({ scenicCount, result });
  assert.equal(result.phase, "caught", "route " + bits + " never caught");
  assert.ok(result.raceElapsedMs >= 20000 && result.raceElapsedMs <= 24600,
    "route " + bits + " catch time " + result.raceElapsedMs + "ms is outside the window");
  assert.deepEqual(result.choices, plan);
  assert.equal(result.stars, scenicCount * 3);
  assert.equal(result.boostUses, scenicCount);
  assert.equal(result.fuel, 0);
  assert.equal(result.charges, 0);
  assert.equal(result.cometEdge, "finish");
  assert.equal(result.rocketEdge, "finish");
  assert.equal(result.cometFinished, false);
  assert.equal(result.rocketFinished, false);
  assert.ok(result.gap >= 0 && result.gap <= 42.01);
  assert.ok(result.minVisualLead >= -1);
  assert.ok(result.maxVisualLead <= 1050, "route " + bits + " leaves the chase view: " + result.maxVisualLead);
}
const expectedByScenic = [24500, 23450, 22400, 21350];
for (let scenicCount = 0; scenicCount <= 3; scenicCount += 1) {
  const times = allResults.filter(entry => entry.scenicCount === scenicCount).map(entry => entry.result.raceElapsedMs);
  assert.ok(times.every(time => Math.abs(time - expectedByScenic[scenicCount]) <= 100),
    "scenic count " + scenicCount + " timing drifted: " + times.join(","));
  assert.ok(Math.max(...times) - Math.min(...times) <= 50);
}
const fallback = JSON.parse(JSON.stringify(runtimeSandbox.api.simulate({}, true)));
assert.deepEqual(fallback.choices, { J0: 1, J1: 1, J2: 1 });
assert.equal(fallback.phase, "caught");
assert.equal(fallback.boostUses, 3);
assert.ok(Math.abs(fallback.raceElapsedMs - 39500) <= 100);

const slowChoice = JSON.parse(JSON.stringify(runtimeSandbox.api.slowChoiceProbe()));
assert.equal(slowChoice.junction, "J0");
assert.equal(slowChoice.waited, 5500);
assert.equal(slowChoice.stillActive, true);
assert.equal(slowChoice.selected, true);
assert.equal(slowChoice.choice, 0);

const boostProbe = JSON.parse(JSON.stringify(runtimeSandbox.api.boostProbe()));
assert.equal(boostProbe.first, true);
assert.equal(boostProbe.second, false);
assert.equal(boostProbe.charges, 1);
assert.ok(Math.abs(boostProbe.gap - 234) <= 0.2);
assert.equal(boostProbe.remaining, 0);

/* Run the real rescue thresholds and transitions against 320 x 180 geometry. */
function fakeClassList() {
  const values = new Set();
  return {
    add(...names) { names.forEach(name => values.add(name)); },
    remove(...names) { names.forEach(name => values.delete(name)); },
    toggle(name, force) {
      const next = force === undefined ? !values.has(name) : !!force;
      if (next) values.add(name); else values.delete(name);
      return next;
    },
    contains(name) { return values.has(name); },
  };
}
function fakeStyle() {
  const values = new Map();
  return {
    setProperty(name, value) { values.set(name, String(value)); },
    removeProperty(name) { values.delete(name); },
    getPropertyValue(name) { return values.get(name) || ""; },
  };
}
function fakeButton(dataset) {
  return {
    dataset: dataset || {}, disabled: true, classList: fakeClassList(), style: fakeStyle(),
    focusCalls: 0, focus() { this.focusCalls += 1; },
    setPointerCapture() {}, releasePointerCapture() {},
  };
}
const ribbonButtons = [0, 1, 2].map(index => fakeButton({ spaceChaseRibbon: String(index) }));
const rescueStar = fakeButton();
rescueStar.getBoundingClientRect = () => {
  const x = parseFloat(rescueStar.style.getPropertyValue("--rescue-star-x")) || 0;
  const y = parseFloat(rescueStar.style.getPropertyValue("--rescue-star-y")) || 0;
  return { left: 180 + x, top: 80 + y, width: 40, height: 40, right: 220 + x, bottom: 120 + y };
};
const rescueSandbox = {
  spaceChaseRibbonButtons: ribbonButtons,
  spaceChaseRescueStar: rescueStar,
  spaceChaseRescueRing: { getBoundingClientRect: () => ({ left: 70, top: 70, width: 60, height: 60, right: 130, bottom: 130 }) },
  fieldWidth: 320,
  spaceChaseRescuePlayfield: { getBoundingClientRect: () => ({ left: 0, top: 0, width: rescueSandbox.fieldWidth, height: 180, right: rescueSandbox.fieldWidth, bottom: 180 }) },
  spaceChaseRescueTitle: { textContent: "" },
  spaceChaseRescueGuide: { textContent: "" },
  spaceChaseDefeated: false,
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  spaceChaseRuntimeActive: () => true,
  ensureAC() {}, tone() {}, showStamp() {}, announce() {}, setSpaceChaseGuide() {}, updateSpaceChaseVisual() {},
  confettiCalls: 0, confetti() { rescueSandbox.confettiCalls += 1; },
  Math, Number, Object, Set, Map,
};
vm.createContext(rescueSandbox);
vm.runInContext([
  chaseConstants,
  "let spaceChaseState=createSpaceChaseState();",
  [
    "resetSpaceChaseRescueStar", "cancelSpaceChaseRescuePointer", "clearSpaceChaseRibbon",
    "spaceChaseRescueSwipeThreshold", "moveSpaceChaseRescuePointer",
    "finishSpaceChaseRescuePointer", "finishSpaceChaseVictory"
  ].map(name => extractFunction(game, name)).join("\n"),
  "function resetRescue(){spaceChaseState=createSpaceChaseState();spaceChaseState.phase='rescue';spaceChaseState.rescueMode='wipe';spaceChaseDefeated=false;spaceChaseRibbonButtons.forEach((button,index)=>{button.disabled=index!==0;button.classList.remove('is-cleared');button.style.removeProperty('--rescue-wipe');});spaceChaseRescueStar.disabled=true;spaceChaseRescueStar.classList.remove('is-rescued');resetSpaceChaseRescueStar();}",
  "function arm(target,kind,x,y){spaceChaseState.rescuePointerId=1;spaceChaseState.rescuePointerKind=kind;spaceChaseState.rescuePointerTarget=target;spaceChaseState.rescueStartX=spaceChaseState.rescueLastX=x;spaceChaseState.rescueStartY=spaceChaseState.rescueLastY=y;spaceChaseState.rescueStarX=0;spaceChaseState.rescueStarY=0;if(kind==='star'){const rect=spaceChaseRescueStar.getBoundingClientRect();spaceChaseState.rescueStarBaseLeft=rect.left;spaceChaseState.rescueStarBaseRight=rect.right;spaceChaseState.rescueStarBaseTop=rect.top;spaceChaseState.rescueStarBaseBottom=rect.bottom;}}",
  "function ribbonGesture(index,dx,dy,cancelled){const button=spaceChaseRibbonButtons[index];arm(button,'ribbon',0,0);finishSpaceChaseRescuePointer({pointerId:1,clientX:dx,clientY:dy,preventDefault(){}},!!cancelled);return {count:spaceChaseState.clearedRibbons.size,mode:spaceChaseState.rescueMode};}",
  "function prepareCarry(){resetRescue();spaceChaseRibbonButtons.forEach((button,index)=>clearSpaceChaseRibbon(index));}",
  "function starMoveSequence(deltas){resetRescue();spaceChaseState.rescueMode='carry';spaceChaseRescueStar.disabled=false;arm(spaceChaseRescueStar,'star',200,100);deltas.forEach(dx=>moveSpaceChaseRescuePointer({pointerId:1,clientX:200+dx,clientY:100,preventDefault(){}}));return spaceChaseRescueStar.style.getPropertyValue('--rescue-star-x');}",
  "function starGesture(dx,dy,cancelled){arm(spaceChaseRescueStar,'star',200,100);finishSpaceChaseRescuePointer({pointerId:1,clientX:200+dx,clientY:100+dy,preventDefault(){}},!!cancelled);return {phase:spaceChaseState.phase,defeated:spaceChaseDefeated};}",
  "this.api={resetRescue,ribbonGesture,prepareCarry,starMoveSequence,starGesture,threshold:spaceChaseRescueSwipeThreshold,state:()=>({count:spaceChaseState.clearedRibbons.size,mode:spaceChaseState.rescueMode,phase:spaceChaseState.phase})};"
].join("\n"), rescueSandbox);

rescueSandbox.api.resetRescue();
assert.equal(rescueSandbox.api.threshold(), 38.4);
rescueSandbox.fieldWidth = 844;
assert.equal(rescueSandbox.api.threshold(), 72);
rescueSandbox.fieldWidth = 320;
for (const gesture of [{ dx: 37, dy: 0 }, { dx: 50, dy: 45 }, { dx: -60, dy: 0 }]) {
  rescueSandbox.api.resetRescue();
  assert.equal(rescueSandbox.api.ribbonGesture(0, gesture.dx, gesture.dy, false).count, 0);
}
rescueSandbox.api.resetRescue();
assert.equal(rescueSandbox.api.ribbonGesture(0, 50, 20, false).count, 1);
rescueSandbox.api.resetRescue();
assert.equal(rescueSandbox.api.ribbonGesture(0, 8, 5, false).count, 1);
rescueSandbox.api.resetRescue();
assert.equal(rescueSandbox.api.ribbonGesture(0, 60, 0, true).count, 0);

rescueSandbox.api.prepareCarry();
assert.deepEqual(JSON.parse(JSON.stringify(rescueSandbox.api.state())), { count: 3, mode: "carry", phase: "rescue" });
assert.equal(rescueStar.disabled, false);
assert.ok(rescueStar.focusCalls > 0);
assert.equal(rescueSandbox.api.starMoveSequence([40, 80, 120]), "100.0px");
rescueSandbox.api.prepareCarry();

let starResult = rescueSandbox.api.starGesture(-40, 0, false);
assert.equal(starResult.phase, "rescue");
assert.equal(rescueStar.style.getPropertyValue("--rescue-star-x"), "");
starResult = rescueSandbox.api.starGesture(-100, 0, true);
assert.equal(starResult.phase, "rescue");
starResult = rescueSandbox.api.starGesture(-100, 0, false);
assert.equal(starResult.phase, "victory");
assert.equal(starResult.defeated, true);
assert.equal(rescueSandbox.confettiCalls, 1);

rescueSandbox.api.prepareCarry();
starResult = rescueSandbox.api.starGesture(0, 0, false);
assert.equal(starResult.phase, "victory");

/* Settings, visibility, resize, and pagehide cancel partial gestures. */
assert.match(extractFunction(game, "setGameSettingsOpen"), /if\(next\)cancelSpaceChaseRescuePointer\(true\)/);
assert.match(game, /document\.hidden\)\{[\s\S]*?cancelSpaceChaseRescuePointer\(true\)/);
assert.match(game, /window\.addEventListener\("resize",\(\)=>\{spaceChaseState\.frameAt=0;cancelSpaceChaseRescuePointer\(true\)/);
assert.match(game, /window\.addEventListener\("pagehide",\(\)=>\{spaceChaseState\.frameAt=0;cancelSpaceChaseRescuePointer\(true\)/);

console.log("nazonazo space visible-chase and rescue regression checks passed");
