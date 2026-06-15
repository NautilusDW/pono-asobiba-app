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
    var accent = page.accent || '#F2915A';
    var overlay = document.createElement('div');
    overlay.id = 'game-sticker-toast';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'シールをゲット');
    overlay.style.setProperty('--sticker-accent', accent);

    var media = sticker.img
      ? '<img class="game-sticker-piece__img" src="' + _esc(resolveAsset(sticker.img)) + '" alt="">'
      : '<div class="game-sticker-piece__emoji">' + _esc(sticker.emoji || '⭐') + '</div>';

    var box = document.createElement('div');
    box.className = 'game-sticker-popup';
    var spark = result.count >= 3 ? '<div class="game-sticker-popup__spark">キラキラ ×' + result.count + '</div>' : '';
    box.innerHTML =
      '<div class="game-sticker-popup__eyebrow">シール ゲット!</div>' +
      '<div class="game-sticker-popup__sheet">' +
        '<div class="game-sticker-piece" aria-hidden="true">' + media + '</div>' +
      '</div>' +
      '<div class="game-sticker-popup__name">' + _esc(sticker.name || 'シール') + '</div>' +
      '<div class="game-sticker-popup__sub">' + _esc(page.title || result.gameId || '') + 'のページに はれるよ</div>' +
      spark +
      '<div class="game-sticker-popup__actions">' +
        '<button type="button" data-sticker-close class="game-sticker-popup__btn game-sticker-popup__btn--sub">つづける</button>' +
        '<button type="button" data-sticker-book class="game-sticker-popup__btn game-sticker-popup__btn--main">ペタッとはる</button>' +
      '</div>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var style = document.getElementById('game-sticker-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'game-sticker-style';
      style.textContent = [
        '#game-sticker-toast{position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;background:rgba(13,20,33,.42);padding:18px;font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN","BIZ UDPGothic",sans-serif;animation:gameStickerFade .18s ease-out;}',
        '#game-sticker-toast .game-sticker-popup{width:min(336px,92vw);background:#fffdf6;border-radius:24px;padding:17px 16px 15px;text-align:center;box-shadow:0 18px 46px rgba(0,0,0,.28), inset 0 2px 0 rgba(255,255,255,.85);border:3px solid var(--sticker-accent,#F2915A);color:#4A3726;overflow:hidden;}',
        '#game-sticker-toast .game-sticker-popup__eyebrow{font-size:.84rem;font-weight:900;color:var(--sticker-accent,#F2915A);margin-bottom:8px;}',
        '#game-sticker-toast .game-sticker-popup__sheet{display:grid;place-items:center;min-height:140px;background:radial-gradient(circle at 50% 58%, rgba(242,145,90,.18), transparent 58%);}',
        '#game-sticker-toast .game-sticker-piece{width:126px;height:126px;border-radius:30px;background:#fff;border:7px solid #fff;display:grid;place-items:center;transform:rotate(-4deg);box-shadow:0 3px 0 rgba(180,129,66,.26),0 12px 22px rgba(85,54,20,.2),inset 0 0 0 2px rgba(255,230,170,.72);position:relative;animation:gameStickerPop .34s cubic-bezier(.18,.9,.24,1.22);}',
        '#game-sticker-toast .game-sticker-piece:after{content:"";position:absolute;inset:-8px;border-radius:36px;border:2px solid rgba(255,255,255,.96);box-shadow:0 0 0 1px rgba(150,102,45,.14);pointer-events:none;}',
        '#game-sticker-toast .game-sticker-piece__img{width:106px;height:106px;object-fit:contain;display:block;filter:drop-shadow(0 6px 8px rgba(0,0,0,.16));}',
        '#game-sticker-toast .game-sticker-piece__emoji{font-size:4rem;line-height:1;filter:drop-shadow(0 6px 8px rgba(0,0,0,.14));}',
        '#game-sticker-toast .game-sticker-popup__name{font-size:1.08rem;font-weight:900;line-height:1.25;margin-top:2px;}',
        '#game-sticker-toast .game-sticker-popup__sub{font-size:.74rem;color:#8A7460;margin-top:4px;font-weight:700;}',
        '#game-sticker-toast .game-sticker-popup__spark{font-size:.78rem;font-weight:900;color:#D97706;margin-top:3px;}',
        '#game-sticker-toast .game-sticker-popup__actions{display:flex;gap:8px;justify-content:center;margin-top:14px;}',
        '#game-sticker-toast .game-sticker-popup__btn{border:0;border-radius:999px;font-weight:900;padding:10px 16px;font-family:inherit;cursor:pointer;box-shadow:0 3px 0 rgba(81,50,19,.18);}',
        '#game-sticker-toast .game-sticker-popup__btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(81,50,19,.18);}',
        '#game-sticker-toast .game-sticker-popup__btn--sub{background:#EEE6DD;color:#5D4E37;}',
        '#game-sticker-toast .game-sticker-popup__btn--main{background:var(--sticker-accent,#F2915A);color:#fff;}',
        '#game-sticker-toast .game-sticker-popup.is-pasting .game-sticker-piece{animation:gameStickerPeta .62s cubic-bezier(.18,.86,.24,1) forwards;}',
        '#game-sticker-toast .game-sticker-popup.is-pasting .game-sticker-popup__btn{pointer-events:none;opacity:.65;}',
        '@keyframes gameStickerFade{from{opacity:0}to{opacity:1}}',
        '@keyframes gameStickerPop{from{opacity:0;transform:translateY(16px) rotate(-10deg) scale(.72)}to{opacity:1;transform:translateY(0) rotate(-4deg) scale(1)}}',
        '@keyframes gameStickerPeta{0%{transform:translateY(0) rotate(-4deg) scale(1)}45%{transform:translateY(14px) rotate(3deg) scale(1.08)}70%{transform:translateY(10px) rotate(-1deg) scale(.9)}100%{transform:translateY(12px) rotate(0deg) scale(.94);box-shadow:0 1px 0 rgba(180,129,66,.2),0 7px 13px rgba(85,54,20,.16),inset 0 0 0 2px rgba(255,230,170,.72)}}'
      ].join('');
      document.head.appendChild(style);
    }

    function close() { _removeToast(); }
    box.querySelector('[data-sticker-close]').addEventListener('click', close);
    box.querySelector('[data-sticker-book]').addEventListener('click', function () {
      box.classList.add('is-pasting');
      var btn = box.querySelector('[data-sticker-book]');
      if (btn) btn.disabled = true;
      window.setTimeout(function () {
        location.href = _rootPrefix() + 'sticker-book/index.html?game=' + encodeURIComponent(result.gameId);
      }, 560);
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
