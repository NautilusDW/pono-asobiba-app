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

  // ---- App 固定設定: bottom-nav pressed 4 枚 ----
  // play.html FV preload からは外したが、 最初のタップで decoded されて
  // いてほしい素材。 normal sprite は <link rel=preload> に残してある。
  var BOTTOM_NAV_PRESSED_URLS = [
    'assets/ui/title/title_bottom_nav_4_pressed_help_masked_20260626.png',
    'assets/ui/title/title_bottom_nav_4_pressed_news_masked_20260626.png',
    'assets/ui/title/title_bottom_nav_4_pressed_stickers_masked_20260626.png',
    'assets/ui/title/title_bottom_nav_4_pressed_settings_masked_20260626.png'
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

  // 外部公開 (他ページから手動でも呼べるよう)
  global.PonoPreload = {
    inject: injectPreload,
    defer: deferPreload,
    BOTTOM_NAV_PRESSED_URLS: BOTTOM_NAV_PRESSED_URLS
  };
})(typeof window !== 'undefined' ? window : this);
