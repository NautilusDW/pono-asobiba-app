---
name: Quizland 対象年齢
description: trivia は 5-6 歳児想定（カタカナ読める前提）。「絵で覚える」割り切りはダメ
type: project
---

# Quizland 対象年齢

## 事実
- **trivia 系は 5-6 歳児用**（カタカナが読める年齢が前提）
- emoji_name / count_total / shape_name / opposite / order_color はもっと低年齢層もカバー（絵中心の図鑑型）

## なぜ重要
- trivia の L1/L2/L3 で「答えそのものを描いた絵」をステージに出すと、5-6 歳児は **カタカナ 4 択を読んで即正解できてしまう**（クイズが成立しない）
- 「L1 は 3 歳児入門だから絵で答えを覚える設計と割り切る」という前任セッションの判断は誤り

## How to apply
- trivia の問題で「ステージ絵 = 答えそのもの」になっていたら、レベルを問わず修正対象
- 既存解決パターン: `img_word` → `img_answer` の reveal、または `choices: [{text, image}]` の 4 択画像化
- 他タイプ（emoji_name, count_total 等）は別の年齢想定なので「絵=答え」が仕様通りでよい
