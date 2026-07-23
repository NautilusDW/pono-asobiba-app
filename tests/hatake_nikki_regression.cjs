#!/usr/bin/env node
"use strict";

// ポノのはたけにっき 新規実装の回帰テスト。
// NOTE: このタスクのスコープは hatake-nikki/ ディレクトリ (+本テストファイル) のみ。
// play.html / sw.js への統合は別担当が行う。ただし §18 (play.html 統合検証) だけは
// donguri-wakekko の APP_TITLE_MENU_IDS 登録漏れ再発防止テストとして事前に用意しておく。
// 統合が未実施の間は該当セクションが skip される。

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
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
  const cropIds = Object.keys(L.CROPS).sort();
  assert.deepEqual(cropIds, ["ninjin", "onion", "potato", "tomato"], "CROPS はおべんとうで使う4種だけに絞る");
  const expectedInventoryIds = {
    tomato: "tomato",
    ninjin: "carrot",
    potato: "potato",
    onion: "onion"
  };
  const allStageImages = [];
  const allSignImages = [];
  const allSeedChoiceImages = [];
  for (const cropId of cropIds) {
    const crop = L.CROPS[cropId];
    assert.equal(crop.id, cropId, `${cropId}.id は作物IDと一致する`);
    assert.equal(crop.inventoryId, expectedInventoryIds[cropId], `${cropId}.inventoryId はおべんとう材料IDへ対応する`);
    assert.equal(typeof crop.signImg, "string", `${cropId}.signImg が定義される`);
    assert.match(crop.signImg, new RegExp("crop_sign_" + cropId + "_iso_v3\\.webp$"), `${cropId}.signImg は同じ作物の v3 WebP 立て札`);
    assert.equal(typeof crop.seedChoiceImg, "string", `${cropId}.seedChoiceImg が定義される`);
    assert.match(crop.seedChoiceImg, new RegExp("/crops/" + cropId + "_seed_choice\\.webp$"), `${cropId}.seedChoiceImg は同じ作物の種生成画像`);
    assert.deepEqual(crop.progressThresholds, [1, 3, 5, 6], `${cropId} は共通の5段階 careProgress 閾値を使う`);
    assert.equal(crop.stageImages.length, 5, `${cropId}.stageImages は種から収穫まで5枚`);
    assert.equal(new Set(crop.stageImages).size, 5, `${cropId}.stageImages の5枚はすべて別URL`);
    const stageSuffixes = ["seed", "sprout", "young", "forming", "ready"];
    for (let stage = 0; stage < crop.stageImages.length; stage++) {
      assert.equal(typeof crop.stageImages[stage], "string", `${cropId} stage${stage} URL は文字列`);
      assert.match(crop.stageImages[stage], new RegExp("/crops/" + cropId + "_stage_" + stage + "_" + stageSuffixes[stage] + "\\.webp$"), `${cropId} stage${stage} は対応する WebP`);
    }
    assert.equal("stageThresholds" in crop, false, `${cropId} は旧3段階 stageThresholds を残さない`);
    allStageImages.push(...crop.stageImages);
    allSignImages.push(crop.signImg);
    allSeedChoiceImages.push(crop.seedChoiceImg);
  }
  assert.equal(new Set(allStageImages).size, 20, "4作物×5段階の成長画像URLは全20枚ユニーク");
  assert.equal(new Set(allSignImages).size, 4, "4作物の立て札URLは重複しない");
  assert.equal(new Set(allSeedChoiceImages).size, 4, "4作物の種選択画像URLは重複しない");
  assert.equal(L.PLOT_COUNT, 9, "畑は固定9区画");

  const initial = L.createInitialState("2026-07-23");
  assert.equal(initial.plots.length, 9, "createInitialState は最初から9区画を返す");
  for (let i = 0; i < initial.plots.length; i++) {
    assert.deepEqual(initial.plots[i], L.emptyPlot(), `初期plot${i}は空畑`);
  }
  initial.plots[0].seedId = "ninjin";
  for (let i = 1; i < initial.plots.length; i++) {
    assert.equal(initial.plots[i].seedId, null, `初期plot0とplot${i}は独立したオブジェクト`);
  }
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

// ── 4. 5段階成長マッピング (日数 + 当日の水やり) ─────────────────────
{
  function plotWith(seedId, daysGrown, wateredToday) {
    return { seedId: seedId, daysGrown: daysGrown, wateredToday: !!wateredToday, wilted: false, bug: false };
  }
  const progressCases = [
    { daysGrown: 0, wateredToday: false, careProgress: 0, stage: 0 },
    { daysGrown: 0, wateredToday: true, careProgress: 1, stage: 1 },
    { daysGrown: 1, wateredToday: false, careProgress: 2, stage: 1 },
    { daysGrown: 1, wateredToday: true, careProgress: 3, stage: 2 },
    { daysGrown: 2, wateredToday: false, careProgress: 4, stage: 2 },
    { daysGrown: 2, wateredToday: true, careProgress: 5, stage: 3 },
    { daysGrown: 3, wateredToday: false, careProgress: 6, stage: 4 },
    { daysGrown: 10, wateredToday: true, careProgress: 21, stage: 4 }
  ];
  for (const cropId of ["tomato", "ninjin", "potato", "onion"]) {
    for (const c of progressCases) {
      assert.equal(
        L.stageOf(plotWith(cropId, c.daysGrown, c.wateredToday)),
        c.stage,
        `${cropId}: careProgress=${c.careProgress} -> stage ${c.stage}`
      );
    }
  }

  // 子どもが操作した直後に必ず1段階進み、以後は「翌日 + 水やり」で交互に進む。
  const sequence = L.createInitialState("2026-07-01");
  assert.ok(L.plantSeed(sequence, 0, "tomato"), "種を植えられる");
  assert.equal(L.stageOf(sequence.plots[0]), 0, "植えた直後は種画像 stage0");
  assert.ok(L.waterPlot(sequence, 0), "植えた当日に水やりできる");
  assert.equal(L.stageOf(sequence.plots[0]), 1, "最初の水やり直後に芽 stage1");
  L.advanceOneDay(sequence, "2026-07-02");
  assert.equal(L.stageOf(sequence.plots[0]), 1, "翌日は同じ stage1 を保つ");
  assert.ok(L.waterPlot(sequence, 0), "2回目の水やりができる");
  assert.equal(L.stageOf(sequence.plots[0]), 2, "2回目の水やり直後に若葉 stage2");
  L.advanceOneDay(sequence, "2026-07-03");
  assert.ok(L.waterPlot(sequence, 0), "3回目の水やりができる");
  assert.equal(L.stageOf(sequence.plots[0]), 3, "2日目の水やり直後に実りはじめ stage3");
  L.advanceOneDay(sequence, "2026-07-04");
  assert.equal(L.stageOf(sequence.plots[0]), 4, "3日目に収穫OK stage4");

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
  s.plots[0].daysGrown = 2;
  s.plots[0].wateredToday = true; // careProgress=5, stage3 (実りはじめ・まだ収穫不可)
  let res = L.harvest(s, 0);
  assert.equal(res.ok, false, "stage3 では収穫失敗");
  assert.equal(s.plots[0].seedId, "tomato", "収穫失敗時は plot 不変");

  s.plots[0].daysGrown = 3;
  s.plots[0].wateredToday = false; // careProgress=6, stage4
  res = L.harvest(s, 0);
  assert.equal(res.ok, true, "stage4 でのみ収穫成功");
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
  assert.equal(normalized.plots.length, 9, "normalizeState は常に9枠の plots を返す");
  assert.equal(normalized.plots[0].seedId, "ninjin", "妥当なフィールドは保持される");
  for (let i = 1; i < normalized.plots.length; i++) {
    assert.deepEqual(normalized.plots[i], L.emptyPlot(), `欠損plot${i}はemptyPlot相当になる`);
  }

  const legacyPlots = [
    { seedId: "ninjin", daysGrown: 2, wateredToday: true, wilted: false, bug: true },
    { seedId: "tomato", daysGrown: 1, wateredToday: false, wilted: true, bug: false },
    { seedId: "ninjin", daysGrown: 4, wateredToday: false, wilted: false, bug: false }
  ];
  const normalizedLegacy = L.normalizeState({ lastSeenKey: "2026-07-22", plots: legacyPlots });
  assert.equal(normalizedLegacy.plots.length, 9, "旧3区画セーブを9区画へ拡張する");
  assert.deepEqual(normalizedLegacy.plots.slice(0, 3), legacyPlots, "旧3区画セーブのplot0〜2を同じ順序で保持する");
  assert.ok(normalizedLegacy.plots.slice(3).every(plot => JSON.stringify(plot) === JSON.stringify(L.emptyPlot())), "旧3区画セーブには空のplot3〜8を追加する");

  const legacyFourPlots = legacyPlots.concat([
    { seedId: "tomato", daysGrown: 3, wateredToday: true, wilted: false, bug: false }
  ]);
  const normalizedLegacyFour = L.normalizeState({ lastSeenKey: "2026-07-23", plots: legacyFourPlots });
  assert.equal(normalizedLegacyFour.plots.length, 9, "旧4区画セーブを9区画へ拡張する");
  assert.deepEqual(normalizedLegacyFour.plots.slice(0, 4), legacyFourPlots, "旧4区画セーブのplot0〜3の意味と順序を保持する");
  assert.ok(normalizedLegacyFour.plots.slice(4).every(plot => JSON.stringify(plot) === JSON.stringify(L.emptyPlot())), "旧4区画セーブには空のplot4〜8を追加する");

  const tenPlots = Array.from({ length: 10 }, (_, index) => ({
    seedId: index % 2 ? "tomato" : "ninjin",
    daysGrown: index,
    wateredToday: index % 3 === 0,
    wilted: index % 3 === 1,
    bug: index % 3 === 2
  }));
  const normalizedTen = L.normalizeState({ plots: tenPlots });
  assert.equal(normalizedTen.plots.length, 9, "10区画以上の未知セーブは固定9区画へ切り詰める");
  assert.deepEqual(normalizedTen.plots, tenPlots.slice(0, 9), "切り詰め時もplot0〜8までは同じindexで保持する");
  assert.equal(normalizedTen.plots.some(plot => plot.daysGrown === 9), false, "10枠目以降のデータは混入しない");

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

// ── 25. #tool-rail と9区画の重なり解消 (レイアウト崩れバグ1-B修正) ──
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

  const plotWidthMatch = stylesCss.match(/\.plot\s*\{[^}]*width:\s*([\d.]+)%/);
  assert.ok(plotWidthMatch, ".plot の width が見つかる");
  const plotWidth = Number(plotWidthMatch[1]);
  const plotRightEdges = [];
  for (let idx = 0; idx < 9; idx++) {
    const coordinateMatch = stylesCss.match(new RegExp('\\.plot\\[data-plot="' + idx + '"\\]\\s*\\{[^}]*left:\\s*([\\d.]+)%[^}]*\\}'));
    assert.ok(coordinateMatch, `.plot[data-plot="${idx}"] の left が見つかる`);
    plotRightEdges.push(Number(coordinateMatch[1]) + plotWidth);
  }
  const maxPlotRightEdge = Math.max(...plotRightEdges);

  assert.ok(railLeftEdge >= maxPlotRightEdge, `#tool-rail 左端(${railLeftEdge}%) が9区画の最大右端(${maxPlotRightEdge}%) 以上 (重なりゼロ)`);
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
    { idx: 0, left: 42.75, top: 22.698 },
    { idx: 4, left: 30.25, top: 34.448 },
    { idx: 5, left: 55.25, top: 34.448 },
    { idx: 1, left: 17.75, top: 46.198 },
    { idx: 6, left: 42.75, top: 46.198 },
    { idx: 2, left: 67.75, top: 46.198 },
    { idx: 7, left: 30.25, top: 57.948 },
    { idx: 8, left: 55.25, top: 57.948 },
    { idx: 3, left: 42.75, top: 69.698 }
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
  assert.match(plotBlock[0], /width:\s*14\.5%/, '9区画の畝幅は14.5%で中央のあぜ道を残す');
  assert.doesNotMatch(plotBlock[0], /bottom\s*:/, '畝配置は画面下端基準の bottom を使わない');
  assert.match(plotBlock[0], /pointer-events:\s*none/, '透明な矩形部分はタッチを奪わない');
  assert.match(stylesCss, /\.plot-hit-area\s*\{[^}]*clip-path:\s*polygon\(50% 0%, 100% 46%, 50% 100%, 0% 46%\)[^}]*pointer-events:\s*auto/s, '実画像のひし形だけを操作面にする');
  assert.strictEqual((indexHtml.match(/class="plot-hit-area"/g) || []).length, 9, '9つの各畝にひし形の操作面が1つある');
  assert.match(indexHtml, /id="plot-area"\s+role="group"\s+aria-label="9つの はたけ"/, 'plot-area が9区画のグループとして読み上げられる');
  assert.strictEqual((indexHtml.match(/class="plot"\s+data-plot="[0-8]"\s+role="button"\s+tabindex="0"/g) || []).length, 9, '9つの畝すべてがキーボード操作可能なbutton roleを持つ');
  const domPlotOrder = Array.from(indexHtml.matchAll(/<div class="plot" data-plot="([0-8])"/g), match => Number(match[1]));
  assert.deepEqual(domPlotOrder, [0, 4, 5, 1, 6, 2, 7, 8, 3], 'DOM／Tab順はアイソメの奥から手前へ1／2／3／2／1で並ぶ');
  for (const label of [
    'いちばん おくの あいている はたけ',
    'おくの ひだりの あいている はたけ',
    'おくの みぎの あいている はたけ',
    'ひだりの あいている はたけ',
    'まんなかの あいている はたけ',
    'みぎの あいている はたけ',
    'てまえの ひだりの あいている はたけ',
    'てまえの みぎの あいている はたけ',
    'いちばん てまえの あいている はたけ'
  ]) {
    assert.match(indexHtml, new RegExp('aria-label="' + label + '"'), `空畑を位置名つきで読み分ける: ${label}`);
  }
  assert.match(gameJs, /PLOT_POSITION_NAMES\s*=\s*\[\s*'いちばん おく',\s*'ひだり',\s*'みぎ',\s*'いちばん てまえ',\s*'おくの ひだり',\s*'おくの みぎ',\s*'まんなか',\s*'てまえの ひだり',\s*'てまえの みぎ'\s*\]/, '描画後のaria-labelも旧0〜3の意味を保つ9位置名を維持する');
  assert.match(gameJs, /refs\.el\.addEventListener\('keydown',[\s\S]*?e\.key !== 'Enter' && e\.key !== ' '[\s\S]*?e\.preventDefault\(\)[\s\S]*?activatePlotByInput\(idx\)/, '畝はEnter/Spaceを共通1回操作へ結線する');
  assert.match(gameJs, /refs\.el\.addEventListener\('click',[\s\S]*?plotLastTouchEnd\[idx\][\s\S]*?performance\.now\(\)[\s\S]*?activatePlotByInput\(idx\)/, '畝はマウスclickを受け、touch合成clickだけを単調時計で抑止する');
  assert.match(gameJs, /function bindControlAction\(el,\s*action\)[\s\S]*?addEventListener\('pointerdown'[\s\S]*?addEventListener\('click'[\s\S]*?e\.detail !== 0/, 'ツールbuttonはpointerとキーボード／支援技術clickを二重発火なく共通actionへ結線する');
  assert.match(gameJs, /bindControlAction\(tutNextBtn,\s*advanceTutorial\)/, '初回チュートリアルもEnter/Spaceで進められる');
}

// ── 28. おべんとう4作物×5段階 + 種 + 立て札 + 水やり済み表示 ─────────
{
  const cropIds = ['tomato', 'ninjin', 'potato', 'onion'];
  const assetPathFromUrl = url => url.replace(/^\.\.\//, '');
  const generatedArt = ['assets/images/hatake-nikki/seed_tool_box_iso.webp'];
  for (const cropId of cropIds) {
    const crop = L.CROPS[cropId];
    generatedArt.push(assetPathFromUrl(crop.signImg));
    generatedArt.push(assetPathFromUrl(crop.seedChoiceImg));
    generatedArt.push(...crop.stageImages.map(assetPathFromUrl));
  }
  assert.equal(generatedArt.length, 29, '生成画像は種箱1 + 4作物×(立て札1 + 種選択1 + 成長5) = 29枚');
  assert.equal(new Set(generatedArt).size, 29, '29枚の生成画像はすべて別URL');
  for (const relative of generatedArt) {
    assert.match(relative, /\.webp$/, `${relative} は WebP`);
    const absolute = path.join(root, relative);
    assert.ok(fs.existsSync(absolute), `${relative} が存在する`);
    assert.ok(fs.statSync(absolute).size > 0, `${relative} が空ファイルではない`);
    assert.ok(fs.statSync(absolute).size <= 3 * 1024 * 1024, `${relative} が3MB以下`);
  }

  // URLだけ変えて同じ絵を使い回す退行も検知する。
  const stageHashes = [];
  for (const cropId of cropIds) {
    for (const url of L.CROPS[cropId].stageImages) {
      const bytes = fs.readFileSync(path.join(root, assetPathFromUrl(url)));
      stageHashes.push(crypto.createHash('sha256').update(bytes).digest('hex'));
    }
  }
  assert.equal(new Set(stageHashes).size, 20, '4作物×5段階の成長画像はファイル内容も全20枚ユニーク');

  const existingWetArt = [
    'assets/images/hatake-nikki/hatake_crop_wet.png',
    'assets/images/hatake-nikki/watered_drop_mark_v2.png'
  ];
  for (const relative of existingWetArt) {
    const absolute = path.join(root, relative);
    assert.ok(fs.existsSync(absolute), `${relative} が存在する`);
    assert.ok(fs.statSync(absolute).size > 0, `${relative} が空ファイルではない`);
    assert.ok(fs.statSync(absolute).size <= 3 * 1024 * 1024, `${relative} が3MB以下`);
  }

  assert.strictEqual((indexHtml.match(/class="plot-marker"/g) || []).length, 9, '各畝に札と水マークの共通ラッパーが1つある');
  assert.strictEqual((indexHtml.match(/class="crop-sign"/g) || []).length, 9, '各畝に作物立て札が1つある');
  assert.strictEqual((indexHtml.match(/class="watered-drop"/g) || []).length, 9, '各畝に水やり済みしずく画像が1つある');
  assert.strictEqual((indexHtml.match(/<div class="plot-marker" aria-hidden="true">\s*<img class="crop-sign"[^>]*>\s*<img class="watered-drop"[^>]*>\s*<\/div>/g) || []).length, 9, '各plot-marker内で立て札と水マークを同じアンカーに束ねる');
  const preloadUrls = [
    '../assets/images/hatake-nikki/seed_tool_box_iso.webp',
    ...cropIds.map(cropId => L.CROPS[cropId].signImg),
    ...cropIds.map(cropId => L.CROPS[cropId].seedChoiceImg),
    ...cropIds.map(cropId => L.CROPS[cropId].stageImages[0]),
    '../assets/images/hatake-nikki/hatake_crop_wet.png',
    '../assets/images/hatake-nikki/watered_drop_mark_v2.png'
  ];
  for (const assetUrl of preloadUrls) {
    const escaped = assetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(indexHtml, new RegExp('<link\\s+rel="preload"\\s+as="image"\\s+href="' + escaped + '"[^>]*>'), `${assetUrl} を開始画面で先読みする`);
  }
  assert.match(indexHtml, /id="tool-water-btn"[\s\S]*?deco_watering_can_B\.png[\s\S]*?<\/button>/, 'じょうろボタンは画像アセットを使う');
  assert.match(indexHtml, /id="tool-seed-btn"[\s\S]*?<img[^>]+class="tool-icon tool-icon-seed"[^>]+seed_tool_box_iso\.webp[^>]*>[\s\S]*?<\/button>/, 'たねボタンは生成したアイソメ種箱画像を使う');
  assert.strictEqual((indexHtml.match(/class="seed-choice"\s+data-seed="(?:tomato|ninjin|potato|onion)"/g) || []).length, 4, '種ピッカーには4作物だけを表示する');
  for (const cropId of cropIds) {
    const choiceUrl = L.CROPS[cropId].seedChoiceImg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(indexHtml, new RegExp('class="seed-choice"\\s+data-seed="' + cropId + '"[\\s\\S]*?<img\\s+src="' + choiceUrl + '"'), `${cropId} は完成作物ではなく専用の種画像から植える`);
  }
  assert.match(gameJs, /cropInfo\.signImg/, '作物マスタの signImg から対応する立て札を表示する');
  assert.match(gameJs, /setAttribute\('data-crop',\s*plot\.seedId\)/, '植栽中は畑に data-crop を付ける');
  assert.match(gameJs, /removeAttribute\('data-crop'\)/, '空畑へ戻ると data-crop を外す');
  assert.match(gameJs, /className\s*=\s*['"]crop-stage-img['"]/, '種から収穫まで crop-stage-img を使う');
  assert.match(gameJs, /crop\.stageImages\[stage\]/, '現在の5段階 stage に対応する生成画像URLを表示する');
  assert.doesNotMatch(indexHtml + gameJs + stylesCss, /plant-emoji|🌱|🌿/, '芽・育ち中を絵文字で描画しない');
  assert.doesNotMatch(indexHtml + gameJs + stylesCss, /\bcrop-img\b/, '旧完成作物1枚だけの crop-img 描画を残さない');
  for (let stage = 0; stage <= 4; stage++) {
    assert.match(stylesCss, new RegExp('\\.plant\\[data-stage="' + stage + '"\\]\\s+img\\.crop-stage-img\\s*\\{'), `stage${stage} 専用の画像サイズ調整がある`);
  }
  assert.match(stylesCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.plant\[data-stage="4"\]\s+img\.crop-stage-img\s*\{[^}]*animation:\s*none/, '動きを減らす設定では収穫OKの点滅を止める');
  assert.match(stylesCss, /\.plot\.is-watered\s*\{[^}]*hatake_crop_wet\.png/, '水やり済みは湿った土の生成画像へ切り替える');
  assert.match(stylesCss, /\.plot\.is-watered\s*\{[^}]*background-size:\s*contain[^}]*background-position:\s*center[^}]*background-repeat:\s*no-repeat/s, '湿った畝は上頂点を切らず全体表示する');
  assert.match(stylesCss, /\.plot\.is-watered\s+\.watered-drop\s*\{[^}]*display:\s*block/, '水やり済みは大きなしずく画像を表示する');
  const markerBlock = stylesCss.match(/\.plot-marker\s*\{[^}]*\}/s);
  assert.ok(markerBlock, '札と水マークの共通ラッパーCSSが存在する');
  assert.match(markerBlock[0], /left:\s*10%/, '全マーカーは畝の左隅寄りに同じアンカーXを使う');
  assert.match(markerBlock[0], /top:\s*50%/, '全マーカーは畝の左角に同じアンカーYを使う');
  assert.match(markerBlock[0], /width:\s*clamp\(24px,\s*20%,\s*44px\)/, '立て札は14.5%幅の畝に合わせて24〜44pxへ縮小する');
  assert.match(markerBlock[0], /translate\(-43\.2%,\s*-95%\)/, '立て札は杭先を共通アンカーへ合わせる');
  assert.match(markerBlock[0], /pointer-events:\s*none/, '共通マーカーは畑の操作を妨げない');
  const signBlock = stylesCss.match(/\.crop-sign\s*\{[^}]*\}/s);
  assert.ok(signBlock, '立て札の共通CSSが存在する');
  assert.match(signBlock[0], /width:\s*100%/, '立て札は共通マーカー幅に追従する');
  assert.match(signBlock[0], /pointer-events:\s*none/, '立て札は畑の操作を妨げない');
  assert.doesNotMatch(stylesCss, /\.plot\[data-plot="[0-8]"\]\s+\.plot-marker/, '区画ごとにマーカー位置を変える例外を置かない');
  const expectedTilts = [
    { idx: 0, value: '-1\\.5' },
    { idx: 1, value: '0\\.75' },
    { idx: 2, value: '-0\\.75' },
    { idx: 3, value: '1\\.25' },
    { idx: 4, value: '-0\\.4' },
    { idx: 5, value: '1' },
    { idx: 6, value: '-1\\.1' },
    { idx: 7, value: '0\\.5' },
    { idx: 8, value: '-0\\.9' }
  ];
  for (const tilt of expectedTilts) {
    assert.match(stylesCss, new RegExp('\\.plot\\[data-plot="' + tilt.idx + '"\\]\\s*\\{\\s*--crop-sign-tilt:\\s*' + tilt.value + 'deg;\\s*\\}'), `plot${tilt.idx}は固定の微小傾き`);
  }
  assert.match(stylesCss, /\.watered-drop\s*\{[^}]*left:\s*-20%[^}]*top:\s*-18%[^}]*width:\s*clamp\(14px,\s*45%,\s*22px\)/s, 'しずく済マークは立て札左上外側へ小さく重ねる');
  assert.match(stylesCss, /\.watered-drop\s*\{[^}]*pointer-events:\s*none/s, 'しずくは畑の操作を妨げない');
  assert.match(stylesCss, /\.plant\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/s, '芽の中央基準は畝全面へ固定する');
  assert.doesNotMatch(indexHtml + gameJs + stylesCss, /🚿|💧/, 'じょうろ・しずくの絵文字をUI実装に残さない');
}

console.log("hatake nikki regression: PASS");
