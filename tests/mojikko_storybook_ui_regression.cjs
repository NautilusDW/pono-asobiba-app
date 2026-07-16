#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'writing-mori/index.html'), 'utf8');
const nativeManifest = JSON.parse(fs.readFileSync(path.join(root, 'native/content-manifest.json'), 'utf8'));

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `missing source range: ${start} -> ${end}`);
  return source.slice(startIndex, endIndex);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeManifestSource(value) {
  return path.posix.normalize(String(value || '').replaceAll('\\', '/').replace(/^\.\//, '')).replace(/\/$/, '');
}

function normalizeWritingAssetLiteral(value) {
  const withoutQueryOrHash = value.split(/[?#]/, 1)[0];
  return normalizeManifestSource(path.posix.join('writing-mori', withoutQueryOrHash));
}

function getManifestCoverage(entries) {
  const exactFiles = new Set();
  const directories = [];
  for (const entry of entries) {
    const source = normalizeManifestSource(entry.source);
    if (entry.type === 'directory') {
      directories.push(source);
      continue;
    }
    if (entry.type === 'file') {
      exactFiles.add(source);
      continue;
    }
    if (entry.type === 'file-list') {
      for (const file of entry.files || []) {
        exactFiles.add(normalizeManifestSource(path.posix.join(source, file)));
      }
    }
  }
  return {
    covers(source) {
      return exactFiles.has(source) || directories.some((directory) => source.startsWith(`${directory}/`));
    }
  };
}

assert.doesNotMatch(html, /DotGothic16|--pixel-font/, 'retro dot font must not return');
assert.match(
  html,
  /family=Zen\+Maru\+Gothic:wght@500;700;900/,
  'the child-facing UI must request Zen Maru Gothic'
);
assert.match(
  html,
  /--round-font:\s*'Zen Maru Gothic',\s*'Hiragino Maru Gothic ProN',\s*sans-serif/,
  'the rounded UI font stack must remain explicit'
);
assert.match(
  html,
  /--moji-font:\s*'Yu Mincho',\s*'Hiragino Mincho ProN',\s*'Hiragino Mincho Pro',\s*serif/,
  'the exemplar fallback must remain a Mincho stack'
);
assert.match(html, /#writerTarget\s*\{\s*font-family:\s*var\(--moji-font\)/);
assert.match(html, /\.stroke-preview\s*\{[^}]*font-family:\s*var\(--moji-font\)/s);

const expectedStoryAssets = [
  'assets/images/mojikko/care/yard_background_wide_v2.png',
  'assets/zukan/ui/hint_panel_empty.webp',
  'assets/zukan/ui/discovery_popup_empty.webp',
  'assets/zukan/ui/investigation_window_frame_16x9.png',
  'assets/zukan/ui/map_guide_note_empty_220x780.png',
  'assets/images/quizland/Fukuro_frame_001.webp',
  'assets/images/quizland/Fukuro_frame_002.webp',
  'assets/images/quizland/Fukuro_frame_004.webp',
  'assets/images/quizland/quizland_difficulty_button_normal_gpt_image2_20260622.png',
  'assets/images/quizland/quizland_difficulty_button_pressed_gpt_image2_20260622.png',
  'assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_ui_page_label_wood_canvas_20260623.png',
  'assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_ui_page_label_pressed_gpt_image2_20260713.png',
  'assets/images/quizland/Fukuro_frame_002_pressed_TL.png',
  'assets/images/quizland/Fukuro_frame_002_pressed_TR.png',
  'assets/images/quizland/Fukuro_frame_002_pressed_BL.png',
  'assets/images/quizland/Fukuro_frame_002_pressed_BR.png',
  'assets/_legacy/preview-placeholders/ctrl-btn-settings.png',
  'assets/images/quizland/quizland_difficulty_star_gold_gpt_image2_20260623.png',
  'assets/images/Bento_parts/cookie.webp',
  'assets/images/nazonazo-tunnel/quiz-art/quiz_onigiri_20260714.webp',
  'assets/images/nazonazo-tunnel/quiz-art/quiz_pencil_20260714.webp',
  'assets/images/mojikko/writing/storybook/icon_moji_milk_20260716.webp',
  'assets/images/mojikko/writing/storybook/word_himawari_20260716.webp',
  'assets/images/mojikko/writing/storybook/milmaru_grown_wave_20260716.webp',
  'assets/images/mojikko/writing/storybook/milmaru_yochiyochi_front_20260716.webp',
  'assets/images/mojikko/writing/storybook/milmaru_shell_baby_idle_20260716.webp',
  'assets/images/mojikko/writing/storybook/milmaru_egg_idle_20260716.webp'
];
for (const relative of expectedStoryAssets) {
  const file = path.join(root, relative);
  assert.ok(fs.existsSync(file), `missing storybook asset: ${relative}`);
  assert.ok(fs.statSync(file).size > 0, `empty storybook asset: ${relative}`);
  assert.ok(fs.statSync(file).size < 3 * 1024 * 1024, `storybook asset exceeds 3MB: ${relative}`);
}

assert.ok(Array.isArray(nativeManifest.entries), 'native content manifest entries are missing');
const writingAssetLiterals = new Set();
for (const match of html.matchAll(/(['"])(\.\.\/assets\/[^'"\r\n]+)\1/g)) {
  const literal = match[2];
  if (literal.includes('${')) continue;
  if (!/\.[a-z0-9]+(?:[?#].*)?$/i.test(literal)) continue;
  const normalized = normalizeWritingAssetLiteral(literal);
  assert.match(normalized, /^assets\//, `writing asset literal escaped the asset root: ${literal}`);
  writingAssetLiterals.add(normalized);
}
assert.ok(writingAssetLiterals.size > 0, 'no literal writing assets were found for native coverage');

const nativeCoverage = getManifestCoverage(nativeManifest.entries);
const uncoveredWritingAssets = [...writingAssetLiterals].filter((source) => !nativeCoverage.covers(source)).sort();
assert.deepEqual(
  uncoveredWritingAssets,
  [],
  `native content manifest misses literal writing assets:\n${uncoveredWritingAssets.join('\n')}`
);

const nativeCoverageRegressions = [
  'assets/zukan/ui/discovery_popup_empty.webp',
  'assets/zukan/ui/hint_panel_empty.webp',
  'assets/zukan/ui/investigation_window_frame_16x9.png',
  'assets/zukan/ui/map_guide_note_empty_220x780.png',
  'assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_ui_page_label_pressed_gpt_image2_20260713.png'
];
for (const source of nativeCoverageRegressions) {
  assert.ok(writingAssetLiterals.has(source), `${source}: native regression asset escaped literal extraction`);
  assert.ok(nativeCoverage.covers(source), `${source}: native regression asset is not packaged`);
}

assert.match(html, /--story-yard-bg:\s*url\('\.\.\/assets\/images\/mojikko\/care\/yard_background_wide_v2\.png'\)/);
assert.doesNotMatch(html, /stage-bg\.webp/, 'the QuizLand background must not return');
assert.match(html, /--story-milk:\s*url\('\.\.\/assets\/images\/mojikko\/writing\/storybook\/icon_moji_milk_20260716\.webp'\)/);
assert.match(html, /--story-milmaru-grown:\s*url\('\.\.\/assets\/images\/mojikko\/writing\/storybook\/milmaru_grown_wave_20260716\.webp'\)/);
assert.match(html, /--story-milmaru-yochiyochi:\s*url\('\.\.\/assets\/images\/mojikko\/writing\/storybook\/milmaru_yochiyochi_front_20260716\.webp'\)/);
assert.match(html, /--story-milmaru-baby:\s*url\('\.\.\/assets\/images\/mojikko\/writing\/storybook\/milmaru_shell_baby_idle_20260716\.webp'\)/);
assert.match(html, /--story-milmaru-egg:\s*url\('\.\.\/assets\/images\/mojikko\/writing\/storybook\/milmaru_egg_idle_20260716\.webp'\)/);
assert.match(
  html,
  /#stage-wrap\s*\{\s*background:\s*#243b33;\s*\}\s*#stage\s*\{\s*background:\s*var\(--story-yard-bg\) right center \/ cover no-repeat;/s,
  'the dark wrapper fallback and original right-aligned yard must stay exact'
);
assert.doesNotMatch(
  between(html, '#stage::before {', '.bg-cloud,'),
  /repeating-linear-gradient/,
  'the old scanline overlay must stay removed'
);
assert.doesNotMatch(html, /menu_card_base_0[1-4]\.webp/, 'rejected menu-card assets must not be referenced by writing-mori');
const expectedImageOnlyVariables = Object.freeze({
  '--story-button-primary': '../assets/images/quizland/quizland_difficulty_button_normal_gpt_image2_20260622.png',
  '--story-button-primary-pressed': '../assets/images/quizland/quizland_difficulty_button_pressed_gpt_image2_20260622.png',
  '--story-button-secondary': '../assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_ui_page_label_wood_canvas_20260623.png',
  '--story-button-secondary-pressed': '../assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_ui_page_label_pressed_gpt_image2_20260713.png',
  '--story-choice-pressed-tl': '../assets/images/quizland/Fukuro_frame_002_pressed_TL.png',
  '--story-choice-pressed-tr': '../assets/images/quizland/Fukuro_frame_002_pressed_TR.png',
  '--story-choice-pressed-bl': '../assets/images/quizland/Fukuro_frame_002_pressed_BL.png',
  '--story-choice-pressed-br': '../assets/images/quizland/Fukuro_frame_002_pressed_BR.png'
});
for (const [variable, source] of Object.entries(expectedImageOnlyVariables)) {
  assert.match(
    html,
    new RegExp(`${variable.replaceAll('-', '\\-')}:\\s*url\\(['\"]${source.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}['\"]\\)`),
    `${variable}: image-only asset mapping drifted`
  );
}
assert.match(
  html,
  /\.mode-choice-buttons\s*\{[^}]*grid-template-columns:\s*1fr 1fr;[^}]*grid-template-rows:\s*1fr 1fr;/s,
  'F002 must expose its four baked windows as a 2x2 hit-area grid'
);
assert.equal((html.match(/class="pixel-button[^\"]*mode-choice-button/g) || []).length, 4, 'F002 must contain exactly four real buttons');
assert.match(html, /\.writing-board\s*\{[^}]*border:\s*0;/s, 'the story frame must not shrink the writer containing block');
assert.match(
  html,
  /\.writing-board::before\s*\{[^}]*position:\s*absolute;[^}]*border-image-source:\s*var\(--story-frame-board\)/s,
  'the writing-board frame must be a non-sizing overlay'
);
assert.match(
  html,
  /\.writing-board::after\s*\{[^}]*inset:\s*22px;[^}]*background:\s*rgba\(255, 251, 235, 0\.97\);[^}]*opacity:\s*1;/s,
  'only the inside of the handwriting board may retain an opaque paper surface'
);

assert.doesNotMatch(
  html,
  /assets\/images\/mojikko\/(?:writing\/(?!storybook\/)|care\/(?!yard_background_wide_v2\.png))/,
  'the writing screen must not load the former pixel UI asset set'
);
const pixelatedDeclarations = html.match(/image-rendering:\s*pixelated/g) || [];
assert.equal(pixelatedDeclarations.length, 1, 'only the handwriting trail may remain pixel-rendered');
assert.match(html, /#pixelTrailCanvas\s*\{\s*image-rendering:\s*pixelated/);
assert.doesNotMatch(html, /ドット/, 'child-facing storybook copy must not describe the guide as dots');
assert.match(html, /id="messageBox"[^>]*role="status"[^>]*aria-live="polite"[^>]*hidden/);
assert.match(html, /\.message-box\s*\{[^}]*top:\s*0;[^}]*width:\s*min\(820px, 100%\)[^}]*display:\s*flex/s);
assert.match(html, /\.prompt-bar\.feedback-hidden\s*\{\s*visibility:\s*hidden/);
assert.match(html, /function setMessage\([^]*messageBox\.hidden\s*=\s*!nextMessage;[^]*promptText\.classList\.toggle\('feedback-hidden'/);
assert.match(html, /#doneBtn\s*\{[^}]*width:\s*196px/s);
assert.match(html, /#resetBtn\s*\{[^}]*width:\s*235px/s);
assert.match(html, /\.pixel-creature\s*\{[^}]*background:\s*none center \/ contain no-repeat/s);
assert.match(html, /\.companion-card\.visual-grown \.pixel-creature\s*\{[^}]*background-image:\s*var\(--story-milmaru-grown\)/s);
assert.match(html, /\.companion-card\.visual-egg \.pixel-creature\s*\{[^}]*background-image:\s*var\(--story-milmaru-egg\)/s);
assert.match(html, /\.companion-card\.visual-baby \.pixel-creature\s*\{[^}]*background-image:\s*var\(--story-milmaru-baby\)/s);
assert.match(html, /\.companion-card\.visual-yochiyochi \.pixel-creature\s*\{[^}]*background-image:\s*var\(--story-milmaru-yochiyochi\)/s);
assert.match(html, /classList\.remove\('visual-egg', 'visual-baby', 'visual-yochiyochi', 'visual-grown'\);\s*companionCard\.classList\.add\(visualClass\);/);
assert.match(html, /if \(sukusuku < 50\) return 'yochiyochi';\s*if \(sukusuku < 80\) return 'kids';/);
assert.match(html, /\.food-pixel\.milk\s*\{[^}]*background:\s*var\(--story-milk\)/s);
assert.match(html, /#careBtn\.reward-milk::before\s*\{[^}]*background:\s*var\(--story-milk\)/s);
assert.doesNotMatch(html, /(?:\.food-pixel\.milk|#careBtn\.reward-milk::before|\.companion-cookie\.milk)\s*\{[^}]*linear-gradient/s);
const celebrateBlocks = html.match(/\.companion-card(?:\.[\w-]+)*\.celebrate \.pixel-creature\s*\{[^}]*\}/g) || [];
assert.ok(celebrateBlocks.length >= 1, 'the current Milmaru state must still animate on celebration');
assert.ok(
  celebrateBlocks.every((block) => !/background(?:-image)?\s*:/.test(block)),
  'celebration must not replace the current growth-stage art'
);

const artSource = between(
  html,
  'const WORD_HOLE_STORYBOOK_ART = Object.freeze({',
  'const FOOD_SYSTEM_VERSION ='
);
const artContext = {};
vm.createContext(artContext);
vm.runInContext(`${artSource}\nglobalThis.art = WORD_HOLE_STORYBOOK_ART;`, artContext);
const art = JSON.parse(JSON.stringify(artContext.art));
assert.equal(Object.keys(art).length, 18, 'every word clue must use storybook art');
assert.equal(
  art['ひまわり'],
  '../assets/images/mojikko/writing/storybook/word_himawari_20260716.webp',
  'the delivered sunflower must replace its emoji fallback'
);
for (const [word, src] of Object.entries(art)) {
  assert.match(src, /^\.\.\/assets\//, `${word}: art must remain same-origin`);
  const file = path.resolve(root, 'writing-mori', src);
  assert.ok(file.startsWith(`${root}${path.sep}`), `${word}: art escaped repository root`);
  assert.ok(fs.existsSync(file), `${word}: missing mapped art ${src}`);
  assert.ok(fs.statSync(file).size > 0, `${word}: mapped art is empty`);
}
assert.match(html, /clueArt\.src\s*=\s*currentTask\.art/);
assert.match(html, /clueArt\.decoding\s*=\s*'async'/);

const protectedRanges = [
  {
    start: 'function getHanziGridTransform(',
    end: 'function renderPixelLetter(',
    hash: 'ad9ee0fd496becff71ac3d1b6d0554110ff0279a5d0d8d2be4abab9fe88df518'
  },
  {
    start: 'function renderPixelLetter(',
    end: 'function resetWriting(',
    hash: '5c451465e5958a2d132478bface72667192cc9aed85f4b26c4e6a55ed87c2232'
  },
  {
    start: 'function getWritingReadiness(',
    end: 'async function completeWriting(',
    hash: '70188513f41329e3fccf99ab65a1bd11fd314fda5be01432628dd9bea9154929'
  }
];
for (const range of protectedRanges) {
  assert.equal(
    sha256(between(html, range.start, range.end)),
    range.hash,
    `protected handwriting implementation drifted: ${range.start}`
  );
}

console.log('Mojikko storybook UI regression: PASS');
