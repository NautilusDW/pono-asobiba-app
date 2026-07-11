"use strict";

// v2107 batch:1241 → v2122 batch:1244 regression:
//   1) Mac の Shift+Alt+C (e.key='Ç') でもスクショ UI が開くよう e.code==='KeyC' を併用
//   2) html2canvas 1.4.1 の object-fit 未実装への onclone シム:
//      - batch:1241 は全 object-fit img を「透明1px + background-image」化して AR を修正
//        したが、html2canvas の背景描画パス (resizeImage で CSS px へ縮小 → createPattern)
//        は scale:2 の supersampling を無効化するため出力がぼやける退行が出た。
//      - batch:1244 で contain / scale-down は「content box を描画矩形へ縮める padding
//        焼き込み」に変更 (鮮明な img 置換要素パスを維持)。cover / none / intrinsic 不明
//        のみ従来 background シムへ fallback。
//   3) play.html play-gacha build の html2canvas scale 動的化 (ラスタ ≥ preset 保証)
//   4) 既存の PonoDebugMode 委譲 gating が不変であること
//   5) sw.js に capture.js 変更の changelog 行があること (バージョン番号非依存)
//   6) Option X: 非 img 要素の単一 no-repeat CSS 背景 → <img> 昇格シム (onclone, async)
//   7) Option Y2: html2canvas 背景パターンの実効スケール補正 hook。 shoot() の
//      build() 呼び出し区間だけへ install/uninstall を集中管理 (Promise.finally)
//
// 実測ベースの E2E 検証 (Playwright) は batch:1241/1244 調査時に別途実施済み:
//   AR: 筐体 alpha bbox 1.0247/1.0703 (壊) → 0.812〜0.8137 (intrinsic 0.8115)。
//   鮮明度: 同一ジオメトリ fixture の Laplacian 分散 = img パス 430 / 背景シム 35 /
//   padding 焼き込み 431。end-to-end 筐体 crop 69.8 → 372 (1920×1080)、50 → 785 (900×600
//   + 動的 scale)。 Option X+Y2 実測: トップ/おみせボタン lapVar 239/270 → 1021/1462
//   (native 1112/1566)。本テストは静的な後退防止のみを担う。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const capture = fs.readFileSync(path.join(root, "common/capture.js"), "utf8");
const playHtml = fs.readFileSync(path.join(root, "play.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

// ── 1) Mac ショートカット: 物理キー KeyC の併用 ──
const onKeyDown = capture.match(/function onKeyDown\([\s\S]*?\n  \}/);
assert.ok(onKeyDown, "capture.js must keep an onKeyDown handler");
assert.match(onKeyDown[0], /e\.shiftKey/, "shortcut must still require Shift");
assert.match(onKeyDown[0], /e\.altKey/, "shortcut must still require Alt");
assert.match(onKeyDown[0], /e\.code[^\n]*'KeyC'/, "onKeyDown must accept the physical KeyC code (Mac Alt+Shift+C sends key='Ç')");
assert.match(onKeyDown[0], /toLowerCase\(\)[\s\S]*'c'/, "the layout-independent key==='c' path must remain for non-Mac layouts");
assert.match(onKeyDown[0], /isCaptureAllowed\(\)/, "the shortcut must stay gated behind isCaptureAllowed()");

// ── 2) onclone の object-fit 補正 (padding 焼き込み + background fallback) ──
const onclone = capture.match(/onclone: function \(clonedDoc\) \{[\s\S]*?\n      \}/);
assert.ok(onclone, "html2canvasOptions must keep its onclone hook");
assert.match(onclone[0], /objectFit/, "onclone must inspect the computed object-fit of cloned elements");
assert.match(onclone[0], /'img'/, "the object-fit fix must apply to <img> replaced elements");

// 2a) contain / scale-down = 鮮明パス (padding 焼き込み)。
//     img の src を透明 px に差し替え「ない」ことが構造的保証:
//     置換要素パス (intrinsic → content box をラスタ解像度で 1 回リサンプル) を維持する。
const canPadBranch = onclone[0].match(/if \(canPad\) \{([\s\S]*?)\n {20}\} else \{/);
assert.ok(canPadBranch, "onclone must have a canPad (contain/scale-down) branch separate from the fallback");
assert.match(canPadBranch[1], /boxSizing/, "padding path must freeze the border box via box-sizing");
assert.match(canPadBranch[1], /paddingLeft/, "padding path must bake object-fit geometry into padding");
assert.match(canPadBranch[1], /objectPosition|posTokens/, "padding path must honor object-position (e.g. the gacha machine's 'center bottom')");
assert.ok(
  !/TRANSPARENT_PX_SRC/.test(canPadBranch[1]),
  "the contain path must NOT swap src to the transparent pixel (that would fall back to the blurry background pass)"
);
assert.ok(
  !/backgroundImage/.test(canPadBranch[1]),
  "the contain path must NOT paint via background-image (html2canvas backgrounds are resampled at CSS px, defeating scale:2)"
);
// canPad 判定自体が contain / scale-down 限定 + intrinsic 既知を要求していること
assert.match(onclone[0], /canPad = \(fit === 'contain' \|\| fit === 'scale-down'\)[\s\S]*?nw > 0/, "canPad must require contain/scale-down and a known intrinsic size");

// 2b) fallback (cover / none / intrinsic 不明) = batch:1241 background シム。
//     url() エスケープ・content-box origin/clip・透明 px 差し替えの防御を維持。
const fallbackBranch = onclone[0].match(/\n {20}\} else \{([\s\S]*?)\n {20}\}/);
assert.ok(fallbackBranch, "onclone must keep the background-image fallback branch");
assert.match(fallbackBranch[1], /replace\(\/\\\\\/g, '\\\\\\\\'\)/, "fallback must keep escaping backslashes in url() (SVG data URIs)");
assert.match(fallbackBranch[1], /backgroundImage/, "fallback must re-paint via background-image");
assert.match(fallbackBranch[1], /backgroundSize/, "fallback must map object-fit onto background-size");
assert.match(fallbackBranch[1], /backgroundOrigin = 'content-box'/, "fallback must keep content-box origin (object-fit is content-box based)");
assert.match(fallbackBranch[1], /backgroundClip = 'content-box'/, "fallback must keep content-box clip");
assert.match(fallbackBranch[1], /setAttribute\('src', TRANSPARENT_PX_SRC\)/, "fallback must swap the src for the transparent pixel");
assert.match(capture, /data:image\/png;base64,iVBOR/, "a transparent placeholder pixel must exist for the fallback swap");

// 2c) <picture> の <source> 除去 (両パス共通) が残っていること
assert.match(onclone[0], /closest\('picture'\)/, "the <picture><source> removal guard must remain");

// ── 3) play.html play-gacha build: html2canvas scale の動的化 ──
//      固定 scale:2 だと shell が 90dvh 制約で縮んだ小ウィンドウでラスタ < preset となり
//      compose 段の拡大でぼやけるため、ラスタ ≥ preset を保証する。
const gachaBuild = playHtml.match(/gameId: 'play-gacha'[\s\S]*?return await html2canvas\(container, h2cOpts\);/);
assert.ok(gachaBuild, "play.html must keep the play-gacha capture build()");
assert.match(gachaBuild[0], /getBoundingClientRect\(\)/, "build must measure the shell's rendered size");
assert.match(
  gachaBuild[0],
  /Math\.max\(\s*2,[\s\S]*?opts\.width[\s\S]*?shellRect\.width[\s\S]*?opts\.height[\s\S]*?shellRect\.height/,
  "build must compute a dynamic scale = max(2, presetW/shellW, presetH/shellH) so the raster is never smaller than the preset"
);
assert.match(gachaBuild[0], /shellRect\.width > 0/, "the dynamic scale must guard against a zero-sized shell rect");
assert.match(gachaBuild[0], /html2canvasOptions\(\{ backgroundColor: null, scale: dynScale \}\)/, "the dynamic scale must be passed into PonoCapture.html2canvasOptions");

// ── 4) 単一ゲート (PonoDebugMode 委譲) が不変 ──
assert.match(capture, /var CAPTURE_FEATURE_KEY = 'capture-mode';/, "the capture feature key must stay 'capture-mode'");
assert.match(
  capture,
  /function isCaptureAllowed\(\) \{[\s\S]*?window\.PonoDebugMode[\s\S]*?isFeatureEnabled[\s\S]*?CAPTURE_FEATURE_KEY[\s\S]*?\n  \}/,
  "isCaptureAllowed must keep delegating to PonoDebugMode.isFeatureEnabled(capture-mode)"
);
assert.match(capture, /function shoot\(opts\) \{[\s\S]*?isCaptureAllowed\(\)/, "shoot() must stay gated behind isCaptureAllowed()");

// ── 5) sw.js: capture.js 変更の changelog とバンプ運用 ──
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
assert.match(
  sw,
  /^\/\/ v\d+:[^\n]*capture\.js[^\n]*padding/m,
  "sw.js must carry a changelog line for the capture.js padding-bake sharpness fix (any version number)"
);
assert.match(sw, /^const CACHE_VERSION = \d+;$/m, "CACHE_VERSION must remain a plain integer constant");

// PAGE_CACHE_VERSION / PONO_SW_VERSION / CACHE_VERSION の 3 点同期 (値非依存で「一致」を検証)
const swVer = sw.match(/^const CACHE_VERSION = (\d+);$/m);
const pageVer = playHtml.match(/const PAGE_CACHE_VERSION = (\d+);/);
const ponoSwVer = playHtml.match(/window\.PONO_SW_VERSION = 'v(\d+)';/);
assert.ok(swVer && pageVer && ponoSwVer, "all three version constants must exist");
assert.equal(pageVer[1], swVer[1], "play.html PAGE_CACHE_VERSION must be in sync with sw.js CACHE_VERSION");
assert.equal(ponoSwVer[1], swVer[1], "play.html PONO_SW_VERSION must be in sync with sw.js CACHE_VERSION");

// ── 6) Option X: 非 img 要素の CSS 背景 → <img> 昇格シム (batch:1244) ──
const bgShimConvertFn = capture.match(/function bgShimConvertOne\([\s\S]*?\n  \}/);
assert.ok(bgShimConvertFn, "capture.js must keep the Option X per-element conversion function");
assert.match(
  bgShimConvertFn[0],
  /el\.insertBefore\(wrap, el\.firstChild\)/,
  "Option X must inject the shim <img> wrapper as the element's first child (probe-verified form; must not be changed to lastChild). " +
  "Note: firstChild injection DOES shift the element's own :first-child/nth-child matching in the clone " +
  "(z-index:-1 makes paint order position-independent, but selector matching still sees the extra child) " +
  "-- confirmed a no-op combination on current capture target pages, not a reason to avoid firstChild"
);
assert.match(bgShimConvertFn[0], /z-index:-1/, "Option X wrapper must stay behind the element's own background/content (z-index:-1)");
assert.match(bgShimConvertFn[0], /el\.style\.backgroundImage = 'none'/, "Option X must remove the CSS background-image once the <img> replacement is injected");

const bgShimCollectFn = capture.match(/function bgShimCollect\([\s\S]*?\n  \}/);
assert.ok(bgShimCollectFn, "capture.js must keep the Option X candidate collector");
assert.match(
  bgShimCollectFn[0],
  /tag === 'img'[\s\S]*?continue/,
  "Option X must exclude <img> elements from its candidate set (mutually exclusive with the object-fit img shim's background fallback branch)"
);
assert.match(bgShimCollectFn[0], /no-repeat/, "Option X must only handle no-repeat backgrounds, leaving repeat to the Y2 pattern hook");

assert.match(capture, /function applyBackgroundImgShim\(clonedDoc\)/, "capture.js must expose the Option X entry point used from onclone");
assert.match(
  onclone[0],
  /return applyBackgroundImgShim\(clonedDoc\)\.catch\(/,
  "onclone must invoke and defensively catch the Option X background shim, returning a thenable so html2canvas 1.4.1 (which awaits onclone's return value) waits for it"
);

// ── 7) Option Y2: パターンスケール hook + shoot() の try/finally 集中管理 ──
const patternHookFn = capture.match(/function installPatternScaleHook\(\)[\s\S]*?\n  \}/);
assert.ok(patternHookFn, "capture.js must keep the Option Y2 pattern-scale hook installer");
assert.match(
  patternHookFn[0],
  /this\.getTransform\(\)/,
  "the Y2 hook must derive the effective scale from ctx.getTransform() at createPattern() call time, not a value baked in at install()"
);
assert.match(
  patternHookFn[0],
  /typeof DOMMatrix !== 'function' \|\| typeof proto\.getTransform !== 'function'/,
  "the Y2 hook must fall back to native (unpatched) behavior when DOMMatrix/getTransform are unavailable"
);
// review fix (Medium, 多重 install 残留防止) 後は proto.createPattern/drawImage への
// 代入が named wrapper 変数 (wrappedPattern/wrappedDraw) 経由になった (マーカー
// プロパティを付けるため、直接 `proto.x = function(){...}` の匿名代入では不可)。
assert.match(patternHookFn[0], /var wrappedPattern = function \(src, rep\) \{/, "the Y2 hook must define createPattern's wrapper as a named function expression (wrappedPattern) so a marker property can be attached to it");
assert.match(patternHookFn[0], /proto\.createPattern = wrappedPattern;/, "the Y2 hook must patch CanvasRenderingContext2D.prototype.createPattern with the marked wrapper");
assert.match(patternHookFn[0], /var wrappedDraw = function \(img\) \{/, "the Y2 hook must define drawImage's wrapper as a named function expression (wrappedDraw) so a marker property can be attached to it");
assert.match(patternHookFn[0], /proto\.drawImage = wrappedDraw;/, "the Y2 hook must patch drawImage (record-only) with the marked wrapper to identify html2canvas's resizeImage() intermediate tile");
assert.match(patternHookFn[0], /return function uninstallPatternScaleHook/, "installPatternScaleHook must return a dedicated uninstall function");

// 7a) 多重 install 残留防止 (review fix, Medium): concurrent shoot() calls must not
//     leave a permanently-patched prototype behind. install() must detect an
//     already-active wrapper via a marker property and no-op instead of nesting;
//     uninstall() must only restore the prototype when its OWN wrapper is still
//     the one currently installed (symmetric guard).
assert.match(
  patternHookFn[0],
  /_ponoPatternHook/,
  "installPatternScaleHook must tag its wrapper functions with a marker property so concurrent installs can detect an already-active hook"
);
assert.match(
  patternHookFn[0],
  /if \(proto\.drawImage && proto\.drawImage\._ponoPatternHook\) \{\s*\n\s*return function uninstallPatternScaleHookNoop/,
  "install must guard against double-installing when a wrapper is already active on the prototype, returning a noop uninstall instead of nesting a second wrapper"
);
assert.match(
  patternHookFn[0],
  /if \(proto\.drawImage === wrappedDraw\) proto\.drawImage = origDraw;/,
  "uninstall must restore drawImage ONLY when its own wrapper is still the active one (prevents a concurrent shoot()'s uninstall from writing back a stale wrapper and leaving it permanently patched)"
);
assert.match(
  patternHookFn[0],
  /if \(proto\.createPattern === wrappedPattern\) proto\.createPattern = origPattern;/,
  "uninstall must apply the same symmetric restore guard to createPattern"
);

const shootFn = capture.match(/function shoot\(opts\) \{[\s\S]*?\n  \}/);
assert.ok(shootFn, "capture.js must keep the shoot() function");
const gatingCallIdx = shootFn[0].indexOf('isCaptureAllowed()');
const installIdx = shootFn[0].indexOf('installPatternScaleHook()');
const buildCallIdx = shootFn[0].indexOf('registered.build(buildOpts)');
// buildCallIdx 以降で検索 (直前の解説コメントが "Promise.finally()" という文字列を
// 含むため、コメントより前から探すと誤って早期マッチしてしまう)
const finallyIdx = shootFn[0].indexOf('.finally(', buildCallIdx);
const composeGuardIdx = shootFn[0].indexOf('if (!src) return null;', finallyIdx);
assert.ok(
  gatingCallIdx > -1 && installIdx > -1 && buildCallIdx > -1 && finallyIdx > -1 && composeGuardIdx > -1,
  "shoot() must gate on isCaptureAllowed(), install the Y2 hook, call build(), and uninstall it via .finally() before the compose/download steps"
);
assert.ok(installIdx < buildCallIdx, "the Y2 hook must be installed BEFORE build() (=html2canvas) runs");
// review fix: previously only checked install < build(), which would NOT catch a
// regression that hoisted the install() call above the isCaptureAllowed() gating
// check (e.g. into an ungated helper). Assert the install stays strictly after
// the gate so an unauthorized host can never monkey-patch the canvas prototype.
assert.ok(
  installIdx > gatingCallIdx,
  "the Y2 hook install must be positioned AFTER the isCaptureAllowed() gating check inside shoot(), not merely before build()"
);
assert.ok(
  finallyIdx > buildCallIdx && finallyIdx < composeGuardIdx,
  "the Y2 hook uninstall must be centralized immediately after the build() call (try/finally-equivalent), before compose()/download() run — so every game's build() benefits without being modified individually"
);
assert.match(
  shootFn[0].slice(finallyIdx, finallyIdx + 120),
  /uninstallPatternHook\(\)/,
  "the .finally() immediately after build() must call the uninstall function returned by installPatternScaleHook(), guaranteeing restoration on both success and failure"
);

// ── 8) 多層背景 (カンマ区切り) スキップの安全弁 ──
assert.match(
  bgShimCollectFn[0],
  /\/\^url\\\(\(\['"\]\?\)/,
  "Option X's candidate regex must be fully anchored (^url(...)$) so multi-layer/comma-separated backgrounds and gradients never match and are safely left on the stock (Y2-hook-covered) path"
);

console.log("capture_objectfit_shim_regression: all assertions passed");
