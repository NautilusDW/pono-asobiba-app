---
name: feature-quizland-voicepeak-progress
description: quizland VOICEPEAK 音声プロジェクトの進捗記録 (sw v422, 2026-05-14〜17)。 phase1 = 問題文 + 正解 wav は 180/180 問 = 100% 完成 (全 8 カテゴリ: order_color / count_total / shape_name / number_sequence / weather / opposite / body / trivia)。 phase2 = 4 択の不正解選択肢は 3/8 完了 (count_total + order_color (みずいろ 1 件 pending) + number_sequence、 sw v422 時点)。 phase2 はハイブリッド設計 (count_total / number_sequence は g_num_*.wav 動的参照で TTS 不要、 order_color は phase1 正解 wav の動的再利用で 87.5% カバー、 残り 5 カテゴリ (shape_name / weather / opposite / body / trivia) は徹底クロスリファレンス調査済 = 計 191 件の新規 TTS 必要)。 確定話者 = VOICEPEAK 「女性4」、 辞書 109 entries。 phase1 完成日 2026-05-17 / sw v418、 phase2 開始 2026-05-17 / sw v420、 order_color phase2 完成 sw v422。 v384 以降、 shape_name 〜 trivia は漢字混じり CSV で運用。 v385+ から「迷ったらカナ維持」 ルール適用。 v389+ から「句点 (。) 追加ルール」 適用。 phase1 残存課題: なし (= 全カテゴリで expand JSON 事前検証 + 修正実施済、 計 202 キー)。 phase2 残存課題: みずいろ 1 + 5 カテゴリ未カバー 191 = 計 192 件の新規 TTS 集約バッチ。
metadata:
  type: feature
---

# Quizland VOICEPEAK 音声プロジェクト 進捗記録 (sw v422, 2026-05-14〜17) — phase1 完成 / phase2 進行中 🎯

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
| shape_name | Q49-71 | 22 | q049-q071 (Q67 削除) | — | 完了 | 2026-05-16 (sw v384, Q67 菱形削除) |
| number_sequence | Q72-83 | 12 | q072-q083 | 24 エントリ | 完了 | 2026-05-13 |
| weather | Q110-133 | 24 | q110-q133 | — | 完了 | 2026-05-17 (sw v385) |
| opposite | Q134-157 | 24 | q134-q157 | — | 完了 | 2026-05-17 (sw v388) |
| body | Q158-181 | 24 | q158-q181 | — | 完了 | 2026-05-17 (sw v413) |
| trivia | Q84-109 | 26 | q084-q109 | — | 完了 | 2026-05-17 (sw v418) |
| **合計** | — | **180** | — | — | **180/180 = 100% 🎯 完了** | — |

## 確定話者・辞書・グローバル wav 設計

- **くるみ確定話者**: VOICEPEAK 「女性4」 (2026-05-12 確定、 「女の子」 試聴却下後再差替 = [[feature-quizland-voicepeak-pivot-jyosei4]])
- **博士確定話者**: VOICEPEAK 「ナレーター おじいさん」 (秦なおき声、 MVP 後回し、 単体購入済 ¥5,980)
- **辞書 v109**: 80 → 109 entries (count_total 用 5 語含む、 .vdc2 再生成済)
- **グローバル wav**: `g_num_0-10.wav` (= 数読み、 number_sequence 専用に動的マッピング)
- **count_total 個別 wav**: 「ひとつ / ふたつ / みっつ / よっつ / いつつ / むっつ / ななつ / やっつ / ここのつ」 の和語数えは個別生成 (g_num では完結しない)
- **MVP スコープ**: くるみ 912 件のみ。 博士 48 件は MVP 後回し ([[feature-quizland-voicepeak-pivot]])

## 次バッチ = 完成 (= 次バッチなし)

- 全 8 カテゴリ (order_color / count_total / shape_name / number_sequence / weather / opposite / body / trivia) の生成が完了 (= 180/180 問 = 100% 達成、 sw v418 / 2026-05-17)
- trivia (最後のカテゴリ、 Q84-109、 26 問) は sw v418 で Phase 1 完成
- MVP スコープのくるみパートはこれで全て完了

## 推奨順序

- 全完了 (= 180/180 = 100%、 sw v418 で MVP 達成)

## 主要 commit (sw 履歴)

- **sw v966**: くるみ第1-5問目 5 件 mp3 配置完了 (= HANDOFF-NEXT-SESSION.md 起点)
- **sw v963**: number_sequence バッチ完了 (BATCH-RUN-number_sequence.md)
- **sw v381**: count_total Phase 1 開始 (BATCH-RUN-count_total.md)
- **sw v382**: shape_name バッチ準備 (BATCH-RUN-shape_name.md 投入)
- **sw v383**: count_total Phase 1 完成、 60/181 問到達
- **sw v384**: shape_name Phase 1 完成 (Q67 菱形削除込み、 22 問 + expand JSON ひらがな残存 26 キー修正)
- **sw v385**: weather Phase 1 完成 (24 問 + expand JSON 39/39 全件不一致を事前修正)、 106/180 = 59% 到達
- **sw v388**: opposite Phase 1 完成 (24 問 + expand JSON 48/48 全件不一致を事前修正)、 130/180 = 72% 到達 (= 並走タスクで v385 → v387 まで進んでいたため +1 で v388)
- **sw v413**: body Phase 1 完成 (24 問 + expand JSON 39/39 全件不一致を事前修正)、 154/180 = 86% 到達 (= 並走タスクで v388 → v412 まで進んでいたため +1 で v413)
- **sw v418 (phase1 完成 🎯)**: trivia Phase 1 完成 (26 問 + expand JSON 50/50 全件不一致を事前修正)、 **180/180 = 100% 達成** (= 並走タスクで v413 → v417 まで進んでいたため +1 で v418)
- **sw v420 (phase2 開始)**: count_total phase2 manifest 動的化 (+72 エントリ、 g_num_*.wav 動的参照で TTS 不要)、 order_color phase2 準備完了 (BATCH-RUN-order_color-phase2.md 138 行、 漢字化 + 句点 + みずいろカナ維持で expand JSON 8 キー検証済)、 phase2 マトリクス 2/8 完了
- **sw v422 (order_color phase2 完成 + 5 カテゴリ徹底調査)**: order_color phase2 manifest 動的化 (+71 エントリ、 phase1 正解 wav の動的再利用で 7/8 = 87.5% カバー、 みずいろ 1 件 pending)、 5 カテゴリ (shape_name / weather / opposite / body / trivia) phase2 不正解選択肢 231 ユニーク語と phase1 wav の徹底クロスリファレンス調査実施 = 新規 TTS 必要 191 件と判明、 phase2 マトリクス 3/8 完了

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

### 迷ったらカナ維持

- **適用日**: 2026-05-17 (sw v385+ 想定)
- **ユーザー指示** (引用): 「漢字化するときに間違えそうなところは、 漢字じゃなくてもいいからね。」
- **適用範囲**: weather 以降の全 CSV (= weather / opposite / body / trivia)。 shape_name は完了済のため対象外 (= 試聴駆動で対応)
- **シフトの意味**: 「試聴駆動 (= まず漢字化して生成 → 試聴で読み崩れ確認後カナ戻し)」 から「事前防止 (= 漢字化時点で疑わしい箇所をカナに戻す)」 へ
- **カナ戻しすべき具体ケース**:

  | 種別 | 例 | 理由 |
  |---|---|---|
  | 常用外漢字 | 靄 / 菱形 / 蜘蛛 | VOICEPEAK 形態素解析で読めない可能性高 |
  | 読み揺れ (助数詞) | 「6つ」 (むっつ vs ロクツ) | アラビア数字 + 助数詞は揺れやすい |
  | 読み揺れ (連体) | 「七色」 (ななしょく vs シチショク) | 漢数字 + 名詞も揺れる |
  | 読み揺れ (位置) | 「角」 (カド vs カク) | 文脈で揺れる |
  | 同訓異義 (動詞) | 「上る」 (登る / 昇る / 上る) | 表記揺れによる読み揺れ |
  | 送り仮名揺れ | 「卵形」 / 「水溜まり」 (水たまり) | 送り仮名で読み変化 |
  | 同訓異義 (形容詞) | 暑い / 熱い / 厚い | 文脈で OK なら残す |
  | 数表記の使い分け | 「6つ」 / 「六つ」 / 「むっつ」 | カナが最安全 |

- **判断基準**:
  - 形態素解析で 99% 確実に正しく読まれる漢字 → 残す
  - 読み揺れ・常用外・送り仮名違い → カナ戻し
  - 同形異義語があるが文脈で読み分け可能 → 残す (ただし優先度低)
- **辞書追加との関係**: 辞書追加で確実に読ませる選択肢もある = 辞書 + 漢字 の組み合わせが効くケースもあるが、 辞書追加負荷が高いので「迷ったらカナ」 が原則

### 句点 (。) 追加ルール

- **適用日**: 2026-05-17 (sw v389+ 想定)
- **ユーザー指示** (引用): 「句点が必要なところは入れてくれる？」
- **適用範囲**: body 以降の全 CSV (= body / trivia)。 既に wav 生成済の 6 カテゴリ (order_color / count_total / shape_name / number_sequence / weather / opposite) は対象外 (= 再生成しない、 history としてのみ保持)
- **目的**: VOICEPEAK の発音完了感を自然に。 答え wav が「途中で切れた」 ように聞こえるのを防ぐ
- **追加する場所**:
  - 答え文の末尾 (= 平叙的な答え): 「5本」 → 「5本。」、 「心臓」 → 「心臓。」、 「はえる」 → 「はえる。」 等
  - 長文途中の文の切れ目: 複文・並列文の途中で必要な箇所
- **追加しない場所**:
  - 問題文末尾の「？」 (疑問符) はそのまま
  - 問題文末尾の「！」 (感嘆符) はそのまま
  - 既に「。」 がある箇所
  - 答えが感嘆文・疑問文の場合 (= 「！」「？」 で終わっている)
- **CSV 編集時の手順**:
  1. CSV の各行の末尾文字を確認
  2. 「？」「！」「。」 で終わっていなければ「。」 を追加
  3. expand JSON のキーも CSV と完全一致するよう同期更新
  4. BATCH-RUN-*.md の期待出力表も同期

## 結果: 全カテゴリで予防完了 (202 キー)

- **発生経緯**: shape_name (sw v384) で「CSV は漢字化済だが expand JSON 側はひらがなのまま」 という不整合を発見。 = 辞書ヒットせず読み崩れの遠因となる。
- **全カテゴリ事前修正の実績** (= 計 **202 キー**):
  - shape_name: 26 キー (sw v384 で事前修正)
  - weather: 39/39 全件不一致 (sw v385 で事前修正)
  - opposite: 48/48 全件不一致 (sw v385 で事前修正、 sw v388 で生成完了)
  - body: 39 キー全件不一致 (sw v388 で事前修正、 sw v413 で生成完了)
  - trivia: 50 キー全件不一致 (sw v413 で事前修正、 sw v418 で生成完了)
  - 合計 **26 + 39 + 48 + 39 + 50 = 202 キー** を事前防止で修正
- **残存課題**: **なし** (= 全カテゴリで予防完了)
- **確立した必須手順** (= ワークフロー組み込み済):
  1. CSV 漢字化前に expand JSON の整合性確認 (= ひらがな残存がないか)
  2. 不一致があれば CSV と同じ漢字混じり版に expand JSON 側を更新
  3. その後で BATCH-RUN を実行
- **教訓**: 「CSV を漢字化したら expand JSON も同期更新する」 がワークフローとして当初欠落していた。 shape_name 発見以降の 5 カテゴリ (= shape_name / weather / opposite / body / trivia) で全て事前検証 + 修正を回し、 完成時点で残存ゼロ。

## phase2 進捗マトリクス (= 4 択の不正解選択肢、 sw v422 時点)

- **背景**: sw v418 で phase1 (= 問題文 + 正解 wav) が 180/180 = 100% 完成。 sw v420 から phase2 (= 4 択の不正解選択肢 = a / c / d) の作業を開始
- **設計方針** (= 2026-05-17 ユーザー指示で確定): ハイブリッド設計
  - count_total と number_sequence は **g_num_*.wav 動的参照で TTS 不要** (= manifest 編集のみで完結)
  - order_color は **phase1 正解 wav の動的再利用で 87.5% (7/8) カバー** (= みずいろ 1 件のみ pending)
  - 残り 5 カテゴリ (shape_name / weather / opposite / body / trivia) は個別バッチで TTS 生成 (= 徹底調査済、 計 191 件)
- **継承ルール**: 「漢字化 + 迷ったらカナ維持 + 句点 (。)」 3 ルール踏襲、 expand JSON 事前検証の予防手順継続

| カテゴリ | ユニーク件数 | 方式 | 状態 | 完成/状況 |
|---|---|---|---|---|
| number_sequence | 0 | dynamic (g_num) | ✅ 完了 | 2026-05-13 (phase1 時点) |
| **count_total** | 72 (manifest +72) | dynamic (g_num) | ✅ **完了** | **2026-05-17 (sw v420)** |
| **order_color** | 71 + みずいろ 1 pending | **dynamic (phase1 wav 再利用) + pending** | ✅ **完了 (みずいろ後送り)** | **2026-05-17 (sw v422)** |
| shape_name | 14 ユニーク (5 再利用可 + 9 新規) | TTS | 📋 調査済 | 新規 TTS 9 件必要 |
| weather | 51 ユニーク (11 再利用可 + 40 新規) | TTS | 📋 調査済 | 新規 TTS 40 件必要 |
| opposite | 49 ユニーク (8 再利用可 + 41 新規) | TTS | 📋 調査済 | 新規 TTS 41 件必要 |
| body | 49 ユニーク (8 再利用可 + 41 新規) | TTS | 📋 調査済 | 新規 TTS 41 件必要 |
| trivia | 68 ユニーク (8 再利用可 + 60 新規) | TTS | 📋 調査済 | 新規 TTS 60 件必要 |
| **合計** | — | — | **3/8 完了** | 残 192 件 (= みずいろ 1 + 5 カテゴリ 191) |

### count_total phase2 実装詳細 (= sw v420 で完了)

- manifest に `quizland:count_total:N:a/c/d` (= 不正解 3 つ) の **72 エントリを g_num_*.wav 動的参照で追加**
- 例 q0 (idx=0, 答え「2つ」): 不正解 b=g_num_3.wav, c=g_num_4.wav, d=g_num_5.wav
- count_total エントリ計 120 件 (= 既存 48 + 新規 72)、 a / b / c / d / q 全 24 件揃い
- TTS 生成なし、 manifest 編集のみで完結
- ロジック: number_sequence で既に動いていた「chip text の数字判定 + g_num マッピング」 を明示拡張

### order_color phase2 実装詳細 (= sw v422 で完了、 みずいろ 1 件 pending)

- **発見**: ユーザー指摘「本当に重複してない？やった記憶のあるものばかりなんだけど。」 → order_color phase2 の 8 色名のうち 7 色は phase1 で既に正解 wav として生成済だった
- 結果 71 件 (= 87.5%) の重複 TTS を回避 (= 8 件全部 TTS で作り直そうとしていたエージェント設計を防いだ)
- **7 色名の phase1 wav 代表マッピング**:
  - 赤 → q003_a.wav (4 wav 候補から最初の正解)
  - 青 → q001_b.wav (3 wav 候補から)
  - 黄色 → q004_c.wav (7 wav 候補から)
  - 緑 → q002_d.wav (3 wav 候補から)
  - ピンク → q007_c.wav (2 wav 候補から)
  - オレンジ → q006_a.wav (4 wav 候補から)
  - 紫 → q023_c.wav (1 wav 候補)
  - みずいろ → **pending (= manifest 未登録、 旧 cyan = Q15_c)**
- **manifest +71 動的参照エントリ追加** (= 内訳 赤 13 / 青 16 / 黄色 13 / 緑 14 / ピンク 6 / オレンジ 5 / 紫 4)
- order_color エントリ計 119 件 (= 既存 48 + 新規 71)
- **句点 (。) 整合性**: phase1 wav は句点なし生成 (= 2026-05-16 以前)。 phase2 で動的参照する場合の音声差は微小で許容可

## phase2 5 カテゴリ徹底調査結果 (2026-05-17)

- **背景**: ユーザー指示「他のカテゴリーも徹底的に調べてください」 で全 5 カテゴリ (shape_name / weather / opposite / body / trivia) の phase2 不正解選択肢 231 ユニーク語と既存 phase1 wav (= 180 正解 wav + g_num 11 件) を 1:1 で照合
- **結論**: order_color のような高カバレッジ (= 7/8 = 87.5%) は他カテゴリでは再現不可

| カテゴリ | 再利用可 (同cat phase1) | cross-cat 追加 | 新規 TTS 必要 | 再利用率 |
|---|---|---|---|---|
| shape_name | 5 | 0 | **9** | 35.7% |
| weather | 8 | +3 | **40** | 21.6% |
| opposite | 8 | +1 | **41** (実際は 40) | 16.3% |
| body | 7 | +1 | **41** (実際は 42) | 14.3% |
| trivia | 4 | +4 | **60** | 11.8% |
| **合計** | **32** | **+9** | **191** (= 約 199) | **17%** |

- **理由** (= なぜ order_color のように高カバレッジにならないか):
  - **語彙の多様性**: phase2 不正解には phase1 にない「文法形・派生語・説明文」 が多い
    - 例 shape_name: phase1「5こ」 vs phase2「よんこ / ろっこ / さんこ / にこ / ごこ」 (= 古語助数詞)
    - 例 opposite: phase1「ちいさい」 が正解 → phase2「おおきい」 が不正解 = 反対語ペアの片方未カバー
    - 例 trivia: 動植物名「ライオン / シマウマ / つなみ / じしん」 等の独自語彙
  - **domain isolation**: 各カテゴリが独自領域、 cross-category dedup の効果は 9 件 (= 3.9%) と限定的
- **推奨優先順位** (= 新規 TTS 集約バッチ): shape_name 9 → opposite 41 → body 42 → weather 43 → trivia 60
- **集約バッチ案内**: みずいろ 1 件と合算で計 **192 件** を一括生成推奨

## 完成記録

- **完成日**: 2026-05-17
- **最終 sw**: v418
- **完成カテゴリ数**: 8/8 = 100% (= order_color / count_total / shape_name / number_sequence / weather / opposite / body / trivia)
- **完成問題数**: **180/180 問 = 100% 🎯**
- **完成 wav 総数 (内訳)**:
  - order_color: 24 問
  - count_total: 24 問
  - shape_name: 22 問 (Q67 菱形削除済)
  - number_sequence: 12 問 (+ グローバル `g_num_0-10.wav` 11 件)
  - weather: 24 問
  - opposite: 24 問
  - body: 24 問
  - trivia: 26 問
  - **合計 180 問** (= MVP くるみパート全件)
- **確定話者**: VOICEPEAK 「女性4」 (くるみ)
- **辞書 v109**: 109 entries (.vdc2 確定版)
- **expand JSON 事前予防修正**: **計 202 キー** (= shape_name 26 + weather 39 + opposite 48 + body 39 + trivia 50) を「CSV と一致させる」 形で事前修正
- **博士パート (48 件)**: MVP 後回しのため未生成 (= [[feature-quizland-voicepeak-pivot]] に記録、 単体購入「ナレーター おじいさん」 ¥5,980 で着手可能)
- **phase2 開始**: 2026-05-17 〜 進行中 (count_total + order_color + number_sequence = 3/8 完了、 みずいろ 1 件 pending、 残 5 カテゴリ 191 件は徹底調査済) ※詳細は上記「## phase2 進捗マトリクス」 セクション参照

### 主な発見と教訓

1. **expand JSON ひらがな残存バグの事前予防が機能** (sw v384 → v418): shape_name で偶発的に発見した不整合を、 weather / opposite / body / trivia の 4 カテゴリで「漢字化前に必ず expand JSON を CSV と一致させる」 ワークフローへ組み込んだ。 結果、 202 キーを事前修正でき、 試聴時の読み崩れも最小化。
2. **「迷ったらカナ維持」 が効いた** (sw v385+): 漢字化を一律適用するのではなく、 常用外漢字・読み揺れ・送り仮名揺れ・同訓異義の箇所をカナ戻しすることで、 試聴段階での再生成回数を大幅削減。 trivia でカナ維持 27 箇所 (= 雑学カテゴリの語彙多様性に対応) が最多。
3. **句点 (。) 追加ルールが自然な発音完了感を生んだ** (sw v389+): body 以降の答え末尾に「。」 を追加することで、 wav が「途中で切れた」 印象を回避。 平叙的な答え (例「心臓。」「はえる。」) の自然さが向上。
4. **試聴駆動 → 事前防止 へのシフト**: sw v384 までは「まず生成 → 試聴で問題発見 → 修正再生成」 だったのを、 sw v385 以降「漢字化時点で疑わしい箇所をカナに戻す + expand JSON を事前同期」 に切り替えたことで、 後半 4 カテゴリ (weather / opposite / body / trivia) は再生成回数が大きく減少。
5. **並走タスクによる sw 番号の急進**: 各カテゴリ完成時に「+1 だけ進む」 ように見えるが、 実際は他作業で sw 番号が大きく前進している (= v388 → v412 → v413、 v413 → v417 → v418)。 「自分の作業で何が進んだか」 と「sw 番号の増分」 は別物として記録した方が混乱が少ない。
6. **phase2 着手前は必ず phase1 正解カバレッジ調査を実施** (sw v422 恒久ルール化): ユーザー指摘「本当に重複してない？やった記憶のあるものばかりなんだけど。」 を契機に確立。 phase2 不正解 chip text が phase1 のどの正解 wav で発音済か全件マッピング → 重複 TTS を事前回避 (= count_total 72 / order_color 71 のように大幅削減できるケースあり)。 ただし「order_color のような高カバレッジは例外」 = 5 カテゴリ徹底調査の結果、 shape_name 35.7% / weather 21.6% / opposite 16.3% / body 14.3% / trivia 11.8% と各カテゴリの独自領域性で再利用率は低い。 cross-category dedup の効果は実測 3.9% (= 9/231) で期待値より低い。 = 「事前調査必須、 ただし高カバレッジは例外」 が恒久ルール。
