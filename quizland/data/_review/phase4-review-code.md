# Phase 4 Review (Code Quality)

Reviewer: Code-Quality (Reviewer 1)
Inputs: `common/layout/layout-editor.js` (2550), `layout-editor.css` (738), Phase 4 implementer report, architecture doc.

## Overall verdict

🟡 **軽微修正** — Module is structurally sound, syntactically valid, IIFE-isolated, with all required public API methods present and all 27 features implemented (or explicitly deferred per implementer notes). However, several non-blocking issues warrant follow-up: (a) `disable()` does not disconnect the `ResizeObserver` or detach persistent global listeners (`keydown`/`mousedown`/`focus`/`blur`/`wheel`/`resize`), (b) `state.lastSavedJson` is set before the GH PUT resolves so dirty flag is cleared even on remote failure, (c) HTTP 409 (sha conflict) is not surfaced with a distinct conflict toast as architecture §11 risk #6 prescribes.

## 1. Syntax check

- `new Function(layoutEditorJsContent)` result: ✓ (no SyntaxError)
- Output: `SYNTAX_OK lines=2550 bytes=104553`
- Module is a single top-level IIFE (`d:/AppDevelopment/pono-asobiba-app/common/layout/layout-editor.js:17-2549`) ending with `})()`. Only one `window.*` assignment exists: `window.LayoutEditor = { … }` at line 2528. No accidental globals.
- Uses `Set`, `Map`, `Promise`, `ResizeObserver`, `URL.createObjectURL`, `FileReader`, `MutationObserver` — all guarded or assumed available in modern browsers (no IE polyfill needed; matches Phase 3 baseline).

## 2. API completeness

All 16 required methods are exported on `window.LayoutEditor`. Verified at `layout-editor.js:2528-2548`.

| Method | Implementation line | Status |
|--------|---------------------|--------|
| `enable(config)` | `2403` | ✓ |
| `disable()` | `2464` | ✓ (cleanup gaps — see §6) |
| `isEnabled` (getter) | `2533` | ✓ |
| `on(name, fn)` | `124` | ✓ |
| `off(name, fn)` | `128` | ✓ |
| `emit(name, payload)` | `133` | ✓ |
| `save()` | `296` (returns Promise) | ✓ |
| `revert()` | `327` | ✓ |
| `reset()` | `357` | ✓ |
| `snapshot()` | `214` | ✓ |
| `undo()` | `445` | ✓ |
| `redo()` | `453` | ✓ |
| `setTool(tool)` | `2522` | 🟡 stub (sets `state.activeTool` and emits `tool` event but no UI/cursor wiring) |
| `setZoom(scale)` | `1300` | ✓ |
| `toggleComparison()` | `1373` | ✓ |
| `toggleGrid()` | `1344` | ✓ |

Diagnostic accessors `_state`, `_spec()`, `version`, `__full` are also exported (helpful for review/test, no stability promise needed).

Events fired: `ready` (2460), `select` (869), `transform` (748, 756, 828), `dirty` (431), `save:start` (297), `save:success` (309, 317), `save:error` (322), `mode` (2461, 2505), `zoom` (1325), `tool` (2522). All architecture §2 events present.

## 3. Feature implementation

| # | Feature | Line | Correctness |
|---|---------|------|-------------|
| 1 | Drag/resize 8 handles | `540-777` | ✓ direct port; touch via `touchToMouse` (652) |
| 2 | Multi-select + shift-click | `779-882` | ✓ (legacy "marquee" was shift-click; same here) |
| 3 | Numeric panel W/H/TX/TY | `896-1039` | ✓ IDs `np-w/h/tx/ty` preserved; placeholder "異なる" for mixed-value (1037) |
| 4 | Edge linking | `573-593` | ✓ EPS=8, OVERLAP_MIN=8 ported; Ctrl/Cmd disables (718) |
| 5 | Group corner scale | `687-716, 729-749` | ✓ uniform factor; locked elements filtered out (691) |
| 6 | Annotation system | `1456-1766` | ✓ marker/text/rect/arrow/line/eraser; SVG handles for endpoints/corners |
| 7 | Guides + rulers | `1769-1859` | ✓ `setupRulers` + `attachGuideDrag`; right-click delete (1839) |
| 8 | Userbox | `1862-1984` | ✓ contenteditable badge + draw-mode rectangle creation |
| 9 | Undo/redo (100 stack) | `437-498` | ✓ 8 op types; `HISTORY_LIMIT` enforced via `shift()` |
| 10 | Save/load | `156-208, 296-325` | ✓ GH GET-then-PUT with sha; localStorage fallback (see §9 caveats) |
| 11 | Toast | `143-149` | ✓ `setTimeout(remove, 1700)`; CSS rule unscoped intentionally so toast survives `disable()` |
| 12 | Hide/Show | `1045-1066` | ✓ `pushHistory({type:'hide'/'show'})` |
| 13 | Editable text | `2381-2397` | ✓ focus/blur diff via `_beforeText` + `pushHistory({type:'text'})` |
| 14 | Slot image upload | — | DEFERRED (page-level concern per implementer note); valid scoping |
| 15 | Layout building | — | DEFERRED (same rationale) |
| 16 | PNG export | `2112-2195` | ✓ snapshot via html2canvas, wireframe via Canvas API; html2canvas-missing toast (2113) |
| 17 | Preview mode | `2201-2223` | ✓ `enterPreview/exitPreview/fitStage`; `exitPreview` is exposed only via Esc — no toolbar toggle (minor) |
| 18 | Touch handles | CSS L703-737 | ✓ `(pointer: coarse)` enlarges; `::before` 8px hit-area expansion |
| 19 | +/- spinners | `921-994` | ✓ Shift ±10, Alt ±0.5; ArrowUp/Down keyboard supported |
| 20 | Alignment toolbar | `1069-1162` | ✓ 8 ops; distribute requires ≥3 with toast guard (1111) |
| 21 | Element list panel | `1165-1229` | ✓ rebuilt on `select`/`transform`/`dirty` via `refreshElementList` |
| 22 | Comparison mode | `1373-1453` | 🟡 onion-skin uses `mix-blend-mode: difference` only; image load failure not handled |
| 23 | Snap-to-grid | `1338-1366` | ✓ `snapValue()` rounds drag/resize/numeric (607-608, 822-823, 981) |
| 24 | Lock/unlock | `1232-1259` | ✓ Set-based; `__locked` round-tripped; Ctrl+L (2291) |
| 25 | Copy/duplicate | `1265-1294` | ✓ Ctrl+D; clones strip editor chrome and re-attach handles |
| 26 | Zoom 25-200% | `1300-1338` | ✓ `transform: scale(z)` on stage with `.stage-zoom` wrapper; slider + Ctrl+wheel + Ctrl+0/+/- |
| 27 | Keyboard shortcuts | `2270-2354` | ✓ Ctrl+S/Z/Y/D/L/0/+/-, Arrow nudge, Esc, Delete; help modal (2229) |

All implemented features wire up state, history, and selection consistently. Edge cases (empty selection, no spec match, locked element, dragging off-stage) are guarded inline (2293-2296, 805, 668, 691, etc.).

## 4. State management

- `selectedElements: Set` initialized in `enable()` (2411); cleared in `clearSelection()` (881), `selectOnly()` (872), `reset()` (374). ✓
- `historyStack`: `state.history` push (440) trimmed to `HISTORY_LIMIT=100` (441); `state.future` cleared on `pushHistory` (442). `undo`/`redo` move ops between stacks bidirectionally. ✓
- `dirty` flag: derived in `updateDirtyUI()` (425-432) by comparing live snapshot JSON to `state.lastSavedJson`. Debounced (433). 🟡 `state.lastSavedJson = compact` is set BEFORE the GH PUT awaited at `save():302` — see §9.
- `localStorage` keys: `storageKey()` returns `cfg.storageKey || 'le_layout_' + location.pathname` (155-156). Architecture says "per-page key" — ✓ matches.
- `state.locked: Set` of `selector|idx` keys; ✓ persisted via `__locked` round-trip.
- `state.zoom`, `state.gridSize/gridOn`, `state.comparison`: all serialized into snapshot only when nondefault (234-236) — keeps JSON clean.

## 5. Event system

- `emit/on/off` correctness: ✓ `emit` slices the listener array before iterating (135), so listeners can `off` themselves mid-emit safely. `try/catch` per listener prevents one failure from blocking others (136).
- 🟡 `on(name, fn)` does NOT dedupe — registering the same `fn` twice fires it twice. Acceptable for an internal API but note for callers.
- `off(name, fn)` correctly filters by reference (131). ✓

## 6. DOM safety

- 🟡 **`disable()` cleanup gaps** (`layout-editor.js:2464-2506`):
  - `ResizeObserver` created at `enable():2454` is stored in a local `var ro` and never assigned to `state` — `disable()` cannot disconnect it. Memory leak: the observer keeps `state.canvasEl` reachable.
  - `attachKeyboard` (window keydown, 2271), `attachZoomShortcuts` (window wheel, 1331), `attachBackgroundClickClear` (document mousedown, 2362), `wireEditableTexts` (document focus + blur, 2382, 2387), `setupRulers` (window resize, 1782) all add listeners that are never removed in `disable()`. Mitigated because each handler short-circuits on `!state.enabled`, but they hold closures referencing `state` indefinitely. Multiple `enable()/disable()` cycles will accumulate listeners (each `enable()` re-registers them).
  - `enterPreview` registers `window.resize → fitStage` (2204); `exitPreview` removes it (2210). ✓ symmetrical, but `disable()` does not call `exitPreview` even though it removes the `preview-mode` body class — orphan resize listener if user leaves preview-mode on at editor close.
- Detached DOM: handles, size labels, lock badges, panels, rulers, guides, toasts, comparison overlays are all removed in `disable()` (2469-2483). ✓
- Class additions/removals use `classList` (no string concatenation bugs). ✓
- `TRANSIENT_CLASSES` guard in `getDomPath` (60-81) is complete and matches `layout-applier.js:144` semantically, though the editor list is broader; both filter `resizable`, `selected`, `edge-linked`, `user-hidden`, so `__texts` keys round-trip identically. ✓

## 7. CSS scoping

- All 138 selectors are scoped under `body.layout-editor-on …` EXCEPT:
  - `.le-toast { … }` and `.le-toast.le-toast-error` at lines 53/68 — intentionally unscoped so toast survives `disable()` (toast is created on `document.body`, not under stage). ✓ Acceptable.
  - `@keyframes le-toast-fade` at lines 70-75 — keyframes have no scoping concept. ✓
  - The `@media (pointer: coarse)` block at L705-738 wraps body-scoped rules. ✓
- No global element-tag rules (`body { … }`, `* { … }`, `input { … }` without ancestor). ✓
- One ID-based ruleset `body.layout-editor-on #le-zoom-label` (377) and `body.layout-editor-on .grid-on` (345) — both scoped. ✓

**Counterexamples:** none beyond the deliberate `.le-toast` exception.

## 8. Backward compatibility

- `saved-layout.json` additive: ✓ new fields are `__version`, `__locked`, `__zoom`, `__comparison`, `__grid`. Snapshot writes them only when nondefault (`layout-editor.js:234-236`).
- `__version` absent OK: ✓ `applySavedData` (382-419) never reads `__version`; new fields are guarded individually (`Array.isArray(data.__locked)`, `typeof data.__zoom === 'number'`, `data.__grid && typeof data.__grid === 'object'`, etc.). Old payloads load cleanly.
- Old applier (Phase 3 `layout-applier.js`) ignores unknown editor-only fields. ✓

## 9. Save/load contract

- GH path: ✓ `/api/gh/repos/<owner>/<repo>/contents/<path>?ref=<branch>` — matches Phase 3 contract (worker proxy unchanged).
- SHA precondition: ✓ `ghGetContents` GET first to obtain sha (170-183), passed to PUT body (187).
- 409 conflict toast: 🟡 NOT specifically handled. Any non-2xx response is caught generically and surfaces "GitHub 保存失敗: ローカルにのみ保存". Architecture §11 risk #6 prescribed a distinct conflict toast. Low priority but worth a follow-up.
- localStorage fallback: ✓ `localSave` runs UNCONDITIONALLY before the GH attempt (301), so local persistence always succeeds. Reload re-applies via the applier path.
- Save retries: ✗ no retry logic on transient network failure. Single attempt; user must click "保存" again. Acceptable for editor UX.
- 🟡 `state.lastSavedJson = compact` is set at line 302 (BEFORE the GH GET/PUT promise chain). Result: if GH PUT fails, the dirty flag still clears because `updateDirtyUI` compares against the pre-PUT snapshot. From the user's POV the editor looks "saved" even though only local persisted. Recommend deferring `lastSavedJson` assignment into the success branch (or storing both `localSavedJson` and `remoteSavedJson` and rendering them differently).
- 🟡 `localSave` failure (e.g., quota exceeded) is silently swallowed (200-201). User would see "保存中…" and then either GH success or GH error, but never a localStorage error.

## 10. Error handling

- `fetch` failures: ✓ caught with `.catch` in `save()` (319) and `ghGetContents`/`ghPutContents` reject. UI surfaces a toast.
- Missing DOM elements: ✓ `state.canvasEl` falls back to `$('#stage') || document.body` in `enable()` (2407-2409). Most queries (`$('#le-save')` etc.) are within the same `buildToolbar()` innerHTML block, safe by construction.
- Misshaped saved-layout JSON: ✓ each restore guard checks types (`Array.isArray(data.__guides)`, `typeof data.__zoom === 'number'`, etc.). `applySavedData` is wrapped in `try/catch` at the call site (2441).
- Image load failures: 🟡 `applyComparison` sets `overlay.style.backgroundImage = 'url("' + c.image + '")'` (1431); CSS `background-image` failures are silent — no `Image.onerror` probe to surface a toast. PNG export uses `html2canvas` which is guarded (2113), and `useCORS: true, allowTaint: true` is set. Slot upload is not part of this module.
- `safeQueryAll` (43) wraps `querySelectorAll` in try/catch — defensive against malformed selectors in spec.
- `getElKey` (255-267) wraps `el.matches(sel)` in try/catch.
- `prompt`/`confirm` are used in `addAnnoText` (1694), `attachAnnoDelete` (1636), `revert` (329), `reset` (358), `userbox-del` (1909) — fine for a developer-facing editor.

## Issues found

### 🟡 (medium — should fix before broad rollout)

1. **`disable()` does not store/disconnect the ResizeObserver** — `var ro = new ResizeObserver(...)` (2454) is locally scoped. Repeated `enable() → disable() → enable()` cycles leak observers and listeners. Fix: `state.resizeObserver = ro;` on enable, `state.resizeObserver && state.resizeObserver.disconnect()` on disable.

2. **Persistent global listeners not removed on `disable()`** — `attachKeyboard` (window keydown 2271), `attachZoomShortcuts` (window wheel 1331), `attachBackgroundClickClear` (document mousedown 2362), `wireEditableTexts` (document focus/blur 2382, 2387), `setupRulers` (window resize 1782). Each `enable()` re-attaches them, so cycling enable/disable accumulates listeners. Recommend storing the listener references on `state` and `removeEventListener` in `disable()`, OR use an `AbortController` per session and `controller.abort()` in `disable()`.

3. **`save()` clears dirty flag before remote PUT resolves** — Line 302 (`state.lastSavedJson = compact`) precedes the GH chain. On remote failure, UI says clean but only local was saved. Recommend setting `lastSavedJson` only inside the success branch (or splitting local-vs-remote dirty tracking).

4. **HTTP 409 (sha conflict) not surfaced distinctly** — Architecture §11 risk #6 calls for "GH sha precondition + conflict toast". Currently `if (!r.ok) throw …` (194) lumps 409 with all other failures. Suggest:
   ```js
   if (r.status === 409) throw new Error('CONFLICT_409');
   ```
   then in the `.catch`, check `err.message === 'CONFLICT_409'` and emit a "他の編集と競合しました — 再読み込みしてください" toast.

5. **`exitPreview` not invoked from `disable()`** — `disable()` removes the `preview-mode` class but does not call `exitPreview()`, so a `window.resize → fitStage` listener can be left attached if the user disables editor while in preview mode. Stage transform is also not reset.

6. **`comparison` image load failure silently invisible** — Bad path → empty overlay, no error toast. Suggest `var probe = new Image(); probe.onerror = …; probe.src = c.image;` before applying.

### 🔵 (informational / nice-to-have)

7. **`setTool(tool)` is essentially a stub** — only updates `state.activeTool` and emits `tool` event. There is no cursor change or panel toggle wired to `move/annotate/draw`. The annotation tools have their own `setAnnoTool` system. Consider documenting this or wiring `setTool` to actually delegate.

8. **`on(name, fn)` does not deduplicate** — repeated `on('select', myFn)` registers the listener N times. Acceptable but worth a JSDoc note.

9. **`localSave` failure swallowed** (line 200-201) — Quota-exceeded scenarios silently fail. Adding a console.warn would help debugging.

10. **`utf8Btoa` uses deprecated `unescape`** (47). Works in all browsers but flagged as deprecated; consider:
    ```js
    function utf8Btoa(s) { return btoa(String.fromCharCode(...new TextEncoder().encode(s))); }
    ```

11. **`lastSavedJson` initialization runs `JSON.stringify(snapshot())` even when `initialData` was null** (2443). Harmless but means the baseline includes `__version: 2` etc., so a freshly enabled editor is "clean" by definition. Fine.

12. **`refreshElementList` rebuilds entire DOM on every selection change** — could thrash on very large specs. Acceptable for current 10-20 element specs; flag if scaling beyond that.

13. **`debounce` (49-56) does not expose a `flush`/`cancel`** — minor.

## Recommended deltas (priority order)

1. **Fix `disable()` listener/observer cleanup** (issues #1, #2, #5) — single most impactful change for repeated-session correctness. ~30 lines.
2. **Defer `state.lastSavedJson = compact` to the GH success branch** (issue #3) — 2-line move.
3. **Add 409 conflict-specific toast** (issue #4) — 5 lines in `ghPutContents` + `save()`.
4. **Probe comparison image load** (issue #6) — 8 lines in `applyComparison`.
5. **Document or implement `setTool` wiring** (issue #7) — either remove from public API or finish the wiring.
6. **Replace `unescape` in `utf8Btoa`** (issue #10) — modernization, low risk.

None of these are blockers; the module is functional and architecturally clean. Adoption can proceed; treat the 🟡 items as a follow-up cleanup PR.
