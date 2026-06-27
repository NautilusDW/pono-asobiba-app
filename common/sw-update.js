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

  // ── Toast UI (opt-in "今すぐ更新" button) ──
  // Fix 4 (2026-06-28): waiting SW がある時のみ表示される小さなトースト。
  // Rendered only when a waiting SW exists. Tapping the button posts
  // SKIP_WAITING to reg.waiting → controllerchange → safeReload().
  // The toast is small, fixed bottom-right, and dismissible. It never blocks
  // the title screen or game controls because pointer-events are scoped to
  // the toast element only.
  // z-index 階層 (上から下): catch-up overlay (2147483647) > toast (2147483646) > tap-intro (99999) > splash (1000)
  // toastShown フラグで多重表示を防止 (showUpdateToast() が複数回呼ばれても 1 つだけ)
  var toastShown = false;
  function ensureToastStyle() {
    if (document.getElementById('pono-sw-toast-style')) return;
    var style = document.createElement('style');
    style.id = 'pono-sw-toast-style';
    style.textContent = [
      '.pono-sw-toast{position:fixed;right:12px;bottom:12px;z-index:2147483646;',
      'background:rgba(20,24,32,0.92);color:#fff;border-radius:12px;',
      'padding:10px 12px 10px 14px;font:600 13px/1.4 system-ui,sans-serif;',
      'box-shadow:0 6px 20px rgba(0,0,0,0.35);display:flex;align-items:center;gap:10px;',
      'max-width:calc(100vw - 24px);animation:ponoSwToastIn .25s ease both;}',
      '.pono-sw-toast button{font:600 13px/1 system-ui,sans-serif;border:0;cursor:pointer;',
      'border-radius:8px;padding:8px 12px;}',
      '.pono-sw-toast .pono-sw-toast-go{background:#3ecf6f;color:#0a1812;}',
      '.pono-sw-toast .pono-sw-toast-go:active{transform:translateY(1px);}',
      '.pono-sw-toast .pono-sw-toast-close{background:transparent;color:#cfd6e0;padding:6px 8px;}',
      '@keyframes ponoSwToastIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}'
    ].join('');
    document.head.appendChild(style);
  }
  function showUpdateToast(reg) {
    if (toastShown) return;
    if (!reg || !reg.waiting) return;
    toastShown = true;
    ensureToastStyle();
    var el = document.createElement('div');
    el.className = 'pono-sw-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    var label = document.createElement('span');
    label.textContent = 'あたらしい バージョンが あります';
    var goBtn = document.createElement('button');
    goBtn.type = 'button';
    goBtn.className = 'pono-sw-toast-go';
    goBtn.textContent = '今すぐ更新';
    goBtn.addEventListener('click', function () {
      try {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      } catch (e) {}
      // controllerchange → safeReload() に任せる。 ただし旧 SW が返事しない場合の
      // safety-net として 4 秒後に強制 reload。
      setTimeout(function () { safeReload(); }, 4000);
      goBtn.disabled = true;
      goBtn.textContent = '更新中...';
    });
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'pono-sw-toast-close';
    closeBtn.setAttribute('aria-label', '閉じる');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    el.appendChild(label);
    el.appendChild(goBtn);
    el.appendChild(closeBtn);
    try { document.body.appendChild(el); } catch (e) { toastShown = false; }
  }

  // ── Register + update poll ──
  function bind(reg) {
    if (!reg) return;

    // If a waiting SW already exists at load time (e.g. user refreshed after
    // last visit installed a new SW), surface the toast immediately.
    if (reg.waiting && navigator.serviceWorker.controller) {
      showUpdateToast(reg);
    }

    reg.addEventListener('updatefound', function () {
      var nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', function () {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          // New SW is waiting AND a controller already exists.
          // Surface a small, non-blocking toast with an opt-in update button.
          showUpdateToast(reg);
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
