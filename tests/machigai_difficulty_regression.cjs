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

const stages = loadStages();
const expectedHardIds = ['jungle', 'bedroom', 'space', 'dino', 'festival', 'snow', 'castle'];
const allowedKinds = new Set(['shape', 'direction', 'pattern', 'position']);

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
  '既存の差分数カーブと星UIの収まりを維持する'
);

stages.forEach((stage) => {
  assert.match(stage.id, /^[a-z0-9]+$/, `${stage.id}: id形式`);
  assert.ok(fs.existsSync(path.join(ROOT, 'machigai', stage.imgA)), `${stage.id}: A画像が存在`);
  assert.ok(fs.existsSync(path.join(ROOT, 'machigai', stage.imgB)), `${stage.id}: B画像が存在`);
  assert.ok(fs.existsSync(path.join(ROOT, 'machigai', stage.thumb)), `${stage.id}: サムネイルが存在`);

  stage.differences.forEach((diff, index) => {
    assert.ok(isUnitInterval(diff.x), `${stage.id}[${index}]: x`);
    assert.ok(isUnitInterval(diff.y), `${stage.id}[${index}]: y`);
    assert.ok(isUnitInterval(diff.r) && diff.r > 0, `${stage.id}[${index}]: r`);
    assert.match(diff.label, /^[ぁ-んァ-ヶー ！]+$/, `${stage.id}[${index}]: 子ども向けかなラベル`);

    ['a', 'b'].forEach((side) => {
      if (!diff[side]) return;
      assert.ok(isUnitInterval(diff[side].x), `${stage.id}[${index}].${side}: x`);
      assert.ok(isUnitInterval(diff[side].y), `${stage.id}[${index}].${side}: y`);
      if (diff[side].r !== undefined) {
        assert.ok(isUnitInterval(diff[side].r) && diff[side].r > 0, `${stage.id}[${index}].${side}: r`);
      }
    });
  });

  if (stage.difficulty !== 'hard') {
    assert.equal(stage.variantBase, undefined, `${stage.id}: easy/mediumは従来B画像を使う`);
    return;
  }

  assert.equal(stage.variantBase, 'A', `${stage.id}: A画像を土台に局所差分を作る`);
  assert.ok(stage.differences.length >= 4, `${stage.id}: 高難度面は4差分以上`);
  stage.differences.forEach((diff, index) => {
    assert.ok(allowedKinds.has(diff.kind), `${stage.id}[${index}]: 単純な色/有無以外の種類`);
    assert.ok(diff.visual, `${stage.id}[${index}]: visual指定`);
    assert.ok(
      isUnitInterval(diff.visual.patchR) && diff.visual.patchR >= 0.055 && diff.visual.patchR <= 0.22,
      `${stage.id}[${index}]: モバイルでも見える局所サイズ`
    );
    const isChanged =
      (diff.visual.rotate || 0) !== 0 ||
      (diff.visual.scaleX || 1) !== 1 ||
      (diff.visual.scaleY || 1) !== 1 ||
      !!diff.a ||
      !!diff.b;
    assert.ok(isChanged, `${stage.id}[${index}]: 実際に形/向き/位置が変わる`);
  });
});

// A/B別座標の当たり判定を、既存共有座標と後方互換のまま利用できること。
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
  const stage = {
    id: 'side-points',
    differences: [{
      x: 0.5,
      y: 0.5,
      r: 0.05,
      label: 'ほし',
      a: { x: 0.2, y: 0.2 },
      b: { x: 0.8, y: 0.8 }
    }]
  };

  const bSession = sandbox.window.MSL.Game.createSession(stage);
  assert.equal(bSession.checkHit(0.2, 0.2, 'b').hit, false, 'B側でA座標を誤判定しない');
  assert.equal(bSession.checkHit(0.8, 0.8, 'b').hit, true, 'B側の実位置で判定する');

  const aSession = sandbox.window.MSL.Game.createSession(stage);
  assert.equal(aSession.checkHit(0.2, 0.2, 'a').hit, true, 'A側の実位置で判定する');

  const legacySession = sandbox.window.MSL.Game.createSession(stage);
  assert.equal(legacySession.checkHit(0.5, 0.5).hit, true, 'side省略時は共有座標へ後方互換');
}

console.log('machigai difficulty regression: PASS');
