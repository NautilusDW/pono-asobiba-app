// もりのアルバム — 5×20 ヒートマップ画面
//
// 依存:
//   window.PonoPartners  (partners.js)
//   window.PonoBond      (bond.js)
//
// 単独画面 (album.html) として動作する。
// main.js とは独立しているため、ステージ題名は BASE_STAGES と同期した内部テーブルを持つ。
// (main.js を丸ごとロードすると puzzle 初期化が走るため、ここでは静的データのみ複製している。)

(function () {
  'use strict';

  // BASE_STAGES (main.js) と同期したステージ名テーブル。
  // 変更時は main.js 側と二重メンテすること。
  var STAGE_TITLES = {
    1:  'あかい りんご',
    2:  'そらの ふうせん',
    3:  'おはなと ちょうちょ',
    4:  'みずの なかの きんぎょ',
    5:  '✨ おやすみ ポノ',
    6:  'くだものの かご',
    7:  'おもちゃの がっき',
    8:  'おはなの はたけ',
    9:  'うみの せかい',
    10: '✨ みずあそび ポノ',
    11: 'あめあがりの にじ',
    12: 'ゆめの よぞら',
    13: 'あまい おやつ',
    14: 'もりの おんがくかい',
    15: '✨ きらきら ポノ',
    16: 'のりものの まち',
    17: 'もりの ピクニック',
    18: 'まほうの ほんだな',
    19: 'おもちゃの テーブル',
    20: '✨ ポノと さいごのぼうけん',
  };

  var STAGE_COUNT = 20;
  var FUKUROU_ID = 'fukurou';

  // ---------- DOM helpers ----------
  function $(id) { return document.getElementById(id); }

  function createEl(tag, opts) {
    var el = document.createElement(tag);
    if (!opts) return el;
    if (opts.cls) el.className = opts.cls;
    if (opts.text != null) el.textContent = String(opts.text);
    if (opts.html != null) el.innerHTML = opts.html;
    if (opts.attrs) {
      for (var k in opts.attrs) {
        if (Object.prototype.hasOwnProperty.call(opts.attrs, k)) {
          el.setAttribute(k, opts.attrs[k]);
        }
      }
    }
    return el;
  }

  // ---------- Stars rendering ----------
  function levelStars(level) {
    var lv = Math.max(0, Math.min(3, level | 0));
    var filled = '★'.repeat(lv);
    var empty = '☆'.repeat(3 - lv);
    return filled + empty;
  }

  // ---------- Build grid ----------
  function renderGrid() {
    var partners = (window.PonoPartners && window.PonoPartners.list) || [];
    var bondReady = !!(window.PonoBond && typeof window.PonoBond.getLevel === 'function');
    var fukurouUnlocked = bondReady && window.PonoBond.isFukurouUnlocked();

    // Header row
    var head = $('album-grid-head');
    head.innerHTML = '';
    var corner = createEl('th', { cls: 'album-grid__corner', text: 'パートナー / ステージ' });
    head.appendChild(corner);
    for (var s = 1; s <= STAGE_COUNT; s++) {
      var th = createEl('th', { cls: 'album-grid__col-head', text: String(s) });
      head.appendChild(th);
    }

    // Body
    var body = $('album-grid-body');
    body.innerHTML = '';

    var lv3Total = 0;
    var lv3Possible = 0;

    for (var p = 0; p < partners.length; p++) {
      var partner = partners[p];
      var locked = (partner.id === FUKUROU_ID) && !fukurouUnlocked;

      var tr = createEl('tr', { cls: 'album-row' + (locked ? ' album-row--locked' : '') });

      // Row header (partner icon + name)
      var rowHead = createEl('td', { cls: 'album-grid__row-head' });
      var inner = createEl('div', { cls: 'album-grid__row-head-inner' });
      var iconWrap = createEl('span', { cls: 'album-grid__row-head-icon' });
      if (partner.image) {
        var img = createEl('img', {
          attrs: {
            src: partner.image,
            alt: '',
            loading: 'lazy',
            draggable: 'false',
          },
        });
        iconWrap.appendChild(img);
      }
      var nameSpan = createEl('span', { cls: 'album-grid__row-head-name', text: partner.name || partner.id });
      inner.appendChild(iconWrap);
      inner.appendChild(nameSpan);
      rowHead.appendChild(inner);
      tr.appendChild(rowHead);

      // Cells
      for (var stageId = 1; stageId <= STAGE_COUNT; stageId++) {
        lv3Possible++;
        var hearts = locked || !bondReady ? 0 : window.PonoBond.getHearts(partner.id, stageId);
        var level = locked || !bondReady ? 0 : window.PonoBond.getLevel(partner.id, stageId);
        if (level >= 3) lv3Total++;

        var btn = createEl('button', {
          cls: 'album-cell album-cell--lv' + level,
          attrs: {
            type: 'button',
            'data-partner-id': partner.id,
            'data-stage-id': String(stageId),
            'data-hearts': String(hearts),
            'data-level': String(level),
            'data-locked': locked ? '1' : '0',
            'aria-label': partner.name + ' ステージ' + stageId + ' Lv' + level,
          },
        });

        var td = createEl('td');
        td.appendChild(btn);
        tr.appendChild(td);
      }

      body.appendChild(tr);
    }

    // Summary
    $('album-summary-current').textContent = String(lv3Total);
    $('album-summary-total').textContent = String(lv3Possible);
    var bar = $('album-summary-bar');
    var pct = lv3Possible > 0 ? (lv3Total / lv3Possible) * 100 : 0;
    // Slight delay so the transition animates from 0%
    requestAnimationFrame(function () {
      bar.style.width = pct.toFixed(1) + '%';
    });
  }

  // ---------- Popup ----------
  function showPopup(opts) {
    $('album-popup-partner').textContent = opts.partnerName + ' と';
    $('album-popup-stage').textContent = '「' + opts.stageTitle + '」で ' + opts.hearts + 'かい あそんだよ';
    $('album-popup-hearts').textContent = '♥ ' + opts.hearts;
    $('album-popup-level').textContent = 'Lv: ' + levelStars(opts.level);
    var popup = $('album-popup');
    popup.classList.remove('hidden');
    // focus the close button for keyboard a11y
    setTimeout(function () { $('album-popup-close').focus(); }, 50);
  }

  function showLockedPopup(partnerName) {
    $('album-popup-partner').textContent = partnerName;
    $('album-popup-stage').textContent = 'まだ あえないよ\nぜんステージ クリアで あえるかも？';
    $('album-popup-hearts').textContent = '🔒 ひみつ';
    $('album-popup-level').textContent = '';
    $('album-popup').classList.remove('hidden');
  }

  function hidePopup() {
    $('album-popup').classList.add('hidden');
  }

  // ---------- Event wiring ----------
  function handleCellClick(ev) {
    var t = ev.target;
    while (t && t !== document.body) {
      if (t.classList && t.classList.contains('album-cell')) break;
      t = t.parentNode;
    }
    if (!t || !t.classList || !t.classList.contains('album-cell')) return;

    var partnerId = t.getAttribute('data-partner-id');
    var stageId = parseInt(t.getAttribute('data-stage-id'), 10);
    var locked = t.getAttribute('data-locked') === '1';
    var partner = (window.PonoPartners && window.PonoPartners.get(partnerId)) || null;
    if (!partner) return;

    if (locked) {
      showLockedPopup(partner.name);
      return;
    }

    var hearts = parseInt(t.getAttribute('data-hearts'), 10) || 0;
    var level = parseInt(t.getAttribute('data-level'), 10) || 0;
    var stageTitle = STAGE_TITLES[stageId] || ('ステージ ' + stageId);
    showPopup({
      partnerName: partner.name,
      stageTitle: stageTitle,
      hearts: hearts,
      level: level,
    });
  }

  function handleBack() {
    // Prefer history back when there's a parent page; fallback to puzzle index.
    try {
      if (window.history.length > 1 && document.referrer && document.referrer.indexOf(window.location.host) !== -1) {
        window.history.back();
        return;
      }
    } catch (_) { /* fall through */ }
    window.location.href = 'index.html';
  }

  function init() {
    // Sanity check dependencies
    if (!window.PonoPartners || !window.PonoBond) {
      console.error('[album] PonoPartners / PonoBond not loaded');
    }

    renderGrid();

    // Grid click delegation
    $('album-grid-body').addEventListener('click', handleCellClick);

    // Back button
    $('album-back').addEventListener('click', handleBack);

    // Popup dismiss
    $('album-popup-close').addEventListener('click', hidePopup);
    $('album-popup-backdrop').addEventListener('click', hidePopup);
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') hidePopup();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
