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
assert.match(stickerEntry, /sb3d_boy_cover_front_simple_jp_20260629\.webp/);
assert.match(stickerEntry, /aria-haspopup="dialog"/);
assert.match(stickerEntry, /aria-controls="game-modal"/);
assert.doesNotMatch(stickerEntry, /sticker-gallery_20260712|sticker-museum_20260712/);

const gachaDetail = lp.match(/'feature-gacha': \{[\s\S]*?\n\s+\]\n\s+\},/);
assert.ok(gachaDetail, "gacha detail modal data must exist");
assert.equal((gachaDetail[0].match(/\{src:/g) || []).length, 2, "gacha detail must contain the two current screens");
assert.match(gachaDetail[0], /gacha-reveal_20260712\.png/);
assert.match(gachaDetail[0], /donguri-shop_20260712\.png/);

const stickerDetail = lp.match(/'feature-sticker-book': \{[\s\S]*?\n\s+\]\n\s+\}/);
assert.ok(stickerDetail, "sticker-book detail modal data must exist");
assert.equal((stickerDetail[0].match(/\{src:/g) || []).length, 3, "sticker detail must contain cover, gallery, and museum");
assert.match(stickerDetail[0], /sb3d_boy_cover_front_simple_jp_20260629\.webp/);
assert.match(stickerDetail[0], /sticker-gallery_20260712\.png/);
assert.match(stickerDetail[0], /sticker-museum_20260712\.png/);
assert.match(stickerDetail[0], /fit:'contain'/, "the temporary square cover must not be cropped in the 16:9 modal slot");

const machinePath = path.join(root, "assets/lp/features/gacha-machine_20260712.webp");
const machine = fs.readFileSync(machinePath);
assert.equal(machine.subarray(0, 4).toString("ascii"), "RIFF");
assert.equal(machine.subarray(8, 12).toString("ascii"), "WEBP");
assert.equal(machine.subarray(12, 16).toString("ascii"), "VP8X");
assert.ok(machine[20] & 0x10, "gacha cover WebP must retain alpha");
const readU24LE = (offset) => machine[offset] | (machine[offset + 1] << 8) | (machine[offset + 2] << 16);
assert.equal(readU24LE(24) + 1, 1280, "gacha cover must be 1280px wide");
assert.equal(readU24LE(27) + 1, 720, "gacha cover must be 720px high");
assert.ok(machine.length <= 3 * 1024 * 1024, "gacha cover must stay within the repository 3MB limit");

console.log("lp_feature_drilldown_regression: all assertions passed");
