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
    const res = L.placeItem(state, "elephant"); // left=0, right=6, diff=6 >= SLIP_DIFF(5)
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
  const allowed = ["stickerPaste", "gachaTurn3", "superBadgePop"];
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

console.log(`\n全 ${passCount} セクション green.`);
