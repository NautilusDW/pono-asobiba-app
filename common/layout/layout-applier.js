// layout-applier.js — render-only module (Phase A).
// Public API: window.LayoutApplier
//
// Responsibilities:
//   - Fetch saved-layout.json (cache-busted, no-store).
//   - Apply per-element { w, h, tx, ty } to selectors (idempotent).
//   - Restore __headerH (CSS variable on <html>).
//   - Restore __hidden (apply `.user-hidden`).
//   - Restore __texts (only on `.editable-text`, safe-by-default).
//   - Restore __userboxes (read-only DOM placeholders).
//
// Editor / drag / resize / save lives in layout-editor.js (lazy-loaded).
//
// Source: extracted from
//   quizland/index.html (qzApplySavedLayout)
//   quizland/preview/full/index.html (loadResizeState, restoreUserboxes, applyHidden)

(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.LayoutApplier) return; // idempotent module load

  var SHARED_CSS_HREF_HINT = 'layout-shared.css';
  var SHARED_STYLE_FLAG = 'data-layout-shared-injected';

  // ---- helpers --------------------------------------------------------
  function safeQueryAll(root, sel) {
    try { return (root || document).querySelectorAll(sel); }
    catch (e) { return []; }
  }

  function applyOne(el, s) {
    if (!el || !s) return;
    if (s.w) el.style.width = s.w;
    if (s.h) el.style.height = s.h;
    // 'tx'/'ty' が s に含まれていれば必ず書く (= リセット tx=0,ty=0 でも前回の transform を消す)。
    // 含まれていなければ transform は touch しない (caller が w/h だけ渡すケースに配慮)。
    // 2026-05-06: chip preset のリセット時に古い transform が残るバグを修正。
    if (('tx' in s) || ('ty' in s)) {
      var tx = s.tx || 0, ty = s.ty || 0;
      el._tx = tx;
      el._ty = ty;
      el.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)';
    }
  }

  // Normalize editableSelectors: accept ['sel', 'axes', 'label'] tuples or plain
  // string selectors. We only care about the selector for read-only apply.
  function normalizeSelectors(spec) {
    if (!Array.isArray(spec)) return [];
    return spec.map(function (entry) {
      if (typeof entry === 'string') return entry;
      if (Array.isArray(entry) && typeof entry[0] === 'string') return entry[0];
      if (entry && typeof entry.selector === 'string') return entry.selector;
      return null;
    }).filter(Boolean);
  }

  /**
   * chip preset を適用。 saved-layout.json の __chip_presets:
   *   { withImage: { chip:{w,h,tx,ty}, circle:{...}, illust:{...}, label:{...} },
   *     textOnly:  { chip:{...}, label:{...}, countNum:{...} } }
   *
   * chip の class (.chip-type-with-image / .chip-type-text-only) で種別判定し、
   * preset の各キーを対応する子要素に applyOne する。
   * 個別 chip|N エントリは後段の selectors loop で同要素に再適用され上書き勝ち。
   */
  function applyChipPresets(presets, root) {
    if (!presets || typeof presets !== 'object') return;
    var doc = root || document;
    var chips = safeQueryAll(doc, '.chip');
    for (var i = 0; i < chips.length; i++) {
      var chip = chips[i];
      var type = chip.classList.contains('chip-type-with-image') ? 'withImage' :
                 chip.classList.contains('chip-type-text-only')  ? 'textOnly'  : null;
      if (!type) continue;
      var preset = presets[type];
      if (!preset) continue;
      if (preset.chip)     applyOne(chip, preset.chip);
      if (preset.circle) {
        var c = chip.querySelector('.circle');
        if (c) applyOne(c, preset.circle);
      }
      if (preset.illust) {
        var im = chip.querySelector('.chip-illust');
        if (im) applyOne(im, preset.illust);
      }
      if (preset.label) {
        var lb = chip.querySelector('.chip-label');
        if (lb) applyOne(lb, preset.label);
      }
      if (preset.countNum) {
        var n = chip.querySelector('.chip-count-num');
        if (n) applyOne(n, preset.countNum);
      }
    }
  }

  // ---- public API -----------------------------------------------------

  /**
   * fetch(url, opts) → Promise<LayoutData|null>
   * Resilient: 404, network error, malformed JSON → resolve(null), never throws.
   */
  function fetchLayout(url, opts) {
    if (!url) return Promise.resolve(null);
    var bust = (opts && opts.cacheBust !== false)
      ? (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now()
      : '';
    return fetch(url + bust, { cache: 'no-store' })
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .catch(function (e) {
        console.warn('[LayoutApplier] fetch failed:', url, e);
        return null;
      });
  }

  /**
   * apply(data, scopeRoot, cfg) — idempotent.
   * cfg: { selectors: Array<string|tuple>, hideClass?: string, headerHVar?: string }
   * Calling multiple times produces same result.
   * scopeRoot can be a sub-tree (used by renderChoices to re-apply chip layout).
   */
  function apply(data, scopeRoot, cfg) {
    if (!data) return;
    cfg = cfg || {};
    var selectors = normalizeSelectors(cfg.selectors || cfg.editableSelectors || []);
    var root = scopeRoot || document;

    // 1a) chip preset 適用 — chip 種別 (.chip-type-with-image / .chip-type-text-only)
    //     ごとにデフォルト位置・サイズを当てる。 個別 chip|N エントリは後段で上書き。
    //     2026-05-06 追加: テキストのみ chip と画像付き chip で 2 種類のテンプレート保存。
    if (data.__chip_presets) {
      applyChipPresets(data.__chip_presets, root);
    }

    // 1b) per-element w/h/tx/ty (個別エントリは preset を上書きする)
    selectors.forEach(function (sel) {
      var list = safeQueryAll(root, sel);
      for (var i = 0; i < list.length; i++) {
        var key = sel + '|' + i;
        var s = data[key];
        if (s) applyOne(list[i], s);
      }
    });

    // 2) globals — only when applying to whole document (not sub-tree)
    if (!scopeRoot) {
      applyHeaderH(data, cfg);
      applyHidden(data, document, cfg.hideClass || 'user-hidden');
      applyTexts(data, document);
      applyUserboxes(data, document);
    }
  }

  /**
   * applyHidden(data, scope, hideClass)
   * Reads `data.__hidden` (array of "<selector>|<index>") and adds the class
   * to matching elements. Idempotent (classList.add is a no-op if present).
   */
  function applyHidden(data, scope, hideClass) {
    if (!data || !Array.isArray(data.__hidden)) return;
    var cls = hideClass || 'user-hidden';
    var doc = scope || document;
    data.__hidden.forEach(function (key) {
      var m = key && key.match(/^(.+)\|(\d+)$/);
      if (!m) return;
      var all = safeQueryAll(doc, m[1]);
      var el = all[parseInt(m[2], 10)];
      if (el) el.classList.add(cls);
    });
  }

  /**
   * applyTexts(data, scope)
   * SAFE-BY-DEFAULT: only applies to elements that opted in via class="editable-text".
   * Uses DOM-path keys (matching preview/full's collectEditableTexts schema).
   */
  function applyTexts(data, scope) {
    if (!data || !data.__texts) return;
    var texts = data.__texts;
    var doc = scope || document;
    var nodes = safeQueryAll(doc, '.editable-text');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var path = getDomPath(el);
      if (texts[path] !== undefined) {
        el.textContent = texts[path];
      }
    }
  }

  // Mirror of preview/full's getDomPath (kept identical so __texts keys match)
  var TRANSIENT_CLASSES_FOR_PATH = { 'resizable': 1, 'selected': 1, 'edge-linked': 1, 'user-hidden': 1 };
  function getDomPath(el) {
    var parts = [];
    var cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body) {
      var s = cur.tagName.toLowerCase();
      if (cur.id) { s += '#' + cur.id; parts.unshift(s); break; }
      if (cur.className && typeof cur.className === 'string') {
        var cls = cur.className.trim().split(/\s+/).filter(function (c) {
          return c && !TRANSIENT_CLASSES_FOR_PATH[c];
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

  /**
   * applyHeaderH(data, cfg)
   * Sets `--header-h` CSS variable on documentElement.
   */
  function applyHeaderH(data, cfg) {
    if (!data || !data.__headerH) return;
    var varName = (cfg && cfg.headerHVar) || '--header-h';
    document.documentElement.style.setProperty(varName, data.__headerH);
  }

  /**
   * applyUserboxes(data, scope)
   * Read-only restoration: removes existing .userbox children inside scope,
   * recreates from data.__userboxes. No badges/handles attached (those belong
   * to the editor). Idempotent.
   */
  function applyUserboxes(data, scope) {
    if (!data || !Array.isArray(data.__userboxes)) return;
    var doc = scope || document;
    var existing = safeQueryAll(doc, '.userbox');
    for (var i = 0; i < existing.length; i++) existing[i].remove();
    var host = doc.querySelector('#safe-area') || doc.querySelector('#stage') || doc.body;
    if (!host) return;
    data.__userboxes.forEach(function (box) {
      if (!box) return;
      var div = document.createElement('div');
      div.className = 'userbox';
      if (box.id) div.dataset.userboxId = box.id;
      if (box.label) div.dataset.userboxLabel = box.label;
      if (box.bgImage) {
        div.dataset.bgImage = box.bgImage;
        div.style.backgroundImage = 'url("' + box.bgImage + '")';
        div.style.backgroundSize = 'contain';
        div.style.backgroundRepeat = 'no-repeat';
        div.style.backgroundPosition = 'center';
      }
      if (box.left) div.style.left = box.left;
      if (box.top)  div.style.top  = box.top;
      if (box.w) div.style.width  = box.w;
      if (box.h) div.style.height = box.h;
      var tx = box.tx || 0, ty = box.ty || 0;
      if (tx || ty) {
        div._tx = tx; div._ty = ty;
        div.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)';
      }
      // Optional badge (shown only when body.layout-editor-on; CSS handles hide)
      if (box.label) {
        var badge = document.createElement('div');
        badge.className = 'userbox-badge';
        badge.textContent = box.label;
        div.appendChild(badge);
      }
      host.appendChild(div);
    });
  }

  /**
   * injectSharedStyles() — idempotent.
   * Ensures layout-shared.css is loaded. If a <link rel="stylesheet"> with
   * "layout-shared.css" in the href already exists, do nothing. Otherwise
   * try to inject one relative to the LayoutSystem script src.
   */
  function injectSharedStyles() {
    // 1) already linked?
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('href') && links[i].getAttribute('href').indexOf(SHARED_CSS_HREF_HINT) >= 0) {
        return;
      }
    }
    // 2) flag-based guard (prevents double inject if same module reloaded)
    if (document.head && document.head.getAttribute(SHARED_STYLE_FLAG)) return;

    var base = resolveSiblingScriptBase();
    if (!base) return; // can't resolve base; page should <link> shared CSS manually
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = base + 'layout-shared.css';
    document.head.appendChild(link);
    document.head.setAttribute(SHARED_STYLE_FLAG, '1');
  }

  // Resolves the directory of the layout-system.js script (or layout-applier.js
  // if loaded standalone). Returns e.g. "/common/layout/" with trailing slash.
  function resolveSiblingScriptBase() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      if (!src) continue;
      var m = src.match(/^(.*\/)layout-(?:system|applier)\.js(?:\?.*)?$/);
      if (m) return m[1];
    }
    return null;
  }

  // ---- export ---------------------------------------------------------
  window.LayoutApplier = {
    fetch: fetchLayout,
    apply: apply,
    applyHidden: applyHidden,
    applyTexts: applyTexts,
    applyHeaderH: applyHeaderH,
    applyUserboxes: applyUserboxes,
    injectSharedStyles: injectSharedStyles,
    _resolveSiblingScriptBase: resolveSiblingScriptBase,
    version: '1.0.0',
  };
})();
