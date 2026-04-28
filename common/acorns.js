// どんぐりポイント（pono_acorns）ストレージAPI
// writing 他ゲームから共通で使えるグローバルモジュール
(function(window) {
  'use strict';

  var LS_KEY = 'pono_acorns';
  var DAILY_PREFIX = 'pono_acorns_daily_';
  var DAILY_TOTAL_PREFIX = 'pono_acorns_daily_total_';
  var TOTAL_CAP_FREE = 25;
  var TOTAL_CAP_PAID = 35;

  function get() {
    var n = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
    return isNaN(n) ? 0 : n;
  }

  function set(n) {
    localStorage.setItem(LS_KEY, String(Math.max(0, n | 0)));
  }

  function add(n, opts) {
    // MVP: どんぐりを LS に書き込まない。get() は 0 のまま。
    if (window.PONO_MVP_NO_REWARDS) return 0;
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

  // ===== 1 日トータル上限 =====
  // 子供が長時間張り付くのを防ぐため、ゲーム別 cap に加えて全体でも上限を設定。
  // 無料ユーザー 25/日、有料 (pono_premium='1') 35/日。
  function dailyTotalLSKey() {
    return DAILY_TOTAL_PREFIX + todayKey();
  }
  function getDailyTotal() {
    var v = parseInt(localStorage.getItem(dailyTotalLSKey()) || '0', 10);
    return isNaN(v) ? 0 : v;
  }
  function setDailyTotal(n) {
    localStorage.setItem(dailyTotalLSKey(), String(Math.max(0, n | 0)));
  }
  function currentTotalCap() {
    try {
      return localStorage.getItem('pono_premium') === '1' ? TOTAL_CAP_PAID : TOTAL_CAP_FREE;
    } catch (e) { return TOTAL_CAP_FREE; }
  }

  // addAcornsDaily(gameId, n, cap, opts)
  //   ゲーム別 cap と 1 日トータル上限の両方を満たす分だけ付与。
  //   戻り値: 実際に付与した個数 (0 なら どちらかの cap 到達)
  function addDaily(gameId, n, cap, opts) {
    // MVP: 日次キャップ判定もスキップ、加算もしない。各ゲームの clear モーダルは
    // 戻り値 0 を受けて「+0」表示になるが、その表示自体は CSS で隠してある。
    if (window.PONO_MVP_NO_REWARDS) return 0;
    var wanted = n | 0;
    var gameLimit = (cap | 0) > 0 ? (cap | 0) : 5;
    if (wanted <= 0) return 0;
    var already = getDaily(gameId);
    var gameRemaining = Math.max(0, gameLimit - already);
    var totalAlready = getDailyTotal();
    var totalRemaining = Math.max(0, currentTotalCap() - totalAlready);
    var grant = Math.min(wanted, gameRemaining, totalRemaining);
    if (grant <= 0) return 0;
    setDaily(gameId, already + grant);
    setDailyTotal(totalAlready + grant);
    add(grant, {
      reason: (opts && opts.reason) || ('daily:' + gameId)
    });
    return grant;
  }

  window.getAcorns           = get;
  window.addAcorns           = add;
  window.spendAcorns         = spend;
  window.getDailyAcorns      = getDaily;
  window.addAcornsDaily      = addDaily;
  window.getDailyTotalAcorns = getDailyTotal;
  window.getDailyTotalCap    = currentTotalCap;
})(window);
