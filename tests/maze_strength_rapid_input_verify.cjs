'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'maze/index.html'), 'utf8');

let inlineCount = 0;
for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/\bsrc=/.test(match[1])) continue;
  inlineCount++;
  new vm.Script(match[2], { filename: `maze-inline-${inlineCount}.js` });
}
assert.equal(inlineCount, 4, 'unexpected Maze inline script count');

assert.match(html, /\.strength-rock-btn \{[\s\S]*?touch-action: manipulation;/);
assert.match(html, /\.strength-rock-btn \{[\s\S]*?user-select: none;/);
assert.match(html, /\.strength-rock-btn:active \{\s*transform: none;/);
assert.match(html, /\.strength-rock-btn:active \.strength-game__impact-zone \{\s*transform: scale\(0\.985\);/);
assert.match(html, /\.strength-game__impact-zone \{[\s\S]*?pointer-events: none;/);
assert.doesNotMatch(html, /\.strength-rock-btn:active \{\s*transform: scale/);

assert.match(html, /rockBtn\.addEventListener\('pointerdown', _onStrengthRockPointerDown\)/);
assert.match(html, /rockBtn\.addEventListener\('click', _onStrengthRockClick\)/);
assert.doesNotMatch(html, /rockBtn\.addEventListener\('click', _onStrengthRockTap\)/);

const strengthConstantsStart = html.indexOf('const STRENGTH_TAP_REQUIRED');
const pointerStart = html.indexOf('function _onStrengthRockPointerDown(', strengthConstantsStart);
assert.ok(strengthConstantsStart >= 0 && pointerStart > strengthConstantsStart, 'strength constants are missing');
const strengthRules = {};
vm.runInNewContext(
  html.slice(strengthConstantsStart, pointerStart)
    + '\nthis.__required = STRENGTH_TAP_REQUIRED; this.__duration = STRENGTH_TAP_MS; this.__stage = _strengthRockStageIndex;',
  strengthRules,
  { filename: 'maze-strength-rules.js' },
);
assert.equal(strengthRules.__required, 24, 'rock durability must be raised from 18 to 24 hits');
assert.equal(strengthRules.__duration, 13000, 'the 1.3x-longer rock must keep a comparable tapping pace');
assert.deepEqual(
  [0, 5, 6, 11, 12, 17, 18, 23, 24].map(strengthRules.__stage),
  [0, 0, 1, 1, 2, 2, 3, 3, 3],
  'crack stages must scale across the 24-hit durability',
);

const tapStart = html.indexOf('function _onStrengthRockTap()');
const failStart = html.indexOf('function _failStrengthPushGame()', tapStart);
assert.ok(tapStart >= 0 && failStart > tapStart, 'rock hit handler is missing');
const tapSource = html.slice(tapStart, failStart);
const finalLock = tapSource.indexOf('if (finalHit) gs.locked = true;');
const renderAfterHit = tapSource.indexOf('_renderStrengthPushGame();');
assert.ok(finalLock >= 0 && finalLock < renderAfterHit, 'the final hit must lock success before timeout rendering');
assert.match(tapSource, /if \(finalHit\) \{\s*_strengthGimmickSetTimeout/);

const clickStart = html.indexOf('function _onStrengthRockClick(', pointerStart);
const showStart = html.indexOf('function _showStrengthPushGame(', clickStart);
assert.ok(pointerStart >= 0 && clickStart > pointerStart && showStart > clickStart, 'input adapters are missing');

const adapterSource = html.slice(pointerStart, showStart);
const accepted = [];
const context = {
  window: { PointerEvent: function PointerEvent() {} },
  _onStrengthRockTap() { accepted.push('hit'); },
};
vm.runInNewContext(adapterSource, context, { filename: 'maze-strength-input-adapters.js' });

for (let i = 0; i < 30; i++) {
  context._onStrengthRockPointerDown({
    isPrimary: true,
    button: 0,
    pointerType: 'mouse',
  });
  context._onStrengthRockClick({ detail: 1 });
}
assert.equal(accepted.length, 30, 'primary mouse presses must count once each without click duplication');

let touchPrevented = false;
context._onStrengthRockPointerDown({
  isPrimary: true,
  button: 0,
  pointerType: 'touch',
  preventDefault() { touchPrevented = true; },
});
context._onStrengthRockClick({ detail: 1 });
assert.equal(accepted.length, 31, 'touch pointerdown plus compatibility click must count once');
assert.equal(touchPrevented, true, 'touch pointerdown must suppress delayed compatibility behavior');

context._onStrengthRockPointerDown({ isPrimary: false, button: 0, pointerType: 'touch' });
context._onStrengthRockPointerDown({ isPrimary: true, button: 2, pointerType: 'mouse' });
assert.equal(accepted.length, 31, 'secondary contacts and right clicks must not damage the rock');

context._onStrengthRockClick({ detail: 0 });
assert.equal(accepted.length, 32, 'keyboard and assistive-technology clicks must remain available');

delete context.window.PointerEvent;
context._onStrengthRockClick({ detail: 1 });
assert.equal(accepted.length, 33, 'click must remain a fallback when Pointer Events are unavailable');

const scheduled = [];
const tapContext = {
  _strengthGameState: {
    tapCount: 22,
    required: 24,
    locked: false,
    lastPunchHand: 'left',
    punchSeq: 0,
    punchTimer: null,
    crackPlayed: true,
    almostPlayed: true,
    status: '',
  },
  _playMazeVoice() {},
  playRockHit() {},
  _spawnStrengthDebrisBurst() {},
  _spawnStrengthImpactEffect() {},
  _renderStrengthPushGame() {},
  _strengthGimmickSetTimeout(fn, delay) { scheduled.push({ fn, delay }); },
  _resolveStrengthPushGame() {},
  document: { getElementById() { return null; } },
  setTimeout() { throw new Error('no punch timeout expected without a button'); },
  clearTimeout() {},
};
vm.runInNewContext(tapSource, tapContext, { filename: 'maze-strength-hit-handler.js' });
tapContext._onStrengthRockTap();
assert.equal(tapContext._strengthGameState.tapCount, 23);
assert.equal(tapContext._strengthGameState.locked, false, '23 hits must not break a 24-hit rock');
assert.equal(scheduled.length, 0, '23 hits must not schedule success');
tapContext._onStrengthRockTap();
assert.equal(tapContext._strengthGameState.tapCount, 24);
assert.equal(tapContext._strengthGameState.locked, true, 'the 24th hit must lock success immediately');
assert.equal(scheduled.length, 1, 'the 24th hit must schedule exactly one success resolution');
assert.equal(scheduled[0].delay, 420);

console.log('maze strength rapid input verification: PASS');
