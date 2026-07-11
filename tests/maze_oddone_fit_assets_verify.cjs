'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'maze/index.html'), 'utf8');
const nativeManifest = JSON.parse(fs.readFileSync(path.join(root, 'native/content-manifest.json'), 'utf8'));

let inlineCount = 0;
for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/\bsrc=/.test(match[1])) continue;
  inlineCount++;
  new vm.Script(match[2], { filename: `maze-inline-${inlineCount}.js` });
}
assert.equal(inlineCount, 4, 'unexpected Maze inline script count');

assert.match(html, /@media \(orientation: landscape\) and \(max-height: 560px\)/);
assert.match(html, /grid-template-columns: minmax\(170px, 0\.8fr\) minmax\(0, 1\.65fr\)/);
assert.match(html, /overflow-y: auto;/);
assert.match(html, /min-height: clamp\(56px, 18dvh, 76px\)/);
assert.match(html, /row\.className = 'row oddone-choice-grid'/);
assert.doesNotMatch(html, /row\.style\.maxWidth = '320px'/);

const landscapeFitCases = [
  { width: 740, height: 320 },
  { width: 844, height: 390 },
  { width: 851, height: 467 },
];
for (const viewport of landscapeFitCases) {
  const gap = Math.min(18, Math.max(10, viewport.width * 0.02));
  const cardWidth = Math.min(viewport.width - 20, 760);
  const innerWidth = cardWidth - 28; // 20px padding + 8px border
  const rightWidthAtLeftMinimum = innerWidth - 170 - gap;
  const buttonWidth = (rightWidthAtLeftMinimum - 6) / 2;
  const buttonHeight = Math.min(76, Math.max(56, viewport.height * 0.18));
  const rightContentHeight = 40 + 5 + buttonHeight * 2 + 6;
  assert.ok(buttonWidth >= 120, `${viewport.width}x${viewport.height} choices are too narrow`);
  assert.ok(rightContentHeight <= viewport.height - 40, `${viewport.width}x${viewport.height} choices do not fit vertically`);
}
const usesShortLandscapeLayout = (width, height) => width > height && height <= 560;
assert.equal(usesShortLandscapeLayout(1024, 768), false, '1024x768 must keep the regular tablet layout');
assert.equal(usesShortLandscapeLayout(390, 844), false, '390x844 must keep the portrait layout');

const expectedAnimals = {
  neko: 'assets/zukan/animals/flower_path/kitten.png',
  inu: 'assets/zukan/animals/flower_path/puppy.png',
  kuma: 'assets/zukan/animals/sunlit_forest/bear_cub.png',
  lion: 'assets/images/quizland/illust/stage/lion_osu.png',
  zou: 'assets/images/quizland/illust/stage/stage_trivia_long_nose_elephant.png',
};
assert.match(html, /neko: '\.\.\/assets\/zukan\/animals\/flower_path\/kitten\.png'/);
assert.match(html, /inu: '\.\.\/assets\/zukan\/animals\/flower_path\/puppy\.png'/);
assert.match(html, /kuma: '\.\.\/assets\/zukan\/animals\/sunlit_forest\/bear_cub\.png'/);
assert.match(html, /lion: MAZE_QUIZ_STAGE_IMG \+ 'lion_osu\.png'/);
assert.match(html, /zou: MAZE_QUIZ_STAGE_IMG \+ 'stage_trivia_long_nose_elephant\.png'/);
for (const relative of Object.values(expectedAnimals)) {
  const file = path.join(root, relative);
  const png = fs.readFileSync(file);
  assert.equal(png.toString('ascii', 1, 4), 'PNG', `${relative} is not PNG`);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.ok([4, 6].includes(png[25]), `${relative} must keep an alpha channel`);
  assert.ok(width / height >= 0.9, `${relative} is still portrait-heavy (${width}x${height})`);
  assert.ok(png.length < 3 * 1024 * 1024, `${relative} exceeds the repository image limit`);
}

assert.match(
  html,
  /return _mzAsset\(MAZE_ODDONE_ANIMAL_ASSETS\[name\] \|\| _mzVersionedAnimalSrc/,
  'odd-one choices must resolve through the generated natural-proportion animal map',
);
assert.doesNotMatch(html, /QUIZ_ODDONE[\s\S]*?_mzWord\('(neko|inu)'/);

const dataStart = html.indexOf('const MAZE_WORD_IMG');
const dataEnd = html.indexOf('// Simon-says:', dataStart);
assert.ok(dataStart >= 0 && dataEnd > dataStart, 'could not isolate Maze quiz data');
const quizContext = {};
vm.runInNewContext(
  html.slice(dataStart, dataEnd) + '\nthis.__oddone = QUIZ_ODDONE;',
  quizContext,
  { filename: 'maze-oddone-data.js' },
);
assert.equal(quizContext.__oddone.length, 15, 'unexpected odd-one question count');
for (const question of quizContext.__oddone) {
  assert.equal(question.items.length, 4, 'every odd-one question must keep four choices');
  for (const item of question.items) {
    const cleanSrc = item.src.split('?')[0];
    const file = path.resolve(root, 'maze', cleanSrc);
    assert.ok(fs.existsSync(file), `missing odd-one asset: ${item.src}`);
  }
}
const byLabel = new Map(
  quizContext.__oddone.flatMap((question) => question.items).map((item) => [item.label, item.src]),
);
assert.equal(byLabel.get('ねこ'), '../assets/zukan/animals/flower_path/kitten.png');
assert.equal(byLabel.get('いぬ'), '../assets/zukan/animals/flower_path/puppy.png');
assert.equal(byLabel.get('くま'), '../assets/zukan/animals/sunlit_forest/bear_cub.png');
assert.equal(byLabel.get('らいおん'), '../assets/images/quizland/illust/stage/lion_osu.png');
assert.equal(byLabel.get('ぞう'), '../assets/images/quizland/illust/stage/stage_trivia_long_nose_elephant.png');

const nativeSources = new Set(nativeManifest.entries.map((entry) => entry.source));
assert.ok(nativeSources.has('assets/images/maze'), 'native build must include Maze quiz art');
assert.ok(nativeSources.has('assets/images/word'), 'native build must include shared word art');
assert.ok(nativeSources.has('assets/images/quizland'), 'native build must include QuizLand animal art');
assert.ok(nativeSources.has('assets/zukan/animals'), 'native build must include generated Zukan animal art');
for (const question of quizContext.__oddone) {
  for (const item of question.items) {
    const file = path.resolve(root, 'maze', item.src.split('?')[0]);
    const repoRelative = path.relative(root, file).split(path.sep).join('/');
    const covered = nativeManifest.entries.some((entry) => {
      if (entry.type === 'file') return repoRelative === entry.source;
      if (entry.type === 'directory') return repoRelative === entry.source || repoRelative.startsWith(entry.source + '/');
      if (entry.type === 'file-list') {
        return entry.files.some((name) => repoRelative === entry.source + '/' + name);
      }
      return false;
    });
    assert.ok(covered, `native manifest does not cover ${repoRelative}`);
  }
}

console.log('maze odd-one fit/assets verification: PASS');
