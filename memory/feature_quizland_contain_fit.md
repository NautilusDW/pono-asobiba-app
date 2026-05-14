---
name: feature-quizland-contain-fit-default
description: quizland の fitStage を cover→contain 化 + safe-area (16:9) を fit ターゲット化 + board に max-width 制約 (2026-05-14, sw v993→v994)。iPad mini 等で UI 切れ防止 + 4:3 余白半減 + 右ズレ抑制。?fit=cover で旧動作に退避可能
metadata:
  type: feature
---

# quizland contain-fit + safe-area target + board max-width (sw v994, 2026-05-14)

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

