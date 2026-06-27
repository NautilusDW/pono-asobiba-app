/*!
 * common/preload-helper.js
 * ------------------------------------------------------------
 * Deferred speculative preload helper for heavy idle assets.
 *
 * Use case: bottom-nav の pressed PNG 4 枚 (合計 ~7.1MB) のように、
 *   - 初回タップまで絶対に描画に出ない
 *   - cold reload 時に FCP/LCP の通信帯域を著しく食い潰す
 *   - けれど初回タップ時には decoded されていてほしい
 * という素材を、 idle (requestIdleCallback) または最初の
 * pointerdown/touchstart のうち早い方で <link rel=preload as=image>
 * を <head> に動的注入する。
 *
 * Scope: app side のみ。 LP (index.html) には読み込まれない。
 *        (memory: project_url_architecture / app_scope_boundary)
 *
 * 注意:
 *  - 既に同じ URL の preload が存在する場合は重複注入しない。
 *  - SW (sw.js / cache-first) と組み合わせて使う想定。 二回目以降は
 *    network へは行かず Cache から返るので、 ここの preload は
 *    あくまで cold 初回タップ対策。
 *  - ?v= / ?t= bypass を壊さないため、 ここでは URL を改変しない。
 *
 * ------------------------------------------------------------
 * Game-page extension (Stream B - 2026-06-27)
 *
 * 各ゲームの cold-start で初回描画/初回操作に必要な画像を
 * idle 中に warm (preload as=image) するため、 ゲーム ID 毎の
 * warm リストを公開: window.PonoPreload.warmGameAssets('<gameId>')
 *
 * 呼出側 (各ゲームの index.html) からは:
 *   <script src="../common/preload-helper.js" defer></script>
 *   <script>window.addEventListener('DOMContentLoaded',
 *     () => window.PonoPreload && window.PonoPreload.warmGameAssets('bento')
 *   );</script>
 *
 * 1 ゲームあたり warm 上限 ~1.5MB (子供のモバイル回線配慮)。
 * パスは ゲーム index.html (/<game>/index.html) からの相対 ('../assets/…')。
 *
 * ------------------------------------------------------------
 * WebP migration (Stream A+C - 2026-06-27, v1699)
 *
 * BOTTOM_NAV_PRESSED_URLS の 4 枚は PNG → WebP 化済 (~7.1MB → ~285KB)。
 * 元 PNG は assets/_legacy_png/ に退避してあり削除しない (rollback safe)。
 */
(function (global) {
  'use strict';

  /** @type {Set<string>} */
  var injected = new Set();

  /**
   * 1 件の preload link を <head> に注入する (重複防止つき)。
   * @param {string} href
   * @param {{ as?: string, fetchpriority?: 'high'|'low'|'auto', type?: string }} [opts]
   */
  function injectPreload(href, opts) {
    if (!href || typeof href !== 'string') return;
    if (injected.has(href)) return;

    // 既に同 URL の preload が DOM に存在する場合はスキップ
    try {
      var existing = document.head.querySelector(
        'link[rel="preload"][href="' + href.replace(/"/g, '\\"') + '"]'
      );
      if (existing) {
        injected.add(href);
        return;
      }
    } catch (_) { /* CSS escape 失敗時は無視して新規挿入 */ }

    var link = document.createElement('link');
    link.rel = 'preload';
    link.as = (opts && opts.as) || 'image';
    link.href = href;
    if (opts && opts.fetchpriority) link.setAttribute('fetchpriority', opts.fetchpriority);
    if (opts && opts.type) link.type = opts.type;
    document.head.appendChild(link);
    injected.add(href);
  }

  /**
   * 配列をまとめて遅延 preload する。
   * - requestIdleCallback (50ms timeout) が利用可能ならそれで
   * - 無ければ setTimeout(0) で fallback
   * - さらに最初の pointerdown/touchstart で前倒し発火
   *
   * @param {string[]} urls
   * @param {{ as?: string, fetchpriority?: 'high'|'low'|'auto' }} [opts]
   */
  function deferPreload(urls, opts) {
    if (!Array.isArray(urls) || urls.length === 0) return;
    var fired = false;

    function flush() {
      if (fired) return;
      fired = true;
      removeEarlyListeners();
      for (var i = 0; i < urls.length; i++) {
        injectPreload(urls[i], opts);
      }
    }

    // 早期発火: 最初の pointerdown / touchstart / keydown
    function onEarly() { flush(); }
    function removeEarlyListeners() {
      window.removeEventListener('pointerdown', onEarly, true);
      window.removeEventListener('touchstart', onEarly, true);
      window.removeEventListener('keydown', onEarly, true);
    }
    window.addEventListener('pointerdown', onEarly, { capture: true, once: true, passive: true });
    window.addEventListener('touchstart',  onEarly, { capture: true, once: true, passive: true });
    window.addEventListener('keydown',     onEarly, { capture: true, once: true });

    // idle 発火 (DOMContentLoaded 後)
    function scheduleIdle() {
      if (typeof global.requestIdleCallback === 'function') {
        global.requestIdleCallback(flush, { timeout: 4000 });
      } else {
        // fallback: 一定時間後に flush (FCP/LCP 後)
        setTimeout(flush, 1500);
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scheduleIdle, { once: true });
    } else {
      scheduleIdle();
    }
  }

  // ---- App 固定設定: bottom-nav pressed 4 枚 (WebP 版) ----
  // play.html FV preload からは外したが、 最初のタップで decoded されて
  // いてほしい素材。 normal sprite は <link rel=preload> に残してある。
  // v1699: PNG → WebP に切替 (~7.1MB → ~285KB)。
  var BOTTOM_NAV_PRESSED_URLS = [
    'assets/ui/title/title_bottom_nav_4_pressed_help_masked_20260626.webp',
    'assets/ui/title/title_bottom_nav_4_pressed_news_masked_20260626.webp',
    'assets/ui/title/title_bottom_nav_4_pressed_stickers_masked_20260626.webp',
    'assets/ui/title/title_bottom_nav_4_pressed_settings_masked_20260626.webp'
  ];

  // play.html (および将来の play 系ページ) でのみ自動発火
  function isAppTitlePage() {
    try {
      var p = (location.pathname || '').toLowerCase();
      return p.endsWith('/play.html') || p === '/play' || /\/play\.html(\?|$|#)/.test(location.href.toLowerCase());
    } catch (_) {
      return false;
    }
  }

  if (isAppTitlePage()) {
    deferPreload(BOTTOM_NAV_PRESSED_URLS, { as: 'image', fetchpriority: 'low' });
  }

  // ============================================================
  // Game-page warm asset map (Stream B - 2026-06-27)
  // ------------------------------------------------------------
  // 各ゲーム ID に対し、 cold-start 初回描画 / 初回操作で必要な
  // 画像 path 一覧 (1.5MB 上限) を定義。 各 path は /<game>/index.html
  // からの相対 ('../assets/…')。
  //
  // 設計方針:
  //  - 既に <img src> や CSS background で参照されているもののうち、
  //    FCP/LCP/初回操作のクリティカルパスに乗るものを中心に列挙。
  //  - 通常 <img> なら preload なくても browser が拾うが、 cold-start
  //    時の queueing 順序最適化と、 SW precache 候補抽出を兼ねる。
  //  - 1 ゲームあたり 1.5MB 上限 (各 path の累計推定サイズ)。
  //  - fetchpriority は デフォルト 'low'。 ゲーム自体の主要 <img> は
  //    既に通常優先度で fetch 開始しているため、 競合させない。
  // ============================================================
  var GAME_WARM_ASSETS = {
    // ----- CRITICAL priority games -----

    // bento (105MB total / 9 files >1MB)
    // 初回描画: お弁当箱パレット (左) + ご飯/おかず/フルーツ 主要パーツ。
    // 推定累計: ~1.2MB (各 ~100-150KB × 9)
    bento: [
      '../assets/images/Bento_parts/hamburg2.webp',
      '../assets/images/Bento_parts/karaage2.png',
      '../assets/images/Bento_parts/ebi_fry2.webp',
      '../assets/images/Bento_parts/rice_umeboshi.webp',
      '../assets/images/Bento_parts/korokke2.webp',
      '../assets/images/Bento_parts/fries2.webp',
      '../assets/images/Bento_parts/broccoli2.webp',
      '../assets/images/Bento_parts/mini_tomato2.webp',
      '../assets/images/Bento_parts/ichigo2.webp',
      '../assets/images/characters/pono/pono_face_circle.png'
    ],

    // quizland (210MB total / 68 files >1MB)
    // 初回描画: ポノ アバター + 最初の問題画像群。 質問は動的に
    // ../assets/images/word/ 配下から差し込まれるため、 question
    // 画像本体は preload しない (over-fetch リスク)。
    // 推定累計: ~150KB (アバター + word/ringo)
    quizland: [
      '../assets/images/characters/pono/pono_face_circle.png',
      '../assets/images/word/ringo.png'
    ],

    // ----- HIGH priority games -----

    // puzzle (35MB total / 12 files >1MB)
    // 初回描画: stage 1-4 (BASE_STAGES head)。 最初の 4 ステージは
    // 順に開放されるため、 ユーザー操作後ほぼ確実に必要になる。
    // 推定累計: ~500KB (各 ~80-170KB × 4)
    puzzle: [
      '../assets/images/puzzle_bear.jpg',
      '../assets/images/puzzle_cover.jpg',
      '../assets/images/puzzle_birds.jpg',
      '../assets/images/puzzle_P01_01.jpg'
    ],

    // oto (26MB total / 4 files >1MB)
    // 初回描画: ポノ アバター + pono_001 (デフォルトスプライト)。
    // dance/ 配下は タッチ後にしか出ないため warm に含めない
    // (合計 ~3MB を超えてしまう)。
    // 推定累計: ~450KB
    oto: [
      '../assets/images/characters/pono/pono_face_circle.png',
      '../assets/images/characters/pono/pono_001.png'
    ],

    // ----- maze (image stages dynamic, character sheets ~1MB) -----
    // 初回描画: pono / hedgehog character sheets + 障害物 5 種。
    // imageStages は ?stage=N で動的決定されるため warm に含めない。
    // 推定累計: ~1.3MB
    maze: [
      '../assets/images/characters/pono/pono_face_circle.png',
      '../assets/images/characters/pono/pono_walk_sheet.png',
      '../assets/images/characters/pono/pono_walk_side_sheet.png',
      '../assets/images/characters/headgehog/headgehog_front.png',
      '../assets/images/characters/headgehog/headgehog_smilewavinghands.png',
      '../assets/images/maze/tree.png',
      '../assets/images/maze/pond.png',
      '../assets/images/maze/hole.png',
      '../assets/images/maze/stump.png',
      '../assets/images/maze/rock.png',
      '../assets/images/word/ringo.png'
    ],

    // ----- gacha (play.html 内モーダル: ../path ではなく play.html 同階層) -----
    // Stream A finalize (2026-06-28):
    // 初回モーダル open 直後の描画 critical asset:
    //   - daily_gacha_capsule_closed_pink.png (~836KB) ← play.html バナー (banner img)
    //   - daily_gacha_machine.webp (~139KB)            ← モーダル open 直後 LCP 候補
    //   - daily_gacha_room_backdrop.webp (~95KB)       ← 同時に背景表示
    //   - reveal_bg_* 3 枚 (~620KB)                    ← drop 時 (capsule 出現後 ~1s)
    // 推定累計: ~1.6MB (上限 1.5MB をわずかに超過するが、 banner png が user-visible
    // で LCP に直結するため許容)。 lever.png (~836KB) と start_panel.png (~614KB)
    // は内部 UI で頻度低めのため、 起動時 warm からは除外し、
    // startDailyGachaImagePreload() の従来パスに任せる。
    //
    // play.html からの呼び出しは相対 ('assets/…') になるため、 ここでは
    // 'assets/…' (../ 無し) を採用。 他ゲームは /<game>/index.html 配下のため
    // '../assets/…' だが、 gacha は play.html 直下なので注意。
    gacha: [
      'assets/ui/gacha/daily_gacha_capsule_closed_pink.png',
      'assets/ui/gacha/daily_gacha_machine.webp',
      'assets/ui/gacha/daily_gacha_room_backdrop.webp',
      'assets/ui/gacha/daily_gacha_reveal_bg_magic_book.webp',
      'assets/ui/gacha/daily_gacha_reveal_bg_holographic_pack.webp',
      'assets/ui/gacha/daily_gacha_reveal_bg_stage_burst.webp'
    ],

    // ============================================================
    // Stream B finalize (2026-06-28) - 未対応ゲーム拡張
    // ------------------------------------------------------------
    // 各ゲームの初回描画 / 初回操作で critical な画像のみ列挙。
    // dynamic 選択される素材 (stage 解放後の bg / ガチャ capsule 等) は
    // 対象外。 path は /<game>/index.html からの相対 ('../assets/…')。
    // ============================================================

    // aquarium (PIXI ベース水族館 / Ocean assets)
    // 初回描画: ocean BG + 主要生き物スプライト (octpus/JellyFish/Turtle/Fish)。
    // OceanRocks シリーズは dynamic 配置のため warm から除外。
    // 推定累計: ~1.0MB
    aquarium: [
      '../assets/images/ocean/BG_A.png',
      '../assets/images/ocean/octpus/octpus_001.png',
      '../assets/images/ocean/JellyFish/JellyFish_001.png',
      '../assets/images/ocean/Turtle/Turtle_001.png',
      '../assets/images/ocean/Fish_S01/Fish_S01_001.png',
      '../assets/images/ocean/Submarine/Submarine_001.png'
    ],

    // breakout (デフォルト解放 stage1 のみ)
    // 他 stage は unlock 条件付き / 動的選択のため対象外。
    // 推定累計: ~2.2MB → 1 枚で枠超え気味だが BG なので例外的に許容。
    breakout: [
      '../assets/images/Block/stage1_forest_light.png'
    ],

    // slide (stage1 がオープニング BG。 他 stage は順次出現)
    // 推定累計: ~2.2MB (BG 1 枚のみ)
    slide: [
      '../assets/images/Slide/stage1_forest_light.png'
    ],

    // starparodier (cold start: ASSET_BASE = ../assets/images/starparodier/)
    // 初回描画: player ship + 最初の zako enemy + power star + 背景3層 (moon)。
    // boss / mid-boss / 爆発エフェクトは敵 wave 到来まで非クリティカル。
    // 推定累計: ~1.3MB (player ~50KB + zako/star ~50KB + moon 3 枚 ~1.2MB)
    starparodier: [
      '../assets/images/starparodier/player_ship_pono.png',
      '../assets/images/starparodier/zako_enemy.png',
      '../assets/images/starparodier/power_star.png',
      '../assets/images/starparodier/moon_far_loop.png'
    ],

    // undersea-cave (ASSET_BASE = ../assets/images/undersea-cave/)
    // 初回描画: 洞窟内 BG 3 層 + Submarine + 友達生物 normal state。
    // 食べ物/真珠/わかめなど item は徐々に出現するため warm 不要。
    // 推定累計: ~1.3MB
    'undersea-cave': [
      '../assets/images/undersea-cave/bg_ceiling.png',
      '../assets/images/undersea-cave/bg_floor_sand.png',
      '../assets/images/undersea-cave/bg_wall_near.png',
      '../assets/images/undersea-cave/bg_wall_far.png',
      '../assets/images/ocean/Submarine/Submarine_003.png',
      '../assets/images/undersea-cave/friend_whale_sleep.png',
      '../assets/images/undersea-cave/friend_octopus_smile.png'
    ],

    // sea-album (stage1 tidepool が initial scene)
    // panorama scroll BG が初回描画のメイン。 stage2-6 は別途解放まで warm 不要。
    // 推定累計: ~1.4MB
    'sea-album': [
      '../assets/images/sea-album/stage1/stage1_tidepool_background.png',
      '../assets/images/sea-album/stage1/hermit_crab_normal.png',
      '../assets/images/sea-album/stage1/shrimp_normal.png',
      '../assets/images/sea-album/stage1/sea_star_normal.png'
    ],

    // wordmatch (forestdex)
    // タイトル画面: title_logo + title_back.jpg、 ゲーム画面: gameplay_frame。
    // collection_frame は図鑑ボタンタップ後のため warm 後段に回す。
    // 推定累計: ~1.5MB (title_back ~小 + frame 大)
    wordmatch: [
      '../assets/images/wordmatch/title_logo.png',
      '../assets/images/wordmatch/title_back.jpg',
      '../assets/images/wordmatch/forestdex_gameplay_frame.png'
    ],

    // shop (ポノのお店 - exterior が初回シーン)
    // counter は店内入場後だがほぼ即遷移するため warm 対象に含める。
    // 推定累計: ~5.2MB → 上限超過のため exterior のみ。
    shop: [
      '../assets/images/shop/exterior.png'
    ],

    // zukan (もりのずかん SPA)
    // 初回描画: title_bg + title_logo + outer 21:9 BG。 ui_question_frame は
    // search 画面遷移後のため warm 二段目候補。
    // 推定累計: ~1.0MB
    zukan: [
      '../assets/zukan/title/title_bg.png',
      '../assets/zukan/title/title_logo.png',
      '../assets/zukan/bg/zukan_outer_bg_21x9.png',
      '../assets/zukan/map/world_map.png'
    ],

    // bubble (シャボン玉パーティー / 小規模)
    // 主要素材は pono face のみ (~50KB)
    bubble: [
      '../assets/images/characters/pono/pono_face_circle.png'
    ],

    // bowling (デフォルト解放 bg は circuit / colorful)
    // pins/ は同一ディレクトリで bowling/pins/ にあるため warm 不要 (即時参照)。
    // 推定累計: ~600KB (webp 2 枚)
    bowling: [
      '../assets/images/Bowling/BG/boy/circuit.webp',
      '../assets/images/Bowling/BG/girl/colorful.webp'
    ],

    // coloring (ぬりえ - selection 画面が最初)
    // selection BG (BG_03.webp) + nurie001 (デフォルト onload)。
    // 推定累計: ~400KB
    coloring: [
      '../assets/images/BG_03.webp',
      '../assets/images/nurie001.webp'
    ],

    // drawing (おえかき - canvas + キャラクター)
    // 背景 BG_03 + ポノ 側面立ち絵。 アイコン群は CSS で読まれる。
    // 推定累計: ~400KB
    drawing: [
      '../assets/images/BG_03.webp',
      '../assets/images/characters/pono_side_fullbody.webp'
    ],

    // message (作者より - 静的ページ)
    // 共通 BG + ポノ立ち絵のみ。 推定累計: ~400KB
    message: [
      '../assets/images/BG_03.webp',
      '../assets/images/characters/pono_side_fullbody.webp'
    ],

    // egg (たまごのにわ - yard scene が最初)
    // PIXI.Assets.load で green_sm.webp / hatake_crop.webp を順に load。
    // 推定累計: ~600KB
    egg: [
      '../assets/images/yard/green_sm.webp',
      '../assets/images/yard/hatake_crop.webp'
    ],

    // fossil (かせきはっくつ - pono dance + hedgehog)
    // canvas dig 画面で imgPono / dance スプライト群が即使われる。
    // 推定累計: ~500KB
    fossil: [
      '../assets/images/characters/pono/pono_001.png',
      '../assets/images/characters/pono/dance/dance_hooray.png',
      '../assets/images/characters/pono/dance/dance_wave.png',
      '../assets/images/characters/headgehog/headgehog_smilewavinghands.png'
    ]
  };

  /**
   * ゲーム ID に対し、 該当ゲームの critical asset 一覧を idle 中に warm する。
   * 同 URL の重複は injectPreload 側で抑止されるため、 複数回呼んでも安全。
   *
   * @param {string} gameId
   * @param {{ fetchpriority?: 'high'|'low'|'auto' }} [opts]
   * @returns {boolean} true if at least one asset was scheduled
   */
  function warmGameAssets(gameId, opts) {
    if (!gameId || typeof gameId !== 'string') return false;
    var list = GAME_WARM_ASSETS[gameId];
    if (!Array.isArray(list) || list.length === 0) return false;
    var preloadOpts = {
      as: 'image',
      fetchpriority: (opts && opts.fetchpriority) || 'low'
    };
    deferPreload(list, preloadOpts);
    return true;
  }

  // 外部公開 (他ページから手動でも呼べるよう)
  global.PonoPreload = {
    inject: injectPreload,
    defer: deferPreload,
    warmGameAssets: warmGameAssets,
    BOTTOM_NAV_PRESSED_URLS: BOTTOM_NAV_PRESSED_URLS,
    GAME_WARM_ASSETS: GAME_WARM_ASSETS
  };
})(typeof window !== 'undefined' ? window : this);
