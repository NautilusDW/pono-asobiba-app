// monster-math/mode-make10.js
// ============================================================
// 10づくり (パクン) — Impl 2 実装 (SPEC §2.2 / §2.3 / §2.4 準拠)
//
// スコープ: 本ファイル 1 本のみ編集 (engine.js / index.html / play.html は一切触らない、
// worktree isolation 前提)。 契約ヘルパーとして MM._SPECIAL_STICKER /
// MM._currentScreenSignal を使用する。 加えて localStorage `pono_mmath_bonus_v1`
// (こうぶつ feast 累計カウント) の永続化には engine.js が唯一のロード/セーブ元として
// 公開している MM._bonusState / MM._saveBonus() を使う (このキーを自前で
// localStorage 直読み書きすると engine 側インメモリコピーと二重管理になり同期崩壊する
// ため、契約上ここだけは意図的に underscore ヘルパーを使用する。 M5 統合時に engine.js
// 側で正式な非 underscore API に格上げされる想定)。
//
// [既知の deferral — Impl 1 への申し送り事項]
// - 表情 6 種 (idle/mouth_open/happy + big-happy/full/puff) のうち、 engine.js の
//   pose-swap は idle/mouth_open/happy の 3 種の立ち絵 (§13.1) のみをサポートする。
//   big-happy/full/puff は「立ち絵の差し替え」ではなく、 既存 3 pose の上に CSS
//   (transform/filter アニメーション + 浮遊バッジ) を重ねる形で表現している (本ファイル
//   末尾の inject style 参照)。 もし専用の追加立ち絵 (差分ポーズ画像) が将来必要になれば、
//   engine.js の VALID_POSES 拡張が要る — その場合は Impl 1 に diff-only で依頼のこと。
// ============================================================
(function () {
  'use strict';

  if (!window.MM) {
    try { console.warn('[mode-make10] window.MM not found — registration skipped'); } catch (e) {}
    return;
  }

  var MM = window.MM;
  var S = MM.S; // 単一 state (契約: mode/stage/round/belly/phase/missCount 等を共有)

  var MONSTER_ID = 'pakun';
  var TARGET = 10;
  var ROUNDS_PER_STAGE = 5;
  var FEAST_BASE_CHANCE = 0.55; // Stage4 は feastBoost(2) 込みで実質ほぼ毎ラウンド抽選対象
  var DOT_CHAR = '●';

  // 数値 1-9 → 食べ物 emoji (proto の「emoji + 数字ぶんの色ドット」表現を踏襲。
  // 色ドットは DOT_CHAR の repeat で代替 — engine.renderShelf は emoji+label の
  // 2 要素しか描画しないため、 label 側にドット文字列を積む形で再現する)
  var FOOD_CATALOG = {
    1: '🍓', 2: '🍊', 3: '🍇', 4: '🍎', 5: '🍋',
    6: '🍑', 7: '🍌', 8: '🍉', 9: '🍒'
  };

  // ============================================================
  // ステージ設定 (SPEC §2.2 確定テーブル)
  // ============================================================
  var STAGE_CONFIGS = [
    { name: 'あわせて',       opts: 3, prefill: true },
    { name: 'サイコ',         opts: 4, prefill: false },
    { name: 'たくさん',       opts: 6, prefill: false },
    { name: 'ごちそうミックス', mixed: true, feastBoost: 2 }
  ];
  var MIX_FORMATS = [
    { opts: 3, prefill: true },
    { opts: 4, prefill: false },
    { opts: 6, prefill: false }
  ];

  // ============================================================
  // ラウンド内部状態 (S とは別に、 モード固有のラウンドデータをここで管理する。
  // S は契約で共有される汎用フィールド (mode/stage/round/belly/phase/missCount) のみ触る)
  // ============================================================
  var R = null;              // 現在ラウンドの盤面データ
  var _stageEvents = [];     // ステージ内で貯めるリザルト表示イベント (こうぶつ達成等)
  var _undoBtnEl = null;
  var _screenObserverWired = false;

  // ============================================================
  // ユーティリティ
  // ============================================================
  function _reducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function _shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function _randomDistinctExcluding(count, excludeSet, lo, hi) {
    var out = [];
    var used = {};
    for (var k in excludeSet) { if (excludeSet.hasOwnProperty(k)) used[k] = true; }
    var guard = 0;
    while (out.length < count && guard < 200) {
      guard++;
      var v = lo + Math.floor(Math.random() * (hi - lo + 1));
      if (used[v]) continue;
      used[v] = true;
      out.push(v);
    }
    while (out.length < count) { // 極端な衝突時の安全弁 (1-9 の範囲では実質発生しない)
      out.push(lo + Math.floor(Math.random() * (hi - lo + 1)));
    }
    return out;
  }

  // 部分和判定 (詰み検知 / こうぶつ別解保証の両方で使う)。 N<=6 程度の小規模なので
  // 素朴な再帰で十分 (最大 2^6=64 通り)。
  function _subsetSumPossible(values, target) {
    if (target === 0) return true;
    if (target < 0 || !values.length) return false;
    var rest = values.slice(1);
    return _subsetSumPossible(rest, target - values[0]) || _subsetSumPossible(rest, target);
  }

  function _pickAB() {
    var a = 2 + Math.floor(Math.random() * 7); // 2..8 (proto Lv1-3 と同じ生成域)
    return { a: a, b: TARGET - a };
  }

  function _pickAlternatePair(ab) {
    for (var attempt = 0; attempt < 8; attempt++) {
      var a2 = 2 + Math.floor(Math.random() * 7);
      var b2 = TARGET - a2;
      var sameSet = (a2 === ab.a && b2 === ab.b) || (a2 === ab.b && b2 === ab.a);
      if (!sameSet) return { a: a2, b: b2 };
    }
    var altA = ((ab.a - 2 + 3) % 7) + 2; // フォールバック: 範囲内で確実にズラす
    return { a: altA, b: TARGET - altA };
  }

  function _makeEntry(value, idx) {
    return { id: idx, value: value, fed: false };
  }

  // ============================================================
  // ラウンド構成 (フォーマット解決 / カード pool 生成 / こうぶつ抽選)
  // ============================================================
  function _resolveFormat(stageCfg) {
    if (stageCfg.mixed) {
      var f = MIX_FORMATS[Math.floor(Math.random() * MIX_FORMATS.length)];
      return { opts: f.opts, prefill: f.prefill, feastBoost: stageCfg.feastBoost || 1 };
    }
    return { opts: stageCfg.opts, prefill: !!stageCfg.prefill, feastBoost: 1 };
  }

  // adaptive scaffold (0=通常, 1+=易化)。 Impl1 の adaptive 枠との接続点として、
  // 選択肢数を少し減らす軽い easing のみ実装 (最低ラインは下回らない)。
  function _applyScaffold(format, scaffold) {
    if (!scaffold || scaffold <= 0) return format;
    var opts = format.prefill ? Math.max(2, format.opts - 1) : Math.max(4, format.opts - 1);
    return { opts: opts, prefill: format.prefill, feastBoost: format.feastBoost };
  }

  function _buildPool(format, ab) {
    var values;
    if (format.prefill) {
      var used = {}; used[ab.b] = true;
      var decoys = _randomDistinctExcluding(Math.max(0, format.opts - 1), used, 1, 9);
      values = [ab.b].concat(decoys);
    } else {
      var alt = _pickAlternatePair(ab);
      var used2 = {};
      [ab.a, ab.b, alt.a, alt.b].forEach(function (v) { used2[v] = true; });
      var distractorCount = Math.max(0, format.opts - 4);
      var distractors = _randomDistinctExcluding(distractorCount, used2, 1, 9);
      values = [ab.a, ab.b, alt.a, alt.b].concat(distractors);
    }
    _shuffle(values);
    return values.map(function (v, i) { return _makeEntry(v, i); });
  }

  function _todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // 「きょうのこうぶつ」の値を確定 (日替わり、 pono_mmath_bonus_v1 に永続化)
  function _ensureFeastValue() {
    var bonus = MM._bonusState;
    var today = _todayStr();
    if (!bonus || bonus.feastDate !== today || !bonus.feastValue) {
      if (bonus) {
        bonus.feastDate = today;
        bonus.feastValue = 1 + Math.floor(Math.random() * 9);
        try { MM._saveBonus(); } catch (e) {}
      }
    }
    return bonus ? bonus.feastValue : (1 + Math.floor(Math.random() * 9));
  }

  // こうぶつカードを抽選 + 「別解保証」検証。
  // [Blocker 1 修正] 従来は「feastカードを含まない別解が存在するか」しか検証しておらず、
  // 「feastカードを含む有効解が存在するか」を一切検証していなかった。 このため
  // feastカードを使っても target に到達できない (=解けない) 矛盾ラウンドが生成され得た。
  // 修正後は両条件 (①feastカードなしでも解ける／②feastカードを使っても解ける) を
  // 満たした場合のみ feast イベントを有効化する。
  function _applyFeastMarking(pool, format, prefillSum) {
    var favValue = _ensureFeastValue();
    var chance = Math.min(1, FEAST_BASE_CHANCE * (format.feastBoost || 1));
    if (Math.random() > chance) return { eligible: false, cardId: null, value: favValue };
    var candidates = pool.filter(function (e) { return e.value === favValue; });
    if (!candidates.length) return { eligible: false, cardId: null, value: favValue };
    var cand = candidates[0];
    var gap0 = TARGET - prefillSum;
    var withoutValues = pool.filter(function (e) { return e.id !== cand.id; }).map(function (e) { return e.value; });
    // ①: feastカードを使わない別解が存在する (feastカードが「必須」にならないようにする)
    var solvableWithoutFeast = _subsetSumPossible(withoutValues, gap0);
    // ②: feastカードを使った有効解が存在する (feastカードが「解けない飾り」にならないようにする)
    var solvableWithFeast = _subsetSumPossible(withoutValues, gap0 - cand.value);
    if (!solvableWithoutFeast || !solvableWithFeast) return { eligible: false, cardId: null, value: favValue };
    return { eligible: true, cardId: cand.id, value: favValue };
  }

  // ============================================================
  // レンダリング
  // ============================================================
  function _findPoolEntry(id) {
    if (!R) return null;
    for (var i = 0; i < R.pool.length; i++) { if (R.pool[i].id === id) return R.pool[i]; }
    return null;
  }

  function _remainingPoolValues() {
    if (!R) return [];
    return R.pool.filter(function (e) { return !e.fed; }).map(function (e) { return e.value; });
  }

  function _renderShelfFromPool() {
    if (!R) return;
    var items = R.pool.filter(function (e) { return !e.fed; }).map(function (e) {
      var isFeast = R.feastEligible && e.id === R.feastCardId;
      return {
        id: e.id,
        emoji: FOOD_CATALOG[e.value] || '🍽️',
        label: (isFeast ? '⭐' : '') + DOT_CHAR.repeat(e.value),
        kind: 'food'
      };
    });
    MM.ui.renderShelf(items);
    if (R.feastEligible) _decorateFeastCard();
  }

  function _decorateFeastCard() {
    var shelfEl = document.getElementById('mm-shelf');
    if (!shelfEl || !R || !R.feastEligible) return;
    var card = shelfEl.querySelector('[data-food-id="' + R.feastCardId + '"]');
    if (card) card.classList.add('mm-make10-feast-card');
  }

  // 10フレーム再描画 + 「5+5 色分け(twoColor) / 点滅(five-flash)」演出
  function _updateFrame() {
    if (!R) return;
    MM.ui.renderFrame({ rows: 2, cols: 5, prefill: R.sum, twoColor: true });
    var frameEl = document.getElementById('mm-frame');
    var crossedFive = (R._lastSum < 5 && R.sum >= 5);
    if (crossedFive && frameEl) {
      var cells = frameEl.querySelectorAll('.mm-frame-cell');
      for (var i = 0; i < 5 && i < cells.length; i++) {
        (function (cell) {
          cell.classList.add('mm-frame-cell--five-flash');
          MM.mmTimeout(function () { cell.classList.remove('mm-frame-cell--five-flash'); }, 900, null);
        })(cells[i]);
      }
      MM.fx.sfx('fill', MONSTER_ID);
      // [Blocker 2 修正] 'five_milestone' は確定TTS台本 (MM.NARRATION_KEYS) に存在しない
      // ad-hoc key だったため鳴らなかった。 対応する専用ナレは台本に無いので、 誤った
      // 内容を鳴らすくらいなら鳴らさない方を選び、 sfx のみで演出する。
    }
    R._lastSum = R.sum;
  }

  // ============================================================
  // 表情 6 種 (idle/mouth_open/happy は engine pose-swap、 残り 3 種は CSS 重畳)
  // ============================================================
  function _flashExpr(cls, ms) {
    var img = document.getElementById('mm-monster');
    if (!img) return;
    img.classList.add(cls);
    MM.mmTimeout(function () { img.classList.remove(cls); }, ms, null);
  }
  function _spawnFloatingBadge(text) {
    if (_reducedMotion()) return;
    var area = document.querySelector('.mm-monster-area');
    if (!area) return;
    var el = document.createElement('div');
    el.className = 'mm-make10-float-badge';
    el.textContent = text;
    area.appendChild(el);
    MM.mmTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1300, null);
  }
  function _applyExprPuff() { _flashExpr('mm-expr-puff', 500); }
  function _applyExprFull() { _flashExpr('mm-expr-full', 1000); _spawnFloatingBadge('🍽️ まんぷく'); }
  function _applyExprBigHappy() { _flashExpr('mm-expr-bighappy', 1400); _spawnFloatingBadge('✨✨'); }

  // ============================================================
  // 自発 undo ボタン (「もどす」、 SPEC §2.3 層③)
  // #screen-play 配下の DOM (#mm-shelf/#mm-frame/#mm-monster/#mm-bubble) は
  // 3 モード共有のため、 このボタンは自分で追加した独自要素として、
  // MutationObserver で #screen-play の is-active / S.mode を見て表示・非表示を切り替える
  // (index.html を編集せずに他モード表示時の残留を防ぐ自己完結パターン)。
  // ============================================================
  function _ensureUndoButton() {
    if (_undoBtnEl) return _undoBtnEl;
    var area = document.querySelector('.mm-monster-area');
    if (!area) return null;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mm-make10-undo-btn';
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
    _undoBtnEl.hidden = !(active && S.mode === 'make10');
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
    if (!R || S.mode !== 'make10' || S.phase !== 'input') return;
    var item = MM.undo.voluntary();
    if (!item) { MM.ui.bubble('もどせる ものが ないよ。'); }
  }

  // ============================================================
  // こうぶつ達成報酬 (どんぐり +1 / feast 累計カウント / 5回で special sticker)
  // ============================================================
  function _grantFeast() {
    if (typeof window.addAcornsDaily === 'function') {
      try { window.addAcornsDaily('monster_math', 1, 5, { reason: 'monster_math_feast', suppressRewardModal: true }); } catch (e) {}
    }
    var bonus = MM._bonusState;
    if (bonus) {
      bonus.feastCount = (bonus.feastCount || 0) + 1;
      try { MM._saveBonus(); } catch (e) {}
      if (bonus.feastCount > 0 && bonus.feastCount % 5 === 0) {
        if (window.PonoGameStickers && typeof window.PonoGameStickers.grant === 'function') {
          try {
            window.PonoGameStickers.grant({ gameId: 'monster_math', stickerId: MM._SPECIAL_STICKER.feast, event: 'feast' });
          } catch (e) {}
        }
        // [Blocker 2 修正] 台本の make10.feast は「5かい たべさせたね！どんぐりゲット」という
        // 5回達成専用の文言。 旧実装は毎回の feast 達成でこの key ('feast_get'、存在しない
        // ad-hoc key でもあった) を鳴らそうとしており、 5の倍数でない回でも「5かい」と
        // 言ってしまう内容不整合があった。 5の倍数達成時のみ鳴らすよう修正。
        MM.narration.sayIfAuto(MM.NARRATION_KEYS.make10.feast);
      }
    }
  }

  // ============================================================
  // ラウンド進行
  // ============================================================
  function _startRound(stageCfg, scaffold) {
    // [重要Warn 修正] S.missCount はラウンド遷移のたびに明示リセットする。 従来は
    // 初期化されず、 miss 段階化 (初回励まし→2回目以降明確訂正、 over_first/over_repeat 等)
    // の粒度がステージ内の前ラウンドの miss 数を引きずってズレていた
    // (kazoeru/tashizan の _startRound は既にリセットしており、 make10 のみ欠落していた)。
    S.missCount = 0;
    var format = _applyScaffold(_resolveFormat(stageCfg), scaffold);
    var ab = _pickAB();
    var prefillSum = format.prefill ? ab.a : 0;
    var pool = _buildPool(format, ab);
    var feastInfo = _applyFeastMarking(pool, format, prefillSum);

    R = {
      stageCfg: stageCfg,
      scaffold: scaffold,
      format: format,
      pool: pool,
      sum: prefillSum,
      _lastSum: prefillSum,
      feastEligible: feastInfo.eligible,
      feastCardId: feastInfo.cardId,
      feastValue: feastInfo.value,
      feastAchievedThisRound: false
    };

    MM.ui.setMonster(MONSTER_ID, 'idle');
    _renderShelfFromPool();
    _updateFrame();
    S.phase = 'input';

    // [Blocker 2 修正] 'feast_intro'/'round_intro' は台本に存在しない ad-hoc key だった。
    // ラウンド開始時の一般的な後押しとして MM.NARRATION_KEYS.make10.play_hint
    // (「あと いくつで 10に なるか かぞえて みよう」) を feast/通常どちらの導入でも使う。
    if (R.feastEligible) {
      MM.ui.bubble('きょうの とくべつな ごちそう ' + (FOOD_CATALOG[R.feastValue] || '🍽️') + ' を みつけてね！');
      MM.narration.sayIfAuto(MM.NARRATION_KEYS.make10.play_hint);
    } else {
      MM.ui.bubble('10に なるように たべさせてあげてね。');
      MM.narration.sayIfAuto(MM.NARRATION_KEYS.make10.play_hint);
    }
    _syncUndoBtnVisibility();
  }

  function _onRoundClear() {
    S.phase = 'feedback';
    MM.fx.sfx('fanfare', MONSTER_ID);
    MM.ui.setMonster(MONSTER_ID, 'happy');
    _applyExprFull();
    MM.progress.commitRoundStar();
    if (R.feastEligible && R.feastAchievedThisRound) {
      _grantFeast();
      _stageEvents.push({ type: 'feast', label: 'きょうの こうぶつ、 ぺろり！ どんぐり +1' });
    }
    // [Blocker 2 修正] 'round_clear' は台本に存在しない ad-hoc key。
    // 「ぴったり！10になったね」に対応する make10.play_correct が正しい key。
    MM.narration.sayIfAuto(MM.NARRATION_KEYS.make10.play_correct);
    MM.mmTimeout(function () { _advanceRound(); }, 900, 'feedback');
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
    _applyExprBigHappy();
    MM.fx.confetti(50);
    MM.progress.commitStageClear(); // engine 側で mm_pakun / all_modes 自動 grant
    // [Blocker 2 修正] 'stage_clear' は台本に存在しない ad-hoc key。
    // 「10づくりのおさらをクリアしたよ」に対応する make10.play_clear_stage が正しい key。
    MM.narration.sayIfAuto(MM.NARRATION_KEYS.make10.play_clear_stage);
    var stars = MM.progress.getStars(S.mode, S.stage);
    var events = _stageEvents.slice();
    MM.mmTimeout(function () {
      S.phase = 'clear';
      MM.ui.showResult(stars, events);
    }, 750, 'feedback');
  }

  // ============================================================
  // API 契約: createRound / onFoodTap / onAnswerTap
  // ============================================================
  function createRound(stageCfg, scaffold) {
    _stageEvents = [];
    _ensureUndoButton();
    _wireScreenObserver();
    _startRound(stageCfg, scaffold);
    // [Task 5] 初回プレイのみ、 いま描画されたラウンドの上にガイドを重ねる
    // (MM.tutorial.runIfFirstTime は既読なら即 no-op で resolve するので毎回呼んで安全)。
    MM.tutorial.runIfFirstTime('make10', TUTORIAL_STEPS);
    return null;
  }

  function onFoodTap(food, ctx) {
    if (!R || S.mode !== 'make10' || S.phase !== 'input') return;
    var entry = _findPoolEntry(food.id);
    if (!entry || entry.fed) return;

    var gapBefore = TARGET - R.sum;
    if (entry.value > gapBefore) {
      // 層① 10超え拒否: belly 不変、 口の手前で戻る
      S.phase = 'resolving';
      S.missCount = (S.missCount || 0) + 1;
      MM.fx.flyBack(ctx.card, MONSTER_ID);
      _applyExprPuff();
      // [Blocker 2 修正] 'over_first'/'over_repeat' は台本に存在しない ad-hoc key だった。
      // 段階化 (初回やわらかめ→2回目以降は10づくり専用のはっきりした案内) は
      // MM.NARRATION_KEYS.common.over10_first / MM.NARRATION_KEYS.make10.play_over で代替する。
      MM.narration.sayIfAuto(S.missCount <= 1 ? MM.NARRATION_KEYS.common.over10_first : MM.NARRATION_KEYS.make10.play_over);
      MM.mmTimeout(function () { S.phase = 'input'; }, 460, 'resolving');
      return;
    }

    S.phase = 'resolving';
    MM.ui.lockInput(420);
    MM.ui.setMonster(MONSTER_ID, 'mouth_open');
    var monsterImgEl = document.getElementById('mm-monster');
    MM.fx.flyClone(ctx.card, monsterImgEl, { signal: MM._currentScreenSignal(), duration: 380 }).then(function () {
      // 画面遷移 (戻る確認モーダル等) で screen が変わっていたら何もしない (stale callback guard)
      if (S.mode !== 'make10' || S.screen !== 'play' || !R) return;

      MM.fx.sfx('munch', MONSTER_ID);
      entry.fed = true;
      R.sum += entry.value;
      var wasFeast = R.feastEligible && entry.id === R.feastCardId;
      if (wasFeast) R.feastAchievedThisRound = true;

      // 層③ 自発 undo / 層② 詰み undo の両方が使う復元処理
      MM.undo.push({
        undo: function () {
          entry.fed = false;
          R.sum -= entry.value;
          if (wasFeast) R.feastAchievedThisRound = false;
          _renderShelfFromPool();
          _updateFrame();
        }
      });

      _renderShelfFromPool();
      _updateFrame();

      if (R.sum === TARGET) {
        _onRoundClear();
        return;
      }

      // 層② 詰み検知: 残りカードで target に届かないなら優しく吐き戻しを反復
      var remaining = _remainingPoolValues();
      var gapNow = TARGET - R.sum;
      if (!_subsetSumPossible(remaining, gapNow)) {
        S.phase = 'feedback';
        MM.undo.popUntil(function () {
          return _subsetSumPossible(_remainingPoolValues(), TARGET - R.sum);
        }, 350);
        MM.mmTimeout(function () {
          MM.ui.setMonster(MONSTER_ID, 'idle');
          S.phase = 'input';
        }, 900, null);
        return;
      }

      MM.ui.setMonster(MONSTER_ID, 'idle');
      S.phase = 'input';
    });
  }

  function onAnswerTap() { /* 10づくりは食べさせるだけの給餌型 UI のため未使用 */ }

  // ============================================================
  // チュートリアル (SPEC §1 裁定#9「ガイド付き1ラウンド式」)。 データ定義のみ —
  // 実際の step runner は engine.js 側 (Impl 1) の tutorial step engine が消費する想定
  // (現行 T0 engine.js にはまだ runner 実装がないため、 ここでは契約通りデータのみ用意)。
  // ============================================================
  // [Blocker 2 修正] narrKey は確定TTS台本 (MM.NARRATION_KEYS.make10) に実在する6件
  // (tut_intro/tut_frame_explain/tut_feed_prompt/tut_feed_success/tut_undo_explain/
  // tut_complete) と1:1対応させる (旧 tut_01_intro 等は台本に存在しない ad-hoc key だった)。
  // MM.NARRATION_KEYS 経由で参照することで typo を防ぐ。
  var TUTORIAL_STEPS = [
    { id: 'step_intro',       narrKey: MM.NARRATION_KEYS.make10.tut_intro,         target: '#mm-monster', spotlight: '#mm-monster', minDwellMs: 1200 },
    { id: 'step_food_tap',    narrKey: MM.NARRATION_KEYS.make10.tut_feed_prompt,    target: '#mm-shelf',   spotlight: '#mm-shelf',   minDwellMs: 1400 },
    { id: 'step_belly_watch', narrKey: MM.NARRATION_KEYS.make10.tut_frame_explain,  target: '#mm-frame',   spotlight: '#mm-frame',   minDwellMs: 1400 },
    { id: 'step_first_choice',narrKey: MM.NARRATION_KEYS.make10.tut_undo_explain,   target: '#mm-shelf',   spotlight: '#mm-shelf',   minDwellMs: 1200 },
    { id: 'step_target_ten',  narrKey: MM.NARRATION_KEYS.make10.tut_feed_success,   target: '#mm-frame',   spotlight: '#mm-frame',   minDwellMs: 1200 },
    { id: 'step_success',     narrKey: MM.NARRATION_KEYS.make10.tut_complete,       target: '#mm-monster', spotlight: '#mm-monster', minDwellMs: 1500 }
  ];

  // ============================================================
  // 演出用 CSS 注入 (index.html を編集せずに完結させるための自己完結パッチ)
  // ============================================================
  (function injectStyle() {
    if (document.getElementById('mm-make10-style')) return;
    var style = document.createElement('style');
    style.id = 'mm-make10-style';
    style.textContent =
      '.mm-frame-cell--five-flash { animation: mmMake10FiveFlash 0.9s ease; }' +
      '@keyframes mmMake10FiveFlash { 0%,100% { box-shadow: none; } 30% { box-shadow: 0 0 0 5px rgba(255,216,77,0.9); } }' +
      '.mm-make10-feast-card { border-color: #FFB020 !important; box-shadow: 0 0 0 3px rgba(255,176,32,0.35); }' +
      '.mm-make10-undo-btn { position: absolute; right: 8px; bottom: 8px; font-family: inherit; font-weight: 800; font-size: 0.85rem; padding: 12px 18px; border-radius: 999px; border: 2px solid var(--mm-wood, #8B5E34); background: #fff; color: var(--mm-text, #5D4E37); cursor: pointer; box-shadow: 0 3px 8px rgba(0,0,0,0.15); }' +
      '.mm-make10-undo-btn[hidden] { display: none; }' +
      '.mm-expr-puff { animation: mmMake10Puff 0.5s ease; }' +
      '@keyframes mmMake10Puff { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08) rotate(-2deg); } }' +
      '.mm-expr-full { filter: drop-shadow(0 0 10px rgba(255,216,77,0.9)); }' +
      '.mm-expr-bighappy { animation: mmMake10BigHappy 1.2s ease; }' +
      '@keyframes mmMake10BigHappy { 0%,100% { transform: scale(1) translateY(0); } 30% { transform: scale(1.18) translateY(-10px); } 60% { transform: scale(1.05) translateY(0); } }' +
      '.mm-make10-float-badge { position: absolute; top: 4%; left: 50%; transform: translateX(-50%); font-weight: 900; font-size: 1.1rem; color: #B5651D; text-shadow: 1px 1px 0 #fff; animation: mmMake10FloatUp 1.3s ease forwards; pointer-events: none; }' +
      '@keyframes mmMake10FloatUp { 0% { opacity:0; transform: translate(-50%, 10px); } 20% { opacity:1; } 100% { opacity:0; transform: translate(-50%, -22px); } }' +
      '@media (prefers-reduced-motion: reduce) { .mm-frame-cell--five-flash, .mm-expr-puff, .mm-expr-full, .mm-expr-bighappy, .mm-make10-float-badge { animation: none !important; } }';
    document.head.appendChild(style);
  })();

  // ============================================================
  // self-registration
  // ============================================================
  MM.registerMode('make10', {
    label: '10づくり',
    monsterId: MONSTER_ID,
    difficultyLabel: 'ふつう',
    stages: STAGE_CONFIGS,
    createRound: createRound,
    onFoodTap: onFoodTap,
    onAnswerTap: onAnswerTap,
    tutorialSteps: TUTORIAL_STEPS
  });
})();
