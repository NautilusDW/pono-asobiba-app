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
    if (typeof window.__showHyokkoriLoadError === 'function') {
      window.__showHyokkoriLoadError();
      return;
    }
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
    btn.addEventListener('click', function () { location.reload(); });
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
  var H = window.HyokkoriLocations;

  // ═══ DOM 参照 ═══
  var stageEl = document.getElementById('stage');
  var boardEl = document.getElementById('board');
  var fxCanvas = document.getElementById('fx-canvas');
  var fxCtx = fxCanvas.getContext('2d');

  var ASSET_BASE = '../assets/images/hyokkori-hightouch/';
  var PARTNER_CATALOG = H.PARTNER_CATALOG;
  var HIGH_SCORE_GAME_ID = 'hyokkori-hightouch-v2';
  var BEST_COMBO_KEY = 'pono_hyokkori_best_combo_v2';
  var FX_IMAGES = [
    ASSET_BASE + 'fx_highfive_burst.png',
    ASSET_BASE + 'fx_leaf_puff.png',
    ASSET_BASE + 'fx_overheat_swirl.png',
    ASSET_BASE + 'fx_sleep_moon_cloud.png',
    ASSET_BASE + 'pono_title_highfive.png',
    ASSET_BASE + 'story_moon_flower_bloom.png'
  ];

  // 起動時は現在地だけを必須読込し、次の場所だけを遊んでいる間に温める。
  // 5場所すべてを一括取得しないことで、初回通信量と低メモリ端末の負荷を抑える。
  var assetPromiseByUrl = Object.create(null);
  var loadedAssetUrls = Object.create(null);
  // 10Mbps前後でも背景＋最初に遊べる動物1組を待てる値。
  // 全15画像の完了は待たず、残りは同時に温めながら読み込む。
  var REQUIRED_ASSET_TIMEOUT_MS = 12000;

  function locationFrameAssetUrls(location) {
    var hideouts = location.hideouts || {};
    return [location.background, hideouts.far, hideouts.near].filter(Boolean);
  }

  function locationAssetUrls(location) {
    var urls = locationFrameAssetUrls(location);
    var ids = (location.partnerIds || []).concat([location.bonusPartnerId]);
    for (var i = 0; i < ids.length; i++) {
      var partner = PARTNER_CATALOG[ids[i]];
      if (!partner) continue;
      if (partner.awake) urls.push(partner.awake);
      if (partner.sleeping) urls.push(partner.sleeping);
    }
    return urls.filter(function (url, idx, list) {
      return !!url && list.indexOf(url) === idx;
    });
  }

  function loadAndDecodeImage(url) {
    if (!url) return Promise.reject(new Error('画像URLがありません'));
    if (loadedAssetUrls[url]) return Promise.resolve(true);
    if (assetPromiseByUrl[url]) return assetPromiseByUrl[url];
    assetPromiseByUrl[url] = new Promise(function (resolve, reject) {
      var settled = false;
      var img = new Image();
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        delete assetPromiseByUrl[url];
        reject(new Error('画像の読込がタイムアウトしました: ' + url));
      }, REQUIRED_ASSET_TIMEOUT_MS);
      function done() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        loadedAssetUrls[url] = true;
        delete assetPromiseByUrl[url];
        resolve(true);
      }
      function failed() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        delete assetPromiseByUrl[url];
        reject(new Error('画像を読み込めませんでした: ' + url));
      }
      img.decoding = 'async';
      img.onload = function () {
        if (typeof img.decode !== 'function') { done(); return; }
        img.decode().then(done, function () {
          // Safari は画像表示可能でも decode() だけを reject することがある。
          if (img.complete && img.naturalWidth > 0) done();
          else failed();
        });
      };
      img.onerror = failed;
      img.src = url;
      if (img.complete && img.naturalWidth > 0) {
        if (typeof img.decode === 'function') img.decode().then(done, done);
        else done();
      }
    });
    return assetPromiseByUrl[url];
  }

  function preloadLocationAssets(location) {
    return Promise.all(locationAssetUrls(location).map(loadAndDecodeImage));
  }

  function preloadFirstPlayablePartner(location) {
    var ids = location.partnerIds || [];
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var partner = PARTNER_CATALOG[id];
      if (!partner || !partner.awake || !partner.sleeping) continue;
      return Promise.all([
          loadAndDecodeImage(partner.awake),
          loadAndDecodeImage(partner.sleeping)
        ]);
    }
    return Promise.reject(new Error('遊べる動物が登録されていません'));
  }

  function preloadBonusPartner(location) {
    var bonusPartner = PARTNER_CATALOG[location.bonusPartnerId];
    if (!bonusPartner || !bonusPartner.awake) {
      return Promise.reject(new Error('ボーナスの動物が登録されていません'));
    }
    return loadAndDecodeImage(bonusPartner.awake);
  }

  function preloadPlayableLocation(location) {
    // 開始前は背景・外装、最初の1種類、7体目に必要なボーナスだけ。
    // 残りはカウントダウン以降に読み、タイトルを見ているだけの時に
    // 全15画像を転送しない一方、回線速度に左右されず7体目を必ずボーナスにする。
    return Promise.all([
      Promise.all(locationFrameAssetUrls(location).map(loadAndDecodeImage)),
      preloadFirstPlayablePartner(location),
      preloadBonusPartner(location)
    ]);
  }

  function warmNextLocation(location) {
    var run = function () {
      preloadLocationAssets(location).catch(function () {
        // 先読み失敗は次の場所へ進む時に必須読込として再試行し、そこで明示表示する。
      });
    };
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 1000 });
    else setTimeout(run, 120);
  }

  function preloadSharedFxLocally() {
    var run = function () {
      for (var i = 0; i < FX_IMAGES.length; i++) loadAndDecodeImage(FX_IMAGES[i]).catch(function () {});
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
    setBoardInteractive(!show && phase === 'playing' && !tutorialOpen);
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

  // ═══ 散歩の保存と場所切替 ═══
  var memoryWalkState = null;
  var walkStorageUnavailable = false;
  var walkState = null;
  var currentLocation = null;
  var nextLocation = null;
  var locationLoadEpoch = 0;
  var boardEpoch = 0;

  function readWalkState() {
    var raw = memoryWalkState;
    if (!walkStorageUnavailable) {
      try {
        var saved = localStorage.getItem(H.WALK_SAVE_KEY);
        if (saved) raw = JSON.parse(saved);
      } catch (e) {
        // localStorage無効・JSON破損時も、同じ起動中はメモリ上で散歩を続けられる。
        // JSON破損は次の正常保存で直せるため、アクセス自体が失敗した時だけwrite側で判定する。
        try { localStorage.getItem(H.WALK_SAVE_KEY); } catch (storageError) { walkStorageUnavailable = true; }
      }
    }
    return H.normalizeWalkState(raw);
  }

  function writeWalkState(value) {
    var normalized = H.normalizeWalkState(value);
    memoryWalkState = normalized;
    if (!walkStorageUnavailable) {
      try { localStorage.setItem(H.WALK_SAVE_KEY, JSON.stringify(normalized)); }
      catch (e) { walkStorageUnavailable = true; }
    }
    return normalized;
  }

  function routeIndexOf(location) {
    return Math.max(0, H.ROUTE_IDS.indexOf(location.id));
  }

  function routeLocationAfter(location) {
    var index = routeIndexOf(location);
    var nextId = H.ROUTE_IDS[(index + 1) % H.ROUTE_IDS.length];
    return H.LOCATION_BY_ID[nextId] || H.LOCATIONS[0];
  }

  function updateStartLocation() {
    var startLocationEl = document.getElementById('start-location');
    if (!startLocationEl || !currentLocation) return;
    startLocationEl.textContent = (routeIndexOf(currentLocation) + 1) + '/' + H.ROUTE_IDS.length + '　' + currentLocation.name;
    var startDescEl = document.getElementById('start-desc');
    if (startDescEl) {
      startDescEl.textContent = currentLocation.startStory || 'おきている どうぶつと\nハイタッチしよう！';
    }
  }

  // ═══ 隠れ場所を場所定義の正規化座標から動的生成 ═══
  var holeRefs = [];

  function setBoardInteractive(enabled) {
    var active = !!enabled;
    if (active) {
      boardEl.removeAttribute('inert');
      boardEl.removeAttribute('aria-hidden');
    } else {
      boardEl.setAttribute('inert', '');
      boardEl.setAttribute('aria-hidden', 'true');
    }
    var refs = holeRefs || [];
    for (var i = 0; i < refs.length; i++) {
      refs[i].hole.disabled = !active;
      refs[i].hole.tabIndex = active ? 0 : -1;
    }
  }

  function makeHoleRef(holeEl) {
    return {
      idx: parseInt(holeEl.getAttribute('data-hole'), 10),
      hole: holeEl,
      windowEl: holeEl.querySelector('.hh-window'),
      wrap: holeEl.querySelector('.hh-char-wrap'),
      img: holeEl.querySelector('.hh-char'),
      sleepFx: holeEl.querySelector('.hh-sleep-fx'),
      hitFx: holeEl.querySelector('.hh-hit-fx'),
      dust: holeEl.querySelector('.hh-dust'),
      foreground: holeEl.querySelector('.hh-hideout-foreground'),
      bonusBadge: holeEl.querySelector('.hh-bonus-badge'),
      scorePop: holeEl.querySelector('.hh-score-pop'),
      epoch: boardEpoch,
      visualToken: 0
    };
  }

  function buildHoles(location) {
    var tpl = document.getElementById('hh-hole-tpl');
    if (!tpl || !location) throw new Error('隠れ場所のテンプレートまたは場所定義がありません');
    var fragment = document.createDocumentFragment();
    var nextRefs = [];
    boardEpoch += 1;
    for (var i = 0; i < location.slots.length; i++) {
      var slot = location.slots[i];
      var node = tpl.content.firstElementChild.cloneNode(true);
      // 移行途中の古いHTMLを読んでも支援技術向けの実buttonへ正規化する。
      if (node.tagName !== 'BUTTON') {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = node.className;
        while (node.firstChild) button.appendChild(node.firstChild);
        node = button;
      }
      node.type = 'button';
      node.disabled = true;
      node.tabIndex = -1;
      node.setAttribute('data-hole', i);
      var slotGroundY = Number(slot.groundY);
      if (!isFinite(slotGroundY) || slotGroundY < 0 || slotGroundY > 100) {
        throw new Error('かくればしょの せっちいちが ふせいです');
      }
      node.style.setProperty('--slot-x', Number(slot.x) + '%');
      node.style.setProperty('--slot-y', slotGroundY + '%');
      node.style.setProperty('--depth-scale', String(Number(slot.depth) || 1));
      node.style.setProperty('--slot-z', String(20 + Math.round(slotGroundY)));
      if (slot.hideout !== 'far' && slot.hideout !== 'near') {
        throw new Error('かくればしょの遠近定義が正しくありません');
      }
      var hideoutVariant = slot.hideout;
      var hideoutSrc = location.hideouts && location.hideouts[hideoutVariant];
      if (!hideoutSrc) throw new Error('かくればしょの画像定義がありません');
      var hideoutRotate = Number(slot.rotate);
      if (!isFinite(hideoutRotate)) hideoutRotate = 0;
      var hideoutLayout = (location.hideoutLayouts && location.hideoutLayouts[hideoutVariant]) || {};
      var groundAnchorY = Number(hideoutLayout.groundAnchorY);
      if (!isFinite(groundAnchorY) || groundAnchorY <= 0 || groundAnchorY > 100) {
        throw new Error('かくればしょの せっちアンカーが ふせいです');
      }
      node.dataset.hideoutVariant = hideoutVariant;
      node.dataset.depth = String(Number(slot.depth) || 1);
      node.dataset.groundY = String(slotGroundY);
      node.style.setProperty('--hideout-rotate', hideoutRotate + 'deg');
      node.style.setProperty('--ground-anchor-y', groundAnchorY + '%');
      node.style.setProperty('--foreground-top', (Number(hideoutLayout.foregroundTop) || 60) + '%');
      node.style.setProperty('--window-bottom', (Number(hideoutLayout.windowBottom) || 35.5) + '%');
      node.style.setProperty('--char-width', (Number(hideoutLayout.charWidth) || 58) + '%');
      node.style.setProperty('--char-ground-lift', (Number(hideoutLayout.charLiftCqh) || 4) + 'cqh');
      var hideouts = node.querySelectorAll('.hh-hideout');
      for (var h = 0; h < hideouts.length; h++) hideouts[h].src = hideoutSrc;
      (function (idx, buttonEl) {
        // detail===0 はキーボードまたは支援技術によるbutton activation。
        // touchstart / mouse pointerdown 後の合成clickはここで二重処理しない。
        buttonEl.addEventListener('click', function (e) {
          if (e.detail !== 0) return;
          e.preventDefault();
          ensureAudio();
          handleHoleActivation(idx);
        });
      })(i, node);
      fragment.appendChild(node);
      nextRefs.push(makeHoleRef(node));
    }
    boardEl.replaceChildren(fragment);
    holeRefs = nextRefs;
    boardEl.dataset.location = location.id;
    boardEl.dataset.lastSuccessfulHole = '';
    setBoardInteractive(false);
  }

  function afterPaint() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () { requestAnimationFrame(resolve); });
    });
  }

  function swapLocation(location, initial) {
    var requestEpoch = ++locationLoadEpoch;
    document.body.classList.add('pono-game-loading');
    setBoardInteractive(false);
    return preloadPlayableLocation(location).then(function () {
      if (requestEpoch !== locationLoadEpoch) return false;
      currentLocation = location;
      stageEl.style.setProperty('--location-bg', 'url("' + location.background.replace(/"/g, '\\"') + '")');
      stageEl.dataset.location = location.id;
      buildHoles(location);
      updateStartLocation();
      resetGameState();
      updateHud();
      return afterPaint();
    }).then(function (painted) {
      if (requestEpoch !== locationLoadEpoch || painted === false) return false;
      document.body.classList.remove('pono-game-loading');
      if (initial) document.body.classList.add('pono-game-ready');
      nextLocation = routeLocationAfter(currentLocation);
      return true;
    });
  }

  var comboHudEl = document.getElementById('combo-hud');
  var comboCountEl = document.getElementById('combo-count');
  var comboStatusEl = document.getElementById('combo-status-sr');
  var reducedMotionQuery = null;
  try { reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) {}

  function prefersReducedMotion() {
    return !!(reducedMotionQuery && reducedMotionQuery.matches);
  }

  function readBestComboRecord() {
    try {
      var value = parseInt(localStorage.getItem(BEST_COMBO_KEY), 10);
      return isFinite(value) && value > 0 ? value : 0;
    } catch (e) {
      return 0;
    }
  }

  function writeBestComboRecord(value) {
    var safeValue = Math.max(0, Math.floor(Number(value) || 0));
    try { localStorage.setItem(BEST_COMBO_KEY, String(safeValue)); } catch (e) {}
    return safeValue;
  }

  // ═══ ゲーム状態 ═══
  var state = L.createInitialState();
  var phase = 'idle'; // idle -> countdown -> playing -> settling -> result
  var holes = []; // index合わせ: holes[i].occupant = { kind, showUntil } | null
  var recentKinds = []; // pickSpawnKind の3連続sleeping禁止用
  var spawnTimerMs = 0;
  var settleTimer = 0;
  var boardLockedUntil = 0; // OVERHEAT 演出用 (state.time 基準)
  var lastSuccessfulHole = null; // 直前の成功地点。次の出現候補からだけ外す。
  var lastPartnerId = null;
  var partnerBag = [];
  var actualSpawnCount = 0;
  var tutorialOpen = false;
  var renderedCombo = -1;
  var lifetimeBestCombo = readBestComboRecord();
  var comboRecordBroken = false;
  var comboHideTimer = 0;
  var comboSlamTimer = 0;
  var activeRun = null;
  var activeRunAdvanced = false;
  var resultCompletedLap = false;
  var nextWarmTimer = 0;

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
    lastSuccessfulHole = null;
    boardEl.dataset.lastSuccessfulHole = '';
    lastPartnerId = null;
    partnerBag = [];
    actualSpawnCount = 0;
    tutorialOpen = false;
    activeRun = null;
    activeRunAdvanced = false;
    resultCompletedLap = false;
    comboRecordBroken = false;
    renderedCombo = -1;
    if (comboHideTimer) { clearTimeout(comboHideTimer); comboHideTimer = 0; }
    if (comboSlamTimer) { clearTimeout(comboSlamTimer); comboSlamTimer = 0; }
    if (nextWarmTimer) { clearTimeout(nextWarmTimer); nextWarmTimer = 0; }
    if (comboHudEl) {
      comboHudEl.classList.remove('is-visible', 'is-slam');
      comboHudEl.dataset.tier = '0';
      comboHudEl.style.setProperty('--combo-grow', '0px');
      comboHudEl.setAttribute('aria-hidden', 'true');
    }
    if (comboStatusEl) comboStatusEl.textContent = '';
    confetti = [];
    updateComboHud();
  }

  function resetHoleVisual(idx) {
    var refs = holeRefs[idx];
    if (!refs) return;
    delete refs.wrap.dataset.partner;
    refs.wrap.classList.remove('is-visible', 'is-sleeping', 'is-hit', 'is-wobble', 'is-bonus');
    if (refs.bonusBadge) refs.bonusBadge.classList.remove('show');
    if (refs.scorePop) {
      refs.scorePop.classList.remove('show', 'is-bonus');
      refs.scorePop.textContent = '';
    }
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

  function refillPartnerBag() {
    partnerBag = (currentLocation && currentLocation.partnerIds ? currentLocation.partnerIds : []).filter(function (id) {
      return !!PARTNER_CATALOG[id];
    });
    // Fisher-Yates。袋を使い切るまで同じ6種は重複しない。
    for (var i = partnerBag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = partnerBag[i];
      partnerBag[i] = partnerBag[j];
      partnerBag[j] = tmp;
    }
  }

  function takeDeferredPartner(excluded, avoidLast, kind) {
    var count = partnerBag.length;
    for (var i = 0; i < count; i++) {
      var id = partnerBag.shift();
      var candidate = PARTNER_CATALOG[id];
      var stateImage = candidate && candidate[kind];
      if (candidate && stateImage && loadedAssetUrls[stateImage] &&
          excluded.indexOf(id) < 0 && (!avoidLast || id !== lastPartnerId)) {
        return candidate;
      }
      // 同時出現中・直前の子は捨てずに袋の後ろへ回す。
      partnerBag.push(id);
    }
    return null;
  }

  function pickPartner(kind) {
    if (partnerBag.length === 0) refillPartnerBag();
    var occupiedIds = occupiedPartnerIds();
    var partner = takeDeferredPartner(occupiedIds, true, kind);
    if (!partner) partner = takeDeferredPartner(occupiedIds, false, kind);
    if (partner) return partner;

    // 読込待ちのIDだけが袋に残った時も、すでにdecode済みの子で遊びを止めない。
    // 袋自体は崩さないので、残りが読み込めた後は一巡一回の順へ自然に戻る。
    var ready = (currentLocation.partnerIds || []).filter(function (id) {
      var candidate = PARTNER_CATALOG[id];
      return candidate && candidate[kind] && loadedAssetUrls[candidate[kind]] &&
        occupiedIds.indexOf(id) < 0;
    });
    var withoutLast = ready.filter(function (id) { return id !== lastPartnerId; });
    var fallbackIds = withoutLast.length ? withoutLast : ready;
    if (!fallbackIds.length) return null;
    return PARTNER_CATALOG[fallbackIds[Math.floor(Math.random() * fallbackIds.length)]];
  }

  function trySpawn() {
    var occupied = occupiedHoleIndices();
    if (occupied.length >= 2) return; // 同時出現は最大2体まで
    var forbidden = occupied.slice();
    // 直前に成功した場所を外し、視線が盤面を自然に移るリズムだけを残す。
    if (lastSuccessfulHole !== null && forbidden.indexOf(lastSuccessfulHole) < 0) forbidden.push(lastSuccessfulHole);
    var holeIdx = L.pickHole(holeRefs.length, forbidden, Math.random);
    if (holeIdx === null) return;
    actualSpawnCount += 1;
    var isBonus = L.isBonusSpawn(actualSpawnCount);
    var kind = isBonus ? 'awake' : L.pickSpawnKind(state.elapsed, recentKinds, Math.random);
    var partner = isBonus ? PARTNER_CATALOG[currentLocation.bonusPartnerId] : pickPartner(kind);
    var partnerImage = partner && (isBonus ? partner.awake : partner[kind]);
    if (isBonus && partnerImage && !loadedAssetUrls[partnerImage]) {
      // swapLocation() の必須読込後なので通常は到達しない防御分岐。
      // 想定外のdecode状態消失時も7体目を通常へ置換せず、同じcountで再試行する。
      loadAndDecodeImage(partnerImage).catch(function () {});
      actualSpawnCount -= 1;
      return;
    }
    // 遅い回線では未decode画像を出さず、次の出現間隔で再試行する。
    if (!partner || !partnerImage || !loadedAssetUrls[partnerImage]) {
      actualSpawnCount -= 1;
      return;
    }
    recentKinds.push(kind);
    if (recentKinds.length > 6) recentKinds.shift();
    var showTime = isBonus ? L.bonusShowTimeAt(state.elapsed) : L.showTimeAt(state.elapsed);
    if (!isBonus) lastPartnerId = partner.id;
    holes[holeIdx].occupant = {
      kind: kind,
      partnerId: partner.id,
      isBonus: isBonus,
      showUntil: state.elapsed + showTime
    };
    renderSpawn(holeIdx, kind, partner, isBonus);
  }

  function renderSpawn(idx, kind, partner, isBonus) {
    var refs = holeRefs[idx];
    if (!refs) return;
    refs.visualToken = (refs.visualToken || 0) + 1;
    refs.wrap.dataset.partner = partner.id;
    refs.img.src = isBonus ? partner.awake : partner[kind];
    refs.img.alt = isBonus
      ? 'キラキラの ひかりモモンガ'
      : (kind === 'awake' ? 'おきている おともだち' : 'ねている おともだち');
    refs.hole.setAttribute('aria-label', isBonus
      ? '30てんの ひかりモモンガ ハイタッチ'
      : (kind === 'awake' ? 'ハイタッチする おともだち' : 'ねている おともだち'));
    refs.wrap.classList.remove('is-hit', 'is-wobble', 'is-bonus');
    refs.wrap.classList.toggle('is-sleeping', kind === 'sleeping');
    refs.wrap.classList.toggle('is-bonus', !!isBonus);
    if (refs.bonusBadge) refs.bonusBadge.classList.toggle('show', !!isBonus);
    if (refs.scorePop) {
      refs.scorePop.classList.remove('show', 'is-bonus');
      refs.scorePop.textContent = '';
    }
    retriggerClass(refs.wrap, 'is-visible'); // translate アニメを毎回発火させる
  }

  function retractHole(idx) {
    var h = holes[idx];
    if (!h.occupant) return;
    h.occupant = null;
    var refs = holeRefs[idx];
    if (refs) {
      refs.visualToken = (refs.visualToken || 0) + 1;
      refs.wrap.classList.remove('is-visible', 'is-sleeping', 'is-bonus');
      if (refs.bonusBadge) refs.bonusBadge.classList.remove('show');
      refs.hole.setAttribute('aria-label', 'おともだちが でてくる ばしょ');
    }
  }

  function celebrateAndRetract(idx) {
    var h = holes[idx];
    var refs = holeRefs[idx];
    if (!h || !h.occupant || !refs) return;
    h.occupant = null;
    var token = refs.visualToken || 0;
    var epoch = refs.epoch;
    setTimeout(function () {
      if (epoch !== boardEpoch || (refs.visualToken || 0) !== token || (holes[idx] && holes[idx].occupant)) return;
      refs.wrap.classList.remove('is-visible', 'is-sleeping', 'is-hit', 'is-bonus');
      if (refs.bonusBadge) refs.bonusBadge.classList.remove('show');
      refs.hole.setAttribute('aria-label', 'おともだちが でてくる ばしょ');
    // reduced-motion時は動かさず、加点表示を読める短い静止時間だけ残す。
    }, prefersReducedMotion() ? 620 : 300);
  }

  function updateHoleTimeouts() {
    for (var i = 0; i < holes.length; i++) {
      var occ = holes[i].occupant;
      if (!occ) continue;
      if (state.elapsed >= occ.showUntil) {
        var wasAwake = occ.kind === 'awake';
        retractHole(i);
        if (wasAwake) L.missedAwake(state); // 待って見送るのは失敗にせず、コンボも得点も維持。
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

  function clearComboFireworks() {
    for (var i = confetti.length - 1; i >= 0; i--) {
      if (confetti[i].source === 'combo') confetti.splice(i, 1);
    }
    fxCanvas.dataset.comboFxTier = '0';
    fxCanvas.dataset.comboFxBursts = '0';
    fxCanvas.dataset.comboFxParticles = '0';
  }

  function spawnComboFireworks(profile) {
    clearComboFireworks();
    if (!profile || profile.tier < 1 || prefersReducedMotion()) return;

    var originsByTier = {
      1: [[0.5, 0.48]],
      2: [[0.5, 0.44]],
      3: [[0.42, 0.47], [0.58, 0.42]],
      4: [[0.36, 0.48], [0.5, 0.37], [0.64, 0.48]]
    };
    var origins = originsByTier[profile.tier] || originsByTier[1];
    var colors = ['#fff7a3', '#ffc93d', '#ff6fa8', '#74e4ff', '#aa83ff', '#72e89a'];
    var remaining = profile.particleCount;

    for (var burst = 0; burst < origins.length; burst++) {
      var burstsLeft = origins.length - burst;
      var count = Math.ceil(remaining / burstsLeft);
      remaining -= count;
      var originX = fxCanvas.width * origins[burst][0];
      var originY = fxCanvas.height * origins[burst][1];
      for (var p = 0; p < count; p++) {
        var angle = (Math.PI * 2 * p / count) + (Math.random() - 0.5) * 0.18;
        var speed = 105 + profile.tier * 24 + Math.random() * 82;
        confetti.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: 38,
          decay: 1.12,
          rot: angle,
          rotSpd: (Math.random() - 0.5) * 3,
          life: 1,
          size: 3.5 + profile.tier * 0.7 + Math.random() * 3,
          color: colors[(p + burst * 2) % colors.length],
          shape: 'spark',
          source: 'combo'
        });
      }
    }

    fxCanvas.dataset.comboFxTier = String(profile.tier);
    fxCanvas.dataset.comboFxBursts = String(profile.burstCount);
    fxCanvas.dataset.comboFxParticles = String(profile.particleCount);
  }

  function updateAndDrawConfetti(dt) {
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    if (confetti.length === 0) return;
    for (var i = confetti.length - 1; i >= 0; i--) {
      var c = confetti[i];
      c.vy += (typeof c.gravity === 'number' ? c.gravity : 340) * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.rotSpd * dt;
      c.life -= dt * (typeof c.decay === 'number' ? c.decay : 0.6);
      if (c.life <= 0 || c.y > fxCanvas.height + 40) { confetti.splice(i, 1); continue; }
      fxCtx.save();
      fxCtx.globalAlpha = Math.max(0, c.life);
      fxCtx.translate(c.x, c.y);
      fxCtx.rotate(c.rot);
      if (c.shape === 'spark') {
        fxCtx.strokeStyle = c.color;
        fxCtx.lineWidth = Math.max(2, c.size * 0.42);
        fxCtx.lineCap = 'round';
        fxCtx.beginPath();
        fxCtx.moveTo(-c.size * 1.4, 0);
        fxCtx.lineTo(c.size * 1.4, 0);
        fxCtx.stroke();
      } else {
        fxCtx.fillStyle = c.color;
        fxCtx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
      }
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

  function rememberSuccessfulHole(idx) {
    if (idx === null || !holeRefs[idx]) return;
    lastSuccessfulHole = idx;
    boardEl.dataset.lastSuccessfulHole = String(idx);
  }

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
  function playBonusSound() {
    tone(784, 0, 0.10, 'triangle', 0.12);
    tone(1047, 0.07, 0.13, 'triangle', 0.11);
    tone(1319, 0.14, 0.16, 'triangle', 0.10);
  }
  function playSleepSound() { tone(220, 0, 0.16, 'sine', 0.08); }
  function playWhiffSound() { tone(180, 0, 0.08, 'sine', 0.05); }
  function playFanfare() {
    [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, i * 0.11, 0.18, 'triangle', 0.13); });
  }
  // ═══ HUD ═══
  var hudTimerEl = document.getElementById('hud-timer');
  var hudScoreEl = document.getElementById('hud-score');

  function hideComboHud(clearFx) {
    if (comboHideTimer) { clearTimeout(comboHideTimer); comboHideTimer = 0; }
    if (comboSlamTimer) { clearTimeout(comboSlamTimer); comboSlamTimer = 0; }
    if (comboHudEl) {
      comboHudEl.classList.remove('is-visible', 'is-slam');
      comboHudEl.setAttribute('aria-hidden', 'true');
    }
    if (clearFx) clearComboFireworks();
  }

  function slamComboHud() {
    if (!comboHudEl) return;
    if (comboSlamTimer) clearTimeout(comboSlamTimer);
    comboHudEl.classList.remove('is-slam');
    void comboHudEl.offsetWidth;
    comboHudEl.classList.add('is-slam');
    comboSlamTimer = setTimeout(function () {
      comboSlamTimer = 0;
      if (comboHudEl) comboHudEl.classList.remove('is-slam');
    }, 560);
  }

  function updateComboHud() {
    if (!comboHudEl || !comboCountEl) return;
    var combo = Math.max(0, Number(state.combo) || 0);
    if (combo === renderedCombo) return;

    var previousCombo = renderedCombo;
    var profile = L.comboFxProfileAt(combo);
    comboCountEl.textContent = String(combo);
    comboHudEl.setAttribute('aria-label', combo + 'コンボ');
    comboHudEl.dataset.tier = String(profile.tier);
    comboHudEl.style.setProperty('--combo-grow', profile.growPx + 'px');

    if (comboStatusEl) {
      if (profile.tier > 0) comboStatusEl.textContent = combo + 'コンボ';
      else if (previousCombo >= 2 && combo === 0) comboStatusEl.textContent = 'コンボ おしまい';
      else if (combo === 1) comboStatusEl.textContent = '';
    }

    if (profile.tier > 0) {
      if (comboHideTimer) clearTimeout(comboHideTimer);
      comboHudEl.classList.add('is-visible');
      comboHudEl.setAttribute('aria-hidden', 'false');
      slamComboHud();
      spawnComboFireworks(profile);
      comboHideTimer = setTimeout(function () {
        comboHideTimer = 0;
        hideComboHud(true);
      }, profile.durationMs);
    } else {
      hideComboHud(true);
      comboHudEl.dataset.tier = '0';
      comboHudEl.style.setProperty('--combo-grow', '0px');
    }

    renderedCombo = combo;
  }

  function showScorePop(idx, result) {
    var refs = idx !== null ? holeRefs[idx] : null;
    if (!refs || !refs.scorePop || !result) return;
    refs.scorePop.textContent = (result.isBonus ? 'キラキラ ' : '') + '＋' + result.scoreDelta;
    refs.scorePop.classList.toggle('is-bonus', !!result.isBonus);
    retriggerClass(refs.scorePop, 'show', 620);
  }

  function updateHud() {
    var remaining = Math.max(0, Math.ceil(L.GAME_DURATION - state.elapsed));
    if (hudTimerEl) {
      hudTimerEl.textContent = '⏱ ' + remaining;
      hudTimerEl.classList.toggle('hud-low', remaining <= 5);
    }
    if (hudScoreEl) hudScoreEl.textContent = '🖐️ ' + state.score;
    updateComboHud();
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
    handleHoleActivation(idx);
  }

  function handleHoleActivation(idx) {
    if (phase !== 'playing') return;
    // 成功直後は加点を読める間だけ見た目を残す。中身はすでに回収済みなので、
    // 同じ見た目への追いタップを空振り扱いにしてコンボを切らない。
    if (idx !== null && holes[idx] && !holes[idx].occupant &&
        holeRefs[idx] && holeRefs[idx].wrap.classList.contains('is-visible')) return;
    var target = 'empty';
    if (idx !== null && holes[idx] && holes[idx].occupant) {
      target = holes[idx].occupant.isBonus ? 'bonus' : holes[idx].occupant.kind;
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
          rememberSuccessfulHole(idx);
          showScorePop(idx, res);
          celebrateAndRetract(idx);
        }
        spawnConfettiBurst(pt.x, pt.y, res.isBonus ? 34 : 18);
        if (window.Haptics) window.Haptics.fire(res.isBonus ? 'superBadgePop' : 'stickerPaste');
        if (window.incrementStat) window.incrementStat('hyokkori_touches', 1);
        if (res.isBonus) playBonusSound();
        else playHitSound();
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
    { image: ASSET_BASE + 'fx_highfive_burst.png', text: 'おきてる こへ ハイタッチ！<br>つづくと コンボ！' },
    { image: ASSET_BASE + 'fx_sleep_moon_cloud.png', text: 'ねてる こは<br>そっと みまもってね' },
    { image: PARTNER_CATALOG.hikari_momonga.awake, text: 'キラキラの こは 30てん！<br>みつけたら ハイタッチ！' }
  ];
  var tutStep = 0;
  function showTutorial() {
    tutorialOpen = true;
    setBoardInteractive(false);
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
    if (phase === 'playing' && !landscapeNoticeBlocking) setBoardInteractive(true);
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
  var countdownEpoch = 0;

  function createRunId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    } catch (e) {}
    return 'hh-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  function beginCountdown() {
    if (!currentLocation) return;
    phase = 'countdown';
    setBoardInteractive(false);
    activeRun = {
      runId: createRunId(),
      locationId: currentLocation.id,
      mode: walkState.mode || 'route'
    };
    activeRunAdvanced = false;
    preloadLocationAssets(currentLocation).catch(function () {});
    preloadSharedFxLocally();
    var warmFromLocationId = currentLocation.id;
    var warmTarget = routeLocationAfter(currentLocation);
    if (nextWarmTimer) clearTimeout(nextWarmTimer);
    nextWarmTimer = setTimeout(function () {
      nextWarmTimer = 0;
      if (currentLocation && currentLocation.id === warmFromLocationId) warmNextLocation(warmTarget);
    }, 5000);
    var epoch = ++countdownEpoch;
    var cdScreen = document.getElementById('countdown-screen');
    var cdText = document.getElementById('cd-text');
    var cdStory = document.getElementById('cd-story');
    if (cdScreen) cdScreen.classList.add('show');
    if (cdText) cdText.textContent = currentLocation.name;
    if (cdStory) cdStory.textContent = currentLocation.startStory || '';
    setTimeout(function () {
      if (epoch === countdownEpoch && cdText) cdText.textContent = 'よーい…';
    }, 400);
    setTimeout(function () {
      if (epoch === countdownEpoch && cdText) cdText.textContent = 'すたーと！';
    }, 800);
    setTimeout(function () {
      if (epoch !== countdownEpoch) return;
      if (cdScreen) cdScreen.classList.remove('show');
      phase = 'playing';
      if (!tutorialOpen && !landscapeNoticeBlocking) setBoardInteractive(true);
      window._achDeferPopups = true;
      lastTs = null;
    }, 1200);
  }

  function advanceCompletedRunOnce() {
    if (activeRunAdvanced || !activeRun) return;
    var before = readWalkState();
    var after = H.advanceWalkState(before, {
      runId: activeRun.runId,
      locationId: activeRun.locationId,
      mode: activeRun.mode,
      score: state.score,
      bestCombo: state.bestCombo
    });
    var beforeRuns = Number(before.routeCompletedRuns) || 0;
    var afterRuns = Number(after.routeCompletedRuns) || 0;
    resultCompletedLap = afterRuns > beforeRuns &&
      H.ROUTE_IDS.length > 0 &&
      afterRuns % H.ROUTE_IDS.length === 0;
    walkState = writeWalkState(after);
    nextLocation = H.locationForRun(walkState);
    activeRunAdvanced = true;
  }

  function finishGame() {
    if (phase === 'result') return;
    phase = 'result';
    setBoardInteractive(false);
    hideComboHud(true);
    advanceCompletedRunOnce();
    if (window.incrementStat) window.incrementStat('hyokkori_games', 1);
    // 別タブで更新された記録も取り込み、古いページから小さい値で上書きしない。
    lifetimeBestCombo = Math.max(lifetimeBestCombo, readBestComboRecord());
    var previousBestCombo = lifetimeBestCombo;
    if (state.bestCombo > lifetimeBestCombo) {
      lifetimeBestCombo = writeBestComboRecord(state.bestCombo);
    }
    comboRecordBroken = lifetimeBestCombo > previousBestCombo;
    try {
      if (window.setStatMax) window.setStatMax('hyokkori_best_combo', state.bestCombo);
    } catch (e) {
      console.warn('[hyokkori-hightouch] きろくの共有をスキップしました:', e);
    }
    if (window.flushAchievementPopups) window.flushAchievementPopups();
    window._achDeferPopups = false;
    showResult();
  }

  function renderResultWalkProgress() {
    var progressEl = document.getElementById('walk-progress');
    var completedRuns = Number(walkState.routeCompletedRuns) || 0;
    var completedInLap = resultCompletedLap
      ? H.ROUTE_IDS.length
      : completedRuns % H.ROUTE_IDS.length;
    if (progressEl) {
      var dots = progressEl.querySelectorAll('.walk-dot');
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('is-complete', i < completedInLap);
        dots[i].classList.toggle('is-current', !resultCompletedLap && i === completedInLap);
      }
      progressEl.setAttribute('aria-label', resultCompletedLap
        ? 'もりを ひとまわり できた'
        : H.ROUTE_IDS.length + 'このうち ' + completedInLap + 'こ すすんだ');
    }
    var nextEl = document.getElementById('result-next-location');
    if (nextEl) {
      var resultStory = resultCompletedLap && currentLocation && currentLocation.afterStory
        ? currentLocation.afterStory
        : currentLocation && currentLocation.resultStory;
      nextEl.textContent = resultStory || (nextLocation ? 'つぎは ' + nextLocation.name : '');
      if (nextLocation) {
        nextEl.setAttribute('aria-label', nextEl.textContent + ' つぎは ' + nextLocation.name);
      }
    }
  }

  function showResult() {
    var scoreEl = document.getElementById('result-score');
    if (scoreEl) scoreEl.textContent = state.score + ' てん';
    var comboEl = document.getElementById('result-combo');
    if (comboEl) comboEl.textContent = 'さいだい ' + state.bestCombo + 'コンボ';
    var bestComboEl = document.getElementById('result-best-combo');
    if (bestComboEl) bestComboEl.textContent = 'きろく ' + lifetimeBestCombo + 'コンボ';
    var comboNewEl = document.getElementById('result-combo-new');
    if (comboNewEl) comboNewEl.classList.toggle('hidden', !comboRecordBroken);
    var finalBloom = !!(resultCompletedLap && currentLocation && currentLocation.id === 'moonlight_forest');
    var resultCardEl = document.getElementById('result-card');
    if (resultCardEl) resultCardEl.classList.toggle('is-final-bloom', finalBloom);
    var resultVisualEl = document.getElementById('result-visual');
    if (resultVisualEl) {
      resultVisualEl.src = ASSET_BASE + (finalBloom
        ? 'story_moon_flower_bloom.png'
        : 'pono_title_highfive.png');
      resultVisualEl.alt = finalBloom
        ? 'つきの はなが さいたよ'
        : 'ポノが ハイタッチを しているよ';
      resultVisualEl.classList.toggle('is-moon-flower', finalBloom);
    }
    var bannerEl = document.querySelector('#result-card .result-banner');
    if (bannerEl) {
      if (finalBloom) bannerEl.textContent = currentLocation.resultStory;
      else if (state.score === 0) bannerEl.textContent = 'さいごまで あそべた！';
      else bannerEl.textContent = 'ナイス ハイタッチ！';
    }
    renderResultWalkProgress();
    var rank = state.score > 0 && window.saveHighScore
      ? window.saveHighScore(HIGH_SCORE_GAME_ID, state.score)
      : 0;
    var newEl = document.getElementById('result-new');
    if (rank >= 1) {
      if (newEl) newEl.textContent = rank === 1 ? 'スコア しんきろく！' : 'スコア ベスト5！';
      if (newEl) newEl.classList.remove('hidden');
      spawnConfettiBurst(fxCanvas.width / 2, fxCanvas.height * 0.25, rank === 1 ? 50 : 22);
      if (window.Haptics) window.Haptics.fire('superBadgePop');
      playFanfare();
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
        onClick: function () { if (window.showHighScoreTable) window.showHighScoreTable(HIGH_SCORE_GAME_ID, '🖐️ ひょっこりハイタッチ ハイスコア'); }
      }]
    });
    window._menuInited = true;
  }

  var startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (startBtn.disabled || phase !== 'idle' || !currentLocation) return;
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
  var locationTransitioning = false;
  if (retryBtn) {
    retryBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (locationTransitioning || phase !== 'result' || !nextLocation) return;
      locationTransitioning = true;
      phase = 'loading';
      retryBtn.disabled = true;
      retryBtn.textContent = 'よみこみちゅう…';
      var targetLocation = nextLocation;
      swapLocation(targetLocation, false).then(function (applied) {
        if (!applied) return;
        var overlay = document.getElementById('result-overlay');
        if (overlay) overlay.classList.remove('show');
        retryBtn.disabled = false;
        retryBtn.textContent = 'さんぽを つづける';
        locationTransitioning = false;
        beginCountdown();
      }).catch(function (e2) {
        console.error('[hyokkori-hightouch] 次の場所を読み込めませんでした:', e2);
        showLoadError();
      });
    });
  }

  document.body.classList.remove('pono-game-ready');
  document.body.classList.add('pono-game-loading');
  // 旧3面ルートの完走済み端末は、正規化した5面状態を起動時に一度だけ保存し、
  // 次回以降も4面開始を安定して維持する。
  walkState = writeWalkState(readWalkState());
  currentLocation = H.locationForRun(walkState);
  swapLocation(currentLocation, true).then(function (applied) {
    if (!applied) return;
    phase = 'idle';
    if (startBtn) startBtn.disabled = false;
  }).catch(function (e) {
    console.error('[hyokkori-hightouch] 最初の場所を読み込めませんでした:', e);
    showLoadError();
  });

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
          setBoardInteractive(false);
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

      if (phase === 'settling' && (occupiedHoleIndices().length === 0 || settleTimer >= 1)) {
        finishGame();
      }
    }

    updateAndDrawConfetti(dt);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  }

  // ═══ ブート判定: locations.js / logic.js を1回だけキャッシュバイパス再試行 ═══
  function dependenciesReady() {
    return !!(window.HyokkoriLocations && window.HyokkoriLogic);
  }

  if (dependenciesReady()) { boot(); return; }

  var retryQueue = [];
  if (!window.HyokkoriLocations) retryQueue.push('js/locations.js');
  if (!window.HyokkoriLogic) retryQueue.push('js/logic.js');
  console.error('[hyokkori-hightouch] 必須スクリプトが読み込まれていません — キャッシュバイパスで再試行します:', retryQueue);

  function loadRetryScriptAt(index) {
    if (index >= retryQueue.length) {
      if (dependenciesReady()) boot();
      else showLoadError();
      return;
    }
    var retryScript = document.createElement('script');
    retryScript.src = retryQueue[index] + '?retry=' + Date.now();
    retryScript.onload = function () { loadRetryScriptAt(index + 1); };
    retryScript.onerror = function () { showLoadError(); };
    document.body.appendChild(retryScript);
  }
  loadRetryScriptAt(0);
})();
