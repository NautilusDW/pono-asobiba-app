---
name: Quizland Question Revision & Illustration Delivery Pipeline
description: クイズ問題の見直し→Codexへのイラスト発注→納品→配置の全工程の真実の源 (HANDOFF.md / CODEX-ORDER.md / content-revision.md)。アセット差し替え依頼を受けた時の最初の参照点。
type: reference
---

# Quizland Question Revision & Illustration Delivery Pipeline

**最終確認:** 2026-05-08
**Type:** Reference — 工程の真実の源マップ

---

## なぜこの memory が必要か

ユーザから「`tmp/alpha_pending/...` に新画像があるので差し替えて」と指示された時、画像のファイル名 (`レイヤー 0_*_001.png`) は中身を語らない。

**過去の失敗 (このセッション):** 視覚で被写体だけ確認して「うさぎ顔だから `stage_trivia_rabbit.png` に上書き？」と勝手に推定し、ユーザに「ちゃんと記録があるはず」と叱られた。実際には:

- 問題の改訂内容は `quizland/data/_review/content-revision.md` に**全行記録済み**
- 画像の発注書は `tmp/quizland-*-audit/CODEX-ORDER.md` に**ファイル名・SAFE 仕様まで明記**
- 納品の往復ログは `HANDOFF.md` の Active セクションに**バッチ番号 + 日付付きで時系列記録**

→ アセット差し替え依頼を受けたら **まず `HANDOFF.md` Active セクションを読み、関連 batch:NN を探す** のが正解。

## 真実の源マップ（参照順）

### 1. `HANDOFF.md` (リポジトリルート) — 最初に読む

Claude ⇄ Codex の共有メモ。`## Active (進行中 / 未着手)` セクションに最近のバッチが時系列で並ぶ:

```
- 2026-MM-DD - [batch:NN-name] Codex/Claude: action description (by ...)
```

**バッチ番号** (`batch:11`, `batch:12` 等) でグループ化されている。各バッチは:
- 発注 → raw 納品 → user フィードバック → variant 追加 → 最終配置 という時系列でエントリが並ぶ
- 同じ `batch:NN` のエントリを上から順に読めば工程が分かる

**配置先 tmp パス**は `tmp/alpha_pending/<番号>/` または `tmp/alpha_pending/alpha/<番号>/`:
- `<番号>/` = Codex raw 納品 (生成 PNG、白背景・alpha なし等)
- `alpha/<番号>/` = user が PSD で切り抜き済の最終 RGBA

### 2. `tmp/quizland-*-audit/CODEX-ORDER.md` — 発注書本体

例: `tmp/quizland-trivia-audit/CODEX-ORDER.md` (batch:12 用)

各イラストごとに:
- ファイル名 (例: `stage_shape_soccerball.png`)
- 用途 (どの問題用)
- ペアになる reveal 画像 (あれば)
- 構図・色・SAFE エリア仕様
- 外周ぼかし要否
- 保存先パス (`assets/images/quizland/illust/stage/...`)

**ファイル名がそのまま配置先のファイル名になる**ので、`tmp/alpha_pending/alpha/NN/` の生成順 (timestamp) と CODEX-ORDER.md の発注順を突合すれば 1:1 マッピングが復元できる。

### 3. `quizland/data/_review/content-revision.md` + `content-revision-review.md`

問題そのものの改訂記録 (新規追加 / 修正 / 削除)。

- 例: Q132 「ノートの かたちは？ 答え=しかく」 (新規追加)
- 例: Q133 「サッカーボールの かたちは？ 答え=丸」 (新規追加)
- 例: 「うれた バナナは なにいろ？」 (旧「じゅくすると」から表記修正)

`content-revision-review.md` には reviewer Claude の APPROVED 判定がある。これら改訂が反映された結果が `quizland/data/questions.js`。

### 4. `quizland/data/_review/illustration-needs-by-question.md`

168 問それぞれにステージ絵・選択肢絵が必要かのマトリクス。一部は「文字だけで OK」。

### 5. `quizland/data/_review/content-audit-kindergarten.md`

幼稚園児向け改訂監査の根拠資料。なぜ問題を消した・追加したかの理由付き。

## 標準ワークフロー

新しい画像バッチを受け取った時の手順:

1. **`HANDOFF.md` の Active セクションを読む** → 該当 batch:NN を見つける
2. その batch の発注 entry を上から下へ追う → どの問題のどの画像かを特定
3. `tmp/quizland-*-audit/CODEX-ORDER.md` に飛んで保存先ファイル名を確認
4. variant 採否 (例: `_face_crop`, `_side_pass`) を user フィードバック entry から判定
5. アセット agent に変換 + 配置を依頼:
   - 1280×720 box 内に Lanczos リサイズ
   - RGBA 保持 (透過 PNG)
   - PIL `optimize=True`
   - 配置先: `assets/images/quizland/illust/stage/<filename>.png`
6. `HANDOFF.md` に「Claude: 配置完了」のエントリを追加
7. `sw.js` の CACHE_VERSION をバンプ
8. commit (auto-push で staging に反映)

## 既知のバッチ (2026-05-08 時点)

| batch | 説明 | 状態 |
|---|---|---|
| 07 | zukan search backgrounds (`leaf_glow_forest_field_16x9.png` 等) | 配置済 |
| 10 | quizland-start-card フレーム (4:3 / 1:1 / 横長 raw) | tmp/10/ に納品済、配置は別途 |
| 11 | quizland-forest-house-21x9 (OP_BG.webp の 21:9 高解像度版) | 配置済 (2026-05-07) |
| 12 | quizland-trivia-stage 6 枚 (soccerball / unripe_banana / rabbit_no_ears / speed_dust / notebook / munching) + 2 variant (_face_crop / _side_pass) | 配置済 (2026-05-08) |

## ピットフォール

- ❌ 画像ファイル名 (`レイヤー 0_*_001.png`) から中身を推測しない — タイムスタンプ順で並んでいるだけで意味的順序ではない場合がある (実際は CODEX-ORDER 順と一致するが視覚で確認必須)
- ❌ 既存 `stage/*.png` への上書きを焦らない — variant 採用 (`_face_crop`, `_side_pass`) で別ファイル名にすることが多い
- ✅ 必ず CODEX-ORDER.md の保存先パスをそのまま使う
- ✅ `HANDOFF.md` の往復ログで variant 採否を確認してから書き出す
