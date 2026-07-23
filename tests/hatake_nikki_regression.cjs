#!/usr/bin/env node
"use strict";

// ポノのはたけにっき 新規実装の回帰テスト。
// NOTE: このタスクのスコープは hatake-nikki/ ディレクトリ (+本テストファイル) のみ。
// play.html / sw.js への統合は別担当が行う。ただし §18 (play.html 統合検証) だけは
// donguri-wakekko の APP_TITLE_MENU_IDS 登録漏れ再発防止テストとして事前に用意しておく。
// 統合が未実施の間は該当セクションが skip される。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const logicPath = path.join(root, "hatake-nikki/js/logic.js");
const L = require(logicPath);

const gameJs = read("hatake-nikki/js/game.js");
const logicJsSrc = read("hatake-nikki/js/logic.js");
const indexHtml = read("hatake-nikki/index.html");
const stylesCss = read("hatake-nikki/styles.css");

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

// ── 1. API 存在 ──────────────────────────────────────────────────────
{
  const fns = [
    "getNow", "setNowForTest", "dateKey", "addDaysKey", "daysBetween", "hashCode",
    "createInitialState", "emptyPlot", "stageOf", "plantSeed", "waterPlot", "shooBug",
    "harvest", "bugShouldSpawn", "advanceOneDay", "catchUpDays", "normalizeState"
  ];
  for (const name of fns) {
    assert.equal(typeof L[name], "function", `HatakeLogic.${name} は関数`);
  }
  assert.equal(typeof L.CROPS, "object", "HatakeLogic.CROPS は定義済み");
  assert.ok(L.CROPS.ninjin && L.CROPS.tomato, "CROPS に ninjin/tomato が存在する");
}

// ── 2. 時刻注入 + Date 直接呼び出し禁止 (regex) ─────────────────────
{
  L.setNowForTest(new Date(2026, 6, 22, 9, 0));
  const now = L.getNow();
  assert.equal(now.getFullYear(), 2026);
  assert.equal(now.getMonth(), 6);
  assert.equal(now.getDate(), 22);
  L.setNowForTest(null);
  const real = L.getNow();
  assert.ok(Math.abs(real.getTime() - Date.now()) < 5000, "setNowForTest(null) で実時刻に戻る");

  // logic.js: getNow/dateKey ユーティリティ内 (許可された1箇所) 以外に new Date(/Date.now( が
  // 無秩序に散らばっていないことを軽く確認する (getNow 自身の実装行のみ許可)。
  const dateOccurrences = (logicJsSrc.match(/new Date\(|Date\.now\(/g) || []).length;
  assert.ok(dateOccurrences >= 1 && dateOccurrences <= 10, "logic.js の new Date(/Date.now( 使用は getNow 系ユーティリティ内に限定される");

  // game.js: Date 直接生成は一切禁止 (getNow() 経由のみ許可)。
  assert.equal((gameJs.match(/new Date\(|Date\.now\(/g) || []).length, 0, "game.js に new Date(/Date.now( の直接呼び出しが無い");
}

// ── 3. dateKey 健全性 ────────────────────────────────────────────────
{
  assert.equal(L.addDaysKey("2026-01-31", 1), "2026-02-01", "月末跨ぎ");
  assert.equal(L.addDaysKey("2025-12-31", 1), "2026-01-01", "年跨ぎ");
  assert.equal(L.addDaysKey("2026-03-01", -1), "2026-02-28", "月末跨ぎ (逆方向)");

  for (const [key, n] of [["2026-07-01", 1], ["2026-07-01", 7], ["2026-07-01", 30], ["2026-02-27", 3]]) {
    const shifted = L.addDaysKey(key, n);
    assert.equal(L.daysBetween(key, shifted), n, `daysBetween(${key}, +${n}) は ${n} と対称`);
  }
  assert.equal(L.daysBetween("2026-07-05", "2026-07-05"), 0, "同日は0");
  assert.equal(L.daysBetween("2026-07-05", "2026-07-01"), -4, "過去方向は負値");

  // コメントで toISOString 禁止に言及するのは許容するが、実際に呼び出す (.toISOString() ) のは禁止。
  assert.doesNotMatch(logicJsSrc, /\.toISOString\(/, "logic.js は toISOString を呼び出さない (UTCズレ防止、ローカル日付のみ)");
  assert.doesNotMatch(gameJs, /\.toISOString\(/, "game.js は toISOString を呼び出さない");
}

// ── 4. 成長段階マッピング ────────────────────────────────────────────
{
  function plotWith(seedId, daysGrown) {
    return { seedId: seedId, daysGrown: daysGrown, wateredToday: false, wilted: false, bug: false };
  }
  const ninjinExpected = { 0: 0, 1: 1, 2: 2, 3: 2, 4: 3, 10: 3 };
  for (const [dg, expected] of Object.entries(ninjinExpected)) {
    assert.equal(L.stageOf(plotWith("ninjin", Number(dg))), expected, `ninjin daysGrown=${dg} -> stage ${expected}`);
  }
  // tomato は閾値 [1,2,3] なので3日目で stage3 に到達 (ninjinより1日早い)
  assert.equal(L.stageOf(plotWith("tomato", 3)), 3, "tomato は3日で stage3");
  assert.equal(L.stageOf(plotWith("tomato", 2)), 2, "tomato は2日で stage2");
  assert.equal(L.stageOf(L.emptyPlot()), -1, "未植栽 plot は stage -1");
}

// ── 5. 基本1日進行 ───────────────────────────────────────────────────
{
  const s = L.createInitialState("2026-07-01");
  assert.ok(L.plantSeed(s, 0, "ninjin"), "空plotへの種まきは成功する");
  assert.ok(!L.plantSeed(s, 0, "tomato"), "既に植栽済みのplotへの重複種まきは失敗する");
  assert.ok(L.waterPlot(s, 0), "水やり成功");
  L.advanceOneDay(s, "2026-07-02");
  assert.equal(s.plots[0].daysGrown, 1, "水やり済みなら daysGrown+1");
  assert.equal(s.plots[0].wateredToday, false, "wateredToday はロールオーバーでリセットされる");
  assert.equal(s.plots[0].wilted, false, "水やり済みなら wilted にならない");
}

// ── 6. 【最重要】複数日キャッチアップの逐次一貫性 ───────────────────
{
  function buildScenario() {
    const s = L.createInitialState("2026-07-01");
    L.plantSeed(s, 0, "ninjin");
    L.waterPlot(s, 0);
    L.plantSeed(s, 1, "tomato");
    // plot1 は水やりしない (wilted 誘発シナリオ)
    return s;
  }

  for (const n of [3, 7, 30]) {
    const a = buildScenario();
    const b = buildScenario();

    const result = L.catchUpDays(a, L.addDaysKey("2026-07-01", n));
    assert.equal(result.daysPassed, n, `catchUpDays daysPassed === ${n}`);

    let k = "2026-07-01";
    for (let i = 0; i < n; i++) {
      k = L.addDaysKey(k, 1);
      L.advanceOneDay(b, k);
    }

    assert.deepEqual(a, b, `catchUpDays(${n}日) と advanceOneDay手動${n}回の結果が完全一致 (bugの決定論ハッシュ含む)`);
  }
}

// ── 7. 優しい設計 (枯れない) ─────────────────────────────────────────
{
  const s = L.createInitialState("2026-07-01");
  L.plantSeed(s, 0, "ninjin");
  L.waterPlot(s, 0);
  L.advanceOneDay(s, "2026-07-02"); // stage1 まで進める
  L.waterPlot(s, 0);
  L.advanceOneDay(s, "2026-07-03"); // stage2 (daysGrown=2)
  const daysGrownBeforeNeglect = s.plots[0].daysGrown;
  const seedIdBeforeNeglect = s.plots[0].seedId;

  let k = "2026-07-03";
  for (let i = 0; i < 30; i++) {
    k = L.addDaysKey(k, 1);
    L.advanceOneDay(s, k); // 水やりしないまま30日放置
  }
  assert.equal(s.plots[0].wilted, true, "30日放置で wilted になる");
  assert.equal(s.plots[0].daysGrown, daysGrownBeforeNeglect, "daysGrown は放置しても後退しない");
  assert.equal(s.plots[0].seedId, seedIdBeforeNeglect, "seedId は維持される (枯れて消えない)");
  assert.ok(L.stageOf(s.plots[0]) >= 2, "stage は後退しない");

  assert.ok(L.waterPlot(s, 0), "放置後でも当日水やりできる");
  assert.equal(s.plots[0].wilted, false, "水やりで即座に wilted 解消");
}

// ── 8. 水やり冪等 ────────────────────────────────────────────────────
{
  const s = L.createInitialState("2026-07-01");
  L.plantSeed(s, 0, "ninjin");
  L.waterPlot(s, 0);
  L.waterPlot(s, 0); // 同日2回目
  L.waterPlot(s, 0); // 同日3回目
  L.advanceOneDay(s, "2026-07-02");
  assert.equal(s.plots[0].daysGrown, 1, "同日複数回の水やりでも翌日+1のみ (二重加算されない)");
}

// ── 9. 時計巻き戻しガード ────────────────────────────────────────────
{
  const s = L.createInitialState("2026-07-10");
  const before = clone(s);
  const result = L.catchUpDays(s, "2026-07-05"); // 過去のkey
  assert.equal(result.daysPassed, 0, "時計巻き戻しは daysPassed=0 (no-op)");
  assert.deepEqual(s, before, "時計巻き戻しで state は不変");
  assert.doesNotThrow(() => L.catchUpDays(s, "2026-07-05"), "時計巻き戻しで例外が発生しない");

  const same = L.catchUpDays(s, "2026-07-10");
  assert.equal(same.daysPassed, 0, "同日再オープンも no-op");
}

// ── 10. 虫の決定論と無害性 ───────────────────────────────────────────
{
  const s = L.createInitialState("2026-07-01");
  L.plantSeed(s, 0, "ninjin");
  const seedPlot = s.plots[0]; // stage0 (たね)
  assert.equal(L.bugShouldSpawn("2026-07-02", 0, seedPlot), false, "たね (stage0) には虫が湧かない");

  const grownPlot = { seedId: "ninjin", daysGrown: 2, wateredToday: false, wilted: false, bug: false };
  const r1 = L.bugShouldSpawn("2026-07-02", 0, grownPlot);
  const r2 = L.bugShouldSpawn("2026-07-02", 0, grownPlot);
  assert.equal(r1, r2, "bugShouldSpawn は同一入力で常に同値 (決定論的)");

  // 虫がいても daysGrown の進みは wateredToday 通り (虫は成長を阻害しない)
  const s2 = L.createInitialState("2026-07-01");
  L.plantSeed(s2, 0, "ninjin");
  L.waterPlot(s2, 0);
  L.advanceOneDay(s2, "2026-07-02");
  L.waterPlot(s2, 0);
  const beforeDG = s2.plots[0].daysGrown;
  s2.plots[0].bug = true; // 強制的に虫を立てる
  L.advanceOneDay(s2, "2026-07-03");
  assert.equal(s2.plots[0].daysGrown, beforeDG + 1, "虫がいても水やり済みなら通常通り daysGrown+1");

  assert.ok(L.shooBug(s2, 0), "shooBug は成功する");
  assert.equal(s2.plots[0].bug, false, "shooBug 後 bug は false");
}

// ── 11. 収穫 ─────────────────────────────────────────────────────────
{
  const s = L.createInitialState("2026-07-01");
  L.plantSeed(s, 0, "tomato");
  s.plots[0].daysGrown = 2; // stage2 (まだ収穫不可)
  let res = L.harvest(s, 0);
  assert.equal(res.ok, false, "stage<3 では収穫失敗");
  assert.equal(s.plots[0].seedId, "tomato", "収穫失敗時は plot 不変");

  s.plots[0].daysGrown = 3; // stage3
  res = L.harvest(s, 0);
  assert.equal(res.ok, true, "stage3 で収穫成功");
  assert.equal(res.seedId, "tomato", "収穫結果に seedId が含まれる");
  assert.deepEqual(s.plots[0], L.emptyPlot(), "収穫後 plot は空に戻る");

  const res2 = L.harvest(s, 0);
  assert.equal(res2.ok, false, "空plotの二重収穫は不可");
}

// ── 12. 【実DOM相当】画面遷移 .show 適用検証 (vm slice) ─────────────
{
  const marker = "(function () {\n  if (typeof document === 'undefined') return;";
  const pureBlockEnd = gameJs.indexOf(marker);
  assert.ok(pureBlockEnd > 0, "DOM control IIFE marker must be present in game.js");
  const pureSrc = gameJs.slice(0, pureBlockEnd);

  const wrapped = "(function () {\n" + pureSrc + "\nreturn { createScreenController };\n})()";
  const { createScreenController } = vm.runInThisContext(wrapped);
  assert.equal(typeof createScreenController, "function", "createScreenController が純関数として抽出できる");

  // 本物の classList 意味論を持つスタブ要素 (Set ベース)
  function makeStubEl() {
    const set = new Set();
    return {
      classList: {
        add: cls => set.add(cls),
        remove: cls => set.delete(cls),
        contains: cls => set.has(cls)
      }
    };
  }
  const screens = {
    "start-screen": makeStubEl(),
    "field-screen": makeStubEl(),
    "diary-overlay": makeStubEl(),
    "zukan-overlay": makeStubEl()
  };
  screens["start-screen"].classList.add("show"); // 初期状態相当

  const ctl = createScreenController(screens);
  ctl.show("field-screen");
  assert.equal(screens["field-screen"].classList.contains("show"), true, "show('field-screen') 後 field-screen に show が付く");
  assert.equal(screens["start-screen"].classList.contains("show"), false, "show('field-screen') 後 start-screen から show が外れる (排他)");

  ctl.show("zukan-overlay");
  assert.equal(screens["zukan-overlay"].classList.contains("show"), true, "overlay系は show() で show が付く");
  assert.equal(screens["field-screen"].classList.contains("show"), true, "overlay表示中も field-screen の show は維持される");

  ctl.hide("zukan-overlay");
  assert.equal(screens["zukan-overlay"].classList.contains("show"), false, "hide() で show が外れる");
}

// ── 13. CSS カスケード静的検証 ───────────────────────────────────────
{
  assert.match(stylesCss, /\.screen\s*\{[^}]*display:\s*none/, ".screen ベースが display:none");
  assert.match(stylesCss, /\.screen\.show\s*\{[^}]*display:\s*flex/, ".screen.show が display:flex");
  assert.match(stylesCss, /#stage\s*\[hidden\]\s*\{[^}]*display:\s*none\s*!important/, "#stage [hidden] の保険ガードが存在する");

  assert.doesNotMatch(indexHtml, /class="screen[^"]*"[^>]*hidden/, "index.html の .screen 要素は hidden 属性を使っていない");
  assert.match(indexHtml, /id="start-screen"\s+class="screen show"/, "#start-screen は初期状態から class=\"screen show\"");
}

// ── 14. 横画面 (16:9) 強制 ──────────────────────────────────────────
{
  assert.match(indexHtml, /よこむき/, "landscape-notice が『よこむき』を促す");
  assert.doesNotMatch(indexHtml, /たてむき/, "縦持ち強制の文言が無い");
  // 2026-07-23 修正: viewport 縦横比 (innerHeight >= innerWidth) のみによる誤検知の
  // 再発防止。0x0/未確定 viewport を portrait 誤判定する `>=` パターンは禁止。
  assert.doesNotMatch(gameJs, /innerHeight\s*>=\s*window\.innerWidth/, "game.js は誤検知しやすい innerHeight>=innerWidth 判定を使わない (退行検知)");
  assert.match(gameJs, /function isPortraitNow/, "game.js に isPortraitNow (物理向き優先判定) 関数が定義されている");
  assert.match(gameJs, /screen\.orientation/, "game.js が screen.orientation (物理向き) を参照する");
  assert.match(gameJs, /orientation:\s*portrait/, "game.js が matchMedia('(orientation: portrait)') フォールバックを持つ");
  assert.match(gameJs, /addEventListener\('pageshow'/, "game.js が pageshow (bfcache 復帰) で再評価する");
  assert.match(stylesCss, /16\s*\/\s*9/, "styles.css の #stage が 16:9 比率を使っている");

  // isPortraitNow を vm で slice して境界値を直接検証する。
  const marker = "(function () {\n  if (typeof document === 'undefined') return;";
  const pureBlockEnd = gameJs.indexOf(marker);
  assert.ok(pureBlockEnd > 0, "DOM control IIFE marker must be present in game.js");
  const fnStart = gameJs.indexOf("function isPortraitNow");
  assert.ok(fnStart > pureBlockEnd, "isPortraitNow は DOM 制御ブロック内に定義されている");
  const fnEndMarker = "\n  function updateLandscapeNotice";
  const fnEnd = gameJs.indexOf(fnEndMarker, fnStart);
  assert.ok(fnEnd > fnStart, "isPortraitNow の終端 (updateLandscapeNotice 開始) が見つかる");
  const isPortraitSrc = gameJs.slice(fnStart, fnEnd);

  function evalIsPortraitNow(win) {
    const sandbox = { window: win, screen: win.screen, matchMedia: win.matchMedia || (() => { throw new Error('no matchMedia'); }) };
    // portraitMQ はテスト対象外 (screen.orientation 優先経路 / fail-open 経路のみ検証)
    sandbox.portraitMQ = win.portraitMQ !== undefined ? win.portraitMQ : null;
    const wrapped = "(function () {\n  var portraitMQ = sandbox_portraitMQ;\n" + isPortraitSrc + "\n  return isPortraitNow();\n})()";
    const ctx = vm.createContext({ window: win, screen: win.screen, matchMedia: sandbox.matchMedia, sandbox_portraitMQ: sandbox.portraitMQ });
    return vm.runInContext(wrapped, ctx);
  }

  // (1) 物理向き最優先: viewport 数値が portrait でも screen.orientation が landscape なら false
  assert.equal(
    evalIsPortraitNow({ screen: { orientation: { type: 'landscape-primary' } }, innerWidth: 375, innerHeight: 667 }),
    false,
    "screen.orientation.type=landscape-primary なら viewport が縦長でも landscape 判定"
  );
  // (2) orientation API なし・viewport 未確定 (0x0) は fail-open で landscape 扱い
  assert.equal(
    evalIsPortraitNow({ screen: {}, innerWidth: 0, innerHeight: 0, matchMedia: () => { throw new Error('no MQ'); } }),
    false,
    "0x0 未確定 viewport は fail-open で landscape (非表示) 扱い"
  );
  // (3) 通常のランドスケープ viewport
  assert.equal(
    evalIsPortraitNow({ screen: {}, innerWidth: 667, innerHeight: 375, matchMedia: () => { throw new Error('no MQ'); } }),
    false,
    "667x375 (ランドスケープ) は false"
  );
  // (4) 通常のポートレート viewport
  assert.equal(
    evalIsPortraitNow({ screen: {}, innerWidth: 375, innerHeight: 667, matchMedia: () => { throw new Error('no MQ'); } }),
    true,
    "375x667 (ポートレート) は true"
  );
  // (5) 正方形は landscape 扱い (厳密不等号)
  assert.equal(
    evalIsPortraitNow({ screen: {}, innerWidth: 800, innerHeight: 800, matchMedia: () => { throw new Error('no MQ'); } }),
    false,
    "800x800 (正方形) は厳密不等号により false (landscape 扱い)"
  );
}

// ── 15. iOS タッチ対策 ───────────────────────────────────────────────
{
  assert.match(gameJs, /touchstart/, "game.js に touchstart リスナーが存在する");
  assert.match(gameJs, /touchend/, "game.js に touchend リスナーが存在する");
  assert.match(gameJs, /touchcancel/, "game.js に touchcancel リスナーが存在する");
  assert.match(stylesCss + indexHtml, /touch-action:\s*none/, "touch-action:none が指定されている");
}

// ── 16. AR (画像縦横比) 違反禁止 ─────────────────────────────────────
{
  for (const [name, src] of [["styles.css", stylesCss], ["index.html", indexHtml], ["game.js", gameJs]]) {
    assert.doesNotMatch(src, /background-size:\s*100%\s+100%/, `${name} に background-size:100% 100% (stretch) が存在しない`);
    assert.doesNotMatch(src, /object-fit:\s*fill/, `${name} に object-fit:fill (stretch) が存在しない`);
  }
  assert.match(stylesCss, /object-fit:\s*contain/, "styles.css が object-fit:contain を使っている");
}

// ── 17. モジュール結線 ───────────────────────────────────────────────
{
  const idxOf = name => indexHtml.indexOf(name);
  const idxHaptics = idxOf("haptics.js");
  const idxMenu = idxOf("menu.js");
  const idxTreasure = idxOf("treasure.js");
  const idxLogic = idxOf("js/logic.js");
  const idxGame = idxOf("js/game.js");

  for (const [name, idx] of [["haptics.js", idxHaptics], ["menu.js", idxMenu], ["treasure.js", idxTreasure]]) {
    assert.ok(idx !== -1, `${name} が index.html に読み込まれている`);
  }
  assert.ok(idxLogic !== -1, "js/logic.js が index.html に読み込まれている");
  assert.ok(idxGame !== -1, "js/game.js が index.html に読み込まれている");
  assert.ok(idxHaptics < idxLogic && idxMenu < idxLogic && idxTreasure < idxLogic, "共通モジュールは logic.js より前に読み込まれる");
  assert.ok(idxLogic < idxGame, "logic.js は game.js より前に読み込まれる");

  assert.match(gameJs, /window\.showTreasure\(\{/, "game.js が window.showTreasure({ を呼ぶ");
  assert.match(gameJs, /pono_hatake_state_v1/, "game.js に localStorage キー pono_hatake_state_v1 が存在する");
  assert.match(gameJs, /pono_hatake_zukan_v1/, "game.js に localStorage キー pono_hatake_zukan_v1 が存在する");
  assert.match(logicJsSrc + gameJs, /cloud-sync.*スコープ外/, "cloud-sync スコープ外コメントが存在する");
}

// ── 18. play.html 統合ガード (登録漏れ再発防止) ──────────────────────
{
  const playHtmlPath = path.join(root, "play.html");
  if (fs.existsSync(playHtmlPath)) {
    const playHtml = fs.readFileSync(playHtmlPath, "utf8");
    const hasGamesEntry = /id:\s*['"]hatake-nikki['"]/.test(playHtml);
    if (hasGamesEntry) {
      const menuIdsMatch = playHtml.match(/APP_TITLE_MENU_IDS\s*=\s*\[([\s\S]*?)\]/);
      assert.ok(menuIdsMatch, "play.html に APP_TITLE_MENU_IDS 配列が見つかる");
      assert.match(menuIdsMatch[1], /['"]hatake-nikki['"]/, "APP_TITLE_MENU_IDS 配列内に 'hatake-nikki' が含まれる (登録漏れ厳禁)");
    } else {
      console.log("  (skip: play.html への hatake-nikki 統合は未実施。統合担当のタスク)");
    }
  } else {
    console.log("  (skip: play.html が見つからない)");
  }
}

// ── 19. 構文検証 ─────────────────────────────────────────────────────
{
  assert.doesNotThrow(() => new vm.Script(logicJsSrc, { filename: "hatake-nikki-logic.js" }));
  assert.doesNotThrow(() => new vm.Script(gameJs, { filename: "hatake-nikki-game.js" }));

  const htmlWithoutComments = indexHtml.replace(/<!--[\s\S]*?-->/g, "");
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  let parsed = 0;
  while ((match = scriptPattern.exec(htmlWithoutComments))) {
    const attrs = match[1] || "";
    if (/\bsrc\s*=/.test(attrs) || /type\s*=\s*["']text\/babel["']/.test(attrs)) continue;
    const body = match[2];
    if (!body.trim()) continue;
    assert.doesNotThrow(() => new vm.Script(body, { filename: "hatake-nikki-inline-" + parsed + ".js" }));
    parsed += 1;
  }
  assert.ok(parsed >= 1, "index.html に少なくとも1つのインライン script が存在し構文検証された");
}

// ── 20. セーブ復元耐性 (normalizeState) ──────────────────────────────
{
  assert.doesNotThrow(() => L.normalizeState(null), "null を渡してもクラッシュしない");
  assert.doesNotThrow(() => L.normalizeState(undefined), "undefined を渡してもクラッシュしない");
  assert.doesNotThrow(() => L.normalizeState({}), "空オブジェクトを渡してもクラッシュしない");
  assert.doesNotThrow(() => L.normalizeState({ plots: "not-an-array" }), "plots が配列でなくてもクラッシュしない");
  assert.doesNotThrow(() => L.normalizeState({ plots: [{ seedId: "unknown-crop", daysGrown: -5 }] }), "未知フィールド/不正値を含んでもクラッシュしない");
  assert.doesNotThrow(() => L.normalizeState({ lastSeenKey: 12345, plots: [null, undefined, {}] }), "plots 欠損/型不正でもクラッシュしない");

  const normalized = L.normalizeState({ plots: [{ seedId: "ninjin", daysGrown: 2, wateredToday: true, wilted: false, bug: true }] });
  assert.equal(normalized.plots.length, 3, "normalizeState は常に3枠の plots を返す");
  assert.equal(normalized.plots[0].seedId, "ninjin", "妥当なフィールドは保持される");
  assert.equal(normalized.plots[1].seedId, null, "欠損 plot は emptyPlot 相当になる");
  assert.equal(normalized.plots[2].seedId, null, "欠損 plot は emptyPlot 相当になる");

  const badCrop = L.normalizeState({ plots: [{ seedId: "unknown-crop", daysGrown: 5 }] });
  assert.equal(badCrop.plots[0].seedId, null, "未知の seedId は emptyPlot 相当に丸められる");
}

// ── 21. チュートリアル CSS 存在検証 (レビュー指摘: tut-dim/tut-bubble/.hidden 定義漏れ) ──
{
  assert.match(stylesCss, /\.tut-dim\s*\{[^}]*position:\s*fixed/, "styles.css に .tut-dim の position:fixed 定義がある");
  assert.match(stylesCss, /\.tut-dim\.hidden\s*\{[^}]*display:\s*none/, "styles.css に .tut-dim.hidden { display:none } がある");
  assert.match(stylesCss, /\.tut-bubble\s*\{[^}]*position:\s*fixed/, "styles.css に .tut-bubble の position:fixed 定義がある");
  assert.match(stylesCss, /\.tut-bubble\.hidden\s*\{[^}]*display:\s*none/, "styles.css に .tut-bubble.hidden { display:none } がある");
  assert.match(stylesCss, /\.tut-next-btn\s*\{/, "styles.css に .tut-next-btn の定義がある");
}

// ── 22. 水やりゲージが実際に width を書き換えることの検証 ────────────
{
  assert.match(gameJs, /gaugeFillEl\.style\.width\s*=\s*['"]100%['"]/, "game.js が gaugeFillEl.style.width を '100%' にセットする箇所がある");
  assert.match(gameJs, /gaugeFillEl\.style\.width\s*=\s*['"]0%['"]/, "game.js が gaugeFillEl.style.width を '0%' にリセットする箇所がある");
  assert.match(stylesCss, /\.water-gauge-fill\s*\{[^}]*transition:\s*width\s+800ms/, "styles.css の water-gauge-fill が 800ms の transition (長押し時間と一致) を持つ");
}

// ── 23. 種ピッカーに閉じる導線が存在すること (トラップ化防止) ──────────
{
  assert.match(indexHtml, /id="seed-picker-close-btn"/, "index.html の #seed-picker に閉じるボタンが存在する");
  assert.match(gameJs, /seed-picker-close-btn/, "game.js が #seed-picker-close-btn にリスナーを付けている");
  assert.match(gameJs, /function closeSeedPicker/, "game.js に closeSeedPicker 関数が定義されている");
  assert.match(gameJs, /screenCtl\.hide\('seed-picker'\)/, "closeSeedPicker が screenCtl.hide('seed-picker') を呼ぶ");
}

// ── 24. #field-bg 幽霊アセット撤去 (レイアウト崩れバグ1-A修正) ──────────
{
  assert.doesNotMatch(indexHtml, /field-bg/, "index.html に field-bg という文字列が存在しない");
  assert.doesNotMatch(stylesCss, /yard\/hatake\.png/, "styles.css に yard/hatake.png 参照が存在しない (hatake_crop は許可)");
  assert.match(stylesCss, /yard\/hatake_crop\.png/, "styles.css は hatake_crop.png (畝アセット) を引き続き参照する");
}

// ── 25. #tool-rail と .plot[data-plot="2"] の重なり解消 (レイアウト崩れバグ1-B修正) ──
{
  const railMatch = stylesCss.match(/#tool-rail\s*\{[^}]*\}/);
  assert.ok(railMatch, "#tool-rail のブロックが見つかる");
  const railBlock = railMatch[0];
  const railRightMatch = railBlock.match(/right:\s*([\d.]+)%/);
  const railWidthMatch = railBlock.match(/width:\s*([\d.]+)%/);
  assert.ok(railRightMatch && railWidthMatch, "#tool-rail の right/width が%指定で見つかる");
  const railRight = Number(railRightMatch[1]);
  const railWidth = Number(railWidthMatch[1]);
  const railLeftEdge = 100 - railRight - railWidth; // レール左端 (% from left)

  const plot2Match = stylesCss.match(/\.plot\[data-plot="2"\]\s*\{[^}]*\}/);
  const plotWidthMatch = stylesCss.match(/\.plot\s*\{[^}]*width:\s*([\d.]+)%/);
  assert.ok(plot2Match && plotWidthMatch, ".plot[data-plot=\"2\"] / .plot の width が見つかる");
  const plot2LeftMatch = plot2Match[0].match(/left:\s*([\d.]+)%/);
  assert.ok(plot2LeftMatch, ".plot[data-plot=\"2\"] の left が見つかる");
  const plot2Left = Number(plot2LeftMatch[1]);
  const plotWidth = Number(plotWidthMatch[1]);
  const plot2RightEdge = plot2Left + plotWidth; // plot2 右端 (% from left)

  assert.ok(railLeftEdge >= plot2RightEdge, `#tool-rail 左端(${railLeftEdge}%) が .plot[data-plot="2"] 右端(${plot2RightEdge}%) 以上 (重なりゼロ)`);
}

// ── 26. 水やり discoverability (レイアウト崩れバグ2修正) ────────────────
{
  assert.match(gameJs, /function updateWaterTargets/, "game.js に updateWaterTargets 関数が定義されている");
  assert.match(gameJs, /function showHintToast/, "game.js に showHintToast 関数が定義されている");
  assert.match(gameJs, /pono_hatake_tut_seen_v1/, "game.js に初回チュートリアル既読フラグ pono_hatake_tut_seen_v1 が存在する");
  assert.match(gameJs, /is-water-target/, "game.js が is-water-target クラスをトグルしている");
  assert.match(stylesCss, /\.plot\.is-water-target\s*\{/, "styles.css に .plot.is-water-target の定義がある");
  assert.match(stylesCss, /@keyframes\s+waterTargetPulse/, "styles.css に waterTargetPulse アニメーションが定義されている");
  assert.match(indexHtml, /id="hint-toast"/, "index.html に #hint-toast 要素が存在する");
  assert.match(stylesCss, /#hint-toast\s*\{/, "styles.css に #hint-toast の定義がある");
  assert.match(gameJs, /activeTool === 'water' && !plot\.seedId/, "game.js の beginPress else分岐が空畝×水ツールを検知する");
}

// ── 27. 畝は green.png の1200×670面と共通の実測座標で配置 ─────
{
  const plotAreaMatch = stylesCss.match(/#plot-area\s*\{[^}]*\}/);
  assert.ok(plotAreaMatch, '#plot-area のスタイルが存在する');
  assert.match(plotAreaMatch[0], /aspect-ratio:\s*1200\s*\/\s*670/, '#plot-area が green.png の1200:670比率を持つ');
  assert.match(plotAreaMatch[0], /top:\s*50%/, '#plot-area を stage の縦中央に置く');
  assert.match(plotAreaMatch[0], /translateY\(-50%\)/, '#plot-area の中心を stage の中心に合わせる');

  const expected = [
    { idx: 0, left: 25.583333, top: 32.228358 },
    { idx: 1, left: 13.883333, top: 44.228358 },
    { idx: 2, left: 38.383333, top: 45.828358 }
  ];
  for (const pos of expected) {
    const blockMatch = stylesCss.match(new RegExp('\\.plot\\[data-plot="' + pos.idx + '"\\]\\s*\\{[^}]*\\}'));
    assert.ok(blockMatch, `plot${pos.idx} の座標ブロックが存在する`);
    const left = Number((blockMatch[0].match(/left:\s*([\d.]+)%/) || [])[1]);
    const top = Number((blockMatch[0].match(/top:\s*([\d.]+)%/) || [])[1]);
    assert.ok(Math.abs(left - pos.left) < 0.00001, `plot${pos.idx} のleftが実測座標`);
    assert.ok(Math.abs(top - pos.top) < 0.00001, `plot${pos.idx} のtopが実測座標`);
  }
  const plotBlock = stylesCss.match(/\.plot\s*\{[^}]*\}/);
  assert.ok(plotBlock, '.plot ブロックが存在する');
  assert.doesNotMatch(plotBlock[0], /bottom\s*:/, '畝配置は画面下端基準の bottom を使わない');
}

console.log("hatake nikki regression: PASS");
