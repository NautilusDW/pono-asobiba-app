# BENTO CONTENT PLAN — お弁当コンテンツ tier 別再設計

**作成日:** 2026-06-15
**最終改訂:** 2026-07-08 (tier v3.2 準拠改訂、詳細は §10 変更履歴)
**ステータス:** 計画 (Phase 1 着手前)
**関連ファイル:** [common/tier.js](../common/tier.js), [bento/index.html](../bento/index.html), [TIER_POLICY.md](./TIER_POLICY.md)

---

## 0. このドキュメントの位置付け

> **⚠️ 2026-07-08 tier v3.2 更新:** tier 配分の全社的な正本は [TIER_POLICY.md](./TIER_POLICY.md) と [common/tier.js](../common/tier.js)。 bento は free/book 差を復帰し、 **free 8 食材 / book 12 食材 / sub 30 食材** を採用する。 本ドキュメントは bento ゲーム固有の実装事実・アセット touch point・ロードマップの正本として残す。 tier v3 以前の議論 (sub 上限 15 vs 20 など) は歴史的記録として §3/§6 に残すが、 実装時は必ず v3.2 の数字を優先すること。

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

## 2. オーナーの新方針 (2026-07-08 tier v3.2 改訂版、 旧方針は §10 参照)

### 2.1 おかず: **free 8 / book 12 / sub 30**

tier v3.2 で bento の free/book 差を復帰。 free は入口として 8 食材、book は追加 4 食材を足して 12 食材、sub は既存 30 エントリを全解放する。

| tier | 主菜 (メインのおかず) | 副菜 (小さいおかず) | フルーツ | 合計 |
|---|---|---|---|---|
| **無料 (free)** | **3 種類** | **3 種類** | **2 種類** | **8 種類** |
| **本購入 (book)** | free + からあげ / エビフライ | free + にんじんいんげん | free + みかん | **12 種類** |
| **アプリ購入 (sub)** | 既存 `FREE_COOKED_OKAZU` の全エントリ (現状 30、 新規アセット不要) | | | **30 種類** |

- free の 8 食材: タコウインナー / ハンバーグ / たまごやき / キャベツ / プチトマト / ブロッコリー / いちご / バナナ。
- book の追加 4 食材: からあげ / エビフライ / にんじんいんげん / みかん。
- sub 上限は **30 (既存 UI 表示分そのまま)** に確定。 旧 Q1 (15 vs 20) は解消 (§8 参照)、 Phase 2 で予定していた「sub 向け +10 種新規調理済みアセット」も **不要**になった (§6.1 は歴史的記録として保持)。

### 2.2 ご飯 + 飾り (のり) — free 基本パーツ / book 追加かざり / sub 蓄積系

**2026-07-03 決定 (batch:1056) を維持**: 無料の のり/かざり は目鼻口眉 5 点 (`nori_eye_round` / `nori_nose_bear` / `nori_mouth_smile` / `nori_brow_left` / `nori_brow_right`) + ピック 4 種。 book は顔セット / ほっぺ / うめぼし / のりながしかく１ / 追加のり形状を解放する。 ふりかけご飯は book ではなく **sub 専用**に位置づける。

| tier | のり/かざり | ふりかけご飯 | ふりかけお絵かき | チャーハン/おにぎり/サンド |
|---|---|---|---|---|
| **無料 (free)** | 目鼻口眉 5 点 + ピック 4 種 | なし | なし | なし |
| **本購入 (book)** | free + 顔セット 3 種 (にこ/くま/ねこ)・ほっぺ・うめぼし・のりながしかく１・追加のり形状 | **なし (sub へ移動)** | なし | なし |
| **アプリ購入 (sub)** | あり (book と同一) | **あり (sub 専用に確定)** | **新規実装 (sub 専用)** | **将来追加** (Phase 3) |

無料でも目鼻口眉 5 点で最低限の顔作りは可能。 ワンタップ配置の顔セット / ほっぺ / うめぼし / のり形状 (乗り物・あそび系) は book 以上。 ピック (4 種) は無料継続 (Q3 解決、 2026-07-03、 変更なし)。 ふりかけご飯・ふりかけお絵かきは sub 専用に確定 (旧方針の「本購入にふりかけご飯追加」は撤回)。

### 2.3 NPC (依頼者モード) — 現状方針を継続

tier v3.2 でも「NPC 依頼者モードは book 以上」の現状方針を維持する。 **book は依頼者モードが使え、依頼を満たす食材は book の 12 種の範囲に限定する**。 sub のみ NPC 3 種追加 (計 6) で、 sub 食材 30 種を使った依頼が発生しうる。

| tier | NPC |
|---|---|
| 無料 (free) | なし |
| 本購入 (book) | risu / inu / shika (3、 wantedFoods は book の 12 種の範囲に限定すること) |
| アプリ購入 (sub) | + ahiru / panda / neko (計 6、 sub 食材 30 種を使った依頼も可) |

→ 既存の「NPC `shika` の wantedFoods に sub 食材が混ざる問題」(§7) は、 book 以下の依頼で重要な修正必須事項。 Phase 1 で必ず確認すること。

---

## 3. 実態 vs 新方針 のギャップ

> **⚠️ 歴史的記録:** 本セクションは 2026-06-15 時点の旧方針 (sub 上限 15〜20 を目指し新規アセットが必要、という前提) の分析。 tier v3 (2026-07-06) で sub = 既存 30 エントリそのまま (新規アセット不要) に確定したため、 「不足」分析は解消済み。 §6.1 も同様。 参考情報として残す。

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

## 4. 新方針の目標表 (tier v3.2 準拠、 free / book / sub × 主菜 / 副菜 / フルーツ / ご飯 / 飾り)

| 軸 | free | book | sub |
|---|---|---|---|
| **主菜 (メインのおかず)** | 3 | free + 2 (計 5) | 既存全エントリ (現状 10) |
| **副菜 (小さいおかず)** | 3 | free + 1 (計 4) | 既存全エントリ (現状 10) |
| **フルーツ** | 2 | free + 1 (計 3) | 既存全エントリ (現状 9〜10、 Q2 で役割確定) |
| **食材合計** | **8** | **12** | **30 (既存 `FREE_COOKED_OKAZU` 全量、 新規アセット不要)** |
| **ご飯ベース** | rice_base_round のみ | + bear / cat 形 | + **ふりかけご飯**・+ **ふりかけお絵かき** (Phase 2、 sub 専用) |
| **飾り (のり 目鼻口眉 5)** | あり | あり | あり |
| **飾り (顔セット 3・ほっぺ・うめぼし・のり形状5=乗り物/あそび)** | **なし** | あり | あり |
| **飾り (ピック 4)** | あり (無料継続 確定 2026-07-03) | あり | あり |
| **お弁当箱** | box_rect_split (1 段) | + square / round (計 3、 square/round は 2 段) | + キャラ箱 4 種 (計 7、 キャラ箱も 2 段) |
| **NPC (依頼者モード)** | なし | risu / inu / shika (3、 wantedFoods は book の 12 種限定) | + ahiru / panda / neko (計 6、 sub 30 種込みの依頼も可) |

ご飯・のりの扱いを「飾れる/飾れない」で書き換えた点が、 旧 [TIER_POLICY.md §12](./TIER_POLICY.md) との大きな差分 (旧版は「のり剥奪」概念がなかった)。 tier v3.2 (2026-07-08) で食材も free 8 / book 12 / sub 30 に戻し、book に少量の追加体験を持たせた。

---

## 5. ロードマップ

### Phase 1 — 今すぐ (本ドキュメント作成 PR / tier v3 実装 PR)

- [x] 本ドキュメント `docs/BENTO_CONTENT_PLAN.md` を作成し、 [TIER_POLICY.md §12](./TIER_POLICY.md) との関係を「BENTO_CONTENT_PLAN.md が bento の正本、 TIER_POLICY.md §12 は旧版」と明示
- [x] **無料の飾り絞り込み (2026-07-03 実装、 batch:1056)**: 実装は common/tier.js の配列方式では**なく**、 [bento/index.html](../bento/index.html) の `decorItems` 各定義を `bookDecorItem(def)` (L7470、 `minTier:'book'` 付与) でラップし、 palette 側で `isBentoDecorUnlocked(def)` (`PonoTier` 経由の `isBentoMinTierUnlocked`) がガードする **per-def minTier 方式**。 無料 = 目鼻口眉 5 点 + ピック 4 種。 book 追加 = 顔セット 3 種・ほっぺ・うめぼし・のりながしかく１ (旧「のりべん」 `nori_bento_sheet`)・既存 book のり (乗り物/あそび系 shape 5 種の palette hide も解除済)。
- [x] **tier v3.2: 食材を free 8 / book 12 / sub 30 に設定**。 `common/tier.js` の `FREE_BENTO_FOOD_IDS` / `BOOK_BENTO_FOOD_IDS` / `ALL_BENTO_FOOD_NAMES` で実装。
- [x] **のりながしかく１ は book 側に維持**。 `bookDecorItem` ラッパーを維持し、free は基本顔パーツ + ピックに絞る。
- [ ] **tier v3: ふりかけご飯 を book → sub に変更**。 `riceBases` に `rice_base_furikake_round` 等を追加する際は `BOOK_BENTO_RICE_IDS` ではなく **sub 限定ガード**で開放 (既存アセット `rice_furikake.webp` 等を流用、 新規画像不要)。
- [ ] NPC `shika` の wantedFoods を book 12 種の範囲に限定する tier ガードを追加 (sub 食材が book 以下の依頼に混ざらないようにする、 §2.3 参照)
- [ ] sw.js `CACHE_VERSION` bump (現値を確認の上 +1)

### Phase 2 — 次 PR 以降

- [ ] ~~sub 向けおかず +10 種~~ **不要になった (tier v3 で sub=既存30エントリに確定、 §3 参照)**
- [ ] **ふりかけお絵かき機能** (Canvas Path 描画 → ご飯テクスチャに合成)。 sub 限定 (tier v3 で再確定)
- [ ] フルーツ扱いの open question Q2 を確定し、 タブ UI を確定 (フルーツタブ新設 or 小さいに統合)
- [x] [common/tier.js](../common/tier.js) の bento 定数を tier v3.2 の集合方式 (indexOf ベース統一) に合わせてリファクタ: `FREE_BENTO_FOOD_NAMES` 8、 `BOOK_BENTO_FOOD_NAMES` 12、 `ALL_BENTO_FOOD_NAMES` 30。

### Phase 3 — 将来

- [ ] チャーハンご飯ベース (画像 + チャーハン用ふりかけ食感)
- [ ] おにぎり (三角形ベース + のり巻き帯)
- [ ] サンドイッチ (お弁当箱と別物として箱選択画面で扱うか、 ご飯ベースの一種として扱うか要設計)
- [ ] ステップモード復活時の 49 食材ティア対応

---

## 6. 「足りない・要追加」アイテム一覧

### 6.1 sub 向け不足おかず

> **⚠️ 歴史的記録 (2026-06-15 時点の旧方針):** tier v3 (2026-07-06) で sub 上限は既存 `FREE_COOKED_OKAZU` の 30 エントリそのままに確定したため、 以下の「新規アセットが必要」という結論は**解消済み・不要**。 参考情報として残す。

sub 上限を **15** に着地させる場合の不足 (旧方針、 現在は不採用):

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
| 飾りロック判定 | **実装済** (batch:1056): [bento/index.html](../bento/index.html) 内 `isBentoDecorUnlocked(def)` — per-def `minTier` 方式 (`bookDecorItem` ラッパー) |
| **新規追加要**: ご飯ロック判定 | 未実装、 `isBentoRiceUnlocked(riceId)` を新設すること |
| フリーレイアウトパレットの取得 | `getFreePaletteItems(tabId)` → [bento/index.html L6260 前後](../bento/index.html) |
| 役割 (main/side) 判定 | [bento/index.html L6045-6047](../bento/index.html) |
| 既存定数 | `FREE_MAIN_OKAZU_NAMES` / `FREE_SIDE_OKAZU_NAMES` → [bento/index.html L4115-4116](../bento/index.html) |
| NPC `shika` wantedFoods | [bento/index.html L4183](../bento/index.html) (book 以下に sub 食材が漏れる) |
| `riceBases` 定義 | [bento/index.html L4914-4918](../bento/index.html) |
| `decorItems` 定義 | [bento/index.html L7473-7582 付近](../bento/index.html) (`bookDecorItem` ラッパーは L7470) |
| `bentoBoxes` 定義 | [bento/index.html L4584-4880](../bento/index.html) |

---

## 8. open questions

実装に入る前にオーナーへ確認したい論点。

- **Q1 (解決 2026-07-06、 tier v3):** アプリ (sub) tier 上限は **既存 `FREE_COOKED_OKAZU` の 30 エントリそのまま**に確定。 新規画像生成は不要。 (旧: 15 に着地するか 20 に増やすか未確定だった論点)
- **Q2**: 「小さいおかず」タブに **フルーツを含めるか** の線引き。 現状フルーツ 9-10 種が `FREE_MAIN/SIDE_OKAZU_NAMES` の両方から漏れていて UI 上の役割が曖昧。 案 A: フルーツ専用タブを新設 / 案 B: 小さいに統合 (sub の小さい上限が 20 になりやすい) / 案 C: メインに統合 (味噌汁/おかずの代替的扱い、自然さに欠ける)。
- **Q3 (解決 2026-07-03)**: 「飾り」剥奪の **粒度** → 無料 = 目鼻口眉 5 点のみ残し、 顔セット 3 種 + ほっぺ + うめぼし + のりシート (のりながしかく１) を book 以上に。 **ピック 4 種 (ほし / はな / はた / ハート) は無料継続で確定**。 「セットはダメだけどパーツとピックは OK」の中間体験を採用 (batch:1056 実装済)。
- **Q4**: ふりかけお絵かき機能の **保存形式**。 案 A: Canvas Path (ベクター、 再描画可能、 容量小) / 案 B: 画像化 (Web Storage に dataURL、 シンプル、 容量大)。 LocalStorage 上限 (5MB) との兼ね合いで A が無難だが、 描画完了後にラスタライズして保存し、 編集再開時のみ画像を読むという折衷案もある。

---

## 9. Self-Evaluation 用メモ

過去の知見活用 ([MEMORY.md](../../memory/MEMORY.md) より):
- **tier_system_policy** 「free/book/sub 3 パターンは確定方針、 違いはゲーム内開放範囲」を踏襲し、 「のり剥奪」「ご飯バリエーション差」もこの原則の延長で設計した。
- **app_scope_boundary** play.html 以降がゲームアプリ範囲、 index.html は LP として独立 — 本計画も bento ゲーム内のみに閉じ、 LP には触れない。
- **tier v3.2 (2026-07-08)** で bento は free/book 差を復帰。 free 8 食材 / book 12 食材 / sub 30 食材とし、のりながしかく１は book 側に維持する (§2.1 / §2.2)。

---

## 10. 変更履歴

### 2026-07-06 — tier v3 準拠改訂

tier v3 確定仕様 (user memory `feature_tier_v3.md`、 workflow w3pv652a2 合意事項) を bento に適用。 主な変更点:

| 項目 | 旧方針 (2026-06-15) | 新方針 (tier v3, 2026-07-06) |
|---|---|---|
| free 食材数 | メイン 4〜5 / 小さい 4〜5 (フルーツ未確定) | **主菜5 / 副菜4 / フルーツ3 = 計12** |
| book 食材数 | メイン10 / 小さい10 (free 超過分あり) | **free と同一の 12 種 (book 専用食材枠を廃止)** |
| sub 食材数 | メイン15〜20 / 小さい15〜20 (新規アセット要検討、 Q1 未決) | **既存 `FREE_COOKED_OKAZU` の 30 エントリそのまま (新規アセット不要、 Q1 解決)** |
| のり (のりながしかく１) | book 以上 | **book 以上を維持**、 顔セット3種・ほっぺ・うめぼし・のり形状5種も book 以上のまま |
| ふりかけご飯 | book で新規追加予定 | **sub 専用に変更** (tier v3 の「sub=蓄積系」原則に合わせる) |
| ふりかけお絵かき | sub 限定 (変更なし) | sub 限定 (変更なし) |
| NPC 依頼者モード | book 以上 (変更なし) | book 以上 (変更なし)、 **ただし book NPC の wantedFoods は book の 12 種限定であることを明記** (実装時の tier ガード漏れ防止) |
| §3/§6.1 の「sub 向け+10種新規アセット」分析 | Phase 2 の実施予定項目 | **不要化、 歴史的記録として保持** |

補足: tier v3 では一度 free = book に統合したが、 tier v3.2 で book の少量追加体験を復帰した。 合言葉流出耐性は sub の物量差と book 付録で担保する。
