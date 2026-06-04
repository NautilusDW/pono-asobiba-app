// PonoAssist — フクロウ「ものしりレントゲン」
//
// パートナー 'fukurou' がアクティブな時、ステージ開始時に 1回だけ
// 完成形のシルエット (X-Ray プレビュー) を約 2.5 秒間透過表示する補助機能。
//
// 段階開示 (PonoBond Lv ベース):
//   Lv 0-1: 黒シルエットのみ
//   Lv 2  : シルエット + ぼんやりとしたグレースケール プレビュー
//   Lv 3  : シルエット + グレースケール + STAGES[stage].title テキスト表示
//
// 設計方針:
//   - main.js の private 変数 (boardX/Y/W/H, sourceImg, redraw) には触らない。
//   - 専用のオーバーレイ canvas を puzzle-container に重ね、 自前で rAF ループ。
//     これにより main.js の描画タイミング (event 駆動) に依存せずフェード演出を行える。
//   - 1ステージ1回。 同一 stageIndex × stageId に戻った時はスキップ。
//   - 例外は呼び出し元 (runAssistHooks) で握りつぶされるが、 ここでも try/catch で守る。
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof window.PonoAssistRegister !== 'function') {
    return;
  }

  var DURATION_MS  = 2500;   // 表示時間 (フェード含む)
  var FADE_MS      = 350;    // フェードイン/アウト
  var BOARD_W_RATIO = 0.50;  // main.js initPuzzle と同じ係数
  var BOARD_H_RATIO = 0.60;
  var OVERLAY_ID   = 'pono-fukurou-xray-overlay';

  // モジュール内ステート
  var state = {
    canvas: null,
    ctx: null,
    rafId: 0,
    startTime: 0,
    endTime: 0,
    level: 0,
    stageTitle: '',
    image: null,
  };

  // 表示済みステージキーの記録 (同一セッション内で同一ステージへ戻った時はスキップ)
  var shownStageKeys = Object.create(null);

  function now() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : Date.now();
  }

  function stageBondLevel(partnerId, stageId) {
    try {
      if (window.PonoBond && typeof window.PonoBond.getLevel === 'function') {
        var lv = window.PonoBond.getLevel(partnerId, stageId);
        if (typeof lv === 'number' && lv >= 0) return lv;
      }
    } catch (_) { /* noop */ }
    return 0;
  }

  // 画像の事前ロード (browser cache 済みなら即時解決)
  function loadImage(src) {
    return new Promise(function (resolve) {
      if (!src) return resolve(null);
      var img = new Image();
      img.onload  = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      try { img.crossOrigin = 'anonymous'; } catch (_) {}
      img.src = src;
    });
  }

  // canvas + image アスペクトから board 矩形を再計算 (main.js initPuzzle と同じ式)
  function computeBoardRect(canvasW, canvasH, img) {
    var boardMaxW = canvasW * BOARD_W_RATIO;
    var boardMaxH = canvasH * BOARD_H_RATIO;
    var imgAspect = (img && img.naturalWidth && img.naturalHeight)
      ? img.naturalWidth / img.naturalHeight
      : 1;
    var bw = Math.min(boardMaxW, boardMaxH * imgAspect);
    var bh = bw / imgAspect;
    if (bh > boardMaxH) { bh = boardMaxH; bw = bh * imgAspect; }
    var bx = (canvasW - bw) / 2;
    var by = (canvasH - bh) / 2;
    return { x: bx, y: by, w: bw, h: bh };
  }

  // 0..1 alpha カーブ (フェードイン → 維持 → フェードアウト)
  function fadeAlpha(t) {
    if (t < state.startTime) return 0;
    if (t >= state.endTime)  return 0;
    var elapsed   = t - state.startTime;
    var remaining = state.endTime - t;
    if (elapsed < FADE_MS)   return elapsed / FADE_MS;
    if (remaining < FADE_MS) return remaining / FADE_MS;
    return 1;
  }

  // 既存オーバーレイがあれば削除 (loadStage 連続呼びへの安全策)
  function destroyOverlay() {
    if (state.rafId) {
      try { window.cancelAnimationFrame(state.rafId); } catch (_) {}
      state.rafId = 0;
    }
    if (state.canvas && state.canvas.parentNode) {
      try { state.canvas.parentNode.removeChild(state.canvas); } catch (_) {}
    }
    state.canvas = null;
    state.ctx = null;
    state.image = null;
  }

  // オーバーレイ canvas を puzzle-container に重ねて作成
  function createOverlay() {
    var container = document.getElementById('puzzle-container');
    if (!container) return false;
    // main.js の canvas と同じサイズで作る
    var mainCanvas = container.querySelector('canvas');
    var w = (mainCanvas && mainCanvas.width)  || container.clientWidth  || 600;
    var h = (mainCanvas && mainCanvas.height) || container.clientHeight || 400;

    var ov = document.createElement('canvas');
    ov.id = OVERLAY_ID;
    ov.width  = w;
    ov.height = h;
    // 既存 canvas にぴったり重ねる
    ov.style.cssText = [
      'position:absolute',
      'left:0', 'top:0',
      'width:100%', 'height:100%',
      'pointer-events:none',   // 操作は下のキャンバスへ透過
      'z-index:5',
      'display:block',
    ].join(';');

    // container の position が static の場合に備えて確認
    var cs = window.getComputedStyle ? window.getComputedStyle(container) : null;
    if (cs && cs.position === 'static') {
      // 既存スタイルを壊さずに自己責任で relative を当てる
      try { container.style.position = 'relative'; } catch (_) {}
    }

    container.appendChild(ov);
    state.canvas = ov;
    state.ctx    = ov.getContext('2d');
    return true;
  }

  // メイン描画
  function drawFrame() {
    if (!state.ctx || !state.canvas || !state.image) return;
    var t = now();
    if (t >= state.endTime) {
      destroyOverlay();
      return;
    }
    var alpha = fadeAlpha(t);
    var ctx2d = state.ctx;
    var cw = state.canvas.width;
    var ch = state.canvas.height;

    // 透明クリア
    ctx2d.clearRect(0, 0, cw, ch);

    if (alpha <= 0) {
      state.rafId = window.requestAnimationFrame(drawFrame);
      return;
    }

    var rect = computeBoardRect(cw, ch, state.image);
    var lv = state.level;

    ctx2d.save();
    try {
      // 1) 全体セピアオーバーレイ (微暗)
      ctx2d.globalAlpha = 0.55 * alpha;
      ctx2d.fillStyle = 'rgba(80, 56, 32, 1)';
      ctx2d.fillRect(0, 0, cw, ch);

      // 2) Lv2+ ぼんやりグレースケール プレビュー
      if (lv >= 2) {
        ctx2d.globalAlpha = 0.55 * alpha;
        ctx2d.globalCompositeOperation = 'source-over';
        try { ctx2d.filter = 'grayscale(100%) contrast(110%) brightness(95%)'; } catch (_) {}
        ctx2d.drawImage(state.image, rect.x, rect.y, rect.w, rect.h);
        try { ctx2d.filter = 'none'; } catch (_) {}
      }

      // 3) シルエット (全 Lv 共通) — Lv1 は完全黒影、 Lv2+ はアウトラインのみ
      drawSilhouette(ctx2d, state.image, rect, lv, alpha);

      // 4) Lv3: ステージタイトルテキスト
      if (lv >= 3 && state.stageTitle) {
        ctx2d.globalCompositeOperation = 'source-over';
        ctx2d.globalAlpha = 0.96 * alpha;
        drawTitleText(ctx2d, state.stageTitle, rect, cw, ch);
      }
    } catch (e) {
      try { console.warn('[fukurou-xray] drawFrame error:', e); } catch (_) {}
    }
    ctx2d.restore();

    state.rafId = window.requestAnimationFrame(drawFrame);
  }

  // 「シルエット」描画
  function drawSilhouette(ctx2d, img, rect, lv, alpha) {
    ctx2d.save();
    try {
      // ボード矩形でクリップ
      ctx2d.beginPath();
      ctx2d.rect(rect.x, rect.y, rect.w, rect.h);
      ctx2d.clip();

      if (lv >= 2) {
        // Lv2+: モチーフ輪郭 (薄い線) — 軽量化のため矩形ボーダーのみ
        ctx2d.globalCompositeOperation = 'source-over';
        ctx2d.globalAlpha = 0.65 * alpha;
        ctx2d.strokeStyle = 'rgba(40, 24, 8, 0.85)';
        ctx2d.lineWidth = 3;
        ctx2d.strokeRect(rect.x + 1.5, rect.y + 1.5, rect.w - 3, rect.h - 3);
      } else {
        // Lv1: 純粋なシルエット (黒影)
        // 画像のあるピクセルだけを黒く塗る = 画像描画 → source-atop で黒塗り
        ctx2d.globalCompositeOperation = 'source-over';
        ctx2d.globalAlpha = 0.95 * alpha;
        try { ctx2d.filter = 'none'; } catch (_) {}
        ctx2d.drawImage(img, rect.x, rect.y, rect.w, rect.h);
        ctx2d.globalCompositeOperation = 'source-atop';
        ctx2d.fillStyle = 'rgba(20, 12, 4, 1)';
        ctx2d.fillRect(rect.x, rect.y, rect.w, rect.h);
      }
    } finally {
      ctx2d.restore();
    }
  }

  // タイトル文字をボード中央に縁取り付きで描画
  function drawTitleText(ctx2d, title, rect, cw, ch) {
    ctx2d.save();
    try {
      var fontSize = Math.max(20, Math.floor(Math.min(cw, ch) * 0.055));
      ctx2d.font = 'bold ' + fontSize + 'px "Zen Maru Gothic", sans-serif';
      ctx2d.textAlign = 'center';
      ctx2d.textBaseline = 'middle';
      var tx = rect.x + rect.w / 2;
      var ty = rect.y + rect.h / 2;
      // 縁取り (太め)
      ctx2d.lineJoin = 'round';
      ctx2d.lineWidth = Math.max(4, fontSize * 0.22);
      ctx2d.strokeStyle = 'rgba(40, 24, 8, 0.95)';
      ctx2d.strokeText(title, tx, ty);
      // 本体
      ctx2d.fillStyle = 'rgba(255, 246, 220, 0.99)';
      ctx2d.fillText(title, tx, ty);
    } finally {
      ctx2d.restore();
    }
  }

  // ===== Hooks =====

  // afterStageReady: パートナーが fukurou の時のみ発動
  function onAfterStageReady(hookCtx) {
    try {
      // 古いオーバーレイは念のため破棄 (ステージ切替時)
      destroyOverlay();

      if (!hookCtx || !hookCtx.partner || hookCtx.partner.id !== 'fukurou') return;
      var stage = hookCtx.stage;
      if (!stage) return;

      var stageIdRaw = (stage.id != null) ? stage.id : hookCtx.stageIndex;
      var key = String(hookCtx.stageIndex) + ':' + String(stageIdRaw);

      // 同一ステージ × 同セッション内では発動しない
      if (shownStageKeys[key]) return;
      shownStageKeys[key] = true;

      // 現在の Lv 取得
      state.level = stageBondLevel('fukurou', stageIdRaw);
      state.stageTitle = (typeof stage.title === 'string') ? stage.title
                       : (typeof stage.stageText === 'string') ? stage.stageText
                       : '';

      // 完成形画像 (dataURL があれば優先 / なければ stage.image)
      var src = stage.imageDataUrl || stage.image || null;
      if (!src) return;

      loadImage(src).then(function (img) {
        if (!img) return;
        // 画像ロード後にオーバーレイを生成して描画開始
        state.image = img;
        if (!createOverlay()) { state.image = null; return; }
        var t = now();
        state.startTime = t;
        state.endTime   = t + DURATION_MS;
        // すでに rafId が走っていれば一度キャンセル
        if (state.rafId) {
          try { window.cancelAnimationFrame(state.rafId); } catch (_) {}
          state.rafId = 0;
        }
        state.rafId = window.requestAnimationFrame(drawFrame);
      });
    } catch (e) {
      try { console.warn('[fukurou-xray] afterStageReady error:', e); } catch (_) {}
      destroyOverlay();
    }
  }

  // beforeStageStart: ステージ切り替えで明示的に古い演出を止める
  function onBeforeStageStart(_hookCtx) {
    destroyOverlay();
  }

  // フック登録
  try {
    window.PonoAssistRegister('afterStageReady',   onAfterStageReady);
    window.PonoAssistRegister('beforeStageStart',  onBeforeStageStart);
  } catch (e) {
    try { console.warn('[fukurou-xray] register failed:', e); } catch (_) {}
  }

  // デバッグ用エクスポート (任意)
  if (typeof window !== 'undefined') {
    window.PonoAssistFukurou = {
      _state: state,
      resetShownStages: function () { shownStageKeys = Object.create(null); },
      destroy: destroyOverlay,
    };
  }
})();
