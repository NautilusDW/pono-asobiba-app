# VOICEPEAK 実行手順: order_color Phase 2 (= 不正解選択肢、 ハイブリッド第 1 弾)

> 親計画: [BATCH-PLAN-PHASE1-PHASE2.md](./BATCH-PLAN-PHASE1-PHASE2.md)
>
> ユニーク件数: **8 件** (8 色名: 赤 / 黄色 / 緑 / 青 / ピンク / オレンジ / 紫 / みずいろ)
> 全件展開数: 24 問 × 3 不正解選択肢 = **72 ファイル** (q001 〜 q024 の各 _a/_b/_c/_d のうち正解以外 3 つ) — Phase 1 で生成済の正解 wav (= q001_q 〜 q024_q + 各正解 _x) を除いた、 不正解選択肢のみの責務
>
> **本カテゴリはハイブリッド方針の第 1 弾** — order_color は正解と不正解で同じ色名を再利用するため、 phase1 (= 問題文 + 正解語) と phase2 (= 不正解選択肢) を分離してユニーク化し、 dedup 効率を最大化した。 phase2 単体では 8 ユニーク → 72 ファイルへ展開 (= 9 倍圧縮)

## 前提

- VOICEPEAK 起動済
- ユーザー辞書 (現状 109 entries) をインポート済 (新規 / 再インポート)
  - CSV: `tools/voicepeak/voicepeak_user_dict.csv`
  - VDC2: `tools/voicepeak/voicepeak_user_dict.vdc2`
- プリセット **「女性4」** を選択 (くるみ確定話者、 [memory/feature_quizland_voicepeak_pivot_jyosei4.md](../../memory/feature_quizland_voicepeak_pivot_jyosei4.md))

> order_color phase2 用に辞書追加が必要な語は **無し** (= 「## 辞書カバレッジ」 節参照、 8 色名すべて既辞書 v109 でカバー済)。 試聴で読み崩れが出た場合のみ追加検討。

## Step 1: VOICEPEAK で CSV インポート

- **ファイル**: `tools/voicepeak/voicepeak_lines_unique_phase2_order_color.csv`
  - 1 列目 = `女性4` (全 8 件統一済)
  - 2 列目 = speech (**漢字混じり化 + 句点付与済**: 赤。 / 黄色。 / 緑。 / 青。 / ピンク。 / オレンジ。 / 紫。 / みずいろ。)
  - ヘッダなし、 UTF-8 (BOM なし)、 CRLF (= 8 行確定、 155 bytes)
- **プリセット**: 「女性4」
- **出力ファイル名 (バッチ識別子)**: `order_color_phase2`
- **サンプルレート**: 44100 Hz
- **命名規則**: 連番 `0, 1, 2, ...` / プレフィックスなし / サフィックスなし
  - → 出力: `0-order_color_phase2.wav` 〜 `7-order_color_phase2.wav` (8 ファイル)
- **出力先フォルダ**: `D:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\order_color_phase2`

> 命名規則は他カテゴリ (count_total / number_sequence / shape_name / weather / opposite / body / trivia) と同じ。 Expand スクリプトは BaseName 先頭の数字で natural sort するため、 `0`/`00`/`001` のいずれでも OK。

## Step 2: 一括書き出し

VOICEPEAK GUI で全行選択 → 書き出し → Step 1 のフォルダへ保存。

→ `0-order_color_phase2.wav` 〜 `7-order_color_phase2.wav` (8 件) が生成される。

## Step 3: Expand スクリプト実行 (q番号への展開)

```powershell
cd d:\AppDevelopment\pono-asobiba-app
powershell -ExecutionPolicy Bypass -File tools\voicepeak\Expand-VoicepeakUniqueWavs.ps1 `
  -InputDir   "D:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\order_color_phase2" `
  -UniqueCsv  "tools\voicepeak\voicepeak_lines_unique_phase2_order_color.csv" `
  -ExpandJson "tools\voicepeak\voicepeak_unique_expand_order_color_phase2.json" `
  -OutputDir  "D:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\order_color_phase2_expanded"
```

→ `order_color_phase2_expanded/` 配下に q###_a/b/c/d.wav (合計 72 件、 24 問 × 3 不正解選択肢) が生成される。

### 期待出力 (展開先 24 問 × 3 不正解 = 72 ファイル)

> Phase 1 で生成済の正解 wav (= q001_q.wav 〜 q024_q.wav + 各 q###_{正解 suffix}.wav) は **本バッチで上書きしない** (= 別フォルダに展開、 後で narration manifest 構築時にマージ)。 本表は phase2 で展開される 72 ファイルの内訳。

| ユニーク wav | 展開先 (q###_x.wav) | 件数 |
|---|---|---|
| 0-order_color_phase2.wav (= 赤。) | q001_a, q002_a, q004_a, q005_a, q009_a, q011_c, q012_d, q014_a, q015_d, q017_a, q018_b, q023_b, q024_d | 13 |
| 1-order_color_phase2.wav (= 黄色。) | q001_c, q002_b, q003_c, q005_c, q007_b, q008_c, q013_c, q016_c, q017_d, q018_c, q019_b, q020_a, q022_c | 13 |
| 2-order_color_phase2.wav (= 緑。) | q001_d, q003_d, q004_d, q005_d, q006_d, q007_a, q008_b, q009_d, q011_a, q014_b, q016_d, q020_d, q022_d, q023_d | 14 |
| 3-order_color_phase2.wav (= 青。) | q002_c, q003_b, q004_b, q006_c, q008_d, q009_c, q010_b, q011_d, q013_a, q014_d, q017_b, q020_c, q021_b, q022_b, q023_a, q024_b | 16 |
| 4-order_color_phase2.wav (= ピンク。) | q006_b, q010_a, q012_b, q018_d, q021_a, q024_c | 6 |
| 5-order_color_phase2.wav (= オレンジ。) | q007_d, q010_d, q012_c, q013_d, q019_a | 5 |
| 6-order_color_phase2.wav (= 紫。) | q015_a, q016_a, q019_d, q021_d | 4 |
| 7-order_color_phase2.wav (= みずいろ。) | q015_c | 1 |
| **合計** | | **72** |

> 詳細は `voicepeak_unique_expand_order_color_phase2.json` を参照。 8 ユニーク → 72 q### 展開 = 9 倍圧縮効率 (order_color は色名の組み合わせ問題が多く、 phase1 と分離することで dedup 効率が最大化される代表例)。

## Step 4: 試聴 + 微調整

展開後の `q###_*.wav` 群を順次試聴。 読み崩れがあれば:

1. `tools/voicepeak/voicepeak_user_dict.csv` を更新
2. `powershell -ExecutionPolicy Bypass -File tools/voicepeak/Convert-VoicepeakUserDictCsvToVdc2.ps1` で .vdc2 化
3. VOICEPEAK GUI でユーザー辞書を再インポート
4. 該当 unique CSV (= 本ファイルの CSV) を VOICEPEAK で再書き出し → Step 3 の Expand スクリプト再実行で全 q### に自動反映

---

## order_color phase2 特有の試聴ポイント

> phase2 は **答え単体の wav** (= 「赤。」 「青。」 等の 1-3 モーラ短語に句点付与)。 phase1 で確立した「答え末尾句点」 方針 (= 2026-05-17) と同様、 句点で発音完了感が自然に出るか確認。

| ポイント | 確認内容 |
|---|---|
| 「赤」 (アカ) | 既辞書 L4「あか/アカ/0」 / L98「赤/アカ/1」 で「アカ」 と読まれるか。 アクセント核は文脈で揺れる可能性 (L4 = 核 0 平板 / L98 = 核 1 頭高) — 単独発話なので L98 (核 1) が優先される想定 |
| 「黄色」 (キイロ) | 既辞書 L6「きいろ/キイロ/0」 / L100「黄色/キイロ/0」 で「キイロ」 (核 0 平板) と読まれるか。 「コーショク」 等の音読み混入がないか |
| 「緑」 (ミドリ) | 既辞書 L7「みどり/ミドリ/0」 / L99「緑/ミドリ/0」 で「ミドリ」 (核 0 平板) と読まれるか。 「リョク」 (音読み) と読まれていないか |
| 「青」 (アオ) | 既辞書 L5「あお/アオ/2」 / L97「青/アオ/2」 で「アオ」 (核 2 尾高) と読まれるか。 「セイ」 (音読み) と読まれていないか。 2 モーラ短語、 句点付与時のリリースが自然か |
| 「ピンク」 (ピンク) | 既辞書 L8「ピンク/ピンク/1」 で「ピンク」 (核 1 頭高) と読まれるか。 「ピンキー」 (英語っぽい伸び) になっていないか |
| 「オレンジ」 (オレンジ) | 既辞書 L9「オレンジ/オレンジ/0」 で「オレンジ」 (核 0 平板) と読まれるか。 「オ + レンジ」 と切れていないか |
| 「紫」 (ムラサキ) | 既辞書 L10「むらさき/ムラサキ/3」 / L101「紫/ムラサキ/3」 で「ムラサキ」 (核 3 中高) と読まれるか。 「シ」 (音読み) と読まれていないか |
| 「みずいろ」 (ミズイロ) | 既辞書 L11「みずいろ/ミズイロ/0」 で「ミズイロ」 (核 0 平板) と読まれるか。 **CSV はカナ維持 (= 「水色」 漢字だと「ミズショク」 誤読リスク回避、 2026-05-17 方針)**。 試聴で問題なく「ミズイロ」 と読まれるなら、 別タスクで「水色」 → 辞書追加 → CSV 漢字化に切り替えても良い |
| 「。」 終端 | 全 8 答えに句点付与済 (= 2026-05-17 方針)。 句点で発音完了感が自然に出るか、 短すぎる無音にならず適切な余韻があるか (= phase1 trivia / shape_name / weather / opposite / body と同確認ポイント) |
| 単体短語のアクセント崩れ | 1-3 モーラの短語が独立発話される場合、 連続文中での読みと違って核位置が揺れることがある。 とくに「赤」 (核 1) / 「青」 (核 2) / 「紫」 (核 3) の三者が問題画面で連続再生されたときに核の高低差が自然に聴こえるか確認 |

## 辞書カバレッジ (order_color phase2 全 8 件)

### 既に登録済の語 (本バッチで再利用)

| 既存登録 | Surface | 読み | アクセント核 | 行 |
|---|---|---|---|---|
| ✅ | あか / 赤 | アカ | 0 / 1 | L4 / L98 |
| ✅ | きいろ / 黄色 | キイロ | 0 / 0 | L6 / L100 |
| ✅ | みどり / 緑 | ミドリ | 0 / 0 | L7 / L99 |
| ✅ | あお / 青 | アオ | 2 / 2 | L5 / L97 |
| ✅ | ピンク | ピンク | 1 | L8 |
| ✅ | オレンジ | オレンジ | 0 | L9 |
| ✅ | むらさき / 紫 | ムラサキ | 3 / 3 | L10 / L101 |
| ✅ | みずいろ | ミズイロ | 0 | L11 |

### 追加候補

**全カバー済**。 本バッチで追加辞書登録は不要。 試聴で読み崩れが出た場合のみ、 上記既存登録のアクセント核を微調整 (= 既存登録の修正のみ、 新規追加は無し)。

> 「水色」 (漢字) を追加する選択肢もあるが、 現状 CSV はカナ維持なので登録不要。 将来「みずいろ」 → 「水色」 に切り替える際は、 別タスクで `水色,ミズイロ,0,名詞` を追加する。

### 結論

**order_color phase2 は既辞書 v109 で完全カバー**。 8 色名すべて登録済 (= ひらがな + 漢字の両形態が登録された色名カテゴリの優等生)、 アクセント核も明示済。 phase2 単体としては最もリスクが低いバッチ。 試聴は主に **句点付与後の発音完了感** と **単体短語の核位置安定性** の 2 点に集中すれば良い。

---

## 注意

- 既存 CSV (`voicepeak_lines_unique_phase2_order_color.csv` / `voicepeak_lines_phase2_order_color.csv`) は **本タスクで漢字混じり化 + 句点付与済** (= 2026-05-17 方針: 高リスク「みずいろ → 水色」 はカナ維持で誤読「ミズショク」 を事前防止、 答え単体 wav なので末尾「。」 付与で発音完了感を自然化)
- 展開 JSON (`voicepeak_unique_expand_order_color_phase2.json`) は **キーを CSV と同じ漢字混じり版 + 句点付きに更新済** (= trivia / shape_name で確立した「expand JSON ひらがな残存バグ事前防止」 + 句点同期方針。 検証スクリプトで CSV 8 phrases と JSON 8 keys が完全一致、 total wav 参照 72 = 全展開数を確認済)
- filename map (`voicepeak_filename_map_phase2_order_color.json`) は **無改変** (本タスクで触っていない)
- 辞書 (`voicepeak_user_dict.csv` / `.vdc2`) も **無改変** (本タスクで触っていない、 8 色名すべて既存カバー済 = 追加候補なし)
- Phase 1 で生成済の wav (= `tmp/quizland_NA/order_color/0-order_color.wav` 〜 / `order_color_expanded/q001_q.wav` 〜 q024 の正解 wav) は **本バッチで上書きしない** (= 別フォルダ `order_color_phase2` / `order_color_phase2_expanded` に展開、 narration manifest 構築時に Phase 1 + Phase 2 をマージ)
- `quizland/index.html` / `quizland/data/questions.js` / `sw.js` / `saved-layout.json` も触っていない
- 他カテゴリの CSV / 手順書も触っていない
- `docs/quizland-voicevox-order/ORDER-FULL.md` も触っていない (= phase2 セクション既存ならそれを参照、 本バッチで新規記述はしない)
- 出力先フォルダ `D:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\order_color_phase2` を作成済 (空ディレクトリ)
- commit はしていない (ユーザー指示通り)
