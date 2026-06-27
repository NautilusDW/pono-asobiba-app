// common/acorn-modal.js
// どんぐりリワード共通モーダル基底クラス (PonoAcornModal)
// 全ゲーム共通で 「どんぐりを ゲット」 演出を出すための再利用可能 UI。
//
// 依存:
//   - window.PonoAcornCopy  (なければ内部 default を使う)
//   - window.PonoAcornAudio (なければ無音; hard requirement にはしない)
//
// 使い方:
//   const modal = new PonoAcornModal({
//     gameId: 'maze',
//     granted: 5,
//     dailyTotal: 5,
//     dailyCap: 5,
//     state: 'idle' | 'capped' | 'perfect',
//     copy: undefined,
//     iconSrc: undefined,
//     autoHide: 4200,
//     onDismiss: () => {},
//     parent: document.body,
//   });
//   modal.show();   // Promise<void> 解決は dismiss 時
//   modal.hide();
//
// 非モジュール ES script 想定で window.PonoAcornModal に露出する。
(function (window, document) {
  'use strict';

  var DEFAULT_AUTOHIDE_MS = 4200;
  var REDUCED_AUTOHIDE_MS = 2500;
  var DEFAULT_ICON_SRC =
    'assets/shop/donguri_shop_acorn_icon_20260626.png';

  // ---- copy fallback ----------------------------------------------------
  // PonoAcornCopy が無いときに使う最低限の文言 catalog。
  // 実際の本文は common/acorn-copy.js (= window.PonoAcornCopy) 側で確定する。
  var DEFAULT_COPY = {
    idle: {
      kicker: 'やったね！',
      label: 'どんぐりを ゲットしたよ',
      ariaLabel: 'どんぐりを ゲット'
    },
    capped: {
      kicker: 'おしまい！',
      label: 'きょうのぶんは いっぱいだよ',
      ariaLabel: 'どんぐり きょうのぶんは いっぱい'
    },
    perfect: {
      kicker: 'パーフェクト！',
      label: 'すごい！どんぐりを ゲット！',
      ariaLabel: 'パーフェクト どんぐり ゲット'
    }
  };

  function resolveCopy(gameId, state, override) {
    if (override && typeof override === 'object') return override;
    var catalog = window.PonoAcornCopy;
    if (catalog && typeof catalog.get === 'function') {
      try {
        var fromCatalog = catalog.get(gameId, state);
        if (fromCatalog && typeof fromCatalog === 'object') {
          return fromCatalog;
        }
      } catch (e) {
        // fallthrough to default
      }
    }
    return DEFAULT_COPY[state] || DEFAULT_COPY.idle;
  }

  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  function playSafe(name) {
    var audio = window.PonoAcornAudio;
    if (!audio) return;
    try {
      if (typeof audio.play === 'function') {
        audio.play(name);
      } else if (typeof audio[name] === 'function') {
        audio[name]();
      }
    } catch (e) {
      // 音声は hard requirement ではない
    }
  }

  // ---- PonoAcornModal class --------------------------------------------
  function PonoAcornModal(opts) {
    if (!(this instanceof PonoAcornModal)) {
      return new PonoAcornModal(opts);
    }
    opts = opts || {};

    this.gameId = String(opts.gameId || 'unknown');
    this.granted = Math.max(0, opts.granted | 0);
    this.dailyTotal = Math.max(0, opts.dailyTotal | 0);
    this.dailyCap = Math.max(0, opts.dailyCap | 0);
    this.state = (opts.state === 'capped' || opts.state === 'perfect')
      ? opts.state
      : 'idle';
    this.copyOverride = opts.copy || null;
    this.iconSrc = opts.iconSrc || DEFAULT_ICON_SRC;
    this.autoHide = (typeof opts.autoHide === 'number' && opts.autoHide >= 0)
      ? opts.autoHide
      : DEFAULT_AUTOHIDE_MS;
    this.onDismiss = typeof opts.onDismiss === 'function'
      ? opts.onDismiss
      : null;
    this.parent = opts.parent || document.body;

    // runtime state
    this._overlay = null;
    this._panel = null;
    this._dismissBtn = null;
    this._amountEl = null;
    this._hideTimer = 0;
    this._isShown = false;
    this._prevActive = null;
    this._resolveShow = null;
    this._showPromise = null;
    this._keydownHandler = null;
    this._overlayClickHandler = null;
    this._focusInHandler = null;
  }

  PonoAcornModal.prototype._buildDom = function () {
    var copy = resolveCopy(this.gameId, this.state, this.copyOverride);

    var overlay = document.createElement('div');
    overlay.className = 'pono-acorn-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', copy.ariaLabel || 'どんぐりを ゲット');
    if (this.state === 'perfect') {
      overlay.classList.add('pono-acorn-modal--perfect');
    }
    if (this.state === 'capped') {
      overlay.classList.add('pono-acorn-modal--capped');
    }

    var panel = document.createElement('div');
    panel.className = 'pono-acorn-modal__panel';

    // dismiss (close) button
    var dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'pono-acorn-modal__dismiss';
    dismissBtn.setAttribute('aria-label', 'とじる');
    dismissBtn.textContent = '×'; // ×
    panel.appendChild(dismissBtn);

    // kicker
    var kicker = document.createElement('div');
    kicker.className = 'pono-acorn-modal__kicker';
    kicker.textContent = copy.kicker || '';
    panel.appendChild(kicker);

    // bottom row (label + amount)
    var bottom = document.createElement('div');
    bottom.className = 'pono-acorn-modal__bottom';

    var label = document.createElement('div');
    label.className = 'pono-acorn-modal__label';
    label.textContent = copy.label || '';
    bottom.appendChild(label);

    var amount = document.createElement('div');
    amount.className = 'pono-acorn-modal__amount';
    amount.setAttribute(
      'aria-label',
      'どんぐり ' + this.granted + 'こ'
    );

    var icon = document.createElement('img');
    icon.className = 'pono-acorn-modal__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.alt = '';
    icon.src = this.iconSrc;
    amount.appendChild(icon);

    var amountText = document.createElement('div');
    amountText.className = 'pono-acorn-modal__amount-text';

    var multSpan = document.createElement('span');
    multSpan.className = 'pono-acorn-modal__amount-mult';
    multSpan.setAttribute('aria-hidden', 'true');
    multSpan.textContent = '×'; // ×
    amountText.appendChild(multSpan);

    var numSpan = document.createElement('span');
    numSpan.className = 'pono-acorn-modal__amount-num';
    numSpan.setAttribute('data-acorn-amount', '');
    numSpan.textContent = String(this.granted);
    amountText.appendChild(numSpan);

    amount.appendChild(amountText);
    bottom.appendChild(amount);

    panel.appendChild(bottom);

    // daily progress (optional, only when dailyCap > 0)
    if (this.dailyCap > 0) {
      var progress = document.createElement('div');
      progress.className = 'pono-acorn-modal__progress';
      progress.setAttribute('aria-hidden', 'true');
      progress.textContent =
        'きょう ' + this.dailyTotal + ' / ' + this.dailyCap;
      panel.appendChild(progress);
    }

    overlay.appendChild(panel);

    this._overlay = overlay;
    this._panel = panel;
    this._dismissBtn = dismissBtn;
    this._amountEl = numSpan;
  };

  PonoAcornModal.prototype._bindEvents = function () {
    var self = this;

    this._overlayClickHandler = function (ev) {
      if (ev.target === self._overlay) {
        self.hide();
      }
    };
    this._overlay.addEventListener('click', this._overlayClickHandler);

    this._dismissBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      self.hide();
    });

    this._keydownHandler = function (ev) {
      if (!self._isShown) return;
      if (ev.key === 'Escape' || ev.keyCode === 27) {
        ev.preventDefault();
        self.hide();
        return;
      }
      // focus trap: Tab を panel 内に閉じ込める
      if (ev.key === 'Tab' || ev.keyCode === 9) {
        // 現状フォーカス可能な要素は dismissBtn のみ。常にそこへ戻す。
        ev.preventDefault();
        try { self._dismissBtn.focus(); } catch (e) { /* noop */ }
      }
    };
    document.addEventListener('keydown', this._keydownHandler, true);

    // focus trap (補助): フォーカスが overlay 外に逃げたら戻す
    this._focusInHandler = function (ev) {
      if (!self._isShown || !self._overlay) return;
      if (!self._overlay.contains(ev.target)) {
        try { self._dismissBtn.focus(); } catch (e) { /* noop */ }
      }
    };
    document.addEventListener('focusin', this._focusInHandler, true);
  };

  PonoAcornModal.prototype._unbindEvents = function () {
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler, true);
      this._keydownHandler = null;
    }
    if (this._focusInHandler) {
      document.removeEventListener('focusin', this._focusInHandler, true);
      this._focusInHandler = null;
    }
    // overlay/dismiss handlers は overlay ごと remove するので不要
    this._overlayClickHandler = null;
  };

  PonoAcornModal.prototype.show = function () {
    var self = this;

    // 冪等: 既に表示中なら同じ Promise を返す
    if (this._isShown && this._showPromise) {
      return this._showPromise;
    }

    // 既に DOM があれば一旦剥がして作り直す (state/granted を新規反映するため)
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
    }
    this._overlay = null;
    this._panel = null;
    this._dismissBtn = null;
    this._amountEl = null;

    this._buildDom();
    this._bindEvents();

    var parent = this.parent || document.body;
    parent.appendChild(this._overlay);

    // 直前のアクティブ要素を記録 (hide 時にフォーカス復帰)
    try {
      this._prevActive = document.activeElement;
    } catch (e) {
      this._prevActive = null;
    }

    this._isShown = true;

    this._showPromise = new Promise(function (resolve) {
      self._resolveShow = resolve;
    });

    // reflow → rAF x2 → animated クラス付与 (quizland 流の確実発動)
    // prefers-reduced-motion 時は animated を付けても CSS 側で停止する想定。
    /* eslint-disable no-unused-expressions */
    this._overlay.offsetWidth;
    /* eslint-enable no-unused-expressions */

    if (prefersReducedMotion()) {
      // animated を付けない (CSS でも :not(.pono-acorn-modal--animated) は静的表示)
      this._overlay.classList.add('pono-acorn-modal--static');
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (self._overlay) {
            self._overlay.classList.add('pono-acorn-modal--animated');
          }
        });
      });
    }

    // 表示直後にフォーカスを dismiss button に
    try {
      this._dismissBtn.focus();
    } catch (e) {
      // noop
    }

    // 効果音 (hard requirement ではない)
    playSafe(this.state === 'perfect' ? 'perfect' : 'reward');

    // auto-hide
    var hideMs = prefersReducedMotion() ? REDUCED_AUTOHIDE_MS : this.autoHide;
    if (hideMs > 0) {
      this._hideTimer = window.setTimeout(function () {
        self.hide();
      }, hideMs);
    }

    return this._showPromise;
  };

  PonoAcornModal.prototype.hide = function () {
    if (!this._isShown) return;
    this._isShown = false;

    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = 0;
    }

    this._unbindEvents();

    if (this._overlay) {
      this._overlay.classList.remove('pono-acorn-modal--animated');
      if (this._overlay.parentNode) {
        this._overlay.parentNode.removeChild(this._overlay);
      }
    }

    // フォーカス復帰
    if (this._prevActive && typeof this._prevActive.focus === 'function') {
      try { this._prevActive.focus(); } catch (e) { /* noop */ }
    }
    this._prevActive = null;

    // onDismiss コールバック
    if (this.onDismiss) {
      try { this.onDismiss(); } catch (e) { /* noop */ }
    }

    // Promise<void> resolve
    if (this._resolveShow) {
      try { this._resolveShow(); } catch (e) { /* noop */ }
      this._resolveShow = null;
    }
    this._showPromise = null;

    // 次回 show() で作り直せるよう DOM 参照を解放
    this._overlay = null;
    this._panel = null;
    this._dismissBtn = null;
    this._amountEl = null;
  };

  // 露出
  window.PonoAcornModal = PonoAcornModal;
})(window, document);
