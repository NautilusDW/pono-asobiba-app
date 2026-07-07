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
  //
  // v2028 hardening (batch:1058-sw-toast-fix, 2026-07-07): 「何度も繰り返される」
  // 緊急バグ修正。 これまでの batch:1203 (v2007) sessionStorage 実装だけでは、
  // (a) 'activated' state で session フラグを毎回クリアするため、 controllerchange→
  // reload→ 次の updatefound で 再表示、 (b) sessionStorage は tab close で消える、
  // (c) 一度 close × した後の同一 waiting SW が reg.update() poll (5min/visibility)
  // で updatefound を再発火した場合の抑制なし、 の 3 経路で ゲームに入れない
  // 「トースト連発ループ」 が発生していた。
  //
  // 修正: localStorage 主体の 「一度出したら 24h 抑制 + user 明示的 dismiss は永久抑制
  // (次の activate まで) 」 の 2 段防御に切替。 sessionStorage は互換のため残置。
  //
  // z-index 階層 (上から下): catch-up overlay (2147483647) > toast (2147483646) > tap-intro (99999) > splash (1000)
  var TOAST_SESSION_KEY = 'pono_sw_toast_shown_session';
  // localStorage: 「最後に toast を出した時刻 (ms)」。 24h 以内は再表示しない。
  var TOAST_LAST_SHOWN_KEY = 'pono_sw_toast_last_shown_at';
  // localStorage: 「user が × / 今すぐ更新 を明示的に押した」 dismissal flag。
  // このフラグは 次回 activate 成功時にだけクリアされる (完全同意消化)。
  var TOAST_DISMISSED_KEY = 'pono_sw_toast_dismissed_ack';
  var TOAST_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
  function hasShownToastThisSession() {
    try { return sessionStorage.getItem(TOAST_SESSION_KEY) === '1'; } catch (e) { return false; }
  }
  function markToastShownThisSession() {
    try { sessionStorage.setItem(TOAST_SESSION_KEY, '1'); } catch (e) {}
  }
  function clearToastShownFlag() {
    try { sessionStorage.removeItem(TOAST_SESSION_KEY); } catch (e) {}
  }
  function hasUserDismissedToast() {
    try { return localStorage.getItem(TOAST_DISMISSED_KEY) === '1'; } catch (e) { return false; }
  }
  function markUserDismissedToast() {
    try { localStorage.setItem(TOAST_DISMISSED_KEY, '1'); } catch (e) {}
  }
  function clearUserDismissedFlag() {
    try { localStorage.removeItem(TOAST_DISMISSED_KEY); } catch (e) {}
  }
  function isToastInCooldown() {
    try {
      var raw = localStorage.getItem(TOAST_LAST_SHOWN_KEY);
      if (!raw) return false;
      var at = parseInt(raw, 10);
      if (!at || isNaN(at)) return false;
      var diff = Date.now() - at;
      // 未来時刻 (時計ズレ) は 0 扱いで抑制なし
      if (diff < 0) return false;
      return diff < TOAST_COOLDOWN_MS;
    } catch (e) { return false; }
  }
  function markToastLastShown() {
    try { localStorage.setItem(TOAST_LAST_SHOWN_KEY, String(Date.now())); } catch (e) {}
  }
  function clearToastLastShown() {
    try { localStorage.removeItem(TOAST_LAST_SHOWN_KEY); } catch (e) {}
  }
  var toastShown = false;
  var currentToastEl = null;
  function removeToastEl() {
    if (currentToastEl && currentToastEl.parentNode) {
      currentToastEl.parentNode.removeChild(currentToastEl);
    }
    currentToastEl = null;
  }
  // SW が activated まで進んだら「更新は解消された」とみなし toast を自動で消す。
  // v2028: 併せて localStorage 側の cooldown / dismissal flag もクリアし、
  // 将来また別の新バージョンが来た時に (一度だけ) 再度案内できるようにする。
  // sessionStorage フラグはクリアしても loop を再発させないため、 24h cooldown が
  // 「その日は静かに」 を保証する。
  function watchForActivation(worker) {
    if (!worker) return;
    worker.addEventListener('statechange', function () {
      if (worker.state === 'activated') {
        removeToastEl();
        toastShown = false;
        clearToastShownFlag();
        clearUserDismissedFlag();
        clearToastLastShown();
      }
    });
  }
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
    if (hasShownToastThisSession()) return;
    // v2028 hardening: user が明示的に閉じた/今すぐ更新押した後は、 activate が
    // 完了するまで (= 消化されるまで) 一切再表示しない。 activate 完了時に
    // watchForActivation() 側でこのフラグはクリアされる。
    if (hasUserDismissedToast()) return;
    // v2028 hardening: session storage が失われた場合 (tab close / private mode / 別 tab)
    // でも 24h 以内に一度出したなら再表示しない。 これで controllerchange→ reload→
    // updatefound→ 再表示のループを断ち切る。
    if (isToastInCooldown()) return;
    toastShown = true;
    markToastShownThisSession();
    markToastLastShown();
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
      // v2028 hardening: user がタップした瞬間に dismissal flag を立てる。
      // 万一 SKIP_WAITING → activate → controllerchange が失敗しても、 その後の
      // updatefound / reload では toast を再表示しない (activate 成功時のみクリア)。
      markUserDismissedToast();
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
      // v2028 hardening: × で閉じたら activate まで再表示しない (user 明示的 dismiss)。
      markUserDismissedToast();
      removeToastEl();
    });
    el.appendChild(label);
    el.appendChild(goBtn);
    el.appendChild(closeBtn);
    try {
      document.body.appendChild(el);
      currentToastEl = el;
    } catch (e) {
      // v2028 hardening: appendChild が失敗しても cooldown フラグは残す (再表示させない)。
      // 唯一残念だが、 render 事故は user が誰も見てない状態なので次回訪問時に静かに
      // 再検討させる方が spam より安全。 in-memory + session だけリセットで十分。
      toastShown = false;
      currentToastEl = null;
      clearToastShownFlag();
    }
  }

  // ── Register + update poll ──
  function bind(reg) {
    if (!reg) return;

    // If a waiting SW already exists at load time (e.g. user refreshed after
    // last visit installed a new SW), surface the toast immediately.
    if (reg.waiting && navigator.serviceWorker.controller) {
      watchForActivation(reg.waiting);
      showUpdateToast(reg);
    }

    reg.addEventListener('updatefound', function () {
      var nw = reg.installing;
      if (!nw) return;
      // このワーカーが installed → activated まで進む一生を通して監視し、
      // activated に到達したら (toast を出したページかどうかに関わらず) 自動 dismiss する。
      watchForActivation(nw);
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
    // Capacitor native shell (native/www) has no sw.js -- skip registration entirely.
    // See native/scripts/stage-www.mjs (window.__NATIVE_BUILD__ injection).
    if (window.__NATIVE_BUILD__) return;
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
