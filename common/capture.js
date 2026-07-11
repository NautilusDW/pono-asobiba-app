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

    return Promise.resolve()
      .then(function () { return registered.build(buildOpts); })
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
  var TRANSPARENT_PX_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

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
              // v2107 batch:1241: html2canvas 1.4.1 は object-fit / object-position を
              // 未実装で、img (置換要素) を intrinsic 全域 → content box の 9-arg
              // drawImage で全面 stretch する (renderReplacedElement)。このため
              // object-fit:contain の画像 (例: デイリーガチャ筐体 .daily-gacha-machine)
              // が撮影時のみ box の縦横比に引き伸ばされ「横太り」になっていた。
              // html2canvas の background 描画 (contain/cover/position) は正しく実装
              // されているので、object-fit を持つ img を「透明 1px + 等価な
              // background-image」へ変換して同じ見た目を焼かせる。
              // clonedDoc 限定の書き換えなので実画面 DOM は無影響。
              // (Playwright 実測: 筐体 AR 1.02〜1.07 → 0.812 に復元、 intrinsic 0.8115)
              if (cs && (el.tagName || '').toLowerCase() === 'img') {
                var fit = cs.objectFit;
                if (fit === 'contain' || fit === 'cover' || fit === 'none' || fit === 'scale-down') {
                  var imgSrc = el.currentSrc || el.getAttribute('src');
                  if (imgSrc && imgSrc !== TRANSPARENT_PX_SRC) {
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
                    // <picture> 内の img は <source srcset> が resource selection を
                    // 支配し、 src 差し替えだけでは stretch された原画が background の
                    // 上に二重描画され得る。 クローン DOM 限定なので <source> ごと除去。
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
