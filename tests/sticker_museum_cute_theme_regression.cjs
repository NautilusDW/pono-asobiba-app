#!/usr/bin/env node
"use strict";

// batch:1284: ミュージアムらしい展示構成は維持しながら、
// シールちょうとつながる明るい絵本調の画像・配色を固定する。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const museumRoot = path.join(root, "Prototypes/StickerExhibitionCarousel");
const index = fs.readFileSync(path.join(museumRoot, "index.html"), "utf8");
const main = fs.readFileSync(path.join(museumRoot, "main.js"), "utf8");
const css = fs.readFileSync(path.join(museumRoot, "styles.css"), "utf8");
const nativeManifest = JSON.parse(fs.readFileSync(path.join(root, "native/content-manifest.json"), "utf8"));

assert.match(index, /styles\.css\?v=20260713-1286/);
assert.match(index, /main\.js\?v=20260713-1284/);
assert.match(index, /sticker-exhibition-map-cute-20260713\.webp/);
assert.doesNotMatch(index, /sticker-exhibition-map-floor1\.png/);
assert.match(main, /sticker-carousel-frame-cute-20260713\.webp/);
assert.doesNotMatch(main, /sticker-carousel-frame-base-v4\.png/);
assert.match(css, /color-scheme:\s*light/);
assert.match(css, /sticker-exhibition-room-bg-cute-20260713\.webp/);
assert.doesNotMatch(css, /sticker-exhibition-room-bg-v1\.png/);
assert.match(css, /--ink:\s*#5a422d/);
assert.match(css, /background:\s*rgba\(255, 252, 239, 0\.86\)/,
  "the top bar must use the warm cream picture-book surface");
assert.match(css, /outline:\s*4px solid #2f746a/,
  "the light theme must keep a high-visibility keyboard focus ring");
assert.match(css, /\.stage\.is-map \.topbar::after\s*\{[\s\S]*?flex:\s*0 0 var\(--map-side-balance\)/,
  "the map title must have an equal-width spacer opposite the home button");
assert.match(css, /\.stage\.is-map \.topbar\s*\{[\s\S]*?gap:\s*4px/,
  "the centered title must retain enough width at 390px portrait");
assert.match(css, /--map-side-balance:\s*58px/,
  "the short landscape header must mirror the smaller home button width");

const nativeSources = new Set(nativeManifest.entries.map((entry) => entry.source));
for (const name of [
  "sticker-carousel-frame-cute-20260713.webp",
  "sticker-exhibition-map-cute-20260713.webp",
  "sticker-exhibition-room-bg-cute-20260713.webp",
]) {
  assert.ok(nativeSources.has(`Prototypes/StickerExhibitionCarousel/assets/${name}`),
    `${name} must be included in the native package`);
}
for (const name of [
  "sticker-carousel-frame-base-v4.png",
  "sticker-exhibition-map-floor1.png",
  "sticker-exhibition-room-bg-v1.png",
]) {
  assert.ok(!nativeSources.has(`Prototypes/StickerExhibitionCarousel/assets/${name}`),
    `${name} is no longer a runtime museum asset`);
}

function readWebp(relativePath) {
  const filePath = path.join(root, relativePath);
  const data = fs.readFileSync(filePath);
  assert.equal(data.subarray(0, 4).toString("ascii"), "RIFF", `${relativePath} must be RIFF`);
  assert.equal(data.subarray(8, 12).toString("ascii"), "WEBP", `${relativePath} must be WebP`);
  assert.ok(data.length <= 3 * 1024 * 1024, `${relativePath} must stay below 3MB`);
  const chunk = data.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X") {
    const readU24LE = (offset) => data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16);
    return {
      width: readU24LE(24) + 1,
      height: readU24LE(27) + 1,
      alpha: Boolean(data[20] & 0x10),
    };
  }
  assert.equal(chunk, "VP8 ", `${relativePath} must use VP8/VP8X WebP`);
  assert.deepEqual([...data.subarray(23, 26)], [0x9d, 0x01, 0x2a], `${relativePath} VP8 signature`);
  return {
    width: data.readUInt16LE(26) & 0x3fff,
    height: data.readUInt16LE(28) & 0x3fff,
    alpha: false,
  };
}

const map = readWebp("Prototypes/StickerExhibitionCarousel/assets/sticker-exhibition-map-cute-20260713.webp");
const room = readWebp("Prototypes/StickerExhibitionCarousel/assets/sticker-exhibition-room-bg-cute-20260713.webp");
const frame = readWebp("Prototypes/StickerExhibitionCarousel/assets/sticker-carousel-frame-cute-20260713.webp");
assert.deepEqual(map, { width: 1672, height: 941, alpha: false });
assert.deepEqual(room, { width: 1672, height: 941, alpha: false });
assert.deepEqual(frame, { width: 1448, height: 1086, alpha: true });

for (const name of ["sticker-gallery_20260713_003.webp", "sticker-museum_20260713_005.webp"]) {
  assert.deepEqual(readWebp(`assets/lp/features/${name}`), { width: 1280, height: 720, alpha: true });
}

console.log("sticker_museum_cute_theme_regression: all assertions passed");
