---
name: VOICEPEAK 全カテゴリ横断 + Phase 1/2 統合ユニーク化 設計案 (2026-05-12 ユーザー指示、 次バッチから採用) (実装開始 2026-05-13)
description: 同一単語 (= 「二」 「三」 「七」 等の数字単独や色名・体パーツ等) を全カテゴリ + Phase 1/2 で 1 wav に統一し、 アクセント違いが必要なら後で個別に別 wav を追加する設計。 number_sequence バッチ完了 (sw v967 想定) 後、 order_color バッチ着手前に設計実装する
type: project
---

# VOICEPEAK 全カテゴリ横断 + Phase 1/2 統合ユニーク化 設計案

## 確定方針 (2026-05-12 ユーザー指示)
1. 同じ単語 (= 「二」 / 「三」 / 「七」 / 「あか」 / 「みみ」 等) は **全カテゴリ + Phase 1/2 で 1 wav に集約**
2. アクセント違いが必要なら **後で個別に別 wav を追加** する (= 例外運用)
3. 目的: 生成時間短縮 + アクセント微変動の排除 + 管理対象 wav 数の削減

## やってはいけないこと
- 既存の **number_sequence バッチ (= sw v967 想定で進行中)** には影響させない (= 既に書き出した 20 件をやり直さない)
- 次バッチ (= order_color) 着手前に設計を確定すること、 着手後に変更すると混乱再発
- 「アクセント違い」 を理由に集約をサボらない (= まず集約、 違和感あれば例外追加)

## やるべきこと (次バッチ前に実装)

### 1. グローバル wav 命名規則の設計
- 例: `g_<word>.wav` (g = global、 例えば `g_に.wav` `g_あか.wav`)
- もしくは `vocab/<word>.wav` というディレクトリ別
- 既存 q###_*.wav とどう共存させるか整理

### 2. 全カテゴリ speech 抽出 + ユニーク化
- 既存 `voicepeak_lines_full912.csv` の 912 行から speech を抽出
- 全カテゴリ + Phase 1/2 横断でユニーク化
- 推定ユニーク数: 300〜400 程度 (= 現在の合計 ~1500 行から大幅削減)

### 3. 展開 JSON の刷新
- 既存 `voicepeak_unique_expand_<category>_phase<N>.json` (× 16 ファイル) を 1 つに統合
- 新フォーマット: `{ "q169_q": "g_<hash or word>", "q169_b": "g_に", ... }` の grand mapping

### 4. アクセント違い例外管理
- 「同じ単語だがアクセントが違う」 ケースを example で管理
- 例: 「に」 = 数字「ニ」 (= 頭高、 number_sequence で使用) と 助詞「ニ」 (= 平板、 文中で使用) の 2 wav が必要なら、 g_に_high.wav / g_に_flat.wav 等で分岐
- 既存の overwriteAccents 機構と組み合わせ

### 5. Expand スクリプトの刷新
- 既存 `Expand-VoicepeakUniqueWavs.ps1` を「g_<word>.wav → q###_*.wav」 の全カテゴリ横断展開に対応

## Why
- 現状の二重ユニーク化 (= カテゴリ別 + Phase 別) で同じ単語が 4〜8 回も生成されており非効率
- 数字「二」 = number_sequence (q170_b q175_b 等) + count_total (「ふたつ」 と別読み) + ... のように、 全カテゴリで頻出
- 生成回数が増えるごとにアクセント微変動のリスクが累積
- ユーザー判断: 「1 個にしておいて、 アクセント違いがあれば後で別途作る」 が現実解

## How to apply (次バッチ前に思い出す)
- MEMORY.md インデックスから本ファイルを認識したら、 「order_color バッチ着手前に全カテゴリ横断ユニーク化を実装しますか?」 と Claude から能動的に提案
- 設計実装は **number_sequence sw v967 deploy 完了後 + order_color 着手前** のタイミング

## 関連
- [feature_quizland_voicepeak_pivot.md] (主軸変更)
- [feature_quizland_voicepeak_pivot_jyosei4.md] (くるみ話者「女性4」 確定)
- [reference_voicepeak_vdc2_format.md] (辞書 VDC2 仕様)
- 関連ツール: `tools/voicepeak/Expand-VoicepeakUniqueWavs.ps1` (= 刷新対象)
- 関連 batch plan: `tools/voicepeak/BATCH-PLAN-PHASE1-PHASE2.md` (= 設計刷新で見直し)

## 実装履歴 2026-05-13: 数字単独 wav (1-10) をグローバル化、 CSV 削除済、 manifest g_num_*.wav 参照

- ステータス: **集約設計案 → 実装開始** (= 数字パートから着手)
- 数字パート (= 一〜十、 漢字読み + ひらがな読み) を **グローバル wav 化**: `assets/tts/quiz/g_num_1.wav` 〜 `g_num_10.wav` (1 単語 = 1 wav)
- 並列 V1 ジョブで `g_num_*.wav` を配置 + manifest 更新
- 本ジョブ (V2) で カテゴリ別 CSV から **単独数字行** を削除済:
  - `voicepeak_lines_unique_phase1_number_sequence.csv`: 20 → 12 行 (8 行削除、 問題文のみ残る)
  - `voicepeak_lines_phase1_number_sequence.csv`: 24 → 12 行 (12 行削除)
  - `voicepeak_lines_unique_phase2_number_sequence.csv`: 10 → 0 行 (= Phase 2 不正解候補は全部単独数字)
  - `voicepeak_lines_phase2_number_sequence.csv`: 36 → 0 行 (= 同上)
  - `voicepeak_lines_full912.csv`: number_sequence 区画 (L843-902) のみ単独数字 48 行を削除、 912 → 864 行
- 削除対象 = Speech 列が `一/二/三/四/五/六/七/八/九/十` または `いち/に/さん/よん/ご/ろく/なな/はち/きゅう/じゅう` のいずれか
- 他カテゴリ (= order_color, count_total, weather 等) には単独数字行が無いことを scan で確認 (= スコープ外)
- 次のグローバル化対象 (= 順次): 色名 (`g_red.wav` 等)、 体パーツ (`g_mimi.wav` 等)、 天気、 形 等
- 注意: phase2 number_sequence CSV は 0 行になったため、 次回バッチでは投入対象から除外する (= manifest 側で g_num_*.wav を参照)
