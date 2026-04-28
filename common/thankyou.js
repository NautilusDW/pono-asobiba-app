// ありがとう カウンター (v266 テーマ統合: 絵本「ありがとうって、うれしいね」のテーマを
// ゲーム内で可視化する)。精霊浄化・妖精救出で加算、タイトル画面とエンディングで表示。
// writing その他のゲームから window.addThankYou / window.getThankYou で共通アクセス。
(function(window) {
  'use strict';

  var LS_KEY = 'pono_thankyou';

  function get() {
    var n = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
    return isNaN(n) ? 0 : n;
  }

  function set(n) {
    localStorage.setItem(LS_KEY, String(Math.max(0, n | 0)));
  }

  function add(n, opts) {
    // MVP: ありがとうカウンタを LS に書き込まない。
    if (window.PONO_MVP_NO_REWARDS) return 0;
    var delta = n | 0;
    if (delta === 0) return get();
    var before = get();
    var after = Math.max(0, before + delta);
    set(after);
    try {
      window.dispatchEvent(new CustomEvent('pono-thankyou-changed', {
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

  function reset() {
    set(0);
    try { window.dispatchEvent(new CustomEvent('pono-thankyou-changed', { detail: { before: 0, after: 0, delta: 0, reason: 'reset' } })); } catch (e) {}
  }

  window.getThankYou = get;
  window.addThankYou = add;
  window.resetThankYou = reset;
})(window);
