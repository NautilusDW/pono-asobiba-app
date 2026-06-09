// PonoAssist — フクロウ「なかま発見」 (Piece Affinity Spotlight)
//
// パートナー 'fukurou' が選択されている時のみアクティブ。
// 盤外の未スナップピースを「長押し 0.6 秒」すると、 そのピースに隣接する
// (row/col ベースで上下左右) ピースを青緑グロー (#00C49A 系) で光らせる。
//
// 段階開示 (PonoBond Lv ベース):
//   Lv 0  : 発動しない (ガード)
//   Lv 1  : 隣接 1 枚を発光のみ
//   Lv 2  : 隣接 2 枚 + 方向ラベル (「↑となり」「→となり」など)
//   Lv 3  : 隣接 3 枚 + 連結線 (点線 #00C49A)
//   注: ピースによっては盤の端で隣接が 1〜2 個しか存在しないため、 各 Lv は
//       「最大 N 枚」の上限として扱う。 実際の発光数は min(Lv 上限, 実在隣接数)。
//
// 表示時間: 発火後 2.5 秒で fade-out。
// グロー色: 青緑 #00C49A (drawOverlay フックの radial gradient)
//
// 設計方針:
//   - main.js の private 変数 (boardX/Y, pieces 等) には触らず、 drawOverlay フック
//     から渡される ctx.pieces / ctx.board / ctx.pieceSize / ctx.dragPiece を利用する。
//   - 長押し検出は puzzle-canvas に直接 pointerdown/up/move/cancel をバインド。
//     main.js の onPointerDown は preventDefault するが、 EventListener 配列内で
//     先に登録した順に呼ばれるため、 capture=false で「裏方」に徹する。
//   - 長押しタイマー中に duringDrag フックが呼ばれた場合は即キャンセル (= ドラッグ
//     開始のため長押し判定終了)。
//   - 1 ステージ内で複数回発火可能 (1 回ごとに 2.5s で消える)。
//   - 例外は呼び出し元 (runAssistHooks) で握りつぶされるが、 ここでも try/catch で守る。
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof window.PonoAssistRegister !== 'function') {
    return;
  }

  // ────────────────────────────────────────────────
  // 定数
  // ────────────────────────────────────────────────
  var PARTNER_ID         = 'fukurou';
  var LONG_PRESS_MS      = 600;   // 長押し発火しきい値
  var LONG_PRESS_MOVE_PX = 8;     // この距離を超えたら長押しキャンセル (canvas 座標)
  var SHOW_DURATION_MS   = 2500;  // 隣接ハイライト総表示時間
  var FADE_IN_MS         = 180;   // フェードイン
  var FADE_OUT_MS        = 320;   // フェードアウト
  var GLOW_COLOR         = '#00C49A';        // 青緑 (ベース)
  var GLOW_COLOR_RGB     = '0, 196, 154';    // rgba 用
  var LABEL_TEXT_COLOR   = '#0A6B53';        // 方向ラベル文字
  var LABEL_BG_COLOR     = 'rgba(255, 255, 255, 0.92)';
  var DASH_PATTERN       = [10, 6];          // Lv3 連結線

  // Lv 別「最大ハイライト隣接数」
  function maxNeighborsForLevel(lv) {
    if (lv >= 3) return 3;
    if (lv === 2) return 2;
    if (lv === 1) return 1;
    return 0;
  }

  // ────────────────────────────────────────────────
  // モジュール状態
  // ────────────────────────────────────────────────
  var state = {
    // 長押し検出
    pressTimer:    0,
    pressPiece:    null,    // 長押し対象ピース (まだ発火していない)
    pressStartX:   0,
    pressStartY:   0,
    pressPointerId: null,

    // 発火中のハイライト
    activeTarget:  null,    // 長押しで選んだ起点ピース
    activeNeighbors: [],    // [{ piece, side: 'top'|'bottom'|'left'|'right' }, ...]
    showStart:     0,       // performance.now()
    showEnd:       0,
    rafId:         0,

    // 現ステージ Lv (afterStageReady でキャッシュ、 毎フレーム再計算回避)
    currentLevel:  0,
    currentStageId: null,

    // パートナーアクティブ判定 (afterStageReady で確定)
    partnerActive: false,

    // 直近の drawOverlay コンテキスト (pieces / pieceSize / board) を保持
    // → 長押し判定中に pieces 配列・寸法を参照するために必要
    lastCtx:       null,

    // 長押しイベントを bind した canvas (cleanup 用)
    boundCanvas:   null,
  };

  // ────────────────────────────────────────────────
  // ユーティリティ
  // ────────────────────────────────────────────────
  function now() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : Date.now();
  }

  function resolveLevel(stageId) {
    try {
      if (window.PonoBond && typeof window.PonoBond.getLevel === 'function') {
        var lv = window.PonoBond.getLevel(PARTNER_ID, stageId);
        if (typeof lv === 'number' && isFinite(lv) && lv >= 0) return lv;
      }
    } catch (_) {}
    return 0;
  }

  function pickStageId(ctx) {
    try {
      if (ctx && ctx.stage && ctx.stage.id != null) return ctx.stage.id;
      if (typeof window.currentStageIndex === 'number' && Array.isArray(window.BASE_STAGES)) {
        var s = window.BASE_STAGES[window.currentStageIndex];
        if (s && s.id != null) return s.id;
      }
    } catch (_) {}
    return null;
  }

  // pieces 配列から (row, col) で隣接ピースを引く
  // pieces は main.js の buildPieces() により { col, row, ... } を持つ前提。
  function findPieceByRowCol(pieces, row, col) {
    if (!pieces) return null;
    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      if (p && p.row === row && p.col === col) return p;
    }
    return null;
  }

  // 起点ピースから上下左右の隣接ピースを最大 cap 個まで取得
  // 返り値: [{ piece, side }, ...] (side は 'top' | 'bottom' | 'left' | 'right')
  function collectNeighbors(target, pieces, cap) {
    if (!target || !pieces || cap <= 0) return [];
    if (target.row == null || target.col == null) return [];
    // 上下左右の優先順 (Lv1=1 / Lv2=2 / Lv3=3 の cap で先頭から採用)
    // 子供にとって直感的な「上→右→下→左」の時計回り順を採用
    var sides = [
      { side: 'top',    drow: -1, dcol:  0 },
      { side: 'right',  drow:  0, dcol:  1 },
      { side: 'bottom', drow:  1, dcol:  0 },
      { side: 'left',   drow:  0, dcol: -1 },
    ];
    var out = [];
    for (var i = 0; i < sides.length && out.length < cap; i++) {
      var s = sides[i];
      var p = findPieceByRowCol(pieces, target.row + s.drow, target.col + s.dcol);
      if (p) out.push({ piece: p, side: s.side });
    }
    return out;
  }

  function sideToLabel(side) {
    switch (side) {
      case 'top':    return '↑となり';
      case 'right':  return '→となり';
      case 'bottom': return '↓となり';
      case 'left':   return '←となり';
      default:       return 'となり';
    }
  }

  // 「盤外ピース」判定: ピースがまだスナップされていない (= snapped === false)
  // 起点ピース自体は中央ボードのスロット位置にあってもまだ未スナップなら盤外扱い。
  function isOffBoardPiece(piece) {
    if (!piece) return false;
    return !piece.snapped;
  }

  function pieceCenter(piece, pieceW, pieceH) {
    return { cx: piece.x + pieceW / 2, cy: piece.y + pieceH / 2 };
  }

  // フェードカーブ (0..1)
  function fadeAlpha(t) {
    if (t < state.showStart) return 0;
    if (t >= state.showEnd)  return 0;
    var elapsed   = t - state.showStart;
    var remaining = state.showEnd - t;
    if (elapsed < FADE_IN_MS)   return elapsed / FADE_IN_MS;
    if (remaining < FADE_OUT_MS) return remaining / FADE_OUT_MS;
    return 1;
  }

  // ────────────────────────────────────────────────
  // 描画 (drawOverlay フック)
  // ────────────────────────────────────────────────
  function drawSpotlight(ctx2d, pieceW, pieceH, alpha, lv) {
    if (!state.activeTarget || !state.activeNeighbors.length) return;

    // ヒント機能がアクティブな時は少し薄めて主役を譲る
    // (main.js の selectedPieceForHint と被ったとき、 ヒント側を優先)
    var dim = (window.PonoHintActive === true) ? 0.45 : 1;
    var aBase = alpha * dim;
    if (aBase <= 0) return;

    ctx2d.save();
    try {
      var targetCenter = pieceCenter(state.activeTarget, pieceW, pieceH);

      // ── Lv3: 起点 → 隣接ピースへの点線連結 (グロー描画の下層) ──
      if (lv >= 3) {
        ctx2d.save();
        ctx2d.globalAlpha = 0.75 * aBase;
        ctx2d.strokeStyle = GLOW_COLOR;
        ctx2d.lineWidth   = 2.4;
        ctx2d.lineCap     = 'round';
        if (typeof ctx2d.setLineDash === 'function') {
          ctx2d.setLineDash(DASH_PATTERN);
        }
        for (var i = 0; i < state.activeNeighbors.length; i++) {
          var nb = state.activeNeighbors[i].piece;
          var nc = pieceCenter(nb, pieceW, pieceH);
          ctx2d.beginPath();
          ctx2d.moveTo(targetCenter.cx, targetCenter.cy);
          ctx2d.lineTo(nc.cx, nc.cy);
          ctx2d.stroke();
        }
        if (typeof ctx2d.setLineDash === 'function') ctx2d.setLineDash([]);
        ctx2d.restore();
      }

      // ── 起点ピースに薄い青緑リング (発火元を示す) ──
      var trgR = Math.max(pieceW, pieceH) * 0.55;
      ctx2d.save();
      ctx2d.globalAlpha = 0.55 * aBase;
      ctx2d.strokeStyle = GLOW_COLOR;
      ctx2d.lineWidth   = 3;
      ctx2d.shadowColor = 'rgba(' + GLOW_COLOR_RGB + ', 0.6)';
      ctx2d.shadowBlur  = 10;
      ctx2d.beginPath();
      ctx2d.arc(targetCenter.cx, targetCenter.cy, trgR, 0, Math.PI * 2);
      ctx2d.stroke();
      ctx2d.restore();

      // ── 隣接ピースに青緑 radial グロー ──
      for (var j = 0; j < state.activeNeighbors.length; j++) {
        var entry = state.activeNeighbors[j];
        var nbp = entry.piece;
        var nbc = pieceCenter(nbp, pieceW, pieceH);
        var glowR = Math.max(pieceW, pieceH) * 0.78;

        // radial グロー
        ctx2d.save();
        var grad = ctx2d.createRadialGradient(nbc.cx, nbc.cy, 4, nbc.cx, nbc.cy, glowR);
        grad.addColorStop(0,   'rgba(' + GLOW_COLOR_RGB + ', ' + (0.65 * aBase).toFixed(3) + ')');
        grad.addColorStop(0.55,'rgba(' + GLOW_COLOR_RGB + ', ' + (0.28 * aBase).toFixed(3) + ')');
        grad.addColorStop(1,   'rgba(' + GLOW_COLOR_RGB + ', 0)');
        ctx2d.fillStyle = grad;
        ctx2d.beginPath();
        ctx2d.arc(nbc.cx, nbc.cy, glowR, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.restore();

        // ピース輪郭の青緑リング
        ctx2d.save();
        ctx2d.globalAlpha = 0.85 * aBase;
        ctx2d.strokeStyle = GLOW_COLOR;
        ctx2d.lineWidth   = 3.5;
        ctx2d.shadowColor = 'rgba(' + GLOW_COLOR_RGB + ', 0.85)';
        ctx2d.shadowBlur  = 16;
        ctx2d.beginPath();
        ctx2d.arc(nbc.cx, nbc.cy, Math.min(pieceW, pieceH) * 0.46, 0, Math.PI * 2);
        ctx2d.stroke();
        ctx2d.restore();

        // ── Lv2 以上: 方向ラベル ──
        if (lv >= 2) {
          drawDirectionLabel(ctx2d, nbc.cx, nbc.cy, pieceW, pieceH, entry.side, aBase);
        }
      }
    } catch (e) {
      try { console.warn('[fukurou-spotlight] draw error:', e); } catch (_) {}
    }
    ctx2d.restore();
  }

  // 方向ラベル (隣接ピースの中心上に小さな白バブル + 青緑文字)
  function drawDirectionLabel(ctx2d, cx, cy, pieceW, pieceH, side, alpha) {
    var label = sideToLabel(side);
    var fontPx = Math.max(12, Math.floor(Math.min(pieceW, pieceH) * 0.22));
    ctx2d.save();
    try {
      ctx2d.font = 'bold ' + fontPx + 'px "Zen Maru Gothic", sans-serif';
      ctx2d.textAlign    = 'center';
      ctx2d.textBaseline = 'middle';
      var metrics = ctx2d.measureText(label);
      var padX = fontPx * 0.55;
      var padY = fontPx * 0.30;
      var bw = metrics.width + padX * 2;
      var bh = fontPx + padY * 2;
      // ラベル位置: ピース中心上方 (隣接の向きと反対側に少しズラすと視覚的に "起点" を意識しやすい)
      var offsetY = -(Math.min(pieceW, pieceH) * 0.52) - bh * 0.55;
      var bx = cx - bw / 2;
      var by = cy + offsetY;
      // 角丸背景
      ctx2d.globalAlpha = 0.95 * alpha;
      ctx2d.fillStyle   = LABEL_BG_COLOR;
      roundRectPath(ctx2d, bx, by, bw, bh, Math.min(bh / 2, 10));
      ctx2d.fill();
      // 縁取り
      ctx2d.lineWidth   = 1.6;
      ctx2d.strokeStyle = 'rgba(' + GLOW_COLOR_RGB + ', 0.85)';
      ctx2d.stroke();
      // 文字
      ctx2d.globalAlpha = 1.0 * alpha;
      ctx2d.fillStyle   = LABEL_TEXT_COLOR;
      ctx2d.fillText(label, bx + bw / 2, by + bh / 2);
    } finally {
      ctx2d.restore();
    }
  }

  function roundRectPath(ctx2d, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx2d.beginPath();
    ctx2d.moveTo(x + rr, y);
    ctx2d.lineTo(x + w - rr, y);
    ctx2d.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx2d.lineTo(x + w, y + h - rr);
    ctx2d.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx2d.lineTo(x + rr, y + h);
    ctx2d.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx2d.lineTo(x, y + rr);
    ctx2d.quadraticCurveTo(x, y, x + rr, y);
    ctx2d.closePath();
  }

  // ────────────────────────────────────────────────
  // rAF ループ — ハイライト表示中だけ回す
  // ────────────────────────────────────────────────
  function ensureRedrawLoop() {
    if (state.rafId) return;
    function tick() {
      state.rafId = 0;
      var t = now();
      if (t >= state.showEnd) {
        // 終了 — クリア + 1 フレーム redraw して overlay を消す
        clearHighlight();
        try { window.PonoPuzzleRequestRedraw && window.PonoPuzzleRequestRedraw(); } catch (_) {}
        return;
      }
      try { window.PonoPuzzleRequestRedraw && window.PonoPuzzleRequestRedraw(); } catch (_) {}
      state.rafId = window.requestAnimationFrame(tick);
    }
    state.rafId = window.requestAnimationFrame(tick);
  }

  function clearHighlight() {
    state.activeTarget = null;
    state.activeNeighbors = [];
    state.showStart = 0;
    state.showEnd = 0;
    if (state.rafId) {
      try { window.cancelAnimationFrame(state.rafId); } catch (_) {}
      state.rafId = 0;
    }
  }

  // ────────────────────────────────────────────────
  // 長押し検出 — canvas pointer events を直接購読
  // ────────────────────────────────────────────────
  function getCanvasPos(canvas, e) {
    var rect = canvas.getBoundingClientRect();
    var sx = canvas.width  / rect.width;
    var sy = canvas.height / rect.height;
    var cx, cy;
    if (e.touches && e.touches[0]) {
      cx = e.touches[0].clientX; cy = e.touches[0].clientY;
    } else {
      cx = e.clientX; cy = e.clientY;
    }
    return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
  }

  // 「ヒット」判定: pieces 配列から (x,y) を含む盤外ピースを返す。
  // main.js の hitTest は private なので、 ここでは「ピース矩形 (回転無視) 内に
  // 入っているか」の簡易バウンディングで判定する (長押し用なので軽量で十分)。
  function hitTestOffBoardPiece(pieces, pieceW, pieceH, x, y) {
    if (!pieces || !pieces.length) return null;
    // zOrder 降順 (前面優先) で見つかった最初のもの
    var sorted = pieces.slice().sort(function (a, b) { return (b.zOrder || 0) - (a.zOrder || 0); });
    for (var i = 0; i < sorted.length; i++) {
      var p = sorted[i];
      if (!p || p.snapped) continue;
      if (x >= p.x && x <= p.x + pieceW && y >= p.y && y <= p.y + pieceH) {
        return p;
      }
    }
    return null;
  }

  function cancelLongPress() {
    if (state.pressTimer) {
      try { clearTimeout(state.pressTimer); } catch (_) {}
      state.pressTimer = 0;
    }
    state.pressPiece = null;
    state.pressPointerId = null;
  }

  function firePressNow() {
    // 長押し成立 → ハイライト発火
    var piece = state.pressPiece;
    state.pressTimer = 0;
    state.pressPiece = null;
    state.pressPointerId = null;
    if (!piece || piece.snapped) return;
    if (!state.partnerActive) return;
    if (state.currentLevel <= 0) return;

    var ctx = state.lastCtx;
    if (!ctx || !ctx.pieces || !ctx.pieceSize) return;

    var cap = maxNeighborsForLevel(state.currentLevel);
    var neighbors = collectNeighbors(piece, ctx.pieces, cap);
    if (!neighbors.length) return; // 角ピースで隣接 0 (理論上は起こらないが安全側)

    try {
      if (typeof window.PonoPartnerAbilityCutin === 'function') {
        window.PonoPartnerAbilityCutin(PARTNER_ID, { label: 'みつけた!' });
      }
    } catch (_) {}

    state.activeTarget = piece;
    state.activeNeighbors = neighbors;
    var t = now();
    state.showStart = t;
    state.showEnd   = t + SHOW_DURATION_MS;
    ensureRedrawLoop();

    // ハプティクス (軽い "発見" 感) — 任意。 サイレントモード等で失敗しても無視。
    try {
      if (navigator && navigator.vibrate) navigator.vibrate(18);
    } catch (_) {}
  }

  function onPointerDown(e) {
    try {
      if (!state.partnerActive || state.currentLevel <= 0) return;
      var canvas = state.boundCanvas;
      if (!canvas) return;
      var ctx = state.lastCtx;
      if (!ctx || !ctx.pieces || !ctx.pieceSize) return;
      var pos = getCanvasPos(canvas, e);
      var piece = hitTestOffBoardPiece(ctx.pieces, ctx.pieceSize.w, ctx.pieceSize.h, pos.x, pos.y);
      if (!piece) return;

      cancelLongPress();
      state.pressPiece    = piece;
      state.pressStartX   = pos.x;
      state.pressStartY   = pos.y;
      state.pressPointerId = (e.pointerId != null) ? e.pointerId : null;
      state.pressTimer = setTimeout(firePressNow, LONG_PRESS_MS);
    } catch (_) { cancelLongPress(); }
  }

  function onPointerMove(e) {
    try {
      if (!state.pressTimer) return;
      var canvas = state.boundCanvas;
      if (!canvas) return;
      // 別ポインタによる move は無視 (マルチタッチ対策)
      if (state.pressPointerId != null && e.pointerId != null && e.pointerId !== state.pressPointerId) return;
      var pos = getCanvasPos(canvas, e);
      var d = Math.hypot(pos.x - state.pressStartX, pos.y - state.pressStartY);
      if (d > LONG_PRESS_MOVE_PX) {
        cancelLongPress();
      }
    } catch (_) { cancelLongPress(); }
  }

  function onPointerEnd(_e) {
    cancelLongPress();
  }

  function bindCanvasIfNeeded() {
    try {
      var container = document.getElementById('puzzle-container');
      if (!container) return;
      var canvas = container.querySelector('canvas');
      if (!canvas) return;
      if (state.boundCanvas === canvas) return; // 既にバインド済み
      // 古い canvas からは解除
      if (state.boundCanvas) {
        try {
          state.boundCanvas.removeEventListener('pointerdown',   onPointerDown);
          state.boundCanvas.removeEventListener('pointermove',   onPointerMove);
          state.boundCanvas.removeEventListener('pointerup',     onPointerEnd);
          state.boundCanvas.removeEventListener('pointercancel', onPointerEnd);
        } catch (_) {}
      }
      // capture=false / passive=true (main.js は preventDefault するが、 こちらは無干渉)
      canvas.addEventListener('pointerdown',   onPointerDown, { passive: true });
      canvas.addEventListener('pointermove',   onPointerMove, { passive: true });
      canvas.addEventListener('pointerup',     onPointerEnd,  { passive: true });
      canvas.addEventListener('pointercancel', onPointerEnd,  { passive: true });
      state.boundCanvas = canvas;
    } catch (_) {}
  }

  // ────────────────────────────────────────────────
  // フック
  // ────────────────────────────────────────────────
  function onBeforeStageStart(_ctx) {
    // ステージ切替で全クリア
    cancelLongPress();
    clearHighlight();
    state.partnerActive = false;
    state.currentStageId = null;
    state.currentLevel = 0;
    state.lastCtx = null;
  }

  function onAfterStageReady(ctx) {
    try {
      var partner = ctx && ctx.partner;
      state.partnerActive = !!(partner && partner.id === PARTNER_ID);
      var sid = pickStageId(ctx);
      state.currentStageId = sid;
      state.currentLevel   = state.partnerActive ? resolveLevel(sid) : 0;
      // ctx.pieces / ctx.pieceSize / ctx.board が来る (main.js initPuzzle 末尾)
      state.lastCtx = {
        pieces:    (ctx && ctx.pieces) || null,
        pieceSize: (ctx && ctx.pieceSize) || null,
        board:     (ctx && ctx.board) || null,
      };
      // canvas が新しく差し替わっているのでイベントを再バインド
      if (state.partnerActive && state.currentLevel > 0) {
        bindCanvasIfNeeded();
      }
    } catch (_) {}
  }

  function onDuringDrag(ctx) {
    // ドラッグ中なら長押し判定は確実にキャンセル
    cancelLongPress();
    // 念のため lastCtx の pieceSize を最新化 (リサイズ時の保険)
    try {
      if (ctx && ctx.pieceSize && state.lastCtx) {
        state.lastCtx.pieceSize = ctx.pieceSize;
      }
    } catch (_) {}
  }

  function onAfterSnap(_ctx) {
    // スナップしたピースが起点 or 隣接に含まれていたら整理する
    if (!state.activeTarget) return;
    try {
      if (state.activeTarget && state.activeTarget.snapped) {
        clearHighlight();
        return;
      }
      // 隣接側がスナップされた場合は表示を継続するが、 該当エントリだけ除外
      if (state.activeNeighbors && state.activeNeighbors.length) {
        state.activeNeighbors = state.activeNeighbors.filter(function (n) {
          return n && n.piece && !n.piece.snapped;
        });
        if (!state.activeNeighbors.length) clearHighlight();
      }
    } catch (_) {}
  }

  function onDrawOverlay(ctx) {
    if (!ctx || !ctx.ctx) return;
    // pieces / pieceSize を最新の drawOverlay コンテキストから常時更新
    // (main.js が毎フレーム drawOverlay を呼ぶ前提)
    if (!state.lastCtx) state.lastCtx = {};
    if (ctx.pieces)    state.lastCtx.pieces    = ctx.pieces;
    if (ctx.pieceSize) state.lastCtx.pieceSize = ctx.pieceSize;
    if (ctx.board)     state.lastCtx.board     = ctx.board;

    if (!state.partnerActive || state.currentLevel <= 0) return;
    if (!state.activeTarget || !state.activeNeighbors.length) return;

    var pw = (ctx.pieceSize && ctx.pieceSize.w) || 0;
    var ph = (ctx.pieceSize && ctx.pieceSize.h) || 0;
    if (pw <= 0 || ph <= 0) return;

    var t = now();
    if (t >= state.showEnd) {
      clearHighlight();
      return;
    }
    var a = fadeAlpha(t);
    if (a <= 0) return;

    drawSpotlight(ctx.ctx, pw, ph, a, state.currentLevel);
  }

  function onBeforeShowSuccess(_ctx) {
    // 成功モーダル直前は確実に消す
    cancelLongPress();
    clearHighlight();
  }

  function onAfterShowSuccess(_ctx) {
    cancelLongPress();
    clearHighlight();
  }

  // ────────────────────────────────────────────────
  // 登録
  // ────────────────────────────────────────────────
  function registerAll() {
    if (typeof window.PonoAssistRegister !== 'function') return false;
    window.PonoAssistRegister('beforeStageStart',  onBeforeStageStart);
    window.PonoAssistRegister('afterStageReady',   onAfterStageReady);
    window.PonoAssistRegister('duringDrag',        onDuringDrag);
    window.PonoAssistRegister('afterSnap',         onAfterSnap);
    window.PonoAssistRegister('drawOverlay',       onDrawOverlay);
    window.PonoAssistRegister('beforeShowSuccess', onBeforeShowSuccess);
    window.PonoAssistRegister('afterShowSuccess',  onAfterShowSuccess);
    return true;
  }

  if (!registerAll()) {
    try { console.warn('[fukurou-spotlight] PonoAssistRegister not ready — retry on DOMContentLoaded'); } catch (_) {}
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        if (!registerAll()) {
          try { console.warn('[fukurou-spotlight] PonoAssistRegister still missing after DOMContentLoaded'); } catch (_) {}
        }
      }, { once: true });
    } else {
      setTimeout(function () {
        if (!registerAll()) {
          try { console.warn('[fukurou-spotlight] PonoAssistRegister still missing after setTimeout'); } catch (_) {}
        }
      }, 0);
    }
  }

  // デバッグ用エクスポート
  if (typeof window !== 'undefined') {
    window.PonoAssistFukurou = {
      partnerId: PARTNER_ID,
      _state: state,
      _debug: {
        forceFire: function (piece) {
          state.pressPiece = piece;
          firePressNow();
        },
        clear: clearHighlight,
        setLevel: function (lv) { state.currentLevel = lv; state.partnerActive = true; },
      },
    };
  }
})();
