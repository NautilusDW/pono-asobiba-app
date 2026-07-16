"use strict";

// book tier (絵本購入者) が家具を一切入手できない構造的な欠落の回帰テスト。
// common/achievements.js の PREMIUM_BONUS.furn が common/tier.js の
// BOOK_ROOM_ITEM_IDS (= room/items.js に実在するカタログ ID) と一致していること、
// grantPremiumBonus() が冪等であること、play.html があいことば解錠成功時 + 初期化時に
// grantPremiumBonus() を book tier 限定で呼ぶことを検証する。
// See also: tests/room_furniture_app_tier_regression.cjs (app tier 側の既存カバレッジ)

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const achievementsSource = fs.readFileSync(path.join(root, "common/achievements.js"), "utf8");
const tierSource = fs.readFileSync(path.join(root, "common/tier.js"), "utf8");
const roomItemsSource = fs.readFileSync(path.join(root, "room/items.js"), "utf8");
const playHtml = fs.readFileSync(path.join(root, "play.html"), "utf8");

// ===== helpers =====
function makeDocumentStub() {
  function makeEl() {
    var _text = "";
    return {
      style: {},
      dataset: {},
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
    body: { appendChild() {}, dataset: {} },
    getElementById: () => null,
    addEventListener() {},
    querySelector: () => null,
  };
}

function makeStore() {
  const store = {};
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  return { store, localStorage };
}

// tier.js を単独 sandbox で実行し、window.PonoTier.BOOK_ROOM_ITEM_IDS の実値を取り出す。
function loadRealBookRoomItemIds() {
  const { localStorage } = makeStore();
  const sandbox = {
    window: {},
    document: makeDocumentStub(),
    localStorage,
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    console,
    Math,
    Date,
    JSON,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (fn) => fn(),
  };
  sandbox.window.localStorage = localStorage;
  sandbox.window.sessionStorage = sandbox.sessionStorage;
  vm.createContext(sandbox);
  vm.runInContext(tierSource, sandbox, { timeout: 1000, filename: "common/tier.js" });
  assert.ok(Array.isArray(sandbox.window.PonoTier.BOOK_ROOM_ITEM_IDS), "PonoTier.BOOK_ROOM_ITEM_IDS must be an array");
  assert.ok(sandbox.window.PonoTier.BOOK_ROOM_ITEM_IDS.length > 0, "PonoTier.BOOK_ROOM_ITEM_IDS must not be empty");
  return sandbox.window.PonoTier.BOOK_ROOM_ITEM_IDS;
}

// achievements.js を単独 sandbox で実行し、grantPremiumBonus() 呼び出し後の localStorage を返す。
// preSeed でストア初期値 (旧カタログ時代のフラグ/家具リストなど) を注入できる。
function runGrantPremiumBonus(callCount, preSeed) {
  const { store, localStorage } = makeStore();
  if (preSeed) {
    for (const k in preSeed) store[k] = preSeed[k];
  }
  const sandbox = {
    window: {},
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
  for (let i = 0; i < callCount; i++) {
    sandbox.window.grantPremiumBonus();
  }
  return store;
}

const REAL_BOOK_ROOM_ITEM_IDS = loadRealBookRoomItemIds();

// room/items.js の実カタログ ID 集合 (phantom id 混入を検出するため)。
const REAL_ROOM_ITEM_IDS = new Set(
  Array.from(roomItemsSource.matchAll(/id:\s*'([^']+)'/g)).map((m) => m[1])
);
assert.ok(REAL_ROOM_ITEM_IDS.size > 0, "must be able to parse at least one id from room/items.js");

// tier.js の BOOK_ROOM_ITEM_IDS 自体もカタログに実在すること (前提条件のセルフチェック)。
for (const id of REAL_BOOK_ROOM_ITEM_IDS) {
  assert.ok(REAL_ROOM_ITEM_IDS.has(id), `sanity check: common/tier.js BOOK_ROOM_ITEM_IDS entry "${id}" must exist in room/items.js`);
}

// ===== 1) grantPremiumBonus() が付与する furn は tier.js の BOOK_ROOM_ITEM_IDS と一致する =====
(function testPremiumBonusMatchesBookRoomItemIds() {
  const store = runGrantPremiumBonus(1);
  assert.ok(store.pono_unlocked_furn, "grantPremiumBonus() must write pono_unlocked_furn");
  const grantedFurn = JSON.parse(store.pono_unlocked_furn);

  for (const id of REAL_BOOK_ROOM_ITEM_IDS) {
    assert.ok(
      grantedFurn.indexOf(id) !== -1,
      `grantPremiumBonus() must grant "${id}" (present in common/tier.js BOOK_ROOM_ITEM_IDS) so book tier purchasers actually receive it`
    );
  }

  // phantom id 再発防止: 過去の 'ach_small_chair' / 'ach_bookshelf' は room/items.js に
  // 実在せず room/index.html の inventory フィルタで黙って消える (line ~1224 の ROOM_ITEMS.some 除去)。
  for (const id of grantedFurn) {
    assert.ok(
      REAL_ROOM_ITEM_IDS.has(id),
      `grantPremiumBonus() furn id "${id}" must exist in room/items.js ROOM_ITEMS catalog, otherwise room/index.html silently drops it from inventory`
    );
  }
})();

// ===== 2) grantPremiumBonus() は冪等 (二重呼び出しで重複付与しない) =====
(function testGrantPremiumBonusIsIdempotent() {
  const storeOnce = runGrantPremiumBonus(1);
  const storeTwice = runGrantPremiumBonus(2);

  const furnOnce = JSON.parse(storeOnce.pono_unlocked_furn);
  const furnTwice = JSON.parse(storeTwice.pono_unlocked_furn);
  assert.equal(furnTwice.length, furnOnce.length, "calling grantPremiumBonus() twice must not duplicate furniture entries");
  // idempotency は各カテゴリ内の `list.indexOf(id) === -1` チェックによる中身ベースの
  // 重複排除で保証する (一発フラグの早期returnには依存しない、下の retroactive テスト参照)。
  assert.deepEqual(furnTwice.slice().sort(), furnOnce.slice().sort(), "repeat calls must not duplicate any furniture id");

  assert.equal(storeTwice.pono_premium_bonus, "granted", "pono_premium_bonus flag must be set after granting");
})();

// ===== 2b) 旧カタログ時代に 'pono_premium_bonus'==='granted' 済みのユーザーへも遡及付与される =====
// 回帰シナリオ: play-all.html:1854-1855 の IIFE や play.html の ensurePremiumFurnitureGranted() は
// book tier 確定ユーザーに対して無条件で grantPremiumBonus() を呼ぶ。もし内部が一発フラグの
// 早期returnで新カタログを無視すると、旧カタログ (phantom id 'ach_small_chair'/'ach_bookshelf')
// の下で既にフラグ済みだったユーザーは、この PR の家具カタログ修正を一切受け取れないまま残る。
(function testGrantPremiumBonusRetroactivelyUpgradesOldCatalogFlag() {
  const OLD_CATALOG_FURN = ['ach_small_chair', 'ach_bookshelf'];
  const store = runGrantPremiumBonus(1, {
    pono_premium_bonus: 'granted',
    pono_unlocked_furn: JSON.stringify(OLD_CATALOG_FURN),
  });

  const grantedFurn = JSON.parse(store.pono_unlocked_furn);
  for (const id of REAL_BOOK_ROOM_ITEM_IDS) {
    assert.ok(
      grantedFurn.indexOf(id) !== -1,
      `grantPremiumBonus() must retroactively grant "${id}" even for a user whose 'pono_premium_bonus' flag was already 'granted' under the old 2-item phantom-id catalog`
    );
  }
})();

// ===== 3) play.html: ensurePremiumFurnitureGranted() が book tier ガード付きで定義されている =====
(function testPlayHtmlHelperDefinition() {
  assert.match(
    playHtml,
    /function ensurePremiumFurnitureGranted\(\) \{\s*\n\s*if \(!isBookBenefitUnlocked\(\)\) return;\s*\n\s*if \(window\.grantPremiumBonus\) window\.grantPremiumBonus\(\);\s*\n\s*\}/,
    "play.html must define ensurePremiumFurnitureGranted() that gates on isBookBenefitUnlocked() before calling window.grantPremiumBonus() (must not fire for app tier / free tier)"
  );
})();

// ===== 4) play.html: あいことば解錠成功フロー (pwFinalizeSuccess) で呼ばれる =====
(function testPlayHtmlCalledOnUnlockSuccess() {
  const idx = playHtml.indexOf("function pwFinalizeSuccess(method) {");
  assert.ok(idx >= 0, "play.html must still define pwFinalizeSuccess(method)");
  const body = playHtml.slice(idx, idx + 1200);
  assert.match(
    body,
    /if \(method !== 'debug'\) \{\s*\n\s*ensureBookBonusStickersGranted\(\);\s*\n\s*ensurePremiumFurnitureGranted\(\);\s*\n\s*\}/,
    "pwFinalizeSuccess() must call ensurePremiumFurnitureGranted() alongside ensureBookBonusStickersGranted() for real unlock methods (serial/quiz), not for 'debug'"
  );
})();

// ===== 5) play.html: 初期化時に既存 book tier ユーザーへ遡って付与するチェックがある =====
(function testPlayHtmlCalledOnInit() {
  assert.match(
    playHtml,
    /updateBookUnlockEntry\(\);\s*\n\s*ensureBookBonusStickersGranted\(\);\s*\n\s*ensurePremiumFurnitureGranted\(\);/,
    "play.html init must call ensurePremiumFurnitureGranted() unconditionally on every page load so users who unlocked book tier before this fix are retroactively granted furniture exactly once"
  );
})();

console.log("room_furniture_book_tier_regression: all assertions passed");
