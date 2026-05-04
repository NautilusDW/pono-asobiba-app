// layout-editor.js — Phase 4 lazy-loaded editor module.
// Public API: window.LayoutEditor
//
// Responsibilities:
//   - Mount toolbar, numeric panel, element list, alignment toolbar, comparison overlay,
//     snap-grid, lock badges, zoom UI, ruler/guides, annotation system, userbox, undo/redo.
//   - Expose drag/resize for editableSelectors via 8 handles (4 edges + 4 corners).
//   - Persist via localStorage (per-page key) + GitHub PUT through /api/gh/.
//   - Generate saved-layout.json schema (additive __version, __locked, __zoom, __comparison, __grid).
//
// Source patterns extracted from quizland/preview/full/index.html (3468 lines).
// All editor-specific styles must be scoped under body.layout-editor-on (see layout-editor.css).
//
// This module is loaded ONLY when LayoutSystem.init detects ?edit=1.
// Page authors do not import it directly.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.LayoutEditor && window.LayoutEditor.__full) return; // idempotent

  // ====================================================================
  //  Constants & helpers
  // ====================================================================

  var VERSION = '1.0.0';
  var SAVED_LAYOUT_VERSION = 2; // __version field in saved-layout.json
  var HISTORY_LIMIT = 100;
  var TRANSIENT_CLASSES = {
    'resizable': 1, 'editable-text': 1, 'anno-mode': 1, 'preview-mode': 1,
    'show-bbox': 1, 'show-safe': 1, 'eraser-mode': 1, 'dirty': 1, 'active': 1,
    'selected': 1, 'edge-linked': 1, 'has-selection': 1, 'grid-mode': 1,
    'user-hidden': 1, 'layout-editor-on': 1, 'le-locked': 1
  };
  var EDIT_MODE_BODY_CLASS = 'layout-editor-on';
  var DEFAULT_GH_OWNER = 'NautilusDW';
  var DEFAULT_GH_REPO  = 'pono-asobiba-app';
  var DEFAULT_GH_BRANCH = 'develop';

  function noop() {}
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function safeQueryAll(root, sel) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    catch (e) { return []; }
  }
  function utf8Btoa(s) { return btoa(unescape(encodeURIComponent(s))); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, ctx = this;
      if (t) clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }
  function nowIso() { return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); }

  // getDomPath identical to layout-applier.js so __texts keys round-trip.
  function getDomPath(el) {
    var parts = [];
    var cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body) {
      var s = cur.tagName.toLowerCase();
      if (cur.id) { s += '#' + cur.id; parts.unshift(s); break; }
      if (cur.className && typeof cur.className === 'string') {
        var cls = cur.className.trim().split(/\s+/).filter(function (c) {
          return c && !TRANSIENT_CLASSES[c];
        });
        if (cls.length) s += '.' + cls.join('.');
      }
      var parent = cur.parentElement;
      if (parent) {
        var sibs = Array.prototype.filter.call(parent.children, function (c) { return c.tagName === cur.tagName; });
        if (sibs.length > 1) s += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')';
      }
      parts.unshift(s);
      cur = cur.parentElement;
    }
    return parts.join('>');
  }

  // ====================================================================
  //  Module-level state (per-instance singleton — only one editor at a time)
  // ====================================================================

  var state = {
    enabled: false,
    config: null,
    canvasEl: null,
    spec: [],                  // [[selector, axes, label], ...]
    selectedElements: null,    // Set
    locked: null,              // Set of "selector|idx" keys
    gridSize: 0,               // 0 = off, else 8/16/32
    gridOn: false,
    zoom: 1,                   // 1.0 = 100%
    comparison: null,          // { image, mode, opacity }
    listeners: {},             // event → [fn]
    history: [], future: [],
    lastSavedJson: null,
    saveTimer: null,
    drawModeOn: false,
    annoMode: false,
    annoTool: 'select',
    annoSelected: null,
    annoColor: '#ff3b6b',
    labelIdx: 0,
    rootScale: 1,              // effective stage scale (zoom + any preview scale)
    toolbarEl: null,
    numericPanelEl: null,
    listPanelEl: null,
    lastClickedListKey: null,  // Last clicked row key in element list (for Shift+Click range select)
    helpModalEl: null,
    rulerH: null, rulerV: null,
    annoLayer: null,
    annoSvg: null,
    zoomWrapEl: null,
    activeTool: 'move',        // move | annotate | draw
    cleanupFns: [],            // C1: registered teardown callbacks
    resizeObserver: null,      // C1: track ResizeObserver for disconnect on disable
    originalCanvasWidth: null, // R3: remember stage width before comparison side-mode
    multiSelectMode: false,    // U10: iPad-friendly multi-select toggle
    previewExitBtn: null,      // R2: exit affordance during preview
    pagesDropdownEl: null,     // 🌐 page navigation dropdown
    pagesDocClickHandler: null,// outside-click handler for the dropdown
    aspectLocked: false,       // Yankee: numeric-panel 縦横比ロックトグル
    aspectRatios: null,        // WeakMap<el, ratio> — capture時の W/H 比率
    preferredTarget: null,     // Charlie-2: 要素一覧から選択した要素を canvas 操作の優先ターゲットに
    textToolOn: false,         // India-2: テキスト追加ツール ON/OFF
    unlinkedChildren: null,    // Papa-2 修正2: 一時リンク解除中の子要素 (Set<element>)
  };

  // C1 helper: register a teardown that runs on disable()
  function registerCleanup(fn) {
    if (typeof fn === 'function') state.cleanupFns.push(fn);
  }
  // Add an event listener and register its removal automatically
  function addManagedListener(target, type, handler, opts) {
    if (!target) return;
    target.addEventListener(type, handler, opts);
    registerCleanup(function () {
      try { target.removeEventListener(type, handler, opts); } catch (e) {}
    });
  }

  // ====================================================================
  //  Event bus (LayoutEditor.on / off / emit)
  // ====================================================================

  function on(name, fn) {
    if (!state.listeners[name]) state.listeners[name] = [];
    state.listeners[name].push(fn);
  }
  function off(name, fn) {
    var arr = state.listeners[name];
    if (!arr) return;
    state.listeners[name] = arr.filter(function (f) { return f !== fn; });
  }
  function emit(name, payload) {
    var arr = state.listeners[name];
    if (!arr) return;
    arr.slice().forEach(function (fn) { try { fn(payload); } catch (e) { console.warn('[LayoutEditor]', name, e); } });
  }

  // ====================================================================
  //  Toast notification (success / error)
  // ====================================================================

  function showToast(msg, kind) {
    var t = document.createElement('div');
    var cls = 'le-toast';
    if (kind === 'error') cls += ' le-toast-error';
    else if (kind === 'warn') cls += ' le-toast-warn';
    else if (kind === 'success') cls += ' le-toast-success';
    t.className = cls;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1700);
  }

  // ====================================================================
  //  Storage / GH save
  // ====================================================================

  function storageKey() {
    return (state.config && state.config.storageKey) || 'le_layout_' + (location.pathname || '/');
  }
  function ghPath() {
    var cfg = state.config || {};
    if (cfg.ghPath) return cfg.ghPath;
    // Derive from layoutUrl — strip leading "./" or "/"
    var lu = cfg.layoutUrl || '';
    if (!lu) return '';
    return lu.replace(/^\.\//, '').replace(/^\//, '');
  }
  function ghRepoOwner() { return (state.config && state.config.ghOwner) || DEFAULT_GH_OWNER; }
  function ghRepoName()  { return (state.config && state.config.ghRepo)  || DEFAULT_GH_REPO; }
  function ghBranch()    { return (state.config && state.config.ghBranch) || DEFAULT_GH_BRANCH; }

  function ghGetContents(path) {
    var url = '/api/gh/repos/' + ghRepoOwner() + '/' + ghRepoName() + '/contents/' +
              encodeURI(path) + '?ref=' + ghBranch();
    return fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/vnd.github+json' },
      cache: 'no-store',
    }).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('GH GET ' + path + ' → ' + r.status);
      return r.json();
    });
  }
  function ghPutContents(path, contentB64, message, sha) {
    var url = '/api/gh/repos/' + ghRepoOwner() + '/' + ghRepoName() + '/contents/' + encodeURI(path);
    var body = { message: message, content: contentB64, branch: ghBranch() };
    if (sha) body.sha = sha;
    return fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/vnd.github+json' },
      body: JSON.stringify(body),
    }).then(function (r) {
      if (r.status === 409) {
        // C3: distinct conflict — sha mismatch (another editor saved first)
        return r.text().then(function (txt) {
          var err = new Error('GH PUT ' + path + ' → 409 ' + txt.slice(0, 200));
          err.code = 'CONFLICT_409';
          err.status = 409;
          throw err;
        });
      }
      if (!r.ok) return r.text().then(function (txt) {
        var err = new Error('GH PUT ' + path + ' → ' + r.status + ' ' + txt.slice(0, 200));
        err.status = r.status;
        throw err;
      });
      return r.json();
    });
  }

  function localSave(snapshotData) {
    try { localStorage.setItem(storageKey(), JSON.stringify(snapshotData)); return true; }
    catch (e) { return false; }
  }
  function localLoad() {
    try {
      var raw = localStorage.getItem(storageKey());
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  // ====================================================================
  //  Snapshot / takeLayoutSnapshot
  // ====================================================================

  function snapshot() {
    var data = { __version: SAVED_LAYOUT_VERSION };
    state.spec.forEach(function (entry) {
      var sel = entry[0];
      if (sel === '.userbox') return; // userbox saved in __userboxes
      $$(sel).forEach(function (el, i) {
        data[sel + '|' + i] = {
          w: el.style.width || '',
          h: el.style.height || '',
          tx: el._tx || 0,
          ty: el._ty || 0,
        };
      });
    });
    data.__guides = collectGuides();
    data.__headerH = document.documentElement.style.getPropertyValue('--header-h') || '';
    data.__texts = collectEditableTexts();
    data.__hidden = collectHiddenKeys();
    data.__userboxes = collectUserboxes();
    data.__locked = collectLockedKeys();
    if (state.zoom !== 1) data.__zoom = state.zoom;
    if (state.gridOn) data.__grid = { size: state.gridSize, on: true };
    if (state.comparison) data.__comparison = state.comparison;
    return data;
  }

  function collectEditableTexts() {
    var data = {};
    $$('.editable-text').forEach(function (el) {
      data[getDomPath(el)] = el.textContent;
    });
    return data;
  }
  function collectHiddenKeys() {
    return $$('.user-hidden').map(getElKey).filter(Boolean);
  }
  function collectLockedKeys() {
    var arr = [];
    state.locked.forEach(function (k) { arr.push(k); });
    return arr;
  }
  function getElKey(el) {
    for (var i = 0; i < state.spec.length; i++) {
      var sel = state.spec[i][0];
      try {
        if (el.matches(sel)) {
          var all = $$(sel);
          var idx = all.indexOf(el);
          if (idx >= 0) return sel + '|' + idx;
        }
      } catch (e) { /* invalid selector — skip */ }
    }
    return null;
  }
  function collectGuides() {
    return $$('.le-guide').map(function (g) {
      return {
        axis: g.classList.contains('h') ? 'h' : 'v',
        pos: g.classList.contains('h') ? parseFloat(g.style.top) : parseFloat(g.style.left),
      };
    });
  }
  function collectUserboxes() {
    return $$('.userbox').map(function (el) {
      return {
        id: el.dataset.userboxId || '',
        label: el.dataset.userboxLabel || '',
        left: el.style.left || '',
        top: el.style.top || '',
        w: el.style.width || '',
        h: el.style.height || '',
        tx: el._tx || 0,
        ty: el._ty || 0,
        bgImage: el.dataset.bgImage || '',
      };
    });
  }

  // ====================================================================
  //  Save / revert / reset
  // ====================================================================

  function save() {
    emit('save:start');
    var data = snapshot();
    var pretty = JSON.stringify(data, null, 2);
    var compact = JSON.stringify(data);
    localSave(data);
    // C2: do NOT clear dirty flag yet — wait for remote success.
    showToast('保存中…');

    var path = ghPath();
    if (!path) {
      // No GH path → local is the source of truth, mark as saved.
      state.lastSavedJson = compact;
      updateDirtyUI();
      showToast('ローカルに保存しました (GH path 未設定)', 'error');
      emit('save:success', { local: true, remote: false });
      return Promise.resolve({ local: true, remote: false });
    }
    return ghGetContents(path).then(function (existing) {
      var sha = existing ? existing.sha : null;
      return ghPutContents(path, utf8Btoa(pretty), 'chore(layout): update saved layout', sha);
    }).then(function () {
      // C2: only clear dirty after remote write succeeds
      state.lastSavedJson = compact;
      updateDirtyUI();
      showToast('保存しました');
      emit('save:success', { local: true, remote: true });
      return { local: true, remote: true };
    }).catch(function (err) {
      console.warn('[LayoutEditor] GH save failed', err);
      // C3: surface 409 conflict distinctly
      if (err && (err.code === 'CONFLICT_409' || err.status === 409)) {
        showToast('別エディタが先に保存しました。再読み込みして再保存してください', 'error');
        emit('save:conflict', err);
      } else {
        showToast('GitHub 保存失敗: ローカルにのみ保存', 'error');
      }
      emit('save:error', err);
      // dirty flag remains true so user can retry
      return { local: true, remote: false, error: err };
    });
  }

  function revert() {
    var cur = JSON.stringify(snapshot());
    if (cur !== state.lastSavedJson && !confirm('保存されている状態に戻しますか？ 未保存の変更は失われます。')) return;
    // Wipe geometry on every spec element
    state.spec.forEach(function (entry) {
      $$(entry[0]).forEach(function (el) {
        el.style.width = '';
        el.style.height = '';
        el.style.transform = '';
        el._tx = 0;
        el._ty = 0;
        el._resizeUpdateLabel && el._resizeUpdateLabel();
      });
    });
    document.documentElement.style.removeProperty('--header-h');
    $$('.le-guide').forEach(function (g) { g.remove(); });
    state.history.length = 0;
    state.future.length = 0;
    // Re-apply saved layout (prefer local cache; fall back to applier fetch)
    var local = localLoad();
    if (local) applySavedData(local);
    else if (window.LayoutApplier && state.config) {
      window.LayoutApplier.fetch(state.config.layoutUrl).then(function (data) {
        if (data) applySavedData(data);
      });
    }
    updateDirtyUI();
    showToast('保存状態に戻しました');
  }

  function reset() {
    if (!confirm('レイアウト・移動・ガイドを全てリセットしますか？')) return;
    try { localStorage.removeItem(storageKey()); } catch (e) {}
    state.spec.forEach(function (entry) {
      $$(entry[0]).forEach(function (el) {
        el.style.width = '';
        el.style.height = '';
        el.style.transform = '';
        el._tx = 0;
        el._ty = 0;
        el._resizeUpdateLabel && el._resizeUpdateLabel();
      });
    });
    document.documentElement.style.removeProperty('--header-h');
    $$('.le-guide').forEach(function (g) { g.remove(); });
    $$('.userbox').forEach(function (b) { b.remove(); });
    $$('.user-hidden').forEach(function (e) { e.classList.remove('user-hidden'); });
    state.locked.clear();
    state.history.length = 0;
    state.future.length = 0;
    refreshElementList();
    refreshSelectionUI();
    showToast('リセットしました');
  }

  function applySavedData(data) {
    if (!data) return;
    if (window.LayoutApplier && state.config) {
      try { window.LayoutApplier.apply(data, null, { selectors: state.spec }); }
      catch (e) { console.warn('[LayoutEditor] applier.apply failed', e); }
    } else {
      // Fallback: minimal apply
      state.spec.forEach(function (entry) {
        var sel = entry[0];
        $$(sel).forEach(function (el, i) {
          var s = data[sel + '|' + i];
          if (!s) return;
          if (s.w) el.style.width = s.w;
          if (s.h) el.style.height = s.h;
          if (s.tx || s.ty) {
            el._tx = s.tx || 0;
            el._ty = s.ty || 0;
            el.style.transform = 'translate(' + el._tx + 'px, ' + el._ty + 'px)';
          }
        });
      });
    }
    // Restore locked
    state.locked.clear();
    if (Array.isArray(data.__locked)) data.__locked.forEach(function (k) { state.locked.add(k); });
    // Restore zoom
    if (typeof data.__zoom === 'number') setZoom(data.__zoom);
    // Restore grid
    if (data.__grid && typeof data.__grid === 'object') {
      state.gridSize = data.__grid.size || 0;
      if (data.__grid.on) toggleGrid(true);
    }
    // Restore comparison
    if (data.__comparison) state.comparison = data.__comparison;
    // Restore guides
    if (Array.isArray(data.__guides)) restoreGuides(data.__guides);
    refreshLockBadges();
  }

  // ====================================================================
  //  Dirty tracking
  // ====================================================================

  function updateDirtyUI() {
    var btn = $('#le-save');
    if (!btn) return;
    var cur = JSON.stringify(snapshot());
    var dirty = cur !== state.lastSavedJson;
    btn.classList.toggle('dirty', dirty);
    emit('dirty', dirty);
  }
  var scheduleDirtyUpdate = debounce(updateDirtyUI, 100);

  // ====================================================================
  //  Undo / redo
  // ====================================================================

  function pushHistory(op) {
    state.history.push(op);
    if (state.history.length > HISTORY_LIMIT) state.history.shift();
    state.future.length = 0;
    scheduleDirtyUpdate();
  }
  // Kilo-2 修正A: 複数要素のバッチ操作を 1 つの history op に束ねるヘルパー。
  //   ops が空 → push せず、1個 → そのまま、2個以上 → { type: 'batch', ops } で
  //   束ねる。これで複数選択ドラッグなどが Ctrl+Z 1 回で全部 revert できる。
  function pushHistoryBatch(ops) {
    if (!ops || !ops.length) return;
    if (ops.length === 1) pushHistory(ops[0]);
    else pushHistory({ type: 'batch', ops: ops });
  }
  function undo() {
    if (!state.history.length) return;
    var op = state.history.pop();
    applyInverse(op);
    state.future.push(op);
    refreshSelectionUI();
    scheduleDirtyUpdate();
  }
  function redo() {
    if (!state.future.length) return;
    var op = state.future.pop();
    applyForward(op);
    state.history.push(op);
    refreshSelectionUI();
    scheduleDirtyUpdate();
  }
  function applyForward(op) {
    // Kilo-2 修正A: バッチ op は内部 ops を順方向に再適用
    if (op.type === 'batch') {
      (op.ops || []).forEach(function (sub) { applyForward(sub); });
      return;
    }
    if (op.type === 'add') op.parent.insertBefore(op.el, op.next || null);
    else if (op.type === 'remove') op.el.remove();
    else if (op.type === 'resize') setResize(op.el, op.after);
    else if (op.type === 'transform') { setAnnoGeometry(op.el, op.after); updateAnnoHandles(); }
    else if (op.type === 'guide-move') setGuidePos(op.el, op.after);
    else if (op.type === 'lock') op.after ? state.locked.add(op.key) : state.locked.delete(op.key);
    else if (op.type === 'hide') op.el.classList.add('user-hidden');
    else if (op.type === 'show') op.el.classList.remove('user-hidden');
    else if (op.type === 'text') op.el.textContent = op.after;
    else if (op.type === 'image-swap') { op.el.src = op.after; if (op._afterSave) try { saveDroppedImages(); } catch (e) {} }
    else if (op.type === 'bg-image-swap') { op.el.style.backgroundImage = op.after; }
    // Papa-2 修正3: z-index 並び替え
    else if (op.type === 'z-index') {
      if (op.after === '' || op.after == null) op.el.style.removeProperty('z-index');
      else op.el.style.zIndex = String(op.after);
    }
    // Mike-2 修正B: rename (要素一覧ラベル)
    else if (op.type === 'rename') {
      if (op.mode === 'spec') {
        setSpecLabelOverride(op.key, op.newLabel || '');
      } else if (op.mode === 'dataset' && op.el) {
        op.el.dataset.leLabel = op.newLabel || '';
        try {
          if (op.el.classList && op.el.classList.contains('le-dropped-img')) saveDroppedImages();
          else if (op.el.classList && op.el.classList.contains('le-added-text')) saveAddedTexts();
        } catch (e) {}
      }
      try { refreshElementList(); } catch (e) {}
    }
    // Kilo-2 修正C: 親から取り出し (forward = stage 直下に移動 + 新位置適用)
    else if (op.type === 'reparent') {
      var newParent = op.newParent || state.canvasEl;
      newParent.appendChild(op.el);
      if (op.newStyles) {
        var ns = op.newStyles;
        if (ns.position !== undefined) op.el.style.position = ns.position;
        if (ns.left !== undefined) op.el.style.left = ns.left;
        if (ns.top !== undefined) op.el.style.top = ns.top;
        if (ns.width !== undefined) op.el.style.width = ns.width;
        if (ns.height !== undefined) op.el.style.height = ns.height;
      }
      if (op.el.dataset) op.el.dataset.leKeepPosition = '1';
      try { refreshElementList(); } catch (e) {}
    }
    // India-2: le-added-text の add/remove 後は localStorage を再同期
    try {
      if (op.el && op.el.classList && op.el.classList.contains('le-added-text')) saveAddedTexts();
    } catch (e) {}
    // Juliet-2 修正B: add/remove 系の op 後は要素一覧も再描画 (動的要素の出現/消滅を反映)
    // Papa-2 修正3: z-index 変更後も並び順が変わるので再描画
    if (op.type === 'add' || op.type === 'remove' || op.type === 'z-index') {
      try { refreshElementList(); } catch (e) {}
    }
    refreshLockBadges();
  }
  function applyInverse(op) {
    // Kilo-2 修正A: バッチ op は ops を逆順に逆適用
    if (op.type === 'batch') {
      (op.ops || []).slice().reverse().forEach(function (sub) { applyInverse(sub); });
      return;
    }
    if (op.type === 'add') op.el.remove();
    else if (op.type === 'remove') op.parent.insertBefore(op.el, op.next || null);
    else if (op.type === 'resize') setResize(op.el, op.before);
    else if (op.type === 'transform') { setAnnoGeometry(op.el, op.before); updateAnnoHandles(); }
    else if (op.type === 'guide-move') setGuidePos(op.el, op.before);
    else if (op.type === 'lock') op.before ? state.locked.add(op.key) : state.locked.delete(op.key);
    else if (op.type === 'hide') op.el.classList.remove('user-hidden');
    else if (op.type === 'show') op.el.classList.add('user-hidden');
    else if (op.type === 'text') op.el.textContent = op.before;
    else if (op.type === 'image-swap') { op.el.src = op.before; if (op._afterSave) try { saveDroppedImages(); } catch (e) {} }
    else if (op.type === 'bg-image-swap') { op.el.style.backgroundImage = op.before; }
    // Papa-2 修正3: z-index 並び替え inverse
    else if (op.type === 'z-index') {
      if (op.before === '' || op.before == null) op.el.style.removeProperty('z-index');
      else op.el.style.zIndex = String(op.before);
    }
    // Mike-2 修正B: rename の inverse — 旧ラベルへ戻す
    else if (op.type === 'rename') {
      if (op.mode === 'spec') {
        setSpecLabelOverride(op.key, op.oldLabel || '');
      } else if (op.mode === 'dataset' && op.el) {
        op.el.dataset.leLabel = op.oldLabel || '';
        try {
          if (op.el.classList && op.el.classList.contains('le-dropped-img')) saveDroppedImages();
          else if (op.el.classList && op.el.classList.contains('le-added-text')) saveAddedTexts();
        } catch (e) {}
      }
      try { refreshElementList(); } catch (e) {}
    }
    // Kilo-2 修正C: 親から取り出しの逆 (inverse = 元の親に戻す + 旧位置/旧スタイル復元)
    else if (op.type === 'reparent') {
      if (op.oldParent) {
        op.oldParent.insertBefore(op.el, op.oldNext || null);
      }
      if (op.oldStyles) {
        var os = op.oldStyles;
        op.el.style.position = os.position || '';
        op.el.style.left = os.left || '';
        op.el.style.top = os.top || '';
        op.el.style.width = os.width || '';
        op.el.style.height = os.height || '';
      }
      if (op.oldKeepPosition) {
        if (op.el.dataset) op.el.dataset.leKeepPosition = op.oldKeepPosition;
      } else {
        if (op.el.dataset) delete op.el.dataset.leKeepPosition;
      }
      try { refreshElementList(); } catch (e) {}
    }
    // India-2: le-added-text の undo 後にも save
    try {
      if (op.el && op.el.classList && op.el.classList.contains('le-added-text')) saveAddedTexts();
    } catch (e) {}
    // Juliet-2 修正B: add/remove 系の op 後は要素一覧も再描画
    if (op.type === 'add' || op.type === 'remove') {
      try { refreshElementList(); } catch (e) {}
    }
    refreshLockBadges();
  }

  function setResize(el, st) {
    el.style.width = st.w || '';
    el.style.height = st.h || '';
    el._tx = st.tx || 0;
    el._ty = st.ty || 0;
    if (el._tx || el._ty) {
      el.style.transform = 'translate(' + el._tx + 'px, ' + el._ty + 'px)';
    } else {
      el.style.transform = '';
    }
    if (el.matches('.hdr-left') && st.h) {
      document.documentElement.style.setProperty('--header-h', st.h);
    }
    el._resizeUpdateLabel && el._resizeUpdateLabel();
  }
  function getResizeState(el) {
    return {
      w: el.style.width || '',
      h: el.style.height || '',
      tx: el._tx || 0,
      ty: el._ty || 0,
    };
  }

  // ====================================================================
  //  Stage scale helpers
  // ====================================================================

  function getStageRectInfo() {
    var stage = state.canvasEl;
    if (!stage) return { stageRect: { left: 0, top: 0, width: 0, height: 0 }, scale: 1 };
    var stageRect = stage.getBoundingClientRect();
    var stageW = parseFloat(getComputedStyle(stage).width) || stageRect.width;
    var scale = stageRect.width / stageW || 1;
    return { stageRect: stageRect, scale: scale };
  }
  function bcrInStage(el, stageRect, scale) {
    var r = el.getBoundingClientRect();
    return {
      left: (r.left - stageRect.left) / scale,
      top: (r.top - stageRect.top) / scale,
      right: (r.right - stageRect.left) / scale,
      bottom: (r.bottom - stageRect.top) / scale,
    };
  }
  function snapValue(v) {
    if (!state.gridOn || !state.gridSize) return v;
    return Math.round(v / state.gridSize) * state.gridSize;
  }

  // ====================================================================
  //  Drag / resize: handles, edge linking, group corner scale
  // ====================================================================

  function attachHandle(el, axes) {
    el.classList.add('resizable');
    var positions = [];
    if (axes.indexOf('h') >= 0) positions.push('edge-n', 'edge-s');
    if (axes.indexOf('w') >= 0) positions.push('edge-e', 'edge-w');
    if (axes.indexOf('w') >= 0 && axes.indexOf('h') >= 0) {
      positions.push('corner-nw', 'corner-ne', 'corner-sw', 'corner-se');
    }
    positions.forEach(function (pos) { makeHandle(el, pos, axes); });
    attachMoveDrag(el);
    // U5: right-click → context menu (lock/hide/duplicate/delete)
    el.addEventListener('contextmenu', function (ev) {
      if (!state.enabled) return;
      // Skip if click landed on annotations / guides (they have their own handlers)
      if (ev.target.closest('.le-anno-layer, .le-guide')) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (!state.selectedElements.has(el)) selectOnly(el);
      showElementContextMenu(ev.clientX, ev.clientY, el);
    });
    // U10: long-press alternative for iPad multi-select
    var lpTimer = null;
    el.addEventListener('touchstart', function (ev) {
      if (!state.enabled) return;
      if (ev.touches && ev.touches.length > 1) return;
      if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
      lpTimer = setTimeout(function () {
        lpTimer = null;
        toggleSelect(el);
        showToast('長押し: 選択を切り替え');
      }, 500);
    }, { passive: true });
    var clearLp = function () { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } };
    el.addEventListener('touchmove', clearLp, { passive: true });
    el.addEventListener('touchend', clearLp, { passive: true });
    el.addEventListener('touchcancel', clearLp, { passive: true });
    var lbl = document.createElement('div');
    lbl.className = 'resize-size-label';
    el.appendChild(lbl);
    el._resizeUpdateLabel = function () {
      var r = el.getBoundingClientRect();
      var info = getStageRectInfo();
      lbl.textContent = Math.round(r.width / info.scale) + '×' + Math.round(r.height / info.scale);
    };
    el._resizeUpdateLabel();
  }

  // U5: shared context menu for resizable elements
  function showElementContextMenu(x, y, el) {
    var existing = $('#le-context-menu');
    if (existing) existing.remove();
    var locked = isLocked(el);
    var hidden = el.classList.contains('user-hidden');
    var menu = document.createElement('div');
    menu.id = 'le-context-menu';
    menu.className = 'le-context-menu';
    menu.innerHTML =
      '<button data-act="lock">' + (locked ? '🔓 ロック解除' : '🔒 ロック') + '</button>' +
      '<button data-act="vis">' + (hidden ? '👁 表示' : '🚫 非表示') + '</button>' +
      '<button data-act="dup">📋 複製</button>' +
      '<button data-act="del">🗑 削除 (隠す)</button>';
    document.body.appendChild(menu);
    var vw = window.innerWidth, vh = window.innerHeight;
    menu.style.left = Math.min(x, vw - 180) + 'px';
    menu.style.top = Math.min(y, vh - 180) + 'px';
    var dismiss = function () {
      menu.remove();
      document.removeEventListener('mousedown', onDocDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
    var onDocDown = function (ev) { if (!menu.contains(ev.target)) dismiss(); };
    var onKey = function (ev) { if (ev.key === 'Escape') dismiss(); };
    setTimeout(function () {
      document.addEventListener('mousedown', onDocDown, true);
      document.addEventListener('keydown', onKey, true);
    }, 0);
    menu.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button[data-act]');
      if (!btn) return;
      var act = btn.dataset.act;
      dismiss();
      if (act === 'lock') {
        toggleLock(el);
        refreshElementList();
        showToast(isLocked(el) ? 'ロックしました' : 'ロックを解除しました');
      } else if (act === 'vis') {
        if (el.classList.contains('user-hidden')) {
          el.classList.remove('user-hidden');
          pushHistory({ type: 'show', el: el });
        } else {
          el.classList.add('user-hidden');
          pushHistory({ type: 'hide', el: el });
        }
        refreshElementList();
      } else if (act === 'dup') {
        if (!state.selectedElements.has(el)) selectOnly(el);
        duplicateSelected();
      } else if (act === 'del') {
        if (!state.selectedElements.has(el)) selectOnly(el);
        hideSelectedElements();
      }
    });
  }

  function sidesFromHandlePos(pos) {
    if (pos === 'edge-e') return ['e'];
    if (pos === 'edge-w') return ['w'];
    if (pos === 'edge-n') return ['n'];
    if (pos === 'edge-s') return ['s'];
    if (pos === 'corner-ne') return ['n', 'e'];
    if (pos === 'corner-nw') return ['n', 'w'];
    if (pos === 'corner-se') return ['s', 'e'];
    if (pos === 'corner-sw') return ['s', 'w'];
    return [];
  }

  function findLinkedTargets(primaryEl, draggedSides) {
    var EPS = 8, OVERLAP_MIN = 8;
    var info = getStageRectInfo();
    var primR = bcrInStage(primaryEl, info.stageRect, info.scale);
    var all = $$('.resizable').filter(function (x) { return x !== primaryEl && !isLocked(x); });
    var linked = [];
    all.forEach(function (otherEl) {
      var r = bcrInStage(otherEl, info.stageRect, info.scale);
      var sides = [];
      if (draggedSides.indexOf('e') >= 0 && Math.abs(r.left - primR.right) < EPS &&
          Math.min(primR.bottom, r.bottom) - Math.max(primR.top, r.top) > OVERLAP_MIN) sides.push('w');
      if (draggedSides.indexOf('w') >= 0 && Math.abs(r.right - primR.left) < EPS &&
          Math.min(primR.bottom, r.bottom) - Math.max(primR.top, r.top) > OVERLAP_MIN) sides.push('e');
      if (draggedSides.indexOf('s') >= 0 && Math.abs(r.top - primR.bottom) < EPS &&
          Math.min(primR.right, r.right) - Math.max(primR.left, r.left) > OVERLAP_MIN) sides.push('n');
      if (draggedSides.indexOf('n') >= 0 && Math.abs(r.bottom - primR.top) < EPS &&
          Math.min(primR.right, r.right) - Math.max(primR.left, r.left) > OVERLAP_MIN) sides.push('s');
      if (sides.length) linked.push({ el: otherEl, sides: sides });
    });
    return linked;
  }

  function performResize(target, sides, dx, dy, sym, axes, stageRect, scale, aspectLock) {
    var el = target.el;
    var startW = target.startW, startH = target.startH;
    var startTx = target.startTx, startTy = target.startTy;
    var startRect = target.startRect;
    var factor = sym ? 2 : 1;
    var newW = startW, newH = startH;
    if (sides.indexOf('e') >= 0) newW = Math.max(20, startW + factor * dx);
    if (sides.indexOf('w') >= 0 && sides.indexOf('e') < 0) newW = Math.max(20, startW - factor * dx);
    if (sides.indexOf('s') >= 0) newH = Math.max(20, startH + factor * dy);
    if (sides.indexOf('n') >= 0 && sides.indexOf('s') < 0) newH = Math.max(20, startH - factor * dy);
    // Yankee: aspect-ratio lock — force partner axis to follow.
    if (aspectLock && target.aspect && isFinite(target.aspect) && target.aspect > 0) {
      var hasW = sides.indexOf('e') >= 0 || sides.indexOf('w') >= 0;
      var hasH = sides.indexOf('s') >= 0 || sides.indexOf('n') >= 0;
      if (hasW && hasH) {
        // Corner drag: pick axis with larger relative change as the driver.
        var rW = Math.abs(newW - startW) / Math.max(1, startW);
        var rH = Math.abs(newH - startH) / Math.max(1, startH);
        if (rW >= rH) newH = Math.max(20, newW / target.aspect);
        else newW = Math.max(20, newH * target.aspect);
      } else if (hasW) {
        newH = Math.max(20, newW / target.aspect);
      } else if (hasH) {
        newW = Math.max(20, newH * target.aspect);
      }
    }
    // Snap to grid
    newW = snapValue(newW);
    newH = snapValue(newH);
    var wActive = sides.indexOf('e') >= 0 || sides.indexOf('w') >= 0;
    var hActive = sides.indexOf('s') >= 0 || sides.indexOf('n') >= 0;
    if (aspectLock && target.aspect) { wActive = true; hActive = true; }
    if (axes.indexOf('w') >= 0 && wActive) {
      el.style.width = newW + 'px';
    }
    if (axes.indexOf('h') >= 0 && hActive) {
      el.style.height = newH + 'px';
      if (el.matches('.hdr-left')) {
        document.documentElement.style.setProperty('--header-h', newH + 'px');
      }
    }
    el._tx = startTx;
    el._ty = startTy;
    el.style.transform = 'translate(' + startTx + 'px, ' + startTy + 'px)';
    var cur = bcrInStage(el, stageRect, scale);
    var needTx = 0, needTy = 0;
    if (sym) {
      var cur_cx = (cur.left + cur.right) / 2;
      var cur_cy = (cur.top + cur.bottom) / 2;
      var start_cx = (startRect.left + startRect.right) / 2;
      var start_cy = (startRect.top + startRect.bottom) / 2;
      needTx = start_cx - cur_cx;
      needTy = start_cy - cur_cy;
    } else {
      if (sides.indexOf('e') >= 0 && sides.indexOf('w') < 0) needTx = startRect.left - cur.left;
      if (sides.indexOf('w') >= 0 && sides.indexOf('e') < 0) needTx = startRect.right - cur.right;
      if (sides.indexOf('s') >= 0 && sides.indexOf('n') < 0) needTy = startRect.top - cur.top;
      if (sides.indexOf('n') >= 0 && sides.indexOf('s') < 0) needTy = startRect.bottom - cur.bottom;
    }
    el._tx = startTx + needTx;
    el._ty = startTy + needTy;
    el.style.transform = 'translate(' + el._tx + 'px, ' + el._ty + 'px)';
    el._resizeUpdateLabel && el._resizeUpdateLabel();
  }

  function makeHandle(el, pos, axes) {
    var h = document.createElement('div');
    h.className = 'resize-handle ' + pos;
    el.appendChild(h);
    h.addEventListener('mousedown', function (e) { startResize(e, el, pos, axes); });
    h.addEventListener('touchstart', function (e) { startResize(touchToMouse(e), el, pos, axes); }, { passive: false });
    return h;
  }

  // Convert touch events to mouse-like (we capture relevant clientX/Y)
  function touchToMouse(e) {
    if (e.touches && e.touches[0]) {
      var t = e.touches[0];
      return {
        clientX: t.clientX, clientY: t.clientY,
        shiftKey: false, altKey: false, ctrlKey: false, metaKey: false,
        target: e.target,
        preventDefault: function () { e.preventDefault && e.preventDefault(); },
        stopPropagation: function () { e.stopPropagation && e.stopPropagation(); },
        _isTouch: true,
      };
    }
    return e;
  }

  function startResize(e, el, pos, axes) {
    if (isLocked(el)) return;
    e.stopPropagation && e.stopPropagation();
    e.preventDefault && e.preventDefault();
    var primarySides = sidesFromHandlePos(pos);
    var info = getStageRectInfo();
    var startX = e.clientX, startY = e.clientY;
    // Juliet-2 修正D: Photoshop 風 — 角ハンドルはデフォルトで縦横比固定、
    //   Shift 押下中は解除。辺ハンドルは逆 (Shift 押下中のみ縦横比固定)。
    //   Yankee の永続トグル state.aspectLocked が true ならこの判定に関わらず常に固定。
    var isCornerHandle = (pos && pos.indexOf('corner-') === 0);
    var captureTarget = function (target) {
      target.startW = target.el.offsetWidth;
      target.startH = target.el.offsetHeight;
      target.startTx = target.el._tx || 0;
      target.startTy = target.el._ty || 0;
      target.aspect = target.startW / Math.max(1, target.startH);
      target.startRect = bcrInStage(target.el, info.stageRect, info.scale);
      target.before = getResizeState(target.el);
    };
    var primaryTarget = { el: el, sides: primarySides };
    captureTarget(primaryTarget);

    // Group corner scale (multi-select corner-drag scales uniformly)
    var isGroupCornerScale = primarySides.length === 2 &&
      state.selectedElements.has(el) && state.selectedElements.size >= 2;
    var groupScale = null;
    if (isGroupCornerScale) {
      var sel = Array.from(state.selectedElements).filter(function (s) { return !isLocked(s); });
      var rects = sel.map(function (s) { return bcrInStage(s, info.stageRect, info.scale); });
      var minLeft = Math.min.apply(null, rects.map(function (r) { return r.left; }));
      var maxRight = Math.max.apply(null, rects.map(function (r) { return r.right; }));
      var minTop = Math.min.apply(null, rects.map(function (r) { return r.top; }));
      var maxBottom = Math.max.apply(null, rects.map(function (r) { return r.bottom; }));
      var gcx = (minLeft + maxRight) / 2;
      var gcy = (minTop + maxBottom) / 2;
      groupScale = {
        gcx: gcx, gcy: gcy,
        primaryOrigW: primaryTarget.startW,
        primaryOrigH: primaryTarget.startH,
        targets: sel.map(function (s, i) {
          return {
            el: s,
            origW: parseFloat(s.style.width) || s.offsetWidth,
            origH: parseFloat(s.style.height) || s.offsetHeight,
            origTx: s._tx || 0,
            origTy: s._ty || 0,
            origCx: (rects[i].left + rects[i].right) / 2,
            origCy: (rects[i].top + rects[i].bottom) / 2,
            before: getResizeState(s),
          };
        }),
      };
    }

    var linkingDisabled = e.ctrlKey || e.metaKey;
    var linkedTargets = (isGroupCornerScale || linkingDisabled) ? [] : findLinkedTargets(el, primarySides);
    linkedTargets.forEach(captureTarget);
    linkedTargets.forEach(function (t) { t.el.classList.add('edge-linked'); });

    var onMove = function (e2) {
      if (e2.touches && e2.touches[0]) e2 = touchToMouse(e2);
      var dx = (e2.clientX - startX) / info.scale;
      var dy = (e2.clientY - startY) / info.scale;
      var sym = e2.altKey;

      if (groupScale) {
        var newW = groupScale.primaryOrigW, newH = groupScale.primaryOrigH;
        if (primarySides.indexOf('e') >= 0) newW = Math.max(20, groupScale.primaryOrigW + dx);
        if (primarySides.indexOf('w') >= 0 && primarySides.indexOf('e') < 0) newW = Math.max(20, groupScale.primaryOrigW - dx);
        if (primarySides.indexOf('s') >= 0) newH = Math.max(20, groupScale.primaryOrigH + dy);
        if (primarySides.indexOf('n') >= 0 && primarySides.indexOf('s') < 0) newH = Math.max(20, groupScale.primaryOrigH - dy);
        var factor = (newW / groupScale.primaryOrigW + newH / groupScale.primaryOrigH) / 2;
        groupScale.targets.forEach(function (t) {
          t.el.style.width  = Math.round(t.origW * factor) + 'px';
          t.el.style.height = Math.round(t.origH * factor) + 'px';
          var newCx = groupScale.gcx + (t.origCx - groupScale.gcx) * factor;
          var newCy = groupScale.gcy + (t.origCy - groupScale.gcy) * factor;
          var sizeShiftX = (t.origW * factor - t.origW) / 2;
          var sizeShiftY = (t.origH * factor - t.origH) / 2;
          t.el._tx = t.origTx + (newCx - t.origCx) - sizeShiftX;
          t.el._ty = t.origTy + (newCy - t.origCy) - sizeShiftY;
          t.el.style.transform = 'translate(' + t.el._tx + 'px, ' + t.el._ty + 'px)';
          t.el._resizeUpdateLabel && t.el._resizeUpdateLabel();
        });
        emit('transform', { kind: 'group-resize' });
        return;
      }

      // Juliet-2 修正D: aspectLock 判定 (毎フレーム e2.shiftKey をサンプル)
      //   - state.aspectLocked が true (Yankee 永続トグル) → 常に固定
      //   - 角ハンドル + Shift OFF → 固定 (Photoshop 既定)
      //   - 辺ハンドル + Shift ON  → 固定
      //   - それ以外 → 自由
      var shiftHeld = !!e2.shiftKey;
      var aspectLock = !!state.aspectLocked
        || (isCornerHandle && !shiftHeld)
        || (!isCornerHandle && shiftHeld);
      performResize(primaryTarget, primarySides, dx, dy, sym, axes, info.stageRect, info.scale, aspectLock);
      linkedTargets.forEach(function (t) {
        performResize(t, t.sides, dx, dy, false, 'wh', info.stageRect, info.scale, false);
      });
      emit('transform', { kind: 'resize', el: el });
    };
    var onUp = function () {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      linkedTargets.forEach(function (t) { t.el.classList.remove('edge-linked'); });
      var allTargets = groupScale ? groupScale.targets : [primaryTarget].concat(linkedTargets);
      // Kilo-2 修正A: グループ/エッジリンクの同時リサイズも 1 op にまとめて undo 一括化
      var ops = [];
      allTargets.forEach(function (t) {
        var after = getResizeState(t.el);
        if (JSON.stringify(after) !== JSON.stringify(t.before)) {
          ops.push({ type: 'resize', el: t.el, before: t.before, after: after });
        }
      });
      pushHistoryBatch(ops);
      updateNumericPanel();
      // Echo-2: リサイズ後にも bbox 重なり再評価
      applyPreferredPointerSuppression();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }

  function attachMoveDrag(el) {
    var handler = function (e) {
      if (!state.enabled) return;
      if (isLocked(el)) {
        // Locked: still allow selection (so numeric panel is editable for review),
        // but no drag.
        if (e.shiftKey || state.multiSelectMode) { toggleSelect(el); }
        else {
          selectOnly(el);
          // Charlie-2: canvas 由来の単独選択は preferred を解除
          if (state.preferredTarget !== el) {
            state.preferredTarget = null;
            refreshPreferredTargetUI();
          }
        }
        return;
      }
      var tgt = e.target;
      if (tgt && tgt.classList && (tgt.classList.contains('resize-handle') ||
          tgt.classList.contains('resize-size-label') ||
          tgt.classList.contains('userbox-badge') ||
          tgt.classList.contains('userbox-del') ||
          tgt.classList.contains('le-lock-badge'))) return;
      // Skip if clicking inside an editable text and editing is active
      if (tgt && (tgt.isContentEditable || tgt.closest('[contenteditable="true"]')) &&
          document.activeElement === tgt) return;
      if (tgt !== el && !el.contains(tgt)) return;
      e.stopPropagation();
      e.preventDefault();

      // U10: Shift-click OR multi-select toggle mode → extend selection
      if (e.shiftKey || state.multiSelectMode) { toggleSelect(el); return; }
      if (!state.selectedElements.has(el)) {
        selectOnly(el);
        // Charlie-2: canvas で別要素を直接クリック → preferred 解除
        if (state.preferredTarget !== el) {
          state.preferredTarget = null;
          refreshPreferredTargetUI();
        }
      }

      var targets = Array.from(state.selectedElements).filter(function (t) { return !isLocked(t); });
      if (targets.length === 0) return;

      var startX = e.clientX, startY = e.clientY;
      var info = getStageRectInfo();
      var startStates = targets.map(function (t) {
        return { el: t, tx: t._tx || 0, ty: t._ty || 0, before: getResizeState(t) };
      });
      // Papa-2 修正2: ドラッグ対象 (parent) の unlinked 子孫を集めて counter-transform 用
      //   start state を保存。ドラッグ対象自身に既に含まれる要素は除外して二重適用を防ぐ。
      var movedSet = new Set(targets);
      var unlinkedStates = []; // {el, parent, tx, ty, before}
      if (state.unlinkedChildren && state.unlinkedChildren.size) {
        targets.forEach(function (parent) {
          state.unlinkedChildren.forEach(function (child) {
            if (movedSet.has(child)) return;
            if (parent === child) return;
            if (parent.contains(child)) {
              unlinkedStates.push({
                el: child,
                parent: parent,
                tx: child._tx || 0,
                ty: child._ty || 0,
                before: getResizeState(child)
              });
            }
          });
        });
      }

      var onMove = function (e2) {
        if (e2.touches && e2.touches[0]) e2 = touchToMouse(e2);
        var dx = (e2.clientX - startX) / info.scale;
        var dy = (e2.clientY - startY) / info.scale;
        if (e2.shiftKey) {
          if (Math.abs(dx) >= Math.abs(dy)) dy = 0; else dx = 0;
        }
        startStates.forEach(function (s) {
          var nx = snapValue(s.tx + dx);
          var ny = snapValue(s.ty + dy);
          s.el._tx = nx;
          s.el._ty = ny;
          s.el.style.transform = 'translate(' + nx + 'px, ' + ny + 'px)';
        });
        // Papa-2 修正2: unlinked 子に counter-transform を当て、視覚的に動かないようにする
        unlinkedStates.forEach(function (u) {
          var nx = u.tx - dx;
          var ny = u.ty - dy;
          u.el._tx = nx;
          u.el._ty = ny;
          u.el.style.transform = 'translate(' + nx + 'px, ' + ny + 'px)';
        });
        emit('transform', { kind: 'move' });
      };
      var onUp = function () {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onUp);
        // Kilo-2 修正A: 複数要素の同時ドラッグは 1 op (batch) にまとめる
        var ops = [];
        startStates.forEach(function (s) {
          var after = getResizeState(s.el);
          if (JSON.stringify(after) !== JSON.stringify(s.before)) {
            ops.push({ type: 'resize', el: s.el, before: s.before, after: after });
          }
        });
        // Papa-2 修正2: unlinked 子の counter-transform も同じ batch で undo できるよう積む
        unlinkedStates.forEach(function (u) {
          var after = getResizeState(u.el);
          if (JSON.stringify(after) !== JSON.stringify(u.before)) {
            ops.push({ type: 'resize', el: u.el, before: u.before, after: after });
          }
        });
        pushHistoryBatch(ops);
        updateNumericPanel();
        // Echo-2: 移動後に preferredTarget 周辺の bbox 関係が変わるので再評価
        applyPreferredPointerSuppression();
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onUp);
    };
    el.addEventListener('mousedown', handler);
    el.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches.length > 1) return; // ignore multi-touch
      handler(touchToMouse(e));
    }, { passive: false });
  }

  function isLocked(el) {
    var k = getElKey(el);
    return k && state.locked.has(k);
  }

  // ====================================================================
  //  Selection state
  // ====================================================================

  function refreshSelectionUI() {
    $$('.resizable').forEach(function (e) {
      var sel = state.selectedElements.has(e);
      e.classList.toggle('selected', sel);
      // Juliet-2 修正A: ハンドル個別にもクラスを付与し、子孫/specificity 競合に
      // 依らず確実に青化する。CSS 子孫セレクタが効かないケース(stacking context・
      // 別ルールの specificity 上書き等) のフォールバック。
      try {
        var handles = e.querySelectorAll('.resize-handle');
        for (var i = 0; i < handles.length; i++) {
          handles[i].classList.toggle('le-handle-selected', sel);
        }
      } catch (err) {}
    });
    document.body.classList.toggle('has-selection', state.selectedElements.size > 0);
    // Yankee: when aspect-lock is on, re-capture ratios for the new selection so
    // editing W/H from this point forward respects each element's current ratio.
    if (state.aspectLocked) captureAspectRatios();
    updateNumericPanel();
    // Charlie-2: preferred は selection に依存して reconcile されるので先に走らせる
    refreshPreferredTargetUI();
    refreshElementListSelection();
    refreshTopToolbarAlign();
    // Lima-2 修正B/C: src 差し替え / 取り出すボタンの enable 状態を選択に応じて更新
    refreshSelectionDependentButtons();
    emit('select', Array.from(state.selectedElements));
  }

  // Lima-2: toolbar の選択依存ボタン (📥 src 差し替え / 🔓 取り出す) の
  //   disabled 状態と tooltip を選択状況に応じて更新する。
  function refreshSelectionDependentButtons() {
    if (!state.toolbarEl) return;
    var n = state.selectedElements ? state.selectedElements.size : 0;
    var sel = (n === 1) ? state.selectedElements.values().next().value : null;

    var replaceBtn = state.toolbarEl.querySelector('#le-replace-src');
    if (replaceBtn) {
      if (n !== 1) {
        replaceBtn.disabled = true;
        replaceBtn.title = '差し替えるには要素を1つ選択してください';
      } else {
        // 画像差し替え可能な要素か簡易チェック (img / bg / 単一内側 img)
        var canReplace = false;
        try { canReplace = !!(sel && isImageElement(sel)); } catch (e) { canReplace = false; }
        replaceBtn.disabled = !canReplace;
        replaceBtn.title = canReplace
          ? '選択した要素の画像を差し替え（ファイル選択ダイアログ）'
          : '差し替え対象が見つかりません（img / 背景画像 / 単一内側img の要素を選択してください）';
      }
    }

    var detachBtn = state.toolbarEl.querySelector('#le-detach');
    if (detachBtn) {
      if (n !== 1) {
        detachBtn.disabled = true;
        detachBtn.title = '単一選択時のみ取り出せます';
      } else {
        var stage = state.canvasEl;
        var parent = sel ? sel.parentNode : null;
        var atTop = !parent || parent === stage;
        detachBtn.disabled = atTop;
        detachBtn.title = atTop
          ? '既に独立しています'
          : '選択中のレイヤーを親グループから取り出して独立編集可能にします';
      }
    }
  }
  // Charlie-2: preferredTarget が selection 外になったら自動解除し、
  // 視覚フィードバック (.le-preferred) を描画する。
  function refreshPreferredTargetUI() {
    if (state.preferredTarget && !state.selectedElements.has(state.preferredTarget)) {
      state.preferredTarget = null;
    }
    $$('.resizable').forEach(function (e) {
      e.classList.toggle('le-preferred', e === state.preferredTarget);
    });
    // 要素一覧の preferred マーカーも更新 (refreshSelectionUI 経由でない単発呼び出し用)
    if (state.listPanelEl) {
      var rows = state.listPanelEl.querySelectorAll('.le-list-row');
      rows.forEach(function (row) {
        var key = row.dataset.key;
        var m = key && key.match(/^(.+)\|(\d+)$/);
        if (!m) return;
        var all = $$(m[1]);
        var el = all[parseInt(m[2], 10)];
        row.classList.toggle('preferred', !!(el && el === state.preferredTarget));
      });
    }
    // Echo-2: 完全重なりレイヤーの pointer-events 抑止 — preferredTarget 以外で
    // bbox が重なっている要素は一時的に pointer-events: none にして、
    // 「青い四角を直接ドラッグしても手前のレイヤーに掴まれる」問題を解消する。
    applyPreferredPointerSuppression();
  }

  // Echo-2: preferredTarget set 時、それと bbox が重なる他 .resizable に
  // .le-pointer-suppressed を付与し、CSS で pointer-events: none にする。
  // preferredTarget 自身とそのハンドル / 子孫はそのままクリック可能。
  // preferredTarget が解除されたら全要素から外す。
  function applyPreferredPointerSuppression() {
    var pt = state.preferredTarget;
    var all = $$('.resizable');
    if (!pt) {
      all.forEach(function (el) { el.classList.remove('le-pointer-suppressed'); });
      return;
    }
    var ptRect = pt.getBoundingClientRect();
    var ptOk = ptRect.width > 0 && ptRect.height > 0;
    all.forEach(function (el) {
      if (el === pt || (pt.contains && pt.contains(el)) || (el.contains && el.contains(pt))) {
        // 自分自身 / 親子関係は抑止しない (子孫のクリック→pt にバブル可能にするため)
        el.classList.remove('le-pointer-suppressed');
        return;
      }
      if (!ptOk) { el.classList.remove('le-pointer-suppressed'); return; }
      var r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) {
        el.classList.remove('le-pointer-suppressed');
        return;
      }
      if (rectsIntersect(r, ptRect)) {
        el.classList.add('le-pointer-suppressed');
      } else {
        el.classList.remove('le-pointer-suppressed');
      }
    });
  }
  function selectOnly(el) {
    state.selectedElements.clear();
    if (el) state.selectedElements.add(el);
    refreshSelectionUI();
  }
  function toggleSelect(el) {
    if (state.selectedElements.has(el)) state.selectedElements.delete(el);
    else state.selectedElements.add(el);
    refreshSelectionUI();
  }
  function clearSelection() {
    state.selectedElements.clear();
    // Charlie-2: 全選択解除時は preferred も解除
    state.preferredTarget = null;
    refreshSelectionUI();
  }
  function addToSelection(el) {
    if (!el) return;
    state.selectedElements.add(el);
    refreshSelectionUI();
  }
  function selectMultiple(els) {
    state.selectedElements.clear();
    (els || []).forEach(function (el) { if (el) state.selectedElements.add(el); });
    refreshSelectionUI();
  }

  // ====================================================================
  //  Team Victor — Stack-pierce (Alt+Click) + Marquee (Shift+Drag)
  //
  //  Goal: when layers are stacked (e.g. a frame on top of a picture), the
  //  user must be able to select the layer below the topmost one. Standard
  //  click only hits the top-most element; Alt+Click cycles through the
  //  stack at the cursor, and Shift+Drag on empty canvas draws a rubber-band
  //  selection rectangle that selects every editable element it intersects.
  // ====================================================================

  // Return all .resizable elements whose bounding rect contains (clientX, clientY),
  // sorted top-most first (DOM later = visually higher in CSS stacking when no
  // explicit z-index, so we reverse DOM order; if z-index is set it wins).
  function getEditableElementsAtPoint(clientX, clientY) {
    var all = $$('.resizable');
    var hits = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      // Skip hidden / disabled
      if (el.classList.contains('user-hidden')) continue;
      var cs = window.getComputedStyle ? getComputedStyle(el) : null;
      if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) continue;
      var r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (clientX < r.left || clientX > r.right) continue;
      if (clientY < r.top || clientY > r.bottom) continue;
      hits.push({ el: el, dom: i, z: zIndexOf(el) });
    }
    // Sort: higher z-index first; on ties, later DOM order = higher.
    hits.sort(function (a, b) {
      if (b.z !== a.z) return b.z - a.z;
      return b.dom - a.dom;
    });
    return hits.map(function (h) { return h.el; });
  }
  function zIndexOf(el) {
    // Walk up the chain so a child of a positioned z-index parent inherits effective stacking.
    var z = 0;
    var cur = el;
    while (cur && cur !== document.body) {
      var cs = window.getComputedStyle ? getComputedStyle(cur) : null;
      if (cs) {
        var v = parseInt(cs.zIndex, 10);
        if (!isNaN(v)) { z = v; break; }
      }
      cur = cur.parentElement;
    }
    return z;
  }
  function rectsIntersect(a, b) {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  // Document-level capture-phase mousedown handler that runs BEFORE per-element
  // handlers (which call e.stopPropagation). It implements two new behaviors:
  //   1. Alt+Click           — drill-down through stacked editable elements
  //   2. Shift+Drag on bg    — rubber-band marquee selection
  // Other modifier combinations fall through to the existing handlers.
  function attachStackPierceAndMarquee() {
    var handler = function (e) {
      if (!state.enabled) return;
      if (e.button !== undefined && e.button !== 0) return;
      // Skip clicks on editor chrome (toolbar, panels, handles, overlays, etc.)
      if (e.target.closest && e.target.closest(
        '.le-toolbar, .numeric-panel, .le-list-panel, .le-help-modal, ' +
        '.le-comparison-picker, .le-context-menu, .le-pages-dropdown, ' +
        '.le-ruler, .le-guide, .resize-handle, .resize-size-label, ' +
        '.le-anno-layer, .userbox-badge, .userbox-del, .le-lock-badge, ' +
        '.le-marquee'
      )) return;
      // Skip while drawing (userbox add) or while in annotation mode
      if (state.drawModeOn) return;
      if (state.annoMode && state.annoTool && state.annoTool !== 'select') return;
      // Skip when editing text inline
      if (e.target.isContentEditable || (e.target.closest && e.target.closest('[contenteditable="true"]') && document.activeElement === e.target)) return;

      // --- Feature A: Alt+Click stack-pierce -------------------------------
      if (e.altKey) {
        var stack = getEditableElementsAtPoint(e.clientX, e.clientY);
        if (!stack.length) return;
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

        if (e.shiftKey) {
          // Alt+Shift+Click: add the next un-selected layer in the stack to the selection.
          var added = false;
          for (var i = 0; i < stack.length; i++) {
            if (!state.selectedElements.has(stack[i])) {
              addToSelection(stack[i]);
              added = true;
              break;
            }
          }
          if (!added) {
            // All in-stack already selected — toggle the topmost off as feedback.
            toggleSelect(stack[0]);
          }
        } else {
          // Alt+Click: cycle through the stack. If the currently-selected element
          // is in the stack, advance to the next layer below it; else pick top.
          var cur = (state.selectedElements && state.selectedElements.size === 1)
            ? state.selectedElements.values().next().value : null;
          var idx = cur ? stack.indexOf(cur) : -1;
          var nextIdx = idx === -1 ? 0 : (idx + 1) % stack.length;
          selectOnly(stack[nextIdx]);
          showToast('レイヤー ' + (nextIdx + 1) + ' / ' + stack.length);
        }
        // Charlie-2: Alt+Click 系は明示的なレイヤードリル操作なので preferred 解除
        state.preferredTarget = null;
        refreshPreferredTargetUI();
        return;
      }

      // --- Feature B: Shift+Drag marquee ----------------------------------
      // Only start marquee on empty canvas (NOT on an existing .resizable),
      // so that Shift+Click on an element keeps its existing additive-toggle behavior.
      if (e.shiftKey && !(e.target.closest && e.target.closest('.resizable'))) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        // Charlie-2: マーキー由来の選択は preferred 上書きしない (リスト由来でない)
        state.preferredTarget = null;
        refreshPreferredTargetUI();
        startMarquee(e.clientX, e.clientY, e.shiftKey);
        return;
      }

      // --- Charlie-2 機能B: preferredTarget 優先ターゲット pierce-through ---
      // 要素一覧で選んだ要素が現在選択中で、クリック位置がその要素の bbox 内に
      // あるなら、上に重なっている他要素のハンドラを抑止して preferredTarget の
      // ドラッグハンドラだけを走らせる。Shift/Ctrl/Meta 等の修飾は通常動作優先。
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var pt = state.preferredTarget;
        if (pt && state.selectedElements && state.selectedElements.has(pt) &&
            !pt.classList.contains('user-hidden') && !isLocked(pt)) {
          var rect = pt.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 &&
              e.clientX >= rect.left && e.clientX <= rect.right &&
              e.clientY >= rect.top && e.clientY <= rect.bottom) {
            // クリック先が pt 自身 / その子孫なら、通常通り pt.attachMoveDrag が掴む
            // ので何もしない (multi-select 維持のため)。
            // クリック先が pt を含まない (= 上に重なる別 .resizable など) 場合、
            // 他要素の handler を捕食して pt のハンドラを直接呼ぶ。
            var inPt = (e.target === pt) || (pt.contains && pt.contains(e.target));
            if (!inPt) {
              e.stopPropagation();
              if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
              // pt 上で発火したかのように同じ MouseEvent をディスパッチ。
              // attachMoveDrag は el.addEventListener('mousedown', handler) で
              // 登録済みなので、新しい MouseEvent を pt に対して dispatch すると
              // 同じ handler が実行される。
              var fake = new MouseEvent('mousedown', {
                bubbles: true, cancelable: true,
                clientX: e.clientX, clientY: e.clientY,
                button: e.button, buttons: e.buttons,
                shiftKey: e.shiftKey, ctrlKey: e.ctrlKey,
                altKey: e.altKey, metaKey: e.metaKey,
                view: window
              });
              pt.dispatchEvent(fake);
              return;
            }
          }
        }
      }
    };
    addManagedListener(document, 'mousedown', handler, true /* capture */);

    // Visual hint: while Alt is held, signal stack-pierce mode via body class.
    var keyDown = function (ev) {
      if (ev.altKey) document.body.classList.add('le-alt-down');
    };
    var keyUp = function (ev) {
      if (!ev.altKey) document.body.classList.remove('le-alt-down');
    };
    var blur = function () { document.body.classList.remove('le-alt-down'); };
    addManagedListener(window, 'keydown', keyDown);
    addManagedListener(window, 'keyup', keyUp);
    addManagedListener(window, 'blur', blur);
    registerCleanup(function () { document.body.classList.remove('le-alt-down', 'le-marquee-active'); });
  }

  function startMarquee(originX, originY, additive) {
    var overlay = document.createElement('div');
    overlay.className = 'le-marquee';
    overlay.style.left = originX + 'px';
    overlay.style.top = originY + 'px';
    overlay.style.width = '0px';
    overlay.style.height = '0px';
    document.body.appendChild(overlay);
    document.body.classList.add('le-marquee-active');

    var moved = false;
    var lastRect = { left: originX, top: originY, right: originX, bottom: originY };

    var onMove = function (ev) {
      var x = ev.clientX, y = ev.clientY;
      var l = Math.min(originX, x), t = Math.min(originY, y);
      var w = Math.abs(x - originX), h = Math.abs(y - originY);
      overlay.style.left = l + 'px';
      overlay.style.top = t + 'px';
      overlay.style.width = w + 'px';
      overlay.style.height = h + 'px';
      lastRect = { left: l, top: t, right: l + w, bottom: t + h };
      if (w >= 3 || h >= 3) moved = true;
    };
    var onUp = function () {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mouseup', onUp, true);
      overlay.remove();
      document.body.classList.remove('le-marquee-active');
      if (!moved) {
        // Treat as a plain shift-click on background → preserve old "clear selection"
        // behavior only if not additive (additive shift-click on bg = no-op).
        if (!additive && state.selectedElements.size > 0) clearSelection();
        return;
      }
      var hits = $$('.resizable').filter(function (el) {
        if (el.classList.contains('user-hidden')) return false;
        var cs = window.getComputedStyle ? getComputedStyle(el) : null;
        if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return false;
        var r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return false;
        return rectsIntersect(r, lastRect);
      });
      if (additive) {
        hits.forEach(function (el) { state.selectedElements.add(el); });
        refreshSelectionUI();
      } else {
        selectMultiple(hits);
      }
      if (hits.length) showToast(hits.length + ' 個を選択');
    };
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mouseup', onUp, true);
  }

  function elementShortLabel(el) {
    var cls = (Array.from(el.classList).filter(function (c) {
      return ['resizable', 'selected', 'edge-linked', 'le-locked'].indexOf(c) < 0;
    })[0]) || el.tagName.toLowerCase();
    var sibs = el.parentElement ? Array.from(el.parentElement.children).filter(function (c) { return c.classList.contains(cls); }) : [el];
    var idx = sibs.indexOf(el);
    return '.' + cls + (sibs.length > 1 ? '[' + idx + ']' : '');
  }

  // ====================================================================
  //  Numeric panel with +/- spinners (FEATURE 19)
  // ====================================================================

  function buildNumericPanel() {
    var panel = document.createElement('div');
    panel.className = 'numeric-panel';
    panel.id = 'numeric-panel';
    panel.innerHTML =
      '<h4>選択中: <span id="np-count">0</span> 個</h4>' +
      '<div class="np-targets" id="np-targets">(なし)</div>' +
      makeSpinnerRow('w', 'W', { aspect: true }) + makeSpinnerRow('h', 'H') +
      makeSpinnerRow('tx', 'TX') + makeSpinnerRow('ty', 'TY') +
      // Foxtrot-2: 単一画像選択時に natural size とパーセントを表示
      '<div class="np-natural-info" id="np-natural-info" style="display:none"></div>' +
      '<button class="np-reset-100" id="np-reset-100" type="button" style="display:none" title="自然サイズ (100%) に戻す">100% に戻す</button>' +
      '<div class="np-section-title">表示</div>' +
      '<div class="np-align-row">' +
      '  <button class="np-align" id="np-hide" title="選択中の要素を非表示">🗑 隠す</button>' +
      '  <button class="np-align" id="np-show-all" title="非表示要素を全て元に戻す">↺ 全て表示</button>' +
      '</div>' +
      '<div class="np-section-title">整列</div>' +
      buildAlignmentToolbarHtml() +
      '<div class="np-hint">Shift+クリック=追加選択 / Shift+ドラッグ=範囲選択 / Alt+クリック=下のレイヤー / Alt+Shift+クリック=下のレイヤー追加 / Shift+Arrow ±10</div>';
    document.body.appendChild(panel);
    state.numericPanelEl = panel;
    wireSpinners(panel);
    wireAlignmentToolbar(panel);
    panel.querySelector('#np-hide').addEventListener('click', hideSelectedElements);
    panel.querySelector('#np-show-all').addEventListener('click', showAllHiddenElements);
    var resetBtn = panel.querySelector('#np-reset-100');
    if (resetBtn) resetBtn.addEventListener('click', resetImageTo100Pct);
    syncAspectLockButton();
  }

  // Golf-2: 「100% に戻す」と自然サイズ表示を、選択要素そのものが <img> の場合
  // だけに限定する。Foxtrot-2 ではラッパ内に img が 1 個ならその img の natural
  // を返していたが、ユーザー視点では「ラッパ (例: .hint-panel) を選択したのに
  // 中の silhouette img の natural にラッパごとリサイズされる」誤誘導になるため
  // 廃止。wrapper を 100% に戻したい場合はその wrapper 内の img を直接選択する。
  // Hotel-2: CSS background-image 要素 (例: .discovery-popup) も natural size を
  //   非同期取得して 100% リセットを可能にする。url を Image() で probe してキャッシュ。
  var bgImageNaturalCache = new Map(); // url → { status, w, h, callbacks }
  function getBgImageUrl(el) {
    if (!el || !el.nodeType || el.nodeType !== 1) return null;
    var bg;
    try {
      bg = (el.style && el.style.backgroundImage) || '';
      if (!bg || bg === 'none') bg = getComputedStyle(el).backgroundImage || '';
    } catch (e) { return null; }
    if (!bg || bg === 'none') return null;
    // 'url("...")' or 'url(\'...\')' or 'url(...)' を抽出 (multi-bg は先頭のみ採用)
    var m = bg.match(/url\(["']?([^"')]+)["']?\)/);
    return m ? m[1] : null;
  }
  function getBgImageNaturalSize(el, onLoad) {
    var url = getBgImageUrl(el);
    if (!url) return null;
    var cached = bgImageNaturalCache.get(url);
    if (cached && cached.status === 'loaded') return { w: cached.w, h: cached.h };
    if (cached && cached.status === 'error') return null;
    if (cached && cached.status === 'loading') {
      if (onLoad) cached.callbacks.push(onLoad);
      return null;
    }
    // 新規 probe
    var entry = { status: 'loading', callbacks: onLoad ? [onLoad] : [] };
    bgImageNaturalCache.set(url, entry);
    var probe = new Image();
    probe.onload = function () {
      var cbs = (bgImageNaturalCache.get(url) || {}).callbacks || [];
      bgImageNaturalCache.set(url, { status: 'loaded', w: probe.naturalWidth, h: probe.naturalHeight });
      cbs.forEach(function (cb) { try { cb && cb(); } catch (e) {} });
    };
    probe.onerror = function () {
      bgImageNaturalCache.set(url, { status: 'error' });
    };
    probe.src = url;
    return null;
  }
  // Hotel-2: el が <img> なら従来通り naturalWidth/Height、そうでなければ
  //   CSS background-image を probe して natural size を取得。bg の場合は
  //   isBg:true をマークして UI 側でラベルを切り替えられるようにする。
  // Papa-2 修正1: target フィールドを追加。リサイズすべき要素は
  //   wrapper (.le-dropped-img) なら wrapper、それ以外は el 自身。
  //   getImageNaturalSize に <img> を渡したとき、その親が .le-dropped-img wrapper
  //   なら target = wrapper を返す (内側 img だけリサイズして wrapper と不一致に
  //   なる問題を解消)。逆に wrapper を渡されたときは内側 img の natural を返す。
  function getImageNaturalSize(el, onLoad) {
    if (!el) return null;
    if (el.tagName === 'IMG') {
      if (el.naturalWidth > 0 && el.naturalHeight > 0) {
        // Papa-2 修正1: 親が .le-dropped-img なら wrapper を target にする
        var parentWrap = el.parentNode;
        var isInDropWrap = parentWrap && parentWrap.classList &&
          parentWrap.classList.contains('le-dropped-img');
        return {
          w: el.naturalWidth,
          h: el.naturalHeight,
          img: el,
          target: isInDropWrap ? parentWrap : el
        };
      }
      return null;
    }
    // Papa-2 修正1: wrapper を渡されたら内側 img の natural を返す
    if (el.classList && el.classList.contains('le-dropped-img')) {
      var innerImg = el.querySelector('img');
      if (innerImg && innerImg.naturalWidth > 0 && innerImg.naturalHeight > 0) {
        return {
          w: innerImg.naturalWidth,
          h: innerImg.naturalHeight,
          img: innerImg,
          target: el
        };
      }
      // wrapper だが natural 未確定 → load 完了で再描画させる
      if (innerImg && innerImg.naturalWidth === 0 && onLoad && !innerImg._papa2NaturalListen) {
        innerImg._papa2NaturalListen = true;
        innerImg.addEventListener('load', function () {
          innerImg._papa2NaturalListen = false;
          try { onLoad(); } catch (e) {}
        }, { once: true });
      }
      return null;
    }
    var bg = getBgImageNaturalSize(el, onLoad);
    if (bg) return { w: bg.w, h: bg.h, isBg: true, target: el };
    return null;
  }

  // Foxtrot-2: 「100% に戻す」ボタン — 単一画像選択時に natural size を W/H に流し込む
  // Papa-2 修正1: ns.target を使って wrapper / 内側 img どちらが選択されていても
  //   wrapper のサイズが新画像の natural size になるようにする。
  function resetImageTo100Pct() {
    if (!state.selectedElements || state.selectedElements.size !== 1) return;
    var sel = Array.from(state.selectedElements)[0];
    var ns = getImageNaturalSize(sel);
    if (!sel || !ns) return;
    // Papa-2 修正1: wrapper があれば wrapper をリサイズ対象にする (差し替え後の
    //   内側 img の naturalSize に wrapper を追従させ、はみ出し/ずれを解消)
    var target = ns.target || sel;
    // 縦横比ロックの有無に関わらず natural の正確な W,H を直接流し込む。
    var before = getResizeState(target);
    applyOnePropToEl(target, 'w', ns.w);
    applyOnePropToEl(target, 'h', ns.h);
    var after = getResizeState(target);
    if (JSON.stringify(after) !== JSON.stringify(before)) {
      pushHistory({ type: 'resize', el: target, before: before, after: after });
    }
    // ロック中なら新サイズで比率をキャプチャし直す (1:1 リセット後の意図に揃える)
    if (state.aspectLocked) captureAspectRatios();
    updateNumericPanel();
    showToast('自然サイズ (' + ns.w + '×' + ns.h + ') に戻しました');
  }

  function makeSpinnerRow(prop, label, opts) {
    var rowCls = 'np-row' + (opts && opts.aspect ? ' np-row-aspect' : '');
    var aspectBtn = (opts && opts.aspect)
      ? '<button class="le-aspect-lock" id="np-aspect-lock" type="button"' +
        ' data-aspect-locked="false" aria-label="縦横比をロック"' +
        ' title="縦横比をロック (W と H を比例して連動)">🔓</button>'
      : '';
    return '<div class="' + rowCls + '">' +
      '<label>' + label +
      '  <button class="np-spin np-minus" data-prop="' + prop + '" data-dir="-1" tabindex="-1">−</button>' +
      '  <input type="number" id="np-' + prop + '" step="1">' +
      '  <button class="np-spin np-plus" data-prop="' + prop + '" data-dir="+1" tabindex="-1">+</button>' +
      aspectBtn +
      '</label>' +
      '</div>';
  }

  function wireSpinners(root) {
    ['w', 'h', 'tx', 'ty'].forEach(function (prop) {
      var input = $('#np-' + prop, root);
      if (!input) return;
      input.addEventListener('change', function (e) {
        applyNumericInput(prop, e.target.value);
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          var step = e.shiftKey ? 10 : (e.altKey ? 0.5 : 1);
          var dir = e.key === 'ArrowUp' ? 1 : -1;
          stepNumeric(prop, dir * step);
        }
      });
    });
    root.querySelectorAll('.np-spin').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var dir = parseInt(btn.dataset.dir, 10);
        var step = e.shiftKey ? 10 : (e.altKey ? 0.5 : 1);
        stepNumeric(btn.dataset.prop, dir * step);
      });
    });
    var lockBtn = $('#np-aspect-lock', root);
    if (lockBtn) {
      lockBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleAspectLock();
      });
    }
  }

  // ====================================================================
  //  Aspect ratio lock (Yankee) — link W <-> H in the numeric panel
  // ====================================================================

  function captureAspectRatios() {
    var map = new WeakMap();
    if (!state.selectedElements) { state.aspectRatios = map; return; }
    state.selectedElements.forEach(function (el) {
      var w = parseFloat(el.style.width) || el.offsetWidth;
      var h = parseFloat(el.style.height) || el.offsetHeight;
      if (w > 0 && h > 0) map.set(el, w / h);
    });
    state.aspectRatios = map;
  }

  function syncAspectLockButton() {
    if (!state.numericPanelEl) return;
    var btn = state.numericPanelEl.querySelector('#np-aspect-lock');
    if (!btn) return;
    var locked = !!state.aspectLocked;
    btn.dataset.aspectLocked = locked ? 'true' : 'false';
    btn.textContent = locked ? '🔒' : '🔓';
    btn.setAttribute('aria-label', locked ? '縦横比のロックを解除' : '縦横比をロック');
    btn.setAttribute('aria-pressed', locked ? 'true' : 'false');
  }

  function toggleAspectLock() {
    state.aspectLocked = !state.aspectLocked;
    if (state.aspectLocked) {
      captureAspectRatios();
    } else {
      state.aspectRatios = null;
    }
    syncAspectLockButton();
    showToast(state.aspectLocked ? '縦横比をロックしました' : '縦横比のロックを解除');
  }

  function getAspectRatioFor(el) {
    if (!state.aspectLocked || !state.aspectRatios) return 0;
    var r = state.aspectRatios.get(el);
    if (r && isFinite(r) && r > 0) return r;
    // Fallback: capture on the fly if missing (e.g. selection changed but
    // re-capture didn't run yet).
    var w = parseFloat(el.style.width) || el.offsetWidth;
    var h = parseFloat(el.style.height) || el.offsetHeight;
    if (w > 0 && h > 0) {
      r = w / h;
      try { state.aspectRatios.set(el, r); } catch (e) {}
      return r;
    }
    return 0;
  }

  function stepNumeric(prop, delta) {
    var sel = Array.from(state.selectedElements).filter(function (el) { return !isLocked(el); });
    if (!sel.length) return;
    var beforeMap = new Map();
    sel.forEach(function (el) { beforeMap.set(el, getResizeState(el)); });
    sel.forEach(function (el) {
      var cur;
      if (prop === 'w') cur = parseFloat(el.style.width) || el.offsetWidth;
      else if (prop === 'h') cur = parseFloat(el.style.height) || el.offsetHeight;
      else if (prop === 'tx') cur = el._tx || 0;
      else cur = el._ty || 0;
      var nv = cur + delta;
      applyOnePropToEl(el, prop, nv);
      applyAspectLinkedProp(el, prop, nv);
    });
    // Kilo-2 修正A: 数値スピナーの一括変更も batch 化
    var ops = [];
    sel.forEach(function (el) {
      var after = getResizeState(el);
      var before = beforeMap.get(el);
      if (JSON.stringify(after) !== JSON.stringify(before)) {
        ops.push({ type: 'resize', el: el, before: before, after: after });
      }
    });
    pushHistoryBatch(ops);
    updateNumericPanel();
  }

  // If aspectLocked is on and prop is 'w' or 'h', also apply the partner axis
  // for the given element using the captured ratio.
  function applyAspectLinkedProp(el, prop, value) {
    if (!state.aspectLocked) return;
    if (prop !== 'w' && prop !== 'h') return;
    var ratio = getAspectRatioFor(el);
    if (!ratio) return;
    if (prop === 'w') {
      var newH = Math.max(1, Math.round(value / ratio));
      applyOnePropToEl(el, 'h', newH);
    } else {
      var newW = Math.max(1, Math.round(value * ratio));
      applyOnePropToEl(el, 'w', newW);
    }
  }

  function applyOnePropToEl(el, prop, value) {
    if (state.gridOn) value = snapValue(value);
    if (prop === 'w') el.style.width = value + 'px';
    else if (prop === 'h') {
      el.style.height = value + 'px';
      if (el.matches('.hdr-left')) document.documentElement.style.setProperty('--header-h', value + 'px');
    } else if (prop === 'tx') {
      el._tx = value;
      el.style.transform = 'translate(' + el._tx + 'px, ' + (el._ty || 0) + 'px)';
    } else if (prop === 'ty') {
      el._ty = value;
      el.style.transform = 'translate(' + (el._tx || 0) + 'px, ' + el._ty + 'px)';
    }
    el._resizeUpdateLabel && el._resizeUpdateLabel();
  }

  function applyNumericInput(prop, valueStr) {
    var value = parseFloat(valueStr);
    if (Number.isNaN(value)) return;
    // U6: Numeric input is an explicit override — applies even to locked elements.
    var sel = Array.from(state.selectedElements);
    if (!sel.length) return;
    var hadLocked = sel.some(isLocked);
    var beforeMap = new Map();
    sel.forEach(function (el) { beforeMap.set(el, getResizeState(el)); });
    sel.forEach(function (el) {
      applyOnePropToEl(el, prop, value);
      applyAspectLinkedProp(el, prop, value);
    });
    // Kilo-2 修正A: 数値直接入力の一括反映も batch 化
    var ops = [];
    sel.forEach(function (el) {
      var after = getResizeState(el);
      var before = beforeMap.get(el);
      if (JSON.stringify(after) !== JSON.stringify(before)) {
        ops.push({ type: 'resize', el: el, before: before, after: after });
      }
    });
    pushHistoryBatch(ops);
    if (hadLocked) showToast('ロック中の要素にも数値入力を反映しました');
    updateNumericPanel();
  }

  function updateNumericPanel() {
    var panel = state.numericPanelEl;
    if (!panel) return;
    var sel = Array.from(state.selectedElements);
    var countEl = $('#np-count');
    if (countEl) countEl.textContent = String(sel.length);
    var tEl = $('#np-targets');
    if (tEl) tEl.textContent = sel.length ? sel.map(elementShortLabel).join(', ') : '(なし)';
    var getVal = function (el, prop) {
      if (prop === 'w') return parseFloat(el.style.width) || el.offsetWidth;
      if (prop === 'h') return parseFloat(el.style.height) || el.offsetHeight;
      if (prop === 'tx') return Math.round(el._tx || 0);
      if (prop === 'ty') return Math.round(el._ty || 0);
      return 0;
    };
    ['w', 'h', 'tx', 'ty'].forEach(function (prop) {
      var input = $('#np-' + prop);
      if (!input) return;
      if (document.activeElement === input) return;
      if (sel.length === 0) { input.value = ''; input.placeholder = ''; return; }
      var vals = sel.map(function (el) { return Math.round(getVal(el, prop)); });
      var allSame = vals.every(function (v) { return v === vals[0]; });
      if (allSame) { input.value = vals[0]; input.placeholder = ''; }
      else { input.value = ''; input.placeholder = '異なる'; }
    });

    // Foxtrot-2: 単一選択かつ画像ならば、自然サイズと現在の表示比率 (%) を表示。
    // 非画像 / 複数選択 / 画像未ロード時は非表示。
    // Hotel-2: <img> だけでなく background-image を持つ要素にも対応 (probe を非同期で
    //   ロードして load 完了時に panel を再描画)。
    var infoEl = panel.querySelector('#np-natural-info');
    var resetBtn = panel.querySelector('#np-reset-100');
    var ns = null;
    if (sel.length === 1) {
      ns = getImageNaturalSize(sel[0], function () { updateNumericPanel(); });
    }
    // 画像未ロードのケース: 1個選択 & 選択要素自身が img で naturalWidth=0 なら、
    // load 完了時に再描画する one-shot リスナを張る (再選択不要にする)。
    // Golf-2: wrapper 内 img は対象外 (getImageNaturalSize と一貫させる)。
    if (!ns && sel.length === 1) {
      var single0 = sel[0];
      var probe = (single0.tagName === 'IMG') ? single0 : null;
      if (probe && probe.naturalWidth === 0 && !probe._foxtrot2NaturalListen) {
        probe._foxtrot2NaturalListen = true;
        probe.addEventListener('load', function () {
          probe._foxtrot2NaturalListen = false;
          updateNumericPanel();
        }, { once: true });
      }
    }
    if (infoEl && resetBtn) {
      if (ns) {
        // Papa-2 修正1: % 計算は ns.target (wrapper 優先) のサイズに基づく。
        //   内側 img を選んだ場合 single.style.width は "100%" で誤計算になるため、
        //   target を使って wrapper の実寸を見る。
        var measureEl = ns.target || sel[0];
        var realW = parseFloat(measureEl.style.width) || measureEl.offsetWidth || 0;
        var realH = parseFloat(measureEl.style.height) || measureEl.offsetHeight || 0;
        var pctW = (realW / ns.w * 100);
        var pctH = (realH / ns.h * 100);
        var fmt = function (n) {
          // 整数なら小数なし、それ以外は小数1桁
          return (Math.abs(n - Math.round(n)) < 0.05) ? String(Math.round(n)) : n.toFixed(1);
        };
        // Hotel-2: bg-image 要素には「自然 (背景)」と明示
        var label = ns.isBg ? '自然 (背景)' : '自然';
        infoEl.innerHTML =
          label + ': ' + ns.w + '×' + ns.h +
          ' &nbsp;<b>' + fmt(pctW) + '% × ' + fmt(pctH) + '%</b>';
        infoEl.style.display = '';
        resetBtn.style.display = '';
      } else {
        infoEl.style.display = 'none';
        resetBtn.style.display = 'none';
      }
    }
  }

  // ====================================================================
  //  Hide / Show (FEATURE 12)
  // ====================================================================

  function hideSelectedElements() {
    var sel = Array.from(state.selectedElements);
    if (!sel.length) { showToast('隠す対象を選択してください', 'error'); return; }
    // Kilo-2 修正A: 複数同時 hide も batch にまとめる
    var ops = [];
    sel.forEach(function (el) {
      el.classList.add('user-hidden');
      ops.push({ type: 'hide', el: el });
    });
    pushHistoryBatch(ops);
    state.selectedElements.clear();
    refreshSelectionUI();
    refreshElementList();
    showToast(sel.length + ' 個を隠しました');
  }
  function showAllHiddenElements() {
    var hidden = $$('.user-hidden');
    if (!hidden.length) { showToast('隠してる枠はありません', 'error'); return; }
    // Kilo-2 修正A: 複数同時 show も batch にまとめる
    var ops = [];
    hidden.forEach(function (el) {
      el.classList.remove('user-hidden');
      ops.push({ type: 'show', el: el });
    });
    pushHistoryBatch(ops);
    refreshElementList();
    showToast(hidden.length + ' 個を再表示');
  }

  // ====================================================================
  //  Alignment toolbar (FEATURE 20)
  // ====================================================================

  function buildAlignmentToolbarHtml() {
    return '<div class="le-align-bar">' +
      '<button class="le-align" data-align="left"     title="左揃え">⇤</button>' +
      '<button class="le-align" data-align="center-h" title="水平中央">⇔</button>' +
      '<button class="le-align" data-align="right"    title="右揃え">⇥</button>' +
      '<button class="le-align" data-align="top"      title="上揃え">⤒</button>' +
      '<button class="le-align" data-align="center-v" title="垂直中央">⇕</button>' +
      '<button class="le-align" data-align="bottom"   title="下揃え">⤓</button>' +
      '<button class="le-align" data-align="dist-h"   title="水平等間隔">⇋</button>' +
      '<button class="le-align" data-align="dist-v"   title="垂直等間隔">⇌</button>' +
      '</div>';
  }
  function wireAlignmentToolbar(root) {
    root.querySelectorAll('.le-align').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyAlignment(btn.dataset.align);
      });
    });
  }
  function applyAlignment(kind) {
    var sel = Array.from(state.selectedElements).filter(function (el) { return !isLocked(el); });
    if (sel.length < 2) { showToast('整列するには 2 個以上選択', 'error'); return; }
    var info = getStageRectInfo();
    var rects = sel.map(function (el) { return bcrInStage(el, info.stageRect, info.scale); });
    var beforeMap = new Map();
    sel.forEach(function (el) { beforeMap.set(el, getResizeState(el)); });
    var minLeft = Math.min.apply(null, rects.map(function (r) { return r.left; }));
    var maxRight = Math.max.apply(null, rects.map(function (r) { return r.right; }));
    var minTop  = Math.min.apply(null, rects.map(function (r) { return r.top; }));
    var maxBottom = Math.max.apply(null, rects.map(function (r) { return r.bottom; }));
    var cx = (minLeft + maxRight) / 2, cy = (minTop + maxBottom) / 2;

    if (kind === 'dist-h' || kind === 'dist-v') {
      // distribute: keep first/last in place, equalize gaps for middle items
      var sorted = sel.slice().sort(function (a, b) {
        var ra = bcrInStage(a, info.stageRect, info.scale);
        var rb = bcrInStage(b, info.stageRect, info.scale);
        return kind === 'dist-h' ? (ra.left - rb.left) : (ra.top - rb.top);
      });
      if (sorted.length < 3) { showToast('等間隔は 3 個以上必要', 'error'); return; }
      var first = bcrInStage(sorted[0], info.stageRect, info.scale);
      var last  = bcrInStage(sorted[sorted.length - 1], info.stageRect, info.scale);
      if (kind === 'dist-h') {
        var totalSpan = last.left - first.left;
        var step = totalSpan / (sorted.length - 1);
        sorted.forEach(function (el, i) {
          if (i === 0 || i === sorted.length - 1) return;
          var r = bcrInStage(el, info.stageRect, info.scale);
          var targetLeft = first.left + step * i;
          var dx = targetLeft - r.left;
          el._tx = (el._tx || 0) + dx;
          el.style.transform = 'translate(' + el._tx + 'px, ' + (el._ty || 0) + 'px)';
        });
      } else {
        var totalSpanV = last.top - first.top;
        var stepV = totalSpanV / (sorted.length - 1);
        sorted.forEach(function (el, i) {
          if (i === 0 || i === sorted.length - 1) return;
          var r = bcrInStage(el, info.stageRect, info.scale);
          var targetTop = first.top + stepV * i;
          var dy = targetTop - r.top;
          el._ty = (el._ty || 0) + dy;
          el.style.transform = 'translate(' + (el._tx || 0) + 'px, ' + el._ty + 'px)';
        });
      }
    } else {
      sel.forEach(function (el, i) {
        var r = rects[i];
        var dx = 0, dy = 0;
        if (kind === 'left') dx = minLeft - r.left;
        else if (kind === 'right') dx = maxRight - r.right;
        else if (kind === 'center-h') dx = cx - (r.left + r.right) / 2;
        else if (kind === 'top') dy = minTop - r.top;
        else if (kind === 'bottom') dy = maxBottom - r.bottom;
        else if (kind === 'center-v') dy = cy - (r.top + r.bottom) / 2;
        if (dx) el._tx = (el._tx || 0) + dx;
        if (dy) el._ty = (el._ty || 0) + dy;
        if (dx || dy) el.style.transform = 'translate(' + (el._tx || 0) + 'px, ' + (el._ty || 0) + 'px)';
      });
    }

    // Kilo-2 修正A: 整列/分布も全要素を 1 つの batch にまとめる
    var ops = [];
    sel.forEach(function (el) {
      var after = getResizeState(el);
      var before = beforeMap.get(el);
      if (JSON.stringify(after) !== JSON.stringify(before)) {
        ops.push({ type: 'resize', el: el, before: before, after: after });
      }
      el._resizeUpdateLabel && el._resizeUpdateLabel();
    });
    pushHistoryBatch(ops);
    updateNumericPanel();
  }

  // ====================================================================
  //  Element list panel (FEATURE 21)
  //   Mike-2 修正B: 要素一覧 row を dblclick → インライン rename。
  //   - 動的要素 (.le-dropped-img / .le-added-text) は dataset.leLabel に直接書く
  //   - spec 要素 (.pono-guide 等) は spec の元ラベルを破壊しないように
  //     localStorage の override マップに保存
  // ====================================================================

  function specLabelOverridesStorageKey() {
    return 'le-spec-labels:' + (location.pathname || '/');
  }
  function loadSpecLabelOverrides() {
    try {
      var raw = localStorage.getItem(specLabelOverridesStorageKey());
      var obj = raw ? JSON.parse(raw) : null;
      return (obj && typeof obj === 'object') ? obj : {};
    } catch (e) { return {}; }
  }
  function saveSpecLabelOverrides(map) {
    try {
      localStorage.setItem(specLabelOverridesStorageKey(), JSON.stringify(map || {}));
    } catch (e) { console.warn('[LayoutEditor] saveSpecLabelOverrides failed', e); }
  }
  // spec 要素の表示ラベルを解決 (override → spec の素のラベル)
  function getSpecLabelOverride(key) {
    if (!key) return '';
    var map = loadSpecLabelOverrides();
    return (map && typeof map[key] === 'string') ? map[key] : '';
  }
  function setSpecLabelOverride(key, label) {
    if (!key) return;
    var map = loadSpecLabelOverrides();
    if (label && label.length) map[key] = label;
    else delete map[key];
    saveSpecLabelOverrides(map);
  }

  function buildElementListPanel() {
    var panel = document.createElement('div');
    panel.className = 'le-list-panel';
    panel.id = 'le-list-panel';
    panel.innerHTML = '<div class="le-list-head">📋 要素一覧</div><div class="le-list-body"></div>';
    document.body.appendChild(panel);
    state.listPanelEl = panel;
    refreshElementList();
  }

  function refreshElementList() {
    if (!state.listPanelEl) return;
    var body = state.listPanelEl.querySelector('.le-list-body');
    body.innerHTML = '';
    // Charlie-2 機能A:
    // 要素一覧は Photoshop/Figma 慣習に倣い、視覚的に手前のレイヤー
    // (z-index 高い) を上位に出す。spec 全件分の row 情報をいったん集めてから
    // z-index 降順でソートして描画する。
    var rowEntries = [];
    var seen = new Set();
    // Mike-2 修正B: spec 要素の rename override を一括ロード
    var specOverrides = loadSpecLabelOverrides();
    state.spec.forEach(function (entry) {
      var sel = entry[0], baseLabel = entry[2] || sel;
      $$(sel).forEach(function (el, idx) {
        var key = sel + '|' + idx;
        var label = (specOverrides && typeof specOverrides[key] === 'string' && specOverrides[key])
          ? specOverrides[key]
          : baseLabel;
        rowEntries.push({ el: el, sel: sel, idx: idx, label: label, dynamic: false });
        seen.add(el);
      });
    });
    // Juliet-2 修正B: 動的に追加された要素 (.le-dropped-img / .le-added-text) を
    // 要素一覧に列挙する。spec ベースでは追跡されないため明示的に集める。
    // key は "dynamic|<dropId>" / "dynamic|<textId>" の専用名前空間で衝突を避ける。
    var dynList = [];
    try {
      $$('.le-dropped-img').forEach(function (el) {
        if (seen.has(el)) return;
        var did = el.dataset && el.dataset.dropId ? el.dataset.dropId : '';
        var nm = el.dataset && el.dataset.dropName ? el.dataset.dropName : '';
        // Mike-2 修正B: dataset.leLabel (rename / 自動連番) を最優先で表示
        var lbl = el.dataset && el.dataset.leLabel ? el.dataset.leLabel : '';
        var label = '🖼 ' + (lbl || nm || did || '画像');
        dynList.push({ el: el, sel: '.le-dropped-img', idx: did || dynList.length, label: label, dynamic: true, dynKey: 'dynamic-img|' + (did || dynList.length) });
      });
    } catch (e) {}
    try {
      $$('.le-added-text').forEach(function (el) {
        if (seen.has(el)) return;
        var tid = el.dataset && el.dataset.textId ? el.dataset.textId : '';
        var lbl = el.dataset && el.dataset.leLabel ? el.dataset.leLabel : '';
        // Mike-2 修正B: rename 済みなら leLabel を優先、未 rename なら本文スニペットにフォールバック
        var snippet = (el.textContent || '').trim().slice(0, 12);
        var label = '📝 ' + (lbl || snippet || tid || 'テキスト');
        dynList.push({ el: el, sel: '.le-added-text', idx: tid || dynList.length, label: label, dynamic: true, dynKey: 'dynamic-text|' + (tid || dynList.length) });
      });
    } catch (e) {}
    rowEntries = rowEntries.concat(dynList);
    // November-2 修正: 親要素の直後に子要素を連続配置する木構造順 (DFS) に並べる。
    //   旧: flat z-index 降順ソート → "└" 付き子要素が直前の任意 row の子に見える誤解を生む
    //       (例: シルエット枠が hint-panel の子なのに、ポノ案内 (.pono-guide) の直後に描画されると
    //        "ポノ案内の子" に見えてしまう)
    //   新: 親 → その子 (z-index 降順) → 次の親 の DFS 順。これで indent depth が
    //       「直前の親の子」と必ず対応する。サイブリング間順序は z-index 降順を維持する。
    var allEditableSet = new Set(rowEntries.map(function (re) { return re.el; }));
    function getEditableDepth(el) {
      var depth = 0;
      var p = el && el.parentNode;
      while (p && p !== state.canvasEl && p.nodeType === 1) {
        if (allEditableSet.has(p)) depth++;
        p = p.parentNode;
      }
      return depth;
    }
    function findEditableAncestor(el) {
      var p = el && el.parentNode;
      while (p && p !== state.canvasEl && p.nodeType === 1) {
        if (allEditableSet.has(p)) return p;
        p = p.parentNode;
      }
      return null;
    }
    function buildTreeOrder(entries) {
      var entryByEl = new Map();
      entries.forEach(function (e) { entryByEl.set(e.el, e); });
      var childrenMap = new Map(); // parentEl -> [entries]
      var roots = [];
      entries.forEach(function (e) {
        var par = findEditableAncestor(e.el);
        if (!par) {
          roots.push(e);
        } else {
          if (!childrenMap.has(par)) childrenMap.set(par, []);
          childrenMap.get(par).push(e);
        }
      });
      function sortByZ(arr) {
        return arr.slice().sort(function (a, b) {
          var zA = zIndexOf(a.el);
          var zB = zIndexOf(b.el);
          if (zB !== zA) return zB - zA;
          // 同 z-index 内は DOM 後ろ = 視覚的に手前 → 上位
          var pos = a.el.compareDocumentPosition(b.el);
          if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return 1;
          if (pos & Node.DOCUMENT_POSITION_PRECEDING) return -1;
          return 0;
        });
      }
      roots = sortByZ(roots);
      childrenMap.forEach(function (kids, par) {
        childrenMap.set(par, sortByZ(kids));
      });
      var result = [];
      function visit(entry) {
        result.push(entry);
        var kids = childrenMap.get(entry.el) || [];
        kids.forEach(visit);
      }
      roots.forEach(visit);
      // 安全網: なんらかの理由で取りこぼしが出たら末尾に追加 (data 損失防止)
      if (result.length < entries.length) {
        var seenEl = new Set(result.map(function (r) { return r.el; }));
        entries.forEach(function (e) { if (!seenEl.has(e.el)) result.push(e); });
      }
      return result;
    }
    rowEntries = buildTreeOrder(rowEntries);
    rowEntries.forEach(function (re) {
      var el = re.el, sel = re.sel, idx = re.idx, label = re.label;
      // Juliet-2 修正B: 動的要素は専用 key、それ以外は従来の sel|idx
      var key = re.dynamic ? re.dynKey : (sel + '|' + idx);
      var hidden = el.classList.contains('user-hidden');
      var locked = state.locked.has(key);
      var row = document.createElement('div');
      row.className = 'le-list-row';
      row.dataset.key = key;
      // Kilo-2 修正D: 深さ * 16px だけ左パディングを追加 (CSS 既定 8px はそのまま)
      var depth = getEditableDepth(el);
      // November-2 修正: depth=0 でも data-depth を設定し、CSS で親 row の境界線を強調できるようにする
      row.dataset.depth = String(depth);
      if (depth > 0) {
        row.style.paddingLeft = (8 + 16 * depth) + 'px';
      }
      // November-2 修正: 親要素ラベルを ツールチップに含める (子のホバーで親が分かる)
      var parentEntry = null;
      if (depth > 0) {
        var parEl = findEditableAncestor(el);
        if (parEl) {
          for (var __i = 0; __i < rowEntries.length; __i++) {
            if (rowEntries[__i].el === parEl) { parentEntry = rowEntries[__i]; break; }
          }
        }
      }
      var rowTitle = (parentEntry ? '親: ' + parentEntry.label + ' / ' : '') + 'セレクタ: ' + sel;
      row.title = rowTitle;
      // Papa-2 修正2: 子要素のみ 🔗 トグルを表示。OFF (⛓️‍💥) で親移動から独立
      var unlinked = (el.dataset && el.dataset.leUnlinked === '1');
      var linkBtnHtml = '';
      if (depth > 0) {
        linkBtnHtml = '<button class="le-row-btn le-link-toggle" title="' +
          (unlinked ? '親と独立中（クリックで再リンク）' : '親と連動中（クリックで一時独立）') + '">' +
          (unlinked ? '⛓️‍💥' : '🔗') + '</button>';
      }
      row.innerHTML =
        '<button class="le-row-btn le-vis" title="表示/非表示">' + (hidden ? '🚫' : '👁') + '</button>' +
        '<button class="le-row-btn le-lock" title="ロック">' + (locked ? '🔒' : '🔓') + '</button>' +
        linkBtnHtml +
        '<span class="le-row-label" title="ダブルクリックで名前変更"></span>' +
        '<span class="le-row-key"></span>';
      // Papa-2 修正4: ドラッグで並び替え/再親子化 (詳細は下のリスナで設定)
      row.draggable = true;
      row.dataset.rowEl = ''; // marker
      // hold reference for D&D
      row._leTargetEl = el;
      row._leDepth = depth;
      // Mike-2 修正B: textContent で安全に流し込む (XSS 防御)
      var labelSpan = row.querySelector('.le-row-label');
      var keySpan = row.querySelector('.le-row-key');
      if (labelSpan) labelSpan.textContent = label;
      if (keySpan) keySpan.textContent = key;
      // Mike-2 修正B: dblclick → インライン rename
      if (labelSpan) {
        labelSpan.addEventListener('dblclick', function (e) {
          e.preventDefault();
          e.stopPropagation();
          startInlineRename(labelSpan, el, re);
        });
      }
        // Prevent text selection caused by Shift+Click across list rows
        row.addEventListener('mousedown', function (e) {
          // Mike-2 修正B: rename 中は mousedown を素通しさせる (テキスト選択を許可)
          if (e.target && e.target.getAttribute && e.target.getAttribute('contenteditable') === 'true') return;
          if (e.shiftKey || e.ctrlKey || e.metaKey) e.preventDefault();
        });
        row.addEventListener('click', function (e) {
          // Mike-2 修正B: rename 編集中の label への click は無視 (select に流さない)
          if (e.target && e.target.getAttribute && e.target.getAttribute('contenteditable') === 'true') return;
          if (e.target.classList.contains('le-vis')) {
            if (hidden) {
              el.classList.remove('user-hidden');
              pushHistory({ type: 'show', el: el });
            } else {
              el.classList.add('user-hidden');
              pushHistory({ type: 'hide', el: el });
            }
            refreshElementList();
          } else if (e.target.classList.contains('le-lock')) {
            toggleLock(el);
            refreshElementList();
          } else if (e.target.classList.contains('le-link-toggle')) {
            // Papa-2 修正2: 親子リンクの一時解除トグル
            e.stopPropagation();
            toggleChildLink(el);
          } else {
            // Multi-select support in element list panel
            // - Shift+Click: range select between last clicked and current row
            // - Ctrl/Meta+Click: toggle current row in selection
            // - Plain click: single-select (existing behaviour)
            if (e.shiftKey && state.lastClickedListKey) {
              var rows = state.listPanelEl
                ? Array.prototype.slice.call(state.listPanelEl.querySelectorAll('.le-list-row'))
                : [];
              var startIdx = -1, endIdx = -1;
              for (var ri = 0; ri < rows.length; ri++) {
                if (rows[ri].dataset.key === state.lastClickedListKey) startIdx = ri;
                if (rows[ri] === row) endIdx = ri;
              }
              if (startIdx === -1 || endIdx === -1) {
                selectOnly(el);
              } else {
                var from = Math.min(startIdx, endIdx);
                var to = Math.max(startIdx, endIdx);
                var targets = [];
                for (var rj = from; rj <= to; rj++) {
                  var r = rows[rj];
                  var rk = r.dataset.key;
                  var rel = resolveListKeyToElement(rk);
                  if (rel) targets.push(rel);
                }
                if (targets.length) selectMultiple(targets);
                else selectOnly(el);
              }
              // Charlie-2: 範囲選択時は最終クリック要素を優先ターゲットに
              state.preferredTarget = el;
              refreshPreferredTargetUI();
              // Do NOT update lastClickedListKey on shift-click, anchor stays put
            } else if (e.ctrlKey || e.metaKey) {
              toggleSelect(el);
              state.lastClickedListKey = key;
              // Charlie-2: list 由来 toggle でも優先ターゲットに昇格
              state.preferredTarget = state.selectedElements.has(el) ? el : null;
              refreshPreferredTargetUI();
            } else {
              selectOnly(el);
              state.lastClickedListKey = key;
              // Charlie-2: 単一選択時は明示的にこの要素を優先ターゲットに
              state.preferredTarget = el;
              refreshPreferredTargetUI();
            }
          }
        });
      // Papa-2 修正3/4: 行ドラッグ — 並び替え (z-index) と再親子化 (DOM 移動)
      attachListRowDragHandlers(row, el, key);
      body.appendChild(row);
    });
    // Defensive: if anchor row no longer exists (element deleted), drop the anchor
    if (state.lastClickedListKey) {
      var still = state.listPanelEl.querySelector(
        '.le-list-row[data-key="' + state.lastClickedListKey.replace(/"/g, '\\"') + '"]'
      );
      if (!still) state.lastClickedListKey = null;
    }
  }

  // ====================================================================
  //  Papa-2 修正3/4: 要素一覧ドラッグ (並び替え + 再親子化)
  // ====================================================================
  // - top 25%   → before (兄弟挿入: 視覚的に手前 = z-index 上昇)
  // - middle 50% → into (DOM 親子化: target.appendChild(source))
  // - bottom 25% → after (兄弟挿入: 視覚的に奥 = z-index 低下)
  // 並び替えは z-index を 100 刻みで再番号して安定化させる。
  function clearListDropMarkers(root) {
    if (!root) return;
    root.querySelectorAll('.le-drop-before, .le-drop-after, .le-drop-into').forEach(function (r) {
      r.classList.remove('le-drop-before', 'le-drop-after', 'le-drop-into');
    });
  }
  function attachListRowDragHandlers(row, el, key) {
    if (!row) return;
    row.addEventListener('dragstart', function (e) {
      try {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/x-le-row-key', key || '');
        // Some browsers need any data to start a drag
        e.dataTransfer.setData('text/plain', key || '');
      } catch (err) {}
      row.classList.add('le-dragging');
      // Use a closure-shared marker so dragover knows the source element
      state._listDragSourceEl = el;
      state._listDragSourceKey = key;
    });
    row.addEventListener('dragend', function () {
      row.classList.remove('le-dragging');
      if (state.listPanelEl) clearListDropMarkers(state.listPanelEl);
      state._listDragSourceEl = null;
      state._listDragSourceKey = null;
    });
    row.addEventListener('dragover', function (e) {
      // Self-drop / 子孫への drop は禁止 (循環防止)
      var src = state._listDragSourceEl;
      if (!src) return;
      if (src === el) return;
      try { if (src.contains && src.contains(el)) return; } catch (err) {}
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
      var rect = row.getBoundingClientRect();
      var y = e.clientY - rect.top;
      var ratio = y / rect.height;
      if (state.listPanelEl) clearListDropMarkers(state.listPanelEl);
      if (ratio < 0.25) row.classList.add('le-drop-before');
      else if (ratio > 0.75) row.classList.add('le-drop-after');
      else row.classList.add('le-drop-into');
    });
    row.addEventListener('dragleave', function (e) {
      row.classList.remove('le-drop-before', 'le-drop-after', 'le-drop-into');
    });
    row.addEventListener('drop', function (e) {
      e.preventDefault();
      var src = state._listDragSourceEl;
      if (!src || src === el) return;
      try { if (src.contains && src.contains(el)) return; } catch (err) {}
      var rect = row.getBoundingClientRect();
      var y = e.clientY - rect.top;
      var ratio = y / rect.height;
      var mode = (ratio < 0.25) ? 'before' : ((ratio > 0.75) ? 'after' : 'into');
      row.classList.remove('le-drop-before', 'le-drop-after', 'le-drop-into');
      if (mode === 'into') {
        reparentListItem(src, el);
      } else {
        reorderListItem(src, el, mode);
      }
    });
  }

  // 兄弟並び替え: source の z-index を target の隣 (上または下) に挿入する。
  // source と target の親が異なる場合は、まず source を target の親に DOM 移動してから
  // z-index を調整する (= 「兄弟として挿入」を実現)。
  function reorderListItem(source, target, mode) {
    if (!source || !target || source === target) return;
    var ops = [];
    var srcOldParent = source.parentNode;
    var srcOldNext = source.nextSibling;
    var srcOldStyles = {
      position: source.style.position || '',
      left: source.style.left || '',
      top: source.style.top || '',
      width: source.style.width || '',
      height: source.style.height || ''
    };
    var srcOldKeep = (source.dataset && source.dataset.leKeepPosition) || '';
    var targetParent = target.parentNode;
    var movedDom = false;
    if (srcOldParent !== targetParent && targetParent) {
      // 親揃え: target の親にぶら下げる
      targetParent.insertBefore(source, target);
      if (source.dataset) source.dataset.leKeepPosition = '1';
      movedDom = true;
    }
    // z-index 計算: target の現在 z を参照し、before なら +1、after なら -1
    // ただし兄弟全体を 10 刻みで再採番して安定化する
    var siblings = Array.prototype.slice.call(targetParent ? targetParent.children : []);
    // 既存 z をベースに、対象 source/target の前後関係を決める
    var orderedSibs = siblings.filter(function (n) {
      return n.nodeType === 1 && n !== source;
    });
    // target を基準に、before/after で source を挿入
    var insertIdx = orderedSibs.indexOf(target);
    if (insertIdx < 0) return;
    if (mode === 'before') orderedSibs.splice(insertIdx, 0, source);
    else orderedSibs.splice(insertIdx + 1, 0, source);
    // sibling を視覚的順序で並べ替え (現状の z-index 降順を保ちつつ source を挿入)
    // 「視覚的に手前 = z-index 大」になるように、配列の先頭ほど z 大の順序にする。
    // ここで配列順序は「先頭=手前」を採用する。Photoshop と同じ感覚。
    // しかし requirements は要素一覧で「上=手前」なので、要素一覧の DOM 配置とは独立して z を割り当てる。
    // siblings の orderedSibs は現状 DOM 順 (= 後ろほど DOM 後ろ)。
    // ⇒ 要素一覧では DOM ベースで render しているわけではなく、z-index 降順の DFS で
    //    並んでいる。ここでは「target の隣に source が並ぶ」ことを保証するため、
    //    target と source の z-index が逆転していないようにスタックする。
    // 簡潔策: siblings の 配列 index に応じて zIndex を高い→低い に振り直す
    //   (先頭ほど高い)。ただし現状の相対順序は DOM 配置で復元される一覧順序と一致する
    //   ように、target.zIndex を中心に配列順を再構成する。
    var baseZ = parseInt(target.style.zIndex, 10);
    if (isNaN(baseZ)) {
      var cs = window.getComputedStyle ? getComputedStyle(target) : null;
      baseZ = (cs && parseInt(cs.zIndex, 10)) || 100;
    }
    // 再採番: orderedSibs を先頭 (= 手前 = 高 z) から baseZ + N*10 ... 降順で割り当てる
    // target の z を保ちつつ source をその直前/直後に置く
    var targetIdx = orderedSibs.indexOf(target);
    orderedSibs.forEach(function (n, i) {
      var newZ = baseZ + (targetIdx - i) * 10;
      var oldZ = n.style.zIndex || '';
      n.style.zIndex = String(newZ);
      // 専用 'z-index' op (applyForward/applyInverse で対応)
      ops.push({ type: 'z-index', el: n, before: oldZ, after: String(newZ) });
    });
    if (movedDom) {
      ops.push({
        type: 'reparent',
        el: source,
        oldParent: srcOldParent,
        oldNext: srcOldNext,
        oldStyles: srcOldStyles,
        oldKeepPosition: srcOldKeep,
        newParent: targetParent,
        newStyles: { /* 並び替えのみは位置上書きしない */ }
      });
    }
    pushHistoryBatch(ops);
    try { refreshElementList(); } catch (e) {}
    showToast('順序を変更しました');
  }

  // 再親子化: source を target の子にする。座標は新親基準に変換する。
  function reparentListItem(source, target) {
    if (!source || !target || source === target) return;
    try { if (source.contains && source.contains(target)) return; } catch (e) {}
    var oldParent = source.parentNode;
    var oldNext = source.nextSibling;
    var oldStyles = {
      position: source.style.position || '',
      left: source.style.left || '',
      top: source.style.top || '',
      width: source.style.width || '',
      height: source.style.height || ''
    };
    var oldKeep = (source.dataset && source.dataset.leKeepPosition) || '';
    // 視覚位置を維持するため、ドロップ前後で client 座標が変わらないよう left/top を補正する
    var srcRect = null, tgtRect = null;
    try { srcRect = source.getBoundingClientRect(); } catch (e) {}
    target.appendChild(source);
    try { tgtRect = target.getBoundingClientRect(); } catch (e) {}
    var newStyles = {};
    if (srcRect && tgtRect) {
      // 親が position:static の場合は relative にしないと left/top が効かない
      var tgtCs = window.getComputedStyle ? getComputedStyle(target) : null;
      if (tgtCs && tgtCs.position === 'static') {
        target.style.position = 'relative';
      }
      var newLeft = Math.round(srcRect.left - tgtRect.left);
      var newTop = Math.round(srcRect.top - tgtRect.top);
      // _tx/_ty で動かしている分はそのまま残し、left/top のみ親基準に書き換える
      var tx = source._tx || 0, ty = source._ty || 0;
      source.style.position = 'absolute';
      source.style.left = (newLeft - tx) + 'px';
      source.style.top = (newTop - ty) + 'px';
      newStyles.position = 'absolute';
      newStyles.left = source.style.left;
      newStyles.top = source.style.top;
    }
    if (source.dataset) source.dataset.leKeepPosition = '1';
    pushHistory({
      type: 'reparent',
      el: source,
      oldParent: oldParent,
      oldNext: oldNext,
      oldStyles: oldStyles,
      oldKeepPosition: oldKeep,
      newParent: target,
      newStyles: newStyles
    });
    try { refreshElementList(); } catch (e) {}
    showToast('「' + (target.dataset && target.dataset.leLabel ? target.dataset.leLabel : 'レイヤー') + '」の子にしました');
  }

  function refreshElementListSelection() {
    if (!state.listPanelEl) return;
    var rows = state.listPanelEl.querySelectorAll('.le-list-row');
    rows.forEach(function (row) {
      var key = row.dataset.key;
      var el = resolveListKeyToElement(key);
      row.classList.toggle('selected', !!(el && state.selectedElements.has(el)));
      // Charlie-2: 優先ターゲットに行マーカー
      row.classList.toggle('preferred', !!(el && el === state.preferredTarget));
    });
  }

  // Mike-2 修正B: 要素一覧 row のラベルをインライン編集する。
  //   - 動的要素 (.le-dropped-img / .le-added-text) は dataset.leLabel を直接書き換え、
  //     localStorage (saveDroppedImages / saveAddedTexts) で永続化。
  //   - spec 要素 (.pono-guide 等) は spec の元ラベルを破壊しないよう、
  //     localStorage の override マップ (le-spec-labels:<path>) に保存。
  //   - undo: 'rename' op で巻き戻し。
  //   - 確定: Enter / blur,  キャンセル: Esc。
  function startInlineRename(labelEl, targetEl, rowEntry) {
    if (!labelEl || !targetEl) return;
    if (labelEl.getAttribute('contenteditable') === 'true') return; // 二重起動防止

    var isDroppedImg = !!(targetEl.classList && targetEl.classList.contains('le-dropped-img'));
    var isAddedText  = !!(targetEl.classList && targetEl.classList.contains('le-added-text'));

    // 旧ラベル (rename 前)
    var oldLabel;
    if (isDroppedImg || isAddedText) {
      oldLabel = (targetEl.dataset && targetEl.dataset.leLabel) || (labelEl.textContent || '');
    } else if (rowEntry && !rowEntry.dynamic) {
      var rk = (rowEntry.sel + '|' + rowEntry.idx);
      oldLabel = getSpecLabelOverride(rk) || (labelEl.textContent || '');
    } else {
      oldLabel = labelEl.textContent || '';
    }
    var oldText = labelEl.textContent || '';

    labelEl.setAttribute('contenteditable', 'true');
    // Plain-text 編集に強制 (リッチテキストペーストを抑止)
    labelEl.spellcheck = false;
    // Papa-2 修正3/4: rename 中は親 row の draggable を一時 OFF
    var ownerRow = labelEl.closest && labelEl.closest('.le-list-row');
    var prevDraggable = ownerRow ? ownerRow.draggable : null;
    if (ownerRow) ownerRow.draggable = false;
    // 視覚的に編集中であることを示すため、表示中のテキストはそのまま (新規/spec の prefix 含む)
    // ただし Drop/Text 系で先頭に絵文字 prefix が付いているので、それを取り除いた純粋ラベルだけ編集対象にする
    var prefix = '';
    var editableText = oldText;
    if (isDroppedImg && oldText.indexOf('🖼 ') === 0) { prefix = '🖼 '; editableText = oldText.slice(prefix.length); }
    else if (isAddedText && oldText.indexOf('📝 ') === 0) { prefix = '📝 '; editableText = oldText.slice(prefix.length); }
    labelEl.textContent = editableText;
    labelEl.focus();

    // 全選択
    try {
      var range = document.createRange();
      range.selectNodeContents(labelEl);
      var selObj = window.getSelection();
      if (selObj) { selObj.removeAllRanges(); selObj.addRange(range); }
    } catch (e) {}

    var done = false;
    function finish(commit) {
      if (done) return;
      done = true;
      labelEl.removeAttribute('contenteditable');
      // Papa-2 修正3/4: rename 終了時に row.draggable を元に戻す
      if (ownerRow && prevDraggable !== null) {
        try { ownerRow.draggable = prevDraggable; } catch (e) {}
      }
      var typed = (labelEl.textContent || '').trim();
      if (!commit || !typed) {
        // キャンセル: 元の表示テキストに戻す
        labelEl.textContent = oldText;
        return;
      }
      // commit
      var newLabel = typed;
      // 表示テキスト (prefix 付き) を確定
      labelEl.textContent = prefix + newLabel;

      if (isDroppedImg) {
        targetEl.dataset.leLabel = newLabel;
        try { saveDroppedImages(); } catch (e) {}
        pushHistory({
          type: 'rename', el: targetEl, mode: 'dataset',
          oldLabel: oldLabel || '', newLabel: newLabel
        });
      } else if (isAddedText) {
        targetEl.dataset.leLabel = newLabel;
        try { saveAddedTexts(); } catch (e) {}
        pushHistory({
          type: 'rename', el: targetEl, mode: 'dataset',
          oldLabel: oldLabel || '', newLabel: newLabel
        });
      } else if (rowEntry && !rowEntry.dynamic) {
        var rk = (rowEntry.sel + '|' + rowEntry.idx);
        setSpecLabelOverride(rk, newLabel);
        pushHistory({
          type: 'rename', el: targetEl, mode: 'spec',
          key: rk, oldLabel: oldLabel || '', newLabel: newLabel
        });
      }
      // 一覧を再描画してソート/インデント/絵文字 prefix を反映
      try { refreshElementList(); } catch (e) {}
    }

    function onKey(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        labelEl.removeEventListener('keydown', onKey);
        labelEl.blur(); // → blur ハンドラで finish(true)
      } else if (e.key === 'Escape') {
        e.preventDefault();
        labelEl.removeEventListener('keydown', onKey);
        finish(false);
        labelEl.blur();
      }
    }
    function onBlur() {
      labelEl.removeEventListener('blur', onBlur);
      labelEl.removeEventListener('keydown', onKey);
      finish(true);
    }
    labelEl.addEventListener('keydown', onKey);
    labelEl.addEventListener('blur', onBlur);
  }

  // Juliet-2 修正B: 要素一覧の data-key から要素を解決する。
  // - "<selector>|<idx>" : spec ベース (従来)
  // - "dynamic-img|<dropId>" : ドロップ画像
  // - "dynamic-text|<textId>" : 追加テキスト
  function resolveListKeyToElement(key) {
    if (!key) return null;
    if (key.indexOf('dynamic-img|') === 0) {
      var did = key.slice('dynamic-img|'.length);
      try {
        // CSS.escape が無い古いブラウザ向けに簡易エスケープ
        var safeDid = did.replace(/"/g, '\\"');
        return document.querySelector('.le-dropped-img[data-drop-id="' + safeDid + '"]');
      } catch (e) { return null; }
    }
    if (key.indexOf('dynamic-text|') === 0) {
      var tid = key.slice('dynamic-text|'.length);
      try {
        var safeTid = tid.replace(/"/g, '\\"');
        return document.querySelector('.le-added-text[data-text-id="' + safeTid + '"]');
      } catch (e) { return null; }
    }
    var m = key.match(/^(.+)\|(\d+)$/);
    if (!m) return null;
    try {
      var all = $$(m[1]);
      return all[parseInt(m[2], 10)] || null;
    } catch (e) { return null; }
  }

  // ====================================================================
  //  Lock / unlock (FEATURE 24)
  // ====================================================================

  function toggleLock(el) {
    var key = getElKey(el);
    if (!key) return;
    var was = state.locked.has(key);
    if (was) state.locked.delete(key);
    else state.locked.add(key);
    pushHistory({ type: 'lock', key: key, before: was, after: !was });
    refreshLockBadges();
  }
  function refreshLockBadges() {
    $$('.resizable').forEach(function (el) {
      var k = getElKey(el);
      var locked = k && state.locked.has(k);
      el.classList.toggle('le-locked', !!locked);
      var existing = el.querySelector(':scope > .le-lock-badge');
      if (locked && !existing) {
        var b = document.createElement('div');
        b.className = 'le-lock-badge';
        b.textContent = '🔒';
        el.appendChild(b);
      } else if (!locked && existing) {
        existing.remove();
      }
    });
  }

  // ====================================================================
  //  Papa-2 修正2: 一時リンク解除トグル (Photoshop 風: 親子関係を一時的に切る)
  // ====================================================================
  // 親をドラッグしても子を visual に動かさない (counter-transform で打ち消す)。
  // 永続的な切り離し (取り出す) と異なり DOM 階層は維持し、見た目だけ独立させる。
  function isChildOfEditableParent(el) {
    if (!el || !el.parentNode) return false;
    // canvas 直下、または body/document に直結する root レベルなら親なし扱い
    if (el.parentNode === state.canvasEl) return false;
    // 親が編集対象 ('.resizable' class が付与されている、または .le-dropped-img / .le-added-text wrapper、
    //   または canvas より子側のいずれかの spec 一致要素) であるかをゆるく判定
    var p = el.parentNode;
    while (p && p !== state.canvasEl && p.nodeType === 1) {
      if (p.classList && (p.classList.contains('resizable') ||
          p.classList.contains('le-dropped-img') ||
          p.classList.contains('le-added-text'))) {
        return true;
      }
      // spec 一致もチェック
      for (var i = 0; i < state.spec.length; i++) {
        try { if (p.matches && p.matches(state.spec[i][0])) return true; } catch (e) {}
      }
      p = p.parentNode;
    }
    return false;
  }
  function toggleChildLink(el) {
    if (!el) return;
    if (!state.unlinkedChildren) state.unlinkedChildren = new Set();
    if (el.dataset.leUnlinked === '1') {
      delete el.dataset.leUnlinked;
      state.unlinkedChildren.delete(el);
    } else {
      el.dataset.leUnlinked = '1';
      state.unlinkedChildren.add(el);
    }
    try { refreshElementList(); } catch (e) {}
  }

  // ====================================================================
  //  Copy / duplicate (FEATURE 25)
  // ====================================================================

  function duplicateSelected() {
    var sel = Array.from(state.selectedElements);
    if (!sel.length) { showToast('複製する要素を選択', 'error'); return; }
    var newOnes = [];
    // Kilo-2 修正A: 複数複製も 1 batch op にまとめて undo 一発で全部消えるように
    var ops = [];
    sel.forEach(function (el) {
      var clone = el.cloneNode(true);
      // Strip editor-only chrome
      Array.prototype.forEach.call(clone.querySelectorAll('.resize-handle, .resize-size-label, .le-lock-badge'), function (c) { c.remove(); });
      clone.classList.remove('selected', 'edge-linked', 'le-locked');
      clone._tx = (el._tx || 0) + 16;
      clone._ty = (el._ty || 0) + 16;
      clone.style.transform = 'translate(' + clone._tx + 'px, ' + clone._ty + 'px)';
      el.parentNode.insertBefore(clone, el.nextSibling);
      newOnes.push(clone);
      ops.push({ type: 'add', el: clone, parent: el.parentNode, next: el.nextSibling });
    });
    pushHistoryBatch(ops);
    // re-attach handles for new clones
    var spec = state.spec;
    newOnes.forEach(function (clone) {
      for (var i = 0; i < spec.length; i++) {
        try { if (clone.matches(spec[i][0])) { attachHandle(clone, spec[i][1]); break; } }
        catch (e) {}
      }
    });
    state.selectedElements.clear();
    newOnes.forEach(function (n) { state.selectedElements.add(n); });
    refreshSelectionUI();
    refreshElementList();
    showToast(newOnes.length + ' 個複製');
  }

  // ====================================================================
  //  Kilo-2 修正C: Detach from parent (親レイヤーから取り出して stage 直下へ)
  // ====================================================================

  function detachSelectedFromParent() {
    if (!state.selectedElements || state.selectedElements.size !== 1) {
      showToast('1 個だけ選択してから取り出してください', 'error');
      return;
    }
    var sel = Array.from(state.selectedElements)[0];
    var stage = state.canvasEl;
    if (!sel || !stage) return;
    var parent = sel.parentNode;
    if (!parent || parent === stage) {
      showToast('既に最上位レイヤーです', 'error');
      return;
    }

    // 視覚位置を維持するため、移動前に stage 相対座標を計算しておく
    var beforeRect = sel.getBoundingClientRect();
    var info = getStageRectInfo();
    var stageRect = info.stageRect;
    var scale = info.scale || 1;

    var oldParent = parent;
    var oldNext = sel.nextSibling;
    var oldStyles = {
      position: sel.style.position || '',
      left: sel.style.left || '',
      top: sel.style.top || '',
      width: sel.style.width || '',
      height: sel.style.height || ''
    };
    var oldKeepPosition = (sel.dataset && sel.dataset.leKeepPosition) ? sel.dataset.leKeepPosition : '';

    // 移動: stage 直下へ
    stage.appendChild(sel);
    // transform は temp に解いて、純粋な左上を新位置として固定する
    sel.style.position = 'absolute';
    sel.style.left = ((beforeRect.left - stageRect.left) / scale) + 'px';
    sel.style.top  = ((beforeRect.top  - stageRect.top)  / scale) + 'px';
    sel.style.width  = (beforeRect.width  / scale) + 'px';
    sel.style.height = (beforeRect.height / scale) + 'px';
    // 取り出し後は独立配置 — applier で位置を上書きされないように
    if (sel.dataset) sel.dataset.leKeepPosition = '1';
    // 取り出し後は累積 translate もリセットする (left/top で位置を確定したため)
    sel._tx = 0;
    sel._ty = 0;
    sel.style.transform = '';
    if (sel._resizeUpdateLabel) try { sel._resizeUpdateLabel(); } catch (e) {}

    var newStyles = {
      position: 'absolute',
      left: sel.style.left,
      top: sel.style.top,
      width: sel.style.width,
      height: sel.style.height
    };

    pushHistory({
      type: 'reparent',
      el: sel,
      oldParent: oldParent,
      oldNext: oldNext,
      oldStyles: oldStyles,
      oldKeepPosition: oldKeepPosition,
      newParent: stage,
      newStyles: newStyles
    });
    refreshSelectionUI();
    refreshElementList();
    applyPreferredPointerSuppression();
    // Lima-2 修正C: 視覚フィードバック — ゴールドフラッシュで「何が独立したか」を強調
    try {
      sel.classList.add('le-detach-flash');
      setTimeout(function () {
        try { sel.classList.remove('le-detach-flash'); } catch (e) {}
      }, 600);
    } catch (e) {}
    // 要素一覧の該当行も一瞬ハイライト
    try {
      if (state.listPanelEl) {
        var rows = state.listPanelEl.querySelectorAll('.le-list-row');
        for (var r = 0; r < rows.length; r++) {
          var key = rows[r].dataset.key;
          var m = key && key.match(/^(.+)\|(\d+)$/);
          if (!m) continue;
          var all = $$(m[1]);
          if (all[parseInt(m[2], 10)] === sel) {
            (function (row) {
              row.classList.add('le-detach-flash-row');
              setTimeout(function () {
                try { row.classList.remove('le-detach-flash-row'); } catch (e) {}
              }, 600);
            })(rows[r]);
            break;
          }
        }
      }
    } catch (e) {}
    showToast('親グループから独立しました（Ctrl+Z で戻せます）');
  }

  // ====================================================================
  //  Zoom (FEATURE 26)
  // ====================================================================

  function setZoom(z) {
    z = clamp(z, 0.25, 2);
    state.zoom = z;
    var stage = state.canvasEl;
    if (!stage) return;
    var wrap = state.zoomWrapEl;
    if (!wrap) {
      // Wrap the stage in .stage-zoom on first call
      wrap = document.createElement('div');
      wrap.className = 'stage-zoom';
      stage.parentNode.insertBefore(wrap, stage);
      wrap.appendChild(stage);
      state.zoomWrapEl = wrap;
    }
    stage.style.transformOrigin = '0 0';
    stage.style.transform = 'scale(' + z + ')';
    wrap.style.width = (stage.offsetWidth * z) + 'px';
    wrap.style.height = (stage.offsetHeight * z) + 'px';
    // Update zoom slider label
    var lbl = $('#le-zoom-label');
    if (lbl) lbl.textContent = Math.round(z * 100) + '%';
    var sl = $('#le-zoom-slider');
    if (sl) sl.value = String(Math.round(z * 100));
    // Update labels on resizable elements
    $$('.resizable').forEach(function (el) { el._resizeUpdateLabel && el._resizeUpdateLabel(); });
    emit('zoom', z);
  }

  function zoomFit() { setZoom(1); }

  function attachZoomShortcuts() {
    var wheelHandler = function (e) {
      if (!state.enabled) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      var delta = e.deltaY < 0 ? 0.05 : -0.05;
      setZoom(state.zoom + delta);
    };
    addManagedListener(window, 'wheel', wheelHandler, { passive: false });
  }

  // ====================================================================
  //  Snap-to-grid (FEATURE 23)
  // ====================================================================

  function toggleGrid(forceState) {
    if (typeof forceState === 'boolean') state.gridOn = forceState;
    else state.gridOn = !state.gridOn;
    if (state.gridOn && !state.gridSize) state.gridSize = 16;
    var stage = state.canvasEl;
    if (stage) {
      stage.classList.toggle('grid-on', state.gridOn);
      if (state.gridOn) {
        stage.style.setProperty('--le-grid-size', state.gridSize + 'px');
      } else {
        stage.style.removeProperty('--le-grid-size');
      }
    }
    var btn = $('#le-grid');
    if (btn) {
      btn.classList.toggle('active', state.gridOn);
      btn.textContent = state.gridOn ? ('🔳 ' + state.gridSize) : '🔳 グリッド';
    }
  }

  function setGridSize(sz) {
    state.gridSize = sz;
    if (state.gridOn) toggleGrid(true);
  }

  // ====================================================================
  //  Comparison mode (FEATURE 22)
  // ====================================================================

  function toggleComparison() {
    if (state.comparison && state.comparison.active) {
      hideComparison();
    } else {
      showComparisonPicker();
    }
  }

  function showComparisonPicker() {
    var existing = $('#le-comparison-picker');
    if (existing) { existing.remove(); return; }
    var pop = document.createElement('div');
    pop.id = 'le-comparison-picker';
    pop.className = 'le-comparison-picker';
    // U9: pre-fill picker with persisted state (image / mode / opacity).
    var imgPath = (state.comparison && state.comparison.image) || '';
    var savedMode = (state.comparison && state.comparison.mode) ||
      (function () { try { return localStorage.getItem('pono_layout_comparison_mode') || 'side'; } catch (e) { return 'side'; } })();
    var savedOpacityPct = (state.comparison && typeof state.comparison.opacity === 'number')
      ? Math.round(state.comparison.opacity * 100)
      : (function () {
          try {
            var v = parseInt(localStorage.getItem('pono_layout_comparison_opacity'), 10);
            return Number.isFinite(v) ? v : 50;
          } catch (e) { return 50; }
        })();
    var modeOpt = function (val, label) {
      return '<option value="' + val + '"' + (val === savedMode ? ' selected' : '') + '>' + label + '</option>';
    };
    pop.innerHTML =
      '<h4>比較モード</h4>' +
      '<label>画像 <input type="text" id="le-comp-img" value="' + imgPath + '" placeholder="path/to/ref.png"></label>' +
      '<input type="file" id="le-comp-file" accept="image/*">' +
      '<label>モード <select id="le-comp-mode">' +
      modeOpt('side', 'Side-by-side') +
      modeOpt('overlay', 'Overlay') +
      modeOpt('onion', 'Onion-skin') +
      '</select></label>' +
      '<label>透過 <input type="range" id="le-comp-opacity" min="0" max="100" value="' + savedOpacityPct + '"></label>' +
      '<div class="le-comp-actions">' +
      '  <button id="le-comp-apply">適用</button>' +
      '  <button id="le-comp-cancel">閉じる</button>' +
      '</div>';
    document.body.appendChild(pop);
    pop.querySelector('#le-comp-cancel').addEventListener('click', function () { pop.remove(); });
    pop.querySelector('#le-comp-file').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { pop.querySelector('#le-comp-img').value = reader.result; };
      reader.readAsDataURL(f);
    });
    pop.querySelector('#le-comp-apply').addEventListener('click', function () {
      var img = pop.querySelector('#le-comp-img').value;
      var mode = pop.querySelector('#le-comp-mode').value;
      var opacityPct = parseInt(pop.querySelector('#le-comp-opacity').value, 10);
      var opacity = opacityPct / 100;
      state.comparison = { image: img, mode: mode, opacity: opacity, active: true };
      // U9: persist last-used mode & opacity
      try {
        localStorage.setItem('pono_layout_comparison_mode', mode);
        localStorage.setItem('pono_layout_comparison_opacity', String(opacityPct));
      } catch (e) {}
      applyComparison();
      pop.remove();
    });
  }

  function applyComparison() {
    var c = state.comparison;
    if (!c || !c.image) return;
    hideComparison(false);
    var stage = state.canvasEl;
    if (!stage) return;
    document.body.classList.add('le-compare-' + c.mode);
    var overlay = document.createElement('div');
    overlay.id = 'le-comparison-overlay';
    overlay.className = 'le-comparison-overlay le-comparison-' + c.mode;
    overlay.style.backgroundImage = 'url("' + c.image + '")';
    overlay.style.opacity = String(c.opacity);
    if (c.mode === 'side') {
      // R3: capture original inline width before we mutate, so we can restore on hide/disable.
      if (state.originalCanvasWidth === null) {
        state.originalCanvasWidth = stage.style.width || '';
      }
      document.body.classList.add('layout-comparison-on');
      stage.style.width = '50%';
      overlay.style.left = '50%';
      overlay.style.right = '0';
      overlay.style.top = '0';
      overlay.style.bottom = '0';
      overlay.style.opacity = '1';
    }
    (state.zoomWrapEl || stage.parentNode).appendChild(overlay);
    var btn = $('#le-comparison');
    if (btn) btn.classList.add('active');
  }
  function hideComparison(clearState) {
    if (clearState !== false) {
      if (state.comparison) state.comparison.active = false;
    }
    var existing = $('#le-comparison-overlay');
    if (existing) existing.remove();
    document.body.classList.remove('le-compare-side', 'le-compare-overlay', 'le-compare-onion', 'layout-comparison-on');
    // R3: restore original canvas width (captured at side-mode entry)
    var stage = state.canvasEl;
    if (stage) {
      if (state.originalCanvasWidth !== null) {
        stage.style.width = state.originalCanvasWidth;
        state.originalCanvasWidth = null;
      } else {
        stage.style.width = '';
      }
    }
    var btn = $('#le-comparison');
    if (btn) btn.classList.remove('active');
  }

  // ====================================================================
  //  Annotation system (FEATURE 6)
  // ====================================================================

  function ensureAnnoLayer() {
    var stage = state.canvasEl;
    if (!stage) return null;
    var layer = stage.querySelector('#le-anno-layer');
    if (layer) {
      state.annoLayer = layer;
      state.annoSvg = layer.querySelector('svg');
      return layer;
    }
    layer = document.createElement('div');
    layer.id = 'le-anno-layer';
    layer.className = 'le-anno-layer';
    layer.innerHTML =
      '<svg id="le-anno-svg" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
      '<marker id="le-anno-arrow-head" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">' +
      '<polygon points="0,0 10,5 0,10" fill="currentColor"></polygon></marker>' +
      '</defs></svg>';
    stage.appendChild(layer);
    state.annoLayer = layer;
    state.annoSvg = layer.querySelector('svg');
    resizeAnnoSvg();
    wireAnnoLayer();
    return layer;
  }
  function resizeAnnoSvg() {
    var stage = state.canvasEl;
    if (!state.annoSvg || !stage) return;
    var w = parseFloat(getComputedStyle(stage).width) || stage.offsetWidth;
    var h = parseFloat(getComputedStyle(stage).height) || stage.offsetHeight;
    state.annoSvg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    state.annoSvg.setAttribute('width', w);
    state.annoSvg.setAttribute('height', h);
  }
  function getStageCoords(e) {
    var stage = state.canvasEl;
    var r = stage.getBoundingClientRect();
    var internalW = parseFloat(getComputedStyle(stage).width) || r.width;
    var internalH = parseFloat(getComputedStyle(stage).height) || r.height;
    var sx = r.width / internalW || 1;
    var sy = r.height / internalH || 1;
    return { x: (e.clientX - r.left) / sx, y: (e.clientY - r.top) / sy };
  }
  function nextLabelChar() {
    var L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var c = L.charAt(state.labelIdx % L.length);
    state.labelIdx++;
    return c;
  }
  function applyAnnoColor(el, color) {
    if (!el || !color) return;
    if (el.classList && el.classList.contains('anno-marker')) el.style.backgroundColor = color;
    else if (el.classList && el.classList.contains('anno-text')) el.style.borderColor = color;
    else if (el.classList && el.classList.contains('anno-arrow-line')) { el.style.color = color; el.style.stroke = color; }
    else if (el.classList && el.classList.contains('anno-rect')) el.style.stroke = color;
    el.dataset.annoColor = color;
  }
  function setAnnoMode(on) {
    state.annoMode = on;
    document.body.classList.toggle('anno-mode', on);
    if (on) ensureAnnoLayer();
    var btn = $('#le-anno-toggle');
    if (btn) {
      btn.classList.toggle('active', on);
      btn.textContent = on ? '📝 注釈 ON' : '📝 注釈 OFF';
    }
    var tools = $('#le-anno-tools');
    if (tools) tools.style.display = on ? 'inline-flex' : 'none';
  }
  function setAnnoTool(tool) {
    state.annoTool = tool;
    document.body.classList.toggle('eraser-mode', tool === 'eraser');
    document.querySelectorAll('.le-tool-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tool === tool);
    });
  }

  function annoSelectEl(el) {
    if (state.annoSelected) state.annoSelected.classList.remove('anno-selected');
    clearAnnoHandles();
    state.annoSelected = el;
    if (el) {
      el.classList.add('anno-selected');
      updateAnnoHandles();
    }
  }
  function clearAnnoHandles() {
    if (!state.annoSvg) return;
    state.annoSvg.querySelectorAll('.anno-handle, .anno-handle-hit').forEach(function (h) { h.remove(); });
  }
  function getAnnoGeometry(el) {
    if (!el) return null;
    if (el.classList && (el.classList.contains('anno-marker') || el.classList.contains('anno-text'))) {
      return { kind: 'pos', left: parseFloat(el.style.left), top: parseFloat(el.style.top) };
    }
    if (el.tagName === 'line') {
      return { kind: 'line', x1: +el.getAttribute('x1'), y1: +el.getAttribute('y1'), x2: +el.getAttribute('x2'), y2: +el.getAttribute('y2') };
    }
    if (el.tagName === 'rect') {
      return { kind: 'rect', x: +el.getAttribute('x'), y: +el.getAttribute('y'), w: +el.getAttribute('width'), h: +el.getAttribute('height') };
    }
    return null;
  }
  function setAnnoGeometry(el, g) {
    if (!el || !g) return;
    if (g.kind === 'pos') { el.style.left = g.left + 'px'; el.style.top = g.top + 'px'; }
    else if (g.kind === 'line') {
      el.setAttribute('x1', g.x1); el.setAttribute('y1', g.y1);
      el.setAttribute('x2', g.x2); el.setAttribute('y2', g.y2);
    } else if (g.kind === 'rect') {
      el.setAttribute('x', g.x); el.setAttribute('y', g.y);
      el.setAttribute('width', g.w); el.setAttribute('height', g.h);
    }
  }
  function updateAnnoHandles() {
    clearAnnoHandles();
    if (!state.annoSelected) return;
    var g = getAnnoGeometry(state.annoSelected);
    if (!g) return;
    if (g.kind === 'line') { addAnnoHandle(g.x1, g.y1, 'p1'); addAnnoHandle(g.x2, g.y2, 'p2'); }
    else if (g.kind === 'rect') {
      addAnnoHandle(g.x, g.y, 'tl'); addAnnoHandle(g.x + g.w, g.y, 'tr');
      addAnnoHandle(g.x, g.y + g.h, 'bl'); addAnnoHandle(g.x + g.w, g.y + g.h, 'br');
    }
  }
  function addAnnoHandle(x, y, role) {
    var svg = state.annoSvg;
    if (!svg) return;
    var hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hit.setAttribute('class', 'anno-handle anno-handle-hit');
    hit.setAttribute('cx', x); hit.setAttribute('cy', y); hit.setAttribute('r', 18);
    hit.dataset.role = role;
    svg.appendChild(hit);
    var h = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    h.setAttribute('class', 'anno-handle endpoint');
    h.setAttribute('cx', x); h.setAttribute('cy', y); h.setAttribute('r', 9);
    h.dataset.role = role;
    svg.appendChild(h);
    var handler = function (ev) {
      ev.stopPropagation();
      ev.preventDefault();
      var target = state.annoSelected;
      var before = getAnnoGeometry(target);
      var onMove = function (e2) {
        var p = getStageCoords(e2);
        var g = getAnnoGeometry(target);
        if (g.kind === 'line') {
          if (role === 'p1') { g.x1 = p.x; g.y1 = p.y; } else { g.x2 = p.x; g.y2 = p.y; }
        } else if (g.kind === 'rect') {
          var x1 = g.x, y1 = g.y, x2 = g.x + g.w, y2 = g.y + g.h;
          if (role === 'tl') { x1 = p.x; y1 = p.y; }
          else if (role === 'tr') { x2 = p.x; y1 = p.y; }
          else if (role === 'bl') { x1 = p.x; y2 = p.y; }
          else if (role === 'br') { x2 = p.x; y2 = p.y; }
          g.x = Math.min(x1, x2); g.y = Math.min(y1, y2);
          g.w = Math.abs(x2 - x1); g.h = Math.abs(y2 - y1);
        }
        setAnnoGeometry(target, g); updateAnnoHandles();
      };
      var onUp = function () {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        var after = getAnnoGeometry(target);
        if (JSON.stringify(after) !== JSON.stringify(before)) {
          pushHistory({ type: 'transform', el: target, before: before, after: after });
        }
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };
    hit.addEventListener('mousedown', handler);
    h.addEventListener('mousedown', handler);
  }

  function attachAnnoDelete(el) {
    el.addEventListener('contextmenu', function (ev) {
      ev.preventDefault();
      if (confirm('この注釈を削除しますか？')) {
        pushHistory({ type: 'remove', el: el, parent: el.parentNode, next: el.nextSibling });
        el.remove();
        if (el === state.annoSelected) annoSelectEl(null);
      }
    });
    el.addEventListener('click', function (ev) {
      if (!state.annoMode) return;
      if (state.annoTool === 'eraser') {
        ev.stopPropagation();
        pushHistory({ type: 'remove', el: el, parent: el.parentNode, next: el.nextSibling });
        el.remove();
        if (el === state.annoSelected) annoSelectEl(null);
      }
    });
    el.addEventListener('mousedown', function (ev) {
      if (!state.annoMode || state.annoTool !== 'select') return;
      if (ev.target.classList && (ev.target.classList.contains('anno-handle') || ev.target.classList.contains('anno-handle-hit'))) return;
      ev.stopPropagation();
      annoSelectEl(el);
      var startPt = getStageCoords(ev);
      var beforeGeo = getAnnoGeometry(el);
      var moved = false;
      var onMove = function (e2) {
        var p = getStageCoords(e2);
        var dx = p.x - startPt.x, dy = p.y - startPt.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
        if (!moved) return;
        var g = JSON.parse(JSON.stringify(beforeGeo));
        if (g.kind === 'pos') { g.left += dx; g.top += dy; }
        else if (g.kind === 'line') { g.x1 += dx; g.y1 += dy; g.x2 += dx; g.y2 += dy; }
        else if (g.kind === 'rect') { g.x += dx; g.y += dy; }
        setAnnoGeometry(el, g); updateAnnoHandles();
      };
      var onUp = function () {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        if (moved) {
          var afterGeo = getAnnoGeometry(el);
          pushHistory({ type: 'transform', el: el, before: beforeGeo, after: afterGeo });
        }
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  function addAnnoMarker(x, y) {
    var m = document.createElement('div');
    m.className = 'anno-marker';
    m.style.left = x + 'px'; m.style.top = y + 'px';
    m.textContent = nextLabelChar();
    applyAnnoColor(m, state.annoColor);
    state.annoLayer.appendChild(m);
    attachAnnoDelete(m);
    pushHistory({ type: 'add', el: m, parent: state.annoLayer, next: null });
  }
  function addAnnoText(x, y) {
    var text = prompt('テキスト', 'ここを修正');
    if (!text) return;
    var t = document.createElement('div');
    t.className = 'anno-text';
    t.style.left = x + 'px'; t.style.top = y + 'px';
    t.textContent = text;
    applyAnnoColor(t, state.annoColor);
    state.annoLayer.appendChild(t);
    attachAnnoDelete(t);
    pushHistory({ type: 'add', el: t, parent: state.annoLayer, next: null });
  }

  function wireAnnoLayer() {
    var layer = state.annoLayer;
    var svg = state.annoSvg;
    if (!layer || !svg) return;
    layer.addEventListener('mousedown', function (e) {
      if (!state.annoMode) return;
      if (e.target.classList && (e.target.classList.contains('anno-handle') || e.target.classList.contains('anno-handle-hit'))) return;
      if (state.annoTool === 'select') {
        if (!e.target.closest('.anno-marker, .anno-text') &&
            !(e.target.classList && (e.target.classList.contains('anno-arrow-line') || e.target.classList.contains('anno-rect')))) {
          annoSelectEl(null);
        }
        return;
      }
      if (state.annoTool === 'rect' || state.annoTool === 'arrow' || state.annoTool === 'line') {
        e.preventDefault();
        var dragStart = getStageCoords(e);
        var tempShape;
        if (state.annoTool === 'rect') {
          tempShape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          tempShape.setAttribute('class', 'anno-rect'); tempShape.setAttribute('rx', 6);
        } else {
          tempShape = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          tempShape.setAttribute('class', state.annoTool === 'arrow' ? 'anno-arrow-line with-head' : 'anno-arrow-line');
        }
        applyAnnoColor(tempShape, state.annoColor);
        svg.appendChild(tempShape);
        var onMove = function (e2) {
          var p = getStageCoords(e2);
          if (state.annoTool === 'rect') {
            var x = Math.min(dragStart.x, p.x), y = Math.min(dragStart.y, p.y);
            var w = Math.abs(p.x - dragStart.x), h = Math.abs(p.y - dragStart.y);
            tempShape.setAttribute('x', x); tempShape.setAttribute('y', y);
            tempShape.setAttribute('width', w); tempShape.setAttribute('height', h);
          } else {
            tempShape.setAttribute('x1', dragStart.x); tempShape.setAttribute('y1', dragStart.y);
            tempShape.setAttribute('x2', p.x); tempShape.setAttribute('y2', p.y);
          }
        };
        var onUp = function (e2) {
          var p = getStageCoords(e2);
          var dx = p.x - dragStart.x, dy = p.y - dragStart.y;
          if (Math.abs(dx) < 4 && Math.abs(dy) < 4) tempShape.remove();
          else { attachAnnoDelete(tempShape); pushHistory({ type: 'add', el: tempShape, parent: svg, next: null }); }
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      }
    });
    layer.addEventListener('click', function (e) {
      if (!state.annoMode) return;
      if (e.target.classList && (e.target.classList.contains('anno-handle') || e.target.classList.contains('anno-handle-hit'))) return;
      if (state.annoTool === 'eraser' || state.annoTool === 'select') return;
      if (state.annoTool === 'rect' || state.annoTool === 'arrow' || state.annoTool === 'line') return;
      var p = getStageCoords(e);
      if (state.annoTool === 'marker') addAnnoMarker(p.x, p.y);
      else if (state.annoTool === 'text') addAnnoText(p.x, p.y);
    });
  }

  // ====================================================================
  //  Rulers + guides (FEATURE 7)
  // ====================================================================

  function setupRulers() {
    if ($('#le-ruler-h')) return;
    var rh = document.createElement('div'); rh.id = 'le-ruler-h'; rh.className = 'le-ruler horizontal';
    var rv = document.createElement('div'); rv.id = 'le-ruler-v'; rv.className = 'le-ruler vertical';
    document.body.appendChild(rh);
    document.body.appendChild(rv);
    state.rulerH = rh; state.rulerV = rv;
    rh.addEventListener('mousedown', function (e) { createGuide(e, 'h'); });
    rv.addEventListener('mousedown', function (e) { createGuide(e, 'v'); });
    adjustRulerPos();
    addManagedListener(window, 'resize', adjustRulerPos);
  }
  function adjustRulerPos() {
    var tb = state.toolbarEl;
    var toolbarH = tb && getComputedStyle(tb).display !== 'none' ? tb.offsetHeight : 0;
    document.documentElement.style.setProperty('--le-toolbar-h', toolbarH + 'px');
  }
  function createGuide(e, axis) {
    e.preventDefault();
    var g = document.createElement('div');
    g.className = 'le-guide ' + axis;
    var lbl = document.createElement('div');
    lbl.className = 'le-guide-label';
    g.appendChild(lbl);
    document.body.appendChild(g);
    attachGuideDrag(g, lbl, axis);
    pushHistory({ type: 'add', el: g, parent: document.body, next: null });
    var evt = new MouseEvent('mousedown', { clientX: e.clientX, clientY: e.clientY, bubbles: true });
    g.dispatchEvent(evt);
  }
  function setGuidePos(g, pos) {
    if (g.classList.contains('h')) g.style.top = pos + 'px';
    else g.style.left = pos + 'px';
    var lbl = g.querySelector('.le-guide-label');
    if (lbl) lbl.textContent = (g.classList.contains('h') ? 'y: ' : 'x: ') + Math.round(pos) + 'px';
  }
  function attachGuideDrag(g, lbl, axis) {
    var getCurPos = function () {
      return axis === 'h' ? (parseFloat(g.style.top) || 0) : (parseFloat(g.style.left) || 0);
    };
    var updatePos = function (clientX, clientY) {
      if (axis === 'h') { g.style.top = clientY + 'px'; lbl.textContent = 'y: ' + Math.round(clientY) + 'px'; }
      else { g.style.left = clientX + 'px'; lbl.textContent = 'x: ' + Math.round(clientX) + 'px'; }
    };
    g.addEventListener('mousedown', function (e) {
      e.stopPropagation();
      e.preventDefault();
      var before = getCurPos();
      var onMove = function (e2) { updatePos(e2.clientX, e2.clientY); };
      var onUp = function (e2) {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        if (axis === 'h' && e2.clientY < 24) {
          pushHistory({ type: 'remove', el: g, parent: document.body, next: g.nextSibling });
          g.remove();
        } else if (axis === 'v' && e2.clientX < 24) {
          pushHistory({ type: 'remove', el: g, parent: document.body, next: g.nextSibling });
          g.remove();
        } else {
          var after = getCurPos();
          if (after !== before) pushHistory({ type: 'guide-move', el: g, before: before, after: after });
        }
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      updatePos(e.clientX, e.clientY);
    });
    g.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      pushHistory({ type: 'remove', el: g, parent: document.body, next: g.nextSibling });
      g.remove();
    });
  }
  function restoreGuides(arr) {
    $$('.le-guide').forEach(function (g) { g.remove(); });
    arr.forEach(function (item) {
      var g = document.createElement('div');
      g.className = 'le-guide ' + item.axis;
      if (item.axis === 'h') g.style.top = item.pos + 'px';
      else g.style.left = item.pos + 'px';
      var lbl = document.createElement('div');
      lbl.className = 'le-guide-label';
      lbl.textContent = (item.axis === 'h' ? 'y: ' : 'x: ') + Math.round(item.pos) + 'px';
      g.appendChild(lbl);
      document.body.appendChild(g);
      attachGuideDrag(g, lbl, item.axis);
    });
  }

  // ====================================================================
  //  Userbox (FEATURE 8)
  // ====================================================================

  var userboxCounter = 0;
  function createUserbox(opts) {
    userboxCounter += 1;
    var id = opts.id || ('userbox-' + Date.now() + '-' + userboxCounter);
    var label = opts.label || ('枠' + userboxCounter);
    var div = document.createElement('div');
    div.className = 'userbox';
    div.dataset.userboxId = id;
    div.dataset.userboxLabel = label;
    if (opts.bgImage) {
      div.dataset.bgImage = opts.bgImage;
      div.style.backgroundImage = 'url("' + opts.bgImage + '")';
      div.style.backgroundSize = 'contain';
      div.style.backgroundRepeat = 'no-repeat';
      div.style.backgroundPosition = 'center';
      div.style.backgroundColor = 'transparent';
    }
    if (opts.left) div.style.left = opts.left;
    if (opts.top)  div.style.top = opts.top;
    if (opts.w)    div.style.width = opts.w;
    if (opts.h)    div.style.height = opts.h;
    var badge = document.createElement('div');
    badge.className = 'userbox-badge';
    badge.contentEditable = 'true';
    badge.textContent = label;
    badge.spellcheck = false;
    badge.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    badge.addEventListener('blur', function () {
      var newLabel = badge.textContent.trim() || ('枠' + userboxCounter);
      badge.textContent = newLabel;
      div.dataset.userboxLabel = newLabel;
      scheduleDirtyUpdate();
    });
    badge.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); badge.blur(); }
    });
    div.appendChild(badge);
    var del = document.createElement('div');
    del.className = 'userbox-del';
    del.textContent = '×';
    del.title = '削除';
    del.addEventListener('mousedown', function (e) { e.stopPropagation(); e.preventDefault(); });
    del.addEventListener('click', function (e) {
      e.stopPropagation();
      if (confirm('「' + div.dataset.userboxLabel + '」 を削除しますか？')) {
        // U7: undoable delete — push history before removing
        pushHistory({ type: 'remove', el: div, parent: div.parentNode, next: div.nextSibling });
        state.selectedElements && state.selectedElements.delete(div);
        div.remove();
        refreshSelectionUI();
        scheduleDirtyUpdate();
      }
    });
    div.appendChild(del);
    var target = $('#safe-area') || state.canvasEl || document.body;
    target.appendChild(div);
    attachHandle(div, 'wh');
    if (opts.tx || opts.ty) {
      div._tx = opts.tx || 0;
      div._ty = opts.ty || 0;
      div.style.transform = 'translate(' + div._tx + 'px, ' + div._ty + 'px)';
    }
    return div;
  }

  function setDrawMode(on) {
    state.drawModeOn = on;
    document.body.classList.toggle('draw-mode', on);
    var btn = $('#le-userbox-add');
    if (btn) {
      btn.classList.toggle('active', on);
      btn.textContent = on ? '🆕 矩形追加 ON' : '🆕 矩形追加 OFF';
    }
  }

  function attachUserboxDraw() {
    if (!state.canvasEl) return;
    state.canvasEl.addEventListener('mousedown', function (e) {
      if (!state.enabled) return;
      if (e.target.closest('.le-toolbar, .le-ruler, .le-guide, .numeric-panel, .le-list-panel, .le-help-modal, .le-comparison-picker, .le-pages-dropdown')) return;
      if (!state.drawModeOn && e.target.closest('.resizable, .resize-handle, .userbox-badge, .userbox-del')) return;
      if (!state.drawModeOn) return;
      e.preventDefault(); e.stopPropagation();
      var info = getStageRectInfo();
      var safe = $('#safe-area') || state.canvasEl;
      var safeRect = safe.getBoundingClientRect();
      var sx = (e.clientX - safeRect.left) / info.scale;
      var sy = (e.clientY - safeRect.top) / info.scale;
      var preview = document.createElement('div');
      preview.className = 'userbox-preview';
      preview.style.left = sx + 'px';
      preview.style.top = sy + 'px';
      preview.style.width = '0px';
      preview.style.height = '0px';
      safe.appendChild(preview);
      var onMove = function (e2) {
        var x = (e2.clientX - safeRect.left) / info.scale;
        var y = (e2.clientY - safeRect.top) / info.scale;
        var x0 = Math.min(sx, x), y0 = Math.min(sy, y);
        var w = Math.abs(x - sx), h = Math.abs(y - sy);
        preview.style.left = x0 + 'px';
        preview.style.top = y0 + 'px';
        preview.style.width = w + 'px';
        preview.style.height = h + 'px';
      };
      var onUp = function () {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        var w = parseFloat(preview.style.width);
        var h = parseFloat(preview.style.height);
        var left = preview.style.left;
        var top = preview.style.top;
        preview.remove();
        if (w >= 20 && h >= 20) {
          var box = createUserbox({ left: left, top: top, w: w + 'px', h: h + 'px' });
          pushHistory({ type: 'add', el: box, parent: box.parentNode, next: null });
        }
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  // ====================================================================
  //  Text-add tool (India-2)
  // ====================================================================
  // ユーザがツールを ON にして canvas をクリックすると、その位置に
  //   <div class="le-added-text resizable" contenteditable="true">テキスト</div>
  // を absolute 配置で挿入。直後にフォーカスして即編集可。Esc またはツール
  // ボタン再クリックで OFF。永続化はドロップ画像と同パターン (localStorage)。

  function addedTextStorageKey() {
    return 'le-added-texts:' + (location.pathname || '/');
  }

  function nextTextId() {
    return 'text_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function buildAddedText(html, opts) {
    opts = opts || {};
    var div = document.createElement('div');
    // editable-text クラスを併用して既存の text-undo インフラに乗せる
    div.className = 'le-added-text editable-text';
    div.dataset.textId = opts.id || nextTextId();
    div.setAttribute('data-le-keep-position', '1');
    div.setAttribute('contenteditable', 'true');
    div.setAttribute('data-le-label', opts.label || 'テキスト');
    div.spellcheck = false;
    div.innerHTML = (typeof html === 'string' && html !== '') ? html : 'テキスト';
    return div;
  }

  function saveAddedTexts() {
    try {
      var list = $$('.le-added-text').map(function (el) {
        return {
          id: el.dataset.textId || '',
          html: el.innerHTML,
          // Mike-2 修正B: 要素一覧ラベルを永続化
          label: (el.dataset && el.dataset.leLabel) || '',
          left: el.style.left || '',
          top: el.style.top || '',
          width: el.style.width || '',
          height: el.style.height || '',
          tx: el._tx || 0,
          ty: el._ty || 0,
          z: el.style.zIndex || ''
        };
      });
      localStorage.setItem(addedTextStorageKey(), JSON.stringify(list));
    } catch (e) {
      console.warn('[LayoutEditor] saveAddedTexts failed', e);
    }
  }

  function restoreAddedTexts(canvas) {
    if (!canvas) return;
    var list = [];
    try {
      var raw = localStorage.getItem(addedTextStorageKey());
      list = raw ? JSON.parse(raw) : [];
    } catch (e) { list = []; }
    if (!Array.isArray(list) || list.length === 0) {
      $$('.le-added-text').forEach(function (el) {
        if (!el.classList.contains('resizable')) {
          el.setAttribute('data-le-keep-position', '1');
          try { attachHandle(el, 'wh'); } catch (e) {}
        }
      });
      return;
    }
    list.forEach(function (item) {
      if (!item) return;
      if (item.id) {
        var existing = canvas.querySelector('.le-added-text[data-text-id="' + item.id + '"]');
        if (existing) {
          if (!existing.classList.contains('resizable')) {
            existing.setAttribute('data-le-keep-position', '1');
            try { attachHandle(existing, 'wh'); } catch (e) {}
          }
          return;
        }
      }
      var div = buildAddedText(item.html, { id: item.id, label: item.label || '' });
      div.style.position = 'absolute';
      if (item.left)   div.style.left = item.left;
      if (item.top)    div.style.top = item.top;
      if (item.width)  div.style.width = item.width;
      if (item.height) div.style.height = item.height;
      if (item.z)      div.style.zIndex = item.z;
      var tx = parseFloat(item.tx) || 0, ty = parseFloat(item.ty) || 0;
      if (tx || ty) {
        div._tx = tx; div._ty = ty;
        div.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)';
      }
      canvas.appendChild(div);
      try { attachHandle(div, 'wh'); } catch (e) {}
    });
    $$('.le-added-text').forEach(function (el) {
      if (!el.classList.contains('resizable')) {
        el.setAttribute('data-le-keep-position', '1');
        try { attachHandle(el, 'wh'); } catch (e) {}
      }
    });
  }

  function setTextToolMode(on) {
    state.textToolOn = !!on;
    document.body.classList.toggle('le-text-tool-active', state.textToolOn);
    var btn = $('#le-text-add');
    if (btn) {
      btn.classList.toggle('active', state.textToolOn);
      btn.textContent = state.textToolOn ? '📝 テキスト ON' : '📝 テキスト OFF';
    }
    if (state.textToolOn) {
      showToast('テキスト追加モード ON — canvas をクリックで挿入');
    }
  }

  function insertNewTextAt(canvas, clientX, clientY) {
    if (!canvas) return null;
    var info = getStageRectInfo();
    var rect = info.stageRect;
    var scale = info.scale || 1;
    var defaultW = 200, defaultH = 48;
    var localX = (clientX - rect.left) / scale - defaultW / 2;
    var localY = (clientY - rect.top) / scale - defaultH / 2;

    // Mike-2 修正B: 新規テキストに「テキストN」連番ラベルを付与
    var div = buildAddedText('テキスト', { label: getNextTextLabel() });
    div.style.position = 'absolute';
    div.style.left = Math.max(0, Math.round(localX)) + 'px';
    div.style.top  = Math.max(0, Math.round(localY)) + 'px';
    div.style.width  = defaultW + 'px';
    div.style.minHeight = defaultH + 'px';
    div.style.zIndex = '50';

    canvas.appendChild(div);
    try { attachHandle(div, 'wh'); } catch (e) { console.warn('[LayoutEditor] attachHandle on added-text failed', e); }

    pushHistory({ type: 'add', el: div, parent: canvas, next: null });

    // Persist on edit / blur
    div.addEventListener('input', debouncedSaveAddedTexts);
    div.addEventListener('blur', saveAddedTexts);

    selectOnly(div);
    saveAddedTexts();
    scheduleDirtyUpdate();
    // Juliet-2 修正B: 要素一覧を最新化
    try { refreshElementList(); } catch (e) {}

    // 直後にフォーカス & 全選択して即タイプ可能に
    try {
      div.focus();
      var range = document.createRange();
      range.selectNodeContents(div);
      var selObj = window.getSelection();
      if (selObj) { selObj.removeAllRanges(); selObj.addRange(range); }
    } catch (e) {}

    return div;
  }

  var debouncedSaveAddedTexts;

  function attachTextTool(canvas) {
    if (!canvas) return;
    debouncedSaveAddedTexts = debounce(saveAddedTexts, 200);

    // canvas クリックでテキスト挿入 (テキストツール ON 時のみ)
    var onClick = function (e) {
      if (!state.enabled || !state.textToolOn) return;
      // ツールバー / パネル / 既存リサイザブル要素・ハンドル上では発火しない
      if (e.target.closest(
        '.le-toolbar, .le-ruler, .le-guide, .numeric-panel, .le-list-panel, ' +
        '.le-help-modal, .le-comparison-picker, .le-pages-dropdown, ' +
        '.resize-handle, .userbox-badge, .userbox-del, .le-anno-layer, ' +
        '.le-added-text'
      )) return;
      e.preventDefault();
      e.stopPropagation();
      insertNewTextAt(canvas, e.clientX, e.clientY);
      // 1回挿入したらモードを抜ける (Photoshop 等の慣習)
      setTextToolMode(false);
    };
    addManagedListener(canvas, 'click', onClick, true /* capture */);

    // Esc でモード OFF (キャプチャ phase で先取り)
    var onKey = function (e) {
      if (e.key === 'Escape' && state.textToolOn) {
        setTextToolMode(false);
      }
    };
    addManagedListener(window, 'keydown', onKey);

    // Persist on transform of any added-text
    var onTransform = function () {
      var hit = false;
      try {
        if (state.selectedElements && state.selectedElements.size) {
          state.selectedElements.forEach(function (el) {
            if (el && el.classList && el.classList.contains('le-added-text')) hit = true;
          });
        }
      } catch (e) {}
      if (hit) debouncedSaveAddedTexts();
    };
    on('transform', onTransform);
    registerCleanup(function () { off('transform', onTransform); });
  }

  // ====================================================================
  //  Toolbar
  // ====================================================================

  function buildToolbar() {
    var tb = document.createElement('div');
    tb.className = 'le-toolbar';
    tb.id = 'le-toolbar';
    tb.innerHTML =
      '<div class="le-tb-group">' +
      '<button id="le-save" title="保存 (Ctrl+S)" aria-label="保存">💾 保存</button>' +
      '<button id="le-revert" title="保存値に戻す" aria-label="保存値に戻す">⏮ 復元</button>' +
      '<button id="le-reset" title="完全リセット" aria-label="完全リセット">↺ リセット</button>' +
      '</div>' +
      '<div class="le-tb-group">' +
      '<button id="le-undo" title="Undo (Ctrl+Z)" aria-label="Undo">↶</button>' +
      '<button id="le-redo" title="Redo (Ctrl+Y)" aria-label="Redo">↷</button>' +
      '<button id="le-duplicate" title="複製 (Ctrl+D)" aria-label="複製">⧉ 複製</button>' +
      // Lima-2 修正B: 選択した要素の画像 (img / 背景画像 / 単一内側 img) を
      //   ファイル選択ダイアログで差し替える明示ボタン。単一選択時のみ有効。
      '<button id="le-replace-src" title="選択した要素の画像を差し替え（ファイル選択ダイアログ）" aria-label="画像を差し替え" disabled>📥 src 差し替え</button>' +
      // Kilo-2 修正C → Lima-2 修正C: 選択要素を親レイヤーから取り出して stage 直下に配置する
      '<button id="le-detach" title="選択中のレイヤーを親グループから取り出して独立編集可能にします" aria-label="親レイヤーから取り出す" disabled>🔓 取り出す</button>' +
      '<button id="le-multi-select" title="マルチセレクト ON/OFF (タッチ用)" aria-label="マルチセレクト切替">👆+ 複数選択</button>' +
      '</div>' +
      // U4: alignment toolbar promoted to top toolbar (always discoverable).
      '<div class="le-tb-group le-align-tb" id="le-align-tb">' +
      '<button class="le-align-tb-btn" data-align="left"     title="左揃え"   aria-label="左揃え" disabled>⇤</button>' +
      '<button class="le-align-tb-btn" data-align="center-h" title="水平中央" aria-label="水平中央" disabled>⇔</button>' +
      '<button class="le-align-tb-btn" data-align="right"    title="右揃え"   aria-label="右揃え" disabled>⇥</button>' +
      '<button class="le-align-tb-btn" data-align="top"      title="上揃え"   aria-label="上揃え" disabled>⤒</button>' +
      '<button class="le-align-tb-btn" data-align="center-v" title="垂直中央" aria-label="垂直中央" disabled>⇕</button>' +
      '<button class="le-align-tb-btn" data-align="bottom"   title="下揃え"   aria-label="下揃え" disabled>⤓</button>' +
      '<button class="le-align-tb-btn" data-align="dist-h"   title="水平等間隔" aria-label="水平等間隔" disabled>⇋</button>' +
      '<button class="le-align-tb-btn" data-align="dist-v"   title="垂直等間隔" aria-label="垂直等間隔" disabled>⇌</button>' +
      '</div>' +
      '<div class="le-tb-group">' +
      '<button id="le-userbox-add" title="矩形追加" aria-label="矩形追加">🆕 矩形追加 OFF</button>' +
      // India-2: テキスト追加ツール — クリック → モード ON → canvas クリックで挿入
      '<button id="le-text-add" title="テキスト追加 (クリックでモード ON、再度クリックまたは Esc で OFF)" aria-label="テキスト追加">📝 テキスト OFF</button>' +
      '<button id="le-anno-toggle" title="注釈モード" aria-label="注釈モード切替">📝 注釈 OFF</button>' +
      '<span id="le-anno-tools" class="le-anno-tools" style="display:none;">' +
      '<button class="le-tool-btn" data-tool="select" title="選択 (V)" aria-label="選択ツール">👆</button>' +
      '<button class="le-tool-btn" data-tool="marker" title="マーカー (M)" aria-label="マーカーツール">📍</button>' +
      '<button class="le-tool-btn" data-tool="text"   title="テキスト (T)" aria-label="テキストツール">📝</button>' +
      '<button class="le-tool-btn" data-tool="rect"   title="矩形 (R)" aria-label="矩形ツール">▭</button>' +
      '<button class="le-tool-btn" data-tool="arrow"  title="矢印 (A)" aria-label="矢印ツール">↗</button>' +
      '<button class="le-tool-btn" data-tool="line"   title="線 (L)" aria-label="線ツール">─</button>' +
      '<button class="le-tool-btn" data-tool="eraser" title="消しゴム (E)" aria-label="消しゴムツール">🧹</button>' +
      '<input type="color" id="le-anno-color" value="#ff3b6b" aria-label="注釈の色">' +
      '</span>' +
      '</div>' +
      '<div class="le-tb-group">' +
      '<button id="le-grid" title="スナップグリッド" aria-label="スナップグリッド">🔳 グリッド</button>' +
      '<select id="le-grid-size" title="グリッド間隔" aria-label="グリッド間隔">' +
      '<option value="8">8</option><option value="16" selected>16</option><option value="32">32</option>' +
      '</select>' +
      '<button id="le-comparison" title="比較モード" aria-label="比較モード">🆚 比較</button>' +
      '<button id="le-list-toggle" title="要素一覧" aria-label="要素一覧パネル切替">📋 要素</button>' +
      '<button id="le-pages" class="le-pages-btn" title="他の編集ページへ移動" aria-label="ページ移動" aria-haspopup="true" aria-expanded="false">🌐 ページ</button>' +
      '<button id="le-help" title="?: ヘルプ" aria-label="ヘルプ">❓</button>' +
      '</div>' +
      '<div class="le-tb-group">' +
      '<label class="le-zoom-wrap">🔍 <input type="range" id="le-zoom-slider" min="25" max="200" value="100" step="5" aria-label="ズーム"><span id="le-zoom-label">100%</span></label>' +
      '<button id="le-zoom-fit" title="100% に戻す (Ctrl+0)" aria-label="ズーム100%">⌂</button>' +
      '</div>' +
      '<div class="le-tb-group">' +
      '<button id="le-png-export" title="PNG 書き出し" aria-label="PNG書き出し">🖼 PNG</button>' +
      '<button id="le-preview" title="端末サイズで見る" aria-label="プレビューモード">📱</button>' +
      '<button id="le-disable" title="編集モード OFF" aria-label="編集モード終了">✕ 編集終了</button>' +
      '</div>';
    document.body.insertBefore(tb, document.body.firstChild);
    state.toolbarEl = tb;
    wireToolbar(tb);
  }

  function wireToolbar(tb) {
    tb.querySelector('#le-save').addEventListener('click', save);
    tb.querySelector('#le-revert').addEventListener('click', revert);
    tb.querySelector('#le-reset').addEventListener('click', reset);
    tb.querySelector('#le-undo').addEventListener('click', undo);
    tb.querySelector('#le-redo').addEventListener('click', redo);
    tb.querySelector('#le-duplicate').addEventListener('click', duplicateSelected);
    // Lima-2 修正B: 「📥 src 差し替え」ボタン — 選択要素にファイルダイアログ経由で
    //   画像を差し替える明示操作。drag&drop の偶発的差し替えを廃止した代替経路。
    var replaceBtn = tb.querySelector('#le-replace-src');
    if (replaceBtn) replaceBtn.addEventListener('click', openReplaceDialog);
    // Kilo-2 修正C: 親から取り出すボタン
    var detachBtn = tb.querySelector('#le-detach');
    if (detachBtn) detachBtn.addEventListener('click', detachSelectedFromParent);
    // U10: iPad-friendly multi-select toggle
    var msBtn = tb.querySelector('#le-multi-select');
    if (msBtn) {
      msBtn.addEventListener('click', function () {
        state.multiSelectMode = !state.multiSelectMode;
        msBtn.classList.toggle('active', state.multiSelectMode);
        msBtn.textContent = state.multiSelectMode ? '👆+ 複数選択 ON' : '👆+ 複数選択';
        showToast(state.multiSelectMode ? 'マルチセレクトモード ON' : 'マルチセレクトモード OFF');
      });
    }
    tb.querySelector('#le-userbox-add').addEventListener('click', function () { setDrawMode(!state.drawModeOn); });
    // India-2: text-add tool
    var textAddBtn = tb.querySelector('#le-text-add');
    if (textAddBtn) textAddBtn.addEventListener('click', function () { setTextToolMode(!state.textToolOn); });
    tb.querySelector('#le-anno-toggle').addEventListener('click', function () { setAnnoMode(!state.annoMode); });
    tb.querySelectorAll('.le-tool-btn').forEach(function (b) {
      b.addEventListener('click', function () { setAnnoTool(b.dataset.tool); });
    });
    // U4: top-toolbar alignment buttons (delegate to applyAlignment).
    tb.querySelectorAll('.le-align-tb-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.disabled) return;
        applyAlignment(b.dataset.align);
      });
    });
    var colorInp = tb.querySelector('#le-anno-color');
    if (colorInp) colorInp.addEventListener('input', function (e) {
      state.annoColor = e.target.value;
      if (state.annoSelected) applyAnnoColor(state.annoSelected, state.annoColor);
    });
    tb.querySelector('#le-grid').addEventListener('click', function () { toggleGrid(); });
    tb.querySelector('#le-grid-size').addEventListener('change', function (e) {
      setGridSize(parseInt(e.target.value, 10));
    });
    tb.querySelector('#le-comparison').addEventListener('click', toggleComparison);
    tb.querySelector('#le-list-toggle').addEventListener('click', function () {
      if (!state.listPanelEl) buildElementListPanel();
      var nowOpen = state.listPanelEl.classList.toggle('open');
      // R1: persist open/closed state
      try { localStorage.setItem('pono_layout_panel_open', nowOpen ? '1' : '0'); } catch (e) {}
    });
    // 🌐 Page navigation: hide button when no pages configured.
    var pagesBtn = tb.querySelector('#le-pages');
    if (pagesBtn) {
      var pages = state.config && state.config.pages;
      if (!pages || !pages.length) {
        pagesBtn.style.display = 'none';
      } else {
        pagesBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          togglePagesDropdown(pagesBtn);
        });
      }
    }
    tb.querySelector('#le-help').addEventListener('click', showHelpModal);
    tb.querySelector('#le-zoom-slider').addEventListener('input', function (e) {
      setZoom(parseInt(e.target.value, 10) / 100);
    });
    tb.querySelector('#le-zoom-fit').addEventListener('click', zoomFit);
    tb.querySelector('#le-png-export').addEventListener('click', showPngMenu);
    tb.querySelector('#le-preview').addEventListener('click', enterPreview);
    tb.querySelector('#le-disable').addEventListener('click', disable);
  }

  // U4: refresh enabled/disabled state of top-toolbar alignment buttons
  function refreshTopToolbarAlign() {
    if (!state.toolbarEl) return;
    var n = state.selectedElements ? state.selectedElements.size : 0;
    state.toolbarEl.querySelectorAll('.le-align-tb-btn').forEach(function (b) {
      var kind = b.dataset.align;
      var need = (kind === 'dist-h' || kind === 'dist-v') ? 3 : 2;
      b.disabled = n < need;
    });
  }

  // ====================================================================
  //  PNG export (FEATURE 17)
  // ====================================================================

  function showPngMenu() {
    var existing = $('#le-png-menu');
    if (existing) { existing.remove(); return; }
    var menu = document.createElement('div');
    menu.id = 'le-png-menu';
    menu.className = 'le-png-menu';
    menu.innerHTML =
      '<button data-mode="snapshot">📸 現状そのまま</button>' +
      '<button data-mode="wireframe">🪟 ワイヤー (枠線のみ)</button>';
    var anchor = $('#le-png-export');
    if (!anchor) return;
    var rect = anchor.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.left = rect.left + 'px';
    document.body.appendChild(menu);
    menu.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-mode]');
      if (!btn) return;
      menu.remove();
      if (btn.dataset.mode === 'snapshot') exportPngSnapshot();
      else if (btn.dataset.mode === 'wireframe') exportPngWireframe();
    });
    setTimeout(function () {
      document.addEventListener('click', function clickOff(ev) {
        if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', clickOff); }
      }, { once: true });
    }, 50);
  }

  function exportPngSnapshot() {
    if (typeof window.html2canvas !== 'function') {
      showToast('html2canvas が未ロードです (snapshot モード)', 'error');
      return;
    }
    var safe = $('#safe-area') || state.canvasEl;
    if (!safe) return;
    showToast('スナップショット生成中...');
    window.html2canvas(safe, {
      scale: 1, useCORS: true, allowTaint: true, backgroundColor: null, logging: false,
    }).then(function (canvas) {
      canvas.toBlob(function (blob) {
        if (!blob) { showToast('PNG 生成失敗', 'error'); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'layout-snapshot-' + nowIso() + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        showToast('PNG を保存しました');
      }, 'image/png');
    }).catch(function (err) {
      showToast('スナップショット失敗: ' + err.message, 'error');
    });
  }

  function exportPngWireframe() {
    var stage = state.canvasEl;
    if (!stage) return;
    var info = getStageRectInfo();
    var W = parseFloat(getComputedStyle(stage).width) || stage.offsetWidth;
    var H = parseFloat(getComputedStyle(stage).height) || stage.offsetHeight;
    var labelMap = {};
    state.spec.forEach(function (entry) { labelMap[entry[0]] = entry[2] || ''; });
    var out = document.createElement('canvas');
    out.width = W; out.height = H;
    var ctx = out.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,184,224,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(1, 1, W - 2, H - 2);
    ctx.setLineDash([]);
    state.spec.forEach(function (entry) {
      var sel = entry[0];
      $$(sel).forEach(function (el, idx) {
        var r = el.getBoundingClientRect();
        var x = (r.left - info.stageRect.left) / info.scale;
        var y = (r.top - info.stageRect.top) / info.scale;
        var w = r.width / info.scale, h = r.height / info.scale;
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
        var label = (labelMap[sel] || sel) + ($$(sel).length > 1 ? ' ' + (idx + 1) : '');
        ctx.font = '700 18px system-ui, -apple-system, sans-serif';
        var pad = 8;
        var textW = ctx.measureText(label).width;
        var bH = 24, bW = textW + pad * 2;
        var bY = (y - bH - 4 >= 0) ? (y - bH - 4) : (y + 4);
        ctx.fillStyle = 'rgba(0,0,0,0.88)';
        ctx.fillRect(x, bY, bW, bH);
        ctx.fillStyle = '#ffe8a8';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + pad, bY + bH / 2);
        ctx.font = '500 16px ui-monospace, Menlo, Consolas, monospace';
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(w) + ' × ' + Math.round(h), x + w / 2, y + h / 2);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      });
    });
    out.toBlob(function (blob) {
      if (!blob) { showToast('PNG 生成失敗', 'error'); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'layout-wireframe-' + nowIso() + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      showToast('ワイヤー PNG を保存');
    }, 'image/png');
  }

  // ====================================================================
  //  Preview mode (FEATURE 17 / 28)
  // ====================================================================

  function enterPreview() {
    document.body.classList.add('preview-mode');
    fitStage();
    window.addEventListener('resize', fitStage);
    // R2: visible exit affordance — small fixed button top-right while in preview
    if (!state.previewExitBtn) {
      var btn = document.createElement('button');
      btn.className = 'le-preview-exit';
      btn.type = 'button';
      btn.textContent = '✕ プレビュー終了';
      btn.title = 'Esc でも終了できます';
      btn.setAttribute('aria-label', 'プレビューを終了');
      btn.addEventListener('click', exitPreview);
      document.body.appendChild(btn);
      state.previewExitBtn = btn;
    }
    // R2: strip ?preview=1 from URL if present
    try {
      if (window.location && window.location.search.indexOf('preview=1') >= 0 &&
          window.history && typeof window.history.replaceState === 'function') {
        var u = new URL(window.location.href);
        u.searchParams.delete('preview');
        window.history.replaceState(null, '', u.pathname + (u.search ? u.search : '') + u.hash);
      }
    } catch (e) {}
  }
  function exitPreview() {
    if (!document.body.classList.contains('preview-mode')) return;
    document.body.classList.remove('preview-mode');
    var stage = state.canvasEl;
    if (stage) stage.style.transform = 'scale(' + state.zoom + ')';
    window.removeEventListener('resize', fitStage);
    if (state.previewExitBtn) {
      state.previewExitBtn.remove();
      state.previewExitBtn = null;
    }
    // R2: clear ?preview=1 from URL on exit too
    try {
      if (window.location && window.location.search.indexOf('preview=1') >= 0 &&
          window.history && typeof window.history.replaceState === 'function') {
        var u = new URL(window.location.href);
        u.searchParams.delete('preview');
        window.history.replaceState(null, '', u.pathname + (u.search ? u.search : '') + u.hash);
      }
    } catch (e) {}
  }
  function fitStage() {
    var stage = state.canvasEl;
    if (!stage) return;
    var stageW = parseFloat(getComputedStyle(stage).width);
    var stageH = parseFloat(getComputedStyle(stage).height);
    var w = window.innerWidth, h = window.innerHeight;
    var scale = Math.min(w / stageW, h / stageH);
    var ox = (w - stageW * scale) / 2;
    var oy = (h - stageH * scale) / 2;
    stage.style.transformOrigin = '0 0';
    stage.style.transform = 'translate(' + ox + 'px, ' + oy + 'px) scale(' + scale + ')';
  }

  // ====================================================================
  //  Help modal (FEATURE 27)
  // ====================================================================

  // ====================================================================
  //  🌐 Page navigation dropdown
  // ====================================================================
  function togglePagesDropdown(anchorBtn) {
    if (state.pagesDropdownEl) { closePagesDropdown(); return; }
    var pages = (state.config && state.config.pages) || [];
    if (!pages.length) return;

    var dd = document.createElement('div');
    dd.className = 'le-pages-dropdown';
    var rect = anchorBtn.getBoundingClientRect();
    dd.style.top  = (rect.bottom + 4) + 'px';
    dd.style.left = Math.max(8, rect.left) + 'px';

    var html = '<div class="le-pages-dropdown-title">編集可能なページ</div><ul class="le-pages-list">';
    pages.forEach(function (p) {
      if (!p || !p.name) return;
      var name = String(p.name);
      var url  = p.url ? String(p.url) : '';
      if (p.current) {
        html += '<li class="le-pages-current"><span>📍 ' + escHtml(name) + '</span></li>';
      } else if (url) {
        html += '<li><a href="' + escAttr(url) + '">' + escHtml(name) + '</a></li>';
      } else {
        html += '<li><span>' + escHtml(name) + '</span></li>';
      }
    });
    html += '</ul>';
    dd.innerHTML = html;
    document.body.appendChild(dd);
    state.pagesDropdownEl = dd;
    if (anchorBtn) anchorBtn.setAttribute('aria-expanded', 'true');

    // Click outside closes.
    var docHandler = function (e) {
      if (!state.pagesDropdownEl) return;
      if (state.pagesDropdownEl.contains(e.target)) return;
      if (anchorBtn && anchorBtn.contains(e.target)) return;
      closePagesDropdown();
    };
    state.pagesDocClickHandler = docHandler;
    // Defer attaching to avoid catching the same click that opened the menu.
    setTimeout(function () {
      document.addEventListener('click', docHandler, true);
    }, 0);
  }

  function closePagesDropdown() {
    if (state.pagesDropdownEl) {
      state.pagesDropdownEl.remove();
      state.pagesDropdownEl = null;
    }
    if (state.pagesDocClickHandler) {
      try { document.removeEventListener('click', state.pagesDocClickHandler, true); } catch (e) {}
      state.pagesDocClickHandler = null;
    }
    var btn = state.toolbarEl && state.toolbarEl.querySelector('#le-pages');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;';
    });
  }
  function escAttr(s) { return escHtml(s); }

  function showHelpModal() {
    if (state.helpModalEl) { state.helpModalEl.remove(); state.helpModalEl = null; return; }
    var modal = document.createElement('div');
    modal.className = 'le-help-modal';
    modal.innerHTML =
      '<div class="le-help-card">' +
      '<h3>ショートカット</h3>' +
      '<table>' +
      '<tr><td>Ctrl+S</td><td>保存</td></tr>' +
      '<tr><td>Ctrl+Z / Ctrl+Y</td><td>Undo / Redo</td></tr>' +
      '<tr><td>Ctrl+D</td><td>選択中を複製</td></tr>' +
      '<tr><td>Ctrl+L</td><td>選択中をロック</td></tr>' +
      '<tr><td>Ctrl + 0 / + / -</td><td>ズーム リセット / 拡大 / 縮小</td></tr>' +
      '<tr><td>Ctrl + ホイール</td><td>ズーム</td></tr>' +
      '<tr><td>Arrow ↑↓ / Shift+Arrow</td><td>±1 / ±10</td></tr>' +
      '<tr><td>Alt+クリック</td><td>±0.5 ステップ</td></tr>' +
      '<tr><td>Shift+クリック</td><td>複数選択 (toggle)</td></tr>' +
      '<tr><td>Delete / Backspace</td><td>選択中を隠す (注釈モードでは削除)</td></tr>' +
      '<tr><td>Esc</td><td>選択解除</td></tr>' +
      '<tr><td>?</td><td>ヘルプ表示</td></tr>' +
      '</table>' +
      '<button class="le-help-close">閉じる</button>' +
      '</div>';
    document.body.appendChild(modal);
    state.helpModalEl = modal;
    modal.querySelector('.le-help-close').addEventListener('click', function () {
      modal.remove();
      state.helpModalEl = null;
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        modal.remove();
        state.helpModalEl = null;
      }
    });
  }

  // ====================================================================
  //  Keyboard (FEATURE 27)
  // ====================================================================

  function attachKeyboard() {
    var keydownHandler = function (e) {
      if (!state.enabled) return;
      var inField = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' ||
                                  e.target.tagName === 'SELECT' || e.target.isContentEditable);
      // Ctrl+S: save
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault(); save(); return;
      }
      // Ctrl+Z / Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault(); undo(); return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
        e.preventDefault(); redo(); return;
      }
      // Ctrl+D: duplicate
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault(); duplicateSelected(); return;
      }
      // Ctrl+L: lock toggle
      if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        var sel = Array.from(state.selectedElements);
        sel.forEach(function (el) { toggleLock(el); });
        refreshElementList();
        return;
      }
      // Ctrl+0 / + / -
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault(); zoomFit(); return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault(); setZoom(state.zoom + 0.1); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault(); setZoom(state.zoom - 0.1); return;
      }
      if (inField) return;
      // Plain keys
      if (e.key === '?') { e.preventDefault(); showHelpModal(); return; }
      if (e.key === 'Escape') {
        // R2: Esc exits preview mode first
        if (document.body.classList.contains('preview-mode')) { exitPreview(); return; }
        if (state.helpModalEl) { state.helpModalEl.remove(); state.helpModalEl = null; return; }
        var ctxMenu = $('#le-context-menu');
        if (ctxMenu) { ctxMenu.remove(); return; }
        if (state.drawModeOn) { setDrawMode(false); return; }
        if (state.annoMode && state.annoSelected) { annoSelectEl(null); return; }
        clearSelection();
        return;
      }
      // U8: single-key annotation tool shortcuts (only while annotation mode is on)
      if (state.annoMode && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        var annoMap = { m: 'marker', t: 'text', r: 'rect', a: 'arrow', l: 'line', e: 'eraser', v: 'select' };
        var k = e.key && e.key.toLowerCase ? e.key.toLowerCase() : '';
        if (annoMap[k]) {
          e.preventDefault();
          setAnnoTool(annoMap[k]);
          return;
        }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace')) {
        if (state.annoMode && state.annoSelected) {
          e.preventDefault();
          var el = state.annoSelected;
          pushHistory({ type: 'remove', el: el, parent: el.parentNode, next: el.nextSibling });
          el.remove();
          annoSelectEl(null);
          return;
        }
        if (state.selectedElements.size > 0) {
          e.preventDefault();
          hideSelectedElements();
        }
      }
      // Arrow keys nudge selected elements
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (!state.selectedElements.size) return;
        e.preventDefault();
        var step = e.shiftKey ? 10 : 1;
        var dx = e.key === 'ArrowLeft' ? -step : (e.key === 'ArrowRight' ? step : 0);
        var dy = e.key === 'ArrowUp' ? -step : (e.key === 'ArrowDown' ? step : 0);
        var beforeMap = new Map();
        Array.from(state.selectedElements).filter(function (el) { return !isLocked(el); }).forEach(function (el) {
          beforeMap.set(el, getResizeState(el));
          el._tx = (el._tx || 0) + dx;
          el._ty = (el._ty || 0) + dy;
          el.style.transform = 'translate(' + el._tx + 'px, ' + el._ty + 'px)';
        });
        // Kilo-2 修正A: Arrow / Shift+Arrow nudge も batch にまとめる
        var ops = [];
        beforeMap.forEach(function (before, el) {
          var after = getResizeState(el);
          if (JSON.stringify(after) !== JSON.stringify(before)) {
            ops.push({ type: 'resize', el: el, before: before, after: after });
          }
        });
        pushHistoryBatch(ops);
        updateNumericPanel();
      }
    };
    addManagedListener(window, 'keydown', keydownHandler);
  }

  // ====================================================================
  //  Click on background → clear selection
  // ====================================================================

  function attachBackgroundClickClear() {
    var bgHandler = function (e) {
      if (!state.enabled) return;
      if (e.target.closest('.resizable')) return;
      if (e.target.closest('.numeric-panel')) return;
      if (e.target.closest('.le-toolbar')) return;
      if (e.target.closest('.le-list-panel')) return;
      if (e.target.closest('.resize-handle')) return;
      if (e.target.closest('.le-guide')) return;
      if (e.target.closest('.le-ruler')) return;
      if (e.target.closest('.le-help-modal')) return;
      if (e.target.closest('.le-comparison-picker')) return;
      if (e.target.closest('.le-context-menu')) return;
      if (e.target.closest('.le-pages-dropdown')) return;
      if (state.selectedElements.size > 0) clearSelection();
    };
    addManagedListener(document, 'mousedown', bgHandler);
  }

  // ====================================================================
  //  Editable text wiring (FEATURE 13)
  // ====================================================================

  function wireEditableTexts() {
    var focusHandler = function (e) {
      if (e.target.classList && e.target.classList.contains('editable-text')) {
        e.target._beforeText = e.target.textContent;
      }
    };
    var blurHandler = function (e) {
      if (e.target.classList && e.target.classList.contains('editable-text')) {
        var before = e.target._beforeText;
        var after = e.target.textContent;
        if (before !== undefined && before !== after) {
          pushHistory({ type: 'text', el: e.target, before: before, after: after });
        }
        scheduleDirtyUpdate();
      }
    };
    addManagedListener(document, 'focus', focusHandler, true);
    addManagedListener(document, 'blur', blurHandler, true);
  }

  // ====================================================================
  //  Image drag-and-drop (Team Uniform: drop OS image files into editor)
  // ====================================================================

  var DROP_MAX_BYTES = 10 * 1024 * 1024; // 10MB hard cap before data-URL conversion
  // Max long-side after resize (matches scripts/auto_optimize_image.py).
  // 4K-class drops get auto-shrunk so localStorage doesn't blow its 5–10MB quota.
  var MAX_DIMENSION = 1600;

  function droppedImagesStorageKey() {
    return 'le-dropped-images:' + (location.pathname || '/');
  }

  function readAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function (err) { reject(err); };
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function (err) { reject(err); };
      img.src = src;
    });
  }

  // Read a file and resize it to MAX_DIMENSION on the long side, preserving
  // aspect ratio and (where possible) original format/transparency.
  // Returns { dataUrl, width, height, resized }. Falls back to the raw data URL
  // if anything goes wrong (e.g. decode failure on a corrupt file).
  function readAndResizeImage(file) {
    return readAsDataURL(file).then(function (dataUrl) {
      return loadImage(dataUrl).then(function (img) {
        var nw = img.naturalWidth || img.width;
        var nh = img.naturalHeight || img.height;
        var longSide = Math.max(nw, nh);
        if (!longSide || longSide <= MAX_DIMENSION) {
          return { dataUrl: dataUrl, width: nw, height: nh, resized: false };
        }
        var scale = MAX_DIMENSION / longSide;
        var targetW = Math.max(1, Math.round(nw * scale));
        var targetH = Math.max(1, Math.round(nh * scale));
        var canvasEl = document.createElement('canvas');
        canvasEl.width = targetW;
        canvasEl.height = targetH;
        var ctx = canvasEl.getContext('2d');
        if (!ctx) {
          return { dataUrl: dataUrl, width: nw, height: nh, resized: false };
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);
        var mime = (file && file.type) || '';
        var outputDataUrl;
        try {
          if (mime === 'image/png' || mime === 'image/webp') {
            // Preserve transparency / lossless formats. quality arg is ignored for PNG.
            outputDataUrl = canvasEl.toDataURL(mime);
          } else {
            // JPEG (default) and any unknown raster type → JPEG @ 0.9.
            outputDataUrl = canvasEl.toDataURL('image/jpeg', 0.9);
          }
        } catch (err) {
          console.warn('[LayoutEditor] canvas.toDataURL failed; using original', err);
          return { dataUrl: dataUrl, width: nw, height: nh, resized: false };
        }
        // Size delta log (base64 → bytes is ~3/4)
        try {
          var beforeKB = Math.round(file.size / 1024);
          var afterKB = Math.round(outputDataUrl.length * 0.75 / 1024);
          var saved = beforeKB > 0 ? Math.round(100 - (afterKB / beforeKB) * 100) : 0;
          console.log('[LayoutEditor] Drop image: ' + nw + 'x' + nh +
            ' (' + beforeKB + 'KB) -> ' + targetW + 'x' + targetH +
            ' (' + afterKB + 'KB, ' + saved + '% reduction)');
        } catch (e) {}
        return { dataUrl: outputDataUrl, width: targetW, height: targetH, resized: true };
      }).catch(function (err) {
        console.warn('[LayoutEditor] image decode failed; using original data URL', err);
        return { dataUrl: dataUrl, width: 0, height: 0, resized: false };
      });
    });
  }

  function elementHasBackgroundImage(el) {
    if (!el || !el.nodeType || el.nodeType !== 1) return false;
    try {
      var bg = getComputedStyle(el).backgroundImage;
      return !!(bg && bg !== 'none' && bg.indexOf('url(') >= 0);
    } catch (e) { return false; }
  }

  function isImageElement(el) {
    if (!el) return false;
    if (el.tagName === 'IMG') return true;
    if (elementHasBackgroundImage(el)) return true;
    try {
      var inner = el.querySelectorAll('img');
      return inner && inner.length === 1;
    } catch (e) { return false; }
  }

  // Lima-2 修正A: isParentLayoutElement / decideDropAction は廃止。
  //   ドロップは常に新規挿入をデフォルトとする方針に変更したため、
  //   親レイアウト判定や条件分岐は不要 (Kilo-2 / Juliet-2 で導入したロジックを撤去)。

  // Lima-2 修正B: 「📥 src 差し替え」ボタンのクリックハンドラ。
  //   <input type="file"> ダイアログを動的生成して選択要素の画像を差し替える。
  //   drag&drop の暗黙差し替えを廃止した代替経路 (明示的・誤動作なし)。
  function openReplaceDialog() {
    var sel = (state.selectedElements && state.selectedElements.size === 1)
      ? Array.from(state.selectedElements)[0] : null;
    if (!sel) {
      showToast('差し替えるには要素を1つ選択してください', 'error');
      return;
    }
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) { input.remove(); return; }
      // Validate type/size (mirror drop-handler safety rails)
      if (!file.type || file.type.indexOf('image/') !== 0) {
        showToast('画像ファイルではありません', 'error');
        input.remove();
        return;
      }
      if (file.type.indexOf('svg') >= 0) {
        showToast('SVG は安全のため除外しました', 'error');
        input.remove();
        return;
      }
      if (file.size > DROP_MAX_BYTES) {
        showToast('10MB 超の画像はスキップ', 'error');
        input.remove();
        return;
      }
      readAndResizeImage(file).then(function (result) {
        if (result.resized) {
          showToast('画像を ' + result.width + '×' + result.height + ' に縮小しました');
        }
        var swapResult = replaceImageSrc(sel, result.dataUrl);
        if (swapResult !== null && swapResult !== undefined && swapResult !== false) {
          if (!result.resized) {
            if (swapResult === 'bg') {
              showToast('背景画像を差し替えました (Ctrl+Z で戻せます)');
            } else {
              showToast('画像を差し替えました (Ctrl+Z で戻せます)');
            }
          }
          scheduleDirtyUpdate();
        } else {
          showToast('差し替え対象が見つかりません（img / 背景画像 / 単一内側img の要素を選択してください）', 'error');
        }
      }).catch(function (err) {
        console.warn('[LayoutEditor] readAndResizeImage failed', err);
        showToast('画像の読み込みに失敗', 'error');
      }).then(function () { input.remove(); });
    });
    document.body.appendChild(input);
    input.click();
  }


  function swapImgSrcUndoable(img, newSrc, opts) {
    var oldSrc = img.src;
    if (oldSrc === newSrc) return true;
    img.src = newSrc;
    var afterSave = !!(opts && opts.afterSave);
    pushHistory({ type: 'image-swap', el: img, before: oldSrc, after: newSrc, _afterSave: afterSave });
    if (afterSave) try { saveDroppedImages(); } catch (e) {}
    return true;
  }

  function swapBackgroundImageUndoable(el, newSrc) {
    var current = el.style.backgroundImage;
    if (!current || current === '') {
      try { current = getComputedStyle(el).backgroundImage || ''; } catch (e) { current = ''; }
    }
    var newBg = 'url("' + newSrc + '")';
    if (current === newBg) return true;
    el.style.backgroundImage = newBg;
    pushHistory({ type: 'bg-image-swap', el: el, before: current, after: newBg });
    return true;
  }

  // Strict swap: returns 'img' | 'bg' | 'inner-img' if swap happened (truthy),
  //   null if ambiguous (caller falls back to insert).
  // Decision order:
  //   1. element is <img>            → swap its src
  //   2. element has background-image → swap that
  //   3. element contains exactly one inner <img> → swap that
  //   4. otherwise (0 or >=2 inner imgs, no bg) → null (ambiguous, fall back)
  function replaceImageSrc(element, dataUrl) {
    if (!element) return null;
    if (element.tagName === 'IMG') {
      var isDropped = element.parentNode && element.parentNode.classList && element.parentNode.classList.contains('le-dropped-img');
      return swapImgSrcUndoable(element, dataUrl, { afterSave: isDropped }) ? 'img' : null;
    }
    if (elementHasBackgroundImage(element)) {
      return swapBackgroundImageUndoable(element, dataUrl) ? 'bg' : null;
    }
    var innerImgs;
    try { innerImgs = element.querySelectorAll('img'); } catch (e) { innerImgs = null; }
    if (innerImgs && innerImgs.length === 1) {
      var dropWrap = element.classList && element.classList.contains('le-dropped-img');
      return swapImgSrcUndoable(innerImgs[0], dataUrl, { afterSave: dropWrap }) ? 'inner-img' : null;
    }
    return null;
  }

  function nextDropId() {
    return 'drop_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  // Mike-2 修正B: 新規画像/テキスト用の自動連番ラベル。
  //   既存 dataset.leLabel を集めて未使用の最小番号を採用 (削除耐性)。
  function getNextImageLabel() {
    var existing = $$('.le-dropped-img').map(function (el) {
      return (el.dataset && el.dataset.leLabel) || '';
    });
    var n = 1;
    while (existing.indexOf('新規画像' + n) >= 0) n++;
    return '新規画像' + n;
  }
  function getNextTextLabel() {
    var existing = $$('.le-added-text').map(function (el) {
      return (el.dataset && el.dataset.leLabel) || '';
    });
    var n = 1;
    while (existing.indexOf('テキスト' + n) >= 0) n++;
    return 'テキスト' + n;
  }

  function buildDroppedWrapper(dataUrl, fileName, opts) {
    // <img> is a void element and cannot contain resize handles. Wrap it in a
    // <div> so attachHandle can appendChild() handles safely.
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'le-dropped-img';
    wrap.dataset.dropId = nextDropId();
    if (fileName) wrap.dataset.dropName = fileName;
    // Mike-2 修正B: 自動連番ラベルを付与 (要素一覧で識別しやすく + rename 起点)
    if (opts.label) wrap.dataset.leLabel = opts.label;
    wrap.setAttribute('data-le-keep-position', '1');
    var img = document.createElement('img');
    img.src = dataUrl;
    img.alt = fileName || 'dropped image';
    img.draggable = false;
    img.style.cssText = 'width:100%;height:100%;display:block;pointer-events:none;-webkit-user-drag:none;user-select:none;';
    wrap.appendChild(img);
    return wrap;
  }

  function insertNewImageLayer(canvas, clientX, clientY, dataUrl, fileName) {
    if (!canvas) return null;
    var info = getStageRectInfo();
    var rect = info.stageRect;
    var scale = info.scale || 1;
    // Default size 200x200; replaced with natural size on load (clamped).
    var defaultW = 200, defaultH = 200;
    var localX = (clientX - rect.left) / scale - defaultW / 2;
    var localY = (clientY - rect.top) / scale - defaultH / 2;

    // Mike-2 修正B: 新規画像に「新規画像N」連番ラベルを付与
    var wrap = buildDroppedWrapper(dataUrl, fileName, { label: getNextImageLabel() });
    wrap.style.position = 'absolute';
    wrap.style.left = Math.max(0, Math.round(localX)) + 'px';
    wrap.style.top  = Math.max(0, Math.round(localY)) + 'px';
    wrap.style.width  = defaultW + 'px';
    wrap.style.height = defaultH + 'px';
    wrap.style.zIndex = '40';

    canvas.appendChild(wrap);
    try { attachHandle(wrap, 'wh'); } catch (e) { console.warn('[LayoutEditor] attachHandle on dropped image failed', e); }

    // Make the insert undoable. On undo the wrapper is removed; on redo it is
    // re-inserted into the canvas (parent/next captured at history-push time).
    pushHistory({ type: 'add', el: wrap, parent: canvas, next: null });

    var innerImg = wrap.querySelector('img');
    if (innerImg) {
      innerImg.addEventListener('load', function () {
        if (wrap.dataset.dropFitted === '1') return;
        wrap.dataset.dropFitted = '1';
        var nw = innerImg.naturalWidth || defaultW;
        var nh = innerImg.naturalHeight || defaultH;
        if (nw > 0 && nh > 0) {
          var maxDim = 600;
          var k = Math.min(1, maxDim / Math.max(nw, nh));
          var w = Math.round(nw * k);
          var h = Math.round(nh * k);
          wrap.style.width = w + 'px';
          wrap.style.height = h + 'px';
          if (wrap._resizeUpdateLabel) try { wrap._resizeUpdateLabel(); } catch (e) {}
        }
        saveDroppedImages();
      }, { once: true });
    }

    selectOnly(wrap);
    saveDroppedImages();
    scheduleDirtyUpdate();
    // Juliet-2 修正B: 要素一覧を最新化
    try { refreshElementList(); } catch (e) {}
    return wrap;
  }

  function saveDroppedImages() {
    try {
      var list = $$('.le-dropped-img').map(function (el) {
        var src = '';
        if (el.tagName === 'IMG') src = el.src || '';
        else { var inner = el.querySelector('img'); src = inner ? inner.src : ''; }
        return {
          id: el.dataset.dropId || '',
          name: el.dataset.dropName || '',
          // Mike-2 修正B: rename した要素一覧ラベルを永続化
          label: (el.dataset && el.dataset.leLabel) || '',
          src: src,
          left: el.style.left || '',
          top: el.style.top || '',
          width: el.style.width || '',
          height: el.style.height || '',
          tx: el._tx || 0,
          ty: el._ty || 0,
          z: el.style.zIndex || ''
        };
      });
      localStorage.setItem(droppedImagesStorageKey(), JSON.stringify(list));
    } catch (e) {
      // Quota exceeded or other error — log and continue (in-memory state remains).
      console.warn('[LayoutEditor] saveDroppedImages failed', e);
    }
  }

  function restoreDroppedImages(canvas) {
    if (!canvas) return;
    var list = [];
    try {
      var raw = localStorage.getItem(droppedImagesStorageKey());
      list = raw ? JSON.parse(raw) : [];
    } catch (e) { list = []; }
    if (!Array.isArray(list) || list.length === 0) {
      // Still attach handles to any pre-existing .le-dropped-img elements
      // (e.g. inserted by other means) so they remain editable.
      $$('.le-dropped-img').forEach(function (el) {
        if (!el.classList.contains('resizable')) {
          el.setAttribute('data-le-keep-position', '1');
          try { attachHandle(el, 'wh'); } catch (e) {}
        }
      });
      return;
    }
    list.forEach(function (item) {
      if (!item || !item.src) return;
      // Skip if an element with the same dropId already exists (e.g. SSR / re-enable)
      if (item.id) {
        var existing = canvas.querySelector('.le-dropped-img[data-drop-id="' + item.id + '"]');
        if (existing) {
          if (!existing.classList.contains('resizable')) {
            existing.setAttribute('data-le-keep-position', '1');
            try { attachHandle(existing, 'wh'); } catch (e) {}
          }
          return;
        }
      }
      var wrap = buildDroppedWrapper(item.src, item.name, { label: item.label || '' });
      wrap.dataset.dropId = item.id || wrap.dataset.dropId;
      // Mike-2 修正B: 永続化された rename ラベルを復元
      if (item.label) wrap.dataset.leLabel = item.label;
      wrap.style.position = 'absolute';
      if (item.left)   wrap.style.left   = item.left;
      if (item.top)    wrap.style.top    = item.top;
      if (item.width)  wrap.style.width  = item.width;
      if (item.height) wrap.style.height = item.height;
      if (item.z)      wrap.style.zIndex = item.z;
      var tx = parseFloat(item.tx) || 0, ty = parseFloat(item.ty) || 0;
      if (tx || ty) {
        wrap._tx = tx; wrap._ty = ty;
        wrap.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)';
      }
      canvas.appendChild(wrap);
      try { attachHandle(wrap, 'wh'); } catch (e) {}
    });
    // Already-present .le-dropped-img elements without dropId metadata also need handles.
    $$('.le-dropped-img').forEach(function (el) {
      if (!el.classList.contains('resizable')) {
        el.setAttribute('data-le-keep-position', '1');
        try { attachHandle(el, 'wh'); } catch (e) {}
      }
    });
  }

  function enableImageDragDrop(canvas) {
    if (!canvas) return;

    // Oscar-2: ドロップロジックを直感的に再構築。
    //   - stage 外 (黒背景)        → 新規画像を canvas 中央に挿入
    //   - stage 内 / 選択要素 bbox 内 → 選択要素を差し替え
    //   - stage 内 / 選択要素 bbox 外 → 警告トースト「選択した画像の上にドロップ」
    //   - stage 内 / 選択なし        → 警告トースト「黒背景に新規 or 要素選択して差し替え」
    //   preferredTarget (要素一覧から選択した要素) も同じく bbox 判定の対象に含める
    //   (z-index 関係なく list 選択を優先)。Shift+drop の特別ロジックは廃止。
    function isInStage(clientX, clientY) {
      if (!canvas) return false;
      var r = canvas.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right
          && clientY >= r.top && clientY <= r.bottom;
    }
    // 差し替えターゲット候補の取得: preferredTarget を最優先、その後 単一選択要素。
    function getReplaceCandidate() {
      if (state.preferredTarget) return state.preferredTarget;
      if (state.selectedElements && state.selectedElements.size === 1) {
        return state.selectedElements.values().next().value;
      }
      return null;
    }
    // 候補要素の bbox 内に座標があれば候補を返す。なければ null。
    function isInsideSelection(clientX, clientY) {
      var cand = getReplaceCandidate();
      if (!cand || typeof cand.getBoundingClientRect !== 'function') return null;
      var r = cand.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right
          && clientY >= r.top && clientY <= r.bottom) {
        return cand;
      }
      return null;
    }
    function dataTransferHasFiles(dt) {
      if (!dt) return false;
      var types = dt.types;
      if (!types) return false;
      if (types.indexOf) return types.indexOf('Files') >= 0;
      if (types.contains) return types.contains('Files');
      return false;
    }
    function clearDropzoneClasses() {
      document.body.classList.remove('le-dropzone-active');
      document.body.classList.remove('le-dropzone-replace');
      canvas.classList.remove('le-dropzone-active');
      canvas.classList.remove('le-dropzone-replace');
    }

    var dragover = function (e) {
      if (!dataTransferHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'copy'; } catch (err) {}
      var inStage = isInStage(e.clientX, e.clientY);
      if (!inStage) {
        // 黒背景 → 新規挿入ゾーン
        document.body.classList.add('le-dropzone-active');
        document.body.classList.remove('le-dropzone-replace');
        canvas.classList.remove('le-dropzone-active');
        canvas.classList.remove('le-dropzone-replace');
      } else {
        var target = isInsideSelection(e.clientX, e.clientY);
        if (target) {
          // 選択要素の bbox 内 → 差し替えゾーン
          document.body.classList.remove('le-dropzone-active');
          document.body.classList.add('le-dropzone-replace');
          canvas.classList.add('le-dropzone-replace');
          canvas.classList.remove('le-dropzone-active');
        } else {
          // stage 内かつ bbox 外 → 何もしない（drop 時に警告）
          clearDropzoneClasses();
        }
      }
    };
    var dragleave = function (e) {
      // ウィンドウ外に抜けた時に消す。要素間の遷移では消さない。
      var rt = e.relatedTarget;
      if (rt) return;
      clearDropzoneClasses();
    };
    var dragend = function () {
      clearDropzoneClasses();
    };
    var drop = function (e) {
      if (!dataTransferHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      clearDropzoneClasses();

      var rawFiles = (e.dataTransfer && e.dataTransfer.files) ? Array.from(e.dataTransfer.files) : [];
      var images = rawFiles.filter(function (f) { return f && f.type && f.type.indexOf('image/') === 0; });
      if (images.length === 0) {
        showToast('画像ファイルではありません', 'error');
        return;
      }
      // SVG XSS risk → exclude
      var svgCount = 0;
      var safe = images.filter(function (f) {
        if (f.type.indexOf('svg') >= 0) { svgCount++; return false; }
        return true;
      });
      if (svgCount > 0) {
        console.warn('[LayoutEditor] SVG はセキュリティ上スキップされます (' + svgCount + ' 件)');
        showToast('SVG は安全のため除外しました', 'error');
      }
      // Size cap — warn but allow up to MAX. Skip ones over.
      var oversize = 0;
      safe = safe.filter(function (f) {
        if (f.size > DROP_MAX_BYTES) { oversize++; return false; }
        return true;
      });
      if (oversize > 0) {
        showToast('10MB 超の画像はスキップ (' + oversize + ' 件)', 'error');
      }
      if (safe.length === 0) return;

      var inStage = isInStage(e.clientX, e.clientY);
      var cr = canvas.getBoundingClientRect();
      var centerX = cr.left + cr.width / 2;
      var centerY = cr.top + cr.height / 2;

      // ---- ケース1: 黒背景 (stage 外) → 新規挿入 (canvas 中央, 複数は少しずらす) ----
      if (!inStage) {
        safe.reduce(function (chain, file, i) {
          return chain.then(function () {
            return readAndResizeImage(file).then(function (result) {
              if (result.resized) {
                showToast('画像を ' + result.width + '×' + result.height + ' に縮小しました');
              }
              var ox = centerX + i * 18;
              var oy = centerY + i * 18;
              insertNewImageLayer(canvas, ox, oy, result.dataUrl, file.name);
              if (i === safe.length - 1 && !result.resized) {
                showToast('画像を ' + safe.length + '枚 新規挿入しました（Ctrl+Z で戻せます）', 'success');
              }
            }).catch(function (err) {
              console.warn('[LayoutEditor] readAndResizeImage failed', err);
              showToast('画像の読み込みに失敗', 'error');
            });
          });
        }, Promise.resolve());
        return;
      }

      // ---- ケース2: stage 内 ----
      var target = isInsideSelection(e.clientX, e.clientY);
      if (!target) {
        var cand = getReplaceCandidate();
        if (cand) {
          showToast('差し替える場合は、選択した画像の上にドロップしてください', 'warn');
        } else {
          showToast('新規追加は黒い背景にドロップ、差し替えは要素を選択してから', 'warn');
        }
        return;
      }

      // ---- ケース3: 選択要素の bbox 内 → 差し替え (1 ファイル目のみ) ----
      safe.reduce(function (chain, file, i) {
        return chain.then(function () {
          return readAndResizeImage(file).then(function (result) {
            var dataUrl = result.dataUrl;
            if (result.resized) {
              showToast('画像を ' + result.width + '×' + result.height + ' に縮小しました');
            }
            if (i === 0) {
              var swapResult = replaceImageSrc(target, dataUrl);
              if (swapResult !== null && swapResult !== undefined && swapResult !== false) {
                if (!result.resized) {
                  if (swapResult === 'bg') {
                    showToast('背景画像を差し替えました（Ctrl+Z で戻せます）', 'success');
                  } else {
                    showToast('画像を差し替えました（Ctrl+Z で戻せます）', 'success');
                  }
                }
                scheduleDirtyUpdate();
                return;
              }
              // 差し替え不能 → 警告のみ (新規にはフォールバックせず、ユーザー意図を尊重)
              showToast('差し替え対象が見つかりません（img / 背景画像 / 単一内側img の要素を選択してください）', 'warn');
              return;
            }
            // 2 枚目以降: 差し替えは 1 枚目のみなので、追加分は警告のみ
            if (i === 1) {
              showToast('差し替えは 1 枚目のみ。追加分はスキップしました', 'warn');
            }
          }).catch(function (err) {
            console.warn('[LayoutEditor] readAndResizeImage failed', err);
            showToast('画像の読み込みに失敗', 'error');
          });
        });
      }, Promise.resolve());
    };

    // dragover/drop は document に張る。stage 内ガードは isInStage で判定。
    addManagedListener(document, 'dragover', dragover);
    addManagedListener(document, 'dragleave', dragleave);
    addManagedListener(document, 'dragend', dragend);
    addManagedListener(document, 'drop', drop);

    // Persist position/size changes on dropped images (debounced) so reload
    // restores the latest geometry. Uses the editor's own event bus.
    var debouncedSave = debounce(saveDroppedImages, 200);
    var onTransform = function () {
      // Only save if at least one selected/edited element is a dropped image.
      var hit = false;
      try {
        if (state.selectedElements && state.selectedElements.size) {
          state.selectedElements.forEach(function (el) {
            if (el && el.classList && el.classList.contains('le-dropped-img')) hit = true;
          });
        }
      } catch (e) {}
      if (hit) debouncedSave();
    };
    on('transform', onTransform);
    registerCleanup(function () { off('transform', onTransform); });
  }

  // ====================================================================
  //  Public API: enable / disable
  // ====================================================================

  function enable(config) {
    if (state.enabled) return;
    config = config || {};
    state.config = config;
    state.canvasEl = (typeof config.canvas === 'string')
      ? document.querySelector(config.canvas)
      : (config.canvas || $('#stage') || document.body);
    state.spec = normalizeSpec(config.editableSelectors || []);
    state.selectedElements = new Set();
    state.locked = new Set();
    state.unlinkedChildren = new Set(); // Papa-2 修正2
    state.history = [];
    state.future = [];
    state.cleanupFns = [];          // C1: reset cleanup registry per session
    state.originalCanvasWidth = null;
    state.multiSelectMode = false;

    document.body.classList.add(EDIT_MODE_BODY_CLASS, 'resize-mode');

    buildToolbar();
    buildNumericPanel();
    buildElementListPanel();
    setupRulers();
    ensureAnnoLayer();
    attachUserboxDraw();
    attachKeyboard();
    attachZoomShortcuts();
    attachStackPierceAndMarquee();
    attachBackgroundClickClear();
    wireEditableTexts();

    // Attach handles to all spec-matched elements
    state.spec.forEach(function (entry) {
      var sel = entry[0], axes = entry[1];
      $$(sel).forEach(function (el) { attachHandle(el, axes); });
    });

    // Restore previously-dropped images (data URLs persisted in localStorage)
    // and enable OS file drag&drop onto the canvas.
    try { restoreDroppedImages(state.canvasEl); } catch (e) { console.warn('[LayoutEditor] restoreDroppedImages failed', e); }
    try { enableImageDragDrop(state.canvasEl); } catch (e) { console.warn('[LayoutEditor] enableImageDragDrop failed', e); }
    // India-2: テキスト追加ツール — 永続化済みテキストを復元 + tool を canvas にアタッチ
    try { restoreAddedTexts(state.canvasEl); } catch (e) { console.warn('[LayoutEditor] restoreAddedTexts failed', e); }
    try { attachTextTool(state.canvasEl); } catch (e) { console.warn('[LayoutEditor] attachTextTool failed', e); }

    // Pull saved data + restore extras
    var serverData = window._currentLayoutData || null;
    var local = localLoad();
    var initialData = serverData || local;
    if (initialData) {
      // Re-apply (applier already did basic apply, but we want extras like __locked, __zoom, etc.)
      try { applySavedData(initialData); } catch (e) { console.warn('[LayoutEditor] applySavedData failed', e); }
    }
    state.lastSavedJson = JSON.stringify(snapshot());

    state.enabled = true;
    adjustRulerPos();
    refreshLockBadges();
    refreshElementList();
    updateNumericPanel();
    refreshTopToolbarAlign();

    // R1: restore persisted element list panel open/closed state. Default = closed.
    try {
      var savedOpen = localStorage.getItem('pono_layout_panel_open');
      if (state.listPanelEl && savedOpen === '1') {
        state.listPanelEl.classList.add('open');
      }
    } catch (e) {}

    // Setup ResizeObserver to redraw anno svg when stage size changes (C1: trackable)
    if (window.ResizeObserver && state.canvasEl) {
      try {
        var ro = new ResizeObserver(debounce(resizeAnnoSvg, 100));
        ro.observe(state.canvasEl);
        state.resizeObserver = ro;
        registerCleanup(function () {
          try { ro.disconnect(); } catch (e) {}
        });
      } catch (e) {}
    }

    showToast('編集モード ON');
    emit('ready');
    emit('mode', 'edit');
  }

  function disable() {
    if (!state.enabled) return;
    // C1+R3: tidy preview + comparison side-mode before tearing down DOM
    if (document.body.classList.contains('preview-mode')) {
      try { exitPreview(); } catch (e) {}
    }
    if (state.comparison && state.comparison.active) {
      try { hideComparison(); } catch (e) {}
    } else if (state.originalCanvasWidth !== null && state.canvasEl) {
      // Defensive: if originalCanvasWidth was captured but never restored
      state.canvasEl.style.width = state.originalCanvasWidth;
      state.originalCanvasWidth = null;
    }
    document.body.classList.remove(EDIT_MODE_BODY_CLASS, 'resize-mode', 'anno-mode', 'draw-mode',
                                    'eraser-mode', 'has-selection', 'preview-mode', 'layout-comparison-on');
    // Remove handles + size labels but KEEP applied styles
    $$('.resize-handle, .resize-size-label').forEach(function (el) { el.remove(); });
    $$('.resizable').forEach(function (el) {
      el.classList.remove('resizable', 'selected', 'edge-linked', 'le-locked', 'le-preferred', 'le-pointer-suppressed');
      delete el._resizeUpdateLabel;
    });
    $$('.le-lock-badge').forEach(function (b) { b.remove(); });
    if (state.toolbarEl) state.toolbarEl.remove();
    if (state.numericPanelEl) state.numericPanelEl.remove();
    if (state.listPanelEl) state.listPanelEl.remove();
    if (state.rulerH) state.rulerH.remove();
    if (state.rulerV) state.rulerV.remove();
    if (state.helpModalEl) state.helpModalEl.remove();
    closePagesDropdown();
    if (state.previewExitBtn) { state.previewExitBtn.remove(); state.previewExitBtn = null; }
    var ctxMenu = $('#le-context-menu');
    if (ctxMenu) ctxMenu.remove();
    $$('.le-guide').forEach(function (g) { g.remove(); });
    $$('.le-toast').forEach(function (t) { t.remove(); });
    $$('.le-comparison-overlay').forEach(function (c) { c.remove(); });
    if (state.zoomWrapEl) {
      // unwrap stage
      var stage = state.canvasEl;
      var wrap = state.zoomWrapEl;
      if (stage && wrap.parentNode) {
        wrap.parentNode.insertBefore(stage, wrap);
        stage.style.transform = '';
        wrap.remove();
      }
      state.zoomWrapEl = null;
    }
    if (state.annoLayer) {
      // Note: we keep anno data on the stage so ?edit=1 next time still has it.
      // But annotations live in saved-layout via special future schema; for now leave them.
    }
    // C1: run all registered cleanup callbacks (listeners + observers)
    if (state.cleanupFns && state.cleanupFns.length) {
      state.cleanupFns.slice().forEach(function (fn) { try { fn(); } catch (e) {} });
      state.cleanupFns = [];
    }
    if (state.resizeObserver) {
      try { state.resizeObserver.disconnect(); } catch (e) {}
      state.resizeObserver = null;
    }
    state.enabled = false;
    state.toolbarEl = null;
    state.numericPanelEl = null;
    state.listPanelEl = null;
    state.rulerH = null;
    state.rulerV = null;
    state.aspectLocked = false;
    state.aspectRatios = null;
    // Charlie-2: editor disable で preferredTarget もリセット
    state.preferredTarget = null;
    $$('.le-preferred').forEach(function (e) { e.classList.remove('le-preferred'); });
    // Echo-2: pointer-events 抑止クラスも cleanup
    document.querySelectorAll('.le-pointer-suppressed').forEach(function (e) {
      e.classList.remove('le-pointer-suppressed');
    });
    // India-2: テキスト追加ツールも cleanup
    state.textToolOn = false;
    document.body.classList.remove('le-text-tool-active');
    emit('mode', 'play');
  }

  function normalizeSpec(spec) {
    if (!Array.isArray(spec)) return [];
    return spec.map(function (entry) {
      if (typeof entry === 'string') return [entry, 'wh', entry];
      if (Array.isArray(entry)) {
        return [entry[0], entry[1] || 'wh', entry[2] || entry[0]];
      }
      if (entry && typeof entry === 'object') {
        return [entry.selector, entry.axes || 'wh', entry.label || entry.selector];
      }
      return null;
    }).filter(Boolean);
  }

  function setTool(tool) { state.activeTool = tool; emit('tool', tool); }

  // ====================================================================
  //  Export
  // ====================================================================

  window.LayoutEditor = {
    __full: true,
    version: VERSION,
    enable: enable,
    disable: disable,
    get isEnabled() { return state.enabled; },
    on: on, off: off, emit: emit,
    save: save,
    revert: revert,
    reset: reset,
    snapshot: snapshot,
    undo: undo,
    redo: redo,
    setTool: setTool,
    setZoom: setZoom,
    toggleComparison: toggleComparison,
    toggleGrid: toggleGrid,
    // Test/diagnostic accessors
    _state: state,
    _spec: function () { return state.spec.slice(); },
  };
})();
