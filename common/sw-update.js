// ── common/sw-update.js ──
// Shared opt-in Service Worker update flow.
//
// Design (intentionally conservative):
// - sw.js still does NOT skipWaiting on install (keeps existing safe lifecycle).
// - This script registers /sw.js, polls reg.update() on load + every 5 minutes
//   + on tab refocus.
// - When a waiting SW is detected, a small bottom-center toast is shown:
//     "あたらしい バージョンがあるよ。タップで はんえい"
//   The user must tap to apply -> we postMessage SKIP_WAITING -> the SW
//   activates -> controllerchange fires -> reload once.
// - Auto-reload on controllerchange is preserved (it only fires after the
//   user explicitly opts in), guarded against double-reload.
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

  // ── Toast UI (single instance, no external CSS file) ──
  var toastEl = null;
  function ensureToast() {
    if (toastEl) return toastEl;
    var style = document.createElement('style');
    style.textContent = [
      '.pono-sw-toast{',
      '  position:fixed;left:50%;bottom:max(20px,env(safe-area-inset-bottom));',
      '  transform:translate(-50%,140%);',
      '  z-index:2147483600;',
      '  max-width:min(92vw,420px);',
      '  padding:12px 18px;',
      '  background:rgba(20,24,32,0.86);color:#fff;',
      '  font:600 14px/1.4 -apple-system,BlinkMacSystemFont,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;',
      '  border-radius:999px;',
      '  box-shadow:0 6px 24px rgba(0,0,0,0.32);',
      '  cursor:pointer;-webkit-tap-highlight-color:transparent;',
      '  opacity:0;pointer-events:none;',
      '  transition:transform .28s ease,opacity .28s ease;',
      '  text-align:center;letter-spacing:.02em;',
      '}',
      '.pono-sw-toast.show{transform:translate(-50%,0);opacity:1;pointer-events:auto;}',
      '.pono-sw-toast:active{transform:translate(-50%,0) scale(.97);}'
    ].join('');
    document.head.appendChild(style);

    toastEl = document.createElement('div');
    toastEl.className = 'pono-sw-toast';
    toastEl.setAttribute('role', 'button');
    toastEl.setAttribute('aria-live', 'polite');
    toastEl.textContent = 'あたらしい バージョンがあるよ。タップで はんえい';
    document.body.appendChild(toastEl);
    return toastEl;
  }

  function showToastFor(worker) {
    var el = ensureToast();
    if (!el) return;
    var apply = function () {
      el.removeEventListener('click', apply);
      el.style.pointerEvents = 'none';
      try {
        if (worker && worker.postMessage) {
          worker.postMessage({ type: 'SKIP_WAITING' });
        }
      } catch (e) {}
      // controllerchange should fire and reload; if not (e.g. orphan SW),
      // fall back to a manual reload after a short grace period.
      setTimeout(reloadOnce, 1500);
    };
    el.addEventListener('click', apply);
    // Defer to next frame so the transform transition plays.
    requestAnimationFrame(function () { el.classList.add('show'); });
  }

  // ── Register + update poll ──
  function bind(reg) {
    if (!reg) return;

    // Already waiting at register time? -> offer toast immediately.
    if (reg.waiting && navigator.serviceWorker.controller) {
      showToastFor(reg.waiting);
    }

    reg.addEventListener('updatefound', function () {
      var nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', function () {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          // New SW is waiting AND a controller already exists -> this is an
          // update (not first install). Prompt the user.
          showToastFor(nw);
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
