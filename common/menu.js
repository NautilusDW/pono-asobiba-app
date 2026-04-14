// ── common/menu.js ──
// Shared ⚙️ dropdown menu for all games
// Usage: <script src="../common/menu.js"></script>
// Then call: initMenu({ bgmToggle: fn, tutorial: fn, extraButtons: [...] })
//
// Creates:
// 1. A ⚙️ button (top-left, always visible)
// 2. Dropdown with: 🏠 もどる / 🎵 おと / ❓ あそびかた / extras
// 3. Confirm overlay for 🏠

(function() {
  'use strict';

  // ── PWA SW更新チェック（全ページ共通）──
  // SW更新時に自動リロードし、ユーザーが古いコードを使い続けないようにする
  if ('serviceWorker' in navigator) {
    var _swRefreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      if (_swRefreshing) return;
      _swRefreshing = true;
      window.location.reload();
    });
    // ゲームページ起動時にSW更新チェック
    navigator.serviceWorker.ready.then(function(reg) {
      reg.update();
    });
  }

  const style = document.createElement('style');
  style.textContent = `
    .pono-menu-toggle {
      position: fixed; z-index: 9990;
      top: max(12px, env(safe-area-inset-top));
      left: max(16px, env(safe-area-inset-left));
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

    /* ── Dropdown ── */
    .pono-dropdown {
      position: fixed; z-index: 9989;
      top: calc(max(12px, env(safe-area-inset-top)) + 46px);
      left: max(16px, env(safe-area-inset-left));
      background: rgba(255,255,255,0.96);
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.18);
      padding: 6px;
      display: flex; flex-direction: column; gap: 4px;
      min-width: 160px;
      opacity: 0; pointer-events: none;
      transform: translateY(-8px);
      transition: opacity 0.2s, transform 0.2s;
    }
    .pono-dropdown.show {
      opacity: 1; pointer-events: auto;
      transform: translateY(0);
    }
    .pono-dd-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px;
      border: none; border-radius: 12px;
      background: transparent;
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: 0.88rem; font-weight: 700;
      color: #5D4E37; cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s;
    }
    .pono-dd-item:active { background: rgba(242,145,90,0.15); }
    .pono-dd-icon { font-size: 1.2rem; width: 28px; text-align: center; flex-shrink: 0; }
    .pono-dd-item.bgm-off .pono-dd-icon { opacity: 0.35; filter: grayscale(1); }
    .pono-dd-item.bgm-off .pono-dd-label { opacity: 0.5; }
    .pono-dd-label { white-space: nowrap; }

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
      background: #fff; border-radius: 24px; padding: 28px 20px 20px;
      text-align: center; width: 280px;
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
      display: flex; gap: 10px; justify-content: center;
    }
    .pono-confirm-yes, .pono-confirm-no {
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: 14px; font-weight: 900;
      border: none; border-radius: 14px;
      padding: 12px 0; cursor: pointer;
      width: 120px;
      text-align: center;
      white-space: nowrap;
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

  // ── Create elements ──
  const toggle = document.createElement('button');
  toggle.className = 'pono-menu-toggle';
  toggle.textContent = '⚙️';
  toggle.setAttribute('aria-label', 'メニュー');

  const dropdown = document.createElement('div');
  dropdown.className = 'pono-dropdown';

  // Confirm overlay
  const overlay = document.createElement('div');
  overlay.className = 'pono-confirm-overlay';
  overlay.innerHTML = `
    <div class="pono-confirm-box">
      <div class="pono-confirm-title">ほんとうに もどる？</div>
      <div class="pono-confirm-buttons">
        <button class="pono-confirm-yes">🏠 もどる</button>
        <button class="pono-confirm-no">✋ まだあそぶ</button>
      </div>
    </div>
  `;

  function openMenu() {
    menuOpen = true;
    toggle.classList.add('open');
    dropdown.classList.add('show');
  }

  function closeMenu() {
    menuOpen = false;
    toggle.classList.remove('open');
    dropdown.classList.remove('show');
  }

  function showConfirm() {
    closeMenu();
    overlay.classList.add('show');
  }

  function hideConfirm() {
    overlay.classList.remove('show');
  }

  function goHome() {
    location.href = '../play.html';
  }

  // Toggle menu
  toggle.addEventListener('pointerdown', e => {
    e.preventDefault();
    e.stopPropagation();
    if (menuOpen) closeMenu();
    else openMenu();
  });

  // Close menu when tapping outside
  document.addEventListener('pointerdown', e => {
    if (menuOpen && !toggle.contains(e.target) && !dropdown.contains(e.target)) {
      closeMenu();
    }
  });

  // Confirm overlay events
  overlay.querySelector('.pono-confirm-yes').addEventListener('pointerdown', e => {
    e.preventDefault();
    goHome();
  });
  overlay.querySelector('.pono-confirm-no').addEventListener('pointerdown', e => {
    e.preventDefault();
    e.stopPropagation();
    hideConfirm();
  });
  overlay.addEventListener('pointerdown', e => {
    if (e.target === overlay) {
      e.preventDefault();
      hideConfirm();
    }
  });

  // ── Helper: create a dropdown item ──
  function createItem(icon, label, onClick) {
    const item = document.createElement('button');
    item.className = 'pono-dd-item';
    item.innerHTML = `<span class="pono-dd-icon">${icon}</span><span class="pono-dd-label">${label}</span>`;
    item.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      onClick(item);
    });
    return item;
  }

  // ── Public API ──
  window.initMenu = function(options) {
    options = options || {};

    // Clear previous items
    dropdown.innerHTML = '';

    // 🏠 Home
    dropdown.appendChild(createItem('🏠', 'もどる', () => {
      closeMenu();
      showConfirm();
    }));

    // 🎵 BGM
    if (options.bgmToggle) {
      const bgmItem = createItem('🎵', 'おと ON', (item) => {
        options.bgmToggle();
        const isOff = localStorage.getItem('pono_bgm_enabled') === 'off';
        item.classList.toggle('bgm-off', isOff);
        item.querySelector('.pono-dd-label').textContent = isOff ? 'おと OFF' : 'おと ON';
      });
      if (localStorage.getItem('pono_bgm_enabled') === 'off') {
        bgmItem.classList.add('bgm-off');
        bgmItem.querySelector('.pono-dd-label').textContent = 'おと OFF';
      }
      dropdown.appendChild(bgmItem);
      window._ponoMenuBgmBtn = bgmItem;
    }

    // ❓ Tutorial
    if (options.tutorial) {
      dropdown.appendChild(createItem('❓', 'あそびかた', () => {
        closeMenu();
        options.tutorial();
      }));
    }

    // Extra buttons
    if (options.extraButtons) {
      options.extraButtons.forEach(btn => {
        dropdown.appendChild(createItem(btn.icon, btn.label, () => {
          closeMenu();
          btn.onClick();
        }));
      });
    }

    // Remove existing back buttons / links
    const existingBack = document.getElementById('back-btn');
    if (existingBack) existingBack.remove();
    const existingBgm = document.getElementById('bgm-btn');
    if (existingBgm) existingBgm.remove();
    document.querySelectorAll('.back-link').forEach(el => el.remove());
    document.querySelectorAll('.btn-bgm').forEach(el => el.remove());

    // Append to body
    document.body.appendChild(toggle);
    document.body.appendChild(dropdown);
    document.body.appendChild(overlay);

    // ── iOS Safari: 画面回転後にposition:fixedのヒットテスト領域がずれるバグ対策 ──
    function forceMenuRelayout() {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      var parent = toggle.parentNode;
      if (parent) {
        parent.removeChild(toggle);
        parent.appendChild(toggle);
      }
      if (dropdown.parentNode) {
        var dp = dropdown.parentNode;
        dp.removeChild(dropdown);
        dp.appendChild(dropdown);
      }
    }
    window.addEventListener('orientationchange', function() {
      setTimeout(forceMenuRelayout, 200);
      setTimeout(forceMenuRelayout, 600);
      setTimeout(forceMenuRelayout, 1000);
    });
    var _orientMQL = matchMedia('(orientation: portrait)');
    if (_orientMQL.addEventListener) {
      _orientMQL.addEventListener('change', function() {
        setTimeout(forceMenuRelayout, 100);
        setTimeout(forceMenuRelayout, 500);
      });
    }

    // ── モバイル: ブラウザUIがあっても画面内に収める ──
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      (function fitVisibleViewport() {
        function updateVH() {
          var vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
          document.documentElement.style.setProperty('--vh', vh + 'px');
        }
        updateVH();
        window.addEventListener('resize', updateVH);
        if (window.visualViewport) window.visualViewport.addEventListener('resize', updateVH);
        window.addEventListener('orientationchange', function() {
          setTimeout(updateVH, 150);
          setTimeout(updateVH, 500);
        });

        var appH = 'calc(var(--vh) * 100)';
        var s = document.createElement('style');
        s.textContent =
          '@media (pointer: coarse) {' +
          '  html, body {' +
          '    height: ' + appH + ' !important;' +
          '    max-height: ' + appH + ' !important;' +
          '    min-height: 0 !important;' +
          '  }' +
          '  #app, #coloring-screen, .page {' +
          '    height: ' + appH + ' !important;' +
          '    max-height: ' + appH + ' !important;' +
          '    min-height: 0 !important;' +
          '  }' +
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
