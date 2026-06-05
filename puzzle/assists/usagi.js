// PonoAssist: usagi — 「みみダウジング」
// パートナー 'usagi' が選択されている時のみアクティブ。
// ドラッグ中のピース正解位置 (homeX, homeY) と現在位置 (x, y) から角度を計算し、
// 画面上部に表示したウサギの大きな耳が「正解方向」を指し示す。
// 距離が近いほど耳の色が灰 → 桃 → 鮮やかな桃に遷移する。
//
// なかよしレベル別の角度精度:
//   Lv1: ±15度ノイズ (ぼやける)
//   Lv2: ±5度ノイズ
//   Lv3: 完全に正確
//
// 依存:
//   window.PonoAssistRegister(hookName, fn)  - main.js が用意するフック登録 API
//   window.PonoBond.getLevel(partnerId, stageId) - 現ステージのなかよしLv取得
//
// このファイルは index.html から <script src="assists/usagi.js"> で読み込まれる前提。
// 既存 main.js / index.html / style.css への変更は最小限に保ち、
// 必要な DOM/CSS はこのファイル内で動的注入する。
(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  // ───────────────────────────────────────────────
  // 定数
  // ───────────────────────────────────────────────
  var PARTNER_ID = 'usagi';
  var FADE_OUT_MS = 100; // ドラッグ終了後のフェード遅延 (debounce)
  var FADE_DURATION_MS = 220;
  var EAR_HEIGHT = 64; // px
  var EAR_WIDTH = 32;
  // 距離 -> 色補間用 (相対正規化スケール)
  // 0 .. NEAR_DIST: 鮮桃, NEAR_DIST .. MID_DIST: 桃, それ以上: 灰
  var NEAR_DIST = 40;
  var MID_DIST = 160;
  // 色 (HSL) ※ 鮮桃 → 桃 → 灰 で補間
  var COLOR_NEAR = { h: 340, s: 90, l: 62 }; // 鮮やかな桃
  var COLOR_MID  = { h: 340, s: 60, l: 78 }; // 桃
  var COLOR_FAR  = { h: 0,   s: 0,  l: 70 }; // 灰

  // ───────────────────────────────────────────────
  // 内部状態
  // ───────────────────────────────────────────────
  var root = null;        // 親コンテナ <div>
  var earLeft = null;     // 左耳 SVG (回転対象)
  var earRight = null;    // 右耳 SVG (左右対称ミラー)
  var pivot = null;       // 両耳を載せる回転ピボット <div>
  var fadeTimer = 0;      // setTimeout id (drag end debounce)
  var injectedCSS = false;
  var currentLevel = 3;   // 既定: 最高精度 (なかよし情報が取れなかった時の安全側)
  var currentStageId = null;
  // 角度の指数平滑化用 (フレーム間ジッタ抑制)
  // state.lastAngle: 前フレームで適用した最終角度 (degrees, -180..180)
  // state.hasLast: 初回フレーム判定
  var state = { lastAngle: 0, hasLast: false };
  var hintLabel = null;   // 「↑ こっち」テキスト要素 (耳の sibling として inject) — 互換用 (現在は外側コンテナ)
  var hintArrowEl = null; // 「↑」だけの span (耳と同じ rotate を適用)
  var hintTextEl = null;  // 「こっち」だけの span (rotate なし、水平固定)

  // ───────────────────────────────────────────────
  // DOM / CSS 注入
  // ───────────────────────────────────────────────
  function ensureCSS() {
    if (injectedCSS) return;
    injectedCSS = true;
    var style = document.createElement('style');
    style.setAttribute('data-pono-assist', 'usagi');
    style.textContent = [
      '#pono-usagi-dowsing{',
      '  position:fixed;top:8px;left:50%;transform:translateX(-50%);',
      '  pointer-events:none;z-index:9000;',
      '  display:flex;flex-direction:column;align-items:center;',
      '  opacity:0;transition:opacity ' + FADE_DURATION_MS + 'ms ease;',
      '  filter:drop-shadow(0 3px 6px rgba(0,0,0,.45)) drop-shadow(0 1px 2px rgba(0,0,0,.35));',
      '}',
      '#pono-usagi-dowsing.is-active{opacity:1;}',
      '#pono-usagi-dowsing .pono-usagi-pivot{',
      '  width:' + (EAR_WIDTH * 2 + 14) + 'px;',
      '  height:' + EAR_HEIGHT + 'px;',
      '  display:flex;justify-content:space-between;align-items:flex-end;',
      '  transform:rotate(0deg);transform-origin:50% 90%;',
      '  transition:transform 120ms cubic-bezier(.4,.2,.2,1);',
      '}',
      '#pono-usagi-dowsing .pono-usagi-ear{',
      '  width:' + EAR_WIDTH + 'px;height:' + EAR_HEIGHT + 'px;',
      '  transition:fill 160ms ease;',
      '}',
      '#pono-usagi-dowsing .pono-usagi-ear--r{transform:scaleX(-1);}',
      '#pono-usagi-dowsing .pono-usagi-base{',
      '  width:46px;height:14px;margin-top:-6px;',
      '  background:#fff;border-radius:50%/40%;',
      '  box-shadow:0 1px 0 rgba(0,0,0,.08) inset;',
      '}',
      // 「↑ こっち」ヒントテキスト
      // ★ 旧仕様 (rev1): 耳の sibling かつ rotate(...) で耳と一緒に回していたため、耳が下を
      //   向くとテキストが上下逆さまになり 0-6 歳児が読めなかった (ユーザー実機FB)。
      // ★ 旧仕様 (rev2): テキスト全体を水平固定したが「↑」も水平のままになり、
      //   耳の指し示す方向と矢印がズレるケースが発生した。
      // ★ 新仕様 (rev3 / 本修正): DOM を 2 つの span に分割。
      //   - .pono-usagi-hint-arrow (「↑」): 耳と同じ角度で rotate
      //   - .pono-usagi-hint-text  (「こっち」): rotate なし、常に水平
      //   外側 .pono-usagi-hint は「耳先端付近に left/top で配置されるだけのコンテナ」。
      '#pono-usagi-dowsing .pono-usagi-hint{',
      '  position:absolute;',
      '  left:50%;top:0;',
      '  transform:translate(-50%, -100%);', // 自身の中心 X、底辺基準で配置原点を補正
      '  font-size:16px;font-weight:700;line-height:1;',
      '  color:#ff5599;',
      '  background:rgba(255,255,255,0.72);',
      '  padding:3px 8px;border-radius:10px;',
      '  white-space:nowrap;',
      '  text-shadow:0 1px 0 rgba(255,255,255,.9);',
      '  transition:left 120ms cubic-bezier(.4,.2,.2,1), top 120ms cubic-bezier(.4,.2,.2,1), opacity ' + FADE_DURATION_MS + 'ms ease;',
      '  pointer-events:none;',
      '  opacity:0.95;',
      '  will-change:left,top;',
      '  display:inline-flex;align-items:center;gap:2px;',
      '}',
      '#pono-usagi-dowsing .pono-usagi-hint-arrow{',
      '  display:inline-block;',
      '  transform:rotate(0deg);',
      '  transform-origin:center;',
      '  transition:transform 120ms cubic-bezier(.4,.2,.2,1);',
      '  will-change:transform;',
      '}',
      '#pono-usagi-dowsing .pono-usagi-hint-text{',
      '  display:inline-block;',
      '  transform:none;',
      '}',
      // 縦長画面では小さく
      '@media (max-width: 520px){',
      '  #pono-usagi-dowsing .pono-usagi-ear{width:24px;height:48px;}',
      '  #pono-usagi-dowsing .pono-usagi-pivot{width:62px;height:48px;}',
      '  #pono-usagi-dowsing .pono-usagi-hint{font-size:14px;padding:2px 6px;}',
      '}',
      ''
    ].join('\n');
    document.head.appendChild(style);
  }

  function buildEarSVG(side) {
    // 楕円的な耳形状: 外側白、内側ピンク (内側は static、色変動は外側 fill)
    // 1 SVG = 1 path (outer) + 1 path (inner pink)。
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 32 64');
    svg.setAttribute('class', 'pono-usagi-ear pono-usagi-ear--' + side);
    var outer = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    outer.setAttribute('d', 'M16 2 C 6 8, 4 30, 8 50 C 10 60, 22 60, 24 50 C 28 30, 26 8, 16 2 Z');
    outer.setAttribute('fill', '#ffffff');
    outer.setAttribute('stroke', 'rgba(40,20,40,0.65)');
    outer.setAttribute('stroke-width', '1.8');
    var inner = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    inner.setAttribute('d', 'M16 10 C 11 14, 10 30, 12 46 C 13 52, 19 52, 20 46 C 22 30, 21 14, 16 10 Z');
    inner.setAttribute('fill', '#ffb8cc');
    inner.setAttribute('opacity', '0.95');
    svg.appendChild(outer);
    svg.appendChild(inner);
    // 後で参照しやすいよう side で覚える
    svg._earOuter = outer;
    return svg;
  }

  function ensureDom() {
    if (root) return;
    ensureCSS();
    root = document.createElement('div');
    root.id = 'pono-usagi-dowsing';
    root.setAttribute('aria-hidden', 'true');

    pivot = document.createElement('div');
    pivot.className = 'pono-usagi-pivot';

    earLeft = buildEarSVG('l');
    earRight = buildEarSVG('r');

    pivot.appendChild(earLeft);
    pivot.appendChild(earRight);

    var base = document.createElement('div');
    base.className = 'pono-usagi-base';

    // 「↑ こっち」ヒント (root 直下に絶対配置、内部で 2 spans に分割)
    // - hintArrowEl (「↑」): 耳と同じ角度で rotate
    // - hintTextEl  (「こっち」): rotate なし、常に水平
    hintLabel = document.createElement('div');
    hintLabel.className = 'pono-usagi-hint';
    hintLabel.setAttribute('aria-hidden', 'true');

    hintArrowEl = document.createElement('span');
    hintArrowEl.className = 'pono-usagi-hint-arrow';
    hintArrowEl.textContent = '↑';

    hintTextEl = document.createElement('span');
    hintTextEl.className = 'pono-usagi-hint-text';
    hintTextEl.textContent = 'こっち';

    hintLabel.appendChild(hintArrowEl);
    hintLabel.appendChild(hintTextEl);

    root.appendChild(pivot);
    root.appendChild(base);
    root.appendChild(hintLabel);

    document.body.appendChild(root);
  }

  // ───────────────────────────────────────────────
  // ユーティリティ
  // ───────────────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }

  function clamp01(v) {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
  }

  /** 距離 -> HSL 文字列 */
  function distanceToColor(dist) {
    var c1, c2, t;
    if (dist <= NEAR_DIST) {
      return 'hsl(' + COLOR_NEAR.h + ',' + COLOR_NEAR.s + '%,' + COLOR_NEAR.l + '%)';
    }
    if (dist >= MID_DIST) {
      // 遠方は完全に灰
      return 'hsl(' + COLOR_FAR.h + ',' + COLOR_FAR.s + '%,' + COLOR_FAR.l + '%)';
    }
    if (dist < (NEAR_DIST + MID_DIST) / 2) {
      // NEAR -> MID
      t = clamp01((dist - NEAR_DIST) / ((NEAR_DIST + MID_DIST) / 2 - NEAR_DIST));
      c1 = COLOR_NEAR; c2 = COLOR_MID;
    } else {
      // MID -> FAR
      t = clamp01((dist - (NEAR_DIST + MID_DIST) / 2) / (MID_DIST - (NEAR_DIST + MID_DIST) / 2));
      c1 = COLOR_MID; c2 = COLOR_FAR;
    }
    var h = lerp(c1.h, c2.h, t);
    var s = lerp(c1.s, c2.s, t);
    var l = lerp(c1.l, c2.l, t);
    return 'hsl(' + h.toFixed(1) + ',' + s.toFixed(1) + '%,' + l.toFixed(1) + '%)';
  }

  /** なかよしレベル -> 角度ノイズ振幅 (度)
   *  Phase 2 改善: ノイズを大幅削減 + updateEarsForPiece 側で指数平滑化を併用する。
   *  Lv0/Lv1: 8° (旧 15°) — 「ふらつくけど方向は分かる」レベル
   *  Lv2:     3° (旧 5°)
   *  Lv3:     0° (現状維持) */
  function noiseAmplitudeForLevel(level) {
    if (level >= 3) return 0;
    if (level === 2) return 3;
    return 8; // Lv0/Lv1
  }

  /** ノイズ加算 (ランダム ±amp) */
  function applyAngleNoise(angleDeg, amp) {
    if (amp <= 0) return angleDeg;
    return angleDeg + (Math.random() * 2 - 1) * amp;
  }

  /** 現ステージID取得 (ピースに stageId が乗っているか、グローバルから) */
  function pickStageId(piece) {
    if (piece && piece.stageId != null) return piece.stageId;
    try {
      // main.js の currentStage は外部公開されていないため、 BASE_STAGES[ stageIndex ] から推測
      // 既知のグローバルが無くても致命的ではない (Lv 不明なら currentLevel=3 にフォールバック)。
      if (typeof window.currentStageIndex === 'number' && Array.isArray(window.BASE_STAGES)) {
        var s = window.BASE_STAGES[window.currentStageIndex];
        if (s && s.id != null) return s.id;
      }
    } catch (_) {}
    return null;
  }

  /** PonoBond からなかよしLvを取得 (取れなければ既定 3) */
  function resolveLevel(stageId) {
    try {
      if (window.PonoBond && typeof window.PonoBond.getLevel === 'function') {
        var lv = window.PonoBond.getLevel(PARTNER_ID, stageId);
        if (typeof lv === 'number' && isFinite(lv)) return lv;
      }
    } catch (_) {}
    return 3;
  }

  // ───────────────────────────────────────────────
  // 表示 / 更新
  // ───────────────────────────────────────────────
  function show() {
    if (!root) return;
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = 0; }
    root.classList.add('is-active');
  }

  function scheduleHide() {
    if (!root) return;
    if (fadeTimer) clearTimeout(fadeTimer);
    fadeTimer = setTimeout(function () {
      if (root) root.classList.remove('is-active');
      // 次回ドラッグ開始時に初期角度から滑らかに合わせるため平滑化状態をリセット
      state.hasLast = false;
      fadeTimer = 0;
    }, FADE_OUT_MS);
  }

  function updateEarsForPiece(piece) {
    if (!piece || piece.homeX == null || piece.homeY == null) return;
    // 正解方向ベクトル (現在位置 → ホーム)
    var dx = piece.homeX - piece.x;
    var dy = piece.homeY - piece.y;
    var dist = Math.hypot(dx, dy);

    // 既に snap 済みのピース (dist≈0) ではノイズ抜きで真上を向ける
    // angleRad: 0 = 上方向 (画面上で「指し示す」感を出すため -90° 補正)
    var angleDeg = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    // -180..180 に正規化
    while (angleDeg > 180) angleDeg -= 360;
    while (angleDeg < -180) angleDeg += 360;

    // なかよしレベルに応じてノイズを乗せた raw 角度
    var rawAngle = applyAngleNoise(angleDeg, noiseAmplitudeForLevel(currentLevel));

    // 指数平滑化 (EMA): smoothed = 0.7 * lastAngle + 0.3 * rawAngle
    // ※ 角度の循環性 (例: +179° と -179° は隣接) を扱うため、差分を -180..180 に正規化してから補間
    var smoothed;
    if (!state.hasLast) {
      smoothed = rawAngle;
      state.hasLast = true;
    } else {
      var delta = rawAngle - state.lastAngle;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      smoothed = state.lastAngle + 0.3 * delta;
      while (smoothed > 180) smoothed -= 360;
      while (smoothed < -180) smoothed += 360;
    }
    state.lastAngle = smoothed;

    if (pivot) {
      pivot.style.transform = 'rotate(' + smoothed.toFixed(2) + 'deg)';
    }
    // ヒント表示 (Phase 3b): DOM を 2 つに分割して個別制御。
    //   - hintArrowEl (「↑」): 耳と同じ角度で rotate (= smoothed)
    //   - hintTextEl  (「こっち」): rotate なし、常に水平 (CSS で transform:none 固定)
    //   - hintLabel (コンテナ): 耳先端付近に left/top で配置 (translate のみ)
    // ★ rev2 までは hintLabel 全体を水平固定にしていたため、「↑」も水平のままで
    //   耳の指し示す方向と矢印が一致しないケースがあった。本修正で「↑」だけが
    //   耳と一緒に回転する形に統一。
    if (hintArrowEl) {
      hintArrowEl.style.transform = 'rotate(' + smoothed.toFixed(2) + 'deg)';
    }
    if (hintLabel && pivot) {
      // 耳の先端 (回転前のローカル座標) = pivot 中央上端付近。
      // pivot の transform-origin は CSS 上 '50% 90%' で固定 (ensureCSS 参照)。
      // → 回転中心から見た先端のオフセットは (0, -pivotHeight * 0.9)。
      // 回転後の先端位置 = 回転中心 + rotate(θ) * (0, -0.9 * pivotHeight)
      //                  = 回転中心 + (sinθ * 0.9 * H, -cosθ * 0.9 * H)
      // ※ CSS の rotate は時計回り正、 sin/cos も同じ符号系で OK。
      var rad = smoothed * Math.PI / 180;
      // pivot の rect は回転後の外接矩形になるが、 回転中心は CSS で固定 '50% 90%' のため
      // 「未回転時の pivot のサイズ + offset」を使うのが正しい。 offsetWidth/Height/Top/Left は
      // transform 適用前のレイアウト寸/位置を返すのでこちらを使う。
      var H = pivot.offsetHeight || EAR_HEIGHT;
      var W = pivot.offsetWidth || (EAR_WIDTH * 2 + 14);
      var pivotTopInRoot = pivot.offsetTop || 0;   // root 内での未回転 top
      var pivotLeftInRoot = pivot.offsetLeft || 0; // root 内での未回転 left
      // pivot の回転中心 (root 座標系) — CSS transform-origin '50% 90%' (ensureCSS 参照)
      var cx = pivotLeftInRoot + W / 2;
      var cy = pivotTopInRoot + H * 0.9;
      // 回転後の耳先端
      var tipX = cx + Math.sin(rad) * 0.9 * H;
      var tipY = cy - Math.cos(rad) * 0.9 * H;
      // テキストはルート (position:fixed) からの相対位置で配置 = root の origin (top-left) 基準。
      // CSS で transform: translate(-50%, -100%) を当てているので、 (tipX, tipY) は
      // テキスト bottom-center が来る点になる → 耳先端のちょい上にラベルが乗る。
      // 真下を指すケースだと耳先端が root 内座標で下方向に出るため、 ラベルが
      // 画面端を超えないよう最低 0 でクランプ。
      var safeY = Math.max(0, tipY - 4); // 4px の余白
      hintLabel.style.left = tipX.toFixed(1) + 'px';
      hintLabel.style.top = safeY.toFixed(1) + 'px';
    }

    // 色 (距離依存)
    var color = distanceToColor(dist);
    if (earLeft && earLeft._earOuter) earLeft._earOuter.setAttribute('fill', color);
    if (earRight && earRight._earOuter) earRight._earOuter.setAttribute('fill', color);
  }

  // ───────────────────────────────────────────────
  // フック登録
  // ───────────────────────────────────────────────

  // ステージ開始時にレベルキャッシュ (毎フレーム localStorage を叩かない)
  function hookBeforeStageStart(ctx) {
    try {
      var partner = ctx && ctx.partner;
      if (!partner || partner.id !== PARTNER_ID) return;
      var stageId = (ctx && ctx.stage && ctx.stage.id != null) ? ctx.stage.id : null;
      currentStageId = stageId;
      currentLevel = resolveLevel(stageId);
    } catch (_) {}
  }

  // ステージ準備完了でも一度更新 (パートナー切り替え直後など)
  function hookAfterStageReady(ctx) {
    try {
      var partner = ctx && ctx.partner;
      if (!partner || partner.id !== PARTNER_ID) return;
      var stageId = (ctx && ctx.stage && ctx.stage.id != null) ? ctx.stage.id : currentStageId;
      currentStageId = stageId;
      currentLevel = resolveLevel(stageId);
      ensureDom();
    } catch (_) {}
  }

  // ドラッグ中: 毎 pointermove で耳の向き・色を更新
  function hookDuringDrag(ctx) {
    try {
      var partner = ctx && ctx.partner;
      if (!partner || partner.id !== PARTNER_ID) return;
      var piece = ctx && ctx.piece;
      if (!piece) return;
      ensureDom();
      // ステージ情報がまだ無ければここで補完
      if (currentStageId == null) {
        currentStageId = pickStageId(piece);
        currentLevel = resolveLevel(currentStageId);
      }
      show();
      updateEarsForPiece(piece);
      // 次の onPointerUp までに新たな move が来なければ自動でフェードアウト
      // (onPointerUp フックは無いので debounce で代用)
      if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = 0; }
      // drag が継続している間は再度 hide スケジュールしない (move ごとに上記でクリア済み)
      // 200ms 以上 move が来なければ pointerup 相当と見なす
      fadeTimer = setTimeout(function () {
        if (root) root.classList.remove('is-active');
        state.hasLast = false; // 次回ドラッグ開始で平滑化を再初期化
        fadeTimer = 0;
      }, FADE_OUT_MS + 100);
    } catch (_) {}
  }

  // スナップ成功直後にもフェードアウト指示 (move が来なくなる前に確実に消す)
  function hookAfterSnap(ctx) {
    try {
      var partner = ctx && ctx.partner;
      if (!partner || partner.id !== PARTNER_ID) return;
      scheduleHide();
    } catch (_) {}
  }

  // 成功モーダル表示時は必ず消しておく
  function hookBeforeShowSuccess(ctx) {
    try {
      var partner = ctx && ctx.partner;
      if (!partner || partner.id !== PARTNER_ID) return;
      if (root) root.classList.remove('is-active');
      if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = 0; }
      state.hasLast = false; // 平滑化リセット
    } catch (_) {}
  }

  // === 登録 ===
  // _hooks-init.js が先に読まれていれば即時登録できるが、万が一 script ロード順が
  // 壊れて PonoAssistRegister が未定義だった場合に備え、 DOMContentLoaded で retry。
  // (kojika.js と同じパターン)
  function registerAll() {
    if (typeof window.PonoAssistRegister !== 'function') return false;
    window.PonoAssistRegister('beforeStageStart', hookBeforeStageStart);
    window.PonoAssistRegister('afterStageReady', hookAfterStageReady);
    window.PonoAssistRegister('duringDrag', hookDuringDrag);
    window.PonoAssistRegister('afterSnap', hookAfterSnap);
    window.PonoAssistRegister('beforeShowSuccess', hookBeforeShowSuccess);
    return true;
  }

  if (!registerAll()) {
    try { console.warn('[usagi-assist] PonoAssistRegister not ready — retry on DOMContentLoaded'); } catch (_) {}
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        if (!registerAll()) {
          try { console.warn('[usagi-assist] PonoAssistRegister still missing after DOMContentLoaded'); } catch (_) {}
        }
      }, { once: true });
    } else {
      // 既に load 済みで PonoAssistRegister が無いケース (本来は起きない)
      setTimeout(function () {
        if (!registerAll()) {
          try { console.warn('[usagi-assist] PonoAssistRegister still missing after setTimeout'); } catch (_) {}
        }
      }, 0);
    }
  }

  // 公開 (テスト/デバッグ用)
  window.PonoAssistUsagi = {
    partnerId: PARTNER_ID,
    _debug: {
      show: show,
      hide: function () { if (root) root.classList.remove('is-active'); },
      setLevel: function (lv) { currentLevel = lv; },
      updateEarsForPiece: updateEarsForPiece,
    },
  };
})();
