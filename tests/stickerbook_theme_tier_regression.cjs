"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "Prototypes/StickerBookThreeJS/main.js"), "utf8");
const index = fs.readFileSync(path.join(root, "Prototypes/StickerBookThreeJS/index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "Prototypes/StickerBookThreeJS/styles.css"), "utf8");
const tierPolicy = fs.readFileSync(path.join(root, "docs/TIER_POLICY.md"), "utf8");

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `missing source section: ${startMarker}`);
  return source.slice(start, end);
}

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} function missing`);
  const paramsStart = source.indexOf("(", start + marker.length - 1);
  let paramsDepth = 0;
  let paramsEnd = -1;
  for (let cursor = paramsStart; cursor < source.length; cursor += 1) {
    if (source[cursor] === "(") paramsDepth += 1;
    if (source[cursor] === ")") {
      paramsDepth -= 1;
      if (paramsDepth === 0) {
        paramsEnd = cursor;
        break;
      }
    }
  }
  const bodyStart = source.indexOf("{", paramsEnd);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let cursor = bodyStart; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    const next = source[cursor + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        cursor += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      cursor += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      cursor += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, cursor + 1);
    }
  }
  assert.fail(`${name} function is unterminated`);
}

function idsIn(source, attribute) {
  return [...source.matchAll(new RegExp(`${attribute}="([^"]+)"`, "g"))].map((match) => match[1]);
}

const panelHtml = section(index, '<section id="bookThemePanel"', '<div class="modebar"');
const modebarHtml = section(index, '<div class="modebar"', '<div class="toolbar"');
const panelIds = idsIn(panelHtml, "data-book-theme");
const modebarIds = idsIn(modebarHtml, "data-book");
const defaultIds = [
  "boy", "sakura",
  "girl", "shinobi", "hero", "idol", "book_buyer_edition",
  "robot", "space_live", "game_center", "rainbow_dream",
];

assert.equal(panelIds.length, 25, "the child-facing picker must keep 25 canonical inventory entries");
assert.equal(new Set(panelIds).size, 25, "picker theme ids must be unique");
assert.deepEqual(panelIds.slice(0, 11), defaultIds, "the 2/7/11 cumulative themes must come first");
assert.deepEqual(modebarIds, panelIds, "local prototype controls must use the same canonical order");
assert.ok(!panelIds.includes("book_bonus"), "the duplicate legacy book_bonus card must be removed");
assert.equal(panelIds.filter((id) => id === "book_buyer_edition").length, 1, "the special cover must appear once");

const storage = new Map();
const shownPromos = [];
const sandbox = {
  console: { warn() {} },
  BOOK_VARIANTS: Object.fromEntries([...panelIds, "forest"].map((id) => [id, {}])),
  STICKER_BOOK_THEME_STORAGE_KEY: "pono_sticker_book_theme_v1",
  prototypeControlsEnabled: false,
  __tier: "free",
  window: {
    PonoTier: {
      getTier() { return sandbox.__tier; },
      showTierLockPromo(copy) { shownPromos.push(copy); return true; },
    },
  },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
  },
};

const accessSource = section(main, "const BOOK_THEME_ACCESS", "const STICKER_BOOK_THEMES");
const functionNames = [
  "currentPonoTier",
  "isBookVariantLocked",
  "isBookVariantVisible",
  "readStoredBookTheme",
  "writeStoredBookTheme",
  "resolveInitialBookTheme",
  "showBookVariantLockPromo",
  "sanitizeStoredUserName",
  "readStoredUserName",
];
vm.createContext(sandbox);
vm.runInContext(
  `${accessSource}\n${functionNames.map((name) => extractFunction(main, name)).join("\n")}\n` +
    "globalThis.__themeApi = {" +
    " access: (id) => ({ ...bookThemeAccess(id) })," +
    " normalize: normalizeBookThemeId," +
    " tier: currentPonoTier," +
    " locked: isBookVariantLocked," +
    " visible: isBookVariantVisible," +
    " read: readStoredBookTheme," +
    " write: writeStoredBookTheme," +
    " resolve: resolveInitialBookTheme," +
    " promo: showBookVariantLockPromo," +
    " userName: readStoredUserName" +
    "};",
  sandbox,
  { timeout: 1000 },
);
const api = sandbox.__themeApi;

const tierGroups = Object.groupBy
  ? Object.groupBy(panelIds, (id) => api.access(id).minTier)
  : panelIds.reduce((groups, id) => {
      const tier = api.access(id).minTier;
      (groups[tier] ||= []).push(id);
      return groups;
    }, {});
assert.equal(tierGroups.free.length, 2);
assert.equal(tierGroups.book.length, 5);
assert.equal(tierGroups.app.length, 4);
assert.equal(tierGroups.future.length, 14);

const expectedByTier = {
  free: { visible: 7, unlocked: 2, balance: { boy: 1, girl: 1, all: 0 } },
  book: { visible: 11, unlocked: 7, balance: { boy: 3, girl: 3, all: 1 } },
  app: { visible: 11, unlocked: 11, balance: { boy: 5, girl: 5, all: 1 } },
};
for (const [tier, expected] of Object.entries(expectedByTier)) {
  sandbox.__tier = tier;
  const visible = panelIds.filter((id) => api.visible(id));
  const unlocked = panelIds.filter((id) => !api.locked(id));
  assert.equal(visible.length, expected.visible, `${tier} visible theme count`);
  assert.equal(unlocked.length, expected.unlocked, `${tier} unlocked theme count`);
  const balance = { boy: 0, girl: 0, all: 0 };
  for (const id of unlocked) balance[api.access(id).balanceGroup] += 1;
  assert.deepEqual(balance, expected.balance, `${tier} balance must include the neutral special without gender gating`);
}
assert.deepEqual(panelIds.filter((id) => api.access(id).minTier === "free"), ["boy", "sakura"], "free must be exactly sea and sakura");
assert.deepEqual(panelIds.filter((id) => ["free", "book"].includes(api.access(id).minTier)), panelIds.slice(0, 7), "book must keep the cumulative first seven themes");

sandbox.prototypeControlsEnabled = true;
assert.equal(panelIds.filter((id) => api.visible(id)).length, 25, "local controls must expose the full asset inventory");
assert.equal(panelIds.filter((id) => !api.locked(id)).length, 25, "local controls must permit asset review");
sandbox.prototypeControlsEnabled = false;

sandbox.__tier = "unknown";
assert.equal(api.tier(), "free", "unknown tier values must fail closed to free");
sandbox.window.PonoTier.getTier = () => { throw new Error("broken tier"); };
assert.equal(api.tier(), "free", "tier read errors must fail closed to free");
sandbox.window.PonoTier.getTier = () => sandbox.__tier;

storage.clear();
storage.set("pono_sticker_book_theme_v1", "sakura");
sandbox.__tier = "free";
assert.equal(api.resolve("hero"), "sakura", "a locked URL must fall back to an available saved theme");
storage.set("pono_sticker_book_theme_v1", "girl");
assert.equal(api.resolve(""), "boy", "a newly book-locked saved theme must fall back safely for free users");
assert.equal(storage.get("pono_sticker_book_theme_v1"), "girl", "a locked saved theme must be retained for a later tier upgrade");
sandbox.__tier = "book";
assert.equal(api.resolve(""), "girl", "the retained theme must return after book unlock");
storage.set("pono_sticker_book_theme_v1", "book_bonus");
assert.equal(api.read(), "book_buyer_edition", "legacy saved ids must normalize");
assert.equal(storage.get("pono_sticker_book_theme_v1"), "book_buyer_edition", "legacy storage must migrate in place");
assert.equal(api.resolve("book_bonus"), "book_buyer_edition", "legacy URLs must open the unified special theme when unlocked");
storage.clear();
sandbox.__tier = "app";
assert.equal(api.resolve("kaiju"), "boy", "future inventory must stay closed even in app tier");
assert.equal(api.normalize("forest"), "boy", "the hidden forest prototype URL must migrate to the safe default");

shownPromos.length = 0;
sandbox.__tier = "free";
api.promo("book_buyer_edition");
assert.equal(shownPromos.at(-1).freeTag, "えほん");
assert.equal(shownPromos.at(-1).freeTitle, "あいことばで つかえるよ");
sandbox.__tier = "book";
api.promo("robot");
assert.equal(shownPromos.at(-1).appTag, "アプリ");
assert.equal(shownPromos.at(-1).appTitle, "アプリで つかえるよ");
for (const copy of shownPromos) {
  assert.doesNotMatch(Object.values(copy).join(" "), /[一-龯]/, "child-facing promo copy must use kana");
}

storage.clear();
storage.set("pono_player_profile_v1", JSON.stringify({ name: "  ポノ\u0000ちゃん長いなまえ  ", gender: "girl" }));
storage.set("pono_profile_name", "むかし");
assert.equal(api.userName(), "ポノちゃん長いな", "the current profile name must win and stay within eight characters");
storage.set("pono_player_profile_v1", "{broken");
assert.equal(api.userName(), "むかし", "a malformed profile must fall back to a legacy name");
storage.delete("pono_profile_name");
storage.set("pono_user_name", "さらにむかし");
assert.equal(api.userName(), "さらにむかし", "the oldest name key must remain a final compatibility fallback");

const setActiveBookSource = extractFunction(main, "setActiveBook");
assert.ok(
  setActiveBookSource.indexOf("isBookVariantLocked") < setActiveBookSource.indexOf("ensureBookVariantTextures"),
  "locked themes must be rejected before any texture bundle is loaded",
);
assert.ok(
  setActiveBookSource.indexOf("ensureBookVariantTextures") < setActiveBookSource.lastIndexOf("writeStoredBookTheme"),
  "a new selection must persist only after its textures load successfully",
);
assert.match(setActiveBookSource, /showBookVariantLockPromo\(normalizedBook\)/);
assert.match(extractFunction(main, "assignCoverTurnTextures"), /bundle\.nameInscription[\s\S]*?coverInsideTextureForBook/,
  "the special cover turn must reveal the name-inscribed inside texture in normal album mode");
assert.ok(
  main.indexOf("const coverInsideNameTextureCache = new Map()") < main.indexOf("map: coverInsideTextureForBook(activeBook)"),
  "the name texture cache must exist before a special theme can be selected during initial scene construction",
);

const hydrateSource = extractFunction(main, "hydrateBookThemeCards");
assert.doesNotMatch(hydrateSource, /setAttribute\("aria-disabled"/, "locked theme cards show guidance and must remain actionable");
assert.doesNotMatch(hydrateSource, /aria-haspopup/, "the shared promo is not a semantic dialog, so the trigger must not make a false popup claim");
assert.match(hydrateSource, /badge\.textContent = requiredTier === "book" \? "えほん" : "アプリ"/);
assert.match(css, /\.book-theme-lock-badge[\s\S]*?min-width:\s*42px/);
assert.match(css, /\.zukan-theme-picker button\[hidden\][\s\S]*?display:\s*none/);
assert.match(index, /styles\.css\?v=20260713-1278/);
assert.match(index, /main\.js\?v=20260713-1278/);
assert.match(tierPolicy, /\*\*free\*\* \| \*\*2\*\*/);
assert.match(tierPolicy, /\*\*book\*\* \| \*\*7\*\*/);
assert.match(tierPolicy, /\*\*app\*\* \| \*\*11\*\*/);

console.log("stickerbook_theme_tier_regression: all assertions passed");
