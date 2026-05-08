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

## 🚨 画像発注前の必須チェック (ユーザ指示 2026-05-08)

新規画像の Codex 発注書を書く / 既存画像を差し替える前に、**必ず以下 2 点を最初に確認**:

### 1. 参照画像の有無 (priority 1, MUST check first)

- 「reveal pair の出題用」のように、ペアになる既存画像があるなら、**Codex に参照添付して同じ背景・構図で生成させる**
- これを怠ると背景・画角がバラバラになり、reveal 切替時に子供が混乱する (実例: 2026-05-08 タネ問題で発覚)
- 発注書には必ず `参照画像 (必須): assets/images/quizland/illust/stage/<ref>.png を添付` の行を入れる

### 2. 既存類似画像の有無 (priority 2, MUST check second)

- 別の問題用に既に作られた画像で**ほぼ同じシーン**のものがないか必ず探す
- 探す範囲: `assets/images/quizland/illust/stage/`, `choice/`, `_sheets/`, それ以外の関連フォルダ
- 見つかった場合、ユーザに 2 択を提案:
  - **(a) そのまま流用する**: 新規発注スキップ
  - **(b) 参考画像として Codex に添付して新規生成**
- 実例: 2026-05-08 ミミズ問題の出題用 → 既存 `stage_weather_puddle.png` (泥+水たまり) で完全代用可能と判明

### 違反した場合のコスト

- 参照なし発注 → 背景バラバラの reveal pair → 再生成 = Codex API コスト + 時間ロス
- 重複発注 → 既存画像と機能重複した新画像 → アセット汚染 + 容量増加 + 管理負担

### 標準フロー (発注書ドラフト前に毎回)

```
1. 該当問題の reveal pair 用 reveal 画像が既に存在するか? → 存在すれば参照添付指示を発注書に明記
2. assets/images/quizland/illust/ 全体で similar scene を grep / glob / 視覚確認
3. 発注書に「参照画像 (必須)」行 + 「既存流用検討結果」を記録
4. 必要があればユーザに代替案を提示してから発注書確定
```

このルールは **Codex 発注 / 画像差替 / 新規アセット追加すべて**に適用される。

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

0. **参照画像確認**: 該当問題に既存 reveal 画像 (or 関連画像) があるか確認 → あれば発注書に「参照画像 (必須)」行を追加
0.5. **既存類似画像確認**: assets/images/quizland/illust/ 全体で「同じシーン / 機能で代用可能な既存画像」を視覚的に探す → あれば流用 or 参考画像として活用
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
| 12 | quizland-trivia-stage 6 枚 (soccerball / unripe_banana / rabbit_no_ears / speed_dust / notebook / munching) + 2 variant (_face_crop / _side_pass) | 配置済 (2026-05-08)、questions.js 結線済 (2026-05-08) |
| 13 (sprint-13) | キリン全身 + 首骨 / 虹再生成 / 葉っぱ / ピザ4切れ / 赤ちゃん歯生え変わり / ライオンオスシルエット + オス・メス比較 + きば + ひげタイル | `tmp/quizland-trivia-audit/CODEX-ORDER-2.md` に発注書、未納品 |
| 14 (sprint-14) | spoiler 修正用ステージ絵 15-19 枚 (HARD spoiler 18 問対応) | **15 枚配置済 + questions.js 結線済 (2026-05-08)**。残: A6 虫シルエット集合 (#81/#93 待ち) + B4 ぼかし雪粒 (#121 未届) |

## リビールペア (img / img_word / img_answer) 設計パターン

ネタバレ防止のために 2 段階画像切替えを使う問題が増えた。スキーマ:

```js
{
  img:        '<出題時の画像、答えがバレない>',     // 必須
  img_word:   '<同上、img の別名>',                  // 互換のため設定推奨
  img_answer: '<正解後の画像、答えを明示>',         // optional、無ければ img のまま
  q: '...', answer: N, choices: [...]
}
```

- **`img` (出題時)**: 答えを示唆しない伏せ画像。例: 「うれた バナナは なにいろ？」の出題は **緑バナナ**、「速い動物」は **砂煙のみ**
- **`img_answer` (正解後)**: 答えを明示する画像。例: 黄色バナナ、走るチーター
- 「正解後に絵が切り替わる」演出で、子供は答えを聞いた後にビジュアルでも納得できる
- レンダラ側は `quizland/index.html` line 4053 付近で `q.img_answer` の有無を見て切替

### 採用済みリビールペア (2026-05-08 時点、計 20 ペア)

#### batch:12 由来 (4 ペア)
| 問題 | 出題画像 (img) | 正解後画像 (img_answer) |
|---|---|---|
| Q125 trivia L1 バナナ色 | unripe (緑) | ripe (黄) |
| Q123 trivia L1 うさぎの耳 | face_crop (耳画角外) | rabbit (耳ピン全身) |
| trivia L2 速い動物 (cheetah) | speed_dust_side_pass (砂煙のみ) | running_cheetah (チーター本体) |
| body L2 噛む (chewing) | munching (子供がりんごを食べる) | chewing_teeth (歯のアップ) |

#### batch:13 由来 (1 ペア、画像未納品)
| 問題 | 出題画像 (img) | 正解後画像 (img_answer) |
|---|---|---|
| trivia L3 ライオン (オスにあるもの) | lion_osu_silhouette (オス影絵) | lion_osu_mesu_compare (オス+メス並列) |

#### batch:14 由来 (15 ペア、2026-05-08 配置 + 結線完了)
| # | 問題 | 出題画像 (img) | 正解後画像 (img_answer) |
|---|---|---|---|
| 74 | trivia L1 ぞう | elephant_silhouette (正面シルエット) | long_nose_elephant (既存) |
| 75 | trivia L1 ふゆそらから | winter_sky_only (灰色冬空のみ) | snowy_landscape (既存) |
| 76 | trivia L1 たまごから | egg_unhatched (巣の白卵) | hatching_egg (既存) |
| 77 | trivia L1 りんご色 | apple_silhouette (暗茶ベタ塗り) | red_apple (既存) |
| 80 | trivia L1 たねを土に | seed_in_dirt (土+タネ、芽なし) | seed_germinate (既存) |
| 87 | trivia L2 ミミズ | earthworm_dirt_only (雨上がりの泥) | earthworm_after_rain (既存) |
| 105 | weather L1 ふわふわ雲 | sky_question (空+?マーク) | cloud_sky (既存) |
| 107 | weather L2 きり | morning_clear (霧なし朝景) | distant_mist (既存) |
| 111 | weather L2 雨どこから | rain_ground (雨の地面のみ) | rain_from_cloud (既存) |
| 150 | body L1 におい | boy_silhouette_question (共通) | boy_face_nose (鼻に光輪) |
| 151 | body L1 みる | boy_silhouette_question (共通) | boy_face_eye (目に光輪) |
| 152 | body L1 きく | boy_silhouette_question (共通) | boy_face_ear (耳に光輪) |
| 158 | body L2 ひふ | boy_silhouette_question (共通) | skin_wrap (既存) |
| 159 | body L2 しんぞう | chest_clutch (胸押さえシルエット) | heart_pump (既存) |
| 161 | body L2 はい | deep_breath (深呼吸シルエット) | lungs_breath (既存) |

→ body L1 #150-152 + body L2 #158 は `stage_body_boy_silhouette_question.png` を**共通の出題画像として 4 問で再利用**。reveal だけ各問題で個別。これで 1 枚の画像が複数問題で機能する効率設計。

### Code-Q&A 表で見るべき場所

- `quizland/data/questions.js`: trivia L1 行 295-348, trivia L2 行 347-412, weather 行 139-232, body 行 484-587 にリビールペア実例多数
- レンダラ: `quizland/index.html` `loadQuestion` 周辺と `revealAnswer` 関数

### 残課題 (画像納品待ちで未結線)

- #81 trivia L2 8足クモ + #93 trivia L3 8目クモ (A6 虫シルエット集合 待ち)
- #121 weather L3 雪結晶 (B4 ぼかし雪粒 未届)

## ネタバレ監査の枠組み (Spoiler taxonomy)

3 並列エージェント監査 (2026-05-08) で抽出した分類:

### HARD spoiler (即対応必要、計 20 件)
- 出題画像で答えが完全に視覚化されているもの
- 例: 「ぞうのからだで一番ながいのは？」(答え=はな) で **鼻が画面中央で大きく強調**された絵
- 修正方針: リビールペア化 (出題=隠れた構図、正解後=既存絵)
- 計 20 件のリスト + 個別 reveal pair 案は本ファイル下記または `tmp/quizland-trivia-audit/REPORT.md` に記録 (作成予定)

### SOFT spoiler (検討対象、計 10 件)
- 答えが示唆されているが許容範囲のもの
- サブカテゴリ:
  - **count 系** (虹の色数、タコの足数): 数えてもらう前提なので OK
  - **比較系** (一番大きい生物): シルエット並列で考えさせる構造
  - **命名問題** (ゆきぐに、じょうはつ、しもん): 絵をそのまま名付ける問題は構造上ネタバレ込みなので、質問文を「これはなに？」型から「どんな働き？」型に書き直すと spoiler 解消
  - **メカニズム視覚化** (雷、夏): 答えそのものではなく雰囲気/原理を絵で見せる、許容範囲

### SAFE 例 (well-designed reveal pair)
- bear, cheetah, rabbit, lion, octopus, banana_tree, chewing_teeth, flamingo

### Spoiler 修正方針 (2026-05-08 ユーザ判断)

3 並列エージェント監査で抽出した HARD spoiler 候補を、ユーザと一問ずつレビューした結果の判断記録。

#### Drops (HARD spoiler 認定だが、結局そのままで OK となったもの)

| 全体# | 質問 | なぜ OK |
|---|---|---|
| #88 (trivia Lv2#8) | コアラが たべるものは？ | 子供は「ユーカリ」という植物名を知らないので、絵に映っていても答えのバレにならない |
| #122 (opposite Lv1#1) | 「おおきい」の はんたいは？ | 比較絵で両方見えるが、子供向けには「ヒント」としてむしろ望ましい |
| #131 (opposite Lv2#2) | 「たかい」の はんたいは？ | 同上 |

→ **教訓**: 比較絵の opposite 系・専門用語が答えの命名問題は、絵がそのまま映っていても spoiler とみなさない。

#### Adopted patterns

##### "多シルエット集合" 手法 (新パターン)
- 答えを 12-13 種類の中から探させる
- 既存例: `stage_trivia_ocean_silhouettes_4.png` (海の生き物比較)
- 新規適用: クモ問題 (#81 あし8本、#93 め8つ) → `stage_trivia_bug_silhouettes.png` (1 枚で共用 OR 別カット 2 枚)
- 雲問題 (#105) は別解法 (空+?マーク) を採用

##### "男の子キャラ統一" 手法 (体パーツ問題群)
- 体パーツを問う問題 (鼻・目・耳・皮膚・心臓・肺) は全て**同じ男の子キャラ**で統一
- 出題: 男の子シルエット + 該当部位に ? マーク
- reveal: 同じ男の子のクローズアップ + 該当部位ハイライト
- これにより「答え=見たことある体のパーツ」が直接見えなくなる + キャラの愛着で学習意欲↑
- 既存 `stage_body_skin_wrap.png` の男の子キャラを基準に他の reveal を生成

##### "同構図の隠し版" 手法
- 既存 reveal 画像と同じ構図で、答えになる要素だけ隠した「出題用」を生成
- 例: 霧 (#107) → 同じ風景で霧なしの朝バージョン
- 例: 雨どこから (#111) → 既存「雲+雨」から「雲は画面外、雨の地面のみ」
- 例: ぞう (#74) → 既存「鼻長強調」から「鼻を折り曲げた正面シルエット」

#### Sprint-14 (CODEX-ORDER-3.md) 発注対象

`tmp/quizland-trivia-audit/CODEX-ORDER-3.md` (作成予定) で以下を発注:
- Trivia 系: ぞうシルエット / りんごシルエット / 冬空 / 卵 / タネ / 虫シルエット集合 / 雨の土
- Weather 系: 空+? / 朝のクッキリ / 雨の地面 / ぼやけ雪粒
- Body 系: 男の子シルエット + 顔/目/耳/皮膚クローズアップ / 胸押さえ / 深呼吸
- 計 15-19 枚

## ピットフォール

- ❌ 画像ファイル名 (`レイヤー 0_*_001.png`) から中身を推測しない — タイムスタンプ順で並んでいるだけで意味的順序ではない場合がある (実際は CODEX-ORDER 順と一致するが視覚で確認必須)
- ❌ 既存 `stage/*.png` への上書きを焦らない — variant 採用 (`_face_crop`, `_side_pass`) で別ファイル名にすることが多い
- ❌ **画像配置と questions.js 結線は別の作業**: ファイルを `assets/.../stage/` に置いただけではゲームから読まれない。`questions.js` の `img` / `img_word` / `img_answer` を新ファイル名に書き換える必要あり
- ✅ 必ず CODEX-ORDER.md の保存先パスをそのまま使う
- ✅ `HANDOFF.md` の往復ログで variant 採否を確認してから書き出す
- ✅ リビールペア対象問題は **必ず 2 枚セット**で発注: 出題用 (隠し) + 正解後用 (明示)
