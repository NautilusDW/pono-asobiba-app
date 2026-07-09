# TIER POLICY — 無料 / 絵本購入者 / アプリ (= sub) の境界 (v3.2)

ユーザー層（tier）の判定ルールと、各層に解放される範囲の正式仕様。
実装の一次ソースは `common/tier.js`。本ドキュメントは人間向けの参照用。
不整合が生じた場合は `common/tier.js` を正とし、本ドキュメントを更新する。

> **v3.2（2026-07-08）で maze / puzzle / oto / bento の book > free を復帰。**
> quizland は v3 の **free = book（機能差ゼロ）** を維持する。
> book の本編追加は限定的な抜粋で、sub の全解放とは明確に差を残す。
> 変更の経緯は末尾「## 履歴」を参照。

---

## 1. 3 階層の定義

| 階層 | キー | 判定条件 | 想定ユーザー |
|---|---|---|---|
| **free** | `'free'` | デフォルト | 未購入。ポノの遊び場のみ体験 |
| **book** | `'book'` | `localStorage.pono_premium === '1'` | 絵本『ありがとうって、うれしいね 〜くまのこ ポノ の ちいさな ものがたり〜』購入者（奥付パスワードで解錠） |
| **sub** | `'sub'` | `localStorage.pono_sub_active === '1'` | アプリ (= sub) 契約者。`APP_BUILD=1` 環境では自動的に sub 扱い |

判定の優先順位: `sub` > `book` > `free`（`common/tier.js`）。

公開 API:
- `window.PonoTier.getTier()` → `'free' | 'book' | 'sub'`
- `window.PonoTier.isFree() / isBook() / isSub()`

---

## 2. 原則:「free は体験、book は追加抜粋、sub は全解放」

v3.2 の核となる原則は以下の 4 つ。

1. **maze / puzzle は book で追加抜粋を解放する。** free は入口として年齢幅のある抜粋、book は free に数ステージを足す。sub は全ステージ解放。
2. **quizland は free = book を維持する。** oto / bento は既存ロックUIを活かし、book で追加の遊びを少し広げる。
3. **年齢バランスを重視する。** free の解放範囲は、各ゲームで簡単・普通・難しいを散らして選ぶ。低年齢層専用にも高難度専用にも偏らせない。
4. **sub は全 content + 全付録 + 蓄積系。** sub のみが全ゲーム・全ステージ・全食材・sub 専用ゲーム 7 本・sub 専用シール・デイリーガチャ全ページを持つ。sub と free/book の差は「量」であり、量の差こそが継続契約の動機になる。

### なぜ一度 free = book にしたか

旧仕様（book が free よりステージ数や食材数で少し勝る設計）は、合言葉が SNS 等で拡散した場合に本編コンテンツの価値がそのまま流出するリスクを抱えていた。v3 では一度 book の解放範囲を free と同一にしたが、v3.1/v3.2 ではユーザー判断により maze / puzzle / oto / bento の追加抜粋を復帰した。詳細は §6「合言葉流出耐性の構造的防御」を参照。

---

## 3. ゲーム別解放範囲

以下は free / book / sub の解放範囲。**maze / puzzle / oto / bento は book が free より広い。**

### 3.1 maze（ポノとランタンのめいろ）

| 層 | 解放ステージ（internal slot） | ステージ数 |
|---|---|---|
| **free** | Stage 1 / 3 / 6 | 3 / 7 |
| **book** | Stage 1 / 2 / 3 / 4 / 6 | 5 / 7 |
| **sub** | Stage 1-7 全部 | 7 / 7 |

- free は Stage 1（導入）/ Stage 3（通常ルート）/ Stage 6（ボス手前）で広く体験させる。
- book は Stage 2 / 4 を追加し、序盤から中盤の厚みを出す。
- **Stage 7（最終ボス）は free/book に含めない。** 最終ボスを free/book で露出させると物語の結末が先に見えてしまうため除外。
- Stage 8-10 の新規制作は **優先度を下げる**（§7 参照）。追加時は初期状態で sub 専用とする方針は維持。

### 3.2 puzzle（ポノのなかよしパズル）

| 層 | 解放ステージ ID | ピース数 |
|---|---|---|
| **free** | Stage 1 / 4 / 7 / 13 | 4 / 6 / 9 / 16 ピース |
| **book** | Stage 1 / 4 / 5 / 7 / 11 / 13 / 17 | 4 / 6 / 特別枠 / 9 / 12 / 16 / 20 ピース |
| **sub** | Stage 1-20 全部 | 4-20 ピース |

- free は 4 / 6 / 9 / 16 ピースで簡単・普通・難しいを散らす。
- book は Stage 5 のポノ特別枠と、Stage 11 / 17 を追加する。Stage 10 / 15 / 20 のポノ特別枠は sub 専用のまま維持。

### 3.3 quizland（フクロウはかせのなぞなぞ）

| 層 | 解放範囲 | 問題数 |
|---|---|---|
| **free = book** | Lv1=10 / Lv2=10 / Lv3=6 のおすすめ固定プール | **26 問** |
| **sub** | 全カテゴリ全問（180 問）+ 難易度選択 | **180 問** |

- free/book は難易度選択画面（やさしい/ふつう/むずかしい）を表示しない。`はじめる` から直接おすすめ5問へ入る。
- 1ラウンド5問は **Lv1 2問 / Lv2 2問 / Lv3 1問** の順で組む。単純ランダムにはせず、難しい問題だけ・簡単な問題だけに偏らないようにする。
- 同じカテゴリが1ラウンド内で重なりにくいようにし、履歴を使って同じ問題が出すぎないようにする。
- sub のみ難易度選択 UI を表示し、全 180 問・全カテゴリへアクセスできる。

### 3.4 bento（ポノとつくろう いろどりべんとう）

| 層 | 食材数 | お弁当箱 / NPC | のり・かざり |
|---|---|---|---|
| **free** | 10 食材（主菜 4 + 副菜 4 + フルーツ 2） | 1 箱 / NPC なし | 基本の顔パーツ + ピック |
| **book** | 16 食材（free + 6 食材） | 3 箱 / NPC 3 種 | 追加の顔セット・のり形状・かざり |
| **sub** | 全 30 食材 | 全箱 / 全 NPC | 全解放 |

- free の食材は「タコウインナー / ハンバーグ / からあげ / コロッケ / たまごやき / キャベツ / プチトマト / ブロッコリー / いちご / バナナ」。
- book は「エビフライ / やきざけ / ぎょうざ / にんじんいんげん / ミートボール / みかん」を追加する。
- のり・かざりは `bento/index.html` の `minTier` で制御する。free は基本顔パーツとピック、book は追加セット・追加形状を解放する。

### 3.5 oto（ポノのおとタッチ）

| 層 | 音色 | スケール | モード | リズム曲 / 和音 |
|---|---|---|---|---|
| **free** | doremi / kira / animal（3 種） | メジャーのみ | じゆう + リズム | かえるのうた / 和音 OFF |
| **book** | free + taiko / marimba / blip（計 6 種） | メジャー + ペンタ | じゆう + リズム | かえるのうた / 和音 ON |
| **sub** | 全音色 + 将来追加 | 全スケール | 全モード | 全曲 + 将来追加曲 |

- free は基本音色とリズム体験を残し、book で追加音色・ペンタ・和音を解放する。リズム曲は free/book 共通で「かえるのうた」まで。sub は「かえるのうた / メリーさん / きらきらぼし / ちょうちょう / ロンドンばし / よろこびのうた / せいじゃの こうしん」まで遊べる。
- 音タッチが単なる自由演奏だけに見えないよう、リズムモードは free/book にも残す。

---

## 4. book 付録（ステージ追加とは別の対価）

book は maze / puzzle の追加抜粋とは別に、以下の付録を持つ。free には付与しない。sub は全て含む。

### 4.1 特別シール 8 枚

パスワード入力後の welcome 演出で確定贈呈（book 購入確認済みの証としてまとめて付与）。catalog 実体は `assets/data/game-stickers.json` の `pages.book-bonus.stickers`（2026-07-06 に 9→8 枚化。`book_bonus_duck_rare`「アヒル」を廃止）。

1. 絵本表紙ミニチュア（`book_bonus_pono_book_rare`「ぽのとえほん」、rare、完成）
2. 絵本シーン再現 A（`book_bonus_mama_pono_super`「ママとぽの」、super、完成）
3. キャラクター設定画（`book_bonus_hedgehog_rare`「ハリネズミ」、rare、完成）
4. 絵本シーン再現 B（`book_bonus_friends_super`「なかよし」、super、完成）
5. 「ありがとう ポノ」メッセージシール（`book_bonus_ehon_medal_super`「えほんメダル」、super、完成）
6. **動くシール: ポノが手を振るアニメ**（`book_bonus_wave_greeting`「てをふるポノ」、super、TEMP: Brand Kit 納品後に差し替え。CSS animation。静止フレームでの意匠は Brand Kit 依頼書側で規定）
7. キャラクター集合（家族写真風）（`book_bonus_family_photo`「みんなでしゃしん」、super、TEMP: Brand Kit 納品後に差し替え）
8. 「あいことば ありがとう」記念（`book_bonus_password_thanks`、super、TEMP: Brand Kit 納品後に差し替え）

### 4.2 シール帳特別表紙（book_buyer_edition）

- `Prototypes/StickerBookThreeJS/main.js` の `BOOK_VARIANTS` に専用エントリを追加。
- `coverFront`: 絵本表紙の再構成 + 右下に「絵本を読んでくれたあなたへ」。
- `coverInside`: 名前差し込み欄（`localStorage.pono_user_name` を Canvas で動的描画）。

### 4.3 welcome 演出（1 回限定）

- 制御フラグ: `localStorage.pono_book_welcome_shown_v1`
- 流れ: 暗転 → ポノが手紙を持って歩く 2 秒アニメ → 手紙カード表示（TTS「ありがとう」ボイス、既存 Gemini Leda ナレーションパイプラインを使用。キャラ自身の肉声化はしない — `[[policy_character_voice]]`）→「ポノからのプレゼント」でシール 8 枚 reveal →「シールちょうの ひょうしも とくべつになったよ」で特別表紙お披露目。
- skip ボタンを常設。skip しても特典 grant は確定する。

### 4.4 月 1 おかえり演出

- book / sub 共通。頻度は `localStorage` で制御。
- ポノが手を振る 1 秒アニメ + 「絵本をかってくれて ありがとうね」。

### 4.5 ポノからの手紙カード

- シール帳 8 ページ目「絵本特典」から後から見返し可能。
- `window.print()` による紙印刷に対応。

---

## 5. sub 維持（新規 content 追加なし）

sub は v3 移行後も以下を維持し、**新規本編コンテンツの追加は行わない**（free/book の付録拡張とは別軸）。

| 項目 | 内容 |
|---|---|
| 全 content | maze 1-10 / puzzle 1-20 / quizland 180 問 / bento 30 食材 / oto 全音色・全曲 |
| sub 専用ゲーム | starparodier / undersea-cave / sea-album / writing-mori / zukan / cooking / wordmatch（計 7 本） |
| sub 専用シール | 10-12 枚（既存の余剰選別 7-9 枚 + Brand Kit 新規 2-3 枚） |
| sub 専用表紙 | 1-2 種 |
| デイリーガチャ | 全 10 ページ（free/book は quizland 1 ページのみ） |
| 「はじめからのおともだち」表示 | Founder / 創設メンバーの絵本トーン rename 表示 |

---

## 6. 合言葉流出耐性の構造的防御

v3.2 の設計は、絵本奥付の合言葉が SNS 等で拡散されるリスクを前提に、以下の三重の構造的防御を持つ。

1. **book の本編追加は maze / puzzle の抜粋に限定。** 合言葉が流出しても増えるのは maze 2 ステージ、puzzle 3 ステージ + Stage 5 特別枠、book 付録だけ。quizland / bento / oto は free と同じ範囲のまま維持する。
2. **sub の物量差が圧倒的。** sub は全 content（maze 全 10 / puzzle 全 20 / quizland 全 180 問 / bento 全 30 食材 / oto 全曲）+ sub 専用ゲーム 7 本 + sub 専用シール 10-12 枚 + デイリーガチャ全 10 ページを持つ。book の抜粋と付録がどれだけ拡散されても、sub との体験量の差は埋まらないため、「合言葉さえあれば sub は要らない」という状況は構造的に発生しない。
3. **APP_BUILD ゲート。** アプリ (= sub) 版ビルド（`APP_BUILD=1`）は合言葉入力を経由せず自動的に sub 判定される。合言葉は book 判定専用の入口であり、sub 判定とは独立した経路のため、合言葉の流出が sub 側のセキュリティに影響しない。

---

## 7. play.html 3 ゾーン UI

`play.html` のメニューは以下の 3 ゾーンで構成する。**造語ネーミングは使わない**（例:「おつきさまのおへや」等は禁止）。

| ゾーン名 | 内容 |
|---|---|
| **いま あそべる** | free / book が遊べる 5 ゲーム（maze / puzzle / quizland / bento / oto）。maze / puzzle は tier に応じて解放数が変わる |
| **アプリで あそべる** | sub 専用 7 ゲーム（starparodier / undersea-cave / sea-album / writing-mori / zukan / cooking / wordmatch） |
| **じゅんびちゅう** | 未制作（cooking / wordmatch が実装完了するまでの暫定表示。実装完了後は「アプリで あそべる」ゾーンへ昇格） |

---

## 8. 誘導モーダル

### 8.1 book ユーザーが「アプリで あそべる」ゾーンをタップした時

> 「ありがとう、 絵本を よんでくれて。
> book で あそべる ゲームは、 アプリでも おなじ。
> でも、 アプリには アプリだけの ゲームが 7つ、 もらえる シールも たくさん あるよ。」
>
> `[いまは いいや]` `[アプリを みてみる]`

- 表示頻度: 24 時間に 1 回。× で dismiss した場合は 7 日間非表示。
- 制御キー: `localStorage.pono_sub_promo_*`（既存 `promo.js` の頻度制御を踏襲）。

### 8.2 free ユーザーが「アプリで あそべる」ゾーンをタップした時

> 「このゲームは、 絵本を かってくれた人と アプリで あそんでくれる人 だけの ゲームだよ。
> 絵本には、 ポノからの あいことばが あるよ。」
>
> `[とじる]` `[絵本を みてみる]`

---

## 9. book ユーザーの解錠フロー

- 解錠経路は **合言葉（`verifySerialCode` / `BOOK_PASSWORDS`）or 絵本クイズ（`verifyQuizAnswer`）** の 2 択。Amazon 注文番号経路は author 側で verify 不能なため 2026-07-06 に撤去（`verifyOrderId` も `common/tier.js` から削除済み）。
- 絵本奥付にシリアル状のパスワードが印字されている。
- `play.html` の「本をもっている人へ」ボタンをタップすると、同一画面内の `passwordUnlockModal` が起動し、「あいことば」「絵本クイズ」の 2 タブが表示される。
- モーダル内で入力 → `PonoTier.verifyBookPassword(val)` で検証。
- 成功すると `localStorage.pono_premium = '1'` をセット → welcome 演出（§4.3）が起動 → 完了後にメニュー再描画で book 付録が反映される。
- パスワード検証は大文字/小文字どちらでも通る。前後の空白もトリム。
- 関連実装ファイル: `play.html`（`passwordUnlockModal`）、`common/tier.js`（`verifyBookPassword`）。

### BOOK_PASSWORDS の管理

- `common/tier.js` の `BOOK_PASSWORDS` 配列で集中管理。
- **現状は `['arigato_pono2026']`**（旧 `1234` テスト用パスワードと管理用 `abcd` を統合し 1 本化済み）。
- 絵本を増刷・新シリーズを出すときは、この配列に追記する運用。
- Closure に閉じるので `window` からは見えない（DevTools 経由で覗き見されにくいが、完全秘匿ではない "casual friction"）。管理用マスター解錠は admin tools 本体側の Basic Auth + KV ルートに一本化済み。

---

## 10. sub ユーザーの解錠フロー

- 現時点ではストアフロント未実装。`localStorage.pono_sub_active = '1'` を直接セットすれば sub 相当になる（開発・テスト用）。
- `APP_BUILD=1` 環境（Web アプリ版ビルド）では自動的に sub 扱いになる。
- 将来: 決済フロー導入後、ここを正規のアプリ (= sub) 管理に差し替える。
- TODO: アプリ (= sub) 解錠 UI の正式実装は将来課題（play.html 内に解錠モーダル新設）。

---

## 11. 解放判定ヘルパー（一次ソース）

各ゲーム側で直接 localStorage を読まず、必ず `PonoTier` 経由で判定する。

```js
PonoTier.isMazeStageUnlocked(id)      // maze ステージが解放されているか
PonoTier.isPuzzleStageUnlocked(id)    // puzzle ステージが解放されているか
PonoTier.isQuizlandQuestionUnlocked(id) // quizland 問題が解放されているか
PonoTier.isBentoFoodUnlocked(name)    // bento 食材が解放されているか
PonoTier.isOtoRhythmSongUnlocked(id)  // oto リズム曲が解放されているか
```

v3.2 実装では `common/tier.js` の各ゲーム判定を **集合（Set/allowlist）方式**に統一する。maze / puzzle / oto / bento は `FREE_*` と `BOOK_*` の allowlist を分け、quizland は v3 の free = book 配列を維持する（`isXxxUnlocked()` は `indexOf` / `Set.has` ベースで統一）。

新しい「部分解放コンテンツ」を追加するときは、`tier.js` 側に判定関数を追加してから各ゲームで呼ぶこと。個別ゲーム側に `if (tier === 'book') { ... }` を散らさない。

---

## 12. 実装対象ファイル（Phase 1、参考）

v3 移行の実装スコープは以下（詳細は各ファイルの実装コミット履歴を参照）。

- `common/tier.js` — allowlist 方式への refactor（§11）
- `assets/data/game-stickers.json` — `tier: book_exclusive / sub_exclusive` の schema 拡張、8 ページ目「絵本特典」新設
- `js/game-stickers.js` — `grant()` API の tier ゲート分岐
- `Prototypes/StickerBookThreeJS/index.html` / `main.js` — `book_buyer_edition` 表紙、名前差し込み Canvas
- `play.html` — 3 ゾーン UI（§7）、welcome 演出（§4.3）、book/free 誘導モーダル（§8）、デイリーガチャの tier フィルタ
- `oto/index.html` — `isOtoRhythmSongUnlocked` の二重ロック解消
- `docs/BENTO_CONTENT_PLAN.md` — free 10 食材 / book 16 食材 + のり・かざりの minTier 整理
- `docs/AGE_BALANCE_POLICY.md` — 年齢バランス選定根拠の新規文書
- `sw.js` — `CACHE_VERSION` バンプ
- `.claude-design-bundle/components/book_exclusive_stickers/brief.md` — 特別シール 8 枚の Brand Kit 依頼書

---

## 13. 禁止事項（再発防止）

- ❌ `common/tier.js` と本ドキュメントを同期しない tier 変更
- ❌ 造語ネーミング（「おつきさまのおへや」等、ゾーン名・演出名を含む）
- ❌ 過剰景表法配慮（表現を過度に萎縮させる文言調整）
- ❌ 実装エージェントが同一ファイルを並列 edit（worktree isolation なしで衝突するため）

---

## 14. 変更時のチェックリスト

tier の仕様を変えるとき、以下を一括で更新する:

- [ ] `common/tier.js`（一次ソース）
- [ ] 本ドキュメント `docs/TIER_POLICY.md`
- [ ] 必要に応じて `common/promo.js` の文言・頻度制御
- [ ] `play.html` の 3 ゾーン UI 構成
- [ ] 絵本パスワード追加時は `BOOK_PASSWORDS` に追記
- [ ] `sw.js` の `CACHE_VERSION` を上げる（PWA キャッシュ反映）

---

## 15. 参照

- 実装: `common/tier.js`、`common/promo.js`
- 使用箇所: `play.html`、`maze/index.html`、`puzzle/main.js`、`quizland/index.html`、`bento/index.html`、`oto/index.html`、`Prototypes/StickerBookThreeJS/`
- bento 詳細配分: `docs/BENTO_CONTENT_PLAN.md`
- 年齢バランス選定根拠: `docs/AGE_BALANCE_POLICY.md`
- 難易度ラベル表示方針: `[[design_age_rating_display]]`（数字非表示、「やさしい/ふつう/むずかしい」統一）

---

## 履歴

### v3.2（2026-07-08、oto / bento book 追加復帰）

- oto を free 3 音色 / book 6 音色 + ペンタ + 和音 ON に変更。
- bento を free 10 食材 / book 16 食材 + 追加箱/NPC/のり・かざりに変更。
- quizland は v3 の free = book を維持。

### v3.1（2026-07-08、maze / puzzle book 追加復帰）

- maze を free Stage 1 / 3 / 6、book Stage 1 / 2 / 3 / 4 / 6、sub Stage 1-7 に変更。
- puzzle を free Stage 1 / 4 / 7 / 13、book Stage 1 / 4 / 5 / 7 / 11 / 13 / 17、sub Stage 1-20 に変更。Stage 5 のポノ特別枠は book に含める。
- 当時は quizland / bento / oto で v3 の free = book 方針を維持していたが、v3.2 で oto / bento は再度 book 追加復帰。

### v3（2026-07-06、本改訂）

- **free = book（機能差ゼロ）へ全面転換。** 旧 v2（2026-06-28〜07-01 の allowlist 再配分方針、book が free よりステージ/問題/食材数で少し勝る設計）を廃止。
- book の対価を「本編量の上乗せ」から「付録（特別シール 8 枚 / 特別表紙 / welcome 演出 / 月1おかえり / 手紙カード）」へ全振り。
- bento の free 食材数を 9 → **12**（のり 1 種復活）に変更。旧 `docs/BENTO_CONTENT_PLAN.md`・`[[feature_bento_tier_content]]` の「のり無料剥奪」方針と部分的に衝突するため、`docs/BENTO_CONTENT_PLAN.md` 側で「v3 が新しい正」として明記・整合済み。
- quizland の free/book 問題数を 25/40 問の二段階配分から **26 問の単一プール**（free = book）へ統合。2026-07-08 に難易度選択なしのおすすめ5問（Lv1 2問 / Lv2 2問 / Lv3 1問）へ実装を更新。
- maze Stage 8-10 の新規制作優先度を低下（`docs/AGE_BALANCE_POLICY.md` 参照）。
- play.html のメニュー構成を「上段 5 本 + 下段 4 本」から **3 ゾーン UI**（いま あそべる / アプリで あそべる / じゅんびちゅう）へ再編。
- 「合言葉流出耐性」を本編量の少なさではなく **付録限定 + sub 物量差**による構造的防御として明文化（§6 新設）。

### v2（2026-06-28 〜 2026-07-01）

- 3-tier 運用の正式開始。`PONO_TIER_GAME_LOCKS_ENABLED = true` で各ゲームに実ロック導入。
- quizland / maze / oto / puzzle / bento の各ゲームで「free は抜粋、book は free + α」の allowlist 再配分方針を導入（v3 で廃止）。
- bento 30 食材ティア配分リスト（v4）を策定、free 9 / book 13 / sub 30 の配分を実施（v3 で free/book を 12 に統合）。

### v1（初期）

- free / book / sub の 3 階層を定義。book は maze/puzzle/quizland/bento/oto の連番ロック（Stage 1-N まで）方式で free より広い範囲を解放する設計だった。
