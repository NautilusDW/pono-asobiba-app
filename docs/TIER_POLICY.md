# TIER POLICY — 無料 / 絵本購入者 / サブスクの境界

ユーザー層（tier）の判定ルールと、各層に解放される範囲の正式仕様。
実装の一次ソースは `common/tier.js`。本ドキュメントは人間向けの参照用。
不整合が生じた場合は `common/tier.js` を正とし、本ドキュメントを更新する。

---

## 1. 3 階層の定義

| 階層 | キー | 判定条件 | 想定ユーザー |
|---|---|---|---|
| **free** | `'free'` | デフォルト | 未購入。ポノの遊び場のみ体験 |
| **book** | `'book'` | `localStorage.pono_premium === '1'` | 絵本『ありがとう』購入者（奥付パスワードで解錠） |
| **sub** | `'sub'` | `localStorage.pono_sub_active === '1'` | サブスク契約者 |

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

- `play.html` で locked カード（writing / drawing / bowling / breakout / slide）をタップすると、`common/promo.js` の `showLockedPreview()` がプロモモーダルを表示（スクショ + キャッチコピー + サブスク誘導）。
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
- 将来: 決済フロー導入後、ここを正規のサブスク管理に差し替える。

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
