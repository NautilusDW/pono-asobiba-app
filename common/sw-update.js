// ── common/sw-update.js ──
// Shared passive Service Worker update flow.
//
// Design (intentionally conservative):
// - sw.js still does NOT skipWaiting on install (keeps existing safe lifecycle).
// - This script registers /sw.js, polls reg.update() on load + every 5 minutes
//   + on tab refocus.
// - Waiting updates are left passive. No in-page prompt is rendered, so title
//   cards and game controls never lose taps to update UI.
// - Auto-reload on controllerchange is preserved for legacy already-open pages,
//   guarded against double-reload.
//
// Usage (inline, before </body>):
//   <script src="/common/sw-update.js" defer></script>
// (or relative path from sub-directories: "../common/sw-update.js")
//
// Safe to load multiple times — guarded with window._ponoSwUpdateInited.

(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;
  if (window._ponoSwUpdateInited) return;
  window._ponoSwUpdateInited = true;

  // Claude preview sandbox: skip SW entirely + purge.
  try {
    if (/claudeusercontent\.com$/.test(location.hostname)) {
      navigator.serviceWorker.getRegistrations()
        .then(function (rs) { rs.forEach(function (r) { r.unregister(); }); })
        .catch(function () {});
      if (window.caches && caches.keys) {
        caches.keys()
          .then(function (keys) { keys.forEach(function (k) { caches.delete(k); }); })
          .catch(function () {});
      }
      return;
    }
  } catch (e) {}

  // ── Auto-reload guard (controllerchange fires after SKIP_WAITING) ──
  // Gesture-aware: if a pointer/keyboard interaction is in flight, delay the
  // reload so a user click can navigate first instead of being eaten by reload.
  var POINTER_GUARD_MS = 1500;
  var RELOAD_DEADLINE_MS = 8000;
  var lastPointerTs = 0;
  var reloadStartTs = 0;
  try {
    ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend', 'keydown'].forEach(function (ev) {
      document.addEventListener(ev, function () { lastPointerTs = Date.now(); }, { capture: true, passive: true });
    });
  } catch (e) {}
  // navigation 中 (ブラウザが別ページへ遷移中) は reload しない。
  // reload が pending navigation をキャンセルして元のページに戻すバグを防ぐ。
  var isNavigating = false;
  // beforeunload ダイアログで user が「Stay」 を選んでナビゲーションがキャンセルされた場合、
  // pageshow が fire しないので、 タイマー reset で stuck 状態を回避。
  // 5 秒以内に navigation が実際に起きれば、 ページがアンロードされて timer は無関係になる。
  function scheduleNavigationReset() {
    setTimeout(function () { isNavigating = false; }, 5000);
  }
  try {
    window.addEventListener('beforeunload', function () {
      isNavigating = true;
      scheduleNavigationReset();
    }, { capture: true });
    window.addEventListener('pagehide', function () {
      isNavigating = true;
      scheduleNavigationReset();
    }, { capture: true });
    // bfcache (back-forward cache) からの復元時に isNavigating を解除。
    // pageshow は通常 load 時にも fire するので、 persisted フラグに関わらず常に reset で安全側。
    window.addEventListener('pageshow', function () {
      isNavigating = false;
    }, { capture: true });
  } catch (e) {}
  var refreshing = false;
  function safeReload() {
    if (refreshing) return;
    if (isNavigating) return;  // navigation 中は reload しない (race 防止)
    if (reloadStartTs === 0) reloadStartTs = Date.now();
    var sinceStart = Date.now() - reloadStartTs;
    if (sinceStart < RELOAD_DEADLINE_MS && (Date.now() - lastPointerTs) < POINTER_GUARD_MS) {
      setTimeout(safeReload, POINTER_GUARD_MS);
      return;
    }
    if (isNavigating) return;  // setTimeout 経過中に navigation が始まった場合の最終ガード
    refreshing = true;
    window.location.reload();
  }
  function reloadOnce() { safeReload(); }
  navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);
  // iOS PWA: legacy fallback path used elsewhere in the codebase.
  navigator.serviceWorker.addEventListener('message', function (e) {
    if (e && e.data && e.data.type === 'sw-updated') reloadOnce();
  });

  // ── Passive waiting updates ──
  // Waiting SWs are intentionally quiet. The next natural page load, tab close,
  // or the settings refresh button can adopt the new worker without interrupting
  // title-card taps or in-game input.
  function noteWaitingUpdate() {}

  // ── Register + update poll ──
  function bind(reg) {
    if (!reg) return;

    if (reg.waiting && navigator.serviceWorker.controller) {
      noteWaitingUpdate(reg.waiting);
    }

    reg.addEventListener('updatefound', function () {
      var nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', function () {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          noteWaitingUpdate(nw);
        }
      });
    });

    // Poll: every 5 min + on visibility regain.
    var poll = function () { try { reg.update(); } catch (e) {} };
    setInterval(poll, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') poll();
    });
  }

  function start() {
    // Capacitor native shell (native/www) has no sw.js -- skip registration entirely.
    // See native/scripts/stage-www.mjs (window.__NATIVE_BUILD__ injection).
    if (window.__NATIVE_BUILD__) return;
    navigator.serviceWorker.register('/sw.js')
      .then(function (reg) {
        // register() 自体が update check を schedule するため (HTML spec の Register →
        // Update job)、 直後の reg.update() は sw.js の二重 fetch にしかならず削除
        // (2026-07-10)。 5分毎 + visibilitychange の poll は bind() 内で継続。
        bind(reg);
      })
      .catch(function () {});
  }

  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start, { once: true });
  }
})();
