const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'bento', 'kitchen.html'), 'utf8');

assert.match(source, /\.select-stage::before[\s\S]*?filter: brightness\(\.52\) saturate\(\.72\) blur\(4px\)/);
assert.match(source, /\.select-ingredient-grid[\s\S]*?overflow-y: auto[\s\S]*?scroll-snap-type: y mandatory/);
assert.match(source, /\.ingredient-carousel-row[\s\S]*?grid-template-columns: repeat\(3/);
assert.match(source, /scroll-snap-align: start/);
assert.match(source, /class="ingredient-scroll-hint"[\s\S]*?うえ・したに スワイプ/);
assert.match(source, /index % 3 === 0[\s\S]*?ingredient-carousel-row/);
assert.match(source, /carouselRow\.appendChild\(btn\)/);
assert.match(source, /\.select-stage \.ingredient-btn \.ingredient-name[\s\S]*?font-size: 1rem[\s\S]*?background: rgba\(255,255,255,\.94\)/);

console.log('bento kitchen ingredient vertical carousel regression: PASS');
