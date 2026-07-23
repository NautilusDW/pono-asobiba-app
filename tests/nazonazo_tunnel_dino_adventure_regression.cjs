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
  "branch_dino_adventure_rescue_before_20260723.webp",
  "branch_dino_adventure_rescue_success_20260723.webp",
  "branch_dino_adventure_crane_arm_base_cutout_20260723.webp",
  "branch_dino_adventure_crane_cable_cutout_20260723.webp",
  "branch_dino_adventure_crane_hook_cutout_20260723.webp",
  "branch_dino_adventure_branch_bundle_ring_cutout_20260723.webp",
  "branch_dino_adventure_fallen_log_ring_cutout_20260723.webp",
  "branch_dino_adventure_sling_boulder_ring_cutout_20260723.webp",
  "branch_dino_adventure_three_bay_safe_platform_cutout_20260723.webp",
  "branch_dino_adventure_water_tile_source_dry_20260723.webp",
  "branch_dino_adventure_water_tile_straight_dry_20260723.webp",
  "branch_dino_adventure_water_tile_curve_dry_20260723.webp",
  "branch_dino_adventure_water_tile_tee_dry_20260723.webp",
  "branch_dino_adventure_water_tile_pond_dry_20260723.webp",
  "branch_dino_adventure_water_tile_rock_dry_20260723.webp",
  "branch_dino_adventure_water_tile_source_wet_20260723.webp",
  "branch_dino_adventure_water_tile_straight_wet_20260723.webp",
  "branch_dino_adventure_water_tile_curve_wet_20260723.webp",
  "branch_dino_adventure_water_tile_tee_wet_20260723.webp",
  "branch_dino_adventure_water_tile_pond_wet_20260723.webp",
  "branch_dino_adventure_water_tile_rock_wet_20260723.webp",
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
    "dinoApproachNotice", "dinoCraneGame", "dinoCraneBackdrop", "dinoCraneSuccessBackdrop",
    "dinoCraneBriefing", "dinoCraneStart", "dinoCraneTrain", "dinoCranePlayfield", "dinoCraneArm",
    "dinoCraneCable", "dinoCraneHook", "dinoCraneCargoLayer", "dinoCraneBranch", "dinoCraneLog", "dinoCraneRock",
    "dinoCraneRingGuides", "dinoCraneSafePlatform", "dinoCranePlatformArt", "dinoCraneCargoStatus",
    "dinoCraneSwing", "dinoCraneChances", "dinoCraneControls", "dinoCraneLeft", "dinoCraneLower",
    "dinoCraneRight", "dinoCraneRetry", "dinoCraneContinue", "dinoWaterGame", "dinoWaterDinos",
    "dinoWaterSuccessScene", "dinoWaterBriefing", "dinoWaterStart", "dinoWaterGrid",
    "dinoWaterBudget", "dinoWaterHint", "dinoWaterContinue",
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
  for (const id of ["dinoCraneStart", "dinoCraneLeft", "dinoCraneLower", "dinoCraneRight", "dinoCraneRetry", "dinoCraneContinue", "dinoWaterStart", "dinoWaterHint", "dinoWaterContinue", "dinoBossAction", "dinoBossRetry"]) {
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
  check(cssCompact.includes(".dino-adventure-continue{") && /\.dino-adventure-continue\{[^}]*min-height:clamp\((?:4[4-9]|[5-9]\d)px/.test(css), "success-continue-target");
  check(/body\.dino-adventure-(?:active|success)\s+#stamp\s*\{[^}]*z-index\s*:\s*(?:1[9]|2\d|[3-9]\d)/.test(css), "success-stamp-front");
  const successStampRules = [...css.matchAll(/body\.dino-adventure-success\s+#stamp\s*\{([^}]*)\}/g)];
  const popAt = css.indexOf("@keyframes pop"), popOpenAt = popAt >= 0 ? css.indexOf("{", popAt) : -1;
  const popEndAt = popOpenAt >= 0 ? scanBalanced(css, popOpenAt, "{", "}") : -1;
  const popKeyframes = popEndAt > popOpenAt ? compact(css.slice(popOpenAt, popEndAt + 1)) : "";
  const showStampBody = compact(extractFunction(game, "showStamp"));
  check(successStampRules.length >= 1 && successStampRules.every(rule => !/(?:animation|opacity|visibility|transform)\s*:/.test(rule[1])) &&
    /#stamp\.clear\{[^}]*animation:pop\s+1\.6s\s+ease\s+forwards/.test(css) && /100%\{opacity:0;/.test(popKeyframes) &&
    showStampBody.includes("stampFeedbackTimer=setTimeout") && showStampBody.includes("},1250);"), "success-stamp-finite");
  check(cssCompact.includes(".dino-boss-action{") && /min-height:clamp\((?:6[4-9]|[7-9]\d)px/.test(css), "boss-target");
  check(/#settingsBtn\{[^}]*width:56px;[^}]*height:56px/.test(css) && /#settingsBtn\{width:48px;height:48px\}/.test(css), "settings-target");
  const reducedAt = css.indexOf("@media (prefers-reduced-motion:reduce)");
  const reduced = reducedAt >= 0 ? css.slice(reducedAt) : "";
  const reducedCompact = compact(reduced);
  check(reducedCompact.includes('.dino-crane-ring-guides>i,.dino-water-game.is-saved.dino-water-success-scene,.dino-boss-game[data-phase="defend"].dino-boss-trex,.dino-boss-wave,.dino-boss-game[data-phase="burst"].dino-boss-tug>i,.dino-boss-action.is-burst{animation:none!important}') && reducedCompact.includes(".dino-crane-arm,.dino-crane-cable,.dino-crane-hook,.dino-crane-cargo,.dino-crane-bay,.dino-crane-swing>i{transition:none!important}") && reducedCompact.includes(".dino-water-tile-rotator,.dino-water-tile-rotator>.is-dry,.dino-water-tile-rotator>.is-wet{transition:none!important}") && reducedCompact.includes(".dino-crane-backdrop,.dino-crane-train,.dino-crane-playfield,.dino-water-sceneimg{transition-duration:.12s!important}"), "reduced-motion");
  check(cssCompact.includes(".dino-water-tile-rotator>.is-dry,.dino-water-tile-rotator>.is-wet{transition:opacity.2sease}"),
    "water-tile-crossfade");

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
    "showDinoCraneEvent", "revealDinoCraneEvent", "prepareDinoCraneGameplayAssets", "beginDinoCraneRescue",
    "measureDinoCraneGeometry", "syncDinoCranePresentation", "beginDinoCraneMovePointer", "beginDinoCraneLower",
    "registerDinoCraneMiss", "retryDinoCraneEvent", "commitDinoCraneSuccess", "finalizeDinoCraneSuccess", "tickDinoCrane",
    "generateDinoWaterBoard", "dinoWaterReachable", "dinoWaterBoardSolved", "rotateDinoWaterTile", "useDinoWaterHint",
    "beginDinoWaterSuccess", "tickDinoWaterSuccess", "commitDinoWaterSuccess",
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

  const sceneAssetPreloader = extractFunction(game, "preloadDinoSceneAssets") || "";
  const assetPreloader = extractFunction(game, "preloadDinoAdventureAssets") || "";
  const rescueAssetPreloader = extractFunction(game, "preloadDinoRescueAssets") || "";
  const rescueSuccessAssetPreloader = extractFunction(game, "preloadDinoRescueSuccessAsset") || "";
  const waterSceneAssetPreloader = extractFunction(game, "preloadDinoWaterSceneAssets") || "";
  const craneAssetPreloader = extractFunction(game, "preloadDinoCraneAssets") || "";
  const waterTilePreloader = extractFunction(game, "preloadDinoWaterTileAssets") || "";
  const stagePolishPreloader = extractFunction(game, "preloadBranchStagePolish") || "";
  const applyAdventureArt = extractFunction(game, "applyDinoAdventureArt") || "";
  const showCrane = functions.showDinoCraneEvent || "";
  const revealCrane = extractFunction(game, "revealDinoCraneEvent") || "";
  const prepareCrane = functions.prepareDinoCraneGameplayAssets || "";
  const beginCrane = functions.beginDinoCraneRescue || "";
  const showWater = functions.showDinoWaterEvent || "";
  const revealWater = extractFunction(game, "revealDinoWaterEvent") || "";
  const showBoss = functions.showDinoBossEncounter || "";
  const revealBoss = extractFunction(game, "revealDinoBossEncounter") || "";
  check(numericConstant(game, "DINO_ADVENTURE_ASSET_READY_TIMEOUT_MS") === 24000 &&
    /image\.decode/.test(sceneAssetPreloader) && /Promise\.race/.test(sceneAssetPreloader) && /Promise\.all/.test(sceneAssetPreloader) &&
    /image\.decode/.test(assetPreloader) && /Promise\.race/.test(assetPreloader) && /Promise\.all/.test(assetPreloader), "asset-predecode");
  check(/image\.decode/.test(craneAssetPreloader) && /Promise\.race/.test(craneAssetPreloader) && /Promise\.all/.test(craneAssetPreloader) && /sources\.length!==7/.test(craneAssetPreloader), "crane-asset-predecode");
  check(/image\.decode/.test(waterTilePreloader) && /Promise\.race/.test(waterTilePreloader) && /Promise\.all/.test(waterTilePreloader) && /sources\.length!==12/.test(waterTilePreloader), "water-tile-predecode");
  check(/dinoAdventureImageCache=new Map\(\),dinoAdventureImageDecodePromises=new Map\(\)/.test(game) &&
    /if\(dinoAdventureAssetsReadyPromise\)return dinoAdventureAssetsReadyPromise/.test(assetPreloader) &&
    /if\(!dinoRescueAssetsReadyPromise\)dinoRescueAssetsReadyPromise=/.test(compact(rescueAssetPreloader)) &&
    /if\(!dinoRescueSuccessAssetReadyPromise\)dinoRescueSuccessAssetReadyPromise=/.test(compact(rescueSuccessAssetPreloader)) &&
    /if\(!dinoWaterSceneAssetsReadyPromise\)dinoWaterSceneAssetsReadyPromise=/.test(compact(waterSceneAssetPreloader)), "asset-predecode-cache");
  check(compact(rescueAssetPreloader).includes("preloadDinoSceneAssets([DINO_ADVENTURE_ASSETS.rescueBlocked])") &&
    compact(rescueSuccessAssetPreloader).includes("preloadDinoSceneAssets([DINO_ADVENTURE_ASSETS.rescueSuccess])") &&
    compact(waterSceneAssetPreloader).includes("preloadDinoSceneAssets([DINO_ADVENTURE_ASSETS.waterDry,DINO_ADVENTURE_ASSETS.waterSuccess])"),
  "asset-priority-groups");
  check(compact(stagePolishPreloader).includes('if(st&&st.id==="dino")preloadDinoRescueAssets()') &&
    !/preloadDino(?:Crane|Water|Adventure)Assets/.test(stagePolishPreloader) &&
    compact(applyAdventureArt).startsWith("functionapplyDinoAdventureArt(){preloadDinoRescueAssets();") &&
    !/preloadDino(?:Crane|Water|Adventure)Assets/.test(applyAdventureArt), "asset-priority-entry");
  check(compact(showCrane).includes("preloadDinoRescueAssets().then(()=>revealDinoCraneEvent(epoch))") &&
    !/preloadDino(?:Crane|Water|Adventure)Assets/.test(showCrane), "crane-asset-predecode-gate");
  const craneBriefingAt = revealCrane.indexOf("dinoCraneBriefing.hidden=false");
  const craneLoadingAt = revealCrane.indexOf("dinoCraneStart.disabled=true");
  const craneSecondaryAt = revealCrane.indexOf("prepareDinoCraneGameplayAssets(epoch)");
  check(/await preloadDinoRescueAssets/.test(revealCrane) &&
    /prepareDinoAdventureDomImage\(dinoCraneBackdrop,DINO_ADVENTURE_ASSETS\.rescueBlocked\)/.test(revealCrane) &&
    craneBriefingAt >= 0 && craneBriefingAt < craneLoadingAt && craneLoadingAt < craneSecondaryAt, "crane-briefing-priority");
  const prepareCraneCompact = compact(prepareCrane);
  const craneReadyAt = prepareCrane.indexOf("dinoAdventureState.crane.assetsReady=true");
  const craneEnableAt = prepareCrane.lastIndexOf("dinoCraneStart.disabled=false");
  const waterDeferredAt = prepareCrane.indexOf("preloadDinoWaterSceneAssets()");
  check(prepareCraneCompact.includes("awaitPromise.all([preloadDinoRescueSuccessAsset(),preloadDinoCraneAssets()])") &&
    (prepareCrane.match(/prepareDinoAdventureDomImage/g) || []).length === 8 &&
    craneReadyAt >= 0 && craneReadyAt < craneEnableAt && craneEnableAt < waterDeferredAt &&
    /dinoCraneStart\.textContent=["']たすける！["']/.test(prepareCrane) &&
    /preloadDinoWaterTileAssets/.test(prepareCrane), "crane-secondary-asset-gate");
  check(/if\(!crane\.assetsReady\)/.test(beginCrane) && /prepareDinoCraneGameplayAssets\(state\.epoch\)/.test(beginCrane) &&
    /dinoCraneStart\.disabled=true/.test(beginCrane) && /return false/.test(beginCrane), "crane-start-loading-gate");
  check(compact(showWater).includes("Promise.all([preloadDinoWaterSceneAssets(),preloadDinoWaterTileAssets()]).then(()=>revealDinoWaterEvent(epoch))") &&
    !/preloadDinoAdventureAssets/.test(showWater), "asset-predecode-gate");
  const waterBriefingAt = revealWater.indexOf("dinoWaterBriefing.hidden=false");
  const bossDeferredAt = revealWater.indexOf("preloadDinoAdventureAssets()");
  check(waterBriefingAt >= 0 && bossDeferredAt > waterBriefingAt &&
    compact(showBoss).includes("preloadDinoAdventureAssets().then(()=>revealDinoBossEncounter(epoch))"), "boss-deferred-predecode");
  check([revealWater, revealBoss].every(body => /isDinoAdventureStage\(\)/.test(body) && /!playing/.test(body) && /dinoAdventureState\.epoch!==epoch/.test(body) && /dinoAdventureState\.phase!==["']travel["']/.test(body)), "asset-stale-reveal-guard");

  const stateFactory = functions.createDinoAdventureState || "";
  const craneGeometry = functions.measureDinoCraneGeometry || "";
  const cranePresentation = functions.syncDinoCranePresentation || "";
  check(/completionCount:0/.test(stateFactory) && /transitionCount:0/.test(stateFactory) && /epoch:0/.test(stateFactory), "one-shot-state");
  check(/crane:\{[^}]*attempt:1[^}]*completed:false[^}]*scoreGranted:false[^}]*chances:DINO_CRANE_CHANCES[^}]*placedCount:0[^}]*movePointers:new Map\(\)[^}]*assetsReady:false[^}]*successBackdropReady:false/.test(stateFactory), "crane-state");
  check(/rescueSceneHeight/.test(craneGeometry) && /rescueGroundY=clamp\([^;]*\.67[^;]*height\*\.62[^;]*height\*\.80\)/.test(craneGeometry) &&
    /ringY=rescueGroundY-\(def\.bbox\[3\]-def\.anchorY\)\*size/.test(craneGeometry), "crane-rescue-grounding");
  check(/g\.height<=360\?clamp\(g\.hookSize\*\.55,30,34\):clamp\(g\.hookSize\*\.70,38,58\)/.test(cranePresentation),
    "crane-short-ring-visibility");
  const retryCrane = functions.retryDinoCraneEvent || "";
  const commitCrane = functions.commitDinoCraneSuccess || "";
  const finalizeCrane = functions.finalizeDinoCraneSuccess || "";
  const tickCrane = functions.tickDinoCrane || "";
  const beginWaterSuccess = functions.beginDinoWaterSuccess || "";
  const tickWaterSuccess = functions.tickDinoWaterSuccess || "";
  const commitWaterSuccess = functions.commitDinoWaterSuccess || "";
  const tickAdventure = functions.tickDinoAdventure || "";
  check(!/stageMiss\+\+|addScore\s*\(/.test(retryCrane) && /cargo=>!cargo\.placed/.test(retryCrane) && !/placed=false/.test(retryCrane), "crane-no-penalty-retry");
  check(/crane\.completed/.test(commitCrane) && /crane\.scoreGranted/.test(finalizeCrane) && /crane\.placedCount!==DINO_CRANE_CARGO_DEFS\.length/.test(commitCrane), "crane-one-shot-score");
  check(/dinoAdventureSetPhase\(["']crane-success["'],0,now\)/.test(finalizeCrane) && /dinoCraneContinue\.hidden=false/.test(finalizeCrane) && !/finishDinoCraneSuccess\s*\(/.test(tickCrane), "crane-manual-success-hold");
  check(/flowQueue=\[\.\.\.water\.path\]/.test(beginWaterSuccess) && /resolve-water-flow/.test(beginWaterSuccess) &&
    /commitDinoWaterSuccess/.test(tickWaterSuccess) && /dinoWaterContinue\.hidden=false/.test(commitWaterSuccess) &&
    /phaseEndAt=0/.test(commitWaterSuccess) && !/finishDinoWaterSuccess\s*\(/.test(tickAdventure), "water-manual-success-hold");
  const flowResetAddAt = beginWaterSuccess.indexOf('classList.add("is-flow-reset")');
  const flowResetApplyAt = beginWaterSuccess.indexOf("applyDinoWaterWetPresentation");
  const flowResetFlushAt = beginWaterSuccess.indexOf("dinoWaterGrid.offsetWidth");
  const flowResetRemoveAt = beginWaterSuccess.indexOf('classList.remove("is-flow-reset")');
  check(flowResetAddAt >= 0 && flowResetAddAt < flowResetApplyAt && flowResetApplyAt < flowResetFlushAt && flowResetFlushAt < flowResetRemoveAt &&
    cssCompact.includes(".dino-water-game.is-flow-reset.dino-water-tile-rotator>.is-dry,.dino-water-game.is-flow-reset.dino-water-tile-rotator>.is-wet{transition:none!important}") &&
    /dinoWaterGame\.classList\.remove\(["']is-flow-reset["']/.test(reset), "water-flow-reset");
  check(/if\(!state\.crane\.completed\|\|state\.phase!==["']crane-success["']\)return/.test(finishCrane) && /if\(!state\.water\.completed\|\|state\.phase!==["']resolve-water["']\)return/.test(finishWater), "success-continue-one-shot");
  check(/bindTap\(dinoCraneContinue,[^\n]*finishDinoCraneSuccess/.test(game) && /bindTap\(dinoWaterContinue,[^\n]*finishDinoWaterSuccess/.test(game), "success-continue-binding");
  check(/dinoCraneContinue\.hidden=true/.test(reset) && /dinoWaterContinue\.hidden=true/.test(reset), "success-continue-cleanup");
  check((game.match(/\["pointerup","pointercancel","lostpointercapture"\]/g) || []).length >= 2 && /endDinoCraneMovePointer/.test(game) && /movePointers\.delete/.test(extractFunction(game, "endDinoCraneMovePointer")), "crane-pointercancel-retry");
  check(/isDinoAdventureStage\(\)/.test(revealCrane) && /!playing/.test(revealCrane) &&
    (revealCrane.match(/dinoAdventureState\.epoch!==epoch/g) || []).length >= 2 &&
    /dinoAdventureState\.phase!==["']travel["']/.test(revealCrane) &&
    (prepareCrane.match(/epoch!==epoch/g) || []).length >= 3 &&
    (prepareCrane.match(/phase!==["']crane-briefing["']/g) || []).length >= 3, "crane-stale-reveal-guard");
  check(/dinoCraneStart\.disabled=false/.test(reset) && /dinoCraneStart\.textContent=["']たすける！["']/.test(reset) &&
    /dinoCraneStart\.removeAttribute\(["']aria-busy["']\)/.test(reset), "crane-start-cleanup");
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

function replaceRegexExactlyOnce(source, pattern, replacement) {
  assert.equal(pattern.global, false, "mutation regex must not be global");
  const matches = source.match(new RegExp(pattern.source, `${pattern.flags}g`)) || [];
  assert.equal(matches.length, 1, `mutation regex anchor count for ${pattern}: ${matches.length}`);
  return source.replace(pattern, replacement);
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

async function waitStableCraneGreen(frame, id, bayX, message, timeout = 6000) {
  const started = Date.now();
  let latest = null;
  let stableSamples = 0;
  while (Date.now() - started < timeout) {
    latest = await snapshot(frame);
    const settled = latest
      && latest.crane.attachedId === id
      && latest.crane.swingGreen
      && Math.abs(latest.crane.swing) <= 3
      && Math.abs(latest.crane.hook.x - bayX) <= 10
      && Math.abs(latest.crane.hook.velocity) <= 12;
    stableSamples = settled ? stableSamples + 1 : 0;
    if (stableSamples >= 4) return latest;
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
    assert.equal(metrics.src && metrics.src.split("?")[0].split("/").at(-1), expectedFile, `${browserName}: wrong image in ${label}: ${metrics.src}`);
    assert.equal(metrics.complete, true, `${browserName}: ${label} revealed before image load completed`);
    assert.ok(metrics.naturalWidth > 0 && metrics.naturalHeight > 0, `${browserName}: ${label} revealed a blank image: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.width > 0 && metrics.height > 0 && metrics.display !== "none" && metrics.visibility !== "hidden", `${browserName}: ${label} image is not visibly laid out: ${JSON.stringify(metrics)}`);
    await locator.evaluate(image => image.decode());
    await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const paintedSrc = await locator.getAttribute("src");
    assert.equal(paintedSrc && paintedSrc.split("?")[0].split("/").at(-1), expectedFile, `${browserName}: image advanced before ${label} painted: ${paintedSrc}`);
    return metrics;
  }
  const viewports = [[390, 844], [568, 320], [844, 390], [1024, 768], [1366, 768]];
  async function assertHeldSuccessFeedback({ buttonId, expectedPhase, expectedGuide, startedAt, reducedMotion, imageFile = "", imageId = "dinoWaterDinos" }) {
    const button = frame.locator(`#${buttonId}`);
    await button.waitFor({ state: "visible", timeout: 3000 });
    await frame.waitForFunction(id => document.activeElement?.id === id, buttonId, { timeout: 3000 });

    // The transient score stamp must be in front of the adventure layer, but
    // must not cover the persistent guide or continue action on short landscape.
    await page.setViewportSize({ width: 568, height: 320 });
    await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const stampDelay = Math.max(0, startedAt + 400 - Date.now());
    if (stampDelay) await page.waitForTimeout(stampDelay);
    const transient = await frame.evaluate(({ id, guideText }) => {
      const stamp = document.getElementById("stamp");
      const layer = document.getElementById("dinoAdventureLayer");
      const guide = document.getElementById("dinoAdventureGuide");
      const button = document.getElementById(id);
      const rect = element => {
        const value = element.getBoundingClientRect();
        return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
      };
      const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const stampRect = rect(stamp), guideRect = rect(guide), buttonRect = rect(button);
      return {
        bodySuccess: document.body.classList.contains("dino-adventure-success"),
        activeId: document.activeElement?.id || "",
        guideText: guide.textContent,
        guideExpected: guideText,
        stampText: stamp.textContent,
        stampOpacity: Number(getComputedStyle(stamp).opacity),
        stampZ: Number(getComputedStyle(stamp).zIndex),
        layerZ: Number(getComputedStyle(layer).zIndex),
        stampGuideOverlap: overlap(stampRect, guideRect),
        stampButtonOverlap: overlap(stampRect, buttonRect),
        buttonRect
      };
    }, { id: buttonId, guideText: expectedGuide });
    assert.equal(transient.bodySuccess, true, `${browserName}: success foreground class missing`);
    assert.equal(transient.activeId, buttonId, `${browserName}: success continue action did not receive focus`);
    assert.equal(transient.guideText, expectedGuide, `${browserName}: success guide changed before it could be read`);
    assert.ok(transient.stampText.length > 0 && transient.stampOpacity >= 0.8, `${browserName}: success stamp was not initially visible: ${JSON.stringify(transient)}`);
    assert.ok(transient.stampZ > transient.layerZ, `${browserName}: success stamp remained behind the adventure layer: ${JSON.stringify(transient)}`);
    assert.equal(transient.stampGuideOverlap, 0, `${browserName}: success stamp covered the guide at 568x320: ${JSON.stringify(transient)}`);
    assert.equal(transient.stampButtonOverlap, 0, `${browserName}: success stamp covered the continue action at 568x320: ${JSON.stringify(transient)}`);
    assert.ok(transient.buttonRect.width >= 44 && transient.buttonRect.height >= 44, `${browserName}: success continue action is undersized at 568x320`);

    await page.setViewportSize({ width: 844, height: 390 });
    await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const transientWide = await frame.evaluate(id => {
      const stamp = document.getElementById("stamp"), layer = document.getElementById("dinoAdventureLayer");
      const guide = document.getElementById("dinoAdventureGuide"), button = document.getElementById(id);
      const rect = element => element.getBoundingClientRect();
      const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const stampRect = rect(stamp);
      return {
        opacity: Number(getComputedStyle(stamp).opacity),
        stampZ: Number(getComputedStyle(stamp).zIndex),
        layerZ: Number(getComputedStyle(layer).zIndex),
        guideOverlap: overlap(stampRect, rect(guide)),
        buttonOverlap: overlap(stampRect, rect(button))
      };
    }, buttonId);
    assert.ok(transientWide.opacity >= 0.8 && transientWide.stampZ > transientWide.layerZ, `${browserName}: success stamp was not initially in front at 844x390: ${JSON.stringify(transientWide)}`);
    assert.equal(transientWide.guideOverlap, 0, `${browserName}: success stamp covered the guide at 844x390: ${JSON.stringify(transientWide)}`);
    assert.equal(transientWide.buttonOverlap, 0, `${browserName}: success stamp covered the continue action at 844x390: ${JSON.stringify(transientWide)}`);

    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const fit = await frame.evaluate(({ id, guideText, imageExpected, successImageId }) => {
        const button = document.getElementById(id), guide = document.getElementById("dinoAdventureGuide");
        const buttonRect = button.getBoundingClientRect(), guideRect = guide.getBoundingClientRect();
        const overlapWidth = Math.max(0, Math.min(buttonRect.right, guideRect.right) - Math.max(buttonRect.left, guideRect.left));
        const overlapHeight = Math.max(0, Math.min(buttonRect.bottom, guideRect.bottom) - Math.max(buttonRect.top, guideRect.top));
        const image = document.getElementById(successImageId);
        const imageRect = image.getBoundingClientRect();
        return {
          overflowX: document.documentElement.scrollWidth - innerWidth,
          overflowY: document.documentElement.scrollHeight - innerHeight,
          buttonInside: buttonRect.left >= -2 && buttonRect.right <= innerWidth + 2 && buttonRect.top >= -2 && buttonRect.bottom <= innerHeight + 2,
          buttonWidth: buttonRect.width,
          buttonHeight: buttonRect.height,
          guideText: guide.textContent,
          guideExpected: guideText,
          guideButtonOverlap: overlapWidth * overlapHeight,
          imageVisible: !imageExpected || (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0 && imageRect.width > 0 && imageRect.height > 0 && getComputedStyle(image).display !== "none"),
          playfieldOpacity: Number(getComputedStyle(document.querySelector(".dino-water-playfield")).opacity)
        };
      }, { id: buttonId, guideText: expectedGuide, imageExpected: Boolean(imageFile), successImageId: imageId });
      assert.ok(fit.overflowX <= 1 && fit.overflowY <= 1, `${browserName}: success overflow ${width}x${height}: ${JSON.stringify(fit)}`);
      assert.equal(fit.buttonInside, true, `${browserName}: success continue action clipped at ${width}x${height}: ${JSON.stringify(fit)}`);
      assert.ok(fit.buttonWidth >= 44 && fit.buttonHeight >= 44, `${browserName}: success continue action below 44px at ${width}x${height}`);
      assert.equal(fit.guideText, expectedGuide, `${browserName}: success guide drifted at ${width}x${height}`);
      assert.equal(fit.guideButtonOverlap, 0, `${browserName}: success guide overlaps continue action at ${width}x${height}: ${JSON.stringify(fit)}`);
      if (imageFile) {
        assert.equal(fit.imageVisible, true, `${browserName}: water success art not visible at ${width}x${height}: ${JSON.stringify(fit)}`);
        assert.ok(fit.playfieldOpacity <= 0.05, `${browserName}: solved water board still obscures the success art at ${width}x${height}: ${JSON.stringify(fit)}`);
      }
      if (width === 568 && height === 320) {
        const successKind = buttonId === "dinoCraneContinue" ? "crane" : "water";
        await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-${successKind}-success-transient-568x320.png`, fullPage: true });
      }
    }
    await page.setViewportSize({ width: 844, height: 390 });
    await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    // The stamp is deliberately finite so it cannot become a permanent cover,
    // while the result, guide and explicit action remain until the child acts.
    const stampEndAt = startedAt + (reducedMotion ? 1450 : 1800);
    const untilStampEnds = Math.max(0, stampEndAt - Date.now());
    if (untilStampEnds) await page.waitForTimeout(untilStampEnds);
    const afterStamp = await frame.evaluate(() => {
      const stamp = document.getElementById("stamp");
      return { className: stamp.className, opacity: Number(getComputedStyle(stamp).opacity), bodySuccess: document.body.classList.contains("dino-adventure-success") };
    });
    assert.ok(afterStamp.className === "" || afterStamp.opacity <= 0.05, `${browserName}: transient success stamp became a permanent cover: ${JSON.stringify(afterStamp)}`);
    assert.equal(afterStamp.bodySuccess, true, `${browserName}: persistent success state ended with the transient stamp`);

    const untilHold = Math.max(0, startedAt + 2600 - Date.now());
    if (untilHold) await page.waitForTimeout(untilHold);
    const held = await snapshot(frame);
    assert.equal(held.phase, expectedPhase, `${browserName}: success advanced without the continue action`);
    assert.equal(await button.isVisible(), true, `${browserName}: success continue action disappeared while waiting`);
    assert.equal(await frame.locator("#dinoAdventureGuide").textContent(), expectedGuide, `${browserName}: success guide disappeared while waiting`);
    if (imageFile) await assertRenderedImage(frame.locator(`#${imageId}`), imageFile, "held water success");
    const successKind = buttonId === "dinoCraneContinue" ? "crane" : "water";
    await page.setViewportSize({ width: 568, height: 320 });
    await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-${successKind}-success-568x320.png`, fullPage: true });
    await page.setViewportSize({ width: 844, height: 390 });
    await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    // Backgrounding cannot consume the manual acknowledgement or create a stale transition.
    await frame.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(450);
    assert.equal((await snapshot(frame)).phase, expectedPhase, `${browserName}: hidden tab consumed success acknowledgement`);
    await frame.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    return held;
  }
  await frame.locator("#startBtn").waitFor({ state: "visible", timeout: 15000 });
  await frame.waitForFunction(() => !document.getElementById("startBtn").disabled && /きょうりゅう/.test(document.getElementById("startBtn").textContent), null, { timeout: 15000 });
  const saveBefore = await frame.evaluate(() => localStorage.getItem("pono_nazonazo_tunnel_v1"));
  const journeyStartedAt = Date.now();
  await frame.locator("#startBtn").click();
  const warning = await waitSnapshot(frame, state => state.phase === "travel" && state.driving && state.pending === "dinoCrane" && state.noticeVisible,
    `${browserName}: the approach warning did not appear before the train stopped`, 10000);
  assert.equal(warning.craneBriefingVisible, false, `${browserName}: detailed crane briefing appeared while the train was moving`);
  assert.equal(await frame.locator("#dinoApproachNotice").isVisible(), true, `${browserName}: approach warning state had no visible notice`);
  assert.match(await frame.locator("#dinoApproachNotice").textContent(), /おや[？?].*こどもの きょうりゅうが こまってる/s,
    `${browserName}: approach warning did not explain why the train was stopping`);
  // With deliberately delayed artwork there is a stable stopped/loading
  // interval: the short warning must remain until the decoded briefing is
  // actually ready. With warm cache the stop-to-briefing handoff can complete
  // in one microtask, so a 40 ms polling sample is intentionally not required.
  if (slowAssetDelayMs >= 1000) {
    const stoppedWarning = await waitSnapshot(frame, state => state.phase === "travel" && !state.driving && state.noticeVisible,
      `${browserName}: delayed artwork cleared the approach warning before the briefing was ready`, 10000);
    assert.equal(stoppedWarning.pending, null, `${browserName}: stopped warning retained a stale travel transaction`);
  }

  const briefing = await waitSnapshot(frame, state => state.phase === "crane-briefing" && state.craneBriefingVisible,
    `${browserName}: stopped train did not enter the held rescue briefing`, 20000);
  const briefingShownAt = Date.now();
  qaMetrics.craneRevealMs = Date.now() - journeyStartedAt;
  if (slowAssetDelayMs) {
    assert.ok(qaMetrics.craneRevealMs < slowAssetDelayMs + 1500, `${browserName}: blocked rescue art did not reveal the briefing within the priority budget: ${qaMetrics.craneRevealMs}ms`);
  }
  assert.equal(briefing.noticeVisible, false, `${browserName}: approach warning remained over the detailed briefing`);
  assert.equal(briefing.inputLocked, true, `${browserName}: crane controls unlocked before the child accepted the rescue`);
  assert.equal(briefing.crane.blockedCount, 3, `${browserName}: rescue did not begin with three blockers`);
  assert.equal(await frame.locator("#dinoCraneStart").isVisible(), true, `${browserName}: rescue briefing start action is missing`);
  assert.equal(await frame.locator("#dinoCraneLeft").isDisabled(), true, `${browserName}: left crane control enabled behind the briefing`);
  assert.equal(await frame.locator("#dinoCraneLower").isDisabled(), true, `${browserName}: lower crane control enabled behind the briefing`);
  assert.equal(await frame.locator("#dinoCraneRight").isDisabled(), true, `${browserName}: right crane control enabled behind the briefing`);
  const briefingTransitionCount = briefing.transitionCount;
  const craneStart = frame.locator("#dinoCraneStart");
  if (slowAssetDelayMs) {
    assert.equal(briefing.crane.assetsReady, false, `${browserName}: secondary crane art was reported ready at the first slow-network briefing frame`);
    assert.equal(await craneStart.isDisabled(), true, `${browserName}: rescue start enabled before secondary art decoded`);
    assert.equal((await craneStart.textContent()).trim(), "よみこみちゅう", `${browserName}: disabled rescue start lacked its loading label`);
    assert.equal(await craneStart.getAttribute("aria-busy"), "true", `${browserName}: disabled rescue start lacked aria-busy`);
    await craneStart.dispatchEvent("pointerdown", { pointerId: 71, pointerType: "mouse", button: 0 });
    await craneStart.dispatchEvent("pointerup", { pointerId: 71, pointerType: "mouse", button: 0 });
    await craneStart.dispatchEvent("click");
    await craneStart.dispatchEvent("keydown", { key: "Enter", code: "Enter" });
    await craneStart.dispatchEvent("keydown", { key: " ", code: "Space" });
    await page.waitForTimeout(160);
    const rejectedLoadingInput = await snapshot(frame);
    assert.equal(rejectedLoadingInput.phase, "crane-briefing", `${browserName}: disabled loading action advanced the crane`);
    assert.equal(rejectedLoadingInput.transitionCount, briefingTransitionCount, `${browserName}: disabled loading action created a transition`);
    assert.equal(rejectedLoadingInput.crane.blockedCount, 3, `${browserName}: disabled loading action moved a blocker`);
  }
  const readyBriefing = await waitSnapshot(frame,
    state => state.phase === "crane-briefing" && state.crane.assetsReady && state.crane.successBackdropReady,
    `${browserName}: crane gameplay art did not unlock the held briefing`, 30000);
  await frame.waitForFunction(() => {
    const button = document.getElementById("dinoCraneStart");
    return button && !button.disabled && button.textContent.trim() === "たすける！" && !button.hasAttribute("aria-busy");
  }, null, { timeout: 30000 });
  qaMetrics.craneAssetsReadyAfterBriefingMs = Date.now() - briefingShownAt;
  if (slowAssetDelayMs) {
    assert.ok(qaMetrics.craneAssetsReadyAfterBriefingMs < slowAssetDelayMs * 2 + 3000,
      `${browserName}: secondary crane art exceeded its two-wave decode budget: ${qaMetrics.craneAssetsReadyAfterBriefingMs}ms`);
  }
  assert.equal(readyBriefing.transitionCount, briefingTransitionCount, `${browserName}: secondary art readiness created a game transition`);
  const briefingHoldRemaining = Math.max(0, briefingShownAt + 900 - Date.now());
  if (briefingHoldRemaining) await page.waitForTimeout(briefingHoldRemaining);
  const heldBriefing = await snapshot(frame);
  assert.equal(heldBriefing.phase, "crane-briefing", `${browserName}: crane briefing auto-advanced without the start action`);
  assert.equal(heldBriefing.transitionCount, briefingTransitionCount, `${browserName}: held crane briefing created a hidden transition`);
  await craneStart.press("Enter");
  const initial = await waitSnapshot(frame, state => state.phase === "crane-ready", `${browserName}: rescue start did not unlock the crane`, 5000);
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
  await assertRenderedImage(frame.locator("#dinoCraneBackdrop"), "branch_dino_adventure_rescue_before_20260723.webp", "blocked rescue background");
  await assertRenderedImage(frame.locator("#dinoCraneSuccessBackdrop"), "branch_dino_adventure_rescue_success_20260723.webp", "decoded rescue success background");
  assert.equal(await frame.locator("#dinoCraneGame").getAttribute("data-blocked-count"), "3", `${browserName}: entrance did not begin with three blockers`);

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
      const ringGuides = [...document.querySelectorAll(".dino-crane-ring-guides>i:not([hidden])")].map(element => {
        const value = element.getBoundingClientRect();
        return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
      });
      const platform = rect("dinoCraneSafePlatform");
      const controls = rect("dinoCraneControls");
      const guide = rect("dinoAdventureGuide");
      const readoutElement = document.querySelector(".dino-crane-readout");
      const readoutValue = readoutElement.getBoundingClientRect();
      const readout = { left: readoutValue.left, right: readoutValue.right, top: readoutValue.top, bottom: readoutValue.bottom, width: readoutValue.width, height: readoutValue.height };
      const guideReadoutOverlapWidth = Math.max(0, Math.min(guide.right, readout.right) - Math.max(guide.left, readout.left));
      const guideReadoutOverlapHeight = Math.max(0, Math.min(guide.bottom, readout.bottom) - Math.max(guide.top, readout.top));
      return {
        overflowX: document.documentElement.scrollWidth - innerWidth,
        overflowY: document.documentElement.scrollHeight - innerHeight,
        layerPhase: document.getElementById("dinoAdventureLayer").dataset.phase,
        adminSettingsHidden: getComputedStyle(document.getElementById("gameSettings")).display === "none",
        baseDotsHidden: getComputedStyle(document.getElementById("dots")).visibility === "hidden",
        rotateVisible: getComputedStyle(document.getElementById("rotateHint")).display !== "none",
        craneInside: [arm, hook, platform, controls, ...cargoes, ...ringGuides].every(value => inside(value) && value.width > 0 && value.height > 0),
        arm,
        hook,
        cargoes,
        ringGuides,
        platform,
        controls,
        guide,
        readout,
        guideReadoutOverlapArea: guideReadoutOverlapWidth * guideReadoutOverlapHeight
      };
    });
    assert.ok(fit.overflowX <= 1 && fit.overflowY <= 1, `${browserName}: overflow ${width}x${height}: ${JSON.stringify(fit)}`);
    assert.ok(fit.layerPhase && fit.layerPhase !== "idle", `${browserName}: resize reset adventure at ${width}x${height}`);
    assert.equal(fit.adminSettingsHidden, true, `${browserName}: admin-only settings suppression drifted at ${width}x${height}`);
    assert.equal(fit.baseDotsHidden, true, `${browserName}: quiz station dots leaked behind dino header at ${width}x${height}`);
    assert.equal(fit.rotateVisible, height > width, `${browserName}: portrait rotate policy drifted at ${width}x${height}`);
    assert.equal(fit.guideReadoutOverlapArea, 0, `${browserName}: crane guide overlaps the cargo/swing readout at ${width}x${height}: ${JSON.stringify(fit)}`);
    if (width >= height && height <= 360) {
      assert.equal(fit.ringGuides.length, 3, `${browserName}: short landscape lost a cargo ring guide at ${width}x${height}`);
      assert.ok(fit.ringGuides.every(guide => guide.width >= 30 && guide.width <= 34.5 && guide.height >= 30 && guide.height <= 34.5),
        `${browserName}: short-landscape ring guides obscure the trapped child at ${width}x${height}: ${JSON.stringify(fit.ringGuides)}`);
    }
    if (width >= height) assert.equal(fit.craneInside, true, `${browserName}: crane art clipped at ${width}x${height}: ${JSON.stringify(fit)}`);
    qaMetrics.viewports.push({ width, height, overflowX: fit.overflowX, overflowY: fit.overflowY, craneInside: fit.craneInside, guideReadoutOverlapArea: fit.guideReadoutOverlapArea, ringGuides: fit.ringGuides });
    await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-crane-${width}x${height}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedMotion = await frame.evaluate(() => ({
    crane: getComputedStyle(document.querySelector(".dino-crane-ring-guides i")).animationName,
    water: getComputedStyle(document.querySelector(".dino-water-scene img")).animationName,
    trex: getComputedStyle(document.getElementById("dinoBossTrex")).animationName,
    action: getComputedStyle(document.getElementById("dinoBossAction")).animationName
  }));
  assert.deepEqual(reducedMotion, { crane: "none", water: "none", trex: "none", action: "none" }, `${browserName}: reduced motion left dino animation active`);
  assert.notEqual((await snapshot(frame)).phase, "idle", `${browserName}: reduced-motion switch reset event`);
  await page.emulateMedia({ reducedMotion: "no-preference" });

  // Pointer cancellation on a held direction must stop movement without spending a chance.
  const leftCenter = await frame.locator("#dinoCraneLeft").evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  const beforeCancel = await snapshot(frame);
  await frame.locator("#dinoCraneLeft").dispatchEvent("pointerdown", { pointerId: 71, pointerType: "touch", isPrimary: true, clientX: leftCenter.x, clientY: leftCenter.y });
  await waitSnapshot(frame, state => state.pointerIds.includes(71), `${browserName}: crane direction pointer was not registered`);
  await frame.locator("#dinoCraneLeft").dispatchEvent("pointercancel", { pointerId: 71, pointerType: "touch", isPrimary: true, clientX: leftCenter.x, clientY: leftCenter.y });
  const cancelled = await waitSnapshot(frame, state => state.pointerIds.length === 0, `${browserName}: pointercancel left a stale crane pointer`);
  assert.equal(cancelled.phase, "crane-ready", `${browserName}: pointercancel changed crane phase`);
  assert.equal(cancelled.crane.chances, beforeCancel.crane.chances, `${browserName}: pointercancel spent a chance`);
  assert.equal(cancelled.crane.placedCount, 0, `${browserName}: pointercancel placed cargo`);

  const craneControl = frame.locator("#dinoCraneLower");
  await craneControl.focus();
  async function moveCraneToX(targetX, label) {
    for (let index = 0; index < 180; index += 1) {
      const state = await snapshot(frame);
      const dx = targetX - state.crane.hook.x;
      const velocity = state.crane.hook.velocity;
      if (Math.abs(dx) <= 8 && Math.abs(velocity) <= 12) return state;
      // Releasing a held direction has real momentum. Let the trolley brake
      // before correcting so the automated player behaves like a child who
      // centres the hook, rather than observing one transient in-range frame.
      if (Math.abs(dx) <= 30 && Math.abs(velocity) > 12 && Math.sign(velocity) === Math.sign(dx)) {
        await page.waitForTimeout(35);
        continue;
      }
      const key = dx < 0 ? "ArrowLeft" : "ArrowRight";
      await craneControl.focus();
      await page.keyboard.down(key);
      await page.waitForTimeout(Math.abs(dx) < 35 ? 10 : Math.abs(dx) < 90 ? 20 : 34);
      await page.keyboard.up(key);
      await page.waitForTimeout(32);
    }
    assert.fail(`${browserName}: ${label}; latest=${JSON.stringify(await snapshot(frame))}`);
  }
  async function attachCargo(id, useKeyboard = false) {
    const before = await snapshot(frame);
    const cargo = before.crane.cargos.find(item => item.id === id);
    assert.ok(cargo && !cargo.placed, `${browserName}: cargo ${id} unavailable before attach`);
    await moveCraneToX(cargo.ring.x, `could not align with ${id}`);
    if (useKeyboard) await craneControl.press("Enter");
    else await craneControl.click();
    return waitSnapshot(frame, state => state.phase === "crane-carrying" && state.crane.attachedId === id, `${browserName}: ${id} did not auto-attach after lowering`, 6000);
  }
  async function placeCargo(id, bayIndex, useKeyboard = false) {
    const carrying = await snapshot(frame);
    assert.equal(carrying.crane.attachedId, id, `${browserName}: wrong cargo carried before ${id} placement`);
    const bayX = carrying.crane.geometry.bayXs[bayIndex];
    await moveCraneToX(bayX, `could not align ${id} with bay ${bayIndex}`);
    await waitStableCraneGreen(frame, id, bayX, `${browserName}: ${id} never settled in the green timing window`);
    if (useKeyboard) await craneControl.press("Enter");
    else await craneControl.click();
    return waitSnapshot(frame, state => state.crane.cargos.find(item => item.id === id)?.placed && (state.phase === "crane-ready" || state.phase === "crane-success"), `${browserName}: ${id} was not placed in its own bay`, 6000);
  }

  await attachCargo("branch", true);
  const branchPlaced = await placeCargo("branch", 0, true);
  assert.equal(branchPlaced.crane.placedCount, 1);
  assert.equal(branchPlaced.crane.blockedCount, 2);
  assert.equal(await frame.locator("#dinoCraneGame").getAttribute("data-blocked-count"), "2");
  assert.equal(branchPlaced.crane.chances, 3);

  // Three misses lose this event only; retry preserves already placed cargo.
  for (const expectedChances of [2, 1]) {
    await craneControl.click();
    const miss = await waitSnapshot(frame, state => state.phase === "crane-ready" && state.crane.chances === expectedChances, `${browserName}: miss did not return to the same crane event`, 6000);
    assert.equal(miss.crane.placedCount, 1);
    assert.equal(miss.crane.cargos.find(item => item.id === "branch").placed, true);
  }
  await craneControl.click();
  const lostCrane = await waitSnapshot(frame, state => state.phase === "crane-lost", `${browserName}: third crane miss did not show event retry`, 6000);
  assert.equal(lostCrane.crane.chances, 0);
  assert.equal(lostCrane.crane.misses, 3);
  assert.equal(lostCrane.crane.placedCount, 1);
  assert.equal(lostCrane.eventIndex, 0);
  assert.equal(await frame.locator("#dinoCraneRetry").isVisible(), true, `${browserName}: crane retry button missing after three misses`);
  await frame.locator("#dinoCraneRetry").press("Enter");
  const retriedCrane = await waitSnapshot(frame, state => state.phase === "crane-ready" && state.crane.attempt === 2, `${browserName}: crane event retry did not resume`, 6000);
  assert.equal(retriedCrane.crane.chances, 3);
  assert.equal(retriedCrane.crane.placedCount, 1);
  assert.equal(retriedCrane.crane.cargos.find(item => item.id === "branch").placed, true);

  await attachCargo("log");
  const logPlaced = await placeCargo("log", 1);
  assert.equal(logPlaced.crane.placedCount, 2);
  assert.equal(logPlaced.crane.blockedCount, 1);
  assert.equal(await frame.locator("#dinoCraneGame").getAttribute("data-blocked-count"), "1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await attachCargo("rock");
  const craneSuccess = await placeCargo("rock", 2);
  const craneSuccessStartedAt = Date.now();
  assert.equal(craneSuccess.phase, "crane-success");
  assert.equal(craneSuccess.crane.completed, true);
  assert.equal(craneSuccess.eventIndex, 1);
  assert.equal(craneSuccess.crane.scoreGranted, true);
  assert.equal(craneSuccess.crane.attempt, 2);
  assert.equal(craneSuccess.crane.blockedCount, 0);
  assert.equal(await frame.locator("#dinoCraneGame").getAttribute("data-blocked-count"), "0");
  assert.deepEqual(craneSuccess.crane.cargos.map(cargo => [cargo.id, cargo.placed]), [["branch", true], ["log", true], ["rock", true]]);
  await assertHeldSuccessFeedback({
    buttonId: "dinoCraneContinue",
    expectedPhase: "crane-success",
    expectedGuide: "こどもの きょうりゅうが でてこられたよ！",
    startedAt: craneSuccessStartedAt,
    reducedMotion: true
  });
  qaMetrics.craneSuccessHeldMs = Date.now() - craneSuccessStartedAt;
  await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-crane-success-844x390.png`, fullPage: true });

  const beforeCraneContinue = await snapshot(frame);
  await frame.locator("#dinoCraneContinue").press("Enter");
  const afterCraneContinue = await snapshot(frame);
  assert.equal(afterCraneContinue.phase, "travel", `${browserName}: Enter did not acknowledge crane success`);
  assert.equal(afterCraneContinue.transitionCount, beforeCraneContinue.transitionCount + 1, `${browserName}: crane acknowledgement was not exactly one transition`);
  await frame.locator("#dinoCraneContinue").dispatchEvent("click");
  assert.equal((await snapshot(frame)).transitionCount, afterCraneContinue.transitionCount, `${browserName}: stale crane acknowledgement transitioned twice`);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const waterStartedAt = Date.now();
  const waterBriefingState = await waitSnapshot(frame, state => state.phase === "water-briefing" && state.waterBriefingVisible,
    `${browserName}: crane did not transition to the held water briefing`, 20000);
  qaMetrics.waterRevealAfterCraneMs = Date.now() - waterStartedAt;
  assert.equal(waterBriefingState.inputLocked, true, `${browserName}: water board unlocked before the child accepted its objective`);
  assert.equal(waterBriefingState.water.tiles.length, 28, `${browserName}: water briefing did not prepare all 28 tiles`);
  assert.equal(await frame.locator("#dinoWaterStart").isVisible(), true, `${browserName}: water briefing start action is missing`);
  const briefingRotationCount = waterBriefingState.water.rotationCount;
  await frame.locator("#dinoWaterCell15").dispatchEvent("click");
  await page.waitForTimeout(120);
  assert.equal((await snapshot(frame)).water.rotationCount, briefingRotationCount, `${browserName}: water tile rotated behind the briefing`);
  await page.waitForTimeout(780);
  assert.equal((await snapshot(frame)).phase, "water-briefing", `${browserName}: water briefing auto-advanced`);
  await frame.locator("#dinoWaterStart").press("Space");
  const waterInitial = await waitSnapshot(frame, state => state.phase === "water", `${browserName}: water start did not unlock the puzzle`, 5000);
  assert.equal(waterInitial.eventIndex, 1);
  assert.equal(waterInitial.crane.completed, true);
  assert.equal(waterInitial.water.completed, false);
  assert.equal(waterInitial.water.tiles.length, 28);
  assert.equal(waterInitial.water.solved, false);
  assert.deepEqual([...new Set(waterInitial.water.tiles.map(tile => tile.type))].sort(), ["curve", "pond", "rock", "source", "straight", "tee"]);
  await assertRenderedImage(frame.locator("#dinoWaterDinos"), "branch_dino_adventure_waterway_dry_20260722.webp", "water dry");
  await assertRenderedImage(frame.locator("#dinoWaterSuccessScene"), "branch_dino_adventure_waterway_success_20260722.webp", "decoded water success");

  const waterMetrics = await frame.evaluate(() => {
    const grid = document.getElementById("dinoWaterGrid").getBoundingClientRect();
    const hint = document.getElementById("dinoWaterHint").getBoundingClientRect();
    const cells = [...document.querySelectorAll("#dinoWaterGrid .dino-water-cell")].map(element => {
      const rect = element.getBoundingClientRect();
      const images = [...element.querySelectorAll("img")].map(image => ({ src: image.getAttribute("src"), complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight }));
      return { width: rect.width, height: rect.height, kind: element.dataset.kind, images };
    });
    return {
      grid: { left: grid.left, right: grid.right, top: grid.top, bottom: grid.bottom },
      hint: { width: hint.width, height: hint.height },
      cells
    };
  });
  assert.equal(waterMetrics.cells.length, 28, `${browserName}: water grid needs 28 runtime cells`);
  assert.ok(waterMetrics.cells.every(cell => cell.width >= 44 && cell.height >= 44), `${browserName}: undersized water cell`);
  assert.ok(waterMetrics.hint.width >= 44 && waterMetrics.hint.height >= 44, `${browserName}: undersized water hint control`);
  assert.ok(waterMetrics.cells.every(cell => cell.images.length === 2 && cell.images.every(image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)), `${browserName}: blank dry/wet water tile image`);

  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const fit = await frame.evaluate(() => {
      const guide = document.getElementById("dinoAdventureGuide").getBoundingClientRect();
      const playfield = document.querySelector(".dino-water-playfield").getBoundingClientRect();
      const grid = document.getElementById("dinoWaterGrid").getBoundingClientRect();
      const status = document.querySelector(".dino-water-status-row").getBoundingClientRect();
      const hint = document.getElementById("dinoWaterHint").getBoundingClientRect();
      const inside = rect => rect.left >= -2 && rect.right <= innerWidth + 2 && rect.top >= -2 && rect.bottom <= innerHeight + 2;
      return {
        overflowX: document.documentElement.scrollWidth - innerWidth,
        overflowY: document.documentElement.scrollHeight - innerHeight,
        rotateVisible: getComputedStyle(document.getElementById("rotateHint")).display !== "none",
        gridInside: inside(grid),
        hintInside: inside(hint),
        guideGap: playfield.top - guide.bottom,
        statusGap: status.top - playfield.bottom,
        minCell: Math.min(...[...document.querySelectorAll(".dino-water-cell")].map(cell => cell.getBoundingClientRect().width))
      };
    });
    assert.ok(fit.overflowX <= 1 && fit.overflowY <= 1, `${browserName}: water overflow ${width}x${height}: ${JSON.stringify(fit)}`);
    assert.equal(fit.rotateVisible, height > width, `${browserName}: water portrait rotate policy drifted at ${width}x${height}`);
    if (width >= height) {
      assert.equal(fit.gridInside && fit.hintInside, true, `${browserName}: water controls clipped at ${width}x${height}: ${JSON.stringify(fit)}`);
      assert.ok(fit.minCell >= 44, `${browserName}: water tile below 44px at ${width}x${height}: ${fit.minCell}`);
      assert.ok(fit.guideGap >= -2, `${browserName}: water guide overlaps playfield at ${width}x${height}: ${JSON.stringify(fit)}`);
      assert.ok(fit.statusGap >= -2, `${browserName}: water playfield overlaps status row at ${width}x${height}: ${JSON.stringify(fit)}`);
    }
    await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-water-${width}x${height}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  await page.emulateMedia({ reducedMotion: "reduce" });
  const waterReduced = await frame.locator(".dino-water-tile-rotator").first().evaluate(element => ({
    rotation: getComputedStyle(element).transitionDuration,
    dry: getComputedStyle(element.querySelector(".is-dry")).transitionDuration,
    wet: getComputedStyle(element.querySelector(".is-wet")).transitionDuration
  }));
  assert.deepEqual(waterReduced, { rotation: "0s", dry: "0s", wet: "0s" }, `${browserName}: reduced motion left water tile transition active`);
  assert.equal((await snapshot(frame)).phase, "water", `${browserName}: reduced-motion switch reset water event`);
  await page.emulateMedia({ reducedMotion: "no-preference" });

  const beforeKeyboard = await snapshot(frame);
  const rotatable = beforeKeyboard.water.tiles.find(tile => !tile.fixed && !tile.onPath) || beforeKeyboard.water.tiles.find(tile => !tile.fixed);
  assert.ok(rotatable, `${browserName}: water board has no rotatable tile`);
  const rotatableCell = frame.locator(`#dinoWaterCell${rotatable.index}`);
  await rotatableCell.focus();
  await rotatableCell.press("ArrowRight");
  const focusedAfterArrow = await frame.evaluate(() => Number(document.activeElement?.dataset?.waterIndex));
  assert.equal(focusedAfterArrow, rotatable.index % 7 === 6 ? rotatable.index : rotatable.index + 1, `${browserName}: water roving focus did not move right`);
  assert.equal((await snapshot(frame)).water.rotationCount, beforeKeyboard.water.rotationCount, `${browserName}: ArrowRight rotated a water tile`);
  await rotatableCell.focus();
  await rotatableCell.press("Enter");
  const afterKeyboard = await waitSnapshot(frame, state => state.water.rotationCount === beforeKeyboard.water.rotationCount + 1, `${browserName}: Enter did not rotate one water tile`);
  assert.equal(afterKeyboard.water.tiles.find(tile => tile.index === rotatable.index).rotation, (rotatable.rotation + 1) % 4, `${browserName}: Enter rotation was not exactly 90 degrees`);

  const fixedBefore = await snapshot(frame);
  // Fixed endpoints are intentionally aria-disabled. Dispatch the event directly
  // so this assertion verifies the runtime guard instead of Playwright's
  // actionability check short-circuiting before the handler can be exercised.
  await frame.locator("#dinoWaterCell14").dispatchEvent("click");
  await frame.locator("#dinoWaterCell13").dispatchEvent("click");
  const fixedAfter = await snapshot(frame);
  assert.equal(fixedAfter.water.rotationCount, fixedBefore.water.rotationCount, `${browserName}: fixed source/pond consumed a rotation`);
  assert.equal(fixedAfter.water.tiles[14].rotation, fixedBefore.water.tiles[14].rotation, `${browserName}: source rotated`);
  assert.equal(fixedAfter.water.tiles[13].rotation, fixedBefore.water.tiles[13].rotation, `${browserName}: pond rotated`);

  await frame.locator("#dinoWaterHint").click();
  const hinted = await waitSnapshot(frame, state => state.water.helpRemaining === 0, `${browserName}: one-use water hint was not consumed`);
  assert.equal(await frame.locator("#dinoWaterHint").isDisabled(), true, `${browserName}: spent water hint remained enabled`);
  assert.ok(["water", "resolve-water-flow", "resolve-water-crossfade", "resolve-water"].includes(hinted.phase), `${browserName}: water hint left the event in an invalid phase`);

  // Solve through the real 90-degree tile buttons using only the read-only admin snapshot.
  let solveState = await snapshot(frame);
  if (solveState.phase === "water") {
    for (const index of solveState.water.path) {
      const tile = solveState.water.tiles[index];
      if (!tile || tile.fixed) continue;
      const turns = (tile.solutionRotation - tile.rotation + 4) % 4;
      for (let turn = 0; turn < turns; turn += 1) {
        await frame.locator(`#dinoWaterCell${index}`).click();
        solveState = await snapshot(frame);
        if (solveState.phase !== "water") break;
      }
      if (solveState.phase !== "water") break;
    }
  }
  const flowing = await waitSnapshot(frame, state => state.phase === "resolve-water-flow",
    `${browserName}: solved channel did not begin the source-to-pond flow`, 3000);
  assert.deepEqual(flowing.water.flowQueue, flowing.water.path, `${browserName}: water flow did not follow the solved route`);
  assert.equal(flowing.water.flowQueue[0], 14, `${browserName}: water flow did not start at the spring`);
  assert.equal(flowing.water.flowQueue.at(-1), 13, `${browserName}: water flow did not end at the pond`);
  assert.equal(flowing.water.flowIndex, 1, `${browserName}: staged flow did not begin with the spring alone`);
  assert.equal(flowing.water.completed, false, `${browserName}: water committed before reaching the pond`);
  assert.equal(flowing.water.waterCharges, 0, `${browserName}: boss water charges were granted before the pond filled`);
  assert.equal(flowing.water.pondReached, false, `${browserName}: pond was marked reached at the source`);
  assert.deepEqual(flowing.water.wet, flowing.water.flowQueue.slice(0, flowing.water.flowIndex),
    `${browserName}: initial wet tiles did not match the causal flow prefix`);
  const sourceVisual = await frame.evaluate(() => [...document.querySelectorAll(".dino-water-cell")].map(cell => ({
    index: Number(cell.dataset.waterIndex),
    wetState: cell.dataset.wet,
    dryOpacity: Number(getComputedStyle(cell.querySelector(".is-dry")).opacity),
    wetOpacity: Number(getComputedStyle(cell.querySelector(".is-wet")).opacity)
  })));
  assert.equal(sourceVisual.filter(cell => cell.wetState === "true").length, 1, `${browserName}: source frame marked more than one tile wet`);
  assert.ok(sourceVisual.every(cell => cell.index === 14
    ? cell.wetState === "true" && cell.wetOpacity >= 0.95 && cell.dryOpacity <= 0.05
    : cell.wetState === "false" && cell.wetOpacity <= 0.05 && cell.dryOpacity >= 0.95),
  `${browserName}: source frame retained a backwards/full-route water ghost: ${JSON.stringify(sourceVisual)}`);
  await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-water-flow-source-844x390.png`, fullPage: true });

  // Backgrounding must pause the staged fill, not let the pond fill offscreen.
  await frame.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const hiddenFlowStart = await snapshot(frame);
  await page.waitForTimeout(420);
  const hiddenFlowEnd = await snapshot(frame);
  assert.equal(hiddenFlowEnd.phase, "resolve-water-flow", `${browserName}: hidden tab advanced the flow phase`);
  assert.equal(hiddenFlowEnd.water.flowIndex, hiddenFlowStart.water.flowIndex, `${browserName}: hidden tab advanced wet tiles`);
  assert.deepEqual(hiddenFlowEnd.water.wet, hiddenFlowStart.water.wet, `${browserName}: hidden tab changed the wet route`);
  await frame.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  const observedFlowIndexes = new Set([hiddenFlowEnd.water.flowIndex]);
  let lastObservedFlowIndex = hiddenFlowEnd.water.flowIndex;
  let midFlowCaptured = false;
  let midFlowIndex = 0;
  let crossfade = null;
  const flowDeadline = Date.now() + 5000;
  while (Date.now() < flowDeadline) {
    const current = await snapshot(frame);
    if (current.phase === "resolve-water-crossfade") {
      crossfade = current;
      break;
    }
    assert.equal(current.phase, "resolve-water-flow", `${browserName}: water skipped the crossfade phase`);
    assert.deepEqual(current.water.wet, current.water.flowQueue.slice(0, current.water.flowIndex),
      `${browserName}: wet tiles were not a contiguous source-to-pond prefix`);
    if (current.water.flowIndex < current.water.flowQueue.length) {
      assert.equal(current.water.wet.includes(13), false, `${browserName}: pond became wet before the route reached it`);
    }
    if (current.water.flowIndex > lastObservedFlowIndex) {
      const newestWetIndex = current.water.wet.at(-1);
      const opacity = await frame.locator(`#dinoWaterCell${newestWetIndex}`).evaluate(cell => ({
        dry: Number(getComputedStyle(cell.querySelector(".is-dry")).opacity),
        wet: Number(getComputedStyle(cell.querySelector(".is-wet")).opacity)
      }));
      assert.ok(opacity.dry + opacity.wet >= 0.85,
        `${browserName}: newly wet tile flashed blank instead of crossfading: ${JSON.stringify({ newestWetIndex, opacity })}`);
      lastObservedFlowIndex = current.water.flowIndex;
    }
    observedFlowIndexes.add(current.water.flowIndex);
    if (!midFlowCaptured && current.water.flowIndex >= Math.ceil(current.water.flowQueue.length / 2)) {
      midFlowCaptured = true;
      midFlowIndex = current.water.flowIndex;
      await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-water-flow-mid-844x390.png`, fullPage: true });
    }
    await page.waitForTimeout(28);
  }
  assert.ok(crossfade, `${browserName}: source-to-pond flow never entered its crossfade`);
  assert.ok(observedFlowIndexes.size >= 3, `${browserName}: water appeared all at once instead of advancing tile by tile: ${JSON.stringify([...observedFlowIndexes])}`);
  assert.ok(midFlowCaptured && midFlowIndex > flowing.water.flowIndex,
    `${browserName}: mid-flow evidence did not advance beyond the source: ${JSON.stringify({ source: flowing.water.flowIndex, mid: midFlowIndex })}`);
  assert.deepEqual(crossfade.water.wet, crossfade.water.flowQueue, `${browserName}: crossfade began before every route tile was wet`);
  assert.equal(crossfade.water.wet.at(-1), 13, `${browserName}: pond was not the final wet tile`);
  assert.equal(crossfade.water.pondReached, true, `${browserName}: crossfade began without reaching the pond`);
  assert.equal(crossfade.water.completed, false, `${browserName}: crossfade committed success immediately`);
  assert.equal(crossfade.water.waterCharges, 0, `${browserName}: crossfade granted boss water charges early`);
  assert.equal(await frame.locator("#dinoWaterGame.is-filling").count(), 1, `${browserName}: filling class missing during crossfade`);
  assert.equal(await frame.locator("#dinoWaterContinue").isVisible(), false, `${browserName}: continue action appeared before crossfade completed`);
  const crossfadeDetectedAt = Date.now();

  await page.waitForTimeout(280);
  const blend = await frame.evaluate(() => {
    const dry = document.getElementById("dinoWaterDinos");
    const success = document.getElementById("dinoWaterSuccessScene");
    const playfield = document.querySelector(".dino-water-playfield");
    return {
      phase: window.__nazonazoDinoAdventureDebug.snapshot().phase,
      drySrc: dry.getAttribute("src"),
      successSrc: success.getAttribute("src"),
      dryOpacity: Number(getComputedStyle(dry).opacity),
      successOpacity: Number(getComputedStyle(success).opacity),
      playfieldOpacity: Number(getComputedStyle(playfield).opacity)
    };
  });
  assert.equal(blend.phase, "resolve-water-crossfade", `${browserName}: 700ms water crossfade ended too early`);
  assert.equal(blend.drySrc.split("?")[0].split("/").at(-1), "branch_dino_adventure_waterway_dry_20260722.webp",
    `${browserName}: crossfade replaced the dry image source instead of blending two scenes`);
  assert.equal(blend.successSrc.split("?")[0].split("/").at(-1), "branch_dino_adventure_waterway_success_20260722.webp",
    `${browserName}: crossfade success scene used the wrong source`);
  assert.ok(blend.dryOpacity > 0.05 && blend.dryOpacity < 0.95, `${browserName}: dry scene was not mid-fade: ${JSON.stringify(blend)}`);
  assert.ok(blend.successOpacity > 0.05 && blend.successOpacity < 0.95, `${browserName}: success scene was not mid-fade: ${JSON.stringify(blend)}`);
  await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-water-crossfade-844x390.png`, fullPage: true });

  const savedWater = await waitSnapshot(frame, state => state.water.completed && state.phase === "resolve-water", `${browserName}: water success tableau did not appear`, 12000);
  const waterSavedAt = Date.now();
  assert.ok(waterSavedAt - crossfadeDetectedAt >= 560, `${browserName}: water scene crossfade was shorter than its 700ms contract`);
  assert.equal(savedWater.eventIndex, 2);
  assert.equal(savedWater.water.waterCharges, 3, `${browserName}: completed water event did not grant three boss charges`);
  assert.equal(await frame.locator("#dinoWaterGame.is-saved").count(), 1, `${browserName}: water success class missing`);
  await assertRenderedImage(frame.locator("#dinoWaterDinos"), "branch_dino_adventure_waterway_dry_20260722.webp", "retained water dry scene");
  await assertRenderedImage(frame.locator("#dinoWaterSuccessScene"), "branch_dino_adventure_waterway_success_20260722.webp", "water success");
  const finalWaterBlend = await frame.evaluate(() => ({
    dry: Number(getComputedStyle(document.getElementById("dinoWaterDinos")).opacity),
    success: Number(getComputedStyle(document.getElementById("dinoWaterSuccessScene")).opacity),
    playfield: Number(getComputedStyle(document.querySelector(".dino-water-playfield")).opacity)
  }));
  assert.ok(finalWaterBlend.dry <= 0.05 && finalWaterBlend.success >= 0.95 && finalWaterBlend.playfield <= 0.05,
    `${browserName}: final water tableau did not fully reveal the drinking scene: ${JSON.stringify(finalWaterBlend)}`);
  await assertHeldSuccessFeedback({
    buttonId: "dinoWaterContinue",
    expectedPhase: "resolve-water",
    expectedGuide: "きょうりゅうが みずを のめたよ！",
    startedAt: waterSavedAt,
    reducedMotion: false,
    imageFile: "branch_dino_adventure_waterway_success_20260722.webp",
    imageId: "dinoWaterSuccessScene"
  });
  qaMetrics.waterSuccessHeldMs = Date.now() - waterSavedAt;
  await page.screenshot({ path: `/tmp/nazonazo-dino-adventure-${browserName}-water-success-844x390.png`, fullPage: true });
  const beforeWaterContinue = await snapshot(frame);
  const bossTravelStartedAt = Date.now();
  await frame.locator("#dinoWaterContinue").press("Space");
  const afterWaterContinue = await snapshot(frame);
  assert.equal(afterWaterContinue.phase, "travel", `${browserName}: Space did not acknowledge water success`);
  assert.equal(afterWaterContinue.transitionCount, beforeWaterContinue.transitionCount + 1, `${browserName}: water acknowledgement was not exactly one transition`);
  await frame.locator("#dinoWaterContinue").dispatchEvent("click");
  assert.equal((await snapshot(frame)).transitionCount, afterWaterContinue.transitionCount, `${browserName}: stale water acknowledgement transitioned twice`);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const afterWater = await waitSnapshot(frame, state => state.water.completed && state.eventIndex === 2 && state.boss.phase !== "idle", `${browserName}: water did not transition directly to boss once`, 20000);
  qaMetrics.bossRevealAfterWaterContinueMs = Date.now() - bossTravelStartedAt;
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
  const craneAssetFiles = DINO_ASSET_FILES.slice(0, 9);
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
  async function clickPhysical(locator) {
    const box = await locator.boundingBox();
    assert.ok(box, `${browserName}: physical pointer target missing`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
  await frame.locator("#startBtn").click();
  const warning = await waitSnapshot(frame, state => state.phase === "travel" && state.driving && state.noticeVisible,
    `${browserName}: pointer parity missed the moving approach warning`, 10000);
  assert.equal(warning.craneBriefingVisible, false, `${browserName}: pointer parity showed the briefing before stopping`);
  const briefing = await waitSnapshot(frame, state => state.phase === "crane-briefing" && state.craneBriefingVisible,
    `${browserName}: pointer parity did not hold at the rescue briefing`, 20000);
  assert.equal(briefing.inputLocked, true, `${browserName}: pointer parity crane was interactive behind the briefing`);
  assert.equal(briefing.crane.blockedCount, 3, `${browserName}: pointer parity rescue did not begin with three blockers`);
  const pointerReady = await waitSnapshot(frame,
    state => state.phase === "crane-briefing" && state.crane.assetsReady && state.crane.successBackdropReady,
    `${browserName}: pointer parity crane art did not become ready`, 30000);
  assert.equal(pointerReady.transitionCount, briefing.transitionCount, `${browserName}: pointer parity asset readiness advanced the event`);
  await frame.waitForFunction(() => {
    const button = document.getElementById("dinoCraneStart");
    return button && !button.disabled && button.textContent.trim() === "たすける！" && !button.hasAttribute("aria-busy");
  }, null, { timeout: 30000 });
  await clickPhysical(frame.locator("#dinoCraneStart"));
  const initial = await waitSnapshot(frame, state => state.phase === "crane-ready" && state.crane.attempt === 1,
    `${browserName}: physical pointer did not start the crane rescue`, 5000);
  assert.equal(initial.crane.blockedCount, 3, `${browserName}: crane briefing changed the blocker count`);
  await frame.locator("#dinoCraneBackdrop").waitFor({ state: "visible", timeout: 3000 });
  assert.equal((await frame.locator("#dinoCraneBackdrop").getAttribute("src")).split("?")[0].split("/").at(-1),
    "branch_dino_adventure_rescue_before_20260723.webp", `${browserName}: pointer parity used the wrong blocked rescue scene`);
  assert.equal((await frame.locator("#dinoCraneSuccessBackdrop").getAttribute("src")).split("?")[0].split("/").at(-1),
    "branch_dino_adventure_rescue_success_20260723.webp", `${browserName}: pointer parity used the wrong success rescue scene`);
  const pointerEvidence = {};
  const captureEvidence = value => ({
    phase: value.phase,
    hook: value.crane.hook,
    attachedId: value.crane.attachedId,
    swing: value.crane.swing,
    swingGreen: value.crane.swingGreen,
    placed: value.crane.cargos.map(cargo => [cargo.id, cargo.placed])
  });
  async function moveCranePointerToX(targetX, label) {
    for (let pass = 0; pass < 120; pass += 1) {
      const before = await snapshot(frame);
      const dx = targetX - before.crane.hook.x;
      const velocity = before.crane.hook.velocity;
      if (Math.abs(dx) <= 8 && Math.abs(velocity) <= 12) return before;
      if (Math.abs(dx) <= 30 && Math.abs(velocity) > 12 && Math.sign(velocity) === Math.sign(dx)) {
        await page.waitForTimeout(35);
        continue;
      }
      const button = frame.locator(dx < 0 ? "#dinoCraneLeft" : "#dinoCraneRight");
      const box = await button.boundingBox();
      assert.ok(box, `${browserName}: pointer direction button missing`);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      const startSign = Math.sign(dx);
      const frameLimit = Math.abs(dx) < 35 ? 1 : Math.abs(dx) < 90 ? 2 : 16;
      for (let frameIndex = 0; frameIndex < frameLimit; frameIndex += 1) {
        await page.waitForTimeout(12);
        const moving = await snapshot(frame);
        const movingDx = targetX - moving.crane.hook.x;
        if (Math.abs(movingDx) <= 8 || Math.sign(movingDx) !== startSign) break;
      }
      await page.mouse.up();
      await page.waitForTimeout(32);
    }
    assert.fail(`${browserName}: ${label}; latest=${JSON.stringify(await snapshot(frame))}`);
  }
  async function pointerPlaceCargo(id, bayIndex) {
    const before = await snapshot(frame);
    const cargo = before.crane.cargos.find(item => item.id === id);
    assert.ok(cargo && !cargo.placed, `${browserName}: pointer cargo ${id} unavailable`);
    await moveCranePointerToX(cargo.ring.x, `pointer could not align with ${id}`);
    await clickPhysical(frame.locator("#dinoCraneLower"));
    const held = await waitSnapshot(frame, value => value.phase === "crane-carrying" && value.crane.attachedId === id, `${browserName}: pointer lower did not auto-attach ${id}`, 6000);
    pointerEvidence[`${id}Held`] = captureEvidence(held);
    const bayX = held.crane.geometry.bayXs[bayIndex];
    await moveCranePointerToX(bayX, `pointer could not align ${id} with bay ${bayIndex}`);
    const ready = await waitStableCraneGreen(frame, id, bayX, `${browserName}: pointer ${id} did not settle in green timing`);
    pointerEvidence[`${id}Ready`] = captureEvidence(ready);
    await clickPhysical(frame.locator("#dinoCraneLower"));
    const placed = await waitSnapshot(frame, value => value.crane.cargos.find(item => item.id === id)?.placed && (value.phase === "crane-ready" || value.phase === "crane-success"), `${browserName}: pointer did not place ${id}`, 6000);
    const expectedBlocked = 3 - placed.crane.placedCount;
    assert.equal(placed.crane.blockedCount, expectedBlocked, `${browserName}: pointer placement did not reduce the blocker count`);
    assert.equal(await frame.locator("#dinoCraneGame").getAttribute("data-blocked-count"), String(expectedBlocked),
      `${browserName}: pointer placement did not update the visual blocker state`);
    pointerEvidence[`${id}Placed`] = captureEvidence(placed);
    return placed;
  }

  await pointerPlaceCargo("branch", 0);
  await page.screenshot({ path: `/tmp/nazonazo-dino-crane-pointer-${browserName}-branch-1174x658.png`, fullPage: true });
  await pointerPlaceCargo("log", 1);
  await page.screenshot({ path: `/tmp/nazonazo-dino-crane-pointer-${browserName}-log-1174x658.png`, fullPage: true });
  const success = await pointerPlaceCargo("rock", 2);
  const successAt = Date.now();
  assert.equal(success.phase, "crane-success");
  assert.equal(success.crane.completed, true);
  assert.equal(success.eventIndex, 1);
  assert.equal(success.crane.scoreGranted, true);
  assert.equal(await frame.locator("#dinoCraneSuccessBackdrop").isVisible(), true, `${browserName}: pointer success did not reveal the reunion scene`);
  pointerEvidence.success = captureEvidence(success);
  const continueButton = frame.locator("#dinoCraneContinue");
  await continueButton.waitFor({ state: "visible", timeout: 3000 });
  await page.waitForTimeout(Math.max(0, successAt + 400 - Date.now()));
  const foreground = await frame.evaluate(() => ({
    stampZ: Number(getComputedStyle(document.getElementById("stamp")).zIndex),
    layerZ: Number(getComputedStyle(document.getElementById("dinoAdventureLayer")).zIndex),
    stampOpacity: Number(getComputedStyle(document.getElementById("stamp")).opacity)
  }));
  assert.ok(foreground.stampZ > foreground.layerZ && foreground.stampOpacity >= 0.8, `${browserName}: pointer success stamp was not initially in front: ${JSON.stringify(foreground)}`);
  await page.waitForTimeout(Math.max(0, successAt + 1800 - Date.now()));
  const finiteStamp = await frame.evaluate(() => ({ className: document.getElementById("stamp").className, opacity: Number(getComputedStyle(document.getElementById("stamp")).opacity) }));
  assert.ok(finiteStamp.className === "" || finiteStamp.opacity <= 0.05, `${browserName}: normal-motion success stamp became permanent: ${JSON.stringify(finiteStamp)}`);
  await page.waitForTimeout(Math.max(0, successAt + 2600 - Date.now()));
  const heldSuccess = await snapshot(frame);
  assert.equal(heldSuccess.phase, "crane-success", `${browserName}: pointer success auto-advanced before acknowledgement`);
  assert.equal(await continueButton.isVisible(), true, `${browserName}: pointer success continue action disappeared`);
  assert.equal(await frame.locator("#dinoAdventureGuide").textContent(), "こどもの きょうりゅうが でてこられたよ！");
  await page.screenshot({ path: `/tmp/nazonazo-dino-crane-pointer-${browserName}-success-1174x658.png`, fullPage: true });

  const beforeContinue = await snapshot(frame);
  await clickPhysical(continueButton);
  const continued = await snapshot(frame);
  assert.equal(continued.phase, "travel", `${browserName}: physical pointer did not acknowledge crane success`);
  assert.equal(continued.transitionCount, beforeContinue.transitionCount + 1, `${browserName}: pointer acknowledgement was not one-shot`);
  await continueButton.dispatchEvent("click");
  assert.equal((await snapshot(frame)).transitionCount, continued.transitionCount, `${browserName}: stale pointer acknowledgement transitioned twice`);

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
  const travelling = await waitSnapshot(frame, state => state.phase === "travel" && state.driving && state.noticeVisible,
    `${browserName}: stale-reveal journey did not reach its moving warning`, 10000);
  const loadingBriefing = await waitSnapshot(frame,
    state => state.phase === "crane-briefing" && state.craneBriefingVisible && !state.crane.assetsReady,
    `${browserName}: stale-reveal journey did not expose the secondary crane decode window`, 20000);
  assert.equal(await frame.locator("#dinoCraneStart").isDisabled(), true, `${browserName}: stale-reveal secondary decode did not keep start disabled`);
  assert.equal((await frame.locator("#dinoCraneStart").textContent()).trim(), "よみこみちゅう", `${browserName}: stale-reveal secondary decode lacked its loading label`);
  assert.equal(await frame.locator("#dinoCraneStart").getAttribute("aria-busy"), "true", `${browserName}: stale-reveal secondary decode lacked aria-busy`);
  await page.evaluate(() => window.qaSelect("cat"));
  const reset = await waitSnapshot(frame, state => state.phase === "idle" && state.epoch > loadingBriefing.epoch, `${browserName}: stage exit did not invalidate dino epoch`, 5000);
  await frame.waitForFunction(() => document.body.classList.contains("st-cat"), null, { timeout: 5000 });
  await page.waitForTimeout(slowAssetDelayMs * 2 + 2200);
  const afterDelay = await snapshot(frame);
  const staleDom = await frame.evaluate(() => ({
    layerHidden: document.getElementById("dinoAdventureLayer").hidden,
    layerAriaHidden: document.getElementById("dinoAdventureLayer").getAttribute("aria-hidden"),
    craneHidden: document.getElementById("dinoCraneGame").hidden,
    waterHidden: document.getElementById("dinoWaterGame").hidden,
    bossHidden: document.getElementById("dinoBossGame").hidden,
    activeClass: document.body.classList.contains("dino-adventure-active") || document.body.classList.contains("dino-crane-active") || document.body.classList.contains("dino-boss-active"),
    startDisabled: document.getElementById("dinoCraneStart").disabled,
    startText: document.getElementById("dinoCraneStart").textContent.trim(),
    startBusy: document.getElementById("dinoCraneStart").getAttribute("aria-busy")
  }));
  assert.equal(afterDelay.phase, "idle", `${browserName}: stale predecode callback changed phase after stage exit`);
  assert.equal(afterDelay.epoch, reset.epoch, `${browserName}: stale predecode callback changed epoch after stage exit`);
  assert.deepEqual(staleDom, {
    layerHidden: true,
    layerAriaHidden: "true",
    craneHidden: true,
    waterHidden: true,
    bossHidden: true,
    activeClass: false,
    startDisabled: false,
    startText: "たすける！",
    startBusy: null
  }, `${browserName}: stale secondary decode callback changed reset dino DOM after stage exit`);
  assert.deepEqual(pageErrors, [], `${browserName}: stale-reveal page errors\n${pageErrors.join("\n")}`);
  const unexpectedRequestFailures = requestFailures.filter(failure => !/^HEAD .+\/admin\/ net::ERR_ABORTED$/.test(failure));
  assert.deepEqual(unexpectedRequestFailures, [], `${browserName}: stale-reveal request failures\n${unexpectedRequestFailures.join("\n")}`);
  console.log(`nazonazo dino stale reveal (${browserName}): PASS (${slowAssetDelayMs}ms delayed assets, epoch ${travelling.epoch}->${reset.epoch}, exited during secondary decode)`);
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
    css: replaceExactlyOnce(candidate.css, '  .dino-crane-ring-guides>i,.dino-water-game.is-saved .dino-water-success-scene,.dino-boss-game[data-phase="defend"] .dino-boss-trex,.dino-boss-wave,.dino-boss-game[data-phase="burst"] .dino-boss-tug>i,.dino-boss-action.is-burst{animation:none!important}', "  .removed-dino-reduced-motion{animation:none!important}")
  }));
  sourceMutation("wet tiles flash blank instead of crossfading", "water-tile-crossfade", candidate => ({
    ...candidate,
    css: replaceExactlyOnce(candidate.css,
      ".dino-water-tile-rotator>.is-dry,.dino-water-tile-rotator>.is-wet{transition:opacity .2s ease}",
      ".dino-water-tile-rotator>.is-wet{transition:opacity .2s ease}")
  }));
  sourceMutation("solved water flashes the full route before restarting at the source", "water-flow-reset", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game,
      "if(dinoWaterGrid)void dinoWaterGrid.offsetWidth;",
      'if(dinoWaterGrid)dinoWaterGrid.dataset.flowReset="skipped";')
  }));
  sourceMutation("water event reveals before asset predecode", "asset-predecode-gate", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "Promise.all([preloadDinoWaterSceneAssets(),preloadDinoWaterTileAssets()]).then(()=>revealDinoWaterEvent(epoch));", "revealDinoWaterEvent(epoch);")
  }));
  sourceMutation("slow-network decode fallback regresses to eight seconds", "asset-predecode", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "DINO_ADVENTURE_ASSET_READY_TIMEOUT_MS=24000", "DINO_ADVENTURE_ASSET_READY_TIMEOUT_MS=8000")
  }));
  sourceMutation("dino stage entry eagerly saturates the network with crane art", "asset-priority-entry", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game,
      'if(st&&st.id==="dino")preloadDinoRescueAssets();',
      'if(st&&st.id==="dino"){preloadDinoRescueAssets();preloadDinoCraneAssets();}')
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
  sourceMutation("crane success regains an automatic timer", "crane-manual-success-hold", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, 'dinoAdventureSetPhase("crane-success",0,now)', 'dinoAdventureSetPhase("crane-success",1250,now)')
  }));
  sourceMutation("crane continue action loses its handler", "success-continue-binding", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, 'if(dinoCraneContinue)bindTap(dinoCraneContinue,()=>{ensureAC();finishDinoCraneSuccess();});', '')
  }));
  sourceMutation("pointercancel no longer stops held crane movement", "crane-pointercancel-retry", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, 'if(dinoCraneLeft){dinoCraneLeft.addEventListener("pointerdown",event=>beginDinoCraneMovePointer(event,-1,dinoCraneLeft));for(const type of ["pointerup","pointercancel","lostpointercapture"])', 'if(dinoCraneLeft){dinoCraneLeft.addEventListener("pointerdown",event=>beginDinoCraneMovePointer(event,-1,dinoCraneLeft));for(const type of ["pointerup","lostpointercapture"])')
  }));
  sourceMutation("crane reveals without its asset predecode gate", "crane-asset-predecode-gate", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "preloadDinoRescueAssets().then(()=>revealDinoCraneEvent(epoch));", "revealDinoCraneEvent(epoch);")
  }));
  sourceMutation("stale crane reveal ignores its epoch", "crane-stale-reveal-guard", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, 'if(!isDinoAdventureStage()||!playing||dinoAdventureState.epoch!==epoch||dinoAdventureState.phase!=="travel"||dinoAdventureState.crane.completed)return;', 'if(!isDinoAdventureStage()||!playing||dinoAdventureState.phase!=="travel"||dinoAdventureState.crane.completed)return;')
  }));
  sourceMutation("disabled crane start bypasses its asset-ready gate", "crane-start-loading-gate", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "if(!crane.assetsReady){", "if(false){")
  }));
  sourceMutation("secondary crane decode loses its stale epoch guard", "crane-stale-reveal-guard", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game,
      'if(!isDinoAdventureStage()||!playing||state.epoch!==epoch||state.phase!=="crane-briefing"||crane.completed||crane.assetsReady)return false;',
      'if(!isDinoAdventureStage()||!playing||state.phase!=="crane-briefing"||crane.completed||crane.assetsReady)return false;')
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
    game: replaceExactlyOnce(candidate.game, 'startX:.26,bay:2', 'startX:.26,bay:1')
  }));
  sourceMutation("rescue cargoes return to the train-level ground", "crane-rescue-grounding", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "ringY=rescueGroundY-(def.bbox[3]-def.anchorY)*size", "ringY=groundY-(def.bbox[3]-def.anchorY)*size")
  }));
  sourceMutation("short-landscape ring guides cover the trapped child again", "crane-short-ring-visibility", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game,
      "g.height<=360?clamp(g.hookSize*.55,30,34):clamp(g.hookSize*.70,38,58)",
      "clamp(g.hookSize*.70,38,58)")
  }));
  sourceMutation("water tap rotates 180 degrees", "water-rotation-contract", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "tile.rotation=(tile.rotation+1)%4", "tile.rotation=(tile.rotation+2)%4")
  }));
  sourceMutation("water help becomes reusable", "water-state", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "helpRemaining:1,rotationCount:0", "helpRemaining:2,rotationCount:0")
  }));
  sourceMutation("water success regains an automatic timer", "water-manual-success-hold", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, 'state.phaseEndAt=0;if(dinoWaterContinue)dinoWaterContinue.hidden=false', 'state.phaseEndAt=now+1250;if(dinoWaterContinue)dinoWaterContinue.hidden=false')
  }));
  sourceMutation("water continue action loses its handler", "success-continue-binding", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, 'if(dinoWaterContinue)bindTap(dinoWaterContinue,()=>{ensureAC();finishDinoWaterSuccess();});', '')
  }));
  sourceMutation("success stamp falls behind the adventure layer", "success-stamp-front", candidate => ({
    ...candidate,
    css: replaceRegexExactlyOnce(
      candidate.css,
      /(body\.dino-adventure-success\s+#stamp\s*\{[^}]*\bz-index\s*:\s*)23\b/,
      (_match, prefix) => `${prefix}12`
    )
  }));
  sourceMutation("success stamp becomes a permanent cover", "success-stamp-finite", candidate => ({
    ...candidate,
    css: replaceRegexExactlyOnce(
      candidate.css,
      /(body\.dino-adventure-success\s+#stamp\s*\{[^}]*\bz-index\s*:\s*23;?)/,
      (_match, prefix) => `${prefix}opacity:1!important;`
    )
  }));
  sourceMutation("reduced-motion success stamp disappears too quickly", "success-stamp-finite", candidate => ({
    ...candidate,
    game: replaceExactlyOnce(candidate.game, "},1250);", "},250);")
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
