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
const TOKEN = "20260721-1385";
const SW_VERSION = 2313;
const THREE_MIB = 3 * 1024 * 1024;
const CANONICAL = Object.freeze([
  Object.freeze({ name: "effect_snowflake_particle_20260720.webp", bytes: 339906, width: 792, height: 927, sha256: "e2288efcadbf3ab0c16dde0a6d4c2fd167560dbf941cf2e1712ac12a801f6ce6" }),
  Object.freeze({ name: "effect_diamond_dust_particle_20260720.webp", bytes: 31940, width: 341, height: 364, sha256: "2ddda0ab3c410debfa117b3ff1d0bb04c6c9571d27df40da1c9745b285dd2ff1" }),
  Object.freeze({ name: "effect_fire_flame_particle_a_20260720.webp", bytes: 404708, width: 640, height: 863, sha256: "2eff0e7193b98cefec25f4c5375b2b7c9eed3722f33d80c9570497bd9efbe808" }),
  Object.freeze({ name: "effect_fire_ember_particle_20260720.webp", bytes: 70072, width: 407, height: 422, sha256: "36f7dd5a544132cace2bcc803314fe24e2bf893bad72d2f7c35fabc719604b5f" }),
  Object.freeze({ name: "branch_dino_life_landmark_cutout_20260720.webp", bytes: 667846, width: 1451, height: 466, sha256: "44f9de98bbc57435ef1fc0f9e22b2fd201c57f3b96a827ab421481da80bafa69" }),
  Object.freeze({ name: "branch_cat_cats_landmark_cutout_20260720.webp", bytes: 463098, width: 1510, height: 404, sha256: "4af0a27a6eced1e242d5d382e8415ff60fa247365da62d4fef39a68be9bf05f9" }),
  Object.freeze({ name: "branch_toy_mid_variety_cutout_loop_20260720.webp", bytes: 831368, width: 3072, height: 556, sha256: "0bb8bfd2abadbaa67da0ff4c9cb6bc77bc90b93ae3c4ba4b149c53829a45a0c8" }),
  Object.freeze({ name: "branch_toy_decor_variety_cutout_loop_20260720.webp", bytes: 525816, width: 3072, height: 260, sha256: "380919cd93b7fefcc3c14fcc1d5402ad9e19fe49e96250a7d70d8dd037388615" })
]);

const EXTRA_URLS = Object.freeze({
  snow: Object.freeze({
    snowflake: "../assets/images/nazonazo-tunnel/effect_snowflake_particle_20260720.webp",
    diamond: "../assets/images/nazonazo-tunnel/effect_diamond_dust_particle_20260720.webp"
  }),
  fire: Object.freeze({
    flame: "../assets/images/nazonazo-tunnel/effect_fire_flame_particle_a_20260720.webp",
    ember: "../assets/images/nazonazo-tunnel/effect_fire_ember_particle_20260720.webp"
  }),
  dino: Object.freeze({ landmark: "../assets/images/nazonazo-tunnel/branch_dino_life_landmark_cutout_20260720.webp" }),
  cat: Object.freeze({ landmark: "../assets/images/nazonazo-tunnel/branch_cat_cats_landmark_cutout_20260720.webp" })
});

const STAGE_Y = Object.freeze({
  snow: Object.freeze(["18.57vh", "18.07vh"]),
  fire: Object.freeze(["13.68vh", "-6.39vh"]),
  dino: Object.freeze(["21.91vh", "-.52vh"]),
  toy: Object.freeze(["11.51vh", "-15.84vh"]),
  cat: Object.freeze(["24.15vh", "19.82vh"]),
  fantasy: Object.freeze(["10.25vh", "8.99vh"]),
  sky: Object.freeze(["-.35vh", "-1.98vh"]),
  ruins: Object.freeze(["8.42vh", "19.45vh"])
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
    selectors: match[1].split(",").map(selector => selector.trim()),
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
  if (stageId === "toy" && key === "mid") return "../assets/images/nazonazo-tunnel/branch_toy_mid_variety_cutout_loop_20260720.webp";
  if (stageId === "toy" && key === "decor") return "../assets/images/nazonazo-tunnel/branch_toy_decor_variety_cutout_loop_20260720.webp";
  const suffix = key === "sky" ? "sky_back" :
    key === "horizon" ? "horizon_cutout_loop" :
    key === "mid" ? "mid_cutout_loop" :
    key === "ground" ? "ground_track_loop" :
    key === "fg" ? "foreground_cutout_loop" :
    ["cat", "fantasy", "sky", "ruins"].includes(stageId) ? "decor_cutout_loop" : "decor_cutout";
  return `../assets/images/nazonazo-tunnel/branch_${stageId}_${suffix}_20260720.webp`;
}

function parseOwnStringEntries(objectSource) {
  return [...objectSource.matchAll(/(?:\{|,)\s*([a-z]+):"([^"]+)"/g)].map(match => [match[1], match[2]]);
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
  const check = (condition, code) => { if (!condition) errors.push(code); };
  const { game, html, css, sw } = candidate;

  const directIds = sceneDirectChildIds(html);
  const exactElements = {
    branchEffectFar: '<div id="branchEffectFar" class="branch-stage-effect-layer" aria-hidden="true"></div>',
    branchLandmarkLayer: '<div id="branchLandmarkLayer" aria-hidden="true"></div>',
    branchEffectMid: '<div id="branchEffectMid" class="branch-stage-effect-layer" aria-hidden="true"></div>',
    branchEffectNear: '<div id="branchEffectNear" class="branch-stage-effect-layer" aria-hidden="true"></div>'
  };
  Object.entries(exactElements).forEach(([id, literal]) => {
    check(html.split(`id="${id}"`).length - 1 === 1 && html.includes(literal), "dom-layers");
  });
  const follows = (left, right) => directIds.indexOf(right) === directIds.indexOf(left) + 1;
  check(follows("horizon", "branchEffectFar") && follows("branchDecorT", "branchLandmarkLayer") &&
    follows("branchLandmarkLayer", "branchEffectMid") && follows("fgT", "branchEffectNear"), "dom-layers");
  const sharedLayer = firstRule(css, ".branch-stage-effect-layer");
  check(sharedLayer.get("position") === "absolute" && sharedLayer.get("inset") === "0" &&
    sharedLayer.get("pointer-events") === "none" && firstRule(css, "#branchLandmarkLayer").get("pointer-events") === "none", "dom-layers");
  const zContract = { branchEffectFar: "1", branchLandmarkLayer: "4", branchEffectMid: "6", branchEffectNear: "9" };
  Object.entries(zContract).forEach(([id, z]) => check(lastProperty(css, `#${id}`, "z-index") === z, "dom-layers"));

  const assetsSource = extractObjectAfter(game, "const ASSETS=");
  const baseUrls = [];
  STAGE_IDS.forEach(stageId => {
    const stageSource = extractObjectAfter(assetsSource, `\n ${stageId}:`);
    const entries = parseOwnStringEntries(stageSource);
    check(JSON.stringify(entries.map(entry => entry[0])) === JSON.stringify(LAYER_KEYS), "base-assets");
    entries.forEach(entry => baseUrls.push(entry[1]));
    LAYER_KEYS.forEach(key => check(entries.some(entry => entry[0] === key && entry[1] === expectedBaseAsset(stageId, key)), stageId === "toy" ? "toy-assets" : "base-assets"));
  });
  check(baseUrls.length === 48 && new Set(baseUrls).size === 48, "base-assets");
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
    stageTotals[stageId] = 6 + Object.keys(expected).length;
  });
  check(JSON.stringify(stageTotals) === JSON.stringify({ snow: 8, fire: 8, dino: 7, toy: 6, cat: 7, fantasy: 6, sky: 6, ruins: 6 }), "preload-totals");
  const polishPreload = extractFunction(game, "preloadBranchStagePolish");
  check(polishPreload.includes("const assets=st&&BRANCH_STAGE_POLISH_ASSETS[st.id]") &&
    polishPreload.includes("Object.values(assets).forEach") && !polishPreload.includes("Object.values(BRANCH_STAGE_POLISH_ASSETS)"), "preload-scope");

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
  const snowVisualRules = cssRules(css).filter(rule => rule.selectors.some(selector => selector.includes("branch-snow-particle")));
  const forbiddenSnowProperties = new Set(["background", "background-color", "border", "border-radius", "box-shadow", "clip-path", "content"]);
  check(!snowVisualRules.some(rule => rule.selectors.some(selector => /branch-snow-particle::(?:before|after)/.test(selector)) ||
    [...rule.declarations.keys()].some(property => forbiddenSnowProperties.has(property))), "snow-image-only");

  const fireRatiosSource = extractArrayAfter(game, "const BRANCH_FIRE_HOTSPOT_RATIOS=Object.freeze(");
  const fireRatios = fireRatiosSource.slice(1, -1).split(",").filter(Boolean).map(Number);
  const mobileIndexesSource = extractArrayAfter(game, "const BRANCH_FIRE_MOBILE_INDEXES=Object.freeze(");
  const mobileIndexes = mobileIndexesSource.slice(1, -1).split(",").filter(Boolean).map(Number);
  const fireRatiosFunction = extractFunction(game, "activeBranchFireRatios");
  const buildFire = extractFunction(game, "buildBranchFire");
  check(fireRatios.length === 8 && mobileIndexes.length === 6 &&
    fireRatiosFunction.includes('density==="reduced"') && fireRatiosFunction.includes("[BRANCH_FIRE_HOTSPOT_RATIOS[4]]"), "fire-counts");
  check(buildFire.includes('const emberCount=density==="reduced"?0:(density==="mobile"?10:18)') &&
    buildFire.includes('branchImage(assets.flame,"branch-fire-art")') && buildFire.includes('branchImage(assets.ember,"branch-fire-ember-art")'), "fire-counts");

  const landmarkConfig = extractObjectAfter(game, "const BRANCH_LANDMARK_CONFIG=Object.freeze(");
  const landmarkKeys = [...landmarkConfig.matchAll(/\n ([a-z]+):Object\.freeze\(/g)].map(match => match[1]);
  const buildLandmark = extractFunction(game, "buildBranchLandmark");
  const buildPolish = extractFunction(game, "buildBranchStagePolish");
  const renderPolish = extractFunction(game, "renderBranchStagePolish");
  const render = extractFunction(game, "render");
  check(JSON.stringify(landmarkKeys) === JSON.stringify(["dino", "cat"]) && game.includes("const BRANCH_LANDMARK_PROGRESS=.5;") &&
    (buildLandmark.match(/document\.createElement\("span"\)/g) || []).length === 1 &&
    buildPolish.includes('st.id==="dino"||st.id==="cat"') && !landmarkConfig.includes("toy"), "landmark-count");
  check(renderPolish.includes("const localWorldX=worldX-o;") &&
    (renderPolish.match(/SPAN\*[^;]+\.ratio-localWorldX/g) || []).length === 2 &&
    !/SPAN\*[^;]+\.ratio-worldX/.test(renderPolish) && render.includes("const o=origin(stg);") &&
    render.includes("renderBranchStagePolish(now,o);"), "world-lock");
  check(firstRule(css, "body.branch-raster.st-cat #branchDecorT").get("display") === "none!important", "cat-decor");

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

  Object.entries(STAGE_Y).forEach(([stageId, values]) => {
    const declarations = firstRule(css, `body.st-${stageId}`);
    check(declarations.get("--branch-horizon-y") === values[0] && declarations.get("--branch-mid-y") === values[1], "stage-y");
  });
  check(!css.includes("11.26vh"), "stage-y");
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
  cssRules(css).forEach(rule => {
    if (!rule.declarations.has("filter")) return;
    rule.selectors.filter(selector => selector.includes("branch-night")).forEach(selector => {
      const target = selector.match(/(#[A-Za-z][\w-]*)$/)?.[1] || "";
      check(allowedNightTargets.has(target), "night-filter");
    });
  });
  check(firstRule(css, ".branch-fire-hotspot img").get("filter")?.includes("var(--branch-polish-brightness)") &&
    firstRule(css, ".branch-landmark img").get("filter")?.includes("var(--branch-polish-brightness)"), "night-filter");

  const styleToken = html.match(/styles\.css\?v=([^"']+)/)?.[1];
  const gameToken = html.match(/js\/game\.js\?v=([^"']+)/)?.[1];
  check(styleToken === TOKEN && gameToken === TOKEN, "query-sync");
  check(new RegExp(`const CACHE_VERSION = ${SW_VERSION};`).test(sw) && /\/\/ v2311:/.test(sw) && /\/\/ v2310:/.test(sw), "sw-version");
  const critical = criticalAssetSet(sw);
  const canonicalPrecachePaths = CANONICAL.map(asset => `/assets/images/nazonazo-tunnel/${asset.name}`);
  check(critical instanceof Set && canonicalPrecachePaths.every(assetPath => !critical.has(assetPath)), "sw-precache");

  return [...new Set(errors)];
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

assert.deepEqual(validate(sources), [], "branch stage polish baseline contract must pass");

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
      return { ...candidate, css: `${candidate.css}\n.branch-snow-particle::before{content:"";border:2px solid white}` };
    }
  },
  {
    name: "fire absolute worldX",
    expected: "world-lock",
    mutate(candidate) {
      return { ...candidate, game: mutateAfter(candidate.game, "branchFireSprites.forEach(sprite=>{", "const x=SPAN*sprite.ratio-localWorldX;", "const x=SPAN*sprite.ratio-worldX;") };
    }
  },
  {
    name: "landmark z7",
    expected: "dom-layers",
    mutate(candidate) {
      return { ...candidate, css: replaceExactlyOnce(candidate.css, "#branchLandmarkLayer{z-index:4}", "#branchLandmarkLayer{z-index:7}") };
    }
  },
  {
    name: "cat decor visible",
    expected: "cat-decor",
    mutate(candidate) {
      return { ...candidate, css: replaceExactlyOnce(candidate.css, "body.branch-raster.st-cat #branchDecorT{display:none!important}", "body.branch-raster.st-cat #branchDecorT{display:block!important}") };
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
    name: "tunnel and hidden pause removed",
    expected: "lifecycle",
    mutate(candidate) {
      let game = mutateFunction(candidate.game, "enterTunnelInterior", ' if(typeof pauseBranchStagePolish==="function")pauseBranchStagePolish();\n', "");
      game = replaceExactlyOnce(game, " if(document.hidden){\n  pauseBranchStagePolish();\n  closeGameSettings();", " if(document.hidden){\n  closeGameSettings();");
      return { ...candidate, game };
    }
  },
  {
    name: "night HUD filter",
    expected: "night-filter",
    mutate(candidate) {
      return { ...candidate, css: `${candidate.css}\nbody.branch-raster.branch-night #hud{filter:brightness(.5)}` };
    }
  }
];

mutations.forEach(mutation => {
  const errors = validate(mutation.mutate(sources));
  assert.ok(errors.includes(mutation.expected), `${mutation.name}: expected ${mutation.expected} rejection, got ${errors.join(", ") || "PASS"}`);
});

console.log(`nazonazo branch stage polish regression: PASS (8 alpha WebP assets, 64 contracts, ${mutations.length}/${mutations.length} mutations REJECT)`);
