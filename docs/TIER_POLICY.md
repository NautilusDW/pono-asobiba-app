# TIER POLICY — 無料 / 絵本購入者 / アプリ (= sub) の境界

ユーザー層（tier）の判定ルールと、各層に解放される範囲の正式仕様。
実装の一次ソースは `common/tier.js`。本ドキュメントは人間向けの参照用。
不整合が生じた場合は `common/tier.js` を正とし、本ドキュメントを更新する。

---

## 1. 3 階層の定義

| 階層 | キー | 判定条件 | 想定ユーザー |
|---|---|---|---|
| **free** | `'free'` | デフォルト | 未購入。ポノの遊び場のみ体験 |
| **book** | `'book'` | `localStorage.pono_premium === '1'` | 絵本『ありがとう』購入者（奥付パスワードで解錠） |
| **sub** | `'sub'` | `localStorage.pono_sub_active === '1'` | アプリ (= sub) 契約者 |

判定の優先順位: `sub` > `book` > `free`（`common/tier.js:31-37`）。

公開 API:
- `window.PonoTier.getTier()` → `'free' | 'book' | 'sub'`
- `window.PonoTier.isFree() / isBook() / isSub()`

---

## 2. 解放範囲マトリクス

| 機能 / コンテンツ | free | book | sub |
|---|:---:|:---:|:---:|
| **ポノの遊び場**（無料 8 件） | | | |
| &nbsp;&nbsp; oto / quiz-sound / puzzle / bento / wordmatch / quizland / maze / message | OK | OK | OK |
| **もじかきクエスト** | | | |
| &nbsp;&nbsp; ひらがな篇 | NO | OK | OK |
| &nbsp;&nbsp; カタカナ篇 | NO | **NO** | OK |
| &nbsp;&nbsp; （以降の篇） | NO | NO | OK（予定） |
| **有料ゲーム** | | | |
| &nbsp;&nbsp; おえかき / ボウリング / ブロック崩し / みちつなぎ | NO | OK | OK |
| **すいぞくかん**（海の生き物） | — | **代表 8 種のみ** | 全種 |
| **わたしのお家**（家具・かざり） | — | **代表 10 種のみ** + 壁紙/床は全開放 | 全アイテム |

`—` は「そもそもこのエリアに辿り着けない（保険で false 返し）」の意。

---

### 2.1 共通 5 本の差別化マトリクス (v3)

ポノの遊び場の本命 5 本（quizland / maze / oto / puzzle / bento）は、入口は全層に開放しつつ「中身（深さ）」で差別化する。 数値は本ドキュメント §11 / §12 のロードマップと連動する。

#### A. quizland（フクロウはかせのなぞなぞ） — 実問題数 **全 210 問**

実態: inspire モード 82 問（order_color / count_total / shape_name / number_sequence × Lv1-3） + know モード 128 問（trivia 56 問 + weather / body / opposite 各 24 問 × Lv1-3）。

| 層 | 解放範囲 | 問題数 | 全体比 |
|---|---|---|---|
| **free** | 全 8 カテゴリ × Lv1 から各 3 問サンプリング（trivia のみ 5 問） | **約 26 問** | 12% |
| **book** | inspire モード完全解放（82 問） + know モード Lv1 全部（38 問） | **120 問** | 57% |
| **sub** | **全 210 問**（know モードの Lv2 / Lv3 計 90 問が sub 専用） | **210 問** | 100% |

差別化のキモ: know モードの中・上級（Lv2 / Lv3 = 90 問）がアプリ (= sub) 専用。 trivia の Lv2 / Lv3（合計 42 問）が「びっくり豆知識の深掘り」としてアプリ (= sub) 限定。

#### B. maze（ポノとランタンのめいろ） — 全 10 ステージへ拡張予定

| 層 | 解放ステージ | ステージ数 | 全体比 |
|---|---|---|---|
| **free** | Stage 1-3 | 3 / 10 | 30% |
| **book** | Stage 1-7 | 7 / 10 | 70% |
| **sub** | Stage 1-10 | 10 / 10 | 100% |

差別化のキモ: book とアプリ (= sub) の差は 3 ステージ（Stage 8 / 9 / 10）。 凝った絵 + 難度高の「ご褒美ステージ」として位置付ける。
前提作業（本ドキュメント外）: 現状 Stage 1-5 のみ。 Stage 6-10 の素材作成は Phase 2 別タスク。

#### C. oto（ポノのおとタッチ） — 5 次元の組み合わせ

実態: リズムモード 3 曲（`kaeru` / `twinkle` / `ode`）、音色 6（`doremi` / `kira` / `marimba` / `animal` / `blip` / `taiko`）、スケール 2（`major` / `penta`）、モード 2（`free` / `rhythm`）、コードモード 2（`off` / `on`）。

| 層 | 音色 | スケール | モード | リズム曲 | コードモード |
|---|---|---|---|---|---|
| **free** | doremi, kira (2/6) | メジャー | じゆう | リズム自体ロック (0/3) | 単音のみ |
| **book** | +marimba, animal (4/6) | +ペンタ | +リズム | かえるのうた のみ (1/3) | +コード |
| **sub** | +blip, taiko (6/6) | 両方 | 両方 | 全 3 曲 (3/3) | 両方 |

差別化のキモ: リズムモード自体が book 解禁、その上アプリ (= sub) だけ 3 曲全部。 きらきらぼし・よろこびのうた = 子供が知っている定番曲がアプリ (= sub) にだけある状態。 taiko ドラム音色も「リズム遊びの幅が一気に広がる」のでアプリ層に温存。 将来曲追加時もアプリ (= sub) 専用枠から出すルール。

#### D. puzzle（ポノのなかよしパズル） — 全 20 ステージ

| 層 | 解放ステージ | ピース数 | ポノ特別枠 |
|---|---|---|---|
| **free** | Stage 1-3 | 4-6 ピース | なし |
| **book** | Stage 1-9 | 4-12 ピース、特別枠 #5 のみ | 1 枚 |
| **sub** | Stage 1-20 | 4-20 ピース、特別枠 #5 / #10 / #15 / #20 全部 | 4 枚 |

差別化のキモ: ポノ特別枠（5 / 10 / 15 / 20）は 4 枚あるが、book には 1 枚（#5）だけ味見、残り 3 枚（#10 / #15 / #20）はアプリ (= sub) 専用。 「ポノの絵本を全部集めたい」コレクション欲がアプリ (= sub) の継続動機。 ピース数も 12 vs 20 で完成体験の濃さが違う。

#### E. bento（ポノとつくろう いろどりべんとう） — 食材 30 / 箱 / NPC の 3 軸

| 層 | 食材数 | お弁当箱（= 段数自動決定） | NPC |
|---|---|---|---|
| **free** | 8 食材（主菜 3 + 副菜 3 + フルーツ 2） | 1 種（box_rect_split = 1 段）のみ | なし |
| **book** | 15 食材（free + 主菜 5 + 副菜 2） | 3 種（box_rect_split / box_square / box_round = 全部 1 段） | 3 体（りすちゃん / わんちゃん / しかさん） |
| **sub** | **30 食材**（book + 主菜 4 + 副菜 4 + フルーツ 7） | 全種（book + box_bear / box_bear_pink / box_cat_blue / box_cat = キャラ箱 2 段、 計 4 種追加） | 全 6 体（+ あひる / パンダ / ねこ） |

差別化のキモ: アプリ (= sub) と book の差は **15 食材** + キャラ箱 2 段 × 4 + NPC 3 体。 「中華系（ナポリタン / ぎょうざ / はるまき）」「サラダ（ポテト / ハム）」「えだまめ・きんぴら」「フルーツ全部（みかん / メロン / りんご / パイナップル / もも / ぶどう / キウイ の 7 種）」がアプリ (= sub) 専用 = キャラ弁・行楽弁当・遠足弁当が作れるのはアプリ (= sub) だけ。 ※ ゼリー / プリンは「お弁当のおかず」感が薄いため今回の 30 食材リストから除外し、将来「デザートタブ」枠として温存。

---

## 3. 設計原則:「幅 8 割解放 ＋ 深さ制限」

絵本購入者（book）の体験品質を保つため、以下の方針で設計する（`common/tier.js:22-25` 参照）。

- **幅**: book ユーザーは、ほぼ全ゲーム・全エリアに入れる（入口ではロックしない）。
- **深さ**: 各ゲームの中身は一部のみ解放。残りは「毎月ふえていくよ」という**伸びしろ表現**で sub に誘導する。
- **露骨なロック UI は避ける**。鍵マーク・×印の多用はしない。代わりに `PonoTier.showSubscribePromo()` の柔らかいモーダルで誘導（`common/tier.js:116-199`）。

book 層に開放する具体的コンテンツ ID は `common/tier.js` に配列でハードコード:
- `BOOK_AQUARIUM_CREATURE_IDS`（8 種、`tier.js:45-54`）
- `BOOK_ROOM_ITEM_IDS`（10 種、`tier.js:59-70`）

壁紙・床（`cat === 'wall' | 'floor'`）は「背景」扱いで book も全開放（`tier.js:83-84`）。

---

## 4. 無料ユーザーの動線

- `play.html` で locked カード（writing / drawing / bowling / breakout / slide）をタップすると、`common/promo.js` の `showLockedPreview()` がプロモモーダルを表示（スクショ + キャッチコピー + アプリ (= sub) 誘導）。
- ロック対象カード ID は `promo.js:22-28` の `LOCKED_CARD_IDS` に定義。
- プレビュー画像・文言は `promo.js:33-70` の `GAME_PREVIEWS` に集約。

---

## 5. book ユーザーの解錠フロー

- 絵本奥付にシリアル状のパスワードが印字されている（想定）。
- ユーザーがアプリ上でそれを入力 → `PonoTier.verifyBookPassword(val)` で検証（`tier.js:102-112`）。
- 成功すると `localStorage.pono_premium = '1'` をセット（実装箇所: `play.html:2081-2100`）。
- パスワード検証は大文字/小文字どちらでも通る。前後の空白もトリム。

### BOOK_PASSWORDS の管理
- `tier.js:99-101` の `BOOK_PASSWORDS` 配列で集中管理。
- **現状は `['1234']`（テスト用）**。実絵本印刷時に `'PONO-BOOK1-2026'` のようなシリアルコードへ置換する。
- 絵本を増刷・新シリーズを出すときは、この配列に追記する運用。
- Closure に閉じるので `window` からは見えない（DevTools 経由で覗き見されにくいが、完全秘匿ではない "casual friction"）。

---

## 6. sub ユーザーの解錠フロー

- 現時点ではストアフロント未実装。`localStorage.pono_sub_active = '1'` を直接セットすれば sub 相当になる（開発・テスト用）。
- 将来: 決済フロー導入後、ここを正規のアプリ (= sub) 管理に差し替える。
- TODO: アプリ (= sub) 解錠 UI の正式実装は Phase 3 課題（play.html 内に解錠モーダル新設、play-all.html からの脱却）。

---

## 7. 解放判定ヘルパー（一次ソース）

各ゲーム側で直接 localStorage を読まず、必ず `PonoTier` 経由で判定する。

```js
PonoTier.isAquariumCreatureUnlocked(id)      // 海の生き物が解放されているか
PonoTier.isRoomItemUnlocked(id, cat)         // 家具・かざりが解放されているか
PonoTier.isKatakanaUnlocked()                // カタカナ篇が解放されているか（= sub のみ）
```

新しい「部分解放コンテンツ」を追加するときは、`tier.js` 側に判定関数を追加してから各ゲームで呼ぶこと。個別ゲーム側に `if (tier === 'book') { ... }` を散らさない。

---

## 8. エリア再編（こだまの森）後の扱い（予告）

本ドキュメント作成時点では `play.html` の `lockedCards` 配列（`play.html:1338` 付近）でカード単位にロックしているが、将来のエリア再編（`C:\Users\surfe\.claude\plans\merry-gathering-hummingbird.md` 参照）では **エリア単位の tier 判定** に置き換える予定。

想定 API:
- `PonoTier.areaRequiresTier(areaKey)` → `'free' | 'book' | 'sub'`
- カードではなく **エリア** が tier を持ち、エリア内のコンテンツは暗黙的にそれに従う

この改修は「こだまの森」ブランドへの格上げと同時に実施する（MVP 期間中はやらない）。

---

## 9. 変更時のチェックリスト

tier の仕様を変えるとき、以下を一括で更新する:

- [ ] `common/tier.js`（一次ソース）
- [ ] 本ドキュメント `docs/TIER_POLICY.md`
- [ ] 必要に応じて `common/promo.js` の `LOCKED_CARD_IDS` / `GAME_PREVIEWS`
- [ ] `play.html` の `lockedCards` 配列（エリア再編後はエリア判定へ）
- [ ] 絵本パスワード追加時は `BOOK_PASSWORDS` に追記
- [ ] `sw.js` の `CACHE_VERSION` を上げる（PWA キャッシュ反映）

---

## 10. 参照

- 実装: `common/tier.js`、`common/promo.js`
- 使用箇所: `play.html`、`writing/index.html`、`stacking/index.html`、`slide/index.html`、`room/index.html`、`breakout/index.html`、`common/acorns.js`、`common/achievements.js`
- プロモ用スクショ置き場: `docs/SCREENSHOT_GUIDE.md`
- 将来のエリア再編計画: `C:\Users\surfe\.claude\plans\merry-gathering-hummingbird.md`

---

## 11. Phase 1 / 2 / 3 ロードマップ + 絵本 ⇔ アプリ差別化方針

### 全体ゴール

絵本『ありがとう』は**買い切り**で売上が止まるが、アプリ (= sub) は**継続契約モデル（月額）なので継続契約してもらう動機**が必要。 → **book と アプリ (= sub) の差を強く設計し**、book ユーザーに「アプリ (= sub) を続けないと損する」感覚を持たせる構造にする。

### Phase 1（今回 PR） — メニュー骨組と PonoTier API スケルトン

- `play.html` の GAMES 配列を上段 5 本（本命）+ 下段 4 本（じゅんびちゅう）に並び替え。 下段 4 本は `comingSoon: true, debugPlayable: true` で「彩度フィルタなしでタップ可能」。
- `common/tier.js` に **セーフフラグ `window.PONO_TIER_GAME_LOCKS_ENABLED = false`** + 新規定数 16 種 + 判定関数 14 個 + export 拡張を追加。 セーフフラグが false の間は各 `isXxxUnlocked` が常に true 返却 = **見た目は並び替えだけ、機能は一切ロックしない**。
- `common/promo.js` の文言を「えほん」「アプリ」表記に統一。
- 本ドキュメント `docs/TIER_POLICY.md` に §2 マトリクス（共通 5 本）+ §11 ロードマップ + §12 30 食材リストを追記。
- `sw.js` の CACHE_VERSION を 775 → **776** に bump。

### Phase 2（次 PR 以降） — 各ゲームへの実ロック挿入

`PONO_TIER_GAME_LOCKS_ENABLED = true` に切替後、各ゲーム本体に判定挿入:

- `quizland/index.html` の `buildPlaylist` に `PonoTier.isQuizlandQuestionUnlocked` フィルタ。
- `maze/index.html` のステージ選択 UI に `isMazeStageUnlocked` フック（Stage 6-10 の素材作成は別タスク）。
- `oto/index.html` の音色 / スケール / モード / リズム曲メニュー / コードモードに判定。 ロック曲は薄表示 + タップで `showSubscribePromo()`。
- `puzzle/main.js` の `BASE_STAGES` フィルタ。
- `bento/index.html` の `FREE_COOKED_OKAZU` を **30 食材**に拡張、`getFreeFoodCatalog` フィルタ、`NPC_REQUESTERS` ガード、お弁当箱選択 UI に `isBentoBoxUnlocked` 接続、NPC `shika` の wantedFoods をティア対応。
- 下段 4 本も実コンテンツ準備完了したものから `comingSoon: false` に格上げ。

並行別タスク:
- maze Stage 6-10 の新規ステージ作成（5 枚分、各 background art + nodes / edges 定義）。
- bento `FREE_COOKED_OKAZU` 追加 12 エントリの size / rotation 調整。

### Phase 3（将来）

- `play.html` 内にアプリ (= sub) 解錠モーダル新設（play-all.html から脱却）。
- アプリ (= sub) ストアフロント + 月額決済 → `pono_sub_active` の正規セット。
- zukan 36 匹追加 / カタカナ篇追加 / 下段 4 本の本配信。
- oto リズム曲追加（4 曲目以降は全部アプリ (= sub) 専用）。
- bento ステップモード再活性化時の 49 食材ティア対応。

### 絵本 ⇔ アプリ差別化サマリ（= アプリ (= sub) 継続動機）

| ゲーム | book にあり アプリ (= sub) にしかない要素 | 体験差 |
|---|---|---|
| **quizland** | know モードの Lv2 / Lv3 = **90 問**（trivia Lv2 / 3 = 42 問の深掘り含む） | 「びっくり豆知識」を毎月深掘りできるのはアプリ (= sub) だけ |
| **maze** | Stage 8 / 9 / 10（3 ステージ） | 凝った絵と難度のご褒美 |
| **oto** | リズム曲 きらきらぼし / よろこびのうた + 音色 blip / taiko + コードモード一部 | 「子供が知ってる定番曲」を演奏できるのはアプリ (= sub) だけ |
| **puzzle** | Stage 10-20（11 ステージ、16-20 ピース大物含む）+ ポノ特別枠 #10 / #15 / #20（3 枚） | 完成達成感と「ポノ絵本コレクション」がアプリ (= sub) に集中 |
| **bento** | 中華・サラダ・デザート系 **15 食材** + キャラ箱 2 段 × 4 + NPC 3 体 | キャラ弁・行楽弁当が作れるのはアプリ (= sub) だけ、SNS 映え画面 |

**継続動機の構造**: アプリ (= sub) は「毎月ふえていくよ」「あたらしい○○」をプロモコピーに採用（既存 `promo.js` + `showSubscribePromo` の `まいつき ふえていくよ` タグを活用）。 = **book ユーザーは「アプリ (= sub) を続けないと損する」感覚でアプリ (= sub) へ転換する**設計になっている。

---

## 12. bento 30 食材ティア配分リスト

**実態の正しい把握:** bento には既に **49 食材**が用意されている（`RICE` 3 + `OKAZU_MEAT` 19 + `OKAZU_VEG` 15 + `FRUITS` 12）。 ただしフリーレイアウトモード（`FREE_COOKED_OKAZU`、`bento/index.html` L2697-L2716）で使えるのは 18 食材のみ。

ユーザー要望「30 食材まで増やそう、サラダとか付け足したい」 = **フリーレイアウトを 18 → 30 に拡張**を意味する。 既存 49 食材から 12 個ピックアップして `FREE_COOKED_OKAZU` に追加すれば完結 = **新規画像生成は不要**。

「しろごはん」は元々お弁当箱形状で自動敷きされるベース（`riceBases` `bento/index.html` L3246-L3250）。 選択食材ではないので今回のティア配分には含めない（= 全ティア共通）。

### 30 食材リスト v3

既存 49 食材からピックする方式。 ★ = 既存だがフリーレイアウト未対応（Phase 2 で `bento/index.html` L2697 に追加実装）。

| カテゴリ | 食材 | 配分 |
|---|---|---|
| 主菜 | タコウインナー / ハンバーグ / たまごやき | free (3) |
| 主菜 | からあげ / コロッケ / エビフライ / やきざけ / **ミートボール★** | book (5) |
| 主菜 | **ナポリタン★** / **ぎょうざ★** / **はるまき★** / **ベーコンまき★** | sub (4) |
| 副菜 | キャベツ / プチトマト / **ブロッコリー★** | free (3) |
| 副菜 | にんじんいんげん / **コーンほうれんそう★** | book (2) |
| 副菜 | きんぴらごぼう / **えだまめ★** / **ポテトサラダ★** / **ハムサラダ★** | sub (4) |
| フルーツ | いちご / **バナナ★** | free (2) |
| フルーツ | みかん / メロン / りんご / パイナップル / もも / **ぶどう★** / キウイ | sub (7) |

合計: free 8 / book 累計 15（+7 = 主菜 5 + 副菜 2、フルーツ無し）/ sub 累計 30（+15 = 主菜 4 + 副菜 4 + フルーツ 7）

> 注: ゼリー / プリンは「お弁当のおかず」感が薄いため今回の 30 食材リストから除外。 将来「デザートタブ」枠として別途復活させる余地を残す（現時点では対象外）。

### NPC 配分

| 層 | NPC | 体数 |
|---|---|---|
| **free** | なし | 0 |
| **book** | りすちゃん / わんちゃん / しかさん | 3 体 |
| **sub** | book + あひる / パンダ / ねこ | 全 6 体 |

NPC `shika` の wantedFoods（`にんじんいんげん`, `きんぴらごぼう`）にきんぴら = sub 食材が含まれる問題 → book ユーザーには `shika` NPC の wantedFoods をティア内に絞る（NPC 抽選除外ではなく、要求食材差し替え）。
NPC `neko` の wantedFoods `'ごはん'` は `riceBases` 経由なのでティア無関係（常時 OK）。

### お弁当箱配分

| 層 | お弁当箱（= 段数自動決定） | 種類数 |
|---|---|---|
| **free** | box_rect_split（1 段）のみ | 1 種 |
| **book** | box_rect_split / box_square / box_round（全部 1 段） | 3 種 |
| **sub** | book + box_bear / box_bear_pink / box_cat_blue / box_cat（キャラ箱 2 段、 計 4 種追加） | 全 7 種 |

※ 既存箱素材を再利用するので新規箱素材作成は不要（旧プランの「round 2 段★ / square 2 段★」案は廃案）。 既存の 3 段キャラ箱は **2 段化**して sub 限定で残す方針（`bentoBoxes` の `tierCount: 3 → 2` 変更）。

### 実装メモ（Phase 2）

- `OKAZU_MEAT` / `OKAZU_VEG` / `FRUITS` 配列に既に 48 食材分の画像メタが揃っているので、`FREE_COOKED_OKAZU` に 12 エントリ追加するだけで実現（画像パス再利用、`size` / `rotation` は調理済み版に合わせて再調整）。
- 段数は `getBoxTierCount(box)`（`bento/index.html` L3819）で取得、お弁当箱選択 UI で `PonoTier.isBentoBoxUnlocked(boxId)` ガード。
- キャラ箱（box_bear / box_bear_pink / box_cat_blue / box_cat）は `tierCount` を **3 → 2** に変更（新規箱を作らず既存素材を 2 段化）。 これにより sub だけ「2 段おべんとう」を体験できる差別化を維持。
- ステップモード（`RICE` / `OKAZU_MEAT` 等 49 食材）のティア対応は Phase 3 で別途検討（現状ステップモードは未使用）。

### アレルギー配慮

新規追加分にピーナッツ / カニ / そばなし。 卵（たまごやき / ナポリタン / プリン）/ 小麦（はるまき / ぎょうざ衣）/ 乳（チーズ / プリン / ハム）/ 大豆（きんぴら）は既存範囲内。
