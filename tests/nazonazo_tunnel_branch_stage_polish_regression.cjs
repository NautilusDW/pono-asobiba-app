#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const sources = Object.freeze({
  game: read("nazonazo-tunnel/js/game.js"),
  html: read("nazonazo-tunnel/index.html"),
  css: read("nazonazo-tunnel/styles.css"),
  sw: read("sw.js")
});

const STAGE_IDS = Object.freeze(["snow", "fire", "dino", "toy", "cat", "fantasy", "sky", "ruins"]);
const LAYER_KEYS = Object.freeze(["sky", "horizon", "mid", "ground", "fg", "decor"]);
const TOKEN = "20260723-1421";
const SW_VERSION = 2345;
const THREE_MIB = 3 * 1024 * 1024;
const EXPECTED_VALIDATE_CHECKS = 143;
const CANONICAL = Object.freeze([
  Object.freeze({ name: "effect_snowflake_particle_20260720.webp", bytes: 339906, width: 792, height: 927, sha256: "e2288efcadbf3ab0c16dde0a6d4c2fd167560dbf941cf2e1712ac12a801f6ce6" }),
  Object.freeze({ name: "effect_diamond_dust_particle_20260720.webp", bytes: 31940, width: 341, height: 364, sha256: "2ddda0ab3c410debfa117b3ff1d0bb04c6c9571d27df40da1c9745b285dd2ff1" }),
  Object.freeze({ name: "effect_fire_flame_particle_a_depthfix_20260721.webp", bytes: 406580, width: 640, height: 863, sha256: "9b52d614385f5fbad7fb3384996801206bd7ae92062c0ce84c353b6de4d547d7" }),
  Object.freeze({ name: "effect_fire_ember_particle_depthfix_20260721.webp", bytes: 70944, width: 407, height: 422, sha256: "3af58af80ab989b8334a18a63a2463917ba9d9e3888d622e45b6606ee26c4889" }),
  Object.freeze({ name: "branch_toy_mid_variety_cutout_loop_20260720.webp", bytes: 831368, width: 3072, height: 556, sha256: "0bb8bfd2abadbaa67da0ff4c9cb6bc77bc90b93ae3c4ba4b149c53829a45a0c8" }),
  Object.freeze({ name: "branch_toy_decor_variety_cutout_loop_20260720.webp", bytes: 525816, width: 3072, height: 260, sha256: "380919cd93b7fefcc3c14fcc1d5402ad9e19fe49e96250a7d70d8dd037388615" }),
  Object.freeze({ name: "branch_dino_far_herd_cutout_20260721.webp", bytes: 599190, width: 1894, height: 367, sha256: "9217d6f0c2e59abb9c8285fa4d0d305b85d6f4e4ed4e9b1d5223c2381a1add9e" }),
  Object.freeze({ name: "branch_dino_mid_open_cutout_loop_20260721.webp", bytes: 1299604, width: 3884, height: 379, sha256: "8967a62bcea463a528443565529b5d4550762b04178143df2cd3590d1e9a9019" }),
  Object.freeze({ name: "branch_dino_waterhole_cutout_20260721.webp", bytes: 1391088, width: 1533, height: 722, sha256: "b87326655e514888c2bd16dd22d0fec15021790e240ba49029f94217822af760" }),
  Object.freeze({ name: "branch_dino_stegosaurus_family_cutout_20260721.webp", bytes: 1278052, width: 1448, height: 769, sha256: "b77db471d3da2bc326a4addafbdf472979004b42c2e862828c9060dac0257948" }),
  Object.freeze({ name: "branch_dino_parasaurolophus_herd_cutout_20260721.webp", bytes: 1298290, width: 1453, height: 769, sha256: "3c78ac818652d71218d546b1a7ad9fe1624b973e28dd8d24e628b707fdc947af" }),
  Object.freeze({ name: "branch_dino_sauropod_clearing_cutout_20260721.webp", bytes: 1284156, width: 1479, height: 925, sha256: "45f8436c443aee116b65bc4f726957119b4dacc4d202a6cef794e422c04bb942" }),
  Object.freeze({ name: "branch_dino_trex_glimpse_cutout_20260721.webp", bytes: 448860, width: 876, height: 544, sha256: "9aa49541e709bfeb3f42e3fed0c3a5104945902f5f0e808aeaf88c5908da2272" }),
  Object.freeze({ name: "branch_cat_cottage_life_cutout_20260721.webp", bytes: 1404818, width: 1263, height: 974, sha256: "5784cc8b02bb91312f413b18947d0980eb93a3844d45817a685be0ef597d84e0" }),
  Object.freeze({ name: "branch_cat_garden_life_cutout_20260721.webp", bytes: 1295130, width: 1463, height: 849, sha256: "cc144caa6932004f19cdd07ef8bcdcd0e751637449a0d1dbb3f485434a6722f1" }),
  Object.freeze({ name: "branch_cat_fence_life_cutout_20260721.webp", bytes: 1152524, width: 1423, height: 944, sha256: "42dc3b5d9393982e3ee5a4a76894f7b539f657a53387d07fb89b1d10bd46fd0e" }),
  Object.freeze({ name: "branch_cat_rooftop_life_cutout_20260721.webp", bytes: 823520, width: 1204, height: 662, sha256: "acaf5c382221f6af92259b8c4ae88c5e1b0335c34a17012724336722321d8342" }),
  Object.freeze({ name: "branch_cat_bridge_life_cutout_20260721.webp", bytes: 1251734, width: 1485, height: 907, sha256: "a9d0dfc57d76687b786fc74fa3034bf7264b592d4885c94d387c64b9091109da" }),
  Object.freeze({ name: "branch_cat_plaza_life_cutout_20260721.webp", bytes: 1242526, width: 1488, height: 780, sha256: "7e5b38fda89918cf73b5d4dfcabcea2c4486bf009df82ec814be8f7dc0294dc2" }),
  Object.freeze({ name: "branch_cat_tree_life_cutout_20260721.webp", bytes: 1195960, width: 1108, height: 998, sha256: "bf325f90a9381e026e9cea4dfb503e8c674d90ecb2804f2981ac66c347faf046" }),
  Object.freeze({ name: "branch_cat_lane_life_cutout_20260721.webp", bytes: 1290886, width: 1366, height: 979, sha256: "5f440f5a170757bc412f4430e5ac99d399ee46284e2b8d6115a0333c8fe6c116" }),
  Object.freeze({ name: "branch_cat_foreground_no_yarn_cutout_loop_20260721.webp", bytes: 549636, width: 3884, height: 165, sha256: "50197a9ad53a6000aa65a58fe4e6f6fcabb1ea7fc9ffad26292efecc960744bd" }),
  Object.freeze({ name: "branch_cat_decor_no_yarn_cutout_loop_20260721.webp", bytes: 169202, width: 3764, height: 114, sha256: "5b0d1890ceb1698b516e5fd0d6f64988b0193d15b862806bcb6884e96396d163" })
]);

const EXTRA_URLS = Object.freeze({
  snow: Object.freeze({
    snowflake: "../assets/images/nazonazo-tunnel/effect_snowflake_particle_20260720.webp",
    diamond: "../assets/images/nazonazo-tunnel/effect_diamond_dust_particle_20260720.webp"
  }),
  fire: Object.freeze({
    volcano: "../assets/images/nazonazo-tunnel/branch_fire_distant_volcano_worldfix_20260721.webp",
    flame: "../assets/images/nazonazo-tunnel/effect_fire_flame_particle_a_depthfix_20260721.webp",
    ember: "../assets/images/nazonazo-tunnel/effect_fire_ember_particle_depthfix_20260721.webp"
  }),
  dino: Object.freeze({
    farHerd: "../assets/images/nazonazo-tunnel/branch_dino_far_herd_cutout_worldfix_20260721.webp",
    waterhole: "../assets/images/nazonazo-tunnel/branch_dino_waterhole_cutout_worldfix_20260721.webp",
    stegosaurus: "../assets/images/nazonazo-tunnel/branch_dino_stegosaurus_cutout_worldfix_20260721.webp",
    parasaurolophus: "../assets/images/nazonazo-tunnel/branch_dino_parasaurolophus_cutout_worldfix_20260721.webp",
    sauropod: "../assets/images/nazonazo-tunnel/branch_dino_sauropod_cutout_worldfix_20260721.webp",
    trex: "../assets/images/nazonazo-tunnel/branch_dino_trex_cutout_worldfix_20260721.webp",
    nest: "../assets/images/nazonazo-tunnel/branch_dino_fern_nest_worldfix_20260721.webp"
  }),
  cat: Object.freeze({
    cottage: "../assets/images/nazonazo-tunnel/branch_cat_cottage_life_cutout_20260721.webp",
    garden: "../assets/images/nazonazo-tunnel/branch_cat_garden_life_cutout_20260721.webp",
    fence: "../assets/images/nazonazo-tunnel/branch_cat_fence_life_cutout_20260721.webp",
    rooftop: "../assets/images/nazonazo-tunnel/branch_cat_rooftop_life_cutout_20260721.webp",
    bridge: "../assets/images/nazonazo-tunnel/branch_cat_bridge_life_cutout_20260721.webp",
    plaza: "../assets/images/nazonazo-tunnel/branch_cat_plaza_life_cutout_20260721.webp",
    tree: "../assets/images/nazonazo-tunnel/branch_cat_tree_life_cutout_20260721.webp",
    lane: "../assets/images/nazonazo-tunnel/branch_cat_lane_life_cutout_20260721.webp",
    farTownA: "../assets/images/nazonazo-tunnel/branch_cat_far_town_a_worldfix_20260721.webp",
    farTownB: "../assets/images/nazonazo-tunnel/branch_cat_far_town_b_worldfix_20260721.webp",
    midGardenA: "../assets/images/nazonazo-tunnel/branch_cat_mid_garden_a_worldfix_20260721.webp",
    midLaneB: "../assets/images/nazonazo-tunnel/branch_cat_mid_lane_b_worldfix_20260721.webp"
  })
});

const STAGE_Y = Object.freeze({
  snow: Object.freeze(["18.57vh", "18.07vh"]),
  fire: Object.freeze(["0vh", "0vh"]),
  dino: Object.freeze(["-8.2vh", "0vh"]),
  toy: Object.freeze(["11.51vh", "-15.84vh"]),
  cat: Object.freeze(["24.15vh", "19.82vh"]),
  fantasy: Object.freeze(["-20vh", "8.99vh"]),
  sky: Object.freeze(["-.35vh", "-1.98vh"]),
  ruins: Object.freeze(["8.42vh", "19.45vh"])
});
const STAGE_GEOMETRY = Object.freeze({
  snow: Object.freeze({ decorHeight: "20vh", decorBottom: "11.5vh", fgHeight: "19.9vh" }),
  fire: Object.freeze({ decorHeight: "0vh", decorBottom: "0vh", fgHeight: "13.5vh" }),
  dino: Object.freeze({ decorHeight: "0vh", decorBottom: "11.5vh", fgHeight: "22vh" }),
  toy: Object.freeze({ decorHeight: "20vh", decorBottom: "17.08vh", fgHeight: "22vh" }),
  cat: Object.freeze({ decorHeight: "0vh", decorBottom: "11.5vh", fgHeight: "16.4vh" }),
  fantasy: Object.freeze({ decorHeight: "8vh", decorBottom: "38vh", fgHeight: "20vh" }),
  sky: Object.freeze({ decorHeight: "20vh", decorBottom: "11.5vh", fgHeight: "22vh" }),
  ruins: Object.freeze({ decorHeight: "17.1vh", decorBottom: "11.5vh", fgHeight: "17.7vh" })
});

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
      if (char === "*" && next === "/") { blockComment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") { lineComment = true; index += 1; continue; }
    if (char === "/" && next === "*") { blockComment = true; index += 1; continue; }
    if (char === "\"" || char === "'" || char === "`") { quote = char; continue; }
    if (char === openChar) depth += 1;
    else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function extractBalancedAfter(source, marker, openChar, closeChar) {
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) return "";
  const openAt = source.indexOf(openChar, markerAt + marker.length);
  if (openAt < 0) return "";
  const end = scanBalanced(source, openAt, openChar, closeChar);
  return end > openAt ? source.slice(openAt, end + 1) : "";
}

function extractObjectAfter(source, marker) {
  return extractBalancedAfter(source, marker, "{", "}");
}

function extractArrayAfter(source, marker) {
  return extractBalancedAfter(source, marker, "[", "]");
}

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) return "";
  const openAt = source.indexOf("{", markerAt + marker.length);
  const end = scanBalanced(source, openAt, "{", "}");
  return end > openAt ? source.slice(markerAt, end + 1) : "";
}

function cssRules(source) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({
    selectors: match[1].replace(/\/\*[\s\S]*?\*\//g, "").split(",").map(selector => selector.trim()).filter(Boolean),
    declarations: declarationMap(match[2])
  }));
}

function declarationMap(body) {
  const declarations = new Map();
  body.split(";").forEach(part => {
    const colon = part.indexOf(":");
    if (colon < 0) return;
    declarations.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim());
  });
  return declarations;
}

function firstRule(source, selector) {
  return cssRules(source).find(rule => rule.selectors.includes(selector))?.declarations || new Map();
}

function lastProperty(source, selector, property) {
  let value;
  cssRules(source).forEach(rule => {
    if (rule.selectors.includes(selector) && rule.declarations.has(property)) value = rule.declarations.get(property);
  });
  return value;
}

function sceneDirectChildIds(html) {
  const marker = '<div id="scene">';
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const tokens = html.slice(start + marker.length).matchAll(/<div\b[^>]*>|<\/div\s*>/gi);
  const ids = [];
  let depth = 0;
  for (const token of tokens) {
    if (/^<\/div/i.test(token[0])) {
      if (depth === 0) break;
      depth -= 1;
      continue;
    }
    if (depth === 0) {
      const id = token[0].match(/\bid="([^"]+)"/)?.[1];
      if (id) ids.push(id);
    }
    depth += 1;
  }
  return ids;
}

function expectedBaseAsset(stageId, key) {
  const depthFix = {
    "fire.mid": "../assets/images/nazonazo-tunnel/branch_fire_woodland_basalt_mid_loop_worldfix_20260721.webp",
    "fire.fg": "../assets/images/nazonazo-tunnel/branch_fire_magma_river_fg_loop_worldfix_20260721.webp",
    "dino.meadow": "../assets/images/nazonazo-tunnel/branch_dino_meadow_loop_depthfix_20260721.webp",
    "fantasy.horizon": "../assets/images/nazonazo-tunnel/branch_fantasy_horizon_cutout_loop_depthfix_v4_20260721.webp",
    "fantasy.mid": "../assets/images/nazonazo-tunnel/branch_fantasy_mid_cutout_loop_depthfix_v4_20260721.webp",
    "fantasy.fg": "../assets/images/nazonazo-tunnel/branch_fantasy_foreground_cutout_loop_depthfix_20260721.webp",
    "fantasy.decor": "../assets/images/nazonazo-tunnel/branch_fantasy_decor_cutout_loop_depthfix_20260721.webp"
  };
  if (depthFix[`${stageId}.${key}`]) return depthFix[`${stageId}.${key}`];
  if (stageId === "dino" && key === "mid") return "../assets/images/nazonazo-tunnel/branch_dino_mid_open_cutout_loop_20260721.webp";
  if (stageId === "toy" && key === "mid") return "../assets/images/nazonazo-tunnel/branch_toy_mid_variety_cutout_loop_20260720.webp";
  if (stageId === "toy" && key === "decor") return "../assets/images/nazonazo-tunnel/branch_toy_decor_variety_cutout_loop_20260720.webp";
  if (stageId === "cat" && key === "fg") return "../assets/images/nazonazo-tunnel/branch_cat_foreground_no_yarn_cutout_loop_20260721.webp";
  if (stageId === "cat" && key === "decor") return "../assets/images/nazonazo-tunnel/branch_cat_decor_no_yarn_cutout_loop_20260721.webp";
  const suffix = key === "sky" ? "sky_back" :
    key === "horizon" ? "horizon_cutout_loop" :
    key === "mid" ? "mid_cutout_loop" :
    key === "ground" ? "ground_track_loop" :
    key === "fg" ? "foreground_cutout_loop" :
    ["cat", "fantasy", "sky", "ruins"].includes(stageId) ? "decor_cutout_loop" : "decor_cutout";
  return `../assets/images/nazonazo-tunnel/branch_${stageId}_${suffix}_20260720.webp`;
}

function parseOwnStringEntries(objectSource) {
  return [...objectSource.matchAll(/(?:\{|,)\s*([a-zA-Z]+):"([^"]+)"/g)].map(match => [match[1], match[2]]);
}

function criticalAssetSet(swSource) {
  const start = swSource.indexOf("const CRITICAL_ASSETS_SCRIPTS = [");
  const groupMarker = "const CRITICAL_ASSET_GROUPS = [";
  const groupAt = swSource.indexOf(groupMarker, start);
  if (start < 0 || groupAt < 0) return null;
  const openAt = swSource.indexOf("[", groupAt + "const CRITICAL_ASSET_GROUPS = ".length);
  const end = scanBalanced(swSource, openAt, "[", "]");
  if (end < 0) return null;
  const context = {};
  try {
    vm.runInNewContext(`${swSource.slice(start, end + 1)};this.flat=CRITICAL_ASSET_GROUPS.flat();`, context, { timeout: 1000 });
  } catch {
    return null;
  }
  return new Set(Array.from(context.flat || []));
}

function webpInfo(bytes) {
  let offset = 12;
  let alpha = false;
  let width = 0;
  let height = 0;
  while (offset + 8 <= bytes.length) {
    const chunk = bytes.subarray(offset, offset + 4).toString("ascii");
    const length = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (data + length > bytes.length) break;
    if (chunk === "ALPH") alpha = true;
    if (chunk === "VP8X" && length >= 10) {
      alpha ||= !!(bytes[data] & 0x10);
      width = 1 + bytes.readUIntLE(data + 4, 3);
      height = 1 + bytes.readUIntLE(data + 7, 3);
    }
    if (chunk === "VP8L" && length >= 5 && bytes[data] === 0x2f) {
      const bits = bytes.readUInt32LE(data + 1);
      width = (bits & 0x3fff) + 1;
      height = ((bits >>> 14) & 0x3fff) + 1;
      alpha ||= !!(bytes[data + 4] & 0x10);
    }
    offset = data + length + (length & 1);
  }
  return { alpha, width, height, complete: offset === bytes.length };
}

function validate(candidate) {
  const errors = [];
  let checkCount = 0;
  const check = (condition, code) => { checkCount += 1; if (!condition) errors.push(code); };
  const { game, html, css, sw } = candidate;

  const directIds = sceneDirectChildIds(html);
  const exactElements = {
    branchEffectFar: '<div id="branchEffectFar" class="branch-stage-effect-layer" aria-hidden="true"></div>',
    branchWorldLifeLayer: '<div id="branchWorldLifeLayer" aria-hidden="true"></div>',
    branchEffectMid: '<div id="branchEffectMid" class="branch-stage-effect-layer" aria-hidden="true"></div>',
    branchEffectNear: '<div id="branchEffectNear" class="branch-stage-effect-layer" aria-hidden="true"></div>'
  };
  Object.entries(exactElements).forEach(([id, literal]) => {
    check(html.split(`id="${id}"`).length - 1 === 1 && html.includes(literal), "dom-layers");
  });
  const follows = (left, right) => directIds.indexOf(right) === directIds.indexOf(left) + 1;
  check(follows("horizon", "branchEffectFar") && follows("branchDecorT", "branchWorldLifeLayer") &&
    follows("branchWorldLifeLayer", "branchEffectMid") && follows("fgT", "branchEffectNear"), "dom-layers");
  const sharedLayer = firstRule(css, ".branch-stage-effect-layer");
  check(sharedLayer.get("position") === "absolute" && sharedLayer.get("inset") === "0" &&
    sharedLayer.get("pointer-events") === "none" && firstRule(css, "#branchWorldLifeLayer").get("pointer-events") === "none", "dom-layers");
  const zContract = { branchEffectFar: "1", branchWorldLifeLayer: "4", branchEffectMid: "6", branchEffectNear: "9" };
  Object.entries(zContract).forEach(([id, z]) => check(lastProperty(css, `#${id}`, "z-index") === z, "dom-layers"));

  const assetsSource = extractObjectAfter(game, "const ASSETS=");
  const baseUrls = [];
  STAGE_IDS.forEach(stageId => {
    const stageSource = extractObjectAfter(assetsSource, `\n ${stageId}:`);
    const entries = parseOwnStringEntries(stageSource);
    const stageKeys = stageId === "fire" ? ["sky", "mid", "ground", "fg"] :
      (stageId === "dino" ? ["sky", "horizon", "mid", "ground", "fg", "meadow"] : LAYER_KEYS);
    check(JSON.stringify(entries.map(entry => entry[0])) === JSON.stringify(stageKeys), "base-assets");
    entries.forEach(entry => baseUrls.push(entry[1]));
    stageKeys.forEach(key => check(entries.some(entry => entry[0] === key && entry[1] === expectedBaseAsset(stageId, key)), stageId === "toy" ? "toy-assets" : "base-assets"));
  });
  check(baseUrls.length === 46 && new Set(baseUrls).size === 46, "base-assets");
  check(!game.includes("branch_toy_mid_cutout_loop_20260720.webp") && !game.includes("branch_toy_decor_cutout_20260720.webp"), "toy-assets");

  const extrasSource = extractObjectAfter(game, "const BRANCH_STAGE_POLISH_ASSETS=");
  const extraStageKeys = [...extrasSource.matchAll(/\n ([a-z]+):Object\.freeze\(/g)].map(match => match[1]);
  check(JSON.stringify(extraStageKeys) === JSON.stringify(Object.keys(EXTRA_URLS)), "extra-assets");
  const stageTotals = {};
  STAGE_IDS.forEach(stageId => {
    const expected = EXTRA_URLS[stageId] || {};
    const stageSource = expected === EXTRA_URLS[stageId] ? extractObjectAfter(extrasSource, `\n ${stageId}:Object.freeze(`) : "";
    const entries = parseOwnStringEntries(stageSource);
    check(JSON.stringify(Object.fromEntries(entries)) === JSON.stringify(expected), "extra-assets");
    stageTotals[stageId] = (stageId === "fire" ? 4 : 6) + Object.keys(expected).length;
  });
  check(JSON.stringify(stageTotals) === JSON.stringify({ snow: 8, fire: 7, dino: 13, toy: 6, cat: 18, fantasy: 6, sky: 6, ruins: 6 }), "preload-totals");
  const polishPreload = extractFunction(game, "preloadBranchStagePolish");
  check(polishPreload.includes("const assets=st&&BRANCH_STAGE_POLISH_ASSETS[st.id]") &&
    polishPreload.includes("Object.values(assets).forEach") && !polishPreload.includes("Object.values(BRANCH_STAGE_POLISH_ASSETS)"), "preload-scope");
  check(game.includes("const branchStagePolishImageCache=new Map();") &&
    polishPreload.includes("branchStagePolishImageCache.has(src)") &&
    polishPreload.includes("branchStagePolishImageCache.set(src,image)"), "preload-dedup");
  const applySkin = extractFunction(game, "applySkin");
  const chooseTunnelBranch = extractFunction(game, "chooseTunnelBranch");
  const buildPolishWiring = extractFunction(game, "buildBranchStagePolish");
  const polishPreloadReferences = source => (source.match(/\bpreloadBranchStagePolish\b/g) || []).length;
  check(polishPreloadReferences(polishPreload) === 1 &&
    polishPreloadReferences(applySkin) === 1 &&
    polishPreloadReferences(chooseTunnelBranch) === 1 &&
    polishPreloadReferences(game) === 3, "preload-wiring");
  check(applySkin.includes("preloadBranchRasterStage(st);") && applySkin.includes("preloadBranchStagePolish(st);") &&
    applySkin.includes("buildBranchStagePolish(st);"), "preload-wiring");
  check(chooseTunnelBranch.includes("preloadBranchRasterStage(target);") &&
    chooseTunnelBranch.includes("preloadBranchStagePolish(target);"), "preload-wiring");
  check(buildPolishWiring.includes('if(st.id==="snow")buildBranchSnow(assets,branchPolishDensityKey);') &&
    buildPolishWiring.includes('else if(st.id==="fire")buildBranchFire(assets,branchPolishDensityKey);') &&
    buildPolishWiring.includes('else if(st.id==="dino")buildBranchDinoWorldLife(assets);') &&
    buildPolishWiring.includes('else if(st.id==="cat")buildBranchCatWorldLife(assets);'), "preload-wiring");

  const preloadStart = game.indexOf("const BRANCH_RASTER_STAGE_IDS=");
  const preloadEnd = game.indexOf("\nfunction stageIndexById", preloadStart);
  check(preloadStart >= 0 && preloadEnd > preloadStart, "preload-dedup");
  const preloadVm = { snow: false, repeat: false, fire: false };
  if (preloadStart >= 0 && preloadEnd > preloadStart) {
    const constructed = [];
    class FakeImage {
      constructor() { constructed.push(this); }
      set src(value) { this._src = value; }
      get src() { return this._src; }
    }
    const context = { Image: FakeImage, Set, Map, Object };
    try {
      vm.runInNewContext(`${game.slice(preloadStart, preloadEnd)}\n` +
        "this.preloadPolish=preloadBranchStagePolish;this.polishCache=branchStagePolishImageCache;", context, { timeout: 1000 });
      context.preloadPolish({ id: "snow" });
      preloadVm.snow = constructed.length === 2 && context.polishCache.size === 2 &&
        JSON.stringify(constructed.map(image => image.src)) === JSON.stringify(Object.values(EXTRA_URLS.snow));
      context.preloadPolish({ id: "snow" });
      preloadVm.repeat = constructed.length === 2 && context.polishCache.size === 2;
      context.preloadPolish({ id: "fire" });
      preloadVm.fire = constructed.length === 5 && context.polishCache.size === 5 &&
        JSON.stringify(constructed.slice(2).map(image => image.src)) === JSON.stringify(Object.values(EXTRA_URLS.fire));
    } catch {
      // Individual checks below retain stable failure codes for mutation probes.
    }
  }
  check(preloadVm.snow, "preload-dedup");
  check(preloadVm.repeat, "preload-dedup");
  check(preloadVm.fire, "preload-dedup");

  const snowProfiles = extractArrayAfter(game, "const BRANCH_SNOW_PROFILES=Object.freeze(");
  const profileCounts = [...snowProfiles.matchAll(/depth:"(far|mid|near)",desktop:(\d+),mobile:(\d+)/g)]
    .map(match => ({ depth: match[1], desktop: Number(match[2]), mobile: Number(match[3]) }));
  check(JSON.stringify(profileCounts.map(profile => profile.depth)) === JSON.stringify(["far", "mid", "near"]) &&
    profileCounts.reduce((sum, profile) => sum + profile.desktop, 0) === 48 &&
    profileCounts.reduce((sum, profile) => sum + profile.mobile, 0) === 30, "snow-counts");
  const buildSnow = extractFunction(game, "buildBranchSnow");
  check(buildSnow.includes('const count=density==="reduced"?2:(density==="mobile"?profile.mobile:profile.desktop)') && profileCounts.length * 2 === 6, "snow-counts");
  check(buildSnow.includes('const image=branchImage(diamond?assets.diamond:assets.snowflake,"branch-snow-art")') &&
    buildSnow.includes("particle.appendChild(image)") && !/(?:textContent|innerHTML|createElement\("(?:svg|canvas)"\))/.test(buildSnow), "snow-image-only");
  check(buildSnow.includes("const diamond=(i+profileIndex*2)%5===0;") &&
    buildSnow.includes('particle.dataset.snowKind=diamond?"diamond":"snowflake";'), "snow-cadence");
  const snowVisualRules = cssRules(css).filter(rule => rule.selectors.some(selector => selector.includes("branch-snow-particle")));
  const forbiddenSnowProperties = new Set(["background", "background-color", "border", "border-radius", "box-shadow", "clip-path", "content"]);
  check(!snowVisualRules.some(rule => rule.selectors.some(selector => /branch-snow-particle::(?:before|after)/.test(selector)) ||
    [...rule.declarations.keys()].some(property => forbiddenSnowProperties.has(property))), "snow-image-only");

  const buildFire = extractFunction(game, "buildBranchFire");
  const fireVentConfig = extractArrayAfter(game, "const BRANCH_FIRE_VENT_TERRAIN_CONFIG=Object.freeze(");
  const fireVentEntries = [...fireVentConfig.matchAll(/cycle:(\d+),phase:([.\d]+)/g)]
    .map(match => [Number(match[1]), Number(match[2])]);
  check(JSON.stringify(fireVentEntries) === JSON.stringify([[0, .29], [2, .76], [5, .29], [6, .76], [10, .29], [13, .76], [18, .29]]) &&
    game.includes("const BRANCH_FIRE_MAGMA_PARALLAX=1.07;") && game.includes("const BRANCH_FIRE_VOLCANO_PARALLAX=.03;") &&
    !game.includes("BRANCH_FIRE_FLAME_POOL_SIZE") && !game.includes("BRANCH_FIRE_EMBER_DESKTOP_POOL_SIZE"), "fire-counts");
  check(buildFire.includes("BRANCH_FIRE_VENT_TERRAIN_CONFIG.forEach((config,index)=>{") &&
    buildFire.includes('branchImage(assets.flame,"branch-fire-flame")') && buildFire.includes('branchImage(assets.ember,"branch-fire-ember-art")') &&
    buildFire.includes("cycle:config.cycle,phase:config.phase") && buildFire.includes("const emberCount=reduced?0:"), "fire-counts");
  check(buildFire.includes('branchEffectFar.dataset.landmarkCount="1"') &&
    buildFire.includes('branchEffectMid.dataset.hotspotCount=String(BRANCH_FIRE_VENT_TERRAIN_CONFIG.length)') &&
    buildFire.includes('branchEffectMid.dataset.ventCount=String(BRANCH_FIRE_VENT_TERRAIN_CONFIG.length)') &&
    buildFire.includes('branchEffectMid.dataset.emberCount=String(emberTotal)'), "fire-counts");

  const dinoLifeConfig = extractArrayAfter(game, "const BRANCH_DINO_WORLD_LIFE_CONFIG=Object.freeze(");
  const catFarConfig = extractArrayAfter(game, "const BRANCH_CAT_FAR_CONFIG=Object.freeze(");
  const catNearConfig = extractArrayAfter(game, "const BRANCH_CAT_NEAR_CONFIG=Object.freeze(");
  const dinoLifeEntries = [...dinoLifeConfig.matchAll(/asset:"([a-z]+)",anchor:(\d+)/g)].map(match => [match[1], Number(match[2])]);
  const catFarCount = (catFarConfig.match(/Object\.freeze\(\{/g) || []).length;
  const catNearCount = (catNearConfig.match(/Object\.freeze\(\{/g) || []).length;
  const buildDinoLife = extractFunction(game, "buildBranchDinoWorldLife");
  const buildCatLife = extractFunction(game, "buildBranchCatWorldLife");
  const buildWorldLife = extractFunction(game, "buildBranchWorldLifeSprite");
  const buildPolish = extractFunction(game, "buildBranchStagePolish");
  const renderPolish = extractFunction(game, "renderBranchStagePolish");
  const render = extractFunction(game, "render");
  check(JSON.stringify(dinoLifeEntries) === JSON.stringify([["waterhole", 368], ["parasaurolophus", 820], ["nest", 980], ["sauropod", 1335], ["stegosaurus", 1620], ["trex", 2050]]) &&
    game.includes("const BRANCH_DINO_MEADOW_PARALLAX=.10;") && game.includes("const BRANCH_DINO_FAR_HERD_PARALLAX=.06;") &&
    game.includes("const BRANCH_DINO_FAR_HERD_SPACING_VW=115;") && game.includes("const BRANCH_DINO_FAR_HERD_POOL_SIZE=3;") &&
    (buildDinoLife.match(/document\.createElement\("span"\)/g) || []).length === 1 &&
    buildPolish.includes('st.id==="dino"') && !game.includes("BRANCH_LANDMARK_PROGRESS"), "landmark-count");
  check(catFarCount === 5 && catNearCount === 9 && game.includes("const BRANCH_CAT_MID_CONFIG=Object.freeze(Array.from({length:QN*2-1}") &&
    buildCatLife.includes("BRANCH_CAT_FAR_CONFIG.forEach") && buildCatLife.includes("BRANCH_CAT_MID_CONFIG.forEach") &&
    buildCatLife.includes("BRANCH_CAT_NEAR_CONFIG.forEach") && !game.includes("BRANCH_CAT_WORLD_LIFE_CONFIG") &&
    buildPolish.includes('st.id==="cat"'), "landmark-count");
  const syncCutoutGuards = extractFunction(game, "syncBranchCutoutGuards");
  const syncGrounding = extractFunction(game, "syncBranchWorldSpriteGrounding");
  const groundingFormula = extractFunction(game, "computeBranchWorldSpriteBottomPx");
  check(dinoLifeConfig.includes("sourceWidth:1533,sourceHeight:722,transparentBottomPx:17,groundPlaneY:.79,groundAnchorY:.97645") &&
    catNearConfig.includes("sourceWidth:1263,sourceHeight:974,transparentBottomPx:17,groundPlaneY:BRANCH_CAT_GROUND_PLANE_Y,groundAnchorY:.9825") &&
    buildWorldLife.includes("groundPlaneY:config.groundPlaneY") && buildWorldLife.includes("groundAnchorY:config.groundAnchorY") &&
    buildDinoLife.includes("sourceWidth:1894,sourceHeight:367,transparentBottomPx:BRANCH_DINO_FAR_HERD_GROUND.transparentBottomPx") &&
    groundingFormula.includes("stageHeight*(1-groundPlaneY)-renderedHeight*(1-groundAnchorY)-occlusionPx") &&
    syncGrounding.includes("const renderedRect=sprite.img.getBoundingClientRect();") && syncGrounding.includes("const renderedHeight=renderedRect.height,renderedWidth=renderedRect.width;") &&
    syncCutoutGuards.includes("syncBranchWorldSpriteGroundingAll();") && !syncCutoutGuards.includes("branchWorldLifeSprites.forEach(syncOneBranchCutoutGuard)"), "grounding");
  check(renderPolish.includes("const localWorldX=worldX-o;") &&
    renderPolish.includes("const herdWorldX=localWorldX*BRANCH_DINO_FAR_HERD_PARALLAX;") &&
    game.includes("function projectBranchWorldSpriteX(anchor,localWorldX,parallax){") &&
    renderPolish.includes("const x=projectBranchWorldSpriteX(sprite.anchor,localWorldX,sprite.parallax);") &&
    !renderPolish.includes("clamp(travel") && !renderPolish.includes("activeCatByRole") &&
    renderPolish.includes("const anchor=(sprite.cycle+sprite.phase)*magmaPeriod;") &&
    renderPolish.includes("const x=anchor-localWorldX*BRANCH_FIRE_MAGMA_PARALLAX;") &&
    !/SPAN\*[^;]+\.ratio-worldX/.test(renderPolish) && render.includes("const o=origin(stg);") &&
    render.includes("renderBranchStagePolish(now,o);"), "world-lock");
  check(lastProperty(css, "body.branch-raster:not(.tunnel-interior) #branchDecorT", "display") === "block" &&
    cssRules(css).some(rule => rule.selectors.some(selector => selector.includes("st-cat") && selector.endsWith("#branchDecorT")) &&
      rule.declarations.get("display") === "none!important" && rule.declarations.get("background-image") === "none!important"), "cat-decor");

  const syncPolish = extractFunction(game, "syncBranchStagePolishState");
  const enterTunnel = extractFunction(game, "enterTunnelInterior");
  const finishTunnel = extractFunction(game, "finishTunnelInterior");
  const ending = extractFunction(game, "ending");
  const openMap = extractFunction(game, "openMap");
  const resize = extractFunction(game, "scheduleBranchStagePolishResize");
  check(syncPolish.includes("playing&&!tunnelInteriorMode&&!document.hidden&&isBranchRasterStage(STAGES[stg])") &&
    enterTunnel.includes("pauseBranchStagePolish();") && finishTunnel.includes("syncBranchStagePolishState();") &&
    ending.includes("pauseBranchStagePolish();") && openMap.includes("pauseBranchStagePolish();"), "lifecycle");
  check(/visibilitychange[\s\S]{0,120}if\(document\.hidden\)\{\s*pauseBranchStagePolish\(\);/.test(game) &&
    /visibilitychange[\s\S]{0,700}\}else\{[\s\S]{0,180}syncBranchStagePolishState\(\);/.test(game) &&
    game.includes('window.addEventListener("pageshow",syncBranchStagePolishState);') &&
    /window\.addEventListener\("pagehide",\(\)=>\{pauseBranchStagePolish\(\);clearTimeout\(branchPolishResizeTimer\);\}\);/.test(game) &&
    game.includes('window.addEventListener("resize",scheduleBranchStagePolishResize,{passive:true});') &&
    resize.includes("density!==branchPolishDensityKey") && resize.includes("buildBranchStagePolish(st)"), "lifecycle");

  const densityFunction = extractFunction(game, "branchPolishDensity");
  check(densityFunction.includes('return prefersReducedMotionActive()?"reduced":(branchPolishShortSide()<500?"mobile":"desktop");'), "motion-safety");
  check(lastProperty(css, "body.tunnel-interior .branch-stage-effect-layer", "display") === "none!important" &&
    lastProperty(css, "body.tunnel-interior #branchWorldLifeLayer", "display") === "none!important", "motion-safety");
  const reducedMotion = extractBalancedAfter(css, "@media (prefers-reduced-motion:reduce)", "{", "}");
  check(reducedMotion.includes(".branch-snow-particle{left:var(--snow-rest-left)!important;top:var(--snow-rest-top)!important;animation:none!important;") &&
    reducedMotion.includes(".branch-snow-particle img{animation:none!important;") &&
    reducedMotion.includes(".branch-stage-effect-layer .branch-snow-particle:nth-child(n+3){display:none!important}"), "motion-safety");
  check(!reducedMotion.includes(".branch-fire-hotspot:not(:first-child)") &&
    reducedMotion.includes(".branch-fire-flame{animation:none!important;") &&
    reducedMotion.includes(".branch-fire-ember-field,.branch-fire-crater-ember{display:none!important}"), "motion-safety");

  Object.entries(STAGE_Y).forEach(([stageId, values]) => {
    const declarations = firstRule(css, `body.st-${stageId}`);
    check(declarations.get("--branch-horizon-y") === values[0] && declarations.get("--branch-mid-y") === values[1], "stage-y");
  });
  check(!css.includes("11.26vh") && !css.includes("21.91vh") && !css.includes("-.52vh"), "stage-y");
  const branchDefaults = firstRule(css, "body.branch-raster");
  check(branchDefaults.get("--branch-mid-height") === "100%" && branchDefaults.get("--branch-mid-bottom") === "0vh" &&
    firstRule(css, "body.st-dino").get("--branch-mid-height") === "56vh" &&
    firstRule(css, "body.branch-raster #midT").get("height") === "var(--branch-mid-height)", "stage-geometry");
  Object.entries(STAGE_GEOMETRY).forEach(([stageId, expected]) => {
    const stageDeclarations = firstRule(css, `body.st-${stageId}`);
    const value = property => stageDeclarations.get(property) || branchDefaults.get(property);
    check(value("--branch-decor-height") === expected.decorHeight &&
      value("--branch-decor-bottom") === expected.decorBottom &&
      value("--branch-fg-height") === expected.fgHeight, "stage-geometry");
  });
  const branchDecor = firstRule(css, "body.branch-raster #branchDecorT");
  check(lastProperty(css, "body.branch-raster:not(.tunnel-interior) #branchDecorT", "display") === "block" &&
    branchDecor.get("bottom") === "var(--branch-decor-bottom)" && branchDecor.get("height") === "var(--branch-decor-height)" &&
    lastProperty(css, "body.branch-raster #fgT", "height") === "var(--branch-fg-height)" &&
    lastProperty(css, "body.branch-raster #fgT", "background-position") === "left bottom", "stage-geometry");
  const ground = firstRule(css, "#groundT");
  const worldRule = firstRule(css, "#world");
  const cars = firstRule(css, "#cars");
  const vehicle = firstRule(css, "#veh");
  const foreground = firstRule(css, "#fgT");
  check(ground.get("height") === "12vh" && ground.get("z-index") === "2" &&
    lastProperty(css, "body.branch-raster #groundT", "height") === "18vh" && worldRule.get("z-index") === "3" &&
    cars.get("z-index") === "7" && cars.get("pointer-events") === "none" &&
    vehicle.get("bottom") === "12.5vh" && vehicle.get("width") === "clamp(120px,22vw,220px)" &&
    vehicle.get("height") === "clamp(70px,13vw,130px)" && vehicle.get("z-index") === "7" &&
    foreground.get("height") === "22vh" && foreground.get("z-index") === "8", "ground-train");

  const branchNight = firstRule(css, "body.branch-raster.branch-night");
  check(branchNight.get("--branch-polish-brightness") === ".68" && branchNight.get("--branch-snow-opacity") === ".74", "night-filter");
  const allowedNightTargets = new Set(["#skyA", "#horizon", "#midT", "#groundT", "#branchDecorT", "#fgT"]);
  const nightFilteredTargets = [];
  const nightFilterValue = "brightness(.68) saturate(.78) contrast(.98) hue-rotate(-6deg)";
  cssRules(css).forEach(rule => {
    if (!rule.declarations.has("filter")) return;
    rule.selectors.filter(selector => selector.includes("branch-night")).forEach(selector => {
      const target = selector.match(/(#[A-Za-z][\w-]*)$/)?.[1] || "";
      if (!target) return;
      nightFilteredTargets.push(target);
      check(allowedNightTargets.has(target), "night-filter");
      check(rule.declarations.get("filter") === nightFilterValue, "night-filter");
    });
  });
  check(JSON.stringify([...new Set(nightFilteredTargets)].sort()) === JSON.stringify([...allowedNightTargets].sort()), "night-filter");
  check(firstRule(css, ".branch-fire-flame").get("filter")?.includes("var(--branch-polish-brightness)") &&
    firstRule(css, ".branch-dino-far-herd img").get("filter")?.includes("var(--branch-polish-brightness)") &&
    firstRule(css, ".branch-world-life img").get("filter")?.includes("var(--branch-polish-brightness)"), "night-filter");

  const styleToken = html.match(/styles\.css\?v=([^"']+)/)?.[1];
  const gameToken = html.match(/js\/game\.js\?v=([^"']+)/)?.[1];
  check(styleToken === TOKEN && gameToken === TOKEN, "query-sync");
  check(new RegExp(`const CACHE_VERSION = ${SW_VERSION};`).test(sw) && /\/\/ v2317:/.test(sw) && /\/\/ v2316:/.test(sw) && /\/\/ v2315:/.test(sw), "sw-version");
  const critical = criticalAssetSet(sw);
  const canonicalPrecachePaths = CANONICAL.map(asset => `/assets/images/nazonazo-tunnel/${asset.name}`);
  check(critical instanceof Set && canonicalPrecachePaths.every(assetPath => !critical.has(assetPath)), "sw-precache");

  return { errors: [...new Set(errors)], checkCount };
}

function replaceExactlyOnce(source, search, replacement) {
  const occurrences = source.split(search).length - 1;
  assert.equal(occurrences, 1, `mutation precondition must match exactly once: ${search.slice(0, 80)}`);
  const mutated = source.replace(search, replacement);
  assert.notEqual(mutated, source, "mutation must alter its source");
  return mutated;
}

function mutateAfter(source, marker, search, replacement) {
  const markerAt = source.indexOf(marker);
  assert.ok(markerAt >= 0, `mutation marker missing: ${marker}`);
  const prefix = source.slice(0, markerAt);
  const suffix = source.slice(markerAt);
  return prefix + replaceExactlyOnce(suffix, search, replacement);
}

function mutateFunction(source, name, search, replacement) {
  const functionSource = extractFunction(source, name);
  assert.ok(functionSource, `mutation function missing: ${name}`);
  const mutatedFunction = replaceExactlyOnce(functionSource, search, replacement);
  return source.slice(0, source.indexOf(functionSource)) + mutatedFunction +
    source.slice(source.indexOf(functionSource) + functionSource.length);
}

for (const asset of CANONICAL) {
  const relative = `assets/images/nazonazo-tunnel/${asset.name}`;
  const absolute = path.join(root, relative);
  assert.ok(fs.existsSync(absolute), `${relative}: canonical asset missing`);
  const stat = fs.statSync(absolute);
  assert.ok(stat.isFile(), `${relative}: must be a regular file`);
  assert.equal(stat.size, asset.bytes, `${relative}: byte length drifted`);
  assert.ok(stat.size < THREE_MIB, `${relative}: exceeds 3MiB repository limit`);
  const bytes = fs.readFileSync(absolute);
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", `${relative}: RIFF signature missing`);
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", `${relative}: WebP signature missing`);
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, `${relative}: RIFF length is incomplete`);
  const info = webpInfo(bytes);
  assert.equal(info.complete, true, `${relative}: WebP chunk table is incomplete`);
  assert.equal(info.alpha, true, `${relative}: alpha contract missing`);
  assert.equal(info.width, asset.width, `${relative}: width drifted`);
  assert.equal(info.height, asset.height, `${relative}: height drifted`);
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), asset.sha256, `${relative}: canonical bytes drifted`);
}

const baseline = validate(sources);
assert.deepEqual(baseline.errors, [], "branch stage polish baseline contract must pass");
assert.equal(baseline.checkCount, EXPECTED_VALIDATE_CHECKS,
  "EXPECTED_VALIDATE_CHECKS must equal the validator's measured static contract count");

const firstCanonicalPrecachePath = `/assets/images/nazonazo-tunnel/${CANONICAL[0].name}`;
const mutations = [
  {
    name: "extra global preload",
    expected: "sw-precache",
    mutate(candidate) {
      return { ...candidate, sw: replaceExactlyOnce(candidate.sw, "const CRITICAL_ASSETS_IMAGES = [", `const CRITICAL_ASSETS_IMAGES = [\n  '${firstCanonicalPrecachePath}',`) };
    }
  },
  {
    name: "confirmed branch polish preload wiring removed",
    expected: "preload-wiring",
    mutate(candidate) {
      return { ...candidate, game: replaceExactlyOnce(candidate.game, " preloadBranchStagePolish(target);\n", "") };
    }
  },
  {
    name: "extra global branch polish preload call",
    expected: "preload-wiring",
    mutate(candidate) {
      return { ...candidate, game: replaceExactlyOnce(candidate.game,
        "\nfunction stageIndexById",
        "\npreloadBranchStagePolish({id:\"snow\"});\nfunction stageIndexById") };
    }
  },
  {
    name: "polish preload cache dedup removed",
    expected: "preload-dedup",
    mutate(candidate) {
      return { ...candidate, game: replaceExactlyOnce(candidate.game,
        "  if(!src||branchStagePolishImageCache.has(src))return;",
        "  if(!src)return;") };
    }
  },
  {
    name: "snow 49 desktop particles",
    expected: "snow-counts",
    mutate(candidate) {
      return { ...candidate, game: replaceExactlyOnce(candidate.game, 'depth:"near",desktop:20,mobile:12', 'depth:"near",desktop:21,mobile:12') };
    }
  },
  {
    name: "snow CSS pseudo geometry",
    expected: "snow-image-only",
    mutate(candidate) {
      return { ...candidate, css: replaceExactlyOnce(candidate.css,
        "\n.branch-snow-particle{position:absolute;",
        "\n.branch-snow-particle::before{content:\"\";border:2px solid white}\n.branch-snow-particle{position:absolute;") };
    }
  },
  {
    name: "snow diamond cadence drift",
    expected: "snow-cadence",
    mutate(candidate) {
      return { ...candidate, game: replaceExactlyOnce(candidate.game, "(i+profileIndex*2)%5===0", "(i+profileIndex*2)%6===0") };
    }
  },
  {
    name: "fire terrain vent schedule shrinks",
    expected: "fire-counts",
    mutate(candidate) {
      return { ...candidate, game: replaceExactlyOnce(candidate.game,
        "Object.freeze({cycle:18,phase:.29,width:4.8",
        "Object.freeze({cycle:13,phase:.29,width:4.8") };
    }
  },
  {
    name: "fire absolute worldX",
    expected: "world-lock",
    mutate(candidate) {
      return { ...candidate, game: mutateAfter(candidate.game, "branchFireSprites.forEach(sprite=>{", "anchor-localWorldX*BRANCH_FIRE_MAGMA_PARALLAX", "anchor-worldX*BRANCH_FIRE_MAGMA_PARALLAX") };
    }
  },
  {
    name: "world life z7",
    expected: "dom-layers",
    mutate(candidate) {
      return { ...candidate, css: replaceExactlyOnce(candidate.css,
        "#branchEffectFar{z-index:1}#branchWorldLifeLayer{z-index:4}#branchEffectMid{z-index:6}",
        "#branchEffectFar{z-index:1}#branchWorldLifeLayer{z-index:7}#branchEffectMid{z-index:6}") };
    }
  },
  {
    name: "dino grounding source size drift",
    expected: "grounding",
    mutate(candidate) {
      return { ...candidate, game: replaceExactlyOnce(candidate.game, 'sourceWidth:1533,sourceHeight:722', 'sourceWidth:1532,sourceHeight:722') };
    }
  },
  {
    name: "cat retired decor becomes visible",
    expected: "cat-decor",
    mutate(candidate) {
      return { ...candidate, css: replaceExactlyOnce(candidate.css,
        "body.st-cat:not(.tunnel-interior) #branchDecorT{display:none!important;background-image:none!important}",
        "body.st-cat:not(.tunnel-interior) #branchDecorT{display:block!important;background-image:none!important}") };
    }
  },
  {
    name: "toy legacy URL",
    expected: "toy-assets",
    mutate(candidate) {
      return { ...candidate, game: replaceExactlyOnce(candidate.game, "branch_toy_mid_variety_cutout_loop_20260720.webp", "branch_toy_mid_cutout_loop_20260720.webp") };
    }
  },
  {
    name: "stage Y variable missing",
    expected: "stage-y",
    mutate(candidate) {
      return { ...candidate, css: replaceExactlyOnce(candidate.css, "--branch-mid-y:-1.98vh;", "") };
    }
  },
  {
    name: "toy decor bottom drift",
    expected: "stage-geometry",
    mutate(candidate) {
      return { ...candidate, css: replaceExactlyOnce(candidate.css, "--branch-decor-bottom:17.08vh;", "--branch-decor-bottom:11.5vh;") };
    }
  },
  {
    name: "tunnel pause removed",
    expected: "lifecycle",
    mutate(candidate) {
      return { ...candidate, game: mutateFunction(candidate.game, "enterTunnelInterior",
        ' if(typeof pauseBranchStagePolish==="function")pauseBranchStagePolish();\n', "") };
    }
  },
  {
    name: "hidden pause removed",
    expected: "lifecycle",
    mutate(candidate) {
      return { ...candidate, game: replaceExactlyOnce(candidate.game,
        " if(document.hidden){\n  pauseBranchStagePolish();\n  pauseDinoAdventureInput(true);\n  closeGameSettings();",
        " if(document.hidden){\n  pauseDinoAdventureInput(true);\n  closeGameSettings();") };
    }
  },
  {
    name: "tunnel effect hide weakened",
    expected: "motion-safety",
    mutate(candidate) {
      return { ...candidate, css: replaceExactlyOnce(candidate.css,
        "body.tunnel-interior .branch-stage-effect-layer,body.tunnel-interior #branchWorldLifeLayer{display:none!important}",
        "body.tunnel-interior .branch-stage-effect-layer,body.tunnel-interior #branchWorldLifeLayer{display:none}") };
    }
  },
  {
    name: "reduced snow allows three per layer",
    expected: "motion-safety",
    mutate(candidate) {
      return { ...candidate, css: replaceExactlyOnce(candidate.css,
        ".branch-stage-effect-layer .branch-snow-particle:nth-child(n+3){display:none!important}",
        ".branch-stage-effect-layer .branch-snow-particle:nth-child(n+4){display:none!important}") };
    }
  },
  {
    name: "reduced density falls through to mobile",
    expected: "motion-safety",
    mutate(candidate) {
      return { ...candidate, game: mutateFunction(candidate.game, "branchPolishDensity",
        'prefersReducedMotionActive()?"reduced"',
        'prefersReducedMotionActive()?"mobile"') };
    }
  },
  {
    name: "night HUD filter",
    expected: "night-filter",
    mutate(candidate) {
      return { ...candidate, css: replaceExactlyOnce(candidate.css,
        "body.branch-raster.branch-night:not(.tunnel-interior) #fgT{\n  filter:",
        "body.branch-raster.branch-night:not(.tunnel-interior) #fgT,\nbody.branch-raster.branch-night:not(.tunnel-interior) #hud{\n  filter:") };
    }
  }
];

mutations.forEach(mutation => {
  const result = validate(mutation.mutate(sources));
  assert.deepEqual(result.errors, [mutation.expected],
    `${mutation.name}: expected only ${mutation.expected}, got ${result.errors.join(", ") || "PASS"}`);
});

console.log(`nazonazo branch stage polish regression: PASS (${CANONICAL.length} alpha WebP assets, ${baseline.checkCount} measured static contracts, ${mutations.length}/${mutations.length} mutations REJECT)`);
