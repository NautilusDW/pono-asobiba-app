# UI Port Review 1: Visual Parity

レビュー対象:
- 新 UI ソース: `d:/AppDevelopment/pono-asobiba-app/quizland/preview/full/index.html` (3,468行)
- ライブターゲット: `d:/AppDevelopment/pono-asobiba-app/quizland/index.html` (2,585行 / 77,620文字、 タグバランス OK)
- saved-layout.json: 参考データとして spot check 済み

## Overall verdict
🟡 軽微修正 (Inject 戦略は妥当、 構造とテーマは良好に移植されている。 ただし下記の 2 点(中) + 5 点(微) の調整が望ましい)

## DOM structure parity
✓ 主要構造は preview/full と一致。

| 要素 | preview/full | main (post-port) | 評価 |
|---|---|---|---|
| `.safe-area > .hdr / .body` | あり (1284 行付近) | あり (`quizland/index.html:1872-1923`) | ✓ |
| `.hdr-left.hdr-pill` (owl-icon + title-card + progress-num + dots) | あり (1296-1314) | あり (`:1875-1885`) | ✓ |
| `.hdr-right` (2 × `.ctrl-btn`) | あり (1316-1319) | あり (`:1887-1896`) | ✓ |
| `.body > .q-col(.q-text-card + .board)` + `.a-col(.answer-tray + .bottom-right)` | あり (1322-1351) | あり (`:1900-1922`) | ✓ |
| `.bottom-right` (char-hint + character) | あり (1342-1349) | あり (`:1915-1920`) | ✓ |
| 旧 `.header / .hud / .stage / .question-panel / .answer-panel` 要素 | (preview/full には存在しない) | **markup から完全削除済み** ✓ | ✓ |
| 旧 garden / flower-enc / hud-seeds 要素 | (なし) | **削除済み** (`grep: id="garden-overlay\|garden-toast\|flower-enc\|hud-seeds\|hud-label"` → 0 hit) | ✓ |
| 新 DOM 内の既存 ID (`#question-text`, `#stage-area`, `#choices`, `#hud-progress`, `#q-num`, `#q-total`, `#hud-back-btn`, `#hud-settings-btn`, `#question-speaker`, `#pono-avatar`) | (preview はサンドボックス用 id なので別系統) | **すべて新レイアウト内に保持** (`:1883-1918`) | ✓ |

差分メモ:
- preview/full の `<small>` `<span>` などは contenteditable で編集可能になっており、 main では当然非編集の通常 markup へ。 これは想定通り。
- preview の `.hint` 要素 (黄色い大きな吹き出し) は `__hidden: ['.hint|0']` で非表示扱い。 main にも `.hint` markup は無い (cf. `:1915-1916` には `.char-hint` のみ)。 一致。

## CSS rule parity
✓ 主要スタイルは移植されているが、 命名差分と OLD-CSS 残置あり。

### 良い点
- 木枠グラデーション (`repeating-linear-gradient` ベースの border-image) は `.hdr-left.hdr-pill` (`:1484`)、 `.q-text-card` (`:1648`)、 `.board` (`:1707`) で再現済み。
- `.answer-tray` (`:1735`) は `#b07a3a` ベタ + `--quiz-wood-dark` solid border。 preview/full の `:387-393` と意匠一致。
- `.dot.done` / `.dot.current` (`:1573-1581`) のオレンジ強調は preview/full `.dot.done` (`:233`) と意匠一致。
- `.q-text-card .audio` 円形ボタン (`:1676-1696`) は preview/full `:313-324` の `--wood-light → --wood-mid` グラデーションを `--quiz-wood-light/mid` に置換。 一致。

### 命名差 (機能影響なし)
- preview/full は `--paper / --paper-2 / --wood-dark / --wood-mid / --wood-light` を使用。
- main は `--quiz-paper-top / --quiz-paper-bottom / --quiz-wood-dark / --quiz-wood-mid / --quiz-wood-light` を使用。 **値はほぼ同等** (cf. `:1484-1496` の組み合わせは preview/full の `:166-172` と等価)。

### 残った OLD CSS の影響評価

| OLD selector | 行 | バインドする markup の有無 | 影響 |
|---|---|---|---|
| `.game-shell` (旧 grid 設定) | `:85-103` | あり (game-shell div) | **🟡 二重定義**。 line 1440 で `grid-template-columns: none; display: block; ...` と上書きしているが、 ブラウザは両方をマージするため stack する property は新→旧で個別に上書きされる。 現状は新ルールが後勝ちで OK だが可読性低下 |
| `.header / .hud / .header-owl / .header-logo / .hud-action-btn / .hud-back-icon ...` | `:126-302` | **無し** (markup から削除済み) | ✓ 影響なし |
| `.hud-progress` / `.hud-dot` / `.hud-dot.done/.current` | `:303-327` | dot に `class="dot hud-dot"` で残存 | **🟡 影響あり (要評価)**。 新ルール `.hdr-left .dot` は specificity (0,2,0) > `.hud-dot` (0,1,0) なので 大半は新が勝つが、 margin/padding/transition など shared property は新側に明記されている限り問題なし。 現状 grep 上は新が `width: auto; height: 100%; aspect-ratio: 1` を指定しており旧 `.hud-dot { width/height: clamp(...) }` を上書きできている (specificity で勝つ)。 OK |
| `.choices` (`grid-area: choices` + 木枠 border + 紙背景) | `:590-613` | あり (`#choices`) | **🟡 影響あり**。 旧 `.choices` (specificity 0,1,0) は `.answer-tray .choices` (0,2,0) で覆い、 さらに新は border/background/box-shadow/padding/border-radius を `!important` で消去 (`:1747-1759`)。 結果、 新 layout が完勝。 ただし `grid-area: choices` (template-areas が定義されていないので無視される) も無害。 OK だが冗長 |
| `.question-panel { min-height: 0 !important; }` | `:107-109` | **無し** | ✓ 影響なし |
| `.garden-* / .flower-enc-*` (約 80 行) | `:920-1055` | **無し** | ✓ 影響なし。 ただし dead code |
| `.feedback` | `:887-904` | あり (`#feedback`) | ✓ 変更なしで継続使用 |

> 結論: OLD CSS の残置は **視覚回帰を起こさない** (新セレクタの specificity と `!important` で保護されている)。 ただし dead code が ~280 行残っているため、 follow-up 整理を推奨。

## Layout proportions

### grid-template-columns 近似の妥当性

main: `.body { grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr); }` (`:1623-1624`)
preview/full: `.body { grid-template-columns: 1fr 700px; }` (`:277-283`, safe-w=1600 → q-col ≈ 884px / a-col=700px、 比 ≈ 1.26 : 1)

**saved-layout.json の実測 vs main**:
- saved-layout `.q-text-card` 幅 = 971px、 `.board` 幅 = 999px、 `.answer-tray` 幅 = 540px → q-col 実測 ~1000px / a-col 実測 ~540px (比 ≈ 1.85 : 1)
- main の 1.45 : 1 は preview/full の `1fr 700px` (1.26 : 1) と saved-layout の実測 (1.85 : 1) のほぼ中間値

🟡 **a-col が preview/full より約 90 px 狭くなる可能性** (1600px 想定で q-col ≈ 919px、 a-col ≈ 633px)。 実機では `.answer-tray` の chip 4 個は 2×2 grid で flexible なので潰れないはずだが、 「ヒント！」 の `.char-hint` (white-space: nowrap) と `.character` 144-160px が並ぶ `.bottom-right` で a-col=633px は ややタイト。

### .hdr の grid 差分

main: `.hdr { grid-template-columns: minmax(0, 1fr) max-content; }` (`:1467-1473`)
preview/full: `.hdr { grid-template-columns: 1fr 700px; }` (`:157-163`)

🟡 **hdr-pill の幅が q-col 幅と一致しない**。 preview/full では `.body` と `.hdr` が同じ `1fr 700px` を共有することで「pill 右端 = q-col 右端」 がピクセル単位で揃う。 main では `.hdr` を `1fr max-content` にしたため、 ctrl-btn 2 個の横幅次第で pill 右端と q-col 右端のラインがずれる (デザイン的には目立たない可能性が高いが、 preview のスクショと比べると微妙な差が出る)。

### ItemSlot 130×130 / ChoiceChip 2×2

- ItemSlot (`.color-chip` / `.count-item` / `.shape-*`):
  - `.color-chip` (`:538-543`) 上限 134px (clamp 64..134) → preview/full の `--slot-size: 130px` 相当 ✓
  - `.count-item` (`:545-549`) 上限 170px (clamp 82..170) → やや大きめだが従来から踏襲している既存値、 preview/full には `count_total` の動的描画なし、 妥当
  - `.shape-*` 各種 ✓
- ChoiceChip 2×2 grid:
  - `.answer-tray .choices { display: grid; grid-template-columns: 1fr 1fr; gap: ... !important }` (`:1747-1759`) で 2×2 確定 ✓
  - `.choice-btn` (`:614-641`) は size を flex/grid 自動、 縦長/横長どちらも対応。 OK
- preview/full のテスト用 `.chip` (`:419-433`) は **main 側の `.choices` 内の `.choice-btn` と CSS クラス名が違う**。 これは Inject 戦略 (logic 既存 = `.choice-btn` 採用) として正解。 視覚的等価性は `.choice-btn` 既存スタイル + `.answer-tray` 周りの新スタイルで担保される。

### 21:9 / 16:9 safe area

🔵 **preview/full は 21:9 outer (`.stage` 2100×900) + 16:9 inner (`.safe-area` 1600×900) の二重構造**。 main は `.game-shell` 自体が 16:9 (aspect-ratio: 16/9, max 1600px) で、 21:9 outer を持たない。 これは実機 (iPad/タブレット) の実態に合わせた合理的な簡略化で、 21:9 端末ではブラウザ自身が左右に余白を作る。 仕様一致と判断。

## Visual elements per region

| region | preview/full | main (post-port) | parity |
|---|---|---|---|
| Title screen (タイトル, スタートボタン, 設定ボタン) | (なし、 in-game canvas のみ) | `:1820-1832` `.start-screen` + `title_logo.png` ✓ | ✓ (preview にスコープ外) |
| 難易度ピッカー | (なし) | `:1856-1862` `.diff-btn` x3 ✓ | ✓ (preview スコープ外) |
| Category picker | (なし) | `:1849-1864` `.category-screen` (現フローでは bypass されるが DOM/CSS 残置) | ✓ |
| Mode select modal | (なし) | `:1834-1847` `.mode-screen` ✓ | ✓ |
| In-game header (もんだい N/M, dots, 戻るボタン, せってい) | `:1295-1320` | `:1874-1897` ✓ | ✓ |
| Question text card | `:1325-1328` `.q-text-card` | `:1902-1905` ✓ | ✓ |
| Stage area (board) | `:1329` `.board` | `:1906-1908` `.board > #stage-area` ✓ | ✓ |
| Answer tray (4 択) | `:1334-1341` `.answer-tray > .answer-panel > .chip×4` | `:1912-1914` `.answer-tray > .choices(#choices)` (既存ロジックが button.choice-btn を生成) | ✓ (構造名は違うが意匠は同じ) |
| Bottom-right (ヒント + キャラ) | `:1342-1349` | `:1915-1920` ✓ | ✓ |
| Result modal | (なし) | `:1929-1938` ✓ (お庭/ずかんボタンは削除、 もう一回 + モードをかえる + メニューにもどる) | ✓ |
| ランドスケープ警告 | (なし) | `:1828-1832` `.landscape-notice` ✓ | ✓ |

## Asset reference parity

| 種別 | preview/full | main | 評価 |
|---|---|---|---|
| Owl PNG (header) | placeholder `assets/preview-placeholders/hdr-pill.png` | `../assets/images/quizland/owl_professor_guide.png` (実在 ✓) | ✓ 実機向け置換 |
| Owl PNG (character / pono-avatar) | placeholder `character.png` (sheet) | `../assets/images/quizland/owl_professor_guide.png` (再利用) | ✓ |
| Title logo | (なし) | `../assets/images/quizland/title_logo.png` (実在 ✓) | ✓ |
| Title back | (なし) | `../assets/images/quizland/title_back.png` (実在 ✓) | ✓ |
| 木枠 PNG (`ui_header_frame.png` 等) | (preview は CSS-only, PNG 未参照) | アセット存在するが **HTML/CSS から参照されていない** | 🔵 木枠は CSS グラデーションで描画。 PNG は不使用、 これは preview/full と方針一致 (PNG オーバーレイなし、 CSS-only) |
| `hint-60.png` (char-hint 吹き出しの背景) | preview/full `:487` `background-image: url('../../../assets/preview-placeholders/hint-60.png')` | main `:1772-1785` は **`linear-gradient(180deg, #fff8d4, var(--quiz-paper-bottom))` + 黄土色 border** (画像未使用) | 🟡 微差。 preview/full の peach 色 PNG 吹き出しと比べ main は paper 色 + 黄土 border の CSS-only 表現。 機能的には同等だが、 デザインの印象が変わる可能性あり |

## Issues found

### 🟡 中程度 (2)

1. **`.body` の grid-template-columns が a-col 寄せ (1.45fr : 1fr)**
   - preview/full では `1fr 700px` (q-col 比 ≈ 1.26 : 1)、 saved-layout 実測は ~1.85 : 1。 main の 1.45 : 1 は中間。
   - a-col 幅 (1600 想定で 633px) は preview/full の 700px より 67px 狭い。 `.bottom-right` の char-hint (nowrap) + character (160px) が並ぶときに窮屈。
   - **推奨**: `minmax(0, 1.3fr) minmax(0, 1fr)` で a-col を 700px 寄りに広げる、 または `.hdr-right` の `max-content` と揃えて `.body` も `minmax(0, 1fr) clamp(540px, 44%, 700px)` にする。

2. **`.bottom-right .char-hint` の表現が画像→CSS に変わった**
   - preview/full は `hint-60.png` (peach 色の吹き出し PNG) を background-image として配置。
   - main は `linear-gradient(#fff8d4, var(--quiz-paper-bottom))` + `border: 3px solid #b89a3a` (paper 色 + 黄土 border)。
   - **推奨**: デザイン統一のため、 preview/full の peach 色を再現する。 `assets/preview-placeholders/hint-60.png` を `assets/images/quizland/` にコピーし `background-image` 指定するか、 もしくは 280deg `linear-gradient(#fff5d8, #f8c98c)` のような peach 系グラデーションへ変更。

### 🟡 軽微 (3)

3. **`.game-shell` の二重定義 (line 85 + line 1440)**
   - 後者で旧 grid をリセットしているが、 ファイル可読性のため line 85 ブロックを削除するのが望ましい。
   - **推奨**: follow-up クリーンアップで line 85-103 のブロックを削除。

4. **OLD CSS dead code が ~280 行残置**
   - `.header`, `.hud`, `.hud-action-btn`, `.hud-back-icon`, `.garden-*`, `.flower-enc-*` 等。
   - **影響なし** (markup なし) だが視覚パリティ判定の邪魔。
   - **推奨**: follow-up commit で一括削除。

5. **`.hdr` grid を `1fr max-content` にしたことで hdr-pill 右端が q-col 右端と揃わない**
   - preview/full では両方 `1fr 700px` を共有して right-edge alignment が保証されている。
   - **推奨**: `.hdr { grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr); }` に統一して body と同じ比率にする (ctrl-btn は内部で固定幅なので grid 列 1fr 内で右寄せされる)。

### 🔵 補足 (1)

6. **`--slot-size` 変数を main 側で定義していない**
   - preview/full は `:11` `--slot-size: 130px` を定義。 main は `.color-chip` `.count-item` `.shape-*` で個別 clamp 済みなので問題ないが、 統一性のため `--slot-size: clamp(64px, 14vh, 134px)` を定義しておくと将来のメンテが楽。
   - **推奨 (任意)**: 統一変数の追加。

## Recommended deltas

優先度順:

1. **(🟡 中) `.body` の比率調整**: `grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);` または `minmax(0, 1fr) clamp(540px, 44%, 700px);` に変更し、 a-col を preview/full に近い 660-700px へ。
2. **(🟡 中) `.char-hint` の peach 色復元**: `hint-60.png` を `assets/images/quizland/` に正式コピーするか、 CSS でグラデーションを peach 系へ変更。
3. **(🟡 軽) `.hdr` の grid を `.body` と統一** (right-edge alignment 確保)。
4. **(🟡 軽) Follow-up クリーンアップ**: line 85-103 (旧 `.game-shell`) と line 126-327 (旧 `.header / .hud`) と line 920-1055 (`.garden-* / .flower-enc-*`) の dead CSS 削除。 約 280 行削減。
5. **(🔵) `--slot-size` 統一変数の追加** (任意)。

---

## 1-line verdict
🟡 軽微修正: DOM 構造とテーマ移植は妥当、 ただし a-col 比率と char-hint 表現を preview/full に合わせる微調整を推奨 (機能影響なし)。
