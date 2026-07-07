// monster-math/engine.js
// ============================================================
// モンスターさんすう — 共通エンジン (T0 契約凍結版, Impl 1)
//
// 公開 API: window.MM  (SPEC §2.4 の凍結契約に厳密準拠)
//   registerMode(id, def)
//   S                   … 単一 state
//   ui:  { renderShelf, renderFrame, setMonster, bubble, spotlight, lockInput, showResult }
//   fx:  { flyClone, flyBack, confetti, sfx }
//   narration: { say, sayIfAuto, counting }
//   progress:  { getStars, commitRoundStar, commitStageClear }
//   undo: { push, popLastGently, voluntary, popUntil }
//   mmTimeout(fn, ms, phaseGuard)
//
// Impl 2-4 (mode-make10.js / mode-kazoeru.js / mode-tashizan.js) はこのファイルと
// index.html を一切編集しない self-registration 前提 (SPEC §3.0 / §4.2)。
// 本ファイルは T0 段階の骨格実装 (500-800行目安) — ラウンド実ロジックは各 mode-*.js が
// createRound/onFoodTap/onAnswerTap を実装することで完結する。
//
// [M5 復元済み] assets/data/game-stickers.json に monster_math ページ (シール6枚,
// serial 139-144) を復元済み (2026-07-07)。 MODE_CLEAR_STICKER / SPECIAL_STICKER の
// id (mm_pucchi/mm_pakun/mm_gaburu/mm_feast_plate/mm_shokudo_sign/mm_konpeito_bin) と
// catalog 側 id は完全一致を確認済み。 scripts/generate_sticker_metrics.py も再実行し
// Prototypes/StickerExhibitionCarousel/sticker-metrics.js に mm_ 6枚を追加済み。
// play.html 「いま あそべる」 ゾーンにもカードを追加済み ([[feature_museum_sticker_size_normalize]] 準拠)。
// ============================================================
(function () {
  'use strict';

  // ---- モード確定順序 (SPEC §1 #3 / §2.1 タイトル3ドア順) ----
  var MODE_ORDER = ['kazoeru', 'make10', 'tashizan'];
  // mode-*.js の 404 / 未登録時のフォールバック表示用メタ (SPEC §7.1 の
  // 「mode 欠落時にタイトルが落ちず該当ドアのみ無効化される」要件を満たすための既定値)
  var MODE_META_FALLBACK = {
    kazoeru:  { label: 'かぞえる',  monsterId: 'pucchi', difficultyLabel: 'やさしい' },
    make10:   { label: '10づくり',  monsterId: 'pakun',  difficultyLabel: 'ふつう' },
    tashizan: { label: 'たしざん',  monsterId: 'gaburu', difficultyLabel: 'むずかしい' }
  };

  // ---- シール grant 用 stickerId マップ (SPEC §13.4)。 PonoGameStickers.grant() は
  // stickerId 未指定 (event-only) で呼ぶと event-only フォールバック (完了トーストのみ、
  // シール未確定) に落ちてしまい、 かつ event 名しか一致しない場合は「未所持の中から event
  // 一致優先で選ぶ」フォールバックが暴発して意図しないシールが順次付与される事故になる
  // (T0 blocker、 review A 指摘)。 grant() を呼ぶ箇所は必ずこのマップ経由で stickerId を
  // 明示指定すること。 M2-M4 (mode-*.js 実装) 側で feast / perfect_all の grant を直接
  // 呼ぶ際も SPECIAL_STICKER を参照すること (event-only 呼び出しは禁止)。
  var MODE_CLEAR_STICKER = {
    kazoeru:  'mm_pucchi',
    make10:   'mm_pakun',
    tashizan: 'mm_gaburu'
  };
  var SPECIAL_STICKER = {
    feast:        'mm_feast_plate',
    all_modes:    'mm_shokudo_sign',
    perfect_all:  'mm_konpeito_bin'
  };

  // ---- localStorage キー (SPEC §2.5 確定値) ----
  var LS_PROGRESS = 'pono_mmath_progress_v1';
  var LS_ADAPTIVE = 'pono_mmath_adaptive_v1';
  var LS_TUTORIAL = 'pono_mmath_tutorial_seen_v1';
  var LS_BONUS    = 'pono_mmath_bonus_v1';
  var SCHEMA_V = 1;

  function clone(o) { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return o; } }

  function defaultProgress() {
    var modes = {};
    MODE_ORDER.forEach(function (m) { modes[m] = { stages: {} }; });
    return { v: SCHEMA_V, modes: modes, lastPlayed: null };
  }
  function defaultAdaptive() {
    var modes = {};
    MODE_ORDER.forEach(function (m) { modes[m] = { scaffold: 0, missStreak: 0 }; });
    return { v: SCHEMA_V, modes: modes };
  }
  // tutorial 既読状態は modeId → 既読verNumber の map で管理する (Impl1 tutorial step
  // runner 実装に伴い、 単純な真偽値から「バージョン管理された既読」形式に更新。
  // ver を上げれば全ユーザーに再表示できる、 SPEC §2.5 の「ver更新で全員に再表示」要件)。
  // 他3キー (progress/adaptive/bonus) と同じく先頭 'ver' フィールドで全体スキーマの
  // 世代管理を行う (loadLS の versionField 'ver' 判定用、 SCHEMA_V と同義)。
  function defaultTutorial() {
    return { ver: SCHEMA_V, modes: { universal: 0, kazoeru: 0, make10: 0, tashizan: 0 } };
  }
  function defaultBonus() {
    return { v: SCHEMA_V, feastCount: 0 };
  }

  function loadLS(key, defaults, versionField) {
    versionField = versionField || 'v';
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return clone(defaults);
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object' || obj[versionField] !== SCHEMA_V) return clone(defaults);
      return obj;
    } catch (e) {
      return clone(defaults);
    }
  }
  function saveLS(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
  }

  var _progress = loadLS(LS_PROGRESS, defaultProgress());
  var _adaptive = loadLS(LS_ADAPTIVE, defaultAdaptive());
  var _tutorial = loadLS(LS_TUTORIAL, defaultTutorial(), 'ver');
  var _bonus    = loadLS(LS_BONUS, defaultBonus());

  function _modeProgress(mode) {
    if (!_progress.modes[mode]) _progress.modes[mode] = { stages: {} };
    return _progress.modes[mode];
  }
  function _stageProgress(mode, stage) {
    var mp = _modeProgress(mode);
    var key = String(stage);
    if (!mp.stages[key]) mp.stages[key] = { stars: 0, clears: 0 };
    return mp.stages[key];
  }

  // ---- mode registry ----
  var MODES = {};
  function registerMode(id, def) {
    if (!id || !def || MODE_ORDER.indexOf(id) === -1) {
      try { console.warn('[MM] registerMode: unknown mode id ignored:', id); } catch (e) {}
      return;
    }
    MODES[id] = def;
    // 遅延/再登録に備えて、 タイトル表示中なら該当ドアだけ再描画 (防御的、通常は不要)
    if (S.screen === 'title') { try { _renderTitleDoors(); } catch (e) {} }
  }

  // ---- state (SPEC §2.4 契約) ----
  var S = {
    screen: 'title',   // title|stageSelect|play|result
    mode: null,
    stage: null,
    round: 0,
    belly: [],
    phase: 'intro',    // intro|input|resolving|feedback|clear
    missCount: 0,
    stars: 0,
    _roundStars: [],   // このステージ試行中の丸ごと星トラッキング (write-through 用)
    _tutorialActive: false
  };

  // ---- bare setTimeout 禁止 ([[feedback_flag_encounter_settimeout_invariant]] 横展開) ----
  var _timers = [];
  function mmTimeout(fn, ms, phaseGuard) {
    var expected = (phaseGuard != null) ? phaseGuard : null;
    var id = window.setTimeout(function () {
      var idx = _timers.indexOf(id);
      if (idx !== -1) _timers.splice(idx, 1);
      if (expected != null && S.phase !== expected) return; // stale timer: phase 変化後は無視
      try { fn(); } catch (e) { try { console.error('[MM] mmTimeout callback error', e); } catch (_e) {} }
    }, ms);
    _timers.push(id);
    return id;
  }
  function _clearAllTimers() {
    _timers.forEach(function (id) { window.clearTimeout(id); });
    _timers.length = 0;
  }

  // ============================================================
  // WebAudio (proto 継承 + MONSTER_SFX_PARAMS 雛形。 §1 #18)
  // ============================================================
  var _actx = null;
  function _ac() {
    if (_actx) return _actx;
    try { _actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { _actx = null; }
    return _actx;
  }
  function _resumeAudio() {
    var ctx = _ac();
    if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
  }

  // per-monster 音色パラメータ (容量ゼロ差別化、 SPEC 裁定 #18)。
  // pitchMul: 基準周波数への倍率 (小さいモンスターほど高音)。 failure 系は個体差を付けない
  // ([[feedback_miss_voice_progression]] の音版 = 「否定を増やさない」原則)。
  var MONSTER_SFX_PARAMS = {
    pucchi:  { pitchMul: 1.35, wave: 'sine' },
    pakun:   { pitchMul: 1.00, wave: 'triangle' },
    gaburu:  { pitchMul: 0.72, wave: 'sawtooth' }
  };

  function _tone(freq, dur, opts) {
    var ctx = _ac();
    if (!ctx) return;
    opts = opts || {};
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = opts.wave || 'sine';
      osc.frequency.value = freq;
      var vol = (opts.vol != null) ? opts.vol : 0.18;
      var now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0001), now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch (e) {}
  }

  // 共通 SFX 名 (proto 継承): pop / munch / boing / burp / fill(i) / fanfare / star
  // monsterId を渡すと MONSTER_SFX_PARAMS の pitchMul/wave で個体差を付ける (失敗系=boing は
  // 軟化のみで個体差を付けない、 C 案原則に合わせて据え置き)。
  function sfx(name, monsterId) {
    var p = MONSTER_SFX_PARAMS[monsterId] || MONSTER_SFX_PARAMS.pakun;
    switch (name) {
      case 'pop':     _tone(520 * p.pitchMul, 0.09, { wave: p.wave, vol: 0.14 }); break;
      case 'munch':   _tone(300 * p.pitchMul, 0.12, { wave: p.wave, vol: 0.16 }); break;
      case 'boing':   _tone(180, 0.22, { wave: 'sine', vol: 0.10 }); break; // 軟化 -6dB 相当 + 個体差なし
      case 'burp':    _tone(140 * p.pitchMul, 0.30, { wave: 'sawtooth', vol: 0.12 }); break; // まんぷくげっぷ (成功文脈へ転用)
      case 'fanfare': _tone(660, 0.5, { wave: 'triangle', vol: 0.16 }); break;
      case 'star':    _tone(880, 0.18, { wave: 'sine', vol: 0.15 }); break;
      case 'fill':    _tone(440, 0.12, { wave: 'sine', vol: 0.12 }); break;
      default: break;
    }
  }
  function sFill(i) { // かぞえ声 TTS 未着時の音階フォールバック (SPEC §10 縮退ライン #2)
    var base = 392; // ソ
    _tone(base + (i % 8) * 24, 0.1, { wave: 'sine', vol: 0.12 });
  }

  // ============================================================
  // narration wrapper (common/narration.js 経由)
  // ============================================================
  var narration = {
    say: function (key) {
      if (window.Narration && typeof window.Narration.play === 'function') return window.Narration.play(key);
      return Promise.resolve();
    },
    sayIfAuto: function (key) {
      if (window.Narration && typeof window.Narration.playIfAuto === 'function') return window.Narration.playIfAuto(key);
      return Promise.resolve();
    },
    // かぞえ声 (いち〜じゅう)。 未収録 (manifest 未反映) なら sFill 音階のみへ縮退。
    // key 規約は確定TTS台本 (scratchpad/tts_scripts_monster_math.md) に合わせて
    // 'monster_math:count:N' (category 'count' 単独、 'common:count_N' ではない、
    // Blocker 2 修正)。 NARRATION_KEYS.count 経由で同じ文字列を組み立てる。
    counting: function (n) {
      var key = 'monster_math:count:' + n;
      if (window.Narration && typeof window.Narration.hasEntry === 'function' && window.Narration.hasEntry(key)) {
        return narration.sayIfAuto(key);
      }
      sFill(n);
      return Promise.resolve();
    }
  };

  // ============================================================
  // DOM refs (index.html が定義する ID と 1:1 対応)
  // ============================================================
  var dom = {};
  function _cacheDom() {
    dom.stage           = document.getElementById('mm-stage');
    dom.screenTitle      = document.getElementById('screen-title');
    dom.screenStageSel   = document.getElementById('screen-stageSelect');
    dom.screenPlay       = document.getElementById('screen-play');
    dom.screenResult     = document.getElementById('screen-result');
    dom.titleDoors       = document.getElementById('mm-title-doors');
    dom.continueChip     = document.getElementById('mm-continue-chip');
    dom.continueBtn      = document.getElementById('mm-continue-btn');
    dom.stageBack        = document.getElementById('mm-stage-back');
    dom.stageModeLabel   = document.getElementById('mm-stage-mode-label');
    dom.stageGrid        = document.getElementById('mm-stage-grid');
    dom.playBack         = document.getElementById('mm-play-back');
    dom.playStageLabel   = document.getElementById('mm-play-stage-label');
    dom.playStars        = document.getElementById('mm-play-stars');
    dom.shelf            = document.getElementById('mm-shelf');
    dom.frame            = document.getElementById('mm-frame');
    dom.monsterImg       = document.getElementById('mm-monster');
    dom.bubble           = document.getElementById('mm-bubble');
    dom.confirmModal     = document.getElementById('mm-confirm-modal');
    dom.confirmCancel    = document.getElementById('mm-confirm-cancel');
    dom.confirmOk        = document.getElementById('mm-confirm-ok');
    dom.resultStars      = document.getElementById('mm-result-stars');
    dom.resultEvents     = document.getElementById('mm-result-events');
    dom.resultNext       = document.getElementById('mm-result-next');
    dom.resultChoose     = document.getElementById('mm-result-choose');
    dom.resultEnd        = document.getElementById('mm-result-end');
    dom.splash           = document.getElementById('pono-game-splash');
  }

  // ============================================================
  // ui namespace
  // ============================================================
  function _clearChildren(el) { if (el) el.innerHTML = ''; }

  // shelf カードタップの単一配送経路 (SPEC 契約: onFoodTap/onAnswerTap は必ずこの経路
  // 一本を通して呼ばれる。 mode-*.js 側でカード DOM に直接 addEventListener を追加するのは
  // 禁止 — 二重発火 (給餌が2重にカウントされる等) の原因になるため warn 指摘済)。
  // item.kind === 'answer' なら登録 mode の onAnswerTap、 それ以外 (既定 'food') は
  // onFoodTap を呼ぶ。
  function _dispatchShelfTap(item, card) {
    var def = MODES[S.mode];
    if (!def) return;
    var ctx = { card: card, container: dom.shelf };
    if (item && item.kind === 'answer') {
      if (typeof def.onAnswerTap === 'function') def.onAnswerTap(item, ctx);
    } else {
      if (typeof def.onFoodTap === 'function') def.onFoodTap(item, ctx);
    }
  }

  function renderShelf(items) {
    if (!dom.shelf) return;
    _clearChildren(dom.shelf);
    (items || []).forEach(function (item) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'mm-food-card';
      card.dataset.foodId = item.id != null ? String(item.id) : '';
      card.innerHTML =
        '<span class="mm-food-emoji">' + (item.emoji || '🍎') + '</span>' +
        (item.label != null ? '<span class="mm-food-label">' + item.label + '</span>' : '');
      card.addEventListener('click', function () {
        sfx('pop', S.mode ? (MODES[S.mode] || {}).monsterId : null);
        _dispatchShelfTap(item, card);
      });
      dom.shelf.appendChild(card);
    });
  }

  // spec: rows,cols,prefill,twoColor
  function renderFrame(spec) {
    if (!dom.frame) return;
    spec = spec || {};
    var rows = spec.rows || 2;
    var cols = spec.cols || 5;
    _clearChildren(dom.frame);
    dom.frame.style.setProperty('--mm-frame-cols', cols);
    var prefill = spec.prefill || 0;
    var total = rows * cols;
    for (var i = 0; i < total; i++) {
      var cell = document.createElement('div');
      cell.className = 'mm-frame-cell';
      if (i < prefill) cell.classList.add('is-filled');
      if (spec.twoColor && i >= total / 2) cell.classList.add('mm-frame-cell--group2');
      dom.frame.appendChild(cell);
    }
  }

  // pose ∈ 'idle' | 'mouth_open' | 'happy' (SPEC §13.1: 立ち絵 3 pose の pose-swap engine)
  // ファイル名規約: assets/monster_{id}_{pose}.webp (.png フォールバック)。
  // 画像縦横比は object-fit:contain のみで扱い、 stretch は絶対に行わない
  // ([[feedback_image_aspect_ratio]] 絶対遵守)。
  var VALID_POSES = ['idle', 'mouth_open', 'happy'];
  function setMonster(id, pose) {
    if (!dom.monsterImg) return;
    // pose 表記ゆれ (ハイフン/アンダースコア混在) を吸収 (SPEC/実装間の warn 指摘対応)
    var normalizedPose = String(pose || 'idle').replace(/-/g, '_');
    // pose 省略時 (null/undefined) は既定値適用であり正規化ではないので warn 対象外
    // (実際にハイフン表記ゆれ等で書き換わった場合のみ warn する)
    if (pose != null && normalizedPose !== pose) {
      try { console.warn('[MM] pose normalized:', pose, '->', normalizedPose); } catch (e) {}
    }
    pose = normalizedPose;
    if (VALID_POSES.indexOf(pose) === -1) pose = 'idle';
    var base = 'assets/monster_' + id + '_' + pose;
    dom.monsterImg.hidden = false;
    dom.monsterImg.dataset.monsterId = id;
    dom.monsterImg.dataset.pose = pose;
    dom.monsterImg.onerror = function () {
      if (dom.monsterImg.src.indexOf('.webp') !== -1) {
        dom.monsterImg.onerror = function () { dom.monsterImg.hidden = true; dom.monsterImg.onerror = null; };
        dom.monsterImg.src = base + '.png';
      }
    };
    dom.monsterImg.src = base + '.webp';
    dom.monsterImg.alt = id;
  }

  function bubble(text) {
    if (!dom.bubble) return;
    if (text == null || text === '') { dom.bubble.hidden = true; return; }
    dom.bubble.hidden = false;
    dom.bubble.textContent = text;
  }

  // チュートリアル用スポットライト。 target は CSS selector。 呼び出し側は返り値 (clear 関数) を
  // 保持し、 ステップ終了時に呼ぶこと (index.html を跨がない自己完結な実装)。
  function spotlight(sel) {
    var prev = document.querySelectorAll('.mm-spotlight-active');
    prev.forEach(function (el) { el.classList.remove('mm-spotlight-active'); });
    if (!sel) return function () {};
    var el = null;
    try { el = document.querySelector(sel); } catch (e) {}
    if (!el) return function () {};
    el.classList.add('mm-spotlight-active');
    return function () { el.classList.remove('mm-spotlight-active'); };
  }

  // ms 間、 shelf/frame の入力を無効化 (二重給餌 race 対策の土台。 実アニメ完了待ちは
  // mode 側が flyClone の Promise / mmTimeout と組み合わせて使う想定)
  function lockInput(ms) {
    var targets = [dom.shelf, dom.frame].filter(Boolean);
    targets.forEach(function (t) { t.style.pointerEvents = 'none'; });
    mmTimeout(function () {
      targets.forEach(function (t) { t.style.pointerEvents = ''; });
    }, ms || 400, null);
  }

  // stars: 0-5, events: [{type,label}] 任意の付帯結果 (シール獲得等の要約表示)
  function showResult(stars, events) {
    S.screen = 'result';
    if (dom.resultStars) {
      _clearChildren(dom.resultStars);
      for (var i = 0; i < 5; i++) {
        var starEl = document.createElement('span');
        starEl.className = 'mm-star';
        dom.resultStars.appendChild(starEl);
      }
    }
    if (dom.resultEvents) {
      _clearChildren(dom.resultEvents);
      (events || []).forEach(function (ev) {
        var row = document.createElement('div');
        row.className = 'mm-result-event';
        row.textContent = ev && ev.label ? ev.label : '';
        dom.resultEvents.appendChild(row);
      });
    }
    if (dom.screenResult) dom.screenResult.hidden = false;
    // 星を逐次点灯 (SPEC §2.1 リザルト演出)
    var starEls = dom.resultStars ? dom.resultStars.querySelectorAll('.mm-star') : [];
    var lit = Math.max(0, Math.min(5, stars | 0));
    for (var s = 0; s < lit; s++) {
      (function (idx) {
        mmTimeout(function () {
          if (starEls[idx]) starEls[idx].classList.add('is-lit');
          sfx('star', S.mode ? ((MODES[S.mode] || {}).monsterId) : null);
        }, 260 * (idx + 1), null);
      })(s);
    }
    mmTimeout(function () { sfx('burp', S.mode ? ((MODES[S.mode] || {}).monsterId) : null); }, 260 * (lit + 1) + 120, null); // まんぷくげっぷ (成功文脈のみ)
  }

  // ============================================================
  // fx namespace
  // ============================================================
  function _reducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  // 汎用カード飛翔演出。 fromEl→toEl へクローンを飛ばして resolve する Promise を返す。
  // mode 側は resolve 後に belly 更新等の状態変更を行うことで race を避けられる。
  // opts.signal: AbortSignal (省略可)。 画面遷移 (_setActiveScreen) は前画面に紐づく
  // signal を abort するため、 途中で画面が切り替わった flyClone は clone を即座に片付けて
  // resolve(null) する (キャンセル前は永久 pending のまま pointer-events ロックが残る warn
  // 指摘への対応)。
  function flyClone(fromEl, toEl, opts) {
    return new Promise(function (resolve) {
      if (!fromEl || !toEl || _reducedMotion()) { resolve(null); return; }
      opts = opts || {};
      var signal = opts.signal;
      if (signal && signal.aborted) { resolve(null); return; }
      try {
        var r1 = fromEl.getBoundingClientRect();
        var r2 = toEl.getBoundingClientRect();
        var clone = fromEl.cloneNode(true);
        clone.className += ' mm-fly-clone';
        clone.style.position = 'fixed';
        clone.style.left = r1.left + 'px';
        clone.style.top = r1.top + 'px';
        clone.style.width = r1.width + 'px';
        clone.style.height = r1.height + 'px';
        clone.style.margin = '0';
        clone.style.zIndex = '500';
        clone.style.transition = 'transform ' + (opts.duration || 380) + 'ms cubic-bezier(0.3,0.7,0.4,1), opacity ' + (opts.duration || 380) + 'ms ease';
        document.body.appendChild(clone);
        var dx = (r2.left + r2.width / 2) - (r1.left + r1.width / 2);
        var dy = (r2.top + r2.height / 2) - (r1.top + r1.height / 2);
        var settled = false;
        function _cleanup() {
          if (clone.parentNode) clone.parentNode.removeChild(clone);
        }
        function _onAbort() {
          if (settled) return;
          settled = true;
          _cleanup();
          resolve(null);
        }
        if (signal) { try { signal.addEventListener('abort', _onAbort, { once: true }); } catch (e) {} }
        requestAnimationFrame(function () {
          if (settled) return;
          clone.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(0.4)';
          clone.style.opacity = '0.15';
        });
        mmTimeout(function () {
          if (settled) return;
          settled = true;
          if (signal) { try { signal.removeEventListener('abort', _onAbort); } catch (e) {} }
          _cleanup();
          resolve();
        }, (opts.duration || 380) + 20, null);
      } catch (e) { resolve(null); }
    });
  }

  // 10超え拒否: 口の手前で止めて戻る (SPEC §2.3-1)。 belly は不変。
  function flyBack(fromEl, monsterId) {
    sfx('boing', monsterId); // 軟化済み、 個体差なし (原則通り)
    if (!fromEl || _reducedMotion()) return;
    try {
      fromEl.classList.add('mm-shake-refuse');
      mmTimeout(function () { fromEl.classList.remove('mm-shake-refuse'); }, 420, null);
    } catch (e) {}
  }

  // confetti ≤80 粒 / reduced-motion で縮退 (A11y 基準 SPEC §2.5)
  function confetti(n) {
    if (_reducedMotion()) return;
    n = Math.min(80, n || 40);
    var host = document.body;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('div');
      p.className = 'mm-confetti-piece';
      p.style.left = (Math.random() * 100) + 'vw';
      p.style.background = ['#F2742A', '#34D399', '#60A5FA', '#FBBF24'][i % 4];
      p.style.animationDelay = (Math.random() * 0.4) + 's';
      host.appendChild(p);
      (function (el) { mmTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1600, null); })(p);
    }
  }

  // ============================================================
  // progress namespace (write-through)
  // ============================================================
  function getStars(mode, stage) {
    return _stageProgress(mode, stage).stars || 0;
  }

  // ラウンドクリア = 即時 write-through (アプリ強制終了で星を失わないため)。
  // UI (play 画面の星表示) も同期的に更新する — 獲得の瞬間に光る想定で、
  // 3秒後にまとめて反映されるような遅延バッファは持たない (warn 指摘対応)。
  function commitRoundStar() {
    if (!S.mode || !S.stage) return;
    S._roundStars.push(true);
    var earned = Math.min(5, S._roundStars.filter(Boolean).length);
    var sp = _stageProgress(S.mode, S.stage);
    sp.stars = Math.max(sp.stars || 0, earned);
    _progress.lastPlayed = { mode: S.mode, stage: S.stage };
    saveLS(LS_PROGRESS, _progress);
    if (S.screen === 'play') _renderPlayStars(earned);
  }

  function _isModeFullyCleared(mode) {
    var def = MODES[mode];
    if (!def || !def.stages || !def.stages.length) return false;
    var mp = _modeProgress(mode);
    for (var i = 1; i <= def.stages.length; i++) {
      var sp = mp.stages[String(i)];
      if (!sp || !sp.clears) return false;
    }
    return true;
  }

  function commitStageClear() {
    if (!S.mode || !S.stage) return;
    var earned = Math.min(5, S._roundStars.filter(Boolean).length);
    var sp = _stageProgress(S.mode, S.stage);
    sp.stars = Math.max(sp.stars || 0, earned);
    sp.clears = (sp.clears || 0) + 1;
    _progress.lastPlayed = { mode: S.mode, stage: S.stage };
    saveLS(LS_PROGRESS, _progress);

    // シール grant: モード全ステージクリアで clear_<mode> (SPEC §13.4)。
    // stickerId は必ず明示指定すること (MODE_CLEAR_STICKER / SPECIAL_STICKER 参照)。
    // event のみを渡す呼び出しは game-stickers.js 側の「未所持シールを event 一致優先で
    // 順次割り当てる」フォールバックが働いてしまい、 達成条件と無関係なシールが付与される
    // (T0 blocker として発覚、 再発防止のためここに固定)。
    // feast / perfect_all は各 mode-*.js 側 (こうぶつ検知/★5判定) が
    // window.PonoGameStickers.grant({gameId:'monster_math', stickerId: MM._SPECIAL_STICKER.feast, event:'feast'}) の
    // ように SPECIAL_STICKER 経由で stickerId を明示して直接呼ぶ想定 (engine はモード横断の
    // clear_*/all_modes のみ担当)。
    if (window.PonoGameStickers && typeof window.PonoGameStickers.grant === 'function') {
      if (_isModeFullyCleared(S.mode)) {
        var clearStickerId = MODE_CLEAR_STICKER[S.mode];
        try { window.PonoGameStickers.grant({ gameId: 'monster_math', stickerId: clearStickerId, event: 'clear_' + S.mode }); } catch (e) {}
        if (MODE_ORDER.every(_isModeFullyCleared)) {
          try { window.PonoGameStickers.grant({ gameId: 'monster_math', stickerId: SPECIAL_STICKER.all_modes, event: 'all_modes' }); } catch (e) {}
        }
      }
    }
  }

  // ============================================================
  // undo namespace (3層失敗回復の②③、 SPEC §2.3)
  // ============================================================
  var _undoStack = [];
  function undoPush(item) { _undoStack.push(item); }

  function _popCommon(voluntaryFlag) {
    if (!_undoStack.length) return null;
    var item = _undoStack.pop();
    item.voluntary = !!voluntaryFlag;
    sfx('boing', S.mode ? ((MODES[S.mode] || {}).monsterId) : null);
    if (typeof item.undo === 'function') { try { item.undo(item); } catch (e) {} }
    return item;
  }
  // 詰み検知時、 モンスターが最後の1個を優しく吐き戻す (自動、①1回のみナレ)
  function popLastGently() {
    var item = _popCommon(false);
    if (item && !S._stuckNarrSaid) {
      S._stuckNarrSaid = true;
      narration.say('monster_math:common:stuck_undo');
    }
    return item;
  }
  // 子供が自分で「もどす」ボタン等を押した場合 (星/perfect 判定に不算入)
  function voluntaryUndo() { return _popCommon(true); }

  // 詰み検知時、 solvableFn() が true を返すまで 350ms 間隔で popLastGently を反復する
  // (SPEC warn#5: 単発の1個吐き戻しだけでは詰みが解消しないケースへの対応)。
  // undo スタックが尽きたら安全側で停止 (無限ループ防止、 それ以上は打つ手なしとして
  // mode 側の別フォールバック — リセット導線等 — に委ねる)。
  function popUntil(solvableFn, intervalMs) {
    intervalMs = intervalMs || 350;
    function step() {
      // solvableFn() の例外は初回/以降を問わず同じ扱いにする (mmTimeout 経由の呼び出しは
      // その try/catch に握られて非対称になるため、 ここで明示的に揃える)。
      // throw 時は安全側 (詰み解消を諦めて反復停止) に倒す。
      var solvable;
      try {
        solvable = typeof solvableFn === 'function' && solvableFn();
      } catch (e) {
        try { console.warn('[MM] popUntil solvableFn threw, aborting:', e); } catch (e2) {}
        return;
      }
      if (solvable) return;
      if (!_undoStack.length) return;
      popLastGently();
      mmTimeout(step, intervalMs, null);
    }
    step();
  }

  // ============================================================
  // tutorial step runner (Blocker 3: 3モード共通で初回プレイがガイドなしだった
  // 問題への対応)。 mode-*.js は registerMode() で tutorialSteps: [{id, narrKey,
  // target, spotlight, minDwellMs, gate}, ...] を渡す (既に3モードとも実装済、
  // データ定義のみで runner 待ちだった)。 本セクションがその runner 実装。
  //
  // gate の意味:
  //   'auto'        … ユーザー操作を待たず、 音声+minDwellMs の長い方が経過したら進む
  //   'tap'         … step.target (無ければ step.spotlight) 要素へのタップを待つ
  //   'answer'      … 'tap' と同義 (かぞえるモードの回答カード待ちを意味的に明示するため別名)
  //   'tap:<selector>' … 明示 selector へのタップを待つ (target/spotlight を上書き)
  // すべての gate 待ちに安全側フォールバックタイムアウトを設けており、 対象要素が
  // 見つからない/子供がタップしない場合でも永久に詰まない。
  // ============================================================
  // [Warn 2 修正: per-run token] 旧実装はブール1個 (_tutorialAbortFlag) のみで
  // 「今アクティブな run が中断されたか」しか表せず、 A run 実行中に B run が起動
  // すると両者が同じフラグを共有してしまう再入バグがあった (Bのskip/完走がAの
  // 状態を巻き込む)。 _tutorialRunToken は起動のたびに増分する識別子、
  // _tutorialActiveToken は「現在有効な run はどれか」(0 = 有効な run なし/中断済)。
  // 各 run は自分の発行時 token (myToken) を閉じ込め、 毎ステップ
  // `_tutorialActiveToken !== myToken` で stale 判定する — 新しい run が起動する
  // (= _tutorialActiveToken が書き換わる) だけで古い run は自動的に self-abort する。
  var _tutorialRunToken = 0;
  var _tutorialActiveToken = 0;
  var _tutorialAbortResolvers = [];
  // [Warn 3 修正] abort 時に確実に停止させるため、 現在 tutorial runner が再生中の
  // 専用 Audio インスタンスをここで追跡する (_tutorialPlayAndWait が生成/破棄する)。
  var _tutorialCurrentAudio = null;

  function _tutorialTriggerAbort() {
    var list = _tutorialAbortResolvers;
    _tutorialAbortResolvers = [];
    list.forEach(function (r) { try { r(); } catch (e) {} });
    // [Warn 3 修正: audio ghost 対策] 従来は resolvers が Promise を resolve するだけで
    // audio.pause() を呼んでおらず、 画面遷移/tutorialSkip 後もナレーション音声が
    // 最後まで再生され続ける「幽霊ナレーション」バグがあった。 abort 経路は必ず
    // ここを通るため、 ここで確実に止める。
    if (_tutorialCurrentAudio) {
      try { _tutorialCurrentAudio.pause(); _tutorialCurrentAudio.currentTime = 0; } catch (e) {}
      _tutorialCurrentAudio = null;
    }
  }

  // abort 可能な setTimeout 相当 (mmTimeout の _timers とは別管理。 _clearAllTimers に
  // よる画面遷移クリアで resolve されずに Promise が永久 pending になる事故を避けるため、
  // 独自の abort チャンネル (_tutorialAbortResolvers) を使う)。
  function _tutorialWait(ms) {
    return new Promise(function (resolve) {
      var done = false;
      var t = window.setTimeout(function () { if (!done) { done = true; resolve(); } }, ms);
      _tutorialAbortResolvers.push(function () {
        if (done) return;
        done = true;
        window.clearTimeout(t);
        resolve();
      });
    });
  }

  // 同一 page からの相対パスで assets/tts/<file> を解決する (common/narration.js の
  // resolveManifestUrl/assetUrl と同一ロジックの複製。 narration.js はこのタスクの
  // 編集対象外 [engine.js のみ編集] のため、 URL 解決に必要な最小ロジックだけを
  // ここに複製する。 挙動は完全に同一 — location.pathname の階層数だけ '../' を積む)。
  function _ttsAssetUrl(file) {
    var loc = location.pathname;
    var depth = (loc.match(/\//g) || []).length - 1;
    var prefix = '';
    for (var i = 0; i < depth; i++) prefix += '../';
    return prefix + 'assets/tts/' + file;
  }

  // narration key の実 Audio を再生し、 'ended' (実際の再生完了) まで待つ Promise を返す。
  // Narration.play() は Audio.play() の開始 Promise しか返さず実尺を追えないため、
  // 非モック実 Audio での完走検証 ([[feedback_puzzle_tutorial_real_browser_trap]]) を
  // 満たすべく、 ここでは manifest を直接引いて専用の Audio インスタンスを張り ended を待つ。
  // mode==='off' (ナレーションOFF設定) の時・manifest未反映・エラー・タイムアウト時は
  // 安全側で即 resolve(0) する (呼び出し側は minDwellMs との max を取るだけで済む)。
  function _tutorialPlayAndWait(key) {
    return new Promise(function (resolve) {
      if (!window.Narration || typeof window.Narration.getMode !== 'function' || window.Narration.getMode() === 'off') {
        resolve(0);
        return;
      }
      var settled = false;
      function _armGuard() {
        return window.setTimeout(function () {
          if (settled) return;
          settled = true;
          // 6秒ガードで諦める場合も、 既に張られた Audio が裏で再生され続ける
          // "audio ghost" を防ぐため停止してから resolve する。
          if (_tutorialCurrentAudio) {
            try { _tutorialCurrentAudio.pause(); _tutorialCurrentAudio.currentTime = 0; } catch (e) {}
            _tutorialCurrentAudio = null;
          }
          resolve(0);
        }, 6000);
      }
      // [Warn 1 修正: 低速回線での単語途中カット対策] このガードは元々
      // Narration.load() (wav の fetch/decode) 開始前から起動していたため、
      // ロード自体に時間がかかる低速回線だと再生開始前に持ち時間を消費し、
      // 実際の音声再生中に 6 秒ガードが先に発火して単語の途中でカットされ
      // うる不具合があった。 ロード待ち中の "無限ハング" 防止用ガードは
      // ここでそのまま起動しておきつつ、 Audio の 'playing' イベント (実再生
      // 開始) が発火した時点で一度 clearTimeout し、 そこから改めてフルの
      // 6 秒ガードを再アームすることで、 実再生時間が load 時間に食われない
      // ようにする。
      var guardTimer = _armGuard();
      _tutorialAbortResolvers.push(function () {
        if (settled) return;
        settled = true;
        window.clearTimeout(guardTimer);
        resolve(0);
      });
      var loadFn = (typeof window.Narration.load === 'function') ? window.Narration.load() : Promise.resolve(null);
      loadFn.then(function (manifest) {
        if (settled) return;
        var entry = manifest && manifest.entries && manifest.entries[key];
        if (!entry || !entry.file) { settled = true; window.clearTimeout(guardTimer); resolve(0); return; }
        try {
          // [Warn 4 修正: narration.js との重複再生対策] tutorial runner はここで
          // 独自の Audio インスタンスを張るため、 common/narration.js 側 (Narration.play
          // が管理する currentPlaying) に別の音声が同時再生中だと 2 系統の音声が重なる。
          // 新しい tutorial 音声を開始する直前に必ず Narration 側の再生を止めておく
          // (engine.js のみ編集の制約上、 narration.js の stopCurrent 相当である公開
          // API Narration.stop() を経由する)。
          try { if (window.Narration && typeof window.Narration.stop === 'function') window.Narration.stop(); } catch (e2) {}
          var a = new Audio(_ttsAssetUrl(entry.file));
          a.volume = (typeof window.Narration.getVolume === 'function') ? window.Narration.getVolume() : 0.9;
          a.playbackRate = (typeof window.Narration.getRate === 'function') ? window.Narration.getRate() : 1.15;
          _tutorialCurrentAudio = a;
          function finish() {
            if (settled) return;
            settled = true;
            window.clearTimeout(guardTimer);
            if (_tutorialCurrentAudio === a) _tutorialCurrentAudio = null;
            resolve(a.duration || 0);
          }
          a.addEventListener('ended', finish, { once: true });
          a.addEventListener('error', finish, { once: true });
          // 実再生開始 ('playing') を検知したら、 ロード待ち分を巻き戻す形で
          // ガードタイマーをフルの6秒に再アームする ([Warn 1 修正] 参照)。
          a.addEventListener('playing', function () {
            if (settled) return;
            window.clearTimeout(guardTimer);
            guardTimer = _armGuard();
          }, { once: true });
          a.play().catch(finish); // autoplay 拒否等は即フォールバック (無音扱い)
        } catch (e) {
          if (!settled) { settled = true; window.clearTimeout(guardTimer); resolve(0); }
        }
      }).catch(function () {
        if (!settled) { settled = true; window.clearTimeout(guardTimer); resolve(0); }
      });
    });
  }

  function _tutorialGateSelector(step) {
    if (step.gate && typeof step.gate === 'string' && step.gate.indexOf('tap:') === 0) return step.gate.slice(4);
    return step.target || step.spotlight || null;
  }
  function _tutorialStepNeedsGate(step) {
    var g = step && step.gate;
    return g === 'tap' || g === 'answer' || (typeof g === 'string' && g.indexOf('tap:') === 0);
  }

  // ユーザーが対象要素 (または不明時は画面のどこでも) をタップするまで待つ。
  // capture:true + stopPropagation なしで listen するため、 ゲーム自体の本来のタップ
  // ハンドラ (onFoodTap/onAnswerTap 等) の発火を一切妨げない (観測のみ)。
  function _tutorialWaitForGate(step) {
    return new Promise(function (resolve) {
      var sel = _tutorialGateSelector(step);
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        document.removeEventListener('pointerdown', onDocTap, true);
        window.clearTimeout(fallbackT);
        resolve();
      }
      function onDocTap(ev) {
        if (!sel) { finish(); return; }
        // [Warn 1 修正: stale-node capture 対策] step 開始時に対象要素を 1 回だけ
        // querySelector して保持すると、 tashizan 等で shelf が食材消費/補充のたびに
        // DOM を再描画 (ノード差し替え) する場合、 保持していた参照が古いノードを
        // 指したままになり ev.target が新ノード配下でも el.contains() が常に false
        // → 20秒フォールバックに毎回落ちる不具合があった。 判定の直前に毎回 fresh に
        // querySelector し直すことで、 再描画後も常に「今の」対象要素と照合する。
        var freshEl = null;
        try { freshEl = document.querySelector(sel); } catch (e) {}
        if (!freshEl || (ev.target && freshEl.contains(ev.target))) finish();
      }
      document.addEventListener('pointerdown', onDocTap, true);
      // 対象が見つからない/タップされない場合の迷子防止フォールバック (詰み回避)
      var fallbackT = window.setTimeout(finish, 20000);
      _tutorialAbortResolvers.push(finish);
    });
  }

  function _runTutorialStep(step, opts) {
    var clearSpot = step.spotlight ? spotlight(step.spotlight) : function () {};
    var minDwell = step.minDwellMs || 1000;
    var audioEnabled = opts.audio !== false;
    var audioWait = Promise.resolve(0);
    if (step.narrKey) {
      if (audioEnabled) {
        audioWait = _tutorialPlayAndWait(step.narrKey);
      } else {
        // mocked/no-audio テスト環境: 発火のみ行い、 待機は minDwellMs のみに委ねる
        try { narration.say(step.narrKey); } catch (e) {}
      }
    }
    var gateWait = _tutorialStepNeedsGate(step) ? _tutorialWaitForGate(step) : Promise.resolve();
    return Promise.all([_tutorialWait(minDwell), audioWait, gateWait]).then(function () {
      clearSpot();
    });
  }

  function tutorialSkip() {
    // 0 は「有効な run なし」を意味する識別子のため、 これで現在の run を無条件に
    // 無効化する (次に走る run 側の isAborted() チェックにも自然に一致する)。
    _tutorialActiveToken = 0;
    _tutorialTriggerAbort();
    var prevSpot = document.querySelectorAll('.mm-spotlight-active');
    prevSpot.forEach(function (el) { el.classList.remove('mm-spotlight-active'); });
    S._tutorialActive = false;
  }

  function tutorialMarkSeen(modeId, ver) {
    ver = ver || 1;
    if (!_tutorial.modes) _tutorial.modes = {};
    _tutorial.modes[modeId] = ver;
    saveLS(LS_TUTORIAL, _tutorial);
  }
  function tutorialIsSeen(modeId, ver) {
    ver = ver || 1;
    var seenVer = (_tutorial.modes && _tutorial.modes[modeId]) || 0;
    return seenVer >= ver;
  }

  function tutorialRunIfFirstTime(modeId, steps, opts) {
    opts = opts || {};
    var ver = opts.ver || 1;
    if (!steps || !steps.length) return Promise.resolve(false);
    if (!opts.force && tutorialIsSeen(modeId, ver)) return Promise.resolve(false);

    // [Warn 2 修正: per-run token] 新規 run 起動時にまず既存の pending 待機 (前 run の
    // audio/gate/dwell 待ち) を即座に解消しておく。 その上でトークンを発行して current に
    // 昇格させる — 前 run はこの後 next()/finish() を呼んでも isAborted() が true になり
    // 自動的に stale 判定・self-abort する (同じフラグを取り合う再入バグの根本対策)。
    _tutorialTriggerAbort();
    var myToken = ++_tutorialRunToken;
    _tutorialActiveToken = myToken;
    S._tutorialActive = true;

    function isAborted() { return _tutorialActiveToken !== myToken; }

    var i = 0;
    function next() {
      if (isAborted() || i >= steps.length) return finish();
      var step = steps[i++];
      return _runTutorialStep(step, opts).then(function () {
        if (isAborted()) return finish();
        return next();
      });
    }
    function finish() {
      var aborted = isAborted();
      // 既に別の run (新しい token) に取って代わられている場合、 S._tutorialActive /
      // markSeen の権限もその新 run 側にあるため、 ここでは一切触らない。
      if (aborted) return false;
      S._tutorialActive = false;
      // abort (画面遷移等での中断) の場合は「見た」扱いにしない — 次回また最初から
      // ガイドできるようにするため、 正常完走時のみ markSeen する。
      tutorialMarkSeen(modeId, ver);
      return true;
    }
    return next();
  }

  // ============================================================
  // Nav / screen 制御
  // ============================================================
  var TIER_FN = 'isMonsterMathStageUnlocked';

  // 画面ごとの flyClone abort 用 AbortController。 _setActiveScreen は切り替え直前に
  // 必ず前画面分を abort する (pending Promise が画面をまたいで残るのを防ぐ)。
  var _screenAbortCtrl = null;
  function _currentScreenSignal() {
    return _screenAbortCtrl ? _screenAbortCtrl.signal : null;
  }

  function _setActiveScreen(name) {
    // 前画面に紐づく pending flyClone を明示的に cancel + resolve してから切り替える
    // (_clearAllTimers だけだと flyClone の完了 Promise が resolve されずに永久 pending
    // のまま残り、 lockInput 由来の pointer-events:none が解除されない warn 指摘への対応)。
    if (_screenAbortCtrl) { try { _screenAbortCtrl.abort(); } catch (e) {} }
    try { _screenAbortCtrl = (typeof AbortController !== 'undefined') ? new AbortController() : null; } catch (e) { _screenAbortCtrl = null; }

    // [Warn 修正] result overlay (#screen-result) は title/stageSelect/play の
    // is-active 排他制御に含まれない独立オーバーレイのため、 画面遷移のたびに
    // 明示的に隠す。 これがないと戻る操作等で stale な result 表示が新画面の上に
    // 残留し得る (cross review warn: "_setActiveScreen が result overlay 非表示化と
    // S.phase リセットをしない" の根本原因対応)。
    if (dom.screenResult) dom.screenResult.hidden = true;

    // [Warn 修正] S.phase リセット。 前画面の resolving/feedback/clear が新画面に
    // 持ち越されると、 新画面の onFoodTap/onAnswerTap ガード (`S.phase !== 'input'`) が
    // 想定外の値のまま残り stale-screen 競合 (誤ってラウンドが進む/星が二重確定する等) を
    // 招く。 play 画面に入る場合は goPlay 側が直後に 'intro'→'input' を設定するため
    // ここでは無難な初期値 'intro' を、それ以外は 'idle' を設定する。
    S.phase = (name === 'play') ? 'intro' : 'idle';

    // [Blocker 3 関連] アクティブなチュートリアルがあれば安全に中断する。
    // 画面遷移中に pending なチュートリアル step (audio待ち/gate待ち) が残ると
    // 二度と resolve されず S._tutorialActive が true のまま固着してしまうため。
    if (S._tutorialActive) { try { tutorialSkip(); } catch (e) {} }

    [dom.screenTitle, dom.screenStageSel, dom.screenPlay].forEach(function (el) {
      if (el) el.classList.remove('is-active');
    });
    var map = { title: dom.screenTitle, stageSelect: dom.screenStageSel, play: dom.screenPlay };
    if (map[name]) map[name].classList.add('is-active');
    S.screen = name;
    _clearAllTimers();
    // 新しい画面の入力対象のみ pointer-events を明示的に有効化 (前画面の lockInput 由来の
    // pointer-events:none 残留を確実にクリアし、 恒久ロックを防ぐ)
    [dom.shelf, dom.frame].forEach(function (t) { if (t) t.style.pointerEvents = ''; });
    _screenTransitionGuard();
  }

  // 遷移直後 350ms タップガード (誤タップ防止、 A11y 基準)
  function _screenTransitionGuard() {
    if (!dom.stage) return;
    dom.stage.classList.add('mm-nav-guard');
    mmTimeout(function () { dom.stage.classList.remove('mm-nav-guard'); }, 350, null);
  }

  function goTitle() {
    _setActiveScreen('title');
    _renderTitleDoors();
    _renderContinueChip();
    bubble('');
  }

  var _titleSelectedMode = null; // 2タップ選択の1タップ目状態

  function _renderTitleDoors() {
    if (!dom.titleDoors) return;
    _clearChildren(dom.titleDoors);
    MODE_ORDER.forEach(function (modeId) {
      var def = MODES[modeId];
      var meta = MODE_META_FALLBACK[modeId];
      var label = (def && def.label) || meta.label;
      var diff = (def && def.difficultyLabel) || meta.difficultyLabel;
      var monsterId = (def && def.monsterId) || meta.monsterId;
      var door = document.createElement('button');
      door.type = 'button';
      door.className = 'mm-door';
      if (!def) door.classList.add('mm-door--stub'); // mode-*.js 未登録/404 = 無効表示のみ (タイトルは落ちない)
      if (_titleSelectedMode === modeId) door.classList.add('is-selected');
      door.innerHTML =
        '<img class="mm-door-monster" src="assets/monster_' + monsterId + '_idle.webp" alt="' + label + '" ' +
        'onerror="this.onerror=null;this.src=\'assets/monster_' + monsterId + '_idle.png\';">' +
        '<span class="mm-door-label">' + label + '</span>' +
        '<span class="mm-door-diff">' + diff + '</span>';
      door.addEventListener('click', function () { _onDoorTap(modeId, !!def); });
      dom.titleDoors.appendChild(door);
    });
  }

  function _onDoorTap(modeId, hasDef) {
    if (_titleSelectedMode !== modeId) {
      // 1タップ目: 選択 + ナレプレビュー (SPEC §2.1 2タップ選択)
      _titleSelectedMode = modeId;
      _renderTitleDoors();
      narration.sayIfAuto('monster_math:' + modeId + ':door_preview');
      return;
    }
    // 2タップ目: 入場
    if (!hasDef) {
      bubble('じゅんびちゅうだよ。 もうすこし まってね。');
      return;
    }
    goStageSelect(modeId);
  }

  function _renderContinueChip() {
    if (!dom.continueChip) return;
    var lp = _progress.lastPlayed;
    if (lp && lp.mode && lp.stage && MODES[lp.mode]) {
      dom.continueChip.hidden = false;
      if (dom.continueBtn) {
        var meta = MODE_META_FALLBACK[lp.mode];
        dom.continueBtn.textContent = 'つづきから (' + (meta ? meta.label : lp.mode) + ' ' + lp.stage + ')';
      }
    } else {
      dom.continueChip.hidden = true;
    }
  }

  function goStageSelect(modeId) {
    S.mode = modeId;
    _setActiveScreen('stageSelect');
    var def = MODES[modeId];
    var meta = MODE_META_FALLBACK[modeId];
    if (dom.stageModeLabel) dom.stageModeLabel.textContent = (def && def.label) || meta.label;
    _renderStageGrid(modeId, def);
  }

  function _renderStageGrid(modeId, def) {
    if (!dom.stageGrid) return;
    _clearChildren(dom.stageGrid);
    var stages = (def && def.stages) || [];
    if (!stages.length) {
      var ph = document.createElement('div');
      ph.className = 'mm-stage-placeholder';
      ph.textContent = 'じゅんびちゅう だよ。 もうすこし まってね。';
      dom.stageGrid.appendChild(ph);
      return;
    }
    stages.forEach(function (stageCfg, idx) {
      var stageNum = idx + 1;
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'mm-stage-card';
      var unlocked = true;
      try {
        if (window.PonoTier && typeof window.PonoTier[TIER_FN] === 'function') {
          unlocked = window.PonoTier[TIER_FN](modeId, stageNum);
        }
      } catch (e) {}
      if (!unlocked) card.classList.add('is-locked');
      var stars = getStars(modeId, stageNum);
      card.innerHTML =
        '<span class="mm-stage-num">' + stageNum + '</span>' +
        '<span class="mm-stage-name">' + (stageCfg && stageCfg.name ? stageCfg.name : ('ステージ ' + stageNum)) + '</span>' +
        '<span class="mm-stage-stars">' + '★'.repeat(stars) + '☆'.repeat(5 - stars) + '</span>' +
        (unlocked ? '' : '<span class="mm-stage-lock">🔒</span>');
      card.addEventListener('click', function () {
        if (!unlocked) {
          if (window.PonoTier && typeof window.PonoTier.showTierLockPromo === 'function') window.PonoTier.showTierLockPromo();
          return;
        }
        goPlay(modeId, stageNum);
      });
      dom.stageGrid.appendChild(card);
    });
  }

  function _confirmBack(onConfirm) {
    if (!dom.confirmModal) { onConfirm(); return; }
    dom.confirmModal.hidden = false;
    function cleanup() {
      dom.confirmModal.hidden = true;
      dom.confirmOk.removeEventListener('click', okHandler);
      dom.confirmCancel.removeEventListener('click', cancelHandler);
    }
    function okHandler(e) { e.stopPropagation(); cleanup(); onConfirm(); }
    function cancelHandler(e) { e.stopPropagation(); cleanup(); }
    dom.confirmOk.addEventListener('click', okHandler);
    dom.confirmCancel.addEventListener('click', cancelHandler);
  }

  function goPlay(modeId, stageNum) {
    var unlocked = true;
    try {
      if (window.PonoTier && typeof window.PonoTier[TIER_FN] === 'function') {
        unlocked = window.PonoTier[TIER_FN](modeId, stageNum);
      }
    } catch (e) {}
    if (!unlocked) {
      if (window.PonoTier && typeof window.PonoTier.showTierLockPromo === 'function') window.PonoTier.showTierLockPromo();
      return;
    }
    S.mode = modeId;
    S.stage = stageNum;
    S.round = 0;
    S.belly = [];
    S.phase = 'intro';
    S.missCount = 0;
    S._roundStars = [];
    S._stuckNarrSaid = false;
    _undoStack.length = 0;

    _setActiveScreen('play');
    var def = MODES[modeId];
    var meta = MODE_META_FALLBACK[modeId];
    var monsterId = (def && def.monsterId) || meta.monsterId;
    if (dom.playStageLabel) {
      var stageCfg = def && def.stages && def.stages[stageNum - 1];
      dom.playStageLabel.textContent = stageCfg && stageCfg.name ? stageCfg.name : ((def ? def.label : meta.label) + ' ' + stageNum);
    }
    _renderPlayStars(0);
    setMonster(monsterId, 'idle');
    bubble('');
    _clearChildren(dom.shelf);
    _clearChildren(dom.frame);

    if (!def || !def.stages || !def.stages[stageNum - 1] || typeof def.createRound !== 'function') {
      // T0 stub: mode 未実装。 落ちずに「じゅんびちゅう」を出す (SPEC §7.1 チェック項目)
      bubble('このモードは じゅんびちゅうだよ。 また あそびにきてね。');
      return;
    }
    var stageCfg = def.stages[stageNum - 1];
    var scaffold = (_adaptive.modes[modeId] && _adaptive.modes[modeId].scaffold) || 0;
    S.phase = 'input';
    try {
      def.createRound(stageCfg, scaffold);
    } catch (e) {
      try { console.error('[MM] createRound failed', e); } catch (_e) {}
      bubble('うまく はじめられなかったよ。 もういちど タップしてね。');
    }
  }

  function _renderPlayStars(n) {
    if (!dom.playStars) return;
    dom.playStars.textContent = '★'.repeat(Math.max(0, Math.min(5, n))) + '☆'.repeat(5 - Math.max(0, Math.min(5, n)));
  }

  function goResult(stars, events) {
    S.phase = 'clear';
    showResult(stars, events);
  }

  function _wireNav() {
    if (dom.continueBtn) {
      dom.continueBtn.addEventListener('click', function () {
        var lp = _progress.lastPlayed;
        if (lp && lp.mode && lp.stage) goPlay(lp.mode, lp.stage);
      });
    }
    if (dom.stageBack) dom.stageBack.addEventListener('click', function () { goTitle(); });
    if (dom.playBack) {
      dom.playBack.addEventListener('click', function (e) {
        e.stopPropagation();
        _confirmBack(function () { goStageSelect(S.mode); });
      });
    }
    if (dom.resultNext) {
      dom.resultNext.addEventListener('click', function () {
        if (dom.screenResult) dom.screenResult.hidden = true;
        var def = MODES[S.mode];
        var nextStage = (S.stage || 0) + 1;
        if (def && def.stages && def.stages[nextStage - 1]) {
          goPlay(S.mode, nextStage);
        } else {
          goStageSelect(S.mode);
        }
      });
    }
    if (dom.resultChoose) {
      dom.resultChoose.addEventListener('click', function () {
        if (dom.screenResult) dom.screenResult.hidden = true;
        goTitle();
      });
    }
    if (dom.resultEnd) {
      dom.resultEnd.addEventListener('click', function () {
        if (dom.screenResult) dom.screenResult.hidden = true;
        window.location.href = '../play.html';
      });
    }
  }

  // ============================================================
  // 1280x720 fit-to-screen (proto 継承) + 縦画面ローテートヒントは CSS のみで制御
  // ============================================================
  function _fit() {
    if (!dom.stage) return;
    var vw = window.innerWidth, vh = window.innerHeight;
    var scale = Math.min(vw / 1280, vh / 720);
    dom.stage.style.transform = 'translate(-50%,-50%) scale(' + scale + ')';
  }

  // ============================================================
  // splash (oto 型 4層 FOUC ガードの内、 表示制御/タップ解禁部分)
  // ============================================================
  var SPLASH_KEY = 'pono_mmath_splash_shown_v1';
  function _initSplash() {
    var splash = dom.splash;
    if (!splash) return;
    var shown = false;
    try { shown = sessionStorage.getItem(SPLASH_KEY) === '1'; } catch (e) {}
    if (shown) { splash.hidden = true; return; }
    function dismiss(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      try { sessionStorage.setItem(SPLASH_KEY, '1'); } catch (e2) {}
      splash.hidden = true;
      splash.removeEventListener('pointerdown', dismiss);
      splash.removeEventListener('click', dismiss);
      splash.removeEventListener('keydown', onKey);
      _resumeAudio();
      narration.sayIfAuto('monster_math:common:welcome');
    }
    function onKey(e) { if (e.key === 'Enter' || e.key === ' ') dismiss(e); }
    splash.addEventListener('pointerdown', dismiss);
    splash.addEventListener('click', dismiss);
    splash.addEventListener('keydown', onKey);
  }

  // ============================================================
  // init
  // ============================================================
  function _init() {
    _cacheDom();
    _wireNav();
    _initSplash();
    _fit();
    window.addEventListener('resize', _fit);
    window.addEventListener('orientationchange', _fit);
    goTitle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init, { once: true });
  } else {
    _init();
  }

  // ============================================================
  // narration key registry (Blocker 2 の engine 側部分)。 確定TTS台本
  // (scratchpad/tts_scripts_monster_math.md、 合計60本) の key 表記を「正」として
  // ここに定義する。 台本は 'monster_math:<category>:<id>' のコロン区切りで統一されて
  // おり、 mode-*.js が現在参照している独自 key (round_intro/feast_intro/over_first
  // 等) とは大半不一致 — mode-*.js 側の置換は Phase B (別 Impl) で
  // MM.NARRATION_KEYS.<mode>.<id> 参照へ統一する想定。 このファイルは registry の
  // 定義のみを担当し、 mode-*.js は編集しない (worktree isolation / タスクスコープ外)。
  // ============================================================
  var NARRATION_KEYS = {
    common: {
      welcome: 'monster_math:common:welcome',
      door_kazoeru: 'monster_math:common:door_kazoeru',
      door_make10: 'monster_math:common:door_make10',
      door_tashizan: 'monster_math:common:door_tashizan',
      'continue': 'monster_math:common:continue',
      stage_select: 'monster_math:common:stage_select',
      miss_first: 'monster_math:common:miss_first',
      miss_repeat: 'monster_math:common:miss_repeat',
      over10_first: 'monster_math:common:over10_first',
      stuck_undo: 'monster_math:common:stuck_undo',
      voluntary_undo: 'monster_math:common:voluntary_undo',
      round_clear: 'monster_math:common:round_clear',
      stage_clear: 'monster_math:common:stage_clear',
      perfect: 'monster_math:common:perfect',
      result_open: 'monster_math:common:result_open',
      back_confirm: 'monster_math:common:back_confirm',
      acorn_get: 'monster_math:common:acorn_get'
    },
    // count: かぞえ声 (いち〜じゅう)。 narration.counting(n) はこのテーブルと同じ
    // 'monster_math:count:' + n を組み立てる (Blocker 2 修正、 上記 narration.counting 参照)。
    count: (function () {
      var o = {};
      for (var n = 1; n <= 10; n++) o[n] = 'monster_math:count:' + n;
      return o;
    })(),
    make10: {
      tut_intro: 'monster_math:make10:tut_intro',
      tut_frame_explain: 'monster_math:make10:tut_frame_explain',
      tut_feed_prompt: 'monster_math:make10:tut_feed_prompt',
      tut_feed_success: 'monster_math:make10:tut_feed_success',
      tut_undo_explain: 'monster_math:make10:tut_undo_explain',
      tut_complete: 'monster_math:make10:tut_complete',
      play_correct: 'monster_math:make10:play_correct',
      play_hint: 'monster_math:make10:play_hint',
      play_over: 'monster_math:make10:play_over',
      play_monster_happy: 'monster_math:make10:play_monster_happy',
      play_clear_stage: 'monster_math:make10:play_clear_stage',
      feast: 'monster_math:make10:feast'
    },
    kazoeru: {
      tut_intro: 'monster_math:kazoeru:tut_intro',
      tut_dot_explain: 'monster_math:kazoeru:tut_dot_explain',
      tut_answer_prompt: 'monster_math:kazoeru:tut_answer_prompt',
      tut_success: 'monster_math:kazoeru:tut_success',
      tut_complete: 'monster_math:kazoeru:tut_complete',
      play_correct: 'monster_math:kazoeru:play_correct',
      play_hint: 'monster_math:kazoeru:play_hint',
      play_miss_count: 'monster_math:kazoeru:play_miss_count',
      play_clear_stage: 'monster_math:kazoeru:play_clear_stage'
    },
    tashizan: {
      tut_intro: 'monster_math:tashizan:tut_intro',
      tut_feed_explain: 'monster_math:tashizan:tut_feed_explain',
      tut_answer_prompt: 'monster_math:tashizan:tut_answer_prompt',
      tut_success: 'monster_math:tashizan:tut_success',
      tut_complete: 'monster_math:tashizan:tut_complete',
      play_correct: 'monster_math:tashizan:play_correct',
      play_hint: 'monster_math:tashizan:play_hint',
      play_bridge: 'monster_math:tashizan:play_bridge',
      play_clear_stage: 'monster_math:tashizan:play_clear_stage',
      play_festival: 'monster_math:tashizan:play_festival',
      gate_suggest: 'monster_math:tashizan:gate_suggest',
      gate_confirm: 'monster_math:tashizan:gate_confirm'
    }
  };

  // ============================================================
  // export (SPEC §2.4 凍結契約)
  // ============================================================
  window.MM = {
    registerMode: registerMode,
    S: S,
    ui: {
      renderShelf: renderShelf,
      renderFrame: renderFrame,
      setMonster: setMonster,
      bubble: bubble,
      spotlight: spotlight,
      lockInput: lockInput,
      showResult: showResult
    },
    fx: {
      flyClone: flyClone,
      flyBack: flyBack,
      confetti: confetti,
      sfx: sfx
    },
    narration: narration,
    // Blocker 2 の正: 確定TTS台本と1:1対応する narration key 一覧 (読み取り専用)。
    // mode-*.js は Phase B で MM.NARRATION_KEYS.<mode>.<id> 参照へ統一する想定。
    NARRATION_KEYS: NARRATION_KEYS,
    progress: {
      getStars: getStars,
      commitRoundStar: commitRoundStar,
      commitStageClear: commitStageClear
    },
    undo: {
      push: undoPush,
      popLastGently: popLastGently,
      voluntary: voluntaryUndo,
      popUntil: popUntil
    },
    // Blocker 3: チュートリアル step runner (SPEC §2.5 / §7.2)。
    //   runIfFirstTime(modeId, steps, opts) … 既読 (isSeen) でなければ steps を順に
    //     実行し、 完走したら markSeen する。 Promise<boolean> (実行したか) を返す。
    //   markSeen(modeId, ver=1) / isSeen(modeId, ver=1) … pono_mmath_tutorial_seen_v1
    //     に modeId→既読verNumber で永続化。 ver を上げれば全ユーザーに再表示される。
    //   skip() … 現在実行中の runner を安全に中断 (markSeen しない = 次回also再挑戦)。
    tutorial: {
      runIfFirstTime: tutorialRunIfFirstTime,
      markSeen: tutorialMarkSeen,
      isSeen: tutorialIsSeen,
      skip: tutorialSkip
    },
    mmTimeout: mmTimeout,
    // [Impl 2-4 使用可 (契約ヘルパー)]:
    //   MM._SPECIAL_STICKER   — feast / all_modes / perfect_all 用 stickerId マップ
    //   MM._currentScreenSignal() — flyClone opts.signal に渡す (画面遷移時 abort)
    //   MM.tutorial.* / MM.NARRATION_KEYS.* — 正式公開API (契約ヘルパーではなく本体API)
    // [Impl 2-4 使用禁止 (内部専用ヘルパー、 統合フェーズで整理予定)]:
    //   _renderTitleDoors, _renderStageSelect, _setActiveScreen, その他 _ で始まる関数
    //   (これらに依存すると次回リファクタで壊れる)
    _MODE_ORDER: MODE_ORDER,
    _MODE_CLEAR_STICKER: MODE_CLEAR_STICKER,
    _SPECIAL_STICKER: SPECIAL_STICKER,
    _currentScreenSignal: _currentScreenSignal,
    _tutorialState: _tutorial,
    _adaptiveState: _adaptive,
    _bonusState: _bonus,
    _saveAdaptive: function () { saveLS(LS_ADAPTIVE, _adaptive); },
    _saveTutorial: function () { saveLS(LS_TUTORIAL, _tutorial); },
    _saveBonus: function () { saveLS(LS_BONUS, _bonus); },
    _goTitle: goTitle,
    _goStageSelect: goStageSelect,
    _goPlay: goPlay,
    _goResult: goResult
  };
})();
