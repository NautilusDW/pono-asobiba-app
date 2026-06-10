# ポノのあそびば MVP コンテンツ監査 (暫定 Punch List)

| 項目 | 値 |
|---|---|
| 監査日 | 2026-06-10 |
| 対象 | pono-asobiba-app 全コンテンツ (本購入者 = Amazon 絵本『ありがとうって、うれしいね』購入者向け) |
| スコープ | 「Amazon 絵本購入者の保護者と 3-6 歳の子供にそのまま見せられるか」のコンテンツ完成度。決済・サブスクは対象外 (本アプリには決済なし、全機能無料公開方針) |
| 監査方式 | 並列エージェント workflow (Discovery → Per-Content Audit → Verify → Cross-Cutting → Synthesize) |
| 完了状況 | Per-Content Audit 26 件成功 / 4 件 (room, bento, aquarium, collection) 未監査 / 横断レビュー 5 観点 + 最終 synthesize 未完了 (いずれもセッション制限により中断) |
| 残作業 | (A) 未監査 4 件の audit / (B) 横断レビュー 5 観点 / (C) この punch list 自体の adversarial verify / (D) cuts セクションの Keep/Cut/Archive 軸での再ラベリング |

> 注: 横断レビュー (cross-game patterns / asset-quality / UX-flow) は未実施のため、画像品質統一の全体方針 (アートディレクション・ガイドライン化) は別途必要。MVP フラグ (`PONO_MVP_NO_REWARDS=true`) でスタンプラリー/どんぐり/おへや系を全面非表示にしている件についての「解禁する/しない」方針判断も別途要決断。

> 「cuts」に挙げた項目には、(a) 単なる試作残骸と (b) 試行錯誤の末に現在は機能停止しているが世界観設計の一部として将来復活させたい資産 が混在している可能性が高い。次フェーズで Keep / Cut / Archive の3ラベルで再仕分けすること (判定基準: ①`play.html`/`index.html` からメニュー到達可能か ②計画文書で将来使う明記があるか ③単なる試作残骸か)。

---

## 1. Blockers (本購入者に出して恥ずかしい必須修正)

### 1-1. サブスク誘導とティアロックが全機能で稼働中 (最優先・複数ゲーム横断)

監査の半数以上で同じ問題が出ている。本来「Amazon 購入者には無料で全機能」のはずなのに、`common/tier.js:37` の `PONO_TIER_GAME_LOCKS_ENABLED = true` が Phase 2 (実ロック発動) で稼働しており、複数ゲームで「アプリで遊べるよ」モーダルが出る。

- **quizland**: free + know モードだと normal/hard がグレーアウト + サブスク誘導 (`quizland/index.html:6154-6159`)
- **oto**: `FREE_OTO_RHYTHM_SONGS=[]` で全リズム曲不可、たいこ/ピコがロック中
- **puzzle**: `FREE_PUZZLE_MAX_STAGE=3` で 20 ステージのうち 15% しか触れない
- **maze**: free で 6 面中 3 面 + tier 保険コード残置
- **bento**: 食材 8/30、箱 1/3、NPC 0/6 まで free 制限
- **writing**: カタカナ編全体がサブスク限定モーダル (`writing/index.html:10136-10171`)
- **slide**: `slide/index.html:242-244` で `pono_premium !== '1'` なら即 play.html へ強制遷移
- **stacking**: 同様の Premium Gate (`stacking/index.html:230-233`)

**対応**: tier.js 一括無効化 + 各ゲーム個別の lockedCards / showSubscribePromo / premium gate を一斉解除。

### 1-2. テスト用 `localStorage.removeItem(..._tut_seen)` が本番に残置 (5 ゲーム以上)

毎起動でチュートリアル強制再生。「壊れている」「覚えてくれない」と保護者に映る最悪 UX。

- `breakout/index.html:1456` — `breakout_tut_seen` 削除
- `bubble/index.html:2452` — `bubble_tut_v2` 削除
- `coloring/index.html:1562` — `coloring_tut_seen` 削除
- `stacking/index.html:793` — `stacking_tut_seen` 削除
- `bowling/index.html:374` — `bowling_tut_seen` 削除

### 1-3. 絵本タイトル・著作権者の表記ゆれ (LP の信頼を直撃)

`index.html` (LP) は『ありがとうって、うれしいね』だが、`help.html:201` は『ありがとう ポノ きみに あえて よかった』、`manifest.json:4` は『ありがとう』、OG 画像 `A+用ヘッダー.jpg` は『こころが ぽっと ひかる まほうの ことば』とすべて違う。著作権表示も `© ネモ先生 / ポノのあそびば` と `© こだまのもり出版 All rights reserved.` が並ぶ。**購入者が自分の買った本と違うタイトルを見る = 致命的**。

### 1-4. 開発用 UI が本番ユーザーへ丸見え

- 「📋 ぜんぶみる (開発用)」リンク → `play-all.html` (3834 行) に飛べる
- 「🍱 弁当 NPC テスト (開発用)」8 リンク
- 「🔄 デバッグ: フリーに もどす」ボタンが解錠成功画面に常設 → 子供が誤タップで解錠取消
- `play-all.html` に「🔄 ぜんぶリセット」(`localStorage.clear()` + SW unregister)、「🛠 デバッグ ON/OFF」、「🔧 ピボットツール」が画面中央に常設

**対応**: `?dev=1` クエリ or `location.hostname` 判定で開発系のみマウント。

### 1-5. 画像の不在・低品質・流用の致命的箇所 (画像中心観点)

- **bubble の星座イラスト 4 種が裸体線画** (ふたご・おとめ・いて・みずがめ)。3-6 歳向けに完全 NG
- **puzzle 16 ステージ vs ポノ特別 4 ステージ (5/10/15/20) の画風が完全別物** (水彩 vs 線画セル塗り)
- **partner_karasu.webp** だけ 8 体中 1 体だけ白背景ベクター画
- **slide のステージ背景 8 ステージで 6 枚しかなく、stage1/2、stage4/5、stage6/7 で完全重複**。さらに `stage3_cave_entrance.png` は存在するのに STAGE_BGS に参照されず孤児化
- **slide のポノ/おかあさんの絵柄が 2 系統混在** (タン色テディ vs オレンジ系シャギー) → 親子の同一性が崩壊
- **writing-mori のミルマル差分画像 wave/cookie/cheer が同一バイト (MD5 一致)**。演出が成立しない
- **zukan の「こもれびの森」探索背景が月夜の夜景** (`leaf_glow_forest_field_16x9.png`) — テーマと完全に逆
- **maze stage 6 (最終面) だけ別画風** (装飾フレーム+ハート柄、1600x904 低解像度) + story 定義なしで救出シーンが出ない
- **maze risu_goal.png 右上に黒い欠け** (元画像 artifact)
- **drawing の 5 枚の塗り絵線画スタイル/解像度がバラバラ**、全部クマばかり
- **coloring サムネ用画像が手抜き** (塗っていない線画をそのまま使用)
- **quizland の `ballon_01.png` だけ漢字「何だろう」焼き込み** (他 5 枚はひらがな)、16% の頻度で 3 歳児に出る
- **wordmatch のハズレ選択肢 (キノコ/レモン/スイカ) だけ別アートスタイル**
- **bento-kitchen のレシピカード絵柄が二系統混在** (茶色額縁付き 8 枚 / フローティング 3 枚)
- **bento-kitchen の onion/tomato 画像が写真風グロス** で他の水彩トーンと浮く
- **fossil の Allosaurus/Iguanodon/Mosasaurus** が他 12 体と画風不一致
- **shop の `counter.png` が exterior.png のジブリ風品質に対し「ただの茶色い木板」**
- **stacking はキャラ全部 emoji (🐦🦔) で世界観破綻**。`assets/images/Block/` に高品質背景 6 枚を仕込みながら未配線
- **zukan の探索画面ポノが文字「ポノ」入り茶色丸 div だけ**
- **egg の孵化後クリーチャー本体が全部 emoji** (🔥/🌸/💧/...)。たまご画像はプロ品質水彩なのに育てる主役の絵がない
- **breakout のハリネズミが盤面では 🦔 emoji、エンディングだけリッチイラスト**

### 1-6. 「準備中」表示と実態の乖離

`play.html` のメニューで 4 本 (writing-mori / wordmatch / zukan / kitchen) が `comingSoon:true` だが内部実装は大規模に進んでいる (kitchen.html 17,934 行、writing-mori 3,425 行など)。「無料で全機能解放」方針なら全部 free 公開すべき。逆に slide はメニューから完全に外れている (`play.html` に slide エントリ自体なし) のに、ファイルとしては完成度高め。

### 1-7. データ整合性バグ

- **puzzle のステージタイトル↔画像の不一致が 10/20 件以上**。「もりの どうぶつ」だが画像は風船 3 つ、「うみの なかま」だが画像はケーキ、「やまの ハイキング」だが画像は雲の上で寝るくま
- **fossil の恐竜データは 15 種なのに「14たい」とハードコード** (`fossil/index.html:1014,1117,1157,3028`)
- **wordmatch のアチーブメント `wordmatch_correct` を誰もインクリメントしない** → 3 実績が永久解放不能
- **breakout の背景アンロックラベルが 1 ステージ分ズレ**
- **bowling の背景 19 枚中 13 枚が「50ラウンドで解除」等のラベル詐欺**。対応 achievement が存在せず永久解放不能
- **egg のティア 3「ニジタマ」が `lifetime_pts_100` で永久ロック** (`pono_lifetime_pts` は書き込みコードが 1 件もない)
- **techo の「うみのいきもの」「はいけい」画像パスが実在しないディレクトリ**
- **maze のステージ 6 だけ story 定義なし** + 最終ステージなのに尻すぼみ

### 1-8. ファイル名・素材管理の地雷

- **maze ステージ 2 が `____2_____.png`** (実体は JPEG 拡張子不一致) のままデプロイ
- **maze の `____.png` `____1_____.png` `森の入口.png` `hf_20260427_*.png`** など旧 draft 約 5MB がデプロイ対象に
- **リポジトリ直下の開発残骸**: `_smoke.js` (0 byte), `_probe_frame.png` (433KB 魔法陣), `debug.log` (15KB), `tmp_extracted_script.js` (224KB) が `wrangler.toml directory='./'` で全配信
- **`assets/images/Bowling/レイヤー 0_002.png 〜 015.png`** (Procreate 書き出し原本 13 枚 ~2.8MB) がマルチバイト名のままデプロイ
- **`assets/images/Block/nautilus1105_*.png`** (Midjourney 生ファイル名 7 枚 ~13MB、うち 6 枚は stage1-5,6 と md5 完全一致)
- **OG 画像が `A+用ヘッダー.jpg`** という日本語+記号ファイル名 (SNS シェアで URL エンコード事故の温床)

---

## 2. Improvements (もっと良くなる提案)

### 2-1. Effort: Small (1 ファイルレベル)

- LP の入口ボタン下「⬆ ここから あそべるよ！」は冗長 → 1 行削除
- `slide` のステージ 3「きいたことある おと」 goal アイコン 🎵 / ステージ 6 の 🌙 を物語と整合
- `bento-kitchen` の右上「おべんとうを つくる」ボタンを「冷蔵庫に何も入っていない状態では非表示」
- `quizland` の「おしらせ」ボタンが素の `alert()` → 世界観モーダルに置換
- `message` (作者より) の日付プレースホルダ `YYYY.MM.DD` を実日付に
- `egg` の作物「たね」「め」段階を 4 種で同一 emoji (🟤/🌱) → 種類別 emoji に
- `egg` の飾り資産「くさ」「きのこ」カテゴリラベルが実体 (岩・丸太・切り株) と不一致 → ラベル修正
- `egg` のヒノコ赤ちゃんの 🕯️ (ろうそく) → 火の精霊らしい emoji に

### 2-2. Effort: Medium (UX 改善)

- **`play.html` のカード並びを free 5 → coming-soon 4 の境目にセパレータ追加**「もうすぐ あたらしい あそびが くるよ」
- **`oto` の「シャボン玉ドラッグで音が鳴る」隠し機能をチュートリアルに追加**
- **`wordmatch` の問題セット**: 1 プレイで 1 体しか集まらない → 未収集動物を優先選択する重み付け
- **`zukan` のホットスポット**: 透明ボタン偶然タップで discovery 発動 → タップ近接要求
- **`slide` の重複背景使い回し**: stage3_cave_entrance.png 活用 + 3 枚追加生成で 8 枚揃え
- **`coloring` のぬりえ画像** を 5→10-15 枚に増量 + 多テーマ化 + サムネ用に「塗ったあと」サンプル別生成
- **`fossil` の Stage 1 / Stage 2 を v2 mechanic** (崖+ノジュール+地層) に揃える
- **`puzzle` のステージタイトルと画像の対応を全 20 ステージで再点検**
- **`stacking` の背景**: 既に 6 枚ある画像をフリーズ進捗に応じて切り替える

### 2-3. Effort: Large (中期改善)

- **絵本パスワード仕掛けの本実装** (`common/tier.js:316` の `BOOK_PASSWORDS=['1234']` プレースホルダ → 実際の絵本に印字された値)。**今回の方針が「無料全機能解放」ならパスワード仕掛け自体を全削除**するのが正解
- **kitchen.html (17,934 行) と bento/index.html の連続体験接続** (kitchen で作ったおかずが bento に持ち越されない現状の修正)
- **`maze/index.html` (6735 行 / 250KB)** の grid 廃止後死蔵コード ~700 行削除
- **`writing/index.html` (16,000 行)** を `battleIntro.js / storyboardData.js / fairyData.js` に分割
- **`puzzle/main.js` (5568 行)** を分割
- **`bento-kitchen` の RECIPES/INGREDIENTS を JSON 化** して外出し
- **`zukan` の残り 32 マスのコンテンツ追加** (現状 36 枠中 4 枠 = 11%)
- **`oto` のリズム結果評価ロジック** (3つ星: misses==0 && goodRate>=0.65) が 2-5 歳には厳しすぎる → 再調整

---

## 3. Cuts (削除/廃止候補 — Keep/Cut/Archive の再ラベル要)

### 3-1. 即削除 OK (誰も使わない死蔵)

- **`puzzle/headbreaker.bundle.js`** (14,711 行 / ~500KB) — ライブラリ切替前の取り残し、参照ゼロ
- **`quizland/data/questions.js.bak`** (485 行 / 42KB)
- **`quizland/data/flowers.js`** (死コード)
- **`quizland/data/_review/`** (内部レビュー文書 80 ファイル / 1.7MB が公開対象)
- **`quizland/preview/` `quizland/preview/full/`** (デザインサンドボックス 3975 行 / 145KB が公開対象)
- **`quizland/choice/_backup/`** バックアップフォルダ (公開状態)
- **`assets/images/quizland/illust/choice/` の 144 枚のオーファン PNG** (現データは 88 枚しか参照しない)
- **`assets/images/puzzle/{tablet,lava}/` 配下 25 ファイル** (puzzle 未参照、別ゲーム素材の仮置き)
- **`assets/images/Block/nautilus1105_*.png` 7 枚** (~13MB、うち 6 枚は stage1-5,6 と md5 一致)
- **`assets/images/Bowling/レイヤー 0_*.png` 13 枚** (~2.8MB、bowling/pins/ で代替済み)
- **`maze/_sim.js`** (グリッド廃止後 600 行未参照)
- **`maze/imageStages/____.png` 系 draft 6〜7 枚 + sample1.svg + hf_20260427_***  (~5MB)
- **`writing-mori/write.html`** (19 行リダイレクトのみ)
- **`assets/images/nurie/` 5 枚** (~4.3MB、最適化済 webp が既稼働、原本不要)
- **`coloring/index.html` のスロット保存パネル一式** (openSavePanel が呼ばれない孤立コード ~70 行)
- **`drawing/index.html` の hamiMask / applyHamiMask** (UI 未配線の死コード)

### 3-2. 構造的削減候補 (Archive=退避保管 の可能性大)

- **`play-all.html` (3834 行)** — `play.html` が現役 hub。`docs/TIER_POLICY.md` で「将来削除候補」明記
- **`quiz-sound/` ディレクトリ** (META リフレッシュ+JS リダイレクトのみ)
- **`shop/index.html`** — MVP モードで入口バッジ非表示・どんぐり加算 no-op で完全な死にページ ← Archive 候補
- **`techo/index.html`** — 導線が CSS で塞がれ、LS 書き込みが全部 no-op、画像パスが実在ディレクトリを指さない、本のイラスト未制作。collection/zukan が上位互換 ← Archive 候補
- **`bowling/puzzle.html`** (1636 行) — 「一時非公開」状態だが URL 直叩きで遊べる
- **`oto/index.html`** の録音/保存/ループ機能 ~500 行 (UI 撤去済、ロジックだけ走って localStorage にゴミ書き込み)
- **`writing/index.html`** の `#mapScene` DOM + JS / `acorn-badge--legacy` CSS / `SHORT_OPENING_SCENES` / `finalGateEntry` (未実装 stub) 計 200-300 行
- **MVP フラグで非表示化されているスタンプラリー/どんぐり/ありがとうバッジ JS** (`play-all.html` 2226-3700, ~1500 行) — 再公開予定なし or `<template>` 化で休眠 ← Archive 候補
- 各ゲームの `acorns.js / treasure.js / achievements.js` 読み込み (forestdex.js などで一度も使われていない死読込)

---

## 4. 全ゲーム 1 行 完成度サマリ

| slug | completeness | 1 行ギャップ |
|---|---|---|
| index (LP) | mostly | 絵本タイトル・著作権者・OG 画像が同一サイト内で 4 バージョン混在 |
| help | mostly | 説明されている機能 (スタンプラリー等) が本番 `play.html` に存在しない |
| play | mostly | 開発用 UI 露出 + サブスクロック + ステージング URL 直書き |
| play-all | partial | 「廃止予定」明記、開発用ボタン (リセット/デバッグ) が画面中央 |
| quizland | mostly | サブスク誘導 + 漢字バルーン 1 枚混入 + 内部レビュー文書 1.7MB 公開状態 |
| maze | mostly | ステージ 6 だけ画風別 + story 欠落、ファイル名 `____2_____.png` |
| oto | mostly | リズム 3 曲中 2 曲 + 音色 2 種がサブスクロック、録音 dead code |
| puzzle | mostly | 20 ステージ中 10+ でタイトルと画像が不一致、ポノ特別 4 枚だけ画風別 |
| bento (未監査) | - | 食材 8/30、箱 1/3、NPC 0/6 のロック (play 監査から判明) |
| drawing | mostly | スタンプ CDN 依存でオフライン NG、previews/drawing.png 不在 |
| wordmatch | mostly | comingSoon 表示中、wordmatch_correct 統計が永久 0 |
| writing-mori | partial | ミルマル 3 表情同一バイト、オフライン非対応、報酬一律「もじクッキー」 |
| zukan | partial | 36 枠中 4 枠 (11%) のみ実装、「こもれびの森」が夜景画像 |
| writing | mostly | カタカナ編サブスクロック、CDN 依存、未実装「しろの おくへ」ボタン |
| slide | mostly | play.html メニューから消失、premium gate、背景 8 ステージで 6 枚使い回し |
| breakout | mostly | 背景アンロックラベル詐欺、テスト用チュートリアル毎回起動 |
| bubble | mostly | 星座 4 枚が裸体線画、テスト用 tut 毎回 |
| coloring | partial | ぬりえ 5 枚画風バラバラ、戻るボタン未配線、テスト用 tut 毎回 |
| bowling | mostly | 背景 19 枚中 13 枚解除不能のラベル詐欺、テスト用 tut 毎回 |
| stacking | partial | キャラ全部 emoji、SE 仕様ある音声 0 再生 |
| egg | partial | クリーチャー本体が全部 emoji、ティア 3 永久ロック、飾りラベル詐欺 |
| fossil | mostly | 15 種なのに「14たい」表示、stage1/2 だけ別 mechanic |
| shop | stub | MVP で入口非表示、買っても room 反映なし、商品 3 個ハードコード |
| techo | stub | 全画像パス壊れ、報酬 no-op で常に空の本、本のイラスト未制作 |
| message | mostly | 日付プレースホルダ `YYYY.MM.DD` のまま |
| quiz-sound | mostly | リダイレクトページ (本体は wordmatch) |
| **room** | **未監査** | session limit |
| **bento** | **未監査** | session limit |
| **aquarium** | **未監査** | session limit |
| **collection** | **未監査** | session limit |

---

## 5. 着手順 (Suggested Sequence)

1. **Step 1 (1 日): テスト用残骸と開発 UI を一掃**
   - 5 ゲームの `localStorage.removeItem('*_tut_seen')` 削除
   - `play.html` の dev-section / NPC テスト 8 リンク / 「フリーに もどす」ボタンを `?dev=1` 限定に
   - `play-all.html` のリセット/デバッグ/ピボットボタン削除
   - リポ直下の `_smoke.js / _probe_frame.png / debug.log / tmp_extracted_script.js` 削除

2. **Step 2 (1-2 日): tier/サブスクロック一斉削除**
   - `common/tier.js` で `PONO_TIER_GAME_LOCKS_ENABLED=false` + `BOOK_PASSWORDS` 配列空化
   - 各ゲームの個別 lockedCards / showSubscribePromo / premium gate (slide, stacking) を削除
   - `play.html` の 4 本 (writing-mori, wordmatch, zukan, kitchen) を `comingSoon:false / tier:'free'` に
   - `slide` を `play.html` GAMES に再登録

3. **Step 3 (1 日): LP の整合性修正**
   - 絵本タイトルを全箇所 (LP, help, manifest, OG) で『ありがとうって、うれしいね』に統一
   - 著作権者表記を 1 種類に
   - OG 画像を Amazon_mobile.webp で置換 or 新規 OG 生成
   - workers.dev → 独自ドメイン に canonical 統一

4. **Step 4 (2-3 日): 画像品質・統一感の致命箇所修正**
   - bubble 星座 4 枚 (ふたご/おとめ/いて/みずがめ) を子供向けに差し替え
   - puzzle ポノ特別 4 ステージ (5/10/15/20) を他 16 枚と同じ水彩タッチに
   - partner_karasu.webp を他 7 体と同タッチで再生成
   - maze stage6 を stage5 と連続する夜の森系に再生成 + story 定義追加
   - writing-mori ミルマル 3 差分 (wave/cookie/cheer) を別画像に
   - zukan「こもれびの森」を明るい昼の森背景に差し替え

5. **Step 5 (1-2 日): データ整合性バグ修正**
   - puzzle のタイトル↔画像不一致 10 件以上を再点検
   - fossil の「14たい」ハードコードを 15 に
   - wordmatch / writing-mori / egg のアチーブメント永久ロック解消
   - breakout / bowling の背景アンロックラベル詐欺修正

6. **Step 6 (1 日): 死蔵削除パス (Cut のみ。Archive 候補は別途退避)**
   - puzzle/headbreaker.bundle.js (500KB)
   - quizland/data/_review/ + preview/ + choice/_backup/ + 144 枚オーファン PNG
   - assets/images/Block/nautilus1105_*.png (13MB)
   - assets/images/Bowling/レイヤー*.png (2.8MB)
   - maze/_sim.js + draft png 群 (5MB)
   - shop/index.html, techo/index.html を `_archive/` に退避 (削除ではない)
   - play-all.html の dead code (~1500 行) を `<template>` 化

7. **Step 7: 未監査 4 件の audit**
   - room, bento, aquarium, collection を改めて per-content audit に投入

---

## 6. 開発戦略メモ (2026-06-10 議論)

### Web (PWA) 継続 + Capacitor / TWA ラップ = 現実解

ユーザーから「今後アプリ化したい、新ゲームをネイティブで作るべきか?」の問いに対する暫定方針:

- **既存資産が大きい**: 26+ ゲーム、画像数千枚、`sw.js` / PWA / CACHE_VERSION 運用が成熟。ネイティブ書き直しは数ヶ月〜半年の負債
- **領域適性**: 絵本連動知育は HTML/Canvas で品質が出る (3D/AR/重い物理が要らない)
- **1コードベース**: Web + iOS + Android 配信が可能 (Capacitor / TWA)
- **ネイティブ機能が必要になった時だけ Capacitor プラグインで足せる** (バッジ、IAP、Push、ファイル保存)

### 「Web 本体 / Native 薄ラッパー」運用イメージ

```
[新規ゲーム企画]
    ↓
[Web 用に HTML/JS で実装]
    ↓
[同じコードを Capacitor で iOS/Android アプリに同梱]
    ↓
[ネイティブ機能 (Push/IAP/AR) が必要な部分だけプラグイン化]
```

この方針なら「Web に入れない / アプリにだけ入れる」 = 無駄になる分岐が発生しない。全部 Web に入る、その上で App には更にプラグイン機能が乗る上位互換構造になる。

### ネイティブ切り替えがペイするケース (条件付き)

以下のいずれかが該当する次ゲームを作る場合のみ、ネイティブ実装を検討:
- AR (絵本にかざす)、3D、複雑な音響、物理エンジン、ペン圧/Apple Pencil 圧力
- iOS 専用機能 (Apple Vision Pro / WidgetKit / Live Activity) を売りにする
- App Store Kids Category で「ただの Web ラッパー」拒絶リスクを完全排除したい

### 確定前に必要な意思決定

1. 次に作る予定のゲームが、ネイティブ前提の機能 (AR / 3D / 物理 / カメラ / Apple Pencil 圧力 / Push通知 / IAP) を使うか
2. ストア配信は iOS / Android どっち優先 or 両方か

→ この 2 つを確定してから、次フェーズの実装エージェントチーム編成に入る。
