"use strict";

// batch:1269: Safari/WebKit must not wait forever for off-screen lazy tray
// images, and rapid placed-sticker pointermoves must not build a refresh queue.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "Prototypes/StickerBookThreeJS/main.js"), "utf8");

function section(start, end) {
  const from = main.indexOf(start);
  const to = main.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `missing source section: ${start}`);
  return main.slice(from, to);
}

const webKitDetector = section(
  "function isStickerBookWebKitCapture()",
  "function collectStickerBookFixedCaptureGeometry",
);
const detectWebKit = new Function("navigator", `${webKitDetector}; return isStickerBookWebKitCapture();`);
assert.equal(detectWebKit({ userAgent: "Mozilla/5.0 AppleWebKit/605.1.15 Version/18.5 Safari/605.1.15" }), true);
assert.equal(detectWebKit({ userAgent: "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/149.0 Mobile/15E148 Safari/604.1" }), true);
assert.equal(detectWebKit({ userAgent: "Mozilla/5.0 (iPad) AppleWebKit/605.1.15 EdgiOS/149.0 Mobile/15E148 Safari/604.1" }), true);
assert.equal(detectWebKit({ userAgent: "Mozilla/5.0 AppleWebKit/537.36 Chrome/149.0 Safari/537.36" }), false);
assert.equal(detectWebKit({ userAgent: "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/149.0 Mobile Safari/537.36" }), false);

const sourceImages = section(
  "function prepareStickerBookCaptureSourceImages(container)",
  "function pruneStickerBookCaptureTray",
);
assert.match(sourceImages, /const ignoredImages = new WeakSet\(\)/, "off-screen images must be excluded before WebKit's pre-onclone wait");
assert.match(sourceImages, /ignoredImages\.add\(image\)/, "non-visible tray images must enter the ignore set");
assert.match(sourceImages, /image\.setAttribute\("loading", "eager"\)/, "visible lazy images must start loading in the hidden clone iframe");
assert.match(sourceImages, /eagerImages\.forEach[\s\S]*?"lazy"/, "temporary eager attributes must be restored");

const trayPrune = section(
  "function pruneStickerBookCaptureTray(clonedDoc)",
  "function prepareStickerBookCaptureClone",
);
assert.match(trayPrune, /clonedTray\.scrollLeft = sourceTray\.scrollLeft/, "a capture must preserve a tray scrolled to its far end");

const clonePrep = section(
  "function prepareStickerBookCaptureClone(clonedDoc, captureState, sceneDataUrl)",
  "function loadStickerBookCaptureRenderer",
);
assert.match(clonePrep, /sticker_book_table_bg_1600\.webp/, "the clone must contain a real table image instead of relying on a pseudo-element");
assert.match(clonePrep, /sceneImage\.src = sceneDataUrl/, "the clone must replace WebGL with its preserved raster frame");
assert.match(clonePrep, /element\.style\.position = "absolute"/, "fixed controls must be frozen into measured clone coordinates");
assert.match(clonePrep, /sceneImage\.decode\(\)/, "the injected WebGL image must decode before common onclone processing");

const build = section("async function buildStickerBookCapture(opts)", "window.__stickerBookCaptureBootstrap");
assert.match(build, /Math\.min\(dynScale, 2\.5\)/, "WebKit capture must cap memory while retaining enough pixels for a 1920px LP export");
assert.match(build, /scale: dynScale/, "Chromium must retain its uncapped dynamic supersampling path");
assert.match(build, /baseIgnoreElements[\s\S]*?captureSourceImages\.ignoredImages\.has\(element\)/, "the image workaround must run during cloning, before WebKit waits for document.images");
assert.match(build, /await prepareStickerBookCaptureClone[\s\S]*?await baseOnclone/, "the stable clone must still run the shared capture quality hook");
assert.match(build, /captureSourceImages\?\.release\(\)[\s\S]*?captureCloneState\?\.release\(\)/, "temporary live-DOM capture state must always be released");

const refresh = section("function refreshInlineStickerPage()", "function clearInlineStickerSelection");
assert.match(refresh, /if \(inlineStickerRefreshPromise\) \{[\s\S]*?if \(!inlineStickerDragState\) \{\s*inlineStickerRefreshQueued = true;/, "pointermoves must not queue another refresh while a drag refresh is running");
assert.match(refresh, /if \(applied === false && !inlineStickerDragState\)/, "a stale async result must also wait for pointerup during a drag");

for (const [name, next] of [
  ["endInlineStickerDrag", "function cancelInlineStickerDrag"],
  ["cancelInlineStickerDrag", "function cleanupInlineStickerDrag"],
]) {
  const fn = section(`function ${name}`, next);
  assert.match(fn, /const moved = inlineStickerDragState\.moved;/, `${name} must remember whether the sticker moved`);
  assert.ok(fn.indexOf("cleanupInlineStickerDrag();") < fn.indexOf("refreshInlineStickerPage();"), `${name} must end drag coalescing before scheduling the final refresh`);
  assert.equal((fn.match(/refreshInlineStickerPage\(\);/g) || []).length, 1, `${name} must schedule exactly one final refresh`);
}

console.log("stickerbook_webkit_capture_drag_regression: all assertions passed");
