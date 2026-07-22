// ── hyokkori-hightouch/js/game.js ──
// ひょっこりハイタッチ: DOM/描画/入力・ゲームループ (DOM 依存)。
// 純粋ロジック (加点/タイマー/出現カーブ/スパム対策) は js/logic.js の
// window.HyokkoriLogic を参照する。
'use strict';

(function () {

  // ═══ 読み込み失敗フォールバック ═══
  // logic.js のロード失敗時、game.js 全初期化が無言スキップされ
  // 「タイトルは見えるがタップ無反応」になる事故 (guragura-seesaw 2026-07-22 報告。
  // 同型の脆弱ガードが本ゲームにも存在したため同じ修正パターンを移植)。
  function showLoadError() {
    if (document.getElementById('loadErrorScreen')) return;
    var ov = document.createElement('div');
    ov.id = 'loadErrorScreen';
    ov.setAttribute('role', 'alert');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;background:rgba(39,75,61,0.96);color:#fff;font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN",sans-serif;text-align:center';
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
    // FOUC ガードで #stage が visibility:hidden のままでもオーバーレイは body 直下なので見える。
    // ただし pono-game-ready が未付与だと背景だけ #274b3d になるため付与しておく。
    document.body.classList.add('pono-game-ready');
  }

  // boot() 本体 (bootInner) を try/catch で包む防御。 logic.js 読込に成功していても
  // 起動処理の途中 (向き判定 API 例外など、予見しきれない実行時エラー全般) で
  // 例外が飛ぶと、以降の穴生成・start-btn バインド等が丸ごとスキップされ
  // 「見た目は正常だがタップ無反応」という一番気づきにくい壊れ方になる。
  // ここで一段防御することで、想定外の例外でも必ず再読込UIへ縮退させる。
  function boot() {
    try {
      bootInner();
    } catch (e) {
      console.error('[hyokkori-hightouch] boot() 内で予期しない例外が発生しました。再読込UIを表示します:', e);
      showLoadError();
    }
  }

  function bootInner() {
  var L = window.HyokkoriLogic;

  // ═══ DOM 参照 ═══
  var stageEl = document.getElementById('stage');
  var boardEl = document.getElementById('board');
  var fxCanvas = document.getElementById('fx-canvas');
  var fxCtx = fxCanvas.getContext('2d');

  // GPT Image 2 でこのゲーム専用に描いた8種。awake/sleeping は同じ正方形
  // キャンバスを共有し、状態が切り替わっても大きさや足元が跳ねない。
  var ASSET_BASE = '../assets/images/hyokkori-hightouch/';
  var PARTNERS = [
    { id: 'araiguma', awake: ASSET_BASE + 'friend_araiguma_awake.png', sleeping: ASSET_BASE + 'friend_araiguma_sleeping.png' },
    { id: 'fukurou', awake: ASSET_BASE + 'friend_fukurou_awake.png', sleeping: ASSET_BASE + 'friend_fukurou_sleeping.png' },
    { id: 'harinezumi', awake: ASSET_BASE + 'friend_harinezumi_awake.png', sleeping: ASSET_BASE + 'friend_harinezumi_sleeping.png' },
    { id: 'karasu', awake: ASSET_BASE + 'friend_karasu_awake.png', sleeping: ASSET_BASE + 'friend_karasu_sleeping.png' },
    { id: 'kitsune', awake: ASSET_BASE + 'friend_kitsune_awake.png', sleeping: ASSET_BASE + 'friend_kitsune_sleeping.png' },
    { id: 'kojika', awake: ASSET_BASE + 'friend_kojika_awake.png', sleeping: ASSET_BASE + 'friend_kojika_sleeping.png' },
    { id: 'risu', awake: ASSET_BASE + 'friend_risu_awake.png', sleeping: ASSET_BASE + 'friend_risu_sleeping.png' },
    { id: 'usagi', awake: ASSET_BASE + 'friend_usagi_awake.png', sleeping: ASSET_BASE + 'friend_usagi_sleeping.png' }
  ];
  var HIDEOUT_IMAGES = [
    ASSET_BASE + 'hideout_stump.png',
    ASSET_BASE + 'hideout_leaf_bush.png',
    ASSET_BASE + 'hideout_tree_roots.png',
    ASSET_BASE + 'hideout_tree_roots.png',
    ASSET_BASE + 'hideout_stump.png',
    ASSET_BASE + 'hideout_leaf_bush.png'
  ];
  var FLOWER_IMAGES = [
    ASSET_BASE + 'flowerbed_stage_0_soil.png',
    ASSET_BASE + 'flowerbed_stage_1_sprout.png',
    ASSET_BASE + 'flowerbed_stage_2_buds.png',
    ASSET_BASE + 'flowerbed_stage_3_bloom.png'
  ];
  var FX_IMAGES = [
    ASSET_BASE + 'fx_highfive_burst.png',
    ASSET_BASE + 'fx_leaf_puff.png',
    ASSET_BASE + 'fx_overheat_swirl.png',
    ASSET_BASE + 'fx_sleep_moon_cloud.png',
    ASSET_BASE + 'mechanic_light_seed.png',
    ASSET_BASE + 'pono_title_highfive.png',
    ASSET_BASE + 'pono_result_bloom.png'
  ];

  // common/preload-helper.js は担当外なので、このゲーム自身の idle 時間で専用画像を温める。
  // 背景・開始ポノ・花壇0・たねはHTML/CSSから先に読み込まれ、ここでは残りを補完する。
  var preloadRefs = [];
  function preloadGameAssetsLocally() {
    var urls = HIDEOUT_IMAGES.concat(FLOWER_IMAGES, FX_IMAGES);
    for (var i = 0; i < PARTNERS.length; i++) urls.push(PARTNERS[i].awake, PARTNERS[i].sleeping);
    var run = function () {
      for (var j = 0; j < urls.length; j++) {
        var img = new Image();
        img.decoding = 'async';
        img.src = urls[j];
        preloadRefs.push(img);
      }
    };
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 1000 });
    else setTimeout(run, 120);
  }

  // classList を一旦外して reflow を挟んでから付け直し、CSS アニメを毎回再発火させる。
  // ms を渡すとそのミリ秒後に自動で外す (一過性エフェクト用)。
  function retriggerClass(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    if (typeof ms === 'number') setTimeout(function () { el.classList.remove(cls); }, ms);
  }

  function resizeFx() {
    var rect = stageEl.getBoundingClientRect();
    fxCanvas.width = Math.max(1, Math.round(rect.width));
    fxCanvas.height = Math.max(1, Math.round(rect.height));
  }
  resizeFx();
  window.addEventListener('resize', resizeFx);

  // ═══ 横画面強制 notice ═══
  // 判定は物理画面の向き (screen.orientation) を優先。 viewport 実寸 (innerWidth/Height) は
  // URLバー展開アニメや回転中の中間 resize で一瞬逆転して誤表示するため最終フォールバックのみ。
  // さらに「表示」は 300ms 後の再判定一致を要求 (非対称ヒステリシス)、「非表示」は即時。
  // (2026-07-23 横画面誤検知+スタート無反応バグ対応。 このゲーム独自に実装した対策であり、
  // guragura-seesaw 側には同種の hysteresis/screen.orientation 対応は未移植 — 別途フォローアップ要)
  //
  // fail-open 設計: screen.orientation / matchMedia へのアクセスは環境によっては例外を
  // 投げうる (ブラウザ拡張機能によるオーバーライド、一部 WebView 実装など)。 ここで例外を
  // 握りつぶさずに boot() まで伝播させると穴生成や start-btn バインドごと丸ごと止まる
  // (このゲームで実際に検証済みの致命的レグレッション)。 判定不能時は「notice を出さない」
  // (= ゲームを止めない) 側に倒す。
  var LANDSCAPE_NOTICE_CONFIRM_MS = 300;
  var landscapeNoticeTimer = null;
  var landscapeNoticeBlocking = false;

  function computeIsPortrait() {
    try {
      var so = window.screen && window.screen.orientation;
      if (so && typeof so.type === 'string' && so.type.indexOf('portrait') === 0) return true;
      if (so && typeof so.type === 'string' && so.type.indexOf('landscape') === 0) return false;
      if (typeof window.matchMedia === 'function') {
        var mq = window.matchMedia('(orientation: portrait)');
        if (mq && typeof mq.matches === 'boolean') return mq.matches;
      }
      // screen.orientation も matchMedia も判定材料を返さなかった (=判定不能)。
      // 旧実装はここで innerHeight>=innerWidth の素朴比較にフォールバックしていたが、
      // それはこの修正が置き換えたかった誤検知の温床そのものなので使わない。
      // fail-open (= notice を出さない) にする。
      return false;
    } catch (e) {
      return false; // 例外時も fail-open。
    }
  }

  function isCoarsePointer() {
    try {
      return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    } catch (e) {
      return false; // 判定不能時は fail-open (notice を出さない)。
    }
  }

  function applyLandscapeNotice(show) {
    var notice = document.getElementById('landscape-notice');
    if (!notice) return;
    landscapeNoticeBlocking = !!show;
    notice.style.display = show ? 'flex' : 'none';
    notice.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function updateLandscapeNotice() {
    var notice = document.getElementById('landscape-notice');
    if (!notice) return;
    var isTouch = isCoarsePointer();
    var wantShow = computeIsPortrait() && isTouch;
    if (!wantShow) {
      // 非表示は即時 (誤表示でゲームがブロックされるのを最優先で防ぐ)
      if (landscapeNoticeTimer) { clearTimeout(landscapeNoticeTimer); landscapeNoticeTimer = null; }
      applyLandscapeNotice(false);
      return;
    }
    if (notice.style.display === 'flex') return; // 表示済み
    if (landscapeNoticeTimer) return;            // 確認待ち中
    landscapeNoticeTimer = setTimeout(function () {
      landscapeNoticeTimer = null;
      if (computeIsPortrait() && isCoarsePointer()) {
        applyLandscapeNotice(true);
      }
    }, LANDSCAPE_NOTICE_CONFIRM_MS);
  }
  updateLandscapeNotice();
  window.addEventListener('orientationchange', function () {
    setTimeout(updateLandscapeNotice, 100);
    setTimeout(updateLandscapeNotice, 500);
  });
  window.addEventListener('resize', updateLandscapeNotice);
  // ここも window.screen.orientation への直接アクセスなので、他の参照箇所 (computeIsPortrait /
  // isCoarsePointer) と同じ理由で try/catch する。 リスナー登録に失敗しても resize /
  // orientationchange のフォールバックで notice 更新は続くので、握りつぶして問題ない。
  try {
    if (window.screen && window.screen.orientation && typeof window.screen.orientation.addEventListener === 'function') {
      window.screen.orientation.addEventListener('change', updateLandscapeNotice);
    }
  } catch (e) { /* fail-open: 登録できなくても致命的ではない */ }

  // ═══ 隠れ場所 (穴) を <template id="hh-hole-tpl"> から HOLE_COUNT 個複製生成 ═══
  // (6箇所とも同一マークアップなので index.html 側の手書き複製を避ける)
  function buildHoles() {
    var tpl = document.getElementById('hh-hole-tpl');
    if (!tpl) return; // テンプレート未読込なら何もしない (querySelectorAll側が空配列で安全に扱う)
    for (var i = 0; i < L.HOLE_COUNT; i++) {
      var node = tpl.content.firstElementChild.cloneNode(true);
      node.setAttribute('data-hole', i);
      var hideout = node.querySelector('.hh-hideout');
      if (hideout) hideout.src = HIDEOUT_IMAGES[i % HIDEOUT_IMAGES.length];
      boardEl.appendChild(node);
    }
  }
  buildHoles();

  // ═══ 隠れ場所 (穴) の DOM 参照テーブル ═══
  var holeRefs = [];
  var holeEls = boardEl.querySelectorAll('.hh-hole');
  for (var hi = 0; hi < holeEls.length; hi++) {
    var holeEl = holeEls[hi];
    holeRefs.push({
      idx: parseInt(holeEl.getAttribute('data-hole'), 10),
      hole: holeEl,
      windowEl: holeEl.querySelector('.hh-window'),
      wrap: holeEl.querySelector('.hh-char-wrap'),
      img: holeEl.querySelector('.hh-char'),
      sleepFx: holeEl.querySelector('.hh-sleep-fx'),
      hitFx: holeEl.querySelector('.hh-hit-fx'),
      dust: holeEl.querySelector('.hh-dust')
    });
  }

  // ═══ ひかりのたねリレー表示 ═══
  var relayProgressEl = document.getElementById('relay-progress');
  var flowerbedEl = document.getElementById('flowerbed-img');
  var lightSeedEl = document.getElementById('light-seed');
  var relayAnnouncementEl = document.getElementById('relay-announcement');
  var relayPipEls = document.querySelectorAll('#relay-pips .relay-pip');
  var reducedMotionQuery = null;
  try { reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) {}

  function prefersReducedMotion() {
    return !!(reducedMotionQuery && reducedMotionQuery.matches);
  }

  // ═══ ゲーム状態 ═══
  var state = L.createInitialState();
  var phase = 'idle'; // idle -> countdown -> playing -> settling -> result
  var holes = []; // index合わせ: holes[i].occupant = { kind, showUntil } | null
  var recentKinds = []; // pickSpawnKind の3連続sleeping禁止用
  var spawnTimerMs = 0;
  var settleTimer = 0;
  var boardLockedUntil = 0; // OVERHEAT 演出用 (state.time 基準)
  var seedHolderHole = null; // null は花壇、数値は最後に成功した隠れ場所。
  var lastPartnerId = null;
  var tutorialOpen = false;
  var highScoreTimer = 0;
  var relayAnnouncementTimer = 0;

  function resetGameState() {
    state = L.createInitialState();
    holes = [];
    for (var i = 0; i < holeRefs.length; i++) {
      holes.push({ occupant: null });
      resetHoleVisual(i);
    }
    recentKinds = [];
    spawnTimerMs = 0;
    settleTimer = 0;
    boardLockedUntil = 0;
    lastPartnerId = null;
    lastTickSecond = -1;
    tutorialOpen = false;
    if (highScoreTimer) { clearTimeout(highScoreTimer); highScoreTimer = 0; }
    if (relayAnnouncementTimer) { clearTimeout(relayAnnouncementTimer); relayAnnouncementTimer = 0; }
    confetti = [];
    resetRelayVisual();
  }

  function resetHoleVisual(idx) {
    var refs = holeRefs[idx];
    if (!refs) return;
    refs.wrap.classList.remove('is-visible', 'is-sleeping', 'is-hit', 'is-wobble');
    refs.hole.classList.remove('is-locked');
    refs.hole.setAttribute('aria-label', 'おともだちが でてくる ばしょ');
  }

  // ═══ 出現・退場 ═══
  function occupiedHoleIndices() {
    var arr = [];
    for (var i = 0; i < holes.length; i++) {
      if (holes[i].occupant) arr.push(i);
    }
    return arr;
  }

  function occupiedPartnerIds() {
    var ids = [];
    for (var i = 0; i < holes.length; i++) {
      var occ = holes[i].occupant;
      if (occ && occ.partnerId) ids.push(occ.partnerId);
    }
    return ids;
  }

  function pickPartner() {
    var occupiedIds = occupiedPartnerIds();
    var excluded = occupiedIds.slice();
    if (lastPartnerId) excluded.push(lastPartnerId);
    var choices = PARTNERS.filter(function (partner) { return excluded.indexOf(partner.id) < 0; });
    if (choices.length === 0) choices = PARTNERS.filter(function (partner) { return occupiedIds.indexOf(partner.id) < 0; });
    if (choices.length === 0) choices = PARTNERS;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function trySpawn() {
    var occupied = occupiedHoleIndices();
    if (occupied.length >= 2) return; // 同時出現は最大2体まで
    var forbidden = occupied.slice();
    // 最後にたねを受け取った場所を外し、「別の場所へつなぐ」選択を作る。
    if (seedHolderHole !== null && forbidden.indexOf(seedHolderHole) < 0) forbidden.push(seedHolderHole);
    var holeIdx = L.pickHole(forbidden, Math.random);
    if (holeIdx === null) return;
    var kind = L.pickSpawnKind(state.elapsed, recentKinds, Math.random);
    recentKinds.push(kind);
    if (recentKinds.length > 6) recentKinds.shift();
    var showTime = L.showTimeAt(state.elapsed);
    var partner = pickPartner();
    lastPartnerId = partner.id;
    holes[holeIdx].occupant = { kind: kind, partnerId: partner.id, showUntil: state.elapsed + showTime };
    renderSpawn(holeIdx, kind, partner);
  }

  function renderSpawn(idx, kind, partner) {
    var refs = holeRefs[idx];
    if (!refs) return;
    refs.visualToken = (refs.visualToken || 0) + 1;
    refs.img.src = partner[kind];
    refs.img.alt = kind === 'awake' ? 'おきている おともだち' : 'ねている おともだち';
    refs.hole.setAttribute('aria-label', kind === 'awake' ? 'ハイタッチする おともだち' : 'ねている おともだち');
    refs.wrap.classList.remove('is-hit', 'is-wobble');
    refs.wrap.classList.toggle('is-sleeping', kind === 'sleeping');
    retriggerClass(refs.wrap, 'is-visible'); // translate アニメを毎回発火させる
  }

  function retractHole(idx) {
    var h = holes[idx];
    if (!h.occupant) return;
    h.occupant = null;
    var refs = holeRefs[idx];
    if (refs) {
      refs.visualToken = (refs.visualToken || 0) + 1;
      refs.wrap.classList.remove('is-visible', 'is-sleeping');
      refs.hole.setAttribute('aria-label', 'おともだちが でてくる ばしょ');
    }
  }

  function celebrateAndRetract(idx) {
    var h = holes[idx];
    var refs = holeRefs[idx];
    if (!h || !h.occupant || !refs) return;
    h.occupant = null;
    var token = refs.visualToken || 0;
    setTimeout(function () {
      if ((refs.visualToken || 0) !== token || holes[idx].occupant) return;
      refs.wrap.classList.remove('is-visible', 'is-sleeping', 'is-hit');
      refs.hole.setAttribute('aria-label', 'おともだちが でてくる ばしょ');
    }, prefersReducedMotion() ? 0 : 300);
  }

  function updateHoleTimeouts() {
    for (var i = 0; i < holes.length; i++) {
      var occ = holes[i].occupant;
      if (!occ) continue;
      if (state.elapsed >= occ.showUntil) {
        var wasAwake = occ.kind === 'awake';
        retractHole(i);
        if (wasAwake) L.missedAwake(state); // 取り逃しは combo リセットのみ。 減点・演出なし。
      }
    }
  }

  // ═══ 紙吹雪 (bubble/index.html の addConfetti 相当を fx-canvas 向けに簡略移植) ═══
  var confetti = [];
  function spawnConfettiBurst(x, y, count) {
    if (prefersReducedMotion()) return;
    var n = count || 16;
    var colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff9f45'];
    for (var i = 0; i < n; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 100 + Math.random() * 220;
      confetti.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 160,
        rot: Math.random() * Math.PI * 2, rotSpd: (Math.random() - 0.5) * 6,
        life: 1, size: 5 + Math.random() * 5, color: colors[i % colors.length]
      });
    }
  }

  function updateAndDrawConfetti(dt) {
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    if (confetti.length === 0) return;
    for (var i = confetti.length - 1; i >= 0; i--) {
      var c = confetti[i];
      c.vy += 340 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.rotSpd * dt;
      c.life -= dt * 0.6;
      if (c.life <= 0 || c.y > fxCanvas.height + 40) { confetti.splice(i, 1); continue; }
      fxCtx.save();
      fxCtx.globalAlpha = Math.max(0, c.life);
      fxCtx.translate(c.x, c.y);
      fxCtx.rotate(c.rot);
      fxCtx.fillStyle = c.color;
      fxCtx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
      fxCtx.restore();
    }
    fxCtx.globalAlpha = 1;
  }

  function holeCenterPoint(idx) {
    var refs = holeRefs[idx];
    var rect = refs.windowEl.getBoundingClientRect();
    var stageRect = stageEl.getBoundingClientRect();
    return { x: rect.left + rect.width / 2 - stageRect.left, y: rect.top + rect.height / 2 - stageRect.top };
  }

  function flowerbedAnchorPoint() {
    var stageRect = stageEl.getBoundingClientRect();
    if (!flowerbedEl) return { x: stageRect.width / 2, y: stageRect.height * 0.18 };
    var rect = flowerbedEl.getBoundingClientRect();
    return {
      x: rect.left + rect.width * 0.5 - stageRect.left,
      y: rect.top + rect.height * 0.46 - stageRect.top
    };
  }

  function partnerPawPoint(idx) {
    var refs = holeRefs[idx];
    if (!refs || !refs.img) return holeCenterPoint(idx);
    var stageRect = stageEl.getBoundingClientRect();
    var rect = refs.img.getBoundingClientRect();
    return {
      x: rect.left + rect.width * 0.70 - stageRect.left,
      y: rect.top + rect.height * 0.38 - stageRect.top
    };
  }

  function setSeedPoint(point, animate) {
    if (!lightSeedEl || !point) return;
    var shouldAnimate = animate && !prefersReducedMotion();
    if (!shouldAnimate) lightSeedEl.style.transition = 'none';
    else lightSeedEl.style.removeProperty('transition');
    lightSeedEl.style.setProperty('--seed-x', Math.round(point.x) + 'px');
    lightSeedEl.style.setProperty('--seed-y', Math.round(point.y) + 'px');
    if (!shouldAnimate) {
      requestAnimationFrame(function () { if (lightSeedEl) lightSeedEl.style.removeProperty('transition'); });
    }
  }

  function positionRelayVisual() {
    if (!lightSeedEl) return;
    var point = seedHolderHole === null ? flowerbedAnchorPoint() : partnerPawPoint(seedHolderHole);
    setSeedPoint(point, false);
  }

  function moveSeedToHole(idx) {
    if (idx === null || !holeRefs[idx]) return;
    setSeedPoint(partnerPawPoint(idx), true);
    seedHolderHole = idx;
    if (lightSeedEl) {
      lightSeedEl.dataset.holder = String(idx);
      retriggerClass(lightSeedEl, 'is-flying', 520);
    }
  }

  function announceRelay(text) {
    if (!relayAnnouncementEl || !text) return;
    if (relayAnnouncementTimer) clearTimeout(relayAnnouncementTimer);
    relayAnnouncementEl.textContent = '';
    void relayAnnouncementEl.offsetWidth;
    relayAnnouncementEl.textContent = text;
    relayAnnouncementTimer = setTimeout(function () {
      relayAnnouncementTimer = 0;
      if (relayAnnouncementEl) relayAnnouncementEl.textContent = '';
    }, 1200);
  }

  function setFlowerStage(stage, announce) {
    var safeStage = Math.max(0, Math.min(FLOWER_IMAGES.length - 1, Number(stage) || 0));
    if (!flowerbedEl) return;
    var previous = Number(flowerbedEl.dataset.stage || 0);
    flowerbedEl.src = FLOWER_IMAGES[safeStage];
    flowerbedEl.dataset.stage = String(safeStage);
    flowerbedEl.alt = safeStage === 0 ? 'これから そだつ はなばたけ' : 'そだっている はなばたけ';
    if (announce && safeStage !== previous) {
      var messages = ['', 'めが でたよ', 'つぼみが できたよ', 'おはなが さいたよ'];
      announceRelay(messages[safeStage]);
      retriggerClass(relayProgressEl, 'is-growing', 700);
    }
  }

  function updateRelayVisual(result) {
    var step = typeof result.relayStep === 'number' ? result.relayStep : state.relayStep;
    var flowerStage = typeof result.flowerStage === 'number' ? result.flowerStage : state.flowerStage;
    for (var i = 0; i < relayPipEls.length; i++) {
      relayPipEls[i].classList.toggle('is-lit', flowerStage >= L.FLOWER_STAGE_MAX || i < step);
    }
    setFlowerStage(flowerStage, !!result.flowerStageChanged);
    if (result.flowerStageChanged && flowerStage === L.FLOWER_STAGE_MAX) {
      var bloom = flowerbedAnchorPoint();
      spawnConfettiBurst(bloom.x, bloom.y, 38);
      playFanfare();
    }
  }

  function resetRelayVisual() {
    seedHolderHole = null;
    if (lightSeedEl) lightSeedEl.dataset.holder = 'flowerbed';
    for (var i = 0; i < relayPipEls.length; i++) relayPipEls[i].classList.remove('is-lit');
    setFlowerStage(0, false);
    if (relayProgressEl) relayProgressEl.classList.remove('is-growing');
    if (relayAnnouncementEl) relayAnnouncementEl.textContent = '';
    requestAnimationFrame(positionRelayVisual);
  }

  window.addEventListener('resize', positionRelayVisual);

  // ═══ 音 (WebAudio 直接合成。 pakupaku-catch と同型の簡易トーン) ═══
  var audioCtx = null;
  function ensureAudio() {
    if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume(); return; }
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) audioCtx = new Ctor();
    } catch (e) {}
  }
  function tone(freq, startOffset, dur, type, gainVal) {
    if (!audioCtx) return;
    try {
      var t0 = audioCtx.currentTime + (startOffset || 0);
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(gainVal || 0.12, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) {}
  }
  function playHitSound() { tone(660, 0, 0.08, 'triangle', 0.11); tone(880, 0.06, 0.1, 'triangle', 0.1); }
  function playSleepSound() { tone(220, 0, 0.16, 'sine', 0.08); }
  function playWhiffSound() { tone(180, 0, 0.08, 'sine', 0.05); }
  function playFanfare() {
    [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, i * 0.11, 0.18, 'triangle', 0.13); });
  }
  function playTick() { tone(880, 0, 0.05, 'square', 0.08); }

  // ═══ HUD ═══
  var hudTimerEl = document.getElementById('hud-timer');
  var hudScoreEl = document.getElementById('hud-score');
  var lastTickSecond = -1;

  function updateHud() {
    var remaining = Math.max(0, Math.ceil(L.GAME_DURATION - state.elapsed));
    if (hudTimerEl) {
      hudTimerEl.textContent = '⏱ ' + remaining;
      hudTimerEl.classList.toggle('hud-low', remaining <= 10);
    }
    if (hudScoreEl) hudScoreEl.textContent = '🖐️ ' + state.score;
    if (remaining <= 5 && remaining >= 1 && remaining !== lastTickSecond && phase === 'playing') {
      lastTickSecond = remaining;
      playTick();
    }
  }

  // ═══ OVERHEAT 演出 (責めない演出) ═══
  var overheatBannerEl = document.getElementById('overheat-banner');
  function triggerOverheatBanner() {
    retriggerClass(overheatBannerEl, 'show', 1500);
  }

  function updateBoardLockVisual() {
    var locked = state.time < boardLockedUntil;
    for (var i = 0; i < holeRefs.length; i++) {
      holeRefs[i].hole.classList.toggle('is-locked', locked);
    }
  }

  // ═══ タップ判定処理 ═══
  function resolveHoleFromPoint(clientX, clientY) {
    var el = document.elementFromPoint(clientX, clientY);
    if (!el || typeof el.closest !== 'function') return null;
    var holeEl = el.closest('.hh-hole');
    if (!holeEl) return null;
    var idx = parseInt(holeEl.getAttribute('data-hole'), 10);
    return isNaN(idx) ? null : idx;
  }

  function handleTapAt(clientX, clientY) {
    if (phase !== 'playing') return;
    var idx = resolveHoleFromPoint(clientX, clientY);
    var target = 'empty';
    if (idx !== null && holes[idx] && holes[idx].occupant) {
      target = holes[idx].occupant.kind;
    }
    var res = L.registerTap(state, state.time, target);
    applyTapResult(res, idx);
    updateHud();
  }

  function applyTapResult(res, idx) {
    switch (res.result) {
      case 'hit': {
        var pt = idx !== null ? holeCenterPoint(idx) : { x: fxCanvas.width / 2, y: fxCanvas.height / 2 };
        var refs = idx !== null ? holeRefs[idx] : null;
        if (refs) retriggerClass(refs.wrap, 'is-hit', 320);
        if (idx !== null) {
          moveSeedToHole(idx);
          celebrateAndRetract(idx);
        }
        updateRelayVisual(res);
        spawnConfettiBurst(pt.x, pt.y, 18);
        if (window.Haptics) window.Haptics.fire('stickerPaste');
        if (window.incrementStat) window.incrementStat('hyokkori_touches', 1);
        playHitSound();
        break;
      }
      case 'sleepPenalty': {
        var refsS = idx !== null ? holeRefs[idx] : null;
        if (refsS) retriggerClass(refsS.wrap, 'is-wobble', 900);
        if (window.Haptics) window.Haptics.fire('gachaTurn3');
        playSleepSound();
        break;
      }
      case 'whiff': {
        if (idx !== null) retriggerClass(holeRefs[idx].dust, 'is-active', 420);
        playWhiffSound();
        break;
      }
      case 'overheat': {
        boardLockedUntil = state.time + L.OVERHEAT_LOCK;
        triggerOverheatBanner();
        if (window.Haptics) window.Haptics.fire('capsuleCrack');
        break;
      }
      case 'locked':
      case 'finished':
      default:
        break;
    }
  }

  // ═══ 入力: iOS pointercancel 対策 (touchstart/touchend/touchcancel を必ず併用) ═══
  // memory: feedback_ios_pointercancel_native_pan — pointerdown/up だけで
  // 「指が接地中」を追跡しない。 タッチ/マウスの二重発火防止は各 pointer リスナーの
  // e.pointerType !== 'mouse' 判定で行う。
  stageEl.addEventListener('touchstart', function (e) {
    var t = e.changedTouches[0];
    if (!t) return;
    ensureAudio();
    var el = document.elementFromPoint(t.clientX, t.clientY);
    var holeEl = el && el.closest ? el.closest('.hh-hole') : null;
    if (holeEl) holeEl.classList.add('is-pressed');
    handleTapAt(t.clientX, t.clientY);
  }, { passive: true });

  function releasePressedHoles() {
    var pressed = boardEl.querySelectorAll('.hh-hole.is-pressed');
    for (var i = 0; i < pressed.length; i++) pressed[i].classList.remove('is-pressed');
  }
  stageEl.addEventListener('touchend', releasePressedHoles, { passive: true });
  stageEl.addEventListener('touchcancel', releasePressedHoles, { passive: true });

  // マウス用 (pointer系はマウスのみ処理し、タッチとの二重発火を防ぐ)
  stageEl.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;
    ensureAudio();
    handleTapAt(e.clientX, e.clientY);
  });

  // ═══ チュートリアル ═══
  var TUT_STEPS = [
    { image: ASSET_BASE + 'fx_highfive_burst.png', text: 'おきてる こへ ハイタッチして<br>ひかりを つなごう！' },
    { image: ASSET_BASE + 'fx_sleep_moon_cloud.png', text: 'ねてる こは<br>そっと みまもってね' },
    { image: ASSET_BASE + 'mechanic_light_seed.png', text: '4かい つなぐと<br>おはなが そだつよ' }
  ];
  var tutStep = 0;
  function showTutorial() {
    tutorialOpen = true;
    tutStep = 0;
    renderTutStep();
  }
  function renderTutStep() {
    var dim = document.getElementById('tut-dim');
    var bubble = document.getElementById('tut-bubble');
    if (!dim || !bubble) return;
    var step = TUT_STEPS[tutStep];
    dim.classList.remove('hidden');
    bubble.classList.remove('hidden');
    bubble.innerHTML = '<img class="tut-icon" src="' + step.image + '" alt="" draggable="false">' + step.text +
      '<br><button class="tut-next-btn" id="tut-next">' + (tutStep < TUT_STEPS.length - 1 ? 'つぎへ' : 'とじる') + '</button>';
    document.getElementById('tut-next').addEventListener('click', onTutNext);
  }
  function closeTutorial() {
    tutorialOpen = false;
    var dim = document.getElementById('tut-dim');
    var bubble = document.getElementById('tut-bubble');
    if (dim) dim.classList.add('hidden');
    if (bubble) bubble.classList.add('hidden');
  }
  function onTutNext(e) {
    e.preventDefault();
    e.stopPropagation();
    tutStep++;
    if (tutStep >= TUT_STEPS.length) { closeTutorial(); return; }
    renderTutStep();
  }
  var tutDimEl = document.getElementById('tut-dim');
  if (tutDimEl) tutDimEl.addEventListener('click', closeTutorial);

  // ═══ ゲームフロー: start → countdown → playing → settling → result ═══
  function beginCountdown() {
    phase = 'countdown';
    var cdScreen = document.getElementById('countdown-screen');
    var cdText = document.getElementById('cd-text');
    if (cdScreen) cdScreen.classList.add('show');
    if (cdText) cdText.textContent = 'よーい…';
    setTimeout(function () { if (cdText) cdText.textContent = 'すたーと！'; }, 600);
    setTimeout(function () {
      if (cdScreen) cdScreen.classList.remove('show');
      phase = 'playing';
      window._achDeferPopups = true;
      lastTs = null;
    }, 1200);
  }

  function finishGame() {
    phase = 'result';
    if (window.incrementStat) window.incrementStat('hyokkori_games', 1);
    if (window.setStatMax) window.setStatMax('hyokkori_best_combo', state.bestCombo);
    if (window.flushAchievementPopups) window.flushAchievementPopups();
    window._achDeferPopups = false;
    showResult();
  }

  function showResult() {
    var scoreEl = document.getElementById('result-score');
    if (scoreEl) scoreEl.textContent = state.score + ' てん';
    var relayEl = document.getElementById('result-relay');
    if (relayEl) relayEl.textContent = 'ひかりを ' + state.relayHits + 'かい つないだよ';
    var bannerEl = document.querySelector('#result-card .result-banner');
    if (bannerEl) bannerEl.textContent = state.flowerStage >= L.FLOWER_STAGE_MAX ? 'おはなが いっぱい！' : 'ここまで そだったよ！';
    var rank = window.saveHighScore ? window.saveHighScore('hyokkori-hightouch', state.score) : 0;
    var newEl = document.getElementById('result-new');
    if (rank >= 1) {
      if (newEl) newEl.classList.remove('hidden');
      spawnConfettiBurst(fxCanvas.width / 2, fxCanvas.height * 0.25, rank === 1 ? 50 : 22);
      if (window.Haptics) window.Haptics.fire('superBadgePop');
      playFanfare();
      if (highScoreTimer) clearTimeout(highScoreTimer);
      highScoreTimer = setTimeout(function () {
        highScoreTimer = 0;
        var resultOverlay = document.getElementById('result-overlay');
        if (phase === 'result' && resultOverlay && resultOverlay.classList.contains('show') && window.showHighScoreTable) {
          window.showHighScoreTable('hyokkori-hightouch', '🖐️ ひょっこりハイタッチ ハイスコア');
        }
      }, 900);
    } else {
      if (newEl) newEl.classList.add('hidden');
      playFanfare();
    }
    var overlay = document.getElementById('result-overlay');
    if (overlay) {
      overlay.classList.add('show');
      setTimeout(function () {
        var retry = document.getElementById('retry-btn');
        if (retry) {
          try { retry.focus({ preventScroll: true }); }
          catch (e) { retry.focus(); }
        }
      }, prefersReducedMotion() ? 0 : 280);
    }
  }

  function startMenuOnce() {
    if (window._menuInited || typeof window.initMenu !== 'function') return;
    window.initMenu({
      tutorial: showTutorial,
      extraButtons: [{
        icon: '🏆',
        label: 'ハイスコア',
        onClick: function () { if (window.showHighScoreTable) window.showHighScoreTable('hyokkori-hightouch', '🖐️ ひょっこりハイタッチ ハイスコア'); }
      }]
    });
    window._menuInited = true;
  }

  var startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      ensureAudio();
      var startScreen = document.getElementById('start-screen');
      if (startScreen) startScreen.style.display = 'none';
      startMenuOnce();
      resetGameState();
      updateHud();
      beginCountdown();
    });
  }

  var retryBtn = document.getElementById('retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var overlay = document.getElementById('result-overlay');
      if (overlay) overlay.classList.remove('show');
      resetGameState();
      updateHud();
      beginCountdown();
    });
  }

  preloadGameAssetsLocally();
  resetGameState();
  updateHud();

  // ═══ メインループ ═══
  var lastTs = null;
  function loop(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = (ts - lastTs) / 1000;
    if (dt > 0.05) dt = 0.05; // タブ切替復帰時などの大ジャンプを吸収
    lastTs = ts;

    if ((phase === 'playing' || phase === 'settling') && !tutorialOpen && !landscapeNoticeBlocking) {
      // state.time (壁時計) は settling 中も進める (pakupaku-catch と同型)。
      L.tickTimer(state, dt);
      if (phase === 'playing') {
        if (state.finished) {
          phase = 'settling';
          settleTimer = 0;
        } else {
          spawnTimerMs += dt * 1000;
          var interval = L.spawnIntervalAt(state.elapsed);
          if (spawnTimerMs >= interval) {
            spawnTimerMs = 0;
            trySpawn();
          }
        }
      } else {
        settleTimer += dt;
      }

      updateHoleTimeouts();
      updateBoardLockVisual();
      updateHud();

      if (phase === 'settling' && (occupiedHoleIndices().length === 0 || settleTimer >= 2)) {
        finishGame();
      }
    }

    updateAndDrawConfetti(dt);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  }

  // ═══ ブート判定: logic.js 正常時は即起動、失敗時はキャッシュバイパスで1回だけ再試行 ═══
  if (window.HyokkoriLogic) { boot(); return; }
  console.error('[hyokkori-hightouch] HyokkoriLogic (js/logic.js) が読み込まれていません — キャッシュバイパスで再試行します');
  var retryScript = document.createElement('script');
  retryScript.src = 'js/logic.js?retry=' + Date.now(); // ?retry= で HTTP キャッシュを確実にバイパス
  retryScript.onload = function () {
    if (window.HyokkoriLogic) { boot(); } else { showLoadError(); }
  };
  retryScript.onerror = function () { showLoadError(); };
  document.body.appendChild(retryScript);
})();
