# Phase 4 Review (UX)

> Reviewer 2 (UX). Focus: does the editor feel good to use? Are approved UX features delightful, or barely-functional? No code-quality nits — that's Reviewer 1.

## Overall verdict
- 🟡 **軽微改善** — overall the editor is functional and most approved UX features are present, but several rough edges (preview mode is a one-way trap, element list panel "default closed" not actually implemented, no panel-state persistence, alignment toolbar nested inside numeric panel rather than always visible, no aria-labels, comparison side-by-side mode visually flawed). None are showstoppers; all are fixable in a follow-up.

## Per-feature UX assessment

### 18. Touch handles
- Implementation: `layout-editor.css:705-738` (media query `(pointer: coarse)`); JS handle creation `layout-editor.js:642-649`.
- Desktop visible: edge handles 28×14 / 14×28, corners 14×14 (`css:103-128`). ✓
- Touch (coarse pointer) visible: edges 36×18 / 18×36, corners 16×16 (`css:706-727`). ✓ exceeds the 16px target on edges, meets on corners.
- Hit area on touch: `::before { inset: -8px }` adds an invisible 8px padding (`css:728-734`). Combined with 16px corner = ~32px hit area. ✓ meets 28px target.
- Cursor cues: `ns-resize`, `ew-resize`, `nwse-resize`, `nesw-resize` (`css:107,113,125-128`). ✓ all four directions correct.
- 🔵 Caveat: the `::before` hit-area uses `background: transparent` — since the parent already has `pointer-events: auto` and is a child of `.resizable`, mental simulation says the hit expansion does work, but corners on iPad still feel slightly small (16px visible) compared to iOS HIG's 44pt recommendation. For wood/paper aesthetic it's fine.
- **Verdict: 🟢**

### 19. +/- spinners
- Implementation: `layout-editor.js:921-954` (`makeSpinnerRow`, `wireSpinners`, `stepNumeric`).
- Step values: ✓ default 1, Shift=10, Alt=0.5 (`js:941, 950`). All wired both for keyboard ArrowUp/Down and for button click.
- Buttons: `.np-spin` 22×22 desktop, 28×28 on touch (`css:184, 737`). ✓ tappable on iPad.
- Visual feedback: `:hover { background: #3a3a3a }` (`css:190`). No `:active` press feedback though — minor.
- Discoverability of Alt/Shift modifiers: hint text in panel says `Shift+Arrow ±10 / Alt+click ±0.5` (`js:912`). ✓
- 🔵 Minor: tabindex=-1 on +/- buttons (`js:924, 926`) means they're skipped in keyboard-tab traversal. Defensible (you'd tab into the input and Arrow), but a power user expecting Tab to land on +/- will be surprised.
- 🔵 Minor: no `:active` state in CSS for buttons → tap feedback on iPad can feel "did it register?". Trivial fix.
- **Verdict: 🟢** with two 🔵 nits.

### 20. Alignment toolbar
- Implementation: `layout-editor.js:1072-1162` (`buildAlignmentToolbarHtml`, `wireAlignmentToolbar`, `applyAlignment`).
- 8 buttons present: ⇤ ⇔ ⇥ ⤒ ⇕ ⤓ ⇋ ⇌ (`js:1074-1081`). ✓ all 8.
- Behavior: align to common bbox edges; distribute keeps first/last fixed and equalizes middle. ✓
- Disabled when <2 selected? **NOT disabled** — buttons stay enabled; clicking shows toast `整列するには 2 個以上選択` (`js:1093`). 🟡 Should be `disabled` attribute on the buttons + visually muted, otherwise it feels like a broken click.
- Distribute with <3 → toast `等間隔は 3 個以上必要` (`js:1111`). Same complaint.
- Undo: ✓ each modified element pushHistory'd individually (`js:1153-1158`).
- 🟡 **Placement issue**: alignment toolbar is rendered _inside_ the numeric panel (`js:911`) which only shows when `body.layout-editor-on.has-selection` (`css:159`). With a single selection, the buttons are visible but useless; with no selection, they're hidden — making it impossible to discover the alignment feature without selecting an element first. Also, on architecture §6 "Alignment toolbar" was specced as part of the _toolbar_, not the numeric panel. In the toolbar, it would be discoverable always.
- 🔵 Glyph clarity: ⇋/⇌ for distribute is non-obvious. Title attributes are good (`水平等間隔` / `垂直等間隔`) but the icons themselves don't read as "distribute" — Figma/Sketch use different glyphs (≣ ⫾). Acceptable for power users.
- **Verdict: 🟡** — disabled state + relocate to main toolbar.

### 21. Element list panel
- Implementation: `layout-editor.js:1029-1099` build + `1178-1229` refresh. Panel built unconditionally in `enable()` `js:2420`.
- Toggle button: `#le-list-toggle` (`js:2025`).
- 240px sidebar: `css:213` ✓.
- Rows: 👁 visibility, 🔒/🔓 lock, label, key (`js:1191-1195`). ✓
- Click row → `selectOnly(el)` (`js:1210`). ✓
- Live updates: `refreshElementList()` called on hide/show/duplicate/lock/reset (`js:1054, 1064, 1208, 1292, 377`). On selection change, `refreshElementListSelection()` runs (`js:868`). ✓
- 🔴 **Default-closed not implemented**: architecture §12 question 4 said "Element list panel default: closed", and the implementer's report says "Toggle button + 240px wide sidebar" but the panel is **built and visible** immediately on enable (`js:2420`). The toggle button's handler does `state.listPanelEl.classList.toggle('open')` (`js:2066`), but **no CSS rule for `.open` exists** — so toggling does nothing. The user will see the panel and have no way to hide it. Confirmed by Grep over the CSS: only `.le-list-panel` base styling, no `.open` / `:not(.open)` / display rule.
- 🔴 **No localStorage persistence**: brief explicitly required "State persists (open/closed) in localStorage". Not implemented anywhere — Grep `localStorage` only matches save/load of saved-layout, not panel state.
- 🔵 Touch row buttons: 22×22 desktop, 28×28 on touch (`css:249, 736`). ✓
- 🔵 The bottom-right corner placement (`css:212-213, right:8px bottom:8px`) overlaps the numeric panel which is `right:8px top:toolbar+8px`. With a tall numeric panel this is fine, but on iPad portrait the lock badges + numeric panel + element list panel could fight for screen space.
- **Verdict: 🔴** — toggle is broken (open class has no CSS effect, panel can't be closed) AND state persistence missing.

### 22. Comparison mode
- Implementation: `layout-editor.js:1373-1453`.
- Toggle button: `#le-comparison` ✓ (`js:2024`).
- Popover with image picker, mode selector, opacity slider: ✓ (`js:1388-1401`).
- Image picker: text path + file input → reader → data URL (`js:1404-1410`). ✓ both committed-path and file picker per arch §12 Q3.
- Modes: `side` / `overlay` / `onion` (`js:1393-1395`). 
- Persistence: `state.comparison` written to `__comparison` (`js:236, 415`). ✓
- 🔴 **Side-by-side mode is broken UX**: `js:1433-1441` does `stage.style.width = '50%'` on the canvas itself. This is destructive — it modifies the actual stage (which might already have a fixed width from page CSS), and only `hideComparison()` resets it (`js:1452`). If the user navigates away or refreshes mid-comparison, the stage is left at 50% width. Also, when applying side-by-side over an existing zoom wrap, the calculation is half of the wrapper's content area — at zoom 100% the stage shrinks visually inside its own bounding rect, the rest is whitespace, and the overlay sits at right 50% of the stage's _original_ container. Mental simulation: visually messy + likely off-position.
- 🟡 **No close-X on the picker**: only "適用" and "閉じる" buttons (`js:1399-1400`); pressing Escape doesn't close the picker (Esc only handles help modal / draw / anno-select / clear-selection in `js:2311-2317`). User has to find the small button.
- 🟡 **Picker doesn't pre-fill mode/opacity** from existing state — only the image path is restored (`js:1387-1390`). Each time you open the picker, mode resets to "Side-by-side" and opacity to 50%. Re-opening to tweak opacity is annoying.
- 🔵 Toggle button doesn't show state — no `.active` class applied when comparison is on, so user can't tell at a glance whether comparison overlay is currently displayed.
- **Verdict: 🟡** (or 🔴 for side mode if that's commonly used; downgrading because overlay/onion modes work fine).

### 23. Snap-to-grid
- Implementation: `layout-editor.js:1338-1367, 416-419, 531-534`.
- Toggle button: `#le-grid` (`js:2020`).
- Sub-menu Off/8/16/32: `<select id="le-grid-size">` with 8/16/32 options (`js:2021-2023`). ✓ Off is achieved by pressing the toggle button, not from the select — a tiny mental model mismatch.
- Stage gets `.grid-on` class with CSS-only background (`css:345-350`). ✓ visual is a subtle blue grid; reads well over wood/paper.
- Drag/resize snaps: `snapValue()` called in `attachMoveDrag` `js:822-823`, `performResize` `js:607-608`. ✓
- Numeric inputs round on commit: `applyOnePropToEl` calls `snapValue()` (`js:981`). ✓
- Persists to `__grid`: ✓ (`js:235, 410-413`).
- Button label updates with current size: `🔳 16` (`js:1360`). ✓ nice.
- 🟢 Solid implementation.
- **Verdict: 🟢**

### 24. Lock/unlock
- Implementation: `layout-editor.js:1235-1259`.
- Per-element via element list: ✓ (`js:1206-1209`).
- Right-click toggle: ❌ **NOT implemented** — `contextmenu` is only attached to annotations and guides (`js:1634, 1839`), not to `.resizable`. Brief said "Per-element via element list, right-click, Ctrl+L". Right-click doesn't lock — instead, on a `.resizable` it shows the browser default context menu.
- Ctrl+L: ✓ (`js:2291-2297`).
- 🔒 badge: ✓ upper-left, 22×22 (`css:353-368`).
- Drag/resize prevented: `isLocked` check in `attachMoveDrag` `js:782` and `startResize` `js:668`. ✓
- Numeric inputs respected lock? **No — locked elements are filtered OUT of stepNumeric** (`js:957`) and `applyNumericInput` (`js:999`). Brief said "Numeric inputs still work for locked (override path)". 🟡 Inconsistent with intent: if the user explicitly types a value into the numeric panel, the expectation is that lock does NOT block intentional numeric input. Currently it silently ignores them.
- Persistence: `__locked` array ✓ (`js:233, 405-406`).
- 🔵 No visual cue on the toolbar / button — `Ctrl+L` is undocumented except in the help modal, which is fine, but a one-time toast on first lock would help.
- **Verdict: 🟡** — right-click not wired; numeric input override path missing.

### 25. Copy/duplicate
- Implementation: `layout-editor.js:1265-1294`.
- Ctrl+D: ✓ (`js:2287-2289`).
- Toolbar button: ✓ (`js:2003`).
- Each clone offset +16,+16: ✓ (`js:1274-1275`).
- Each clone gets next available |idx: ⚠ **The implementation does NOT compute a new |idx**. Cloning inserts the cloned element via `insertBefore(clone, el.nextSibling)` (`js:1277`), so the clone shows up as the next sibling. Re-running `getElKey()` for it WILL find it via `$$(sel).indexOf` (`js:260-262`), which is correct because querySelectorAll returns DOM order. So the clone DOES get a new auto-incremented key, just not by explicit counter. ✓ but indirectly.
- Undoable: ✓ pushHistory({ type: 'add', ... }) (`js:1279`).
- Selection moves to new clones: ✓ (`js:1289-1291`).
- 🔵 The cloned element brings copies of `.user-hidden` class etc., though `.selected` / `.edge-linked` / `.le-locked` are stripped (`js:1273`). Fine.
- 🔵 If the same element is selected twice (multi-select via Shift+click of overlapping resizables), cloning iterates the Set so each is cloned once — correct.
- 🔵 Cloning doesn't push the element's existing key into `__locked` even if the source was locked — actually that's correct: the source had key X, clone has key Y, Y is not in lockedSet, so it's unlocked. Reasonable default.
- **Verdict: 🟢**

### 26. Zoom
- Implementation: `layout-editor.js:1300-1338`.
- Toolbar slider 25-200%: ✓ (`js:2029`, range input min=25 max=200).
- Ctrl+wheel: ✓ (`js:1330-1338`). step 0.05.
- Ctrl+0 fit: maps to `zoomFit()` which is just `setZoom(1)` (`js:1328`) — NOT actual fit-to-viewport. 🟡 The brief said "Ctrl+0 fit" which on figma/illustrator means "fit page in viewport". Calling 100% "fit" is misleading. The toolbar button title says "100% に戻す" (reset to 100%) which IS what it does, but the keyboard shortcut handler has the same alias.
- Ctrl++ / Ctrl+- ±10%: ✓ (`js:2302-2306`).
- Cursor math at non-1 zoom: `getStageRectInfo()` divides by stage width to get effective scale (`js:514-521`); `bcrInStage` and `getStageCoords` use this. Mental simulation: at zoom 0.5, dragging a handle by 100 client px → dx = 100 / 0.5 = 200 internal px. That's correct (you want the element to grow by 200 internal px, which renders as 100 visual px). ✓
- Saved coords NOT mutated by zoom: zoom is applied as `transform: scale(z)` on the stage element (`js:1315`); stored `_tx`/`_ty` are internal coordinates unaffected. ✓
- Wraps stage in `.stage-zoom` container on first call: ✓ (`js:1305-1313`).
- 🟡 **Issue**: every call to `setZoom` does `stage.style.transform = 'scale(z)'` (line 1315) — but if the user is in `preview-mode`, `fitStage` already set a different transform (`translate + scale`). If they exit preview while zoom was applied, they'd see overlapping transforms. Actually `exitPreview()` (`js:2206-2211`) restores `scale(state.zoom)` correctly. ✓ But there's no exit-preview UI affordance (see legacy section).
- 🔵 Wheel zoom doesn't anchor to cursor — always zooms from origin (transform-origin: 0 0). At Ctrl+wheel users typically expect zoom-to-cursor. Minor quality-of-life miss.
- **Verdict: 🟡** — Ctrl+0 misnamed as "fit" but actually 100%-reset; no cursor-anchored zoom.

### 27. Keyboard shortcuts
- Implementation: `layout-editor.js:2270-2355`.
- Ctrl+S/Z/Y/D/L/0/+/- ✓ all wired (`js:2276-2306`).
- Arrow nudge ±1 / Shift+Arrow ±10: ✓ (`js:2333-2353`).
- Esc: dismisses help, exits draw mode, deselects anno, clears selection (`js:2311-2317`). ✓ — but does NOT exit preview mode (see legacy issue).
- Delete/Backspace: in anno mode → remove anno; in normal → `hideSelectedElements` (`js:2318-2331`). ✓ Note: this is "hide" not "delete" — appropriate, matches `__hidden` semantics.
- ?: opens help (`js:2310`). ✓ (toggles since `showHelpModal` removes if existing — `js:2230`).
- Help modal: ✓ (next section).
- 🔵 No `Ctrl+A` (select all). Power users may miss it.
- 🔵 No `g` to toggle grid, `c` for comparison, `l` for list panel — only Ctrl-modifiers. Architecture §6.11 wasn't quoted in detail so I can't verify the full table, but a few mode-toggle hotkeys would help.
- 🔵 `?` plain key — works only when not in input field (`inField` check at `js:2308`). ✓ correct guard.
- **Verdict: 🟢** with 🔵 nits.

## Existing legacy features (verify still work)

### Drag/resize feel
- Drag: `attachMoveDrag` (`js:779-853`). Shift constrains axis (`js:818-820`). ✓
- Resize: 8 handles, edge linking, group corner scale all preserved. ✓
- Edge-link visual: yellow outline `.edge-linked` (`css:88-91`). ✓
- 🔵 Selection outline: orange `#ff8a3d` (`css:84-87`) over the existing dashed cyan. Visible on most backgrounds. Fine.
- **Verdict: 🟢**

### Multi-select with Shift+click
- ✓ `js:802` toggleSelect on shift-click. 🟢

### Annotation tools (M/T/R/A/L/E/V keys)
- Brief mentioned single-key shortcuts. **NOT IMPLEMENTED** — annotation tool selection is button-only via `.le-tool-btn` (`js:2009-2015`). No keydown handler maps `m/t/r/a/l/e/v` to `setAnnoTool`. 🟡 Power users from legacy editor will miss this.
- The annotation system itself works (markers, text, rect, arrow, line, eraser, color picker). ✓
- **Verdict: 🟡** — single-key tool shortcuts dropped.

### Guides drag from ruler
- ✓ `js:1772-1801`. Mousedown on ruler creates guide. Drag past 24px back to ruler removes it (`js:1824-1830`). Right-click also removes (`js:1839`). 🟢
- 🔵 Touch: ruler mousedown handler only (`js:1779-1780`); no touchstart binding. iPad users can't drag guides from rulers. Not in feature list but a regression vs the legacy editor (which also was mouse-only AFAIK).

### Userbox draw mode
- ✓ `js:1928-1984`. Toolbar toggle, drag-create with 20px min. 🟢

### Save toast feedback
- "保存中…" → "保存しました" or error variant (`js:304, 316, 321`). ✓
- Toast styling: green for success, red for error (`css:58, 68-69`). ✓
- Animation: 1.6s fade (`css:66`); element removed after 1.7s (`js:148`). ✓
- 🔵 The "保存中…" toast and "保存しました" both pile up if save is slow — second toast appears stacked on top. Minor; acceptable for a debug-grade editor.
- **Verdict: 🟢**

### Revert/Reset confirmation
- `revert()` confirms only when dirty: `if (cur !== state.lastSavedJson && !confirm(...)) return` (`js:329`). ✓ smart — no prompt when nothing to lose.
- `reset()` always confirms (`js:358`). ✓
- **Verdict: 🟢**

### PNG export
- Snapshot via html2canvas + wireframe via canvas API. ✓ (`js:2112-2195`).
- Dropdown menu (Snapshot vs Wireframe) via `showPngMenu` (`js:2082-2110`). ✓ click-off to dismiss. Nice.
- 🔵 No html2canvas → friendly toast only ("html2canvas が未ロードです"). User has no path to fix this except manually adding the script — a hint in the toast like "ページに <script src=...html2canvas.js> を追加してください" would help.
- **Verdict: 🟢**

## UX heuristics overall

### Discoverability
- Toolbar buttons all have `title=` tooltips with shortcut hints (Ctrl+S, Ctrl+D, etc.). ✓ on desktop.
- 🔴 **No `aria-label` on any button** — Grep returned zero matches. Screen-reader users + iPad/touch (where `title` doesn't show on hover) have no label other than emoji icons. For touch the icon-only buttons (↶ ↷ ⌂ ✕) are particularly opaque.
- The help modal (`?`) lists shortcuts but is only discoverable if you press `?` or click `❓`. The existence of `?` keybinding isn't surfaced anywhere except in the help modal itself (recursive discoverability).
- Alignment toolbar buried inside numeric panel (see #20).

### Feedback
- Save: ✓ toast + `dirty` class on save button.
- Selection: ✓ orange outline + `.has-selection` body class showing numeric panel.
- Edit-mode entry: ✓ "編集モード ON" toast.
- Lock toggle: 🔵 no toast feedback ("ロックしました" / "解除しました"). Only the badge appears/disappears. If the badge happens to be off-screen (locked element scrolled out), user gets no confirmation.
- Hide: ✓ toast "N 個を隠しました".
- 🔵 No undo-history visualization (e.g., greyed Undo button when stack empty). `state.history.length` is checked in `undo()` but the toolbar button doesn't reflect emptiness.

### Forgiveness
- Undo stack 100 deep ✓ — covers add, remove, resize, transform, guide-move, lock, hide, show, text. 
- Reset confirmed. ✓
- Revert confirms only when dirty. ✓ smart.
- 🟡 **Userbox deletion via × button confirms ("…を削除しますか？")** (`js:1909`) but does NOT push history — so user cannot undo a userbox deletion. Confirmed by code: `js:1907-1915` calls `div.remove()` but no `pushHistory` call. The flow used to (in `attachUserboxDraw`) but the deletion path skipped it. 🟡 Inconsistent with the rest of the editor's "all destructive ops are undoable" claim.
- Annotation deletion via right-click confirms ("この注釈を削除しますか？") AND pushes history (`js:1636-1639`). ✓ proper.

### Aesthetics
- Theme: dark admin chrome (`#1a1a1a`, `#2a2a2a`, accent `#ffba6b` orange + `#00d4ff` cyan). 🟡 **Clashes with the wood/paper theme** of the play surface. The brief's "ugly admin chrome?" question is on the nose — it IS admin chrome. For an editor used only by the developer (`?edit=1`), this is defensible (Figma is also dark) but jarring when toggling between play and edit on the same page. The `(pointer:coarse)` rules don't change the palette.
- Toolbar layout: `flex-wrap: wrap` (`css:15`), grouped via `.le-tb-group` separated by gap. Reasonable. With many groups (Save / Undo / Annotation / Grid / Zoom / PNG / Disable) on iPad portrait it will wrap to 3 rows, eating ~120px vertical. 🟡 Not collapsed on small screens.
- Selected element outline `#ff8a3d` 3px solid is bright but works. ✓
- Grid overlay `rgba(0,212,255,0.12)` is subtle, doesn't fight content. ✓
- Lock badge purple/violet (`rgba(140,80,200,0.92)`) — distinct from selection orange. ✓

### Mobile (iPad ?edit=1)
- Touch handles: ✓ enlarged via media query.
- Spinners +/- 28×28 on touch: ✓.
- Wheel zoom: 🟡 trackpad pinch on iPad usually doesn't fire `wheel` with `ctrlKey`; users will be stuck with the slider. `attachZoomShortcuts` doesn't listen for `gesturestart`/`gesturechange`. Acceptable since slider works.
- Toolbar wrap on portrait: 🟡 takes ~3 rows.
- Numeric panel `right: 8px` is fixed-position and 260px wide — on iPad portrait (768px) it covers ~34% of the viewport when shown. Combined with the element list at `right:8px bottom:8px` (240px, max-height 50vh), they don't actually overlap (numeric is top-anchored, list is bottom-anchored), but they consume both top-right and bottom-right of the screen. 🟡 On smaller iPads (mini, 744px wide) this leaves only ~500px for the actual canvas to interact with.
- Ruler at top 24px and side 24px (`css:537, 547`): on iPad they steal valuable edge real estate, especially horizontally. No way to hide rulers (no toolbar toggle). 🟡 Legacy editor had `body.ruler-mode` toggle; not ported.
- Right-click for lock and guide-delete: doesn't work on iPad (no right-click). For locks, Ctrl+L doesn't work without keyboard. The element list panel button is the only real touch path.
- Drag-marquee selection: not implemented. On touch, Shift+click = no shift key — there's no way to multi-select on iPad. 🟡 The implementer's note says "marquee = legacy was just shift-click", which means iPad has no multi-select path at all. Worth a 🔴 for true iPad UX, but downgrading because primary use case is desktop dev.
- **Verdict overall (mobile)**: usable but cramped; no multi-select on touch.

## Concrete UX issues found

- 🔴 **Element list panel is non-toggleable**: clicking 📋 toggles `.open` class but there's no CSS rule for it. Panel is always shown. Combined with no localStorage state persistence — both architecture-promised behaviors fail. (`js:2066`, `css` — Grep'd zero matches for `.le-list-panel.open`.)
- 🔴 **Preview mode is a one-way trap**: `enterPreview()` adds `preview-mode` class which hides toolbar, panels, handles (`css:687-697`). There's no exit affordance — Esc in preview only handles help/draw/anno/clearSelection (`js:2311-2317`), not preview. The user is stuck until they edit the URL or refresh. (`js:2201-2211, exitPreview` defined but unwired.)
- 🔴 **Side-by-side comparison mode mutates `state.canvasEl.style.width = '50%'`**: leaves stage in 50% width if user reloads or session exits before `hideComparison()` runs. (`js:1435, 1452`).
- 🟡 **Alignment toolbar hidden inside numeric panel**: discoverable only with selection active; brief envisioned as toolbar-level. Buttons not disabled when <2 selected — silently fail with toast. (`js:911-912`).
- 🟡 **Right-click on resizable to lock not implemented**: only annotations/guides have contextmenu listeners. (`js:1634, 1839`).
- 🟡 **Numeric input override for locked elements not implemented**: `stepNumeric`/`applyNumericInput` filter out locked, so typing into numeric panel for locked silently does nothing. (`js:957, 999`).
- 🟡 **Userbox × deletion not undoable**: `userbox-del` click handler removes div without pushHistory. (`js:1907-1915`).
- 🟡 **Annotation single-key shortcuts (M/T/R/A/L/E/V) not implemented**.
- 🟡 **Comparison picker doesn't remember opacity/mode** — only image path is restored on re-open. (`js:1387-1390`).
- 🔵 **No aria-labels** on any button — accessibility regression.
- 🔵 **Ctrl+0 named "fit" but actually 100% reset** — minor mental model mismatch.
- 🔵 **Ctrl+wheel zoom not cursor-anchored**.
- 🔵 **Lock toggle has no toast feedback**.
- 🔵 **Comparison toggle button has no `.active` state** when overlay is on.
- 🔵 **Touch cannot drag guides from rulers** (only mouse events on ruler).
- 🔵 **No `:active` press state on buttons** — tap feedback weak on iPad.
- 🔵 **Toolbar no collapse on narrow screens** — 3-row wrap on iPad portrait.
- 🔵 **Aesthetic clash**: dark admin chrome vs page's wood/paper theme. Defensible (matches Figma's dark tools) but jarring.

## Recommended UX improvements (priority order)

1. **Fix list panel toggle**: add CSS `body.layout-editor-on .le-list-panel:not(.open) { display: none; }` (and have `enable()` start without `.open`) + persist `.open` to localStorage on toggle. (10 lines.)
2. **Add a Preview-mode exit affordance**: floating "✕ プレビュー終了" button in top-right when `body.preview-mode`, AND let Esc call `exitPreview` if `body.classList.contains('preview-mode')`. (5 lines.)
3. **Fix side-by-side comparison**: instead of mutating `stage.style.width`, clip via CSS (e.g., `overflow: hidden; width: 50%` on a wrapper, or use `clip-path: inset(0 50% 0 0)`). On `hideComparison`, defensively clear `stage.style.width` regardless of mode. (20 lines.)
4. **Move alignment toolbar to main toolbar group** — promotes discoverability + fixes "no selection means hidden" footgun. Disable buttons via `disabled` when <2 selected (toggle on `select` event). (15 lines.)
5. **Wire right-click on `.resizable` to toggle lock** to match brief. Also fixes iPad: long-press synthesizes contextmenu. (8 lines.)
6. **Allow numeric panel input on locked elements**: change filter from "skip locked" to "applyNumericInput goes through, stepNumeric still skips" — i.e., explicit text entry overrides lock. (4 lines + a small toast.)
7. **Make userbox × deletion undoable**: add `pushHistory({ type: 'remove', el: div, parent: div.parentNode, next: div.nextSibling })` before `div.remove()`. (1 line.)
8. **Add aria-labels** to all toolbar/panel buttons. Auto-derived from existing `title` is fine. (15 lines or a single helper.)
9. **Cursor-anchored Ctrl+wheel zoom**: scale around `(e.clientX, e.clientY)` instead of origin. Minor formula change. (10 lines.)
10. **Annotation single-key tool shortcuts** (M/T/R/A/L/E/V): add a keydown branch when `state.annoMode && !inField`. (12 lines.)
11. **Comparison picker remembers state** on re-open (mode + opacity from `state.comparison`). (3 lines.)
12. **Toggle `.active` class on `#le-comparison`** when overlay live. (2 lines.)
13. **`:active` press feedback** in CSS: `.le-toolbar button:active { transform: scale(0.96); }`. (3 lines.)
14. **Help modal**: add Ctrl+0/+/-, comparison/grid/list-panel toggle hotkeys (if added), explicit note that Esc closes panels. (Minor edits.)

## Help modal contents review
- Documented (`js:2237-2249`): Ctrl+S, Ctrl+Z/Y, Ctrl+D, Ctrl+L, Ctrl+0/+/-, Ctrl+wheel, Arrow ↑↓ / Shift+Arrow, Alt+click, Shift+click, Delete/Backspace, Esc, ?.
- Missing from modal:
  - Arrow ←→ (only ↑↓ shown but `js:2333` handles all four).
  - Right-click to delete annotations / guides (works in code, undocumented).
  - Annotation tool single-key shortcuts (none implemented; if added, document).
  - The fact that `?` is a toggle (re-pressing closes).
  - Numeric panel inputs ArrowUp/Down ±1 / Shift+Arrow ±10 / Alt+click ±0.5 (the modal mentions "Alt+クリック ±0.5 ステップ" but only generally; the per-input arrow behavior isn't called out).
- Categories: ✗ flat table, no headers like "ファイル" / "編集" / "選択" / "表示" / "ヘルプ". For a feature list this small (12 rows) it's OK, but Figma-style grouping would be nicer.
- Easy to dismiss: ✓ click backdrop OR `閉じる` button OR press `?` again. Esc also closes (`js:2312`). 🟢
- Modal styling: white-on-dark, monospace shortcut col, scrollable up to 80vh. ✓

## 3-line summary highlighting 🔴 issues
1. **Element list panel toggle is broken**: button toggles a `.open` class with no CSS rule, so the panel is permanently visible and architecture-promised "default closed + localStorage persistence" is unmet.
2. **Preview mode is a one-way trap**: `enterPreview` hides everything, but neither Esc nor any visible button calls `exitPreview` — once you preview you must refresh the page.
3. **Side-by-side comparison mutates stage width destructively**: setting `stage.style.width='50%'` survives navigation/refresh if `hideComparison` doesn't run, leaving the stage broken on subsequent `?edit=1` sessions.

Verdict: 🟡 **軽微改善** — solid feature coverage but three landed-with-bugs (🔴) and several 🟡 polish items prevent a 🟢. None are architectural; all are 1-20 line fixes in a single follow-up PR.
