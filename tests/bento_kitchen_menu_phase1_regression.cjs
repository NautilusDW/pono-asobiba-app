const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'bento', 'kitchen.html'), 'utf8');
const recipes = source.match(/const RECIPES = \[([\s\S]*?)\n  \];/);
assert.ok(recipes, 'recipe catalog must exist');

assert.match(recipes[1], /id: 'meatball'[\s\S]*?bento\/cooking\/meatball\/meatball_003_done\.png/);
assert.match(recipes[1], /id: 'yakizake'[\s\S]*?bento\/cooking\/salmon\/salmon_half_003_done\.png/);
assert.match(recipes[1], /id: 'korokke'[\s\S]*?cookIngredientId: 'potato'/);
assert.doesNotMatch(recipes[1], /id: 'korokke'[^\n]*cookIngredientId: 'korokke_raw'/);

const carrot = source.match(/id: 'carrot'[\s\S]*?imageBase: 'carrot\/carrot_001\.webp'/);
assert.ok(carrot, 'carrot config must exist');
assert.match(carrot[0], /recipeVariants:[\s\S]*?ninjin_ingen:[\s\S]*?ninjin_ingen\/ninjin_ingen_mid/);
assert.match(carrot[0], /recipeVariants:[\s\S]*?kinpira:[\s\S]*?kinpira\/kinpira_mid/);

assert.match(source, /activeRecipeId: ''/);
assert.match(source, /function startIngredientAction\(ing, actionIndex, recipeId\)[\s\S]*?state\.activeRecipeId = recipeId \|\| ''/);
assert.match(source, /startIngredientAction\(ing, cookActionIndex, rec && rec\.id\)/);
assert.match(source, /function getCookImageConfig\(ing, action\)[\s\S]*?recipeVariants\[state\.activeRecipeId\][\s\S]*?recipeConfig\[action\.type\]/);

console.log('bento kitchen phase 1 menu alignment regression: PASS');
