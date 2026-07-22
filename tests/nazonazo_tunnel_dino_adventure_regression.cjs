#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const original = Object.freeze({
  html: read("nazonazo-tunnel/index.html"),
  css: read("nazonazo-tunnel/styles.css"),
  game: read("nazonazo-tunnel/js/game.js")
});
const DINO_ASSET_FILES = Object.freeze([
  "branch_dino_adventure_waterway_dry_20260722.webp",
  "branch_dino_adventure_waterway_success_20260722.webp",
  "branch_dino_adventure_trex_waiting_cutout_20260722.webp",
  "branch_dino_adventure_trex_inhale_cutout_20260722.webp",
  "branch_dino_adventure_trex_roar_cutout_20260722.webp",
  "branch_dino_adventure_trex_tired_cutout_20260722.webp",
  "branch_dino_adventure_trex_step_back_cutout_20260722.webp",
  "branch_dino_adventure_trex_yield_cutout_20260722.webp",
  "branch_dino_adventure_roar_wave_cutout_20260722.webp",
  "branch_dino_adventure_whistle_burst_cutout_20260722.webp",
  "branch_dino_adventure_water_tank_cutout_20260722.webp",
  "branch_dino_adventure_brake_control_cutout_20260722.webp",
  "branch_dino_adventure_whistle_control_cutout_20260722.webp"
]);

function compact(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\s+/g, "");
}

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
    else if (char === closeChar && --depth === 0) return index;
  }
  return -1;
}

function extractFunction(source, name) {
  const match = new RegExp(`function\\s+${name}\\s*\\(`).exec(source);
  if (!match) return "";
  const parametersAt = source.indexOf("(", match.index);
  const parametersEnd = scanBalanced(source, parametersAt, "(", ")");
  const openAt = parametersEnd >= 0 ? source.indexOf("{", parametersEnd) : -1;
  if (openAt < 0) return "";
  const end = scanBalanced(source, openAt, "{", "}");
  return end > openAt ? source.slice(match.index, end + 1) : "";
}

function extractArrayConstant(source, name) {
  const match = new RegExp(`(?:const\\s+|,)${name}\\s*=`).exec(source);
  if (!match) return null;
  const openAt = source.indexOf("[", match.index);
  const end = scanBalanced(source, openAt, "[", "]");
  if (openAt < 0 || end < 0) return null;
  try {
    return vm.runInNewContext(`(${source.slice(openAt, end + 1)})`, Object.create(null), { timeout: 500 });
  } catch (_) {
    return null;
  }
}

function numericConstant(source, name) {
  const match = new RegExp(`(?:const\\s+|,)${name}\\s*=\\s*([0-9.]+)`).exec(source);
  return match ? Number(match[1]) : NaN;
}

function stagesSource(source) {
  const markerAt = source.indexOf("const STAGES=");
  const openAt = markerAt >= 0 ? source.indexOf("[", markerAt) : -1;
  const end = openAt >= 0 ? scanBalanced(source, openAt, "[", "]") : -1;
  return end > openAt ? source.slice(openAt, end + 1) : "";
}

function dinoStageSource(source) {
  const start = source.indexOf('{id:"dino"');
  const end = source.indexOf('\n {id:"toy"', start);
  return start >= 0 && end > start ? source.slice(start, end) : "";
}

function dinoAdventureSource(source) {
  const start = source.indexOf("/* ================= dinosaur adventure ================= */");
  const end = source.indexOf("/* ================= game loop ================= */", start);
  return start >= 0 && end > start ? source.slice(start, end) : "";
}

function childFacingLiterals(source) {
  return [...source.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)]
    .map(match => match[2])
    .filter(value => /[ぁ-んァ-ヶ一-龠々]/.test(value));
}

function validate(candidate) {
  const errors = [];
  let checks = 0;
  const check = (condition, code, detail = "") => {
    checks += 1;
    if (!condition) errors.push(detail ? `${code}: ${detail}` : code);
  };
  const { html, css, game } = candidate;
  const gameCompact = compact(game);
  const cssCompact = compact(css);
  const stage = compact(dinoStageSource(game));

  check(stage.includes('id:"dino"') && stage.includes('mechanic:"dinoAdventure"'), "stage-mode");
  check(stage.includes('hidden:true') && stage.includes('countsToProgress:false') && stage.includes('rejoinId:"number"'), "branch-rejoin");
  const canonicalStageIds = [...stagesSource(game).matchAll(/\{id:"([a-z0-9]+)"/g)].slice(0, 14).map(match => match[1]);
  check(canonicalStageIds[8] === "dino" && canonicalStageIds[9] === "toy", "save-index");
  for (const file of DINO_ASSET_FILES) {
    const assetPath = path.join(root, "assets/images/nazonazo-tunnel", file);
    check((game.match(new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length === 1, "asset-mapping", file);
    check(fs.existsSync(assetPath) && fs.statSync(assetPath).size > 0 && fs.statSync(assetPath).size < 3 * 1024 * 1024, "asset-file", file);
  }

  const requiredIds = [
    "dinoAdventureLayer", "dinoAdventureTitle", "dinoAdventureGuide", "dinoAdventureProgress",
    "dinoWaterGame", "dinoWaterDinos", "dinoWaterGrid", "dinoWaterBudget", "dinoWaterRetry",
    "dinoBossGame", "dinoBossTrex", "dinoBossTrainHp", "dinoBossTrexHp", "dinoBossWater",
    "dinoBossTug", "dinoBossAction", "dinoBossRetry"
  ];
  for (const id of requiredIds) {
    check((html.match(new RegExp(`id=["']${id}["']`, "g")) || []).length === 1, "dom-contract", id);
  }
  check(/<section id="dinoAdventureLayer"[^>]*data-phase="idle"[^>]*aria-hidden="true"[^>]*hidden/.test(html), "layer-a11y");
  check(/id="dinoWaterGrid"[^>]*role="grid"[^>]*tabindex="0"/.test(html), "water-keyboard");
  check(/id="dinoWaterBudget"[^>]*role="progressbar"[^>]*aria-valuemin="0"[^>]*aria-valuemax="9"[^>]*aria-valuenow="9"/.test(html), "water-budget-a11y");
  for (const id of ["dinoWaterRetry", "dinoBossAction", "dinoBossRetry"]) {
    check(new RegExp(`<button id="${id}"[^>]*type="button"`).test(html), "real-button", id);
  }
  for (const id of ["dinoBossTrainHp", "dinoBossTrexHp"]) {
    check(new RegExp(`id="${id}"[^>]*role="progressbar"[^>]*aria-valuemax="3"[^>]*aria-valuenow="3"`).test(html), "boss-hp-a11y", id);
  }

  check(cssCompact.includes("#dinoAdventureLayer{position:absolute;inset:0;") && cssCompact.includes("#dinoAdventureLayer[hidden]{display:none!important}"), "layer-layout");
  check(cssCompact.includes(".dino-water-grid{") && cssCompact.includes("grid-template-columns:repeat(7,var(--water-cell))") && cssCompact.includes("grid-template-rows:repeat(4,var(--water-cell))"), "water-grid-layout");
  check(cssCompact.includes("#dinoWaterRetry,.dino-boss-retry{") && cssCompact.includes("min-height:52px"), "retry-target");
  check(cssCompact.includes(".dino-boss-action{") && /min-height:clamp\((?:6[4-9]|[7-9]\d)px/.test(css), "boss-target");
  check(/#settingsBtn\{[^}]*width:56px;[^}]*height:56px/.test(css) && /#settingsBtn\{width:48px;height:48px\}/.test(css), "settings-target");
  const reducedAt = css.indexOf("@media (prefers-reduced-motion:reduce)");
  const reduced = reducedAt >= 0 ? css.slice(reducedAt) : "";
  const reducedCompact = compact(reduced);
  check(reducedCompact.includes('.dino-water-game.is-saved.dino-water-sceneimg,.dino-water-cell[data-stop="true"],.dino-boss-game[data-phase="defend"].dino-boss-trex,.dino-boss-wave,.dino-boss-game[data-phase="burst"].dino-boss-tug>i,.dino-boss-action.is-burst{animation:none!important}') && reducedCompact.includes(".dino-boss-action,.dino-boss-trex,.dino-boss-tug>span,.dino-boss-tug>i,.dino-water-cell::before,.dino-water-cell::after{transition:none!important}"), "reduced-motion");

  check(numericConstant(game, "DINO_ADVENTURE_EVENT_COUNT") === 2, "event-count");
  check(numericConstant(game, "DINO_WATER_ROWS") === 4 && numericConstant(game, "DINO_WATER_COLS") === 7, "water-dimensions");
  check(numericConstant(game, "DINO_WATER_DIG_BUDGET") === 9 && Number.isFinite(numericConstant(game, "DINO_WATER_DIG_BUDGET")), "water-budget");
  const rocks = extractArrayConstant(game, "DINO_WATER_ROCKS");
  const solution = extractArrayConstant(game, "DINO_WATER_SOLUTION");
  const rows = numericConstant(game, "DINO_WATER_ROWS");
  const cols = numericConstant(game, "DINO_WATER_COLS");
  const start = numericConstant(game, "DINO_WATER_START");
  const goal = numericConstant(game, "DINO_WATER_GOAL");
  check(Array.isArray(rocks) && new Set(rocks).size === rocks.length && rocks.every(index => Number.isInteger(index) && index >= 0 && index < rows * cols), "water-rocks");
  check(Array.isArray(solution) && solution[0] === start && solution.at(-1) === goal && solution.length <= numericConstant(game, "DINO_WATER_DIG_BUDGET"), "water-solution");
  if (Array.isArray(solution)) {
    check(solution.every((index, position) => position === 0 || Math.abs(Math.floor(index / cols) - Math.floor(solution[position - 1] / cols)) + Math.abs(index % cols - solution[position - 1] % cols) === 1), "water-adjacency");
    check(Array.isArray(rocks) && solution.every(index => !rocks.includes(index)), "water-solution-rock");
  }
  check(numericConstant(game, "DINO_BOSS_HP") === 3 && numericConstant(game, "DINO_BOSS_TRAIN_HP") === 3, "boss-hp");
  check(numericConstant(game, "DINO_BOSS_WATER_CHARGES") === 3 && numericConstant(game, "DINO_BOSS_WATER_POWER") > 1, "water-power");
  const burst = extractArrayConstant(game, "DINO_BOSS_BURST_MS");
  check(Array.isArray(burst) && burst.length === 3 && Math.min(...burst) >= 1000, "broad-burst-window");

  const requiredFunctions = [
    "createDinoAdventureState", "isDinoAdventureStage", "resetDinoAdventure", "startDinoAdventure",
    "showDinoWaterEvent", "showDinoBossEncounter", "tickDinoAdventure", "finishDinoBossVictory"
  ];
  const functions = Object.fromEntries(requiredFunctions.map(name => [name, extractFunction(game, name)]));
  for (const [name, body] of Object.entries(functions)) check(Boolean(body), "runtime-function", name);
  const dedicatedBodies = Object.values(functions).join("\n");
  check(!/showQuiz\s*\(|onPick\s*\(|renderChoiceCards\s*\(|futureCrane|DINO\b/.test(dedicatedBodies), "zero-quiz-crane");
  check(gameCompact.includes('mechanic==="dinoAdventure"') || gameCompact.includes('mechanic!=="dinoAdventure"'), "mode-dispatch");
  check(/window\.__nazonazoDinoAdventureDebug\s*=/.test(game) && /snapshot\s*[:(]/.test(game), "runtime-snapshot");
  check(/nazonazoAdminPreviewMode/.test(game.slice(Math.max(0, game.indexOf("__nazonazoDinoAdventureDebug") - 1000), game.indexOf("__nazonazoDinoAdventureDebug") + 2000)), "snapshot-admin-only");

  for (const lifecycle of ["startJourneyAt", "openMap", "ending", "nazonazoAdminPreviewArm"]) {
    const body = extractFunction(game, lifecycle);
    check(/resetDinoAdventure\s*\(/.test(body), "cleanup-lifecycle", lifecycle);
  }
  const transit = extractFunction(game, "beginStageTransit");
  check(/resetDinoAdventure\s*\(/.test(transit) && /isDinoAdventureStage/.test(transit), "cleanup-lifecycle", "beginStageTransit preserves completion audit only while leaving dino");
  const reset = functions.resetDinoAdventure || "";
  check(/epoch/.test(reset) && /pointer|Pointer/.test(reset) && /createDinoAdventureState\s*\(/.test(reset) && /classList\.remove/.test(reset), "cleanup-state");
  check(/visibilitychange/.test(game) && /resetDinoAdventure|pauseDinoAdventure|dinoAdventure/.test(game), "hidden-lifecycle");
  check(/resize/.test(game) && /dinoAdventure|DinoAdventure/.test(game), "resize-lifecycle");
  check(/keydown/.test(game) && /dinoWater|DinoWater|dinoBoss|DinoBoss/.test(game), "keyboard-runtime");

  const assetPreloader = extractFunction(game, "preloadDinoAdventureAssets") || "";
  const revealWater = extractFunction(game, "revealDinoWaterEvent") || "";
  const revealBoss = extractFunction(game, "revealDinoBossEncounter") || "";
  check(numericConstant(game, "DINO_ADVENTURE_ASSET_READY_TIMEOUT_MS") === 8000 && /image\.decode/.test(assetPreloader) && /Promise\.race/.test(assetPreloader) && /Promise\.all/.test(assetPreloader), "asset-predecode");
  check(/dinoAdventureImageCache=new Map\(\),dinoAdventureImageDecodePromises=new Map\(\)/.test(game) && /if\(dinoAdventureAssetsReadyPromise\)return dinoAdventureAssetsReadyPromise/.test(assetPreloader), "asset-predecode-cache");
  check(compact(functions.showDinoWaterEvent || "").includes("preloadDinoAdventureAssets().then(()=>revealDinoWaterEvent(epoch))") && compact(functions.showDinoBossEncounter || "").includes("preloadDinoAdventureAssets().then(()=>revealDinoBossEncounter(epoch))"), "asset-predecode-gate");
  check([revealWater, revealBoss].every(body => /isDinoAdventureStage\(\)/.test(body) && /!playing/.test(body) && /dinoAdventureState\.epoch!==epoch/.test(body) && /dinoAdventureState\.phase!==["']travel["']/.test(body)), "asset-stale-reveal-guard");

  const stateFactory = functions.createDinoAdventureState || "";
  check(/completionCount:0/.test(stateFactory) && /transitionCount:0/.test(stateFactory) && /epoch:0/.test(stateFactory), "one-shot-state");
  check(/bossHp:DINO_BOSS_HP/.test(stateFactory) && /trainHp:DINO_BOSS_TRAIN_HP/.test(stateFactory) && /waterCharge:DINO_BOSS_WATER_CHARGES/.test(stateFactory), "boss-state");
  check(/route:\[DINO_WATER_START\]/.test(stateFactory) && /budget:DINO_WATER_DIG_BUDGET/.test(stateFactory) && /attempt:1/.test(stateFactory), "water-state");

  const failDefense = extractFunction(game, "failDinoBossDefense");
  const missWindow = extractFunction(game, "missDinoBossAttackWindow");
  const hitBoss = extractFunction(game, "hitDinoBoss");
  const completeStage = extractFunction(game, "completeDinoAdventureStage");
  const retryBoss = extractFunction(game, "startDinoBossAttempt");
  check(/trainHp=Math\.max\(0,boss\.trainHp-1\)/.test(failDefense), "single-defense-damage");
  check(!/trainHp\s*=|trainHp--|trainHp\s*-=/.test(missWindow), "safe-window-miss");
  check(/boss\.phase!==["']burst["']|boss\.phase!==\"burst\"/.test(hitBoss) && /!boss\.burstOpen/.test(hitBoss), "hit-window-gate");
  check(/bossHp=Math\.max\(0,boss\.bossHp-1\)/.test(hitBoss) && /waterCharge=Math\.max\(0,boss\.waterCharge-1\)/.test(hitBoss), "single-hit-transaction");
  check(/completionCount>0/.test(completeStage) && /completionCount\+\+/.test(completeStage), "completion-idempotency");
  check(/water\.waterCharges/.test(retryBoss) && /retryCount/.test(retryBoss), "boss-only-retry");

  const dinoStrings = childFacingLiterals(`${html}\n${dinoAdventureSource(game)}`);
  for (const literal of dinoStrings) check(!/[一-龠々]/.test(literal), "kana-ui", literal);

  return { errors, checks };
}

function replaceExactlyOnce(source, from, to) {
  const count = source.split(from).length - 1;
  assert.equal(count, 1, `mutation anchor count for ${from}: ${count}`);
  return source.replace(from, to);
}

function sourceMutation(name, expectedCode, mutate) {
  const candidate = mutate({ ...original });
  const result = validate(candidate);
  assert.ok(result.errors.some(error => error === expectedCode || error.startsWith(`${expectedCode}:`)), `${name}: mutation survived; errors=${result.errors.join(", ")}`);
}

function testStateFactory(game) {
  const body = extractFunction(game, "createDinoAdventureState");
  assert.ok(body, "state factory missing");
  const context = {
    DINO_WATER_START: numericConstant(game, "DINO_WATER_START"),
    DINO_WATER_DIG_BUDGET: numericConstant(game, "DINO_WATER_DIG_BUDGET"),
    DINO_BOSS_HP: numericConstant(game, "DINO_BOSS_HP"),
    DINO_BOSS_TRAIN_HP: numericConstant(game, "DINO_BOSS_TRAIN_HP"),
    DINO_BOSS_WATER_CHARGES: numericConstant(game, "DINO_BOSS_WATER_CHARGES"),
    Set
  };
  vm.createContext(context);
  vm.runInContext(`${body};this.make=createDinoAdventureState;`, context);
  const first = context.make();
  const second = context.make();
  assert.equal(first.phase, "idle");
  assert.equal(first.water.budget, 9);
  assert.deepEqual(Array.from(first.water.route), [14]);
  assert.equal(first.boss.bossHp, 3);
  assert.equal(first.boss.trainHp, 3);
  assert.equal(first.boss.waterCharge, 3);
  first.water.route.push(99);
  first.boss.activeHornPointers.add(7);
  assert.deepEqual(Array.from(second.water.route), [14], "water route leaked between runs");
  assert.equal(second.boss.activeHornPointers.size, 0, "horn pointer set leaked between runs");
}

function testDeterministicRuntimeTransactions(game) {
  const constants = {
    DINO_WATER_ROWS: numericConstant(game, "DINO_WATER_ROWS"),
    DINO_WATER_COLS: numericConstant(game, "DINO_WATER_COLS"),
    DINO_WATER_START: numericConstant(game, "DINO_WATER_START"),
    DINO_WATER_GOAL: numericConstant(game, "DINO_WATER_GOAL"),
    DINO_WATER_DIG_BUDGET: numericConstant(game, "DINO_WATER_DIG_BUDGET"),
    DINO_WATER_ROCKS: extractArrayConstant(game, "DINO_WATER_ROCKS"),
    DINO_BOSS_HP: numericConstant(game, "DINO_BOSS_HP"),
    DINO_BOSS_TRAIN_HP: numericConstant(game, "DINO_BOSS_TRAIN_HP"),
    DINO_BOSS_WATER_CHARGES: numericConstant(game, "DINO_BOSS_WATER_CHARGES"),
    DINO_BOSS_INTRO_MS: numericConstant(game, "DINO_BOSS_INTRO_MS"),
    DINO_BOSS_HIT_MS: numericConstant(game, "DINO_BOSS_HIT_MS"),
    DINO_BOSS_SCORE: numericConstant(game, "DINO_BOSS_SCORE")
  };
  let completeCalls = 0;
  const context = {
    ...constants,
    Math,
    Set,
    performance: { now: () => 1000 },
    prefersReducedMotionActive: () => false,
    dinoAdventureState: null,
    dinoAdventureLayer: null,
    dinoWaterGame: null,
    dinoBossGame: null,
    dinoWaterRetry: null,
    dinoBossRetry: null,
    dinoWaterGrid: null,
    dinoBossAction: { classList: { remove() {} } },
    document: { body: { classList: { remove() {} } } },
    playing: true,
    stg: 8,
    stageMiss: 0,
    syncDinoWaterPresentation() {},
    dinoAdventureSetGuide() {},
    updateDinoBossHud() {},
    clearDinoBossPointers() {
      const boss = context.dinoAdventureState.boss;
      boss.brakeHeld = false;
      boss.brakePointerId = null;
      boss.activeHornPointers.clear();
    },
    dinoAdventureSetPhase(phase, duration = 0) {
      const state = context.dinoAdventureState;
      state.phase = phase;
      state.phaseEndAt = duration ? 1000 + duration : 0;
      if (phase.startsWith("boss-")) state.boss.phase = phase.slice(5);
    },
    tone() {},
    sndNG() {},
    sndFan() {},
    showStamp() {},
    setDriverMood() {},
    drawDots() {},
    addScore() {},
    confetti() {},
    announce() {},
    isDinoAdventureStage: () => true,
    origin: value => value,
    completeCurrentStage() { completeCalls += 1; }
  };
  const runtimeNames = [
    "createDinoAdventureState", "dinoAdventureNow", "dinoAdventureDuration",
    "dinoWaterCoordinates", "dinoWaterIndexAt", "dinoWaterKind", "dinoWaterAdjacent",
    "traceDinoWaterCell", "failDinoBossDefense", "missDinoBossAttackWindow",
    "hitDinoBoss", "completeDinoAdventureStage", "startDinoBossAttempt"
  ];
  const runtimeSource = runtimeNames.map(name => extractFunction(game, name)).join("\n");
  assert.ok(runtimeNames.every(name => extractFunction(game, name)), "deterministic runtime extraction incomplete");
  vm.createContext(context);
  vm.runInContext(`${runtimeSource};this.runtime={${runtimeNames.join(",")}};`, context);
  context.dinoAdventureState = context.runtime.createDinoAdventureState();
  context.dinoAdventureState.phase = "water";

  assert.equal(context.runtime.dinoWaterAdjacent(14, 15), true, "horizontal water adjacency rejected");
  assert.equal(context.runtime.dinoWaterAdjacent(14, 21), true, "vertical water adjacency rejected");
  assert.equal(context.runtime.dinoWaterAdjacent(14, 16), false, "water path jumped over a cell");
  assert.equal(context.runtime.traceDinoWaterCell(15), true);
  assert.equal(context.dinoAdventureState.water.budget, 8);
  assert.equal(context.runtime.traceDinoWaterCell(14), true, "one-cell backtrack rejected");
  assert.equal(context.dinoAdventureState.water.budget, 9, "backtracking did not refund one dig");
  assert.equal(context.runtime.traceDinoWaterCell(15), true);
  assert.equal(context.runtime.traceDinoWaterCell(16), false, "rock cell was accepted");
  assert.equal(context.dinoAdventureState.water.budget, 8, "rejected rock consumed budget");
  context.dinoAdventureState = context.runtime.createDinoAdventureState();
  context.dinoAdventureState.phase = "water";
  for (const index of extractArrayConstant(game, "DINO_WATER_SOLUTION").slice(1)) {
    assert.equal(context.runtime.traceDinoWaterCell(index), true, `canonical water route rejected at ${index}`);
  }
  assert.equal(context.dinoAdventureState.water.route.at(-1), constants.DINO_WATER_GOAL);
  assert.equal(context.dinoAdventureState.water.budget, 2, "finite water budget transaction drifted");

  context.dinoAdventureState = context.runtime.createDinoAdventureState();
  const boss = context.dinoAdventureState.boss;
  assert.equal(context.runtime.hitDinoBoss(), false, "boss took damage outside burst");
  boss.phase = "burst";
  boss.burstOpen = true;
  assert.equal(context.runtime.hitDinoBoss(), true, "valid burst hit was rejected");
  assert.equal(boss.bossHp, 2, "valid hit did not remove exactly one boss HP");
  assert.equal(boss.waterCharge, 2, "valid hit did not consume exactly one water charge");
  assert.equal(context.runtime.hitDinoBoss(), false, "same burst was counted twice");
  assert.equal(boss.bossHp, 2);
  assert.equal(boss.waterCharge, 2);

  context.dinoAdventureState = context.runtime.createDinoAdventureState();
  const beforeMiss = { ...context.dinoAdventureState.boss };
  context.dinoAdventureState.boss.phase = "charge";
  context.runtime.missDinoBossAttackWindow("miss", 1000);
  assert.equal(context.dinoAdventureState.boss.trainHp, beforeMiss.trainHp, "window miss damaged train");
  assert.equal(context.dinoAdventureState.boss.bossHp, beforeMiss.bossHp, "window miss damaged boss");
  assert.equal(context.dinoAdventureState.boss.waterCharge, beforeMiss.waterCharge, "window miss consumed water");

  context.dinoAdventureState = context.runtime.createDinoAdventureState();
  for (let failure = 0; failure < 3; failure += 1) {
    const hpBefore = context.dinoAdventureState.boss.trainHp;
    context.dinoAdventureState.boss.phase = "defend";
    context.dinoAdventureState.phase = "boss-defend";
    context.runtime.failDinoBossDefense("fail", 1000 + failure);
    assert.equal(context.dinoAdventureState.boss.trainHp, hpBefore - 1, "one defense phase removed other than one train HP");
  }
  assert.equal(context.dinoAdventureState.boss.phase, "lost");
  context.dinoAdventureState.water.completed = true;
  context.dinoAdventureState.water.waterCharges = 3;
  context.runtime.startDinoBossAttempt(true);
  assert.equal(context.dinoAdventureState.water.completed, true, "boss retry replayed/reset the water event");
  assert.equal(context.dinoAdventureState.boss.bossHp, 3);
  assert.equal(context.dinoAdventureState.boss.trainHp, 3);
  assert.equal(context.dinoAdventureState.boss.retryCount, 1);

  context.dinoAdventureState.boss.bossHp = 0;
  context.runtime.completeDinoAdventureStage();
  context.runtime.completeDinoAdventureStage();
  assert.equal(context.dinoAdventureState.completionCount, 1, "stage completion was not one-shot");
  assert.equal(completeCalls, 1, "branch rejoin was dispatched more than once");
}

const mime = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg"
});

const QA_TOKEN = "dino-adventure-qa-1411";

function adminHarnessHtml() {
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><title>dino qa</title>
    <style>html,body,iframe{margin:0;width:100%;height:100%;border:0;overflow:hidden}iframe{display:block}</style>
    <iframe id="game" allow="autoplay" src="/nazonazo-tunnel/?weather=clear&adminStagePreview=1&adminPreviewToken=${QA_TOKEN}#fast"></iframe>
    <script>
      const frame=document.getElementById("game");
      const channel="pono-nazonazo-admin-stage-v1";
      window.__dinoQaMessages=[];
      window.addEventListener("message",event=>{
        if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
        const data=event.data||{};
        if(data.channel!==channel||data.token!=="${QA_TOKEN}")return;
        window.__dinoQaMessages.push(data);
        if(data.type==="ready")window.qaSelect("dino");
      });
      window.qaSelect=(stageId="dino")=>frame.contentWindow.postMessage({channel,type:"select",token:"${QA_TOKEN}",stageId,previewKind:"stage"},location.origin);
    <\/script></html>`;
}

async function startServer() {
  if (process.env.NAZONAZO_BASE_URL) {
    return { base: process.env.NAZONAZO_BASE_URL.replace(/\/$/, ""), close: async () => {}, external: true };
  }
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === "/admin/dino-adventure-qa.html") {
      response.writeHead(200, { "content-type": mime[".html"], "cache-control": "no-store" });
      if (request.method === "HEAD") return response.end();
      return response.end(adminHarnessHtml());
    }
    if (pathname === "/admin/" && request.method === "HEAD") {
      response.writeHead(200, { "content-type": mime[".html"], "cache-control": "no-store", "content-length": "0" });
      return response.end();
    }
    const relative = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
    const full = path.resolve(root, `.${relative}`);
    if (full !== root && !full.startsWith(`${root}${path.sep}`)) return response.writeHead(403).end("forbidden");
    const slowAssetDelayMs = Math.max(0, Number(process.env.NAZONAZO_SLOW_DINO_ASSETS_MS) || 0);
    const isDinoAdventureAsset = DINO_ASSET_FILES.includes(path.basename(full));
    const serveFile = () => fs.readFile(full, (error, body) => {
      if (error) return response.writeHead(error.code === "ENOENT" ? 404 : 500).end("not found");
      response.writeHead(200, {
        "content-type": mime[path.extname(full)] || "application/octet-stream",
        "cache-control": slowAssetDelayMs && isDinoAdventureAsset ? "public, max-age=3600" : "no-store"
      });
      if (request.method === "HEAD") return response.end();
      response.end(body);
    });
    if (slowAssetDelayMs && isDinoAdventureAsset) setTimeout(serveFile, slowAssetDelayMs);
    else serveFile();
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)), external: false };
}

async function snapshot(frame) {
  return frame.evaluate(() => {
    const debug = window.__nazonazoDinoAdventureDebug;
    if (!debug || typeof debug.snapshot !== "function") return null;
    return debug.snapshot();
  });
}

async function waitSnapshot(frame, predicate, message, timeout = 15000) {
  const started = Date.now();
  let latest = null;
  while (Date.now() - started < timeout) {
    latest = await snapshot(frame);
    if (latest && predicate(latest)) return latest;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  assert.fail(`${message}; latest=${JSON.stringify(latest)}`);
}

async function runBrowser(browserName, base) {
  const { chromium, webkit } = require("playwright");
  const browserType = browserName.startsWith("webkit") ? webkit : chromium;
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, reducedMotion: "no-preference" });
  await context.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    localStorage.setItem("pono_nazonazo_tunnel_v1", JSON.stringify({
      schemaVersion: 1,
      lastLevel: 0,
      unlockedLoop: 0,
      bestStarsByStage: { "0-0": 3 },
      collectedFriends: [],
      highScore: 1250
    }));
  });
  const page = await context.newPage();
  const pageErrors = [];
  const requestFailures = [];
  const adventureAssetResponses = new Map();
  const slowAssetDelayMs = Math.max(0, Number(process.env.NAZONAZO_SLOW_DINO_ASSETS_MS) || 0);
  const qaMetrics = { slowAssetDelayMs, viewports: [], boss: {} };
  page.on("pageerror", error => pageErrors.push(String(error)));
  page.on("requestfailed", request => requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ""}`));
  page.on("response", response => {
    const file = path.basename(new URL(response.url()).pathname);
    if (!DINO_ASSET_FILES.includes(file)) return;
    const statuses = adventureAssetResponses.get(file) || [];
    statuses.push(response.status());
    adventureAssetResponses.set(file, statuses);
  });
  await page.goto(`${base}/admin/dino-adventure-qa.html`, { waitUntil: slowAssetDelayMs ? "domcontentloaded" : "networkidle" });
  let frame = page.frames().find(candidate => /\/nazonazo-tunnel\//.test(candidate.url()));
  const frameDeadline = Date.now() + 15000;
  while (!frame && Date.now() < frameDeadline) {
    await new Promise(resolve => setTimeout(resolve, 40));
    frame = page.frames().find(candidate => /\/nazonazo-tunnel\//.test(candidate.url()));
  }
  assert.ok(frame, `${browserName}: preview iframe missing`);
  async function assertRenderedImage(locator, expectedFile, label) {
    const metrics = await locator.evaluate(image => {
      const rect = image.getBoundingClientRect();
      const style = getComputedStyle(image);
      return {
        src: image.getAttribute("src"),
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        width: rect.width,
        height: rect.height,
        display: style.display,
        visibility: style.visibility
      };
    });
    assert.equal(metrics.src && metrics.src.split("/").at(-1), expectedFile, `${browserName}: wrong image in ${label}: ${metrics.src}`);
    assert.equal(metrics.complete, true, `${browserName}: ${label} revealed before image load completed`);
    assert.ok(metrics.naturalWidth > 0 && metrics.naturalHeight > 0, `${browserName}: ${label} revealed a blank image: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.width > 0 && metrics.height > 0 && metrics.display !== "none" && metrics.visibility !== "hidden", `${browserName}: ${label} image is not visibly laid out: ${JSON.stringify(metrics)}`);
    await locator.evaluate(image => image.decode());
    await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const paintedSrc = await locator.getAttribute("src");
    assert.equal(paintedSrc && paintedSrc.split("/").at(-1), expectedFile, `${browserName}: image advanced before ${label} painted: ${paintedSrc}`);
    return metrics;
  }
  await frame.locator("#startBtn").waitFor({ state: "visible", timeout: 15000 });
  await frame.waitForFunction(() => !document.getElementById("startBtn").disabled && /きょうりゅう/.test(document.getElementById("startBtn").textContent), null, { timeout: 15000 });
  const saveBefore = await frame.evaluate(() => localStorage.getItem("pono_nazonazo_tunnel_v1"));
  const journeyStartedAt = Date.now();
  await frame.locator("#startBtn").click();
  const initial = await waitSnapshot(frame, state => state.phase === "water" || state.phase === "water-ready", `${browserName}: water event did not start`, 20000);
  qaMetrics.waterRevealMs = Date.now() - journeyStartedAt;
  if (slowAssetDelayMs) {
    assert.ok(qaMetrics.waterRevealMs < slowAssetDelayMs + 6000, `${browserName}: water reveal wait was excessive: ${qaMetrics.waterRevealMs}ms`);
  }
  assert.equal(initial.eventIndex, 0);
  assert.equal(initial.boss.bossHp, 3);
  assert.equal(initial.boss.trainHp, 3);
  assert.equal(initial.water.budget, 9);
  await assertRenderedImage(frame.locator("#dinoWaterDinos"), "branch_dino_adventure_waterway_dry_20260722.webp", "water dry");
  assert.equal(await frame.locator("#quiz.show").count(), 0, `${browserName}: dino opened a quiz`);
  assert.equal(await frame.locator(".tun:visible").count(), 0, `${browserName}: dino built visible quiz stations`);
  assert.equal(await frame.locator("[class*='crane']:visible").count(), 0, `${browserName}: dino built a visible crane`);

  const viewports = [[390, 844], [844, 390], [1024, 768], [1366, 768]];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const fit = await frame.evaluate(() => {
      const gridRect = document.getElementById("dinoWaterGrid").getBoundingClientRect();
      return {
        overflowX: document.documentElement.scrollWidth - innerWidth,
        overflowY: document.documentElement.scrollHeight - innerHeight,
        layerPhase: document.getElementById("dinoAdventureLayer").dataset.phase,
        adminSettingsHidden: getComputedStyle(document.getElementById("gameSettings")).display === "none",
        baseDotsHidden: getComputedStyle(document.getElementById("dots")).visibility === "hidden",
        gridInside: gridRect.left >= -1 && gridRect.right <= innerWidth + 1 && gridRect.top >= -1 && gridRect.bottom <= innerHeight + 1
      };
    });
    assert.ok(fit.overflowX <= 1 && fit.overflowY <= 1, `${browserName}: overflow ${width}x${height}: ${JSON.stringify(fit)}`);
    assert.ok(fit.layerPhase && fit.layerPhase !== "idle", `${browserName}: resize reset adventure at ${width}x${height}`);
    assert.equal(fit.adminSettingsHidden, true, `${browserName}: admin-only settings suppression drifted at ${width}x${height}`);
    assert.equal(fit.baseDotsHidden, true, `${browserName}: quiz station dots leaked behind dino header at ${width}x${height}`);
    assert.equal(fit.gridInside, true, `${browserName}: water grid clipped at ${width}x${height}`);
    qaMetrics.viewports.push({ width, height, overflowX: fit.overflowX, overflowY: fit.overflowY, gridInside: fit.gridInside });
    await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-water-${width}x${height}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 844, height: 390 });

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedMotion = await frame.evaluate(() => ({
    water: getComputedStyle(document.querySelector(".dino-water-scene img")).animationName,
    trex: getComputedStyle(document.getElementById("dinoBossTrex")).animationName,
    action: getComputedStyle(document.getElementById("dinoBossAction")).animationName
  }));
  assert.deepEqual(reducedMotion, { water: "none", trex: "none", action: "none" }, `${browserName}: reduced motion left dino animation active`);
  assert.notEqual((await snapshot(frame)).phase, "idle", `${browserName}: reduced-motion switch reset event`);
  await page.emulateMedia({ reducedMotion: "no-preference" });

  const waterMetrics = await frame.evaluate(() => {
    const grid = document.getElementById("dinoWaterGrid").getBoundingClientRect();
    const retry = document.getElementById("dinoWaterRetry").getBoundingClientRect();
    const cells = [...document.querySelectorAll("#dinoWaterGrid [data-row][data-col]")].map(element => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    const goalLabel = document.querySelector(".dino-water-goal strong");
    return {
      grid: { left: grid.left, right: grid.right, top: grid.top, bottom: grid.bottom },
      retry: { width: retry.width, height: retry.height },
      goalLabel: { whiteSpace: getComputedStyle(goalLabel).whiteSpace, scrollWidth: goalLabel.scrollWidth, clientWidth: goalLabel.clientWidth },
      cells
    };
  });
  assert.equal(waterMetrics.cells.length, 28, `${browserName}: water grid needs 28 runtime cells`);
  assert.ok(waterMetrics.cells.every(cell => cell.width >= 38 && cell.height >= 38), `${browserName}: undersized water cell`);
  assert.equal(waterMetrics.goalLabel.whiteSpace, "nowrap", `${browserName}: dinosaur goal label can split mid-word`);
  assert.ok(waterMetrics.goalLabel.scrollWidth <= waterMetrics.goalLabel.clientWidth + 1, `${browserName}: dinosaur goal label is clipped`);

  const waterGrid = frame.locator("#dinoWaterGrid");
  await waterGrid.focus();
  await waterGrid.press("ArrowRight");
  const keyboardStep = await waitSnapshot(frame, state => state.water.route.length === 2, `${browserName}: ArrowRight did not trace one adjacent water cell`);
  assert.deepEqual(keyboardStep.water.route.at(-1), { row: 2, col: 1 });
  assert.equal(keyboardStep.water.budget, 8);
  await waterGrid.press("Backspace");
  const keyboardBacktrack = await waitSnapshot(frame, state => state.water.route.length === 1, `${browserName}: Backspace did not undo one water cell`);
  assert.equal(keyboardBacktrack.water.budget, 9);
  await waterGrid.press("Enter");
  assert.equal((await snapshot(frame)).phase, "water", `${browserName}: Enter resolved an empty water route`);

  // The implementation exposes a read-only solution only in the authenticated admin preview.
  // Input still travels through the real pointer handlers; the debug hook cannot mutate state.
  const solution = initial.water.solution.map(point => point.row * 7 + point.col);
  assert.ok(Array.isArray(solution) && solution.length >= 4, `${browserName}: admin snapshot solution missing`);
  async function trace(indices) {
    const boxes = [];
    for (const index of indices) {
      const row = Math.floor(index / 7);
      const col = index % 7;
      const locator = frame.locator(`#dinoWaterGrid [data-row="${row}"][data-col="${col}"]`);
      const box = await locator.boundingBox();
      assert.ok(box, `${browserName}: water cell ${index} missing`);
      boxes.push(box);
    }
    await page.mouse.move(boxes[0].x + boxes[0].width / 2, boxes[0].y + boxes[0].height / 2);
    await page.mouse.down();
    for (const box of boxes.slice(1)) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 });
    await page.mouse.up();
  }

  await trace(solution.slice(0, 2));
  const failedWater = await waitSnapshot(frame, state => state.water.awaitingRetry === true, `${browserName}: incomplete water route did not fail`);
  assert.equal(failedWater.water.attempt, 1);
  assert.ok(failedWater.water.budget < 9 && failedWater.water.budget >= 0);
  assert.equal(await frame.locator("#dinoWaterRetry").isVisible(), true);
  await frame.locator("#dinoWaterRetry").press("Enter");
  const retriedWater = await waitSnapshot(frame, state => !state.water.awaitingRetry && state.water.route.length === 1, `${browserName}: water retry did not reset only the event`);
  assert.equal(retriedWater.water.attempt, 2);

  await trace(solution);
  const savedWater = await waitSnapshot(frame, state => state.water.completed && state.phase === "resolve-water", `${browserName}: water success tableau did not appear`, 12000);
  const waterSavedAt = Date.now();
  assert.equal(savedWater.eventIndex, 1);
  assert.equal(await frame.locator("#dinoWaterGame.is-saved").count(), 1, `${browserName}: water success class missing`);
  await assertRenderedImage(frame.locator("#dinoWaterDinos"), "branch_dino_adventure_waterway_success_20260722.webp", "water success");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-water-success-844x390.png`, fullPage: true });
  const afterWater = await waitSnapshot(frame, state => state.water.completed && state.eventIndex === 1 && state.boss.phase !== "idle", `${browserName}: water did not transition directly to boss once`, 20000);
  qaMetrics.bossRevealAfterWaterMs = Date.now() - waterSavedAt;
  assert.equal(afterWater.transitionCount >= 1, true);
  assert.equal(afterWater.boss.waterCharge, 3);

  // A hidden tab pauses phase clocks and cannot spend HP or water.
  const beforeHidden = await snapshot(frame);
  await frame.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(450);
  const whileHidden = await snapshot(frame);
  assert.equal(whileHidden.boss.bossHp, beforeHidden.boss.bossHp);
  assert.equal(whileHidden.boss.trainHp, beforeHidden.boss.trainHp);
  assert.equal(whileHidden.boss.waterCharge, beforeHidden.boss.waterCharge);
  await frame.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  async function waitBossPhase(phase, timeout = 12000) {
    return waitSnapshot(frame, state => state.phase === `boss-${phase}` && state.boss.phase === phase, `${browserName}: boss phase ${phase} missing`, timeout);
  }
  async function bossGeometry(label) {
    const metrics = await frame.evaluate(() => {
      const guide = document.getElementById("dinoAdventureGuide").getBoundingClientRect();
      const hud = document.querySelector(".dino-boss-hud").getBoundingClientRect();
      const overlapWidth = Math.max(0, Math.min(guide.right, hud.right) - Math.max(guide.left, hud.left));
      const overlapHeight = Math.max(0, Math.min(guide.bottom, hud.bottom) - Math.max(guide.top, hud.top));
      return {
        guide: { top: guide.top, bottom: guide.bottom, left: guide.left, right: guide.right },
        hud: { top: hud.top, bottom: hud.bottom, left: hud.left, right: hud.right },
        overlapWidth,
        overlapHeight,
        overlapArea: overlapWidth * overlapHeight
      };
    });
    assert.equal(metrics.overlapArea, 0, `${browserName}: guide overlaps boss HUD in ${label}: ${JSON.stringify(metrics)}`);
    qaMetrics.boss[label] = metrics;
    return metrics;
  }
  async function assertBossTrexAsset(expectedFile, label) {
    const trex = frame.locator("#dinoBossTrex");
    await assertRenderedImage(trex, expectedFile, `T-Rex ${label}`);
  }

  await waitBossPhase("telegraph");
  await assertBossTrexAsset("branch_dino_adventure_trex_inhale_cutout_20260722.webp", "telegraph");
  await bossGeometry("telegraph");
  await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-boss-telegraph-844x390.png`, fullPage: true });

  // Rotating during a timed boss phase must suspend the deadline and discard
  // any captured pointer/focus before the landscape interaction resumes.
  const beforePortrait = await waitBossPhase("defend");
  const portraitAction = frame.locator("#dinoBossAction");
  const portraitActionBox = await portraitAction.boundingBox();
  assert.ok(portraitActionBox, `${browserName}: boss action missing before portrait pause`);
  await page.mouse.move(portraitActionBox.x + portraitActionBox.width / 2, portraitActionBox.y + portraitActionBox.height / 2);
  await page.mouse.down();
  await waitSnapshot(frame, state => state.boss.brakeHeld && state.boss.pointerId !== null, `${browserName}: boss pointer was not captured before portrait pause`);
  await page.setViewportSize({ width: 390, height: 844 });
  await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.mouse.up();
  await page.waitForTimeout(3100);
  const whilePortrait = await snapshot(frame);
  const portraitDom = await frame.evaluate(() => ({
    rotateVisible: getComputedStyle(document.getElementById("rotateHint")).display !== "none",
    actionFocused: document.activeElement === document.getElementById("dinoBossAction")
  }));
  assert.equal(portraitDom.rotateVisible, true, `${browserName}: portrait rotation hint missing during boss pause`);
  assert.equal(portraitDom.actionFocused, false, `${browserName}: stale boss focus survived portrait pause`);
  assert.equal(whilePortrait.phase, beforePortrait.phase, `${browserName}: portrait advanced the timed boss phase`);
  assert.equal(whilePortrait.boss.phase, beforePortrait.boss.phase, `${browserName}: portrait advanced the boss state`);
  assert.equal(whilePortrait.transitionCount, beforePortrait.transitionCount, `${browserName}: portrait committed a boss transition`);
  assert.equal(whilePortrait.boss.bossHp, beforePortrait.boss.bossHp, `${browserName}: portrait damaged the boss`);
  assert.equal(whilePortrait.boss.trainHp, beforePortrait.boss.trainHp, `${browserName}: portrait damaged the train`);
  assert.equal(whilePortrait.boss.waterCharge, beforePortrait.boss.waterCharge, `${browserName}: portrait consumed water`);
  assert.equal(whilePortrait.boss.brakeHeld, false, `${browserName}: stale brake hold survived portrait pause`);
  assert.equal(whilePortrait.boss.pointerId, null, `${browserName}: stale boss pointer survived portrait pause`);
  await page.setViewportSize({ width: 844, height: 390 });
  await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const afterPortrait = await snapshot(frame);
  assert.equal(afterPortrait.phase, beforePortrait.phase, `${browserName}: landscape resume skipped the paused phase`);
  assert.equal(afterPortrait.transitionCount, beforePortrait.transitionCount, `${browserName}: landscape resume duplicated a transition`);
  assert.equal(afterPortrait.boss.pointerId, null, `${browserName}: landscape resume restored a stale pointer`);

  let burstScreenshotTaken = false;
  let defendScreenshotTaken = false;
  let hitScreenshotTaken = false;
  let tiredAssetChecked = false;
  async function holdBrake(input = "pointer") {
    await waitBossPhase("defend");
    if (!defendScreenshotTaken) {
      defendScreenshotTaken = true;
      await assertBossTrexAsset("branch_dino_adventure_trex_roar_cutout_20260722.webp", "defend");
      await bossGeometry("defend");
      await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-boss-defend-844x390.png`, fullPage: true });
    }
    const button = frame.locator("#dinoBossAction");
    if (input === "keyboard") {
      await button.focus();
      await button.press("Space", { delay: 1750 });
    } else {
      const box = await button.boundingBox();
      assert.ok(box);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(1750);
      await page.mouse.up();
    }
  }
  async function hornAndBurst() {
    await waitBossPhase("charge");
    if (!tiredAssetChecked) {
      tiredAssetChecked = true;
      await assertBossTrexAsset("branch_dino_adventure_trex_tired_cutout_20260722.webp", "charge");
    }
    const action = frame.locator("#dinoBossAction");
    const before = await snapshot(frame);
    await action.click();
    const onePhysicalTap = await snapshot(frame);
    assert.ok(onePhysicalTap.boss.hornCharge > before.boss.hornCharge, `${browserName}: horn pointer did not charge`);
    assert.ok(onePhysicalTap.boss.hornCharge - before.boss.hornCharge <= 0.2, `${browserName}: pointerdown+click double-counted`);
    for (let index = 0; index < 30; index += 1) {
      await action.click();
      await page.waitForTimeout(95);
      const state = await snapshot(frame);
      if (state.boss.phase === "burst") break;
    }
    await waitBossPhase("burst");
    if (!burstScreenshotTaken) {
      burstScreenshotTaken = true;
      await bossGeometry("burst");
      await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-boss-burst-844x390.png`, fullPage: true });
    }
    const hpBefore = (await snapshot(frame)).boss.bossHp;
    await page.waitForTimeout(90);
    await action.press("Space");
    const hit = await waitSnapshot(frame, state => state.boss.bossHp === hpBefore - 1, `${browserName}: successful burst did not remove exactly one boss HP`, 5000);
    assert.equal(hit.boss.bossHp, hpBefore - 1);
    if (!hitScreenshotTaken) {
      hitScreenshotTaken = true;
      await assertBossTrexAsset("branch_dino_adventure_trex_step_back_cutout_20260722.webp", "hit");
      await bossGeometry("hit");
      await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-boss-hit-844x390.png`, fullPage: true });
    }
    return hit;
  }

  // Missing only the attack window must not hurt the train.
  await holdBrake();
  const safeBeforeMiss = await waitBossPhase("charge");
  const safeAfterMiss = await waitSnapshot(frame, state => state.boss.phase === "fail" || state.boss.phase === "telegraph", `${browserName}: missed attack window did not advance safely`, 12000);
  assert.equal(safeAfterMiss.boss.trainHp, safeBeforeMiss.boss.trainHp, `${browserName}: window miss incorrectly damaged train`);
  assert.equal(safeAfterMiss.boss.bossHp, safeBeforeMiss.boss.bossHp, `${browserName}: missed window damaged boss`);
  assert.equal(safeAfterMiss.boss.waterCharge, safeBeforeMiss.boss.waterCharge, `${browserName}: missed window consumed water`);

  // Three distinct failed defenses remove one train HP each and trigger a boss-only retry.
  for (let expectedHp = 2; expectedHp >= 0; expectedHp -= 1) {
    const beforeFailure = await waitSnapshot(frame, state => state.boss.phase === "defend", `${browserName}: defense ${3 - expectedHp} missing`, 12000);
    const afterFailure = await waitSnapshot(frame, state => state.boss.trainHp === expectedHp, `${browserName}: failed defense did not remove exactly one train HP`, 8000);
    assert.equal(beforeFailure.boss.trainHp - afterFailure.boss.trainHp, 1, `${browserName}: one defense phase removed multiple train HP`);
    assert.equal(afterFailure.boss.waterCharge, 3, `${browserName}: defense failure consumed water charge`);
  }
  const lost = await waitBossPhase("lost");
  assert.equal(lost.boss.trainHp, 0);
  await assertBossTrexAsset("branch_dino_adventure_trex_waiting_cutout_20260722.webp", "lost");
  assert.equal(lost.water.completed, true, `${browserName}: boss loss reset water completion`);
  assert.equal(lost.eventIndex, 1, `${browserName}: boss loss changed event position`);
  assert.equal(await frame.locator("#dinoBossRetry").isVisible(), true, `${browserName}: boss retry button missing`);
  assert.equal(await frame.locator("#dinoBossAction:visible").count(), 0, `${browserName}: boss action remained visible after loss`);
  assert.equal(await frame.locator("#dinoWaterGame:visible").count(), 0, `${browserName}: water event replayed on boss loss`);
  await bossGeometry("lost");
  await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-boss-lost-844x390.png`, fullPage: true });
  await frame.locator("#dinoBossRetry").press("Enter");
  const retry = await waitSnapshot(frame, state => state.boss.retryCount === 1 && ["intro", "telegraph", "defend"].includes(state.boss.phase), `${browserName}: keyboard boss-only retry failed`);
  assert.equal(retry.boss.bossHp, 3);
  assert.equal(retry.boss.trainHp, 3);
  assert.equal(retry.boss.waterCharge, 3);
  assert.equal(retry.water.completed, true);

  // Finish from the current state. Every hit must be exactly one HP transaction.
  let firstWinRound = true;
  while ((await snapshot(frame)).boss.bossHp > 0) {
    await waitSnapshot(frame, state => ["telegraph", "defend"].includes(state.boss.phase), `${browserName}: boss did not start next round`, 12000);
    await holdBrake(firstWinRound ? "keyboard" : "pointer");
    const beforeHit = await snapshot(frame);
    const hit = await hornAndBurst();
    assert.equal(beforeHit.boss.waterCharge - hit.boss.waterCharge, 1, `${browserName}: successful hit did not consume one water charge`);
    firstWinRound = false;
  }
  const victory = await waitBossPhase("victory", 12000);
  assert.equal(victory.boss.bossHp, 0);
  await assertBossTrexAsset("branch_dino_adventure_trex_yield_cutout_20260722.webp", "victory");
  assert.equal(await frame.locator("#dinoBossAction:visible").count(), 0, `${browserName}: boss action remained visible after victory`);
  await bossGeometry("victory");
  await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-boss-victory-844x390.png`, fullPage: true });
  const won = await waitSnapshot(frame, state => state.completionCount === 1 || state.phase === "complete", `${browserName}: boss victory did not commit once`, 20000);
  assert.equal(won.boss.bossHp, 0);
  assert.equal(won.completionCount, 1);
  await frame.waitForFunction(() => document.body.classList.contains("st-number"), null, { timeout: 30000 });
  assert.equal(await frame.locator("#dinoAdventureLayer:visible").count(), 0, `${browserName}: dino layer survived branch rejoin`);

  const saveAfter = await frame.evaluate(() => localStorage.getItem("pono_nazonazo_tunnel_v1"));
  assert.equal(saveAfter, saveBefore, `${browserName}: admin preview mutated save data`);
  const assetLoadReport = Object.fromEntries(DINO_ASSET_FILES.map(file => [file, adventureAssetResponses.get(file) || []]));
  const invalidAssetResponses = DINO_ASSET_FILES.filter(file => assetLoadReport[file].length !== 1 || assetLoadReport[file][0] !== 200);
  assert.deepEqual(invalidAssetResponses, [], `${browserName}: dino adventure assets were missing, failed, or requested more than once: ${JSON.stringify(assetLoadReport)}`);
  qaMetrics.assets = assetLoadReport;
  assert.deepEqual(pageErrors, [], `${browserName}: page errors\n${pageErrors.join("\n")}`);
  const adminHeadAbort = requestFailures.filter(failure => /^HEAD .+\/admin\/ net::ERR_ABORTED$/.test(failure));
  const unexpectedRequestFailures = requestFailures.filter(failure => !adminHeadAbort.includes(failure));
  assert.ok(adminHeadAbort.length <= 1, `${browserName}: repeated admin-auth HEAD aborts\n${adminHeadAbort.join("\n")}`);
  assert.deepEqual(unexpectedRequestFailures, [], `${browserName}: gameplay request failures\n${unexpectedRequestFailures.join("\n")}`);
  await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-844x390.png`, fullPage: true });
  console.log(`nazonazo dino browser metrics (${browserName}): ${JSON.stringify(qaMetrics)}`);
  await context.close();
  await browser.close();
}

async function runSlowStaleRevealBrowser(browserName, base) {
  const slowAssetDelayMs = Math.max(0, Number(process.env.NAZONAZO_SLOW_DINO_ASSETS_MS) || 0);
  if (!slowAssetDelayMs) return;
  const { chromium, webkit } = require("playwright");
  const browserType = browserName.startsWith("webkit") ? webkit : chromium;
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, reducedMotion: "no-preference" });
  await context.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    localStorage.setItem("pono_nazonazo_tunnel_v1", JSON.stringify({
      schemaVersion: 1,
      lastLevel: 0,
      unlockedLoop: 0,
      bestStarsByStage: { "0-0": 3 },
      collectedFriends: [],
      highScore: 1250
    }));
  });
  const page = await context.newPage();
  const pageErrors = [];
  const requestFailures = [];
  page.on("pageerror", error => pageErrors.push(String(error)));
  page.on("requestfailed", request => requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ""}`));
  await page.goto(`${base}/admin/dino-adventure-qa.html`, { waitUntil: "domcontentloaded" });
  let frame = page.frames().find(candidate => /\/nazonazo-tunnel\//.test(candidate.url()));
  const frameDeadline = Date.now() + 15000;
  while (!frame && Date.now() < frameDeadline) {
    await new Promise(resolve => setTimeout(resolve, 40));
    frame = page.frames().find(candidate => /\/nazonazo-tunnel\//.test(candidate.url()));
  }
  assert.ok(frame, `${browserName}: stale-reveal preview iframe missing`);
  await frame.locator("#startBtn").waitFor({ state: "visible", timeout: 15000 });
  await frame.waitForFunction(() => !document.getElementById("startBtn").disabled && /きょうりゅう/.test(document.getElementById("startBtn").textContent), null, { timeout: 15000 });
  await frame.locator("#startBtn").click();
  const travelling = await waitSnapshot(frame, state => state.phase === "travel", `${browserName}: stale-reveal journey did not enter travel`, 5000);
  await page.evaluate(() => window.qaSelect("cat"));
  const reset = await waitSnapshot(frame, state => state.phase === "idle" && state.epoch > travelling.epoch, `${browserName}: stage exit did not invalidate dino epoch`, 5000);
  await frame.waitForFunction(() => document.body.classList.contains("st-cat"), null, { timeout: 5000 });
  await page.waitForTimeout(slowAssetDelayMs + 1200);
  const afterDelay = await snapshot(frame);
  const staleDom = await frame.evaluate(() => ({
    layerHidden: document.getElementById("dinoAdventureLayer").hidden,
    layerAriaHidden: document.getElementById("dinoAdventureLayer").getAttribute("aria-hidden"),
    waterHidden: document.getElementById("dinoWaterGame").hidden,
    bossHidden: document.getElementById("dinoBossGame").hidden,
    activeClass: document.body.classList.contains("dino-adventure-active") || document.body.classList.contains("dino-boss-active")
  }));
  assert.equal(afterDelay.phase, "idle", `${browserName}: stale predecode callback changed phase after stage exit`);
  assert.equal(afterDelay.epoch, reset.epoch, `${browserName}: stale predecode callback changed epoch after stage exit`);
  assert.deepEqual(staleDom, { layerHidden: true, layerAriaHidden: "true", waterHidden: true, bossHidden: true, activeClass: false }, `${browserName}: stale predecode callback revealed dino DOM after stage exit`);
  assert.deepEqual(pageErrors, [], `${browserName}: stale-reveal page errors\n${pageErrors.join("\n")}`);
  const unexpectedRequestFailures = requestFailures.filter(failure => !/^HEAD .+\/admin\/ net::ERR_ABORTED$/.test(failure));
  assert.deepEqual(unexpectedRequestFailures, [], `${browserName}: stale-reveal request failures\n${unexpectedRequestFailures.join("\n")}`);
  console.log(`nazonazo dino stale reveal (${browserName}): PASS (${slowAssetDelayMs}ms delayed assets, epoch ${travelling.epoch}->${reset.epoch})`);
  await context.close();
  await browser.close();
}

async function main() {
  new vm.Script(original.game, { filename: "nazonazo-dino-adventure-game.js" });
  const result = validate(original);
  assert.equal(result.errors.length, 0, `dino source contracts failed (${result.checks} checks):\n${result.errors.join("\n")}`);
  testStateFactory(original.game);
  testDeterministicRuntimeTransactions(original.game);

  sourceMutation("dino falls back to quiz mechanic", "stage-mode", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, 'rejoinId:"number",mechanic:"dinoAdventure"', 'rejoinId:"number",mechanic:"quiz"')
  }));
  sourceMutation("dino rejoins the wrong branch", "branch-rejoin", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, 'rejoinId:"number",mechanic:"dinoAdventure"', 'rejoinId:"sea",mechanic:"dinoAdventure"')
  }));
  sourceMutation("water budget becomes unbounded", "water-budget", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "DINO_WATER_DIG_BUDGET=9", "DINO_WATER_DIG_BUDGET=99")
  }));
  sourceMutation("boss loses its three HP contract", "boss-hp", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "DINO_BOSS_HP=3,DINO_BOSS_TRAIN_HP=3", "DINO_BOSS_HP=4,DINO_BOSS_TRAIN_HP=3")
  }));
  sourceMutation("burst window becomes a reaction trap", "broad-burst-window", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "DINO_BOSS_BURST_MS=[1500,1300,1150]", "DINO_BOSS_BURST_MS=[700,650,600]")
  }));
  sourceMutation("water grid loses keyboard focus", "water-keyboard", candidate => ({
    ...candidate,
    html: replaceExactlyOnce(candidate.html, 'role="grid" tabindex="0"', 'role="grid" tabindex="-1"')
  }));
  sourceMutation("runtime snapshot is removed", "runtime-snapshot", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "window.__nazonazoDinoAdventureDebug=", "window.__removedDinoAdventureDebug=")
  }));
  sourceMutation("attack-window miss damages the train", "safe-window-miss", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "clearDinoBossPointers();boss.roundFailures++;boss.balance=.34", "clearDinoBossPointers();boss.trainHp--;boss.roundFailures++;boss.balance=.34")
  }));
  sourceMutation("one burst removes two boss HP", "single-hit-transaction", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "boss.bossHp=Math.max(0,boss.bossHp-1)", "boss.bossHp=Math.max(0,boss.bossHp-2)")
  }));
  sourceMutation("stage completion loses its one-shot guard", "completion-idempotency", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "if(state.completionCount>0||!playing||!isDinoAdventureStage())return", "if(!playing||!isDinoAdventureStage())return")
  }));
  sourceMutation("reduced motion no longer covers dino interactions", "reduced-motion", candidate => ({
    ...candidate,
    css: replaceExactlyOnce(candidate.css, '  .dino-water-game.is-saved .dino-water-scene img,.dino-water-cell[data-stop="true"],.dino-boss-game[data-phase="defend"] .dino-boss-trex,.dino-boss-wave,.dino-boss-game[data-phase="burst"] .dino-boss-tug>i,.dino-boss-action.is-burst{animation:none!important}', "  .removed-dino-reduced-motion{animation:none!important}")
  }));
  sourceMutation("water event reveals before asset predecode", "asset-predecode-gate", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "preloadDinoAdventureAssets().then(()=>revealDinoWaterEvent(epoch));", "revealDinoWaterEvent(epoch);")
  }));

  if (process.env.NAZONAZO_BROWSER) {
    const server = await startServer();
    try {
      const browsers = process.env.NAZONAZO_BROWSER.split(",").map(value => value.trim()).filter(Boolean);
      for (const browserName of browsers) {
        if (process.env.NAZONAZO_STALE_ONLY !== "1") await runBrowser(browserName, server.base);
        await runSlowStaleRevealBrowser(browserName, server.base);
      }
    } finally {
      await server.close();
    }
  }
  console.log(`nazonazo dino adventure regression: OK (${result.checks} source checks, 12 mutations rejected)`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
