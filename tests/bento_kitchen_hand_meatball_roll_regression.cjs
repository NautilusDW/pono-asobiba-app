const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'bento', 'kitchen.html'), 'utf8');

assert.doesNotMatch(source, /<span class="open">✋<\/span>|<span class="closed">✊<\/span>/);
assert.match(source, /prep-tutorial__hand[\s\S]*?hand_open_hover\.png/);
assert.match(source, /prep-tutorial__hand[\s\S]*?hand_grip\.png/);
assert.match(source, /<div class="prep-tutorial__label">ひきにくを つまもう<\/div>/);

assert.match(source, /function isPointInMeatballPan\(point\)[\s\S]*?panBounds\.width \* 0\.44[\s\S]*?panBounds\.height \* 0\.40/);
assert.match(source, /function findNearestInPanMeatballIndex\(point\)[\s\S]*?!ball\.inPan \|\| ball\.served[\s\S]*?bestIndex = index/);
assert.match(source, /state\.cookMeatballPhase === 'roll' && isPointInMeatballPan\(point\)[\s\S]*?findNearestInPanMeatballIndex\(point\)/);
assert.match(source, /classList\.toggle\('meatball-roll',[\s\S]*?state\.cookMeatballPhase === 'roll'/);

console.log('bento kitchen generated hands and meatball roll regression: PASS');
