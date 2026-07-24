/* まちがいさがしランド — main.js
 * engine担当。起動・シーン遷移・ビューポートフィット・向きガイド・ズーム抑止を行う。
 * window.MSL.Main に goto() と stageStatus を公開する。
 */
(function () {
  'use strict';

  var LOGICAL_W = 1600;
  var LOGICAL_H = 900;

  var viewportEl = null;
  var appEl = null;
  var sceneRootEl = null;
  var current = null; // { controller, el }

  /* ---------- シーン遷移 ---------- */

  function goto(name, params) {
    var factory = window.MSL.Scenes && window.MSL.Scenes[name];
    if (!factory) {
      window.console && window.console.warn('MSL: unknown scene "' + name + '"');
      return;
    }
    if (current) {
      try {
        if (current.controller && typeof current.controller.destroy === 'function') {
          current.controller.destroy();
        }
      } catch (e) {
        window.console && window.console.warn('MSL: scene destroy failed', e);
      }
      if (current.el && current.el.parentNode) {
        current.el.parentNode.removeChild(current.el);
      }
      current = null;
    }
    var wrap = document.createElement('div');
    wrap.className = 'scene';
    sceneRootEl.appendChild(wrap);
    var controller = null;
    try {
      controller = factory(wrap, params || {});
    } catch (e) {
      window.console && window.console.warn('MSL: scene mount failed', e);
    }
    current = { controller: controller || {}, el: wrap };
  }

  /* ---------- 論理解像度フィット（レターボックス中央寄せ） ---------- */

  function fitApp() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var scale = Math.min(vw / LOGICAL_W, vh / LOGICAL_H);
    if (!isFinite(scale) || scale <= 0) scale = 1;
    appEl.style.transform = 'scale(' + scale + ')';
    if (viewportEl) {
      viewportEl.scrollLeft = 0;
      viewportEl.scrollTop = 0;
    }
  }

  /* ---------- 縦持ちガイド ---------- */

  function checkOrientation() {
    var portrait = window.innerWidth < window.innerHeight;
    document.body.classList.toggle('is-portrait', portrait);
  }

  function onViewportChange() {
    fitApp();
    checkOrientation();
  }

  /* ---------- ダブルタップズーム／ピンチズーム抑止 ---------- */

  function setupZoomGuards() {
    var lastTouchEnd = 0;
    document.addEventListener(
      'touchend',
      function (evt) {
        var now = Date.now();
        if (now - lastTouchEnd <= 300) {
          evt.preventDefault();
        }
        lastTouchEnd = now;
      },
      { passive: false }
    );
    document.addEventListener(
      'touchmove',
      function (evt) {
        if (evt.touches && evt.touches.length > 1) {
          evt.preventDefault();
        }
      },
      { passive: false }
    );
    document.addEventListener('gesturestart', function (evt) {
      evt.preventDefault();
    });
  }

  /* ---------- 起動 ---------- */

  function boot() {
    viewportEl = document.getElementById('viewport');
    appEl = document.getElementById('app');
    sceneRootEl = document.getElementById('scene-root');

    window.MSL.Speech.setMuted(window.MSL.Audio.isMuted());

    setupZoomGuards();
    onViewportChange();
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', onViewportChange);

    goto('loading');
  }

  window.MSL = window.MSL || {};
  window.MSL.Main = {
    goto: goto,
    stageStatus: {}
  };

  document.addEventListener('DOMContentLoaded', boot);
})();
