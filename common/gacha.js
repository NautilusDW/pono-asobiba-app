/* common/gacha.js - カプセルガチャ演出 + シール獲得ブリッジ */
(function () {
  'use strict';

  if (window.PonoGacha && typeof window.PonoGacha.spin === 'function') return;

  var STYLE_ID = 'pono-gacha-style';
  var CSS = [
    '.pono-gacha-overlay{',
    '  position:fixed;inset:0;z-index:99990;',
    '  background:rgba(0,0,0,0.80);',
    '  display:flex;align-items:center;justify-content:center;',
    '  overflow:hidden;opacity:0;',
    '  transition:opacity 0.35s ease;',
    '  touch-action:none;-webkit-tap-highlight-color:transparent;',
    '}',
    '.pono-gacha-overlay.is-visible{opacity:1;}',
    '.pono-gacha-overlay.is-flash{',
    '  background:rgba(255,255,200,0.55);',
    '  transition:background 0.08s linear;',
    '}',
    '.pono-gacha-overlay.is-leaving{opacity:0;transition:opacity 0.40s ease;}',
    '.pono-gacha-machine{',
    '  position:relative;width:min(60vmin,360px);height:min(60vmin,360px);',
    '  display:flex;align-items:center;justify-content:center;',
    '}',
    '.pono-gacha-capsule{',
    '  position:relative;width:55%;height:55%;',
    '  transform:translateY(-140%) scale(0.6);',
    '  animation:pono-gacha-drop 1.5s cubic-bezier(0.34,1.56,0.64,1) forwards,',
    '            pono-gacha-shake 1.0s ease-in-out 1.5s 1 forwards,',
    '            pono-gacha-burst 0.5s ease-out 2.5s 1 forwards;',
    '}',
    '.pono-gacha-capsule-top,.pono-gacha-capsule-bottom{',
    '  position:absolute;left:0;right:0;height:50%;',
    '  border-radius:50% / 70%;',
    '  box-shadow:inset -8px -10px 24px rgba(0,0,0,0.25),',
    '             inset 12px 14px 22px rgba(255,255,255,0.55),',
    '             0 8px 18px rgba(0,0,0,0.35);',
    '}',
    '.pono-gacha-capsule-top{',
    '  top:0;background:linear-gradient(180deg,#ffe066 0%,#ffb347 100%);',
    '  border-radius:50% 50% 12% 12% / 70% 70% 12% 12%;',
    '  transform-origin:50% 100%;',
    '  animation:pono-gacha-lid 0.5s ease-out 2.5s 1 forwards;',
    '}',
    '.pono-gacha-capsule-bottom{',
    '  bottom:0;background:linear-gradient(180deg,#ff8fa3 0%,#ff5d7a 100%);',
    '  border-radius:12% 12% 50% 50% / 12% 12% 70% 70%;',
    '}',
    '.pono-gacha-sparkle{',
    '  position:absolute;left:50%;top:50%;width:0;height:0;',
    '  opacity:0;pointer-events:none;',
    '  animation:pono-gacha-sparkle 0.6s ease-out 2.7s 1 forwards;',
    '}',
    '.pono-gacha-sparkle::before,.pono-gacha-sparkle::after{',
    '  content:"";position:absolute;left:50%;top:50%;',
    '  width:140vmax;height:6vmin;',
    '  margin:-3vmin 0 0 -70vmax;',
    '  background:linear-gradient(90deg,transparent 0%,#fffbe6 45%,#fff 50%,#fffbe6 55%,transparent 100%);',
    '  filter:blur(2px);',
    '}',
    '.pono-gacha-sparkle::before{transform:rotate(30deg);}',
    '.pono-gacha-sparkle::after{transform:rotate(-30deg);}',
    '.pono-gacha-star{',
    '  position:absolute;left:50%;top:50%;',
    '  width:18px;height:18px;margin:-9px 0 0 -9px;',
    '  font-size:24px;line-height:1;color:#fff8c4;',
    '  text-shadow:0 0 8px #ffd54f,0 0 16px #ffb300;',
    '  opacity:0;',
    '  animation:pono-gacha-star 0.9s ease-out 2.6s 1 forwards;',
    '}',
    '@keyframes pono-gacha-drop{',
    '  0%{transform:translateY(-140%) scale(0.55) rotate(-12deg);}',
    '  60%{transform:translateY(8%) scale(1.05) rotate(2deg);}',
    '  80%{transform:translateY(-6%) scale(0.96) rotate(-2deg);}',
    '  100%{transform:translateY(0) scale(1) rotate(0);}',
    '}',
    '@keyframes pono-gacha-shake{',
    '  0%,100%{transform:translate(0,0) rotate(0);}',
    '  15%{transform:translate(-6%,-2%) rotate(-6deg);}',
    '  30%{transform:translate(6%,2%) rotate(6deg);}',
    '  45%{transform:translate(-5%,-1%) rotate(-5deg);}',
    '  60%{transform:translate(5%,1%) rotate(5deg);}',
    '  75%{transform:translate(-3%,0) rotate(-3deg);}',
    '  90%{transform:translate(3%,0) rotate(3deg);}',
    '}',
    '@keyframes pono-gacha-burst{',
    '  0%{transform:scale(1);}',
    '  40%{transform:scale(1.18);}',
    '  100%{transform:scale(1.05);}',
    '}',
    '@keyframes pono-gacha-lid{',
    '  0%{transform:translateY(0) rotate(0);opacity:1;}',
    '  100%{transform:translate(60%,-180%) rotate(160deg);opacity:0;}',
    '}',
    '@keyframes pono-gacha-sparkle{',
    '  0%{opacity:0;transform:scale(0.3);}',
    '  40%{opacity:1;transform:scale(1.1);}',
    '  100%{opacity:0;transform:scale(1.6);}',
    '}',
    '@keyframes pono-gacha-star{',
    '  0%{opacity:0;transform:scale(0.4);}',
    '  40%{opacity:1;transform:scale(1.4);}',
    '  100%{opacity:0;transform:scale(2.4) translate(var(--dx,0),var(--dy,0));}',
    '}',
    '@media (prefers-reduced-motion: reduce){',
    '  .pono-gacha-capsule,.pono-gacha-capsule-top,.pono-gacha-sparkle,.pono-gacha-star{',
    '    animation-duration:0.6s !important;',
    '  }',
    '}'
  ].join('\n');

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    (document.head || document.documentElement).appendChild(el);
  }

  function buildOverlay() {
    var overlay = document.createElement('div');
    overlay.className = 'pono-gacha-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', 'シールを ひいています');

    var machine = document.createElement('div');
    machine.className = 'pono-gacha-machine';

    var capsule = document.createElement('div');
    capsule.className = 'pono-gacha-capsule';

    var top = document.createElement('div');
    top.className = 'pono-gacha-capsule-top';
    var bottom = document.createElement('div');
    bottom.className = 'pono-gacha-capsule-bottom';
    capsule.appendChild(top);
    capsule.appendChild(bottom);

    var sparkle = document.createElement('div');
    sparkle.className = 'pono-gacha-sparkle';

    machine.appendChild(capsule);
    machine.appendChild(sparkle);

    var i, star, angle, dist;
    for (i = 0; i < 8; i++) {
      star = document.createElement('div');
      star.className = 'pono-gacha-star';
      star.textContent = '✨';
      angle = (Math.PI * 2 * i) / 8;
      dist = 80 + (i % 3) * 18;
      star.style.setProperty('--dx', (Math.cos(angle) * dist) + 'px');
      star.style.setProperty('--dy', (Math.sin(angle) * dist) + 'px');
      star.style.animationDelay = (2.6 + i * 0.04) + 's';
      machine.appendChild(star);
    }

    overlay.appendChild(machine);
    // 演出中はタップを受け付けない
    overlay.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); }, true);
    overlay.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    return overlay;
  }

  // prefers-reduced-motion ユーザーは flash / vibrate を skip。
  // CSS 側 @media (prefers-reduced-motion: reduce) ブロックは別途残してあり
  // 補助的に animation duration を縮める。
  function prefersReducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  function safeVibrate(ms) {
    if (prefersReducedMotion()) return;
    try { if (navigator && typeof navigator.vibrate === 'function') navigator.vibrate(ms); } catch (e) {}
  }

  function fadeOutAndRemove(overlay) {
    return new Promise(function (resolve) {
      if (!overlay || !overlay.parentNode) { resolve(); return; }
      overlay.classList.add('is-leaving');
      overlay.classList.remove('is-visible');
      var done = false;
      var finish = function () {
        if (done) return; done = true;
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve();
      };
      setTimeout(finish, 500);
      overlay.addEventListener('transitionend', finish, { once: true });
    });
  }

  var spinning = false;

  function spin(options) {
    options = options || {};
    var gameId = options.gameId;
    var onClose = typeof options.onClose === 'function' ? options.onClose : null;

    if (spinning) return Promise.resolve({ success: false });
    if (!gameId) return Promise.resolve({ success: false });

    if (!window.PonoGameStickers || typeof window.PonoGameStickers.grant !== 'function') {
      try { alert('ごめんね、 つうしんに しっぱい'); } catch (e) {}
      return Promise.reject(new Error('PonoGameStickers.grant is not available'));
    }

    spinning = true;
    ensureStyle();
    var overlay = buildOverlay();
    document.body.appendChild(overlay);
    // 次フレームで visible 化 → fade-in
    requestAnimationFrame(function () { overlay.classList.add('is-visible'); });

    // フェーズ 2 開始時の背景フラッシュ (1.5s〜2.5s の間で 2 回)。
    // prefers-reduced-motion ユーザーは flash / vibrate ともに skip。
    setTimeout(function () {
      safeVibrate(50);
      if (!prefersReducedMotion()) {
        overlay.classList.add('is-flash');
        setTimeout(function () { overlay.classList.remove('is-flash'); }, 90);
        setTimeout(function () { overlay.classList.add('is-flash'); }, 380);
        setTimeout(function () { overlay.classList.remove('is-flash'); }, 470);
      }
    }, 1500);
    // フェーズ 3 (蓋オープン) でもう一度バイブ
    setTimeout(function () { safeVibrate(50); }, 2500);

    return new Promise(function (resolve) {
      setTimeout(function () {
        Promise.resolve().then(function () {
          return window.PonoGameStickers.grant({
            gameId: gameId,
            event: 'daily_gacha',
            show: false
          });
        }).then(function (result) {
          if (!result) {
            return fadeOutAndRemove(overlay).then(function () {
              spinning = false;
              if (onClose) { try { onClose(); } catch (e) {} }
              resolve({ success: false });
            });
          }
          if (typeof window.showStickerToast === 'function') {
            window.showStickerToast(result, {
              immediate: true,
              onClose: function () {
                fadeOutAndRemove(overlay).then(function () {
                  spinning = false;
                  if (onClose) { try { onClose(); } catch (e) {} }
                  resolve({ success: true, stickerResult: result });
                });
              }
            });
          } else {
            fadeOutAndRemove(overlay).then(function () {
              spinning = false;
              if (onClose) { try { onClose(); } catch (e) {} }
              resolve({ success: true, stickerResult: result });
            });
          }
        }).catch(function (err) {
          try { console.warn('[pono-gacha] grant error:', err); } catch (e) {}
          fadeOutAndRemove(overlay).then(function () {
            spinning = false;
            if (onClose) { try { onClose(); } catch (e) {} }
            resolve({ success: false });
          });
        });
      }, 3000);
    });
  }

  window.PonoGacha = { spin: spin };
})();
