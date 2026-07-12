const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'play.html'), 'utf8');

assert.match(
  html,
  /<span class="daily-gacha-entry__remaining" id="dailyGachaRemaining" aria-hidden="true" hidden><span class="daily-gacha-entry__remaining-copy"><span class="daily-gacha-entry__remaining-word">あと<\/span><strong class="daily-gacha-entry__remaining-number" id="dailyGachaRemainingNumber">２<\/strong><span class="daily-gacha-entry__remaining-word">かい<\/span><\/span><\/span>/,
  'the visual badge must separate its small kana from the emphasized numeral'
);

const css = html.match(/\.daily-gacha-entry__remaining \{[\s\S]*?\n    \}/);
assert.ok(css, 'the remaining-count badge must have a style block');
assert.match(css[0], /position:\s*absolute/, 'the badge must overlay the banner without shifting layout');
assert.match(css[0], /top:\s*4px/, 'the badge must sit inside the banner top edge');
assert.match(css[0], /right:\s*4px/, 'the badge must sit inside the banner right edge');
assert.match(css[0], /pointer-events:\s*none/, 'the badge must not block the gacha button hit target');
assert.match(css[0], /white-space:\s*nowrap/, 'the short remaining label must stay on one line');
assert.match(css[0], /overflow:\s*hidden/, 'the light sweep must remain clipped inside the badge');
assert.match(css[0], /isolation:\s*isolate/, 'the light sweep must stay in the badge stacking context');

const copyCss = html.match(/\.daily-gacha-entry__remaining-copy \{[\s\S]*?\n    \}/);
const wordCss = html.match(/\.daily-gacha-entry__remaining-word \{[\s\S]*?\n    \}/);
const numberCss = html.match(/\.daily-gacha-entry__remaining-number \{[\s\S]*?\n    \}/);
assert.ok(copyCss && wordCss && numberCss, 'the badge copy, kana, and numeral need separate style blocks');
assert.match(copyCss[0], /z-index:\s*2/, 'the readable copy must sit above the sweep');
assert.match(wordCss[0], /font-size:\s*11px/, 'the kana must stay compact');
assert.match(wordCss[0], /text-shadow:[\s\S]*?-1px 0 0[\s\S]*?0 -1px 0/, 'small kana need a dark all-direction outline on the coral gradient');
assert.match(numberCss[0], /font-size:\s*30px/, 'the remaining count must be the visual focus');
assert.match(numberCss[0], /font-variant-numeric:\s*tabular-nums/, 'count changes must not make the badge wobble');
assert.match(numberCss[0], /color:\s*#fff0a1/, 'the numeral must stand out from the white kana');
assert.match(numberCss[0], /text-shadow:[\s\S]*?-1px 0 0[\s\S]*?0 -1px 0/, 'the large numeral needs a dark outline on the coral gradient');
assert.match(
  html,
  /@media \(orientation: landscape\) and \(max-height: 540px\)[\s\S]*?min-width: 140px;[\s\S]*?padding-inline: 10px;[\s\S]*?\.daily-gacha-entry__remaining-word \{\s*font-size: 18px;[\s\S]*?\.daily-gacha-entry__remaining-number \{\s*font-size: 38px;/,
  'short landscape must keep kana readable while preserving a much larger numeral'
);

const sweepCss = html.match(/\.daily-gacha-entry__remaining\[data-remaining\]:not\(\[data-remaining="0"\]\)::after \{[\s\S]*?\n    \}/);
assert.ok(sweepCss, 'only available pulls should enable the sweep');
assert.match(sweepCss[0], /dailyGachaRemainingSweep 8s ease-in-out infinite/, 'the sweep needs a long quiet period between passes');
const sweepKeyframes = html.match(/@keyframes dailyGachaRemainingSweep \{[\s\S]*?\n    \}/);
assert.ok(sweepKeyframes, 'the left-to-right sweep keyframes must exist');
assert.match(sweepKeyframes[0], /translateX\(0\)/, 'the sweep must begin left of the badge');
assert.match(sweepKeyframes[0], /translateX\(470%\)/, 'the sweep must travel beyond the right edge');
assert.match(sweepKeyframes[0], /15%[\s\S]*?100%/, 'most of each cycle must stay visually quiet');
assert.doesNotMatch(html, /\[data-remaining="0"\]::after\s*\{[^}]*animation:/, 'zero remaining pulls must not animate');
assert.match(
  html,
  /@media \(prefers-reduced-motion: reduce\) \{\s*\.daily-gacha-entry__remaining::after \{\s*display: none;\s*animation: none;/,
  'reduced-motion users must not receive the sweep'
);

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
assert.match(html, /const dailyGachaRemainingNumber = document\.getElementById\('dailyGachaRemainingNumber'\)/, 'the emphasized numeral must have a stable DOM binding');
assert.match(updateFn[1], /`あと\$\{remainingNumeral\}かい`/, 'the child-facing badge copy must use kana and compact numerals');
assert.match(updateFn[1], /dailyGachaRemainingNumber\.textContent = remainingNumeral/, 'only the large numeral should update in the fixed badge copy');
assert.doesNotMatch(updateFn[1], /innerHTML/, 'count updates must not rebuild badge markup');
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
