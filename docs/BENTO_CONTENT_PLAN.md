# BENTO CONTENT PLAN — お弁当コンテンツ tier 別再設計

**作成日:** 2026-06-15
**ステータス:** 計画 (Phase 1 着手前)
**関連ファイル:** [common/tier.js](../common/tier.js), [bento/index.html](../bento/index.html), [TIER_POLICY.md](./TIER_POLICY.md)

---

## 0. このドキュメントの位置付け

オーナーから「お弁当のコンテンツ数を tier 別に再設計したい」という方針が出た。 既存の [TIER_POLICY.md §12](./TIER_POLICY.md) では `30 食材 / 8-15-30 配分` を採用していたが、 実態 (46 種のおかず + 11 種の飾り + 3 種のごはん) との乖離が大きい。 本ドキュメントは **実装事実 → 新方針 → 差分とアクション** の順に整理し、 Phase 1 (今すぐ) / Phase 2 / Phase 3 のロードマップに落とし込む。

実装が動いた場合は本ドキュメントを真とし、 [TIER_POLICY.md §12](./TIER_POLICY.md) (古い数字版) を本ドキュメントへのリンクに置き換える運用 (= bento 関連の正本はここ)。

---

## 1. 実装事実 (2026-06-15 時点)

### 1.1 おかず合計 **46 種類**

[bento/index.html L4021-4074](../bento/index.html) で 3 配列に定義されている。

| 配列 | 件数 | 用途 |
|---|---|---|
| `OKAZU_MEAT` | 19 種 | ステップモード用「メイン肉系」 |
| `OKAZU_VEG` | 15 種 | ステップモード用「副菜野菜系」 |
| `FRUITS` | 12 種 | ステップモード用「フルーツ・デザート系」 |
| **合計** | **46 種** | (ステップモード = 現状ほぼ未使用) |

**フリーレイアウトモード** (現行 UI で実際に使われる方) は別の専用配列 `FREE_COOKED_OKAZU` ([bento/index.html L4083-4114](../bento/index.html)) で運用されており、 こちらは **30 エントリ**。 既存の `OKAZU_MEAT/VEG/FRUITS` から画像パスを再利用しつつ `size` / `rotation` / `cupSize` を「調理済み版」用に調整した別エントリ群、というのが実態。

### 1.2 UI タブの実態:「メインのおかず」vs「小さいおかず」

フリーレイアウトのおかずタブは [bento/index.html L4115-4116](../bento/index.html) の 2 配列で role 判定されている (実装確認要: 大文字スネークの定数名で分類ロジックは [L6046-6047](../bento/index.html) `FREE_SIDE_OKAZU_NAMES.includes(...)` で先に判定 → fall through で main 判定)。

```js
const FREE_MAIN_OKAZU_NAMES = ['タコウインナー','ハンバーグ','からあげ','エビフライ','コロッケ','やきざけ','ナポリタン','ぎょうざ','はるまき','ベーコンまき']; // 10
const FREE_SIDE_OKAZU_NAMES = ['キャベツ','プチトマト','たまごやき','にんじんいんげん','きんぴらごぼう','ブロッコリー','ミートボール','コーンほうれんそう','えだまめ','ポテトサラダ']; // 10
```

#### 1.2.1 役割マッピング表 (現行 FREE_COOKED_OKAZU の 30 エントリ)

| 食材名 | FREE_COOKED_OKAZU での cat | UI 役割 (FREE_MAIN/SIDE) | OKAZU_MEAT/VEG/FRUITS のどれに居るか |
|---|---|---|---|
| タコウインナー | meat | **メイン** | OKAZU_MEAT |
| ハンバーグ | meat | **メイン** | OKAZU_MEAT |
| からあげ | meat | **メイン** | OKAZU_MEAT |
| エビフライ | meat | **メイン** | OKAZU_MEAT |
| コロッケ | meat | **メイン** | OKAZU_MEAT |
| やきざけ | meat | **メイン** | OKAZU_MEAT |
| ナポリタン | meat | **メイン** | OKAZU_MEAT |
| ぎょうざ | meat | **メイン** | OKAZU_MEAT |
| はるまき | meat | **メイン** | OKAZU_MEAT |
| ベーコンまき | meat | **メイン** | OKAZU_MEAT |
| たまごやき | meat | **小さい** | OKAZU_MEAT |
| ミートボール | meat | **小さい** | OKAZU_MEAT |
| キャベツ | veg | **小さい** | OKAZU_VEG |
| プチトマト | veg | **小さい** | OKAZU_VEG |
| ブロッコリー | veg | **小さい** | OKAZU_VEG |
| にんじんいんげん | veg | **小さい** | OKAZU_VEG |
| きんぴらごぼう | veg | **小さい** | OKAZU_VEG |
| コーンほうれんそう | veg | **小さい** | OKAZU_VEG |
| えだまめ | veg | **小さい** | OKAZU_VEG |
| ポテトサラダ | veg | **小さい** | OKAZU_VEG |
| ハムサラダ | veg | (未分類 → fall through で main 扱い?) | OKAZU_VEG |
| いちご | fruit | (未分類) | FRUITS |
| みかん | fruit | (未分類) | FRUITS |
| メロン | fruit | (未分類) | FRUITS |
| りんご | fruit | (未分類) | FRUITS |
| もも | fruit | (未分類) | FRUITS |
| ぶどう | fruit | (未分類) | FRUITS |
| パイナップル | fruit | (未分類) | FRUITS |
| キウイ | fruit | (未分類) | FRUITS |
| バナナ | fruit | (未分類) | FRUITS |

**実装確認要 (重要):** フルーツ 9 種と `ハムサラダ` は `FREE_MAIN_OKAZU_NAMES` にも `FREE_SIDE_OKAZU_NAMES` にも入っていない。 [bento/index.html L6045-6047](../bento/index.html) のロジックでは `FREE_SIDE` を先に見て、外れたら `FREE_MAIN` を見て、 どちらも外れた場合の挙動 (おそらく `'main'` 既定) を再確認すべき。 = **フルーツが「メインのおかず」タブに表示される現状の可能性** がある。 → これは UX 上不自然なので、 新方針では **フルーツ専用タブ**もしくは **「小さい」固定**を Phase 2 で確定したい (open question 参照)。

### 1.3 ご飯 (rice) — **3 種類**

[bento/index.html L4914-4918](../bento/index.html) `riceBases`。 すべて「白ご飯ベース」で形違いのみ。

| id | 形 | 用途 |
|---|---|---|
| `rice_base_round` | 丸型 | 通常 1 段箱 |
| `rice_base_bear` | くま型 | キャラ箱 (bear系) |
| `rice_base_cat` | ねこ型 | キャラ箱 (cat系) |

**ふりかけご飯**は画像アセットは既存 (`rice_furikake.webp` 等、 [bento/index.html L4017](../bento/index.html) の `RICE` 配列に `'ふりかけごはん'` 定義あり)。 ただしフリーレイアウト用 `riceBases` 配列 (上記 3 種: rice_base_round / bear / cat) には未配置で、 現 UI には出てこない。 **おにぎり / チャーハン / サンドイッチ** は画像アセットも未生成。

### 1.4 飾り (decor + pick) — 合計 **11 種類**

[bento/index.html L4919-4931](../bento/index.html) `decorItems`。

| type | 件数 | 内訳 |
|---|---|---|
| `decor` | 7 | おめめ / はな / くち / まゆ(左) / まゆ(右) / ほっぺ / うめぼし |
| `pick` | 4 | ほしピック / おはなピック / はたピック / ハートピック |

「のり」系統 (`nori_eye_round` / `nori_nose_bear` / `nori_mouth_smile` / `nori_brow_*`) はすべて decor タブに含まれる。 = **「のり」を tier で剥奪する場合、 これら 5 アイテム (+ うめぼし/ほっぺ どうするか)** を非表示にする必要がある。

### 1.5 お弁当箱 — **7 種類**

[bento/index.html L4584-4880](../bento/index.html) `bentoBoxes`。

| id | 形 | 段数 (tierCount) |
|---|---|---|
| `box_rect_split` | 仕切り長方形 | 1 |
| `box_square` | 四角 | 2 |
| `box_round` | 丸 | 2 |
| `box_bear` | くま型 | 2 |
| `box_bear_pink` | くまピンク | 2 |
| `box_cat_blue` | ねこ青 | 2 |
| `box_cat` | ねこ | 2 |

### 1.6 既存の tier 配分 ([common/tier.js L128-148](../common/tier.js))

```js
FREE_BENTO_FOOD_NAMES = [8 食材]       // タコ・ハンバーグ・たまごやき・キャベツ・プチトマト・ブロッコリー・いちご・バナナ
BOOK_BENTO_FOOD_NAMES = [15 食材]      // free + からあげ・コロッケ・エビフライ・やきざけ・ミートボール・にんじんいんげん・コーンほうれんそう
ALL_BENTO_FOOD_NAMES  = [30 食材]      // book + 残り 15
FREE_BENTO_BOX_IDS    = ['box_rect_split']
BOOK_BENTO_BOX_IDS    = +['box_square', 'box_round']
FREE_BENTO_NPCS       = []
BOOK_BENTO_NPCS       = ['risu', 'inu', 'shika']
```

判定関数: `isBentoFoodUnlocked` ([common/tier.js L283](../common/tier.js)) / `isBentoBoxUnlocked` ([L293](../common/tier.js)) / `isBentoNpcUnlocked` ([L302](../common/tier.js))。

`PONO_TIER_GAME_LOCKS_ENABLED = true` ([common/tier.js L37](../common/tier.js)) で**ロック有効**。 絵本パスワードは v17XX で `BOOK_PASSWORDS = ['arigato_pono2026']` に統合 (旧 `['1234']` テスト用 + `ADMIN_PASSWORDS=['abcd']` を 1 本化)。

---

## 2. オーナーの新方針 (2026-06-15)

### 2.1 おかず: メイン / 小さい の **各カテゴリ別配分**

| tier | メインのおかず | 小さいおかず |
|---|---|---|
| **無料 (free)** | **4〜5 種類** | **4〜5 種類** |
| **本購入 (book)** | **10 種類** | **10 種類** |
| **アプリ購入 (sub)** | **15〜20 種類** | **15〜20 種類** |

→ sub の上限は最終的に **15** に着地するか **20** まで増やすか未確定 (open question Q1)。

### 2.2 ご飯 + 飾り

| tier | のり (飾り) | ふりかけご飯 | ふりかけお絵かき | チャーハン/おにぎり/サンド |
|---|---|---|---|---|
| **無料** | **なし** (剥奪) | なし | なし | なし |
| **本購入** | あり (現状の海苔セット) | **新規追加** | なし | なし |
| **アプリ購入** | あり | あり | **新規実装** | **将来追加** (Phase 3) |

「飾り」タブの中身は現行 11 種だが、無料からは「のり」系統 5 種を非表示にしてキャラ作りができないようにする。 ピック (4 種) を無料に残すかは要判断 (open question Q3 として残す案)。

---

## 3. 実態 vs 新方針 のギャップ

### 3.1 おかずの「ユーザー想定」と「現実」

オーナーは「現状各カテゴリ 10 種ずつ」と認識していた節があるが、**現実は配列ベースで 19 + 15 + 12 = 46 種**。 ただし**フリーレイアウトの実 UI に出ているのは 30 エントリのみ** (内訳: メイン 10 / 小さい 10 / フルーツ 9 + 不明 1)。

つまり今回の議論で噛み合わせるべき数字は:

- **配列上の 46 種** ではなく
- **フリーレイアウト UI 上の 30 エントリ** (メイン 10 + 小さい 10 + フルーツ系 10) を起点にする

ことになる。

### 3.2 目標との差

| 区分 | 現状 (UI 表示) | sub 目標 (15-20) | 不足 |
|---|---|---|---|
| メインのおかず | 10 | **15-20** | +5 〜 +10 必要 |
| 小さいおかず | 10 | **15-20** | +5 〜 +10 必要 |
| フルーツ | 9-10 | (open question Q2 で扱い決定) | — |

→ **sub 上限を 15 に着地させると、 メイン +5・小さい +5 = 合計 10 種類の新規調理済みアセットが必要**。 OKAZU_MEAT/VEG の配列には既に未使用素材が残っている可能性が高い (メンチカツ / かまぼこ / ベーコンアスパラ / チーズコロッケ / おこのみやき / なすのにもの / ひじきのにもの / ちくぜんに / きのこいため / おんやさい / コーンバター / ブロッコリーコーン / かまぼこピンク など、 ステップモード用 14 種前後)。 これらを `FREE_COOKED_OKAZU` 側に「調理済み版」として追加するか、新規 size/rotation/cup 調整した別エントリを足すかが Phase 2 の作業。

実装確認要: ステップモード用素材の中で「フリーレイアウト調理済み版がまだ作られていないもの」のリストアップを Phase 2 着手時に作る。

---

## 4. 新方針の目標表 (free / book / sub × メイン / 小さい / ご飯 / 飾り)

| 軸 | free | book | sub |
|---|---|---|---|
| **メインのおかず** | 4〜5 | 10 | 15〜20 |
| **小さいおかず** | 4〜5 | 10 | 15〜20 |
| **フルーツ** | (Q2 で確定) | (Q2 で確定) | (Q2 で確定) |
| **ご飯ベース** | rice_base_round のみ | + bear / cat 形 + **ふりかけご飯** | + **ふりかけお絵かき** (Phase 2) |
| **飾り (のり系 5)** | **なし** | あり | あり |
| **飾り (ピック 4)** | あり (要判断) | あり | あり |
| **お弁当箱** | box_rect_split (1 段) | + square / round (計 3、 square/round は 2 段) | + キャラ箱 4 種 (計 7、 キャラ箱も 2 段) |
| **NPC** | なし | risu / inu / shika (3) | + ahiru / panda / neko (6) |

ご飯の扱いを「飾れる/飾れない」で書き換えた点が、 旧 [TIER_POLICY.md §12](./TIER_POLICY.md) との大きな差分。 旧版は「のり剥奪」概念がなかった。

---

## 5. ロードマップ

### Phase 1 — 今すぐ (本ドキュメント作成 PR)

- [x] 本ドキュメント `docs/BENTO_CONTENT_PLAN.md` を作成し、 [TIER_POLICY.md §12](./TIER_POLICY.md) との関係を「BENTO_CONTENT_PLAN.md が bento の正本、 TIER_POLICY.md §12 は旧版」と明示
- [ ] **無料からのり剥奪**: [common/tier.js](../common/tier.js) に `FREE_BENTO_DECOR_IDS = []` / `BOOK_BENTO_DECOR_IDS = ['nori_eye_round', 'nori_nose_bear', 'nori_mouth_smile', 'nori_brow_left', 'nori_brow_right', 'ketchup_cheek', 'decor_umeboshi', 'pick_star', 'pick_flower', 'pick_flag', 'pick_heart']` のような配列を追加 + `isBentoDecorUnlocked(id)` を新設。 [bento/index.html](../bento/index.html) の `decorItems` レンダリング側でガード。
- [ ] **本にふりかけご飯追加**: `riceBases` に `rice_base_furikake_round` 等を追加し `BOOK_BENTO_RICE_IDS` で book 以上に開放。 既存アセット流用 (`rice_furikake.webp` ほか、 `RICE` 配列のものを再利用) で新規画像不要。
- [ ] sw.js `CACHE_VERSION` bump (現値を確認の上 +1)

### Phase 2 — 次 PR 以降

- [ ] **sub 向けおかず +10 種** (メイン +5 / 小さい +5、上限 15 着地の場合) を `FREE_COOKED_OKAZU` に追加。 既存 `OKAZU_MEAT/VEG` の未使用素材から選定 (メンチカツ / ベーコンアスパラ / なすのにもの / ひじきのにもの / きのこいため など)。
- [ ] `FREE_MAIN_OKAZU_NAMES` / `FREE_SIDE_OKAZU_NAMES` を 15-20 種に拡張
- [ ] [common/tier.js](../common/tier.js) の `FREE_BENTO_FOOD_NAMES` (8 → 8-10)、 `BOOK_BENTO_FOOD_NAMES` (15 → 20)、 `ALL_BENTO_FOOD_NAMES` (30 → 35-40) を再構築
- [ ] **ふりかけお絵かき機能** (Canvas Path 描画 → ご飯テクスチャに合成)。 sub 限定
- [ ] フルーツ扱いの open question Q2 を確定し、 タブ UI を確定 (フルーツタブ新設 or 小さいに統合)
- [ ] NPC `shika` の wantedFoods に sub 食材が混ざる問題を再確認 (tier ガード追加)

### Phase 3 — 将来

- [ ] チャーハンご飯ベース (画像 + チャーハン用ふりかけ食感)
- [ ] おにぎり (三角形ベース + のり巻き帯)
- [ ] サンドイッチ (お弁当箱と別物として箱選択画面で扱うか、 ご飯ベースの一種として扱うか要設計)
- [ ] ステップモード復活時の 49 食材ティア対応

---

## 6. 「足りない・要追加」アイテム一覧

### 6.1 sub 向け不足おかず

sub 上限を **15** に着地させる場合の不足:

- **メインのおかず**: +5 種 (案: メンチカツ / かまぼこ / おこのみやき / チーズコロッケ / ベーコンアスパラ)
- **小さいおかず**: +5 種 (案: なすのにもの / ひじきのにもの / ちくぜんに / きのこいため / コーンバター)
- **新規画像生成**: 不要 (既存 `OKAZU_MEAT/VEG` 配列のものを `FREE_COOKED_OKAZU` 用に再エントリするだけ、 ただし size / rotation / cupSize の再調整は要)。

sub 上限を **20** に着地させる場合の追加不足: 上記 +10 種 (= 各カテゴリ +5)。 = 新規画像生成 or AI 生成が必要になる可能性が高い (`OKAZU_MEAT/VEG` の枯渇)。

### 6.2 ご飯側の新規アセット

| Phase | アセット | 数量 |
|---|---|---|
| 1 | ふりかけご飯 (丸型) | 既存 `rice_furikake.webp` 流用、 新規画像不要 (`riceBases` に新規エントリ追加のみ) |
| 1 | ふりかけご飯 (キャラ箱用 bear/cat) | 既存アセットの色味流用 or 形違い 1-2 種 (再エントリで対応可) |
| 2 | ふりかけお絵かき用テクスチャ (粒状ブラシ素材) | 2-3 |
| 3 | チャーハン版 ベース | 3 (丸/くま/ねこ) — 新規画像必要 |
| 3 | おにぎり版 (三角) | 1-2 — 新規画像必要 |
| 3 | サンドイッチ版 | 2-3 — 新規画像必要 |

---

## 7. tier 制限の実装ポイント参照

新方針を実装に落とすときの touch point。

| 項目 | ファイル / 行 |
|---|---|
| tier 判定の中心 | [common/tier.js L283-308](../common/tier.js) (bento 関連) |
| 食材ロック判定 | `isBentoFoodUnlocked(name)` → [common/tier.js L283-291](../common/tier.js) |
| 箱ロック判定 | `isBentoBoxUnlocked(boxId)` → [common/tier.js L293-300](../common/tier.js) |
| NPC ロック判定 | `isBentoNpcUnlocked(npcId)` → [common/tier.js L302-308](../common/tier.js) |
| **新規追加要**: 飾りロック判定 | 未実装、 `isBentoDecorUnlocked(decorId)` を新設すること |
| **新規追加要**: ご飯ロック判定 | 未実装、 `isBentoRiceUnlocked(riceId)` を新設すること |
| フリーレイアウトパレットの取得 | `getFreePaletteItems(tabId)` → [bento/index.html L6260 前後](../bento/index.html) |
| 役割 (main/side) 判定 | [bento/index.html L6045-6047](../bento/index.html) |
| 既存定数 | `FREE_MAIN_OKAZU_NAMES` / `FREE_SIDE_OKAZU_NAMES` → [bento/index.html L4115-4116](../bento/index.html) |
| NPC `shika` wantedFoods | [bento/index.html L4183](../bento/index.html) (book 以下に sub 食材が漏れる) |
| `riceBases` 定義 | [bento/index.html L4914-4918](../bento/index.html) |
| `decorItems` 定義 | [bento/index.html L4919-4931](../bento/index.html) |
| `bentoBoxes` 定義 | [bento/index.html L4584-4880](../bento/index.html) |

---

## 8. open questions

実装に入る前にオーナーへ確認したい論点。

- **Q1**: アプリ (sub) tier 上限は **15** に着地するか **20** に増やすか。 15 なら既存素材で完結、 20 なら新規画像生成が必要になる可能性大。
- **Q2**: 「小さいおかず」タブに **フルーツを含めるか** の線引き。 現状フルーツ 9-10 種が `FREE_MAIN/SIDE_OKAZU_NAMES` の両方から漏れていて UI 上の役割が曖昧。 案 A: フルーツ専用タブを新設 / 案 B: 小さいに統合 (sub の小さい上限が 20 になりやすい) / 案 C: メインに統合 (味噌汁/おかずの代替的扱い、自然さに欠ける)。
- **Q3**: 「飾り」剥奪の **粒度**。 のり 5 種 + うめぼし + ほっぺ までを book 以上に絞るのは確定として、 ピック 4 種 (ほし / はな / はた / ハート) を無料に残すかどうか。 残すと「のりはダメだけどピックは OK」 = キャラ作りはできないがちょっとした飾りはできる、 という中間体験になる。
- **Q4**: ふりかけお絵かき機能の **保存形式**。 案 A: Canvas Path (ベクター、 再描画可能、 容量小) / 案 B: 画像化 (Web Storage に dataURL、 シンプル、 容量大)。 LocalStorage 上限 (5MB) との兼ね合いで A が無難だが、 描画完了後にラスタライズして保存し、 編集再開時のみ画像を読むという折衷案もある。

---

## 9. Self-Evaluation 用メモ

過去の知見活用 ([MEMORY.md](../../memory/MEMORY.md) より):
- **tier_system_policy** 「free/book/sub 3 パターンは確定方針、 違いはゲーム内開放範囲」を踏襲し、 「のり剥奪」「ご飯バリエーション差」もこの原則の延長で設計した。
- **app_scope_boundary** play.html 以降がゲームアプリ範囲、 index.html は LP として独立 — 本計画も bento ゲーム内のみに閉じ、 LP には触れない。
