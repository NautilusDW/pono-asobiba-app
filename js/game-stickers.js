// ── js/game-stickers.js ──
// Mini-game sticker-book rewards. This intentionally does not depend on
// common/stickers.js because that module is for daily-login stickers.
(function () {
  'use strict';

  var LS_STATE = 'pono_game_stickers_v1';
  var LS_PENDING = 'pono_game_sticker_pending_v1';
  var CATALOG_PATH = 'assets/data/game-stickers.json';
  var catalogPromise = null;
  var toastQueue = [];
  var toastDrainTimer = 0;
  var toastObserver = null;

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

  function _playRewardImpactSfx() {
    try {
      var audio = new Audio(resolveAsset('assets/audio/sfx/quiz/don.mp3'));
      audio.volume = 0.48;
      audio.currentTime = 0;
      var p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) {}
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

  function _isVisibleElement(el) {
    if (!el || !document.body || !document.body.contains(el)) return false;
    var style = window.getComputedStyle ? window.getComputedStyle(el) : null;
    if (style && (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0)) return false;
    if (el.hidden) return false;
    if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return false;
    var rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    return !rect || (rect.width > 1 && rect.height > 1);
  }

  function _hasBlockingOverlay() {
    var currentToast = document.getElementById('game-sticker-toast');
    if (_isVisibleElement(currentToast)) return true;
    var selectors = [
      '[aria-modal="true"]',
      '[role="dialog"]',
      '#result-overlay:not(.hidden)',
      '#complete-overlay:not(.hidden)',
      '#finishOverlay:not([hidden])',
      '#finish-overlay:not([hidden])',
      '#encounter.show',
      '.encounter.show',
      '.rhythm-complete.show',
      '.rhythm-opening.show',
      '.result-overlay:not(.hidden)',
      '.complete-overlay:not(.hidden)',
      '.modal.show',
      '.overlay.show',
      '.clear-overlay.show',
      '.stage-clear-overlay.show',
      '.first-clear-modal.show',
      '.first-clear-overlay.show'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var nodes = [];
      try { nodes = document.querySelectorAll(selectors[i]); } catch (e) { nodes = []; }
      for (var j = 0; j < nodes.length; j++) {
        var el = nodes[j];
        if (!el || el.id === 'game-sticker-toast') continue;
        if (currentToast && currentToast.contains(el)) continue;
        if (_isVisibleElement(el)) return true;
      }
    }
    return false;
  }

  function _stopStickerToastObserver() {
    if (toastObserver) {
      try { toastObserver.disconnect(); } catch (e) {}
      toastObserver = null;
    }
  }

  function _armStickerToastObserver() {
    if (toastObserver || !window.MutationObserver || !document.body) return;
    toastObserver = new MutationObserver(function () {
      if (toastQueue.length) _requestStickerToastDrain(120);
    });
    try {
      toastObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'hidden', 'style', 'aria-hidden']
      });
    } catch (e) {
      _stopStickerToastObserver();
    }
  }

  function _requestStickerToastDrain(delay) {
    if (toastDrainTimer) window.clearTimeout(toastDrainTimer);
    toastDrainTimer = window.setTimeout(_drainStickerToastQueue, Math.max(0, delay || 0));
    if (toastQueue.length) _armStickerToastObserver();
  }

  function _drainStickerToastQueue() {
    toastDrainTimer = 0;
    if (!toastQueue.length) {
      _stopStickerToastObserver();
      return;
    }
    if (_hasBlockingOverlay()) {
      _requestStickerToastDrain(350);
      return;
    }
    var item = toastQueue.shift();
    showStickerToast(item.result, item.options);
    if (toastQueue.length) _requestStickerToastDrain(700);
  }

  function _queueStickerToast(result, options) {
    if (!result) return;
    toastQueue.push({ result: result, options: options || {} });
    _requestStickerToastDrain(options && typeof options.delayMs === 'number' ? options.delayMs : 900);
  }

  function showStickerToast(result, options) {
    if (!result || !result.sticker || !document.body) return;
    options = options || {};
    _removeToast();

    var sticker = result.sticker;
    var page = result.page || {};
    var accent = page.accent || '#F2915A';
    var burstImage = resolveAsset('assets/images/oto/rhythm/stage_clear_burst.png');
    var sparkleLarge = resolveAsset('assets/images/mojikko/writing/fx_sparkle_large.png');
    var sparkleSmall = resolveAsset('assets/images/mojikko/writing/icon_sparkle.png');
    var overlay = document.createElement('div');
    overlay.id = 'game-sticker-toast';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'シールをゲット');
    overlay.style.setProperty('--sticker-accent', accent);
    overlay.style.setProperty('--sticker-burst-image', 'url("' + burstImage.replace(/"/g, '%22') + '")');

    var media = sticker.img
      ? '<img class="game-sticker-piece__img" src="' + _esc(resolveAsset(sticker.img)) + '" alt="">'
      : '<div class="game-sticker-piece__emoji">' + _esc(sticker.emoji || '⭐') + '</div>';

    var box = document.createElement('div');
    box.className = 'game-sticker-popup';
    var spark = result.count >= 3 ? '<div class="game-sticker-popup__spark">キラキラ ×' + result.count + '</div>' : '';
    var sparkleDecor =
      '<img class="game-sticker-popup__decor decor-a" src="' + _esc(sparkleLarge) + '" alt="" aria-hidden="true">' +
      '<img class="game-sticker-popup__decor decor-b" src="' + _esc(sparkleSmall) + '" alt="" aria-hidden="true">' +
      '<img class="game-sticker-popup__decor decor-c" src="' + _esc(sparkleSmall) + '" alt="" aria-hidden="true">';
    box.innerHTML =
      '<div class="game-sticker-popup__aura" aria-hidden="true">' + sparkleDecor + '</div>' +
      '<div class="game-sticker-popup__eyebrow">ごほうび シール!</div>' +
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
    _playRewardImpactSfx();

    var style = document.getElementById('game-sticker-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'game-sticker-style';
      style.textContent = [
        '#game-sticker-toast{position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;background:rgba(6,9,24,.68);padding:18px;font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN","BIZ UDPGothic",sans-serif;animation:gameStickerFade .18s ease-out;overflow:hidden;}',
        '#game-sticker-toast:before{content:"";position:absolute;inset:-5%;background-image:linear-gradient(rgba(3,8,28,.08),rgba(3,8,28,.42)),var(--sticker-burst-image);background-position:center;background-size:cover;filter:saturate(1.2) contrast(1.06);animation:gameStickerBackdrop 1.9s ease-out both;}',
        '#game-sticker-toast:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,rgba(255,246,168,.5),rgba(255,246,168,0) 23%),radial-gradient(circle at 50% 50%,rgba(255,255,255,.2),rgba(255,255,255,0) 46%);pointer-events:none;animation:gameStickerFlash .9s ease-out both;}',
        '#game-sticker-toast .game-sticker-popup{position:relative;z-index:1;width:min(380px,92vw);background:linear-gradient(180deg,rgba(255,253,246,.98),rgba(255,244,210,.95));border-radius:28px;padding:20px 18px 16px;text-align:center;box-shadow:0 22px 54px rgba(0,0,0,.36),0 0 46px rgba(255,216,94,.34),inset 0 2px 0 rgba(255,255,255,.9);border:4px solid var(--sticker-accent,#F2915A);color:#4A3726;overflow:visible;animation:gameStickerPanelIn .46s cubic-bezier(.2,.86,.2,1.08);}',
        '#game-sticker-toast .game-sticker-popup:before{content:"";position:absolute;inset:-12px;border-radius:34px;border:3px solid rgba(255,255,255,.86);box-shadow:0 0 0 2px rgba(255,226,126,.35),0 0 34px rgba(255,231,140,.52);pointer-events:none;}',
        '#game-sticker-toast .game-sticker-popup__aura{position:absolute;inset:0;pointer-events:none;z-index:3;}',
        '#game-sticker-toast .game-sticker-popup__decor{position:absolute;width:58px;height:58px;object-fit:contain;filter:drop-shadow(0 6px 9px rgba(94,53,7,.24));animation:gameStickerSparkle 1.5s ease-in-out infinite;}',
        '#game-sticker-toast .game-sticker-popup__decor.decor-a{left:-28px;top:54px;width:86px;height:86px;animation-delay:.1s;}',
        '#game-sticker-toast .game-sticker-popup__decor.decor-b{right:-18px;top:16px;animation-delay:.34s;}',
        '#game-sticker-toast .game-sticker-popup__decor.decor-c{right:18px;bottom:58px;width:44px;height:44px;animation-delay:.62s;}',
        '#game-sticker-toast .game-sticker-popup__eyebrow{position:relative;z-index:4;display:inline-block;font-size:.92rem;font-weight:900;color:#7C2D12;background:linear-gradient(180deg,#FFF7D6,#FFE08A);border:2px solid rgba(255,255,255,.95);border-radius:999px;padding:5px 14px 6px;margin-bottom:10px;box-shadow:0 4px 0 rgba(198,108,28,.22),0 8px 16px rgba(120,72,16,.16);}',
        '#game-sticker-toast .game-sticker-popup__sheet{position:relative;z-index:2;display:grid;place-items:center;min-height:170px;background:radial-gradient(circle at 50% 55%,rgba(255,214,89,.54),rgba(255,214,89,.18) 34%,transparent 62%);}',
        '#game-sticker-toast .game-sticker-popup__sheet:before{content:"";position:absolute;width:178px;height:178px;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.78) 0 10deg,rgba(255,220,84,.16) 10deg 20deg);filter:blur(.2px);animation:gameStickerRays 5s linear infinite;}',
        '#game-sticker-toast .game-sticker-piece{width:152px;height:152px;border-radius:34px;background:#fff;border:8px solid #fff;display:grid;place-items:center;transform:rotate(-5deg);box-shadow:0 5px 0 rgba(180,129,66,.28),0 16px 28px rgba(85,54,20,.25),0 0 0 4px rgba(255,219,92,.42),inset 0 0 0 2px rgba(255,230,170,.78);position:relative;animation:gameStickerPop .54s cubic-bezier(.19,.9,.22,1.08);}',
        '#game-sticker-toast .game-sticker-piece:after{content:"";position:absolute;inset:-10px;border-radius:40px;border:2px solid rgba(255,255,255,.96);box-shadow:0 0 0 1px rgba(150,102,45,.14),0 0 24px rgba(255,255,255,.74);pointer-events:none;}',
        '#game-sticker-toast .game-sticker-piece__img{width:128px;height:128px;object-fit:contain;display:block;filter:drop-shadow(0 7px 9px rgba(0,0,0,.18));}',
        '#game-sticker-toast .game-sticker-piece__emoji{font-size:4.8rem;line-height:1;filter:drop-shadow(0 7px 9px rgba(0,0,0,.16));}',
        '#game-sticker-toast .game-sticker-popup__name{position:relative;z-index:4;font-size:1.18rem;font-weight:900;line-height:1.25;margin-top:2px;text-shadow:0 1px 0 #fff;}',
        '#game-sticker-toast .game-sticker-popup__sub{position:relative;z-index:4;font-size:.78rem;color:#7A5D43;margin-top:4px;font-weight:900;}',
        '#game-sticker-toast .game-sticker-popup__spark{position:relative;z-index:4;font-size:.82rem;font-weight:900;color:#D97706;margin-top:3px;}',
        '#game-sticker-toast .game-sticker-popup__actions{position:relative;z-index:4;display:flex;gap:8px;justify-content:center;margin-top:14px;}',
        '#game-sticker-toast .game-sticker-popup__btn{border:0;border-radius:999px;font-weight:900;padding:10px 16px;font-family:inherit;cursor:pointer;box-shadow:0 3px 0 rgba(81,50,19,.18);}',
        '#game-sticker-toast .game-sticker-popup__btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(81,50,19,.18);}',
        '#game-sticker-toast .game-sticker-popup__btn--sub{background:#EEE6DD;color:#5D4E37;}',
        '#game-sticker-toast .game-sticker-popup__btn--main{background:var(--sticker-accent,#F2915A);color:#fff;}',
        '#game-sticker-toast .game-sticker-popup.is-pasting .game-sticker-piece{animation:gameStickerPeta .62s cubic-bezier(.18,.86,.24,1) forwards;}',
        '#game-sticker-toast .game-sticker-popup.is-pasting .game-sticker-popup__btn{pointer-events:none;opacity:.65;}',
        '@keyframes gameStickerFade{from{opacity:0}to{opacity:1}}',
        '@keyframes gameStickerBackdrop{from{opacity:0;transform:scale(1.06)}to{opacity:1;transform:scale(1)}}',
        '@keyframes gameStickerFlash{0%{opacity:0}24%{opacity:1}100%{opacity:.55}}',
        '@keyframes gameStickerPanelIn{0%{opacity:0;transform:translateY(-8px) scale(1.32)}48%{opacity:1;transform:translateY(4px) scale(.94)}74%{opacity:1;transform:translateY(-2px) scale(1.04)}100%{opacity:1;transform:translateY(0) scale(1)}}',
        '@keyframes gameStickerRays{to{transform:rotate(360deg)}}',
        '@keyframes gameStickerSparkle{0%,100%{transform:scale(.9) rotate(-8deg);opacity:.86}50%{transform:scale(1.13) rotate(8deg);opacity:1}}',
        '@keyframes gameStickerPop{0%{opacity:0;transform:translateY(-10px) rotate(-10deg) scale(1.72)}34%{opacity:1;transform:translateY(8px) rotate(3deg) scale(.9)}62%{opacity:1;transform:translateY(-5px) rotate(-7deg) scale(1.09)}100%{opacity:1;transform:translateY(0) rotate(-5deg) scale(1)}}',
        '@keyframes gameStickerPeta{0%{transform:translateY(0) rotate(-4deg) scale(1)}45%{transform:translateY(14px) rotate(3deg) scale(1.08)}70%{transform:translateY(10px) rotate(-1deg) scale(.9)}100%{transform:translateY(12px) rotate(0deg) scale(.94);box-shadow:0 1px 0 rgba(180,129,66,.2),0 7px 13px rgba(85,54,20,.16),inset 0 0 0 2px rgba(255,230,170,.72)}}'
      ].join('');
      document.head.appendChild(style);
    }

    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      _removeToast();
      if (typeof options.onClose === 'function') {
        try { options.onClose(result); } catch (e) {}
      }
      _requestStickerToastDrain(120);
    }
    box.querySelector('[data-sticker-close]').addEventListener('click', close);
    box.querySelector('[data-sticker-book]').addEventListener('click', function () {
      box.classList.add('is-pasting');
      var btn = box.querySelector('[data-sticker-book]');
      if (btn) btn.disabled = true;
      window.setTimeout(function () {
        // シール帳 正本統一: 全 grant 動線を 3D book (Prototypes/StickerBookThreeJS) に統一。
        // game / pasteId / firstEver query は 3D book main.js 側で吸収 (page auto-open / 強調 / welcome)。
        var url = _rootPrefix() + 'Prototypes/StickerBookThreeJS/?book=boy&surface=cover';
        if (result.gameId) url += '&game=' + encodeURIComponent(result.gameId);
        if (result.stickerId) url += '&pasteId=' + encodeURIComponent(result.stickerId);
        url += '&firstEver=' + (result.first ? '1' : '0');
        location.href = url;
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
      if (options.show !== false) {
        if (options.immediate) showStickerToast(result, options);
        else _queueStickerToast(result, options);
      }
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
