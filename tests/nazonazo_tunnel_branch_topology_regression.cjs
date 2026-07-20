#!/usr/bin/env node
"use strict";

/*
 * Regression test for the nazonazo-tunnel multi-branch topology.
 *
 * town/jungle/number/future each fork into a two-choice hidden tunnel
 * (snow|fire, dino|toy, cat|fantasy, sky|ruins respectively) that must
 * rejoin the very next mainline stage. This file parameterizes every
 * branch point over a shared array so a future 5th/6th branch point only
 * needs a new BRANCH_SPECS entry, not a new hand-written test block.
 *
 * Strategy: statically extract the real STAGES topology (id/hidden/
 * branches/rejoinId) from js/game.js with a balanced-bracket scanner
 * (no eval of the heavy SVG-art object literal), then feed that
 * extracted-but-real data into the actual resolveNextStage/stageIndexById/
 * stageHasBranches/openMap functions running in a node:vm sandbox. This
 * exercises the production navigation logic itself, not a reimplementation
 * of it, while keeping the harness light (no Playwright/browser).
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const game = read("nazonazo-tunnel/js/game.js");

/* ---------- generic source-scanning helpers (same technique as the other nazonazo *.cjs tests) ---------- */
function scanBalanced(source, openAt, openChar, closeChar) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openAt; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === openChar) depth += 1;
    else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name}: function declaration missing`);
  const bodyAt = source.indexOf("{", start + marker.length);
  assert.ok(bodyAt >= 0, `${name}: function body missing`);
  const end = scanBalanced(source, bodyAt, "{", "}");
  assert.ok(end > bodyAt, `${name}: unterminated function body`);
  return source.slice(start, end + 1);
}

/* ---------- statically extract the real STAGES topology (id/hidden/branches/rejoinId only) ---------- */
function extractStagesTopology(source) {
  const marker = "const STAGES=";
  const markerAt = source.indexOf(marker);
  assert.ok(markerAt >= 0, "STAGES: declaration missing");
  const arrayOpenAt = markerAt + marker.length;
  assert.equal(source[arrayOpenAt], "[", "STAGES: expected an array literal");
  const arrayEnd = scanBalanced(source, arrayOpenAt, "[", "]");
  assert.ok(arrayEnd > arrayOpenAt, "STAGES: unterminated array literal");
  const stagesSource = source.slice(arrayOpenAt, arrayEnd + 1);

  const topology = [];
  const idPattern = /\{id:"(\w+)"/g;
  let match;
  while ((match = idPattern.exec(stagesSource))) {
    const objectStart = match.index;
    const objectEnd = scanBalanced(stagesSource, objectStart, "{", "}");
    assert.ok(objectEnd > objectStart, `${match[1]}: unterminated stage object`);
    const stageSource = stagesSource.slice(objectStart, objectEnd + 1);

    const hidden = /\bhidden:true\b/.test(stageSource);
    const rejoinMatch = stageSource.match(/rejoinId:"(\w+)"/);
    const rejoinId = rejoinMatch ? rejoinMatch[1] : null;

    let branches = null;
    const branchesMarkerAt = stageSource.indexOf("branches:[");
    if (branchesMarkerAt >= 0) {
      const bracketOpenAt = branchesMarkerAt + "branches:".length;
      const bracketEnd = scanBalanced(stageSource, bracketOpenAt, "[", "]");
      assert.ok(bracketEnd > bracketOpenAt, `${match[1]}: unterminated branches array`);
      const branchesSource = stageSource.slice(bracketOpenAt, bracketEnd + 1);
      branches = [...branchesSource.matchAll(/choiceId:"(\w+)",toId:"(\w+)"/g)].map(m => ({ choiceId: m[1], toId: m[2] }));
      assert.ok(branches.length > 0, `${match[1]}: branches:[ ] present but no choiceId/toId pairs parsed`);
    }

    topology.push({ index: topology.length, id: match[1], hidden, rejoinId, branches });
  }
  assert.ok(topology.length > 0, "STAGES: no stage objects parsed (extractor drifted from source shape)");
  return topology;
}

const topology = extractStagesTopology(game);
const topologyById = Object.fromEntries(topology.map(t => [t.id, t]));
assert.equal(Object.keys(topologyById).length, topology.length, "STAGES: duplicate stage id detected");

/* ---------- independent ground truth (not derived from the source under test) ---------- */
const MAINLINE_ORDER = ["town", "jungle", "number", "sea", "future", "space"];
const BRANCH_SPECS = [
  { originId: "town", choiceIds: ["snow", "fire"] },
  { originId: "jungle", choiceIds: ["dino", "toy"] },
  { originId: "number", choiceIds: ["cat", "fantasy"] },
  { originId: "future", choiceIds: ["sky", "ruins"] }
];

// Cross-check MAINLINE_ORDER against the admin dashboard's own canonical mapping
// (NAZONAZO_ADMIN_STAGE_INDEX), a second independent source of truth in the same file.
const adminIndexMarker = "const NAZONAZO_ADMIN_STAGE_INDEX=Object.freeze(";
const adminIndexAt = game.indexOf(adminIndexMarker);
assert.ok(adminIndexAt >= 0, "NAZONAZO_ADMIN_STAGE_INDEX: declaration missing");
const adminObjectAt = adminIndexAt + adminIndexMarker.length;
const adminObjectEnd = scanBalanced(game, adminObjectAt, "{", "}");
const adminStageIndex = vm.runInNewContext(`(${game.slice(adminObjectAt, adminObjectEnd + 1)})`, Object.create(null), { timeout: 1000 });
assert.deepEqual(Object.keys(adminStageIndex), MAINLINE_ORDER, "admin stage index keys must match the mainline order");
MAINLINE_ORDER.forEach((id, index) => assert.equal(adminStageIndex[id], index, `${id}: admin stage index drifted from mainline order`));

/* ---------- topology must match mainline order exactly, hidden stages excluded ---------- */
assert.deepEqual(topology.filter(t => !t.hidden).map(t => t.id), MAINLINE_ORDER, "non-hidden STAGES entries must be exactly the six mainline stages in order");

/* ---------- build a minimal-but-real STAGES stub for the actual navigation functions ---------- */
const stagesStub = topology.map(t => ({
  id: t.id,
  hidden: t.hidden || undefined,
  branches: t.branches ? t.branches.map(b => ({ choiceId: b.choiceId, toId: b.toId })) : undefined,
  rejoinId: t.rejoinId || undefined
}));

const navContext = { STAGES: stagesStub };
vm.runInNewContext(
  `${extractFunction(game, "stageIndexById")}\n${extractFunction(game, "stageHasBranches")}\n${extractFunction(game, "resolveNextStage")}\n${extractFunction(game, "isMainlineFinalStg")}\n` +
  "this.__stageIndexById=stageIndexById;this.__resolveNextStage=resolveNextStage;this.__isMainlineFinalStg=isMainlineFinalStg;",
  navContext,
  { filename: "nazonazo-branch-topology-nav-vm.js", timeout: 1000 }
);
function idIndex(id) {
  const index = navContext.__stageIndexById(id);
  assert.ok(index >= 0, `${id}: stage id not found in stub STAGES`);
  return index;
}
function resolveId(fromId, choiceId) {
  const index = navContext.__resolveNextStage(idIndex(fromId), choiceId);
  assert.ok(index >= 0 && index < stagesStub.length, `resolveNextStage(${fromId}, ${choiceId}) returned an out-of-range index ${index}`);
  return stagesStub[index].id;
}
// Callers never invoke resolveNextStage on the final mainline stage directly (they branch on
// isMainlineFinalStg first, see game.js:1975/3447/4259); verify that guard itself is sound
// rather than asserting a same-stage clamp resolveNextStage never promises on its own.
topology.forEach(t => {
  assert.equal(navContext.__isMainlineFinalStg(idIndex(t.id)), t.id === "space", `${t.id}: isMainlineFinalStg must be true only for "space"`);
});

/* ---------- parameterized per-branch-point checks (structural + functional) ---------- */
for (const spec of BRANCH_SPECS) {
  const originEntry = topologyById[spec.originId];
  assert.ok(originEntry, `${spec.originId}: branch-origin stage missing from STAGES`);
  assert.ok(Array.isArray(originEntry.branches) && originEntry.branches.length === spec.choiceIds.length,
    `${spec.originId}: expected ${spec.choiceIds.length} branches, found ${originEntry.branches && originEntry.branches.length}`);
  assert.deepEqual(originEntry.branches.map(b => b.choiceId).slice().sort(), spec.choiceIds.slice().sort(),
    `${spec.originId}: branches[].choiceId set drifted from the expected fork options`);

  const expectedRejoin = MAINLINE_ORDER[MAINLINE_ORDER.indexOf(spec.originId) + 1];
  assert.ok(expectedRejoin, `${spec.originId}: has no following mainline stage to rejoin (spec bug)`);

  for (const choiceId of spec.choiceIds) {
    const branch = originEntry.branches.find(b => b.choiceId === choiceId);
    assert.ok(branch, `${spec.originId}: choice "${choiceId}" missing`);
    const hiddenId = branch.toId;
    const hiddenEntry = topologyById[hiddenId];
    assert.ok(hiddenEntry, `${spec.originId} -> ${choiceId}: target stage "${hiddenId}" missing from STAGES`);
    assert.equal(hiddenEntry.hidden, true, `${hiddenId}: must be a hidden route stage (hidden:true)`);
    assert.ok(!hiddenEntry.branches, `${hiddenId}: a hidden branch destination must not itself fork again`);
    assert.equal(hiddenEntry.rejoinId, expectedRejoin, `${hiddenId}: rejoinId must point back to "${expectedRejoin}" (the mainline stage right after "${spec.originId}")`);

    // Functional: the real resolveNextStage/stageIndexById must agree with the extracted topology.
    assert.equal(resolveId(spec.originId, choiceId), hiddenId, `resolveNextStage: "${spec.originId}" + choice "${choiceId}" must route to "${hiddenId}"`);
    assert.equal(resolveId(hiddenId, "some-unrelated-choice-id"), expectedRejoin, `resolveNextStage: "${hiddenId}" must rejoin "${expectedRejoin}" regardless of the (irrelevant) choiceId argument`);
  }

  // An unrecognized choiceId at a fork must fall back to the first branch, never throw or dead-end.
  assert.equal(resolveId(spec.originId, "not-a-real-choice-id"), originEntry.branches[0].toId,
    `${spec.originId}: an unknown choiceId must fall back to the first branch option`);
}

/* ---------- ordinary mainline stages (no branches / no rejoin) must simply advance by one ---------- */
assert.equal(resolveId("sea", "whatever"), "future", "sea has no branch/rejoin: must advance straight to future");

/* ---------- exhaustive full-journey walk over every 2^4 = 16 branch-choice combination ---------- */
function walkJourney(choices) {
  const sequence = ["town"];
  let currentId = "town";
  let steps = 0;
  while (currentId !== "space" && steps < 30) {
    const spec = BRANCH_SPECS.find(s => s.originId === currentId);
    currentId = resolveId(currentId, spec ? choices[currentId] : null);
    sequence.push(currentId);
    steps += 1;
  }
  assert.ok(steps < 30, `journey for ${JSON.stringify(choices)} never reached "space" (possible topology cycle)`);
  return sequence;
}

let journeysWalked = 0;
for (const townChoice of BRANCH_SPECS[0].choiceIds) {
  for (const jungleChoice of BRANCH_SPECS[1].choiceIds) {
    for (const numberChoice of BRANCH_SPECS[2].choiceIds) {
      for (const futureChoice of BRANCH_SPECS[3].choiceIds) {
        const choices = { town: townChoice, jungle: jungleChoice, number: numberChoice, future: futureChoice };
        const expected = ["town", townChoice, "jungle", jungleChoice, "number", numberChoice, "sea", "future", futureChoice, "space"];
        assert.deepEqual(walkJourney(choices), expected, `full journey mismatch for ${JSON.stringify(choices)}`);
        journeysWalked += 1;
      }
    }
  }
}
assert.equal(journeysWalked, 16, "expected all 2^4 branch-choice combinations across the 4 branch points to be walked");

/* ---------- RARES must have exactly one entry per STAGES entry (guard-leak detection) ---------- */
function extractConstArray(source, name) {
  const marker = `const ${name}=`;
  const markerAt = source.indexOf(marker);
  assert.ok(markerAt >= 0, `${name}: declaration missing`);
  const arrayOpenAt = markerAt + marker.length;
  assert.equal(source[arrayOpenAt], "[", `${name}: expected an array literal`);
  const arrayEnd = scanBalanced(source, arrayOpenAt, "[", "]");
  assert.ok(arrayEnd > arrayOpenAt, `${name}: unterminated array literal`);
  return vm.runInNewContext(`(${source.slice(arrayOpenAt, arrayEnd + 1)})`, Object.create(null), { timeout: 1000 });
}
const rares = extractConstArray(game, "RARES");
assert.equal(rares.length, topology.length, `RARES must have exactly one entry per STAGES entry (RARES=${rares.length}, STAGES=${topology.length}); a mismatch means maybeSpawnRare() can index past the end and spawn undefined art`);

/* ---------- openMap()'s highestOpen must exclude every hidden branch stage from all 4 branch points ---------- */
class FakeClassList {
  constructor(owner) { this.owner = owner; this.values = new Set(); }
  add(...names) { names.forEach(name => this.values.add(name)); this.sync(); }
  remove(...names) { names.forEach(name => this.values.delete(name)); this.sync(); }
  contains(name) { return this.values.has(name); }
  sync() { this.owner._className = [...this.values].join(" "); }
}
class FakeElement {
  constructor(tagName = "div", id = "") {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.children = [];
    this.dataset = {};
    this.style = { setProperty(name, value) { this[name] = value; } };
    this.classList = new FakeClassList(this);
    this._className = "";
    this._textContent = "";
    this.disabled = false;
  }
  get className() { return this._className; }
  set className(value) { this.classList.values = new Set(String(value).split(/\s+/).filter(Boolean)); this.classList.sync(); }
  get textContent() { return this._textContent; }
  set textContent(value) { this._textContent = String(value ?? ""); }
  set innerHTML(value) { this._textContent = ""; this.children = []; }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { children.forEach(child => this.appendChild(child)); }
}

const openMapStages = topology.map(t => ({ id: t.id, hidden: t.hidden, art: "dummyArt", names: [t.id, t.id] }));

function createOpenMapHarness() {
  const ids = {
    mapRow: new FakeElement("div", "mapRow"),
    loopBadge: new FakeElement("div", "loopBadge"),
    mapMsg: new FakeElement("div", "mapMsg"),
    map: new FakeElement("div", "map")
  };
  const quiz = new FakeElement("div", "quiz");
  const context = {
    console,
    STAGES: openMapStages,
    cleared: [],
    stg: 0,
    loop: 0,
    playing: true,
    driving: true,
    quiz,
    $: id => ids[id],
    document: { createElement: tag => new FakeElement(tag) },
    hideWeatherNotice() {}, resetNumberCargoGame() {}, clearFutureCapsuleGame() {}, clearSpaceRepairGame() {},
    resetSpaceSteering() {}, clearRareEvent() {}, clearMagicPuffs() {}, resetSeaInteraction() {}, stopStageWeather() {},
    setWeatherPresentation() {}, clearTunnelFriendGame() {}, clearTunnelBranchChoice() {},
    createUiArt() { return new FakeElement("span"); },
    bindTap(el, cb) { el.__tap = cb; }
  };
  vm.runInNewContext(`${extractFunction(game, "openMap")}\nthis.__openMap=openMap;`, context,
    { filename: "nazonazo-branch-topology-openmap-vm.js", timeout: 1000 });
  return {
    run(clearedTrueIds, currentId, loopValue) {
      context.cleared = openMapStages.map(s => clearedTrueIds.includes(s.id));
      context.stg = openMapStages.findIndex(s => s.id === currentId);
      assert.ok(context.stg >= 0, `${currentId}: unknown stage id in openMap harness`);
      context.loop = loopValue || 0;
      context.__openMap();
      return ids.mapRow.children
        .filter(node => node.classList.contains("mapNode"))
        .map(node => !!node.disabled);
    }
  };
}

// Parameterized: for every branch point, clearing its hidden destination (but not the
// following mainline stage) must not unlock anything past the expected mainline progress.
// (Two cases exercise the "currently mid-hidden-tunnel" path (curMainlineIdx=-1), two
// exercise the "already rejoined, hidden stage cleared in cars history" path, covering both
// branches of the guard's logic across all 4 branch points.)
const HIDDEN_GUARD_CASES = [
  { label: "town->snow hidden clear (mid-tunnel) must not unlock past jungle", clearedTrueIds: ["town", "snow"], currentId: "snow", unlockedThroughId: "jungle" },
  { label: "jungle->dino hidden clear (rejoined) must not unlock past number", clearedTrueIds: ["town", "jungle", "dino"], currentId: "number", unlockedThroughId: "number" },
  { label: "number->cat hidden clear (rejoined) must not unlock past sea", clearedTrueIds: ["town", "jungle", "number", "cat"], currentId: "sea", unlockedThroughId: "sea" },
  { label: "future->ruins hidden clear (mid-tunnel) must not unlock past future", clearedTrueIds: ["town", "jungle", "number", "sea", "ruins"], currentId: "ruins", unlockedThroughId: "future" }
];

for (const testCase of HIDDEN_GUARD_CASES) {
  const harness = createOpenMapHarness();
  const disabledFlags = harness.run(testCase.clearedTrueIds, testCase.currentId, 0);
  assert.equal(disabledFlags.length, MAINLINE_ORDER.length, `${testCase.label}: map row must render exactly the 6 mainline nodes (hidden stages must not appear)`);
  const unlockedThroughIndex = MAINLINE_ORDER.indexOf(testCase.unlockedThroughId);
  assert.ok(unlockedThroughIndex >= 0, `${testCase.label}: unknown unlockedThroughId`);
  const expectedDisabled = MAINLINE_ORDER.map((_, index) => index > unlockedThroughIndex);
  assert.deepEqual(disabledFlags, expectedDisabled,
    `${testCase.label}: expected mainline nodes disabled=${JSON.stringify(expectedDisabled)} (unlocked through "${testCase.unlockedThroughId}"), got ${JSON.stringify(disabledFlags)} ` +
    `for STAGES=[${MAINLINE_ORDER.join(",")}] — a hidden branch stage's index leaked into highestOpen`);
}

// Baseline sanity cases (no hidden stages involved) keep the harness itself honest.
{
  const harness = createOpenMapHarness();
  assert.deepEqual(harness.run([], "town", 0), [false, true, true, true, true, true], "nothing cleared: only the current/first stage should be open");
}
{
  const harness = createOpenMapHarness();
  assert.deepEqual(harness.run(["town"], "jungle", 0), [false, false, true, true, true, true], "town cleared: town+jungle open, nothing else");
}

console.log("nazonazo tunnel branch topology regression: PASS");
