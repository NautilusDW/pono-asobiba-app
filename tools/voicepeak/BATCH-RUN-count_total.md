# VOICEPEAK 実行手順: count_total Phase 1 (sw v381 時点)

> 親計画: [BATCH-PLAN-PHASE1-PHASE2.md](./BATCH-PLAN-PHASE1-PHASE2.md)
>
> ユニーク件数: **15 件** (元 48 行、 dedup により 48 → 15 に圧縮 — 「りんごは いくつ？」 「ふたつ」 等の問題文・選択肢が複数 q### で再利用されるため)
> 全件展開数: 24 問 = 48 ファイル (q024_q.wav 〜 q047_c.wav、 = 1-indexed で Q25 〜 Q48) ← 展開 JSON 参照
> 選択肢の数字音声 (1つ〜10こ) は別途 `g_num_0.wav` 〜 `g_num_10.wav` を動的マッピングで再生する仕組み (= number_sequence と同じ)。 本タスクで生成するのは問題文 + 選択肢「ひとつ」〜「ここのつ」 のみ。

## 前提

- VOICEPEAK 起動済
- ユーザー辞書 **v85 (旧 80 → +5 語: 「りんご」 「いちご」 「おはな」 「おほしさま」 「みかん」)** をインポート済 (新規 / 再インポート)
  - CSV: `tools/voicepeak/voicepeak_user_dict.csv` (85 行 + ヘッダ 1)
  - VDC2: `tools/voicepeak/voicepeak_user_dict.vdc2` (本バッチ向けに再生成済)
- プリセット **「女性4」** を選択 (くるみ確定話者、 [memory/feature_quizland_voicepeak_pivot_jyosei4.md](../../memory/feature_quizland_voicepeak_pivot_jyosei4.md))

## Step 1: VOICEPEAK で CSV インポート

- **ファイル**: `tools/voicepeak/voicepeak_lines_unique_phase1_count_total.csv`
  - 1 列目 = `女性4` (全 15 件統一済)
  - 2 列目 = speech (ひらがな + 「？」、 数え方は「ふたつ」「みっつ」等の和語)
  - ヘッダなし、 UTF-8 (BOM なし)、 CRLF
- **プリセット**: 「女性4」
- **出力ファイル名 (バッチ識別子)**: `count_total`
- **サンプルレート**: 44100 Hz
- **命名規則**: 連番 `0, 1, 2, ...` / プレフィックスなし / サフィックスなし
  - → 出力: `0-count_total.wav` 〜 `14-count_total.wav` (15 ファイル)
- **出力先フォルダ**: `D:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\count_total`

> 命名規則は他カテゴリと同じ。 Expand スクリプトは BaseName 先頭の数字で natural sort するため、 `0`/`00`/`001` のいずれでも OK。

## Step 2: 一括書き出し

VOICEPEAK GUI で全行選択 → 書き出し → Step 1 のフォルダへ保存。

→ `0-count_total.wav` 〜 `14-count_total.wav` (15 件) が生成される。

## Step 3: Expand スクリプト実行 (q番号への展開)

```powershell
cd d:\AppDevelopment\pono-asobiba-app
powershell -ExecutionPolicy Bypass -File tools\voicepeak\Expand-VoicepeakUniqueWavs.ps1 `
  -InputDir   "D:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\count_total" `
  -UniqueCsv  "tools\voicepeak\voicepeak_lines_unique_phase1_count_total.csv" `
  -ExpandJson "tools\voicepeak\voicepeak_unique_expand_count_total_phase1.json" `
  -OutputDir  "D:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\count_total_expanded"
```

→ `count_total_expanded/` 配下に q###_q.wav / q###_a.wav / q###_b.wav / q###_c.wav (合計 48 件、 q024 〜 q047 の Phase 1 全展開) が生成される。

### 期待出力 (展開先 24 問 / 48 ファイル)

| q### | _q (問題文) | _a/_b/_c (正解) | 正解の数 |
|---|---|---|---|
| q024 | りんごは いくつ？     | q024_a = ふたつ   | 2 |
| q025 | いちごは いくつ？     | q025_b = みっつ   | 3 |
| q026 | おはなは いくつ？     | q026_a = ひとつ   | 1 |
| q027 | おほしさまは いくつ？ | q027_b = ふたつ   | 2 |
| q028 | みかんは いくつ？     | q028_b = みっつ   | 3 |
| q029 | りんごは いくつ？     | q029_a = ひとつ   | 1 |
| q030 | いちごは いくつ？     | q030_b = ふたつ   | 2 |
| q031 | おはなは いくつ？     | q031_b = みっつ   | 3 |
| q032 | おほしさまは いくつ？ | q032_c = よっつ   | 4 |
| q033 | おはなは いくつ？     | q033_b = いつつ   | 5 |
| q034 | りんごは いくつ？     | q034_b = よっつ   | 4 |
| q035 | いちごは いくつ？     | q035_b = よっつ   | 4 |
| q036 | みかんは いくつ？     | q036_c = いつつ   | 5 |
| q037 | おほしさまは いくつ？ | q037_b = むっつ   | 6 |
| q038 | りんごは いくつ？     | q038_b = いつつ   | 5 |
| q039 | いちごは いくつ？     | q039_c = むっつ   | 6 |
| q040 | みかんは いくつ？     | q040_b = ななつ   | 7 |
| q041 | おほしさまは いくつ？ | q041_c = ななつ   | 7 |
| q042 | りんごは いくつ？     | q042_b = やっつ   | 8 |
| q043 | おはなは いくつ？     | q043_b = むっつ   | 6 |
| q044 | いちごは いくつ？     | q044_c = やっつ   | 8 |
| q045 | みかんは いくつ？     | q045_b = ここのつ | 9 |
| q046 | りんごは いくつ？     | q046_c = むっつ   | 6 |
| q047 | おほしさまは いくつ？ | q047_c = やっつ   | 8 |

> 不正解の選択肢 (q###_b / q###_c のうち上記正解以外) は和語数え (ひとつ〜ここのつ) で展開済。 詳細は `voicepeak_unique_expand_count_total_phase1.json` を参照。
> 数字選択肢「10こ」 等は実行時に `g_num_10.wav` (汎用 wav) を動的再生するため本バッチでは生成しない。

## Step 4: 試聴 + 微調整

展開後の `q###_*.wav` 群を順次試聴。 読み崩れがあれば:

1. `tools/voicepeak/voicepeak_user_dict.csv` を更新
2. `powershell -ExecutionPolicy Bypass -File tools/voicepeak/Convert-VoicepeakUserDictCsvToVdc2.ps1` で .vdc2 化
3. VOICEPEAK GUI でユーザー辞書を再インポート
4. 該当 unique CSV (= 本ファイルの CSV) を VOICEPEAK で再書き出し → Step 3 の Expand スクリプト再実行で全 q### に自動反映

---

## count_total 特有の試聴ポイント

| ポイント | 確認内容 |
|---|---|
| 名詞アクセント (5 語) | 「りんご」 (リンゴ, 核 0 = 平板)、 「いちご」 (イチゴ, 核 0)、 「みかん」 (ミカン, 核 0) が低高高 → 助詞 「は」 まで平板で繋がるか。 「リ ↑ ンゴワ↑」 と聞こえれば OK。 頭高 (リ ↓ ンゴ) になっていないか |
| 「おはな」 中高アクセント | 「おはな」 (オハナ, 核 2 = 中高) が オ ↑ ハナ ↓ + は と中高で読まれ、 「オハナワ↑」 と平板化していないか |
| 「おほしさま」 長音感 | 「おほしさま」 (オホシサマ, 核 0 = 平板) が 5 モーラで自然に流れ、 「オホ ↑ シサマ↑ ワ」 と平板で繋がるか。 「ホシ」 の母音脱落 (ホ ↓ シ→ホ ↓ ッ) や 「サマ」 のアクセント核挿入が起きていないか |
| 「は」 助詞の接続 | 「リンゴ + は」 が 「リンゴワ↑」 と鼻濁音気味に自然連結されるか。 「リンゴ + ハ↑」 と切れた読みになっていないか (= 全 5 名詞共通) |
| 「いくつ？」 の語尾 | 「イクツ ↑ ?」 と疑問の上昇調になるか。 平叙の下降 (イクツ ↓ ) になっていないか。 「イク ↓ ツ」 (頭高) ではなく 「イ ↓ クツ」 (核 1) として読まれるか |
| 和語数えのアクセント | 「ひとつ」 「ふたつ」 「みっつ」 〜 「ここのつ」 が伝統的な和語数え (= 大半が核 1 / 一部 0) として崩れず読まれるか。 とくに 「むっつ」 (促音) と 「ここのつ」 (4 モーラ) の連続性 |
| 数字選択肢の不在 | 「2つ」 「10こ」 等の数字混じり選択肢は g_num_*.wav 側で再生される (= 本バッチで生成しない)。 unique CSV に数字混入していないか念のため確認 (CSV 確認済) |

## 辞書カバレッジ (count_total Phase 1 全 15 件)

### 既に登録済の和語数え (1-10 つ)
- ひとつ / ふたつ / みっつ / よっつ / いつつ / むっつ / ななつ / やっつ / ここのつ (辞書既存)
- 助数詞 「いくつ」 (辞書既存)

### 本バッチで追加した名詞 (5 語、 辞書 80 → 85)
- **りんご (リンゴ, 核 0, 名詞)**
- **いちご (イチゴ, 核 0, 名詞)**
- **おはな (オハナ, 核 2, 名詞)**
- **おほしさま (オホシサマ, 核 0, 名詞)**
- **みかん (ミカン, 核 0, 名詞)**

### 結論

**count_total Phase 1 で必要な語彙はすべて辞書 v85 でカバー完了**。 試聴前に追加すべき語は無し (試聴後に読み崩れ発見した場合のみ追加)。

---

## 注意

- 既存 CSV (`voicepeak_lines_unique_phase1_count_total.csv` / `voicepeak_lines_phase1_count_total.csv`)、 展開 JSON (`voicepeak_unique_expand_count_total_phase1.json`)、 filename map (`voicepeak_filename_map_phase1_count_total.json`) は **無改変** (本タスクで触っていない)
- 辞書は別エージェントが +5 語 (= 80 → 85)、 VDC2 再生成済 (本タスクでは触らない)
- `quizland/index.html` / `sw.js` / `saved-layout.json` も触っていない
- commit はしていない (ユーザー指示通り)
