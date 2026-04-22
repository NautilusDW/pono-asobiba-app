// どんぐりポイント（pono_acorns）ストレージAPI
// writing 他ゲームから共通で使えるグローバルモジュール
(function(window) {
  'use strict';

  var LS_KEY = 'pono_acorns';
  var DAILY_PREFIX = 'pono_acorns_daily_';

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

  // ===== 日次キャップ API =====
  // 目的: 1 ゲーム = 1 日 N 個まで、というエンゲージ設計のため。
  // LS key: pono_acorns_daily_<gameId>_<YYYY-MM-DD>
  function todayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function dailyLSKey(gameId) {
    return DAILY_PREFIX + String(gameId || 'unknown') + '_' + todayKey();
  }

  function getDaily(gameId) {
    var v = parseInt(localStorage.getItem(dailyLSKey(gameId)) || '0', 10);
    return isNaN(v) ? 0 : v;
  }

  function setDaily(gameId, n) {
    localStorage.setItem(dailyLSKey(gameId), String(Math.max(0, n | 0)));
  }

  // addAcornsDaily(gameId, n, cap, opts)
  //   今日の残り枠内でだけ付与。超過分は 0 個。
  //   戻り値: 実際に付与した個数 (0 なら cap 到達)
  function addDaily(gameId, n, cap, opts) {
    var wanted = n | 0;
    var limit = (cap | 0) > 0 ? (cap | 0) : 5;
    if (wanted <= 0) return 0;
    var already = getDaily(gameId);
    var remaining = Math.max(0, limit - already);
    var grant = Math.min(wanted, remaining);
    if (grant <= 0) return 0;
    setDaily(gameId, already + grant);
    add(grant, {
      reason: (opts && opts.reason) || ('daily:' + gameId)
    });
    return grant;
  }

  window.getAcorns       = get;
  window.addAcorns       = add;
  window.spendAcorns     = spend;
  window.getDailyAcorns  = getDaily;
  window.addAcornsDaily  = addDaily;
})(window);
