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

// ═══ 乗せ物カタログ (15点) ═══════════════════════════════════════════
// img は game.js 側の ITEM_IMAGES マップで id → 画像パスに解決する。
// ここでは数値 (weight) とラベル・見た目の箱サイズ区分 (CSS表示専用) のみ持つ。
// 重さ設計方針 (2026-07-23 再設計): 実物の質量比の再現は目指さない。
// その代わり「果物/野菜(1〜3) < 動物(4〜10)」「動物内 frog<cat<dog<bear<elephant」
// という相対順序だけを一貫させ、子供が遊びながら重さの相対順序を体で覚えられる
// ようにする (詳細は tests/guragura_seesaw_regression.cjs §19 のコメント参照)。
// ふしぎブロック3点は現実の品物と比較できない別カテゴリ。見た目の大小と重さを
// あえて逆転させ、実際に皿へ置いて初めて分かる発見型の遊びに使う。
var CATALOG = [
  { id: 'cherry',    label: 'さくらんぼ',     weight: 1, sizeClass: 'l' },
  { id: 'blueberry', label: 'ブルーベリー',   weight: 1, sizeClass: 's' },
  { id: 'apple',     label: 'りんご',         weight: 2, sizeClass: 'm' },
  { id: 'lemon',     label: 'れもん',         weight: 1, sizeClass: 's' },
  { id: 'frog',      label: 'かえる',         weight: 4, sizeClass: 'm' },
  { id: 'grapes',    label: 'ぶどう',         weight: 3, sizeClass: 'l' },
  { id: 'cat',       label: 'ねこ',           weight: 5, sizeClass: 'm' },
  { id: 'carrot',    label: 'にんじん',       weight: 2, sizeClass: 'm' },
  { id: 'dog',       label: 'いぬ',           weight: 6, sizeClass: 'm' },
  { id: 'corn',      label: 'とうもろこし',   weight: 3, sizeClass: 'l' },
  { id: 'bear',      label: 'くま',           weight: 7, sizeClass: 'l' },
  { id: 'elephant',  label: 'ぞう',           weight: 10, sizeClass: 'm' },
  { id: 'star_block', label: 'ほしのブロック', weight: 7, sizeClass: 's' },
  { id: 'heart_block', label: 'はーとのブロック', weight: 7, sizeClass: 'l' },
  { id: 'mystery_stone', label: 'ふしぎな いし', weight: 7, sizeClass: 'm' }
];

var CATALOG_BY_ID = {};
for (var _ci = 0; _ci < CATALOG.length; _ci++) {
  CATALOG_BY_ID[CATALOG[_ci].id] = CATALOG[_ci];
}

// ═══ ラウンド定義 (5ラウンド固定) ════════════════════════════════════
// left: おだい (id 配列)。tray: そのラウンドでトレイに出すアイテム id 配列。
// 重さ合計は CATALOG から導出するのでハードコードしない。
// ラウンド2 (index1) の left は bear ではなく cat (2026-07-23 変更)。 単一皿は
// 「置くたびに逐次 |右-左|>=SLIP_DIFF で即拒否」される仕様のため、left=bear(重さ7)
// のままだと安全な最初の一手が dog(重さ6) しかない構造的な詰みに近い状態になる
// ことを検証済み。 cat(重さ5) なら tray 中の複数アイテムから安全に始められる。
// ラウンド1 (index0) の tray から frog/cat を除外 (2026-07-23 レビュー対応)。 新カタログ
// では動物 (frog=4,cat=5) が全て果物/野菜 (最大3) より重いため、おだい grapes(3) に
// 対して frog/cat を単体で置くと |diff|<SLIP_DIFF(6) で拒否されずに黙って乗ってしまい、
// placeItem は加算しかできない (取り除き機能を使わない限り) 前進のみでは二度と釣り合わない
// 詰み状態を作る。 これはラウンド1 のチュートリアル文言「おもすぎたら 皿が はねかえすよ」
// (自動で弾かれる、という約束) に反するため、tray 内の最大重量が target と同値の corn(3)
// になるよう carrot/corn に差し替えた (単体オーバーシュートが構造的に発生しなくなる)。
var ROUNDS = [
  { left: ['grapes'],        tray: ['cherry', 'blueberry', 'apple', 'lemon', 'carrot', 'corn'] },
  { left: ['cat'],           tray: ['apple', 'grapes', 'cherry', 'lemon', 'blueberry', 'frog'] },
  { left: ['elephant'],      tray: ['star_block', 'heart_block', 'mystery_stone', 'grapes'] },
  { left: ['dog', 'cherry'], tray: ['grapes', 'apple', 'carrot', 'lemon', 'blueberry', 'frog'] },
  { left: ['bear', 'grapes'], tray: ['corn', 'dog', 'apple', 'cat', 'carrot', 'lemon', 'cherry'] }
];

// ═══ 傾き・釣り合い・滑り落ち定数 ════════════════════════════════════
var MAX_ANGLE = 14;         // deg クランプ
var ANGLE_PER_DIFF = 3.5;   // deg / 重さ差1
var BALANCE_EPS_DEG = 1.0;  // これ以下で「つりあい」成立
// SLIP_DIFF は 5→6 に変更 (2026-07-23)。 新カタログで動物グループを果物グループより
// 確実に重くした結果、重い目標 (elephant=10, bear+grapes=10) に対して「軽いアイテムを
// 1個だけ置く」ケースで、SLIP_DIFF=5 のままだと安全な最初の一手が dog(重さ6) のみに
// 限定されることを検証済み。 6 に引き上げることで複数の自然な開始アイテムから
// 到達可能になる一方、明白な誤り (例: 空の左皿に elephant 単体) は引き続き弾かれる。
var SLIP_DIFF = 6;          // 配置後の |右-左| がこれ以上なら滑り落ち(配置拒否)
var PAN_CAPACITY = 4;       // 片皿の最大アイテム数
// 「あとちょっと！」near-balance 判定の閾値。 重さ差(=CATALOGのweight単位)1個ぶんの
// 傾き(ANGLE_PER_DIFF*1=3.5deg)は「近い」と判定し、2個ぶんの差(3.5*2=7deg)は
// 「近い」と判定しないよう、3.5 と 7 のちょうど中間の 5.0 を採用する
// (BALANCE_EPS_DEG(1.0) < NEAR_BALANCE_EPS_DEG(5.0) < ANGLE_PER_DIFF*2(7) を保証)。
var NEAR_BALANCE_EPS_DEG = 5.0;

// ═══ ふたご皿 (twin basket) ラウンド設定 ════════════════════════════
// キーは ROUNDS の 0-indexed ラウンド番号。 該当しないラウンド (0,1 = ラウンド1,2)
// は従来通り単一右皿 (rightIds/placeItem/removeItem) のまま。
// - basketCapacityEach: 1皿あたりの最大アイテム数
// - localOverloadMax:   1皿単独の重さ上限 (これを超えたらそのバスケットだけ拒否)
// - slipDiff (省略可):  このラウンドの placeItemTwin (3)全体slipチェックに使う
//                        しきい値。 省略時はグローバル SLIP_DIFF にフォールバックする。
// 数値は各ラウンドの実トレイを本番関数で全状態探索して決める。
//
// 2026-07-23 ふしぎブロック導入前のレビュー対応 (第2弾):
// グローバル SLIP_DIFF(6) だけでは重い target (10) を
// 持つラウンド3・5 で「最初の1個」を安全に置ける tray アイテムが極端に絞られ
// (ラウンド3: 4/14、ラウンド5: 2/14 の first-move combination しか成功しない) 、かつ
// ラウンド5 は dog(6) が localOverloadMax(5) を単体で超過するため一度も置けない
// 「死んだアイテム」になっていた。 対策として (a) placeItemTwin の (3)全体slip判定に
// ラウンド単位の slipDiff オーバーライドを追加、 (b) ラウンド3 に slipDiff:9 を設定して
// "普通" ティアがラウンド4 "難しい" ティアより甘くなるよう是正 (28.6%→71.4%、
// ラウンド4の66.7%を上回り tier の強弱が逆転しない)、 (c) ラウンド5 は
// localOverloadMax を 5→7 に引き上げて dog を配置可能にしつつ slipDiff:8 を設定
// (14.3%→42.9%、"難しい" ティアらしく3ラウンド中もっとも厳しいままだが即詰みは解消)。
// ラウンド4 (index3) は既に十分寛容 (66.7%) だったため変更なし。
//
// 2026-07-23 ふしぎブロック導入: ラウンド3のトレイを重さ7のブロック3点と
// ぶどう(3)へ置換。どのブロックも先に置け、ぶどうを足すと target10 になる。
// ラウンド別 slipDiff を4へ絞り、別々のかごへブロックを2点置く試みも
// |14-10|=4 の時点で即座に拒否する。同じかごなら localOverloadMax7 を超えて拒否。
// 実際の placeItemTwin 全状態探索で、受理された全中間状態が取り外しなしで
// 解へ到達でき、黙って目標を超える状態が無いことを確認している。
var TWIN_ROUND_CONFIG = {
  2: { tier: 'normal', basketCapacityEach: 3, localOverloadMax: 7, slipDiff: 4 }, // ラウンド3 (elephant)
  3: { tier: 'hard', basketCapacityEach: 2, localOverloadMax: 5 },   // ラウンド4 (dog+cherry)
  4: { tier: 'hard', basketCapacityEach: 2, localOverloadMax: 7, slipDiff: 8 }    // ラウンド5 (bear+grapes)
};

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

/**
 * 「あとちょっと！」演出用の近接判定。 角度(deg)だけを受け取る純関数
 * (weight ではなく computeTilt() 済みの deg を渡すこと)。
 * nearDeg 省略時は NEAR_BALANCE_EPS_DEG を使う。 呼び出し側は isBalanced と
 * 併用し、「近いがまだ釣り合っていない」状態 (isNearBalance && !isBalanced) を
 * 検出する想定。
 */
function isNearBalance(targetDeg, nearDeg) {
  var deg = toFiniteNumber(targetDeg);
  var threshold = nearDeg === undefined ? NEAR_BALANCE_EPS_DEG : toFiniteNumber(nearDeg);
  return Math.abs(deg) <= threshold;
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

// ═══ ふたご皿 (twin basket) 状態の純関数操作 ════════════════════════
// state 形状: { leftIds: string[], rightBasketAIds: string[], rightBasketBIds: string[], trayIds: string[] }
// 既存の placeItem/removeItem・{leftIds,rightIds,trayIds} 形状には一切影響しない
// (ラウンド1・2は従来通りそちらを使い続ける)。すべて新しい配列/オブジェクトを返す。

/** roundIndex → TWIN_ROUND_CONFIG のエントリ (該当しなければ null)。 */
function getTwinRoundConfig(roundIndex) {
  return TWIN_ROUND_CONFIG.hasOwnProperty(roundIndex) ? TWIN_ROUND_CONFIG[roundIndex] : null;
}

/** roundIndex がふたご皿ラウンドか。 */
function isTwinRound(roundIndex) {
  return TWIN_ROUND_CONFIG.hasOwnProperty(roundIndex);
}

function cloneStateTwin(state) {
  return {
    leftIds: (state.leftIds || []).slice(),
    trayIds: (state.trayIds || []).slice(),
    rightBasketAIds: (state.rightBasketAIds || []).slice(),
    rightBasketBIds: (state.rightBasketBIds || []).slice()
  };
}

/** バスケットA+B の合計重量。 */
function sumTwinRightWeight(state) {
  return sumWeights(state && state.rightBasketAIds) + sumWeights(state && state.rightBasketBIds);
}

/**
 * トレイからアイテムをふたご皿(A/B)の指定バスケットへ配置する。
 * basketId は 'A' か 'B'。
 * roundIndex は呼び出し側 (game.js) が session.round から渡す想定
 * (TWIN_ROUND_CONFIG からその皿の basketCapacityEach/localOverloadMax を引くため)。
 * 省略時は state.round を fallback として参照し、それも無ければ
 * capacityEach=PAN_CAPACITY / localOverloadMax=Infinity (無制限) にデグレードする。
 *
 * 検証順序 (変更しないこと):
 *   (1) 容量超過            → { ok:false, reason:'full',      basketId, state:<元のまま> }
 *   (2) バスケット単独の重さが localOverloadMax 超過
 *                           → { ok:false, reason:'localSlip', basketId, state:<元のまま> }
 *   (3) 両皿合計と左皿の差が (ラウンド別 slipDiff、省略時はグローバル SLIP_DIFF) 以上
 *                           → { ok:false, reason:'slip',      basketId,
 *                               weightDirection:'tooLight'|'tooHeavy', state:<元のまま> }
 * トレイに存在しない id / basketId が 'A'/'B' 以外
 *                           → { ok:false, reason:'notfound',  state:<元のまま> }
 * 成功 → { ok:true, basketId, state:<新state> }
 */
function placeItemTwin(state, itemId, basketId, roundIndex) {
  var trayIds = (state && state.trayIds) || [];
  var trayIdx = trayIds.indexOf(itemId);
  if (trayIdx === -1) {
    return { ok: false, reason: 'notfound', state: state };
  }
  if (basketId !== 'A' && basketId !== 'B') {
    return { ok: false, reason: 'notfound', state: state };
  }

  var resolvedRoundIndex = roundIndex === undefined ? (state && state.round) : roundIndex;
  var config = getTwinRoundConfig(resolvedRoundIndex);
  var capacityEach = (config && typeof config.basketCapacityEach === 'number') ? config.basketCapacityEach : PAN_CAPACITY;
  var localMax = (config && typeof config.localOverloadMax === 'number') ? config.localOverloadMax : Infinity;
  var slipDiffForRound = (config && typeof config.slipDiff === 'number') ? config.slipDiff : SLIP_DIFF;

  var basketAIds = (state && state.rightBasketAIds) || [];
  var basketBIds = (state && state.rightBasketBIds) || [];
  var targetIds = basketId === 'A' ? basketAIds : basketBIds;
  var otherIds = basketId === 'A' ? basketBIds : basketAIds;

  // (1) 容量超過
  if (targetIds.length >= capacityEach) {
    return { ok: false, reason: 'full', basketId: basketId, state: state };
  }

  var prospectiveTarget = targetIds.concat([itemId]);
  var targetWeight = sumWeights(prospectiveTarget);

  // (2) そのバスケット単独の重さが localOverloadMax 超過
  if (targetWeight > localMax) {
    return { ok: false, reason: 'localSlip', basketId: basketId, state: state };
  }

  // (3) 両皿合計と左皿の差が (ラウンド別 slipDiff、省略時はグローバル SLIP_DIFF) 以上
  var leftWeight = sumWeights(state && state.leftIds);
  var totalRightWeight = targetWeight + sumWeights(otherIds);
  var diff = totalRightWeight - leftWeight;
  if (Math.abs(diff) >= slipDiffForRound) {
    return {
      ok: false,
      reason: 'slip',
      weightDirection: diff < 0 ? 'tooLight' : 'tooHeavy',
      basketId: basketId,
      state: state
    };
  }

  var next = cloneStateTwin(state);
  next.trayIds.splice(trayIdx, 1);
  if (basketId === 'A') {
    next.rightBasketAIds = prospectiveTarget;
  } else {
    next.rightBasketBIds = prospectiveTarget;
  }
  return { ok: true, basketId: basketId, state: next };
}

/**
 * ふたご皿(A/B)の指定バスケットからアイテムをトレイへ戻す (タップで取り外し)。
 * indexOrItemId が number ならそのバスケット内 index、string なら itemId として扱う。
 * basketId が 'A'/'B' 以外、または見つからなければ no-op (新しい state だが内容は同一)。
 */
function removeItemTwin(state, basketId, indexOrItemId) {
  var next = cloneStateTwin(state);
  if (basketId !== 'A' && basketId !== 'B') return next;
  var key = basketId === 'A' ? 'rightBasketAIds' : 'rightBasketBIds';
  var idx = -1;
  if (typeof indexOrItemId === 'number') {
    if (indexOrItemId >= 0 && indexOrItemId < next[key].length) idx = indexOrItemId;
  } else {
    idx = next[key].indexOf(indexOrItemId);
  }
  if (idx === -1) return next;
  var removed = next[key].splice(idx, 1)[0];
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
// session 形状: { round, finished, leftIds, rightIds, trayIds, rightBasketAIds, rightBasketBIds }
// rightIds (単一皿・ラウンド1,2用) と rightBasketAIds/rightBasketBIds (ふたご皿・
// ラウンド3-5用) は常に両方初期化される。 どちらを使うかは game.js が
// isTwinRound(session.round) / getTwinRoundConfig(session.round) を見て判断する。

/** session に roundIndex の初期状態 (leftIds/trayIds/right*) を適用する (mutate)。 */
function applyRoundState(session, roundIndex) {
  var round = ROUNDS[roundIndex];
  session.round = roundIndex;
  session.leftIds = round.left.slice();
  session.trayIds = round.tray.slice();
  session.rightIds = [];
  session.rightBasketAIds = [];
  session.rightBasketBIds = [];
  return session;
}

/** 新規セッション (ラウンド0から開始)。 */
function createSession() {
  var session = { finished: false };
  applyRoundState(session, 0);
  return session;
}

/** 現在ラウンドが釣り合っているか (単一皿ラウンド用。 ふたご皿は isSessionBalancedTwin)。 */
function isSessionBalanced(session) {
  if (!session) return false;
  return isBalanced(sumWeights(session.leftIds), sumWeights(session.rightIds));
}

/** 現在ラウンドが釣り合っているか (ふたご皿ラウンド用。 A+B 合計で判定)。 */
function isSessionBalancedTwin(session) {
  if (!session) return false;
  return isBalanced(sumWeights(session.leftIds), sumTwinRightWeight(session));
}

/**
 * 現在ラウンドをクリアして次ラウンドへ進める (呼び出し前に isSessionBalanced/
 * isSessionBalancedTwin が true であることを呼び出し側が確認しておくこと。
 * ここでは強制しない)。 最終ラウンドだった場合は finished=true にする。
 */
function advanceRound(session) {
  if (!session) return session;
  var nextRound = session.round + 1;
  if (nextRound >= ROUNDS.length) {
    session.finished = true;
    return session;
  }
  applyRoundState(session, nextRound);
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
  NEAR_BALANCE_EPS_DEG: NEAR_BALANCE_EPS_DEG,
  TWIN_ROUND_CONFIG: TWIN_ROUND_CONFIG,
  SPRING_K: SPRING_K,
  SPRING_DAMP: SPRING_DAMP,
  getItem: getItem,
  itemWeight: itemWeight,
  sumWeights: sumWeights,
  computeTilt: computeTilt,
  isBalanced: isBalanced,
  isNearBalance: isNearBalance,
  placeItem: placeItem,
  removeItem: removeItem,
  getTwinRoundConfig: getTwinRoundConfig,
  isTwinRound: isTwinRound,
  sumTwinRightWeight: sumTwinRightWeight,
  placeItemTwin: placeItemTwin,
  removeItemTwin: removeItemTwin,
  springStep: springStep,
  isSettled: isSettled,
  createSession: createSession,
  isSessionBalanced: isSessionBalanced,
  isSessionBalancedTwin: isSessionBalancedTwin,
  advanceRound: advanceRound
};

if (typeof window !== 'undefined') {
  window.GuraguraLogic = PUBLIC_API;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PUBLIC_API;
}
