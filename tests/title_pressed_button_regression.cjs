"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const play = fs.readFileSync(path.join(root, "play.html"), "utf8");

function readUint24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
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
assert.match(play, /\.game-card\.is-coming-soon:not\(\.is-debug-playable\):active \{\s*transform: translateZ\(0\);\s*filter: none;/, "disabled coming-soon cards must not fake an available press");
assert.match(play, /\.profile-wallet__profile:active \{[\s\S]*?translateY\(2px\)/, "dynamic profile composition must retain its CSS press feedback");
assert.match(play, /\.bottom-nav\[data-pressed="feedback"\]::after[\s\S]*?pressed_feedback_20260710\.webp[\s\S]*?\.bottom-nav\[data-pressed="news"\]::after[\s\S]*?pressed_news_20260710\.webp[\s\S]*?\.bottom-nav\[data-pressed="settings"\]::after[\s\S]*?pressed_settings_20260710\.webp/, "existing joined bottom-nav pressed images must remain wired");
assert.match(play, /#pono-game-splash \.pgs-btn:active \{\s*animation: none;[\s\S]*?translateY\(3px\) scale\(\.98\)/, "short-lived splash button still needs immediate CSS feedback");

console.log("title_pressed_button_regression: all assertions passed");
