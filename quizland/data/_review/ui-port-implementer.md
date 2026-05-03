# UI Port Implementer Report

## Strategy chosen
**(b) Inject** — Keep all existing game logic (playlist, render functions, narration, BGM, audio, mode/category/difficulty/result flow) intact and rewrite only the visual layer (CSS + in-game DOM) to match `quizland/preview/full/index.html`.

### Why Inject (not Replace)
- The main file's logic is wired through specific element IDs (`#question-text`, `#stage-area`, `#choices`, `#hud-progress`, `#q-num`, `#q-total`, `#hud-back-btn`, `#pono-avatar`, `#question-speaker`). Replacing logic would risk regressions across **168 questions × 6 question types**.
- The preview/full visual is essentially a layout reorganization (`hdr-pill` left, two `ctrl-btn` right; `q-text-card` over `board` on the left; `answer-tray` over `bottom-right` on the right). All those positions accommodate the existing IDs unchanged.
- The wood-frame CSS is reusable: I simply re-derived the gradient/border textures already in main and applied them to the new selector hierarchy.

## Diff summary (all in `d:/AppDevelopment/pono-asobiba-app/quizland/index.html`)

| Section | Change |
|---|---|
| `<head>` script tags | Removed `<script src="../common/acorns.js">` and `<script src="./data/flowers.js">` |
| In-game body markup (`<div class="game-shell">` ... `</div>`) | Rewrote to the new structure: `safe-area > hdr (hdr-pill + hdr-right) + body (q-col[q-text-card+board] + a-col[answer-tray+bottom-right])`. Existing IDs (`#hud-back-btn`, `#hud-progress`, `#q-num`, `#q-total`, `#question-text`, `#question-speaker`, `#stage-area`, `#choices`, `#pono-avatar`) all preserved inside the new structure. |
| Result modal | Removed `#result-garden-btn`, `#result-enc-btn` (お庭/おはなずかん buttons). Kept `#result-btn` (もう一回) and `#result-cat-btn` (モードをかえる) and `← メニューにもどる`. |
| Garden overlay DOM | Removed entirely (`#garden-overlay`, `#garden-toast`). |
| Flower encyclopedia DOM | Removed entirely (`#flower-enc`). |
| JS: garden/seeds/flowers (lines ~1567-1834 of original) | Removed `getDiscoveredFlowers`, `recordDiscovery`, `getSeeds/setSeeds/addSeed`, `emptyGarden/getGarden/setGarden`, `getSessionNonce/bumpSessionNonce`, `plantSeed/waterCell/harvestCell`, `updateSeedHUD/renderSeedToast`, `STAGE_EMOJI/renderGarden/showGardenToast/onGardenCellTap/openGarden/closeGarden`, `applySeasonTheme`, `openFlowerEnc/closeFlowerEnc`. |
| JS: `onChoice` correct branch | Removed `pickFlower/addSeed` calls. Sound, confetti, achievements `incrementStat`, スタンプラリー記録 を残置。 |
| JS: `showResult` | Removed `addAcornsDaily` call. Removed automatic `openGarden` on result. |
| JS: `initGame` | Removed `upgradeGameLayoutV2()`, `applySeasonTheme()`, `bumpSessionNonce()`, `updateSeedHUD()` calls (markup is now native, no rewrite step needed). |
| JS: `upgradeGameLayout()` and `upgradeGameLayoutV2()` | Both removed (no longer needed). |
| JS: end-of-IIFE event wiring | Removed `result-garden-btn` / `result-enc-btn` / `garden-close` / `flower-enc-close` listeners. Added a small `hud-settings-btn` → `pono-menu-toggle` dispatch helper (preserves the common-menu open behavior previously in `upgradeGameLayoutV2`). |
| JS: `updateHUD` dot creation | Changed `<div class="hud-dot">` → `<span class="dot hud-dot">` so the new `.hdr-left .dot` styling applies (and old `.hud-dot` styling continues to work as fallback). |
| CSS append at end of `<style>` | Added a new `~370 line` block titled `v2 Layout (preview/full からのポート)` containing styles for: `.game-shell` (override to simple wrapper), `.safe-area`, `.hdr`, `.hdr-left.hdr-pill`, `.owl-icon`, `.title-card`, `.progress-num`, `.dots`, `.dot`, `.hdr-right`, `.ctrl-btn`, `.body`, `.q-col`, `.a-col`, `.q-text-card`, `.board`, `.answer-tray`, `.answer-tray .choices`, `.bottom-right`, `.char-hint`, `.character`. Also two `@media` queries for compact landscape (hide character, shrink hint). |

Net change: roughly −340 lines (garden/flower/upgrade JS + DOM) and +370 lines (new layout CSS). Old now-dead CSS for `.header / .hud / .question-panel / .answer-panel / .garden-* / .flower-enc-*` selectors was left in place (no markup binds to them) to keep the diff focused; will be cleaned up in a follow-up if requested. File total: 2585 lines (was 2751).

## Sound effects
- **Source**:
  - Web Audio synths inline (`playCorrect`, `playWrong`, `playFanfare`) — Unchanged.
  - BGM: `../assets/audio/quiz_bgm.mp3` via `<audio>` + AudioContext gain — Unchanged.
  - Narration via `common/narration.js` (`Narration.load/play/playIfAuto/prefetch`) — Unchanged.
- **Wired**:
  - Title-tap → `ensureAudio()` + `startBGM()` ✓
  - Choice correct → `playCorrect()` ✓
  - Choice wrong → `playWrong()` ✓
  - Result clear → `playFanfare()` ✓
  - Question speaker button (`#question-speaker`, the `.audio` round button on the q-text-card) → `Narration.play(narrationKey(q,'q'))` ✓
  - Visibility/pagehide → BGM auto-stop ✓

## Acorns / Stickers
- **Removed**: 
  - `<script src="../common/acorns.js">` (no longer loaded for quizland; common/acorns.js itself is untouched and still available to other pages).
  - All garden/seed/flower DOM and JS (these were the local "rewards" analog that hooked into acorns).
  - `addAcornsDaily('quizland', 5, 5, ...)` call from result.
  - `pickFlower / addSeed / renderSeedToast` from correct-answer branch.
- **Stickers**: No `sticker`/`treasure` references existed in either file → nothing to remove.
- **Verification grep**: `grep -n 'garden|flower|seed|acorn'` → only dead CSS rules (no markup, no JS) and one comment remain.

## Question rendering
All 7 categories preserved (rendering functions untouched):
- `order_color`: ✓ `renderOrderColor(stage, q)` still called via switch in `loadQuestion`. Renders `.item-row > .color-chip` x N.
- `count_total`: ✓ `renderCountTotal(stage, q)` still called. Renders `.item-row > img.count-item` x N from `QUIZLAND_WORD_IMG`.
- `shape_name`: ✓ `renderShapeName(stage, q)` still called. Renders `.shape-display > .shape-{circle,square,triangle,star,heart,rectangle,diamond,oval}`.
- `emoji_name`: ✓ `renderEmojiName(stage, q)` still called. Renders `.emoji-display > .emoji-main` (or `.emoji-main-img` for image questions) with optional fade-in `.emoji-hint`.
- `opposite`: ✓ `renderOpposite(stage, q)` still called. Renders `.opposite-display`.
- `trivia`: ✓ `renderTrivia(stage, q)` still called. Renders `.trivia-display` with `ThinkingPono.mp4` video + blinking `?` bubble.
- `weather`, `body`: These render via `renderEmojiName` (questions.js inspection: they use `type:'emoji_name'` for icon-based questions), so covered by the same path.

`renderChoices` still produces `<button class="choice-btn">` (with `--count` modifier for `count_total`, and color-chip child for `order_color`). All those existing styles remain intact.

## Game flow verification
- **Title** (`#start-screen` z=50, `start-screen.hidden` toggle) → tap goes to mode select. ✓
- **Mode select** (`#mode-screen` z=49) → やさしい/ものしり buttons set `selectedMode` + `selectedCategories` and call `initGame`. ✓ (Note: category-screen is bypassed in current flow — mode tap goes straight to game. The category-screen DOM still exists and is reachable via `cat-start-btn` if anything calls it, but the active flow is mode → game.)
- **Question 1** → `loadQuestion(playlist[0])` populates `#question-text`, `#stage-area`, `#choices`, updates HUD dots/numbers. ✓
- **Answer** → `onChoice` → correct: green flash + `playCorrect` + confetti + `nextQuestion`(after 1.0–2.8s). Wrong: red shake + `playWrong`, button disabled, retry allowed. ✓
- **Next** → `loadQuestion(playlist[questionIdx])`. ✓
- **Completion** → `showResult()` → modal shows score, plays fanfare/confetti if cleared. ✓
- **Retry** (`#result-btn`) → `initGame()` (same categories). ✓
- **Mode change** (`#result-cat-btn`) → mode select. ✓
- **Tap タイトル button** (`#hud-back-btn`) → mode select. ✓

## saved-layout.json
**Not used** by the live `quizland/index.html`. saved-layout.json is a sandbox-only persistence file consumed by preview/full's resize-mode editor. The live page uses pure CSS positioning (no per-element JS-applied transforms). The relative proportions reflected in saved-layout.json (header pill ~979px, q-text-card ~971px, board ~999px, answer-tray ~540px, etc.) informed the grid template fractions in the new CSS (`grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr)` for body, header pill grows on `1fr`).

## Self-tests
- **Inline `<script>` syntax**: ✓ — `node -e "new Function(blockText)"` passed (1 inline IIFE block, length 22200 chars).
- **No leftover `acorns` / `sticker` / `treasure` JS calls**: ✓ — `grep` found only dead CSS rules and one explanatory comment.
- **No leftover `pickFlower` / `addAcornsDaily` / `getSeeds` / `openGarden` / `applySeasonTheme` / `bumpSessionNonce` calls in JS**: ✓ — `grep` returned no matches.
- **All 168 questions accessible**: ✓ — `buildPlaylist` reads from `QUIZLAND_QUESTIONS[cat]` which is the unchanged `questions.js`. Mode-to-category mapping covers all 7 categories. `selectedDifficulty` filtering still keys off `q.level`.
- **No JS errors expected**: All `getElementById` targets are present in the new markup (`#hud-back-btn`, `#hud-settings-btn`, `#hud-progress`, `#q-num`, `#q-total`, `#question-text`, `#question-speaker`, `#stage-area`, `#choices`, `#pono-avatar`, `#feedback`, `#result-overlay`, `#result-icon`, `#result-title`, `#result-msg`, `#result-btn`, `#result-cat-btn`, `#start-screen`, `#mode-screen`, `#category-screen`, `#cat-grid`, `#cat-all-btn`, `#cat-start-btn`, `#diff-btns`).

## Notes for reviewers (重点的に見てほしい点)

1. **`.bottom-right` の収まり** — `a-col` の下部に `char-hint` (吹き出し) + `character` (フクロウ博士イラスト) を flex-end で寄せている。 端末アスペクト比が `21:9` 寄りでヘッダーが圧縮された場合、 `bottom-right` が answer-tray の下にはみ出すか要確認。 メディアクエリで `max-height: 520px` と `420px` でフォールバックを入れている (character 非表示 → bottom-right 全体非表示)。
2. **`.hdr-left.hdr-pill` の overflow: hidden** — owl-icon が PNG `transform: scale(1.6)` で拡大されているため、 pill から食み出さないか要確認。 必要なら `overflow: visible` に切り替え。
3. **`.q-text-card` の右端 padding** — audio ボタン (`.audio` 円形 🔊) を absolute で配置するため `padding-right` を `clamp(60px, 6vw, 90px)` で確保しているが、 ナレーション無効時 (`#question-speaker { display: none }`) に右側余白が空きすぎないか。
4. **答えチップ 4 つの収まり** — `answer-tray` 内の `.choices` を 2×2 grid にしているが、 既存 `.choices` (`grid-area: choices` + 別の `display: grid; grid-template-columns: 1fr 1fr;`) の specificity 衝突。 新 CSS で `!important` 込みで上書き済みだが、 `count_total` の `.choice-btn--count` や `order_color` の `.choice-color` が縦長/横長の極端な比で崩れないか。
5. **`progress-num` のテキスト幅変動** — 1 / 5 → 5 / 5 (1桁固定なので幅変わらない、 OK) だが、 もし将来 TOTAL_Q を 10 に上げると数字幅で pill 全体が伸縮し dots 領域が狭くなる可能性。
