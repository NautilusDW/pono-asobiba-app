---
name: feature-writing-mori-shi-stage1
description: 新ゲーム「かいてひらく！ポノのことばの森」第1ステージ「しっぽの こみち」 (writing-mori/index.html, sw v1026, 文字「し」)
metadata:
  type: project
---

# writing-mori (かいてひらく！ポノのことばの森) — Stage 1「しっぽの こみち」

## 概要

既存 `writing/` (RPG文字書きクエスト) とは**別の新ゲーム**として `writing-mori/` を新設。 単一HTMLファイル (`writing-mori/index.html`, 約 1150 行)。

「**書いた線が森の中で実際に役立つ**」 (なぞり書きで小道が出現してポノが歩く) というコンセプトの MVP。 子供 (3〜6歳) 向けの優しい判定。

**Why**: 仕様書 (2026-05-16 ユーザー支給) より「単なるなぞり書きで褒められる学習ではなく、 書いた線が世界に作用する体験」 が差別化ポイント。 まず1ステージで体験の気持ちよさを検証し、 シリーズ化できそうかを確認するフェーズ。

**How to apply**:
- 50音追加時は `WRITING_STAGES[]` 配列に entry 1 つ push するだけで OK な構造
- 次の候補は **つ (つるの橋) / く (くまの足あと) / へ (へびいちごの丘) / の (のはらの輪) / は (はなのたね)** (仕様書 §14)
- 各ステージは「**困りごと → 文字を書く → 森のしかけが動く → 動物や言葉を発見 → カード獲得**」の型で揃える

## ステージデータ構造 (拡張用)

```js
const WRITING_STAGES = [{
  id: 'shi_tail_path',
  kana: 'し',
  word: 'しっぽ',
  title: 'しっぽの こみち',
  unicodeHex: '3057',       // 参考表記
  unicodeDec: 12375,         // AnimCJK URL 用
  scene: { background, hiddenAnimal: 'rabbit', gimmickType: 'path_reveal' },
  storyText: { intro, guide, tracingHint, success, clear, retry },
  reward: { type: 'letterCard', kana, word }
}];
```

## 技術ポイント

### AnimCJK 中心線 SVG (再利用)
- URL は **十進コードポイント** (`12375.svg` for U+3057)
- 一次: `https://raw.githubusercontent.com/parsimonhi/animCJK/master/svgsJaKana/{dec}.svg`
- 二次: `https://cdn.jsdelivr.net/gh/parsimonhi/animCJK@master/svgsJaKana/{dec}.svg`
  (※ jsdelivr の gh エンドポイントは repo サイズ 50MB 超で 403 を返すため **raw を一次にした** — 既存 [writing/index.html](writing/index.html) と同じ)
- 最終フォールバック: 手書きベジェ近似 (内蔵)
- 中心線抽出: `path[clip-path]` セレクタ
- viewBox `0 0 1024 1024` → stage `1600x900` へスケール

### 16:9 固定レイアウト
- `fitStage()` = `Math.min(w/1600, h/900)` の quizland v998 contain-fit パターン
- 縦画面では `@media (orientation: portrait)` で `body::before` の「よこむきに してね」警告
- 4:3 / 21:9 対応は今回スコープ外

### なぞり判定 (子供向けゆるさ)
- START_TOLERANCE ≈ 110px / END_TOLERANCE ≈ 100px
- カバレッジ72%、 進行方向チェック
- 失敗時は否定語ゼロ ─ 仕様書 §9 のテキスト「だいじょうぶ。 もういちど、うえから かいてみよう。」 「こんどは ゆっくり いってみよう。」 「ポノも いっしょに みてるよ。」 のみ使用

### Pono アセット流用
- 立ち絵: `assets/images/characters/pono/pono_001.png` (透過確認済、 正面立ち)
- 喜び: `assets/images/characters/pono/dance/dance_hooray.png` (透過確認済、 万歳)
- 画像 width/height は **属性で固定しない** (MEMORY.md `task analysis 2026-05-16T04:43:54Z` 突き抜けバグ知見)。 `naturalWidth/Height` で実寸計算してポノを path に沿って歩かせる

### XSS 配慮
- AnimCJK SVG は **innerHTML で挿入しない**。 `DOMParser().parseFromString()` でパース → `createElementNS` + `setAttribute` で `d` 属性のみ抽出

## 配信 / バージョン

- `sw.js` CACHE_VERSION: 1023 → **1026** (初版実装) → **1027** (ポリッシュ phase) → **1028** (staging 初確認時の値) → **1029** (中央寄せバグ修正) → **1030** (pointer events バグ修正、 現行)
- network-first 純構成のため precache 配列追加なし
- staging 反映: `develop` push → GH Actions が `wrangler deploy --env staging` (約 1m6s)
- **2026-05-16 staging 初公開**: https://pono-asobiba-staging.ndw.workers.dev/writing-mori/

## 既知の落とし穴 + 修正履歴 (2026-05-16 staging リリース時)

### バグ 1: ウルトラワイド画面で stage が右下に偏る (sw v1028 → v1029 で修正)

**症状**: 3832x1479 のウルトラワイドで stage が右下に寄り、 左+上に黒帯が偏在。

**原因**: `#stage-wrap` の **flex 中央寄せ** + JS fitStage の **translate + scale** が二重に中央計算を実行。 flex が未スケール 1600x900 box を中央に置き、 そこに JS が translate(601.5, 0) を加算 → scale 1.643 で右下方向にはみ出し。

**修正**: `#stage-wrap` から `display: flex; align-items/justify-content: center` を撤去、 `#stage` を `position: relative` → `position: absolute; top: 0; left: 0;` に変更。 これで quizland v998+ contain-fit パターン ([[feature-quizland-contain-fit]]) と完全一致。

**教訓**: **`transform-origin: 0 0` + JS translate を使うなら親に flex 中央寄せを併用してはならない**。 既存実装パターンに合わせる時は CSS/JS を 1 セットで真似する。

### バグ 2: Phase 2 で pointer events が拾えない (sw v1029 → v1030 で修正)

**症状**: なぞり画面に入っても画面のどこをクリック/ドラッグしても反応しない。 ガイドパスは見えているのに何も起きない。

**原因**:
1. `.bubble` (z-index 20、 pointer-events デフォルト auto) が `.trace-area` (z-index 15) より**前面に被さって**おり、 ユーザー入力を全部食っていた
2. `.trace-area svg` に pointer-events 明示なし → SVG 子要素の `visiblePainted` 既定でガイドパス間の透明領域でイベントが落ちる
3. ハンドラを `traceSvgEl` 単体に attach していたため、 SVG 透明領域でバブリングしない

**修正**:
- `.bubble` に `pointer-events: none` 追加 (吹き出しは表示専用、 クリック要素無しで副作用なし)
- `.trace-area` の z-index 15 → **22** (bubble より前面)
- `.trace-area svg` に `pointer-events: auto` 明示
- `bindPointerEvents()` の attach 先を `traceSvgEl` → **`traceAreaEl` (div コンテナ)** に変更
- `setPointerCapture` / `releasePointerCapture` も `traceAreaEl` に揃える

**教訓**: なぞり/タップ系 UI では **吹き出し・トーストなど装飾レイヤーは `pointer-events: none`** で透過させ、 **入力レイヤーは親 div に attach** して透明領域でもバブリングで届くようにすること。 z-index と pointer-events のヒエラルキーは必ずペアで設計。

### 現行 z-index ヒエラルキー (確定済)

```
50 card-overlay (Phase 5 報酬カード)
40 back-btn (もどる)
35 retry-toast
30 stage-title (しっぽの こみち)
25 tap-prompt
22 trace-area  ← v1030 で 15 から引き上げ
20 bubble      ← v1030 で pointer-events: none
```

## ポリッシュ phase (本素材待ちの仮素材作り込み)

本物画像納品 (batch:43) を待つ間、 CSS+SVG プレースホルダを「絵本風で実機表示に耐えるレベル」 まで作り込み:

- 背景: 8 段グラデの空 + 雲3 (radialGradient + 14-18s 揺れ) + 遠景の丘 2 層 + 遠景の木 2 本 + うねる草地 2 層 + 草の束 10 本 (`<symbol>` + `<use>`、 3 グループで違う速度の揺れ) + 花 10 輪 (黄/白/ピンク、 5秒バウンス)
- 右奥うさぎ尻尾: 白楕円中央 + 周囲パフ円 5 個 + 影 + ハイライト、 2 秒揺れ
- うさぎ本体: 耳 (外白+内ピンク+12度傾き) → 頭 → 体 → 前足 → ほっぺ + 三角鼻 + Y型口 + つぶらな目 + ハイライト、 cubic-bezier(.34,1.56,.64,1) で出現
- 小道 (Phase 3): 影/縁取り/本体の 3 層 + 道沿いに小石/草/花
- カード: 木目縞 + 四隅葉装飾 + クリーム紙 (radial cream→#FFF8E1)、 spring scale
- 吹き出し: 左下しっぽでポノを指す形

クロスレビューで指摘された HIGH 2 件 + MED 1 件 (`treeNearGrad` 未参照削除 / `path-layer` preserveAspectRatio xMidYMid meet 整合 / `prefers-reduced-motion: reduce` 追加) は別 commit で反映済み。

中央なぞり領域 (約 400x400) は仕様書 §4 通り視覚的に空け、 花/草も画面下端と両端寄りに配置。 子供向けの muted earth-tone palette 厳守。

## 関連発注書

[batch:43-writing-mori-shi-stage1] — `tmp/alpha_pending/43/CODEX-ORDER-writing-mori-shi.md`
- 全10種 (背景1 / ポノ3 / うさぎ3 / 小道1 / カードUI2)
- batch 30/31 は別件占有、 batch 43 を新設
- 後工程: ユーザー alpha 抜き (Photoshop) → Claude が `assets/images/writing-mori/` に配置 → コード反映 → sw bump

## 既存類似機能との関係

- [[feature-writing-simple-mode]] (`writing/simple.html`): RPG ダーク調 + 1文字ずつの本格なぞり判定。 こちらと完全に別ゲーム
- [writing/index.html](writing/index.html): RPG「文字書きクエスト」本体、 hanzi-writer ベース、 ダーク世界観
- writing-mori はやさしい絵本世界観、 「書いた線が森に作用する」 体験重視

## 残課題

- play.html へのカード追加 (素材揃ってから)
- 効果音 (なぞり開始 / 成功 / カード入手) 未実装
- 背景・うさぎ・小道オーバーレイは CSS+SVG プレースホルダ (Codex 納品待ち)
- 実機ブラウザでの 1600×900 リサイズ動作確認は staging デプロイ後
