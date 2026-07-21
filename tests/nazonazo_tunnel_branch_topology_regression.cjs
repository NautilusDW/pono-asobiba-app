#!/usr/bin/env node
"use strict";

/*
 * Regression test for the nazonazo-tunnel Darius-homage branch topology:
 * every junction on the route forks, not just the original 4 (town/jungle/
 * number/future). Phase1 added a genuine junction at sea (-> future/future2)
 * plus two new hidden hub stages, sea2/future2, that mirror sea/future's own
 * branch config so the *same* fork choices are offered no matter which
 * variant of the stage the player is currently on:
 *
 *   town   -> snow|fire   -> jungle
 *   jungle -> dino|toy    -> number
 *   number -> cat|fantasy -> sea | sea2      (cat rejoins sea, fantasy rejoins sea2)
 *   sea    -> future|future2                 (direct hop, no hidden tunnel in between)
 *   sea2   -> future|future2                 (same fork, reached via fantasy's rejoin)
 *   future  -> sky|ruins  -> space | space2  (sky rejoins space, ruins rejoins space2)
 *   future2 -> sky|ruins  -> space | space2  (same fork, reached via sea's future2 choice)
 *
 * "space" and "space2" are both terminal (final:true) mainline-equivalent finales.
 * sea2/future2/space2 are hidden:true (Phase1 stub: not yet a direct map choice) but
 * countsToProgress:true (they are hub stages in their own right, not simple
 * "visit and rejoin" leaves like snow/fire/dino/toy/cat/fantasy/sky/ruins).
 *
 * Strategy unchanged from before: statically extract the real STAGES topology
 * (id/icon/hidden/final/countsToProgress/mechanic/rejoinId/branches/rare) from
 * js/game.js with a balanced-bracket scanner (no eval of the heavy SVG-art object
 * literal), then feed that extracted-but-real data into the actual
 * resolveNextStage/stageIndexById/stageHasBranches/openMap functions running in a
 * node:vm sandbox. This exercises the production navigation logic itself, not a
 * reimplementation of it, while keeping the harness light (no Playwright/browser).
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

/* ---------- statically extract the real STAGES topology (id/icon/hidden/final/countsToProgress/branches/rejoinId/rare only) ---------- */
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
    const final = /\bfinal:true\b/.test(stageSource);
    const countsToProgress = /\bcountsToProgress:true\b/.test(stageSource);
    const iconMatch = stageSource.match(/icon:"([^"]*)"/);
    const icon = iconMatch ? iconMatch[1] : "";
    const mechanicMatch = stageSource.match(/mechanic:"(\w+)"/);
    const mechanic = mechanicMatch ? mechanicMatch[1] : null;
    const rejoinMatch = stageSource.match(/rejoinId:"(\w+)"/);
    const rejoinId = rejoinMatch ? rejoinMatch[1] : null;
    const rareMatch = stageSource.match(/rare:\[("(?:[^"\\]|\\.)*"),("(?:[^"\\]|\\.)*")\]/);
    const rare = rareMatch ? [JSON.parse(rareMatch[1]), JSON.parse(rareMatch[2])] : null;

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

    topology.push({ index: topology.length, id: match[1], icon, hidden, final, countsToProgress, mechanic, rejoinId, branches, rare });
  }
  assert.ok(topology.length > 0, "STAGES: no stage objects parsed (extractor drifted from source shape)");
  return topology;
}

const topology = extractStagesTopology(game);
const topologyById = Object.fromEntries(topology.map(t => [t.id, t]));
assert.equal(Object.keys(topologyById).length, topology.length, "STAGES: duplicate stage id detected");

/* ---------- independent ground truth (not derived from the source under test) ---------- */
const MAINLINE_ORDER = ["town", "jungle", "number", "sea", "future", "space"];

// Every hidden STAGES entry, in the exact array order the source must declare them in.
// This doubles as the save-compatibility contract for Phase1: new stages MUST be appended
// at the tail (index 14/15/16) so bestStarsByStageId's "loop+'-'+stg" physical-index keys
// for the existing 14 stages never shift.
const HIDDEN_STAGE_IDS_IN_ARRAY_ORDER = [
  "snow", "fire", "dino", "toy", "cat", "fantasy", "sky", "ruins", "sea2", "future2", "space2"
];

// Hidden stages that are themselves hub junctions (carry their own branches, mirror a
// mainline stage's mechanic) rather than simple "visit and rejoin" leaves.
const HUB_HIDDEN_IDS = ["sea2", "future2", "space2"];

// Hidden LEAF branch destinations: visiting one always routes back to a single fixed
// rejoin target, regardless of the (irrelevant) choiceId used to enter the tunnel.
const LEAF_REJOIN_EXPECTATIONS = {
  snow: "jungle", fire: "jungle",
  dino: "number", toy: "number",
  cat: "sea", fantasy: "sea2",
  sky: "space", ruins: "space2"
};

// Every stage that forks (has its own branches:[...]). sea/sea2 share the same choices
// (future/future2); future/future2 share the same choices (sky/ruins) -- Darius homage:
// whichever variant of a stage you're on, the same fork options are offered.
const BRANCH_ORIGIN_SPECS = [
  { originId: "town", choices: [{ choiceId: "snow", toId: "snow" }, { choiceId: "fire", toId: "fire" }] },
  { originId: "jungle", choices: [{ choiceId: "dino", toId: "dino" }, { choiceId: "toy", toId: "toy" }] },
  { originId: "number", choices: [{ choiceId: "cat", toId: "cat" }, { choiceId: "fantasy", toId: "fantasy" }] },
  { originId: "sea", choices: [{ choiceId: "future", toId: "future" }, { choiceId: "future2", toId: "future2" }] },
  { originId: "sea2", choices: [{ choiceId: "future", toId: "future" }, { choiceId: "future2", toId: "future2" }] },
  { originId: "future", choices: [{ choiceId: "sky", toId: "sky" }, { choiceId: "ruins", toId: "ruins" }] },
  { originId: "future2", choices: [{ choiceId: "sky", toId: "sky" }, { choiceId: "ruins", toId: "ruins" }] }
];
const branchOriginById = Object.fromEntries(BRANCH_ORIGIN_SPECS.map(s => [s.originId, s]));

/* ---------- topology must match mainline order exactly, hidden stages excluded ---------- */
assert.deepEqual(topology.filter(t => !t.hidden).map(t => t.id), MAINLINE_ORDER, "non-hidden STAGES entries must be exactly the six mainline stages in order");

/* ---------- hidden stages must be declared in the exact tail order the save-data contract requires ---------- */
assert.deepEqual(topology.filter(t => t.hidden).map(t => t.id), HIDDEN_STAGE_IDS_IN_ARRAY_ORDER,
  "hidden STAGES entries must appear in exactly this array order (new stages MUST be appended at the tail so the existing 14 stages' bestStarsByStageId physical-index keys never shift)");

/* ---------- build a minimal-but-real STAGES stub for the actual navigation functions ---------- */
const stagesStub = topology.map(t => ({
  id: t.id,
  icon: t.icon,
  hidden: t.hidden || undefined,
  final: t.final || undefined,
  countsToProgress: t.countsToProgress || undefined,
  branches: t.branches ? t.branches.map(b => ({ choiceId: b.choiceId, toId: b.toId })) : undefined,
  rejoinId: t.rejoinId || undefined
}));

// Cross-check MAINLINE_ORDER + HIDDEN_STAGE_IDS_IN_ARRAY_ORDER against the admin dashboard's
// own canonical mapping (NAZONAZO_ADMIN_STAGE_INDEX), a second independent source of truth in
// the same file. NAZONAZO_ADMIN_STAGE_INDEX is itself derived from STAGES
// (Object.freeze(STAGES.reduce(...))) rather than a hand-typed table, so it is evaluated (not
// statically parsed as an object literal) with the lightweight stagesStub standing in for the
// real, heavy STAGES array.
const EXPECTED_ADMIN_STAGE_INDEX_ORDER = MAINLINE_ORDER.concat(HIDDEN_STAGE_IDS_IN_ARRAY_ORDER);
const adminIndexMarker = "const NAZONAZO_ADMIN_STAGE_INDEX=";
const adminIndexAt = game.indexOf(adminIndexMarker);
assert.ok(adminIndexAt >= 0, "NAZONAZO_ADMIN_STAGE_INDEX: declaration missing");
const adminExprAt = adminIndexAt + adminIndexMarker.length;
const adminExprEnd = game.indexOf(";", adminExprAt);
assert.ok(adminExprEnd > adminExprAt, "NAZONAZO_ADMIN_STAGE_INDEX: unterminated declaration");
const adminStageIndex = vm.runInNewContext(`(${game.slice(adminExprAt, adminExprEnd)})`, { STAGES: stagesStub }, { timeout: 1000 });
assert.deepEqual(Object.keys(adminStageIndex), EXPECTED_ADMIN_STAGE_INDEX_ORDER,
  "admin stage index keys must be the six mainline stages (in mainline order) followed by every hidden stage id (QA-preview only, in STAGES array order)");
MAINLINE_ORDER.forEach((id, index) => assert.equal(adminStageIndex[id], index, `${id}: admin stage index drifted from mainline order`));
HIDDEN_STAGE_IDS_IN_ARRAY_ORDER.forEach((id, offset) => assert.equal(adminStageIndex[id], MAINLINE_ORDER.length + offset,
  `${id}: admin stage index (hidden QA-preview entry) must equal its STAGES array position`));

const navContext = { STAGES: stagesStub };
vm.runInNewContext(
  `${extractFunction(game, "stageIndexById")}\n${extractFunction(game, "stageHasBranches")}\n${extractFunction(game, "resolveNextStage")}\n${extractFunction(game, "isMainlineFinalStg")}\n` +
  "this.__stageIndexById=stageIndexById;this.__stageHasBranches=stageHasBranches;this.__resolveNextStage=resolveNextStage;this.__isMainlineFinalStg=isMainlineFinalStg;",
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
// Callers never invoke resolveNextStage on a final mainline-equivalent stage directly (they
// branch on isMainlineFinalStg first, see game.js applySkin/finishTunnelInterior/startDrive
// area); verify that guard itself is sound for BOTH finales now (space and space2).
topology.forEach(t => {
  const expectedFinal = t.id === "space" || t.id === "space2";
  assert.equal(navContext.__isMainlineFinalStg(idIndex(t.id)), expectedFinal, `${t.id}: isMainlineFinalStg must be true only for "space"/"space2"`);
});
// isMainlineFinalStg reads STAGES[s].final (not a hardcoded id check), so also assert
// final:true is declared on exactly {space, space2} and nowhere else -- otherwise the check
// above could pass by accident if a future stage add copy-pasted the flag.
topology.forEach(t => {
  assert.equal(!!t.final, t.id === "space" || t.id === "space2", `${t.id}: STAGES entry's final:true flag must be set only on "space"/"space2"`);
});

/* ---------- exhaustive shape check: every stage must be exactly one of fork/leaf/terminal ---------- */
// Guards against a future stage being added with neither branches nor rejoinId (which would
// silently fall through resolveNextStage's final "just advance by index" clamp -- a dead
// topology bug that's easy to introduce and easy to miss).
topology.forEach(t => {
  const isFork = Array.isArray(t.branches) && t.branches.length > 0;
  const isLeaf = !!t.rejoinId;
  const isTerminal = t.id === "space" || t.id === "space2";
  assert.equal([isFork, isLeaf, isTerminal].filter(Boolean).length, 1,
    `${t.id}: must be exactly one of {fork(branches), leaf(rejoinId), terminal(space/space2)} -- found fork=${isFork} leaf=${isLeaf} terminal=${isTerminal}`);
});

/* ---------- hub hidden stages: must fork on their own, must not also declare rejoinId ---------- */
["sea2", "future2"].forEach(id => {
  assert.ok(Array.isArray(topologyById[id].branches) && topologyById[id].branches.length,
    `${id}: hub hidden stage must carry its own branches`);
  assert.equal(topologyById[id].rejoinId, null,
    `${id}: a branching hub stage should not also declare rejoinId (resolveNextStage prioritizes branches anyway, but declaring both would be misleading)`);
});
assert.ok(!topologyById.space2.branches, "space2: terminal finale must not carry branches");
assert.equal(topologyById.space2.rejoinId, null, "space2: terminal finale must not declare rejoinId");
HUB_HIDDEN_IDS.forEach(id => {
  assert.equal(topologyById[id].hidden, true, `${id}: hub hidden stage must be hidden:true (Phase1: not yet a direct map choice)`);
  assert.equal(topologyById[id].countsToProgress, true,
    `${id}: hub hidden stage must be countsToProgress:true (it is a mainline-equivalent hub, not a simple leaf branch like snow/fire/dino/toy/cat/fantasy/sky/ruins)`);
});

/* ---------- parameterized per-branch-origin checks (structural + functional) ---------- */
for (const spec of BRANCH_ORIGIN_SPECS) {
  const originEntry = topologyById[spec.originId];
  assert.ok(originEntry, `${spec.originId}: branch-origin stage missing from STAGES`);
  const expectedChoiceIds = spec.choices.map(c => c.choiceId);
  assert.ok(Array.isArray(originEntry.branches) && originEntry.branches.length === expectedChoiceIds.length,
    `${spec.originId}: expected ${expectedChoiceIds.length} branches, found ${originEntry.branches && originEntry.branches.length}`);
  assert.deepEqual(originEntry.branches.map(b => b.choiceId).slice().sort(), expectedChoiceIds.slice().sort(),
    `${spec.originId}: branches[].choiceId set drifted from the expected fork options`);

  for (const { choiceId, toId } of spec.choices) {
    const branch = originEntry.branches.find(b => b.choiceId === choiceId);
    assert.ok(branch, `${spec.originId}: choice "${choiceId}" missing`);
    assert.equal(branch.toId, toId, `${spec.originId}: choice "${choiceId}" must route to "${toId}"`);
    assert.ok(topologyById[toId], `${spec.originId} -> ${choiceId}: target stage "${toId}" missing from STAGES`);
    // Functional: the real resolveNextStage/stageIndexById must agree with the extracted topology.
    assert.equal(resolveId(spec.originId, choiceId), toId, `resolveNextStage: "${spec.originId}" + choice "${choiceId}" must route to "${toId}"`);
  }

  // An unrecognized choiceId at a fork must fall back to the first branch, never throw or dead-end.
  assert.equal(resolveId(spec.originId, "not-a-real-choice-id"), originEntry.branches[0].toId,
    `${spec.originId}: an unknown choiceId must fall back to the first branch option`);
}

/* ---------- hidden LEAF branch destinations: must rejoin their fixed target regardless of choiceId ---------- */
for (const [hiddenId, expectedRejoin] of Object.entries(LEAF_REJOIN_EXPECTATIONS)) {
  const hiddenEntry = topologyById[hiddenId];
  assert.ok(hiddenEntry, `${hiddenId}: hidden leaf stage missing from STAGES`);
  assert.equal(hiddenEntry.hidden, true, `${hiddenId}: must be a hidden route stage (hidden:true)`);
  assert.ok(!hiddenEntry.branches, `${hiddenId}: a hidden leaf branch destination must not itself fork again`);
  assert.equal(hiddenEntry.rejoinId, expectedRejoin, `${hiddenId}: rejoinId must point to "${expectedRejoin}"`);
  assert.equal(resolveId(hiddenId, "some-unrelated-choice-id"), expectedRejoin,
    `resolveNextStage: "${hiddenId}" must rejoin "${expectedRejoin}" regardless of the (irrelevant) choiceId argument`);
}
// Keep the two hand-authored ground-truth tables consistent with each other: every leaf must
// actually be reachable from some real branch choice, and vice versa.
const reachableLeafIds = new Set(BRANCH_ORIGIN_SPECS.flatMap(spec => spec.choices.map(c => c.toId)).filter(id => LEAF_REJOIN_EXPECTATIONS[id]));
assert.deepEqual([...reachableLeafIds].sort(), Object.keys(LEAF_REJOIN_EXPECTATIONS).sort(),
  "every LEAF_REJOIN_EXPECTATIONS id must be reachable from some BRANCH_ORIGIN_SPECS choice, and vice versa");

/* ---------- exhaustive full-journey walk over every real decision-point combination ---------- */
// Five real binary decisions remain along any journey (town/jungle/number choose their leaf,
// then a sea-variant forks into future/future2, then a future-variant forks into sky/ruins) --
// 2^5 = 32 total distinct journeys. expectedNextId() is an independent reimplementation (using
// only the hand-authored ground-truth tables above) that the real resolveNextStage-driven walk
// must agree with at every step.
function expectedNextId(currentId, choiceId) {
  const spec = branchOriginById[currentId];
  if (spec) {
    const found = spec.choices.find(c => c.choiceId === choiceId) || spec.choices[0];
    return found.toId;
  }
  if (Object.prototype.hasOwnProperty.call(LEAF_REJOIN_EXPECTATIONS, currentId)) return LEAF_REJOIN_EXPECTATIONS[currentId];
  return null;
}
function walkJourney(resolveFn, choices) {
  const sequence = ["town"];
  let currentId = "town";
  let steps = 0;
  while (currentId !== "space" && currentId !== "space2" && steps < 40) {
    currentId = resolveFn(currentId, choices[currentId]);
    assert.ok(currentId, `journey for ${JSON.stringify(choices)} produced a null/undefined next id after "${sequence[sequence.length - 1]}"`);
    sequence.push(currentId);
    steps += 1;
  }
  assert.ok(steps < 40, `journey for ${JSON.stringify(choices)} never reached a finale (possible topology cycle)`);
  return sequence;
}

const TOWN_CHOICES = ["snow", "fire"];
const JUNGLE_CHOICES = ["dino", "toy"];
const NUMBER_CHOICES = ["cat", "fantasy"];
const SEA_FORK_CHOICES = ["future", "future2"];
const FUTURE_FORK_CHOICES = ["sky", "ruins"];

let journeysWalked = 0;
for (const townChoice of TOWN_CHOICES) {
  for (const jungleChoice of JUNGLE_CHOICES) {
    for (const numberChoice of NUMBER_CHOICES) {
      for (const seaForkChoice of SEA_FORK_CHOICES) {
        for (const futureForkChoice of FUTURE_FORK_CHOICES) {
          const choices = {
            town: townChoice, jungle: jungleChoice, number: numberChoice,
            sea: seaForkChoice, sea2: seaForkChoice,
            future: futureForkChoice, future2: futureForkChoice
          };
          const expected = walkJourney(expectedNextId, choices);
          const actual = walkJourney(resolveId, choices);
          assert.deepEqual(actual, expected, `full journey mismatch for ${JSON.stringify(choices)}`);
          journeysWalked += 1;
        }
      }
    }
  }
}
assert.equal(journeysWalked, 32,
  "expected all 2^5 branch-choice combinations across the 5 real decision points (town/jungle/number/sea-fork/future-fork) to be walked");

// Two fully-literal, hand-typed example journeys for readability/documentation value,
// independent of the generated loop above.
assert.deepEqual(walkJourney(resolveId, { town: "snow", jungle: "dino", number: "cat", sea: "future", future: "sky" }),
  ["town", "snow", "jungle", "dino", "number", "cat", "sea", "future", "sky", "space"],
  "original (all-first-choice) route must still resolve exactly as before Phase1");
assert.deepEqual(walkJourney(resolveId, { town: "fire", jungle: "toy", number: "fantasy", sea2: "future2", future2: "ruins" }),
  ["town", "fire", "jungle", "toy", "number", "fantasy", "sea2", "future2", "ruins", "space2"],
  "new all-second-choice route must reach the new sea2/future2/space2 hub chain");

/* ---------- every STAGES entry must carry its own rare:[emoji,label] tuple (guard-leak detection) ---------- */
// There is no separate RARES array to fall out of sync with STAGES any more (maybeSpawnRare()
// and collectSeaRareCollision() both read STAGES[stg].rare directly), so the guard-leak this
// used to catch -- forgetting to append a matching RARES entry when adding a stage -- is now a
// missing/malformed rare:[...] field on the STAGES entry itself.
topology.forEach(t => {
  assert.ok(Array.isArray(t.rare) && t.rare.length === 2 && t.rare.every(v => typeof v === "string" && v.length > 0),
    `${t.id}: STAGES entry must declare rare:[emoji,label] (a mismatch means maybeSpawnRare() can destructure undefined and crash)`);
});
const maybeSpawnRareSource = extractFunction(game, "maybeSpawnRare");
const readsRareDirectly = /const\s+\[\s*e\s*,\s*t\s*\]\s*=\s*STAGES\s*\[\s*stg\s*\]\.rare\b/.test(maybeSpawnRareSource);
const readsRareThroughCurrentStage = /const\s+stage\s*=\s*STAGES\s*\[\s*stg\s*\]\s*,\s*\[\s*e\s*,\s*t\s*\]\s*=\s*stage\.rare\b/.test(maybeSpawnRareSource);
assert.ok(readsRareDirectly || readsRareThroughCurrentStage,
  "maybeSpawnRare must read the rare tuple from the current STAGES entry, directly or through that exact current-stage alias");
assert.doesNotMatch(maybeSpawnRareSource, /\bRARES\s*\[/,
  "maybeSpawnRare must not restore a parallel rare tuple registry");
assert.match(extractFunction(game, "collectSeaRareCollision"), /STAGES\[stg\]\.rare/,
  "collectSeaRareCollision must read the rare tuple from the current STAGES entry, not a parallel RARES array");

/* ---------- openMap(): row rendering + fork hints ---------- */
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
    this.attributes = {};
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
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; }
}

// countsToProgress now reflects the REAL per-stage value (not a `!hidden` shortcut): sea2/
// future2/space2 are hidden:true AND countsToProgress:true, unlike the 8 leaf branch stages
// which are hidden:true AND countsToProgress:false. The stub must mirror that real divergence,
// or the guard-case assertions below would validate the wrong thing.
const openMapStages = topology.map(t => ({
  id: t.id,
  icon: t.icon,
  hidden: t.hidden,
  countsToProgress: t.countsToProgress,
  mechanic: t.mechanic || undefined,
  art: "dummyArt",
  names: [t.id, t.id],
  branches: t.branches ? t.branches.map(b => ({ choiceId: b.choiceId, toId: b.toId })) : undefined
}));

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
  // openMap() now also calls stageHasBranches()/stageIndexById()/mainlineSlotIndex() (the
  // last for mapping hidden hub twins like sea2/future2/space2 to the mainline slot they
  // stand in for), so all three must be available in the sandbox alongside openMap itself.
  vm.runInNewContext(
    `${extractFunction(game, "stageIndexById")}\n${extractFunction(game, "stageHasBranches")}\n${extractFunction(game, "mainlineSlotIndex")}\n${extractFunction(game, "openMap")}\nthis.__openMap=openMap;`,
    context,
    { filename: "nazonazo-branch-topology-openmap-vm.js", timeout: 1000 }
  );
  return {
    run(clearedTrueIds, currentId, loopValue) {
      context.cleared = openMapStages.map(s => clearedTrueIds.includes(s.id));
      context.stg = openMapStages.findIndex(s => s.id === currentId);
      assert.ok(context.stg >= 0, `${currentId}: unknown stage id in openMap harness`);
      context.loop = loopValue || 0;
      context.__openMap();
      const mapNodes = ids.mapRow.children.filter(node => node.classList.contains("mapNode"));
      return {
        disabledFlags: mapNodes.map(node => !!node.disabled),
        // map-fork-hint is appended as a child of its mapNode button (not a sibling in
        // #mapRow) so it never contributes to the row's fixed horizontal width budget --
        // see the child_ux map-overflow regression this fixes. Collect in row order.
        forkHints: mapNodes.flatMap(node => node.children.filter(child => child.classList.contains("map-fork-hint")))
      };
    }
  };
}

// Parameterized: for every leaf branch point, clearing its hidden destination (but not the
// following mainline stage) must not unlock anything past the expected mainline progress.
// (Two cases exercise the "currently mid-hidden-tunnel" path (curMainlineIdx=-1), two exercise
// the "already rejoined, hidden stage cleared in cars history" path, covering both branches of
// the guard's logic.)
const HIDDEN_GUARD_CASES = [
  { label: "town->snow hidden clear (mid-tunnel) must not unlock past jungle", clearedTrueIds: ["town", "snow"], currentId: "snow", unlockedThroughId: "jungle" },
  { label: "jungle->dino hidden clear (rejoined) must not unlock past number", clearedTrueIds: ["town", "jungle", "dino"], currentId: "number", unlockedThroughId: "number" },
  { label: "number->cat hidden clear (rejoined) must not unlock past sea", clearedTrueIds: ["town", "jungle", "number", "cat"], currentId: "sea", unlockedThroughId: "sea" },
  { label: "future->ruins hidden clear (mid-tunnel) must not unlock past future", clearedTrueIds: ["town", "jungle", "number", "sea", "ruins"], currentId: "ruins", unlockedThroughId: "future" },
  // sea2/future2/space2 are hub twins that physically live at the STAGES tail (index
  // 14-16, past every mainline index). openMap() must map their progress to the mainline
  // SLOT they stand in for (sea/future/space) via mainlineSlotIndex(), not their raw
  // array index -- otherwise merely reaching sea2 would jump highestOpen past every
  // mainline node and unlock the whole fixed-size map row (a real regression this test
  // used to document as "intentional" before the openMap() fix).
  { label: "sea2 hub (reached via fantasy) must not unlock past its mainline sea slot", clearedTrueIds: ["town", "jungle", "number", "fantasy"], currentId: "sea2", unlockedThroughId: "sea" },
  { label: "future2 hub (reached via sea's second branch) must not unlock past its mainline future slot", clearedTrueIds: ["town", "jungle", "number", "sea"], currentId: "future2", unlockedThroughId: "future" }
];

for (const testCase of HIDDEN_GUARD_CASES) {
  const harness = createOpenMapHarness();
  const { disabledFlags } = harness.run(testCase.clearedTrueIds, testCase.currentId, 0);
  assert.equal(disabledFlags.length, MAINLINE_ORDER.length, `${testCase.label}: map row must render exactly the 6 mainline nodes (hidden stages must not appear as their own node)`);
  const unlockedThroughIndex = MAINLINE_ORDER.indexOf(testCase.unlockedThroughId);
  assert.ok(unlockedThroughIndex >= 0, `${testCase.label}: unknown unlockedThroughId`);
  const expectedDisabled = MAINLINE_ORDER.map((_, index) => index > unlockedThroughIndex);
  assert.deepEqual(disabledFlags, expectedDisabled,
    `${testCase.label}: expected mainline nodes disabled=${JSON.stringify(expectedDisabled)} (unlocked through "${testCase.unlockedThroughId}"), got ${JSON.stringify(disabledFlags)} ` +
    `for STAGES=[${MAINLINE_ORDER.join(",")}] — a hidden branch stage's index leaked into highestOpen`);
}

// sea2/future2/space2 are countsToProgress:true (unlike the countsToProgress:false leaf
// branches above) because they are hub stages in their own right, not simple "visit and
// rejoin" detours -- but they must still only unlock through the mainline SLOT they stand
// in for (see the sea2/future2 HIDDEN_GUARD_CASES entries above), not blanket-unlock the
// whole map row just because their physical STAGES index is past every mainline index.

// Baseline sanity cases (no hidden stages involved) keep the harness itself honest.
{
  const harness = createOpenMapHarness();
  assert.deepEqual(harness.run([], "town", 0).disabledFlags, [false, true, true, true, true, true], "nothing cleared: only the current/first stage should be open");
}
{
  const harness = createOpenMapHarness();
  assert.deepEqual(harness.run(["town"], "jungle", 0).disabledFlags, [false, false, true, true, true, true], "town cleared: town+jungle open, nothing else");
}

/* ---------- fork hint: every forking mainline node must get a lightweight "えらべる みち" hint ---------- */
{
  const harness = createOpenMapHarness();
  const { forkHints } = harness.run([], "town", 0);
  // Exactly the 5 forking mainline nodes get a hint (town/jungle/number/sea/future, in that
  // row order); the terminal "space" node does not.
  assert.equal(forkHints.length, 5, "openMap: exactly the 5 forking mainline nodes (town/jungle/number/sea/future) must get a map-fork-hint; space (terminal) must not");
  const forkOriginOrder = ["town", "jungle", "number", "sea", "future"];
  forkHints.forEach((hint, index) => {
    const originId = forkOriginOrder[index];
    const spec = branchOriginById[originId];
    assert.equal(hint.getAttribute("role"), "img", `${originId}: map-fork-hint must be role=img (decorative compound icon, not a live announcement)`);
    const label = hint.getAttribute("aria-label") || "";
    assert.ok(label.length > 0 && !/隠/.test(label),
      `${originId}: map-fork-hint aria-label must be a positive "えらべる みち"-style phrase and must never mention 隠し(hidden) — got "${label}"`);
    const mark = hint.children.find(c => c.classList.contains("map-fork-mark"));
    assert.ok(mark && mark.textContent === "🔀", `${originId}: map-fork-hint must contain the 🔀 fork mark`);
    const options = hint.children.filter(c => c.classList.contains("map-fork-option"));
    assert.equal(options.length, spec.choices.length, `${originId}: map-fork-hint option count must match its real branch count`);
    const actualIcons = options.map(o => o.textContent);
    const expectedIcons = spec.choices.map(c => topologyById[c.toId].icon);
    assert.deepEqual(actualIcons, expectedIcons, `${originId}: map-fork-hint icons must be the real STAGES icons of its branch targets, in branch order`);
  });
}

console.log("nazonazo tunnel branch topology regression: PASS");
