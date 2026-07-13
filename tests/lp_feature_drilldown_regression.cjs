"use strict";

// batch:1269: 「遊びのほかにも」は、初期表示を表紙1枚に絞り、
// 押した時だけ既存のガチャガチャ／お店／ミュージアム画面を見せる。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const lp = fs.readFileSync(path.join(root, "index.html"), "utf8");

function entryButton(gameId) {
  const match = lp.match(new RegExp(
    `<button[^>]*class="[^"]*pc-feature-entry[^"]*"[^>]*data-game="${gameId}"[\\s\\S]*?<\\/button>`,
  ));
  assert.ok(match, `${gameId} must have a native cover button`);
  return match[0];
}

const gachaEntry = entryButton("feature-gacha");
assert.equal((gachaEntry.match(/<img\b/g) || []).length, 1, "gacha must initially show exactly one image");
assert.match(gachaEntry, /assets\/lp\/features\/gacha-machine_20260712\.webp/);
assert.match(gachaEntry, /aria-haspopup="dialog"/);
assert.match(gachaEntry, /aria-controls="game-modal"/);
assert.doesNotMatch(gachaEntry, /gacha-reveal_20260712|donguri-shop_20260712/);

const stickerEntry = entryButton("feature-sticker-book");
assert.equal((stickerEntry.match(/<img\b/g) || []).length, 1, "sticker book must initially show exactly one image");
assert.match(stickerEntry, /assets\/lp\/features\/sticker-book_20260713_001_sticker-book\.webp/);
assert.match(stickerEntry, /width="1280" height="720"/);
assert.match(stickerEntry, /alt="シールを貼って楽しむ、見開きのシールちょう画面"/);
assert.match(stickerEntry, /aria-haspopup="dialog"/);
assert.match(stickerEntry, /aria-controls="game-modal"/);
assert.doesNotMatch(stickerEntry, /sticker-gallery_20260712|sticker-museum_20260712/);
assert.doesNotMatch(stickerEntry, /仮表紙|sb3d_boy_cover_front/);

const gachaDetail = lp.match(/'feature-gacha': \{[\s\S]*?\n\s+\]\n\s+\},/);
assert.ok(gachaDetail, "gacha detail modal data must exist");
assert.equal((gachaDetail[0].match(/\{src:/g) || []).length, 2, "gacha detail must contain the two current screens");
assert.match(gachaDetail[0], /gacha-reveal_20260712\.png/);
assert.match(gachaDetail[0], /donguri-shop_20260712\.png/);

const stickerDetail = lp.match(/'feature-sticker-book': \{[\s\S]*?\n\s+\]\n\s+\}/);
assert.ok(stickerDetail, "sticker-book detail modal data must exist");
assert.equal((stickerDetail[0].match(/\{src:/g) || []).length, 3, "sticker detail must contain cover, gallery, and museum");
assert.match(stickerDetail[0], /sticker-book_20260713_001_sticker-book\.webp/);
assert.match(stickerDetail[0], /sticker-gallery_20260712\.png/);
assert.match(stickerDetail[0], /sticker-museum_20260712\.png/);
assert.match(stickerDetail[0], /fit:'contain'/, "the transparent 16:9 sticker-book screen must remain uncropped in the modal");
assert.doesNotMatch(lp, /青いシールちょうの仮表紙/);
assert.match(lp, /\.pc-feature-entry--sticker \.pc-feature-media img\{[\s\S]*?padding:0;[\s\S]*?object-fit:contain;/,
  "the new 16:9 screen must use the full entry frame without the old square-cover inset");

const machinePath = path.join(root, "assets/lp/features/gacha-machine_20260712.webp");
const machine = fs.readFileSync(machinePath);
assert.equal(machine.subarray(0, 4).toString("ascii"), "RIFF");
assert.equal(machine.subarray(8, 12).toString("ascii"), "WEBP");
assert.equal(machine.subarray(12, 16).toString("ascii"), "VP8X");
assert.ok(machine[20] & 0x10, "gacha cover WebP must retain alpha");
const readU24LE = (buffer, offset) => buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
assert.equal(readU24LE(machine, 24) + 1, 1280, "gacha cover must be 1280px wide");
assert.equal(readU24LE(machine, 27) + 1, 720, "gacha cover must be 720px high");
assert.ok(machine.length <= 3 * 1024 * 1024, "gacha cover must stay within the repository 3MB limit");

const stickerPath = path.join(root, "assets/lp/features/sticker-book_20260713_001_sticker-book.webp");
const sticker = fs.readFileSync(stickerPath);
assert.equal(sticker.subarray(0, 4).toString("ascii"), "RIFF");
assert.equal(sticker.subarray(8, 12).toString("ascii"), "WEBP");
assert.equal(sticker.subarray(12, 16).toString("ascii"), "VP8X");
assert.ok(sticker[20] & 0x10, "sticker-book WebP must retain the supplied alpha bands");
assert.equal(readU24LE(sticker, 24) + 1, 1280, "sticker-book cover must be 1280px wide");
assert.equal(readU24LE(sticker, 27) + 1, 720, "sticker-book cover must be 720px high");
assert.ok(sticker.length <= 3 * 1024 * 1024, "sticker-book cover must stay within the repository 3MB limit");

console.log("lp_feature_drilldown_regression: all assertions passed");
