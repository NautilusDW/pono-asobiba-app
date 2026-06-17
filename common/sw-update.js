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
  var refreshing = false;
  function reloadOnce() {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  }
  navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);
  // iOS PWA: legacy fallback path used elsewhere in the codebase.
  navigator.serviceWorker.addEventListener('message', function (e) {
    if (e && e.data && e.data.type === 'sw-updated') reloadOnce();
  });

  // ── Register + update poll ──
  function bind(reg) {
    if (!reg) return;

    reg.addEventListener('updatefound', function () {
      var nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', function () {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          // New SW is waiting AND a controller already exists. Do not render an
          // update prompt; the next natural page load will pick it up.
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
    navigator.serviceWorker.register('/sw.js')
      .then(function (reg) {
        try { reg.update(); } catch (e) {}
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
