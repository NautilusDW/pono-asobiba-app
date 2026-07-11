// ── js/game-stickers.js ──
// Mini-game sticker-book rewards. This intentionally does not depend on
// common/stickers.js because that module is for daily-login stickers.
(function () {
  'use strict';

  var LS_STATE = 'pono_game_stickers_v1';
  var LS_PENDING = 'pono_game_sticker_pending_v1';
  var CATALOG_PATH = 'assets/data/game-stickers.json';
  var BOOK_BONUS_GAME_ID = 'book-bonus';
  var catalogPromise = null;
  var toastQueue = [];
  var toastDrainTimer = 0;
  var toastObserver = null;
  var GAME_COMPLETION_EVENTS = {
    clear: true,
    stage_clear: true,
    perfect: true,
    complete: true
  };

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

  function _playRewardImpactSfx(gameId) {
    // 共通基盤 (common/acorn-audio.js) が読み込まれていれば PonoAcornAudio 経由で再生。
    // PonoAcornAudio.play(gameId) は内部で未登録ゲームを default (don.mp3 @ 0.48) に fallback してくれる。
    // 共通基盤が未ロードのページ (旧シェル / 部分配信中) のために、既存の don.mp3 直接再生 fallback を残す。
    if (window.PonoAcornAudio && typeof window.PonoAcornAudio.play === 'function') {
      try {
        var pRew = window.PonoAcornAudio.play(gameId);
        if (pRew && typeof pRew.catch === 'function') pRew.catch(function () {});
        return;
      } catch (e) {}
    }
    try {
      var audio = new Audio(resolveAsset('assets/audio/sfx/quiz/don.mp3'));
      audio.volume = 0.48;
      audio.currentTime = 0;
      var p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e2) {}
  }

  function _eventMatches(sticker, eventName) {
    if (!eventName) return true;
    var list = sticker.unlockOn || [];
    return list.indexOf(eventName) !== -1;
  }

  function _isBookBenefitUnlocked() {
    try {
      var tier = window.PonoTier || null;
      if (tier) {
        if (typeof tier.isBook === 'function' && tier.isBook()) return true;
        if (typeof tier.isApp === 'function' && tier.isApp()) return true;
        if (typeof tier.getTier === 'function') {
          var currentTier = tier.getTier();
          if (currentTier === 'book' || currentTier === 'app') return true;
        }
      }
    } catch (e) {}
    try {
      return localStorage.getItem('pono_premium') === '1' || Boolean(window.__APP_BUILD__);
    } catch (e2) {
      return Boolean(window.__APP_BUILD__);
    }
  }

  function _isPageLocked(page) {
    return Boolean(page && page.bookOnly && !_isBookBenefitUnlocked());
  }

  // tier v3: 各シールエントリの "tier" フィールドによる個別ゲート。
  // "book_exclusive" | "app_exclusive" | 未設定/"free" (= 全 tier 開放)。
  // (2026-07-11 tier 名 'sub'→'app' リネームに伴い "sub_exclusive" → "app_exclusive"。
  //  assets/data/game-stickers.json と必ず同一コミットで変更すること — fail-open のため
  //  片方だけ変えると app 限定シールが全 tier 開放される)
  // ページ単位の bookOnly/appOnly ゲート (_isPageLocked) とは独立に、同一ページ内で
  // tier が混在するケース (例: book-bonus ページに将来 app 限定シールが混じる等) に備える。
  function _currentTier() {
    try {
      if (window.PonoTier && typeof window.PonoTier.getTier === 'function') {
        return window.PonoTier.getTier();
      }
    } catch (e) {}
    try {
      if (Boolean(window.__APP_BUILD__)) return 'app';
      if (localStorage.getItem('pono_premium') === '1') return 'book';
    } catch (e2) {}
    return 'free';
  }

  function _isStickerTierUnlocked(tier) {
    if (!tier || tier === 'free') return true;
    var current = _currentTier();
    if (tier === 'book_exclusive') return current === 'book' || current === 'app';
    if (tier === 'app_exclusive') return current === 'app';
    // 未知の tier 値 (schema typo 等) は fail-open。 誤って正規コンテンツを
    // ブロックしてしまう事故の方が、 未知タグを開放してしまう事故より重い。
    return true;
  }

  function _findSticker(page, owned, options) {
    var stickers = (page.stickers || []).filter(function (s) {
      return _isStickerTierUnlocked(s && s.tier);
    });
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

  function _isGameCompletionOnly(options) {
    var eventName = (options && (options.event || options.reason)) || 'clear';
    return !!GAME_COMPLETION_EVENTS[eventName];
  }

  function _completionOnlyResult(options) {
    var now = Date.now();
    return {
      gameId: options.gameId,
      stickerId: '',
      sticker: null,
      page: null,
      count: 0,
      first: false,
      event: options.event || options.reason || 'clear',
      completionOnly: true,
      ts: now
    };
  }

  function _ensureAcornRewardStyle() {
    if (document.getElementById('game-acorn-reward-style')) return;
    var style = document.createElement('style');
    style.id = 'game-acorn-reward-style';
    style.textContent = [
      '#game-acorn-reward{position:fixed;inset:0;z-index:99997;display:grid;place-items:center;padding:18px;background:rgba(42,27,14,.26);font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN","BIZ UDPGothic",sans-serif;}',
      '#game-acorn-reward[hidden]{display:none!important;}',
      '#game-acorn-reward .game-acorn-reward-card{position:relative;width:min(520px,92vw);aspect-ratio:1200/600;min-height:214px;max-height:calc(100dvh - 34px);box-sizing:border-box;padding:clamp(40px,6.8vw,58px) clamp(48px,8vw,70px) clamp(34px,5.8vw,50px);display:grid;grid-template-rows:auto 1fr;align-items:center;justify-items:center;gap:clamp(8px,1.8vw,14px);background:transparent url("' + _esc(resolveAsset('assets/images/quizland/Fukuro_frame_001.webp')) + '") center/100% 100% no-repeat;color:#5a3515;text-align:center;filter:drop-shadow(0 18px 22px rgba(39,24,11,.36));transform:scale(.92);opacity:0;}',
      '#game-acorn-reward.is-visible .game-acorn-reward-card{animation:gameAcornRewardPop .42s cubic-bezier(.18,.86,.22,1.08) both;}',
      '#game-acorn-reward .game-acorn-reward-close{position:absolute;top:clamp(16px,3vw,24px);right:clamp(20px,3.8vw,32px);width:36px;height:36px;border:3px solid rgba(117,75,27,.48);border-radius:50%;background:linear-gradient(180deg,#fff8df,#f4c46a);color:#6e3d09;font:900 24px/1 "Zen Maru Gothic","Hiragino Maru Gothic ProN","BIZ UDPGothic",sans-serif;box-shadow:0 3px 0 rgba(118,66,0,.38);cursor:pointer;}',
      '#game-acorn-reward .game-acorn-reward-close:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(118,66,0,.38);}',
      '#game-acorn-reward .game-acorn-reward-kicker{align-self:end;color:#8b4e12;font-size:clamp(22px,5vw,33px);font-weight:900;line-height:1.05;text-shadow:0 2px 0 rgba(255,246,214,.95);white-space:nowrap;}',
      '#game-acorn-reward .game-acorn-reward-bottom{align-self:start;display:grid;justify-items:center;gap:clamp(7px,1.5vw,10px);}',
      '#game-acorn-reward .game-acorn-reward-label{color:#5c3717;font-size:clamp(16px,3.6vw,22px);font-weight:900;line-height:1.12;text-shadow:0 1px 0 rgba(255,250,231,.95);white-space:nowrap;}',
      '#game-acorn-reward .game-acorn-reward-amount{pointer-events:auto;display:inline-flex;align-items:center;justify-content:flex-start;width:clamp(146px,31vw,194px);min-width:146px;aspect-ratio:339/169;box-sizing:border-box;padding:0 clamp(15px,2.6vw,22px) 0 clamp(12px,2vw,18px);gap:clamp(3px,.6vw,7px);background:linear-gradient(180deg,rgba(255,252,238,.98) 0%,rgba(255,239,203,.98) 100%);border:clamp(3px,.35vw,5px) solid #b66c00;border-radius:999px;font-size:clamp(21px,4.8vw,30px);font-weight:900;color:#6e4a00;box-shadow:inset 0 0 0 2px rgba(255,255,246,.95),inset 0 0 0 5px rgba(235,168,33,.46),0 3px 0 rgba(118,66,0,.38);filter:drop-shadow(0 5px 8px rgba(73,38,5,.24));animation:gameAcornRewardAmount .5s .22s cubic-bezier(.18,.86,.22,1.08) both;}',
      '#game-acorn-reward .game-acorn-reward-icon{display:inline-block;width:clamp(30px,6vw,42px);aspect-ratio:85/103;flex:0 0 auto;background:transparent url("' + _esc(resolveAsset('assets/ui/shop/donguri_shop_acorn_icon_20260626.png')) + '") center/contain no-repeat;transform:translateY(-2px);filter:drop-shadow(0 2px 2px rgba(91,48,6,.28));}',
      '#game-acorn-reward .game-acorn-reward-text{flex:1 1 auto;min-width:0;text-align:center;font-variant-numeric:tabular-nums;white-space:nowrap;}',
      '@keyframes gameAcornRewardPop{0%{opacity:0;transform:translateY(10px) scale(.86)}58%{opacity:1;transform:translateY(-4px) scale(1.035)}100%{opacity:1;transform:translateY(0) scale(1)}}',
      '@keyframes gameAcornRewardAmount{0%{transform:scale(.74);opacity:.4}70%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}',
      '@media (prefers-reduced-motion:reduce){#game-acorn-reward.is-visible .game-acorn-reward-card,#game-acorn-reward .game-acorn-reward-amount{animation:none;opacity:1;transform:none;}}',
      '@media (max-height:430px) and (orientation:landscape){#game-acorn-reward .game-acorn-reward-card{width:min(470px,82vw);min-height:184px;padding:32px 52px 28px;}#game-acorn-reward .game-acorn-reward-close{top:14px;right:24px;width:32px;height:32px;font-size:21px;}#game-acorn-reward .game-acorn-reward-kicker{font-size:24px;}#game-acorn-reward .game-acorn-reward-label{font-size:17px;}#game-acorn-reward .game-acorn-reward-amount{width:154px;min-width:154px;font-size:23px;}}'
    ].join('');
    document.head.appendChild(style);
  }

  function _hideAcornRewardModal() {
    var overlay = document.getElementById('game-acorn-reward');
    if (!overlay) return;
    var timer = overlay.__gameAcornRewardTimer;
    if (timer) {
      window.clearTimeout(timer);
      overlay.__gameAcornRewardTimer = 0;
    }
    overlay.hidden = true;
    overlay.classList.remove('is-visible');
  }

  function _showAcornRewardModal(delta, after) {
    delta = delta | 0;
    if (delta <= 0 || !document.body) return;
    if (document.getElementById('acornRewardModal')) return;
    _ensureAcornRewardStyle();

    var overlay = document.getElementById('game-acorn-reward');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'game-acorn-reward';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'gameAcornRewardTitle');
      overlay.innerHTML =
        '<div class="game-acorn-reward-card">' +
          '<button class="game-acorn-reward-close" type="button" aria-label="とじる">×</button>' +
          '<div class="game-acorn-reward-kicker">やったね！</div>' +
          '<div class="game-acorn-reward-bottom">' +
            '<div class="game-acorn-reward-label" id="gameAcornRewardTitle">どんぐりを ゲットしたよ</div>' +
            '<div class="game-acorn-reward-amount" aria-label="どんぐり">' +
              '<span class="game-acorn-reward-icon" aria-hidden="true"></span>' +
              '<span class="game-acorn-reward-text"><span aria-hidden="true">×</span><span data-acorn-amount>0</span></span>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
      var closeBtn = overlay.querySelector('.game-acorn-reward-close');
      if (closeBtn) closeBtn.addEventListener('click', _hideAcornRewardModal);
      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) _hideAcornRewardModal();
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !overlay.hidden) _hideAcornRewardModal();
      });
    }

    var amountEl = overlay.querySelector('[data-acorn-amount]');
    if (amountEl) amountEl.textContent = String(delta);
    var amountPill = overlay.querySelector('.game-acorn-reward-amount');
    if (amountPill) amountPill.setAttribute('aria-label', 'どんぐり ' + delta + 'こ');
    overlay.hidden = false;
    overlay.classList.remove('is-visible');
    void overlay.offsetWidth;
    overlay.classList.add('is-visible');
    if (overlay.__gameAcornRewardTimer) window.clearTimeout(overlay.__gameAcornRewardTimer);
    overlay.__gameAcornRewardTimer = window.setTimeout(_hideAcornRewardModal, 4200);
    try {
      if (typeof after === 'number') sessionStorage.setItem('pono_acorns_last_seen_v1', String(after | 0));
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
    options = options || {};
    if (!result || result.completionOnly || !result.sticker || !document.body) {
      if (typeof options.onClose === 'function') {
        window.setTimeout(function () {
          try { options.onClose(result || null); } catch (e) {}
        }, 0);
      }
      return;
    }
    _removeToast();

    var sticker = result.sticker;
    var page = result.page || {};
    var displayName = String(sticker.name || 'シール').trim() || 'シール';
    var isShopPurchase = options.source === 'shop' || options.context === 'shop' || options.shopPurchase === true;
    var eyebrowText = isShopPurchase ? 'こうかんしたよ' : 'ごほうび シール!';
    var subText = isShopPurchase
      ? 'シールちょうに はれるよ'
      : (String(page.title || result.gameId || '') + 'のページに はれるよ');
    var accent = page.accent || '#F2915A';
    var burstImage = resolveAsset('assets/images/oto/rhythm/stage_clear_burst.png');
    var sparkleLarge = resolveAsset('assets/images/mojikko/writing/fx_sparkle_large.png');
    var sparkleSmall = resolveAsset('assets/images/mojikko/writing/icon_sparkle.png');
    var overlay = document.createElement('div');
    overlay.id = 'game-sticker-toast';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', displayName + 'を ゲット');
    if (isShopPurchase) overlay.setAttribute('data-sticker-source', 'shop');
    overlay.style.setProperty('--sticker-accent', accent);
    overlay.style.setProperty('--sticker-burst-image', 'url("' + burstImage.replace(/"/g, '%22') + '")');

    var media = sticker.img
      ? '<img class="game-sticker-piece__img" src="' + _esc(resolveAsset(sticker.img)) + '" alt="">'
      : '<div class="game-sticker-piece__emoji">' + _esc(sticker.emoji || '⭐') + '</div>';

    var box = document.createElement('div');
    box.className = 'game-sticker-popup';
    if (isShopPurchase) box.classList.add('is-shop-purchase');
    var spark = result.count >= 3 ? '<div class="game-sticker-popup__spark">キラキラ ×' + result.count + '</div>' : '';
    var nameAttr = displayName.length >= 8 ? ' data-long-name="1"' : '';
    var sparkleDecor =
      '<img class="game-sticker-popup__decor decor-a" src="' + _esc(sparkleLarge) + '" alt="" aria-hidden="true">' +
      '<img class="game-sticker-popup__decor decor-b" src="' + _esc(sparkleSmall) + '" alt="" aria-hidden="true">' +
      '<img class="game-sticker-popup__decor decor-c" src="' + _esc(sparkleSmall) + '" alt="" aria-hidden="true">';
    box.innerHTML =
      '<div class="game-sticker-popup__aura" aria-hidden="true">' + sparkleDecor + '</div>' +
      '<div class="game-sticker-popup__eyebrow">' + _esc(eyebrowText) + '</div>' +
      '<div class="game-sticker-popup__sheet">' +
        '<div class="game-sticker-piece" aria-hidden="true">' + media + '</div>' +
      '</div>' +
      '<div class="game-sticker-popup__name"' + nameAttr + '>' + _esc(displayName) + '</div>' +
      '<div class="game-sticker-popup__sub">' + _esc(subText) + '</div>' +
      spark +
      '<div class="game-sticker-popup__actions">' +
        '<button type="button" data-sticker-close class="game-sticker-popup__btn game-sticker-popup__btn--sub">つづける</button>' +
        '<button type="button" data-sticker-book class="game-sticker-popup__btn game-sticker-popup__btn--main">ペタッとはる</button>' +
      '</div>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    // v1891: 呼出元が purchase 用 rarity SE を先に鳴らしている場合は二重発火を抑制 (donguri-shop 動線)。
    if (!options.suppressImpactSfx) {
      _playRewardImpactSfx(result && result.gameId);
    }

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
        '#game-sticker-toast[data-sticker-source="shop"]:before{animation-duration:3.4s;}',
        '#game-sticker-toast[data-sticker-source="shop"]:after{animation:gameStickerFlashShop 2.6s ease-out both;}',
        '#game-sticker-toast[data-sticker-source="shop"] .game-sticker-popup{animation-duration:.62s;}',
        '#game-sticker-toast[data-sticker-source="shop"] .game-sticker-popup__sheet{min-height:184px;}',
        '#game-sticker-toast[data-sticker-source="shop"] .game-sticker-popup__sheet:before{animation-duration:7.2s;}',
        '#game-sticker-toast[data-sticker-source="shop"] .game-sticker-piece{animation:gameStickerPopShop .86s cubic-bezier(.19,.9,.2,1.04);}',
        '#game-sticker-toast[data-sticker-source="shop"] .game-sticker-piece:after{animation:gameStickerPieceGlow 2.8s ease-in-out 2;}',
        '#game-sticker-toast[data-sticker-source="shop"] .game-sticker-popup__name{display:inline-block;max-width:100%;margin:8px auto 0;padding:6px 18px 7px;border-radius:999px;background:linear-gradient(180deg,#FFF9E6,#FFE58D);border:2px solid rgba(255,255,255,.95);box-shadow:0 4px 0 rgba(197,124,31,.18),0 10px 18px rgba(123,72,13,.14);font-size:1.28rem;color:#654014;}',
        '#game-sticker-toast[data-sticker-source="shop"] .game-sticker-popup__name[data-long-name="1"]{font-size:1.08rem;padding-left:14px;padding-right:14px;}',
        '@media (max-height:480px){#game-sticker-toast[data-sticker-source="shop"] .game-sticker-popup{width:min(340px,90vw);padding:16px 16px 13px;}#game-sticker-toast[data-sticker-source="shop"] .game-sticker-popup__sheet{min-height:152px;}#game-sticker-toast[data-sticker-source="shop"] .game-sticker-piece{width:132px;height:132px;border-radius:30px;}#game-sticker-toast[data-sticker-source="shop"] .game-sticker-piece__img{width:112px;height:112px;}#game-sticker-toast[data-sticker-source="shop"] .game-sticker-popup__name{font-size:1.06rem;margin-top:5px;padding:5px 14px 6px;}#game-sticker-toast[data-sticker-source="shop"] .game-sticker-popup__actions{margin-top:10px;}}',
        '#game-sticker-toast .game-sticker-popup.is-pasting .game-sticker-piece{animation:gameStickerPeta .62s cubic-bezier(.18,.86,.24,1) forwards;}',
        '#game-sticker-toast .game-sticker-popup.is-pasting .game-sticker-popup__btn{pointer-events:none;opacity:.65;}',
        '@keyframes gameStickerFade{from{opacity:0}to{opacity:1}}',
        '@keyframes gameStickerBackdrop{from{opacity:0;transform:scale(1.06)}to{opacity:1;transform:scale(1)}}',
        '@keyframes gameStickerFlash{0%{opacity:0}24%{opacity:1}100%{opacity:.55}}',
        '@keyframes gameStickerFlashShop{0%{opacity:0}18%{opacity:1}64%{opacity:.84}100%{opacity:.42}}',
        '@keyframes gameStickerPanelIn{0%{opacity:0;transform:translateY(-8px) scale(1.32)}48%{opacity:1;transform:translateY(4px) scale(.94)}74%{opacity:1;transform:translateY(-2px) scale(1.04)}100%{opacity:1;transform:translateY(0) scale(1)}}',
        '@keyframes gameStickerRays{to{transform:rotate(360deg)}}',
        '@keyframes gameStickerSparkle{0%,100%{transform:scale(.9) rotate(-8deg);opacity:.86}50%{transform:scale(1.13) rotate(8deg);opacity:1}}',
        '@keyframes gameStickerPop{0%{opacity:0;transform:translateY(-10px) rotate(-10deg) scale(1.72)}34%{opacity:1;transform:translateY(8px) rotate(3deg) scale(.9)}62%{opacity:1;transform:translateY(-5px) rotate(-7deg) scale(1.09)}100%{opacity:1;transform:translateY(0) rotate(-5deg) scale(1)}}',
        '@keyframes gameStickerPopShop{0%{opacity:0;transform:translateY(-12px) rotate(-10deg) scale(1.78)}28%{opacity:1;transform:translateY(8px) rotate(4deg) scale(.92)}58%{opacity:1;transform:translateY(-6px) rotate(-7deg) scale(1.12)}82%{opacity:1;transform:translateY(2px) rotate(-4deg) scale(1.02)}100%{opacity:1;transform:translateY(0) rotate(-5deg) scale(1)}}',
        '@keyframes gameStickerPieceGlow{0%,100%{box-shadow:0 0 0 1px rgba(150,102,45,.14),0 0 24px rgba(255,255,255,.74)}50%{box-shadow:0 0 0 3px rgba(255,235,150,.55),0 0 42px rgba(255,239,175,.95)}}',
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
        var url = _rootPrefix() + 'Prototypes/StickerBookThreeJS/?surface=cover';
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

    if (_isGameCompletionOnly(options)) {
      var completionResult = _completionOnlyResult(options);
      _queuePending(completionResult);
      _dispatch(completionResult);
      if (typeof options.onClose === 'function') {
        window.setTimeout(function () {
          try { options.onClose(completionResult); } catch (e) {}
        }, 0);
      }
      return Promise.resolve(completionResult);
    }

    return loadCatalog().then(function (catalog) {
      var page = catalog && catalog.pages && catalog.pages[gameId];
      if (!page) return null;
      if (_isPageLocked(page)) return null;

      // tier v3: 明示的な stickerId 指定 (admin/debug 経由等) が tier ロック中の場合は、
      // 別シールへの黙示フォールバックをせず、そのまま skip + warn する (誤って別シールを
      // 渡してしまうと呼び出し元の意図と食い違う事故になるため)。
      if (options.stickerId) {
        var requestedSticker = null;
        var allPageStickers = page.stickers || [];
        for (var ri = 0; ri < allPageStickers.length; ri++) {
          if (allPageStickers[ri].id === options.stickerId) { requestedSticker = allPageStickers[ri]; break; }
        }
        if (requestedSticker && !_isStickerTierUnlocked(requestedSticker.tier)) {
          try { console.warn('[game-stickers] grant skipped (tier locked):', requestedSticker.id, requestedSticker.tier); } catch (e) {}
          return null;
        }
      }

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

  function grantAllOnPage(gameId, options) {
    options = options || {};
    if (!gameId) return Promise.resolve(null);
    return loadCatalog().then(function (catalog) {
      var page = catalog && catalog.pages && catalog.pages[gameId];
      if (!page || _isPageLocked(page)) return null;
      var stickers = Array.isArray(page.stickers) ? page.stickers : [];
      var state = _state();
      var pageState = _pageState(state, gameId);
      var now = Date.now();
      var added = [];
      stickers.forEach(function (sticker) {
        if (!sticker || !sticker.id) return;
        if (!_isStickerTierUnlocked(sticker.tier)) {
          try { console.warn('[game-stickers] grantAllOnPage skipped (tier locked):', sticker.id, sticker.tier); } catch (e) {}
          return;
        }
        if (options.event && !_eventMatches(sticker, options.event)) return;
        var current = pageState.owned[sticker.id];
        if (current && current.count > 0 && options.increment !== true) return;
        current = current || { count: 0, firstAt: now };
        current.count = (current.count || 0) + 1;
        current.lastAt = now;
        current.name = sticker.name || '';
        pageState.owned[sticker.id] = current;
        added.push({
          gameId: gameId,
          stickerId: sticker.id,
          sticker: sticker,
          page: page,
          count: current.count,
          first: current.count === 1,
          event: options.event || 'book_bonus',
          ts: now
        });
      });
      if (added.length) {
        _saveState(state);
        window.dispatchEvent(new CustomEvent('pono-game-sticker-bonus-granted', {
          detail: { gameId: gameId, results: added, count: added.length }
        }));
      }
      return {
        gameId: gameId,
        page: page,
        results: added,
        count: added.length,
        ts: now
      };
    }).catch(function (error) {
      try { console.warn('[game-stickers] grant page failed:', error); } catch (e) {}
      return null;
    });
  }

  function grantBookBonus(options) {
    options = options || {};
    options.event = options.event || 'book_bonus';
    return grantAllOnPage(BOOK_BONUS_GAME_ID, options);
  }

  // tier v3: welcome 演出で「book 付録シールをまとめて grant」する専用エントリポイント。
  // 実体は grantBookBonus と同じ (book-bonus ページの全シールに対する grantAllOnPage) だが、
  // play.html 側の呼び出し意図を明確にするため別名で公開する。
  function grantBookExclusiveStickers(options) {
    return grantBookBonus(options);
  }

  // tier v3: 特定シール id の tier ("book_exclusive" | "app_exclusive" | "free") を
  // カタログ全ページから検索して返す。 見つからない場合は null。
  // 使い方 (Track C / play.html 側):
  //   PonoGameStickers.getStickerTier('book_bonus_wave_greeting').then(function (tier) { ... });
  function getStickerTier(id) {
    if (!id) return Promise.resolve(null);
    return loadCatalog().then(function (catalog) {
      var pages = (catalog && catalog.pages) || {};
      for (var gameId in pages) {
        if (!Object.prototype.hasOwnProperty.call(pages, gameId)) continue;
        var stickers = pages[gameId].stickers || [];
        for (var i = 0; i < stickers.length; i++) {
          if (stickers[i] && stickers[i].id === id) return stickers[i].tier || 'free';
        }
      }
      return null;
    }).catch(function () { return null; });
  }

  // tier v3: 現在の tier で指定 tier タグが解放されているか同期判定する
  // (デイリーガチャの抽選母数フィルタ等、 catalog を既に取得済みの呼び出し元向け)。
  // 使い方: PonoGameStickers.isStickerTierUnlocked(sticker.tier)
  function isStickerTierUnlocked(tier) {
    return _isStickerTierUnlocked(tier);
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

  window.addEventListener('pono-acorns-changed', function (event) {
    var detail = event && event.detail ? event.detail : {};
    var delta = (typeof detail.delta === 'number') ? detail.delta : 0;
    var after = (typeof detail.after === 'number') ? detail.after : null;
    if (detail.suppressRewardModal) {
      try {
        if (typeof after === 'number') sessionStorage.setItem('pono_acorns_last_seen_v1', String(after | 0));
      } catch (e) {}
      return;
    }
    if (delta > 0) _showAcornRewardModal(delta, after);
  });

  window.PonoGameStickers = {
    loadCatalog: loadCatalog,
    resolveAsset: resolveAsset,
    grant: grant,
    grantBookBonus: grantBookBonus,
    grantBookExclusiveStickers: grantBookExclusiveStickers,
    grantAllOnPage: grantAllOnPage,
    getStickerTier: getStickerTier,
    isStickerTierUnlocked: isStickerTierUnlocked,
    getState: getState,
    getOwned: getOwned,
    consumePending: consumePending,
    showStickerToast: showStickerToast
  };
})();
