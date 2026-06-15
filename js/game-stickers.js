// ── js/game-stickers.js ──
// Mini-game sticker-book rewards. This intentionally does not depend on
// common/stickers.js because that module is for daily-login stickers.
(function () {
  'use strict';

  var LS_STATE = 'pono_game_stickers_v1';
  var LS_PENDING = 'pono_game_sticker_pending_v1';
  var CATALOG_PATH = 'assets/data/game-stickers.json';
  var catalogPromise = null;

  function _scriptSrc() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('game-stickers.js') !== -1) return src;
    }
    return '';
  }

  function _rootPrefix() {
    var src = _scriptSrc();
    if (/^\.\.\//.test(src)) return '../';
    if (/^\//.test(src)) return '/';
    return '';
  }

  function _getJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function _setJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function _state() {
    var state = _getJSON(LS_STATE, null);
    if (!state || typeof state !== 'object') state = {};
    if (!state.pages || typeof state.pages !== 'object') state.pages = {};
    if (!state.version) state.version = 1;
    return state;
  }

  function _saveState(state) {
    state.updatedAt = Date.now();
    _setJSON(LS_STATE, state);
  }

  function _pageState(state, gameId) {
    if (!state.pages[gameId] || typeof state.pages[gameId] !== 'object') {
      state.pages[gameId] = { owned: {} };
    }
    if (!state.pages[gameId].owned || typeof state.pages[gameId].owned !== 'object') {
      state.pages[gameId].owned = {};
    }
    return state.pages[gameId];
  }

  function _catalogUrl() {
    return _rootPrefix() + CATALOG_PATH;
  }

  function _cacheBust(url) {
    return url + (url.indexOf('?') === -1 ? '?' : '&') + '_=' + Date.now();
  }

  function loadCatalog() {
    if (!catalogPromise) {
      catalogPromise = fetch(_cacheBust(_catalogUrl()), { cache: 'no-store' })
        .then(function (res) {
          if (!res.ok) throw new Error('catalog fetch failed: ' + res.status);
          return res.json();
        });
    }
    return catalogPromise;
  }

  function resolveAsset(path) {
    if (!path) return '';
    if (/^(https?:|data:|\/|\.\.?\/)/.test(path)) return path;
    return _rootPrefix() + path;
  }

  function _eventMatches(sticker, eventName) {
    if (!eventName) return true;
    var list = sticker.unlockOn || [];
    return list.indexOf(eventName) !== -1;
  }

  function _findSticker(page, owned, options) {
    var stickers = page.stickers || [];
    if (options.stickerId) {
      for (var i = 0; i < stickers.length; i++) {
        if (stickers[i].id === options.stickerId) return stickers[i];
      }
    }

    var eventName = options.event || options.reason || 'clear';
    var matching = stickers.filter(function (s) { return _eventMatches(s, eventName); });
    if (!matching.length && eventName !== 'clear') {
      matching = stickers.filter(function (s) { return _eventMatches(s, 'clear'); });
    }
    if (!matching.length) matching = stickers.slice();

    for (var j = 0; j < matching.length; j++) {
      if (!owned[matching[j].id]) return matching[j];
    }
    for (var k = 0; k < stickers.length; k++) {
      if (!owned[stickers[k].id]) return stickers[k];
    }

    var best = matching[0] || stickers[0] || null;
    for (var m = 1; m < matching.length; m++) {
      var currentCount = (owned[matching[m].id] && owned[matching[m].id].count) || 0;
      var bestCount = best ? ((owned[best.id] && owned[best.id].count) || 0) : 0;
      if (currentCount < bestCount) best = matching[m];
    }
    return best;
  }

  function _queuePending(result) {
    var pending = _getJSON(LS_PENDING, []);
    if (!Array.isArray(pending)) pending = [];
    pending.push(result);
    _setJSON(LS_PENDING, pending.slice(-12));
  }

  function _dispatch(result) {
    try {
      window.dispatchEvent(new CustomEvent('PonoGameStickerGranted', { detail: result }));
    } catch (e) {}
  }

  function _removeToast() {
    var old = document.getElementById('game-sticker-toast');
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }

  function showStickerToast(result) {
    if (!result || !result.sticker || !document.body) return;
    _removeToast();

    var sticker = result.sticker;
    var page = result.page || {};
    var overlay = document.createElement('div');
    overlay.id = 'game-sticker-toast';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'シールをゲット');
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;',
      'background:rgba(13,20,33,0.42);padding:18px;',
      'font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN","BIZ UDPGothic",sans-serif;',
      'animation:gameStickerFade .18s ease-out;'
    ].join('');

    var accent = page.accent || '#F2915A';
    var box = document.createElement('div');
    box.style.cssText = [
      'width:min(320px,92vw);background:#fff;border-radius:22px;padding:16px 16px 14px;text-align:center;',
      'box-shadow:0 18px 46px rgba(0,0,0,0.28);border:3px solid ' + accent + ';',
      'color:#4A3726;'
    ].join('');

    var media = sticker.img
      ? '<img src="' + resolveAsset(sticker.img) + '" alt="" style="width:108px;height:108px;object-fit:contain;display:block;margin:0 auto 8px;filter:drop-shadow(0 8px 12px rgba(0,0,0,0.18));">'
      : '<div style="font-size:4.2rem;line-height:1;margin-bottom:8px;">' + (sticker.emoji || '⭐') + '</div>';

    var spark = result.count >= 3 ? '<div style="font-size:0.78rem;font-weight:900;color:#D97706;margin-top:2px;">キラキラ ×' + result.count + '</div>' : '';
    box.innerHTML =
      '<div style="font-size:0.82rem;font-weight:900;color:' + accent + ';margin-bottom:6px;">シール ゲット!</div>' +
      media +
      '<div style="font-size:1.05rem;font-weight:900;line-height:1.25;">' + _esc(sticker.name || 'シール') + '</div>' +
      '<div style="font-size:0.74rem;color:#8A7460;margin-top:4px;">' + _esc(page.title || result.gameId || '') + 'のページに はったよ</div>' +
      spark +
      '<div style="display:flex;gap:8px;justify-content:center;margin-top:13px;">' +
      '<button type="button" data-sticker-close style="border:0;border-radius:999px;background:#EEE6DD;color:#5D4E37;font-weight:900;padding:10px 16px;font-family:inherit;">つづける</button>' +
      '<button type="button" data-sticker-book style="border:0;border-radius:999px;background:' + accent + ';color:#fff;font-weight:900;padding:10px 16px;font-family:inherit;">シールちょう</button>' +
      '</div>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var style = document.getElementById('game-sticker-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'game-sticker-style';
      style.textContent = '@keyframes gameStickerFade{from{opacity:0}to{opacity:1}}';
      document.head.appendChild(style);
    }

    function close() { _removeToast(); }
    box.querySelector('[data-sticker-close]').addEventListener('click', close);
    box.querySelector('[data-sticker-book]').addEventListener('click', function () {
      location.href = _rootPrefix() + 'collection/index.html?tab=stickers&game=' + encodeURIComponent(result.gameId);
    });
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) close();
    });
  }

  function _esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function grant(options) {
    options = options || {};
    var gameId = options.gameId;
    if (!gameId) return Promise.resolve(null);

    return loadCatalog().then(function (catalog) {
      var page = catalog && catalog.pages && catalog.pages[gameId];
      if (!page) return null;

      var state = _state();
      var pageState = _pageState(state, gameId);
      var sticker = _findSticker(page, pageState.owned, options);
      if (!sticker || !sticker.id) return null;

      var now = Date.now();
      var current = pageState.owned[sticker.id] || { count: 0, firstAt: now };
      current.count = (current.count || 0) + 1;
      current.lastAt = now;
      current.name = sticker.name || '';
      pageState.owned[sticker.id] = current;
      _saveState(state);

      var result = {
        gameId: gameId,
        stickerId: sticker.id,
        sticker: sticker,
        page: page,
        count: current.count,
        first: current.count === 1,
        event: options.event || options.reason || 'clear',
        ts: now
      };
      _queuePending(result);
      _dispatch(result);
      if (options.show !== false) showStickerToast(result);
      return result;
    }).catch(function (error) {
      try { console.warn('[game-stickers] grant failed:', error); } catch (e) {}
      return null;
    });
  }

  function getState() {
    return _state();
  }

  function getOwned(gameId) {
    var state = _state();
    if (!gameId) return state.pages || {};
    return _pageState(state, gameId).owned;
  }

  function consumePending() {
    var pending = _getJSON(LS_PENDING, []);
    localStorage.removeItem(LS_PENDING);
    return Array.isArray(pending) ? pending : [];
  }

  window.PonoGameStickers = {
    loadCatalog: loadCatalog,
    resolveAsset: resolveAsset,
    grant: grant,
    getState: getState,
    getOwned: getOwned,
    consumePending: consumePending,
    showStickerToast: showStickerToast
  };
})();
