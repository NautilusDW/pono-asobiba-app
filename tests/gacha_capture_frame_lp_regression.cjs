"use strict";

// batch:1260 regression coverage for the play-page gacha/shop capture fixes,
// the used-state wooden frame, and parent-facing LP terminology.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const play = fs.readFileSync(path.join(root, "play.html"), "utf8");
const lp = fs.readFileSync(path.join(root, "index.html"), "utf8");

const gachaBuild = play.match(/gameId: 'play-gacha'[\s\S]*?return await html2canvas\(container, h2cOpts\);/);
assert.ok(gachaBuild, "play.html must keep the play-gacha html2canvas build");
assert.match(
  gachaBuild[0],
  /var gachaCaptureSnapshot = snapshotGachaCaptureState\(modal\);/,
  "the logical gacha state must be captured synchronously"
);
assert.ok(
  gachaBuild[0].indexOf("snapshotGachaCaptureState(modal)") <
    gachaBuild[0].indexOf("await loadPlayCaptureRenderer()"),
  "the state snapshot must happen before the first renderer await"
);
assert.match(
  gachaBuild[0],
  /addGachaCaptureCloneFix\(h2cOpts, gachaCaptureSnapshot\);/,
  "the gacha build must install its clone-state repair"
);

const cloneFix = play.match(/function addGachaCaptureCloneFix\(h2cOpts, snapshot\)\{[\s\S]*?\n    \}/);
assert.ok(cloneFix, "the play-local gacha onclone wrapper must remain defined");
assert.match(
  cloneFix[0],
  /Promise\.resolve\(sharedResult\)/,
  "html2canvas must await the shared async onclone work"
);
assert.ok(
  cloneFix[0].indexOf("restoreGachaCaptureState") <
    cloneFix[0].indexOf("sharedOnclone(clonedDoc)"),
  "logical state must be restored before the shared hook reads computed styles"
);
assert.ok(
  cloneFix[0].indexOf("freezeGachaCaptureAnimations") <
    cloneFix[0].indexOf("sharedOnclone(clonedDoc)"),
  "animations must be frozen before the shared hook starts async background work"
);
assert.match(
  cloneFix[0],
  /Promise\.resolve\(sharedResult\)\.then[\s\S]*keepGachaCaptureGuideBackground\(clonedDoc\)/,
  "the promoted guide background must be retained after shared async conversion"
);
assert.match(play, /animation-delay: -9999s !important;/, "finite reveal animations must resolve to their end frame");
assert.match(play, /animation-play-state: paused !important;/, "capture-clone animations must stay paused");
assert.match(play, /transition: none !important;/, "capture-clone transitions must not restart");

const stepZeroStatus = play.match(/\.daily-gacha-modal\[data-gacha-step="0"\] \.daily-gacha-status \{[\s\S]*?\n    \}/);
const laterStatus = play.match(/\.daily-gacha-modal\[data-gacha-step="1"\] \.daily-gacha-status,[\s\S]*?\.daily-gacha-modal\[data-gacha-step="3"\] \.daily-gacha-status \{[\s\S]*?\n    \}/);
assert.ok(stepZeroStatus && laterStatus, "all gacha guide-status variants must remain styled");
assert.match(stepZeroStatus[0], /filter: none;/, "step-zero guide must not use a compositor drop-shadow");
assert.match(stepZeroStatus[0], /overflow: visible;/, "step-zero transparent art must not be mask-clipped");
assert.match(laterStatus[0], /filter: none;/, "later guide bubbles must not use a compositor drop-shadow");
assert.doesNotMatch(
  play,
  /data-quest-bonus="1"[^\{]*\.daily-gacha-panel\s*\{[^}]*box-shadow/,
  "bonus mode must not put a rectangular glow on the transparent guide panel"
);

const usedFrame = play.match(/\.daily-gacha-center-msg\[data-msg-mode="used"\] \{[\s\S]*?\n    \}/);
assert.ok(usedFrame, "the already-drawn state must have an explicit visual mode");
assert.match(usedFrame[0], /Fukuro_frame_003\.webp/, "the already-drawn state must use the owl-riddle question frame");
assert.match(usedFrame[0], /aspect-ratio: 1252 \/ 201;/, "the wooden frame must keep its native aspect ratio");
assert.doesNotMatch(usedFrame[0], /daily_gacha_start_speech_bubble/, "the already-drawn state must not use a speech bubble");

assert.match(
  play,
  /<img class="donguri-shop-v2-title__image" data-src="assets\/ui\/shop\/komorebiya_cute_text_baked_sign_20260626\.png"/,
  "the shop sign must be a real img so capture background promotion cannot clip half of it"
);
const showShop = play.match(/function showShop\(\) \{[\s\S]*?\n    \}/);
assert.ok(showShop, "play.html must keep showShop() defined");
assert.match(showShop[0], /shopTitleImg\.src = shopTitleImg\.getAttribute\('data-src'\)/, "showShop must promote the lazy sign to src");
const shopTitleStyles = Array.from(play.matchAll(/\.donguri-shop-v2-title \{[\s\S]*?\n    \}/g));
const shopTitleStyle = shopTitleStyles.find((match) => /aspect-ratio: 1763 \/ 519;/.test(match[0]));
assert.ok(shopTitleStyle, "the base shop title style must remain defined");
assert.match(shopTitleStyle[0], /background: transparent;/, "the shop title must not duplicate the sign as a CSS background");
assert.match(shopTitleStyle[0], /overflow: visible;/, "the translated shop sign must not be clipped against its unshifted capture box");

assert.match(lp, />ガチャガチャは課金なし</, "the assurance copy must use the full name");
assert.match(lp, />ガチャガチャとお店</, "the LP feature title must use the full name");
assert.match(lp, /<strong>ガチャガチャ<\/strong>/, "the LP figure label must use the full name");
assert.match(lp, /alt="ガチャガチャのカプセルからシールが出た画面"/, "the LP alt copy must use the full name");
assert.doesNotMatch(lp, />課金ガチャなし</, "the old abbreviated assurance copy must not return");
assert.doesNotMatch(lp, />ガチャとおみせ</, "the old abbreviated feature title must not return");
assert.doesNotMatch(lp, /<strong>ガチャ<\/strong>/, "the old abbreviated figure label must not return");

for (const fileName of ["gacha-reveal_20260712.png", "donguri-shop_20260712.png"]) {
  const filePath = path.join(root, "assets", "lp", "features", fileName);
  const png = fs.readFileSync(filePath);
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG", `${fileName} must remain a PNG`);
  assert.equal(png.readUInt32BE(16), 1280, `${fileName} must remain 1280px wide`);
  assert.equal(png.readUInt32BE(20), 720, `${fileName} must remain 720px high`);
  assert.equal(png[25], 6, `${fileName} must remain RGBA (PNG color type 6)`);
  assert.ok(png.length <= 3 * 1024 * 1024, `${fileName} must stay within the repository 3MB limit`);
}

console.log("gacha_capture_frame_lp_regression: all assertions passed");
