/**
 * common/encyclopedia.js
 * いきもの図鑑 — どのページからでも開けるオーバーレイ
 *
 * 使い方:
 *   Encyclopedia.open(basePath)   // basePath: '.' or '..'
 *   Encyclopedia.close()
 *
 * 依存:
 *   common/museum-data.js   (window.MuseumData)
 *   common/achievements.js  (window.getUnlockedSea)
 */
window.Encyclopedia = (function () {
  'use strict';

  var _overlay = null;
  var _basePath = '..';
  var _currentZoneFilter = 'all';
  var _detailOverlay = null;

  // ── エントリポイント ───────────────────────────────────────────────────────
  function open(basePath) {
    _basePath = basePath || '..';
    _buildOverlay();
    document.body.appendChild(_overlay);
    // 念のため次フレームで表示（CSS transition のため）
    requestAnimationFrame(function () {
      _overlay.classList.add('enc-visible');
    });
    _loadAndRender();
  }

  function close() {
    if (!_overlay) return;
    _overlay.classList.remove('enc-visible');
    setTimeout(function () {
      if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
      _overlay = null;
    }, 280);
  }

  // ── オーバーレイ DOM 構築 ─────────────────────────────────────────────────
  function _buildOverlay() {
    if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);

    // スタイル注入（1回のみ）
    if (!document.getElementById('enc-style')) {
      var style = document.createElement('style');
      style.id = 'enc-style';
      style.textContent = [
        '.enc-overlay{position:fixed;inset:0;z-index:8000;background:rgba(4,14,32,0.97);',
        'font-family:"Zen Maru Gothic",sans-serif;display:flex;flex-direction:column;',
        'opacity:0;transition:opacity 0.28s;pointer-events:none;}',
        '.enc-overlay.enc-visible{opacity:1;pointer-events:all;}',

        /* ヘッダ */
        '.enc-header{display:flex;align-items:center;gap:10px;padding:12px 16px;',
        'background:rgba(255,255,255,0.05);border-bottom:1px solid rgba(56,189,248,0.2);',
        'flex-shrink:0;}',
        '.enc-title{flex:1;font-size:1.1rem;font-weight:900;color:#7DD3FC;}',
        '.enc-progress{font-size:0.78rem;font-weight:700;color:#FCD34D;',
        'background:rgba(252,211,77,0.12);border-radius:12px;padding:3px 10px;white-space:nowrap;}',
        '.enc-close{background:rgba(255,255,255,0.1);border:none;border-radius:50%;',
        'width:36px;height:36px;color:#fff;font-size:1.1rem;cursor:pointer;',
        'font-family:inherit;transition:background 0.15s;}',
        '.enc-close:active{background:rgba(255,255,255,0.25);}',

        /* ゾーンタブ */
        '.enc-tabs{display:flex;gap:6px;padding:10px 12px;overflow-x:auto;',
        'flex-shrink:0;scrollbar-width:none;}',
        '.enc-tabs::-webkit-scrollbar{display:none;}',
        '.enc-tab{border:none;border-radius:20px;padding:6px 14px;',
        'background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);',
        'font-family:inherit;font-size:0.75rem;font-weight:700;cursor:pointer;',
        'white-space:nowrap;transition:all 0.15s;}',
        '.enc-tab.active{background:#0EA5E9;color:#fff;}',
        '.enc-tab:active{transform:scale(0.94);}',

        /* グリッド */
        '.enc-body{flex:1;overflow-y:auto;padding:12px;',
        'display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px;',
        'align-content:start;}',

        /* 生き物カード */
        '.enc-card{border-radius:14px;padding:10px 6px;text-align:center;',
        'cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;',
        'border:2px solid transparent;position:relative;user-select:none;}',
        '.enc-card.unlocked{background:rgba(255,255,255,0.08);border-color:rgba(56,189,248,0.3);}',
        '.enc-card.unlocked:active{transform:scale(0.93);}',
        '.enc-card.locked{background:rgba(255,255,255,0.03);cursor:default;}',
        '.enc-card-new{position:absolute;top:4px;right:4px;',
        'background:#F59E0B;color:#fff;font-size:0.55rem;font-weight:900;',
        'border-radius:8px;padding:1px 5px;line-height:1.4;}',
        '.enc-icon{font-size:2.4rem;line-height:1;margin-bottom:4px;display:block;}',
        '.enc-icon.locked-icon{filter:grayscale(1) brightness(0.35);}',
        '.enc-name{font-size:0.7rem;font-weight:700;color:#fff;line-height:1.3;display:block;}',
        '.enc-name.locked-name{color:rgba(255,255,255,0.2);}',
        '.enc-lock-mark{font-size:0.9rem;display:block;margin-top:2px;}',

        /* 詳細モーダル */
        '.enc-detail-bg{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.6);',
        'display:flex;align-items:center;justify-content:center;padding:20px;}',
        '.enc-detail-box{background:linear-gradient(160deg,#0d2240,#0a3a5a);',
        'border-radius:20px;padding:22px;max-width:360px;width:100%;',
        'box-shadow:0 8px 40px rgba(0,0,0,0.6);border:1.5px solid rgba(56,189,248,0.25);',
        'max-height:90dvh;overflow-y:auto;}',
        '.enc-detail-header{display:flex;align-items:center;gap:12px;margin-bottom:16px;}',
        '.enc-detail-icon{font-size:3rem;line-height:1;}',
        '.enc-detail-name{font-size:1.2rem;font-weight:900;color:#fff;}',
        '.enc-detail-reading{font-size:0.78rem;color:rgba(255,255,255,0.55);}',
        '.enc-detail-row{margin-bottom:12px;}',
        '.enc-detail-label{font-size:0.72rem;font-weight:700;color:#38BDF8;margin-bottom:3px;}',
        '.enc-detail-val{font-size:0.85rem;color:rgba(255,255,255,0.88);line-height:1.6;}',
        '.enc-detail-facts{list-style:none;padding:0;margin:0;}',
        '.enc-detail-facts li{font-size:0.82rem;color:rgba(255,255,255,0.85);',
        'padding:4px 0 4px 16px;position:relative;line-height:1.5;}',
        '.enc-detail-facts li::before{content:"✦";position:absolute;left:0;',
        'color:#38BDF8;font-size:0.6rem;top:7px;}',
        '.enc-detail-close{display:block;width:100%;margin-top:18px;padding:11px;',
        'border:none;border-radius:12px;background:rgba(56,189,248,0.2);',
        'color:#7DD3FC;font-family:inherit;font-size:0.9rem;font-weight:900;',
        'cursor:pointer;transition:background 0.15s;}',
        '.enc-detail-close:active{background:rgba(56,189,248,0.4);}',
      ].join('');
      document.head.appendChild(style);
    }

    _overlay = document.createElement('div');
    _overlay.className = 'enc-overlay';

    // ヘッダ
    var header = document.createElement('div');
    header.className = 'enc-header';
    var titleEl = document.createElement('div');
    titleEl.className = 'enc-title';
    titleEl.textContent = '📖 いきもの図鑑';
    var progressEl = document.createElement('div');
    progressEl.className = 'enc-progress';
    progressEl.id = 'enc-progress-label';
    progressEl.textContent = '…';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'enc-close';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'とじる');
    closeBtn.addEventListener('click', close);
    header.appendChild(titleEl);
    header.appendChild(progressEl);
    header.appendChild(closeBtn);
    _overlay.appendChild(header);

    // タブ行
    var tabBar = document.createElement('div');
    tabBar.className = 'enc-tabs';
    tabBar.id = 'enc-tab-bar';
    _overlay.appendChild(tabBar);

    // グリッド本体
    var body = document.createElement('div');
    body.className = 'enc-body';
    body.id = 'enc-body';
    _overlay.appendChild(body);

    // 背景タップで閉じる
    _overlay.addEventListener('click', function (e) {
      if (e.target === _overlay) close();
    });
  }

  // ── データ読み込み & 描画 ─────────────────────────────────────────────────
  function _loadAndRender() {
    window.MuseumData.load(_basePath).then(function () {
      _renderTabs();
      _renderGrid();
    }).catch(function (e) {
      var body = document.getElementById('enc-body');
      if (body) body.textContent = '読み込みエラー: ' + e.message;
    });
  }

  function _renderTabs() {
    var tabBar = document.getElementById('enc-tab-bar');
    if (!tabBar) return;
    tabBar.innerHTML = '';
    _currentZoneFilter = 'all';

    var zones = window.MuseumData.getZones().filter(function (z) {
      return z.status === 'open';
    });

    // 「全部」タブ
    _addTab(tabBar, 'all', '🌊 ぜんぶ', true);
    zones.forEach(function (z) {
      _addTab(tabBar, z.id, z.icon + ' ' + z.displayName, false);
    });
  }

  function _addTab(bar, id, label, active) {
    var btn = document.createElement('button');
    btn.className = 'enc-tab' + (active ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', function () {
      _currentZoneFilter = id;
      bar.querySelectorAll('.enc-tab').forEach(function (t) { t.classList.remove('active'); });
      btn.classList.add('active');
      _renderGrid();
    });
    bar.appendChild(btn);
  }

  function _renderGrid() {
    var body = document.getElementById('enc-body');
    var progressEl = document.getElementById('enc-progress-label');
    if (!body) return;
    body.innerHTML = '';

    var unlocked = window.getUnlockedSea ? window.getUnlockedSea() : [];
    var unlockedSet = {};
    unlocked.forEach(function (id) { unlockedSet[id] = true; });

    var all = window.MuseumData.getAllCreatures();

    // ゾーンフィルタ
    var filtered = all;
    if (_currentZoneFilter !== 'all') {
      filtered = all.filter(function (c) {
        return c.zones && c.zones.indexOf(_currentZoneFilter) >= 0;
      });
    }

    // 進捗
    var unlockedCount = all.filter(function (c) { return unlockedSet[c.id]; }).length;
    if (progressEl) progressEl.textContent = unlockedCount + ' / ' + all.length + ' あつめた！';

    if (filtered.length === 0) {
      body.innerHTML = '<div style="color:rgba(255,255,255,0.3);font-size:0.85rem;padding:20px;grid-column:1/-1;">いきものが いないよ</div>';
      return;
    }

    // アンロック済みを先に、ロック済みを後に
    filtered.sort(function (a, b) {
      var ua = unlockedSet[a.id] ? 0 : 1;
      var ub = unlockedSet[b.id] ? 0 : 1;
      return ua - ub;
    });

    filtered.forEach(function (creature) {
      var isUnlocked = !!unlockedSet[creature.id];
      var card = _buildCard(creature, isUnlocked);
      body.appendChild(card);
    });
  }

  function _buildCard(creature, isUnlocked) {
    var card = document.createElement('div');
    card.className = 'enc-card ' + (isUnlocked ? 'unlocked' : 'locked');

    var iconEl = document.createElement('span');
    iconEl.className = 'enc-icon' + (isUnlocked ? '' : ' locked-icon');
    iconEl.textContent = isUnlocked ? (creature.icon || '🐟') : '🐟';

    var nameEl = document.createElement('span');
    nameEl.className = 'enc-name' + (isUnlocked ? '' : ' locked-name');
    nameEl.textContent = isUnlocked ? creature.displayName : '???';

    card.appendChild(iconEl);
    card.appendChild(nameEl);

    if (!isUnlocked) {
      var lockEl = document.createElement('span');
      lockEl.className = 'enc-lock-mark';
      lockEl.textContent = '🔒';
      card.appendChild(lockEl);
    }

    if (isUnlocked) {
      card.addEventListener('click', function () {
        _openDetail(creature);
      });
    }

    return card;
  }

  // ── 詳細モーダル ──────────────────────────────────────────────────────────
  function _openDetail(creature) {
    if (_detailOverlay) _detailOverlay.remove();

    var p = creature.profile || {};

    var bg = document.createElement('div');
    bg.className = 'enc-detail-bg';

    var box = document.createElement('div');
    box.className = 'enc-detail-box';

    // ヘッダ
    var dh = document.createElement('div');
    dh.className = 'enc-detail-header';
    var iconEl = document.createElement('div');
    iconEl.className = 'enc-detail-icon';
    iconEl.textContent = creature.icon || '🐟';
    var nameWrap = document.createElement('div');
    var nameEl = document.createElement('div');
    nameEl.className = 'enc-detail-name';
    nameEl.textContent = creature.displayName;
    var readingEl = document.createElement('div');
    readingEl.className = 'enc-detail-reading';
    readingEl.textContent = p.readingName || '';
    nameWrap.appendChild(nameEl);
    nameWrap.appendChild(readingEl);
    dh.appendChild(iconEl);
    dh.appendChild(nameWrap);
    box.appendChild(dh);

    // なかま
    if (p.category) {
      _addDetailRow(box, '🐟 どんな なかま？', p.category);
    }

    // すみか
    if (p.habitat) {
      _addDetailRow(box, '🌊 どこに すんでいるの？', p.habitat);
    }

    // すごいところ
    if (Array.isArray(p.funFacts) && p.funFacts.length > 0) {
      var row = document.createElement('div');
      row.className = 'enc-detail-row';
      var lbl = document.createElement('div');
      lbl.className = 'enc-detail-label';
      lbl.textContent = '✨ すごいところ';
      var ul = document.createElement('ul');
      ul.className = 'enc-detail-facts';
      p.funFacts.forEach(function (f) {
        var li = document.createElement('li');
        li.textContent = f;
        ul.appendChild(li);
      });
      row.appendChild(lbl);
      row.appendChild(ul);
      box.appendChild(row);
    }

    // 閉じるボタン
    var closeBtn = document.createElement('button');
    closeBtn.className = 'enc-detail-close';
    closeBtn.textContent = 'とじる';
    closeBtn.addEventListener('click', function () { bg.remove(); _detailOverlay = null; });
    box.appendChild(closeBtn);

    bg.addEventListener('click', function (e) {
      if (e.target === bg) { bg.remove(); _detailOverlay = null; }
    });

    bg.appendChild(box);
    document.body.appendChild(bg);
    _detailOverlay = bg;
  }

  function _addDetailRow(parent, labelText, valueText) {
    var row = document.createElement('div');
    row.className = 'enc-detail-row';
    var lbl = document.createElement('div');
    lbl.className = 'enc-detail-label';
    lbl.textContent = labelText;
    var val = document.createElement('div');
    val.className = 'enc-detail-val';
    val.textContent = valueText;
    row.appendChild(lbl);
    row.appendChild(val);
    parent.appendChild(row);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return { open: open, close: close };
})();
