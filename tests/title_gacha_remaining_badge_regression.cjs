const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'play.html'), 'utf8');

assert.match(
  html,
  /<span class="daily-gacha-entry__remaining" id="dailyGachaRemaining" aria-hidden="true" hidden><\/span>/,
  'the title gacha banner must contain a dedicated visual remaining-count badge'
);

const css = html.match(/\.daily-gacha-entry__remaining \{[\s\S]*?\n    \}/);
assert.ok(css, 'the remaining-count badge must have a style block');
assert.match(css[0], /position:\s*absolute/, 'the badge must overlay the banner without shifting layout');
assert.match(css[0], /top:\s*4px/, 'the badge must sit inside the banner top edge');
assert.match(css[0], /right:\s*4px/, 'the badge must sit inside the banner right edge');
assert.match(css[0], /pointer-events:\s*none/, 'the badge must not block the gacha button hit target');
assert.match(css[0], /white-space:\s*nowrap/, 'the short remaining label must stay on one line');

const remainingFn = html.match(/function getDailyGachaRemainingCount\(\) \{([\s\S]*?)\n    \}/);
assert.ok(remainingFn, 'getDailyGachaRemainingCount() must remain defined');
const calculateRemaining = new Function('getDailyGachaCount', remainingFn[1]);

for (const [count, expected] of [[0, 2], [1, 1], [1.8, 1], [2, 0], [9, 0], [-2, 2], [NaN, 2]]) {
  assert.equal(
    calculateRemaining(() => count),
    expected,
    `count=${count} must render a clamped remaining total of ${expected}`
  );
}

const updateFn = html.match(/function updateDailyGachaEntry\(\) \{([\s\S]*?)\n    \}/);
assert.ok(updateFn, 'updateDailyGachaEntry() must remain defined');
assert.match(updateFn[1], /`あと\$\{remainingNumeral\}かい`/, 'the child-facing badge copy must use kana and compact numerals');
assert.match(updateFn[1], /dailyGachaRemaining\.dataset\.remaining = String\(remaining\)/, 'the visual state must expose the current remaining value');
assert.match(updateFn[1], /dailyGachaEntry\.setAttribute\('aria-label'/, 'the button accessible name must stay in sync');
assert.match(updateFn[1], /チャレンジを クリアすると まわせるよ/, 'the accessible name must explain the locked final pull');

assert.match(
  html,
  /setDailyGachaRecord\(dailyGachaRecordFromResult\(result, getDailyGachaRecord\(\)\)\);\s*updateDailyGachaEntry\(\);/,
  'a successful pull must update the title badge immediately after persisting its count'
);
assert.match(html, /PonoDailyQuest\.subscribe\(updateDailyGachaEntry\)/, 'quest/date changes must refresh the badge');
assert.match(html, /event\.key == null \|\| event\.key === DAILY_GACHA_KEY\) updateDailyGachaEntry\(\)/, 'cross-tab gacha changes and storage clears must refresh the badge');
assert.match(html, /window\.addEventListener\('pageshow', updateDailyGachaEntry\)/, 'history/BFCache returns must refresh the badge');

console.log('title_gacha_remaining_badge_regression: all assertions passed');
