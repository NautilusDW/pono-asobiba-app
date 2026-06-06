// PonoPartnerTutorial — パートナー初回説明モーダル。
// パートナーごとの特徴を、実ゲーム前に小さなデモ盤面で見せる。
window.PonoPartnerTutorial = (function () {
  'use strict';

  var ROOT_ID = 'pono-ptut-root';
  var STORAGE_PREFIX = 'pono_partner_tutorial_seen_v1_';
  var activeRoot = null;
  var activeCallback = null;
  var keyHandler = null;

  var TUTORIALS = {
    kitsune: {
      title: 'えらんだ ピースの ばしょが わかるよ',
      body: 'ピースを えらぶと、 おく ばしょが ふわっと ひかるよ。',
      tip: 'どこから はじめるか まよったときに たすけてくれるよ。',
      demo: 'target',
      action: 'ひからせる',
    },
    kojika: {
      title: 'ただしい ばしょに ちかいと ひかるよ',
      body: 'ピースを ちかづけると、 もうすこしで はまる ばしょが やさしく ひかるよ。',
      tip: 'さいしょの パズルでも あんしんして あそべるよ。',
      demo: 'magnet',
      action: 'ちかづける',
    },
    araiguma: {
      title: 'ボタンで すこしだけ はめてくれるよ',
      body: 'ピースが たくさんあるとき、 ボタンを おすと いくつかの ピースが きれいに はまるよ。',
      tip: 'こまったときの おたすけ。 ぜんぶは はめないから、 のこりは じぶんで やってみよう。',
      demo: 'autofill',
      action: 'おしてみる',
    },
    usagi: {
      title: 'おく ほうこうを おしえてくれるよ',
      body: 'ピースを えらぶと、 みみが ぴんとして、 どっちへ もっていくかを おしえてくれるよ。',
      tip: 'すこし はなれた ばしょでも、 むかう ほうこうが わかるよ。',
      demo: 'direction',
      action: 'きいてみる',
    },
    fukurou: {
      title: 'となりの ピースを おしえてくれるよ',
      body: 'ピースを ながおしすると、 その となりにくる ピースが ひかるよ。',
      tip: 'むずかしい ステージで、 つながりを さがす ときに べんりだよ。',
      demo: 'neighbor',
      action: 'ながおし',
    },
    risu: {
      title: 'じかんの なかで クリアに ちょうせん',
      body: 'のこり じかんが でるよ。 じかんが へるまえに、 すばやく はめていこう。',
      tip: 'リスと なかよくなると、 もっと きびしい タイムに ちょうせんできるよ。',
      demo: 'timer',
      action: 'タイムをみる',
    },
    harinezumi: {
      title: 'ヒントが すくない チャレンジ',
      body: 'ヒントの かずが へるよ。 よく みて、 じぶんの ちからで はめていこう。',
      tip: 'なかよくなるほど、 さらに ヒントが すくなくなるよ。',
      demo: 'hints',
      action: 'くらべる',
    },
    karasu: {
      title: 'まわった ピースを もどして あそぶよ',
      body: 'ピースが くるっと まわっているよ。 むきを なおしてから、 ただしい ばしょに はめよう。',
      tip: 'よく かたちを みる チャレンジだよ。',
      demo: 'rotation',
      action: 'まわす',
    },
  };

  function getStorageKey(partnerId) {
    return STORAGE_PREFIX + String(partnerId || 'unknown');
  }

  function isSeen(partnerId) {
    try { return localStorage.getItem(getStorageKey(partnerId)) === '1'; }
    catch (_) { return false; }
  }

  function markSeen(partnerId) {
    try { localStorage.setItem(getStorageKey(partnerId), '1'); } catch (_) {}
  }

  function makeEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function makeBoard(size, filled, target) {
    var board = makeEl('div', 'pono-ptut-demo__board');
    board.style.setProperty('--ptut-grid-size', size);
    var filledMap = {};
    var targetMap = {};
    (filled || []).forEach(function (idx) { filledMap[idx] = true; });
    (target || []).forEach(function (idx) { targetMap[idx] = true; });
    for (var i = 0; i < size * size; i++) {
      var cell = makeEl('span', 'pono-ptut-demo__cell');
      if (filledMap[i]) cell.classList.add('is-filled');
      if (targetMap[i]) cell.classList.add('is-target');
      board.appendChild(cell);
    }
    return board;
  }

  function makePiece(className, label) {
    var piece = makeEl('span', 'pono-ptut-demo__piece ' + (className || ''), label || '');
    piece.setAttribute('aria-hidden', 'true');
    return piece;
  }

  function buildDemo(type) {
    var demo = makeEl('div', 'pono-ptut-demo pono-ptut-demo--' + type);
    demo.setAttribute('data-demo-type', type);

    if (type === 'autofill') {
      var autoWrap = makeEl('div', 'pono-ptut-demo__autofill');
      var board = makeBoard(4, [0, 3, 5, 8, 12], [6, 7, 10, 11]);
      board.classList.add('pono-ptut-demo__board--large');
      autoWrap.appendChild(board);
      var tray = makeEl('div', 'pono-ptut-demo__tray');
      for (var i = 0; i < 15; i++) {
        tray.appendChild(makePiece('is-chip', ''));
      }
      autoWrap.appendChild(tray);
      demo.appendChild(autoWrap);
      return demo;
    }

    if (type === 'timer') {
      var timer = makeEl('div', 'pono-ptut-demo__timer');
      var label = makeEl('div', 'pono-ptut-demo__timer-label', 'のこり');
      var time = makeEl('div', 'pono-ptut-demo__timer-time', '０:３５');
      var gauge = makeEl('div', 'pono-ptut-demo__timer-gauge');
      gauge.appendChild(makeEl('span', 'pono-ptut-demo__timer-fill'));
      timer.appendChild(label);
      timer.appendChild(time);
      timer.appendChild(gauge);
      demo.appendChild(timer);
      demo.appendChild(makeBoard(3, [0, 4, 8], [2, 5]));
      return demo;
    }

    if (type === 'hints') {
      var compare = makeEl('div', 'pono-ptut-demo__hint-compare');
      var normal = makeEl('div', 'pono-ptut-demo__hint-card');
      normal.appendChild(makeEl('span', 'pono-ptut-demo__hint-label', 'いつも'));
      normal.appendChild(makeEl('strong', '', 'ヒント×3'));
      var hard = makeEl('div', 'pono-ptut-demo__hint-card is-hard');
      hard.appendChild(makeEl('span', 'pono-ptut-demo__hint-label', 'ハリネズミ'));
      hard.appendChild(makeEl('strong', '', 'ヒント×1'));
      compare.appendChild(normal);
      compare.appendChild(hard);
      demo.appendChild(compare);
      demo.appendChild(makeBoard(3, [0, 2, 6], [4]));
      return demo;
    }

    var scene = makeEl('div', 'pono-ptut-demo__scene');
    scene.appendChild(makeBoard(3, [0, 1, 5], type === 'neighbor' ? [3, 4] : [4]));
    if (type === 'target') {
      scene.appendChild(makePiece('is-selected', ''));
      scene.appendChild(makeEl('span', 'pono-ptut-demo__ghost', ''));
    } else if (type === 'magnet') {
      scene.appendChild(makePiece('is-near', ''));
      scene.appendChild(makeEl('span', 'pono-ptut-demo__ring', ''));
    } else if (type === 'direction') {
      scene.appendChild(makePiece('is-far', ''));
      scene.appendChild(makeEl('span', 'pono-ptut-demo__arrow', '→'));
      scene.appendChild(makeEl('span', 'pono-ptut-demo__ears', '⌒⌒'));
    } else if (type === 'neighbor') {
      scene.appendChild(makePiece('is-press', ''));
      scene.appendChild(makeEl('span', 'pono-ptut-demo__finger', '☝'));
    } else if (type === 'rotation') {
      scene.appendChild(makePiece('is-rotated', ''));
      scene.appendChild(makePiece('is-rotated is-rotated-2', ''));
      scene.appendChild(makeEl('span', 'pono-ptut-demo__turn', '↻'));
    }
    demo.appendChild(scene);
    return demo;
  }

  function resetDemo(demo) {
    if (!demo) return;
    demo.classList.remove('is-playing');
    void demo.offsetWidth;
    demo.classList.add('is-playing');

    if (demo.getAttribute('data-demo-type') === 'timer') {
      var timeEl = demo.querySelector('.pono-ptut-demo__timer-time');
      if (!timeEl) return;
      var frames = ['０:３５', '０:２８', '０:１９', '０:１２'];
      var idx = 0;
      timeEl.textContent = frames[0];
      var timer = setInterval(function () {
        idx++;
        if (idx >= frames.length) {
          clearInterval(timer);
          return;
        }
        timeEl.textContent = frames[idx];
      }, 650);
    }
  }

  function close(partnerId) {
    var cb = activeCallback;
    activeCallback = null;
    markSeen(partnerId);
    if (keyHandler) {
      window.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    if (activeRoot && activeRoot.parentNode) {
      activeRoot.parentNode.removeChild(activeRoot);
    }
    activeRoot = null;
    try { if (typeof cb === 'function') cb(); } catch (e) {
      console.error('[PonoPartnerTutorial] callback threw:', e);
    }
  }

  function show(partnerId, stageId, callback, options) {
    var partner = (window.PonoPartners && typeof window.PonoPartners.get === 'function')
      ? window.PonoPartners.get(partnerId)
      : null;
    var tutorial = TUTORIALS[partnerId];
    if (!partner || !tutorial) {
      if (typeof callback === 'function') callback();
      return;
    }
    if (!options || !options.force) {
      if (isSeen(partnerId)) {
        if (typeof callback === 'function') callback();
        return;
      }
    }

    if (activeRoot && activeRoot.parentNode) activeRoot.parentNode.removeChild(activeRoot);
    activeCallback = callback;

    var root = makeEl('div', 'pono-ptut pono-ptut--' + partnerId);
    root.id = ROOT_ID;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', partner.name + 'の せつめい');

    var panel = makeEl('div', 'pono-ptut__panel');
    var header = makeEl('div', 'pono-ptut__header');
    var portrait = makeEl('div', 'pono-ptut__portrait');
    var img = document.createElement('img');
    img.src = partner.image || '';
    img.alt = partner.name || '';
    img.decoding = 'async';
    portrait.appendChild(img);
    header.appendChild(portrait);

    var titleWrap = makeEl('div', 'pono-ptut__title-wrap');
    titleWrap.appendChild(makeEl('div', 'pono-ptut__eyebrow', 'はじめての ' + partner.name));
    titleWrap.appendChild(makeEl('h2', 'pono-ptut__title', tutorial.title));
    header.appendChild(titleWrap);
    panel.appendChild(header);

    var body = makeEl('div', 'pono-ptut__body');
    var demo = buildDemo(tutorial.demo);
    body.appendChild(demo);
    var copy = makeEl('div', 'pono-ptut__copy');
    copy.appendChild(makeEl('p', 'pono-ptut__main-text', tutorial.body));
    copy.appendChild(makeEl('p', 'pono-ptut__tip', tutorial.tip));
    body.appendChild(copy);
    panel.appendChild(body);

    var footer = makeEl('div', 'pono-ptut__footer');
    var replay = makeEl('button', 'pono-ptut__btn pono-ptut__btn--demo', tutorial.action);
    replay.type = 'button';
    replay.addEventListener('click', function () { resetDemo(demo); });
    var start = makeEl('button', 'pono-ptut__btn pono-ptut__btn--start', 'パズルを はじめる');
    start.type = 'button';
    start.addEventListener('click', function () { close(partnerId); });
    footer.appendChild(replay);
    footer.appendChild(start);
    panel.appendChild(footer);

    root.appendChild(panel);
    document.body.appendChild(root);
    activeRoot = root;
    keyHandler = function (ev) {
      if (ev.key === 'Escape' || ev.keyCode === 27) close(partnerId);
    };
    window.addEventListener('keydown', keyHandler);
    setTimeout(function () {
      resetDemo(demo);
      try { start.focus({ preventScroll: true }); } catch (_) { start.focus(); }
    }, 280);
  }

  function showIfNeeded(partnerId, stageId, callback) {
    show(partnerId, stageId, callback, { force: false });
  }

  return {
    show: show,
    showIfNeeded: showIfNeeded,
    isSeen: isSeen,
  };
})();
