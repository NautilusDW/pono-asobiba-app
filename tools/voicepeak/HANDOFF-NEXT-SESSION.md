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
3. **§7 関連 memory ファイル** に列挙したファイルを順番に読む (とくに上位 5 本)
4. **§2 進捗マトリクス** で完了済 / 未着手カテゴリを把握
5. **§5 次バッチ (shape_name)** の手順書 [BATCH-RUN-shape_name.md](./BATCH-RUN-shape_name.md) を読んで着手

---

## 1. 現状の到達点 (2026-05-16 時点)

### 1.1 現行バージョン
- **sw v383** が現行 (= `quizland/sw.js` の `CACHE_VERSION = 'v383'`)
- 直近の大きな進捗:
  - **count_total (Q25-48) 完了 ← 今回 (sw v383)**: 個別 wav (「ひとつ / ふたつ / みっつ」 等の和語数え) を `q###_b/c.wav` として 48 件配置、 manifest 48 エントリ追加
  - 辞書 109 entries に拡張済 (count_total 用 5 語追加: りんご / いちご / おはな / おほしさま / みかん)

### 1.2 MVP スコープ
- **MVP = くるみ 181 問 (Q1-181)** + くるみ第1-5問目 5 件
- **博士 48 件** (HAKASE_DIALOGUE 全プール) は **MVP 後回し** (関連準備はすべて完了済で温存、 MVP リリース後に着手)

### 1.3 確定話者
- **くるみ全件 = VOICEPEAK 「女性4」** (2026-05-12 確定)
- **博士 = VOICEPEAK 「ナレーター おじいさん」** (秦なおき声、 ¥5,980 単体購入済、 MVP 後回し)
- **VOICEVOX 雨晴はう = 廃案** (履歴のみ memory 温存、 主軸は VOICEPEAK 一本化)
- **ポノ = 音声化保留** (babble のまま、 アイデンティティ確定までは AI 化しない)

---

## 2. 完了マトリクス (= 60/181 問 = 33% 完了)

Q### の真値は `quizland/js/questions.js` の CATEGORIES キー順 (恒久ルール、 [memory/feedback_questions_js_q_number_canonical_source.md](../../memory/feedback_questions_js_q_number_canonical_source.md) 参照)。

| カテゴリ | Q### 範囲 | 件数 | 配置 | manifest | 状態 |
|---|---|---|---|---|---|
| order_color | Q1-24 | 24 | q001-q024 | 48 エントリ | ✅ 完了 |
| count_total | Q25-48 | 24 | q025-q048 | 48 エントリ | ✅ **新規完了 (sw v383)** |
| shape_name | Q49-71 | 23 | — | — | 📋 準備完了 ([BATCH-RUN-shape_name.md](./BATCH-RUN-shape_name.md) / 出力先 `tmp/quizland_NA/shape_name/` 既存) |
| number_sequence | Q72-83 | 12 | q072-q083 | 24 エントリ | ✅ 完了 (2026-05-13) |
| trivia | Q84-109 | 26 | — | — | ⏳ 未着手 |
| weather | Q110-133 | 24 | — | — | ⏳ 未着手 |
| opposite | Q134-157 | 24 | — | — | ⏳ 未着手 |
| body | Q158-181 | 24 | — | — | ⏳ 未着手 |

合計: 配置済 wav = 60 問分 × 2 (q + b/c) + その他 = 計 95 件 / manifest 120 エントリ登録済 (= 48 + 48 + 24)

---

## 3. 辞書 (v109)

- ファイル: `d:\AppDevelopment\pono-asobiba-app\tools\voicepeak\voicepeak_user_dict.csv` = **109 entries**
- VDC2 再生成済: `d:\AppDevelopment\pono-asobiba-app\tools\voicepeak\voicepeak_user_dict.vdc2`
- 今回 (count_total) で追加した 5 語: りんご / いちご / おはな / おほしさま / みかん

### 3.1 shape_name 用辞書追加候補 22 語 (本タスクで事前追加せず、 試聴駆動で進める方針)
- 形名 (8): ハート / たまごがた / ひしがた / ダイヤ / はっぱ / ピザ / ノート / サッカーボール
- 助数詞合成 (4): ごこ / さんこ / よんこ / ぜろこ
- 疑問詞 (4): どんな / なんの / どれ / どちら
- その他 (6): かたち / かど / おおい / ぜんぶ / はんぶん / まんまるい

→ 全 22 語を事前追加せず、 まず 26 wav を VOICEPEAK で生成して試聴。 読み崩れがあった語だけ後で辞書追加して該当行を再書き出し、 という「試聴駆動」 で進める方針。

---

## 4. グローバル wav 設計

- `g_num_0.wav` 〜 `g_num_10.wav` (11 件、 数読み「いち / に / さん」 等) 配置済
- **number_sequence** の選択肢で動的マッピング利用中 (= 「に」 「さん」 等は g_num を再利用)
- **count_total** の選択肢は g_num では完結せず (= 「ひとつ / ふたつ / みっつ」 の和語数え)、 個別 wav を生成して `q###_b/c.wav` として配置済 (今回の作業)

---

## 5. 次バッチ = shape_name (準備完了、 次スレッドはここから着手)

### 5.1 設計
- ユニーク CSV 26 件: `d:\AppDevelopment\pono-asobiba-app\tools\voicepeak\voicepeak_lines_unique_phase1_shape_name.csv`
- 全展開 46 件 (`q049_q.wav` 〜 `q071_a.wav`)
- 出力先: `d:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\shape_name\` (空フォルダ作成済)
- 手順書: **[d:\AppDevelopment\pono-asobiba-app\tools\voicepeak\BATCH-RUN-shape_name.md](./BATCH-RUN-shape_name.md)** (165 行、 そのまま実行可能)

### 5.2 進行手順 (要約)
1. VOICEPEAK 起動 → 辞書 v109 (`voicepeak_user_dict.vdc2`) 再インポート
2. CSV インポート: `voicepeak_lines_unique_phase1_shape_name.csv` (26 件)
3. プリセット = **「女性4」** / 出力名 = `shape_name` / 連番 / 44100Hz
4. 出力先: `d:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\shape_name\`
5. 一括書き出し → 26 wav
6. **試聴** → 誤読あれば §3.1 候補語から辞書追加 → 再書き出し
7. `Expand-VoicepeakUniqueWavs.ps1` で q049-q071 (46 件) に展開
8. `Deploy-VoicepeakWavs.ps1` で配置 + manifest 更新
9. sw bump (v383 → v384) → commit (auto-commit hook が push、 GH Actions が staging deploy)

### 5.3 推奨進行順 (shape_name 以降)

1. ✅ order_color (完了)
2. ✅ count_total (完了)
3. ✅ number_sequence (完了)
4. **shape_name** ← 次回着手
5. weather
6. opposite
7. body
8. trivia (画像ベース + 多様な答え、 最後)

---

## 6. やってはいけないこと (反面教師、 過去の失敗から)

過去の sw v959〜v966 + 今回までの失敗から抽出した、 やってはいけないリスト。 必ず守ること。

### 6.1 「第N問」 関連
- **CSS で 「第N問」 バナーを新規作成しない** (= 既存 design system を破壊する、 v959 で誤実装 → v961 で削除済)
- **既存の `qno_plate_*.png` 画像をデフォルト消去しない** (kurumi 音声 ended まで表示延長済)

### 6.2 don 音関連
- **don.mp3 を別途再生しない** (kurumi mp3 内に内蔵で十分、 二重発火 NG、 v966 で修正済)
- **ユーザーの mp3 を上書きする時は事前に内容確認** (don 音内蔵等、 想定と違う可能性がある)

### 6.3 参照規律
- **「ID 単独で参照しない」** (恒久ルール、 [memory/feedback_restate_content_when_referring.md](../../memory/feedback_restate_content_when_referring.md))
- 例: 「q172」 「kurumi_clasp」 等の短縮 ID だけで言及せず、 必ず本文を併記

### 6.4 旧方針への退行禁止
- **VOICEVOX 関連を 「現行」 として扱わない** (廃案、 履歴のみ温存)
- **「女の子」 プリセットを採用案として提案しない** (試聴で却下済、 「女性4」 確定)
- **博士 48 件を MVP 内に含めない** (後回しで確定済)
- **ポノを AI 音声化しない** (babble のまま温存、 アイデンティティ確定待ち)

### 6.5 layout / 配置規律
- **`saved-layout.json` を手書き編集しない** (AGENTS.md §3 厳守)

---

## 7. 関連 memory ファイル (新スレッドで必読)

優先順 (上から順に読む):

1. **[d:\AppDevelopment\pono-asobiba-app\MEMORY.md](../../MEMORY.md)** インデックス全件 (まず読む)
2. **[d:\AppDevelopment\pono-asobiba-app\memory\feature_quizland_voicevox_order.md](../../memory/feature_quizland_voicevox_order.md)** — 発注書 3 本概要、 VOICEPEAK 化済
3. **[d:\AppDevelopment\pono-asobiba-app\memory\feature_quizland_voicepeak_pivot.md](../../memory/feature_quizland_voicepeak_pivot.md)** — 主軸変更経緯
4. **[d:\AppDevelopment\pono-asobiba-app\memory\feature_quizland_voicepeak_pivot_jyosei4.md](../../memory/feature_quizland_voicepeak_pivot_jyosei4.md)** — 「女性4」 確定
5. **[d:\AppDevelopment\pono-asobiba-app\memory\feature_voicepeak_cross_category_dedup.md](../../memory/feature_voicepeak_cross_category_dedup.md)** — cross-category dedup 設計
6. **[d:\AppDevelopment\pono-asobiba-app\memory\feedback_questions_js_q_number_canonical_source.md](../../memory/feedback_questions_js_q_number_canonical_source.md)** — Q### 真値は questions.js の CATEGORIES キー順
7. [d:\AppDevelopment\pono-asobiba-app\memory\feature_quizland_kurumi.md](../../memory/feature_quizland_kurumi.md) — くるみキャラ + sw v957-v966 実装履歴
8. [d:\AppDevelopment\pono-asobiba-app\memory\reference_voicepeak_voices_purchased.md](../../memory/reference_voicepeak_voices_purchased.md) — 購入ボイス一覧
9. [d:\AppDevelopment\pono-asobiba-app\memory\reference_voicepeak_vdc2_format.md](../../memory/reference_voicepeak_vdc2_format.md) — VDC2 仕様
10. [d:\AppDevelopment\pono-asobiba-app\memory\feature_quizland_hakase_dialogue_expansion.md](../../memory/feature_quizland_hakase_dialogue_expansion.md) — 【MVP 後回し】 博士セリフ
11. [d:\AppDevelopment\pono-asobiba-app\memory\feature_quizland_hakase_perfect_master_seal.md](../../memory/feature_quizland_hakase_perfect_master_seal.md) — 【MVP 後回し】 clear.perfect[2] 改修
12. **[d:\AppDevelopment\pono-asobiba-app\memory\feedback_restate_content_when_referring.md](../../memory/feedback_restate_content_when_referring.md)** — 「ID 参照時は本文併記」 恒久ルール

---

## 8. 主要な準備済リソース (一覧)

すべて `d:\AppDevelopment\pono-asobiba-app\tools\voicepeak\` 配下 (発注書のみ別パス)。

### 8.1 発注書 (全 8 カテゴリ分準備済)
- CSV: `voicepeak_lines_unique_phase1_<category>.csv` × 8
- CSV (Phase 2): `voicepeak_lines_unique_phase2_<category>.csv` × 8
- JSON (展開マッピング): `voicepeak_unique_expand_<category>_phase1.json` × 8 + Phase 2 × 8 + kurumi 1 = 計 17 個
- 8 カテゴリ = `body` / `count_total` / `number_sequence` / `opposite` / `order_color` / `shape_name` / `trivia` / `weather`

### 8.2 BATCH-RUN 手順書 (3 本完備)
- `BATCH-RUN-number_sequence.md` (完了済バッチの手順、 履歴温存)
- `BATCH-RUN-count_total.md` (今回完了したバッチの手順)
- `BATCH-RUN-shape_name.md` ← **次バッチ用、 そのまま実行可能**

### 8.3 辞書 (v109)
- `voicepeak_user_dict.csv` (109 entries)
- `voicepeak_user_dict.vdc2` (109 entries、 ラウンドトリップ検証 OK)

### 8.4 スクリプト
| ファイル名 | 用途 |
|---|---|
| `Convert-VoicepeakUserDictCsvToVdc2.ps1` | 辞書 CSV → VDC2 順方向変換 |
| `Convert-VoicepeakUserDictVdc2ToCsv.ps1` | 辞書 VDC2 → CSV 逆方向変換 (ラウンドトリップ検証用) |
| `Expand-VoicepeakUniqueWavs.ps1` | ユニーク wav を q### に展開コピー |
| `Build-NarrationManifest.ps1` | `manifest.json` 自動生成 |
| `Deploy-VoicepeakWavs.ps1` | wav copy + manifest 更新ワンライナー |

すべて UTF-8 with BOM、 `-ExecutionPolicy Bypass` 前提。

### 8.5 グローバル wav (配置済)
- `g_num_0.wav` 〜 `g_num_10.wav` (11 件、 数読み)

### 8.6 配置済 wav (合計 95 件)
- order_color: q001-q024 (48 件、 q + b/c)
- count_total: q025-q048 (48 件、 q + b/c) ← 今回追加
- number_sequence: q072-q083 (24 件、 q + b/c)
- くるみ第1-5問目: `assets\audio\sfx\quiz\kurumi_dai{1-5}mon.mp3` (5 件、 mp3 / don 内蔵)

### 8.7 manifest
- `manifest.json`: **120 エントリ登録済** (= 48 + 48 + 24)

---

## 9. デプロイメモ (再確認)

詳細は [d:\AppDevelopment\pono-asobiba-app\CLAUDE.md](../../CLAUDE.md) / [d:\AppDevelopment\pono-asobiba-app\AGENTS.md](../../AGENTS.md) を参照。

- **このプロジェクトは Cloudflare Workers で配信**。 Netlify は完全廃止済 (= 二度と言及しない)
- `git commit` するだけで staging に反映 (post-commit hook が develop を auto push → GH Actions が `wrangler deploy --env staging`)
- staging URL: `https://pono-asobiba-staging.ndw.workers.dev/`
- production URL: `https://pono.kodama-no-mori.com/` (= ユーザーが 「本番にデプロイして」 と明示した時のみ master merge)
- **絶対に勝手に master へマージしない**
- 各バッチ完了後は **sw bump 必須** (CACHE_VERSION を v383 → v384 → ... に上げる、 AGENTS.md sw バンプ規約厳守)

---

## 10. 連絡事項 / オープン質問

- shape_name バッチ完了後、 残 4 カテゴリ (weather / opposite / body / trivia) の進行順は §5.3 推奨順を採用する想定。 ユーザー方針変更があれば §2 マトリクス + §5.3 を更新
- 博士 48 件を MVP に入れたい等の方針変更があれば §1.2 / §2 を更新

---

最終更新: 2026-05-16 (sw v383 / count_total 完了直後)
作成者: Claude (Opus 4.7)
