# UI Port Review 2: Functional Regression

Reviewed file: `d:/AppDevelopment/pono-asobiba-app/quizland/index.html` (2585 行)
Implementer report: `d:/AppDevelopment/pono-asobiba-app/quizland/data/_review/ui-port-implementer.md`
Compared against: `git show HEAD:quizland/index.html` (HEAD = `d0effc9`)
Diff size: 1191 lines (working copy vs HEAD)

## Overall verdict

🟢 採用可

機能リグレッションなし。168 問のロード経路、6 種の render 関数、ゲームフロー (タイトル → モード → 出題 → 正解/不正解 → 結果 → リトライ/モード変更)、SE/BGM/Narration/Confetti、achievements、共通メニュー (せってい) の全てが旧実装と等価に保たれている。Acorns / Garden / Flower 系は要求通り完全に削除されている。残置されているのは**バインドされない CSS** と**説明コメント**のみで、JS 側に削除済み API への参照は 1 件もなかった。

---

## A. Question rendering

| 項目 | 状態 | 根拠 |
|---|---|---|
| `<script src="./data/questions.js">` | ✓ | index.html:14 (style ブロックの直前にロード) |
| `QUIZLAND_QUESTIONS` 参照 | ✓ | index.html:2112 (buildPlaylist 内), index.html:2459 (buildCategoryScreen 内) |
| `QUIZLAND_CATEGORIES` 参照 | ✓ | index.html:1960 (`ALL_CATS = Object.keys(QUIZLAND_CATEGORIES)`), index.html:2458 |
| `QUIZLAND_COLORS` 参照 | ✓ | index.html:2129, index.html:2244, index.html:2247 |
| `QUIZLAND_WORD_IMG` 参照 | ✓ | index.html:2141 |
| `buildPlaylist()` | ✓ | index.html:2104 — モード/難易度フィルタ → カテゴリごとに均等抽出 → shuffle → TOTAL_Q (=5) で切詰め |
| `renderOrderColor` | ✓ | index.html:2123 / `loadQuestion` switch (2272) |
| `renderCountTotal` | ✓ | index.html:2135 / `loadQuestion` switch (2273) |
| `renderShapeName` | ✓ | index.html:2148 / `loadQuestion` switch (2274) |
| `renderEmojiName` (weather/body 兼用) | ✓ | index.html:2162 / `loadQuestion` switch (2275) |
| `renderOpposite` | ✓ | index.html:2191 / `loadQuestion` switch (2276) |
| `renderTrivia` | ✓ | index.html:2198 / `loadQuestion` switch (2277) |
| `renderChoices` | ✓ | index.html:2233 — `count_total` の `--count` modifier、`order_color` の `.choice-color` chip も保持 |
| `loadQuestion` 出力先 DOM | ✓ | `#question-text` (2267)、`#stage-area` (2268, 出題タイプを `dataset.qtype` で記録)、`#choices` (2234) すべて新マークアップ内に存在 |

**168 questions reachable**: ✓
`questions.js` を実行して件数を集計:
```
order_color: 24, count_total: 24, shape_name: 24, weather: 24,
opposite: 24, trivia: 24, body: 24 → TOTAL: 168
```
`MODE_TO_CATEGORIES.inspire = [order_color, count_total, shape_name]` (72 問) と
`MODE_TO_CATEGORIES.know = [trivia, weather, body, opposite]` (96 問) で合計 168 を網羅する。
`selectedDifficulty` は `q.level` フィルタとして従前通り効く (DIFF_MIN/MAX_LEVEL 表は変更なし)。

---

## B. Game flow

| step | UI element | event handler | 行 | OK? |
|---|---|---|---|---|
| 起動 | `body::before` (title_back.png) + `#start-screen` | (z=50 オーバーレイ) | 1821 | ✓ |
| タイトルタップ | `#start-screen` | click → `ensureAudio() + startBGM()` + `start-screen.add('hidden')` + `mode-screen.remove('hidden')` | 2498-2503 | ✓ |
| モード選択 | `#mode-screen .mode-btn[data-mode]` | click → `selectedMode` 更新 + `selectedCategories` をモード別に上書き + `initGame()` + `initMenu(...)` | 2506-2521 | ✓ |
| カテゴリ画面 | `#category-screen` | (現在のフローでは経由しない。 `#cat-start-btn` を残置しているため将来再有効化可能) | 1850, 2542-2545 | ✓ (休眠) |
| 難易度ボタン | `#diff-btns .diff-btn[data-diff]` | click → `selectedDifficulty` 更新 + `buildCategoryScreen()` 再描画 | 2524-2531 | ✓ |
| カテゴリ全選/全解 | `#cat-all-btn` | click → 現モードの cats のトグル | 2534-2539 | ✓ |
| 問題 1 表示 | `initGame` → `buildPlaylist` → `loadQuestion(playlist[0])` | — | 2439-2445 | ✓ |
| 問題テキスト/ボード描画 | `#question-text` / `#stage-area` / `#choices` | `loadQuestion` (2264) → render 関数の switch | 2271-2278 | ✓ |
| HUD 更新 | `#q-num`, `#q-total`, `#hud-progress` (`.dot.hud-dot.done/.current`) | `updateHUD` (2316) | 2317-2327 | ✓ |
| 正解 | `.choice-btn` pointerdown → `onChoice(idx, btn)` | 緑フラッシュ + `playCorrect()` + `showFeedback('やったー！')` + `ponoJump()` + `launchConfetti()` + `incrementStat('quizland_correct',1)` + スタンプラリー記録 | 2333-2364 | ✓ |
| 詳細表示 (trivia 等) | `#detail-popup` (動的生成) + Narration `:detail` 再生 | `showDetail(text)` (2375) — 600ms 後にポップ、 2800ms 後に next | 2353-2361 | ✓ |
| 不正解 | `.choice-btn` | 赤シェイク + `playWrong` + ボタン disable + ロック解除 (再選択可) | 2365-2372 | ✓ |
| 次の問題 | — | `nextQuestion()` (2404) → idx++ → 終端なら `showResult()` 否則 `loadQuestion(playlist[idx])` | 2404-2411 | ✓ |
| 完了 | `#result-overlay` 表示 (modal) | `showResult()` (2416) → 70% 以上で `playFanfare + launchConfetti + incrementStat('quizland_clears',1)` | 2416-2430 | ✓ |
| もう一回 | `#result-btn` | click → `initGame()` (同カテゴリで再生成) | 2555-2557 | ✓ |
| モードをかえる | `#result-cat-btn` | click → result/category overlay 隠す + `mode-screen` 表示 | 2560-2564 | ✓ |
| HUD タイトルへ | `#hud-back-btn` | click → result/category overlay 隠す + `mode-screen` 表示 | 2548-2552 | ✓ |
| HUD せってい | `#hud-settings-btn` | pointerdown → `.pono-menu-toggle` に合成 PointerEvent dispatch (旧 `upgradeGameLayoutV2` 相当) | 2567-2580 | ✓ |
| メニューに戻る | `<a class="modal-back" href="../play.html">` | href 直リンク | 1936 | ✓ |

**注意点 (リグレッションではないが文書化)**: カテゴリ画面 (`#category-screen`) は現在のフロー (`mode-btn` → 即 `initGame`) ではバイパスされる。 これは旧実装からの仕様であり今回の port 由来ではない (ロジック自体に手は加わっていない)。

---

## C. Sound effects

| 項目 | 状態 | 根拠 |
|---|---|---|
| `<audio>` BGM タグ | ✓ (動的生成) | `new Audio('../assets/audio/quiz_bgm.mp3')` at index.html:1988 (`initBGM`) |
| `AudioContext` (Web Audio) | ✓ | index.html:1972-1977 (`ensureAudio`) |
| `playCorrect` (sine 523/784 Hz) | ✓ | index.html:2031-2045 → 正解時呼び出し (2340) |
| `playWrong` (sawtooth 220→110 Hz) | ✓ | index.html:2046-2059 → 不正解時呼び出し (2368) |
| `playFanfare` (4 音 sine) | ✓ | index.html:2060-2074 → クリア時呼び出し (2426) |
| BGM 起動 (ユーザー gesture 後) | ✓ | タイトルタップで `ensureAudio()+startBGM()` (2498-2503) |
| `pono_bgm_enabled` localStorage | ✓ | 1984 で読込、2014 で書込 → 既存ユーザー設定そのまま継続 |
| `toggleBGM` | ✓ | `initMenu({ bgmToggle: function(){ toggleBGM(); } })` (2516) で共通メニューから呼べる |
| `visibilitychange` / `pagehide` で BGM 一時停止 | ✓ | 2021-2030 |
| Narration (`common/narration.js`) | ✓ | `<script src="../common/narration.js">` (line 13) → `Narration.load/hasEntry/getMode/play/playIfAuto/prefetch` を `setupNarration` (2289) で使用 |
| `#question-speaker` 🔊 ボタン | ✓ | 1904 (markup) → 2291-2300 で onclick = `Narration.play(narrationKey(q,'q'))`、Narration エントリ無し or mode=off 時は display:none |
| 自動再生 (autoplay 連動) | ✓ | `Narration.playIfAuto(key)` (2302) |
| 先読み (次 2 問) | ✓ | `Narration.prefetch([...])` (2304-2312) |

**ユーザー gesture 経由の audio 起動** ((iOS/Safari の自動再生制限) もタイトルタップ起点で適切にゲートされている (`ensureAudio` 後 `startBGM`)。

---

## D. Acorns / Stickers EXCLUSION

| 項目 | 期待 | 結果 | 根拠 |
|---|---|---|---|
| `<script src="../common/acorns.js">` | 削除 | ✓ 削除済 | git diff (HEAD→working) で `-<script src="../common/acorns.js"></script>` 確認 |
| `<script src="./data/flowers.js">` | 削除 | ✓ 削除済 | git diff で `-<script src="./data/flowers.js"></script>` 確認 |
| `<script src="../common/stickers.js">` | (元から無し) | — | HEAD 版にも存在せず |
| `<script src="../common/treasure.js">` | (元から無し) | — | HEAD 版にも存在せず (treasure 系は `common/first-clear.js` 経由で `maze` 等が使うが quizland は元々非利用) |
| inline JS 内の `acorns / addAcornsDaily / pickFlower / getSeeds / addSeed / openGarden / renderSeedToast / applySeasonTheme / bumpSessionNonce / updateSeedHUD / upgradeGameLayout / upgradeGameLayoutV2 / STAGE_EMOJI / recordDiscovery / getDiscoveredFlowers` 参照 | 0 件 | ✓ 0 件 | inline 22200 字のスクリプトに対して上記 20+ シンボルを正規表現照合 → 全て一致無し |
| 削除されるべき DOM ID (`#hud-seeds`, `#garden-overlay`, `#garden-toast`, `#flower-enc`, `#result-garden-btn`, `#result-enc-btn`, `#garden-close`, `#flower-enc-close`) | inline JS から参照されない | ✓ 全て参照なし | suspiciousIds 正規表現照合 → 0 件 |

**残留**: 以下は「死んだ CSS」と「コメント文」のみで、 動作には一切影響しない。
- 死んだ CSS セレクタ (markup から参照されないので無効): `#hud-seeds` (283, 300), `.garden-overlay` 系 (920-1015), `.flower-enc` 系 (1017-1055), `body[data-season="*"]` 系 (季節テーマ; markup から `applySeasonTheme` が消えたので付与されない)
- 説明コメント: `// (Garden / Seeds / Flower encyclopedia は MVP 対象外のため削除済み...)` (1955-1957), `// 注: 旧 upgradeGameLayoutV2() ...` (2435-2437), `// HUD settings button → 共通メニューを開く (旧 upgradeGameLayoutV2 と同等)` (2566)

実装者の "follow-up で掃除" 提案通りで OK。 コミット前のクリーンアップは任意で、機能リグレッション要因にはならない。

---

## E. Achievements

| 項目 | 状態 | 根拠 |
|---|---|---|
| `<script src="../common/achievements.js">` | ✓ | index.html:11 |
| `incrementStat('quizland_correct', 1)` | ✓ | index.html:2345 (正解時、 `onChoice` 内) |
| `incrementStat('quizland_clears', 1)` | ✓ | index.html:2425 (クリア時、 `showResult` 内 70% 以上で発火) |
| スタンプラリー (`pono_played_*`) | ✓ | index.html:2347-2351 |
| `first-clear.js` ロード | ✗ なし | **HEAD 版にも存在せず** (`git show HEAD:quizland/index.html` で確認)。 quizland はそもそも `triggerFirstClearReward` を使わない実装で、 maze/oto/puzzle のみが利用。 今回の port 由来のリグレッションではない。 別タスクで `firstClear` を quizland に追加したい場合は本 review の範囲外。 |

---

## F. Settings / preferences

| 項目 | 状態 | 根拠 |
|---|---|---|
| `<script src="../common/menu.js">` | ✓ | index.html:12 |
| `initMenu({ bgmToggle, tutorial })` 呼出 | ✓ | index.html:2514-2519 (mode-btn click で `initGame` の直後に呼ぶ) |
| `#hud-settings-btn` → `.pono-menu-toggle` dispatch | ✓ | index.html:2567-2580 (pointerdown を合成、 旧 `upgradeGameLayoutV2` の挙動を踏襲) |
| BGM ON/OFF | ✓ | localStorage `pono_bgm_enabled` (1984) — キーは旧実装と同じ → 既存ユーザー設定そのまま生き残る |
| Narration mode (auto/off) | ✓ | `Narration.getMode()` (2296) で読み、 `display:none` を制御。 mode 切替 UI は `common/menu.js` 側 |
| iOS rotation 注意オーバーレイ | ✓ | `.landscape-notice` (1829-1832) |

---

## G. PWA / SW

quizland/index.html は `navigator.serviceWorker.register` を**直接行わない**設計。 これは HEAD 版でも同じで、 SW 登録は親 (`/index.html`, `/play.html`, `/play-all.html`) が `'/sw.js'` でルートスコープに登録した結果が子ページにも降りてくる。 sibling games (`maze/`, `oto/`, `puzzle/`, `bento/`) も同じパターン。 → リグレッションなし。

参考: AGENTS.md の sw.js CACHE_VERSION バンプ規約 は今回の port commit を入れる際に必要 (CSS が大幅変更されているため)。

---

## H. Question data integrity

| 項目 | 状態 | 根拠 |
|---|---|---|
| `data/questions.js` を inline `<script>` よりも前にロード | ✓ | line 14 (`./data/questions.js`) → line 1940 (inline `<script>`) |
| `QUIZLAND_QUESTIONS / QUIZLAND_CATEGORIES / QUIZLAND_COLORS / QUIZLAND_WORD_IMG` のグローバル | ✓ | questions.js:11, 448, 459, 471 で `const ...` トップレベル宣言 → ブラウザ環境では window グローバルに乗る |
| `q._cat / q._idx` 注入 | ✓ | `buildPlaylist` (2113) で `Object.assign({_cat, _idx}, q)`。 narration key 生成 (2287) で利用 |
| 168 問 × 7 カテゴリ | ✓ | `node` 実行で件数確認 |

---

## Node syntax check

```
inline script #1: OK (22200 chars)
total inline blocks: 1
all inline scripts parse OK

questions.js: OK (28934 chars)
```

`new Function(blockText)` で `<script>...</script>` 内の唯一の inline IIFE をパース → エラーなし。 `data/questions.js` 単体も同様に OK。

---

## Orphan references

inline JS (22200 字) に対して以下を照合:
- 削除済み API シンボル 20 個 (pickFlower / addAcornsDaily / getSeeds / setSeeds / addSeed / openGarden / closeGarden / renderGarden / plantSeed / waterCell / harvestCell / getDiscoveredFlowers / recordDiscovery / emptyGarden / getGarden / setGarden / applySeasonTheme / getSessionNonce / bumpSessionNonce / updateSeedHUD / renderSeedToast / STAGE_EMOJI / onGardenCellTap / openFlowerEnc / closeFlowerEnc / upgradeGameLayoutV2 / upgradeGameLayout) → **0 件** ✓
- 削除済み DOM ID リテラル 8 個 (`result-garden-btn / result-enc-btn / garden-overlay / garden-toast / flower-enc / garden-close / flower-enc-close / hud-seeds`) → **0 件** ✓

→ **orphan reference なし**。 `incrementStat` も `window.incrementStat` で defensive call され、 `Narration` も `typeof Narration === 'undefined'` でガードされている (2290)。

---

## DOM ID references missing

`getElementById('...')` / `querySelector('#...')` の参照 25 件を HTML の `id="..."` 26 件と照合した結果:

| JS 参照 | HTML id | 状態 |
|---|---|---|
| `quizBubbleBlinkStyle` | (なし) | ✓ **問題なし** — `renderTrivia` (2223) が runtime に `<style>` を生成して `head` に append する用途。 起動時に存在しないのが正しい挙動。 |
| `detail-popup` | (なし) | ✓ **問題なし** — `showDetail` (2376) が runtime にポップアップを生成する用途。 起動時に存在しないのが正しい挙動。 |
| 残り 23 件 (start-screen, mode-screen, category-screen, cat-grid, cat-all-btn, cat-start-btn, hud-back-btn, hud-settings-btn, q-num, q-total, hud-progress, question-text, question-speaker, stage-area, board, choices, char-hint, pono-avatar, feedback, result-overlay, result-icon, result-title, result-msg, result-btn, result-cat-btn) | 全て対応 | ✓ |

HTML 側に存在するが JS から名前で参照されないもの: なし (全 ID が JS で利用されているか static markup の anchor として意味を持つ)。

---

## Issues found

### 🔵 (Info / nit) — リグレッション要因ではない

1. **死んだ CSS の残置** (CSS 行 283-310, 920-1055 周辺の `#hud-seeds / .garden-* / .flower-enc-*`、 および `body[data-season="*"]` の季節テーマ約 60-80 行)。
   - 影響: ファイルサイズが ~150 行ぶん膨らむだけ。 markup から参照されないため visual/functional への影響ゼロ。
   - 推奨: 別 commit で `git rm`-しない範囲で削るとファイルが軽くなる。 実装者が "follow-up" としているのでそのまま採用可。

2. **`category-screen` フローが現在は休眠**
   - `mode-btn` のクリックハンドラ (2506-2521) で直接 `initGame()` を呼ぶため、 `category-screen` (1850-1864) は表示されない。 関連コード (`buildCategoryScreen / cat-start-btn / diff-btns`) は残置されており、 将来再有効化したい場合に備えている。
   - これは今回の port 由来ではなく HEAD でも同じ挙動。 リグレッションではない。

3. **`#question-speaker` 非表示時の右側 padding**
   - `q-text-card` の `padding-right: clamp(60px, 6vw, 90px)` (audio ボタン absolute 配置のため)。 ナレーション無効時は右側に空白が空く。 実装者が「重点的に見てほしい点 #3」として挙げているとおり、 視覚レビュー (review-1) で確認すべき項目。 機能上の問題ではない。

### 🟡 (Minor) / 🔴 (Critical)
**0 件**。

---

## Recommended deltas

### Optional cleanup (今回採用しなくても可)
- `index.html:283-310` (死んだ `#hud-seeds`)
- `index.html:920-1015` (死んだ `.garden-*`)
- `index.html:1017-1055` (死んだ `.flower-enc-*`)
- `body[data-season="*"]` の季節テーマ CSS (約 60-80 行ぶん、 grep 経由で位置特定可能)

### コミット時必須
- AGENTS.md / CLAUDE.md にあるとおり、 `sw.js` の `CACHE_VERSION` を **+1 バンプ** すること (現在 559 → 560 を推奨)。 大幅な CSS / DOM 変更があるため、 PWA キャッシュを更新しないと既存ユーザーに古い UI が残り続ける。

---

## Summary

機能観点でリグレッションは検出されず。 168 問のロード経路、 6 種の render、 全ゲームフロー、 SE/BGM/Narration、 achievements、 共通メニュー、 設定永続化 (`pono_bgm_enabled`)、 PWA 連携 — 全て旧実装と同等の挙動。 Acorns/Garden/Flower 系は要求どおり JS と DOM から完全削除されており、 残るのはバインドされない CSS とコメントのみ。 syntax check / orphan reference 検査も全グリーン。 → 🟢 採用可。
