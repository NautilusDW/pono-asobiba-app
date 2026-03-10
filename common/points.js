// ─── ポノのおへや 共通ポイントシステム ───────────────────────────────
// 全ゲームで <script src="../common/points.js"></script> として読み込む
// window.awardPoints(amount) を提供し、トースト＋HUDバッジを自動注入
(function () {
  'use strict';

  var DAILY_CAP   = 25;
  var LS_POINTS   = 'pono_points';
  var LS_LIFETIME = 'pono_points_lifetime';
  var LS_DAILY    = 'pono_points_daily_';

  // ─── ポイント付与（グローバル関数）──────────────────────────────────
  window.awardPoints = function (amount) {
    var today      = new Date().toDateString();
    var dKey       = LS_DAILY + today;
    var todayTotal = parseInt(localStorage.getItem(dKey) || '0', 10);
    var actual     = Math.min(amount, Math.max(0, DAILY_CAP - todayTotal));
    if (actual <= 0) {
      // 上限に達している場合もトーストで知らせる
      _showToast(0);
      return 0;
    }
    var cur  = parseInt(localStorage.getItem(LS_POINTS)   || '0', 10);
    var life = parseInt(localStorage.getItem(LS_LIFETIME) || '0', 10);
    localStorage.setItem(LS_POINTS,   cur + actual);
    localStorage.setItem(LS_LIFETIME, life + actual);
    localStorage.setItem(dKey,        todayTotal + actual);
    _showToast(actual);
    _updateHud();
    return actual;
  };

  // ─── 現在のポイントを取得（他スクリプトからも使用可）───────────────
  window.getPonoPoints = function () {
    return parseInt(localStorage.getItem(LS_POINTS) || '0', 10);
  };

  // ─── 内部: DOM要素参照 ───────────────────────────────────────────
  var _hud       = null;
  var _toast     = null;
  var _toastTimer = null;

  function _updateHud() {
    if (!_hud) return;
    _hud.querySelector('.phud-num').textContent = window.getPonoPoints() + 'pt';
  }

  function _showToast(amount) {
    if (!_toast) return;
    if (amount <= 0) {
      _toast.textContent = '⭐ きょうのぶんは おわりだよ！（25ptまで）';
      _toast.style.background = '#bbb';
      _toast.style.color = '#fff';
    } else {
      _toast.textContent = '+' + amount + 'pt ⭐ ゲット！';
      _toast.style.background = '#ffd700';
      _toast.style.color = '#3a2800';
    }
    _toast.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () {
      if (_toast) _toast.classList.remove('show');
    }, 2500);
  }

  // ─── DOMContentLoaded 後に要素を注入 ─────────────────────────────
  function _init() {
    // CSS
    var style = document.createElement('style');
    style.textContent = [
      '#pono-hud{',
        'position:fixed;top:8px;right:8px;z-index:9500;',
        'background:rgba(0,0,0,0.62);color:#ffd700;',
        'font-size:13px;font-weight:bold;',
        'padding:5px 13px;border-radius:20px;',
        'cursor:pointer;display:flex;align-items:center;gap:4px;',
        'font-family:"Hiragino Maru Gothic ProN","BIZ UDPGothic",sans-serif;',
        'white-space:nowrap;user-select:none;-webkit-tap-highlight-color:transparent;',
        'box-shadow:0 2px 8px rgba(0,0,0,0.35);',
        'transition:background 0.15s,transform 0.1s;',
      '}',
      '#pono-hud:active{transform:scale(0.93);}',
      '.phud-star{font-size:15px;}',
      '.phud-num{font-size:13px;}',
      '#pono-toast{',
        'position:fixed;top:54px;left:50%;z-index:9501;',
        'transform:translateX(-50%) translateY(-10px);',
        'background:#ffd700;color:#3a2800;',
        'font-size:1.05rem;font-weight:bold;',
        'padding:7px 22px;border-radius:22px;',
        'box-shadow:0 3px 14px rgba(0,0,0,0.22);',
        'pointer-events:none;white-space:nowrap;',
        'opacity:0;transition:opacity 0.22s,transform 0.22s;',
        'font-family:"Hiragino Maru Gothic ProN","BIZ UDPGothic",sans-serif;',
      '}',
      '#pono-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}',
    ].join('');
    document.head.appendChild(style);

    // HUDバッジ
    _hud = document.createElement('div');
    _hud.id = 'pono-hud';
    _hud.title = 'ポノのおへやへ';
    _hud.innerHTML = '<span class="phud-star">⭐</span><span class="phud-num">0pt</span>';
    _hud.addEventListener('click', function () {
      location.href = '../room/index.html';
    });
    document.body.appendChild(_hud);
    _updateHud();

    // トースト
    _toast = document.createElement('div');
    _toast.id = 'pono-toast';
    document.body.appendChild(_toast);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();
