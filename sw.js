// Service Worker for ポノのあそびば PWA
// Network-first + version-based cache busting

// v1435: Daily gacha removes the side button/meter panel, centers the machine, and adds a hand-guided direct lever spin.
// v1433: Daily gacha raises the machine, uses stronger 3-step outlet zooms, and retunes the capsule drop to exit smaller and settle on the lip.
// v1432: Bento NPC position editor adds separate scaleX/scaleY controls and matches staff preview transform origin to runtime.
// v1431: Daily gacha final zoom now targets the outlet instead of drifting left, and the capsule exit uses more bounce frames while staying in the outlet area.
// v1430: Bento Pono wave frames crop lower body to match idle face scale.
// v1428: Daily gacha final notch no longer repeats capsule-toy SFX 01, and the opened sticker reveal layers a longer magic sparkle over the short sparkle.
// v1427: Daily gacha machine SFX switched to the new capsule-toy sounds — 01 plays for each lever notch, 02 plays only when the capsule exits.
// v1426: Daily gacha pacing retuned — 3 notches stay, lever drag now has heavier pull-to-notch feedback, and the capsule drop/closeup/open reveal keeps more suspense after the final turn.
// v1421: Daily gacha uses imported Suno-style audio: one consistent short low drum-roll turn SFX with staged gain/rate, a separate grand reveal SFX, and a subtle modal bed loop with mute/visibility handling.
// v1420: Daily gacha luxury light staging — the modal starts darker, each lever notch increases backlight/rays/sparkles, the final boom blooms to a bright gold stage, and the Pono-badge open capsule is the primary/default open view.
// v1419: Daily gacha repeat flow — lever visual center moved onto the machine axle, staged zoom now stays centered on the lever/machine, and the opened capsule view adds a "もういっかい" action so the gacha can be run repeatedly without the daily gate.
// v1417: play.html にアプリ版限定のデイリーシールガチャを追加。トップ画面から1日1回、レバーをドラッグして回し、カプセル落下→開封→既存 PonoGameStickers.grant(show:false) でシール付与する演出。assets/ui/gacha/ に alpha 済み本体・レバー・カプセル素材を追加。
// v1414: Bento tutorial UI fixes — (1) ナレ再生中の tutorialAdvance を queue 化して voice ended (or 8s timeout) まで遅延発火、 ユーザーが OK ボタン等を急いで押しても声が途中で切れない (cup-edit onEnded auto-advance は ended 発火時点で audio.ended=true なので queue されずそのまま通過、 既存挙動を保持)。 (2) せってい (⚙ tut-settings-btn) と おきにいり (⭐ fav-header-btn) の z-index を 8 → 9500 に底上げして game-title (9400) より常に前面に。 settings ボタンは背景 rgba 0.6 → 0.9 + box-shadow 追加で背後 UI の透けも抑制。
// v1413: LP ゲームカード5枚 (bento/maze/oto/puzzle/quizland) のビジュアル画像を play.html メニュー用 thumb_*.webp に統一 (pc-v-* の background-image url() を assets/ui/thumb_bento.webp / thumb_maze.webp / thumb_oto.webp / thumb_puzzle.webp / thumb_quizland_owl.webp に差し替え)。
// v1411: LP play-cards review fixes — oto card image swapped from title_logo.png (had baked logo text, duplicated h3 title) to title_back.jpg (no text), oto removed from background-size:contain rule (cover works for opaque background). Card scale relaxed 0.92->0.96 to reduce "shrunk" appearance while keeping scatter feel. bento background-position right 8% center to balance the square pono illustration on a 16/9 card.
// v1404: LP comprehensive copy refresh per morito — herob lead → "3〜6さい に おすすめ", titles bento/maze hiragana-ized, bubble copy retuned to keyword nouns (べんとう やさん / もり たんけん / ♪ おと あそび / みんなで パズル / なぞなぞ クイズ), modal detail rewritten for bento(customer scene)/maze(rescue lost animals)/oto(free+rhythm both modes)/puzzle(with partner animals), divider added between sticker-extra and book-aside with bolder book-aside styling.
// v1399: Bento tutorial UI: (1) 3 色グループモーダル (#sk-intro) のローテーション文字を撲滅し『あか・きいろ・みどりを ひとつずつ いれてみよう』 を常時大きめに固定表示 (font-size clamp(1.1rem, 2vw, 1.4rem)、 sk_intro_01-05 音声の連続再生は維持)、 (2) カップサイズツールバー (panel mode) の ↓↑ レイヤー切替ボタンを .free-layer-buttons でグループ化して flex-wrap 折り返し時も同段維持 (data-free-icon 属性はボタン側に残るためチュートリアル mark 経路は無事)、 (3) small-cup-food step のプチトマトバブルを tutorialPositionBubbleBeside でパレット要素近傍に動的配置 (画面左端固定で遠すぎる症状を解消)、 (4) tutorialOnCompleteDetailShown の「ともだちが よろこぶ...」 バブルを #complete-detail-page モーダル近傍に動的配置。
// v1396: capture.js html2canvas onclone を強化して bento の上層 DOM (⚙ tut-settings-btn / ⭐ fav-header-btn 等の小さな emoji ボタン) のぼけを解消。 clonedDoc 限定で box-shadow / filter を全要素 none 化し、 font-size ≤ 28px の単独 emoji ボタン (button/span で textContent <=2 文字) を 1.4x に拡大 + text-rendering:geometricPrecision を強制。 実 DOM 無触り、 既存 ellipsis 修正 (v1390) を保持。 検証: 実 PNG view loop で gear/star icon の中央穴・輪郭が鮮明化 (before: 形状が崩れ box-shadow が滲んだ blob、 after: 中央 dot とギア歯 + 星 outline 明瞭)。 せってい 木製 PNG ボタン (background-image) は元々鮮明で回帰なし。 Playwright capture 23 pass + 5 skip (T18 oto WebGL fixme 残置)。
// v1395: oto capture fix (true root cause) — html2canvas onclone で .stage の centering transform を解除して viewport にフィットさせる (v1392 の document.body target + viewport overrides だけでは html2canvas が translate(-50%,-50%) を展開できず stage が右下に押し込まれる症状が残っていた)。
// v1394: Oto rhythm tutorial sample hand appears early in a ready pose before the tap, stage-clear panel is smaller, rival speech bubble sits higher, and result text gets heavier faux-bold styling.

// v1391: LP play-cards bubble copy refined — "ゆうき そだつ" → "たんけん！" / "リズム なる" → "♪ おとあそび" / "じっくり あそぶ" → "えを かんせい！" / "あたま つかう" → "ひらめき ピン！" / "いま にんき！" → "いまにんき！"; natural Japanese phrasing per morito feedback.

// v1389: Bento tutorial cup-edit demo に layer-down / layer-up 矢印ボタン青枠 mark を追加 (basic_tut_10.mp3 「矢印で前後ろも変わるよ」 ナレに対応する UI 強調が抜けていた)。 tutorialLayerUpButtonEl ヘルパー新設 (tutorialLayerDownButtonEl と対称)。

// v1388: capture.js overlay 自身が html2canvas で焼き込まれていたバグを修正 (data-capture-hide 属性 + shoot 中 visibility:hidden の 2 重防御)。 bento / puzzle / quizland / oto の html2canvas ignoreElements が overlay UI を検出できるようになり、 さらに build 中は overlay を非描画にすることで属性検出が失敗しても焼き込みを防ぐ。

// v1383: Bento tutorial okazu-more step fix - メニューちらつき撲滅 (firstRender ガードで setFreeGuideStep + renderFreeLayoutControls() を 1 回のみ実行、 palette MutationObserver との無限再帰ループを遮断) + 「小さい おかずへ」 ボタンを正しく mark target (tutorialOkazuMoreAdvanceButton ヘルパー新設、 .free-action-row button.primary でラベル一致取得 → tutorialCompleteButton にフォールバック) + バブル/setSpeech/PonoCallout/modeLabel note を「おかずOK」 → 「小さい おかずへ」 表記に統一 (実 UI ボタンとの不一致解消)。

// v1372: LP play-cards each get a game-specific tape color (bento=tomato red / maze=night blue / oto=sky blue / puzzle=mint green / quizland=royal purple) and a click-to-open game detail modal with 2-3 screenshots, detail copy, and CTA. New CSS .game-modal / .game-card-clickable rules + GAME_MODAL_DATA object.

// v1365: Oto rhythm tutorial keeps the black cover through scene changes, rounds the difficulty spotlight, and blocks early rhythm-menu taps from leaking into the underlying UI.

// v1362: LP hero bg labels concentrated around CTA (left/right side bars at x 5-22% / 78-95%, y 50-90%) — avoids logo (top) + center text band; free copy changed from "きほんの あそびは いま みんなに ひらいてるよ" to "むりょうで あそべるよ！" per morito. bg_soft_playmat.webp / @2x rebuilt from washi-labels source PNG (deterministic seed 20260619); center clear-zone expanded to x 25-75% × y 0-100% (entire center column) — intrusion 0.

// v1360: LP hero bg labels resized to 0.55x — labels were too large per morito feedback. Same positions, same rotations, smaller scale for better balance with center title. bg_soft_playmat.webp (1920x1080) + @2x (3840x2160) rebuilt from washi-labels source PNG with deterministic seed 20260619; center clear-zone (25-75% x 30-70%) verified empty.

// v1358: LP hero redesign v2 — replaced brand_logo with all-in-one (Pono + wordmark + kicker baked in), replaced background with scattered category labels (chips moved to background, kicker removed from html); .herob-kicker/.herob-chips/.herob-logo-wrap rules removed. brand_logo.png 1595x475 → 1715x500. .herob-title-img max-width 720→800px (max-width:min(800px,92vw)). .herob padding-top/bottom unified to 24px (mobile) / 36px (PC) so scattered labels in bg corners are not cropped.

// v1356: Oto rhythm tutorial starts from a slower black fade and waits longer before the difficulty explanation.

// v1354: capture.js bento bugfix — target switched to document.body to include #sk-intro / #npc-intro / #npc-reaction / #bento-delivery body-level overlay scenes (was #app which excluded them, causing NPC scenes to capture as empty bento box). Same fix applied to puzzle (.page-wrapper → document.body) so #title-screen / #title-guide-choice / #puzzle-opening / #tut-dim / #tut-bubble and main.js body-appended coach/overlay/prompt nodes are included. quizland #stage / oto #app unchanged (no body-sibling overlays). Existing ignoreElements ([data-capture-hide]) preserved.
// v1353: Puzzle basic tutorial timing fixes (3 fixes) — (1) 「おてほんをみてね」 demo banner now syncs to basic_tut_01 (idx0) play event at ~3800ms (anchored to the phrase 「お手本を見てね」 in the opening narration) instead of firing too late after idx1; (2) 見る (peek) button finger/hand demo delayed to basic_tut_05 (idx4) play event at ~1800ms (anchored to the phrase 「長く押してみよう」) so the child sees the finger only AFTER being told what to do, not before; (3) REGRESSION FIX: basic tutorial no longer stuck after basic_tut_08 (idx7) 「困った時に使ってね」 — the v1346 setBasicCueWithRelease guard in startCommonHintPractice was breaking the basic→hint flow; chain restored. Cache-busts puzzle voice/main/style/partner-select to v1326.
// v1352: LP hero brand logo swapped from D (bear standing apart) to B (small bear reaching for text — correct pose per morito). Kicker repositioned over そびば area (right:4%, top:-4px, smaller clamp 110-180px, rotate -3deg). New brand_logo.png dimensions 1595x475 (was 1571x584).
// v1351: OtoTouch tutorial BGM uses Marble Candy Steps as a dedicated low-volume tutorial loop, restoring the previous BGM after the tutorial closes.
// v1350: LP hero full-bleed background + kicker repositioned to upper-right of brand logo (small + slight rotation). Brand logo re-processed as tight crop (1571×584, aspect 2.69) replacing prior 16:5 wide canvas with padding. .herob now width:100vw + margin-left:calc(50% - 50vw) so soft_playmat background reaches viewport edges (was max-width:1040px clipped to .page container). .herob-logo-wrap wraps h1 + kicker so kicker can absolute-position top-right of brand logo with -4deg rotation. .herob border-radius:0 (full-bleed has no rounded corners). Mobile (≤480px) tightens kicker offset to right:-4px.
// v1349: capture.js bento bugfix — switched build() target from #free-layout-stage (was only the empty bento box inner layer, dynamically created in .bento-inner) to #app (wraps left lunch box + right Pono/food tray + bottom guide UI). Same fix applied to puzzle (#puzzle-container → .page-wrapper to include header + sidebar peek/hint). Added ignoreElements for data-capture-hide attribute in bento/puzzle/quizland/oto (Phase 2.5 prep for tutorial overlay exclusion). quizland #stage and oto #app already correct.
// v1347: Admin narration defaults now use 明るく・落ち着き across narration tools, with separate Puzzle/Bento/Oto contexts; Oto rhythm tutorial adds the opening narration clip and regenerates 04/11 in the same tone.
// v1346: Puzzle basic tutorial fade+sync round-3 (4 fixes) — (1) bottom coach CTA 「やってみよう」 is now ORANGE FILLED with WHITE text (was orange text on cream pill); (2) ALL highlight/cue transitions FADE smoothly via alpha envelopes (orange tap-piece + blue kojika-move-target cues fade in ~260ms / fade out ~420ms with true cross-fade via cueOutgoing slot; button highlights fade out ~320ms; all 40+ raw partnerPracticeState.cue= assignments routed through setBasicCueWithRelease helper so no path bypasses the envelope); (3) drag-try (idx2) badge+voice+cue+input enable now synchronized to the basic_tut_03 play event at ~2180ms (single doSplit, guarded against double-fire via doSplitRan); (4) hint section no longer flashes an orange cue before basic_tut_09 narration anchors at ~2200ms (cue/banner cleared at startBasicHintPlaceTry entry, banner now lights INSIDE scheduleBasicHintSelectCueOnVoice with the cue). Cache-busts puzzle voice/main/style/partner-select to v1325.
// v1344: LP hero brand logo swap — h1 changed to brand_logo.png (Codex candidate D full-body bear); h1_calligraphy.png demoted to kicker (above h1, hiragana catch-copy 「みて さわって あそぼう」 retained as small decorative element). True site-name 「ポノのあそびば」 now lives in the sr-only span of h1 (was 「みて、さわって、あそぼう」). Preload swapped from h1_calligraphy → brand_logo (LCP). New .herob-kicker / .herob-kicker-img CSS, .herob-title-img max-width relaxed 640→720px, .herob padding-top trimmed 26→20px.
// v1343: Oto rhythm tutorial adds a full-challenge narration step, delays practice cues, removes the score-copy bubble, hides the "your turn" prompt, and cache-busts tutorial 04/11 narration audio.
// v1339: Oto rhythm tutorial delays hand cues, routes the sample through the おてほん button, and regenerates tutorial 05/06/08 narration audio.
// v1334: Oto rhythm tutorial narration audio is regenerated through the admin narration generator instead of manual splicing.
// v1333: Oto rhythm tutorial narration audio replaces the remaining spoken "line" wording with button-based timing, and cache-busts Oto tutorial audio.
// v1327: Oto rhythm tutorial plays imported narration audio during the guided rhythm menu steps.
// v1326: Oto rhythm tutorial narration line 1 is shorter and the TTS preset voice style is bright and calm.
// v1325: Puzzle basic tutorial adds a 12th closing voice step (basic_tut_12.mp3 「これで練習はおしまい。さあ、パズルで遊ぼう。」) that plays after idx10 before Stage 1, and shows the hint user-try 「やってみよう」 badge only once (suppressed on the move/retry step); cache-busts puzzle voice/main to v1315.
// v1324: Oto rhythm tutorial teaches button-overlap timing instead of the hit line and shows tutorial notes closer after countdown.
// v1321: Admin narration presets fill the read-aloud text fields directly when selected.
// v1320: Admin narration audio rows can be selected, inserted below the selection, right-click inserted, and drag-reordered.
// v1319: Admin voice generation is renamed to narration audio generation and adds an OtoTouch rhythm tutorial preset.
// v1318: Oto rhythm tutorial previews difficulty tabs, countdowns before sample/try notes, and keeps tutorial note fall speed equal to the game.
// v1317: Bento tutorial enlarges noriben seaweed, shifts the overlap target left, simplifies cup-size copy, and closes cup controls after OK.
// v1316: Puzzle basic tutorial expands to 10 voice steps (peek section gains the "困った時に使ってね" clip; hint section now plays intro/glow/finish), adds basic_tut_09/10.mp3, and bumps voice/main script cache-bust to v1312.
// v1315: Oto rhythm tutorial notes fade in immediately after the countdown starts.
// v1314: Oto rhythm tutorial shortens the single-note wait, adds a tap-start countdown, and removes duplicate tutorial note sounds.
// v1313: Oto rhythm tutorial advances only through real UI taps, highlights difficulty tabs first, and auto-continues after the sample note.
// v1309: Puzzle basic tutorial delays the opening demo badge and restores the full Look-button narration.
// v1308: Puzzle basic tutorial mixes old Look narration audio with the drag demo and delays blue target cues.
// v1307: Puzzle basic tutorial keeps settings inside the practice layout and restores the Look narration copy.
// v1306: Puzzle basic tutorial narrows the right rail and gives the board more horizontal room.
// v1305: Puzzle basic tutorial makes try glow stronger and uses a taller practice frame.
// v1304: Puzzle basic tutorial centers the layout, uses a center mode flash, and pulses the puzzle frame.
// v1303: Oto rhythm tutorial starts with a visible overview and uses real rhythm notes for the demo.
// v1302: Puzzle basic tutorial pins copy below the board while controls stay in the right rail.
// v1301: Puzzle basic tutorial moves the board left and pins copy plus controls in a right-side panel.
// v1300: Oto rhythm story tutorial shows the stage first, demos one falling note, and keeps prompts off controls.
// v1297: Oto tutorial bubbles avoid controls and add a next-time hide checkbox.
// v1295: Oto adds first-run tutorials for rhythm story and free 3D stage modes.
// v1283: Roll back the Bento staff/NPC staging bundle and restore the previous Bento defaults.
// v1281: Oto adds Alps Ichimanjaku as a new hard lion-rival rhythm stage.
// v1280: Oto lion-rival rhythm notes use a simple crown mark instead of claw/burst marks.
// v1278: Oto watches legacy sticker reward close events so next-stage openings continue on staging.
// v1277: Oto next-stage transitions close the result/name gate before sticker rewards and cleanly leave stuck rhythm states.
// v1276: SW update checks stay passive and no longer show a blocking in-page version prompt.
// v1275: Bento rolls back generated control button/frame sprites to the previous compact CSS controls.
// v1274: Oto Kero frustrated reaction uses imported fixed alpha art and left/right anger smoke.
// v1273: Oto rhythm stage select is open so uncleared stages can be chosen directly.
// v1272: Oto 3D note buttons share one closed top rim between side polygons and the textured top.
// v1271: Oto 3D note button top textures keep colored edges instead of dark rims.
// v1270: Bento text buttons use fixed-size slots across states while palette rows keep measured tile spacing.
// v1270: Oto 3D note button top textures are opaque so the beveled top has no groove.
// v1269: Bento palette rows use natural tile height and generated UI backgrounds keep measured PNG ratios.
// v1268: Bento applies NPC saved positions before showing portraits and stops stretching generated UI frames.
// v1267: Oto 3D note buttons use a rounded two-step bevel instead of a straight slab.
// v1266: Oto 3D note buttons remove the top-surface groove and silence audio immediately when inactive.
// v1265: Bento character position editor adds zoomed mask preview, undo, and 0.1% mask sliders.
// v1264: Oto rhythm rival openings use separate imported BGM tracks for the robot and lion rivals.
// v1263: Sea Album shows the key item art prominently when the hermit awards it.
// v1262: Sea Album coin rotation uses the imported alpha coin frames from the item folder.
// v1261: Bento staff waving-2 portraits reuse the matching staff art with alternate hand angles.
// v1260: Oto rhythm song menu uses a black backdrop, rival openings fade in from black, and Pono battle reactions are larger with FX.
// v1259: Bento character position editor can apply one placement to every expression or pose for a character.
// v1258: Sea Album adds story setup, broader SFX, stronger key handoff, and alpha-aware coin sprites.
// v1257: Oto adds imported title, rival dialogue, and stage-clear BGM with a settings toggle.
// v1256: Bento shop staff counter mask is adjustable in the character editor.

// v1255: Sea Album adds story setup, broader SFX, stronger key handoff, and alpha-aware coin sprites.
// v1254: Bento character position editor allows higher vertical placement for staff and NPC sprites.
// v1253: Sea Album caps pointer-follow speed, adds touch-offset flick jet, tougher enemies, staged feed lines, and generated coin sprites
// v1251: Oto reward stickers land from an enlarged impact with don SFX, and rhythm openings/results hide left battle cards while centering rivals in the main monitor.
// v1250: Bento shop opening uses layered staff background and alpha staff sprites with editable staff poses.
// v1249: StickerBookThreeJS uses generated transparent page-thickness textures instead of plain bottom rectangles.
// v1248: StickerBookThreeJS removes the outer vertical page-stack strips that appeared as cut-off pieces behind tabs.
// v1247: Oto rhythm rival lines are gentler, first rival openings introduce themselves, and sticker rewards use a richer celebration before next-stage openings.
// v1246: StickerBookThreeJS cover now fills the page ratio, and the binder uses internal split-ring sockets.
// v1244: Oto rhythm stage clear keeps defeated rival speech visible beside the result panel, including low-height screens.
// v1243: StickerBookThreeJS uses 20260617-596 cover/thickness assets for cache busting.
// v1242: Quizland stage question/answer phase layouts now reset stale inline geometry and stop answer preview from inheriting question-stage sizing.
// v1241: Bento squirrel NPC portraits use the consistent bright 20260614-120131 set.
// v1240: StickerBookThreeJS restores rich source-based covers and adds simulated left/right page-stack thickness.
// v1239: Oto rhythm stage clear composites the defeated rival and a final rival line over the clear background.
// v1238: Bento NPC position editor and runtime share versioned portraits and happy falls back to normal positioning.
// v1237: Bento squirrel NPC normal/almost portraits now match the newer round style.
// v1236: StickerBookThreeJS cover mode is now a closed-cover-only view, and inside pages use left list / right free sticker area.
// v1235: Bento uses imported alpha UI button/frame sprites for controls, group-colored palette tiles, and fixed selected-item toolbar.
// v1234: Oto free-mode choice thumbnails now use real screenshots, and Kero right-side sweat/action-line FX are flipped to face outward correctly.
// v1233: Oto rival openings are shorter and sticker rewards wait until result/high-score UI is dismissed; sticker toasts now defer behind visible game overlays.
// v1232: StickerBookThreeJS inside pages now use fixed production page render textures, with spine below pages and stable left page state.
// v1231: Bento tutorial requester now uses free-tier food (araiguma with taco wiener / tomato) to avoid locked yakizake.
// v1230: Oto free start asks for button/stage play style, renames free view tabs, and enlarges centered 3D Pono.
const CACHE_VERSION = 1435; // v1435: Daily gacha centers the machine and uses direct hand-guided lever spinning.
const CACHE_NAME = 'pono-v' + CACHE_VERSION;

self.addEventListener('install', event => {
  // 開いているゲームへ新しいSWを即時適用すると、controllerchange経由で
  // ページがリロードされ、ゲームがタイトル状態へ戻ってしまう。
  // 待機状態にして、次回起動/遷移時に自然に切り替える。
});

// ── Legacy skip-waiting message hook (v1137-) ──
// 現行の common/sw-update.js は更新待ちUIを出さず、次回起動/遷移で自然に
// 切り替える。既に開いている旧ページからのメッセージだけ後方互換で受ける。
self.addEventListener('message', event => {
  if (event && event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', event => {
  // 旧キャッシュを削除する。既存クライアントは claim せず、プレイ中の
  // ページを中断しない。新しいSWは次回のページ読み込みから担当する。
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
});

// Network-first strategy: try network, fall back to cache
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // 管理ツール（tools/, admin/, room pivots, /api/ 系）は SW 介在なしでブラウザに直接通す。
  // Basic Auth の 401 チャレンジ時にポップアップが正しく出るようにするため。
  // respondWith を呼ばない = デフォルトのネットワーク取得 + ブラウザ側のダイアログ処理が有効。
  if (event.request.url.includes('/admin/')
      || event.request.url.includes('/tools/')
      || event.request.url.includes('/room/furniture_adjuster')
      || event.request.url.includes('/room/yard_adjuster')
      || event.request.url.includes('/api/gh/')
      || event.request.url.includes('/api/gemini/')) {
    return;
  }

  // ナビゲーション系リクエスト (navigate / document / Accept: text/html) は
  // SW で intercept しない。ブラウザのネイティブな navigation と 307 redirect
  // follow に完全に任せる。
  //
  // 過去に v1190 で redirect:'manual' + Response.redirect(opaqueredirect) 戦略を
  // 試したが、 Fetch 仕様で opaqueredirect の response.url は空文字になるため、
  // フォールバックの event.request.url (= /play.html) に 302 を返してしまい、
  // ブラウザが同じ /play.html を再 fetch → 同じ 302 → 無限ループ
  // → ERR_TOO_MANY_REDIRECTS で両 staging が死亡。
  //
  // オフライン navigation フォールバックは失われるが、致命バグを取る方が優先。
  const isHTML = event.request.destination === 'document'
    || event.request.headers.get('accept')?.includes('text/html');
  if (isHTML) {
    return;
  }

  // 画像は SW キャッシュをスキップして常にネットワーク取得
  // （ピボットツールでスワップした画像が即反映されるように）
  // オフライン時のみ既存キャッシュにフォールバック
  if (event.request.destination === 'image') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 動画 (宝箱・ハリネズミ等) も SW キャッシュをスキップ
  // 古い mp4 がキャッシュされると再生が止まる問題の対策
  if (event.request.destination === 'video'
      || event.request.url.includes('/assets/videos/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // items.js / rewards.json / tts manifest / BGM はデプロイ直後に即反映させたいので HTTP キャッシュも無効化。
  // BGM (assets/audio/bgm/*.mp3) はユーザーが差し替えても古いブラウザ HTTP キャッシュが
  // 居座って「差し替えた曲がなぜか鳴らない」現象の原因になりがち。cache:'no-store' で毎回
  // ネットワーク取得、SW キャッシュだけ更新してオフライン用に保持 (2026-04-21)。
  if (event.request.url.includes('/room/items.js')
      || event.request.url.includes('/assets/data/rewards.json')
      || event.request.url.includes('/assets/tts/manifest.json')
      || event.request.url.includes('/assets/audio/bgm/')
      || event.request.url.includes('/assets/audio/storyboard/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // その他のアセット類は network-first + cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
