"use strict";
/* ============================================================
   どんぐり わけっこ たいけつ — js/game.js

   構成:
   1) 純関数ブロック (テストが node:fs で slice → node:vm で実行する対象)
      NORMAL_PATTERNS / EASY_PATTERNS / LABELS / pickHint / judgeRound /
      resolveMatch / canConfirm / moveAcorn / choosePatternPool
   2) DOM 制御ブロック (IIFE。純関数ブロックを closure 経由で参照する)

   ルール仕様は donguri-wakekko 実装仕様書 (2026-07-22) を参照。
   ============================================================ */

/* ------------------------------------------------------------
   1) 純関数ブロック
   ------------------------------------------------------------ */

// dist は [やま, かわ, もり]。合計は必ず5。
// hintHonest: true → 視線は argmax(dist) のカゴ / false → argmin(dist) のカゴ (ブラフ)
var NORMAL_PATTERNS = [
  { dist: [3, 1, 1], hintHonest: true },
  { dist: [1, 3, 1], hintHonest: false },
  { dist: [0, 2, 3], hintHonest: true },
  { dist: [2, 2, 1], hintHonest: true },
  { dist: [1, 0, 4], hintHonest: false }
];

// 救済用: 極端配分 + 常に正直ヒント → 裏をかきやすい
var EASY_PATTERNS = [
  { dist: [5, 0, 0], hintHonest: true },
  { dist: [0, 5, 0], hintHonest: true },
  { dist: [0, 0, 5], hintHonest: true },
  { dist: [4, 1, 0], hintHonest: true },
  { dist: [4, 0, 1], hintHonest: true }
];

// 画面表示用の文字列は全てここに集約する。算用数字(全角/半角とも)は含めない。
var LABELS = {
  gameTitle: 'どんぐり わけっこ たいけつ',
  gameSubtitle: 'あらいぐまと どんぐりを わけっこ しよう',
  startButton: 'はじめる',
  confirmButton: 'けってい',
  rematchButton: 'もういっかい',
  winTitle: 'かったぞ！',
  loseTitle: 'またやろうね',
  basketYama: 'やま',
  basketKawa: 'かわ',
  basketMori: 'もり',
  treasureWinName: 'きんのどんぐり',
  treasureWinLabel: 'あらいぐまに かった！',
  treasureConsolationName: 'がんばりどんぐり',
  treasureConsolationLabel: 'たくさん がんばったね'
};

// もっとも値が大きい index (同値は最小 index を優先)
function argmaxIndex(arr) {
  var best = 0;
  for (var i = 1; i < arr.length; i++) {
    if (arr[i] > arr[best]) best = i;
  }
  return best;
}

// もっとも値が小さい index (同値は最小 index を優先)
function argminIndex(arr) {
  var best = 0;
  for (var i = 1; i < arr.length; i++) {
    if (arr[i] < arr[best]) best = i;
  }
  return best;
}

// あらいぐまの視線先カゴ index を返す。
// hintHonest: true → argmax(dist) (正直) / false → argmin(dist) (ブラフ)
function pickHint(pattern) {
  if (!pattern || !Array.isArray(pattern.dist)) return 0;
  return pattern.hintHonest ? argmaxIndex(pattern.dist) : argminIndex(pattern.dist);
}

// カゴごとの勝敗旗と、ラウンド全体の勝敗を判定する。
// playerDist / npcDist: [やま, かわ, もり] の各カゴ個数。
// 戻り値: { flags: ['player'|'npc'|null, ...], result: 'win'|'lose'|'draw',
//           playerFlagCount, npcFlagCount }
// 解釈メモ: 「旗2本以上でラウンド勝ち」という表現は目安であり、実装は
// playerFlagCount と npcFlagCount の単純な大小比較 (any lead decides) で
// 決着させる。つまり 1-0 (残り1つは引分け) のような1本差でも win/lose が
// 確定し、0-0 や 1-1 の完全同数のときだけ draw になる。
function judgeRound(playerDist, npcDist) {
  var flags = [null, null, null];
  var playerFlagCount = 0;
  var npcFlagCount = 0;
  for (var i = 0; i < 3; i++) {
    var p = (playerDist && playerDist[i]) || 0;
    var n = (npcDist && npcDist[i]) || 0;
    if (p > n) {
      flags[i] = 'player';
      playerFlagCount++;
    } else if (n > p) {
      flags[i] = 'npc';
      npcFlagCount++;
    }
  }
  var result;
  if (playerFlagCount > npcFlagCount) result = 'win';
  else if (npcFlagCount > playerFlagCount) result = 'lose';
  else result = 'draw';
  return {
    flags: flags,
    result: result,
    playerFlagCount: playerFlagCount,
    npcFlagCount: npcFlagCount
  };
}

// 最初の3ラウンド分の 'win'/'lose'/'draw' 結果が決着しているか (win数 !== lose数)。
function isFirstThreeDecided(results) {
  var first3 = (results || []).slice(0, 3);
  var win = 0;
  var lose = 0;
  for (var i = 0; i < first3.length; i++) {
    if (first3[i] === 'win') win++;
    else if (first3[i] === 'lose') lose++;
  }
  return win !== lose;
}

// マッチ全体の勝敗を確定する。results は最大4要素
// ([round1, round2, round3, サドンデス(あれば)])。
// 3ラウンドで win/lose 数が同数の場合のみ 4番目 (サドンデス) を参照する。
// サドンデスが引き分け、または未提供の場合は救済ルールでプレイヤー勝ち('win')。
// 戻り値は必ず 'win' か 'lose' ('unresolved' 等の中間状態を返さない)。
function resolveMatch(results) {
  var list = results || [];
  var first3 = list.slice(0, 3);
  var win = 0;
  var lose = 0;
  for (var i = 0; i < first3.length; i++) {
    if (first3[i] === 'win') win++;
    else if (first3[i] === 'lose') lose++;
  }
  if (win > lose) return 'win';
  if (lose > win) return 'lose';
  // 3ラウンドで同数 → サドンデス (4番目の要素) を参照
  var sd = list[3];
  if (sd === 'win') return 'win';
  if (sd === 'lose') return 'lose';
  // サドンデス引き分け、またはサドンデス結果が未提供 → 救済でプレイヤー勝ち
  return 'win';
}

// トレイが空 (0個) のときだけ「けってい」できる。
function canConfirm(state) {
  return !!state && state.tray === 0;
}

// state: { tray: N, baskets: [a,b,c] } (常に合計5)。
// from/to: 'tray' または 0/1/2 (カゴ index)。
// 移動元が空の場合は no-op (state を複製したまま返す)。
//
// 注意: DOM 制御ブロックの実配置処理 (placeAcornInto, 284-341行付近) は、
// この関数を呼び出さず appendChild による DOM 移動 (常に単一の親しか
// 持てないという DOM 自体の性質) を直接使って「合計5個保存」の不変条件を
// 担保している。moveAcorn はその不変条件を状態遷移として表現した参照実装
// であり、テスト(セクション5)は "合計が保存されるべきロジック" の正しさを
// 検証する目的で残している。placeAcornInto 自体の回帰は
// tests/donguri_wakekko_regression.cjs 側に DOM ベースのテストが無いため、
// このテストではカバーされない (実機/Playwright での確認が必要)。
function moveAcorn(state, from, to) {
  var next = {
    tray: state.tray,
    baskets: state.baskets.slice()
  };
  var available = from === 'tray' ? next.tray : next.baskets[from];
  if (!available || available <= 0) return next;
  if (from === 'tray') next.tray -= 1;
  else next.baskets[from] -= 1;
  if (to === 'tray') next.tray += 1;
  else next.baskets[to] += 1;
  return next;
}

// 連敗救済: streak >= 2 のマッチは EASY_PATTERNS を使う。
function choosePatternPool(loseStreak) {
  return (loseStreak || 0) >= 2 ? EASY_PATTERNS : NORMAL_PATTERNS;
}

// Fisher-Yates shuffle (破壊しない)
function shuffleArray(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

// 単調化防止用: dist の3値をランダムな並びに置換した配列を返す (合計は不変)。
function permuteDistRandom(dist) {
  var order = shuffleArray([0, 1, 2]);
  return [dist[order[0]], dist[order[1]], dist[order[2]]];
}

/* ------------------------------------------------------------
   2) DOM 制御ブロック
   ------------------------------------------------------------ */
(function () {
  if (typeof document === 'undefined') return;

  var ACORN_IMG_SRC = '../assets/images/nazonazo-tunnel/quiz-art/quiz_acorn_20260714.webp';
  var LS_LOSE_STREAK = 'donguri_wakekko_lose_streak';
  var MATCH_ROUNDS = 3;
  var HINT_DURATION_MS = 2500;
  var REVEAL_DROP_MS = 900;
  var JUDGE_PAUSE_MS = 1200;
  var ACORN_DRAG_THRESHOLD = 8;
  var SUPPORTS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  var state = {
    phase: 'title', // title | hint | place | confirm | reveal | judge | result
    round: 0,
    deck: [],
    roundResults: [],
    npcDist: [0, 0, 0]
  };

  var playerAcornEls = [];
  var selectedAcornEl = null;
  var activeDrag = null;

  // ---- localStorage 連敗カウンタ ----
  function getLoseStreak() {
    try {
      var v = parseInt(localStorage.getItem(LS_LOSE_STREAK), 10);
      return isNaN(v) ? 0 : v;
    } catch (e) {
      return 0;
    }
  }
  function setLoseStreak(v) {
    try {
      localStorage.setItem(LS_LOSE_STREAK, String(v));
    } catch (e) { /* noop */ }
  }
  function incrementLoseStreak() {
    var v = getLoseStreak() + 1;
    setLoseStreak(v);
    return v;
  }

  // ---- phase 管理 ----
  function setPhase(p) {
    state.phase = p;
    try { document.body.dataset.donguriPhase = p; } catch (e) { /* noop */ }
  }

  // ---- 要素ヘルパー ----
  function basketZone(idx) {
    return document.querySelector('.basket-zone[data-basket="' + idx + '"]');
  }
  function basketPlayerSlot(idx) {
    return document.querySelector('.basket-player-slot[data-basket="' + idx + '"]');
  }
  function basketNpcSlot(idx) {
    return document.querySelector('.basket-npc-slot[data-basket="' + idx + '"]');
  }
  function basketFlagsWrap(idx) {
    var zone = basketZone(idx);
    return zone ? zone.querySelector('.basket-flags') : null;
  }
  function trayEl() {
    return document.getElementById('tray');
  }

  // ---- どんぐり駒 DOM 生成 ----
  function createAcornTokenElement(kind) {
    var el = document.createElement('div');
    el.className = 'acorn-token' + (kind === 'npc' ? ' acorn-token-npc' : ' acorn-token-player');
    var img = document.createElement('img');
    img.src = ACORN_IMG_SRC;
    img.alt = '';
    img.draggable = false;
    img.addEventListener('error', function () {
      if (img.parentNode) img.parentNode.removeChild(img);
      var span = document.createElement('span');
      span.className = 'acorn-emoji-fallback';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = '\u{1F330}'; // 🌰
      el.appendChild(span);
    });
    el.appendChild(img);
    return el;
  }

  // ---- プレイヤー配分 / トレイ個数 ----
  function getPlayerDist() {
    var dist = [0, 0, 0];
    for (var i = 0; i < 3; i++) {
      var slot = basketPlayerSlot(i);
      dist[i] = slot ? slot.children.length : 0;
    }
    return dist;
  }
  function getTrayCount() {
    var t = trayEl();
    return t ? t.children.length : 0;
  }

  function updateConfirmButtonState() {
    var btn = document.getElementById('confirmBtn');
    if (!btn) return;
    btn.disabled = !canConfirm({ tray: getTrayCount() });
  }

  function onAcornPlacementChanged() {
    updateConfirmButtonState();
  }

  // ---- 選択 (タップ2段階フォールバック) ----
  function setSelectedAcorn(el) {
    if (selectedAcornEl) selectedAcornEl.classList.remove('is-selected');
    selectedAcornEl = el;
    if (selectedAcornEl) selectedAcornEl.classList.add('is-selected');
  }

  function handleAcornTap(el) {
    if (state.phase !== 'place') return;
    if (selectedAcornEl === el) {
      setSelectedAcorn(null);
    } else {
      setSelectedAcorn(el);
    }
  }

  // ---- 配置実処理 ----
  function placeAcornInto(el, target) {
    if (state.phase !== 'place') return;
    if (target === 'tray') {
      var t = trayEl();
      if (t) t.appendChild(el);
    } else {
      var slot = basketPlayerSlot(target);
      if (slot) {
        slot.appendChild(el);
        if (window.Haptics && typeof Haptics.fire === 'function') {
          Haptics.fire('stickerPaste');
        }
      }
    }
    el.classList.remove('is-selected');
    if (selectedAcornEl === el) selectedAcornEl = null;
    onAcornPlacementChanged();
  }

  // ---- ドラッグ (ゴースト表示) ----
  function startGhost(el) {
    el.classList.add('is-dragging');
    el.style.position = 'fixed';
    el.style.zIndex = '500';
    el.style.pointerEvents = 'none';
  }
  function positionGhost(el, x, y) {
    var w = el.offsetWidth || 48;
    var h = el.offsetHeight || 48;
    el.style.left = (x - w / 2) + 'px';
    el.style.top = (y - h / 2) + 'px';
  }
  function stopGhost(el) {
    el.classList.remove('is-dragging');
    el.style.position = '';
    el.style.zIndex = '';
    el.style.pointerEvents = '';
    el.style.left = '';
    el.style.top = '';
  }
  function clearDropHighlight() {
    var all = document.querySelectorAll('.is-drop-target');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('is-drop-target');
  }
  function highlightDropTarget(x, y) {
    clearDropHighlight();
    var target = hitTestDropZone(x, y);
    if (target === 'tray') {
      var t = trayEl();
      if (t) t.classList.add('is-drop-target');
    } else if (target !== null) {
      var zone = basketZone(target);
      if (zone) zone.classList.add('is-drop-target');
    }
  }
  function hitTestDropZone(x, y) {
    var el = document.elementFromPoint(x, y);
    while (el) {
      if (el.classList && el.classList.contains('basket-player-slot')) {
        return el.getAttribute('data-basket');
      }
      if (el.id === 'tray') return 'tray';
      el = el.parentElement;
    }
    return null;
  }

  // ---- ドラッグ/タップ共通の追跡ステートマシン ----
  function beginTrack(el, x, y) {
    if (activeDrag) return;
    if (state.phase !== 'place') return;
    activeDrag = { acornEl: el, startX: x, startY: y, dragging: false };
  }
  function moveTrack(x, y) {
    if (!activeDrag) return;
    var dx = x - activeDrag.startX;
    var dy = y - activeDrag.startY;
    if (!activeDrag.dragging && Math.sqrt(dx * dx + dy * dy) > ACORN_DRAG_THRESHOLD) {
      activeDrag.dragging = true;
      startGhost(activeDrag.acornEl);
    }
    if (activeDrag.dragging) {
      positionGhost(activeDrag.acornEl, x, y);
      highlightDropTarget(x, y);
    }
  }
  function endTrack(x, y) {
    if (!activeDrag) return;
    var wasDragging = activeDrag.dragging;
    var el = activeDrag.acornEl;
    clearDropHighlight();
    if (wasDragging) {
      stopGhost(el);
      var target = (x != null && y != null) ? hitTestDropZone(x, y) : null;
      placeAcornInto(el, target || 'tray');
    } else {
      handleAcornTap(el);
    }
    activeDrag = null;
  }
  function cancelTrack() {
    if (!activeDrag) return;
    var el = activeDrag.acornEl;
    if (activeDrag.dragging) {
      stopGhost(el);
      // iOS 実機の pointercancel/touchcancel 既知バグ対策:
      // 追跡が打ち切られた場合は安全側でトレイへ戻す (仕様書 §8 準拠)。
      placeAcornInto(el, 'tray');
    }
    clearDropHighlight();
    activeDrag = null;
  }

  // ---- どんぐりへのイベント付与 (デバイス種別で経路を分ける) ----
  // memory: iOS 実機は pointercancel でドラッグ追跡が無効化されるため、
  // タッチ対応デバイスでは pointer 系を使わず touchstart/touchmove/touchend/
  // touchcancel だけで完結させる ([[feedback_ios_pointercancel_native_pan]])。
  function attachAcornInteractions(el) {
    el.style.touchAction = 'none';
    if (SUPPORTS_TOUCH) {
      el.addEventListener('touchstart', function (e) {
        var t = e.touches[0];
        if (t) beginTrack(el, t.clientX, t.clientY);
      }, { passive: true });
      el.addEventListener('touchmove', function (e) {
        if (!activeDrag || activeDrag.acornEl !== el) return;
        var t = e.touches[0];
        if (t) {
          e.preventDefault();
          moveTrack(t.clientX, t.clientY);
        }
      }, { passive: false });
      el.addEventListener('touchend', function (e) {
        if (!activeDrag || activeDrag.acornEl !== el) return;
        var t = e.changedTouches[0];
        endTrack(t ? t.clientX : null, t ? t.clientY : null);
      });
      el.addEventListener('touchcancel', function () {
        if (!activeDrag || activeDrag.acornEl !== el) return;
        cancelTrack();
      });
    } else {
      el.addEventListener('pointerdown', function (e) {
        beginTrack(el, e.clientX, e.clientY);
        if (!activeDrag || activeDrag.acornEl !== el) return;
        var pm = function (ev) { moveTrack(ev.clientX, ev.clientY); };
        var pu = function (ev) { endTrack(ev.clientX, ev.clientY); cleanup(); };
        var pc = function () { cancelTrack(); cleanup(); };
        function cleanup() {
          document.removeEventListener('pointermove', pm);
          document.removeEventListener('pointerup', pu);
          document.removeEventListener('pointercancel', pc);
        }
        document.addEventListener('pointermove', pm);
        document.addEventListener('pointerup', pu);
        document.addEventListener('pointercancel', pc);
      });
    }
  }

  // ---- タップ2段階フォールバック: カゴ/トレイ側のタップハンドラ ----
  function wireDropZoneTapHandlers() {
    var zones = document.querySelectorAll('.basket-zone');
    for (var i = 0; i < zones.length; i++) {
      (function (zone) {
        zone.addEventListener('click', function (e) {
          if (e.target && e.target.closest && e.target.closest('.acorn-token')) return;
          if (!selectedAcornEl) return;
          if (state.phase !== 'place') return;
          placeAcornInto(selectedAcornEl, zone.getAttribute('data-basket'));
        });
      })(zones[i]);
    }
    var tray = trayEl();
    if (tray) {
      tray.addEventListener('click', function (e) {
        if (e.target && e.target.closest && e.target.closest('.acorn-token')) return;
        if (!selectedAcornEl) return;
        if (state.phase !== 'place') return;
        placeAcornInto(selectedAcornEl, 'tray');
      });
    }
  }

  // ---- ラウンド/マッチ フロー ----
  function resetRoundBoard() {
    var tray = trayEl();
    for (var i = 0; i < playerAcornEls.length; i++) {
      var el = playerAcornEls[i];
      el.classList.remove('is-selected', 'is-dragging');
      el.style.position = '';
      el.style.left = '';
      el.style.top = '';
      el.style.zIndex = '';
      el.style.pointerEvents = '';
      if (tray) tray.appendChild(el);
    }
    for (var b = 0; b < 3; b++) {
      var npcSlot = basketNpcSlot(b);
      if (npcSlot) npcSlot.innerHTML = '';
      var flagsWrap = basketFlagsWrap(b);
      if (flagsWrap) flagsWrap.innerHTML = '';
    }
    setSelectedAcorn(null);
    updateConfirmButtonState();
  }

  function updateRoundIndicator() {
    for (var i = 0; i < 3; i++) {
      var dot = document.getElementById('roundDot' + i);
      if (!dot) continue;
      dot.classList.remove('is-win', 'is-lose', 'is-draw');
      var r = state.roundResults[i];
      if (r === 'win') dot.classList.add('is-win');
      else if (r === 'lose') dot.classList.add('is-lose');
      else if (r === 'draw') dot.classList.add('is-draw');
    }
  }

  function playHintAnimation(basketIdx, cb) {
    var raccoon = document.getElementById('raccoonAvatar');
    var bubble = document.getElementById('raccoonThoughtBubble');
    var basketEmoji = ['⛰️', '🌊', '🌲'];
    if (raccoon) {
      raccoon.classList.remove('look-0', 'look-1', 'look-2');
      raccoon.classList.add('look-' + basketIdx);
    }
    if (bubble) {
      bubble.textContent = basketEmoji[basketIdx] || '';
      bubble.classList.add('show');
    }
    setTimeout(function () {
      if (bubble) bubble.classList.remove('show');
      if (raccoon) raccoon.classList.remove('look-0', 'look-1', 'look-2');
      cb();
    }, HINT_DURATION_MS);
  }

  function startRound() {
    resetRoundBoard();
    var pattern = state.deck[state.round];
    if (!pattern) pattern = NORMAL_PATTERNS[0];
    var permutedDist = permuteDistRandom(pattern.dist);
    state.npcDist = permutedDist;
    var hintIdx = pickHint({ dist: permutedDist, hintHonest: pattern.hintHonest });
    setPhase('hint');
    if (window.Narration && typeof Narration.play === 'function') {
      Narration.play('donguri_hint');
    }
    playHintAnimation(hintIdx, function () {
      setPhase('place');
    });
  }

  function renderNpcAcorns(npcDist, cb) {
    for (var i = 0; i < 3; i++) {
      var slot = basketNpcSlot(i);
      if (!slot) continue;
      slot.innerHTML = '';
      for (var j = 0; j < npcDist[i]; j++) {
        var token = createAcornTokenElement('npc');
        token.style.animationDelay = (j * 90) + 'ms';
        slot.appendChild(token);
      }
    }
    setTimeout(cb, REVEAL_DROP_MS);
  }

  function applyRoundFlags(flags) {
    for (var i = 0; i < 3; i++) {
      var wrap = basketFlagsWrap(i);
      if (!wrap) continue;
      wrap.innerHTML = '';
      if (flags[i] === 'player' || flags[i] === 'npc') {
        var f = document.createElement('div');
        f.className = 'flag ' + (flags[i] === 'player' ? 'flag-player' : 'flag-npc');
        wrap.appendChild(f);
      }
    }
  }

  function doReveal() {
    setPhase('reveal');
    renderNpcAcorns(state.npcDist, function () {
      setPhase('judge');
      var playerDist = getPlayerDist();
      var judged = judgeRound(playerDist, state.npcDist);
      applyRoundFlags(judged.flags);
      if (window.Haptics && typeof Haptics.fire === 'function') {
        Haptics.fire('gachaTurn3');
      }
      if (window.Narration && typeof Narration.play === 'function' && judged.result === 'draw') {
        Narration.play('donguri_draw');
      }
      state.roundResults.push(judged.result);
      setTimeout(afterRoundJudged, JUDGE_PAUSE_MS);
    });
  }

  function afterRoundJudged() {
    if (state.round < 3) updateRoundIndicator();
    state.round++;
    if (state.round < MATCH_ROUNDS) {
      startRound();
      return;
    }
    if (state.round === MATCH_ROUNDS && !isFirstThreeDecided(state.roundResults)) {
      // サドンデス (最大1ラウンドのみ追加)
      startRound();
      return;
    }
    finishMatch();
  }

  function playWinSequence() {
    if (window.Narration && typeof Narration.play === 'function') Narration.play('donguri_win');
    try {
      var fanfare = new Audio('../assets/audio/battle/victory_fanfare.mp3');
      fanfare.play().catch(function () { /* autoplay blocked */ });
    } catch (e) { /* noop */ }
    if (window.Haptics && typeof Haptics.fire === 'function') Haptics.fire('superBadgePop');
    if (window.showTreasure) {
      window.showTreasure({
        name: LABELS.treasureWinName,
        img: ACORN_IMG_SRC,
        label: LABELS.treasureWinLabel,
        onClose: function () { showRematchUI(); }
      });
    } else {
      showRematchUI();
    }
  }

  function playLoseSequence(streak) {
    if (window.Narration && typeof Narration.play === 'function') Narration.play('donguri_lose');
    if (streak === 3 && window.showTreasure) {
      window.showTreasure({
        name: LABELS.treasureConsolationName,
        img: ACORN_IMG_SRC,
        label: LABELS.treasureConsolationLabel,
        onClose: function () { showRematchUI(); }
      });
    } else {
      showRematchUI();
    }
  }

  function showRematchUI() {
    var resultScreen = document.getElementById('resultScreen');
    if (resultScreen) resultScreen.hidden = false;
  }

  function finishMatch() {
    setPhase('result');
    var winner = resolveMatch(state.roundResults);
    var streak;
    if (winner === 'win') {
      setLoseStreak(0);
      streak = 0;
    } else {
      streak = incrementLoseStreak();
    }
    if (window.incrementStat) incrementStat('donguriWakekkoPlays', 1);
    if (winner === 'win' && window.incrementStat) incrementStat('donguriWakekkoWins', 1);
    if (window.checkAchievements) checkAchievements();
    if (window.flushAchievementPopups) flushAchievementPopups();

    var titleEl = document.getElementById('resultTitle');
    if (titleEl) titleEl.textContent = winner === 'win' ? LABELS.winTitle : LABELS.loseTitle;

    if (winner === 'win') {
      playWinSequence();
    } else {
      playLoseSequence(streak);
    }
  }

  function startMatch() {
    var streak = getLoseStreak();
    var pool = choosePatternPool(streak);
    state.deck = shuffleArray(pool);
    state.round = 0;
    state.roundResults = [];
    updateRoundIndicator();
    window._achDeferPopups = true;

    var titleScreen = document.getElementById('titleScreen');
    var board = document.getElementById('board');
    var resultScreen = document.getElementById('resultScreen');
    if (titleScreen) titleScreen.hidden = true;
    if (board) board.hidden = false;
    if (resultScreen) resultScreen.hidden = true;

    startRound();
  }

  // ---- 初期化 ----
  function initLabels() {
    var order = ['basketYama', 'basketKawa', 'basketMori'];
    var zones = document.querySelectorAll('.basket-label');
    for (var i = 0; i < zones.length; i++) {
      var idx = zones[i].getAttribute('data-basket');
      var key = order[Number(idx)];
      if (key) zones[i].textContent = LABELS[key];
    }
    var gameTitle = document.getElementById('gameTitle');
    if (gameTitle) gameTitle.textContent = LABELS.gameTitle;
    var gameSubtitle = document.getElementById('gameSubtitle');
    if (gameSubtitle) gameSubtitle.textContent = LABELS.gameSubtitle;
    var startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.textContent = LABELS.startButton;
    var confirmLabel = document.getElementById('confirmBtnLabel');
    if (confirmLabel) confirmLabel.textContent = LABELS.confirmButton;
    var rematchBtn = document.getElementById('rematchBtn');
    if (rematchBtn) rematchBtn.textContent = LABELS.rematchButton;
  }

  function createPlayerAcorns() {
    var tray = trayEl();
    if (!tray) return;
    for (var i = 0; i < 5; i++) {
      var el = createAcornTokenElement('player');
      attachAcornInteractions(el);
      tray.appendChild(el);
      playerAcornEls.push(el);
    }
  }

  function wireButtons() {
    var startBtn = document.getElementById('startBtn');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        startMatch();
      });
    }
    var confirmBtn = document.getElementById('confirmBtn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        if (state.phase !== 'place') return;
        if (!canConfirm({ tray: getTrayCount() })) return;
        setPhase('confirm');
        confirmBtn.disabled = true;
        doReveal();
      });
    }
    var rematchBtn = document.getElementById('rematchBtn');
    if (rematchBtn) {
      rematchBtn.addEventListener('click', function () {
        startMatch();
      });
    }
  }

  function init() {
    initLabels();
    createPlayerAcorns();
    wireDropZoneTapHandlers();
    wireButtons();
    window._achDeferPopups = true;
    if (window.Narration) {
      if (typeof Narration.play === 'function') Narration.play('donguri_intro');
      if (typeof Narration.prefetch === 'function') {
        Narration.prefetch(['donguri_intro', 'donguri_hint', 'donguri_win', 'donguri_lose', 'donguri_draw']);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ---- 横画面 (16:9) 強制プロンプト (hatake-nikki/js/game.js:58-107 と同型に強靭化) ----
  // viewport 縦横比だけで向きを推定しない。WebView 起動直後/bfcache 復帰直後は
  // innerWidth/innerHeight が 0 や古い値になることがあり、旧実装の
  // 「innerHeight >= innerWidth」は 0>=0 → portrait と誤検知してフルスクリーン
  // オーバーレイ + #app inert で startBtn を塞ぐ。物理向き (screen.orientation) を
  // 最優先、判定不能時は fail-open (表示しない)。
  var portraitMQ = null;
  try { portraitMQ = matchMedia('(orientation: portrait)'); } catch (e) {}

  function isPortraitNow() {
    try {
      var so = window.screen && screen.orientation;
      if (so && typeof so.type === 'string' && so.type) {
        return so.type.indexOf('portrait') === 0;
      }
    } catch (e) {}
    if (portraitMQ && typeof portraitMQ.matches === 'boolean') return portraitMQ.matches;
    if (!window.innerWidth || !window.innerHeight) return false; // 未確定は landscape 扱い (fail-open)
    return window.innerHeight > window.innerWidth; // 厳密不等号 (正方形は landscape 扱い)
  }

  function updateLandscapeNotice() {
    var notice = document.getElementById('landscape-notice');
    if (!notice) return;
    var isTouch = false;
    try { isTouch = matchMedia('(pointer: coarse)').matches; } catch (e) {}
    var show = isPortraitNow() && isTouch;
    notice.style.display = show ? 'flex' : 'none';
    notice.setAttribute('aria-hidden', show ? 'false' : 'true');
    var app = document.getElementById('app');
    if (app) app.toggleAttribute('inert', show);
  }
  updateLandscapeNotice();
  window.addEventListener('orientationchange', function () {
    setTimeout(updateLandscapeNotice, 100);
    setTimeout(updateLandscapeNotice, 500);
  });
  window.addEventListener('resize', updateLandscapeNotice);
  window.addEventListener('pageshow', updateLandscapeNotice); // bfcache 復帰対策
  window.addEventListener('load', updateLandscapeNotice);     // 起動直後の viewport 確定後に再評価
  try {
    if (screen.orientation && screen.orientation.addEventListener) {
      screen.orientation.addEventListener('change', updateLandscapeNotice);
    }
  } catch (e) {}
  if (portraitMQ) {
    if (portraitMQ.addEventListener) portraitMQ.addEventListener('change', updateLandscapeNotice);
    else if (portraitMQ.addListener) portraitMQ.addListener(updateLandscapeNotice); // 旧 iOS Safari
  }
  if (window.visualViewport && visualViewport.addEventListener) {
    visualViewport.addEventListener('resize', updateLandscapeNotice);
  }
})();
