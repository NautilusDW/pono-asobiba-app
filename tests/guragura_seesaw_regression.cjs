#!/usr/bin/env node
"use strict";

// ぐらぐらシーソーひろば 新規実装の回帰テスト。
// NOTE: このタスクのスコープは guragura-seesaw/ ディレクトリ (+本テストファイル) のみ。
// play.html / sw.js への統合は別担当が行う (hyokkori-hightouch と同様のパターン)。
// §15 (play.html 統合検証) は donguri-wakekko の APP_TITLE_MENU_IDS 登録漏れ再発防止
// テストとして事前に用意しておき、統合が未実施の間は skip される。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const logicPath = path.join(root, "guragura-seesaw/js/logic.js");
const L = require(logicPath);

const logicJsSrc = read("guragura-seesaw/js/logic.js");
const gameJs = read("guragura-seesaw/js/game.js");
const indexHtml = read("guragura-seesaw/index.html");
const stylesCss = read("guragura-seesaw/styles.css");

let passCount = 0;
function section(name, fn) {
  fn();
  passCount++;
  console.log(`  [OK] ${name}`);
}

// ── size ランク (テスト専用ヘルパー。logic.js は sizeClass を判定に使わない) ──
const SIZE_RANK = { s: 0, m: 1, l: 2 };
function sizeRank(id) {
  const item = L.getItem(id);
  return item ? SIZE_RANK[item.sizeClass] : -1;
}

// ── 前進のみの全状態探索 ──────────────────────────────────────────
// 単一皿は placeItem、ふたご皿は placeItemTwin を直接呼ぶ。テスト側に重さ判定を
// 再実装せず、本番ロジックと同じ検証順序・しきい値で全受理状態を列挙する。
function createRoundState(roundIndex) {
  const round = L.ROUNDS[roundIndex];
  if (L.isTwinRound(roundIndex)) {
    return {
      leftIds: round.left.slice(),
      rightBasketAIds: [],
      rightBasketBIds: [],
      trayIds: round.tray.slice()
    };
  }
  return { leftIds: round.left.slice(), rightIds: [], trayIds: round.tray.slice() };
}

function isRoundStateBalanced(roundIndex, state) {
  if (L.isTwinRound(roundIndex)) {
    return L.isBalanced(L.sumWeights(state.leftIds), L.sumTwinRightWeight(state));
  }
  return L.isBalanced(L.sumWeights(state.leftIds), L.sumWeights(state.rightIds));
}

function roundStateKey(roundIndex, state) {
  if (L.isTwinRound(roundIndex)) {
    return [
      state.rightBasketAIds.join(","),
      state.rightBasketBIds.join(","),
      state.trayIds.join(",")
    ].join("|");
  }
  return [state.rightIds.join(","), state.trayIds.join(",")].join("|");
}

function acceptedNextStates(roundIndex, state) {
  const next = [];
  for (const itemId of state.trayIds.slice()) {
    if (L.isTwinRound(roundIndex)) {
      for (const basketId of ["A", "B"]) {
        const res = L.placeItemTwin(state, itemId, basketId, roundIndex);
        if (res.ok) next.push({ itemId, basketId, state: res.state });
      }
    } else {
      const res = L.placeItem(state, itemId);
      if (res.ok) next.push({ itemId, basketId: null, state: res.state });
    }
  }
  return next;
}

function analyzeRoundForward(roundIndex) {
  const memo = new Map();
  const solutions = [];

  function visit(state) {
    const key = roundStateKey(roundIndex, state);
    if (memo.has(key)) return memo.get(key).canReachBalance;

    if (isRoundStateBalanced(roundIndex, state)) {
      const entry = { state, canReachBalance: true, balanced: true };
      memo.set(key, entry);
      solutions.push(state);
      return true;
    }

    // 配置するたび tray が1点減るため循環は無い。本番関数が受理した遷移だけを辿る。
    const children = acceptedNextStates(roundIndex, state);
    let canReachBalance = false;
    for (const child of children) {
      if (visit(child.state)) canReachBalance = true;
    }
    memo.set(key, { state, canReachBalance, balanced: false });
    return canReachBalance;
  }

  const initialState = createRoundState(roundIndex);
  visit(initialState);
  const entries = [...memo.values()];
  return {
    initialState,
    solutions,
    reachableStates: entries,
    deadStates: entries.filter(entry => !entry.balanced && !entry.canReachBalance),
    solutionItemIds: new Set(
      solutions.flatMap(state => L.isTwinRound(roundIndex)
        ? state.rightBasketAIds.concat(state.rightBasketBIds)
        : state.rightIds)
    )
  };
}

// ── §17b 用: slip / near-balance 到達可能性の正準(canonical) BFS ─────────
// analyzeRoundForward() はアイテムを置いた「順序」ごとに別状態として数える
// (permutation単位、§6/§8 が意図的にそれを利用している) が、slip/near-balance
// が「到達可能かどうか」という問いには順序の重複は不要でノイズになるだけなので、
// ここでは rightIds/trayIds をソートしたキーで正準化 (順序違いの重複を圧縮) して
// 探索する。単一皿ラウンド専用 (v3.1 では全10ラウンドが単一皿なのでこれで十分)。
// 本番の L.placeItem をそのまま呼び、reason==='slip' を1回でも観測できたら
// slipReachable=true、rightIds が空でない非balanced状態で L.isNearBalance が
// true を返したら nearBalanceReachable=true とする。
function canonicalKey(state) {
  return state.rightIds.slice().sort().join(',') + '|' + state.trayIds.slice().sort().join(',');
}

function analyzeReachabilityCanonical(roundIndex) {
  const round = L.ROUNDS[roundIndex];
  const leftWeight = L.sumWeights(round.left);
  const start = createRoundState(roundIndex);
  const seen = new Set([canonicalKey(start)]);
  const queue = [start];
  let solvable = false;
  let slipReachable = false;
  let nearBalanceReachable = false;

  while (queue.length > 0) {
    const state = queue.shift();
    const rightWeight = L.sumWeights(state.rightIds);
    const balanced = L.isBalanced(leftWeight, rightWeight);
    if (balanced) { solvable = true; continue; } // 実ゲームは釣り合った瞬間にラウンドが終わり、それ以上は置けない

    const tilt = L.computeTilt(leftWeight, rightWeight);
    if (state.rightIds.length > 0 && L.isNearBalance(tilt)) nearBalanceReachable = true;

    for (const itemId of new Set(state.trayIds)) {
      const res = L.placeItem(state, itemId);
      if (!res.ok) {
        if (res.reason === 'slip') slipReachable = true;
        continue;
      }
      const key = canonicalKey(res.state);
      if (!seen.has(key)) {
        seen.add(key);
        queue.push(res.state);
      }
    }
  }
  return { solvable, slipReachable, nearBalanceReachable };
}

// ── brace-balanced 関数抽出 (nazonazo_number_jump_regression.cjs の extractFunction 踏襲) ──
function extractFunction(src, name) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name}: function missing`);
  const bodyStart = src.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < src.length; index += 1) {
    const char = src[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(start, index + 1);
    }
  }
  assert.fail(`${name}: unterminated function`);
}

console.log("── guragura-seesaw 回帰テスト ──");

// ── 1. カタログ健全性 ─────────────────────────────────────────────
section("カタログ健全性", () => {
  assert.ok(Array.isArray(L.CATALOG), "CATALOG は配列");
  assert.equal(L.CATALOG.length, 15, "既存12点 + ふしぎブロック3点");
  const ids = new Set();
  for (const item of L.CATALOG) {
    assert.ok(Number.isInteger(item.weight) && item.weight > 0, `${item.id} の weight は正整数`);
    assert.ok(!ids.has(item.id), `${item.id} の id が重複していない`);
    ids.add(item.id);
    assert.doesNotMatch(item.label, /[0-9０-９]/, `${item.id} の label に算用数字を含まない`);
  }

  // game.js の ITEM_IMAGES から抽出した全パスが実在すること
  const imgMapMatch = gameJs.match(/ITEM_IMAGES\s*=\s*\{([\s\S]*?)\n\s*\};/);
  assert.ok(imgMapMatch, "game.js に ITEM_IMAGES マップが見つかる");
  const imageById = {};
  const pathRe = /^\s*([a-z0-9_]+):\s*['"]([^'"]+\.(?:png|webp))['"]/gm;
  let m;
  while ((m = pathRe.exec(imgMapMatch[1]))) imageById[m[1]] = m[2];
  assert.equal(Object.keys(imageById).length, L.CATALOG.length, "ITEM_IMAGES は全カタログIDを1対1で持つ");
  for (const item of L.CATALOG) {
    const p = imageById[item.id];
    assert.ok(p, `ITEM_IMAGES に ${item.id} の対応パスがある`);
    const resolved = path.join(root, "guragura-seesaw", p);
    assert.ok(fs.existsSync(resolved), `画像が実在する: ${p}`);
  }

  const mysteryItems = ["star_block", "heart_block", "mystery_stone"].map(id => L.getItem(id));
  assert.deepEqual(mysteryItems, [
    { id: "star_block", label: "ほしのブロック", weight: 11, sizeClass: "s" },
    { id: "heart_block", label: "はーとのブロック", weight: 5, sizeClass: "l" },
    // mystery_stone は 2026-07-23 二度目のクロスレビュー指摘対応で weight9→13 に変更
    // (旧9は通常の m 帯6〜8からわずか+1しか離れておらず意外性が弱かったため)。
    { id: "mystery_stone", label: "ふしぎな いし", weight: 13, sizeClass: "m" }
  ], "ふしぎブロック3点のID/かなラベル/重さ/見た目サイズが固定されている (石は大きさと重さ不一致の特殊枠のまま)");

  // v3 (2026-07-23 人形/大きさ=重さ統一) の期待値。 果物/野菜・人形 (旧:動物) は
  // sizeClass s<m<l の順に weight が単調に大きくなるよう意図的に設定されている。
  const expectedWeights = {
    cherry: 3, blueberry: 2, apple: 6, lemon: 3, frog: 4, grapes: 10,
    cat: 7, carrot: 6, dog: 8, corn: 10, bear: 12, elephant: 14
  };
  for (const [id, weight] of Object.entries(expectedWeights)) {
    assert.equal(L.itemWeight(id), weight, `果物/野菜・人形カテゴリ ${id} の v3 (大きさ=重さ) 重量が固定されている`);
  }

  for (const item of mysteryItems) {
    const assetPath = path.join(root, "guragura-seesaw", imageById[item.id]);
    const png = fs.readFileSync(assetPath);
    assert.equal(png.toString("ascii", 1, 4), "PNG", `${item.id} はPNG`);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    assert.equal(width, 640, `${item.id} の実測幅は640px`);
    assert.equal(height, 640, `${item.id} の実測高は640px (AR 1:1)`);
    assert.equal(png[25], 6, `${item.id} はRGBA PNG`);
    assert.ok(png.length < 3 * 1024 * 1024, `${item.id} は3MiB未満`);
  }
});

// ── 2. 重さ×見た目サイズ独立性 (本ゲーム最重要、v3 で部分的に方針転換) ─────
// v3 (2026-07-23): 果物/野菜・人形 (旧:動物) は「見た目が大きいほど重い」に統一し、
// 石(ふしぎブロック)3点だけが従来通り「見た目と重さが一致しない」特殊枠になった。
const FRUIT_VEG_IDS = ["cherry", "blueberry", "apple", "lemon", "carrot", "grapes", "corn"];
const DOLL_IDS = ["frog", "cat", "dog", "bear", "elephant"];
const STONE_IDS = ["star_block", "heart_block", "mystery_stone"];

section("重さ×見た目サイズ独立性 (v3: 石だけが例外)", () => {
  // 石(ふしぎブロック)3点の中には weightA > weightB && sizeRank(A) < sizeRank(B)
  // (重いのに見た目が小さい) のペアが存在する (mystery_stone(13,m) vs heart_block(5,l) 等)
  let stoneFoundInverse = false;
  for (const aId of STONE_IDS) {
    for (const bId of STONE_IDS) {
      if (aId === bId) continue;
      const a = L.getItem(aId), b = L.getItem(bId);
      if (a.weight > b.weight && sizeRank(aId) < sizeRank(bId)) stoneFoundInverse = true;
    }
  }
  assert.ok(stoneFoundInverse, "石3点の中に「重いのに見た目が小さい」ペアが存在する (置いて初めて分かる特殊枠)");

  // 石3点は sizeClass と重さの大小関係が対応しない (2026-07-23 二度目のクロス
  // レビュー指摘対応で mystery_stone を weight9→13 に引き上げたため、旧来の
  // 「s>m>l の完全な逆転」から mystery_stone(m,13) > star_block(s,11) >
  // heart_block(l,5) という関係に変わった。 依然として sizeClass の順序
  // (s<m<l) とは無関係な大小関係であることは維持されている)
  assert.ok(
    L.itemWeight("mystery_stone") > L.itemWeight("star_block") &&
    L.itemWeight("star_block") > L.itemWeight("heart_block"),
    "石3点は mystery_stone(m) が最重量、heart_block(l) が最軽量になっている (見た目サイズ順とは無関係)"
  );

  // カタログ全体で見ても「重いのに見た目が小さい」ペアが存在する (石カテゴリ由来)
  let foundInverse = false;
  for (const a of L.CATALOG) {
    for (const b of L.CATALOG) {
      if (a.weight > b.weight && sizeRank(a.id) < sizeRank(b.id)) foundInverse = true;
    }
  }
  assert.ok(foundInverse, "カタログ全体でも重いのに見た目が小さいペアが存在する (石カテゴリ由来)");

  // 果物/野菜・人形カテゴリは v3 の新ルールどおり「見た目が大きいほど重い (以上)」に
  // 統一されている: 同カテゴリ内で sizeRank(a) < sizeRank(b) なら weight(a) <= weight(b)
  for (const [categoryName, ids] of [["果物/野菜", FRUIT_VEG_IDS], ["人形", DOLL_IDS]]) {
    for (const aId of ids) {
      for (const bId of ids) {
        if (aId === bId) continue;
        const a = L.getItem(aId), b = L.getItem(bId);
        if (sizeRank(aId) < sizeRank(bId)) {
          assert.ok(a.weight <= b.weight, `${categoryName}: ${aId}(見た目小) は ${bId}(見た目大) 以下の重さのはず (${a.weight} <= ${b.weight})`);
        }
      }
    }
  }

  // computeTilt は sizeClass を書き換えても結果が変わらない (weight のみ参照)
  const clonedCatalog = L.CATALOG.map(item => Object.assign({}, item, { sizeClass: item.sizeClass === "l" ? "s" : "l" }));
  for (const round of L.ROUNDS) {
    const leftW1 = L.sumWeights(round.left);
    const rightW1 = L.sumWeights(round.tray.slice(0, 2));
    const tilt1 = L.computeTilt(leftW1, rightW1);
    // クローンカタログ側から重さを再計算 (sizeClass を変えても weight 由来の値は同一のはず)
    const byId = {};
    for (const c of clonedCatalog) byId[c.id] = c;
    const leftW2 = round.left.reduce((s, id) => s + (byId[id] ? byId[id].weight : 0), 0);
    const rightW2 = round.tray.slice(0, 2).reduce((s, id) => s + (byId[id] ? byId[id].weight : 0), 0);
    const tilt2 = L.computeTilt(leftW2, rightW2);
    assert.equal(tilt1, tilt2, "sizeClass 書き換えクローンでも傾き結果は完全一致する");
  }

  // logic.js のソース内で、定義行 (CATALOG リテラル) 以外に sizeClass を読む判定コードが無いこと
  const withoutCatalogDef = logicJsSrc.replace(/var CATALOG = \[[\s\S]*?\];/, "");
  assert.doesNotMatch(withoutCatalogDef, /sizeClass/, "logic.js は CATALOG 定義以外で sizeClass を参照していない");
});

// ── 3. computeTilt ────────────────────────────────────────────────
section("computeTilt", () => {
  assert.equal(L.computeTilt(5, 5), 0, "同重量は傾き0");
  assert.ok(L.computeTilt(0, 1) > L.computeTilt(0, 0), "diff に対して単調");
  assert.ok(L.computeTilt(0, 2) > L.computeTilt(0, 1), "diff に対して単調 (2)");
  assert.equal(L.computeTilt(0, 100), L.MAX_ANGLE, "diff=+100 でも +MAX_ANGLE にクランプ");
  assert.equal(L.computeTilt(100, 0), -L.MAX_ANGLE, "diff=-100 でも -MAX_ANGLE にクランプ");
  for (let a = 0; a <= 10; a++) {
    for (let b = 0; b <= 10; b++) {
      // -0 === 0 だが Object.is(-0,0) は false になるため、数値としての等価性を確認する
      assert.ok(L.computeTilt(a, b) === -L.computeTilt(b, a), `対称性 computeTilt(${a},${b}) === -computeTilt(${b},${a})`);
    }
  }
  assert.ok(Number.isFinite(L.computeTilt(NaN, 5)), "NaN 入力でも有限値");
  assert.ok(Number.isFinite(L.computeTilt(5, undefined)), "undefined 入力でも有限値");
  assert.equal(L.computeTilt(NaN, NaN), 0, "NaN,NaN は 0 扱い");
  assert.ok(Number.isFinite(L.computeTilt(-5, 5)), "負値入力でも有限値");
});

// ── 4. isBalanced 閾値 ──────────────────────────────────────────
section("isBalanced 閾値", () => {
  assert.equal(L.isBalanced(5, 5), true, "diff 0 は釣り合い");
  assert.equal(L.isBalanced(5, 6), false, "diff 1 (=3.5deg) は釣り合わない");
  assert.ok(L.BALANCE_EPS_DEG < L.ANGLE_PER_DIFF, "BALANCE_EPS_DEG < ANGLE_PER_DIFF (整数weightでの誤判定防止)");
});

// ── 4b. isNearBalance 閾値 (「あとちょっと！」演出用) ────────────
section("isNearBalance 閾値", () => {
  assert.equal(L.isNearBalance(0), true, "角度0 (=釣り合い) も near 判定に含まれる (呼び出し側で isBalanced と併用して除外する設計)");
  assert.equal(L.isNearBalance(L.ANGLE_PER_DIFF), true, "重さ差1個ぶん (3.5deg) は near と判定する");
  assert.equal(L.isNearBalance(-L.ANGLE_PER_DIFF), true, "対称性: 負の角度でも near 判定は絶対値で行う");
  assert.equal(L.isNearBalance(L.ANGLE_PER_DIFF * 2), false, "重さ差2個ぶん (7deg) は near と判定しない");
  assert.ok(L.NEAR_BALANCE_EPS_DEG > L.BALANCE_EPS_DEG, "NEAR_BALANCE_EPS_DEG は BALANCE_EPS_DEG より広い (isBalanced のスーパーセット)");
  assert.ok(L.NEAR_BALANCE_EPS_DEG < L.ANGLE_PER_DIFF * 2, "NEAR_BALANCE_EPS_DEG は重さ差2個ぶんの角度未満 (誤検出防止)");
  assert.equal(L.isNearBalance(10, 5), false, "第2引数 nearDeg で閾値を明示上書きできる (10 > 5)");
  assert.equal(L.isNearBalance(3, 5), true, "第2引数 nearDeg で閾値を明示上書きできる (3 <= 5)");
  assert.ok(Number.isFinite(L.NEAR_BALANCE_EPS_DEG) && L.isNearBalance(NaN) === true, "NaN 入力は 0 扱いで near 判定される (他の純関数と同じ NaN 耐性)");
});

// ── 5. placeItem / removeItem 不変条件 ─────────────────────────
section("placeItem / removeItem 不変条件", () => {
  // 容量超過 -> full、元 state 非破壊 (PAN_CAPACITY=8)
  {
    assert.equal(L.PAN_CAPACITY, 8, "PAN_CAPACITY は v3 で8 (最大トレイ5個に余裕を持たせた値)");
    const state = { leftIds: ["elephant"], rightIds: new Array(L.PAN_CAPACITY).fill("cherry"), trayIds: ["blueberry"] };
    const before = JSON.parse(JSON.stringify(state));
    const res = L.placeItem(state, "blueberry");
    assert.equal(res.ok, false);
    assert.equal(res.reason, "full");
    assert.deepEqual(state, before, "容量超過時、元 state は非破壊");
  }

  // 配置後 (右-左) >= SLIP_DIFF (overshoot) -> slip、元 state 非破壊
  {
    assert.equal(L.SLIP_DIFF, 8, "SLIP_DIFF は v3 で8 (非対称: overshootのみ判定)");
    const state = { leftIds: [], rightIds: [], trayIds: ["elephant"] };
    const before = JSON.parse(JSON.stringify(state));
    const res = L.placeItem(state, "elephant"); // left=0, right=14, diff=14 >= SLIP_DIFF(8)
    assert.equal(res.ok, false);
    assert.equal(res.reason, "slip");
    assert.deepEqual(state, before, "slip (overshoot) 時、元 state は非破壊");
  }

  // 配置後 (右-左) が負 (undershoot) はどれだけ軽くても拒否されない
  // (v3 の非対称 SLIP_DIFF 化の核心。 5個以上を1個ずつ積み上げる構造上、
  // 構築途中は右皿が左皿よりずっと軽い状態が正常に発生するため)
  {
    const state = { leftIds: ["elephant"], rightIds: [], trayIds: ["blueberry"] };
    const res = L.placeItem(state, "blueberry"); // left=14, right=2, diff=-12 (undershoot)
    assert.equal(res.ok, true, "大きな undershoot でも拒否されない (非対称 SLIP_DIFF)");
    assert.deepEqual(res.state.rightIds, ["blueberry"], "undershoot でも配置は成功する");
  }

  // 存在しない id は no-op
  {
    const state = { leftIds: [], rightIds: [], trayIds: ["cherry"] };
    const before = JSON.parse(JSON.stringify(state));
    const res = L.placeItem(state, "nonexistent-item");
    assert.equal(res.ok, false);
    assert.equal(res.reason, "notfound");
    assert.deepEqual(state, before, "存在しない id は元 state 非破壊のまま no-op");
    const removed = L.removeItem(state, "nonexistent-item");
    assert.deepEqual(removed, before, "removeItem も存在しない id は no-op");
  }

  // 成功配置 -> 取り外しで tray+pan の総アイテム数・総重量が保存される
  {
    let state = { leftIds: ["apple"], rightIds: [], trayIds: ["cherry", "lemon", "frog"] };
    const totalBefore = state.rightIds.length + state.trayIds.length;
    const weightBefore = L.sumWeights(state.rightIds) + L.sumWeights(state.trayIds);
    const placed = L.placeItem(state, "lemon");
    assert.equal(placed.ok, true, "容量内・slip未満の配置は成功する");
    state = placed.state;
    assert.equal(state.rightIds.length + state.trayIds.length, totalBefore, "配置後も総アイテム数は保存");
    assert.equal(L.sumWeights(state.rightIds) + L.sumWeights(state.trayIds), weightBefore, "配置後も総重量は保存");

    state = L.removeItem(state, "lemon");
    assert.equal(state.rightIds.length + state.trayIds.length, totalBefore, "取り外し後も総アイテム数は保存");
    assert.equal(L.sumWeights(state.rightIds) + L.sumWeights(state.trayIds), weightBefore, "取り外し後も総重量は保存");
    assert.ok(state.trayIds.indexOf("lemon") !== -1, "取り外したアイテムはトレイに戻る");
  }

  // removeItem は index 指定でも動作する
  {
    let state = { leftIds: [], rightIds: ["cherry", "apple"], trayIds: [] };
    state = L.removeItem(state, 0);
    assert.deepEqual(state.rightIds, ["apple"], "index指定removeで該当индексが取り除かれる");
    assert.deepEqual(state.trayIds, ["cherry"], "取り除かれたアイテムはトレイへ");
  }
});

// ── 6. 全ラウンド実ロジック解 (到達可能性まで検証) ───────────────
section("全ラウンド実ロジック解", () => {
  L.ROUNDS.forEach((_round, i) => {
    const analysis = analyzeRoundForward(i);
    assert.ok(analysis.solutions.length >= 2, `ラウンド${i + 1} には本番配置関数で到達可能な解状態が2通り以上ある (got ${analysis.solutions.length})`);
  });
});

// ── 7. バネ静定 ────────────────────────────────────────────────
section("バネ静定", () => {
  let sim = { angle: 0, vel: 0 };
  const target = 10.5;
  const dt = 1 / 60;
  let settledAt = -1;
  let overshot = false;
  let maxAngle = 0;
  for (let step = 0; step < Math.ceil(3 / dt); step++) {
    sim = L.springStep(sim, target, dt);
    if (sim.angle > maxAngle) maxAngle = sim.angle;
    if (settledAt === -1 && L.isSettled(sim, target)) settledAt = step * dt;
  }
  assert.ok(settledAt !== -1 && settledAt <= 3, `3秒以内に静定する (got ${settledAt})`);
  assert.ok(Math.abs(sim.angle - target) < 0.4, "静定後の角度誤差 < 0.4deg");
  assert.ok(maxAngle > target, "アンダーダンプで一度は overshoot する (ぐらぐら感の保証)");

  // dt=0 (タブ復帰) や dt=1 (巨大値) でも NaN にならない
  const zeroStep = L.springStep({ angle: 5, vel: 2 }, 10, 0);
  assert.ok(Number.isFinite(zeroStep.angle) && Number.isFinite(zeroStep.vel), "dt=0 でも NaN にならない");
  const hugeStep = L.springStep({ angle: 5, vel: 2 }, 10, 1);
  assert.ok(Number.isFinite(hugeStep.angle) && Number.isFinite(hugeStep.vel), "dt=1 (巨大値) でも NaN にならない");
});

// ── 8. セッション進行 ───────────────────────────────────────────
section("セッション進行", () => {
  assert.equal(L.ROUNDS.length, 10, "ROUNDS は v3 で10個固定");
  let session = L.createSession();
  assert.equal(session.round, 0, "初期 round は 0");
  assert.equal(session.finished, false);

  for (let r = 0; r < L.ROUNDS.length; r++) {
    assert.equal(session.round, r, `round は ${r}`);
    assert.equal(L.isTwinRound(r), false, `ラウンド${r + 1} は v3 で全ラウンド単一皿 (ふたご皿は休眠中)`);
    const analysis = analyzeRoundForward(r);
    assert.ok(analysis.solutions.length > 0, `ラウンド${r + 1} に実ロジックで解が存在する`);
    const placedState = analysis.solutions[0];
    session.leftIds = placedState.leftIds;
    session.trayIds = placedState.trayIds;
    session.rightIds = placedState.rightIds;
    assert.equal(L.isSessionBalanced(session), true, `ラウンド${r + 1} は単一皿の実セマンティクスで釣り合っている`);
    session = L.advanceRound(session);
  }
  assert.equal(session.finished, true, "10ラウンド全部釣り合ったら finished");
});

// ── 9. .show 方式の静的検証 ─────────────────────────────────────
section(".show 方式の静的検証 (index.html)", () => {
  for (const id of ["titleScreen", "playScreen", "resultScreen"]) {
    const re = new RegExp(`<section id="${id}"[^>]*hidden`);
    assert.doesNotMatch(indexHtml, re, `${id} に hidden 属性がない`);
  }
  assert.match(indexHtml, /<section id="titleScreen" class="screen show">/, "titleScreen のみ初期 class=\"screen show\"");
  assert.doesNotMatch(indexHtml, /<section id="playScreen"[^>]*class="[^"]*\bshow\b/, "playScreen は初期 show を持たない");
  assert.doesNotMatch(indexHtml, /<section id="resultScreen"[^>]*class="[^"]*\bshow\b/, "resultScreen は初期 show を持たない");
});

section(".show 方式の静的検証 (styles.css)", () => {
  assert.match(stylesCss, /\.screen\s*\{[^}]*display:\s*none/, "styles.css に .screen{display:none} がある");

  // コメントを取り除いてから検証する (コメント内の説明用サンプルコードを誤検出しないため)
  const cssNoComments = stylesCss.replace(/\/\*[\s\S]*?\*\//g, "");

  // #titleScreen / #playScreen / #resultScreen への「.show を含まない」無条件 display 宣言が無いこと
  for (const id of ["titleScreen", "playScreen", "resultScreen"]) {
    const ruleRe = new RegExp(`(^|[^.\\w])#${id}\\s*\\{[^}]*\\}`, "g");
    let match;
    while ((match = ruleRe.exec(cssNoComments))) {
      assert.doesNotMatch(match[0], /display\s*:/, `#${id} 単独セレクタ (.show無し) に無条件 display 宣言が無い: ${match[0]}`);
    }
  }
});

section(".show 方式の静的検証 (game.js は hidden 属性 API を使わない)", () => {
  assert.doesNotMatch(gameJs, /\.hidden\s*=/, "game.js は .hidden = を使わない");
  assert.doesNotMatch(gameJs, /setAttribute\(\s*['"]hidden['"]/, "game.js は setAttribute('hidden' を使わない");
});

// ── 10. showScreen の実挙動 (最小 DOM モック) ────────────────────
section("showScreen の実挙動", () => {
  const showScreenSrc = extractFunction(gameJs, "showScreen");
  const idsMatch = gameJs.match(/SCREEN_IDS\s*=\s*\[([^\]]*)\]/);
  assert.ok(idsMatch, "game.js に SCREEN_IDS 配列が定義されている");

  function makeMock(id) {
    const classes = new Set();
    return {
      id,
      classList: {
        toggle(cls, force) {
          if (force) classes.add(cls); else classes.delete(cls);
        },
        contains(cls) { return classes.has(cls); }
      }
    };
  }
  const els = {
    titleScreen: makeMock("titleScreen"),
    playScreen: makeMock("playScreen"),
    resultScreen: makeMock("resultScreen")
  };
  const context = {
    document: { getElementById: id => els[id] || null },
    console
  };
  vm.createContext(context);
  vm.runInContext(`
    var SCREEN_IDS = [${idsMatch[1]}];
    ${showScreenSrc}
    this.__showScreen = showScreen;
  `, context, { filename: "guragura-seesaw-showscreen.js" });

  context.__showScreen("playScreen");
  assert.equal(els.titleScreen.classList.contains("show"), false, "playScreen 表示時 titleScreen は show を失う");
  assert.equal(els.playScreen.classList.contains("show"), true, "playScreen 表示時 playScreen は show を持つ");
  assert.equal(els.resultScreen.classList.contains("show"), false, "playScreen 表示時 resultScreen は show を持たない");

  context.__showScreen("resultScreen");
  assert.equal(els.playScreen.classList.contains("show"), false, "resultScreen 表示時 playScreen は show を失う");
  assert.equal(els.resultScreen.classList.contains("show"), true, "resultScreen 表示時 resultScreen は show を持つ");
});

// ── 11. AR (画像縦横比) 違反禁止 ─────────────────────────────────
section("AR 違反禁止", () => {
  for (const [name, src] of [["styles.css", stylesCss], ["index.html", indexHtml], ["game.js", gameJs]]) {
    assert.doesNotMatch(src, /background-size:\s*100%\s+100%/, `${name} に background-size:100% 100% (stretch) が無い`);
    assert.doesNotMatch(src, /object-fit:\s*fill/, `${name} に object-fit:fill (stretch) が無い`);
  }
  assert.match(stylesCss, /object-fit:\s*contain/, "styles.css がアイテム画像に object-fit:contain を使っている");
});

// ── 12. Haptics whitelist ────────────────────────────────────────
section("Haptics whitelist", () => {
  const hapticsJs = read("common/haptics.js");
  const allowed = ["stickerPaste", "gachaTurn3", "superBadgePop", "nearBalance"];
  const calls = [...gameJs.matchAll(/Haptics\.fire\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  assert.ok(calls.length > 0, "game.js は Haptics.fire を呼んでいる");
  for (const pattern of calls) {
    assert.ok(allowed.includes(pattern), `Haptics.fire('${pattern}') は許可された3種のみ`);
    assert.match(hapticsJs, new RegExp(`\\b${pattern}\\s*:`), `${pattern} は common/haptics.js に実在する`);
  }
});

// ── 13. 禁止 API ─────────────────────────────────────────────────
section("禁止 API", () => {
  assert.doesNotMatch(gameJs, /highscore/i, "game.js は highscore を参照しない");
  assert.doesNotMatch(gameJs, /_startTreasure/, "game.js は _startTreasure を参照しない");
  const treasureCalls = [...gameJs.matchAll(/showTreasure\(/g)];
  if (treasureCalls.length > 0) {
    assert.match(gameJs, /showTreasure\(\s*\{/, "showTreasure は showTreasure({ 形のみで呼ばれる");
  }
});

// ── 13.5 beginDrag: wasNearBalance 誤リセット防止 (near-balance 誤発火バグ回帰) ──
// クロスレビューで発見: beginDrag() で毎回 wasNearBalance を false にリセットすると、
// 「持ち上げただけでキャンセル」「slip で弾き戻された」等 session.leftIds/rightIds が
// 変化しないドラッグでも、ドラッグ終了直後の次フレームで false→true の立ち上がりが
// 誤検出され、光/ハプティクスのワンショット演出が何も変わっていないのに再発火する。
// rAFループの近接判定は !dragState の間しか評価されないため (591行目付近)、
// beginDrag 側でリセットしなくても副作用は無い。
// 一方 startGame (ラウンド開始) と onRoundBalanced (ラウンド遷移) では、
// 新ラウンドを完全に新しい状態として扱うべきなので明示リセットが必要 = 維持する。
section("beginDrag は wasNearBalance をリセットしない (near-balance 誤発火バグ回帰)", () => {
  const beginDragMatch = gameJs.match(/function beginDrag\([^)]*\)\s*\{([\s\S]*?)\n  \}/);
  assert.ok(beginDragMatch, "beginDrag() 関数本体を抽出できる");
  assert.doesNotMatch(
    beginDragMatch[1],
    /wasNearBalance\s*=\s*false/,
    "beginDrag() は wasNearBalance を強制リセットしない (ドラッグキャンセル/slip 後の誤発火防止)"
  );

  const startGameMatch = gameJs.match(/function startGame\(\)\s*\{([\s\S]*?)\n  \}/);
  assert.ok(startGameMatch, "startGame() 関数本体を抽出できる");
  assert.match(
    startGameMatch[1],
    /wasNearBalance\s*=\s*false/,
    "startGame() は wasNearBalance を明示リセットする (新ラウンド開始は完全に新規状態)"
  );

  const onRoundBalancedMatch = gameJs.match(/function onRoundBalanced\(\)\s*\{([\s\S]*?)\n  \}/);
  assert.ok(onRoundBalancedMatch, "onRoundBalanced() 関数本体を抽出できる");
  assert.match(
    onRoundBalancedMatch[1],
    /wasNearBalance\s*=\s*false/,
    "onRoundBalanced() (ラウンド遷移) は wasNearBalance を明示リセットする"
  );
});

// ── 14. index.html 構造 ─────────────────────────────────────────
section("index.html 構造", () => {
  assert.match(indexHtml, /#app\{visibility:hidden\}/, "FOUC ガードが存在する");
  assert.match(indexHtml, /body\.pono-game-ready #app\{visibility:visible\}/, "FOUC ガードの表示解除が存在する");
  for (const src of ["../common/tier.js", "../common/haptics.js", "../common/treasure.js", "../common/menu.js"]) {
    assert.ok(indexHtml.includes(src), `index.html が ${src} を読み込んでいる`);
  }
  assert.match(indexHtml, /id="landscape-notice"/, "landscape-notice 要素が存在する");
});

// ── 15. play.html 統合検証 (donguri-wakekko 登録漏れの再発防止) ──
section("play.html 統合検証", () => {
  const playHtmlPath = path.join(root, "play.html");
  if (fs.existsSync(playHtmlPath)) {
    const playHtml = fs.readFileSync(playHtmlPath, "utf8");
    const hasGamesEntry = /id:\s*['"]guragura-seesaw['"]/.test(playHtml);
    if (hasGamesEntry) {
      assert.match(playHtml, /id:\s*['"]guragura-seesaw['"][\s\S]{0,400}?href:\s*['"]guragura-seesaw\/['"]/, "GAMES エントリに href: 'guragura-seesaw/' がある");
      assert.match(playHtml, /id:\s*['"]guragura-seesaw['"][\s\S]{0,400}?comingSoon:\s*true/, "GAMES エントリに comingSoon: true がある");
      assert.match(playHtml, /id:\s*['"]guragura-seesaw['"][\s\S]{0,400}?debugPlayable:\s*true/, "GAMES エントリに debugPlayable: true がある");
      assert.match(playHtml, /id:\s*['"]guragura-seesaw['"][\s\S]{0,400}?tier:\s*['"]app['"]/, "GAMES エントリに tier: 'app' がある");

      const menuIdsMatch = playHtml.match(/APP_TITLE_MENU_IDS\s*=\s*\[([\s\S]*?)\];/);
      assert.ok(menuIdsMatch, "play.html に APP_TITLE_MENU_IDS 配列が見つかる");
      assert.match(menuIdsMatch[1], /['"]guragura-seesaw['"]/, "APP_TITLE_MENU_IDS 配列内に 'guragura-seesaw' が含まれる (登録漏れ厳禁)");
    } else {
      console.log("  (skip: play.html への guragura-seesaw 統合は未実施。統合担当のタスク)");
    }
  } else {
    console.log("  (skip: play.html が見つからない)");
  }
});

// ── 16. logic.js 読込失敗フォールバック (2026-07-22 はじめるボタン無反応バグ再発防止) ──
section("キャッシュバスティング + ロード失敗フォールバックの静的検証", () => {
  assert.match(indexHtml, /src="js\/logic\.js\?v=/, "index.html の js/logic.js に ?v= キャッシュバスティングが付いている");
  assert.match(indexHtml, /src="js\/game\.js\?v=/, "index.html の js/game.js に ?v= キャッシュバスティングが付いている");
  assert.match(indexHtml, /href="styles\.css\?v=/, "index.html の styles.css に ?v= キャッシュバスティングが付いている");
  assert.match(gameJs, /function showLoadError\s*\(/, "game.js に showLoadError フォールバックが存在する");
  assert.match(gameJs, /\?retry=/, "game.js が logic.js 再取得時にキャッシュバイパス (?retry=) を使っている");
});

// ── 17. TWIN_ROUND_CONFIG 定数値 (v3: 空/休眠) ────────────────────
// 2026-07-23 v3 再設計でふたご皿は今回どのラウンドからも使わないため
// TWIN_ROUND_CONFIG は空オブジェクトになり、全10ラウンドが isTwinRound()=false
// (=常に単一皿 rightIds/placeItem/removeItem 経路) になったことを固定する。
section("TWIN_ROUND_CONFIG 定数値 (v3: 空/休眠)", () => {
  assert.ok(L.TWIN_ROUND_CONFIG && typeof L.TWIN_ROUND_CONFIG === "object", "TWIN_ROUND_CONFIG が存在する");
  assert.deepEqual(L.TWIN_ROUND_CONFIG, {}, "v3 では TWIN_ROUND_CONFIG は空 (ふたご皿は休眠中)");

  assert.equal(L.ROUNDS.length, 10, "ROUNDS は v3 で10個固定");
  for (let r = 0; r < L.ROUNDS.length; r++) {
    assert.equal(L.isTwinRound(r), false, `ラウンド${r + 1} (index${r}) はふたご皿対象外 (v3 は全ラウンド単一皿)`);
    assert.equal(L.getTwinRoundConfig(r), null, `ラウンド${r + 1} (index${r}) の config は null`);
  }

  // 段階的導入の登場ラウンド (0-indexed) を固定する
  assert.deepEqual(L.ROUNDS[0].left, ["cherry", "lemon", "blueberry", "apple"], "R1 は導入緩和で4個の果物/野菜のみ");
  assert.ok(L.ROUNDS.slice(0, 3).every(r => [...r.left, ...r.tray].every(id => FRUIT_VEG_IDS.includes(id))), "R1-3 は果物/野菜のみで構成される");
  assert.ok([...L.ROUNDS[3].left, ...L.ROUNDS[3].tray].includes("frog"), "R4 (index3) で人形 (frog) が初登場する");
  assert.ok([...L.ROUNDS[6].left, ...L.ROUNDS[6].tray].includes("bear"), "R7 (index6) で人形 bear が初登場する");
  assert.ok([...L.ROUNDS[7].left, ...L.ROUNDS[7].tray].includes("mystery_stone"), "R8 (index7) で石 (mystery_stone) が初登場する");
  assert.ok([...L.ROUNDS[8].left, ...L.ROUNDS[8].tray].includes("star_block") && [...L.ROUNDS[8].left, ...L.ROUNDS[8].tray].includes("heart_block"), "R9 (index8) で star_block+heart_block が同時登場する");
  assert.ok([...L.ROUNDS[9].left, ...L.ROUNDS[9].tray].includes("elephant"), "R10 (index9、最終) で elephant が初登場する");
  assert.deepEqual(
    [...new Set(L.ROUNDS.flatMap(r => [...r.left, ...r.tray]))].sort(),
    L.CATALOG.map(item => item.id).sort(),
    "全15点が10ラウンドの中で少なくとも1回は使われる"
  );
});

// ── 17b. 全10ラウンド 到達可能性監査 (v3.1: デコイ再導入で slip/near-balance を実際に到達可能にする) ──
// クロスレビュー指摘 (2026-07-23 夜) の回帰防止テスト: v3 初版は「tray合計 ===
// left合計 (デコイなし)」で設計されていたため、正の重みだけを足し上げて厳密一致
// させる構造上、(a) 最後の1個を置くまでは必ず undershoot になり slip
// (reason==='slip') が全10ラウンド×全順列で一度も発火せず、(b) カタログの最小
// weight(2) のせいで最終手前にちょうど diff=±1 (near-balance圏) へ到達する余地も
// 無い、という「詰みは無いが選ぶ楽しさも失敗の学びも無い」退化を許してしまって
// いた (このセクションの旧版はその退化した状態を「trap-free」として合格させる
// 側の不変条件だった)。
//
// v3.1 は各ラウンドの tray にデコイ (実際の解では使わない、または使うと重すぎる
// アイテム) を1〜2点追加し、tray合計 > left合計 にした。 これにより slip も
// near-balance も本番の placeItem/isNearBalance を素通りさせるだけで実際に
// 到達可能になったことを、本番ロジックそのものを BFS で走らせて検証する。
// (デコイを選んで前進のみでは詰む状態が新たに生まれるが、removeItem は常に
// 使えるため「詰み」ではなく健全なトライアル&エラーであり許容する。 そのため
// 「受理された全中間状態が前進のみで解へ到達できる」という旧来の不変条件は
// もう要求しない)。
section("全10ラウンド 到達可能性監査 (デコイ再導入・slip/near-balance 到達可能性)", () => {
  L.ROUNDS.forEach((round, i) => {
    const leftWeight = L.sumWeights(round.left);
    const trayWeight = L.sumWeights(round.tray);
    assert.ok(trayWeight > leftWeight, `ラウンド${i + 1}: tray合計(${trayWeight})はleft合計(${leftWeight})より大きい (デコイが存在する、v3.1)`);

    const analysis = analyzeRoundForward(i);
    assert.ok(analysis.solutions.length >= 1, `ラウンド${i + 1}: 実ロジックで到達可能な解が存在する (デコイがあっても詰みきりではない、got ${analysis.solutions.length})`);

    const firstMoves = acceptedNextStates(i, analysis.initialState);
    assert.equal(firstMoves.length, round.tray.length, `ラウンド${i + 1}: トレイ全アイテムが初手として本番ロジックで受理される (どのカタログ重量も left+SLIP_DIFF を単独では超えないため、初手はデコイ込みでも常に受理される)`);

    // 本題: クロスレビューが指摘した「slip/near-balanceが数学的に到達不能」の
    // 直接的な回帰防止。 正準化BFSで本番の placeItem/isNearBalance を実際に
    // 走らせ、両方とも実際に発火する経路が存在することを検証する。
    const reach = analyzeReachabilityCanonical(i);
    assert.ok(reach.solvable, `ラウンド${i + 1}: 正準化BFSでも解に到達できる`);
    assert.ok(reach.slipReachable, `ラウンド${i + 1}: 「おもすぎたら はねかえる」slip (reason==='slip') が実際に到達可能な経路が存在する (旧v3の退化バグの回帰防止)`);
    assert.ok(reach.nearBalanceReachable, `ラウンド${i + 1}: 「あとちょっと！」near-balance (diff=±1) が実際に到達可能な経路が存在する (旧v3の退化バグの回帰防止)`);
  });
});

// ── 18. placeItemTwin / removeItemTwin 不変条件 [休眠コードの単体検証] ──
// 2026-07-23 v3 では TWIN_ROUND_CONFIG={} のためどの ROUNDS インデックスにも
// config が紐付かない。 placeItemTwin/removeItemTwin 自体は将来の再導入に備えて
// 休眠状態のまま残す判断をしたため (上の TWIN_ROUND_CONFIG コメント参照)、
// ここでは実在の ROUNDS に依存せず、テスト内で一時的に合成の round config を
// TWIN_ROUND_CONFIG (PUBLIC_API 経由の同一オブジェクト参照) に注入して
// full/localSlip/slip/notfound の検証順序が壊れていないことを直接検証する。
section("placeItemTwin / removeItemTwin 不変条件 (合成 round config による休眠コード単体検証)", () => {
  const SYN_ROUND = 999; // 実 ROUNDS と衝突しない合成インデックス
  assert.equal(L.getTwinRoundConfig(SYN_ROUND), null, "テスト開始前は合成インデックスに config が無い");
  L.TWIN_ROUND_CONFIG[SYN_ROUND] = { basketCapacityEach: 3, localOverloadMax: 7, slipDiff: 9 };
  try {
    // (1) 容量超過 -> full、元 state 非破壊 (capacityEach=3)
    {
      const state = {
        leftIds: ["mystery_stone"],
        rightBasketAIds: ["cherry", "cherry", "cherry"],
        rightBasketBIds: [],
        trayIds: ["blueberry"]
      };
      const before = JSON.parse(JSON.stringify(state));
      const res = L.placeItemTwin(state, "blueberry", "A", SYN_ROUND);
      assert.equal(res.ok, false);
      assert.equal(res.reason, "full");
      assert.equal(res.basketId, "A");
      assert.deepEqual(state, before, "容量超過時、元 state は非破壊");
    }

    // (2) 局所超過 -> localSlip、元 state 非破壊 (localOverloadMax=7)
    //     elephant(14) を空の A に置くと 14 > 7 = localOverloadMax
    {
      const state = { leftIds: [], rightBasketAIds: [], rightBasketBIds: [], trayIds: ["elephant"] };
      const before = JSON.parse(JSON.stringify(state));
      const res = L.placeItemTwin(state, "elephant", "A", SYN_ROUND);
      assert.equal(res.ok, false);
      assert.equal(res.reason, "localSlip");
      assert.equal(res.basketId, "A", "こぼれたバスケットIDが結果に含まれる (UI がそのバスケット近くにメッセージを出すため)");
      assert.deepEqual(state, before, "localSlip 時、元 state は非破壊");
    }

    // (2b) localOverloadMax ちょうど (境界値) は許可される (超過のみ拒否、以下はOK)
    //      cat(7) を空の A へ、 localOverloadMax=7 ちょうど (全体diff=7 も slipDiff(9) 未満)
    {
      const state = { leftIds: [], rightBasketAIds: [], rightBasketBIds: [], trayIds: ["cat"] };
      const res = L.placeItemTwin(state, "cat", "A", SYN_ROUND);
      assert.equal(res.ok, true, "バスケット単独重量が localOverloadMax とちょうど等しい場合は許可される (超過のみ拒否)");
    }

    // (3) 全体 slip -> slip、元 state 非破壊 (バスケット単独は localOverloadMax 以内だが
    //     合計との差が slipDiff に達する): A に dog(8) が既にある状態で cat(7) を空の B へ。
    //     B単独 weight=7 (localOverloadMax(7)ちょうどなので local はセーフ) だが、
    //     全体 diff = (8+7)-0 = 15 >= slipDiff(9) で slip になる。
    {
      const state = { leftIds: [], rightBasketAIds: ["dog"], rightBasketBIds: [], trayIds: ["cat"] };
      const before = JSON.parse(JSON.stringify(state));
      const res = L.placeItemTwin(state, "cat", "B", SYN_ROUND);
      assert.equal(res.ok, false);
      assert.equal(res.reason, "slip");
      assert.equal(res.weightDirection, "tooHeavy", "右側合計が重すぎる全体slipは tooHeavy");
      assert.equal(res.basketId, "B");
      assert.deepEqual(state, before, "slip 時、元 state は非破壊");
    }

    // (3b) 右側合計が軽すぎる場合も reason は slip のまま、向きだけ tooLight で返す。
    //      UI が「おもすぎ」と逆の案内をしないための方向情報。
    {
      const state = {
        leftIds: ["elephant"],
        rightBasketAIds: [],
        rightBasketBIds: [],
        trayIds: ["blueberry"]
      };
      const before = JSON.parse(JSON.stringify(state));
      const res = L.placeItemTwin(state, "blueberry", "A", SYN_ROUND);
      assert.equal(res.ok, false);
      assert.equal(res.reason, "slip", "検証順序と既存reasonは維持する");
      assert.equal(res.weightDirection, "tooLight", "ブルーベリー先置きは軽すぎる方向として返す");
      assert.deepEqual(state, before, "tooLight slip 時も元 state は非破壊");
    }

    // チェック順序: 容量超過が最優先 (局所超過や slip の条件も満たしていても full が返る)
    // A は既に3個 (容量上限) で満杯。 elephant(14) は local(7)・全体slip(9) も同時に
    // 破るはずだが、full が最優先で返ること。
    {
      const state = {
        leftIds: ["mystery_stone"],
        rightBasketAIds: ["cherry", "cherry", "cherry"],
        rightBasketBIds: [],
        trayIds: ["elephant"]
      };
      const res = L.placeItemTwin(state, "elephant", "A", SYN_ROUND);
      assert.equal(res.ok, false);
      assert.equal(res.reason, "full", "容量超過が local超過/slipより優先してチェックされる");
    }

    // トレイに存在しない id / 不正な basketId は notfound
    {
      const state = { leftIds: [], rightBasketAIds: [], rightBasketBIds: [], trayIds: ["cherry"] };
      const res1 = L.placeItemTwin(state, "nonexistent-item", "A", SYN_ROUND);
      assert.equal(res1.ok, false);
      assert.equal(res1.reason, "notfound");
      const res2 = L.placeItemTwin(state, "cherry", "C", SYN_ROUND);
      assert.equal(res2.ok, false);
      assert.equal(res2.reason, "notfound", "basketId が A/B 以外は notfound");
    }
  } finally {
    delete L.TWIN_ROUND_CONFIG[SYN_ROUND];
  }
  assert.equal(L.getTwinRoundConfig(SYN_ROUND), null, "テスト後に合成 config を後始末した (他セクションへ汚染しない)");

  // removeItemTwin: A/B それぞれ独立して取り外せる。 総アイテム数・総重量が保存される
  {
    let state = {
      leftIds: ["elephant"],
      rightBasketAIds: ["dog"],
      rightBasketBIds: ["lemon"],
      trayIds: ["apple", "grapes"]
    };
    const totalBefore = state.rightBasketAIds.length + state.rightBasketBIds.length + state.trayIds.length;
    const weightBefore = L.sumWeights(state.rightBasketAIds) + L.sumWeights(state.rightBasketBIds) + L.sumWeights(state.trayIds);

    state = L.removeItemTwin(state, "A", "dog");
    assert.deepEqual(state.rightBasketAIds, [], "A から dog が取り除かれる");
    assert.ok(state.trayIds.indexOf("dog") !== -1, "取り外した dog はトレイに戻る");
    assert.deepEqual(state.rightBasketBIds, ["lemon"], "B 側は影響を受けない (独立して機能)");

    state = L.removeItemTwin(state, "B", 0);
    assert.deepEqual(state.rightBasketBIds, [], "B から index指定で lemon が取り除かれる");
    assert.ok(state.trayIds.indexOf("lemon") !== -1, "取り外した lemon はトレイに戻る");

    assert.equal(
      state.rightBasketAIds.length + state.rightBasketBIds.length + state.trayIds.length,
      totalBefore,
      "取り外し後も総アイテム数は保存される"
    );
    assert.equal(
      L.sumWeights(state.rightBasketAIds) + L.sumWeights(state.rightBasketBIds) + L.sumWeights(state.trayIds),
      weightBefore,
      "取り外し後も総重量は保存される"
    );
  }

  // removeItemTwin: 不正 basketId / 存在しない id は no-op
  {
    const state = { leftIds: [], rightBasketAIds: ["dog"], rightBasketBIds: [], trayIds: [] };
    const before = JSON.parse(JSON.stringify(state));
    const res1 = L.removeItemTwin(state, "C", "dog");
    assert.deepEqual(res1, before, "不正 basketId は no-op");
    const res2 = L.removeItemTwin(state, "A", "nonexistent-item");
    assert.deepEqual(res2, before, "存在しない id は no-op");
  }
});

// ── 19. ふたご皿 実在する成功シーケンス [休眠コードの単体検証] ────
// v3 では実 ROUNDS がふたご皿を使わないため (§18 と同じ理由)、合成 round config を
// 一時注入して「複数回 placeItemTwin を連鎖させて釣り合いに到達できる」という
// 休眠コードのエンドツーエンドな健全性だけを検証する。
section("ふたご皿 実在する成功シーケンス (合成 round config による休眠コード単体検証)", () => {
  const SYN_ROUND = 999;
  L.TWIN_ROUND_CONFIG[SYN_ROUND] = { basketCapacityEach: 3, localOverloadMax: 10, slipDiff: 9 };
  try {
    // おだい cat(7)。 blueberry(2)→A, blueberry(2)→B, lemon(3)→A で合計7 に到達する。
    let state = { leftIds: ["cat"], rightBasketAIds: [], rightBasketBIds: [], trayIds: ["blueberry", "blueberry", "lemon"] };
    let res = L.placeItemTwin(state, "blueberry", "A", SYN_ROUND);
    assert.equal(res.ok, true, "1個目 blueberry→A が成功する");
    state = res.state;
    res = L.placeItemTwin(state, "blueberry", "B", SYN_ROUND);
    assert.equal(res.ok, true, "2個目 blueberry→B が成功する");
    state = res.state;
    assert.equal(L.isBalanced(L.sumWeights(state.leftIds), L.sumTwinRightWeight(state)), false, "2個目まではまだ釣り合わない (7 vs 4)");
    res = L.placeItemTwin(state, "lemon", "A", SYN_ROUND);
    assert.equal(res.ok, true, "3個目 lemon→A が成功する");
    state = res.state;
    assert.equal(L.isBalanced(L.sumWeights(state.leftIds), L.sumTwinRightWeight(state)), true, "3個の連鎖配置で釣り合いに到達する (A:blueberry+lemon=5, B:blueberry=2, 合計7)");
    assert.deepEqual(state.trayIds, [], "トレイの全アイテムを使い切って解へ到達する");
    assert.ok(state.rightBasketAIds.length <= 3 && state.rightBasketBIds.length <= 3, "容量内に収まっている");
  } finally {
    delete L.TWIN_ROUND_CONFIG[SYN_ROUND];
  }
});

// ── 20. createSession / advanceRound (v3: 全10ラウンド単一皿) ────────
section("createSession / advanceRound (v3: 全10ラウンド単一皿)", () => {
  let session = L.createSession();
  assert.deepEqual(session.rightIds, [], "初期セッションは rightIds が初期化されている");
  assert.deepEqual(session.rightBasketAIds, [], "初期セッションは rightBasketAIds も初期化されている (休眠フィールドとして残置)");
  assert.deepEqual(session.rightBasketBIds, [], "初期セッションは rightBasketBIds も初期化されている (休眠フィールドとして残置)");

  for (let r = 0; r < L.ROUNDS.length; r++) {
    assert.equal(session.round, r, `round は ${r}`);
    assert.equal(L.isTwinRound(session.round), false, `ラウンド${r + 1} は v3 で単一皿 (ふたご皿は休眠中)`);
    // ダミーを置いてみて advanceRound 後にリセットされるか確認
    session.rightIds = ["cherry"];
    session = L.advanceRound(session);
    if (r + 1 < L.ROUNDS.length) {
      assert.equal(session.round, r + 1, `ラウンド${r + 2} (index${r + 1}) に進む`);
      assert.deepEqual(session.rightIds, [], `ラウンド${r + 2} 進行後 rightIds はリセットされている`);
      assert.deepEqual(session.rightBasketAIds, [], `ラウンド${r + 2} 進行後 rightBasketAIds も空のまま (休眠フィールド)`);
      assert.deepEqual(session.rightBasketBIds, [], `ラウンド${r + 2} 進行後 rightBasketBIds も空のまま (休眠フィールド)`);
    }
  }
  assert.equal(session.finished, true, "10ラウンド目の advanceRound で finished になる");
});

// ── 21. index.html: ふたご皿 DOM 構造 ────────────────────────────
section("index.html: ふたご皿 (twin basket) DOM 構造", () => {
  for (const id of ["panRightTwin", "panRightA", "panRightB", "panRightAItems", "panRightBItems", "slipBubbleA", "slipBubbleB"]) {
    assert.ok(indexHtml.includes(`id="${id}"`), `index.html に id="${id}" が存在する`);
  }
  assert.match(indexHtml, /class="pan pan-twin pan-twin-a"/, "A皿に pan-twin-a クラスがある");
  assert.match(indexHtml, /class="pan pan-twin pan-twin-b"/, "B皿に pan-twin-b クラスがある");
  // #panRightTwin (A/B) は既存 #panRight (単一皿、ラウンド1・2用) と兄弟として
  // #plank の中に共存する (どちらか一方だけを CSS/JS が排他的に表示する設計)。
  const plankStart = indexHtml.indexOf('id="plank"');
  const panRightIdx = indexHtml.indexOf('id="panRight"', plankStart);
  const panRightTwinIdx = indexHtml.indexOf('id="panRightTwin"', plankStart);
  assert.ok(plankStart !== -1 && panRightIdx > plankStart, "#panRight は #plank の内側にある");
  assert.ok(panRightTwinIdx > panRightIdx, "#panRightTwin は #panRight より後 (兄弟) に出現する");
});

// ── 22. styles.css: ふたご皿 A/B 配色 + #plank.is-twin-round 排他表示 ──
section("styles.css: ふたご皿 A/B 配色 + 排他表示", () => {
  const aBlockMatch = stylesCss.match(/\.pan-twin-a\s+\.pan-dish\s*\{[^}]*\}/);
  assert.ok(aBlockMatch, ".pan-twin-a .pan-dish ブロックが見つかる");
  assert.match(aBlockMatch[0], /#FFD9B3/i, "A皿の背景に #FFD9B3 (淡いピーチ) が使われている");
  assert.match(aBlockMatch[0], /#FF9F45/i, "A皿のアクセントに #FF9F45 (橙) が使われている");

  const bBlockMatch = stylesCss.match(/\.pan-twin-b\s+\.pan-dish\s*\{[^}]*\}/);
  assert.ok(bBlockMatch, ".pan-twin-b .pan-dish ブロックが見つかる");
  assert.match(bBlockMatch[0], /#E0D4F7/i, "B皿の背景に #E0D4F7 (淡いラベンダー) が使われている");
  assert.match(bBlockMatch[0], /#9B7FD4/i, "B皿のアクセントに #9B7FD4 (紫) が使われている");

  // 既存の黄色グロー (#ffd93d、ドロップ先ハイライト) とは役割が分かれている
  // (A/B の通常時地色として #ffd93d は使わない)
  assert.doesNotMatch(aBlockMatch[0], /#ffd93d/i, "A皿の通常時地色に既存ドロップ先ハイライト色 #ffd93d を流用していない");
  assert.doesNotMatch(bBlockMatch[0], /#ffd93d/i, "B皿の通常時地色に既存ドロップ先ハイライト色 #ffd93d を流用していない");

  assert.match(stylesCss, /#plank\.is-twin-round\s+\.pan-right\s*\{\s*display:\s*none;?\s*\}/, "#plank.is-twin-round 時に単一皿 .pan-right が非表示になる");
  assert.match(stylesCss, /#plank\.is-twin-round\s+#panRightTwin\s*\{\s*display:\s*flex;?\s*\}/, "#plank.is-twin-round 時に #panRightTwin が表示される");

  assert.match(stylesCss, /\.pan-twin\.is-local-slip\s*\{[^}]*slipBoing/, "localSlip 時に既存 slipBoing アニメを流用するルールがある");
});

// ── 23. game.js: ふたご皿ドラッグルーティング (placeItemTwin/removeItemTwin 経路) ──
section("game.js: ふたご皿ドラッグルーティング", () => {
  assert.match(gameJs, /function endDragTwin\(/, "endDragTwin() が定義されている");
  assert.match(gameJs, /function endDragSingle\(/, "endDragSingle() が定義されている (ラウンド1・2の既存経路が分離維持されている)");
  assert.match(gameJs, /if\s*\(isTwinRoundNow\(\)\)\s*\{\s*endDragTwin\(ds,\s*x,\s*y\);\s*\}\s*else\s*\{\s*endDragSingle\(ds,\s*x,\s*y\);\s*\}/, "endDrag() が isTwinRoundNow() で endDragTwin/endDragSingle を振り分ける");

  assert.match(gameJs, /L\.placeItemTwin\(\s*stateSnapshot,\s*ds\.itemId,\s*basketId,\s*session\.round\s*\)/, "placeItemTwin は session.round を明示的に roundIndex として渡す (fallback に頼らない)");
  assert.match(gameJs, /L\.removeItemTwin\(/, "removeItemTwin が呼ばれている");

  // チェック順序 (full → localSlip → slip) を game.js 側の分岐でも尊重している
  // (else if チェーンなので順序は logic.js の戻り値 reason 次第だが、少なくとも
  // 'slip' と 'localSlip' の両方を区別して扱っていることを確認する)
  assert.match(gameJs, /reason === 'slip'/, "全体 slip (reason==='slip') の分岐がある");
  assert.match(gameJs, /reason === 'localSlip'/, "局所 slip (reason==='localSlip') の分岐がある");
  assert.match(gameJs, /weightDirection === 'tooLight'/, "全体 slip は軽すぎる方向を区別する");

  // localSlip 専用メッセージ・アニメ (仕様書どおりの文言)
  assert.match(gameJs, /こっちのおさらだけ、おもすぎたみたい！/, "localSlip 専用メッセージが実装されている");
  assert.match(gameJs, /is-local-slip/, "localSlip 時にバスケット側の boing アニメクラスが付与される");
  // 全体 slip の既存メッセージは変更されていない
  assert.match(gameJs, /おもすぎたみたい！/, "全体 slip の既存メッセージ「おもすぎたみたい！」は維持されている");
  assert.match(gameJs, /まだ かるいみたい！/, "軽すぎる全体 slip は逆方向のかな案内を出す");

  // localSlip / 全体 slip とも Haptics は既存パターンのみ流用 (局所専用の新パターン追加はスコープ外)
  const endDragTwinMatch = gameJs.match(/function endDragTwin\([^)]*\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(endDragTwinMatch, "endDragTwin() 関数本体を抽出できる");
  const hapticsInTwin = [...endDragTwinMatch[0].matchAll(/Haptics\.fire\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  assert.ok(hapticsInTwin.length > 0, "endDragTwin() は Haptics.fire を呼んでいる");
  for (const pattern of hapticsInTwin) {
    assert.ok(["stickerPaste", "gachaTurn3"].includes(pattern), `endDragTwin() 内の Haptics.fire('${pattern}') は既存パターンのみ (局所専用の新パターンを追加していない)`);
  }
});

// ── 24. game.js: ふたご皿の傾き計算・near-balance・renderAll の twin 対応 ──
section("game.js: ふたご皿の傾き計算・表示切替", () => {
  assert.match(gameJs, /function isTwinRoundNow\s*\(\)\s*\{/, "isTwinRoundNow() ヘルパーが定義されている");
  assert.match(gameJs, /L\.isTwinRound\(session\.round\)/, "isTwinRoundNow() が L.isTwinRound(session.round) を参照する");

  // メインループの傾き計算がふたご皿ラウンドで sumTwinRightWeight を使う
  const loopMatch = gameJs.match(/function loop\(ts\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(loopMatch, "loop() 関数本体を抽出できる");
  assert.match(loopMatch[0], /L\.sumTwinRightWeight\(session\)/, "loop() はふたご皿ラウンドで L.sumTwinRightWeight(session) を右皿重量として使う");
  assert.match(loopMatch[0], /rightBasketAIds\.length\s*\+\s*session\.rightBasketBIds\.length/, "near-balance 判定の非空チェックがふたご皿の2バスケット合計を見る");

  // renderAll が #plank に is-twin-round クラスをラウンドごとに切り替える
  assert.match(gameJs, /plankEl\.classList\.toggle\('is-twin-round',\s*twin\)/, "renderAll() が #plank.is-twin-round をラウンドごとに切り替える");
  assert.match(gameJs, /renderItemsInto\(panRightAItemsEl,\s*session\.rightBasketAIds,\s*'panA'\)/, "renderAll() が rightBasketAIds を panA として描画する");
  assert.match(gameJs, /renderItemsInto\(panRightBItemsEl,\s*session\.rightBasketBIds,\s*'panB'\)/, "renderAll() が rightBasketBIds を panB として描画する");
});

// ── 25. キャッシュバージョン 3-way 同期 (sw.js / play.html / guragura-seesaw/index.html) ──
// 固定値をハードコードすると他タスクの正当な CACHE_VERSION バンプで壊れるため、
// title_news_shop_debug_regression.cjs と同様に「同期している」不変条件のみ検証する。
section("キャッシュバージョン 3-way 同期", () => {
  const swSrc = read("sw.js");
  const playSrc = read("play.html");

  const swVersion = swSrc.match(/const CACHE_VERSION = (\d+);/);
  const pageVersion = playSrc.match(/const PAGE_CACHE_VERSION = (\d+);/);
  const ponoVersion = playSrc.match(/window\.PONO_SW_VERSION = 'v(\d+)'/);
  assert.ok(swVersion && pageVersion && ponoVersion, "sw.js CACHE_VERSION / play.html PAGE_CACHE_VERSION / window.PONO_SW_VERSION がいずれも見つかる");
  assert.equal(ponoVersion[1], pageVersion[1], "window.PONO_SW_VERSION と PAGE_CACHE_VERSION が同じ値");
  assert.ok(Number(swVersion[1]) >= Number(pageVersion[1]), "sw.js CACHE_VERSION は play.html の値以上 (他タスクのゲーム限定バンプで先行し得る)");

  // guragura-seesaw/index.html の ?v= キャッシュバスターは3タグとも同じ値で揃っている
  const vTags = [...indexHtml.matchAll(/[?&]v=([\w-]+)/g)].map(m => m[1]);
  assert.ok(vTags.length >= 3, "index.html に ?v= 付きタグが3つ以上ある (styles.css/logic.js/game.js)");
  const uniqueV = new Set(vTags);
  assert.equal(uniqueV.size, 1, "guragura-seesaw/index.html の ?v= はすべて同一値で揃っている (styles.css/logic.js/game.js 同期漏れ防止)");
});

console.log(`\n全 ${passCount} セクション green.`);
