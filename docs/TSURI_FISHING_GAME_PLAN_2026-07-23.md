# ポノのつりゲーム — 川づり・うみづり → クッキング → お弁当 一気通貫プラン

> **⚠️ 2026-07-24 追記: Web実装は廃止済み — Unity (KawaGlint) へ完全移行**
>
> 本書が対象としていた Web 版実装 (`tsuri-kawa/`、`common/tsuri/core.js・input.js・fish-data.js`、`tests/tsuri_core_regression.cjs`) は 2026-07-24 にリポジトリから削除された。KawaGlint (Unity URP 川面スパイク) 側で同じ状態機械 (cast → wait → bite → renda → tug-stub → landed/escaped) の C# 忠実移植が完成し (EditMode 24件 + PlayMode 4件×2回 = 計32件のテストで実証)、タップでキャスト→あたり→フッキング→連打→キャッチまで遊べるゲームプレイが成立したため、ユーザー判断でつりゲームの開発を Unity 版へ一本化した。WebGL 変換・ネイティブアプリ配信基盤 (App Store / Play Store 申請、Capacitor 組み込み等) は容量面の懸念から今回は見送り、配信手段は本当に必要になった時に別途検討する (例: 水表現だけ軽量版に差し替える等)。
>
> **今後の実装の正本**: `unity/PonoNativeGames/Assets/Pono/Games/KawaGlint/` (セットアップ・ビルド・QA手順は同ディレクトリの `README.md`)。なお過去のクレーム履歴が参照する `docs/unity-migration/kawa-glint/DESIGN.md` は現時点でリポジトリ未収録。本書はゲームデザインの正本 (失敗ペナルティなし・暗黙アシスト・pity救済・魚種データ・装備/図鑑/在庫連携構想) として引き続き有効なため、歴史的経緯の参考資料として削除せず残す。

作成日: 2026-07-23 / 対象: 3〜7歳 / 横画面16:9 / 実装: sonnet5並列エージェントチーム前提

- 正本参照: `docs/HATAKE_TO_BENTO_LOOP_PLAN_2026-07-23.md`(以下「畑プラン」)。共有在庫まわりで本書と畑プランが矛盾した場合は**畑プランが正**。
- 本書は6ドメイン設計メモ+クロスレビュー12件の統合版。矛盾したレビュー指摘は統合ライターが裁定し、理由を各所に **「裁定:」** として残す。反映見送りのcritical/moderate指摘は §11「今回は入れないもの」と §10「実装前の確定ゲート」に明示。

## 1. 結論

1. 川づり `tsuri-kawa/`、うみづり `tsuri-umi/` の2独立ゲーム + 共有コア `common/tsuri/`(core.js / input.js / gear.js / fish-data.js / fishdex.js)の構成。各ゲームは規約どおり index.html + styles.css + js/logic.js(coreへのチューニング注入層)+ js/game.js。
2. コアループは「キャスト(1タップ)→ 待つ → 前あたり → 本あたり → タイミングタップ → 連打で引き寄せ → キャッチ演出」。1キャッチ20〜40秒、1セッション約2〜3分。**失敗しても何も失わない**(餌・どんぐり・装備の消費ゼロ、減点なし、次のあたりが早く来るだけ)。
3. 難易度は本人選択の2モード「のんびり🐟(既定)/ めいじん🎣」。左右ドラッグの上級操作は**めいじんモード限定**で、guragura-seesaw 確立の touchstart/touchmove/touchend/touchcancel パターンを踏襲。**裁定: v1ではめいじん限定魚種を作らない**(めいじんの報酬はレア出現率アップのみ。のんびり専門の3〜4歳の図鑑が永久に埋まらない構図を避ける — fish_data/core_loop 双方へのレビュー指摘を採用)。
4. 釣った魚は畑プランの共有在庫 `pono_food_inventory_v1` の `raw` に `fish_*` IDで乗せる(**別在庫システムの新設禁止**)。最初の縦切りは「川づり さけ(`fish_salmon`)→ 既存レシピ `yakizake` → お弁当『やきざけ』」。kitchen側は既存レシピへの `fishNeeds` + `producesPreparedId` の2フィールド追加のみ、**新規レシピ・新アートゼロ**で釣る→つくる→つめるが成立する。
5. 装備は竿・糸・ルアーの3系統×3レベル(ルアーのみ川/海別、竿・糸は共通)。Lv1=スターター無償ギフト、Lv2=ショップ購入(どんぐり、既存 `PRICE_BY_RARITY={normal:15,rare:25,super:35}` 流用)、Lv3=実績ギフト(非売品)。**装備は「所要時間」と「レアな出会い」だけを変え、釣れる/釣れないを変えない**(Lv1装備で全normal魚とレシピ必須魚が必ず釣れることを不変条件とする)。
6. ショップは既存のJST朝夕ローテ枠に混ぜず、**常設「つりの どうぐ」棚**を別セクションで追加(machizukuri の PART_COSTS / buyAndPlace 型)。ギフト付与の正本は**ランタイム側**(achievements集計)に置き、rewards.json は表示メタのみ(**裁定:** shop-catalog.js 自身のコメントにある `_loadRewardsJSON` 404既知問題を実コードで確認済みのため、fetch依存の付与は不採用)。
7. 図鑑は既存 `common/encyclopedia.js` へ統合せず、schema/UI互換の**独立「おさかなずかん」**(`pono_fishdex_v1`)。未遭遇 / 遭遇済み未捕獲(シルエット)/ 捕獲済み の3状態を持つ。**裁定: 図鑑カウントの正本は fishdex 側**(在庫 `earned` からの導出案は非食用種・firstDate で破綻するため不採用。在庫は食材数の正本、fishdexは図鑑の正本、同一opIdで両方を冪等更新)。
8. tier: 操作系は全tier同一。free/book は魚種・コレクションルアーを「まいつき ふえていくよ」の伸びしろ表現で月次追加。bento/kitchen 側の魚印・消費演出は畑プラン§8と同じく `PonoTier.isApp()` ガード。
9. core.js の API は Phase 0 末で凍結するが、**tugステート(無効化フラグ付きスタブ)と gearMods 受け口(ニュートラル既定値)を凍結時点から含める**ことで後続Phaseを純加算に保つ(roadmapへの2レビューが同一指摘、採用)。
10. 音: SE3点(キャスト/あたり/ファンファーレ)を Phase 0 から `common/se.js` 経由で。ナレは女性ナレーター既存パイプライン(Gemini "Leda" 1.15x, common/narration.js)のみ、キャラ肉声・fal-ai TTS禁止。ハプティクスは `common/haptics.js` の PATTERNS に `fishingBite` を追加して `Haptics.fire('fishingBite')`(`navigator.vibrate` 直書き禁止 — 実コードで PATTERNS/opt-out/throttle の存在を確認済み)。

## 2. 体験フロー

### 2.1 川と海の差別化

| 軸 | 川づり(入門・癒し) | うみづり(冒険・大物) |
| --- | --- | --- |
| 雰囲気 | 木漏れ日・透明な浅瀬・**魚影が見える** | 水平線・波・**魚影は見えない**(ウキと竿のしなりで読む) |
| あたりまでの待ち | 短い(2〜5秒)、テンポよく釣れる | 長め(4〜8秒)、前あたり演出でドラマ |
| 魚のサイズ/引き | 小〜中、連打8〜12回目安 | 中〜大、連打12〜18回目安 |
| あたりサイン | 魚影がルアーに近づくのが見えてからウキが沈む(視覚予告=幼児が構えられる) | ピクピク(前あたり)→ガボッ(本あたり)の2段階、音とハプティクスに寄せる |
| ドラッグ(めいじん) | 例外的に `fish_unagi` のみ1往復の体験版 | 中型以上×rare以上(`size>='m' && rarity>='rare'` のフィールド条件)で発生 |
| 情緒 | 「みつけて釣る」観察の喜び(3〜4歳の主戦場) | 「なにが来るかわからない」くじ引きの喜び(5〜7歳の主戦場) |

**裁定:** 「中型以上・レア魚」のような形容詞条件は禁止し、すべて `size` / `rarity` / `movePattern` フィールド参照で記述する(レビュー採用)。

### 2.2 1キャッチの流れ

1. **キャスト**: 水面の波紋スポット2〜3個から好きな場所をタップ。エイム不要・失敗なし(スポットは抽選テーブルが違うだけ)。
2. **待つ**: 2〜8秒。先行タップはペナルティなしで無視。
3. **前あたり**: ウキがピクピク(0.8〜1.2秒)+効果音。
4. **本あたり**: ウキがガボッ+画面縁が光る+「!」+ `Haptics.fire('fishingBite')`。
5. **タイミングタップ**: 画面のどこでもタップでフッキング。窓: のんびり1.5秒+救済遅れタップ0.5秒(実効2.0秒)/ めいじん0.8秒。早すぎるタップは失敗にしない(「まだまだ〜」演出のみ)。
6. **連打で引き寄せ**: タップでゲージ増、放置で緩やかに減少、**ゲージ床30%で0に戻らない**。断続タップでも伸びる緩い間隔判定(連打スタミナゲート化の防止)。どの装備でも1匹5〜12秒・最大15〜20タップに収まることを数値目標とする。
7. **キャッチ演出**: 魚ジャンプ→ポノが両手でキャッチ→名前+「つれた!」→図鑑・在庫・バケツへ。約3秒、タップでスキップ可。**図鑑/在庫のop発行は釣果確定時**(演出スキップでも必ず発火)。

### 2.3 失敗の扱いと暗黙アシスト(全モード共通)

- 窓を逃す → 「およいで いっちゃった。でも また くるよ」+ 待ち時間半減で即・次のあたり。消費物ゼロ。
- 2回連続逃し→3回目は窓2倍。3回連続→4回目は自動フッキング(連打から開始)。モード設定に関係なく発動。
- 連打が遅い → ゲージ床で停止、床のまま10秒で「おたすけ」(ポノが一緒に引いて自動で釣り上がる。のんびりのみ。めいじんは床維持=詰みはしない)。**おたすけは装備非依存**(捕獲保証はベースゲーム側の責務、装備は時短のみ — レビュー採用)。
- super魚の救済(pity): **裁定:「同一superを3回逃すと」の閾値待ち方式は廃止し、同一speciesを逃すたびに窓+20%の累積即時方式**に変更(出現率5%のsuperで閾値方式は救済が遠すぎるとの指摘採用)。逃走記録は fishdex の `escapedCount` を参照。
- touchcancel/バックグラウンド化 → 「逃した」ではなく「待ち状態への巻き戻し」。ネガ演出(魚の嘲笑・ポノが泣く)は全面禁止。タイムアップ・残機・ゲームオーバー概念なし。

### 2.4 めいじんモードと左右ドラッグ

- モードはセッション開始画面の2択カード+ポーズからいつでも変更。ゲームごとにLS保存。
- ドラッグ発生: めいじん限定。連打中に魚が左右へ走る(魚影+大矢印+竿の傾き)→**逆方向へドラッグ**で押さえ込み連打へ復帰。猶予2.5秒、左右2択のみ、受付は画面全体。
- 失敗しても魚は逃げない: 「いとが のびちゃった」でゲージが床まで減る+時間延長のみ、3〜4秒後に再走行でリトライ無限。
- **段階導入の練習台**: rare帯の `fish_ika`(横に泳ぐ)に軽い1往復ドラッグを付与し、super のドラッグへの練習ステップにする(fish-data の `movePattern`/`challengeProfile` で種別上書き — レビュー採用)。
- **のんびりモードでは同じ魚が連打多め(ドラッグなし)で釣れる**。ドラッグ必須の魚は存在しない(3歳救済+図鑑コンプ保証)。

### 2.5 セッションとリプレイ動機

- 5匹目(または「おしまい」)で「きょうの おさかなバッグ」まとめ: 釣った魚が並ぶ+どんぐり付与(`addAcornsDaily`)+「キッチンへ もっていく?」導線。
- リプレイ動機: (a) 図鑑コンプ(シルエット)、(b) 食のループ(お弁当のために釣る)、(c) 装備の伸びしろ、(d) 景色ローテ — **裁定: 実時刻の時間帯ローテ・実天気連動は不採用。hyokkori型の「来訪回数ベース」ローテ+ゲーム内ランダム天候に置換**し後続Phaseへ(実時刻依存は日中しか遊べない幼児の取り逃しを生むため)。レシピ必須魚は全時間帯・全モード・normal装備で入手可能を不変条件とする。

## 3. データ設計(コード例つき)

### 3.1 ID契約の全体図(最重要・全チーム共通の正本)

```
釣果 speciesId ──(fish-data.js の inventoryKey)──▶ raw 在庫ID (pono_food_inventory_v1.raw)
raw 在庫ID ──(レシピの fishNeeds)──▶ kitchen レシピ ──(producesPreparedId)──▶ prepared ID
prepared ID ──(PREPARED_ID_BY_BENTO_NAME 単一対応表)──▶ bento おかずカード(nameキー)
```

**縦切り対応表(導入順):**

| 順 | 釣り場 | speciesId | raw在庫ID | kitchenレシピ | fishNeeds | producesPreparedId | お弁当カード | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 川 | `fish_salmon` | `fish_salmon` | `yakizake`(既存) | `{fish_salmon:1}` | `yakizake` | やきざけ(既存) | 新アートゼロの最短縦切り |
| 2 | 海 | `fish_ebi` | `fish_ebi` | `ebi_fry`(既存) | `{fish_ebi:1}` | `ebi_fry` | エビフライ(既存) | needs:['shrimp_breaded']は無変更。衣付き素材のため見た目連続性が弱い点は注記(衣付け演出は後続検討) |
| 3 | 川 | `fish_ayu` | `fish_ayu` | `ayu_shioyaki`(新規) | `{fish_ayu:1}` | `ayu_shioyaki` | あゆのしおやき(新規) | salmonのgrillエンジン流用 |
| 4 | 海 | `fish_aji` | `fish_aji` | `aji_fry`(新規) | `{fish_aji:1}` | `aji_fry` | アジフライ(新規) | shrimp_breadedのbread+fryエンジン流用 |

**裁定(さけの在庫ID):** 3メモで `salmon` / `fish_salmon` / `fish_sake` に割れていたが **`fish_salmon` に統一**。理由: (a) `needs:['salmon']` は演出用素材IDであって在庫消費の意味を持たず(kitchen実コード確認済み)、在庫との対応は `fishNeeds` で明示するため既存 `salmon` 素材・yakizakeレシピ・salmon専用シネマ演出は**一切改名不要**、(b) raw層のprefixが例外ゼロで統一される、(c) 種の英名 "salmon" がkitchen素材IDとgrepで対応する。命名規則は「原則ローマ字(`fish_ayu` 等)、kitchen既存素材IDがある種のみ英名流用(`fish_salmon`)」。

**命名・判定の禁則:**
- `fish_` prefix は「釣りで得た水産素材」の名前空間(えび・いか等の非魚類も含む)。ただし **prefixをロジック判定に使うのは禁止**。カテゴリ判定は `FishData.isFishInventoryKey(key)` / `FISH_INVENTORY_KEYS` Set に一本化。
- 汎用の `fish` という素材ID・在庫IDは作らない。「さけのしおやき」等 yakizake と実質同一の新レシピは作らない。
- 新設する kitchen INGREDIENTS の id は raw在庫IDと**完全同一**(`fish_ayu` / `fish_aji` / ...)。例外は既存 `salmon` のみ。
- **prepared ID = recipe ID を規約にしない**(畑の tomato→petit_tomato で既に破綻している)。レシピ側の `producesPreparedId` フィールドが唯一の正本(レビュー採用)。

### 3.2 魚マスターデータ `common/tsuri/fish-data.js`

コアループが読むフィールド契約(レビュー指摘の「魚マスターデータ契約未定義」への回答)。DOM非依存・node testable。

```js
// window.PonoFishData.SPECIES
var SPECIES = [
  // ─ 川 ─
  { id:'fish_ayu',      name:'あゆ',     rarity:'normal', size:'s', zones:['river'], edible:true,
    inventoryKey:'fish_ayu', weight:22, sizeRangeCm:[12,22],
    movePattern:'static', challengeProfile:{ windowMul:1.0, tapsBase:8,  runs:0 } },
  { id:'fish_nijimasu', name:'にじます', rarity:'normal', size:'m', zones:['river'], edible:true,
    inventoryKey:'fish_nijimasu', weight:20, sizeRangeCm:[20,35],
    movePattern:'static', challengeProfile:{ windowMul:1.0, tapsBase:10, runs:0 } },
  { id:'fish_wakasagi', name:'わかさぎ', rarity:'normal', size:'s', zones:['river'], edible:true,
    inventoryKey:'fish_wakasagi', weight:18, sizeRangeCm:[6,12],
    movePattern:'school', challengeProfile:{ windowMul:1.3, tapsBase:6,  runs:0 } }, // 入門魚。図鑑解説は「みずうみ」正記(§3.4)
  { id:'zarigani',      name:'ざりがに', rarity:'normal', size:'s', zones:['river'], edible:false,
    inventoryKey:null, weight:5, sizeRangeCm:[8,12], movePattern:'static',
    challengeProfile:{ windowMul:1.2, tapsBase:6, runs:0 } },   // 非食用: 図鑑+どんぐりのみ
  { id:'fish_salmon',   name:'さけ',     rarity:'rare',   size:'l', zones:['river','sea'], edible:true,
    inventoryKey:'fish_salmon', weight:8, sizeRangeCm:[50,75],
    movePattern:'static', challengeProfile:{ windowMul:0.9, tapsBase:12, runs:0 } }, // 唯一の両生息・物語の橋渡し
  { id:'fish_unagi',    name:'うなぎ',   rarity:'super',  size:'m', zones:['river'], edible:true,
    inventoryKey:'fish_unagi', weight:2, sizeRangeCm:[40,60],
    movePattern:'slippery', challengeProfile:{ windowMul:0.8, tapsBase:14, runs:1 } }, // 川唯一のドラッグ体験版(1往復)
  { id:'treasure_boot', name:'ながぐつ', rarity:'normal', size:'s', zones:['river'], edible:false,
    inventoryKey:null, weight:4, movePattern:'static',
    challengeProfile:{ windowMul:1.3, tapsBase:4, runs:0 } },
  // ─ 海 ─ (fish_aji / fish_iwashi / fish_ebi = normal, fish_ika / fish_tai = rare,
  //          fish_maguro = super(runs:2〜3), hitode = 非食用。fish_ika は runs:1 の軽ドラッグ練習台)
];
// 抽選: レアリティ既定重み(normal70/rare25/super5)を土台に species 個別 weight で補正。
// 非食用種の合計出現率は normal 帯の10〜15%に抑え、同一セッション内の同じ「たからもの」は
// 2回目以降重み減衰(セッション内デデュープ)。ルアー/竿による重み補正係数は gear.js 側(§3.5)。
```

- レアリティ語彙は既存ショップと同一の **normal / rare / super** のみ。size(s/m/l=連打量)・zones・movePattern は独立フィールド(4軸混在の禁止 — レビュー採用)。
- **数値のオーナーシップ:** fish-data.js が持つのは係数・ティア(windowMul等)まで。ティア→具体値(窓秒数・タップ回数・ドラッグ距離px)のマッピングと基本定数(のんびり1.5s等・ゲージ床30%)は **core.js のチューニング表所有**。装備は上限付き乗数のみ(§3.5)。実機プレイテストでの調整は core の表1箇所で完結する。上の数値はすべて「初期目安値」。
- 図鑑プロフィール(`readingName, category, subtitle, habitat, sizeText, funFacts[]`)は museum-data.js の HARDCODED_PROFILES と同形で species に併記。**わかさぎは habitat を「みずうみ」と正記**して川ゲームに残す(裁定: 差し替え・湖ステージ新設はコスト過大。図鑑が正しい知識を教える方を優先)。
- aquarium の観賞キャラ(clownfish 等)との重複は禁止。**assets/images/ocean/ の既存熱帯魚アートの流用も禁止**(「水槽のともだちを食べる」構図の回避を優先し、roadmapメモの流用圧縮案は不採用。魚アートは全て新規GPT Image 2生成)。

### 3.3 釣果イベント → 在庫・図鑑(producer契約)

```js
// キャッチ確定イベント (logic.js 純関数が生成、game.js が適用)
{ opId:'fishcatch:<uuid>', source:'fishing_river'|'fishing_sea',
  speciesId:'fish_aji', rarity:'normal', sizeCm:18, caughtAt:1753234212000 }

// 適用手順 (畑プラン §5.2 の inventoryOutbox パターンを釣りセーブに複製):
// 1. 自セーブ(pono_tsuri_kawa_v1 等)の inventoryOutbox に先に書く
// 2. navigator.locks.request('pono-food-inventory-v1', ...) 内で
//    FoodInventory.applyOp({opId, add:{raw:{fish_aji:1}}})  … edible のみ
// 3. fishdex (pono_fishdex_v1) を同一 opId で冪等更新 (count/firstAt/maxSizeCm/seen)
// 4. 在庫と図鑑の両方が保存成功した後だけ ack。起動時に残outboxを再実行
```

- **釣りゲームは `pono_food_inventory_v1` を直接localStorage操作してはならない**。必ず food-inventory.js の公開API経由。
- **裁定(図鑑カウント):** fishdex が count/firstAt/seen/escapedCount の正本、在庫 `earned` は食材数の正本。「earnedから導出」案は非食用種(在庫に乗らない)とfirstDateで破綻するため不採用。非食用種は在庫opなし・fishdex+どんぐりのみ。食用魚はレシピ有無に関わらず必ず raw にコミット(レシピ無し魚種の available 増は無害と宣言。kitchenには fishNeeds を持つレシピが無い限り露出しない)。
- **producer登録規約(畑チームF-0契約に含める):** producerは閉集合(畑+釣り+kitchen+bento)ではなく**登録制のオープン集合**とし、新producerは (a)固有opIdプレフィックス(`fishcatch:`/`harvest:`/将来 `gift:` 等)、(b)自セーブ内outbox、(c)モジュール公開API経由、の3点を満たせば追加可能。appliedOpsローテ(128件)は「対応producerのoutbox ack済みopのみローテ対象」を厳守。
- **リリース順序の保険:** food-inventory.js が未着地でも、釣りは outbox に積み置いたまま単体出荷できる。モジュール着地後の初回起動で安定opIdのままreplay(二重加算なし)。

### 3.4 おさかなずかん `pono_fishdex_v1`

```js
{ species: { fish_aji: { seen:true, count:3, escapedCount:1, maxSizeCm:22, firstAt:1753... },
             fish_maguro: { seen:true, count:0, escapedCount:2 } /* = シルエット表示 */ } }
```

- 3状態: **未遭遇**(エントリなし)/ **遭遇済み未捕獲**(seen:true, count:0 → シルエット)/ **捕獲済み**。逃げられた魚も本あたり成立時点で seen 記録(手ぶら感ゼロ)。
- UI は encyclopedia.js のカード一覧+詳細オーバーレイ構成・profileスキーマをクローンした**派生モジュール**(`common/tsuri/fishdex.js` + 各ゲームからの図鑑ボタン)。**encyclopedia.js 本体・museums.json・creatures.json には一切触らない**(実コード確認: encyclopedia.js は MuseumData と getUnlockedSea にハードコード結合しており、混ぜると水族館マップに魚が混入する)。シルエットは既存 locked-img と同じ CSS filter(grayscale+brightness)で生成し追加画像不要。

### 3.5 装備データ `common/tsuri/gear.js` + `pono_tsuri_gear_v1`

**裁定:** ファイルは roadmap 案の `common/tsuri/gear.js` に統一(equipmentメモの `fishing-common/` は不採用、ディレクトリを増やさない)。LSキーも `pono_tsuri_gear_v1` に統一。

```js
// カタログ (12点): kind:'rod'|'line'|'lure', level:1..3, water:'both'|'river'|'sea',
// rarity: PRICE_BY_RARITY と同一キー, obtain:'starter'|'shop'|'gift'
var ITEMS = [
  { id:'rod_wood',    kind:'rod',  level:1, water:'both',  rarity:'normal', obtain:'starter', name:'きの つりざお' },
  { id:'rod_shiny',   kind:'rod',  level:2, water:'both',  rarity:'rare',   obtain:'shop',    name:'ぴかぴか つりざお' },
  { id:'rod_rainbow', kind:'rod',  level:3, water:'both',  rarity:'super',  obtain:'gift',    name:'にじいろ つりざお' },
  { id:'line_basic',  kind:'line', level:1, water:'both',  rarity:'normal', obtain:'starter', name:'ふつうの いと' },
  { id:'line_strong', kind:'line', level:2, water:'both',  rarity:'rare',   obtain:'shop',    name:'じょうぶな いと' },
  { id:'line_star',   kind:'line', level:3, water:'both',  rarity:'super',  obtain:'gift',    name:'きらきら いと' },
  { id:'lure_river_basic', kind:'lure', level:1, water:'river', rarity:'normal', obtain:'starter', name:'あかい うき' },
  { id:'lure_river_bug',   kind:'lure', level:2, water:'river', rarity:'normal', obtain:'shop',    name:'むしの ルアー' },
  { id:'lure_river_gold',  kind:'lure', level:3, water:'river', rarity:'rare',   obtain:'gift',    name:'きんの ルアー' },
  { id:'lure_sea_basic',   kind:'lure', level:1, water:'sea',   rarity:'normal', obtain:'starter', name:'あおい うき' },
  { id:'lure_sea_squid',   kind:'lure', level:2, water:'sea',   rarity:'normal', obtain:'shop',    name:'いかの ルアー' },
  { id:'lure_sea_rainbow', kind:'lure', level:3, water:'sea',   rarity:'rare',   obtain:'gift',    name:'にじの ルアー' },
];

// pono_tsuri_gear_v1
{ owned:{ rod_wood:true, ... },
  equipped:{ river:{rod,line,lure}, sea:{rod,line,lure} },
  grants:{ 'gift:river_5catch':true, 'buy:rod_shiny':true } }  // 冪等キー(二重付与・二重購入防止)

// core への唯一の入力 (装備の直接参照禁止):
PonoTsuriGear.effectFor(equipped)
// → { windowMul:1.0..1.5,    // 竿: タイミング窓の余裕 (上限付き乗数)
//     gainMul:1.0..1.6,      // 竿: タップ毎ゲージ増加 (=引き寄せの速さ)
//     decayMul:1.0..0.5,     // 糸: 放置減衰・ドラッグ失敗時減衰の緩和
//     lureTableId:'river_basic' }  // ルアー: 抽選テーブルキー (難易度には影響させない)
```

- **不変条件(確定ゲート対象):** 装備は成功可否ではなく所要時間・出会いのみを変える。Lv1フル装備で全normal魚+レシピ必須魚種が3歳児の断続タップで完走できる(**Lv1の減衰は「100%」でなく30%程度の緩い基準値に修正** — 難易度カーブ逆転のレビュー指摘採用)。竿Lv3で所要時間約4割短縮が体感目標。レア魚の捕獲難易度は challengeProfile 由来であり、ルアーで出会いが増えても「届いたら難しくなる」逆転を作らない(rare/superの窓・連打はのんびりアシストで必ず完走可能)。
- **購入のアトミック性(裁定・レビュー2件採用):** `buyGear` は (1) `navigator.locks.request('pono-tsuri-gear-v1')` 内で `grants['buy:<id>']` + `owned` を**先に**書き読戻し確認 → (2) `spendAcorns()`。中断時の最悪ケースが「タダで貰えた」側に倒れる(どんぐりだけ消える事故を構造的に排除)。リロード時に grants にあるが owned にない項目は自動補完。
- **ギフト配送(裁定):** 実績閾値と付与ロジックの正本は gear.js + achievements ランタイム側。rewards.json には表示メタのみ追加し、fetch失敗でも `grantGift` は発火する。実績条件は累計匹数のみの緩い設計(例: 川で5ひき→きんのルアー、川+海で合計15ひき→にじいろつりざお)で、期限なし・全員必達。
- スターター4点(竿・糸・両うき)は machizukuri の STARTER_VEGGIE_BALANCE 方式で初回ロード時に owned へ静かに投入。
- ショップ連携: `PonoShopCatalog.computeFishingShopItems()` を新設し、`obtain==='shop'` かつ未所持のものを `{id,name,rarity,costAcorns,owned}` で返す(価格は `PRICE_BY_RARITY[rarity]` 解決、ハードコード複製禁止)。既存ローテ枠とは独立の常設棚。購入済みは非表示でなく「かった!」チェック表示。
- **どんぐり経済(レビュー指摘の律速変数を確定):** 釣りの付与は「1匹1こ+はじめて釣れた魚ボーナス1こ」、ゲーム別日次cap **8**(川・海それぞれ。`addAcornsDaily(gameId, n, 8)`)。総量cap 25/35(実コード確認済み)の範囲内。ショップ購入必要総額は 15+25+25+15 = 80どんぐり(Lv3は非売品)なので、釣りだけ遊ぶ子でも Day2〜3 で初購入(ルアー15)、約2週間でLv2一式+Lv3ギフト到達 =「2〜3日にひとつ新装備」を維持。非食用たからもののどんぐりは1〜2こ、cap到達時はどんぐり表示を出さず図鑑演出のみにフォールバック。

### 3.6 kitchen / bento 連携フィールド

```js
// kitchen RECIPES への追加 (既存 yakizake はこの2フィールド追加のみ。needs/演出/CSSは無変更)
{ id:'yakizake', name:'やきざけ', ..., needs:['salmon'], startFromRaw:true,
  fishNeeds:{ fish_salmon:1 }, producesPreparedId:'yakizake' },

// bento 側: 日本語nameキー → prepared ID の単一対応表 (畑分と統合した1つの表、共通モジュール側定数)
const PREPARED_ID_BY_BENTO_NAME = { 'プチトマト':'petit_tomato', /*畑分*/
  'やきざけ':'yakizake', 'エビフライ':'ebi_fry', 'あゆのしおやき':'ayu_shioyaki', 'アジフライ':'aji_fry' };
```

- `fishNeeds` は畑プランの `farmNeeds` と完全同一セマンティクス(在庫があればバッジ表示、**レシピ完了コミット時のみ**同一opId+lock内で raw−1/prepared+1、途中離脱・リロード・「もどる」では非消費、在庫レースでも完了は止めず自由調理として完走)。
- **裁定(フィールド統合):** レビューは単一 `inventoryNeeds` への一本化を推奨したが、**畑プランが farmNeeds で確定済みのため v1 は fishNeeds 並設+「kitchen完了コミットは farmNeeds ∪ fishNeeds を union して同一opIdで消費する」union規約**を採る(正本の畑プランを改変しない方を優先)。第3の入手経路(ranch_等)が現実化した時点で inventoryNeeds への統合を再検討(§11)。両方を持つ複合レシピは v1 では作らない。
- `producesPreparedId` は畑チーム Phase 1 契約に含め、tomato→petit_tomato と yakizake→yakizake を同一機構で表現する。
- **bento 側の F-0 必須作業(「追加不要」は誤り — レビュー採用):** やきざけカード自体は既存だが、name→prepared IDマッピング登録・「つりで とった 1こ」バッジ・`stageComplete()` 消費対象への追加は縦切り時点で必要。bentoおかずは安定id不在のnameキーであり、同名カードが OKAZU_MEAT 系と free-layout 系の**複数配列に重複定義**されているため、印は name→prepared ID 解決を通る全カード描画経路に適用し、消費dedupeはカード数でなく distinct prepared ID で行う。
- 変換比率は**1:1(魚1匹→おかず1食分)で畑と統一**。サケ半身もわかさぎ5匹表示も在庫計算は1:1(見た目はアートで表現)。**レアリティの価値表現はクッキング外(図鑑演出・どんぐり・釣り上げ演出)で行い、変換比率・レシピには持ち込まない(v1確定)**。
- 新規レシピの調理エンジンは既存流用のみ: あゆのしおやき=salmonのgrill subSteps(oil省略で1工程短縮)、アジフライ=shrimp_breadedのbread+fry。新エンジンは作らない。

### 3.7 core 状態機械とチューニング所有権

```
cast → wait → bite(窓) → renda(連打ゲージ) → tug(オプショナル、Phase 0はdisabledスタブ) → landed / escaped
```

- **Phase 0 で凍結する core API に最初から含めるもの:** (a) tug ステート(無効化フラグ付き、状態名・遷移シグネチャ確定、実装は空)、(b) チューニング入力の `gearMods` フィールド(Phase 0 は `{windowMul:1, gainMul:1, decayMul:1, lureTableId:'<water>_basic'}` の定数)。これにより Phase 2(tug実装)と Phase 5(装備)は**core.js のシグネチャ変更なしの純加算**になる。
- 入力(`common/tsuri/input.js`): touchstart/touchmove/touchend/touchcancel 必須、pointer系は `pointerType!=='mouse'` で early return。追跡状態は `isTouching` / `dragDirection`(水平±24px閾値の符号のみ)/ `dragActive` の3つだけ。判定は毎フレームポーリング。touchcancel は中立リセットのみで失敗イベントを発火しない。最初の1本の identifier 固定。
- **UIコントロール除外ゾーン:** ポーズ・おしまい等のボタン上の touchstart は釣り判定にカウントしない(guragura同様 stage 要素にリスナーを張り、コントロール側で処理して伝播させない)。

## 4. UI方針

- 横画面16:9。縦向き注意は **2026-07-23修正後の slide/index.html 版**(screen.orientation優先+fail-open+try/catch)を踏襲(修正前実装のコピー禁止 — 既知バグの再輸入防止)。
- 開始フロー: 前回装備のまま「**すぐ つりに いく**」大ボタンで即開始。装備画面は小さな「どうぐを かえる」導線に格下げ(毎回3スロット画面を挟まない — レビュー採用)。新装備入手直後のみ自動装備+ナレ1回。
- セッション内の釣果は画面隅の**バケツ(ビク)**に魚がたまる表示で常時可視化(Phase 0 から。「釣った魚がどこにも見えない期間」を作らない — レビュー採用)。
- モード切替: 開始画面の2択カード+ポーズメニュー常設(めいじんで詰んだ子が自分で戻れる導線)。
- ずかん・ショップ・キッチンへの導線: まとめ画面から。「キッチンへ もっていく?」は在庫連携Phase以降に表示。
- logic.js 読み込み失敗対策の自動リトライ+エラーUIを両ゲームで標準実装(既知の無反応事故対策)。
- 画像は使用前に Read tool で実ARを確認し、container側を画像ARに合わせる(stretch絶対禁止)。

## 5. 段階導入(Phase 0〜7)

| Phase | 内容 | 規模 | 依存 |
| --- | --- | --- | --- |
| **0** | 川づりMVP(のんびりのみ): common/tsuri/core.js(**tugスタブ+gearModsニュートラル込みでAPI凍結**)+input.js+fish-data.js(川5種: ayu/nijimasu/salmon/zarigani/boot)、SE3点(common/se.js)、Haptics `fishingBite` 追加、バケツUI、opId付き捕獲outbox+fishdexストア(記録のみ)、`addAcornsDaily(cap 8)` 統合、tests/tsuri_core_regression.cjs、play.html `debugPlayable:true` 登録、sw.js bump | L | なし |
| **1** | うみづり追加: tsuri-umi/ 一式(core再利用実証)、海7種(aji/iwashi/ebi/ika/tai/salmon/maguro/hitode)、背景・チューニング差し替え、cap 8 | M | 0 |
| **2** | めいじんモード+左右ドラッグ: tugスタブの中身実装(シグネチャ変更禁止)、input.jsドラッグ追跡、川に fish_unagi・wakasagi 追加、**iOS実機のpointercancel検証必須** | S〜M | 0(1と並列可) |
| **3** | おさかなずかんUI: fishdex.js 派生図鑑(3状態表示・NEW演出・シルエット=CSS filter)、両ゲームに図鑑ボタン | S〜M | 0(1・2と並列可) |
| **4** | 食材連携の縦切り: outbox→food-inventory合流、yakizake に fishNeeds+producesPreparedId、bento の nameマッピング+バッジ+stageComplete消費、続けて fish_ebi→ebi_fry | M | 0、**畑プラン Phase 1〜2 完了**(food-inventory.js+kitchenのfarmNeeds配線が本番導入済み) |
| **5** | 装備・ショップ・ギフト: gear.js 効果有効化(gearMods生成のみ、core無変更)、buyGearアトミック購入、ショップ常設「つりの どうぐ」棚、ギフトのランタイム付与+rewards.json表示メタ | M〜L | 0(4と並列可) |
| **6** | 新規魚レシピ: ayu_shioyaki(川)/aji_fry(海)+bentoおかず配列追記+調理ステージアート | M | 4 |
| **7** | 仕上げ・公開: tier月次解放(isFishSpeciesUnlocked等)、景色ローテ(来訪回数ベース+ゲーム内天候)、ナレ文言仕上げ(narration.js)、debugPlayable解除、verification-loop | S〜M | 1, 2, 4, 5(**装備はユーザー明示要件のため公開前提に含める**。装備なし先行公開に切り替える場合はユーザー承認事項) |

### 並列エージェント分割(ファイル集合が互いに素の単位のみ)

| ID | 担当 | ファイル | 時期 |
| --- | --- | --- | --- |
| A | 川づり本体+コア新設 | tsuri-kawa/**, common/tsuri/core.js・input.js・fish-data.js, tests/tsuri_core_regression.cjs | Phase 0(**単独**) |
| B | うみづり本体 | tsuri-umi/**, tests/e2e/tsuri-umi/** | Phase 1(凍結後) |
| C | ドラッグ拡張 | common/tsuri/core.js(tugスタブの中身のみ)・input.js | Phase 2。**BとCは並列可**(裁定: tugをPhase 0で凍結済みスタブにしたためCの変更は加算的。状態名・シグネチャ変更が必要になった場合のみG経由) |
| D | 在庫・kitchen・bento | bento/kitchen.html, bento/index.html(+food-inventory.jsへの追記は畑チーム調整下) | Phase 4(1体に集約。RECIPESとOKAZUを別エージェントに分けない) |
| E | 装備・ショップ | common/tsuri/gear.js, shop/index.html, js/donguri-shop.js, common/shop-catalog.js, **assets/data/rewards.json, common/first-clear.js**(レビュー採用で追加) | Phase 5(Dと並列可) |
| F | 図鑑 | common/tsuri/fishdex.js, 各ゲームの図鑑ボタン | Phase 3 |
| G | 統合(各Phase末に直列1体) | play.html, sw.js, HANDOFF.md, AGENTS_CLAIMS.md, 両ゲーム ?v= 一斉更新 | 各Phase末 |

**競合ホットスポット:** play.html / sw.js CACHE_VERSION / common/tsuri/core.js / common/food-inventory.js(畑オーナー) / bento両HTML / **rewards.json(複数モジュール参照)** / AGENTS_CLAIMS.md・HANDOFF.md。共有 common/tsuri/*.js 更新時は両ゲーム index.html の `?v=` を揃って更新。各エージェントは commit 前に `git diff --stat` でスコープ外ファイル混入を確認(既知フィードバック準拠)。

### 画像アセット見積もり(GPT Image 2 固定、ocean既存アート流用禁止の裁定込み)

| 分類 | 点数 | 備考 |
| --- | --- | --- |
| 魚アート(川7+海7、salmon共用) | 13〜14 | 1魚種=1枚。シルエットはCSS filterで画像不要 |
| 背景+タイトルカード | 4 | 川・海16:9背景+メニューカードbg×2 |
| 装備アイコン | 12 | 3系統×3Lv+川海ルアー、ショップ商品画像兼用 |
| UI小物(ウキ・バケツ・水しぶき等) | 3〜5 | 水しぶきはCSS代替優先 |
| 調理ステージ(ayu 6枚+aji 4枚) | 10 | ebi_fry/yakizakeは既存流用。**レシピ1本につき3〜8枚が釣りアートとは別に必要**(レビュー採用で明記) |
| bento盛り付け | 2 | ayu_shioyaki / aji_fry のおかずカード画像 |
| **合計** | **約45〜50** | リテイク×1.5 ≈ **70〜75生成コール**。Higgsfield経由 `model:"gpt_image_2"` 明示指定、コスト事前確認 |

## 6. 子ども向け表示文言

すべて女性ナレーター第三者読み聞かせ視点。キャラ一人称ナレ禁止。

| 場面 | 文言 |
| --- | --- |
| 待ち | ウキを みててね |
| 前あたり | …きたかも? |
| 本あたり | いまだ! タップ! |
| 連打 | ぽんぽん タップで ひっぱろう! |
| 魚が走る(めいじん) | ひっぱられてる! ぎゃくに ひっぱって! |
| 逃した | およいで いっちゃった。でも また くるよ |
| おたすけ発動 | ポノも てつだうよ! |
| 非食用キャッチ | たからものを みつけたよ! ずかんに のせようね |
| 図鑑・未遭遇 | まだ あったことの ない おさかな だよ |
| 図鑑・遭遇済み未捕獲 | この まえ あった おさかな。つぎは つれるかな? |
| スターター付与 | ふくろうはかせから つりの どうぐの プレゼントだよ |
| ショップ購入 | あたらしい つりざおを てにいれたね! |
| ギフト実績達成 | たくさん つれた ごほうびに、きんの ルアーが とどいたよ |
| レシピ/おかずカードの印 | **つりで とった 1こ**(裁定: 「つった さかな 1こ」はえびで破綻するため種目非依存に統一 — レビュー採用) |
| 料理完了 | つりの ごちそうが できたよ! |
| 弁当完成(釣りのみ) | つりの ごちそうが おべんとうに はいったよ! |
| 弁当完成(畑+釣り) | はたけと つりの ごちそうべんとう! |
| tier伸びしろ(魚種) | あたらしい おさかなは まいつき ふえていくよ |
| tier伸びしろ(ルアー) | ルアーは まいつき ふえていくよ |
| 上位装備への誘い | もっと つよい さおなら つれそう!(「この竿だと釣れない」型のロック表現は禁止) |

## 7. tier方針

- `common/tier.js` に既存パターンで追加: `isFishSpeciesUnlocked(id)` / `isFishingGearUnlocked(id)` / `BOOK_FISHING_LURE_IDS`。
- **操作系・コアループは全tier同一**。差分は「魚種の月次追加」と「コレクションルアーの幅」のみ。
- **free:** 川3種+海3種(normal中心、`fish_salmon` 必含)から月次追加。装備はコア12点すべて到達可能(釣り→料理→弁当の連鎖体験自体が商品価値のため性能で削らない)。
- **book:** 月次コレクションルアー枠(性能ほぼ横ばい、呼べる魚の色替え等)。未解放は錠前でなく「棚に出さない or ?シルエット1枠」。
- **app:** 全開放。
- **制約(レビュー採用):** raw在庫に加算されレシピの fishNeeds になりうる魚種は、必ず free の基本装備で現実的な確率で釣れること。book/app 専用ルアーをレシピ必須魚種の唯一の入手経路にしない。
- **bento/kitchen 側:** 魚印・消費・完成演出は畑プラン§8と同一の `PonoTier.isApp()` ガード(表示だけでなく consume系 mutation もガード)。新規魚レシピ(ayu_shioyaki/aji_fry)の表示も free/book では非表示(「まいつき ふえていくよ」枠)。yakizake は既存レシピのため全tier表示のまま、fishNeeds バッジのみ isApp() ガード。
- **free/book での釣り raw earn は許可**(在庫はtier非依存で貯まり、app移行時に報われる)。表示のみガード。※三者確定ゲート対象(§10)。
- MVP報酬封印フラグ(`PONO_MVP_NO_REWARDS` 等)との整合は確定ゲート対象(§10)。

## 8. セーブ/同期

| キー | 内容 | 備考 |
| --- | --- | --- |
| `pono_tsuri_kawa_v1` / `pono_tsuri_umi_v1` | ゲーム進行・モード選択・**inventoryOutbox**(opId付き捕獲ログ) | Phase 0 から outbox 形式で保存し、在庫合流時にそのままreplay |
| `pono_tsuri_gear_v1` | 装備 owned/equipped/grants(冪等キー) | mutation は Web Locks `'pono-tsuri-gear-v1'` 内のRMWのみ(naive read-modify-write 禁止) |
| `pono_fishdex_v1` | 図鑑 3状態+count/escapedCount/maxSizeCm/firstAt | 在庫と同一opIdで冪等更新 |
| `pono_food_inventory_v1` | 共有食材在庫(畑チーム実装オーナー) | data-export / cloud-sync 対象化は**畑プラン§9で計上済み、二重追加しない** |

- 上記の釣り側新キー3系は `common/data-export.js` の書き出し/復元対象と cloud-sync スナップショット対象に追加(装備grantsだけ消えると「復元後に再付与されない」事故になるため)。
- food-inventory.js への契約要求(畑Phase 1着手前に合意): (a) `ensureEntry(kind,id)` による**未知IDの遅延生成**、(b) 正規化は**未知IDを削除しない**(値clampのみ。釣り対応前ビルドが魚在庫を消さないダウングレード耐性)、(c) `fish_*` IDレジストリの追記口、(d) producer登録規約(§3.3)、(e) `producesPreparedId` フィールド仕様、(f) farmNeeds∪fishNeeds のunion消費規約。
- `native/content-manifest.json`: common/tsuri/*.js 新規収録+food-inventory.js 追記時の再収録(ハッシュ更新)を統合エージェントGの引き継ぎ事項とする。
- sw.js は CACHE_VERSION インクリメントのみ(network-first のため CRITICAL_ASSETS 追加不要)。

## 9. テスト計画

### core純関数(tests/tsuri_core_regression.cjs, node)
- 状態遷移(cast→wait→bite→renda→landed/escaped)、tugスタブが disabled で素通りすること、gearModsニュートラル値で挙動不変。
- 窓判定: のんびり実効2.0秒/めいじん0.8秒、早タップが失敗にならない、暗黙アシスト(2連続逃し→窓2倍、3連続→自動フッキング)。
- 連打ゲージ: 床30%で止まる、断続タップでも進む、おたすけ発動(のんびり・床10秒)。
- 抽選: 個別weight+レアリティ既定重み、非食用合計10〜15%、セッション内たからものデデュープ、species pity(逃走ごと窓+20%)。
- Lv1ベースライン: **Lv1装備・のんびりで全normal魚+fishNeeds対象魚種が上限時間内に必ず釣れる**(不変条件の自動検証)。

### 入力(Playwright + iOS実機)
- touchcancel で待ち状態へ巻き戻り、失敗イベントが出ない。マルチタッチで最初の指のみ追跡。UIコントロール上のタップがフッキングに化けない。**Phase 2でiOS物理端末のpointercancel検証必須**(Playwrightでは代替不可の項目として明記)。

### 在庫・図鑑(畑プラン§10の魚版)
- 釣果1回で `fish_*` が1回だけ増える。outbox残存→再起動でreplay、同一opId二重加算なし。fishdex が同一opIdで冪等更新され、ackは両方成功後。
- 釣りタブ+kitchenタブの2 browser context 同時操作で加算・消費・appliedOps が失われない(Web Locks直列化)。
- 魚IDを知らない旧ビルドの正規化が魚在庫を削除しない。書き出し→復元で fish_* / 新prepared ID / gear grants / fishdex が保持される。
- 非食用種は在庫opが発行されない(fishdex+どんぐりのみ)。

### kitchen / bento
- yakizake: fish_salmon在庫あり→完了で raw−1/prepared+1、在庫なし→従来どおり自由調理完走・在庫不変。調理中リロード→非消費。同一opId再コミット→二重消費なし。
- **salmon専用シネマ演出(salt/oil/flip/lid drag)が fishNeeds 追加後も無変化**(回帰)。
- bento: classic配列とfree-layout配列の**同名カード両方**に印が出る。同種複数置きでも消費は distinct prepared ID ごとに1食分。畑+釣り同居弁当で receipt の consumedPreparedIds と完成演出文言が一致。配置取り消しで非消費、在庫レースでも完成が止まらない。
- free/book で魚印・演出・消費が一切発生しない(kitchenの新規魚レシピ非表示含む)。

### 装備・経済
- buyGear: 残高不足no-op / 所持済み二重購入no-op / **spend成功直後に中断→再ロードで所持が復元される**(grants先書きの検証)。
- grantGift: grants既存でno-op。rewards.json fetch失敗環境でもギフトが付与される。
- effectFor: 全装備組合せで定義済み、未所持id混入時Lv1フォールバック。tier別 computeFishingShopItems() の可視集合スナップショット(free/book/app)。
- どんぐり: 1匹1こ+初回ボーナス、ゲーム別cap 8で打ち止め、cap到達時にどんぐり表示が出ない(図鑑演出のみ)。

## 10. 実装前の確定ゲート

1. ディレクトリ名 `tsuri-kawa` / `tsuri-umi`、共有コア `common/tsuri/`、LSキー4系(`pono_tsuri_kawa_v1`/`pono_tsuri_umi_v1`/`pono_tsuri_gear_v1`/`pono_fishdex_v1`)の承認。
2. **ID契約の承認**: さけの在庫ID=`fish_salmon`(§3.1裁定)、fish_プレフィックス規約+prefix判定禁止API、kitchen新設INGREDIENTS.id=在庫ID同一(例外はsalmonのみ)、`producesPreparedId` 導入。
3. **Phase 0 凍結内容の合意**: tugスタブ+gearMods受け口を含むcore API。以後の変更は統合エージェントG経由+両ゲーム?v=一斉更新+sw bumpのセット。
4. **畑チームとのF-0契約合意**(AGENTS_CLAIMS.md経由、畑プランPhase 1着手前): §8に列挙した6項目(ensureEntry / 未知ID非破壊 / fish_レジストリ / producer登録規約 / producesPreparedId / union消費規約)。Phase 4 の着手は畑プラン Phase 1〜2 完了に従属(釣りチームがfood-inventory.jsを先行新設するのは禁止。畑遅延時は outbox 積み置きで釣り単体を先行出荷)。
5. 装備方針の承認: Lv3=ギフト限定(非売品)、価格帯 `PRICE_BY_RARITY {15,25,35}` 流用(釣り専用通貨は作らない)、**Lv1装備で全normal魚+レシピ必須魚が釣れる不変条件**(fish_salmonはrareだがスターター装備で確実に釣れるweight/challengeProfileとし、F-0縦切りが初日から成立することをリリースゲートに含める)。
6. ショップ改修範囲の確定: 常設棚方式(ローテ枠に混ぜない)、shop-catalog.js への統合方式(ROOM_CATALOG_REWARD_TYPES拡張 vs `computeFishingShopItems()` 並設 — 本書は後者を推奨)。
7. **rewards.json 404問題の実態確認**と「付与はランタイム正本・rewards.jsonは表示メタのみ」方式の承認。rewards.json への reward type 追加スキーマはスタンプラリー担当とすり合わせ。
8. どんぐり経済の再計算承認: 釣り付与(1匹1こ、ゲーム別cap 8×2ゲーム)が総量cap 25/35・他ゲームとの財布共有と両立するか。**MVP報酬封印フラグ(PONO_MVP_NO_REWARDS / PonoMvpFlags等)の現在値と釣りでの扱いをtier担当と合意**(free/bookで「稼げない・貰えない・買えない」死んだループを出荷しない)。
9. free/book tier における釣り raw の earn 可否の三者確定(釣り+装備ショップ+在庫。本書の推奨: earn許可+表示のみisApp()ガード)。
10. 公開タイミングの承認: Phase 7(装備込み)まで debugPlayable 限定を基本とする。装備なし先行公開に変更する場合はユーザー判断(その場合もgearMods受け口があるため技術的には可能)。
11. SE素材の調達方法(既存 assets/audio・se.js 資産の流用可否を実査し、不足分の調達方針をユーザー確認。fal-ai はTTS/動画禁止のため効果音の扱いも要確認)。
12. `pono_tsuri_gear_v1` ほか釣り側新キーの data-export / cloud-sync 対象化、native/content-manifest 再収録の担当割り(統合エージェントG)。
13. わかさぎの扱い: 図鑑habitatを「みずうみ」と正記して川ゲームに残す裁定(§3.2)の承認。

## 11. 今回は入れないもの(見送り理由つき)

- **めいじん限定魚種**: のんびり専門の子の図鑑が埋まらない問題(critical級指摘)を魚種側で解決するため v1 では作らない。将来入れる場合は🎣マーク+「めいじんモードで あえるよ」の伸びしろ表現を必須とする。
- **実時刻の時間帯ローテ・雨の日限定魚・実天気API**: 来訪回数ベースローテ+ゲーム内ランダム天候に置換(Phase 7以降)。実時刻依存の取り逃しは幼児に説明不能なため。
- **複数匹要求レシピ・farmNeeds+fishNeeds複合レシピ**: 1:1原則と「在庫0でも完走」フォールバックを壊すため v1 見送り。データ形状(`fishNeeds:{fish_aji:2}`)は拡張可能なまま確保済み。
- **`inventoryNeeds` への needs一本化**: レビュー推奨だが、畑プラン(正本)が farmNeeds で確定済みのため union消費規約で対応(§3.6裁定)。第3経路出現時に再検討。
- **魚⇄どんぐり換金、ショップでの食材・おかず販売、ギフト箱への魚同梱**: MVP対象外。導入時は producer登録規約(§3.3)に従うことを条件として明文化。
- **Lv3ギフトのショップ救済(長期未達時にsuper価格で並べる)**: 実績条件を累計匹数のみの緩さにして救済不要化を優先。Phase 2候補のまま保留。
- **わかさぎのからあげ / ika_ring / tsuna_mayo**: 調理アート物量(からあげはピース5×3段=15枚)が大きく、v2以降。
- **prepared への origin フィールド**: 釣り由来判定は prepared ID 集合で足りるため不採用(畑プラン整合)。
- **encyclopedia.js 本体の汎用化(dataSource注入化)**: aquarium回帰リスクを避け派生モジュール方式を採用。将来の図鑑統合時に改めて検討。
- **ocean既存アートの流用**: 観賞キャラ(水槽のともだち)を食べる構図を避けるため全魚新規生成(アセット予算に反映済み)。
