// common/rating-modal.js
// 5つ星評価モーダル共通コンポーネント (PonoRatingModal)
//
// 全ゲーム共通で「きょうのあそび、どうだった？」 評価モーダルを表示。
// first-clear.js の triggerFirstClearReward 連鎖、 タイトル画面、 LP の
// 「ごかんそう」 ボタン等から呼ばれる。
//
// 子供の没入を切らない 4 ゲート:
//   1. 既評価チェック (pono_rating_<gameId> あれば skip)
//   2. 7日クールダウン (pono_rating_skip_<gameId>)
//   3. 累積3回プレイ (pono_rating_play_count >= 3)
//   4. 50% 確率 (Math.random() >= 0.5 で skip)
//
// 使い方:
//   PonoRating.maybeShowAfterClear('maze');  // gated 表示
//   PonoRating.openFromTitle();              // gate 無視
//   PonoRating.openFromLP();                 // gate 無視 / gameId=null
//
// 依存:
//   - window.PONO_FEEDBACK_FORMS_URL  (Forms URL; play.html で inject)
//   - window.PONO_FEEDBACK_FORMS_FIELDS = {anon_sid, dfp, last_star, play_sum, ref}
//
(function (window, document) {
  'use strict';

  // ---- 定数 ----------------------------------------------------------
  var COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 日
  var PLAY_COUNT_THRESHOLD = 3;
  var SHOW_PROBABILITY = 0.5;
  var THANKS_AUTO_HIDE_MS = 1500;
  var HISTORY_LIMIT = 50;
  var RATING_SCHEMA_VERSION = 1;

  // ---- localStorage キー ---------------------------------------------
  var LS_KEY_RATING_PREFIX = 'pono_rating_';
  var LS_KEY_SKIP_PREFIX = 'pono_rating_skip_';
  var LS_KEY_PLAY_COUNT = 'pono_rating_play_count';
  var LS_KEY_HISTORY = 'pono_rating_history';
  var LS_KEY_DFP = 'pono_rating_dfp';
  var LS_KEY_FIRST_VISIT = 'pono_first_visit_at';
  var SS_KEY_ANON_SID = 'pono_anon_sid';

  // ---- safe storage --------------------------------------------------
  function lsGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function lsSet(key, val) {
    try { window.localStorage.setItem(key, val); return true; } catch (e) { return false; }
  }
  function ssGet(key) {
    try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function ssSet(key, val) {
    try { window.sessionStorage.setItem(key, val); return true; } catch (e) { return false; }
  }

  function nowMs() { return Date.now(); }

  // ---- anon_sid (sessionStorage; 8文字 nanoid) ------------------------
  function getAnonSid() {
    var sid = ssGet(SS_KEY_ANON_SID);
    if (sid && sid.length === 8) return sid;
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var out = '';
    try {
      var arr = new Uint8Array(8);
      (window.crypto || window.msCrypto).getRandomValues(arr);
      for (var i = 0; i < 8; i++) out += alphabet[arr[i] % alphabet.length];
    } catch (e) {
      for (var j = 0; j < 8; j++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    ssSet(SS_KEY_ANON_SID, out);
    return out;
  }

  // ---- dfp (UA + screen + timezone の SHA-256 先頭12文字 hex) --------
  // localStorage に cache。 計算は async (SubtleCrypto)。 取得未完了時は
  // 空文字を返す (Forms URL で空欄になるだけで致命的ではない)。
  function getDfpSync() {
    return lsGet(LS_KEY_DFP) || '';
  }
  function ensureDfp() {
    if (lsGet(LS_KEY_DFP)) return;
    if (!window.crypto || !window.crypto.subtle) return;
    try {
      var ua = (window.navigator && window.navigator.userAgent) || '';
      var scr = window.screen
        ? (window.screen.width + 'x' + window.screen.height + 'x' + (window.screen.colorDepth || 0))
        : '';
      var tz = '';
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { tz = ''; }
      var buf = new TextEncoder().encode(ua + '|' + scr + '|' + tz);
      window.crypto.subtle.digest('SHA-256', buf).then(function (digest) {
        var view = new Uint8Array(digest);
        var hex = '';
        for (var i = 0; i < view.length; i++) {
          var h = view[i].toString(16);
          if (h.length === 1) h = '0' + h;
          hex += h;
        }
        lsSet(LS_KEY_DFP, hex.slice(0, 12));
      }).catch(function () { /* noop */ });
    } catch (e) { /* noop */ }
  }

  // ---- first_visit_at -----------------------------------------------
  function ensureFirstVisit() {
    if (!lsGet(LS_KEY_FIRST_VISIT)) {
      lsSet(LS_KEY_FIRST_VISIT, String(nowMs()));
    }
  }

  // ---- rating storage ------------------------------------------------
  function hasRated(gameId) {
    if (!gameId) return false;
    return !!lsGet(LS_KEY_RATING_PREFIX + gameId);
  }

  function saveRating(gameId, stars) {
    if (!gameId) return;
    var n = stars | 0;
    if (n < 1 || n > 5) return;
    var payload = {
      v: RATING_SCHEMA_VERSION,
      stars: n,
      ts: nowMs(),
      sid: getAnonSid()
    };
    lsSet(LS_KEY_RATING_PREFIX + gameId, JSON.stringify(payload));

    // history FIFO 50
    var hist = [];
    try {
      var raw = lsGet(LS_KEY_HISTORY);
      if (raw) hist = JSON.parse(raw) || [];
      if (!Array.isArray(hist)) hist = [];
    } catch (e) { hist = []; }
    hist.push({ gameId: gameId, stars: n, ts: payload.ts });
    if (hist.length > HISTORY_LIMIT) {
      hist = hist.slice(hist.length - HISTORY_LIMIT);
    }
    try { lsSet(LS_KEY_HISTORY, JSON.stringify(hist)); } catch (e) { /* noop */ }
  }

  function setSkip(gameId) {
    if (!gameId) return;
    lsSet(LS_KEY_SKIP_PREFIX + gameId, String(nowMs() + COOLDOWN_MS));
  }

  function isWithinCooldown(gameId) {
    if (!gameId) return false;
    var raw = lsGet(LS_KEY_SKIP_PREFIX + gameId);
    if (!raw) return false;
    var until = parseInt(raw, 10);
    if (!isFinite(until)) return false;
    return nowMs() < until;
  }

  function incrementPlayCount() {
    var cur = parseInt(lsGet(LS_KEY_PLAY_COUNT) || '0', 10);
    if (!isFinite(cur)) cur = 0;
    cur += 1;
    lsSet(LS_KEY_PLAY_COUNT, String(cur));
    return cur;
  }

  function getPlayCount() {
    var cur = parseInt(lsGet(LS_KEY_PLAY_COUNT) || '0', 10);
    return isFinite(cur) ? cur : 0;
  }

  // ---- Forms URL builder --------------------------------------------
  // ref: 'post_rating_5star' | 'title_button' | 'lp_button' 等
  // opts: { gameId, stars }
  function buildFormsUrl(ref, opts) {
    var base = window.PONO_FEEDBACK_FORMS_URL || '';
    if (!base || base === '[PLACEHOLDER]') return '';
    opts = opts || {};
    var fields = window.PONO_FEEDBACK_FORMS_FIELDS || {};

    var params = [];
    function addField(entryId, value) {
      if (!entryId || value == null || value === '') return;
      params.push(encodeURIComponent(entryId) + '=' + encodeURIComponent(String(value)));
    }

    addField(fields.anon_sid, getAnonSid());
    addField(fields.dfp, getDfpSync());
    if (typeof opts.stars === 'number') {
      addField(fields.last_star, opts.stars);
    }
    addField(fields.play_sum, getPlayCount());
    addField(fields.ref, ref || '');

    if (!params.length) return base;
    var sep = base.indexOf('?') === -1 ? '?' : '&';
    return base + sep + params.join('&');
  }

  // ---- utility -------------------------------------------------------
  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  // ---- PonoRatingModal class ----------------------------------------
  function PonoRatingModal(opts) {
    if (!(this instanceof PonoRatingModal)) {
      return new PonoRatingModal(opts);
    }
    opts = opts || {};
    this.gameId = opts.gameId || null;  // null OK (LP/title)
    this.onDismiss = typeof opts.onDismiss === 'function' ? opts.onDismiss : null;
    this.parent = opts.parent || document.body;

    this._overlay = null;
    this._panel = null;
    this._closeBtn = null;
    this._starsWrap = null;
    this._starBtns = [];
    this._thanksEl = null;
    this._ctaEl = null;
    this._ctaBtn = null;
    this._laterBtn = null;

    this._isShown = false;
    this._prevActive = null;
    this._resolveShow = null;
    this._showPromise = null;
    this._keydownHandler = null;
    this._overlayClickHandler = null;
    this._focusInHandler = null;
    this._thanksTimer = 0;
    this._selectedStars = 0;
    this._didSelect = false;
  }

  PonoRatingModal.prototype._buildDom = function () {
    var overlay = document.createElement('div');
    overlay.className = 'pono-rating-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'pono-rating-title');

    var panel = document.createElement('div');
    panel.className = 'pono-rating-panel';

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'pono-rating-close';
    closeBtn.setAttribute('aria-label', '閉じる');
    closeBtn.textContent = '×';
    panel.appendChild(closeBtn);

    var title = document.createElement('h2');
    title.id = 'pono-rating-title';
    title.className = 'pono-rating-kicker';
    title.textContent = 'きょうのあそび、どうだった？';
    panel.appendChild(title);

    var starsWrap = document.createElement('div');
    starsWrap.className = 'pono-rating-stars';
    starsWrap.setAttribute('role', 'radiogroup');
    starsWrap.setAttribute('aria-label', '5段階評価');

    var starBtns = [];
    for (var i = 1; i <= 5; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pono-rating-star';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.setAttribute('aria-label', i + 'つ星');
      btn.setAttribute('data-stars', String(i));
      btn.textContent = '★';
      starsWrap.appendChild(btn);
      starBtns.push(btn);
    }
    panel.appendChild(starsWrap);

    var thanks = document.createElement('div');
    thanks.className = 'pono-rating-thanks';
    thanks.setAttribute('aria-live', 'polite');
    thanks.hidden = true;
    thanks.textContent = 'ありがとう！';
    panel.appendChild(thanks);

    var cta = document.createElement('div');
    cta.className = 'pono-rating-cta';
    cta.hidden = true;
    var ctaBtn = document.createElement('button');
    ctaBtn.type = 'button';
    ctaBtn.className = 'pono-rating-forms-btn';
    ctaBtn.textContent = 'もっとお声を聞かせる →';
    cta.appendChild(ctaBtn);
    panel.appendChild(cta);

    var laterBtn = document.createElement('button');
    laterBtn.type = 'button';
    laterBtn.className = 'pono-rating-later';
    laterBtn.textContent = 'あとで';
    panel.appendChild(laterBtn);

    overlay.appendChild(panel);

    this._overlay = overlay;
    this._panel = panel;
    this._closeBtn = closeBtn;
    this._starsWrap = starsWrap;
    this._starBtns = starBtns;
    this._thanksEl = thanks;
    this._ctaEl = cta;
    this._ctaBtn = ctaBtn;
    this._laterBtn = laterBtn;
  };

  PonoRatingModal.prototype._bindEvents = function () {
    var self = this;

    this._overlayClickHandler = function (ev) {
      if (ev.target === self._overlay) {
        self._handleDismiss();
      }
    };
    this._overlay.addEventListener('click', this._overlayClickHandler);

    this._closeBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      self._handleDismiss();
    });

    this._laterBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      self._handleDismiss();
    });

    for (var i = 0; i < this._starBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var stars = parseInt(btn.getAttribute('data-stars'), 10);
          if (stars >= 1 && stars <= 5) {
            self._handleStarSelect(stars);
          }
        });
        // hover/focus で連動ハイライト
        btn.addEventListener('mouseenter', function () {
          if (self._didSelect) return;
          self._previewStars(parseInt(btn.getAttribute('data-stars'), 10));
        });
        btn.addEventListener('focus', function () {
          if (self._didSelect) return;
          self._previewStars(parseInt(btn.getAttribute('data-stars'), 10));
        });
      })(this._starBtns[i]);
    }
    this._starsWrap.addEventListener('mouseleave', function () {
      if (self._didSelect) return;
      self._previewStars(0);
    });

    this._ctaBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var url = buildFormsUrl('post_rating_5star', {
        gameId: self.gameId,
        stars: self._selectedStars
      });
      if (url) {
        try { window.open(url, '_blank', 'noopener'); } catch (e) { /* noop */ }
      }
      self.hide();
    });

    this._keydownHandler = function (ev) {
      if (!self._isShown) return;
      if (ev.key === 'Escape' || ev.keyCode === 27) {
        ev.preventDefault();
        self._handleDismiss();
        return;
      }
      if (ev.key === 'Tab' || ev.keyCode === 9) {
        ev.preventDefault();
        var focusables = self._getFocusables();
        if (!focusables.length) return;
        var active = null;
        try { active = document.activeElement; } catch (e) { active = null; }
        var idx = focusables.indexOf(active);
        var next;
        if (ev.shiftKey) {
          next = idx <= 0 ? focusables[focusables.length - 1] : focusables[idx - 1];
        } else {
          next = (idx === -1 || idx >= focusables.length - 1)
            ? focusables[0]
            : focusables[idx + 1];
        }
        try { next.focus(); } catch (e) { /* noop */ }
      }
    };
    document.addEventListener('keydown', this._keydownHandler, true);

    this._focusInHandler = function (ev) {
      if (!self._isShown || !self._overlay) return;
      if (!self._overlay.contains(ev.target)) {
        var focusables = self._getFocusables();
        var target = focusables[0] || self._closeBtn;
        try { if (target) target.focus(); } catch (e) { /* noop */ }
      }
    };
    document.addEventListener('focusin', this._focusInHandler, true);
  };

  PonoRatingModal.prototype._getFocusables = function () {
    if (!this._overlay) return [];
    var sel = 'button:not([disabled]), [href], input:not([disabled]), ' +
              'select:not([disabled]), textarea:not([disabled]), ' +
              '[tabindex]:not([tabindex="-1"])';
    var nodes;
    try {
      nodes = this._overlay.querySelectorAll(sel);
    } catch (e) {
      return this._closeBtn ? [this._closeBtn] : [];
    }
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      // hidden 内の要素は除外
      var parent = el.parentNode;
      var isHidden = false;
      while (parent && parent !== this._overlay) {
        if (parent.hidden) { isHidden = true; break; }
        parent = parent.parentNode;
      }
      if (isHidden) continue;
      if (el && (el.offsetParent !== null || el === this._closeBtn)) {
        out.push(el);
      }
    }
    if (!out.length && this._closeBtn) out.push(this._closeBtn);
    return out;
  };

  PonoRatingModal.prototype._previewStars = function (n) {
    for (var i = 0; i < this._starBtns.length; i++) {
      var idx = i + 1;
      if (idx <= n) {
        this._starBtns[i].classList.add('is-preview');
      } else {
        this._starBtns[i].classList.remove('is-preview');
      }
    }
  };

  PonoRatingModal.prototype._handleStarSelect = function (stars) {
    if (this._didSelect) return;
    this._didSelect = true;
    this._selectedStars = stars;

    // 視覚反映
    for (var i = 0; i < this._starBtns.length; i++) {
      var idx = i + 1;
      var btn = this._starBtns[i];
      btn.classList.remove('is-preview');
      if (idx <= stars) {
        btn.classList.add('is-selected');
        btn.setAttribute('aria-checked', idx === stars ? 'true' : 'false');
      } else {
        btn.classList.remove('is-selected');
        btn.setAttribute('aria-checked', 'false');
      }
      btn.disabled = true;
    }

    // 保存 (gameId が無いときは履歴のみ; key prefix が無いので _no_id を使う)
    var gid = this.gameId || '_no_id';
    saveRating(gid, stars);

    // 「ありがとう！」 表示
    this._thanksEl.hidden = false;

    if (stars >= 4) {
      // ★4以上: CTA を表示。 「あとで」 ボタンは残す。 auto-hide はしない。
      this._ctaEl.hidden = false;
      // CTA ボタンにフォーカス移動 (キーボード操作の自然な流れ)
      var self = this;
      setTimeout(function () {
        try { self._ctaBtn.focus(); } catch (e) { /* noop */ }
      }, 60);
    } else {
      // ★1-3: 1.5秒後に自動で閉じる (skip cooldown は付けない: もう評価したので)
      var that = this;
      this._thanksTimer = window.setTimeout(function () {
        that.hide();
      }, THANKS_AUTO_HIDE_MS);
    }
  };

  // 評価せずに閉じた場合は cooldown を立てる
  PonoRatingModal.prototype._handleDismiss = function () {
    if (!this._didSelect && this.gameId) {
      setSkip(this.gameId);
    }
    this.hide();
  };

  PonoRatingModal.prototype.show = function () {
    var self = this;
    if (this._isShown && this._showPromise) return this._showPromise;

    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
    }
    this._overlay = null;

    this._didSelect = false;
    this._selectedStars = 0;

    this._buildDom();
    this._bindEvents();

    var parent = this.parent || document.body;
    parent.appendChild(this._overlay);

    try { this._prevActive = document.activeElement; } catch (e) { this._prevActive = null; }
    this._isShown = true;

    this._showPromise = new Promise(function (resolve) {
      self._resolveShow = resolve;
    });

    // reflow → animated クラス付与 (prefers-reduced-motion 時は --static)
    /* eslint-disable no-unused-expressions */
    this._overlay.offsetWidth;
    /* eslint-enable no-unused-expressions */

    if (prefersReducedMotion()) {
      this._overlay.classList.add('pono-rating-modal--static');
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (self._overlay) {
            self._overlay.classList.add('pono-rating-modal--animated');
          }
        });
      });
    }

    // 1番目の星にフォーカス (close ではなく ★ にすると即操作可)
    try {
      if (this._starBtns[0]) this._starBtns[0].focus();
      else this._closeBtn.focus();
    } catch (e) { /* noop */ }

    return this._showPromise;
  };

  PonoRatingModal.prototype.hide = function () {
    if (!this._isShown) return;
    this._isShown = false;

    if (this._thanksTimer) {
      clearTimeout(this._thanksTimer);
      this._thanksTimer = 0;
    }

    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler, true);
      this._keydownHandler = null;
    }
    if (this._focusInHandler) {
      document.removeEventListener('focusin', this._focusInHandler, true);
      this._focusInHandler = null;
    }
    this._overlayClickHandler = null;

    if (this._overlay) {
      this._overlay.classList.remove('pono-rating-modal--animated');
      if (this._overlay.parentNode) {
        this._overlay.parentNode.removeChild(this._overlay);
      }
    }

    if (this._prevActive && typeof this._prevActive.focus === 'function') {
      try { this._prevActive.focus(); } catch (e) { /* noop */ }
    }
    this._prevActive = null;

    if (this.onDismiss) {
      try { this.onDismiss(); } catch (e) { /* noop */ }
    }

    if (this._resolveShow) {
      try { this._resolveShow(); } catch (e) { /* noop */ }
      this._resolveShow = null;
    }
    this._showPromise = null;

    this._overlay = null;
    this._panel = null;
    this._closeBtn = null;
    this._starsWrap = null;
    this._starBtns = [];
    this._thanksEl = null;
    this._ctaEl = null;
    this._ctaBtn = null;
    this._laterBtn = null;
  };

  // ---- 公開 API -----------------------------------------------------
  // 4ゲートを通過したら表示する。 解決値は true (表示した) / false (skip)
  function maybeShowAfterClear(gameId) {
    ensureDfp();
    ensureFirstVisit();
    // play_count はゲーム完了時に呼ばれる前提なので、 ここで increment する。
    var count = incrementPlayCount();

    if (!gameId) return Promise.resolve(false);

    // Gate 1: 既評価
    if (hasRated(gameId)) return Promise.resolve(false);
    // Gate 2: cooldown
    if (isWithinCooldown(gameId)) return Promise.resolve(false);
    // Gate 3: 累積 3 回プレイ
    if (count < PLAY_COUNT_THRESHOLD) return Promise.resolve(false);
    // Gate 4: 50% 確率
    if (Math.random() >= SHOW_PROBABILITY) return Promise.resolve(false);

    var modal = new PonoRatingModal({ gameId: gameId });
    return modal.show().then(function () { return true; });
  }

  function openFromTitle() {
    ensureDfp();
    ensureFirstVisit();
    var modal = new PonoRatingModal({ gameId: null });
    return modal.show();
  }

  function openFromLP() {
    ensureDfp();
    ensureFirstVisit();
    var modal = new PonoRatingModal({ gameId: null });
    return modal.show();
  }

  // 初期化 (sid/dfp/first_visit を事前確保)
  ensureDfp();
  ensureFirstVisit();
  getAnonSid();

  // 露出
  window.PonoRating = {
    maybeShowAfterClear: maybeShowAfterClear,
    openFromTitle: openFromTitle,
    openFromLP: openFromLP,
    saveRating: saveRating,
    hasRated: hasRated,
    buildFormsUrl: buildFormsUrl
  };
  window.PonoRatingModal = PonoRatingModal;
})(window, document);
