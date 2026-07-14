"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const play = fs.readFileSync(path.join(root, "play.html"), "utf8");

function readUint24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

// v1959 established (and v2161 re-established after a v2160-era regression)
// a hard invariant: WebKit falls off its fast composite path when an element
// inside a masked subtree (here, `.card-list`'s `-webkit-mask-image` fade)
// also carries a `filter`/`backdrop-filter`. The composite bug isn't scoped
// to one selector — any `.game-card`/`.card-list`-targeting rule anywhere in
// this 9000+ line stylesheet can reintroduce it. So instead of grepping for
// the one string that regressed last time, walk every CSS rule in the main
// <style> block and assert none of the mask-subtree-scoped ones declare a
// filter, no matter where in the file they live.
function extractStyleBlockCss(html) {
  const openTag = "\n  <style>\n";
  const start = html.indexOf(openTag);
  assert.ok(start !== -1, "main <style> block must exist");
  const end = html.indexOf("\n  </style>", start);
  assert.ok(end !== -1, "main <style> block must be closed");
  const rawCss = html.slice(start + openTag.length, end);
  // Strip CSS comments before the brace-depth walk in extractRuleBlocks: a
  // comment containing example CSS with balanced `{}` (a pattern already
  // used elsewhere in this stylesheet) would otherwise desync the walk's
  // selector/body split and could hide a real filter declaration from
  // assertNoFilterInCardMaskSubtree.
  return rawCss.replace(/\/\*[\s\S]*?\*\//g, "");
}

// Single-pass brace-depth walk: turns nested `@media { selector { decls } }`
// text into a flat list of {selector, body} leaf pairs. Nesting depth is
// unbounded (works for @media-inside-@supports etc.) because each level's
// body only ever holds the text since its last child closed.
function extractRuleBlocks(css) {
  const rules = [];
  const selectorStack = [];
  let buf = "";
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") {
      selectorStack.push(buf);
      buf = "";
    } else if (ch === "}") {
      rules.push({ selector: (selectorStack.pop() || "").trim(), body: buf });
      buf = "";
    } else {
      buf += ch;
    }
  }
  return rules;
}

const FILTER_DECL_RE = /(^|[^-\w])(-webkit-filter|filter|backdrop-filter)\s*:/;

function assertNoFilterInCardMaskSubtree(html) {
  const rules = extractRuleBlocks(extractStyleBlockCss(html));
  const maskSubtreeRules = rules.filter(
    (r) => r.selector.includes(".game-card") || r.selector.includes(".card-list"),
  );
  assert.ok(maskSubtreeRules.length > 20, "sanity check: expected dozens of .game-card/.card-list rules");
  const offenders = maskSubtreeRules.filter((r) => FILTER_DECL_RE.test(r.body));
  assert.equal(
    offenders.length,
    0,
    `no .game-card/.card-list rule may declare filter/-webkit-filter/backdrop-filter ` +
      `(mask×filter WebKit composite bug — v1959/20cf67cc, regressed+refixed v2161/cb295bad); ` +
      `offending selectors: ${offenders.map((o) => JSON.stringify(o.selector)).join(", ")}`,
  );
}

const pressedAssets = [
  ["assets/ui/gacha/daily_gacha_entry_button_pressed_gpt_image2_20260713.webp", 1839, 568],
  ["assets/ui/title/title_book_unlock_plate_pressed_gpt_image2_20260713.webp", 1973, 632],
  ["assets/ui/title/title_daily_challenge_maze_pressed_gpt_image2_20260713.webp", 1773, 680],
  ["assets/ui/title/title_daily_challenge_quizland_pressed_gpt_image2_20260713.webp", 1773, 680],
  ["assets/ui/title/title_daily_challenge_oto_pressed_gpt_image2_20260713.webp", 1773, 680],
  ["assets/ui/title/title_daily_challenge_puzzle_pressed_gpt_image2_20260713.webp", 1773, 680],
  ["assets/ui/title/title_daily_challenge_bento_pressed_gpt_image2_20260713.webp", 1773, 680],
];

for (const [relativePath, width, height] of pressedAssets) {
  const filePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(filePath), `${relativePath} must exist`);
  assert.ok(fs.statSync(filePath).size < 3 * 1024 * 1024, `${relativePath} must remain below 3 MB`);
  const webp = fs.readFileSync(filePath);
  assert.equal(webp.subarray(0, 4).toString("ascii"), "RIFF", `${relativePath} RIFF signature`);
  assert.equal(webp.subarray(8, 12).toString("ascii"), "WEBP", `${relativePath} WebP signature`);
  assert.equal(webp.subarray(12, 16).toString("ascii"), "VP8X", `${relativePath} must use extended WebP for alpha`);
  assert.ok((webp[20] & 0x10) !== 0, `${relativePath} must retain alpha`);
  assert.equal(readUint24LE(webp, 24) + 1, width, `${relativePath} width`);
  assert.equal(readUint24LE(webp, 27) + 1, height, `${relativePath} height`);
  assert.match(play, new RegExp(`<link rel="prefetch" as="image" href="${relativePath.replaceAll(".", "\\.")}">`), `${relativePath} must be prefetched`);
}

assert.match(play, /\.daily-gacha-entry:active \{\s*background-image: url\("assets\/ui\/gacha\/daily_gacha_entry_button_pressed_gpt_image2_20260713\.webp"\);[\s\S]*?translateY\(2px\) scale\(\.992\)/, "gacha entry needs a real pressed asset and depth shift");
assert.match(play, /\.book-unlock-entry:active \{\s*background-image: url\("assets\/ui\/title\/title_book_unlock_plate_pressed_gpt_image2_20260713\.webp"\);[\s\S]*?translateY\(2px\) scale\(\.992\)/, "book benefit entry needs pressed art");
assert.match(play, /\.daily-quest-info-banner:active \{\s*background-image: var\(--daily-quest-card-bg-pressed/, "daily challenge must swap to its current pressed variant");

for (const questId of ["maze", "quizland", "oto", "puzzle", "bento"]) {
  assert.match(
    play,
    new RegExp(`\\.daily-quest-info-banner\\[data-quest-id="${questId}"\\] \\{[\\s\\S]*?--daily-quest-card-bg: url\\("assets/ui/title/title_daily_challenge_${questId}_generated_v3_20260626\\.webp"\\);[\\s\\S]*?--daily-quest-card-bg-pressed: url\\("assets/ui/title/title_daily_challenge_${questId}_pressed_gpt_image2_20260713\\.webp"\\);`),
    `${questId} challenge must pair normal and pressed art`,
  );
}

assert.match(play, /\.game-card:active \.game-card__play,[\s\S]*?background-image: var\(--play-btn-pressed/, "the existing play-button pressed image must be driven by the clickable parent card");
// v2161: filter was dropped from both pressed rules (mask×filter WebKit bug,
// see assertNoFilterInCardMaskSubtree above) — this now only needs to assert
// the coming-soon pressed state stays a no-op depth shift (no fake press),
// with nothing else (filter included) sneaking into the same rule.
assert.match(play, /\.game-card\.is-coming-soon:not\(\.is-debug-playable\):active \{\s*transform: translateZ\(0\);\s*\}/, "disabled coming-soon cards must not fake an available press (no depth shift, no filter)");
assert.match(play, /\.profile-wallet__profile:active \{[\s\S]*?translateY\(2px\)/, "dynamic profile composition must retain its CSS press feedback");
assert.match(play, /\.bottom-nav\[data-pressed="feedback"\]::after[\s\S]*?pressed_feedback_20260710\.webp[\s\S]*?\.bottom-nav\[data-pressed="news"\]::after[\s\S]*?pressed_news_20260710\.webp[\s\S]*?\.bottom-nav\[data-pressed="settings"\]::after[\s\S]*?pressed_settings_20260710\.webp/, "existing joined bottom-nav pressed images must remain wired");
assert.match(play, /#pono-game-splash \.pgs-btn:active \{\s*animation: none;[\s\S]*?translateY\(3px\) scale\(\.98\)/, "short-lived splash button still needs immediate CSS feedback");

assertNoFilterInCardMaskSubtree(play);

console.log("title_pressed_button_regression: all assertions passed");
