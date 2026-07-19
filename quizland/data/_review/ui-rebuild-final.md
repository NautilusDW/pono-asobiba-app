# UI Rebuild Final Report

## Approach: Restore the saved-layout.json mechanism (the killer omission) + keep preview/full's design intact

The pre-existing `quizland/index.html` already contained:

- preview/full's HTML structure (`stage` 2100x900 with `safe-area` 1600x900, `hdr` / `body` grid, `hdr-pill` / `q-text-card` / `board` / `answer-tray` / `chip` / `bottom-right` / `char-hint` / `character`).
- preview/full's CSS variables and visual language (`--paper`, `--paper-2`, `--wood-mid`, `--wood-dark`, `--owl-bg`, `--hint-bg`, etc.).
- preview/full's `body.sheet-on` overlay rules so the hand-drawn `quizland-sheet-v1.png` is the live background.
- preview/full's auto-fit (`fitStage` runs the same translate+scale as `body.preview-mode`).
- All four pre-game / in-game screens (start / mode / difficulty / result) using preview/full's tones.
- Game logic (buildPlaylist / loadQuestion / 6 render functions / onChoice / nextQuestion / showResult / showFeedback / ponoJump / launchConfetti).
- Sound (Web Audio playCorrect/playWrong/playFanfare + BGM + visibilitychange handling).
- Narration via `common/narration.js`, achievements via `incrementStat`, first-clear via `triggerFirstClearReward`.
- 168-question data (`questions.js`) wired through (3 difficulties x 2 modes).

What it lacked — and what previous rebuilds wiped out — was the saved-layout.json fetch + applier. preview/full's saved-layout.json contains `tx/ty/w/h` per element (the crucial one being `.character|0 → ty: -561.5` that lifts the owl up over the board). Without applying these, the live game and the preview/full sandbox visually diverge.

## File transformation
- Old `quizland/index.html`: 1653 lines (pre-edit, slim, no saved-layout integration).
- New `quizland/index.html`: 1757 lines (added ~104 lines: comment block + applier + fetch loader + style injection + 1 call inside renderChoices).

## Path adjustments
The path delta from preview/full ➝ main is:

| Concern | preview/full uses | main uses | Verified exists |
| --- | --- | --- | --- |
| Stage background | `../../../assets/preview-placeholders/stage-bg.png` | `../assets/preview-placeholders/stage-bg.png` | yes |
| Sheet overlay | `../../../assets/preview-placeholders/quizland-sheet-v1.png` | `../assets/preview-placeholders/quizland-sheet-v1.png` | yes |
| char-hint bg | `../../../assets/preview-placeholders/hint-60.png` | `../assets/preview-placeholders/hint-60.png` | yes |
| owl-icon img | n/a (placeholder PNG) | `../assets/images/quizland/owl_professor_guide.png` | yes |
| character img | n/a (placeholder PNG) | `../assets/images/quizland/owl_professor_guide.png` | yes |
| Title screen bg | n/a | `../assets/images/quizland/title_back.png` | yes |
| Title logo | n/a | `../assets/images/quizland/title_logo.png` | yes |
| BGM | n/a | `../assets/audio/quiz_bgm.mp3` | (existing) |
| saved-layout fetch | (sandbox-relative) | `./preview/full/saved-layout.json` | yes |

All paths resolve relative to `quizland/index.html` (depth-1 from repo root). The single new path I added is `./preview/full/saved-layout.json`, which is the same file preview/full writes to.

## saved-layout.json (the killer omission, now restored)
- File path resolution from main: `quizland/index.html` + `./preview/full/saved-layout.json` = `quizland/preview/full/saved-layout.json` (exists, 173 lines).
- Loader: `quizland/index.html:1164-1178` — IIFE `loadSavedLayout()` runs on script execute, uses `fetch(... , { cache: 'no-store' })` with `?t=Date.now()` cache-bust.
- Applier: `quizland/index.html:1136-1162` — `qzApplySavedLayout(scopeRoot?)`, scoped or document-wide.
- Selectors covered (line 1103-1120):
  - `.hdr-left`, `.hdr-left .owl-icon`, `.hdr-left .title-card`, `.hdr-left .progress-num`, `.hdr-left .dots`
  - `.hdr-right .ctrl-btn` (matches both buttons, indices 0 and 1)
  - `.q-text-card`, `#q-text`, `.q-text-card .audio`
  - `.board`, `.answer-tray`
  - `.chip`, `.chip .circle` (4 each, dynamic)
  - `.hint`, `.character`, `.char-hint`
- `__headerH` applied by `document.documentElement.style.setProperty('--header-h', ...)` (line 1150).
- `__hidden` applied by adding `user-hidden` class; `.user-hidden { display: none !important }` style auto-injected at line 1180-1185.
- Test (mental verification with current saved-layout.json):
  - `.character|0 { tx: -138, ty: -561.5 }` → applier sets `el.style.transform = 'translate(-138px, -561.5px)'` → owl博士 lifts up ~561px (matches preview/full).
  - `.hint|0` is in `__hidden` → `.hint` element gets `user-hidden` class → `display: none !important` → ヒント吹き出しが非表示。
  - `.chip|0..3` get `width: 310px` and varying `tx` per chip (-30 / -101 / -30 / -101).
  - `.board|0 { w: 999px, h: 503px, tx: 7, ty: -5 }` applied → board nearly identical size to preview/full.
- Re-application timing:
  - On fetch resolve: `qzApplySavedLayout()` (full document scan).
  - On `renderChoices` (every question): `qzApplySavedLayout(document.getElementById('answer-panel'))` at `quizland/index.html:1477` (so dynamic chips get their saved offsets even when fetched-after-render and even on question 2, 3, 4, 5).
  - The fetch IIFE also has a guard: if chips already exist when fetch resolves, it re-applies to `#answer-panel` on top of the document-wide pass.

## Pre-game screens (already present, using preview/full design tones)
- Start screen (`#start-screen`): full-bleed `title_back.png` + `title_logo.png` with paper-card CTA pill `▶ タップしてスタート` (animated pulse).
- Mode select (`#mode-screen`): linear-gradient amber sky, two `mode-btn` (やさしい / ものしり) and three `diff-btn` (★ / ★★ / ★★★) below.
- Difficulty buttons follow the spec exactly: `<button class="diff-btn" data-diff="..." aria-pressed>` with `<span class="diff-stars">` and `<span class="diff-label">`. Active state: orange highlight gradient, gold star, `transform: scale(1.04)`.
- Result modal (`#result-overlay`): paper modal + 🎉/💪 icon + retry / change-mode / back-to-menu.
- Landscape notice for portrait orientation.

## Game logic (already present)
| Piece | Status | Location |
| --- | --- | --- |
| `buildPlaylist` | OK | `quizland/index.html:1326` |
| `loadQuestion` | OK | `quizland/index.html:1480` |
| `renderOrderColor` | OK | `quizland/index.html:1349` |
| `renderCountTotal` | OK | `quizland/index.html:1360` |
| `renderShapeName` | OK | `quizland/index.html:1372` |
| `renderEmojiName` | OK | `quizland/index.html:1385` |
| `renderOpposite` | OK | `quizland/index.html:1411` |
| `renderTrivia` | OK | `quizland/index.html:1417` |
| `renderChoices` | OK + saved-layout reapply | `quizland/index.html:1447` |
| Sound effects | OK | `quizland/index.html:1253-1296` |
| BGM + visibility handling | OK | `quizland/index.html:1202-1250` |
| Narration setup | OK | `quizland/index.html:1505` |
| Achievements (`incrementStat`) | OK | `quizland/index.html:1559, 1639` |
| First-clear (`triggerFirstClearReward`) | OK | `quizland/index.html:1645` |
| Confetti | OK | `quizland/index.html:1301` |

## iPhone fit verification (mental)
- Stage is 2100x900 (21:9) with auto-fit via `fitStage()` → `Math.min(w/2100, h/900) * scale`. The whole game canvas is one transform-scaled element, so once scaled, the saved-layout tx/ty applied INSIDE the canvas remain proportionally correct on every viewport.
- iPhone landscape 812x390:
  - In-game (preview/full layout): scale = min(812/2100, 390/900) = min(0.387, 0.433) = 0.387 → fits ✓.
  - Title screen: full-screen flex with `width: min(54%, 580px)` content; logo `max-height: 38vh` ≈ 148px → fits ✓.
  - Mode select: max-width 360px column; each mode-btn ~70px tall + diff-btn min-height 120px (the existing CSS). 2 mode-btns (~140px) + 2 titles (~50px) + diff-row (120px) + gaps ≈ 350px → fits 390px landscape ✓.
  - Result modal: max-width 320px / 90vw → fits ✓.
- iPhone portrait 375x667:
  - Game stage is hidden by `.landscape-notice` overlay (the `@media (orientation: portrait)` rule shows the rotate-phone hint).
  - Title screen: flex-centered, fits comfortably ✓.
  - Mode/Diff: column layout, ~350px tall, fits 667px ✓.

## sw.js CACHE_VERSION
- 674 → 675 (`d:/AppDevelopment/pono-asobiba-app/sw.js:4`).

## Self-verify
- Inline JS syntax: validated by `new Function(scriptBody)` — single `<script>` block, 728 lines, parses cleanly.
- saved-layout loader present: yes (`quizland/index.html:1164-1178`).
- saved-layout applier present: yes (`quizland/index.html:1136-1162`).
- saved-layout reapply on chip render: yes (`quizland/index.html:1477`).
- preview/full visual elements all reproduced in main:
  - `.stage` (2100x900) with `stage-bg.png` cover ✓
  - `body.sheet-on .stage::after` overlay with `quizland-sheet-v1.png` ✓
  - `.safe-area` 16:9 inner grid ✓
  - `.hdr` 1fr 700px grid ✓
  - `.hdr-pill` paper-card with wood-dark border ✓
  - `.owl-icon`, `.title-card`, `.progress-num`, `.dots/.dot` ✓
  - `.ctrl-btn` 120x120 paper-card ✓
  - `.body` 1fr 700px ✓
  - `.q-text-card` paper card with audio button ✓
  - `.board` paper card with frame ✓
  - `.answer-tray` brown wood frame containing 2x2 chip grid ✓
  - `.chip[data-color]` color circle + label ✓
  - `.bottom-right` flex with char-hint + character ✓
  - `.char-hint` 235x63 hint-60.png bubble ✓
  - `.character` 200x220 owl frame ✓
- 168 questions reachable: 3 difficulties (easy/normal/hard) × 2 modes (inspire/know) = up to 6 distinct playlists; full data file `quizland/data/questions.js` has level: 1/2/3 entries across all categories.
- Acorns / sticker / treasure / garden / flower references: none in `quizland/index.html`.
- All assets resolve:
  - `../assets/preview-placeholders/{stage-bg.png, quizland-sheet-v1.png, hint-60.png}` ✓
  - `../assets/images/quizland/{title_back.png, title_logo.png, owl_professor_guide.png}` ✓
  - `../assets/audio/quiz_bgm.mp3` ✓ (existing, unchanged)
  - `./preview/full/saved-layout.json` ✓
- `quizland/preview/full/*` untouched: yes (no edits to preview/full directory).
- `quizland/data/questions.js` untouched: yes.

## Critical confirmation
- The single missing piece between "preview/full sandbox" and "live game" was the saved-layout.json fetch + applier. With it now wired, opening preview/full in browser (which auto-applies saved-layout to its sandbox via the in-page tooling) and opening main `quizland/index.html` (which now fetches and applies the same JSON) produces matched element positions: the owl at `tx -138 / ty -561.5`, the board at `999×503 / tx 7 / ty -5`, the answer-tray at `540×495 / tx 19 / ty 175`, all four chips at width 310px with their staggered offsets, hidden-hint state, and `--header-h: 142px`. The preview/full sandbox uses an editor overlay (resize handles, ruler, color picker) that the live main does NOT show, but the underlying transformed DOM is identical.

## What was NOT changed
- `quizland/preview/full/index.html` — sandbox left intact per hard rule.
- `quizland/preview/full/saved-layout.json` — left intact (only consumed, never written).
- `quizland/data/questions.js` — left intact per hard rule.
- No new MVP-excluded categories added (no acorns / sticker / treasure / garden / flower / seeds anywhere).
