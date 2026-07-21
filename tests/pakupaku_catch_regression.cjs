#!/usr/bin/env node
"use strict";

// ぱくぱくキャッチ 新規実装の回帰テスト。
// NOTE: このタスクのスコープは pakupaku-catch/ ディレクトリ (+本テストファイル) のみで、
// play.html / sw.js への統合は別担当が行う (実装仕様書 §9)。そのため設計仕様書 §8 の
// テストケース9 (play.html GAMES登録・APP_TITLE_MENU_IDS確認) はここでは対象外。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const logicPath = path.join(root, "pakupaku-catch/js/logic.js");
const L = require(logicPath);

const gameJs = read("pakupaku-catch/js/game.js");
const logicJsSrc = read("pakupaku-catch/js/logic.js");
const indexHtml = read("pakupaku-catch/index.html");
const stylesCss = read("pakupaku-catch/styles.css");

// ── 1. ロジック健全性 ──────────────────────────────────────────────
{
  assert.equal(L.spawnIntervalAt(0), 1300, "spawnIntervalAt(0) は 1300ms から始まる");
  assert.ok(L.spawnIntervalAt(60) >= 600, "spawnIntervalAt(60) は下限600ms以上");
  assert.ok(L.spawnIntervalAt(120) >= 600, "spawnIntervalAt(120) でも下限600ms以上 (負値/0にならない)");
  assert.ok(L.spawnIntervalAt(9999) >= 600 && Number.isFinite(L.spawnIntervalAt(9999)), "極端な t でも有限かつ下限クランプ");

  // curveAt: 単調非減少 + 上限クランプ (t=9999 でも有限)
  const sampleTimes = [0, 5, 10, 20, 30, 45, 60, 90, 9999];
  let prevCurve = -Infinity;
  for (const t of sampleTimes) {
    const c = L.curveAt(t);
    assert.ok(Number.isFinite(c), `curveAt(${t}) は有限値`);
    assert.ok(c >= prevCurve - 1e-9, `curveAt は単調非減少であること (t=${t})`);
    assert.ok(c <= 1 + 1e-9, `curveAt は 1 を超えない (t=${t})`);
    prevCurve = c;
  }
  assert.ok(L.curveAt(9999) <= 1, "curveAt(9999) は 1 にクランプされる");

  // fallSpeedAt: 仕様上「線形」補間必須 (spawnInterval/ngRatio の sqrt-ease とは別式)。
  // curveAt を再利用する形の参照式ではなく、 t に対する線形性そのものを直接検証する。
  const FALL_MIN = 0.28, FALL_MAX = 0.50;
  assert.ok(typeof L.fallSpeedAt === "function", "logic.js が fallSpeedAt を公開している");
  let prevFall = -Infinity;
  for (const t of sampleTimes) {
    const f = L.fallSpeedAt(t);
    assert.ok(Number.isFinite(f), `fallSpeedAt(${t}) は有限値`);
    assert.ok(f >= prevFall - 1e-9, "fallSpeedAt は単調非減少であること");
    assert.ok(f <= FALL_MAX + 1e-9 && f >= FALL_MIN - 1e-9, "fallSpeedAt は 0.28〜0.50 にクランプされる");
    prevFall = f;
  }
  assert.equal(L.fallSpeedAt(0), FALL_MIN, "fallSpeedAt(0) は下限0.28から始まる");
  assert.equal(L.fallSpeedAt(60), FALL_MAX, "fallSpeedAt(60) は上限0.50に達する");
  const midExpectedLinear = (FALL_MIN + FALL_MAX) / 2; // t=30 (中間点) は線形なら endpoints の単純平均のはず
  assert.ok(
    Math.abs(L.fallSpeedAt(30) - midExpectedLinear) < 1e-9,
    `fallSpeedAt(30) は線形補間の中間値 ${midExpectedLinear} と一致すること (sqrt-easeだと約0.436になり不一致) got=${L.fallSpeedAt(30)}`
  );

  // ngRatioAt(t) <= 0.30 (全 t)
  for (const t of [-10, 0, 15, 30, 45, 60, 61, 120, 9999]) {
    const ratio = L.ngRatioAt(t);
    assert.ok(ratio <= 0.30 + 1e-9, `ngRatioAt(${t}) は 0.30 を超えない (got ${ratio})`);
    assert.ok(ratio >= 0, `ngRatioAt(${t}) は負値にならない`);
  }
}

// ── 2. 必ず終了する (残機制・ゲームオーバー分岐は存在しない) ──────────
{
  const state = L.createInitialState();
  for (let i = 0; i < 61; i++) {
    // NG連発を混ぜても finished への到達を妨げないことを確認
    if (i % 2 === 0) L.applyCatch(state, "igaguri");
    L.tickTimer(state, 1);
  }
  assert.equal(state.finished, true, "61秒分 tickTimer すると finished === true");
}

// ── 3. NG が罰にならない ────────────────────────────────────────────
{
  const state = L.createInitialState();
  L.tickTimer(state, 5); // combo を積む前提の土台として少し進める
  L.applyCatch(state, "acorn");
  const scoreBeforeNg = state.score;
  const comboBeforeNg = state.combo;
  assert.ok(comboBeforeNg > 0, "前提: OKキャッチでcomboが増えている");

  L.applyCatch(state, "igaguri");
  assert.equal(state.score, scoreBeforeNg, "NGキャッチで score が減らない");
  assert.equal(state.finished, false, "NGキャッチで finished にならない");
  assert.equal(state.combo, 0, "NGキャッチで combo が 0 にリセットされる");
  assert.ok(state.stunUntil > state.elapsed, "NGキャッチで stunUntil (未来の時刻) が設定される");
  assert.ok(L.isStunned ? L.isStunned(state) : true, "NGキャッチ直後はスタン中と判定できる");

  // スタン経過後は再キャッチ可能 (スコアが正常に増える)
  L.tickTimer(state, 3); // stunUntil (elapsed+1.2) を確実に超える
  const scoreBeforeRecover = state.score;
  L.applyCatch(state, "onigiri");
  assert.ok(state.score > scoreBeforeRecover, "スタン経過後、OKキャッチで再び加点される");
  assert.equal(state.combo, 1, "スタン経過後の初回OKキャッチで combo が 1 から再開する");
}

// ── 3b. 終盤NGキャッチ後もスタンが settling 中に固定されない (finished後もtickTimerでelapsed
//        が凍結してstunUntilが解除不能になる回帰の再発防止) ───────────────────────
{
  const state = L.createInitialState();
  L.tickTimer(state, 59.5); // 59.5秒まで進める (finished 直前)
  assert.equal(state.finished, false, "前提: 59.5秒時点ではまだfinishedではない");
  L.applyCatch(state, "igaguri"); // stunUntil = time(59.5) + 1.2 = 60.7 (60を超える)
  assert.ok(state.stunUntil > L.GAME_DURATION, "前提: stunUntilがGAME_DURATION(60)を超えている");
  assert.ok(L.isStunned(state), "NGキャッチ直後はスタン中");

  L.tickTimer(state, 1); // elapsed/time が 60.5 に到達 -> elapsed は60でクランプされ finished=true になる
  assert.equal(state.finished, true, "60秒超過でfinishedになる");
  // 旧実装バグ: tickTimer が finished 到達後に早期returnし state.elapsed (延いてはstun判定の
  // 基準) が60で凍結されるため、 stunUntil(60.7) に永遠に到達できずスタンが解除されなかった。
  // 修正後は state.time が finished後も増え続けるため、 settling中でも正しく解除される。
  assert.ok(L.isStunned(state), "finished直後、まだstunUntil(60.7)未満なのでスタン継続中のはず");

  L.tickTimer(state, 1); // さらに1秒 (time=61.5) 進める。 settling中を模擬。
  assert.ok(!L.isStunned(state), "settling中でも壁時計が進みstunUntilを超えればスタン解除される");
}

// ── 4. スコア計算 ───────────────────────────────────────────────────
{
  const state = L.createInitialState();
  L.applyCatch(state, "acorn"); // combo 0 -> 加点 10+0, combo=1
  assert.equal(state.score, 10, "OKキャッチの基本点が加算される");

  for (let i = 0; i < 15; i++) L.applyCatch(state, "onigiri");
  // combo ボーナスは min(combo, 10) でクランプされている必要がある
  const scoreBefore = state.score;
  L.applyCatch(state, "apple");
  const bonusApplied = state.score - scoreBefore - 10; // apple の基本点10を引いた残りがボーナス
  assert.ok(bonusApplied <= 10, "combo ボーナスは 10 を超えない");
  assert.ok(bonusApplied >= 0, "combo ボーナスは負値にならない");

  const goldenState = L.createInitialState();
  L.applyCatch(goldenState, "golden");
  assert.equal(goldenState.score, 30, "golden キャッチは +30 (combo 0 の場合)");
  assert.equal(goldenState.goldenCatches, 1, "golden キャッチ数が記録される");
}

// ── 5. iOS ドラッグ両対応 (game.js ソース regex) ───────────────────
{
  assert.match(gameJs, /addEventListener\(\s*['"]touchstart['"]/, "touchstart リスナーが存在する");
  assert.match(gameJs, /addEventListener\(\s*['"]touchend['"]/, "touchend リスナーが存在する");
  assert.match(gameJs, /addEventListener\(\s*['"]touchcancel['"]/, "touchcancel リスナーが存在する");
  const hasTouchActionNone = /touch-action:\s*none/.test(stylesCss) || /touch-action:\s*none/.test(indexHtml);
  assert.ok(hasTouchActionNone, "styles.css または index.html に touch-action: none が存在する");
}

// ── 6. 共有モジュール結線 ───────────────────────────────────────────
{
  const scriptSrcOrder = [...indexHtml.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/g)].map(m => m[1]);
  const idxOf = needle => scriptSrcOrder.findIndex(src => src.includes(needle));

  const idxHighscore = idxOf("highscore.js");
  const idxHaptics = idxOf("haptics.js");
  const idxAchievements = idxOf("achievements.js");
  const idxMenu = idxOf("menu.js");
  const idxLogic = idxOf("js/logic.js");
  const idxGame = idxOf("js/game.js");

  for (const [name, idx] of [["highscore.js", idxHighscore], ["haptics.js", idxHaptics], ["achievements.js", idxAchievements], ["menu.js", idxMenu]]) {
    assert.ok(idx !== -1, `${name} が index.html に読み込まれている`);
  }
  assert.ok(idxLogic !== -1, "js/logic.js が index.html に読み込まれている");
  assert.ok(idxGame !== -1, "js/game.js が index.html に読み込まれている");
  assert.ok(idxHighscore < idxLogic && idxHaptics < idxLogic && idxAchievements < idxLogic && idxMenu < idxLogic,
    "共通モジュールは logic.js より前に読み込まれる");
  assert.ok(idxLogic < idxGame, "logic.js は game.js より前に読み込まれる");

  assert.match(gameJs, /saveHighScore\(\s*['"]pakupaku-catch['"]/, "game.js が saveHighScore('pakupaku-catch', ...) を呼ぶ");
  assert.match(gameJs, /showHighScoreTable\(\s*['"]pakupaku-catch['"]/, "game.js が showHighScoreTable('pakupaku-catch', ...) を呼ぶ");
}

// ── 7. 60秒固定・難易度選択なし ─────────────────────────────────────
{
  assert.match(logicJsSrc, /GAME_DURATION\s*=\s*60\b/, "logic.js に GAME_DURATION = 60 (秒) が定義されている");
  assert.doesNotMatch(indexHtml, /diff-btn/, "index.html に難易度選択UI (diff-btn) が存在しない");
}

// ── 8. AR (画像縦横比) 違反禁止 ─────────────────────────────────────
{
  for (const [name, src] of [["styles.css", stylesCss], ["index.html", indexHtml], ["game.js", gameJs]]) {
    assert.doesNotMatch(src, /background-size:\s*100%\s+100%/, `${name} に background-size:100% 100% (stretch) が存在しない`);
    assert.doesNotMatch(src, /object-fit:\s*fill/, `${name} に object-fit:fill (stretch) が存在しない`);
  }
}

// ── 10. インライン script 構文検証 ─────────────────────────────────
{
  // js/logic.js, js/game.js 単体の構文検証
  assert.doesNotThrow(() => new vm.Script(logicJsSrc, { filename: "pakupaku-catch-logic.js" }));
  assert.doesNotThrow(() => new vm.Script(gameJs, { filename: "pakupaku-catch-game.js" }));

  // index.html 内のインライン <script> (src属性なし) を構文検証
  const htmlWithoutComments = indexHtml.replace(/<!--[\s\S]*?-->/g, "");
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  let parsed = 0;
  while ((match = scriptPattern.exec(htmlWithoutComments))) {
    const attrs = match[1] || "";
    if (/\bsrc\s*=/.test(attrs) || /type\s*=\s*["']text\/babel["']/.test(attrs)) continue;
    const body = match[2];
    if (!body.trim()) continue;
    assert.doesNotThrow(() => new vm.Script(body, { filename: "pakupaku-catch-inline-" + parsed + ".js" }));
    parsed += 1;
  }
  assert.ok(parsed >= 1, "index.html に少なくとも1つのインライン script が存在し構文検証された");
}

console.log("pakupaku catch regression: PASS");
