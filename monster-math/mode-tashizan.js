// monster-math/mode-tashizan.js
// たしざん (ガブル) — Impl 4 本実装。
// SPEC: scratchpad/monster_math_spec.md §2.2 / §2.3 / §2.4 (§13 ユーザー決定ログ含む)
// このファイル 1 本のみを編集 (index.html / engine.js は触らない、SPEC §3.1 / §4.2 worktree isolation)。
//
// メカニクス概要 (SPEC §2.2 たしざん / §1 #7):
//   2 皿給餌 (plate1=a, plate2=b) → belly (10 フレーム×2段) に 2 色で実体化
//   → 数字カード回答 (3-4択)。 Stage4+ はキャリー (繰り上がり) を扱い、
//   make-10 bridge 演出で「a と (10-a) で10、 のこりは○」を可視化する。
//   soft gate: 10づくり (make10) 累計★ < 12 の時、 ハードロックなしの推奨表示。
//
// engine.js 契約 (MM.*) のみに依存。 _ で始まる内部専用ヘルパーは
// MM._SPECIAL_STICKER と MM._currentScreenSignal のみ使用可 (契約ヘルパー、SPEC §2.4 コメント準拠)。
(function () {
  'use strict';

  if (!window.MM) {
    try { console.warn('[mode-tashizan] window.MM not found — registration skipped'); } catch (e) {}
    return;
  }
  var MM = window.MM; // 明示的にエイリアス (bare `MM` の暗黙グローバル依存を避ける)

  var MODE_ID = 'tashizan';
  var MONSTER_ID = 'gaburu';
  var MAKE10_MODE_ID = 'make10';
  var MAKE10_STAGE_COUNT = 4;   // SPEC §2.2 10づくり Stage1-4
  var KAZOERU_STAGE_COUNT = 5;  // SPEC §2.2 かぞえる Stage1-5
  var TASHIZAN_STAGE_COUNT = 5;
  var ROUNDS_PER_STAGE = 5;     // 1ステージ = 5ラウンド (SPEC §2.1)
  var GATE_STAR_THRESHOLD = 12; // SPEC §1 #8 soft gate 閾値 (10づくり累計★)

  var PLATE1_EMOJI = '🍓';
  var PLATE2_EMOJI = '🫐';

  // ============================================================
  // 追加スタイル (frame の 2色分けを色+枠線の二重符号にする。
  // index.html/engine.js の CSS は編集できないため、 このファイルから
  // <style> を注入する。 [[feedback_image_aspect_ratio]] とは無関係
  // — 画像を扱わないため縦横比の懸念なし)
  // ============================================================
  function _injectStyles() {
    if (document.getElementById('mm-tashizan-style')) return;
    var style = document.createElement('style');
    style.id = 'mm-tashizan-style';
    style.textContent =
      '.mm-frame-cell.is-filled.mm-frame-cell--group2{background:#60A5FA;}' +
      '.mm-frame-cell.mm-bridge-cell{box-shadow:0 0 0 4px rgba(255,216,77,0.9);}' +
      '.mm-food-card.mm-gate-card{background:#FFF3CB;}';
    document.head.appendChild(style);
  }

  // ============================================================
  // ステージ設定 (SPEC §2.2 たしざんテーブル)
  // gen(roundIdx) -> {a,b[,finale]} を返す。 roundIdx は 0-4 (5ラウンド/ステージ)。
  // ============================================================
  var STAGES = [
    { // Stage1: たして 5 (a+b<=5, 3択, 1段5マス)
      name: 'たして 5',
      choiceCount: 3,
      rows: 1, cols: 5,
      carry: false,
      gen: function () {
        var a = 1 + Math.floor(Math.random() * 4); // 1-4
        var maxB = Math.max(1, 5 - a);
        var b = 1 + Math.floor(Math.random() * maxB);
        return { a: a, b: b };
      }
    },
    { // Stage2: たして 10 (a+b<=10, 3択, 10フレーム)
      name: 'たして 10',
      choiceCount: 3,
      rows: 1, cols: 10,
      carry: false,
      gen: function () {
        var a = 1 + Math.floor(Math.random() * 8); // 1-8
        var maxB = Math.max(1, 10 - a);
        var b = 1 + Math.floor(Math.random() * maxB);
        return { a: a, b: b };
      }
    },
    { // Stage3: 10 と いくつ (10+n, 4択, 2段・上段prefill)
      name: '10 と いくつ',
      choiceCount: 4,
      rows: 2, cols: 10,
      prefillTop: true,
      carry: false,
      gen: function () {
        var b = 1 + Math.floor(Math.random() * 9); // 1-9
        return { a: 10, b: b };
      }
    },
    { // Stage4: くりあがり はじめて (9+n, 8+n、4択、bridge自動再生)
      name: 'くりあがり はじめて',
      choiceCount: 4,
      rows: 2, cols: 10,
      carry: true,
      bridgeAuto: true,
      gen: function () {
        var a = (Math.random() < 0.5) ? 8 : 9;
        var minB = (a === 9) ? 2 : 3; // 必ず繰り上がり (sum>10) が起きる範囲
        var b = minB + Math.floor(Math.random() * (9 - minB + 1));
        return { a: a, b: b };
      }
    },
    { // Stage5: くりあがり ミックス (和11-18 + 最終10+10、4択、bridgeはヒント時のみ)
      name: 'くりあがり ミックス',
      choiceCount: 4,
      rows: 2, cols: 10,
      carry: true,
      bridgeOnHintOnly: true,
      gen: function (roundIdx) {
        if (roundIdx === 4) return { a: 10, b: 10, finale: true }; // 5ラウンド目 = 最終祝祭
        var a, b, sum, tries = 0;
        do {
          a = 1 + Math.floor(Math.random() * 9);
          b = 1 + Math.floor(Math.random() * 9);
          sum = a + b;
          tries++;
        } while ((sum < 11 || sum > 18) && tries < 40);
        if (sum < 11 || sum > 18) { a = 9; b = 9; } // fallback (安全側、 sum=18)
        return { a: a, b: b };
      }
    }
  ];

  // ============================================================
  // 数字カード選択肢生成 (正解 + 近傍distractor、 重複なし、 シャッフル)
  // ============================================================
  function _shuffle(arr) {
    arr = arr.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function _genChoices(sum, count, scaffold) {
    if (scaffold >= 1) count = Math.max(2, count - 1); // adaptive: scaffold時は択を1つ減らして易化
    var set = [sum];
    var pool = [];
    for (var d = 1; d <= 5; d++) {
      if (sum - d >= 1) pool.push(sum - d);
      if (sum + d <= 20) pool.push(sum + d);
    }
    pool = _shuffle(pool);
    for (var i = 0; i < pool.length && set.length < count; i++) {
      if (set.indexOf(pool[i]) === -1) set.push(pool[i]);
    }
    var extra = 1;
    while (set.length < count && extra < 30) {
      var up = sum + extra, down = sum - extra;
      if (up <= 20 && set.indexOf(up) === -1) { set.push(up); }
      else if (down >= 1 && set.indexOf(down) === -1) { set.push(down); }
      extra++;
    }
    return _shuffle(set);
  }

  // ============================================================
  // DOM ヘルパー (index.html の固定ID群を直接参照。 engine.js の dom キャッシュは
  // private closure のため、 mode 側は自前で document.getElementById する)
  // ============================================================
  function _frameEl() { return document.getElementById('mm-frame'); }
  function _monsterEl() { return document.getElementById('mm-monster'); }

  function _setupFrame(stageCfg) {
    var prefill = stageCfg.prefillTop ? stageCfg.cols : 0;
    MM.ui.renderFrame({ rows: stageCfg.rows, cols: stageCfg.cols, prefill: prefill, twoColor: false });
  }
  // 指定範囲のセルに塗り (group2 なら二重符号: 色+枠線を追加)
  function _fillCells(fromIdx, count, groupClass) {
    var frame = _frameEl();
    if (!frame) return;
    var cells = frame.querySelectorAll('.mm-frame-cell');
    for (var i = 0; i < count; i++) {
      var cell = cells[fromIdx + i];
      if (!cell) break;
      cell.classList.add('is-filled');
      if (groupClass) cell.classList.add(groupClass);
    }
  }

  // ============================================================
  // make-10 bridge 演出 (SPEC §2.2 「8+5 → 10 と 3」)
  // a と (10-a) で 10 になる部分をハイライト → のこりをハイライト。
  // 呼び出し時点の phase を guard に使う (mmTimeout の stale-timer 無視条件)。
  // ============================================================
  function _playBridge(a, b) {
    var need = 10 - a;
    var remainder = b - need;
    if (need <= 0 || remainder <= 0) return Promise.resolve(); // 分解不要 (例: 最終10+10)
    var frame = _frameEl();
    var cells = frame ? frame.querySelectorAll('.mm-frame-cell') : [];
    var guardPhase = MM.S.phase;
    return new Promise(function (resolve) {
      for (var i = a; i < a + need; i++) { if (cells[i]) cells[i].classList.add('mm-bridge-cell'); }
      MM.ui.bubble(a + ' と ' + need + ' で 10！');
      // [Blocker 2 修正] 'bridge_step1'/'bridge_step2' は台本に存在しない ad-hoc key。
      // 台本には bridge 演出用の音声は play_bridge 1本のみ (2段階分の専用文言はない)。
      // 同じ音声を2回連続で鳴らすと不自然なので、 最初の (a と need で10) 局面でのみ再生し、
      // 2局面目 (のこりは remainder) は bubble のテキストのみで表現する。
      MM.narration.sayIfAuto(MM.NARRATION_KEYS.tashizan.play_bridge);
      MM.mmTimeout(function () {
        for (var i2 = a; i2 < a + need; i2++) { if (cells[i2]) cells[i2].classList.remove('mm-bridge-cell'); }
        for (var j = a + need; j < a + need + remainder; j++) { if (cells[j]) cells[j].classList.add('mm-bridge-cell'); }
        MM.ui.bubble('のこりは ' + remainder + '！');
        MM.mmTimeout(function () {
          for (var j2 = a + need; j2 < a + need + remainder; j2++) { if (cells[j2]) cells[j2].classList.remove('mm-bridge-cell'); }
          resolve();
        }, 900, guardPhase);
      }, 900, guardPhase);
    });
  }

  // ============================================================
  // soft gate (SPEC §1 #8): 10づくり累計★ < 12 で推奨表示 (ハードロックなし)
  // ============================================================
  function _make10StarSum() {
    var total = 0;
    for (var i = 1; i <= MAKE10_STAGE_COUNT; i++) {
      total += (MM.progress.getStars(MAKE10_MODE_ID, i) || 0);
    }
    return total;
  }
  var _gateAcked = false; // このページ滞在中に1度確認したら以後は出さない (非ハードロック)

  function _showGate() {
    MM.ui.setMonster(MONSTER_ID, 'idle');
    var frame = _frameEl(); if (frame) frame.innerHTML = '';
    MM.ui.bubble('10づくりで もっと れんしゅうしてから でも いいかも？');
    MM.narration.sayIfAuto(MM.NARRATION_KEYS.tashizan.gate_suggest);
    MM.ui.renderShelf([
      { id: 'gate_try', kind: 'gate', emoji: '💪', label: 'やってみる！' }
    ]);
  }

  // ============================================================
  // ステージ/ラウンド内部状態
  // ============================================================
  var _stageCfg = null;
  var _scaffold = 0;
  var _roundIdx = 0;   // 0-4 (5ラウンド/ステージ)
  var _round = null;   // 現在ラウンドの a/b/sum/choices/subPhase 等

  function createRound(stageCfg, scaffold) {
    _injectStyles();
    _stageCfg = stageCfg;
    _scaffold = scaffold || 0;
    _roundIdx = 0;
    MM.S.round = 0;

    if (!_gateAcked && stageCfg === STAGES[0] && _make10StarSum() < GATE_STAR_THRESHOLD) {
      _showGate();
      // gate 表示中は plate1/plate2 がまだ描画されていないためチュートリアルは起動しない。
      // gate_try が押されたタイミング (onFoodTap 側) で改めて起動する。
      return;
    }
    _startRound();
    // [Task 5] 初回プレイのみ、 いま描画されたラウンドの上にガイドを重ねる
    // (MM.tutorial.runIfFirstTime は既読なら即 no-op で resolve するので毎回呼んで安全)。
    MM.tutorial.runIfFirstTime(MODE_ID, tutorialSteps);
  }

  function _startRound() {
    var stageCfg = _stageCfg;
    MM.S.round = _roundIdx;
    MM.S.missCount = 0;
    MM.S.phase = 'input';

    var raw = stageCfg.gen(_roundIdx);
    var a = raw.a, b = raw.b, sum = a + b;
    var choices = _genChoices(sum, stageCfg.choiceCount, _scaffold);

    _round = {
      stageCfg: stageCfg,
      a: a, b: b, sum: sum,
      choices: choices,
      subPhase: 'feed1', // feed1 -> feed2 -> answer
      locked: false,
      finale: !!raw.finale
    };

    MM.ui.setMonster(MONSTER_ID, 'idle');
    MM.ui.bubble('');
    _setupFrame(stageCfg);
    MM.ui.renderShelf([
      { id: 'plate1', kind: 'food', emoji: PLATE1_EMOJI, label: a + 'こ' },
      { id: 'plate2', kind: 'food', emoji: PLATE2_EMOJI, label: b + 'こ' }
    ]);
  }

  // ============================================================
  // 給餌 (皿タップ)
  // ============================================================
  function onFoodTap(food, ctx) {
    if (food && food.id === 'gate_try') {
      _gateAcked = true;
      MM.narration.say(MM.NARRATION_KEYS.tashizan.gate_confirm);
      _roundIdx = 0;
      _startRound(); // _stageCfg は createRound 時点で既に設定済み (STAGES[0])
      // gate 経由で始めて起動した場合、 createRound() 側の tutorial 起動は素通り
      // しているのでここでも呼ぶ (isSeen なら即 no-op、 二重発火の心配なし)。
      MM.tutorial.runIfFirstTime(MODE_ID, tutorialSteps);
      return;
    }
    if (!_round || _round.locked) return;
    if (_round.subPhase !== 'feed1' && _round.subPhase !== 'feed2') return;
    var expectedId = (_round.subPhase === 'feed1') ? 'plate1' : 'plate2';
    if (!food || food.id !== expectedId) {
      MM.ui.bubble(expectedId === 'plate1' ? 'さいしょの おさらから たべさせてね' : 'つぎは こっちの おさらだよ');
      return;
    }
    _feedPlate(food, ctx && ctx.card);
  }

  function _feedPlate(food, cardEl) {
    _round.locked = true;
    MM.S.phase = 'resolving';
    var monsterEl = _monsterEl();
    var isFirst = (food.id === 'plate1');
    var count = isFirst ? _round.a : _round.b;
    var startIdx = isFirst ? 0 : _round.a;
    var groupClass = isFirst ? null : 'mm-frame-cell--group2';
    var signal = MM._currentScreenSignal ? MM._currentScreenSignal() : null;

    MM.ui.lockInput(700);
    MM.fx.flyClone(cardEl, monsterEl, { signal: signal }).then(function () {
      // [重要Warn 修正] 画面遷移 (戻る確認モーダル等) で screen/mode が変わっていたら
      // 何もしない (make10 と同じ stale-screen callback guard)。
      if (MM.S.mode !== MODE_ID || MM.S.screen !== 'play' || !_round) return;
      MM.ui.setMonster(MONSTER_ID, 'mouth_open');
      MM.fx.sfx('munch', MONSTER_ID);
      _fillCells(startIdx, count, groupClass);
      MM.narration.counting(isFirst ? _round.a : _round.sum);
      MM.mmTimeout(function () {
        MM.ui.setMonster(MONSTER_ID, 'idle');
        if (isFirst) {
          _round.subPhase = 'feed2';
          _round.locked = false;
          MM.S.phase = 'input';
          MM.ui.renderShelf([{ id: 'plate2', kind: 'food', emoji: PLATE2_EMOJI, label: _round.b + 'こ' }]);
        } else {
          _round.subPhase = 'answer';
          _afterBothFed();
        }
      }, 260, 'resolving');
    });
  }

  function _afterBothFed() {
    var stageCfg = _round.stageCfg;
    if (stageCfg.bridgeAuto) {
      MM.S.phase = 'resolving';
      _playBridge(_round.a, _round.b).then(function () {
        MM.ui.bubble('');
        _showAnswerCards();
      });
    } else {
      _showAnswerCards();
    }
  }

  function _showAnswerCards() {
    MM.S.phase = 'input';
    _round.locked = false;
    MM.ui.bubble('あわせて なんこ かな？');
    // [Blocker 2 修正] 'ask_sum' は台本に存在しない ad-hoc key。
    // 「ひだりと みぎを あわせて かぞえてみよう」の play_hint が内容的に一致する。
    MM.narration.sayIfAuto(MM.NARRATION_KEYS.tashizan.play_hint);
    var items = _round.choices.map(function (v) {
      return { id: 'card_' + v, kind: 'answer', value: v, emoji: '🔢', label: String(v) };
    });
    MM.ui.renderShelf(items);
  }

  // ============================================================
  // 回答 (数字カードタップ)
  // ============================================================
  function onAnswerTap(card, ctx) {
    if (!_round || _round.locked || _round.subPhase !== 'answer') return;
    if (!card || typeof card.value !== 'number') return;
    _round.locked = true;
    MM.S.phase = 'resolving';
    if (card.value === _round.sum) {
      _onCorrect(ctx && ctx.card);
    } else {
      _onWrong(ctx && ctx.card);
    }
  }

  function _onCorrect(cardEl) {
    var monsterEl = _monsterEl();
    var signal = MM._currentScreenSignal ? MM._currentScreenSignal() : null;
    MM.ui.lockInput(1200);
    MM.fx.flyClone(cardEl, monsterEl, { signal: signal }).then(function () {
      // [重要Warn 修正] 画面遷移で screen/mode が変わっていたら何もしない (stale-screen guard)。
      if (MM.S.mode !== MODE_ID || MM.S.screen !== 'play' || !_round) return;
      MM.ui.setMonster(MONSTER_ID, 'happy');
      MM.fx.sfx('fanfare', MONSTER_ID);
      MM.fx.confetti(_round.finale ? 70 : 30);
      MM.ui.bubble(_round.finale ? '10と10で 20！ おおごちそう！' : (_round.sum + '！ せいかい！'));
      // [Blocker 2 修正] 'finale_clear'/'correct' は台本に存在しない ad-hoc key。
      // 正: 最終祝祭は play_festival、通常正解は play_correct。
      MM.narration.sayIfAuto(_round.finale ? MM.NARRATION_KEYS.tashizan.play_festival : MM.NARRATION_KEYS.tashizan.play_correct);
      MM.progress.commitRoundStar();
      MM.mmTimeout(function () {
        _roundIdx++;
        if (_roundIdx >= ROUNDS_PER_STAGE) {
          _finishStage();
        } else {
          _startRound();
        }
      }, 1100, 'resolving');
    });
  }

  function _onWrong(cardEl) {
    MM.S.missCount = (MM.S.missCount || 0) + 1;
    MM.fx.flyBack(cardEl, MONSTER_ID);
    MM.ui.setMonster(MONSTER_ID, 'idle');
    var firstMiss = MM.S.missCount <= 1;
    // miss ナレは決定的2段分岐 (初回励まし/2回目以降明確訂正、random禁止、
    // [[feedback_miss_voice_progression]])
    MM.ui.bubble(firstMiss ? 'おしい！ もういちど かぞえてみよう' : (_round.sum + ' に なるかな？ もういちど！'));
    // [Blocker 2 修正] 'miss_gentle'/'miss_clear' は台本に存在しない ad-hoc key。
    // 段階化 ([[feedback_miss_voice_progression]]) は台本共通の miss_first (初回やわらかめ) /
    // miss_repeat (2回目以降はっきり) で表現する。
    MM.narration.sayIfAuto(firstMiss ? MM.NARRATION_KEYS.common.miss_first : MM.NARRATION_KEYS.common.miss_repeat);

    var stageCfg = _round.stageCfg;
    var showHint = !!stageCfg.bridgeOnHintOnly && stageCfg.carry && firstMiss;
    if (showHint) {
      MM.ui.lockInput(2300);
      MM.mmTimeout(function () {
        MM.S.phase = 'resolving';
        _playBridge(_round.a, _round.b).then(function () {
          MM.ui.bubble('あわせて なんこ かな？');
          MM.S.phase = 'input';
          _round.locked = false;
        });
      }, 500, null);
    } else {
      MM.ui.lockInput(650);
      MM.mmTimeout(function () {
        MM.S.phase = 'input';
        _round.locked = false;
      }, 650, null);
    }
  }

  // ============================================================
  // ステージクリア (5ラウンド完了)
  // ============================================================
  function _checkPerfectAll() {
    var ALL = {};
    ALL[MODE_ID] = TASHIZAN_STAGE_COUNT;
    ALL.make10 = MAKE10_STAGE_COUNT;
    ALL.kazoeru = KAZOERU_STAGE_COUNT;
    for (var m in ALL) {
      for (var i = 1; i <= ALL[m]; i++) {
        if ((MM.progress.getStars(m, i) || 0) < 5) return false;
      }
    }
    return true;
  }

  function _finishStage() {
    MM.S.phase = 'clear';
    // clear_tashizan (全5ステージクリアで mm_gaburu grant) は engine.commitStageClear() が
    // 自動判定・自動 grant する (engine.js commitStageClear 参照、 事前定義済のため
    // モード側から重複 grant する必要なし)。
    MM.progress.commitStageClear();
    var stageNum = STAGES.indexOf(_round.stageCfg) + 1;
    var stars = MM.progress.getStars(MODE_ID, stageNum);
    var events = [];

    if (window.PonoGameStickers && typeof window.PonoGameStickers.grant === 'function' &&
        MM._SPECIAL_STICKER && _checkPerfectAll()) {
      try {
        window.PonoGameStickers.grant({ gameId: 'monster_math', stickerId: MM._SPECIAL_STICKER.perfect_all, event: 'perfect_all' });
        events.push({ type: 'sticker', label: 'こんぺいとうの びん を もらった！' });
      } catch (e) {}
    }

    MM.ui.showResult(stars, events);
  }

  // ============================================================
  // チュートリアル (SPEC タスク指定: 6ステップ)
  // gate/target は CSS selector or 'auto' (自動進行)。 実行エンジン (spotlight/minDwell/
  // 指マーカー) は Impl1 の tutorial step engine 側の実装に委ねる (本ファイルは
  // データ定義のみ、SPEC §2.4 契約の tutorialSteps 形状に準拠)。
  // ============================================================
  // [Blocker 2 修正] narrKey は確定TTS台本 (MM.NARRATION_KEYS.tashizan) に実在する5件
  // (tut_intro/tut_feed_explain/tut_answer_prompt/tut_success/tut_complete) を使う
  // (旧 tut_two_plates/tut_first_plate/tut_second_plate/tut_answer_card は台本に存在しない
  // ad-hoc key だった)。 UI ステップ数(6)の方が台本の tut_*(5) より1つ多いため、
  // 皿タップの個別ステップ (first_plate/second_plate) は直前の tut_feed_explain で
  // 概念を説明済みとして音声を重複再生しない (spotlight/gate によるガイドのみ継続)。
  var tutorialSteps = [
    {
      id: 'step_intro',
      narrKey: MM.NARRATION_KEYS.tashizan.tut_intro,
      gate: 'auto',
      target: '#mm-monster',
      spotlight: '#mm-monster',
      minDwellMs: 1600
    },
    {
      id: 'step_two_plates',
      narrKey: MM.NARRATION_KEYS.tashizan.tut_feed_explain,
      gate: 'auto',
      target: '#mm-shelf',
      spotlight: '#mm-shelf',
      minDwellMs: 1800
    },
    {
      id: 'step_first_plate',
      gate: 'tap:[data-food-id="plate1"]',
      target: '[data-food-id="plate1"]',
      spotlight: '[data-food-id="plate1"]',
      minDwellMs: 1200
    },
    {
      id: 'step_second_plate',
      gate: 'tap:[data-food-id="plate2"]',
      target: '[data-food-id="plate2"]',
      spotlight: '[data-food-id="plate2"]',
      minDwellMs: 1200
    },
    {
      id: 'step_answer_card',
      narrKey: MM.NARRATION_KEYS.tashizan.tut_answer_prompt,
      gate: 'tap:.mm-food-card',
      target: '#mm-shelf',
      spotlight: '#mm-shelf',
      minDwellMs: 1400
    },
    {
      id: 'step_success',
      narrKey: MM.NARRATION_KEYS.tashizan.tut_complete,
      gate: 'auto',
      target: '#mm-bubble',
      spotlight: null,
      minDwellMs: 1600
    }
  ];

  // ============================================================
  // self-registration
  // ============================================================
  MM.registerMode('tashizan', {
    label: 'たしざん',
    monsterId: MONSTER_ID,
    difficultyLabel: 'むずかしい',
    stages: STAGES,
    createRound: createRound,
    onFoodTap: onFoodTap,
    onAnswerTap: onAnswerTap,
    tutorialSteps: tutorialSteps
  });
})();
