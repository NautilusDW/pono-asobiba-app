# UI Port Review 2 v2: Functional Regression

Reviewed file : `d:/AppDevelopment/pono-asobiba-app/quizland/index.html` (1537 行)
Implementer report : `d:/AppDevelopment/pono-asobiba-app/quizland/data/_review/ui-port-implementer-v2.md`
Strategy        : **Replace** (preview/full を土台に旧 main の game logic を再配線)
比較対象        : 旧 (slim) main = 直前の `ui-port-review-2-functional.md` のレビュー対象 (2585 行版)

## Overall verdict

🟢 **採用可** (1 件 🟡 軽微な観察事項あり)

168 問のロード経路、 6 種の render 関数、ゲームフロー (タイトル → モード → 出題 → 正解/不正解 → 結果 → リトライ/モード変更)、 SE/BGM/Narration/Confetti、 achievements (`incrementStat`)、 `triggerFirstClearReward`、 共通メニュー (せってい) の全てが旧実装と等価に保たれている。 inline JS は構文 OK。 acorns/treasure/flower/garden/sticker/seed 系の参照は HTML/JS 共に **0 件**。 削除対象の `<script src>` も全て不在。 重大な機能リグレッションは検出せず。

---

## A. Question rendering

| 項目 | 状態 | 根拠 |
|---|---|---|
| `<script src="./data/questions.js">` ロード順 | ✓ | index.html:15 (inline `<script>` (943-1535) より **前**) |
| `QUIZLAND_QUESTIONS` 参照 | ✓ | index.html:1137 (`buildPlaylist`) |
| `QUIZLAND_CATEGORIES` 参照 | ✓ | index.html:958 (`ALL_CATS = Object.keys(QUIZLAND_CATEGORIES)`) |
| `QUIZLAND_COLORS` 参照 | ✓ | index.html:1158 (`renderOrderColor`)、 index.html:1264 (`renderChoices` の order_color label) |
| `QUIZLAND_WORD_IMG` 参照 | ✓ | index.html:1169 (`renderCountTotal`) |
| `buildPlaylist()` | ✓ | index.html:1129-1143 — `selectedCategories` × `level [min,max]` で pool 生成 → `perCat = ceil(TOTAL_Q/cats.length)` で均等抽出 → shuffle → TOTAL_Q (=5) で切詰め |
| `renderOrderColor` | ✓ | index.html:1152 / `loadQuestion` switch (1291) |
| `renderCountTotal` | ✓ | index.html:1163 / `loadQuestion` switch (1292) |
| `renderShapeName`  | ✓ | index.html:1175 / `loadQuestion` switch (1293) |
| `renderEmojiName` (weather/body 兼用) | ✓ | index.html:1188 / `loadQuestion` switch (1294) |
| `renderOpposite`   | ✓ | index.html:1214 / `loadQuestion` switch (1295) |
| `renderTrivia`     | ✓ | index.html:1220 / `loadQuestion` switch (1296) |
| `renderChoices`    | ✓ | index.html:1250 — `order_color` は `data-color` + `.circle` + ラベル、 `count_total` は `.chip-count` (56px font)、 その他はテキストのみ |
| `loadQuestion` 出力先 DOM | ✓ | `#q-text` (1286)、 `#stage-area` (1287)、 `#answer-panel` (1251) — 全て新マークアップ内に存在 (831-940) |

**168 問件数チェック** : `questions.js` 内 `level:` リテラル = 168 件 (level1=56 / level2=56 / level3=56)。 トップレベルキー = `order_color, count_total, shape_name, weather, opposite, trivia, body` の 7 個 = 24 問 × 7 cats = 168。

**到達性 (現在のフロー)** :
- `MODE_TO_CATEGORIES.inspire = [order_color, count_total, shape_name]` → 72 問
- `MODE_TO_CATEGORIES.know    = [trivia, weather, body, opposite]`     → 96 問
- 合計 168 問が `selectedCategories` で **カテゴリレベル** では網羅される。
- ⚠ ただし `selectedDifficulty = 'easy'` がハードコードされ UI で変更不可 (index.html:961)。 `DIFF_MIN_LEVEL.easy=1 / DIFF_MAX_LEVEL.easy=1` のため、 **実際にプレイ中に出題されるのは level 1 の 56 問のみ** (level 2/3 の 112 問はデータとしては読み込まれるが UI からは到達不能)。 これは旧 slim 版と同じ仕様 (旧 review 1 でも同様にハードコード) であり今回の port 由来ではない。 仕様再開放したい場合は `selectedDifficulty` への UI バインドが必要。

---

## B. Game flow

| step | UI element | event handler | 行 | OK? |
|---|---|---|---|---|
| 起動 | `#start-screen` (タイトル背景 `title_back.png` + `title_logo.png` + 「タップしてスタート」) | z=50 オーバーレイ (`.start-screen`) | 835-840 | ✓ |
| タイトルタップ | `#start-screen` | click → `ensureAudio()` + `startBGM()` + start-screen 隠す + `mode-screen` 表示 | 1473-1478 | ✓ |
| モード選択 | `#mode-screen .mode-btn[data-mode]` (やさしい/ものしり) | click → `selectedMode` 更新 + `selectedCategories` を `MODE_TO_CATEGORIES` で上書き + `initGame()` + `initMenu(...)` | 1481-1496 | ✓ |
| 問題 1 表示 | `initGame` → `buildPlaylist` → `loadQuestion(playlist[0])` | — | 1456-1467 | ✓ (空 playlist 時は mode-screen に戻る fallback あり、 1461-1464) |
| 問題テキスト/ボード描画 | `#q-text` / `#stage-area` / `#answer-panel` | `loadQuestion` (1283-1301) → render 関数 switch + `renderChoices` + `setupNarration` | 1283-1301 | ✓ |
| HUD 更新 | `#q-num`, `#q-total`, `#hud-progress` (`.dot.done/.current`) | `updateHUD` (1333-1345) | 1333-1345 | ✓ |
| 正解 | `.chip` pointerdown → `onChoice(idx, btn)` | `chip.add('correct')` + `playCorrect()` + `showFeedback('やったー！')` + `ponoJump()` + `launchConfetti()` + `incrementStat('quizland_correct',1)` + スタンプラリー記録 (`pono_played_<date>`) | 1350-1389 | ✓ |
| 詳細表示 (trivia 等) | `#detail-popup` (動的生成) + Narration `:detail` 再生 | `showDetail(text)` (1392-1402) — 600 ms 後にポップ、 2800 ms 後に next | 1369-1378 | ✓ |
| 不正解 | `.chip` | `chip.add('wrong')` + 該当 chip だけ `disabled=true` + `playWrong` + `showFeedback('もういっかい！',true)` + ロック解除して再選択可 | 1382-1389 | ✓ |
| 次の問題 | — | `nextQuestion()` (1421-1428) → idx++ → 終端なら `showResult()` 否則 `loadQuestion(playlist[idx])` | 1421-1428 | ✓ |
| 完了 | `#result-overlay` 表示 (modal) | `showResult()` (1433-1451) → 70% 以上で `incrementStat('quizland_clears',1)` + `playFanfare` + `launchConfetti` ×2 + `triggerFirstClearReward('quizland')` | 1433-1451 | ✓ |
| もう一回 | `#result-btn` | click → `initGame()` (現モードで再生成) | 1505-1507 | ✓ |
| モードをかえる | `#result-cat-btn` | click → result overlay 隠す + `mode-screen` 表示 | 1510-1513 | ✓ |
| HUD タイトルへ (おしらせ→back) | `#hud-back-btn` | click → result overlay 隠す + `mode-screen` 表示 | 1499-1502 | ✓ |
| HUD せってい | `#hud-settings-btn` | pointerdown → `.pono-menu-toggle` に合成 PointerEvent dispatch | 1516-1529 | ✓ |
| メニューに戻る | `<a class="modal-back" href="../play.html">` | href 直リンク | 939 | ✓ |

flow 全体が旧 slim 版と等価に動作する。

---

## C. Sound effects

| 項目 | 状態 | 根拠 |
|---|---|---|
| `<audio>` BGM | ✓ (動的生成) | `new Audio('../assets/audio/quiz_bgm.mp3')` at index.html:1013 (`initBGM`) |
| `quiz_bgm.mp3` ファイル存在 | ✓ | `assets/audio/quiz_bgm.mp3` (1.27 MB) |
| `AudioContext` (Web Audio) | ✓ | index.html:998-1003 (`ensureAudio`) |
| `playCorrect` (523/784 Hz) | ✓ | 1056-1070、 onChoice 1357 で呼出 |
| `playWrong`  (220→110 Hz sweep) | ✓ | 1071-1084、 onChoice 1383 で呼出 |
| `playFanfare` (4-tone) | ✓ | 1085-1099、 showResult 1443 で呼出 |
| `BGM_VOLUME` 0.07 + `bgmGain` 経由 | ✓ | 1008, 1019-1022 (createMediaElementSource → gain → destination) |
| `bgmEnabled` localStorage 連動 | ✓ | `pono_bgm_enabled` キー (1009, 1040) — 旧版と同一キー、 既存 user pref と互換 |
| User-gesture gate | ✓ | `startBGM()` は title-tap (1475) でしか起動しない |
| `visibilitychange` / `pagehide` で pause | ✓ | 1045-1054 |
| Narration (TTS) | ✓ | `common/narration.js` ロード (14)、 `setupNarration` (1308-1331) で auto-play + prefetch、 `Narration.play/load/hasEntry/getMode/playIfAuto/prefetch` 全て narration.js に存在 (確認済) |
| `🔊` ボタン (`#question-speaker`) | ✓ | 905 (HTML, 初期 `display:none`)、 1310-1319 で entry がある時のみ `display:''` |
| BGM toggle | ✓ | `toggleBGM()` (1038-1043)、 `initMenu({ bgmToggle: ... })` 経由で共通メニューから ON/OFF (1490-1493) |

---

## D. MVP exclusions

**削除確認 (要求どおり全部 ✓)** :
- `<script src="../common/acorns.js">` : なし ✓ (head の `<script>` リスト = mvp-flags / achievements / first-clear / menu / narration / data/questions.js のみ)
- `<script src="../common/treasure.js">` : なし ✓
- `<script src="../common/stickers.js">` : なし ✓
- `<script src="data/flowers.js">` : なし ✓
- 残置 grep `acorn|sticker|treasure|flower|garden|seed|hud-seeds|flower-enc|garden-overlay|pickFlower|addSeed|addAcornsDaily` → **0 件** (HTML/CSS/JS 全範囲)。
- `data/flowers.js` ファイルそのものは `quizland/data/` 内にまだ存在 (3.3 KB) するが、 index.html から参照されないため死コード。 → **オプション** : 完全削除しても良いが MVP スコープ外。

**残置確認 (PRESENT で正しい)** :
- `<script src="../common/mvp-flags.js">` ✓ (10)
- `<script src="../common/achievements.js">` ✓ (11)
- `<script src="../common/first-clear.js">` ✓ (12) — `PONO_MVP_NO_REWARDS` で no-op だがロード自体は維持
- `<script src="../common/menu.js">` ✓ (13)
- `<script src="../common/narration.js">` ✓ (14)
- `<script src="./data/questions.js">` ✓ (15)

---

## E. Achievements / first-clear

| 項目 | 状態 | 根拠 |
|---|---|---|
| `incrementStat('quizland_correct', 1)` (正解時) | ✓ | index.html:1362 — `if (window.incrementStat) ...` のガード付き |
| `incrementStat('quizland_clears', 1)` (70%↑ クリア時) | ✓ | index.html:1442 |
| スタンプラリー `pono_played_<toDateString>` 記録 | ✓ | index.html:1364-1368 (`quizland` を 1 日 1 回 push) |
| `triggerFirstClearReward('quizland')` (クリア時) | ✓ | index.html:1447-1449 — `typeof window.triggerFirstClearReward === 'function'` のガード + try/catch |
| achievements.js が `window.incrementStat` を実装 | ✓ | `common/achievements.js:100` で `window.incrementStat = function(key, amount) {...}` |
| first-clear.js が `window.triggerFirstClearReward` を実装 | ✓ | `common/first-clear.js:158` |
| stat キー命名規則 (`<game>_<event>`) | ✓ | 旧版と同一 (`quizland_correct`, `quizland_clears`) — 既存 achievements 定義と互換 |

---

## F. Settings / preferences

| 項目 | 状態 | 根拠 |
|---|---|---|
| BGM ON/OFF UI | ✓ | `#hud-settings-btn` (893-896) → 共通ドロップダウン経由 → `initMenu({ bgmToggle: toggleBGM })` (1490-1493) |
| Narration ON/OFF UI | ✓ (共通メニュー側で提供) | `common/menu.js` のドロップダウン内に narration mode 切替が含まれる (旧版と同一実装) |
| `pono_bgm_enabled` localStorage キー | ✓ | index.html:1009 (旧版と同一キー) |
| narration mode (`pono_narration_mode` 等) | ✓ | `common/narration.js` 側で管理 (port 範囲外、 触れていない) |
| `.pono-dropdown` 位置補正 (右上) | ✓ | index.html:825-829 (`!important` でオーバーライド) |

`.pono-menu-toggle` のサイズを `1px × 1px / opacity:0 / pointer-events:none` で隠し、 `#hud-settings-btn` の click で合成 PointerEvent を dispatch する仕組み (1516-1529)。 旧 slim 版の `upgradeGameLayoutV2` と等価。

---

## G. PWA / SW

| 項目 | 状態 | 根拠 |
|---|---|---|
| `sw.js` `CACHE_VERSION` | ✓ **672** | `sw.js:4` `const CACHE_VERSION = 672;` |
| Cache 名 | ✓ | `sw.js:5` `const CACHE_NAME = 'pono-v' + CACHE_VERSION;` (= `pono-v672`) |
| ServiceWorker 登録 | — | `quizland/index.html` 自体には `navigator.serviceWorker.register` がないが、 これは旧版も同様 (登録は `play.html` などのトップ層で行うアーキテクチャ)。 リグレッションではない。 |

---

## H. Question data integrity

| 項目 | 状態 | 根拠 |
|---|---|---|
| `<script src="./data/questions.js">` が inline `<script>` より前 | ✓ | line 15 (head 内) vs line 943 (body 末尾 inline) |
| `data/questions.js` の export | ✓ | グローバル `const QUIZLAND_QUESTIONS = {...}; const QUIZLAND_CATEGORIES = {...}; const QUIZLAND_COLORS = {...}; const QUIZLAND_WORD_IMG = '...';` (questions.js:11, 448, 459, 471) |
| inline script 内の参照 | ✓ | 全て解決可 (上述 §A) |
| 168 問件数 | ✓ | `level:` リテラル = 168 件 (確認) |
| 7 カテゴリーキー | ✓ | `order_color, count_total, shape_name, weather, opposite, trivia, body` (questions.js:14, 71, 104, 139, 217, 253, 365) |
| 各 q.type | ✓ | `order_color / count_total / shape_name / emoji_name / opposite / trivia` の 6 タイプ — `loadQuestion` switch (1290-1297) で全て分岐済み |

---

## I. Tests results

### I-1. Inline JS syntax check (Node `new Function`)

```
Inline script blocks (no src): 1
Last inline script size: 20015 chars
SYNTAX OK
```

`QUIZLAND_QUESTIONS / QUIZLAND_CATEGORIES / QUIZLAND_COLORS / QUIZLAND_WORD_IMG / Narration` をスタブ化して `new Function('window','document','localStorage', body)` で評価 → エラーなし。

### I-2. Orphan reference scan

inline JS で参照されている外部シンボル (window./typeof チェック付きを含む) :

| シンボル | 定義元 | 状態 |
|---|---|---|
| `QUIZLAND_QUESTIONS` | `data/questions.js:11` | ✓ |
| `QUIZLAND_CATEGORIES` | `data/questions.js:448` | ✓ |
| `QUIZLAND_COLORS` | `data/questions.js:459` | ✓ |
| `QUIZLAND_WORD_IMG` | `data/questions.js:471` | ✓ |
| `window.incrementStat` | `common/achievements.js:100` | ✓ (ガード付き呼出) |
| `window.triggerFirstClearReward` | `common/first-clear.js:158` | ✓ (ガード付き呼出) |
| `initMenu` | `common/menu.js:238` (`window.initMenu`) | ✓ (`typeof initMenu === 'function'` ガード付き) |
| `Narration.{load,getMode,hasEntry,play,playIfAuto,prefetch}` | `common/narration.js:97-141` | ✓ (`typeof Narration === 'undefined'` early return ガード付き、 1309) |
| `PointerEvent` | browser global | ✓ (`typeof PointerEvent === 'function'` チェック、 1523) |

orphan reference : **なし**。

### I-3. DOM ID cross-reference

inline JS で `getElementById` される ID とマークアップ存在 :

| ID | JS 参照行 | DOM 定義行 | 状態 |
|---|---|---|---|
| `stage` | 975 | 865 | ✓ |
| `safe-area` | (CSS のみ) | 866 | ✓ |
| `answer-panel` | 1251 | 914 | ✓ |
| `q-text` | 1286 | 904 | ✓ |
| `q-num` / `q-total` | 1334-1335 | 878 | ✓ |
| `hud-progress` | 1336 | 879 | ✓ |
| `stage-area` | 1287 | 908 | ✓ |
| `question-speaker` | 1310 | 905 | ✓ |
| `feedback` | 1405 | 930 | ✓ |
| `pono-avatar` | 1414 | 918 | ✓ |
| `result-icon` / `result-title` / `result-msg` / `result-overlay` / `result-btn` / `result-cat-btn` | 1435-1437, 1440, 1505, 1510-1511 | 934-938 | ✓ |
| `start-screen` | 1473, 1476 | 835 | ✓ |
| `mode-screen` | 1463, 1477, 1487, 1501, 1512 | 849 | ✓ |
| `hud-back-btn` | 1499 | 889 | ✓ |
| `hud-settings-btn` | 1517 | 893 | ✓ |
| `detail-popup` | 1393 | (動的生成、 CSS 定義 797-816) | ✓ |
| `char-hint` | (CSS のみ) | 917 | ✓ |
| `board` | (CSS のみ) | 907 | ✓ |

存在しない DOM ID への参照 : **なし**。

### I-4. `<script src>` / `<img src>` / asset path resolution

| 参照 | パス | 状態 |
|---|---|---|
| `../favicon.svg` | (root favicon, 既存) | ✓ |
| `../common/mvp-flags.js` | `common/mvp-flags.js` | ✓ |
| `../common/achievements.js` | `common/achievements.js` | ✓ |
| `../common/first-clear.js` | `common/first-clear.js` | ✓ |
| `../common/menu.js` | `common/menu.js` | ✓ |
| `../common/narration.js` | `common/narration.js` | ✓ |
| `./data/questions.js` | `quizland/data/questions.js` | ✓ |
| `../assets/preview-placeholders/stage-bg.png` | (1.27 MB) | ✓ |
| `../assets/preview-placeholders/quizland-sheet-v1.png` | (2.83 MB) | ✓ |
| `../assets/preview-placeholders/hint-60.png` | (17.8 KB) | ✓ |
| `../assets/images/quizland/title_back.png` | (2.07 MB) | ✓ |
| `../assets/images/quizland/title_logo.png` | (2.12 MB) | ✓ |
| `../assets/images/quizland/owl_professor_guide.png` | (1.50 MB) | ✓ |
| `../assets/audio/quiz_bgm.mp3` | (1.27 MB) | ✓ |
| `../assets/videos/ThinkingPono.mp4` | (2.26 MB) | ✓ |
| `../assets/images/word/<item>.png` | (count_total `ringo/ichigo/hana/hoshi/mikan` 全て存在 — `assets/images/word/` 内) | ✓ |
| `../assets/images/ocean/<img>` | weather/body emoji_name 用 (`Sun/`, `Eyes/` 等の DialogueDuck 系列、 該当ディレクトリ存在) | ✓ |

missing path : **なし**。

---

## Issues found

### 🟡 (軽微 / 文書化のみ)

1. **`selectedDifficulty` ハードコード `easy` で level 2/3 が UI から到達不能** (index.html:961)
   - `DIFF_MIN_LEVEL.easy=1, DIFF_MAX_LEVEL.easy=1` のため、 168 問のうち実プレイで出題されるのは level 1 の **56 問のみ**。
   - 旧 slim 版でも同じ仕様 (port 由来ではない、 機能リグレッションでもない)。
   - 実装者報告書 §「Notes for reviewers」5 でも触れられている既知事項。
   - 必要であれば mode-screen に「やさしい/ふつう/むずかしい」セレクタを追加すれば level 2/3 にも到達可能 (`selectedDifficulty` への bind 配線は既に存在)。

2. **`data/flowers.js` ファイルが残置** (3.3 KB)
   - `quizland/data/flowers.js` が未参照のまま物理ファイルとして残っている。 index.html からは `<script src>` されていないため副作用なしだが、 死コード。
   - MVP スコープ外なので強制ではないが、 cleanup 時に削除候補。

3. **`<a href="../play.html">` 結果モーダルからメニューへの戻りリンク (index.html:939)**
   - `play.html` がリポジトリ root に存在することは別途確認推奨 (本レビュー範囲外で未検証)。 旧版もこの相対パスを使っているため引き継ぎ問題ではない。

### 🔴 (重大)

なし。

### 🔵 (情報 / 確認推奨)

1. **`renderEmojiName` の画像パス基底 = `../assets/images/ocean/`** (index.html:1194)
   - weather (`Sun/`, `Rain/`, ...) や body (`Eyes/`, `Mouth_part/`, ...) の画像は本当は ocean 配下ではないが、 DialogueDuck 系列で `assets/images/ocean/Sun/`, `assets/images/ocean/Eyes/` ディレクトリが既に存在しており解決する。 旧版と同一動作、 port 由来の変更ではない。 (実装者ノートのとおり既存資産を流用)。

2. **iOS Safari での `ThinkingPono.mp4` autoplay**
   - `muted/playsInline` で autoplay は設定済 (index.html:1228-1232) + `video.play().catch(...)` の swallow も入っている (1233)。 title-tap ジェスチャ後に `loadQuestion` が走るので一般的には OK だが、 実機 Safari 確認推奨 (実装者ノート §4 と同じ)。

3. **trivia / weather / body / opposite の長文 chip ラップ**
   - `.chip` は `height:220px / font-size:28px` で固定 (index.html:484-502)。 長い選択肢 (例 「ねむっている あいだに げんきを ためなおして」) は `text-align:center / line-height:1.2` のみで自動 wrap (`white-space` は default)。 はみ出しの場合は visual review 1 側でフォローされる想定。 機能としては OK。

---

## Recommended deltas

軽微 (任意) :

- mode-screen 上に `selectedDifficulty` セレクタ (やさしい/ふつう/むずかしい) を追加し、 level 2/3 を再開放するか、 もしくは `data/questions.js` の level 2/3 問題を整理する。 (機能リグレッションではなく本リビューでの blocker でもない。)
- `quizland/data/flowers.js` を物理削除 (MVP スコープでは未参照)。

修正推奨 (採用前必須) : **なし** — 本 v2 ports は機能面で 🟢 採用可。

---

## Summary

旧 slim 版 (2585 行) → 新 Replace 版 (1537 行) の port は、 視覚は preview/full の 2100×900 stage に合わせ、 game logic は完全に温存・再配線されている。 168 問へのアクセス経路、 6 種 render、 4 つの SE、 BGM (`quiz_bgm.mp3`)、 narration、 confetti、 incrementStat × 2、 first-clear 連携、 共通メニュー連携の全てが旧実装と等価。 inline JS 構文 OK、 orphan reference なし、 DOM ID 不整合なし、 asset 全解決、 MVP 除外項目 (acorns/treasure/flower/garden/sticker/seed) は HTML/JS 共に **0 件**。 `sw.js CACHE_VERSION = 672` 確認済。

🟢 **採用可**。
