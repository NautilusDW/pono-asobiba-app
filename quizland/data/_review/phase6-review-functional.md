# Phase 6 Review (Functional Regression)

## Overall verdict
- 🟢 採用可

Phase 6 の差分は本ファイル末尾の「Diff scope」を参照。 ゲームロジック (questions / playlist / onChoice / nextQuestion / showResult / 音 / 達成 / Narration / 設定) には一切手が入っておらず、 純粋に saved-layout 適用ロジックを `common/layout/*` に外出ししたリファクタである。 168 問データ・全 7 カテゴリ・全 3 難易度・サウンド・初回クリア報酬すべて健在。

## A. Question rendering
- 168 reachable: ✓
  - `quizland/data/questions.js`:445 まで `QUIZLAND_QUESTIONS` がそのまま (168 件、 7 カテゴリ × 24 問、 各レベル 56 問)。 vm でロードして検証 (今回ループで実測)。
  - 7 カテゴリすべて `QUIZLAND_CATEGORIES` (`questions.js:448-456`) に登録: `order_color / count_total / shape_name / trivia / weather / opposite / body`。
  - `quizland/index.html:1102` の `ALL_CATS = Object.keys(QUIZLAND_CATEGORIES)` で全カテゴリが選択候補に入る。
- 6 render functions: ✓
  - `index.html:1353` renderOrderColor / `:1364` renderCountTotal / `:1376` renderShapeName / `:1389` renderEmojiName / `:1415` renderOpposite / `:1421` renderTrivia。
  - `:1504-1511` の `loadQuestion` の switch がそのまま 6 つを呼び分け。
- 3 difficulties accessible: ✓
  - `index.html:1107-1115` で `easy / normal / hard` のうち localStorage `pono_quizland_difficulty` から復元、 `:1108-1109` で `min == max` レンジ → 各レベル 56 問だけを抽出。
  - `:1724-1732` の `.diff-btn` ハンドラが切替 + 永続化。

## B. Game flow
- All transitions work: ✓
  - title (`#start-screen`) → mode (`#mode-screen`): `index.html:1687-1692`
  - mode → game (initGame): `:1695-1710`、 `:1670-1681`
  - game → result: `nextQuestion` (`:1635-1642`) が `questionIdx >= TOTAL_Q` で `showResult`
  - result → retry: `#result-btn` (`:1742-1744`) が `initGame` 再実行
  - result → mode select: `#result-cat-btn` (`:1747-1750`) と `#hud-back-btn` (`:1736-1739`) が `#mode-screen` に戻す
  - `buildPlaylist` (`:1330-1344`) は `selectedCategories` × `DIFF_MIN_LEVEL/MAX_LEVEL` × `TOTAL_Q (=5)` で動作。 修正なし。
  - `onChoice` (`:1564-1604`) は正解→次問へ、 不正解→当該ボタン無効化のみで再選択可能。 旧仕様維持。

## C. Sound/BGM/Narration
- Web Audio synths: ✓ `playCorrect:1257` / `playWrong:1272` / `playFanfare:1286` 健在。 `ensureAudio:1199` も同じ。
- BGM (`quiz_bgm.mp3`): ✓ `:1214` で `'../assets/audio/quiz_bgm.mp3'` をロード、 `startBGM/stopBGM/toggleBGM:1229-1244` 全部維持、 visibility/pagehide ハンドラ (`:1246-1255`) も残存。
- Narration: ✓ `:14` で `../common/narration.js` ロード、 `setupNarration:1522-1545` がそのまま、 `narrationKey:1518-1521` も保持。 detail 読み上げ (`:1587-1590`) も健在。
- Settings (BGM/narration ON/OFF): ✓ `:1241` で `pono_bgm_enabled` 永続化、 共通メニュー `initMenu({ bgmToggle: ..., tutorial: ... })` が `:1703-1708` でモード突入時に張り直される。 narration 側は `Narration.getMode()` 経由で共通管理。

## D. Achievements / first-clear
- incrementStat called on correct: ✓ `:1576` `incrementStat('quizland_correct', 1)`
- incrementStat called on completion: ✓ `:1656` `incrementStat('quizland_clears', 1)` (cleared=70%以上時のみ)
- incrementStat called on wrong: ✗ (旧コードからの残存)
  - `:1596-1603` で wrong 時は `incrementStat` を呼んでいない。 ただしこれは Phase 6 以前から同じ実装で、 git diff にも当該箇所は無い (差分は `QZ_*` 周辺のみ)。 Phase 6 起因の回帰ではないため 🟢 維持。 必要なら別タスク扱い。
- triggerFirstClearReward called on completion: ✓ `:1661-1663` `try { window.triggerFirstClearReward('quizland'); } catch (e) {}`
- スタンプラリー (`pono_played_<DATE>`) も `:1577-1582` で従来通り記録される。

## E. Settings menu
- BGM toggle: ✓ `:1703-1708` の `initMenu({ bgmToggle: function() { toggleBGM(); }, ... })` が共通メニューに渡される。 `common/menu.js:17-32` がメニュー描画 + SW 更新監視。
- HUD ⚙️ ボタンが共通メニュートグルにイベント転送: `:1753-1766`
- localStorage prefs persist: ✓ `pono_bgm_enabled` (`:1210, :1241`)、 `pono_quizland_difficulty` (`:1110, :1729`)、 narration 設定は共通モジュール側、 `pono_played_<date>` (`:1579-1581`) スタンプラリー。 全部キーそのまま。

## F. PWA / SW
- CACHE_VERSION 682: ✓ `sw.js:4` `const CACHE_VERSION = 682;`
- SW は network-first runtime cache (precache list なし) のため、 「new common/layout/* files in cache list」 という静的リストへの追加は不要。 681→682 のバンプで全クライアントキャッシュ全消去 + `clients.claim()` (`sw.js:12-28`) が走る → 次回フェッチで `common/layout/layout-applier.js` / `layout-system.js` / `layout-shared.css` / `quizland/saved-layout.json` がそのまま runtime cache に乗る。
- ⚠ 注意: `sw.js:91` に旧 path `/quizland/preview/full/saved-layout.json` の no-store ルールが残っているが、 新規 layoutUrl は `./saved-layout.json` (= `/quizland/saved-layout.json`) なのでルールに該当しない。 そのまま runtime キャッシュされる挙動になる。 PWA 既ユーザー初回起動時は `CACHE_VERSION=682` の全クリアでフレッシュフェッチされるので Phase 6 デプロイ直後は問題なし。 ただし以後 layout を編集した時に SW キャッシュが残り「saved してもゲーム側に反映されない」 PWA 体験が起きる可能性あり (運用上は CACHE_VERSION バンプで対応可)。 → 軽微 / 任意フォロー。
- Page registers SW: ✓ 親ページ (`index.html` ルート等) で `serviceWorker.register` 済み。 `quizland/index.html` 自体は `common/menu.js:17-32` 経由で `serviceWorker.ready.then(reg => reg.update())` を呼ぶので最新化される。 既存パターンに変更なし。

## G. Layout applier integration
- renderChoices re-apply: ✓
  - `index.html:1485-1494` で `window.LayoutApplier && window._currentLayoutData` ガード付きで `LayoutApplier.apply(_currentLayoutData, '#answer-panel', { selectors })` を呼び出し。
  - `LayoutApplier.apply(data, scopeRoot, cfg)` (`common/layout/layout-applier.js:81-104`) は `scopeRoot` 渡し時は per-element w/h/tx/ty のみ適用、 グローバル (`__headerH/__hidden/__texts/__userboxes`) は再適用しないので chip 再描画毎の chip 二重生成 / 多重 hide は起きない。 idempotent。
- Cached approach doesn't re-fetch on every chip render: ✓
  - `layout-system.js:131-143` で fetch は init 時 1 回のみ、 結果は `window._currentLayoutData` にキャッシュされる (`:140`)。 `:147` で MutationObserver 経由の動的 re-apply もキャッシュ参照のみ。 `renderChoices` 再呼び出し時 (`index.html:1488`) も同キャッシュを直接参照する。 ネットワークアクセスは初回のみ。
- selectors のタプル形式 `[selector, mode, label]` (`index.html:1153-1170`) は `normalizeSelectors` (`layout-applier.js:46-54`) で第 1 要素抽出されるため、 `apply` 側はそのまま動く。

## H. ?edit=1 mode
- Loads editor lazily: ✓ `layout-system.js:152-154` `if (shouldEnableEditor(config)) loadEditor(...)`、 `:190-208` で `layout-editor.js` + `layout-editor.css` を遅延 import。 `?edit=1` 無しなら editor JS は network には行かない。
- Editor doesn't break game logic: ✓
  - editor は `state.config = config` (`layout-editor.js:2672`) を保存し、 `attachHandle` を spec マッチ要素にだけ付ける (`:2698-2702`)。 game DOM のイベントハンドラ (`pointerdown` on chip 等) には触らない。
  - `state.spec` は **enable() 呼び出し時点** の DOM だけに handle を貼るため、 後から `renderChoices` で生成される chip には handle が付かない (既知の制約、 Phase 6 で変わっていない)。 ゲーム動作にはまったく影響しない。
  - `applySavedData(initialData)` (`:2710`) は `try/catch` で囲まれており失敗しても enable は継続。
- Editor で save → ghPath: ✓ `layout-editor.js:176-183` の `ghPath()` が `cfg.ghPath || layoutUrl から派生` で `quizland/saved-layout.json` を返す (`index.html:1182` で明示指定)。 旧 sandbox path には絶対書かない。

## I. localStorage keys
- 既存ユーザープリフ (`pono_bgm_enabled` / `pono_quizland_difficulty` / `pono_played_<date>`): ✓ そのまま使用 (`:1210, :1110, :1579-1581`)。 キー名・値形式に変更なし。
- 新規 layout-editor キー名前空間: ✓
  - `pono_layout_comparison_mode` (`layout-editor.js:1522-1565`)
  - `pono_layout_comparison_opacity` (`:1527-1566`)
  - `pono_layout_panel_open` (`:2267, :2723`)
  - `le_layout_<location.pathname>` (`:173-174, :231, :402`) — pathname スコープなので `/quizland/index.html` と `/quizland/preview/full/index.html` で衝突しない。
- 既存 `pono_*` ゲーム系プリフ (bgm/difficulty/played) と layout 系 `pono_layout_*` は接頭辞は同じだが第 2 セグメントで完全に分離。 衝突なし。

## J. Inline JS syntax
- ✓ `quizland/index.html` の inline `<script>` 1 ブロック (24,393 chars) を `new vm.Script()` で parse → エラーなし。
- 外部 src 参照 8 ブロックも別途 src 解決可能 (`../common/mvp-flags.js` / `../common/achievements.js` / `../common/first-clear.js` / `../common/menu.js` / `../common/narration.js` / `./data/questions.js` / `../common/layout/layout-applier.js` (defer) / `../common/layout/layout-system.js` (defer))。 全部実在 (`common/layout/` ディレクトリ確認済み)。

## Issues found

### 🟢 No regression. 軽微フォロー候補のみ:

1. **(Phase 6 起因ではない) wrong 回答時に `incrementStat('quizland_wrong', ...)` を呼んでいない**
   - `index.html:1596-1603` 既存実装。 git diff にも該当箇所なし。 Phase 6 のスコープ外なので合格判定。 別タスクで追加する場合は `playWrong()` 呼び出し直前に `if (window.incrementStat) window.incrementStat('quizland_wrong', 1);` を一行入れるだけ。

2. **(任意) `sw.js:91` の no-store ルール更新**
   - 旧 sandbox path `/quizland/preview/full/saved-layout.json` だけ no-store になっており、 新 active path `/quizland/saved-layout.json` は通常の network-first runtime cache 扱い。 実害は CACHE_VERSION バンプで吸収できるが、 layout 編集者が「保存したのに反映遅い」 と感じる可能性。 余裕があれば下記のように OR で並べると親切:
     ```js
     || event.request.url.includes('/quizland/preview/full/saved-layout.json')
     || event.request.url.includes('/quizland/saved-layout.json')) {
     ```
   - 機能回帰ではない。 採用可。

3. **(設計上既知) ?edit=1 で chip にハンドルが付かないタイミング問題**
   - editor `enable()` は呼び出し時点の DOM だけに handle を attach するため、 ゲーム開始前 (chip 未生成時) に editor が起動するとチップは編集対象にならない。 Phase 6 で変えた挙動ではない (旧 inline 実装にも編集機能はそもそもなかった)。 必要なら editor 側に「動的に追加された spec 要素を MutationObserver で拾って attachHandle」 を追加する別タスクで対応可。

### Diff scope (Phase 6 で実際に手を入れた範囲)

`git diff HEAD -- quizland/index.html` の差分 178 行を確認。 全行が以下のいずれか:
- 行 16-20: 共通レイアウトモジュール 3 ファイル (`layout-shared.css` / `layout-applier.js` / `layout-system.js`) の `<link> / <script defer>` 追加
- 行 1146-1192 周辺: 旧 inline `qzApplyOne` / `qzApplySavedLayout` / `loadSavedLayout` / `injectHiddenStyle` の **削除**、 `QZ_RESIZABLE_SELECTORS` の string→tuple 化、 `LayoutSystem.init({...})` ブートストラップに置換、 `layoutUrl: './saved-layout.json'` / `ghPath: 'quizland/saved-layout.json'` への切り替え + 説明コメント
- 行 1485-1494: `qzApplySavedLayout(...)` 呼び出しを `window.LayoutApplier.apply(window._currentLayoutData, ...)` に置換

ゲームロジック (1300〜1644 行台の playlist / render / onChoice / nextQuestion / showResult) と Audio 系 / Narration 系 / Wiring 系 (1684〜1769) は **1 行も変更なし**。 168 問・スコア・サウンド・初回クリア報酬すべて非破壊で migration されたことを確認。
