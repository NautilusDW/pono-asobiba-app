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
  'boil_edamame_raw_v2.png', 'boil_edamame_cooked.png',
];

for (const file of assets) {
  assert.ok(fs.existsSync(path.join(root, 'assets', 'images', 'bento', 'cooking', 'boil', file)), file + ' must exist');
}
for (let index = 1; index <= 12; index += 1) {
  const file = `edamame_pods/edamame_pod_${String(index).padStart(2, '0')}.png`;
  assert.ok(fs.existsSync(path.join(root, 'assets', 'images', 'bento', 'cooking', 'boil', file)), file + ' must exist');
}
assert.match(source, /id="workshop-boil-game"/);
assert.match(source, /const WORKSHOP_BOIL_FOODS = \{[\s\S]*?broccoli:[\s\S]*?edamame:/);
assert.match(source, /function updateWorkshopBoilVisual\(step\)[\s\S]*?boil_pot_cold\.png/);
assert.match(source, /boil_pot_cold\.png\?v=1350/);
assert.doesNotMatch(source.match(/function updateWorkshopBoilVisual\(step\)[\s\S]*?\n  function advanceWorkshopProgress/)[0], /boil_pot_hot\.png/);
assert.match(source, /class="workshop-boil-bubbles"/);
assert.match(source, /@keyframes workshopBoilBubble/);
assert.match(source, /stove_base\.webp/);
assert.match(source, /const WORKSHOP_PREP_RECIPES = \{[\s\S]*?edamame:/);
assert.doesNotMatch(source.match(/const WORKSHOP_PREP_RECIPES = \{[\s\S]*?\n  \};/)[0], /broccoli:/);
assert.match(source, /id: 'broccoli'[\s\S]*?imageBase: 'boil\/boil_broccoli_whole\.png'[\s\S]*?prepActions: \[\{ type: 'chop' \}\]/);
assert.match(source, /pieceCount: 5/);
assert.match(source, /kind: 'sprinkle'[\s\S]*?kind: 'rub'/);
assert.doesNotMatch(source.match(/edamame: \{ id: 'edamame-prep'[\s\S]*?\]\},/)[0], /kind: 'wash'/);
assert.match(source, /pieceCount: 8,[\s\S]*?pieceKind: 'edamame'/);
assert.match(source, /@keyframes workshopBoilConvection/);
assert.match(source, /class="workshop-edamame-prep"/);
assert.match(source, /function playEdamameSaltBurst\(\)/);
assert.match(source, /workshop-edamame-salt-particle/);
assert.doesNotMatch(source, /workshop-edamame-grains/);
assert.match(source, /effect\.className = 'workshop-boil-entry-effect'/);
assert.match(source, /\['ignite','コンロの ひを つけよう',1\][\s\S]*?\['salt','しおを いれよう',3\][\s\S]*?\['heat','おゆが わくまで まとう',1\]/);
assert.match(source, /startKitchenAmbient\('stove'\)/);
assert.match(source, /salt_shaker_still\.png/);
assert.match(source, /broccoli_floret_' \+ String\(n\)\.padStart\(3, '0'\)/);
assert.match(source, /class="workshop-boil-pieces"/);
assert.match(source, /class="workshop-boil-plate"/);
assert.match(source, /prep_plate\.png/);
assert.match(source, /--boil-water-left: 31\.5%; --boil-water-top: 18\.2%; --boil-water-width: 36\.6%; --boil-water-height: 33%/);
assert.match(source, /function playWorkshopBoilSaltBurst\(\)[\s\S]*?workshop-boil-salt-particle/);
assert.doesNotMatch(source, /workshop-boil-salt-grains|workshopSaltFall/);
assert.match(source, /class="workshop-boil-water-mask"/);
assert.match(source, /clip-path: ellipse\(50% 50% at 50% 50%\)/);
assert.match(source, /\.workshop-boil-pot \{[^}]*top: 2%/);
assert.match(source, /\.workshop-boil-salt \{[^}]*width: 11\.5%; left: 63%; top: 18%/);
assert.match(source, /\.workshop-boil-piece\.is-broccoli:not\(\.is-in-pot\) \{ width: 10\.5%; \}/);
assert.match(source, /\[\[12,69,-12\],\[20,69,8\],\[28,69,-5\],\[16,84,11\],\[24,84,-8\]\]/);
assert.match(source, /\.workshop-boil-water-mask \.workshop-boil-piece\.is-in-pot \{ width: 23%; \}/);
assert.match(source, /\[\[38,30,-24\],\[44,38,12\],\[50,28,-8\],\[56,38,27\],\[62,30,-18\]\]/);
assert.match(source, /--drift-duration/);
assert.match(source, /--drift-x1/);
assert.match(source, /--drift-y2/);
assert.match(source, /--drift-r3/);
assert.match(source, /is-drain\[data-stage="1"\][^}]*left: 68%; top: 8%; z-index: 9/);
assert.match(source, /is-drain\[data-stage="2"\][^}]*left: 63%; top: 60%/);
assert.match(source, /workshopSalt\.addEventListener\('pointermove'/);
assert.match(source, /classList\.toggle\('is-boiling'/);
assert.match(source, /needs: \['broccoli'\], startFromRaw: false/);
assert.match(source, /needs: \['edamame'\], startFromRaw: false/);
assert.match(source, /classList\.toggle\('is-boil-step', specializedBoil\)/);
assert.match(source, /\['ignite', 'salt', 'heat', 'boil', 'simmer', 'drain'\]\.includes\(step\.kind\)/);
assert.match(source, /\['simmer','ぐつぐつ ゆでよう',1\]/);
assert.match(source, /drainSpoon\.addEventListener\('pointermove'/);
assert.match(source, /step\.kind === 'drain'[\s\S]*?return;/);
assert.match(source, /id="workshop-boil-bowl" src="\.\.\/assets\/images\/bento\/cooking\/prep_plate\.png\?v=1353"/);
assert.match(source, /すくったら おさらへ はこぼう/);
assert.doesNotMatch(source, /is-drain\[data-stage="2"\][^}]*clip-path: ellipse/);

console.log('bento kitchen shared boiling system regression: PASS');
