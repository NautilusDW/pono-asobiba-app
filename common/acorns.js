// どんぐりポイント（pono_acorns）ストレージAPI
// writing 他ゲームから共通で使えるグローバルモジュール
(function(window) {
  'use strict';

  var LS_KEY = 'pono_acorns';

  function get() {
    var n = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
    return isNaN(n) ? 0 : n;
  }

  function set(n) {
    localStorage.setItem(LS_KEY, String(Math.max(0, n | 0)));
  }

  function add(n, opts) {
    var delta = n | 0;
    if (delta === 0) return get();
    var before = get();
    var after = Math.max(0, before + delta);
    set(after);
    try {
      window.dispatchEvent(new CustomEvent('pono-acorns-changed', {
        detail: {
          before: before,
          after: after,
          delta: after - before,
          reason: (opts && opts.reason) || ''
        }
      }));
    } catch (e) { /* older browsers */ }
    return after;
  }

  function spend(n) {
    var cost = n | 0;
    if (cost <= 0) return true;
    if (get() < cost) return false;
    add(-cost, { reason: 'spend' });
    return true;
  }

  window.getAcorns   = get;
  window.addAcorns   = add;
  window.spendAcorns = spend;
})(window);
