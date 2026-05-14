---
name: feature-quizland-contain-fit-default
description: quizland の fitStage を cover→contain 化 + safe-area (16:9) を fit ターゲット化 + board に max-width 制約 + chip 幅縮小 (2026-05-14, sw v993→v995)。iPad 4:3 / mini 等で UI 切れ防止 + 余白削減。?fit=cover で旧動作に退避可能
metadata:
  type: feature
---

# quizland contain-fit + safe-area target + board max-width + chip 幅整合 (sw v995, 2026-05-14)

## なに

`quizland/index.html` の `fitStage()` のデフォルトを cover-fit (`Math.max`) から **contain-fit (`Math.min`)** に反転した。固定キャンバス 2100×900 (21:9) を、画面より大きくクリップする方式から、画面より小さく letterbox 化する方式へ。

## なぜ

iPad mini (CSS 比 1.52:1) など 4:3 寄りデバイスで、cover-fit だと右側の `.answer-tray` (回答ボタン 2x2) が画面外にハミ出て **3 つ目・4 つ目のボタンが切れる**症状があった。CSS `@media (max-aspect-ratio: 4/3)` で右カラム幅を縮める対応はあったが、saved-layout.json の固定座標と cover-fit の組み合わせが根本問題。

contain-fit にすると **どんなアスペクト比でも UI が必ず画面内に収まる**。レターボックス余白は `.stage-wrap` に `stage-bg.png` を `background-size: cover` で敷くことで、stage 内側の背景画像と継ぎ目なく繋がる。

## 実装の最小性 (差分 6 行)

既存に `?fit=contain` URL 切替機構 (行 3883-3887) と `fitStage()` の Math.min/Math.max 両モード分岐 (行 3909-3911) がすでに実装済だったため、**デフォルト反転だけ**で実現:

```js
// Before
const QZ_FIT_MODE = (_qzFitFromUrl === 'contain' || _qzFitFromLS === 'contain') ? 'contain' : 'cover';
// After
const QZ_FIT_MODE = (_qzFitFromUrl === 'cover' || _qzFitFromLS === 'cover') ? 'cover' : 'contain';
```

+ `.stage-wrap { background: #000 }` → `#0c0c0c url('../assets/_legacy/preview-placeholders/stage-bg.png') center/cover no-repeat`
+ sw.js CACHE_VERSION 992 → 993

## 退避路 (16:9 ユーザーで違和感が出た場合)

- URL: `https://pono-asobiba-staging.ndw.workers.dev/quizland/?fit=cover`
- DevTools Console: `localStorage.setItem('pono_fit_mode','cover')` → リロード

両方 OR 条件で旧 cover-fit に即時退避可能。コード revert 不要。

## 他ゲームへの波及検討メモ

quizland 以外 (maze, zukan, drawing 等) も同様の cover-fit を使っているかは未調査。 ユーザー報告ベースで個別対応する方針 (一括 contain-fit 化はしない)。

## 関連メモリ

- [[reference-layout-system]] — LayoutSystem (common/layout/) の共通レイアウトモジュール
- [[reference-op-layout-publish-workflow]] — OP layout の publish ワークフロー (本変更とは独立)
- [[feature-quizland-per-question-layout]] — 問題ごとの emoji-display 個別座標

## 関連ファイル (file:line)

- `quizland/index.html:110` — `.stage-wrap` 背景拡張 (v993)
- `quizland/index.html:789` — `.board` ベース定義の `max-width: calc(var(--safe-w, 1600px) - 700px - 16px)` (v994、wide path 限定で 884px 制約)
- `quizland/index.html:2035 / 2089 / 2189 / 2245` — 16:10 / 14:9 / 4:3 / 5:4 メディアクエリに `max-width: none !important` (v994、ベース制約を狭アスペクトで解除)
- `quizland/index.html:3876-3878` — fit-mode コメント (反転後)
- `quizland/index.html:3887` — `QZ_FIT_MODE` 三項演算 (反転後)
- `quizland/index.html:3909-3915` — `fitStage()` の Math.min/Math.max 分岐 + `--safe-w` 取得 (v994 で safe-area fit 化)
- `quizland/index.html:3976` — `?diag=1` ハーネスの fit-mode 表示
- `sw.js:4` — CACHE_VERSION 994

## v994 更新 (2026-05-14)

v993 で contain-fit デフォルト化したが、stage 全体 (2100×900 = 21:9) を fit 対象にしていたため 4:3 デバイスで上下余白が広く出る + 16:9 wide で `.board` (saved-layout 971px) が q-col 領域 (884px) を超えて右ズレが起きていた。

### v994 の変更
1. **fit ターゲットを 16:9 safe-area (1600px) に変更**: `fitStage()` で `--safe-w` CSS 変数を取得し、contain scale 計算を `Math.min(w/safeW, h/stageH)` に。translate は stage 中央寄せのまま (safe-area は stage 中央にあるので結果同じ)。cover 退避路は stageW のまま維持
2. **.board に max-width 制約 (wide path 限定)**: `.board { max-width: calc(var(--safe-w, 1600px) - 700px - 16px) }` でデスクトップ 16:9 で 884px に絞る。狭アスペクト 4 帯 (16:10/14:9/4:3/5:4) には `.board { max-width: none !important }` を追加してベース制約を解除 (既存 `width: auto !important` と整合)
3. **CACHE_VERSION 993 → 994**

### 効果 (iPad mini 1133×744 で実測)
- 余白: 上下 130px × 2 → 約 53px × 2 (半減)
- 右ズレ: 14/9 帯では既存 `width: auto !important` で grid 任せなので元から右ズレなし

### AGENTS.md §3 ルール準拠
当初 `saved-layout.json` の `.board|0.w` を 971→884 に手書きする案だったが、AGENTS.md §3 「saved-layout.json は layout-editor 経由でのみ更新、手書き禁止」に違反するためルール準拠で CSS `max-width` 方式に変更。コードレビュアーの指摘で発見

### 残課題
- 16:10 帯 (1440×900 等) では max-width: none で制約解除しているため saved-layout 971px のまま (右ズレ残存)。ユーザー主訴は iPad mini / wide 中心のためスコープ外として温存。必要なら別タスクで layout-editor 経由で `.board|0.w` を 884 (もしくは 16:10 用の 784) に更新
- code-reviewer から「`scaledW = stageW * scale` で `scale = w/safeW` の式と不整合では」と HIGH 指摘されたが、stage 中央寄せ = safe-area 中央寄せ (safe-area が stage 中央にあるため) の数式的に正しい。レビュア提案の `scaledW = safeW * scale` に変えると逆に safe-area が右に 300px ズレる

## v995 更新 (2026-05-14、 v994 デプロイ直後の追加修正)

### 発見された残課題
v994 デプロイ後、ユーザーが iPad DevTools 1024×768 (4:3) で確認 → **右側 2×2 回答ボタンの右列 (「2つ」「4つ」等) が画面右端で切れる** ことが判明。v994 / fitStage は正しく動作 (transform scale=0.853 確認済) していたが、**4/3 帯メディアクエリの chip 幅計算が a-col 容量を 20px 超過していた**。 

具体的:
- 4/3 帯: `.body { grid-template-columns: 1fr 440px }` で a-col=440px
- `box-sizing: border-box` で `.chip { width: 196px !important }` × 2 + gap 10 + pad 24 + border 10 = 計算上 **+2px の余裕しかなく** subpixel rounding で overflow
- 14/9 / 5/4 帯も同様に余裕 +2px しか無く脆弱

Plan エージェントの初期分析と私 (orchestrator) はこの内側 grid 制約を見落とした (= safe-area が画面に収まる ≠ a-col 内側の chip も収まる)。

### v995 の変更
3 帯の chip width を **-8px ずつ縮めて余裕 +10〜+20px を確保**:
- 14/9 帯: 216 → **208** (余裕 +10px)
- 4/3 帯:  196 → **188** (余裕 +20px、今回の主犯)
- 5/4 帯:  190 → **182** (余裕 +18px)
- 16:10 帯は `1fr` 指定なので変更不要

quizland/index.html 6 行変更 + sw.js CACHE_VERSION 994 → 995。

### 教訓
**「fit-target = safe-area が画面内に収まる」は内側 grid (q-col / a-col) の chip 配置が収まることを保証しない**。メディアクエリで `.chip { width: Npx !important }` のような `!important` 強制サイズを当てている場合、box-sizing と padding / border / gap を **全部足して** a-col 容量内に収まるか毎回再計算が必要。v994 リサーチで Plan エージェントは内側 chip サイズまでチェックしなかった (= safe-area 配置までで止めた)。今後同種の修正では **「safe-area 配置 OK + 内側 grid 容量 OK」を 2 段階で確認**することを徹底

