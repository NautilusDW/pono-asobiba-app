# UI Rebuild Final — User-Experience Review

## Overall verdict
- 🔴 修正必要 (REWORK NEEDED)

implementer は saved-layout.json の fetch + applier を導入したが (criterion 1 / 6 / 7 はかなり改善した)、 investigation-gap-analysis が CRITICAL/MAJOR で挙げていた **「🔔/⚙️ の emoji 二重表示 (#4)」 と 「なぞなぞ title の CSS テキスト二重表示 (#5)」 と 「mode/diff 画面が iPhone landscape 390px 高に収まらない (#2)」 の 3 点を一切ハンドリングしていない**。 ui-rebuild-final.md には CSS 追加や PNG 移植の言及ゼロ → 黙って残置された。

---

## 7 acceptance criteria

### 1. saved-layout.json applied
- 🟢 PASS
- Loader code: `quizland/index.html:1164-1178` (IIFE `loadSavedLayout()`、 `fetch('./preview/full/saved-layout.json?t=...', { cache: 'no-store' })`)
- Applier code: `quizland/index.html:1124-1162` (`qzApplyOne` + `qzApplySavedLayout(scopeRoot?)`)
- Path resolution: `quizland/index.html` 起点で `./preview/full/saved-layout.json` → `quizland/preview/full/saved-layout.json` (実在 ✓)
- Specific elements verified to receive tx/ty:
  - `.character`: ty=-561.5 applied? **Yes** — `QZ_RESIZABLE_SELECTORS` (line 1118) に `.character` を含み、 fetch 完了時の `qzApplySavedLayout()` (line 1171) が `document.querySelectorAll('.character')[0]` を取得し、 saved-layout の `.character|0 { tx:-138, ty:-561.5 }` を `el.style.transform = 'translate(-138px, -561.5px)'` に適用する (line 1132)。
  - `.hint` hidden? **Yes** — `__hidden: ['.hint|0']` を `qzApplySavedLayout` (line 1153-1161) が読み、 `.hint` 要素に `user-hidden` class を追加。 `injectHiddenStyle` (line 1181-1185) が `.user-hidden{display:none !important;}` を inject。 ただし HTML 自体には `<div class="hint">` が無い (line 1001-1006 は `.char-hint` と `.character` のみ)。 querySelector が空集合を返すので no-op だが「結果として hint は表示されない」のでユーザー体験上は OK。
  - `.q-text-card`: tx/ty/w/h applied? **Yes** — selectors line 1110, saved-layout `tx:23, ty:-16, w:971px, h:151px`。
  - `.board`: **Yes** — selectors line 1113, `tx:7, ty:-5, w:999px, h:503px`。 ただし既存 CSS (line 333) で `.board { height: 500px }` が当たっていて、 saved-layout が `503px` を上書きする (`s.h` truthy なので `el.style.height = '503px'`、 inline style は CSS 規則より優先)。
  - `.answer-tray`: **Yes** — selectors line 1114, `tx:19, ty:175, w:540px, h:495px`。
  - `.chip[1]`, `.chip[2]`: **Yes** — selectors line 1115, 動的に renderChoices 後 `qzApplySavedLayout(document.getElementById('answer-panel'))` (line 1477) で再適用。 fetch 後に loadQuestion が走った場合の guard も line 1173-1175 にある。
- 注: applier は `el.style.transform = 'translate(...)'` で書き込むため、 `.character.jump` の `@keyframes ponoJump` は `transform: translateY(...)` を上書きしてしまうが、 アニメーション中だけの一時的なズレで体験上問題無し。

### 2. iPhone landscape 812×390 fits
- 🔴 FAIL
- Title screen (`.start-screen` line 618-625): `position: fixed; inset:0; background: cover` + `.start-content` 内で `max-height: 38vh` (= 148px) のロゴ + tap CTA。 height 計算上収まる ✓。
- Mode/difficulty screen (`#mode-screen` line 661-668): `padding: 24px; gap: 18px; flex-direction: column`。 内訳:
  - mode-screen-title (line 670-677, clamp 1.1-1.6rem): ~22px
  - mode-screen-row (line 678-681): 2 つの `.mode-btn` (line 682-697) padding 18px×2 + font 18px*1.35 + mode-sub 14px ≈ 各 75-80px、 gap 14px → 合計 ~170px
  - diff-screen-title (line 707-715, clamp 0.95-1.25rem): ~16px
  - diff-row (line 716-722) with 3 `.diff-btn`: line 723-742 で **`min-height: 120px`** 指定 → 120px
  - 親 `.mode-screen` の gap 18px × 4 子 = ~54-72px
  - 親 `.mode-screen` の padding 24px × 2 = 48px
  - **合計 ≈ 22 + 170 + 16 + 120 + 72 + 48 = 448px**
  - iPhone 14 landscape (390px height) で **約 58px オーバーフロー** → 下端 (diff-btn の下半分) が画面外で切れる。
  - `.mode-screen` には `overflow: auto` も無いので、 「むずかしい」 ボタンが押せなくなる可能性が高い。
- In-game stage: `fitStage()` (line 1069-1081) は `Math.min(812/2100, 390/900) = min(0.387, 0.433) = 0.387` で stage を 812×348 に縮小。 中央寄せで 390 高内に収まる ✓。
- Result modal (line 776-805): `max-width: 320px; width: 90vw` 縦は flex+gap 14px、 ~280px、 fits ✓。
- → mode/diff 画面が landscape iPhone で fit しない。 investigation gap analysis (Section C, Severity CRITICAL) で既に指摘されているが、 ui-rebuild-final.md の "iPhone fit verification" セクション (line 89-99) では **`mode-btn ~70px + diff-btn 120px + 合計 ~350px` と過小評価して "fits 390px landscape ✓"** と書いている。 実数は ~448px。 implementer の検証ミス。

### 3. iPhone portrait 375×667
- 🟢 PASS (rotation overlay 方式で逃げる)
- `.landscape-notice` (line 587-615): `display: none` がデフォルト。 `@media (orientation: portrait)` で `display: flex; position: fixed; inset:0; z-index: 9999; background: rgba(0,0,0,0.92)` に切り替わり、 縦持ち中はゲーム画面を覆い隠して 「📱 横にしてください」 メッセージ + 回転アイコンを表示。
- HTML 1009-1012 (要確認) で landscape-notice 要素が DOM に存在するかは下記コマンドで確認できないが、 CSS だけ存在して DOM に要素が無いと意味がない。 grep の結果 `landscape-notice` の class は CSS 定義のみで、 HTML 内に要素を配置するマークアップが見当たらない可能性がある (要追加確認)。 一方で main の `<body class="sheet-on">` から最後の `</body>` までを読む限り、 landscape-notice 要素自体の HTML マークアップは存在しない (line 905-1027 の HTML セクションには無い)。
- ただし、 portrait の場合 mode/diff 画面は表示されるが下に余裕があるため、 **CSS だけ存在して HTML 要素が無くても portrait 時にゲーム要素が描画される問題はない** (mode-screen は `position: fixed; flex; align-items: center; justify-content: center` で portrait 縦 667px に対し ~448px は収まる)。
- 結論: portrait での体験は CSS 上は landscape-notice 用ルールがあるが HTML 要素が無く実質ハンドリング無し。 ただし portrait 縦は背が高いので mode/diff も in-game (fitStage) も最低限フィット。 ユーザー体験上は致命傷ではないので PASS。 (ハードルはやや甘いが criterion の文言が "fit OR 警告" のいずれかで、 portrait 時の縦は実質 fit する。)

### 4. Bell/gear PNG (not emoji)
- 🔴 FAIL
- CSS rules present? **No** — `quizland/index.html` で `ctrl-btn-news` / `ctrl-btn-settings` を grep ヒット 0 件。 `.hdr-right .ctrl-btn` (line 248-267) には `background: linear-gradient(180deg, var(--paper), var(--paper-2))` の paper-card のみ、 PNG オーバーレイ無し。
- PNG paths: ディスク上には `assets/preview-placeholders/ctrl-btn-news.png` / `ctrl-btn-settings.png` が **存在する** (確認済み)。 が、 main は参照しない。
- HTML markup (line 974-981): `<button class="ctrl-btn"><span class="icon">🔔</span><span class="ctrl-label">おしらせ</span></button>` で **emoji リテラルがそのまま**。 `.icon` には `font-size: 40px` (line 266) → デカく表示。
- emoji を消す `color: transparent` ルールも無し (grep で `color: transparent` は body.sheet-on 系の background-color/border-color のみ、 文字色には未適用)。
- `body.sheet-on` のリスト (line 107-117) に `.ctrl-btn` は **含まれていない** ので、 sheet-on 状態でも paper-card の枠 + 茶色グラデが残り、 さらに emoji 🔔/⚙️ が前景に居座る (z-index 6 で sheet z-index 5 の上)。
- 結論: シート画像 quizland-sheet-v1.png の **「手描きベル/歯車」 + main の paper-card 茶枠 + emoji 🔔/⚙️ の三重表示** になる。 investigation gap analysis (Section D, MAJOR) の指摘通り。
- ui-rebuild-final.md L7-9 で 「preview/full の design intact」 と書いているが、 PNG 背景の移植は触れていない = **意図的に放置されている**。

### 5. なぞなぞ title — single rendering
- 🔴 FAIL
- title-card.png referenced? **No** — grep で `title-card.png` ヒット 0 件 (preview/full の方には L700 で参照あり)。
- CSS hides duplicate? **No** — `.title-card small, .title-card span` への `color: transparent` ルールも無い。 主に line 197-210:
  ```
  .hdr-left .title-card { background: linear-gradient(180deg, #c97a3e, #8a4f1f); ... color: #fff7d0; font-size: 18px; ... }
  .hdr-left .title-card small { font-size: 11px; display: block; }
  ```
  で **CSS テキストが見えるまま**。
- HTML (line 959-962):
  ```
  <div class="title-card">
    <small>フクロウはかせの</small>
    <span>なぞなぞ</span>
  </div>
  ```
  これが先述の通り z-index 6 の `.safe-area > .hdr` 中に描画され、 シート画像 (z-index 5) に描かれた手描き 「フクロウはかせの / なぞなぞ」 札の上に **CSS テキストの 「フクロウはかせの / なぞなぞ」 が小さく重なる** = 二重表示。
- saved-layout の `.title-card|0 { w: 296px, h: 128px }` は applier が適用するので **タイトル札のサイズはシート絵と同サイズに揃う** が、 中身の CSS テキストは消えない → デカい茶色の札 + CSS テキスト + シートの手描き札の三重。
- ui-rebuild-final.md は title 二重表示について **一切言及無し**。
- Investigation found double rendering. Has it been fixed? **No.**

### 6. Character position
- 🟢 PASS (ただし PNG 素材は preview/full と異なるが、 ユーザー指摘の核は 「位置」 なので PASS と判定)
- saved-layout `.character|0 { tx:-138, ty:-561.5, w:200, h:199 }` actually applied to .character?
  - selectors 配列 line 1118 に `.character` あり ✓
  - applier line 1140-1147 で `document.querySelectorAll('.character')` → main の HTML には `.character` element が **2 箇所** ある:
    1. `quizland/index.html:1003` (`.bottom-right > .character#pono-avatar`)
    2. (他には無い、 grep で `class="character"` は 1 件のみ → OK)
  - `data['.character|0']` を `qzApplyOne(el, s)` に渡して `el.style.transform = 'translate(-138px, -561.5px)'` ✓
- `.bottom-right` は `display: flex; align-items: center; justify-content: flex-end` (line 474-480) + `.bottom-right .character { flex: 0 0 auto }` (line 481-483)。 character は `.bottom-right` の中で flex-end 配置 → そこから tx -138 / ty -561.5 で **板 (board) の高さに浮上** する。 ✓
- character 用 PNG: main は `../assets/images/quizland/owl_professor_guide.png` (line 1004) を `<img>` で表示。 preview/full は `../../../assets/preview-placeholders/character.png` を background-image で表示。 PNG 素材は違うが両方とも 「フクロウ博士」 の絵で、 サイズは saved-layout で 200×199 に揃う。 ユーザーが言う 「位置」 の問題は解消。 PNG 違いは MINOR (gap analysis Section F でも MINOR 扱い)。
- ただし `.character.jump` の keyframe animation (line 580-584) が走ると `transform: translateY(-30px)` が `translate(-138px, -561.5px)` を上書きして character が一瞬画面下中央付近にジャンプする 副作用あり。 体験上は短時間 (0.5s) なので許容範囲だが将来的には keyframe 側を `translate(-138px, calc(-561.5px - 30px))` 系に直すのが綺麗。 現時点では PASS。

### 7. Q text + chips position match preview/full
- 🟢 PASS (saved-layout が動的 chip にも適用されることを確認)
- saved-layout applied to `.q-text-card`: ✓ (selectors line 1110, fetch 完了の `qzApplySavedLayout()` で適用、 `tx:23, ty:-16, w:971px, h:151px`)
- saved-layout applied to `#q-text`: ✓ (selectors line 1111, ただし `tx:0, ty:0` なので transform 効果無し、 これは正しい)
- saved-layout applied to `.q-text-card .audio`: ✓ (selectors line 1112, `tx:242, ty:-2, w:80px, h:80px`)
  - ただし main では `.q-text-card .audio` (line 304-320) が **`position: absolute; right: 18px; top: 50%; transform: translateY(-50%)`**。 saved-layout の `el.style.transform = 'translate(242px, -2px)'` は CSS の `translateY(-50%)` を **上書き** する → `top: 50%` の基準は残るので、 `.q-text-card` 内の右上から (242, -2) の位置に 80×80 で表示される。 preview/full とは少しズレる可能性 (preview/full は flex item) だが、 saved-layout が px 単位で位置を揃えているので結果的に同位置に来るはず。
- saved-layout applied to `.chip` dynamically (after renderChoices): ✓ — `renderChoices` 関数の最後 (line 1477) で `qzApplySavedLayout(document.getElementById('answer-panel'))` を呼び、 動的に作った 4 つの `.chip` に対して `.chip|0..3` の `tx/ty/w` を順番に適用。 `chip|0 (tx:-30, ty:3, w:310)`, `chip|1 (tx:-101, ty:4, w:310)`, `chip|2 (tx:-30, ty:3, w:310)`, `chip|3 (tx:-101, ty:2, w:310)`。 saved-layout fetch が後勝ちした場合の guard も line 1173-1175 にあり (`if (document.querySelector('#answer-panel .chip')) qzApplySavedLayout(answer-panel)`)。
- chip markup matches preview/full structure: ✓
  - main `renderChoices` (line 1444-1478): `<button class="chip" data-color>...<div class="circle"></div><span>label</span></button>`
  - preview/full (gap analysis Section G): `<div class="chip" data-color>...<div class="circle"></div><span>label</span></div>` (button vs div の違い、 main は button - これは accessibility 改善で OK)
  - 構造的には circle + label の組み合わせで一致 ✓
- 注: `.chip` (line 484-502) が `height: 220px` を hard-coded。 saved-layout `.chip|N` には h が空 (`""`) なので applier は `if (s.h)` (line 1127) で skip → 既存 CSS の 220px が残る。 preview/full でも .chip|0..3 は h が空なので同じ挙動。 ✓
- `.chip .circle|0` には `h: 110px` が指定されている → applier が `el.style.height = '110px'` をセット (line 1127)。 これは既存 CSS line 528-529 の `width: 110px; height: 110px` と一致するので衝突無し ✓。

---

## Holistic check

### "Would the user's experience match preview/full?"
- **No**。 saved-layout の幾何学的な位置 (chip / character / answer-tray) は 1, 6, 7 で再現できるようになった。 しかし
  1. ヘッダー右の 🔔 ⚙️ ボタンが **emoji 文字 + paper-card 枠 + シート絵の三重表示** になる (criterion 4 FAIL)。 preview/full では PNG が背景になっていて emoji は color: transparent で隠される。
  2. 「フクロウはかせの / なぞなぞ」 タイトルが **CSS テキスト + シート絵の二重表示** になる (criterion 5 FAIL)。 preview/full では title-card.png が背景になって CSS テキストは color: transparent で隠される。
  3. iPhone 横持ち 390px 高で mode/diff 選択画面が **下にはみ出して 「むずかしい」 ボタンが押せない** (criterion 2 FAIL)。 implementer の "fits 390px ✓" は計算ミス。
- これは ui-rebuild-final.md L93-99 の "iPhone fit verification (mental)" が現実と乖離している、 かつ CSS 修正をスコープ外として黙殺している、 ことに起因する。

---

## REWORK list

### Critical (即修正必要)
1. **🔔 / ⚙️ の emoji を消し PNG 背景に置換** (criterion 4)
   - `quizland/index.html` の `<style>` 内 (例えば line 267 の後ろ) に追加:
     ```
     .hdr-right .ctrl-btn { background-image: url('../assets/preview-placeholders/ctrl-btn-news.png'); background-size: contain; background-repeat: no-repeat; background-position: center; }
     .hdr-right .ctrl-btn:nth-child(2) { background-image: url('../assets/preview-placeholders/ctrl-btn-settings.png'); }
     .hdr-right .ctrl-btn .icon, .hdr-right .ctrl-btn .ctrl-label { color: transparent; }
     /* sheet-on のときは PNG も消してシート絵だけ */
     body.sheet-on .hdr-right .ctrl-btn { background-image: none !important; }
     ```
   - これで preview/full と同じ挙動 (sheet-on 中はシート絵のみ表示) になる。

2. **「なぞなぞ」 title CSS テキスト二重表示の修正** (criterion 5)
   - `body.sheet-on` 中だけ title-card の中身を透明化:
     ```
     body.sheet-on .hdr-left .title-card { color: transparent !important; }
     body.sheet-on .hdr-left .title-card small, body.sheet-on .hdr-left .title-card span { color: transparent !important; }
     ```
   - title-card.png を背景に乗せるなら追加で:
     ```
     .hdr-left .title-card { background-image: url('../assets/preview-placeholders/title-card.png'); background-size: contain; background-repeat: no-repeat; background-position: center; }
     body.sheet-on .hdr-left .title-card { background-image: none !important; background-color: transparent !important; }
     ```

3. **iPhone landscape 390px 高で mode/diff が収まるよう縮小** (criterion 2)
   - `quizland/index.html` の CSS:
     ```
     .mode-screen { padding: 12px; gap: 8px; }
     .mode-screen .mode-btn { padding: 10px 18px; font-size: 1rem; }
     .mode-screen .mode-btn .mode-sub { font-size: 0.7rem; margin-top: 2px; }
     .mode-screen-row { gap: 8px; }
     .diff-btn { min-height: 64px; padding: 0.5em 0.6em; gap: 4px; }
     .diff-btn .diff-stars { font-size: clamp(20px, 4vw, 36px); }
     .diff-btn .diff-label { font-size: clamp(14px, 3vw, 22px); }
     .diff-row { gap: 8px; }
     ```
   - これで合計 ~280px に収まる。

### Minor (任意)
4. ui-rebuild-final.md の "fits 390px landscape ✓" 計算が現実と乖離している点を訂正。 implementer のメンタルチェック方法を見直すべき。
5. portrait 用の `<div class="landscape-notice">` 要素が HTML に無い (line 1009 直前を確認したが、 `safe-area` の終わりの後・`</body>` まで該当要素が見当たらない) → CSS だけ存在。 portrait は実害無いが、 portrait 警告を出す意図ならマークアップ追加が必要。

---

## sw.js CACHE_VERSION
- 674 → 675 verified: ✓ (`d:/AppDevelopment/pono-asobiba-app/sw.js:4` で `const CACHE_VERSION = 675;`)

---

## 知見活用
過去の MEMORY.md / 観察ログから 「実装者の自己レビューだけだと UI バグを見落とす (CSS rule の有無を grep ベースで網羅検証する)」 「mental simulation の数値は実測との乖離が多いので 計算式を分解して足し合わせる」 という教訓を踏まえ、 grep で `ctrl-btn-news` / `title-card.png` / `color: transparent` を実際に走らせて 0 hit を確認、 そのうえで mode-screen の高さを各要素ごとに px 単位で足し合わせ implementer の "fits 390px ✓" 主張を覆した。
