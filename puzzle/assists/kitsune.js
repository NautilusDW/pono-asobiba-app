// puzzle/assists/kitsune.js
// キツネ / てもとシルエットとうし (Held-Piece X-Ray) アシスト。
//
// パートナーが 'kitsune' のときだけ発火する。
//
// 仕様 (実機 FB 反映版 — 旧「左上が固定で光る」「次のピース光らせ」は完全廃止):
//   - ユーザーが**ピースを掴んだ瞬間**から離すまで、その掴んでいるピースの
//     **正解スロット位置 (piece.homeX, piece.homeY)** に、ピース矩形ぶんの
//     シルエット (グレースケール転写) を重ねて描画する。
//   - 「自分が持っているピースがどこに収まるか」がドラッグ中だけ見える。
//
// なかよし度レベル (PonoBond.getLevel('kitsune', stageId)) による差分:
//   Lv 0 / Lv 1 : 輪郭のみ (drawImage しない / stroke のみ) α≈0.15
//                  + 細いオレンジリング (stroke=2px)
//   Lv 2        : 完成形画像の該当矩形をグレースケール転写 α=0.30
//                  + 細いオレンジリング (stroke=2px)
//   Lv 3        : 完成形画像の該当矩形をグレースケール転写 α=0.40
//                  + やや太いオレンジリング (stroke=3px)
//
// 共通:
//   - 完成形画像 (hookCtx.sourceImg) を ctx.filter='grayscale(1)' でグレースケール化
//   - 該当矩形は piece.homeX/homeY と pieceSize から sourceImg 上の sx/sy/sw/sh を逆算
//   - drag が離されて snap (= piece.snapped=true) になったら 200ms でフェードアウト
//   - ピースを掴まなくなったら (最後の duringDrag から DRAG_STALE_MS=400ms 経過) 消す
//
// 依存:
//   - window.PonoAssistRegister (main.js が定義)
//   - window.PonoBond.getLevel  (bond.js)
//
// 登録するフック:
//   - beforeStageStart : ステージ ID と Lv 仕様を保存。
//   - duringDrag       : 掴まれているピース参照を更新 (lastTs 更新)。
//   - afterSnap        : snap されたピースの fadeout タイマー開始。
//   - drawOverlay      : 毎フレーム シルエット転写を描画 (ctx.filter=grayscale)。
//   - afterStageReady  : ステージ切替時に内部状態をリセット。

(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (typeof window.PonoAssistRegister !== 'function') {
    try { console.warn('[kitsune-assist] PonoAssistRegister not found — skipped'); } catch (_) {}
    return;
  }

  var PARTNER_ID = 'kitsune';

  // Lv -> 描画スペック
  //   mode       : 'outline' | 'image'  ('outline' は drawImage せず stroke のみ)
  //   imageAlpha : シルエット (drawImage 部) の α
  //   ringAlpha  : オレンジリングの α
  //   ringWidth  : オレンジリングの線幅 (px)
  //   outlineFillAlpha : outline モード時、ピース矩形を薄くフィルする α
  var LEVEL_TABLE = {
    0: { mode: 'outline', imageAlpha: 0.00, ringAlpha: 0.55, ringWidth: 2, outlineFillAlpha: 0.15 },
    1: { mode: 'outline', imageAlpha: 0.00, ringAlpha: 0.55, ringWidth: 2, outlineFillAlpha: 0.15 },
    2: { mode: 'image',   imageAlpha: 0.30, ringAlpha: 0.70, ringWidth: 2, outlineFillAlpha: 0.00 },
    3: { mode: 'image',   imageAlpha: 0.40, ringAlpha: 0.85, ringWidth: 3, outlineFillAlpha: 0.00 },
  };

  // オレンジリング色 (#FF9500 系)
  var RING_COLOR_RGB = '255, 149, 0';

  // 直近 duringDrag からの経過がこの ms を越えたらドラッグ中ではないとみなす
  var DRAG_STALE_MS = 400;

  // snap 後フェードアウト時間 (ms)
  var FADE_OUT_MS = 200;

  // フィルタ対応判定 (古いブラウザ保険)
  var supportsCtxFilter = (function () {
    try {
      var c = document.createElement('canvas');
      var x = c.getContext('2d');
      return ('filter' in x);
    } catch (_) { return false; }
  })();

  // 現在のステージ状態
  // {
  //   stageId, level, spec,
  //   heldPiece     : main.js piece 参照 (掴んでるピース) — null で非表示
  //   lastDragTs    : 直近 duringDrag の時刻 (ms)
  //   fadeOutStart  : null or snap 検知時刻 (ms) — 200ms かけて α を下げる
  //   fadePiece     : フェードアウト中に表示し続ける piece 参照
  // }
  var current = null;

  function now() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
  }

  function isActivePartner(partner) {
    if (partner && partner.id) return partner.id === PARTNER_ID;
    try {
      if (window.PonoBond && typeof window.PonoBond.getSelectedPartner === 'function') {
        return window.PonoBond.getSelectedPartner() === PARTNER_ID;
      }
    } catch (_) {}
    return false;
  }

  function getStageLevel(stageId) {
    if (stageId == null) return 0;
    try {
      if (window.PonoBond && typeof window.PonoBond.getLevel === 'function') {
        var lv = window.PonoBond.getLevel(PARTNER_ID, stageId);
        if (typeof lv === 'number' && lv >= 0 && lv <= 3) return lv;
      }
    } catch (_) {}
    return 0;
  }

  function resetState(stageId, level) {
    current = {
      stageId: stageId != null ? stageId : null,
      level: level || 0,
      spec: LEVEL_TABLE[level] || LEVEL_TABLE[0],
      heldPiece: null,
      lastDragTs: 0,
      fadeOutStart: 0,
      fadePiece: null,
    };
  }

  /**
   * source image の該当矩形をピースのホーム位置にグレースケール転写する。
   *
   * main.js drawPiece() は `ctx.drawImage(sourceImg, imgOffX, imgOffY, boardW, boardH)`
   * を clip 内で呼んで、ピース位置に正解画像を出している。
   *   imgOffX = boardX + (piece.x - piece.homeX)
   *   imgOffY = boardY + (piece.y - piece.homeY)
   *
   * シルエットは「正解スロットの位置」に出したいので piece.x = piece.homeX
   * 相当 ( imgOffX = boardX, imgOffY = boardY ) で「完成形画像」の該当矩形を
   * 切り出して homeX/homeY に縮小描画すればよい。
   *
   *   sx = (homeX - boardX) * naturalW / boardW
   *   sy = (homeY - boardY) * naturalH / boardH
   *   sw = pieceW          * naturalW / boardW
   *   sh = pieceH          * naturalH / boardH
   */
  function paintSilhouette(ctx, piece, pieceW, pieceH, sourceImg, board, spec, alphaMul) {
    if (!ctx || !piece) return;
    var dx = piece.homeX;
    var dy = piece.homeY;
    var dw = pieceW;
    var dh = pieceH;
    if (dw <= 0 || dh <= 0) return;

    ctx.save();
    try {
      // ----- (1) 背景隔離: 薄いダーク矩形 (任意 — Lv2/3 のシルエット下地) -----
      if (spec.mode === 'image') {
        ctx.globalAlpha = 0.12 * alphaMul;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(dx, dy, dw, dh);
      } else if (spec.outlineFillAlpha > 0) {
        // Lv0/1: 薄くピース矩形を白っぽくフィル (どこにハマるか「面」で示す)
        ctx.globalAlpha = spec.outlineFillAlpha * alphaMul;
        ctx.fillStyle = '#FFE0A8';
        ctx.fillRect(dx, dy, dw, dh);
      }

      // ----- (2) シルエット (グレースケール完成形) -----
      if (spec.mode === 'image'
          && sourceImg && board
          && sourceImg.naturalWidth && sourceImg.naturalHeight
          && board.w > 0 && board.h > 0) {
        var natW = sourceImg.naturalWidth;
        var natH = sourceImg.naturalHeight;
        var sx = (piece.homeX - board.x) * natW / board.w;
        var sy = (piece.homeY - board.y) * natH / board.h;
        var sw = pieceW                  * natW / board.w;
        var sh = pieceH                  * natH / board.h;

        // 安全クランプ
        if (sx < 0) { sw += sx; sx = 0; }
        if (sy < 0) { sh += sy; sy = 0; }
        if (sx + sw > natW) sw = natW - sx;
        if (sy + sh > natH) sh = natH - sy;

        if (sw > 0 && sh > 0) {
          ctx.globalAlpha = spec.imageAlpha * alphaMul;
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

      // ----- (3) オレンジリング (背景干渉対策) -----
      // 矩形ベースの細いリング。回転の影響を受けないよう「ホーム位置」を
      // 単純矩形で囲む (ピース形状を真似ない方がノイズが少ない)。
      ctx.globalAlpha = spec.ringAlpha * alphaMul;
      ctx.lineJoin = 'round';
      ctx.lineWidth = spec.ringWidth;
      ctx.strokeStyle = 'rgba(' + RING_COLOR_RGB + ', 1)';
      // 内側に少し寄せると枠線の半分が外にハミ出さない
      var pad = spec.ringWidth / 2;
      ctx.strokeRect(dx + pad, dy + pad, dw - spec.ringWidth, dh - spec.ringWidth);

      // Lv3 のみ追加: 外側にうっすら 1px のソフト輪郭 (にじみ感)
      if (spec.mode === 'image' && spec.ringWidth >= 3) {
        ctx.globalAlpha = 0.30 * alphaMul;
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(' + RING_COLOR_RGB + ', 1)';
        ctx.strokeRect(dx - 1, dy - 1, dw + 2, dh + 2);
      }
    } catch (e) {
      try { console.warn('[kitsune-assist] silhouette paint failed:', e); } catch (_) {}
    }
    ctx.restore();
  }

  // ── beforeStageStart: 状態リセット + Lv 仕様取得 ──────────────────────
  window.PonoAssistRegister('beforeStageStart', function (hookCtx) {
    if (!hookCtx) { resetState(null, 0); return; }
    if (!isActivePartner(hookCtx.partner)) { current = null; return; }
    var stage = hookCtx.stage || null;
    var stageId = (stage && stage.id != null) ? stage.id : null;
    var level = getStageLevel(stageId);
    resetState(stageId, level);
  });

  // ── afterStageReady: 念のため状態を作り直す (Lv 仕様確定) ─────────────
  window.PonoAssistRegister('afterStageReady', function (hookCtx) {
    if (!hookCtx) return;
    if (!isActivePartner(hookCtx.partner)) { current = null; return; }
    var stage = hookCtx.stage || null;
    var stageId = (stage && stage.id != null) ? stage.id : null;
    var level = getStageLevel(stageId);
    // 既存状態があれば level/stageId だけ刷新
    if (current && current.stageId === stageId) {
      current.level = level;
      current.spec = LEVEL_TABLE[level] || LEVEL_TABLE[0];
      current.heldPiece = null;
      current.lastDragTs = 0;
      current.fadeOutStart = 0;
      current.fadePiece = null;
    } else {
      resetState(stageId, level);
    }
  });

  // ── duringDrag: 掴んでるピース参照を更新 ─────────────────────────────
  window.PonoAssistRegister('duringDrag', function (hookCtx) {
    if (!hookCtx) return;
    if (!isActivePartner(hookCtx.partner)) return;
    if (!current) return;
    var piece = hookCtx.piece;
    if (!piece) return;
    // 既に snap 済みなら無視 (念のため)
    if (piece.snapped) return;
    current.heldPiece = piece;
    current.lastDragTs = now();
    // 新たに掴んだら fadeout はキャンセル
    current.fadeOutStart = 0;
    current.fadePiece = null;
  });

  // ── afterSnap: snap されたピースが現 heldPiece なら fadeout 開始 ───────
  window.PonoAssistRegister('afterSnap', function (hookCtx) {
    if (!hookCtx) return;
    if (!isActivePartner(hookCtx.partner)) return;
    if (!current) return;
    var snappedPiece = hookCtx.piece || null;
    var held = current.heldPiece;
    // snap されたのが今掴んでたピースなら fadeout を開始
    if (held && snappedPiece && held === snappedPiece) {
      current.fadePiece = held;
      current.fadeOutStart = now();
      current.heldPiece = null;
      current.lastDragTs = 0;
    } else {
      // 別ピースが snap されただけ → heldPiece が snap 済みになってないか保険
      if (held && held.snapped) {
        current.fadePiece = held;
        current.fadeOutStart = now();
        current.heldPiece = null;
        current.lastDragTs = 0;
      }
    }
  });

  // ── drawOverlay: 毎フレーム重ね描き ──────────────────────────────────
  window.PonoAssistRegister('drawOverlay', function (hookCtx) {
    if (!hookCtx) return;
    if (!isActivePartner(hookCtx.partner)) return;
    if (!current) return;
    var ctx = hookCtx.ctx;
    if (!ctx) return;

    var spec = current.spec || LEVEL_TABLE[0];
    var board = hookCtx.board || null;
    var ps = hookCtx.pieceSize || {};
    var pieceW = ps.w || 0;
    var pieceH = ps.h || 0;
    if (pieceW <= 0 || pieceH <= 0) return;

    var sourceImg = hookCtx.sourceImg || null;
    var t = now();

    // ----- (A) 通常: 現在 heldPiece を実時間描画 -----
    if (current.heldPiece && !current.heldPiece.snapped) {
      // 最後の duringDrag から DRAG_STALE_MS 経過したらドラッグ終了とみなす。
      // main.js は pointerup で trySnap → 失敗時 dragPiece=null になるが
      // duringDrag フックは pointermove 起点なので、停止後は安全マージン。
      var sinceDrag = t - current.lastDragTs;
      // ドラッグ終了 → 即フェードアウト開始 (snap 成功 → afterSnap で別途処理)
      if (sinceDrag > DRAG_STALE_MS) {
        current.fadePiece = current.heldPiece;
        current.fadeOutStart = t;
        current.heldPiece = null;
        current.lastDragTs = 0;
      } else {
        paintSilhouette(ctx, current.heldPiece, pieceW, pieceH, sourceImg, board, spec, 1.0);
        // フレーム継続描画のため redraw 要求
        if (typeof hookCtx.requestRedraw === 'function') {
          try { hookCtx.requestRedraw(); } catch (_) {}
        }
        return;
      }
    }

    // ----- (B) フェードアウト -----
    if (current.fadeOutStart > 0 && current.fadePiece) {
      var elapsed = t - current.fadeOutStart;
      if (elapsed >= FADE_OUT_MS) {
        current.fadePiece = null;
        current.fadeOutStart = 0;
        return;
      }
      var k = 1 - (elapsed / FADE_OUT_MS); // 1 → 0
      paintSilhouette(ctx, current.fadePiece, pieceW, pieceH, sourceImg, board, spec, k);
      // 継続描画
      if (typeof hookCtx.requestRedraw === 'function') {
        try { hookCtx.requestRedraw(); } catch (_) {}
      }
    }
  });
})();
