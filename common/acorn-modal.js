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
//     autoHide: 0,
//     onDismiss: () => {},
//     parent: document.body,
//   });
//   modal.show();   // Promise<void> 解決は dismiss 時
//   modal.hide();
//
// 非モジュール ES script 想定で window.PonoAcornModal に露出する。
(function (window, document) {
  'use strict';

  var DEFAULT_AUTOHIDE_MS = 0;
  var REDUCED_AUTOHIDE_MS = 0;
  // v1718: 各 game サブディレクトリから読まれるため、 document base 相対だと
  // /maze/assets/... の 404 を引く。 本スクリプト src を基点に site root prefix を
  // 算出して絶対 URL で解決する。
  function _rootPrefixFromScript() {
    try {
      var s = (document.currentScript && document.currentScript.src) || '';
      if (!s) {
        var scripts = document.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
          if (scripts[i].src && /acorn-modal\.js/.test(scripts[i].src)) {
            s = scripts[i].src;
            break;
          }
        }
      }
      var m = s.match(/^(.*?)common\/acorn-modal\.js/);
      if (m && m[1]) return m[1];
    } catch (e) {}
    return '';
  }
  var DEFAULT_ICON_SRC =
    _rootPrefixFromScript() + 'assets/ui/shop/donguri_shop_acorn_icon_20260626.png';

  // ---- copy fallback ----------------------------------------------------
  // PonoAcornCopy が無いときに使う最低限の文言 catalog。
  // 実際の本文は common/acorn-copy-loader.js が common/acorn-copy.json を
  // fetch して window.PonoAcornCopy.get(gameId, state) を露出する。
  // loader が未読込 / fetch 失敗時は下記 DEFAULT_COPY が使われる。
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

  // acorn-copy.json は { title, main, copy } の 3 フィールド schema、
  // 内部 DEFAULT_COPY は { kicker, label, ariaLabel } schema。
  // catalog から取れた値はここで内部 schema に正規化する。
  //
  //   title → kicker / ariaLabel フォールバック
  //   main  → label  / kicker フォールバック (title 欠落時)
  //   copy  → (補助; 現在の panel DOM では未使用)
  //   既に kicker/label/ariaLabel が入っていればそれを優先 (Phase 2+ 互換)。
  function normalizeCopy(raw, fallback) {
    var base = fallback || DEFAULT_COPY.idle;
    if (!raw || typeof raw !== 'object') return base;
    var kicker = raw.kicker || raw.title || base.kicker || '';
    var label = raw.label || raw.main || raw.copy || base.label || '';
    var ariaLabel = raw.ariaLabel || raw.title || label || base.ariaLabel || '';
    return {
      kicker: kicker,
      label: label,
      ariaLabel: ariaLabel
    };
  }

  function resolveCopy(gameId, state, override) {
    var fallback = DEFAULT_COPY[state] || DEFAULT_COPY.idle;
    var catalog = window.PonoAcornCopy;
    if (override && typeof override === 'object') {
      return normalizeCopy(override, fallback);
    }
    if (catalog && typeof catalog.get === 'function') {
      try {
        var fromCatalog = catalog.get(gameId, state);
        if (fromCatalog && typeof fromCatalog === 'object') {
          return normalizeCopy(fromCatalog, fallback);
        }
      } catch (e) {
        // fallthrough to default
      }
    }
    return fallback;
  }

  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  // playSafe(gameId, state)
  //  - PonoAcornAudio.play は (gameId, opts?) シグネチャで、
  //    gameId 未登録なら don.mp3 にフォールバックする。
  //  - state は 'perfect' のとき音量を少し上げる程度の hint として扱う。
  //    state 固有の SFX が欲しいゲームは acorn-audio.js 側で
  //    別 gameId として register すること。
  //  - 返り値: Promise<HTMLAudioElement|null>。 呼び出し側は無視可。
  //    PonoAcornAudio.play() 自身が autoplay reject を catch して resolve(null)
  //    するため、 ここで await/then しなくても安全 (silent fail)。
  function playSafe(gameId, state) {
    var audio = window.PonoAcornAudio;
    if (!audio || typeof audio.play !== 'function') {
      return Promise.resolve(null);
    }
    var opts = null;
    if (state === 'perfect') {
      opts = { volume: 0.6 };
    }
    try {
      var p = audio.play(gameId, opts);
      // PonoAcornAudio.play は常に Promise を返す契約だが、
      // 古い実装が undefined を返しても落ちないよう正規化する。
      return (p && typeof p.then === 'function') ? p : Promise.resolve(null);
    } catch (e) {
      // 音声は hard requirement ではない
      return Promise.resolve(null);
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
    // autoHide:
    //   - undefined        → DEFAULT_AUTOHIDE_MS (既定は自動 dismiss 無効)
    //   - 0 / null / false → 自動 dismiss 無効 (tap/ESC/× ボタンのみ)
    //                        prefers-reduced-motion 時の REDUCED_AUTOHIDE_MS
    //                        短縮も同様に適用しない (一貫性のため)
    //   - positive number  → そのままミリ秒として採用 (oto:4200 等)
    //   - 非数値/負値       → DEFAULT_AUTOHIDE_MS にフォールバック
    if (opts.autoHide === 0 || opts.autoHide === null || opts.autoHide === false) {
      this.autoHide = 0;
    } else if (typeof opts.autoHide === 'number' && opts.autoHide > 0) {
      this.autoHide = opts.autoHide;
    } else {
      this.autoHide = DEFAULT_AUTOHIDE_MS;
    }
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
    // SE 二重発火防止フラグ。 同一 show() 呼び出しで playSafe() を 2 回鳴らさない
    // ためのガード。 hide() で false に戻す (次回 show で 1 回鳴らす)。
    this._seFired = false;
  }

  PonoAcornModal.prototype._buildDom = function () {
    var copy = resolveCopy(this.gameId, this.state, this.copyOverride);

    var overlay = document.createElement('div');
    overlay.className = 'pono-acorn-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', copy.ariaLabel || 'どんぐりを ゲット');
    // data-game-id を overlay に伝搬し、 acorn-modal-shared.css の
    // [data-game-id="maze"] 等のゲーム別 override セレクタにマッチさせる。
    // 親 (html/body) に属性が無くても overlay 自身に乗せれば selector が解決する。
    if (this.gameId) {
      overlay.setAttribute('data-game-id', this.gameId);
    }
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
      // 明示的な handled フラグ: panel listener が後から bubble を拾っても
      // 二重 hide() しないように、 stopPropagation 失敗時の保険として機能する。
      ev.__ponoAcornDismissed = true;
      ev.stopPropagation();
      self.hide();
    });

    // tap-only mode (autoHide=0): panel 本体のタップでも dismiss する。
    // 通常の autoHide>0 では auto dismiss が走るので panel 自体は非反応のまま。
    // dismissBtn の click は stopPropagation + handled フラグで二重発火しない。
    if (this.autoHide === 0 && this._panel) {
      this._panel.addEventListener('click', function (ev) {
        // dismissBtn 経由は handled フラグ + stopPropagation 済み。
        // 将来 Phase 2 で panel 内部に child button が増えても、
        // child が ev.__ponoAcornDismissed = true を立てれば dismiss を抑止できる。
        if (ev.__ponoAcornDismissed) return;
        if (ev.target === self._dismissBtn ||
            (self._dismissBtn && self._dismissBtn.contains(ev.target))) {
          return;
        }
        self.hide();
      });
    }

    this._keydownHandler = function (ev) {
      if (!self._isShown) return;
      if (ev.key === 'Escape' || ev.keyCode === 27) {
        ev.preventDefault();
        self.hide();
        return;
      }
      // focus trap: Tab を panel 内に閉じ込める。
      // Phase 1 ではフォーカス可能要素は dismissBtn のみだが、
      // Phase 2+ で追加 (例: copy ボタン、 アクションボタン) されても
      // 自動で対応できるよう、 query で動的に取得する。
      if (ev.key === 'Tab' || ev.keyCode === 9) {
        ev.preventDefault();
        var focusables = self._getFocusables();
        if (!focusables.length) {
          try { self._dismissBtn.focus(); } catch (e) { /* noop */ }
          return;
        }
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

    // focus trap (補助): フォーカスが overlay 外に逃げたら最初の focusable に戻す
    this._focusInHandler = function (ev) {
      if (!self._isShown || !self._overlay) return;
      if (!self._overlay.contains(ev.target)) {
        var focusables = self._getFocusables();
        var target = focusables[0] || self._dismissBtn;
        try { if (target) target.focus(); } catch (e) { /* noop */ }
      }
    };
    document.addEventListener('focusin', this._focusInHandler, true);
  };

  // Overlay 内のフォーカス可能要素を順序通りに収集する。
  // Phase 1 では dismissBtn だけだが、 Phase 2 で button や [tabindex] が
  // 追加されても自動で trap 対象に含まれる。
  PonoAcornModal.prototype._getFocusables = function () {
    if (!this._overlay) return [];
    var sel = 'button:not([disabled]), [href], input:not([disabled]), ' +
              'select:not([disabled]), textarea:not([disabled]), ' +
              '[tabindex]:not([tabindex="-1"])';
    var nodes;
    try {
      nodes = this._overlay.querySelectorAll(sel);
    } catch (e) {
      return this._dismissBtn ? [this._dismissBtn] : [];
    }
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      // 表示中 (offsetParent !== null) のみ trap 対象に。
      // pointer-events:none パネル内のボタンは offsetParent が出ないことが
      // あるので、 dismissBtn は必ず含める保険を後段で入れる。
      if (el && (el.offsetParent !== null || el === this._dismissBtn)) {
        out.push(el);
      }
    }
    if (!out.length && this._dismissBtn) out.push(this._dismissBtn);
    return out;
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

    // SE は DOM 構築前に発火させる。
    //  - 呼び出し元 (puzzle/oto/bento 等の clear handler) は user gesture の
    //    callback 内で modal.show() を呼ぶ。 iOS Safari の autoplay policy は
    //    user gesture の同期 stack frame 内で audio.play() を呼べば許可する
    //    ため、 _buildDom() / appendChild / reflow の手前で playSafe() を
    //    呼んで gesture 連続性を最大化する。
    //  - _seFired ガードで同一 show() 内 2 重発火を防ぐ。
    //    hide() で false に戻すので 次回 show() では正常に鳴る。
    //  - playSafe() は Promise を返すが、 fire-and-forget で OK
    //    (autoplay reject は内部 catch で silent fail)。
    if (!this._seFired) {
      this._seFired = true;
      var _seP = playSafe(this.gameId, this.state);
      if (_seP && typeof _seP.catch === 'function') _seP.catch(function () {});
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
    // prefers-reduced-motion 時は --animated を付けず --static を付与。
    // CSS 側に .pono-acorn-modal--static の static 表示ルールあり。
    /* eslint-disable no-unused-expressions */
    this._overlay.offsetWidth;
    /* eslint-enable no-unused-expressions */

    if (prefersReducedMotion()) {
      // animated を付けない。 --static (CSS で animation:none + opacity:1) を付与。
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

    // 効果音は show() 冒頭 (_buildDom 前) で playSafe() 済み。
    // ここでは _seFired ガードにより 2 重発火しない設計。
    // 仮に _seFired === false (将来の改修で reset 経路ができた場合) でも、
    // 念のため再試行する保険を残す: user gesture context 外なら autoplay
    // reject されるだけで silent fail (副作用なし)。
    if (!this._seFired) {
      this._seFired = true;
      var _seP = playSafe(this.gameId, this.state);
      if (_seP && typeof _seP.catch === 'function') _seP.catch(function () {});
    }

    // auto-hide
    //  - this.autoHide === 0 のときは setTimeout を一切発火させず、
    //    prefers-reduced-motion 時の REDUCED_AUTOHIDE_MS 短縮も適用しない。
    //    (tap/ESC/× のみで dismiss する maze 等の tap-only UX に対応)
    //  - positive のときのみ、 prefers-reduced-motion なら短縮版を使う。
    if (this.autoHide > 0) {
      var hideMs = prefersReducedMotion() ? REDUCED_AUTOHIDE_MS : this.autoHide;
      if (hideMs > 0) {
        this._hideTimer = window.setTimeout(function () {
          self.hide();
        }, hideMs);
      }
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
    // 次回 show() で SE を 1 回だけ確実に鳴らすため、 ガードを解除する
    this._seFired = false;
  };

  // 露出
  window.PonoAcornModal = PonoAcornModal;
})(window, document);
