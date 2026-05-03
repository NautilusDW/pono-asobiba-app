# Phase 6 Implementer Report

## Commit 2: __texts / __userboxes verification

- LayoutApplier.applyTexts safe-default verified: OK
  - `common/layout/layout-applier.js` lines 129-141: `applyTexts` only queries `'.editable-text'` (line 133) and uses DOM-path keys (matches preview/full's `collectEditableTexts`). Dynamic game DOM (no `.editable-text` class) is therefore not clobbered.
  - quizland/index.html does not currently mark anything `class="editable-text"`, so even though the saved-layout has 12 `__texts` entries, none are forcibly applied to live game text. Future opt-in is one class away.
- LayoutApplier.applyUserboxes restoration verified: OK
  - `common/layout/layout-applier.js` lines 184-222: removes existing `.userbox` children inside scope, recreates from `data.__userboxes` with bgImage / left / top / w / h / tx / ty. Idempotent.
  - quizland's saved-layout has `__userboxes: []` so this is a no-op today, but the path is wired for future custom frames.
- Apply pipeline (`apply()` lines 81-104) calls `applyHeaderH`, `applyHidden`, `applyTexts`, `applyUserboxes` only when scopeRoot is null (whole-document apply). When `renderChoices` re-applies for `#answer-panel`, only per-element w/h/tx/ty is re-applied — globals (texts/userboxes/hidden/headerH) are not re-clobbered. This matches arch §11.1.

## Commit 3: layoutUrl flip

- File copied: `quizland/preview/full/saved-layout.json` → `quizland/saved-layout.json` (byte-identical, `diff` returned no differences; both are 4136 bytes).
- `layoutUrl: './preview/full/saved-layout.json'` → `'./saved-layout.json'` at `quizland/index.html` line 1179.
- `ghPath: 'quizland/preview/full/saved-layout.json'` → `'quizland/saved-layout.json'` at `quizland/index.html` line 1182.
- Documentation comment added at `quizland/index.html` lines 1172-1174.
  - Note: the surrounding context is inside an inline `<script>` block, so a JS block comment (`/* ... */`) was used instead of an HTML `<!-- ... -->` comment. HTML comments inside `<script>` would not be syntactically clean (only the legacy `<!-- ... //-->` SGML hack tolerates it). Content is identical.

## Files

- `quizland/saved-layout.json`: created (4136 bytes, byte-identical to `quizland/preview/full/saved-layout.json`).
- `quizland/index.html`: modified (3 line edits + 3 added comment lines = 6 line changes total in one block replacement).
- `sw.js`: 681 → 682 (line 4).

## Self-verify

- Inline JS syntax: OK. Ran a `vm.Script` parse on every inline `<script>` block in `quizland/index.html`; 1 block, 0 errors.
- JSON parses: OK. `quizland/saved-layout.json` parses with keys `__guides, __headerH, __texts (12 entries), __hidden (1), __userboxes (0)`.
- Visit `quizland/index.html` (no `?edit`):
  1. `layout-applier.js` + `layout-system.js` are loaded with `defer`.
  2. `initLayoutSystem` boot calls `LayoutSystem.init({ layoutUrl: './saved-layout.json', ... })`.
  3. `LayoutSystem.init` fetches the new path, caches into `window._currentLayoutData`, and calls `LayoutApplier.apply(data, null, applyCfg)` → globals (`__headerH`, `__hidden`) restored, dynamic chip layout re-applied via MutationObserver and `renderChoices` lines 1485-1491.
  4. `?edit=1` is absent so editor JS/CSS is NOT loaded — game plays as before.
- Visit `quizland/index.html?edit=1`:
  1. Same applier path runs.
  2. `shouldEnableEditor` returns true → `loadEditor()` lazy-loads `layout-editor.js` + `layout-editor.css` and calls `LayoutEditor.enable(config)` with the config that includes `ghPath: 'quizland/saved-layout.json'`.
  3. Save persists to the new path via the existing `/api/gh/` proxy.
- Existing preview/full path unchanged: `quizland/preview/full/index.html` still references `'quizland/preview/full/saved-layout.json'` (line 2345 `GH_LAYOUT_PATH`); its saved-layout.json file is untouched. Sandbox continuity preserved.
- Hard rules respected:
  - Did NOT modify `quizland/preview/full/index.html`.
  - Did NOT modify `quizland/preview/full/saved-layout.json`.
  - Did NOT modify `quizland/data/questions.js`.
  - Did NOT modify `common/layout/*.js` or `layout-shared.css`.
  - sw.js bumped to 682.
  - Hiragana / kanji preserved (only English/comment edits).

## Notes for reviewers

- The HTML comment requirement was implemented as a JS block comment because the LayoutSystem.init call lives inside an inline `<script>` block. The wording matches the spec.
- `__texts` is fully wired but only takes effect when an element opts in via `class="editable-text"`. quizland's dynamic question/score DOM does not (and should not) carry that class — so the safe-by-default contract from arch §11.1 holds.
- After this commit, the canonical save target for the live quizland game is `quizland/saved-layout.json`. `preview/full/saved-layout.json` is now frozen as a sandbox snapshot until someone consciously syncs it.
- Cache-busting: sw.js → 682 forces existing PWA clients to fetch the new `layoutUrl` on next load, otherwise they would still 200/304 the cached `./preview/full/saved-layout.json`.
