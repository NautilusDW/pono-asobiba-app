---
name: Quizland 数字の前後カテゴリ (number_sequence)
description: 3歳児向け新カテゴリ「かずのじゅん」(12問) の追加。1〜10 の前後関係 (つぎ/まえ/あいだ) を inspire モードに統合
type: feature
---

# Quizland number_sequence カテゴリ

## 概要
- 対象年齢: 3歳児向け（最年少）
- カテゴリ key: `number_sequence`、ラベル: 「かずのじゅん」、emoji: 🔢
- 数字範囲: 1〜10
- 問題数: 12問 (level 1: 6問 / level 2: 4問 / level 3: 2問)
- 配置モード: **inspire** (既存3-4歳向け、order_color/count_total/shape_name と並ぶ)

## 問題タイプ
1. 「○の つぎは？」(数+1) — Level 1 中心
2. 「○の まえは？」(数-1) — Level 2 中心
3. 「○と ○の あいだは？」((a+b)/2) — Level 3 のみ。`nums:[a,b]` 配列フィールドを持つ

## 実装ポイント
- データ: `quizland/data/questions.js` の `QUIZLAND_QUESTIONS.number_sequence` に12問
- レンダー関数: `quizland/index.html` の `renderNumberSequence(stage, q)` (renderShapeName 付近)
  - **sw v974+: `q.stageDisplay` (例: "1 → ◯", "◯ → 5", "2 ◯ 4") を優先参照**。 ステージに 「数字 + 矢印 (or 空白) + ◯ (答え位置)」 を表示してユーザーに位置関係を視覚化
  - **sw v975+ 仕様変更**: つぎ/まえ系は矢印あり (`1 → ◯` / `◯ → 3`)、 **あいだ系は矢印なし半角スペース区切り (`2 ◯ 4`)** に統一 (ユーザー要望)。 token 分割 regex は `/\s*→\s*|\s+/` (矢印 or 空白)、 `hasArrow = stageDisplay.indexOf('→') !== -1` で arrow span 挿入をガード
  - `.number-display-num` (大きな数字) / `.number-display-arrow` (矢印、 0.7em + 色 #8a96b8) / `.number-display-blank` (◯、 色 #c0392b) の 3 クラスで描画
  - 旧データ fallback: `q.stageDisplay` 無しなら `Array.isArray(q.nums)` で nums (あいだ「N と M」3要素) / num (つぎ・まえ 単一数字) を分岐
  - 中央に大きく数字表示 (`.number-display` クラス、font-size clamp(80px, 20vmin, 220px) = v974 から上限縮小、 元は clamp(120px, 28vmin, 320px) で単一数字想定)。 v975 後の最大は 3 要素 (つぎ/まえ系 "N → ◯" の 2 token + arrow span / あいだ系 "N ◯ M" の 3 token)
  - `white-space: nowrap` で 1 行強制 (token 群が折り返さないように)
- カテゴリ追加6箇所: QUIZLAND_QUESTIONS / QUIZLAND_CATEGORIES / MODE_TO_CATEGORIES.inspire / HAKASE_DIALOGUE.problem.byCategory / hint2FallbackByCategory / switch分岐
- レイアウトエディタ統合: `.number-display` を `QZ_RESIZABLE_SELECTORS` に登録済（既存 `.shape-display` `.count-stack` 等と一貫）

## 12 問 stageDisplay 値一覧 (sw v975+ 現行、 v974 でフィールド追加、 v975 であいだ系矢印撤去)
| Q | level | 質問 | answer | stageDisplay | 備考 |
|---|-------|------|--------|--------------|------|
| 1 | 1 | 1の つぎは？  | 2 | `1 → ◯` | つぎ系: 矢印あり |
| 2 | 1 | 2の つぎは？  | 3 | `2 → ◯` | |
| 3 | 1 | 4の つぎは？  | 5 | `4 → ◯` | |
| 4 | 1 | 6の つぎは？  | 7 | `6 → ◯` | |
| 5 | 1 | 7の つぎは？  | 8 | `7 → ◯` | |
| 6 | 1 | 9の つぎは？  | 10 | `9 → ◯` | |
| 7 | 2 | 3の まえは？  | 2 | `◯ → 3` | まえ系: 矢印あり |
| 8 | 2 | 5の まえは？  | 4 | `◯ → 5` | |
| 9 | 2 | 8の まえは？  | 7 | `◯ → 8` | |
| 10 | 2 | 10の まえは？ | 9 | `◯ → 10` | |
| 11 | 3 | 2と 4の あいだは？ | 3 | `2 ◯ 4` | **あいだ系: 矢印なし、 半角スペース区切り (v975 で `2 → ◯ → 4` から変更)** |
| 12 | 3 | 6と 8の あいだは？ | 7 | `6 ◯ 8` | 同上 |

## 選択肢の読み方 (VOICEVOX)
- 画面表示: 裸数字 「1」「2」… 「10」
- speech (音声): **音読み** 「いち / に / さん / よん / ご / ろく / なな / はち / きゅう / じゅう」
  - count_total の和語読み (ひとつ/ふたつ) と区別。文脈が「次の数」なので音読みが自然
- 問題文も「1の つぎは？」→ speech「いちの つぎは？」と数字を音読みで読み替え

## 関連ファイル
- 実装: `quizland/data/questions.js`, `quizland/index.html`
- 発注書: `docs/quizland-voicevox-order/ORDER-FULL.md` Q169〜Q180
- sw.js v912+ で配信
