---
name: Quizland 最終問題「さいごの もんだい！」バルーン
description: 最終問題(既定5問モードの5問目)で qno_plate と同時に「さいごの もんだい！」透過バルーンを plate の上に重ねて表示。sw v1098 で追加
type: project
---

# Quizland 最終問題バルーン (sw v1098, 2026-06-14)

## 仕様
- 最終問題に入ったとき、中央の出題番号プレート (`#qno-plate-img` = 「だい5もんめ！」 `qno_plate_5.png`) の **真上に**「さいごの もんだい！」バルーン (`#qno-final-balloon-img`) を**同時に**ポップイン。保持・フェードアウトもプレートと完全同期。
- ユーザー要望: 「最後の問題の時にバルーンを出す / 5問目の時に『5問目』とこれを同時に出す」。= 「だい5もんめ」プレート(=5問目の合図)とバルーンの 2 つを同時表示。
- アセット: `assets/images/quizland/final_q_balloon.webp` (透過, 600×324, ~117KB)。元画像 `D:\ポノのおへや\Dr.owl'quiz\No\ChatGPT Image 2026年6月14日 15_54_22.png` (黒背景) から切り出し。

## 実装ポイント (quizland/index.html)
- DOM: `#qno-plate-overlay` 内で `.qno-plate-stack` (flex column, 中央寄せ) にバルーン + 既存 plate を縦積み。バルーンが上、plate が下。Q1–Q4 はバルーン `display:none` で plate 単独でも従来通り中央表示。
- アニメ同期: バルーンも `.qno-plate-overlay.is-impact` (qnoImpact スケールイン) / `.is-fadeout` (opacity:0) を共有。既定 `transform:scale(0); opacity:0`。
- **ゲート条件 (非自明・重要)**: `playQuestionNumberPlate(qIdx)` 内で `totalQuestions > 1 && qIdx === totalQuestions - 1` の時だけ `.show` + src 設定。`updateHUD` の `#final-q-badge` ロジックと一致させる。
  - 既定 5 問モード → 5問目 (qIdx 4) で発火。
  - `QZ_DEBUG_ALL` (169問) では plate は qIdx<5 で出るが qIdx 4 ≠ 最終問題なのでバルーンは出ない (totalQuestions を真値参照)。
- `hideQuestionNumberPlate()` でバルーンも `.show` 除去 + `src=''`。次問へ持ち越さない。
- タイトルタップ時のプリロード配列 (qno_plate_1〜5 と同列) に `final_q_balloon.webp` を追加。

## アセット切り出しの教訓 (非自明)
- 元画像の背景は**純黒ではなく暗い茶色の放射ビネット** (ルミナンス ~57–90)。単純なルミナンス閾値や「全シルエットを fill_holes」だと**光線の隙間と四隅にビネットが焼き込まれ茶色いハロ**が残る (初回切り出しで実際に発生→レビュー指摘で再切り出し)。
- 正しい手法 = 雲と光線を別マスクで処理して max 合成:
  - 光線/星: `smoothstep(lum, ~115, ~185)` → 暗い隙間/ビネットは透明、明るい金色光線は不透明。
  - 雲本体: `lum>150` → `binary_opening`(thin 光線を消す) → 最大連結成分 → `binary_fill_holes` で雲内部の茶色輪郭ごと不透明化。
  - `alpha = max(雲solid, 光線alpha)` → 光線の隙間は兄弟プレート `qno_plate_5.png` と同じく透明になる。軽い feather(σ~1.2)。
- 検証は**兄弟プレートと teal 背景で並置合成**して隙間の透過を比較する (単体判定だと茶色ハロを見落とす)。
- 最適化: 元 1.74MB PNG → 表示は ~46vw なので 600px 幅 WebP q~82 に縮小 (~117KB)。プロジェクト標準の最適化 WebP に合わせる。

## 関連
- [[feature_quizland_number_sequence]] (だい N もん plate / kurumi 音声の流れ)
- [[feature_quizland_per_question_layout]]
