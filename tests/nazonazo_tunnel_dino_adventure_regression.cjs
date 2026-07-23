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
  "branch_dino_adventure_crane_arm_base_cutout_20260723.webp",
  "branch_dino_adventure_crane_cable_cutout_20260723.webp",
  "branch_dino_adventure_crane_hook_cutout_20260723.webp",
  "branch_dino_adventure_fallen_log_ring_cutout_20260723.webp",
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
    "dinoCraneGame", "dinoCraneBackdrop", "dinoCraneTrain", "dinoCranePlayfield", "dinoCraneArm",
    "dinoCraneCable", "dinoCraneHook", "dinoCraneCargoLayer", "dinoCraneBranch", "dinoCraneLog", "dinoCraneRock",
    "dinoCraneRingGuides", "dinoCraneSafePlatform", "dinoCranePlatformArt", "dinoCraneCargoStatus",
    "dinoCraneSwing", "dinoCraneChances", "dinoCraneControls", "dinoCraneLeft", "dinoCraneLower",
    "dinoCraneRight", "dinoCraneRetry", "dinoWaterGame", "dinoWaterDinos", "dinoWaterGrid",
    "dinoWaterBudget", "dinoWaterHint",
    "dinoBossGame", "dinoBossTrex", "dinoBossTrainHp", "dinoBossTrexHp", "dinoBossWater",
    "dinoBossTug", "dinoBossAction", "dinoBossRetry"
  ];
  for (const id of requiredIds) {
    check((html.match(new RegExp(`id=["']${id}["']`, "g")) || []).length === 1, "dom-contract", id);
  }
  check((html.match(/class=["'][^"']*dino-crane-cargo(?:\s|["'])/g) || []).length === 3, "crane-three-cargo");
  check((html.match(/class=["'][^"']*dino-crane-bay(?:\s|["'])/g) || []).length === 3, "crane-three-bays");
  check(/<section id="dinoAdventureLayer"[^>]*data-phase="idle"[^>]*aria-hidden="true"[^>]*hidden/.test(html), "layer-a11y");
  check(/id="dinoWaterGrid"[^>]*role="grid"/.test(html) && /handleDinoWaterKeyDown/.test(game), "water-keyboard");
  check(/id="dinoWaterBudget"[^>]*role="progressbar"[^>]*aria-valuemin="0"[^>]*aria-valuemax="28"[^>]*aria-valuenow="1"/.test(html), "water-connect-a11y");
  for (const id of ["dinoCraneLeft", "dinoCraneLower", "dinoCraneRight", "dinoCraneRetry", "dinoWaterHint", "dinoBossAction", "dinoBossRetry"]) {
    check(new RegExp(`<button id="${id}"[^>]*type="button"`).test(html), "real-button", id);
  }
  for (const id of ["dinoBossTrainHp", "dinoBossTrexHp"]) {
    check(new RegExp(`id="${id}"[^>]*role="progressbar"[^>]*aria-valuemax="3"[^>]*aria-valuenow="3"`).test(html), "boss-hp-a11y", id);
  }

  check(cssCompact.includes("#dinoAdventureLayer{position:absolute;inset:0;") && cssCompact.includes("#dinoAdventureLayer[hidden]{display:none!important}"), "layer-layout");
  check(cssCompact.includes(".dino-crane-playfield{position:absolute;inset:0;") && cssCompact.includes(".dino-crane-hook{position:absolute;") && cssCompact.includes("pointer-events:none"), "crane-layout");
  check(cssCompact.includes(".dino-crane-bay{") && cssCompact.includes(".dino-crane-bay.is-ready{") && cssCompact.includes(".dino-crane-controls{"), "crane-safe-guide");
  check(cssCompact.includes(".dino-water-grid{") && cssCompact.includes("grid-template-columns:repeat(7,var(--water-cell))") && cssCompact.includes("grid-template-rows:repeat(4,var(--water-cell))"), "water-grid-layout");
  check(cssCompact.includes(".dino-crane-controlsbutton,.dino-crane-retry{") && cssCompact.includes("min-height:clamp(50px,12vh,68px)"), "retry-target");
  check(cssCompact.includes(".dino-boss-action{") && /min-height:clamp\((?:6[4-9]|[7-9]\d)px/.test(css), "boss-target");
  check(/#settingsBtn\{[^}]*width:56px;[^}]*height:56px/.test(css) && /#settingsBtn\{width:48px;height:48px\}/.test(css), "settings-target");
  const reducedAt = css.indexOf("@media (prefers-reduced-motion:reduce)");
  const reduced = reducedAt >= 0 ? css.slice(reducedAt) : "";
  const reducedCompact = compact(reduced);
  check(reducedCompact.includes('.dino-crane-ring-guides>i,.dino-water-game.is-saved.dino-water-sceneimg,.dino-boss-game[data-phase="defend"].dino-boss-trex,.dino-boss-wave,.dino-boss-game[data-phase="burst"].dino-boss-tug>i,.dino-boss-action.is-burst{animation:none!important}') && reducedCompact.includes(".dino-crane-arm,.dino-crane-cable,.dino-crane-hook,.dino-crane-cargo,.dino-crane-bay,.dino-crane-swing>i{transition:none!important}") && reducedCompact.includes(".dino-water-tile-rotator,.dino-water-tile-rotator>.is-wet{transition:none!important}"), "reduced-motion");

  check(numericConstant(game, "DINO_ADVENTURE_EVENT_COUNT") === 3, "event-count");
  const cargoDefs = extractArrayConstant(game, "DINO_CRANE_CARGO_DEFS");
  check(numericConstant(game, "DINO_CRANE_SCORE") > 0 && numericConstant(game, "DINO_CRANE_CHANCES") === 3 && numericConstant(game, "DINO_CRANE_SWING_GREEN_DEG") >= 4, "crane-forgiving-targets");
  check(Array.isArray(cargoDefs) && JSON.stringify(cargoDefs.map(item => item.id)) === JSON.stringify(["branch", "log", "rock"]), "crane-cargo-contract");
  check(Array.isArray(cargoDefs) && new Set(cargoDefs.map(item => item.bay)).size === 3 && cargoDefs[0].speed > cargoDefs[1].speed && cargoDefs[1].speed > cargoDefs[2].speed, "crane-weight-contract");
  check(numericConstant(game, "DINO_WATER_ROWS") === 4 && numericConstant(game, "DINO_WATER_COLS") === 7, "water-dimensions");
  check(numericConstant(game, "DINO_WATER_GENERATION_ATTEMPTS") === 32 && !/DINO_WATER_DIG_BUDGET|traceDinoWaterCell|resolveDinoWaterAttempt/.test(game) && /tile\.rotation=\(tile\.rotation\+1\)%4/.test(extractFunction(game, "rotateDinoWaterTile")), "water-rotation-contract");
  const fallback = extractArrayConstant(game, "DINO_WATER_FALLBACK_PATH");
  const rows = numericConstant(game, "DINO_WATER_ROWS");
  const cols = numericConstant(game, "DINO_WATER_COLS");
  const start = numericConstant(game, "DINO_WATER_START");
  const goal = numericConstant(game, "DINO_WATER_GOAL");
  check(start === 14 && start % cols === 0 && goal === 13 && goal % cols === cols - 1, "water-endpoints");
  check(Array.isArray(fallback) && fallback[0] === start && fallback.at(-1) === goal && fallback.length >= 8 && fallback.length <= 12, "water-fallback");
  check(Array.isArray(fallback) && new Set(fallback).size === fallback.length && fallback.every((index, position) => position === 0 || Math.abs(Math.floor(index / cols) - Math.floor(fallback[position - 1] / cols)) + Math.abs(index % cols - fallback[position - 1] % cols) === 1), "water-adjacency");
  check(numericConstant(game, "DINO_BOSS_HP") === 3 && numericConstant(game, "DINO_BOSS_TRAIN_HP") === 3, "boss-hp");
  check(numericConstant(game, "DINO_BOSS_WATER_CHARGES") === 3 && numericConstant(game, "DINO_BOSS_WATER_POWER") > 1, "water-power");
  const burst = extractArrayConstant(game, "DINO_BOSS_BURST_MS");
  check(Array.isArray(burst) && burst.length === 3 && Math.min(...burst) >= 1000, "broad-burst-window");

  const requiredFunctions = [
    "createDinoAdventureState", "isDinoAdventureStage", "resetDinoAdventure", "startDinoAdventure",
    "showDinoCraneEvent", "revealDinoCraneEvent", "beginDinoCraneMovePointer", "beginDinoCraneLower",
    "registerDinoCraneMiss", "retryDinoCraneEvent", "commitDinoCraneSuccess", "tickDinoCrane",
    "generateDinoWaterBoard", "dinoWaterReachable", "dinoWaterBoardSolved", "rotateDinoWaterTile", "useDinoWaterHint",
    "showDinoWaterEvent", "showDinoBossEncounter", "tickDinoAdventure", "finishDinoBossVictory"
  ];
  const functions = Object.fromEntries(requiredFunctions.map(name => [name, extractFunction(game, name)]));
  for (const [name, body] of Object.entries(functions)) check(Boolean(body), "runtime-function", name);
  const dedicatedBodies = Object.values(functions).join("\n");
  check(!/showQuiz\s*\(|onPick\s*\(|renderChoiceCards\s*\(|futureCrane|futureCapsule|\bcur\b/.test(dedicatedBodies), "zero-quiz-crane");
  const startAdventure = functions.startDinoAdventure || "";
  const finishCrane = extractFunction(game, "finishDinoCraneSuccess");
  const finishWater = extractFunction(game, "finishDinoWaterSuccess");
  const gameLoop = extractFunction(game, "gloop");
  check(/pending=["']dinoCrane["']/.test(startAdventure) && /pending=["']dinoWater["']/.test(finishCrane) && /pending=["']dinoBoss["']/.test(finishWater), "crane-water-boss-flow");
  check(/p===["']dinoCrane["']/.test(gameLoop) && /showDinoCraneEvent\s*\(/.test(gameLoop), "crane-arrival-dispatch");
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
  check(/resize/.test(game) && /handleDinoCraneViewportChange/.test(game), "resize-lifecycle");
  check(/keydown/.test(game) && /handleDinoCraneKeyDown/.test(game) && /dinoWater|DinoWater|dinoBoss|DinoBoss/.test(game), "keyboard-runtime");

  const assetPreloader = extractFunction(game, "preloadDinoAdventureAssets") || "";
  const craneAssetPreloader = extractFunction(game, "preloadDinoCraneAssets") || "";
  const revealCrane = extractFunction(game, "revealDinoCraneEvent") || "";
  const revealWater = extractFunction(game, "revealDinoWaterEvent") || "";
  const revealBoss = extractFunction(game, "revealDinoBossEncounter") || "";
  check(numericConstant(game, "DINO_ADVENTURE_ASSET_READY_TIMEOUT_MS") === 8000 && /image\.decode/.test(assetPreloader) && /Promise\.race/.test(assetPreloader) && /Promise\.all/.test(assetPreloader), "asset-predecode");
  const waterTilePreloader = extractFunction(game, "preloadDinoWaterTileAssets") || "";
  check(/image\.decode/.test(craneAssetPreloader) && /Promise\.race/.test(craneAssetPreloader) && /Promise\.all/.test(craneAssetPreloader) && /sources\.length!==7/.test(craneAssetPreloader), "crane-asset-predecode");
  check(/image\.decode/.test(waterTilePreloader) && /Promise\.race/.test(waterTilePreloader) && /Promise\.all/.test(waterTilePreloader) && /sources\.length!==12/.test(waterTilePreloader), "water-tile-predecode");
  check(/dinoAdventureImageCache=new Map\(\),dinoAdventureImageDecodePromises=new Map\(\)/.test(game) && /if\(dinoAdventureAssetsReadyPromise\)return dinoAdventureAssetsReadyPromise/.test(assetPreloader), "asset-predecode-cache");
  check(/preloadDinoWaterTileAssets/.test(functions.showDinoWaterEvent || "") && /preloadDinoAdventureAssets/.test(functions.showDinoWaterEvent || "") && compact(functions.showDinoBossEncounter || "").includes("preloadDinoAdventureAssets().then(()=>revealDinoBossEncounter(epoch))"), "asset-predecode-gate");
  check(/preloadDinoCraneAssets/.test(functions.showDinoCraneEvent || "") && /Promise\.all/.test(revealCrane) && /dinoAdventureState\.epoch!==epoch/.test(revealCrane), "crane-asset-predecode-gate");
  check([revealWater, revealBoss].every(body => /isDinoAdventureStage\(\)/.test(body) && /!playing/.test(body) && /dinoAdventureState\.epoch!==epoch/.test(body) && /dinoAdventureState\.phase!==["']travel["']/.test(body)), "asset-stale-reveal-guard");

  const stateFactory = functions.createDinoAdventureState || "";
  check(/completionCount:0/.test(stateFactory) && /transitionCount:0/.test(stateFactory) && /epoch:0/.test(stateFactory), "one-shot-state");
  check(/crane:\{[^}]*attempt:1[^}]*completed:false[^}]*scoreGranted:false[^}]*chances:DINO_CRANE_CHANCES[^}]*placedCount:0[^}]*movePointers:new Map\(\)/.test(stateFactory), "crane-state");
  const retryCrane = functions.retryDinoCraneEvent || "";
  const commitCrane = functions.commitDinoCraneSuccess || "";
  check(!/stageMiss\+\+|addScore\s*\(/.test(retryCrane) && /cargo=>!cargo\.placed/.test(retryCrane) && !/placed=false/.test(retryCrane), "crane-no-penalty-retry");
  check(/crane\.completed/.test(commitCrane) && /crane\.scoreGranted/.test(commitCrane) && /crane\.placedCount!==DINO_CRANE_CARGO_DEFS\.length/.test(commitCrane), "crane-one-shot-score");
  check((game.match(/\["pointerup","pointercancel","lostpointercapture"\]/g) || []).length >= 2 && /endDinoCraneMovePointer/.test(game) && /movePointers\.delete/.test(extractFunction(game, "endDinoCraneMovePointer")), "crane-pointercancel-retry");
  check(/isDinoAdventureStage\(\)/.test(revealCrane) && /!playing/.test(revealCrane) && (revealCrane.match(/dinoAdventureState\.epoch!==epoch/g) || []).length >= 3 && /dinoAdventureState\.phase!==["']travel["']/.test(revealCrane), "crane-stale-reveal-guard");
  check(/bossHp:DINO_BOSS_HP/.test(stateFactory) && /trainHp:DINO_BOSS_TRAIN_HP/.test(stateFactory) && /waterCharge:DINO_BOSS_WATER_CHARGES/.test(stateFactory), "boss-state");
  check(/water:\{seed:0,board:\[\],path:\[\],wet:\[\],helpRemaining:1,rotationCount:0/.test(stateFactory) && /attempt:1/.test(stateFactory), "water-state");

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

let sourceMutationCount = 0;
function sourceMutation(name, expectedCode, mutate) {
  sourceMutationCount += 1;
  const candidate = mutate({ ...original });
  const result = validate(candidate);
  assert.ok(result.errors.some(error => error === expectedCode || error.startsWith(`${expectedCode}:`)), `${name}: mutation survived; errors=${result.errors.join(", ")}`);
}

function testStateFactory(game) {
  const body = extractFunction(game, "createDinoAdventureState");
  assert.ok(body, "state factory missing");
  const context = {
    DINO_CRANE_CHANCES: numericConstant(game, "DINO_CRANE_CHANCES"),
    DINO_CRANE_CARGO_DEFS: extractArrayConstant(game, "DINO_CRANE_CARGO_DEFS"),
    DINO_BOSS_HP: numericConstant(game, "DINO_BOSS_HP"),
    DINO_BOSS_TRAIN_HP: numericConstant(game, "DINO_BOSS_TRAIN_HP"),
    DINO_BOSS_WATER_CHARGES: numericConstant(game, "DINO_BOSS_WATER_CHARGES"),
    Set,
    Map
  };
  vm.createContext(context);
  vm.runInContext(`${body};this.make=createDinoAdventureState;`, context);
  const first = context.make();
  const second = context.make();
  assert.equal(first.phase, "idle");
  assert.equal(first.crane.chances, 3);
  assert.equal(first.crane.cargos.length, 3);
  assert.deepEqual(Array.from(first.crane.cargos, cargo => cargo.id), ["branch", "log", "rock"]);
  assert.deepEqual(Array.from(first.water.board), []);
  assert.equal(first.water.helpRemaining, 1);
  assert.equal(first.boss.bossHp, 3);
  assert.equal(first.boss.trainHp, 3);
  assert.equal(first.boss.waterCharge, 3);
  first.water.board.push({ index: 99 });
  first.crane.cargos[0].placed = true;
  first.crane.movePointers.set(7, -1);
  first.boss.activeHornPointers.add(7);
  assert.deepEqual(Array.from(second.water.board), [], "water board leaked between runs");
  assert.equal(second.crane.cargos[0].placed, false, "placed cargo leaked between runs");
  assert.equal(second.crane.movePointers.size, 0, "crane pointer map leaked between runs");
  assert.equal(second.boss.activeHornPointers.size, 0, "horn pointer set leaked between runs");
}

function testDeterministicRuntimeTransactions(game) {
  const constants = {
    DINO_CRANE_CHANCES: numericConstant(game, "DINO_CRANE_CHANCES"),
    DINO_CRANE_CARGO_DEFS: extractArrayConstant(game, "DINO_CRANE_CARGO_DEFS"),
    DINO_WATER_ROWS: numericConstant(game, "DINO_WATER_ROWS"),
    DINO_WATER_COLS: numericConstant(game, "DINO_WATER_COLS"),
    DINO_WATER_START: numericConstant(game, "DINO_WATER_START"),
    DINO_WATER_GOAL: numericConstant(game, "DINO_WATER_GOAL"),
    DINO_WATER_GENERATION_ATTEMPTS: numericConstant(game, "DINO_WATER_GENERATION_ATTEMPTS"),
    DINO_WATER_FALLBACK_PATH: extractArrayConstant(game, "DINO_WATER_FALLBACK_PATH"),
    DINO_WATER_DIRECTIONS: extractArrayConstant(game, "DINO_WATER_DIRECTIONS"),
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
    Map,
    performance: { now: () => 1000 },
    prefersReducedMotionActive: () => false,
    dinoAdventureState: null,
    dinoAdventureLayer: null,
    dinoCraneGame: null,
    dinoWaterGame: null,
    dinoBossGame: null,
    dinoCraneRetry: null,
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
    "dinoWaterCoordinates", "dinoWaterIndexAt", "createDinoWaterRandom", "dinoWaterDirectionBetween",
    "dinoWaterBaseOpenings", "dinoWaterTileOpenings", "dinoWaterSolutionRotation", "dinoWaterPathTurns",
    "dinoWaterGeneratePath", "generateDinoWaterBoard", "dinoWaterReachable", "dinoWaterBoardSolved",
    "failDinoBossDefense", "missDinoBossAttackWindow",
    "hitDinoBoss", "completeDinoAdventureStage", "startDinoBossAttempt"
  ];
  const runtimeSource = runtimeNames.map(name => extractFunction(game, name)).join("\n");
  assert.ok(runtimeNames.every(name => extractFunction(game, name)), "deterministic runtime extraction incomplete");
  vm.createContext(context);
  vm.runInContext(`${runtimeSource};this.runtime={${runtimeNames.join(",")}};`, context);
  context.dinoAdventureState = context.runtime.createDinoAdventureState();
  for (let seed = 0; seed < 100; seed += 1) {
    const first = context.runtime.generateDinoWaterBoard(seed);
    const second = context.runtime.generateDinoWaterBoard(seed);
    assert.equal(JSON.stringify(first), JSON.stringify(second), `seed ${seed}: water generation is not deterministic`);
    assert.equal(first.board.length, 28, `seed ${seed}: water board is not 4x7`);
    assert.equal(context.runtime.dinoWaterBoardSolved(first.board), false, `seed ${seed}: initial board starts solved`);
    const solved = first.board.map(tile => tile.onPath ? { ...tile, rotation: tile.solutionRotation } : { ...tile });
    assert.equal(context.runtime.dinoWaterBoardSolved(solved), true, `seed ${seed}: stored rotations do not solve the board`);
    assert.ok(first.path.length >= 8 && first.path.length <= 12, `seed ${seed}: child-facing path bound drifted`);
    assert.ok(context.runtime.dinoWaterPathTurns(first.path) >= 2 && context.runtime.dinoWaterPathTurns(first.path) <= 6, `seed ${seed}: child-facing turn bound drifted`);
  }

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
  const initial = await waitSnapshot(frame, state => state.phase === "crane-ready", `${browserName}: crane event did not start`, 20000);
  qaMetrics.craneRevealMs = Date.now() - journeyStartedAt;
  if (slowAssetDelayMs) {
    assert.ok(qaMetrics.craneRevealMs < slowAssetDelayMs + 6000, `${browserName}: crane reveal wait was excessive: ${qaMetrics.craneRevealMs}ms`);
  }
  assert.equal(initial.eventIndex, 0);
  assert.equal(initial.boss.bossHp, 3);
  assert.equal(initial.boss.trainHp, 3);
  assert.deepEqual(initial.water.tiles, []);
  assert.equal(initial.crane.attempt, 1);
  assert.equal(initial.crane.completed, false);
  assert.equal(initial.crane.placedCount, 0);
  assert.deepEqual(initial.crane.cargos.map(cargo => cargo.id), ["branch", "log", "rock"]);
  assert.equal(await frame.locator("#quiz.show").count(), 0, `${browserName}: dino opened a quiz`);
  assert.equal(await frame.locator(".tun:visible").count(), 0, `${browserName}: dino built visible quiz stations`);
  assert.equal(await frame.locator("#dinoCraneGame:visible").count(), 1, `${browserName}: crane event is not visible`);

  const viewports = [[390, 844], [568, 320], [844, 390], [1024, 768], [1366, 768]];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const fit = await frame.evaluate(() => {
      const viewport = { width: innerWidth, height: innerHeight };
      const rect = id => {
        const value = document.getElementById(id).getBoundingClientRect();
        return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
      };
      const inside = value => value.left >= -2 && value.right <= viewport.width + 2 && value.top >= -2 && value.bottom <= viewport.height + 2;
      const arm = rect("dinoCraneArm");
      const hook = rect("dinoCraneHook");
      const cargoes = [...document.querySelectorAll(".dino-crane-cargo")].map(element => {
        const value = element.getBoundingClientRect();
        return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
      });
      const platform = rect("dinoCraneSafePlatform");
      const controls = rect("dinoCraneControls");
      return {
        overflowX: document.documentElement.scrollWidth - innerWidth,
        overflowY: document.documentElement.scrollHeight - innerHeight,
        layerPhase: document.getElementById("dinoAdventureLayer").dataset.phase,
        adminSettingsHidden: getComputedStyle(document.getElementById("gameSettings")).display === "none",
        baseDotsHidden: getComputedStyle(document.getElementById("dots")).visibility === "hidden",
        rotateVisible: getComputedStyle(document.getElementById("rotateHint")).display !== "none",
        craneInside: [arm, hook, platform, controls, ...cargoes].every(value => inside(value) && value.width > 0 && value.height > 0),
        arm,
        hook,
        cargoes,
        platform,
        controls
      };
    });
    assert.ok(fit.overflowX <= 1 && fit.overflowY <= 1, `${browserName}: overflow ${width}x${height}: ${JSON.stringify(fit)}`);
    assert.ok(fit.layerPhase && fit.layerPhase !== "idle", `${browserName}: resize reset adventure at ${width}x${height}`);
    assert.equal(fit.adminSettingsHidden, true, `${browserName}: admin-only settings suppression drifted at ${width}x${height}`);
    assert.equal(fit.baseDotsHidden, true, `${browserName}: quiz station dots leaked behind dino header at ${width}x${height}`);
    assert.equal(fit.rotateVisible, height > width, `${browserName}: portrait rotate policy drifted at ${width}x${height}`);
    if (width >= height) assert.equal(fit.craneInside, true, `${browserName}: crane art clipped at ${width}x${height}: ${JSON.stringify(fit)}`);
    qaMetrics.viewports.push({ width, height, overflowX: fit.overflowX, overflowY: fit.overflowY, craneInside: fit.craneInside });
    await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-crane-${width}x${height}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedMotion = await frame.evaluate(() => ({
    crane: getComputedStyle(document.querySelector(".dino-crane-ring-guides i")).animationName,
    water: getComputedStyle(document.querySelector(".dino-water-scene img")).animationName,
    tile: getComputedStyle(document.querySelector(".dino-water-tile-rotator") || document.createElement("span")).transitionDuration,
    trex: getComputedStyle(document.getElementById("dinoBossTrex")).animationName,
    action: getComputedStyle(document.getElementById("dinoBossAction")).animationName
  }));
  assert.deepEqual(reducedMotion, { crane: "none", water: "none", tile: "0s", trex: "none", action: "none" }, `${browserName}: reduced motion left dino animation active`);
  assert.notEqual((await snapshot(frame)).phase, "idle", `${browserName}: reduced-motion switch reset event`);
  await page.emulateMedia({ reducedMotion: "no-preference" });

  // Cancelled input returns both pieces and retries only this event without a penalty.
  const hookCenter = await frame.locator("#dinoCraneHook").evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  await frame.locator("#dinoCraneHook").dispatchEvent("pointerdown", { pointerId: 71, pointerType: "touch", isPrimary: true, clientX: hookCenter.x, clientY: hookCenter.y });
  await waitSnapshot(frame, state => state.crane.pointerId === 71, `${browserName}: crane pointer was not registered`);
  await frame.locator("#dinoCraneHook").dispatchEvent("pointercancel", { pointerId: 71, pointerType: "touch", isPrimary: true, clientX: hookCenter.x, clientY: hookCenter.y });
  const cancelled = await waitSnapshot(frame, state => state.phase === "crane-retry" && state.crane.phase === "returning", `${browserName}: pointercancel did not begin crane return`);
  assert.equal(cancelled.eventIndex, 0, `${browserName}: pointercancel advanced the route`);
  assert.equal(cancelled.crane.scoreGranted, false, `${browserName}: pointercancel granted crane score`);
  assert.equal(cancelled.water.completed, false, `${browserName}: pointercancel skipped the water event`);
  const retriedCrane = await waitSnapshot(frame, state => state.phase === "crane" && state.crane.attempt === 2, `${browserName}: crane did not return for a same-event retry`, 5000);
  assert.equal(retriedCrane.eventIndex, 0);
  assert.equal(retriedCrane.crane.attached, false);

  const craneHook = frame.locator("#dinoCraneHook");
  await craneHook.focus();
  async function nudgeCraneUntil(predicate, target, label) {
    for (let index = 0; index < 120; index += 1) {
      const state = await snapshot(frame);
      if (predicate(state)) return state;
      const point = target(state);
      const dx = point.x - state.crane.hook.x;
      const dy = point.y - state.crane.hook.y;
      const key = Math.abs(dx) >= Math.abs(dy)
        ? (dx < 0 ? "ArrowLeft" : "ArrowRight")
        : (dy < 0 ? "ArrowUp" : "ArrowDown");
      await craneHook.press(key);
    }
    assert.fail(`${browserName}: ${label}; latest=${JSON.stringify(await snapshot(frame))}`);
  }
  const attachedCrane = await nudgeCraneUntil(
    state => state.crane.attached,
    state => ({ x: state.crane.geometry.ringX, y: state.crane.geometry.ringY }),
    "keyboard could not attach the hook to the one log ring"
  );
  assert.equal(attachedCrane.phase, "crane-held");
  const safeCrane = await nudgeCraneUntil(
    state => state.crane.safeReady,
    state => ({ x: state.crane.geometry.safeX, y: state.crane.geometry.safeY }),
    "keyboard could not move the attached log to the safe zone"
  );
  const logSize = safeCrane.crane.geometry.logSize;
  const logBounds = {
    left: safeCrane.crane.logRing.x - (.53 - .028) * logSize,
    right: safeCrane.crane.logRing.x + (.983 - .53) * logSize,
    top: safeCrane.crane.logRing.y - (.34 - .150) * logSize,
    bottom: safeCrane.crane.logRing.y + (.729 - .34) * logSize
  };
  const safeReference = {
    left: safeCrane.crane.geometry.safeX - (.53 - .028) * logSize - 14,
    right: safeCrane.crane.geometry.safeX + (.983 - .53) * logSize + 14,
    top: safeCrane.crane.geometry.safeY - (.34 - .150) * logSize - 14,
    bottom: safeCrane.crane.geometry.safeY + (.729 - .34) * logSize + 14
  };
  assert.ok(logBounds.left >= safeReference.left && logBounds.right <= safeReference.right && logBounds.top >= safeReference.top && logBounds.bottom <= safeReference.bottom, `${browserName}: visible log bounds are not fully inside the safe zone`);
  await craneHook.press("Enter");
  const craneSuccess = await waitSnapshot(frame, state => state.phase === "crane-success" && state.crane.completed, `${browserName}: keyboard crane success did not commit`);
  assert.equal(craneSuccess.eventIndex, 1);
  assert.equal(craneSuccess.crane.scoreGranted, true);
  assert.equal(craneSuccess.crane.attempt, 2);
  await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-crane-success-844x390.png`, fullPage: true });

  const waterStartedAt = Date.now();
  const waterInitial = await waitSnapshot(frame, state => state.phase === "water" || state.phase === "water-ready", `${browserName}: crane did not transition to the water event`, 20000);
  qaMetrics.waterRevealAfterCraneMs = Date.now() - waterStartedAt;
  assert.equal(waterInitial.eventIndex, 1);
  assert.equal(waterInitial.crane.completed, true);
  assert.equal(waterInitial.water.completed, false);
  await assertRenderedImage(frame.locator("#dinoWaterDinos"), "branch_dino_adventure_waterway_dry_20260722.webp", "water dry");

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
  const solution = waterInitial.water.solution.map(point => point.row * 7 + point.col);
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
  assert.equal(savedWater.eventIndex, 2);
  assert.equal(await frame.locator("#dinoWaterGame.is-saved").count(), 1, `${browserName}: water success class missing`);
  await assertRenderedImage(frame.locator("#dinoWaterDinos"), "branch_dino_adventure_waterway_success_20260722.webp", "water success");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-water-success-844x390.png`, fullPage: true });
  const afterWater = await waitSnapshot(frame, state => state.water.completed && state.eventIndex === 2 && state.boss.phase !== "idle", `${browserName}: water did not transition directly to boss once`, 20000);
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
  assert.equal(lost.eventIndex, 2, `${browserName}: boss loss changed event position`);
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

async function runCranePointerBrowser(browserName, base) {
  const { chromium, webkit } = require("playwright");
  const browserType = browserName.startsWith("webkit") ? webkit : chromium;
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1174, height: 658 }, reducedMotion: "no-preference" });
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
  const craneResponses = new Map();
  const craneAssetFiles = DINO_ASSET_FILES.slice(0, 4);
  page.on("pageerror", error => pageErrors.push(String(error)));
  page.on("requestfailed", request => requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ""}`));
  page.on("response", response => {
    const file = path.basename(new URL(response.url()).pathname);
    if (!craneAssetFiles.includes(file)) return;
    const statuses = craneResponses.get(file) || [];
    statuses.push(response.status());
    craneResponses.set(file, statuses);
  });
  await page.goto(`${base}/admin/dino-adventure-qa.html`, { waitUntil: "networkidle" });
  let frame = page.frames().find(candidate => /\/nazonazo-tunnel\//.test(candidate.url()));
  const frameDeadline = Date.now() + 15000;
  while (!frame && Date.now() < frameDeadline) {
    await new Promise(resolve => setTimeout(resolve, 40));
    frame = page.frames().find(candidate => /\/nazonazo-tunnel\//.test(candidate.url()));
  }
  assert.ok(frame, `${browserName}: pointer parity preview iframe missing`);
  await frame.locator("#startBtn").waitFor({ state: "visible", timeout: 15000 });
  await frame.waitForFunction(() => !document.getElementById("startBtn").disabled && /きょうりゅう/.test(document.getElementById("startBtn").textContent), null, { timeout: 15000 });
  const saveBefore = await frame.evaluate(() => localStorage.getItem("pono_nazonazo_tunnel_v1"));
  await frame.locator("#startBtn").click();
  await waitSnapshot(frame, state => state.phase === "crane" && state.crane.attempt === 1, `${browserName}: pointer parity crane did not start`, 20000);
  const field = await frame.locator("#dinoCranePlayfield").boundingBox();
  assert.ok(field, `${browserName}: crane playfield missing`);

  const clientPoint = statePoint => ({ x: field.x + statePoint.x, y: field.y + statePoint.y });
  const pointerEvidence = {};
  const captureEvidence = value => ({ phase: value.phase, hook: value.crane.hook, logRing: value.crane.logRing, ring: { x: value.crane.geometry.ringX, y: value.crane.geometry.ringY }, safe: { x: value.crane.geometry.safeX, y: value.crane.geometry.safeY } });
  let state = await snapshot(frame);
  let point = clientPoint(state.crane.hook);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 36, point.y - 28, { steps: 4 });
  await page.mouse.up();
  const returning = await waitSnapshot(frame, value => value.phase === "crane-retry" && value.crane.phase === "returning", `${browserName}: pointer miss did not enter return`);
  assert.equal(returning.eventIndex, 0);
  assert.equal(returning.crane.scoreGranted, false);
  pointerEvidence.returning = captureEvidence(returning);
  await page.screenshot({ path: `/tmp/nazonazo-dino-crane-pointer-${browserName}-returning-1174x658.png`, fullPage: true });
  await waitSnapshot(frame, value => value.phase === "crane" && value.crane.attempt === 2, `${browserName}: pointer miss did not retry same event`, 5000);

  state = await snapshot(frame);
  point = clientPoint(state.crane.hook);
  const ring = clientPoint({ x: state.crane.geometry.ringX, y: state.crane.geometry.ringY });
  const approachSign = point.x >= ring.x ? 1 : -1;
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(ring.x + approachSign * 58, ring.y, { steps: 10 });
  const nearSnap = await snapshot(frame);
  assert.equal(nearSnap.crane.attached, false, `${browserName}: hook snapped before entering the forgiving radius`);
  pointerEvidence.nearSnap = captureEvidence(nearSnap);
  await page.screenshot({ path: `/tmp/nazonazo-dino-crane-pointer-${browserName}-near-snap-1174x658.png`, fullPage: true });
  await page.mouse.move(ring.x, ring.y, { steps: 4 });
  const held = await waitSnapshot(frame, value => value.phase === "crane-held" && value.crane.attached, `${browserName}: real pointer did not snap to the log ring`);
  assert.equal(held.crane.attempt, 2);
  pointerEvidence.held = captureEvidence(held);
  await page.screenshot({ path: `/tmp/nazonazo-dino-crane-pointer-${browserName}-held-1174x658.png`, fullPage: true });

  const safe = clientPoint({ x: held.crane.geometry.safeX, y: held.crane.geometry.safeY });
  await page.mouse.move(safe.x, safe.y, { steps: 12 });
  const safeReady = await waitSnapshot(frame, value => value.crane.safeReady && value.crane.attached, `${browserName}: real pointer did not carry the log fully into the safe zone`);
  assert.equal(safeReady.eventIndex, 0);
  pointerEvidence.safeReady = captureEvidence(safeReady);
  await page.screenshot({ path: `/tmp/nazonazo-dino-crane-pointer-${browserName}-safe-ready-1174x658.png`, fullPage: true });
  await page.mouse.up();
  const success = await waitSnapshot(frame, value => value.phase === "crane-success" && value.crane.completed, `${browserName}: real pointer drop did not commit crane success`);
  assert.equal(success.eventIndex, 1);
  assert.equal(success.crane.scoreGranted, true);
  pointerEvidence.success = captureEvidence(success);
  await page.screenshot({ path: `/tmp/nazonazo-dino-crane-pointer-${browserName}-success-1174x658.png`, fullPage: true });

  const saveAfter = await frame.evaluate(() => localStorage.getItem("pono_nazonazo_tunnel_v1"));
  assert.equal(saveAfter, saveBefore, `${browserName}: pointer parity preview mutated save data`);
  const report = Object.fromEntries(craneAssetFiles.map(file => [file, craneResponses.get(file) || []]));
  assert.deepEqual(craneAssetFiles.filter(file => report[file].length !== 1 || report[file][0] !== 200), [], `${browserName}: pointer parity crane asset loads drifted: ${JSON.stringify(report)}`);
  assert.deepEqual(pageErrors, [], `${browserName}: pointer parity page errors\n${pageErrors.join("\n")}`);
  const unexpectedRequestFailures = requestFailures.filter(failure => !/^HEAD .+\/admin\/ net::ERR_ABORTED$/.test(failure));
  assert.deepEqual(unexpectedRequestFailures, [], `${browserName}: pointer parity request failures\n${unexpectedRequestFailures.join("\n")}`);
  console.log(`nazonazo dino crane pointer parity (${browserName}): PASS ${JSON.stringify({ attempt: success.crane.attempt, eventIndex: success.eventIndex, evidence: pointerEvidence, assets: report })}`);
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
    craneHidden: document.getElementById("dinoCraneGame").hidden,
    waterHidden: document.getElementById("dinoWaterGame").hidden,
    bossHidden: document.getElementById("dinoBossGame").hidden,
    activeClass: document.body.classList.contains("dino-adventure-active") || document.body.classList.contains("dino-crane-active") || document.body.classList.contains("dino-boss-active")
  }));
  assert.equal(afterDelay.phase, "idle", `${browserName}: stale predecode callback changed phase after stage exit`);
  assert.equal(afterDelay.epoch, reset.epoch, `${browserName}: stale predecode callback changed epoch after stage exit`);
  assert.deepEqual(staleDom, { layerHidden: true, layerAriaHidden: "true", craneHidden: true, waterHidden: true, bossHidden: true, activeClass: false }, `${browserName}: stale predecode callback revealed dino DOM after stage exit`);
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
  sourceMutation("water generator loses its bounded fallback", "water-rotation-contract", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "DINO_WATER_GENERATION_ATTEMPTS=32", "DINO_WATER_GENERATION_ATTEMPTS=320")
  }));
  sourceMutation("boss loses its three HP contract", "boss-hp", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "DINO_BOSS_HP=3,DINO_BOSS_TRAIN_HP=3", "DINO_BOSS_HP=4,DINO_BOSS_TRAIN_HP=3")
  }));
  sourceMutation("burst window becomes a reaction trap", "broad-burst-window", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "DINO_BOSS_BURST_MS=[1500,1300,1150]", "DINO_BOSS_BURST_MS=[700,650,600]")
  }));
  sourceMutation("water grid loses keyboard semantics", "water-keyboard", candidate => ({
    ...candidate,
    html: replaceExactlyOnce(candidate.html, 'role="grid" aria-label="タイルを おすと みぞが 90ど まわる"', 'role="group" aria-label="タイルを おすと みぞが 90ど まわる"')
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
    css: replaceExactlyOnce(candidate.css, '  .dino-crane-ring-guides>i,.dino-water-game.is-saved .dino-water-scene img,.dino-boss-game[data-phase="defend"] .dino-boss-trex,.dino-boss-wave,.dino-boss-game[data-phase="burst"] .dino-boss-tug>i,.dino-boss-action.is-burst{animation:none!important}', "  .removed-dino-reduced-motion{animation:none!important}")
  }));
  sourceMutation("water event reveals before asset predecode", "asset-predecode-gate", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "Promise.all([preloadDinoAdventureAssets(),preloadDinoWaterTileAssets()]).then(()=>revealDinoWaterEvent(epoch));", "revealDinoWaterEvent(epoch);")
  }));
  sourceMutation("crane event count is dropped", "event-count", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "DINO_ADVENTURE_EVENT_COUNT=3", "DINO_ADVENTURE_EVENT_COUNT=2")
  }));
  sourceMutation("crane is skipped before the water event", "crane-water-boss-flow", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, 'pending="dinoCrane"', 'pending="dinoWater"')
  }));
  sourceMutation("crane reuses the quiz runtime", "zero-quiz-crane", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "function showDinoCraneEvent(){", "function showDinoCraneEvent(){showQuiz();")
  }));
  sourceMutation("crane green timing becomes a reaction trap", "crane-forgiving-targets", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "DINO_CRANE_SWING_GREEN_DEG=5", "DINO_CRANE_SWING_GREEN_DEG=1")
  }));
  sourceMutation("crane success ignores the three-cargo requirement", "crane-one-shot-score", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "||crane.placedCount!==DINO_CRANE_CARGO_DEFS.length)return false", ")return false")
  }));
  sourceMutation("crane score loses its one-shot guard", "crane-one-shot-score", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, 'if(!crane.scoreGranted){crane.scoreGranted=true;addScore(DINO_CRANE_SCORE,"adventure");}', 'addScore(DINO_CRANE_SCORE,"adventure");')
  }));
  sourceMutation("pointercancel no longer stops held crane movement", "crane-pointercancel-retry", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, 'if(dinoCraneLeft){dinoCraneLeft.addEventListener("pointerdown",event=>beginDinoCraneMovePointer(event,-1,dinoCraneLeft));for(const type of ["pointerup","pointercancel","lostpointercapture"])', 'if(dinoCraneLeft){dinoCraneLeft.addEventListener("pointerdown",event=>beginDinoCraneMovePointer(event,-1,dinoCraneLeft));for(const type of ["pointerup","lostpointercapture"])')
  }));
  sourceMutation("crane reveals without its asset predecode gate", "crane-asset-predecode-gate", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "Promise.all([preloadDinoCraneAssets(),preloadDinoAdventureAssets()]).then(()=>revealDinoCraneEvent(epoch));", "revealDinoCraneEvent(epoch);")
  }));
  sourceMutation("stale crane reveal ignores its epoch", "crane-stale-reveal-guard", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, 'if(!craneAssetsReady||!isDinoAdventureStage()||!playing||dinoAdventureState.epoch!==epoch||dinoAdventureState.phase!=="travel"||dinoAdventureState.crane.completed)return;', 'if(!craneAssetsReady||!isDinoAdventureStage()||!playing||dinoAdventureState.phase!=="travel"||dinoAdventureState.crane.completed)return;')
  }));
  sourceMutation("a fourth movable cargo is added", "crane-three-cargo", candidate => ({
    ...candidate,
    html: replaceExactlyOnce(candidate.html, '<img id="dinoCraneRock" class="dino-crane-cargo" data-cargo="rock" alt="" decoding="async" draggable="false">', '<img id="dinoCraneRock" class="dino-crane-cargo" data-cargo="rock" alt="" decoding="async" draggable="false"><img class="dino-crane-cargo" data-cargo="extra" alt="">')
  }));
  sourceMutation("cargo identity changes", "crane-cargo-contract", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, 'id:"rock",label:"おおきな いわ"', 'id:"box",label:"おおきな いわ"')
  }));
  sourceMutation("two cargoes share one bay", "crane-weight-contract", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, 'startX:.46,bay:2', 'startX:.46,bay:1')
  }));
  sourceMutation("water tap rotates 180 degrees", "water-rotation-contract", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "tile.rotation=(tile.rotation+1)%4", "tile.rotation=(tile.rotation+2)%4")
  }));
  sourceMutation("water help becomes reusable", "water-state", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "helpRemaining:1,rotationCount:0", "helpRemaining:2,rotationCount:0")
  }));

  if (process.env.NAZONAZO_BROWSER) {
    const server = await startServer();
    try {
      const browsers = process.env.NAZONAZO_BROWSER.split(",").map(value => value.trim()).filter(Boolean);
      for (const browserName of browsers) {
        if (process.env.NAZONAZO_CRANE_POINTER_ONLY === "1") {
          await runCranePointerBrowser(browserName, server.base);
        } else if (process.env.NAZONAZO_STALE_ONLY !== "1") {
          await runBrowser(browserName, server.base);
          await runCranePointerBrowser(browserName, server.base);
        }
        if (process.env.NAZONAZO_CRANE_POINTER_ONLY !== "1") await runSlowStaleRevealBrowser(browserName, server.base);
      }
    } finally {
      await server.close();
    }
  }
  console.log(`nazonazo dino adventure regression: OK (${result.checks} source checks, ${sourceMutationCount} mutations rejected)`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
