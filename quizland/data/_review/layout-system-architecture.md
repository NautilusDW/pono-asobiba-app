# Layout System Architecture

> Plan agent (Architect) は read-only モードのため、PM (Claude) がこの設計書を保存。

## 0. Goals & Non-Goals

**Goals**
- Extract the render-only "applier" from `quizland/preview/full/index.html` into a reusable common module so any page can opt into saved layouts with one script tag.
- Extract the editor (drag, resize, annotation, guides, undo/redo, save/load, userbox) into a common, lazy-loaded module activated only by `?edit=1`.
- Add the user-confirmed UX upgrades (touch-friendly handles, numeric +/- spinners, alignment toolbar, element list panel, comparison mode, snap-to-grid, lock, copy/duplicate, zoom, full keyboard shortcuts) without regressing existing behavior.
- Preserve full WYSIWYG: editor and play modes share identical DOM/CSS so positions never drift.
- Keep `quizland/preview/full/index.html` working as-is (incremental migration).

**Non-Goals**
- Not introducing a build step, bundler, or framework. Modules are plain ES2017 IIFEs/ES modules served as static files.
- Not touching the GitHub PUT proxy contract in `src/worker.js`.
- Not changing the `saved-layout.json` schema in a breaking way; only additive fields with a `__version` tag.

## 1. Module structure

```
common/
  layout/
    layout-applier.js        # ~250 lines, render-only; loaded by every page
    layout-editor.js         # ~1700 lines, full editor; lazy-loaded on ?edit=1
    layout-editor.css        # ~450 lines, editor-only styling
    layout-shared.css        # ~30 lines, hide-class + WYSIWYG vars used by BOTH modes
    layout-system.js         # ~120 lines, public entry: window.LayoutSystem.init({...})
    README.md                # page-author docs
```

| File | Responsibility | Loaded when |
|------|---------------|-------------|
| `layout-system.js` | Public entry. Decides "applier-only" vs "applier + editor" based on `?edit=1`. Lazy-imports the editor. | Always |
| `layout-applier.js` | Fetch saved-layout.json, apply `w/h/tx/ty` to selectors, restore `__headerH`, `__hidden`, `__texts`, `__userboxes`. Idempotent. | Always |
| `layout-shared.css` | `.user-hidden`, userbox base, `--header-h` variable | Always |
| `layout-editor.js` | RESIZABLE_SPEC, drag/resize/annotation/guides/userbox/undo/redo, save (localStorage + GitHub PUT) + UX features | Only on `?edit=1` |
| `layout-editor.css` | Toolbar, numeric panel, ruler, handles, comparison overlay, element list, zoom UI | Only on `?edit=1` |

## 2. Public API

### Page-author surface (target: 2 lines)

```html
<link rel="stylesheet" href="../common/layout/layout-shared.css">
<script src="../common/layout/layout-system.js" defer></script>
<script>
  LayoutSystem.init({
    layoutUrl: './saved-layout.json',
    canvas: '#stage',
    editableSelectors: [
      ['.hdr-left',                'wh', 'ヘッダーピル'],
      ['.hdr-left .owl-icon',      'wh', '博士アイコン'],
      // ... 16 entries
    ],
  });
</script>
```

Or auto-init via dataset:

```html
<script src="../common/layout/layout-system.js"
        data-layout-url="./saved-layout.json"
        data-canvas="#stage"
        data-spec="./layout-spec.json"
        defer></script>
```

### Configuration shape

- `layoutUrl` (required), `canvas` (required), `editableSelectors` (required for editor)
- Optional: `textPathRoot`, `hideClass`, `scaleVar`, `applyOnDynamic`, `saveTo`, `storageKey`, `ghPath`, `customSave`, `comparisonImage`, `gridSize`, `zoomRange`, `initialZoom`, `enableEditor`, `editorQueryParam`, `beforeApply`, `onReady`, `onSave`, `onError`

### Events (LayoutEditor.on)
- `ready`, `select`, `transform`, `dirty`, `save:start`, `save:success`, `save:error`, `mode`, `zoom`

## 3. Page opt-in (5 steps)

1. Add `<link>` for `layout-shared.css`
2. Stable selectors + a single canvas root
3. Drop in `<script>` for `layout-system.js`
4. Initialize with selector spec
5. (Optional) starter `saved-layout.json`

## 4. ?edit=1 mode

- Detected via URL param
- Body class: `layout-editor-on`
- Toolbar mounts at top
- All `editableSelectors` matched elements gain `class="resizable"` + 8 handles + size label
- Numeric panel + element list sidebar
- Keyboard shortcuts attach
- Save: GitHub PUT (preserves preview/full's pattern)
- Lazy-loaded: ~5KB gzipped on play mode, full editor only on `?edit=1`

## 5. saved-layout.json format

Reuse existing format (additive only):
- Per-element entries: `<selector>|<index>` → `{w, h, tx, ty}`
- `__guides`, `__headerH`, `__hidden`, `__texts`, `__userboxes` (existing)
- `__version`, `__locked`, `__zoom`, `__comparison`, `__grid` (new, optional)

Each page gets own JSON next to `index.html`:
- `quizland/saved-layout.json`
- `wordmatch/saved-layout.json`
- `quizland/preview/full/saved-layout.json` ← legacy, untouched

## 6. UX features (all approved)

- **Touch handles**: `(pointer:coarse)` → 28px hit / 16px visible
- **+/- spinners**: ArrowUp/Down ±1, Shift+Arrow ±10, Alt+click ±0.5
- **Undo/redo**: 100-stack + Ctrl+Z/Y
- **Alignment toolbar**: 8 buttons (left/center-h/right/top/center-v/bottom/distribute-h/distribute-v)
- **Element list panel**: sidebar, click to select, eye/lock toggles
- **Comparison mode**: side-by-side / overlay / onion-skin
- **Snap-to-grid**: 8/16/32px optional
- **Lock/unlock**: per-element, Ctrl+L
- **Copy/duplicate**: Ctrl+D
- **Zoom**: 25%-200% slider, Ctrl+wheel, Ctrl+0/+/-
- **Keyboard shortcuts**: full table, ? help modal

## 7. Backward compatibility

- preview/full unchanged (legacy sandbox)
- New fields ignored by old code (round-trip safe)
- Per-page opt-in (existing pages 100% unaffected until they opt in)

## 8. Quizland migration (3 commits)

1. Drop in applier (no behavioral change) — replace inline ~150 lines with 4-line `LayoutSystem.init`
2. Enable `__texts` / `__userboxes` (additive)
3. Copy `quizland/preview/full/saved-layout.json` to `quizland/saved-layout.json`, flip `layoutUrl`

## 9. Testing strategy

- `tools/layout-smoke.html`: 3 iframes, screenshot diff
- `tools/test-applier.html`: unit-style assertions
- Manual UX checklist per feature

## 10. Implementation phases

- **Phase A** Scaffold (2h): A1 dirs + stubs, A2 applier extraction, A3 shared CSS
- **Phase B** System entry + applier wiring (1.5h): B1 layout-system.js, B2 quizland smoke (Commit 1)
- **Phase C** Editor extraction (parallelizable): C1 drag/resize, C2 annotation, C3 guides/rulers, C4 userbox, C5 undo/redo, C6 save/load, C7 toolbar, C8 CSS extract
- **Phase D** UX upgrades (mostly parallel): D1 spinners, D2 alignment, D3 list panel, D4 comparison, D5 grid, D6 lock, D7 duplicate, D8 zoom, D9 keyboard
- **Phase E** Quizland completion (2h): Commit 2 + Commit 3
- **Phase F** Other pages (1h each, parallel): wordmatch / oto / bento / maze opt-in
- **Phase G** Tests + docs (2.5h)

**Total: 24-28 focused hours**

## 11. Risks

1. `__texts` clobbering dynamic content → opt-in via `class="editable-text"`
2. GitHub PUT path derivation → explicit `ghPath` config when ambiguous
3. Stage transform stacking → centralize `getEffectiveScale()`
4. MutationObserver performance → debounce 250ms
5. CSS leakage → all rules scoped under `body.layout-editor-on`
6. Dual editors race → GH sha precondition + conflict toast

## 12. Open questions for user

(All have PM-recommended defaults — proceeding unless user redirects)

1. **saved-layout.json migrate now**: YES (PM rec), copy preview/full's file to `quizland/saved-layout.json`
2. **`?edit=1` in production**: enabled (existing GH PUT auth gates write)
3. **Comparison mode source**: both (committed path + file picker fallback)
4. **Element list panel default**: closed
5. **Touch handle visible 16px**: YES (discoverability)
6. **Auto-inject `editable-text`**: NO (explicit only, footgun otherwise)
