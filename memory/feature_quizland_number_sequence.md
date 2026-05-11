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
  - `Array.isArray(q.nums)` で nums (あいだ) と num (つぎ/まえ) を分岐
  - 中央に大きく数字表示 (`.number-display` クラス、font-size clamp(120px, 28vmin, 320px))
  - 「あいだ」は「○ と ○」の3要素 (num/sep/num) で表示。区切りは CSS `gap: 0.2em` で制御 (textContent はスペース無し「と」)
- カテゴリ追加6箇所: QUIZLAND_QUESTIONS / QUIZLAND_CATEGORIES / MODE_TO_CATEGORIES.inspire / HAKASE_DIALOGUE.problem.byCategory / hint2FallbackByCategory / switch分岐
- レイアウトエディタ統合: `.number-display` を `QZ_RESIZABLE_SELECTORS` に登録済（既存 `.shape-display` `.count-stack` 等と一貫）

## 選択肢の読み方 (VOICEVOX)
- 画面表示: 裸数字 「1」「2」… 「10」
- speech (音声): **音読み** 「いち / に / さん / よん / ご / ろく / なな / はち / きゅう / じゅう」
  - count_total の和語読み (ひとつ/ふたつ) と区別。文脈が「次の数」なので音読みが自然
- 問題文も「1の つぎは？」→ speech「いちの つぎは？」と数字を音読みで読み替え

## 関連ファイル
- 実装: `quizland/data/questions.js`, `quizland/index.html`
- 発注書: `docs/quizland-voicevox-order/ORDER-FULL.md` Q169〜Q180
- sw.js v912+ で配信
