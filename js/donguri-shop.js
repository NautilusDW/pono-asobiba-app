// ── js/donguri-shop.js ──
// どんぐりショップ: 3h x 8 slot ローテーション (JST)。 各スロット 3 枚を重み付き抽選。
// 同じ JST 3h 窓では全クライアント同一 (fnv1a + mulberry32 deterministic seed)。
// In-session lock: getRotation 初回呼び出しでセッション固定。 スロット越え後も同セッション内は据え置き。
// LS: pono_donguri_shop_v1 (購入履歴) + pono_donguri_shop_rotation_v1 (ローテキャッシュ)。
(function (window) {
  'use strict';

  var LS_KEY = 'pono_donguri_shop_v1';
  var LS_ROT = 'pono_donguri_shop_rotation_v1';
  var SCHEMA = 1, ROT_SCHEMA = 1, COST = 50, ROT_SIZE = 3, SLOT_HOURS = 3;

  var catalogCache = null;     // [{ id, gameId, name, owned, costAcorns }]
  var stickerIndex = {};       // stickerId -> { gameId, name }
  var memoryStore = null;      // LS-write-failure fallback for purchases
  var memoryRotation = null;   // LS-write-failure fallback for rotation
  var _currentRotation = null; // in-session lock

  function _ls() { return (window && window.localStorage) || null; }

  // ----- time helpers (JST, mirroring daily-quest.js) -----
  function _nowMs() {
    if (typeof window.__PonoDonguriShopNow === 'function') {
      try { return window.__PonoDonguriShopNow(); } catch (e) {}
    }
    return Date.now();
  }
  function _jstNow() { return new Date(_nowMs() + 9 * 3600 * 1000); }
  function _pad2(n) { return (n < 10 ? '0' : '') + n; }
  function _todayKeyJST() {
    var j = _jstNow();
    return j.getUTCFullYear() + '-' + _pad2(j.getUTCMonth() + 1) + '-' + _pad2(j.getUTCDate());
  }
  function _slotIdJST() { return Math.floor(_jstNow().getUTCHours() / SLOT_HOURS); }
  function _shopKey() { return _todayKeyJST() + ':' + _slotIdJST(); }

  function _fnv1aHash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function _mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ----- purchases persistent record -----
  function _fresh() { return { schemaVersion: SCHEMA, purchases: [] }; }
  function _readRecord() {
    if (memoryStore) return memoryStore;
    var ls = _ls(); if (!ls) return _fresh();
    var raw; try { raw = ls.getItem(LS_KEY); } catch (e) { raw = null; }
    if (!raw) return _fresh();
    try {
      var p = JSON.parse(raw);
      if (!p || typeof p !== 'object' || p.schemaVersion !== SCHEMA) return _fresh();
      if (!Array.isArray(p.purchases)) p.purchases = [];
      return p;
    } catch (e) { return _fresh(); }
  }
  function _writeRecord(rec) {
    var ls = _ls();
    if (ls && !memoryStore) {
      try { ls.setItem(LS_KEY, JSON.stringify(rec)); return; }
      catch (e) { memoryStore = rec; return; }
    }
    memoryStore = rec;
  }

  // ----- rotation persistent record -----
  function _readRotLS() {
    if (memoryRotation) return memoryRotation;
    var ls = _ls(); if (!ls) return null;
    var raw; try { raw = ls.getItem(LS_ROT); } catch (e) { raw = null; }
    if (!raw) return null;
    try {
      var p = JSON.parse(raw);
      if (!p || typeof p !== 'object' || p.schemaVersion !== ROT_SCHEMA) return null;
      if (typeof p.shopKey !== 'string' || !Array.isArray(p.stickerIds)) return null;
      if (!Array.isArray(p.prevStickerIds)) p.prevStickerIds = [];
      return p;
    } catch (e) { return null; }
  }
  function _writeRotLS(rot) {
    var payload = {
      schemaVersion: ROT_SCHEMA,
      shopKey: rot.shopKey,
      stickerIds: rot.stickerIds.slice(),
      prevStickerIds: rot.prevStickerIds.slice(),
      generatedAt: rot.generatedAt
    };
    var ls = _ls();
    if (ls && !memoryRotation) {
      try { ls.setItem(LS_ROT, JSON.stringify(payload)); return; }
      catch (e) { memoryRotation = payload; return; }
    }
    memoryRotation = payload;
  }

  function _isoNow() {
    var d = new Date(_nowMs());
    var pad = _pad2;
    var off = -d.getTimezoneOffset();
    var sign = off >= 0 ? '+' : '-';
    var oa = Math.abs(off);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
      + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
      + sign + pad(Math.floor(oa / 60)) + ':' + pad(oa % 60);
  }

  // ----- catalog build (full pool; rotation picks from this) -----
  function _buildCatalog() {
    var stickers = window.PonoGameStickers;
    if (!stickers || typeof stickers.loadCatalog !== 'function') {
      catalogCache = []; stickerIndex = {};
      return Promise.resolve(catalogCache);
    }
    return stickers.loadCatalog().then(function (raw) {
      var pages = (raw && raw.pages) || {};
      var unowned = [], owned = [];
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
          var entry = { id: s.id, gameId: gameId, name: s.name || s.id, owned: isOwned, costAcorns: COST };
          stickerIndex[s.id] = { gameId: gameId, name: entry.name };
          (isOwned ? owned : unowned).push(entry);
        });
      });
      catalogCache = unowned.concat(owned);
      return catalogCache;
    }, function () { catalogCache = []; stickerIndex = {}; return catalogCache; });
  }
  // Backward compat: getCatalog returns full pool (rotation via getRotation()).
  function getCatalog() { return _buildCatalog(); }

  // ----- weighted pick (3 distinct, seeded by shopKey) -----
  function _pickRotation(shopKey) {
    var pool = (catalogCache || []).slice();
    var total = pool.length;
    if (total === 0) return [];
    var ownedN = 0;
    for (var i = 0; i < total; i++) if (pool[i].owned) ownedN++;
    var r = ownedN / total;
    // weight[unowned] = (1 + r) * (1 + ownedN): スケールが完成度に比例して急騰し、
    // 残り少ない非所持シールが必ず近いうちにローテに登場するピティ機構
    var pity = 1 + ownedN;
    var weights = pool.map(function (e) { return e.owned ? 0.3 : (1 + r) * pity; });
    var rng = _mulberry32(_fnv1aHash(shopKey));
    rng(); // discard first (mulberry32 low-entropy bias)
    var picks = [];
    var size = Math.min(ROT_SIZE, total);
    for (var n = 0; n < size; n++) {
      var sum = 0;
      for (var k = 0; k < pool.length; k++) sum += weights[k];
      if (sum <= 0) { for (var k2 = 0; k2 < pool.length; k2++) weights[k2] = 1; sum = pool.length; }
      var roll = rng() * sum;
      var acc = 0, chosen = pool.length - 1;
      for (var j = 0; j < pool.length; j++) {
        acc += weights[j];
        if (roll < acc) { chosen = j; break; }
      }
      picks.push(pool[chosen].id);
      pool.splice(chosen, 1);
      weights.splice(chosen, 1);
    }
    return picks;
  }

  function _cloneRot(r) {
    return {
      shopKey: r.shopKey,
      stickerIds: r.stickerIds.slice(),
      prevStickerIds: r.prevStickerIds.slice(),
      generatedAt: r.generatedAt
    };
  }

  function getRotation() {
    var shopKey = _shopKey();
    if (_currentRotation) return _cloneRot(_currentRotation);
    var ls = _readRotLS();
    if (ls && ls.shopKey === shopKey) {
      _currentRotation = {
        shopKey: ls.shopKey, stickerIds: ls.stickerIds.slice(),
        prevStickerIds: ls.prevStickerIds.slice(), generatedAt: ls.generatedAt
      };
      return _cloneRot(_currentRotation);
    }
    var prev = (ls && Array.isArray(ls.stickerIds)) ? ls.stickerIds.slice() : [];
    var picks = _pickRotation(shopKey);
    _currentRotation = { shopKey: shopKey, stickerIds: picks, prevStickerIds: prev, generatedAt: _isoNow() };
    _writeRotLS(_currentRotation);
    return _cloneRot(_currentRotation);
  }

  function isNew(stickerId) {
    if (!stickerId) return false;
    var r = getRotation();
    if (r.stickerIds.indexOf(stickerId) < 0) return false;
    // v1588 NTH1: 初回 rotation (prev 空) は誰も「あたらしい！」 にしない (= isAlwaysNew 錯覚を防止)
    if (!r.prevStickerIds || r.prevStickerIds.length === 0) return false;
    return r.prevStickerIds.indexOf(stickerId) < 0;
  }

  function getSlotTimeUntilNext() {
    var j = _jstNow();
    var nextHour = (Math.floor(j.getUTCHours() / SLOT_HOURS) + 1) * SLOT_HOURS;
    var nextJst = new Date(Date.UTC(j.getUTCFullYear(), j.getUTCMonth(), j.getUTCDate(), nextHour, 0, 0, 0));
    var delta = nextJst.getTime() - j.getTime();
    if (delta < 0) delta += 86400000;
    return { nextSlotJST: nextJst, hoursRemaining: delta / 3600000 };
  }

  function getOwnershipState(stickerId) {
    var entry = null;
    for (var i = 0; catalogCache && i < catalogCache.length; i++) {
      if (catalogCache[i].id === stickerId) { entry = catalogCache[i]; break; }
    }
    if (!entry) return { owned: false, count: 0 };
    var count = 0;
    var stickers = window.PonoGameStickers;
    try {
      if (stickers && typeof stickers.getOwned === 'function') {
        var dict = stickers.getOwned(entry.gameId) || {};
        var rec = dict[stickerId];
        if (rec && typeof rec === 'object' && typeof rec.count === 'number') count = rec.count;
        else if (rec) count = 1;
      }
    } catch (e) { count = entry.owned ? 1 : 0; }
    return { owned: !!entry.owned || count > 0, count: count };
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
  function _isInRotation(stickerId) { return getRotation().stickerIds.indexOf(stickerId) >= 0; }

  function canPurchase(stickerId) {
    if (!_stickerEntry(stickerId)) return false;
    if (!_isInRotation(stickerId)) return false;
    if (getOwnershipState(stickerId).owned) return false; // 「もう なかよし♪」 UX
    return _balance() >= COST;
  }

  function purchase(stickerId) {
    var entry = _stickerEntry(stickerId);
    if (!entry) return Promise.resolve({ success: false, reason: 'invalid_sticker' });
    if (!_isInRotation(stickerId)) return Promise.resolve({ success: false, reason: 'not_in_rotation' });
    if (_balance() < COST) return Promise.resolve({ success: false, reason: 'insufficient_acorns' });
    var spend = window.spendAcorns;
    if (typeof spend !== 'function' || !spend(COST)) {
      return Promise.resolve({ success: false, reason: 'insufficient_acorns' });
    }
    var purchasedAt = _isoNow();
    var rec = _readRecord();
    rec.purchases.push({ stickerId: stickerId, purchasedAt: purchasedAt, costAcorns: COST });
    _writeRecord(rec);

    var stickers = window.PonoGameStickers;
    var grantPromise;
    if (stickers && typeof stickers.grant === 'function') {
      try {
        grantPromise = Promise.resolve(stickers.grant({
          gameId: entry.gameId, stickerId: stickerId, event: 'donguri_shop', show: false
        }));
      } catch (e) { grantPromise = Promise.resolve(null); }
    } else { grantPromise = Promise.resolve(null); }
    return grantPromise.then(function (stickerResult) {
      try {
        var balanceAfter = null;
        try { balanceAfter = (typeof window.getAcorns === 'function') ? (window.getAcorns() | 0) : null; }
        catch (e2) { balanceAfter = null; }
        window.dispatchEvent(new window.CustomEvent('PonoDonguriShopPurchased', {
          detail: {
            gameId: entry.gameId, stickerId: stickerId, costAcorns: COST,
            balanceAfter: balanceAfter, stickerResult: stickerResult
          }
        }));
      } catch (e) {}
      if (catalogCache) {
        for (var i = 0; i < catalogCache.length; i++) {
          if (catalogCache[i].id === stickerId) { catalogCache[i].owned = true; break; }
        }
      }
      return { success: true, stickerResult: stickerResult };
    });
  }

  function getPurchaseHistory() { return _readRecord().purchases.slice(); }

  // ----- test hooks -----
  function __resetRotationLock() { _currentRotation = null; }
  function __clearRotationStore() {
    memoryRotation = null;
    var ls = _ls();
    if (ls) { try { ls.removeItem(LS_ROT); } catch (e) {} }
  }

  window.PonoDonguriShop = {
    getCatalog: getCatalog,
    getRotation: getRotation,
    isNew: isNew,
    getSlotTimeUntilNext: getSlotTimeUntilNext,
    getOwnershipState: getOwnershipState,
    canPurchase: canPurchase,
    purchase: purchase,
    getPurchaseHistory: getPurchaseHistory,
    COST_PER_STICKER: COST,
    __resetRotationLock: __resetRotationLock,
    __clearRotationStore: __clearRotationStore
  };
})(typeof window !== 'undefined' ? window : this);
