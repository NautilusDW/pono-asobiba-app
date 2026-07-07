// monster-math/mode-tenmegane.js
// ============================================================
// テンメガネ (mode id: 'ten') — Phase R3 新規実装
// (SPEC v2: scratchpad/monster_math_spec_v2.md §3 / §7.3
//  絵コンテ: scratchpad/monster_math_storyboard_r1.md セクションA)
//
// スコープ: 本ファイル1本のみ編集する worktree isolation 前提
// (engine.js / index.html / play.html は一切触らない)。
// 使用可: window.MM 公開契約 (registerMode/S/ui/fx/narration/progress/undo/mmTimeout/
//         tutorial/NARRATION_KEYS) + MM._currentScreenSignal (契約ヘルパー)。
// 使用禁止: その他の MM._ プレフィックス内部関数。
//
// 「10づくり」(旧 mode-make10.js) の骨格を goal 可変 (5/10/15) に一般化して継承しつつ、
// 以下の SPEC v2 差分を反映する:
//   - こうぶつ/feast 機構は持ち込まない (v2 スコープ外、 SPEC v2 §7.1)
//   - burpReset (吐き出し演出) は完全廃止。 3層の失敗回復のみ (SPEC v2 §3.3):
//       ① goal 超過タップ  … flyBack (口の手前で拒否、 belly 不変)
//       ② たりない (goal未達・解ける手が残っている) … 失敗扱いにせず継続
//       ③ 詰み (残りのどのカードを足しても goal を超える)
//         … 「おかわり配膳」= 未食カードを全 shuffle 再生成 (吐き出し演出なし、 belly不変)
//     ([[monster_math_storyboard_r1]] 「テンメガネ失敗回復の選定理由」表の 案A 採用。
//      案B = undo.popLastGently による1個ずつの静かな回帽り戻しは、 本ラウンドでは使わず
//      自発「もどす」ボタン (voluntary undo, 星判定に不算入) 用に温存する)
//   - 食べ物カードの表現は §13.1 fix 準拠: 「絵1個+数字チップ」ではなく
//     「絵をその個数ぶん実際に描く + 数字チップ [N] を併記」 (同じ絵1個だけを数字で
//     水増しする表現は「同じ絵さがしゲーム」に退化するため禁止、 カクレンの表現と統一)
// ============================================================
(function () {
  'use strict';

  if (!window.MM) {
    try { console.warn('[mode-tenmegane] window.MM not found — registration skipped'); } catch (e) {}
    return;
  }

  var MM = window.MM;
  var S = MM.S; // 単一 state (契約: mode/stage/round/belly/phase/missCount 等を共有)
  var NARR = MM.NARRATION_KEYS.ten;
  var NARR_COMMON = MM.NARRATION_KEYS.common;

  var MONSTER_ID = 'tenmegane';
  var ROUNDS_PER_STAGE = 5;
  var FOOD_VALUE_MAX = 5; // 1枚のカードで表す最大個数 (絵×N を一目で数えられる subitizing 範囲)
  var FOOD_EMOJI = ['🍓', '🍎', '🍌', '🍊', '🍇', '🍑', '🍉', '🍒'];

  // ============================================================
  // ステージ設定 (SPEC v2 §3.1 確定テーブル)
  // ============================================================
  var STAGE_CONFIGS = [
    { name: '5までの ごはん',           goal: 5,  opts: 3, prefill: true,  rows: 1, cols: 5, narrKey: 'intro_lv1' },
    { name: '10までの ごはん',          goal: 10, opts: 4, prefill: false, rows: 2, cols: 5, narrKey: 'intro_lv2' },
    { name: 'もりもり 15までの ごはん', goal: 15, opts: 5, prefill: false, rows: 3, cols: 5, narrKey: 'intro_lv3' }
  ];

  // ============================================================
  // ラウンド内部状態 (S とは別に、 モード固有のラウンドデータをここで管理する)
  // ============================================================
  var R = null;
  var _undoBtnEl = null;
  var _screenObserverWired = false;

  // ============================================================
  // ユーティリティ
  // ============================================================
  function _reducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function _randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function _shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = _randInt(0, i);
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // 部分和判定 (詰み検知)。 goal 系は最大 15、 opts 系は最大 5 程度の小規模なので
  // 素朴な再帰で十分 ([[mode-make10]] _subsetSumPossible と同型)。
  function _subsetSumPossible(values, target) {
    if (target === 0) return true;
    if (target < 0 || !values.length) return false;
    var rest = values.slice(1);
    return _subsetSumPossible(rest, target - values[0]) || _subsetSumPossible(rest, target);
  }

  // gap ちょうどに到達する「解」の内訳 (1..FOOD_VALUE_MAX の断片) を作り、
  // 残り枠 (opts - 解の枚数) をランダムなダミー値で埋めて shuffle する。
  // 常に「解けるカードの組み合わせが必ず存在する」出題を保証する (SPEC v2 §3.1)。
  function _buildSolvableValues(gap, opts) {
    var parts = [];
    var remaining = gap;
    var guard = 0;
    while (remaining > 0 && guard < 40) {
      guard++;
      var upper = Math.min(FOOD_VALUE_MAX, remaining);
      var v = _randInt(1, Math.max(1, upper));
      parts.push(v);
      remaining -= v;
    }
    if (!parts.length) parts.push(Math.max(1, gap)); // gap<=0 の安全弁 (通常到達しない)
    // 解の枚数が opts を超えたら、 末尾に合算して枚数を opts 以内に収める
    while (parts.length > opts) {
      var last = parts.pop();
      parts[parts.length - 1] += last;
    }
    var distractorCount = Math.max(0, opts - parts.length);
    for (var i = 0; i < distractorCount; i++) {
      parts.push(_randInt(1, FOOD_VALUE_MAX));
    }
    return _shuffle(parts);
  }

  function _applyScaffold(stageCfg, scaffold) {
    if (!scaffold || scaffold <= 0) return stageCfg;
    var minOpts = stageCfg.prefill ? 2 : 3;
    return {
      name: stageCfg.name, goal: stageCfg.goal, opts: Math.max(minOpts, stageCfg.opts - 1),
      prefill: stageCfg.prefill, rows: stageCfg.rows, cols: stageCfg.cols, narrKey: stageCfg.narrKey
    };
  }

  function _makeEntry(value) {
    var id = R._nextId++;
    return { id: id, value: value, fed: false, emoji: FOOD_EMOJI[id % FOOD_EMOJI.length] };
  }

  function _findPoolEntry(id) {
    if (!R) return null;
    for (var i = 0; i < R.pool.length; i++) { if (R.pool[i].id === id) return R.pool[i]; }
    return null;
  }
  function _remainingPoolValues() {
    if (!R) return [];
    return R.pool.filter(function (e) { return !e.fed; }).map(function (e) { return e.value; });
  }

  // ============================================================
  // レンダリング (§13.1 fix: 絵1個+数字ではなく、 絵をその個数ぶん実際に描く + [N] チップ併記)
  // ============================================================
  function _repeatedEmojiHTML(n, glyph) {
    var out = '';
    for (var i = 0; i < n; i++) out += '<span class="mm-ten-food-glyph">' + glyph + '</span>';
    return '<span class="mm-ten-food-glyphs">' + out + '</span>';
  }

  function _toShelfItem(entry) {
    return {
      id: entry.id,
      emoji: _repeatedEmojiHTML(entry.value, entry.emoji),
      label: '<span class="mm-ten-chip">' + entry.value + '</span>',
      kind: 'food'
    };
  }

  function _renderShelfFromPool() {
    if (!R) return;
    var items = R.pool.filter(function (e) { return !e.fed; }).map(_toShelfItem);
    MM.ui.renderShelf(items);
    _animateShelfPopIn();
  }

  function _animateShelfPopIn() {
    if (_reducedMotion()) return;
    var shelfEl = document.getElementById('mm-shelf');
    if (!shelfEl) return;
    var cards = shelfEl.querySelectorAll('.mm-food-card');
    for (var i = 0; i < cards.length; i++) {
      (function (card, delay) {
        card.classList.add('mm-ten-pop-in');
        card.style.animationDelay = delay + 's';
        MM.mmTimeout(function () { card.classList.remove('mm-ten-pop-in'); card.style.animationDelay = ''; }, 420 + delay * 1000, null);
      })(cards[i], i * 0.12);
    }
  }

  // belly フレーム (goal 連動: rows*cols === goal に一致させる、 SPEC v2 §3.1)。
  // Lv3 (goal=15) は「2段 (10+5)」の視覚区分けを、 既存 mm-frame-cell--group2 (青枠)
  // クラスを後付けする形で表現する (engine.js の twoColor は total/2 分割のため使えない)。
  function _decorateFrameGroups() {
    var frameEl = document.getElementById('mm-frame');
    if (!frameEl) return;
    var cells = frameEl.querySelectorAll('.mm-frame-cell');
    for (var i = 10; i < cells.length; i++) cells[i].classList.add('mm-frame-cell--group2');
  }

  function _updateFrame() {
    if (!R) return;
    var prevSum = R._lastSum || 0;
    MM.ui.renderFrame({ rows: R.stageCfg.rows, cols: R.stageCfg.cols, prefill: R.sum });
    if (R.stageCfg.goal === 15) _decorateFrameGroups();
    if (!_reducedMotion()) {
      var frameEl = document.getElementById('mm-frame');
      var cells = frameEl ? frameEl.querySelectorAll('.mm-frame-cell') : [];
      for (var i = prevSum; i < R.sum && i < cells.length; i++) {
        (function (cell, delay) {
          cell.classList.add('mm-ten-cell-fill-bounce');
          cell.style.animationDelay = delay + 's';
          MM.mmTimeout(function () { cell.classList.remove('mm-ten-cell-fill-bounce'); cell.style.animationDelay = ''; }, 500 + delay * 1000, null);
        })(cells[i], (i - prevSum) * 0.15);
      }
    }
    R._lastSum = R.sum;
  }

  // ============================================================
  // 表情演出 (idle/mouth_open/happy の3 pose 契約はそのまま、 見た目のニュアンスは
  // CSS 重畳で表現する — [[monster_math_spec_v2]] §13.1 と同じ手法、 mode-make10.js 踏襲)
  // ============================================================
  function _applyExprRefuse() {
    var img = document.getElementById('mm-monster');
    if (!img) return;
    img.classList.add('mm-ten-refuse');
    MM.mmTimeout(function () { img.classList.remove('mm-ten-refuse'); }, 420, null);
  }
  function _applyExprGlow() {
    var frameEl = document.getElementById('mm-frame');
    if (!frameEl) return;
    frameEl.classList.add('mm-ten-frame-glow');
    MM.mmTimeout(function () { frameEl.classList.remove('mm-ten-frame-glow'); }, 700, null);
  }

  // ============================================================
  // 自発 undo ボタン (「もどす」、 案B は Lv2/Lv3 の自発 undo 用に温存 —
  // [[monster_math_storyboard_r1]] 失敗回復選定理由の結論。 星/perfect 判定に不算入)
  // ============================================================
  function _ensureUndoButton() {
    if (_undoBtnEl) return _undoBtnEl;
    var area = document.querySelector('.mm-monster-area');
    if (!area) return null;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mm-ten-undo-btn';
    btn.textContent = '↩ もどす';
    btn.hidden = true;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      _onVoluntaryUndoClick();
    });
    area.appendChild(btn);
    _undoBtnEl = btn;
    return btn;
  }
  function _syncUndoBtnVisibility() {
    if (!_undoBtnEl) return;
    var screenPlayEl = document.getElementById('screen-play');
    var active = !!(screenPlayEl && screenPlayEl.classList.contains('is-active'));
    _undoBtnEl.hidden = !(active && S.mode === 'ten');
  }
  function _wireScreenObserver() {
    if (_screenObserverWired) return;
    var screenPlayEl = document.getElementById('screen-play');
    if (!screenPlayEl) return;
    _screenObserverWired = true;
    try {
      var mo = new MutationObserver(function () { _syncUndoBtnVisibility(); });
      mo.observe(screenPlayEl, { attributes: true, attributeFilter: ['class'] });
    } catch (e) {}
  }
  function _onVoluntaryUndoClick() {
    if (!R || S.mode !== 'ten' || S.phase !== 'input') return;
    // MM.undo.voluntary() は登録済み undo.undo() を内部で呼ぶため、 再描画は
    // push 時に登録した undo コールバック側 (下記 onFoodTap 内) が担当する。
    var item = MM.undo.voluntary();
    if (!item) { MM.ui.bubble('もどせる ものが ないよ。'); }
  }

  // ============================================================
  // 詰み回復: 「おかわり配膳」(SPEC v2 §3.3-③ / [[monster_math_storyboard_r1]] 案A採用)
  // 食べたものは belly から一切減らさず、 未食カードだけを新しい solvable な組へ
  // 総入れ替えする (吐き出し演出は無い、 「お店側がおやつを取り替える」世界観)。
  // ============================================================
  function _reshuffleRemaining() {
    if (!R) return;
    var gap = R.goal - R.sum;
    if (gap <= 0) return;
    var newValues = _buildSolvableValues(gap, R.stageCfg.opts);
    var fedEntries = R.pool.filter(function (e) { return e.fed; });
    var newEntries = newValues.map(_makeEntry);
    R.pool = fedEntries.concat(newEntries);
    MM.ui.bubble('もぐもぐ、 まだ おなかいっぱいじゃ ないみたい。 ちがう おやつを もってきたよ！');
    if (!R._reshuffleSaid) {
      R._reshuffleSaid = true;
      MM.narration.sayIfAuto(NARR.eat_more);
    }
    _renderShelfFromPool();
  }

  // ============================================================
  // ラウンド進行
  // ============================================================
  function _startRound(stageCfg, scaffold) {
    S.missCount = 0;
    var effCfg = _applyScaffold(stageCfg, scaffold);
    var prefillSum = effCfg.prefill ? _randInt(1, Math.max(1, effCfg.goal - 2)) : 0;
    var gap = effCfg.goal - prefillSum;
    var values = _buildSolvableValues(gap, effCfg.opts);

    R = {
      stageCfg: effCfg,
      scaffold: scaffold,
      goal: effCfg.goal,
      pool: [],
      sum: prefillSum,
      _lastSum: prefillSum,
      _nextId: 0,
      _eatMoreSaid: false,
      _reshuffleSaid: false
    };
    R.pool = values.map(_makeEntry);

    MM.ui.setMonster(MONSTER_ID, 'idle');
    _renderShelfFromPool();
    _updateFrame();
    S.phase = 'input';

    if (effCfg.prefill) {
      MM.ui.bubble('テンメガネの おなかを ちょうど ' + effCfg.goal + ' に してあげよう！ もう ' + prefillSum + 'こ はいっているよ');
    } else {
      MM.ui.bubble('テンメガネは ' + effCfg.goal + 'こ たべたいんだって！ ぴったりに してあげよう');
    }
    MM.narration.sayIfAuto(NARR[effCfg.narrKey] || NARR.intro_lv1);
    _syncUndoBtnVisibility();
  }

  function _onRoundClear() {
    S.phase = 'feedback';
    MM.fx.sfx('fanfare', MONSTER_ID);
    MM.ui.setMonster(MONSTER_ID, 'happy');
    _applyExprGlow();
    MM.fx.confetti(24);
    MM.progress.commitRoundStar();
    MM.ui.bubble('ちょうど ' + R.goal + '！ テンメガネ にっこり！');
    MM.narration.sayIfAuto(NARR.clear);
    MM.mmTimeout(function () { _advanceRound(); }, 1300, 'feedback');
  }

  function _advanceRound() {
    S.round = (S.round || 0) + 1;
    if (S.round >= ROUNDS_PER_STAGE) {
      _onStageClear();
    } else {
      _startRound(R.stageCfg, R.scaffold);
    }
  }

  function _onStageClear() {
    S.phase = 'feedback';
    MM.ui.setMonster(MONSTER_ID, 'happy');
    MM.fx.confetti(50);
    MM.progress.commitStageClear(); // engine 側で mm_tenmegane / all_modes 自動 grant
    var stars = MM.progress.getStars(S.mode, S.stage);
    MM.narration.sayIfAuto(stars >= 5 ? NARR_COMMON.perfect : NARR_COMMON.stage_clear);
    var stageName = (R.stageCfg && R.stageCfg.name) || 'テンメガネ';
    MM.mmTimeout(function () {
      S.phase = 'clear';
      MM.ui.showResult(stars, [{ type: 'clear', label: stageName + ' クリア！' }]);
    }, 750, 'feedback');
  }

  // ============================================================
  // API 契約: createRound / onFoodTap / onAnswerTap
  // ============================================================
  function createRound(stageCfg, scaffold) {
    _ensureUndoButton();
    _wireScreenObserver();
    _startRound(stageCfg, scaffold);
    // 初回プレイのみ、 いま描画されたラウンドの上にガイドを重ねる
    // (MM.tutorial.runIfFirstTime は既読なら即 no-op で resolve するので毎回呼んで安全)。
    MM.tutorial.runIfFirstTime('ten', TUTORIAL_STEPS);
    return null;
  }

  function onFoodTap(food, ctx) {
    if (!R || S.mode !== 'ten' || S.phase !== 'input') return;
    var entry = _findPoolEntry(food.id);
    if (!entry || entry.fed) return;

    var gapBefore = R.goal - R.sum;
    if (entry.value > gapBefore) {
      // 層① goal 超過拒否: belly 不変、 口の手前で戻る (SPEC v2 §3.3-①)
      S.phase = 'resolving';
      S.missCount = (S.missCount || 0) + 1;
      MM.fx.flyBack(ctx.card, MONSTER_ID);
      _applyExprRefuse();
      MM.ui.bubble(S.missCount <= 1 ? 'うーん、 いまのは ちょっと おおいかな' : 'あと ' + gapBefore + 'こで ぴったりだよ！');
      MM.narration.sayIfAuto(S.missCount <= 1 ? NARR.over_first : NARR.over_repeat);
      MM.mmTimeout(function () { S.phase = 'input'; }, 460, 'resolving');
      return;
    }

    S.phase = 'resolving';
    MM.ui.lockInput(420);
    MM.ui.setMonster(MONSTER_ID, 'mouth_open');
    var monsterImgEl = document.getElementById('mm-monster');
    MM.fx.flyClone(ctx.card, monsterImgEl, { signal: MM._currentScreenSignal(), duration: 380 }).then(function () {
      // 画面遷移 (戻る確認モーダル等) で screen/mode が変わっていたら何もしない (stale callback guard)
      if (S.mode !== 'ten' || S.screen !== 'play' || !R) return;

      MM.fx.sfx('munch', MONSTER_ID);
      entry.fed = true;
      R.sum += entry.value;

      // 層③ (自発undo用) 復元処理。 星判定には不算入。
      MM.undo.push({
        undo: function () {
          entry.fed = false;
          R.sum -= entry.value;
          _renderShelfFromPool();
          _updateFrame();
        }
      });

      _renderShelfFromPool();
      _updateFrame();

      if (R.sum === R.goal) {
        _onRoundClear();
        return;
      }

      // 層③ 詰み検知: 残りカードのどれを足しても goal に届かない (超えるか、届かない)
      var remaining = _remainingPoolValues();
      var gapNow = R.goal - R.sum;
      if (!remaining.length || !_subsetSumPossible(remaining, gapNow)) {
        S.phase = 'feedback';
        MM.mmTimeout(function () {
          if (S.mode !== 'ten' || S.screen !== 'play' || !R) return;
          _reshuffleRemaining();
          MM.ui.setMonster(MONSTER_ID, 'idle');
          S.phase = 'input';
        }, 500, 'feedback');
        return;
      }

      // 層② たりない (失敗扱いにせず継続)。 ラウンド中 1回だけ優しく後押しする。
      if (!R._eatMoreSaid) {
        R._eatMoreSaid = true;
        MM.ui.bubble('たべたけど、 まだ たりないみたい。 もういっこ えらんでみよう');
        MM.narration.sayIfAuto(NARR.eat_more);
      }
      MM.ui.setMonster(MONSTER_ID, 'idle');
      S.phase = 'input';
    });
  }

  function onAnswerTap() { /* テンメガネは給餌型UIのため未使用 */ }

  // ============================================================
  // チュートリアル (SPEC v2 §5「ガイド付き1ラウンド」/ engine.js NARRATION_KEYS.ten の
  // tut_* 5件と1:1対応させる)
  // ============================================================
  var TUTORIAL_STEPS = [
    { id: 'step_intro',        narrKey: NARR.tut_intro,         target: '#mm-monster', spotlight: '#mm-monster', minDwellMs: 1200 },
    { id: 'step_frame_explain', narrKey: NARR.tut_frame_explain, target: '#mm-frame',   spotlight: '#mm-frame',   minDwellMs: 1400 },
    { id: 'step_feed_prompt',  narrKey: NARR.tut_feed_prompt,    gate: 'tap', target: '#mm-shelf', spotlight: '#mm-shelf', minDwellMs: 1400 },
    { id: 'step_feed_success', narrKey: NARR.tut_feed_success,   target: '#mm-frame',   spotlight: '#mm-frame',   minDwellMs: 1400 },
    { id: 'step_complete',     narrKey: NARR.tut_complete,       target: '#mm-monster', spotlight: null,          minDwellMs: 1500 }
  ];

  // ============================================================
  // 演出用 CSS 注入 (index.html を編集せずに完結させるための自己完結パッチ)
  // ============================================================
  (function injectStyle() {
    if (document.getElementById('mm-tenmegane-style')) return;
    var style = document.createElement('style');
    style.id = 'mm-tenmegane-style';
    style.textContent =
      // §13.1 fix: 絵×N の並び (subitizing しやすい小サイズ + 折り返し)
      '.mm-ten-food-glyphs { display: inline-flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 2px; max-width: 118px; }' +
      '.mm-ten-food-glyph { font-size: 1.3rem; line-height: 1; }' +
      // 数字チップ (丸い橙バッジ)
      '.mm-ten-chip { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 24px; padding: 0 6px; border-radius: 999px; background: #F2742A; color: #fff; font-weight: 900; font-size: 0.85rem; }' +
      // カード登場 spring (KF-T03)
      '.mm-ten-pop-in { animation: mmTenPopIn 0.32s cubic-bezier(0.34,1.56,0.64,1); }' +
      '@keyframes mmTenPopIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }' +
      // belly セルの充填 bounce (KF-T07)
      '.mm-ten-cell-fill-bounce { animation: mmTenCellBounce 0.35s ease; }' +
      '@keyframes mmTenCellBounce { 0% { transform: scale(0.6); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }' +
      // goal 到達の金色発光 (KF-T12)
      '.mm-ten-frame-glow { animation: mmTenGoalGlow 0.7s ease; }' +
      '@keyframes mmTenGoalGlow { 0%,100% { box-shadow: none; } 40% { box-shadow: 0 0 0 8px rgba(255,216,77,0.85), 0 0 24px 6px rgba(255,216,77,0.6); } }' +
      // 食べ過ぎ拒否の首振り (KF-T10、 pose は idle のまま CSS だけで表現)
      '.mm-ten-refuse { animation: mmTenRefuse 0.4s ease; }' +
      '@keyframes mmTenRefuse { 0%,100% { transform: rotate(0deg); } 30% { transform: rotate(-6deg); } 60% { transform: rotate(5deg); } }' +
      // 自発 undo ボタン
      '.mm-ten-undo-btn { position: absolute; right: 8px; bottom: 8px; font-family: inherit; font-weight: 800; font-size: 0.85rem; padding: 12px 18px; border-radius: 999px; border: 2px solid var(--mm-wood, #8B5E34); background: #fff; color: var(--mm-text, #5D4E37); cursor: pointer; box-shadow: 0 3px 8px rgba(0,0,0,0.15); }' +
      '.mm-ten-undo-btn[hidden] { display: none; }' +
      '@media (prefers-reduced-motion: reduce) { .mm-ten-pop-in, .mm-ten-cell-fill-bounce, .mm-ten-frame-glow, .mm-ten-refuse { animation: none !important; } }';
    document.head.appendChild(style);
  })();

  // ============================================================
  // self-registration
  // ============================================================
  MM.registerMode('ten', {
    label: 'テンメガネ',
    monsterId: MONSTER_ID,
    difficultyLabel: 'たべて ぴったり',
    stages: STAGE_CONFIGS,
    createRound: createRound,
    onFoodTap: onFoodTap,
    onAnswerTap: onAnswerTap,
    tutorialSteps: TUTORIAL_STEPS
  });
})();
