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
//   - 選択時: PonoBond.setSelectedPartner(id) → hide() → callback(id)
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
  var _previouslyFocused = null;

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
    var locked = !!p.locked;
    // フクロウは PonoBond.isFukurouUnlocked() が真なら解禁扱い
    if (p.id === 'fukurou' && Bond && typeof Bond.isFukurouUnlocked === 'function') {
      if (Bond.isFukurouUnlocked()) locked = false;
    }

    var level = 0;
    var total = 0;
    if (Bond && !locked) {
      try { level = Bond.getLevel(p.id, stageId) | 0; } catch (_) { level = 0; }
      try { total = Bond.getTotal(p.id) | 0; } catch (_) { total = 0; }
    }

    var currentSel = (Bond && typeof Bond.getSelectedPartner === 'function')
      ? Bond.getSelectedPartner() : null;

    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'pono-pselect__card' +
      (locked ? ' is-locked' : '') +
      (!locked && currentSel === p.id ? ' is-selected' : '');
    card.setAttribute('data-partner-id', p.id);
    card.setAttribute('aria-label',
      p.name + (locked ? ' (ロック中)' : '') + ' — ' + (p.trait || '')
    );
    if (locked) card.setAttribute('aria-disabled', 'true');

    // 難易度ラベル (かんたん / ふつう / むずかしい) — カード最上部
    var difficulty = resolveDifficulty(p);
    var diffBadge = buildDifficultyBadge(difficulty);
    if (diffBadge) {
      card.appendChild(diffBadge);
    }

    // 立ち絵
    var portrait = document.createElement('div');
    portrait.className = 'pono-pselect__portrait';
    var img = document.createElement('img');
    img.src = p.image || '';
    img.alt = p.name || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    // 各キャラの顔位置に合わせて object-position を個別適用
    // (cut01-03 を使い回しても主役が中央に来るように)
    if (p.imagePosition && typeof p.imagePosition === 'string') {
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

    // 性格
    if (p.trait) {
      var trait = document.createElement('div');
      trait.className = 'pono-pselect__trait';
      trait.textContent = p.trait;
      card.appendChild(trait);
    }

    // とくいわざ
    if (p.assistName) {
      var assist = document.createElement('div');
      assist.className = 'pono-pselect__assist';
      assist.textContent = p.assistName;
      card.appendChild(assist);
    }

    // とくいわざの説明 (子供向け 1〜2行のひらがな)
    if (p.assistDesc) {
      var assistDesc = document.createElement('div');
      assistDesc.className = 'pono-pselect__assist-desc';
      assistDesc.textContent = p.assistDesc;
      card.appendChild(assistDesc);
    }

    // 年齢ガイド
    if (p.ageHint) {
      var age = document.createElement('div');
      age.className = 'pono-pselect__age';
      age.textContent = p.ageHint;
      card.appendChild(age);
    }

    if (locked) {
      // 3-4yo 向けに認知負荷軽減: 詳細条件は省略しシンプルに「🔒 まだ」表記
      var reason = document.createElement('div');
      reason.className = 'pono-pselect__lock-reason';
      reason.textContent = '🔒 まだ';
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

  /** 選択確定 */
  function selectPartner(partnerId) {
    if (!_open) return;
    try {
      if (window.PonoBond && typeof window.PonoBond.setSelectedPartner === 'function') {
        window.PonoBond.setSelectedPartner(partnerId);
      }
    } catch (_) { /* noop */ }
    var cb = _callback;
    _callback = null; // hide で重複呼びを防ぐ
    hide();
    try { if (typeof cb === 'function') cb(partnerId); } catch (e) {
      console.error('[PonoPartnerSelect] callback threw:', e);
    }
  }

  /** キャンセル */
  function cancel() {
    if (!_open) return;
    var cb = _callback;
    _callback = null;
    hide();
    try { if (typeof cb === 'function') cb(null); } catch (e) {
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

  /** show */
  function show(stageId, callback) {
    if (_open) {
      // 既に開いている場合は callback を更新して再描画
      _callback = (typeof callback === 'function') ? callback : null;
      _stageId = stageId;
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
      var firstEnabled = _root.querySelector('.pono-pselect__card:not(.is-locked)');
      if (firstEnabled && firstEnabled.focus) firstEnabled.focus({ preventScroll: true });
    } catch (_) { /* noop */ }
  }

  /** 中身だけ作り直し (stageId が変わった時用) */
  function rebuild() {
    if (!_root) return;
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

    // スクロールヒント (3枚以上ある場合のみ表示)
    if (list.length > 3) {
      var hint = document.createElement('div');
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
