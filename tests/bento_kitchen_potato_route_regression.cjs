const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'bento', 'kitchen.html'), 'utf8');
const potato = source.match(/id: 'potato'[\s\S]*?imageBase: 'potato\/potato_001'/);
assert.ok(potato, 'potato ingredient config must exist');

const cooking = potato[0].match(/cookingActions:\s*\[([\s\S]*?)\],\s*prepActions:/);
const prep = potato[0].match(/prepActions:\s*\[([\s\S]*?)\],\s*imageBase:/);
assert.ok(cooking, 'potato cooking actions must exist');
assert.ok(prep, 'potato prep actions must exist');

assert.match(cooking[1], /type: 'chop'/);
['mash_potato', 'mix_mince_potato', 'shape_korokke', 'bread_korokke'].forEach(kind => {
  assert.match(cooking[1], new RegExp(`prepKind: '${kind}'`));
});
assert.match(cooking[1], /type: 'fry'/);

assert.match(prep[1], /type: 'chop'/);
assert.doesNotMatch(prep[1], /prepKind:|type: 'fry'/);

console.log('bento kitchen potato prep/cook route regression: PASS');
