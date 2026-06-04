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
  var LV_PROFILE = {
    1: { distMul: 1.3, alpha: 0.35 },
    2: { distMul: 1.6, alpha: 0.50 },
    3: { distMul: 2.0, alpha: 0.65 },
  };

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

    // 基準閾値 (canvas 幅ベース) を Lv 倍率で拡大
    var baseThreshold = canvas.width * BASE_THRESHOLD_RATIO;
    var threshold = baseThreshold * profile.distMul;

    // ピース現在位置と homeX/homeY の距離
    var dx = piece.x - piece.homeX;
    var dy = piece.y - piece.homeY;
    var dist = Math.hypot(dx, dy);
    if (dist >= threshold) return;

    // === グロー位置: ピース現在地 (piece.x/y) を中心に光らせる ===
    // piece.x/y, piece.homeX/homeY は同じ座標系 (canvas px, ピース左上隅)。
    // 中心としては左上隅で描いても視覚的に「ピースの周辺が光る」ように見えるが、
    // 出来るだけピース中央に寄せたい。 pieceW/pieceH は外部から取れないため、
    // ピース矩形のおおよその中央を canvas 幅から推定する。
    // (baseThreshold は canvas.width * 0.05 ≒ ピースの 1/4〜1/3 程度のスケール)
    // ★ ピース外に光がドリフトしないよう [0.4*base, 0.8*base] にクランプ (high-finding 修正)。
    var pieceHalfRaw = baseThreshold * 0.6;
    var pieceHalfMin = baseThreshold * 0.4;
    var pieceHalfMax = baseThreshold * 0.8;
    var pieceHalf = pieceHalfRaw < pieceHalfMin ? pieceHalfMin
                  : (pieceHalfRaw > pieceHalfMax ? pieceHalfMax : pieceHalfRaw);
    var cx = piece.x + pieceHalf;
    var cy = piece.y + pieceHalf;
    var hx = piece.homeX + pieceHalf;
    var hy = piece.homeY + pieceHalf;

    // dist が小さいほど不透明に (吸い寄せ感の演出)
    var nearness = 1 - (dist / threshold); // 0..1
    if (nearness < 0) nearness = 0;
    if (nearness > 1) nearness = 1;
    var alpha = profile.alpha * (0.40 + 0.60 * nearness);

    // glow 半径も Lv で変える
    var radius = baseThreshold * profile.distMul * 1.6;

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
