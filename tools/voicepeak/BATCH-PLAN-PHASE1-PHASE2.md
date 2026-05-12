# VOICEPEAK 録音バッチ計画 (Phase 1 + Phase 2 / カテゴリ別)

> 作成: `tools/voicepeak/_build_phase12_by_category.py` 自動生成
>
> 出典: `docs/quizland-voicevox-order/ORDER-FULL.md` (907 件) + くるみ第 1〜5 問目コール 5 件
>
> CSV フォーマット: 1 列目固定 `女性4` (2026-05-12 確定、 旧 「女の子」 中継案は試聴の結果却下 → 「女性4」 へ再差替、 詳細は [memory/feature_quizland_voicepeak_pivot_jyosei4.md](../../memory/feature_quizland_voicepeak_pivot_jyosei4.md))、 2 列目 speech、 ヘッダなし、 UTF-8 (BOM なし)、 CRLF。 既存 `voicepeak_lines_test27.csv` 準拠 (CSV 自体のナレーター名置換は別 Agent が並列実施中)。

## 方針サマリ (2026-05-12 ユーザー指示)

- バッチ単位は **カテゴリ別** (8 カテゴリ + くるみ)
- **Phase 1** = 問題文 (`q###_q`) + **正解選択肢 1 件**。 まずここを優先生成・試聴 → 辞書追加 → 次バッチ。
- **Phase 2** = 不正解選択肢 3 件。 Phase 1 が落ち着いた後にまとめて生成。
- くるみ第 1〜5 問目 (5 件) は別バッチで先行生成 (Phase 1 と並列で OK)。
- Q160 補足版: 正解 = A → `q160_a_alt` (= 「ぞうきの はい」) は **Phase 1**、 `q160_b_alt` (= 「いぶくろの い」) は **Phase 2** に振り分け済。

## Phase 1 件数表 (q + 正解 + くるみ)

| カテゴリ | 問題数 | Phase 1 件数 (q + 正解) |
|---|---:|---:|
| order_color | 24 | 48 |
| count_total | 24 | 48 |
| shape_name | 23 | 46 |
| number_sequence | 12 | 24 |
| opposite | 24 | 48 |
| weather | 24 | 48 |
| body | 24 | 49 |
| trivia | 26 | 52 |
| くるみ第 1〜5 問目 | 5 | 5 |
| **合計** | **186** | **368** |

## Phase 2 件数表 (不正解 3 件 / 問)

| カテゴリ | 問題数 | Phase 2 件数 (不正解) |
|---|---:|---:|
| order_color | 24 | 72 |
| count_total | 24 | 72 |
| shape_name | 23 | 69 |
| number_sequence | 12 | 36 |
| opposite | 24 | 72 |
| weather | 24 | 72 |
| body | 24 | 73 |
| trivia | 26 | 78 |
| **合計** | **181** | **544** |

## 全件検算

- Phase 1 (本編 q + 正解): 363
- Phase 1 (くるみ): 5
- Phase 2 (不正解): 544
- **合計**: 363 + 544 + 5 = **912**
- 期待値: 907 (本編) + 5 (くるみ) = **912** OK

## 推奨試聴順 (Phase 1)

件数の少ないカテゴリから始めて、 辞書追加・パラメータ微調整を素早く回す方針。

1. **くるみ 第 1〜5 問目 (5 件)**: 単純な定型句、 speech は漢数字統一 (「第一問」 〜 「第五問」)、 「だいいちもん〜だいごもん」 の数字読みだけ確認すれば足りる。 ここでくるみプリセットの基本パラメータを最終確定。
2. **number_sequence (24 件)**: 12 問 × 2、 数字 1〜10 + 「つぎ / まえ / あいだ」 のみで語彙が極小。 「いち〜じゅう」 の音読み統一の効きを早期に確認。
3. **order_color (48 件)**: 24 問 × 2、 色名 (あか/あお/きいろ/みどり/ピンク/オレンジ/むらさき/みずいろ) と 「ひだり/みぎから N ばんめ」 のみ。 似た語が多いのでアクセント差の確認に最適。
4. **count_total (48 件)**: 24 問 × 2、 和語数詞 (ひとつ〜ここのつ + じゅっこ) の発音確認。 number_sequence の音読みと比較しやすいタイミングで実施。
5. **shape_name (46 件)** → **weather (48 件)** → **body (49 件)** → **opposite (48 件)** → **trivia (52 件)**: 語彙が増えるので、 辞書 (75 語) を一通り効かせた状態で長文を試聴。 特に opposite はカギ括弧除去の効きを、 trivia は固有名詞 (チーター / ジンベイザメ / フラミンゴ etc.) の読みを重点確認。

## 推奨ワークフロー (1 バッチあたりのサイクル)

```
[1] CSV を VOICEPEAK GUI にインポート
    - voicepeak_lines_phase1_<category>.csv
    - 1 行 = 1 セリフとして取り込み
[2] 全行を一括書き出し (連番 wav)
[3] 連番 wav → q###_X.wav にリネーム
    - voicepeak_filename_map_phase1_<category>.json を参照
[4] 試聴 → 読み崩れがあればユーザー辞書 (voicepeak_user_dict.csv) を更新
    - csv 編集 → Convert-VoicepeakUserDictCsvToVdc2.ps1 で .vdc2 化
    - VOICEPEAK GUI でユーザー辞書を再インポート
[5] 該当行のみ再生成 → リネーム → 上書き
[6] OK なら次のカテゴリへ
```

Phase 2 は Phase 1 で確定したプリセット + 辞書をそのまま流用するだけなので、
カテゴリ別に分けてあるが連続で 8 カテゴリ一気に回しても OK。

## 生成ファイル一覧

### Phase 1 (9 ファイル × 2 = 18 ファイル)

- `tools/voicepeak/voicepeak_lines_phase1_order_color.csv` + `voicepeak_filename_map_phase1_order_color.json`
- `tools/voicepeak/voicepeak_lines_phase1_count_total.csv` + `voicepeak_filename_map_phase1_count_total.json`
- `tools/voicepeak/voicepeak_lines_phase1_shape_name.csv` + `voicepeak_filename_map_phase1_shape_name.json`
- `tools/voicepeak/voicepeak_lines_phase1_number_sequence.csv` + `voicepeak_filename_map_phase1_number_sequence.json`
- `tools/voicepeak/voicepeak_lines_phase1_opposite.csv` + `voicepeak_filename_map_phase1_opposite.json`
- `tools/voicepeak/voicepeak_lines_phase1_weather.csv` + `voicepeak_filename_map_phase1_weather.json`
- `tools/voicepeak/voicepeak_lines_phase1_body.csv` + `voicepeak_filename_map_phase1_body.json`
- `tools/voicepeak/voicepeak_lines_phase1_trivia.csv` + `voicepeak_filename_map_phase1_trivia.json`
- `tools/voicepeak/voicepeak_lines_kurumi_dai1_5.csv` + `voicepeak_filename_map_kurumi_dai1_5.json`

### Phase 2 (8 ファイル × 2 = 16 ファイル)

- `tools/voicepeak/voicepeak_lines_phase2_order_color.csv` + `voicepeak_filename_map_phase2_order_color.json`
- `tools/voicepeak/voicepeak_lines_phase2_count_total.csv` + `voicepeak_filename_map_phase2_count_total.json`
- `tools/voicepeak/voicepeak_lines_phase2_shape_name.csv` + `voicepeak_filename_map_phase2_shape_name.json`
- `tools/voicepeak/voicepeak_lines_phase2_number_sequence.csv` + `voicepeak_filename_map_phase2_number_sequence.json`
- `tools/voicepeak/voicepeak_lines_phase2_opposite.csv` + `voicepeak_filename_map_phase2_opposite.json`
- `tools/voicepeak/voicepeak_lines_phase2_weather.csv` + `voicepeak_filename_map_phase2_weather.json`
- `tools/voicepeak/voicepeak_lines_phase2_body.csv` + `voicepeak_filename_map_phase2_body.json`
- `tools/voicepeak/voicepeak_lines_phase2_trivia.csv` + `voicepeak_filename_map_phase2_trivia.json`

### 計画ドキュメント

- `tools/voicepeak/BATCH-PLAN-PHASE1-PHASE2.md` (本ファイル)
- `tools/voicepeak/BATCH-RUN-number_sequence.md` (number_sequence Phase 1 の具体実行手順 + 辞書 v80 への +1 語 (「ろく」) 追加履歴 + 特有の試聴ポイント)

**合計**: 18 (Phase 1) + 16 (Phase 2) + 1 (計画 md) = **35 ファイル**

## ユニーク化ワークフロー (2026-05-12 追加)

912 件のうち 「あか / あお / きいろ / ふたつ / まる / ...」 など **同じ speech** が
複数の問題で繰り返し登場する。 これを全件 VOICEPEAK で生成すると無駄なので、
カテゴリ × フェーズ単位で重複排除した unique CSV を VOICEPEAK にかけ、
出力 wav を **コピー展開** で全 q###_*.wav に増殖させる方式を導入する。

- 採用方針: **(a) カテゴリ × フェーズ単位 独立 unique 化** (試聴フローを既存と同形に維持)
- 実件数: 912 → **515** (43.5% 削減) ※詳細は `DUPLICATE-ANALYSIS.md` 参照
- 参考: フル横断 unique 化なら 912 → 426 (53.3% 削減) だが試聴/振り分けが煩雑

### 関連ファイル

- `tools/voicepeak/_build_unique_csvs.py` (生成スクリプト)
- `tools/voicepeak/DUPLICATE-ANALYSIS.md` (重複分析レポート)
- `tools/voicepeak/voicepeak_lines_unique_phase{1,2}_<category>.csv` (17 個)
- `tools/voicepeak/voicepeak_lines_unique_kurumi_dai1_5.csv` (1 個)
- `tools/voicepeak/voicepeak_unique_expand_<category>_phase<N>.json` (17 個 + 1 kurumi)
- `tools/voicepeak/Expand-VoicepeakUniqueWavs.ps1` (展開スクリプト, ASCII-only)

### 1 バッチあたりの実行手順 (unique 版)

```
[1] CSV を VOICEPEAK GUI にインポート
    - voicepeak_lines_unique_phase<N>_<category>.csv (重複排除済 = 件数最少)
    - 1 行 = 1 セリフとして取り込み
[2] 全行を一括書き出し
    - 出力ファイル名は連番 (001.wav, 002.wav, ...) 推奨
    - 順序は CSV の行順と一致させる (VOICEPEAK の標準動作)
[3] 展開スクリプトで unique wav → 全 q###_*.wav にコピー展開
    powershell.exe -ExecutionPolicy Bypass `
        -File tools\voicepeak\Expand-VoicepeakUniqueWavs.ps1 `
        -InputDir   <unique 出力フォルダ> `
        -UniqueCsv  tools\voicepeak\voicepeak_lines_unique_phase1_<cat>.csv `
        -ExpandJson tools\voicepeak\voicepeak_unique_expand_<cat>_phase1.json `
        -OutputDir  <展開先フォルダ>
[4] 展開後の q###_*.wav 群を試聴 (既存ワークフローと同じ感覚)
[5] 読み崩れあり → ユーザー辞書 (voicepeak_user_dict.csv) を更新
    - csv 編集 → Convert-VoicepeakUserDictCsvToVdc2.ps1 で .vdc2 化
    - VOICEPEAK GUI でユーザー辞書を再インポート
[6] 該当 unique CSV をもう一度 VOICEPEAK で書き出し → 展開スクリプト再実行
    (= 1 wav 修正で複数 q### に自動反映、 試聴コスト * N → * 1)
[7] OK なら次のカテゴリへ
```

### 注意

- **既存 phase{1,2}_*.csv / kurumi_dai1_5.csv / 各 map JSON は温存** (一切触らない)
- unique 化は並列配置 (新ファイル名) で、 既存ワークフローを壊さず併用可
- speech 本文は無改変 (バイト一致での重複判定のみ)
