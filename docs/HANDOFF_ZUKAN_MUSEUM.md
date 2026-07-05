# 引き継ぎ: 図鑑モード整理 + シールミュージアム説明文 (2026-07-05)

新スレッドへの引き継ぎ。図鑑まわりの戦略決定と、次にやる実装 2 本 (A/B) の具体手順をまとめる。

---

## 0. 一言サマリ
- シール帳 (StickerBook) の貼付演出磨きは**完了・デプロイ済** (silhouette / haptics / particle / glow / peel 色・flicker・Z-fight 修正 / gacha 拡張 / SFX)。
- 図鑑まわりで**戦略決定**が確定した (下記 §1)。それに沿った実装 A・B が**未着手**。この 2 本を次スレッドで進める。
- 実装はまだ 1 行もしていない (working tree の `nazonazo-tunnel/` 変更は Codex の並走作業で無関係)。

---

## 1. 確定した戦略 (user 承認済)

### 背景の整理 (混同注意)
「動物を見つけて登録する森の図鑑」は **1 つのゲーム構想の中の 2 種類のミニゲーム**だった:
- **旧A = zukan/ SPA** (探索 hidden-object / ミッケ型)。`zukan/index.html`。半死 (dev 限定、comingSoon)、36 匹中 4 匹のみ遊べる、完成度 55-65%。
- **旧B = wordmatch/forestdex** (音・名前・姿の当てクイズ型)。`wordmatch/index.html`。完成品だが凍結・孤立。
- この 2 つで 1 つの「森の図鑑」を埋める構想 (ミッケ + 音当てで飽きさせない)。ブラッシュアップ余地あり、今はペンディング。

### 決定事項
1. **図鑑モード (StickerBook collection / ずかん) は MVP で隠す**。コード・データ (はち detail 等) は削除せず**凍結保管**、将来の森の図鑑ゲームで再利用。
2. **シール → シールミュージアム (StickerExhibitionCarousel) に集約**。シール詳細はここで見せる。
3. **「図鑑/ずかん」という言葉は、将来ゲームで埋める独立図鑑に予約**。昆虫・食べ物とゲームが増えたら各ゲームで図鑑を埋める拡張で広がりを出す。
4. **コンテンツの種類を分ける** (重要):
   - **シールミュージアム (今)** = 生態ではなく「このゲームでの役割 + どこでどう入手 + 軽い架空設定」。どうでもいい trivia + フィクション寄り。キャラ系は架空設定を少し文章で / バッタ等汎用は立ち位置+入手経緯中心。
   - **森の図鑑 (将来ゲーム)** = 本物の生態 (= 今セッションで作った「はち」detail のスタイル)。**はち work はここ用に凍結保管**。

### voice policy (厳守)
- ポノ・ふくろう博士は肉声なし、一人称ナレ禁止。説明文は地の文 or 三人称。
- fal-ai TTS 禁止。ミュージアム説明はテキストのみ (音声なし)。

---

## 2. デプロイ済みの現状
- App staging: https://pono-asobiba-app-staging.ndw.workers.dev/
- 「はち」図鑑 detail 見本 = **v1920 でデプロイ済** (StickerBook collection モード。展示棚品質 + Codex 全廃 + rarity 星)。→ これは §1-4 の方針変更で「森の図鑑用に凍結保管」扱いになった (ミュージアムとは別トーン)。
- 現行 `sw.js` `CACHE_VERSION = 1965` (`sw.js:599`)。StickerBook は `?v=20260704-1087` (`index.html:8,283`)。
- StickerBook は sw.js で **network-first** (`sw.js:1044-1056`) なので main.js/index.html 変更は即反映。CACHE_VERSION バンプは機能上任意だがリポ規約は +1 要求 → 規約準拠で +1 推奨。

---

## 3. 次にやる実装 (A・B、並行可能)

### A. 図鑑モードを隠す (最小・可逆)
子ども向け入口は `index.html:21` のずかんボタン 1 個のみ (play.html に動線なし)。
1. `Prototypes/StickerBookThreeJS/index.html:21` の `albumModeToggle` ボタンに `hidden` 追加。
2. `main.js` 定数域 (例 `:1745` 付近) に `const COLLECTION_MODE_ENABLED = false;` 追加。
3. `main.js:1746` を `params.get("album")==="collection" && COLLECTION_MODE_ENABLED` に変更 (URL 直打ち遮断)。
4. `main.js:9896` の `nextMode` 算出を `COLLECTION_MODE_ENABLED && mode === "collection"` に変更 (全経路で collection 握り潰し)。
5. これで `COLLECTION_ZUKAN_SUBJECT_DEFS` (`main.js:129`、はち=134-135)、detail 定数 (`main.js:2089-2302`)、setAlbumMode/syncUrl/tray は**無改変で dormant 温存**。free モードは既定で自己完結、`collectionStickerTray` の free 用途 (`main.js:6637`) 無傷。
6. 復活は flag を `true` + `hidden` 除去だけ。
7. CACHE_VERSION `sw.js:599` 1965→+1、`index.html:8,283` の `?v=` 更新。

### B. ミュージアムのシール説明文 (バッタ縦切り見本)
- 対象: `Prototypes/StickerExhibitionCarousel/`。詳細カードは **DOM 合成** (PNG ではない)。markup `index.html:59-71`、描画 `main.js:539-562 openDetail()`。
- データ: `assets/data/game-stickers.json` の全 135 枚。各シールは `id/name/img/rarity/unlockOn/serial` の 6 フィールドのみ。**`gameId`/`desc` は無い** → 説明文は手書き。入手情報に使えるのは `pageTitle` (どのゲーム) + `unlockOn` (daily_gacha/clear/donguri_shop/book_bonus 等の入手種別) だけ。
- 実装手順:
  1. `index.html:67-68` の `#detailName` と `#detailTags` の間に `<p id="detailDesc">` 追加。
  2. `main.js` に `const STICKER_DESC = { "bonus_quizland_batta_normal": "…", … }` を `RARITY_LABEL` (`main.js:22-26`) と同じ形で定義。
  3. `flattenCatalog` (`main.js:112`) の item に `desc: STICKER_DESC[sticker.id] || ""` を merge。
  4. `openDetail` (`main.js:554` 付近) で `#detailDesc` に textContent 設定。空なら非表示。
- **バッタの正確な sticker id = `bonus_quizland_batta_normal`** (game-stickers.json:43、name「バッタ」、なぞなぞランド=quizland、rarity normal=ふつう、category いきもの)。
- トーン: 生態禁止。ゲーム役割 + 入手経緯 + 軽い架空設定。ひらがな中心・幼児向け・voice policy 準拠。
- **バッタ見本 4 案** (user がトーン未確定、下記から選んでもらう or 新案):
  - 案A (入手+軽い設定): 「なぞなぞランドの くさむらで ぴょんと はねてた。 なぞを といたら もらえたよ。 じつは なぞなぞが だいすき らしい。」
  - 案B (役割+フィクション): 「なぞなぞランドの ものしり むし。 むずかしい もんだいの ヒントを こっそり おしえてくれる… かもしれない。」
  - 案C (ゆるい trivia): 「なぞなぞランドで あつめた シール。 はねると 『びよーん』 と おとが なる とか ならないとか。」
  - 案D (短め・入手中心): 「なぞなぞランドの もんだいを クリアして ゲット。 ぴょんぴょん とびはねる げんきもの。」
- 全 135 枚へは `STICKER_DESC` に id→文を足すだけでスケール (未記入は非表示 fallback)。

---

## 4. user 判断待ち (中断時に聞いていた点)
1. バッタ見本のトーン (案 A/B/C/D のどれか、または新案)。
2. 実装順: A+B 並行 (推奨) / まず B 見本だけ / まず A だけ。

---

## 5. 補足・注意
- **モデルルーティング指定**: 設計・オーケストレーションは fable、実装は sonnet5。※ fable で巨大 Workflow スクリプトを送ると書式が壊れる事象があった → 小さい個別 Agent 呼び出し推奨、または Opus に切替。
- **カテゴリ別配色の話は保留** (図鑑モードを隠すので、シール図鑑のカテゴリ彩色は当面 moot。将来の森の図鑑ゲーム側の話になる)。Codex 向け指示文 `docs/ZUKAN_CATEGORY_THEME_FOR_CODEX.md` は**書きかけで未保存** (存在しない)。復活時は §1-4 の役割分担を踏まえて再設計。
- 触覚 (haptics) は iOS Safari では原理的に動かない (Apple が Web Vibration API 未実装)。Android Chrome 実機でのみ体感可。コードは正常 (`main.js:7080` `Haptics.fire('stickerPaste')` 健在)。後日 Android で確認予定。
- working tree の `nazonazo-tunnel/` 変更は Codex 並走。触らないこと。

---

## 6. 参考: 今セッションでデプロイした主なもの (シール帳、完了済)
未取得シルエット(v1889) / 「まだもってないよ」singleton bubble(v1890) / 触覚(v1893) / 貼付 particle v2 森トーン角35%中心寄り(v1900) / 色褪せ・flicker・Z-fight 修正(v1902/1903/1905/1915/1917) / 貼付 SE+キラキラ arpeggio(v1907/1909) / glow flash(v1914) / ガチャ haptics+particle(v1910) / はち図鑑 detail 見本(v1920)。全て App staging LIVE。
