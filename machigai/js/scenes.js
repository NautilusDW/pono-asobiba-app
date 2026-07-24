/* まちがいさがしランド — scenes.js
 * engine担当。loading / title / select / game / clear の各シーンを構築する。
 * window.MSL.Scenes に { name: function(container, params) -> {destroy} } を公開する。
 * main.js が MSL.Main.goto() でシーンを差し替える。表示先コンテナは #scene-root の子として渡される。
 */
(function () {
  'use strict';

  var Audio = null;
  var Speech = null;
  var FX = null;
  var Game = null;

  function deps() {
    Audio = window.MSL.Audio;
    Speech = window.MSL.Speech;
    FX = window.MSL.FX;
    Game = window.MSL.Game;
  }

  /* ---------- 小さなDOMヘルパ ---------- */

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function noop() {}

  function goto(name, params) {
    window.MSL.Main.goto(name, params);
  }

  function completionNarrationText() {
    var catalog = window.MACHIGAI_NARRATION;
    return (catalog && catalog.completionText) || 'ぜんぶ みつけた！すごい！';
  }

  function getStageStatus(id) {
    var status = window.MSL.Main.stageStatus || {};
    if (Object.prototype.hasOwnProperty.call(status, id)) return status[id];
    return true; // 未計測なら失敗扱いにしない
  }

  function muteIcon() {
    return Audio.isMuted() ? '🔇' : '🔊';
  }

  function bindMuteToggle(btn) {
    btn.textContent = muteIcon();
    btn.addEventListener('pointerdown', function (evt) {
      evt.preventDefault();
      Audio.toggleMuted();
      Speech.setMuted(Audio.isMuted());
      btn.textContent = muteIcon();
    });
  }

  /** ☆☆☆ の行を作る。setFilled(n) で左からn個を★にする（差分アニメ付き） */
  function buildStarsRow(total, rowClass, starClass) {
    var row = el('div', rowClass);
    var stars = [];
    for (var i = 0; i < total; i++) {
      var s = el('span', starClass, '☆');
      row.appendChild(s);
      stars.push(s);
    }
    function setFilled(count) {
      for (var i = 0; i < stars.length; i++) {
        if (i < count) {
          if (!stars[i].classList.contains('filled')) {
            stars[i].textContent = '★';
            stars[i].classList.add('filled');
          }
        }
      }
    }
    return { el: row, setFilled: setFilled };
  }

  function prepBox(message) {
    var box = el('div', 'prep-box');
    box.appendChild(el('div', 'icon', '🧸'));
    box.appendChild(el('div', 'msg', message || 'じゅんびちゅう… もうすこし まっててね'));
    return box;
  }

  /* ==================================================================
   * loading シーン
   * ================================================================== */

  function loadingScene(container) {
    deps();
    container.classList.add('scene-loading');
    var timers = [];

    var ready = Game.isDataReady();

    if (!ready) {
      var box = prepBox();
      container.appendChild(box);
      var t = window.setTimeout(function () {
        goto('title');
      }, 900);
      timers.push(t);
      return {
        destroy: function () {
          timers.forEach(window.clearTimeout);
        }
      };
    }

    container.appendChild(el('div', 'loading-logo', 'まちがいさがしランド'));
    container.appendChild(el('div', 'loading-sub', 'よみこみちゅう...'));
    var track = el('div', 'loading-bar-track');
    var fill = el('div', 'loading-bar-fill');
    track.appendChild(fill);
    container.appendChild(track);
    var dots = el('div', 'loading-dots');
    dots.appendChild(el('span'));
    dots.appendChild(el('span'));
    dots.appendChild(el('span'));
    container.appendChild(dots);

    var stages = Game.getStages();
    var total = stages.length * 3; // imgA, imgB, thumb
    var loaded = 0;
    var status = {};
    var startedAt = Date.now();
    var finished = false;
    var IMG_TIMEOUT_MS = 6000;
    var MIN_VISIBLE_MS = 500;
    var HARD_TIMEOUT_MS = 8000;

    function bump() {
      loaded++;
      var pct = total > 0 ? Math.round((loaded / total) * 100) : 100;
      fill.style.width = pct + '%';
    }

    function loadOne(src) {
      return new Promise(function (resolve) {
        var img = new Image();
        var done = false;
        var timer = window.setTimeout(function () {
          if (done) return;
          done = true;
          bump();
          resolve(false);
        }, IMG_TIMEOUT_MS);
        timers.push(timer);
        img.onload = function () {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          bump();
          resolve(true);
        };
        img.onerror = function () {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          bump();
          resolve(false);
        };
        img.src = src;
      });
    }

    function finish() {
      if (finished) return;
      finished = true;
      window.MSL.Main.stageStatus = status;
      var elapsed = Date.now() - startedAt;
      var wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      var t = window.setTimeout(function () {
        goto('title');
      }, wait);
      timers.push(t);
    }

    var hardTimer = window.setTimeout(finish, HARD_TIMEOUT_MS);
    timers.push(hardTimer);

    var perStage = stages.map(function (stage) {
      return Promise.all([
        loadOne(stage.imgA),
        loadOne(stage.imgB),
        loadOne(stage.thumb)
      ]).then(function (results) {
        status[stage.id] = results[0] && results[1] && results[2];
      });
    });

    Promise.all(perStage).then(finish);

    return {
      destroy: function () {
        timers.forEach(window.clearTimeout);
      }
    };
  }

  /* ==================================================================
   * title シーン
   * ================================================================== */

  function buildBackgroundDeco(container) {
    var clouds = 5;
    for (var i = 0; i < clouds; i++) {
      var c = el('div', 'bg-cloud');
      var size = 80 + Math.random() * 90;
      c.style.width = size + 'px';
      c.style.height = size * 0.6 + 'px';
      c.style.top = 40 + Math.random() * 260 + 'px';
      c.style.left = '-160px';
      c.style.animation = 'drift ' + (18 + Math.random() * 14) + 's linear infinite';
      c.style.animationDelay = -(Math.random() * 20) + 's';
      container.appendChild(c);
    }
    var sparkles = 10;
    for (var j = 0; j < sparkles; j++) {
      var s = el('div', 'bg-sparkle', '✨');
      s.style.left = Math.random() * 1560 + 20 + 'px';
      s.style.top = Math.random() * 820 + 40 + 'px';
      s.style.animationDelay = -(Math.random() * 2.4) + 's';
      container.appendChild(s);
    }
  }

  function titleScene(container) {
    deps();
    container.classList.add('scene-title');
    buildBackgroundDeco(container);

    if (!Game.isDataReady()) {
      container.appendChild(el('div', 'title-ready-badge', 'じゅんびちゅう'));
    }

    container.appendChild(el('div', 'title-logo', 'まちがいさがしランド'));

    var playBtn = el('button', 'msl-btn primary big title-play-btn', 'あそぶ ▶');
    container.appendChild(playBtn);

    var muteBtn = el('button', 'msl-btn round mute-toggle title-mute');
    container.appendChild(muteBtn);
    bindMuteToggle(muteBtn);

    // ポノのあそびば ハブへ戻る導線（タイトル画面のみ。ゲーム中/選択画面の
    // ⌂ ボタンは既存どおり select 画面へ戻る挙動のまま変更しない）。
    var homeBtn = el('button', 'msl-btn round home title-home', '🏠');
    container.appendChild(homeBtn);

    function onPlay(evt) {
      evt.preventDefault();
      Audio.resume();
      Audio.playTap();
      goto('select');
    }
    playBtn.addEventListener('pointerdown', onPlay);

    function onHome(evt) {
      evt.preventDefault();
      Audio.playTap();
      window.location.href = '../play.html';
    }
    homeBtn.addEventListener('pointerdown', onHome);

    return {
      destroy: function () {
        playBtn.removeEventListener('pointerdown', onPlay);
        homeBtn.removeEventListener('pointerdown', onHome);
      }
    };
  }

  /* ==================================================================
   * select シーン
   * ================================================================== */

  var SELECT_PAGE_SIZE = 6; // 2行×3列

  function selectScene(container) {
    deps();
    container.classList.add('scene-select');

    var topbar = el('div', 'select-topbar');
    var homeBtn = el('button', 'msl-btn round home', '⌂');
    topbar.appendChild(homeBtn);
    topbar.appendChild(el('div', 'select-title', 'ステージを えらんでね'));
    var spacer = el('div', 'msl-btn round');
    spacer.style.visibility = 'hidden';
    spacer.style.pointerEvents = 'none';
    topbar.appendChild(spacer);
    container.appendChild(topbar);

    function onHome(evt) {
      evt.preventDefault();
      Audio.playTap();
      goto('title');
    }
    homeBtn.addEventListener('pointerdown', onHome);

    var stages = Game.isDataReady() ? Game.getStages() : [];
    var totalPages = Math.max(1, Math.ceil(stages.length / SELECT_PAGE_SIZE));
    var pagingActive = stages.length > SELECT_PAGE_SIZE; // 6件以下は矢印・ドット非表示（現行構成の見た目維持）
    var currentPage = 0; // シーン再入場のたび1ページ目にリセット

    var body = el('div', 'select-body');
    container.appendChild(body);

    var prevBtn = el('button', 'msl-btn round arrow-btn prev', '◀');
    var grid = el('div', 'select-grid' + (pagingActive ? ' paged' : ''));
    var nextBtn = el('button', 'msl-btn round arrow-btn next', '▶');
    body.appendChild(prevBtn);
    body.appendChild(grid);
    body.appendChild(nextBtn);

    var dots = el('div', 'select-dots');
    body.appendChild(dots);

    if (!pagingActive) {
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      dots.style.display = 'none';
    }

    var cardHandlers = [];
    var dotEls = [];

    function buildDots() {
      dots.innerHTML = '';
      dotEls = [];
      for (var i = 0; i < totalPages; i++) {
        var d = el('span', 'select-dot');
        dots.appendChild(d);
        dotEls.push(d);
      }
    }

    function updatePagerUI() {
      if (!pagingActive) return;
      var atFirst = currentPage <= 0;
      var atLast = currentPage >= totalPages - 1;
      prevBtn.disabled = atFirst;
      prevBtn.classList.toggle('disabled', atFirst);
      nextBtn.disabled = atLast;
      nextBtn.classList.toggle('disabled', atLast);
      for (var i = 0; i < dotEls.length; i++) {
        dotEls[i].classList.toggle('active', i === currentPage);
      }
    }

    function buildCard(stage) {
      var ok = getStageStatus(stage.id);
      var card = el('div', 'stage-card' + (ok ? '' : ' disabled'));

      var thumbWrap = el('div', 'stage-thumb-wrap');
      var img = new Image();
      img.alt = stage.name;
      img.onerror = function () {
        thumbWrap.innerHTML = '';
        thumbWrap.appendChild(el('div', 'stage-thumb-fallback', '🖼️'));
      };
      img.src = stage.thumb;
      thumbWrap.appendChild(img);
      card.appendChild(thumbWrap);

      card.appendChild(el('div', 'stage-name', stage.name));

      var stars = buildStarsRow(3, 'stage-stars', 'star');
      stars.setFilled(Game.getBestStars(stage.id));
      card.appendChild(stars.el);

      function onCard(evt) {
        evt.preventDefault();
        if (!ok) return;
        Audio.playTap();
        goto('game', { stageId: stage.id });
      }
      card.addEventListener('pointerdown', onCard);
      cardHandlers.push({ el: card, fn: onCard });

      return card;
    }

    function renderPage() {
      cardHandlers.forEach(function (h) {
        h.el.removeEventListener('pointerdown', h.fn);
      });
      cardHandlers = [];
      grid.innerHTML = '';

      if (stages.length === 0) {
        var empty = el('div', 'select-empty');
        empty.appendChild(el('div', 'icon', '🧸'));
        empty.appendChild(el('div', 'msg', 'ステージ じゅんびちゅう… もうすこし まっててね'));
        grid.appendChild(empty);
        return;
      }

      var start = currentPage * SELECT_PAGE_SIZE;
      stages.slice(start, start + SELECT_PAGE_SIZE).forEach(function (stage) {
        grid.appendChild(buildCard(stage));
      });
    }

    if (pagingActive) {
      buildDots();
    }
    renderPage();
    updatePagerUI();

    function onPrev(evt) {
      evt.preventDefault();
      if (currentPage <= 0) return;
      currentPage--;
      Audio.playTap();
      renderPage();
      updatePagerUI();
    }
    function onNext(evt) {
      evt.preventDefault();
      if (currentPage >= totalPages - 1) return;
      currentPage++;
      Audio.playTap();
      renderPage();
      updatePagerUI();
    }
    prevBtn.addEventListener('pointerdown', onPrev);
    nextBtn.addEventListener('pointerdown', onNext);

    return {
      destroy: function () {
        homeBtn.removeEventListener('pointerdown', onHome);
        prevBtn.removeEventListener('pointerdown', onPrev);
        nextBtn.removeEventListener('pointerdown', onNext);
        cardHandlers.forEach(function (h) {
          h.el.removeEventListener('pointerdown', h.fn);
        });
      }
    };
  }

  /* ==================================================================
   * game シーン（コア）
   * ================================================================== */

  function buildPanel(src, alt) {
    var panel = el('div', 'panel');
    var img = new Image();
    img.alt = alt || '';
    var failed = false;
    img.onerror = function () {
      failed = true;
      var fb = el('div', 'panel-fallback', 'がぞうが よみこめません');
      panel.appendChild(fb);
    };
    img.src = src;
    panel.appendChild(img);
    return { el: panel, img: img, isFailed: function () { return failed; } };
  }

  function gameScene(container, params) {
    deps();
    container.classList.add('scene-game');
    var stageId = params && params.stageId;
    var stage = Game.getStageById(stageId);

    // stage.differences が未定義/空配列のデータ不備でも例外を投げず「じゅんびちゅう」に倒す
    if (!stage || !Array.isArray(stage.differences) || stage.differences.length === 0) {
      var homeBtn0 = el('button', 'msl-btn round home', '⌂');
      container.appendChild(homeBtn0);
      container.appendChild(prepBox('この ステージは まだ じゅんびちゅうです'));
      function onHome0(evt) {
        evt.preventDefault();
        goto('select');
      }
      homeBtn0.addEventListener('pointerdown', onHome0);
      return {
        destroy: function () {
          homeBtn0.removeEventListener('pointerdown', onHome0);
        }
      };
    }

    var timers = [];
    var listeners = [];
    var completed = false;
    var destroyed = false;
    var transitioned = false;

    Speech.preload(
      stage.differences.map(function (diff) {
        return diff.label;
      }).concat([completionNarrationText()])
    );

    function on(elm, type, fn) {
      elm.addEventListener(type, fn);
      listeners.push({ elm: elm, type: type, fn: fn });
    }

    /* --- topbar --- */
    var topbar = el('div', 'game-topbar');
    var homeBtn = el('button', 'msl-btn round home', '⌂');
    topbar.appendChild(homeBtn);
    topbar.appendChild(el('div', 'game-stage-name', stage.name));
    var muteBtn = el('button', 'msl-btn round mute-toggle');
    topbar.appendChild(muteBtn);
    container.appendChild(topbar);
    bindMuteToggle(muteBtn);

    on(homeBtn, 'pointerdown', function (evt) {
      evt.preventDefault();
      goto('select');
    });

    /* --- panels --- */
    var panelsRow = el('div', 'game-panels');
    var panelA = buildPanel(stage.imgA, stage.name + ' A');
    var panelB = buildPanel(stage.imgB, stage.name + ' B');
    panelsRow.appendChild(panelA.el);
    panelsRow.appendChild(panelB.el);
    container.appendChild(panelsRow);

    /* --- bottombar --- */
    var bottombar = el('div', 'game-bottombar');
    var starsRow = buildStarsRow(stage.differences.length, 'stars-row', 'star');
    bottombar.appendChild(starsRow.el);
    var hintBtn = el('button', 'msl-btn round hint', '💡');
    bottombar.appendChild(hintBtn);
    container.appendChild(bottombar);

    var session = Game.createSession(stage);
    var hintCoolingDown = false;

    function panelPointForDiff(panelObj, diff) {
      var w = panelObj.el.clientWidth;
      var h = panelObj.el.clientHeight;
      return { x: diff.x * w, y: diff.y * h };
    }

    function markBothPanels(diff) {
      [panelA, panelB].forEach(function (p) {
        var pt = panelPointForDiff(p, diff);
        FX.marker(p.el, pt.x, pt.y);
      });
    }

    function handleCorrect(result, tapPanel, tapPx) {
      Audio.playCorrect();
      markBothPanels(result.diff);
      FX.sparkle(tapPanel.el, tapPx.x, tapPx.y);
      FX.wordPopup(container, result.diff.label);
      var narrationDone = Speech.speak(result.diff.label);
      hintBtn.classList.remove('glowing');
      starsRow.setFilled(session.state.foundCount);

      if (session.isComplete()) {
        completed = true;
        Audio.stopBGM();
        var t = window.setTimeout(function () {
          Audio.playFanfare();
        }, 150);
        timers.push(t);
        FX.confetti(container, 110);
        var minimumDelayElapsed = false;
        var narrationFinished = false;

        function openClearWhenReady() {
          if (
            destroyed
            || transitioned
            || !minimumDelayElapsed
            || !narrationFinished
          ) return;
          transitioned = true;
          goto('clear', {
            stageId: stage.id,
            stars: session.computeStars(),
            hintCount: session.state.hintCount
          });
        }

        var t2 = window.setTimeout(function () {
          minimumDelayElapsed = true;
          openClearWhenReady();
        }, 1400);
        timers.push(t2);
        narrationDone.then(function () {
          narrationFinished = true;
          openClearWhenReady();
        });
      }
    }

    function handleWrong(panelObj) {
      Audio.playWrong();
      FX.shake(panelObj.el);
      if (session.shouldPromptHint()) {
        hintBtn.classList.add('glowing');
      }
    }

    function makeTapHandler(panelObj) {
      return function (evt) {
        if (completed) return;
        evt.preventDefault();
        var rect = panelObj.el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        var nx = clamp01((evt.clientX - rect.left) / rect.width);
        var ny = clamp01((evt.clientY - rect.top) / rect.height);
        var result = session.checkHit(nx, ny);
        if (result.hit) {
          handleCorrect(result, panelObj, { x: nx * panelObj.el.clientWidth, y: ny * panelObj.el.clientHeight });
        } else {
          handleWrong(panelObj);
        }
      };
    }

    on(panelA.el, 'pointerdown', makeTapHandler(panelA));
    on(panelB.el, 'pointerdown', makeTapHandler(panelB));

    on(hintBtn, 'pointerdown', function (evt) {
      evt.preventDefault();
      if (completed || hintCoolingDown) return;
      var target = session.useHint();
      if (!target) return;
      Audio.playHint();
      hintBtn.classList.remove('glowing');
      hintCoolingDown = true;
      hintBtn.disabled = true;
      [panelA, panelB].forEach(function (p) {
        var pt = panelPointForDiff(p, target);
        FX.hintGlow(p.el, pt.x, pt.y, Game.HINT_GLOW_MS);
      });
      var t = window.setTimeout(function () {
        hintCoolingDown = false;
        hintBtn.disabled = false;
      }, Game.HINT_COOLDOWN_MS);
      timers.push(t);
    });

    Audio.startBGM();

    return {
      destroy: function () {
        destroyed = true;
        Audio.stopBGM();
        Speech.cancel();
        timers.forEach(window.clearTimeout);
        listeners.forEach(function (l) {
          l.elm.removeEventListener(l.type, l.fn);
        });
        FX.clear(panelA.el);
        FX.clear(panelB.el);
      }
    };
  }

  /* ==================================================================
   * clear シーン
   * ================================================================== */

  function clearScene(container, params) {
    deps();
    container.classList.add('scene-clear');
    var stageId = params && params.stageId;
    var stage = Game.getStageById(stageId);
    var timers = [];
    var listeners = [];
    var completionText = completionNarrationText();

    Speech.preload([completionText]);

    function on(elm, type, fn) {
      elm.addEventListener(type, fn);
      listeners.push({ elm: elm, type: type, fn: fn });
    }

    if (!stage) {
      var homeBtn0 = el('button', 'msl-btn round home', '⌂');
      container.appendChild(homeBtn0);
      container.appendChild(prepBox());
      on(homeBtn0, 'pointerdown', function (evt) {
        evt.preventDefault();
        goto('select');
      });
      return {
        destroy: function () {
          listeners.forEach(function (l) {
            l.elm.removeEventListener(l.type, l.fn);
          });
        }
      };
    }

    var stars = params.stars || 1;
    var hintCount = params.hintCount || 0;
    Game.saveBestStars(stage.id, stars);

    container.appendChild(el('div', 'clear-title', 'できた！'));

    var starsRow = buildStarsRow(3, 'clear-stars', 'star');
    container.appendChild(starsRow.el);

    var starSpans = starsRow.el.children;
    for (var i = 0; i < stars; i++) {
      (function (idx) {
        var t = window.setTimeout(function () {
          starSpans[idx].textContent = '★';
          starSpans[idx].classList.add('filled', 'pop');
        }, 280 * idx);
        timers.push(t);
      })(i);
    }

    var speakTimer = window.setTimeout(function () {
      Speech.speak(completionText);
    }, 280 * stars + 200);
    timers.push(speakTimer);

    var buttons = el('div', 'clear-buttons');
    var nextStage = Game.getNextStage(stage.id);
    var nextBtn = el('button', 'msl-btn primary', 'つぎへ ▶');
    if (!nextStage) {
      nextBtn.disabled = true;
      nextBtn.style.opacity = '0.4';
      nextBtn.style.pointerEvents = 'none';
    }
    var retryBtn = el('button', 'msl-btn', 'もういちど ↻');
    var homeBtn = el('button', 'msl-btn round home', '⌂');
    buttons.appendChild(retryBtn);
    buttons.appendChild(nextBtn);
    buttons.appendChild(homeBtn);
    container.appendChild(buttons);

    on(nextBtn, 'pointerdown', function (evt) {
      evt.preventDefault();
      if (!nextStage) return;
      Audio.playTap();
      goto('game', { stageId: nextStage.id });
    });
    on(retryBtn, 'pointerdown', function (evt) {
      evt.preventDefault();
      Audio.playTap();
      goto('game', { stageId: stage.id });
    });
    on(homeBtn, 'pointerdown', function (evt) {
      evt.preventDefault();
      Audio.playTap();
      goto('select');
    });

    void hintCount; // 将来の演出調整用に保持（現状は星評価にのみ反映済み）

    return {
      destroy: function () {
        timers.forEach(window.clearTimeout);
        Speech.cancel();
        listeners.forEach(function (l) {
          l.elm.removeEventListener(l.type, l.fn);
        });
      }
    };
  }

  window.MSL = window.MSL || {};
  window.MSL.Scenes = {
    loading: loadingScene,
    title: titleScene,
    select: selectScene,
    game: gameScene,
    clear: clearScene
  };

  window.MSL.noop = noop;
})();
