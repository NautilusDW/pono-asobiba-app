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
 *   <script src="../common/preload-helper.js"></script>
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

  installVisibilityAudioGuard();

  function installVisibilityAudioGuard() {
    if (global.PonoVisibilityAudioGuard && global.PonoVisibilityAudioGuard.installed) return;

    var mediaEls = new Set();
    var audioContexts = new Set();
    // (E) 初期値 false 固定: bfcache cold restore で document.hidden=true でも
    // 永久 inactive にしない。 visibilitychange で必要時に true になる。
    var inactiveByFocus = false;
    var replayAttempts = new WeakMap();
    // v1944: 初回リトライは同期実行させる契約 (sync flag)。 gesture 経由の tryReplayMedia は
    // sticky activation 済みの macrotask 内で play() を叩けば iOS Safari 14 系 / low power
    // mode でも user-gesture 判定を通す。 2 回目以降は従来通り backoff (300/1000/3000ms)。
    var REPLAY_DELAYS = [0, 300, 1000, 3000];
    // v1944: blocked/was-playing 要素の件数を軽量トラッキング。
    // pointerdown/touchstart など gesture 経路で「何も replay 対象が無い」 タップ時に
    // audioContexts.forEach + mediaEls.forEach を丸ごとスキップして CPU/battery を守る。
    var blockedMediaCount = 0;

    function isInactive() {
      return !!document.hidden || inactiveByFocus;
    }

    function isReplayTagged(el) {
      try {
        return !!(el && el.getAttribute && (
          el.getAttribute('data-pono-blocked') === '1' ||
          el.getAttribute('data-pono-was-playing') === '1'
        ));
      } catch (_) { return false; }
    }
    function tagBlocked(el) {
      try {
        if (!el || !el.setAttribute) return;
        var was = isReplayTagged(el);
        el.setAttribute('data-pono-blocked', '1');
        if (!was) blockedMediaCount++;
      } catch (_) {}
    }
    function tagWasPlaying(el) {
      try {
        if (!el || !el.setAttribute) return;
        var was = isReplayTagged(el);
        el.setAttribute('data-pono-was-playing', '1');
        if (!was) blockedMediaCount++;
      } catch (_) {}
    }
    function clearReplayTags(el) {
      try {
        if (!el || !el.removeAttribute) return;
        var was = isReplayTagged(el);
        el.removeAttribute('data-pono-blocked');
        el.removeAttribute('data-pono-was-playing');
        if (was && blockedMediaCount > 0) blockedMediaCount--;
      } catch (_) {}
    }

    function blockedPlayResult() {
      if (!global.Promise) return undefined;
      var err;
      try {
        err = new DOMException('Audio playback is blocked while the page is inactive.', 'AbortError');
      } catch (_) {
        err = new Error('Audio playback is blocked while the page is inactive.');
        err.name = 'AbortError';
      }
      var p = global.Promise.reject(err);
      p.catch(function () {});
      return p;
    }

    // v1944: options.sync=true で初回 attempt を同期実行 (setTimeout(0) を挟まない)。
    // pointerdown/touchstart 経由の gesture 復帰時、 iOS Safari は macrotask に
    // 移った時点で gesture context を失い NotAllowedError を返すため、
    // 最初の 1 回だけは gesture callback 内で同期 play() を叩く。
    //
    // data-pono-force-paused contract (v1944 現在の運用):
    //   - 「意図的抑止」 は bento (isMaskEditorAudioMuted) / oto (_otoTutorialState /
    //     _otoAcornModalActive) が PonoAudioVisibilityResume ハンドラ内で gate する方式が正。
    //   - data-pono-force-paused="1" を実際に SET する consumer は今のところ無い
    //     (forward-compat スカフォールド、 将来 「音量トグル OFF で AC/media を
    //     アクティブに suspend しておく」 実装が入る時のために予約)。 現状で読むだけ
    //     の dead branch だが safety-net 側の respect を維持することで契約の一貫性を保つ。
    function tryReplayMedia(el, options) {
      if (!el) return;
      try {
        if (el.getAttribute && el.getAttribute('data-pono-force-paused') === '1') return;
        if (!isReplayTagged(el)) return;
      } catch (_) { return; }
      var attempts = replayAttempts.get(el) || 0;
      if (attempts >= REPLAY_DELAYS.length) {
        clearReplayTags(el);
        replayAttempts.delete(el);
        return;
      }
      var delay = REPLAY_DELAYS[attempts];
      replayAttempts.set(el, attempts + 1);
      var sync = !!(options && options.sync) && attempts === 0;
      var run = function () {
        if (document.hidden || inactiveByFocus) return;
        try {
          if (!isReplayTagged(el)) return;
          if (el.getAttribute('data-pono-force-paused') === '1') return;
        } catch (_) { return; }
        var nativeFn = (mediaProto && mediaProto.play && mediaProto.play.__nativePlay);
        var res;
        try {
          res = nativeFn ? nativeFn.call(el) : el.play();
        } catch (_) {
          tryReplayMedia(el);
          return;
        }
        if (res && typeof res.then === 'function') {
          res.then(function () {
            clearReplayTags(el);
            replayAttempts.delete(el);
          }).catch(function () {
            tryReplayMedia(el);
          });
        } else {
          clearReplayTags(el);
          replayAttempts.delete(el);
        }
      };
      if (sync) run();
      else setTimeout(run, delay);
    }

    // v1944: emitStopEvent / emitResumeEvent の CustomEvent boilerplate を単一関数に集約。
    // 将来 3 番目の event を追加する時にコピペ分岐しない。
    function emitEvent(name, reason) {
      try {
        global.dispatchEvent(new CustomEvent(name, {
          detail: { reason: reason || '' }
        }));
      } catch (_) {
        try {
          var ev = document.createEvent('CustomEvent');
          ev.initCustomEvent(name, false, false, { reason: reason || '' });
          global.dispatchEvent(ev);
        } catch (__) {}
      }
    }
    function emitResumeEvent(reason) { emitEvent('PonoAudioVisibilityResume', reason); }

    function clearFocusInactiveIfVisible(reason) {
      if (document.hidden) return;
      var wasInactive = inactiveByFocus;
      // v1944 (H4): gesture 経路の連打 (pointerdown/touchstart) で「何もすることが無い」
      // タップ毎に forEach + setTimeout を走らせない。 wasInactive===false かつ blocked/
      // was-playing 要素が 0 の場合は fast path で return。
      if (!wasInactive && blockedMediaCount === 0) return;
      inactiveByFocus = false;
      // v1944 (H2 / cross-file H2): AC は 'interrupted' のみ resume。
      // 'suspended' はゲーム側の意図的 ctx.suspend() を尊重するため触らない
      // (wrapAudioContext statechange と同ポリシー)。
      audioContexts.forEach(function (ctx) {
        try {
          if (ctx && ctx.state === 'interrupted' && typeof ctx.resume === 'function') {
            var p = ctx.resume();
            if (p && typeof p.catch === 'function') p.catch(function () {});
          }
        } catch (_) {}
      });
      // v1944 (H1 / iH2): data-pono-blocked OR data-pono-was-playing の両方を対象に
      // safety-net replay。 data-pono-force-paused="1" は意図的 pause として尊重して触らない。
      // gesture 経路 (reason==='gesture') は初回 attempt を同期実行して iOS sticky
      // activation を維持。
      var syncFirst = (reason === 'gesture');
      mediaEls.forEach(function (el) {
        try {
          if (el && isReplayTagged(el)) {
            replayAttempts.delete(el);
            tryReplayMedia(el, syncFirst ? { sync: true } : null);
          }
        } catch (_) {}
      });
      if (wasInactive) emitResumeEvent(reason || 'clear');
    }

    /**
     * 明示的に BGM 再生失敗を後続 pointerdown / visible で自動再試行させたい時、
     * ゲーム側から el を渡して backoff (0/300/1000/3000ms 最大4回) キューに乗せる。
     */
    function scheduleBgmRetry(el) {
      if (!el) return;
      tagBlocked(el);
      trackMedia(el);
      replayAttempts.delete(el);
      if (!document.hidden && !inactiveByFocus) tryReplayMedia(el);
    }

    function trackMedia(el) {
      if (el && typeof el.pause === 'function') mediaEls.add(el);
      return el;
    }

    // v1944 (H1 / iH2 / cross-file H2): pauseAll 経路で「再生中→hidden で pause した」
    // 要素にも data-pono-was-playing タグを付ける。 これで独自 visibilitychange を持たない
    // 新規ゲームでも clearFocusInactiveIfVisible が safety-net replay で拾える。
    // guardedPlay 経路で既に data-pono-blocked が立っているケースは尊重 (両立可)。
    function pauseMedia(el) {
      try {
        if (!el || typeof el.pause !== 'function') return;
        if (!el.paused && !el.ended) {
          tagWasPlaying(el);
          el.pause();
        }
      } catch (_) {}
    }

    function suspendContext(ctx) {
      try {
        if (ctx && ctx.state === 'running' && typeof ctx.suspend === 'function') {
          var p = ctx.suspend();
          if (p && typeof p.catch === 'function') p.catch(function () {});
        }
      } catch (_) {}
    }

    function emitStopEvent(reason) { emitEvent('PonoAudioVisibilityStop', reason); }

    function pauseAll(reason) {
      try {
        document.querySelectorAll('audio,video').forEach(trackMedia);
      } catch (_) {}
      mediaEls.forEach(pauseMedia);
      audioContexts.forEach(suspendContext);
      emitStopEvent(reason);
    }

    var mediaProto = global.HTMLMediaElement && global.HTMLMediaElement.prototype;
    if (mediaProto && mediaProto.play && !mediaProto.play.__ponoVisibilityGuarded) {
      var nativePlay = mediaProto.play;
      var guardedPlay = function () {
        trackMedia(this);
        if (isInactive()) {
          pauseMedia(this);
          // (C) 呼び出し側 .catch 握り潰しでも失われないよう data-pono-blocked を付与、
          // 次の pointerdown / visible / focus / pageshow の safety-net で自動 replay。
          tagBlocked(this);
          return blockedPlayResult();
        }
        return nativePlay.apply(this, arguments);
      };
      guardedPlay.__ponoVisibilityGuarded = true;
      guardedPlay.__nativePlay = nativePlay;
      mediaProto.play = guardedPlay;
    }

    if (global.Audio && !global.Audio.__ponoVisibilityGuarded) {
      var NativeAudio = global.Audio;
      var GuardedAudio = function (src) {
        var audio = arguments.length ? new NativeAudio(src) : new NativeAudio();
        trackMedia(audio);
        if (isInactive()) pauseMedia(audio);
        return audio;
      };
      GuardedAudio.prototype = NativeAudio.prototype;
      try { Object.setPrototypeOf(GuardedAudio, NativeAudio); } catch (_) {}
      GuardedAudio.__ponoVisibilityGuarded = true;
      GuardedAudio.__NativeAudio = NativeAudio;
      global.Audio = GuardedAudio;
    }

    function wrapAudioContext(name) {
      var NativeContext = global[name];
      if (!NativeContext || NativeContext.__ponoVisibilityGuarded) return;
      var GuardedContext = function (options) {
        var ctx = arguments.length ? new NativeContext(options) : new NativeContext();
        audioContexts.add(ctx);
        // (D) setTimeout(suspend) を削除。user gesture 直後の unlock を殺さない。
        // iOS Safari 特有の 'interrupted' (電話 / Siri / 別 tab 音楽再生) だけ auto-resume。
        // 'suspended' はゲーム側の意図的 ctx.suspend() を上書きしないため触らない。
        // v1944 (iH1): iOS Safari は interruption 明けに AC が 'interrupted' → 'suspended'
        // に遷移するケース (Apple AVAudioSession 仕様) があり、'interrupted' 中の
        // resume() は無視される。 prev state を保持して interrupted→suspended 遷移も
        // 「interruption 明けの自動 suspend」 と解釈して 1 回 resume を試す。
        try {
          var prevState = null;
          try { prevState = ctx.state; } catch (_) {}
          ctx.addEventListener && ctx.addEventListener('statechange', function () {
            var cur;
            try { cur = ctx.state; } catch (_) { cur = null; }
            var prev = prevState;
            prevState = cur;
            if (document.hidden || inactiveByFocus) return;
            var shouldResume = (cur === 'interrupted') ||
              (cur === 'suspended' && prev === 'interrupted');
            if (shouldResume) {
              try {
                var p = ctx.resume();
                if (p && typeof p.catch === 'function') p.catch(function () {});
              } catch (_) {}
            }
          });
        } catch (_) {}
        return ctx;
      };
      GuardedContext.prototype = NativeContext.prototype;
      try { Object.setPrototypeOf(GuardedContext, NativeContext); } catch (_) {}
      GuardedContext.__ponoVisibilityGuarded = true;
      GuardedContext.__NativeContext = NativeContext;
      global[name] = GuardedContext;
    }

    wrapAudioContext('AudioContext');
    wrapAudioContext('webkitAudioContext');

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        inactiveByFocus = true;
        pauseAll('visibilitychange');
      } else {
        clearFocusInactiveIfVisible('visibilitychange');
      }
    }, true);

    global.addEventListener('pagehide', function () {
      inactiveByFocus = true;
      pauseAll('pagehide');
    }, true);
    global.addEventListener('pageshow', function () {
      if (!document.hidden) clearFocusInactiveIfVisible('pageshow');
    }, true);
    // (A) window.blur は iOS 疑似 blur (URL バー / コントロールセンター / キーボード)
    // で誤発火する。 本物の app switch は visibilitychange で拾えるので、 ここでは
    // suspend も pause も inactiveByFocus=true 化もしない (完全 no-op)。
    global.addEventListener('blur', function () { /* intentionally no-op */ }, true);
    global.addEventListener('focus', function () {
      if (!document.hidden) clearFocusInactiveIfVisible('focus');
    }, true);
    global.addEventListener('freeze', function () {
      inactiveByFocus = true;
      pauseAll('freeze');
    }, true);
    // v1944 (H4): gesture 経路は「replay 対象が実際にある時だけ」 clearFocusInactiveIfVisible
    // を発火。 タップ連打時の forEach + setTimeout jank を回避。 fast-path 判定は
    // clearFocusInactiveIfVisible 側にも二重で入っているが、 event dispatch cost も
    // ここで抑えるため handler 側でも先にゲート。
    ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(function (type) {
      document.addEventListener(type, function () {
        if (document.hidden) return;
        if (!inactiveByFocus && blockedMediaCount === 0) return;
        clearFocusInactiveIfVisible('gesture');
      }, true);
    });

    global.PonoVisibilityAudioGuard = {
      installed: true,
      pauseAll: pauseAll,
      trackMedia: trackMedia,
      clearFocusInactiveIfVisible: clearFocusInactiveIfVisible,
      scheduleBgmRetry: scheduleBgmRetry
    };
  }

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
    // v1947: pointerdown 同期スタックで 15 件の <link rel=preload> を挿入すると
    // iOS Safari の Resource Loader kick-off が main thread を 30-100ms 占有し、
    // 直後の rAF paint (updateMiddleOverlay 等) を遅延させて初回タップの flicker
    // 体感を悪化させる。 flush は idle callback (fallback: setTimeout 0) に逃がす。
    function onEarly() {
      removeEarlyListeners();
      if (typeof global.requestIdleCallback === 'function') {
        global.requestIdleCallback(flush, { timeout: 500 });
      } else {
        setTimeout(flush, 0);
      }
    }
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

  // ---- App 固定設定: bottom-nav pressed 3 枚 (一体型 WebP 版) ----
  // play.html FV preload からは外したが、 最初のタップで decoded されて
  // いてほしい素材。 normal sprite は <link rel=preload> に残してある。
  // v1699: PNG → WebP に切替 (~7.1MB → ~285KB)。
  // 2026-07-10 (cross-review fix): 旧 title_bottom_nav_4_pressed_* 4 枚は
  // v2008 の一体型ナビ移行後どこからも参照されない死に preload だったため、
  // 実際に押下時使われる nav_group_3_joined_pressed_*_20260710.webp
  // (各 ~120KB / q85 再エンコード版) へ差し替え。
  var BOTTOM_NAV_PRESSED_URLS = [
    'assets/ui/bottom-nav/nav_group_3_joined_pressed_feedback_20260710.webp',
    'assets/ui/bottom-nav/nav_group_3_joined_pressed_news_20260710.webp',
    'assets/ui/bottom-nav/nav_group_3_joined_pressed_settings_20260710.webp'
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
    // 実測累計: ~330KB (webp 化済パーツ 8 枚 + karaage2.png + pono_face)
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
    // 実測累計: ~340KB (アバター ~131KB + word/ringo ~211KB)
    quizland: [
      '../assets/images/characters/pono/pono_face_circle.png',
      '../assets/images/word/ringo.png'
    ],

    // ----- HIGH priority games -----

    // puzzle (2026-07-10 stale list 差し替え)
    // 旧リスト (puzzle_bear/cover/birds/P01_01) は puzzle/ 配下から一切
    // 参照されない死に体 preload (~495KB 無駄) だったため、 実際の初回
    // 必要素材へ差し替え:
    //   - title_back2.jpg: タイトル画面 CSS 背景 (style.css 経由で発見が遅い)
    //   - stage_01: 最初に遊ぶステージ + practice 最終 fallback
    //   - stage_07: choosePartnerPracticeStageIndex の free tier 選択
    //     (FREE_PUZZLE_STAGE_IDS=[1,4,7,13] では 10-12pc が無く 9pc の 7 に fallback。
    //      初回訪問 = practice 対象者は free tier が大半)
    //   - stage_09: 同 picker の第一候補 (10-12pc / app tier・ロック無効時)
    //   ※ book tier の pick (stage_11) は budget 超過のため見送り
    // 実測累計: ~1.5MB (608KB + 204KB + 337KB + 388KB)
    puzzle: [
      '../assets/images/puzzle/title_back2.jpg',
      '../assets/images/puzzle/stages/puzzle_stage_01_apple_leaf.jpg',
      '../assets/images/puzzle/stages/puzzle_stage_07_music_toy_box.jpg',
      '../assets/images/puzzle/stages/puzzle_stage_09_underwater_world.jpg'
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
    // 2026-07-10 trim (実測 4.8MB → 1.8MB): モーダル open 直後に必要な素材のみ残す。
    //   - daily_gacha_machine.webp (~139KB)        ← モーダル open 直後 LCP 候補
    //   - daily_gacha_room_backdrop.webp (~95KB)   ← 同時に背景表示
    //   - counter_foreground.png (~822KB)          ← open 直後のカウンター前景 (CSS bg)
    //   - capsule_closed_pink.png (~816KB)         ← play.html エントリー icon + drop capsule
    // 除外理由:
    //   - start_panel_pono_fixed.png / more_turn_bubble_generated.png は stale
    //     (play.html は *_alpha_bleed_20260629.png 版へ差し替え済で参照ゼロ)。
    //   - action_home / shop_button / reveal_bg_* 3 枚は open 後〜drop 時素材で、
    //     play.html 側の startDailyGachaImagePreload() が open 時に preload する。
    //
    // play.html からの呼び出しは相対 ('assets/…') になるため、 ここでは
    // 'assets/…' (../ 無し) を採用。 他ゲームは /<game>/index.html 配下のため
    // '../assets/…' だが、 gacha は play.html 直下なので注意。
    gacha: [
      'assets/ui/gacha/daily_gacha_machine.webp',
      'assets/ui/gacha/daily_gacha_room_backdrop.webp',
      'assets/ui/gacha/daily_gacha_counter_foreground.png',
      'assets/ui/gacha/daily_gacha_capsule_closed_pink.png'
    ],

    // ============================================================
    // Stream B finalize (2026-06-28) - 未対応ゲーム拡張
    // ------------------------------------------------------------
    // 各ゲームの初回描画 / 初回操作で critical な画像のみ列挙。
    // dynamic 選択される素材 (stage 解放後の bg / ガチャ capsule 等) は
    // 対象外。 path は /<game>/index.html からの相対 ('../assets/…')。
    // ============================================================

    // aquarium (PIXI ベース水族館 / Ocean assets)
    // 初回描画 (canvas LCP) は ocean BG のみ。 生き物 sprite は各 3 frame
    // 必要でここで warm できるのは 1/3 に留まり、 PIXI が init 時に並列
    // load するため warm から除外 (2026-07-10 実測 3.2MB → 1.7MB に trim)。
    // OceanRocks シリーズは dynamic 配置のため従来通り対象外。
    // 実測累計: ~100KB (BG_A.webp 単体 / 2026-07-10 webp 化)
    aquarium: [
      '../assets/images/ocean/BG_A.webp'
    ],

    // breakout (デフォルト解放 stage1 のみ)
    // 他 stage は unlock 条件付き / 動的選択のため対象外。
    // 実測累計: ~266KB (2026-07-10 webp 化で枠内に収まった)。
    breakout: [
      '../assets/images/Block/stage1_forest_light.webp'
    ],

    // slide (stage1 がオープニング BG。 他 stage は順次出現)
    // 推定累計: ~2.2MB (BG 1 枚のみ)
    slide: [
      '../assets/images/Slide/stage1_forest_light.png'
    ],

    // starparodier (cold start: ASSET_BASE = ../assets/images/starparodier/)
    // 初回描画はタイトル overlay の player_ship_pono.png (<img>) のみ。
    // canvas loop はスタートタップ後にしか始まらないため zako/star/moon は
    // 初回描画に乗らず warm から除外 (2026-07-10 実測 5.7MB → 1.3MB に trim)。
    // 実測累計: ~1.3MB (player_ship_pono.png 単体)
    starparodier: [
      '../assets/images/starparodier/player_ship_pono.png'
    ],

    // undersea-cave (ASSET_BASE = ../assets/images/undersea-cave/)
    // 初回描画: 洞窟内 BG 4 層 + Submarine (CSS bg で即表示)。
    // 友達生物 (whale/octopus ~650KB) は進行に応じて出会うため warm から
    // 除外 (2026-07-10 実測 3.4MB → 2.8MB に trim)。 食べ物/真珠/わかめ
    // など item も徐々に出現するため従来通り warm 不要。
    // 実測累計: ~2.4MB (BG 4 層 + Submarine が first paint 必須のため例外的に 2MB 超。
    // Submarine_003 は 2026-07-10 webp 化で ~39KB)
    'undersea-cave': [
      '../assets/images/undersea-cave/bg_ceiling.png',
      '../assets/images/undersea-cave/bg_floor_sand.png',
      '../assets/images/undersea-cave/bg_wall_near.png',
      '../assets/images/undersea-cave/bg_wall_far.png',
      '../assets/images/ocean/Submarine/Submarine_003.webp'
    ],

    // sea-album (stage1 tidepool が initial scene)
    // panorama scroll BG が初回描画のメイン。 stage2-6 は別途解放まで warm 不要。
    // 実測累計: ~2.4MB (BG ~2.2MB が first paint 必須のため例外的に 2MB 超、
    // 生き物 3 種は計 ~170KB で initial scene の interactive 要素)
    'sea-album': [
      '../assets/images/sea-album/stage1/stage1_tidepool_background.png',
      '../assets/images/sea-album/stage1/hermit_crab_normal.png',
      '../assets/images/sea-album/stage1/shrimp_normal.png',
      '../assets/images/sea-album/stage1/sea_star_normal.png'
    ],

    // wordmatch (forestdex)
    // タイトル画面: title_logo + title_back.jpg のみが初回描画。
    // gameplay_frame (~1.9MB) はスタートタップ後のゲーム画面素材のため
    // warm から除外 (2026-07-10 実測 3.1MB → 1.3MB に trim)。
    // collection_frame も図鑑ボタンタップ後のため従来通り対象外。
    // 実測累計: ~1.3MB (title_logo ~950KB + title_back ~364KB)
    wordmatch: [
      '../assets/images/wordmatch/title_logo.png',
      '../assets/images/wordmatch/title_back.jpg'
    ],

    // shop (ポノのお店 - exterior が初回シーン)
    // counter は店内入場後のため対象外。
    // 実測累計: ~2.7MB (exterior.png 単体 / first paint 必須のため例外的に 2MB 超)。
    shop: [
      '../assets/images/shop/exterior.png'
    ],

    // zukan (もりのずかん SPA)
    // 初回描画 (screen-title) は title_bg + title_logo のみ。
    // outer 21:9 BG / world_map (~2.9MB) は「はじめる」タップ後の
    // screen-mapselect でしか出ないため warm から除外
    // (2026-07-10 実測 6.2MB → 2.2MB に trim)。
    // 実測累計: ~345KB (title_bg ~197KB + title_logo ~149KB / 2026-07-10 webp 化)
    zukan: [
      '../assets/zukan/title/title_bg.webp',
      '../assets/zukan/title/title_logo.webp'
    ],

    // bubble (シャボン玉パーティー / 小規模)
    // 主要素材は pono face のみ (~50KB)
    bubble: [
      '../assets/images/characters/pono/pono_face_circle.png'
    ],

    // bowling (デフォルト解放 bg は circuit / colorful)
    // pins/ は同一ディレクトリで bowling/pins/ にあるため warm 不要 (即時参照)。
    // 実測累計: ~320KB (webp 2 枚)
    bowling: [
      '../assets/images/Bowling/BG/boy/circuit.webp',
      '../assets/images/Bowling/BG/girl/colorful.webp'
    ],

    // coloring (ぬりえ - selection 画面が最初)
    // selection BG (BG_03.webp) + nurie001 (デフォルト onload)。
    // 実測累計: ~165KB
    coloring: [
      '../assets/images/BG_03.webp',
      '../assets/images/nurie001.webp'
    ],

    // drawing (おえかき - canvas + キャラクター)
    // 背景 BG_03 + ポノ 側面立ち絵。 アイコン群は CSS で読まれる。
    // 実測累計: ~80KB
    drawing: [
      '../assets/images/BG_03.webp',
      '../assets/images/characters/pono_side_fullbody.webp'
    ],

    // message (作者より - 静的ページ)
    // 共通 BG + ポノ立ち絵のみ。 実測累計: ~80KB
    message: [
      '../assets/images/BG_03.webp',
      '../assets/images/characters/pono_side_fullbody.webp'
    ],

    // egg (たまごのにわ - yard scene が最初)
    // PIXI.Assets.load で green_sm.webp / hatake_crop.webp を順に load。
    // 実測累計: ~35KB
    egg: [
      '../assets/images/yard/green_sm.webp',
      '../assets/images/yard/hatake_crop.webp'
    ],

    // fossil (かせきはっくつ - pono dance + hedgehog)
    // canvas dig 画面で imgPono / dance スプライト群が即使われる。
    // 実測累計: ~1.1MB
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
    scheduleBgmRetry: function (el) {
      try {
        if (global.PonoVisibilityAudioGuard && typeof global.PonoVisibilityAudioGuard.scheduleBgmRetry === 'function') {
          global.PonoVisibilityAudioGuard.scheduleBgmRetry(el);
        }
      } catch (_) {}
    },
    BOTTOM_NAV_PRESSED_URLS: BOTTOM_NAV_PRESSED_URLS,
    GAME_WARM_ASSETS: GAME_WARM_ASSETS
  };
})(typeof window !== 'undefined' ? window : this);
