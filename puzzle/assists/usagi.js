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
      // 縦長画面では小さく
      '@media (max-width: 520px){',
      '  #pono-usagi-dowsing .pono-usagi-ear{width:24px;height:48px;}',
      '  #pono-usagi-dowsing .pono-usagi-pivot{width:62px;height:48px;}',
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

    root.appendChild(pivot);
    root.appendChild(base);

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

  /** なかよしレベル -> 角度ノイズ振幅 (度) */
  function noiseAmplitudeForLevel(level) {
    if (level >= 3) return 0;
    if (level === 2) return 5;
    return 15; // Lv0/Lv1
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

    // なかよしレベルに応じてノイズ
    var noisy = applyAngleNoise(angleDeg, noiseAmplitudeForLevel(currentLevel));

    if (pivot) {
      pivot.style.transform = 'rotate(' + noisy.toFixed(2) + 'deg)';
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
