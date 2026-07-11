'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'maze/index.html'), 'utf8');

// All classic inline scripts must remain syntactically valid.
let inlineCount = 0;
const scriptRe = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
let match;
while ((match = scriptRe.exec(html))) {
  if (/\bsrc=/.test(match[1])) continue;
  inlineCount++;
  new vm.Script(match[2], { filename: `maze-inline-${inlineCount}.js` });
}
assert.equal(inlineCount, 4, 'unexpected Maze inline script count');

assert.match(html, /const MZ_MINIGAME_BGM_FADE_OUT_MS = 300;/);
assert.match(html, /const MZ_MINIGAME_BGM_FADE_IN_MS = 280;/);
assert.match(html, /const MZ_MINIGAME_BGM_LEAD_MS = 560;/);
assert.match(html, /const MZ_MINIGAME_START_MAX_MS = 1500;/);
assert.match(html, /function _mzStartMinigameBgmTransition\(gameKey, onTrackStarted\)/);
assert.match(html, /incoming = new Audio\(nextSrc\)/);
assert.match(html, /incoming\.muted = true;/);
assert.match(html, /incoming\.muted = false;/);
assert.match(
  html,
  /if \(!bgmEnabled \|\| document\.hidden\) \{\s*try \{ incoming\.pause\(\); \} catch \(_\) \{\}[\s\S]*?incoming\.muted = false;/,
  'disabled/hidden promotion must pause before unmuting',
);
assert.match(html, /outgoing\.replaceWith\(incoming\)/);
assert.match(html, /_mzStartMinigameBgmTransition\(game, queueLaunchAfterBeat\)/);
assert.match(
  html,
  /queueLaunchAfterBeat[\s\S]*?clearTimeout\(_mzEncounterStartMaxTimer\)[\s\S]*?setTimeout\(launch, MZ_MINIGAME_BGM_LEAD_MS\)/,
  'a slow but successful BGM start must still receive the full lead beat',
);
assert.doesNotMatch(html, /_mzSwitchBgm\(game, true\)/, 'hard-cut start path returned');

assert.match(html, /class="enc-start-cue__note"[^>]*>♪<\/span><span>はじまるよ<\/span>/);
assert.match(html, /\.enc-btn\.primary\.is-starting:disabled/);
assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(html, /button\.disabled = true;/);
assert.match(html, /button\.style\.width = Math\.ceil\(rect\.width\)/);
assert.match(html, /encStageEl\.setAttribute\('aria-busy', 'true'\)/);
assert.match(html, /id="mzStartAnnouncer" role="status" aria-live="polite"/);
assert.match(html, /mzStartAnnouncer\.textContent = 'ミニゲームを はじめるよ'/);
assert.doesNotMatch(html, /button\.setAttribute\('aria-busy'/);

const gameKeys = [
  'janken', 'silhouette', 'truefalse', 'oddone', 'simon',
  'flag', 'water_bridge', 'strength_push', 'web_sweep',
];
for (const key of gameKeys) {
  assert.match(html, new RegExp(`\\b${key}:\\s+_show`), `${key} starter is missing`);
}
assert.match(html, /donguri_bowl:\s+_showBowlGame/);
assert.match(html, /_playMazeVoice\('water_bridge', 'start'\)/);
assert.match(html, /_mzPrimeGameStartNarration\(game\)/);
assert.match(html, /_FLAG_COMMAND_VOICE_KEYS\.forEach/);

const cancelCount = (html.match(/_mzCancelEncounterStart\(\);/g) || []).length;
assert.ok(cancelCount >= 6, `expected cancellation hooks, found ${cancelCount}`);
assert.match(html, /_mzResetPendingEncounterStartForInactive\(\);[\s\S]*?_mzPauseAllAudio\(\)/);

console.log('maze minigame start beat verification: PASS');
