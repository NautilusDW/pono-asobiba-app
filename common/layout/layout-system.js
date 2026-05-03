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

  var VERSION = '1.0.0';
  var DEFAULT_DEBOUNCE_MS = 250;

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
    var applyCfg = {
      selectors: editableSelectors,
      hideClass: config.hideClass,
      headerHVar: config.headerHVar,
    };

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
        try { applier.apply(data, null, applyCfg); } catch (e) { console.warn('[LayoutSystem] apply failed', e); }
      }
      // 3) MutationObserver (optional, default ON)
      if (config.applyOnDynamic !== false && data && applier) {
        setupObserver(canvasEl, function () {
          try { applier.apply(window._currentLayoutData, canvasEl, applyCfg); }
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
    var mo = new MutationObserver(function (muts) {
      // Only react to actual structural changes, not style-only mutations we caused
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes && muts[i].addedNodes.length) { debounced(); return; }
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
    return Promise.all([
      loadCss(cssUrl).catch(function (e) { console.warn('[LayoutSystem]', e); }),
      loadScript(jsUrl).catch(function (e) { console.warn('[LayoutSystem]', e); }),
    ]).then(function () {
      if (window.LayoutEditor && typeof window.LayoutEditor.enable === 'function') {
        try { window.LayoutEditor.enable(config); }
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
