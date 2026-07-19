"use strict";

// common/stamp-rally.js: スタンプカード境界(total=15,30,45,...)でスロット報酬
// (1/8/15マス目)が二重付与されないことの回帰テスト。
//
// 背景 (2026-07-19 修正): getCardNum(total) = Math.floor(total/15)+1 は境界ちょうどの時
// 「次のカード」の番号を返してしまい、getFilledInCard(total) (=15, 直前カードが満タン)
// と矛盾していた。この不整合のせいで checkSlotReward() がスロット報酬キーを
// 'card' + (次のカード番号) + '_slot' + s の形で組み立て、既に 'card' + (今のカード番号)
// + '_slot' + s として付与済みのスロット1・8報酬(おもちゃばこ/ベッド)を境界のたびに
// 二重付与し、given[]/pono_stamp_rewards_detail に card1_slot8 と card2_slot8 のような
// 重複キーが残っていた(実害: 家具アイテムの二重付与、ショップ在庫の二重増加等)。
//
// このテストは checkSlotReward(total) を total=1..45 まで1つずつ順番に呼び、
// grantReward() が各スロット/各カード完成につきちょうど1回だけ呼ばれること、
// および localStorage の given[] キーに重複が無いことを検証する。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const stampRallySource = fs.readFileSync(path.join(root, "common/stamp-rally.js"), "utf8");

function makeEl() {
  var _text = "";
  return {
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    appendChild() {},
    setAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    set textContent(v) { _text = v; },
    get textContent() { return _text; },
  };
}

function makeDocumentStub() {
  return {
    readyState: "complete",
    createElement: () => makeEl(),
    head: { appendChild() {} },
    body: { appendChild() {} },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => ({ forEach() {} }),
    addEventListener() {},
    removeEventListener() {},
  };
}

function runBoundarySimulation(done) {
  const store = {};
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };

  const grantLog = []; // { total, type, id }
  let currentTotal = 0;

  const windowStub = {
    PONO_MVP_NO_REWARDS: false, // app tier: rewards NOT blocked
    ponoProfile: null, // avoid auto _initStampRally() firing at script-load time
    localStorage,
    grantReward(rw) { grantLog.push({ total: currentTotal, type: rw.type, id: rw.id }); },
    showTreasure() {},
    showAfterMsgOverlay() {},
    addEventListener() {},
  };

  // fetch stub: reject immediately so stamp-rally.js falls back to its hardcoded
  // CARD_SLOT_REWARDS / CARD_COMPLETE_REWARDS constants (kept in sync with
  // assets/data/rewards.json; this is also what an offline device sees in production).
  function fetchStub() { return Promise.reject(new Error("no network in vm sandbox")); }

  const sandbox = {
    window: windowStub,
    document: makeDocumentStub(),
    localStorage,
    console,
    Math,
    Date,
    JSON,
    setTimeout,
    clearTimeout,
    fetch: fetchStub,
    AbortController: global.AbortController,
  };
  sandbox.window.localStorage = localStorage;
  sandbox.window.fetch = fetchStub;
  sandbox.window.AbortController = global.AbortController;
  vm.createContext(sandbox);
  vm.runInContext(stampRallySource, sandbox, { timeout: 5000, filename: "common/stamp-rally.js" });

  const PSR = sandbox.window.PonoStampRally;
  assert.ok(PSR && typeof PSR.checkSlotReward === "function", "PonoStampRally.checkSlotReward must be exported");

  // checkSlotReward has an internal `if (!_rewardsReady) { setTimeout(...200ms); return; }`
  // retry. Give the fetch-reject fallback (`.finally(() => { _rewardsReady = true; })`) time
  // to settle before starting the total=1..45 simulation loop.
  setTimeout(() => {
    for (let total = 1; total <= 45; total++) {
      currentTotal = total;
      PSR.checkSlotReward(total);
    }
    done(grantLog, store);
  }, 300);
}

runBoundarySimulation((grantLog, store) => {
  const given = JSON.parse(store["pono_stamp_rewards_given"] || "[]");
  const boundaryTotals = [15, 30, 45];
  const callsPerBoundary = boundaryTotals.map((t) => grantLog.filter((g) => g.total === t).length);

  // 9 slot rewards (slots 1/8/15 x 3 cards) + 3 card-complete rewards = 12
  assert.equal(
    grantLog.length,
    12,
    "expected exactly 12 grantReward() calls across total=1..45 (9 slot rewards + 3 card-complete rewards); a higher count means a boundary double-grant regressed"
  );
  assert.deepEqual(
    callsPerBoundary,
    [2, 2, 2],
    "each card boundary (total=15/30/45) must grant exactly 2 rewards (the slot-15 reward + the card-complete reward), not 4 (4 would mean slot-1/slot-8 rewards got re-granted under a mislabeled next-card key)"
  );
  assert.equal(given.length, 12, "pono_stamp_rewards_given must end up with exactly 12 keys");
  assert.equal(
    new Set(given).size,
    12,
    "pono_stamp_rewards_given keys must all be unique - no key (e.g. card1_slot8/card2_slot8) may be pushed twice"
  );

  console.log("stamp_rally_slot_reward_boundary_regression: all assertions passed");
});
