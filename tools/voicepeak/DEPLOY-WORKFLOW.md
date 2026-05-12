# Quizland 問題本編音声 デプロイワークフロー

> **目的**: VOICEPEAK で生成したくるみちゃん声 wav (912 件) を `assets/tts/quiz/` に配置し、 `assets/tts/manifest.json` を自動生成して `common/narration.js` から再生可能にする。
>
> **関連 docs**:
> - 発注書: [docs/quizland-voicevox-order/ORDER-FULL.md](../../docs/quizland-voicevox-order/ORDER-FULL.md)
> - VOICEPEAK GUI 操作: [tools/voicepeak/README.md](./README.md)
> - 主軸変更経緯: [memory/feature_quizland_voicepeak_pivot.md](../../memory/feature_quizland_voicepeak_pivot.md)
> - くるみキャラ仕様: [memory/feature_quizland_kurumi.md](../../memory/feature_quizland_kurumi.md)

---

## 全体像

| 段階 | やる人 | 出力 |
|---|---|---|
| 1. wav 生成 | ユーザー (VOICEPEAK GUI) | `tmp/quizland_NA/<category>_expanded/q###_*.wav` |
| 2. 試聴 | ユーザー | OK / NG (NG なら辞書修正 + 再生成) |
| 3. 配置 + manifest 更新 | Claude (or ユーザー手動) | `assets/tts/quiz/q###_*.wav` + `assets/tts/manifest.json` 更新 |
| 4. sw.js バンプ + commit | Claude | sw v### → develop push → staging 自動反映 |

---

## 1. wav 生成 (VOICEPEAK)

カテゴリ別に Phase 1 (問題文 + 正解選択肢) → Phase 2 (不正解選択肢 3 件) を順次生成する。

```text
入力 CSV (例): tools/voicepeak/voicepeak_lines_unique_phase1_order_color.csv
↓ (VOICEPEAK GUI で CSV インポート + 「女性4」 プリセット選択)
出力 wav (例): D:\voicepeak_out\order_color_p1\001.wav, 002.wav, ...
↓ (Expand-VoicepeakUniqueWavs.ps1 でユニーク wav を q###_*.wav に展開)
展開先 (例): tmp/quizland_NA/order_color_expanded/q001_q.wav, q001_a.wav, ...
```

### Expand コマンド例

```powershell
cd d:\AppDevelopment\pono-asobiba-app
powershell -ExecutionPolicy Bypass -File tools\voicepeak\Expand-VoicepeakUniqueWavs.ps1 `
    -InputDir   "D:\voicepeak_out\order_color_p1" `
    -UniqueCsv  "tools\voicepeak\voicepeak_lines_unique_phase1_order_color.csv" `
    -ExpandJson "tools\voicepeak\voicepeak_unique_expand_order_color_phase1.json" `
    -OutputDir  "tmp\quizland_NA\order_color_expanded"
```

---

## 2. 試聴

ユーザーが展開先 (`tmp/quizland_NA/...`) の wav を聴いて以下を確認:

- 読み間違い / アクセントずれがないか
- ある場合 → `tools/voicepeak/voicepeak_user_dict.csv` を編集 → `Convert-VoicepeakUserDictCsvToVdc2.ps1` で `.vdc2` 再生成 → VOICEPEAK GUI で辞書再インポート → 該当 unique CSV を再生成
- 全 OK なら次の Step 3 へ

---

## 3. 配置 + manifest 自動生成

### 3-a. 一括: Deploy-VoicepeakWavs.ps1

展開済 wav を `assets/tts/quiz/` にコピーしつつ `assets/tts/manifest.json` を自動更新する：

```powershell
cd d:\AppDevelopment\pono-asobiba-app
powershell -ExecutionPolicy Bypass -File tools\voicepeak\Deploy-VoicepeakWavs.ps1 `
    -InputDir "tmp\quizland_NA\order_color_expanded"
```

主要オプション:

| オプション | 効果 |
|---|---|
| `-DryRun` | 実コピー / manifest 書き込みなしで試算のみ |
| `-NoOverwrite` | 既存 wav を上書きしない (デフォルトは上書き) |
| `-IncludeNonQuestion` | `q###_*.wav` 以外も copy (manifest 登録は対象外のまま) |
| `-SkipManifest` | コピーのみ (manifest 更新スキップ) |
| `-Verbose` | 詳細ログ |

### 3-b. manifest だけ再生成したい場合

例: 既に `assets/tts/quiz/` に手動配置済で、 manifest だけ作りなおす場合:

```powershell
cd d:\AppDevelopment\pono-asobiba-app
powershell -ExecutionPolicy Bypass -File tools\voicepeak\Build-NarrationManifest.ps1
```

### 冪等性

- 既存 entries は温存 (上書きしない)。
- 同じ key で値が異なる新規エントリが来た場合は **既存値温存 + 警告出力** のみ。
- 何度実行しても結果は同じ。

### 生成される manifest entry (例)

```json
{
  "version": 1,
  "voice": "Leda",
  "entries": {
    "quizland:order_color:0:q":  { "file": "quiz/q001_q.wav" },
    "quizland:order_color:0:a":  { "file": "quiz/q001_a.wav" },
    "quizland:order_color:0:b":  { "file": "quiz/q001_b.wav" },
    "quizland:order_color:0:c":  { "file": "quiz/q001_c.wav" },
    "quizland:order_color:0:d":  { "file": "quiz/q001_d.wav" },
    "quizland:body:15:a_alt":    { "file": "quiz/q160_a_alt.wav" }
  }
}
```

key 命名規則: `quizland:<category>:<idx>:<slot>`

- `<category>`: `order_color` / `count_total` / `shape_name` / `weather` / `opposite` / `trivia` / `body` / `number_sequence`
- `<idx>`: questions.js の各カテゴリ配列内 0-origin index (= ORDER-FULL.md 内の出現順)
- `<slot>`:
  - `q` = 問題文 (`q###_q.wav`)
  - `a` / `b` / `c` / `d` = 4 択選択肢 (`q###_a.wav` 等)
  - `a_alt` / `b_alt` = Q160 補足版のみ (`q160_a_alt.wav` / `q160_b_alt.wav`)

---

## 4. sw.js バンプ + commit + 自動 staging

```powershell
# AGENTS.md の CACHE_VERSION バンプ規約に従う
# (sw.js の CACHE_VERSION = 'v###' を +1)
# 例: v963 -> v964
git add assets/tts/manifest.json assets/tts/quiz/ sw.js
git commit -m "feat(quizland): デプロイ <category> wav <件数>件 + manifest 自動更新 (sw v###)"
# post-commit hook が develop に push → GitHub Actions が wrangler deploy --env staging
```

数十秒で `https://pono-asobiba-staging.ndw.workers.dev/quizland/` に反映される。

---

## くるみ第 1〜5 問目コール (kurumi_dai{1-5}mon.wav) の扱い

**SE 経路のみ運用 (manifest 登録なし) で確定。**

| 経路 | パス | 再生コード |
|---|---|---|
| SE_PATHS (現状運用) | `assets/audio/sfx/quiz/kurumi_dai{1-5}mon.wav` | `quizland/index.html` の `playSE('kurumi_dai' + N)` |
| Narration manifest | (登録しない) | — |

理由:
- すでに `SE_PATHS` 経路で問題開始時に再生する実装が完成している (sw v957+)
- Narration 経路にも登録すると **二重再生リスク** がある (例: 問題切替時に SE と Narration が同時に走る)
- ユーザー判断方針: 「(b) SE 経路のみ」 = 現状維持

`Deploy-VoicepeakWavs.ps1` は `kurumi_dai*mon.wav` を **デフォルトでスキップ** する (-IncludeNonQuestion で強制 copy 可だが、 builder 側でも常時 skip するため manifest には載らない)。

---

## 入力検証 / エラー診断

### Build-NarrationManifest.ps1 が出すサニティ警告

| 警告 | 原因 | 対処 |
|---|---|---|
| `WARN: category <cat>: ORDER-FULL.md N 件 vs questions.js M 件 不一致` | 発注書と実データのズレ | ORDER-FULL.md か questions.js のどちらかを正に揃える |
| `[skip] <name>: ファイル名規則 q###_<slot>.wav に合致しない` | 命名ミス (例: `q1_q.wav` = 3 桁ゼロパディングなし) | リネーム or expand 元の filename map を見直す |
| `[skip] <name>: Q### が ORDER-FULL.md にない` | Q番号が発注書未登録 | ORDER-FULL.md に追記が必要 |
| `WARN: N 件のキーで既存値と異なる新規値が来た` | manifest 内の同じ key に違う `file` を割り当てようとした | 既存値温存 (上書き禁止)。 意図したリネームなら手動で旧 entry を削除 |

### 期待される最終 entry 件数

| カテゴリ | 問題数 | 期待 entry 数 (q + abcd の 5 件 / 問) |
|---|---|---|
| order_color | 24 | 120 |
| count_total | 24 | 120 |
| shape_name | 23 | 115 |
| weather | 24 | 120 |
| opposite | 24 | 120 |
| trivia | 26 | 130 |
| body | 24 | 120 + alt 2 = 122 |
| number_sequence | 12 | 60 |
| **合計 (問題本編)** | **181** | **907** |

くるみ 5 件は manifest 対象外なので、 manifest に載るのは **最大 907 entries** (Phase 1+Phase 2 全完了時)。

---

## カテゴリ単位デプロイサイクル想定

```text
[1 サイクル = 1 カテゴリ × 1 フェーズ ≒ 数十〜120 件]
  VOICEPEAK 生成 → Expand → 試聴 → Deploy-VoicepeakWavs.ps1 → sw bump → commit → staging 確認
        ↓
     OK なら次のフェーズ or 次のカテゴリへ
```

8 カテゴリ × 2 フェーズ = **16 サイクル** で MVP 完成 (合計 907 件の問題本編音声配信)。

---

## ファイル一覧 (本ワークフロー追加分)

| ファイル | 役割 |
|---|---|
| `tools/voicepeak/_build_narration_manifest.py` | manifest.json の自動生成 / マージ (Python 本体) |
| `tools/voicepeak/Build-NarrationManifest.ps1` | 上記 Python helper の PowerShell ラッパ |
| `tools/voicepeak/Deploy-VoicepeakWavs.ps1` | wav copy + Build-NarrationManifest 呼び出し |
| `tools/voicepeak/DEPLOY-WORKFLOW.md` | 本ファイル |
