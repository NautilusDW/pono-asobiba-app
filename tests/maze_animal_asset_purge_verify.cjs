'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
const mazeHtml = fs.readFileSync(path.join(root, 'maze/index.html'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'admin/index.html'), 'utf8');
const swSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const playHtml = fs.readFileSync(path.join(root, 'play.html'), 'utf8');
const stickerMain = fs.readFileSync(path.join(root, 'Prototypes/StickerBookThreeJS/main.js'), 'utf8');
const stickerIndex = fs.readFileSync(path.join(root, 'Prototypes/StickerBookThreeJS/index.html'), 'utf8');
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
function* walkImages(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkImages(file);
    else if (entry.isFile() && /\.(?:avif|gif|jpe?g|png|webp)$/i.test(entry.name)) yield file;
  }
}
for (const file of walkImages(path.join(root, 'assets'))) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    assert.equal(oldAssetHashes.has(hash), false, `retired animal bytes returned at ${path.relative(root, file)}`);
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : (pb <= pc ? b : c);
}

function readRgbaPngAlphaBounds(png, label) {
  assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a', `${label} has an invalid PNG signature`);
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  for (let offset = 8; offset + 12 <= png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    if (type === 'IHDR') {
      width = png.readUInt32BE(dataStart);
      height = png.readUInt32BE(dataStart + 4);
      bitDepth = png[dataStart + 8];
      colorType = png[dataStart + 9];
      interlace = png[dataStart + 12];
    } else if (type === 'IDAT') {
      idat.push(png.subarray(dataStart, dataStart + length));
    }
    offset = dataStart + length + 4;
    if (type === 'IEND') break;
  }
  assert.equal(bitDepth, 8, `${label} must be an 8-bit PNG`);
  assert.equal(colorType, 6, `${label} must be an RGBA PNG`);
  assert.equal(interlace, 0, `${label} must be non-interlaced for the alpha guard`);
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  assert.equal(inflated.length, (stride + 1) * height, `${label} has an unexpected scanline size`);
  let sourceOffset = 0;
  let previous = Buffer.alloc(stride);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const filter = inflated[sourceOffset++];
    const current = Buffer.allocUnsafe(stride);
    for (let i = 0; i < stride; i++) {
      const raw = inflated[sourceOffset++];
      const left = i >= bytesPerPixel ? current[i - bytesPerPixel] : 0;
      const up = previous[i];
      const upLeft = i >= bytesPerPixel ? previous[i - bytesPerPixel] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) predictor = paethPredictor(left, up, upLeft);
      else assert.equal(filter, 0, `${label} has unsupported PNG filter ${filter}`);
      current[i] = (raw + predictor) & 0xff;
    }
    for (let x = 0; x < width; x++) {
      if (current[x * bytesPerPixel + 3] <= 2) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    previous = current;
  }
  assert.ok(maxX >= minX && maxY >= minY, `${label} has no visible subject`);
  return {
    width,
    height,
    subjectWidth: maxX - minX + 1,
    subjectHeight: maxY - minY + 1,
    margins: [minX, width - 1 - maxX, minY, height - 1 - maxY],
  };
}

const canonicalIds = ['neko', 'inu', 'kuma', 'kirin', 'lion', 'zou'];
const subjectAspectRanges = {
  neko: [0.9, 1.25],
  inu: [0.75, 1.0],
  kuma: [0.9, 1.2],
  kirin: [0.5, 0.7],
  lion: [0.95, 1.3],
  zou: [1.15, 1.5],
};
const replacedAnimalVersion = '20260711-1225';
const swVersion = Number(swSource.match(/^const CACHE_VERSION = (\d+);/m)?.[1]);
const pageVersion = Number(playHtml.match(/const PAGE_CACHE_VERSION = (\d+);/)?.[1]);
assert.ok(swVersion >= 2094, 'the animal replacement must ship after cache v2093');
assert.equal(pageVersion, swVersion, 'Maze asset changes require play.html and sw.js cache versions to stay synced');
assert.match(mazeHtml, new RegExp(`const MAZE_REPLACED_ANIMAL_ASSET_VERSION = '\\?v=${replacedAnimalVersion}'`));
assert.match(stickerMain, new RegExp(`const REPLACED_ANIMAL_ASSET_VERSION = "${replacedAnimalVersion}"`));
const stickerModuleVersion = stickerIndex.match(/main\.js\?v=(\d{8})-(\d+)/);
assert.ok(stickerModuleVersion, 'StickerBook module must keep a dated cache-buster');
const [replacedDate, replacedBatch] = replacedAnimalVersion.split('-').map(Number);
assert.ok(
  Number(stickerModuleVersion[1]) > replacedDate
    || (Number(stickerModuleVersion[1]) === replacedDate && Number(stickerModuleVersion[2]) >= replacedBatch),
  `StickerBook module cache ${stickerModuleVersion[1]}-${stickerModuleVersion[2]} predates replaced animals`,
);
for (const id of canonicalIds) {
  const relative = `assets/images/quizland/illust/choice/${id}.png`;
  const png = fs.readFileSync(path.join(root, relative));
  assert.equal(png.toString('ascii', 1, 4), 'PNG', `${relative} is not PNG`);
  assert.equal(png.readUInt32BE(16), 512, `${relative} must keep a safe square canvas`);
  assert.equal(png.readUInt32BE(20), 512, `${relative} must keep a safe square canvas`);
  const bounds = readRgbaPngAlphaBounds(png, relative);
  assert.ok(Math.min(...bounds.margins) >= 32, `${relative} subject is too close to an edge: ${bounds.margins.join('/')}`);
  const subjectAspect = bounds.subjectWidth / bounds.subjectHeight;
  const [minAspect, maxAspect] = subjectAspectRanges[id];
  assert.ok(subjectAspect >= minAspect && subjectAspect <= maxAspect, `${relative} subject ratio is suspicious: ${subjectAspect.toFixed(3)}`);
  if (retiredIds.includes(id)) {
    assert.match(mazeHtml, new RegExp(`${id}: MAZE_QUIZ_IMG \\+ '${id}\\.png' \\+ MAZE_REPLACED_ANIMAL_ASSET_VERSION`));
    assert.match(stickerMain, new RegExp(`"assets/images/quizland/illust/choice/${id}\\.png"`));
  } else {
    assert.match(mazeHtml, new RegExp(`${id}: MAZE_QUIZ_IMG \\+ '${id}\\.png'`));
  }
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
  'Prototypes/StickerBookThreeJS/main.js',
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
