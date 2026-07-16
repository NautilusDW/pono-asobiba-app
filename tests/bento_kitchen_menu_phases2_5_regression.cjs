const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'bento', 'kitchen.html'), 'utf8');
const ids = [
  'tomato', 'broccoli', 'edamame', 'ichigo', 'mikan', 'ringo', 'kiwi', 'melon',
  'tamagoyaki', 'potato_salad', 'corn_spinach', 'napolitan', 'pineapple', 'momo',
  'gyoza', 'harumaki', 'bacon_maki', 'rice_ume', 'rice_goma', 'rice_furikake',
];

for (const id of ids) {
  assert.match(source, new RegExp("id: '" + id + "'"), id + ' recipe must exist');
}
assert.equal(new Set(ids).size, 20, 'workshop catalog must contain 20 unique standard recipes');
assert.match(source, /const WORKSHOP_RECIPES = \[[\s\S]*?\.map\(function \(recipe\)/);
assert.match(source, /recipe\.workshop = true/);
assert.match(source, /if \(rec\.workshop\) \{[\s\S]*?startWorkshopRecipe\(rec\)/);
assert.match(source, /WORKSHOP_DRAG_KINDS = new Set\(\[[\s\S]*?'wash'[\s\S]*?'wrap'[\s\S]*?'mash'/);
assert.match(source, /function setupWorkshopListeners\(\)[\s\S]*?pointerdown[\s\S]*?pointermove[\s\S]*?keydown/);
assert.match(source, /function finishWorkshopRecipe\(\)[\s\S]*?state\.unlockedRecipes\.add\(recipe\.id\)/);

const imagePaths = [...source.matchAll(/img: '(\.\.\/assets\/images\/[^']+)'/g)]
  .map((match) => match[1])
  .filter((item) => ids.some((id) => source.includes("id: '" + id + "'")));
for (const relative of imagePaths) {
  const file = path.resolve(root, 'bento', relative);
  assert.ok(fs.existsSync(file), 'referenced recipe art must exist: ' + relative);
}

for (const phrase of [
  '8つの くしがた', 'はんげつぎり', 'いちょうぎり', 'みじんぎり', 'こぐちぎり',
  'ほそぎり', 'ななめぎり', 'ひだを つけて', 'おこめを やさしく とごう',
]) {
  assert.ok(source.includes(phrase), 'specific cooking instruction missing: ' + phrase);
}

console.log('bento kitchen phases 2-5 menu workshop regression: PASS');
