"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const prototypeRoot = path.join(root, "Prototypes/StickerBookThreeJS");
const css = fs.readFileSync(path.join(prototypeRoot, "styles.css"), "utf8");
const index = fs.readFileSync(path.join(prototypeRoot, "index.html"), "utf8");
const assetRoot = path.join(root, "assets/_PonoSubmarine/Art/UI/StickerBook3D");

const pressedAssets = [
  ["sb3d_ui_button_mode_view_pressed_gpt_image2_20260713.png", 868, 272],
  ["sb3d_ui_button_mode_paste_pressed_gpt_image2_20260713.png", 868, 272],
  ["sb3d_ui_button_cover_pressed_gpt_image2_20260713.png", 868, 272],
  ["sb3d_ui_button_museum_pressed_gpt_image2_20260713.png", 868, 272],
  ["sb3d_ui_button_settings_pressed_gpt_image2_20260713.png", 320, 320],
  ["sb3d_ui_button_prev_pressed_gpt_image2_20260713.png", 320, 320],
  ["sb3d_ui_button_next_pressed_gpt_image2_20260713.png", 320, 320],
  ["sb3d_ui_page_label_pressed_gpt_image2_20260713.png", 620, 190],
];

for (const [fileName, width, height] of pressedAssets) {
  const filePath = path.join(assetRoot, fileName);
  assert.ok(fs.existsSync(filePath), `${fileName} must exist`);
  assert.ok(fs.statSync(filePath).size < 3 * 1024 * 1024, `${fileName} must remain below 3 MB`);
  const png = fs.readFileSync(filePath);
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${fileName} must be PNG`);
  assert.equal(png.readUInt32BE(16), width, `${fileName} width`);
  assert.equal(png.readUInt32BE(20), height, `${fileName} height`);
  assert.equal(png[25], 6, `${fileName} must retain RGBA transparent corners`);
  assert.match(index, new RegExp(`<link rel="prefetch" as="image" href="[^\"]*${fileName.replaceAll(".", "\\.")}">`), `${fileName} should receive a best-effort idle prefetch`);
}

for (const variable of [
  "mode-view-pressed",
  "mode-paste-pressed",
  "settings-pressed",
  "theme-pressed",
  "exhibition-pressed",
  "prev-pressed",
  "next-pressed",
  "page-label-pressed",
]) {
  assert.match(css, new RegExp(`--sb3d-ui-(?:button-)?${variable}: url\\(`), `${variable} CSS variable must exist`);
}

assert.match(css, /\.top-edit-button:active \{\s*background-image: var\(--sb3d-ui-button-mode-view-pressed\)/, "view mode needs its pressed art");
assert.match(css, /body\.is-sticker-edit-mode \.top-edit-button:active \{\s*background-image: var\(--sb3d-ui-button-mode-paste-pressed\)/, "paste mode needs the more-specific pressed art");
assert.match(css, /\.top-edit-button\.is-tutorial-pressing \{\s*background-image: var\(--sb3d-ui-button-mode-view-pressed\)/, "tutorial auto-press must use real pressed art");
assert.match(css, /body\.is-sticker-edit-mode \.top-edit-button\.is-tutorial-pressing \{\s*background-image: var\(--sb3d-ui-button-mode-paste-pressed\)/, "paste tutorial auto-press must keep its own art");
assert.match(css, /\.top-theme-button:active \{\s*background-image: var\(--sb3d-ui-button-theme-pressed\)/, "cover button needs pressed art");
assert.match(css, /\.sticker-exhibition-button:active \{\s*background-image: var\(--sb3d-ui-button-exhibition-pressed\)/, "museum button needs pressed art");
assert.match(css, /#topSettingsButton:active \{\s*background-image: var\(--sb3d-ui-button-settings-pressed\)/, "settings button needs pressed art");
assert.match(css, /\.top-edit-button:active,[\s\S]*?#topSettingsButton:active \{[\s\S]*?translateY\(2px\) scale\(0\.992\)[\s\S]*?brightness\(0\.94\)/, "top buttons need immediate CSS depth even if prefetch has not decoded yet");
assert.match(css, /\.book-page-button-left:active:not\(:disabled\) \{\s*background-image: var\(--sb3d-ui-button-prev-pressed\)/, "enabled previous button needs pressed art");
assert.match(css, /\.book-page-button-right:active:not\(:disabled\) \{\s*background-image: var\(--sb3d-ui-button-next-pressed\)/, "enabled next button needs pressed art");
assert.match(css, /\.book-page-label:active:not\(\[hidden\]\) \{\s*background-image: var\(--sb3d-ui-page-label-pressed\)/, "visible page label needs pressed art");
assert.match(css, /\.book-page-button-left:active:not\(:disabled\) \{[\s\S]*?brightness\(0\.94\)/, "previous page needs a no-layout fallback press");
assert.match(css, /\.book-page-button-right:active:not\(:disabled\) \{[\s\S]*?brightness\(0\.94\)/, "next page needs a no-layout fallback press");
assert.match(css, /\.book-page-label:active:not\(\[hidden\]\) \{[\s\S]*?brightness\(0\.94\)/, "page label needs a fallback press");
assert.match(index, /styles\.css\?v=20260713-1278/);
assert.match(index, /main\.js\?v=20260713-1278/);

console.log("stickerbook_pressed_button_regression: all assertions passed");
