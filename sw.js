// Service Worker for ポノのあそびば PWA
// Network-first + version-based cache busting

// v1595: countdown bubble 重複解消 (1 つに統合 + ハリネズミ右下に再配置 + tail 左向き) — play.html ショップ画面で同じ「ばんごはんの あと かわるよ」 が #donguriShopBubble (hedgehog 横) と #donguriShopCountdown (中央上 plate) の 2 箇所に並列表示されていた問題を解消。 (1) DOM: <div class="donguri-shop-v2-countdown" id="donguriShopCountdown" hidden> を削除 (2) CSS: .donguri-shop-v2-countdown rule ブロック全削除、 .donguri-shop-v2-bubble を hedgehog (left:4%, bottom:6%, width:20%) の右下隣 (left:24%, bottom:10%, max-width:32%) に再配置、 ::after tail を bottom 下向き→ left 左向き (border-right 16px solid #fffbe8 + drop-shadow -2px 0 0 #b88600) に変更 (3) JS: renderShopCatalog の countEl = getElementById('donguriShopCountdown') 取得と countEl.textContent / countEl.hidden=false の代入を削除、 countdown text は bubbleEl 1 箇所に集約。 v1594 で staged 済の 4 件 (hedgehog 白枠 / もっとまわすよ slide 除去 / shop からガチャ機削除 / カード縮小+浮かせ+「あとN」 削除) は全て保持、 既存ガチャ機能 / レバー演出 / 5 ゲーム / common/* / 底部ナビ / PonoDebugMode 無改変。
// v1596: シール帳チュートリアル 自然化 — (A) find phase スライド中 (0-28%) hand 横向き固定 + 30-50% に find phase 圧縮、 (B) tray multi-active decoy を蝶々の DOM 近接 (±1/±2/±3) に変更、 (C) place phase 各 keyframe に cubic-bezier 個別付与 (Phase 1 応急対応)、 (D) wander 振り幅係数を 1.20→1.40 / 0.30→0.48 (符号反転 = decoy 側へ大きく寄る) / 0.20→0.24 に拡大 = decoy が近接化したことに連動して「うっかり見に行ってやっぱり蝶々に戻る」 演出を視覚明確化。 Prototypes/StickerBookThreeJS/main.js + styles.css のみ変更。
// v1595a: きょうのチャレンジ + ガチャおみせボタン画像化 — play.html の daily quest banner を GPT Image 2 生成プレート `assets/ui/daily_challenge_banner_generated_20260625.png` 背景に変更し、下段はゲーム名だけを動的表示 + 横幅 fit。daily gacha shop link は GPT Image 2 生成の木枠/ベタ塗りお店シルエット `assets/ui/daily_gacha_shop_button_acorn_20260625.png` へ変更。バナー bottom を gacha entry から離して重なり回避、PAGE_CACHE_VERSION も 1595 に同期。

// v1594: shop layout 仕上げ (hedgehog 背景透過 + ガチャ機削除 + カード縮小+浮かせ + あとN削除 + 吹き出しスライド消去) — play.html のみ編集。 (1) .donguri-shop-v2-hedgehog の filter drop-shadow を除去 (partner_harinezumi.webp が RGB 不透明で四角影が出ていた)、 img に mix-blend-mode: multiply + aspect-ratio: auto + background: transparent を追加してクリーム四角を背景に同化。 (2) .daily-gacha-panel から transform transition を除去 (step 0→1 で 中央 translateX(-50%) → 右固定 へスライドしていた、 最初から右側固定で出す)。 (3) shop overlay 内の <div class="donguri-shop-v2-machine"> + 内部 <img daily_gacha_machine.png> を削除 (ガチャ機は #dailyGachaModal 専用)。 CSS rule は orphan として残置 (影響なし)。 (4) カードレイアウト: .donguri-shop-v2-slots bottom 26%→14% / right 4%→6% (テーブル面に近づける + 削除した gacha 機の余裕)、 .donguri-shop-v2-slot max-width 30%→24% / padding 6→4 / box-shadow を 2 段 drop-shadow に強化 (0 8px 16px + 0 2px 4px) で「テーブルの上に浮いてる」 感、 .donguri-shop-v2-thumb max-height 140→100。 (5) renderShopCatalog の canPurchase=false 分岐で actionHtml='' (button 自体を出さない silent disabled) — 「あと N 🌰」 / 「かえないよ」 テキストを廃止、 50 🌰 値段表示は維持。 既存 daily-gacha (machine / lever / 演出) / grantDailyGachaSticker / sign-click / 底部ナビ / 5 ゲーム / PonoDebugMode / PonoDailyQuest / PonoDonguriShop logic / v1590 経済 / v1591 layout / v1592 carve-out / v1593 reveal プレート 全て無改変。
// v1593: ガチャ reveal の名前プレートに 「やったね！」 デフォルトテキスト (空文字で縦潰れしていた表示の修正) — play.html setDailyGachaReward 内で #dailyGachaRewardName を空文字+hidden=true から 'やったね！'+hidden=false に変更、 茶色プレート枠 (daily_gacha_super_name_plate_luxury.png) が空っぽで縦潰れする問題を解消。 v1575 ユーザー指示の「シール名 (機械生成名) は出さない」 を維持しつつ「reveal で中央寄せに 『やったね！』」 を実現。 sticker.name データは不変、 resetDailyGachaModal の素状態 (空文字+hidden) は維持。
// v1592: MVP flag どんぐりのみ carve-out — common/mvp-flags.js の PONO_MVP_NO_REWARDS を元の true に戻し、 新フラグ PONO_MVP_ENABLE_ACORNS = true を追加。 common/acorns.js の add() / addDaily() 冒頭 gate を `if (PONO_MVP_NO_REWARDS && !PONO_MVP_ENABLE_ACORNS) return 0;` に書き換えてどんぐりだけ通す。 アクアリウム生き物解錠 (achievements) / 部屋アイテム (achievements + stickers マイルストーン) / ログインボーナスシール (stickers.checkDailyLogin) は再び block 状態に復元。 既存ガチャ/ショップの PonoGameStickers.grant は flag 経由しないので引き続き active。
// v1591: donguri shop layout fix (hedgehog 縮小 + cards 詰め + countdown 移動 + 残高バッジ shop中hide) — play.html .donguri-shop-v2-* CSS のみ調整 (logic 無改変)。 (A) hedgehog width 28%→20% / max 260→170 / bottom 14%→6% / left 5%→4% (B) slots row left 16%→26% / bottom 22%→26%、 slot padding 10/8/10→6/6/6 / gap 6→4、 thumb max-height 140px、 thumb-fallback 44→34、 price 15→13、 buy font 15→14 (min-height 44 維持) (C) title text-shadow 4-direction white plate 強化 + z-index 6 で hedgehog より前 (D) countdown bubble を bottom:4% → top:62px (title 直下) + max-width 60% で hamiでし解消、 z-index 5 (E) .acorn-balance-badge.is-occluded { display:none } + showShop/hideShop で classList toggle (shop 内に同等 balance pill があるため重複解消) (F) bubble max-width 56→44 / font 17→14 / padding 10/16→6/12。 既存 v1588 selector 名と spec 一致 (.donguri-shop-v2-hedgehog / -slots / -slot / -title / -countdown / -bubble)、 #acornBalanceBadge も既存 ID 一致。 daily-gacha / openDailyGacha / PonoDebugMode / PonoDonguriShop / 5 ゲーム / 底部ナビ無改変
// v1567: Revert 底部ナビ 4ボタン化 + おしらせボタン削除 — フクロウ博士「おしらせ」 ボタン + #newsModal + 5 ボタン bottom-nav (help/official/news/stickers/settings) を完全復元、 grid-template-columns repeat(5,1fr) / .bn-item flex 20% / bottom_nav_group_5_*.png 参照に戻し、 BOTTOM_NAV_PRESS_AREAS を 5 セル構成に戻す。 a991e0d で追加された 4 ボタン PNG は削除済。 ユーザー要請による完全 revert
// v1566: daily-challenge / daily-quest-banner 完全 rollback (既存 daily-gacha-entry と重複のため)
// v1565: daily-challenge CANDIDATES を MVP 5 に縮小 (maze/quizland/bento/puzzle/oto のみ、 breakout/starparodier/undersea-cave を除外)
// v1564: daily challenge + gacha 追加 (cross-review 反映: Promise.catch、 disable race 修正、 3歳向け文言簡素化、 setTimeout 1200→2000、 claim 戻り値伝播、 prefers-reduced-motion で flash/vibrate skip)
// v1554: お家の方へ タグラインを 「安心・安全」 → 「あんしん・あんぜん」 ひらがな化 (「ココが育つ！」 ステッカー alpha 透過版は素材未提供のため raw 版維持)
// v1551: Bento book tier adds nori face/shape parts and furikake decoration assets.
// v1550: LP secret-word memo adds a collapsible list of book-unlocked benefits in title-menu order.
// v1549: LP 5 fixes — お家の方へ詳細化 (個人情報の入力なし) / ひみつのことば 文頭 ※ 追加 / シールアルバム ここが育つ ロゴ画像化 / Amazon評価に日付 (2026年6月24日現在) / ハードカバー文章 1文ずつ改行
// v1548: Daily gacha applies the remaining silver rare stickers and brightens the gold capsule.
// v1547: Tier lock copy now routes free users to the book secret word and book users to the app.
// v1546: Bento free tier starts in simple self-made mode only and no longer falls back to all NPC requesters.
// v1543: play.html title bottom nav right edge aligns to the actual game plate right edge, accounting for card-list shadow padding.
// v1542: ゲーム詳細モーダル 「ここが そだつ」 ラベルをテキスト → 画像表示 (assets/ui/growth_heading_pop_sticker_raw.png 「ココが育つ！」 ポップステッカー) に復元 — 前セッションで stash 退避されていた CSS/HTML 差し替えを再適用、 CSS で width clamp + translateY(-24%) で上下余白を crop
// v1539: ゲーム詳細モーダルの一番上に各ゲームの 「ここがそだつ」 (growth) を追加 — GAME_MODAL_DATA に growth フィールド追加、 LP カードの pc-growth と同じ文言、 ゲームの accent 色で borders + b タグ強調
// v1537: ゲーム詳細モーダル スクロールチェーン修正 — overscroll-behavior:contain でモーダル内スクロールが背景 LP に漏れないように、 body scroll lock も併用
// v1535: ゲーム詳細モーダル画像のチルト (rotate) と translateX を削除して画像を真っ直ぐに表示、 縮小+左右交互配置はキープ
// v1498: play.html に capture.js Hookup 追加 (ガチャモーダルキャプチャ対応)
// v1495: LP play-cards maze/bento ビジュアルをモーダル内タイトル画面画像に差し替え
// v1494: Daily gacha reveal smooths capsule drop, separates note bubbles, centers plate text, and raises open shells.
// v1493: LP hero labels (HANDOFF 02) + Coming Soon banner (HANDOFF 01 latest Pono LP Brand Kit handoff).
// v1492: Daily gacha super reveal uses the user-cleaned alpha luxury name plate and aligns play cache busting.
// v1489: Daily gacha super reveal focuses the sticker, uses a generated luxury name plate, and keeps capsule shells fully visible.
// v1488: Daily gacha prompts use larger start text, side speech bubbles, bigger reward sticker, and separated capsule shells.
// v1487: Daily gacha reveal layout makes the reward sticker larger and moves the play note to the top.
// v1486: Daily gacha super rare capsule uses dedicated platinum closed/open assets.
// v1483: Daily gacha gold capsule assets refreshed and rarity/color weights made configurable.
// v1482: Daily gacha super-rare reveal gets a dedicated luxurious fanfare SFX.
// v1479: coming-soon を Stitch 案 B (Sticker Banner + 詳細モーダル) に置換 — 旧 .coming-soon-app (phone モック) 完全削除、 Mochiy Pop One フォント追加、 タップ展開モーダル + Esc/オーバーレイ閉じ + focus トラップ
// v1478: StickerBookThreeJS prototype assets bypass browser cache to avoid stale zukan/book modules.
// v1469: LP .announce を Stitch 完成版 (coming-soon-app teaser) に置換 — phone モックアップ + ポノ dance_hooray + chip 6 種 + halo glow + reduced-motion
// v1468: StickerBook cover adds binder spine, rings, and a thicker back cover plate.
// v1467: Daily gacha adds bubbles_v1 to the capsule opening moment.
// v1465: Bottom nav swaps the top button to an official-site button using user-cleaned alpha sprites.
// v1464: Bento simple mode requires OK to confirm box previews, clarifies tap-to-select copy, aligns side tabs, and makes cup priority start cup movement instead of editor.
// v1463: Daily gacha hides the close X, moves reveal actions to the top right, and opens the tray landing mask.
// v1462: StickerBook zukan page type settings and printed page margins.
// v1461: Bento simple mode treats Napolitan as a cup-side okazu, makes cups easy to reselect, crops complete-screen characters to bust shots, and keeps continue in simple mode.
// v1460: Bento tutorial frees nori choices, keeps guided targets active, refreshes size-1/tomato narration, and fixes complete-detail close guidance layout.
// v1459: LP a11y focus/reduced-motion/isolation fixes.
// v1458: LP 派手化 — announce + play-cards + herob-cta に統一波長 (4.8s shimmer / 2.4s breath / .42s overshoot) で「ぴょこ・ぴか・きら」演出。 5 色個別 glow / 紙吹雪 / sparkle / arrow 弾み。 既存 announce/bookcheer アクセントは維持。
// v1457: Daily gacha reveal gets generated home buttons, returns to the game top, and smooths the tray mask/background glow.
// v1456: StickerBook zukan six-item index and wider detail template.
// v1455: LP .announce / .bookcheer にアクセントモーション追加 (hover bounce / 弾けるバッジ / シール peel / 黄色ハイライト wiggle / 初回ポヨン入り)
// v1454: Bento tutorial locks guided-only items and refreshes okazu/favorite narration with Gemini 3.1 TTS.
// v1453: Daily gacha masks the capsule behind the outlet lip and uses sticker/home image buttons on reveal.
// v1452: StickerBook zukan per-card text tuning and wider field labels.
// v1450: Align app cache after daily gacha cue/mask polish and Bento narration update.
// v1449: Lower Bento opening narration energy after intro.
// v1448: Daily gacha aligns the outlet mask to the opening, unifies cue arrow color, and moves the idle guide hand/label apart.
// v1447: Speed up Bento opening narration with Gemini TTS.
// v1446: Regenerate Bento opening narration with unified calm Gemini TTS.
// v1445: Daily gacha guide hand now grips the lever's right end while turning, and capsule exit is clipped by an outlet mask.
// v1444: Regenerate Bento opening narration with Gemini 3.1 TTS.
// v1440: Daily gacha makes the turn cue a high-contrast animated arrow, moves the guide hand around the lever, and repositions the capsule drop to the outlet.
// v1439: StickerBook zukan page text positions can be tuned in local preview.
// v1438: Daily gacha uses a static open-hand guide, a blinking turn cue, one-full-turn lever input, and a smoother smaller capsule drop.
// v1437: Bento shop opening/request narration is wired, and title adds a tap-to-place simple bento mode.
// v1436: LP に 2 セクション追加 — Hero B 直後の「お知らせ (アプリ発売告知、 大々的)」と、 book-aside 直後の「ハードカバー応援 (控えめ)」。 既存 hero/play-cards/sticker-extra/book-aside/video-section は無改変、 純粋追加。 CSS prefix announce-* / bookcheer-* を追加。
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
// v1481: Daily gacha gold capsule deepened and super-rare reveal made more distinct.
// v1493: LP hero labels (HANDOFF 02) + Coming Soon banner (HANDOFF 01 最新版: COMING SOON ピル + Mochiy + 3 行構成) per Pono LP Brand Kit handoff.
// v1497: LP に gacha セクション追加 (HANDOFF 完全準拠、 画像は後渡し)
// v1501: play-gacha capture target を .daily-gacha-shell (ガチャ機本体) に変更 — モーダル backdrop 除外で 16:9 ピッタリ
// v1502: LP sticker-extra を play-cards 2 枚 (ガチャ + シールアルバム) に置き換え HANDOFF v2 完全準拠
// v1503: daily gacha start panel and foreground stage fixed
// v1504: LP 1日1かい bubble (.pc-bubble--left) specificity fix — base .pc-bubble の right:-6px を上書きできず横伸びしていた問題を解消
// v1505: LP gacha bubble 文言を 「1日1かい」 → 「★いちにちいっかい」 に変更
// v1506: LP gacha bubble 文言を 「★１にち１かい」 (全角１) に修正
// v1507: daily gacha table placement, Pono start panel, and lever hit area fixed
// v1508: daily gacha table height, arrow marker, reward bubbles, and plate text alignment fixed
// v1509: daily gacha machine/table contact and delayed tomorrow bubble
// v1510: daily gacha arrowhead, centered rays, stronger sparkles, and shorter start panel
// v1511: LP play-cards 5 ゲーム (bento/maze/oto/puzzle/quizland) のコピー全面刷新 — chip / play / growth / 詳細モーダル detail を更新
// v1512: QuizLand difficulty buttons use GPT Image 2 wooden normal/pressed alpha frames.
// v1513: QuizLand difficulty selection uses generated star icons, no initial selection, and confirm-before-start.
// v1514: LP に絵本アドバンテージ訴求追加 — hero 直下匂わせ帯 + 絵本セクションそえがき + Puzzle/Oto カード画像を title_back.jpg に差し替え + book-aside に id 付与
const CACHE_VERSION = 1596; // v1596: シール帳チュートリアル 自然化 — (A) find phase slide 中 (0-28%) hand 横向き固定: keyframe 17% 直後に 28% 新規追加 (scroll-from 位置 + rotate90/scaleX-1 継続)、 既存 20-50% の find phase を 30-50% に圧縮 (10% シフト) で「スライド中は覗き込まない」 振付に揃え、 ghost 側も 52% (display 0) を維持 (B) tray multi-active decoy を蝶々近接化: stickerTutorialPickActiveStickers を DOM index 近接ロジックに書き換え、 MAIN の DOM index を取得し ±1/±2/±3 を順に試行して 2 個揃うまでループ、 揃わなかった場合のみ既存 STICKER_TUTORIAL_DECOY_STICKER_IDS を fallback として使う = scroll 完了後 MAIN center 配置時、 viewport 内に decoy 2 個が必ず可視 (C) place phase ベジェ Phase 1 (応急対応): keyframe 53% (pickup) / 56-65% (wander 群) / 68% (overshoot) / 72-75% (ためらい振動) / 78-80% (drop) に各 animation-timing-function を個別付与 (cubic-bezier easeOutCirc / Fitts-base / back overshoot / 慎重減速)、 全体の ease-in-out から segment 別に置換 (Phase 2 = JS rAF + Catmull-Rom 完全実装は v1557 想定で次 commit に分離) (D) 大きな迷い動き: stickerTutorialDemoPoints place phase の中継点座標で wander1 perp 1.20→1.40、 wander2 perp 0.30 を符号反転 +0.48 (= 1.6 倍 + decoy 側へ寄せ)、 wander3 perp 0.20→0.24 (1.2 倍) に係数調整 — Prototypes/StickerBookThreeJS/main.js + styles.css のみ編集、 admin/index.html / mp3 / 他ファイル無変更、 backwards-compat shim なし // v1594: shop layout 仕上げ (hedgehog 背景透過 + ガチャ機削除 + カード縮小+浮かせ + あとN削除 + 吹き出しスライド消去) // v1591: シール帳チュートリアル — pacing 区切り + find 横限定 + place 遠回り迷い — (1) STICKER_TUTORIAL_STEPS 自動 advance 廃止 (notifyStickerTutorialAction で advanceOn ジェスチャー検知時の setTimeout→showStickerTutorialStep 経路を削除、 代わりに #stickerTutorialNext を早期 enable + .is-ready-pulse 強調 = 子供が押すまで待つ)、 playStickerTutorialAudio の "ended" でも advanceAfterAudio 分岐撤去し pulse-enable のみ。 minAdvanceMs を mode 5200→4500 / place 13500→5000 (+ advanceAfterAudio:true 削除) / move 6500→4500 / scale 10400→5000 / rotate 7300→4500 / ok 4700→4000 / page 6600→4500 / view 6800→4500 に短縮 (intro 4200 / final 6500 据置)、 updateStickerTutorialNextAvailability に opts.forceReady 追加 (actionDone なら minAdvanceMs を待たず即 enable)、 showStickerTutorialStep 内で step 切替時に .is-ready-pulse を remove、 セーフティ: 15s 経過しても「つぎ」 未押しなら自動 advance (addStickerTutorialDemoTimer 経由なので stopStickerTutorialStepDemo で確実 clear) — (2) find phase (0-50%) tray Y 帯に閉じ込め: stickerTutorialDemoPoints の step.id==="place" 分岐に findWander1 / findOverTarget を新設 (trayRect 内 clampX/clampY)、 styles.css @keyframes stickerTutorialFindPlaceHand の 26%/40% フレームを wander1/overTarget → findWander1/findOverTarget の新 CSS var に差し替え、 page 側 (右ページ) まで縦に飛ばないように横移動オンリー化 — (3) place phase (53-80%) 非単調進行 + 1 hold + small overshoot: wander1 を axis 0% + perp 1.20w / 上 0.50w で反対ページ寄りまで大振り、 wander2 を axis 0.85 / 逆 perp 0.30w で to の手前まで大ジャンプ、 wander3 を axis 0.40 + perp 0.20w で back-track ★「あれ違った」 の核、 overshoot を to+8% の小振幅で追加 (wanderSpan を 150→Math.min(vw*0.32, max(180, pageW*0.45)) に拡大)。 styles.css に 59% (wander1 hold rotate -8) / 70% (overshoot scale 1.00 rotate 2) フレーム新規挿入、 @keyframes stickerTutorialFindPlaceGhost も同 % で手と同座標フレーム追加 (ghost 追従)。 updateStickerTutorialDemo に新 6 CSS var (--tutorial-demo-find-wander1-x/y, --tutorial-demo-find-over-target-x/y, --tutorial-demo-overshoot-x/y) を setProperty 注入 — (4) styles.css 末尾に #stickerTutorialNext.is-ready-pulse:not(:disabled) と @keyframes stickerTutorialNextPulse (scale 1↔1.06, box-shadow ↔, 1.2s ease-in-out infinite) を追記、 prefers-reduced-motion で animation:none + 静的 box-shadow に degrade。 他 step / 既存 mp3 / プリセット / admin / 他ファイル無変更 // v1590: MVP gate 解除 (PONO_MVP_NO_REWARDS=false) + 5 ゲーム (quizland/oto/sea-album/undersea-cave/starparodier) に common/acorns.js 読込追加 + play.html 残高バッジに sessionStorage 同期 (pono_acorns_last_seen_v1) で戻り時 bump 発火 → どんぐり経済が初めて完全動作 (既存 6 ゲーム maze/bento/puzzle/writing/breakout/bowling 含む全 11 ゲームで addAcornsDaily が LS 書込 + pono-acorns-changed dispatch、 ショップ動線 50 = シール 1 枚 / daily quest お題 +5 / login bonus / 実績解錠 が initial earn から成立)。 + シール帳 intro mp3 配置 + プリセット text フル原稿化 — (1) assets/audio/stickerbook/tutorial/stickerbook_tut_00_intro.mp3 を新規配置 (TTS3.1 Aoede、 dur 10.41s / mp3 44100Hz mono 80kbps / LUFS -18.58 / sha256 fb6ff40c...f6f7、 whisper yomi 一致率 92.7% / 禁止語ゼロ、 既存 stickerbook tut_01-11 と整合)。 step 0 intro ナレーション (4.2s→10.4s に実音声拡張、 「ここはゲームで手に入れたシールを自由に貼って楽しめるシール帳のおへや だよ。 早速あそびかたを一緒に見ていこう！」) が App staging で初回再生可能に。 (2) admin/index.html PUZZLE_TTS_PRESETS シール帳プリセット rows[0] text を 「これから シールちょうの あそびかたを おしえるね」 → 「ここはゲームで手に入れたシールを自由に貼って楽しめるシール帳のおへや だよ。早速あそびかたを一緒に見ていこう！」 のフル原稿に差し替え (intro 行のみ唯一の「！」、 master 承認済コピー、 admin 再生成時の正本契約を mp3 と同期)。 他 11 rows (mode/find/pick/place/move/scale/rotate/ok/view/final/page) / 他プリセット / scene / context / style 全て無変更、 main.js / styles.css 触らず、 prior-phase staged 群 (oto/play/quizland/sea-album/starparodier/sw.js/undersea-cave/_hook_block_test.md = donguri economy 系) は別 commit 待機。 // v1589: donguri economy 完成 (quizland/oto/sea-album/undersea-cave/starparodier に addAcornsDaily 追加 + play.html メインメニューに 🌰 残高バッジ live 更新) // v1588: shop rotation must-fix (test commit + 時間帯表現 + ひらがなタイトル + isNew gating + canPurchase 集約 + タッチターゲット) — cross-review NEEDS-FIX 3 件 + critical NTH 3 件 を反映。 (MF1) tests/donguri-shop.test.js を scratchpad から repo へ commit (path.resolve(__dirname, '../js/donguri-shop.js') に書き換え、 30/30 PASS)。 (MF2) play.html _formatShopCountdown を 「あと N じかんで かわるよ」 から JST 次スロット時刻に応じた時間帯フレーズ (0/3=ねんねの あと、 6=あさごはん、 9=あさあそび、 12=おひるごはん、 15=おやつ、 18=ばんごはん、 21=ねるまえに) + 残り 1h 未満は「もうすぐ かわるよ」 に置換、 3-4 歳に「N じかん」 が抽象的すぎる UX 問題を解消。 (MF3) shop overlay header の「シールショップ」 → 「シールの おみせ」 (ひらがな化、 「シール」 は商品名としてキープ)、 bubble seed text 2 箇所も 「あと N じかんで かわるよ」 → 「もうすぐ かわるよ」 に。 (NTH1) donguri-shop.js isNew(stickerId) で prevStickerIds.length === 0 (初回 rotation) のとき必ず false を返す → 初日「あたらしい！」 バッジ全点灯 = isAlwaysNew 錯覚を防止、 R11 test も新契約に追随。 (NTH2) renderShopCatalog 内の owned/buy 判定を canPurchase(stickerId) single source of truth に統一、 「balance>=50」 二重ロジックを撤去、 getOwnershipState は heart 演出判定のみに用途限定、 rotation 外 / 所持済 / 残高不足 のいずれでも UI が正しく disabled 化。 (NTH3) .donguri-shop-v2-slots を left:32% -> 16% に詰めて全幅 64% -> 80% に拡張、 1 slot min-width:56px / max-width:30% を追加、 chubby finger 窮屈問題を解消 (gacha machine clearance right:4% は維持)。 // v1586: donguri shop rotation (3h JST slot, weighted picker, hedgehog NPC, atarashii badge, heart-on-owned) — play.html donguri-shop v2 layout: 3 sticker slot cards (rotation) + hedgehog standee + 木製 forest workshop backdrop + speech bubble countdown + ESC/backdrop close。 既存 #donguriShop コンテナ保持 (showShop/hideShop 互換)、 旧 flat 30-grid 削除、 全 v2 selector を .donguri-shop-v2-* prefix で隔離、 prefers-reduced-motion guard 完備。 // v1585: シール帳 MEDIUM 修正 2 件 — (1) stickerTutorialPickActiveStickers に fallback ループ追加 (DECOY_STICKER_IDS が tier 制限 / カタログ未ロード / 将来の ID 変更で見つからなかった場合、 stickerOptions の先頭から重複排除しつつ補完して active 数 3 個を保証、 上限 stickers.length>=3 で break、 main 蝶々と被らない既存 some() ガード踏襲) (2) stickerTutorialDemoPoints find phase の overTarget 座標を source.x/y → to.x/y に補正 (コメント「fake-out target 真上素通り」と動作一致、 直前 hover / 直後 wanderA/B/C も to ベースで一貫性確保、 旧実装は tray アイコン真上に戻る逆方向軌跡だった)。 Prototypes/StickerBookThreeJS/main.js のみ変更、 他 step (pick/move/scale/rotate) と sticker pick UI 契約は無影響、 ESM 構文 check 済。 // v1584: シール帳チュートリアル UX 改修 5 件 — (1) intro step (step 0) 追加 = 「これから シールちょうの あそびかたを おしえるね」 4.2s、 stickerbook_tut_00_intro.mp3 (未配置時は audio error/play reject 双方で進行継続、 minAdvanceMs 経過後「つぎ」 で advance) (2) find phase keyframe 改修 = 中継 5 点 (wander1/chooseLeft/chooseRight/wander2 fake-out/chooseLeft) + micro-vibration (±6px) + 頷き bobbing、 tray scroll 0-28%→0-18% (1往復に削減)、 find 32-44%→20-50% (中継 5 点 + fake-out)、 timing 15.8s 維持 (3) place phase keyframe 改修 = pickup→wander1→wander2→wander3→hover→ためらい振動 1/2→drop→release、 perpendicular-based wander 計算 (wanderSpan 110→150)、 hover 真上で停止 + ±4px 振動、 ghost も同じ中継点で追従、 hand サイズ +18% (clamp 82px/9.2vw/124px)、 timing 15.8s 維持 (4) tray multi-active = main 蝶々 + decoy 2 個 (バッタ/はなまる) 同時黄色ハイライト、 stickerTutorialPickActiveStickers/updateStickerTutorialTraySilhouettes 改修、 既存 CSS .is-tutorial-target-sticker そのまま流用 (5) page step 矢印 hand 縦向き化 = slider 系で実証済の rotate 90° + scaleX(-1) + translateY +36.5% パターンを page step に流用、 stickerTutorialPageHoverVertical 新規追加、 stickerTutorialPageSwipeHand を縦タップ動作 (translateY ±8%) に書き換え、 GPT Image 2 生成なし。 ASSET_VERSION も 20260624-846 → 20260625-847 にバンプ (intro step audio + decoy 定数のため main.js 変更あり) // v1582: シール帳 hand cursor 指先位置補正 (slider-js steady-state + stickerTutorialSliderDemo keyframe の rotate 90° + scaleX(-1) 合成後に指先が thumb 中心に乗るよう translate Y を -35% → +36.5% に再計算、 inline-sticker-controls 上の scale/rotate step で指先が thumb より上にズレていた問題を解消、 他 step (tap/move/place/mode/view/swipe) は selector で非対象のため影響なし) // v1581: PonoDebugMode 過剰縛り解消 (tier.js 正当 paid 経路復活 = isAppBuild / pono_premium localStorage / verifyBookPassword / verifyAdminPassword から PonoDebugMode 依存撤去、 staging-app の sub tier 復活 + 本番 book 購入者 degrade 解消、 starparodier ?dev=1 state expose を PonoDebugMode.isAllowed() && URL の AND に変更、 pono_debug 並列パス削除 = play-all.html 3 callsite を PonoDebugMode 経由に置換 + UI トグルボタン削除 + room/index.html 1 callsite 置換、 play.html 重複 <script src="common/debug-mode.js"> 削除) — capture override (pono_capture_tier_override) は dev-only 機能のため v1580 の PonoDebugMode gate を維持。 // v1580: common/tier.js の client-side unlock 5 経路を PonoDebugMode.isAllowed() で gating (pono_premium localStorage / pono_capture_tier_override sessionStorage / __APP_BUILD__ / verifyBookPassword '1234' / verifyAdminPassword 'abcd') — staging host (localhost/127.0.0.1/*staging*) + sessionStorage('pono_debug_mode_session'==='1') 通過時のみ unlock 許可、 本番 LP では DevTools 経由の client-side shortcut を完全閉鎖。 legitimate な paid book/sub は将来 Stripe/IAP の server-side 検証経路で別途実装予定 (今回の対象外)。 + 全 15 HTML (play / oto / bento / quizland / maze / puzzle / writing / aquarium / room / bento/kitchen / play-all / _staging_oto / .smoke_play / .smoke_quizland / .staging_maze) で <script src=".../common/debug-mode.js"> を tier.js より前に挿入。 isTierUnlockAllowedClientSide ヘルパーを PonoTier.isTierUnlockAllowedClientSide で export // v1579: シール帳チュートリアル ポリッシュ 3 件 (commit d76b319) — (1) 下 tray を tutorial 全期間 silhouette ON 維持し step 2 (place) のみ黄色 target ハイライト、 updateStickerTutorialTraySilhouettes を (enabled, withTarget) 2 引数化 + begin/show/prepareStickerTutorialStep / renderStickerThumbnailTray / stopStickerTutorialStepDemo を tutorial active 中は silhouette 落とさない形に統一 (2) place の hand cursor に「迷う動き」追加、 main.js demo target に wander1/2/3 計算 + CSS 変数 6 個流し込み、 styles.css stickerTutorialFindPlaceHand keyframe 48%-70% を 5 stop (掴む→左上→右下→戻りかけ→置く) に細分化、 keyframe 全体時間 15.8s 維持 (3) step 2 (place) を音声 ended + 500ms で自動 advance、 minAdvanceMs 18500→13500 短縮 + advanceAfterAudio:true 追加、 playStickerTutorialAudio 最終音声 ended ハンドラで actionDone 早期セット + 500ms 遅延 advance (ユーザー drop は既存 fallback で従来通り動作)。 Prototypes/StickerBookThreeJS/ は network-first + no-store 経路なので user-impact は小さいが spec 準拠で安全マージン確保 // v1578: PonoDebugMode 統合 (common/debug-mode.js / brand-sign click → promptUnlock staging-only) + ガチャ無制限 bypass (openDailyGacha で isAllowed() 時 usedToday/lacksKey gate を skip) + .daily-gacha-shop-link { pointer-events:auto } で .daily-gacha-panel inherit を上書き (shop ボタンが center-msg 中も clickable) + 既存 v1578 メモ (ガチャシール重複削除 + 055 フクロウ博士差し替え + 通し番号振り直し) // v1577: must-fix shop 可視化 + 鍵なし/引き済み 触覚 illustrated hint // v1576: daily-quest UI v2 rework (バッジ削除 / questPromptModal 削除 / openDailyGacha gates 緩和 / 中央メッセージ + ショップ常時 active / チャレンジバナー新規 / reveal シール名 hide) // v1575: 歪み mp3 v1574 revert + admin プリセット (漢字 + safe context) は維持 — v1574 (commit 06a6b5b) で再生成したシール帳 チュートリアル ナレーション 10 本 (TTS3.1 Aoede) に ffmpeg マスタリング設定ミス (24kHz→48kHz アップサンプル + 128kbps + loudnorm I=-14 過剰 lift) による音質劣化が発生したため、 mp3 10 本を commit 7859573 (v1572 長い版 ひらがな) に rollback。 admin/index.html のシールちょうプリセット 漢字交じり化 + safety safe context (commit 8dbcb60) はそのまま維持 (admin での再生成時に使われる正しい設定)。 db7d9b0 のお題 + ガチャ鍵モード + どんぐりショップは無関係 (触っていない)。 mp3 sha256 は 7859573 時点と完全一致。 v1574 は欠番 (衝突回避) // v1572: シール帳 チュートリアル ナレーション 10 本 再生成 (TTS3.1 Flash Preview / Aoede / loudnorm I=-14) — 短い版だった旧 mp3 を「長い版」 (台本フル尺) に差し替え、 04「はれる」 / 10「シールちょう」 等の重要 yomi を whisper 検証で合格確認済 (LUFS -14.0〜-15.7 / dur 3.4〜11.1s)。 PROHIBITED_CONTENT ブロック回避のため CONTEXT を肯定形に reword (台本本文は無改変)。 assets/audio/stickerbook/tutorial/stickerbook_tut_{01..10}_*.mp3 が network-first cache 対象のため cache 無効化 // v1569: EMERGENCY revert — シール帳 undo/redo 関連 3 commit (ee64779 H1 修正 / cff25d5 sw v1568 / 4b30c15 undo 機能) を撤回。 App staging でシール帳本体ページが空表示になる事故のため、 安全な v1567 状態 (bbox sea-album 14% は維持) に戻して cache 無効化のため version bump // v1567: Revert 底部ナビ 4ボタン化 + おしらせボタン削除 — 5 ボタン bottom-nav + #newsModal を完全復元 (詳細は冒頭コメント参照) // v1566: daily-challenge / daily-quest-banner 完全 rollback // v1565: daily-challenge CANDIDATES を MVP 5 に縮小 // v1564: daily challenge + gacha 追加 (cross-review 反映、 詳細は冒頭コメント参照) // v1563: シール帳 チュートリアル ナレーション TTS3.1 (Gemini 3.1 Flash TTS Preview) で全 10 本再生成 + 台本ロールバック — v1559 で chirp3 誤読対策に書き換えた 「ぺたっと はろう」 / 「シールアルバム」 をユーザー指示で元の 「すきな ところに はろう」 / 「すきな シールちょうを つくろう」 に戻し、 TTS3.1 ネイティブで生成 (LP production worker /api/ai-tts 経由、 staging-app は GEMINI_API_KEY 未設定で chirp3 fallback してしまうため)。 04 「はろう」 だけ Gemini が英語 Hello で発音する誤読が出たため promptText を 「貼ろう」 漢字 + 「Pure Japanese narration」 に強化した variant4 を採用、 whisper small で 「好きなところに張ろう」 transcript 確認済。 10 本すべて loudnorm I=-14 LRA=11 TP=-1.5 適用 → 24kHz mono mp3 48kbps (既存形式と整合)。 main.js の STICKER_TUTORIAL_STEPS text 2 箇所も同時にロールバック (line 1625, 1697)
// v1560: シール 3D hit test (placementTextureBounds) を CSS .placed-sticker { clip-path: inset(5%) } と同期で 5% inset、 共通定数 STICKER_PLACEMENT_INSET=0.05 で管理。 これにより 3D 本のページ上での「カニ脇のもずく」 等の選択しづらさを解消 (前 v1558 では DOM 側のみ縮小、 3D 側が full bounds のままだった) + drawInlineStickerSelectionOverlay の点線セレクション枠も同期で縮小
// v1559: シール帳 チュートリアル ナレーション 3本 再生成 + 台本微調整 — tut_02 (find) は台本維持で再ロール、 tut_04 (place) 「はろう」 が HELLO 化する Chirp3-HD 誤読を回避するため 「ぺたっと はろう」 に変更 (オノマトペで pronunciation lock) + main.js text も追随、 tut_10 (final) 「シールちょう」 (帳/調 同音異義トラップ) を 「シールアルバム」 に言い換え (カタカナで明確化) + main.js text も追随。 faster-whisper small/medium で 3本とも transcript 一致確認済 (好きなシールを選ぼう / 好きなところにペタっと貼ろう / 好きなシールアルバムを作ろう)
// v1557: シール帳チュートリアル spotlight 反転 (背景 dim 撤廃 → 内側 radial-gradient 黄グロー + mix-blend-mode:screen)、 ハンドカーソル指先位置補正 (hand_point_left.png 計測値 fingertip=(1.3%, 32.4%) に合わせ transform Y -50% → -35%、 transform-origin 54%/58% → 50%/32%、 8 keyframes + slider-js steady-state 同期)
// v1556: お家の方へ タグライン 「つくっています」 → 「作っています」 漢字化、 注意文の 「詳しくはこちら」 リンクを改行 + 右端揃え (margin-left:auto + width:fit-content) でレイアウト整理
// v1555: お家の方へ タグライン (あんしん・あんぜん) を 15.5px → 19px max に拡大 (約 +20%)、 ホーム画面追加注意文も 12.5px → 14px max に拡大 + font-weight 500 + 濃いブラウン色で視認性向上
// v1554: お家の方へ タグラインを 「安心・安全」 → 「あんしん・あんぜん」 ひらがな化 (「ココが育つ！」 ステッカー alpha 透過版は素材未提供のため raw 版維持)
// v1552: お家の方へセクションに注意文 「ホーム画面に追加してからのご利用を推奨」 + 「詳しくはこちら →」 リンクを追加、 LP下部 .notice-card へ anchor scroll
// v1551: Bento book tier nori/furikake decoration assets.
// v1540: ゲーム詳細モーダル 「ここがそだつ」 パネルの枠囲い (border + background + radius) を解除し、 下端 dashed border のみで区切る形に変更
// v1537: ゲーム詳細モーダル スクロールチェーン修正 — .game-modal-body に overscroll-behavior:contain でモーダル内 scroll が背景 LP に伝播しないように、 body.modal-open{overflow:hidden;} も併用
// v1533: ゲーム詳細モーダル レイアウト再修正 — 画像 object-fit を contain → cover に戻す (v1532 の誤修正取り消し) + ヘッダー (60→40px) と CTA (40→36px) の高さを削減して中央スペースを拡大、 mobile での 1 画面表示時に画像が見やすく
// v1531: hero 匂わせ帯 2 行目 「遊べる」 → 「あそべる」 ひらがな化 + ゲーム詳細モーダルを 「画像+キャプション ×3」 の縦並びに再構成 (GAME_MODAL_DATA の scenes に caption フィールド追加、 旧 detail は削除、 モーダル JS/CSS を新構造対応)
// v1530: hero CTA 「すぐ あそぶ」 を中央固定 + 「推奨年齢 3〜6歳」 ラベルを button 右下のバッジ風に配置 — flex row 横並びから absolute 配置のバッジに変更、 button 位置のブレを解消、 ラベルは白半透明背景で視認性確保
// v1529: hero 匂わせ帯 文言更新 — 「無料で あそべるよ！」 → 「誰でも無料で遊べるよ！」 / 「えほんを よんで もっと たくさん あそべるように なろう」 → 「絵本を読めばもっとたくさん遊べるよ！」 (大幅漢字化+短縮、 「絵本」 オレンジ強調と 「もっとたくさん」 マーカーは維持)
// v1528: hero 推奨年齢ラベルを 「3〜6歳 向け」 → 「推奨年齢 3〜6歳」 に変更 (「向け」 削除、 「推奨年齢」 を頭に追加)
// v1527: hero 推奨年齢ラベルを 「3〜6さい むけ」 → 「3〜6歳 向け」 (漢字化) + 「すぐ あそぶ」 CTA の右隣に位置変更 (cta-wrap 内で横並び)
// v1526: play menu gacha entry aligned above book button, bottom nav wood tone softened
// v1524: hero 匂わせ帯の 3 ブロック順序変更 — 絵本リンクバナーを最下段に移動 (free → text → banner の順)
// v1521: hero 匂わせ帯の背景色を hero と統一 (黄色系) — 帯と hero CTA「すぐ あそぶ」 周辺が一体になって見えるよう調整、 3 ブロック構造と dashed border は維持
// v1520: hero 匂わせ帯を縦並び 3 ブロック化 — hero 内の .herob-free を削除し帯内に集約、 (1) 「むりょうで あそべるよ！」 太字 / (2) 絵本リンクバナー / (3) 「えほんを よんで…」 テキスト の順で配置、 上下 dashed border・クリーム背景は維持
// v1516: いろあそびラベル左切れ第2弾修正 — 前回 v1515 の transform-origin:right center は数学的に逆効果 (右軸で時計回り回転は左端を更に外側に押し出す) だったため、 transform-origin:left center に変更 (左軸からの距離 0 なので左端は x 方向に動かない)
// v1515: LP 微修正 — いろあそびラベルの左切れ解消 (transform-origin) / hero 匂わせ帯の重複削除&強調再調整 / ガチャ親向け 「むりょう」→「無料」 漢字化
// v1500: daily gacha に木の部屋の奥行き背景と Pono 開始ふきだしを追加
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

  // StickerBookThreeJS はプロトタイプ調整頻度が高く、古い main.js/CSS/JSON が残ると
  // 図鑑だけ空表示になるなどの検証事故につながるため、常にネットワーク優先で取り直す。
  if (event.request.url.includes('/Prototypes/StickerBookThreeJS/')) {
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
