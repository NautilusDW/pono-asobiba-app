// monster-math/mode-kazoeru.js
// かぞえる (プッチ) — Impl 3 本実装 (SPEC §2.2 §2.3 §2.4 準拠)
//
// このファイル1本のみを編集する worktree isolation 前提 (index.html / engine.js は触らない)。
// 使用可: window.MM 公開契約 (registerMode/S/ui/fx/narration/progress/undo/mmTimeout) +
//         MM._SPECIAL_STICKER / MM._currentScreenSignal (契約ヘルパー)。
// 使用禁止: その他の MM._ プレフィックス内部関数。
//
// ゲーム設計 (subitizing 1-5, 3-4歳向け):
//   - frame (プッチの5マスbelly) は「こたえを選んだ後、あった数だけ埋まって確認する」
//     専用の演出領域として使う。 誤答演出 (miss1のドットカウントアップ) では belly には
//     絶対に触れない (SPEC §2.3-1 「belly 不変」の精神を踏襲、10超え拒否と同じく
//     "まだ食べていない" 状態を保つ)。
//   - shelf の 1枚目カード (id:'stim') = お題 (ドット / すうじ / おさら)。 tap しても
//     破壊的operationはなく、 MM.narration.counting(n) を聞き直せるだけの安全な UI。
//   - shelf の 2枚目以降 (kind:'answer') = 選択肢 (おさら or すうじカード)。
if (window.MM) {
  (function (MM) {
    'use strict';

    var MONSTER_ID = 'pucchi';
    var FOOD_EMOJI = ['🍓', '🍎', '🍌', '🍊', '🍇', '🍒'];
    var DOT_GLYPH = '●';

    // ============================================================
    // Stage 設定 (SPEC §2.2 テーブル)
    // ============================================================
    var STAGES = [
      { // Stage1: はじめての おやつ — 1-3, 形式A(ドット→おさら), サイコロ固定, 2択
        name: 'はじめての おやつ', min: 1, max: 3, format: 'A',
        placements: ['dice'], choices: 2, answerKind: 'plate'
      },
      { // Stage2: どっちの おさら？ — 1-3, 形式A(数字併記), サイコロ+直線, 3択
        name: 'どっちの おさら？', min: 1, max: 3, format: 'A2',
        placements: ['dice', 'line'], choices: 3, answerKind: 'plate'
      },
      { // Stage3: すうじと おさら — 1-5, 形式B(数字→おさら), サイコロ, 3択
        name: 'すうじと おさら', min: 1, max: 5, format: 'B',
        placements: ['dice'], choices: 3, answerKind: 'plate'
      },
      { // Stage4: ばらばら おさら — 1-5, 形式B, ランダム散布, 3択
        name: 'ばらばら おさら', min: 1, max: 5, format: 'B',
        placements: ['scatter'], choices: 3, answerKind: 'plate'
      },
      { // Stage5: なんこ たべた？ — 1-5, 形式C(おさら→数字), ミックス, 数字カード3
        name: 'なんこ たべた？', min: 1, max: 5, format: 'C',
        placements: ['dice', 'line', 'scatter'], choices: 3, answerKind: 'number'
      }
    ];
    var ROUNDS_PER_STAGE = 5;

    // ============================================================
    // dot 配置ヘルパー (サイコロ/直線/ランダム散布)
    // ============================================================
    var DICE_POS = {
      1: [[50, 50]],
      2: [[28, 28], [72, 72]],
      3: [[24, 24], [50, 50], [76, 76]],
      4: [[26, 26], [74, 26], [26, 74], [74, 74]],
      5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]]
    };

    function _linePositions(n) {
      var arr = [];
      for (var i = 0; i < n; i++) {
        var x = (n <= 1) ? 50 : (12 + i * (76 / (n - 1)));
        arr.push([x, 50]);
      }
      return arr;
    }

    // 決定的な疑似乱数散布 (見た目のバリエーションのみが目的で正誤判定には無関係)
    function _scatterPositions(n) {
      var pts = [];
      var seed = (n * 7 + 13) % 233280;
      for (var i = 0; i < n; i++) {
        seed = (seed * 9301 + 49297) % 233280;
        var rx = 14 + (seed / 233280) * 72;
        seed = (seed * 9301 + 49297) % 233280;
        var ry = 14 + (seed / 233280) * 72;
        pts.push([rx, ry]);
      }
      return pts;
    }

    function _positionsFor(n, placement) {
      if (placement === 'line') return _linePositions(n);
      if (placement === 'scatter') return _scatterPositions(n);
      return DICE_POS[n] || _linePositions(n); // 'dice' 既定 (1-5 は全てテーブルにあり)
    }

    // positions のうち先頭 revealCount 個だけを可視化した HTML を返す (カウントアップ演出用)
    function _dotsHTMLFromPositions(positions, revealCount, glyph) {
      var spans = positions.map(function (p, idx) {
        var visible = idx < revealCount;
        return '<span style="position:absolute;left:' + p[0] + '%;top:' + p[1] + '%;' +
          'transform:translate(-50%,-50%) scale(' + (visible ? 1 : 0) + ');' +
          'font-size:22px;line-height:1;transition:transform .22s ease;">' + glyph + '</span>';
      }).join('');
      return '<span style="position:relative;display:inline-block;width:76px;height:76px;">' + spans + '</span>';
    }

    function _dotsHTML(n, placement, glyph) {
      return _dotsHTMLFromPositions(_positionsFor(n, placement), n, glyph || DOT_GLYPH);
    }

    function _numeralHTML(n) {
      return '<span style="font-size:2.3rem;font-weight:900;color:var(--mm-accent,#F2742A);">' + n + '</span>';
    }

    // ============================================================
    // 乱数 / 選択肢生成
    // ============================================================
    function _randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function _pickOne(arr) { return arr[_randInt(0, arr.length - 1)]; }
    function _shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = _randInt(0, i);
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
    // target を必ず含む count 個の相異なる数値 ([min,max] 範囲内) を返す
    function _pickChoiceValues(target, min, max, count) {
      var pool = [];
      for (var v = min; v <= max; v++) if (v !== target) pool.push(v);
      _shuffle(pool);
      var picks = [target];
      for (var i = 0; i < pool.length && picks.length < count; i++) picks.push(pool[i]);
      while (picks.length < count) picks.push(target); // 安全側フォールバック (通常到達しない)
      return _shuffle(picks);
    }

    function _effectiveChoices(cfg, scaffold) {
      var reduce = (scaffold >= 1) ? 1 : 0;
      return Math.max(2, cfg.choices - reduce);
    }

    // ============================================================
    // ナレーション key
    // [Blocker 2 修正] 'ask_dots'/'ask_number'/'ask_plate'/'praise1-3' は確定TTS台本
    // (MM.NARRATION_KEYS.kazoeru) に存在しない ad-hoc key だったため鳴らなかった。
    // ラウンド開始の後押しは MM.NARRATION_KEYS.kazoeru.play_hint (フォーマット問わず共通、
    // 台本にフォーマット別の ask_* バリエーションが無いため) に、 正解時の讃辞は
    // MM.NARRATION_KEYS.kazoeru.play_correct (1種のみ、台本にpraiseの複数バリエーションは
    // 無いため) に統一する。 bubble のテキスト表示バリエーション (PRAISE_TEXTS) は
    // 音声とは独立した見た目の演出なのでそのまま残す。
    // ============================================================
    var PRAISE_TEXTS = ['やったね！', 'せいかい！', 'じょうずだね！'];

    // ============================================================
    // ラウンド内アイテム構築
    // ============================================================
    function _cloneItem(it) {
      return { id: it.id, emoji: it.emoji, label: it.label, kind: it.kind, value: it.value };
    }

    function _buildRoundItems(cfg, target, placement, foodEmoji, choicesCount) {
      var stimItem;
      if (cfg.format === 'B') {
        stimItem = { id: 'stim', emoji: _numeralHTML(target), label: null };
      } else if (cfg.format === 'C') {
        stimItem = { id: 'stim', emoji: _dotsHTML(target, placement, foodEmoji), label: null };
      } else {
        // 'A' / 'A2'
        var stimLabel = (cfg.format === 'A2') ? String(target) : null;
        stimItem = { id: 'stim', emoji: _dotsHTML(target, placement, DOT_GLYPH), label: stimLabel };
      }

      var values = _pickChoiceValues(target, cfg.min, cfg.max, choicesCount);
      var correctCardId = null;
      var answerItems = values.map(function (v, idx) {
        var id = 'ans' + idx;
        if (v === target) correctCardId = id;
        if (cfg.answerKind === 'number') {
          return { id: id, emoji: _numeralHTML(v), label: null, kind: 'answer', value: v };
        }
        var p = _pickOne(cfg.placements);
        return { id: id, emoji: _dotsHTML(v, p, foodEmoji), label: null, kind: 'answer', value: v };
      });

      return { items: [stimItem].concat(answerItems), stimItem: stimItem, correctCardId: correctCardId };
    }

    // ============================================================
    // ラウンド実行状態 (このモード内でのみ管理。 index.html/engine.js には委ねない)
    // ============================================================
    var _rt = null;

    function createRound(stageCfg, scaffold) {
      _rt = {
        stageCfg: stageCfg,
        scaffold: scaffold || 0,
        roundIdx: 0,     // 0-based 完了済みラウンド数
        missThisRound: 0
      };
      MM.ui.renderFrame({ rows: 1, cols: 5, prefill: 0 }); // プッチの5マスbelly (常に空スタート)
      _startRound();
      // [Task 5] 初回プレイのみ、 いま描画されたラウンドの上にガイドを重ねる
      // (MM.tutorial.runIfFirstTime は既読なら即 no-op で resolve するので毎回呼んで安全)。
      MM.tutorial.runIfFirstTime('kazoeru', TUTORIAL_STEPS);
      return null;
    }

    function _startRound() {
      if (!_rt) return;
      var cfg = _rt.stageCfg;
      MM.S.round = _rt.roundIdx + 1;
      MM.S.phase = 'input';
      MM.S.missCount = 0;
      _rt.missThisRound = 0;

      var target = _randInt(cfg.min, cfg.max);
      var placement = _pickOne(cfg.placements);
      var foodEmoji = _pickOne(FOOD_EMOJI);
      var choicesCount = _effectiveChoices(cfg, _rt.scaffold);

      var built = _buildRoundItems(cfg, target, placement, foodEmoji, choicesCount);

      _rt.target = target;
      _rt.placement = placement;
      _rt.foodEmoji = foodEmoji;
      _rt.items = built.items;
      _rt.stimOriginalItem = _cloneItem(built.stimItem);
      _rt.correctCardId = built.correctCardId;
      // miss1 のドットカウントアップは常にサイコロ配置 (最も読み取りやすい正準パターン) で行う。
      // format C のみ食べ物 glyph、それ以外は中立ドットを使う。
      _rt.countUpPositions = DICE_POS[target] || _linePositions(target);
      _rt.countUpGlyph = (cfg.format === 'C') ? foodEmoji : DOT_GLYPH;

      MM.ui.bubble('');
      MM.ui.setMonster(MONSTER_ID, 'idle');
      MM.ui.renderShelf(_rt.items);
      MM.narration.sayIfAuto(MM.NARRATION_KEYS.kazoeru.play_hint);
    }

    function _renderShelfWithStimulusHTML(html) {
      if (!_rt || !_rt.items || !_rt.items.length) return;
      _rt.items[0] = { id: 'stim', emoji: html, label: _rt.stimOriginalItem.label };
      MM.ui.renderShelf(_rt.items);
    }

    function _restoreStimulus() {
      if (!_rt) return;
      _rt.items[0] = _cloneItem(_rt.stimOriginalItem);
      MM.ui.renderShelf(_rt.items);
    }

    // ============================================================
    // タップハンドラ (engine の単一配送経路からのみ呼ばれる)
    // ============================================================
    function onFoodTap(food, ctx) {
      if (!_rt) return;
      if (food && food.id === 'stim') {
        // お題カードの再タップ = ヒントの聞き直し (非破壊)
        MM.narration.counting(_rt.target);
      }
    }

    function onAnswerTap(card, ctx) {
      if (!_rt || MM.S.phase !== 'input') return;
      if (card && card.value === _rt.target) {
        _resolveCorrect(ctx);
      } else {
        _resolveWrong(ctx);
      }
    }

    // ---- 正解 ----
    function _resolveCorrect(ctx) {
      MM.S.phase = 'resolving';
      var target = _rt.target;
      var lockMs = 500 + (target * 460 + 500) + 1300;
      MM.ui.lockInput(lockMs);
      var monsterEl = document.getElementById('mm-monster');
      var fromEl = ctx && ctx.card;
      MM.fx.flyClone(fromEl, monsterEl, { signal: MM._currentScreenSignal() }).then(function () {
        // [重要Warn 修正] 画面遷移 (戻る確認モーダル等) で screen/mode が変わっていたら
        // 何もしない (make10 と同じ stale-screen callback guard。 これが無いと戻る操作との
        // 競合でゴースト進行/星の二重確定が起き得る)。
        if (MM.S.mode !== 'kazoeru' || MM.S.screen !== 'play' || !_rt) return;
        MM.ui.setMonster(MONSTER_ID, 'mouth_open');
        MM.fx.sfx('munch', MONSTER_ID);
        _fillBellyCounting(target, function () {
          MM.ui.setMonster(MONSTER_ID, 'happy');
          var praiseIdx = _rt.roundIdx % PRAISE_TEXTS.length;
          MM.ui.bubble(PRAISE_TEXTS[praiseIdx]);
          MM.narration.sayIfAuto(MM.NARRATION_KEYS.kazoeru.play_correct);
          MM.progress.commitRoundStar();
          MM.mmTimeout(function () {
            if (!_rt) return;
            MM.ui.setMonster(MONSTER_ID, 'idle');
            MM.ui.bubble('');
            _rt.roundIdx++;
            _advance();
          }, 1100, null);
        });
      });
    }

    function _fillBellyCounting(target, onDone) {
      var i = 0;
      function step() {
        i++;
        MM.ui.renderFrame({ rows: 1, cols: 5, prefill: i });
        MM.fx.sfx('fill', MONSTER_ID);
        MM.narration.counting(i);
        if (i < target) {
          MM.mmTimeout(step, 430, null);
        } else {
          MM.mmTimeout(function () { onDone && onDone(); }, 520, null);
        }
      }
      step();
    }

    function _advance() {
      if (!_rt) return;
      if (_rt.roundIdx >= ROUNDS_PER_STAGE) {
        _finishStage();
      } else {
        MM.ui.renderFrame({ rows: 1, cols: 5, prefill: 0 }); // 次ラウンドに向け belly をリセット
        MM.mmTimeout(_startRound, 260, null);
      }
    }

    function _finishStage() {
      var stars = Math.min(5, _rt.roundIdx);
      var stageName = (_rt.stageCfg && _rt.stageCfg.name) || '';
      MM.progress.commitStageClear();
      // [Blocker 2 修正] 'stage_clear' は台本に存在しない ad-hoc key。 正: play_clear_stage。
      MM.narration.sayIfAuto(MM.NARRATION_KEYS.kazoeru.play_clear_stage);
      MM.ui.showResult(stars, [{ type: 'clear', label: stageName + ' クリア！' }]);
      _rt = null;
    }

    // ---- 誤答 (エラーレス誘導。 fail-out なし、 belly は不変) ----
    function _resolveWrong(ctx) {
      MM.S.missCount = (MM.S.missCount || 0) + 1;
      _rt.missThisRound = MM.S.missCount;
      MM.fx.flyBack(ctx && ctx.card, MONSTER_ID);
      if (MM.S.missCount <= 1) {
        _miss1();
      } else {
        _miss2();
      }
    }

    // miss1: 首をかしげて (bubble表現) お題のドットを一緒に数え直す (belly には触れない)
    function _miss1() {
      var target = _rt.target;
      var lockMs = target * 480 + 900;
      MM.ui.lockInput(lockMs);
      MM.ui.bubble('あれれ？ もういちど かぞえてみよう');
      // [Blocker 2 修正] 'miss1' は台本に存在しない ad-hoc key。 このドットカウントアップ
      // 演出は「いっしょに かぞえてみよう、いち、に、さん」の play_miss_count が内容的に
      // 一致するのでこちらを使う。
      MM.narration.say(MM.NARRATION_KEYS.kazoeru.play_miss_count);
      var i = 0;
      function step() {
        i++;
        _renderShelfWithStimulusHTML(_dotsHTMLFromPositions(_rt.countUpPositions, i, _rt.countUpGlyph));
        MM.narration.counting(i);
        if (i < target) {
          MM.mmTimeout(step, 480, null);
        } else {
          MM.mmTimeout(function () {
            _restoreStimulus();
            MM.ui.bubble('');
            MM.S.phase = 'input';
          }, 600, null);
        }
      }
      step();
    }

    // miss2 以降: 正解のおさら/カードを光らせて教える (guided モード)
    function _miss2() {
      MM.ui.lockInput(1900);
      MM.ui.bubble('こたえは これだよ！');
      // [Blocker 2 修正] 'miss2' は台本に存在しない ad-hoc key。 2回目以降のはっきりした
      // 訂正は台本共通の common.miss_repeat (「こたえは ちがうよ。ゆっくり かぞえてみよう」)
      // を使う ([[feedback_miss_voice_progression]] の2段階目に相当)。
      MM.narration.say(MM.NARRATION_KEYS.common.miss_repeat);
      var sel = '.mm-food-card[data-food-id="' + _rt.correctCardId + '"]';
      var clearSpotlight = MM.ui.spotlight(sel);
      MM.mmTimeout(function () {
        clearSpotlight();
        MM.ui.bubble('');
        MM.S.phase = 'input';
      }, 1800, null);
    }

    // ============================================================
    // tutorialSteps (SPEC §2.4 定義形状 / engine 側 step engine 実装待ち)
    // ============================================================
    // [Blocker 2 修正] narrKey は確定TTS台本 (MM.NARRATION_KEYS.kazoeru) に実在する5件
    // (tut_intro/tut_dot_explain/tut_answer_prompt/tut_success/tut_complete) と1:1対応
    // させる (旧 tut_dot_count/tut_plate_pick/tut_watch_belly は台本に存在しない ad-hoc
    // key だった)。 MM.NARRATION_KEYS 経由で参照し typo を防ぐ。
    var TUTORIAL_STEPS = [
      {
        id: 'step_intro',
        narrKey: MM.NARRATION_KEYS.kazoeru.tut_intro,
        gate: 'tap',
        target: '#mm-monster',
        spotlight: '#mm-frame',
        minDwellMs: 1200
      },
      {
        id: 'step_dot_count',
        narrKey: MM.NARRATION_KEYS.kazoeru.tut_dot_explain,
        gate: 'tap',
        target: '#mm-shelf .mm-food-card:first-child',
        spotlight: '#mm-shelf .mm-food-card:first-child',
        minDwellMs: 1400
      },
      {
        id: 'step_plate_pick',
        narrKey: MM.NARRATION_KEYS.kazoeru.tut_answer_prompt,
        gate: 'answer',
        target: '#mm-shelf',
        spotlight: '#mm-shelf',
        minDwellMs: 1000
      },
      {
        id: 'step_watch_belly',
        narrKey: MM.NARRATION_KEYS.kazoeru.tut_success,
        gate: 'auto',
        target: '#mm-frame',
        spotlight: '#mm-frame',
        minDwellMs: 1600
      },
      {
        id: 'step_success',
        narrKey: MM.NARRATION_KEYS.kazoeru.tut_complete,
        gate: 'auto',
        target: '#mm-monster',
        spotlight: null,
        minDwellMs: 1200
      }
    ];

    // ============================================================
    // registerMode (self-registration)
    // ============================================================
    MM.registerMode('kazoeru', {
      label: 'かぞえる',
      monsterId: MONSTER_ID,
      difficultyLabel: 'やさしい',
      stages: STAGES,
      createRound: createRound,
      onFoodTap: onFoodTap,
      onAnswerTap: onAnswerTap,
      tutorialSteps: TUTORIAL_STEPS
    });
  })(window.MM);
} else {
  try { console.warn('[mode-kazoeru] window.MM not found — registration skipped'); } catch (e) {}
}
