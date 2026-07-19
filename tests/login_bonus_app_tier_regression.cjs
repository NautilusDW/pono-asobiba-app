"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const stickersSource = fs.readFileSync(path.join(root, "common/stickers.js"), "utf8");
const play = fs.readFileSync(path.join(root, "play.html"), "utf8");

// ===== play.html wiring =====
assert.match(
  play,
  /<script src="common\/stickers\.js"><\/script>/,
  "play.html must load common/stickers.js"
);
assert.ok(
  play.indexOf('<script src="common/stickers.js"></script>') < play.indexOf('<script src="js/game-stickers.js"></script>'),
  "stickers.js must load before js/game-stickers.js per the script tag ordering added for this feature"
);

const triggerMarker = "===== Login Bonus Trigger (app tier limited) =====";
const triggerStart = play.indexOf(triggerMarker);
assert.ok(triggerStart >= 0, "play.html must contain the login bonus trigger block");
const triggerEnd = play.indexOf("})();", triggerStart);
const triggerBlock = play.slice(triggerStart, triggerEnd + "})();".length);

assert.match(
  triggerBlock,
  /if \(!\(window\.PonoTier && typeof window\.PonoTier\.isApp === 'function' && window\.PonoTier\.isApp\(\)\)\) return;/,
  "the trigger must bail out for every tier except app (Web 版の登録不要訴求と矛盾させないため)"
);
assert.match(triggerBlock, /window\.checkDailyLogin\(\)/, "the trigger must call checkDailyLogin");
assert.match(triggerBlock, /window\.showLoginBonusPopup\(loginResult\)/, "the trigger must show the popup with the result");
assert.match(triggerBlock, /setTimeout\(function \(\) \{ window\.showLoginBonusPopup\(loginResult\); \}, 800\)/, "popup must be delayed 800ms like the play-all.html original");

// ===== common/stickers.js gate =====
assert.match(
  stickersSource,
  /if \(window\.PonoMvpFlags && typeof window\.PonoMvpFlags\.rewardsBlocked === 'function'\) \{\s*\n\s*if \(window\.PonoMvpFlags\.rewardsBlocked\('PONO_MVP_ENABLE_LOGIN_STREAK'\)\) return null;\s*\n\s*\} else if \(window\.PONO_MVP_NO_REWARDS\) \{\s*\n\s*return null;\s*\n\s*\}/,
  "checkDailyLogin must route through PonoMvpFlags.rewardsBlocked when available, and fall back to the legacy flag otherwise"
);
assert.ok(
  stickersSource.indexOf("window.PONO_MVP_NO_REWARDS = ") === -1,
  "this feature must not redefine the shared PONO_MVP_NO_REWARDS global (owned by common/mvp-flags.js)"
);

// ===== Behavioral smoke test via vm sandbox =====
function runCheckDailyLogin(windowExtras) {
  const store = {};
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const sandbox = {
    window: Object.assign({}, windowExtras),
    localStorage,
    console,
    Math,
    Date,
    JSON,
  };
  sandbox.window.localStorage = localStorage;
  vm.createContext(sandbox);
  vm.runInContext(stickersSource, sandbox, { timeout: 1000, filename: "common/stickers.js" });
  return sandbox.window.checkDailyLogin();
}

// 1) No PonoMvpFlags / no PonoTier loaded (mirrors legacy pages that still set the raw flag) → blocked.
assert.equal(
  runCheckDailyLogin({ PONO_MVP_NO_REWARDS: true }),
  null,
  "legacy PONO_MVP_NO_REWARDS=true path must still block when PonoMvpFlags is absent"
);

// 2) PonoMvpFlags present, app tier → must NOT block (this is the feature being restored).
assert.notEqual(
  runCheckDailyLogin({
    PONO_MVP_NO_REWARDS: true,
    PonoMvpFlags: { rewardsBlocked: () => false },
  }),
  null,
  "app tier (rewardsBlocked()===false) must let checkDailyLogin run and return a result"
);

// 3) PonoMvpFlags present, non-app tier, no carve-out → blocked (Web tier must stay frozen).
assert.equal(
  runCheckDailyLogin({
    PONO_MVP_NO_REWARDS: true,
    PonoMvpFlags: { rewardsBlocked: () => true },
  }),
  null,
  "non-app tier must remain blocked (Web 版の凍結を維持)"
);

// 4) The real play.html production condition: common/mvp-flags.js is deliberately never loaded
// there, so BOTH window.PonoMvpFlags and window.PONO_MVP_NO_REWARDS are undefined (not just
// PONO_MVP_NO_REWARDS=true as in case 1). Only window.PonoTier (common/tier.js) is guaranteed.
// Free/book tier must still be blocked in this exact shape, or the gate fails open.
assert.equal(
  runCheckDailyLogin({
    PonoTier: { isApp: () => false },
  }),
  null,
  "play.html production shape (no PonoMvpFlags, no PONO_MVP_NO_REWARDS) must still block non-app tier via the PonoTier fallback"
);

// 5) Same play.html production shape, app tier → must NOT block, so the feature keeps working
// on the one page that actually calls checkDailyLogin() in production.
assert.notEqual(
  runCheckDailyLogin({
    PonoTier: { isApp: () => true },
  }),
  null,
  "play.html production shape (no PonoMvpFlags, no PONO_MVP_NO_REWARDS), app tier must let checkDailyLogin run"
);

console.log("login_bonus_app_tier_regression: all assertions passed");
