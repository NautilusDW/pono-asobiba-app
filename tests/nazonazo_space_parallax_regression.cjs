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

assert.match(html, /styles\.css\?v=20260721-1385/);
assert.match(html, /js\/game\.js\?v=20260721-1385/);

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

function extractFirstFunction(source, names) {
  const name = names.find(candidate => new RegExp(`function\\s+${candidate}\\s*\\(`).test(source));
  assert.ok(name, `expected one function: ${names.join(", ")}`);
  return extractFunction(source, name);
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
assert.match(html, /id="spaceGalaxyLayer"[^>]*role="group"[^>]*aria-labelledby="qText"[^>]*hidden/);

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
assert.match(game, /\{id:"space",icon:"🌌",art:"stageSpace",veh:"rocket",bank:SPACE,gens:\[\],[\s\S]{0,160}assets:ASSETS\.space/, "space stage must consume ASSETS.space");

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
// mechanic-based (not id-based) so this also covers space2, the Phase1 hidden hub stage that
// shares space's spaceChase mechanic and must keep the same 0-decor convention.
assert.match(buildWorld, /for\(let k=0;k<\(\(st\.mechanic==="spaceChase"(?:\|\|st\.mechanic==="seaBoss")?\)\?0:2\);k\+\+\)/,
  "legacy procedural space decor must not be generated");
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

/* The generated rocket can be steered in both axes during forced scrolling. */
assert.match(html, /id="spaceSteerSurface"[^>]*aria-hidden="true"/);
assert.match(html, /id="spaceSteerHint"[^>]*role="status"[^>]*aria-live="polite"[^>]*hidden/);
const steerSurfaceRule = cssRule("#spaceSteerSurface");
assert.match(steerSurfaceRule, /position:absolute/);
assert.match(steerSurfaceRule, /inset:0/);
assert.match(steerSurfaceRule, /touch-action:none/);
assert.match(css, /body\.st-space\.space-steer-active[^{]*#spaceSteerSurface[^{]*\{[^}]*pointer-events:auto/);
assert.match(css, /body\.st-space \.vehicle-steer-shell\{[^}]*translate3d\(var\(--space-steer-x,0px\),var\(--space-steer-y,0px\),0\)/,
  "space steering must move the visible rocket in X and Y");
assert.match(game, /const spaceMoveKeys=new Set\(\);/);

const controlAvailable = extractFunction(game, "spaceControlAvailable");
assert.match(controlAvailable, /isSpaceStage\(\)/);
assert.match(controlAvailable, /playing/);
assert.match(controlAvailable, /driving/,
  "rocket steering must remain available during forced scrolling");
assert.match(controlAvailable, /!quiz\.classList\.contains\("show"\)/,
  "station repair must suspend route steering");
assert.match(controlAvailable, /spaceLandscapePlayable\(\)/,
  "the portrait rotate hint must suspend route input");
assert.doesNotMatch(controlAvailable, /space-repair-active|spaceGalaxyPlayable/,
  "repair controls and route steering must not compete for the same pointer");
assert.match(controlAvailable, /tunnelInteriorMode/);
assert.match(controlAvailable, /tunnel-enter-run/);
assert.match(controlAvailable, /tunnel-exit-run/);

const steerBounds = extractFunction(game, "spaceSteerBounds");
assert.match(steerBounds, /viewportWidth/);
assert.match(steerBounds, /viewportHeight/);
assert.match(steerBounds, /veh\.(?:offsetWidth|getBoundingClientRect)/);
assert.match(steerBounds, /hudBottom|scoreHud/,
  "vertical steering bounds must leave the score HUD clear");
for (const key of ["minX", "maxX", "minY", "maxY"]) assert.match(steerBounds, new RegExp(key));

const setTarget = extractFunction(game, "setSpaceSteerTarget");
assert.match(setTarget, /clamp\([^\n]+bounds\.minX,bounds\.maxX\)/);
assert.match(setTarget, /clamp\([^\n]+bounds\.minY,bounds\.maxY\)/);
const nudgeTarget = extractFunction(game, "nudgeSpaceSteerTarget");
assert.match(nudgeTarget, /spaceSteerTargetX\+dx/);
assert.match(nudgeTarget, /spaceSteerTargetY\+dy/);
assert.match(nudgeTarget, /bounds\.minX,bounds\.maxX/);
assert.match(nudgeTarget, /bounds\.minY,bounds\.maxY/);

const renderSteering = extractFunction(game, "renderSpaceSteering");
assert.match(renderSteering, /spaceControlAvailable\(\)/);
assert.match(renderSteering, /updateSpaceKeyboardMovement\(dt\)/);
assert.match(renderSteering, /clampSpaceSteerOffsets\(\)/);
assert.match(renderSteering, /spaceSteerX\+=\(spaceSteerTargetX-spaceSteerX\)/);
assert.match(renderSteering, /spaceSteerY\+=\(spaceSteerTargetY-spaceSteerY\)/);
assert.match(renderSteering, /applySpaceSteerVisual\(\)/);
assert.match(renderSteering, /if\(spaceStationSteerResume\|\|quiz\.classList\.contains\("show"\)\)\{applySpaceSteerVisual\(\);return;\}/,
  "the station pose must stay frozen from quiz opening until the next departure");
assert.match(render, /renderSpaceSteering\(\)/,
  "the main animation loop must update rocket steering every frame");

const captureStationPose = extractFunction(game, "captureSpaceStationSteerPosition");
const restoreStationPose = extractFunction(game, "restoreSpaceStationSteerPosition");
const poseSandbox = {
  spaceSteerX: 137,
  spaceSteerY: -43,
  spaceSteerTargetX: 188,
  spaceSteerTargetY: -18,
  spaceStationSteerResume: null,
  qSeg: 2,
  stg: 5,
  loop: 0,
  vehicleSteerShell: {},
  window: { innerWidth: 844, innerHeight: 390 },
  currentBounds: { minX: -180, maxX: 240, minY: -90, maxY: 110 },
  isSpaceStage: () => true,
  spaceSteerBounds() { return poseSandbox.currentBounds; },
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  applySpaceSteerVisual() { poseSandbox.visualWrites += 1; },
  visualWrites: 0,
  Math
};
vm.createContext(poseSandbox);
vm.runInContext(`${captureStationPose}\n${restoreStationPose}\nthis.capture=captureSpaceStationSteerPosition;this.restore=restoreSpaceStationSteerPosition;`, poseSandbox);
assert.equal(poseSandbox.capture(), true);
poseSandbox.spaceSteerX = poseSandbox.spaceSteerY = poseSandbox.spaceSteerTargetX = poseSandbox.spaceSteerTargetY = 0;
assert.equal(poseSandbox.restore(), true);
assert.deepEqual(
  [poseSandbox.spaceSteerX, poseSandbox.spaceSteerTargetX, poseSandbox.spaceSteerY, poseSandbox.spaceSteerTargetY],
  [137, 137, -43, -43],
  "same-size station departure must resume at the exact visible arrival position without target drift"
);
assert.equal(poseSandbox.visualWrites, 1, "restoring must paint the saved pose immediately");
poseSandbox.spaceSteerX = 30; poseSandbox.spaceSteerY = 10;
poseSandbox.window.innerWidth = 844; poseSandbox.window.innerHeight = 390;
poseSandbox.currentBounds = { minX: -100, maxX: 300, minY: -50, maxY: 150 };
poseSandbox.capture();
poseSandbox.window.innerWidth = 1024; poseSandbox.window.innerHeight = 768;
poseSandbox.currentBounds = { minX: -200, maxX: 600, minY: -120, maxY: 280 };
poseSandbox.restore();
assert.ok(Math.abs(poseSandbox.spaceSteerX - 60) < 1e-9 && Math.abs(poseSandbox.spaceSteerY - 0) < 1e-9,
  "a resize during repair must preserve the normalized arrival position in the new route bounds");
const showQuiz = extractFunction(game, "showQuiz");
assert.ok(showQuiz.indexOf("captureSpaceStationSteerPosition()") < showQuiz.indexOf('quiz.classList.add("show")'),
  "the arrival pose must be captured before the repair bar changes the available geometry");
const pick = extractFunction(game, "onPick");
assert.doesNotMatch(pick, /restoreSpaceStationSteerPosition/,
  "answer feedback must retain the normalized pose until actual departure");
const proceed = extractFunction(game, "proceed");
assert.ok(proceed.indexOf("restoreSpaceStationSteerPosition()") < proceed.indexOf("qSeg++"),
  "the saved pose must restore immediately before departure, including the final station");
assert.match(game, /resize",\(\)=>\{spaceChaseState\.frameAt=0;cancelSpaceChaseRescuePointer\(true\);invalidateSpaceObstacleLayout\(\);updateSpaceRepairVisual\(\);updateSpaceChaseVisual\(\);if\(!spaceStationSteerResume&&!quiz\.classList\.contains\("show"\)\)clampSpaceSteerOffsets\(\);\}/,
  "resize must not clamp the saved pose during repair or answer feedback");
poseSandbox.spaceSteerX = 20; poseSandbox.spaceSteerY = -10;
poseSandbox.window.innerWidth = 844; poseSandbox.window.innerHeight = 390;
poseSandbox.currentBounds = { minX: -100, maxX: 300, minY: -50, maxY: 150 };
poseSandbox.capture();
poseSandbox.qSeg = 3;
assert.equal(poseSandbox.restore(), false, "a stale pose from another station must never be applied");
assert.equal(poseSandbox.spaceStationSteerResume, null);
poseSandbox.qSeg = 2;

const pointerDown = extractFirstFunction(game, ["handleSpaceSteerPointerDown", "handleSpacePointerDown"]);
assert.match(pointerDown, /spaceControlAvailable\(\)/);
assert.match(pointerDown, /setSpaceSteerTarget\(ev\.clientX,ev\.clientY/);
const pointerMove = extractFirstFunction(game, ["handleSpaceSteerPointerMove", "handleSpacePointerMove"]);
assert.match(pointerMove, /setSpaceSteerTarget\(ev\.clientX,ev\.clientY/);
const keyDown = extractFirstFunction(game, ["handleSpaceSteerKeyDown", "handleSpaceKeyDown"]);
assert.match(keyDown, /defaultPrevented/,
  "answer focus and engine winding keys must not also steer the rocket");
for (const token of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS"]) {
  assert.match(keyDown, new RegExp(token), `space steering keyboard path is missing ${token}`);
}
assert.match(keyDown, /spaceMoveKeys\.add/);
const keyUp = extractFirstFunction(game, ["handleSpaceSteerKeyUp", "handleSpaceKeyUp"]);
assert.match(keyUp, /spaceMoveKeys\.delete/);

const resetSteering = extractFunction(game, "resetSpaceSteering");
assert.match(resetSteering, /spaceMoveKeys\.clear\(\)/);
assert.match(resetSteering, /spaceSteerTargetX=0/);
assert.match(resetSteering, /spaceSteerTargetY=0/);
assert.match(resetSteering, /spaceStationSteerResume=null/);
assert.match(resetSteering, /--space-steer-x","0px"/);
assert.match(resetSteering, /--space-steer-y","0px"/);
assert.match(extractFunction(game, "startJourneyAt"), /resetSpaceSteering\(\)/);
assert.match(extractFunction(game, "ending"), /resetSpaceSteering\(\)/);
assert.match(extractFunction(game, "openMap"), /resetSpaceSteering\(\)/);

/* Three to twelve deterministic gates grow into a smooth, forgiving road. */
assert.match(game, /layer\.id="spaceObstacleLayer"/);
assert.match(game, /const SPACE_OBSTACLE_MAX_GATES=12;/);
assert.match(game, /const SPACE_OBSTACLE_COUNT_TABLE=\[\[3,4,6,8,10\],\[3,5,7,9,11\],\[4,6,8,10,12\]\];/);
assert.match(game, /const SPACE_OBSTACLE_DEPARTURE_GRACE_PROGRESS=\.14;/);
assert.match(game, /for\(let gateIndex=0;gateIndex<SPACE_OBSTACLE_MAX_GATES;gateIndex\+\+\)/);
assert.match(game, /gate\.className="space-obstacle-gate"/);
assert.match(game, /\["top","bottom"\]\.forEach/);
assert.match(game, /bank\.className="space-obstacle-bank is-"\+side/);
assert.match(game, /for\(let index=0;index<6;index\+\+\)bank\.appendChild/,
  "all twenty-four banks and 144 asteroid nodes must be pooled at startup rather than allocated per frame");
assert.match(cssRule("#spaceObstacleLayer"), /position:absolute/);
assert.match(cssRule("#spaceObstacleLayer"), /pointer-events:none/);
assert.match(css, /#spaceObstacleLayer\[hidden\]\{display:none!important\}/);
const gateRule = cssRule("\\.space-obstacle-gate");
assert.match(gateRule, /width:var\(--space-obstacle-width,112px\)/,
  "each composited wrapper must stay a narrow gate strip instead of a full-screen layer");
assert.match(gateRule, /transform:translate3d\(var\(--space-obstacle-x,110vw\),0,0\)/);
assert.doesNotMatch(gateRule, /inset:0/,
  "full-screen moving wrappers would waste too much iPad compositor memory");
assert.match(css, /\.space-obstacle-gate\[hidden\]\{display:none!important\}/);
assert.doesNotMatch(cssRule("\\.space-obstacle-bank"), /will-change/,
  "static bank heights must not reserve twelve extra compositor resources");
assert.match(css, /\.space-obstacle-bank\.is-top\{[^}]*height:var\(--space-obstacle-gap-top/);
assert.match(css, /\.space-obstacle-bank\.is-bottom\{[^}]*top:var\(--space-obstacle-gap-bottom/);

const gateCountSource = extractFunction(game, "spaceObstacleGateCount");
const anchorSource = extractFunction(game, "spaceObstacleEncounterAnchors");
const lanePlanSource = extractFunction(game, "spaceObstacleLanePlan");
const nearestLaneSource = extractFunction(game, "spaceObstacleNearestLane");
const obstaclePlanSandbox = {
  SPACE_OBSTACLE_COUNT_TABLE: [[3, 4, 6, 8, 10], [3, 5, 7, 9, 11], [4, 6, 8, 10, 12]],
  SPACE_OBSTACLE_ANCHOR_START: .34,
  SPACE_OBSTACLE_ANCHOR_END: .76,
  SPACE_OBSTACLE_GAP_CENTERS: [.22, .28, .34, .40, .46, .52, .58, .64, .70, .76, .82, .76, .70, .64, .58, .52, .46, .40, .34, .28],
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  Math,
  Number,
  Array
};
vm.createContext(obstaclePlanSandbox);
vm.runInContext(`${gateCountSource}\n${anchorSource}\n${lanePlanSource}\n${nearestLaneSource}\nthis.count=spaceObstacleGateCount;this.anchors=spaceObstacleEncounterAnchors;this.lanes=spaceObstacleLanePlan;this.nearest=spaceObstacleNearestLane;`, obstaclePlanSandbox);
assert.deepEqual(
  [0, 1, 2].map(difficulty => [0, 1, 2, 3, 4].map(segment => obstaclePlanSandbox.count(difficulty, segment))),
  [[3, 4, 6, 8, 10], [3, 5, 7, 9, 11], [4, 6, 8, 10, 12]],
  "each difficulty needs a steadily denser three-to-twelve gate rhythm"
);
for (let difficulty = 0; difficulty < 3; difficulty += 1) {
  for (let segment = 0; segment < 5; segment += 1) {
    const anchors = [...obstaclePlanSandbox.anchors(difficulty, segment)];
    const lanes = [...obstaclePlanSandbox.lanes(difficulty, segment, 0)];
    assert.equal(anchors.length, obstaclePlanSandbox.count(difficulty, segment));
    assert.ok(Math.abs(anchors[0] - .34) < 1e-9 && Math.abs(anchors.at(-1) - .76) < 1e-9,
      `difficulty ${difficulty} segment ${segment}: encounter anchors must span .34 to .76`);
    assert.equal(lanes.length, anchors.length);
    assert.deepEqual(lanes, [...obstaclePlanSandbox.lanes(difficulty, segment, 0)],
      "the same journey must reproduce the same lanes");
    for (let index = 1; index < lanes.length; index += 1) {
      const delta = Math.abs(obstaclePlanSandbox.SPACE_OBSTACLE_GAP_CENTERS[lanes[index]] - obstaclePlanSandbox.SPACE_OBSTACLE_GAP_CENTERS[lanes[index - 1]]);
      assert.ok(delta <= .06 + 1e-9, `lane jump ${delta} is too large for a smooth road`);
    }
  }
}
assert.doesNotMatch(lanePlanSource, /Math\.random|Date\.|performance\./,
  "lane phase and direction must be pure and stable for a segment");
assert.equal(obstaclePlanSandbox.lanes(2, 4, 0, 7)[0], 7,
  "the first road opening must begin at the lane nearest the saved station pose");
assert.equal(obstaclePlanSandbox.nearest(100, 300, 216), 6,
  "nearest-lane selection must map the resumed rocket center to the matching road entrance");

const gapGeometry = extractFunction(game, "spaceObstacleGapGeometry");
const geometrySandbox = {
  SPACE_OBSTACLE_MIN_GAPS: [144, 126, 110],
  SPACE_OBSTACLE_PLAYABLE_RATIOS: [.48, .42, .36],
  SPACE_OBSTACLE_ROCKET_RATIOS: [1.90, 1.65, 1.45],
  SPACE_OBSTACLE_GAP_CENTERS: [.22, .28, .34, .40, .46, .52, .58, .64, .70, .76, .82, .76, .70, .64, .58, .52, .46, .40, .34, .28],
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  Math,
  Number
};
vm.createContext(geometrySandbox);
vm.runInContext(`${gapGeometry};this.gap=spaceObstacleGapGeometry;`, geometrySandbox);
for (const [label, top, bottom, rocketHeight] of [
  ["568x320", 74, 286, 72],
  ["844x390", 78, 350, 78],
  ["1024x768", 94, 720, 112],
  ["1366x768", 94, 720, 116]
]) {
  for (let difficulty = 0; difficulty < 3; difficulty += 1) {
    for (let lane = 0; lane < obstaclePlanSandbox.SPACE_OBSTACLE_GAP_CENTERS.length; lane += 1) {
      const gap = geometrySandbox.gap(top, bottom, rocketHeight, difficulty, lane);
      const playable = bottom - top;
      assert.ok(gap.height >= Math.min(playable - 16, [144, 126, 110][difficulty]) - 0.001,
        `${label} difficulty ${difficulty} lane ${lane}: minimum gap was lost`);
      assert.ok(gap.height <= playable - 16 + 0.001,
        `${label} difficulty ${difficulty} lane ${lane}: gap exceeds playable area`);
      assert.ok(gap.top >= top - 0.001 && gap.bottom <= bottom + 0.001,
        `${label} difficulty ${difficulty} lane ${lane}: gate gap leaves the playable area`);
    }
  }
}
for (const [label, top, bottom, stableRocketHeight, tiltedCollisionHeight] of [
  ["568x320", 54, 310, 133, 153],
  ["844x390", 58, 382, 168.8, 193],
  ["1024x768", 58, 758, 200, 230],
  ["1366x768", 58, 758, 200, 230]
]) {
  let hardMinimumOverlap = Infinity;
  for (let difficulty = 0; difficulty < 3; difficulty += 1) {
    for (let lane = 0; lane < obstaclePlanSandbox.SPACE_OBSTACLE_GAP_CENTERS.length; lane += 1) {
      const nextLane = (lane + 1) % obstaclePlanSandbox.SPACE_OBSTACLE_GAP_CENTERS.length;
      const current = geometrySandbox.gap(top, bottom, stableRocketHeight, difficulty, lane);
      const next = geometrySandbox.gap(top, bottom, stableRocketHeight, difficulty, nextLane);
      const hitboxHalfHeight = tiltedCollisionHeight * .26;
      const currentLow = current.top - 8 + hitboxHalfHeight;
      const currentHigh = current.bottom + 8 - hitboxHalfHeight;
      const nextLow = next.top - 8 + hitboxHalfHeight;
      const nextHigh = next.bottom + 8 - hitboxHalfHeight;
      const sharedSafeCenterRange = Math.min(currentHigh, nextHigh) - Math.max(currentLow, nextLow);
      assert.ok(sharedSafeCenterRange >= -0.001,
        `${label} difficulty ${difficulty} lanes ${lane}/${nextLane}: no reachable transition remains`);
      if (difficulty === 2) hardMinimumOverlap = Math.min(hardMinimumOverlap, sharedSafeCenterRange);
    }
  }
  if (label === "568x320") assert.ok(hardMinimumOverlap >= 80, `${label}: hard route lost its iPad-safe overlap`);
  if (label === "1024x768" || label === "1366x768") assert.ok(hardMinimumOverlap >= 18, `${label}: hard route lost its tilted-rocket overlap`);
}
const laneCenters = obstaclePlanSandbox.SPACE_OBSTACLE_GAP_CENTERS.map((_, lane) => geometrySandbox.gap(80, 580, 96, 2, lane).center);
assert.ok(new Set(laneCenters.map(value => value.toFixed(2))).size >= 8,
  "the longer lane cycle must visibly vary the route instead of repeating one gap");
for (const [label, top, bottom, stableRocketHeight, tiltedCollisionHeight] of [
  ["568x320", 54, 310, 133, 153],
  ["844x390", 58, 382, 168.8, 193],
  ["1024x768", 58, 758, 200, 230],
  ["1366x768", 58, 758, 200, 230]
]) {
  for (const rocketCenter of [top + stableRocketHeight * .5, bottom - stableRocketHeight * .5]) {
    const lane = obstaclePlanSandbox.nearest(top, bottom, rocketCenter);
    const gap = geometrySandbox.gap(top, bottom, stableRocketHeight, 2, lane);
    const hitboxHalfHeight = tiltedCollisionHeight * .26;
    const safeLow = gap.top - 8 + hitboxHalfHeight;
    const safeHigh = gap.bottom + 8 - hitboxHalfHeight;
    assert.ok(rocketCenter >= safeLow - .001 && rocketCenter <= safeHigh + .001,
      `${label}: an extreme saved station pose must fit safely through its first matching lane`);
  }
}

const screenX = extractFunction(game, "spaceObstacleScreenX");
const screenSandbox = { Number };
vm.createContext(screenSandbox);
vm.runInContext(`${screenX};this.x=spaceObstacleScreenX;`, screenSandbox);
for (const width of [568, 844, 1024, 1366]) {
  assert.ok(screenSandbox.x(0, .34, width) >= width,
    `${width}px: the first gate must start fully beyond a maximum-right rocket`);
}
assert.ok(screenSandbox.x(1, .76, 568) + 92 <= -20,
  "the last 92px gate must fully leave a 568px viewport before the station");
const hardRoadAnchors = [...obstaclePlanSandbox.anchors(2, 4)];
for (const [width, height] of [[568, 320], [844, 390], [1024, 768], [1366, 768]]) {
  const gateWidth = Math.max(92, Math.min(138, Math.min(width, height) * .28));
  let maxVisible = 0;
  for (let step = 0; step <= 1000; step += 1) {
    const progress = step / 1000;
    const visible = hardRoadAnchors.filter(anchor => {
      const x = screenSandbox.x(progress, anchor, width);
      return x < width && x + gateWidth > 0;
    }).length;
    maxVisible = Math.max(maxVisible, visible);
  }
  assert.equal(maxVisible, 12, `${width}x${height}: the late route must visually join into one twelve-gate road`);
  const gateSpacing = width * (1.42 / .56) * ((.76 - .34) / 11);
  assert.ok(gateSpacing <= gateWidth + .001, `${width}x${height}: late pillar strips must touch or overlap into a road`);
}
const firstSegmentHardSpacingMs = ((.76 - .34) / (4 - 1)) * 296 / 38 * 1000;
const laterHardSpacingMs = ((.76 - .34) / (12 - 1)) * 430 / 38 * 1000;
assert.ok(firstSegmentHardSpacingMs > 900 && laterHardSpacingMs < 500,
  "early gates need breathing room while late gates intentionally chain inside the forgiving 900ms collision window");

const hitboxSource = extractFunction(game, "spaceObstacleRocketHitbox");
const collisionSource = extractFunction(game, "spaceObstacleCollides");
const collisionSandbox = { SPACE_OBSTACLE_EDGE_INSET: 8, Math };
vm.createContext(collisionSandbox);
vm.runInContext(`${hitboxSource}\n${collisionSource}\nthis.hitbox=spaceObstacleRocketHitbox;this.collides=spaceObstacleCollides;`, collisionSandbox);
assert.deepEqual(
  JSON.parse(JSON.stringify(collisionSandbox.hitbox({ left: 100, top: 50, width: 200, height: 100 }))),
  { left: 144, right: 256, top: 74, bottom: 126 },
  "rocket collision box must inset 22% horizontally and 24% vertically"
);
assert.equal(collisionSandbox.collides({ left: 144, right: 256, top: 85, bottom: 160 }, 180, 100, 90, 170), false);
assert.equal(collisionSandbox.collides({ left: 144, right: 256, top: 70, bottom: 122 }, 180, 100, 90, 170), true,
  "collision starts only after crossing eight pixels inside the visual edge");

const routeActive = extractFunction(game, "spaceObstacleRouteActive");
for (const token of ["!window.__PONO_TIER_LOCKED__", "driving", 'pending==="quiz"', "qSeg<QN", "!tunnelInteriorMode", "spaceLandscapePlayable()", '!quiz.classList.contains("show")']) {
  assert.match(routeActive, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `route collision guard missing: ${token}`);
}
const renderObstacle = extractFunction(game, "renderSpaceObstacleGate");
assert.doesNotMatch(renderObstacle, /createElement|appendChild|replaceChildren|querySelector|Math\.random|Date\./,
  "the animation loop must only move and collide the fixed obstacle pool");
assert.match(renderObstacle, /\(worldX-start\)\/Math\.max\(\.001,finish-start\)/);
assert.equal((renderObstacle.match(/getBoundingClientRect\(\)/g) || []).length, 1,
  "the route may read the rocket rectangle once per frame, never one rectangle per gate");
assert.match(renderObstacle, /prepareSpaceObstacleLayout\(viewportWidth,viewportHeight\)/);
assert.match(renderObstacle, /for\(let gateIndex=0;gateIndex<SPACE_OBSTACLE_MAX_GATES;gateIndex\+\+\)/);
assert.match(renderObstacle, /spaceObstacleScreenX\(progress,item\.anchor,viewportWidth\)/);
assert.match(renderObstacle, /if\(progress<SPACE_OBSTACLE_DEPARTURE_GRACE_PROGRESS\)continue/,
  "a newly restored rocket must receive a collision-free departure window");
assert.match(renderObstacle, /if\(spaceObstacleHitGates\.has\(item\.key\)\)continue/,
  "a completed gate must be skipped without returning from the whole gate loop");
assert.match(renderObstacle, /if\(now<spaceObstacleInvulnerableUntil\)continue/,
  "an overlapping next gate must remain unregistered until global invulnerability ends");
assert.match(renderObstacle, /visible=gateX<viewportWidth&&gateX\+item\.gateWidth>0/,
  "fully offscreen gates must be culled before transform and collision work");
assert.match(renderObstacle, /if\(!visible\)\{if\(item\.visible\)\{item\.visible=false;item\.node\.style\.visibility="hidden"/,
  "a wrapper must return to hidden visibility as soon as it leaves the viewport");
assert.match(renderObstacle, /spaceObstacleCollides/);
assert.match(render, /renderSpaceObstacleGate\(now\)/,
  "the main animation loop must position and collide the route gates");

const prepareObstacle = extractFunction(game, "prepareSpaceObstacleLayout");
assert.doesNotMatch(prepareObstacle, /querySelector|Math\.random|Date\./,
  "segment configuration must use the startup pool and deterministic lane plan");
assert.match(prepareObstacle, /spaceObstacleLayoutKey&&spaceObstacleSegment===qSeg/,
  "unchanged segment geometry must return from the cache before rebuilding");
assert.match(prepareObstacle, /vehicleSteerShell&&vehicleSteerShell\.offsetWidth/);
assert.match(prepareObstacle, /vehicleSteerShell&&vehicleSteerShell\.offsetHeight/);
assert.match(prepareObstacle, /spaceObstacleLaneKey!==laneKey/,
  "the first lane must be selected only once per segment rather than on every resize");
assert.match(prepareObstacle, /spaceObstacleLaneStart=spaceObstacleNearestLane/);
assert.doesNotMatch(prepareObstacle, /rocketRect|getBoundingClientRect/,
  "steering tilt must not invalidate geometry through its changing transformed AABB");
for (const variable of ["--space-obstacle-width", "--space-obstacle-gap-top", "--space-obstacle-gap-bottom"]) {
  assert.match(prepareObstacle, new RegExp(variable), `${variable} must be cached per gate wrapper`);
}
assert.match(game, /resize",\(\)=>\{spaceChaseState\.frameAt=0;cancelSpaceChaseRescuePointer\(true\);invalidateSpaceObstacleLayout\(\)/,
  "viewport changes must invalidate the route geometry cache");

const invalidateObstacle = extractFunction(game, "invalidateSpaceObstacleLayout");
const cacheSandbox = {
  SPACE_OBSTACLE_MAX_GATES: 12,
  SPACE_OBSTACLE_COUNT_TABLE: [[3, 4, 6, 8, 10], [3, 5, 7, 9, 11], [4, 6, 8, 10, 12]],
  SPACE_OBSTACLE_ANCHOR_START: .34,
  SPACE_OBSTACLE_ANCHOR_END: .76,
  SPACE_OBSTACLE_DEPARTURE_GRACE_PROGRESS: .14,
  SPACE_OBSTACLE_GAP_CENTERS: [.22, .28, .34, .40, .46, .52, .58, .64, .70, .76, .82, .76, .70, .64, .58, .52, .46, .40, .34, .28],
  SPACE_OBSTACLE_MIN_GAPS: [144, 126, 110],
  SPACE_OBSTACLE_PLAYABLE_RATIOS: [.48, .42, .36],
  SPACE_OBSTACLE_ROCKET_RATIOS: [1.90, 1.65, 1.45],
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  Number,
  Math,
  Array,
  qSeg: 4,
  level: 2,
  loop: 0,
  stg: 5,
  worldX: 0,
  spaceObstacleSegment: -1,
  spaceObstacleLayoutKey: "",
  spaceObstacleCachedBounds: null,
  spaceObstacleLayoutLevel: -1,
  spaceObstacleLayoutLoop: -1,
  spaceObstacleLayoutViewportWidth: 0,
  spaceObstacleLayoutViewportHeight: 0,
  spaceObstacleLayoutRocketWidth: 0,
  spaceObstacleLayoutRocketHeight: 0,
  spaceObstacleLaneKey: "",
  spaceObstacleLaneStart: 0,
  spaceObstacleGateLayout: new Array(12),
  spaceObstacleFrameHitbox: { left: 0, right: 0, top: 0, bottom: 0 },
  spaceObstacleHitGates: new Set(),
  spaceObstacleInvulnerableUntil: 0,
  spaceObstacleFlashUntil: 0,
  spaceObstacleGuideUntil: 0,
  spaceObstacleGuide: { hidden: true, textContent: "" },
  spaceSteerY: 0,
  planCalls: 0,
  geometryWrites: 0,
  transformWrites: 0,
  rectReads: 0,
  collisionCalls: 0,
  hitCalls: 0,
  collideNow: false,
  maxTransformsInFrame: 0,
  currentRect: { left: 100, top: 80, width: 200, height: 133 },
  vehicleSteerShell: {
    offsetWidth: 200,
    offsetHeight: 133,
    getBoundingClientRect() {
      cacheSandbox.rectReads += 1;
      return { ...cacheSandbox.currentRect };
    }
  },
  veh: { offsetWidth: 200, offsetHeight: 133 },
  window: { innerWidth: 568, innerHeight: 320 },
  spaceObstacleLayer: { hidden: true, dataset: {} },
  document: { body: { classList: { remove() {}, toggle() {}, add() {} } } },
  origin() { return 0; },
  stops(_origin, index) { return (index - 3) * 430; },
  spaceObstacleRouteActive() { return true; },
  spaceSteerBounds() { return { baseCenterY: 182, minY: -61.5, maxY: 61.5 }; },
  spaceObstacleCollides() { cacheSandbox.collisionCalls += 1; return cacheSandbox.collideNow; },
  registerSpaceObstacleHit() { cacheSandbox.hitCalls += 1; return true; }
};
cacheSandbox.spaceObstacleGatePool = Array.from({ length: 12 }, () => ({
  hidden: true,
  dataset: {},
  removeAttribute() {},
  style: {
    visibility: "hidden",
    setProperty(name) {
      if (name === "--space-obstacle-x") cacheSandbox.transformWrites += 1;
      else cacheSandbox.geometryWrites += 1;
    }
  }
}));
vm.createContext(cacheSandbox);
vm.runInContext(`${gateCountSource}\n${anchorSource}\n${lanePlanSource}\n${nearestLaneSource}\n${gapGeometry}\n${screenX}\n${hitboxSource}\n${invalidateObstacle}\n${prepareObstacle}\n${renderObstacle}`, cacheSandbox);
vm.runInContext(`
 this.originalAnchors=spaceObstacleEncounterAnchors;
 this.originalLanes=spaceObstacleLanePlan;
 spaceObstacleEncounterAnchors=function(difficulty,segment){planCalls+=1;return originalAnchors(difficulty,segment);};
 spaceObstacleLanePlan=function(difficulty,segment,journeyLoop,startLane){planCalls+=1;return originalLanes(difficulty,segment,journeyLoop,startLane);};
`, cacheSandbox);
cacheSandbox.renderSpaceObstacleGate(1000);
assert.equal(cacheSandbox.geometryWrites, 36, "the final hard segment config writes three geometry values to twelve gates");
assert.equal(cacheSandbox.planCalls, 2, "anchors and lanes allocate once at segment configuration");
assert.ok(cacheSandbox.spaceObstacleGatePool.some(node => node.style.visibility === "hidden"),
  "the fixed pool must leave fully offscreen wrappers hidden");
cacheSandbox.collideNow = true;
cacheSandbox.collisionCalls = 0;
cacheSandbox.hitCalls = 0;
cacheSandbox.worldX = 430 * .13;
cacheSandbox.renderSpaceObstacleGate(1010);
assert.equal(cacheSandbox.collisionCalls, 0, "collision work must stay disabled throughout the departure grace");
assert.equal(cacheSandbox.hitCalls, 0, "the grace window must not consume a gate hit");
cacheSandbox.worldX = 430 * .141;
cacheSandbox.renderSpaceObstacleGate(1020);
assert.ok(cacheSandbox.collisionCalls > 0 && cacheSandbox.hitCalls > 0,
  "visible gates must resume ordinary collision handling after the grace threshold");
cacheSandbox.collideNow = false;
cacheSandbox.geometryWrites = 0;
cacheSandbox.transformWrites = 0;
cacheSandbox.rectReads = 0;
cacheSandbox.currentRect = { left: 94, top: 70, width: 213, height: 153 };
for (let frame = 0; frame < 20; frame += 1) {
  cacheSandbox.worldX = 430 * (.25 + frame * .025);
  const beforeTransforms = cacheSandbox.transformWrites;
  cacheSandbox.renderSpaceObstacleGate(1100 + frame * 16.7);
  cacheSandbox.maxTransformsInFrame = Math.max(cacheSandbox.maxTransformsInFrame, cacheSandbox.transformWrites - beforeTransforms);
}
assert.equal(cacheSandbox.geometryWrites, 0,
  "twenty tilted frames must not rebuild geometry or rewrite its CSS variables");
assert.equal(cacheSandbox.planCalls, 2, "tilt frames must not allocate another anchor or lane plan");
assert.equal(cacheSandbox.rectReads, 20, "collision may read exactly one transformed rocket rectangle per frame");
assert.ok(cacheSandbox.maxTransformsInFrame <= 12, "a frame may transform at most the twelve fixed wrappers");
cacheSandbox.geometryWrites = 0;
const lanesBeforeResize = cacheSandbox.spaceObstacleGatePool.map(node => node.dataset.lane);
cacheSandbox.spaceSteerY = 61;
cacheSandbox.invalidateSpaceObstacleLayout();
cacheSandbox.renderSpaceObstacleGate(1500);
assert.equal(cacheSandbox.geometryWrites, 36, "one resize invalidation must rebuild twelve cached gate geometries exactly once");
assert.deepEqual(cacheSandbox.spaceObstacleGatePool.map(node => node.dataset.lane), lanesBeforeResize,
  "a geometry-only resize must not re-phase the visible road from the rocket's live Y");
cacheSandbox.geometryWrites = 0;
cacheSandbox.renderSpaceObstacleGate(1517);
assert.equal(cacheSandbox.geometryWrites, 0, "the frame after resize rebuild must reuse the new geometry cache");

const registerHit = extractFunction(game, "registerSpaceObstacleHit");
assert.match(registerHit, /spaceObstacleHitGates\.has\(gateKey\)/);
assert.match(registerHit, /spaceObstacleHitGates\.add\(gateKey\)/);
assert.match(registerHit, /spaceObstacleDamage=Math\.min\(3,spaceObstacleDamage\+1\)/);
assert.match(registerHit, /SPACE_OBSTACLE_INVULNERABLE_MS/);
assert.match(registerHit, /SPACE_OBSTACLE_FLASH_MS/);
assert.match(registerHit, /clamp\(desiredY-spaceSteerTargetY,-24,24\)/,
  "a collision may guide the target toward the gap by at most 24px");
assert.match(registerHit, /ぶつかった！ えきで なおそう/);
assert.doesNotMatch(registerHit, /\b(?:vel|target|score|firstTry|stageMiss|missInQ)\b|onPick|addScore/,
  "route collisions are nonfatal and must not alter speed or quiz scoring");
const hitSandbox = {
  spaceObstacleHitGates: new Set(),
  spaceObstacleDamage: 0,
  spaceObstacleInvulnerableUntil: 0,
  spaceObstacleFlashUntil: 0,
  spaceObstacleGuideUntil: 0,
  SPACE_OBSTACLE_INVULNERABLE_MS: 900,
  SPACE_OBSTACLE_FLASH_MS: 240,
  spaceSteerTargetY: 0,
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  spaceObstacleGuide: { textContent: "", hidden: true },
  document: { body: { classList: { add() {} } } },
  tone() {},
  Math
};
vm.createContext(hitSandbox);
vm.runInContext(`${registerHit};this.hit=registerSpaceObstacleHit;`, hitSandbox);
const hitGeometry = { center: 120 };
const hitBounds = { baseCenterY: 100, minY: -80, maxY: 80 };
assert.equal(hitSandbox.hit(1000, hitGeometry, hitBounds, "3:0"), true);
assert.equal(hitSandbox.hit(1100, hitGeometry, hitBounds, "3:1"), false,
  "invulnerability must not consume the next gate key");
assert.equal(hitSandbox.spaceObstacleHitGates.has("3:1"), false);
assert.equal(hitSandbox.hit(1900, hitGeometry, hitBounds, "3:1"), true,
  "the still-overlapping gate may register when invulnerability expires");
assert.equal(hitSandbox.hit(2800, hitGeometry, hitBounds, "3:1"), false,
  "the same gate must remain exact-once after invulnerability expires");
assert.equal(hitSandbox.hit(2800, hitGeometry, hitBounds, "3:2"), true);
assert.equal(hitSandbox.hit(3700, hitGeometry, hitBounds, "3:3"), true);
assert.equal(hitSandbox.hit(4600, hitGeometry, hitBounds, "3:4"), true);
assert.equal(hitSandbox.spaceObstacleDamage, 3,
  "four or more distinct accepted hits must never exceed the three-screw repair cap");
assert.match(game, /const SPACE_OBSTACLE_INVULNERABLE_MS=900;/);
assert.match(game, /const SPACE_OBSTACLE_FLASH_MS=240;/);
assert.match(resetSteering, /resetSpaceObstacles\(\)/,
  "leaving or restarting space must clear damage and the fixed gate");
assert.match(extractFunction(game, "resetSpaceObstacles"), /spaceObstacleLaneKey="";spaceObstacleLaneStart=0/,
  "a new journey must clear the prior segment's preserved first lane");

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
