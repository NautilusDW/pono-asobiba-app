"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "donguri-wakekko/index.html"), "utf8");
const game = fs.readFileSync(path.join(root, "donguri-wakekko/js/game.js"), "utf8");

// ── 純関数ブロックを slice して vm で実行する ──────────────────────────────
// game.js の DOM 制御ブロックは `(function () { if (typeof document === 'undefined')
// return; ... })();` という IIFE で、純関数ブロックはその手前 (トップレベル) にある。
const pureBlockEnd = game.indexOf("(function () {\n  if (typeof document === 'undefined') return;");
assert.ok(pureBlockEnd > 0, "DOM control IIFE marker must be present");
const pureSrc = game.slice(0, pureBlockEnd);

// vm.runInThisContext (NOT vm.createContext/runInNewContext) so the returned
// arrays/objects share this process's Array/Object prototypes. A separate
// context would create a distinct realm, and assert.deepEqual (deepStrictEqual)
// rejects same-shape values from different realms as "not reference-equal".
const wrapped =
  "(function () {\n" + pureSrc +
  "\nreturn { NORMAL_PATTERNS, EASY_PATTERNS, LABELS, pickHint, judgeRound, resolveMatch, canConfirm, moveAcorn, choosePatternPool, argmaxIndex, argminIndex };\n})()";
const {
  NORMAL_PATTERNS,
  EASY_PATTERNS,
  LABELS,
  pickHint,
  judgeRound,
  resolveMatch,
  canConfirm,
  moveAcorn,
  choosePatternPool
} = vm.runInThisContext(wrapped);

// ── 1) パターン健全性 ──────────────────────────────────────────────────────
function assertPatternPool(pool, poolName, requireHonest) {
  assert.ok(Array.isArray(pool) && pool.length > 0, poolName + " must be a non-empty array");
  for (const entry of pool) {
    assert.equal(entry.dist.length, 3, poolName + " dist must have 3 baskets");
    const sum = entry.dist[0] + entry.dist[1] + entry.dist[2];
    assert.equal(sum, 5, poolName + " dist must sum to 5 (got " + sum + ")");
    assert.equal(typeof entry.hintHonest, "boolean", poolName + " hintHonest must be boolean");
    if (requireHonest) {
      assert.equal(entry.hintHonest, true, poolName + " must always be hintHonest:true");
    }
  }
}
assertPatternPool(NORMAL_PATTERNS, "NORMAL_PATTERNS", false);
assertPatternPool(EASY_PATTERNS, "EASY_PATTERNS", true);

// ── 2) カゴ判定 (judgeRound) ────────────────────────────────────────────────
// 代表的な勝ち/負け/同数の分岐を網羅する。
(function testJudgeRound() {
  // 1basket player win, 1basket npc win, 1 tie -> 1-1 draw
  let r = judgeRound([3, 1, 1], [1, 3, 1]);
  assert.deepEqual(r.flags, ["player", "npc", null]);
  assert.equal(r.result, "draw");

  // player wins 2 baskets, npc wins 0 (+1 tie) -> win (旗2本以上)
  r = judgeRound([3, 3, 1], [1, 1, 1]);
  assert.deepEqual(r.flags, ["player", "player", null]);
  assert.equal(r.result, "win");

  // npc wins 2 baskets -> lose
  r = judgeRound([0, 0, 5], [2, 2, 1]);
  assert.deepEqual(r.flags, ["npc", "npc", "player"]);
  assert.equal(r.result, "lose");

  // player wins all 3 -> win
  r = judgeRound([2, 2, 1], [1, 1, 0]);
  assert.deepEqual(r.flags, ["player", "player", "player"]);
  assert.equal(r.result, "win");

  // 全同数 (0-0-3引分) -> draw
  r = judgeRound([1, 2, 2], [1, 2, 2]);
  assert.deepEqual(r.flags, [null, null, null]);
  assert.equal(r.result, "draw");

  // player wins 1, npc wins 1, 1 tie (別配分) -> draw
  r = judgeRound([4, 1, 0], [1, 4, 0]);
  assert.deepEqual(r.flags, ["player", "npc", null]);
  assert.equal(r.result, "draw");

  // npc wins 1, player wins 0, 2 tie -> lose (1本差でも決着する)
  r = judgeRound([1, 2, 2], [3, 2, 2]);
  assert.deepEqual(r.flags, ["npc", null, null]);
  assert.equal(r.result, "lose");
})();

// ── 3) マッチ決着の有限性と救済 (resolveMatch を全順列シミュレート) ─────────
(function testResolveMatchExhaustive() {
  const OUTCOMES = ["win", "lose", "draw"];
  let sawSuddenDeathDrawRescue = false;
  for (const r1 of OUTCOMES) {
    for (const r2 of OUTCOMES) {
      for (const r3 of OUTCOMES) {
        const first3 = [r1, r2, r3];
        const win3 = first3.filter((x) => x === "win").length;
        const lose3 = first3.filter((x) => x === "lose").length;
        const decided = win3 !== lose3;

        if (decided) {
          const expected = win3 > lose3 ? "win" : "lose";
          // サドンデスが無くても (3ラウンドのみで) 正しく決着する
          const result = resolveMatch(first3);
          assert.ok(result === "win" || result === "lose", "resolveMatch must never return anything but win/lose");
          assert.equal(result, expected, "decided-by-3-rounds case must resolve to the round majority");
          continue;
        }

        // 3ラウンドで同数 (タイ) -> サドンデス1ラウンドのみで必ず決着する
        for (const sd of OUTCOMES) {
          const result = resolveMatch(first3.concat([sd]));
          assert.ok(result === "win" || result === "lose", "resolveMatch must never return 'unresolved'");
          if (sd === "win") assert.equal(result, "win");
          else if (sd === "lose") assert.equal(result, "lose");
          else {
            // サドンデス引き分け -> 救済ルールでプレイヤー勝ち
            assert.equal(result, "win");
            sawSuddenDeathDrawRescue = true;
          }
        }

        // サドンデスの結果が未提供 (4番目が存在しない) でも必ず 'win'/'lose' に決着する
        const noSdResult = resolveMatch(first3);
        assert.ok(noSdResult === "win" || noSdResult === "lose");
      }
    }
  }
  assert.ok(sawSuddenDeathDrawRescue, "the sudden-death-draw rescue branch must be exercised by the exhaustive sweep");
})();

// ── 4) ヒント整合 (pickHint) ────────────────────────────────────────────────
(function testPickHint() {
  // hintHonest:true -> argmax (同値は index 最小)
  assert.equal(pickHint({ dist: [3, 1, 1], hintHonest: true }), 0);
  assert.equal(pickHint({ dist: [1, 3, 1], hintHonest: true }), 1);
  assert.equal(pickHint({ dist: [1, 1, 3], hintHonest: true }), 2);
  assert.equal(pickHint({ dist: [2, 2, 1], hintHonest: true }), 0); // tie -> index 最小

  // hintHonest:false -> argmin (同値は index 最小)
  assert.equal(pickHint({ dist: [3, 1, 1], hintHonest: false }), 1);
  assert.equal(pickHint({ dist: [1, 0, 4], hintHonest: false }), 1);
  assert.equal(pickHint({ dist: [0, 2, 3], hintHonest: false }), 0);
  assert.equal(pickHint({ dist: [1, 1, 3], hintHonest: false }), 0); // tie -> index 最小

  // NORMAL_PATTERNS / EASY_PATTERNS の全要素で矛盾がないか
  for (const entry of NORMAL_PATTERNS.concat(EASY_PATTERNS)) {
    const idx = pickHint(entry);
    const expected = entry.hintHonest
      ? entry.dist.indexOf(Math.max.apply(null, entry.dist))
      : entry.dist.indexOf(Math.min.apply(null, entry.dist));
    assert.equal(idx, expected);
  }
})();

// ── 5) 配置不変条件 (canConfirm / moveAcorn) ────────────────────────────────
// NOTE: 実際の DOM 制御ブロックの配置処理 (placeAcornInto / getPlayerDist /
// getTrayCount) はこの moveAcorn を呼び出さず、appendChild ベースの直接 DOM
// 操作で「合計5個保存」を担保している (game.js のコメント参照)。ここでの
// テストは moveAcorn という参照実装の不変条件が正しいことの検証であり、
// placeAcornInto 自体の回帰はカバーしない (DOM/Playwright テストが別途必要)。
(function testPlacementInvariants() {
  assert.equal(canConfirm({ tray: 0, baskets: [2, 2, 1] }), true);
  assert.equal(canConfirm({ tray: 1, baskets: [2, 2, 0] }), false);
  assert.equal(canConfirm({ tray: 5, baskets: [0, 0, 0] }), false);
  assert.equal(canConfirm(null), false);

  let s = { tray: 5, baskets: [0, 0, 0] };
  s = moveAcorn(s, "tray", 0);
  assert.equal(s.tray + s.baskets[0] + s.baskets[1] + s.baskets[2], 5);
  assert.deepEqual(s, { tray: 4, baskets: [1, 0, 0] });

  s = moveAcorn(s, "tray", 0);
  s = moveAcorn(s, 0, 1); // 1個をカゴ0からカゴ1へ移動
  assert.equal(s.tray + s.baskets[0] + s.baskets[1] + s.baskets[2], 5);
  assert.deepEqual(s, { tray: 3, baskets: [1, 1, 0] });

  s = moveAcorn(s, "tray", 2);
  s = moveAcorn(s, "tray", 2);
  s = moveAcorn(s, "tray", 2);
  assert.equal(s.tray, 0);
  assert.equal(s.baskets[0] + s.baskets[1] + s.baskets[2], 5);
  assert.equal(canConfirm(s), true);

  // 空の場所から移動しても合計は保存される (no-op)
  const before = { tray: 0, baskets: [5, 0, 0] };
  const after = moveAcorn(before, 1, 2);
  assert.deepEqual(after, { tray: 0, baskets: [5, 0, 0] });
})();

// ── 6) 救済分岐 (choosePatternPool) ─────────────────────────────────────────
(function testChoosePatternPool() {
  assert.equal(choosePatternPool(0), NORMAL_PATTERNS);
  assert.equal(choosePatternPool(1), NORMAL_PATTERNS);
  assert.equal(choosePatternPool(2), EASY_PATTERNS);
  assert.equal(choosePatternPool(3), EASY_PATTERNS);
})();

// ── 7) index.html 構造 ──────────────────────────────────────────────────────
(function testIndexHtmlStructure() {
  assert.match(
    html,
    /#app\{visibility:hidden\}body\.pono-game-ready #app\{visibility:visible\}/,
    "the FOUC guard must depend on pono-game-ready"
  );
  assert.match(html, /<script src="\.\.\/common\/tier\.js"><\/script>/);
  assert.match(html, /<script src="\.\.\/common\/treasure\.js"><\/script>/);
  assert.match(html, /<script src="\.\.\/common\/haptics\.js"><\/script>/);
  assert.match(html, /<script src="\.\.\/common\/narration\.js"><\/script>/);
})();

// ── 7b) hidden 属性が CSS の display 宣言に負けないこと ──────────────────
// 2026-07-22 事故: .overlay-screen/.board-screen の無条件 display:flex が
// UA stylesheet の [hidden]{display:none} をカスケードで打ち消し、title/result
// オーバーレイが常時同時表示になった。author CSS 側の [hidden] !important
// ガードの存在を検証する。
(function testHiddenAttributeCssGuard() {
  const css = fs.readFileSync(path.join(root, "donguri-wakekko/styles.css"), "utf8");
  assert.match(
    css,
    /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/,
    "styles.css must contain a [hidden]{display:none !important} guard"
  );
  // 3画面が index.html 上で hidden 制御の対象として存在すること
  assert.match(html, /<section id="board" class="board-screen" hidden>/);
  assert.match(html, /<section id="resultScreen" class="overlay-screen" hidden>/);
  assert.match(html, /<section id="titleScreen" class="overlay-screen">(?!\s*hidden)/);
  // 横画面プロンプト (§2) の存在確認
  assert.match(html, /id="landscape-notice"/);
})();

// ── 8) 禁止 API 不使用 ──────────────────────────────────────────────────────
(function testForbiddenApiUsage() {
  assert.equal(/highscore/i.test(game), false, "game.js must not reference highscore.js");

  // showTreasure は公開 API 形 (window.showTreasure( / showTreasure() のみ、
  // treasure.js 内部専用の _startTreasure は参照しない。
  assert.equal(/_startTreasure/.test(game), false);
  assert.match(game, /window\.showTreasure\(\{/);

  // Haptics は許可済みパターン名のみ使用する。
  const fireCalls = game.match(/Haptics\.fire\('([a-zA-Z0-9_]+)'\)/g) || [];
  assert.ok(fireCalls.length > 0, "game.js should call Haptics.fire at least once");
  const allowedPatterns = ["stickerPaste", "gachaTurn3", "superBadgePop"];
  for (const call of fireCalls) {
    const m = call.match(/Haptics\.fire\('([a-zA-Z0-9_]+)'\)/);
    assert.ok(allowedPatterns.indexOf(m[1]) >= 0, "unexpected Haptics pattern used: " + m[1]);
  }

  // common/haptics.js 側のパターン名一覧と突き合わせて存在確認 (haptics.js 未変更前提)。
  const hapticsSrc = fs.readFileSync(path.join(root, "common/haptics.js"), "utf8");
  for (const p of allowedPatterns) {
    assert.ok(hapticsSrc.indexOf(p) >= 0, "pattern " + p + " must exist in common/haptics.js");
  }
})();

// ── 9) play.html 登録 ──────────────────────────────────────────────────────
// donguri-wakekko/ 配下は本タスクのスコープ内だが、GAMES 配列への登録
// (play.html) も本チェンジセットで実際に追加されたため、その内容が
// 仕様書 §5 のフォーマット (comingSoon:true / debugPlayable:true /
// tier:'app' / href:'donguri-wakekko/') を満たすことをここで検証する。
(function testPlayHtmlRegistration() {
  const playHtmlPath = path.join(root, "play.html");
  const playHtml = fs.readFileSync(playHtmlPath, "utf8");
  const idIdx = playHtml.indexOf("id: 'donguri-wakekko'");
  assert.ok(idIdx >= 0, "play.html must register a GAMES entry with id: 'donguri-wakekko'");

  // エントリ全体 (次の "id:" 出現手前まで、または適当な余裕を持った範囲) を slice する。
  const entryEnd = playHtml.indexOf("id:", idIdx + 1);
  const entry = playHtml.slice(idIdx, entryEnd > 0 ? entryEnd : idIdx + 800);

  assert.match(entry, /href:\s*'donguri-wakekko\/'/, "GAMES entry must link href: 'donguri-wakekko/'");
  assert.match(entry, /comingSoon:\s*true/, "GAMES entry must set comingSoon:true");
  assert.match(entry, /debugPlayable:\s*true/, "GAMES entry must set debugPlayable:true");
  assert.match(entry, /tier:\s*'app'/, "GAMES entry must set tier:'app'");
})();

// ── 10) 数字非表示 (LABELS に算用数字を含めない) ────────────────────────────
(function testNoDigitsInLabels() {
  const digitRe = /[0-9０-９]/;
  for (const key of Object.keys(LABELS)) {
    assert.equal(digitRe.test(LABELS[key]), false, "LABELS." + key + " must not contain digits: " + LABELS[key]);
  }
})();

console.log("donguri wakekko regression: PASS");
