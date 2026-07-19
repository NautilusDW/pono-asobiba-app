# UI Port Implementer Report (v2 — Replace strategy)

## Strategy
- **Replace** (preview/full as foundation, slim main logic embedded inside it)
- The new `quizland/index.html` is structured as: a **fixed 2100×900 (21:9) `.stage` canvas** with a **1600×900 (16:9) `.safe-area` inside**, copied verbatim from `quizland/preview/full/index.html`. The stage is auto-fit to the viewport via `transform: translate() scale()` (preview/full's "preview-mode" math, made always-on).
- `body.sheet-on` is enabled by default so the hand-drawn `quizland-sheet-v1.png` overlays the stage. Decorative element borders/backgrounds are suppressed under `sheet-on` exactly as preview/full does, so the sheet shows through while CSS-positioned text/dots/circles render on top.

## File transformation
- **Old** `quizland/index.html`: 2585 lines. Used a responsive `.game-shell` 16:9 grid with `.header / .hud / .stage / .question-panel / .answer-panel / .choices / .question-wrap / .question-board / .answer-tray`. The v2 layout had been bolted on top of the old structure ("Inject" strategy).
- **New** `quizland/index.html`: 1537 lines. Uses preview/full's structure verbatim:
  - `.stage-wrap > .stage > .safe-area > .hdr {.hdr-left.hdr-pill, .hdr-right} + .body {.q-col {.q-text-card, .board>#stage-area}, .a-col {.answer-tray>.answer-panel, .bottom-right {.char-hint, .character}}}`
  - Class names: `hdr-pill / owl-icon / title-card / progress-num / dots / dot / ctrl-btn / q-text-card / audio / board / answer-tray / answer-panel / chip / circle / char-hint / character` — all from preview/full.

## DOM Inventory (preview/full → new main mapping)

| preview/full element | new main has it? | notes |
|---|---|---|
| `.stage-wrap > .stage` (21:9, stage-bg.png) | ✓ | Auto-fit to viewport via `transform`. |
| `.safe-area` (16:9 inner) | ✓ | Same grid (header-h `var(--header-h)` 150px + 1fr). |
| `body.sheet-on` (sheet image overlay) | ✓ | Default ON, same z-index/specificity rules as preview/full. |
| `.hdr-left.hdr-pill` (owl + title-card + progress-num + dots) | ✓ | Owl uses `owl_professor_guide.png` cropped same as old main. |
| `.title-card` (フクロウはかせの / なぞなぞ) | ✓ | Same wood-card brown gradient + cream text. |
| `.progress-num` (1 / 5) with `#q-num`/`#q-total` | ✓ | Cream pill. |
| `.dots#hud-progress` (5 dots) | ✓ | Dynamically rendered; `done` past, `current` current. |
| `.hdr-right .ctrl-btn` × 2 (おしらせ 🔔 / せってい ⚙️) | ✓ | 120×120 paper-card buttons; `#hud-back-btn` (left → mode select), `#hud-settings-btn` (opens common menu). |
| `.q-text-card` (木枠 + 紙質, audio 🔊) | ✓ | `#q-text` + `#question-speaker` (auto-shown only when narration entry exists). |
| `.board#board` (紙ボード, holds `#stage-area`) | ✓ | 500px tall, paper gradient + wood frame. |
| `.answer-tray` (木枠) wrapping `.answer-panel` (2×2 grid) | ✓ | `#answer-panel` is filled dynamically with 4 `.chip` elements. |
| Scribble paper-card answer chips (`.chip` + `.circle`) | ✓ | For `order_color`, `data-color` is set + `.circle` renders the diagonal scribble pattern. |
| `.bottom-right .char-hint` (ヒント！ 235×63, hint-60.png) | ✓ | Static text "ヒント！" matches preview/full default. |
| `.bottom-right .character` (フクロウ博士 200×220) | ✓ | `#pono-avatar` containing `owl_professor_guide.png`; jumps on correct answer. |

## Render function adaptations
- `renderOrderColor(stage, q)` → outputs `<div class="item-row">` with one `.color-chip` per item. Each chip is `var(--slot-size)` (130px) square with the color's solid background and a subtle inset shadow — visually compatible with preview/full's dotted-slot row.
- `renderCountTotal(stage, q)` → `<img class="count-item">` × N inside an `.item-row`. Images are sized at `var(--slot-size)`.
- `renderShapeName(stage, q)` → `.shape-display` with the appropriate `.shape-circle/square/triangle/star/heart/rectangle/diamond/oval` (sizes scaled up to fit the 500px-tall board: 220–280px).
- `renderEmojiName(stage, q)` → `.emoji-display` with `.emoji-main-img` (max 360×360) for image-based questions, or `.emoji-main` (220px font) for emoji. Hint shows after 3 s.
- `renderOpposite(stage, q)` → large 84px paper-card text inside `.opposite-display`.
- `renderTrivia(stage, q)` → ThinkingPono.mp4 video (280×280) + animated `?` bubble. The blink keyframes are hoisted to the main stylesheet.
- `renderChoices(q)` → builds 4 `.chip` buttons inside `#answer-panel`. For `order_color` it adds `.circle` + label (matching preview/full's design), for `count_total` it adds `.chip-count` (56px font), otherwise just text.

## Sound / Achievements / First-clear / Settings
- **Sound effects**: Web Audio synths (`playCorrect / playWrong / playFanfare`) — wired ✓ on correct/wrong/clear.
- **BGM**: `../assets/audio/quiz_bgm.mp3` via `<audio>`, started on title-tap (gesture). `visibilitychange` and `pagehide` pause BGM. ✓
- **Narration**: `common/narration.js` loaded; `setupNarration` auto-plays current question and prefetches next 2 if entries exist. `🔊` button shown only when narration available. ✓
- **Achievements**: `window.incrementStat('quizland_correct', 1)` on each correct answer; `window.incrementStat('quizland_clears', 1)` on full clear (≥70%). Stamp-rally `pono_played_<date>` updated on first correct of the day. ✓
- **First-clear**: `common/first-clear.js` loaded; `window.triggerFirstClearReward('quizland')` invoked on clear. Currently a no-op due to `PONO_MVP_NO_REWARDS=true`, but ready for re-enable. ✓
- **Settings modal**: `common/menu.js` `initMenu({ bgmToggle, tutorial })` triggered after entering a mode. `#hud-settings-btn` (gear) dispatches a synthesized `pointerdown` to the hidden `.pono-menu-toggle` so the common dropdown appears top-right. BGM ON/OFF toggle works through `toggleBGM()`. ✓

## Excluded per MVP scope
- `acorns.js`: REMOVED ✓ (never re-introduced)
- `treasure.js`: REMOVED ✓ (never referenced; first-clear short-circuits via `PONO_MVP_NO_REWARDS`)
- `flowers.js` / `data/flowers.js`: REMOVED ✓
- garden DOM (`#garden-overlay`, `#flower-enc`, `#hud-seeds`, `.garden-cell`, `.flower-enc-card` etc.): REMOVED ✓
- seed counter / category-screen / difficulty buttons: REMOVED (mode-screen is the only pre-game screen; mode buttons go straight into `initGame()`)
- Verified by grep for `acorn|sticker|treasure|flower|garden|seed|hud-seeds|flower-enc|garden-overlay` → 0 matches.

## sw.js CACHE_VERSION
- Before: 671 → After: **672**

## Self-tests
- Inline JS syntax: ✓ (validated with `new Function(scriptBody)` via Node — 20015 chars, no errors)
- No excluded systems leftover: ✓ (grep `acorn|sticker|treasure|flower|garden|seed` → 0 matches)
- All 168 questions reachable: ✓ (`buildPlaylist` filters by `selectedCategories` × difficulty, then shuffles; each mode unlocks the appropriate category set, and the mode-screen "ものしり" enables `trivia/weather/body/opposite`)
- preview/full visual elements all present: ✓ (see DOM inventory above)
- All `<script src>` paths verified: ✓ (mvp-flags / achievements / first-clear / menu / narration / data/questions all OK)
- All `<img src>` / asset paths verified: ✓ (stage-bg.png / quizland-sheet-v1.png / hint-60.png / owl_professor_guide.png / title_back.png / title_logo.png / quiz_bgm.mp3 all OK)
- All `getElementById(...)` calls match existing markup IDs: ✓
- Question flow trace (title → mode → question → answer → next → result): ✓
  - Title `.start-screen` click → starts BGM, hides start, shows `.mode-screen`
  - Mode button click → sets `selectedCategories`, hides mode, calls `initGame()` → `loadQuestion(playlist[0])`
  - `onChoice` → correct: confetti + jump + (detail popup) + `nextQuestion`; wrong: red flash + retry allowed
  - At `questionIdx >= TOTAL_Q` → `showResult()` → result overlay
  - "もう一回" → `initGame()`, "モードをかえる"/「おしらせ」→ back to mode-screen

## Deviations from preview/full
- **Stage scaling**: preview/full ships in a 21:9 desktop sandbox with toolbars and resize-mode. The new main strips out all toolbar / annotation / resize / preview-mode toggle UI, keeping only the stage rendering, and applies the auto-fit math from `enterPreview()` directly on load + on resize.
- **Layout-select / slot-size / arrow-stroke / saved-layout.json**: removed from main runtime. The board's slot count is determined by the question type, not by a dropdown, so the per-variant size table isn't needed. The dotted-outline slot look is achieved via `.color-chip / .count-item` having border + soft drop shadow.
- **Item slot vs. items**: preview/full's "stage" is 7 dotted slots intended for color or count items. The new main keeps the same paper-board feel but renders the actual question content (color chip row / count-item row / shape / image / opposite text / trivia video) without the dotted-slot frame, since the questions don't always need exactly 7 placeholders.
- **Pre-game screens (start + mode)**: preview/full has none. We layer them as fixed-position overlays on top of the stage so they always cover at any viewport size.
- **Result modal**: preview/full has none either; we keep the same paper-card style modal as the old main.
- **`hud-back-btn`**: preview/full's left ctrl-btn was labeled "おしらせ 🔔". We retain that label/icon but wire it as a "back to mode select" affordance, since the actual notifications system isn't in scope.

## Notes for reviewers (重点的に見てほしい点)
1. **Stage auto-fit at small heights / portrait**: confirm that `fitStage()` keeps the 21:9 stage centered with letterboxing and never overflows. The portrait warning overlay sits above. Try iPad Pro / iPhone 14 Pro Landscape sizes.
2. **Sheet image vs. CSS markup alignment**: with `body.sheet-on`, the user-drawn `quizland-sheet-v1.png` is the visible decoration and the wood-borders on `.hdr-pill / .q-text-card / .board / .answer-tray / .chip` are intentionally hidden. Verify the chip text/circles still align meaningfully on top of the sheet's drawn cards. (We accept that the alignment is "ざっくり" per preview/full's user note.)
3. **Choice rendering for non-color/count types**: trivia / weather / body / opposite all share the generic chip with text label. Verify long text labels (e.g., "ねむっている あいだに げんきを ためなおして") wrap or fit inside the 220px-tall chip. Consider tightening font-size or enabling `white-space: normal` if too long.
4. **`renderTrivia` video autoplay**: `ThinkingPono.mp4` is muted/playsInline so autoplay should work, but iOS sometimes blocks even muted video until first gesture. Since we already gate everything behind a title-tap, this should be safe — please confirm on real iOS Safari.
5. **Mode → category mapping**: `MODE_TO_CATEGORIES.know` excludes `shape_name / count_total / order_color`. If `selectedCategories` ends up all-false (e.g., a category has no easy questions), `buildPlaylist` returns `[]` and we fall back to mode-screen. Confirm this fallback is acceptable UX (currently silent; could add a toast). Also confirm difficulty is hard-coded to `easy` (no UI selector) — if reviewers want easy/normal/hard toggles back, the wiring is still there in `selectedDifficulty` but no buttons are rendered.
