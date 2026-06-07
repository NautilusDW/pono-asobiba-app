// PonoPartnerSelect — パートナー選択オーバーレイ UI
// 「もりのなかよし」MVP — Phase 1 UI
//
// 依存:
//   window.PonoPartners (partners.js) — パートナー定義
//   window.PonoBond     (bond.js)     — なかよしハート / 解禁状態
//   window.PuzzleVoice  (voice.js)    — 任意 (あれば SE 用 hook)
//
// Public API:
//   window.PonoPartnerSelect.show(stageId, callback)
//     - stageId: number | string — 表示中ステージID (ハート数表示用)
//     - callback(partnerId | null) — 選択時 / キャンセル時に呼ばれる
//   window.PonoPartnerSelect.hide()
//     - 強制クローズ (callback は呼ばれない)
//   window.PonoPartnerSelect.isOpen()
//     - 表示中かどうか
//
// UX:
//   - 全画面オーバーレイ (rgba 20,30,40,0.85) + 5パートナーカード
//   - フクロウは locked なら鍵 + 「Stage20でかいきん」表示 → タップ不可
//   - Esc キー / 背景クリック / キャンセルボタン で cancel
//   - カードタップ時: hide() → callback({ action:'preview', partnerId, scrollLeft })
//   - 確定は main.js の実UIチュートリアル後に行う
//   - 全タップ領域 >= 44px / vanilla JS / 動的 DOM
window.PonoPartnerSelect = (function () {
  'use strict';

  var CSS_HREF = 'partner-select.css';
  var ROOT_ID = 'pono-pselect-root';

  /** state */
  var _root = null;
  var _open = false;
  var _callback = null;
  var _stageId = null;
  var _keyHandler = null;
  var _resizeHandler = null;
  var _previouslyFocused = null;
  var _initialScrollLeft = 0;
  var _focusPartnerId = null;

  /** CSS ファイルを <head> に link 注入 (重複防止) */
  function ensureStylesheet() {
    if (document.querySelector('link[data-pono-pselect]')) return;
    // index.html に明示的に書かれていない場合の保険。既に link がある場合はスキップ。
    var existing = document.querySelector('link[href$="' + CSS_HREF + '"]');
    if (existing) {
      existing.setAttribute('data-pono-pselect', '1');
      return;
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    link.setAttribute('data-pono-pselect', '1');
    document.head.appendChild(link);
  }

  /** 星表示 (現在ステージでの Lv 0〜3) — DOM 要素を返す (XSS 防止) */
  function renderStars(level) {
    var max = 3;
    var filled = Math.max(0, Math.min(max, level | 0));
    var s = '';
    for (var i = 0; i < filled; i++) s += '★';
    var empty = '';
    for (var j = 0; j < max - filled; j++) empty += '☆';

    var wrap = document.createElement('span');
    wrap.className = 'pono-pselect__stars';

    var filledEl = document.createElement('span');
    filledEl.className = 'pono-pselect__stars-filled';
    filledEl.textContent = s;
    wrap.appendChild(filledEl);

    var emptyEl = document.createElement('span');
    emptyEl.className = 'pono-pselect__stars-empty';
    emptyEl.textContent = empty;
    wrap.appendChild(emptyEl);

    return wrap;
  }

  /**
   * 難易度ラベル生成。
   * partner.difficulty が以下のいずれかである想定:
   *   'easy'   → かんたん
   *   'normal' → ふつう
   *   'tricky' → むずかしい (現状未使用だが将来の追加キャラ用に残置)
   * 未設定の場合は ageHint からフォールバック (3→easy / 4→normal / 5→tricky)。
   *
   * 注: 星マーク (★★★) と「おすすめ」バッジは
   *     ユーザーFB (2026-06-05) により基準不明・誤解を招くため廃止。
   *     性格 (trait) と難易度ラベルは別軸として分離した。
   */
  function resolveDifficulty(partner) {
    if (!partner) return null;
    var raw = partner.difficulty;
    if (raw === 'easy' || raw === 'normal' || raw === 'tricky') return raw;
    var hint = partner && partner.ageHint ? String(partner.ageHint) : '';
    if (hint.indexOf('3') === 0) return 'easy';
    if (hint.indexOf('4') === 0) return 'normal';
    if (hint.indexOf('5') === 0) return 'tricky';
    return null;
  }

  function buildDifficultyBadge(difficulty) {
    if (!difficulty) return null;
    var label = '';
    if (difficulty === 'easy')        { label = 'かんたん';   }
    else if (difficulty === 'normal') { label = 'ふつう';     }
    else if (difficulty === 'tricky') { label = 'むずかしい'; }
    else return null;

    var badge = document.createElement('div');
    badge.className = 'pono-pselect__difficulty pono-pselect__difficulty--' + difficulty;
    var labelEl = document.createElement('span');
    labelEl.className = 'pono-pselect__difficulty-label';
    labelEl.textContent = label;
    badge.appendChild(labelEl);
    badge.setAttribute('aria-label', 'むずかしさ ' + label);
    return badge;
  }

  function resolveTier(partner) {
    var tier = partner && partner.tier ? String(partner.tier) : 'free';
    if (tier === 'book' || tier === 'sub') return tier;
    return 'free';
  }

  function buildTierBadge(tier) {
    var label = 'フリー';
    var icon = '🌱';
    if (tier === 'book') {
      label = 'えほん';
      icon = '📖';
    } else if (tier === 'sub') {
      label = 'サブスク';
      icon = '⭐';
    }

    var badge = document.createElement('div');
    badge.className = 'pono-pselect__tier pono-pselect__tier--' + tier;
    var iconEl = document.createElement('span');
    iconEl.className = 'pono-pselect__tier-icon';
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.textContent = icon;
    var labelEl = document.createElement('span');
    labelEl.className = 'pono-pselect__tier-label';
    labelEl.textContent = label;
    badge.appendChild(iconEl);
    badge.appendChild(labelEl);
    badge.setAttribute('aria-label', 'つかえる くぶん ' + label);
    return badge;
  }

  /** SE 用 hook (PuzzleVoice があれば一応鳴らす。失敗しても無視) */
  function tryPlayTap() {
    try {
      if (window.PuzzleVoice && typeof window.PuzzleVoice.playRandom === 'function') {
        // 'tap' グループが無くても voice.js 側で握りつぶされる想定
        window.PuzzleVoice.playRandom('tap');
      }
    } catch (_) { /* noop */ }
  }

  /** カード DOM 生成 */
  function buildCard(p, stageId) {
    var Bond = window.PonoBond;
    var locked = (window.PonoPartners && typeof window.PonoPartners.isUnlocked === 'function')
      ? !window.PonoPartners.isUnlocked(p)
      : !!p.locked;
    var lockLabel = (window.PonoPartners && typeof window.PonoPartners.getUnlockLabel === 'function')
      ? window.PonoPartners.getUnlockLabel(p)
      : '🔒 まだ';

    var level = 0;
    var total = 0;
    if (Bond && !locked) {
      try { level = Bond.getLevel(p.id, stageId) | 0; } catch (_) { level = 0; }
      try { total = Bond.getTotal(p.id) | 0; } catch (_) { total = 0; }
    }

    var currentSel = (Bond && typeof Bond.getSelectedPartner === 'function')
      ? Bond.getSelectedPartner() : null;
    var tier = resolveTier(p);

    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'pono-pselect__card' +
      ' is-tier-' + tier +
      (locked ? ' is-locked' : '') +
      (p.challengeType ? ' is-challenge' : '') +
      (!locked && currentSel === p.id ? ' is-selected' : '');
    card.setAttribute('data-partner-id', p.id);
    card.setAttribute('aria-label',
      p.name + (locked ? ' (ロック中)' : '') + ' — ' + (p.assistDesc || p.trait || '')
    );
    if (locked) card.setAttribute('aria-disabled', 'true');

    // 難易度ラベル (かんたん / ふつう / むずかしい) — カード最上部
    var difficulty = resolveDifficulty(p);
    var diffBadge = buildDifficultyBadge(difficulty);
    if (diffBadge) {
      card.appendChild(diffBadge);
    }
    card.appendChild(buildTierBadge(tier));

    // 立ち絵
    var portrait = document.createElement('div');
    portrait.className = 'pono-pselect__portrait';
    var img = document.createElement('img');
    img.src = p.image || '';
    img.alt = p.name || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    // 個別サムネで微調整が必要な場合だけ object-position を適用する。
    if (p.imagePosition && typeof p.imagePosition === 'string') {
      img.style.setProperty('--pos-default', p.imagePosition);
      img.style.setProperty('--pos-wide',
        (p.imagePositionWide && typeof p.imagePositionWide === 'string')
          ? p.imagePositionWide
          : p.imagePosition);
      // 互換: 古いブラウザでも従来通り動くよう object-position 直書きも残す
      img.style.objectPosition = p.imagePosition;
    }
    portrait.appendChild(img);
    if (locked) {
      var lockBadge = document.createElement('div');
      lockBadge.className = 'pono-pselect__lock';
      lockBadge.textContent = '🔒';
      lockBadge.setAttribute('aria-hidden', 'true');
      portrait.appendChild(lockBadge);
    }
    card.appendChild(portrait);

    // 名前
    var name = document.createElement('div');
    name.className = 'pono-pselect__name';
    name.textContent = p.name || p.id;
    card.appendChild(name);

    // 説明。補助キャラは「とくぎ」、難化キャラは「チャレンジ」。
    if (p.assistDesc) {
      var assistLabel = document.createElement('div');
      assistLabel.className = 'pono-pselect__assist-label';
      assistLabel.textContent = p.challengeType ? 'チャレンジ' : 'とくぎ';
      card.appendChild(assistLabel);

      var assistDesc = document.createElement('div');
      assistDesc.className = 'pono-pselect__assist-desc';
      assistDesc.textContent = p.assistDesc;
      card.appendChild(assistDesc);
    }

    if (locked) {
      var reason = document.createElement('div');
      reason.className = 'pono-pselect__lock-reason';
      reason.textContent = lockLabel;
      card.appendChild(reason);
    } else {
      // 星 + ハート合計 — innerHTML を使わず DOM 要素で構築 (XSS 防止)
      var stats = document.createElement('div');
      stats.className = 'pono-pselect__stats';
      stats.appendChild(renderStars(level));
      var heartsEl = document.createElement('span');
      heartsEl.className = 'pono-pselect__hearts';
      heartsEl.textContent = '❤ ' + (total | 0);
      stats.appendChild(heartsEl);
      card.appendChild(stats);
    }

    // クリック
    card.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (locked) {
        // ロック時はちょっとシェイクしたい所だが、最小実装としては無反応 + aria
        tryPlayTap();
        card.animate(
          [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-6px)' },
            { transform: 'translateX(6px)' },
            { transform: 'translateX(0)' }
          ],
          { duration: 220, easing: 'ease-out' }
        );
        return;
      }
      tryPlayTap();
      selectPartner(p.id);
    });

    return card;
  }

  /** カード選択: まだ確定せず、実UIプレビューへ進む */
  function selectPartner(partnerId) {
    if (!_open) return;
    var partner = (window.PonoPartners && typeof window.PonoPartners.get === 'function')
      ? window.PonoPartners.get(partnerId) : null;
    if (window.PonoPartners && typeof window.PonoPartners.isUnlocked === 'function'
        && !window.PonoPartners.isUnlocked(partner)) {
      return;
    }
    var cb = _callback;
    var scrollLeft = 0;
    try {
      var scroller = _root && _root.querySelector('.pono-pselect__scroller');
      scrollLeft = scroller ? scroller.scrollLeft : 0;
    } catch (_) {}
    _callback = null; // hide で重複呼びを防ぐ
    hide();
    try {
      if (typeof cb === 'function') {
        cb({ action: 'preview', partnerId: partnerId, scrollLeft: scrollLeft });
      }
    } catch (e2) {
      console.error('[PonoPartnerSelect] callback threw:', e2);
    }
  }

  /** キャンセル */
  function cancel() {
    if (!_open) return;
    var cb = _callback;
    _callback = null;
    hide();
    try { if (typeof cb === 'function') cb({ action: 'cancel' }); } catch (e) {
      console.error('[PonoPartnerSelect] cancel callback threw:', e);
    }
  }

  /** Esc キーハンドラ */
  function onKey(ev) {
    if (!_open) return;
    if (ev.key === 'Escape' || ev.keyCode === 27) {
      ev.preventDefault();
      cancel();
    }
  }

  function clearResizeHandler() {
    if (_resizeHandler) {
      window.removeEventListener('resize', _resizeHandler);
      _resizeHandler = null;
    }
  }

  /** show */
  function show(stageId, callback, options) {
    options = options || {};
    try { document.body.classList.add('partner-choice-ui-open'); } catch (_) {}
    if (_open) {
      // 既に開いている場合は callback を更新して再描画
      _callback = (typeof callback === 'function') ? callback : null;
      _stageId = stageId;
      _initialScrollLeft = Math.max(0, Number(options.initialScrollLeft || 0) || 0);
      _focusPartnerId = options.focusPartnerId || null;
      rebuild();
      return;
    }
    if (!window.PonoPartners || !Array.isArray(window.PonoPartners.list)) {
      console.error('[PonoPartnerSelect] PonoPartners not available');
      if (typeof callback === 'function') {
        try { callback(null); } catch (_) { /* noop */ }
      }
      return;
    }

    ensureStylesheet();
    _stageId = stageId;
    _callback = (typeof callback === 'function') ? callback : null;
    _initialScrollLeft = Math.max(0, Number(options.initialScrollLeft || 0) || 0);
    _focusPartnerId = options.focusPartnerId || null;
    _previouslyFocused = (document.activeElement && document.activeElement.blur)
      ? document.activeElement : null;

    _root = document.createElement('div');
    _root.id = ROOT_ID;
    _root.className = 'pono-pselect';
    _root.setAttribute('role', 'dialog');
    _root.setAttribute('aria-modal', 'true');
    _root.setAttribute('aria-label', 'パートナーを えらぶ');

    // 背景クリック (root を直接クリックした場合のみキャンセル)
    _root.addEventListener('click', function (ev) {
      if (ev.target === _root) cancel();
    });

    document.body.appendChild(_root);
    _open = true;

    rebuild();

    _keyHandler = onKey;
    document.addEventListener('keydown', _keyHandler, true);

    // フォーカスを最初の有効カードに移して a11y を整える
    try {
      var firstEnabled = _focusPartnerId
        ? _root.querySelector('.pono-pselect__card[data-partner-id="' + _focusPartnerId + '"]:not(.is-locked)')
        : null;
      if (!firstEnabled) firstEnabled = _root.querySelector('.pono-pselect__card:not(.is-locked)');
      if (firstEnabled && firstEnabled.focus) firstEnabled.focus({ preventScroll: true });
    } catch (_) { /* noop */ }
  }

  /** 中身だけ作り直し (stageId が変わった時用) */
  function rebuild() {
    if (!_root) return;
    clearResizeHandler();
    while (_root.firstChild) _root.removeChild(_root.firstChild);

    // header — innerHTML を使わず DOM 要素で構築 (XSS 防止)
    var header = document.createElement('div');
    header.className = 'pono-pselect__header';
    var title = document.createElement('div');
    title.className = 'pono-pselect__title';
    title.appendChild(document.createTextNode('だれと あそぶ？'));
    var stageBadge = document.createElement('span');
    stageBadge.className = 'pono-pselect__title-stage';
    stageBadge.textContent = 'ステージ ' + String(_stageId != null ? _stageId : '?');
    title.appendChild(stageBadge);
    header.appendChild(title);
    _root.appendChild(header);

    // 横スクロールリスト (1行 + scroll-snap)
    var scroller = document.createElement('div');
    scroller.className = 'pono-pselect__scroller';
    scroller.setAttribute('role', 'group');
    scroller.setAttribute('aria-label', 'パートナー一覧 (横にスクロール)');

    var track = document.createElement('div');
    track.className = 'pono-pselect__track';
    var list = window.PonoPartners.list || [];
    for (var i = 0; i < list.length; i++) {
      track.appendChild(buildCard(list[i], _stageId));
    }
    scroller.appendChild(track);

    // スクロールヒント (実際に横 overflow がある場合だけ表示)
    var hint = null;
    if (list.length > 3) {
      hint = document.createElement('div');
      hint.className = 'pono-pselect__scroll-hint';
      hint.setAttribute('aria-hidden', 'true');
      var hintLeft = document.createElement('span');
      hintLeft.className = 'pono-pselect__scroll-hint-arrow';
      hintLeft.textContent = '←';
      var hintText = document.createElement('span');
      hintText.className = 'pono-pselect__scroll-hint-text';
      hintText.textContent = 'よこに スクロールで もっと みえるよ';
      var hintRight = document.createElement('span');
      hintRight.className = 'pono-pselect__scroll-hint-arrow';
      hintRight.textContent = '→';
      hint.appendChild(hintLeft);
      hint.appendChild(hintText);
      hint.appendChild(hintRight);
      _root.appendChild(hint);
    }

    _root.appendChild(scroller);
    if (hint) {
      _resizeHandler = function () {
        var hasOverflow = scroller.scrollWidth > scroller.clientWidth + 2;
        hint.classList.toggle('is-hidden', !hasOverflow);
      };
      requestAnimationFrame(_resizeHandler);
      window.addEventListener('resize', _resizeHandler, { passive: true });
    }
    if (_initialScrollLeft > 0) {
      requestAnimationFrame(function () {
        try { scroller.scrollLeft = _initialScrollLeft; } catch (_) {}
      });
    }

    // footer
    var footer = document.createElement('div');
    footer.className = 'pono-pselect__footer';
    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'pono-pselect__cancel';
    cancelBtn.textContent = 'キャンセル';
    cancelBtn.setAttribute('aria-label', 'パートナー選択をキャンセル');
    cancelBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      tryPlayTap();
      cancel();
    });
    footer.appendChild(cancelBtn);
    _root.appendChild(footer);
  }

  /** hide (callback は呼ばない: 呼び出し側で制御) */
  function hide() {
    clearResizeHandler();
    if (_keyHandler) {
      document.removeEventListener('keydown', _keyHandler, true);
      _keyHandler = null;
    }
    if (_root && _root.parentNode) {
      _root.parentNode.removeChild(_root);
    }
    _root = null;
    _open = false;
    _stageId = null;
    _initialScrollLeft = 0;
    _focusPartnerId = null;
    try { document.body.classList.remove('partner-choice-ui-open'); } catch (_) {}
    // フォーカスを戻す (任意)
    try {
      if (_previouslyFocused && typeof _previouslyFocused.focus === 'function') {
        _previouslyFocused.focus({ preventScroll: true });
      }
    } catch (_) { /* noop */ }
    _previouslyFocused = null;
  }

  function isOpen() { return _open; }

  /** 簡易 HTML escape (ステージID表示用) */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    show: show,
    hide: hide,
    isOpen: isOpen,
  };
})();
