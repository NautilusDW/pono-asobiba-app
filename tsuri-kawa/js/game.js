// ── tsuri-kawa/js/game.js ──
// ポノの かわづり: DOM/描画/入力・ゲームループ (DOM 依存)。ビジュアル全面刷新 v1 (2026-07-24)。
// 純粋な状態機械は common/tsuri/core.js の window.PonoTsuriCore、
// 川づり固有のチューニング/セーブ形状は js/logic.js の window.TsuriKawaLogic、
// 魚マスターデータは common/tsuri/fish-data.js の window.PonoFishData、
// タップ入力は common/tsuri/input.js の window.PonoTsuriInput を参照する。
// core.js / fish-data.js / input.js / logic.js の公開API・状態遷移・チューニング値は
// 一切変更しない (見た目だけを全面刷新する)。
'use strict';

(function () {

  // ═══ 読み込み失敗フォールバック ═══
  function showLoadError() {
    if (document.getElementById('loadErrorScreen')) return;
    var ov = document.createElement('div');
    ov.id = 'loadErrorScreen';
    ov.setAttribute('role', 'alert');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;background:rgba(31,90,134,0.96);color:#fff;font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN",sans-serif;text-align:center';
    var msg = document.createElement('div');
    msg.style.cssText = 'font-size:1.05rem;font-weight:900;line-height:1.6';
    msg.innerHTML = 'よみこみが うまくいかなかったよ<br>もういちど ためしてね';
    ov.appendChild(msg);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '🔄 もういちど よみこむ';
    btn.style.cssText = 'padding:12px 32px;border:none;border-radius:50px;background:linear-gradient(135deg,#60A5FA,#3B82F6);color:#fff;font-size:1rem;font-weight:900;font-family:inherit;cursor:pointer';
    btn.addEventListener('pointerdown', function () { location.reload(); });
    ov.appendChild(btn);
    document.body.appendChild(ov);
    document.body.classList.add('pono-game-ready');
  }

  function boot() {
    try {
      bootInner();
    } catch (e) {
      console.error('[tsuri-kawa] boot() 内で予期しない例外が発生しました。再読込UIを表示します:', e);
      showLoadError();
    }
  }

  function bootInner() {
  var Core = window.PonoTsuriCore;
  var FishData = window.PonoFishData;
  var Input = window.PonoTsuriInput;
  var Logic = window.TsuriKawaLogic;

  // ═══ 魚種アイコン (画像素材未生成のためプレースホルダー絵文字) ═══
  var SPECIES_ICON = {
    fish_ayu: '🐟',
    fish_nijimasu: '🐠',
    zarigani: '🦐',
    fish_salmon: '🐡',
    treasure_boot: '👢'
  };
  // 魚影サイズ (企画書の size フィールドを読み取るのみ・契約変更なし)
  var SIZE_WIDTH_PCT = { s: 7, m: 10, l: 14 };
  var FLY_WORDS = ['いいぞ！', 'そのちょうし！', 'もうすこし！'];

  // ═══ DOM 参照 ═══
  var stageEl = document.getElementById('stage');
  var playScreenEl = document.getElementById('playScreen');
  var narrationEl = document.getElementById('narrationBar');
  var bucketListEl = document.getElementById('bucketList');
  var bucketCountEl = document.getElementById('bucketCount');
  var castSpotEls = document.querySelectorAll('.cast-spot');
  var bobberEl = document.getElementById('bobber');
  var splashRingEl = document.getElementById('splashRing');
  var splashChurnEl = document.getElementById('splashChurn');
  var biteMarkEl = document.getElementById('biteMark');
  var biteRingEl = biteMarkEl ? biteMarkEl.querySelector('.bite-ring') : null;
  var rendaWrapEl = document.getElementById('rendaWrap');
  var rendaBigTextEl = document.getElementById('rendaBigText');
  var rendaComboEl = document.getElementById('rendaCombo');
  var rendaComboNumEl = document.getElementById('rendaComboNum');
  var rendaFillEl = document.getElementById('rendaGaugeFill');
  var catchOverlayEl = document.getElementById('catchOverlay');
  var catchIconEl = document.getElementById('catchIcon');
  var catchNameEl = document.getElementById('catchName');
  var catchLabelEl = document.getElementById('catchLabel');
  var escapeOverlayEl = document.getElementById('escapeOverlay');
  var helpOverlayEl = document.getElementById('helpOverlay');
  var anglerEl = document.getElementById('angler');
  var shadowTargetEl = document.getElementById('shadowTarget');
  var lineSvgEl = document.getElementById('lineSvg');
  var lineAirEl = document.getElementById('lineAir');
  var lineWaterEl = document.getElementById('lineWater');
  var hookMarkEl = document.getElementById('hookMark');
  var phaseWordEl = document.getElementById('phaseWord');
  var fxLayerEl = document.getElementById('fxLayer');
  var moodLayerEl = document.getElementById('moodLayer');

  function prefersReducedMotion() {
    try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  // 判定は物理画面の向き (screen.orientation) を優先。 viewport 実寸は
  // 回転中の中間 resize 等で一瞬 0/古い値を返すことがあるためフォールバックにも
  // 使わない。fail-open 設計 (判定不能時はnoticeを出さずゲームを止めない)。
  // (guragura-seesaw/js/game.js 確立済みパターンをそのまま移植。 2026-07-23)
  function computeIsPortrait() {
    try {
      var so = window.screen && window.screen.orientation;
      if (so && typeof so.type === 'string' && so.type.indexOf('portrait') === 0) return true;
      if (so && typeof so.type === 'string' && so.type.indexOf('landscape') === 0) return false;
      if (typeof window.matchMedia === 'function') {
        var mq = window.matchMedia('(orientation: portrait)');
        if (mq && typeof mq.matches === 'boolean') return mq.matches;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  function isCoarsePointer() {
    try {
      return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    } catch (e) {
      return false;
    }
  }

  function updateLandscapeNotice() {
    var notice = document.getElementById('landscape-notice');
    if (!notice) return;
    var show = computeIsPortrait() && isCoarsePointer();
    notice.style.display = show ? 'flex' : 'none';
    notice.setAttribute('aria-hidden', show ? 'false' : 'true');
  }
  updateLandscapeNotice();
  window.addEventListener('orientationchange', function () {
    setTimeout(updateLandscapeNotice, 100);
    setTimeout(updateLandscapeNotice, 500);
  });
  window.addEventListener('resize', updateLandscapeNotice);
  window.addEventListener('pageshow', updateLandscapeNotice);
  window.addEventListener('load', updateLandscapeNotice);
  try {
    if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
      window.visualViewport.addEventListener('resize', updateLandscapeNotice);
    }
  } catch (e) { /* fail-open */ }
  try {
    if (window.screen && window.screen.orientation && typeof window.screen.orientation.addEventListener === 'function') {
      window.screen.orientation.addEventListener('change', updateLandscapeNotice);
    }
  } catch (e) { /* fail-open */ }

  // ═══ 画面遷移 (.show クラス方式。 hidden 属性は使わない) ═══
  var SCREEN_IDS = ['titleScreen', 'playScreen'];
  function showScreen(id) {
    for (var i = 0; i < SCREEN_IDS.length; i++) {
      var el = document.getElementById(SCREEN_IDS[i]);
      if (el) el.classList.toggle('show', SCREEN_IDS[i] === id);
    }
  }

  // ═══ セーブ I/O (localStorage の実 I/O はここだけが担当。logic.js は純関数) ═══
  function loadSave() {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(Logic.SAVE_KEY)); } catch (e) { raw = null; }
    return Logic.normalizeSave(raw);
  }
  function persistSave() {
    try { localStorage.setItem(Logic.SAVE_KEY, JSON.stringify(save)); } catch (e) { /* quota等は無視 (次回起動で再現なければ実害なし) */ }
  }

  // ═══ ゲーム状態 ═══
  var SPECIES_POOL = Logic.getSpeciesPool();
  var uiPhase = 'title'; // 'title' | 'playing'
  var session = null;
  var save = loadSave();
  var bucketSessionCatches = []; // 表示専用 (このセッション内で釣った魚のアイコン列)
  var lastCastSpotPos = { left: 50, top: 34 };
  var biteWindowStartSec = 0;
  var waitTotalSec = 0;
  var preBiteShown = false;
  var pendingRestartTimer = null;
  var rendaComboCount = 0;
  var rendaFlyIdx = 0;

  function setNarration(text) {
    narrationEl.textContent = text;
  }
  function setPhaseWord(text, cls) {
    if (!phaseWordEl) return;
    phaseWordEl.textContent = text || '';
    phaseWordEl.className = cls || '';
  }

  function renderBucket() {
    bucketCountEl.textContent = String(bucketSessionCatches.length);
    var shown = bucketSessionCatches.length > 8 ? bucketSessionCatches.slice(-8) : bucketSessionCatches;
    bucketListEl.textContent = '';
    for (var i = 0; i < shown.length; i++) {
      var span = document.createElement('span');
      span.textContent = shown[i];
      bucketListEl.appendChild(span);
    }
  }

  function showOverlay(el) {
    el.classList.remove('show');
    void el.offsetWidth; // reflow to force animation restart
    el.classList.add('show');
  }
  function clearOverlays() {
    catchOverlayEl.classList.remove('show');
    escapeOverlayEl.classList.remove('show');
    helpOverlayEl.classList.remove('show');
  }

  // ═══ 汎用トゥイーン (rAF駆動。cast放物線/魚ジャンプ/逃走ダッシュで共有) ═══
  function tweenPosition(el, from, to, durationMs, opts) {
    opts = opts || {};
    var arc = opts.arc || 0; // 山なりの高さ(%)。負のtopが「上」なので内部でマイナス方向に加算する
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var raw = durationMs > 0 ? Math.min(1, (ts - start) / durationMs) : 1;
      var t = raw; // linear (easing は呼び出し側が from/to 側で調整する想定)
      var x = from.left + (to.left - from.left) * t;
      var yBase = from.top + (to.top - from.top) * t;
      var bump = arc ? -arc * 4 * t * (1 - t) : 0;
      el.style.left = x + '%';
      el.style.top = (yBase + bump) + '%';
      if (raw < 1) {
        requestAnimationFrame(step);
      } else if (typeof opts.onDone === 'function') {
        opts.onDone();
      }
    }
    requestAnimationFrame(step);
  }

  // ═══ 釣り糸 SVG (フィードバック3: 竿先→ウキ(たわみ)→針(水中垂直)を常時描画) ═══
  var ROD_TIP = { x: 27.2, y: 9 }; // viewBox(160x90)座標。 ステージ%の(17,10)相当
  function pctToViewBox(leftPct, topPct) {
    return { x: leftPct * 1.6, y: topPct * 0.9 };
  }
  function updateLineSvg(leftPct) {
    var b = pctToViewBox(leftPct, 34);
    var bobTop = { x: b.x, y: 30.6 };   // ウキ上端
    var bobBottom = { x: b.x, y: 31.4 }; // ウキ下端
    var hookPt = { x: b.x, y: 43.4 };    // 針
    var midX = (ROD_TIP.x + bobTop.x) / 2;
    var midY = (ROD_TIP.y + bobTop.y) / 2 + 6;
    if (lineAirEl) lineAirEl.setAttribute('d', 'M ' + ROD_TIP.x + ',' + ROD_TIP.y + ' Q ' + midX + ',' + midY + ' ' + bobTop.x + ',' + bobTop.y);
    if (lineWaterEl) lineWaterEl.setAttribute('d', 'M ' + bobBottom.x + ',' + bobBottom.y + ' L ' + hookPt.x + ',' + hookPt.y);
    if (hookMarkEl) hookMarkEl.setAttribute('transform', 'translate(' + hookPt.x + ',' + hookPt.y + ')');
  }
  function showLineSvg() { if (lineSvgEl) lineSvgEl.classList.add('show'); }
  function hideLineSvg() { if (lineSvgEl) lineSvgEl.classList.remove('show'); }

  // ═══ 気分レイヤー (状態別フラッシュ/tint。ネガ演出は短く戻す) ═══
  function moodFlash(name, durationMs) {
    if (!moodLayerEl) return;
    var cls = 'mood-flash-' + name;
    moodLayerEl.classList.remove(cls);
    void moodLayerEl.offsetWidth;
    moodLayerEl.classList.add(cls);
    setTimeout(function () { moodLayerEl.classList.remove(cls); }, durationMs || 400);
  }
  function moodSetAmbient(name) {
    if (!moodLayerEl) return;
    moodLayerEl.classList.remove('mood-renda');
    if (name === 'renda') moodLayerEl.classList.add('mood-renda');
  }

  function shakeStage() {
    if (!stageEl || prefersReducedMotion()) return;
    stageEl.classList.remove('shake');
    void stageEl.offsetWidth;
    stageEl.classList.add('shake');
  }

  // ═══ 飛び文字 / 星パーティクル (#fxLayer に動的生成、animationendで必ずremove) ═══
  function spawnFxWord(text, leftPct, topPct, variant) {
    if (!fxLayerEl) return;
    var el = document.createElement('div');
    el.className = 'fx-word' + (variant ? ' ' + variant : '');
    el.textContent = text;
    el.style.left = leftPct + '%';
    el.style.top = topPct + '%';
    el.addEventListener('animationend', function () { el.remove(); });
    fxLayerEl.appendChild(el);
  }
  // ═══ れんだ中の飛び文字スポーン位置 (レビュー指摘対応:
  //     #rendaWrap (見出し「ひっぱれ!!」+ コンボ数 + ゲージ、top 32%〜約72%の帯)
  //     に飛び文字が重なって読めなくなる問題を修正。タップ座標をそのまま使わず、
  //     帯より確実に下の安全ゾーンへ逃がす。あわせて styles.css 側の
  //     .fx-word-renda (flyWordUpBurst) で浮上距離自体も短く抑え、
  //     浮上中に帯へ再突入しないようにしている(2つの対策はセットで機能する)。
  //     x はタップ位置を活かしつつ画面端に寄りすぎないようクランプする。 ═══
  var RENDA_FX_SAFE_TOP_MIN = 74;
  var RENDA_FX_SAFE_TOP_RANGE = 16; // 74%〜90%
  function rendaFxSpawnPos(tapPos) {
    var left = tapPos ? tapPos.left : 50;
    left = Math.max(14, Math.min(86, left));
    var top = RENDA_FX_SAFE_TOP_MIN + Math.random() * RENDA_FX_SAFE_TOP_RANGE;
    return { left: left, top: top };
  }
  function spawnStars(leftPct, topPct, count) {
    if (!fxLayerEl || prefersReducedMotion()) return;
    for (var i = 0; i < count; i++) {
      var el = document.createElement('span');
      el.className = 'fx-star';
      el.textContent = '⭐';
      el.style.left = leftPct + '%';
      el.style.top = topPct + '%';
      var angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      var dist = 24 + Math.random() * 18;
      el.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      el.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      el.addEventListener('animationend', function () { el.remove(); });
      fxLayerEl.appendChild(el);
    }
  }

  // ═══ キャストスポット (波紋) ═══
  function showCastSpots() {
    var spots = Array.prototype.slice.call(castSpotEls);
    // 「2〜3個」の企画書指定を満たすため、たまに1個だけ非表示にして変化を作る。
    var hideOne = spots.length > 2 && Math.random() < 0.4;
    var hideIdx = hideOne ? Math.floor(Math.random() * spots.length) : -1;
    for (var i = 0; i < spots.length; i++) {
      spots[i].classList.toggle('is-active', i !== hideIdx);
    }
  }
  function hideCastSpots() {
    for (var i = 0; i < castSpotEls.length; i++) castSpotEls[i].classList.remove('is-active');
  }

  // ═══ ウキ ═══
  function positionAt(el, pos) {
    el.style.left = pos.left + '%';
    el.style.top = pos.top + '%';
  }
  function hideBobber() {
    bobberEl.classList.remove('show', 'is-idle-float', 'is-twitch', 'is-bite-sink', 'is-escape-pop');
    bobberEl.style.opacity = '';
  }
  function showSplash(pos) {
    positionAt(splashRingEl, pos);
    splashRingEl.classList.remove('show');
    void splashRingEl.offsetWidth;
    splashRingEl.classList.add('show');
  }
  function showSplashChurn(pos) {
    if (!splashChurnEl) return;
    positionAt(splashChurnEl, pos);
    splashChurnEl.classList.add('show');
  }
  function hideSplashChurn() {
    if (splashChurnEl) splashChurnEl.classList.remove('show');
  }

  // ═══ 本命魚影 (フィードバック1: 待ち中に画面端から針へ接近してくる) ═══
  function setupTargetShadow(species) {
    if (!shadowTargetEl) return;
    var widthPct = (species && SIZE_WIDTH_PCT[species.size]) || 8;
    var isRound = !!(species && species.id === 'treasure_boot');
    shadowTargetEl.style.width = (isRound ? Math.min(widthPct, 6) : widthPct) + '%';
    shadowTargetEl.classList.toggle('is-round', isRound);
    shadowTargetEl.classList.remove('is-eyeing', 'is-thrash', 'is-fleeing', 'face-left');
    shadowTargetEl.style.left = '105%';
    shadowTargetEl.style.top = '48%';
    shadowTargetEl.classList.add('show');
  }
  function hideTargetShadow() {
    if (!shadowTargetEl) return;
    shadowTargetEl.classList.remove('show', 'is-eyeing', 'is-thrash', 'is-fleeing', 'face-left');
  }
  function updateTargetShadowApproach(progress) {
    if (!shadowTargetEl) return;
    var p = Math.max(0, Math.min(1, progress));
    var x = 105 + (lastCastSpotPos.left + 2 - 105) * p;
    var y = 48 + (40 - 48) * p;
    shadowTargetEl.style.left = x + '%';
    shadowTargetEl.style.top = y + '%';
    shadowTargetEl.classList.toggle('face-left', true); // 左(針)へ向かって泳ぐので反転表示
  }

  // ═══ フェーズ導入 UI (tick 由来 / タップ由来 の両方から共有呼び出しする) ═══
  function enterBiteUI() {
    biteWindowStartSec = session.biteWindowRemainingSec > 0 ? session.biteWindowRemainingSec : 1;
    if (biteRingEl) biteRingEl.style.setProperty('--frac', '1');
    if (biteMarkEl) {
      positionAt(biteMarkEl, { left: lastCastSpotPos.left, top: 24 });
      biteMarkEl.classList.remove('show');
      void biteMarkEl.offsetWidth;
      biteMarkEl.classList.add('show');
    }
    bobberEl.classList.remove('is-idle-float', 'is-twitch');
    bobberEl.classList.add('show', 'is-bite-sink');
    showSplash(lastCastSpotPos);
    if (shadowTargetEl) {
      shadowTargetEl.classList.remove('is-eyeing');
      shadowTargetEl.style.left = (lastCastSpotPos.left + 2) + '%';
      shadowTargetEl.style.top = '40%';
    }
    if (stageEl) stageEl.classList.add('edge-glow');
    moodFlash('gold', 300);
    if (window.Haptics) window.Haptics.fire('fishingBite');
    setPhaseWord('いまだ！タップ！', 'pw-bite');
    setNarration('いまだ！ タップ！');
  }

  function updateRendaCombo() {
    if (!rendaComboNumEl || !rendaComboEl) return;
    rendaComboNumEl.textContent = String(rendaComboCount);
    rendaComboEl.classList.remove('pop');
    void rendaComboEl.offsetWidth;
    rendaComboEl.classList.add('pop');
  }
  function updateRendaGaugeTier(pct) {
    if (!rendaFillEl) return;
    rendaFillEl.classList.remove('tier-mid', 'tier-hot');
    if (pct >= 80) rendaFillEl.classList.add('tier-hot');
    else if (pct >= 50) rendaFillEl.classList.add('tier-mid');
  }

  function enterRendaUI() {
    if (biteMarkEl) biteMarkEl.classList.remove('show');
    if (stageEl) stageEl.classList.remove('edge-glow');
    bobberEl.classList.remove('show', 'is-bite-sink', 'is-twitch', 'is-idle-float');
    showSplashChurn(lastCastSpotPos);
    if (shadowTargetEl) {
      shadowTargetEl.style.left = (lastCastSpotPos.left + 2) + '%';
      shadowTargetEl.style.top = '40%';
      shadowTargetEl.classList.add('is-thrash');
    }
    rendaComboCount = 0;
    updateRendaCombo();
    if (rendaBigTextEl) rendaBigTextEl.textContent = 'ひっぱれ！！';
    var pct = Math.max(0, Math.min(100, session.gaugePct));
    rendaFillEl.style.width = pct + '%';
    updateRendaGaugeTier(pct);
    rendaWrapEl.classList.add('show');
    moodSetAmbient('renda');
    setPhaseWord('', 'pw-hidden');
    setNarration('ぽんぽん タップで ひっぱろう！');
  }

  function enterEscapedUI() {
    if (biteMarkEl) biteMarkEl.classList.remove('show');
    rendaWrapEl.classList.remove('show');
    hideSplashChurn();
    moodSetAmbient('none');
    if (stageEl) stageEl.classList.remove('edge-glow');
    // 「魚が居たのに逃げた」ことを見せる: 画面外へ高速で泳ぎ去る
    if (shadowTargetEl && shadowTargetEl.classList.contains('show')) {
      shadowTargetEl.classList.remove('is-eyeing', 'is-thrash');
      shadowTargetEl.classList.add('is-fleeing');
      var curLeft = parseFloat(shadowTargetEl.style.left) || lastCastSpotPos.left;
      var curTop = parseFloat(shadowTargetEl.style.top) || 44;
      tweenPosition(shadowTargetEl, { left: curLeft, top: curTop }, { left: 112, top: curTop - 6 }, 600, {
        onDone: function () { hideTargetShadow(); }
      });
    } else {
      hideTargetShadow();
    }
    // ウキが「ぽかっ」と浮上して消える
    bobberEl.classList.remove('is-bite-sink');
    bobberEl.classList.add('is-escape-pop');
    setTimeout(hideBobber, 820);
    hideLineSvg();
    moodFlash('bluegray', 400);
    setPhaseWord('にげちゃった…', 'pw-escaped');
    setNarration('およいで いっちゃった。でも また くるよ');
    showOverlay(escapeOverlayEl);
    scheduleAutoReadyToCast(1600);
  }

  function onFishLanded(helped) {
    rendaWrapEl.classList.remove('show');
    if (biteMarkEl) biteMarkEl.classList.remove('show');
    moodSetAmbient('none');
    hideSplashChurn();
    hideBobber();
    hideLineSvg();
    hideTargetShadow();

    var species = Logic.getSpeciesById(session.speciesId);
    if (!species) { scheduleAutoReadyToCast(400); return; } // 防御的 (未知 speciesId)

    if (window.incrementStat) {
      try { window.incrementStat('tsuri_kawa_catches', 1); } catch (e) {}
    }

    var icon = SPECIES_ICON[species.id] || (species.edible ? '🐟' : '🎁');
    setPhaseWord('つれた！', 'pw-landed');

    // 魚ジャンプ演出: 水しぶき点 → 画面中央へ放物線
    if (fxLayerEl) {
      var jumpEl = document.createElement('div');
      jumpEl.className = 'fx-fish-jump wobble';
      jumpEl.textContent = icon;
      var from = { left: lastCastSpotPos.left, top: 34 };
      var to = { left: 50, top: 38 };
      jumpEl.style.left = from.left + '%';
      jumpEl.style.top = from.top + '%';
      fxLayerEl.appendChild(jumpEl);
      tweenPosition(jumpEl, from, to, 500, {
        arc: 18,
        onDone: function () {
          moodFlash('white', 300);
          spawnStars(50, 38, 6);
          setTimeout(function () { jumpEl.remove(); }, 300);
        }
      });
    }

    if (helped) {
      setNarration('ポノも てつだうよ！');
      showOverlay(helpOverlayEl);
    }

    var event = Logic.buildCatchEvent(species);
    var applied = Logic.applyCatchEvent(save, event);
    save = applied.save;
    persistSave();

    bucketSessionCatches.push(icon);
    renderBucket();

    var grantedAcorns = 0;
    try {
      if (typeof window.addAcornsDaily === 'function') {
        grantedAcorns = window.addAcornsDaily('tsuri-kawa', 1, 8) || 0;
      }
    } catch (e) { grantedAcorns = 0; }
    if (grantedAcorns > 0) {
      save = Logic.recordDailyAcornsGiven(save, grantedAcorns, Logic.todayDateKey());
      persistSave();
    }

    // 魚ジャンプ(0.5s)が先、overlayはその後(+ おたすけ時はさらに待つ)
    var catchDelay = 500 + (helped ? 900 : 0);
    setTimeout(function () {
      catchIconEl.textContent = icon;
      catchNameEl.textContent = species.name;
      if (species.edible) {
        catchLabelEl.textContent = 'つれた！';
        setNarration(species.name + 'が つれた！');
      } else {
        catchLabelEl.textContent = 'たからものを みつけたよ！ ずかんに のせようね';
        setNarration('たからものを みつけたよ！ ずかんに のせようね');
      }
      showOverlay(catchOverlayEl);
    }, catchDelay);

    scheduleAutoReadyToCast(catchDelay + 2000);
  }

  function scheduleAutoReadyToCast(delayMs) {
    if (pendingRestartTimer) clearTimeout(pendingRestartTimer);
    pendingRestartTimer = setTimeout(function () {
      pendingRestartTimer = null;
      if (uiPhase !== 'playing') return;
      clearOverlays();
      setNarration('つぎは どこに なげる？');
      setPhaseWord('どこに なげる？', 'pw-idle');
      showCastSpots();
    }, delayMs);
  }

  // ═══ タップ入力 (iOS pointercancel 対応込みの common/tsuri/input.js を使用) ═══
  function extractClientXY(evt) {
    try {
      if (!evt) return null;
      if (evt.changedTouches && evt.changedTouches[0]) {
        return { x: evt.changedTouches[0].clientX, y: evt.changedTouches[0].clientY };
      }
      if (typeof evt.clientX === 'number') return { x: evt.clientX, y: evt.clientY };
    } catch (e) { /* ベストエフォート */ }
    return null;
  }
  function clientToStagePct(xy) {
    if (!xy || !stageEl) return null;
    try {
      var rect = stageEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      var left = ((xy.x - rect.left) / rect.width) * 100;
      var top = ((xy.y - rect.top) / rect.height) * 100;
      return { left: Math.max(0, Math.min(100, left)), top: Math.max(0, Math.min(100, top)) };
    } catch (e) { return null; }
  }

  function onCastSpotTap(el) {
    if (!session) return;
    if (!(session.phase === 'idle' || Core.isTerminal(session))) return; // 二重発火防止
    if (pendingRestartTimer) { clearTimeout(pendingRestartTimer); pendingRestartTimer = null; }
    var left = parseFloat(el.style.left) || 50;
    var top = parseFloat(el.style.top) || 34;
    lastCastSpotPos = { left: left, top: top };
    hideCastSpots();
    clearOverlays();
    if (anglerEl) {
      anglerEl.classList.remove('is-casting');
      void anglerEl.offsetWidth;
      anglerEl.classList.add('is-casting');
    }
    preBiteShown = false;
    var waitRange = Logic.nextWaitSecRange(session.consecutiveMisses);
    session = Core.cast(session, { waitSecRange: waitRange });
    waitTotalSec = session.waitRemainingSec > 0 ? session.waitRemainingSec : 1;

    var species = Logic.getSpeciesById(session.speciesId);
    setupTargetShadow(species);

    // ウキを竿先から着水点へ放物線で飛ばす(0.45s)
    bobberEl.classList.remove('is-idle-float', 'is-twitch', 'is-bite-sink', 'is-escape-pop');
    bobberEl.style.opacity = '';
    bobberEl.classList.add('show');
    hideLineSvg();
    tweenPosition(bobberEl, { left: 17, top: 10 }, { left: lastCastSpotPos.left, top: lastCastSpotPos.top }, 450, {
      arc: 16,
      onDone: function () {
        bobberEl.classList.add('is-idle-float');
        showSplash(lastCastSpotPos);
        updateLineSvg(lastCastSpotPos.left);
        showLineSvg();
      }
    });
    setPhaseWord('まとう…', 'pw-wait');
    setNarration('ウキを みててね');
  }

  function onBiteTap() {
    if (!session || session.phase !== 'bite') return;
    session = Core.tapHook(session);
    if (session.phase === 'renda') enterRendaUI();
  }

  function onRendaTap(evt) {
    if (!session || session.phase !== 'renda') return;
    var species = Logic.getSpeciesById(session.speciesId);
    session = Core.tapRenda(session, species, Core.GEAR_MODS_NEUTRAL);
    if (session.phase === 'renda') {
      var pct = Math.max(0, Math.min(100, session.gaugePct));
      rendaFillEl.style.width = pct + '%';
      updateRendaGaugeTier(pct);
      rendaComboCount++;
      updateRendaCombo();

      var tapPos = clientToStagePct(extractClientXY(evt));
      var pos = rendaFxSpawnPos(tapPos);
      var big = (rendaComboCount % 5 === 0);
      var word = big ? 'すごい！' : FLY_WORDS[rendaFlyIdx % FLY_WORDS.length];
      if (!big) rendaFlyIdx++;
      spawnFxWord(word, pos.left, pos.top, big ? 'fx-word-big fx-word-renda' : 'fx-word-renda');
      spawnStars(pos.left, pos.top, 2);
      shakeStage();
      if (anglerEl) {
        anglerEl.classList.remove('is-rod-bend');
        void anglerEl.offsetWidth;
        anglerEl.classList.add('is-rod-bend');
      }

      if (rendaBigTextEl) {
        var stuckAtFloor = session.floorHeldSec >= 2 && session.gaugePct <= (Core.TUNING.gaugeFloorPct + 0.5);
        rendaBigTextEl.textContent = stuckAtFloor ? 'タップ タップ！' : 'ひっぱれ！！';
      }
    } else if (session.phase === 'landed') {
      onFishLanded(false);
    }
  }

  // キャストスポットは個別に attachTap (自分の領域内のタップのみ反応)。
  // evt.stopPropagation() で #playScreen 側の共有タップリスナーへのバブリングを止める
  // (止めないと、キャストのタップが共有リスナーの合成click二重発火ガード
  // (TAP_DEDUPE_WINDOW_MS=500ms) を消費してしまい、直後の「いまだ!」フッキングタップが
  // 500ms 以内だと無反応になる事故になる)。
  for (var _si = 0; _si < castSpotEls.length; _si++) {
    (function (el) {
      Input.attachTap(el, function (evt) {
        if (evt && typeof evt.stopPropagation === 'function') evt.stopPropagation();
        onCastSpotTap(el);
      });
    })(castSpotEls[_si]);
  }
  // あたり/連打は「画面のどこでもタップ」(企画書§2.3準拠) なので play 画面全体に1つ。
  // idle/wait/landed/escaped 中は no-op (キャストスポット側の attachTap が別枠で処理)。
  Input.attachTap(playScreenEl, function (evt) {
    if (!session) return;
    if (session.phase === 'bite') onBiteTap();
    else if (session.phase === 'renda') onRendaTap(evt);
    else if (session.phase === 'wait') {
      // 早すぎタップ: no-op (契約通り) だが「まだまだ〜」の吹き出しだけ見せる
      var pos = clientToStagePct(extractClientXY(evt));
      if (pos) spawnFxWord('まだまだ〜', pos.left, pos.top, 'fx-word-soft');
    }
  });

  // ═══ ゲームフロー: title → playing (継続ループ、5匹区切り等はPhase1以降) ═══
  function startGame() {
    session = Core.createSession({ speciesPool: SPECIES_POOL, mode: 'relaxed' });
    bucketSessionCatches = [];
    renderBucket();
    preBiteShown = false;
    biteWindowStartSec = 0;
    rendaComboCount = 0;
    clearOverlays();
    hideBobber();
    hideLineSvg();
    hideTargetShadow();
    moodSetAmbient('none');
    showScreen('playScreen');
    setNarration('すきな ばしょに なげてみよう！');
    setPhaseWord('どこに なげる？', 'pw-idle');
    showCastSpots();
    uiPhase = 'playing';
  }

  function startMenuOnce() {
    if (window._menuInited || typeof window.initMenu !== 'function') return;
    window.initMenu({});
    window._menuInited = true;
  }

  var startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      startMenuOnce();
      startGame();
    });
  }

  // ═══ debug: Playwright / 手動検証用フック (staging/localhost + manage 解錠済みのみ) ═══
  if (window.PonoDebugMode && typeof window.PonoDebugMode.isAllowed === 'function' && window.PonoDebugMode.isAllowed()) {
    window.__tsuriKawaDebugGetPhase = function () { return session ? session.phase : null; };
    window.__tsuriKawaDebugSkipWait = function () {
      if (session && session.phase === 'wait') session.waitRemainingSec = 0;
    };
    window.__tsuriKawaDebugFillGauge = function (pct) {
      if (session && session.phase === 'renda') session.gaugePct = (typeof pct === 'number') ? pct : 99;
    };
    window.__tsuriKawaDebugStart = function () { if (uiPhase !== 'playing') startGame(); };
  }

  // ═══ メインループ ═══
  var lastTs = null;
  function loop(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = (ts - lastTs) / 1000;
    if (dt > 0.05) dt = 0.05; // タブ切替復帰時などの大ジャンプを吸収
    lastTs = ts;

    if (uiPhase === 'playing' && session) {
      var prevPhase = session.phase;
      session = Core.tick(session, dt, Core.GEAR_MODS_NEUTRAL);

      if (session.phase !== prevPhase) {
        if (session.phase === 'bite') {
          enterBiteUI();
        } else if (session.phase === 'renda') {
          // wait→renda (3連続逃し後の自動フッキング) も bite→renda 相当の見た目にする。
          enterRendaUI();
        } else if (session.phase === 'escaped') {
          enterEscapedUI();
        } else if (session.phase === 'landed') {
          // tick() 経由で renda→landed になるのは「おたすけ」自動キャッチの時だけ
          // (通常のタップ完走は onRendaTap 内で直接 landed に遷移し、ここは通らない)。
          onFishLanded(true);
        }
      } else if (session.phase === 'wait') {
        if (waitTotalSec > 0) {
          var progress = 1 - Math.max(0, session.waitRemainingSec) / waitTotalSec;
          updateTargetShadowApproach(progress);
        }
        var near = session.waitRemainingSec <= 1.0 && session.waitRemainingSec > 0;
        if (near && !preBiteShown) {
          preBiteShown = true;
          bobberEl.classList.remove('is-idle-float');
          bobberEl.classList.add('is-twitch');
          if (shadowTargetEl) shadowTargetEl.classList.add('is-eyeing');
          setPhaseWord('…きたかも！', 'pw-prebite');
          setNarration('…きたかも？');
        }
      } else if (session.phase === 'bite' && biteWindowStartSec > 0) {
        var frac = Math.max(0, Math.min(1, session.biteWindowRemainingSec / biteWindowStartSec));
        if (biteRingEl) biteRingEl.style.setProperty('--frac', String(frac));
      } else if (session.phase === 'renda') {
        var pct2 = Math.max(0, Math.min(100, session.gaugePct));
        rendaFillEl.style.width = pct2 + '%';
        updateRendaGaugeTier(pct2);
        if (rendaBigTextEl) {
          var stuck = session.floorHeldSec >= 2 && session.gaugePct <= (Core.TUNING.gaugeFloorPct + 0.5);
          rendaBigTextEl.textContent = stuck ? 'タップ タップ！' : rendaBigTextEl.textContent;
        }
      }
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  }

  // ═══ ブート判定: 依存モジュール全て揃っていれば即起動、
  //     いずれか欠けていればキャッシュバイパスで1回だけ再試行 ═══
  var REQUIRED_DEPS = [
    { name: 'PonoFishData', src: '../common/tsuri/fish-data.js' },
    { name: 'PonoTsuriCore', src: '../common/tsuri/core.js' },
    { name: 'PonoTsuriInput', src: '../common/tsuri/input.js' },
    { name: 'TsuriKawaLogic', src: 'js/logic.js' }
  ];
  function missingDeps() {
    var out = [];
    for (var i = 0; i < REQUIRED_DEPS.length; i++) {
      if (!window[REQUIRED_DEPS[i].name]) out.push(REQUIRED_DEPS[i]);
    }
    return out;
  }
  function retryLoad(dep, cb) {
    var s = document.createElement('script');
    s.src = dep.src + (dep.src.indexOf('?') === -1 ? '?' : '&') + 'retry=' + Date.now();
    s.onload = function () { cb(true); };
    s.onerror = function () { cb(false); };
    document.body.appendChild(s);
  }

  var missing = missingDeps();
  if (missing.length === 0) {
    boot();
  } else {
    console.error('[tsuri-kawa] 依存モジュール未読込を検知、キャッシュバイパスで再試行します:', missing.map(function (d) { return d.name; }));
    var remaining = missing.length;
    var anyFailed = false;
    missing.forEach(function (dep) {
      retryLoad(dep, function (ok) {
        if (!ok) anyFailed = true;
        remaining--;
        if (remaining === 0) {
          if (!anyFailed && missingDeps().length === 0) { boot(); } else { showLoadError(); }
        }
      });
    });
  }
})();
