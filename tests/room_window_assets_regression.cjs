const fs = require('fs');
const assert = require('assert');

const items = fs.readFileSync('room/items.js', 'utf8');
const windows = [
  ['furn_window_wood_square', 'きの しかくい まど'],
  ['furn_window_white_arch', 'しろい アーチまど'],
  ['furn_window_wood_curtain', 'カーテンつき まど'],
  ['furn_window_wood_round', 'きの まるまど'],
  ['furn_window_pink_heart', 'ピンクの ハートまど'],
  ['furn_window_blue_star', 'あおい ほしまど'],
];

for (const [id, name] of windows) {
  assert(items.includes(`id: '${id}'`), `${id} must remain registered`);
  assert(items.includes(`name: '${name}'`), `${id} must use its child-facing kana name`);
  for (const angle of ['A', 'B']) {
    const rel = `../assets/images/Rooms/furnitures_final/${id}_${angle}.png`;
    const disk = `assets/images/Rooms/furnitures_final/${id}_${angle}.png`;
    assert(items.includes(rel), `${id} ${angle} must use the local asset path`);
    assert(fs.existsSync(disk), `${disk} must exist`);
    assert(fs.statSync(disk).size < 3 * 1024 * 1024, `${disk} must stay below 3MB`);
  }
}

assert(!items.includes('raw.githubusercontent.com/NautilusDW/pono-asobiba-app/develop-app/assets/images/Rooms/furnitures_final/furn_window_'), 'window furniture must not depend on external raw image URLs');

console.log('PASS: six window items use local A/B assets and child-facing names');
