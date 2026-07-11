'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mazeHtml = fs.readFileSync(path.join(root, 'maze/index.html'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'admin/index.html'), 'utf8');
const reviewManifest = JSON.parse(fs.readFileSync(path.join(root, 'quizland/data/_review/image_manifest.json'), 'utf8'));

const retiredIds = ['neko', 'kuma', 'kirin', 'lion', 'zou'];
const deletedFiles = [
  ...retiredIds.map((id) => `assets/images/word/${id}.png`),
  'assets/images/quizland/illust/_sheets/used/sheet_animal_extras.png',
  'assets/images/quizland/illust/_sheets/used/sheet_animal_extras.webp',
  'tools/_maze_extracted.js',
  'tools/_check_only.js',
];
for (const relative of deletedFiles) {
  assert.equal(fs.existsSync(path.join(root, relative)), false, `retired file returned: ${relative}`);
}

const oldAssetHashes = new Set([
  '017f65855f71f7e98bac4fdd0e8dc59d1ed0fe5ef4597ebee17255da766dc175',
  '506d93ed27c3223008fb1030d3ebc9ba8663458106b9b6dbe903e0cb89e7de69',
  '7291ec4f57d5d8ab10888fe4fc9f8471a399913b1e40d4892b34a36a3b84fd80',
  '16e11a0ca17e003f5f09d006fb0d8ee64b12941b85ac6be3286d1a322898c2a9',
  'c629929b9626804f9cc0554176241264bd45276341fc69a3180e2e19960aeec0',
  '9b12b6b961859a6d7729feca267c50e16da21b74407371569fd0c171335d987e',
  'f4f9672a0cbfdba47293fcb36c027b7a909462e42d48e057b618f4ac2324dfa9',
  '6fd6ecf705ed0884686b31fc358a29e02b9aa63ba1f8493cc4bd6d2a618fbfdb',
  '79497ac90d969fccc3d5fc3ef2d83701adaea9190a416e0c53118a22e3d02af4',
  '073544deb9190f7da7fefcb57063791af092ea792d17e06806e0883a3a176458',
]);
const hashDirs = [
  'assets/images/word',
  'assets/images/quizland/illust/choice',
  'assets/images/quizland/illust/_sheets/used',
];
for (const relativeDir of hashDirs) {
  const dir = path.join(root, relativeDir);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(dir, entry.name);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    assert.equal(oldAssetHashes.has(hash), false, `retired animal bytes returned at ${path.relative(root, file)}`);
  }
}

const canonicalIds = ['neko', 'inu', 'kuma', 'kirin', 'lion', 'zou'];
for (const id of canonicalIds) {
  const relative = `assets/images/quizland/illust/choice/${id}.png`;
  const png = fs.readFileSync(path.join(root, relative));
  assert.equal(png.toString('ascii', 1, 4), 'PNG', `${relative} is not PNG`);
  assert.equal(png.readUInt32BE(16), 512, `${relative} must keep a safe square canvas`);
  assert.equal(png.readUInt32BE(20), 512, `${relative} must keep a safe square canvas`);
  assert.match(mazeHtml, new RegExp(`${id}: MAZE_QUIZ_IMG \\+ '${id}\\.png'`));
  assert.match(adminHtml, new RegExp(`${id}: '\\.\\.\\/assets\\/images\\/quizland\\/illust\\/choice\\/${id}\\.png'`));
}
for (const id of retiredIds) {
  const entry = reviewManifest.images.find((item) => item.id === id);
  assert.ok(entry, `review manifest is missing canonical ${id}`);
  assert.equal(entry.source_sheet, null, `${id} must not be regenerated from an old crop sheet`);
}
assert.doesNotMatch(mazeHtml, /puppy\.png/, 'the tight puppy crop must not return to Maze');
assert.doesNotMatch(mazeHtml, /MAZE_RECROPPED_ANIMAL_VERSION|_mzVersionedAnimalSrc|MAZE_ODDONE_ANIMAL_ASSETS/);

const activeTextFiles = [
  'admin/index.html',
  'maze/index.html',
  'Prototypes/StickerBookThreeJS/README.md',
  'Prototypes/StickerBookThreeJS/sticker_book_content_plan.json',
  ...fs.readdirSync(path.join(root, 'quizland/data/_review'))
    .filter((name) => /\.(?:json|md|html|js)$/i.test(name))
    .map((name) => `quizland/data/_review/${name}`),
];
for (const relative of activeTextFiles) {
  const text = fs.readFileSync(path.join(root, relative), 'utf8');
  for (const id of retiredIds) {
    const deletedWordPath = ['assets', 'images', 'word', `${id}.png`].join('/');
    assert.equal(text.includes(deletedWordPath), false, `${relative} still points at ${deletedWordPath}`);
  }
  const deletedSheetId = ['sheet', 'animal', 'extras'].join('_');
  assert.equal(text.includes(deletedSheetId), false, `${relative} can still revive the retired source sheet`);
}

console.log('maze animal asset purge verification: PASS');
