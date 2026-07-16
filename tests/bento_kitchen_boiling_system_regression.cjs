const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'bento', 'kitchen.html'), 'utf8');
const assets = [
  'boil_pot_cold.png', 'boil_pot_hot.png', 'boil_spoon.png', 'boil_drain_bowl.png',
  'boil_broccoli_raw.png', 'boil_broccoli_cooked.png',
  'boil_broccoli_whole.png', 'broccoli_floret_001.png',
  'broccoli_floret_002.png', 'broccoli_floret_003.png',
  'broccoli_floret_004.png', 'broccoli_floret_005.png',
  'boil_edamame_raw.png', 'boil_edamame_cooked.png',
];

for (const file of assets) {
  assert.ok(fs.existsSync(path.join(root, 'assets', 'images', 'bento', 'cooking', 'boil', file)), file + ' must exist');
}
assert.match(source, /id="workshop-boil-game"/);
assert.match(source, /const WORKSHOP_BOIL_FOODS = \{[\s\S]*?broccoli:[\s\S]*?edamame:/);
assert.match(source, /function updateWorkshopBoilVisual\(step\)[\s\S]*?boil_pot_cold\.png/);
assert.doesNotMatch(source.match(/function updateWorkshopBoilVisual\(step\)[\s\S]*?\n  function advanceWorkshopProgress/)[0], /boil_pot_hot\.png/);
assert.match(source, /class="workshop-boil-bubbles"/);
assert.match(source, /@keyframes workshopBoilBubble/);
assert.match(source, /stove_base\.webp/);
assert.match(source, /const WORKSHOP_PREP_RECIPES = \{[\s\S]*?edamame:/);
assert.doesNotMatch(source.match(/const WORKSHOP_PREP_RECIPES = \{[\s\S]*?\n  \};/)[0], /broccoli:/);
assert.match(source, /id: 'broccoli'[\s\S]*?imageBase: 'boil\/boil_broccoli_whole\.png'[\s\S]*?prepActions: \[\{ type: 'chop' \}\]/);
assert.match(source, /pieceCount: 5/);
assert.match(source, /\['ignite','コンロの ひを つけよう',1\][\s\S]*?\['salt','しおを いれよう',3\][\s\S]*?\['heat','おゆが わくまで まとう',1\]/);
assert.match(source, /startKitchenAmbient\('stove'\)/);
assert.match(source, /salt_shaker_still\.png/);
assert.match(source, /broccoli_floret_' \+ String\(n\)\.padStart\(3, '0'\)/);
assert.match(source, /class="workshop-boil-pieces"/);
assert.match(source, /classList\.toggle\('is-boiling'/);
assert.match(source, /needs: \['broccoli'\], startFromRaw: false/);
assert.match(source, /needs: \['edamame'\], startFromRaw: false/);
assert.match(source, /classList\.toggle\('is-boil-step', specializedBoil\)/);
assert.match(source, /\['ignite', 'salt', 'heat', 'boil', 'drain'\]\.includes\(step\.kind\)/);

console.log('bento kitchen shared boiling system regression: PASS');
