// PonoAssist: アライグマ「いろわけトレイ」
// =============================================================================
// パートナー 'araiguma' を選択中のときだけ動作する。
// 未スナップピースを HSL の Hue でクラスタ分けし、画面下部に「色帯トレイ」と
// して並べて待機させる。子供が見た目（色）でピースを選び取りやすくする補助。
//
//   なかよし Lv1 (もしくは Lv0): 2 クラスタ (warm / cool)
//   なかよし Lv2:                3 クラスタ
//   なかよし Lv3:                5 クラスタ
//
// 連携:
//   - 既存の drag フロー (dragPiece) は何も書き換えない。トレイから掴むとそのまま動く。
//   - スナップ済みピース、ドラッグ中ピースは座標上書きの対象外。
//   - 代表色は afterStageReady で 1 回計算して __araiguma メタにキャッシュする。
//
// 依存:
//   window.PonoAssistRegister  (main.js Phase 0 で提供)
//   window.PonoBond            (なかよし度メーター)
//   ctx.pieces / ctx.dragPiece / ctx.sourceImg / ctx.board / ctx.pieceSize
//     ・・・main.js が afterStageReady / drawOverlay に渡している補強コンテキスト
// =============================================================================
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof window.PonoAssistRegister !== 'function') {
    // hooks が無い環境では何もしない (テスト・古い main.js 等)
    return;
  }

  // ---------------------------------------------------------------------------
  // 1. 状態
  // ---------------------------------------------------------------------------
  // ステージ単位で「いまトレイをどう組むか」をここに保持する。
  // afterStageReady で書き換え、 drawOverlay で参照する。
  var state = {
    active: false,        // 現ステージでアライグマ assist が動くか
    clusterCount: 2,      // 2 / 3 / 5
    stageId: null,        // 現ステージ id (キャッシュ無効化用)
    boardKey: '',         // 盤サイズが変わったら再計算するためのキー
    // piece -> { hue, sat, light, cluster, slotX, slotY } をマップで保持しない。
    // ピース自身に __araiguma を生やしてキャッシュする (GC されやすい)。
  };

  // ---------------------------------------------------------------------------
  // 2. 色サンプリング
  // ---------------------------------------------------------------------------
  // sourceImg からピース中央領域の平均色を取得する。 1 ステージにつき 1 回だけ呼ぶ。
  // canvas は使い回す。
  var sampleCanvas = null;
  var sampleCtx = null;
  function ensureSampleCtx() {
    if (sampleCanvas) return;
    try {
      sampleCanvas = document.createElement('canvas');
      sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    } catch (_) {
      sampleCanvas = null;
      sampleCtx = null;
    }
  }

  // sourceImg を一度オフスクリーンに描いて、 各ピースの矩形領域から平均色を取る。
  // 失敗時 (CORS など) は中庸グレーを返す。
  function computePieceColors(pieces, sourceImg, cols, rows) {
    ensureSampleCtx();
    if (!sampleCtx || !sourceImg) {
      // フォールバック: グレー
      for (var i = 0; i < pieces.length; i++) {
        cachePieceColor(pieces[i], { r: 128, g: 128, b: 128 });
      }
      return;
    }

    // sourceImg を 256px 程度の小さい canvas に縮小して読む (パフォーマンス)
    var iw = sourceImg.naturalWidth || sourceImg.width || 256;
    var ih = sourceImg.naturalHeight || sourceImg.height || 256;
    var targetW = 256;
    var scale = targetW / iw;
    var sw = Math.max(cols * 4, Math.round(iw * scale));
    var sh = Math.max(rows * 4, Math.round(ih * scale));
    sampleCanvas.width = sw;
    sampleCanvas.height = sh;
    try {
      sampleCtx.clearRect(0, 0, sw, sh);
      sampleCtx.drawImage(sourceImg, 0, 0, sw, sh);
    } catch (_) {
      for (var k = 0; k < pieces.length; k++) {
        cachePieceColor(pieces[k], { r: 128, g: 128, b: 128 });
      }
      return;
    }

    var cellW = sw / cols;
    var cellH = sh / rows;

    for (var j = 0; j < pieces.length; j++) {
      var p = pieces[j];
      // 各ピースの中央 60% 領域を平均する
      var cx0 = Math.floor(p.col * cellW + cellW * 0.2);
      var cy0 = Math.floor(p.row * cellH + cellH * 0.2);
      var cw = Math.max(1, Math.floor(cellW * 0.6));
      var ch = Math.max(1, Math.floor(cellH * 0.6));
      // 端でクリップ
      if (cx0 + cw > sw) cw = sw - cx0;
      if (cy0 + ch > sh) ch = sh - cy0;
      if (cw <= 0 || ch <= 0) { cachePieceColor(p, { r: 128, g: 128, b: 128 }); continue; }

      var data;
      try {
        data = sampleCtx.getImageData(cx0, cy0, cw, ch).data;
      } catch (_) {
        cachePieceColor(p, { r: 128, g: 128, b: 128 });
        continue;
      }

      // 平均色 (アルファ無視)
      var rs = 0, gs = 0, bs = 0, n = 0;
      // 4 ピクセル間隔でサンプリング (高速化)
      for (var dy = 0; dy < ch; dy += 2) {
        for (var dx = 0; dx < cw; dx += 2) {
          var idx = (dy * cw + dx) * 4;
          rs += data[idx];
          gs += data[idx + 1];
          bs += data[idx + 2];
          n++;
        }
      }
      if (n === 0) { cachePieceColor(p, { r: 128, g: 128, b: 128 }); continue; }
      cachePieceColor(p, {
        r: Math.round(rs / n),
        g: Math.round(gs / n),
        b: Math.round(bs / n),
      });
    }
  }

  function cachePieceColor(piece, rgb) {
    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    piece.__araiguma = piece.__araiguma || {};
    piece.__araiguma.r = rgb.r;
    piece.__araiguma.g = rgb.g;
    piece.__araiguma.b = rgb.b;
    piece.__araiguma.h = hsl.h;
    piece.__araiguma.s = hsl.s;
    piece.__araiguma.l = hsl.l;
  }

  // RGB (0-255) -> HSL (h: 0-360, s/l: 0-1)
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    var d = max - min;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s, l: l };
  }

  // ---------------------------------------------------------------------------
  // 3. クラスタリング
  // ---------------------------------------------------------------------------
  // 彩度がほぼ無い (グレー寄り) ピースは別バケットへ寄せる。
  // それ以外は Hue 帯で N 等分する。
  //
  // Lv1 = 2 クラスタ: warm (0-180) / cool (180-360) のシンプル 2 分割
  // Lv2 = 3 クラスタ: warm / green / cool (0-90, 90-180, 180-360 を粗く)
  // Lv3 = 5 クラスタ: 0-72, 72-144, ... (5 等分)
  function assignClusters(pieces, count) {
    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      if (!p.__araiguma) {
        cachePieceColor(p, { r: 128, g: 128, b: 128 });
      }
      p.__araiguma.cluster = pickCluster(p.__araiguma.h, p.__araiguma.s, count);
    }
  }

  function pickCluster(hue, sat, count) {
    // 彩度極小はクラスタ「中庸」: 最後のバケットに寄せる
    if (sat < 0.08) return count - 1;
    var h = ((hue % 360) + 360) % 360;
    if (count === 2) {
      // warm (赤〜黄〜緑手前)  vs cool (緑〜青〜紫)
      return (h < 90 || h >= 300) ? 0 : 1;
    }
    if (count === 3) {
      // 赤系 (300-60), 緑系 (60-180), 青紫系 (180-300)
      if (h >= 300 || h < 60) return 0;
      if (h < 180) return 1;
      return 2;
    }
    // count >= 4: 等分
    var bandSize = 360 / count;
    var c = Math.floor(h / bandSize);
    if (c >= count) c = count - 1;
    if (c < 0) c = 0;
    return c;
  }

  // クラスタごとの代表 (中心) Hue 値: 帯背景の色付け用
  function clusterCenterHue(cluster, count) {
    if (count === 2) return cluster === 0 ? 30 : 220;
    if (count === 3) return cluster === 0 ? 0 : (cluster === 1 ? 120 : 240);
    return (cluster + 0.5) * (360 / count);
  }

  // ---------------------------------------------------------------------------
  // 4. トレイレイアウト
  // ---------------------------------------------------------------------------
  // 画面下部にクラスタ数 N 本の色帯を縦に積み上げ、 各帯にそのクラスタの
  // ピースを横一列に並べる。
  //
  //   canvas.h の下から trayHeightRatio % を使う。
  //   1 帯あたり trayHeightRatio / N。
  //   ピース幅 + gap を等間隔で並べ、 帯中央に縦位置を寄せる。
  //
  // 各ピースに __araiguma.slotX / slotY を持たせる。
  function layoutTraySlots(pieces, count, canvas, pieceSize, board) {
    // 中央の盤 (board) を避けて、 盤の下に色帯トレイを置く。
    // ピース全部が下に入りきらないステージ (16-20 ピース) の場合は盤の上下に分けても良いが、
    // MVP では盤下に均等横並びだけで OK。
    var safeTop = board ? (board.y + board.h + 4) : canvas.h * 0.62;
    if (safeTop > canvas.h - pieceSize.h * 1.2) {
      // 盤が下に張り付き気味なら、 トレイは盤上部に置く
      safeTop = Math.max(0, (board ? board.y : 0) - count * (pieceSize.h + 6));
    }
    var trayY0 = safeTop;
    var trayH = Math.max(pieceSize.h * 1.1, canvas.h - trayY0 - 4);
    var bandH = trayH / count;

    // クラスタごとにピース配列を組む
    var buckets = new Array(count);
    for (var i = 0; i < count; i++) buckets[i] = [];
    for (var j = 0; j < pieces.length; j++) {
      var p = pieces[j];
      if (!p.__araiguma) continue;
      var c = p.__araiguma.cluster;
      if (c < 0 || c >= count) c = count - 1;
      buckets[c].push(p);
    }

    // 各バケットは Hue 昇順 → 同色内ではグラデーション順に並ぶ
    for (var k = 0; k < buckets.length; k++) {
      buckets[k].sort(function (a, b) {
        return a.__araiguma.h - b.__araiguma.h;
      });
    }

    var sideMargin = 12;
    for (var b = 0; b < count; b++) {
      var bucket = buckets[b];
      if (bucket.length === 0) continue;
      var bandCenterY = trayY0 + bandH * (b + 0.5) - pieceSize.h / 2;
      var totalW = bucket.length * pieceSize.w;
      // 入りきらなければ重ねて表示 (gap を負に)
      var availW = canvas.w - sideMargin * 2;
      var gap;
      if (totalW + (bucket.length - 1) * 6 <= availW) {
        gap = 6;
      } else {
        // ぴったり収める (gap が負になり得る = ピースが重なるが手前ほど可視)
        gap = (availW - bucket.length * pieceSize.w) / Math.max(1, bucket.length - 1);
      }
      var startX = sideMargin + (availW - (bucket.length * pieceSize.w + (bucket.length - 1) * gap)) / 2;
      for (var n = 0; n < bucket.length; n++) {
        var pp = bucket[n];
        pp.__araiguma.slotX = startX + n * (pieceSize.w + gap);
        pp.__araiguma.slotY = bandCenterY;
      }
    }

    // 帯描画用にバケット情報をエクスポート
    state.bands = [];
    for (var bb = 0; bb < count; bb++) {
      state.bands.push({
        y0: trayY0 + bandH * bb,
        h: bandH,
        hue: clusterCenterHue(bb, count),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 5. なかよし Lv 判定
  // ---------------------------------------------------------------------------
  function resolveClusterCount(stage, partnerId) {
    if (!stage || !window.PonoBond || typeof window.PonoBond.getLevel !== 'function') return 2;
    var sid = stage.id != null ? stage.id : null;
    if (sid == null) return 2;
    var lv = 0;
    try { lv = window.PonoBond.getLevel(partnerId, sid) || 0; } catch (_) { lv = 0; }
    // Lv0 は Lv1 と同じ扱い (子供が最低限の色わけ恩恵を必ず受けられるように)
    if (lv >= 3) return 5;
    if (lv >= 2) return 3;
    return 2;
  }

  // Lv から描画パラメータを取り出す。 Lv0 は Lv1 と同じ扱い。
  function resolveLvStyle(stage, partnerId) {
    var lv = 0;
    try {
      if (window.PonoBond && typeof window.PonoBond.getLevel === 'function' && stage && stage.id != null) {
        lv = window.PonoBond.getLevel(partnerId, stage.id) || 0;
      }
    } catch (_) { lv = 0; }
    // Lv0 → Lv1 と同じ
    if (lv <= 1) {
      return { lv: 1, bandAlpha: 0.40, edgeAlpha: 0.0, edgeWidth: 0, marker: false };
    }
    if (lv === 2) {
      return { lv: 2, bandAlpha: 0.50, edgeAlpha: 0.55, edgeWidth: 1, marker: false };
    }
    // Lv3+
    return { lv: 3, bandAlpha: 0.60, edgeAlpha: 0.75, edgeWidth: 2.5, marker: true };
  }

  // ---------------------------------------------------------------------------
  // 6. Hooks
  // ---------------------------------------------------------------------------

  // パートナー判定: 'araiguma' のみアクティブ
  function isAraiguma(partner) {
    return !!(partner && partner.id === 'araiguma');
  }

  // afterStageReady — 代表色キャッシュ + クラスタ + トレイ slot 計算
  window.PonoAssistRegister('afterStageReady', function (ctx) {
    state.active = false;
    state.bands = [];
    if (!isAraiguma(ctx && ctx.partner)) return;
    if (!ctx || !Array.isArray(ctx.pieces) || ctx.pieces.length === 0) return;
    if (!ctx.board || !ctx.pieceSize || !ctx.canvas) return;

    var stage = ctx.stage || null;
    if (!stage || !stage.cols || !stage.rows) return;

    var count = resolveClusterCount(stage, 'araiguma');
    state.clusterCount = count;
    state.stageId = stage.id != null ? stage.id : null;
    state.boardKey = ctx.canvas.w + 'x' + ctx.canvas.h + ':' + count;
    // Lv に応じた描画スタイル (alpha / 境界線 / マーカー) をキャッシュ
    state.style = resolveLvStyle(stage, 'araiguma');

    // 代表色キャッシュ (1 回だけ)
    computePieceColors(ctx.pieces, ctx.sourceImg, stage.cols, stage.rows);
    // クラスタ割当
    assignClusters(ctx.pieces, count);
    // トレイの待機座標を全ピースに付与
    layoutTraySlots(ctx.pieces, count, ctx.canvas, ctx.pieceSize, ctx.board);

    // 初期配置: shufflePieces 直後にトレイ位置へ瞬時に整列させる。
    // (アニメ無しで「色わけ済みの状態」を最初から見せる方が、子供の認知負荷が低い)
    for (var i = 0; i < ctx.pieces.length; i++) {
      var pp = ctx.pieces[i];
      if (!pp || pp.snapped) continue;
      if (!pp.__araiguma || pp.__araiguma.slotX == null) continue;
      pp.x = pp.__araiguma.slotX;
      pp.y = pp.__araiguma.slotY;
    }

    state.active = true;
  });

  // drawOverlay — 帯背景を描画 + 未スナップ・非ドラッグピースをトレイ位置に
  // 「毎フレーム上書き」する。 これで shuffle 直後の散らばりからも徐々に整列する。
  //
  // ※ ピースの x/y を直接書き換えるが、 main.js 側で次のフレームに rebuildPath が
  //   呼ばれるのは「ユーザー操作 (onPointerMove) / shuffle / trySnap / hint」時のみ。
  //   そのため、 path が更新されないと hitTest が古い座標基準のままになる。
  //   → 我々が x/y を変えたら自分で rebuildPath 相当をする必要があるが、
  //     rebuildPath は main.js に閉じている。 代替として、 x/y を書き換えると
  //     次に redraw() が drawPiece(piece) を呼んで piece.path は古いまま。
  //     hitTest は redraw 直後の onPointerDown でしか走らないため、 古い path のままだと
  //     掴めない。
  //     ★ 対応: 我々はピースを「移動」ではなく「ゆっくり寄せる」+ 自前で path を再構築する
  //       のではなく、 動きを大きくしすぎないようにし、 hitTest 用の path は次の
  //       onPointerDown 直前 redraw で再生成されることに依存する。
  //       実際 main.js の onPointerDown は hitTest(p, x, y) で `rebuildPath(piece)` を
  //       内部的に呼ぶ (parse 確認済み)。 よって x/y 上書きだけで掴める。
  window.PonoAssistRegister('drawOverlay', function (ctx) {
    if (!state.active) return;
    if (!isAraiguma(ctx && ctx.partner)) return;
    if (!ctx.ctx || !Array.isArray(ctx.pieces)) return;

    var c2d = ctx.ctx;
    var pieces = ctx.pieces;
    var drag = ctx.dragPiece;
    var canvas = ctx.canvas;
    var pieceSize = ctx.pieceSize;

    // -- (a) ピースをトレイ slot に寄せる (ease) ----------------------------
    // いきなり瞬間移動すると不自然なので毎フレームじわっと寄せる。
    // 体感ゼロにならないよう ease/maxStep を強化した (Lv0/1 でも引き寄せが見えるように)。
    // ドラッグ中 / スナップ済みは触らない。
    var ease = 0.55;
    var maxStep = Math.max(8, pieceSize.w * 0.7); // 1 フレームあたりの最大移動量 (急ぎ寄せ)
    var stillMoving = false;
    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      if (!p || p.snapped) continue;
      if (p === drag) continue;
      if (!p.__araiguma || p.__araiguma.slotX == null) continue;

      var dx = p.__araiguma.slotX - p.x;
      var dy = p.__araiguma.slotY - p.y;
      // 距離が十分小さければスナップ的に確定
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        p.x = p.__araiguma.slotX;
        p.y = p.__araiguma.slotY;
        continue;
      }
      stillMoving = true;
      var ax = dx * ease;
      var ay = dy * ease;
      // クランプ
      if (ax > maxStep) ax = maxStep; else if (ax < -maxStep) ax = -maxStep;
      if (ay > maxStep) ay = maxStep; else if (ay < -maxStep) ay = -maxStep;
      p.x += ax;
      p.y += ay;
      // 回転は維持。 path は次回 redraw / hitTest で再構築されるので触らない。
    }

    // まだ目標に到達していないピースがあるなら、 もう 1 フレーム描画を要求する。
    // (main.js は基本的にイベント駆動なので、 自前で rAF を引っ張る必要がある)
    if (stillMoving && typeof ctx.requestRedraw === 'function') {
      ctx.requestRedraw();
    }

    // -- (b) 色帯背景を描画 (drawOverlay 内・ピースの上から覆う) ---------------
    // drawOverlay はピース描画後に走るため、 ピースの上に重ねる形になる。
    // 子供の目で「色わけが効いている」と認識できる強度まで alpha を上げる。
    // Lv で段階強化: Lv0/1=α0.40, Lv2=α0.50+境界線細, Lv3=α0.60+境界線太+マーカー。
    if (state.bands && state.bands.length > 0) {
      var style = state.style || { lv: 1, bandAlpha: 0.40, edgeAlpha: 0.0, edgeWidth: 0, marker: false };

      // 色帯本体: 鮮やかな HSL (80% sat, 55% light) で視認性確保
      c2d.save();
      c2d.globalAlpha = style.bandAlpha;
      for (var b = 0; b < state.bands.length; b++) {
        var band = state.bands[b];
        var hue = band.hue;
        c2d.fillStyle = 'hsl(' + Math.round(hue) + ', 80%, 55%)';
        c2d.fillRect(0, band.y0, canvas.w, band.h);
      }
      c2d.restore();

      // 帯の上端に常時細い区切り線 (帯と帯の境目を必ず示す)
      c2d.save();
      c2d.globalAlpha = 0.55;
      c2d.strokeStyle = 'rgba(93,78,55,0.7)';
      c2d.lineWidth = 1;
      for (var bb = 0; bb < state.bands.length; bb++) {
        var bb_band = state.bands[bb];
        c2d.beginPath();
        c2d.moveTo(0, bb_band.y0);
        c2d.lineTo(canvas.w, bb_band.y0);
        c2d.stroke();
      }
      c2d.restore();

      // Lv2+ : 各帯の代表 hue で太めの境界線を引いて「ここからこの色」を強調
      if (style.edgeWidth > 0 && style.edgeAlpha > 0) {
        c2d.save();
        c2d.globalAlpha = style.edgeAlpha;
        c2d.lineWidth = style.edgeWidth;
        for (var be = 0; be < state.bands.length; be++) {
          var beBand = state.bands[be];
          // 帯固有色で輪郭を縁取り
          c2d.strokeStyle = 'hsl(' + Math.round(beBand.hue) + ', 85%, 35%)';
          c2d.beginPath();
          // 上下の境界 (帯の上端 + 下端)
          c2d.moveTo(0, beBand.y0 + style.edgeWidth / 2);
          c2d.lineTo(canvas.w, beBand.y0 + style.edgeWidth / 2);
          c2d.moveTo(0, beBand.y0 + beBand.h - style.edgeWidth / 2);
          c2d.lineTo(canvas.w, beBand.y0 + beBand.h - style.edgeWidth / 2);
          c2d.stroke();
        }
        c2d.restore();
      }

      // Lv3 : 各クラスタの左端にラベル風マーカー (色玉)
      // small screens (<480px) ではマーカーを縮小し、 左端からの位置も狭めて
      // 色帯本体と重ならないよう配慮する (high-finding 修正)。
      if (style.marker) {
        c2d.save();
        c2d.globalAlpha = 0.85;
        var isSmall = canvas.w < 480;
        var markerR = isSmall ? 5 : 7;
        var markerX = isSmall ? 9 : 14;
        // 帯高がマーカーより小さい極端ケースではさらに縮める
        for (var bm = 0; bm < state.bands.length; bm++) {
          var bmBand = state.bands[bm];
          var cy = bmBand.y0 + bmBand.h / 2;
          var rDraw = markerR;
          // 帯高が極端に狭ければマーカーを帯高の 40% に
          if (bmBand.h > 0 && rDraw * 2 > bmBand.h * 0.8) {
            rDraw = Math.max(3, bmBand.h * 0.4);
          }
          // 外枠
          c2d.fillStyle = 'rgba(255,255,255,0.9)';
          c2d.beginPath();
          c2d.arc(markerX, cy, rDraw + 1.5, 0, Math.PI * 2);
          c2d.fill();
          // 中の色玉
          c2d.fillStyle = 'hsl(' + Math.round(bmBand.hue) + ', 90%, 50%)';
          c2d.beginPath();
          c2d.arc(markerX, cy, rDraw, 0, Math.PI * 2);
          c2d.fill();
        }
        c2d.restore();
      }
    }
  });

  // afterSnap — スナップ後はトレイ残りメンバーを詰め直す (見た目の隙間を埋める)
  window.PonoAssistRegister('afterSnap', function (ctx) {
    if (!state.active) return;
    if (!isAraiguma(ctx && ctx.partner)) return;
    // 単純に再レイアウト。 ピース集合は main.js から取れないので、 ctx.piece の所属
    // クラスタだけ無効化し、 残りピースは次の drawOverlay で順次寄っていく。
    // 全体再レイアウトには pieces 配列が要るが、 ここでは取れない。
    // → afterSnap では何もせず、 trayレイアウトは次の afterStageReady まで固定。
    //   (子供向け UX として「ハマったピースの空きは埋めない」方が混乱が少ない)
  });

  // beforeStageStart — 旧ステージのキャッシュをクリア
  window.PonoAssistRegister('beforeStageStart', function (ctx) {
    state.active = false;
    state.bands = [];
    state.stageId = null;
    state.style = null;
  });
})();
