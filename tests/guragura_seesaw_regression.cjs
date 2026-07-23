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

// ── 全部分集合列挙 (§6 用の独立実装。逐次 placeItem シミュレーションで到達可能性まで見る) ──
function findMultipleReachableSolutions(round) {
  const trayIds = round.tray;
  const leftWeight = L.sumWeights(round.left);
  const n = trayIds.length;
  const solutions = [];
  for (let mask = 1; mask < (1 << n); mask++) {
    const subset = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(trayIds[i]);
    }
    if (subset.length > L.PAN_CAPACITY) continue;
    if (L.sumWeights(subset) !== leftWeight) continue;
    // 到達可能性チェック: subset の並び順のいずれかで、逐次 placeItem が
    // 一度も slip にならずに全部乗せられるか (少なくとも1つの順序があればOK)。
    if (isReachableInSomeOrder(round, subset)) solutions.push(subset);
  }
  return solutions;
}

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permutations(rest)) result.push([arr[i]].concat(p));
  }
  return result;
}

function isReachableInSomeOrder(round, subset) {
  const orders = permutations(subset);
  for (const order of orders) {
    let state = { leftIds: round.left.slice(), rightIds: [], trayIds: round.tray.slice() };
    let ok = true;
    for (const id of order) {
      const res = L.placeItem(state, id);
      if (!res.ok) { ok = false; break; }
      state = res.state;
    }
    if (ok) return true;
  }
  return false;
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
  assert.ok(L.CATALOG.length >= 10 && L.CATALOG.length <= 15, `CATALOG は10〜15点 (got ${L.CATALOG.length})`);
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
  const pathRe = /['"]([^'"]+\.(?:png|webp))['"]/g;
  let m;
  const imgPaths = [];
  while ((m = pathRe.exec(imgMapMatch[1]))) imgPaths.push(m[1]);
  assert.ok(imgPaths.length >= L.CATALOG.length, "ITEM_IMAGES のパス数がカタログ数以上");
  for (const p of imgPaths) {
    const resolved = path.join(root, "guragura-seesaw", p);
    assert.ok(fs.existsSync(resolved), `画像が実在する: ${p}`);
  }
});

// ── 2. 重さ×見た目サイズ独立性 (本ゲーム最重要) ───────────────────
section("重さ×見た目サイズ独立性", () => {
  // weightA > weightB && sizeRank(A) < sizeRank(B) のペアが存在する
  let foundInverse = false;
  for (const a of L.CATALOG) {
    for (const b of L.CATALOG) {
      if (a.weight > b.weight && sizeRank(a.id) < sizeRank(b.id)) foundInverse = true;
    }
  }
  assert.ok(foundInverse, "重いのに見た目が小さいペアが存在する (elephant vs cherry 等)");

  // 同 weight で sizeClass が異なるペアが存在する (cherry/blueberry: 共に weight1, size l/s)
  let foundSameWeightDiffSize = false;
  for (const a of L.CATALOG) {
    for (const b of L.CATALOG) {
      if (a.id !== b.id && a.weight === b.weight && a.sizeClass !== b.sizeClass) foundSameWeightDiffSize = true;
    }
  }
  assert.ok(foundSameWeightDiffSize, "同じ weight で sizeClass が異なるペアが存在する");

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
  // 容量超過 -> full、元 state 非破壊
  {
    const state = { leftIds: ["elephant"], rightIds: ["cherry", "cherry", "cherry", "cherry"], trayIds: ["blueberry"] };
    const before = JSON.parse(JSON.stringify(state));
    const res = L.placeItem(state, "blueberry");
    assert.equal(res.ok, false);
    assert.equal(res.reason, "full");
    assert.deepEqual(state, before, "容量超過時、元 state は非破壊");
  }

  // 配置後 |diff| >= SLIP_DIFF -> slip、元 state 非破壊
  {
    const state = { leftIds: [], rightIds: [], trayIds: ["elephant"] };
    const before = JSON.parse(JSON.stringify(state));
    const res = L.placeItem(state, "elephant"); // left=0, right=10, diff=10 >= SLIP_DIFF(6)
    assert.equal(res.ok, false);
    assert.equal(res.reason, "slip");
    assert.deepEqual(state, before, "slip 時、元 state は非破壊");
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

// ── 6. 全ラウンド複数解 (到達可能性まで検証) ─────────────────────
section("全ラウンド複数解", () => {
  L.ROUNDS.forEach((round, i) => {
    const solutions = findMultipleReachableSolutions(round);
    assert.ok(solutions.length >= 2, `ラウンド${i + 1} には到達可能な解が2通り以上ある (got ${solutions.length})`);
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
  assert.equal(L.ROUNDS.length, 5, "ROUNDS は5個固定");
  let session = L.createSession();
  assert.equal(session.round, 0, "初期 round は 0");
  assert.equal(session.finished, false);

  for (let r = 0; r < L.ROUNDS.length; r++) {
    assert.equal(session.round, r, `round は ${r}`);
    const round = L.ROUNDS[r];
    const solutions = findMultipleReachableSolutions(round);
    assert.ok(solutions.length > 0, `ラウンド${r + 1} に解が存在する前提`);
    const orders = permutations(solutions[0]);
    let placedState = null;
    for (const order of orders) {
      let state = { leftIds: session.leftIds.slice(), rightIds: [], trayIds: session.trayIds.slice() };
      let ok = true;
      for (const id of order) {
        const res = L.placeItem(state, id);
        if (!res.ok) { ok = false; break; }
        state = res.state;
      }
      if (ok) { placedState = state; break; }
    }
    assert.ok(placedState, `ラウンド${r + 1} を解いた state が得られる`);
    session.leftIds = placedState.leftIds;
    session.rightIds = placedState.rightIds;
    session.trayIds = placedState.trayIds;
    assert.equal(L.isSessionBalanced(session), true, `ラウンド${r + 1} は釣り合っている`);
    session = L.advanceRound(session);
  }
  assert.equal(session.finished, true, "5ラウンド全部釣り合ったら finished");
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

// ── 17. TWIN_ROUND_CONFIG 定数値 ─────────────────────────────────
section("TWIN_ROUND_CONFIG 定数値", () => {
  assert.ok(L.TWIN_ROUND_CONFIG && typeof L.TWIN_ROUND_CONFIG === "object", "TWIN_ROUND_CONFIG が存在する");
  // ラウンド1・2 (index 0,1) はふたご皿対象外
  assert.equal(L.isTwinRound(0), false, "ラウンド1 (index0) はふたご皿対象外");
  assert.equal(L.isTwinRound(1), false, "ラウンド2 (index1) はふたご皿対象外");
  assert.equal(L.getTwinRoundConfig(0), null, "ラウンド1 の config は null");
  assert.equal(L.getTwinRoundConfig(1), null, "ラウンド2 の config は null");

  // ラウンド3 (index2, elephant単体 weight10) = "普通" ティア
  // slipDiff:9 (2026-07-23 レビュー対応): グローバル SLIP_DIFF(6) のままだと最初の1個を
  // 安全に置ける tray アイテムが 4/14 (28.6%) しかなく、しかも "難しい" ティアのラウンド4
  // (66.7%) より厳しいという tier 逆転が起きていたため、ラウンド単位で緩和した
  // (71.4%、ラウンド4を上回り "普通" が最も寛容という序列に是正)。
  assert.equal(L.isTwinRound(2), true, "ラウンド3 (index2) はふたご皿対象");
  assert.deepEqual(L.TWIN_ROUND_CONFIG[2], { tier: "normal", basketCapacityEach: 3, localOverloadMax: 7, slipDiff: 9 }, "ラウンド3の config 値");

  // ラウンド4 (index3, dog+cherry weight7) = "難しい" ティア (既に66.7%と十分寛容なため今回変更なし)
  assert.equal(L.isTwinRound(3), true, "ラウンド4 (index3) はふたご皿対象");
  assert.deepEqual(L.TWIN_ROUND_CONFIG[3], { tier: "hard", basketCapacityEach: 2, localOverloadMax: 5 }, "ラウンド4の config 値");

  // ラウンド5 (index4, bear+grapes weight10) = "難しい" ティア
  // localOverloadMax:5→7 (2026-07-23 レビュー対応): dog(重さ6) が単体でも
  // localOverloadMax(5) を超過し、このラウンドでは一度も配置できない「死んだアイテム」に
  // なっていたバグを修正 (7に引き上げ、dog単体はもちろん dog+cherry/lemon も収まる)。
  // slipDiff:8: グローバル SLIP_DIFF(6) のままだと最初の1個を安全に置ける tray アイテムが
  // 2/14 (14.3%、catのみ) しかなく、子供が最初に触るコマの約86%が即座に弾かれる詰みに
  // 近い状態だったため緩和 (42.9%、corn/dog/catの3種が安全に。 "難しい" ティアの
  // 最終ラウンドとして他の2ふたご皿ラウンドより厳しいままだが、実質詰みは解消)。
  assert.equal(L.isTwinRound(4), true, "ラウンド5 (index4) はふたご皿対象");
  assert.deepEqual(L.TWIN_ROUND_CONFIG[4], { tier: "hard", basketCapacityEach: 2, localOverloadMax: 7, slipDiff: 8 }, "ラウンド5の config 値");

  // ROUNDS 配列自体は変更されていないこと (既存形状の後方互換)
  assert.equal(L.ROUNDS.length, 5, "ROUNDS は引き続き5個固定");
  assert.deepEqual(L.ROUNDS[2].left, ["elephant"], "ラウンド3 のおだいは elephant 単体のまま");
  assert.deepEqual(L.ROUNDS[3].left, ["dog", "cherry"], "ラウンド4 のおだいは dog+cherry のまま");
  assert.deepEqual(L.ROUNDS[4].left, ["bear", "grapes"], "ラウンド5 のおだいは bear+grapes のまま");
});

// ── 18. placeItemTwin / removeItemTwin 不変条件 (容量・局所超過・全体slip・チェック順序) ──
section("placeItemTwin / removeItemTwin 不変条件", () => {
  // (1) 容量超過 -> full、元 state 非破壊 (ラウンド3, capacityEach=3)
  {
    const state = {
      leftIds: ["elephant"],
      rightBasketAIds: ["cherry", "cherry", "cherry"],
      rightBasketBIds: [],
      trayIds: ["blueberry"]
    };
    const before = JSON.parse(JSON.stringify(state));
    const res = L.placeItemTwin(state, "blueberry", "A", 2);
    assert.equal(res.ok, false);
    assert.equal(res.reason, "full");
    assert.equal(res.basketId, "A");
    assert.deepEqual(state, before, "容量超過時、元 state は非破壊");
  }

  // (2) 局所超過 -> localSlip、元 state 非破壊 (ラウンド3, localOverloadMax=7)
  //     直接 elephant(10) を空の A に置くケースで検証 (10 > 7 = localOverloadMax)
  {
    const state = { leftIds: [], rightBasketAIds: [], rightBasketBIds: [], trayIds: ["elephant"] };
    const before = JSON.parse(JSON.stringify(state));
    const res = L.placeItemTwin(state, "elephant", "A", 2); // A単独 weight10 > localOverloadMax(7)
    assert.equal(res.ok, false);
    assert.equal(res.reason, "localSlip");
    assert.equal(res.basketId, "A", "こぼれたバスケットIDが結果に含まれる (UI がそのバスケット近くにメッセージを出すため)");
    assert.deepEqual(state, before, "localSlip 時、元 state は非破壊");
  }

  // (2b) localOverloadMax ちょうど (境界値) は許可される (超過のみ拒否、以下はOK)
  {
    // ラウンド5 (index4, hard tier, 2026-07-23 localOverloadMax 5→7 に引き上げ済み) の
    // bear(7) を空の A へ、 localOverloadMax=7 ちょうど (かつ全体diff=7 は slipDiff(8) 未満)
    // -> 成功するはず
    const state = { leftIds: [], rightBasketAIds: [], rightBasketBIds: [], trayIds: ["bear"] };
    const res = L.placeItemTwin(state, "bear", "A", 4);
    assert.equal(res.ok, true, "バスケット単独重量が localOverloadMax とちょうど等しい場合は許可される (超過のみ拒否)");
  }

  // (3) 全体 slip -> slip、元 state 非破壊 (バスケット単独は localOverloadMax 以内だが
  //     合計との差がそのラウンドの slipDiff に達する)
  {
    // ラウンド3 (index2, normal tier, localOverloadMax=7, slipDiff=9): A に dog(6) が
    // 既に置かれている状態で bear(7) を空の B へ置くと、バスケット単独 weight=7
    // (localOverloadMax(7) ちょうどなので local はセーフ) だが、全体 diff = (6+7)-0 = 13
    // >= slipDiff(9) で slip になる。
    const state = { leftIds: [], rightBasketAIds: ["dog"], rightBasketBIds: [], trayIds: ["bear"] };
    const before = JSON.parse(JSON.stringify(state));
    const res = L.placeItemTwin(state, "bear", "B", 2);
    assert.equal(res.ok, false);
    assert.equal(res.reason, "slip");
    assert.equal(res.basketId, "B");
    assert.deepEqual(state, before, "slip 時、元 state は非破壊");
  }

  // チェック順序: 容量超過が最優先 (局所超過や slip の条件も満たしていても full が返る)
  {
    // ラウンド4 (capacityEach=2, localOverloadMax=5): A に既に2個 (容量上限) 入っている状態で
    // さらに置こうとすると、置くアイテム次第で localSlip や slip の条件も満たし得るが、
    // full が最優先で返ること。
    const state = {
      leftIds: ["dog", "cherry"], // weight7
      rightBasketAIds: ["apple", "lemon"], // weight3, 容量2個で満杯
      rightBasketBIds: [],
      trayIds: ["carrot"]
    };
    const res = L.placeItemTwin(state, "carrot", "A", 3);
    assert.equal(res.ok, false);
    assert.equal(res.reason, "full", "容量超過が local超過/slipより優先してチェックされる");
  }

  // トレイに存在しない id / 不正な basketId は notfound
  {
    const state = { leftIds: [], rightBasketAIds: [], rightBasketBIds: [], trayIds: ["cherry"] };
    const res1 = L.placeItemTwin(state, "nonexistent-item", "A", 2);
    assert.equal(res1.ok, false);
    assert.equal(res1.reason, "notfound");
    const res2 = L.placeItemTwin(state, "cherry", "C", 2);
    assert.equal(res2.ok, false);
    assert.equal(res2.reason, "notfound", "basketId が A/B 以外は notfound");
  }

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

// ── 19. ふたご皿ラウンド 実在する成功シーケンス (検証済みの解) ────
section("ふたご皿ラウンド 実在する成功シーケンス", () => {
  // ラウンド3 (index2): elephant(10) おだい。 dog(6)→A, frog(4)→B で釣り合う
  {
    let state = { leftIds: L.ROUNDS[2].left.slice(), rightBasketAIds: [], rightBasketBIds: [], trayIds: L.ROUNDS[2].tray.slice() };
    let res = L.placeItemTwin(state, "dog", "A", 2);
    assert.equal(res.ok, true, "ラウンド3: dog→A が成功する");
    state = res.state;
    res = L.placeItemTwin(state, "frog", "B", 2);
    assert.equal(res.ok, true, "ラウンド3: frog→B が成功する");
    state = res.state;
    assert.equal(L.isBalanced(L.sumWeights(state.leftIds), L.sumTwinRightWeight(state)), true, "ラウンド3: dog(A)+frog(B) で釣り合う");
    assert.ok(state.rightBasketAIds.length <= 3 && state.rightBasketBIds.length <= 3, "容量内に収まっている");
  }

  // ラウンド4 (index3): dog+cherry(7) おだい。 grapes(3)→A, frog(4)→B で釣り合う
  {
    let state = { leftIds: L.ROUNDS[3].left.slice(), rightBasketAIds: [], rightBasketBIds: [], trayIds: L.ROUNDS[3].tray.slice() };
    let res = L.placeItemTwin(state, "grapes", "A", 3);
    assert.equal(res.ok, true, "ラウンド4: grapes→A が成功する");
    state = res.state;
    res = L.placeItemTwin(state, "frog", "B", 3);
    assert.equal(res.ok, true, "ラウンド4: frog→B が成功する");
    state = res.state;
    assert.equal(L.isBalanced(L.sumWeights(state.leftIds), L.sumTwinRightWeight(state)), true, "ラウンド4: grapes(A)+frog(B) で釣り合う");
  }

  // ラウンド5 (index4): bear+grapes(10) おだい。 cat(5) を A に置いてから corn(3)+carrot(2)
  // を B に足す。 (2026-07-23 レビュー対応で localOverloadMax 5→7 / slipDiff 8 に調整済み。
  // 以前は最初の1手として安全なのが cat のみ (2/14, 14.3%) で、dog(6) は
  // localOverloadMax(5) 超過により一度も置けない「死んだアイテム」だったが、
  // 現在は corn/dog/cat の3種 (6/14, 42.9%) が最初の1手として安全に置ける)。
  {
    let state = { leftIds: L.ROUNDS[4].left.slice(), rightBasketAIds: [], rightBasketBIds: [], trayIds: L.ROUNDS[4].tray.slice() };
    let res = L.placeItemTwin(state, "cat", "A", 4);
    assert.equal(res.ok, true, "ラウンド5: cat→A が成功する");
    state = res.state;
    res = L.placeItemTwin(state, "corn", "B", 4);
    assert.equal(res.ok, true, "ラウンド5: corn→B が成功する");
    state = res.state;
    res = L.placeItemTwin(state, "carrot", "B", 4);
    assert.equal(res.ok, true, "ラウンド5: carrot→B が成功する");
    state = res.state;
    assert.equal(L.isBalanced(L.sumWeights(state.leftIds), L.sumTwinRightWeight(state)), true, "ラウンド5: cat(A)+corn+carrot(B) で釣り合う");
  }
});

// ── 20. createSession / advanceRound のふたご皿対応 ────────────────
section("createSession / advanceRound のふたご皿対応", () => {
  let session = L.createSession();
  assert.deepEqual(session.rightIds, [], "初期セッションは rightIds も初期化されている (後方互換)");
  assert.deepEqual(session.rightBasketAIds, [], "初期セッションは rightBasketAIds も初期化されている");
  assert.deepEqual(session.rightBasketBIds, [], "初期セッションは rightBasketBIds も初期化されている");

  // ラウンド1→2 (単一皿のまま)
  session.rightIds = ["cherry"]; // ダミーで置いてみて advanceRound 後にリセットされるか確認
  session = L.advanceRound(session);
  assert.equal(session.round, 1, "ラウンド2 (index1) に進む");
  assert.equal(L.isTwinRound(session.round), false, "ラウンド2はふたご皿対象外");
  assert.deepEqual(session.rightIds, [], "ラウンド2進行後 rightIds はリセットされている");
  assert.deepEqual(session.rightBasketAIds, [], "ラウンド2進行後 rightBasketAIds もリセットされている");

  // ラウンド2→3 (ふたご皿へ切り替わる)
  session = L.advanceRound(session);
  assert.equal(session.round, 2, "ラウンド3 (index2) に進む");
  assert.equal(L.isTwinRound(session.round), true, "ラウンド3はふたご皿対象");
  assert.deepEqual(session.rightIds, [], "ラウンド3進行後も rightIds は空配列で存在する (両方の形を同時に持つ)");
  assert.deepEqual(session.rightBasketAIds, [], "ラウンド3進行後 rightBasketAIds は空配列");
  assert.deepEqual(session.rightBasketBIds, [], "ラウンド3進行後 rightBasketBIds は空配列");

  // ラウンド3をふたご皿の実解で釣り合わせて次に進める (dog(6)+frog(4)=elephant(10))
  let res = L.placeItemTwin(session, "dog", "A", session.round);
  assert.equal(res.ok, true);
  session.rightBasketAIds = res.state.rightBasketAIds;
  session.trayIds = res.state.trayIds;
  res = L.placeItemTwin(session, "frog", "B", session.round);
  assert.equal(res.ok, true);
  session.rightBasketBIds = res.state.rightBasketBIds;
  session.trayIds = res.state.trayIds;
  assert.equal(L.isSessionBalancedTwin(session), true, "ラウンド3 セッションが isSessionBalancedTwin で釣り合い判定できる");

  session = L.advanceRound(session);
  assert.equal(session.round, 3, "ラウンド4 (index3) に進む");
  assert.equal(L.isTwinRound(session.round), true, "ラウンド4もふたご皿対象");
  assert.deepEqual(session.rightBasketAIds, [], "ラウンド4進行後 rightBasketAIds はリセットされている");
  assert.deepEqual(session.rightBasketBIds, [], "ラウンド4進行後 rightBasketBIds はリセットされている");

  // 最終ラウンドまで進めて finished を確認 (単一皿ラウンド用の経路と同じ挙動を維持)
  session = L.advanceRound(session); // -> round4 (index4)
  assert.equal(session.round, 4);
  session = L.advanceRound(session); // -> finished
  assert.equal(session.finished, true, "5ラウンド目の advanceRound で finished になる");
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

  // localSlip 専用メッセージ・アニメ (仕様書どおりの文言)
  assert.match(gameJs, /こっちのおさらだけ、おもすぎたみたい！/, "localSlip 専用メッセージが実装されている");
  assert.match(gameJs, /is-local-slip/, "localSlip 時にバスケット側の boing アニメクラスが付与される");
  // 全体 slip の既存メッセージは変更されていない
  assert.match(gameJs, /おもすぎたみたい！/, "全体 slip の既存メッセージ「おもすぎたみたい！」は維持されている");

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
