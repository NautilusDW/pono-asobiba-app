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

assert.match(html, /styles\.css\?v=20260716-1314/);
assert.match(html, /js\/game\.js\?v=20260716-1314/);
assert.match(sw, /v2207: なぞなぞトレイン宇宙面の最終追跡で、彗星を最短の逃走ルートへ固定/);
assert.match(sw, /const CACHE_VERSION = 2207;/);

/* The finale now exposes one pulled-back network, not three repeated binary forks. */
const layerBlock = html.match(/<div id="spaceChaseLayer"[\s\S]*?<div id="seaRoundCountdown"/)?.[0] || "";
assert.match(layerBlock, /role="group" aria-label="うちゅう おいかけっこ" hidden/);
assert.match(layerBlock, /id="spaceChaseRouteMap"[^>]*viewBox="0 -70 1600 1200"/);
assert.match(layerBlock, /id="spaceChaseRoutePaths"/);
assert.match(layerBlock, /id="spaceChaseJunctions"/);
assert.match(layerBlock, /id="spaceChaseBoostItems"/);
assert.equal((layerBlock.match(/class="space-chase-boost-item"/g) || []).length, 0,
  "the many route stars must be generated from edge data instead of fixed HTML");
assert.equal((layerBlock.match(/data-space-chase-choice=/g) || []).length, 3);
assert.equal((layerBlock.match(/data-space-chase-knot=/g) || []).length, 3);
assert.match(layerBlock, /space-chase-choice-arrow is-middle/);
assert.match(layerBlock, /class="space-chase-star-child[^>]*data-ui-art="star"/);
assert.match(layerBlock, /id="spaceChaseBoostMeter"[^>]*aria-valuemax="4"[^>]*aria-valuenow="1"/);
assert.equal((layerBlock.match(/id="spaceChaseBoostMeter"[\s\S]*?<\/div>/)?.[0].match(/<i/g) || []).length, 4);
assert.match(layerBlock, /class="space-chase-rounds"[^>]*aria-valuemax="5"/);
assert.equal((layerBlock.match(/class="space-chase-rounds"[\s\S]*?<\/div>/)?.[0].match(/<i/g) || []).length, 5);
assert.match(layerBlock, /id="spaceChaseRescuePanel"[^>]*aria-hidden="true"[^>]*hidden/);
assert.doesNotMatch(layerBlock, /spaceChaseTapMeter|space-chase-tap-meter/,
  "the old four-tap loop must not survive inside the route chase");

const layerCss = cssRule("#spaceChaseLayer");
assert.match(layerCss, /position\s*:\s*fixed/);
assert.match(layerCss, /inset\s*:\s*0/);
assert.match(layerCss, /z-index\s*:\s*18/);
assert.match(css, /#spaceChaseBoostButton\{appearance:none[^}]*min-height:78px[^}]*touch-action:manipulation/);
assert.match(cssRule("\.space-chase-route-choices button"), /min-height\s*:\s*72px/);
assert.match(cssRule("\.space-chase-rescue-knots button"), /width\s*:\s*clamp\(64px/);
assert.match(cssRule("\.space-chase-comet"), /width\s*:\s*clamp\(58px,6\.25vw,85px\)/,
  "the pulled-back map must not shrink the comet character");
assert.match(css, /\.space-chase-rocket\{left:[^}]*width:clamp\(92px,10\.5vw,140px\)/,
  "the pulled-back map must not shrink the rocket character");
assert.match(css, /\.space-chase-route-edge\.is-choice-option-0\{[^}]*stroke:#77eff4/);
assert.match(css, /\.space-chase-route-edge\.is-choice-option-1\{[^}]*stroke:#fff08a/);
assert.match(css, /\.space-chase-route-edge\.is-choice-option-2\{[^}]*stroke:#ff92cf/);
assert.match(css, /\.space-chase-route-edge\.is-comet-route\{[^}]*stroke:#db9df2/);
assert.match(css, /\.space-chase-route-edge\.is-rocket-route\{[^}]*stroke:#fff08a/);
assert.match(css, /\.space-chase-controls\.is-choosing\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
assert.match(css, /\.space-chase-controls\.is-choosing \.space-chase-readout,\.space-chase-controls\.is-choosing #spaceChaseBoostButton\{display:none\}/);
assert.match(css, /\.space-chase-route-choices\{[^}]*repeat\(var\(--space-choice-count,2\),minmax\(0,1fr\)\)/);
assert.match(css, /\.space-chase-board\.is-victory \.space-chase-star-child\{[^}]*left:-94%/);
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*?\.space-chase-camera,[\s\S]*?animation:none!important/);
assert.match(css, /\.space-chase-board\.is-boosting \.space-chase-rocket\{transform:translate\(-50%,-50%\) scale\(1\.05\) rotate\(var\(--space-chase-rocket-angle\)\)!important\}/);
assert.match(css, /@media \(orientation:portrait\)[\s\S]*?#rotateHint\{display:flex\}/);
assert.match(css, /body\.space-chase-active #veh[\s\S]*?visibility:hidden!important/);
assert.match(css, /body\.space-chase-active #stamp\{z-index:23\}/);
assert.match(css, /@media \(orientation:landscape\) and \(max-width:559px\) and \(max-height:360px\)[\s\S]*?\.space-chase-controls\.is-choosing\{grid-template-columns:minmax\(0,1fr\);padding-inline:3px\}/,
  "small admin frames must give all available width to the two or three route buttons");
assert.match(css, /@media \(orientation:landscape\) and \(max-width:559px\) and \(max-height:360px\)[\s\S]*?\.space-chase-hud\{display:none\}\.space-chase-route-map\{inset:16% 0 auto;height:38%\}/,
  "tiny admin frames must remap the route into the strip above the controls without shrinking either character");
assert.match(css, /\.space-chase-boost-item\{top:var\(--space-chase-item-y-compact,var\(--space-chase-item-y,0%\)\)\}/);
assert.match(css, /\.space-chase-board\.is-caught \.space-chase-rocket,[^}]*top:var\(--space-chase-rocket-y\)/,
  "the compact race map must return the rocket to the normal rescue-beam position after catch");
assert.match(css, /\.space-chase-route-choices\[data-choice-count="3"\] \.space-chase-choice-arrow\{display:none\}/,
  "tiny three-way choices hide only the decorative arrows, not the labels or buttons");

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

const functionNames = [
  "spaceChaseRuntimeActive", "spaceChaseEdgeSegments", "spaceChaseCurvePoint",
  "spaceChaseEdgePathData", "spaceChaseBoostPositions", "spaceChaseYPercent", "ensureSpaceChaseRouteMetrics",
  "spaceChasePointAtDistance", "prepareSpaceChaseRouteMap", "resetSpaceChaseRouteVisuals",
  "markSpaceChaseRoute", "spaceChaseRacerPoint", "spaceChaseRacerPose",
  "collectSpaceChaseBoost", "nextSpaceChaseEdge", "advanceSpaceChaseRacer",
  "updateSpaceChaseChoiceRouteHighlights", "updateSpaceChaseRouteChoiceControls",
  "promptSpaceChaseBranch", "chooseSpaceChaseRoute", "spaceChaseBoostPlayable",
  "useSpaceChaseBoost", "beginSpaceChaseRace", "beginSpaceChaseCaught",
  "beginSpaceChaseRescue", "releaseSpaceChaseKnot", "finishSpaceChaseVictory",
  "updateSpaceChase"
];
const allChaseSource = functionNames.map(name => extractFunction(game, name)).join("\n");
assert.doesNotMatch(allChaseSource, /setTimeout|setInterval/,
  "RAF state progress avoids stale timers after map, resize, or page lifecycle changes");
assert.doesNotMatch(allChaseSource, /worldX\s*=|driving\s*=|pending\s*=/,
  "the chase must not take ownership of the train journey state");
assert.doesNotMatch(allChaseSource, /addScore|stageMiss|totalStars/,
  "the no-fail finale must not mutate quiz scoring before completeCurrentStage");
assert.doesNotMatch(allChaseSource, /waitingForComet/,
  "the rocket must never park ahead and turn the comet into the pursuer");
assert.match(extractFunction(game, "updateSpaceChase"), /catchGap>=-\.01&&catchGap<=SPACE_CHASE_CATCH_DISTANCE\+\.01/,
  "catch is valid only while the comet still has a non-negative signed lead");
assert.match(extractFunction(game, "spaceChaseRuntimeActive"), /!document\.hidden/);
assert.match(extractFunction(game, "spaceChaseRuntimeActive"), /!gameSettingsMenuIsOpen\(\)/);
assert.match(extractFunction(game, "spaceChaseRuntimeActive"), /spaceLandscapePlayable\(\)/);
assert.match(extractFunction(game, "prepareSpaceChaseRouteMap"), /vector-effect","non-scaling-stroke/);
assert.match(extractFunction(game, "prepareSpaceChaseRouteMap"), /Object\.entries\(SPACE_CHASE_JUNCTIONS\)/);
assert.match(extractFunction(game, "prepareSpaceChaseRouteMap"), /spaceChaseBoostPositions\(edge\)\.forEach/);
assert.match(extractFunction(game, "advanceSpaceChaseRacer"), /Object\.keys\(SPACE_CHASE_ROUTE_EDGES\)\.length\+4/,
  "the traversal guard must scale with the route network instead of assuming three forks");
assertNoChildFacingKanji(allChaseSource, "Space chase");

const constantsStart = game.indexOf("const SPACE_CHASE_VIEWBOX_WIDTH");
const constantsEnd = game.indexOf("\nlet spaceRepairOptions", constantsStart);
assert.ok(constantsStart > 0 && constantsEnd > constantsStart);
const chaseConstants = game.slice(constantsStart, constantsEnd);
assertNoChildFacingKanji(chaseConstants, "Space chase data");

/* Audit the real route data: connectivity, geometry, route variety, and item-rich detours. */
const dataSandbox = { clamp: (value, min, max) => Math.max(min, Math.min(max, value)) };
vm.createContext(dataSandbox);
vm.runInContext(`
${chaseConstants}
${extractFunction(game, "spaceChaseEdgeSegments")}
${extractFunction(game, "spaceChaseCurvePoint")}
${extractFunction(game, "spaceChaseBoostPositions")}
${extractFunction(game, "spaceChaseYPercent")}
this.routeData={width:SPACE_CHASE_VIEWBOX_WIDTH,top:SPACE_CHASE_VIEWBOX_TOP,height:SPACE_CHASE_VIEWBOX_HEIGHT,compactTop:SPACE_CHASE_COMPACT_TOP_PERCENT,compactHeight:SPACE_CHASE_COMPACT_HEIGHT_PERCENT,startLead:SPACE_CHASE_START_LEAD,catchDistance:SPACE_CHASE_CATCH_DISTANCE,edges:SPACE_CHASE_ROUTE_EDGES,junctions:SPACE_CHASE_JUNCTIONS,plans:SPACE_CHASE_COMET_PLANS};
this.curvePoint=spaceChaseCurvePoint;
this.boostPositions=spaceChaseBoostPositions;
this.yPercent=spaceChaseYPercent;
`, dataSandbox);

const { width, top, height, compactTop, compactHeight, startLead, catchDistance, edges, junctions, plans } = dataSandbox.routeData;
assert.equal(width, 1600);
assert.equal(top, -70);
assert.equal(height, 1200);
assert.equal(compactTop, 16);
assert.equal(compactHeight, 38);
assert.equal(Object.keys(edges).length, 26);
assert.equal(Object.keys(junctions).length, 10);
assert.equal(Object.values(junctions).filter(junction => junction.choices.length === 3).length, 4);
assert.ok(Object.values(junctions).every(junction => junction.choices.length === 2 || junction.choices.length === 3));
assert.equal(plans.length, 1, "the comet must use one readable escape line while the child explores every branch");

const endpoint = edge => edge.segments?.length ? edge.segments[edge.segments.length - 1].to : edge.to;
for (const [edgeId, edge] of Object.entries(edges)) {
  if (edge.next) {
    assert.ok(edges[edge.next], `${edgeId}: next edge ${edge.next} is missing`);
    assert.deepEqual(Array.from(endpoint(edge)), Array.from(edges[edge.next].from), `${edgeId}: next edge must join without a jump`);
  }
  if (edge.nextJunction) {
    assert.ok(junctions[edge.nextJunction], `${edgeId}: junction ${edge.nextJunction} is missing`);
    assert.deepEqual(Array.from(endpoint(edge)), Array.from(junctions[edge.nextJunction].at), `${edgeId}: junction must sit on its route endpoint`);
  }
}
for (const [junctionId, junction] of Object.entries(junctions)) {
  assert.ok(Number.isInteger(junction.fallbackIndex) && junction.choices[junction.fallbackIndex], `${junctionId}: fallback route is invalid`);
  for (const choice of junction.choices) {
    assert.ok(edges[choice.edge], `${junctionId}: choice edge ${choice.edge} is missing`);
    assert.deepEqual(Array.from(edges[choice.edge].from), Array.from(junction.at), `${junctionId}: choice edge must begin at the junction`);
    assert.match(choice.label, /みち/);
    assert.ok(["up", "middle", "down"].includes(choice.slot));
  }
}

const routeMetrics = {};
let minX = Infinity;
let maxX = -Infinity;
let minY = Infinity;
let maxY = -Infinity;
for (const [edgeId, edge] of Object.entries(edges)) {
  let previous = dataSandbox.curvePoint(edge, 0);
  let length = 0;
  for (let index = 0; index <= 192; index += 1) {
    const point = dataSandbox.curvePoint(edge, index / 192);
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
    if (index) length += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  routeMetrics[edgeId] = { length, items: dataSandbox.boostPositions(edge).length };
}
assert.ok((maxX - minX) / width >= 0.85, "the network must use at least 85% of the screen width");
assert.ok((maxY - minY) / height >= 0.54, "the pulled-back network must still span most of the unobstructed playfield height");
assert.ok((minY - top) / height >= 0.118, "the upper orbit must leave room for the comet body");
assert.ok((maxY - top) / height <= 0.67, "the lower orbit must leave room for the rocket body above the bottom control tray");
const tinyCameraTop = -0.04;
const tinyCameraScale = 1.08;
const tinyFrameHeight = 180;
const tinyUpperCenter = tinyCameraTop + (compactTop + (minY - top) / height * compactHeight) / 100 * tinyCameraScale;
const tinyLowerCenter = tinyCameraTop + (compactTop + (maxY - top) / height * compactHeight) / 100 * tinyCameraScale;
assert.ok(tinyUpperCenter - 29 / tinyFrameHeight > 0,
  "the unchanged 58px comet must remain inside a 320x180 admin frame at the uppermost curve");
assert.ok(tinyLowerCenter + (92 / 1.5 / 2) / tinyFrameHeight < (tinyFrameHeight - 69) / tinyFrameHeight,
  "the unchanged 92px rocket must remain above the tiny frame's route controls at the lowest curve");
assert.equal(Object.values(routeMetrics).reduce((sum, metric) => sum + metric.items, 0), 37);
assert.ok(Object.values(routeMetrics).filter(metric => metric.items >= 4).length >= 6,
  "several long routes must carry a visible chain of stars");

const reachableEdges = new Set();
const routes = [];
function enumerateRoutes(edgeId, stack = new Set(), route = [], length = 0, items = 0, choices = {}) {
  assert.ok(edges[edgeId], `route references missing edge ${edgeId}`);
  assert.ok(!stack.has(edgeId), `route graph cycle detected at ${edgeId}`);
  reachableEdges.add(edgeId);
  const edge = edges[edgeId];
  const nextStack = new Set(stack).add(edgeId);
  const nextRoute = route.concat(edgeId);
  const nextLength = length + routeMetrics[edgeId].length;
  const nextItems = items + routeMetrics[edgeId].items;
  if (edge.finish) {
    routes.push({ edges: nextRoute, length: nextLength, items: nextItems, choices });
    return;
  }
  if (edge.nextJunction) {
    junctions[edge.nextJunction].choices.forEach((choice, choiceIndex) => {
      enumerateRoutes(choice.edge, nextStack, nextRoute, nextLength, nextItems,
        { ...choices, [edge.nextJunction]: choiceIndex });
    });
    return;
  }
  assert.ok(edge.next, `${edgeId}: non-finish route has no exit`);
  enumerateRoutes(edge.next, nextStack, nextRoute, nextLength, nextItems, choices);
}
enumerateRoutes("launch");
assert.equal(reachableEdges.size, Object.keys(edges).length, "every configured edge must be reachable from launch");
assert.equal(routes.length, 188, "the nested two-way and three-way network must retain 188 possible routes");
const shortest = routes.reduce((best, route) => route.length < best.length ? route : best);
const longest = routes.reduce((best, route) => route.length > best.length ? route : best);
const richest = routes.reduce((best, route) => route.items > best.items ? route : best);
assert.ok(longest.length / shortest.length > 2.8, "the outer orbit must be a meaningful detour, not another near-identical fork");
assert.equal(shortest.items, 0, "the true shortcut must trade stars for distance");
assert.ok(richest.items >= 20, "an item-hunting route must cross at least twenty stars");
assert.ok(richest.length > shortest.length * 1.8, "the richest star route must visibly go the long way around");

function configuredRoute(plan) {
  const path = [];
  let edgeId = "launch";
  for (let guard = 0; guard < Object.keys(edges).length + 4; guard += 1) {
    path.push(edgeId);
    const edge = edges[edgeId];
    if (edge.finish) return path;
    if (edge.next) { edgeId = edge.next; continue; }
    const junction = junctions[edge.nextJunction];
    const choiceIndex = plan[edge.nextJunction];
    assert.ok(junction.choices[choiceIndex], `comet plan has no route at ${edge.nextJunction}`);
    edgeId = junction.choices[choiceIndex].edge;
  }
  assert.fail("comet plan did not reach the finish");
}
const cometRoute = configuredRoute(plans[0]);
assert.deepEqual(cometRoute, shortest.edges,
  "the comet must stay ahead on the direct escape line instead of taking a loop behind the rocket");
assert.ok(startLead > catchDistance * 4,
  "the chase needs a visible opening lead before the faster rocket begins closing the gap");

function fakeClassList() {
  const values = new Set();
  return {
    add(...names) { names.forEach(name => values.add(name)); },
    remove(...names) { names.forEach(name => values.delete(name)); },
    contains(name) { return values.has(name); },
    toggle(name, force) {
      const next = force === undefined ? !values.has(name) : !!force;
      if (next) values.add(name); else values.delete(name);
      return next;
    },
    values,
  };
}

function fakeChoiceButton(index) {
  const strong = { textContent: "" };
  const small = { textContent: "" };
  const arrow = { classList: fakeClassList() };
  const attributes = new Map();
  return {
    dataset: { spaceChaseChoice: String(index) },
    hidden: false,
    disabled: true,
    strong,
    small,
    arrow,
    attributes,
    focusCalls: 0,
    focus() { this.focusCalls += 1; },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    querySelector(selector) {
      if (selector === "strong") return strong;
      if (selector === "small") return small;
      if (selector === ".space-chase-choice-arrow") return arrow;
      return null;
    },
  };
}

/* Execute the real movement functions with a small fake UI. */
const choiceButtons = [0, 1, 2].map(fakeChoiceButton);
const knotButtons = [0, 1, 2].map(index => ({
  dataset: { spaceChaseKnot: String(index) },
  disabled: true,
  classList: fakeClassList(),
  focus() {},
}));
const controlsClassList = fakeClassList();
const routeChoicesStyle = {};
const routeChoices = {
  hidden: true,
  dataset: {},
  style: { setProperty(name, value) { routeChoicesStyle[name] = String(value); } },
};
const runtimeSandbox = {
  FAST: 1,
  window: { __PONO_TIER_LOCKED__: false, innerWidth: 844, innerHeight: 390 },
  document: { hidden: false },
  playing: true,
  stg: 5,
  settingsOpen: false,
  spaceChaseLayer: { hidden: false, querySelector: selector => selector === ".space-chase-controls" ? { classList: controlsClassList } : null },
  spaceChaseRouteChoices: routeChoices,
  spaceChaseChoiceButtons: choiceButtons,
  spaceChaseKnotButtons: knotButtons,
  spaceChaseBoostItems: [],
  spaceChaseRescueGuide: { textContent: "" },
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  isSpaceStage: () => true,
  spaceLandscapePlayable: () => runtimeSandbox.window.innerWidth >= runtimeSandbox.window.innerHeight,
  gameSettingsMenuIsOpen: () => runtimeSandbox.settingsOpen,
  futureReducedMotion: () => false,
  ensureAC() {},
  setSpaceChaseGuide(message) { runtimeSandbox.guide = message; },
  updateSpaceChaseVisual() { runtimeSandbox.visualWrites += 1; },
  showStamp() {},
  tone() {},
  confetti() {},
  announce() {},
  origin: stage => stage * 1000,
  clearSpaceChaseEncounter() { runtimeSandbox.clearCalls += 1; runtimeSandbox.spaceChaseLayer.hidden = true; },
  completeCurrentStage(value) { runtimeSandbox.completeCalls.push(value); },
  _nowMs: () => runtimeSandbox.clock,
  guide: "",
  visualWrites: 0,
  clearCalls: 0,
  completeCalls: [],
  clock: 0,
  Math,
  Number,
  Object,
  Set,
  Map,
};
vm.createContext(runtimeSandbox);

const runtimeFunctionNames = [
  "spaceChaseRuntimeActive", "spaceChaseEdgeSegments", "spaceChaseCurvePoint",
  "spaceChaseBoostPositions", "ensureSpaceChaseRouteMetrics", "spaceChasePointAtDistance",
  "spaceChaseRacerPoint",
  "collectSpaceChaseBoost", "nextSpaceChaseEdge", "advanceSpaceChaseRacer",
  "updateSpaceChaseChoiceRouteHighlights", "updateSpaceChaseRouteChoiceControls",
  "markSpaceChaseRoute", "promptSpaceChaseBranch", "chooseSpaceChaseRoute",
  "spaceChaseBoostPlayable", "useSpaceChaseBoost", "beginSpaceChaseRace",
  "beginSpaceChaseCaught", "beginSpaceChaseRescue", "releaseSpaceChaseKnot",
  "finishSpaceChaseVictory", "updateSpaceChase"
];
const runtimeSource = runtimeFunctionNames.map(name => extractFunction(game, name)).join("\n");
vm.runInContext(`
${chaseConstants}
let spaceChaseState=createSpaceChaseState(),spaceChaseDefeated=false;
const spaceChaseRouteMetrics=new Map(),spaceChaseRouteElements=new Map();
let spaceChaseChoiceHighlightKey="";
${runtimeSource}
Object.keys(SPACE_CHASE_ROUTE_EDGES).forEach(edgeId=>spaceChaseRouteElements.set(edgeId,{classList:{_values:new Set(),add(...names){names.forEach(name=>this._values.add(name));},remove(...names){names.forEach(name=>this._values.delete(name));},contains(name){return this._values.has(name);}}}));
ensureSpaceChaseRouteMetrics();
function resetSimulation(planIndex){
 spaceChaseLayer.hidden=false;spaceChaseDefeated=false;spaceChaseState=createSpaceChaseState();spaceChaseState.phase="intro";spaceChaseState.rocket=createSpaceChaseRacer("rocket");spaceChaseState.comet=createSpaceChaseRacer("comet");spaceChaseState.cometChoices=Object.assign(Object.create(null),SPACE_CHASE_COMET_PLANS[planIndex]);
 spaceChaseChoiceButtons.forEach(button=>{button.hidden=false;button.disabled=true;button.focusCalls=0;});spaceChaseKnotButtons.forEach(button=>{button.disabled=true;button.classList.remove("is-released");});
 advanceSpaceChaseRacer(spaceChaseState.comet,SPACE_CHASE_START_LEAD);return spaceChaseState;
}
function strategyChoice(strategy,junction){
 if(strategy==="short"){const direct=junction.choices.findIndex(choice=>choice.kind==="short");if(direct>=0)return direct;let best=0;for(let index=1;index<junction.choices.length;index++)if(spaceChaseRouteMetrics.get(junction.choices[index].edge).length<spaceChaseRouteMetrics.get(junction.choices[best].edge).length)best=index;return best;}
 if(strategy==="power"){let best=0;for(let index=1;index<junction.choices.length;index++){const candidate=spaceChaseBoostPositions(SPACE_CHASE_ROUTE_EDGES[junction.choices[index].edge]).length,current=spaceChaseBoostPositions(SPACE_CHASE_ROUTE_EDGES[junction.choices[best].edge]).length;if(candidate>current||(candidate===current&&spaceChaseRouteMetrics.get(junction.choices[index].edge).length>spaceChaseRouteMetrics.get(junction.choices[best].edge).length))best=index;}return best;}
 return -1;
}
function simulate(planIndex,strategy,playerPlan){
 resetSimulation(planIndex);let now=0,guard=0,minVisualLeadX=Infinity,aheadFrames=0,catchSnapshot=null,rocketEnteredFinishFirst=false;
 while(guard++<7000&&spaceChaseState.phase!=="rescue"){
  const phaseBefore=spaceChaseState.phase;now+=50;updateSpaceChase(now);
  if(spaceChaseState.phase==="race"){
   const rocketPoint=spaceChaseRacerPoint(spaceChaseState.rocket),cometPoint=spaceChaseRacerPoint(spaceChaseState.comet),visualLeadX=cometPoint.x-rocketPoint.x;
   minVisualLeadX=Math.min(minVisualLeadX,visualLeadX);if(visualLeadX<-.5)aheadFrames++;
   if(spaceChaseState.rocket.edgeId==="finish"&&spaceChaseState.comet.edgeId!=="finish")rocketEnteredFinishFirst=true;
  }
  if(phaseBefore==="race"&&spaceChaseState.phase==="caught")catchSnapshot={rocketEdge:spaceChaseState.rocket.edgeId,cometEdge:spaceChaseState.comet.edgeId,signedGap:spaceChaseState.comet.distance-spaceChaseState.rocket.distance};
  if(spaceChaseState.phase==="race"&&spaceChaseState.activeJunction&&strategy!=="fallback")chooseSpaceChaseRoute(playerPlan?playerPlan[spaceChaseState.activeJunction]:strategyChoice(strategy,SPACE_CHASE_JUNCTIONS[spaceChaseState.activeJunction]));
  if(spaceChaseState.phase==="race"&&spaceChaseBoostPlayable())useSpaceChaseBoost();
 }
 return {phase:spaceChaseState.phase,now,guard,visited:spaceChaseState.rocket.visitedJunctions.size,choices:Object.assign({},spaceChaseState.playerChoices),items:spaceChaseState.collectedBoosts.size,minVisualLeadX,aheadFrames,catchSnapshot,rocketEnteredFinishFirst};
}
function choiceSnapshot(junctionId){
 resetSimulation(0);spaceChaseState.phase="race";spaceChaseState.activeJunction=junctionId;updateSpaceChaseRouteChoiceControls();
 return {hidden:spaceChaseRouteChoices.hidden,count:spaceChaseRouteChoices.dataset.choiceCount,columns:spaceChaseRouteChoices.style?"":null,buttons:spaceChaseChoiceButtons.map(button=>({hidden:button.hidden,disabled:button.disabled,label:button.strong.textContent,note:button.small.textContent,up:button.arrow.classList.contains("is-up"),middle:button.arrow.classList.contains("is-middle"),down:button.arrow.classList.contains("is-down")}))};
}
function clearChoiceSnapshot(){spaceChaseState.activeJunction="";updateSpaceChaseRouteChoiceControls();return {hidden:spaceChaseRouteChoices.hidden,choosing:false};}
function prepareChoicePause(){
 resetSimulation(0);spaceChaseState.phase="race";spaceChaseState.rocket={kind:"rocket",edgeId:"j0Center",distance:0,finished:false,progress:1,visitedJunctions:new Set()};spaceChaseState.comet={kind:"comet",edgeId:"j0Center",distance:0,finished:false,progress:1,visitedJunctions:new Set()};spaceChaseState.activeJunction="JN";spaceChaseState.boostRemainingMs=750;spaceChaseState.frameAt=50;return 50;
}
function advanceFrom(now,ms){const end=now+ms;while(now<end){now=Math.min(end,now+50);updateSpaceChase(now);}return now;}
function stateSnapshot(){return {phase:spaceChaseState.phase,rocket:{edgeId:spaceChaseState.rocket.edgeId,distance:spaceChaseState.rocket.distance},comet:{edgeId:spaceChaseState.comet.edgeId,distance:spaceChaseState.comet.distance},activeJunction:spaceChaseState.activeJunction,boostCharges:spaceChaseState.boostCharges,boostRemainingMs:spaceChaseState.boostRemainingMs,released:spaceChaseState.releasedKnots.size,defeated:spaceChaseDefeated};}
this.api={
 speeds:[SPACE_CHASE_COMET_SPEED,SPACE_CHASE_ROCKET_SPEED,SPACE_CHASE_CHOICE_SPEED,SPACE_CHASE_BOOST_SPEED],
 simulate,choiceSnapshot,clearChoiceSnapshot,prepareChoicePause,advanceFrom,stateSnapshot,
 boost:useSpaceChaseBoost,release:releaseSpaceChaseKnot,choice:chooseSpaceChaseRoute,
 getState:()=>spaceChaseState,getDefeated:()=>spaceChaseDefeated
};
`, runtimeSandbox);

const [cometSpeed, rocketSpeed, choiceSpeed, boostSpeed] = Array.from(runtimeSandbox.api.speeds);
assert.ok(rocketSpeed > cometSpeed, "the rocket must remain slightly faster so it can close the opening lead");
assert.ok(boostSpeed > rocketSpeed, "boost must make the closing speed visibly stronger");
assert.ok(choiceSpeed <= cometSpeed, "both racers must slow down while route buttons are open");

const threeChoice = JSON.parse(JSON.stringify(runtimeSandbox.api.choiceSnapshot("J0")));
assert.equal(threeChoice.hidden, false);
assert.equal(threeChoice.count, "3");
assert.deepEqual(threeChoice.buttons.map(button => button.hidden), [false, false, false]);
assert.deepEqual(threeChoice.buttons.map(button => button.disabled), [false, false, false]);
assert.deepEqual(threeChoice.buttons.map(button => [button.up, button.middle, button.down]), [[true, false, false], [false, true, false], [false, false, true]]);
assert.deepEqual(threeChoice.buttons.map(button => button.note), ["スター 2こ", "ちかみち", "スター 4こ"]);
assert.equal(controlsClassList.contains("is-choosing"), true);

const twoChoice = JSON.parse(JSON.stringify(runtimeSandbox.api.choiceSnapshot("JN")));
assert.equal(twoChoice.count, "2");
assert.deepEqual(twoChoice.buttons.map(button => button.hidden), [false, false, true]);
assert.deepEqual(twoChoice.buttons.map(button => button.disabled), [false, false, true]);
runtimeSandbox.api.clearChoiceSnapshot();
assert.equal(routeChoices.hidden, true);
assert.equal(controlsClassList.contains("is-choosing"), false);

function assertCometLeads(result, label) {
  assert.equal(result.phase, "rescue", `${label}: the chase must always reach the rescue`);
  assert.ok(result.guard < 7000, `${label}: the chase must finish within the bounded RAF simulation`);
  assert.equal(result.rocketEnteredFinishFirst, false,
    `${label}: the rocket must never enter the shared finish before the comet`);
  assert.equal(result.aheadFrames, 0,
    `${label}: no race frame may draw the rocket to the right of the comet`);
  assert.ok(result.minVisualLeadX >= -0.5,
    `${label}: the comet must retain the visible lead until catch (minimum ${result.minVisualLeadX})`);
  assert.ok(result.catchSnapshot, `${label}: catch must record both racers on one shared edge`);
  assert.equal(result.catchSnapshot.rocketEdge, result.catchSnapshot.cometEdge,
    `${label}: catch cannot happen on separate branches`);
  assert.ok(result.catchSnapshot.signedGap >= -0.01 && result.catchSnapshot.signedGap <= catchDistance + 0.01,
    `${label}: catch gap must remain behind the comet, not past it`);
}

for (let planIndex = 0; planIndex < plans.length; planIndex += 1) {
  for (const strategy of ["short", "power", "fallback"]) {
    const result = JSON.parse(JSON.stringify(runtimeSandbox.api.simulate(planIndex, strategy)));
    assertCometLeads(result, `plan ${planIndex} with ${strategy} choices`);
    assert.ok(result.visited >= 5, `plan ${planIndex} with ${strategy} choices must traverse several nested junctions`);
    if (strategy === "fallback") {
      for (const [junctionId, choiceIndex] of Object.entries(result.choices)) {
        assert.equal(choiceIndex, junctions[junctionId].fallbackIndex, `${junctionId}: no input must use its safe fallback`);
      }
    }
  }
}

routes.forEach((route, routeIndex) => {
  const result = JSON.parse(JSON.stringify(runtimeSandbox.api.simulate(0, "route", route.choices)));
  assertCometLeads(result, `player route ${routeIndex + 1}/${routes.length}`);
});

let pauseClock = runtimeSandbox.api.prepareChoicePause();
assert.equal(runtimeSandbox.api.boost(), false, "boost is unavailable while route buttons are open");
pauseClock = runtimeSandbox.api.advanceFrom(pauseClock, 1000);
let pausedState = JSON.parse(JSON.stringify(runtimeSandbox.api.stateSnapshot()));
assert.ok(Math.abs(pausedState.rocket.distance - 38) < 0.01);
assert.ok(Math.abs(pausedState.comet.distance - 38) < 0.01);
assert.equal(pausedState.boostRemainingMs, 750,
  "an already-running boost must not be wasted while the child chooses a route");
const beforeSettingsPause = pausedState;
runtimeSandbox.settingsOpen = true;
pauseClock = runtimeSandbox.api.advanceFrom(pauseClock, 1600);
pausedState = JSON.parse(JSON.stringify(runtimeSandbox.api.stateSnapshot()));
assert.deepEqual(pausedState, beforeSettingsPause, "settings must pause both racers and every chase timer");
runtimeSandbox.settingsOpen = false;

const finalRun = runtimeSandbox.api.simulate(0, "short");
assert.equal(finalRun.phase, "rescue");
assert.equal(runtimeSandbox.spaceChaseRescueGuide.textContent, "あと みっつ");
assert.equal(runtimeSandbox.api.release(knotButtons[0], 0), true);
assert.equal(runtimeSandbox.api.release(knotButtons[0], 0), false, "the same rescue knot cannot count twice");
assert.equal(runtimeSandbox.api.release(knotButtons[1], 1), true);
assert.equal(runtimeSandbox.api.release(knotButtons[2], 2), true);
assert.equal(runtimeSandbox.api.stateSnapshot().phase, "victory");
assert.equal(runtimeSandbox.api.getDefeated(), true);
assert.equal(runtimeSandbox.api.stateSnapshot().released, 3);
assert.equal(runtimeSandbox.spaceChaseRescueGuide.textContent, "なかまの ところへ かえれたよ！");
runtimeSandbox.completeCalls.length = 0;
runtimeSandbox.clearCalls = 0;
runtimeSandbox.api.advanceFrom(finalRun.now, 1300);
assert.deepEqual(runtimeSandbox.completeCalls, [5000]);
assert.equal(runtimeSandbox.clearCalls, 1);
runtimeSandbox.api.advanceFrom(finalRun.now + 1300, 2000);
assert.deepEqual(runtimeSandbox.completeCalls, [5000], "victory must never award stage completion twice");

console.log("nazonazo space chase maze-network regression: ok (188 routes)");
