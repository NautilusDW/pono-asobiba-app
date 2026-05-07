// layout-system.js — public entry (Phase B).
// Public API: window.LayoutSystem.{ init, loadEditor, version }
//
// Always loads layout-applier.js for render-only behavior. Lazy-loads
// layout-editor.js + layout-editor.css only when shouldEnableEditor() is true.
//
// Page authors target this two-line opt-in (per architecture doc):
//   <link rel="stylesheet" href="../common/layout/layout-shared.css">
//   <script src="../common/layout/layout-system.js" defer></script>
//   <script>LayoutSystem.init({ layoutUrl: ..., canvas: '#stage', editableSelectors: [...] });</script>

(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.LayoutSystem) return;

  var VERSION = '1.0.2';
  var DEFAULT_DEBOUNCE_MS = 250;

  // Built-in default page list for the editor's "🌐 ページ" navigation menu.
  // 単一ソース: ページ配列は common/page-nav.js の DEFAULT_PAGES を真実とし、
  // window.PONO_PAGES 経由で取得する。読み込み順保険として遅延参照する。
  // Page authors can override via init({ pages: [...] }).
  // Each entry: { name: string, url: string, current?: boolean }
  function getDefaultPages() {
    return (window.PONO_PAGES && Array.isArray(window.PONO_PAGES))
      ? window.PONO_PAGES.slice()
      : [];
  }

  // currentScript captures the <script> tag of layout-system.js itself.
  // Must be read at top-level (before async/Promise turns), otherwise
  // document.currentScript is null inside callbacks.
  var SELF_SCRIPT = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    for (var i = s.length - 1; i >= 0; i--) {
      if (s[i].src && /layout-system\.js/.test(s[i].src)) return s[i];
    }
    return null;
  })();

  // ---- helpers --------------------------------------------------------
  function siblingUrl(name) {
    if (!SELF_SCRIPT || !SELF_SCRIPT.src) return name;
    return SELF_SCRIPT.src.replace(/layout-system\.js(\?.*)?$/, name);
  }

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = url;
      s.async = false; // preserve evaluation order
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Failed to load ' + url)); };
      document.head.appendChild(s);
    });
  }

  function loadCss(url) {
    return new Promise(function (resolve, reject) {
      // Don't double-load
      var existing = document.querySelectorAll('link[rel="stylesheet"]');
      for (var i = 0; i < existing.length; i++) {
        if (existing[i].href === url) { resolve(); return; }
      }
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = url;
      l.onload = function () { resolve(); };
      l.onerror = function () { reject(new Error('Failed to load ' + url)); };
      document.head.appendChild(l);
    });
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      if (t) clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  function resolveCanvas(canvas) {
    if (!canvas) return document;
    if (typeof canvas === 'string') return document.querySelector(canvas) || document;
    if (canvas instanceof Element) return canvas;
    return document;
  }

  // shouldEnableEditor(cfg)
  //   - cfg.enableEditor === true  → true
  //   - cfg.enableEditor === false → false
  //   - default ('query'): URL ?<editorQueryParam || 'edit'>=<editorQueryValue || '1'>
  function shouldEnableEditor(cfg) {
    if (!cfg) cfg = {};
    if (cfg.enableEditor === true) return true;
    if (cfg.enableEditor === false) return false;
    try {
      var u = new URL(window.location.href);
      var name = cfg.editorQueryParam || 'edit';
      var want = cfg.editorQueryValue || '1';
      return u.searchParams.get(name) === want;
    } catch (e) {
      return false;
    }
  }

  // ---- public API -----------------------------------------------------

  /**
   * init(config) → Promise<{ applier, editor? }>
   * Required: layoutUrl, canvas, editableSelectors
   * Optional: applyOnDynamic, hideClass, headerHVar, enableEditor,
   *          editorQueryParam, editorQueryValue, ghPath, beforeApply, onReady, onError
   */
  function init(config) {
    config = config || {};
    // Ensure applier is loaded. If not, lazy-load it and retry.
    if (!window.LayoutApplier) {
      var applierUrl = appendVersion(siblingUrl('layout-applier.js'));
      return loadScript(applierUrl).then(function () {
        return init(config);
      }).catch(function (e) {
        console.warn('[LayoutSystem] failed to load layout-applier.js', e);
        return { applier: null, editor: null, data: null };
      });
    }
    var applier = window.LayoutApplier;

    // 1) Inject shared CSS
    try { applier && applier.injectSharedStyles(); } catch (e) { /* ignore */ }

    var canvasEl = resolveCanvas(config.canvas);
    var editableSelectors = config.editableSelectors || [];
    // per-Q 対象セレクタ (Quizland Phase 2 / impl-B)。 init 呼び出し側で
    // 明示列挙する (例 quizland: ['.emoji-display', '.emoji-main-img'])。
    // ここに含まれるセレクタは applier 内で `${sel}|${i}@${qid}` キーが優先される。
    var perQuestionSelectors = (config.perQuestionSelectors && Array.isArray(config.perQuestionSelectors))
      ? config.perQuestionSelectors.slice() : [];
    var applyCfg = {
      selectors: editableSelectors,
      hideClass: config.hideClass,
      headerHVar: config.headerHVar,
    };

    // qid をその場で取得するヘルパ。 クロージャでキャプチャせず **毎回呼び直す**
    // ことで、 MutationObserver / setupObserver 経路で問題切替後の qid が
    // 反映される。 ホストページ側が window.QUIZLAND_GET_CURRENT_QID を
    // 公開していなければ null を返す (= 通常通り baseKey のみ参照)。
    function getQidNow() {
      try {
        if (typeof window.QUIZLAND_GET_CURRENT_QID === 'function') {
          return window.QUIZLAND_GET_CURRENT_QID();
        }
      } catch (e) { /* ignore */ }
      return null;
    }
    function buildApplyCfg() {
      var c = {
        selectors: applyCfg.selectors,
        hideClass: applyCfg.hideClass,
        headerHVar: applyCfg.headerHVar,
      };
      if (perQuestionSelectors.length) {
        c.perQuestionSelectors = perQuestionSelectors;
        c.qid = getQidNow();
      }
      return c;
    }

    // 2) Fetch + apply
    var fetchP = applier
      ? applier.fetch(config.layoutUrl)
      : Promise.resolve(null);

    var ready = fetchP.then(function (data) {
      if (typeof config.beforeApply === 'function') {
        try { data = config.beforeApply(data) || data; } catch (e) { /* ignore */ }
      }
      // Cache layout data on a public global for re-apply (e.g., after dynamic insert).
      window._currentLayoutData = data;
      if (data && applier) {
        try { applier.apply(data, null, buildApplyCfg()); } catch (e) { console.warn('[LayoutSystem] apply failed', e); }
      }
      // 3) MutationObserver (optional, default ON)
      if (config.applyOnDynamic !== false && data && applier) {
        setupObserver(canvasEl, function () {
          // qid は呼び出し時点で再評価する (問題切替後に正しい per-Q キーが当たる)
          try { applier.apply(window._currentLayoutData, canvasEl, buildApplyCfg()); }
          catch (e) { /* ignore */ }
        });
      }
      // 4) Editor lazy-load
      if (shouldEnableEditor(config)) {
        return loadEditor(config).then(function () { return data; });
      }
      return data;
    }).then(function (data) {
      var result = { applier: applier, editor: window.LayoutEditor || null, data: data };
      if (typeof config.onReady === 'function') {
        try { config.onReady(result); } catch (e) { /* ignore */ }
      }
      return result;
    }).catch(function (err) {
      console.warn('[LayoutSystem] init error:', err);
      if (typeof config.onError === 'function') {
        try { config.onError(err); } catch (e) { /* ignore */ }
      }
      return { applier: applier, editor: null, data: null };
    });

    return ready;
  }

  function setupObserver(root, cb) {
    if (!root || !window.MutationObserver) return;
    var debounced = debounce(cb, DEFAULT_DEBOUNCE_MS);
    // 2026-05-07 fix: editor 内部要素 (resize-size-label の textContent 更新で
    //   発生する text node 追加 / numeric panel / element list の DOM 更新等) を
    //   トリガから除外する。 これらをトリガに残すと、 chip ドラッグ中に発火する
    //   resize-size-label の text 更新で debounced() がデバウンスされ、 mouseup 後に
    //   applier.apply(_currentLayoutData) が走って ユーザーのドラッグを stale な
    //   saved-layout で巻き戻す致命バグになる
    //   (再現: ?edit=1 で chip を resize → mouseup でサイズが元に戻る)。
    //   通常コンテンツの addedNodes (renderChoices で作られる .chip 等) は
    //   引き続き re-apply を発火する。
    // 判定: 以下の **どちらか** の場合は無視:
    //   (a) mut.target が editor-chrome の中
    //   (b) mut.addedNodes の **全て** が editor-chrome (resize-handle / resize-size-label 等)
    //       — attachHandle がコンテンツ要素 (.emoji-main-img / .emoji-display 等) に
    //       handle div を append したケース。 これを skip しないと続く apply() が
    //       _currentLayoutData の古い値で element 位置を巻き戻す
    //       (= 2026-05-07 「保存しても位置やスケールが戻る」報告の根本原因)。
    var EDITOR_CHROME_SEL = '.resize-handle, .resize-size-label, .le-toolbar, .le-list-panel, .le-anno-layer, .le-context-menu, .le-pages-dropdown, .le-help-modal, .le-comparison-picker, .le-marquee, .le-guide, .le-ruler, .numeric-panel, .userbox-badge, .userbox-del, .le-lock-badge';
    var isChromeNode = function (n) {
      if (!n) return false;
      if (n.nodeType === 3) {
        var p = n.parentNode;
        return !!(p && p.nodeType === 1 && p.closest && p.closest(EDITOR_CHROME_SEL));
      }
      if (n.nodeType !== 1) return false;
      try { return !!(n.matches && (n.matches(EDITOR_CHROME_SEL) || (n.closest && n.closest(EDITOR_CHROME_SEL)))); }
      catch (e) { return false; }
    };
    var isEditorChrome = function (mut) {
      var t = mut.target;
      if (t && t.closest) {
        try { if (t.closest(EDITOR_CHROME_SEL)) return true; } catch (e) {}
      }
      var added = mut.addedNodes;
      if (added && added.length) {
        for (var k = 0; k < added.length; k++) {
          if (!isChromeNode(added[k])) return false;
        }
        return true;
      }
      return false;
    };
    var mo = new MutationObserver(function (muts) {
      // Only react to actual structural changes, not style-only mutations we caused
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes && muts[i].addedNodes.length) {
          if (isEditorChrome(muts[i])) continue;
          debounced(); return;
        }
      }
    });
    mo.observe(root === document ? document.body : root, { childList: true, subtree: true });
  }

  /**
   * loadEditor(config) → Promise<void>
   * Lazy-loads layout-editor.js + layout-editor.css and calls
   * window.LayoutEditor.enable(config).
   */
  function loadEditor(config) {
    var jsUrl  = appendVersion(siblingUrl('layout-editor.js'));
    var cssUrl = appendVersion(siblingUrl('layout-editor.css'));
    // Inject default pages list (for the toolbar's 🌐 nav dropdown) when the
    // page author didn't provide one. If `pages` is explicitly set to null /
    // false / [] the editor will hide the button entirely.
    var editorCfg = config;
    if (config && typeof config === 'object' && !('pages' in config)) {
      editorCfg = {};
      for (var k in config) { if (Object.prototype.hasOwnProperty.call(config, k)) editorCfg[k] = config[k]; }
      editorCfg.pages = getDefaultPages();
    }
    return Promise.all([
      loadCss(cssUrl).catch(function (e) { console.warn('[LayoutSystem]', e); }),
      loadScript(jsUrl).catch(function (e) { console.warn('[LayoutSystem]', e); }),
    ]).then(function () {
      if (window.LayoutEditor && typeof window.LayoutEditor.enable === 'function') {
        try { window.LayoutEditor.enable(editorCfg); }
        catch (e) { console.warn('[LayoutSystem] LayoutEditor.enable threw', e); }
      }
    });
  }

  function appendVersion(url) {
    if (!url) return url;
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    return url + sep + 'v=' + VERSION;
  }

  // ---- dataset auto-init ---------------------------------------------
  // If <script src="layout-system.js" data-layout-url="..."> auto-init.
  function maybeAutoInit() {
    if (!SELF_SCRIPT) return;
    var ds = SELF_SCRIPT.dataset || {};
    if (!ds.layoutUrl) return;
    var cfg = {
      layoutUrl: ds.layoutUrl,
      canvas: ds.canvas || '#stage',
    };
    // optional external selector spec JSON
    if (ds.spec) {
      window.LayoutApplier.fetch(ds.spec).then(function (specData) {
        cfg.editableSelectors = (specData && specData.selectors) || [];
        init(cfg);
      });
    } else {
      cfg.editableSelectors = [];
      init(cfg);
    }
  }

  // ---- export ---------------------------------------------------------
  window.LayoutSystem = {
    init: init,
    loadEditor: loadEditor,
    shouldEnableEditor: shouldEnableEditor,
    version: VERSION,
  };

  // Auto-init runs after DOM is parseable
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeAutoInit, { once: true });
  } else {
    maybeAutoInit();
  }
})();
