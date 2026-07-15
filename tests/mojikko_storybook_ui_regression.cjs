#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'writing-mori/index.html'), 'utf8');

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `missing source range: ${start} -> ${end}`);
  return source.slice(startIndex, endIndex);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
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
  'assets/images/quizland/stage-bg.webp',
  'assets/images/quizland/Fukuro_frame_001.webp',
  'assets/images/quizland/Fukuro_frame_002.webp',
  'assets/images/quizland/Fukuro_frame_003.webp',
  'assets/images/quizland/Fukuro_frame_004.webp',
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

assert.match(html, /--story-bg:\s*url\('\.\.\/assets\/images\/quizland\/stage-bg\.webp'\)/);
assert.match(html, /--story-milk:\s*url\('\.\.\/assets\/images\/mojikko\/writing\/storybook\/icon_moji_milk_20260716\.webp'\)/);
assert.match(html, /--story-milmaru-grown:\s*url\('\.\.\/assets\/images\/mojikko\/writing\/storybook\/milmaru_grown_wave_20260716\.webp'\)/);
assert.match(html, /--story-milmaru-yochiyochi:\s*url\('\.\.\/assets\/images\/mojikko\/writing\/storybook\/milmaru_yochiyochi_front_20260716\.webp'\)/);
assert.match(html, /--story-milmaru-baby:\s*url\('\.\.\/assets\/images\/mojikko\/writing\/storybook\/milmaru_shell_baby_idle_20260716\.webp'\)/);
assert.match(html, /--story-milmaru-egg:\s*url\('\.\.\/assets\/images\/mojikko\/writing\/storybook\/milmaru_egg_idle_20260716\.webp'\)/);
assert.match(html, /#stage-wrap\s*\{[^}]*var\(--story-bg\) center \/ cover no-repeat/s);
assert.match(html, /#stage\s*\{[^}]*background:\s*transparent/s);
assert.doesNotMatch(
  between(html, '#stage::before {', '.bg-cloud,'),
  /repeating-linear-gradient/,
  'the old scanline overlay must stay removed'
);
assert.match(html, /border-image-source:\s*var\(--story-frame-large\)/);
assert.match(html, /border-image-source:\s*var\(--story-frame-wide\)/);
assert.match(html, /border-image-source:\s*var\(--story-frame-leaf\)/);
assert.match(html, /\.writing-board\s*\{[^}]*border:\s*0;/s, 'the story frame must not shrink the writer containing block');
assert.match(
  html,
  /\.writing-board::before\s*\{[^}]*position:\s*absolute;[^}]*border-image-source:\s*var\(--story-frame-large\)/s,
  'the writing-board frame must be a non-sizing overlay'
);
assert.doesNotMatch(
  html,
  /background(?:-image)?:[^;]*(?:Fukuro_frame|--story-frame)[^;]*100%\s+100%/,
  'storybook frames must use sliced borders instead of distorted full-image stretching'
);

assert.doesNotMatch(
  html,
  /assets\/images\/mojikko\/(?:writing\/(?!storybook\/)|care\/)/,
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
assert.match(html, /#doneBtn\s*\{[^}]*width:\s*352px/s);
assert.match(html, /#resetBtn\s*\{[^}]*width:\s*220px/s);
assert.match(html, /\.pixel-creature\s*\{[^}]*background:\s*var\(--story-milmaru-grown\)/s);
assert.match(html, /\.companion-card\.egg-state \.pixel-creature,[^{]*\{[^}]*background-image:\s*var\(--story-milmaru-egg\)/s);
assert.match(html, /\.companion-card\.baby-state \.pixel-creature\s*\{[^}]*background-image:\s*var\(--story-milmaru-baby\)/s);
assert.match(html, /\.companion-card\.yochiyochi-state \.pixel-creature\s*\{[^}]*background-image:\s*var\(--story-milmaru-yochiyochi\)/s);
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
