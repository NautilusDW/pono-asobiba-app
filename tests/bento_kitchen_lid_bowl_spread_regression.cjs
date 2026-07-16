const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'bento', 'kitchen.html'), 'utf8');

assert.match(source, /function clearEggLidEditorPoseForDrag\(\)[\s\S]*?removeProperty\('transform'\)/);
assert.match(source, /state\.cookEggLidBaseStyle\s*=\s*\{[\s\S]*?clearEggLidEditorPoseForDrag\(\);[\s\S]*?setPointerCapture/);

const scatter = source.match(/function addSingleCutPieceToBowl\(ing, burstIndex, burstCount\) \{([\s\S]*?)\n  function enforceBowlPieceLimit/);
assert.ok(scatter, 'cut-piece scatter function must exist');
assert.match(scatter[1], /const w = layer\.clientWidth \|\| layer\.offsetWidth \|\| rect\.width \|\| 80;/);
assert.match(scatter[1], /const h = layer\.clientHeight \|\| layer\.offsetHeight \|\| rect\.height \|\| 60;/);
assert.doesNotMatch(scatter[1], /const w = fixedSlots\.length\s*\?/);
assert.doesNotMatch(scatter[1], /const h = fixedSlots\.length\s*\?/);

console.log('bento kitchen lid and bowl spread regression: PASS');
