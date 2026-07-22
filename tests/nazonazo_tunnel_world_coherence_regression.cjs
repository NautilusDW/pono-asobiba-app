#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const fixture = JSON.parse(read("tests/fixtures/nazonazo_tunnel_world_coherence_assets_provenance_1409.json"));
const sources = Object.freeze({
  game: read("nazonazo-tunnel/js/game.js"),
  html: read("nazonazo-tunnel/index.html"),
  css: read("nazonazo-tunnel/styles.css"),
  sw: read("sw.js")
});

const TOKEN = "20260722-1412";
const QUIZ_ART_TOKEN = "20260721-1409";
const SW_VERSION = 2329;
const THREE_MIB = 3 * 1024 * 1024;
const EXPECTED_VALIDATE_CHECKS = 175;
const EXPECTED_MUTATIONS = 40;
const imageRoot = path.join(root, "assets/images/nazonazo-tunnel");
const LEGACY_FIRE = Object.freeze([
  "branch_fire_horizon_cutout_loop_depthfix_20260721.webp",
  "branch_fire_mid_cutout_loop_depthfix_20260721.webp",
  "branch_fire_foreground_cutout_loop_depthfix_20260721.webp",
  "branch_fire_decor_cutout_depthfix_20260721.webp"
]);
const LEGACY_FIRE_POOLS = Object.freeze([
  "BRANCH_FIRE_FLAME_SPACING_VW", "BRANCH_FIRE_FLAME_POOL_SIZE",
  "BRANCH_FIRE_EMBER_SPACING_VW", "BRANCH_FIRE_EMBER_DESKTOP_POOL_SIZE",
  "BRANCH_FIRE_EMBER_MOBILE_POOL_SIZE", "sprite.poolIndex*sprite.spacing", "%sprite.period"
]);

const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const compact = value => value.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").replace(/\s+/g, "");

function scanBalanced(source, openAt, openChar, closeChar) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openAt; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) { if (char === "\n") lineComment = false; continue; }
    if (blockComment) { if (char === "*" && next === "/") { blockComment = false; index += 1; } continue; }
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
    else if (char === closeChar && --depth === 0) return index;
  }
  return -1;
}

function extractBalancedAfter(source, marker, openChar, closeChar) {
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) return "";
  const openAt = source.indexOf(openChar, markerAt + marker.length);
  const end = openAt >= 0 ? scanBalanced(source, openAt, openChar, closeChar) : -1;
  return end > openAt ? source.slice(openAt, end + 1) : "";
}

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) return "";
  const openAt = source.indexOf("{", markerAt + marker.length);
  const end = scanBalanced(source, openAt, "{", "}");
  return end > openAt ? source.slice(markerAt, end + 1) : "";
}

function evalLiteral(source) {
  try { return vm.runInNewContext(`(${source})`, { Object }, { timeout: 1000 }); }
  catch { return null; }
}

function occurrenceCount(source, needle) {
  return needle ? source.split(needle).length - 1 : 0;
}

function seamMismatches(data, width, height, channels, leftX, rightX) {
  let mismatch = 0;
  for (let y = 0; y < height; y += 1) {
    const left = (y * width + leftX) * channels;
    const right = (y * width + rightX) * channels;
    for (let channel = 0; channel < channels; channel += 1) {
      if (data[left + channel] !== data[right + channel]) mismatch += 1;
    }
  }
  return mismatch;
}

const canonicalCache = new Map();
async function inspectCanonical(entry) {
  if (canonicalCache.has(entry.canonical)) return canonicalCache.get(entry.canonical);
  const absolute = path.join(imageRoot, entry.canonical);
  const bytes = fs.readFileSync(absolute);
  const metadata = await sharp(bytes).metadata();
  const decoded = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  let visible = 0;
  let partial = 0;
  let transparentRgbNonzero = 0;
  for (let pixel = 0; pixel < decoded.info.width * decoded.info.height; pixel += 1) {
    const offset = pixel * decoded.info.channels;
    const alpha = decoded.data[offset + 3];
    if (alpha === 0) {
      transparent += 1;
      if (decoded.data[offset] || decoded.data[offset + 1] || decoded.data[offset + 2]) transparentRgbNonzero += 1;
    } else {
      visible += 1;
      if (alpha < 255) partial += 1;
    }
  }
  const cornerAlpha = [0, decoded.info.width - 1, (decoded.info.height - 1) * decoded.info.width,
    decoded.info.width * decoded.info.height - 1].map(pixel => decoded.data[pixel * decoded.info.channels + 3]);
  const result = { bytes, metadata, decoded, transparent, visible, partial, transparentRgbNonzero, cornerAlpha };
  canonicalCache.set(entry.canonical, result);
  return result;
}

const rawCache = new Map();
async function inspectRaw(entry) {
  if (rawCache.has(entry.rawPath)) return rawCache.get(entry.rawPath);
  const absolute = path.join(root, entry.rawPath);
  const bytes = fs.readFileSync(absolute);
  const metadata = await sharp(bytes).metadata();
  const result = { bytes, metadata };
  rawCache.set(entry.rawPath, result);
  return result;
}

async function validate(candidateSources, candidateFixture = fixture) {
  const errors = [];
  let checks = 0;
  const check = (condition, code) => { checks += 1; if (!condition) errors.push(code); };
  const { game, html, css, sw } = candidateSources;
  const gameCompact = compact(game);
  const cssCompact = compact(css);
  const sourceBundle = `${game}\n${html}\n${css}\n${sw}`;
  const entries = candidateFixture.assets || [];

  check(candidateFixture.version === 1 && candidateFixture.batch === "1409-nazonazo-world-coherence" &&
    candidateFixture.model === "gpt-image-2" && entries.length === 14 && entries.every(entry => entry.model === "gpt-image-2") &&
    JSON.stringify(candidateFixture.rawProvenanceMarkers) === JSON.stringify(["c2pa", "gpt-image", "2.0", "trainedAlgorithmicMedia", "OpenAI Media Service API"]) &&
    new Set(entries.map(entry => entry.id)).size === 14 && new Set(entries.map(entry => entry.canonical)).size === 14,
  "asset-lineage");

  const localLineagePaths = entries.flatMap(entry => [entry.rawPath, entry.candidatePath]);
  const localPresent = localLineagePaths.filter(relative => fs.existsSync(path.join(root, relative))).length;
  check(localPresent === 0 || localPresent === localLineagePaths.length, "asset-lineage");

  for (const entry of entries) {
    const canonicalPath = path.join(imageRoot, entry.canonical);
    check(fs.existsSync(canonicalPath) && fs.statSync(canonicalPath).isFile(), "asset-hash");
    if (!fs.existsSync(canonicalPath)) continue;
    const inspected = await inspectCanonical(entry);
    check(inspected.bytes.length === entry.canonicalBytes && inspected.bytes.length < THREE_MIB &&
      sha256(inspected.bytes) === entry.canonicalSha256 && /^[a-f0-9]{64}$/.test(entry.canonicalSha256), "asset-hash");
    check(entry.alpha === true && inspected.metadata.format === "webp" && inspected.metadata.hasAlpha === true &&
      inspected.metadata.channels === 4 && inspected.metadata.width === entry.canonicalWidth && inspected.metadata.height === entry.canonicalHeight,
    "asset-alpha");
    check(inspected.transparent > 0 && inspected.visible > 0 && inspected.partial > 0 &&
      inspected.transparentRgbNonzero === 0 && inspected.cornerAlpha.every(alpha => alpha === 0), "asset-alpha");
    check(!entry.loop || (entry.canonicalWidth % 2 === 0 &&
      seamMismatches(inspected.decoded.data, inspected.decoded.info.width, inspected.decoded.info.height,
        inspected.decoded.info.channels, inspected.decoded.info.width / 2 - 1, inspected.decoded.info.width / 2) === 0 &&
      seamMismatches(inspected.decoded.data, inspected.decoded.info.width, inspected.decoded.info.height,
        inspected.decoded.info.channels, inspected.decoded.info.width - 1, 0) === 0), "asset-seam");
    check(entry.candidateSha256 === entry.canonicalSha256 && /^[a-f0-9]{64}$/.test(entry.rawSha256) &&
      /^[a-f0-9]{64}$/.test(entry.candidateSha256), "asset-lineage");
    check(occurrenceCount(game, entry.canonical) === 1 && !html.includes(entry.canonical) && !css.includes(entry.canonical), "asset-map-1409");
    check(!sw.includes(entry.canonical), "sw-critical");

    const candidatePath = path.join(root, entry.candidatePath);
    let candidateVerified = true;
    if (fs.existsSync(candidatePath)) {
      const candidate = fs.readFileSync(candidatePath);
      candidateVerified = candidate.length === inspected.bytes.length && sha256(candidate) === entry.candidateSha256 && candidate.equals(inspected.bytes);
    }
    check(candidateVerified, "asset-lineage");
    const rawPath = path.join(root, entry.rawPath);
    let rawVerified = true;
    let markersVerified = true;
    if (fs.existsSync(rawPath)) {
      const raw = await inspectRaw(entry);
      const text = raw.bytes.toString("latin1");
      rawVerified = raw.bytes.length === entry.rawBytes && sha256(raw.bytes) === entry.rawSha256 &&
        raw.metadata.width === entry.rawWidth && raw.metadata.height === entry.rawHeight;
      markersVerified = candidateFixture.rawProvenanceMarkers.every(marker => text.includes(marker));
    }
    check(rawVerified, "asset-lineage");
    check(markersVerified, "asset-lineage");
  }
  check(!sourceBundle.includes("tmp/alpha_pending/"), "asset-map-1409");

  const fireConfig = evalLiteral(extractBalancedAfter(game, "const BRANCH_FIRE_VENT_TERRAIN_CONFIG=Object.freeze(", "[", "]"));
  const fireBuild = compact(extractFunction(game, "buildBranchFire"));
  const renderPolish = compact(extractFunction(game, "renderBranchStagePolish"));
  const fireRenderAt = renderPolish.indexOf("branchFireSprites.forEach(sprite=>{");
  const fireRender = fireRenderAt >= 0 ? renderPolish.slice(fireRenderAt) : "";
  check(gameCompact.includes('fire:{sky:"../assets/images/nazonazo-tunnel/branch_fire_sky_back_20260720.webp",mid:"../assets/images/nazonazo-tunnel/branch_fire_woodland_basalt_mid_loop_worldfix_20260721.webp",ground:"../assets/images/nazonazo-tunnel/branch_fire_ground_track_loop_20260720.webp",fg:"../assets/images/nazonazo-tunnel/branch_fire_magma_river_fg_loop_worldfix_20260721.webp"}') &&
    gameCompact.includes("constBRANCH_FIRE_MAGMA_ASPECT=3548/177;") && gameCompact.includes("constBRANCH_FIRE_MAGMA_PARALLAX=1.07;") &&
    LEGACY_FIRE.every(name => !sourceBundle.includes(name)) && LEGACY_FIRE_POOLS.every(name => !gameCompact.includes(name)), "fire-assets");
  check(gameCompact.includes("constBRANCH_FIRE_VOLCANO_PARALLAX=.03;") && gameCompact.includes("constBRANCH_FIRE_VOLCANO_ANCHOR=SPAN*.52;") &&
    occurrenceCount(fireBuild, 'className="branch-fire-volcano-landmark"') === 1 &&
    fireBuild.includes('landmark.dataset.loop="false"') && fireBuild.includes('branchEffectFar.dataset.landmarkCount="1"') &&
    fireBuild.includes("branchFireVolcanoSprite={el:landmark,anchor:BRANCH_FIRE_VOLCANO_ANCHOR,parallax:BRANCH_FIRE_VOLCANO_PARALLAX}") &&
    renderPolish.includes("constx=50+(branchFireVolcanoSprite.anchor-localWorldX)*branchFireVolcanoSprite.parallax") &&
    cssCompact.includes(".branch-fire-volcano-landmark{position:absolute;left:0;bottom:30vh;display:block;"), "fire-volcano-single");
  check(Array.isArray(fireConfig) && fireConfig.length === 7 &&
    JSON.stringify(fireConfig.map(item => item.cycle)) === JSON.stringify([0, 2, 5, 6, 10, 13, 18]) &&
    JSON.stringify(fireConfig.map(item => item.phase)) === JSON.stringify([.29, .76, .29, .76, .29, .76, .29]) &&
    fireConfig.every((item, index) => Number.isFinite(item.cycle) && Number.isFinite(item.phase) && item.phase > 0 && item.phase < 1 &&
      (index === 0 || item.cycle + item.phase > fireConfig[index - 1].cycle + fireConfig[index - 1].phase)) &&
    fireBuild.includes("BRANCH_FIRE_VENT_TERRAIN_CONFIG.forEach((config,index)=>{") &&
    fireBuild.includes("sprite.dataset.terrainCycle=String(config.cycle)") && fireBuild.includes("sprite.dataset.terrainPhase=String(config.phase)") &&
    fireBuild.includes('branchFireSprites.push({el:sprite,img:image,kind:"vent",cycle:config.cycle,phase:config.phase') &&
    fireRender.includes("constanchor=(sprite.cycle+sprite.phase)*magmaPeriod") &&
    fireRender.includes("constx=anchor-localWorldX*BRANCH_FIRE_MAGMA_PARALLAX") &&
    !fireRender.includes("%magmaPeriod") && !fireRender.includes("%sprite") &&
    !fireRender.includes("poolIndex") && !fireRender.includes("sprite.period"), "fire-vent-anchors");
  check(cssCompact.includes("body.st-fire:not(.tunnel-interior)#midT{z-index:2;") &&
    cssCompact.includes("body.st-fire:not(.tunnel-interior)#groundT{z-index:3}") &&
    cssCompact.includes("body.st-fire:not(.tunnel-interior)#fgT{z-index:5;") &&
    cssCompact.includes(".branch-fire-vent{--fire-vent-width:clamp(30px,5.1vmin,52px);--fire-vent-cover:clamp(8px,1.8vmin,15px);position:absolute;left:0;bottom:calc(var(--branch-fg-height)-var(--fire-vent-cover))!important;z-index:2;") &&
    fireBuild.includes('sprite.style.bottom=config.bottom+"vh"') &&
    fireRender.includes('sprite.el.dataset.worldAnchor=anchor.toFixed(3);sprite.el.dataset.worldX=anchor.toFixed(3);sprite.el.dataset.worldPeriod=magmaPeriod.toFixed(3);sprite.el.dataset.visible=visible?"true":"false"') &&
    fireRender.includes('sprite.el.style.transform="translate3d("+cssXFromVw(x)+",0,0)translateX(-50%)"'), "fire-occlusion");
  check(renderPolish.includes("constlocalWorldX=worldX-o") && gameCompact.includes("renderBranchStagePolish(now,o);") &&
    gameCompact.includes("functionprojectBranchWorldSpriteX(anchor,localWorldX,parallax){return50+(anchor-localWorldX)*parallax;}") &&
    renderPolish.includes("constx=projectBranchWorldSpriteX(sprite.anchor,localWorldX,sprite.parallax)") &&
    !renderPolish.includes("clamp(travel") && !renderPolish.includes("activeCatByRole"), "world-lock");

  const dinoConfig = evalLiteral(extractBalancedAfter(game, "const BRANCH_DINO_WORLD_LIFE_CONFIG=Object.freeze(", "[", "]"));
  const dinoBuild = compact(extractFunction(game, "buildBranchDinoWorldLife"));
  check(Array.isArray(dinoConfig) && dinoConfig.length === 6 &&
    ["farHerd", "waterhole", "stegosaurus", "parasaurolophus", "sauropod", "trex", "nest"].every(key =>
      gameCompact.includes(`${key}:"../assets/images/nazonazo-tunnel/branch_dino_`)), "dino-assets");
  check(cssCompact.includes("body.st-dino:not(.tunnel-interior)#branchDecorT,") &&
    cssCompact.includes("body.st-cat:not(.tunnel-interior)#branchDecorT{display:none!important;background-image:none!important}") &&
    gameCompact.includes("body.st-dino") === false &&
    !game.includes('decor:"../assets/images/nazonazo-tunnel/branch_dino_decor_cutout_20260720.webp"'), "dino-decor-hidden");
  const nest = Array.isArray(dinoConfig) ? dinoConfig.filter(item => item.asset === "nest") : [];
  check(nest.length === 1 && nest[0].className === "branch-dino-nest-landmark" &&
    nest[0].depth === 3 && nest[0].parallax === .32 && nest[0].role === "mid" &&
    nest[0].groundPlaneY === .815 && nest[0].groundAnchorY === .98243 && nest[0].transparentBottomPx === 14 &&
    occurrenceCount(dinoBuild, 'buildBranchWorldLifeSprite("dino",assets,config,index)') === 1 &&
    !dinoBuild.includes("%") && !dinoBuild.includes("cloneNode") &&
    cssCompact.includes("body.st-dino:not(.tunnel-interior).branch-dino-nest-landmark{width:var(--life-width)}") &&
    !cssCompact.includes(".branch-dino-nest-landmark{bottom:") && !cssCompact.includes(".branch-dino-nest-landmarkimg{max-height:"), "dino-nest-single");
  check(Array.isArray(dinoConfig) &&
    JSON.stringify(dinoConfig.map(item => item.asset)) === JSON.stringify(["waterhole", "parasaurolophus", "nest", "sauropod", "stegosaurus", "trex"]) &&
    JSON.stringify(dinoConfig.map(item => item.anchor)) === JSON.stringify([368, 820, 980, 1335, 1620, 2050]) &&
    new Set(dinoConfig.map(item => item.asset)).size === 6, "dino-anchors");
  check(Array.isArray(dinoConfig) && JSON.stringify(dinoConfig.map(item => item.role)) === JSON.stringify(["far", "far", "mid", "far", "near", "near"]) &&
    JSON.stringify(dinoConfig.map(item => item.parallax)) === JSON.stringify([.14, .16, .32, .14, .62, .70]) &&
    dinoConfig.filter(item => item.role === "far").every(item => item.layer === "far") &&
    dinoConfig.filter(item => item.role === "mid").every(item => item.parallax === .32) &&
    dinoConfig.filter(item => item.role === "near").every(item => item.parallax >= .62 && item.parallax <= .70) &&
    dinoConfig.every(item => Number.isFinite(item.groundPlaneY) && Number.isFinite(item.groundAnchorY) && Number.isInteger(item.transparentBottomPx)) &&
    cssCompact.includes("body.st-dino:not(.tunnel-interior).branch-world-life--far{z-index:2!important}") &&
    cssCompact.includes("body.st-dino:not(.tunnel-interior).branch-world-life--mid{z-index:3!important}") &&
    cssCompact.includes("body.st-dino:not(.tunnel-interior).branch-world-life--near{z-index:4!important}") &&
    cssCompact.includes("body.st-dino:not(.tunnel-interior).branch-dino-far-herdimg,body.st-dino:not(.tunnel-interior).branch-world-lifeimg{mix-blend-mode:multiply}"), "dino-depth-split");
  check(cssCompact.includes("body.st-dino{--branch-horizon-y:-8.2vh;--branch-mid-y:0vh;--branch-mid-height:56vh;--branch-mid-bottom:4vh;--branch-decor-height:0vh;--branch-fg-height:22vh}") &&
    cssCompact.includes("#branchDinoMeadow{position:absolute;left:0;right:0;top:52vh;bottom:auto;height:48vh;z-index:0;") &&
    cssCompact.includes("body.st-dino:not(.tunnel-interior)#horizon{-webkit-mask-image:linear-gradient(tobottom,#0000%,#00051%,rgba(0,0,0,.72)53%,transparent56%);mask-image:linear-gradient(tobottom,#0000%,#00051%,rgba(0,0,0,.72)53%,transparent56%)}") &&
    gameCompact.includes("constBRANCH_DINO_MEADOW_PARALLAX=.10;") && gameCompact.includes("constBRANCH_DINO_FAR_HERD_PARALLAX=.06;") &&
    renderPolish.includes("branchDinoMeadow.style.backgroundPositionX=cssXFromVw(-localWorldX*BRANCH_DINO_MEADOW_PARALLAX)"), "dino-vertical");

  const farArray = extractBalancedAfter(game, "const BRANCH_CAT_FAR_CONFIG=Object.freeze(", "[", "]");
  const nearArray = extractBalancedAfter(game, "const BRANCH_CAT_NEAR_CONFIG=Object.freeze(", "[", "]");
  const catBuild = compact(extractFunction(game, "buildBranchCatWorldLife"));
  const farCount = occurrenceCount(farArray, "Object.freeze({");
  const nearCount = occurrenceCount(nearArray, "Object.freeze({");
  check(["farTownA", "farTownB", "midGardenA", "midLaneB"].every(key =>
    gameCompact.includes(`${key}:"../assets/images/nazonazo-tunnel/branch_cat_`)) &&
    !game.includes("BRANCH_CAT_WORLD_LIFE_CONFIG") && !game.includes("branch_cat_foreground_cutout_loop_20260720.webp") &&
    !game.includes("branch_cat_decor_cutout_loop_20260720.webp") &&
    cssCompact.includes("body.st-cat:not(.tunnel-interior)#branchDecorT{display:none!important;background-image:none!important}"), "cat-assets");
  check(gameCompact.includes("constBRANCH_CAT_STOP_ANCHORS=Object.freeze(Array.from({length:QN}") && farCount === 5 && nearCount === 9 &&
    gameCompact.includes("constBRANCH_CAT_MID_CONFIG=Object.freeze(Array.from({length:QN*2-1}") &&
    JSON.stringify([...farArray.matchAll(/stationIndex:(\d)/g)].map(match => Number(match[1]))) === JSON.stringify([0, 1, 2, 3, 4]) &&
    catBuild.includes("BRANCH_CAT_FAR_CONFIG.forEach") && catBuild.includes("BRANCH_CAT_MID_CONFIG.forEach") && catBuild.includes("BRANCH_CAT_NEAR_CONFIG.forEach") &&
    catBuild.includes("branchWorldLifeLayer.dataset.catMidCount=String(BRANCH_CAT_MID_CONFIG.length)") &&
    catBuild.includes("branchWorldLifeLayer.dataset.catNearCount=String(BRANCH_CAT_NEAR_CONFIG.length)"), "cat-stations");
  check(gameCompact.includes('role:"far",stationIndex:0,visibleCats:5') &&
    gameCompact.includes('role:"mid",stationIndex:index%2?Math.floor(index/2):index/2,interval:index%2===1,visibleCats:3') &&
    gameCompact.includes('role:"near",stationIndex:0,visibleCats:2') &&
    5 + 3 + 2 >= 8 && 5 + 3 + 2 <= 12 && farCount === 5 &&
    occurrenceCount(gameCompact, "activeCatByRole") === 0,
  "cat-density");
  check(cssCompact.includes(".branch-cat-population--far{z-index:1!important;width:var(--life-width)}") &&
    cssCompact.includes(".branch-cat-population--mid{z-index:3!important;width:var(--life-width)}") &&
    cssCompact.includes(".branch-cat-population--near{z-index:4!important;width:var(--life-width)}") &&
    gameCompact.includes("constBRANCH_CAT_FAR_PARALLAX=.14,BRANCH_CAT_MID_PARALLAX=.46,BRANCH_CAT_NEAR_PARALLAX=.74") &&
    gameCompact.includes("groundPlaneY:BRANCH_CAT_GROUND_PLANE_Y") && gameCompact.includes("groundAnchorY:") &&
    !cssCompact.includes(".branch-cat-population--far{bottom:") && !cssCompact.includes(".branch-cat-population--farimg{max-height:"), "cat-depth");
  const transformAt = renderPolish.indexOf('sprite.el.style.transform="translate3d("+cssXFromVw(x)+",0,0)translateX(-50%)"');
  const visibleAt = renderPolish.indexOf('sprite.el.dataset.visible=visible?"true":"false"');
  const catRenderAt = renderPolish.indexOf('if(sprite.stageId==="cat"){');
  const catRender = catRenderAt >= 0 ? renderPolish.slice(catRenderAt, renderPolish.indexOf("}else{", catRenderAt)) : "";
  check(transformAt >= 0 && visibleAt > transformAt &&
    catRender.includes("consthalfWidth=sprite.halfWidthVw||0,visible=x+halfWidth>-16&&x-halfWidth<116") &&
    catRender.includes('sprite.el.style.visibility=visible?"visible":"hidden"') &&
    !catRender.includes("if(!active)continue") && !renderPolish.includes("is-active") &&
    !cssCompact.includes(".branch-world-life.is-cat.is-active") && !cssCompact.includes('[data-active="true"]'), "cat-inactive");

  const styleToken = html.match(/styles\.css\?v=([^"']+)/)?.[1];
  const artToken = html.match(/data\/quiz-art\.js\?v=([^"']+)/)?.[1];
  const gameToken = html.match(/js\/game\.js\?v=([^"']+)/)?.[1];
  check(styleToken === TOKEN && artToken === QUIZ_ART_TOKEN && gameToken === TOKEN &&
    new RegExp(`const CACHE_VERSION = ${SW_VERSION};`).test(sw) && /\/\/ v2317:/.test(sw) && /\/\/ v2316:/.test(sw), "query-cache");
  check(cssCompact.includes("#stamp{position:absolute;left:50%;top:32%;transform:translate(-50%,-50%)scale(0);") &&
    cssCompact.includes("#stamp.ok{background:var(--good);animation:pop.9seaseforwards}") &&
    cssCompact.includes("@keyframespop{0%{opacity:0;transform:translate(-50%,-50%)scale(.55)}12%{opacity:0;transform:translate(-50%,-50%)scale(.75)}20%{opacity:1;transform:translate(-50%,-50%)scale(.9)}") &&
    cssCompact.includes("70%,99%{opacity:1;transform:translate(-50%,-50%)scale(1)}100%{opacity:0;transform:translate(-50%,-50%)scale(1)}") &&
    cssCompact.includes("#stamp.ok,#stamp.ng,#stamp.clear,#stamp.new{opacity:1!important}"), "stamp-pop");

  return { errors: [...new Set(errors)], checks };
}

function replaceOnce(source, search, replacement) {
  assert.equal(occurrenceCount(source, search), 1, `mutation precondition drifted: ${search}`);
  return source.replace(search, replacement);
}

function sourceMutation(name, part, search, replacement, code) {
  return { name, code, sources: { ...sources, [part]: replaceOnce(sources[part], search, replacement) }, fixture };
}

function sourceMutationAfter(name, part, marker, search, replacement, code) {
  const source = sources[part];
  const markerAt = source.indexOf(marker);
  assert.ok(markerAt >= 0, `mutation marker drifted: ${marker}`);
  const searchAt = source.indexOf(search, markerAt);
  assert.ok(searchAt >= markerAt, `mutation target drifted after ${marker}: ${search}`);
  const mutated = source.slice(0, searchAt) + replacement + source.slice(searchAt + search.length);
  return { name, code, sources: { ...sources, [part]: mutated }, fixture };
}

function fixtureMutation(name, code, mutate) {
  const cloned = JSON.parse(JSON.stringify(fixture));
  mutate(cloned);
  return { name, code, sources, fixture: cloned };
}

async function main() {
  const baseline = await validate(sources, fixture);
  assert.deepEqual(baseline.errors, [], "1410 world-coherence baseline must pass");
  assert.equal(baseline.checks, EXPECTED_VALIDATE_CHECKS, "update exact validation check count intentionally");

  const mutations = [
    fixtureMutation("canonical byte pin drifts", "asset-hash", value => { value.assets[0].canonicalBytes += 1; }),
    fixtureMutation("alpha contract is weakened", "asset-alpha", value => { value.assets[0].alpha = false; }),
    fixtureMutation("non-loop is mislabeled loop", "asset-seam", value => { value.assets[3].loop = true; }),
    fixtureMutation("raw lineage hash loses its digest contract", "asset-lineage", value => { value.assets[0].rawSha256 = "invalid"; }),
    sourceMutation("runtime canonical map drifts", "game", "branch_cat_far_town_a_worldfix_20260721.webp", "branch_cat_far_town_a_worldfix_broken.webp", "asset-map-1409"),
    sourceMutation("selected image enters SW", "sw", `const CACHE_VERSION = ${SW_VERSION};`, `const CACHE_VERSION = ${SW_VERSION}; // branch_cat_far_town_a_worldfix_20260721.webp`, "sw-critical"),
    sourceMutation("legacy fire horizon returns", "game", "const BRANCH_FIRE_MAGMA_ASPECT=3548/177;", "const BRANCH_FIRE_MAGMA_ASPECT=3548/177; // branch_fire_horizon_cutout_loop_depthfix_20260721.webp", "fire-assets"),
    sourceMutation("legacy fire pool returns", "game", "const BRANCH_FIRE_MAGMA_PARALLAX=1.07;", "const BRANCH_FIRE_MAGMA_PARALLAX=1.07; const BRANCH_FIRE_FLAME_POOL_SIZE=5;", "fire-assets"),
    sourceMutation("volcano parallax drifts", "game", "const BRANCH_FIRE_VOLCANO_PARALLAX=.03;", "const BRANCH_FIRE_VOLCANO_PARALLAX=.30;", "fire-volcano-single"),
    sourceMutation("query token rolls back", "html", "styles.css?v=20260722-1412", "styles.css?v=20260722-1411", "query-cache"),
    sourceMutation("volcano becomes repeating", "game", 'landmark.dataset.loop="false";', 'landmark.dataset.loop="true";', "fire-volcano-single"),
    sourceMutation("volcano count becomes two", "game", 'branchEffectFar.dataset.landmarkCount="1";', 'branchEffectFar.dataset.landmarkCount="2";', "fire-volcano-single"),
    sourceMutation("vent cycle ordering drifts", "game", "Object.freeze({cycle:18,phase:.29,width:4.8", "Object.freeze({cycle:13,phase:.29,width:4.8", "fire-vent-anchors"),
    sourceMutation("vent phase drifts", "game", "Object.freeze({cycle:0,phase:.29,width:4.4", "Object.freeze({cycle:0,phase:.30,width:4.4", "fire-vent-anchors"),
    sourceMutation("terrain cycle DOM bridge removed", "game", "sprite.dataset.terrainCycle=String(config.cycle);", "sprite.dataset.terrainCycle='';", "fire-vent-anchors"),
    sourceMutation("service-worker generation rolls back", "sw", `const CACHE_VERSION = ${SW_VERSION};`, `const CACHE_VERSION = ${SW_VERSION - 2};`, "query-cache"),
    sourceMutation("vent model loses phase", "game", 'cycle:config.cycle,phase:config.phase,sourceWidth:640', 'cycle:config.cycle,phase:0,sourceWidth:640', "fire-vent-anchors"),
    sourceMutation("vent anchor calculation drifts", "game", "const anchor=(sprite.cycle+sprite.phase)*magmaPeriod;", "const anchor=sprite.cycle*magmaPeriod;", "fire-vent-anchors"),
    sourceMutation("vent terrain speed drifts", "game", "const x=anchor-localWorldX*BRANCH_FIRE_MAGMA_PARALLAX;", "const x=anchor-localWorldX;", "fire-vent-anchors"),
    sourceMutation("vent modulo wrapping returns", "game", "const x=anchor-localWorldX*BRANCH_FIRE_MAGMA_PARALLAX;", "const x=(anchor-localWorldX*BRANCH_FIRE_MAGMA_PARALLAX)%magmaPeriod;", "fire-vent-anchors"),
    sourceMutation("vent terrain bottom bridge removed", "css", "bottom:calc(var(--branch-fg-height) - var(--fire-vent-cover))!important;", "bottom:0!important;", "fire-occlusion"),
    sourceMutation("vent z order moves above magma", "css", "z-index:2;display:block;width:var(--fire-vent-width);", "z-index:6;display:block;width:var(--fire-vent-width);", "fire-occlusion"),
    sourceMutation("magma z order drops", "css", "body.st-fire:not(.tunnel-interior) #fgT{z-index:5;", "body.st-fire:not(.tunnel-interior) #fgT{z-index:1;", "fire-occlusion"),
    sourceMutationAfter("fire DOM transform bridge removed", "game", "branchFireSprites.forEach(sprite=>{", 'sprite.el.style.transform="translate3d("+cssXFromVw(x)+",0,0) translateX(-50%)";', 'sprite.el.style.transform="translate3d(-200vw,0,0)";', "fire-occlusion"),
    sourceMutation("local world origin removed", "game", "const localWorldX=worldX-o;", "const localWorldX=worldX;", "world-lock"),
    sourceMutation("render origin argument removed", "game", "renderBranchStagePolish(now,o);", "renderBranchStagePolish(now,0);", "world-lock"),
    sourceMutation("dino life key drifts", "game", 'Object.freeze({asset:"waterhole",anchor:368', 'Object.freeze({asset:"waterholeBroken",anchor:368', "dino-anchors"),
    sourceMutation("dino decor becomes visible", "css", "body.st-dino:not(.tunnel-interior) #branchDecorT,", "body.st-dino:not(.tunnel-interior) #branchDecorBROKEN,", "dino-decor-hidden"),
    sourceMutation("nest world anchor drifts", "game", 'Object.freeze({asset:"nest",anchor:980', 'Object.freeze({asset:"nest",anchor:1080', "dino-anchors"),
    sourceMutation("nest landmark identity removed", "game", 'className:"branch-dino-nest-landmark"', 'className:"branch-dino-nest"', "dino-nest-single"),
    sourceMutation("nest depth drifts", "game", 'asset:"nest",anchor:980,width:16,scale:.90,depth:3', 'asset:"nest",anchor:980,width:16,scale:.90,depth:2', "dino-nest-single"),
    sourceMutation("far life promoted near", "game", 'groundAnchorY:.97645,occlusionPx:0,role:"far",layer:"far"', 'groundAnchorY:.97645,occlusionPx:0,role:"near",layer:"far"', "dino-depth-split"),
    sourceMutation("dino far z order drifts", "css", ".branch-world-life--far{z-index:2!important}", ".branch-world-life--far{z-index:4!important}", "dino-depth-split"),
    sourceMutation("stamp visible pop frame removed", "css", "20%{opacity:1;transform:translate(-50%,-50%) scale(.9)}", "20%{opacity:0;transform:translate(-50%,-50%) scale(.9)}", "stamp-pop"),
    sourceMutation("dino horizon falls", "css", "--branch-horizon-y:-8.2vh", "--branch-horizon-y:21.91vh", "dino-vertical"),
    sourceMutation("dino meadow falls", "css", "#branchDinoMeadow{position:absolute;left:0;right:0;top:52vh", "#branchDinoMeadow{position:absolute;left:0;right:0;top:62vh", "dino-vertical"),
    sourceMutation("cat station five collapses", "game", "stationIndex:4,visibleCats:5", "stationIndex:3,visibleCats:5", "cat-stations"),
    sourceMutation("cat midpoint count collapses", "game", "Array.from({length:QN*2-1}", "Array.from({length:QN}", "cat-stations"),
    sourceMutation("cat density target drops", "game", 'role:"far",stationIndex:0,visibleCats:5', 'role:"far",stationIndex:0,visibleCats:4', "cat-density"),
    sourceMutationAfter("cat viewport culling breaks", "game", 'if(sprite.stageId==="cat"){', 'sprite.el.style.visibility=visible?"visible":"hidden"', 'sprite.el.style.visibility="hidden"', "cat-inactive")
  ];

  assert.equal(mutations.length, EXPECTED_MUTATIONS, "mutation count drifted");
  for (const mutation of mutations) {
    const result = await validate(mutation.sources, mutation.fixture);
    assert.equal(result.checks, EXPECTED_VALIDATE_CHECKS, `${mutation.name}: check count drifted`);
    assert.deepEqual(result.errors, [mutation.code], `${mutation.name}: must reject only ${mutation.code}`);
  }

  console.log(`nazonazo world coherence regression: PASS (${entriesLabel(fixture.assets)}, ${baseline.checks} checks, ${mutations.length}/${mutations.length} mutations REJECT)`);
}

function entriesLabel(entries) {
  return `${entries.length} canonical GPT Image 2 assets`;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
