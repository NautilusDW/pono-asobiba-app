"use strict";

// common/shop-catalog.js の分類ロジック (computeAchievementOnlyIds / resolveFurnitureRarity) の回帰テスト。
// どんぐりショップ「🪑かぐ」タブ (案2ハイブリッド) が実績専用idを誤って販売しないこと、
// 優先順位 (achievement-only > 既存price > wall/floor > deco > furn+all > furn+boy/girl) を
// 正しく守ることを検証する。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const achievementsSource = fs.readFileSync(path.join(root, "common/achievements.js"), "utf8");
const tierSource = fs.readFileSync(path.join(root, "common/tier.js"), "utf8");
const catalogSource = fs.readFileSync(path.join(root, "common/shop-catalog.js"), "utf8");
const roomItemsSource = fs.readFileSync(path.join(root, "room/items.js"), "utf8");

// ===== sandbox helpers (tests/room_furniture_book_tier_regression.cjs と同型) =====
function makeDocumentStub() {
  function makeEl() {
    let _text = "";
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

function buildSandbox() {
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
    Set,
    Array,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (fn) => fn(),
  };
  sandbox.window.localStorage = localStorage;
  sandbox.window.sessionStorage = sandbox.sessionStorage;
  vm.createContext(sandbox);
  vm.runInContext(tierSource, sandbox, { timeout: 1000, filename: "common/tier.js" });
  vm.runInContext(achievementsSource, sandbox, { timeout: 1000, filename: "common/achievements.js" });
  vm.runInContext(catalogSource, sandbox, { timeout: 1000, filename: "common/shop-catalog.js" });
  return sandbox;
}

function loadRealRoomItems(sandbox) {
  const m = roomItemsSource.match(/const ROOM_ITEMS = \[[\s\S]*?\n\];/);
  assert.ok(m, "must be able to extract ROOM_ITEMS array literal from room/items.js");
  vm.runInContext(m[0].replace("const ROOM_ITEMS", "var ROOM_ITEMS"), sandbox, { filename: "room/items.js" });
  return vm.runInContext("ROOM_ITEMS", sandbox);
}

const sandbox = buildSandbox();
const catalog = sandbox.window.PonoShopCatalog;
assert.ok(catalog, "window.PonoShopCatalog must be exported");
assert.equal(typeof catalog.computeAchievementOnlyIds, "function");
assert.equal(typeof catalog.resolveFurnitureRarity, "function");

const ROOM_ITEMS = loadRealRoomItems(sandbox);
const ROOM_ITEMS_BY_ID = new Map(ROOM_ITEMS.map((it) => [it.id, it]));

// ===== 1) computeAchievementOnlyIds(): 実際のカタログに対して整合していること =====
(function testAchievementOnlyIdsAreReal() {
  const ids = catalog.computeAchievementOnlyIds();
  assert.ok(ids instanceof Set || Array.isArray(ids), "must return a Set or Array");
  const idArr = Array.from(ids);
  assert.ok(idArr.length > 0, "must find at least one achievement-only id in the current catalog");

  for (const id of idArr) {
    assert.ok(
      ROOM_ITEMS_BY_ID.has(id),
      `achievement-only id "${id}" must exist in room/items.js ROOM_ITEMS (phantom id regression)`
    );
  }

  // 実績由来 (window.getActiveAchievements) の代表例と、プレミアム由来 (PonoTier.BOOK_ROOM_ITEM_IDS)
  // の代表例が両方とも含まれること（片方の集合しか見ていない実装への回帰防止）。
  assert.ok(idArr.indexOf("furn_toyshelf2") !== -1, "achievement reward id 'furn_toyshelf2' (first_login) must be achievement-only");
  assert.ok(idArr.indexOf("furn_bear_1") !== -1, "premium bonus id 'furn_bear_1' (BOOK_ROOM_ITEM_IDS) must be achievement-only");

  // archived:true な実績の報酬idは、他の非archived実績が再利用していない限り achievement-only に含まれない。
  // 'furn_desk' は drawing_5 (archived) のみが参照しており、非archivedの参照者がいない。
  assert.ok(idArr.indexOf("furn_desk") === -1, "reward id used only by an archived achievement must NOT be achievement-only");
})();

// ===== 2) resolveFurnitureRarity(): 実カタログの achievement-only id は必ず null =====
(function testRealAchievementOnlyIdsResolveToNull() {
  const ids = Array.from(catalog.computeAchievementOnlyIds());
  for (const id of ids) {
    const item = ROOM_ITEMS_BY_ID.get(id);
    assert.equal(
      catalog.resolveFurnitureRarity(item), null,
      `achievement-only item "${id}" must resolve to null (non-sale) even though its cat/theme/price would otherwise imply a rarity`
    );
  }
})();

// ===== 3) resolveFurnitureRarity(): 優先順位の単体テスト (合成アイテム) =====
(function testPriorityOrder() {
  // (1) achievement-only は他の全条件より優先して null
  const achOnlyId = Array.from(catalog.computeAchievementOnlyIds())[0];
  assert.equal(
    catalog.resolveFurnitureRarity({ id: achOnlyId, cat: "wall", theme: "all", price: 15 }),
    null,
    "achievement-only id must resolve to null even when disguised as a wall item with a price"
  );

  // (2) 既存price を尊重（cat/themeがsuperを示唆していても上書きしない）
  assert.equal(
    catalog.resolveFurnitureRarity({ id: "synthetic_priced", cat: "furn", theme: "girl", price: 15 }),
    "normal",
    "existing price=15 must resolve to normal, not overwritten by furn+girl->super rule"
  );
  assert.equal(
    catalog.resolveFurnitureRarity({ id: "synthetic_priced2", cat: "deco", theme: "all", price: 25 }),
    "rare",
    "existing price=25 must resolve to rare"
  );
  assert.equal(
    catalog.resolveFurnitureRarity({ id: "synthetic_priced3", cat: "furn", theme: "boy", price: 35 }),
    "super",
    "existing price=35 must resolve to super"
  );

  // (3) wall / floor -> normal
  assert.equal(catalog.resolveFurnitureRarity({ id: "synthetic_wall", cat: "wall", theme: "boy" }), "normal");
  assert.equal(catalog.resolveFurnitureRarity({ id: "synthetic_floor", cat: "floor", theme: "girl" }), "normal");

  // (4) deco -> normal (theme に関わらず)
  assert.equal(catalog.resolveFurnitureRarity({ id: "synthetic_deco_boy", cat: "deco", theme: "boy" }), "normal");
  assert.equal(catalog.resolveFurnitureRarity({ id: "synthetic_deco_girl", cat: "deco", theme: "girl" }), "normal");
  assert.equal(catalog.resolveFurnitureRarity({ id: "synthetic_deco_all", cat: "deco", theme: "all" }), "normal");

  // (5) furn + theme=all -> rare
  assert.equal(catalog.resolveFurnitureRarity({ id: "synthetic_furn_all", cat: "furn", theme: "all" }), "rare");

  // (6) furn + theme=boy/girl -> super
  assert.equal(catalog.resolveFurnitureRarity({ id: "synthetic_furn_boy", cat: "furn", theme: "boy" }), "super");
  assert.equal(catalog.resolveFurnitureRarity({ id: "synthetic_furn_girl", cat: "furn", theme: "girl" }), "super");

  // 想定外の cat/theme の組み合わせは非売品 (null) にフォールバックする
  assert.equal(catalog.resolveFurnitureRarity({ id: "synthetic_unknown_cat", cat: "mystery", theme: "all" }), null);
  assert.equal(catalog.resolveFurnitureRarity({ id: "synthetic_no_theme", cat: "furn" }), null);
})();

// ===== 4) resolveFurnitureRarity(): 防御的な入力 =====
(function testDefensiveInputs() {
  assert.equal(catalog.resolveFurnitureRarity(null), null);
  assert.equal(catalog.resolveFurnitureRarity(undefined), null);
  assert.equal(catalog.resolveFurnitureRarity({}), null);
  assert.equal(catalog.resolveFurnitureRarity({ cat: "wall" }), null, "item without id must resolve to null");
})();

// ===== 5) 実カタログ全体の分類が矛盾なく完了すること (informational breakdown) =====
(function testFullCatalogClassificationIsExhaustive() {
  const counts = { normal: 0, rare: 0, super: 0, null: 0 };
  for (const item of ROOM_ITEMS) {
    const r = catalog.resolveFurnitureRarity(item);
    assert.ok(
      r === null || r === "normal" || r === "rare" || r === "super",
      `resolveFurnitureRarity("${item.id}") returned an unexpected value: ${r}`
    );
    counts[r === null ? "null" : r]++;
  }
  assert.equal(
    counts.normal + counts.rare + counts.super + counts.null,
    ROOM_ITEMS.length,
    "every ROOM_ITEMS entry must classify to exactly one bucket"
  );
  console.log("  (info) room/items.js breakdown:", JSON.stringify(counts), "/ total", ROOM_ITEMS.length);
})();

// ===== 6) computeAchievementOnlyIds(): window.PonoStampRally のスタンプラリー報酬も含むこと =====
// stamp-rally.js 本体は fetch/DOM/AudioContext に依存し vm sandbox 単体実行に不向きなため、
// common/stamp-rally.js が Object.defineProperty で公開する形状 (CARD_SLOT_REWARDS /
// CARD_COMPLETE_REWARDS、非gendered直値 or {gendered:true,boy,girl}) だけを模した stub を使う。
(function testStampRallyRewardsAreAchievementOnly() {
  sandbox.window.PonoStampRally = {
    CARD_SLOT_REWARDS: {
      1: { icon: "🎁", name: "おもちゃばこ", type: "deco", id: "deco_box_boy" },
      5: { icon: "🛏️", name: "あおいベッド", type: "furn", id: "furn_bed_blue_boy" },
      10: { icon: "🧸", name: "くまのぬいぐるみ", type: "deco", id: "furn_bear_1" },
      15: { icon: "⭐", name: "カードかんせい！", type: "special" },
      20: {
        icon: "⭐", name: "つくえ", gendered: true,
        boy: { type: "furn", id: "imp_furn_45b11a5f" },
        girl: { type: "deco", id: "deco_bear_ribbon" },
      },
    },
    CARD_COMPLETE_REWARDS: [
      { icon: "🐠", name: "さかな", type: "sea", id: "medaka" },
      { icon: "🖼️", name: "かべがみ", type: "wall", id: "wall_mizutama" },
      {
        icon: "🎳", name: "ボウリング", gendered: true,
        boy: { type: "bg", id: "bg_bowling_dinasour" },
        girl: { type: "bg", id: "bg_bowling_unicorn" },
      },
    ],
  };

  const ids = Array.from(catalog.computeAchievementOnlyIds());

  // furn/deco (非gendered直値 と gendered.boy/girl の両方) は実績専用集合に入ること
  ["deco_box_boy", "furn_bed_blue_boy", "furn_bear_1", "imp_furn_45b11a5f", "deco_bear_ribbon"].forEach((id) => {
    assert.ok(ids.indexOf(id) !== -1, `stamp-rally furn/deco reward id "${id}" must be achievement-only`);
    assert.equal(
      catalog.resolveFurnitureRarity(ROOM_ITEMS_BY_ID.get(id)),
      null,
      `stamp-rally furn/deco reward id "${id}" must resolve to null in the real catalog`
    );
  });

  // wall はroom/items.jsのwallカテゴリに実在するため対象に含めるべき
  assert.ok(ids.indexOf("wall_mizutama") !== -1, "stamp-rally wall reward id 'wall_mizutama' must be achievement-only");
  assert.equal(catalog.resolveFurnitureRarity(ROOM_ITEMS_BY_ID.get("wall_mizutama")), null);

  // sea/bg はroom家具カタログ(furn/deco/wall/floor)とは別物なので対象外
  ["medaka", "bg_bowling_dinasour", "bg_bowling_unicorn"].forEach((id) => {
    assert.ok(ids.indexOf(id) === -1, `stamp-rally reward id "${id}" (sea/bg) must NOT be achievement-only`);
  });

  // type:'special' (id無し) は例外を出さず単に無視されること
  assert.ok(ids.indexOf(undefined) === -1);

  delete sandbox.window.PonoStampRally;
})();

// ===== 7) computeAchievementOnlyIds(): window.PonoStampRally 未読込ページでは no-op (例外なし) =====
(function testStampRallyMissingIsNoOp() {
  assert.equal(sandbox.window.PonoStampRally, undefined, "previous test must clean up PonoStampRally");
  assert.doesNotThrow(() => catalog.computeAchievementOnlyIds());
  const ids = Array.from(catalog.computeAchievementOnlyIds());
  assert.ok(ids.indexOf("wall_mizutama") === -1, "stamp-rally-only id must disappear once PonoStampRally is gone");
})();

console.log("shop_furniture_catalog_regression: all assertions passed");
