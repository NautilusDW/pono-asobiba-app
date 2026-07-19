// puzzle/assists/kitsune.js
// キツネ アシスト (Phase 3c 再設計版)
//
// 【新仕様 — 旧「ドラッグ中シルエット自動発火」は完全廃止】
//   - duringDrag / afterStageReady / drawOverlay の自動描画はしない
//   - 代わりに window.PonoAssistKitsune.fireHintShape(piece, ctx) API を expose
//   - main.js 側でキツネ装備時にヒントボタンが押された瞬間だけ呼ばれる前提
//
// 表示仕様 (fireHintShape):
//   - そのピースの「正解スロット位置 (piece.homeX, piece.homeY)」に
//     完成形画像の該当矩形を grayscale 転写
//   - 表示時間 1500ms
//       フェードイン 200ms → 保持 1100ms → フェードアウト 200ms
//   - α 最大 0.40, オレンジリング 2px
//
// 完成形画像取得:
//   - 既存 resolveStageImage を流用 (window.PonoPuzzleResolveStageImage が
//     export されていればそれを優先、なければ hookCtx.sourceImg を後で渡される
//     経路を想定)
//   - 内部キャッシュで sourceImg を保持し再利用
//
// パートナー判定は不要 (main.js 側でキツネ装備時のみ呼び出すという契約)。

(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  // ── 表示パラメータ ─────────────────────────────────────────────────
  var TOTAL_DURATION_MS = 1500;
  var FADE_IN_MS  = 200;
  var FADE_OUT_MS = 200;
  var HOLD_MS     = TOTAL_DURATION_MS - FADE_IN_MS - FADE_OUT_MS; // 1100ms
  var IMAGE_ALPHA_MAX = 0.40;
  var RING_ALPHA_MAX  = 0.85;
  var RING_WIDTH = 2;
  var RING_COLOR_RGB = '255, 149, 0'; // #FF9500 系
  var DARK_BG_ALPHA_MAX = 0.12;

  // ── ctx.filter サポート判定 ────────────────────────────────────────
  var supportsCtxFilter = (function () {
    try {
      var c = document.createElement('canvas');
      var x = c.getContext('2d');
      return ('filter' in x);
    } catch (_) { return false; }
  })();

  // ── 完成形画像キャッシュ ───────────────────────────────────────────
  // key: stageId, value: HTMLImageElement
  var imageCache = Object.create(null);

  function now() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
  }

  /**
   * 完成形画像を取得。可能なら main.js が export している resolveStageImage を
   * 使う。引数の piece に sourceImg / image / img が直接生えていれば優先。
   *
   * @param {Object} piece
   * @returns {HTMLImageElement|null}
   */
  function resolveSourceImage(piece) {
    if (!piece) return null;

    // (1) piece に直接 image が付いていれば最優先
    if (piece.sourceImg && piece.sourceImg.naturalWidth) return piece.sourceImg;
    if (piece.image && piece.image.naturalWidth)         return piece.image;
    if (piece.img && piece.img.naturalWidth)             return piece.img;

    // (2) stageId 経由でキャッシュ
    var stageId = piece.stageId != null ? piece.stageId
                : (piece.stage && piece.stage.id != null ? piece.stage.id : null);
    if (stageId != null && imageCache[stageId]
        && imageCache[stageId].naturalWidth) {
      return imageCache[stageId];
    }

    // (3) main.js の resolveStageImage を流用
    try {
      if (typeof window.PonoPuzzleResolveStageImage === 'function') {
        var img = window.PonoPuzzleResolveStageImage(stageId);
        if (img && img.naturalWidth) {
          if (stageId != null) imageCache[stageId] = img;
          return img;
        }
      }
    } catch (_) {}

    // (4) グローバル currentStageImage があれば最終フォールバック
    try {
      if (window.PonoPuzzleCurrentImage && window.PonoPuzzleCurrentImage.naturalWidth) {
        return window.PonoPuzzleCurrentImage;
      }
    } catch (_) {}

    return null;
  }

  /**
   * piece + ctx から board / pieceSize を推定する。
   * 引数で直接渡されていればそれを優先。
   */
  function resolveBoard(piece) {
    if (!piece) return null;
    if (piece.board && piece.board.w > 0 && piece.board.h > 0) return piece.board;
    try {
      if (window.PonoPuzzleBoard
          && window.PonoPuzzleBoard.w > 0
          && window.PonoPuzzleBoard.h > 0) {
        return window.PonoPuzzleBoard;
      }
    } catch (_) {}
    return null;
  }

  function resolvePieceSize(piece) {
    if (!piece) return null;
    if (piece.w > 0 && piece.h > 0) return { w: piece.w, h: piece.h };
    if (piece.pieceSize && piece.pieceSize.w > 0) return piece.pieceSize;
    try {
      if (window.PonoPuzzlePieceSize
          && window.PonoPuzzlePieceSize.w > 0
          && window.PonoPuzzlePieceSize.h > 0) {
        return window.PonoPuzzlePieceSize;
      }
    } catch (_) {}
    return null;
  }

  /**
   * 1フレームぶんのシルエット描画。
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} piece           {homeX, homeY, ...}
   * @param {Object} board           {x, y, w, h}
   * @param {Object} pieceSize       {w, h}
   * @param {HTMLImageElement|null} sourceImg
   * @param {number} alphaMul         0..1 (フェード係数)
   */
  function paintSilhouette(ctx, piece, board, pieceSize, sourceImg, alphaMul) {
    if (!ctx || !piece) return;
    var dw = pieceSize ? pieceSize.w : 0;
    var dh = pieceSize ? pieceSize.h : 0;
    if (dw <= 0 || dh <= 0) return;
    var dx = piece.homeX;
    var dy = piece.homeY;
    if (typeof dx !== 'number' || typeof dy !== 'number') return;

    ctx.save();
    try {
      // (1) 下地: 薄いダーク矩形 (シルエットの可視性確保)
      ctx.globalAlpha = DARK_BG_ALPHA_MAX * alphaMul;
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(dx, dy, dw, dh);

      // (2) シルエット: 完成形画像の該当矩形を grayscale 転写
      if (sourceImg
          && sourceImg.naturalWidth && sourceImg.naturalHeight
          && board && board.w > 0 && board.h > 0) {
        var natW = sourceImg.naturalWidth;
        var natH = sourceImg.naturalHeight;
        var sx = (dx - board.x) * natW / board.w;
        var sy = (dy - board.y) * natH / board.h;
        var sw = dw             * natW / board.w;
        var sh = dh             * natH / board.h;

        // 安全クランプ
        if (sx < 0) { sw += sx; sx = 0; }
        if (sy < 0) { sh += sy; sy = 0; }
        if (sx + sw > natW) sw = natW - sx;
        if (sy + sh > natH) sh = natH - sy;

        if (sw > 0 && sh > 0) {
          ctx.globalAlpha = IMAGE_ALPHA_MAX * alphaMul;
          if (supportsCtxFilter) {
            ctx.filter = 'grayscale(1) contrast(1.05)';
          }
          try {
            ctx.drawImage(sourceImg, sx, sy, sw, sh, dx, dy, dw, dh);
          } catch (_) {}
          if (supportsCtxFilter) {
            ctx.filter = 'none';
          }
        }
      }

      // (3) オレンジリング 2px
      ctx.globalAlpha = RING_ALPHA_MAX * alphaMul;
      ctx.lineJoin = 'round';
      ctx.lineWidth = RING_WIDTH;
      ctx.strokeStyle = 'rgba(' + RING_COLOR_RGB + ', 1)';
      var pad = RING_WIDTH / 2;
      ctx.strokeRect(dx + pad, dy + pad, dw - RING_WIDTH, dh - RING_WIDTH);
    } catch (e) {
      try { console.warn('[kitsune-assist] silhouette paint failed:', e); } catch (_) {}
    }
    ctx.restore();
  }

  /**
   * フェード曲線を計算。
   * 0..FADE_IN_MS                : 0 → 1
   * FADE_IN_MS..FADE_IN_MS+HOLD  : 1
   * その後 FADE_OUT_MS           : 1 → 0
   * それ以降                     : 0 (終了)
   */
  function alphaAt(elapsed) {
    if (elapsed < 0) return 0;
    if (elapsed < FADE_IN_MS) {
      return elapsed / FADE_IN_MS;
    }
    var t2 = elapsed - FADE_IN_MS;
    if (t2 < HOLD_MS) return 1;
    var t3 = t2 - HOLD_MS;
    if (t3 < FADE_OUT_MS) {
      return 1 - (t3 / FADE_OUT_MS);
    }
    return 0;
  }

  // ── 公開 API: fireHintShape ───────────────────────────────────────
  /**
   * キツネのヒント形状を 1.5 秒間ピース正解位置に表示する。
   *
   * main.js 側のヒントボタンが押された時にだけ呼ばれる前提。
   * 1.5秒の rAF ループを自前で回し、ヒント用 canvas に描画する。
   * (main.js の通常描画ループに干渉しないよう、引数 ctx に直接重ね描く)
   *
   * @param {Object} piece  正解位置 (homeX, homeY) を持つピース
   * @param {CanvasRenderingContext2D} ctx  描画先 2D context
   * @returns {boolean} 起動できたら true
   */
  function fireHintShape(piece, ctx) {
    if (!piece || !ctx) {
      try { console.warn('[kitsune-assist] fireHintShape: missing piece or ctx'); } catch (_) {}
      return false;
    }

    var sourceImg = resolveSourceImage(piece);
    var board = resolveBoard(piece);
    var pieceSize = resolvePieceSize(piece);

    if (!board || !pieceSize) {
      try {
        console.warn('[kitsune-assist] fireHintShape: cannot resolve board/pieceSize',
                     { board: board, pieceSize: pieceSize });
      } catch (_) {}
      return false;
    }

    var startTs = now();
    var lastFrameAlpha = -1;

    function frame() {
      var elapsed = now() - startTs;
      if (elapsed >= TOTAL_DURATION_MS) {
        // 終了 — main.js 側の通常描画が次フレームで上書きする想定
        return;
      }
      var a = alphaAt(elapsed);
      // α が変わらない (= 保持中) でも再描画は必要 (背景が更新される可能性)
      lastFrameAlpha = a;
      try {
        paintSilhouette(ctx, piece, board, pieceSize, sourceImg, a);
      } catch (e) {
        try { console.warn('[kitsune-assist] hint frame failed:', e); } catch (_) {}
      }
      // 継続: requestAnimationFrame があれば使う
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(frame);
      } else {
        setTimeout(frame, 16);
      }
    }

    // 初回は即座に1フレーム描画
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(frame);
    } else {
      setTimeout(frame, 0);
    }

    return true;
  }

  /**
   * 完成形画像をキャッシュに登録する補助 API (main.js が直接渡したい場合用)。
   * @param {number|string} stageId
   * @param {HTMLImageElement} img
   */
  function registerStageImage(stageId, img) {
    if (stageId == null || !img) return;
    imageCache[stageId] = img;
  }

  /**
   * キャッシュをクリア (ステージ切替時など)。
   * 引数なしで全クリア、stageId 指定で個別クリア。
   */
  function clearCache(stageId) {
    if (stageId == null) {
      imageCache = Object.create(null);
    } else {
      delete imageCache[stageId];
    }
  }

  // ── window へ expose ──────────────────────────────────────────────
  window.PonoAssistKitsune = {
    fireHintShape: fireHintShape,
    registerStageImage: registerStageImage,
    clearCache: clearCache,
    // 内部定数 (デバッグ・テスト用)
    _constants: {
      TOTAL_DURATION_MS: TOTAL_DURATION_MS,
      FADE_IN_MS: FADE_IN_MS,
      FADE_OUT_MS: FADE_OUT_MS,
      HOLD_MS: HOLD_MS,
      IMAGE_ALPHA_MAX: IMAGE_ALPHA_MAX,
      RING_WIDTH: RING_WIDTH,
    },
  };

  // ── 自動発火フック登録は意図的に行わない ────────────────────────
  //   旧版で行っていた以下のフックはすべて削除:
  //     - beforeStageStart
  //     - afterStageReady
  //     - duringDrag
  //     - afterSnap
  //     - drawOverlay
  //   main.js のヒントボタン押下時に PonoAssistKitsune.fireHintShape を
  //   直接呼ぶ設計に変更されたため。
})();
