// puzzle/assists/kitsune.js
// キツネ / さきよみゴースト アシスト。
//
// パートナーが 'kitsune' のときだけ発火する。ステージ開始直後に、
// 完成形画像をパズルボードに半透明でフェード表示する「ゴーストプレビュー」。
//
// なかよし度レベル (PonoBond.getLevel('kitsune', stageId)) によって挙動が変わる:
//   Lv 0  : Lv 1 と同じ扱い (初プレイ時にいきなり「薄っ」とならないように)
//   Lv 1  : α=0.30, 保持 1.5 秒
//   Lv 2  : α=0.42, 保持 2.0 秒
//   Lv 3  : α=0.55, 保持 2.5 秒
//
// 全レベル共通: フェードイン 200ms → ピーク α 保持 → フェードアウト 200ms
//
// 描画は puzzleCanvas に重ねるだけで、外部 DOM 要素や追加スタイルは作らない。
// メインの描画 (main.js: redraw) には乗らず、自前の rAF ループで puzzleCanvas に
// 直接描画する。なお drawOverlay フックでも保険的に描画することで、main.js が
// 入力イベントで redraw を呼んでも overlay がワンフレーム飛ばないようにする。
//
// 依存:
//   - window.PonoAssistRegister (main.js が定義)
//   - window.PonoBond.getLevel  (bond.js)
//
// 登録するフック:
//   - afterStageReady : Lv とステージ画像を解決し、画像 preload と rAF 開始。
//   - drawOverlay     : redraw() に乗ったタイミングでも同じ overlay を重ねる。

(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (typeof window.PonoAssistRegister !== 'function') {
    try { console.warn('[kitsune-assist] PonoAssistRegister not found — skipped'); } catch (_) {}
    return;
  }

  var PARTNER_ID = 'kitsune';

  // Lv -> { alpha, holdMs }。Lv 0 は Lv 1 と同じ扱い (初プレイ時にいきなり「薄っ」とならないように)。
  // 明るい iPad / 屋外環境でも知覚可能にするため、 各レベルの α を底上げ (high-finding 修正)。
  var LEVEL_TABLE = {
    0: { alpha: 0.38, holdMs: 1500 },
    1: { alpha: 0.38, holdMs: 1500 },
    2: { alpha: 0.50, holdMs: 2000 },
    3: { alpha: 0.62, holdMs: 2500 },
  };
  var FADE_IN_MS = 200;
  var FADE_OUT_MS = 200;

  // 画像キャッシュ (URL -> HTMLImageElement)。
  var imageCache = {};

  // 現在進行中のアニメ状態。
  // {
  //   img: HTMLImageElement|null,
  //   ready: boolean,
  //   stageId: any,
  //   alphaPeak: number,
  //   holdMs: number,
  //   startedAt: number|null,   // performance.now() 時刻
  //   rafId: number|null,       // 自前 rAF ハンドル
  //   token: number,            // 取り消し用トークン
  // }
  var current = null;
  var nextToken = 1;

  function now() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
  }

  function loadImage(url, onReady) {
    if (!url) { onReady(null); return; }
    var cached = imageCache[url];
    if (cached && cached.complete && cached.naturalWidth > 0) {
      onReady(cached);
      return;
    }
    if (cached) {
      cached.addEventListener('load', function () { onReady(cached); }, { once: true });
      cached.addEventListener('error', function () { onReady(null); }, { once: true });
      return;
    }
    var img = new Image();
    img.decoding = 'async';
    img.addEventListener('load', function () { onReady(img); }, { once: true });
    img.addEventListener('error', function () {
      try { console.warn('[kitsune-assist] image load failed: ' + url); } catch (_) {}
      onReady(null);
    }, { once: true });
    img.src = url;
    imageCache[url] = img;
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

  /** puzzleCanvas を DOM から探す。initPuzzle で #puzzle に動的追加される。 */
  function findPuzzleCanvas() {
    try {
      var host = document.getElementById('puzzle');
      if (!host) return null;
      var c = host.querySelector('canvas');
      return c || null;
    } catch (_) { return null; }
  }

  /** 与えられた canvas/ctx 上にゴースト画像を描画 (alpha 適用)。 */
  function paintGhost(ctx, img, alpha) {
    if (!ctx || !img || alpha <= 0) return;
    var canvas = ctx.canvas;
    if (!canvas) return;
    var cw = canvas.width || 0;
    var ch = canvas.height || 0;
    if (cw <= 0 || ch <= 0) return;

    // ボード位置の再現: main.js の initPuzzle と同じく
    //   - boardMaxW = canvasW * 0.50, boardMaxH = canvasH * 0.60
    //   - 画像アスペクトに合わせ最大サイズで中央配置
    var natW = img.naturalWidth || 0;
    var natH = img.naturalHeight || 0;
    var aspect = (natW > 0 && natH > 0) ? (natW / natH) : 1;

    var maxW = cw * 0.50;
    var maxH = ch * 0.60;
    var bw = Math.min(maxW, maxH * aspect);
    var bh = bw / aspect;
    if (bh > maxH) { bh = maxH; bw = bh * aspect; }
    var bx = (cw - bw) / 2;
    var by = (ch - bh) / 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    try {
      ctx.drawImage(img, bx, by, bw, bh);
    } catch (e) {
      try { console.warn('[kitsune-assist] drawImage failed:', e); } catch (_) {}
    }
    ctx.restore();
  }

  /** 経過時間から表示中アルファを算出。完了なら -1 を返す。 */
  function computeAlpha(st, elapsed) {
    var total = FADE_IN_MS + st.holdMs + FADE_OUT_MS;
    if (elapsed >= total) return -1;
    if (elapsed < FADE_IN_MS) {
      return st.alphaPeak * (elapsed / FADE_IN_MS);
    }
    if (elapsed < FADE_IN_MS + st.holdMs) {
      return st.alphaPeak;
    }
    var outT = elapsed - FADE_IN_MS - st.holdMs;
    return st.alphaPeak * (1 - outT / FADE_OUT_MS);
  }

  /** 自前 rAF ループ。canvas 直書きでアニメを駆動する。 */
  function tick(token) {
    var st = current;
    if (!st || st.token !== token) return; // すでに別ステージに切り替わった
    if (!st.ready || !st.img || st.startedAt == null) {
      st.rafId = requestAnimationFrame(function () { tick(token); });
      return;
    }
    var canvas = findPuzzleCanvas();
    var ctx = canvas ? canvas.getContext('2d') : null;
    var elapsed = now() - st.startedAt;
    var alpha = computeAlpha(st, elapsed);
    if (alpha < 0) {
      // 完了。状態を解放。
      current = null;
      return;
    }
    if (ctx && alpha > 0) {
      paintGhost(ctx, st.img, alpha);
    }
    st.rafId = requestAnimationFrame(function () { tick(token); });
  }

  function cancelCurrent() {
    if (current && current.rafId != null) {
      try { cancelAnimationFrame(current.rafId); } catch (_) {}
    }
    current = null;
  }

  // ── afterStageReady: アニメ開始 ───────────────────────────────────────
  window.PonoAssistRegister('afterStageReady', function (ctx) {
    cancelCurrent();
    if (!ctx || !isActivePartner(ctx.partner)) return;

    var stage = ctx.stage || null;
    if (!stage) return;
    var stageId = stage.id;
    var level = getStageLevel(stageId);
    var spec = LEVEL_TABLE[level];
    if (!spec) return; // 念のため未定義 Lv はスキップ (Lv0-3 すべて LEVEL_TABLE に存在)

    // ステージ画像 URL を解決。BASE_STAGES の image を最優先。
    var url = (stage && stage.image) || null;
    if (!url && typeof window.resolveStageImage === 'function') {
      try { url = window.resolveStageImage(stageId); } catch (_) { url = null; }
    }
    if (!url) return;

    var token = nextToken++;
    var pending = {
      stageId: stageId,
      alphaPeak: spec.alpha,
      holdMs: spec.holdMs,
      img: null,
      ready: false,
      startedAt: null,
      rafId: null,
      token: token,
    };
    current = pending;

    loadImage(url, function (img) {
      if (current !== pending) return; // 既に別ステージ
      if (!img) { current = null; return; }
      pending.img = img;
      pending.ready = true;
      pending.startedAt = now();
    });

    // 自前 rAF ループ開始 (画像 ready 前でも待機ループに入る)。
    pending.rafId = requestAnimationFrame(function () { tick(token); });
  });

  // ── drawOverlay: main.js の redraw に乗ったときも同じ overlay を描く ──
  // (rAF ループだけだと main.js が pointer 操作で redraw を呼んだ瞬間に
  //  overlay が一瞬消えるため、保険として drawOverlay でも重ねる。)
  window.PonoAssistRegister('drawOverlay', function (hookCtx) {
    if (!hookCtx) return;
    if (!isActivePartner(hookCtx.partner)) return;
    var st = current;
    if (!st || !st.ready || !st.img || st.startedAt == null) return;
    var elapsed = now() - st.startedAt;
    var alpha = computeAlpha(st, elapsed);
    if (alpha <= 0) return;
    var ccx = hookCtx.ctx;
    if (!ccx) return;
    paintGhost(ccx, st.img, alpha);
  });
})();
