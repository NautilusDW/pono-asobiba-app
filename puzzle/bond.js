// PonoBond — なかよし度メーターの localStorage 管理モジュール。
// 「もりのなかよし」MVP のステート層。main.js より先に読み込むこと。
//
// Storage keys (prefix: 'pono_bond_'):
//   pono_bond_<partnerId>_<stageId>   - ハート累積数 (Number)
//   pono_bond_total_<partnerId>       - 全ステージ合計ハート (Number, cache)
//   pono_bond_selected                - 現在選択中のパートナーID
//   pono_bond_fukurou_unlocked        - フクロウ解禁フラグ ('1')
//
// Public API:
//   addHeart(partnerId, stageId) -> { hearts, level, leveledUp }
//   getLevel(partnerId, stageId) -> 0|1|2|3
//   getHearts(partnerId, stageId) -> Number
//   getTotal(partnerId) -> Number
//   setSelectedPartner(partnerId), clearSelectedPartner(), getSelectedPartner()
//   isFukurouUnlocked(), markFukurouUnlock()
//   getAllBonds() -> { partnerId: { stageId: hearts } }
//   LEVEL_THRESHOLDS                  - [0, 1, 3, 7]
window.PonoBond = (function () {
  'use strict';

  var PREFIX = 'pono_bond_';
  var KEY_SELECTED = PREFIX + 'selected';
  var KEY_FUKUROU = PREFIX + 'fukurou_unlocked';
  var LEVEL_THRESHOLDS = [0, 1, 3, 7];

  // localStorage 不可環境のフォールバック (Safari private mode 等)
  var memStore = {};
  var lsAvailable = (function () {
    try {
      var k = '__pono_bond_probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (_) {
      console.warn('[PonoBond] localStorage unavailable — using in-memory fallback');
      return false;
    }
  })();

  /** 生 get (null 許容) */
  function rawGet(key) {
    if (lsAvailable) {
      try { return window.localStorage.getItem(key); } catch (_) { return null; }
    }
    return Object.prototype.hasOwnProperty.call(memStore, key) ? memStore[key] : null;
  }

  /** 生 set */
  function rawSet(key, val) {
    if (lsAvailable) {
      try { window.localStorage.setItem(key, val); return; } catch (_) { /* fall through */ }
    }
    memStore[key] = String(val);
  }

  /** 生 remove */
  function rawRemove(key) {
    if (lsAvailable) {
      try { window.localStorage.removeItem(key); return; } catch (_) { /* fall through */ }
    }
    delete memStore[key];
  }

  /** 数値 parse (失敗時 0) */
  function readNumber(key) {
    var raw = rawGet(key);
    if (raw == null) return 0;
    var n = parseInt(raw, 10);
    return isFinite(n) && n >= 0 ? n : 0;
  }

  /** ハート数 -> Lv (0/1/2/3) */
  function heartsToLevel(hearts) {
    if (hearts >= LEVEL_THRESHOLDS[3]) return 3;
    if (hearts >= LEVEL_THRESHOLDS[2]) return 2;
    if (hearts >= LEVEL_THRESHOLDS[1]) return 1;
    return 0;
  }

  /**
   * stageId 正規化: number | string | null → 有効な正の整数 or null
   * 任意の type を受けるが、内部ストレージ key は常に整数文字列に揃える。
   */
  function normalizeStageId(stageId) {
    if (stageId == null) return null;
    var n = parseInt(stageId, 10);
    if (!isFinite(n) || n <= 0) return null;
    return n;
  }

  /**
   * partnerId が有効か (空でない文字列であり、登録済みパートナーである) を判定。
   * window.PonoPartners が未ロードの場合は型チェックのみ通す (テスト互換性)。
   */
  function isValidPartnerId(partnerId) {
    if (!partnerId || typeof partnerId !== 'string') return false;
    if (window.PonoPartners && typeof window.PonoPartners.get === 'function') {
      return !!window.PonoPartners.get(partnerId);
    }
    return true;
  }

  function bondKey(partnerId, stageId) {
    return PREFIX + String(partnerId) + '_' + String(stageId);
  }

  function totalKey(partnerId) {
    return PREFIX + 'total_' + String(partnerId);
  }

  /** ステージクリア時にハート +1 (戻り値: { hearts, level, leveledUp }) */
  function addHeart(partnerId, stageId) {
    var sid = normalizeStageId(stageId);
    if (!isValidPartnerId(partnerId) || sid == null) {
      try {
        console.warn('[PonoBond] addHeart: invalid partnerId or stageId',
          { partnerId: partnerId, stageId: stageId });
      } catch (_) { /* noop */ }
      return { hearts: 0, level: 0, leveledUp: false };
    }
    var key = bondKey(partnerId, sid);
    var before = readNumber(key);
    var after = before + 1;
    rawSet(key, String(after));
    var totalK = totalKey(partnerId);
    rawSet(totalK, String(readNumber(totalK) + 1));
    var prevLevel = heartsToLevel(before);
    var nextLevel = heartsToLevel(after);
    return {
      hearts: after,
      level: nextLevel,
      leveledUp: nextLevel > prevLevel,
    };
  }

  /** ステージ別 Lv (0=未プレイ) */
  function getLevel(partnerId, stageId) {
    return heartsToLevel(getHearts(partnerId, stageId));
  }

  /** ステージ別ハート数 */
  function getHearts(partnerId, stageId) {
    var sid = normalizeStageId(stageId);
    if (!isValidPartnerId(partnerId) || sid == null) return 0;
    return readNumber(bondKey(partnerId, sid));
  }

  /** パートナー別 合計ハート */
  function getTotal(partnerId) {
    if (!isValidPartnerId(partnerId)) return 0;
    return readNumber(totalKey(partnerId));
  }

  /** 現在選択中のパートナーIDを保存 */
  function setSelectedPartner(partnerId) {
    if (!isValidPartnerId(partnerId)) {
      try { console.warn('[PonoBond] setSelectedPartner: invalid partnerId', partnerId); } catch (_) {}
      return;
    }
    rawSet(KEY_SELECTED, String(partnerId));
  }

  /** 現在選択中のパートナーを外す */
  function clearSelectedPartner() {
    rawRemove(KEY_SELECTED);
  }

  /** 現在選択中のパートナーID (未設定なら null) */
  function getSelectedPartner() {
    var v = rawGet(KEY_SELECTED);
    return v == null ? null : v;
  }

  /** フクロウ解禁済みか */
  function isFukurouUnlocked() {
    return rawGet(KEY_FUKUROU) === '1';
  }

  /** フクロウ解禁フラグを立てる */
  function markFukurouUnlock() {
    rawSet(KEY_FUKUROU, '1');
  }

  /** 全パートナー×全ステージのハートマップを走査して返す */
  function getAllBonds() {
    var result = {};
    var keys = [];
    if (lsAvailable) {
      try {
        for (var i = 0; i < window.localStorage.length; i++) {
          var k = window.localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0) keys.push(k);
        }
      } catch (_) { /* fall through to mem */ }
    } else {
      for (var mk in memStore) {
        if (Object.prototype.hasOwnProperty.call(memStore, mk)) keys.push(mk);
      }
    }
    for (var j = 0; j < keys.length; j++) {
      var key = keys[j];
      // pono_bond_<partnerId>_<stageId>  (skip total_/selected/fukurou)
      var rest = key.slice(PREFIX.length);
      if (rest.indexOf('total_') === 0) continue;
      if (rest === 'selected' || rest === 'fukurou_unlocked') continue;
      var underscore = rest.lastIndexOf('_');
      if (underscore <= 0) continue;
      var partnerId = rest.slice(0, underscore);
      var stageId = rest.slice(underscore + 1);
      var hearts = readNumber(key);
      if (!result[partnerId]) result[partnerId] = {};
      result[partnerId][stageId] = hearts;
    }
    return result;
  }

  return {
    addHeart: addHeart,
    getLevel: getLevel,
    getHearts: getHearts,
    getTotal: getTotal,
    setSelectedPartner: setSelectedPartner,
    clearSelectedPartner: clearSelectedPartner,
    getSelectedPartner: getSelectedPartner,
    isFukurouUnlocked: isFukurouUnlocked,
    markFukurouUnlock: markFukurouUnlock,
    getAllBonds: getAllBonds,
    LEVEL_THRESHOLDS: LEVEL_THRESHOLDS,
  };
})();
