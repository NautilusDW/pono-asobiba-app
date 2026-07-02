// ── js/donguri-shop.js ──
// どんぐりショップ: JST 朝/夕の 1日2回ローテーション。3枠のうち1枠は未所持確定。
// 同じ JST 窓では全クライアント同一 (fnv1a + mulberry32 deterministic seed)。
// LS: pono_donguri_shop_v1 (購入履歴) + pono_donguri_shop_rotation_v1 (ローテキャッシュ)
//   + pono_donguri_shop_reservation_v1 (取り置き1件)。
(function (window) {
  'use strict';

  var LS_KEY = 'pono_donguri_shop_v1';
  var LS_ROT = 'pono_donguri_shop_rotation_v1';
  var LS_RESERVE = 'pono_donguri_shop_reservation_v1';
  var SCHEMA = 1, ROT_SCHEMA = 2, RESERVE_SCHEMA = 1, ROT_SIZE = 3;
  var PRICE_BY_RARITY = { normal: 15, rare: 25, super: 35 };
  var DEFAULT_COST = PRICE_BY_RARITY.normal;
  var MORNING_HOUR = 6, EVENING_HOUR = 18;

  var catalogCache = null;       // [{ id, gameId, name, owned, count, rarity, costAcorns }]
  var stickerIndex = {};         // stickerId -> { gameId, name, rarity }
  var memoryStore = null;        // LS-write-failure fallback for purchases
  var memoryRotation = null;     // LS-write-failure fallback for rotation
  var memoryReservation = null;  // LS-write-failure fallback for reservation
  var _currentRotation = null;   // per-current-shopKey in-session cache

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
  function _dateKeyFromJSTDate(d) {
    return d.getUTCFullYear() + '-' + _pad2(d.getUTCMonth() + 1) + '-' + _pad2(d.getUTCDate());
  }
  function _todayKeyJST() { return _dateKeyFromJSTDate(_jstNow()); }
  function _addJstDays(d, days) {
    return new Date(Date.UTC(
      d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days,
      d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()
    ));
  }
  function _periodInfoJST() {
    var j = _jstNow();
    var h = j.getUTCHours();
    var date = j;
    var period = 'morning';
    var next;
    if (h < MORNING_HOUR) {
      date = _addJstDays(j, -1);
      period = 'evening';
      next = new Date(Date.UTC(j.getUTCFullYear(), j.getUTCMonth(), j.getUTCDate(), MORNING_HOUR, 0, 0, 0));
    } else if (h < EVENING_HOUR) {
      period = 'morning';
      next = new Date(Date.UTC(j.getUTCFullYear(), j.getUTCMonth(), j.getUTCDate(), EVENING_HOUR, 0, 0, 0));
    } else {
      period = 'evening';
      next = new Date(Date.UTC(j.getUTCFullYear(), j.getUTCMonth(), j.getUTCDate() + 1, MORNING_HOUR, 0, 0, 0));
    }
    return {
      dateKey: _dateKeyFromJSTDate(date),
      period: period,
      shopKey: _dateKeyFromJSTDate(date) + ':' + period,
      nextSlotJST: next
    };
  }
  function _shopKey() { return _periodInfoJST().shopKey; }

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
  function _normalizeRarity(rarity) {
    if (rarity === 'super' || rarity === 'rare' || rarity === 'normal') return rarity;
    return 'normal';
  }
  function _priceForRarity(rarity) {
    return PRICE_BY_RARITY[_normalizeRarity(rarity)] || DEFAULT_COST;
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
      if (typeof p.guaranteedStickerId !== 'string') p.guaranteedStickerId = '';
      return p;
    } catch (e) { return null; }
  }
  function _writeRotLS(rot) {
    var payload = {
      schemaVersion: ROT_SCHEMA,
      shopKey: rot.shopKey,
      stickerIds: rot.stickerIds.slice(),
      prevStickerIds: rot.prevStickerIds.slice(),
      guaranteedStickerId: rot.guaranteedStickerId || '',
      generatedAt: rot.generatedAt
    };
    var ls = _ls();
    if (ls && !memoryRotation) {
      try { ls.setItem(LS_ROT, JSON.stringify(payload)); return; }
      catch (e) { memoryRotation = payload; return; }
    }
    memoryRotation = payload;
  }

  // ----- reservation persistent record -----
  function _freshReservation() {
    return { schemaVersion: RESERVE_SCHEMA, stickerId: '', reservedAt: '', sourceShopKey: '' };
  }
  function _readReservationRaw() {
    if (memoryReservation) return memoryReservation;
    var ls = _ls(); if (!ls) return _freshReservation();
    var raw; try { raw = ls.getItem(LS_RESERVE); } catch (e) { raw = null; }
    if (!raw) return _freshReservation();
    try {
      var p = JSON.parse(raw);
      if (!p || typeof p !== 'object' || p.schemaVersion !== RESERVE_SCHEMA) return _freshReservation();
      if (typeof p.stickerId !== 'string') p.stickerId = '';
      if (typeof p.reservedAt !== 'string') p.reservedAt = '';
      if (typeof p.sourceShopKey !== 'string') p.sourceShopKey = '';
      return p;
    } catch (e) { return _freshReservation(); }
  }
  function _writeReservationRaw(rec) {
    var payload = {
      schemaVersion: RESERVE_SCHEMA,
      stickerId: rec && rec.stickerId ? String(rec.stickerId) : '',
      reservedAt: rec && rec.reservedAt ? String(rec.reservedAt) : '',
      sourceShopKey: rec && rec.sourceShopKey ? String(rec.sourceShopKey) : ''
    };
    var ls = _ls();
    if (ls && !memoryReservation) {
      try {
        if (payload.stickerId) ls.setItem(LS_RESERVE, JSON.stringify(payload));
        else ls.removeItem(LS_RESERVE);
        return;
      } catch (e) { memoryReservation = payload; return; }
    }
    memoryReservation = payload;
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
        if (page.bookOnly) return;
        var list = page.stickers || [];
        var ownedDict = {};
        try { ownedDict = stickers.getOwned ? (stickers.getOwned(gameId) || {}) : {}; }
        catch (e) { ownedDict = {}; }
        list.forEach(function (s) {
          if (!s || !s.id) return;
          var rec = ownedDict[s.id];
          var count = rec && typeof rec === 'object' && typeof rec.count === 'number' ? rec.count : (rec ? 1 : 0);
          var isOwned = count > 0;
          var rarity = _normalizeRarity(s.rarity || 'normal');
          var entry = {
            id: s.id,
            gameId: gameId,
            name: s.name || s.id,
            owned: isOwned,
            count: count,
            rarity: rarity,
            costAcorns: _priceForRarity(rarity)
          };
          stickerIndex[s.id] = { gameId: gameId, name: entry.name, rarity: entry.rarity, costAcorns: entry.costAcorns };
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
  function _summary(pool) {
    var out = { total: pool.length, owned: 0, byGame: {}, byRarity: {} };
    pool.forEach(function (e) {
      if (e.owned) out.owned++;
      var g = out.byGame[e.gameId] || (out.byGame[e.gameId] = { total: 0, owned: 0 });
      g.total++;
      if (e.owned) g.owned++;
      var r = out.byRarity[e.rarity] || (out.byRarity[e.rarity] = { total: 0, owned: 0 });
      r.total++;
      if (e.owned) r.owned++;
    });
    return out;
  }
  function _rarityBase(rarity) {
    if (rarity === 'super') return 0.24;
    if (rarity === 'rare') return 0.58;
    return 1;
  }
  function _entryWeight(entry, summary, mode) {
    var ownedRatio = summary.total ? summary.owned / summary.total : 0;
    var game = summary.byGame[entry.gameId] || { total: 1, owned: 0 };
    var rarity = summary.byRarity[entry.rarity] || { total: 1, owned: 0 };
    var gameRatio = game.total ? game.owned / game.total : 0;
    var rarityRatio = rarity.total ? rarity.owned / rarity.total : 0;
    if (entry.owned) {
      var count = Math.max(1, entry.count || 1);
      return 0.11 * _rarityBase(entry.rarity) / Math.min(5, count + 1);
    }
    var weight = _rarityBase(entry.rarity);
    weight *= 1 + Math.min(1.4, ownedRatio * 1.35);
    weight *= 1 + Math.min(0.75, gameRatio * 0.75);
    weight *= 1 + Math.min(0.45, rarityRatio * 0.45);
    if (mode === 'guaranteed') weight *= 1.25;
    return Math.max(0.01, weight);
  }
  function _weightedEntry(pool, rng, summary, mode) {
    if (!pool.length) return null;
    var weights = pool.map(function (e) { return _entryWeight(e, summary, mode); });
    var sum = 0;
    for (var i = 0; i < weights.length; i++) sum += weights[i];
    if (sum <= 0) return pool[Math.floor(rng() * pool.length) % pool.length];
    var roll = rng() * sum;
    var acc = 0;
    for (var j = 0; j < pool.length; j++) {
      acc += weights[j];
      if (roll < acc) return pool[j];
    }
    return pool[pool.length - 1];
  }
  function _pickRotation(shopKey) {
    var all = (catalogCache || []).slice();
    if (!all.length) return { stickerIds: [], guaranteedStickerId: '' };
    var summary = _summary(all);
    var reserved = _readReservationRaw();
    var reservedId = reserved && reserved.stickerId ? reserved.stickerId : '';
    var rng = _mulberry32(_fnv1aHash(shopKey));
    rng(); // discard first (mulberry32 low-entropy bias)

    var picks = [];
    var guaranteedPool = all.filter(function (e) { return !e.owned && e.id !== reservedId; });
    if (!guaranteedPool.length) guaranteedPool = all.filter(function (e) { return !e.owned; });
    var guaranteed = _weightedEntry(guaranteedPool.length ? guaranteedPool : all, rng, summary, 'guaranteed');
    var guaranteedId = guaranteed ? guaranteed.id : '';
    if (guaranteedId) picks.push(guaranteedId);

    while (picks.length < Math.min(ROT_SIZE, all.length)) {
      var pool = all.filter(function (e) {
        return picks.indexOf(e.id) < 0 && e.id !== reservedId;
      });
      if (!pool.length) pool = all.filter(function (e) { return picks.indexOf(e.id) < 0; });
      var next = _weightedEntry(pool, rng, summary, 'random');
      if (!next) break;
      picks.push(next.id);
    }
    return { stickerIds: picks, guaranteedStickerId: guaranteedId };
  }

  function _cloneRot(r) {
    return {
      shopKey: r.shopKey,
      stickerIds: r.stickerIds.slice(),
      prevStickerIds: r.prevStickerIds.slice(),
      guaranteedStickerId: r.guaranteedStickerId || '',
      generatedAt: r.generatedAt
    };
  }

  function getRotation() {
    var shopKey = _shopKey();
    if (_currentRotation && _currentRotation.shopKey === shopKey) return _cloneRot(_currentRotation);
    var ls = _readRotLS();
    if (ls && ls.shopKey === shopKey) {
      _currentRotation = {
        shopKey: ls.shopKey,
        stickerIds: ls.stickerIds.slice(),
        prevStickerIds: ls.prevStickerIds.slice(),
        guaranteedStickerId: ls.guaranteedStickerId || '',
        generatedAt: ls.generatedAt
      };
      return _cloneRot(_currentRotation);
    }
    var prev = (ls && Array.isArray(ls.stickerIds)) ? ls.stickerIds.slice() : [];
    var picked = _pickRotation(shopKey);
    _currentRotation = {
      shopKey: shopKey,
      stickerIds: picked.stickerIds,
      prevStickerIds: prev,
      guaranteedStickerId: picked.guaranteedStickerId || '',
      generatedAt: _isoNow()
    };
    _writeRotLS(_currentRotation);
    return _cloneRot(_currentRotation);
  }

  function isNew(stickerId) {
    if (!stickerId) return false;
    return getRotation().guaranteedStickerId === stickerId;
  }
  function isGuaranteed(stickerId) { return isNew(stickerId); }

  function getSlotTimeUntilNext() {
    var j = _jstNow();
    var info = _periodInfoJST();
    var nextJst = info.nextSlotJST;
    var delta = nextJst.getTime() - j.getTime();
    if (delta < 0) delta += 86400000;
    return { nextSlotJST: nextJst, hoursRemaining: delta / 3600000, period: info.period, shopKey: info.shopKey };
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
  function getPrice(stickerId) {
    var entry = _stickerEntry(stickerId);
    return entry && entry.costAcorns ? entry.costAcorns : DEFAULT_COST;
  }
  function _balance() {
    try { return (typeof window.getAcorns === 'function') ? (window.getAcorns() | 0) : 0; }
    catch (e) { return 0; }
  }
  function _isInRotation(stickerId) { return getRotation().stickerIds.indexOf(stickerId) >= 0; }
  function _reservationMatches(stickerId) {
    var r = _readReservationRaw();
    return !!(stickerId && r && r.stickerId === stickerId);
  }

  function getReservation() {
    var r = _readReservationRaw();
    if (!r || !r.stickerId) return null;
    var state = getOwnershipState(r.stickerId);
    if (state && state.owned) {
      _writeReservationRaw(_freshReservation());
      return null;
    }
    return { stickerId: r.stickerId, reservedAt: r.reservedAt, sourceShopKey: r.sourceShopKey };
  }
  function isReserved(stickerId) {
    var r = getReservation();
    return !!(stickerId && r && r.stickerId === stickerId);
  }
  function canReserve(stickerId) {
    if (!_stickerEntry(stickerId)) return false;
    if (!isGuaranteed(stickerId)) return false;
    if (getOwnershipState(stickerId).owned) return false;
    var current = getReservation();
    return !current || current.stickerId === stickerId;
  }
  function reserve(stickerId) {
    if (!_stickerEntry(stickerId)) return { success: false, reason: 'invalid_sticker' };
    if (!isGuaranteed(stickerId)) return { success: false, reason: 'not_guaranteed' };
    if (getOwnershipState(stickerId).owned) return { success: false, reason: 'already_owned' };
    var current = getReservation();
    if (current && current.stickerId && current.stickerId !== stickerId) {
      return { success: false, reason: 'reservation_full', reservation: current };
    }
    var rec = { schemaVersion: RESERVE_SCHEMA, stickerId: stickerId, reservedAt: _isoNow(), sourceShopKey: _shopKey() };
    _writeReservationRaw(rec);
    return { success: true, reservation: { stickerId: rec.stickerId, reservedAt: rec.reservedAt, sourceShopKey: rec.sourceShopKey } };
  }
  function clearReservation(stickerId) {
    var current = _readReservationRaw();
    if (!current || !current.stickerId) return { success: true };
    if (stickerId && current.stickerId !== stickerId) return { success: false, reason: 'different_reservation' };
    _writeReservationRaw(_freshReservation());
    return { success: true };
  }

  function canPurchase(stickerId) {
    if (!_stickerEntry(stickerId)) return false;
    if (!_isInRotation(stickerId) && !_reservationMatches(stickerId)) return false;
    if (getOwnershipState(stickerId).owned) return false; // 「もう なかよし♪」 UX
    return _balance() >= getPrice(stickerId);
  }

  function purchase(stickerId) {
    var entry = _stickerEntry(stickerId);
    if (!entry) return Promise.resolve({ success: false, reason: 'invalid_sticker' });
    if (!_isInRotation(stickerId) && !_reservationMatches(stickerId)) return Promise.resolve({ success: false, reason: 'not_in_rotation' });
    var cost = getPrice(stickerId);
    if (_balance() < cost) return Promise.resolve({ success: false, reason: 'insufficient_acorns' });
    var spend = window.spendAcorns;
    if (typeof spend !== 'function' || !spend(cost)) {
      return Promise.resolve({ success: false, reason: 'insufficient_acorns' });
    }
    var purchasedAt = _isoNow();
    var rec = _readRecord();
    rec.purchases.push({ stickerId: stickerId, purchasedAt: purchasedAt, costAcorns: cost });
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
            gameId: entry.gameId, stickerId: stickerId, costAcorns: cost,
            balanceAfter: balanceAfter, stickerResult: stickerResult
          }
        }));
      } catch (e) {}
      if (catalogCache) {
        for (var i = 0; i < catalogCache.length; i++) {
          if (catalogCache[i].id === stickerId) { catalogCache[i].owned = true; catalogCache[i].count = Math.max(1, catalogCache[i].count || 0); break; }
        }
      }
      if (_reservationMatches(stickerId)) clearReservation(stickerId);
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
  function __clearReservationStore() {
    memoryReservation = null;
    var ls = _ls();
    if (ls) { try { ls.removeItem(LS_RESERVE); } catch (e) {} }
  }
  // v1897: 購入履歴 (LS_KEY = pono_donguri_shop_v1) を完全に消去。
  // debug board 「シール」 tab の 「お店をリセット」 ボタン用。
  // getCatalog cache は sticker owned flag 再計算のため次呼出時にリセットさせる。
  function __clearPurchaseStore() {
    memoryStore = null;
    catalogCache = null;
    var ls = _ls();
    if (ls) { try { ls.removeItem(LS_KEY); } catch (e) {} }
  }

  window.PonoDonguriShop = {
    getCatalog: getCatalog,
    getRotation: getRotation,
    isNew: isNew,
    isGuaranteed: isGuaranteed,
    getSlotTimeUntilNext: getSlotTimeUntilNext,
    getOwnershipState: getOwnershipState,
    getReservation: getReservation,
    isReserved: isReserved,
    canReserve: canReserve,
    reserve: reserve,
    clearReservation: clearReservation,
    getPrice: getPrice,
    canPurchase: canPurchase,
    purchase: purchase,
    getPurchaseHistory: getPurchaseHistory,
    COST_PER_STICKER: DEFAULT_COST,
    PRICE_BY_RARITY: {
      normal: PRICE_BY_RARITY.normal,
      rare: PRICE_BY_RARITY.rare,
      super: PRICE_BY_RARITY.super
    },
    __resetRotationLock: __resetRotationLock,
    __clearRotationStore: __clearRotationStore,
    __clearReservationStore: __clearReservationStore,
    __clearPurchaseStore: __clearPurchaseStore
  };
})(typeof window !== 'undefined' ? window : this);
