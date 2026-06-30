# TIER POLICY — 無料 / 絵本購入者 / アプリ (= sub) の境界

ユーザー層（tier）の判定ルールと、各層に解放される範囲の正式仕様。
実装の一次ソースは `common/tier.js`。本ドキュメントは人間向けの参照用。
不整合が生じた場合は `common/tier.js` を正とし、本ドキュメントを更新する。

---

## 1. 3 階層の定義

| 階層 | キー | 判定条件 | 想定ユーザー |
|---|---|---|---|
| **free** | `'free'` | デフォルト | 未購入。ポノの遊び場のみ体験 |
| **book** | `'book'` | `localStorage.pono_premium === '1'` | 絵本『ありがとうって、うれしいね 〜くまのこ ポノ の ちいさな ものがたり〜』購入者（奥付パスワードで解錠） |
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

#### A. quizland（フクロウはかせのなぞなぞ） — 実問題数 **全 180 問**（2026-06-30 再配分方針）

実態: `quizland/data/questions.js` の現行データは 8 カテゴリ / 全 180 問。 難易度内訳は Lv1=62 問、Lv2=61 問、Lv3=57 問。

旧方針の「free は Lv1 だけ / book は Lv2 まで」は廃止。 free が低年齢層専用に見えたり、book が本編量として強くなりすぎたりするのを避けるため、**free / book ともに Lv1 / Lv2 / Lv3 を混ぜた少量プール**へ変更する。 book の差別化は問題数では控えめにし、絵本購入者向けの限定シール・シール帳表紙・見た目特典へ寄せる。

| 層 | 解放範囲 | 問題数 | 全体比 |
|---|---|---|---|
| **free** | 25 問。 8 カテゴリから Lv1 / Lv2 / Lv3 を各 1 問ずつ選び、 追加 1 問は trivia Lv2。 | **25 問** | 14% |
| **book** | free 25 問 + 追加 15 問。 追加分も Lv1 / Lv2 / Lv3 を各 5 問ずつ、カテゴリを散らして選ぶ。 | **40 問** | 22% |
| **sub** | **全 180 問**。 難易度選択と全カテゴリ全問を解放。 | **180 問** | 100% |

free は 5 問 × 5 回分の「おすすめ 5 もん」体験を作る。 25 問を使い切るまでは出題済み ID を `localStorage` で避け、使い切ったら履歴をリセットして再シャッフルする。 book は累計 40 問 = 5 問 × 8 回分程度に留める。

free / book の UI 方針:
- 難易度選択画面（やさしい / ふつう / むずかしい）は表示しない。
- `はじめる` から直接「おすすめ 5 もん」を開始する。
- 内部的には Lv1 / Lv2 / Lv3 を混ぜるが、子どもには「難しい問題がロックされている」印象を出さない。

sub の UI 方針:
- 難易度選択画面を残す。
- `やさしい / ふつう / むずかしい` から選んで全 180 問を遊べる。
- 将来 `おすすめ` を追加する余地はあるが、初回実装では既存の 3 難易度導線を維持する。

実装メモ:
- `common/tier.js` の QuizLand 判定は、max level 方式ではなく ID allowlist 方式へ寄せる。
- `FREE_QUIZLAND_QUESTION_IDS` は 25 問、 `BOOK_QUIZLAND_QUESTION_IDS` は free 25 問 + 追加 15 問の累計 40 問を正本にする。
- `quizland/index.html` は free / book の場合だけ難易度選択をスキップし、mixed playlist builder を使う。
- `isQuizlandDifficultyUnlocked()` は sub 用 UI のために残すが、free / book の通常導線では露出させない。

#### B. maze（ポノとランタンのめいろ） — 現行 7 ステージ / 将来 10 ステージへ拡張予定（2026-07-01 再配分方針）

旧方針の「free は Stage 1-3 / book は Stage 1-7」の連番ロックは廃止。 free が序盤チュートリアルだけに見えるのを避けるため、QuizLand と同じく **簡単・普通・難しめを抜粋して混ぜる allowlist 方式**にする。

現行 `maze/imageStages/_index.json` では slot 1-7 が本編ステージ。 実装上の判定は内部 slot ID を使い、子ども向け表示では free / book の解放済みステージだけを `ステージ 1 / 3` のように tier 内連番へ詰める。 free / book で `ステージ 1, 3, 6` のような穴あき表示はしない。

| 層 | 解放ステージ | ステージ数 | 全体比 |
|---|---|---|---|
| **free** | internal slot 1 / 3 / 6 | 3 / 7（将来 3 / 10） | 43%（将来 30%） |
| **book** | internal slot 1 / 2 / 3 / 4 / 6 | 5 / 7（将来 5 / 10） | 71%（将来 50%） |
| **sub** | 現行 slot 1-7 全部 + 将来 slot 8-10 | 7 / 7（将来 10 / 10） | 100% |

free は導入ステージ、通常ルート、ギミック強めステージを混ぜる。 book は free に 2 ステージだけ足し、絵本購入特典として少し広がる程度に留める。 sub は現行全ステージと将来追加 stage 8-10 を持つ。

実装メモ:
- `common/tier.js` の Maze 判定は、`FREE_MAZE_MAX_STAGE` / `BOOK_MAZE_MAX_STAGE` の max stage 方式から `FREE_MAZE_STAGE_IDS` / `BOOK_MAZE_STAGE_IDS` の allowlist 方式へ寄せる。
- `maze/index.html` のステージ選択 modal は、free / book では解放済み stage だけを表示する。
- `loadStage(n)` 側の `isMazeStageUnlocked()` guard は残し、URL 直打ちや古い保存状態から未解放 stage に入れないようにする。
- 将来 stage 8-10 を追加した時は、初期状態では sub 専用にする。

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

## 3. 設計原則:「入口は広く、本編量は控えめ、付録で差別化」

絵本購入者（book）の体験品質を保つため、以下の方針で設計する（`common/tier.js:22-25` 参照）。

- **入口**: book ユーザーは、ほぼ全ゲーム・全エリアに入れる（入口ではロックしない）。
- **本編量**: book は本編コンテンツを増やしすぎない。 free / book ともに簡単・普通・難しいを少量ずつ混ぜ、年齢層の幅を保つ。 全量・難易度選択・継続追加は sub に集中させる。
- **付録差**: book の価値は、限定シール、シール帳表紙、見た目特典、絵本連動アイテムなどの「持っていてうれしい」付録へ寄せる。 パスワード流出時に本編量の大きな価値が流出しないようにする。
- **ロック表示**: 各 UI 要素 (音色ボタン / 食材パレット / 箱選択 / リズム曲 等) のロック状態は **`.tier-locked` クラスでグレーアウト (saturate 低下 + opacity 0.6) + 中央に鍵マーク🔒 を疑似要素で表示** する。 拡大縮小アニメは抑止 (静止画化) して「触れない感」を強調。 タップ自体は通し、 `PonoTier.showSubscribePromo()` の柔らかいモーダル「○○ が ふえているよ！ アプリ で あそべるよ」で誘導する（`common/tier.js:116-199`）。
- **×印は使わない**: 「ロックされている」より「もっとある」を伝える設計を維持。

book 層に開放する具体的コンテンツ ID は `common/tier.js` に配列でハードコード:
- `BOOK_AQUARIUM_CREATURE_IDS`（8 種、`tier.js:45-54`）
- `BOOK_ROOM_ITEM_IDS`（10 種、`tier.js:59-70`）

壁紙・床（`cat === 'wall' | 'floor'`）は「背景」扱いで book も全開放（`tier.js:83-84`）。

---

## 4. 無料ユーザーの動線

- `play.html` で locked カード（writing / drawing / bowling / breakout / slide）をタップすると、`common/promo.js` の `showLockedPreview()` がプロモモーダルを表示（スクショ + キャッチコピー + アプリ (= sub) 誘導）。
- ロック対象カード ID は `promo.js:22-28` の `LOCKED_CARD_IDS` に定義。
- プレビュー画像・文言は `promo.js:33-70` の `GAME_PREVIEWS` に集約。
- 「本をもっている人へ」ボタンの動線は **play-all.html への遷移ではなく `play.html` 内の `passwordUnlockModal` 起動** に変わった（§5 参照）。

---

## 5. book ユーザーの解錠フロー

- 絵本奥付にシリアル状のパスワードが印字されている（想定）。
- `play.html` の「本をもっている人へ」ボタンをタップすると、同一画面内の `passwordUnlockModal` が起動する（旧: `play-all.html#unlock` への遷移 → lockBtn UI、廃止）。
- モーダル内で入力 → `PonoTier.verifyBookPassword(val)` で検証（`tier.js:102-112`）。
- 成功すると `localStorage.pono_premium = '1'` をセット + 成功メッセージ「✨ えほん モード が ひらいたよ ✨」を表示。
- 「あそびに もどる」ボタンで自動リロード → メニュー再描画で book ティアコンテンツが解放される。
- パスワード検証は大文字/小文字どちらでも通る。前後の空白もトリム。
- 関連実装ファイル: `play.html`（`passwordUnlockModal`）、`common/tier.js`（`verifyBookPassword`）。
- 背景フレーム素材: `assets/images/bento/cooking/ui/recipe_card_frame.png`（406x545、クリーム塗り + 茶枠 + 下部にオレンジリボン + 緑葉っぱの絵本カード風、bento kitchen のレシピカードから流用）。

### BOOK_PASSWORDS の管理
- `common/tier.js` の `BOOK_PASSWORDS` 配列で集中管理。
- **現状は `['arigato_pono2026']`**（v17XX で `['1234']` テスト用パスワードと管理用 `ADMIN_PASSWORDS=['abcd']` を統合し 1 本化）。実絵本印刷時はこの 1 本を奥付に印字する想定。
- 絵本を増刷・新シリーズを出すときは、この配列に追記する運用。
- Closure に閉じるので `window` からは見えない（DevTools 経由で覗き見されにくいが、完全秘匿ではない "casual friction"）。
- `verifyAdminPassword` / `ADMIN_PASSWORDS` は v17XX で削除済。 管理用マスター解錠は admin tools 本体側の Basic Auth + KV ルートに一本化。

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

### 運用方針確定（2026-06-28）

3-tier (free / book / sub) の運用が正式方針。 `PONO_TIER_GAME_LOCKS_ENABLED = true` で各ゲームに実ロック発動中（= 下記 Phase 2 が現行運用）。 過去にあった「Web MVP は全機能無料公開」プランは廃案。 free は限定体験、 book は Amazon 絵本購入者向け奥付パスワード解錠、 sub はアプリ購入者向け全機能解錠（book 範囲 + α）の 3 階層運用を継続する。

### 全体ゴール

絵本『ありがとうって、うれしいね 〜くまのこ ポノ の ちいさな ものがたり〜』は**買い切り**で売上が止まるが、アプリ (= sub) は**継続契約モデル（月額）なので継続契約してもらう動機**が必要。 → **book と アプリ (= sub) の差を強く設計し**、book ユーザーに「アプリ (= sub) を続けないと損する」感覚を持たせる構造にする。

### Phase 1（完了） — メニュー骨組と PonoTier API スケルトン

- `play.html` の GAMES 配列を上段 5 本（本命）+ 下段 4 本（じゅんびちゅう）に並び替え。 下段 4 本は `comingSoon: true, debugPlayable: true` で「彩度フィルタなしでタップ可能」。
- `common/tier.js` に **セーフフラグ `window.PONO_TIER_GAME_LOCKS_ENABLED`** + 新規定数 16 種 + 判定関数 14 個 + export 拡張を追加。
- `common/promo.js` の文言を「えほん」「アプリ」表記に統一。
- 本ドキュメント `docs/TIER_POLICY.md` に §2 マトリクス（共通 5 本）+ §11 ロードマップ + §12 30 食材リストを追記。

### Phase 2（現行運用） — 3-tier 実ロック稼働中

`PONO_TIER_GAME_LOCKS_ENABLED = true` で運用中。 各ゲーム本体に判定が挿入済:

- `quizland/index.html` の `buildPlaylist` に `PonoTier.isQuizlandQuestionUnlocked` フィルタ。 2026-06-30 再配分方針では、free / book は難易度選択をスキップして mixed playlist（おすすめ 5 もん）へ直行、sub のみ難易度選択を表示する。
- `maze/index.html` のステージ選択 UI に `isMazeStageUnlocked` フック。 2026-07-01 再配分方針では max stage 方式ではなく allowlist 方式にし、free/book は解放済みステージだけを tier 内連番で表示する。
- `oto/index.html` の音色 / スケール / モード / リズム曲メニュー / コードモードに判定。 ロック曲は薄表示 + タップで `showSubscribePromo()`。
- `puzzle/main.js` の `BASE_STAGES` フィルタ。
- `bento/index.html` の `FREE_COOKED_OKAZU` を **30 食材**に拡張、`getFreeFoodCatalog` フィルタ、`NPC_REQUESTERS` ガード、お弁当箱選択 UI に `isBentoBoxUnlocked` 接続、NPC `shika` の wantedFoods をティア対応。
- 下段 4 本も実コンテンツ準備完了したものから `comingSoon: false` に格上げ。

並行別タスク:
- maze Stage 8-10 の新規ステージ作成（各 background art + nodes / edges 定義）。 追加時は初期状態で sub 専用。
- bento `FREE_COOKED_OKAZU` 追加 12 エントリの size / rotation 調整。
- `play.html` 内パスワード解除モーダル（`passwordUnlockModal`）実装完了、`play-all.html` 経由の解錠フローを非推奨化（将来削除候補）。

### Phase 3（将来）

- `play.html` 内にアプリ (= sub) 解錠モーダル新設（play-all.html から脱却）。
- アプリ (= sub) ストアフロント + 月額決済 → `pono_sub_active` の正規セット。
- zukan 36 匹追加 / カタカナ篇追加 / 下段 4 本の本配信。
- oto リズム曲追加（4 曲目以降は全部アプリ (= sub) 専用）。
- bento ステップモード再活性化時の 49 食材ティア対応。

### 絵本 ⇔ アプリ差別化サマリ（= アプリ (= sub) 継続動機）

| ゲーム | book にあり アプリ (= sub) にしかない要素 | 体験差 |
|---|---|---|
| **quizland** | free/book は混合 25/40 問に留め、アプリ (= sub) は全 **180 問** + 難易度選択 | free/book は年齢幅のある「おすすめ 5 もん」、全量と選択性はアプリ (= sub) に集中 |
| **maze** | free/book は抜粋 3/5 ステージ、アプリ (= sub) は現行全 7 ステージ + 将来 Stage 8 / 9 / 10 | free/book は難易度を混ぜた抜粋、全ステージと追加ステージはアプリ (= sub) に集中 |
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
