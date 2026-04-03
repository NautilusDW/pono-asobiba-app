// ─── ポイントシステム（廃止済み）───────────────────────────────
// ポイント制は廃止。実績解除で直接報酬をもらえる仕組みに移行。
// 各ゲームからの awardPoints() 呼び出しは残っているため、空関数として維持。
(function () {
  'use strict';
  window.awardPoints = function () { return 0; };
  window.getPonoPoints = function () { return 0; };
})();
