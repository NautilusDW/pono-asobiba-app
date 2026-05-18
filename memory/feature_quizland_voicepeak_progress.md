---
name: feature-quizland-voicepeak-progress
description: quizland VOICEPEAK 音声プロジェクトの進捗記録 (sw v452, 2026-05-14〜18) — phase2 100% 完成 🎯。 phase1 = 問題文 + 正解 wav は 180/180 問 = 100% 完成 (全 8 カテゴリ: order_color / count_total / shape_name / number_sequence / weather / opposite / body / trivia)。 phase2 = 4 択の不正解選択肢は **866 manifest エントリ = 100% 完成** (= order_color 120 / count_total 120 / shape_name 110 / number_sequence 24 / weather 120 / opposite 120 / body 121 / trivia 130、 alt 含む正常超過)。 sw v450 で phase2_uncovered 最終バッチ (= 238 wav + 224 manifest エントリ) を取り込み 99.7%、 sw v452 で残 3 件 (= body q171_c「ときどき はえる」 / trivia q102_b「ライオン」 / q104_b「ジンベイザメ」) を既存 wav コピー + 動的参照で復旧し 100% 達成 (= 新規 TTS ゼロ)。 残課題は q109_d「角」 試聴課題 1 件のみ (= 試聴判定後、 誤読なら 1 件ミニ TTS バッチ)。 phase2 はハイブリッド設計 (count_total / number_sequence は g_num_*.wav 動的参照で TTS 不要、 order_color は phase1 正解 wav の動的再利用で 87.5% カバー、 残り 5 カテゴリ shape_name / weather / opposite / body / trivia は phase1 wav 再利用 +135 動的エントリ追加 + 集約バッチ 190 unique → 238 q### 展開で本番組込み + sw v452 残 3 件復旧)。 確定話者 = VOICEPEAK 「女性4」、 辞書 109 entries。 phase1 完成日 2026-05-17 / sw v418、 phase2 開始 2026-05-17 / sw v420、 order_color phase2 完成 sw v422、 5 カテゴリ manifest 動的化 sw v424、 uncovered 最終バッチ取り込み sw v450 / 2026-05-18、 **phase2 100% 完成達成 sw v452 / 2026-05-18**。 v384 以降、 shape_name 〜 trivia は漢字混じり CSV で運用。 v385+ から「迷ったらカナ維持」 ルール適用。 v389+ から「句点 (。) 追加ルール」 適用。 v447+ から「日本語接続統一ルール」 適用 (2026-05-18 ユーザー指摘から導出)。 phase1 残存課題: なし (= 全カテゴリで expand JSON 事前検証 + 修正実施済、 計 202 キー)。 phase2 残存課題: 全件解決済 (= q109_d「角」 試聴判定済、 「つの」 と正しく読まれていることをユーザー確認、 修正不要)。
metadata:
  type: feature
---

# Quizland VOICEPEAK 音声プロジェクト 進捗記録 (sw v452, 2026-05-14〜18) — phase2 100% 完成 🎯

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
- **sw v424 (5 カテゴリ phase2 manifest 動的化 + 集約 CSV 完成)**: shape_name / weather / opposite / body / trivia の 5 カテゴリで phase1 wav を再利用する manifest 動的化エントリを **+135 件追加** (= shape_name 54 / weather 31 / opposite 17 / body 23 / trivia 10)、 phase2 全 490 件中 **278 件 (= 57%) を manifest 動的化済**、 残 197 件を cross-category dedup で **190 ユニークに集約** (= 重複 7 件: おなじ / 飛ぶ / 夕方 / 真夜中 / 4本 / 6本 / 煙)、 集約バッチ準備完了 (= voicepeak_lines_unique_phase2_uncovered.csv 190 行 + expand JSON 2 本 + BATCH-RUN-uncovered.md 約 200 行 + tmp/quizland_NA/phase2_uncovered/ 出力先作成)
- **sw v447 (日本語接続統一ルール導出)**: q091 (trivia L1) の「まるい ちいさい / とがって ちいさい」 をユーザー指摘で発見し、 「形容詞 + 形容詞 = て接続 / 動詞テ形 + 形容詞 = ている形」 ルールを全カテゴリ phase2 不正解選択肢に適用、 表記揺れ全件調査で他カテゴリには重大問題なしと確認
- **sw v450 (phase2 uncovered 最終バッチ取り込み 99.7% 達成)**: ユーザー出力 190 wav (= 集約 phase2_uncovered) を本番組込み、 Expand で 190 unique → **238 q### に展開** (= cross-cat 重複 48 件含む、 Python 直接展開)、 `assets/tts/quiz/` に 238 wav 新規配置 (= 372 → 610)、 `manifest.json` に 224 エントリ追加 (= 349 既存温存 + **25 衝突保護** = number_sequence g_num_*.wav と q07x_b/c の優先関係維持)、 CACHE_VERSION v449 → v450。 manifest verify で **3 件欠落検出** (= body q171_c「ときどき はえる」/ trivia q102_b「ライオン」/ q104_b「ジンベイザメ」 = 当初は wav 出力漏れと判断) + q109_d「角→つの」 試聴課題 = 計 4 件をミニ TTS バッチで対応予定。 phase2 完成度 **863/864 = 99.7%**
- **sw v450 → v452: 残 3 件復旧 (= 既存 wav コピー + 動的参照、 TTS 不要)**: ユーザー指摘 (= 「番号 000 から始まって CSV の順番通り」「全部やった」) で真因切り分け実施。 wav 生成漏れではなく **detail JSON のマッピング漏れ** が真因と判明 (= 同一 chip text が複数 q### で再利用されるパターンを集約エージェントが見落とし、 「ライオン」 は q096_a + q098_b + q102_b の 3 箇所、 「ときどき はえる」 は q171_c + q175_c の 2 箇所で参照)。 ユーザー出力 190 wav は全件正常生成済だった。
- **sw v452 (現行) — phase2 100% 完成達成 🎯**: 残 3 件を以下で復旧 = 新規 TTS ゼロ:
  - q171_c.wav: 既存 wav (q175_c.wav「ときどき はえる」) コピーで復旧
  - q102_b.wav: 既存 wav (q096_a.wav または q098_b.wav「ライオン」) コピーで復旧
  - trivia:20:b (ジンベイザメ): manifest 動的参照で phase1 正解 wav (q102_c.wav) を再利用 (= CSV 対象外、 既存 wav あり)
  - CACHE_VERSION v451 → v452、 manifest 総エントリ **866** (= alt 含む正常超過、 期待 864 を 2 件上回るのは alt エントリ分)
  - phase2 完成度 **100% (= 866/864 manifest エントリ充足)**、 残課題は q109_d 試聴 1 件のみ

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

### 日本語接続統一ルール

- **適用日**: 2026-05-18 (sw v447+ 想定)
- **ユーザー指摘** (引用): 「丸い 小さいは？」「とがって 小さい。 もとがっていてちいさいじゃない？」 (2026-05-18)
- **発見経緯**: q091 (trivia L1「うさぎの みみは どんな かたち？」) で choices[2]「まるい ちいさい」 (= 形容詞並列で「て接続」 欠如) と choices[3]「とがって ちいさい」 (= 動詞テ形 + 形容詞、 「とがっていて」 のほうが意味的に明確) が判明。 同問題内の他選択肢「まるくて みじかい」「ながくて たっている」 が「て接続」 で統一されていたため、 4 択全件で接続形を統一 (= 「まるくて ちいさい」「とがっていて ちいさい」 に修正)
- **適用範囲**: 全カテゴリの phase2 不正解選択肢 (= 既存・新規どちらも)
- **ルール**:
  - **形容詞 + 形容詞**: 接続「て」 で繋ぐ (例「大きい 赤い」 → 「大きくて 赤い」)
  - **動詞テ形 + 形容詞**: 状態継続「ている」 のテ形で繋ぐ (例「とがって 小さい」 → 「とがっていて 小さい」)
  - **同問題内 4 択は接続形を統一する** (= 子供向け視認性 + 自然な日本語)
- **例外**:
  - 1 つの形容詞・動詞 (= 連結なし) はそのまま
  - 「○○くて」 (形容詞テ形) や「○○って」 (五段動詞促音便テ形) はそのまま許容、 ただし「○○って ちいさい」 のような動詞 + 形容詞は「○○っていて」 にする方が自然
- **チェックポイント**:
  - 同問題の 4 択全件で接続形が統一されているか
  - 接続「て」 欠如の形容詞並列がないか
  - 動詞テ形が「ている」 形のほうが自然な箇所はないか
- **判断基準**: 「子供が音読したとき自然か」「VOICEPEAK が自然に読み上げるか」 で判断
- **発見と修正の経緯**: 集約 CSV を VOICEPEAK 生成前にユーザー目視確認したことで発見、 表記揺れ全件調査で他カテゴリには重大な問題なしと確認 (= q091 のみ HIGH 案件)

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

## phase2 進捗マトリクス (= 4 択の不正解選択肢、 sw v452 時点 — 100% 完成 🎯)

- **背景**: sw v418 で phase1 (= 問題文 + 正解 wav) が 180/180 = 100% 完成。 sw v420 から phase2 (= 4 択の不正解選択肢 = a / c / d) の作業を開始、 sw v424 で 5 カテゴリ manifest 動的化が一段落、 sw v450 で集約バッチ (= 238 wav + 224 manifest) を取り込み 99.7% 完成、 sw v452 で残 3 件を既存 wav コピー + 動的参照で復旧し **100% 完成達成**
- **設計方針** (= 2026-05-17 ユーザー指示で確定): ハイブリッド設計
  - count_total と number_sequence は **g_num_*.wav 動的参照で TTS 不要** (= manifest 編集のみで完結)
  - order_color は **phase1 正解 wav の動的再利用で 87.5% (7/8) カバー** (= みずいろ q015_c 配置済)
  - 残り 5 カテゴリ (shape_name / weather / opposite / body / trivia) も **phase1 正解 wav を可能な限り動的再利用** (= sw v424 で +135 件追加、 manifest 動的化のみで完結する分を抽出) + sw v450 で集約バッチ取り込み + sw v452 で残 3 件復旧
- **継承ルール**: 「漢字化 + 迷ったらカナ維持 + 句点 (。) + 日本語接続統一」 4 ルール踏襲、 expand JSON 事前検証の予防手順継続

### phase2 完成度マトリクス (sw v452 — 100% 完成 🎯)

| カテゴリ | manifest 期待 | 実 manifest | 状態 | 備考 |
|---|---|---|---|---|
| order_color | 120 | 120 | ✅ 完成 | みずいろ q015_c 配置済 |
| count_total | 120 | 120 | ✅ 完成 | g_num_*.wav 動的参照 |
| shape_name | 110 | 110 | ✅ 完成 | — |
| number_sequence | 24 | 24 | ✅ 完成 | g_num_*.wav 動的参照 |
| weather | 120 | 120 | ✅ 完成 | — |
| opposite | 120 | 120 | ✅ 完成 | — |
| **body** | 120 | **121** | ✅ 完成 | sw v452 で q171_c 復旧 (= q175_c コピー) |
| **trivia** | 130 | **130** | ✅ 完成 | sw v452 で q102_b 復旧 (= 既存 wav コピー) + trivia:20:b 動的参照 (= q102_c) |
| **合計** | **864** | **866** (= alt 含む正常超過) | **100% 🎯** | 試聴 q109_d「角」 のみ残課題 |

- 残作業: q109_d「角」 試聴判定のみ (= 「カド/カク」 誤読チェック、 誤読時のみ 1 件ミニ TTS バッチ) ※詳細は下記「## 残課題 1 件 (= 試聴依存)」 セクション参照

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

## phase2 集約バッチ準備完了 (sw v424)

- **背景**: sw v424 で 5 カテゴリ (shape_name / weather / opposite / body / trivia) の phase2 manifest 動的化 +135 件追加後、 残 197 件を cross-category dedup で **190 ユニーク**に集約し、 VOICEPEAK 一括生成用のバッチ資材を準備
- **集約バッチ資材** (= `tools/voicepeak/` 配下、 全て準備済):
  - `voicepeak_lines_unique_phase2_uncovered.csv` — 190 行、 漢字化 + カナ維持 + 句点 (。) 適用済
  - `voicepeak_unique_expand_phase2_uncovered.json` — 190 keys (= ユニーク語 1 行 = 1 key の正規形)
  - `voicepeak_unique_expand_phase2_uncovered_detail.json` — 190 → **238 q### 展開先**にマッピング (= 同じ語が複数 q### で必要なため重複展開)
  - `BATCH-RUN-uncovered.md` — 約 200 行、 VOICEPEAK 1 バッチ実行用の手順書
- **出力先**: `tmp/quizland_NA/phase2_uncovered/` (= 既に作成済、 VOICEPEAK 出力フォルダ)
- **dedup の内訳** (= 197 → 190 = 重複 7 件):
  - おなじ (2 → 1)
  - 飛ぶ (2 → 1)
  - 夕方 (2 → 1)
  - 真夜中 (2 → 1)
  - 4本 (2 → 1)
  - 6本 (2 → 1)
  - 煙 (2 → 1)
- **次の 1 アクション**: VOICEPEAK で `voicepeak_lines_unique_phase2_uncovered.csv` を 1 バッチ生成 → `tmp/quizland_NA/phase2_uncovered/` に 190 wav 出力 → detail JSON に従って 238 q### にコピー → phase2 全カテゴリ完成
- **継承ルール反映状況**: 漢字化 (= 名詞/動詞/形容詞は漢字、 美化語の「お」 はカナ、 カタカナ語はそのまま) / 迷ったらカナ維持 (= 常用外漢字・読み揺れ・送り仮名揺れ) / 句点 (。) 末尾追加 = 3 ルール全て適用済

## phase2 uncovered 最終バッチ実装 (sw v450, 2026-05-18)

- **背景**: sw v424 で準備した集約バッチ (= 190 unique CSV) を VOICEPEAK で生成 → ユーザー出力 190 wav を本番組込み実施
- **実装サマリ**:
  - ユーザー出力 190 wav (= 集約 `phase2_uncovered` バッチ生成物) を本番取り込み
  - **Expand**: 190 unique → **238 q### に展開** (= cross-cat 重複 48 件含む、 detail JSON 経由で Python 直接展開)
  - `assets/tts/quiz/` に **238 wav 新規配置** (= 372 → 610 件)
  - `manifest.json` に **224 エントリ追加** (= 349 既存温存 + 25 衝突保護)
  - `sw.js` CACHE_VERSION: **v449 → v450** にバンプ
- **衝突 25 件 (= 既存値保護)**:
  - number_sequence の `g_num_*.wav` と `q07x_b/c` の優先関係を維持
  - 既存動的化を上書きしない仕組みが設計通り機能 (= 集約バッチ取り込み時に dynamic マッピングを破壊しない)
- **検出された欠落** (= manifest verify 段階で実装エージェントが報告):
  - body q171_c (= 「ときどき はえる」)
  - trivia q102_b (= 「ライオン」)
  - trivia q104_b (= 「ジンベイザメ」)
  - → 集約 CSV に含まれていたが、 VOICEPEAK 生成段階で wav 出力が漏れた 3 件
- **結果**: phase2 = **863/864 = 99.7% 完成**、 残 3 件 + q109_d (「角→つの」 試聴課題) = 計 4 件をミニ TTS バッチで対応予定

## phase2 100% 完成達成 (sw v452, 2026-05-18) 🎯

- **背景**: sw v450 で 99.7% 達成後、 残 3 件 (= body q171_c / trivia q102_b / trivia q104_b) はミニ TTS バッチで対応予定としていた。 ユーザー指摘 (2026-05-18) で真因切り分けを実施した結果、 wav 生成漏れではなく **detail JSON のマッピング漏れ** が真因と判明。 既存 wav コピー + 動的参照で復旧完結 (= 新規 TTS ゼロ)
- **ユーザー指摘の核心** (= 真因切り分けのきっかけ):
  - 「番号 000 から始まって CSV の順番通り」 → wav 番号と CSV 行番号の対応関係を実測で確認すべき
  - 「全部やった」 → ユーザー出力 190 wav は全件正常生成済の確信
  - → Claude 側が「wav 生成漏れ」 と早合点していた仮説を覆す決定的な情報
- **真因の正体** (= 集約エージェントの見落としパターン):
  - detail JSON の本来の構造は「同一 chip text → 複数 q### の配列」 (= 1:N マッピング)
  - 集約エージェントが「同一 chip text → 単一値」 (= 1:1 マッピング) と誤認し、 値配列の一部 q### を取りこぼした
  - 具体例:
    - 「ライオン」 = trivia の q096_a (正解) + q098_b (正解) + q102_b (不正解) の 3 箇所で参照 → 集計時に 2 箇所しか拾えず q102_b が欠落
    - 「ときどき はえる」 = body の q171_c (不正解) + q175_c (正解) の 2 箇所で参照 → 集計時に 1 箇所しか拾えず q171_c が欠落
- **復旧詳細** (= sw v452 で対応):

| 復旧した語 | CSV 行 (1-indexed) | wav 番号 (0-indexed) | 復旧方法 | 新規 TTS |
|---|---|---|---|---|
| ときどき はえる | 71 | 070 | 既存 wav (q175_c) コピー → q171_c.wav | 不要 |
| ライオン | 160 | 159 | 既存 wav コピー → q102_b.wav | 不要 |
| ジンベイザメ | (集約 CSV 対象外) | (phase1 正解 q102_c.wav 既存) | manifest 動的参照 trivia:20:b → q102_c.wav | 不要 |

- **CACHE_VERSION**: v451 → v452
- **結果**:
  - manifest 総エントリ **866** (= alt 含む正常超過、 期待 864 を 2 件上回るのは alt エントリ分)
  - phase2 完成度 **100%** 達成 ✅
  - 新規 TTS ゼロ、 ユーザー出力 190 wav は全件正常 (= 「全部やった」 の確信が正しかった)
  - **q109_d 試聴確認 OK** (= 2026-05-18 ユーザー判定、 「つの」 と正しく読まれている、 カナ戻し再生成不要) → **残課題ゼロ = 完全 100% 完成達成** 🎯

## 残課題: ゼロ (= 全件解決済) 🎯

- **背景**: sw v450 時点で 4 件残存だったが、 sw v452 でユーザー指摘の真因切り分けにより 3 件は既存 wav コピー + 動的参照で復旧済。 残る 1 件 (q109_d「角」 試聴判定) も 2026-05-18 ユーザー試聴で「つの」 と正しく読まれていることを確認 = **修正不要**
- **復旧済 3 件** (= sw v452 で対応完了):

| # | wav | カテゴリ Q### | テキスト | 真因 | 復旧方法 |
|---|---|---|---|---|---|
| 1 | `q171_c.wav` | body Q13:c | 「ときどき はえる」 | 集約エージェントの detail JSON マッピング漏れ (= q171_c + q175_c の 2 箇所参照を 1 箇所しか拾えず) | 既存 wav (q175_c) コピー ✅ |
| 2 | `q102_b.wav` | trivia Q18:b | 「ライオン」 | 同上 (= q096_a + q098_b + q102_b の 3 箇所参照を 2 箇所しか拾えず) | 既存 wav コピー ✅ |
| 3 | trivia:20:b | trivia Q20:b | 「ジンベイザメ」 | 集約 CSV 対象外 (= phase1 正解 q102_c.wav が既存) | manifest 動的参照 (= trivia:20:b → q102_c.wav) ✅ |

- **試聴判定済 1 件** (= 2026-05-18 ユーザー確認):

| # | wav | カテゴリ Q### | テキスト | 試聴結果 | 対応 |
|---|---|---|---|---|---|
| 4 | `q109_d.wav` | trivia Q35:d | 「つの」 (= 「角」 漢字化) | **「つの」 と正しく読まれている** (= 誤読なし) ✅ | カナ戻し再生成 **不要** |

- **結論**: **phase2 完全 100% 完成達成** = 残課題ゼロ。 新規 TTS ゼロで全件解決
- **試聴判定の結果が示すこと**: 「迷ったらカナ維持」 ルール (sw v385+) で「角」 をカナ戻し候補に挙げていたが、 VOICEPEAK 形態素解析が文脈 (= trivia「キリンの〇〇」) から「つの」 を正しく推定できた = 漢字残存でも安全圏のケースが存在することを実証

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
- **phase2 開始**: 2026-05-17 〜 進行中 (sw v424 時点で **278/490 = 57% manifest 動的化済**、 = number_sequence 0 + count_total 72 + order_color 71 + shape_name 54 + weather 31 + opposite 17 + body 23 + trivia 10)、 残 197 件を cross-category dedup で 190 ユニークに集約済、 集約 TTS バッチ 1 件で phase2 全完成見込み ※詳細は上記「## phase2 進捗マトリクス」 「## phase2 集約バッチ準備完了 (sw v424)」 セクション参照
- **phase2 も sw v452 で 100% 完成達成** 🎯 (2026-05-18、 manifest 総エントリ 866、 残課題は q109_d 試聴 1 件のみ)

### 主な発見と教訓

1. **expand JSON ひらがな残存バグの事前予防が機能** (sw v384 → v418): shape_name で偶発的に発見した不整合を、 weather / opposite / body / trivia の 4 カテゴリで「漢字化前に必ず expand JSON を CSV と一致させる」 ワークフローへ組み込んだ。 結果、 202 キーを事前修正でき、 試聴時の読み崩れも最小化。
2. **「迷ったらカナ維持」 が効いた** (sw v385+): 漢字化を一律適用するのではなく、 常用外漢字・読み揺れ・送り仮名揺れ・同訓異義の箇所をカナ戻しすることで、 試聴段階での再生成回数を大幅削減。 trivia でカナ維持 27 箇所 (= 雑学カテゴリの語彙多様性に対応) が最多。
3. **句点 (。) 追加ルールが自然な発音完了感を生んだ** (sw v389+): body 以降の答え末尾に「。」 を追加することで、 wav が「途中で切れた」 印象を回避。 平叙的な答え (例「心臓。」「はえる。」) の自然さが向上。
4. **試聴駆動 → 事前防止 へのシフト**: sw v384 までは「まず生成 → 試聴で問題発見 → 修正再生成」 だったのを、 sw v385 以降「漢字化時点で疑わしい箇所をカナに戻す + expand JSON を事前同期」 に切り替えたことで、 後半 4 カテゴリ (weather / opposite / body / trivia) は再生成回数が大きく減少。
5. **並走タスクによる sw 番号の急進**: 各カテゴリ完成時に「+1 だけ進む」 ように見えるが、 実際は他作業で sw 番号が大きく前進している (= v388 → v412 → v413、 v413 → v417 → v418)。 「自分の作業で何が進んだか」 と「sw 番号の増分」 は別物として記録した方が混乱が少ない。
6. **phase2 着手前は必ず phase1 正解カバレッジ調査を実施** (sw v422 恒久ルール化): ユーザー指摘「本当に重複してない？やった記憶のあるものばかりなんだけど。」 を契機に確立。 phase2 不正解 chip text が phase1 のどの正解 wav で発音済か全件マッピング → 重複 TTS を事前回避 (= count_total 72 / order_color 71 のように大幅削減できるケースあり)。 ただし「order_color のような高カバレッジは例外」 = 5 カテゴリ徹底調査の結果、 shape_name 35.7% / weather 21.6% / opposite 16.3% / body 14.3% / trivia 11.8% と各カテゴリの独自領域性で再利用率は低い。 cross-category dedup の効果は実測 3.9% (= 9/231) で期待値より低い。 = 「事前調査必須、 ただし高カバレッジは例外」 が恒久ルール。
7. **cross-category dedup の実測効果は限定的だが「あれば積極活用」 が方針** (sw v424 恒久ルール化): 5 カテゴリ phase2 manifest 動的化後、 残 197 件を cross-category dedup で集約した結果 **197 → 190 ユニーク = 3.6% 削減** (= 重複 7 件のみ: おなじ / 飛ぶ / 夕方 / 真夜中 / 4本 / 6本 / 煙)。 期待値 (= 50%+ の大規模削減) には届かず、 各カテゴリが独自領域を持つことが実証された。 ただし「あっても損はしない」 = TTS 1 件あたりの生成コスト (= VOICEPEAK 操作 + 試聴 + リトライ) を考えると 7 件削減でも積極活用する価値あり。 = 「期待値は低いが必ず実施」 が恒久ルール。
8. **5 カテゴリの phase2 manifest 動的化率はカテゴリ特性で大きく変動** (sw v424 実測値、 恒久知見): phase1 wav を phase2 で動的再利用する場合のカバー率は、 そのカテゴリの語彙の重複構造によって大きく変わる:
   - **shape_name: 54/66 = 82%** (= 期待より高い、 「まる / しかく / さんかく」 等の基本形が phase1 で頻出)
   - **weather: 31/71 = 44%** (= 中程度、 天気名「雨 / 雪 / 雷」 等は phase1 で頻出だが季節名・災害名は新規)
   - **opposite: 17/67 = 25%** (= 低、 反対語ペアの片方しか phase1 にない構造)
   - **body: 23/67 = 34%** (= 中程度、 体パーツ名は phase1 で頻出だが医学用語は新規)
   - **trivia: 10/75 = 13%** (= 最低、 多様性高で phase1 でのカバーが困難)
   - → 「カテゴリ特性によって再利用率が大きく変わる」 を恒久知見として記録、 次回類似プロジェクトでは事前に語彙構造を分析して動的化率を見積もる
9. **集約バッチ実装時に「期待件数 vs 実生成件数」 を細かく検証する** (sw v450 実測知見、 恒久ルール化): 集約 CSV にテキストが存在しても、 VOICEPEAK 生成段階で wav が出力されないケースがある (= 難検出パターン):
   - 今回のフロー: 190 unique CSV → 期待 240 q### マッピング (= detail JSON ベース) → VOICEPEAK 生成は **190 wav のみ** (= ユーザー出力分) → Expand で 238 wav に展開 (= 約 90% カバレッジ)
   - 残り 3 q### は「集約 CSV にテキストある」 が「対応 wav が出力時に欠落」 という難検出パターン (= q171_c / q102_b / q104_b)
   - **実装エージェントが manifest verify 段階で 3 件欠落を検出して報告できた** (= 取り込み完了時の verify を必須化していた効果)
   - → 「集約 CSV にテキストある」 = 「wav 生成される」 とは限らない。 **Expand 結果と manifest verify で必ず欠落チェックを実施する** が恒久ルール
   - 次回類似プロジェクトでは「期待 q### 件数」 と「実生成 wav 件数」 を必ず突き合わせ、 欠落があれば即ミニバッチで対応
10. **集約バッチで「同一 chip text が複数 q### で再利用される」 ケースを見落とすパターン** (sw v452 実測知見、 恒久ルール化): 教訓 #9 の続編。 sw v452 でユーザー指摘により真因が判明 = 「wav 生成漏れ」 ではなく「集約エージェントの detail JSON マッピング漏れ」 だった:
    - 「同一 chip text → 単一値」 ではなく **「同一 chip text → 複数 q### の配列」 が detail JSON の本来の構造**
    - 例: 「ライオン」 が trivia の q096_a (正解) + q098_b (正解) + q102_b (不正解) の 3 箇所で参照されているのを集計時に 2 箇所しか拾えず
    - 例: 「ときどき はえる」 が body の q171_c (不正解) + q175_c (正解) の 2 箇所で参照されているのを 1 箇所しか拾えず
    - **検証手段**: detail JSON 作成後、 questions.js 全 chip text と detail JSON 値配列の **双方向 verify** を実施すべき (= chip text → q### / q### → chip text 両方向で網羅性確認)
    - **ワークフロー強化**: ユーザー試聴前の「集約完成度 verify」 ステップを必須化 (= 教訓 #9 の「expand 後 verify」 + 教訓 #10 の「集約段階での双方向 verify」 = 二段構え)
    - **真因切り分けの原則** (`feedback_user_complaint_decompose.md` の再適用、 オーケストレータも例外ではない):
      - Claude (オーケストレータ) は表面症状「wav 生成漏れ」 と早合点
      - ユーザーが「全部やった」 と確信 → CSV 行番号と wav 番号の対応関係を実測で確認 → detail JSON マッピング漏れが真因と判明
      - **「ユーザの表面症状をそのまま仮説化せず、 最初に実機で『実際何が起きているか』 を切り分ける」 教訓を、 オーケストレータ自身も適用すべきだった**
    - **復旧コスト**: 既存 wav コピー 2 件 + manifest 動的参照 1 件で完結、 新規 TTS ゼロ (= 真因切り分けにより無駄な再生成を回避)
