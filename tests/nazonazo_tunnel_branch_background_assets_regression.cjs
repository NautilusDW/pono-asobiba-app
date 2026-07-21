#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const game = read("nazonazo-tunnel/js/game.js");
const html = read("nazonazo-tunnel/index.html");
const css = read("nazonazo-tunnel/styles.css");
const sw = read("sw.js");

const STAGE_IDS = ["snow", "fire", "dino", "toy", "cat", "fantasy", "sky", "ruins"];
const LAYER_KEYS = ["sky", "horizon", "mid", "ground", "fg", "decor"];
const PRELOAD_KEYS = [...LAYER_KEYS, "meadow"];
const REJOIN = {
  snow: "jungle", fire: "jungle", dino: "number", toy: "number",
  cat: "sea", fantasy: "sea2", sky: "space", ruins: "space2"
};
const WORLD_COHERENCE_ASSETS = Object.freeze({
  "fire.volcano": "../assets/images/nazonazo-tunnel/branch_fire_distant_volcano_worldfix_20260721.webp",
  "fire.mid": "../assets/images/nazonazo-tunnel/branch_fire_woodland_basalt_mid_loop_worldfix_20260721.webp",
  "fire.fg": "../assets/images/nazonazo-tunnel/branch_fire_magma_river_fg_loop_worldfix_20260721.webp",
  "dino.farHerd": "../assets/images/nazonazo-tunnel/branch_dino_far_herd_cutout_worldfix_20260721.webp",
  "dino.waterhole": "../assets/images/nazonazo-tunnel/branch_dino_waterhole_cutout_worldfix_20260721.webp",
  "dino.stegosaurus": "../assets/images/nazonazo-tunnel/branch_dino_stegosaurus_cutout_worldfix_20260721.webp",
  "dino.parasaurolophus": "../assets/images/nazonazo-tunnel/branch_dino_parasaurolophus_cutout_worldfix_20260721.webp",
  "dino.sauropod": "../assets/images/nazonazo-tunnel/branch_dino_sauropod_cutout_worldfix_20260721.webp",
  "dino.trex": "../assets/images/nazonazo-tunnel/branch_dino_trex_cutout_worldfix_20260721.webp",
  "dino.nest": "../assets/images/nazonazo-tunnel/branch_dino_fern_nest_worldfix_20260721.webp",
  "cat.farTownA": "../assets/images/nazonazo-tunnel/branch_cat_far_town_a_worldfix_20260721.webp",
  "cat.farTownB": "../assets/images/nazonazo-tunnel/branch_cat_far_town_b_worldfix_20260721.webp",
  "cat.midGardenA": "../assets/images/nazonazo-tunnel/branch_cat_mid_garden_a_worldfix_20260721.webp",
  "cat.midLaneB": "../assets/images/nazonazo-tunnel/branch_cat_mid_lane_b_worldfix_20260721.webp"
});
const WORLD_COHERENCE_BASE_KEYS = new Set(["fire.mid", "fire.fg"]);
const WORLD_COHERENCE_URLS = new Set(Object.values(WORLD_COHERENCE_ASSETS));
const FORBIDDEN_LEGACY_ASSETS = Object.freeze([
  "branch_fire_horizon_cutout_loop_depthfix_20260721.webp",
  "branch_fire_mid_cutout_loop_depthfix_20260721.webp",
  "branch_fire_foreground_cutout_loop_depthfix_20260721.webp",
  "branch_fire_decor_cutout_depthfix_20260721.webp",
  "branch_dino_far_herd_cutout_20260721.webp",
  "branch_dino_waterhole_cutout_20260721.webp",
  "branch_dino_stegosaurus_family_cutout_20260721.webp",
  "branch_dino_parasaurolophus_herd_cutout_20260721.webp",
  "branch_dino_sauropod_clearing_cutout_20260721.webp",
  "branch_dino_trex_glimpse_cutout_20260721.webp",
  "branch_dino_decor_cutout_20260720.webp",
  "branch_cat_foreground_cutout_loop_20260720.webp",
  "branch_cat_decor_cutout_loop_20260720.webp"
]);

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

function extractObjectAfter(source, marker) {
  const markerAt = source.indexOf(marker);
  assert.ok(markerAt >= 0, `${marker}: declaration missing`);
  const openAt = source.indexOf("{", markerAt + marker.length);
  assert.ok(openAt >= 0, `${marker}: object start missing`);
  const end = scanBalanced(source, openAt, "{", "}");
  assert.ok(end > openAt, `${marker}: object is unterminated`);
  return source.slice(openAt, end + 1);
}

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const markerAt = source.indexOf(marker);
  assert.ok(markerAt >= 0, `${name}: function missing`);
  const openAt = source.indexOf("{", markerAt + marker.length);
  const end = scanBalanced(source, openAt, "{", "}");
  assert.ok(end > openAt, `${name}: function is unterminated`);
  return source.slice(markerAt, end + 1);
}

const ASSET_OVERRIDES = Object.freeze({
  "fire.mid": WORLD_COHERENCE_ASSETS["fire.mid"],
  "fire.fg": WORLD_COHERENCE_ASSETS["fire.fg"],
  "dino.mid": "../assets/images/nazonazo-tunnel/branch_dino_mid_open_cutout_loop_20260721.webp",
  "dino.meadow": "../assets/images/nazonazo-tunnel/branch_dino_meadow_loop_depthfix_20260721.webp",
  "toy.mid": "../assets/images/nazonazo-tunnel/branch_toy_mid_variety_cutout_loop_20260720.webp",
  "toy.decor": "../assets/images/nazonazo-tunnel/branch_toy_decor_variety_cutout_loop_20260720.webp",
  "cat.fg": "../assets/images/nazonazo-tunnel/branch_cat_foreground_no_yarn_cutout_loop_20260721.webp",
  "cat.decor": "../assets/images/nazonazo-tunnel/branch_cat_decor_no_yarn_cutout_loop_20260721.webp",
  "fantasy.horizon": "../assets/images/nazonazo-tunnel/branch_fantasy_horizon_cutout_loop_depthfix_v4_20260721.webp",
  "fantasy.mid": "../assets/images/nazonazo-tunnel/branch_fantasy_mid_cutout_loop_depthfix_v4_20260721.webp",
  "fantasy.fg": "../assets/images/nazonazo-tunnel/branch_fantasy_foreground_cutout_loop_depthfix_20260721.webp",
  "fantasy.decor": "../assets/images/nazonazo-tunnel/branch_fantasy_decor_cutout_loop_depthfix_20260721.webp"
});

function expectedAsset(stageId, key) {
  const override = ASSET_OVERRIDES[`${stageId}.${key}`];
  if (override) return override;
  const suffix = key === "sky" ? "sky_back" :
    key === "horizon" ? "horizon_cutout_loop" :
    key === "mid" ? "mid_cutout_loop" :
    key === "ground" ? "ground_track_loop" :
    key === "fg" ? "foreground_cutout_loop" :
    ["cat", "fantasy", "sky", "ruins"].includes(stageId) ? "decor_cutout_loop" : "decor_cutout";
  return `../assets/images/nazonazo-tunnel/branch_${stageId}_${suffix}_20260720.webp`;
}

const assetsSource = extractObjectAfter(game, "const ASSETS=");
const expectedUrls = [];
for (const stageId of STAGE_IDS) {
  const stageAssets = extractObjectAfter(assetsSource, `\n ${stageId}:`);
  const ownKeys = [...stageAssets.matchAll(/\n\s{2}([a-z]+):/g)].map(match => match[1]);
  const expectedKeys = stageId === "fire" ? ["sky", "mid", "ground", "fg"] :
    (stageId === "dino" ? ["sky", "horizon", "mid", "ground", "fg", "meadow"] : LAYER_KEYS);
  assert.deepEqual(ownKeys, expectedKeys, `${stageId}: branch asset object keys drifted`);
  for (const key of expectedKeys) {
    const url = expectedAsset(stageId, key);
    expectedUrls.push(url);
    assert.ok(stageAssets.includes(`${key}:"${url}"`), `${stageId}.${key}: exact production URL missing`);
    const relative = url.replace(/^\.\.\//, "");
    const absolute = path.join(root, relative);
    assert.ok(fs.existsSync(absolute), `${relative}: mapped file missing`);
    assert.ok(fs.statSync(absolute).isFile(), `${relative}: mapped path must be a regular file`);
    if (WORLD_COHERENCE_URLS.has(url)) continue;
    const bytes = fs.readFileSync(absolute);
    assert.ok(bytes.length > 1000, `${relative}: asset is unexpectedly empty`);
    assert.ok(bytes.length < 3 * 1024 * 1024, `${relative}: exceeds the repository 3MiB limit`);
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", `${relative}: RIFF signature missing`);
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", `${relative}: WebP signature missing`);
    assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, `${relative}: incomplete RIFF length`);
  }
}
assert.equal(new Set(expectedUrls).size, 46, "the branch raster map must contain 45 active layers plus the dino meadow");
const branchUrlLiterals = assetsSource.match(/"\.\.\/assets\/images\/nazonazo-tunnel\/branch_[^"]+_2026072[01]\.webp"/g) || [];
assert.equal(branchUrlLiterals.length, 46, "ASSETS must contain 45 active layers plus the dino meadow URL");
assert.equal(new Set(branchUrlLiterals).size, 46, "every branch raster URL literal must be unique");

const polishAssetsSource = extractObjectAfter(game, "const BRANCH_STAGE_POLISH_ASSETS=");
assert.equal(Object.keys(WORLD_COHERENCE_ASSETS).length, 14, "batch 1409 must keep exactly 14 canonical runtime assets");
assert.equal(WORLD_COHERENCE_URLS.size, 14, "batch 1409 canonical runtime URLs must remain unique");
for (const [qualifiedKey, url] of Object.entries(WORLD_COHERENCE_ASSETS)) {
  const [stageId, key] = qualifiedKey.split(".");
  const container = WORLD_COHERENCE_BASE_KEYS.has(qualifiedKey) ? assetsSource : polishAssetsSource;
  const marker = WORLD_COHERENCE_BASE_KEYS.has(qualifiedKey) ? `\n ${stageId}:` : `\n ${stageId}:Object.freeze(`;
  const stageAssets = extractObjectAfter(container, marker);
  assert.ok(stageAssets.includes(`${key}:"${url}"`), `${qualifiedKey}: exact batch 1409 runtime URL missing`);
  const relative = url.replace(/^\.\.\//, "");
  const absolute = path.join(root, relative);
  assert.ok(fs.existsSync(absolute), `${relative}: batch 1409 canonical path missing`);
  assert.ok(fs.statSync(absolute).isFile(), `${relative}: batch 1409 canonical path must be a regular file`);
}
FORBIDDEN_LEGACY_ASSETS.forEach(filename =>
  assert.ok(!game.includes(filename), `${filename}: retired branch asset must not return to runtime`));

const branchStageIdsLiteral = game.match(/const BRANCH_RASTER_STAGE_IDS=new Set\((\[[^\]]+\])\);/);
const branchAssetKeysLiteral = game.match(/const BRANCH_RASTER_ASSET_KEYS=Object\.freeze\((\[[^\]]+\])\);/);
assert.ok(branchStageIdsLiteral && branchAssetKeysLiteral, "branch raster preload allowlists must remain literal and reviewable");
assert.deepEqual(JSON.parse(branchStageIdsLiteral[1]), STAGE_IDS, "branch raster stage allowlist must exactly match the eight branch stages");
assert.deepEqual(JSON.parse(branchAssetKeysLiteral[1]), PRELOAD_KEYS, "branch raster preload allowlist must include the dino meadow key");

const stagesMarker = "const STAGES=";
const stagesAt = game.indexOf(stagesMarker);
const stagesOpen = stagesAt + stagesMarker.length;
const stagesEnd = scanBalanced(game, stagesOpen, "[", "]");
assert.ok(stagesAt >= 0 && stagesEnd > stagesOpen, "STAGES array missing or unterminated");
const stagesSource = game.slice(stagesOpen, stagesEnd + 1);
const stageObjects = [...stagesSource.matchAll(/\{id:"([a-z0-9]+)"/g)].map(match => {
  const end = scanBalanced(stagesSource, match.index, "{", "}");
  return { id: match[1], source: stagesSource.slice(match.index, end + 1) };
});
assert.deepEqual(stageObjects.slice(6, 14).map(stage => stage.id), STAGE_IDS, "branch stage indexes 6..13 must remain fixed");
assert.deepEqual(stageObjects.slice(14, 17).map(stage => stage.id), ["sea2", "future2", "space2"], "hub indexes 14..16 must remain fixed");
STAGE_IDS.forEach((stageId, offset) => {
  const stage = stageObjects[6 + offset];
  assert.match(stage.source, /hidden:true/, `${stageId}: hidden contract missing`);
  assert.match(stage.source, /countsToProgress:false/, `${stageId}: progress contract changed`);
  assert.ok(stage.source.includes(`rejoinId:"${REJOIN[stageId]}"`), `${stageId}: rejoin target changed`);
  assert.ok(stage.source.includes(`assets:ASSETS.${stageId}`), `${stageId}: raster assets are not wired to STAGES`);
});

const decorIdMatches = html.match(/id="branchDecorT"/g) || [];
assert.equal(decorIdMatches.length, 1, "branchDecorT must exist exactly once");
const meadowIdMatches = html.match(/id="branchDinoMeadow"/g) || [];
assert.equal(meadowIdMatches.length, 1, "branchDinoMeadow must exist exactly once");
const meadowAt = html.indexOf('<div id="branchDinoMeadow" aria-hidden="true"></div>');
const horizonAt = html.indexOf('<div id="horizon">');
assert.ok(meadowAt >= 0 && meadowAt < horizonAt, "dino meadow must remain behind the horizon layer");
const groundAt = html.indexOf('<div id="groundT"></div>');
const decorAt = html.indexOf('<div id="branchDecorT" aria-hidden="true"></div>');
const worldAt = html.indexOf('<div id="world"></div>');
assert.ok(groundAt >= 0 && groundAt < decorAt && decorAt < worldAt, "branchDecorT must be after groundT and before world");
assert.match(css, /#branchDecorT\{[^}]*bottom:11\.5vh;[^}]*height:20vh;[^}]*z-index:3;[^}]*display:none;[^}]*background-position:left bottom;[^}]*background-size:auto 100%;[^}]*background-repeat:repeat-x/s,
  "branchDecorT must be the hidden z3 repeat strip at the track edge");
assert.doesNotMatch(css, /#branchDecorT\{[^}]*z-index:4/s, "branchDecorT must never move to z4");
assert.match(css, /body\.branch-raster:not\(\.tunnel-interior\) #branchDecorT\{display:block\}/,
  "branchDecorT must only display on an exterior branch raster stage");
assert.match(css, /body\.tunnel-interior #branchDecorT\{display:none!important\}/,
  "branchDecorT must stay hidden inside tunnels");
assert.match(css, /body\.st-fire:not\(\.tunnel-interior\) #horizon,\s*body\.st-fire:not\(\.tunnel-interior\) #branchDecorT,\s*body\.st-dino:not\(\.tunnel-interior\) #branchDecorT,\s*body\.st-cat:not\(\.tunnel-interior\) #branchDecorT\{display:none!important;background-image:none!important\}/,
  "Fire horizon/decor and retired Dino/Cat decor must remain explicitly hidden");
assert.match(css, /#branchDinoMeadow\{[^}]*top:52vh;[^}]*height:48vh;[^}]*z-index:0;[^}]*display:none;[^}]*background-repeat:repeat-x/s,
  "dino meadow must remain a hidden-by-default repeated far layer");
assert.match(css, /body\.st-dino:not\(\.tunnel-interior\) #branchDinoMeadow\{display:block\}/,
  "dino meadow must display only on the exterior Dino stage");
assert.match(css, /body\.tunnel-interior #branchDinoMeadow\{display:none!important\}/,
  "dino meadow must stay hidden inside tunnels");
assert.match(css, /body\.branch-raster #horizon\{[^}]*width:100%;[^}]*background-repeat:repeat-x/s,
  "branch horizon must override the generic 170vw no-repeat layer with a 100% repeat strip");
assert.match(css, /#world\{[^}]*z-index:3(?:;|})/s, "world must remain on z3 so branch decor can share its scenery plane");
assert.match(css, /#cars\{[^}]*z-index:7(?:;|})/s, "passenger cars must remain on z7 above branch scenery");
assert.match(css, /#fgT\{[^}]*z-index:8(?:;|})/s, "foreground must remain on z8 above branch decor and world scenery");

const applySkin = extractFunction(game, "applySkin");
const chooseTunnelBranch = extractFunction(game, "chooseTunnelBranch");
const buildWorld = extractFunction(game, "buildWorld");
const render = extractFunction(game, "render");
const renderBranchStagePolish = extractFunction(game, "renderBranchStagePolish");
assert.ok(applySkin.includes("preloadBranchRasterStage(st);"), "applySkin must preload only its current selected stage");
assert.ok(chooseTunnelBranch.includes("preloadBranchRasterStage(target);"), "confirmed branch target must be preloaded");
assert.equal((game.match(/preloadBranchRasterStage\(/g) || []).length, 3,
  "branch preloading must have only the declaration, current-stage call and confirmed-target call");
assert.ok(applySkin.includes("preloadBranchStagePolish(st);") && chooseTunnelBranch.includes("preloadBranchStagePolish(target);"),
  "current and confirmed branch stages must preload their optional polish assets");
assert.equal((game.match(/preloadBranchStagePolish\(/g) || []).length, 3,
  "polish preloading must have only the declaration, current-stage call and confirmed-target call");
assert.ok(buildWorld.includes('for(let k=0;k<((st.mechanic==="spaceChase"||st.mechanic==="seaBoss")?0:2);k++){\n   if(isBranchRasterStage(st))continue;'),
  "branch stages must skip generic per-station decor at the start of the existing decor loop");
assert.ok(render.includes('branchStageId==="dino"?.035:.095'), "branch horizon must keep the Dino far-depth override");
assert.ok(render.includes('branchStageId==="fire"?.17:(branchStageId==="dino"?.18:.25)'), "branch mid depth overrides must remain explicit");
assert.ok(render.includes('groundT.style.backgroundPositionX=branchRasterStage?cssXFromVw(-(worldX-o)):'), "branch ground parallax must be 1.0 stage-relative");
assert.ok(render.includes('branchStageId==="fire"?.62:(branchStageId==="fantasy"?.42:1)'), "fire/fantasy decor parallax overrides must remain explicit");
assert.ok(render.includes('branchStageId==="fire"?BRANCH_FIRE_MAGMA_PARALLAX:(branchStageId==="dino"?1.18:1.35)'), "foreground depth ladder must remain explicit");
assert.ok(game.includes("const BRANCH_DINO_MEADOW_PARALLAX=.10;") &&
  renderBranchStagePolish.includes('branchDinoMeadow.style.backgroundPositionX=cssXFromVw(-localWorldX*BRANCH_DINO_MEADOW_PARALLAX)'),
  "dino meadow must retain its stage-relative far parallax");
assert.ok(render.indexOf("if(branchRasterStage){") < render.indexOf("const hd=clamp((worldX-o)*0.095,0,70);"),
  "branch horizon handling must precede the generic clamped horizon fallback");

const preloadStart = game.indexOf("const BRANCH_RASTER_STAGE_IDS=");
const preloadEnd = game.indexOf("\nfunction stageIndexById", preloadStart);
assert.ok(preloadStart >= 0 && preloadEnd > preloadStart, "branch raster preload contract missing");
const preloadSource = game.slice(preloadStart, preloadEnd);
const constructed = [];
class FakeImage {
  constructor() { constructed.push(this); }
  set src(value) { this._src = value; }
  get src() { return this._src; }
}
const preloadContext = { Image: FakeImage, Set, Map, Object };
vm.runInNewContext(`${preloadSource}\nthis.preloadRaster=preloadBranchRasterStage;this.preloadPolish=preloadBranchStagePolish;` +
  "this.rasterCache=branchRasterImageCache;this.polishCache=branchStagePolishImageCache;", preloadContext, { timeout: 1000 });
const selectedAssets = Object.fromEntries(LAYER_KEYS.map(key => [key, expectedAsset("snow", key)]));
preloadContext.preloadRaster({ id: "snow", assets: selectedAssets });
assert.equal(constructed.length, 6, "one selected branch stage must construct exactly six Image preloaders");
assert.equal(preloadContext.rasterCache.size, 6, "one selected branch stage must cache exactly six URLs");
preloadContext.preloadRaster({ id: "snow", assets: selectedAssets });
assert.equal(constructed.length, 6, "preloading the same selected stage must be deduplicated");

const fireAssets = Object.fromEntries(["sky", "mid", "ground", "fg"].map(key => [key, expectedAsset("fire", key)]));
preloadContext.preloadRaster({ id: "fire", assets: fireAssets });
assert.deepEqual(constructed.slice(6).map(image => image.src), Object.values(fireAssets),
  "Fire raster preload must contain only sky, new woodland mid, track and magma foreground");
assert.equal(preloadContext.rasterCache.size, 10, "Fire must add exactly four optional-aware raster preloaders");
preloadContext.preloadPolish({ id: "fire" });
assert.deepEqual(constructed.slice(10).map(image => image.src), [
  WORLD_COHERENCE_ASSETS["fire.volcano"],
  "../assets/images/nazonazo-tunnel/effect_fire_flame_particle_a_depthfix_20260721.webp",
  "../assets/images/nazonazo-tunnel/effect_fire_ember_particle_depthfix_20260721.webp"
], "Fire polish preload must add the single distant volcano and two effect assets");
assert.equal(preloadContext.polishCache.size, 3, "Fire must add exactly three polish preloaders");

const dinoKeys = ["sky", "horizon", "mid", "ground", "fg", "meadow"];
const dinoAssets = Object.fromEntries(dinoKeys.map(key => [key, expectedAsset("dino", key)]));
preloadContext.preloadRaster({ id: "dino", assets: dinoAssets });
assert.deepEqual(constructed.slice(13, 19).map(image => image.src), Object.values(dinoAssets),
  "Dino raster preload must include the meadow but no retired decor strip");
assert.equal(preloadContext.rasterCache.size, 16, "Dino must add exactly six raster preloaders");
preloadContext.preloadPolish({ id: "dino" });
const dinoWorldfixUrls = Object.entries(WORLD_COHERENCE_ASSETS)
  .filter(([qualifiedKey]) => qualifiedKey.startsWith("dino."))
  .map(([, url]) => url);
assert.deepEqual(constructed.slice(19).map(image => image.src), dinoWorldfixUrls,
  "Dino polish preload must contain the six worldfix scenes and one fern nest");
assert.equal(preloadContext.polishCache.size, 10, "Fire and Dino must cache exactly ten polish URLs");

preloadContext.preloadRaster({ id: "fire", assets: fireAssets });
preloadContext.preloadPolish({ id: "fire" });
preloadContext.preloadRaster({ id: "dino", assets: dinoAssets });
preloadContext.preloadPolish({ id: "dino" });
assert.equal(constructed.length, 26, "Fire/Dino raster and polish preloads must remain deduplicated");
preloadContext.preloadRaster({ id: "town", assets: selectedAssets });
preloadContext.preloadPolish({ id: "town" });
assert.equal(constructed.length, 26, "a non-branch stage must not preload branch assets");

assert.match(applySkin, /classList\.toggle\("branch-raster",branchRaster\)/, "branch-raster body class toggle missing");
assert.match(applySkin, /classList\.toggle\("branch-night",branchRaster&&loop%2===1\)/, "branch-night must only mark the second loop");
assert.match(applySkin, /horizon\.style\.backgroundImage=st\.id==="fire"\?"none":\(st\.assets&&st\.assets\.horizon\?bgUrl\(st\.assets\.horizon\):st\.horizon\(P,NP\)\)/,
  "Fire must use its single polish volcano instead of the retired repeating horizon");
assert.match(applySkin, /branchDecorT\.style\.backgroundImage=branchRaster&&st\.id!=="fire"&&st\.id!=="dino"&&st\.assets&&st\.assets\.decor\?bgUrl\(st\.assets\.decor\):"none"/,
  "applySkin must set active decor strips once and explicitly retire Fire/Dino decor");
assert.match(applySkin, /branchDinoMeadow\.style\.backgroundImage=st\.id==="dino"&&st\.assets&&st\.assets\.meadow\?bgUrl\(st\.assets\.meadow\):"none"/,
  "applySkin must wire the optional meadow only for Dino");
assert.match(applySkin, /if\(st\.id==="fire"\)fgT\.dataset\.layerRole="fire-magma";else delete fgT\.dataset\.layerRole/,
  "Fire foreground must retain its magma terrain role");
const nightRuleAt = css.indexOf("body.branch-raster.branch-night:not(.tunnel-interior) #skyA");
const nightRuleEnd = css.indexOf("}", nightRuleAt);
assert.ok(nightRuleAt >= 0 && nightRuleEnd > nightRuleAt, "branch night filter rule missing");
const nightRule = css.slice(nightRuleAt, nightRuleEnd + 1);
["#skyA", "#horizon", "#midT", "#groundT", "#branchDecorT", "#fgT"].forEach(selector =>
  assert.ok(nightRule.includes(selector), `${selector}: missing from branch night filter`));
["#skyB", "#scene", "#world", "#veh", "#cars", "#hud", "#quiz"].forEach(selector =>
  assert.ok(!nightRule.includes(selector), `${selector}: must not be filtered by branch night styling`));
const NIGHT_FILTER_LAYER_SELECTORS = new Set(["#skyA", "#horizon", "#midT", "#groundT", "#branchDecorT", "#fgT"]);
const NIGHT_FILTER_POLISH_SELECTORS = new Set([
  "body.branch-night.st-fire:not(.tunnel-interior) .branch-fire-crater-glow",
  "body.branch-night.st-fire:not(.tunnel-interior) .branch-fire-volcano-art",
  "body.branch-night.st-dino:not(.tunnel-interior) .branch-dino-far-herd img",
  "body.branch-night.st-dino:not(.tunnel-interior) .branch-world-life img",
  "body.branch-night.st-cat:not(.tunnel-interior) .branch-world-life img"
]);
const seenNightPolishSelectors = new Set();
for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selectors = match[1];
  const declarations = match[2];
  if (!selectors.includes("branch-night") || !/(?:^|;)\s*filter\s*:/.test(declarations)) continue;
  selectors.split(",").map(selector => selector.trim()).filter(selector => selector.includes("branch-night")).forEach(selector => {
    const target = selector.match(/(#[A-Za-z][\w-]*)$/)?.[1] || "";
    if (target) {
      assert.ok(NIGHT_FILTER_LAYER_SELECTORS.has(target),
        `${selector}: every id-targeted branch-night filter must end at one of the six background layers`);
      return;
    }
    assert.ok(NIGHT_FILTER_POLISH_SELECTORS.has(selector), `${selector}: unreviewed branch-night polish filter selector`);
    seenNightPolishSelectors.add(selector);
  });
}
assert.deepEqual([...seenNightPolishSelectors].sort(), [...NIGHT_FILTER_POLISH_SELECTORS].sort(),
  "all five reviewed Fire/Dino/Cat night polish filters must remain explicit");
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*body\.branch-raster #branchDecorT[\s\S]*transition:none!important/,
  "reduced motion must disable branch layer filter transitions");

const styleToken = html.match(/styles\.css\?v=([^"']+)/);
const gameToken = html.match(/js\/game\.js\?v=([^"']+)/);
assert.ok(styleToken && gameToken, "nazonazo stylesheet and game cache tokens must exist");
assert.equal(styleToken[1], gameToken[1], "nazonazo stylesheet and game cache tokens must match");
assert.equal(styleToken[1], "20260721-1409", "nazonazo branch depth cache token drifted");
assert.match(sw, /const CACHE_VERSION = 2316;/, "service worker cache version must be 2316");
assert.doesNotMatch(sw, /branch_(?:snow|fire|dino|toy|cat|fantasy|sky|ruins)_(?:sky|horizon|mid|ground|foreground|decor)/,
  "branch raster images must stay out of service-worker precache lists");

console.log("nazonazo branch background assets regression: PASS (8 stages, 45 active WebP layers + dino meadow)");
