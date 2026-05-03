# Phase 4 Fixes Report

Implementer: Phase 4 Fix Pass
Files edited:
- `common/layout/layout-editor.js`
- `common/layout/layout-editor.css`
- `sw.js` (CACHE_VERSION bump)

## 🔴 Fixes (blocking)

### R1 — Element list panel toggle wired + state persisted
- CSS: `common/layout/layout-editor.css` — added rule `body.layout-editor-on .le-list-panel:not(.open) { display: none; }` (right after the base `.le-list-panel` block, around new line ~228).
- JS: `common/layout/layout-editor.js`
  - Toggle button handler now persists state to localStorage:
    `pono_layout_panel_open = '1' | '0'` (in `wireToolbar` `#le-list-toggle` handler).
  - In `enable()` (after `refreshElementList()`), the persisted value is read; default = closed (panel built without `.open`).
- Behavior: panel is hidden on first visit; clicking 📋 toggles and remembers across sessions.

### R2 — Preview mode now exitable
- JS: `enterPreview()` now creates a fixed top-right button (`.le-preview-exit`, label `✕ プレビュー終了`, `aria-label="プレビューを終了"`) and strips `?preview=1` from the URL via `history.replaceState`.
- JS: `exitPreview()` removes the button, clears `?preview=1`, restores `transform: scale(state.zoom)`. Idempotent (early-returns when not in preview).
- JS: keyboard handler — `Esc` now branches first on `body.classList.contains('preview-mode')` and calls `exitPreview()`.
- JS: `disable()` calls `exitPreview()` if preview class still present (prevents orphan resize listener).
- CSS: `.le-preview-exit` rule added (in preview-mode block) so the button appears even though the rest of editor chrome is hidden.

### R3 — Side-by-side comparison no longer destructively mutates canvas width
- JS: `state.originalCanvasWidth` introduced. `applyComparison()` captures `stage.style.width` BEFORE mutating to `'50%'` (only when `mode === 'side'`). `body.layout-comparison-on` class is added for CSS scoping.
- JS: `hideComparison()` restores the captured `originalCanvasWidth` (or clears if none) and removes `layout-comparison-on`.
- JS: `disable()` defensively restores `originalCanvasWidth` if comparison is still active or capture was leaked.
- JS: `applyComparison()` adds `.active` to `#le-comparison`; `hideComparison()` removes it (also fixes UX nit "no active state on comparison toggle").

## 🟡 Fixes (recommended)

### C1 — `disable()` cleanup gaps closed
- JS: introduced `state.cleanupFns = []` array and helpers `registerCleanup(fn)` / `addManagedListener(target, type, handler, opts)`.
- Refactored to use managed listeners (each adds an entry to `cleanupFns`):
  - `attachKeyboard()` (window keydown)
  - `attachZoomShortcuts()` (window wheel, passive:false)
  - `attachBackgroundClickClear()` (document mousedown)
  - `wireEditableTexts()` (document focus + blur, capture phase)
  - `setupRulers()` (window resize → adjustRulerPos)
- `enable()` resets `state.cleanupFns = []`. The `ResizeObserver` is now stored in `state.resizeObserver` and registered via `registerCleanup(() => ro.disconnect())`.
- `disable()` runs all `cleanupFns` in order, then disconnects `state.resizeObserver` defensively.
- Repeated `enable()/disable()` cycles no longer accumulate listeners.

### C2 — `save()` dirty flag timing
- JS: `state.lastSavedJson = compact` and `updateDirtyUI()` were moved out of the synchronous block; now they only run inside the `.then()` AFTER `ghPutContents(...)` resolves. On failure, the dirty flag stays true so the user can retry.
- The no-GH-path branch keeps the local-only behavior (still marks clean since local IS the source of truth).

### C3 — HTTP 409 conflict surfaced distinctly
- JS: `ghPutContents()` now detects `r.status === 409` and throws `Error` with `code: 'CONFLICT_409'` and `status: 409`.
- JS: `save().catch(...)` checks `err.code === 'CONFLICT_409'` and shows red toast: `別エディタが先に保存しました。再読み込みして再保存してください`. Also emits `save:conflict` event.
- Other non-2xx errors still go to the generic toast.

### U4 — Alignment toolbar promoted to the main toolbar
- JS: a new `<div class="le-tb-group le-align-tb" id="le-align-tb">` with 8 alignment buttons (`.le-align-tb-btn`) is inserted in `buildToolbar()` (after the Save/Undo group). Buttons start `disabled`.
- JS: `wireToolbar()` wires each alignment button to `applyAlignment(btn.dataset.align)`.
- JS: new `refreshTopToolbarAlign()` enables/disables based on selection size (≥2 for align, ≥3 for distribute). Called from `refreshSelectionUI()` and at end of `enable()`.
- CSS: `.le-toolbar .le-align-tb` cluster styling + `:disabled` muted state.
- The numeric-panel alignment toolbar is left in place for redundancy (no harm — uses the same `applyAlignment`).

### U5 — Right-click context menu on resizable elements
- JS: in `attachHandle()`, added `el.addEventListener('contextmenu', ...)` that calls new `showElementContextMenu(x, y, el)`.
- Menu items: 🔒/🔓 ロック ↔ 解除 / 👁/🚫 表示 ↔ 非表示 / 📋 複製 / 🗑 削除 (隠す).
- Menu dismisses on outside click or Esc; positions itself within viewport (clamped to `vw - 180`).
- CSS: `.le-context-menu` styled (dark theme, hover, rounded).

### U6 — Locked-element numeric override path
- JS: `applyNumericInput()` no longer filters out locked elements — explicit text entry now applies. `stepNumeric()` (the +/- spinner / ArrowUp/Down handler) still skips locked (those are non-explicit).
- A toast `ロック中の要素にも数値入力を反映しました` informs the user when the override happened.

### U7 — Userbox × delete is now undoable
- JS: in `createUserbox()`, the `del` click handler now calls `pushHistory({ type: 'remove', el: div, parent: div.parentNode, next: div.nextSibling })` BEFORE `div.remove()`. The existing `applyInverse({type:'remove'})` already restores the node, so undo works.

### U8 — Annotation single-key shortcuts (M / T / R / A / L / E / V)
- JS: in the keyboard handler, after the Esc branch, added a check for `state.annoMode && no modifier && !inField`. Maps keys to anno tools: `m→marker, t→text, r→rect, a→arrow, l→line, e→eraser, v→select`. Only fires when annotation mode is active.

### U9 — Comparison picker remembers opacity/mode
- JS: `showComparisonPicker()` now reads:
  - mode from `state.comparison.mode` OR `localStorage.getItem('pono_layout_comparison_mode')` (default `'side'`)
  - opacity from `state.comparison.opacity` OR `localStorage.getItem('pono_layout_comparison_opacity')` (default `50`).
- The matching `<option>` is marked `selected`; the range input gets the saved value.
- On Apply, both values are written back to localStorage (`pono_layout_comparison_mode`, `pono_layout_comparison_opacity`).

### U10 — iPad multi-select (no-Shift-key alternative)
- JS: new `state.multiSelectMode` boolean.
- JS: new toolbar button `#le-multi-select` (`👆+ 複数選択`) toggles the mode (active state + toast).
- JS: `attachMoveDrag()` now extends selection on click when `state.multiSelectMode` is true (in addition to Shift).
- JS: long-press (500ms) on a `.resizable` toggles its selection (touch path). Implemented in `attachHandle()` via `touchstart/touchmove/touchend/touchcancel`.

## 🔵 Deferred (with rationale)

- **aria-labels on toolbar buttons** — partially DONE (all main toolbar buttons + anno tools + zoom slider now have `aria-label`; hover-tooltips already exist via `title`). Full a11y audit (focus rings, keyboard tab order, screen-reader-only labels, role attributes) deferred to Phase 7 a11y pass.
- **Cursor-anchored Ctrl+wheel zoom** — deferred. Current behavior is origin-anchored; cursor-anchored requires re-computing transform-origin on each wheel tick + adjusting wrapper translation. Low impact for a developer-facing editor.
- **Wood/paper theme for toolbar** — deferred to Phase 7 styling pass per the task brief.
- **`:active` press feedback** — DONE inline (small `.le-toolbar button:active { transform: scale(0.96); }` rule covers toolbar, np-spin, np-align, le-align). Still listed as 🔵 in the brief; included here because it was a 1-line fix.
- **Toolbar collapse on narrow screens** — deferred. Existing `flex-wrap: wrap` already works; full responsive collapse is a Phase 7 polish.
- **Touch drag-from-ruler for guides** — deferred. The legacy editor was mouse-only; ruler touchstart wiring would be a separate enhancement.
- **`Ctrl+0` "fit" naming clarification** — deferred. Currently maps to 100% reset; accurate fit-to-viewport is a separate feature.
- **Lock toggle toast feedback** — DONE for context-menu path (`ロックしました` / `ロックを解除しました`); existing element-list toggle remains unchanged.
- **Comparison `.active` state** — DONE alongside R3.

## sw.js
- 680 → 681 (forces clients to refresh editor JS/CSS).

## Self-verify

- **Inline JS syntax check**:
  ```
  node -e "new Function(src)"
  ```
  Result: `SYNTAX_OK lines=2855 bytes=119398` ✓

- **Mental simulations**:
  1. `enable()` mounts editor → toolbar built with all groups including new `le-align-tb` and `le-multi-select` → element list panel built without `.open` (hidden) → all features wired. ✓
  2. Toggle 📋 button → panel slides open, `pono_layout_panel_open=1` written. Reload → panel still open. Click again → closes, `=0` written. ✓
  3. Click 📱 preview → `.preview-mode` class added, `.le-preview-exit` button rendered top-right, `?preview=1` stripped if present. Press Esc → `exitPreview()` runs, button removed, transform restored to `scale(zoom)`. ✓
  4. Open comparison popover → mode/opacity prefilled from localStorage (default Side / 50). Choose Side → `originalCanvasWidth` captured (`''` if no inline width), stage shrinks to 50%, overlay added. Click 比較 again → `hideComparison()` restores width to original (empty string clears inline). Page reload → no leftover width because we restored before any persistence. ✓
  5. `save()` simulated 409 → `ghPutContents` throws with `code: 'CONFLICT_409'` → `.catch` shows red toast and emits `save:conflict`; `lastSavedJson` unchanged → save button still shows `dirty`. User can re-press 保存. ✓
  6. `enable() → disable() → enable()` ×N: each enable resets `cleanupFns = []`, registers fresh listeners; each disable runs all and clears. No accumulation; ResizeObserver disconnected. ✓
  7. Right-click on a `.resizable` → context menu opens at cursor → click 🔒 ロック → toggleLock + refreshElementList + toast. Esc closes the menu. ✓
  8. Long-press a `.resizable` on touch (500ms) → toggleSelect + toast `長押し: 選択を切り替え`. ✓
  9. Click `👆+ 複数選択` toolbar → `multiSelectMode = true`, button gets `.active`. Subsequent single-clicks now extend selection. ✓
  10. Type a value into Numeric panel input while a locked element is selected → value applies, toast confirms; spinner +/- still skips locked. ✓
  11. Click ✕ on a userbox → confirm → pushHistory({type:'remove'}) → div.remove(). Ctrl+Z → applyInverse restores div via `parent.insertBefore(el, next)`. ✓
  12. While annotation mode is on, press `m` → `setAnnoTool('marker')`. Press `v` → `select`. Other keys ignored. While annotation mode is OFF, the keys do nothing (no false fire). ✓
  13. While annotation mode is on, press `Escape` → first checks preview-mode (no), then help (no), then context menu (no), then drawMode (no), then anno-selected (clears it), else clearSelection. ✓

All simulations pass.

## File paths edited (absolute)
- `d:/AppDevelopment/pono-asobiba-app/common/layout/layout-editor.js`
- `d:/AppDevelopment/pono-asobiba-app/common/layout/layout-editor.css`
- `d:/AppDevelopment/pono-asobiba-app/sw.js`
