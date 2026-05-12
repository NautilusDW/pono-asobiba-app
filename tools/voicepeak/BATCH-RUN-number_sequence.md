# VOICEPEAK 実行手順: number_sequence Phase 1 (sw v963 時点)

> 親計画: [BATCH-PLAN-PHASE1-PHASE2.md](./BATCH-PLAN-PHASE1-PHASE2.md)
>
> ユニーク件数: **20 件** (元 24 件、 Phase 1 削減 4 件 — 「に」 「さん」 「なな」 「きゅう」 等が複数 q### で再利用されるため、 unique 化により 24 → 20 に圧縮)
> 全件展開数: 24 件 (q169_q 〜 q180_q + 各 q###_b/c) ← 展開 JSON 参照

## 前提

- VOICEPEAK 起動済
- ユーザー辞書 **v80 (旧 79 → +「ろく」 1 語)** をインポート済 (新規 / 再インポート)
  - CSV: `tools/voicepeak/voicepeak_user_dict.csv` (80 行 + ヘッダ 1)
  - VDC2: `tools/voicepeak/voicepeak_user_dict.vdc2` (本タスクで再生成済)
- プリセット **「女性4」** を選択 (くるみ確定話者、 [memory/feature_quizland_voicepeak_pivot_jyosei4.md](../../memory/feature_quizland_voicepeak_pivot_jyosei4.md))

## Step 1: VOICEPEAK で CSV インポート

- **ファイル**: `tools/voicepeak/voicepeak_lines_unique_phase1_number_sequence.csv`
  - 1 列目 = `女性4` (全 20 件統一済)
  - 2 列目 = speech (ひらがな + 「？」)
  - ヘッダなし、 UTF-8 (BOM なし)、 CRLF
- **プリセット**: 「女性4」
- **出力ファイル名 (バッチ識別子)**: `number_sequence`
- **サンプルレート**: 44100 Hz
- **命名規則**: 連番 `0, 1, 2, ...` / プレフィックスなし / サフィックスなし
  - → 出力: `0-number_sequence.wav` 〜 `19-number_sequence.wav` (20 ファイル)
- **出力先フォルダ**: `D:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\number_sequence`

> 命名規則は他カテゴリと同じ。 Expand スクリプトは BaseName 先頭の数字で natural sort するため、 `0`/`00`/`001` のいずれでも OK。

## Step 2: 一括書き出し

VOICEPEAK GUI で全行選択 → 書き出し → Step 1 のフォルダへ保存。

→ `0-number_sequence.wav` 〜 `19-number_sequence.wav` (20 件) が生成される。

## Step 3: Expand スクリプト実行 (q番号への展開)

```powershell
cd d:\AppDevelopment\pono-asobiba-app
powershell -ExecutionPolicy Bypass -File tools\voicepeak\Expand-VoicepeakUniqueWavs.ps1 `
  -InputDir   "D:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\number_sequence" `
  -UniqueCsv  "tools\voicepeak\voicepeak_lines_unique_phase1_number_sequence.csv" `
  -ExpandJson "tools\voicepeak\voicepeak_unique_expand_number_sequence_phase1.json" `
  -OutputDir  "D:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\number_sequence_expanded"
```

→ `number_sequence_expanded/` 配下に q###_q.wav / q###_b.wav / q###_c.wav (合計 24 件、 q169 〜 q180 の Phase 1 全展開) が生成される。

### 期待出力 (展開先 24 ファイル)

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

## Step 4: 試聴 + 微調整

展開後の `q###_*.wav` 群を順次試聴。 読み崩れがあれば:

1. `tools/voicepeak/voicepeak_user_dict.csv` を更新
2. `powershell -ExecutionPolicy Bypass -File tools/voicepeak/Convert-VoicepeakUserDictCsvToVdc2.ps1` で .vdc2 化
3. VOICEPEAK GUI でユーザー辞書を再インポート
4. 該当 unique CSV (= 本ファイルの CSV) を VOICEPEAK で再書き出し → Step 3 の Expand スクリプト再実行で全 q### に自動反映

---

## number_sequence 特有の試聴ポイント

| ポイント | 確認内容 |
|---|---|
| 数詞 1 モーラ | 「に」 「ご」 が 1 モーラとして発音され (= 「ニー」 等の伸長や母音化を起こさず)、 アクセント核 1 で頭高 (= ↓ ニ / ↓ ゴ) として聞こえるか |
| 「ろくの つぎは？」 | **本タスクで辞書追加した「ろく」 (ロク, 核 2 = 尾高)** が ロ ↑ ク ↓ + の → 「ロクのツギは？」 と自然に繋がるか。 「ロッ」 (促音化) や 平板読み (低低) になっていないか |
| 「ろくと はちの あいだは？」 | 「ろく」 + 助詞 「と」 が 「ロクト」 として正しく接続されるか。 「ろっと」 等にならないか |
| 「2 のつぎ」 系の数字並び | speech はひらがな 「に / よん / ろく」 等で完全に固定されており、 アラビア数字 「2 / 4」 が混入していないため数字読み揺れリスクはなし (CSV 確認済) |
| 「あいだ」 | 「ニとヨンの **アイダ** は？」 で「あいだ」 がアクセント核 0 (平板) として「ア ↑ イダ」 と聞こえるか (辞書 line 49: `アイダ,0`) |
| 「つぎ」 | 「イチ ↑ のツギ ↓ は？」 で「つぎ」 が頭高 (核 1) で読まれるか (辞書 line 33: `ツギ,1`) |
| 「まえ」 | 「サン ↑ のマエ ↓ は？」 で「まえ」 が頭高 (核 1) で読まれるか (辞書 line 32: `マエ,1`) |

## 辞書カバレッジ (number_sequence Phase 1 全 20 件)

### 既に登録済の頻出数詞 (9 語)
- いち (line 21) / に (line 22) / さん (line 23) / よん (line 24) / ご (line 25) / はち (line 26) / きゅう (line 27) / じゅう (line 28) / なな (line 29)

### 既に登録済の位置関係詞 (3 語)
- まえ (line 32) / つぎ (line 33) / あいだ (line 49)

### 本タスクで追加した語 (1 語)
- **ろく (ロク, 核 2, 名詞)** ← 辞書 79 → 80 entries
  - 単独 「ろく」 が未登録だった (既存は じゅっこ / ろっこ / ろっぽん 等の派生のみ)
  - 「ろくの つぎは？」 「ろくと はちの あいだは？」 の 2 行で必要

### 結論

**number_sequence Phase 1 で必要な語彙はすべて辞書 v80 でカバー完了**。 試聴前に追加すべき語は無し (試聴後に読み崩れ発見した場合のみ追加)。

---

## 注意

- 既存 CSV (`voicepeak_lines_unique_phase1_number_sequence.csv`) と展開 JSON (`voicepeak_unique_expand_number_sequence_phase1.json`) は **無改変** (本タスクで触っていない)
- 辞書のみ +1 語 (= 79 → 80)、 VDC2 再生成済
- commit はしていない (ユーザー指示通り)
