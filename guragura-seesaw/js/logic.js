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
//
// 重さ設計方針 v3 (2026-07-23 再設計、人形/大きさ=重さ統一): 「動物」は
// 「人形」という設定に変更し (絵はそのまま流用)、果物/野菜・人形 (旧: 動物) の
// 2カテゴリは「見た目が大きいほど重い」という直感的ルールに統一する
// (見た目の箱サイズ区分が s→m→l の順に weight が単調に大きくなるよう意図的に
// 設計する。 判定コード自体がその区分を動的に読むわけではなく、あくまで weight
// の値を見た目のサイズ感と "整合するように" 人力で設定しているだけ、という
// 分離は維持する)。 石(ふしぎブロック)3点だけは従来通りの特殊枠として、
// 大きさと重さをあえて不一致にする (小さくても重い/大きくても軽い、
// 置いて初めて分かる枠)。
//
// カテゴリ別ウェイト帯:
//   果物/野菜 s(2〜3) < m(6) < l(10)
//   人形       s(4)   < m(7〜8) < l(12〜14)
//   石(逆転)   l(5) < m(9) < s(11)   ※ s/m/l と weight の大小が逆順になるよう意図的に配置
var CATALOG = [
  { id: 'cherry',    label: 'さくらんぼ',     weight: 3, sizeClass: 's' },
  { id: 'blueberry', label: 'ブルーベリー',   weight: 2, sizeClass: 's' },
  { id: 'apple',     label: 'りんご',         weight: 6, sizeClass: 'm' },
  { id: 'lemon',     label: 'れもん',         weight: 3, sizeClass: 's' },
  { id: 'frog',      label: 'かえる',         weight: 4, sizeClass: 's' },
  { id: 'grapes',    label: 'ぶどう',         weight: 10, sizeClass: 'l' },
  { id: 'cat',       label: 'ねこ',           weight: 7, sizeClass: 'm' },
  { id: 'carrot',    label: 'にんじん',       weight: 6, sizeClass: 'm' },
  { id: 'dog',       label: 'いぬ',           weight: 8, sizeClass: 'm' },
  { id: 'corn',      label: 'とうもろこし',   weight: 10, sizeClass: 'l' },
  { id: 'bear',      label: 'くま',           weight: 12, sizeClass: 'l' },
  { id: 'elephant',  label: 'ぞう',           weight: 14, sizeClass: 'l' },
  { id: 'star_block', label: 'ほしのブロック', weight: 11, sizeClass: 's' },
  { id: 'heart_block', label: 'はーとのブロック', weight: 5, sizeClass: 'l' },
  { id: 'mystery_stone', label: 'ふしぎな いし', weight: 9, sizeClass: 'm' }
];

var CATALOG_BY_ID = {};
for (var _ci = 0; _ci < CATALOG.length; _ci++) {
  CATALOG_BY_ID[CATALOG[_ci].id] = CATALOG[_ci];
}

// ═══ ラウンド定義 (10ラウンド固定、2026-07-23 v3 再設計) ═══════════════
// left: おだい (id 配列、5個以上のグループ)。tray: そのラウンドでトレイに出す
// アイテム id 配列。重さ合計は CATALOG から導出するのでハードコードしない。
// 全ラウンドとも tray の合計重量が left の合計重量と厳密に一致する「最小構成」
// (デコイなし、tray の全アイテムが最終的に必ず使われる) にしてある。理由は
// tests/guragura_seesaw_regression.cjs の「全ラウンド trap-free 監査」コメント参照:
// このカタログの重さ粒度 (2,3,4,5,6,7,8,9,10,11,12,14) には端数調整用の最小単位が
// 無いため、余剰アイテム (デコイ) を混ぜると前進のみでは詰みを作りやすい。
//
// 段階的導入 (ふたご皿は今回使わない。全ラウンド単一皿 = placeItem/removeItem):
//   R1-3  果物/野菜のみ (R1 は導入緩和で4個)
//   R4-7  果物/野菜 + 人形 (R4=frog初登場, R7=bear初登場)
//   R8-10 果物/野菜 + 人形 + 石 (R8=mystery_stone, R9=star+heart, R10=elephant+石3種フィナーレ)
var ROUNDS = [
  { left: ['cherry', 'lemon', 'blueberry', 'apple'],                    tray: ['carrot', 'cherry', 'lemon', 'blueberry'] },
  { left: ['apple', 'carrot', 'cherry', 'lemon', 'blueberry'],          tray: ['corn', 'grapes'] },
  { left: ['grapes', 'blueberry', 'blueberry', 'blueberry', 'cherry'],  tray: ['corn', 'apple', 'lemon'] },
  { left: ['frog', 'apple', 'carrot', 'blueberry', 'blueberry'],        tray: ['corn', 'apple', 'blueberry', 'blueberry'] },
  { left: ['cat', 'cherry', 'lemon', 'blueberry', 'blueberry'],         tray: ['dog', 'apple', 'lemon'] },
  { left: ['dog', 'apple', 'lemon', 'blueberry', 'blueberry'],          tray: ['cat', 'carrot', 'apple', 'blueberry'] },
  { left: ['bear', 'cherry', 'lemon', 'blueberry', 'blueberry'],        tray: ['dog', 'cat', 'frog', 'lemon'] },
  { left: ['mystery_stone', 'apple', 'carrot', 'blueberry', 'blueberry'], tray: ['cat', 'dog', 'frog', 'carrot'] },
  { left: ['star_block', 'cat', 'cherry', 'blueberry', 'blueberry'],    tray: ['heart_block', 'dog', 'carrot', 'lemon', 'cherry'] },
  { left: ['elephant', 'heart_block', 'blueberry', 'blueberry', 'cherry'], tray: ['mystery_stone', 'star_block', 'lemon', 'lemon'] }
];

// ═══ 傾き・釣り合い・滑り落ち定数 ════════════════════════════════════
var MAX_ANGLE = 14;         // deg クランプ
var ANGLE_PER_DIFF = 3.5;   // deg / 重さ差1
var BALANCE_EPS_DEG = 1.0;  // これ以下で「つりあい」成立
// SLIP_DIFF / placeItem の滑り判定は 2026-07-23 v3 (5個以上グループ再設計) で
// 非対称化した: 配置後 (右-左) >= SLIP_DIFF (=右が重すぎる/overshoot) の場合だけ
// 拒否し、右が軽すぎる (undershoot、右-左が負) 場合は絶対に拒否しない。
// 理由: v3 は「5個以上のアイテムを1個ずつ積み上げて目標に合わせる」構造のため、
// 構築の途中経過では右皿が左皿よりずっと軽い (undershoot) 状態がむしろ普通に発生する。
// 旧来の対称チェック (|右-左|>=SLIP_DIFF) のままだと、目標が大きいラウンド (最大26) では
// SLIP_DIFF を26超まで引き上げないと「最初の1個」すら置けなくなり、その代償として
// 「おもすぎたら はねかえる」演出が全ラウンドで実質発火不能になる。非対称化することで
// SLIP_DIFF を8まで下げ、(a) 明らかな置きすぎ (overshoot) だけを正しく拒否しつつ
// (b) 積み上げ途中の undershoot を毎回はじかない、という両立を実現している。
// 全10ラウンドを前進のみ (removeItem不使用) で解けること・詰みが無いこと・トレイの
// 全アイテムが解に参加することは tests/guragura_seesaw_regression.cjs で全探索検証済み。
var SLIP_DIFF = 8;          // 配置後 (右-左) がこれ以上なら滑り落ち(配置拒否)。overshootのみ判定。
var PAN_CAPACITY = 8;       // 片皿の最大アイテム数 (v3 最大トレイ数5に余裕を持たせた値)
// 「あとちょっと！」near-balance 判定の閾値。 重さ差(=CATALOGのweight単位)1個ぶんの
// 傾き(ANGLE_PER_DIFF*1=3.5deg)は「近い」と判定し、2個ぶんの差(3.5*2=7deg)は
// 「近い」と判定しないよう、3.5 と 7 のちょうど中間の 5.0 を採用する
// (BALANCE_EPS_DEG(1.0) < NEAR_BALANCE_EPS_DEG(5.0) < ANGLE_PER_DIFF*2(7) を保証)。
var NEAR_BALANCE_EPS_DEG = 5.0;

// ═══ ふたご皿 (twin basket) ラウンド設定 [休眠中 / DORMANT] ═════════
// 2026-07-23 v3 再設計でふたご皿メカニクスは今回どのラウンドからも使わない
// ことになった (全10ラウンドが単一皿 = rightIds/placeItem/removeItem)。
// TWIN_ROUND_CONFIG を空オブジェクトにすることで isTwinRound()/getTwinRoundConfig()
// は全ラウンドで false/null を返すようになり、game.js 側の isTwinRoundNow() も
// 常に false になるため #panRightTwin 関連の描画分岐・endDragTwin・
// placeItemTwin/removeItemTwin 呼び出しは実行時に到達しなくなる (=動いていない
// コードパス)。 isTwinRound/getTwinRoundConfig 自体は game.js の isTwinRoundNow()
// から無条件 (ラウンド分岐の外) に呼ばれているため関数としては残す必要がある
// (削除すると game.js 側で TypeError になる)。 placeItemTwin/removeItemTwin/
// sumTwinRightWeight/isSessionBalancedTwin は isTwinRoundNow()===true の分岐内
// でのみ呼ばれているため理論上は削除しても game.js は壊れないが、将来ふたご皿を
// 再導入する可能性に備え、実装ロジックごと休眠させて残す判断とした
// (このファイルの担当スコープは logic.js + 回帰テストのみで game.js 側は
// 触らない前提のため、変更を最小化する狙いもある)。
// キーは ROUNDS の 0-indexed ラウンド番号。 現状どのキーも登録しない。
var TWIN_ROUND_CONFIG = {};

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
 * 配置後 (右-左) >= SLIP_DIFF (右が重すぎる/overshoot) → { ok:false, reason:'slip', state:<元のまま> }
 *   (右が軽すぎる/undershoot は拒否しない。 2026-07-23 v3 で非対称化。 上の SLIP_DIFF
 *   コメント参照。 5個以上を積み上げる構造上、構築途中の undershoot は正常な状態)
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
  if (diff >= SLIP_DIFF) {
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

// ═══ ふたご皿 (twin basket) 状態の純関数操作 [休眠中 / DORMANT] ═══════
// state 形状: { leftIds: string[], rightBasketAIds: string[], rightBasketBIds: string[], trayIds: string[] }
// 既存の placeItem/removeItem・{leftIds,rightIds,trayIds} 形状には一切影響しない。
// 2026-07-23 v3 では TWIN_ROUND_CONFIG={} のためどのラウンドからも呼ばれないが、
// 上の TWIN_ROUND_CONFIG コメント参照のとおり将来の再導入に備えて残してある。
// すべて新しい配列/オブジェクトを返す。

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
// rightIds (単一皿・全10ラウンド共通) と rightBasketAIds/rightBasketBIds (ふたご皿・
// 2026-07-23 v3 では休眠中、TWIN_ROUND_CONFIG={} のため常に空のまま) は常に
// 両方初期化される。 どちらを使うかは game.js が isTwinRound(session.round) /
// getTwinRoundConfig(session.round) を見て判断するが、今回は常に単一皿経路になる。

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
