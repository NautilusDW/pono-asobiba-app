// ── pakupaku-catch/js/logic.js ──
// ぱくぱくキャッチ: 純粋ロジック (DOM 非依存)。
// canvas 描画・入力・タイマー駆動は js/game.js が担当し、ここは
// node からも `require` できる純関数群のみを置く。
// トップレベルで document/window には一切触れないこと。
'use strict';

// ═══ 定数 ═══════════════════════════════════════════════════════════
var GAME_DURATION = 60;       // 秒。60秒経過で timeUp / finished。
var STUN_DURATION = 1.2;      // NGキャッチ後のスタン秒数。
var MAX_COMBO_BONUS = 10;     // コンボボーナスの上限 (min(combo, 10))。

var FALL_SPEED_MIN = 0.28;    // canvas高さ比/秒 (ゲーム開始時)
var FALL_SPEED_MAX = 0.50;    // canvas高さ比/秒 (60秒後)

var SPAWN_INTERVAL_MAX_MS = 1300; // ゲーム開始時の出現間隔
var SPAWN_INTERVAL_MIN_MS = 600;  // 下限クランプ

var NG_RATIO_MIN = 0.15;
var NG_RATIO_MAX = 0.30;      // 上限クランプ

// ═══ 落下物定義 (一元管理) ══════════════════════════════════════════
// weight は「同じ type (ok/ng) 内での相対出現率」。 ok/ng の切替比率自体は
// ngRatioAt(t) が担当する (pickItemId 参照)。
var ITEM_DEFS = {
  acorn:   { id: 'acorn',   type: 'ok', weight: 30, score: 10 },
  onigiri: { id: 'onigiri', type: 'ok', weight: 25, score: 10 },
  apple:   { id: 'apple',   type: 'ok', weight: 20, score: 10 },
  golden:  { id: 'golden',  type: 'ok', weight: 5,  score: 30 },
  igaguri: { id: 'igaguri', type: 'ng', weight: 12, score: 0 },
  stone:   { id: 'stone',   type: 'ng', weight: 8,  score: 0 }
};

// ═══ ヘルパー ════════════════════════════════════════════════════════
function clamp01(v) {
  if (!(v >= 0)) return 0; // NaN/負値/undefined を弾く
  return v > 1 ? 1 : v;
}

function clamp(v, min, max) {
  if (!(v >= min)) return min;
  return v > max ? max : v;
}

/**
 * 0(開始) → 1(60秒経過) へ単調非減少・上限クランプ済みの進行スケール。
 * t が負値/NaNでも 0、 巨大値でも 1 に収まる (常に有限)。
 */
function curveAt(tSec) {
  var raw = clamp01(Number(tSec) / GAME_DURATION);
  // sqrt ease: 序盤の伸びを緩やかにしつつ単調増加を保つ。
  return Math.sqrt(raw);
}

/**
 * 落下速度 (canvas高さ比/秒)。 0.28 → 0.50、常に単調非減少・上限クランプ。
 * 仕様上ここだけ「線形」補間 (spawnInterval/ngRatio の sqrt-ease とは別式)。
 */
function fallSpeedAt(tSec) {
  var raw = clamp01(Number(tSec) / GAME_DURATION);
  return clamp(FALL_SPEED_MIN + raw * (FALL_SPEED_MAX - FALL_SPEED_MIN), FALL_SPEED_MIN, FALL_SPEED_MAX);
}

/** 出現間隔 (ms)。 1300 → 600、下限 600 クランプ必須。 */
function spawnIntervalAt(tSec) {
  var k = curveAt(tSec);
  var ms = SPAWN_INTERVAL_MAX_MS - k * (SPAWN_INTERVAL_MAX_MS - SPAWN_INTERVAL_MIN_MS);
  return clamp(ms, SPAWN_INTERVAL_MIN_MS, SPAWN_INTERVAL_MAX_MS);
}

/** NG 出現比率。 0.15 → 0.30、上限 0.30 クランプ必須。 */
function ngRatioAt(tSec) {
  var k = curveAt(tSec);
  var ratio = NG_RATIO_MIN + k * (NG_RATIO_MAX - NG_RATIO_MIN);
  return clamp(ratio, NG_RATIO_MIN, NG_RATIO_MAX);
}

/**
 * 次に出現させる落下物 id を選ぶ。
 * recentTypes: 直近の 'ok'/'ng' 履歴 (末尾が最新)。直近2つが両方 'ng' の場合は
 * 理不尽感防止のため強制的に 'ok' を選出する (3連続NG禁止)。
 */
function pickItemId(tSec, recentTypes, rand) {
  var rng = typeof rand === 'function' ? rand : Math.random;
  var ratio = ngRatioAt(tSec);
  var forceOk = false;
  if (recentTypes && recentTypes.length >= 2) {
    var last = recentTypes[recentTypes.length - 1];
    var prev = recentTypes[recentTypes.length - 2];
    if (last === 'ng' && prev === 'ng') forceOk = true;
  }
  var wantNg = !forceOk && rng() < ratio;
  var pool = [];
  var keys = Object.keys(ITEM_DEFS);
  for (var i = 0; i < keys.length; i++) {
    var def = ITEM_DEFS[keys[i]];
    if ((wantNg && def.type === 'ng') || (!wantNg && def.type === 'ok')) pool.push(def);
  }
  var totalWeight = 0;
  for (var j = 0; j < pool.length; j++) totalWeight += pool[j].weight;
  var r = rng() * totalWeight;
  for (var k = 0; k < pool.length; k++) {
    r -= pool[k].weight;
    if (r <= 0) return pool[k].id;
  }
  return pool[pool.length - 1].id;
}

/** 新規ゲーム状態を生成。 */
function createInitialState() {
  return {
    elapsed: 0,        // 秒 (60でクランプ・finished確定後は増えない。出現カーブ/HUD表示用)
    time: 0,           // 秒 (finished後も増え続ける。 stun判定など「壁時計」用途はこちらを使う)
    score: 0,
    combo: 0,
    bestCombo: 0,
    catches: 0,        // OKキャッチ総数
    goldenCatches: 0,
    stunUntil: 0,       // この time 秒数までスタン中 (0 = スタンしていない)
    finished: false    // true になったら出現停止 (60秒経過確定)
  };
}

/**
 * タイマーを dtSec 秒進める。 dtSec 省略時は 1 秒として扱う (テスト容易性のため)。
 * 60秒 (GAME_DURATION) に到達したら finished = true に固定する。
 * 残機制/ゲームオーバー分岐は存在しない — 必ず時間経過のみで終了する。
 * state.time は finished 後も止まらず進み続ける (settling 中のスタン解除判定用)。
 */
function tickTimer(state, dtSec) {
  if (!state) return state;
  var dt = (typeof dtSec === 'number' && isFinite(dtSec)) ? dtSec : 1;
  state.time = (state.time || 0) + dt;
  if (state.finished) return state;
  state.elapsed += dt;
  if (state.elapsed >= GAME_DURATION) {
    state.elapsed = GAME_DURATION;
    state.finished = true;
  }
  return state;
}

/**
 * 落下物 1 個をキャッチした結果を state に適用する。
 * NG: 減点なし・ゲームオーバーなし。 combo を 0 にリセットし、
 *     state.elapsed からの STUN_DURATION 秒スタンを予約するのみ。
 * OK: 基本点 + min(combo, MAX_COMBO_BONUS) を加点、 combo+1。
 */
function applyCatch(state, itemId) {
  if (!state) return state;
  var def = ITEM_DEFS[itemId];
  if (!def) return state;

  if (def.type === 'ng') {
    state.combo = 0;
    state.stunUntil = (state.time || 0) + STUN_DURATION;
  } else {
    var comboBonus = Math.min(state.combo, MAX_COMBO_BONUS);
    state.score += def.score + comboBonus;
    state.combo += 1;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    state.catches += 1;
    if (itemId === 'golden') state.goldenCatches += 1;
  }
  return state;
}

/**
 * state.time (壁時計。 finished 後も進む) 時点でスタン中かどうか。
 * state.elapsed ではなく state.time を使うことで、 60秒到達後の settling
 * (演出待ち) 期間中に elapsed が固定されてもスタンが解除されるようにする。
 */
function isStunned(state) {
  return !!(state && state.stunUntil && (state.time || 0) < state.stunUntil);
}

// ═══ ブラウザ公開 ════════════════════════════════════════════════════
var PUBLIC_API = {
  GAME_DURATION: GAME_DURATION,
  STUN_DURATION: STUN_DURATION,
  MAX_COMBO_BONUS: MAX_COMBO_BONUS,
  FALL_SPEED_MIN: FALL_SPEED_MIN,
  FALL_SPEED_MAX: FALL_SPEED_MAX,
  SPAWN_INTERVAL_MIN_MS: SPAWN_INTERVAL_MIN_MS,
  SPAWN_INTERVAL_MAX_MS: SPAWN_INTERVAL_MAX_MS,
  NG_RATIO_MIN: NG_RATIO_MIN,
  NG_RATIO_MAX: NG_RATIO_MAX,
  ITEM_DEFS: ITEM_DEFS,
  curveAt: curveAt,
  fallSpeedAt: fallSpeedAt,
  spawnIntervalAt: spawnIntervalAt,
  ngRatioAt: ngRatioAt,
  pickItemId: pickItemId,
  createInitialState: createInitialState,
  tickTimer: tickTimer,
  applyCatch: applyCatch,
  isStunned: isStunned
};

if (typeof window !== 'undefined') {
  window.PakupakuLogic = PUBLIC_API;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GAME_DURATION: GAME_DURATION,
    STUN_DURATION: STUN_DURATION,
    curveAt: curveAt,
    fallSpeedAt: fallSpeedAt,
    spawnIntervalAt: spawnIntervalAt,
    ngRatioAt: ngRatioAt,
    pickItemId: pickItemId,
    applyCatch: applyCatch,
    tickTimer: tickTimer,
    isStunned: isStunned,
    createInitialState: createInitialState,
    ITEM_DEFS: ITEM_DEFS
  };
}
