// puzzle/assists/kitsune.js
// キツネ / つぎはここ アシスト (B案: 次のピース光らせ)。
//
// パートナーが 'kitsune' のときだけ発火する。
// ステージ開始時、未スナップピースのうち先頭 1 個を「ターゲット」として選び、
// その slot 位置 (piece.homeX, piece.homeY) に暖色系の光輪 (radial gradient) を
// 毎フレーム pulse させながら描画する。
//
// ユーザーがそのピースを snap したら、次の未スナップピースに自動切替。
// 全ピース snap されたら自動終了 (light を消す)。
//
// なかよし度レベル (PonoBond.getLevel('kitsune', stageId)) による差分:
//   Lv 0 : Lv 1 と同じ扱い (初プレイ時にいきなり「薄っ」とならないように)
//   Lv 1 : maxAlpha 0.50, pulse 控えめ
//   Lv 2 : maxAlpha 0.65, pulse 大きく (呼吸)
//   Lv 3 : maxAlpha 0.80, pulse 大きく + 矢印アイコン「ここ↓」
//
// 描画は drawOverlay フックで puzzleCtx に重ねる。redraw() の rAF に乗るので
// 自前 rAF ループは持たない。ただし入力が無いステージ開始直後にも pulse を
// 進めたいので、 軽量な rAF を 1 本だけ走らせて requestRedraw() を呼ぶ。
//
// 旧仕様 (完成形画像を半透明オーバーレイ) は廃止。
//
// 依存:
//   - window.PonoAssistRegister (main.js が定義)
//   - window.PonoBond.getLevel  (bond.js)
//
// 登録するフック:
//   - afterStageReady : pieces 参照を保持、最初のターゲットを決定、 rAF 開始。
//   - afterSnap       : 現ターゲットが snap されたら次のターゲットに切替。
//   - drawOverlay     : 毎フレーム slot 位置に光輪 + (Lv3 のみ) 矢印を描画。

(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (typeof window.PonoAssistRegister !== 'function') {
    try { console.warn('[kitsune-assist] PonoAssistRegister not found — skipped'); } catch (_) {}
    return;
  }

  var PARTNER_ID = 'kitsune';

  // Lv -> { maxAlpha, pulseAmp, showArrow }
  //   maxAlpha : pulse 振動の上限 α
  //   pulseAmp : 振動振幅 (maxAlpha - pulseAmp が下限)
  //   showArrow: 矢印アイコンを描くか
  var LEVEL_TABLE = {
    0: { maxAlpha: 0.50, pulseAmp: 0.10, showArrow: false },
    1: { maxAlpha: 0.50, pulseAmp: 0.10, showArrow: false },
    2: { maxAlpha: 0.65, pulseAmp: 0.18, showArrow: false },
    3: { maxAlpha: 0.80, pulseAmp: 0.22, showArrow: true  },
  };

  // pulse 周期 (ms)。 sin の 1 周期。
  var PULSE_PERIOD_MS = 1400;

  // 暖色系 (オレンジ〜黄色、キツネ感) のグラデーション色。
  // 中心: 明るい黄、外: オレンジ → 透明。
  var COLOR_INNER = 'rgba(255, 236, 150, ALPHA)';   // 明るい黄
  var COLOR_MID   = 'rgba(255, 178,  82, ALPHA)';   // オレンジ
  var COLOR_OUTER = 'rgba(255, 140,  40, 0)';       // 完全透明 (外周)

  // 現在のステージ状態。
  // {
  //   stageId, level, spec,
  //   pieces: Array,            // main.js の pieces 参照
  //   pieceW, pieceH,           // ピースサイズ
  //   targetIndex: number|null, // 現ターゲットの pieces 配列 index、 完了で null
  //   startedAt: number,        // pulse 起点
  //   rafId: number|null,
  //   requestRedraw: Function|null,
  //   token: number,
  // }
  var current = null;
  var nextToken = 1;

  function now() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
  }

  function isActivePartner(partner) {
    return !!(partner && partner.id === PARTNER_ID);
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

  /** 与えられた pieces 配列から最初の未スナップピースの index を返す。なければ -1。 */
  function findNextUnsnappedIndex(pieces, startIndex) {
    if (!pieces || !pieces.length) return -1;
    var from = (typeof startIndex === 'number' && startIndex >= 0) ? startIndex : 0;
    // まず from 以降を探す
    for (var i = from; i < pieces.length; i++) {
      if (pieces[i] && !pieces[i].snapped) return i;
    }
    // 見つからなければ先頭から from 未満を探す
    for (var j = 0; j < from; j++) {
      if (pieces[j] && !pieces[j].snapped) return j;
    }
    return -1;
  }

  function cancelCurrent() {
    if (current && current.rafId != null) {
      try { cancelAnimationFrame(current.rafId); } catch (_) {}
    }
    current = null;
  }

  /** rAF ループ。 ステージ開始直後など入力が無くても pulse を進める。 */
  function tick(token) {
    var st = current;
    if (!st || st.token !== token) return;
    if (st.targetIndex == null) return; // 完了済み
    // main.js の redraw を呼ぶ (drawOverlay フック経由で halo が再描画される)
    if (typeof st.requestRedraw === 'function') {
      try { st.requestRedraw(); } catch (_) {}
    }
    st.rafId = requestAnimationFrame(function () { tick(token); });
  }

  /** alpha = maxAlpha - pulseAmp + pulseAmp * (1 + sin(...)) / 2 で 0..maxAlpha 内を行き来。 */
  function computePulseAlpha(spec, elapsed) {
    var phase = (elapsed % PULSE_PERIOD_MS) / PULSE_PERIOD_MS; // 0..1
    var s = Math.sin(phase * Math.PI * 2); // -1..1
    var base = spec.maxAlpha - spec.pulseAmp;
    return base + spec.pulseAmp * (1 + s) / 2;
  }

  /** スロット位置に光輪を描画。 piece は main.js の piece オブジェクト。 */
  function paintHalo(ctx, piece, pieceW, pieceH, spec, elapsed) {
    if (!ctx || !piece) return;
    var cx = piece.homeX + pieceW / 2;
    var cy = piece.homeY + pieceH / 2;

    var alpha = computePulseAlpha(spec, elapsed);
    if (alpha <= 0) return;

    // 光輪サイズ: ピースの最大辺の 0.9 倍を半径に (slot 全体を包む)。
    // Lv2 以上は pulse に合わせて半径自体も微妙に呼吸させる。
    var maxSide = Math.max(pieceW, pieceH);
    var baseR = maxSide * 0.9;
    var pulseR = baseR;
    if (spec.pulseAmp > 0.12) {
      // pulse 大きいレベル: ±8% で呼吸
      var phase = (elapsed % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
      var s = Math.sin(phase * Math.PI * 2);
      pulseR = baseR * (1 + 0.08 * s);
    }

    ctx.save();
    try {
      var grad = ctx.createRadialGradient(cx, cy, pulseR * 0.05, cx, cy, pulseR);
      grad.addColorStop(0.00, COLOR_INNER.replace('ALPHA', String(alpha)));
      grad.addColorStop(0.40, COLOR_MID.replace('ALPHA', String(alpha * 0.75)));
      grad.addColorStop(1.00, COLOR_OUTER);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
      ctx.fill();
    } catch (e) {
      try { console.warn('[kitsune-assist] halo paint failed:', e); } catch (_) {}
    }
    ctx.restore();

    // Lv3 のみ矢印「ここ↓」: スロット上部の少し外側に下向き三角形 + 文字 'ここ'。
    if (spec.showArrow) {
      paintArrow(ctx, cx, piece.homeY, pieceW, pieceH, alpha);
    }
  }

  /** 矢印 (下向き三角) を slot の真上に描画。 alpha は halo と同期。 */
  function paintArrow(ctx, cx, slotTopY, pieceW, pieceH, alpha) {
    var size = Math.min(pieceW, pieceH) * 0.32;
    if (size < 8) size = 8;
    var gap = Math.max(6, pieceH * 0.10);
    var tipY = slotTopY - gap;            // 三角形の頂点 (下向きなので一番下)
    var topY = tipY - size;               // 三角形の上辺
    var halfW = size * 0.55;

    ctx.save();
    try {
      ctx.globalAlpha = Math.min(1, alpha + 0.10); // 矢印は少し強めに見せる
      // 黒の細い縁取り (視認性向上)
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, size * 0.10);
      ctx.strokeStyle = 'rgba(40, 22, 0, 0.85)';
      ctx.fillStyle   = '#FFB74D'; // 暖色オレンジ
      ctx.beginPath();
      ctx.moveTo(cx - halfW, topY);
      ctx.lineTo(cx + halfW, topY);
      ctx.lineTo(cx, tipY);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    } catch (_) {}
    ctx.restore();
  }

  // ── afterStageReady: ターゲット決定 + rAF 開始 ─────────────────────────
  window.PonoAssistRegister('afterStageReady', function (hookCtx) {
    cancelCurrent();
    if (!hookCtx || !isActivePartner(hookCtx.partner)) return;
    var stage = hookCtx.stage || null;
    if (!stage) return;
    var pieces = hookCtx.pieces;
    if (!pieces || !pieces.length) return;
    var pieceSize = hookCtx.pieceSize || {};
    var pieceW = pieceSize.w || 0;
    var pieceH = pieceSize.h || 0;
    if (pieceW <= 0 || pieceH <= 0) return;

    var stageId = stage.id;
    var level = getStageLevel(stageId);
    var spec = LEVEL_TABLE[level] || LEVEL_TABLE[1];

    var targetIndex = findNextUnsnappedIndex(pieces, 0);
    if (targetIndex < 0) return; // 全 snap 済み (再開ケース等)

    var token = nextToken++;
    current = {
      stageId: stageId,
      level: level,
      spec: spec,
      pieces: pieces,
      pieceW: pieceW,
      pieceH: pieceH,
      targetIndex: targetIndex,
      startedAt: now(),
      rafId: null,
      requestRedraw: null, // drawOverlay 時に hookCtx.requestRedraw を捕まえる
      token: token,
    };

    // 軽量 rAF: 入力が無くても pulse を進めるために 1 本だけ走らせる。
    current.rafId = requestAnimationFrame(function () { tick(token); });
  });

  // ── afterSnap: ターゲットが snap されたら次の未スナップピースへ ───────
  window.PonoAssistRegister('afterSnap', function (hookCtx) {
    if (!hookCtx) return;
    var st = current;
    if (!st) return;
    if (!isActivePartner(hookCtx.partner)) return;
    var pieces = st.pieces;
    if (!pieces) return;

    // 現ターゲットがまだ未スナップなら何もしない (別ピースが先に snap された)
    var cur = (st.targetIndex != null) ? pieces[st.targetIndex] : null;
    var snappedPiece = hookCtx.piece || null;

    // ターゲット以外が snap された場合でも、念のため「現ターゲットがまだ未スナップか」確認。
    if (cur && !cur.snapped) {
      // ターゲット自体は健在 → 何もしない
      return;
    }

    // ターゲットが snap された (もしくは既に消失) → 次の未スナップを探す。
    // 探索開始 index は「直前ターゲット + 1」が自然 (順序感を保つ)。
    var startFrom = (st.targetIndex != null) ? (st.targetIndex + 1) : 0;
    var nextIndex = findNextUnsnappedIndex(pieces, startFrom);

    if (nextIndex < 0) {
      // 全 snap 完了 → 終了。
      st.targetIndex = null;
      cancelCurrent();
      return;
    }

    st.targetIndex = nextIndex;
    // pulse 起点はリセットせず、 連続感を保つ (好みでリセットしても OK)。
    // requestRedraw を呼んで即座に再描画。
    if (typeof st.requestRedraw === 'function') {
      try { st.requestRedraw(); } catch (_) {}
    }
  });

  // ── drawOverlay: redraw に乗って halo を描画 ──────────────────────────
  window.PonoAssistRegister('drawOverlay', function (hookCtx) {
    if (!hookCtx) return;
    if (!isActivePartner(hookCtx.partner)) return;
    var st = current;
    if (!st || st.targetIndex == null) return;
    var ctx = hookCtx.ctx;
    if (!ctx) return;

    // requestRedraw を捕まえておく (rAF tick が使う)。
    if (typeof hookCtx.requestRedraw === 'function') {
      st.requestRedraw = hookCtx.requestRedraw;
    }

    // pieces 参照は hookCtx 側を優先 (main.js の最新参照)。
    var pieces = hookCtx.pieces || st.pieces;
    if (!pieces) return;
    var piece = pieces[st.targetIndex];
    if (!piece) return;

    // 念のためターゲットが既に snap されていたら次を探す (afterSnap を取り逃した保険)。
    if (piece.snapped) {
      var nextIndex = findNextUnsnappedIndex(pieces, st.targetIndex + 1);
      if (nextIndex < 0) {
        st.targetIndex = null;
        return;
      }
      st.targetIndex = nextIndex;
      piece = pieces[nextIndex];
      if (!piece) return;
    }

    // pieceSize は hookCtx 側を優先 (リサイズ対応の保険)。
    var ps = hookCtx.pieceSize || {};
    var pieceW = ps.w || st.pieceW;
    var pieceH = ps.h || st.pieceH;
    if (pieceW <= 0 || pieceH <= 0) return;

    var elapsed = now() - st.startedAt;
    paintHalo(ctx, piece, pieceW, pieceH, st.spec, elapsed);
  });
})();
