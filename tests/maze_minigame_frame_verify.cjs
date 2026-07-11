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
const portraitIndex = html.indexOf('/* Portrait fallback:', commonFrameIndex);
assert.ok(commonFrameIndex > 0 && portraitIndex > commonFrameIndex, 'common frame override is misplaced');
const commonCss = html.slice(commonFrameIndex, portraitIndex);

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
assert.match(
  html,
  /\.flag-game\s*\{\s*grid-template-rows:\s*auto auto auto minmax\(54px, 1fr\) minmax\(68px, auto\);/,
  'compact flag rows must size from their command, hearts and round buttons',
);
assert.match(commonCss, /\.janken-call\s*\{\s*min-height:\s*0;\s*line-height:\s*1;/);
assert.match(commonCss, /\.janken-result\s*\{\s*height:\s*auto;\s*min-height:\s*0;\s*line-height:\s*1;/);

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
}

console.log('maze minigame 16:9 frame verification: PASS');
