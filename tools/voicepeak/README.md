# VOICEPEAK 案 C ワークフロー (GUI 標準機能フル活用)

VOICEPEAK の **GUI 標準機能 (CSV インポート + 辞書インポート + SSML インポート)** だけで、Python スクリプトを書かずにメインキャラ「くるみちゃん」音声を一括生成するためのファイル群。

このディレクトリは **新規作成のみ**。既存の `tools/voicevox-generator/` には一切手を付けていない (VOICEVOX 用は別管理)。

---

## ファイル一覧と用途

| ファイル | 用途 | 行数 |
|---|---|---|
| `voicepeak_lines_test27.csv` | 27 行のセリフリスト (テスト用、Q01/Q24/Q95/Q160/Q170 + Q160 補足版) | 27 |
| `voicepeak_user_dict.csv` | ユーザー辞書 65 語の編集元CSV (5 カラム: 単語/読み/アクセント核位置/品詞/モーラ音高、`モーラ音高` は `;` 区切りの整数リストで GUI 手動微調整値 (`overwriteAccents`) を保持。空なら未指定) | 65 + ヘッダ 1 |
| `voicepeak_user_dict.vdc2` | VOICEPEAK の辞書インポート用ファイル (`voicepeak_user_dict.csv` から生成、`overwriteAccents` 完全対応) | 65 |
| `Convert-VoicepeakUserDictCsvToVdc2.ps1` | 編集元CSV → `.vdc2` 順方向変換スクリプト (PowerShell、5 カラム + `overwriteAccents` 対応) | - |
| `Convert-VoicepeakUserDictVdc2ToCsv.ps1` | `.vdc2` → 編集元CSV 逆変換スクリプト (PowerShell、`overwriteAccents` を `;` 区切りで CSV 5 列目に書き戻す。GUI で手動微調整した結果を CSV に取り込む経路) | - |
| `sample.ssml` | SSML 動作確認用の最小サンプル (q001_q「真ん中はなにいろ？」を `<voice>` `<prosody>` `<break>` で記述) | - |
| `README.md` | 本ファイル (VOICEPEAK GUI 操作手順 + 注意点) | - |

---

## VOICEPEAK GUI 操作手順 (1 サイクル)

> 最初は **テスト 27 ファイル** で品質確認 → OK ならフル 907 ファイルへ拡張する 2 段階運用。

### Step 1. 辞書インポート (初回のみ)

> **辞書フォーマット (VDC2) 解明済 (2026-05-12)**: VOICEPEAK のエクスポート結果 (`.vdc2`) は **バイナリではなく UTF-8 JSON 配列**。`sur` / `pron` / `pos` / `priority` / `accentType` / `lang` + 任意 `overwriteAccents` の 6+1 フィールドで構成される。テキストエディタで開ける。
>
> **2026-05-12 ラウンドトリップ完成**: CSV を 5 カラム化 (単語 / 読み / アクセント核位置 / 品詞 / モーラ音高) して `overwriteAccents` (GUI で手動微調整した モーラ単位の音高) も CSV 上に保持できるようになった。順方向 (CSV→VDC2) と逆方向 (VDC2→CSV) の両方向のスクリプトを用意し、 test.vdc2 (= ユーザーが GUI で編集して export した正本) との完全ラウンドトリップ (全 65 エントリ × 7 フィールドが一致) を確認済。
>
> 詳細は [memory/reference_voicepeak_vdc2_format.md](../../memory/reference_voicepeak_vdc2_format.md) を参照。

#### 1-a. CSV → VDC2 変換 (順方向: PowerShell スクリプト)

`voicepeak_user_dict.csv` (65 語、5 列) を編集したら、以下で VDC2 を再生成する:

```powershell
cd d:\AppDevelopment\pono-asobiba-app\tools\voicepeak
pwsh ./Convert-VoicepeakUserDictCsvToVdc2.ps1
# あるいは
powershell -ExecutionPolicy Bypass -File .\Convert-VoicepeakUserDictCsvToVdc2.ps1
# → voicepeak_user_dict.vdc2 が生成される
```

スクリプトは CSV を読み込み、`sur` / `pron` / `pos` / `priority` / `accentType` / `lang` (+ CSV 5 列目が空でないなら `overwriteAccents`) フィールドの JSON 配列に変換して `voicepeak_user_dict.vdc2` (UTF-8、BOM なし) を出力する。`pos` は CSV 4 列目の和名から VOICEPEAK 内部 ID にマッピング (`名詞 / 普通名詞 → Japanese_Futsuu_meishi`、未知/空も同じくフォールバック)。**VOICEPEAK GUI には 動詞 / 形容詞 / 副詞 のドロップダウンは存在しない** (名詞系のみ)。 全動詞・形容詞も `名詞` として登録する運用とし、 アクセント型でカバーする。 詳細と固有名詞系の内部 ID 未確認の件は [memory/reference_voicepeak_vdc2_format.md](../../memory/reference_voicepeak_vdc2_format.md) 参照。

#### 1-b. VDC2 → CSV 変換 (逆方向: PowerShell スクリプト)

VOICEPEAK GUI で手動でアクセントを微調整 → ユーザー辞書を export して `.vdc2` を取得した後、その手動調整値 (`overwriteAccents` 含む) を CSV 側に取り込みたい場合:

```powershell
cd d:\AppDevelopment\pono-asobiba-app\tools\voicepeak
powershell -ExecutionPolicy Bypass -File .\Convert-VoicepeakUserDictVdc2ToCsv.ps1
# → voicepeak_user_dict.csv が生成される (5 カラム、`overwriteAccents` は ;-区切りで 5 列目に)
```

入出力パスを切り替える場合は `-InputVdc2` / `-OutputCsv` を指定。たとえばユーザーが新しく export した `test.vdc2` を取り込むなら:

```powershell
powershell -ExecutionPolicy Bypass -File .\Convert-VoicepeakUserDictVdc2ToCsv.ps1 `
  -InputVdc2 .\test\test.vdc2 -OutputCsv .\voicepeak_user_dict.csv
```

これにより GUI 微調整が CSV に蓄積され、次回 CSV → VDC2 順方向変換すれば `overwriteAccents` を保ったまま再配布できる (= 完全ラウンドトリップ)。

#### 1-c. VOICEPEAK で VDC2 をインポート

1. VOICEPEAK を起動
2. メニュー [辞書] → [ユーザー辞書] → [インポート] (バージョンによって表記差異あり)
3. `voicepeak_user_dict.vdc2` を選択してインポート
4. 65 語が登録されたことを確認 (特に「真ん中=マンナカ平板」「肺=ハイ頭高」「胃=イ頭高」が反映されているか)
5. 既存辞書がある場合は VOICEPEAK 側で「マージ」or「置換」を選択

### Step 2. ナレーター (話者) 選択

1. プロジェクト新規作成
2. 画面上のナレーター選択メニューから、くるみちゃんに合いそうな話者を選ぶ
3. `voicepeak_lines_test27.csv` の 1 カラム目には仮で **`Japanese Female Child`** と書いているが、これは VOICEPEAK の標準女性子供声プリセット名の **想定** であり、実際の話者名はバージョンや所有プリセットによって異なる
4. ユーザーが所有しているナレーターから **女声 (元気で優しいお姉さん感)** を 1 つ選ぶ:
   - `Japanese Female 1` / `Japanese Female 2` (VOICEPEAK 標準同梱)
   - `フリモメン` `紲星あかり` `小春六花` 等の追加ナレーター
5. CSV の 1 カラム目を選んだナレーター名に **一括置換** (例: VS Code でファイル内置換 `Japanese Female Child` → `Japanese Female 1`)
6. ナレーター名を空欄にすれば「現在選択中のナレーターで読む」運用も可能 (VOICEPEAK バージョンによる)

### Step 3. CSV インポート → 一括生成

1. メニュー [ファイル] → [インポート] → [テキスト/CSV]
2. `voicepeak_lines_test27.csv` を選択
3. 27 行が **1 行 1 セリフブロック** としてタイムラインに展開される
4. 必要に応じて感情パラメータ (Happy/Fun/Angry/Sad) を **「くるみちゃん用プリセット」** として保存し、全行に一括適用
5. メニュー [ファイル] → [すべて書き出し] → 出力フォルダ指定 → 一括 wav 書き出し
6. 出力形式: 48kHz / 16bit / モノラル wav に GUI 設定で揃える

### Step 4. 出力ファイル名のリネーム

VOICEPEAK は CSV インポート時、ファイル名を **連番** (例: `Narration_001.wav`, `Narration_002.wav` ...) で出力する。発注書 `docs/quizland-voicevox-order/COWORK-TEST-ORDER.md` のファイル名規則 (`q001_q.wav` / `q001_a.wav` ...) にリネームする必要がある。

**連番 → 発注書ファイル名の対応表 (テスト 27 ファイル):**

| 連番 | リネーム後 | セリフ |
|---|---|---|
| 001 | q001_q.wav | 真ん中はなにいろ？ |
| 002 | q001_a.wav | あか |
| 003 | q001_b.wav | あお |
| 004 | q001_c.wav | きいろ |
| 005 | q001_d.wav | みどり |
| 006 | q024_q.wav | りんごはいくつ？ |
| 007 | q024_a.wav | ふたつ |
| 008 | q024_b.wav | みっつ |
| 009 | q024_c.wav | よっつ |
| 010 | q024_d.wav | いつつ |
| 011 | q095_q.wav | 大きいの反対は？ |
| 012 | q095_a.wav | 赤い |
| 013 | q095_b.wav | 丸い |
| 014 | q095_c.wav | 小さい |
| 015 | q095_d.wav | 優しい |
| 016 | q160_q.wav | 息を吸うのは体のどこ？ |
| 017 | q160_a.wav | 肺 |
| 018 | q160_b.wav | 胃 |
| 019 | q160_c.wav | 心 |
| 020 | q160_d.wav | 指 |
| 021 | q160_a_alt.wav | 臓器の肺 |
| 022 | q160_b_alt.wav | 胃袋の胃 |
| 023 | q170_q.wav | 2の次は？ |
| 024 | q170_a.wav | 2 |
| 025 | q170_b.wav | 3 |
| 026 | q170_c.wav | 4 |
| 027 | q170_d.wav | 5 |

リネームは PowerShell ワンライナーで一括処理できる (例):

```powershell
# 出力フォルダで実行 (連番 → q番号 リネームの一例)
$map = @{
  '001'='q001_q'; '002'='q001_a'; '003'='q001_b'; '004'='q001_c'; '005'='q001_d';
  '006'='q024_q'; '007'='q024_a'; '008'='q024_b'; '009'='q024_c'; '010'='q024_d';
  '011'='q095_q'; '012'='q095_a'; '013'='q095_b'; '014'='q095_c'; '015'='q095_d';
  '016'='q160_q'; '017'='q160_a'; '018'='q160_b'; '019'='q160_c'; '020'='q160_d';
  '021'='q160_a_alt'; '022'='q160_b_alt';
  '023'='q170_q'; '024'='q170_a'; '025'='q170_b'; '026'='q170_c'; '027'='q170_d'
}
Get-ChildItem *.wav | ForEach-Object {
  if ($_.BaseName -match '(\d{3})$') {
    $n = $matches[1]
    if ($map.ContainsKey($n)) { Rename-Item $_.FullName "$($map[$n]).wav" }
  }
}
```

### Step 5. SSML インポート (オプション、要動作確認)

1. メニュー [ファイル] → [インポート] → [SSML] (バージョンによっては存在しない可能性あり)
2. `sample.ssml` を選択
3. インポートできれば、`<prosody pitch="-5st">` などで **語句単位のピッチ調整** が可能
4. インポートが弾かれる/メニューが存在しない場合は SSML 案は破棄し、CSV + 辞書のみで運用
5. SSML が動く場合の活用例: 「肺 / 胃」のような同音異義語に `<prosody>` でピッチ差を付けて区別を強調

---

## 検収 (Step 4 後にユーザーが試聴)

発注書 `docs/quizland-voicevox-order/COWORK-TEST-ORDER.md` の「検収基準」7 項目で確認:

1. 読み崩れ (促音「ふたつ/みっつ/よっつ/いつつ/じゅっこ」)
2. 抑揚・速度 (子供向けにゆったり)
3. 27 ファイル間の音量レベル
4. 冒頭/末尾の無音 (理想 100〜200ms)
5. カギ括弧除去 (Q95 で「カギカッコ オオキイ カッコトジ」と読まれていないか)
6. 同音異義 (Q160 通常版 vs 補足版どちらが分かりやすいか)
7. 数字読み分け (Q24 「2つ→ふたつ」 vs Q170 「2→に」)

---

## フル 907 ファイルへの拡張方法

テスト 27 で OK が出たら、同じワークフローを 907 行 CSV に拡張するだけ。

1. 発注書フル版 (`docs/quizland-voicevox-order/ORDER-FULL.md` 等、未作成なら作成) から speech 列を抽出
2. `voicepeak_lines_full907.csv` を生成 (1 行 1 セリフ、ナレーター名は同じ)
3. VOICEPEAK で同じプロジェクト/プリセットを開き、CSV を差し替えてインポート → 一括生成
4. 連番 → 発注書ファイル名のリネームスクリプトも 907 行版に拡張
5. 辞書 (`voicepeak_user_dict.csv`) は 65 語のままで多くの行をカバーできるはず。フル展開時に「読み崩れた語」が見つかったら辞書に追記して再生成

> **【拡張時の注意】** フル発注の前に「テスト 27 で確定したナレーター名 + プリセット (感情パラメータ)」を必ずプロジェクトファイル (.vpf 等) として保存しておくこと。話者を変えるとキャラ統一性が崩れる。

---

## 既存 VOICEVOX 生成ツールとの併用方針

- `tools/voicevox-generator/` (VOICEVOX 雨晴はう案) と本 `tools/voicepeak/` (VOICEPEAK 案) は **並行運用**
- ユーザーが両方で q001_q.wav を試作 → 試聴比較 → くるみちゃんに合う方を **メイン採用**
- 採用しなかった方は将来の他キャラ (フクロウ博士の追加ボイスなど) 用に残す
- VOICEVOX 辞書 (`tools/voicevox-generator/voicevox_user_dict.csv` 65 語) と本辞書は **同じ語彙を別フォーマットに変換した姉妹ファイル**。読みは同期しているが、フォーマットは別物 (VOICEVOX は `surface,pronunciation,accent_type,priority,note` の 5 カラム、本ファイルは `単語,読み,アクセント核位置,品詞,モーラ音高` の 5 カラム。 5 列目はモーラ単位の音高微調整 (`overwriteAccents`、`;` 区切り整数リスト) を保持し、 GUI 手動微調整も CSV 上にキープできる完全ラウンドトリップ対応)

---

## ユーザー確認が必要なポイント (まとめ)

1. **辞書フォーマット**: ~~VOICEPEAK の正しいフォーマットを GUI で 1 語登録 → エクスポートで確認~~ → **2026-05-12 解明済 + 完全ラウンドトリップ対応**: `.vdc2` は UTF-8 JSON 配列 (`sur` / `pron` / `pos` / `priority` / `accentType` / `lang` + 任意 `overwriteAccents` の 6+1 フィールド)。順方向 (`Convert-VoicepeakUserDictCsvToVdc2.ps1`) と逆方向 (`Convert-VoicepeakUserDictVdc2ToCsv.ps1`) の両方を用意し、CSV を 5 カラム化してモーラ音高 (`overwriteAccents`) を `;` 区切りで保持。GUI 手動微調整値を CSV にキープ可能
2. **ナレーター名**: `Japanese Female Child` は仮置き。所有しているナレーターから女声を選んで CSV を一括置換してほしい
3. **SSML サポート**: VOICEPEAK のバージョンで SSML インポートメニューが存在するか確認 (なければ SSML 案は破棄)
4. **試聴判断**: テスト 27 ファイル生成後、VOICEVOX 雨晴はう版と聴き比べてどちらをメインにするか決定してほしい

---

## 気になった点

- ~~**辞書フォーマット未確定**~~ → **解明済 + 完全ラウンドトリップ対応 (2026-05-12)**: `.vdc2` は UTF-8 JSON 配列、`sur` / `pron` / `pos` / `priority` / `accentType` / `lang` + 任意 `overwriteAccents` の 6+1 フィールド。順方向 `Convert-VoicepeakUserDictCsvToVdc2.ps1` + 逆方向 `Convert-VoicepeakUserDictVdc2ToCsv.ps1` で CSV ↔ VDC2 両方向変換可能 (CSV は 5 カラム化、5 列目「モーラ音高」が `overwriteAccents` を `;` 区切りで保持)。詳細は [memory/reference_voicepeak_vdc2_format.md](../../memory/reference_voicepeak_vdc2_format.md)
- **アクセント核位置の表記**: 本ファイルは「核位置の数字 (0 = 平板, 1 = 頭高, 2/3 = 中高)」で書いている。VDC2 の `accentType` も同じ整数値方式 (0=平板)。CSV と VDC2 で互換
- **SSML の `<voice name="...">` の name 引数**: VOICEPEAK が認識する name はナレーター名そのものなのか、別 ID なのかが未確認。動かない場合は `<voice>` を外して `<speak>` 直下にテキストを置くだけの形を試すと良い
- **フルセット 907 ファイルの speech 列**: 現時点では `docs/quizland-voicevox-order/COWORK-TEST-ORDER.md` 内のテスト 27 ファイル分しか speech が定義されていない。フル発注版の発注書を作成する際、本ディレクトリにも `voicepeak_lines_full907.csv` を追加する想定
