// ── js/donguri-shop.js ──
// どんぐりショップ: 50 acorns で好きなシール 1 枚購入。
// PonoGameStickers と spendAcorns に依存し、 LS は pono_donguri_shop_v1 のみ書き込み。
(function (window) {
  'use strict';

  var LS_KEY = 'pono_donguri_shop_v1';
  var SCHEMA = 1;
  var COST = 50;

  // ----- catalog cache (resolved once per page-load) -----
  var catalogCache = null;     // [{ id, gameId, name, owned, costAcorns }]
  var stickerIndex = {};       // stickerId -> { gameId, name }

  // ----- persistent store with memory fallback -----
  var memoryStore = null;      // used when localStorage write fails

  function _ls() { return (window && window.localStorage) || null; }

  function _readRecord() {
    if (memoryStore) return memoryStore;
    var ls = _ls();
    if (!ls) return _fresh();
    var raw;
    try { raw = ls.getItem(LS_KEY); } catch (e) { raw = null; }
    if (!raw) return _fresh();
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return _fresh();
      if (parsed.schemaVersion !== SCHEMA) return _fresh();
      if (!Array.isArray(parsed.purchases)) parsed.purchases = [];
      return parsed;
    } catch (e) { return _fresh(); }
  }

  function _fresh() {
    return { schemaVersion: SCHEMA, purchases: [] };
  }

  function _writeRecord(rec) {
    var ls = _ls();
    if (ls && !memoryStore) {
      try { ls.setItem(LS_KEY, JSON.stringify(rec)); return; }
      catch (e) { memoryStore = rec; return; }
    }
    memoryStore = rec;
  }

  function _isoNow() {
    var d = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var off = -d.getTimezoneOffset();
    var sign = off >= 0 ? '+' : '-';
    var oa = Math.abs(off);
    var oh = pad(Math.floor(oa / 60));
    var om = pad(oa % 60);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
      + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
      + sign + oh + ':' + om;
  }

  // ----- catalog build -----
  function _buildCatalog() {
    var stickers = window.PonoGameStickers;
    if (!stickers || typeof stickers.loadCatalog !== 'function') {
      catalogCache = [];
      stickerIndex = {};
      return Promise.resolve(catalogCache);
    }
    return stickers.loadCatalog().then(function (raw) {
      var pages = (raw && raw.pages) || {};
      var unowned = [];
      var owned = [];
      stickerIndex = {};
      Object.keys(pages).forEach(function (gameId) {
        var page = pages[gameId] || {};
        var list = page.stickers || [];
        var ownedDict = {};
        try { ownedDict = stickers.getOwned ? (stickers.getOwned(gameId) || {}) : {}; }
        catch (e) { ownedDict = {}; }
        list.forEach(function (s) {
          if (!s || !s.id) return;
          var isOwned = !!ownedDict[s.id];
          var entry = {
            id: s.id,
            gameId: gameId,
            name: s.name || s.id,
            owned: isOwned,
            costAcorns: COST
          };
          stickerIndex[s.id] = { gameId: gameId, name: entry.name };
          (isOwned ? owned : unowned).push(entry);
        });
      });
      catalogCache = unowned.concat(owned);
      return catalogCache;
    }, function () {
      catalogCache = [];
      stickerIndex = {};
      return catalogCache;
    });
  }

  function getCatalog() {
    return _buildCatalog();
  }

  // ----- queries -----
  function _stickerEntry(stickerId) {
    if (!stickerId) return null;
    return stickerIndex[stickerId] || null;
  }

  function _balance() {
    try { return (typeof window.getAcorns === 'function') ? (window.getAcorns() | 0) : 0; }
    catch (e) { return 0; }
  }

  function canPurchase(stickerId) {
    if (!_stickerEntry(stickerId)) return false;
    return _balance() >= COST;
  }

  // ----- purchase -----
  function purchase(stickerId) {
    var entry = _stickerEntry(stickerId);
    if (!entry) {
      return Promise.resolve({ success: false, reason: 'invalid_sticker' });
    }
    if (_balance() < COST) {
      return Promise.resolve({ success: false, reason: 'insufficient_acorns' });
    }
    var spend = window.spendAcorns;
    if (typeof spend !== 'function' || !spend(COST)) {
      return Promise.resolve({ success: false, reason: 'insufficient_acorns' });
    }
    // どんぐりは引かれた → ここから先で成功扱い (grant 失敗しても購入記録は残す)
    var purchasedAt = _isoNow();
    var rec = _readRecord();
    rec.purchases.push({ stickerId: stickerId, purchasedAt: purchasedAt, costAcorns: COST });
    _writeRecord(rec);

    var stickers = window.PonoGameStickers;
    var grantPromise;
    if (stickers && typeof stickers.grant === 'function') {
      try {
        grantPromise = Promise.resolve(stickers.grant({
          gameId: entry.gameId,
          stickerId: stickerId,
          event: 'donguri_shop',
          show: false
        }));
      } catch (e) {
        grantPromise = Promise.resolve(null);
      }
    } else {
      grantPromise = Promise.resolve(null);
    }
    return grantPromise.then(function (stickerResult) {
      // v1573 phase 6 must-fix #4A: gameId / balanceAfter を detail に含める
      // (play.html celebration listener が gameId/stickerId を必要とするため)
      try {
        var balanceAfter = null;
        try { balanceAfter = (typeof window.getAcorns === 'function') ? (window.getAcorns() | 0) : null; }
        catch (e2) { balanceAfter = null; }
        window.dispatchEvent(new window.CustomEvent('PonoDonguriShopPurchased', {
          detail: {
            gameId: entry.gameId,
            stickerId: stickerId,
            costAcorns: COST,
            balanceAfter: balanceAfter,
            stickerResult: stickerResult
          }
        }));
      } catch (e) { /* older browsers */ }
      // refresh owned flag in catalog cache (best-effort)
      if (catalogCache) {
        for (var i = 0; i < catalogCache.length; i++) {
          if (catalogCache[i].id === stickerId) { catalogCache[i].owned = true; break; }
        }
      }
      return { success: true, stickerResult: stickerResult };
    });
  }

  function getPurchaseHistory() {
    var rec = _readRecord();
    // already oldest-first (push-only), but defensive copy
    return rec.purchases.slice();
  }

  window.PonoDonguriShop = {
    getCatalog: getCatalog,
    canPurchase: canPurchase,
    purchase: purchase,
    getPurchaseHistory: getPurchaseHistory,
    COST_PER_STICKER: COST
  };
})(typeof window !== 'undefined' ? window : this);
