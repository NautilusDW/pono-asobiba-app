// assists/kojika.js — コジカ「そうっとガイド」(soft-magnet) — Phase 3c
//
// パートナー 'kojika' を選択しているときだけ動作する、ピースのドラッグ補助アシスト。
//
// === Phase 3c 仕様 ===
// 1. **新しいステージで使えないバグ修正**:
//    - currentStageId が beforeStageStart で取得失敗するケース (ctx.stage が
//      未定義 / id 欠落) があり得たため、 drawOverlay/duringDrag 側でも
//      フォールバック取得 (window.PonoBond.getSelectedPartner と組み合わせ) を行う。
//    - Lv 取得時に partner.id ではなく PARTNER_ID 定数を直接使う (取り違え防止)。
//    - ステージ別なかよし度が未記録でも、 こじか選択中なら Lv1 として能力を出す。
//    - rotation が 0 でないピース (Stage 9+ challenge mode) でも glow は出すが、
//      magnetic snap は rotation === 0 のときのみ (main.js trySnap と整合)。
//
// 2. **緑光 → 青光**:
//    - メインカラー #3B82F6 (R59, G130, B246)
//    - 副カラー   #60A5FA (R96, G165, B250)
//    - 枠線上書き色も青系へ統一。
//
// 3. **青ガイドを通常スナップより先に表示 + 最近接スロットのみ反応**:
//    - Lv1: 通常 snapDist × 1.25 以上
//    - Lv2: 通常 snapDist × 1.45 以上
//    - Lv3: 通常 snapDist × 1.65 以上
//    - ドラッグ中ピース自身のホームが「全未スナップピースのホームのうち最近接」で
//      ある場合のみ glow を出す (他のスロットが近い時は反応しない)。
//
// 4. **離した時の magnetic snap (吸い付き)**:
//    - kojika 装備時は pointerup 時点でホーム距離が拡張閾値内なら強制 snap。
//    - Lv1: SNAP_DIST × 1.45
//    - Lv2: SNAP_DIST × 1.65
//    - Lv3: SNAP_DIST × 1.85
//    - 実装: afterStageReady で puzzleCanvas を取得し、 我々の pointerup を
//      main.js のものより後に登録する。 main.js の trySnap が距離超過で失敗した後、
//      我々が距離をチェックし window.PonoPuzzleForceSnapPiece(piece) を呼ぶ。
//    - main.js の SNAP_DIST 定数本体は不変。
//
// 5. **既存の枠線色変更ロジック維持** (緑 → 青)。
//
// 既存 PonoAssistRegister のフック契約は維持。 partner.id !== 'kojika' なら no-op。
(function () {
  'use strict';

  var PARTNER_ID = 'kojika';

  // Lv (1〜3) → { guideMul, alpha, magnetMul } 設定。 Lv0 は no-op。
  // guideMul:   glow 反応範囲 (= 通常 snapDist * guideMul)
  // alpha:      glow 不透明度の基準
  // magnetMul:  pointerup 時の吸い付き拡張倍率 (= SNAP_DIST * magnetMul)
  var LV_PROFILE = {
    1: { guideMul: 1.25, alpha: 0.58, magnetMul: 1.45 },
    2: { guideMul: 1.45, alpha: 0.72, magnetMul: 1.65 },
    3: { guideMul: 1.65, alpha: 0.88, magnetMul: 1.85 },
  };

  // main.js drawPiece 側のピース枠線設定 (参考値):
  //   dragPiece の strokeStyle = '#F2915A' (オレンジ), lineWidth = 2.5
  // 仕様: 閾値内に入ったら青 (#3B82F6) でストロークを上書き、太さ 2 倍。
  var OUTLINE_BASE_WIDTH = 2.5;     // dragPiece 通常時の lineWidth
  var OUTLINE_MULTIPLIER = 2.0;     // 仕様: 「太さを 2 倍」
  var OUTLINE_NEAR_COLOR = { r: 59, g: 130, b: 246 }; // #3B82F6 (青)
  // glow に使う 2 色 (中心の明るい青 / 外周の濃い青)
  var GLOW_LIGHT = { r: 96,  g: 165, b: 250 }; // #60A5FA (薄い青)
  var GLOW_MAIN  = { r: 59,  g: 130, b: 246 }; // #3B82F6 (青)
  var GLOW_DEEP  = { r: 37,  g: 99,  b: 235 }; // #2563EB (濃い青)

  // main.js 側 snapAssist → SNAP_DIST 比率の写し (main.js SNAP_ASSIST_RATIO と整合)。
  // SNAP_DIST 本体定数を取れないため、 pieceW × ratio で再計算する。
  var SNAP_ASSIST_RATIO = {
    'very-strong':   0.55,
    'strong':        0.45,
    'medium-strong': 0.38,
    'normal':        0.30,
  };
  var DEFAULT_SNAP_RATIO = 0.30;

  // 直近 duringDrag からの経過がこの ms を越えたらドラッグ中ではないとみなす
  var DRAG_STALE_MS = 400;

  // duringDrag で更新する直近ドラッグ状態
  // - piece: 直近ドラッグ中のピース参照 (pointerup 時の magnet snap で再利用)
  // - lastTs: 直近 duringDrag 時刻 (glow 描画の DRAG_STALE_MS 判定に使う)
  // - lastPieceW: drawOverlay で取得した最新の pieceW (magnet snap の閾値再計算用)
  // - lastPieces: drawOverlay で取得した最新の pieces 配列 (最近接スロット判定用)
  var dragState = {
    piece: null,
    lastTs: 0,
    lastPieceW: 0,
    lastPieces: null,
  };

  // beforeStageStart で更新する現在のステージ情報
  var currentStageId = null;
  var currentSnapRatio = DEFAULT_SNAP_RATIO;

  // pointerup を attach 済みの canvas 要素 (二重登録防止)
  var attachedCanvas = null;

  // 「コジカが選択中か」判定 (partner ctx が無い時のフォールバック)
  function isKojika(partner) {
    if (partner && partner.id) return partner.id === PARTNER_ID;
    try {
      if (window.PonoBond && typeof window.PonoBond.getSelectedPartner === 'function') {
        return window.PonoBond.getSelectedPartner() === PARTNER_ID;
      }
    } catch (_) {}
    return false;
  }

  // 現在の bond レベル (0〜3)。 失敗時は 0。
  // 注意: partner.id を引数経由で取らない (取り違え防止)。 PARTNER_ID を直接使う。
  function currentLevel() {
    try {
      if (window.PonoBond && typeof window.PonoBond.getLevel === 'function' && currentStageId != null) {
        var lv = window.PonoBond.getLevel(PARTNER_ID, currentStageId);
        if (lv >= 1 && lv <= 3) return lv;
      }
    } catch (_) {}
    // 仲良し度はステージ別に保存されるため、初めてのステージでは lv=0 になる。
    // パートナー選択中なら能力自体は Lv1 として出し、仲良し度は強さだけに使う。
    if (isKojika(null)) return 1;
    return 0;
  }

  // ctx.stage が来た時に currentStageId / currentSnapRatio を更新する共通処理。
  // beforeStageStart 以外 (drawOverlay/duringDrag) からもフォールバック呼び出し可能。
  function rememberStage(stage, stageIndexFallback) {
    if (stage && stage.id != null) {
      currentStageId = stage.id;
    } else if (stageIndexFallback != null) {
      currentStageId = stageIndexFallback + 1; // フォールバック (1-origin)
    }
    if (stage && stage.snapAssist && SNAP_ASSIST_RATIO[stage.snapAssist] != null) {
      currentSnapRatio = SNAP_ASSIST_RATIO[stage.snapAssist];
    } else {
      currentSnapRatio = DEFAULT_SNAP_RATIO;
    }
  }

  // 「ドラッグ中ピース自身のホーム」が、 全未スナップピースのホームのうち最近接か?
  // 違う (他ピースのホームの方が近い) なら、 紛らわしいので glow を出さない。
  // pieces: drawOverlay ctx.pieces (= main.js の pieces 配列)
  function isOwnHomeNearest(piece, pieces) {
    if (!pieces || pieces.length < 2) return true;
    var ownDist = Math.hypot(piece.x - piece.homeX, piece.y - piece.homeY);
    for (var i = 0; i < pieces.length; i++) {
      var other = pieces[i];
      if (!other || other === piece) continue;
      if (other.snapped) continue;
      var od = Math.hypot(piece.x - other.homeX, piece.y - other.homeY);
      if (od < ownDist) return false; // 他ピースのホームが近い → 反応しない
    }
    return true;
    // 注: piece.x/y, other.homeX/Y は全てピース矩形左上基準なので
    //     左上 vs 左上 の距離比較で十分 (中心換算しても同じ順序になる)
  }

  // === Hook: beforeStageStart ===
  // ステージ ID + snapAssist 比率を覚えておく。
  function onBeforeStageStart(ctx) {
    if (!ctx) return;
    rememberStage(ctx.stage || null, ctx.stageIndex);
    // ステージ切り替え時はドラッグ状態をリセット
    dragState.piece = null;
    dragState.lastTs = 0;
    dragState.lastPieceW = 0;
    dragState.lastPieces = null;
  }

  // === Hook: afterStageReady ===
  // 新しい canvas が生成された後に呼ばれる。 ここで pointerup を二重登録する
  // (main.js より後ろに来るので、 main.js の trySnap 失敗の「後」に走る)。
  function onAfterStageReady(ctx) {
    if (!ctx) return;
    // snapAssist 比率は beforeStageStart で取得済みだが、 念のため再確認
    rememberStage(ctx.stage || null, ctx.stageIndex);

    // canvas を puzzle-container から探す (ctx に canvas DOM 自体は来ない)
    var container = document.getElementById('puzzle-container');
    if (!container) return;
    var canvas = container.querySelector('canvas');
    if (!canvas) return;
    if (canvas === attachedCanvas) return; // 同じ canvas には付け直さない
    attachedCanvas = canvas;
    // capture: false で main.js の bubble phase ハンドラの後に呼ばれる
    // main.js と同じイベント集合 (pointerup / pointercancel / lostpointercapture)
    canvas.addEventListener('pointerup',          onCanvasPointerUp, { passive: true });
    canvas.addEventListener('pointercancel',      onCanvasPointerUp, { passive: true });
    canvas.addEventListener('lostpointercapture', onCanvasPointerUp, { passive: true });
  }

  // === Hook: duringDrag ===
  // ドラッグ中のピース参照と最新時刻を保存。コジカ以外は無視。
  function onDuringDrag(ctx) {
    if (!ctx || !ctx.piece) return;
    if (!isKojika(ctx.partner)) {
      dragState.piece = null;
      return;
    }
    dragState.piece = ctx.piece;
    dragState.lastTs = Date.now();
  }

  // === Hook: drawOverlay ===
  // 青グローを ピース描画後に重ねる。
  function onDrawOverlay(ctx) {
    if (!ctx || !ctx.ctx) return;
    if (!isKojika(ctx.partner)) return;

    // currentStageId == null は beforeStageStart 取り損ね時のみ発生。
    // その場合 currentLevel() が 0 になり、 下の lv チェックで no-op になる。

    var piece = dragState.piece;
    if (!piece) return;
    // 注意: 「ドラッグ停止 400ms 経過」での glow 非表示は維持するが、
    //       dragState.piece を null にはしない (slow user の pointerup magnet snap が
    //       失われないため)。 piece は次の onBeforeStageStart で明示リセットされる。
    var isStale = (Date.now() - dragState.lastTs > DRAG_STALE_MS);
    if (piece.snapped) return;

    var lv = currentLevel();
    if (lv < 1) return;
    var profile = LV_PROFILE[lv];
    if (!profile) return;

    var cctx = ctx.ctx;
    var canvas = cctx.canvas;
    if (!canvas) return;

    // === ピース実寸を main.js から取得 ===
    var pieceSize = ctx.pieceSize || null;
    var pieceW = pieceSize && pieceSize.w > 0 ? pieceSize.w : 0;
    var pieceH = pieceSize && pieceSize.h > 0 ? pieceSize.h : 0;
    if (pieceW <= 0 || pieceH <= 0) return;

    // magnet snap が pointerup 時に pieceW / pieces を必要とするので毎フレ記録
    dragState.lastPieceW = pieceW;
    dragState.lastPieces = ctx.pieces || null;

    // glow 描画は stale だとスキップ (= 元コードの挙動を保ったまま)
    if (isStale) return;

    var halfW = pieceW / 2;
    var halfH = pieceH / 2;

    // 基準閾値: 通常スナップ距離より先に青いガイドを見せる。
    // これにより「こじかを使っている時だけ違う」ことが目で分かる。
    var snapDist = pieceW * (currentSnapRatio || DEFAULT_SNAP_RATIO);
    var baseThreshold = Math.max(snapDist, pieceW * 0.38);
    var threshold = Math.max(snapDist * profile.guideMul, pieceW * 0.48);

    // ピース現在位置と homeX/homeY の距離
    var dx = piece.x - piece.homeX;
    var dy = piece.y - piece.homeY;
    var dist = Math.hypot(dx, dy);

    // glow を出すべきかは threshold (狭めた反応範囲) で判定
    if (dist >= threshold) return;

    // 「最近接スロット」確認: 他ピースのホームの方が近ければ glow を出さない
    if (!isOwnHomeNearest(piece, ctx.pieces)) return;

    // === グロー中心: ピース中央 (左上 + 半幅) ===
    var cx = piece.x + halfW;
    var cy = piece.y + halfH;
    var hx = piece.homeX + halfW;
    var hy = piece.homeY + halfH;

    var nearness = 1 - (dist / threshold); // 0..1
    if (nearness < 0) nearness = 0;
    if (nearness > 1) nearness = 1;
    var alpha = profile.alpha * (0.40 + 0.60 * nearness);

    var canvasW = canvas.width || 0;
    var rawRadius = pieceW * 0.6 * (1 + lv * 0.2);
    var radius = canvasW > 0 ? Math.min(rawRadius, canvasW * 0.15) : rawRadius;

    cctx.save();
    try {
      cctx.globalCompositeOperation = 'lighter';

      // --- (1) ピース現在地 (ドラッグ中) を中心とした青グロー ---
      var grad = cctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius);
      grad.addColorStop(0.0,
        'rgba(' + GLOW_LIGHT.r + ',' + GLOW_LIGHT.g + ',' + GLOW_LIGHT.b + ',' + alpha.toFixed(3) + ')');
      grad.addColorStop(0.45,
        'rgba(' + GLOW_MAIN.r + ',' + GLOW_MAIN.g + ',' + GLOW_MAIN.b + ',' + (alpha * 0.55).toFixed(3) + ')');
      grad.addColorStop(1.0,
        'rgba(' + GLOW_DEEP.r + ',' + GLOW_DEEP.g + ',' + GLOW_DEEP.b + ',0)');
      cctx.fillStyle = grad;
      cctx.beginPath();
      cctx.arc(cx, cy, radius, 0, Math.PI * 2);
      cctx.fill();

      // --- (2) ピース現在地 → ホーム位置への soft ガイドライン ---
      if (dist > baseThreshold * 0.4) {
        var lineAlpha = profile.alpha * (0.35 + 0.45 * nearness);
        var lineGrad = cctx.createLinearGradient(cx, cy, hx, hy);
        lineGrad.addColorStop(0.0,
          'rgba(' + GLOW_LIGHT.r + ',' + GLOW_LIGHT.g + ',' + GLOW_LIGHT.b + ',' + lineAlpha.toFixed(3) + ')');
        lineGrad.addColorStop(1.0,
          'rgba(' + GLOW_LIGHT.r + ',' + GLOW_LIGHT.g + ',' + GLOW_LIGHT.b + ',0)');
        cctx.strokeStyle = lineGrad;
        cctx.lineWidth = Math.max(2, baseThreshold * 0.18);
        cctx.lineCap = 'round';
        cctx.beginPath();
        cctx.moveTo(cx, cy);
        cctx.lineTo(hx, hy);
        cctx.stroke();
      }

      // --- (3) ホーム位置 (正解地点) にも控えめな青グロー (着地点ヒント) ---
      var homeAlpha = profile.alpha * 0.35 * (0.5 + 0.5 * nearness);
      var homeRadius = radius * 0.55;
      var homeGrad = cctx.createRadialGradient(hx, hy, homeRadius * 0.05, hx, hy, homeRadius);
      homeGrad.addColorStop(0.0,
        'rgba(' + GLOW_LIGHT.r + ',' + GLOW_LIGHT.g + ',' + GLOW_LIGHT.b + ',' + homeAlpha.toFixed(3) + ')');
      homeGrad.addColorStop(0.6,
        'rgba(' + GLOW_MAIN.r + ',' + GLOW_MAIN.g + ',' + GLOW_MAIN.b + ',' + (homeAlpha * 0.4).toFixed(3) + ')');
      homeGrad.addColorStop(1.0,
        'rgba(' + GLOW_DEEP.r + ',' + GLOW_DEEP.g + ',' + GLOW_DEEP.b + ',0)');
      cctx.fillStyle = homeGrad;
      cctx.beginPath();
      cctx.arc(hx, hy, homeRadius, 0, Math.PI * 2);
      cctx.fill();
    } catch (_) {
      // 描画失敗時も本体に影響を出さない
    }
    cctx.restore();

    // === (4) ピース枠線の上書き描画 (青、太さ 2 倍) ===
    try {
      if (nearness > 0.05) {
        cctx.save();
        cctx.globalCompositeOperation = 'source-over';

        var rot = piece.rotation || 0;
        if (rot) {
          cctx.translate(cx, cy);
          cctx.rotate(rot * Math.PI / 180);
          cctx.translate(-cx, -cy);
        }

        var outlineAlpha = 0.6 + 0.4 * nearness;
        cctx.strokeStyle = 'rgba(' + OUTLINE_NEAR_COLOR.r + ',' + OUTLINE_NEAR_COLOR.g + ',' + OUTLINE_NEAR_COLOR.b + ',' + outlineAlpha.toFixed(3) + ')';

        var widthScale = 0.7 + 0.3 * nearness;
        cctx.lineWidth = OUTLINE_BASE_WIDTH * OUTLINE_MULTIPLIER * widthScale;
        cctx.lineJoin = 'round';
        cctx.lineCap = 'round';

        cctx.beginPath();
        if (typeof ctx.buildPiecePath === 'function') {
          ctx.buildPiecePath(cctx, piece.x, piece.y, pieceW, pieceH, piece.tabs);
        } else {
          cctx.rect(piece.x, piece.y, pieceW, pieceH);
        }
        cctx.stroke();

        cctx.restore();
      }
    } catch (_) {
      // 枠線描画失敗時もグロー部の描画は維持済み
    }
  }

  // === Canvas pointerup ハンドラ: magnetic snap ===
  // main.js の onPointerUp の「後」に走る (addEventListener 登録順)。
  // main.js の trySnap が距離超過で失敗していても、 拡張閾値内なら強制 snap する。
  //
  // 判定は「離した瞬間の最新状態」で行う (drawOverlay でフラグを立てない方式):
  //   - dragState.piece が直近ドラッグピース
  //   - 既に main.js の trySnap で snap 済みなら何もしない
  //   - rotation !== 0 なら何もしない (main.js trySnap と整合)
  //   - Lv0 (bond 未到達) なら何もしない
  //   - 距離が拡張閾値 (SNAP_DIST × magnetMul) 内かつ自分の home が最近接なら snap
  function onCanvasPointerUp(_e) {
    try {
      if (!isKojika(null)) return;
      var piece = dragState.piece;
      // 一度処理したらピース参照を消す (同じピースで二重発火防止)
      dragState.piece = null;
      if (!piece || piece.snapped) return;
      if (piece.rotation) return; // 回転中ピースは snap 不可

      var lv = currentLevel();
      if (lv < 1) return;
      var profile = LV_PROFILE[lv];
      if (!profile) return;

      var pieceW = dragState.lastPieceW;
      if (!pieceW || pieceW <= 0) return;

      var snapDist = pieceW * (currentSnapRatio || DEFAULT_SNAP_RATIO);
      var magnetThreshold = snapDist * profile.magnetMul;

      var dist = Math.hypot(piece.x - piece.homeX, piece.y - piece.homeY);
      if (dist >= magnetThreshold) return;

      // 最近接スロット (=自分の home) チェック: 他ピースのホームが近ければ snap しない。
      // drawOverlay で都度キャッシュ済みの dragState.lastPieces を使う。
      // (lastPieces が無い場合は安全側で skip しない — 拡張閾値はそもそも狭い設計)
      if (dragState.lastPieces && !isOwnHomeNearest(piece, dragState.lastPieces)) {
        return;
      }

      if (typeof window.PonoPuzzleForceSnapPiece !== 'function') return;
      window.PonoPuzzleForceSnapPiece(piece);
    } catch (_) {
      // 失敗しても本体動作には影響させない
    }
  }

  // === 登録 ===
  function register() {
    if (!window.PonoAssistRegister) return false;
    window.PonoAssistRegister('beforeStageStart', onBeforeStageStart);
    window.PonoAssistRegister('afterStageReady', onAfterStageReady);
    window.PonoAssistRegister('duringDrag', onDuringDrag);
    window.PonoAssistRegister('drawOverlay', onDrawOverlay);
    return true;
  }

  if (!register()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', register, { once: true });
    } else {
      setTimeout(register, 0);
    }
  }

  // テスト/デバッグ用に内部状態を覗けるように (副作用なし)
  window.PonoKojikaAssist = {
    _state: dragState,
    _currentStageId: function () { return currentStageId; },
    _currentSnapRatio: function () { return currentSnapRatio; },
    _level: currentLevel,
    _LV_PROFILE: LV_PROFILE,
  };
})();
