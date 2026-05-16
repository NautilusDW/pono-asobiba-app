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

- `sw.js` CACHE_VERSION: 1023 → **1026** (本実装で bump)
- network-first 純構成のため precache 配列追加なし
- staging 反映: `develop` push → GH Actions が `wrangler deploy --env staging`

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
