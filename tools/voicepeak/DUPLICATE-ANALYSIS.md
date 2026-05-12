# Speech 重複分析レポート (2026-05-12)

> 自動生成: `tools/voicepeak/_build_unique_csvs.py`
>
> 既存 `voicepeak_lines_phase{1,2}_*.csv` / `voicepeak_lines_kurumi_dai1_5.csv` / 各 map JSON は温存。 unique 化結果は `voicepeak_lines_unique_*.csv` / `voicepeak_unique_expand_*.json` に並列配置。

## 全体統計

- 全件数: **912** (= 907 本編 + 5 くるみ)
- ユニーク speech 数 (フル横断): **426** → 削減 486 件 (53.3%)
- ユニーク speech 数 (カテゴリ × フェーズ単位): **515** → 削減 397 件 (43.5%)
- カテゴリ × フェーズ間で重複している speech 数: **69** 件 (= フル横断時にさらに削減できる対象)
- **採用方針: (a) カテゴリ × フェーズ単位 独立 unique 化** (試聴フロー維持優先)

## カテゴリ × フェーズ別 ユニーク化結果

| カテゴリ | Phase | 元件数 | ユニーク後 | 削減 | 削減率 |
|---|---|---:|---:|---:|---:|
| order_color | Phase 1 | 48 | 15 | 33 | 68.8% |
| order_color | Phase 2 | 72 | 8 | 64 | 88.9% |
| count_total | Phase 1 | 48 | 14 | 34 | 70.8% |
| count_total | Phase 2 | 72 | 10 | 62 | 86.1% |
| shape_name | Phase 1 | 46 | 26 | 20 | 43.5% |
| shape_name | Phase 2 | 69 | 14 | 55 | 79.7% |
| number_sequence | Phase 1 | 24 | 20 | 4 | 16.7% |
| number_sequence | Phase 2 | 36 | 10 | 26 | 72.2% |
| opposite | Phase 1 | 48 | 48 | 0 | 0.0% |
| opposite | Phase 2 | 72 | 49 | 23 | 31.9% |
| weather | Phase 1 | 48 | 39 | 9 | 18.8% |
| weather | Phase 2 | 72 | 51 | 21 | 29.2% |
| body | Phase 1 | 49 | 39 | 10 | 20.4% |
| body | Phase 2 | 73 | 49 | 24 | 32.9% |
| trivia | Phase 1 | 52 | 50 | 2 | 3.8% |
| trivia | Phase 2 | 78 | 68 | 10 | 12.8% |
| くるみ | Phase 1 | 5 | 5 | 0 | 0.0% |
| **合計** | - | **912** | **515** | **397** | **43.5%** |

## 重複 Top 20 (フル横断、 出現回数の多い順)

| # | speech | 回数 | 対応ファイル名 |
|---:|---|---:|---|
| 1 | あお | 21 | q001_b.wav, q005_b.wav, q018_a.wav, q002_c.wav, q003_b.wav, q004_b.wav, q006_c.wav, q008_d.wav, q009_c.wav, q010_b.wav, q011_d.wav, q013_a.wav, q014_d.wav, q017_b.wav, q020_c.wav, q021_b.wav, q022_b.wav, q023_a.wav, q181_b.wav, q119_c.wav, q124_b.wav |
| 2 | きいろ | 21 | q004_c.wav, q009_b.wav, q010_c.wav, q011_b.wav, q014_c.wav, q021_c.wav, q181_a.wav, q001_c.wav, q002_b.wav, q003_c.wav, q005_c.wav, q007_b.wav, q008_c.wav, q013_c.wav, q016_c.wav, q017_d.wav, q018_c.wav, q019_b.wav, q020_a.wav, q022_c.wav, q119_b.wav |
| 3 | あか | 19 | q003_a.wav, q016_b.wav, q019_c.wav, q022_a.wav, q001_a.wav, q002_a.wav, q004_a.wav, q005_a.wav, q009_a.wav, q011_c.wav, q012_d.wav, q014_a.wav, q015_d.wav, q017_a.wav, q018_b.wav, q023_b.wav, q181_d.wav, q124_a.wav, q119_a.wav |
| 4 | みどり | 17 | q002_d.wav, q012_a.wav, q017_c.wav, q001_d.wav, q003_d.wav, q004_d.wav, q005_d.wav, q006_d.wav, q007_a.wav, q008_b.wav, q009_d.wav, q011_a.wav, q014_b.wav, q016_d.wav, q020_d.wav, q022_d.wav, q023_d.wav |
| 5 | よっつ | 17 | q032_b.wav, q034_b.wav, q035_b.wav, q024_c.wav, q025_c.wav, q026_d.wav, q027_d.wav, q028_c.wav, q029_d.wav, q030_d.wav, q031_c.wav, q033_b.wav, q036_a.wav, q037_a.wav, q038_a.wav, q039_a.wav, q142_d.wav |
| 6 | まる | 16 | q048_a.wav, q070_a.wav, q049_a.wav, q050_a.wav, q051_b.wav, q052_a.wav, q053_b.wav, q054_a.wav, q056_d.wav, q057_b.wav, q058_a.wav, q061_b.wav, q062_b.wav, q067_a.wav, q069_b.wav, q094_a.wav |
| 7 | いつつ | 14 | q033_c.wav, q036_b.wav, q038_b.wav, q024_d.wav, q025_d.wav, q028_d.wav, q031_d.wav, q032_c.wav, q034_c.wav, q035_c.wav, q037_b.wav, q039_b.wav, q043_a.wav, q046_a.wav |
| 8 | むっつ | 14 | q037_c.wav, q039_c.wav, q043_b.wav, q046_b.wav, q032_d.wav, q033_d.wav, q034_d.wav, q035_d.wav, q036_c.wav, q038_c.wav, q040_a.wav, q041_a.wav, q042_a.wav, q047_a.wav |
| 9 | しかく | 13 | q049_b.wav, q069_a.wav, q048_b.wav, q050_b.wav, q051_c.wav, q052_b.wav, q053_c.wav, q054_d.wav, q057_d.wav, q058_b.wav, q068_d.wav, q070_b.wav, q094_d.wav |
| 10 | みっつ | 13 | q025_b.wav, q028_b.wav, q031_b.wav, q024_b.wav, q026_c.wav, q027_c.wav, q029_c.wav, q030_c.wav, q032_a.wav, q033_a.wav, q034_a.wav, q035_a.wav, q142_c.wav |
| 11 | さんかく | 12 | q050_c.wav, q067_b.wav, q048_c.wav, q049_c.wav, q051_d.wav, q052_d.wav, q056_c.wav, q057_c.wav, q058_c.wav, q068_c.wav, q069_c.wav, q070_c.wav |
| 12 | ななつ | 12 | q040_b.wav, q041_b.wav, q036_d.wav, q037_d.wav, q038_d.wav, q039_d.wav, q042_b.wav, q043_c.wav, q044_a.wav, q045_a.wav, q046_c.wav, q047_b.wav |
| 13 | ほし | 12 | q052_c.wav, q062_a.wav, q048_d.wav, q049_d.wav, q050_d.wav, q054_c.wav, q056_a.wav, q061_c.wav, q069_d.wav, q070_d.wav, q078_d.wav, q094_b.wav |
| 14 | ふたつ | 9 | q024_a.wav, q027_b.wav, q030_b.wav, q025_a.wav, q026_b.wav, q028_a.wav, q029_b.wav, q031_a.wav, q142_b.wav |
| 15 | め | 9 | q145_b.wav, q150_b.wav, q146_a.wav, q149_c.wav, q151_a.wav, q153_c.wav, q156_a.wav, q159_c.wav, q127_b.wav |
| 16 | オレンジ | 9 | q006_a.wav, q008_a.wav, q015_b.wav, q020_b.wav, q007_d.wav, q010_d.wav, q012_c.wav, q013_d.wav, q019_a.wav |
| 17 | あめ | 8 | q072_c.wav, q071_c.wav, q073_c.wav, q074_b.wav, q075_d.wav, q077_a.wav, q080_a.wav, q122_a.wav |
| 18 | くもり | 8 | q073_b.wav, q071_b.wav, q072_b.wav, q074_d.wav, q075_b.wav, q076_c.wav, q077_b.wav, q080_d.wav |
| 19 | これは どんな かたち？ | 8 | q048_q.wav, q049_q.wav, q050_q.wav, q051_q.wav, q052_q.wav, q053_q.wav, q057_q.wav, q058_q.wav |
| 20 | はな | 8 | q149_a.wav, q153_a.wav, q145_a.wav, q146_d.wav, q151_d.wav, q156_b.wav, q121_a.wav, q127_a.wav |

## カテゴリ × フェーズ間 重複 (フル横断 unique 化なら追加削減可能な speech)

- 該当 speech 数: **69**

代表例 (上位 10):

| speech | 出現バッチ | 総出現数 |
|---|---|---:|
| あお | order_color_phase1, order_color_phase2, trivia_phase2 | 21 |
| きいろ | order_color_phase1, order_color_phase2, trivia_phase1 | 21 |
| あか | order_color_phase1, order_color_phase2, trivia_phase1, trivia_phase2 | 19 |
| みどり | order_color_phase1, order_color_phase2 | 17 |
| よっつ | count_total_phase1, count_total_phase2, trivia_phase2 | 17 |
| まる | shape_name_phase1, shape_name_phase2, weather_phase2 | 16 |
| いつつ | count_total_phase1, count_total_phase2 | 14 |
| むっつ | count_total_phase1, count_total_phase2 | 14 |
| しかく | shape_name_phase1, shape_name_phase2, weather_phase2 | 13 |
| みっつ | count_total_phase1, count_total_phase2, trivia_phase1 | 13 |

## (a) カテゴリ × フェーズ単位 vs (b) フル横断 比較

| 方針 | ユニーク数 | 削減数 | 削減率 | 試聴フロー |
|---|---:|---:|---:|---|
| (a) カテゴリ × フェーズ単位 | 515 | 397 | 43.5% | 既存と同じ (カテゴリ別バッチ試聴) |
| (b) フル横断 | 426 | 486 | 53.3% | 1 バッチ集約 (どのカテゴリで生成するか割り振り要) |

→ **採用: (a)**。 (b) との差 = 89 件 (試聴フロー維持コストとトレードオフ)

## 生成ファイル一覧

### Unique CSV (VOICEPEAK インポート用)

- `tools/voicepeak/voicepeak_lines_unique_phase1_order_color.csv` (15 件)
- `tools/voicepeak/voicepeak_lines_unique_phase2_order_color.csv` (8 件)
- `tools/voicepeak/voicepeak_lines_unique_phase1_count_total.csv` (14 件)
- `tools/voicepeak/voicepeak_lines_unique_phase2_count_total.csv` (10 件)
- `tools/voicepeak/voicepeak_lines_unique_phase1_shape_name.csv` (26 件)
- `tools/voicepeak/voicepeak_lines_unique_phase2_shape_name.csv` (14 件)
- `tools/voicepeak/voicepeak_lines_unique_phase1_number_sequence.csv` (20 件)
- `tools/voicepeak/voicepeak_lines_unique_phase2_number_sequence.csv` (10 件)
- `tools/voicepeak/voicepeak_lines_unique_phase1_opposite.csv` (48 件)
- `tools/voicepeak/voicepeak_lines_unique_phase2_opposite.csv` (49 件)
- `tools/voicepeak/voicepeak_lines_unique_phase1_weather.csv` (39 件)
- `tools/voicepeak/voicepeak_lines_unique_phase2_weather.csv` (51 件)
- `tools/voicepeak/voicepeak_lines_unique_phase1_body.csv` (39 件)
- `tools/voicepeak/voicepeak_lines_unique_phase2_body.csv` (49 件)
- `tools/voicepeak/voicepeak_lines_unique_phase1_trivia.csv` (50 件)
- `tools/voicepeak/voicepeak_lines_unique_phase2_trivia.csv` (68 件)
- `tools/voicepeak/voicepeak_lines_unique_kurumi_dai1_5.csv` (5 件)

### 展開マッピング JSON (1 wav → 複数 q### への展開)

- `tools/voicepeak/voicepeak_unique_expand_order_color_phase1.json`
- `tools/voicepeak/voicepeak_unique_expand_order_color_phase2.json`
- `tools/voicepeak/voicepeak_unique_expand_count_total_phase1.json`
- `tools/voicepeak/voicepeak_unique_expand_count_total_phase2.json`
- `tools/voicepeak/voicepeak_unique_expand_shape_name_phase1.json`
- `tools/voicepeak/voicepeak_unique_expand_shape_name_phase2.json`
- `tools/voicepeak/voicepeak_unique_expand_number_sequence_phase1.json`
- `tools/voicepeak/voicepeak_unique_expand_number_sequence_phase2.json`
- `tools/voicepeak/voicepeak_unique_expand_opposite_phase1.json`
- `tools/voicepeak/voicepeak_unique_expand_opposite_phase2.json`
- `tools/voicepeak/voicepeak_unique_expand_weather_phase1.json`
- `tools/voicepeak/voicepeak_unique_expand_weather_phase2.json`
- `tools/voicepeak/voicepeak_unique_expand_body_phase1.json`
- `tools/voicepeak/voicepeak_unique_expand_body_phase2.json`
- `tools/voicepeak/voicepeak_unique_expand_trivia_phase1.json`
- `tools/voicepeak/voicepeak_unique_expand_trivia_phase2.json`
- `tools/voicepeak/voicepeak_unique_expand_kurumi_dai1_5.json`

### 展開スクリプト

- `tools/voicepeak/Expand-VoicepeakUniqueWavs.ps1` (連番 wav → 全 q###.wav 展開)
