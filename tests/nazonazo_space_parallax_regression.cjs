#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const html = read("nazonazo-tunnel/index.html");
const css = read("nazonazo-tunnel/styles.css");
const game = read("nazonazo-tunnel/js/game.js");

function extractBalanced(source, start, openChar = "{", closeChar = "}") {
  const open = source.indexOf(openChar, start);
  assert.notEqual(open, -1, `opening ${openChar} missing after offset ${start}`);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
  }
  assert.fail(`unclosed ${openChar}${closeChar} block after offset ${start}`);
}

function extractFunction(source, name) {
  const match = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(source);
  assert.ok(match, `${name}: function missing`);
  return source.slice(match.index, source.indexOf("{", match.index)) +
    extractBalanced(source, match.index);
}

function extractObject(source, declaration) {
  const match = new RegExp(`const\\s+${declaration}\\s*=`).exec(source);
  assert.ok(match, `${declaration}: declaration missing`);
  return extractBalanced(source, match.index);
}

function cssRule(selectorPattern) {
  const match = new RegExp(`${selectorPattern}\\s*\\{([^}]+)\\}`).exec(css);
  assert.ok(match, `CSS rule missing: ${selectorPattern}`);
  return match[1];
}

function loopTileCount(id) {
  const block = new RegExp(`id="${id}"[\\s\\S]*?<\\/div>`).exec(html)?.[0] || "";
  return (block.match(/class="space-loop-tile"/g) || []).length;
}

// Dedicated space layers must exist independently of the legacy generic parallax stack.
for (const id of ["spaceStarFar", "spaceStarMid", "spaceStarNear"]) {
  assert.match(html, new RegExp(`id="${id}"[^>]*class="space-star-layer`), `${id}: particle plane missing`);
}
assert.equal(loopTileCount("spaceHorizonLoop"), 4, "planet loop needs two mirrored periods plus coverage");
assert.equal(loopTileCount("spaceForegroundLoop"), 8, "near asteroid loop needs enough short-height coverage");
assert.match(html, /id="spaceGravityLayer"[^>]*role="group"[^>]*aria-labelledby="qText"[^>]*hidden/);

const assetNames = {
  sky: "space_nebula_sky_back_20260713.webp",
  horizon: "space_planets_cutout_loop_20260713.png",
  fg: "space_asteroids_cutout_loop_20260713.png",
  station: "space_constellation_checkpoint_20260713.png"
};
const rocketAsset = "space_vehicle_exploration_rocket_pono_20260713.png";
const spaceAssets = extractObject(game, "ASSETS").match(/space\s*:\s*\{[\s\S]*?\n\s*\}/)?.[0] || "";
assert.ok(spaceAssets, "ASSETS.space missing");
for (const [key, file] of Object.entries(assetNames)) {
  assert.match(spaceAssets, new RegExp(`${key}:"\\.\\.\\/assets\\/images\\/nazonazo-tunnel\\/${file.replace(/\./g, "\\.")}"`), `ASSETS.space.${key} is not assigned to ${file}`);
}
assert.match(game, /\{id:"space",icon:"🌌",veh:"rocket",bank:SPACE,gens:\[\],[\s\S]{0,120}assets:ASSETS\.space/, "space stage must consume ASSETS.space");

// Sparse space assets intentionally omit mid/ground. Every optional lookup must be guarded,
// otherwise the browser requests a literal `undefined` URL during a stage switch.
const applySkin = extractFunction(game, "applySkin");
for (const key of ["sky", "horizon", "mid", "ground", "fg"]) {
  assert.match(applySkin, new RegExp(`st\\.assets&&st\\.assets\\.${key}\\?bgUrl\\(st\\.assets\\.${key}\\)`), `applySkin must guard optional ${key} before bgUrl()`);
}
assert.doesNotMatch([html, css, game].join("\n"), /url\(["']?undefined["']?\)/i, "literal undefined asset URL is forbidden");

// A generated orbital station replaces the old floating mountain checkpoint.
const buildWorld = extractFunction(game, "buildWorld");
assert.match(buildWorld, /const stationStage=hasStationArt\(st\)/);
assert.match(buildWorld, /stationStage\s*\?\s*'<div class="station-art"/);
assert.match(buildWorld, /t\.classList\.add\("station",st\.id\+"-station"\)/);
assert.match(buildWorld, /for\(let k=0;k<\(st\.id==="space"\?0:2\);k\+\+\)/, "legacy procedural space decor must not be generated");
assert.match(css, /body\.st-space \.tun\.station\.space-station\{[^}]*aspect-ratio:2172\/724/);
assert.match(css, /body\.st-space \.tun\.station\.space-station\.open \.station-art\{/);
assert.match(css, new RegExp(`body\\.st-space\\.v-rocket \\.rk-body\\{[^}]*${rocketAsset.replace(/\./g, "\\.")}`), "space must replace the procedural tube with the generated exploration rocket");
assert.match(css, /body\.st-space\.v-rocket \.rk-nose[^}]*display:none!important/, "legacy procedural rocket pieces must not remain over the generated craft");

// Fixed, seeded star pools provide three particle depths and do not allocate in render().
const profilesSource = extractObject(game, "SPACE_STAR_PROFILES");
const profileSandbox = {};
vm.createContext(profileSandbox);
vm.runInContext(`this.profiles=${profilesSource}`, profileSandbox);
const profiles = profileSandbox.profiles;
assert.deepEqual(
  Object.fromEntries(Object.entries(profiles).map(([name, value]) => [name, value.depth])),
  { far: 0.04, mid: 0.24, near: 0.48 }
);
for (const [name, profile] of Object.entries(profiles)) {
  assert.ok(profile.count > 0, `${name}: desktop star pool is empty`);
  assert.ok(profile.iosCount > 0 && profile.iosCount <= profile.count, `${name}: invalid iOS pool size`);
  assert.ok(profile.reducedCount > 0 && profile.reducedCount <= profile.iosCount, `${name}: invalid reduced-motion pool size`);
}
const buildSpaceStars = extractFunction(game, "buildSpaceStars");
assert.match(buildSpaceStars, /replaceChildren\(\)/, "stage changes must clear the previous fixed pool");
assert.match(buildSpaceStars, /mulberry32\(\(profile\.seed\+loop\*97\)>>>0\)/, "star placement must be stable for a journey loop");
assert.match(buildSpaceStars, /document\.createElement\("span"\)/);
const renderSpaceStars = extractFunction(game, "renderSpaceStars");
assert.doesNotMatch(renderSpaceStars, /createElement|appendChild/, "renderSpaceStars must not allocate particles per frame");
assert.match(renderSpaceStars, /worldX-origin\(stg\)/, "particle movement must reset at the space-stage origin");
assert.match(renderSpaceStars, /%period\+period\)%period/, "particle positions must wrap in both directions");
assert.match(renderSpaceStars, /tunnelInteriorMode\)return/, "particle JS updates must pause inside the tunnel");

// Multi-parallax order: static nebula, far stars, planets, middle stars, near stars,
// asteroids, then 1x stations/world. Keep these exact ratios to preserve readable depth.
assert.match(game, /SPACE_PLANET_PARALLAX=\.12,SPACE_FOREGROUND_PARALLAX=\.66/);
const speedOrder = [0, profiles.far.depth, 0.12, profiles.mid.depth, profiles.near.depth, 0.66, 1];
assert.deepEqual(speedOrder, [0, 0.04, 0.12, 0.24, 0.48, 0.66, 1]);
assert.ok(speedOrder.every((value, index) => index === 0 || speedOrder[index - 1] < value), "space parallax speeds must increase monotonically toward the camera");

const render = extractFunction(game, "render");
assert.match(render, /world\.style\.transform="translate3d\("\+cssXFromVw\(-worldX\)/, "stations/world must remain at 1x travel speed");
assert.match(render, /st-space[\s\S]{0,500}SPACE_PLANET_PARALLAX/);
assert.match(render, /spaceStage&&spaceForegroundLoop[\s\S]{0,500}SPACE_FOREGROUND_PARALLAX/);
for (const speedName of ["SPACE_PLANET_PARALLAX", "SPACE_FOREGROUND_PARALLAX"]) {
  assert.match(render, new RegExp(`\\(worldX-o\\)\\*${speedName}`), `${speedName} must use stage-relative distance`);
}
const spaceLoopBranches = [
  render.match(/st-space[\s\S]{0,700}spaceHorizonLoop/)?.[0] || "",
  render.match(/spaceStage&&spaceForegroundLoop[\s\S]{0,700}spaceForegroundLoop\.style\.transform/)?.[0] || ""
];
for (const branch of spaceLoopBranches) {
  assert.ok(branch, "space loop render branch missing");
  assert.match(branch, /const period=tileWidth\*2/);
  assert.match(branch, /%period\+period\)%period/, "space strips must use positive modulo wrapping");
  assert.doesNotMatch(branch, /clamp\([^)]*,0,70\)/, "space strips must never inherit the old 70vw stop");
}
assert.doesNotMatch(render, /skyA\.style\.backgroundPosition/, "the generated nebula is the static 0x layer");

// Space has no physical ground. All scenery and particle loops disappear in the tunnel.
assert.match(cssRule("body\\.st-space #groundT"), /display\s*:\s*none/);
assert.match(css, /body\.st-space #midT,body\.st-space #groundT,body\.st-space #fgT\{background:none!important\}/);
assert.match(css, /\.space-loop-tile:nth-child\(even\)::before\{transform:scaleX\(-1\)\}/);
assert.match(css, /body\.tunnel-interior \.space-loop-strip,body\.tunnel-interior \.space-star-layer\{display:none!important\}/);
assert.match(css, /body\.st-space:not\(\.tunnel-interior\) \.space-star-layer\{display:block\}/);

const generatedAssets = [
  { file: assetNames.sky, width: 1983, height: 793, alpha: false },
  { file: assetNames.horizon, width: 2172, height: 724, alpha: true, minTransparent: 0.90, minOpaqueSubject: 0.90 },
  { file: assetNames.fg, width: 2172, height: 724, alpha: true, minTransparent: 0.84, minOpaqueSubject: 0.80 },
  { file: assetNames.station, width: 2172, height: 724, alpha: true, minTransparent: 0.70, minOpaqueSubject: 0.90 },
  { file: rocketAsset, width: 1536, height: 1024, alpha: true, minTransparent: 0.65, minOpaqueSubject: 0.98 }
];

(async () => {
  for (const expected of generatedAssets) {
    const absolute = path.join(root, "assets/images/nazonazo-tunnel", expected.file);
    assert.ok(fs.existsSync(absolute), `${expected.file}: generated asset missing`);
    assert.ok(fs.statSync(absolute).size < 3 * 1024 * 1024, `${expected.file}: exceeds the repository 3MB limit`);
    const image = sharp(absolute);
    const metadata = await image.metadata();
    assert.equal(metadata.width, expected.width, `${expected.file}: unexpected width`);
    assert.equal(metadata.height, expected.height, `${expected.file}: unexpected height`);
    if (!expected.alpha) {
      assert.equal(metadata.channels, 3, `${expected.file}: opaque nebula should not carry an unnecessary alpha plane`);
      continue;
    }
    assert.equal(path.extname(expected.file), ".png", `${expected.file}: alpha cutouts must remain PNG to prevent transparent-edge WebP artifacts`);
    assert.equal(metadata.channels, 4, `${expected.file}: alpha channel required`);
    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0;
    let opaque = 0;
    let partial = 0;
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] === 0) transparent += 1;
      else if (data[index] === 255) opaque += 1;
      else partial += 1;
    }
    const pixels = info.width * info.height;
    assert.ok(transparent / pixels >= expected.minTransparent, `${expected.file}: transparent safe area was lost`);
    assert.ok(opaque / (opaque + partial) >= expected.minOpaqueSubject, `${expected.file}: painted subject became too translucent`);
  }
  console.log("nazonazo space parallax regression: PASS");
})().catch(error => {
  console.error(error);
  process.exit(1);
});
