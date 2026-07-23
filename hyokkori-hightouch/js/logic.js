// ── hyokkori-hightouch/js/logic.js ──
// ひょっこりハイタッチ: 純粋ロジック (DOM 非依存)。
// DOM/描画/入力は js/game.js が担当し、ここは node からも `require` できる
// 純関数群のみを置く。トップレベルで document/window には一切触れないこと。
'use strict';

// ═══ 定数 ═══════════════════════════════════════════════════════════
var GAME_DURATION = 30;      // 秒。30秒経過で finished。
var HOLE_COUNT = 6;          // 隠れ場所の数 (3列x2行)。

var SHOW_TIME_MAX = 1.65;    // 秒 (ゲーム開始時の出現表示時間)
var SHOW_TIME_MIN = 1.25;    // 秒 (30秒後)

var SPAWN_INTERVAL_MAX_MS = 1250; // ゲーム開始時の出現間隔
var SPAWN_INTERVAL_MIN_MS = 900;  // 下限クランプ

var SLEEP_RATIO_MIN = 0.18;
var SLEEP_RATIO_MAX = 0.28;  // 上限クランプ

var NORMAL_HIT_SCORE = 10;   // ふつうのおともだちの基本点。
var BONUS_HIT_SCORE = 30;    // ボーナスのおともだちの基本点。
var MAX_COMBO_BONUS = 10;    // コンボ加点上限 (直前までの成功数を +0〜+10)。
var BONUS_SPAWN_EVERY = 7;   // 実際に出現できた7体ごとにボーナス。
var BONUS_SHOW_TIME_EXTRA = 0.30;
var BONUS_SHOW_TIME_MAX = 1.90;

// ── ひかりのたねリレー ──
var RELAY_HITS_PER_STAGE = 4; // 4回つなぐごとに花壇が1段階育つ。
var FLOWER_STAGE_MAX = 3;     // 0:つち → 1:め → 2:つぼみ → 3:まんかい。

// ── スパムタップ対策 三層防御 (確定値。実装仕様書 §3.1) ──
var TAP_COOLDOWN = 0.22;         // 有効タップ後の全入力ロック秒
var WHIFF_LOCK = 0.35;           // 空振りタップ後のロック秒
var SLEEP_PENALTY = 0;           // 寝てる子タップは減点なし (コンボ解除と入力ロックのみ)
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

/** 成功回数から、ひかりのたねと花壇の表示段階を算出する。 */
function relayProgressAt(hitCount) {
  var relayHits = Math.floor(Number(hitCount));
  if (!isFinite(relayHits) || relayHits < 0) relayHits = 0;
  return {
    relayHits: relayHits,
    relayStep: relayHits % RELAY_HITS_PER_STAGE,
    flowerStage: Math.min(FLOWER_STAGE_MAX, Math.floor(relayHits / RELAY_HITS_PER_STAGE))
  };
}

/** awake タップ成功時だけ、ひかりのたねを1つ先へ進める。 */
function advanceRelay(state) {
  var previousFlowerStage = state && typeof state.flowerStage === 'number'
    ? state.flowerStage
    : 0;
  var progress = relayProgressAt((state && state.relayHits) || 0);
  var next = relayProgressAt(progress.relayHits + 1);

  if (state) {
    state.relayHits = next.relayHits;
    state.relayStep = next.relayStep;
    state.flowerStage = next.flowerStage;
  }

  return {
    relayAdvanced: !!state,
    relayHits: next.relayHits,
    relayStep: next.relayStep,
    flowerStage: next.flowerStage,
    flowerStageChanged: !!state && next.flowerStage !== previousFlowerStage
  };
}

/**
 * 0(開始) → 1(30秒経過) へ単調非減少・上限クランプ済みの進行スケール。
 * t が負値/NaNでも 0、 巨大値でも 1 に収まる (常に有限)。
 * pakupaku-catch/js/logic.js の curveAt (sqrt ease) を踏襲。
 */
function curveAt(tSec) {
  var raw = clamp01(Number(tSec) / GAME_DURATION);
  return Math.sqrt(raw);
}

/** 出現表示時間 (秒)。 1.65 → 1.25、常に単調非増加・クランプ (0未満/NaNにならない)。 */
function showTimeAt(tSec) {
  var k = curveAt(tSec);
  var v = SHOW_TIME_MAX - k * (SHOW_TIME_MAX - SHOW_TIME_MIN);
  return clamp(v, SHOW_TIME_MIN, SHOW_TIME_MAX);
}

/** ボーナスは見分ける時間を0.30秒足し、最大1.90秒まで表示する。 */
function bonusShowTimeAt(tSec) {
  return Math.min(BONUS_SHOW_TIME_MAX, showTimeAt(tSec) + BONUS_SHOW_TIME_EXTRA);
}

/** 出現間隔 (ms)。 1250 → 900、下限900クランプ必須。 */
function spawnIntervalAt(tSec) {
  var k = curveAt(tSec);
  var ms = SPAWN_INTERVAL_MAX_MS - k * (SPAWN_INTERVAL_MAX_MS - SPAWN_INTERVAL_MIN_MS);
  return clamp(ms, SPAWN_INTERVAL_MIN_MS, SPAWN_INTERVAL_MAX_MS);
}

/** 寝てる子の出現比率。 0.18 → 0.28、全 t でこの範囲に収まる。 */
function sleepRatioAt(tSec) {
  var k = curveAt(tSec);
  var ratio = SLEEP_RATIO_MIN + k * (SLEEP_RATIO_MAX - SLEEP_RATIO_MIN);
  return clamp(ratio, SLEEP_RATIO_MIN, SLEEP_RATIO_MAX);
}

/**
 * 実際に穴へ配置できた出現数がボーナス回かを返す。
 * spawn の試行回数ではなく、1から始まる実出現数を渡すこと。
 */
function isBonusSpawn(actualSpawnCount) {
  var count = Number(actualSpawnCount);
  return isFinite(count) && count > 0 && Math.floor(count) === count && count % BONUS_SPAWN_EVERY === 0;
}

/**
 * 成功前のコンボ数と対象から、今回の加点内訳を算出する純関数。
 * target は 'awake' または 'bonus'。それ以外は安全側で通常点として扱う。
 */
function hitScoreFor(comboBefore, target) {
  var previousCombo = Math.floor(Number(comboBefore));
  if (!isFinite(previousCombo) || previousCombo < 0) previousCombo = 0;
  var isBonus = target === 'bonus';
  var baseScore = isBonus ? BONUS_HIT_SCORE : NORMAL_HIT_SCORE;
  var comboBonus = Math.min(previousCombo, MAX_COMBO_BONUS);
  return {
    nextCombo: previousCombo + 1,
    baseScore: baseScore,
    comboBonus: comboBonus,
    scoreDelta: baseScore + comboBonus,
    isBonus: isBonus
  };
}

/**
 * 中央コンボ表示の段階と花火量を返す。2コンボ未満は非表示。
 * 文字は成功ごとに少しずつ育て、花火は4段階で増やす。
 */
function comboFxProfileAt(comboCount) {
  var combo = Math.floor(Number(comboCount));
  if (!isFinite(combo) || combo < 0) combo = 0;
  if (combo < 2) {
    return { combo: combo, tier: 0, growPx: 0, burstCount: 0, particleCount: 0, durationMs: 0 };
  }

  var tier = combo >= 15 ? 4 : combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
  var burstCounts = [0, 1, 1, 2, 3];
  var particleCounts = [0, 8, 18, 32, 54];
  var durations = [0, 760, 850, 950, 1050];
  return {
    combo: combo,
    tier: tier,
    growPx: Math.min(50, Math.round((combo - 2) * 26) / 10),
    burstCount: burstCounts[tier],
    particleCount: particleCounts[tier],
    durationMs: durations[tier]
  };
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
    elapsed: 0,        // 秒 (30でクランプ・finished確定後は増えない。出現カーブ/HUD表示用)
    time: 0,           // 秒 (finished後も増え続ける。 入力ロック判定など「壁時計」用途はこちらを使う)
    score: 0,
    combo: 0,
    bestCombo: 0,
    hits: 0,           // awake / bonus タップ成功数
    bonusHits: 0,      // bonus タップ成功数
    relayHits: 0,      // ひかりのたねをつないだ累計回数
    relayStep: 0,      // 次の花壇段階までの進み (0〜3)
    flowerStage: 0,    // 花壇の成長段階 (0〜3)
    sleepTaps: 0,       // sleeping タップ (誤タップ) 数
    whiffs: 0,          // 空振りタップ数
    overheatCount: 0,    // OVERHEAT 発火回数
    tapTimes: [],        // スパム判定用スライディングウィンドウ (秒の配列)
    inputLockUntil: 0,   // この time 秒数まで入力ロック中 (0 = ロックなし)
    finished: false      // true になったら出現停止 (30秒経過確定)
  };
}

/**
 * タイマーを dtSec 秒進める。 dtSec 省略時は 1 秒として扱う (テスト容易性のため)。
 * 30秒 (GAME_DURATION) に到達したら finished = true に固定する。
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
 * target: 'awake' | 'bonus' | 'sleeping' | 'empty' (穴に何がいるかの解決は呼び出し側が行う)。
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

  if (target === 'awake' || target === 'bonus') {
    var scoring = hitScoreFor(state.combo, target);
    state.score += scoring.scoreDelta;
    state.combo = scoring.nextCombo;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    state.hits = (state.hits || 0) + 1;
    if (scoring.isBonus) state.bonusHits = (state.bonusHits || 0) + 1;
    var relay = advanceRelay(state);
    state.inputLockUntil = tSec + TAP_COOLDOWN;
    return {
      result: 'hit',
      scoreDelta: scoring.scoreDelta,
      combo: state.combo,
      bestCombo: state.bestCombo,
      baseScore: scoring.baseScore,
      comboBonus: scoring.comboBonus,
      isBonus: scoring.isBonus,
      relayAdvanced: relay.relayAdvanced,
      relayStep: relay.relayStep,
      flowerStage: relay.flowerStage,
      flowerStageChanged: relay.flowerStageChanged
    };
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
 * awake / bonus を取り逃した (タップされずに自動退場した) ときに呼ぶ。
 * 無入力は失敗扱いにせず、コンボ・得点・リレーをすべて維持する。
 */
function missedAwake(state) {
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
  NORMAL_HIT_SCORE: NORMAL_HIT_SCORE,
  BONUS_HIT_SCORE: BONUS_HIT_SCORE,
  MAX_COMBO_BONUS: MAX_COMBO_BONUS,
  BONUS_SPAWN_EVERY: BONUS_SPAWN_EVERY,
  RELAY_HITS_PER_STAGE: RELAY_HITS_PER_STAGE,
  FLOWER_STAGE_MAX: FLOWER_STAGE_MAX,
  TAP_COOLDOWN: TAP_COOLDOWN,
  WHIFF_LOCK: WHIFF_LOCK,
  SLEEP_PENALTY: SLEEP_PENALTY,
  SLEEP_PENALTY_LOCK: SLEEP_PENALTY_LOCK,
  SPAM_WINDOW: SPAM_WINDOW,
  SPAM_THRESHOLD: SPAM_THRESHOLD,
  OVERHEAT_LOCK: OVERHEAT_LOCK,
  curveAt: curveAt,
  showTimeAt: showTimeAt,
  bonusShowTimeAt: bonusShowTimeAt,
  spawnIntervalAt: spawnIntervalAt,
  sleepRatioAt: sleepRatioAt,
  isBonusSpawn: isBonusSpawn,
  hitScoreFor: hitScoreFor,
  comboFxProfileAt: comboFxProfileAt,
  relayProgressAt: relayProgressAt,
  advanceRelay: advanceRelay,
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
