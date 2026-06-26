// Service Worker for ポノのあそびば PWA
// Network-first + version-based cache busting

// v1626: タイトル画面の右下メニュー、えほんのあいことば、きょうのチャレンジを生成PNG土台へ差し替え。
// v1624: シール帳チュートリアル place step 2 件改善 — (1) tray scroll の base 位置を targetScroll より大きく左にプリセット (desiredTravel = min(maxScroll, max(700px, clientWidth*0.9))) し、 「右から大きく流れて蝶々で止まる」 演出に。 旧仕様は base = 現在の scrollLeft (通常 0) で、 蝶々が tray 前方にあると totalDistance ≒ 0-420px しかなく 「全然スライドしてない」 印象だった。 duration 4500ms 据置 = CSS keyframe 0-26% hand swipe 同期維持。 (2) open 切替 11300ms → 13350ms (75.85% = drop press) に遅延、 シール配置 11600ms → 13500ms (76.71%) に同期。 旧 open は hover 直前 (64.20%) で発火していたため、 hover→to の 1.50s 真下降下の最中に手だけ開く不整合 (「下がりながら手を開いてる」) が出ていた。 drop press と同期で 「ぐっ → 開く → release lift」 の自然な所作に整える。 Prototypes/StickerBookThreeJS/main.js のみ編集、 styles.css keyframe / ghost / 他 step (intro/mode/find/scale/rotate/ok/page/view/final) / grip 切替 8400ms / hand 消去・再出現 全て無改変。
// v1623: Donguri shop switches to twice-daily rotation with one guaranteed new slot and one reservation.
// v1622: Shop sign asset now has baked text; foreground counter regenerated lower and cuter.
// v1621: シール帳チュートリアル 5 件統合修正 — (1) find 冒頭 中央→左 ワープ解消 (styles.css L1885 30.5% → 32.5%、 88ms → 440ms slower)、 (2) ghost を hand と完全同期 (place phase 4 stop に per-stop animation-timing-function 追加、 styles.css L1991/1998/2005/2012)、 (3) hover→to 降下を速く (styles.css L1942/1998 56.5% → 64.5%、 hover→to 2.90s → 1.50s に短縮、 pickup→hover は逆に 1.03s → 2.44s 延長で「じっくり持っていく」 強化)、 (4) scale slider 指位置を thumb 追従化 (main.js L4543-4546 を rotate 分岐と同じ trackPad 補正パターン + 実 scale 値マッピングに置換、 commit 9a23803 で rotate のみ修正された差分を解消)、 (5) rotate slider 初期位置を value=0 thumb 中央 (50%) に補正 (main.js L4548-4555、 0.43/0.58 マジック数値を baseRotation/rightRotation 実値マッピングに置換)。 b3efa06 (slider transform)、 9a23803 (place 直行 + rotate 補正パターン)、 0bbd082 (find 2 回スワイプ)、 4189da8 (mode 3 連) の既存設計は全て温存。 アニメ duration 17.6s / 5.2s / 9.3s 不変、 keyframe stop 数 不変、 座標 CSS var 名 全て不変。 Prototypes/StickerBookThreeJS/styles.css + main.js のみ編集。
// v1620: タイトル画面の共通ボタンは今回押下表現なし。active の沈み込み・下ナビ pressed 状態を無効化。
// v1618: おみせのリス店員を大きい黒目版に変更し、前景テーブルをさらに下げ、こもれびや看板を濃い木彫り調へ差し替え。
// v1617: タイトル画面を2カラム整理。えほんのあいことば導線をロゴ下へ移動し、4項目メニューと設定内こうしん入口を追加。
// v1615: おみせの前景テーブルを下げ、リス店員を別ポーズに差し替えてテーブル背面レイヤーへ分離。
// v1614: おみせの「こうかんする」カード、リス店員の接地位置、こもれびや看板ロゴを調整。
// v1613: もりのおみせ こもれびや の吊り看板と「かう」押下カード素材を配信キャッシュへ反映。
// v1612: シール帳チュートリアル mode step の approach 中 hand 翻りを解消 (open のまま位置のみ移動、 press swap と同フレームで反転)。 find phase の grip 切替を 7000ms → 8400ms へ遅延し、 蝶々上で静止した直後に grip するよう調整。 Prototypes/StickerBookThreeJS/main.js + styles.css のみ編集。
// v1611: もりのおみせ こもれびや の吊り看板を生成・実装し、背景は外側いっぱい、操作UIは16:9 safe内へ分離。
// v1610: daily gacha frame is true 16:9, center message uses generated speech-window asset, and shop button icon/text balance is adjusted.
// v1609: シールのおみせの「かう」焼き込みカードに押下状態を追加し、pointer/keyboard 中だけ pressed 背景へ切替。
// v1608: シールのおみせを16:9ステージに固定し、生成UI画像を縦横比維持で表示。商品画像の切れ、価格位置、かう文字焼き込みカードを調整。
// v1607: シールのおみせ UI を生成素材の背景/カウンター/リス店員/商品カードへ差し替え、商品イラストを大きめに見せるレイアウトへ更新。
// v1606: daily gacha shop button uses single-color icon style matching top/sticker buttons; sync play.html PAGE_CACHE_VERSION.
// v1603: シール帳チュートリアル place step 自然化 — find phase の micro-vibration を廃止し、3 つのシールを左→中央→右→選択の短い滞在で見比べる動きへ変更。place phase は右ページ内に中継点を clamp し、画面外・反対方向へ飛ぶ大振りをやめて、貼る位置の近くで小さく迷ってから release する流れに変更。Prototypes/StickerBookThreeJS/main.js + styles.css のみ編集。
// v1601: シール帳 step 1 (mode) 「open のまま押している」 バグ修正 — (A) updateStickerTutorialDemo の hand リセット条件を強化: 旧仕様は `step?.id === "mode" ? "open" : handKey` で mode step である限り、 Phase 2 (press) 開始後も scheduleStickerTutorialLayout() が呼ばれるたびに hand を open に再上書きしていた。 新仕様は body classList の `is-sticker-tutorial-mode-rest` / `is-sticker-tutorial-mode-approach` を gate に追加し、 Phase 2 以降は step.hand="point" を尊重するように修正。 (B) startStickerTutorialModeDemo の 3 回の press タイマーで、 triggerStickerTutorialEditButtonPress 呼び出し直前に setStickerTutorialHandKey("point") を再保証 (補強案)、 タイミング上書きへの defensive layer を追加。 Prototypes/StickerBookThreeJS/main.js のみ変更、 styles.css / keyframe / 他 step / 他 hand 切替ロジック 全て無改変。
// v1600: シール帳チュートリアル find phase 2 回スワイプ完全復活 — @keyframes stickerTutorialFindPlaceHand 0-30% を 6 stop (0/12/13/14.5/15.5/26/27/29/30 の 9 stop) に再構成。 v1598/v1599 で 2 回目スワイプを削除した結果、 12.6-26% (約 2.36s) hand 完全不在になり 「2 回目が消えた + 消してほしい区間が空白で残った」 ユーザー指摘を解消。 新仕様: 0-12% 1 回目スワイプ (scroll-from→scroll-to) → 13% fade out → 14.5% scroll-from へ不可視ワープ → 15.5% fade in → 15.5-26% 2 回目スワイプ → 27% fade out → 29% demo-from 座標 + 縦向き transform へ不可視ワープ → 30% find phase 開始 fade in (次 30.5% findWander1 へ連続)。 30% 以降の find phase / 50% 以降の place phase は完全据置。 アニメ全体 17.6s 維持、 sw.js のみ version bump。 Prototypes/StickerBookThreeJS/styles.css 1855-1925 のみ編集、 main.js / ghost keyframe / 他ファイル無変更。
// v1598: daily gacha fixed action buttons + refreshed generated UI assets — play.html のガチャ内 `トップ`/`おみせ` を左上固定横並びに整理し、今日のチャレンジをガチャ導線と同じ金縁プレート画像 `assets/ui/daily_challenge_banner_gacha_style_20260625.png` に差し替え。おみせボタンもトップボタンの木枠/紙面質感に寄せた GPT Image 2 生成版 `assets/ui/daily_gacha_shop_button_acorn_v2_20260625.png` へ更新、旧右側逃がし CSS を削除。
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
// v1616: シール帳チュートリアル hand 動き 3 件改修 — find 中継 12→6 拍 (2.0x slower) + place 座標 viewport clamp (wanderSpan 0.32→0.22 + wander1 係数 1.40→0.95) + segment 別 cubic-bezier で「機械的」 解消
// v1619: シール帳チュートリアル 5 件一括改修 — place 直行 (wander 全廃, source→hover→drop 3 stop, rotate 0deg 固定) + rotate hand 位置補正 (rect 内 43→58%) + ok 押下後 tray 隠蔽 (:not(.is-sticker-tutorial-step-ok)) + page step hand 廃止 (矢印パルス + 自動 click) + 起動直後 markStickerTutorialSeen で再訪自動再生防止
// v1625: シール帳チュートリアル 3 件修正 — (1) scale demo を scale 値→thumb fraction 直マッピングに置換、 thumb 半径 8px 補正で起動瞬間 ~10% ズレ + settle phase 不整合を構造的に解消 (2) rotate demo を rotation 値→thumb fraction 直マッピングに置換、 right→left phase で hand が thumb を 14% 取り残す問題を解消 (3) OK ボタン押下動作実装 (triggerStickerTutorialOkButtonPress + .inline-sticker-ok.is-tutorial-pressing で押下風 translateY+scale+黄リング glow) + OK click 後の黄枠ページ飛び解消 (stickerTutorialLastOkRect cache)
// v1627: StickerBookThreeJS BGM 実装 — assets/audio/stickerbook/bgm/sticker-album-morning.mp3 (44.1kHz/128kbps/stereo/loudnorm I=-19, 100.6s loop) を Prototypes/StickerBookThreeJS/main.js から loop 再生。 pono_bgm_enabled 共有キー、 base 0.28 / duck 0.08、 user gesture unlock + visibilitychange pause/resume + tutorial narration ducking。 BGM パス /assets/audio/stickerbook/bgm/ も既存 BGM と同じく cache:'no-store' で fresh fetch しつつ SW cache をオフライン用に維持。
// v1628: シール帳チュートリアル 3 件修正 — (1) place step drop timing 短縮 (CSS keyframe hover→drop を 64.5/73/75.85/79/82.15% → 61/66/69.32/72.5/75.5% に圧縮、 ghost も同期、 JS open timer 13350→12200ms / addSticker timer 13500→12350ms に同期、 「シール置く瞬間」 を約 1.15s 前倒し)。 (2) ok step 「指で押されてない」 解消 (旧 stickerTutorialTap 1.35s infinite = ボタン右隣で「呼吸」 するだけだった keyframe を廃止、 stickerTutorialOkPressDemo 3.0s 1 回 = rest→OK center 押下→lift→rest の所作に置換、 stickerTutorialDemoPoints の "ok" 分岐で from=右隣 rest と to=center press を分離、 startStickerTutorialOkDemo の triggerStickerTutorialOkButtonPress 発火を 3150ms → 1560ms に前倒しして keyframe 押下 52% と同期)。 (3) page step spotlight 「一瞬下にずれる」 解消 (showStickerTutorialStep で spotlight.hidden=false の前に updateStickerTutorialLayout を同期 1 回実行、 CSS 変数を新 step rect に確定させてから visible 化、 旧仕様は前 step の OK ボタン rect が CSS 変数に残ったまま 1 フレーム描画 → rAF 内 layout 更新で矢印位置に snap する race condition)。 Prototypes/StickerBookThreeJS/main.js + styles.css のみ編集、 page step DOM / mode/find/scale/rotate/view/final step 全て無改変。
// v1629: シール帳チュートリアル 3 件 思い切った再設計 (af35de7/v1628 後ユーザー「scroll もっと / drop もっと早く / spotlight 相変わらず」 3 連続不満) — (1) tray scroll 距離 強気拡大 (desiredTravel = max(2400, viewport*3.0, targetScroll)、 旧 max(1100, viewport*1.4) から約 2x+。 viewport 約 3 個分流れる体感、 蝶々が tray 後方にあれば targetScroll そのもの (= tray 先頭から流れる) を許容)。 (2) drop 動作 最小化 (CSS keyframe hover→drop を 61/66/69.32/72.5/75.5% → 61/63/63.5/64.5/67.5% に再圧縮、 hover→to を 5pp(880ms)→2pp(352ms) で「シュッと真下」、 to→drop を 3.32pp(584ms)→0.5pp(88ms) で「静止 = 同時にぐっ」、 ghost も同期、 JS open timer 12200→11176ms / addSticker timer 12350→11200ms に同期し +150ms オフセット → +24ms に短縮 = 「手が静止 = パッと離す = 同時にシールが貼られる」 体感を実現)。 (3) page step spotlight 「一瞬下にずれる」 真因解消 (旧 v1628 は親 stickerTutorial に CSS 変数を書くだけだったため iOS Safari の inherited cascade 遅延で 1 frame stale paint が残存。 updateStickerTutorialLayout で 子 stickerTutorialSpotlight 自身にも同じ inline 変数を複写 + hidden=false 直前に void offsetWidth で強制 reflow = 三重防護で完全解消)。 Prototypes/StickerBookThreeJS/main.js + styles.css のみ編集、 全 step keyframe/DOM/他機能 無改変、 過去 commit 影響なし。
// v1631: シールのおみせ残高バッジを切れていた枠からCSS枠+透過どんぐりアイコンへ変更、吹き出し余白とカウンター拡大率を調整。play.html PAGE_CACHE_VERSION と同期。
// v1632: シール帳チュートリアル 3 件改修 — (1) テキスト UI を旧 PNG 吹き出し (daily_gacha_start_panel_pono_fixed.png 焼き込みポノ顔+茶フレーム) からノート左ページ rect 直書き chip に置換。 .sticker-tutorial-page-text を新規追加し JS が projectedMeshClientRect(leftPageInner) を毎フレーム CSS 変数 (--tutorial-leftpage-x/y/w/h) に注入、 Three.js mesh に追従する半透明便箋風枠でテキストを表示。 操作ボタン (あとで/もういちど/つぎ) は画面下端中央 (safe-area+16px) 固定で誤タップ防止 + min-width 78/86px に維持。 旧 PNG モード CSS は無傷保持し is-page-inscribed クラスで切替。 (2) OK ボタン押下位置補正 — press.y を rect.center.y → rect.top + rect.height * 0.30 に修正 (rect は expandedElementRect padding=12 で上下に膨張するため center は実 button 中心より低く出ていた) + stickerTutorialOkPressDemo keyframe 52% の translate Y を -28% → -38% に緩和 (48% -42% との差分が 14pp→4pp になり「3-4px だけ控えめに沈み込む」 自然な押下、 button 下端めり込みを排除)。 (3) 矢印スポットライト位置ずれ解消 — bookNextPage 本体の stickerTutorialArrowPulse (scale 1↔1.12) を完全停止 (animation: none !important / transform: none !important)。 真因は getBoundingClientRect が CSS transform を含むため pulse 進行中フレームで rect が 12% 拡縮し、 viewport 右端固定 (right:16px) のため右側だけ Math.min(window.innerWidth, ...) でクランプされ centerX が左に偏る非対称クランプ + showStickerTutorialStep の 3 回 (即時/180ms/720ms) 再サンプルで毎回違う rect が確定する race。 呼吸演出は ::after pseudo-element の stickerTutorialArrowHalo (pseudo は親 rect に影響しない) で完結維持。 Prototypes/StickerBookThreeJS/index.html + main.js + styles.css のみ編集、 過去 commit (af35de7/5471ed7/72f6c77) の page step spotlight cache / OK 押下発火 / drop timing は無改変で干渉なし。
// v1633: シール帳 正本統一 — 全 grant 動線 (clear/shop/daily gacha からの「ペタッとはる」 toast) を 2D 版 (sticker-book/index.html) から 3D 版 (Prototypes/StickerBookThreeJS) へ完全移行。 js/game-stickers.js:361 を 1 行修正し toast 押下後の遷移先を 3D book に統一、 result.gameId / result.stickerId / result.first を URL query (game=, pasteId=, firstEver=) として渡す。 3D book main.js は requestedGameId/requestedPasteStickerId/requestedFirstEver を受け取り、 applyStickerEntryQueryNavigation() で該当ページへ auto-open (pasteId 優先 > game)、 editor game filter も同 gameId に自動セットしてトレイ内で見つけやすくする。 buildEditorPageDefinitions() を catalog ベースに拡張し page→gameId マップを確立 (STICKER_ALBUM_PAGE_COUNT 固定長維持で既存 editorState.pages の page-keyed 保存位置を保護)。 firstEver=1 のときは新 #stickerFirstEverWelcome overlay (index.html 末尾 + styles.css 末尾) を表示 → tap → startStickerTutorial({manual:true}) でチュートリアル強制起動 (tutorial と二重表示しない排他制御)。 syncUrl() で firstEver/game/pasteId を next.delete し URL 汚染防止。 sticker-book/index.html は 41 KB の 2D Canvas 版から meta refresh + location.replace 短縮版に置換、 既存ブックマーク/PWA SW キャッシュ持ち端末も自動で 3D book に転送。 既存 grant callsite 12 箇所 (maze/quizland/oto/puzzle/bento/starparodier/undersea-cave/sea-album + donguri-shop + play.html daily gacha) は中央集約済 (game-stickers.js 経由) のため一切触らず 1 行修正で全動線追従、 PonoTier propagation 反省 [[feedback_ponotier_propagation]] を踏まえ全件 grep で確認済。 bento の pendingStickerGrant 仕様 (immediate:true onClose:finish) も遷移先変更のみで onClose は不変。 play.html PAGE_CACHE_VERSION と同期。
// v1634: シールのおみせ価格を rarity 別 15/25/35 へ変更し、取り置き中の1枚を左下の小枠へ分離。残高どんぐり縮小、吹き出し上寄せも play.html と同期。
// v1635: シール帳チュートリアル target を ?pasteId で動的化。 grant 動線 (clear/shop/daily gacha) から渡された pasteId が catalog に存在する場合、 demo 配置 sticker / hand point 照準先 tray button / silhouette 強調 main の全てを pasteId 指定 sticker に切り替え。 pasteId 未指定 or catalog 未マッチ時は既存 fallback chain (STICKER_TUTORIAL_PICK_STICKER_IDS 蝶々群 → 蝶々 regex → stickerOptions[0]) を完全温存で 100% 互換。 単一窓口 stickerTutorialPickSticker() に 1 箇所 hook (+7 行) するだけで demo 配置・hand point・silhouette・assetUrl 全て自動連動 (他箇所 zero touch)。 applyStickerEntryQueryNavigation() (page 移動 / filter 切替) は 4ad74da 既実装で温存、 syncUrl() の URL 衛生 (pasteId 起動後削除) も無改変。 Prototypes/StickerBookThreeJS/main.js のみ編集。
// v1636: シール帳 チュートリアル: target ±2 の未取得 SR (rarity==="super") を silhouette 化。 stickerOptions に既 load 済の rarity フィールドを参照、 owned 判定は window.PonoGameStickers.getOwned() 優先 + localStorage("pono_game_stickers_v1") fallback (両 shape 吸収)。 近傍 ±2 は collectionStickerTrayItems の DOM index 基準 (sort/filter 起因のズレ回避、 既存 stickerTutorialPickActiveStickers と同方式)。 target 自身は CSS で強制解除 (filter:none)、 取得済み SR は除外、 SR 不在時は何も変化しない。 既存 body.is-sticker-tutorial-tray-silhouette / .is-tutorial-target-sticker と完全独立 (新規 class .is-rarity-super-silhouette を per-card add/remove のみ、 body class 不要)。 呼び出し箇所は updateStickerTutorialTraySilhouettes と同パターン 8 箇所 (cleanup/abort/showStep/place/redraw)。 Prototypes/StickerBookThreeJS/main.js + styles.css のみ編集。
// v1637: シール帳 チュートリアル: 全 step を「ポノが見せる (demo) → 子供がやる (try) → 「つぎ」 (complete)」 の 2 段階モーダル化。 STICKER_TUTORIAL_STEPS に textDemo/textTry/tryMaxMs を追加し phase 状態機械 (demo / try / complete) を導入。 mode/place/move/scale/rotate/ok/page/view step の自動 click / 自動配置 / 自動値書換を全削除し、 hand cursor とジェスチャだけ見せて実操作は子供に委ねる。 move/scale/rotate demo は終了時に元値へ revert (「ポノが触ったあと」 を残さない)。 demo 中の「やってみる」 早押しボタン (#stickerTutorialDemoDo) と try 中 3 失敗 or 30s 経過で出る「とばす」 ボタン (#stickerTutorialStepSkip) を新設、 STICKER_TUTORIAL_STEP_WRONG_ACTIONS で step 別の誤操作カウンタを定義。 旧 15s セーフティ自動 advance を削除し操作主導に統一、 phase ゲートで demo 中の advanceOn notify を無視 (先回り正解を防止)。 「もういちど」 は complete 状態からも demo に戻して再演示可能 (failCount/skipShown もリセット)。 intro / final step は textTry を省略し旧来挙動を維持。 CSS は body.is-sticker-tutorial-phase-* で hand 表示 + spotlight pulse を切替、 stickerTutorialSpotlightTryPulse keyframe を新規追加。 Prototypes/StickerBookThreeJS/main.js + index.html + styles.css のみ編集、 audio/CACHE は本 sw.js のみバンプ。
// v1638: タイトル画面の右下メニュー押下をフル生成画像差し替えへ戻し、ゲーム一覧の縦ループスクロールとおべんとうカード表示を復元。
const CACHE_VERSION = 1638;
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
      || event.request.url.includes('/assets/audio/stickerbook/bgm/')
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
