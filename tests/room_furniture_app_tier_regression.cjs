"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const achievementsSource = fs.readFileSync(path.join(root, "common/achievements.js"), "utf8");
const playAll = fs.readFileSync(path.join(root, "play-all.html"), "utf8");
const roomIndex = fs.readFileSync(path.join(root, "room/index.html"), "utf8");
const roomItemsSource = fs.readFileSync(path.join(root, "room/items.js"), "utf8");
// stamp-rally.js: play-all.html から抽出された (2026-07-16, Stage 1) reward-granting chain
// (rewardsBlocked/checkSlotReward/_initStampRally)。play-all.html は
// <script src="common/stamp-rally.js"></script> を読み込むだけになった。
const stampRally = fs.readFileSync(path.join(root, "common/stamp-rally.js"), "utf8");

// ===== common/achievements.js: ACHIEVEMENTS[].reward.furn ids must all exist in room/items.js =====
// phantom id 再発防止 (see also tests/room_furniture_book_tier_regression.cjs, which covers
// PREMIUM_BONUS.furn the same way): an id that isn't in the ROOM_ITEMS catalog gets silently
// dropped from the inventory by room/index.html's `ROOM_ITEMS.some(...)` filter (line ~1224), so
// a kid can "earn" an achievement and never actually receive any furniture for it.
(function testAchievementFurnIdsExistInCatalog() {
  const REAL_ROOM_ITEM_IDS = new Set(
    Array.from(roomItemsSource.matchAll(/id:\s*'([^']+)'/g)).map((m) => m[1])
  );
  assert.ok(REAL_ROOM_ITEM_IDS.size > 0, "must be able to parse at least one id from room/items.js");

  const start = achievementsSource.indexOf("var ACHIEVEMENTS");
  const end = achievementsSource.indexOf("];", start) + 2;
  assert.ok(start >= 0 && end > start, "achievements.js must still define var ACHIEVEMENTS = [...]");
  const achievementsBlock = achievementsSource.slice(start, end);

  const furnIds = Array.from(
    achievementsBlock.matchAll(/reward:\s*\{\s*type:\s*'furn',\s*id:\s*'([^']+)'/g)
  ).map((m) => m[1]);
  assert.ok(furnIds.length > 0, "sanity check: ACHIEVEMENTS must contain at least one furn reward");

  for (const id of furnIds) {
    assert.ok(
      REAL_ROOM_ITEM_IDS.has(id),
      `ACHIEVEMENTS reward furn id "${id}" must exist in room/items.js ROOM_ITEMS catalog, otherwise room/index.html silently drops it from the inventory`
    );
  }
})();

// ===== common/achievements.js gate =====
// 3段フォールバック (PonoMvpFlags有無 → PONO_MVP_NO_REWARDS有無 → PonoTier.isApp()単独判定) を
// common/stickers.js checkDailyLogin と揃える fail-closed パターン。
assert.match(
  achievementsSource,
  /function _rewardsBlocked\(\) \{\s*\n\s*if \(window\.PonoMvpFlags && typeof window\.PonoMvpFlags\.rewardsBlocked === 'function'\) \{\s*\n\s*return window\.PonoMvpFlags\.rewardsBlocked\(\);\s*\n\s*\}\s*\n\s*if \(window\.PONO_MVP_NO_REWARDS\) return true;\s*\n\s*return !\(window\.PonoTier && typeof window\.PonoTier\.isApp === 'function' && window\.PonoTier\.isApp\(\)\);\s*\n\s*\}/,
  "achievements.js must define a _rewardsBlocked() helper that routes through PonoMvpFlags when available, falls back to the legacy flag, and finally fails closed via PonoTier.isApp() when neither is defined"
);
for (const fnMarker of [
  "window.incrementStat = function (key, amount) {",
  "window.setStatMax = function (key, value) {",
  "window.checkAchievements = function () {",
  "window.grantReward = function (reward) {",
]) {
  const start = achievementsSource.indexOf(fnMarker);
  assert.ok(start >= 0, `achievements.js must still define: ${fnMarker}`);
  const nextLines = achievementsSource.slice(start, start + 300);
  assert.match(
    nextLines,
    /if \(_rewardsBlocked\(\)\)/,
    `${fnMarker} must gate on _rewardsBlocked() instead of the raw PONO_MVP_NO_REWARDS flag`
  );
}

// ===== play-all.html: card-room restored (grayout removed) =====
assert.match(
  playAll,
  /<a href="room\/index\.html" class="card card-room locked" id="card-room">/,
  "play-all.html card-room must have a real href and rely on the .locked class, not an inline grayout style"
);
assert.ok(
  !/id="card-room" style="pointer-events:none;opacity:0\.45;filter:grayscale\(0\.8\);"/.test(playAll),
  "card-room must no longer use the 2026-04-21 inline MVP grayout style"
);
// Sibling cards intentionally left untouched (out of scope for this batch).
assert.match(
  playAll,
  /id="card-aquarium" style="pointer-events:none;opacity:0\.45;filter:grayscale\(0\.8\);"/,
  "card-aquarium must remain grayed out (aquarium is out of scope for this batch)"
);
assert.match(
  playAll,
  /id="card-egg" style="pointer-events:none;opacity:0\.45;filter:grayscale\(0\.8\);"/,
  "card-egg must remain grayed out (egg/pet is out of scope for this batch)"
);

// ===== play-all.html: card-room participates in the book/app unlock toggle =====
assert.match(
  playAll,
  /const lockedCards = \[[^\]]*'card-room'[^\]]*\];/,
  "card-room must be included in lockedCards so applyUnlockState() toggles .locked based on tier"
);

// ===== play-all.html: bn-room bottom-nav override survives mvp-flags.js's blanket hide =====
assert.match(
  playAll,
  /body \.bottom-nav \.bn-item\[data-action="room"\] \{\s*\n\s*display: flex !important;\s*\n\s*\}/,
  "play-all.html must override the mvp-flags.js blanket hide rule for the room bottom-nav button with higher CSS specificity"
);

// ===== play-all.html: loads common/stamp-rally.js for the reward-granting chain =====
// (Stage 1, 2026-07-16: rewardsBlocked()/checkSlotReward()/window._initStampRally were
// extracted out of play-all.html into common/stamp-rally.js; play-all.html now just
// includes the script tag, and stamp-rally.js reproduces the same fallback pattern.)
assert.match(
  playAll,
  /<script src="common\/stamp-rally\.js"><\/script>/,
  "play-all.html must load common/stamp-rally.js, which now owns the reward-granting chain (furniture -> room)"
);

// ===== common/stamp-rally.js: reward-granting chain (furniture -> room) app-tier unblock =====
assert.match(
  stampRally,
  /function rewardsBlocked\(\) \{\s*\n\s*if \(window\.PonoMvpFlags && typeof window\.PonoMvpFlags\.rewardsBlocked === 'function'\) \{\s*\n\s*return window\.PonoMvpFlags\.rewardsBlocked\(\);\s*\n\s*\}\s*\n\s*return !!window\.PONO_MVP_NO_REWARDS;\s*\n\s*\}/,
  "common/stamp-rally.js must define the same rewardsBlocked() fallback pattern used elsewhere in the codebase"
);
for (const marker of [
  "function checkSlotReward(total) {",
  "window._initStampRally = function() {",
]) {
  const start = stampRally.indexOf(marker);
  assert.ok(start >= 0, `common/stamp-rally.js must still define: ${marker}`);
  const nextLines = stampRally.slice(start, start + 400);
  assert.match(
    nextLines,
    /if \(rewardsBlocked\(\)\) return/,
    `${marker} must gate on rewardsBlocked() (this is the entry point that ultimately calls grantReward + unlocks the room card)`
  );
}

// ===== room/index.html: free-tier page guard (book/app pass through) =====
assert.ok(
  roomIndex.indexOf("<title>わたしのおうち</title>") >= 0,
  "room/index.html must keep its <title>"
);
assert.match(
  roomIndex,
  /locked = \(pt\.getTier\(\) === 'free'\)/,
  "room/index.html guard must lock only the free tier (book keeps its existing 10-item partial access)"
);
assert.match(
  roomIndex,
  /window\.PonoDebugMode && window\.PonoDebugMode\.isAllowed\(\)/,
  "room/index.html guard must respect the staging PonoDebugMode bypass like the rest of the codebase"
);
assert.match(
  roomIndex,
  /id = 'ponoTierLockScreen'/,
  "room/index.html guard must render the lock screen overlay (bento/kitchen.html pattern)"
);
assert.match(
  roomIndex,
  /<script src="\.\.\/common\/tier\.js"><\/script>/,
  "room/index.html must load common/tier.js"
);

// ===== Behavioral smoke test via vm sandbox (mirrors login_bonus_app_tier_regression.cjs) =====
function makeDocumentStub() {
  function makeEl() {
    var _text = "";
    return {
      style: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      appendChild() {},
      setAttribute() {},
      addEventListener() {},
      removeEventListener() {},
      set textContent(v) { _text = v; },
      get textContent() { return _text; },
    };
  }
  return {
    readyState: "complete",
    createElement: () => makeEl(),
    head: { appendChild() {} },
    body: { appendChild() {} },
    getElementById: () => null,
    addEventListener() {},
  };
}

function runInAchievementsSandbox(windowExtras, fn) {
  const store = {};
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const sandbox = {
    window: Object.assign({}, windowExtras),
    document: makeDocumentStub(),
    localStorage,
    console,
    Math,
    Date,
    JSON,
    setTimeout,
    clearTimeout,
  };
  sandbox.window.localStorage = localStorage;
  vm.createContext(sandbox);
  vm.runInContext(achievementsSource, sandbox, { timeout: 1000, filename: "common/achievements.js" });
  return fn(sandbox, store);
}

// 1) No PonoMvpFlags / raw PONO_MVP_NO_REWARDS=true (legacy pages without mvp-flags.js) -> blocked.
runInAchievementsSandbox({ PONO_MVP_NO_REWARDS: true }, (sandbox, store) => {
  const result = sandbox.window.incrementStat("login_first", 1);
  assert.equal(result, 0, "legacy PONO_MVP_NO_REWARDS=true path must still block incrementStat when PonoMvpFlags is absent");
  assert.equal(store.pono_unlocked_furn, undefined, "no furniture should be granted while blocked");
});

// 2) PonoMvpFlags present, app tier -> must NOT block; first_login achievement grants furn_toyshelf2 furniture.
runInAchievementsSandbox(
  { PONO_MVP_NO_REWARDS: true, PonoMvpFlags: { rewardsBlocked: () => false } },
  (sandbox, store) => {
    const result = sandbox.window.incrementStat("login_first", 1);
    assert.equal(result, 1, "app tier (rewardsBlocked()===false) must let incrementStat run normally");
    const furn = JSON.parse(store.pono_unlocked_furn || "[]");
    assert.ok(
      furn.indexOf("furn_toyshelf2") !== -1,
      "reaching the first_login achievement target on app tier must unlock furn_toyshelf2 furniture (feeds room/index.html's inventory merge)"
    );
  }
);

// 3) PonoMvpFlags present, non-app tier, no carve-out -> blocked (book/free/Web must stay frozen).
runInAchievementsSandbox(
  { PONO_MVP_NO_REWARDS: true, PonoMvpFlags: { rewardsBlocked: () => true } },
  (sandbox, store) => {
    const result = sandbox.window.incrementStat("login_first", 1);
    assert.equal(result, 0, "non-app tier must remain blocked (book/free/Web 版の凍結を維持)");
    assert.equal(store.pono_unlocked_furn, undefined, "no furniture should be granted while blocked");
  }
);

// 4) window.grantReward (external entry point used by play-all.html's checkSlotReward) respects the same gate.
runInAchievementsSandbox(
  { PONO_MVP_NO_REWARDS: true, PonoMvpFlags: { rewardsBlocked: () => false } },
  (sandbox, store) => {
    sandbox.window.grantReward({ type: "furn", id: "furn_bed_blue_boy" });
    const furn = JSON.parse(store.pono_unlocked_furn || "[]");
    assert.ok(furn.indexOf("furn_bed_blue_boy") !== -1, "app tier grantReward() must write the item id to pono_unlocked_furn");
  }
);
runInAchievementsSandbox(
  { PONO_MVP_NO_REWARDS: true, PonoMvpFlags: { rewardsBlocked: () => true } },
  (sandbox, store) => {
    sandbox.window.grantReward({ type: "furn", id: "furn_bed_blue_boy" });
    assert.equal(store.pono_unlocked_furn, undefined, "non-app tier grantReward() must stay a no-op");
  }
);

// 5) room/index.html production shape: common/mvp-flags.js is not guaranteed loaded there, so
// BOTH window.PonoMvpFlags and window.PONO_MVP_NO_REWARDS can be undefined (unlike case 1, which
// still sets PONO_MVP_NO_REWARDS=true). Only window.PonoTier (common/tier.js) is guaranteed.
// Non-app tier must still be blocked in this exact shape, or the gate fails open.
runInAchievementsSandbox(
  { PonoTier: { isApp: () => false } },
  (sandbox, store) => {
    const result = sandbox.window.incrementStat("login_first", 1);
    assert.equal(result, 0, "room/index.html production shape (no PonoMvpFlags, no PONO_MVP_NO_REWARDS) must still block non-app tier via the PonoTier fallback");
    assert.equal(store.pono_unlocked_furn, undefined, "no furniture should be granted while blocked");
  }
);

// 6) Same production shape, app tier -> must NOT block, so achievements keep working on pages
// that never load common/mvp-flags.js but do load common/tier.js.
runInAchievementsSandbox(
  { PonoTier: { isApp: () => true } },
  (sandbox, store) => {
    const result = sandbox.window.incrementStat("login_first", 1);
    assert.equal(result, 1, "room/index.html production shape (no PonoMvpFlags, no PONO_MVP_NO_REWARDS), app tier must let incrementStat run normally");
    const furn = JSON.parse(store.pono_unlocked_furn || "[]");
    assert.ok(
      furn.indexOf("furn_toyshelf2") !== -1,
      "app tier via PonoTier fallback must still unlock furn_toyshelf2 furniture"
    );
  }
);

console.log("room_furniture_app_tier_regression: all assertions passed");
