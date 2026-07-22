#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const sources = Object.freeze({
  game: read("nazonazo-tunnel/js/game.js"),
  html: read("nazonazo-tunnel/index.html"),
  css: read("nazonazo-tunnel/styles.css"),
  sw: read("sw.js")
});
const provenanceFixture = JSON.parse(read("tests/fixtures/nazonazo_tunnel_depth_assets_provenance_1408.json"));
const imageRoot = path.join(root, "assets/images/nazonazo-tunnel");
const THREE_MIB = 3 * 1024 * 1024;
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const compact = value => value.replace(/\s+/g, "");

const ASSETS = Object.freeze([
  { stage: "fire", key: "horizon", name: "branch_fire_horizon_cutout_loop_depthfix_20260721.webp", width: 3548, height: 887, bytes: 493774, sha256: "3c86658dfff71dbd07a119e29245dc36aa6bf8b56a865926ec370191ebfbc44c", alpha: true, loop: true, active: false, candidate: "tmp/alpha_pending/1408a-nazonazo-fire-alpha-v2/candidates/branch_fire_horizon_cutout_loop_alpha_v2.webp" },
  { stage: "fire", key: "mid", name: "branch_fire_mid_cutout_loop_depthfix_20260721.webp", width: 3548, height: 887, bytes: 2075228, sha256: "3b3c633f513b8634437f58a87df46ff2131e8daffb5fcf4e00f58d468e12563a", alpha: true, loop: true, active: false, candidate: "tmp/alpha_pending/1408a-nazonazo-fire-alpha-v2/candidates/branch_fire_mid_cutout_loop_alpha_v2.webp" },
  { stage: "fire", key: "fg", name: "branch_fire_foreground_cutout_loop_depthfix_20260721.webp", width: 3548, height: 318, bytes: 1203184, sha256: "294d0794012a1cd64d176c3c1856e98d58d8b3e1825b9ba0dba7971b3feb0589", alpha: true, loop: true, active: false, candidate: "tmp/alpha_pending/1408a-nazonazo-fire-alpha-v2/candidates/branch_fire_foreground_cutout_loop_alpha_v2.webp" },
  { stage: "fire", key: "decor", name: "branch_fire_decor_cutout_depthfix_20260721.webp", width: 3548, height: 218, bytes: 427106, sha256: "801421e2aec33b7a0cde272fa51c1327d1e0d14b7fe128c85746a3e7249e3021", alpha: true, loop: true, active: false, candidate: "tmp/alpha_pending/1408a-nazonazo-fire-alpha-v2/candidates/branch_fire_decor_cutout_alpha_v2.webp" },
  { stage: "fire", key: "flame", name: "effect_fire_flame_particle_a_depthfix_20260721.webp", width: 640, height: 863, bytes: 406580, sha256: "9b52d614385f5fbad7fb3384996801206bd7ae92062c0ce84c353b6de4d547d7", alpha: true, loop: false, candidate: "tmp/alpha_pending/1408a-nazonazo-fire-alpha-v2/candidates/effect_fire_flame_particle_a_alpha_v2.webp" },
  { stage: "fire", key: "ember", name: "effect_fire_ember_particle_depthfix_20260721.webp", width: 407, height: 422, bytes: 70944, sha256: "3af58af80ab989b8334a18a63a2463917ba9d9e3888d622e45b6606ee26c4889", alpha: true, loop: false, candidate: "tmp/alpha_pending/1408a-nazonazo-fire-alpha-v2/candidates/effect_fire_ember_particle_alpha_v2.webp" },
  { stage: "dino", key: "meadow", name: "branch_dino_meadow_loop_depthfix_20260721.webp", width: 3200, height: 800, bytes: 2710152, sha256: "530af1024821e8606cb8810f8801f85d88737a23399f0d5b686572a4c7361ff9", alpha: false, loop: true, candidate: "tmp/alpha_pending/1408b-nazonazo-fantasy-alpha-v2/dino-meadow-loop/candidate/dino_meadow_loop_3200x800_lossless.webp" },
  { stage: "fantasy", key: "horizon", name: "branch_fantasy_horizon_cutout_loop_depthfix_v4_20260721.webp", width: 3966, height: 793, bytes: 311620, sha256: "67b7a649df18aa6f5417ac951bd1a86fec1231c365221296621a5dbd6ccbdbb9", alpha: true, loop: true, clearFrom: 564, candidate: "tmp/alpha_pending/1408b-nazonazo-fantasy-alpha-v2/fantasy-alpha-v4-baseline-feather/candidates/fantasy_horizon_alpha_v4.webp" },
  { stage: "fantasy", key: "mid", name: "branch_fantasy_mid_cutout_loop_depthfix_v4_20260721.webp", width: 3966, height: 793, bytes: 754604, sha256: "788d218754a20dd50d6c2665b48eed2818a7b972632a8173a9c7b73251e04bdd", alpha: true, loop: true, clearFrom: 574, candidate: "tmp/alpha_pending/1408b-nazonazo-fantasy-alpha-v2/fantasy-alpha-v4-baseline-feather/candidates/fantasy_mid_alpha_v4.webp" },
  { stage: "fantasy", key: "fg", name: "branch_fantasy_foreground_cutout_loop_depthfix_20260721.webp", width: 3966, height: 198, bytes: 730388, sha256: "dd65ca1c6330d1d9b6c354a9afd5a218fcf6b994f9e9e5c4f434335bce6ce733", alpha: true, loop: true, candidate: "tmp/alpha_pending/1408b-nazonazo-fantasy-alpha-v2/candidates/fantasy_foreground_alpha_v2.webp" },
  { stage: "fantasy", key: "decor", name: "branch_fantasy_decor_cutout_loop_depthfix_20260721.webp", width: 3642, height: 172, bytes: 84124, sha256: "229d86765a7cb15cf532b403fe3bc55fc814b56f1d7b2c9df979a33c2a5d0bb4", alpha: true, loop: true, candidate: "tmp/alpha_pending/1408b-nazonazo-fantasy-alpha-v2/candidates/fantasy_decor_alpha_v2.webp" }
].map(Object.freeze));

const analysisCache = new Map();
async function analyzeAsset(asset) {
  const absolute = path.join(imageRoot, asset.name);
  if (analysisCache.has(absolute)) return analysisCache.get(absolute);
  const bytes = fs.readFileSync(absolute);
  const metadata = await sharp(bytes).metadata();
  const decoded = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  const result = { bytes, metadata, data: decoded.data, info: decoded.info };
  analysisCache.set(absolute, result);
  return result;
}

function seamMismatches(data, width, height, channels, leftX, rightX) {
  let mismatches = 0;
  for (let y = 0; y < height; y += 1) {
    const left = (y * width + leftX) * channels;
    const right = (y * width + rightX) * channels;
    for (let channel = 0; channel < channels; channel += 1) {
      if (data[left + channel] !== data[right + channel]) mismatches += 1;
    }
  }
  return mismatches;
}

function moduloViewportCoverage(count, spacing, phase, halfWidth) {
  const period = count * spacing;
  let minVisible = Infinity;
  let maxVisible = -Infinity;
  for (let local = 0; local < period; local += .25) {
    const positions = Array.from({ length: count }, (_, index) => {
      const raw = index * spacing + phase - local;
      return ((raw % period) + period) % period;
    }).sort((a, b) => a - b);
    const gaps = positions.map((value, index) => index + 1 < positions.length ? positions[index + 1] - value : positions[0] + period - value);
    if (!gaps.every(gap => Math.abs(gap - spacing) < 1e-9)) return null;
    const visible = positions.filter(x => x + halfWidth >= 0 && x - halfWidth <= 100).length;
    minVisible = Math.min(minVisible, visible);
    maxVisible = Math.max(maxVisible, visible);
  }
  return { minVisible, maxVisible };
}

function dinoHerdViewportCoverage(count, spacing, width) {
  const period = count * spacing;
  let minVisible = Infinity;
  let maxVisible = -Infinity;
  for (let herdWorldX = 0; herdWorldX < period; herdWorldX += .25) {
    const positions = Array.from({ length: count }, (_, poolIndex) => {
      const raw = poolIndex * spacing - herdWorldX;
      return (((raw + spacing) % period) + period) % period - spacing;
    });
    const visible = positions.filter(x => x < 100 && x + width > 0).length;
    minVisible = Math.min(minVisible, visible);
    maxVisible = Math.max(maxVisible, visible);
  }
  return { minVisible, maxVisible };
}

async function validate(candidateSources, assetSpecs = ASSETS) {
  const errors = [];
  const check = (condition, code) => { if (!condition) errors.push(code); };
  const { game, html, css, sw } = candidateSources;
  const gameCompact = compact(game);
  const cssCompact = compact(css);

  for (const asset of assetSpecs) {
    const absolute = path.join(imageRoot, asset.name);
    check(fs.existsSync(absolute), "asset-hash");
    if (!fs.existsSync(absolute)) continue;
    const inspected = await analyzeAsset(asset);
    check(inspected.bytes.length === asset.bytes && inspected.bytes.length < THREE_MIB && sha256(inspected.bytes) === asset.sha256, "asset-hash");
    check(inspected.metadata.format === "webp" && inspected.metadata.width === asset.width && inspected.metadata.height === asset.height &&
      inspected.metadata.hasAlpha === asset.alpha && inspected.metadata.channels === (asset.alpha ? 4 : 3), "asset-alpha-seam");
    check(asset.active === false || game.includes(asset.name), "asset-hash");
    if (asset.alpha) {
      let transparent = 0;
      let visible = 0;
      let transparentRgbNonzero = 0;
      const { data, info } = inspected;
      for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
        const offset = pixel * 4;
        if (data[offset + 3] === 0) {
          transparent += 1;
          if (data[offset] || data[offset + 1] || data[offset + 2]) transparentRgbNonzero += 1;
        } else visible += 1;
      }
      check(transparent > 0 && visible > 0 && transparentRgbNonzero === 0, "asset-alpha-seam");
    }
    if (asset.loop) {
      const { data, info } = inspected;
      check(info.width % 2 === 0 &&
        seamMismatches(data, info.width, info.height, info.channels, info.width / 2 - 1, info.width / 2) === 0 &&
        seamMismatches(data, info.width, info.height, info.channels, info.width - 1, 0) === 0, "asset-alpha-seam");
    }
    if (fs.existsSync(path.join(root, asset.candidate))) {
      check(fs.readFileSync(path.join(root, asset.candidate)).equals(inspected.bytes), "asset-hash");
    }
  }

  check(provenanceFixture.version === 1 && provenanceFixture.batch === "1408-nazonazo-depth-parallax" &&
    Array.isArray(provenanceFixture.assets) && provenanceFixture.assets.length === assetSpecs.length, "asset-hash");
  const provenanceByCanonical = new Map(provenanceFixture.assets.map(entry => [entry.canonical, entry]));
  check(provenanceByCanonical.size === assetSpecs.length, "asset-hash");
  for (const asset of assetSpecs) {
    const lineage = provenanceByCanonical.get(asset.name);
    check(lineage && lineage.model === "gpt-image-2" && /^[a-f0-9]{64}$/.test(lineage.rawSha256) &&
      lineage.candidatePath === asset.candidate && lineage.candidateSha256 === asset.sha256 &&
      lineage.canonicalSha256 === asset.sha256, "asset-hash");
    if (!lineage) continue;
    const rawPath = path.join(root, lineage.rawPath);
    if (fs.existsSync(rawPath)) {
      const raw = fs.readFileSync(rawPath);
      check(sha256(raw) === lineage.rawSha256 && raw.includes(Buffer.from("c2pa")) && raw.includes(Buffer.from("gpt-image")), "asset-hash");
    }
    const candidatePath = path.join(root, lineage.candidatePath);
    if (fs.existsSync(candidatePath)) check(sha256(fs.readFileSync(candidatePath)) === lineage.candidateSha256, "asset-hash");
  }

  const fireRenderAt = gameCompact.indexOf("branchFireSprites.forEach(sprite=>{");
  const fireRenderSource = fireRenderAt >= 0 ? gameCompact.slice(fireRenderAt, fireRenderAt + 900) : "";
  const ventAnchors = [...game.matchAll(/Object\.freeze\(\{cycle:(\d+),phase:([.\d]+),width:/g)]
    .map(match => [Number(match[1]), Number(match[2])]);
  check(JSON.stringify(ventAnchors) === JSON.stringify([[0, .29], [2, .76], [5, .29], [6, .76], [10, .29], [13, .76], [18, .29]]) &&
    gameCompact.includes("constBRANCH_FIRE_MAGMA_PARALLAX=1.07;") &&
    !gameCompact.includes("BRANCH_FIRE_FLAME_POOL_SIZE") && !gameCompact.includes("BRANCH_FIRE_EMBER_DESKTOP_POOL_SIZE") &&
    fireRenderSource.includes("constanchor=(sprite.cycle+sprite.phase)*magmaPeriod;") &&
    fireRenderSource.includes("constx=anchor-localWorldX*BRANCH_FIRE_MAGMA_PARALLAX;") &&
    fireRenderSource.includes('sprite.el.style.transform="translate3d("+cssXFromVw(x)+",0,0)translateX(-50%)";') &&
    !fireRenderSource.includes("%magmaPeriod") && !fireRenderSource.includes("poolIndex"), "fire-modulo");
  check(cssCompact.includes("body.st-fire:not(.tunnel-interior)#fgT{z-index:5;") && cssCompact.includes("#branchEffectMid{z-index:6}") &&
    cssCompact.includes("body.st-fire:not(.tunnel-interior)#branchEffectMid") &&
    cssCompact.includes(".branch-fire-vent{--fire-vent-width:clamp(30px,5.1vmin,52px);") &&
    cssCompact.includes("bottom:calc(var(--branch-fg-height)-var(--fire-vent-cover))!important;z-index:2;") &&
    cssCompact.includes(".branch-fire-flame{display:block;width:100%;"), "fire-modulo");

  const meadowCssAt = cssCompact.indexOf("#branchDinoMeadow{");
  const meadowCss = meadowCssAt >= 0 ? cssCompact.slice(meadowCssAt, meadowCssAt + 800) : "";
  check(gameCompact.includes('document.body.classList.toggle("branch-night",branchRaster&&loop%2===1);') &&
    gameCompact.includes('functionprefersReducedMotionActive(){try{return!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion:reduce)").matches);}catch(_){returnfalse;}}') &&
    gameCompact.includes('functionbranchPolishDensity(){returnprefersReducedMotionActive()?"reduced":') &&
    gameCompact.includes("constemberCount=reduced?0:") &&
    gameCompact.includes("BRANCH_FIRE_VENT_TERRAIN_CONFIG.forEach((config,index)=>{") &&
    cssCompact.includes("body.branch-raster.branch-night{--branch-polish-brightness:.68;--branch-polish-saturate:.78;--branch-polish-contrast:.98;--branch-polish-hue:-6deg;--branch-snow-opacity:.74}") &&
    cssCompact.includes("body.branch-raster.branch-night:not(.tunnel-interior)#branchDecorT,") &&
    meadowCss.includes("filter:brightness(var(--branch-polish-brightness))saturate(var(--branch-polish-saturate))contrast(var(--branch-polish-contrast))hue-rotate(var(--branch-polish-hue));") &&
    cssCompact.includes(".branch-fire-flame{animation:none!important;") &&
    cssCompact.includes(".branch-fire-ember-field,.branch-fire-crater-ember{display:none!important}") &&
    !cssCompact.includes(".branch-fire-hotspot:not(:first-child)"), "night-reduced");

  const meadow = ASSETS.find(asset => asset.key === "meadow");
  const meadowInfo = await analyzeAsset(meadow);
  check(!meadowInfo.metadata.hasAlpha && meadowInfo.metadata.channels === 3 &&
    html.indexOf('id="branchDinoMeadow"') < html.indexOf('id="horizon"') &&
    gameCompact.includes('if(branchDinoMeadow)branchDinoMeadow.style.backgroundImage=st.id==="dino"&&st.assets&&st.assets.meadow?bgUrl(st.assets.meadow):"none";') &&
    cssCompact.includes("#branchDinoMeadow{position:absolute;left:0;right:0;top:52vh;bottom:auto;height:48vh;z-index:0;display:none;") &&
    cssCompact.includes("body.st-dino:not(.tunnel-interior)#branchDinoMeadow{display:block}") &&
    gameCompact.includes("constBRANCH_DINO_MEADOW_PARALLAX=.10;") &&
    gameCompact.includes("constBRANCH_DINO_FAR_HERD_PARALLAX=.06;") &&
    gameCompact.includes("constBRANCH_DINO_FAR_HERD_POOL_SIZE=3;") &&
    gameCompact.includes("branchDinoMeadow.style.backgroundPositionX=cssXFromVw(-localWorldX*BRANCH_DINO_MEADOW_PARALLAX)") &&
    gameCompact.includes("functionprojectBranchWorldSpriteX(anchor,localWorldX,parallax){return50+(anchor-localWorldX)*parallax;}") &&
    gameCompact.includes("constx=projectBranchWorldSpriteX(sprite.anchor,localWorldX,sprite.parallax);") &&
    !gameCompact.includes("clamp(travel") && !gameCompact.includes("activeCatByRole") &&
    gameCompact.includes('constbranchMidRate=branchStageId==="fire"?.17:(branchStageId==="dino"?.18:.25);') &&
    gameCompact.includes('constbranchFgRate=branchStageId==="fire"?BRANCH_FIRE_MAGMA_PARALLAX:(branchStageId==="dino"?1.18:1.35);'), "dino-meadow-parallax");
  const herdRenderAt = gameCompact.indexOf("branchDinoFarHerdSprites.forEach(sprite=>{");
  const herdRenderSource = herdRenderAt >= 0 ? gameCompact.slice(herdRenderAt, herdRenderAt + 700) : "";
  const herdCoverage = dinoHerdViewportCoverage(3, 115, 70);
  check(herdRenderSource.includes("constraw=sprite.poolIndex*BRANCH_DINO_FAR_HERD_SPACING_VW-herdWorldX;") &&
    herdRenderSource.includes("constx=(((raw+BRANCH_DINO_FAR_HERD_SPACING_VW)%period)+period)%period-BRANCH_DINO_FAR_HERD_SPACING_VW;") &&
    herdRenderSource.includes('sprite.el.style.transform="translate3d("+cssXFromVw(x)+",0,0)";') &&
    herdCoverage.minVisible === 1 && herdCoverage.maxVisible === 2, "dino-meadow-parallax");
  const parallaxValues = [...game.matchAll(/asset:"(?:waterhole|stegosaurus|parasaurolophus|sauropod|trex)"[^\n]+parallax:([.\d]+)/g)].map(match => Number(match[1]));
  check(JSON.stringify(parallaxValues) === JSON.stringify([.14, .16, .14, .62, .70]) &&
    Math.max(.14, .16, .14) < .32 && .32 < Math.min(.62, .70) &&
    .06 < .10 && .10 < .14 && .70 < 1 && 1 < 1.18, "dino-meadow-parallax");

  let fantasyRowsPass = true;
  for (const asset of ASSETS.filter(item => item.clearFrom)) {
    const { data, info } = await analyzeAsset(asset);
    let partialRows = 0;
    for (let y = 548; y < info.height; y += 1) {
      let nonzero = 0;
      let opaque = 0;
      for (let x = 0; x < info.width; x += 1) {
        const alpha = data[(y * info.width + x) * 4 + 3];
        if (alpha) nonzero += 1;
        if (alpha === 255) opaque += 1;
      }
      if (y < asset.clearFrom && nonzero > 0 && opaque === 0) partialRows += 1;
      if (y >= asset.clearFrom && nonzero !== 0) fantasyRowsPass = false;
      if (y >= 548 && opaque !== 0) fantasyRowsPass = false;
    }
    if (partialRows < 10) fantasyRowsPass = false;
  }
  const styleToken = html.match(/styles\.css\?v=([^"']+)/)?.[1];
  const gameToken = html.match(/js\/game\.js\?v=([^"']+)/)?.[1];
  check(fantasyRowsPass && styleToken === "20260723-1418" && gameToken === styleToken &&
    /const CACHE_VERSION = 2330;/.test(sw) && /\/\/ v2317:/.test(sw) && /\/\/ v2316:/.test(sw) &&
    game.includes("branch_fantasy_horizon_cutout_loop_depthfix_v4_20260721.webp") &&
    game.includes("branch_fantasy_mid_cutout_loop_depthfix_v4_20260721.webp") &&
    !game.includes("branch_fantasy_horizon_cutout_loop_depthfix_v3_20260721.webp") &&
    !game.includes("branch_fantasy_mid_cutout_loop_depthfix_v3_20260721.webp") &&
    cssCompact.includes("body.st-fantasy{--branch-horizon-y:-20vh;--branch-mid-y:8.99vh;--branch-decor-height:8vh;--branch-decor-bottom:38vh;--branch-fg-height:20vh}") &&
    cssCompact.includes("body.branch-effects-running.pono-game-ready.st-fantasy:not(.tunnel-interior)#branchDecorT{animation:branchFantasyTwinkle3.6sease-in-outinfinitealternate}") &&
    cssCompact.includes("body.st-fantasy:not(.tunnel-interior)#branchDecorT{animation:none!important;opacity:.9!important}"), "fantasy-baseline-token");

  return [...new Set(errors)];
}

function replaceOnce(source, search, replacement) {
  assert.equal(source.split(search).length - 1, 1, `mutation precondition drifted: ${search}`);
  return source.replace(search, replacement);
}

function replaceFirstAfter(source, marker, search, replacement) {
  const markerAt = source.indexOf(marker);
  assert.ok(markerAt >= 0, `mutation marker drifted: ${marker}`);
  const searchAt = source.indexOf(search, markerAt);
  assert.ok(searchAt >= markerAt, `mutation target drifted after ${marker}: ${search}`);
  return source.slice(0, searchAt) + replacement + source.slice(searchAt + search.length);
}

async function main() {
  assert.deepEqual(await validate(sources), [], "1409 depth/parallax baseline must pass");
  const mutations = [
    { name: "canonical hash drift", code: "asset-hash", sources, assets: ASSETS.map((asset, index) => index === 0 ? { ...asset, sha256: "0".repeat(64) } : asset) },
    { name: "fire authored vent schedule collapses", code: "fire-modulo", sources: { ...sources, game: replaceOnce(sources.game, "Object.freeze({cycle:18,phase:.29,width:4.8", "Object.freeze({cycle:13,phase:.29,width:4.8") }, assets: ASSETS },
    { name: "fire modulo x is discarded offscreen", code: "fire-modulo", sources: { ...sources, game: replaceFirstAfter(sources.game, "branchFireSprites.forEach(sprite=>{", 'sprite.el.style.transform="translate3d("+cssXFromVw(x)+",0,0) translateX(-50%)";', 'sprite.el.style.transform="translate3d(-200vw,0,0)";') }, assets: ASSETS },
    { name: "night toggle removed", code: "night-reduced", sources: { ...sources, game: replaceOnce(sources.game, ' document.body.classList.toggle("branch-night",branchRaster&&loop%2===1);\n', "") }, assets: ASSETS },
    { name: "dino meadow night filter removed", code: "night-reduced", sources: { ...sources, css: replaceFirstAfter(sources.css, "#branchDinoMeadow{", "filter:brightness(var(--branch-polish-brightness)) saturate(var(--branch-polish-saturate)) contrast(var(--branch-polish-contrast)) hue-rotate(var(--branch-polish-hue));", "filter:none;") }, assets: ASSETS },
    { name: "reduced fire keeps embers", code: "night-reduced", sources: { ...sources, game: replaceOnce(sources.game, "const emberCount=reduced?0:", "const emberCount=reduced?1:") }, assets: ASSETS },
    { name: "reduced fire flicker resumes", code: "night-reduced", sources: { ...sources, css: replaceOnce(sources.css, ".branch-fire-flame{animation:none!important;", ".branch-fire-flame{animation:branchFireFlicker!important;") }, assets: ASSETS },
    { name: "night saturate variable removed", code: "night-reduced", sources: { ...sources, css: replaceOnce(sources.css, "--branch-polish-saturate:.78;", "") }, assets: ASSETS },
    { name: "night contrast variable removed", code: "night-reduced", sources: { ...sources, css: replaceOnce(sources.css, "--branch-polish-contrast:.98;", "") }, assets: ASSETS },
    { name: "night hue variable removed", code: "night-reduced", sources: { ...sources, css: replaceOnce(sources.css, "--branch-polish-hue:-6deg;", "") }, assets: ASSETS },
    { name: "dino meadow joins foreground speed", code: "dino-meadow-parallax", sources: { ...sources, game: replaceOnce(sources.game, "const BRANCH_DINO_MEADOW_PARALLAX=.10;", "const BRANCH_DINO_MEADOW_PARALLAX=1.18;") }, assets: ASSETS },
    { name: "dino far herd loses signed wrap", code: "dino-meadow-parallax", sources: { ...sources, game: replaceOnce(sources.game, "const x=(((raw+BRANCH_DINO_FAR_HERD_SPACING_VW)%period)+period)%period-BRANCH_DINO_FAR_HERD_SPACING_VW;", "const x=((raw%period)+period)%period;") }, assets: ASSETS },
    { name: "dino world projection ignores anchor", code: "dino-meadow-parallax", sources: { ...sources, game: replaceOnce(sources.game, "return 50+(anchor-localWorldX)*parallax;", "return 50-localWorldX*parallax;") }, assets: ASSETS },
    { name: "fantasy cache token rolls back", code: "fantasy-baseline-token", sources: { ...sources, html: replaceOnce(sources.html, "styles.css?v=20260723-1418", "styles.css?v=20260723-1417") }, assets: ASSETS }
  ];
  for (const mutation of mutations) {
    assert.deepEqual(await validate(mutation.sources, mutation.assets), [mutation.code], `${mutation.name}: must reject only ${mutation.code}`);
  }
  console.log(`nazonazo depth/parallax regression: PASS (${ASSETS.length} canonical WebP, tracked provenance, ${mutations.length}/${mutations.length} mutations REJECT)`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
