// もりのアルバム — なかまごとの進み具合を一目で見る画面
//
// 依存:
//   window.PonoPartners (partners.js)
//   window.PonoBond     (bond.js)
(function () {
  'use strict';

  var STAGE_COUNT = 20;

  function $(id) {
    return document.getElementById(id);
  }

  function createEl(tag, options) {
    var el = document.createElement(tag);
    options = options || {};
    if (options.className) el.className = options.className;
    if (options.text != null) el.textContent = String(options.text);
    if (options.attrs) {
      Object.keys(options.attrs).forEach(function (name) {
        el.setAttribute(name, String(options.attrs[name]));
      });
    }
    return el;
  }

  function clampCount(value) {
    var count = Number(value);
    if (!isFinite(count)) count = 0;
    return Math.max(0, Math.min(STAGE_COUNT, Math.floor(count)));
  }

  function getClearedCount(partnerId) {
    try {
      if (window.PonoBond && typeof window.PonoBond.getClearedCount === 'function') {
        return clampCount(window.PonoBond.getClearedCount(partnerId));
      }
      if (window.PonoBond && typeof window.PonoBond.isCleared === 'function') {
        var count = 0;
        for (var stageId = 1; stageId <= STAGE_COUNT; stageId++) {
          if (window.PonoBond.isCleared(partnerId, stageId)) count++;
        }
        return clampCount(count);
      }
    } catch (_) {}
    return 0;
  }

  function isPartnerUnlocked(partner) {
    try {
      if (window.PonoPartners && typeof window.PonoPartners.isUnlocked === 'function') {
        return window.PonoPartners.isUnlocked(partner);
      }
    } catch (_) {}
    return true;
  }

  function progressLabel(count) {
    if (count >= STAGE_COUNT) return 'ぜんぶ できた！';
    if (count <= 0) return 'まだ これから';
    return String(count) + 'こ できた';
  }

  function buildPortrait(partner, locked) {
    var portrait = createEl('div', { className: 'album-partner-card__portrait' });

    if (locked && partner.silhouetteImage) {
      var silhouette = createEl('img', {
        className: 'album-partner-card__portrait-img is-silhouette' +
          (partner.silhouetteMode === 'light-background' ? ' is-light-background' : ''),
        attrs: {
          src: partner.silhouetteImage,
          alt: '',
          loading: 'lazy',
          draggable: 'false',
          'aria-hidden': 'true',
        },
      });
      portrait.appendChild(silhouette);
    } else if (locked) {
      portrait.appendChild(createEl('span', {
        className: 'album-partner-card__secret',
        text: '?',
        attrs: { 'aria-hidden': 'true' },
      }));
    } else if (partner.image) {
      portrait.appendChild(createEl('img', {
        className: 'album-partner-card__portrait-img',
        attrs: {
          src: partner.image,
          alt: '',
          loading: 'lazy',
          draggable: 'false',
        },
      }));
    }

    if (locked) {
      portrait.appendChild(createEl('span', {
        className: 'album-partner-card__lock',
        text: '🔒',
        attrs: { 'aria-hidden': 'true' },
      }));
    }
    return portrait;
  }

  function buildPartnerCard(partner, clearedCount) {
    var unlocked = isPartnerUnlocked(partner);
    var status = unlocked ? progressLabel(clearedCount) : 'まだ ひみつ';
    var card = createEl('article', {
      className: 'album-partner-card' + (unlocked ? '' : ' is-locked'),
      attrs: {
        role: 'listitem',
        'aria-label': unlocked
          ? partner.name + 'は 20このうち ' + clearedCount + 'こ できた'
          : partner.name + 'は まだ ひみつ',
      },
    });
    card.appendChild(buildPortrait(partner, !unlocked));

    var info = createEl('div', { className: 'album-partner-card__info' });
    info.appendChild(createEl('h2', {
      className: 'album-partner-card__name',
      text: partner.name || partner.id,
    }));
    info.appendChild(createEl('div', {
      className: 'album-partner-card__status',
      text: unlocked ? '⭐ ' + status : '🔒 ' + status,
    }));

    if (unlocked) {
      var progress = createEl('div', {
        className: 'album-partner-card__bar',
        attrs: {
          role: 'progressbar',
          'aria-label': partner.name + 'のできたかず',
          'aria-valuemin': '0',
          'aria-valuemax': String(STAGE_COUNT),
          'aria-valuenow': String(clearedCount),
          'aria-valuetext': progressLabel(clearedCount),
        },
      });
      var fill = createEl('span', { className: 'album-partner-card__bar-fill' });
      fill.style.width = ((clearedCount / STAGE_COUNT) * 100).toFixed(1) + '%';
      progress.appendChild(fill);
      info.appendChild(progress);
    }

    card.appendChild(info);
    return card;
  }

  function renderAlbum() {
    var partners = (window.PonoPartners && Array.isArray(window.PonoPartners.list))
      ? window.PonoPartners.list
      : [];
    var grid = $('album-partner-grid');
    grid.innerHTML = '';

    var totalCleared = 0;
    var availablePartnerCount = 0;
    partners.forEach(function (partner) {
      var clearedCount = getClearedCount(partner.id);
      if (isPartnerUnlocked(partner)) {
        totalCleared += clearedCount;
        availablePartnerCount++;
      }
      grid.appendChild(buildPartnerCard(partner, clearedCount));
    });

    // ロック中の仲間を母数へ入れると、free / book では到達できないバーになる。
    // 「もっと買わないと埋まらない」印象を避け、いま遊べる仲間だけでまとめる。
    var totalPossible = Math.max(1, availablePartnerCount * STAGE_COUNT);
    var summaryText = String(totalCleared) + 'こ できた';
    $('album-summary-value').textContent = summaryText;
    var summaryBar = $('album-summary-bar');
    summaryBar.setAttribute('aria-valuemax', String(totalPossible));
    summaryBar.setAttribute('aria-valuenow', String(totalCleared));
    summaryBar.setAttribute('aria-valuetext', summaryText);
    $('album-summary-bar-fill').style.width = ((totalCleared / totalPossible) * 100).toFixed(1) + '%';
  }

  function handleBack() {
    try {
      if (window.history.length > 1 && document.referrer && document.referrer.indexOf(window.location.host) !== -1) {
        window.history.back();
        return;
      }
    } catch (_) {}
    window.location.href = 'index.html';
  }

  function init() {
    if (!window.PonoPartners || !window.PonoBond) {
      console.error('[album] PonoPartners / PonoBond not loaded');
    }
    renderAlbum();
    $('album-back').addEventListener('click', handleBack);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
