// ── common/capture.js ──
// Pono Asobiba 共通 スクショモード Phase 1 (PoC: maze only)
//
// 設計の正本: docs/SCREENSHOT_MODE_PLAN.md
//
// 公開API (window.PonoCapture):
//   register({ gameId, build, defaultLabel, presets })
//     - 各ゲーム index.html から登録。 build は (opts) => Promise<HTMLCanvasElement>|HTMLCanvasElement
//     - opts: { width, height, format, label }
//   show()        … 外部 (admin 等) から UI を強制表示
//   shoot(opts)   … 即時 1 枚撮影 (UI ボタン / shortcut から呼ばれる)
//
// トリガ層 (子供向け本番では「3つのいずれか」 を通らない限り UI を出さない):
//   1. URL `?capture=1`
//   2. キーボード Shift+Alt+C (3 キー同時押し、 修飾必須、 タッチ不可)
//   3. window.PonoCapture.show() (admin パネル経由、 Phase 3 で使う)
//
// 単一ゲート (v1873〜): PonoDebugMode の個別機能トグルへ委譲。
//   - 旧: 独自の STAGING_HOSTS リスト + sessionStorage.admin_capture_unlocked
//   - 中間: window.PonoDebugMode.isAllowed()
//   - 新: window.PonoDebugMode.isFeatureEnabled('capture-mode')
//     (= staging host 判定 + manage unlock + デバッグボードのスクショモード ON)
//   ※ common/debug-mode.js を必ず capture.js より前にロードすること。
//     PonoDebugMode が未定義の場合は安全側に倒して常に false (= 機能 OFF)。
//
// 多重初期化防止: window._ponoCaptureInited を guard 化 (sw-update.js と同じパターン)。

(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (window._ponoCaptureInited) return;
  window._ponoCaptureInited = true;

  var CAPTURE_FEATURE_KEY = 'capture-mode';

  // ── 単一ゲート: PonoDebugMode 個別トグルへの委譲 ──
  // capture.js は固有の host/session 判定を持たない。
  // PonoDebugMode が未ロード時は false (= UI も shortcut も URL trigger も無効)。
  function isCaptureAllowed() {
    try {
      var dm = window.PonoDebugMode;
      return !!(dm
        && typeof dm.isFeatureEnabled === 'function'
        && dm.isFeatureEnabled(CAPTURE_FEATURE_KEY));
    } catch (e) {
      return false;
    }
  }

  // ── 内部状態 ──
  var registered = null;   // 最新 register された 1 件 (Phase 1 は単一ゲーム想定)
  var uiRoot = null;       // overlay DOM
  var inited = false;      // armUI 済か
  var seqKey = 'pono_capture_seq';

  // ── 解像度プリセット ──
  // Phase 1 は LP 16:9 / 縦 9:16 / 正方形 / App Store 6.5" の 4 つ。
  var PRESETS = [
    { id: 'lp-16x9',    label: 'LP 16:9 (1920×1080)',  w: 1920, h: 1080 },
    { id: 'lp-9x16',    label: '縦 9:16 (1080×1920)',  w: 1080, h: 1920 },
    { id: 'square',     label: 'スクエア (1080×1080)', w: 1080, h: 1080 },
    { id: 'ios-65',     label: 'App Store 6.5" (1284×2778)', w: 1284, h: 2778 }
  ];

  // ── ファイル名生成 ──
  function pad(n, w) {
    var s = String(n);
    while (s.length < w) s = '0' + s;
    return s;
  }
  function todayStamp() {
    var d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2);
  }
  function nextSeq() {
    var n = 1;
    try {
      var raw = sessionStorage.getItem(seqKey);
      if (raw) n = (parseInt(raw, 10) || 0) + 1;
      sessionStorage.setItem(seqKey, String(n));
    } catch (e) {}
    return n;
  }
  function makeFileName(gameId, label) {
    var base = (gameId || 'game') + '_' + todayStamp() + '_' + pad(nextSeq(), 3);
    if (label) base += '_' + String(label).replace(/[^a-z0-9_-]/gi, '');
    return base + '.png';
  }

  // ── 合成: ゲーム canvas → 指定解像度の出力 canvas (contain fit) ──
  // 重要: 出力 canvas の backing buffer サイズは preset と完全一致させる
  //       (source canvas の CSS サイズや devicePixelRatio に引きずられない)。
  function compose(sourceCanvas, outW, outH) {
    // 1) 出力 canvas を ALWAYS 指定 preset サイズで新規作成
    //    数値以外が来ても整数に強制 (string/float 由来の dimension ずれを防止)
    var W = Math.max(1, Math.floor(Number(outW) || 0));
    var H = Math.max(1, Math.floor(Number(outH) || 0));
    var out = document.createElement('canvas');
    out.width  = W;
    out.height = H;
    var ctx = out.getContext('2d');
    if (!ctx) return out;
    // 背景は透明 (LP 合成は後段で別途背景を載せる方針)
    ctx.clearRect(0, 0, W, H);

    // 2) source canvas の "backing buffer" サイズを取得
    //    (CSS の width/height ではなく、 実描画解像度。
    //     maze の #gameCanvas は window 比 × dpr で backing buffer が決まる)
    var sw = Number(sourceCanvas && sourceCanvas.width)  || Number(sourceCanvas && sourceCanvas.naturalWidth)  || 0;
    var sh = Number(sourceCanvas && sourceCanvas.height) || Number(sourceCanvas && sourceCanvas.naturalHeight) || 0;
    if (!sw || !sh) return out;

    // 3) contain-fit 計算 (task 仕様準拠の明示計算)
    var srcAspect = sw / sh;
    var dstAspect = W  / H;
    var drawW, drawH, drawX, drawY;
    if (srcAspect > dstAspect) {
      // source が出力より横長 → 横幅フィット、 上下に letterbox
      drawW = W;
      drawH = W / srcAspect;
      drawX = 0;
      drawY = (H - drawH) / 2;
    } else {
      // source が出力より縦長 (または同比) → 縦幅フィット、 左右に letterbox
      drawH = H;
      drawW = H * srcAspect;
      drawX = (W - drawW) / 2;
      drawY = 0;
    }
    // 整数化 (sub-pixel ずれによる滲み防止)
    drawW = Math.round(drawW);
    drawH = Math.round(drawH);
    drawX = Math.round(drawX);
    drawY = Math.round(drawY);

    try {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      // 9-arg drawImage: source 全域 (0,0,sw,sh) → dest contain-fit 矩形
      ctx.drawImage(sourceCanvas, 0, 0, sw, sh, drawX, drawY, drawW, drawH);
    } catch (e) {
      // tainted canvas 等は無視 (出力は透明枠だけ)
    }

    return out;
  }

  // ── ダウンロード ──
  function download(canvas, filename) {
    return new Promise(function (resolve) {
      try {
        canvas.toBlob(function (blob) {
          if (!blob) { resolve(false); return; }
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(function () {
            try { a.remove(); } catch (e) {}
            try { URL.revokeObjectURL(url); } catch (e) {}
            resolve(true);
          }, 100);
        }, 'image/png', 1.0);
      } catch (e) {
        resolve(false);
      }
    });
  }

  // ── v2122 batch:1244: Option Y2 ─ html2canvas 背景パターンの実効スケール補正 hook ──
  // WHY (根因): Option X (下記 applyBackgroundImgShim) が拾わない repeat / 多層背景
  // も含め、html2canvas 1.4.1 の CanvasRenderer.resizeImage() は url() 背景画像を
  // 毎回 CSS px サイズの中間 canvas へ drawImage で縮小してから、その中間 canvas を
  // ctx.createPattern() でパターン化して塗る。 scale:2 の super-sampling は
  // ctx.scale() 変換の "外側" にあるこの中間 canvas 生成そのものには効かず、
  // 結果としてパターン塗りは常に 1x 品質のまま拡大表示されぼやける。
  // 対策: 撮影中だけ CanvasRenderingContext2D.prototype.drawImage / createPattern
  // を差し替え、(1) drawImage の引数形状から resizeImage() が「画像 I を丸ごと
  // 中間 canvas C へ描いた」瞬間だけを記録 (それ以外の drawImage は無変更で素通し
  // = ゲーム canvas が撮影中に animate していても安全)、(2) 直後の
  // createPattern(C, ...) 呼び出しでは C の代わりに実効スケール分だけ高解像度な
  // 中間 canvas を元画像 I から再生成し、pattern.setTransform() で拡大分を打ち消して
  // 同じ CSS px 周期でタイルさせる。
  // 実効スケールは install() への固定引数ではなく、createPattern 呼び出し時点の
  // ctx.getTransform() の a/d (=scaleX/scaleY) から都度導出する: 各ゲームの
  // html2canvasOptions() は scale:2 が基本だが play-gacha の build() は shell
  // サイズ依存の動的 scale (dynScale) を使うため、install 時点で単一の固定値を
  // 決め打ちすると呼び出し元によって実際値とズレる。 ctx の現在の変換行列から
  // 読むことで、どの build() が何 scale で html2canvas を呼んでも自動的に追従する
  // (DOMMatrix / getTransform 非対応環境は原挙動へフォールバック)。
  function installPatternScaleHook() {
    var proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
    if (!proto || typeof DOMMatrix !== 'function' || typeof proto.getTransform !== 'function') {
      return function uninstallPatternScaleHookNoop() {};
    }
    // v2122 batch:1244 review fix (Medium, 多重 install 残留防止): shoot() 並行呼び出し
    // で install1→install2→uninstall1→uninstall2 の順になると、install2 が退避した
    // origDraw/origPattern は実は install1 の wrapper であり、uninstall2 がそれを
    // prototype へ書き戻して恒久残留してしまう。 wrapper 関数へマーカープロパティ
    // (_ponoPatternHook) を付け、「現在 prototype に載っているのが (どの install
    // 呼び出しであれ) このフック自身の wrapper か」を判定する。 既に載っていれば
    // 二重 install をスキップし、noop の uninstall を返して既存 wrapper をそのまま
    // 共有利用させる (=install はネストさせず、実質シングルトンにする)。
    if (proto.drawImage && proto.drawImage._ponoPatternHook) {
      return function uninstallPatternScaleHookNoop() {};
    }
    var origDraw = proto.drawImage;
    var origPattern = proto.createPattern;
    var tileSrc = new WeakMap(); // 中間 canvas -> { img, w, h }

    var wrappedDraw = function (img) {
      try {
        // resizeImage() の呼び出し形状 (画像全域 → 中間 canvas 全域への単発 9 引数
        // drawImage) に一致するときだけ記録する。それ以外の drawImage は判定せず
        // 素通しなので、ゲーム自身の canvas 描画には一切干渉しない。
        if (arguments.length === 9 &&
            (img instanceof HTMLImageElement) &&
            arguments[1] === 0 && arguments[2] === 0 &&
            arguments[3] === img.width && arguments[4] === img.height &&
            arguments[5] === 0 && arguments[6] === 0 &&
            this.canvas &&
            Math.abs(arguments[7] - this.canvas.width) < 1 &&
            Math.abs(arguments[8] - this.canvas.height) < 1) {
          tileSrc.set(this.canvas, { img: img, w: arguments[7], h: arguments[8] });
        }
      } catch (e) {}
      return origDraw.apply(this, arguments);
    };
    wrappedDraw._ponoPatternHook = true;

    var wrappedPattern = function (src, rep) {
      try {
        var rec = src && src instanceof HTMLCanvasElement ? tileSrc.get(src) : null;
        if (rec && rec.img && rec.img.width > 0) {
          // 呼び出し時点の実効スケールを ctx.getTransform() から導出 (固定引数不使用)。
          var m = this.getTransform();
          var sx = Math.abs(m.a) || 1;
          var sy = Math.abs(m.d) || 1;
          if (sx > 1 || sy > 1) {
            var hi = document.createElement('canvas');
            hi.width = Math.max(1, Math.round(rec.w * sx));
            hi.height = Math.max(1, Math.round(rec.h * sy));
            var g = hi.getContext('2d');
            g.imageSmoothingEnabled = true;
            g.imageSmoothingQuality = 'high';
            g.drawImage(rec.img, 0, 0, rec.img.width, rec.img.height, 0, 0, hi.width, hi.height);
            var p = origPattern.call(this, hi, rep);
            if (p && p.setTransform) {
              p.setTransform(new DOMMatrix([rec.w / hi.width, 0, 0, rec.h / hi.height, 0, 0]));
              return p;
            }
          }
        }
      } catch (e) {}
      return origPattern.call(this, src, rep);
    };
    wrappedPattern._ponoPatternHook = true;

    proto.drawImage = wrappedDraw;
    proto.createPattern = wrappedPattern;

    return function uninstallPatternScaleHook() {
      // 対称ガード: 自分が実際に patch した wrapper が「今も」乗っているときだけ
      // 書き戻す。 並行 shoot() で既に他の呼び出しが復元/上書き済みなら何もしない
      // (=先勝ち・後勝ちどちらの順でも native からズレた状態が恒久残留しない)。
      if (proto.drawImage === wrappedDraw) proto.drawImage = origDraw;
      if (proto.createPattern === wrappedPattern) proto.createPattern = origPattern;
    };
  }

  // ── shoot: 単発撮影 ──
  function shoot(opts) {
    opts = opts || {};
    if (!registered || typeof registered.build !== 'function') {
      console.warn('[PonoCapture] register されていません');
      return Promise.resolve(null);
    }
    if (!isCaptureAllowed()) {
      console.warn('[PonoCapture] このホストでは撮影できません');
      return Promise.resolve(null);
    }

    // preset は { w, h } または { width, height } どちらの形でも受け付ける
    var preset = opts.preset || PRESETS[0];
    var presetW = preset && (preset.w || preset.width);
    var presetH = preset && (preset.h || preset.height);
    var w = Math.max(1, Math.floor(Number(opts.width)  || Number(presetW) || 1920));
    var h = Math.max(1, Math.floor(Number(opts.height) || Number(presetH) || 1080));
    var label = opts.label || (registered.defaultLabel || '');

    var buildOpts = { width: w, height: h, format: 'png', label: label };

    // 2 重防御: build (= html2canvas) が走っている間は overlay を非描画にする。
    //   data-capture-hide 属性 (ignoreElements 経由) が効かなくても、
    //   visibility:hidden で実描画から外す。layout は維持されるのでフォーカス等は壊れない。
    var prevVisibility = '';
    var overlayHidden = false;
    if (uiRoot && uiRoot.style) {
      prevVisibility = uiRoot.style.visibility;
      uiRoot.style.visibility = 'hidden';
      overlayHidden = true;
    }
    function restoreOverlay() {
      if (overlayHidden && uiRoot && uiRoot.style) {
        uiRoot.style.visibility = prevVisibility;
        overlayHidden = false;
      }
    }

    // v2122 batch:1244: Option Y2 hook は build() (=各ゲームの html2canvas 呼び出し)
    // が走る区間だけ集中管理する。 install は build() 直前、 uninstall は
    // Promise.finally() (= try/finally 相当) で build() の成功/失敗どちらでも
    // 必ず 1 回実行する。 compose()/download() の間は hook を外しておくことで、
    // 撮影後の他処理へ影響が漏れない。 各ゲームの build() 自体は無変更のまま恩恵を受ける。
    var uninstallPatternHook = installPatternScaleHook();

    return Promise.resolve()
      .then(function () { return registered.build(buildOpts); })
      .finally(function () { uninstallPatternHook(); })
      .then(function (src) {
        if (!src) return null;
        // build() が canvas を返してきたか、 image/url を返したかで分岐
        // HTMLCanvasElement 判定は instanceof + getContext duck-typing 両対応
        // (iframe 等で同名 prototype が違うインスタンスにも対応)
        var isCanvas = (src instanceof HTMLCanvasElement) ||
                       (src && typeof src.getContext === 'function' && 'width' in src && 'height' in src);
        if (isCanvas) {
          // 必ず offscreen 合成を経由して preset 解像度で固定出力
          return compose(src, w, h);
        }
        console.warn('[PonoCapture] build() は HTMLCanvasElement を返してください');
        return null;
      })
      .then(function (out) {
        // build() / compose() が終わった時点で overlay を即復元
        // (download は別フローなので overlay 再表示を待たせない)
        restoreOverlay();
        if (!out) return null;
        var fname = makeFileName(registered.gameId, label);
        return download(out, fname).then(function () { return fname; });
      })
      .catch(function (err) {
        restoreOverlay();
        console.error('[PonoCapture] shoot 失敗', err);
        return null;
      });
  }

  // ── UI 構築 ──
  function buildUI() {
    if (uiRoot) return uiRoot;

    // CSS 注入 (z-index は max にして既存 UI を侵食しない最上層)
    var style = document.createElement('style');
    style.setAttribute('data-pono-capture', '1');
    style.textContent = [
      '.pono-capture-overlay{',
      '  position:fixed;right:16px;bottom:16px;z-index:2147483647;',
      '  background:rgba(20,20,28,0.92);color:#fff;',
      '  font-family:system-ui,-apple-system,"Segoe UI",sans-serif;',
      '  font-size:13px;line-height:1.4;',
      '  padding:12px 14px;border-radius:12px;',
      '  box-shadow:0 6px 24px rgba(0,0,0,0.45);',
      '  max-width:280px;pointer-events:auto;',
      '}',
      '.pono-capture-overlay *{box-sizing:border-box;font-family:inherit;}',
      '.pono-capture-overlay .pc-title{',
      '  font-weight:700;font-size:12px;margin-bottom:8px;',
      '  display:flex;align-items:center;justify-content:space-between;gap:8px;',
      '}',
      '.pono-capture-overlay .pc-title span{opacity:0.85}',
      '.pono-capture-overlay select,',
      '.pono-capture-overlay button{',
      '  font:inherit;color:#fff;background:#3B82F6;',
      '  border:1px solid rgba(255,255,255,0.18);',
      '  border-radius:8px;padding:6px 10px;cursor:pointer;',
      '}',
      '.pono-capture-overlay select{',
      '  background:#1f2330;width:100%;margin-bottom:8px;',
      '}',
      '.pono-capture-overlay .pc-row{display:flex;gap:6px;}',
      '.pono-capture-overlay .pc-shoot{flex:1;background:#10B981;font-weight:700;}',
      '.pono-capture-overlay .pc-close{background:#374151;}',
      '.pono-capture-overlay button:hover{filter:brightness(1.1);}',
      '.pono-capture-overlay button:focus-visible,',
      '.pono-capture-overlay select:focus-visible{',
      '  outline:2px solid #FBBF24;outline-offset:2px;',
      '}',
      '.pono-capture-overlay .pc-status{',
      '  margin-top:6px;font-size:11px;opacity:0.75;min-height:1.2em;',
      '}'
    ].join('\n');
    document.head.appendChild(style);

    uiRoot = document.createElement('div');
    uiRoot.className = 'pono-capture-overlay';
    uiRoot.setAttribute('data-capture-hide', '1');
    uiRoot.setAttribute('role', 'dialog');
    uiRoot.setAttribute('aria-label', 'Screenshot capture controls');

    var title = document.createElement('div');
    title.className = 'pc-title';
    var label = document.createElement('span');
    label.textContent = '📸 スクショモード';
    title.appendChild(label);
    var gameTag = document.createElement('span');
    gameTag.textContent = registered ? (registered.gameId || '') : '';
    gameTag.style.cssText = 'font-size:11px;opacity:0.7;';
    title.appendChild(gameTag);
    uiRoot.appendChild(title);

    var sel = document.createElement('select');
    sel.setAttribute('aria-label', 'Resolution preset');
    for (var i = 0; i < PRESETS.length; i++) {
      var opt = document.createElement('option');
      opt.value = PRESETS[i].id;
      opt.textContent = PRESETS[i].label;
      sel.appendChild(opt);
    }
    uiRoot.appendChild(sel);

    var row = document.createElement('div');
    row.className = 'pc-row';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pc-shoot';
    btn.textContent = '撮る';
    row.appendChild(btn);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'pc-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close capture overlay');
    row.appendChild(closeBtn);

    uiRoot.appendChild(row);

    var status = document.createElement('div');
    status.className = 'pc-status';
    status.setAttribute('aria-live', 'polite');
    uiRoot.appendChild(status);

    btn.addEventListener('click', function () {
      var presetId = sel.value;
      var preset = PRESETS[0];
      for (var j = 0; j < PRESETS.length; j++) {
        if (PRESETS[j].id === presetId) { preset = PRESETS[j]; break; }
      }
      status.textContent = '撮影中…';
      btn.disabled = true;
      shoot({ preset: preset }).then(function (name) {
        btn.disabled = false;
        status.textContent = name ? ('保存: ' + name) : '失敗';
      });
    });

    closeBtn.addEventListener('click', function () {
      if (uiRoot && uiRoot.parentNode) uiRoot.parentNode.removeChild(uiRoot);
      uiRoot = null;
    });

    document.body.appendChild(uiRoot);
    return uiRoot;
  }

  function show() {
    if (!isCaptureAllowed()) {
      console.warn('[PonoCapture] このホストでは UI を表示できません');
      return;
    }
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', show, { once: true });
      return;
    }
    if (uiRoot) return;
    buildUI();
  }

  // ── キーボード Shift+Alt+C (修飾必須) ──
  function onKeyDown(e) {
    if (!e || !e.shiftKey || !e.altKey) return;
    // v2107 batch:1241: IME 変換中 (key='Process' 等) は code='KeyC' でも誤発火させない
    if (e.isComposing) return;
    // v2107 batch:1241: Mac では Option(Alt)+Shift+C が合成文字になり e.key='Ç'
    // (toLowerCase しても 'ç') のため 'c' 比較を素通りしてショートカットが効かなかった。
    // レイアウト非依存の物理キー e.code==='KeyC' を併用する (合成 KeyboardEvent
    // {key:'Ç', code:'KeyC', altKey, shiftKey} で再現・修正確認済)。
    // shiftKey/altKey 必須と isCaptureAllowed() gating は従来どおり不変。
    var k = String(e.key || '').toLowerCase();
    var isC = (k === 'c') || (String(e.code || '') === 'KeyC');
    if (!isC) return;
    if (!isCaptureAllowed()) return;
    e.preventDefault();
    show();
  }

  // ── URL ?capture=1 ──
  function urlTriggered() {
    try {
      var p = new URLSearchParams(location.search);
      return p.get('capture') === '1';
    } catch (e) { return false; }
  }

  function armUI() {
    if (inited) return;
    inited = true;
    // キーボード監視は常に bind し、実行時に capture-mode で gate する。
    // これによりデバッグボードで ON にした直後も Shift+Alt+C が効く。
    window.addEventListener('keydown', onKeyDown, true);
    if (isCaptureAllowed() && urlTriggered()) {
      // DOMContentLoaded を待ってから表示
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', show, { once: true });
      } else {
        show();
      }
    }
  }

  // ── register ──
  function register(opts) {
    if (!opts || !opts.gameId || typeof opts.build !== 'function') {
      console.warn('[PonoCapture] register: { gameId, build } が必要です');
      return;
    }
    registered = {
      gameId: String(opts.gameId),
      build: opts.build,
      defaultLabel: opts.defaultLabel || '',
      presets: Array.isArray(opts.presets) ? opts.presets : []
    };
    // 既に UI が出ていれば game タグだけ更新
    if (uiRoot) {
      var tag = uiRoot.querySelector('.pc-title span:last-child');
      if (tag) tag.textContent = registered.gameId;
    }
  }

  // ── html2canvas 共通 options ──
  // html2canvas は DOM を再レンダリングして canvas 化するため、 標準ブラウザレンダリングと
  // 差異が出やすい。 全ゲーム共通でこの options を使うことで品質を底上げする:
  //   - scale: 2          → 高 DPR 相当の super-sampling。 preset リサイズ時の blur を抑制。
  //   - useCORS: true     → 外部画像 (素材) を CORS 経由で取得し taint を防ぐ
  //   - allowTaint: false → CORS 違反は静かに失敗するので明示禁止
  //   - imageTimeout      → 大量素材を待つ
  //   - backgroundColor: null → 透明背景許可 (合成段で背景を載せる方針)
  //   - logging: false    → production 用
  //   - ignoreElements    → data-capture-hide と pono-capture-overlay の 2 重除外
  //   - onclone           → クローン DOM の text-overflow:ellipsis を clip+wrap に変換
  //                          (実画面の ellipsis 切れが「タコウインナーか゛」 のように
  //                           真の文字列で焼き込まれるのを根本回避。 実画面は無影響)
  //                          v1395: 上層 DOM (small emoji buttons / box-shadow / blur) の
  //                          rasterize 品質ボトムアップも担当:
  //                            * box-shadow / filter:blur / drop-shadow を全要素 none 化
  //                              (html2canvas は shadow を別 layer pass で焼き、 emoji /
  //                               text と組み合わせると "ふんわり滲み" が出るため)
  //                            * 単一 emoji だけを含むボタン (font-size ≤ 28px) のフォントを
  //                              1.4x 拡大 + crisp text-rendering 指示。 html2canvas の
  //                              emoji rasterizer は font-size が小さいほど glyph metric を
  //                              丸める傾向があり、 一段大きく描画させてから downscale で
  //                              合わせる方が結果的に締まる。 実 DOM は無影響 (clonedDoc 限定)
  // 各ゲームの html2canvas 呼び出しは: html2canvas(target, PonoCapture.html2canvasOptions())
  // のように使う。 overrides で個別調整可能 (例: backgroundColor を白に固定したい等)。

  // v2107 batch:1241: object-fit シム用の透明 1×1 PNG。
  // html2canvas は「img は必ず intrinsic → box へ stretch 描画」するため、
  // src をこれに差し替えると stretch 描画が無害 (透明) になり、
  // 代わりに background-image (contain/cover は正実装) が本来の見た目を描く。
  // v2122 batch:1244: この方式は cover / none / intrinsic 不明時の fallback に降格
  // (contain / scale-down は padding 焼き込みの鮮明パスへ移行。 下記 onclone 参照)。
  var TRANSPARENT_PX_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  // ── v2122 batch:1244: Option X ─ 非 img 要素の CSS 背景 → <img> 昇格シム ──
  // WHY (根因): 上記 object-fit シムは <img> (置換要素) を対象とするが、通常の
  // 非 img 要素の CSS background-image (url()) は html2canvas の
  // renderBackgroundImage / resizeImage() パスを通る。 このパスは背景画像を一旦
  // CSS px サイズの中間 canvas へ縮小してから createPattern で塗るため、
  // scale:2 の super-sampling が効かず、単一の no-repeat 背景を持つ要素
  // (トップ/おみせボタン・吹き出し・部屋背景等) が軒並みぼやける。 置換要素
  // (<img>) は intrinsic → box への 1 回リサンプル (renderReplacedElement) で
  // ラスタ解像度のまま描画されるため鮮明。
  // そこで clone 限定で「単一 url() の no-repeat 背景」を持つ非 img 要素を検出し、
  // 同じ矩形の <img> を最背面 (z-index:-1) に注入して背景を置換要素パスへ逃がす
  // (repeat / 多層 / fixed / text-clip の背景は安全側スキップ — Option Y2 の
  // パターンスケール hook 側の保険に委ねる)。 実画面 DOM には一切触れない
  // (clonedDoc 限定)。 <img> 要素自体は bgShimCollect で除外するため、上記
  // object-fit シム (background fallback 分岐) とは対象集合が排他。
  var bgShimNaturalCache = {}; // url -> {w,h} | null (撮影セッション間で共有)

  function bgShimLoadNatural(url) {
    if (Object.prototype.hasOwnProperty.call(bgShimNaturalCache, url)) {
      return Promise.resolve(bgShimNaturalCache[url]);
    }
    return new Promise(function (resolve) {
      var img = new Image();
      var done = function (ok) {
        bgShimNaturalCache[url] = ok && img.naturalWidth > 0
          ? { w: img.naturalWidth, h: img.naturalHeight }
          : null;
        resolve(bgShimNaturalCache[url]);
      };
      img.onload = function () { done(true); };
      img.onerror = function () { done(false); };
      img.src = url; // computed backgroundImage の URL は絶対 URL
      if (img.complete && img.naturalWidth > 0) done(true);
    });
  }

  // computed background-size トークン → タイル寸法 {w,h}
  // v2122 batch:1244 review fix (Low, パース不能値ガード): computed 値に calc(...)
  // を含む、または各トークンの parseFloat が NaN になる場合は null を返す。
  // 呼び出し元 (bgShimConvertOne) は null / NaN を検知してこの要素の X 変換を
  // 丸ごとスキップし、背景をそのまま残す (Y2 のパターンスケール hook 側の保険に
  // 委ねる)。 以前は NaN のまま計算を続け、後段で 'NaNpx' を style へ書き込んで
  // CSS 宣言全体が invalid drop → 背景が消える/位置がズレる劣化があった。
  function bgShimTileSize(sizeStr, areaW, areaH, natW, natH) {
    var s = String(sizeStr || 'auto').trim();
    if (s.indexOf('calc(') >= 0) return null;
    if (s === 'cover' || s === 'contain') {
      var k = (s === 'cover')
        ? Math.max(areaW / natW, areaH / natH)
        : Math.min(areaW / natW, areaH / natH);
      return { w: natW * k, h: natH * k };
    }
    var tok = s.split(/\s+/);
    var tx = tok[0] || 'auto';
    var ty = tok[1] || 'auto';
    function len(t, area) {
      if (t === 'auto') return null;
      if (t.indexOf('%') >= 0) {
        var pv = parseFloat(t);
        return isNaN(pv) ? NaN : area * pv / 100;
      }
      var v = parseFloat(t);
      return isNaN(v) ? null : v;
    }
    var w = len(tx, areaW);
    var h = len(ty, areaH);
    if ((typeof w === 'number' && isNaN(w)) || (typeof h === 'number' && isNaN(h))) return null;
    if (w === null && h === null) return { w: natW, h: natH };
    if (w === null) return { w: h * (natW / natH), h: h };
    if (h === null) return { w: w, h: w * (natH / natW) };
    return { w: w, h: h };
  }

  // computed background-position トークン → タイルのエリア内オフセット
  // v2122 batch:1244 review fix (Low, パース不能値ガード): calc(...) や parseFloat
  // が NaN になるトークンは NaN を返す (呼び出し元が isNaN で検知しスキップする)。
  function bgShimPosOffset(token, areaLen, tileLen) {
    var t = String(token == null ? '50%' : token).trim();
    if (t.indexOf('calc(') >= 0) return NaN;
    if (t.indexOf('%') >= 0) {
      var pv = parseFloat(t);
      return isNaN(pv) ? NaN : (areaLen - tileLen) * pv / 100;
    }
    var v = parseFloat(t);
    return isNaN(v) ? (areaLen - tileLen) / 2 : v;
  }

  function bgShimPx(v) { return parseFloat(v) || 0; }

  function bgShimConvertOne(clonedDoc, el, cs, url, nat) {
    var bl = bgShimPx(cs.borderLeftWidth), br = bgShimPx(cs.borderRightWidth);
    var bt = bgShimPx(cs.borderTopWidth), bb = bgShimPx(cs.borderBottomWidth);
    var pl = bgShimPx(cs.paddingLeft), pr = bgShimPx(cs.paddingRight);
    var pt = bgShimPx(cs.paddingTop), pb = bgShimPx(cs.paddingBottom);
    // ローカル (変形前) の border box
    var bw = el.offsetWidth, bh = el.offsetHeight;
    if (!(bw > 0 && bh > 0)) return false;

    // "padding box" 座標系のボックス群 (この要素の絶対配置子の原点は padding box 左上)
    function box(kind) {
      if (kind === 'border-box') return { x: -bl, y: -bt, w: bw, h: bh };
      if (kind === 'content-box') {
        return { x: pl, y: pt, w: bw - bl - br - pl - pr, h: bh - bt - bb - pt - pb };
      }
      return { x: 0, y: 0, w: bw - bl - br, h: bh - bt - bb }; // padding-box
    }
    var area = box(cs.backgroundOrigin || 'padding-box');
    var clip = box(cs.backgroundClip || 'border-box');
    if (!(area.w > 0 && area.h > 0 && clip.w > 0 && clip.h > 0)) return false;

    var tile = bgShimTileSize(cs.backgroundSize, area.w, area.h, nat.w, nat.h);
    // v2122 batch:1244 review fix (Low, パース不能値ガード): tile が null
    // (calc()/NaN でパース不能) の場合はここで丸ごとスキップする。
    if (!tile || !(tile.w > 0 && tile.h > 0)) return false;
    var posTok = String(cs.backgroundPosition || '50% 50%').split(/\s+/);
    var ox = bgShimPosOffset(posTok[0], area.w, tile.w);
    var oy = bgShimPosOffset(posTok[1], area.h, tile.h);
    // 同上: background-position 側が calc()/NaN でパース不能ならスキップ。
    if (isNaN(ox) || isNaN(oy)) return false;

    // background-clip box に合わせたクリップ用ラッパー
    var wrap = clonedDoc.createElement('div');
    wrap.setAttribute('data-pono-bg-shim', '1');
    wrap.style.cssText =
      'position:absolute;overflow:hidden;pointer-events:none;margin:0;padding:0;border:0;' +
      'z-index:-1;' +
      'left:' + clip.x + 'px;top:' + clip.y + 'px;' +
      'width:' + clip.w + 'px;height:' + clip.h + 'px;';
    // border-radius: border-box クリップは厳密値、 padding/content-box クリップは
    // ボーダー幅分を差し引いた近似値
    var rad = [
      [cs.borderTopLeftRadius, bl, bt], [cs.borderTopRightRadius, br, bt],
      [cs.borderBottomRightRadius, br, bb], [cs.borderBottomLeftRadius, bl, bb]
    ].map(function (r) {
      var v = bgShimPx(String(r[0]).split(/\s+/)[0]);
      if ((cs.backgroundClip || 'border-box') !== 'border-box') {
        v = Math.max(0, v - Math.max(r[1], r[2]));
      }
      return v + 'px';
    });
    wrap.style.borderRadius = rad.join(' ');

    var img = clonedDoc.createElement('img');
    img.setAttribute('data-pono-bg-shim-img', '1');
    img.style.cssText =
      'position:absolute;margin:0;padding:0;border:0;max-width:none;max-height:none;' +
      'left:' + (area.x + ox - clip.x) + 'px;top:' + (area.y + oy - clip.y) + 'px;' +
      'width:' + tile.w + 'px;height:' + tile.h + 'px;';
    img.src = url;
    wrap.appendChild(img);
    // v2122 batch:1244 review fix (Low, コメント訂正): probe で実証済みの形を
    // そのまま採用 (lastChild へ変更しない)。 z-index:-1 なので描画順は注入位置に
    // 依存しないが、firstChild 注入こそ el の子の :first-child/nth-child マッチを
    // clone 上でずらす副作用がある (旧コメントは逆の説明だった)。 現行 capture
    // 対象ページでは該当する組み合わせがゼロであることを確認済み。
    el.insertBefore(wrap, el.firstChild);

    // z-index:-1 ラッパーがこの要素の内側に留まるようスタッキングコンテキストへ昇格
    // v2122 batch:1244 review fix (Medium, stacking 昇格の z-index 対策): static
    // の間は z-index 指定 (computed zIndex が 'auto' 以外の値) があっても不活性
    // (無視) だったが、relative へ昇格した瞬間にその値が突然有効化されてしまう。
    // 昇格したケースでは computed zIndex の値にかかわらず常に z-index を '0' に
    // 上書きし、静的だった頃と同じ「意図しない stacking 変化なし」を保証する。
    if (cs.position === 'static') {
      el.style.position = 'relative';
      el.style.zIndex = '0';
    } else if (cs.zIndex === 'auto') {
      el.style.zIndex = '0';
    }
    el.style.backgroundImage = 'none';
    return true;
  }

  function bgShimCollect(clonedDoc) {
    var view = clonedDoc.defaultView || window;
    var els = clonedDoc.querySelectorAll('*');
    var jobs = [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var tag = (el.tagName || '').toLowerCase();
      // 置換要素/void 要素は注入した子を保持できないので対象外
      // (<img> をここで除外するため、object-fit シムの背景 fallback 分岐とは
      //  対象集合が排他になり、同一要素を二重に書き換えない)
      // v2122 batch:1244 review fix (Low, select/textarea 除外): select/textarea
      // も子を描画しない置換系要素で、wrap の <img> は描かれないのに
      // backgroundImage='none' だけが実行されて背景が消える劣化があった。
      if (tag === 'img' || tag === 'canvas' || tag === 'video' || tag === 'input' ||
          tag === 'iframe' || tag === 'svg' || tag === 'br' || tag === 'hr' ||
          tag === 'select' || tag === 'textarea') continue;
      var cs;
      try { cs = view.getComputedStyle(el); } catch (e) { continue; }
      if (!cs) continue;
      // 安全弁: url(...) 単体との完全一致のみ対象化 (^...$ アンカー付き)。
      // カンマ区切りの多層背景やグラデーションはこの正規表現にマッチせず、
      // 自動的に「原挙動 (Option Y2 のパターン hook 側の保険) へスキップ」される。
      var m = /^url\((['"]?)([^'")]*)\1\)$/.exec(String(cs.backgroundImage || 'none').trim());
      if (!m || !m[2]) continue;
      var rep = String(cs.backgroundRepeat || '').trim();
      if (rep !== 'no-repeat' && rep !== 'no-repeat no-repeat') continue;
      if (String(cs.backgroundAttachment || 'scroll').indexOf('fixed') >= 0) continue;
      if (String(cs.backgroundClip || '').indexOf('text') >= 0) continue;
      if (!(el.offsetWidth > 0 && el.offsetHeight > 0)) continue;
      jobs.push({ el: el, cs: cs, url: m[2] });
    }
    return jobs;
  }

  function applyBackgroundImgShim(clonedDoc) {
    var jobs;
    try { jobs = bgShimCollect(clonedDoc); } catch (e) { return Promise.resolve({ converted: 0, error: String(e) }); }
    return Promise.all(jobs.map(function (j) { return bgShimLoadNatural(j.url); }))
      .then(function (nats) {
        var n = 0;
        for (var i = 0; i < jobs.length; i++) {
          if (!nats[i]) continue;
          try { if (bgShimConvertOne(clonedDoc, jobs[i].el, jobs[i].cs, jobs[i].url, nats[i])) n++; } catch (e) {}
        }
        return { converted: n, candidates: jobs.length };
      });
  }

  function html2canvasOptions(overrides) {
    var base = {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 30000,
      removeContainer: true,
      ignoreElements: function (el) {
        try {
          if (!el) return false;
          if (el.getAttribute && el.getAttribute('data-capture-hide') === '1') return true;
          if (el.hasAttribute && el.hasAttribute('data-capture-hide')) return true;
          if (el.classList && el.classList.contains && el.classList.contains('pono-capture-overlay')) return true;
        } catch (e) {}
        return false;
      },
      onclone: function (clonedDoc) {
        try {
          // v1395: 1) Inject a stylesheet into the clonedDoc that strips
          //         box-shadow / filter (blur/drop-shadow) globally and applies
          //         crisp text-rendering to small text/emoji elements.
          //         clonedDoc 限定なので実画面 DOM は無影響。
          try {
            var captureStyle = clonedDoc.createElement('style');
            captureStyle.setAttribute('data-pono-capture-onclone', '1');
            captureStyle.textContent = [
              '/* pono capture v1395: drop shadows / filters html2canvas reproduces poorly */',
              '*, *::before, *::after {',
              '  box-shadow: none !important;',
              '  -webkit-filter: none !important;',
              '  filter: none !important;',
              '}',
              '/* crisp text/emoji rendering for the html2canvas rasterizer */',
              'button, svg, [class*="-btn"], [class*="-icon"] {',
              '  text-rendering: geometricPrecision;',
              '  -webkit-font-smoothing: antialiased;',
              '}'
            ].join('\n');
            (clonedDoc.head || clonedDoc.documentElement).appendChild(captureStyle);
          } catch (e) {}

          var els = clonedDoc.querySelectorAll('*');
          for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (!el || !el.style) continue;
            try {
              var cs = clonedDoc.defaultView.getComputedStyle(el);
              if (cs && cs.textOverflow === 'ellipsis') {
                el.style.textOverflow = 'clip';
                el.style.whiteSpace = 'normal';
                el.style.overflow = 'visible';
              }
              // v1395: tiny emoji-only buttons (e.g. bento ⚙ /  ⭐) suffer from
              // html2canvas's emoji rasterizer at small font sizes. If the
              // element is a button-ish with a single short emoji-like text
              // child and font-size ≤ 28px, scale the font 1.4x on the clone so
              // html2canvas rasterizes a larger glyph (the final compose step
              // downscales it back, yielding crisper edges).
              if (cs && el.children && el.children.length === 0) {
                var tag = (el.tagName || '').toLowerCase();
                var txt = (el.textContent || '').trim();
                if ((tag === 'button' || tag === 'span') && txt.length > 0 && txt.length <= 2) {
                  var fs = parseFloat(cs.fontSize);
                  if (fs && fs <= 28) {
                    el.style.fontSize = Math.round(fs * 1.4) + 'px';
                    el.style.textRendering = 'geometricPrecision';
                  }
                }
              }
              // v2107 batch:1241 → v2122 batch:1244: html2canvas 1.4.1 は object-fit /
              // object-position を未実装で、img (置換要素) を intrinsic 全域 → content
              // box の 9-arg drawImage で全面 stretch する (renderReplacedElement)。
              // batch:1241 は img を「透明 1px + 等価な background-image」へ変換して
              // AR を直したが、html2canvas の background 描画パス
              // (renderBackgroundImage) は画像を resizeImage() で一旦 CSS px サイズの
              // 中間 canvas に縮小してから createPattern で塗るため、scale:2 の
              // supersampling が無効化され (1x 描画 → 2 倍引き伸ばし)、撮影出力が
              // 全体的にぼやける退行が出た (実測 Laplacian 分散 12 分の 1)。
              // v2122: contain / scale-down は「padding 焼き込み」方式に変更。
              //   content box を object-fit の描画矩形まで padding で縮めると、
              //   html2canvas の置換要素パス (intrinsic → content box をラスタ解像度で
              //   1 回だけリサンプル) のまま AR / object-position が正しくなり鮮明。
              //   (Playwright 実測: 筐体 crop lapVar 69.8 → 372、AR 0.8137 維持)
              // cover / none / intrinsic 不明 (naturalWidth=0) は描画矩形が content box
              // を超え padding では表現できないため、従来 background シムへ fallback。
              // いずれも clonedDoc 限定の書き換えなので実画面 DOM は無影響。
              if (cs && (el.tagName || '').toLowerCase() === 'img') {
                var fit = cs.objectFit;
                if (fit === 'contain' || fit === 'cover' || fit === 'none' || fit === 'scale-down') {
                  var imgSrc = el.currentSrc || el.getAttribute('src');
                  if (imgSrc && imgSrc !== TRANSPARENT_PX_SRC) {
                    var nw = el.naturalWidth || 0;
                    var nh = el.naturalHeight || 0;
                    var padL = parseFloat(cs.paddingLeft) || 0;
                    var padR = parseFloat(cs.paddingRight) || 0;
                    var padT = parseFloat(cs.paddingTop) || 0;
                    var padB = parseFloat(cs.paddingBottom) || 0;
                    // client* は transform 非適用のローカル px。 content box を復元。
                    var cw = el.clientWidth - padL - padR;
                    var ch = el.clientHeight - padT - padB;
                    var canPad = (fit === 'contain' || fit === 'scale-down') &&
                      nw > 0 && nh > 0 && cw > 0 && ch > 0;
                    if (canPad) {
                      // 鮮明パス: img (置換要素) のまま、content box を contain の
                      // 描画矩形へ縮める padding を焼き込む。
                      var fitScale = Math.min(cw / nw, ch / nh);
                      if (fit === 'scale-down') fitScale = Math.min(fitScale, 1);
                      var gapX = Math.max(0, cw - nw * fitScale);
                      var gapY = Math.max(0, ch - nh * fitScale);
                      var posTokens = String(cs.objectPosition || '50% 50%').split(' ');
                      var offsetFor = function (token, gap) {
                        if (!token) return gap / 2;
                        if (token.indexOf('%') >= 0) return gap * (parseFloat(token) / 100);
                        var px = parseFloat(token);
                        if (isNaN(px)) return gap / 2;
                        return Math.max(0, Math.min(px, gap));
                      };
                      var offX = offsetFor(posTokens[0], gapX);
                      var offY = offsetFor(posTokens[1], gapY);
                      // border box を現在値 (offsetWidth/Height) で固定してから
                      // padding を加算 → クローン内 layout は不変 (±1px の整数丸めのみ)。
                      el.style.boxSizing = 'border-box';
                      el.style.width = el.offsetWidth + 'px';
                      el.style.height = el.offsetHeight + 'px';
                      el.style.paddingLeft = (padL + offX) + 'px';
                      el.style.paddingRight = (padR + (gapX - offX)) + 'px';
                      el.style.paddingTop = (padT + offY) + 'px';
                      el.style.paddingBottom = (padB + (gapY - offY)) + 'px';
                      // <picture> の <source srcset> が resource selection を支配する
                      // ため、選択済み URL (currentSrc) を src に確定させる。
                      if (el.getAttribute('src') !== imgSrc) el.setAttribute('src', imgSrc);
                      el.removeAttribute('srcset');
                    } else {
                      // fallback (batch:1241 シム): AR は正しいが background パスの
                      // CSS px 描画のため contain より柔らかい。
                      // url() 内の " と \ をエスケープ (\ を先に)。 未エンコードの
                      // SVG data URI 等で宣言全体が invalid になり画像が消えるのを防ぐ。
                      var cssUrl = imgSrc.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                      el.style.backgroundImage = 'url("' + cssUrl + '")';
                      // scale-down は「none と contain の小さい方」だが、 素材は常に
                      // box より大きい前提 (ゲーム画像) なので contain へ丸める。
                      el.style.backgroundSize = (fit === 'none') ? 'auto' : (fit === 'scale-down' ? 'contain' : fit);
                      el.style.backgroundPosition = cs.objectPosition || '50% 50%';
                      el.style.backgroundRepeat = 'no-repeat';
                      // object-fit は content box 基準。 padding 付き img でも等価に
                      // なるよう background も content-box 基準で描かせる。
                      el.style.backgroundOrigin = 'content-box';
                      el.style.backgroundClip = 'content-box';
                      el.setAttribute('src', TRANSPARENT_PX_SRC);
                      el.removeAttribute('srcset');
                    }
                    // <picture> 内の img は <source srcset> が resource selection を
                    // 支配し、 src 差し替えだけでは意図しない原画が選択され直し得る。
                    // クローン DOM 限定なので <source> ごと除去 (両パス共通)。
                    if (el.closest) {
                      var pic = el.closest('picture');
                      if (pic) {
                        var srcEls = pic.querySelectorAll('source');
                        for (var si = srcEls.length - 1; si >= 0; si--) {
                          if (srcEls[si].parentNode) srcEls[si].parentNode.removeChild(srcEls[si]);
                        }
                      }
                    }
                  }
                }
              }
            } catch (e) {}
          }
        } catch (e) {}

        // v2122 batch:1244: Option X ─ 非 img 要素の CSS 背景 → <img> 昇格シム
        // (定義は上記 applyBackgroundImgShim / TRANSPARENT_PX_SRC 近傍を参照)。
        // html2canvas 1.4.1 は onclone の戻り値が thenable なら await するため、
        // ここで Promise を return してよい。 万一シムが失敗しても撮影全体を
        // 巻き込んで失敗させないよう必ず catch する (実画面 DOM は無影響)。
        return applyBackgroundImgShim(clonedDoc).catch(function () { return null; });
      }
    };
    if (overrides && typeof overrides === 'object') {
      for (var k in overrides) {
        if (Object.prototype.hasOwnProperty.call(overrides, k)) {
          base[k] = overrides[k];
        }
      }
    }
    return base;
  }

  // ── 公開 API ──
  window.PonoCapture = {
    register: register,
    show: show,
    shoot: shoot,
    isAllowed: isCaptureAllowed,
    PRESETS: PRESETS.slice(),
    html2canvasOptions: html2canvasOptions
  };

  // 起動
  armUI();
})();
