// monster-math/mode-kakuren.js
// ============================================================
// カクレン (mode id: 'kak') — SPEC v2 (scratchpad/monster_math_spec_v2.md §4,
// scratchpad/monster_math_storyboard_r1.md §B) 準拠の新規実装。
//
// スコープ: 本ファイル 1 本のみ編集 (engine.js / index.html は一切触らない、
// worktree isolation 前提)。 使用可: window.MM 公開契約 (registerMode/S/ui/fx/
// narration/progress/undo/mmTimeout) + MM._SPECIAL_STICKER / MM._currentScreenSignal
// (契約ヘルパー)。 使用禁止: その他の MM._ プレフィックス内部関数。
//
// ゲーム設計 (補数分解 N = V + K、 3-4歳向け、 記号 +,-,= 一切不使用):
//   5フェーズ state machine: count-up → hide → ask → answer → reveal
//   - テーブル (食べ物 N個 + 番号チップ) は #mm-shelf (MM.ui.renderShelf) を
//     「非破壊の展示 + 再生ボタン」として流用する (kazoeru の stim カード方式を踏襲)。
//   - 回答フェーズは「テーブル (food kind, 非破壊)」+「回答カード (answer kind)」を
//     同一 renderShelf 呼び出しに混在させる (engine の単一配送経路契約を満たすため、
//     2つ目のタップ可能コンテナが存在しない制約への対応。 kazoeru の stim+answer
//     混在パターンと同型)。
//   - #mm-frame (MM.ui.renderFrame) は「ヒントフレーム」(missCount>=2 でのみ表示、
//     見えている分=filled、隠れた分=空マス+"?"テキスト) 専用に充てる。
//   - 星付き帽子の飛翔は「常に自己完結で自動クリーンアップされる一時トークン」として
//     実装する (document.body に position:fixed で追加 → 着地/中断のどちらでも必ず
//     除去)。 dom.shelf/dom.frame の子要素にしない (renderShelf/renderFrame の
//     _clearChildren と競合して着地前に消える事故を避けるため)。 MM._currentScreenSignal()
//     を渡して画面遷移時は即座に中断・除去する ([[feedback_flag_encounter_settimeout_invariant]]
//     の思想を帽子アニメにも適用)。
//   - fail-out なし: 誤答カードは無効化 (opacity + pointer-events:none) されるのみで
//     消えない。 miss1=帽子まわりの揺れ演出+全体数リマインド、 miss2+=ヒントフレーム。
// ============================================================
(function () {
  'use strict';

  if (!window.MM) {
    try { console.warn('[mode-kakuren] window.MM not found — registration skipped'); } catch (e) {}
    return;
  }

  var MM = window.MM;
  var MODE_ID = 'kak';
  var MONSTER_ID = 'kakuren';
  var ROUNDS_PER_STAGE = 5;
  var FOOD_EMOJI = ['🍩', '🍪', '🍡', '🍥', '🧁', '🍬'];
  var HIDDEN_GLYPH = '🎩'; // 帽子で覆われた食べ物のプレースホルダー (画像アセット未依存)

  // ============================================================
  // ステージ設定 (SPEC v2 §4.1 確定テーブル)
  // ============================================================
  var STAGES = [
    { name: '4-5この かくれんぼ', nMin: 4, nMax: 5, choices: 3, tellVisible: true },
    { name: '6-8この かくれんぼ', nMin: 6, nMax: 8, choices: 3, tellVisible: true },
    { name: '9-10この かくれんぼ', nMin: 9, nMax: 10, choices: 4, tellVisible: false }
  ];

  // ============================================================
  // 汎用ユーティリティ
  // ============================================================
  function _reducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function _randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function _pickOne(arr) { return arr[_randInt(0, arr.length - 1)]; }
  function _shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = _randInt(0, i);
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  // target を必ず含む count 個の相異なる数値 ([min,max] 範囲内) を返す (mode-kazoeru.js
  // の _pickChoiceValues と同型ロジックをこのファイル内で複製)
  function _pickChoiceValues(target, min, max, count) {
    var pool = [];
    for (var v = min; v <= max; v++) if (v !== target) pool.push(v);
    _shuffle(pool);
    var picks = [target];
    for (var i = 0; i < pool.length && picks.length < count; i++) picks.push(pool[i]);
    while (picks.length < count) picks.push(target); // 安全側フォールバック (通常到達しない)
    return _shuffle(picks);
  }
  function _numeralHTML(n) {
    return '<span style="font-size:2.2rem;font-weight:900;color:var(--mm-accent,#F2742A);">' + n + '</span>';
  }
  function _effectiveChoices(cfg, scaffold) {
    var reduce = (scaffold >= 1) ? 1 : 0;
    return Math.max(2, cfg.choices - reduce);
  }

  // ============================================================
  // 星付き帽子トークン (一時要素、 常に自己クリーンアップ)
  // ============================================================
  // fromRect/toRect: DOMRect 相当 ({left,top,width,height})。 signal: AbortSignal|null。
  // duration: ms。 phaseGuard: mmTimeout の phase 照合値 (省略可)。 onLand: 着地時コールバック。
  function _flyHatToken(fromRect, toRect, opts) {
    opts = opts || {};
    var onLand = opts.onLand;
    if (_reducedMotion() || !fromRect || !toRect) {
      if (onLand) onLand();
      return;
    }
    var duration = opts.duration || 750;
    var el = document.createElement('div');
    el.className = 'mm-kak-hat-token';
    el.style.position = 'fixed';
    el.style.width = '64px';
    el.style.height = '64px';
    el.style.left = (fromRect.left + fromRect.width / 2) + 'px';
    el.style.top = (fromRect.top + fromRect.height / 2) + 'px';
    el.style.zIndex = '650';
    el.style.pointerEvents = 'none';
    el.style.transform = 'translate(-50%,-50%) rotate(0deg) scale(1)';
    el.style.transition = 'left ' + duration + 'ms cubic-bezier(0.3,0.7,0.4,1), top ' + duration + 'ms cubic-bezier(0.3,0.7,0.4,1), transform ' + duration + 'ms ease';
    el.innerHTML =
      '<img src="assets/hat_star.webp" alt="" style="width:100%;height:100%;object-fit:contain;display:block;" ' +
      'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\';">' +
      '<span style="display:none;font-size:2.6rem;line-height:64px;text-align:center;">' + HIDDEN_GLYPH + '</span>';
    document.body.appendChild(el);

    var signal = opts.signal;
    var settled = false;
    function _cleanup() { if (el.parentNode) el.parentNode.removeChild(el); }
    function _onAbort() {
      if (settled) return;
      settled = true;
      _cleanup();
    }
    if (signal) {
      if (signal.aborted) { _cleanup(); return; }
      try { signal.addEventListener('abort', _onAbort, { once: true }); } catch (e) {}
    }
    requestAnimationFrame(function () {
      if (settled) return;
      el.style.left = (toRect.left + toRect.width / 2) + 'px';
      el.style.top = (toRect.top + toRect.height / 2) + 'px';
      el.style.transform = 'translate(-50%,-50%) rotate(340deg) scale(0.9)';
    });
    MM.mmTimeout(function () {
      if (settled) return;
      settled = true;
      if (signal) { try { signal.removeEventListener('abort', _onAbort); } catch (e) {} }
      _cleanup();
      if (onLand) onLand();
    }, duration + 30, (opts.phaseGuard != null ? opts.phaseGuard : null));
  }

  function _rectUnion(rects) {
    if (!rects.length) return null;
    var left = Math.min.apply(null, rects.map(function (r) { return r.left; }));
    var top = Math.min.apply(null, rects.map(function (r) { return r.top; }));
    var right = Math.max.apply(null, rects.map(function (r) { return r.left + r.width; }));
    var bottom = Math.max.apply(null, rects.map(function (r) { return r.top + r.height; }));
    return { left: left, top: top, width: right - left, height: bottom - top };
  }

  // ============================================================
  // ラウンド実行状態 (このモード内でのみ管理)
  // ============================================================
  var _rt = null;

  function createRound(stageCfg, scaffold) {
    _rt = {
      stageCfg: stageCfg,
      scaffold: scaffold || 0,
      roundIdx: 0,
      missThisRound: 0
    };
    _clearHintFrame();
    _startRound();
    // 初回プレイのみガイドを重ねる (既読なら即 no-op で resolve するため毎回呼んで安全)
    MM.tutorial.runIfFirstTime(MODE_ID, TUTORIAL_STEPS);
    return null;
  }

  function _clearHintFrame() {
    MM.ui.renderFrame({ rows: 1, cols: 1, prefill: 0 });
  }

  function _startRound() {
    if (!_rt) return;
    var cfg = _rt.stageCfg;
    var N = _randInt(cfg.nMin, cfg.nMax);
    var K = _randInt(1, N - 1); // 1 ≤ K ≤ N-1、 V = N-K は必ず1個以上見えている
    var V = N - K;
    var choicesCount = _effectiveChoices(cfg, _rt.scaffold);

    MM.S.round = _rt.roundIdx + 1;
    MM.S.missCount = 0;
    _rt.missThisRound = 0;
    _rt.N = N;
    _rt.K = K;
    _rt.V = V;
    _rt.foodEmoji = _pickOne(FOOD_EMOJI);
    _rt.hintShown = false;
    _rt.answerValues = _pickChoiceValues(K, 1, N - 1, choicesCount);
    _rt.answerCorrectId = null; // _renderAnswerPhase で確定させる

    MM.ui.bubble('');
    MM.ui.setMonster(MONSTER_ID, 'idle');
    _clearHintFrame();
    MM.S.phase = 'countup';
    _runCountUp();
  }

  // ============================================================
  // アイテム生成ヘルパー (renderShelf の emoji/label へ raw HTML を積む方式は
  // mode-kazoeru.js の _dotsHTML/_numeralHTML と同型)
  // ============================================================
  function _foodItemVisible(idx, chipLabel) {
    return { id: 'food' + idx, emoji: _rt.foodEmoji, label: chipLabel != null ? String(chipLabel) : null, kind: 'food', _foodIdx: idx };
  }
  function _foodItemHidden(idx) {
    return { id: 'food' + idx, emoji: HIDDEN_GLYPH, label: null, kind: 'food', _foodIdx: idx, _hidden: true };
  }
  function _answerItem(idx, value, correctValue) {
    var id = 'ans' + idx;
    return { id: id, emoji: _numeralHTML(value), label: null, kind: 'answer', value: value, _isCorrect: (value === correctValue) };
  }

  function _tableItemsNoChips(hiddenFromIdx) {
    var items = [];
    for (var i = 0; i < _rt.N; i++) {
      items.push(i >= hiddenFromIdx ? _foodItemHidden(i) : _foodItemVisible(i, null));
    }
    return items;
  }
  function _tableItemsFullChips() {
    var items = [];
    for (var i = 0; i < _rt.N; i++) items.push(_foodItemVisible(i, i + 1));
    return items;
  }

  function _renderShelfCards(items) {
    MM.ui.renderShelf(items);
  }
  function _foodCardEl(idx) {
    return document.querySelector('#mm-shelf .mm-food-card[data-food-id="food' + idx + '"]');
  }

  // ============================================================
  // フェーズ1: count-up (食べ物 1個ずつポップ + 番号チップ)
  // ============================================================
  function _runCountUp() {
    var N = _rt.N;
    var revealed = 0;
    _renderShelfCards([]); // まっさらなテーブルからスタート
    function step() {
      if (!_rt || MM.S.phase !== 'countup') return;
      revealed++;
      var items = [];
      for (var i = 0; i < N; i++) {
        items.push(i < revealed ? _foodItemVisible(i, i + 1) : null);
      }
      items = items.filter(Boolean);
      _renderShelfCards(items);
      MM.fx.sfx('pop', MONSTER_ID);
      MM.narration.counting(revealed);
      if (revealed < N) {
        MM.mmTimeout(step, 280, 'countup');
      } else {
        MM.mmTimeout(function () {
          if (!_rt || MM.S.phase !== 'countup') return;
          MM.ui.bubble((_rt.foodEmoji) + ' が ぜんぶで ' + N + 'こ だね！ よーく みておいてね');
          MM.narration.sayIfAuto(MM.NARRATION_KEYS.kak.watch);
          MM.mmTimeout(_runHide, 1600, 'countup');
        }, 260, 'countup');
      }
    }
    MM.mmTimeout(step, 260, 'countup');
  }

  // ============================================================
  // フェーズ2: hide (giggle → 番号チップ全消し → 帽子飛翔 → パサッ)
  // ============================================================
  function _runHide() {
    if (!_rt) return;
    MM.S.phase = 'hide';
    MM.ui.bubble('');
    // giggle: 本体を軽く揺らす (CSS class は末尾の inject style 参照) + sGiggle
    var monsterEl = document.getElementById('mm-monster');
    if (monsterEl) {
      monsterEl.classList.add('mm-kak-giggle');
      MM.mmTimeout(function () { if (monsterEl) monsterEl.classList.remove('mm-kak-giggle'); }, 620, null);
    }
    MM.fx.sfx('giggle', MONSTER_ID);

    MM.mmTimeout(function () {
      if (!_rt || MM.S.phase !== 'hide') return;
      // 番号チップ全消し (答えバレ防止: 隠れる分だけ消すと不自然)。 帽子はまだ着地していない
      // ので、 この時点では全 N 個を「見えたまま・チップだけ無し」で描画する。
      _renderShelfCards(_tableItemsVisibleNoChips());

      var fromRect = monsterEl ? monsterEl.getBoundingClientRect() : null;
      var targetCards = [];
      for (var i = _rt.V; i < _rt.N; i++) {
        var el = _foodCardEl(i);
        if (el) targetCards.push(el.getBoundingClientRect());
      }
      var toRect = _rectUnion(targetCards) || fromRect;

      _flyHatToken(fromRect, toRect, {
        duration: 750,
        signal: MM._currentScreenSignal(),
        phaseGuard: 'hide',
        onLand: function () {
          if (!_rt || MM.S.phase !== 'hide') return;
          MM.fx.sfx('pof', MONSTER_ID);
          MM.ui.setMonster(MONSTER_ID, 'peek');
          _renderShelfCards(_tableItemsNoChips(_rt.V));
          MM.ui.bubble('あっ！ カクレンが ぼうしで かくしちゃった！');
          MM.narration.sayIfAuto(MM.NARRATION_KEYS.kak.hidden);
          MM.mmTimeout(_runAsk, 1400, 'hide');
        }
      });
    }, 550, 'hide');
  }
  function _tableItemsVisibleNoChips() {
    var items = [];
    for (var i = 0; i < _rt.N; i++) items.push(_foodItemVisible(i, null));
    return items;
  }

  // ============================================================
  // フェーズ3: ask (質問プレート + tellVisible 補助 + 回答カード登場)
  // ============================================================
  function _runAsk() {
    if (!_rt) return;
    MM.S.phase = 'ask';
    MM.ui.bubble('ぼうしの したは なんこかな？');
    MM.narration.sayIfAuto(MM.NARRATION_KEYS.kak.ask);

    function afterVisibleHint() {
      MM.mmTimeout(_runAnswerReady, 700, 'ask');
    }

    if (_rt.stageCfg.tellVisible) {
      MM.mmTimeout(function () {
        if (!_rt || MM.S.phase !== 'ask') return;
        MM.ui.bubble('ぼうしの したは なんこかな？ みえてるのは ' + _rt.V + 'こ');
        MM.narration.sayIfAuto(MM.NARRATION_KEYS.kak.visible_hint);
        // 見えている V 個だけチップを再表示 (答えの隠れた分は出さない、小音量トーン)
        var items = [];
        for (var i = 0; i < _rt.N; i++) {
          items.push(i < _rt.V ? _foodItemVisible(i, i + 1) : _foodItemHidden(i));
        }
        _renderShelfCards(items);
        for (var v = 0; v < _rt.V; v++) {
          (function (n) { MM.mmTimeout(function () { MM.fx.sfx('tick', MONSTER_ID, n - 1); }, n * 90, 'ask'); })(v + 1);
        }
        afterVisibleHint();
      }, 800, 'ask');
    } else {
      afterVisibleHint();
    }
  }

  function _runAnswerReady() {
    if (!_rt) return;
    MM.S.phase = 'answer';
    var tableItems = _rt.stageCfg.tellVisible ? (function () {
      var items = [];
      for (var i = 0; i < _rt.N; i++) items.push(i < _rt.V ? _foodItemVisible(i, i + 1) : _foodItemHidden(i));
      return items;
    })() : _tableItemsNoChips(_rt.V);

    var answerItems = [];
    for (var idx = 0; idx < _rt.answerValues.length; idx++) {
      var it = _answerItem(idx, _rt.answerValues[idx], _rt.K);
      if (it._isCorrect) _rt.answerCorrectId = it.id;
      answerItems.push(it);
    }
    _renderShelfCards(tableItems.concat(answerItems));
    MM.fx.sfx('pop', MONSTER_ID);
  }

  // ============================================================
  // タップハンドラ (engine の単一配送経路からのみ呼ばれる)
  // ============================================================
  function onFoodTap(item) {
    if (!_rt) return;
    // 非破壊: テーブルの食べ物を再タップしても「ぜんぶで Nこ」の再生のみ (答えバレなし)
    MM.narration.sayIfAuto(MM.NARRATION_KEYS.kak.watch);
  }

  function onAnswerTap(item, ctx) {
    if (!_rt || MM.S.phase !== 'answer') return;
    if (item && item.value === _rt.K) {
      _resolveCorrect(ctx);
    } else {
      _resolveWrong(item, ctx);
    }
  }

  // ---- 誤答 (fail-out なし。 カードは無効化されるのみで消えない) ----
  function _resolveWrong(item, ctx) {
    MM.S.missCount = (MM.S.missCount || 0) + 1;
    _rt.missThisRound = MM.S.missCount;
    MM.fx.sfx('boing', MONSTER_ID); // 軟化済み、 個体差なし (ブブー系の否定音は使わない)
    if (ctx && ctx.card) {
      ctx.card.classList.add('mm-kak-answer-wrong');
      ctx.card.style.opacity = '0.55';
      ctx.card.style.pointerEvents = 'none';
    }
    // 残り有効な回答カードが1枚だけになったら明滅させる (収束の視覚化)
    var remaining = Array.prototype.slice.call(document.querySelectorAll('#mm-shelf .mm-food-card[data-food-id^="ans"]'))
      .filter(function (el) { return el.style.pointerEvents !== 'none'; });
    if (remaining.length === 1) remaining[0].classList.add('mm-kak-answer-blink');

    if (MM.S.missCount <= 1) {
      _miss1();
    } else {
      _miss2Plus();
    }
  }

  function _miss1() {
    MM.ui.bubble('ぜんぶで ' + _rt.N + 'こ だったよ！');
    MM.narration.sayIfAuto(MM.NARRATION_KEYS.kak.miss_first);
    // 帽子の下 (隠れているカード) を揺らして注意を引く (「ここに答えがあるよ」のサイン)
    for (var i = _rt.V; i < _rt.N; i++) {
      var el = _foodCardEl(i);
      if (el) {
        (function (node) {
          node.classList.add('mm-shake-refuse');
          MM.mmTimeout(function () { node.classList.remove('mm-shake-refuse'); }, 420, null);
        })(el);
      }
    }
  }

  function _miss2Plus() {
    MM.ui.bubble(_rt.V + ' の つぎから かぞえてみよう！');
    MM.narration.sayIfAuto(MM.NARRATION_KEYS.kak.hint_frame);
    if (!_rt.hintShown) {
      _rt.hintShown = true;
      _showHintFrame();
    }
  }

  // ヒントフレーム: 見えている V 個は色つき(filled) マス、 隠れた K 個は "?" マーク
  // (missCount>=2 で表示、 一度出したら同ラウンド中は出しっぱなし — チラつき禁止)
  function _showHintFrame() {
    MM.ui.renderFrame({ rows: 1, cols: _rt.N, prefill: _rt.V });
    var cells = document.querySelectorAll('#mm-frame .mm-frame-cell');
    for (var i = 0; i < cells.length; i++) {
      cells[i].style.display = 'flex';
      cells[i].style.alignItems = 'center';
      cells[i].style.justifyContent = 'center';
      cells[i].style.fontWeight = '900';
      cells[i].style.fontSize = '1.1rem';
      cells[i].style.color = i < _rt.V ? '#fff' : '#5D4E37';
      cells[i].textContent = i < _rt.V ? '●' : '?';
    }
  }

  // ---- 正解 ----
  function _resolveCorrect(ctx) {
    MM.S.phase = 'reveal';
    // 回答カード全体を触れなくする (二重タップ防止)
    var answerCards = document.querySelectorAll('#mm-shelf .mm-food-card[data-food-id^="ans"]');
    answerCards.forEach(function (el) { el.style.pointerEvents = 'none'; });
    if (ctx && ctx.card) ctx.card.classList.add('mm-kak-answer-correct');
    MM.ui.lockInput(600 + _rt.K * 420 + 1600);

    // 帽子帰還: 隠れているカードの位置 → モンスター頭部へ逆再生
    var hiddenRects = [];
    for (var i = _rt.V; i < _rt.N; i++) {
      var el = _foodCardEl(i);
      if (el) hiddenRects.push(el.getBoundingClientRect());
    }
    var fromRect = _rectUnion(hiddenRects);
    var monsterEl = document.getElementById('mm-monster');
    var toRect = monsterEl ? monsterEl.getBoundingClientRect() : fromRect;

    MM.mmTimeout(function () {
      if (!_rt || MM.S.mode !== MODE_ID || MM.S.screen !== 'play') return;
      _flyHatToken(fromRect, toRect, {
        duration: 700,
        signal: MM._currentScreenSignal(),
        phaseGuard: 'reveal',
        onLand: function () {
          if (!_rt || MM.S.mode !== MODE_ID || MM.S.screen !== 'play') return;
          MM.fx.sfx('pof', MONSTER_ID);
          MM.ui.setMonster(MONSTER_ID, 'happy');
          _cascadeReveal();
        }
      });
    }, 300, 'reveal');
  }

  // 隠れていた K 個を 1..K の局所番号で 280ms 間隔でカウントアップ復活させる
  function _cascadeReveal() {
    var K = _rt.K, V = _rt.V, N = _rt.N;
    var revealed = 0;
    function step() {
      if (!_rt || MM.S.mode !== MODE_ID || MM.S.screen !== 'play') return;
      revealed++;
      var items = [];
      for (var i = 0; i < N; i++) {
        if (i < V) { items.push(_foodItemVisible(i, null)); }
        else if (i < V + revealed) { items.push(_foodItemVisible(i, i - V + 1)); }
        else { items.push(_foodItemHidden(i)); }
      }
      _renderShelfCards(items);
      MM.narration.counting(revealed);
      if (revealed < K) {
        MM.mmTimeout(step, 280, 'reveal');
      } else {
        MM.mmTimeout(_finishReveal, 520, 'reveal');
      }
    }
    step();
  }

  function _finishReveal() {
    if (!_rt || MM.S.mode !== MODE_ID || MM.S.screen !== 'play') return;
    MM.fx.sfx('fanfare', MONSTER_ID);
    MM.fx.confetti(24);
    // 最終まとめ: 全 N 個にチップ 1..N を復活 (全体像の再提示)
    _renderShelfCards(_tableItemsFullChips());
    MM.ui.bubble('せいかい！ ' + _rt.N + ' は ' + _rt.V + ' と ' + _rt.K + ' だね！');
    MM.narration.sayIfAuto(MM.NARRATION_KEYS.kak.reveal);
    MM.progress.commitRoundStar();
    MM.mmTimeout(function () {
      if (!_rt) return;
      MM.ui.setMonster(MONSTER_ID, 'idle');
      MM.ui.bubble('');
      _clearHintFrame();
      _rt.roundIdx++;
      _advance();
    }, 2000, 'reveal');
  }

  function _advance() {
    if (!_rt) return;
    if (_rt.roundIdx >= ROUNDS_PER_STAGE) {
      _finishStage();
    } else {
      MM.mmTimeout(_startRound, 260, null);
    }
  }

  function _finishStage() {
    // [Phase R3 Fix] 星判定を ten (mode-tenmegane.js) と統一: 独自計算
    // (Math.min(5, _rt.roundIdx)) をやめ、 engine の commitStageClear が
    // write-through した canonical な値を MM.progress.getStars で読み直す。
    // perfect/stage_clear ナレも ten と同じ共通キーで両モード揃える。
    var stageName = (_rt.stageCfg && _rt.stageCfg.name) || '';
    MM.progress.commitStageClear();
    var stars = MM.progress.getStars(MM.S.mode, MM.S.stage);
    MM.narration.sayIfAuto(stars >= 5 ? MM.NARRATION_KEYS.common.perfect : MM.NARRATION_KEYS.common.stage_clear);
    MM.ui.showResult(stars, [{ type: 'clear', label: stageName + ' クリア！' }]);
    _rt = null;
  }

  // ============================================================
  // tutorialSteps (SPEC v2 §10.2 kak.tut_* 6キー、 gate/spotlight は engine の
  // tutorial step runner が処理する。narrKey は MM.NARRATION_KEYS 経由で typo 防止)
  // ============================================================
  var TUTORIAL_STEPS = [
    {
      id: 'step_intro',
      narrKey: MM.NARRATION_KEYS.kak.tut_intro,
      gate: 'auto',
      target: '#mm-monster',
      spotlight: '#mm-monster',
      minDwellMs: 1400
    },
    {
      id: 'step_watch_explain',
      narrKey: MM.NARRATION_KEYS.kak.tut_watch_explain,
      gate: 'auto',
      target: '#mm-shelf',
      spotlight: '#mm-shelf',
      minDwellMs: 1600
    },
    {
      id: 'step_hide_explain',
      narrKey: MM.NARRATION_KEYS.kak.tut_hide_explain,
      gate: 'auto',
      target: '#mm-monster',
      spotlight: '#mm-monster',
      minDwellMs: 1600
    },
    {
      id: 'step_ask_prompt',
      narrKey: MM.NARRATION_KEYS.kak.tut_ask_prompt,
      gate: 'answer',
      target: '#mm-shelf',
      spotlight: '#mm-shelf',
      minDwellMs: 1200
    },
    {
      id: 'step_answer_success',
      narrKey: MM.NARRATION_KEYS.kak.tut_answer_success,
      gate: 'auto',
      target: '#mm-monster',
      spotlight: '#mm-frame',
      minDwellMs: 1400
    },
    {
      id: 'step_complete',
      narrKey: MM.NARRATION_KEYS.kak.tut_complete,
      gate: 'auto',
      target: '#mm-monster',
      spotlight: null,
      minDwellMs: 1200
    }
  ];

  // ============================================================
  // 演出用 CSS (一度だけ注入。 index.html は編集しないため、 このモード固有の
  // giggle/blink/wrong 演出クラスのみランタイムで追加する。 mm-shake-refuse は
  // index.html 側の既存 keyframe をそのまま再利用する)
  // ============================================================
  function _injectStyleOnce() {
    if (document.getElementById('mm-kak-style')) return;
    var style = document.createElement('style');
    style.id = 'mm-kak-style';
    style.textContent =
      '@keyframes mmKakGiggle { 0%,100%{transform:rotate(0deg);} 20%{transform:rotate(-4deg);} 40%{transform:rotate(4deg);} 60%{transform:rotate(-4deg);} 80%{transform:rotate(4deg);} }' +
      '.mm-kak-giggle { animation: mmKakGiggle 0.6s ease; }' +
      '@keyframes mmKakBlink { 0%,100%{opacity:1;} 50%{opacity:0.45;} }' +
      '.mm-kak-answer-blink { animation: mmKakBlink 0.7s ease-in-out infinite; }' +
      '.mm-kak-answer-correct { box-shadow: 0 0 0 4px rgba(255,216,77,0.9); transform: scale(1.06); }' +
      '.mm-kak-answer-wrong { filter: grayscale(0.4); }' +
      '@media (prefers-reduced-motion: reduce) { .mm-kak-giggle, .mm-kak-answer-blink { animation: none !important; } }';
    document.head.appendChild(style);
  }
  _injectStyleOnce();

  // ============================================================
  // registerMode (self-registration)
  // ============================================================
  MM.registerMode(MODE_ID, {
    label: 'カクレン',
    monsterId: MONSTER_ID,
    difficultyLabel: 'かくれんぼ かぞえ',
    stages: STAGES,
    createRound: createRound,
    onFoodTap: onFoodTap,
    onAnswerTap: onAnswerTap,
    tutorialSteps: TUTORIAL_STEPS
  });
})();
