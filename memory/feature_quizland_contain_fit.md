---
name: feature-quizland-contain-fit-default
description: quizland の fitStage デフォルトを cover-fit から contain-fit に反転 (2026-05-14, sw v993)。iPad mini 等 4:3 系で UI 切れ防止。?fit=cover / localStorage.pono_fit_mode=cover で旧動作に退避可能
metadata:
  type: feature
---

# quizland contain-fit デフォルト化 (sw v993, 2026-05-14)

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

- `quizland/index.html:110` — `.stage-wrap` 背景拡張
- `quizland/index.html:3876-3878` — fit-mode コメント (反転後)
- `quizland/index.html:3887` — `QZ_FIT_MODE` 三項演算 (反転後)
- `quizland/index.html:3909-3911` — `fitStage()` の Math.min/Math.max 分岐
- `quizland/index.html:3976` — `?diag=1` ハーネスの fit-mode 表示
- `sw.js:4` — CACHE_VERSION 993
