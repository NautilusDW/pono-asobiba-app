/**
 * map.js — 水族館マップ画面
 * AquariumMap.png を背景に、ゾーンボタンを画像比率で配置。
 * open ゾーンをタップ → aquarium/index.html?zone=<id> に遷移。
 * locked ゾーンをタップ → トースト表示。
 */
(function () {
  'use strict';

  // ── Toast ──────────────────────────────────────────────────────────────────
  var _toastTimer = null;
  function showMapToast(msg) {
    var el = document.getElementById('mapToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2000);
  }
  // グローバルに公開（map.html の inline script からも使う）
  window.showMapToast = showMapToast;

  // ── ゾーンボタン生成 ───────────────────────────────────────────────────────
  function buildZoneButton(zone) {
    var btn = document.createElement('button');
    btn.className = 'zone-btn ' + (zone.status === 'open' ? 'open' : 'locked');
    btn.style.left = (zone.mapX * 100) + '%';
    btn.style.top  = (zone.mapY * 100) + '%';

    var nameEl = document.createElement('span');
    nameEl.className = 'zone-name';
    nameEl.textContent = zone.displayName;

    btn.appendChild(nameEl);

    if (zone.status !== 'open') {
      var lockEl = document.createElement('span');
      lockEl.className = 'zone-lock';
      lockEl.textContent = '🔒';
      btn.appendChild(lockEl);
    }

    // カラー tint をボーダーに反映
    if (zone.tint && zone.status === 'open') {
      var hex = zone.tint.replace('0x', '#');
      btn.style.borderColor = hex + '99';
      btn.style.background = hex + '33';
    }

    btn.addEventListener('click', function () {
      if (zone.status === 'open') {
        location.href = 'index.html?zone=' + zone.id;
      } else {
        showMapToast('もうすぐ あそべるよ！');
      }
    });

    return btn;
  }

  // ── メイン ─────────────────────────────────────────────────────────────────
  window.MuseumData.load('..').then(function () {
    var zones = window.MuseumData.getZones();
    var container = document.getElementById('zone-buttons');
    if (!container) return;

    zones.forEach(function (zone) {
      container.appendChild(buildZoneButton(zone));
    });
  }).catch(function (err) {
    console.error('[map.js] MuseumData load failed:', err);
    showMapToast('よみこみ エラー');
  });

})();
