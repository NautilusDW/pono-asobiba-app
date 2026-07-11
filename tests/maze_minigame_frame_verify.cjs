'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'maze/index.html'), 'utf8');

// Keep every classic inline script parseable after the mode and layout changes.
let inlineCount = 0;
const scriptRe = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
let scriptMatch;
while ((scriptMatch = scriptRe.exec(html))) {
  if (/\bsrc=/.test(scriptMatch[1])) continue;
  inlineCount++;
  new vm.Script(scriptMatch[2], { filename: `maze-inline-${inlineCount}.js` });
}
assert.equal(inlineCount, 4, 'unexpected Maze inline script count');

const modeFnMatch = html.match(/function _setEncounterMode\(mode\)\s*\{[\s\S]*?\n\}/);
assert.ok(modeFnMatch, '_setEncounterMode is missing');

function classesFor(mode) {
  const active = new Set();
  const context = {
    encCardEl: {
      classList: {
        toggle(name, force) {
          if (force) active.add(name);
          else active.delete(name);
        },
      },
    },
    mode,
  };
  vm.runInNewContext(`${modeFnMatch[0]}; _setEncounterMode(mode);`, context);
  return active;
}

const gameModes = [
  'janken',
  'truefalse',
  'simon',
  'silhouette',
  'oddone',
  'flag',
  'water_bridge',
  'strength_push',
  'donguri_bowl',
];

for (const mode of gameModes) {
  assert.ok(classesFor(mode).has('is-minigame'), `${mode} must use the common minigame frame`);
}
assert.ok(classesFor('web_sweep').has('is-minigame'), 'legacy bowl mode must use the common frame');
assert.ok(!classesFor(null).has('is-minigame'), 'the creature introduction must not use the play frame');

assert.match(
  html,
  /function _showPeekChoices\(\)\s*\{\s*_setEncounterMode\('silhouette'\)/,
  'silhouette must leave the introduction layout before rendering choices',
);
assert.match(
  html,
  /function _showSimonGame\(\)\s*\{\s*_setEncounterMode\('simon'\)/,
  'Simon must leave the introduction layout before rendering controls',
);
assert.match(html, /rowEl\.className = 'row peek-choice-grid'/);

// The final override is intentionally after the older mode-specific sizing rules.
const commonFrameIndex = html.indexOf('/* ── ミニゲーム共通プレイ枠 ──');
const contentScaleIndex = html.indexOf('/* ── 16:9プレイ枠の中身を短辺へ比例させる ──');
const portraitIndex = html.indexOf('/* Portrait fallback:', commonFrameIndex);
assert.ok(commonFrameIndex > 0 && portraitIndex > commonFrameIndex, 'common frame override is misplaced');
assert.ok(contentScaleIndex > commonFrameIndex && portraitIndex > contentScaleIndex, 'fluid content override is misplaced');
const commonCss = html.slice(commonFrameIndex, portraitIndex);
const contentScaleCss = html.slice(contentScaleIndex, portraitIndex);

assert.match(commonCss, /\.enc-card\.is-minigame\s*\{[\s\S]*?aspect-ratio:\s*16\s*\/\s*9;/);
assert.match(commonCss, /\.enc-card\.is-minigame \.enc-stage\s*\{[\s\S]*?height:\s*100%;[\s\S]*?overflow:\s*hidden;/);
assert.match(commonCss, /\.enc-card\.is-minigame:not\(\.is-oddone\) \.enc-left\s*\{\s*display:\s*none;/);
assert.match(commonCss, /\.peek-choice-grid\s*\{\s*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/);
assert.match(commonCss, /\.enc-card\.is-minigame\.is-oddone\s*\{[\s\S]*?grid-template-columns:/);
assert.match(commonCss, /\.strength-rock-btn\s*\{\s*min-height:\s*44px;/);
assert.match(commonCss, /\.water-game__stage,[\s\S]*?\.bowl-game__stage\s*\{[\s\S]*?min-height:\s*44px;/);
assert.match(
  html,
  /@media \(max-height: 430px\),\s*\(orientation: landscape\) and \(max-height: 560px\)/,
  '431–560px landscape viewports must receive the compact game layout',
);
assert.match(commonCss, /\.janken-call\s*\{\s*min-height:\s*0;\s*line-height:\s*1;/);
assert.match(commonCss, /\.janken-result\s*\{\s*height:\s*auto;\s*min-height:\s*0;\s*line-height:\s*1;/);
assert.match(contentScaleCss, /\.janken-arena\s*\{[\s\S]*?grid-template-rows:[\s\S]*?minmax\(0, 1fr\)[\s\S]*?align-items:\s*stretch;/);
assert.match(contentScaleCss, /clamp\(30px, 10%, 58px\)[\s\S]*?clamp\(72px, 24%, 142px\)/);
assert.match(contentScaleCss, /\.janken-slot\s*\{[\s\S]*?height:\s*100%;[\s\S]*?min-height:\s*0;/);
assert.match(contentScaleCss, /\.janken-hand\s*\{\s*width:\s*min\(clamp\(96px, 38dvh, 260px\)/);
assert.match(contentScaleCss, /\.janken-side__img\s*\{[\s\S]*?clamp\(78px, 28dvh, 200px\)[\s\S]*?clamp\(88px, 31dvh, 220px\)/);
assert.match(contentScaleCss, /\.janken-controls \.enc-btn\s*\{[\s\S]*?clamp\(76px, 24dvh, 154px\)/);
assert.match(contentScaleCss, /\.janken-controls > \.enc-btn:only-child\s*\{[\s\S]*?min-width:\s*150px;/);
assert.match(contentScaleCss, /\.janken-choice-hand\s*\{[\s\S]*?clamp\(40px, 12dvh, 82px\)/);
assert.match(contentScaleCss, /\.flag-game\s*\{[\s\S]*?minmax\(0, 1fr\)[\s\S]*?align-items:\s*stretch;/);
assert.match(contentScaleCss, /clamp\(30px, 10%, 50px\) clamp\(18px, 4%, 26px\)[\s\S]*?clamp\(78px, 27%, 160px\)/);
assert.match(contentScaleCss, /\.flag-bug-stage\s*\{[\s\S]*?height:\s*100%;[\s\S]*?min-height:\s*0;/);
assert.match(contentScaleCss, /\.flag-bug-img\s*\{[\s\S]*?clamp\(108px, 40dvh, 280px\)/);
assert.match(contentScaleCss, /\.flag-controls \.enc-btn\s*\{[\s\S]*?min-height:\s*44px;/);
assert.match(contentScaleCss, /\.flag-controls \.enc-btn::after\s*\{\s*inset:\s*19%;/);
assert.match(contentScaleCss, /\.flag-reward\s*\{[\s\S]*?height:\s*100%;[\s\S]*?grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/);
assert.match(contentScaleCss, /\.flag-ladder-img\s*\{[\s\S]*?clamp\(110px, 40dvh, 260px\)/);
assert.match(html, /<div class="[^"]*\brow\b[^"]*\bresult-actions\b[^"]*">[\s\S]*?<button[^>]*id="flagBackBtn">/);
assert.match(contentScaleCss, /\.is-truefalse \.enc-stage\s*\{[\s\S]*?grid-template-rows:\s*minmax\(0, 1fr\)/);
assert.match(contentScaleCss, /grid-template-rows:\s*minmax\(0, 1fr\) clamp\(64px, 18dvh, 112px\)/);
assert.match(contentScaleCss, /\.is-truefalse \.row\s*\{\s*width:\s*min\(78%, 560px\) !important;/);
assert.match(contentScaleCss, /#simonGrid\s*\{[\s\S]*?flex:\s*1 1 0;[\s\S]*?repeat\(2, minmax\(44px, 1fr\)\)/);
assert.match(contentScaleCss, /#simonGrid\s*\{[\s\S]*?width:\s*min\(82%, 720px\) !important;/);
assert.match(contentScaleCss, /\.simon-dot\s*\{[\s\S]*?clamp\(64px, 20dvh, 126px\)/);
assert.match(contentScaleCss, /\.peek-wrap\s*\{[\s\S]*?flex:\s*1 1 0;/);
assert.match(contentScaleCss, /\.peek-choice-grid\s*\{[\s\S]*?clamp\(82px, 19dvh, 118px\)/);
assert.match(contentScaleCss, /\.oddone-choice-grid\s*\{[\s\S]*?height:\s*100%;[\s\S]*?repeat\(2, minmax\(44px, 1fr\)\)/);
assert.match(contentScaleCss, /\.oddone-choice-grid\s*\{\s*width:\s*min\(100%, 920px\) !important;/);
assert.match(contentScaleCss, /\.is-oddone \.enc-stage > \.enc-result:only-child\s*\{[\s\S]*?grid-row:\s*1 \/ -1;/);
assert.match(contentScaleCss, /\.water-rider\s*\{\s*width:\s*clamp\(132px, 30dvh, 240px\);/);
assert.match(html, /\.water-game\s*\{[\s\S]*?grid-template-rows:\s*minmax\(1\.45em, auto\) minmax\(0, 1fr\) minmax\(1\.4em, auto\);[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;/);
assert.match(commonCss, /\.strength-game\s*\{\s*grid-template-rows:\s*auto minmax\(0, 1fr\) auto 10px auto;/);
assert.match(commonCss, /\.strength-game__stage,[\s\S]*?\.strength-rock-btn,[\s\S]*?\.strength-game__impact-zone\s*\{[\s\S]*?height:\s*100%;[\s\S]*?min-height:\s*0;/);
assert.match(contentScaleCss, /\.strength-game__rock\s*\{[\s\S]*?clamp\(150px, 42dvh, 340px\)/);
assert.match(commonCss, /\.bowl-game\s*\{\s*grid-template-rows:\s*minmax\(0, 1fr\);/);
assert.match(commonCss, /\.bowl-game__stage\s*\{[\s\S]*?height:\s*100%;[\s\S]*?min-height:\s*44px;/);
assert.match(contentScaleCss, /\.bowl-game__boss-intro-panel\s*\{\s*width:\s*min\(78%, 560px\);/);
assert.match(contentScaleCss, /\.bowl-game__boss-intro-btn\s*\{\s*min-height:\s*56px;/);
assert.match(commonCss, /\.row\.result-actions\s*\{[\s\S]*?height:\s*auto !important;/);
assert.match(commonCss, /\.row\.result-actions > \.enc-btn\s*\{[\s\S]*?min-height:\s*56px;[\s\S]*?max-height:\s*72px;/);

// Mirror the two CSS sizing branches for the regression viewports. The card must
// be an exact 16:9 rectangle and remain inside the 10px modal insets.
const MAX_FRAME_WIDTH = 1180;
const MAX_FRAME_HEIGHT = MAX_FRAME_WIDTH * 9 / 16;
const viewports = [
  [740, 320],
  [844, 390],
  [986, 477],
  [1024, 507],
  [1024, 768],
  [1366, 768],
];

function clamp(min, preferred, max) {
  return Math.max(min, Math.min(preferred, max));
}

for (const [viewportWidth, viewportHeight] of viewports) {
  const isHeightBound = viewportWidth / viewportHeight >= 16 / 9;
  const frameHeight = isHeightBound
    ? Math.min(MAX_FRAME_HEIGHT, viewportHeight - 20)
    : Math.min(MAX_FRAME_WIDTH, viewportWidth - 20) * 9 / 16;
  const frameWidth = frameHeight * 16 / 9;
  const ratio = frameWidth / frameHeight;

  assert.ok(Math.abs(ratio - 16 / 9) < 1e-9, `${viewportWidth}x${viewportHeight}: ratio drifted`);
  assert.ok(frameWidth <= viewportWidth - 20 + 1e-9, `${viewportWidth}x${viewportHeight}: frame is too wide`);
  assert.ok(frameHeight <= viewportHeight - 20 + 1e-9, `${viewportWidth}x${viewportHeight}: frame is too tall`);
  assert.ok(frameWidth > 0 && frameHeight > 0, `${viewportWidth}x${viewportHeight}: invalid frame size`);

  // The frame border is 4px and its fluid vertical padding is clamp(6px, 1.4dvh, 16px).
  // Mirror the proportional content tokens so a future "fit" repair cannot silently
  // restore tiny fixed sprites inside a large 16:9 card.
  const gameHeight = frameHeight - 8 - 2 * clamp(6, viewportHeight * 0.014, 16);
  const gameWidth = frameWidth - 8 - 2 * clamp(8, viewportWidth * 0.014, 18);

  const jankenGap = clamp(4, viewportHeight * 0.012, 10);
  const jankenCall = clamp(30, gameHeight * 0.10, 58);
  const jankenResult = clamp(24, gameHeight * 0.08, 48);
  const jankenControls = clamp(72, gameHeight * 0.24, 142);
  const jankenMain = gameHeight - jankenCall - jankenResult - jankenControls - jankenGap * 3;
  const jankenHand = clamp(96, viewportHeight * 0.38, 260);
  const jankenCharacter = clamp(88, viewportHeight * 0.31, 220);
  const jankenChoiceWidth = clamp(76, viewportHeight * 0.24, 154);
  assert.ok(jankenMain >= gameHeight * 0.42, `${viewportWidth}x${viewportHeight}: janken main band is too small`);
  assert.ok(Math.min(jankenHand, jankenMain) >= gameHeight * 0.20, `${viewportWidth}x${viewportHeight}: janken hand is too small`);
  assert.ok(jankenCharacter >= gameHeight * 0.20, `${viewportWidth}x${viewportHeight}: janken character is too small`);
  assert.ok(jankenChoiceWidth >= 76, `${viewportWidth}x${viewportHeight}: janken choice is too narrow`);
  assert.ok(jankenControls - 4 >= 44, `${viewportWidth}x${viewportHeight}: janken controls are too short`);

  const flagGap = clamp(3, viewportHeight * 0.01, 8);
  const flagCommand = clamp(30, gameHeight * 0.10, 50);
  const flagTimer = clamp(18, gameHeight * 0.04, 26);
  const flagHp = clamp(24, gameHeight * 0.07, 40);
  const flagControls = clamp(78, gameHeight * 0.27, 160);
  const flagStage = gameHeight - flagCommand - flagTimer - flagHp - flagControls - flagGap * 4;
  const flagBug = Math.min(flagStage - 16, clamp(108, viewportHeight * 0.40, 280));
  const flagButton = Math.min(flagControls - 4, clamp(72, viewportHeight * 0.26, 154));
  assert.ok(flagStage >= gameHeight * 0.34, `${viewportWidth}x${viewportHeight}: flag stage is too small`);
  assert.ok(flagBug >= gameHeight * 0.22, `${viewportWidth}x${viewportHeight}: flag bug is too small`);
  assert.ok(flagButton >= 44 && flagButton >= gameHeight * 0.14, `${viewportWidth}x${viewportHeight}: flag controls are too small`);

  const trueFalseRow = clamp(64, viewportHeight * 0.18, 112);
  const trueFalseIcon = Math.min(
    (gameHeight - trueFalseRow - clamp(5, viewportHeight * 0.012, 10)) * 0.70,
    clamp(96, viewportHeight * 0.38, 240),
  );
  assert.ok(trueFalseIcon >= gameHeight * 0.18, `${viewportWidth}x${viewportHeight}: true/false icon is too small`);
  const simonWidth = Math.min(gameWidth * 0.82, 720);
  assert.ok(simonWidth >= gameWidth * 0.55, `${viewportWidth}x${viewportHeight}: Simon grid is too narrow`);
  assert.ok(clamp(64, viewportHeight * 0.20, 126) >= gameHeight * 0.12, `${viewportWidth}x${viewportHeight}: Simon dots are too small`);

  const peekChoices = clamp(82, viewportHeight * 0.19, 118);
  const peekCanvas = Math.min(420, gameHeight - 58 - peekChoices - clamp(5, viewportHeight * 0.012, 10) * 2);
  assert.ok(peekCanvas >= gameHeight * 0.38, `${viewportWidth}x${viewportHeight}: peek canvas is too small`);
  assert.ok(peekChoices >= 82, `${viewportWidth}x${viewportHeight}: peek choices are too short`);
  assert.ok(clamp(64, viewportHeight * 0.24, 150) >= gameHeight * 0.11, `${viewportWidth}x${viewportHeight}: odd-one art is too small`);
  assert.ok(clamp(150, viewportHeight * 0.42, 340) >= gameHeight * 0.22, `${viewportWidth}x${viewportHeight}: strength rock is too small`);
}

console.log('maze minigame 16:9 frame verification: PASS');
