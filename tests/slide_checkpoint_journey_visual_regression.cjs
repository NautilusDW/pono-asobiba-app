#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "slide/index.html"), "utf8");

function sliceBetween(startToken, endToken, label) {
  const start = html.indexOf(startToken);
  assert.notEqual(start, -1, `${label}: start token is missing`);
  const end = html.indexOf(endToken, start + startToken.length);
  assert.notEqual(end, -1, `${label}: end token is missing`);
  return html.slice(start, end);
}

const verticalMatch = html.match(
  /const VERTICAL_LEVELS = (\[[\s\S]*?\n\]);\n\n\/\/ 行列の転置/
);
assert.ok(verticalMatch, "checkpoint terrain: level data remains statically inspectable");
const verticalLevels = vm.runInNewContext(`(${verticalMatch[1]})`, Object.create(null), {
  filename: "slide-checkpoint-levels.js",
});
assert.deepEqual(
  Array.from(verticalLevels, (level, index) => level.checkpoint ? index : -1).filter(index => index >= 0),
  [2],
  "only stage 3 uses the two-leg checkpoint prototype",
);
assert.ok(verticalLevels[2].checkpoint.lockedCells.length >= 2,
  "stage 3 defines a visible settled route after the checkpoint");

assert.match(html,
  /imgForestFloorTerrain\.src = '\.\.\/assets\/images\/Slide\/generated\/terrain_texture_forest_floor\.webp'/,
  "stage 3 loads its generated forest-floor terrain");
assert.match(html,
  /imgCheckpointRoadTexture\.src = '\.\.\/assets\/images\/Slide\/generated\/road_texture_forest_checkpoint\.webp'/,
  "stage 3 loads its generated trail surface");

const roadPattern = sliceBetween("function getRoadPattern() {", "function getTerrainPattern() {",
  "checkpoint road pattern");
assert.match(roadPattern,
  /const checkpointMaterial = Boolean\(LEVELS\[stageIdx\] && LEVELS\[stageIdx\]\.checkpoint\)/,
  "the dedicated trail is selected from stage mechanics rather than replacing every forest stage");
assert.match(roadPattern,
  /checkpointMaterial \? imgCheckpointRoadTexture : roadTextureImgs\[th\.key\]/,
  "non-checkpoint stages retain their existing road materials");

const terrainPattern = sliceBetween("function getTerrainPattern() {", "const reducedMotionQuery =",
  "checkpoint terrain pattern");
assert.match(terrainPattern,
  /if \(!level \|\| !level\.checkpoint \|\| !imgForestFloorTerrain\.complete/,
  "generated forest-floor panels are gated to the checkpoint stage");
assert.match(terrainPattern, /ctx\.createPattern\(imgForestFloorTerrain, 'repeat'\)/,
  "the generated terrain is drawn as one board-anchored material");

const tileBase = sliceBetween("function drawTileBase(", "function drawTileRoadUnderlay(",
  "terrain tile base");
assert.match(tileBase, /const inset = visual\.settled \? 0 : Math\.max\(0\.65, size \* 0\.008\)/,
  "settled terrain reaches the cell edge and removes the card gap");
assert.match(tileBase, /const radius = Math\.min\(4, size \* 0\.025\)/,
  "terrain corners remain nearly square and capped at four pixels");
assert.doesNotMatch(tileBase, /const radius = size \* 0\.13/,
  "the old strongly rounded slab radius must not return");
assert.match(tileBase, /if \(!visual\.settled\) \{[\s\S]*?ctx\.stroke\(\)/,
  "settled cells lose their loose-panel outline");

const roadUnderlay = sliceBetween("function drawTileRoadUnderlay(",
  "function drawTileRoadSurface(", "trail underlay");
const roadSurface = sliceBetween("function drawTileRoadSurface(",
  "function drawSettledFootprints(", "trail surface");
for (const [label, block] of [["underlay", roadUnderlay], ["surface", roadSurface]]) {
  assert.match(block, /const pathW = size \* 0\.29/,
    `${label}: trail width remains 29 percent of a cell`);
  assert.match(block, /ctx\.lineCap = 'butt'/,
    `${label}: trail exits stay flush rather than rounded`);
}
assert.match(roadSurface,
  /if \(effectiveTileKey === 'CROSS'\) \{[\s\S]*?ctx\.arc\([\s\S]*?pathW \* 0\.51[\s\S]*?ctx\.fill\(\)/,
  "four-way trails explicitly fill their center hub");
assert.doesNotMatch(roadSurface, /rgba\(255,\s*255,\s*255/,
  "the plastic-looking white center stripe stays removed");
assert.doesNotMatch(roadSurface, /pathLight/,
  "the old road-center highlight token stays removed");

const edgePoint = sliceBetween("function edgePoint(", "function drawGuideTrail(",
  "trail edge overlap");
assert.match(edgePoint, /const seamOverlap = Math\.max\(2, size \* 0\.025\)/,
  "trail material overscans every panel seam by at least two pixels");

const drawBlock = sliceBetween("function draw(now) {", "// ===== Update animation =====",
  "checkpoint board draw");
const restingBase = drawBlock.indexOf(
  "restingTiles.forEach(function(visual) {\n    drawTileBase");
const restingUnderlay = drawBlock.indexOf(
  "restingTiles.forEach(function(visual) {\n    drawTileRoadUnderlay");
const restingSurface = drawBlock.indexOf(
  "restingTiles.forEach(function(visual) {\n    drawTileRoadSurface");
const movingStart = drawBlock.indexOf("if (movingTile) {");
assert.ok(restingBase >= 0 && restingBase < restingUnderlay &&
  restingUnderlay < restingSurface && restingSurface < movingStart,
  "all resting bases paint before all underlays, then all surfaces, then the moving tile");
const movingBlock = drawBlock.slice(movingStart, drawBlock.indexOf("tileVisuals.forEach", movingStart));
assert.ok(movingBlock.indexOf("drawTileBase") < movingBlock.indexOf("drawTileRoadUnderlay") &&
  movingBlock.indexOf("drawTileRoadUnderlay") < movingBlock.indexOf("drawTileRoadSurface"),
  "the moving terrain fragment keeps its own base-underlay-surface stack on top");
assert.match(drawBlock, /settled: isCheckpointLockedCell\(i\)/,
  "checkpoint-locked cells feed the settled terrain state");
assert.match(drawBlock,
  /if \(visual\.settled\) drawSettledFootprints\(visual\.x, visual\.y, visual\.size, visual\.index\)/,
  "settled route cells retain Pono's footprints");

const footprints = sliceBetween("function drawSettledFootprints(", "function drawCharmAt(",
  "settled footprints");
assert.match(footprints, /ctx\.ellipse\(/,
  "settled footprints use small ground marks rather than another UI badge");

const checkpointMarker = sliceBetween("function drawCheckpointMarker(",
  "function getGoalBeaconBounds(", "checkpoint marker");
assert.match(checkpointMarker,
  /if \(!stageCheckpointReached && journeyActor\.phase !== JOURNEY_PHASE\.CHECKPOINT_DISCOVERY\) \{[\s\S]*?drawCharmAt\(/,
  "the mother's clue is visible before Pono reaches it");
assert.match(checkpointMarker, /ctx\.setLineDash\(/,
  "the discovered checkpoint remains marked without restoring a raised tile");
assert.ok(drawBlock.indexOf("drawCheckpointMarker(now)") < drawBlock.indexOf("drawStartGoal(now, connectedSet)"),
  "checkpoint marker paints below the persistent Pono actor");

const startGoal = sliceBetween("function drawStartGoal(", "function drawJourneyActor(",
  "persistent checkpoint Pono");
assert.match(startGoal,
  /const checkpointHome = Boolean\(level\.checkpoint && stageCheckpointReached\)/,
  "Pono changes home position after the midpoint");
assert.match(startGoal,
  /const home = checkpointHome \? getCheckpointCenter\(\) : \{ x: geo\.startX, y: geo\.startY \}/,
  "the persistent actor is anchored to the checkpoint center");
assert.match(startGoal,
  /if \(!journeyActor\.active && state === S\.PLAYING\) \{[\s\S]*?ctx\.drawImage\(imgPonoWorld, home\.x/,
  "a single static Pono remains visible at the checkpoint while the second leg is solved");

const finishCheckpoint = sliceBetween("function finishCheckpointDiscovery(",
  "function handleRouteCompletion(", "checkpoint discovery handoff");
assert.match(finishCheckpoint,
  /setupCheckpointSecondLeg\(now\)[\s\S]*?journeyActor\.active = false[\s\S]*?state = S\.PLAYING/,
  "the walking actor hands off to the single static checkpoint Pono");
assert.match(html,
  /showJourneyToast\('おかあさんの しるしを みつけた！\\nつぎの みちを つなごう！'/,
  "checkpoint discovery and the next action are announced atomically");

function decodeWebpHeader(relativePath) {
  const absolutePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(absolutePath), `${relativePath}: generated asset exists`);
  const file = fs.readFileSync(absolutePath);
  assert.ok(file.length > 4096, `${relativePath}: generated asset is not an empty placeholder`);
  assert.ok(file.length < 3 * 1024 * 1024, `${relativePath}: generated asset stays below 3 MB`);
  assert.equal(file.subarray(0, 4).toString("ascii"), "RIFF", `${relativePath}: RIFF signature`);
  assert.equal(file.subarray(8, 12).toString("ascii"), "WEBP", `${relativePath}: WebP signature`);
  assert.equal(file.readUInt32LE(4) + 8, file.length, `${relativePath}: RIFF length is complete`);

  let offset = 12;
  while (offset + 8 <= file.length) {
    const fourcc = file.subarray(offset, offset + 4).toString("ascii");
    const length = file.readUInt32LE(offset + 4);
    const data = offset + 8;
    assert.ok(data + length <= file.length, `${relativePath}: ${fourcc} chunk is complete`);
    if (fourcc === "VP8 ") {
      assert.equal(file.subarray(data + 3, data + 6).toString("hex"), "9d012a",
        `${relativePath}: lossy frame is decodable`);
      return {
        width: file.readUInt16LE(data + 6) & 0x3fff,
        height: file.readUInt16LE(data + 8) & 0x3fff,
        absolutePath,
      };
    }
    if (fourcc === "VP8L") {
      assert.equal(file[data], 0x2f, `${relativePath}: lossless frame is decodable`);
      const bits = file.readUInt32LE(data + 1);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1,
        absolutePath,
      };
    }
    if (fourcc === "VP8X") {
      return {
        width: file.readUIntLE(data + 4, 3) + 1,
        height: file.readUIntLE(data + 7, 3) + 1,
        absolutePath,
      };
    }
    offset = data + length + (length % 2);
  }
  throw new Error(`${relativePath}: WebP image frame is missing`);
}

const generatedAssets = [
  "assets/images/Slide/generated/terrain_texture_forest_floor.webp",
  "assets/images/Slide/generated/road_texture_forest_checkpoint.webp",
].map(decodeWebpHeader);
for (const asset of generatedAssets) {
  assert.ok(asset.width >= 512 && asset.height >= 512,
    `${path.basename(asset.absolutePath)}: generated material has useful source resolution`);
  assert.equal(asset.width, asset.height,
    `${path.basename(asset.absolutePath)}: generated board material remains square`);
}

// When libwebp is available, also exercise the real decoder. Header validation
// above remains portable and is always enforced in environments without dwebp.
const decoderProbe = childProcess.spawnSync("dwebp", ["-version"], { encoding: "utf8" });
if (!decoderProbe.error) {
  assert.equal(decoderProbe.status, 0, "dwebp probe succeeds");
  for (const asset of generatedAssets) {
    const decoded = childProcess.spawnSync("dwebp",
      ["-quiet", asset.absolutePath, "-o", process.platform === "win32" ? "NUL" : "/dev/null"],
      { encoding: "utf8" });
    assert.equal(decoded.status, 0,
      `${path.basename(asset.absolutePath)}: libwebp decodes the generated material`);
  }
} else {
  assert.equal(decoderProbe.error.code, "ENOENT", "unexpected dwebp launch failure");
}

console.log("slide_checkpoint_journey_visual_regression: all assertions passed");
