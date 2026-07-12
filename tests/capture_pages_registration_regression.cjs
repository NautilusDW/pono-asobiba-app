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
//        renderer.render() → #app 全体の html2canvas 撮影 + dynScale
//     5) StickerExhibitionCarousel/main.js: PonoCapture.register('sticker-museum') +
//        dynScale の動的算出 + PonoCapture.html2canvasOptions への受け渡し
//     6) StickerExhibitionCarousel/index.html: main.js の cache-buster (?v=) が
//        main.js 変更日以降であること (floor 比較。完全一致は求めない)
//     7) play.html: 撮影パネルを表示中のシール帳遷移だけ capture=1 を引き継ぎ、
//        通常遷移・パネルを閉じた後の遷移へは混入させない
//     8) シール帳 → ミュージアム → トップでも、開いている撮影パネルを引き継ぐ
//     9) 各ゲーム共通のシール獲得ポップアップから入る場合も撮影状態を引き継ぐ

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const playHtml = fs.readFileSync(path.join(root, "play.html"), "utf8");
const stickerBookMain = fs.readFileSync(path.join(root, "Prototypes/StickerBookThreeJS/main.js"), "utf8");
const stickerBookIndex = fs.readFileSync(path.join(root, "Prototypes/StickerBookThreeJS/index.html"), "utf8");
const museumMain = fs.readFileSync(path.join(root, "Prototypes/StickerExhibitionCarousel/main.js"), "utf8");
const museumIndex = fs.readFileSync(path.join(root, "Prototypes/StickerExhibitionCarousel/index.html"), "utf8");
const gameStickers = fs.readFileSync(path.join(root, "js/game-stickers.js"), "utf8");

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

// ── 4) StickerBookThreeJS/main.js: register('sticker-book') + 実画面全体撮影 ──
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
  /await stickerBookCaptureReady;/,
  "an early capture click must wait for the sticker-book scene to finish loading instead of failing"
);
assert.ok(
  stickerBookMain.indexOf("if (window.PonoCapture) regStickerBookCapture();") <
    stickerBookMain.indexOf("const textureEntries = await Promise.all"),
  "the sticker-book capture target must register before the top-level texture await so the cold-load overlay is never unregistered"
);
assert.match(
  stickerBookMain,
  /window\.__stickerBookReady = true;\s*resolveStickerBookCaptureReady\(\);/,
  "the capture readiness promise must resolve at the same point as the public sticker-book ready signal"
);
assert.match(
  stickerBookRegisterFn[0],
  /document\.getElementById\("app"\)/,
  "the sticker-book build() must capture #app so the visible table background and controls are included"
);
assert.match(
  stickerBookRegisterFn[0],
  /getBoundingClientRect\(\)/,
  "the sticker-book build() must measure the visible app before choosing a raster scale"
);
assert.match(
  stickerBookRegisterFn[0],
  /Math\.max\([\s\S]*?2,[\s\S]*?opts\?\.width[\s\S]*?rect\.width[\s\S]*?opts\?\.height[\s\S]*?rect\.height/,
  "the sticker-book build() must size dynScale against both requested preset dimensions"
);
assert.match(
  stickerBookRegisterFn[0],
  /html2canvasOptions\(\{ backgroundColor: null, scale: dynScale \}\)/,
  "the sticker-book build() must use the shared capture options so the overlay stays out of the screenshot"
);
assert.match(
  stickerBookRegisterFn[0],
  /return await html2canvas\(container, h2cOpts\)/,
  "the sticker-book build() must rasterize the full visible app instead of returning a transparent WebGL cutout"
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

// ── 7) play.html: シール帳へスクショモードを引き継ぐ ──
const captureAwareStickerBookUrlFn = playHtml.match(
  /function captureAwareStickerBookUrl\(targetUrl\) \{[\s\S]*?\n    \}/
);
assert.ok(
  captureAwareStickerBookUrlFn,
  "play.html must keep a captureAwareStickerBookUrl(targetUrl) helper"
);
assert.match(
  captureAwareStickerBookUrlFn[0],
  /document\.querySelector\('\.pono-capture-overlay'\)/,
  "capture propagation must be based on the capture panel actually being open, so closing it with × stops propagation"
);
assert.match(
  captureAwareStickerBookUrlFn[0],
  /new URL\(targetUrl, location\.href\)/,
  "the helper must preserve an existing sticker-book query such as surface=cover/inside"
);
assert.match(
  captureAwareStickerBookUrlFn[0],
  /searchParams\.set\('capture', '1'\)/,
  "the helper must add the URL trigger consumed by common/capture.js on the destination page"
);

const captureAwareStickerBookNavigations = playHtml.match(
  /location\.href = captureAwareStickerBookUrl\(/g
) || [];
assert.equal(
  captureAwareStickerBookNavigations.length,
  3,
  "all three sticker-book entries (gacha result, profile, debug board) must preserve an active capture panel"
);
assert.doesNotMatch(
  playHtml,
  /location\.href = THREE_STICKER_BOOK_URL;/,
  "no sticker-book entry may bypass the capture-aware navigation helper"
);

// ── 8) シール帳 → ミュージアム → トップの撮影セッション継続 ──
assert.match(
  stickerBookMain,
  /function captureAwareSiblingUrl\(relativeUrl\)[\s\S]*?querySelector\("\.pono-capture-overlay"\)[\s\S]*?searchParams\.set\("capture", "1"\)/,
  "StickerBookThreeJS must preserve capture=1 while its capture panel is open"
);
assert.match(
  stickerBookMain,
  /window\.location\.assign\(captureAwareSiblingUrl\("\.\.\/StickerExhibitionCarousel\/"\)\)/,
  "the sticker-book museum button must use capture-aware navigation"
);
assert.match(
  museumMain,
  /function captureAwareNavigationUrl\(relativeUrl\)[\s\S]*?querySelector\("\.pono-capture-overlay"\)[\s\S]*?searchParams\.set\("capture", "1"\)/,
  "StickerExhibitionCarousel must preserve capture=1 while its capture panel is open"
);
assert.match(
  museumMain,
  /window\.location\.assign\(captureAwareNavigationUrl\("\.\.\/\.\.\/play\.html"\)\)/,
  "the museum home button must use capture-aware navigation"
);
assert.match(
  stickerBookIndex,
  /main\.js\?v=20260712-1264/,
  "StickerBookThreeJS index must bust the module cache for the full-screen capture fix"
);
assert.match(
  museumIndex,
  /main\.js\?v=20260712-1264/,
  "StickerExhibitionCarousel index must bust the module cache for capture-session navigation"
);

// ── 9) 共通シール獲得ポップアップ → シール帳 ──
assert.match(
  gameStickers,
  /function _captureAwareStickerBookUrl\(url\)[\s\S]*?querySelector\('\.pono-capture-overlay'\)[\s\S]*?searchParams\.set\('capture', '1'\)/,
  "the shared reward popup must preserve capture=1 only while its capture panel is open"
);
assert.match(
  gameStickers,
  /location\.href = _captureAwareStickerBookUrl\(url\)/,
  "the shared reward popup's sticker-book action must use capture-aware navigation"
);

console.log("capture_pages_registration_regression: all assertions passed");
