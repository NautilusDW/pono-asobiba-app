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
    ]

    // NOTE: starparodier / undersea-cave / sea-album / aquarium 等は
    //       worktree 内に存在しないため、 ここでは map に含めない。
    //       Stream finalize で main repo の対応 game id を追加可。
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
