# VOICEPEAK 実行手順: order_color Phase 2 (= 不正解選択肢、 manifest 動的参照方針へ転換)

> 親計画: [BATCH-PLAN-PHASE1-PHASE2.md](./BATCH-PLAN-PHASE1-PHASE2.md)
>
> **方針転換 (2026-05-17)**: 当初は phase2 を 8 件 TTS 生成する予定だったが、 8 色名のうち 7 色 (赤 / 青 / 黄色 / 緑 / ピンク / オレンジ / 紫) は phase1 で既に正解 wav として生成済みであることが判明。 そのため **count_total phase2 と同じく manifest 動的参照方式に転換** し、 71/72 件は既存 phase1 wav を再利用、 残る「みずいろ」 1 件のみ後回しとした。
>
> 結果: TTS 生成は不要 → manifest 編集 71 件のみで完結 (= みずいろ 1 件 = Q15_c は他カテゴリの新規 TTS バッチと同時生成予定)
>
> ユニーク件数 (理論上): **8 件** (8 色名: 赤 / 黄色 / 緑 / 青 / ピンク / オレンジ / 紫 / みずいろ)
> 全件展開数: 24 問 × 3 不正解選択肢 = **72 ファイル** のうち、 **71 件 = manifest 動的参照** + **1 件 (みずいろ) = pending**

## 前提

- VOICEPEAK 起動 **不要** (= 本バッチは manifest 編集のみ、 TTS 生成なし)
- 既存辞書 v109 は触らない
- 既存 phase1 wav (= `assets/tts/quiz/q001_a〜q024_a` 等の正解 wav 24 件) は触らない

## 色名 → phase1 wav 代表マッピング

各色名で「再利用元」 となる phase1 wav (= 別問題の正解 wav)。 questions.js の order_color 全 24 問を読み、 各正解 wav が発話する色名を逆引きしたうえで、 色名ごとに最初に出現する正解 wav を代表に選定。

| 色名 | 代表 wav (phase1) | 同色名の利用可能 wav 一覧 (参考) |
|---|---|---|
| 赤 | `q003_a.wav` (Q3 正解) | q003_a, q016_b, q019_c, q022_a |
| 青 | `q001_b.wav` (Q1 正解) | q001_b, q005_b, q018_a |
| 黄色 | `q004_c.wav` (Q4 正解) | q004_c, q009_b, q010_c, q011_b, q014_c, q021_c, q024_a |
| 緑 | `q002_d.wav` (Q2 正解) | q002_d, q012_a, q017_c |
| ピンク | `q007_c.wav` (Q7 正解) | q007_c, q013_b |
| オレンジ | `q006_a.wav` (Q6 正解) | q006_a, q008_a, q015_b, q020_b |
| 紫 | `q023_c.wav` (Q23 正解) | q023_c |
| みずいろ | **pending (後回し)** | (= phase1 で正解として登場ゼロ) |

> 注意: 元の発注計画では「紫=q016_b」 となっていたが、 Q16 answer=1, choices=['purple','red','yellow','green'] のため q016_b は実は **赤** の wav。 同様に「ピンク=q006_a」「オレンジ=q008_a」 も誤りで、 questions.js を Read で確認した結果を真値として上表を採用。

## Step 1: manifest 編集 (= 71 エントリ動的参照を追加)

`assets/tts/manifest.json` に以下 71 件を追加 (= `quizland:order_color:N:a/b/c/d` の不正解 suffix のみ、 既存 48 件の `q` / 正解 suffix とは衝突しない):

色名別件数:
- 赤: 13 件 → 全て `quiz/q003_a.wav` 参照
- 青: 16 件 → 全て `quiz/q001_b.wav` 参照
- 黄色: 13 件 → 全て `quiz/q004_c.wav` 参照
- 緑: 14 件 → 全て `quiz/q002_d.wav` 参照
- ピンク: 6 件 → 全て `quiz/q007_c.wav` 参照
- オレンジ: 5 件 → 全て `quiz/q006_a.wav` 参照
- 紫: 4 件 → 全て `quiz/q023_c.wav` 参照
- みずいろ: 1 件 → **manifest に追加せず pending** (= Q15_c = `quizland:order_color:14:c`)

合計: 71 件 manifest 追加 + 1 件 pending = 72 件カバー

実装手順 (= 既に本バッチで実行済):

1. 既存 manifest を読み込み (= 既存 48 件の order_color エントリは保持)
2. questions.js から 24 問の `answer` + `choices` を再構築
3. 各問題で不正解 3 suffix を抽出し、 色名を逆引き
4. 色名 → 代表 wav マッピングで manifest にエントリ追加
5. みずいろ (= cyan) はマッピングに `None` を入れて skip
6. 既存と同じ alphabetical sort で書き戻し (CRLF, BOM なし、 末尾改行維持)

検証:
- 追加: 71 件 (= 期待値と一致)
- 既存衝突: 0 件
- pending: 1 件 (= `quizland:order_color:14:c`)
- 総 order_color エントリ数: 48 (既存) + 71 (新規) = 119 件 (= 全 24 問 × 4 suffix - みずいろ 1 件 = 119 + q 24 件 含めても矛盾なし: 24 問 × 4 suffix = 96, + 24 q キー = 120, - みずいろ 1 = 119 ✓)

## Step 2: みずいろ (Q15_c) の後送り計画

`quizland:order_color:14:c` = みずいろ。 manifest にエントリ追加せず、 アプリ側は manifest miss でフォールバック (= text-to-speech 即時生成 or 無音) になる。 後送りで以下のいずれかで対応:

1. **他カテゴリ TTS バッチに混ぜる**: shape_name phase2 等の次バッチ実行時に CSV に「みずいろ。」 1 行を追加して同時書き出し → 1 件だけ `q015_c.wav` として配置 → manifest 追加
2. **専用ミニバッチ**: 「みずいろ。」 1 行のみの CSV で VOICEPEAK 起動 → 書き出し → 配置 → manifest 追加 (= 単独実行コストが高い)

推奨は **1 番** (= 他バッチの「ついで」 で生成)。

辞書カバレッジ: 既存 v109 で `みずいろ/ミズイロ/0` (L11) 登録済のため、 みずいろ生成時は辞書追加不要。

## 注意

- 既存 phase1 wav (= q001-q024 の正解 wav 24 件) は **本タスクで再生成しない、 完全に温存**
- 既存 manifest の order_color 48 件 (= 各 `q` + 各正解 suffix) は **触らない、 追加のみ**
- `quizland/data/questions.js` / `quizland/index.html` / `saved-layout.json` も触らない
- 他カテゴリの manifest も触らない
- 辞書 (`voicepeak_user_dict.csv` / `.vdc2`) も触らない
- `voicepeak_lines_unique_phase2_order_color.csv` は **8 行温存** (= 将来「みずいろ」 を拾える形を保持、 ただし phase2 で TTS 生成するのは「みずいろ。」 1 件のみと明示)
- `voicepeak_lines_phase2_order_color.csv` (72 行) は **温存** (= history として保持、 本タスクでは無参照)
- `voicepeak_unique_expand_order_color_phase2.json` は **温存** (= みずいろ後送り時にエントリ参照される)
- `voicepeak_filename_map_phase2_order_color.json` は **温存**
- sw.js の `CACHE_VERSION` を本タスクで +1 (= manifest 変更を新キャッシュで配信させる)

## ロジック背景

count_total phase2 (= sw v420) で確立した「manifest 動的参照で TTS 不要」 パターンを order_color に拡張した形。 count_total は g_num_*.wav (= 数読みグローバル wav) を流用したが、 order_color は phase1 で既に色名 wav を全色生成済みのため、 別問題の正解 wav をそのまま不正解選択肢に流用できる構造になっていた。

色名は文脈に依存しない単独短語 (= 「赤。」「青。」 等の 1-3 モーラ) のため、 別問題の正解 wav を不正解選択肢として再利用しても発音品質に問題は出ない。 phase1 で確立した「答え末尾句点」 方針もそのまま継承される (= 既存 wav 自体が句点付きで生成済)。

## 副作用と懸念点

1. **「みずいろ」 fallback**: manifest miss 時のアプリ挙動 (= text-to-speech 即時生成 or 無音) は `quizland/index.html` の narration 系コードに依存。 もし即時 TTS フォールバックがなく無音になる場合、 Q15_c (= 紫 / オレンジ / みずいろ / 赤 の不正解 1 つ) のチップタップ時のみ無音になる。 後送り (= ミニバッチで「みずいろ。」 単独生成) で解消可能。

2. **正解 wav の音質バラツキ**: 例えば「赤」 は q003_a, q016_b, q019_c, q022_a の 4 つから 1 つ (= q003_a) を選んでいるが、 ファイルサイズ・bytes 数で品質判定はしていない (= 最初に出現する正解 wav を機械的に選定)。 試聴で違和感があれば代表 wav を別の同色名 wav に差し替え可能 (= manifest の `file` フィールドの一括置換のみで対応)。

3. **「水色」 漢字化と将来計画**: 当初の `voicepeak_lines_unique_phase2_order_color.csv` には「みずいろ。」 とカナで記載されていた (= 「水色 → ミズショク」 誤読リスク回避方針)。 みずいろ単独 TTS 生成時もカナ維持を継承する。

## 関連メモリ更新

- [[feature-quizland-voicepeak-progress]] の phase2 進捗マトリクスで order_color の方式を「TTS → dynamic」 に更新、 状態を「準備完了 → 完了 (pending: みずいろ 1 件)」 に更新
- count_total と並んで「manifest 動的化で TTS 不要」 の事例として記録
