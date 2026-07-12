"use strict";

// batch:1269: placed-sticker touch movement, full-width tray browsing, and
// discoverable screenshot controls must stay fixed together.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const styles = fs.readFileSync(path.join(root, "Prototypes/StickerBookThreeJS/styles.css"), "utf8");
const index = fs.readFileSync(path.join(root, "Prototypes/StickerBookThreeJS/index.html"), "utf8");

const baseScene = styles.match(/#scene \{[\s\S]*?\n\}/);
assert.ok(baseScene, "#scene base style must exist");
assert.match(baseScene[0], /touch-action: pan-y;/, "view mode must retain normal vertical page gestures");

const editScene = styles.match(/body\.is-sticker-edit-mode #scene \{[\s\S]*?\n\}/);
assert.ok(editScene, "edit mode must have a dedicated touch policy");
assert.match(editScene[0], /touch-action: none;/, "the browser must not pointercancel vertical placed-sticker drags");

assert.match(
  styles,
  /padding-right: max\(112px, calc\(50% - 43px\)\);/,
  "the 86px tray cards must leave enough end space to center the final sticker",
);
assert.match(
  styles,
  /padding-right: max\(8px, calc\(50% - 36px\)\);/,
  "the compact 72px tray cards must leave enough end space to center the final sticker",
);
assert.match(
  styles,
  /padding-right: max\(8px, calc\(50% - 33px\)\);/,
  "the landscape 66px tray cards must leave enough end space to center the final sticker",
);

const bootstrapRegister = index.match(/function registerBootstrapCapture\(\) \{[\s\S]*?\n    \}/);
assert.ok(bootstrapRegister, "StickerBook must keep its cold-start capture registration");
assert.ok(
  bootstrapRegister[0].indexOf("window.PonoCapture.register") < bootstrapRegister[0].indexOf("window.PonoCapture.show"),
  "the screenshot target must be registered before its controls are shown",
);
assert.match(
  bootstrapRegister[0],
  /PonoCapture\.isAllowed[\s\S]*?PonoCapture\.show\(\)/,
  "an enabled, gated capture feature must show its controls even without ?capture=1",
);
assert.match(index, /styles\.css\?v=20260713-1275/, "the latest StickerBook CSS must bypass stale browser caches");

console.log("stickerbook_touch_tray_capture_regression: all assertions passed");
