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
assert.match(mixSource, /coverageAspect:\s*720 \/ 497/);
assert.equal((mixSource.match(/foodSrc:/g) || []).length, 4, 'mix must have four food-only states');
assert.doesNotMatch(mixSource, /revealNextOnly|solidRevealBrush|commitRevealStage/);
assert.doesNotMatch(mixSource, /mix_mince_potato_00[123]\.png/);
assert.match(html, /function drawContinuousKneadBlend\(/);
assert.match(html, /function drawLocalKneadCoverageReveal\(/);
assert.match(html, /globalCompositeOperation = 'destination-out'/);
assert.match(html, /globalCompositeOperation = 'destination-in'/);
assert.match(html, /getKneadWorkCanvas\('localCoverageComposite', canvas\)/);
assert.match(html, /foodCtx\.globalCompositeOperation = 'lighter'/);
assert.match(html, /ctx\.drawImage\(foodComposite, 0, 0\)/);
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
assert.doesNotMatch(shapeSource, /fixedShapeFrames/);
const shapeFoodRefs = [...shapeSource.matchAll(/shapeMeatSrc:\s*'([^']+)'/g)].map((match) => match[1]);
assert.equal(shapeFoodRefs.length, 3);
assert.equal(new Set(shapeFoodRefs).size, 1, 'all shape stages must warp the exact same food layer');
assert.match(html, /--shape-meat-scale-y', \(1 - morph \* 0\.38\)/);
assert.match(html, /--shape-clip-rx', \(50 - morph \* 12\)/);
assert.match(html, /function updateContinuousShapeWarpImpulse\(/);

const assetRefs = [...new Set([...html.matchAll(/'([^']+20260711_(?:1231|1237)\.png)'/g)].map((match) => match[1]))];
assert.ok(assetRefs.length >= 10, 'expected versioned mix and warp assets');
for (const src of assetRefs) {
  const file = path.resolve(path.dirname(htmlPath), src);
  assert.ok(fs.existsSync(file), `missing asset: ${src}`);
  const stat = fs.statSync(file);
  assert.ok(stat.size > 0 && stat.size < 3 * 1024 * 1024, `invalid asset size: ${src}`);
  const png = fs.readFileSync(file);
  assert.equal(png.toString('ascii', 1, 4), 'PNG', `not a PNG: ${src}`);
  assert.equal(png.readUInt32BE(16), 720, `unexpected width: ${src}`);
  assert.equal(png.readUInt32BE(20), 497, `unexpected height: ${src}`);
}

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

const centeredFoodSrc = [...mixSource.matchAll(/foodSrc:\s*'([^']+1237\.png)'/g)].map((match) => match[1])[0];
const centeredCompositeSrc = [...mixSource.matchAll(/src:\s*'([^']+1237\.png)'/g)].map((match) => match[1])[0];
assert.ok(centeredFoodSrc && centeredCompositeSrc, 'centered 1237 mix assets must be wired into step one');
const centeredFood = decodeRgbaPng(path.resolve(path.dirname(htmlPath), centeredFoodSrc));
const centeredComposite = decodeRgbaPng(path.resolve(path.dirname(htmlPath), centeredCompositeSrc));
const plate = decodeRgbaPng(path.join(root, 'assets/images/bento/cooking/prep_plate.png'));
let brownCount = 0;
let brownX = 0;
let brownLeft = 0;
let greenFringe = 0;
let edgeAlpha = 0;
let outsidePlateDiff = 0;
for (let y = 0; y < centeredFood.height; y++) {
  for (let x = 0; x < centeredFood.width; x++) {
    const index = (y * centeredFood.width + x) * 4;
    const r = centeredFood.data[index];
    const g = centeredFood.data[index + 1];
    const b = centeredFood.data[index + 2];
    const a = centeredFood.data[index + 3];
    if (a > 96 && r < 205 && g < 165 && b < 135 && r > g * 1.08) {
      brownCount++;
      brownX += x;
      if (x < centeredFood.width / 2) brownLeft++;
    }
    if (a > 0 && g > r * 1.22 && g > b * 1.22) greenFringe++;
    if ((x === 0 || y === 0 || x === centeredFood.width - 1 || y === centeredFood.height - 1) && a) edgeAlpha++;
    if (!a) {
      for (let channel = 0; channel < 4; channel++) {
        if (centeredComposite.data[index + channel] !== plate.data[index + channel]) {
          outsidePlateDiff++;
          break;
        }
      }
    }
  }
}
assert.ok(brownCount > 3000, 'centered mince must remain clearly visible');
assert.ok(Math.abs(brownX / brownCount - 360) <= 12, 'mince centroid must stay near the plate center');
assert.ok(brownLeft / brownCount >= 0.4 && brownLeft / brownCount <= 0.6, 'mince must be balanced left/right');
assert.ok(greenFringe <= 16, `too many green fringe pixels: ${greenFringe}`);
assert.equal(edgeAlpha, 0, 'food-only image must keep transparent outer edges');
assert.equal(outsidePlateDiff, 0, 'composite must preserve the static plate outside the food layer');

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
  return { y: 1 - morph * 0.38, rx: 50 - morph * 12, ry: 50 - morph * 15 };
});
for (let index = 1; index < shapeRatios.length; index++) {
  assert.ok(shapeRatios[index].y < shapeRatios[index - 1].y, 'shape height must decrease continuously');
  assert.ok(shapeRatios[index].rx < shapeRatios[index - 1].rx, 'shape horizontal clip must tighten continuously');
  assert.ok(shapeRatios[index].ry < shapeRatios[index - 1].ry, 'shape vertical clip must tighten continuously');
}
assert.equal(shapeRatios.at(-1).y, 0.62);
assert.equal(shapeRatios.at(-1).rx, 38);
assert.equal(shapeRatios.at(-1).ry, 35);

console.log('bento kitchen motion/mix/warp verification: PASS');
