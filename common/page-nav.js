/* ============================================================
 * common/page-nav.js
 * ------------------------------------------------------------
 * 編集可能なページ間を行き来するための、自己完結フローティング
 * ナビゲーション widget。
 *
 *  - <script src="../common/page-nav.js" defer></script> だけで導入可能
 *  - 50×50px の丸ボタン (🌐) を画面端に固定表示
 *  - クリックでドロップダウンを開き、他の編集可能ページへ遷移
 *  - `?edit=1` または `/preview/full/` パスのときだけ自動表示
 *  - `?nonav=1` で per-visit opt-out
 *  - `window.PageNavConfig = { pages, position }` で挙動上書き可能
 *
 *  共通 layout-editor の 🌐 ページ ボタンと併存可能 (どちらも害なし)。
 * ============================================================ */
(function () {
  'use strict';

  // 既に init 済みなら多重 inject しない (defer な script を 2 回読まれた場合の保険)
  if (window.__ponoPageNavInjected) return;
  window.__ponoPageNavInjected = true;

  // -----------------------------------------------------------------
  //  デフォルト設定
  // -----------------------------------------------------------------
  var DEFAULT_PAGES = [
    { name: 'なぞなぞ',                url: '/quizland/?edit=1' },
    { name: 'なぞなぞ サンドボックス', url: '/quizland/preview/full/' },
    { name: 'ずかん (ベジェ編集)',    url: '/zukan/preview/full/' },
    // (other pages added as they become editable)
  ];

  var cfg = (window.PageNavConfig && typeof window.PageNavConfig === 'object')
    ? window.PageNavConfig
    : {};
  var pages = Array.isArray(cfg.pages) ? cfg.pages.slice() : DEFAULT_PAGES.slice();
  var position = (cfg.position === 'top-left' || cfg.position === 'bottom-right' ||
                  cfg.position === 'bottom-left' || cfg.position === 'top-right')
    ? cfg.position
    : 'top-right';

  // -----------------------------------------------------------------
  //  表示判定
  //  - ?nonav=1 が付いていれば常に非表示 (page author / 親ページの opt-out)
  //  - ?edit=1 が付いている / pathname が /preview/full/ を含む → 表示
  //  - それ以外 (通常のプレイモードなど) → 非表示
  // -----------------------------------------------------------------
  function shouldShowNav() {
    try {
      var u = new URL(location.href);
      if (u.searchParams.get('nonav') === '1') return false;
      if (u.searchParams.has('edit'))          return true;
      if (location.pathname.indexOf('/preview/full/') !== -1) return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  if (!shouldShowNav()) return;

  // -----------------------------------------------------------------
  //  CSS インライン挿入 (CSS variable があれば使う・なければ neutral fallback)
  // -----------------------------------------------------------------
  var CSS_TEXT = (function () {
    var POS = {
      'top-right':    'top: 12px; right: 12px;',
      'top-left':     'top: 12px; left: 12px;',
      'bottom-right': 'bottom: 12px; right: 12px;',
      'bottom-left':  'bottom: 12px; left: 12px;',
    }[position];

    var DROP_ANCHOR = (position.indexOf('right') !== -1)
      ? 'right: 0;'
      : 'left: 0;';
    var DROP_VOFF = (position.indexOf('top') !== -1)
      ? 'top: 60px;'
      : 'bottom: 60px;';

    return [
      '#pono-page-nav {',
      '  position: fixed;',
      '  ' + POS,
      '  z-index: 999999;',
      '  font-family: "Zen Maru Gothic", system-ui, sans-serif;',
      '  -webkit-tap-highlight-color: transparent;',
      '}',
      '#pono-page-nav .pn-fab {',
      '  width: 50px; height: 50px;',
      '  border-radius: 50%;',
      '  border: 2px solid var(--ink, #4a3a2a);',
      '  background: var(--paper, #f5e9c8);',
      '  color: var(--ink, #4a3a2a);',
      '  font-size: 22px;',
      '  cursor: pointer;',
      '  box-shadow: 0 2px 8px rgba(0,0,0,0.2),',
      '              0 4px 16px rgba(0,0,0,0.1);',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  padding: 0;',
      '  transition: transform 120ms ease, box-shadow 120ms ease;',
      '}',
      '#pono-page-nav .pn-fab:hover {',
      '  transform: scale(1.05);',
      '  box-shadow: 0 4px 12px rgba(0,0,0,0.25),',
      '              0 6px 20px rgba(0,0,0,0.12);',
      '}',
      '#pono-page-nav .pn-fab:active { transform: scale(0.95); }',
      '#pono-page-nav .pn-drop {',
      '  position: absolute;',
      '  ' + DROP_ANCHOR,
      '  ' + DROP_VOFF,
      '  width: 240px;',
      '  max-height: calc(8 * 44px + 56px);',
      '  background: var(--paper, #fdf6e3);',
      '  border: 2px solid var(--ink, #4a3a2a);',
      '  border-radius: 10px;',
      '  box-shadow: 0 8px 24px rgba(0,0,0,0.25),',
      '              0 4px 12px rgba(0,0,0,0.15);',
      '  overflow: hidden;',
      '  display: none;',
      '  flex-direction: column;',
      '  opacity: 0;',
      '  transform: translateY(-4px);',
      '  transition: opacity 140ms ease, transform 140ms ease;',
      '}',
      '#pono-page-nav.pn-open .pn-drop {',
      '  display: flex;',
      '  opacity: 1;',
      '  transform: translateY(0);',
      '}',
      '#pono-page-nav .pn-title {',
      '  padding: 8px 12px;',
      '  font-weight: 700;',
      '  font-size: 13px;',
      '  color: var(--ink, #4a3a2a);',
      '  background: var(--paper-2, rgba(0,0,0,0.04));',
      '  border-bottom: 1px solid rgba(0,0,0,0.1);',
      '  flex: 0 0 auto;',
      '}',
      '#pono-page-nav .pn-list {',
      '  list-style: none;',
      '  margin: 0;',
      '  padding: 4px 0;',
      '  overflow-y: auto;',
      '  max-height: calc(8 * 44px);',
      '  flex: 1 1 auto;',
      '}',
      '#pono-page-nav .pn-item { margin: 0; }',
      '#pono-page-nav .pn-link {',
      '  display: block;',
      '  padding: 10px 14px;',
      '  font-size: 14px;',
      '  color: var(--ink, #4a3a2a);',
      '  text-decoration: none;',
      '  border-left: 3px solid transparent;',
      '  transition: background 100ms ease, border-color 100ms ease;',
      '  cursor: pointer;',
      '}',
      '#pono-page-nav .pn-link:hover {',
      '  background: rgba(0,0,0,0.06);',
      '  border-left-color: var(--accent, #c89a3a);',
      '}',
      '#pono-page-nav .pn-link.pn-current {',
      '  color: rgba(0,0,0,0.55);',
      '  cursor: default;',
      '  font-weight: 700;',
      '}',
      '#pono-page-nav .pn-link.pn-current:hover {',
      '  background: transparent;',
      '  border-left-color: transparent;',
      '}',
      '#pono-page-nav .pn-close {',
      '  flex: 0 0 auto;',
      '  padding: 8px 12px;',
      '  border: none;',
      '  border-top: 1px solid rgba(0,0,0,0.1);',
      '  background: var(--paper-2, rgba(0,0,0,0.03));',
      '  color: var(--ink, #4a3a2a);',
      '  font-family: inherit;',
      '  font-size: 13px;',
      '  cursor: pointer;',
      '  text-align: center;',
      '}',
      '#pono-page-nav .pn-close:hover { background: rgba(0,0,0,0.08); }',
      ''
    ].join('\n');
  })();

  // -----------------------------------------------------------------
  //  現在ページ判定
  //  pathname を比較。 末尾スラッシュ・クエリ無視で「先頭一致」で判定。
  // -----------------------------------------------------------------
  function isCurrentPage(entry) {
    if (!entry || !entry.url) return false;
    try {
      var resolved = new URL(entry.url, location.href);
      var a = resolved.pathname.replace(/\/+$/, '/');
      var b = location.pathname.replace(/\/+$/, '/');
      return a === b;
    } catch (e) {
      return false;
    }
  }

  // -----------------------------------------------------------------
  //  DOM 構築
  // -----------------------------------------------------------------
  function inject() {
    if (document.getElementById('pono-page-nav')) return;

    var style = document.createElement('style');
    style.id = 'pono-page-nav-style';
    style.textContent = CSS_TEXT;
    document.head.appendChild(style);

    var root = document.createElement('div');
    root.id = 'pono-page-nav';

    var fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'pn-fab';
    fab.setAttribute('aria-haspopup', 'true');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-label', '他の編集ページへ移動');
    fab.title = '他の編集ページへ移動';
    fab.textContent = '🌐';

    var drop = document.createElement('div');
    drop.className = 'pn-drop';
    drop.setAttribute('role', 'menu');

    var title = document.createElement('div');
    title.className = 'pn-title';
    title.textContent = '編集可能なページ';
    drop.appendChild(title);

    var ul = document.createElement('ul');
    ul.className = 'pn-list';

    pages.forEach(function (p) {
      if (!p || typeof p !== 'object' || !p.url || !p.name) return;
      var li = document.createElement('li');
      li.className = 'pn-item';
      var a = document.createElement('a');
      a.className = 'pn-link';
      a.setAttribute('role', 'menuitem');

      var current = (p.current === true) || isCurrentPage(p);
      if (current) {
        a.classList.add('pn-current');
        a.textContent = '📍 ' + p.name;
        a.setAttribute('aria-current', 'page');
        // disable link
        a.addEventListener('click', function (e) { e.preventDefault(); });
      } else {
        a.href = p.url;
        a.textContent = p.name;
      }
      li.appendChild(a);
      ul.appendChild(li);
    });

    drop.appendChild(ul);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'pn-close';
    closeBtn.textContent = '閉じる';
    closeBtn.addEventListener('click', function () { setOpen(false); });
    drop.appendChild(closeBtn);

    root.appendChild(fab);
    root.appendChild(drop);
    document.body.appendChild(root);

    // -----------------------------------------------------------------
    //  open/close 制御
    // -----------------------------------------------------------------
    function setOpen(open) {
      if (open) {
        root.classList.add('pn-open');
        fab.setAttribute('aria-expanded', 'true');
      } else {
        root.classList.remove('pn-open');
        fab.setAttribute('aria-expanded', 'false');
      }
    }

    fab.addEventListener('click', function (e) {
      e.stopPropagation();
      var nowOpen = !root.classList.contains('pn-open');
      setOpen(nowOpen);
    });

    // ドロップダウン内クリックは伝播を止めて閉じない
    drop.addEventListener('click', function (e) { e.stopPropagation(); });

    // 外側クリックで閉じる
    document.addEventListener('click', function () {
      if (root.classList.contains('pn-open')) setOpen(false);
    });

    // Esc で閉じる
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('pn-open')) {
        setOpen(false);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  } else {
    inject();
  }
})();
