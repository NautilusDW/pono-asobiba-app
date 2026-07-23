// ── machizukuri/js/logic.js ──
// ポノのまちづくり: 純粋ロジック (DOM 非依存)。
// DOM/描画/入力/localStorage は js/game.js が担当し、ここは node からも `require`
// できる純関数群のみを置く。トップレベルで document/window の DOM API には
// 一切触れないこと。他の machizukuri/ 内ファイル (parts.js/game.js) も import しない。
//
// 経済モデル: spendable = max(0, statTotal(hatake_harvest 累計) - harvestSpent)。
// harvestSpent は「消費済み野菜」の単調カウンタで、初期値を -STARTER_VEGGIE_BALANCE
// にすることで、はたけ実績 0 の新規プレイヤーにも初日から
// STARTER_VEGGIE_BALANCE 個ぶんの残高を自然に与える (特別分岐コード無し・
// フィールド追加無しで実現するオーケストレーター決定)。
'use strict';

(function () {

  var _nowOverride = null;

  function getNow() {
    return _nowOverride ? new Date(_nowOverride.getTime()) : new Date();
  }

  function setNowForTest(d) {
    _nowOverride = d ? new Date(d.getTime()) : null;
  }

  var EVENING_START_HOUR = 17;
  var DAWN_HOUR = 6;

  /** 17時〜翌6時未満を夕方/夜の環境ティントとして扱う。 */
  function isEvening(now) {
    var d = now || getNow();
    var h = d.getHours();
    return h >= EVENING_START_HOUR || h < DAWN_HOUR;
  }

  var LOT_COUNT = 12;
  var FLOWER_SLOT_COUNT = 16;
  var STARTER_VEGGIE_BALANCE = 3;
  var CENTER_LOT_ID = 'lot1';
  var STARTER_TREE_LOT_ID = 'lot2';

  /** 'lot' + (i+1) という lots 配列の並びの取り決めから index を逆算する。 */
  function lotIndexFromId(lotId) {
    var n = parseInt(String(lotId).replace('lot', ''), 10);
    return isFinite(n) ? n - 1 : -1;
  }

  var CENTER_LOT_INDEX = lotIndexFromId(CENTER_LOT_ID);
  var STARTER_TREE_LOT_INDEX = lotIndexFromId(STARTER_TREE_LOT_ID);

  // asset_parts_list 準拠のコスト表。pono_house (プレイヤーの家) は購入不可の
  // ため未収録。flower_cluster は lot に置く通常パーツではなく plantFlower
  // 専用の道端ミクロスロット消費だが、コストはここに一元管理する。
  var PART_COSTS = {
    cottage_akane: 3,
    cottage_aoi: 3,
    tree_maru: 1,
    well: 2,
    bench: 1,
    fence: 1,
    flowerbed: 1,
    streetlamp: 2,
    pond_bridge: 3,
    yasai_stand: 2,
    flower_cluster: 1
  };

  var BUYABLE_LOT_PART_IDS = [
    'cottage_akane', 'cottage_aoi', 'tree_maru', 'well', 'bench',
    'fence', 'flowerbed', 'streetlamp', 'pond_bridge', 'yasai_stand'
  ];

  function isBuyableLotPart(partId) {
    return BUYABLE_LOT_PART_IDS.indexOf(partId) !== -1;
  }

  function buildLots() {
    var lots = [];
    for (var i = 0; i < LOT_COUNT; i++) {
      lots.push({ lotId: 'lot' + (i + 1), partId: null });
    }
    lots[CENTER_LOT_INDEX].partId = 'pono_house';
    lots[STARTER_TREE_LOT_INDEX].partId = 'tree_maru';
    return lots;
  }

  function findLotIndex(state, lotId) {
    if (!state || !Array.isArray(state.lots)) return -1;
    for (var i = 0; i < state.lots.length; i++) {
      if (state.lots[i] && state.lots[i].lotId === lotId) return i;
    }
    return -1;
  }

  /** 新規プレイ状態を生成する (12区画: 家+木を先置き、残り10区画は空)。 */
  function createInitialState() {
    return {
      v: 1,
      harvestSpent: -STARTER_VEGGIE_BALANCE,
      lots: buildLots(),
      owned: {},
      flowers: 0,
      milestoneSeen: { district1: false }
    };
  }

  /** never-negative の利用可能野菜数。将来の代替経済ソースへの移行はここだけ差し替える。 */
  function availableVeggies(state, statTotal) {
    var spent = (state && typeof state.harvestSpent === 'number' && isFinite(state.harvestSpent))
      ? state.harvestSpent : 0;
    var total = (typeof statTotal === 'number' && isFinite(statTotal)) ? statTotal : 0;
    return Math.max(0, total - spent);
  }

  /**
   * 空区画に部品を設置する。占有済み/未知partIdは拒否。
   * storePart で owned に戻された在庫があればそれを優先消費して無償設置し
   * (再配置)、在庫が無ければ通常どおり残高から購入する。これにより owned は
   * 「一度買った部品を配置し直せる」ための実消費経路を持つ。
   */
  function buyAndPlace(state, lotId, partId, statTotal) {
    if (!state || !Array.isArray(state.lots)) return { ok: false, reason: 'invalid_state' };
    var idx = findLotIndex(state, lotId);
    if (idx === -1) return { ok: false, reason: 'unknown_lot' };
    if (state.lots[idx].partId) return { ok: false, reason: 'occupied' };
    if (!isBuyableLotPart(partId)) return { ok: false, reason: 'unknown_part' };

    var owned = state.owned;
    if (owned && typeof owned === 'object' && typeof owned[partId] === 'number' && owned[partId] > 0) {
      owned[partId] -= 1;
      if (owned[partId] <= 0) delete owned[partId];
      state.lots[idx].partId = partId;
      return { ok: true, partId: partId, cost: 0, source: 'owned' };
    }

    var cost = PART_COSTS[partId];
    var balance = availableVeggies(state, statTotal);
    if (balance < cost) return { ok: false, reason: 'insufficient_balance' };

    state.lots[idx].partId = partId;
    state.harvestSpent += cost;
    return { ok: true, partId: partId, cost: cost, source: 'bought' };
  }

  /** 設置済み部品を owned へ戻し区画を空ける。家 (pono_house) は固定のため対象外。 */
  function storePart(state, lotId) {
    if (!state || !Array.isArray(state.lots)) return { ok: false, reason: 'invalid_state' };
    var idx = findLotIndex(state, lotId);
    if (idx === -1) return { ok: false, reason: 'unknown_lot' };
    var partId = state.lots[idx].partId;
    if (!partId) return { ok: false, reason: 'empty' };
    if (partId === 'pono_house') return { ok: false, reason: 'fixed' };

    state.lots[idx].partId = null;
    if (!state.owned || typeof state.owned !== 'object') state.owned = {};
    state.owned[partId] = (state.owned[partId] || 0) + 1;
    return { ok: true, partId: partId };
  }

  /** 道端ミクロスロットを1つ埋める (cost 1)。FLOWER_SLOT_COUNT で頭打ち。 */
  function plantFlower(state, statTotal) {
    if (!state || typeof state.flowers !== 'number') return { ok: false, reason: 'invalid_state' };
    if (state.flowers >= FLOWER_SLOT_COUNT) return { ok: false, reason: 'full' };

    var cost = PART_COSTS.flower_cluster;
    var balance = availableVeggies(state, statTotal);
    if (balance < cost) return { ok: false, reason: 'insufficient_balance' };

    state.flowers += 1;
    state.harvestSpent += cost;
    return { ok: true, flowers: state.flowers };
  }

  /** 12/12 到達を milestoneSeen.district1 で一度だけ検出する。 */
  function milestoneReached(state) {
    if (!state || !Array.isArray(state.lots) || !state.milestoneSeen ||
      typeof state.milestoneSeen !== 'object') return false;
    if (state.milestoneSeen.district1) return false;
    for (var i = 0; i < state.lots.length; i++) {
      if (!state.lots[i] || !state.lots[i].partId) return false;
    }
    state.milestoneSeen.district1 = true;
    return true;
  }

  /**
   * localStorage から読み込んだ生データ (壊れたJSON/null/未知フィールド/
   * 型不一致など) を、クラッシュせず妥当な state に正規化する (セーブ復元耐性)。
   * 中央区画 (CENTER_LOT_ID) は常に pono_house に強制し、部品IDは既知のものだけ通す。
   */
  function normalizeState(raw) {
    var out = createInitialState();
    if (!raw || typeof raw !== 'object') return out;

    if (typeof raw.harvestSpent === 'number' && isFinite(raw.harvestSpent)) {
      out.harvestSpent = raw.harvestSpent;
    }

    if (Array.isArray(raw.lots)) {
      for (var i = 0; i < LOT_COUNT; i++) {
        var rawLot = raw.lots[i];
        var partId = null;
        if (rawLot && typeof rawLot === 'object' && typeof rawLot.partId === 'string') {
          if (i !== CENTER_LOT_INDEX && isBuyableLotPart(rawLot.partId)) {
            partId = rawLot.partId;
          }
        }
        out.lots[i].partId = partId;
      }
    }
    out.lots[CENTER_LOT_INDEX].partId = 'pono_house';

    if (raw.owned && typeof raw.owned === 'object' && !Array.isArray(raw.owned)) {
      var owned = {};
      for (var pid in raw.owned) {
        if (!Object.prototype.hasOwnProperty.call(raw.owned, pid)) continue;
        if (!isBuyableLotPart(pid)) continue;
        var count = raw.owned[pid];
        if (typeof count === 'number' && isFinite(count) && count > 0) {
          owned[pid] = Math.floor(count);
        }
      }
      out.owned = owned;
    }

    if (typeof raw.flowers === 'number' && isFinite(raw.flowers)) {
      out.flowers = Math.max(0, Math.min(FLOWER_SLOT_COUNT, Math.floor(raw.flowers)));
    }

    if (raw.milestoneSeen && typeof raw.milestoneSeen === 'object') {
      out.milestoneSeen.district1 = !!raw.milestoneSeen.district1;
    }

    return out;
  }

  var api = {
    getNow: getNow,
    setNowForTest: setNowForTest,
    isEvening: isEvening,
    LOT_COUNT: LOT_COUNT,
    FLOWER_SLOT_COUNT: FLOWER_SLOT_COUNT,
    STARTER_VEGGIE_BALANCE: STARTER_VEGGIE_BALANCE,
    CENTER_LOT_ID: CENTER_LOT_ID,
    STARTER_TREE_LOT_ID: STARTER_TREE_LOT_ID,
    PART_COSTS: PART_COSTS,
    BUYABLE_LOT_PART_IDS: BUYABLE_LOT_PART_IDS,
    createInitialState: createInitialState,
    normalizeState: normalizeState,
    availableVeggies: availableVeggies,
    buyAndPlace: buyAndPlace,
    storePart: storePart,
    plantFlower: plantFlower,
    milestoneReached: milestoneReached
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.MachiLogic = api;
  }
})();
