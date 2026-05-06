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
   * chip preset を 4 slot 別に正規化。
   *   入力: { withImage: {...}, textOnly: {...} }
   *   - 各 type について "0" キーが既に有れば 4-slot 形式とみなしそのまま (参照を共有)
   *   - "0" キーが無く chip|circle|illust|label|countNum のいずれかがトップに直接ある
   *     → フラット形式とみなし JSON.parse(JSON.stringify(typeObj)) で 4 slot 分 deep clone
   *   2026-05-07 追加: フラット形式 saved-layout.json との後方互換。
   *   2026-05-07 修正 (HIGH): **常に新しいオブジェクトを返し、 入力 `presets` は mutate しない**
   *   純粋関数化。 表示パス (updateNumericPanel) で in-memory データが書き換わるバグを回避。
   *   呼び出し側は戻り値を再代入することで反映される。
   */
  function _normalizeChipPresets(presets) {
    if (!presets || typeof presets !== 'object') return presets || {};
    var FLAT_KEYS = ['chip', 'circle', 'illust', 'label', 'countNum'];
    var SLOTS = ['0', '1', '2', '3'];
    var out = {};
    Object.keys(presets).forEach(function (type) {
      var typeObj = presets[type];
      if (!typeObj || typeof typeObj !== 'object') { out[type] = typeObj; return; }
      // 既に 4-slot 形式 ("0" キー有り) なら参照そのまま (中身は触らない)
      if (typeObj.hasOwnProperty('0')) { out[type] = typeObj; return; }
      // フラット形式かどうか判定 (FLAT_KEYS のいずれかをトップに直接持つ)
      var isFlat = false;
      for (var i = 0; i < FLAT_KEYS.length; i++) {
        if (typeObj.hasOwnProperty(FLAT_KEYS[i])) { isFlat = true; break; }
      }
      if (!isFlat) { out[type] = typeObj; return; }
      // フラット → 4 slot に展開 (deep clone)
      var newObj = {};
      SLOTS.forEach(function (s) {
        newObj[s] = JSON.parse(JSON.stringify(typeObj));
      });
      out[type] = newObj;
    });
    return out;
  }

  /**
   * chip preset を適用。 saved-layout.json の __chip_presets (4-slot 形式):
   *   { withImage: {
   *       "0": { chip:{w,h}, circle:{w,h,tx,ty}, illust:{...}, label:{...} },
   *       "1": {...}, "2": {...}, "3": {...}
   *     },
   *     textOnly:  { "0": {...}, "1": {...}, "2": {...}, "3": {...} } }
   *
   * chip の class (.chip-type-with-image / .chip-type-text-only) で種別判定し、
   * data-idx (0..3) と一致する slot 内の preset を子要素に applyOne する。
   * 2026-05-07: 4 slot 別に拡張。 各 chip ごとに別位置を保存できる。
   * 旧フラット形式は _normalizeChipPresets が読込時に 4 slot 全部に deep clone する。
   * preset.chip は w/h に加え tx/ty を持てる (2026-05-07 v784 拡張)。
   *   - 旧形式 (w/h のみ) との互換: tx/ty が undefined の場合は適用しない (既存 transform 維持)。
   *   - 新形式 (tx/ty あり) では preset.chip が chip の絶対位置の真実となり、
   *     editor 側で対応する .chip|N 個別 entry が削除される (saveChipPreset)。
   */
  function applyChipPresets(presets, root) {
    if (!presets || typeof presets !== 'object') return;
    presets = _normalizeChipPresets(presets);
    var doc = root || document;
    var chips = safeQueryAll(doc, '.chip');
    for (var i = 0; i < chips.length; i++) {
      var chip = chips[i];
      var type = chip.classList.contains('chip-type-with-image') ? 'withImage' :
                 chip.classList.contains('chip-type-text-only')  ? 'textOnly'  : null;
      if (!type) continue;
      var preset = presets[type];
      if (!preset) continue;
      var slot = i; // querySelectorAll('.chip') の取得順 = data-idx = slot index (0..3)
      var slotPreset = preset[String(slot)];
      if (!slotPreset) continue;
      if (slotPreset.chip) {
        // preset.chip は w/h に加え tx/ty も適用 (新形式)。
        // 旧形式 (tx/ty 無し) では 'tx'/'ty' キーを s に含めないことで applyOne の
        // 既存 transform 維持分岐に入る (= 急に位置が飛ばない)。
        var chipStyle = { w: slotPreset.chip.w || '', h: slotPreset.chip.h || '' };
        if ('tx' in slotPreset.chip || 'ty' in slotPreset.chip) {
          chipStyle.tx = slotPreset.chip.tx || 0;
          chipStyle.ty = slotPreset.chip.ty || 0;
        }
        applyOne(chip, chipStyle);
      }
      if (slotPreset.circle) {
        var c = chip.querySelector('.circle');
        if (c) applyOne(c, slotPreset.circle);
      }
      if (slotPreset.illust) {
        var im = chip.querySelector('.chip-illust');
        if (im) applyOne(im, slotPreset.illust);
      }
      if (slotPreset.label) {
        var lb = chip.querySelector('.chip-label');
        if (lb) applyOne(lb, slotPreset.label);
      }
      if (slotPreset.countNum) {
        var n = chip.querySelector('.chip-count-num');
        if (n) applyOne(n, slotPreset.countNum);
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
    _normalizeChipPresets: _normalizeChipPresets,
    version: '1.0.0',
  };
})();
