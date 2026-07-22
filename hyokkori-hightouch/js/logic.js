// ── hyokkori-hightouch/js/logic.js ──
// ひょっこりハイタッチ: 純粋ロジック (DOM 非依存)。
// DOM/描画/入力は js/game.js が担当し、ここは node からも `require` できる
// 純関数群のみを置く。トップレベルで document/window には一切触れないこと。
'use strict';

// ═══ 定数 ═══════════════════════════════════════════════════════════
var GAME_DURATION = 60;      // 秒。60秒経過で finished。
var HOLE_COUNT = 6;          // 隠れ場所の数 (2列x3行)。

var SHOW_TIME_MAX = 1.5;     // 秒 (ゲーム開始時の出現表示時間)
var SHOW_TIME_MIN = 1.0;     // 秒 (60秒後)

var SPAWN_INTERVAL_MAX_MS = 1100; // ゲーム開始時の出現間隔
var SPAWN_INTERVAL_MIN_MS = 650;  // 下限クランプ

var SLEEP_RATIO_MIN = 0.25;
var SLEEP_RATIO_MAX = 0.40;  // 上限クランプ

var MAX_COMBO_BONUS = 10;    // コンボボーナス上限 (min(combo, 10))

// ── スパムタップ対策 三層防御 (確定値。実装仕様書 §3.1) ──
var TAP_COOLDOWN = 0.22;         // 有効タップ後の全入力ロック秒
var WHIFF_LOCK = 0.35;           // 空振りタップ後のロック秒
var SLEEP_PENALTY = 5;           // 寝てる子タップの減点
var SLEEP_PENALTY_LOCK = 1.0;    // 寝てる子タップ後のロック秒
var SPAM_WINDOW = 2.0;           // スライディングウィンドウ秒
var SPAM_THRESHOLD = 8;          // ウィンドウ内タップ数がこれ以上で OVERHEAT
var OVERHEAT_LOCK = 1.5;         // OVERHEAT 時の入力ロック秒

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
 * pakupaku-catch/js/logic.js の curveAt (sqrt ease) を踏襲。
 */
function curveAt(tSec) {
  var raw = clamp01(Number(tSec) / GAME_DURATION);
  return Math.sqrt(raw);
}

/** 出現表示時間 (秒)。 1.5 → 1.0、常に単調非増加・クランプ (0未満/NaNにならない)。 */
function showTimeAt(tSec) {
  var k = curveAt(tSec);
  var v = SHOW_TIME_MAX - k * (SHOW_TIME_MAX - SHOW_TIME_MIN);
  return clamp(v, SHOW_TIME_MIN, SHOW_TIME_MAX);
}

/** 出現間隔 (ms)。 1100 → 650、下限650クランプ必須。 */
function spawnIntervalAt(tSec) {
  var k = curveAt(tSec);
  var ms = SPAWN_INTERVAL_MAX_MS - k * (SPAWN_INTERVAL_MAX_MS - SPAWN_INTERVAL_MIN_MS);
  return clamp(ms, SPAWN_INTERVAL_MIN_MS, SPAWN_INTERVAL_MAX_MS);
}

/** 寝てる子の出現比率。 0.25 → 0.40、全 t で 0〜0.40 に収まる。 */
function sleepRatioAt(tSec) {
  var k = curveAt(tSec);
  var ratio = SLEEP_RATIO_MIN + k * (SLEEP_RATIO_MAX - SLEEP_RATIO_MIN);
  return clamp(ratio, SLEEP_RATIO_MIN, SLEEP_RATIO_MAX);
}

/**
 * 次に出現させる kind ('awake' | 'sleeping') を選ぶ。
 * recentKinds: 直近の出現 kind 履歴 (末尾が最新)。直近2体が両方 'sleeping' の
 * 場合は理不尽感防止のため強制的に 'awake' を選出する (3連続sleeping禁止)。
 */
function pickSpawnKind(tSec, recentKinds, rand) {
  var rng = typeof rand === 'function' ? rand : Math.random;
  if (recentKinds && recentKinds.length >= 2) {
    var last = recentKinds[recentKinds.length - 1];
    var prev = recentKinds[recentKinds.length - 2];
    if (last === 'sleeping' && prev === 'sleeping') return 'awake';
  }
  var ratio = sleepRatioAt(tSec);
  return rng() < ratio ? 'sleeping' : 'awake';
}

/**
 * 空いている隠れ場所 (0〜HOLE_COUNT-1) からランダムに1つ選ぶ。
 * occupiedHoles: 現在ふさがっている穴番号の配列。全部ふさがっていれば null。
 */
function pickHole(occupiedHoles, rand) {
  var rng = typeof rand === 'function' ? rand : Math.random;
  var occupied = occupiedHoles || [];
  var free = [];
  for (var i = 0; i < HOLE_COUNT; i++) {
    if (occupied.indexOf(i) === -1) free.push(i);
  }
  if (free.length === 0) return null;
  var idx = Math.floor(rng() * free.length);
  if (idx >= free.length) idx = free.length - 1;
  if (idx < 0) idx = 0;
  return free[idx];
}

/** 新規ゲーム状態を生成。 */
function createInitialState() {
  return {
    elapsed: 0,        // 秒 (60でクランプ・finished確定後は増えない。出現カーブ/HUD表示用)
    time: 0,           // 秒 (finished後も増え続ける。 入力ロック判定など「壁時計」用途はこちらを使う)
    score: 0,
    combo: 0,
    bestCombo: 0,
    hits: 0,           // awake タップ成功数
    sleepTaps: 0,       // sleeping タップ (誤タップ) 数
    whiffs: 0,          // 空振りタップ数
    overheatCount: 0,    // OVERHEAT 発火回数
    tapTimes: [],        // スパム判定用スライディングウィンドウ (秒の配列)
    inputLockUntil: 0,   // この time 秒数まで入力ロック中 (0 = ロックなし)
    finished: false      // true になったら出現停止 (60秒経過確定)
  };
}

/**
 * タイマーを dtSec 秒進める。 dtSec 省略時は 1 秒として扱う (テスト容易性のため)。
 * 60秒 (GAME_DURATION) に到達したら finished = true に固定する。
 * state.time は finished 後も止まらず進み続ける (settling 中の入力ロック解除判定用。
 * pakupaku-catch の state.time/elapsed 二本立てパターンを踏襲)。
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
 * タップを判定する。 tSec は state.time と同じ壁時計上の時刻を渡すこと。
 * target: 'awake' | 'sleeping' | 'empty' (穴に何がいるかの解決は呼び出し側が行う)。
 * 戻り値: { result: 'hit'|'sleepPenalty'|'whiff'|'overheat'|'locked'|'finished', scoreDelta: number }
 *
 * 処理順序 (この順序が本質。実装仕様書 §3.2):
 *   1. finished なら即終了
 *   2. tapTimes に記録 (ロック中のタップも必ずカウントする)
 *   3. スライディングウィンドウ内タップ数が閾値以上なら OVERHEAT
 *   4. 入力ロック中なら locked
 *   5. target 別の加点/減点処理
 */
function registerTap(state, tSec, target) {
  if (!state || state.finished) return { result: 'finished', scoreDelta: 0 };

  if (!Array.isArray(state.tapTimes)) state.tapTimes = [];
  state.tapTimes.push(tSec);
  var cutoff = tSec - SPAM_WINDOW;
  while (state.tapTimes.length && state.tapTimes[0] < cutoff) state.tapTimes.shift();

  if (state.tapTimes.length >= SPAM_THRESHOLD) {
    state.inputLockUntil = Math.max(state.inputLockUntil || 0, tSec + OVERHEAT_LOCK);
    state.overheatCount = (state.overheatCount || 0) + 1;
    state.combo = 0;
    state.tapTimes = [];
    return { result: 'overheat', scoreDelta: 0 };
  }

  if (tSec < (state.inputLockUntil || 0)) {
    return { result: 'locked', scoreDelta: 0 };
  }

  if (target === 'awake') {
    var bonus = Math.min(state.combo, MAX_COMBO_BONUS);
    var delta = 10 + bonus;
    state.score += delta;
    state.combo += 1;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    state.hits += 1;
    state.inputLockUntil = tSec + TAP_COOLDOWN;
    return { result: 'hit', scoreDelta: delta };
  }

  if (target === 'sleeping') {
    var scoreBefore = state.score;
    state.score = Math.max(0, state.score - SLEEP_PENALTY);
    state.combo = 0;
    state.sleepTaps += 1;
    state.inputLockUntil = tSec + SLEEP_PENALTY_LOCK;
    return { result: 'sleepPenalty', scoreDelta: state.score - scoreBefore };
  }

  // target === 'empty' (何もいない場所/背景タップ)
  state.combo = 0;
  state.whiffs += 1;
  state.inputLockUntil = tSec + WHIFF_LOCK;
  return { result: 'whiff', scoreDelta: 0 };
}

/**
 * awake を取り逃した (タップされずに自動退場した) ときに呼ぶ。
 * combo をリセットするのみ。 減点・入力ロックなし (罰にしない)。
 */
function missedAwake(state) {
  if (!state) return state;
  state.combo = 0;
  return state;
}

// ═══ ブラウザ公開 ════════════════════════════════════════════════════
var PUBLIC_API = {
  GAME_DURATION: GAME_DURATION,
  HOLE_COUNT: HOLE_COUNT,
  SHOW_TIME_MIN: SHOW_TIME_MIN,
  SHOW_TIME_MAX: SHOW_TIME_MAX,
  SPAWN_INTERVAL_MIN_MS: SPAWN_INTERVAL_MIN_MS,
  SPAWN_INTERVAL_MAX_MS: SPAWN_INTERVAL_MAX_MS,
  SLEEP_RATIO_MIN: SLEEP_RATIO_MIN,
  SLEEP_RATIO_MAX: SLEEP_RATIO_MAX,
  MAX_COMBO_BONUS: MAX_COMBO_BONUS,
  TAP_COOLDOWN: TAP_COOLDOWN,
  WHIFF_LOCK: WHIFF_LOCK,
  SLEEP_PENALTY: SLEEP_PENALTY,
  SLEEP_PENALTY_LOCK: SLEEP_PENALTY_LOCK,
  SPAM_WINDOW: SPAM_WINDOW,
  SPAM_THRESHOLD: SPAM_THRESHOLD,
  OVERHEAT_LOCK: OVERHEAT_LOCK,
  curveAt: curveAt,
  showTimeAt: showTimeAt,
  spawnIntervalAt: spawnIntervalAt,
  sleepRatioAt: sleepRatioAt,
  pickSpawnKind: pickSpawnKind,
  pickHole: pickHole,
  createInitialState: createInitialState,
  tickTimer: tickTimer,
  registerTap: registerTap,
  missedAwake: missedAwake
};

if (typeof window !== 'undefined') {
  window.HyokkoriLogic = PUBLIC_API;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PUBLIC_API;
}
