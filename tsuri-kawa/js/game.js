// ── tsuri-kawa/js/game.js ──
// ポノの かわづり (Phase 0 川づりMVP): DOM/描画/入力・ゲームループ (DOM 依存)。
// 純粋な状態機械は common/tsuri/core.js の window.PonoTsuriCore、
// 川づり固有のチューニング/セーブ形状は js/logic.js の window.TsuriKawaLogic、
// 魚マスターデータは common/tsuri/fish-data.js の window.PonoFishData、
// タップ入力は common/tsuri/input.js の window.PonoTsuriInput を参照する。
'use strict';

(function () {

  // ═══ 読み込み失敗フォールバック ═══
  // 依存モジュール (fish-data/core/input/logic) のいずれかが読み込みに失敗すると
  // 「タイトルは見えるがタップ無反応」になる既知の事故パターン (guragura-seesaw /
  // hyokkori-hightouch 2026-07-22/23 報告) の再発防止。1回だけキャッシュバイパスで
  // 再試行し、それでも揃わなければ再読込UIへ縮退する。
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

  // ═══ DOM 参照 ═══
  var playScreenEl = document.getElementById('playScreen');
  var narrationEl = document.getElementById('narrationBar');
  var bucketListEl = document.getElementById('bucketList');
  var bucketCountEl = document.getElementById('bucketCount');
  var castSpotEls = document.querySelectorAll('.cast-spot');
  var bobberEl = document.getElementById('bobber');
  var splashRingEl = document.getElementById('splashRing');
  var biteWrapEl = document.getElementById('biteWindowWrap');
  var biteFillEl = document.getElementById('biteWindowFill');
  var rendaWrapEl = document.getElementById('rendaWrap');
  var rendaFillEl = document.getElementById('rendaGaugeFill');
  var catchOverlayEl = document.getElementById('catchOverlay');
  var catchIconEl = document.getElementById('catchIcon');
  var catchNameEl = document.getElementById('catchName');
  var catchLabelEl = document.getElementById('catchLabel');
  var escapeOverlayEl = document.getElementById('escapeOverlay');
  var helpOverlayEl = document.getElementById('helpOverlay');
  var anglerEl = document.getElementById('angler');

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
  var lastCastSpotPos = { left: 50, top: 60 };
  var biteWindowStartSec = 0;
  var preBiteShown = false;
  var pendingRestartTimer = null;

  function setNarration(text) {
    narrationEl.textContent = text;
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

  // ═══ ウキ (ぼぼば) ═══
  function positionAt(el, pos) {
    el.style.left = pos.left + '%';
    el.style.top = pos.top + '%';
  }
  function showBobber(pos) {
    positionAt(bobberEl, pos);
    bobberEl.classList.remove('is-gabo', 'is-twitch');
    bobberEl.classList.add('show', 'is-idle-float');
  }
  function hideBobber() {
    bobberEl.classList.remove('show', 'is-idle-float', 'is-twitch', 'is-gabo');
  }
  function showSplash(pos) {
    positionAt(splashRingEl, pos);
    splashRingEl.classList.remove('show');
    void splashRingEl.offsetWidth;
    splashRingEl.classList.add('show');
  }

  // ═══ フェーズ導入 UI (tick 由来 / タップ由来 の両方から共有呼び出しする) ═══
  function enterBiteUI() {
    biteWindowStartSec = session.biteWindowRemainingSec > 0 ? session.biteWindowRemainingSec : 1;
    biteFillEl.style.width = '100%';
    bobberEl.classList.remove('is-idle-float', 'is-twitch');
    bobberEl.classList.add('show', 'is-gabo');
    showSplash(lastCastSpotPos);
    biteWrapEl.classList.add('show');
    if (window.Haptics) window.Haptics.fire('fishingBite');
    setNarration('いまだ！ タップ！');
  }

  function enterRendaUI() {
    biteWrapEl.classList.remove('show');
    bobberEl.classList.remove('show', 'is-gabo', 'is-twitch', 'is-idle-float');
    rendaFillEl.style.width = Math.max(0, session.gaugePct) + '%';
    rendaWrapEl.classList.add('show');
    setNarration('ぽんぽん タップで ひっぱろう！');
  }

  function enterEscapedUI() {
    biteWrapEl.classList.remove('show');
    rendaWrapEl.classList.remove('show');
    hideBobber();
    setNarration('およいで いっちゃった。でも また くるよ');
    showOverlay(escapeOverlayEl);
    scheduleAutoReadyToCast(1600);
  }

  function onFishLanded(helped) {
    rendaWrapEl.classList.remove('show');
    biteWrapEl.classList.remove('show');
    hideBobber();

    var species = Logic.getSpeciesById(session.speciesId);
    if (!species) { scheduleAutoReadyToCast(400); return; } // 防御的 (未知 speciesId)

    if (window.incrementStat) {
      try { window.incrementStat('tsuri_kawa_catches', 1); } catch (e) {}
    }

    if (helped) {
      setNarration('ポノも てつだうよ！');
      showOverlay(helpOverlayEl);
    }

    var event = Logic.buildCatchEvent(species);
    var applied = Logic.applyCatchEvent(save, event);
    save = applied.save;
    persistSave();

    var icon = SPECIES_ICON[species.id] || (species.edible ? '🐟' : '🎁');
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

    var catchDelay = helped ? 900 : 0;
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
      showCastSpots();
    }, delayMs);
  }

  // ═══ タップ入力 (iOS pointercancel 対応込みの common/tsuri/input.js を使用) ═══
  function onCastSpotTap(el) {
    if (!session) return;
    if (!(session.phase === 'idle' || Core.isTerminal(session))) return; // 二重発火防止
    if (pendingRestartTimer) { clearTimeout(pendingRestartTimer); pendingRestartTimer = null; }
    var left = parseFloat(el.style.left) || 50;
    var top = parseFloat(el.style.top) || 60;
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
    showBobber(lastCastSpotPos);
    setNarration('ウキを みててね');
  }

  function onBiteTap() {
    if (!session || session.phase !== 'bite') return;
    session = Core.tapHook(session);
    if (session.phase === 'renda') enterRendaUI();
  }

  function onRendaTap() {
    if (!session || session.phase !== 'renda') return;
    var species = Logic.getSpeciesById(session.speciesId);
    session = Core.tapRenda(session, species, Core.GEAR_MODS_NEUTRAL);
    if (session.phase === 'renda') {
      rendaFillEl.style.width = Math.max(0, Math.min(100, session.gaugePct)) + '%';
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
  Input.attachTap(playScreenEl, function () {
    if (!session) return;
    if (session.phase === 'bite') onBiteTap();
    else if (session.phase === 'renda') onRendaTap();
  });

  // ═══ ゲームフロー: title → playing (継続ループ、5匹区切り等はPhase1以降) ═══
  function startGame() {
    session = Core.createSession({ speciesPool: SPECIES_POOL, mode: 'relaxed' });
    bucketSessionCatches = [];
    renderBucket();
    preBiteShown = false;
    biteWindowStartSec = 0;
    clearOverlays();
    hideBobber();
    showScreen('playScreen');
    setNarration('すきな ばしょに なげてみよう！');
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
        var near = session.waitRemainingSec <= 1.0 && session.waitRemainingSec > 0;
        if (near && !preBiteShown) {
          preBiteShown = true;
          bobberEl.classList.remove('is-idle-float');
          bobberEl.classList.add('is-twitch');
          setNarration('…きたかも？');
        }
      } else if (session.phase === 'bite' && biteWindowStartSec > 0) {
        var frac = Math.max(0, Math.min(1, session.biteWindowRemainingSec / biteWindowStartSec));
        biteFillEl.style.width = (frac * 100) + '%';
      } else if (session.phase === 'renda') {
        rendaFillEl.style.width = Math.max(0, Math.min(100, session.gaugePct)) + '%';
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
