// ── hatake-nikki/js/game.js ──
// ポノのはたけにっき: DOM/描画/入力 (DOM 依存)。
// 純粋ロジック (成長段階/日付ロールオーバー/キャッチアップ) は js/logic.js の
// window.HatakeLogic を参照する。
//
// NOTE: cloud-sync (端末間同期) は意図的にスコープ外。localStorage のみで完結。
// 将来 common/cloud-sync.js に統合する場合は lastSeenKey ベースの単調マージを検討
// (時刻チートは種解放が早まる程度なので防御しない)。
'use strict';

// ═══ 純関数ブロック (トップレベル。node から vm slice して直接テスト可能) ═══
// 画面遷移は .show クラスの付け外しのみで行う (hidden 属性には依存しない。
// donguri-wakekko の hidden×無条件display事故の再発防止 / CLAUDE.md 準拠)。
function createScreenController(screens) {
  // EXCLUSIVE: 同時に1つしか表示されない排他画面。それ以外 (overlay系: diary-overlay /
  // zukan-overlay / seed-picker) は show() 呼び出し時に既存の表示状態 (=field-screen 等)
  // を一切変更せず .show を追加するだけ (排他ループを回すのは id が EXCLUSIVE 自身の
  // ときだけに限定する。ここを誤って常時ループすると overlay 表示時に field-screen の
  // show が巻き添えで外れてしまう)。
  var EXCLUSIVE = ['start-screen', 'field-screen'];
  return {
    show: function (id) {
      if (EXCLUSIVE.indexOf(id) !== -1) {
        for (var i = 0; i < EXCLUSIVE.length; i++) {
          var k = EXCLUSIVE[i];
          if (screens[k]) screens[k].classList[k === id ? 'add' : 'remove']('show');
        }
        return;
      }
      if (screens[id]) screens[id].classList.add('show'); // overlay 系
    },
    hide: function (id) {
      if (screens[id]) screens[id].classList.remove('show');
    }
  };
}

// ═══ DOM 制御ブロック (node からは実行されない) ═══
(function () {
  if (typeof document === 'undefined') return;

  var L = window.HatakeLogic;
  if (!L) { console.error('[hatake-nikki] HatakeLogic (js/logic.js) が読み込まれていません'); return; }

  var STATE_KEY = 'pono_hatake_state_v1';
  var ZUKAN_KEY = 'pono_hatake_zukan_v1';

  // ═══ 画面遷移コントローラ ═══
  var screens = {
    'start-screen': document.getElementById('start-screen'),
    'field-screen': document.getElementById('field-screen'),
    'diary-overlay': document.getElementById('diary-overlay'),
    'zukan-overlay': document.getElementById('zukan-overlay'),
    'seed-picker': document.getElementById('seed-picker')
  };
  var screenCtl = createScreenController(screens);

  // ═══ 横画面強制 (hyokkori-hightouch/js/game.js の updateLandscapeNotice を踏襲) ═══
  function updateLandscapeNotice() {
    var notice = document.getElementById('landscape-notice');
    if (!notice) return;
    var isPortrait = window.innerHeight >= window.innerWidth;
    var isTouch = matchMedia('(pointer: coarse)').matches;
    var show = isPortrait && isTouch;
    notice.style.display = show ? 'flex' : 'none';
    notice.setAttribute('aria-hidden', show ? 'false' : 'true');
  }
  updateLandscapeNotice();
  window.addEventListener('orientationchange', function () {
    setTimeout(updateLandscapeNotice, 100);
    setTimeout(updateLandscapeNotice, 500);
  });
  window.addEventListener('resize', updateLandscapeNotice);

  // ═══ セーブ / ロード ═══
  function loadState() {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(STATE_KEY)); } catch (e) { raw = null; }
    return L.normalizeState(raw);
  }
  function saveState() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(appState)); } catch (e) {}
  }
  function loadZukan() {
    try {
      var raw = JSON.parse(localStorage.getItem(ZUKAN_KEY));
      if (raw && typeof raw === 'object') return raw;
    } catch (e) {}
    return {};
  }
  function saveZukan() {
    try { localStorage.setItem(ZUKAN_KEY, JSON.stringify(zukanState)); } catch (e) {}
  }

  // ═══ ゲーム状態 ═══
  var appState = loadState();
  var zukanState = loadZukan();
  var activeTool = null;      // null | 'water' | 'seed'
  var pendingSeedId = null;   // 'seed' ツール選択後、次にタップした空plotへ植える
  var plotPress = [null, null, null];

  // ═══ DOM 参照 ═══
  var hudDateEl = document.getElementById('hud-date');
  var zukanGridEl = document.getElementById('zukan-grid');
  var diaryTextEl = document.getElementById('diary-text');
  var toolWaterBtn = document.getElementById('tool-water-btn');
  var toolSeedBtn = document.getElementById('tool-seed-btn');
  var hintToastEl = document.getElementById('hint-toast');
  var hintToastTimer = null;

  var plotRefs = [];
  var plotEls = document.querySelectorAll('.plot');
  for (var pi = 0; pi < plotEls.length; pi++) {
    var plotEl = plotEls[pi];
    var idx = parseInt(plotEl.getAttribute('data-plot'), 10);
    plotRefs[idx] = {
      el: plotEl,
      plantEl: plotEl.querySelector('.plant'),
      bugEl: plotEl.querySelector('.bug-sprite'),
      gaugeFillEl: plotEl.querySelector('.water-gauge-fill')
    };
  }

  // ═══ 水やり discoverability: ヒントトースト + 対象畝パルス ═══
  function showHintToast(text) {
    if (!hintToastEl) return;
    hintToastEl.textContent = text;
    hintToastEl.classList.add('is-visible');
    if (hintToastTimer) clearTimeout(hintToastTimer);
    hintToastTimer = setTimeout(function () {
      hintToastEl.classList.remove('is-visible');
    }, 1600);
  }

  // activeTool や plots の状態が変わったら必ずこれを呼び、水ツール選択中の
  // 水やり可能な畝 (植栽済み) だけをパルスさせて誘導する。
  function updateWaterTargets() {
    for (var wi = 0; wi < plotRefs.length; wi++) {
      if (!plotRefs[wi]) continue;
      var on = (activeTool === 'water') && !!appState.plots[wi].seedId;
      plotRefs[wi].el.classList.toggle('is-water-target', on);
    }
  }

  // ═══ 描画 ═══
  function renderHud() {
    if (!hudDateEl) return;
    var parts = String(appState.lastSeenKey || '').split('-');
    if (parts.length === 3) {
      hudDateEl.textContent = '📅 ' + Number(parts[1]) + '/' + Number(parts[2]);
    }
  }

  function renderPlot(idx) {
    var refs = plotRefs[idx];
    if (!refs) return;
    var plot = appState.plots[idx];
    var stage = L.stageOf(plot);
    refs.plantEl.setAttribute('data-stage', String(stage));
    refs.plantEl.classList.toggle('is-wilted', !!plot.wilted);
    refs.plantEl.innerHTML = '';
    if (stage === 0) {
      var spanSeed = document.createElement('span');
      spanSeed.className = 'plant-emoji';
      spanSeed.textContent = '🌱';
      refs.plantEl.appendChild(spanSeed);
    } else if (stage === 1) {
      var spanSprout = document.createElement('span');
      spanSprout.className = 'plant-emoji';
      spanSprout.textContent = '🌿';
      refs.plantEl.appendChild(spanSprout);
    } else if (stage === 2 || stage === 3) {
      var crop = L.CROPS[plot.seedId];
      if (crop) {
        var img = document.createElement('img');
        img.className = 'crop-img';
        img.src = crop.img;
        img.alt = crop.name;
        img.draggable = false;
        refs.plantEl.appendChild(img);
      }
    }
    if (refs.bugEl) refs.bugEl.classList.toggle('is-visible', !!plot.bug);
  }

  function renderAllPlots() {
    for (var i = 0; i < appState.plots.length; i++) renderPlot(i);
  }

  function renderZukan() {
    if (!zukanGridEl) return;
    zukanGridEl.innerHTML = '';
    var cropIds = Object.keys(L.CROPS);
    for (var i = 0; i < cropIds.length; i++) {
      var cropId = cropIds[i];
      var crop = L.CROPS[cropId];
      var entry = zukanState[cropId] || { count: 0 };
      var wrap = document.createElement('div');
      wrap.className = 'zukan-entry' + ((entry.count || 0) > 0 ? '' : ' is-unknown');
      var img = document.createElement('img');
      img.src = crop.img;
      img.alt = crop.name;
      var name = document.createElement('div');
      name.className = 'zukan-name';
      name.textContent = crop.name;
      var count = document.createElement('div');
      count.className = 'zukan-count';
      count.textContent = (entry.count || 0) + 'こ しゅうかく';
      wrap.appendChild(img);
      wrap.appendChild(name);
      wrap.appendChild(count);
      zukanGridEl.appendChild(wrap);
    }
  }

  // ═══ アクション ═══
  function doWater(idx) {
    if (!L.waterPlot(appState, idx)) return;
    saveState();
    if (window.Haptics) window.Haptics.fire('stickerPaste');
    renderPlot(idx);
    updateWaterTargets();
  }

  function doShooBug(idx) {
    var refs = plotRefs[idx];
    L.shooBug(appState, idx);
    saveState();
    if (window.Haptics) window.Haptics.fire('capsuleCrack');
    if (refs && refs.bugEl) {
      refs.bugEl.classList.add('is-fleeing');
      setTimeout(function () {
        refs.bugEl.classList.remove('is-fleeing', 'is-visible');
      }, 400);
    }
  }

  function doHarvest(idx) {
    var res = L.harvest(appState, idx);
    if (!res.ok) return;
    var crop = L.CROPS[res.seedId];
    var entry = zukanState[res.seedId] || { count: 0, firstDate: null };
    if (!entry.firstDate) entry.firstDate = appState.lastSeenKey;
    entry.count = (entry.count || 0) + 1;
    zukanState[res.seedId] = entry;
    saveZukan();
    saveState();
    renderPlot(idx);
    updateWaterTargets();
    if (window.Haptics) window.Haptics.fire('superBadgePop');
    if (window.incrementStat) {
      window.incrementStat('hatake_harvest', 1);
      if (window.checkAchievements) window.checkAchievements();
    }
    // Narration: MVP では呼ばない (キャラ肉声禁止ポリシー + 音声未生成)。
    // 将来: 女性ナレ「やさいが よろこんでいるよ」型のみ可。
    if (window.showTreasure && crop) {
      window.showTreasure({
        name: crop.name,
        img: crop.img,
        label: 'しゅうかく！',
        onClose: function () {}
      });
    }
  }

  function doPlant(idx) {
    if (!pendingSeedId) return;
    var ok = L.plantSeed(appState, idx, pendingSeedId);
    if (!ok) return;
    pendingSeedId = null;
    activeTool = null;
    if (toolSeedBtn) toolSeedBtn.classList.remove('is-active');
    saveState();
    renderPlot(idx);
    updateWaterTargets();
  }

  function doTapAction(idx) {
    var plot = appState.plots[idx];
    if (pendingSeedId && !plot.seedId) {
      doPlant(idx);
      return;
    }
    if (L.stageOf(plot) === 3) {
      doHarvest(idx);
    }
  }

  // ═══ ジェスチャー: 水やり(長押し800ms) / 虫のフリック / タップ(植える・しゅうかく) ═══
  // memory: feedback_ios_pointercancel_native_pan — pointerdown/up だけで
  // 「指が接地中」を追跡しない。touchstart/touchend/touchcancel を必ず併用する。
  var WATER_HOLD_MS = 800;
  var FLICK_DIST = 40;
  var TAP_MOVE_TOLERANCE = 24;

  function beginPress(idx, touch, onBug) {
    var refs = plotRefs[idx];
    var st = { x: touch.clientX, y: touch.clientY, onBug: !!onBug, timerId: null };
    plotPress[idx] = st;
    if (st.onBug) return;
    var plot = appState.plots[idx];
    if (activeTool === 'water' && plot.seedId) {
      refs.el.classList.add('is-watering');
      if (refs.gaugeFillEl) {
        // 800ms かけて 0%→100% まで満ちるアニメーション (CSS transition: width 800ms linear と対)。
        // 先に 0% へ同期リセットしてから rAF で 100% を書き込むことで、
        // ブラウザに「0%→100%への遷移」を必ず1フレーム分認識させる (即100%指定だと
        // transition がスキップされ瞬時に満タン表示になる場合があるため)。
        refs.gaugeFillEl.style.transition = 'none';
        refs.gaugeFillEl.style.width = '0%';
        // 強制 reflow でスタイル即時反映 (transition:none を確実に効かせる)
        void refs.gaugeFillEl.offsetWidth;
        refs.gaugeFillEl.style.transition = '';
        requestAnimationFrame(function () {
          if (refs.gaugeFillEl) refs.gaugeFillEl.style.width = '100%';
        });
      }
      st.timerId = setTimeout(function () {
        st.timerId = null;
        plotPress[idx] = null;
        refs.el.classList.remove('is-watering');
        if (refs.gaugeFillEl) refs.gaugeFillEl.style.width = '0%';
        doWater(idx);
      }, WATER_HOLD_MS);
    } else {
      if (activeTool === 'water' && !plot.seedId) {
        showHintToast('🌱 まず たねを うえてね');
        if (window.Haptics) window.Haptics.fire('stickerPaste');
      }
      refs.el.classList.add('is-pressed');
    }
  }

  function endPress(idx, endX, endY) {
    var refs = plotRefs[idx];
    var st = plotPress[idx];
    plotPress[idx] = null;
    if (!st) return;
    if (st.timerId) { clearTimeout(st.timerId); st.timerId = null; }
    refs.el.classList.remove('is-watering', 'is-pressed');
    if (refs.gaugeFillEl) refs.gaugeFillEl.style.width = '0%';

    var dx = (typeof endX === 'number') ? endX - st.x : 0;
    var dy = (typeof endY === 'number') ? endY - st.y : 0;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (st.onBug) {
      if (dist >= FLICK_DIST) doShooBug(idx);
      return;
    }
    if (dist <= TAP_MOVE_TOLERANCE) {
      doTapAction(idx);
    }
  }

  function cancelPress(idx) {
    var refs = plotRefs[idx];
    var st = plotPress[idx];
    plotPress[idx] = null;
    if (st && st.timerId) clearTimeout(st.timerId);
    if (refs) {
      refs.el.classList.remove('is-watering', 'is-pressed');
      if (refs.gaugeFillEl) refs.gaugeFillEl.style.width = '0%';
    }
  }

  for (var gi = 0; gi < plotRefs.length; gi++) {
    (function (idx) {
      var refs = plotRefs[idx];
      if (!refs) return;
      refs.el.addEventListener('touchstart', function (e) {
        var t = e.changedTouches[0];
        if (!t) return;
        var onBug = !!(refs.bugEl && appState.plots[idx].bug && e.target && refs.bugEl.contains(e.target));
        beginPress(idx, t, onBug);
      }, { passive: true });
      refs.el.addEventListener('touchend', function (e) {
        var t = e.changedTouches[0];
        endPress(idx, t ? t.clientX : null, t ? t.clientY : null);
      }, { passive: true });
      refs.el.addEventListener('touchcancel', function () {
        cancelPress(idx);
      }, { passive: true });
    })(gi);
  }

  // ═══ HUD / ツール / モーダル操作 ═══
  var zukanOpenBtn = document.getElementById('zukan-open-btn');
  if (zukanOpenBtn) {
    zukanOpenBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      renderZukan();
      screenCtl.show('zukan-overlay');
    });
  }
  var zukanCloseBtn = document.getElementById('zukan-close-btn');
  if (zukanCloseBtn) {
    zukanCloseBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      screenCtl.hide('zukan-overlay');
    });
  }
  var diaryCloseBtn = document.getElementById('diary-close-btn');
  if (diaryCloseBtn) {
    diaryCloseBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      screenCtl.hide('diary-overlay');
    });
  }
  if (toolWaterBtn) {
    toolWaterBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      activeTool = (activeTool === 'water') ? null : 'water';
      pendingSeedId = null;
      toolWaterBtn.classList.toggle('is-active', activeTool === 'water');
      if (toolSeedBtn) toolSeedBtn.classList.remove('is-active');
      updateWaterTargets();
    });
  }
  if (toolSeedBtn) {
    toolSeedBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      screenCtl.show('seed-picker');
    });
  }
  var seedChoiceEls = document.querySelectorAll('.seed-choice');
  for (var sci = 0; sci < seedChoiceEls.length; sci++) {
    (function (btn) {
      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault(); e.stopPropagation();
        pendingSeedId = btn.getAttribute('data-seed');
        activeTool = 'seed';
        if (toolWaterBtn) toolWaterBtn.classList.remove('is-active');
        if (toolSeedBtn) toolSeedBtn.classList.add('is-active');
        screenCtl.hide('seed-picker');
        updateWaterTargets();
      });
    })(seedChoiceEls[sci]);
  }
  // ── 種ピッカーを閉じる導線 (diary/zukan と同様の逃げ道を用意する。
  //    誤タップで開いても閉じられないトラップ状態にしない) ──
  function closeSeedPicker() {
    pendingSeedId = null;
    activeTool = null;
    if (toolSeedBtn) toolSeedBtn.classList.remove('is-active');
    screenCtl.hide('seed-picker');
    updateWaterTargets();
  }
  var seedPickerCloseBtn = document.getElementById('seed-picker-close-btn');
  if (seedPickerCloseBtn) {
    seedPickerCloseBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      closeSeedPicker();
    });
  }
  var seedPickerEl = document.getElementById('seed-picker');
  if (seedPickerEl) {
    // バックドロップ (カード外側) タップでも閉じられるようにする。
    seedPickerEl.addEventListener('pointerdown', function (e) {
      if (e.target === seedPickerEl) closeSeedPicker();
    });
  }

  // ═══ チュートリアル (共通 tut-dim/tut-bubble パターン。hyokkori-hightouch 踏襲) ═══
  var TUT_STEPS = [
    { icon: '🚿', text: 'じょうろボタンを えらんで<br>はたけを おしつづけると みずやりできるよ' },
    { icon: '🐞', text: 'むしが きたら ゆびで はじいて<br>とばしてあげてね' },
    { icon: '🥕', text: 'ぴかぴか ひかったら しゅうかくのサイン！<br>タップして とろう' }
  ];
  var tutStep = 0;
  function showTutorial() {
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
    bubble.innerHTML = '<div class="tut-icon">' + step.icon + '</div>' + step.text +
      '<br><button class="tut-next-btn" id="tut-next">' + (tutStep < TUT_STEPS.length - 1 ? 'つぎへ' : 'とじる') + '</button>';
    document.getElementById('tut-next').addEventListener('pointerdown', onTutNext);
  }
  function closeTutorial() {
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
  if (tutDimEl) tutDimEl.addEventListener('pointerdown', closeTutorial);

  function startMenuOnce() {
    if (window._hatakeMenuInited || typeof window.initMenu !== 'function') return;
    window.initMenu({ tutorial: showTutorial });
    window._hatakeMenuInited = true;
  }

  // ═══ ゲームフロー: start-screen → (catchUpDays) → field-screen [→ diary-overlay] ═══
  var TUT_SEEN_KEY = 'pono_hatake_tut_seen_v1';
  function startGame() {
    appState = loadState();
    var todayKey = L.dateKey(L.getNow());
    var result = L.catchUpDays(appState, todayKey);
    saveState();
    renderHud();
    renderAllPlots();
    updateWaterTargets();
    screenCtl.show('field-screen');
    if (result.daysPassed >= 1 && diaryTextEl) {
      diaryTextEl.textContent = result.daysPassed + 'にちぶり！ おかえりなさい';
      screenCtl.show('diary-overlay');
    }

    var tutSeen = false;
    try { tutSeen = localStorage.getItem(TUT_SEEN_KEY) === '1'; } catch (e) {}
    if (!tutSeen) {
      try { localStorage.setItem(TUT_SEEN_KEY, '1'); } catch (e) {}
      showTutorial();
    }
  }

  var startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      startMenuOnce();
      startGame();
    });
  }
})();
