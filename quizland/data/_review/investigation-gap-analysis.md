# Investigation: preview/full vs main quizland/index.html — Gap Analysis

> Investigator note: 結論を先に書く。  ユーザーが感じている「ぜんぜん違う」は **錯覚ではなく事実**。 v2 implementer の主張する "Replace" は **マークアップ構造とCSSは Replace されたが、 saved-layout.json の位置データは完全に無視されている**。 加えて pre-game 画面 (mode-screen + diff-row) は preview/full に **そもそも存在しない後付けレイヤー** で、 iPhone の portrait viewport に対しても何の対策もされていない。

## Executive summary
- **何が一番ヤバいか (one-liner)**: `saved-layout.json` を **誰もロードしていない** ので、 ユーザーが UIツールで精密に置いた `tx/ty/w/h` が `quizland/index.html` 上で 1 つも反映されていない。
- 重大度ランキング:
  - **Critical** (体験を完全に壊す):
    1. saved-layout.json を main がロード/適用していない (G/A の根本原因)
    2. mode-screen + diff-row が portrait iPhone で fit しない (固定 max-width 360px の縦並び + 120px min-height × 3)
    3. preview/full には mode-screen / diff-row が存在しない → main は preview/full の上にオーバーレイで「あとから足した別物」(Inject in disguise の傍証)
  - **Major** (見た目が崩れる):
    4. 🔔 / ⚙️ が emoji である (preview/full は CSS で `ctrl-btn-news.png` / `ctrl-btn-settings.png` の背景画像を被せて emoji を非表示にしているが、 main にはその CSS がない)
    5. owl-icon が PNG (`owl_professor_guide.png`) を `transform: scale(1.6)` で拡大表示しているが、 preview/full は 専用 PNG `owl-icon.png` を background-image として要素サイズに contain で乗せている
    6. character (フクロウ博士) も同じく専用 PNG `character.png` ではなく `owl_professor_guide.png` を `<img>` で重複表示
  - **Minor** (装飾の差):
    7. progress-mark.png オーバーレイ用 ::before が main にない
    8. hint (💡 よく見て…) 要素が main の DOM に存在しない (saved-layout は `__hidden: ['.hint|0']` で隠す前提)
    9. portrait 警告は main にあるが、 preview/full は warning を出さず scale-only (どちらも一長一短だが整合していない)

---

## A. saved-layout.json

### What it contains
4136 bytes、 17 個の resizable element の `{w, h, tx, ty}` 位置データ + 4 つの guide line + `--header-h` + `__texts` (編集テキスト) + `__hidden` (非表示要素キー) を保持。

主要キー一覧:
```
.hdr-left|0                  → tx 16, ty 8, 979×142
.hdr-left .owl-icon|0        → tx 17, ty 2, 127×127  ← 重要: 64px ではなく 127px
.hdr-left .title-card|0      → tx -3, ty 3, 296×128  ← かなり大きい (元 CSS は font-size 18px)
.hdr-left .progress-num|0    → tx -66.89, ty 5, 119×62.92
.hdr-left .dots|0            → tx -60, ty 5, 218×28
.hdr-right .ctrl-btn|0       → tx -131, ty -12  ← 大きく左 + 上にオフセット
.hdr-right .ctrl-btn|1       → tx -131, ty -12
.q-text-card|0               → tx 23, ty -16, 971×151
#q-text|0                    → tx 0, ty 0
.q-text-card .audio|0        → tx 242, ty -2, 80×80  ← 80px (CSS は 48px)
.board|0                     → tx 7, ty -5, 999×503
.answer-tray|0               → tx 19, ty 175, 540×495  ← ty +175 (大きく下にずれる)
.chip|0                      → tx -30, ty 3, 310px wide
.chip|1                      → tx -101, ty 4, 310px wide  ← 1個目と全く違う tx (-101 vs -30)
.chip|2                      → tx -30, ty 3
.chip|3                      → tx -101, ty 2
.chip .circle|0              → h 110px (個別サイズ指定)
.hint|0                      → tx 0, ty 1, 442×83  + __hidden に登録 (= display:none)
.character|0                 → tx -138, ty -561.5, 200×199  ← ty -561.5 (board の上まで上昇!)
.char-hint|0                 → tx -125, ty -568, 326×133  ← ヒント吹き出しも同じ高さに
__headerH                    → 142px (CSS は 150px)
__texts                      → "なぞなぞ" / "フクロウはかせの" / "1 / 5" / "おしらせ" / "せってい" / 各チップ "あか/あお/きいろ/みどり" など全テキスト
__hidden                     → [".hint|0"]  (= 💡 hint バブルは消す)
__guides                     → 水平 81 / 1158, 垂直 271
```

**重要な観察**: フクロウ博士 (`.character`) の `ty: -561.5` は `quizland/preview/full/index.html` の元グリッドだと `bottom-right` (a-col の下) から 561px **上** に移動 = 完成図ではフクロウが answer-tray の **真上 (board と並ぶ高さ)** に来るレイアウト。 char-hint も同じ。 **ユーザーが UI ツールで頑張ってここに動かした位置が、 main では完全に無視されている。**

### How preview/full uses it
`d:/AppDevelopment/pono-asobiba-app/quizland/preview/full/index.html`:
- L2369-2376 `loadSavedLayoutFromServer()`: `fetch('/quizland/preview/full/saved-layout.json?t=...')` で取得
- L2433-2459 `loadResizeState()`: localStorage の `quizland_preview_sizes_v1` を読んで `RESIZABLE_SPEC` の各セレクタにマッチする要素に `style.width/height/transform: translate(tx, ty)` を当てる + `applyEditableTexts(data.__texts)` で `<span class="editable-text">` のテキストを書き換える + `data.__hidden` を `el.classList.add('user-hidden')` で `display: none !important` にする
- L3393-3404 起動時: `(async () => { const serverData = await loadSavedLayoutFromServer(); if (serverData) localStorage.setItem(RESIZE_KEY, JSON.stringify(serverData)); loadResizeState(); ... })()` を **DOMContentLoaded 相当のタイミングで自動実行**。  これにより saved-layout.json が常に効く。
- `RESIZABLE_SPEC` (L2187-2206): 17 セレクタの定義表。

### How main uses it
**まったく使っていない**。
- `quizland/index.html` 全体で `saved-layout` / `loadResizeState` / `RESIZABLE_SPEC` / `__texts` / `__hidden` のいずれの文字列も grep ヒットゼロ。
- main の position/size はすべて CSS hardcoded (`d:/AppDevelopment/pono-asobiba-app/quizland/index.html` L181-238 の `.hdr-left .owl-icon { width: 64px; height: 64px; ... }` 等)。
- ui-port-implementer-v2.md L78 に書いてある通り **「Layout-select / slot-size / arrow-stroke / saved-layout.json: removed from main runtime」** とハッキリ書いてある。 つまり「Replace」と言いながら、 preview/full の出力の「最終形を決めている `saved-layout.json` 適用」だけ意図的に外した = **元のレイアウト計算結果は再現されない**。

### Gap severity
**CRITICAL**。 ユーザーが「位置がぜんぜん違う」と言っているのは saved-layout.json の `tx/ty` (例: `.character` ty -561.5、 `.answer-tray` ty +175) が一切適用されていないため。 「後乗せの選択肢/問題文の位置」=`.chip` の `tx -30 / -101` や `.q-text-card` の `tx 23 / ty -16` も全部失われている。

---

## B. Viewport / responsive

### preview/full's approach
- **meta viewport** (L5): `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
- **canvas size**: `--canvas-w: 2100px / --canvas-h: 900px` (21:9), `--safe-w: 1600px / --safe-h: 900px` (L18-22)
- **transform scale logic** (L3409-3421 `fitStage()`):
  ```js
  const scale = Math.min(w / stageW, h / stageH);
  stage.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  ```
- **Phone behavior**: `body.preview-mode` クラスを付けて `.stage-wrap` を `position: fixed; inset: 0;` (L611-618)、 `.stage` を絶対配置 + `transform` で letterbox 中央 fit。 `enterPreview()` は `?preview=1` クエリで自動起動 (L3443-3445)。 通常は editor mode で起動するためキャンバスがそのまま 2100×900 で表示される。 `body.preview-mode` 中は `.toolbar { display: none; }` でツールバー非表示。

### main's approach
- **meta viewport** (L5): `<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">` ← `user-scalable=no` 追加
- **canvas size**: 同じ 2100×900 / 1600×900 (L49-52)
- **transform scale logic** (L1068-1084 `fitStage()`): preview/full とまったく同じ計算ロジック。 起動時に即実行 (L1084 `fitStage();`)。 `.stage-wrap` は `position: fixed; inset: 0;` 常時 (L83-87)。
- **Phone behavior**: ロジックは一致。 `landscape-notice` (L587-615) で **portrait のときオーバーレイ警告** を出す (`@media (orientation: portrait)`)。

### Gap severity
**MINOR**。 stage の transform fit は同じ。 ただし mode-screen / diff-row は **stage の外に position: fixed で重ねている** ので fitStage() の影響を受けない (= portrait でも親要素のサイズで動く)。 これは C で詳細。

---

## C. Mode/Difficulty sizing

### preview/full
- **mode-screen / diff-row は preview/full に存在しない**。 grep `mode-screen|mode-btn|diff-btn` → 0 hit (preview/full)。 上の B で見た通り preview/full は editor 用でゲームの pre-game 画面は概念ごと無い。
- ui-port-implementer-v2.md L80 でも `Pre-game screens (start + mode): preview/full has none. We layer them as fixed-position overlays on top of the stage` と認めている。

### main (`d:/AppDevelopment/pono-asobiba-app/quizland/index.html`)
- L661-674 `.mode-screen { position: fixed; inset: 0; padding: 24px; gap: 18px; }`
- L678-681 `.mode-screen-row { display: flex; flex-direction: column; gap: 14px; max-width: 360px; }`
- L716-722 `.diff-row { display: flex; flex-direction: row; gap: 16px; max-width: 720px; justify-content: center; }`
- L723-742 `.diff-btn { flex: 1 1 0; min-height: 120px; padding: 1em 0.6em; ... }`

### iPhone 14 (375 × 812 px portrait) で fit するか?
ざっくり計算:
- mode-screen-title (clamp 1.1-1.6rem): ~24px (テキスト1行)
- mode-screen-row: 2 ボタン × 高さ 約 72px (padding 18px × 2 + 行高 1.35 × 2行分) + gap 14px = **約 158px**
- diff-screen-title: ~20px
- diff-row: **min-height 120px** (= 確実に最低 120px、 stars + label 入る)
- 全体 padding 24px × 2 = 48px
- gap 18px × 3 (4 要素間) = 54px

合計: 24 + 158 + 20 + 120 + 48 + 54 = **約 424px**。  iPhone SE (568px portrait のうち上部 statusbar/notch 引いた height 约 540px に対しては OK だが、 portrait 状態だと **landscape-notice が portrait 時だけ表示** されるので、 ユーザーが見ているのは **ほぼ確実に landscape** (横持ち) のはず。

**landscape iPhone (例 iPhone 14 → 844 × 390)** だと:
- height = 390px しかない
- 24 + 158 + 20 + 120 + 48 + 54 = 424px > 390px → **オーバーフロー**
- mode-screen は `display: flex; align-items: center; justify-content: center;` で中央寄せだが overflow なし → **下が切れる**

**実機で「mode 選択画面が iPhone に収まらない」というユーザーの主張は事実 (横持ちで diff-btn の min-height: 120px が原因)**。 implementer は difficulty-picker-redesign で min-height を 120px に上げたが、 portrait 警告を出したまま landscape に対しては検証していない (preview/full には mode-screen が無いのでそもそも検証する基準がない)。

### Gap severity
**CRITICAL** (ユーザー指摘 1 と直結)。 fix は `.diff-btn { min-height: 64px; }` 程度に下げる + `.mode-screen { gap: 10px; }` + clamp() でフォントを小さく。

---

## D. Bell / Gear buttons

### preview/full markup (L1316-1319)
```html
<div class="hdr-right">
  <div class="ctrl-btn"><span class="icon">🔔</span><span class="editable-text" contenteditable="true">おしらせ</span></div>
  <div class="ctrl-btn"><span class="icon">⚙️</span><span class="editable-text" contenteditable="true">せってい</span></div>
</div>
```
**マークアップ自体は emoji 🔔 / ⚙️ を含む**。 ただし CSS が emoji を見えなくして PNG を表示する仕掛けが効いている:

preview/full L723-724 (placeholder image verification mode、 default で `body` が `.show-bbox` 等のクラスを持っていなくても **このルールは要素セレクタ specificity でデフォルト適用**):
```css
.hdr-right .ctrl-btn:nth-child(1) { background-image: url('../../../assets/preview-placeholders/ctrl-btn-news.png') !important; }
.hdr-right .ctrl-btn:nth-child(2) { background-image: url('../../../assets/preview-placeholders/ctrl-btn-settings.png') !important; }
```
さらに L753-760:
```css
.hdr-left .title-card small,
.hdr-left .title-card span,
.hdr-left .progress-num,
.hdr-right .ctrl-btn > *,    /* ← emoji を含む全 child を透明に */
.q-text-card .audio,
.character {
  color: transparent !important;
}
```
**つまり emoji の `<span class="icon">🔔</span>` は `color: transparent` で消され、 `.ctrl-btn` 自体に `ctrl-btn-news.png` の手描きベル画像が背景として乗る**。

ただし preview/full はさらに `body.sheet-on` で再度 background-image を消す (L904-914) ので、 sheet-on 状態だと **emoji も PNG も見えず、 シート画像 quizland-sheet-v1.png に描かれているベル/歯車だけが見える**。  preview/full のデフォルトは sheet-on かどうか不明だが、 saved-layout の運用を見るに `__hidden` などで sheet-on 想定の調整がされている。

### main markup (`d:/AppDevelopment/pono-asobiba-app/quizland/index.html` L973-982)
```html
<div class="hdr-right">
  <button id="hud-back-btn" type="button" class="ctrl-btn" aria-label="タイトルへ もどる">
    <span class="icon" aria-hidden="true">🔔</span>
    <span class="ctrl-label">おしらせ</span>
  </button>
  <button id="hud-settings-btn" type="button" class="ctrl-btn" aria-label="せってい">
    <span class="icon" aria-hidden="true">⚙️</span>
    <span class="ctrl-label">せってい</span>
  </button>
</div>
```
main には:
- `ctrl-btn-news.png` / `ctrl-btn-settings.png` の **CSS background-image ルールが存在しない** (grep `ctrl-btn-news\|ctrl-btn-settings` → 0 hits)
- `color: transparent` で emoji を消すルールも **無い**
- `body.sheet-on` で background-image を消すルールは L107-117 にあるが、 そもそも background-image が無いので意味なし

→ main では **emoji 🔔 / ⚙️ が普通に表示される + paper-card 風の `.ctrl-btn { background: gradient + wood-dark border }` の上に乗る** 状態。 シート画像 (quizland-sheet-v1.png) には手描きのベル/歯車が描いてあるはずなので、 シートの上に emoji が **二重表示** で重なって見えている可能性が高い。

### asset paths
- preview/full: `../../../assets/preview-placeholders/ctrl-btn-news.png`, `../../../assets/preview-placeholders/ctrl-btn-settings.png` (両方 disk 上に存在 — A 章末参照)
- main: 参照ナシ

### Gap severity
**MAJOR**。 ユーザー指摘 4 (emoji っぽく見える) の直接原因。 シート画像にベル/歯車のイラストがあるので、 main では「emoji + シートの絵」の二重写しになる。 ただし `body.sheet-on` 中は preview/full でも PNG は消えてシートだけが見える設計なので、 main では **emoji を消す `color: transparent` ルールを足す**だけで preview/full と同じ「シートだけが見える」状態になる。

---

## E. なぞなぞ title

### preview/full
L1300-1303:
```html
<div class="title-card">
  <small class="editable-text" contenteditable="true">フクロウはかせの</small>
  <span class="editable-text" contenteditable="true">なぞなぞ</span>
</div>
```
- CSS L189-202: `.title-card { background: linear-gradient(brown); border: 3px solid wood-dark; padding: 4px 14px; font-size: 18px; ... }`
- L753-760: `.title-card small, .title-card span` は **`color: transparent`**！  つまりテキスト自体は描画されない。 代わりに `.title-card` 自体が `background-image: url('title-card.png')` (L700) で **「フクロウはかせの / なぞなぞ」と書かれた手描き札 PNG** を表示する。
- saved-layout は `__texts` でテキスト内容を上書きできるが、 `color: transparent` を解除する処理は無い。
- saved-layout に `.hdr-left .title-card|0: w 296px, h 128px, tx -3, ty 3` (大きい！  CSS デフォルトは padding 込みで ~80×40 程度) → ユーザーが UI で **タイトル札を大きく拡大していた**。

### main
- L959-962:
  ```html
  <div class="title-card">
    <small>フクロウはかせの</small>
    <span>なぞなぞ</span>
  </div>
  ```
- CSS L197-210: 同じ茶色グラデ札、 ただし `color: #fff7d0` で **テキスト表示**。 `background-image: url('title-card.png')` は **無し**。
- saved-layout の `w: 296px / h: 128px / tx: -3 / ty: 3` は **適用されない**。
- 結果: 札 (CSS の linear-gradient brown) の上に「フクロウはかせの なぞなぞ」のテキストが小さく (font-size 18px / small font-size 11px) 描画される。 シート画像 quizland-sheet-v1.png にもタイトルが描かれているはずで、 **シートと CSS テキストが二重表示** になっている可能性が高い。

ユーザー指摘 5 (なぞなぞ title 消えた) は、 厳密には「消えた」ではなく **「小さい / 古い CSS のまま、 シートに描かれているデカい "なぞなぞ" 文字とずれている」**。 saved-layout の 296×128 を適用すれば シートのフォントサイズと整合するはず。

### Gap severity
**MAJOR**。 saved-layout 不適用の副作用。

---

## F. フクロウ博士 character

### preview/full
- L1346-1348:
  ```html
  <div class="character"></div>
  ```
  (空 div、 emoji も img も無し)
- CSS デフォルト L470-480: `radial-gradient` で紫の卵型 (background)、 width 200px / height 220px。
- placeholder image rule L732: `.character { background-image: url('../../../assets/preview-placeholders/character.png') !important; }`
  ↑ これが **手描きのフクロウ博士 PNG**。 `character.png` はディスク上に存在。
- L758: `.character { color: transparent !important; }`
- saved-layout: `.character|0: w 200, h 199, tx -138, ty -561.5` ← **大きく上 (board の高さ) に移動**
- `body.sheet-on` でも `.character` の background-image は **消されない** (L904 のセレクタリストに含まれない) → シート + character.png が両方乗る? → 実際は character.png はシートに描かれた "フクロウ博士" の上にきれいに重なる想定。

### main
- L1003-1005:
  ```html
  <div class="character" id="pono-avatar">
    <img src="../assets/images/quizland/owl_professor_guide.png" alt="フクロウ博士">
  </div>
  ```
  ← **PNG が `<img>` で直接挿入されている。 しかも owl_professor_guide.png** (preview/full の `character.png` ではなく、 別の owl-icon と同じ素材を流用)。
- CSS L566-575: `.character { width: 200px; height: 220px; ... } .character img { width: 100%; height: 100%; object-fit: contain; }`
- saved-layout の `tx: -138, ty: -561.5` は **未適用** → main では `.bottom-right` の右下、 答えチップの直下にフクロウが小さく表示される。
- preview/full の意図: フクロウは **answer-tray の真上 (board と並ぶ高さ)** に置かれるべき (ty -561.5 は ~561px 上に移動)。

### Gap severity
**MAJOR**。 ユーザー指摘 6 (位置が違う) の直接原因。 さらに使っている素材 PNG が違う (`character.png` vs `owl_professor_guide.png`)。

---

## G. Question text card / choices positioning

### preview/full
- DOM 構造 (L1322-1351):
  ```
  .body
    .q-col
      .q-text-card → 中に <span id="q-text">まんなかは なにいろ？</span> + <span class="audio">🔊</span>
      .board#board (中身は editor で空)
    .a-col
      .answer-tray
        .answer-panel
          .chip[data-color="red"] × 4  (静的にハードコード「あか/あお/きいろ/みどり」)
      .bottom-right
        .hint (💡 よく見て…)  ← __hidden で消す
        .char-hint (ヒント！)
        .character (フクロウ博士)
  ```
- 各要素は CSS の grid + flex で「ざっくり」配置 → その上に saved-layout の `tx/ty` で **px 単位のオフセット** をかけて手描きシート画像と pixel-perfect に揃える。
- 例: `.chip|0 tx: -30, ty: 3` / `.chip|1 tx: -101, ty: 4` ← 1個目 (左上) と 2 個目 (右上) で **違う tx**。 これは grid セルの中で「左の chip は右寄せ」「右の chip は左寄せ」のような微調整。 saved-layout が無いと grid-template-columns: 1fr 1fr の素直な等分配置になり、 シートに描かれたチップの位置と大幅にずれる。
- `.q-text-card|0 tx: 23 / ty: -16` も同様の微調整。
- `.answer-tray|0 tx: 19, ty: 175, w: 540, h: 495` ← **a-col の中で大きく下 (ty +175)** に移動 + 幅 540 (デフォルトは grid 700 セル full width)。 これによりトレイの上に `.character` が来るスペースができる。

### main
- DOM 構造はほぼ同じ (q-text-card + board + answer-tray + bottom-right)。
- ただし `.q-text-card .audio` の position が **違う**:
  - preview/full L313-324: `.audio { width: 48px; height: 48px; flex: 0 0 auto; ... }` (flex item)
  - main L304-320: `.audio { ... position: absolute; right: 18px; top: 50%; transform: translateY(-50%); }` (absolute) → preview/full の流儀と違う
- `.answer-panel` は同じ `grid-template-columns: 1fr 1fr` で `.chip` 4 個。
- saved-layout の chip 1〜4 / q-text-card / answer-tray の `tx/ty` は **全て無視**。
- 結果: シート画像にユーザーが描いた手描きの「答え札 4 つ + 問題文札」の位置と、 CSS-positioned な実 DOM 要素の位置が **px 単位で大きくズレる**。

ui-port-implementer-v2.md L86 で `「ざっくり」per preview/full's user note` と書いてあるが、 preview/full の "ざっくり" は **saved-layout の tx/ty 込みで「ざっくり」だった** = main の "ざっくり" は **その下地すら無いベタ grid** で、 ずれの量が 100px 単位になる。

### Gap severity
**CRITICAL**。 ユーザー指摘 2, 3 (位置がぜんぜん違う、 UIツールで頑張った成果が反映されない) と直結。 これが saved-layout 不適用の最も視覚的に目立つ症状。

---

## H. Asset reference diff

| asset | in preview/full? | in main? | 備考 |
|---|---|---|---|
| `assets/preview-placeholders/stage-bg.png` | ✓ (L115) | ✓ (L93) | 背景。 同じ |
| `assets/preview-placeholders/quizland-sheet-v1.png` | ✓ (L897) | ✓ (L103) | シート手描き 1 枚絵。 同じ |
| `assets/preview-placeholders/hdr-pill.png` | ✓ (L698) | **✗** | ヘッダー左ピル全体の絵。 `body.sheet-on` で消える前提なので影響小 |
| `assets/preview-placeholders/owl-icon.png` | ✓ (L699) | **✗** | フクロウ博士アイコン (ヘッダー)。 main は別 PNG を流用 |
| `assets/preview-placeholders/title-card.png` | ✓ (L700) | **✗** | 「フクロウはかせの / なぞなぞ」の手描き札。 main 不在 → CSS テキスト依存 |
| `assets/preview-placeholders/progress-num.png` | ✓ (L701) | **✗** | 1/5 の手描き札 |
| `assets/preview-placeholders/dot.png` | ✓ (L702) | **✗** | progress dot |
| `assets/preview-placeholders/progress-mark.png` | ✓ (L714, ::before) | **✗** | dots を囲む手描き枠オーバーレイ |
| `assets/preview-placeholders/ctrl-btn-news.png` | ✓ (L723) | **✗** | 🔔 ボタンの手描き絵 |
| `assets/preview-placeholders/ctrl-btn-settings.png` | ✓ (L724) | **✗** | ⚙️ ボタンの手描き絵 |
| `assets/preview-placeholders/q-text-card.png` | ✓ (L725) | **✗** | 問題文の手描き札 |
| `assets/preview-placeholders/audio.png` | ✓ (L726) | **✗** | 🔊 ボタン手描き絵 |
| `assets/preview-placeholders/board.png` | ✓ (L727) | **✗** | 紙ボード手描き |
| `assets/preview-placeholders/answer-tray.png` | ✓ (L728) | **✗** | 答えトレイ |
| `assets/preview-placeholders/chip.png` | ✓ (L729) | **✗** | チップ手描き |
| `assets/preview-placeholders/circle.png` | ✓ (L730) | **✗** | 色マル手描き |
| `assets/preview-placeholders/hint.png` | ✓ (L731) | **✗** | hint バブル (元から hidden) |
| `assets/preview-placeholders/hint-60.png` | ✓ (L487) | ✓ (L553) | 「ヒント！」吹き出し (235×63)。 同じ |
| `assets/preview-placeholders/character.png` | ✓ (L732) | **✗** | フクロウ博士の手描きキャラ。 main は `owl_professor_guide.png` で代替 |
| `assets/preview-placeholders/item-slot.png` | ✓ (L733) | **✗** | dotted slot |
| `assets/images/quizland/title_back.png` | ✗ | ✓ (L620) | スタート画面背景。 main 独自 |
| `assets/images/quizland/title_logo.png` | ✗ | ✓ (L907) | スタートロゴ。 main 独自 |
| `assets/images/quizland/owl_professor_guide.png` | ✗ | ✓ (L957, L1004) | owl-icon と character の両方に流用 |
| `assets/audio/quiz_bgm.mp3` | ✗ | ✓ (L1106) | BGM。 main 独自 |

**重要**: ディスクに preview-placeholders/ 配下に **`owl-icon.png`/`title-card.png`/`ctrl-btn-news.png`/`ctrl-btn-settings.png`/`q-text-card.png`/`audio.png`/`board.png`/`answer-tray.png`/`chip.png`/`circle.png`/`character.png`/`hint.png`/`progress-num.png`/`progress-mark.png`/`dot.png`/`hdr-pill.png`/`item-slot.png` が **全て存在する** (`d:/AppDevelopment/pono-asobiba-app/assets/preview-placeholders/` の `ls` 結果)。 つまり main が参照すれば即使える状態にある。

main は `body.sheet-on` 前提なので **シート画像が枠系を全部覆う設計**だが、 シートにフクロウ博士やベル/歯車が描かれていたとしても、 ユーザーが気づくレベルで CSS テキスト/emoji が前面に出てしまっている。

### Gap severity
**MAJOR** (D / E / F の根因と重複)。

---

## I. Game logic in preview/full

- preview/full の inline JS は約 2100 行 (L1367-3466) あるが、 **ゲームロジックは含まれない**:
  - `loadQuestion / buildPlaylist / onChoice / nextQuestion / questions.js` などの参照は **0 件** (grep `loadQuestion\|buildPlaylist\|QUIZLAND_QUESTIONS` on preview/full → 0 hits)
  - 含まれているのは: editor 機能 (resize / annotation / drawing / preview-mode toggle / saved-layout 同期 / wireframe / placeholder image swap / userbox 作成 / ruler & guides / png export)
- 問題文 `まんなかは なにいろ？` / 選択肢 `あか/あお/きいろ/みどり` は **HTML にハードコード** された static mockup (L1326, L1336-1339)。
- `assets/preview-placeholders/` の手描きシート 1 枚に依存 → 単一画面のレイアウト確認用ツール。

つまり preview/full は **完全な静的モックアップ** で、 ゲームロジックは 0。 ui-port-implementer-v2 は `slim 版ゲームロジックを preview/full の DOM の上に再配線` と書いているが、 これは正しい (logic 部分は main 側のオリジナル)。 ただし implementer は **DOM 構造の Replace は完全だが saved-layout の `tx/ty` 適用機構を移植していない**。

---

## Summary table

| # | Issue | Severity | Root cause | Fix complexity |
|---|---|---|---|---|
| 1 | saved-layout.json 完全無視 (`tx/ty/w/h` 全部 0) | **CRITICAL** | implementer が「removed from main runtime」と意図的に外した (`v2.md` L78) | **大** — RESIZABLE_SPEC 移植 + loadResizeState 移植 + saved-layout fetch ロジック追加。 50-80 行追加 |
| 2 | mode-screen + diff-row が landscape iPhone (390×844→viewport 390 高さ) で fit せず下が切れる | **CRITICAL** | `.diff-btn min-height: 120px` × 3 + 大きい padding/gap で 424px 必要 | **小** — `.diff-btn min-height: 64-80px` に下げる + `.mode-screen gap` を縮める |
| 3 | mode-screen 自体が preview/full に存在しない後付けレイヤー | CRITICAL (構造的) | preview/full に pre-game UI が無い | **中** — 設計議論。 mode-screen のスタイルを preview/full の paper-card に揃える等 |
| 4 | 🔔 / ⚙️ が emoji で描画される (preview/full は PNG + `color: transparent`) | **MAJOR** | main に `ctrl-btn-news.png` / `ctrl-btn-settings.png` の background ルールが無い + emoji 用 `color: transparent` も無し | **小** — CSS 4 行追加 |
| 5 | なぞなぞ title が CSS テキストのまま小さい (preview/full は title-card.png) | MAJOR | main に `title-card { background-image }` 無い + saved-layout の 296×128 サイズ未適用 | **小** — CSS 1 行 + saved-layout 適用後に解決 |
| 6 | フクロウ博士 (`.character`) が右下に小さく表示 (preview/full は ty -561.5 で board の高さに浮上) | MAJOR | saved-layout 未適用 (= 1 と同根) + 使う PNG が違う (`owl_professor_guide.png` vs `character.png`) | **小** — saved-layout 適用 + PNG パス差し替え |
| 7 | progress-mark.png オーバーレイ (dots 周りの手描き枠) が main に無い | MINOR | main に `::before` の枠ルール無し | **小** — CSS 12 行追加 |
| 8 | `.hint` (💡) の DOM が main に存在しない (preview/full では `__hidden` で消す前提) | MINOR | implementer が DOM ごと削除 | 影響 なし (どちらも非表示) |
| 9 | portrait 警告 (landscape-notice) は main にあり preview/full には無い | MINOR | main 独自追加 | 残してOK |
| 10 | `.q-text-card .audio` が main では `position: absolute`、 preview/full では flex item | MINOR | implementer 独自リファクタ | saved-layout 適用するなら preview/full 流に戻すべき |

---

## Recommended approach

ユーザーが「Replace と言ったのに Inject in disguise だ」と感じる最大の原因は **saved-layout.json を機構ごと無視している** こと。 implementer の主張する「Replace」は **「DOM 構造とベース CSS は preview/full から取り込んだが、 最終レイアウトの精密 px 値は捨てた」** という意味。 ユーザーから見れば「わざわざ UI ツールで揃えた値が無視されている = 古い main の上に背景だけ替えて誤魔化したのと変わらない」。

### 推奨: **部分修正 (Add saved-layout mechanism + fix mode-screen + fix ctrl-btn emoji)**
完全な書き直しは不要。 以下の 4 点を main に足せば preview/full のビジュアルに整合する:

1. **saved-layout 適用機構の移植** (CRITICAL fix #1, #5, #6, #10):
   - `RESIZABLE_SPEC` を 17 セレクタで定義
   - `fetch('/quizland/preview/full/saved-layout.json')` → 各要素に `style.width/height/transform: translate(tx, ty)` を当てる
   - `data.__headerH` で `--header-h` 上書き
   - `data.__hidden` で `.hint` を非表示
   - `data.__texts` の処理は **不要** (main の DOM は既に正しいテキストを持っている)
   - DOMContentLoaded 後 + `fitStage()` 前に実行
   - 推定: 約 60 行 + 既存コードと衝突なし
2. **ctrl-btn 4 行 CSS 追加** (MAJOR fix #4):
   ```css
   .hdr-right .ctrl-btn { background-image: var(--ctrl-img); background-size: contain; ... }
   .hdr-right .ctrl-btn:nth-child(1) { background-image: url('../assets/preview-placeholders/ctrl-btn-news.png'); }
   .hdr-right .ctrl-btn:nth-child(2) { background-image: url('../assets/preview-placeholders/ctrl-btn-settings.png'); }
   .hdr-right .ctrl-btn .icon, .hdr-right .ctrl-btn .ctrl-label { color: transparent; }
   /* sheet-on で消す処理は既に L107-117 にある */
   ```
3. **title-card / character / owl-icon / q-text-card / answer-tray ... に PNG background** (MAJOR fix #5, #6):
   - preview/full L698-733 のルール群をそのまま main にコピペ + パス調整 (`../../../` → `../`)
   - `.title-card small, .title-card span` 等の `color: transparent` は main で **不適用** (テキストを表示する設計と違うため) → ただし `body.sheet-on` のときだけ透明にする `body.sheet-on .title-card small, body.sheet-on .title-card span { color: transparent !important; }` を追加するのが綺麗
4. **mode-screen / diff-row のスケールダウン** (CRITICAL fix #2):
   - `.diff-btn { min-height: 64px; padding: 0.6em; }`
   - `.diff-btn .diff-stars { font-size: clamp(20px, 4vw, 32px); }`
   - `.diff-btn .diff-label { font-size: clamp(14px, 3vw, 22px); }`
   - `.mode-screen { gap: 10px; }`
   - `.mode-screen .mode-btn { padding: 12px 16px; font-size: 1rem; }`
   - これで合計高さ ~280px に収まる

### Estimated effort
- saved-layout 移植: 1-1.5h (RESIZABLE_SPEC + loadResizeState + fetch + 動作確認)
- ctrl-btn / title-card / character の PNG 復活: 30 分
- mode-screen のサイズ詰め: 20 分 + iPhone 実機テスト
- 合計: **約 2.5h で実機の見た目が preview/full に揃うはず**

### 何を絶対やってはいけないか
- 「saved-layout を main に組み込まない代わりに CSS で hardcode `transform: translate(...)` を当てる」 ← ユーザーが UI ツールで動かしても反映されない (= 結局 Inject in disguise になる)
- mode-screen を消す (ゲームとして必要)
- preview/full の editor 機能 (toolbar / resize-mode / annotation 等) を main にも持ち込む (不要かつバグる)

---

## Investigator's blunt verdict
ui-port-implementer-v2.md L78「Layout-select / slot-size / arrow-stroke / saved-layout.json: removed from main runtime」 の判断が **本件の起点**。 implementer は「dotted-slot は問題タイプによって個数が違うから固定 saved-layout は使わない」と言ってるが、 これは `.slot` 配列だけの話で、 `.character / .answer-tray / .chip / .q-text-card / .title-card` の `tx/ty/w/h` は **問題タイプに依存しない静的レイアウト** なので適用すべきだった。 部分的に Replace しただけで「 Replace 完了」と書いた、 が直接の原因。

ユーザーの「結局古いやつに sheet 載せただけだろ」は ほぼ事実。 違うのは **DOM 構造と CSS 命名 (.hdr-pill / .q-text-card / .answer-tray / .chip)** だけ。 ピクセル位置を決定する saved-layout が抜け落ちているので、 シート画像と DOM はリッチに重なっているがアラインしていない。
