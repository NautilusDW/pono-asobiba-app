// Service Worker for ポノのあそびば PWA
// Network-first + version-based cache busting

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
const CACHE_VERSION = 1376; // v1376: LP brand logo swaps to Pono eyes 85 percent + soft longer fur. | v1375: Bento tutorial - cup OK panel selector + remove noriben from rice + tako-wiener resize (132→110) + okazu-more button-only advance step (renumbered to avoid v1374 collision with develop-app v1374 Oto rhythm; this bump also re-tags inline `v1374:` markers in bento/index.html to `v1375:` for consistency). | v1374: Oto rhythm title entry always starts stage 1 / kaeru, preventing stale progress from jumping straight to the lion rival. | v1373: LP game modal review fixes — accent colors darkened to meet WCAG AA contrast (bento/oto/puzzle), bento 3rd image swapped to kitchen_bg.webp to remove duplicate, quizland 3rd image swapped to quiz_start_card.webp (Fukuro_frame_002 was empty UI), modal copy "力" → "ちから/ちから" in puzzle/quizland detail, iOS Safari momentum scrolling on modal body. | v1372: LP play-cards each get a game-specific tape color (bento=tomato red / maze=night blue / oto=sky blue / puzzle=mint green / quizland=royal purple) and a click-to-open game detail modal with 2-3 screenshots, detail copy, and CTA. New CSS .game-modal / .game-card-clickable rules + GAME_MODAL_DATA object. | v1371: Oto rhythm tutorial uses one instruction bubble during sample/try-note guidance, restores tap-start countdown for the player try, and changes tutorial tap hand to a wrist-pivot press animation. | v1370: Bento tutorial - cup-edit-try ① + OK 同時マーク + small-cup-food プチトマト以外ロック + drag ghost cupSize 統一 (renumbered from worktree v1369 to avoid collision with develop-app v1369 Oto rhythm; this bump also re-tags inline `v1369:` markers in bento/index.html to `v1370:` for consistency, and fixes the toolbar-fallback comment to describe the actual else-if-split behavior). | v1369: Oto rhythm starts directly from the title into the next full stage, moves stage select into an unlocked settings option, and adds stage-select help that does not launch a stage. |  v1368: LP play-cards expanded from 3 games + sticker to 5 games (added puzzle + quizland) and sticker album extracted into its own "あそびの ほかにも" section after the games. New CSS .pc-v-puzzle / .pc-v-quizland / .pc-card--mt5 / .sticker-extra rules. 5th card centered at 2-column layouts to avoid orphan slot. | v1367: Admin Bento character-position export/import now includes staff/customer counter masks as well as positions, so localhost port migrations preserve saved counter-mask settings. | v1366: Bento staff wave_alt quality fix — restore Pono and boy second waving frames from non-broken historical assets, removing the flat paw and white/transparent-looking hand artifacts; staff asset cache key updated to 20260620-bento-staff-wave-alt-quality-v2. | v1365: Oto rhythm tutorial keeps the black cover through scene changes, rounds the difficulty spotlight, and blocks early rhythm-menu taps from leaking into the underlying UI. | v1364: LP hero labels switched from background image to absolute-positioned img elements with clamp()-based responsive positioning — guarantees visibility at all viewport sizes (PC wide / standard / iPad / iPhone). 5 labels (moji / kazu / oekaki / puzzle / ongaku) placed via CSS clamp() at the left/right edges so labels stay within viewport at any width (mobile 320px → PC wide). z-index:0 keeps them behind h1/lead/CTA; pointer-events:none preserves CTA tap. bg_soft_playmat.webp is now plain cream washi (labels no longer baked in). Cloudflare Workers delivery. | v1363: LP hero bg labels concentrated around CTA (left/right side bars at x 5-22% / 78-95%, y 50-90%) — avoids logo (top) + center text band; free copy changed from "きほんの あそびは いま みんなに ひらいてるよ" to "むりょうで あそべるよ！" per morito. bg_soft_playmat.webp / @2x rebuilt with deterministic seed 20260619; clear-zone expanded to x 25-75% × y 0-100% (intrusion 0). | v1362: Bento staff Pono/girl wave_alt frames rebuilt from their base wave images with one intact waving hand/paw, matching the fixed boy wave_alt style. | v1361: LP hero bg labels positions moved inward (~6% closer to center each, away from edges) — outer labels were being cropped by background-size:cover. Same 0.55x scale, same rotations. | v1360: LP hero bg labels resized to 0.55x — labels were too large per morito feedback. Same positions, same rotations, smaller scale for better balance with center title. bg_soft_playmat.webp / @2x rebuilt from washi-labels source PNG with deterministic seed 20260619. | v1359: Bento customer-side counter mask — order/delivery scenes overlay the shop_order_counter front panel above animal NPCs, and admin character editor can tune/save a separate customer mask. | v1358: LP hero redesign v2 — replaced brand_logo with all-in-one (Pono + wordmark + kicker baked in), replaced background with scattered category labels (chips moved to background, kicker removed from html); .herob-kicker/.herob-chips/.herob-logo-wrap rules removed. brand_logo.png 1595x475 → 1715x500, .herob-title-img max-width 720→800px, .herob vertical padding unified 24/36px so scattered labels in bg corners aren't cropped. | v1357: Bento shop staff boy wave_alt hand fixed so the second waving frame uses one intact hand and flips naturally against wave. | v1356: Oto rhythm tutorial starts from a slower black fade and waits longer before the difficulty explanation. | v1355: NPC position backup — Cloudflare KV auto-backup (GET/POST /api/admin/bento-npc-positions reusing BENTO_MASK_CONFIG KV with npc-positions: prefix, history kept to last 10), localStorage multi-key redundancy (v1 primary + _backup 1-step-back + _history last 20 with timestamps). Admin seeds from KV on load if LS empty. Bento game code unchanged (still reads v1 only). | v1354: capture.js bento bugfix — target switched to document.body to include #sk-intro / #npc-intro / #npc-reaction / #bento-delivery body-level overlay scenes (was #app which excluded them, causing NPC scenes to capture as empty bento box). Same fix applied to puzzle (.page-wrapper → document.body) so #title-screen / #title-guide-choice / #puzzle-opening / #tut-dim / #tut-bubble and main.js body-appended coach/overlay/prompt nodes are included. quizland #stage / oto #app unchanged. Existing ignoreElements ([data-capture-hide]) preserved. | v1353: Puzzle basic tutorial timing fixes (3 fixes) — (1) 「おてほんをみてね」 demo banner now syncs to basic_tut_01 (idx0) play event at ~3800ms (anchored to the phrase 「お手本を見てね」 in the opening narration) instead of firing too late after idx1; (2) 見る (peek) button finger/hand demo delayed to basic_tut_05 (idx4) play event at ~1800ms (anchored to the phrase 「長く押してみよう」) so the child sees the finger only AFTER being told what to do, not before; (3) REGRESSION FIX: basic tutorial no longer stuck after basic_tut_08 (idx7) 「困った時に使ってね」 — the v1346 setBasicCueWithRelease guard in startCommonHintPractice was breaking the basic→hint flow; chain restored. Cache-busts puzzle voice/main/style/partner-select to v1326. | v1352: LP hero brand logo swapped from D (bear standing apart) to B (small bear reaching for text — correct pose per morito). Kicker repositioned over そびば area (right:4%, top:-4px, smaller clamp 110-180px, rotate -3deg). brand_logo.png 1571x584 → 1595x475. | v1351: OtoTouch tutorial BGM uses Marble Candy Steps as a dedicated low-volume tutorial loop, restoring the previous BGM after the tutorial closes. | v1350: LP hero full-bleed background + kicker repositioned to upper-right of brand logo (small, -4deg). Brand logo re-processed as tight crop (1571×584, aspect 2.69). .herob width:100vw + margin-left:calc(50% - 50vw) so soft_playmat reaches viewport edges (was max-width:1040px clipped). .herob-logo-wrap wraps h1 + kicker so kicker absolute-positions top-right of brand logo. | v1349: capture.js bento bugfix — switched build() target from #free-layout-stage (was only the empty bento box inner layer) to #app (wraps full game UI). Same fix for puzzle (#puzzle-container → .page-wrapper). Added ignoreElements for data-capture-hide attribute in bento/puzzle/quizland/oto (Phase 2.5 prep). quizland #stage / oto #app already correct. | v1348: Screenshot mode Phase 2 — hooked up PonoCapture.register in 7 remaining games (starparodier, undersea-cave, sea-album, oto, quizland for canvas/composite; bento, puzzle for DOM via html2canvas dynamic import). All 8 games now support Shift+Alt+C / ?capture=1 capture mode. | v1347: Admin narration defaults now use 明るく・落ち着き across narration tools, with separate Puzzle/Bento/Oto contexts; Oto rhythm tutorial adds the opening narration clip and regenerates 04/11 in the same tone. | v1346: Puzzle basic tutorial fade+sync round-3 (4 fixes) — orange filled CTA, true cross-fade via cueOutgoing slot + helper-routed cue assigns, drag-try idx2 doSplit sync, hint idx9 anchor (no orange flash). Cache-busts puzzle voice/main/style/partner-select to v1325. | v1345: capture.js bugfix — preset resolution now properly applied via offscreen canvas + contain-fit composition (was outputting source canvas size as-is). | v1344: LP hero brand logo swap — h1 changed to brand_logo.png (Codex candidate D full-body bear); h1_calligraphy.png demoted to kicker (above h1, hiragana catch-copy 「みて さわって あそぼう」 retained as small decorative element). True site-name 「ポノのあそびば」 now lives in the sr-only span of h1 (was 「みて、さわって、あそぼう」). Preload swapped from h1_calligraphy → brand_logo (LCP). New .herob-kicker / .herob-kicker-img CSS, .herob-title-img max-width relaxed 640→720px, .herob padding-top trimmed 26→20px. | v1343: Oto rhythm tutorial adds a full-challenge narration step, delays practice cues, removes the score-copy bubble, hides the your-turn prompt, and cache-busts tutorial 04/11 narration audio. | v1342: Puzzle basic tutorial round-2 polish (3 fixes) — (1) STRENGTHEN context/selection menu suppression on the 見る(peek)/ヒント buttons: also preventDefault selectstart+dragstart per-button AND a capturing .controls-scoped contextmenu/selectstart suppression so a long-press beginning on the button inner content (icon/text) can't surface a callout on repeat press; CSS now cascades -webkit-user-select/user-select:none + -webkit-touch-callout:none + -webkit-tap-highlight-color:transparent to the button descendants (peek long-press / hint tap stay functional). (2) NON-SCALING button highlight: .partner-practice-highlight no longer scale(1.095)s or projects a 23px box-shadow + -20px ring (which made the stacked 見る/ヒント, gap:10px, overlap) — it now stays WITHIN the footprint via an opacity/box-shadow-spread glow (≤7px, under the gap) + a tight inset:2px accent ring, so the two buttons never overlap. (3) EMPHASIZE bottom coach box instead of center badge: setBasicPracticeModeBanner early-returns for kind try/demo (the big center 「やってみよう！」/「おてほんをみてね」 badge no longer covers the puzzle; frame-mode pulse preserved; done 「できたね！」 badge kept as-is) and the bottom .partner-practice-coach--basic TITLE gets a gentle kid-friendly pulse (accent #C7561E color + outline/border pill + soft glow, reduced-motion respected) as the call-to-action. AUDIO_VERSION unchanged (no audio change); cache-busts puzzle voice/main/style/partner-select to v1324. | v1341: Screenshot mode Phase 1 — common/capture.js (PonoCapture API, Shift+Alt+C trigger, hostname gate, staging-only by default), common/tier.js + PonoTier.setCaptureOverride API (sessionStorage `pono_capture_tier_override`, sub 同等の session 限定 bypass、 APP_BUILD 非汚染), maze/index.html hookup (主 canvas #gameCanvas を build で返す; bowl canvas は Phase 2)。 子供向け本番 UI は完全非表示 (hostname ガード必須)。 | v1340: Puzzle basic tutorial hint-section polish (4 fixes) — (1) suppress the native context menu / long-press callout on the 見る・ヒント buttons and the puzzle canvas (contextmenu preventDefault + -webkit-touch-callout/user-select CSS) so repeat-press/long-press peek/hint taps stay reliable; (2) at the hint SELECT step the orange tap-piece cue now lights IN SYNC with idx8 narration (anchored to basic_tut_09's real play event at the 「場所を知りたいピース」 ~2200ms offset, with wall-clock fallback) instead of immediately at t=0; (3) the 「やってみよう！」 center badge appears WITH that synced cue and fades out (is-leaving) the moment the child starts dragging the hint piece so it no longer covers the board mid-move; (4) during the final idx11 「できたね。わからない時は見るとヒントを使ってね」 line BOTH 見る and ヒント buttons get the practice highlight, cleared at the Stage-1 transition. AUDIO_VERSION unchanged (no audio change); cache-busts puzzle voice/main to v1323. | v1339: Oto rhythm tutorial delays hand cues, routes the sample through the おてほん button, and regenerates tutorial 05/06/08 narration audio. | v1338: LP hero swap — Codex-generated 1-line h1 calligraphy image (impact_balanced_02) + soft_playmat background image. Replaces text h1 with <picture> + sr-only span for a11y. Adds preload link for LCP. | v1337: Puzzle basic tutorial hint is now a DEMO-LESS single guided try (mirrors the 見る button) — the お手本 hand demo (runBasicHintPlaceHandDemo) is no longer called; the child does select→press→move DIRECTLY guided by narration: idx8 (SELECT 「次はヒントだよ。場所を知りたいピースを、まず選んでね」) plays at the start of the guided try, idx9 (PRESS 「ヒントを押すと、その場所が光るよ」) when the child selects, idx10 (GLOW 「光った場所へピースを持っていくよ」) when the child presses ヒント; each plays ONCE at the child's own step; 「やってみよう！」 try badge shown from the SELECT step; idx11/idx12 finish/closing unchanged; AUDIO_VERSION stays v1318 (no audio change); cache-busts puzzle voice/main to v1322. | v1336: Puzzle basic tutorial hint DEMO now plays the missing PRESS narration (basic_tut_10 「ヒントを押すと、その場所が光るよ」, idx9) — at the demo's button step idx9 plays BEFORE the hand presses the ヒント button (mirroring idx8→tap-demo), so the press narration is heard in full and is not cut by idx10/glow; idx8(select)/idx10(glow) and the try's idx9 are unchanged; AUDIO_VERSION stays v1318 (no audio change); cache-busts puzzle voice/main to v1321. | v1335: Puzzle basic tutorial splits the hint intro into a SELECT line (basic_tut_09 拍A 「次はヒントだよ。場所を知りたいピースを、まず選んでね」) and a new PRESS line (basic_tut_10 拍B 「ヒントを押すと、その場所が光るよ」) — 12→13 steps; the press-try step now has voice/coach copy, glow/finish/closing clips shift up to basic_tut_11/12/13, AUDIO_VERSION→v1318, and puzzle voice/main are cache-busted to v1320. | v1334: Oto rhythm tutorial narration audio is regenerated through the admin narration generator instead of manual splicing, and Oto tutorial audio is cache-busted to v1334. | v1333: Oto rhythm tutorial narration audio replaces the remaining spoken "line" wording with button-based timing, updates the rival line copy, and cache-busts Oto tutorial audio. | v1332: Puzzle basic tutorial hides/suppresses the center mode badge (「やってみよう」/「できたね」) while the 見る(peek) completed-picture overlay is showing, so the badge no longer covers the picture the child is peeking at — any visible badge fades out (.is-leaving / ~350ms) when peek shows and badge pops are suppressed until the 見る button is released; downstream badge behavior resumes normally on peek end; cache-busts puzzle voice/main to v1319 (AUDIO_VERSION unchanged, no audio change). | v1331: Puzzle basic tutorial drag-try keeps the 「やってみよう」 VOICE — the 「やってみよう」 badge and the spoken 「やってみよう」 now start TOGETHER as a pause beat using the FULL untrimmed basic_tut_03; at the 「ピース」 boundary (~2.18s, anchored to the audio's real playback) the badge fades + drag input enables while the SAME continuous clip flows on into 「ピースを持って、青い場所へ離してね」 (no restart/cut); removes the silent badge-alone hold; orange cue at ~2.18s / blue at ~3.72s; cache-busts puzzle voice/main to v1318. | v1330: Puzzle basic tutorial removes the 見る(peek) button hand demo — idx4 「まずは見るボタンを長く押してみよう」 now lets the child press the 見る button directly (try badge instead of お手本 badge); idx5 explanation still plays while the button is already pressable; cache-busts puzzle voice/main to v1317. | v1329: LP brushup — Hero B (slim) + Play Cards A1 (gravia-note style) + Amazon book-aside compact + technical fixes (viewport, fonts, contrast). | v1328: Puzzle basic tutorial drag-try shows the 「やってみよう」 badge alone first (deliberate pause), then on its fade-out enables input AND plays the trimmed basic_tut_03 narration together; basic_tut_03.mp3 re-trimmed to drop the leading 「やってみよう。」; cache-busts puzzle voice/main to v1316. | v1327: Oto rhythm tutorial plays imported narration audio during the guided rhythm menu steps. | v1326: Oto rhythm tutorial narration line 1 is shorter and the TTS preset voice style is bright and calm. | v1325: Puzzle basic tutorial adds a 12th closing voice step (basic_tut_12.mp3) after idx10 before Stage 1 and shows the hint user-try 「やってみよう」 badge only once; cache-busts puzzle voice/main to v1315. | v1324: Oto rhythm tutorial teaches button-overlap timing instead of the hit line and shows tutorial notes closer after countdown. | v1323: Puzzle tutorial unlocks the narration audio pool inside the entry gesture (PuzzleVoice.unlock primes HTMLAudio + AudioContext) so the auto-chained 見る/ヒント voices play on mobile, and the basic-tutorial voice state machine now advances immediately when play() is autoplay-blocked instead of stalling on the long fallback; cache-busts puzzle voice/main to v1314. | v1322: Puzzle basic tutorial expands to 11 voice steps (peek section adds an explanation clip at idx5; hint intro/glow/finish now use idx8/9/10), converts every basic-tutorial coach string to hiragana, fades the center mode badge out (~350ms opacity) before hiding, syncs the try-phase badge hide with the 見る/ヒント button grey-out, and cache-busts puzzle voice/main to v1313. | v1321: Admin narration presets fill the read-aloud text fields directly when selected. | v1320: Admin narration audio rows can be selected, inserted below the selection, right-click inserted, and drag-reordered. | v1319: Admin voice generation is renamed to narration audio generation and adds an OtoTouch rhythm tutorial preset. | v1318: Oto rhythm tutorial previews difficulty tabs, countdowns before sample/try notes, and keeps tutorial note fall speed equal to the game. | v1317: Bento tutorial enlarges noriben seaweed, shifts the overlap target left, simplifies cup-size copy, and closes cup controls after OK. | v1316: Puzzle basic tutorial expands to 10 voice steps (peek "困った時に使ってね" clip + hint intro/glow/finish), adds basic_tut_09/10.mp3, bumps script cache-bust to v1312. | v1315: Oto rhythm tutorial notes fade in immediately after the countdown starts. | v1314: Oto rhythm tutorial shortens the single-note wait, adds a tap-start countdown, and removes duplicate tutorial note sounds. | v1313: Oto rhythm tutorial advances only through real UI taps, highlights difficulty tabs first, and auto-continues after the sample note. | v1312: Oto rhythm tutorial stops auto-advancing text steps, fixes incorrect early pointers, and matches demo note fall speed to real songs. | v1311: Puzzle basic tutorial fixes mode badge CSS fade-out, deferred voice playback, voice lifecycle on phase transitions, and ties drag cues to actual voice playback. | v1310: Puzzle basic tutorial keeps mode badges visible for at least three seconds and cache-busts puzzle scripts. | v1309: Puzzle basic tutorial delays the opening demo badge and restores the full Look-button narration. | v1308: Puzzle basic tutorial mixes old Look narration audio with the drag demo and delays blue target cues. | v1307: Puzzle basic tutorial keeps settings inside the practice layout and restores the Look narration copy. | v1306: Puzzle basic tutorial narrows the right rail and gives the board more horizontal room.
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
