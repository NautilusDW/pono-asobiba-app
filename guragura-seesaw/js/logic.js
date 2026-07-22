// ── guragura-seesaw/js/logic.js ──
// ぐらぐらシーソーひろば: 純粋ロジック (DOM 非依存)。
// DOM/描画/入力は js/game.js が担当し、ここは node からも `require` できる
// 純関数群のみを置く。トップレベルで document/window には一切触れないこと。
//
// 重要な設計原則 (実装仕様書 v1 §2.2 準拠):
//   重さ判定は CATALOG の weight のみを参照する。見た目の箱サイズ区分 (CATALOG の
//   各エントリが持つ表示専用プロパティ) は game.js の CSS 描画のみに使い、本ファイル
//   の判定関数はどこでもそれを読んではならない (回帰テストでソース regex 検証される)。
'use strict';

// ═══ 乗せ物カタログ (12点) ═══════════════════════════════════════════
// img は game.js 側の ITEM_IMAGES マップで id → 画像パスに解決する。
// ここでは数値 (weight) とラベル・見た目の箱サイズ区分 (CSS表示専用) のみ持つ。
var CATALOG = [
  { id: 'cherry',    label: 'さくらんぼ',     weight: 1, sizeClass: 'l' },
  { id: 'blueberry', label: 'ブルーベリー',   weight: 1, sizeClass: 's' },
  { id: 'apple',     label: 'りんご',         weight: 2, sizeClass: 'm' },
  { id: 'lemon',     label: 'れもん',         weight: 2, sizeClass: 's' },
  { id: 'frog',      label: 'かえる',         weight: 2, sizeClass: 'm' },
  { id: 'grapes',    label: 'ぶどう',         weight: 3, sizeClass: 'l' },
  { id: 'cat',       label: 'ねこ',           weight: 3, sizeClass: 'm' },
  { id: 'carrot',    label: 'にんじん',       weight: 3, sizeClass: 'm' },
  { id: 'dog',       label: 'いぬ',           weight: 4, sizeClass: 'm' },
  { id: 'corn',      label: 'とうもろこし',   weight: 4, sizeClass: 'l' },
  { id: 'bear',      label: 'くま',           weight: 5, sizeClass: 'l' },
  { id: 'elephant',  label: 'ぞう',           weight: 6, sizeClass: 'm' }
];

var CATALOG_BY_ID = {};
for (var _ci = 0; _ci < CATALOG.length; _ci++) {
  CATALOG_BY_ID[CATALOG[_ci].id] = CATALOG[_ci];
}

// ═══ ラウンド定義 (5ラウンド固定) ════════════════════════════════════
// left: おだい (id 配列)。tray: そのラウンドでトレイに出すアイテム id 配列。
// 重さ合計は CATALOG から導出するのでハードコードしない。
var ROUNDS = [
  { left: ['grapes'],        tray: ['cherry', 'blueberry', 'apple', 'lemon', 'frog', 'cat'] },
  { left: ['bear'],          tray: ['apple', 'grapes', 'cherry', 'lemon', 'blueberry', 'frog'] },
  { left: ['elephant'],      tray: ['dog', 'apple', 'grapes', 'cat', 'lemon', 'frog', 'cherry'] },
  { left: ['dog', 'cherry'], tray: ['grapes', 'apple', 'carrot', 'lemon', 'blueberry', 'frog'] },
  { left: ['bear', 'grapes'], tray: ['corn', 'dog', 'apple', 'cat', 'carrot', 'lemon', 'cherry'] }
];

// ═══ 傾き・釣り合い・滑り落ち定数 ════════════════════════════════════
var MAX_ANGLE = 14;         // deg クランプ
var ANGLE_PER_DIFF = 3.5;   // deg / 重さ差1
var BALANCE_EPS_DEG = 1.0;  // これ以下で「つりあい」成立
var SLIP_DIFF = 5;          // 配置後の |右-左| がこれ以上なら滑り落ち(配置拒否)
var PAN_CAPACITY = 4;       // 片皿の最大アイテム数

// ═══ 減衰振動 (バネ) 定数 ════════════════════════════════════════════
var SPRING_K = 60;      // 1/s^2
var SPRING_DAMP = 5.5;  // 1/s (アンダーダンプ → 2〜3回ぐらぐらして静定)

// ═══ ヘルパー ════════════════════════════════════════════════════════
function toFiniteNumber(v) {
  var n = Number(v);
  return isFinite(n) ? n : 0;
}

function clamp(v, min, max) {
  if (!(v >= min)) return min;
  return v > max ? max : v;
}

/** id → CATALOG エントリ (存在しない id は null)。 */
function getItem(id) {
  return CATALOG_BY_ID.hasOwnProperty(id) ? CATALOG_BY_ID[id] : null;
}

/** id → weight (存在しない id は 0)。 */
function itemWeight(id) {
  var item = getItem(id);
  return item ? item.weight : 0;
}

/** id 配列 → 合計 weight。 */
function sumWeights(ids) {
  var total = 0;
  var list = ids || [];
  for (var i = 0; i < list.length; i++) total += itemWeight(list[i]);
  return total;
}

/**
 * 左右の重さから傾き角(deg)を求める。 右が重いと正(右下がり)。
 * NaN/undefined は 0 扱い。 ±MAX_ANGLE でクランプ。
 */
function computeTilt(leftWeight, rightWeight) {
  var l = toFiniteNumber(leftWeight);
  var r = toFiniteNumber(rightWeight);
  var deg = (r - l) * ANGLE_PER_DIFF;
  return clamp(deg, -MAX_ANGLE, MAX_ANGLE);
}

/** 釣り合っているか (角度が閾値以下)。 */
function isBalanced(leftWeight, rightWeight) {
  return Math.abs(computeTilt(leftWeight, rightWeight)) <= BALANCE_EPS_DEG;
}

// ═══ 皿状態の純関数操作 ══════════════════════════════════════════════
// state 形状: { leftIds: string[], rightIds: string[], trayIds: string[] }
// すべて新しい配列/オブジェクトを返す (入力 state は絶対に mutate しない)。

function cloneState(state) {
  return {
    leftIds: (state.leftIds || []).slice(),
    rightIds: (state.rightIds || []).slice(),
    trayIds: (state.trayIds || []).slice()
  };
}

/**
 * トレイからアイテムを右皿へ配置する。
 * 容量超過 → { ok:false, reason:'full', state:<元のまま> }
 * 配置後 |diff| >= SLIP_DIFF → { ok:false, reason:'slip', state:<元のまま> }
 * トレイに存在しない id → { ok:false, reason:'notfound', state:<元のまま> }
 * 成功 → { ok:true, state:<新state> }
 */
function placeItem(state, itemId) {
  var trayIds = (state && state.trayIds) || [];
  var trayIdx = trayIds.indexOf(itemId);
  if (trayIdx === -1) {
    return { ok: false, reason: 'notfound', state: state };
  }
  var rightIds = (state && state.rightIds) || [];
  if (rightIds.length >= PAN_CAPACITY) {
    return { ok: false, reason: 'full', state: state };
  }
  var leftWeight = sumWeights(state && state.leftIds);
  var prospectiveRight = rightIds.concat([itemId]);
  var rightWeight = sumWeights(prospectiveRight);
  var diff = rightWeight - leftWeight;
  if (Math.abs(diff) >= SLIP_DIFF) {
    return { ok: false, reason: 'slip', state: state };
  }
  var next = cloneState(state);
  next.trayIds.splice(trayIdx, 1);
  next.rightIds = prospectiveRight;
  return { ok: true, state: next };
}

/**
 * 右皿からアイテムをトレイへ戻す (タップで取り外し)。
 * panIndexOrItemId が number なら rightIds の index、string なら itemId として扱う。
 * 見つからなければ no-op (新しい state ではあるが内容は同一)。
 */
function removeItem(state, panIndexOrItemId) {
  var next = cloneState(state);
  var idx = -1;
  if (typeof panIndexOrItemId === 'number') {
    if (panIndexOrItemId >= 0 && panIndexOrItemId < next.rightIds.length) idx = panIndexOrItemId;
  } else {
    idx = next.rightIds.indexOf(panIndexOrItemId);
  }
  if (idx === -1) return next;
  var removed = next.rightIds.splice(idx, 1)[0];
  next.trayIds.push(removed);
  return next;
}

// ═══ バネ (減衰振動) シミュレーション ════════════════════════════════
// sim = { angle, vel } を破壊せず新しい { angle, vel } を返す。
function springStep(sim, targetDeg, dt) {
  var d = clamp(toFiniteNumber(dt), 0, 0.05);
  var angle = toFiniteNumber(sim && sim.angle);
  var vel = toFiniteNumber(sim && sim.vel);
  var target = toFiniteNumber(targetDeg);
  vel = vel + (target - angle) * SPRING_K * d;
  vel = vel * Math.max(0, 1 - SPRING_DAMP * d);
  angle = angle + vel * d;
  return { angle: angle, vel: vel };
}

/** バネが目標角度に十分静定したか。 */
function isSettled(sim, targetDeg) {
  var angle = toFiniteNumber(sim && sim.angle);
  var vel = toFiniteNumber(sim && sim.vel);
  var target = toFiniteNumber(targetDeg);
  return Math.abs(angle - target) < 0.4 && Math.abs(vel) < 1.5;
}

// ═══ セッション進行 ══════════════════════════════════════════════════
// session 形状: { round, finished, leftIds, rightIds, trayIds }

/** 新規セッション (ラウンド0から開始)。 */
function createSession() {
  return {
    round: 0,
    finished: false,
    leftIds: ROUNDS[0].left.slice(),
    trayIds: ROUNDS[0].tray.slice(),
    rightIds: []
  };
}

/** 現在ラウンドが釣り合っているか。 */
function isSessionBalanced(session) {
  if (!session) return false;
  return isBalanced(sumWeights(session.leftIds), sumWeights(session.rightIds));
}

/**
 * 現在ラウンドをクリアして次ラウンドへ進める (呼び出し前に isSessionBalanced
 * が true であることを呼び出し側が確認しておくこと。ここでは強制しない)。
 * 最終ラウンドだった場合は finished=true にする。
 */
function advanceRound(session) {
  if (!session) return session;
  var nextRound = session.round + 1;
  if (nextRound >= ROUNDS.length) {
    session.finished = true;
    return session;
  }
  session.round = nextRound;
  session.leftIds = ROUNDS[nextRound].left.slice();
  session.trayIds = ROUNDS[nextRound].tray.slice();
  session.rightIds = [];
  return session;
}

// ═══ ブラウザ公開 ════════════════════════════════════════════════════
var PUBLIC_API = {
  CATALOG: CATALOG,
  ROUNDS: ROUNDS,
  MAX_ANGLE: MAX_ANGLE,
  ANGLE_PER_DIFF: ANGLE_PER_DIFF,
  BALANCE_EPS_DEG: BALANCE_EPS_DEG,
  SLIP_DIFF: SLIP_DIFF,
  PAN_CAPACITY: PAN_CAPACITY,
  SPRING_K: SPRING_K,
  SPRING_DAMP: SPRING_DAMP,
  getItem: getItem,
  itemWeight: itemWeight,
  sumWeights: sumWeights,
  computeTilt: computeTilt,
  isBalanced: isBalanced,
  placeItem: placeItem,
  removeItem: removeItem,
  springStep: springStep,
  isSettled: isSettled,
  createSession: createSession,
  isSessionBalanced: isSessionBalanced,
  advanceRound: advanceRound
};

if (typeof window !== 'undefined') {
  window.GuraguraLogic = PUBLIC_API;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PUBLIC_API;
}
