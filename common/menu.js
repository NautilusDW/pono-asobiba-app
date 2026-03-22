// ── common/menu.js ──
// Shared menu toggle + back-confirm for all games
// Usage: <script src="../common/menu.js"></script>
// Then call: initMenu({ bgmToggle: fn }) or just initMenu()
//
// Creates:
// 1. A small ⚙️ toggle button (always visible, top-left or wherever specified)
// 2. Expanding menu with 🏠 (home) and optionally 🎵 (BGM)
// 3. Confirm overlay when 🏠 is tapped

(function() {
  'use strict';

  // ── Inject CSS ──
  const style = document.createElement('style');
  style.textContent = `
    .pono-menu-toggle {
      position: fixed; z-index: 9990;
      top: 10px; left: 10px;
      width: 40px; height: 40px; border-radius: 50%;
      background: rgba(255,255,255,0.7); border: none;
      font-size: 20px; cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, background 0.2s;
      -webkit-tap-highlight-color: transparent;
    }
    .pono-menu-toggle.open {
      background: rgba(255,255,255,0.95);
      transform: rotate(90deg);
    }
    .pono-menu-items {
      position: fixed; z-index: 9989;
      top: 10px; left: 56px;
      display: flex; gap: 8px;
      opacity: 0; pointer-events: none;
      transform: translateX(-12px);
      transition: opacity 0.2s, transform 0.2s;
    }
    .pono-menu-items.show {
      opacity: 1; pointer-events: auto;
      transform: translateX(0);
    }
    .pono-menu-btn {
      width: 40px; height: 40px; border-radius: 50%;
      background: rgba(255,255,255,0.9); border: none;
      font-size: 20px; cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      display: flex; align-items: center; justify-content: center;
      -webkit-tap-highlight-color: transparent;
    }
    .pono-menu-btn:active { transform: scale(0.9); }

    /* ── Confirm overlay ── */
    .pono-confirm-overlay {
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; pointer-events: none;
      transition: opacity 0.25s;
    }
    .pono-confirm-overlay.show {
      opacity: 1; pointer-events: auto;
    }
    .pono-confirm-box {
      background: #fff; border-radius: 24px; padding: 28px 24px 20px;
      text-align: center; min-width: 220px; max-width: 280px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.25);
      transform: scale(0.85);
      transition: transform 0.25s;
    }
    .pono-confirm-overlay.show .pono-confirm-box {
      transform: scale(1);
    }
    .pono-confirm-title {
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: 20px; font-weight: 900;
      color: #333; margin-bottom: 20px;
    }
    .pono-confirm-buttons {
      display: flex; gap: 12px; justify-content: center;
    }
    .pono-confirm-yes, .pono-confirm-no {
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: 18px; font-weight: 900;
      border: none; border-radius: 16px;
      padding: 12px 24px; cursor: pointer;
      min-width: 90px;
      -webkit-tap-highlight-color: transparent;
    }
    .pono-confirm-yes {
      background: linear-gradient(135deg, #a8e6cf, #88d8a8);
      color: #2d6a4f;
    }
    .pono-confirm-no {
      background: linear-gradient(135deg, #ffd3b6, #ffaaa5);
      color: #8b4513;
    }
    .pono-confirm-yes:active, .pono-confirm-no:active {
      transform: scale(0.95);
    }
  `;
  document.head.appendChild(style);

  // ── State ──
  let menuOpen = false;
  let autoCloseTimer = null;

  // ── Create elements ──
  const toggle = document.createElement('button');
  toggle.className = 'pono-menu-toggle';
  toggle.textContent = '⚙️';
  toggle.setAttribute('aria-label', 'メニュー');

  const items = document.createElement('div');
  items.className = 'pono-menu-items';

  const homeBtn = document.createElement('button');
  homeBtn.className = 'pono-menu-btn';
  homeBtn.textContent = '🏠';
  homeBtn.setAttribute('aria-label', 'ホームにもどる');
  items.appendChild(homeBtn);

  // Confirm overlay
  const overlay = document.createElement('div');
  overlay.className = 'pono-confirm-overlay';
  overlay.innerHTML = `
    <div class="pono-confirm-box">
      <div class="pono-confirm-title">ほんとうに もどる？</div>
      <div class="pono-confirm-buttons">
        <button class="pono-confirm-yes">😊 うん</button>
        <button class="pono-confirm-no">✋ まだあそぶ</button>
      </div>
    </div>
  `;

  function openMenu() {
    menuOpen = true;
    toggle.classList.add('open');
    items.classList.add('show');
    resetAutoClose();
  }

  function closeMenu() {
    menuOpen = false;
    toggle.classList.remove('open');
    items.classList.remove('show');
    clearTimeout(autoCloseTimer);
  }

  function resetAutoClose() {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = setTimeout(closeMenu, 5000);
  }

  function showConfirm() {
    closeMenu();
    overlay.classList.add('show');
  }

  function hideConfirm() {
    overlay.classList.remove('show');
  }

  function goHome() {
    location.href = '../';
  }

  // ── Event handlers ──
  toggle.addEventListener('pointerdown', e => {
    e.preventDefault();
    e.stopPropagation();
    if (menuOpen) closeMenu();
    else openMenu();
  });

  homeBtn.addEventListener('pointerdown', e => {
    e.preventDefault();
    e.stopPropagation();
    showConfirm();
  });

  overlay.querySelector('.pono-confirm-yes').addEventListener('pointerdown', e => {
    e.preventDefault();
    goHome();
  });

  overlay.querySelector('.pono-confirm-no').addEventListener('pointerdown', e => {
    e.preventDefault();
    e.stopPropagation();
    hideConfirm();
  });

  // Tap outside confirm box to dismiss
  overlay.addEventListener('pointerdown', e => {
    if (e.target === overlay) {
      e.preventDefault();
      hideConfirm();
    }
  });

  // ── Public API ──
  window.initMenu = function(options) {
    options = options || {};

    // Add BGM button if callback provided
    if (options.bgmToggle) {
      const bgmBtn = document.createElement('button');
      bgmBtn.className = 'pono-menu-btn';
      bgmBtn.textContent = '🎵';
      bgmBtn.setAttribute('aria-label', 'おとのオンオフ');
      bgmBtn.addEventListener('pointerdown', e => {
        e.preventDefault();
        e.stopPropagation();
        options.bgmToggle();
        resetAutoClose();
      });
      items.appendChild(bgmBtn);
      // Keep reference for icon update
      window._ponoMenuBgmBtn = bgmBtn;
    }

    // Add any extra buttons
    if (options.extraButtons) {
      options.extraButtons.forEach(btn => {
        const el = document.createElement('button');
        el.className = 'pono-menu-btn';
        el.textContent = btn.icon;
        if (btn.label) el.setAttribute('aria-label', btn.label);
        el.addEventListener('pointerdown', e => {
          e.preventDefault();
          e.stopPropagation();
          btn.onClick();
          resetAutoClose();
        });
        items.appendChild(el);
      });
    }

    // Remove existing back buttons / links
    const existingBack = document.getElementById('back-btn');
    if (existingBack) existingBack.remove();
    const existingBgm = document.getElementById('bgm-btn');
    if (existingBgm) existingBgm.remove();
    // Remove header back-links
    document.querySelectorAll('.back-link').forEach(el => el.remove());
    // Remove header btn-bgm
    document.querySelectorAll('.btn-bgm').forEach(el => el.remove());

    // Append to body
    document.body.appendChild(toggle);
    document.body.appendChild(items);
    document.body.appendChild(overlay);

    // ── モバイル: ブラウザUIがあっても画面内に収める ──
    // Safari/Chrome のツールバーで上下が狭くなっても、ゲーム全体が見えるようにする。
    // window.innerHeight（実際の可視領域）をCSS変数 --vh に反映し、
    // body や position:fixed 要素の高さをそれに合わせる。
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      (function fitVisibleViewport() {
        // --vh を実際の可視高さに設定
        function updateVH() {
          document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
        }
        updateVH();
        window.addEventListener('resize', updateVH);
        window.addEventListener('orientationchange', function() {
          setTimeout(updateVH, 150);
        });

        var appH = 'calc(var(--vh) * 100)';

        // body + 主要コンテナの高さを可視領域にフィットさせる CSS
        var s = document.createElement('style');
        s.textContent =
          '@media (pointer: coarse) {' +
          '  html, body {' +
          '    height: ' + appH + ' !important;' +
          '    max-height: ' + appH + ' !important;' +
          '    min-height: 0 !important;' +
          '  }' +
          // ゲームコンテナ（height:100dvh を使っている要素）
          '  #app, #coloring-screen, .page {' +
          '    height: ' + appH + ' !important;' +
          '    max-height: ' + appH + ' !important;' +
          '    min-height: 0 !important;' +
          '  }' +
          // position:fixed の全画面要素
          '  #room-scene, #start-screen, #selection-screen,' +
          '  #portrait-notice, #portrait-overlay,' +
          '  .pono-confirm-overlay {' +
          '    height: ' + appH + ' !important;' +
          '    bottom: auto !important;' +
          '  }' +
          '}';
        document.head.appendChild(s);
      })();
    }
  };
})();
