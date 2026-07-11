"use strict";

// v2107 batch:1241 regression:
//   1) Mac の Shift+Alt+C (e.key='Ç') でもスクショ UI が開くよう e.code==='KeyC' を併用
//   2) html2canvas 1.4.1 の object-fit 未実装で img が box へ stretch される問題を
//      onclone の「透明1px + background-image」シムで補正
//   3) 既存の PonoDebugMode 委譲 gating が不変であること
//   4) sw.js に capture.js 変更の changelog 行があること (バージョン番号非依存)
//
// 実測ベースの E2E 検証 (Playwright) は調査時に別途実施済み:
//   筐体 alpha bbox AR 1.0247/1.0703 (壊) → 0.8117/0.8124 (シム適用後、 intrinsic 0.8115)。
// 本テストは静的な後退防止のみを担う。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const capture = fs.readFileSync(path.join(root, "common/capture.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

// ── 1) Mac ショートカット: 物理キー KeyC の併用 ──
const onKeyDown = capture.match(/function onKeyDown\([\s\S]*?\n  \}/);
assert.ok(onKeyDown, "capture.js must keep an onKeyDown handler");
assert.match(onKeyDown[0], /e\.shiftKey/, "shortcut must still require Shift");
assert.match(onKeyDown[0], /e\.altKey/, "shortcut must still require Alt");
assert.match(onKeyDown[0], /e\.code[^\n]*'KeyC'/, "onKeyDown must accept the physical KeyC code (Mac Alt+Shift+C sends key='Ç')");
assert.match(onKeyDown[0], /toLowerCase\(\)[\s\S]*'c'/, "the layout-independent key==='c' path must remain for non-Mac layouts");
assert.match(onKeyDown[0], /isCaptureAllowed\(\)/, "the shortcut must stay gated behind isCaptureAllowed()");

// ── 2) onclone の object-fit → background-image シム ──
const onclone = capture.match(/onclone: function \(clonedDoc\) \{[\s\S]*?\n      \}/);
assert.ok(onclone, "html2canvasOptions must keep its onclone hook");
assert.match(onclone[0], /objectFit/, "onclone must inspect the computed object-fit of cloned elements");
assert.match(onclone[0], /'img'/, "the object-fit shim must apply to <img> replaced elements");
assert.match(onclone[0], /backgroundImage/, "object-fit imgs must be re-painted via background-image (html2canvas paints backgrounds correctly)");
assert.match(onclone[0], /backgroundSize/, "the shim must map object-fit onto background-size");
assert.match(onclone[0], /objectPosition/, "the shim must preserve object-position (e.g. the gacha machine's 'center bottom')");
assert.match(onclone[0], /setAttribute\('src'/, "the original src must be swapped out so html2canvas cannot stretch the bitmap");
assert.match(capture, /data:image\/png;base64,iVBOR/, "a transparent placeholder pixel must exist for the src swap");

// ── 3) 単一ゲート (PonoDebugMode 委譲) が不変 ──
assert.match(capture, /var CAPTURE_FEATURE_KEY = 'capture-mode';/, "the capture feature key must stay 'capture-mode'");
assert.match(
  capture,
  /function isCaptureAllowed\(\) \{[\s\S]*?window\.PonoDebugMode[\s\S]*?isFeatureEnabled[\s\S]*?CAPTURE_FEATURE_KEY[\s\S]*?\n  \}/,
  "isCaptureAllowed must keep delegating to PonoDebugMode.isFeatureEnabled(capture-mode)"
);
assert.match(capture, /function shoot\(opts\) \{[\s\S]*?isCaptureAllowed\(\)/, "shoot() must stay gated behind isCaptureAllowed()");

// ── 4) sw.js: capture.js 変更の changelog とバンプ運用 ──
assert.match(
  sw,
  /^\/\/ v\d+:[^\n]*capture\.js[^\n]*object-fit/m,
  "sw.js must carry a changelog line for the capture.js object-fit fix (any version number)"
);
assert.match(
  sw,
  /^\/\/ v\d+:[^\n]*KeyC/m,
  "sw.js changelog must mention the Mac KeyC shortcut fix"
);
assert.match(sw, /^const CACHE_VERSION = \d+;$/m, "CACHE_VERSION must remain a plain integer constant");

console.log("capture_objectfit_shim_regression: all assertions passed");
