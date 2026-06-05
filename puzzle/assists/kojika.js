// assists/kojika.js — コジカ「そうっとガイド」(soft-magnet)
//
// パートナー 'kojika' を選択しているときだけ動作する、ピースのドラッグ補助アシスト。
//
// 仕様:
//   - duringDrag フックで、ドラッグ中のピースと「正解位置 (homeX/homeY)」の距離を計算
//   - drawOverlay フックで、距離が閾値未満なら:
//       (1) ドラッグ中ピースの現在地 (piece.x/y) を中心に緑グロー
//       (2) 現在地 → ホーム位置への soft な緑ガイドライン
//       (3) ホーム位置 (着地点) にも控えめな緑グロー
//     を重ねて描画 (「ピースを誘導する光」になる)。
//   - 閾値は Lv (なかよし度) に応じて拡大:
//       Lv1 → 1.3倍, グロー α=0.35
//       Lv2 → 1.6倍, グロー α=0.50
//       Lv3 → 2.0倍, グロー α=0.65
//       Lv0 (未プレイ) → アシストなし (no-op)
//   - 通常の SNAP_DIST は変えない。本体定数は不変。グロー閾値だけパートナー補正。
//   - 手を止めても DRAG_STALE_MS=400ms はガイドが残るようにする。
//   - partner.id !== 'kojika' なら完全 no-op。
//
// このスクリプトは main.js より先に読み込まれることを前提に、 PonoAssistRegister
// (main.js Phase 0 で登録される薄いレジストリ) があれば即時登録し、なければ
// DOMContentLoaded 後に再試行する。
(function () {
  'use strict';

  var PARTNER_ID = 'kojika';

  // Lv (1〜3) → { distMul, alpha } グロー設定。 Lv0 は不使用。
  // ユーザー実機 FB: 「光が弱い」「枠線も緑/青に変化してほしい」「太さ2倍」
  //   → alpha を一段強化 (Lv1 0.35→0.55, Lv2 0.50→0.70, Lv3 0.65→0.85)
  //   → drawOverlay 内でピース枠線を緑で上書き (太さ ~2x = ドラッグ通常 2.5 → 5.0)
  var LV_PROFILE = {
    1: { distMul: 1.3, alpha: 0.55 },
    2: { distMul: 1.6, alpha: 0.70 },
    3: { distMul: 2.0, alpha: 0.85 },
  };

  // main.js drawPiece 側のピース枠線設定 (参考値):
  //   dragPiece の strokeStyle = '#F2915A' (オレンジ), lineWidth = 2.5
  //   その他 piece は '#5D4E37' (こげ茶), lineWidth = 1.8
  // 仕様: 閾値内に入ったら緑 (#22c55e) でストロークを上書き、太さ 2 倍。
  var OUTLINE_BASE_WIDTH = 2.5;     // dragPiece 通常時の lineWidth
  var OUTLINE_MULTIPLIER = 2.0;     // 仕様: 「太さを 2 倍」
  // 通常 (遠い時) のオレンジ — 描画スキップで main.js のオレンジが透けて見える
  var OUTLINE_NEAR_COLOR = { r: 34, g: 197, b: 94 }; // #22c55e (緑)

  // canvas 幅に対する「基準スナップ閾値」の比率。
  // main.js 側 SNAP_DIST = pieceW * (0.30〜0.55)。pieceW はおおむね
  // (canvasW * 0.50) / stageCols。stageCols は 2〜5 が中心なので、
  // canvasW * 0.05 前後を「通常スナップ相当」のグロー基準とする。
  var BASE_THRESHOLD_RATIO = 0.05;

  // 直近 duringDrag からの経過がこの ms を越えたらドラッグ中ではないとみなす
  // 手を止めても 400ms はガイドが消えないように余裕を持たせる
  var DRAG_STALE_MS = 400;

  // duringDrag で更新する直近ドラッグ状態
  var dragState = {
    piece: null,
    lastTs: 0,
  };

  // beforeStageStart で更新する現在のステージ ID (PonoBond.getLevel に渡す)
  var currentStageId = null;

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
  function currentLevel() {
    try {
      if (window.PonoBond && typeof window.PonoBond.getLevel === 'function' && currentStageId != null) {
        var lv = window.PonoBond.getLevel(PARTNER_ID, currentStageId);
        if (lv >= 1 && lv <= 3) return lv;
        return 0;
      }
    } catch (_) {}
    return 0;
  }

  // === Hook: beforeStageStart ===
  // ステージ ID を覚えておく (bond レベル参照のため)。
  function onBeforeStageStart(ctx) {
    if (!ctx) return;
    var stage = ctx.stage || null;
    if (stage && stage.id != null) {
      currentStageId = stage.id;
    } else if (ctx.stageIndex != null) {
      currentStageId = ctx.stageIndex + 1; // フォールバック (1-origin)
    }
    // ステージ切り替え時はドラッグ状態をリセット
    dragState.piece = null;
    dragState.lastTs = 0;
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
  // 緑グローを ピース描画後に重ねる。
  function onDrawOverlay(ctx) {
    if (!ctx || !ctx.ctx) return;
    if (!isKojika(ctx.partner)) return;

    var piece = dragState.piece;
    if (!piece) return;
    // 直近 duringDrag から間が空いていたら描画しない (ドラッグ終了後の残像防止)
    if (Date.now() - dragState.lastTs > DRAG_STALE_MS) {
      dragState.piece = null;
      return;
    }
    // スナップ済みピースには出さない
    if (piece.snapped) return;

    var lv = currentLevel();
    if (lv < 1) return; // Lv0 は no-op
    var profile = LV_PROFILE[lv];
    if (!profile) return;

    var cctx = ctx.ctx;
    var canvas = cctx.canvas;
    if (!canvas) return;

    // === ピース実寸を main.js から取得 (推定をやめる) ===
    // main.js は drawOverlay フック呼出し時に ctx.pieceSize = { w: pieceW, h: pieceH }
    // を渡している。 piece.x / piece.y / piece.homeX / piece.homeY は全て
    // 「ピース矩形の左上隅 (canvas px)」基準なので、中央は + pieceW/2, + pieceH/2 で得る。
    var pieceSize = ctx.pieceSize || null;
    var pieceW = pieceSize && pieceSize.w > 0 ? pieceSize.w : 0;
    var pieceH = pieceSize && pieceSize.h > 0 ? pieceSize.h : 0;
    if (pieceW <= 0 || pieceH <= 0) return; // 不明な場合は安全側で何もしない

    var halfW = pieceW / 2;
    var halfH = pieceH / 2;

    // 基準閾値: ピース幅ベース (canvas 幅ベース推定を捨て、実寸に追従)
    // ピース幅の半分を「通常スナップ相当」のグロー基準とする (main.js SNAP_DIST と整合)。
    var baseThreshold = pieceW * 0.5;
    var threshold = baseThreshold * profile.distMul;

    // ピース現在位置と homeX/homeY の距離 (どちらも左上隅基準なので差は中央同士の差に等しい)
    var dx = piece.x - piece.homeX;
    var dy = piece.y - piece.homeY;
    var dist = Math.hypot(dx, dy);
    if (dist >= threshold) return;

    // === グロー中心: ピース中央 (左上 + 半幅) ===
    var cx = piece.x + halfW;
    var cy = piece.y + halfH;
    var hx = piece.homeX + halfW;
    var hy = piece.homeY + halfH;

    // dist が小さいほど不透明に (吸い寄せ感の演出)
    var nearness = 1 - (dist / threshold); // 0..1
    if (nearness < 0) nearness = 0;
    if (nearness > 1) nearness = 1;
    var alpha = profile.alpha * (0.40 + 0.60 * nearness);

    // glow 半径: ピース幅ベース。 Lv プロファイル維持 (Lv1=1.3/0.35, Lv2=1.6/0.50, Lv3=2.0/0.65)。
    // glowRadius = pieceW * 0.6 * (1 + Lv * 0.2) → Lv1 1.2x, Lv2 1.4x, Lv3 1.6x の自然な拡大
    // ★ high finding 修正: 2列 (320px 等) の小さい canvas で Lv3 半径が canvas 幅を
    //   大きく超えて隣接タイルに光被りする問題を防ぐため、 canvas 幅の 15% を上限にクランプ。
    //   これで Lv 進化感は保ちつつ、 0-3 歳児が「どこに置くか」を見失わない。
    var canvasW = canvas.width || 0;
    var rawRadius = pieceW * 0.6 * (1 + lv * 0.2);
    var radius = canvasW > 0 ? Math.min(rawRadius, canvasW * 0.15) : rawRadius;

    cctx.save();
    try {
      // 既存ピース描画と干渉しないよう、加算合成で柔らかい光に
      cctx.globalCompositeOperation = 'lighter';

      // --- (1) ピース現在地 (ドラッグ中) を中心とした緑グロー ---
      var grad = cctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius);
      // 中心: 緑強め (柔らかい黄緑寄り) → 外周: 透明
      grad.addColorStop(0.0, 'rgba(140, 230, 130, ' + alpha.toFixed(3) + ')');
      grad.addColorStop(0.45, 'rgba(110, 210, 110, ' + (alpha * 0.55).toFixed(3) + ')');
      grad.addColorStop(1.0, 'rgba(80, 180, 100, 0)');
      cctx.fillStyle = grad;
      cctx.beginPath();
      cctx.arc(cx, cy, radius, 0, Math.PI * 2);
      cctx.fill();

      // --- (2) ピース現在地 → ホーム位置への soft ガイドライン ---
      // dist が極端に小さければラインは描かない (もう吸着寸前)
      if (dist > baseThreshold * 0.4) {
        var lineAlpha = profile.alpha * (0.35 + 0.45 * nearness);
        var lineGrad = cctx.createLinearGradient(cx, cy, hx, hy);
        lineGrad.addColorStop(0.0, 'rgba(140, 230, 130, ' + lineAlpha.toFixed(3) + ')');
        lineGrad.addColorStop(1.0, 'rgba(140, 230, 130, 0)');
        cctx.strokeStyle = lineGrad;
        cctx.lineWidth = Math.max(2, baseThreshold * 0.18);
        cctx.lineCap = 'round';
        cctx.beginPath();
        cctx.moveTo(cx, cy);
        cctx.lineTo(hx, hy);
        cctx.stroke();
      }

      // --- (3) ホーム位置 (正解地点) にも控えめな緑グロー (着地点ヒント) ---
      var homeAlpha = profile.alpha * 0.35 * (0.5 + 0.5 * nearness);
      var homeRadius = radius * 0.55;
      var homeGrad = cctx.createRadialGradient(hx, hy, homeRadius * 0.05, hx, hy, homeRadius);
      homeGrad.addColorStop(0.0, 'rgba(160, 240, 140, ' + homeAlpha.toFixed(3) + ')');
      homeGrad.addColorStop(0.6, 'rgba(110, 210, 110, ' + (homeAlpha * 0.4).toFixed(3) + ')');
      homeGrad.addColorStop(1.0, 'rgba(80, 180, 100, 0)');
      cctx.fillStyle = homeGrad;
      cctx.beginPath();
      cctx.arc(hx, hy, homeRadius, 0, Math.PI * 2);
      cctx.fill();
    } catch (_) {
      // 万が一描画失敗しても本体に影響を出さない
    }
    cctx.restore();
  }

  // === 登録 ===
  function register() {
    if (!window.PonoAssistRegister) return false;
    window.PonoAssistRegister('beforeStageStart', onBeforeStageStart);
    window.PonoAssistRegister('duringDrag', onDuringDrag);
    window.PonoAssistRegister('drawOverlay', onDrawOverlay);
    return true;
  }

  if (!register()) {
    // main.js より早く読み込まれた場合、 DOMContentLoaded 後にリトライ
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', register, { once: true });
    } else {
      // 既に load 済みで PonoAssistRegister が無いケース (本来は起きない)
      setTimeout(register, 0);
    }
  }

  // テスト/デバッグ用に内部状態を覗けるように (副作用なし)
  window.PonoKojikaAssist = {
    _state: dragState,
    _currentStageId: function () { return currentStageId; },
    _level: currentLevel,
  };
})();
