"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const play = fs.readFileSync(path.join(root, "play.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

// Official news is one focused list. A shop rotation is a transient sign,
// not a second article category.
assert.match(play, /id="newsTitle">こうしきの おしらせ</);
assert.match(play, /id="newsPanelOfficial"[^>]*aria-label="こうしきの おしらせ いちらん"[^>]*tabindex="0"/);
for (const removed of [
  'id="newsTabOfficial"',
  'id="newsTabShop"',
  'id="newsPanelShop"',
  'id="newsShopEmpty"',
  'data-news-kind="shop"',
  'data-news-action="shop"',
  "dynamicShopNewsItem",
  "newsKind(item)",
  "unreadNewsCountByKind",
  "renderNewsTabUnreadCounts",
  "selectNewsKind",
  "news-item__action",
]) assert.doesNotMatch(play, new RegExp(removed), `shop news artifact must be removed: ${removed}`);

// Debug official-news copy covers the four card formats and stays behind the
// existing manage-debug gate.
const debugCatalog = play.match(/const DEBUG_NEWS_SAMPLE_ITEMS = Object\.freeze\(\[([\s\S]*?)\n    \]\);/);
assert.ok(debugCatalog, "debug news sample catalog must exist");
const debugIds = [...debugCatalog[1].matchAll(/id: 'debug-news-[^']+'/g)];
assert.equal(debugIds.length, 4, "official preview needs four varied sample notices");
for (const copy of [
  "あたらしい あそびが ふえたよ",
  "シールちょうが もっと たのしくなったよ",
  "ボタンが おしやすくなったよ",
  "ポノの あたらしい えほんが でたよ",
]) assert.ok(debugCatalog[1].includes(copy), `missing sample copy: ${copy}`);
assert.doesNotMatch(debugCatalog[1], /kind: 'shop'|action: 'shop'|おみせ/);
assert.match(play, /function getTitleNewsItems\(\)[\s\S]*?Array\.isArray\(window\.PONO_NEWS_ITEMS\)[\s\S]*?item\.kind !== 'shop' && item\.category !== 'shop' && item\.action !== 'shop'[\s\S]*?if \(isManageDebugAllowed\(\)\) items\.push\.apply\(items, DEBUG_NEWS_SAMPLE_ITEMS\)/,
  "runtime news data must reject shop articles and add samples only in manage debug");
assert.doesNotMatch(play, /const TITLE_NEWS_ITEMS\s*=/, "news data must not be snapshotted before debug unlock");

// Mock read state stays in the current debug session and cannot pollute future
// real official-news read IDs.
assert.match(play, /const NEWS_READ_KEY = 'pono_news_read_ids_v1'/);
assert.match(play, /const DEBUG_NEWS_READ_KEY = 'pono_debug_news_read_ids_v1'/);
assert.match(play, /readStoredIdList\(sessionStorage, DEBUG_NEWS_READ_KEY\)/);
assert.match(play, /writeStoredIdList\(sessionStorage, DEBUG_NEWS_READ_KEY, ids\)/);
assert.match(play, /function isNewsItemRead\(item, normalRead, debugRead\)[\s\S]*?item\.debug \? debugRead : normalRead/);
assert.match(play, /function unreadNewsCount\(\)[\s\S]*?getTitleNewsItems\(\)[\s\S]*?isNewsItemRead/);
const newsBadges = play.match(/function renderNewsBadges\(\) \{([\s\S]*?)\n    \}/);
assert.ok(newsBadges);
assert.doesNotMatch(newsBadges[1], /Shop|shop|renderShopUpdateSigns/,
  "official-news badges must not depend on shop update state");

// Shop updates use the side-effect-free slot key. They must not force a new
// rotation, fake time, or clear purchases/reservations merely to show a sign.
const currentShopKey = play.match(/function currentShopKey\(\) \{([\s\S]*?)\n    \}/);
assert.ok(currentShopKey, "currentShopKey helper must exist");
assert.match(currentShopKey[1], /getSlotTimeUntilNext\(\)/);
assert.doesNotMatch(currentShopKey[1], /getRotation|__PonoDonguriShopNow|__clear/);
assert.match(play, /const DEBUG_SHOP_UPDATE_STATE_KEY = 'pono_debug_shop_update_state_v1'/);
assert.match(play, /sessionStorage\.setItem\(DEBUG_SHOP_UPDATE_STATE_KEY, state === 'unread' \? 'unread' : 'read'\)/);
assert.match(play, /function isShopUpdateUnread\(\) \{\s*const debugState = debugShopUpdateState\(\);\s*return debugState === 'unread';\s*\}/,
  "shop update signs must remain a manage-debug preview until approved");
assert.doesNotMatch(play, /SHOP_LAST_SEEN_KEY|pono_donguri_shop_seen_key_v1/,
  "the preview must not write a real shop-seen marker");

const debugStateStart = play.indexOf("    function debugShopUpdateState() {");
const debugStateEnd = play.indexOf("    function getTitleNewsItems() {", debugStateStart);
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
  "session writes cannot expose preview UI without manage debug");
assert.equal(makeDebugStateApi(() => true, fakeSessionStorage, "preview").isShopUpdateUnread(), true);
stateMap.set("preview", "read");
assert.equal(makeDebugStateApi(() => true, fakeSessionStorage, "preview").isShopUpdateUnread(), false);
stateMap.delete("preview");
assert.equal(makeDebugStateApi(() => true, fakeSessionStorage, "preview").isShopUpdateUnread(), false);

// Both requested signs are independent, prominent, and non-interactive. Only
// opening the actual shop clears the debug-session preview.
assert.match(play, /id="dailyGachaShopUpdate"[^>]*hidden>おみせが かわったよ！/);
assert.match(play, /id="dailyGachaShopUpdateBadge"[^>]*hidden>あたらしい！/);
assert.match(play, /\.daily-gacha-entry__shop-update \{[\s\S]*?width: min\(82%, 290px\);[\s\S]*?background: linear-gradient\(180deg, #fff7b8 0%, #ffd65f 100%\);[\s\S]*?color: #6b3215;[\s\S]*?pointer-events: none;/,
  "title sign must be a bright, wide, non-interactive status label");
assert.match(play, /@keyframes dailyGachaShopUpdatePop[\s\S]*?@media \(orientation: landscape\) and \(max-height: 540px\)[\s\S]*?\.daily-gacha-entry__shop-update \{[\s\S]*?bottom: -18px;[\s\S]*?font-size: 26px;/,
  "the sign may pop once and must stay legible below the banner in short landscape");
assert.match(play, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.daily-gacha-entry__shop-update \{ animation: none; \}/);
assert.match(play, /\.daily-gacha-shop-update-badge \{[\s\S]*?pointer-events: none;/);
assert.match(play, /function showShop\(\)[\s\S]*?shop\.hidden = false;\s*markCurrentShopSeen\(\);/,
  "opening the real shop must be the point that clears its update sign");
const markShopSeen = play.match(/function markCurrentShopSeen\(\) \{([\s\S]*?)\n    \}/);
assert.ok(markShopSeen);
assert.match(markShopSeen[1], /sessionStorage\.setItem\(DEBUG_SHOP_UPDATE_STATE_KEY, 'read'\)/);
assert.match(markShopSeen[1], /renderShopUpdateSigns\(\)/);
assert.doesNotMatch(markShopSeen[1], /localStorage|markNewsRead|renderNewsBadges/,
  "shop preview must not alter real shop or official-news read state");
const setShopState = play.match(/function setDebugShopUpdateState\(state\) \{([\s\S]*?)\n    \}/);
assert.ok(setShopState);
assert.match(setShopState[1], /renderShopUpdateSigns\(\)/);
assert.doesNotMatch(setShopState[1], /renderNewsList|renderNewsBadges|writeDebugNewsReadIds/,
  "shop debug controls must be independent from official news");
assert.match(play, /function hideShop\(\)[\s\S]*?var focusTarget = shopFocusOpener;[\s\S]*?focusTarget\.focus\(\)/,
  "closing the shop must restore the visible opener");
assert.match(play, /function refreshNewsAndShopRotation\(\)[\s\S]*?observedShopKey !== nextShopKey[\s\S]*?shop && !shop\.hidden[\s\S]*?renderShopCatalog\('おみせが かわったよ'\)/,
  "an open shop must refresh its actual cards when the JST slot changes");

// The admin preview keeps separate replay controls for official news and the
// shop sign, without exposing destructive inventory reset actions.
assert.match(play, /id="debugBoardTabPreview"[\s\S]*?data-debug-board-tab="preview"[\s\S]*?>みため<\/button>/);
assert.match(play, /こうしきの おしらせと おみせの こうしんを<br>べつべつに ためせるよ/);
assert.match(play, /id="debugNewsGroupTitle">こうしきの おしらせ<[\s\S]*?id="debugShopUpdateGroupTitle">おみせの こうしん</,
  "official news and shop-sign controls need separate visual groups");
for (const id of [
  "debugNewsOpenBtn",
  "debugNewsUnreadBtn",
  "debugNewsReadBtn",
  "debugShopUpdateShowBtn",
  "debugShopUpdateHideBtn",
]) assert.match(play, new RegExp(`id="${id}"`), `${id} debug control must exist`);
assert.match(play, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/, "debug board must fit its fourth tab");

// Official cards retain category/date/new hierarchy, a scrollable panel, and
// a trapped keyboard focus without introducing a shop CTA.
assert.match(play, /news-item__meta[\s\S]*?news-item__tag[\s\S]*?news-item__date[\s\S]*?news-item__new/);
assert.match(play, /function markNewsRead\(\)[\s\S]*?writeNewsReadIds[\s\S]*?writeDebugNewsReadIds/);
assert.match(play, /newsModal\.addEventListener\('keydown'[\s\S]*?event\.key !== 'Tab'[\s\S]*?last\.focus\(\)[\s\S]*?first\.focus\(\)/,
  "keyboard focus must remain inside the news dialog");
assert.match(play, /\.modal-card\.news-modal-card \{[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\) auto;[\s\S]*?overflow: hidden;/,
  "header/footer must stay put while the one official panel scrolls");
assert.match(play, /\.news-panel \{[\s\S]*?overflow-y: auto;[\s\S]*?overscroll-behavior: contain;/);

// The title's own pair remains synchronized. Later game-only Service Worker
// cache bumps may legitimately be newer without changing play.html.
const pageVersion = play.match(/const PAGE_CACHE_VERSION = (\d+);/);
const ponoVersion = play.match(/window\.PONO_SW_VERSION = 'v(\d+)'/);
const swVersion = sw.match(/const CACHE_VERSION = (\d+);/);
assert.ok(pageVersion && ponoVersion && swVersion);
assert.equal(pageVersion[1], "2164");
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
