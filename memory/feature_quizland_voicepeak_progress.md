---
name: feature-quizland-voicepeak-progress
description: quizland VOICEPEAK 音声プロジェクトの進捗追跡 (sw v383, 2026-05-16 時点)。 完了 3 カテゴリ (order_color / count_total / number_sequence = 60/181 問 = 33%)、 準備完了 1 (shape_name)、 未着手 4 (trivia / weather / opposite / body)。 確定話者 = VOICEPEAK 「女性4」、 辞書 109 entries。 セッション再開時はここを最初に Read して現状把握する。 v384 以降、 shape_name 〜 trivia は漢字混じり CSV で運用。
metadata:
  type: feature
---

# Quizland VOICEPEAK 音声プロジェクト 進捗追跡 (sw v383, 2026-05-16)

## なに

- quizland VOICEPEAK 音声プロジェクトの「現在の進捗」 を一元管理する進捗追跡メモリ
- **セッション再開時に最初に Read する対象** (= 静的事実は [[feature-quizland-voicepeak-pivot]] 等、 流動的な進捗は本ファイル)
- 既存メモリ群との役割分担:
  - 主軸変更経緯 → [[feature-quizland-voicepeak-pivot]] / [[feature-quizland-voicepeak-pivot-jyosei4]]
  - 発注書 3 本概要 → [[feature-quizland-voicevox-order]]
  - cross-category dedup 設計 → [[feature-voicepeak-cross-category-dedup]]
  - くるみキャラ設定 → [[feature-quizland-kurumi]]
  - 購入済ボイス → [[reference-voicepeak-voices-purchased]]
  - VDC2 フォーマット → [[reference-voicepeak-vdc2-format]]
  - Q### 真値 → [[feedback-questions-js-q-number-canonical-source]]

## 進捗マトリクス

| カテゴリ | Q### 範囲 | 件数 | wav 配置 | manifest | 状態 | 完成時期 |
|---|---|---|---|---|---|---|
| order_color | Q1-24 | 24 | q001-q024 | 48 エントリ | 完了 | 2026-05-12 以前 |
| count_total | Q25-48 | 24 | q025-q048 | 48 エントリ | 完了 | 2026-05-16 (sw v383) |
| shape_name | Q49-71 | 23 | — | — | 準備完了 | (BATCH-RUN / 出力先既存) |
| number_sequence | Q72-83 | 12 | q072-q083 | 24 エントリ | 完了 | 2026-05-13 |
| trivia | Q84-109 | 26 | — | — | 未着手 | — |
| weather | Q110-133 | 24 | — | — | 未着手 | — |
| opposite | Q134-157 | 24 | — | — | 未着手 | — |
| body | Q158-181 | 24 | — | — | 未着手 | — |
| **合計** | — | **181** | — | — | **60/181 = 33%** | — |

## 確定話者・辞書・グローバル wav 設計

- **くるみ確定話者**: VOICEPEAK 「女性4」 (2026-05-12 確定、 「女の子」 試聴却下後再差替 = [[feature-quizland-voicepeak-pivot-jyosei4]])
- **博士確定話者**: VOICEPEAK 「ナレーター おじいさん」 (秦なおき声、 MVP 後回し、 単体購入済 ¥5,980)
- **辞書 v109**: 80 → 109 entries (count_total 用 5 語含む、 .vdc2 再生成済)
- **グローバル wav**: `g_num_0-10.wav` (= 数読み、 number_sequence 専用に動的マッピング)
- **count_total 個別 wav**: 「ひとつ / ふたつ / みっつ / よっつ / いつつ / むっつ / ななつ / やっつ / ここのつ」 の和語数えは個別生成 (g_num では完結しない)
- **MVP スコープ**: くるみ 912 件のみ。 博士 48 件は MVP 後回し ([[feature-quizland-voicepeak-pivot]])

## 次バッチ = shape_name

- 発注書 = `tools/voicepeak/BATCH-RUN-shape_name.md` (sw v382 時点で準備済)
- 出力先パス = `assets/tts/quiz/q049_*.wav` 〜 `q071_*.wav` (= 23 問)
- **試聴駆動方針**: 1 件生成 → 試聴 → OK なら次へ、 NG ならアクセント/辞書調整 → 再生成
- shape_name は cross-category dedup 設計 ([[feature-voicepeak-cross-category-dedup]]) の影響を受ける (= 形の名前で他カテゴリと重複する語があれば集約)

## 推奨順序

1. **shape_name** (Q49-71、 23 問) ← 次バッチ (準備済)
2. **weather** (Q110-133、 24 問) — 天気語彙は重複少なめ・難易度低
3. **opposite** (Q134-157、 24 問) — 反対語ペア、 cross-category dedup 候補多め
4. **body** (Q158-181、 24 問) — 体パーツ、 dedup 候補多め (色名・数字とは独立)
5. **trivia** (Q84-109、 26 問) — 文章長め・固有名詞含む、 最難関のため最後

合計 121 問追加 → 181/181 = 100% で MVP 達成。

## 主要 commit (sw 履歴)

- **sw v966**: くるみ第1-5問目 5 件 mp3 配置完了 (= HANDOFF-NEXT-SESSION.md 起点)
- **sw v963**: number_sequence バッチ完了 (BATCH-RUN-number_sequence.md)
- **sw v381**: count_total Phase 1 開始 (BATCH-RUN-count_total.md)
- **sw v382**: shape_name バッチ準備 (BATCH-RUN-shape_name.md 投入)
- **sw v383 (現行)**: count_total Phase 1 完成、 60/181 問到達

## 関連メモリ

- [[feature-quizland-voicepeak-pivot]] (主軸変更経緯)
- [[feature-quizland-voicepeak-pivot-jyosei4]] (「女性4」 確定)
- [[feature-quizland-voicevox-order]] (発注書 3 本概要)
- [[feature-voicepeak-cross-category-dedup]] (cross-category dedup 設計)
- [[feature-quizland-kurumi]] (くるみキャラ設定)
- [[reference-voicepeak-voices-purchased]] (購入済ボイス)
- [[reference-voicepeak-vdc2-format]] (VDC2 フォーマット)
- [[feedback-questions-js-q-number-canonical-source]] (Q### 真値)

## 関連ファイル

- `tools/voicepeak/HANDOFF-NEXT-SESSION.md` (引き継ぎ書、 sw v383 最新化済)
- `tools/voicepeak/BATCH-RUN-number_sequence.md` (sw v963 時点、 完了済バッチの履歴)
- `tools/voicepeak/BATCH-RUN-count_total.md` (sw v381 時点、 完了済バッチの履歴)
- `tools/voicepeak/BATCH-RUN-shape_name.md` (sw v382 時点、 次バッチ準備済)
- `tools/voicepeak/voicepeak_user_dict.csv` (109 entries)
- `tools/voicepeak/voicepeak_user_dict.vdc2`
- `assets/tts/manifest.json` (120 エントリ登録済)
- `assets/tts/quiz/q###_*.wav` (60 問 + g_num 11 件 + α)

## 漢字化方針 (sw v384 想定、 2026-05-16 ユーザー指示)

- **適用範囲**: shape_name 以降の CSV (= shape_name / weather / opposite / body / trivia)
- **適用対象外**: 完了済 3 カテゴリ (order_color / count_total / number_sequence) は wav 生成済のため**再生成しない** (= ひらがな CSV のまま放置、 history としてのみ保持)
- **目的**: VOICEPEAK の形態素解析・アクセント推定の安定化、 同音異義語の誤読回避 (例「あめ」 → 「雨」/「飴」)、 辞書追加負荷の軽減
- **漢字化ガイドライン**:
  - 名詞: 漢字化 (ほし → 星、 かたち → 形)
  - 動詞: 漢字化 (いくつ → 幾つ、 補助動詞「ある」 はカナ維持)
  - 形容詞: 漢字化可能なら (おおい → 多い、 まんまるい → 真ん丸い)
  - 副詞・連体詞: 常用漢字なら漢字化、 そうでなければカナ維持 (どんな / どれ はカナ維持)
  - 数詞: 漢数字化 (ご → 五、 さん → 三)
  - 助数詞: 漢字化 (こ → 個、 ひとつ → 一つ)
  - 美化語の「お」: 漢字化しない (お花 / お星様 はそのまま)
  - 助詞: そのまま (は / の / が / を / と)
  - カタカナ語: 漢字化しない (ピザ / ハート / ダイヤ)
- **適用済 CSV** (= 今回 shape_name で実施):
  - `voicepeak_lines_unique_phase1_shape_name.csv` (26 行)
  - `voicepeak_lines_phase1_shape_name.csv` (46 行)
- **次回適用予定**: weather / opposite / body / trivia の CSV (= 着手時に漢字化してから書き出し)
- **既存博士パート計画との関係**: [[feature-quizland-voicepeak-pivot]] に「博士パート向けの漢字混じり化計画」 があったが、 v384 でくるみパート (shape_name 以降) にも適用拡大
- **試聴駆動方針との両立**: 漢字化により辞書追加は減るが完全に無くなるわけではない。 試聴で読み崩れがあれば従来通り辞書追加 → 再書き出し
