/* まちがいさがしランド — fx.js
 * engine担当。パーティクル・紙吹雪・アニメユーティリティ（DOMベース、軽量）。
 * window.MSL.FX に公開する。
 */
(function () {
  'use strict';

  var CONFETTI_COLORS = ['#ff6fa5', '#ffd93d', '#4ecb71', '#4aa8ff', '#ff9f43', '#a26bff'];
  var SPARKLE_CHARS = ['✨', '⭐', '💫'];

  function findLayer(container) {
    var kids = container.children;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].classList && kids[i].classList.contains('fx-layer')) {
        return kids[i];
      }
    }
    return null;
  }

  function ensureLayer(container) {
    var layer = findLayer(container);
    if (layer) return layer;
    layer = document.createElement('div');
    layer.className = 'fx-layer';
    container.appendChild(layer);
    return layer;
  }

  /** コンテナ内のFX要素を全て消す（シーン破棄時のクリーンアップ用） */
  function clear(container) {
    var layer = findLayer(container);
    if (layer && layer.parentNode) {
      layer.parentNode.removeChild(layer);
    }
  }

  /** 正解位置に赤いリングマーカーを表示する（見つけた印。消えずに残る） */
  function marker(container, xPx, yPx) {
    var layer = ensureLayer(container);
    var el = document.createElement('div');
    el.className = 'marker-ring';
    el.style.left = xPx + 'px';
    el.style.top = yPx + 'px';
    layer.appendChild(el);
    return el;
  }

  /** キラキラパーティクルを1点から放射状にばらまく */
  function sparkle(container, xPx, yPx) {
    var layer = ensureLayer(container);
    var count = 10;
    for (var i = 0; i < count; i++) {
      var el = document.createElement('div');
      el.className = 'sparkle-piece';
      el.textContent = SPARKLE_CHARS[i % SPARKLE_CHARS.length];
      var angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      var dist = 60 + Math.random() * 70;
      var dx = Math.cos(angle) * dist;
      var dy = Math.sin(angle) * dist;
      el.style.left = xPx + 'px';
      el.style.top = yPx + 'px';
      el.style.setProperty('--dx', dx + 'px');
      el.style.setProperty('--dy', dy + 'px');
      layer.appendChild(el);
      (function (node) {
        window.setTimeout(function () {
          if (node.parentNode) node.parentNode.removeChild(node);
        }, 800);
      })(el);
    }
  }

  /** 未発見の違いをふわふわ光らせるヒント表示。durationMs後に自動で消える */
  function hintGlow(container, xPx, yPx, durationMs) {
    var layer = ensureLayer(container);
    var el = document.createElement('div');
    el.className = 'hint-glow';
    el.style.left = xPx + 'px';
    el.style.top = yPx + 'px';
    layer.appendChild(el);
    window.setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, durationMs || 2000);
    return el;
  }

  /** パネルを小さく揺らす（不正解時） */
  function shake(el) {
    if (!el) return;
    el.classList.remove('shaking');
    // 強制リフローで再アニメを許可
    void el.offsetWidth;
    el.classList.add('shaking');
    window.setTimeout(function () {
      el.classList.remove('shaking');
    }, 450);
  }

  /** 画面中央に大きな「ことばポップ」を表示する */
  function wordPopup(container, text) {
    var el = document.createElement('div');
    el.className = 'word-popup';
    el.textContent = text;
    container.appendChild(el);
    void el.offsetWidth;
    el.classList.add('show');
    window.setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1350);
    return el;
  }

  /** 紙吹雪を画面いっぱいに降らせる */
  function confetti(container, count) {
    var layer = ensureLayer(container);
    var n = count || 90;
    var width = container.clientWidth || 1600;
    for (var i = 0; i < n; i++) {
      var el = document.createElement('div');
      el.className = 'confetti-piece';
      var color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      el.style.background = color;
      el.style.left = Math.random() * width + 'px';
      var isRound = Math.random() < 0.5;
      if (isRound) el.style.borderRadius = '50%';
      var duration = 1.6 + Math.random() * 1.4;
      var delay = Math.random() * 0.6;
      el.style.animationDuration = duration + 's';
      el.style.animationDelay = delay + 's';
      layer.appendChild(el);
      (function (node, ms) {
        window.setTimeout(function () {
          if (node.parentNode) node.parentNode.removeChild(node);
        }, ms);
      })(el, (duration + delay) * 1000 + 200);
    }
  }

  window.MSL = window.MSL || {};
  window.MSL.FX = {
    clear: clear,
    marker: marker,
    sparkle: sparkle,
    hintGlow: hintGlow,
    shake: shake,
    wordPopup: wordPopup,
    confetti: confetti
  };
})();
