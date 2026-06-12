// PonoBond — もりのなかよしパズル の最小ステート層。
// 仲良し度 (Lv/ハート) は廃止。 残るのは
//   - 選択中パートナー
//   - フクロウ解禁フラグ
//   - ステージごとの「クリア済みフラグ」
// だけ。 数値ハート/Lv の概念は無い。
//
// Storage keys (prefix: 'pono_bond_'):
//   pono_bond_selected                       - 現在選択中のパートナーID
//   pono_bond_fukurou_unlocked               - フクロウ解禁フラグ ('1')
//   pono_bond_cleared_<partnerId>_<stageId>  - パートナー×ステージ クリア済み ('1')
//
// Public API:
//   markCleared(partnerId, stageId)           - クリア記録 (idempotent)
//   isCleared(partnerId, stageId) -> bool     - クリア済みか
//   getClearedCount(partnerId) -> Number      - クリア済みステージ数 (上限 20)
//   getTotal(partnerId) -> Number             - getClearedCount のエイリアス (旧API互換)
//   setSelectedPartner(partnerId), clearSelectedPartner(), getSelectedPartner()
//   isFukurouUnlocked(), markFukurouUnlock()
//   getAllCleared() -> { partnerId: { stageId: 1 } }
window.PonoBond = (function () {
  'use strict';

  var PREFIX = 'pono_bond_';
  var KEY_SELECTED = PREFIX + 'selected';
  var KEY_FUKUROU = PREFIX + 'fukurou_unlocked';
  var KEY_CLEARED_PREFIX = PREFIX + 'cleared_';

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

  function rawGet(key) {
    if (lsAvailable) {
      try { return window.localStorage.getItem(key); } catch (_) { return null; }
    }
    return Object.prototype.hasOwnProperty.call(memStore, key) ? memStore[key] : null;
  }

  function rawSet(key, val) {
    if (lsAvailable) {
      try { window.localStorage.setItem(key, val); return; } catch (_) { /* fall through */ }
    }
    memStore[key] = String(val);
  }

  function rawRemove(key) {
    if (lsAvailable) {
      try { window.localStorage.removeItem(key); return; } catch (_) { /* fall through */ }
    }
    delete memStore[key];
  }

  function normalizeStageId(stageId) {
    if (stageId == null) return null;
    var n = parseInt(stageId, 10);
    if (!isFinite(n) || n <= 0) return null;
    return n;
  }

  function isValidPartnerId(partnerId) {
    if (!partnerId || typeof partnerId !== 'string') return false;
    if (window.PonoPartners && typeof window.PonoPartners.get === 'function') {
      return !!window.PonoPartners.get(partnerId);
    }
    return true;
  }

  function clearedKey(partnerId, stageId) {
    return KEY_CLEARED_PREFIX + String(partnerId) + '_' + String(stageId);
  }

  /** ステージクリア記録 (重複呼び出し安全) */
  function markCleared(partnerId, stageId) {
    var sid = normalizeStageId(stageId);
    if (!isValidPartnerId(partnerId) || sid == null) {
      try {
        console.warn('[PonoBond] markCleared: invalid partnerId or stageId',
          { partnerId: partnerId, stageId: stageId });
      } catch (_) { /* noop */ }
      return false;
    }
    rawSet(clearedKey(partnerId, sid), '1');
    return true;
  }

  /** クリア済みか */
  function isCleared(partnerId, stageId) {
    var sid = normalizeStageId(stageId);
    if (!isValidPartnerId(partnerId) || sid == null) return false;
    return rawGet(clearedKey(partnerId, sid)) === '1';
  }

  /** パートナー別 クリア済みステージ数 */
  function getClearedCount(partnerId) {
    if (!isValidPartnerId(partnerId)) return 0;
    var count = 0;
    var prefix = KEY_CLEARED_PREFIX + String(partnerId) + '_';
    if (lsAvailable) {
      try {
        for (var i = 0; i < window.localStorage.length; i++) {
          var k = window.localStorage.key(i);
          if (k && k.indexOf(prefix) === 0 && window.localStorage.getItem(k) === '1') count++;
        }
      } catch (_) { /* fall through */ }
    } else {
      for (var mk in memStore) {
        if (Object.prototype.hasOwnProperty.call(memStore, mk)
            && mk.indexOf(prefix) === 0 && memStore[mk] === '1') count++;
      }
    }
    return count;
  }

  /** 旧API互換: getTotal は getClearedCount に意味変更 */
  function getTotal(partnerId) {
    return getClearedCount(partnerId);
  }

  function setSelectedPartner(partnerId) {
    if (!isValidPartnerId(partnerId)) {
      try { console.warn('[PonoBond] setSelectedPartner: invalid partnerId', partnerId); } catch (_) {}
      return;
    }
    rawSet(KEY_SELECTED, String(partnerId));
  }

  function clearSelectedPartner() {
    rawRemove(KEY_SELECTED);
  }

  function getSelectedPartner() {
    var v = rawGet(KEY_SELECTED);
    return v == null ? null : v;
  }

  function isFukurouUnlocked() {
    return rawGet(KEY_FUKUROU) === '1';
  }

  function markFukurouUnlock() {
    rawSet(KEY_FUKUROU, '1');
  }

  /** 全パートナー×全ステージのクリア状況を走査して返す */
  function getAllCleared() {
    var result = {};
    var keys = [];
    if (lsAvailable) {
      try {
        for (var i = 0; i < window.localStorage.length; i++) {
          var k = window.localStorage.key(i);
          if (k && k.indexOf(KEY_CLEARED_PREFIX) === 0) keys.push(k);
        }
      } catch (_) { /* fall through to mem */ }
    } else {
      for (var mk in memStore) {
        if (Object.prototype.hasOwnProperty.call(memStore, mk)
            && mk.indexOf(KEY_CLEARED_PREFIX) === 0) keys.push(mk);
      }
    }
    for (var j = 0; j < keys.length; j++) {
      var key = keys[j];
      if (rawGet(key) !== '1') continue;
      // pono_bond_cleared_<partnerId>_<stageId>
      var rest = key.slice(KEY_CLEARED_PREFIX.length);
      var underscore = rest.lastIndexOf('_');
      if (underscore <= 0) continue;
      var partnerId = rest.slice(0, underscore);
      var stageId = rest.slice(underscore + 1);
      if (!result[partnerId]) result[partnerId] = {};
      result[partnerId][stageId] = 1;
    }
    return result;
  }

  return {
    markCleared: markCleared,
    isCleared: isCleared,
    getClearedCount: getClearedCount,
    getTotal: getTotal,
    setSelectedPartner: setSelectedPartner,
    clearSelectedPartner: clearSelectedPartner,
    getSelectedPartner: getSelectedPartner,
    isFukurouUnlocked: isFukurouUnlocked,
    markFukurouUnlock: markFukurouUnlock,
    getAllCleared: getAllCleared,
  };
})();
