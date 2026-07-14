/* ============================================================
   common/onboarding/tour-engine.js  (初回オンボーディング・ツアー 共通エンジン)

   正本: 確定仕様 (2026-07-14 batch:onboarding-tour) の componentApiContract /
   sequencingPlan / fileArchitecture。 依存ゼロの単独 IIFE (common/telemetry.js
   と同型)。 スクリプト評価時に同期で window.PonoOnboardingTour を公開する。

   役割:
     - ステージ登録レジストリ (registerStage / __ponoTourPendingStages のドレイン)
     - シーケンス制御 (pono:splash-dismissed 起点、 seen スナップショット、
       deferUntil/when 評価、 __ponoTourGatesFirstProfile の解除、
       #profileModal の MutationObserver、 8秒ウォッチドッグ)
     - スポットライト (暗転+くり抜き) + 吹き出しの描画 (document.body 直付け)
     - 入力シールド (全画面オーバーレイ) の即時マウント
     - seen-flag 管理 (isStageSeen/markStageSeen/resetAll)
     - requestStage() による単発の手動再生 (設定モーダル等から利用)
     - フォーカストラップ / Esc / inert 付与 / prefers-reduced-motion 対応
     - 進捗表示 ('N/M' + aria-label)

   公開 API・TourStep 形式・グローバルフラグの契約は確定仕様
   componentApiContract を正本とする (このファイル冒頭コメントは要約のみ)。

   window.PonoOnboardingTour = {
     registerStage(stageId, steps, options),
     isStageSeen(stageId), markStageSeen(stageId),
     requestStage(stageId), skipAll(), resetAll(), isRunning(),
     on(event, handler)   // 'stage-start' | 'stage-end' | 'tour-end'
   };

   DOM 依存は play.html のアンカー ID のみ。 対象要素が不在でも黙ってスキップする
   (存在チェックはこのファイルの責務、 コンテンツファイル側では不要)。
   ============================================================ */
(function () {
  'use strict';

  if (window.PonoOnboardingTour) return;

  // ============================================================
  // ---- 定数 ----
  // ============================================================
  // 固定ステージ順 (確定仕様 sequencingPlan §2: bookUnlock は末尾へ後ろ倒し)。
  var STAGE_ORDER = ['avatarIntro', 'titleTour', 'bookUnlock'];

  var Z_INDEX = 9400; // モーダル既定 100 より上、 tap-intro/portrait-warn (9500/9999) より下
  var START_BUBBLE_DELAY_MS = 600;   // start(): オーバーレイ即時マウント → 最初の吹き出しは +600ms
  var WATCHDOG_MS = 8000;            // start() から 8秒、 吹き出しが1つも出なければ強制中断
  var TARGET_RETRY_INTERVAL_MS = 300;
  var TARGET_RETRY_COUNT = 3;
  var MODAL_WAIT_FALLBACK_MS = 10000; // 可視モーダルの閉鎖待ち上限 (異常系フォールバック)
  var WIZARD_WAIT_FALLBACK_MS = 10000; // ゲート解除後、 profileModal が一度も開かない異常系
  var STAGE_TRANSITION_DELAY_MS = 600; // ウィザード close 検知 → titleTour 開始までの間

  var SPOTLIGHT_PAD = 10;
  var SPOTLIGHT_RADIUS = 20;
  var BUBBLE_GAP = 18;
  var BUBBLE_MARGIN = 12;

  // ============================================================
  // ---- safe storage / 環境判定ヘルパー (common/telemetry.js と同型) ----
  // ============================================================
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function lsRemove(k) { try { window.localStorage.removeItem(k); } catch (e) {} }

  // localStorage が例外を投げる環境 (プライベートモード等の一部) では
  // 「一度きり表示」 の保証ができないため、 start() 冒頭でツアー全体を中止する
  // (componentApiContract 動作要件 4)。 play.html インラインゲートも同条件で
  // __ponoTourGatesFirstProfile=false になっており整合する。
  function storageAvailable() {
    try {
      var probeKey = '__pono_tour_storage_probe__';
      window.localStorage.setItem(probeKey, '1');
      window.localStorage.removeItem(probeKey);
      return true;
    } catch (e) { return false; }
  }

  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  function supportsInert() {
    try { return 'inert' in HTMLElement.prototype; } catch (e) { return false; }
  }

  // ============================================================
  // ---- ステージレジストリ ----
  // ============================================================
  var stages = {}; // stageId -> { steps: TourStep[], options: {} }

  function registerStage(stageId, steps, options) {
    if (!stageId || typeof stageId !== 'string') return;
    if (stages[stageId]) return; // 同名 stageId の再登録は無視
    if (!options || typeof options.seenKey !== 'string' || !options.seenKey) return; // seenKey 必須
    stages[stageId] = {
      steps: (steps && steps.length) ? steps : [],
      options: options
    };
  }

  // window.__ponoTourPendingStages のドレイン。 script タグの読み込み順に
  // 依存しないよう、 このファイル評価時点で既に積まれている分を流し込み、
  // 以後の push() は即時 registerStage() に切り替える。
  function drainPendingStages() {
    try {
      var pending = window.__ponoTourPendingStages;
      if (pending && typeof pending.length === 'number') {
        for (var i = 0; i < pending.length; i++) {
          var entry = pending[i];
          if (entry && entry.length >= 2) {
            registerStage(entry[0], entry[1], entry[2]);
          }
        }
      }
    } catch (e) {}
    try {
      window.__ponoTourPendingStages = {
        push: function (entry) {
          if (entry && entry.length >= 2) registerStage(entry[0], entry[1], entry[2]);
        }
      };
    } catch (e) {}
  }

  // ---- seen-flag ----
  function seenKeyFor(stageId) {
    var s = stages[stageId];
    return (s && s.options && s.options.seenKey) || null;
  }
  function isStageSeen(stageId) {
    var key = seenKeyFor(stageId);
    if (!key) return false;
    return lsGet(key) === '1';
  }
  function markStageSeen(stageId) {
    var key = seenKeyFor(stageId);
    if (!key) return;
    lsSet(key, '1');
  }
  function resetAll() {
    for (var id in stages) {
      if (!stages.hasOwnProperty(id)) continue;
      var key = seenKeyFor(id);
      if (key) lsRemove(key);
    }
  }

  // ============================================================
  // ---- イベント ----
  // ============================================================
  var listeners = { 'stage-start': [], 'stage-end': [], 'tour-end': [] };
  function on(event, handler) {
    if (!listeners[event] || typeof handler !== 'function') return;
    listeners[event].push(handler);
  }
  function emit(event, payload) {
    var hs = listeners[event];
    if (!hs) return;
    for (var i = 0; i < hs.length; i++) {
      try { hs[i](payload); } catch (e) {}
    }
  }

  // ============================================================
  // ---- ゲートフラグ (__ponoTourGatesFirstProfile) ----
  // 「設定」は play.html インラインスクリプトが行う。 engine は解除のみ担当
  // (sequencingPlan §7 a〜e)。 何度呼んでも安全 (冪等)。
  // ============================================================
  function releaseGate() {
    try {
      if (window.__ponoTourGatesFirstProfile === true) {
        window.__ponoTourGatesFirstProfile = false;
      }
    } catch (e) {}
  }

  // ============================================================
  // ---- DOM ヘルパー ----
  // ============================================================
  function hasProfileNow() {
    try {
      return !!(window.PonoPlayerProfile
        && typeof window.PonoPlayerProfile.hasProfile === 'function'
        && window.PonoPlayerProfile.hasProfile());
    } catch (e) { return false; }
  }

  function isElementVisible(el) {
    if (!el) return false;
    try {
      if (el.hidden) return false;
      if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
      return true;
    } catch (e) { return false; }
  }

  function findVisibleModal() {
    try { return document.querySelector('.modal:not([hidden])'); } catch (e) { return null; }
  }

  // 可視の .modal が存在する間、 ステップ描画を保留する共通ガード
  // (sequencingPlan §8 末尾: 「各ステップ描画直前に可視の .modal が存在しないか
  // チェックし、 存在すれば同 Observer で閉鎖を待ってから描画する」)。
  function waitForNoVisibleModal(cb) {
    var modal = findVisibleModal();
    if (!modal) { cb(); return; }
    var done = false;
    var fallback = setTimeout(function () {
      if (done) return;
      done = true;
      try { mo.disconnect(); } catch (e) {}
      cb();
    }, MODAL_WAIT_FALLBACK_MS);
    var mo;
    try {
      mo = new MutationObserver(function () {
        if (done) return;
        if (modal.hidden) {
          done = true;
          clearTimeout(fallback);
          try { mo.disconnect(); } catch (e) {}
          cb();
        }
      });
      mo.observe(modal, { attributes: true, attributeFilter: ['hidden'] });
    } catch (e) {
      if (!done) { done = true; clearTimeout(fallback); cb(); }
    }
  }

  // #profileModal の open→close を監視する (closeModal() は hidden=true を
  // 立てるだけでイベントを発火しないため MutationObserver が必要)。
  function waitForProfileWizardClose(cb) {
    var modal;
    try { modal = document.getElementById('profileModal'); } catch (e) { modal = null; }
    if (!modal) { cb(); return; }
    var openedSeen = false;
    var done = false;
    var fallback = setTimeout(function () {
      if (done) return;
      // HIGH レビュー指摘対応: このフォールバックは sequencingPlan §8(iii) が定義する
      // 「ゲート解除から10秒待ってもモーダルが一度も開かない異常系」専用。
      // openedSeen (=ウィザードが開いて入力中) の場合はここで打ち切らず、
      // MutationObserver が hidden 復帰を検知するまで無期限に待つ。
      if (openedSeen) return;
      done = true;
      try { mo.disconnect(); } catch (e) {}
      cb(); // (iii) 異常系フォールバック
    }, WIZARD_WAIT_FALLBACK_MS);
    var mo;
    try {
      mo = new MutationObserver(function () {
        if (done) return;
        if (!modal.hidden) { openedSeen = true; return; }
        if (modal.hidden && openedSeen) {
          done = true;
          clearTimeout(fallback);
          try { mo.disconnect(); } catch (e) {}
          cb();
        }
      });
      mo.observe(modal, { attributes: true, attributeFilter: ['hidden'] });
    } catch (e) {
      if (!done) { done = true; clearTimeout(fallback); cb(); }
    }
  }

  function resolveTarget(selector, cb) {
    if (!selector) { cb(null); return; }
    var attempts = 0;
    function tryFind() {
      var el = null;
      try { el = document.querySelector(selector); } catch (e) { el = null; }
      if (isElementVisible(el)) { cb(el); return; }
      attempts++;
      if (attempts >= TARGET_RETRY_COUNT) { cb(null); return; }
      setTimeout(tryFind, TARGET_RETRY_INTERVAL_MS);
    }
    tryFind();
  }

  // ============================================================
  // ---- オーバーレイ / スポットライト / 吹き出し の描画 ----
  // ============================================================
  var overlayEl = null, spotlightEl = null, bubbleEl = null;
  var inertRecords = [];
  var resizeHandler = null, scrollHandler = null, keydownHandler = null, tabTrapHandler = null;
  var lastRenderedTarget = null; // { el, placement } resize/scroll 再計測用

  function mountOverlay() {
    if (overlayEl) return;
    overlayEl = document.createElement('div');
    overlayEl.className = 'pono-tour-overlay';
    if (prefersReducedMotion()) overlayEl.classList.add('pono-tour-reduced-motion');
    overlayEl.style.zIndex = String(Z_INDEX);

    spotlightEl = document.createElement('div');
    spotlightEl.className = 'pono-tour-spotlight';
    overlayEl.appendChild(spotlightEl);

    bubbleEl = document.createElement('div');
    bubbleEl.className = 'pono-tour-bubble';
    bubbleEl.setAttribute('role', 'dialog');
    bubbleEl.setAttribute('aria-modal', 'true');
    bubbleEl.setAttribute('tabindex', '-1');
    overlayEl.appendChild(bubbleEl);

    document.body.appendChild(overlayEl);

    applyInert();

    resizeHandler = function () { repositionCurrent(); };
    scrollHandler = function () { repositionCurrent(); };
    keydownHandler = function (e) {
      if (!runningState) return;
      if (e.key === 'Escape' || e.key === 'Esc') {
        try { e.preventDefault(); } catch (e2) {}
        handleEscape();
      }
    };
    tabTrapHandler = function (e) {
      if (e.key !== 'Tab') return;
      var buttons = bubbleEl.querySelectorAll('button');
      if (!buttons.length) return;
      var first = buttons[0], last = buttons[buttons.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else if (document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };

    try { window.addEventListener('resize', resizeHandler); } catch (e) {}
    try { window.addEventListener('orientationchange', resizeHandler); } catch (e) {}
    try { window.addEventListener('scroll', scrollHandler, true); } catch (e) {}
    try { document.addEventListener('keydown', keydownHandler, true); } catch (e) {}
    try { bubbleEl.addEventListener('keydown', tabTrapHandler); } catch (e) {}

    requestAnimationFrame(function () {
      if (overlayEl) overlayEl.classList.add('is-visible');
    });
  }

  function teardownOverlay() {
    if (resizeHandler) {
      try { window.removeEventListener('resize', resizeHandler); } catch (e) {}
      try { window.removeEventListener('orientationchange', resizeHandler); } catch (e) {}
    }
    if (scrollHandler) { try { window.removeEventListener('scroll', scrollHandler, true); } catch (e) {} }
    if (keydownHandler) { try { document.removeEventListener('keydown', keydownHandler, true); } catch (e) {} }
    resizeHandler = scrollHandler = keydownHandler = tabTrapHandler = null;

    if (overlayEl && overlayEl.parentNode) {
      try { overlayEl.parentNode.removeChild(overlayEl); } catch (e) {}
    }
    overlayEl = spotlightEl = bubbleEl = null;
    lastRenderedTarget = null;

    removeInert();

    try { document.body.focus(); } catch (e) {}
  }

  // ---- inert (body 直下の兄弟要素へ付与、 オーバーレイ自身・#portraitWarn・
  //      sw-update 帯は除外。 'inert' 非対応環境は aria-hidden フォールバック) ----
  var INERT_EXCLUDE_SELECTORS = [
    '#portraitWarn',
    '.sw-update-toast', '#swUpdateToast', '#swUpdateBand', '[data-sw-update-band]'
  ];
  function applyInert() {
    inertRecords = [];
    var children = document.body.children;
    var useInert = supportsInert();
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      if (!el || el === overlayEl) continue;
      var excluded = false;
      for (var j = 0; j < INERT_EXCLUDE_SELECTORS.length; j++) {
        try {
          if (el.matches && el.matches(INERT_EXCLUDE_SELECTORS[j])) { excluded = true; break; }
        } catch (e) {}
      }
      if (excluded) continue;
      try {
        if (useInert) {
          if (!el.hasAttribute('inert')) {
            el.setAttribute('inert', '');
            inertRecords.push({ el: el, attr: 'inert' });
          }
        } else if (!el.hasAttribute('aria-hidden')) {
          el.setAttribute('aria-hidden', 'true');
          inertRecords.push({ el: el, attr: 'aria-hidden' });
        }
      } catch (e) {}
    }
  }
  function removeInert() {
    for (var i = 0; i < inertRecords.length; i++) {
      try { inertRecords[i].el.removeAttribute(inertRecords[i].attr); } catch (e) {}
    }
    inertRecords = [];
  }

  // ---- 複数行テキストの安全な組み立て (innerHTML 直挿し禁止) ----
  function appendMultilineText(container, text) {
    var lines = String(text || '').split('\n');
    for (var i = 0; i < lines.length; i++) {
      container.appendChild(document.createTextNode(lines[i]));
      if (i < lines.length - 1) container.appendChild(document.createElement('br'));
    }
  }

  function oppositeOf(p) {
    if (p === 'above') return 'below';
    if (p === 'below') return 'above';
    if (p === 'left') return 'right';
    if (p === 'right') return 'left';
    return p;
  }

  function computeBubbleRect(placement, targetRect, hasTarget, bubbleW, bubbleH) {
    var vw = window.innerWidth, vh = window.innerHeight;
    if (!hasTarget || placement === 'center') {
      return {
        top: Math.max(BUBBLE_MARGIN, (vh - bubbleH) / 2),
        left: Math.max(BUBBLE_MARGIN, (vw - bubbleW) / 2),
        actual: 'center'
      };
    }
    function calc(p) {
      if (p === 'above') return { top: targetRect.top - BUBBLE_GAP - bubbleH, left: targetRect.left + targetRect.width / 2 - bubbleW / 2 };
      if (p === 'below') return { top: targetRect.bottom + BUBBLE_GAP, left: targetRect.left + targetRect.width / 2 - bubbleW / 2 };
      if (p === 'left') return { top: targetRect.top + targetRect.height / 2 - bubbleH / 2, left: targetRect.left - BUBBLE_GAP - bubbleW };
      if (p === 'right') return { top: targetRect.top + targetRect.height / 2 - bubbleH / 2, left: targetRect.right + BUBBLE_GAP };
      return { top: (vh - bubbleH) / 2, left: (vw - bubbleW) / 2 };
    }
    function fits(pos, p) {
      if (p === 'above' || p === 'below') return pos.top >= BUBBLE_MARGIN && (pos.top + bubbleH) <= (vh - BUBBLE_MARGIN);
      if (p === 'left' || p === 'right') return pos.left >= BUBBLE_MARGIN && (pos.left + bubbleW) <= (vw - BUBBLE_MARGIN);
      return true;
    }
    var actual = placement;
    var pos = calc(placement);
    if (!fits(pos, placement)) {
      var flipped = oppositeOf(placement);
      var pos2 = calc(flipped);
      if (fits(pos2, flipped)) { pos = pos2; actual = flipped; }
    }
    pos.left = Math.min(Math.max(pos.left, BUBBLE_MARGIN), Math.max(BUBBLE_MARGIN, vw - bubbleW - BUBBLE_MARGIN));
    pos.top = Math.min(Math.max(pos.top, BUBBLE_MARGIN), Math.max(BUBBLE_MARGIN, vh - bubbleH - BUBBLE_MARGIN));
    return { top: pos.top, left: pos.left, actual: actual };
  }

  function updatePositions(el, placement, animate) {
    if (!overlayEl || !spotlightEl || !bubbleEl) return;
    var hasTarget = !!el;
    var rect = hasTarget
      ? el.getBoundingClientRect()
      : { top: window.innerHeight / 2, bottom: window.innerHeight / 2, left: window.innerWidth / 2, right: window.innerWidth / 2, width: 0, height: 0 };

    var reduce = prefersReducedMotion();
    var useTransition = animate && !reduce;
    spotlightEl.style.transition = useTransition ? '' : 'none';
    bubbleEl.style.transition = useTransition ? '' : 'none';

    if (hasTarget) {
      spotlightEl.style.top = (rect.top - SPOTLIGHT_PAD) + 'px';
      spotlightEl.style.left = (rect.left - SPOTLIGHT_PAD) + 'px';
      spotlightEl.style.width = Math.max(rect.width + SPOTLIGHT_PAD * 2, 0) + 'px';
      spotlightEl.style.height = Math.max(rect.height + SPOTLIGHT_PAD * 2, 0) + 'px';
      spotlightEl.style.borderRadius = SPOTLIGHT_RADIUS + 'px';
    } else {
      // center 配置: 穴なし (0x0) — box-shadow の全画面暗転のみ残す。
      spotlightEl.style.top = (window.innerHeight / 2) + 'px';
      spotlightEl.style.left = (window.innerWidth / 2) + 'px';
      spotlightEl.style.width = '0px';
      spotlightEl.style.height = '0px';
      spotlightEl.style.borderRadius = '50%';
    }

    // 吹き出しサイズを実測してから配置 (中身は描画済み前提)。
    var bubbleRect = bubbleEl.getBoundingClientRect();
    var bw = bubbleRect.width || bubbleEl.offsetWidth || 280;
    var bh = bubbleRect.height || bubbleEl.offsetHeight || 120;
    var pos = computeBubbleRect(placement || 'center', rect, hasTarget, bw, bh);
    bubbleEl.style.top = pos.top + 'px';
    bubbleEl.style.left = pos.left + 'px';
    bubbleEl.setAttribute('data-placement', pos.actual);
  }

  function repositionCurrent() {
    if (!lastRenderedTarget || !overlayEl) return;
    updatePositions(lastRenderedTarget.el, lastRenderedTarget.placement, false);
  }

  // ============================================================
  // ---- 実行状態 / シーケンス制御 ----
  // ============================================================
  // runningState: {
  //   plan: [{ stageId, steps: TourStep[], options }],
  //   stageIdx, stepIdx, total, shown, manual: boolean
  // }
  var runningState = null;
  var watchdogTimer = null;

  function isRunning() { return !!runningState; }

  function clearWatchdog() {
    if (watchdogTimer) { clearTimeout(watchdogTimer); watchdogTimer = null; }
  }
  function startWatchdog() {
    clearWatchdog();
    watchdogTimer = setTimeout(function () {
      watchdogTimer = null;
      if (!runningState || runningState.shown > 0) return; // 吹き出し表示中はタイムアウトさせない
      var wasManual = runningState.manual;
      teardownOverlay();
      runningState = null;
      if (!wasManual) releaseGate();
      emit('tour-end', { reason: 'error' });
    }, WATCHDOG_MS);
  }

  function isFinalStepOfPlan(rs) {
    if (rs.stageIdx !== rs.plan.length - 1) return false;
    var stageEntry = rs.plan[rs.stageIdx];
    return rs.stepIdx === stageEntry.steps.length - 1;
  }

  function currentNextLabel(rs, step) {
    if (step.nextLabel) return step.nextLabel;
    if (!rs.manual && isFinalStepOfPlan(rs)) return 'あそぼう！';
    return 'つぎへ';
  }

  function handleSkipButtonClick() {
    // MEDIUM レビュー指摘対応: 手動再生 (requestStage、 例: 設定の
    // 『あそびかたを みる』) 中の『とばす』は Esc と同じく endManualRun() に
    // 分岐させ、 skipAll() による他ステージ (bookUnlock 持ち越し分含む) の
    // 巻き添え既読化を防ぐ (requestStage は seen フラグを一切変更しない契約)。
    if (runningState && runningState.manual) {
      endManualRun('skipped');
    } else {
      skipAll();
    }
  }
  function handleEscape() {
    if (runningState && runningState.manual) {
      endManualRun('skipped');
    } else {
      skipAll();
    }
  }

  function renderStep(step, el, shownIndex, total, rs) {
    lastRenderedTarget = { el: el, placement: step.placement || 'center' };

    bubbleEl.innerHTML = '';

    var progress = document.createElement('div');
    progress.className = 'pono-tour-bubble__progress';
    progress.textContent = shownIndex + '/' + total;
    progress.setAttribute('aria-hidden', 'true');
    bubbleEl.appendChild(progress);

    var body = document.createElement('div');
    body.className = 'pono-tour-bubble__text';
    body.id = 'ponoTourBubbleText';
    appendMultilineText(body, step.text || '');
    bubbleEl.appendChild(body);
    bubbleEl.setAttribute('aria-labelledby', 'ponoTourBubbleText');
    bubbleEl.setAttribute('aria-label', total + 'こ のうち ' + shownIndex + 'こめ');

    var actions = document.createElement('div');
    actions.className = 'pono-tour-bubble__actions';

    var skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'pono-tour-bubble__skip';
    skipBtn.textContent = 'とばす';
    skipBtn.setAttribute('aria-label', 'あんないを とばす');
    skipBtn.addEventListener('click', handleSkipButtonClick);
    actions.appendChild(skipBtn);

    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'pono-tour-bubble__next';
    nextBtn.textContent = currentNextLabel(rs, step);
    nextBtn.addEventListener('click', function () { onStepDismissed(rs); });
    actions.appendChild(nextBtn);

    bubbleEl.appendChild(actions);

    updatePositions(el, step.placement || 'center', true);

    try { bubbleEl.focus(); } catch (e) {}

    try { if (typeof step.onShow === 'function') step.onShow(); } catch (e) {}
  }

  function runCurrentStep(rs) {
    if (runningState !== rs) return; // 別 run に差し替わっていたら中断
    var stageEntry = rs.plan[rs.stageIdx];
    if (!stageEntry) { finishRun(rs, 'completed'); return; }
    if (rs.stepIdx === 0) emit('stage-start', { stageId: stageEntry.stageId });

    var step = stageEntry.steps[rs.stepIdx];
    var isLastOfStage = (rs.stepIdx === stageEntry.steps.length - 1);

    waitForNoVisibleModal(function () {
      if (runningState !== rs) return;
      resolveTarget(step.target, function (el) {
        if (runningState !== rs) return;
        if (step.target && !el) {
          // 対象要素が見つからない: 黙ってスキップ (コンテンツ側の存在チェック不要)。
          advanceAfterStep(rs, stageEntry, isLastOfStage);
          return;
        }
        rs.shown++;
        if (rs.shown === 1) clearWatchdog(); // 吹き出し表示中はタイムアウトさせない
        try {
          renderStep(step, el, rs.shown, rs.total, rs);
        } catch (e) {
          finishRun(rs, 'error');
        }
      });
    });
  }

  function onStepDismissed(rs) {
    if (runningState !== rs) return;
    var stageEntry = rs.plan[rs.stageIdx];
    var isLastOfStage = (rs.stepIdx === stageEntry.steps.length - 1);
    advanceAfterStep(rs, stageEntry, isLastOfStage);
  }

  function advanceAfterStep(rs, stageEntry, isLastOfStage) {
    if (runningState !== rs) return;
    if (isLastOfStage) {
      markStageSeen(stageEntry.stageId);
      emit('stage-end', { stageId: stageEntry.stageId, reason: 'completed' });
      if (stageEntry.stageId === 'avatarIntro') releaseGate();
      rs.stageIdx++;
      rs.stepIdx = 0;
      if (rs.stageIdx < rs.plan.length
          && stageEntry.stageId === 'avatarIntro'
          && rs.plan[rs.stageIdx].stageId === 'titleTour') {
        // avatarIntro 完了直後は既存ウィザードの open→close を待ってから titleTour へ。
        // CRITICAL レビュー指摘対応: ウィザード待機中はオーバーレイ/吹き出しを破棄し
        // (removeInert() も teardownOverlay() 経由で実行される)、 #profileModal が
        // inert のまま・オーバーレイに覆われたままタップ不能になる事故を防ぐ。
        // ウィザード close 検知後に titleTour の描画直前でオーバーレイを再マウントする。
        teardownOverlay();
        waitForProfileWizardClose(function () {
          if (runningState !== rs) return;
          setTimeout(function () {
            if (runningState !== rs) return;
            mountOverlay();
            runCurrentStep(rs);
          }, STAGE_TRANSITION_DELAY_MS);
        });
        return;
      }
      if (rs.stageIdx >= rs.plan.length) { finishRun(rs, 'completed'); return; }
      setTimeout(function () { runCurrentStep(rs); }, 0);
    } else {
      rs.stepIdx++;
      setTimeout(function () { runCurrentStep(rs); }, 0);
    }
  }

  function finishRun(rs, reason) {
    if (runningState !== rs) return;
    var wasManual = rs.manual;
    teardownOverlay();
    runningState = null;
    clearWatchdog();
    emit('tour-end', { reason: reason });
    if (!wasManual) releaseGate();
  }

  function endManualRun(reason) {
    if (!runningState || !runningState.manual) return;
    teardownOverlay();
    runningState = null;
    clearWatchdog();
    emit('tour-end', { reason: reason || 'skipped' });
  }

  function skipAll() {
    for (var id in stages) { if (stages.hasOwnProperty(id)) markStageSeen(id); }
    var rs = runningState;
    if (rs) {
      if (!rs.manual) {
        for (var i = rs.stageIdx; i < rs.plan.length; i++) {
          emit('stage-end', { stageId: rs.plan[i].stageId, reason: 'skipped' });
        }
      }
      teardownOverlay();
      runningState = null;
    }
    clearWatchdog();
    emit('tour-end', { reason: 'skipped' });
    releaseGate();
  }

  // ============================================================
  // ---- 適格ステップ評価 (snapshot / deferUntil / when) ----
  // ============================================================
  function evalWhen(fn, fallback) {
    if (typeof fn !== 'function') return true;
    try { return !!fn.call(null); } catch (e) { return !!fallback; }
  }

  function buildAutoPlan() {
    var snapshotMap = {};
    for (var i = 0; i < STAGE_ORDER.length; i++) {
      var sid = STAGE_ORDER[i];
      if (stages[sid]) snapshotMap[sid] = isStageSeen(sid);
    }
    var snapshot = { isSeen: function (id) { return !!snapshotMap[id]; } };

    var plan = [];
    for (var j = 0; j < STAGE_ORDER.length; j++) {
      var stageId = STAGE_ORDER[j];
      var reg = stages[stageId];
      if (!reg) continue;
      if (isStageSeen(stageId)) continue; // 恒久 seen 済 (イベント発火なし、静かにスキップ)

      var opts = reg.options || {};
      if (typeof opts.deferUntil === 'function') {
        var deferOk = true;
        try { deferOk = !!opts.deferUntil(snapshot); } catch (e) { deferOk = false; }
        if (!deferOk) {
          emit('stage-end', { stageId: stageId, reason: 'deferred' });
          continue;
        }
      }
      if (typeof opts.when === 'function' && !evalWhen(opts.when, false)) {
        markStageSeen(stageId);
        emit('stage-end', { stageId: stageId, reason: 'ineligible' });
        continue;
      }

      var eligibleSteps = [];
      var srcSteps = reg.steps || [];
      for (var k = 0; k < srcSteps.length; k++) {
        var st = srcSteps[k];
        if (evalWhen(st.when, false)) eligibleSteps.push(st);
      }
      if (!eligibleSteps.length) {
        markStageSeen(stageId);
        emit('stage-end', { stageId: stageId, reason: 'ineligible' });
        continue;
      }
      plan.push({ stageId: stageId, steps: eligibleSteps, options: opts });
    }
    return plan;
  }

  function planTotal(plan) {
    var total = 0;
    for (var i = 0; i < plan.length; i++) total += plan[i].steps.length;
    return total;
  }

  // ============================================================
  // ---- 自動起動シーケンス (start) ----
  // ============================================================
  function startAutoRun() {
    if (!storageAvailable()) return; // 一度きり保証ができない環境ではツアー自体を出さない
    if (runningState) return;

    try {
      var plan = buildAutoPlan();

      // sequencingPlan §11 belt-and-suspenders: start() 時点で #profileModal が
      // 既に可視なら avatarIntro をスキップし、 close 検知後 titleTour から実行する。
      var wizardAlreadyOpen = false;
      try {
        var pm = document.getElementById('profileModal');
        wizardAlreadyOpen = !!(pm && !pm.hidden);
      } catch (e) {}

      if (wizardAlreadyOpen) {
        var filtered = [];
        for (var i = 0; i < plan.length; i++) {
          if (plan[i].stageId === 'avatarIntro') {
            markStageSeen('avatarIntro');
            emit('stage-end', { stageId: 'avatarIntro', reason: 'ineligible' });
          } else {
            filtered.push(plan[i]);
          }
        }
        plan = filtered;
        releaseGate();
        if (!plan.length) return;
        var total1 = planTotal(plan);
        mountOverlay();
        runningState = { plan: plan, stageIdx: 0, stepIdx: 0, total: total1, shown: 0, manual: false };
        var rs1 = runningState;
        startWatchdog();
        waitForProfileWizardClose(function () {
          if (runningState !== rs1) return;
          setTimeout(function () { runCurrentStep(rs1); }, STAGE_TRANSITION_DELAY_MS);
        });
        return;
      }

      var total = planTotal(plan);
      if (total === 0) return; // 何も出すものがない (releaseGate は buildAutoPlan 内の ineligible 判定で既に処理済み)

      mountOverlay();
      runningState = { plan: plan, stageIdx: 0, stepIdx: 0, total: total, shown: 0, manual: false };
      var rs = runningState;
      startWatchdog();
      setTimeout(function () { runCurrentStep(rs); }, START_BUBBLE_DELAY_MS);
    } catch (e) {
      // start() 内の想定外の例外は安全側 (ゲート解除 + 何も表示しない) に倒す。
      releaseGate();
    }
  }

  // ---- 起動トリガ: maybeShowMonthlyOkaeri と同じ二段パターン ----
  function armSplashTrigger() {
    try {
      if (window.__ponoSplashDismissed) {
        startAutoRun();
      } else {
        document.addEventListener('pono:splash-dismissed', startAutoRun, { once: true });
      }
    } catch (e) {}
  }

  // ============================================================
  // ---- requestStage() 手動再生 ----
  // ============================================================
  function requestStage(stageId) {
    if (runningState) return; // isRunning() 中は no-op
    var reg = stages[stageId];
    if (!reg) return;

    var proceed = function () {
      if (runningState) return;
      var srcSteps = reg.steps || [];
      var eligibleSteps = [];
      for (var i = 0; i < srcSteps.length; i++) {
        if (evalWhen(srcSteps[i].when, false)) eligibleSteps.push(srcSteps[i]);
      }
      if (!eligibleSteps.length) return;

      mountOverlay();
      runningState = {
        plan: [{ stageId: stageId, steps: eligibleSteps, options: reg.options || {} }],
        stageIdx: 0, stepIdx: 0,
        total: eligibleSteps.length, shown: 0,
        manual: true
      };
      var rs = runningState;
      startWatchdog();
      requestAnimationFrame(function () { runCurrentStep(rs); });
    };

    if (findVisibleModal()) {
      waitForNoVisibleModal(proceed);
    } else {
      proceed();
    }
  }

  // ============================================================
  // ---- 公開 API ----
  // ============================================================
  window.PonoOnboardingTour = {
    registerStage: registerStage,
    isStageSeen: isStageSeen,
    markStageSeen: markStageSeen,
    requestStage: requestStage,
    skipAll: skipAll,
    resetAll: resetAll,
    isRunning: isRunning,
    on: on
  };

  drainPendingStages();
  armSplashTrigger();
})();
