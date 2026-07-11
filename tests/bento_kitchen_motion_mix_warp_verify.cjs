'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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

assert.match(html, /coverageBrushScale:\s*0\.62,[\s\S]*?coverageGrid:\s*\{ cols: 36, rows: 22 \}/);
assert.match(html, /coverageThreshold:\s*0\.9,[\s\S]*?coverageMinZoneRatio:\s*0\.8/);

const mixStart = html.indexOf('mix_mince_potato: {');
const mixEnd = html.indexOf('mix_mince_onion: {', mixStart);
assert.ok(mixStart >= 0 && mixEnd > mixStart, 'mix_mince_potato config is missing');
const mixSource = html.slice(mixStart, mixEnd);
assert.match(mixSource, /continuousBlend:\s*true/);
assert.match(mixSource, /mixCoverage:\s*true/);
assert.match(mixSource, /coverageThreshold:\s*0\.78/);
assert.match(mixSource, /coverageMinZoneRatio:\s*0\.54/);
assert.match(mixSource, /coverageBrushRadius:\s*\{ rx: 0\.075, ry: 0\.105 \}/);
assert.match(mixSource, /coverageGrid:\s*\{ cols: 30, rows: 18 \}/);
assert.match(mixSource, /coverageAspect:\s*720 \/ 497/);
assert.equal((mixSource.match(/foodSrc:/g) || []).length, 4, 'mix must have four food-only states');
assert.doesNotMatch(mixSource, /revealNextOnly|solidRevealBrush|commitRevealStage/);
assert.doesNotMatch(mixSource, /mix_mince_potato_00[123]\.png/);
assert.match(html, /function drawContinuousKneadBlend\(/);
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

const assetRefs = [...new Set([...html.matchAll(/'([^']+20260711_1231\.png)'/g)].map((match) => match[1]))];
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

const zones = [
  { cx: 0.32, cy: 0.4, rx: 0.17, ry: 0.17 },
  { cx: 0.5, cy: 0.38, rx: 0.17, ry: 0.17 },
  { cx: 0.68, cy: 0.4, rx: 0.17, ry: 0.17 },
  { cx: 0.32, cy: 0.62, rx: 0.17, ry: 0.17 },
  { cx: 0.5, cy: 0.64, rx: 0.17, ry: 0.17 },
  { cx: 0.68, cy: 0.62, rx: 0.17, ry: 0.17 },
];

function makeCoverage() {
  const cols = 30;
  const rows = 18;
  const valid = new Uint8Array(cols * rows);
  const covered = new Uint8Array(cols * rows);
  const masks = zones.map(() => new Uint8Array(cols * rows));
  const totals = zones.map(() => 0);
  let total = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const u = (col + 0.5) / cols;
      const v = (row + 0.5) / rows;
      zones.forEach((zone, zoneIndex) => {
        const inside = ((u - zone.cx) / zone.rx) ** 2 + ((v - zone.cy) / zone.ry) ** 2 <= 1;
        if (!inside) return;
        masks[zoneIndex][index] = 1;
        totals[zoneIndex]++;
        valid[index] = 1;
      });
      if (valid[index]) total++;
    }
  }
  return { cols, rows, valid, covered, masks, totals, zoneCovered: zones.map(() => 0), total, coveredCount: 0 };
}

function mark(coverage, u, v) {
  let added = 0;
  for (let row = 0; row < coverage.rows; row++) {
    for (let col = 0; col < coverage.cols; col++) {
      const index = row * coverage.cols + col;
      if (!coverage.valid[index] || coverage.covered[index]) continue;
      const cellU = (col + 0.5) / coverage.cols;
      const cellV = (row + 0.5) / coverage.rows;
      if (((cellU - u) / 0.075) ** 2 + ((cellV - v) / 0.105) ** 2 > 1) continue;
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

function stats(coverage) {
  const overall = coverage.coveredCount / coverage.total;
  const minZone = Math.min(...coverage.totals.map((total, index) => coverage.zoneCovered[index] / total));
  return { overall, minZone, ready: overall >= 0.78 && minZone >= 0.54 };
}

function nextPoint(coverage) {
  let best = null;
  for (let index = 0; index < coverage.valid.length; index++) {
    if (!coverage.valid[index] || coverage.covered[index]) continue;
    const u = ((index % coverage.cols) + 0.5) / coverage.cols;
    const v = (Math.floor(index / coverage.cols) + 0.5) / coverage.rows;
    let need = 0;
    coverage.masks.forEach((mask, zoneIndex) => {
      if (mask[index]) need = Math.max(need, 1 - coverage.zoneCovered[zoneIndex] / coverage.totals[zoneIndex]);
    });
    if (!best || need > best.need) best = { u, v, need };
  }
  return best;
}

const repeated = makeCoverage();
const firstAdded = mark(repeated, 0.32, 0.4);
assert.ok(firstAdded > 0, 'first mix stamp must add coverage');
assert.equal(mark(repeated, 0.32, 0.4), 0, 'same mix position must not add progress twice');

for (let stage = 0; stage < 3; stage++) {
  const coverage = makeCoverage();
  let presses = 0;
  while (!stats(coverage).ready && presses < 100) {
    const point = nextPoint(coverage);
    assert.ok(point, 'keyboard fallback must find an uncovered point');
    mark(coverage, point.u, point.v);
    presses++;
  }
  assert.ok(stats(coverage).ready, `mix stage ${stage} must be completable`);
  assert.ok(presses >= 10 && presses <= 60, `mix stage ${stage} has unreasonable input count: ${presses}`);
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
