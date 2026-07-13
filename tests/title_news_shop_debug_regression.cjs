"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const play = fs.readFileSync(path.join(root, "play.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

// The child-facing hub has two real tabs instead of mixing shop changes into
// an undifferentiated list.
assert.match(play, /id="newsTabOfficial"[\s\S]*?data-news-kind="official"[\s\S]*?>\s*こうしき/);
assert.match(play, /id="newsTabShop"[\s\S]*?data-news-kind="shop"[\s\S]*?>\s*おみせ/);
assert.match(play, /id="newsPanelOfficial"[^>]*role="tabpanel"/);
assert.match(play, /id="newsPanelShop"[^>]*role="tabpanel"/);
assert.match(play, /ArrowRight[\s\S]*?ArrowLeft[\s\S]*?Home[\s\S]*?End/, "news tabs need keyboard navigation");

// Debug-only copy covers game, sticker-book, button, picture-book, and two
// shop formats. The runtime getter must remain dynamic so unlocking debug in
// the same page immediately changes the preview catalog.
const debugCatalog = play.match(/const DEBUG_NEWS_SAMPLE_ITEMS = Object\.freeze\(\[([\s\S]*?)\n    \]\);/);
assert.ok(debugCatalog, "debug news sample catalog must exist");
const debugIds = [...debugCatalog[1].matchAll(/id: 'debug-news-[^']+'/g)];
assert.equal(debugIds.length, 6, "the format preview needs six varied sample notices");
for (const copy of [
  "あたらしい あそびが ふえたよ",
  "シールちょうが もっと たのしくなったよ",
  "ボタンが おしやすくなったよ",
  "ポノの あたらしい えほんが でたよ",
  "めずらしい シールも ならぶよ",
  "ゆうがたの おみせに かわったよ",
]) assert.ok(debugCatalog[1].includes(copy), `missing sample copy: ${copy}`);
assert.match(play, /function getTitleNewsItems\(\)[\s\S]*?Array\.isArray\(window\.PONO_NEWS_ITEMS\)[\s\S]*?if \(isManageDebugAllowed\(\)\) items\.push\.apply\(items, DEBUG_NEWS_SAMPLE_ITEMS\)/,
  "sample notices must be added only behind the existing manage-debug gate");
assert.doesNotMatch(play, /const TITLE_NEWS_ITEMS\s*=/, "news data must not be snapshotted before debug unlock");

// Mock read state stays in the current debug session and cannot pollute future
// real official-news read IDs.
assert.match(play, /const NEWS_READ_KEY = 'pono_news_read_ids_v1'/);
assert.match(play, /const DEBUG_NEWS_READ_KEY = 'pono_debug_news_read_ids_v1'/);
assert.match(play, /readStoredIdList\(sessionStorage, DEBUG_NEWS_READ_KEY\)/);
assert.match(play, /writeStoredIdList\(sessionStorage, DEBUG_NEWS_READ_KEY, ids\)/);
assert.match(play, /function isNewsItemRead\(item, normalRead, debugRead\)[\s\S]*?item\.debug \? debugRead : normalRead/);

// Shop updates use the side-effect-free slot key. They must not force a new
// rotation, fake time, or clear purchases/reservations merely to show a sign.
const currentShopKey = play.match(/function currentShopKey\(\) \{([\s\S]*?)\n    \}/);
assert.ok(currentShopKey, "currentShopKey helper must exist");
assert.match(currentShopKey[1], /getSlotTimeUntilNext\(\)/);
assert.doesNotMatch(currentShopKey[1], /getRotation|__PonoDonguriShopNow|__clear/);
assert.match(play, /const DEBUG_SHOP_UPDATE_STATE_KEY = 'pono_debug_shop_update_state_v1'/);
assert.match(play, /sessionStorage\.setItem\(DEBUG_SHOP_UPDATE_STATE_KEY, state === 'unread' \? 'unread' : 'read'\)/);
assert.match(play, /function isShopUpdateUnread\(\) \{\s*const debugState = debugShopUpdateState\(\);\s*return debugState === 'unread';\s*\}/,
  "shop update signs must remain a manage-debug preview until the design is approved");
assert.doesNotMatch(play, /SHOP_LAST_SEEN_KEY|pono_donguri_shop_seen_key_v1/,
  "the preview must not write a real shop-seen marker");

const debugStateStart = play.indexOf("    function debugShopUpdateState() {");
const debugStateEnd = play.indexOf("    function dynamicShopNewsItem() {", debugStateStart);
assert.ok(debugStateStart >= 0 && debugStateEnd > debugStateStart);
const debugStateSource = play.slice(debugStateStart, debugStateEnd);
const stateMap = new Map();
const fakeSessionStorage = {
  getItem(key) { return stateMap.has(key) ? stateMap.get(key) : null; },
};
const makeDebugStateApi = new Function(
  "isManageDebugAllowed",
  "sessionStorage",
  "key",
  `const DEBUG_SHOP_UPDATE_STATE_KEY = key;\n${debugStateSource}\nreturn { debugShopUpdateState, isShopUpdateUnread };`,
);
stateMap.set("preview", "unread");
assert.equal(makeDebugStateApi(() => false, fakeSessionStorage, "preview").isShopUpdateUnread(), false,
  "local/session writes cannot expose preview UI without manage debug");
assert.equal(makeDebugStateApi(() => true, fakeSessionStorage, "preview").isShopUpdateUnread(), true);
stateMap.set("preview", "read");
assert.equal(makeDebugStateApi(() => true, fakeSessionStorage, "preview").isShopUpdateUnread(), false);
stateMap.delete("preview");
assert.equal(makeDebugStateApi(() => true, fakeSessionStorage, "preview").isShopUpdateUnread(), false);

// Both requested signs exist, remain non-interactive, and the successful
// shop-open path clears only the debug-session preview.
assert.match(play, /id="dailyGachaShopUpdate"[^>]*hidden>おみせが かわったよ/);
assert.match(play, /id="dailyGachaShopUpdateBadge"[^>]*hidden>あたらしい！/);
assert.match(play, /\.daily-gacha-entry__shop-update \{[\s\S]*?pointer-events: none;/);
assert.match(play, /\.daily-gacha-shop-update-badge \{[\s\S]*?pointer-events: none;/);
assert.match(play, /\.daily-gacha-shop-update-badge \{[\s\S]*?linear-gradient\(180deg, #c8414c, #98293b\)[\s\S]*?-1px 0 0 #661b2b/,
  "the tiny in-gacha sign needs a dark fill and full text outline");
assert.match(play, /@media \(orientation: landscape\) and \(max-height: 540px\)[\s\S]*?\.daily-gacha-entry__shop-update \{[\s\S]*?bottom: -38px;[\s\S]*?font-size: 26px;/,
  "short landscape must move the enlarged title sign below the baked lettering");
assert.match(play, /function showShop\(\)[\s\S]*?shop\.hidden = false;\s*markCurrentShopSeen\(\);/,
  "opening the real shop must be the point that clears its update sign");
const markShopSeen = play.match(/function markCurrentShopSeen\(\) \{([\s\S]*?)\n    \}/);
assert.ok(markShopSeen);
assert.match(markShopSeen[1], /sessionStorage\.setItem\(DEBUG_SHOP_UPDATE_STATE_KEY, 'read'\)/);
assert.doesNotMatch(markShopSeen[1], /localStorage|markNewsCategoryRead/,
  "debug shop preview must not alter real shop or official-news read state");
assert.match(play, /function hideShop\(\)[\s\S]*?var focusTarget = shopFocusOpener;[\s\S]*?focusTarget\.focus\(\)/,
  "closing the shop must restore the visible opener");
assert.match(play, /function refreshNewsAndShopRotation\(\)[\s\S]*?observedShopKey !== nextShopKey[\s\S]*?shop && !shop\.hidden[\s\S]*?renderShopCatalog\('おみせが かわったよ'\)/,
  "an open shop must refresh its actual cards when the JST slot changes");

// The admin preview is a fourth tab with safe replay controls, not the
// destructive shop reset action.
assert.match(play, /id="debugBoardTabPreview"[\s\S]*?data-debug-board-tab="preview"[\s\S]*?>みため<\/button>/);
assert.match(play, /id="debugBoardPanelPreview"[^>]*role="tabpanel"/);
for (const id of [
  "debugNewsOpenBtn",
  "debugNewsUnreadBtn",
  "debugNewsReadBtn",
  "debugShopUpdateShowBtn",
  "debugShopUpdateHideBtn",
]) assert.match(play, new RegExp(`id="${id}"`), `${id} debug control must exist`);
assert.match(play, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/, "debug board must fit its fourth tab");

// Cards expose category/date/new hierarchy and a real shop command.
assert.match(play, /news-item__meta[\s\S]*?news-item__tag[\s\S]*?news-item__date[\s\S]*?news-item__new/);
assert.match(play, /action\.textContent = 'おみせを みる'/);
assert.match(play, /data-news-action="shop"[\s\S]*?showShop\(\)/);
assert.match(play, /id="newsPanelOfficial"[^>]*tabindex="0"/);
assert.match(play, /newsModal\.addEventListener\('keydown'[\s\S]*?event\.key !== 'Tab'[\s\S]*?last\.focus\(\)[\s\S]*?first\.focus\(\)/,
  "keyboard focus must remain inside the news dialog");
assert.match(play, /function markNewsCategoryRead\(kind\)[\s\S]*?!item\.shopUpdate[\s\S]*?writeDebugNewsReadIds/,
  "debug samples should follow the natural read flow without consuming the synthetic shop update");
assert.match(play, /previousKind !== nextKind[\s\S]*?markNewsCategoryRead\(previousKind\)/,
  "leaving a viewed tab should commit its read state");
assert.match(play, /@media \(max-height: 520px\)[\s\S]*?\.news-tab \{ min-height: 44px;[\s\S]*?\.news-item__action \{ min-height: 44px;[\s\S]*?\.news-modal-card \.modal-close \{ min-height: 44px;/,
  "short landscape must retain child-sized touch targets");
assert.match(play, /\.modal-card\.news-modal-card \{[\s\S]*?grid-template-rows: auto auto minmax\(0, 1fr\) auto;[\s\S]*?overflow: hidden;/,
  "header/tabs/footer must stay put while the panel scrolls");
assert.match(play, /\.news-panel \{[\s\S]*?overflow-y: auto;[\s\S]*?overscroll-behavior: contain;/);

// Cache triplet remains synchronized.
const pageVersion = play.match(/const PAGE_CACHE_VERSION = (\d+);/);
const ponoVersion = play.match(/window\.PONO_SW_VERSION = 'v(\d+)'/);
const swVersion = sw.match(/const CACHE_VERSION = (\d+);/);
assert.ok(pageVersion && ponoVersion && swVersion);
assert.equal(pageVersion[1], "2162");
assert.equal(ponoVersion[1], pageVersion[1]);
assert.equal(swVersion[1], pageVersion[1]);

// Parse the actual main classic script. Other apparent <script> tags occur in
// legacy HTML comments, so locate the known main-script anchor directly.
const mainAnchor = "  <script>\n    'use strict';\n\n    function isManageDebugAllowed";
const mainStart = play.indexOf(mainAnchor);
assert.ok(mainStart >= 0, "main inline script anchor must exist");
const sourceStart = play.indexOf("'use strict';", mainStart);
const mainEnd = play.indexOf("\n  </script>", sourceStart);
assert.ok(mainEnd > sourceStart, "main inline script end must exist");
assert.doesNotThrow(() => new Function(play.slice(sourceStart, mainEnd)), "main inline script must parse");

console.log("title_news_shop_debug_regression: all assertions passed");
