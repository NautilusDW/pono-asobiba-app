# ポノのつりゲーム拡張 統合企画書 — 海バージョン + こだまの森ワールドマップ + 図鑑/料理連携

作成: 2026-07-24 / リードゲームデザイナー統合版 v1.0
ステータス: 設計のみ・実装なし。§6 の意思決定事項がユーザー承認待ち

---

## 1. 概要

### 1.1 目的

KawaGlint(Unity 川づり)を核に、(1) 海づりの追加、(2)「こだまの森」ワールドマップによるロケーション選択、(3) おさかなずかん(図鑑)と料理(kitchen/bento)への連携基盤、を段階導入する。Unity↔Web 橋渡し(Unity as a Library)が未実装である現状を前提に、**橋渡し前に Unity 単体で完結して出荷できる範囲**と、**橋渡し完成日に「配管工事」だけで合流できるよう今凍結すべきスキーマ**を分離して定義する。

### 1.2 既存企画書 (TSURI_FISHING_GAME_PLAN_2026-07-23.md) との関係

- 企画書は**ゲームデザイン正本として存続**する。魚種ID・レアリティ語彙(normal/rare/super)・「失敗しても失わない」原則・「Lv1装備+のんびりで全normal+レシピ必須魚が釣れる」不変条件・レシピ縦切り表(§3.6)・pity設計(§3.2)はすべて継承する。
- **スキーマ改訂原則(本書で確定)**: 企画書 §3.3 の「一字も変えない」条項は「**フィールドの削除・改名・意味変更は禁止。純加算(フィールド追加・enum値追加・種追加)のみ可**」に緩和し、旧条項を明示的に上書きする(§6 ゲート10)。本書の追加フィールドはすべてこの原則下の上位互換。
- 正本の分担: 釣り体験・魚の挑戦仕様・レシピ = 企画書 / ワールド構造・データ契約・制作計画・**v1出荷種リスト(§3.4 の単一表)** = 本書。

### 1.3 クロスレビュー調停サマリ(4領域設計の矛盾裁定)

| # | 争点 | 裁定 | 主な理由 |
| --- | --- | --- | --- |
| 1 | ロケーションID語彙 (`kawa_`/`umi_` vs `river_`/`sea_`) | **`river_*` / `sea_*`** に統一 | TsuriWaterZone・zones 語彙と完全一致。ローマ字新語彙を作らない |
| 2 | ロケーション台帳 (川3/4、海2/3) | **川4 + 海3**(§3.1) | 海2ではレシピ必須魚の複数配置不変条件が物理的に満たせない。かこう削除は salmon の物語導線と供給地を失う |
| 3 | みずうみ問題 (region昇格 vs 川内ロケ vs enum拡張) | **川zone内ロケーション `river_mizuumi`**。zones/source enum は `river`/`sea` の2値を維持し、**イベントに `locationId` を純加算** | わかさぎ裁定(habitat「みずうみ」正記)の上位互換。enum増殖を避けつつ場所粒度を保全 |
| 4 | spawnモデル (乗数フラット vs 明示リスト) | **明示 Spawns[] ホワイトリスト**(リスト外=出現0)+ 実効テーブル = Spawns ∪ {BonusSpeciesId} | 「空=フラット」既定は新種が全ロケへ自動漏出する危険な既定 |
| 5 | 進行モデル (route自動送り vs catchCount解放) | **折衷**: 解放=累計釣果数、既定挙動=解放済みロケーションのroute自動送り、select=解放済みならいつでも可 | 幼児の選択負荷ゼロと「伸びしろ」解放演出を両立 |
| 6 | 保存媒体 (PlayerPrefs vs ファイル) | **`persistentDataPath/pono/tsuri/*.json` + アトミック書込(File.Replace + .bak)** に統一 | 強制終了での図鑑全ロスト防止。UaaL橋のプラグイン読取り経路が素直 |
| 7 | outbox の名前・置き場 | **`pono/tsuri/catch-outbox.json` 1本** | 二重定義解消。versioned なファイル名は不要(version はJSON内) |
| 8 | 釣果イベント形 | 企画書§3.3 + **冷凍フィールド(inventoryKey/edible/name)+ locationId + runId** | 消費側がUnity魚マスター非依存(hatake-harvest-bridge 前例)。場所別図鑑・将来シールの復元可能性 |
| 9 | fishdex 同期 (outbox replay vs 文書マージ) | **outbox=在庫専用、fishdex=文書ごと転送+Merge統合。書き込み単独オーナー=Unity、Webは読み取り専用ビュー** | seen/escapedCount は逃走イベント由来で outbox に存在せず、replayでは再構築不能 |
| 10 | 橋渡し輸送路 (ファイル vs payload) | **ファイル=耐久ストア正本。起動/終了payloadはセッション通知(表示専用)に格下げ** | 二重契約の解消。ackは別ファイルで単一方向×2 |
| 11 | regionCatchCounts の二重台帳 | **廃止。fishdex の sourceCounts 合算から導出**(正本=op列) | appliedOps なしの第2台帳は二重加算リスク |
| 12 | ボーナス種運用 | **zone-wide BonusSpeciesId**(川=unagi/ホームふち、海=maguro/ホームおき)。全ロケ極低確率+ホームブースト、pityは場所跨ぎ累積 | hikari_momonga 実証パターン。固定配置だと遭遇機会が痩せる |
| 13 | v1海種セット (7種 vs 6種) | **iwashi/ika は v1 から除外し将来ウェーブへ**(§6 ゲート4)。マスター登録はアート出荷とウェーブ1:1 | アートなし種が図鑑に永遠の空きスロットとして露出するのを防ぐ。ika は tug 実装フェーズと同時が機能的に整合 |
| 14 | ika/maguro の runs 一貫性 | **v1 では maguro も runs 無効・連打のみ捕獲**。tug 実装時に maguro の runs 有効化 + ika 追加 | 「ドラッグ必須の魚は存在しない」不変条件を場所拡張後も維持 |
| 15 | maguro の在庫方針 | **edible:true + inventoryKey:'fish_maguro'(rawに乗る・レシピなし)** を推奨(§6 ゲート7) | iwashi裁定「レシピなしでもraw commit無害」で被覆。特殊パターンを増やさない |
| 16 | 図鑑バッジ文言 | 「おべんとうに はいるよ」は**不採用**。「**たべられる おさかな だよ**」(edible表示)に弱める。「キッチンへ もっていけるよ」teaserも**非表示** | edibleだがレシピなしの魚に嘘をつかない。存在しない機能への期待を子供に見せない |
| 17 | 背景命名 | **`bg_tsuri_<zone>_<id>_<date>`** | hyokkori の `bg_world_*` 名前空間を侵食しない |
| 18 | tier語彙 / gameId | worldmapカードは **tier:'free'**('book'は非実在語彙)。gameId は **'kawaglint' + locationId パラメータ**('tsuri_kawa'は削除済みWeb版と同名) | 実grep裏取り済み |

---

## 2. ワールドマップ&ナビゲーション設計

### 2.1 「こだまの森」二段階構成

```
Level 0: ワールドマップ (こだまの森 全景)
  ├── region: forest (もり)  … 既存Webコンテンツ群のホーム。v1は表示のみ (§6 ゲート9)
  ├── region: river  (かわ)  … KawaGlint 川づり (4ロケーション)
  ├── region: sea    (うみ)  … KawaGlint うみづり (3ロケーション)
  └── placeholder枠 (zukan innerMap の placeholder:true 方式で「そのうち」表示)
```

- region ID は TsuriFishData の zones 語彙(`river`/`sea`)と完全一致。「みずうみ」は region ではなく **river zone 内のロケーション**(調停#3)。
- 川の innermap は「上流→下流」の一本道(さけが海から帰ってくる川)、海は「浜→磯→沖」の距離感。**かこう(川)と さんばし(海)は地図上で隣接配置**し、fish_salmon(唯一の両生息種)が両zoneをつなぐ物語の橋にする。この隣接は world_map アート発注時の幾何制約として §5.3 に明記。

### 2.2 データ正本と二重化規約

- 正本は **Web JS グローバルモジュール**: `common/kodama-world.js`(REGIONS/LOCATIONS/Spawns)+ `common/tsuri-species.js`(魚種マスター+dexProfile)。DOM/LS非依存・node testable。
- Unity 側は TsuriFishData.cs と同じ「値そのまま純C#移植」規約で複製(`KodamaWorldData.cs` 等)。fetch/JSON実行時読込は不採用(rewards.json 404 事故の前例)。
- **実装順は Unity(C#)先行を許可**する(現状 KawaGlint への到達経路が Unity のみのため)。Web 側フェーズ(§5.5 Phase D)着手時に JS 正本ファイルを起こし、以後は JS が正本。
- 正規化規約: 未知 locationId は既定ロケーションへフォールバック、Spawns 内のマスター未知 speciesId は無視(normalizeWalkState 思想)。

### 2.3 進行モデル(統合裁定・調停#5)

1. **解放**: 各 region の既定ロケーション(river_asase / sea_sunahama)は常時解放。他は「region 累計釣果数」で解放(閾値は LOCATIONS データに焼き込み=単一所有。初期値は §6 ゲート5)。解放判定の入力は **fishdex の sourceCounts 合算から導出**し、独立カウンタを持たない(調停#11)。
2. **既定挙動**: 「つりに いく!」だけ押した子は、解放済みロケーションを route 自動送り(hyokkori `locationForRun` の忠実ポート。cursor は解放済み集合の定義順を巡回、placeholder は ROUTE 対象から除外)。
3. **select**: 解放済みロケーションはいつでも任意選択可(hyokkori の「全周後解禁」ゲートは採用しない)。
4. **未解放表示**: シルエット+「あと Nひきで いけるよ！」。錠前アイコン不使用・ネガ演出なし(伸びしろ表現)。
5. **海zone解禁**: 初期提案は「川累計10匹で解禁」(かこう到達前後=物語導線と同期)。常時開放案との択一は §6 ゲート5。

### 2.4 UIの責任分担(Web vs Unity)

| 時期 | Unity側 (KawaGlint) | Web側 |
| --- | --- | --- |
| 現在(橋渡しなし) | **LocationSelect パネルが正**: region タブ(かわ/うみ)→ロケーションカード→「ここで つる!」。v1 はカード選択UI(新規アート0)で先行し、フルマップUIは Phase D で演出強化 | **ワールドマップ・プレビュー**(`worldmap/index.html`、zukan #screen-mapselect のコピー派生): 全景+スポット+魚シルエット+「アプリばんで つれるよ」木札バッジ。**起動ボタンは置かない(死にボタン禁止)** |
| UaaL統合後 | 釣りプレイセッション専任(起動payloadで locationId 受領→終了payloadで通知)。LocationSelect はオフライン/フォールバック経路として残す | **マップがランチャーに昇格**(バッジ→「つりに いく!」ボタン差替)。ナビ・図鑑表示・ショップ・キッチンは Web 責務(ただし fishdex の書き込みオーナーは Unity 据え置き、§4.5) |

- タイトルメニュー: GAMES 配列に「こだまの森 マップ」カード1件追加(id:'worldmap'、**tier:'free'**)。釣りカードは現時点で置かず、告知はマップ内バッジ+既存「アプリで あそべる」ゾーン誘導モーダル経由。カード1枚のまま中身が育つ構図でメニュー改修の再発を防ぐ。
- zukan 本体(encyclopedia.js / zukan.state.v1)は**一切改変しない**。実装パターンのコピー派生のみ。
- 運用注意(実装時): worldmap/ 追加は sw.js CACHE_VERSION バンプ対象。地図アセットは zukan の data-src 遅延ロード方式踏襲。

### 2.5 保存スキーマ(所有権分割・調停#6/#11)

**Web所有** — localStorage `pono_world_nav_v1`(選択状態のみ):

```jsonc
{ "version": 1, "lastSelected": { "regionId": "river", "locationId": "river_asase" } }
```

**Unity所有** — `persistentDataPath/pono/tsuri/route-river.json` / `route-sea.json`(camelCase・epoch ms・アトミック書込+.bak・正規化読込):

```jsonc
{ "version": 1, "mode": "route",            // "route" | "select"
  "selectedLocationId": null,
  "routeCompletedRuns": 3, "lastCompletedRunId": "run:…",   // 冪等キー
  "visitCounts": { "river_asase": 4 },                       // 景色ローテの将来入力
  "locationRecords": { "river_asase": { "plays": 4 } } }
```

- regionCatchCounts は**保存しない**(fishdex sourceCounts 合算から都度導出。正本=op列)。

### 2.6 起動/終了 payload(UaaL契約 — 今凍結、ただし通知専用)

```jsonc
// 起動 (Web→Unity): Intent extra / UnitySendMessage で JSON 1本
{ "schemaVersion": 1, "locationId": "river_kakou", "mode": "nonbiri",
  "gearEffect": { "windowMul": 1.0, "gainMul": 1.0, "decayMul": 1.0, "lureTableId": "river_basic" },
  "sessionSeed": 12345 }
// 終了 (Unity→Web): セッション通知。表示専用・ストア適用禁止 (耐久正本は §4 のファイル)
{ "schemaVersion": 1, "runId": "run:…", "locationId": "river_kakou",
  "catches": [ /* §4.3 のイベントを冷凍値込みでそのまま */ ], "seenSpeciesIds": ["fish_unagi"] }
```

---

## 3. ロケーション&生物コンテンツ

### 3.1 統一ロケーション台帳(単一正本・調停#1/#2)

**川 (river) — 4ロケーション:**

| id | 名前 | 背景コンセプト | 解放 | 役割 |
| --- | --- | --- | --- | --- |
| `river_asase` | せせらぎの あさせ | 現行 bg_river_crosssection 流用。木漏れ日・透明な浅瀬・魚影が見える | **常時** | 入門・既定。現行5種そのまま=**挙動不変** |
| `river_fuchi` | もりかげの ふち | 岩と倒木の深い淵。魚影は「深みの影」で半分だけ | 川累計5匹 | rare(salmon)初遭遇。**unagi のホーム(ぬし)** |
| `river_mizuumi` | しずかな みずうみ | 霧の湖・鏡面反射・桟橋の杭 | 川累計12匹 | **wakasagi 限定出現**。図鑑habitat「みずうみ」とゲームの両方が正直になる(わかさぎ裁定の上位互換)。**魚影ルールは川方式(shadow あり)** |
| `river_kakou` | ゆうやけの かこう | 川と海が出会う河口・夕焼け・遠くに水平線 | 川累計20匹 | **salmon 主役(x2.0)**=yakizake 安定供給地。うみ解禁への物語導線 |

**海 (sea) — 3ロケーション + 将来枠:**

| id | 名前 | 背景コンセプト | 解放 | 役割 |
| --- | --- | --- | --- | --- |
| `sea_sunahama` | すなはまの さんばし | 木の桟橋・浅い砂地・波紋 | **常時**(zone解禁後) | 入門・既定。「かくれんぼ」テーマ(かれい・ひとで・貝殻は砂にかくれている) |
| `sea_iwaba` | いわばの つりば | 磯・潮だまり・岩の間 | 海累計5匹 | **ebi 主役**=エビフライ主産地 |
| `sea_oki` | おきの ふね | 小舟・水平線・大波。魚影なし、ウキと竿のしなりだけ。**視点は岸型サイドビュー維持・舟は背景モチーフ**(pono_anchor 互換のため) | 海累計12匹 | 「なにが来るかわからない」くじ引きの本場。**maguro のホーム** |
| `sea_yoru_minato` | よるの みなと | 夜の港・常夜灯 | — | v2枠。innermap に「?」placeholder のみ。**ROUTE 対象外** |

### 3.2 出現テーブル(明示 Spawns ホワイトリスト・調停#4)

- 実効テーブル = `Spawns[] ∪ {zone の BonusSpeciesId}`。リスト外の種は出現0。
- **既定ロケーション(asase/sunahama)は全 WeightMul 1.0 のフラット**とし、レシピ必須魚が基準確率で釣れることを保証。主役ブースト(1ロケ1主役の原則)は非既定ロケーションのみ。
- ボーナス種: 川=`fish_unagi`(ホーム=fuchi)、海=`fish_maguro`(ホーム=oki)。全ロケ極低確率+ホームで BonusWeightMul。pity(逃走ごと窓+20%、fishdex.escapedCount 参照)は場所をまたいで累積。

| ロケーション | Spawns (太字=WeightMul ブースト) | 待ち時間 | 実効比 n:r:s 目安 |
| --- | --- | --- | --- |
| river_asase | ayu, nijimasu, zarigani, salmon, boot (全て x1.0) | 2〜4秒 | 92:8:0.5 |
| river_fuchi | **nijimasu x1.3**, ayu, salmon x0.8, zarigani (+unagi ブースト) | 3〜6秒 | 78:18:4 |
| river_mizuumi | **wakasagi (限定・群れ)**, nijimasu, zarigani, boot | 2〜5秒 | 90:9:1 |
| river_kakou | **salmon x2.0**, ayu, boot | 4〜7秒 | 65:32:3 |
| sea_sunahama | aji, ebi, karei, hitode, kaigara (全て x1.0) | 3〜6秒 | 90:9:1 |
| sea_iwaba | **ebi x1.3**, aji, tai, hitode (+将来 ika) | 4〜7秒 | 75:22:3 |
| sea_oki | **tai x1.5**, salmon, aji (+maguro ブースト、将来 iwashi) | 5〜8秒 | 55:38:7 |

- 待ち時間補正は location の WaitMulMin/Max のみで表現し、**絶対上限8秒を子供向けガードとして固定**。
- ロケーションが変えてよいのは**出現テーブルと待ち時間レンジのみ**。窓・連打・challengeProfile の場所別補正フィールドはスキーマに意図的に存在させない(「難しいロケーションを作らない。レアに会いやすいロケーションだけを作る」)。
- 非食用種の合計出現率は各ロケで normal 帯の10〜15%(sunahama のみ上限15%側可)。treasure セッション内デデュープは `treasure_*` prefix(boot/kaigara)が対象、hitode は生物枠で対象外。

### 3.3 演出上の申し合わせ

- 海=魚影なし(企画書§2.1 裁定)により海の魚は catch 1枚のみ。karei の「砂にかくれる」演出は species 別 shadow を使わず**汎用の砂けむり/泡エフェクトで表現**。
- 湖(river_mizuumi)は川方式(shadow あり・TsuriKawaTuning 系)と明記。
- 未解放タップは zukan imrpg-comingsoon と同文法のモーダル。文言はすべて第三者読み聞かせ視点・ひらがな。

### 3.4 v1出荷種リスト(魚種マスター単一正本表)

マスター登録は**アートが出荷される種だけ**(ウェーブ1:1原則)。計 v1=14種(川7+海6+salmon両属+kaigara採択時+1)。

| speciesId | 名前 | rarity | 食用 | inventoryKey | zones | 主ロケーション | v1 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fish_ayu | あゆ | normal | ○ | fish_ayu | river | asase, fuchi, kakou | 実装済 | レシピ ayu_shioyaki(新) |
| fish_nijimasu | にじます | normal | ○ | fish_nijimasu | river | asase, **fuchi** | 実装済 | |
| zarigani | ざりがに | normal | × | null | river | asase, fuchi, mizuumi | 実装済 | |
| fish_salmon | さけ | rare | ○ | fish_salmon | river+sea | asase, **kakou(x2.0)**, oki | 実装済 | zones拡張のみ。物語の橋。yakizake |
| treasure_boot | ながぐつ | normal | × | null | river | asase, mizuumi, kakou | 実装済 | たからもの枠 |
| fish_wakasagi | わかさぎ | normal | ○ | fish_wakasagi | river (habitat=みずうみ) | **mizuumi 限定** | Phase A | 群れ・成功体験ゾーン |
| fish_unagi | うなぎ | super | ○ | fish_unagi | river | 川全域ボーナス (**fuchi**) | Phase A | v1 は runs 無効・連打のみ |
| fish_aji | あじ | normal | ○ | fish_aji | sea | sunahama, iwaba | Phase B1 | レシピ aji_fry |
| fish_ebi | えび | normal | ○ | fish_ebi | sea | sunahama, **iwaba** | Phase B1 | 既存 ebi_fry |
| fish_karei | かれい | normal | ○ | fish_karei | sea | **sunahama**(砂にかくれる) | Phase B1 | **新規提案**(ゲート2)。白身の柱 |
| hitode | ひとで | normal | × | null | sea | sunahama, iwaba | Phase B1 | 非食用枠 |
| treasure_kaigara | きらきらの かいがら | normal | × | null | sea | **sunahama** | Phase B1 | **新規提案**(ゲート3)。boot の海版 |
| fish_tai | たい | rare | ○ | fish_tai | sea | iwaba, **oki(x1.5)** | Phase B2 | 白身・お祝いの読み物枠 |
| fish_maguro | まぐろ | super | ○ | fish_maguro(推奨・ゲート7) | sea | 海全域ボーナス (**oki**) | Phase B2 | v1 は runs 無効。レシピなし(図鑑の花形) |
| fish_iwashi | いわし | normal | ○ | fish_iwashi | sea | (sunahama, oki 予定) | **将来ウェーブ** | v1除外はゲート4 |
| fish_ika | いか | rare | ○ | fish_ika | sea | (iwaba, oki 予定) | **将来ウェーブ(tug実装時)** | ドラッグ練習台の機能ごと延期 |

- レシピ接続は v1 で **salmon(yakizake)/ebi(ebi_fry)/ayu(ayu_shioyaki)/aji(aji_fry) の4本のみ**(企画書§3.6 不変)。karei/tai/wakasagi/unagi/maguro は「edible だがレシピなし」= iwashi 裁定(raw commit 無害)で被覆。
- unagi/wakasagi は企画書 Phase 2 種の前倒しであることを明記(Phase A が企画書 Phase 2 の一部を実行する依存関係)。

### 3.5 静的テスト不変条件(flaky 化しない形に言い換え済み)

1. レシピ必須魚4種は各 zone の**既定ロケーションの Spawns に WeightMul 1.0 で含まれる**(静的検査)。
2. レシピ必須魚は各 zone 内で**最低2ロケーションの Spawns に含まれる**。
3. route 1巡分の Spawns 和集合が zone の全レシピ必須魚を含む。
4. 全ロケーションの WaitMulMax 適用後の待ち時間上限 ≤ 8秒。
5. location スキーマは窓・連打・challengeProfile を変更するフィールドを持たない(構造で保証)。
6. Spawns のマスター未知 speciesId は正規化で無視される。
7. TsuriDexRecord.Merge の可換性 Merge(a,b)==Merge(b,a)(EditMode)。

---

## 4. 図鑑&料理データアーキテクチャ

### 4.1 二層構造(静的マスターと動的状態の分離)

**静的マスター**: `TsuriSpecies` に museum-data.js と完全同名のフィールド群を `dexProfile` として併記(readingName/category/subtitle/habitat/sizeText/funFacts[])。

- category は museum-data 既存語彙と統一(例: いか=「たこや いかの なかま」、かれい・たい=「しろみの さかなの なかま」に表記統一)。非食用も dexProfile を持つ(前例: submarine「のりものの なかま」。ながぐつ・かいがら=「たからものの なかま」)。
- **habitat 等の本文はここでは確定させない**(執筆は別タスク・ゲート11。本書中の文言はすべて仮)。
- ChallengeProfile 等のゲームプレイ数値は dexProfile に混ぜない(表示とチューニングの所有権分離)。
- **assetKey(fish_sake⇄fish_salmon 等のアートファイル名対応)は JSON 正本マスターに入れず、C#側リソースカタログ(KawaGlintSpriteCatalog 系)に置く**(橋を渡らないデータの色分け)。MovePattern は string でなく enum。
- 魚種側に locationIds は追加しない。「この場所で会える魚」の正本は location.Spawns ∪ Bonus(zones は表示用粗粒度 enum に留める)。teaserSpeciesIds は演出用の curated 3件で正本ではなく、**teaser 表示は seen:true を立てない**(seen は本あたり成立イベントのみ)。

**動的状態** — `pono_fishdex_v1`(Web表現)/ `pono/tsuri/fishdex.json`(Unity実体・バイト互換):

```jsonc
{
  "version": 1,
  "species": {
    "fish_wakasagi": {
      "seen": true,            // 本あたり成立で true (逃げても記録)
      "count": 2,              // 0 かつ seen:true = シルエット表示
      "escapedCount": 1,       // pity 救済の参照元
      "maxSizeCm": 10,         // サイズレンジなしの種は null
      "firstAt": 1753300000000, "lastAt": 1753340000000,   // epoch ms UTC
      "sourceCounts":   { "fishing_river": 2 },            // salmon「かわ/うみ どっちでも」表示用
      "locationCounts": { "river_mizuumi": 2 }             // 場所別フィルタ・将来シールの入力
    }
  },
  "appliedOps": {}   // opId→ts。ローテは「ack済みopのみ対象・replayバッチ完了までローテ延期」
}
```

- 3状態: 未遭遇=エントリなし / 遭遇済み未捕獲=seen:true,count:0(シルエット=catch 画像 tint、追加画像ゼロ)/ 捕獲済み=count>0。
- **生息地表示の正本は dexProfile.habitat**(わかさぎは「みずうみ」)。sourceCounts は salmon の両zone表示バッジ専用、locationCounts が場所粒度を担う — 「かわで つれたのに みずうみの さかな」矛盾はこれで構造的に解消。
- **マージ則(スキーマの一部として凍結)**: seen=OR / count・escapedCount・sourceCounts・locationCounts=加算(appliedOps で重複op除外後)/ maxSizeCm=max / firstAt=min / lastAt=max。全フィールド可換・冪等 → 将来のクラウド復元まで衝突解決1関数(`TsuriDexRecord.Merge`)で済む。

### 4.2 実装規約(7点)

1. 保存は `persistentDataPath/pono/tsuri/` 配下の JSON ファイル。Web スキーマと**バイト互換**(橋渡し=文字列コピーに退化させる)。
2. C# DTO のフィールド名は camelCase で JSON と一致(変換層禁止)。
3. 時刻は epoch ms UTC のみ。
4. Unity 専用 UI 都合データ(NEWバッジ既読等)は `fishdex.ui.json` に分離し、橋を渡らない側と最初から色分け。
5. 書き込みはアトミック(temp→File.Replace)、読込は parse失敗→.bak→空図鑑の正規化。
6. 更新は必ず opId 経由(発行→outbox 先行書込→appliedOps チェック付き適用)。
7. Merge 関数と可換性テストを最初から実装。

### 4.3 catch outbox(料理連携の中間フォーマット)

`pono/tsuri/catch-outbox.json` — **書き込み単独オーナー=Unity**(append+compact)。

```jsonc
{
  "version": 1,
  "events": [
    {
      "opId": "fishcatch:9f2c…",        // 企画書§3.3 prefix 規約そのまま
      "runId": "run:…",                  // 純加算
      "source": "fishing_river",         // 2値維持 (river|sea)
      "locationId": "river_mizuumi",     // ★純加算。場所粒度の正本
      "speciesId": "fish_wakasagi",
      "inventoryKey": "fish_wakasagi",   // ★捕獲時点で解決して冷凍。非食用は null
      "edible": true,                    // ★冷凍
      "name": "わかさぎ",               // ★冷凍 (表示用)
      "rarity": "normal", "sizeCm": 9, "caughtAt": 1753300000000
    }
  ],
  "carryover": { "raw": {}, "foldedOpIds": [] }   // 上限500件超過時の畳み込み受け皿
}
```

★=企画書§3.3への純加算フィールド。**消費側(Webインポータ)は Unity 魚マスターを一切知らずに `raw[inventoryKey]++` できる**(hatake-harvest-bridge の冷凍保存原理)。

**ack は別ファイル** `pono/tsuri/catch-ack.json` — 書き込み単独オーナー=Web(opId の append のみ)。単一方向×2ファイルで書き込み衝突を構造排除。

**消費手順(修正版)**:

1. Web インポータ: 各未適用イベントについて、`!edible || !inventoryKey` → fishdex 対象外・在庫opなしで ack へ / それ以外 → `FoodInventory.applyOp({opId, add:{raw:{[inventoryKey]:1}}})`(Web Locks 内・appliedOps 冪等)。成功した opId を catch-ack.json へ追記。
2. carryover 適用時: **foldedOpIds を自分の appliedOps と突合し、適用済み分を差し引いてから** `fishfold:<uuid>` として applyOp(fold 二重加算レースの防止)。
3. Unity 次回起動時: catch-ack.json を読み、ack 済みイベントを outbox から削除。未ack が500件超なら最古群を carryover へ畳み込み。
4. Unity は `pono_food_inventory_v1` に**直接書かない**。釣り専用在庫の新設も禁止(企画書§3.3)。kitchen/bento の fishNeeds/producesPreparedId は企画書§3.6 のまま変更不要(中間フォーマットは prepared 概念を持たない)。

### 4.4 Unity 単体先行提供の範囲(橋渡し前)

- **おさかなずかん: 実装する(推奨)**。fishdex ローカルデータ+dexProfile で3状態図鑑を KawaGlintUiFactory 系コード生成UIで実装。キャッチ直後「ずかんに とうろくしたよ!」スタンプ、HUD図鑑ボタン+NEWバッジ(fishdex.ui.json)、ヘッダ進捗「つれた: X/Yしゅるい」(**分母Y=そのzoneの登録済み=アート出荷済み種数**)。
- edible 表示は「**たべられる おさかな だよ**」に統一(調停#16)。キッチン前方参照UIは出さない。任意の将来ニセティとして在庫非消費の「たきびで しおやき」演出(opなし・図鑑ごほうびアニメ扱い)までを上限とする。
- **クッキングの Unity 内複製は不採用**。ID契約の二重実装事故リスクが大きく、食用魚は outbox に積み置くのみ。

### 4.5 橋渡し完成後の移行パス

| Phase | 内容 | データ作業 |
| --- | --- | --- |
| B0(今回) | 図鑑+outbox+図鑑UIを Unity 内で完結 | スキーマ凍結。以後は version バンプ+正規化で吸収 |
| B1(橋着地) | UaaL 同居。Capacitor プラグインが `pono/tsuri/*.json` を読む(同一サンドボックス・追加権限不要) | outbox→food-inventory replay(§4.3 手順)。ack は catch-ack.json 経由 |
| B2 | Web 側に読み取り専用「おさかなずかん」ビュー | **fishdex は文書ごと転送+Merge、書き込み単独オーナー=Unity**(調停#9)。outbox から fishdex は再構築しない |
| B3(app tier/クラウド期) | data-export / cloud-sync 対象に fishdex 相当を追加 | 復元統合は Merge 1関数。export はプラグインが fishdex.json を読む迂回経路である点を明示(既知の制約として受容) |

- 既存 zukan 3系統(encyclopedia.js+museum-data / zukan SPA / fishdex)のうち、fishdex は独立第3系統。**既存2系統には一切書き込まない**。互換は「同名フィールド」の規約互換のみで実行時依存ゼロ。

---

## 5. アセット制作量&フェーズ別ロードマップ

### 5.1 既存アート12点の棚卸し

tmp/alpha_pending/1458-kawaglint-fish-art/ の12点(QA全PASS・process_kawaglint_art.py 自動処理済み)は**全点流用・廃棄0**。bg_river_crosssection=river_asase 背景、pono_angler_side=全ロケ共通、fish_sake=salmon として海でも流用(海の追加アート0で1種確保)。ファイル名⇄speciesId の食い違い(fish_sake/fish_nagagutsu)は C#側 assetKey カタログで吸収(§4.1)。

### 5.2 新規アセット(ウェーブ上限8点・フェーズ1:1発注)

| ウェーブ | 対応Phase | 内容 | 点数 |
| --- | --- | --- | --- |
| W-A | A 川拡張 | 背景3(fuchi/mizuumi/kakou)+ wakasagi shadow/catch + unagi shadow/catch | **7** |
| W-B1 | B1 海コア | 背景2(sunahama/iwaba)+ catch: aji/ebi/karei/hitode(+kaigara) | **6〜7** |
| W-B2 | B2 おき | 背景1(oki)+ catch: tai/maguro | **3** |
| W-D | D ワールドマップ | 全体マップ1 + worldHighlight 2〜3 + innermap 2 | **5〜6** |
| 合計 | | (+図鑑UI枠 0〜1 別途) | **21〜24** / 生成コール目安 約32〜36(リテイク×1.5) |

- 将来ウェーブ(枠外): iwashi/ika +2(tug 実装時)、装備アイコン12(Phase G まで凍結)、yoru_minato。
- dexProfile 本文(funFacts 等)の執筆もアートと同じウェーブ1:1で発注し、全種一括執筆による死蔵を避ける。
- 生成は GPT Image 2 固定・コスト事前確認。catch はテンプレプロンプト(既存5種と同構図・同ライティング)。

### 5.3 背景の技術仕様(固定)

- 2688×1520(AR 1.768)。**水面線は上端から38〜45%の帯**(既存41.4%)に収め、pono_anchor.json(u=0.96, v=0.72)と UI レイアウトを全ロケで使い回す。sea_oki も岸型視点維持(舟は背景モチーフ)でこの制約に適合させる。
- 新背景は必ず process_kawaglint_art.py 系スクリプトで bg_metrics.json 相当を生成。stretch 絶対禁止・使用前に実測。
- world_map アートは「かこう(川)と さんばし(海)の隣接」を幾何制約として発注書に明記。

### 5.4 フェーズ表

**【今すぐ着手可能】**

| Phase | 内容 | 規模 | 備考 |
| --- | --- | --- | --- |
| **0 スキーマ凍結** | 本書§2〜4の契約一式(ロケ台帳/魚種v1表/イベント形/fishdex/ファイル配置/payload)。UIなし | S | 全フェーズの前提 |
| **A 川拡張+永続化基盤** | 実装順序を厳守: (1) controller を location.Spawns 起点に切替(river_asase フラットで**現行挙動不変**を回帰確認)→ (2) sizeCm ロール実装+永続化基盤(アトミックIO/opId/outbox/fishdex ストア)→ (3) wakasagi/unagi 追加+新ロケ3配線+SpriteCatalog 登録 | **M**(「ログ追記のみ」ではない。永続化層新設を含む) | CreateSession の WaitMul は純加算オーバーロード。既存 EditMode の 2〜5秒アサートは無変更で維持 |
| **B1 海コア** | TsuriUmiTuning 新設(魚影なし・前あたり2段階)。sunahama+iwaba+海種4〜5。maguro/ika の runs は無効のまま | M | core+tuning 分離設計の真価 |
| **B2 おき** | sea_oki+tai/maguro。海zone解禁条件の配線 | S | |
| **C Unity先行おさかなずかん** | ストアは A で敷設済み。UI(3状態グリッド+詳細)のみ | S〜M | B と並列可 |
| **D ロケーション選択の演出強化+Webプレビュー** | Unity: カード選択UI→フルマップUI(統一台帳は7ロケ>5で D の発動条件を満たす)。Web: worldmap/index.html(zukan派生・tier:'free'・起動ボタンなし)+タイトルカード。JS正本ファイル化(§2.2) | M | sw.js CACHE_VERSION バンプ |

**【ユーザー判断待ち】**

| Phase | 内容 | 規模 |
| --- | --- | --- |
| **E Unity↔Web 橋渡し(UaaL)** | 別軸大型。本設計からの要求は「凍結スキーマの純加算維持」「§4のファイル配置・ack契約」の2点のみ — E を配管工事に純化 | L |

**【E待ち】**

| Phase | 内容 | 規模 |
| --- | --- | --- |
| **F 食材連携縦切り** | salmon→yakizake から。kitchen への fishNeeds 配線(企画書§3.6 のまま) | M |
| **G Web図鑑ビュー/装備/ショップ** | B2モデル(読み取り専用ビュー)。どんぐり経済依存。装備アイコン12点はここまで発注凍結 | M〜L |

**【後回し確定】** シール(fishdex が count/escapedCount/maxSizeCm/locationCounts を持つため将来トリガデータは追加実装なしで揃う。付与は producer 登録制 `sticker:` prefix で冪等化可能)/ iwashi・ika(tug フェーズ)/ sea_yoru_minato / からあげ系レシピ(企画書§11 v2)/ forest region のハブ化。

推奨着手順: **0 → A → B1∥C → B2 → D**。E の判断が下りるまでに A〜C を終えておけば、E 完了当日に outbox replay(在庫)+fishdex 文書マージ(図鑑)で Web 側と即合流できる。

---

## 6. オープンな意思決定事項(ユーザー判断が必要な項目)

### 6.1 本書で裁定済み(異議があれば差し戻し)

ホワイトリスト spawn / ファイル保存+アトミック書込 / fishdex=文書マージ・Unity 書き込みオーナー / イベントへの locationId・冷凍フィールド追加 / source 2値維持(lake 非追加)/ 進行モデル折衷案 / tier:'free' / `bg_tsuri_*` 命名 / gameId 'kawaglint' / バッジ文言「たべられる おさかな だよ」/ キッチン teaser 非表示 / maguro・ika の runs 無効一貫化 — 調停サマリ(§1.3)参照。

### 6.2 要ユーザー判断(確定ゲート)

| # | 項目 | 選択肢 | 推奨 |
| --- | --- | --- | --- |
| 1 | **ロケーション台帳の確定**(川4+海3、§3.1 の ID・名前) | 本書案 / 削減案(川3 or 海2) | 本書案(不変条件充足のため海3は必須) |
| 2 | **fish_karei 追加**(+アート1枚) | 追加 / 見送り | 追加(白身リアリティの柱。全設計・全レビューで一致) |
| 3 | **treasure_kaigara 追加**(+アート1枚) | 追加 / hitode が非食用・たからもの兼務(0枚) | 追加(デデュープ対象と図鑑カテゴリの意味混濁を避ける) |
| 4 | **iwashi/ika の v1 除外**(企画書「海7種」の正本改訂) | 除外し将来ウェーブ / v1 に含める(アート+2) | 除外(アートなし種の図鑑空きスロット露出を防ぐ。ika は tug と同時が機能的に自然) |
| 5 | **解放閾値の初期値** | 川内: 5/12/20 匹、海内: 5/12 匹、海zone解禁: 川累計10匹 / 海zone常時開放 | 提示値で開始しチューニング(所有権は kodama-world.js の LOCATIONS データに一本化) |
| 6 | **進行モデル折衷案の承認**(catchCount 解放+route 既定+select 随時) | 承認 / hyokkori 完全踏襲(全周後 select 解禁) | 折衷案 |
| 7 | **maguro の在庫方針** | inventoryKey:'fish_maguro' で raw 搭載・レシピなし / inventoryKey:null(在庫非搭載) | raw 搭載(iwashi 裁定で被覆・特殊パターン不増) |
| 8 | **worldmap Web プレビューの提示範囲と時期** | tier:'free' で Phase D と同時 / app 限定 / 見送り | tier:'free'・Phase D 同時(死にボタンなしの「ながめる地図」) |
| 9 | **forest region の扱い** | v1 表示のみ / 既存ゲームハブ化 | v1 表示のみ(ハブ化は別企画) |
| 10 | **企画書§3.3 改訂条項の正式承認**(「一字も変えない」→「削除・改名・意味変更禁止、純加算可」) | 承認 / 現状維持 | 承認(冷凍フィールド・locationId の前提) |
| 11 | **dexProfile 本文執筆タスクの発注**(全種×funFacts4件、ナレ規約準拠・かな書き、ウェーブ1:1) | アートウェーブと同期発注 | 同期発注(一括執筆の死蔵回避) |

---

*関連正本ファイル: `/Users/ndw_mac/AppDevelopment/pono-asobiba-app/docs/TSURI_FISHING_GAME_PLAN_2026-07-23.md`(ゲームデザイン正本)、`/Users/ndw_mac/AppDevelopment/pono-asobiba-app/unity/PonoNativeGames/Assets/Pono/Games/KawaGlint/Runtime/Core/TsuriFishData.cs`、`/Users/ndw_mac/AppDevelopment/pono-asobiba-app/hyokkori-hightouch/js/locations.js`、`/Users/ndw_mac/AppDevelopment/pono-asobiba-app/zukan/index.html`、`/Users/ndw_mac/AppDevelopment/pono-asobiba-app/common/museum-data.js`、`/Users/ndw_mac/AppDevelopment/pono-asobiba-app/common/hatake-harvest-bridge.js`、`/Users/ndw_mac/AppDevelopment/pono-asobiba-app/docs/HATAKE_TO_BENTO_LOOP_PLAN_2026-07-23.md`、`/Users/ndw_mac/AppDevelopment/pono-asobiba-app/tmp/alpha_pending/1458-kawaglint-fish-art/`*

---

## 7. 批評レビュー(辛口クリティック・独立パス)

以下は本書の統合案に対する、独立したクリティックエージェントによるホリスティック批評である。実装着手前に必ず目を通すこと。特に7.1は「橋渡し基盤(Unity as a Library)が無い限りA〜Dを完遂しても誰もプレイできない」という、このプラン全体の前提に関わる指摘であり、オーケストレーターが別途ユーザーに伝えた見解(配信基盤への投資が必要という直感)と独立に一致している。

以下、コードベース実査(hyokkori-hightouch/js/locations.js、zukan/index.html、unity/.../KawaGlint/Runtime/Core/TsuriFishData.cs、docs/TSURI_FISHING_GAME_PLAN_2026-07-23.md、tmp/alpha_pending/1458-kawaglint-fish-art/)に基づく指摘。重要度順。

- **【最重要】「Unity単体で完結して出荷できる範囲」に出荷経路が存在しない。** KawaGlintはEditorビルド実証止まりで配信基盤は保留方針・実機Android確認も未実施(project memory)。Phase A〜D(7ロケ・14種・図鑑・outbox)を完遂しても、**子供は誰一人プレイできない**。しかも前提欠落はPhase E(UaaL)ではなく、企画書のどのPhaseにも載っていない「Android配信+実機QA」。フェーズ表に配信マイルストーンがない以上、A〜D全体が絵に描いた餅になる構造リスクを抱えている。AGENTS.md §7.4のUnity実機確認MUSTに対応する工程も企画書に一切ない。

- **outbox/ack/carryover機構は早すぎる作り込み。** 在庫は`raw[inventoryKey]++`しかしないのだから、橋着地前の全釣果はfishdexのcount(種別×locationCounts)から**一回きりの移行opで完全再構築できる**(橋前はkitchen到達不能なので消費済み分の考慮も不要)。500件上限のfolding、foldedOpIds突合、ack別ファイル…という分散システム級の機構は「橋がない期間が長い」こと自体が生んだ問題への過剰対応で、Phase Eで転送路が確定してから作ればよい。何ヶ月も実戦投入されないまま寝かせる複雑コードは典型的なバグ農場。企画書自身がMerge 1関数で復元統合できると謳っているのに、その同じ機構でoutboxを不要化できる選択肢を検討していない。

- **hyokkori `locationForRun` の「忠実ポート」は看板に偽りあり。** 実コード(locations.js:339-345)は**固定5ロケ集合への `routeCompletedRuns % ROUTE_IDS.length`** で、解放概念が存在しない。本企画は「解放済み集合(時間とともに成長)の定義順巡回」— 集合が成長するとmoduloの分母が変わりカーソルが跳ぶ、という**hyokkoriに存在しない新規エッジケース**を持つ別アルゴリズム。しかもUnity C#先行なのでコード再利用はゼロ、再利用されるのは思想だけ。「忠実ポート」と書くことで新規設計・新規テストが必要な箇所が過小見積もりされている。normalizeWalkState思想の移植は妥当だが、これもC#で書き直し。

- **zukan再利用も実態は2117行単一ファイルHTMLからのコピーフォーク。** #screen-mapselectはzukanのarea/シルエット/museum-dataデータモデルと密結合で、流用できるのは実質CSSレイアウトとdata-src遅延ロードのパターンのみ。このプロジェクトは「コピー派生が3層複製バグを生んだ」前科(bento仕切りG)があり、マップ選択UIの2本目のコピーは同じ轍。さらにWeb版worldmapは**「眺めるだけ・押せるものゼロ」の地図**——3-7歳はタップできそうなものを必ずタップする。全スポットが「アプリばんで つれるよ」札を返す画面は、この年齢には**何もないより悪い**フラストレーション設計であり、かつ存在しないアプリの広告でもある。Phase DのWeb部分はE確定まで丸ごと切るべき。

- **アセット見積もりはリテイク×1.5が楽観的すぎる。カウントすべきはユーザーの手作業時間。** 背景には「水面線38〜45%帯・pono_anchor(u=0.96,v=0.72)互換」という精密構図制約があり、GPT Image 2はこの種の位置指定を安定して守れない——既存12点バッチで背景は**1枚だけ**だった実績で背景7枚+マップ系5-6枚を外挿するのは危険。特に(a) sea_oki「小舟と大波だが視点は岸型サイドビュー」という自己矛盾気味のブリーフ、(b)「かこう と さんばし が隣接」というトポロジ制約付きワールドマップは、生成失敗→Photoshop手作業合成コースの筆頭で、なぞなぞトレインの律速要因そのもの。加えてdexProfile本文(14種×funFacts4件≒56テキスト)のかな書き・ナレ規約レビューもユーザー律速。企画書は生成コール数だけ数えてユーザー時間を一切予算化していない。

- **3-7歳対応の穴が複数。** (1)「あと Nひきで いけるよ！」は未就学児が読めない——Unity側にナレーションpipelineがなく(女性ナレはWeb側common/narration.js)、企画書に音声計画が丸ごとない。図鑑funFactsも読み聞かせ不能なら3-5歳には無意味。 (2) 海=魚影なし+待ち5〜8秒(oki)は「最長の無入力時間×最少の視覚フィードバック」の組み合わせで、現行の子供向け担保(2-5秒+見える魚影)を最年少層から奪う。8秒固定を「ガード」と呼ぶが根拠がない。 (3) 解放閾値(5/12/20/川累計10)は1セッションあたり平均釣果数のデータゼロ・Unityにテレメトリなしで設定されており、チューニングが盲目。 (4) wakasagi「群れ」のメカニクスが未定義。 (5) super2種がボーナス極低確率のみ=図鑑コンプ不能感への手当(遭遇pity)がない。

- **二重正本(JS正本+C#手複製)は既に生まれた時点で乖離している。** TsuriFishData.csのヘッダは「common/tsuri/fish-data.js の純C#移植」と書くが**そのファイルは存在しない**(Web版削除済み)。また「region IDはTsuriFishDataのzones語彙と完全一致」と言うが、現行C#のTsuriSpeciesに**Zonesフィールドはない**——一致相手は企画書内の表だけ。この規約のまま7ロケ×Spawns×WeightMul×待ち時間を手で二重メンテするなら、パリティ自動検査(JSONダンプdiff等)を§3.5の不変条件に加えないと乖離は必然。

- **Phase A「M」は過小見積もり。** controller切替(回帰確認込み)+アトミックIO/opId/outbox/fishdexストア/Merge可換テスト新設+新ロケ3+新種2+SpriteCatalogは実質L。また「asase現行5種そのまま=挙動不変」と言いつつ§3.2表はasase待ち時間を2〜4秒と記載(現行アサートは2〜5秒)——2-4は2-5内なのでテストは緑のまま**挙動だけ変わる**、という「テスト無変更=挙動不変」のすり替えが潜んでいる。

- **凍結するpayloadに未設計機能の投機的フィールドが混入。** 起動payloadのgearEffect/lureTableIdは装備・ショップ(Phase G、アイコン発注すら凍結中)の前方参照。「アートなし種を図鑑の空きスロットにしない」と同じ論理を自分のスキーマに適用するなら、これらも純加算で後入れすべきで、v1凍結物から外すのが一貫している。

- **細部の未定義**: 図鑑グリッドで「未遭遇=エントリなし」が画面上どう見えるか(非表示か「?」枠か)未指定——分母「X/Yしゅるい」を出す以上、mizuumi解放前の子に見えない魚の枠をどう見せるかはコンプ動機の根幹。Unity図鑑UI(スクロールグリッド+詳細+NEWバッジ)をUiFactoryコード生成で「S〜M」も楽観的。
