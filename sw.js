// Service Worker for ポノのあそびば PWA
// Network-first + version-based cache busting
// v2084: Bento Kitchen の包丁効果線を実際の位置・サイズ・振り下ろし量へ追従させ、線の長さ/太さ/間隔/タイミングを不均一化。play.html PAGE_CACHE_VERSION と同期。
// v2083: App タイトルのなぞなぞトレイン / クッキング / もじっこファームを専用の既存素材へ差し替え。native manifest に 3 ゲームの本体・必要素材・クッキング thumb を同梱。play.html PAGE_CACHE_VERSION と同期。
// v2082: 未ローンチ2ゲーム (トントンキッチン/もじっこファーム) に直URLロック追加 (app tier のみ通過)。play.html PAGE_CACHE_VERSION と同期。
// v2081: App build のタイトルメニューに「なぞなぞトレイン / クッキング / もじっこファーム」を通常カードで追加。LP free/book は公開済み 5 本のみを維持。play.html PAGE_CACHE_VERSION と同期。
// v2080: tier 名 'sub'→'app' 純リネーム (batch:1216, tier.js/play.html/game-stickers.js+json/bento/quizland/puzzle/5ゲームガード)。json と js/game-stickers.js は fail-open のため新旧混在キャッシュを防ぐ bump 必須。play.html PAGE_CACHE_VERSION と同期。
// v2079: sub専用5ゲーム (mojicrane/nazonazo/starparodier/undersea-cave/sea-album) に tier ガード追加 + プロフィール「あとで」導線 + アプリ告知文実数修正。play.html PAGE_CACHE_VERSION と同期。
// v2078: Maze の9種類のミニゲームへ専用BGMを追加し、探索曲への復帰・音量補正・ナレーション中のダッキングを実装。play.html PAGE_CACHE_VERSION と同期。
// v2077: OtoTouch「いろおと」の縦画面HUDと横画面の見た目切替を再配置し、通常8ボタンとの重なりを解消。play.html PAGE_CACHE_VERSION と同期。
// v2076: OtoTouch「いろおと」を通常のボタン自由モード＋波紋/キラキラ＋細い明色トゥーン流体へ再構成。暗色filter/黒太縁を撤去。play.html PAGE_CACHE_VERSION と同期。
// v2075: OtoTouch「いろおと」の縦横比追従、WebGL復旧待ち、GPU再確保の安全化、高速スワイプ音列を仕上げ。play.html PAGE_CACHE_VERSION と同期。
// v2074: アプリ版 OtoTouch に、圧力投影つき WebGL2 流体をトゥーン描画する第3の自由モード「いろおと」を追加。既存2モードと本版は変更なし。play.html PAGE_CACHE_VERSION と同期。
// v2073: 全体パフォーマンス改善 (OP前ゲーム画面フラッシュ修正 quizland/maze/bento/oto/puzzle、タイトルFOUCガード修正、隠しモーダル画像の遅延化、preload=none化、WebP一括変換 quizland illust/zukan/oto/bento、SWキャッシュ戦略修正 no-store→cache-first/no-cache、precache copy-forward、nav strip lossy再エンコード)。play.html PAGE_CACHE_VERSION と同期。
// ── changelog アーカイブ ──
// v2070 以前の changelog は docs/sw-changelog-archive.md へ移動した (最終移設 2026-07-11)。
// sw.js が ~318KB (約 93% が changelog コメント) に肥大し、 毎ロード + 5分毎の
// update poll で再ダウンロードされていたため。 docs/ は .assetsignore で deploy 除外。
// 新しいエントリは従来どおりこのファイル先頭 (L3、 newest-first) へ追記し、
// 古いエントリ (目安: 最新 ~10 件超過分) は docs/sw-changelog-archive.md 先頭へ退避すること。
const CACHE_VERSION = 2084;
const CACHE_NAME = 'pono-v' + CACHE_VERSION;
// CACHE_VERSION bump 規約: sw.js / CRITICAL_ASSETS 配下 / play.html (PAGE_CACHE_VERSION) を
// 編集したら必ず +1 して deploy する。orchestrator が最後にバンプする運用 (CLAUDE.md 参照)。

// ── Critical asset precache list ──
// 目的: SW 更新後の完全コールドスタートを避け、 install 時にファーストビュー必須資産を
// 一括で取得しキャッシュへ載せる。 加えて fetch handler を cache-first に倒して
// 同一セッション内の HTTP 往復を排除する。
//
// 選定指針 (タスク提案 #2):
// - common/ 配下の必須 JS (sw-update.js, tier dispatcher, capture, acorns, data-export,
//   debug-mode, mvp-flags) + play.html が <script src> で読む js/ 3 本
// - カードサムネ thumb_*.webp 8 枚 (play.html L37-42 + bento/kitchen の予備)
// - メニューカード台座 menu_card_base_*.webp 4 枚 + paper_mask_*.png 4 枚 (タイトル4枚カード必須)
// - 任意: 主要 webp 系のみ。 bottom-nav PNG 5 枚 (合計 ~9MB) は <link rel=preload> で
//   ブラウザ HTTP cache に乗るため、 ここでは意図的に外す (precache 2MB 制約)。
//
// 注: fetch handler は isHTML なリクエストを SW 素通し (return;) しているため、
// HTML は precache しても navigation で使われない。 旧 CRITICAL_ASSETS_HTML
// (play.html / quizland/index.html / survey.html ≈ 1.16MB) は install ごとの
// 死荷重だったため 2026-07-10 に撤去 (HTML の鮮度は worker 側 no-cache 配信で担保)。
const CRITICAL_ASSETS_SCRIPTS = [
  '/common/sw-update.js',
  // v1944 (cross-file H5): preload-helper.js は BGM/SE 復帰の中核 (PonoVisibilityAudioGuard /
  // guardedPlay / statechange auto-resume) を担うため precache 対象に載せる。
  // CACHE_VERSION bump 時に確実に新版を配信 (network-first 頼みだと旧 SW キャッシュ + Cache-Control
  // で数分〜数時間の遅延あり → 実機検証で false negative になる)。
  '/common/preload-helper.js',
  '/common/debug-mode.js',
  '/common/debug-features.js',
  '/common/capture.js',
  '/common/tier.js',
  '/common/difficulty.js',
  '/common/acorns.js',
  '/common/data-export.js',
  '/common/mvp-flags.js',
  '/common/acorn-modal-shared.css',
  '/common/acorn-modal.js',
  '/common/acorn-audio.js',
  '/common/acorn-copy.json',
  // v1718: ごかんそう (rating) — 別エージェント並列作成中。 未配備でも precache は asset 単位
  // try/catch でラップされる (precacheAssetGroup の allSettled gate) ため install 失敗にならない。
  '/common/rating-modal.js',
  '/common/rating-modal.css',
  '/js/game-stickers.js',
  '/js/daily-quest.js',
  '/js/donguri-shop.js',
  // 2026-07-10: PIXI 7 を CDN から common/vendor/ へローカル化 (aquarium/ + egg/ が同一
  // オリジンで読む)。 オフラインでも両ゲームが起動できるよう precache に載せる (~456KB)。
  '/common/vendor/pixi7.min.js',
  // v1745: AcornModal default SE (祝祭ジングル 1.20s)。 既存 don.mp3 と並列で precache。
  '/assets/audio/sfx/acorn/acorn_get_festive_20260628.mp3',
];
const CRITICAL_ASSETS_IMAGES = [
  // v1718: ごかんそう (rating) — PNG asset; CRITICAL_ASSETS_SCRIPTS から分離 (semantic 整理)。
  // v1750: 焼き込み済み 木枠アイコン (通常 + 押下) に差し替え。 :active で pressed 版へ即時切替するため
  //        両方を precache し初回 tap の網経路遅延を防ぐ。
  '/assets/ui/icon_feedback_20260628.png',
  '/assets/ui/icon_feedback_20260628_pressed.png',
  // 2026-07-10: 旧 512px 版 (icon_feedback_20260628_512 / _pressed_512, 計 ~866KB) は
  // どのページからも参照されない死に precache だったため撤去 (repo 全域 grep で参照ゼロを確認)。
  // v2008: 右下ナビの一体型 GPT Image 2 生成ボタン。初回表示と押下時のちらつきを避けるため通常/押下を同時に precache。
  // 2026-07-10: lossless (~933KB/枚) → lossy q85 (~120KB/枚) へ再エンコード。 寸法 1536x492 同一、
  // 差し替え規約に従い新ファイル名 (_20260710)。
  '/assets/ui/bottom-nav/nav_group_3_joined_normal_20260710.webp',
  '/assets/ui/bottom-nav/nav_group_3_joined_pressed_feedback_20260710.webp',
  '/assets/ui/bottom-nav/nav_group_3_joined_pressed_news_20260710.webp',
  '/assets/ui/bottom-nav/nav_group_3_joined_pressed_settings_20260710.webp',
  '/assets/ui/bottom-nav/profile_wallet_frame_wide_20260708.webp',
  // v1979: GPT Image 2 生成の全身アバター用パーツマスク。プロフィールボタンが初期表示に入るため先読み対象。
  '/assets/images/avatars/parts/avatar_part_head_20260705.png',
  '/assets/images/avatars/parts/avatar_part_hair_short_20260705.png',
  '/assets/images/avatars/parts/avatar_part_hair_long_20260705.png',
  '/assets/images/avatars/parts/avatar_part_hair_spike_20260705.png',
  '/assets/images/avatars/parts/avatar_part_ears_animal_20260705.png',
  '/assets/images/avatars/parts/avatar_part_outfit_tee_20260705.png',
  '/assets/images/avatars/parts/avatar_part_outfit_dress_20260705.png',
  '/assets/images/avatars/parts/avatar_part_outfit_overall_20260705.png',
  '/assets/images/avatars/parts/avatar_part_bottom_pants_20260705.png',
  '/assets/images/avatars/parts/avatar_part_bottom_skirt_20260705.png',
  '/assets/images/avatars/parts/avatar_part_shoes_20260705.png',
  '/assets/images/avatars/parts/avatar_part_boots_20260705.png',
  '/assets/images/avatars/parts/avatar_part_tail_fluffy_20260705.png',
  '/assets/images/avatars/parts/avatar_part_tail_long_20260705.png',
  '/assets/images/avatars/parts/avatar_part_eyes_dot_20260705.png',
  '/assets/images/avatars/parts/avatar_part_eyes_smile_20260705.png',
  '/assets/images/avatars/parts/avatar_part_eyes_star_20260705.png',
  '/assets/images/avatars/parts/avatar_part_eyes_sleepy_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mouth_smile_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mouth_open_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mouth_flat_20260705.png',
  '/assets/images/avatars/parts/avatar_part_nose_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mark_leaf_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mark_dot_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mark_ribbon_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mark_star_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mark_square_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mark_heart_20260705.png',
  '/assets/images/avatars/parts/avatar_part_cheeks_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mark_sparkle_20260705.png',
  // v1980: GPT Image 2 生成の体型ベースと追加パーツ。体型選択を含むプロフィール初回表示用。
  '/assets/images/avatars/parts/avatar_bodytype_balanced_20260706.png',
  '/assets/images/avatars/parts/avatar_bodytype_small_20260706.png',
  '/assets/images/avatars/parts/avatar_bodytype_round_20260706.png',
  '/assets/images/avatars/parts/avatar_bodytype_tall_20260706.png',
  '/assets/images/avatars/parts/avatar_bodytype_robot_20260706.png',
  '/assets/images/avatars/parts/avatar_bodytype_monster_20260706.png',
  '/assets/images/avatars/parts/avatar_part_hair_round_20260706.png',
  '/assets/images/avatars/parts/avatar_part_hair_side_20260706.png',
  '/assets/images/avatars/parts/avatar_part_hair_cap_20260706.png',
  '/assets/images/avatars/parts/avatar_part_ears_fox_20260706.png',
  '/assets/images/avatars/parts/avatar_part_ears_cat_20260706.png',
  '/assets/images/avatars/parts/avatar_part_ears_rabbit_20260706.png',
  '/assets/images/avatars/parts/avatar_part_ears_bear_20260706.png',
  '/assets/images/avatars/parts/avatar_part_arms_skin_20260706.png',
  '/assets/images/avatars/parts/avatar_part_outfit_hoodie_20260706.png',
  '/assets/images/avatars/parts/avatar_part_bottom_shorts_20260706.png',
  '/assets/images/avatars/parts/avatar_part_feet_bare_20260706.png',
  '/assets/images/avatars/parts/avatar_part_tail_round_20260706.png',
  '/assets/images/avatars/parts/avatar_part_nose_small_20260706.png',
  '/assets/images/avatars/parts/avatar_part_cheeks_pair_20260706.png',
  '/assets/images/avatars/parts/avatar_part_mark_ribbon_side_20260706.png',
  '/assets/images/avatars/parts/avatar_part_mark_sparkle_tiny_20260706.png',
  // v1989: GPT Image 2 生成の全身完成品40体WebP。プロフィールは完成品を選ぶ方式のまま運用する。
  '/assets/images/avatars/avatar_pono_kko_20260706.webp',
  '/assets/images/avatars/avatar_leaf_kko_20260706.webp',
  '/assets/images/avatars/avatar_sky_kko_20260706.webp',
  '/assets/images/avatars/avatar_berry_kko_20260706.webp',
  '/assets/images/avatars/avatar_acorn_kko_20260706.webp',
  '/assets/images/avatars/avatar_umi_kko_20260706.webp',
  '/assets/images/avatars/avatar_yuki_kko_20260706.webp',
  '/assets/images/avatars/avatar_hoshi_kko_20260706.webp',
  '/assets/images/avatars/avatar_hana_kko_20260706.webp',
  '/assets/images/avatars/avatar_niji_kko_20260706.webp',
  '/assets/images/avatars/avatar_kinoko_kko_20260706.webp',
  '/assets/images/avatars/avatar_lantern_kko_20260706.webp',
  '/assets/images/avatars/avatar_tsuki_kko_20260706.webp',
  '/assets/images/avatars/avatar_mori_kko_20260706.webp',
  '/assets/images/avatars/avatar_pudding_kko_20260706.webp',
  '/assets/images/avatars/avatar_oto_kko_20260706.webp',
  '/assets/images/avatars/avatar_hon_kko_20260706.webp',
  '/assets/images/avatars/avatar_puzzle_kko_20260706.webp',
  '/assets/images/avatars/avatar_garden_kko_20260706.webp',
  '/assets/images/avatars/avatar_cocoa_kko_20260706.webp',
  '/assets/images/avatars/avatar_fox_20260706.webp',
  '/assets/images/avatars/avatar_rabbit_20260706.webp',
  '/assets/images/avatars/avatar_bear_20260706.webp',
  '/assets/images/avatars/avatar_cat_20260706.webp',
  '/assets/images/avatars/avatar_squirrel_20260706.webp',
  '/assets/images/avatars/avatar_owl_20260706.webp',
  '/assets/images/avatars/avatar_tanuki_20260706.webp',
  '/assets/images/avatars/avatar_polar_20260706.webp',
  '/assets/images/avatars/avatar_robot_blue_20260706.webp',
  '/assets/images/avatars/avatar_robot_yellow_20260706.webp',
  '/assets/images/avatars/avatar_star_mon_20260706.webp',
  '/assets/images/avatars/avatar_leaf_mon_20260706.webp',
  '/assets/images/avatars/avatar_moko_mon_20260706.webp',
  '/assets/images/avatars/avatar_water_20260706.webp',
  '/assets/images/avatars/avatar_snow_20260706.webp',
  '/assets/images/avatars/avatar_mushroom_20260706.webp',
  '/assets/images/avatars/avatar_acorn_20260706.webp',
  '/assets/images/avatars/avatar_lantern_20260706.webp',
  '/assets/images/avatars/avatar_moon_20260706.webp',
  '/assets/images/avatars/avatar_puka_mon_20260706.webp',
  // v1949: peek 層の bg 8 種 (menu カード裏の絵本タイトル背景)。 cold start で
  // is-overlay-active が付いた瞬間に on-demand decode されると 100-500ms 透明/低解像
  // になり iPhone のゆっくりドラッグ中に flicker 源となるため precache 化。
  '/assets/ui/play_quizland_title_back.webp',
  '/assets/ui/play_quiz_sound_title_back.webp',
  '/assets/ui/play_wordmatch_title_back.webp',
  '/assets/ui/play_maze_title_back.webp',
  '/assets/ui/play_oto_title_back.webp',
  '/assets/ui/play_bento_title_back.webp',
  '/assets/ui/play_puzzle_title_back.webp',
  '/assets/ui/play_starparodier_title_back.webp',
  // v2030: monster-math Phase R3 (tenmegane/kakuren モードへ全面差替)。 pucchi/pakun/gaburu
  // 系立ち絵・シール・title_trio を全撤去、 新モンスター立ち絵6枚+シール4枚+title_v2_composite+hat_star
  // を precache 追加 (計12枚)。 PNG 版 (fallback 用) は精査済みで容量節約のため precache 対象外。
  '/monster-math/assets/bg_shokudo.webp',
  '/monster-math/assets/monster_tenmegane_idle.webp',
  '/monster-math/assets/monster_tenmegane_mouth_open.webp',
  '/monster-math/assets/monster_tenmegane_happy.webp',
  '/monster-math/assets/monster_kakuren_idle.webp',
  '/monster-math/assets/monster_kakuren_peek.webp',
  '/monster-math/assets/monster_kakuren_happy.webp',
  '/monster-math/assets/sticker_mm_tenmegane.webp',
  '/monster-math/assets/sticker_mm_kakuren.webp',
  '/monster-math/assets/sticker_mm_both_modes.webp',
  '/monster-math/assets/sticker_mm_perfect.webp',
  '/monster-math/assets/title_v2_composite.webp',
  '/monster-math/assets/hat_star.webp',
  '/monster-math/assets/ui_blackboard.webp',
  '/monster-math/assets/ui_counter_frame.webp',
];
const CRITICAL_ASSETS_THUMBS = [
  '/assets/ui/thumb_quizland_owl.webp',
  '/assets/ui/thumb_quiz-sound.webp',
  '/assets/ui/thumb_oto.webp',
  '/assets/ui/thumb_bento.webp',
  '/assets/ui/thumb_puzzle.webp',
  '/assets/ui/thumb_wordmatch.webp',
  '/assets/ui/thumb_starparodier.webp',
  '/assets/ui/thumb_maze.webp',
  '/assets/ui/thumb_kitchen.webp',
];
const CRITICAL_ASSETS_CARDS = [
  '/assets/ui/menu_card_base_01.webp',
  '/assets/ui/menu_card_base_02.webp',
  '/assets/ui/menu_card_base_03.webp',
  '/assets/ui/menu_card_base_04.webp',
  '/assets/ui/menu_card_paper_mask_01.png',
  '/assets/ui/menu_card_paper_mask_02.png',
  '/assets/ui/menu_card_paper_mask_03.png',
  '/assets/ui/menu_card_paper_mask_04.png',
  '/assets/ui/menu_card_coming_soon_banner_20260708.webp',
];

// precache をグループに分割: 1 グループ全失敗しても他は通る (allSettled)。
const CRITICAL_ASSET_GROUPS = [
  CRITICAL_ASSETS_SCRIPTS,
  CRITICAL_ASSETS_THUMBS,
  CRITICAL_ASSETS_CARDS,
  CRITICAL_ASSETS_IMAGES,
];

// 直前世代の cache (pono-v<NUM> 降順の先頭) を開く。 activate は「最新1世代だけ残す」
// 運用なので、 install 時点 (activate 前 = 削除前) では前世代がまず存在する。 無ければ null。
function openPreviousCache() {
  return caches.keys().then(keys => {
    const ponoKeys = keys.filter(k => k.startsWith('pono-v') && k !== CACHE_NAME);
    ponoKeys.sort((a, b) => {
      const na = parseInt(a.replace(/^pono-v/, ''), 10) || 0;
      const nb = parseInt(b.replace(/^pono-v/, ''), 10) || 0;
      return nb - na;
    });
    return ponoKeys.length ? caches.open(ponoKeys[0]) : null;
  }).catch(() => null);
}

// 個別 asset の失敗で install が落ちないように、 asset 単位の try/catch でラップする。
function precacheAssetGroup(cache, urls, prevCache) {
  return Promise.allSettled(
    urls.map(async url => {
      // copy-forward: 前世代 cache に同一 URL があれば先に新 cache へ複製しておく。
      // network 検証が失敗しても warm な状態を維持でき、 再ダウンロード嵐を防ぐ。
      try {
        if (prevCache) {
          const prev = await prevCache.match(url);
          if (prev) await cache.put(url, prev);
        }
      } catch (e) {}
      try {
        // cache: 'no-cache' = ブラウザ HTTP cache の ETag 再検証 (304 なら body 転送なし)。
        // 旧 'reload' は HTTP cache 完全バイパスで、 CACHE_VERSION bump のたびに
        // 全 precache (~10MB) を再ダウンロードしていた (2026-07-10 修正)。
        // 検証済みレスポンスで copy-forward 分を上書きするので鮮度は従来同等。
        const response = await fetch(new Request(url, { cache: 'no-cache' }));
        if (!response || !response.ok) {
          throw new Error('precache fetch failed: ' + url + ' status=' + (response && response.status));
        }
        await cache.put(url, response);
      } catch (err) {
        // install 全体は失敗させない。 個別 asset の失敗は WARN レベルで握りつぶす。
        try { console.warn('[sw] precache skip', url, err && err.message); } catch (e) {}
      }
    })
  );
}

self.addEventListener('install', event => {
  // 開いているゲームへ新しいSWを即時適用すると、controllerchange経由で
  // ページがリロードされ、ゲームがタイトル状態へ戻ってしまう。
  // 待機状態にして、次回起動/遷移時に自然に切り替える。
  //
  // ただし precache は install 中に行い、 ファーストビュー資産だけは新版 SW でも
  // 即座に提供できるようにする (cold start 解消)。
  // copy-forward 用の前世代 cache は activate の削除前 (= install 中) に開いておく。
  event.waitUntil(
    Promise.all([caches.open(CACHE_NAME), openPreviousCache()]).then(([cache, prevCache]) =>
      Promise.allSettled(
        CRITICAL_ASSET_GROUPS.map(group => precacheAssetGroup(cache, group, prevCache))
      )
    ).catch(err => {
      try { console.warn('[sw] precache open failed', err && err.message); } catch (e) {}
    })
  );
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
  // 旧キャッシュは「最新1世代だけ残す」 warm migration 方式に変更 (旧: 全削除)。
  // - 既存クライアントは claim せず、プレイ中のページを中断しない。
  // - 新 SW activate 直後、 旧 SW (1世代前) の cache を即削除すると
  //   再 fetch 嵐になる (cold start)。 旧版を 1 世代残しておけば、
  //   キャッシュ突合せ目的で再利用できる + image cache-first の hit 確率も上がる。
  // - 'pono-v' で始まる cache のうち、 現行 CACHE_NAME 以外を新しい順に並べて
  //   最新1件(=1世代前)だけ残し、 それ以前を削除する。
  event.waitUntil(
    caches.keys().then(keys => {
      const ponoKeys = keys.filter(k => k.startsWith('pono-v') && k !== CACHE_NAME);
      // pono-v<NUM> の NUM 降順 (= 新しい順) でソートし、 先頭 (= 1世代前) は残す。
      ponoKeys.sort((a, b) => {
        const na = parseInt(a.replace(/^pono-v/, ''), 10) || 0;
        const nb = parseInt(b.replace(/^pono-v/, ''), 10) || 0;
        return nb - na;
      });
      const toDelete = ponoKeys.slice(1); // 2世代以上前のみ削除
      return Promise.all(toDelete.map(k => caches.delete(k)));
    })
  );
});

// Range リクエストへ cache 済みの完全 (200) レスポンスから 206 を組み立てて返す。
// iOS Safari は media 要素の Range 要求に 200 full body を返すと再生に失敗することが
// あるため、 動画/音声の cache-first 化 (2026-07-10) とセットで必須。
// Range ヘッダが無い場合・response が 200 full でない場合はそのまま返す。
function sliceRangeResponse(request, response) {
  if (!response || response.status !== 200) return Promise.resolve(response);
  const rangeHeader = (request.headers && request.headers.get('range')) || '';
  const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!m || (m[1] === '' && m[2] === '')) return Promise.resolve(response);
  return response.arrayBuffer().then(buf => {
    const total = buf.byteLength;
    let start;
    let end;
    if (m[1] === '') {
      // suffix range: bytes=-N (末尾 N バイト)
      start = Math.max(0, total - parseInt(m[2], 10));
      end = total - 1;
    } else {
      start = parseInt(m[1], 10);
      end = m[2] === '' ? total - 1 : Math.min(parseInt(m[2], 10), total - 1);
    }
    if (start >= total || start > end) {
      return new Response(null, {
        status: 416,
        statusText: 'Range Not Satisfiable',
        headers: { 'Content-Range': 'bytes */' + total }
      });
    }
    const sliced = buf.slice(start, end + 1);
    return new Response(sliced, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Accept-Ranges': 'bytes',
        'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
        'Content-Length': String(sliced.byteLength)
      }
    });
  });
}

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

  // 画像は cache-first 戦略 (旧: 常に network no-store)。
  // 理由: SW 更新のたびにすべての画像が完全コールドスタートしていた問題を解消し、
  // 同一ページ内・同一セッションでの重複参照を CF エッジへ往復させない。
  //
  // cache key は query 込みの完全 URL。 差し替え時の cache-bust 規約:
  //   - 正本は ?v=<timestamp> (例: ?v=1693, ?v=20260627)
  //   - 既存実装の互換で ?t=<timestamp> (tools/maze-editor.html) も同じ扱い
  //   - 値を更新すれば別 key = 必ず network 取得になるため、 強制更新はそのまま機能する
  //   - 旧実装は ?v=/?t= 付きを毎回 cache:'no-store' で再取得していたが、 固定値の
  //     ?v=N は URL ごと一意な key なので、 ページ表示のたびに bento ~4.2MB /
  //     maze ~5MB を再ダウンロードするだけの無駄だった (2026-07-10 に cache-first へ統一)
  // ⚠️ 同名ファイルの上書きは NG (Same-URL Same-Filename Overwrite Risk):
  //   menu_card_base_01.webp などをそのまま上書き push すると、 cache-first 戦略下では
  //   旧 client は旧画像を引き続ける。 CACHE_VERSION bump も即効性はない: activate は
  //   1 世代前 cache を残し (warm migration)、 caches.match は古い cache から順に探す
  //   ため、 同一 URL の旧エントリは bump 1 回を生き延びる (完全退役は 2 bump 後)。
  //   画像更新は必ず (a) 新ファイル名 か (b) ?v=<ts> の値更新 を伴うこと (= 別 cache
  //   key になり確実に network 取得)。 詳細は AGENTS.md / CLAUDE.md のデプロイ規約参照。
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            if (response && response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => caches.match(event.request));
      })
    );
    return;
  }

  // 動画 (宝箱・ハリネズミ等) と BGM / storyboard 音声は cache-first (旧: 毎回 network
  // no-store)。 旧実装は 4-5MB の mp4 / BGM mp3 を再生のたびに全量再ダウンロードして
  // いた (2026-07-10 修正)。
  // - cache key は query 込みの完全 URL。 差し替え時は画像と同じく (a) 新ファイル名 /
  //   (b) ?v=<ts> の値更新 のどちらかで強制更新する (CACHE_VERSION bump は 1 世代残しの
  //   ため即効性なし。 上記画像の Same-URL Same-Filename Overwrite Risk 参照)。
  // - media 要素は Range リクエストを送る (206 は cache.put 不可 + iOS Safari は 206
  //   応答必須)。 URL 文字列で fetch して Range ヘッダを外した完全な 200 を取得・保存し、
  //   応答時に sliceRangeResponse で必要なら 206 に切り出して返す。
  if (event.request.destination === 'video'
      || event.request.url.includes('/assets/videos/')
      || event.request.url.includes('/assets/audio/bgm/')
      || event.request.url.includes('/assets/audio/stickerbook/bgm/')
      || event.request.url.includes('/assets/audio/storyboard/')) {
    const mediaUrl = event.request.url;
    event.respondWith(
      caches.match(mediaUrl).then(cached => {
        if (cached) return sliceRangeResponse(event.request, cached);
        return fetch(mediaUrl)
          .then(response => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(mediaUrl, clone))
                .catch(() => {});
            }
            return sliceRangeResponse(event.request, response);
          })
          .catch(() => caches.match(mediaUrl).then(fallback =>
            fallback ? sliceRangeResponse(event.request, fallback) : fallback
          ));
      })
    );
    return;
  }

  // items.js / rewards.json / tts manifest はデプロイ直後に即反映させたいので HTTP
  // キャッシュも無効化。 cache:'no-store' で毎回ネットワーク取得、 SW キャッシュだけ
  // 更新してオフライン用に保持 (2026-04-21)。
  if (event.request.url.includes('/room/items.js')
      || event.request.url.includes('/assets/data/rewards.json')
      || event.request.url.includes('/assets/tts/manifest.json')) {
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
