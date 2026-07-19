// ===== PonoAssist Hook Registry (init) =====
//
// Phase 1 の partner assist 群 (assists/*.js) を main.js より前に初期化するための
// 最小レジストリ。main.js は使う側 (runAssistHooks/getCurrentPartner) だけを保持し、
// register API はこのファイルが用意する。
//
// フック種別:
//   beforeStageStart(ctx)
//   afterStageReady(ctx)
//   duringDrag(ctx)
//   beforeSnap(ctx)            — false を返すとスナップキャンセル
//   afterSnap(ctx)
//   drawOverlay(ctx)
//   beforeShowSuccess(ctx)
//   afterShowSuccess(ctx)
//
// このファイルは idempotent: 既存の window.PonoAssistHooks を上書きしない。
// register はその時点の配列に push するだけ。
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  if (!window.PonoAssistHooks) {
    window.PonoAssistHooks = {
      beforeStageStart: [],
      afterStageReady: [],
      duringDrag: [],
      beforeSnap: [],
      afterSnap: [],
      drawOverlay: [],
      beforeShowSuccess: [],
      afterShowSuccess: [],
    };
  } else {
    // 念のため不足キーを補完 (idempotent)
    var keys = [
      'beforeStageStart', 'afterStageReady', 'duringDrag', 'beforeSnap',
      'afterSnap', 'drawOverlay', 'beforeShowSuccess', 'afterShowSuccess'
    ];
    for (var i = 0; i < keys.length; i++) {
      if (!Array.isArray(window.PonoAssistHooks[keys[i]])) {
        window.PonoAssistHooks[keys[i]] = [];
      }
    }
  }

  if (!window.PonoAssistRegister) {
    window.PonoAssistRegister = function (hookName, fn) {
      if (!window.PonoAssistHooks[hookName]) window.PonoAssistHooks[hookName] = [];
      if (typeof fn === 'function') window.PonoAssistHooks[hookName].push(fn);
    };
  }
})();
