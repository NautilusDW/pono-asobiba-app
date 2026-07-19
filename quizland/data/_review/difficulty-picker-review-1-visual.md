# Difficulty Picker Review 1: Visual

## Overall verdict
- 🟡 軽微修正

実装は機能的に成立しており、 wood/paper トークンを使って既存トーンの方向性は守られている。
ただし mode-btn と diff-btn の表現方針が部分的にズレていること、 そして
**「やさしい」が同一画面に 2 回登場する** という UX 上の重複が確実にあるため、
採用前に最低限ラベル変更 (「ふつう」を保ったまま難易度側のラベルを変える、
あるいは mode-btn 側の「やさしい」表記を変える) と、 デザイン側で
mode-btn の `paper-2 グラデ + wood-dark 4-5px ボーダー` に寄せる調整を
推奨する。

## Element-by-element check

| element | line | match preview/full aesthetic? | コメント |
|---|---|---|---|
| `.diff-screen-title` | `quizland/index.html:707-715` | 🟡 ほぼ一致 | mode-screen-title (`L670-677`) と同じ DotGothic16/Zen Maru、 `#5D3A00` + `#FFF8E0` text-shadow のトーンを踏襲。 ただしフォントサイズが `clamp(0.95rem, 3.4vw, 1.25rem)` と mode-screen-title (`clamp(1.1rem, 4vw, 1.6rem)`) より小さく、 サブ見出し扱いになっている。 これは「2段目のラベル」として妥当だが、 視覚階層がやや弱い。 |
| `.diff-row` | `quizland/index.html:716-721` | 🟢 一致 | `flex-direction:row`、 `gap:10px`、 `max-width:360px`。 mode-screen-row が縦並びなのに対しこちらは横並びなのは UX 上正しい (3 択ピル)。 mode-screen 全体の `flex-direction:column; gap:18px` の中に自然に並ぶ。 |
| `.diff-btn` (非アクティブ) | `quizland/index.html:722-737` | 🟡 ややズレ | `--paper` 単色 + `--wood-mid` 3px ボーダー + `--wood-dark` 4px 下影。 一方 preview/full / 本体の mode-btn は `linear-gradient(--paper, --paper-2)` + `--wood-dark` 4-5px ボーダー (例: `L168-173, L296`)。 mode-btn だけ別カラー (`#fff` 背景 + `#FBBF24` 4px ボーダー + 角丸 22px、 `L682-697`) なので、 「mode-btn と diff-btn を兄弟にしたい」のか「他の paper-card 群と兄弟にしたい」のか判断が必要。 木枠紙肌の方向は守られている。 |
| `.diff-btn:active` | `quizland/index.html:738-741` | 🟢 一致 | `translateY(2px) + 影縮小`。 ctrl-btn:active (`L267`) と同じ押し込み挙動。 |
| `.diff-btn.is-active` | `quizland/index.html:742-749` | 🟢 強調十分 | 橙 (`--primary` #F59E0B) + 白文字 + `--wood-dark` ボーダー + 黄色 inset リング (`--hint-bg`) + `scale(1.04)`。 非アクティブとのコントラストは大きく、 「いま選ばれている」が一目で分かる。 子供向けに望ましい。 |

## やさしい 重複問題

- 確認結果: **重複あり**
  - mode-btn `data-mode="inspire"`: `quizland/index.html:898` — `😊 やさしい (いろ・かず・かたち)`
  - diff-btn `data-diff="easy"`: `quizland/index.html:908` — `やさしい`
  - 同じ `mode-screen` 内に縦に並ぶため、 タップする子供 (3-6 歳・読み始めの年齢) には
    「やさしい」が 2 つ並んで見える。 大人なら `mode = カテゴリ軸 / diff = レベル軸` と
    分けて読めるが、 ひらがな読みたて〜の年齢にはほぼ確実に混乱する。
  - 加えて `diff-btn` の「やさしい」を選んでから mode-btn の「やさしい」をタップすると、
    画面上で「やさしいやさしい」が起こる。 親のオンボーディング説明も難しくなる。

- 推奨対応 (優先順):
  1. **難易度側のラベルを変える** (推奨): 子供にとってより直感的な
     `かんたん / ふつう / むずかしい` に統一する。 「かんたん」は
     `mode-btn` の inspire (やさしい) と概念衝突しない。
     - `index.html:908` 内テキストを `かんたん` に変更。
     - 内部の `data-diff="easy"` / localStorage 値はそのままで OK。
  2. (または) **mode-btn 側のラベルを「えあそび / ものしり」等に**
     変える。 ただし mode-btn のラベルは既に運用中で他画面の文脈もあるので、
     こちらは影響範囲が大きい。 最小変更原則からは推奨度 1 番より下。
  3. アイコン補助を強める (絵文字で軸を区別):
     - 難易度側に `⭐` / `⭐⭐` / `⭐⭐⭐` を併記すると、 文字を読まなくても
       「強さの段階」が伝わる。 ラベルとは独立に追加可能。

## Layout

- **配置の妥当性**: 🟢 自然
  - `mode-screen` は `display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; padding:24px` (`index.html:661-667`)。
  - 縦の並び: `mode-screen-title (どっちで あそぶ？)` → `mode-screen-row (2 縦ボタン)` → `diff-screen-title (むずかしさ)` → `diff-row (3 横ピル)`。
  - `gap:18px` で全要素が等間隔に並び、 mode-screen-title→mode-btn と
    diff-screen-title→diff-row のセクション内距離が一致する。
    視覚的に「上=モード」「下=難易度」と読み取りやすい。
  - `mode-screen-row` (max-width:360px, ボタン縦) と `diff-row` (max-width:360px, ピル横) の
    幅が揃うので中心軸が綺麗に通る。

- **16:9 セーフエリアに収まるか**: 🟢 収まる
  - `mode-screen` は `position:fixed; inset:0` の **viewport 全体**で、 stage 内 (1600x900 safe-area) に閉じ込められない設計。 `align/justify center` で中央に寄せる。
  - 概算高さ (一般的な横向き 16:9 タブレット 1024x576):
    - mode-screen-title ~26px
    - mode-btn ×2: 各 18px*2 + 1.15rem(18px)*1.35 + .78rem(12px)*1.4*1 + 4 ≈ 約 78px、 ×2 + gap 14px = 170px
    - diff-screen-title ~22px
    - diff-row: padding 12px*2 + 0.95rem*1.2 ≈ 42px
    - 縦 gap 18px ×3 = 54px
    - 合計 ≈ 314px (＋ padding 24*2 = 362px) → 576px には十分収まる
  - 縦持ち警告 (`L887-891`) があるので縦持ちでは表示されない前提で OK。

## Touch / accessibility

- **ボタンサイズ**: 🟡 やや小さい
  - `.diff-btn` の高さは概算 `padding 12 + line-height 1.2*0.95rem(15.2px) + 12 ≈ 約 42px`。
  - WCAG / Apple HIG 推奨 44x44px をわずかに下回る。 子供のタッチには 48px 以上欲しい。
  - **推奨**: `padding: 14px 6px;` または `padding: 12px 6px; min-height: 48px;` に。
  - 横幅は `flex:1 1 0` × `max-width:360px` ÷ 3 - gap 10px = 約 113px なので横は十分。

- **aria-pressed**: 🟡 初期値が HTML に無い
  - HTML マークアップ (`L908-910`) の 3 ボタンに `aria-pressed` 属性が無い。
  - JS の `refreshDiffActive()` (`L1558-1568`) が DOMContentLoaded 後に
    走るので最終的には付くが、 スクリーンリーダーが読み上げる **初期 HTML パース時点**では
    押下状態が表現されない (FOUC 相当)。
  - **推奨**: 静的 HTML で `aria-pressed="false"` を 3 ボタン全部に書き、
    `easy` に `aria-pressed="true"` をデフォルトで付けておく。
    JS は localStorage 復元時のみ書き換える。
  - **推奨**: `.diff-row` に `role="radiogroup" aria-label="むずかしさ"` を、
    `.diff-btn` に `role="radio"` を付けると意味的に正確。 子供向け UI の
    フォーカス管理を簡素化したいなら `aria-pressed` のままでも実害は少ないが、
    `role="radiogroup"` の方が「3 択 1 つ選択」の意図と一致する。
  - 補足: `.diff-screen-title` が `aria-labelledby` で参照されていない。
    ID を振って radiogroup と紐付けると望ましい。

## Issues found

1. **「やさしい」重複** (`L898` ↔ `L908`) — 子供 UX 観点で要対応。 (上記推奨 1)
2. **タッチ高さ ~42px < 44px** (`L724`) — 軽微。 子供向けは 48px 推奨。
3. **aria-pressed の初期 HTML 値なし** (`L908-910`) — 軽微。 初回パース時 a11y。
4. **mode-btn と diff-btn のスタイル差**:
   - mode-btn は `#fff 背景 / #FBBF24 4px ボーダー / radius 22 / shadow 6 18px` (`L682-696`)。
   - diff-btn は `--paper 背景 / --wood-mid 3px ボーダー / radius 18 / 4px 立体影` (`L722-736`)。
   - 同じ画面なのにデザイン言語が混在する。 どちらかに統一を推奨。
   - 個人的には diff-btn の wood-frame 路線の方が他画面 (paper-card / hdr-pill) と整合するため、
     **mode-btn 側を wood-frame 系に近づける** リファクタが望ましい (今回スコープ外でも OK)。
5. **`.diff-screen-title` のフォントサイズが mode-screen-title より小さい** (`L709` vs `L672`) —
   階層上は妥当だが、 「むずかしさ」が補助情報のように見えてタップ動機を弱めるリスクがある。
   `clamp(1.0rem, 3.6vw, 1.35rem)` 程度に上げて mode-screen-title との
   階層差を 1 段だけにする案を提案。

## Recommended deltas

優先度順:

1. **必須**: `index.html:908` の `やさしい` を **`かんたん`** に置換。
   ```html
   <button class="diff-btn" data-diff="easy" aria-pressed="true">かんたん</button>
   <button class="diff-btn" data-diff="normal" aria-pressed="false">ふつう</button>
   <button class="diff-btn" data-diff="hard" aria-pressed="false">むずかしい</button>
   ```
   localStorage / `data-diff` / JS は無変更で OK。

2. **必須**: `.diff-btn` のタッチ高さを 48px 以上に。
   ```css
   .diff-btn { padding: 14px 6px; min-height: 48px; }
   ```

3. **推奨**: a11y 強化 (静的 `aria-pressed` 初期値 + `role="radiogroup"` の付与)。
   ```html
   <div class="diff-row" id="diff-row" role="radiogroup" aria-label="むずかしさ">
     <button class="diff-btn" data-diff="easy" role="radio" aria-checked="true">かんたん</button>
     ...
   </div>
   ```
   (`aria-pressed` を `aria-checked` に変える場合は JS L1562/L1565 も更新)

4. **推奨**: `.diff-screen-title` のフォントサイズを少し上げる (mode-screen-title と
   差を 1 段だけに):
   ```css
   .diff-screen-title { font-size: clamp(1.0rem, 3.6vw, 1.35rem); }
   ```

5. **任意**: 星アイコンを併記 (`かんたん ⭐` / `ふつう ⭐⭐` / `むずかしい ⭐⭐⭐`) で
   読み始めの子供にも段階感が伝わる。

6. **任意・スコープ外**: mode-btn と diff-btn のデザイン言語統一
   (mode-btn を wood-frame 系へ寄せる)。 別タスクで扱う方が安全。
