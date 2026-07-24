const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

function loadStages() {
  const sandbox = { window: {} };
  const source = fs.readFileSync(path.join(ROOT, 'machigai/data/stages.js'), 'utf8');
  vm.runInNewContext(source, sandbox, { filename: 'machigai/data/stages.js' });
  return sandbox.window.STAGE_DATA.stages;
}

function isUnitInterval(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function readWebpSize(filePath) {
  const bytes = fs.readFileSync(filePath);
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `${filePath}: RIFF`);
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', `${filePath}: WEBP`);
  const format = bytes.toString('ascii', 12, 16);

  if (format === 'VP8 ') {
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff
    };
  }
  if (format === 'VP8L') {
    const packed = bytes.readUInt32LE(21);
    return {
      width: (packed & 0x3fff) + 1,
      height: ((packed >>> 14) & 0x3fff) + 1
    };
  }
  if (format === 'VP8X') {
    return {
      width: bytes.readUIntLE(24, 3) + 1,
      height: bytes.readUIntLE(27, 3) + 1
    };
  }
  assert.fail(`${filePath}: unsupported WebP format ${format}`);
}

const stages = loadStages();
const expectedHardIds = ['jungle', 'bedroom', 'space', 'dino', 'festival', 'snow', 'castle'];
const allowedKinds = new Set(['shape', 'direction', 'pattern']);
const expectedClarityTargets = {
  jungle: [
    { index: 0, label: 'おうむの はね', kind: 'pattern', minRadius: 0.085 },
    { index: 1, label: 'さるの しっぽ', kind: 'shape', minRadius: 0.095 },
    { index: 2, label: 'きりんの もよう', kind: 'pattern', minRadius: 0.080 }
  ],
  bedroom: [
    { index: 0, label: 'おつきさまの むき', kind: 'direction', minRadius: 0.095 },
    { index: 1, label: 'うさぎの みみ', kind: 'direction', minRadius: 0.085 },
    { index: 2, label: 'ぞうの はな', kind: 'direction', minRadius: 0.105 },
    { index: 3, label: 'まくらの かたち', kind: 'shape', minRadius: 0.075 }
  ],
  castle: [
    { index: 3, label: 'どらごんの はね', kind: 'shape', minRadius: 0.100 },
    { index: 4, label: 'かんむりの おおきさ', kind: 'shape', minRadius: 0.090 }
  ]
};
const expectedRegeneratedHits = {
  jungle: [
    { x: 0.160, y: 0.205, r: 0.095 },
    { x: 0.432, y: 0.330, r: 0.100 },
    { x: 0.767, y: 0.628, r: 0.085 },
    { x: 0.215, y: 0.635, r: 0.115 }
  ],
  bedroom: [
    { x: 0.228, y: 0.200, r: 0.095 },
    { x: 0.700, y: 0.370, r: 0.085 },
    { x: 0.235, y: 0.665, r: 0.105 },
    { x: 0.540, y: 0.310, r: 0.075 }
  ]
};

assert.equal(stages.length, 15, '15ステージを維持する');
assert.deepEqual(
  Array.from(stages, (stage) => stage.difficulty),
  [
    'easy', 'easy', 'easy', 'easy', 'easy',
    'medium', 'medium', 'medium',
    'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard'
  ],
  '5 easy / 3 medium / 7 hard の段階を維持する'
);
assert.deepEqual(
  Array.from(stages.filter((stage) => stage.difficulty === 'hard'), (stage) => stage.id),
  expectedHardIds,
  '後半7面だけを高難度化する'
);
assert.deepEqual(
  Array.from(stages, (stage) => stage.differences.length),
  [3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5],
  '差分数は3→4→5の既存カーブを維持する'
);

Object.entries(expectedClarityTargets).forEach(([stageId, targets]) => {
  const stage = stages.find((candidate) => candidate.id === stageId);
  assert.ok(stage, `${stageId}: 再調整対象が存在`);
  targets.forEach((target) => {
    const diff = stage.differences[target.index];
    assert.equal(diff.label, target.label, `${stageId}[${target.index}]: 納得できる差のラベル`);
    assert.equal(diff.kind, target.kind, `${stageId}[${target.index}]: 差の意味`);
    assert.ok(diff.r >= target.minRadius, `${stageId}[${target.index}]: 小画面向けhit radius`);
  });
});

Object.entries(expectedRegeneratedHits).forEach(([stageId, expectedHits]) => {
  const stage = stages.find((candidate) => candidate.id === stageId);
  assert.deepEqual(
    Array.from(stage.differences, ({ x, y, r }) => ({ x, y, r })),
    expectedHits,
    `${stageId}: 再生成した対象の中心とタップ範囲`
  );
});

stages.forEach((stage) => {
  assert.match(stage.id, /^[a-z0-9]+$/, `${stage.id}: id形式`);
  const assetPaths = [stage.imgA, stage.imgB, stage.thumb].map((asset) =>
    path.join(ROOT, 'machigai', asset)
  );
  assetPaths.forEach((assetPath) => {
    assert.ok(fs.existsSync(assetPath), `${stage.id}: ${assetPath} が存在`);
    assert.ok(fs.statSync(assetPath).size < 3 * 1024 * 1024, `${stage.id}: 画像は3MB未満`);
  });

  stage.differences.forEach((diff, index) => {
    assert.ok(isUnitInterval(diff.x), `${stage.id}[${index}]: x`);
    assert.ok(isUnitInterval(diff.y), `${stage.id}[${index}]: y`);
    assert.ok(isUnitInterval(diff.r) && diff.r > 0, `${stage.id}[${index}]: r`);
    assert.match(diff.label, /^[ぁ-んァ-ヶー ！]+$/, `${stage.id}[${index}]: 子ども向けかなラベル`);
  });

  if (stage.difficulty !== 'hard') return;

  const aPath = path.join(ROOT, 'machigai', stage.imgA);
  const bPath = path.join(ROOT, 'machigai', stage.imgB);
  assert.notDeepEqual(fs.readFileSync(aPath), fs.readFileSync(bPath), `${stage.id}: A/B画像は別内容`);
  assert.deepEqual(readWebpSize(aPath), { width: 1024, height: 1024 }, `${stage.id}: A画像サイズ`);
  assert.deepEqual(readWebpSize(bPath), { width: 1024, height: 1024 }, `${stage.id}: B画像サイズ`);
  assert.equal(stage.variantBase, undefined, `${stage.id}: 生成済みB画像を直接使う`);
  assert.ok(stage.differences.length >= 4, `${stage.id}: 高難度面は4差分以上`);
  stage.differences.forEach((diff, index) => {
    assert.ok(allowedKinds.has(diff.kind), `${stage.id}[${index}]: 形・向き・模様の差`);
    assert.ok(diff.r >= 0.060, `${stage.id}[${index}]: モバイルのタップ範囲`);
    assert.equal(diff.visual, undefined, `${stage.id}[${index}]: CSS変形に依存しない`);
  });
});

{
  const sandbox = {
    window: {
      STAGE_DATA: { stages: [] },
      MSL: {},
      localStorage: {
        getItem() { return null; },
        setItem() {}
      }
    },
    Math
  };
  const source = fs.readFileSync(path.join(ROOT, 'machigai/js/game.js'), 'utf8');
  vm.runInNewContext(source, sandbox, { filename: 'machigai/js/game.js' });

  stages.filter((stage) => stage.difficulty === 'hard').forEach((stage) => {
    const session = sandbox.window.MSL.Game.createSession(stage);
    stage.differences.forEach((diff, index) => {
      const result = session.checkHit(diff.x, diff.y);
      assert.equal(result.hit, true, `${stage.id}[${index}]: 指定位置で見つかる`);
    });
    assert.equal(session.state.foundCount, stage.differences.length, `${stage.id}: 全差分を完了できる`);
  });
}

console.log('machigai difficulty regression: PASS');
