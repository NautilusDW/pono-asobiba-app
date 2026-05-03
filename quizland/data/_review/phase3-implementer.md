# Phase A+B Implementer Report

## Files created

| Path | Lines | Role |
|---|---|---|
| `common/layout/layout-applier.js`  | 276 | Render-only module (fetch + apply w/h/tx/ty + headerH + hidden + texts + userboxes) |
| `common/layout/layout-system.js`   | 247 | Public entry; orchestrates fetch/apply, MutationObserver, lazy editor load |
| `common/layout/layout-editor.js`   | 16  | Stub for Phase 4 (defines `window.LayoutEditor.enable` no-op) |
| `common/layout/layout-editor.css`  | 2   | Empty stub (Phase 4) |
| `common/layout/layout-shared.css`  | 37  | `.user-hidden`, `.userbox`, `.userbox-badge` (under 50 lines as required) |
| `common/layout/README.md`          | 2   | Empty stub |

## Files modified

| Path | Diff | Notes |
|---|---|---|
| `quizland/index.html`  | +50 / -93 | Removed inline `qzApplySavedLayout`/`qzApplyOne`/`loadSavedLayout`/`injectHiddenStyle` IIFEs (~95 LOC). Added `<link>` + `<script>` for layout system in `<head>` (3 lines). Replaced inline applier with `LayoutSystem.init({...})` call. Replaced 1 call site inside `renderChoices` to use `LayoutApplier.apply(window._currentLayoutData, scopeRoot, {selectors})`. |
| `sw.js`                | +1 / -1 | `CACHE_VERSION` 678 → 679 |

## Self-verify results

1. **Inline JS syntax check (`new Function()`)** on `quizland/index.html`:
   `OK script block #1 (683 lines)` — sole inline `<script>` parses cleanly.
2. **Module syntax check** (`new Function()`):
   - `layout-applier.js`: OK 276 lines
   - `layout-system.js`:  OK 247 lines
   - `layout-editor.js`:  OK 16 lines
3. **Boot trace (mental)**:
   - `<head>`: linked `layout-shared.css` and `layout-applier.js`/`layout-system.js` (both `defer`).
   - HTML body parses; inline `<script>` at line ~1087 runs synchronously. The `initLayoutSystem` IIFE checks `window.LayoutSystem`; not yet loaded (defer fires after parse), so it queues `DOMContentLoaded` listener.
   - Parse completes → defer scripts run in order (`layout-applier.js` defines `window.LayoutApplier`; `layout-system.js` defines `window.LayoutSystem`).
   - `DOMContentLoaded` → `boot()` → `LayoutSystem.init({...})` → `injectSharedStyles()` (no-op since `<link>` already present) → `LayoutApplier.fetch('./preview/full/saved-layout.json')` → `apply(data, null, {selectors})` → cache to `window._currentLayoutData` → MutationObserver attached on `#stage`.
   - Effect: identical to legacy behavior — same selector array, same `tx/ty/w/h/__headerH/__hidden` semantics, same JSON URL.
4. **Editor mode (`?edit=1`)**: `shouldEnableEditor` returns `true` → `loadEditor` lazy-loads `layout-editor.js?v=1.0.0` + CSS → stub `window.LayoutEditor.enable(config)` runs, logs `[LayoutEditor] editor TBD (Phase 4)`. No crash.
5. **Dynamic chip re-apply**: `renderChoices` rebuilds `.chip`/`.chip .circle` nodes; the new code path calls `LayoutApplier.apply(window._currentLayoutData, scopeRoot, {selectors})` with the QZ selector list, equivalent to the legacy `qzApplySavedLayout(scopeRoot)`. The MutationObserver also debounce-fires (250 ms), providing a safety net if a caller forgets the explicit re-apply.

## Deviations from architecture doc

1. **Page authors include both `layout-applier.js` AND `layout-system.js`** rather than only `layout-system.js`. The doc shows a "2-line opt-in" with only the system script. I added both for clarity in this commit; `layout-system.js` also lazy-loads `layout-applier.js` as a fallback if the explicit `<script>` is omitted. Future Phase E can drop the explicit applier `<script>` once that fallback path is exercised in production.
   *Rationale*: explicit + early load avoids a race where `init()` async-loads the applier post-DOMContentLoaded and the page's first paint shows un-laid-out elements briefly.

2. **`layout-shared.css` `.userbox` is rendered with dashed transparent border (read-only style)** instead of preview/full's solid orange. Userboxes in play mode are reference frames only; full editor styling lives in `layout-editor.css` (Phase 4).
   *Rationale*: avoids visual clutter on production pages while preserving the data round-trip.

3. **No external `RESIZABLE_SPEC` JSON yet** (`data-spec` auto-init path). Implemented but untested in this commit; quizland passes its selector list inline. Will be revisited when `wordmatch`/`oto`/`bento` opt in (Phase F).

## Notes for reviewer

- **Idempotence**: `apply()` re-applies the same `tx/ty/w/h` deterministically. Calling it 3× in a row produces the same final transform string. `applyHidden` uses `classList.add` (idempotent). `applyUserboxes` removes existing `.userbox` children before recreating (full reset).
- **Safety on `__texts`**: per architecture doc §11 risk #1, only elements with `class="editable-text"` receive text overrides. Quizland currently has zero such elements, so `__texts` is effectively a no-op there — same as legacy.
- **Path resolution**: `siblingUrl()` derives the base directory from `document.currentScript.src` (captured at module eval time, before any await). Works regardless of mount path (e.g., when served from a Worker subroute).
- **No mods** to `quizland/preview/full/index.html`, `quizland/preview/full/saved-layout.json`, `quizland/data/questions.js` — confirmed via grep, those files are untouched.
- **CACHE_VERSION 679** ensures clients refetch the new `common/layout/*` files on next navigation.
- **Open follow-up for Phase 4**: editor stub currently does NOT add `body.layout-editor-on` class. The shared CSS hides `.userbox-badge` outside that class — fine for play mode. Phase 4 implementer should set the body class as the very first step inside `LayoutEditor.enable`.
- **Mental smoke-test path you should manually click through**:
  1. Load `quizland/index.html` (no query) → expect identical layout to current production. Confirm via DevTools that `.q-text-card`, `.board`, `.answer-tray` get inline `style="width:..., height:..., transform:translate(...)"` from `saved-layout.json`.
  2. Click any choice chip → next question loads → chips relayout correctly (MutationObserver + explicit re-apply both safety-net it).
  3. Load `quizland/index.html?edit=1` → console shows `[LayoutEditor] editor TBD (Phase 4)`. No crashes.
  4. Hard-reload after deploy → sw.js v679 invalidates old cache; new `common/layout/*` files fetched.
