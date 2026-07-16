const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'bento', 'kitchen.html'), 'utf8');

assert.match(source, /function clearEggLidEditorPoseForDrag\(\)[\s\S]*?removeProperty\('transform'\)/);
assert.match(source, /state\.cookEggLidBaseStyle\s*=\s*\{[\s\S]*?clearEggLidEditorPoseForDrag\(\);[\s\S]*?setPointerCapture/);
assert.match(source, /\.egg-glass-lid\s*\{[\s\S]*?touch-action:\s*none;/);
assert.match(source, /addEventListener\('pointercancel', onEggLidPointerCancel\)/);
assert.match(source, /function onEggLidPointerCancel\(evt\)[\s\S]*?resetEggLidToHome\(\);/);
const cancelHandler = source.match(/function onEggLidPointerCancel\(evt\) \{([\s\S]*?)\n  \}/);
assert.ok(cancelHandler, 'egg lid pointercancel handler must exist');
assert.doesNotMatch(cancelHandler[1], /moveEggLidToPoint\s*\(/);
assert.match(source, /const lidCenterY = \(\(toolRect\.top \+ toolRect\.height \* 0\.32/);
assert.match(source, /#grill-stage\[data-ingredient="egg"\]\.is-served \.cooking-food\s*\{[\s\S]*?top:\s*64%;/);

const recipes = source.match(/const RECIPES = \[([\s\S]*?)\n  \];/);
assert.ok(recipes, 'recipe catalog must exist');
[
  'bento/cooking/mince_patty/patty_003_done.png',
  'bento/cooking/wiener/wiener_003_done.png',
  'bento/cooking/chicken/fry/chicken_fry_piece_01_done.png',
  'bento/cooking/shrimp/shrimp_003_done.png',
  'bento/cooking/korokke/korokke_003_done.png',
  'bento/cooking/cabbage/cabbage_002.png',
  'bento/free-layout/okazu_ninjin_ingen.png',
].forEach(asset => assert.match(recipes[1], new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
['hamburg2.webp', 'tako_wiener2.webp', 'ebi_fry2.webp', 'korokke2.webp', 'ninjin_ingen2.webp', 'karaage_pieces_done.png', 'cabbage_shreds_patch_medium.png']
  .forEach(asset => assert.doesNotMatch(recipes[1], new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
assert.match(recipes[1], /id: 'tako_wiener'[\s\S]*?clusterImages:\s*\[[\s\S]*?wiener_003_done\.png[\s\S]*?wiener_003_done\.png/);
assert.match(recipes[1], /id: 'karaage'[\s\S]*?clusterImages:\s*\[[\s\S]*?chicken_fry_piece_01_done\.png[\s\S]*?chicken_fry_piece_02_done\.png/);

const scatter = source.match(/function addSingleCutPieceToBowl\(ing, burstIndex, burstCount\) \{([\s\S]*?)\n  function enforceBowlPieceLimit/);
assert.ok(scatter, 'cut-piece scatter function must exist');
assert.match(scatter[1], /const w = layer\.clientWidth \|\| layer\.offsetWidth \|\| rect\.width \|\| 80;/);
assert.match(scatter[1], /const h = layer\.clientHeight \|\| layer\.offsetHeight \|\| rect\.height \|\| 60;/);
assert.doesNotMatch(scatter[1], /const w = fixedSlots\.length\s*\?/);
assert.doesNotMatch(scatter[1], /const h = fixedSlots\.length\s*\?/);

console.log('bento kitchen lid and bowl spread regression: PASS');
