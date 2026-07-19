'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'bento/kitchen.html');
const html = fs.readFileSync(htmlPath, 'utf8');

let scriptCount = 0;
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
  scriptCount++;
  new vm.Script(match[1], { filename: `bento-kitchen-inline-${scriptCount}.js` });
}
assert.equal(scriptCount, 7, 'unexpected script block count');

const knifeStart = html.indexOf('const KNIFE_SPEED_LINE_PROFILE = [');
const knifeEnd = html.indexOf('];', knifeStart);
assert.ok(knifeStart >= 0 && knifeEnd > knifeStart, 'knife profile is missing');
const knifeProfile = html.slice(knifeStart, knifeEnd);
assert.equal((knifeProfile.match(/\{ x:/g) || []).length, 11, 'knife profile must render 11 irregular lines');
assert.deepEqual(
  [...knifeProfile.matchAll(/widthPx:\s*([0-9.]+)/g)].map((match) => Number(match[1])),
  [3, 4.6, 6.8, 3.6, 2.8, 5.8, 4.1, 5, 3.1, 4, 2.7],
  'knife widths must preserve visible variation',
);
assert.equal((html.match(/<span class="knife-speed-line"><\/span>/g) || []).length, 11, 'knife DOM count must match the profile');

const potatoStart = html.indexOf("id: 'potato'");
const potatoEnd = html.indexOf("id: 'onion'", potatoStart);
assert.ok(potatoStart >= 0 && potatoEnd > potatoStart, 'potato config is missing');
const potatoSource = html.slice(potatoStart, potatoEnd);
assert.match(potatoSource, /bowlPieceSize:\s*58/);
const potatoSlots = [...potatoSource.matchAll(/\{ x: ([0-9.]+), y: ([0-9.]+), rot: (-?[0-9]+) \}/g)]
  .map((match) => ({ x: Number(match[1]), y: Number(match[2]), rot: Number(match[3]) }));
assert.equal(potatoSlots.length, 9, 'potato must use nine bowl-wide landing slots');
assert.ok(Math.min(...potatoSlots.map((slot) => slot.x)) <= 0.12);
assert.ok(Math.max(...potatoSlots.map((slot) => slot.x)) >= 0.88);
assert.ok(potatoSlots.every((slot) => slot.y >= 0.38 && slot.y <= 0.62));
assert.match(html, /layer\.clientWidth \|\| layer\.offsetWidth \|\| rect\.width/);

const mashStart = html.indexOf('mash_potato: {');
const mashEnd = html.indexOf('shape_korokke: {', mashStart);
assert.ok(mashStart >= 0 && mashEnd > mashStart, 'mash_potato config is missing');
const mashSource = html.slice(mashStart, mashEnd);
assert.match(mashSource, /coverageBrushScale:\s*0\.58,[\s\S]*?coverageGrid:\s*\{ cols: 36, rows: 22 \}/);
assert.match(mashSource, /coverageThreshold:\s*0\.98,[\s\S]*?coverageMinZoneRatio:\s*0\.95/);
const mashRedrawStart = html.indexOf('function redrawPotatoCoverageOverlay(config)');
const mashRedrawEnd = html.indexOf('function schedulePotatoCoverageOverlay(config)', mashRedrawStart);
assert.ok(mashRedrawStart >= 0 && mashRedrawEnd > mashRedrawStart, 'mash replacement compositor is missing');
const mashRedrawSource = html.slice(mashRedrawStart, mashRedrawEnd);
assert.match(mashRedrawSource, /getKneadWorkCanvas\('potatoRevealCurrent', canvas\)/);
assert.match(mashRedrawSource, /getKneadWorkCanvas\('potatoRevealNext', canvas\)/);
assert.match(mashRedrawSource, /globalCompositeOperation = 'destination-out'/);
assert.match(mashRedrawSource, /globalCompositeOperation = 'destination-in'/);
assert.match(mashRedrawSource, /globalCompositeOperation = 'lighter'/);
assert.doesNotMatch(mashRedrawSource, /coverageZones|addPotatoCoverageZonesPath/, 'render mask must not be clipped to accounting zones');
assert.doesNotMatch(html, /function addPotatoCoverageZonesPath\(/, 'accounting zones must not be reused as a visual clip');
assert.match(html, /kneadRuntime\.potatoRevealRaf = requestAnimationFrame/);
assert.match(html, /cancelAnimationFrame\(kneadRuntime\.potatoRevealRaf\)/);
const pointerMoveStart = html.indexOf('function onPrepPointerMove(evt)');
const pointerMoveEnd = html.indexOf('function onPrepPointerUp(evt)', pointerMoveStart);
assert.ok(pointerMoveStart >= 0 && pointerMoveEnd > pointerMoveStart, 'prep pointer move handler is missing');
const pointerMoveSource = html.slice(pointerMoveStart, pointerMoveEnd);
assert.match(pointerMoveSource, /if \(potatoMash && !pointerInside\)[\s\S]*?prepMashPointerInside = false;[\s\S]*?return;/);
assert.match(pointerMoveSource, /if \(potatoMash && !state\.prepMashPointerInside\)[\s\S]*?prepMashPointerInside = true;[\s\S]*?return;/);

const mixStart = html.indexOf('mix_mince_potato: {');
const mixEnd = html.indexOf('mix_mince_onion: {', mixStart);
assert.ok(mixStart >= 0 && mixEnd > mixStart, 'mix_mince_potato config is missing');
const mixSource = html.slice(mixStart, mixEnd);
assert.match(mixSource, /continuousBlend:\s*true/);
assert.match(mixSource, /localCoverageReveal:\s*true/);
assert.match(mixSource, /mixCoverage:\s*true/);
assert.match(mixSource, /coverageThreshold:\s*0\.96/);
assert.match(mixSource, /coverageMinZoneRatio:\s*0\.9/);
assert.match(mixSource, /coverageBrushRadius:\s*\{ rx: 0\.075, ry: 0\.105 \}/);
assert.match(mixSource, /coverageGrid:\s*\{ cols: 30, rows: 18 \}/);
assert.match(mixSource, /baseSrc:\s*'\.\.\/assets\/images\/bento\/cooking\/potato\/potato_mash_003\.png'/);
assert.match(mixSource, /coverageAspect:\s*380 \/ 220/);
assert.equal((mixSource.match(/foodSrc:/g) || []).length, 4, 'mix must have four aligned storybook states');
assert.equal((mixSource.match(/storybook_v1249\/korokke_mix_storybook_state[0-3]\.png/g) || []).length, 8);
assert.doesNotMatch(mixSource, /revealNextOnly|solidRevealBrush|commitRevealStage/);
assert.doesNotMatch(mixSource, /mix_mince_potato_00[123]\.png/);
assert.doesNotMatch(mixSource, /20260711_(?:1231|1237)/, 'photorealistic legacy mix assets must not be wired');
assert.match(html, /function drawContinuousKneadBlend\(/);
assert.match(html, /function drawLocalKneadCoverageReveal\(/);
assert.match(html, /globalCompositeOperation = 'destination-out'/);
assert.match(html, /globalCompositeOperation = 'destination-in'/);
assert.match(html, /getKneadWorkCanvas\('localCoverageComposite', canvas\)/);
assert.match(html, /foodCtx\.globalCompositeOperation = 'lighter'/);
assert.match(html, /ctx\.drawImage\(foodComposite, -canvas\.width \/ 2, -canvas\.height \/ 2\)/);
assert.match(html, /const warpX = reducedMotion \? 0 : \(kneadRuntime\.mixWarpX \|\| 0\)/);
assert.match(html, /ctx\.translate\(canvas\.width \/ 2 \+ warpX, canvas\.height \/ 2 \+ warpY\)/);
assert.match(html, /if \(config\.localCoverageReveal\) \{[\s\S]*?mixWarpX = Math\.max\(-3,[\s\S]*?mixWarpRotate = Math\.max\(-0\.45/);
assert.match(html, /function scheduleLocalKneadCoverageReveal\(/);
assert.match(html, /kneadRuntime\.localRevealRaf = requestAnimationFrame/);
assert.match(html, /cancelAnimationFrame\(kneadRuntime\.localRevealRaf\)/);
assert.doesNotMatch(html, /data-prep-kind="mix_mince_potato"\]\.is-working \.knead-canvas \{\s*animation:/);
assert.match(html, /function isCoveragePrepConfig\(/);
assert.match(html, /const usesCoverage = isCoveragePrepConfig\(config\)/);

const shapeStart = html.indexOf('shape_korokke: {');
const shapeEnd = html.indexOf('bread_shrimp: {', shapeStart);
assert.ok(shapeStart >= 0 && shapeEnd > shapeStart, 'shape_korokke config is missing');
const shapeSource = html.slice(shapeStart, shapeEnd);
assert.match(shapeSource, /continuousShapeWarp:\s*true/);
assert.match(shapeSource, /shapeCrossfade:\s*true/);
assert.match(shapeSource, /shapeRoughStartScaleX:\s*0\.95/);
assert.match(shapeSource, /shapeRoughStartScaleY:\s*1\.05/);
assert.match(shapeSource, /shapeRoughFinalScaleX:\s*0\.85/);
assert.match(shapeSource, /shapeRoughFinalScaleY:\s*0\.8/);
assert.match(shapeSource, /shapeStartScaleX:\s*0\.75/);
assert.match(shapeSource, /shapeStartScaleY:\s*0\.85/);
assert.match(shapeSource, /shapeFinalScaleX:\s*0\.67/);
assert.match(shapeSource, /shapeFinalScaleY:\s*0\.67/);
assert.match(shapeSource, /shapeFinalClipRx:\s*50/);
assert.match(shapeSource, /shapeFinalClipRy:\s*50/);
assert.match(shapeSource, /shapeMeatOffsetX:\s*0/);
assert.match(shapeSource, /shapeGuideHeight:\s*'36\.6%'/);
assert.doesNotMatch(shapeSource, /fixedShapeFrames/);
const shapeFoodRefs = [...shapeSource.matchAll(/shapeMeatSrc:\s*'([^']+)'/g)].map((match) => match[1]);
const shapeStartFoodRefs = [...shapeSource.matchAll(/shapeStartMeatSrc:\s*'([^']+)'/g)].map((match) => match[1]);
assert.equal(shapeFoodRefs.length, 3);
assert.equal(shapeStartFoodRefs.length, 3);
assert.equal(new Set(shapeFoodRefs).size, 1, 'all shape stages must warp the exact same food layer');
assert.equal(new Set(shapeStartFoodRefs).size, 1, 'all shape stages must keep the same rough food layer');
assert.match(shapeFoodRefs[0], /korokke\/prep\/korokke_flour_01\.png$/);
assert.match(shapeStartFoodRefs[0], /storybook_v1249\/korokke_shape_storybook_food\.png$/);
const breadStart = html.indexOf('bread_korokke: {', shapeEnd);
const breadEnd = html.indexOf('marinate_chicken: {', breadStart);
assert.ok(breadStart > shapeEnd && breadEnd > breadStart, 'bread_korokke config is missing');
const breadSource = html.slice(breadStart, breadEnd);
const flourStartMatch = breadSource.match(/stepFrames:\s*\[\s*\[\s*'([^']+)'/);
assert.ok(flourStartMatch, 'bread_korokke flour start frame is missing');
assert.equal(shapeFoodRefs[0], flourStartMatch[1], 'shape completion must reuse the exact flour-start food source');
assert.match(html, /--shape-meat-scale-x', \(startScaleX \+ morph \* \(finalScaleX - startScaleX\)\)/);
assert.match(html, /--shape-meat-scale-y', \(startScaleY \+ morph \* \(finalScaleY - startScaleY\)\)/);
assert.match(html, /--shape-rough-scale-x', \(roughStartScaleX \+ morph \* \(roughFinalScaleX - roughStartScaleX\)\)/);
assert.match(html, /--shape-meat-start-opacity', startOpacity\.toFixed\(3\)/);
assert.match(html, /--shape-meat-offset-x', meatOffsetX\.toFixed\(2\) \+ 'px'/);
assert.match(html, /translate\(calc\(var\(--shape-meat-offset-x, 0px\) \+ var\(--shape-warp-x, 0px\)\)/);
assert.match(html, /--shape-clip-rx', \(startClipRx \+ morph \* \(finalClipRx - startClipRx\)\)/);
assert.match(html, /function updateContinuousShapeWarpImpulse\(/);
assert.match(html, /function playKorokkeShapeToBreadingHandoff\(config\)/);
assert.match(html, /shapeHandoffAlpha:\s*\{ canvasW: 320, canvasH: 190, x: 18, y: 20, w: 284, h: 149 \}/);
assert.match(html, /food\.dataset\.shapeHandoff = '1'/);
assert.match(html, /state\.prepShapeExitRect = rect\.width && rect\.height/);

const storybookMixRefs = [...new Set([...mixSource.matchAll(/'([^']+storybook_v1249\/korokke_mix_storybook_state[0-3]\.png)'/g)].map((match) => match[1]))];
assert.equal(storybookMixRefs.length, 4, 'four storybook mix states must be wired');
for (const src of storybookMixRefs) {
  const file = path.resolve(path.dirname(htmlPath), src);
  assert.ok(fs.existsSync(file), `missing asset: ${src}`);
  const stat = fs.statSync(file);
  assert.ok(stat.size > 0 && stat.size < 3 * 1024 * 1024, `invalid asset size: ${src}`);
  const png = fs.readFileSync(file);
  assert.equal(png.toString('ascii', 1, 4), 'PNG', `not a PNG: ${src}`);
  assert.equal(png.readUInt32BE(16), 380, `unexpected width: ${src}`);
  assert.equal(png.readUInt32BE(20), 220, `unexpected height: ${src}`);
}
const storybookShapeFile = path.resolve(path.dirname(htmlPath), shapeFoodRefs[0]);
assert.ok(fs.existsSync(storybookShapeFile), 'storybook shape food must exist');
assert.ok(fs.statSync(storybookShapeFile).size > 0 && fs.statSync(storybookShapeFile).size < 3 * 1024 * 1024);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : (pb <= pc ? b : c);
}

function decodeRgbaPng(file) {
  const png = fs.readFileSync(file);
  assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a', `bad PNG signature: ${file}`);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.equal(png[24], 8, `PNG must be 8-bit: ${file}`);
  assert.equal(png[25], 6, `PNG must be RGBA: ${file}`);
  assert.equal(png[28], 0, `PNG must be non-interlaced: ${file}`);
  const chunks = [];
  let offset = 8;
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  const packed = zlib.inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  const data = Buffer.alloc(stride * height);
  let srcOffset = 0;
  for (let y = 0; y < height; y++) {
    const filter = packed[srcOffset++];
    for (let x = 0; x < stride; x++) {
      const raw = packed[srcOffset++];
      const left = x >= 4 ? data[y * stride + x - 4] : 0;
      const up = y > 0 ? data[(y - 1) * stride + x] : 0;
      const upperLeft = y > 0 && x >= 4 ? data[(y - 1) * stride + x - 4] : 0;
      let value = raw;
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += Math.floor((left + up) / 2);
      else if (filter === 4) value += paeth(left, up, upperLeft);
      else assert.equal(filter, 0, `unknown PNG filter ${filter}: ${file}`);
      data[y * stride + x] = value & 255;
    }
  }
  return { width, height, data };
}

const mashBase = decodeRgbaPng(path.join(root, 'assets/images/bento/cooking/potato/potato_mash_003.png'));
const storybookMixImages = storybookMixRefs
  .sort((a, b) => Number(a.match(/state(\d)/)[1]) - Number(b.match(/state(\d)/)[1]))
  .map((src) => decodeRgbaPng(path.resolve(path.dirname(htmlPath), src)));
const changedCounts = [];
const spreadAreas = [];
const radialStats = [];
storybookMixImages.forEach((image, stage) => {
  assert.equal(image.width, mashBase.width);
  assert.equal(image.height, mashBase.height);
  let changed = 0;
  let changedX = 0;
  let changedLeft = 0;
  let greenFringe = 0;
  let edgeAlpha = 0;
  let alphaMismatch = 0;
  let changeOutsideFood = 0;
  let minChangedX = image.width;
  let minChangedY = image.height;
  let maxChangedX = -1;
  let maxChangedY = -1;
  let meatWeight = 0;
  let weightedX = 0;
  let weightedY = 0;
  const radialSamples = [];
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const index = (y * image.width + x) * 4;
      const r = image.data[index];
      const g = image.data[index + 1];
      const b = image.data[index + 2];
      const a = image.data[index + 3];
      const delta = Math.abs(r - mashBase.data[index])
        + Math.abs(g - mashBase.data[index + 1])
        + Math.abs(b - mashBase.data[index + 2]);
      if (delta > 0) {
        const radius = Math.hypot(
          (x / image.width - 0.5) / 0.39,
          (y / image.height - 0.51) / 0.31,
        );
        meatWeight += delta;
        weightedX += x * delta;
        weightedY += y * delta;
        radialSamples.push({ radius, weight: delta });
      }
      if (a !== mashBase.data[index + 3]) alphaMismatch++;
      if (delta > 18) {
        changed++;
        changedX += x;
        if (x < image.width / 2) changedLeft++;
        minChangedX = Math.min(minChangedX, x);
        minChangedY = Math.min(minChangedY, y);
        maxChangedX = Math.max(maxChangedX, x);
        maxChangedY = Math.max(maxChangedY, y);
        const foodDistance = ((x / image.width - 0.5) / 0.43) ** 2
          + ((y / image.height - 0.52) / 0.34) ** 2;
        if (foodDistance > 1.12) changeOutsideFood++;
      }
      const baseR = mashBase.data[index];
      const baseG = mashBase.data[index + 1];
      const baseB = mashBase.data[index + 2];
      const baseA = mashBase.data[index + 3];
      const isGreen = a > 0 && g > r * 1.22 && g > b * 1.22;
      const baseIsGreen = baseA > 0 && baseG > baseR * 1.22 && baseG > baseB * 1.22;
      if (isGreen && !baseIsGreen) greenFringe++;
      if ((x === 0 || y === 0 || x === image.width - 1 || y === image.height - 1) && a) edgeAlpha++;
    }
  }
  assert.equal(alphaMismatch, 0, `state ${stage} must preserve the exact mash/plate alpha silhouette`);
  assert.equal(changeOutsideFood, 0, `state ${stage} must not repaint the shared plate`);
  assert.ok(changed > 250, `state ${stage} mince must remain visible`);
  assert.ok(Math.abs(changedX / changed - image.width / 2) <= image.width * 0.035, `state ${stage} mince centroid must stay centered`);
  assert.ok(changedLeft / changed >= 0.4 && changedLeft / changed <= 0.6, `state ${stage} mince must be balanced left/right`);
  assert.equal(greenFringe, 0, `state ${stage} must not add green fringe beyond the approved mash base`);
  assert.equal(edgeAlpha, 0, `state ${stage} must keep transparent outer edges`);
  radialSamples.sort((a, b) => a.radius - b.radius);
  const weightedRadius = (quantile) => {
    const target = meatWeight * quantile;
    let accumulated = 0;
    for (const sample of radialSamples) {
      accumulated += sample.weight;
      if (accumulated >= target) return sample.radius;
    }
    return radialSamples.at(-1).radius;
  };
  radialStats.push({
    r50: weightedRadius(0.5),
    r90: weightedRadius(0.9),
    cx: weightedX / meatWeight / image.width,
    cy: weightedY / meatWeight / image.height,
  });
  changedCounts.push(changed);
  spreadAreas.push((maxChangedX - minChangedX + 1) * (maxChangedY - minChangedY + 1));
});
assert.ok(spreadAreas[1] > spreadAreas[0] * 1.15, 'early mix must spread beyond the centered pile');
assert.ok(spreadAreas[2] > spreadAreas[1] * 1.4, 'middle mix must expand across the potato');
assert.ok(spreadAreas[3] >= spreadAreas[2] * 0.95, 'final mix must remain broadly distributed');
assert.ok(changedCounts[3] > 700, 'final mix must retain clearly visible meat flecks');
const radialRanges = [
  { r50: [0.2, 0.28], r90: [0.35, 0.45] },
  { r50: [0.36, 0.42], r90: [0.49, 0.59] },
  { r50: [0.46, 0.53], r90: [0.65, 0.71] },
  { r50: [0.54, 0.63], r90: [0.75, 0.84] },
];
radialStats.forEach((stats, stage) => {
  const expected = radialRanges[stage];
  assert.ok(stats.r50 >= expected.r50[0] && stats.r50 <= expected.r50[1], `state ${stage} r50 jump: ${stats.r50}`);
  assert.ok(stats.r90 >= expected.r90[0] && stats.r90 <= expected.r90[1], `state ${stage} r90 jump: ${stats.r90}`);
  assert.ok(Math.abs(stats.cx - 0.5) <= 0.025, `state ${stage} weighted X center drift: ${stats.cx}`);
  if (stage === 0) assert.ok(stats.cy >= 0.44 && stats.cy <= 0.49, `state 0 weighted Y start drift: ${stats.cy}`);
  else assert.ok(stats.cy >= 0.47 && stats.cy <= 0.54, `state ${stage} weighted Y center drift: ${stats.cy}`);
});
const radialSteps90 = radialStats.slice(1).map((stats, stage) => stats.r90 - radialStats[stage].r90);
radialSteps90.forEach((step, stage) => {
  assert.ok(step >= 0.08 && step <= 0.18, `state ${stage}->${stage + 1} must spread continuously, got ${step}`);
});

const storybookShape = decodeRgbaPng(storybookShapeFile);
assert.equal(storybookShape.width, 320, 'shape food must reuse the 320px flour-start source');
assert.equal(storybookShape.height, 190, 'shape food must reuse the 190px flour-start source');
let shapeGreenFringe = 0;
let shapeEdgeAlpha = 0;
let shapeMinX = storybookShape.width;
let shapeMinY = storybookShape.height;
let shapeMaxX = -1;
let shapeMaxY = -1;
for (let y = 0; y < storybookShape.height; y++) {
  for (let x = 0; x < storybookShape.width; x++) {
    const index = (y * storybookShape.width + x) * 4;
    const r = storybookShape.data[index];
    const g = storybookShape.data[index + 1];
    const b = storybookShape.data[index + 2];
    const a = storybookShape.data[index + 3];
    if (a > 0 && g > r * 1.22 && g > b * 1.22) shapeGreenFringe++;
    if ((x === 0 || y === 0 || x === storybookShape.width - 1 || y === storybookShape.height - 1) && a) shapeEdgeAlpha++;
    if (a > 128) {
      shapeMinX = Math.min(shapeMinX, x);
      shapeMinY = Math.min(shapeMinY, y);
      shapeMaxX = Math.max(shapeMaxX, x);
      shapeMaxY = Math.max(shapeMaxY, y);
    }
  }
}
assert.equal(shapeGreenFringe, 0, 'shape food must not retain green fringe');
assert.equal(shapeEdgeAlpha, 0, 'shape food must keep transparent outer edges');
assert.deepEqual([shapeMinX, shapeMinY, shapeMaxX, shapeMaxY], [18, 20, 301, 168], 'shape handoff alpha metadata must match flour source');
const shapeAlphaAspect = (shapeMaxX - shapeMinX + 1) / (shapeMaxY - shapeMinY + 1);
assert.ok(shapeAlphaAspect >= 1.89 && shapeAlphaAspect <= 1.92, `shape/flour silhouette aspect drift: ${shapeAlphaAspect}`);

const zones = [
  { cx: 0.32, cy: 0.4, rx: 0.17, ry: 0.17 },
  { cx: 0.5, cy: 0.38, rx: 0.17, ry: 0.17 },
  { cx: 0.68, cy: 0.4, rx: 0.17, ry: 0.17 },
  { cx: 0.32, cy: 0.62, rx: 0.17, ry: 0.17 },
  { cx: 0.5, cy: 0.64, rx: 0.17, ry: 0.17 },
  { cx: 0.68, cy: 0.62, rx: 0.17, ry: 0.17 },
];

function makeCoverage(activeZones = zones, cols = 30, rows = 18) {
  const valid = new Uint8Array(cols * rows);
  const covered = new Uint8Array(cols * rows);
  const masks = activeZones.map(() => new Uint8Array(cols * rows));
  const totals = activeZones.map(() => 0);
  let total = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const u = (col + 0.5) / cols;
      const v = (row + 0.5) / rows;
      activeZones.forEach((zone, zoneIndex) => {
        const inside = ((u - zone.cx) / zone.rx) ** 2 + ((v - zone.cy) / zone.ry) ** 2 <= 1;
        if (!inside) return;
        masks[zoneIndex][index] = 1;
        totals[zoneIndex]++;
        valid[index] = 1;
      });
      if (valid[index]) total++;
    }
  }
  return { cols, rows, valid, covered, masks, totals, zoneCovered: activeZones.map(() => 0), total, coveredCount: 0 };
}

function segmentDistance(u, v, u1, v1, u2, v2, rx, ry) {
  const ax = u1 / rx;
  const ay = v1 / ry;
  const bx = u2 / rx;
  const by = v2 / ry;
  const px = u / rx;
  const py = v / ry;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

function markSegment(coverage, u1, v1, u2, v2, rx = 0.075, ry = 0.105) {
  let added = 0;
  for (let row = 0; row < coverage.rows; row++) {
    for (let col = 0; col < coverage.cols; col++) {
      const index = row * coverage.cols + col;
      if (!coverage.valid[index] || coverage.covered[index]) continue;
      const cellU = (col + 0.5) / coverage.cols;
      const cellV = (row + 0.5) / coverage.rows;
      if (segmentDistance(cellU, cellV, u1, v1, u2, v2, rx, ry) > 1) continue;
      coverage.covered[index] = 1;
      coverage.coveredCount++;
      coverage.masks.forEach((mask, zoneIndex) => {
        if (mask[index]) coverage.zoneCovered[zoneIndex]++;
      });
      added++;
    }
  }
  return added;
}

function stats(coverage, overallThreshold = 0.96, zoneThreshold = 0.9) {
  const overall = coverage.coveredCount / coverage.total;
  const minZone = Math.min(...coverage.totals.map((total, index) => coverage.zoneCovered[index] / total));
  return { overall, minZone, ready: overall >= overallThreshold && minZone >= zoneThreshold };
}

function nextPoint(coverage) {
  const coveredPoints = [];
  for (let index = 0; index < coverage.covered.length; index++) {
    if (!coverage.covered[index]) continue;
    coveredPoints.push({
      u: ((index % coverage.cols) + 0.5) / coverage.cols,
      v: (Math.floor(index / coverage.cols) + 0.5) / coverage.rows,
    });
  }
  let best = null;
  for (let index = 0; index < coverage.valid.length; index++) {
    if (!coverage.valid[index] || coverage.covered[index]) continue;
    const u = ((index % coverage.cols) + 0.5) / coverage.cols;
    const v = (Math.floor(index / coverage.cols) + 0.5) / coverage.rows;
    let nearest = coveredPoints.length ? Infinity : 0.25;
    for (const point of coveredPoints) {
      nearest = Math.min(nearest, (u - point.u) ** 2 + (v - point.v) ** 2);
    }
    let need = 0;
    coverage.masks.forEach((mask, zoneIndex) => {
      if (mask[index]) need = Math.max(need, 1 - coverage.zoneCovered[zoneIndex] / coverage.totals[zoneIndex]);
    });
    const score = nearest + need * 0.14;
    if (!best || score > best.score) best = { u, v, score };
  }
  return best;
}

const repeated = makeCoverage();
const firstAdded = markSegment(repeated, 0.32 - 0.022, 0.4, 0.32 + 0.022, 0.4);
assert.ok(firstAdded > 0, 'first mix stamp must add coverage');
assert.equal(markSegment(repeated, 0.32 - 0.022, 0.4, 0.32 + 0.022, 0.4), 0, 'same mix position must not add progress twice');

for (let stage = 0; stage < 3; stage++) {
  const coverage = makeCoverage();
  let presses = 0;
  while (!stats(coverage).ready && presses < 100) {
    const point = nextPoint(coverage);
    assert.ok(point, 'keyboard fallback must find an uncovered point');
    markSegment(coverage, point.u - 0.022, point.v, point.u + 0.022, point.v);
    presses++;
  }
  assert.ok(stats(coverage).ready, `mix stage ${stage} must be completable`);
  assert.ok(presses >= 20 && presses <= 80, `mix stage ${stage} has unreasonable input count: ${presses}`);
}

const savedLayout = JSON.parse(fs.readFileSync(path.join(root, 'bento/kitchen/saved-layout.json'), 'utf8'));
const maskLayout = savedLayout['.bowl-fill-mask|0'];
assert.ok(maskLayout, 'saved bowl fill mask is missing');
const logicalBowl = { width: Number.parseFloat(maskLayout.w), height: Number.parseFloat(maskLayout.h) };
for (const slot of potatoSlots) {
  const left = logicalBowl.width * slot.x - 29;
  const top = logicalBowl.height * slot.y - 29;
  assert.ok(left >= -0.001 && left + 58 <= logicalBowl.width + 0.001, `potato slot exceeds bowl width: ${JSON.stringify(slot)}`);
  assert.ok(top >= -0.001 && top + 58 <= logicalBowl.height + 0.001, `potato slot exceeds bowl height: ${JSON.stringify(slot)}`);
}

for (const [viewportWidth, viewportHeight] of [[390, 844], [740, 320], [844, 390], [1024, 768], [1366, 768]]) {
  const scale = Math.min(viewportWidth / 1600, viewportHeight / 900);
  const displayWidth = logicalBowl.width * scale;
  const displayHeight = logicalBowl.height * scale;
  const piece = 58 * scale;
  const lefts = potatoSlots.map((slot) => displayWidth * slot.x - piece / 2);
  const tops = potatoSlots.map((slot) => displayHeight * slot.y - piece / 2);
  assert.ok(Math.min(...lefts) >= -0.001 && Math.max(...lefts) + piece <= displayWidth + 0.001, `potato X overflow at ${viewportWidth}x${viewportHeight}`);
  assert.ok(Math.min(...tops) >= -0.001 && Math.max(...tops) + piece <= displayHeight + 0.001, `potato Y overflow at ${viewportWidth}x${viewportHeight}`);
  assert.ok((Math.max(...lefts) + piece - Math.min(...lefts)) / displayWidth >= 0.88, `potato scatter too narrow at ${viewportWidth}x${viewportHeight}`);
  assert.ok((Math.max(...tops) + piece - Math.min(...tops)) / displayHeight >= 0.8, `potato scatter too short at ${viewportWidth}x${viewportHeight}`);
}

const mashZones = [
  [
    { cx: 0.35, cy: 0.4, rx: 0.14, ry: 0.14 },
    { cx: 0.51, cy: 0.36, rx: 0.16, ry: 0.15 },
    { cx: 0.66, cy: 0.49, rx: 0.16, ry: 0.19 },
    { cx: 0.43, cy: 0.64, rx: 0.2, ry: 0.18 },
  ],
  [
    { cx: 0.36, cy: 0.43, rx: 0.2, ry: 0.18 },
    { cx: 0.64, cy: 0.43, rx: 0.2, ry: 0.18 },
    { cx: 0.36, cy: 0.62, rx: 0.2, ry: 0.18 },
    { cx: 0.64, cy: 0.62, rx: 0.2, ry: 0.18 },
  ],
];
const upperLeftContour = { u: 0.25, v: 0.22 };
const upperLeftInsideAccountingZone = mashZones[0].some((zone) => (
  ((upperLeftContour.u - zone.cx) / zone.rx) ** 2
  + ((upperLeftContour.v - zone.cy) / zone.ry) ** 2
) <= 1);
assert.equal(upperLeftInsideAccountingZone, false, 'regression point must stay outside accounting zones');
assert.ok(
  segmentDistance(
    upperLeftContour.u,
    upperLeftContour.v,
    9.5 / 36,
    6.5 / 22,
    9.5 / 36,
    6.5 / 22,
    0.07534,
    0.08855,
  ) < 1,
  'upper-left old contour must remain reachable by the visual masher brush',
);
for (let stage = 0; stage < mashZones.length; stage++) {
  const coverage = makeCoverage(mashZones[stage], 36, 22);
  const first = nextPoint(coverage);
  assert.ok(first, 'mash fallback must find an initial point');
  assert.ok(markSegment(coverage, first.u - 0.025, first.v, first.u + 0.025, first.v, 0.07534, 0.08855) > 0);
  assert.equal(markSegment(coverage, first.u - 0.025, first.v, first.u + 0.025, first.v, 0.07534, 0.08855), 0, 'same mash position must not add progress twice');
  let presses = 1;
  while (!stats(coverage, 0.98, 0.95).ready && presses < 80) {
    const point = nextPoint(coverage);
    assert.ok(point, 'mash fallback must keep finding uncovered cells');
    markSegment(coverage, point.u - 0.025, point.v, point.u + 0.025, point.v, 0.07534, 0.08855);
    presses++;
  }
  const finalStats = stats(coverage, 0.98, 0.95);
  assert.ok(finalStats.ready, `mash stage ${stage} must be completable`);
  assert.ok(finalStats.overall >= 0.98 && finalStats.minZone >= 0.95);
  assert.ok(presses >= 20 && presses <= 45, `mash stage ${stage} has unreasonable input count: ${presses}`);
}

const shapeRatios = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
  const morph = ratio * ratio * (3 - 2 * ratio);
  return {
    x: 0.75 + morph * (0.67 - 0.75),
    y: 0.85 + morph * (0.67 - 0.85),
    roughX: 0.95 + morph * (0.85 - 0.95),
    roughY: 1.05 + morph * (0.8 - 1.05),
    rx: 50,
    ry: 50,
  };
});
for (let index = 1; index < shapeRatios.length; index++) {
  assert.ok(shapeRatios[index].x < shapeRatios[index - 1].x, 'shape width must decrease continuously toward the guide');
  assert.ok(shapeRatios[index].y < shapeRatios[index - 1].y, 'shape height must decrease continuously');
  assert.ok(shapeRatios[index].roughX < shapeRatios[index - 1].roughX, 'rough shape width must decrease continuously');
  assert.ok(shapeRatios[index].roughY < shapeRatios[index - 1].roughY, 'rough shape height must decrease continuously');
  assert.ok(shapeRatios[index].x / shapeRatios[index].y > shapeRatios[index - 1].x / shapeRatios[index - 1].y, 'shape must become progressively more oval');
  assert.ok(shapeRatios[index].roughX / shapeRatios[index].roughY > shapeRatios[index - 1].roughX / shapeRatios[index - 1].roughY, 'rough layer must become progressively more oval');
  assert.equal(shapeRatios[index].rx, shapeRatios[index - 1].rx, 'flour silhouette must not be clipped horizontally');
  assert.equal(shapeRatios[index].ry, shapeRatios[index - 1].ry, 'flour silhouette must not be clipped vertically');
}
assert.equal(shapeRatios.at(-1).x, 0.67);
assert.equal(shapeRatios.at(-1).y, 0.67);
assert.equal(shapeRatios.at(-1).rx, 50);
assert.equal(shapeRatios.at(-1).ry, 50);

console.log('bento kitchen motion/mix/warp verification: PASS');
