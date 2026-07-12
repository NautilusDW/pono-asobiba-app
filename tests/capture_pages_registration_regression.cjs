"use strict";

// v2127 batch:1254 cross-review follow-up regression:
//   PonoCapture の「最後に register した 1 件だけが有効」という設計上、複数モーダル/
//   複数ページが同じ PonoCapture インスタンスへ register() する場合は、開閉のたびに
//   正しい target へ登録し直さないと「ガチャを開いたのにショップの絵が撮れる」等の
//   撮影ミスが発生する。 本テストは以下を静的に検証する (バージョン番号非依存):
//     1) play.html: registerGachaCapture / registerShopCapture の定義と window 公開
//     2) play.html: openDailyGacha に gacha 再登録フック、showShop に shop 登録フック
//     3) play.html: hideShop (shop クローズ処理) に「#dailyGachaModal が開いている
//        場合のみ」の条件付き gacha 再登録フックがある (Low fix 本体)
//     4) StickerBookThreeJS/main.js: PonoCapture.register('sticker-book') +
//        renderer.render() → 2D canvas への直撮り構造
//     5) StickerExhibitionCarousel/main.js: PonoCapture.register('sticker-museum') +
//        dynScale の動的算出 + PonoCapture.html2canvasOptions への受け渡し
//     6) StickerExhibitionCarousel/index.html: main.js の cache-buster (?v=) が
//        main.js 変更日以降であること (floor 比較。完全一致は求めない)

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const playHtml = fs.readFileSync(path.join(root, "play.html"), "utf8");
const stickerBookMain = fs.readFileSync(path.join(root, "Prototypes/StickerBookThreeJS/main.js"), "utf8");
const museumMain = fs.readFileSync(path.join(root, "Prototypes/StickerExhibitionCarousel/main.js"), "utf8");
const museumIndex = fs.readFileSync(path.join(root, "Prototypes/StickerExhibitionCarousel/index.html"), "utf8");

// ── 1) play.html: registerGachaCapture / registerShopCapture の定義 + window 公開 ──
assert.match(
  playHtml,
  /function registerGachaCapture\(\)\{/,
  "play.html must keep registerGachaCapture() defined"
);
assert.match(
  playHtml,
  /function registerShopCapture\(\)\{/,
  "play.html must keep registerShopCapture() defined"
);
assert.match(
  playHtml,
  /window\.registerGachaCapture = registerGachaCapture;/,
  "registerGachaCapture must be exposed on window so other <script> blocks (openDailyGacha/hideShop) can re-invoke it"
);
assert.match(
  playHtml,
  /window\.registerShopCapture = registerShopCapture;/,
  "registerShopCapture must be exposed on window so other <script> blocks (showShop) can re-invoke it"
);

// ── 2) openDailyGacha: gacha 再登録フック ──
const openDailyGachaFn = playHtml.match(/function openDailyGacha\(\) \{[\s\S]*?\n    \}/);
assert.ok(openDailyGachaFn, "play.html must keep an openDailyGacha() function");
assert.match(
  openDailyGachaFn[0],
  /if \(typeof window\.registerGachaCapture === 'function'\) window\.registerGachaCapture\(\);/,
  "openDailyGacha must re-register the gacha capture target every time it opens (overwrites a prior shop registration)"
);

// ── 2b) showShop: shop 登録フック ──
const showShopFn = playHtml.match(/function showShop\(\) \{[\s\S]*?\n    \}/);
assert.ok(showShopFn, "play.html must keep a showShop() function");
assert.match(
  showShopFn[0],
  /if \(typeof window\.registerShopCapture === 'function'\) window\.registerShopCapture\(\);/,
  "showShop must re-register the shop capture target every time it opens (overwrites a prior gacha registration)"
);

// ── 3) hideShop: 条件付き gacha 再登録 (Low fix 本体) ──
const hideShopFn = playHtml.match(/function hideShop\(\) \{[\s\S]*?\n    \}/);
assert.ok(hideShopFn, "play.html must keep a hideShop() function");
assert.match(
  hideShopFn[0],
  /shop\.hidden = true;/,
  "hideShop must still hide the #donguriShop element (sanity anchor for the fix location)"
);
// registerGachaCapture の再呼び出しは #dailyGachaModal が開いている場合だけに限定する
// (常時無条件で呼ぶと、ガチャを開かずにショップだけ開いて閉じたケースで PonoCapture の
// registered が意味のない gacha registration に巻き戻ってしまう)。
const gachaReregisterInHideShop = hideShopFn[0].match(
  /if \(dailyGachaModal && !dailyGachaModal\.hidden\) \{\s*\n\s*try \{ window\.registerGachaCapture && window\.registerGachaCapture\(\); \} catch \(_\) \{\}\s*\n\s*\}/
);
assert.ok(
  gachaReregisterInHideShop,
  "hideShop must re-register the gacha capture target, but ONLY when #dailyGachaModal is still open (not hidden) -- " +
  "otherwise a subsequent screenshot after closing the shop would silently point at the (now closed) gacha modal build()"
);
// 条件チェックは shop.hidden = true の後に置く (hideShop 自体の副作用順序は問わないが、
// ガチャの開閉状態を見る以上ショップを閉じる処理と独立していること自体は変わらない)
assert.ok(
  hideShopFn[0].indexOf("shop.hidden = true;") < hideShopFn[0].indexOf(gachaReregisterInHideShop[0]),
  "the conditional gacha re-registration must be wired into the shop-close flow (after the shop is marked hidden)"
);

// ── 4) StickerBookThreeJS/main.js: register('sticker-book') + 直撮り構造 ──
const stickerBookRegisterFn = stickerBookMain.match(/function regStickerBookCapture\(\) \{[\s\S]*?\n\}/);
assert.ok(stickerBookRegisterFn, "StickerBookThreeJS/main.js must keep a regStickerBookCapture() function");
assert.match(
  stickerBookRegisterFn[0],
  /gameId: "sticker-book"/,
  "StickerBookThreeJS must register under gameId 'sticker-book'"
);
assert.match(
  stickerBookRegisterFn[0],
  /renderer\.render\(scene, camera\)/,
  "the sticker-book build() must force a synchronous renderer.render() before snapshotting (preserveDrawingBuffer timing)"
);
assert.match(
  stickerBookRegisterFn[0],
  /ctx\.drawImage\(canvas, 0, 0\)/,
  "the sticker-book build() must copy the live WebGL canvas via drawImage (direct snapshot, no html2canvas)"
);
// register() 自体は capture-mode の状態に関わらず常に build() を格納するだけで、
// 実際のゲートは shoot()/UI 表示/keydown 側の isCaptureAllowed() にある (Nit fix)。
// この誤解を招く記述 ("register 自体が no-op") が復活していないことを確認する。
assert.ok(
  !/register 自体が no-op/.test(stickerBookMain),
  "the corrected comment must not reintroduce the inaccurate claim that PonoCapture.register() itself becomes a no-op when capture-mode is off"
);
assert.match(
  stickerBookMain,
  /isCaptureAllowed\(\)/,
  "the corrected comment (or surrounding code) must reference isCaptureAllowed() as the actual gate"
);

// ── 5) StickerExhibitionCarousel/main.js: register('sticker-museum') + dynScale ──
const museumRegisterBlock = museumMain.match(/gameId: "sticker-museum"[\s\S]*?return await html2canvas\(container, h2cOpts\);/);
assert.ok(museumRegisterBlock, "StickerExhibitionCarousel/main.js must keep the sticker-museum capture registration");
assert.match(
  museumRegisterBlock[0],
  /build: async function \(opts\) \{/,
  "the sticker-museum build() must accept the (opts) argument (width/height) to size dynScale against the requested preset"
);
assert.match(
  museumRegisterBlock[0],
  /getBoundingClientRect\(\)/,
  "the sticker-museum build() must measure #app's rendered size to compute dynScale"
);
assert.match(
  museumRegisterBlock[0],
  /Math\.max\(\s*2,[\s\S]*?opts\.width[\s\S]*?rect\.width[\s\S]*?opts\.height[\s\S]*?rect\.height/,
  "dynScale must be max(2, presetW/appW, presetH/appH), mirroring play.html's play-gacha/play-shop pattern (raster must never be smaller than the preset)"
);
assert.match(
  museumRegisterBlock[0],
  /rect\.width > 0/,
  "the dynScale computation must guard against a zero-sized #app rect"
);
assert.match(
  museumRegisterBlock[0],
  /html2canvasOptions\(\{ scale: dynScale \}\)/,
  "dynScale must be threaded into the shared PonoCapture.html2canvasOptions() helper (not a bespoke options object)"
);

// ── 6) StickerExhibitionCarousel/index.html: cache-buster bump ──
// 完全一致 (例: 20260712-1) は avoid し、main.js を変更した以上「その日以降の日付」で
// あることだけを floor 検証する (将来 -2, -3 と枝番が伸びても壊れない)。
const cacheBusterMatch = museumIndex.match(/main\.js\?v=(\d{8})-(\d+)"><\/script>/);
assert.ok(cacheBusterMatch, "StickerExhibitionCarousel/index.html must keep a dated ?v= cache-buster on main.js");
const cacheBusterDate = Number(cacheBusterMatch[1]);
assert.ok(
  cacheBusterDate >= 20260712,
  `main.js cache-buster date (${cacheBusterDate}) must be bumped to 2026-07-12 or later ` +
  "since main.js was edited (dynScale fix) and stale heuristic browser caching could otherwise " +
  "serve the pre-fix main.js on staging"
);

console.log("capture_pages_registration_regression: all assertions passed");
