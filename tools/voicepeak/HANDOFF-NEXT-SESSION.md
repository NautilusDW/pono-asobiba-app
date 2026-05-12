> 文字化けチェック: この行が読めない場合、 UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> PowerShell 5.1 注記: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが false positive (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# HANDOFF-NEXT-SESSION — Quizland 音声プロジェクト 引き継ぎ書

> このファイルは **Quizland 音声プロジェクト専用** の引き継ぎ書です。
> 次の Claude セッション (別スレッド) が context ゼロから作業を再開できるように、 必要な情報を一枚にまとめてあります。
>
> - 共有メモ帳の `HANDOFF.md` (リポジトリルート) とは **棲み分け**:
>   - `HANDOFF.md` = Claude / Codex 共有 log (画像生成発注・受領などの汎用 batch メモ)
>   - 本ファイル = Quizland 音声 (VOICEPEAK) プロジェクト専用、 1 スレッド完結を意識
> - すべての ID 参照は本文併記してあります ([memory/feedback_restate_content_when_referring.md](../../memory/feedback_restate_content_when_referring.md) 恒久ルール)
> - すべてのファイルパスは絶対パスで記載

---

## 0. このファイルの読み方 (新スレッド開始時)

1. まず本ファイルを通読 (5 分程度)
2. 次に [d:\AppDevelopment\pono-asobiba-app\MEMORY.md](../../MEMORY.md) のインデックスを確認
3. **§6 関連 memory ファイル** に列挙した 10 本を順番に読む (とくに上位 5 本)
4. ユーザーの試聴フィードバックを聞く (くるみ第1-5問目 mp3 / sw v966)
   - フィードバック OK → §5 の MVP 内タスクに進む (推奨: number_sequence バッチ)
   - フィードバック NG → §5 の備考 (ラグ調整 / wav 再編集) を参照

---

## 1. 現状の到達点 (2026-05-12 終了時点)

### 1.1 現行バージョン
- **sw v966** が現行 (= `quizland/sw.js` の `CACHE_VERSION = 'v966'`)
- 直近の sw bump 履歴:
  - v959 → v961: CSS 「第N問」 バナー誤実装を完全削除 + 既存 qno_plate 画像表示を kurumi 音声 ended +0.3s まで延長
  - v962: don→kurumi ラグ短縮 第2弾 (timeupdate 早期 trigger + kurumi.wav 5本 冒頭無音 ffmpeg トリミング)
  - v963: don.mp3 末尾 silence カット (1.999s→1.196s, ~803ms 短縮) + timeupdate 閾値 50ms→150ms 拡大
  - v964: chip-label 改行 wrap 時の位置ズレ修正 (CSS layout のみ、 音声無関係)
  - v965: ユーザー手動編集 mp3 5 ファイルを `kurumi_dai{1-5}mon.mp3` に差し替え (wav→mp3)、 旧 wav 5 本削除 (tmp に温存)、 SE_PATHS 拡張子変更
  - **v966 (現行)**: don 二重発火問題解消 — `loadQuestion` から `playSe('nextQuestion')` 別再生 + don timeupdate/ended チェーンを完全削除し kurumi mp3 単独再生に簡素化

### 1.2 MVP スコープ
- **MVP = くるみ 912 件のみ** (= 問題本編 907 件 + くるみ第1-5問目 5 件)
- **博士 48 件** (HAKASE_DIALOGUE 全プール) は **MVP 後回し** (関連準備はすべて完了済で温存、 MVP リリース後に着手)

### 1.3 完了済
- **くるみ第1-5問目 5 ファイル本実装完了** (mp3 で配置、 アプリ側で再生まで OK)
  - ファイルパス: `d:\AppDevelopment\pono-asobiba-app\assets\audio\sfx\quiz\kurumi_dai{1-5}mon.mp3` (5 ファイル、 約 67KB / 件)
  - mp3 内に **don 音 (SE) が内蔵** されている (ユーザー手動編集 by Audacity 等)
- **辞書 80 entries 完成** + VDC2 再生成 + ラウンドトリップ検証 OK (CSV ↔ VDC2 line diff 0)
- **CSV 一式準備完了** (テスト 27 / 全 912 / Phase 1×8 cat / Phase 2×8 cat / kurumi5 / unique 版すべて)
- **展開マッピング JSON 17 個準備完了**
- **生成スクリプト 5 本準備完了** (Convert × 2 / Expand × 1 / Build manifest × 1 / Deploy ワンライナー × 1)

### 1.4 未完了 (= 次スレッドでやること)
- **問題本編 907 件** (Phase 1 + Phase 2 を 8 カテゴリ × 2 フェーズ = 16 サイクルで生成予定)
- 詳細は **§5 残タスク** を参照

---

## 2. 重要な確定事項 (絶対に忘れちゃいけない)

### 2.1 話者
| キャラ | 話者 (プリセット) | ステータス | 備考 |
|---|---|---|---|
| **くるみ全件** (912) | VOICEPEAK **「女性4」** | **確定 2026-05-12** | 旧 「女の子」 は試聴で却下、 「女性4」 に再差替で最終確定 |
| **博士** (48) | VOICEPEAK **「ナレーター おじいさん」** | 確定済、 但し **MVP 後回し** | 秦なおき声、 ¥5,980 単体購入済 |
| **VOICEVOX 雨晴はう** | — | **廃案** | 履歴のみ memory 温存、 主軸は VOICEPEAK |
| **ポノ** | — | **音声化保留** | babble のまま、 アイデンティティ確定までは AI 化しない |

### 2.2 くるみ第N問音声の重要ポイント
- **speech は漢数字統一** (「第一問〜第五問」)、 アラビア数字 「第1問」 ではない
- ファイル名は `kurumi_dai{N}mon.mp3` (アラビア数字 1-5、 ファイル名規則は維持)
- **mp3 内に don 音 (SE) が内蔵されている** (ユーザー手動編集、 Audacity 等で結合済)
  - → アプリ側で別途 `don.mp3` を再生してはいけない (二重発火 NG、 v965→v966 で修正済)
- ファイル: `d:\AppDevelopment\pono-asobiba-app\assets\audio\sfx\quiz\kurumi_dai{1-5}mon.mp3` (5 ファイル、 約 67KB / 件)

### 2.3 辞書
- ファイル: `d:\AppDevelopment\pono-asobiba-app\tools\voicepeak\voicepeak_user_dict.csv` = **80 entries**
  - 構成: 75 + 「博士」 「鋭い」 「大丈夫」 「見事」 「天才」 「頑張った」 「立派」 「超えとる」 「出来た」 「ろく」 等の追加済 (= 旧 79 + 「ろく」 1 語 = 80)
- VDC2 再生成済: `d:\AppDevelopment\pono-asobiba-app\tools\voicepeak\voicepeak_user_dict.vdc2` (80 entries)
- **ラウンドトリップ検証 OK** (CSV ↔ VDC2 line diff 0)

### 2.4 元ファイル (温存、 上書き禁止)
- `D:\ポノのおへや\Dr.owl'quiz\SE\Count_jingle\1-kurumi.mp3` 〜 `5-kurumi.mp3` — ユーザー手動編集 mp3 5 ファイル

---

## 3. やってはいけないこと (反面教師、 過去の失敗から)

過去の sw v959〜v966 の失敗から抽出した、 やってはいけないリスト。 必ず守ること。

### 3.1 「第N問」 関連
- **CSS で 「第N問」 バナーを新規作成しない**
  - v959 で誤実装 → v961 で削除済
  - 既に画像 (`qno_plate_*.png`) が存在するので、 画像表示を kurumi 音声 ended までフェードアウト遅延すれば十分
- **既存の `qno_plate_*.png` 画像をデフォルト 1.6 秒で消さない**
  - v961 で kurumi 音声 ended まで延長表示済、 これを維持する
  - 表示時間を「kurumi 音声の長さ + 0.3s」 に同期させる仕様

### 3.2 don 音関連
- **don.mp3 を別途再生しない** (mp3 内に内蔵で十分)
  - v965 までは `playSe('nextQuestion')` 別再生 + don timeupdate/ended チェーンで kurumi へ繋いでいた
  - → v966 で kurumi mp3 単独再生 (don 内蔵) に簡素化済、 二重発火 NG
- **ユーザーの mp3 を上書きする時は事前に内容確認**
  - don 音内蔵等、 想定と違う可能性がある (= ユーザー手動編集 mp3 を不用意に再 wav 化して上書きしない)

### 3.3 参照規律
- **「ID 単独で参照しない」** (恒久ルール)
  - 例: 「D/B1」 「q172」 「kurumi_clasp」 等の短縮 ID だけで言及せず、 必ず本文を併記してユーザーがスクロールせずに済むようにする
  - 詳細: [d:\AppDevelopment\pono-asobiba-app\memory\feedback_restate_content_when_referring.md](../../memory/feedback_restate_content_when_referring.md)

### 3.4 旧方針への退行禁止
- **VOICEVOX 関連を 「現行」 として扱わない** (廃案、 履歴のみ温存)
- **「女の子」 プリセットを採用案として提案しない** (試聴で却下済、 「女性4」 確定)
- **博士 48 件を MVP 内に含めない** (後回しで確定済)
- **ポノを AI 音声化しない** (babble のまま温存、 アイデンティティ確定待ち)

---

## 4. 準備済ツール一覧 (= 新スレッドで使うもの)

すべて `d:\AppDevelopment\pono-asobiba-app\tools\voicepeak\` 配下。

### 4.1 CSV (テキスト入力)

| ファイル名 | 内容 | 件数 | 用途 |
|---|---|---|---|
| `voicepeak_lines_test27.csv` | テスト 27 件 (旧版) | 27 | 試聴 OK 済、 履歴温存 |
| `voicepeak_lines_full912.csv` | 全 912 件単一版 | 912 | 将来参照用 |
| `voicepeak_lines_phase1_<category>.csv` × 8 | カテゴリ別 Phase 1 (ユニーク化前) | 全件 | 履歴温存 |
| `voicepeak_lines_phase2_<category>.csv` × 8 | カテゴリ別 Phase 2 (同) | 全件 | 履歴温存 |
| `voicepeak_lines_kurumi_dai1_5.csv` | くるみ第1-5問目 | 5 | 試聴 OK 済 |
| **`voicepeak_lines_unique_phase1_<category>.csv` × 8** | **MVP で使うのはこれ** | 43.5% 削減版 | **次スレッドで使用** |
| `voicepeak_lines_unique_phase2_<category>.csv` × 8 | Phase 2 ユニーク版 | 43.5% 削減版 | Phase 2 で使用 |
| `voicepeak_lines_unique_kurumi_dai1_5.csv` | くるみユニーク版 | 5 | 完了済 |

8 カテゴリ = `body` / `count_total` / `number_sequence` / `opposite` / `order_color` / `shape_name` / `trivia` / `weather`

### 4.2 展開マッピング JSON

| ファイル名 | 用途 |
|---|---|
| `voicepeak_unique_expand_<category>_phase1.json` × 8 | Phase 1 ユニーク wav → q### への展開定義 |
| `voicepeak_unique_expand_<category>_phase2.json` × 8 | Phase 2 同 |
| `voicepeak_unique_expand_kurumi_dai1_5.json` | くるみ第1-5問用 |

合計 17 個。 `Expand-VoicepeakUniqueWavs.ps1` がこれを読んでユニーク wav を q### にコピー展開する。

### 4.3 スクリプト

| ファイル名 | 用途 |
|---|---|
| `Convert-VoicepeakUserDictCsvToVdc2.ps1` | 辞書 CSV → VDC2 順方向変換 |
| `Convert-VoicepeakUserDictVdc2ToCsv.ps1` | 辞書 VDC2 → CSV 逆方向変換 (ラウンドトリップ検証用) |
| `Expand-VoicepeakUniqueWavs.ps1` | ユニーク wav を q### に展開コピー |
| `Build-NarrationManifest.ps1` | `manifest.json` 自動生成 |
| `Deploy-VoicepeakWavs.ps1` | wav copy + manifest 更新ワンライナー |

すべて UTF-8 with BOM、 `-ExecutionPolicy Bypass` 前提。

### 4.4 ドキュメント

| ファイル名 | 内容 |
|---|---|
| `README.md` | tools/voicepeak/ 全体の概要 |
| `BATCH-PLAN-PHASE1-PHASE2.md` | 全カテゴリの試聴順 + 件数表 + ワークフロー |
| `BATCH-RUN-number_sequence.md` | number_sequence の具体コマンド (次バッチ用、 そのまま実行可能) |
| `DUPLICATE-ANALYSIS.md` | 重複分析レポート (43.5% 削減の根拠) |
| `DEPLOY-WORKFLOW.md` | wav 配置 → manifest → デプロイ全フロー |
| **`HANDOFF-NEXT-SESSION.md`** | **本ファイル** |

### 4.5 発注書

| ファイル名 (絶対パス) | 内容 |
|---|---|
| `d:\AppDevelopment\pono-asobiba-app\docs\quizland-voicevox-order\COWORK-TEST-ORDER.md` | テスト 27 件 |
| `d:\AppDevelopment\pono-asobiba-app\docs\quizland-voicevox-order\ORDER-FULL.md` | フル 907 件 |
| `d:\AppDevelopment\pono-asobiba-app\docs\quizland-voicevox-order\ORDER-EXTRA-NON-QUIZ.md` | 問題以外 53 件 (くるみ 5 + 博士 48、 博士は MVP 後回し) |

> ファイル名が `voicevox` のままなのは履歴温存目的、 中身はすべて VOICEPEAK 化済。

### 4.6 元ファイル (温存)

`D:\ポノのおへや\Dr.owl'quiz\SE\Count_jingle\1-kurumi.mp3` 〜 `5-kurumi.mp3` — ユーザー手動編集 mp3 5 ファイル (don 音 SE 内蔵)

---

## 5. 残タスク (= 次スレッドでやること)

### 5.1 MVP 内 (優先)

#### 5.1.1 Phase 1 他カテゴリ生成 (推奨順)
1. **`number_sequence` (20 ユニーク → 24 q###)** ← **次バッチ、 [BATCH-RUN-number_sequence.md](./BATCH-RUN-number_sequence.md) 参照**
2. `order_color` (15 ユニーク → 48 q###)
3. `count_total` (14 ユニーク → 48 q###)
4. `shape_name` (26 ユニーク → 46 q###)
5. `weather` (39 ユニーク → 48 q###)
6. `body` (39 ユニーク → 49 q###)
7. `opposite` (48 ユニーク → 48 q###)
8. `trivia` (50 ユニーク → 52 q###)

#### 5.1.2 各バッチ後に実行
- `Deploy-VoicepeakWavs.ps1` で配置 + manifest 更新
- sw bump (v966 → v967 → ...)
- commit (auto-commit hook が push、 GH Actions が staging deploy)

#### 5.1.3 Phase 2 (不正解選択肢)
- Phase 1 全カテゴリ完了後、 同じフローで Phase 2 を生成
- ユニーク CSV: `voicepeak_lines_unique_phase2_<category>.csv` × 8
- 展開 JSON: `voicepeak_unique_expand_<category>_phase2.json` × 8

### 5.2 MVP 外 (将来、 後回し)

- **博士 48 件** (HAKASE_DIALOGUE 全プール) を 「ナレーター おじいさん」 (秦なおき声) で生成
  - 関連準備はすべて完了済 (漢字混じり化 / 辞書 9 語追加 / 「ナレーター おじいさん」 購入済 / 発注書 53 件構造)
- **`clear.perfect[2]` 「きみは もう、 はかせを こえとるかも しれんのう」 の発動条件改修** (難しい / 優しい / 物知り 全カテゴリパーフェクトクリア限定)
  - 詳細: [d:\AppDevelopment\pono-asobiba-app\memory\feature_quizland_hakase_perfect_master_seal.md](../../memory/feature_quizland_hakase_perfect_master_seal.md)

---

## 6. 関連 memory ファイル (新スレッドで必読)

優先順 (上から順に読む):

1. **[d:\AppDevelopment\pono-asobiba-app\MEMORY.md](../../MEMORY.md)** インデックス全件 (まず読む)
2. **[d:\AppDevelopment\pono-asobiba-app\memory\feature_quizland_voicepeak_pivot.md](../../memory/feature_quizland_voicepeak_pivot.md)** — 主軸変更 (VOICEPEAK 一本化)
3. **[d:\AppDevelopment\pono-asobiba-app\memory\feature_quizland_voicepeak_pivot_jyosei4.md](../../memory/feature_quizland_voicepeak_pivot_jyosei4.md)** — 「女性4」 確定
4. **[d:\AppDevelopment\pono-asobiba-app\memory\feature_quizland_kurumi.md](../../memory/feature_quizland_kurumi.md)** — くるみキャラ + sw v957-v966 実装履歴
5. **[d:\AppDevelopment\pono-asobiba-app\memory\reference_voicepeak_voices_purchased.md](../../memory/reference_voicepeak_voices_purchased.md)** — 購入ボイス一覧
6. [d:\AppDevelopment\pono-asobiba-app\memory\reference_voicepeak_vdc2_format.md](../../memory/reference_voicepeak_vdc2_format.md) — VDC2 仕様
7. [d:\AppDevelopment\pono-asobiba-app\memory\feature_quizland_voicevox_order.md](../../memory/feature_quizland_voicevox_order.md) — 【廃案】 経緯 (VOICEVOX 旧方針)
8. [d:\AppDevelopment\pono-asobiba-app\memory\feature_quizland_hakase_dialogue_expansion.md](../../memory/feature_quizland_hakase_dialogue_expansion.md) — 【MVP 後回し】 博士セリフ
9. [d:\AppDevelopment\pono-asobiba-app\memory\feature_quizland_hakase_perfect_master_seal.md](../../memory/feature_quizland_hakase_perfect_master_seal.md) — 【MVP 後回し】 clear.perfect[2] 改修
10. **[d:\AppDevelopment\pono-asobiba-app\memory\feedback_restate_content_when_referring.md](../../memory/feedback_restate_content_when_referring.md)** — 「ID 参照時は本文併記」 恒久ルール

---

## 7. 次の具体的なアクション (新スレッド開始時にこれを読む)

### 7.1 即座にやること (新スレッド開始)

1. **本ファイルを通読**
2. **§6 の memory ファイル 10 本を上から読む** (最低でも 1〜5 は必読)
3. **ユーザー試聴フィードバック確認** (sw v966、 くるみ第1-5問目 mp3)
   - **OK なら**: § 7.2 number_sequence バッチへ進む
   - **NG なら**: ラグ調整 (timeupdate 閾値変更、 現在 150ms) or wav 再編集

### 7.2 number_sequence バッチ進行手順

詳細: **[d:\AppDevelopment\pono-asobiba-app\tools\voicepeak\BATCH-RUN-number_sequence.md](./BATCH-RUN-number_sequence.md)** を参照。

要約 (Step 1-10):

1. VOICEPEAK 起動 → 辞書 v80 (`d:\AppDevelopment\pono-asobiba-app\tools\voicepeak\voicepeak_user_dict.vdc2`) 再インポート
2. CSV インポート: `d:\AppDevelopment\pono-asobiba-app\tools\voicepeak\voicepeak_lines_unique_phase1_number_sequence.csv` (20 件)
3. プリセット = **「女性4」** / 出力名 = `number_sequence` / 連番 0,1,2... / 44100Hz
4. 出力先: `d:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\number_sequence\`
5. 一括書き出し → `0-number_sequence.wav` 〜 `19-number_sequence.wav` (20 ファイル)
6. Expand スクリプト実行 (BATCH-RUN-number_sequence.md Step 3 のコマンド):
   ```powershell
   cd d:\AppDevelopment\pono-asobiba-app
   powershell -ExecutionPolicy Bypass -File tools\voicepeak\Expand-VoicepeakUniqueWavs.ps1 `
     -InputDir   "D:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\number_sequence" `
     -UniqueCsv  "tools\voicepeak\voicepeak_lines_unique_phase1_number_sequence.csv" `
     -ExpandJson "tools\voicepeak\voicepeak_unique_expand_number_sequence_phase1.json" `
     -OutputDir  "D:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\number_sequence_expanded"
   ```
7. → `q169_*.wav` 〜 `q180_*.wav` (24 件) が `number_sequence_expanded\` に展開
8. 試聴 → 誤読あれば辞書追加 → 再生成
9. OK なら `Deploy-VoicepeakWavs.ps1 -InputDir tmp/quizland_NA/number_sequence_expanded` で配置 + manifest 更新
10. sw bump (v966 → v967) → commit (auto-commit hook が push、 GH Actions が staging deploy)

### 7.3 試聴重点 (number_sequence)

| ポイント | 確認内容 |
|---|---|
| 「ろく」 (今回初辞書登録) | 「ロ↑ク↓」 (尾高) で読まれるか |
| 1 モーラ数詞 (に / ご) | 伸長 (「ニー」 「ゴー」) せず頭高で読まれるか |
| 「あいだ」 | 「アイ↑ダ↓」 (中高) で読まれるか |
| 「つぎ」 「まえ」 | 助詞「は」 との連結が自然か |

### 7.4 期待出力 (number_sequence Phase 1 全展開)

| q### | _q (問題文) | _b/_c (正解) |
|---|---|---|
| q169 | いちの つぎは？ | q169_b = に |
| q170 | にの つぎは？ | q170_b = さん |
| q171 | よんの つぎは？ | q171_b = ご |
| q172 | ろくの つぎは？ | q172_b = なな |
| q173 | ななの つぎは？ | q173_b = はち |
| q174 | きゅうの つぎは？ | q174_c = じゅう |
| q175 | さんの まえは？ | q175_b = に |
| q176 | ごの まえは？ | q176_b = よん |
| q177 | はちの まえは？ | q177_b = なな |
| q178 | じゅうの まえは？ | q178_b = きゅう |
| q179 | にと よんの あいだは？ | q179_c = さん |
| q180 | ろくと はちの あいだは？ | q180_c = なな |

---

## 8. デプロイメモ (再確認)

詳細は [d:\AppDevelopment\pono-asobiba-app\CLAUDE.md](../../CLAUDE.md) §デプロイ手順 / [d:\AppDevelopment\pono-asobiba-app\AGENTS.md](../../AGENTS.md) を参照。

- **このプロジェクトは Cloudflare Workers で配信**。 Netlify は完全廃止済 (= 二度と言及しない)
- `git commit` するだけで staging に反映 (post-commit hook が develop を auto push → GH Actions が `wrangler deploy --env staging`)
- staging URL: `https://pono-asobiba-staging.ndw.workers.dev/`
- production URL: `https://pono.kodama-no-mori.com/` (= ユーザーが 「本番にデプロイして」 と明示した時のみ master merge)
- **絶対に勝手に master へマージしない**

---

## 9. 連絡事項 / オープン質問

- 「女性4」 が VOICEPEAK 6 ナレーターセット内 or 別売かは要ユーザー確認 (購入時情報の照合のみ、 機能影響なし)
- ユーザーから 「博士 MVP に入れたい」 等の方針変更があれば、 §1.2 MVP スコープ + §5.2 MVP 外 を更新

---

最終更新: 2026-05-12 (sw v966 確定後)
作成者: Claude (Opus 4.7)
