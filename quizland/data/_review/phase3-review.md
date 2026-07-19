# Phase 3 Review

## Overall verdict
- 🟢 採用可 (no behavioral regression detected; minor advisory deltas listed under "Recommended deltas")

## 1. Functional equivalence
Comparing the new applier against the legacy inline `qzApplySavedLayout` (`quizland/index.html` HEAD~1, lines 1178-1240) and `loadResizeState` in `quizland/preview/full/index.html`:

- **`tx/ty` → `transform: translate()`**: matches.
  - Legacy: `quizland/index.html@HEAD~1:1182-1188` `el.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)'`
  - New: `common/layout/layout-applier.js:36-41` identical formula and zero-skip guard.
- **`w/h` → `width/height` (px units preserved as-is from JSON string)**: matches.
  - Legacy: `quizland/index.html@HEAD~1:1180-1181` (`if (s.w) el.style.width = s.w`)
  - New: `common/layout/layout-applier.js:34-35` identical.
- **`__headerH` → `--header-h` CSS var on `<html>`**: matches.
  - Legacy: `quizland/index.html@HEAD~1:1203-1205` and preview/full L2454.
  - New: `common/layout/layout-applier.js:172-176` (default var name `--header-h`, configurable via `cfg.headerHVar`).
- **`__hidden` → `.user-hidden` class via `classList.add`**: matches.
  - Legacy: `quizland/index.html@HEAD~1:1207-1215` and preview/full L2299-2305.
  - New: `common/layout/layout-applier.js:111-122` identical regex `^(.+)\|(\d+)$` + `classList.add(cls)`.
- **`__userboxes`**: new functionality — quizland legacy did NOT restore userboxes (pre-extraction quizland was simply unaware of the field). Comparing against the canonical preview/full `restoreUserboxes`+`createUserbox` (preview/full L3122-3204): the new `applyUserboxes` (`layout-applier.js:184-222`) preserves the read-only subset (id, label, bgImage, left/top/w/h, tx/ty) and intentionally drops editor-only chrome (`userbox-del`, `attachHandle`, contentEditable badge). Architecture doc §11.1 explicitly endorses this read-only stance. Userbox badge is created but hidden in play mode by `layout-shared.css:32` (`body:not(.layout-editor-on) .userbox-badge { display: none }`). **Additive change, not a regression**; quizland's saved-layout.json has no `__userboxes` so this is a no-op for the current page.
- **`__texts` only on `.editable-text`** (safe-by-default per arch §11.1): verified.
  - `layout-applier.js:129-141` selects only `.editable-text` nodes.
  - `getDomPath` (`layout-applier.js:145-166`) mirrors `quizland/preview/full/index.html:2237-2256` — same key shape (`tagName(#id|.cls):nth-of-type(N)>...`), same transient class skip (with `resizable`, `selected`, `edge-linked`, `user-hidden` excluded; legacy excludes a wider set incl. `editable-text`/`anno-mode`/etc., but for play-mode round-trip with no editor classes ever present, the result is identical).
- **Re-apply on dynamic insert**: `quizland/index.html:1485-1491` calls `LayoutApplier.apply(window._currentLayoutData, document.getElementById('answer-panel'), { selectors: QZ_RESIZABLE_SELECTORS })` after `renderChoices` builds new `.chip`/`.chip .circle` nodes. Equivalent to legacy `qzApplySavedLayout(document.getElementById('answer-panel'))` (HEAD~1:1534). Scope-root indexing matches (`#answer-panel` contains exactly 4 `.chip` elements, indices 0..3 → keys `.chip|0..3`).
- **Belt-and-suspenders MutationObserver**: `layout-system.js:173-183` debounces 250ms (matches arch doc §11 risk #4) and re-runs `apply(currentData, canvasEl, applyCfg)` on any childList add. Provides safety net for any other dynamic injection paths.

**Subtle differences (all benign)**:
- Legacy `qzApplySavedLayout(scopeRoot)` re-applied `__headerH` + `__hidden` even when called with a sub-tree scope. The new applier skips globals when `scopeRoot` is provided (`layout-applier.js:98`). Since both `classList.add` and `style.setProperty` of the same value are idempotent no-ops, end-state is identical, and the new path is a micro-optimization.
- Legacy did not handle `__texts`/`__userboxes` at all in `quizland/index.html`. New applier handles them only on full-document apply. quizland's current saved-layout has neither field populated meaningfully, so net effect = no-op (verified `quizland/preview/full/saved-layout.json` lines 1-10).

## 2. API conformance
`window.LayoutApplier` (`layout-applier.js:264-274`):
- `fetch` — `layout-applier.js:62-73` ✓
- `apply` — `layout-applier.js:81-104` ✓
- `applyHidden` — `layout-applier.js:111-122` ✓
- `applyTexts` — `layout-applier.js:129-141` ✓
- `applyHeaderH` — `layout-applier.js:172-176` ✓
- `applyUserboxes` — `layout-applier.js:184-222` ✓
- `injectSharedStyles` — `layout-applier.js:230-248` ✓

`window.LayoutSystem` (`layout-system.js:233-238`):
- `init` — `layout-system.js:105-171` returns Promise<{applier, editor, data}> ✓ (architecture doc says `{applier, editor?}`; the implementation returns a superset including `data`, which is harmless and useful)
- `loadEditor` — `layout-system.js:190-202` ✓
- `version` — `layout-system.js:237` ✓
- Bonus exports: `shouldEnableEditor` (helpful for tests).

## 3. Idempotency
- `apply(data, root)` twice → same result ✓
  - `applyOne` (`layout-applier.js:32-42`): width/height assignment is deterministic; transform string is the same on re-call (uses fresh `s.tx`/`s.ty` from data, not accumulating `el._tx`). Verified.
- `applyHidden` adds class once ✓ (`classList.add` is no-op when already present, line 120).
- `injectSharedStyles` doesn't double-inject ✓ — guarded by both link-href scan (line 232-237) and `data-layout-shared-injected` flag on `<head>` (line 239, 247).
- `applyUserboxes` removes existing `.userbox` children first then recreates (line 187-188) — full-reset idempotency. Calling twice yields same DOM.

## 4. Error resilience
- `fetch` returns null on 404/network error ✓ — `layout-applier.js:67-72`: `r.ok ? r.json() : null` and `.catch` returns null.
- `apply` with null data is no-op ✓ — `layout-applier.js:82` early return.
- Missing selectors silently skipped ✓ — `safeQueryAll` (lines 27-30) wraps `querySelectorAll` in try/catch and returns `[]` on invalid selectors. `applyOne` no-ops on missing element.
- Init-time errors caught ✓ — `layout-system.js:162-167` `.catch` invokes `onError` callback; never throws to caller.
- Editor lazy-load failure caught ✓ — `layout-system.js:194-195` per-resource `.catch` with `console.warn`, then `LayoutEditor.enable` invocation guarded by typeof check on line 197.

## 5. quizland migration
- inline removed: ✓ — `git show HEAD:quizland/index.html` no longer contains `qzApplySavedLayout`/`qzApplyOne`/`loadSavedLayout`/`injectHiddenStyle`. The 4 IIFEs/functions (~70 LOC) are gone.
- editableSelectors match: ✓ — `quizland/index.html:1153-1170` defines 16 entries; preview/full's `RESIZABLE_SPEC` at L2187-2206 has 17 entries (the extra one is `['.userbox', 'wh', 'カスタム枠']` at L2189). The omission in quizland is intentional — quizland has no userboxes; the remaining 16 entries match preview/full L2190-2206 byte-for-byte (selectors, axes, labels are identical including kanji/hiragana labels).
- ghPath set: ✓ — `quizland/index.html:1179` `'quizland/preview/full/saved-layout.json'`. (Note: ghPath is editor-only metadata; not used by applier — but correctly threaded through for Phase 4.)
- renderChoices re-apply: ✓ — `quizland/index.html:1485-1491`.

## 6. ?edit=1 lazy-load
- URL detection: ✓ — `layout-system.js:83-95` `shouldEnableEditor`. Default reads `?edit=1`. Configurable via `editorQueryParam`/`editorQueryValue`.
- Dynamic script/CSS injection: ✓ — `loadEditor` (`layout-system.js:190-202`) uses `loadCss` + `loadScript` Promise wrappers (lines 37-62). `loadScript` sets `s.async = false` to preserve evaluation order (line 41).
- Cache-buster: ✓ — `appendVersion` (line 204-208) appends `?v=1.0.0` to the editor URL. Same approach for `layout-applier.js` lazy-load fallback (line 109).
- Stub safety: `layout-editor.js:8-13` defines a no-op `LayoutEditor.enable` that just `console.info`s. Verified `?edit=1` will not crash.

## 7. sw.js
- 678 → 679: ✓ (verified `sw.js:4` `const CACHE_VERSION = 679;` and `git diff sw.js` confirms the bump).

## 8. Architecture compliance
- Files under `common/layout/` ✓
- Window globals (no ES module syntax) ✓ — `(function(){'use strict'; ...})()` IIFE in both modules; no `import`/`export` keywords.
- `defer` on `layout-system.js`: ✓ (`quizland/index.html:20`). Also on `layout-applier.js:19` (per arch doc, only system needs defer; explicitly loading both is consistent with implementer's deviation note #1 re: avoiding first-paint flicker).
- `applyOnDynamic: true` default with 250ms debounce: ✓ — `layout-system.js:18` `DEFAULT_DEBOUNCE_MS = 250`; `layout-system.js:145` (`config.applyOnDynamic !== false` enables observer by default).

## 9. Code quality
- No race conditions detected:
  - `SELF_SCRIPT` captured at top-level (`layout-system.js:23-29`) before any async — comment at line 21-22 calls this out explicitly. Good.
  - MutationObserver uses debounce, won't storm.
  - `loadScript` uses `async = false` to avoid out-of-order evaluation.
- No memory leaks detected:
  - MutationObserver attached once per `init` call. (Caveat: if `init` is called multiple times on the same page, multiple observers would attach — but that's an edge case; init is intended once-per-page.)
  - No detached DOM kept on `applyUserboxes` (line 188 removes existing children before recreating).
- Reasonable error handling: every async path has `.catch` with `console.warn` at minimum.
- Reasonable comments: heavy doc-comments at module top of `layout-applier.js` (lines 1-16) and `layout-system.js` (lines 1-10); each public function has a JSDoc-ish header. Good.
- No user-facing strings introduced at this phase; `console.info` from editor stub is dev-facing only ("editor TBD (Phase 4)") — acceptable.

## 10. Backward compat
- `quizland/preview/full/index.html` unchanged: ✓ (`git status` shows it un-modified; `git diff quizland/preview/full/index.html` is empty).
- `quizland/preview/full/saved-layout.json` unchanged: ✓ (same).
- `quizland/data/questions.js` unchanged: ✓ (same).

## Mental render trace
Walked through the 11-step boot sequence in the prompt:

1. HTML parser sees `<link rel="stylesheet" href="../common/layout/layout-shared.css">` (`quizland/index.html:18`). Loads in parallel.
2. `<script src="../common/layout/layout-applier.js" defer>` (line 19) and `<script src="../common/layout/layout-system.js" defer>` (line 20) — both queued for post-parse evaluation in document order.
3. Body parses; inline script at line 1172 runs synchronously: `if (window.LayoutSystem) boot()` — at this moment defer scripts have NOT executed yet (defer scripts run after parsing, before DOMContentLoaded), so `LayoutSystem` is undefined → falls into `document.readyState === 'loading'` branch → registers `DOMContentLoaded` listener.
4. Parsing completes. Defer queue runs in order:
   - `layout-applier.js` evaluates → `window.LayoutApplier` defined.
   - `layout-system.js` evaluates → `window.LayoutSystem` defined; `maybeAutoInit` runs but no `data-layout-url` is set, so no-op.
5. `DOMContentLoaded` fires → `boot()` calls `LayoutSystem.init({...})`.
6. `init` calls `injectSharedStyles` — finds existing `<link>` for `layout-shared.css` (step 1), no-op (line 232-237).
7. `applier.fetch('./preview/full/saved-layout.json')` → cache-busted GET → JSON.
8. `applier.apply(data, null, applyCfg)` → for each of 16 selectors, queryAll on document, applies w/h/tx/ty → `applyHeaderH`/`applyHidden`/`applyTexts`/`applyUserboxes`. `window._currentLayoutData = data`.
9. MutationObserver attached on `#stage` (line 173-183, observing `childList: true, subtree: true`).
10. URL has no `?edit=1` → editor not loaded.
11. Page renders identically to pre-extraction.

If `?edit=1` is set: step 10 swaps to `loadEditor` → fetches `layout-editor.js?v=1.0.0` + CSS → stub enables, logs `[LayoutEditor] editor TBD (Phase 4)`. No crash.

For dynamic chip render: when `loadQuestion` calls `renderChoices` (`quizland/index.html:1448-1492`), 4 `.chip` (and 4 `.circle`) are inserted. `LayoutApplier.apply(window._currentLayoutData, #answer-panel, {selectors})` runs on lines 1485-1491 (sync), AND MutationObserver fires after 250ms debounce (belt-and-suspenders). Both produce identical layout state.

**No step is broken.** Render trace passes.

## Issues found
- 🔵 Advisory: `applyOne` only writes `transform` if `tx || ty` is truthy. If a previous layout applied a non-zero translate and the new data has `tx=0, ty=0`, the existing transform on the element is NOT cleared (`el.style.transform` keeps stale value). Same as legacy preview/full L2447 — so this is not a regression. But for any future "re-apply against a different layout snapshot" use case (e.g., comparison mode in Phase D4), this would surprise. Not blocking Phase 3.
- 🔵 Advisory: `loadCss` exact-string `href` comparison (`layout-system.js:53`) compares the absolute resolved `link.href` to the input URL. Since the input is built from `siblingUrl` + `appendVersion`, the strings will likely match for the same script-relative load, but if a page hand-includes `layout-editor.css` with a different path/query, a duplicate `<link>` could be injected. Not relevant for Phase 3 (editor is stub); flag for Phase 4.
- 🔵 Advisory: `init` does not guard against multiple invocations. Calling `LayoutSystem.init()` twice would attach two MutationObservers on the same canvas. Not exercised currently — quizland calls once. Worth a `_initialized` guard in Phase 4.
- 🔵 Advisory: `apply()` when called with a sub-tree `scopeRoot` and a selector that doesn't intersect the sub-tree (e.g., `'.hdr-left'` queried inside `#answer-panel`) silently iterates an empty list — fine. But `data['.hdr-left|0']` is then never read on that scoped re-apply, and any saved entry for a pre-existing element OUTSIDE the scope is also not touched. This is correct/desired behavior, just confirming.

## Recommended deltas (if any)
None blocking. Optional polish for follow-up phases:
- (Phase 4) Add `_initialized` flag in `LayoutSystem.init` to make re-init a no-op or teardown-and-reinit.
- (Phase 4) When `applyOne` sees `tx=0, ty=0` but the element currently has a non-zero translate from a previous apply, optionally clear `el.style.transform` to allow comparison mode to roundtrip cleanly.
- (Phase 4) `loadCss` could compare normalized URLs (drop query) to avoid edge-case double-injection.
- (Phase A→B docs) Architecture §2 promises `init → Promise<{applier, editor?}>`; current return adds a `data` key. Consider documenting this as `{applier, editor?, data?}` in the README stub.
