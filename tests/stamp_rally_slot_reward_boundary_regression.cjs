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
    // showTreasure stub (updated 2026-07-19, batch:1371): checkSlotReward() now defers
    // grantReward for gendered rewards until the child's 2-choice tap is confirmed via
    // options.onChoose (see common/treasure.js's choices/onChoose contract). This stub
    // simulates a child immediately tapping the first choice (index 0) and immediately
    // closing, so the deferred-grant path (_finalizeSlotGrant/_finalizeCompleteGrant)
    // actually fires in this test instead of being silently skipped (which previously
    // made this test undercount grantReward() calls: 7 instead of 12).
    showTreasure(opts) {
      if (opts && Array.isArray(opts.choices) && opts.choices.length === 2 && typeof opts.onChoose === 'function') {
        opts.onChoose(opts.choices[0]);
      }
      if (opts && typeof opts.onClose === 'function') opts.onClose();
    },
    showAfterMsgOverlay() {},
    addEventListener() {},
  };

  // fetch stub: reject immediately so stamp-rally.js falls back to its hardcoded
  // CARD_SLOT_REWARDS / CARD_COMPLETE_REWARDS constants (kept in sync with
  // assets/data/rewards.json; this is also what an offline device sees in production).
  function fetchStub() { return Promise.reject(new Error("no network in vm sandbox")); }

  // setTimeout wrapper (updated 2026-07-19, batch:1371): checkSlotReward() schedules its
  // showTreasure() calls via setTimeout(200ms)/setTimeout(1200ms) (the exact independent
  // calls whose interaction is the subject of the Critical bug report this test-fix
  // accompanies). Those callbacks now actually run grantReward() (via the showTreasure
  // stub's synchronous onChoose) *after* the driving `for` loop below has already moved
  // `currentTotal` on to a later value, so naively reading `currentTotal` from inside the
  // deferred callback would mis-attribute every choice-mode grant to total=45. Capture
  // the in-flight total at *scheduling* time instead, and restore it only for the
  // duration of the deferred callback.
  function setTimeoutStub(fn, ms) {
    const capturedTotal = currentTotal;
    return setTimeout(function() {
      const prevTotal = currentTotal;
      currentTotal = capturedTotal;
      try { fn(); } finally { currentTotal = prevTotal; }
    }, ms);
  }

  const sandbox = {
    window: windowStub,
    document: makeDocumentStub(),
    localStorage,
    console,
    Math,
    Date,
    JSON,
    setTimeout: setTimeoutStub,
    clearTimeout,
    fetch: fetchStub,
    AbortController: global.AbortController,
    // stamp-rally.js unconditionally defines its own window.showAfterMsgOverlay
    // (overwriting windowStub's no-op), and that real implementation uses
    // requestAnimationFrame for its show-transition. Only reachable now that this
    // test's showTreasure stub actually fires onChoose/onClose (see above), which
    // previously left this codepath completely unexercised by this test.
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
  };
  sandbox.window.localStorage = localStorage;
  sandbox.window.fetch = fetchStub;
  sandbox.window.AbortController = global.AbortController;
  vm.createContext(sandbox);
  vm.runInContext(stampRallySource, sandbox, { timeout: 5000, filename: "common/stamp-rally.js" });

  const PSR = sandbox.window.PonoStampRally;
  assert.ok(PSR && typeof PSR.checkSlotReward === "function", "PonoStampRally.checkSlotReward must be exported");

  // checkSlotReward(total) is only ever called once per real stamp-earning event in
  // production (see common/stamp-rally.js call sites: setTimeout(() => checkSlotReward
  // (finalTotal), 150), each firing once per gameplay session), each such call already
  // catching up on any skipped slots via its own internal `for (s=1..filled)` loop.
  // Real gameplay always leaves far more than 1200ms between two such calls. Calling
  // checkSlotReward for every total=1..45 back-to-back with zero delay (as this test
  // used to, from before the 2026-07-19 2-choice UI change) is unrealistic for the
  // now-deferred choice-mode grant path: because confirmation only happens inside
  // showTreasure()'s onChoose (fired from the setTimeout(200ms) callback), a same-tick
  // total=2 call would still see the total=1 choice-reward key as "not yet given" and
  // schedule a second, redundant showTreasure() for the same slot — and so on for every
  // subsequent total, snowballing into dozens of duplicate calls that don't reflect any
  // real production timing. Await past the longest deferred delay (1200ms) after each
  // total before moving to the next, so every call sees a fully-settled given[]/detailMap,
  // matching how real gameplay actually spaces these calls out.
  //
  // checkSlotReward also has an internal `if (!_rewardsReady) { setTimeout(...200ms);
  // return; }` retry; give the fetch-reject fallback
  // (`.finally(() => { _rewardsReady = true; })`) time to settle first.
  function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  (async () => {
    await wait(300);
    for (let total = 1; total <= 45; total++) {
      currentTotal = total;
      PSR.checkSlotReward(total);
      await wait(1500);
    }
    done(grantLog, store);
  })();
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
