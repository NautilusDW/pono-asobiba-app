#!/usr/bin/env node
"use strict";

// ポノのまちづくり (machizukuri/) 回帰テスト。
// このファイルは ws-e-tests のスコープであり、tests/machizukuri_regression.cjs のみを書く。
// 3段階の conditional arming:
//   Stage 1 (常時実行): machizukuri/js/logic.js (ws-a) の純ロジック契約テスト。
//   Stage 2 (machizukuri/index.html と machizukuri/styles.css の両方が存在する時だけ武装):
//            ページシェル (ws-c) の構造アサート。未実施の間は SKIP を出す。
//   Stage 3 (play.html に machizukuri の APP_TITLE_MENU_IDS 登録がある時だけ武装):
//            統合 (ws-f) 登録漏れ再発防止。未実施の間は SKIP を出す。
// plain node で実行できること (npm install 不要)。他の *_regression.cjs と同じ規約。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const logicPath = path.join(root, "machizukuri/js/logic.js");
const L = require(logicPath);
const logicJsSrc = read("machizukuri/js/logic.js");

// ═══════════════════════════════════════════════════════════════════
// Stage 1: logic-contract テスト (ws-a、常時実行)
// ═══════════════════════════════════════════════════════════════════

// ── 1. API 存在確認 ──────────────────────────────────────────────────
{
  const fns = [
    "getNow", "setNowForTest", "isEvening", "createInitialState", "normalizeState",
    "availableVeggies", "buyAndPlace", "storePart", "plantFlower", "milestoneReached"
  ];
  for (const name of fns) {
    assert.equal(typeof L[name], "function", `MachiLogic.${name} は関数`);
  }
  assert.equal(L.LOT_COUNT, 12, "区画は固定12");
  assert.equal(L.FLOWER_SLOT_COUNT, 16, "花ミクロスロットは固定16");
  assert.equal(L.STARTER_VEGGIE_BALANCE, 3, "初回スターター残高は3 (オーケストレーター決定)");
  assert.equal(typeof L.CENTER_LOT_ID, "string", "CENTER_LOT_ID が定義されている");
  assert.equal(typeof L.STARTER_TREE_LOT_ID, "string", "STARTER_TREE_LOT_ID が定義されている");
  assert.equal(typeof L.PART_COSTS, "object", "PART_COSTS は定義済み");
  assert.ok(Array.isArray(L.BUYABLE_LOT_PART_IDS), "BUYABLE_LOT_PART_IDS は配列");
  assert.equal(L.BUYABLE_LOT_PART_IDS.length, 10, "購入可能な区画パーツは10種");

  const expectedCosts = {
    cottage_akane: 3, cottage_aoi: 3, tree_maru: 1, well: 2, bench: 1,
    fence: 1, flowerbed: 1, streetlamp: 2, pond_bridge: 3, yasai_stand: 2,
    flower_cluster: 1
  };
  for (const [partId, cost] of Object.entries(expectedCosts)) {
    assert.equal(L.PART_COSTS[partId], cost, `PART_COSTS.${partId} === ${cost}`);
  }
}

// ── 2. createInitialState (家+木の先置き、スターター残高オフセット) ──
{
  const s0 = L.createInitialState();
  assert.equal(s0.v, 1, "v:1");
  assert.equal(s0.harvestSpent, -L.STARTER_VEGGIE_BALANCE, "harvestSpent は -STARTER_VEGGIE_BALANCE で初期化される");
  assert.equal(s0.harvestSpent, -3, "harvestSpent は -3 (オーケストレーター決定の実値)");
  assert.equal(s0.lots.length, L.LOT_COUNT, "lots は LOT_COUNT ぶん存在する");
  assert.equal(s0.lots[0].lotId, L.CENTER_LOT_ID, "先頭区画が CENTER_LOT_ID と一致する");
  assert.equal(s0.lots[0].partId, "pono_house", "中央区画にはプレイヤーの家が先置きされる");
  assert.equal(s0.lots[1].lotId, L.STARTER_TREE_LOT_ID, "2番目の区画が STARTER_TREE_LOT_ID と一致する");
  assert.equal(s0.lots[1].partId, "tree_maru", "スターター区画には木が先置きされる");
  for (let i = 2; i < s0.lots.length; i++) {
    assert.equal(s0.lots[i].partId, null, `残りの区画${i}は空である`);
  }
  assert.deepEqual(s0.owned, {}, "owned は空オブジェクトで初期化される");
  assert.equal(s0.flowers, 0, "flowers は0で初期化される");
  assert.equal(s0.milestoneSeen.district1, false, "milestoneSeen.district1 は false で初期化される");

  const s1 = L.createInitialState();
  s1.lots[2].partId = "well";
  assert.equal(s0.lots[2].partId, null, "createInitialState は呼び出しごとに独立したオブジェクトを返す (共有参照なし)");
}

// ── 3. availableVeggies は常に非負であり、スターター残高オフセットが効く ──
{
  assert.equal(L.availableVeggies(L.createInitialState(), 0), 3, "statTotal=0 でもスターター残高3が自然に与えられる");
  assert.equal(L.availableVeggies(L.createInitialState(), 5), 8, "スターター残高3 + はたけ実績5 = 8");
  assert.equal(L.availableVeggies(L.createInitialState(), 100), 103, "大きな statTotal でも 100+3");

  assert.equal(L.availableVeggies({ harvestSpent: 10 }, 0), 0, "harvestSpent が statTotal を大きく超えても非負 (0未満にならない)");
  assert.equal(L.availableVeggies({ harvestSpent: 10 }, 3), 0, "同上 (statTotal=3でも0)");
  assert.equal(L.availableVeggies({ harvestSpent: 0 }, -50), 0, "負の statTotal でも非負");

  assert.equal(L.availableVeggies(null, 5), 5, "state が null なら harvestSpent=0 相当として扱う");
  assert.equal(L.availableVeggies({}, 7), 7, "harvestSpent フィールド欠損は0相当として扱う");
  assert.equal(L.availableVeggies({ harvestSpent: "not-a-number" }, 7), 7, "harvestSpent が非数値なら0相当として扱う");
  assert.equal(L.availableVeggies({ harvestSpent: 4 }, "not-a-number"), 0, "statTotal が非数値なら0相当として扱う (非負を維持)");
}

// ── 4. 二重消費 (double-spend) 拒否: 同じ statTotal を使い回しても残高以上は買えない ──
{
  const s = L.createInitialState();
  const statTotal = 0; // 連続タップの間に hatake_harvest 側の値が変わらない想定の再現

  let r = L.buyAndPlace(s, "lot3", "tree_maru", statTotal); // cost1, 残高3 -> 2
  assert.equal(r.ok, true, "1回目の購入は残高内なので成功する");
  assert.equal(r.cost, 1);

  r = L.buyAndPlace(s, "lot4", "bench", statTotal); // cost1, 残高2 -> 1
  assert.equal(r.ok, true, "2回目の購入も残高内なので成功する");

  r = L.buyAndPlace(s, "lot5", "fence", statTotal); // cost1, 残高1 -> 0
  assert.equal(r.ok, true, "3回目の購入で残高がちょうど尽きる");

  r = L.buyAndPlace(s, "lot6", "flowerbed", statTotal); // cost1, 残高0
  assert.equal(r.ok, false, "同じ statTotal を使い回しても使い切った残高分の二重消費は拒否される");
  assert.equal(r.reason, "insufficient_balance");
  assert.equal(s.lots.find(l => l.lotId === "lot6").partId, null, "拒否された区画は空のまま");
}

// ── 5. buyAndPlace: 占有済み/残高不足/未知partIdの拒否 ──────────────
{
  const s = L.createInitialState();

  let r = L.buyAndPlace(s, "lot1", "cottage_akane", 100);
  assert.equal(r.ok, false, "既に家がある中央区画への購入は拒否される");
  assert.equal(r.reason, "occupied");

  r = L.buyAndPlace(s, "lot2", "cottage_aoi", 100);
  assert.equal(r.ok, false, "既に木がある区画への購入は拒否される");
  assert.equal(r.reason, "occupied");

  r = L.buyAndPlace(s, "lot3", "cottage_akane", 0); // cost3, 残高3 (スターター) ちょうど足りる
  assert.equal(r.ok, true, "残高ちょうどの購入は成功する (境界値)");
  assert.equal(s.lots[2].partId, "cottage_akane");

  r = L.buyAndPlace(s, "lot4", "well", 0); // cost2, 残高は既に0
  assert.equal(r.ok, false, "残高不足の購入は拒否される");
  assert.equal(r.reason, "insufficient_balance");
  assert.equal(s.lots[3].partId, null, "残高不足で拒否された区画は空のまま");

  r = L.buyAndPlace(s, "lot4", "totally_unknown_part_xyz", 999);
  assert.equal(r.ok, false, "未知の partId は拒否される");
  assert.equal(r.reason, "unknown_part");

  r = L.buyAndPlace(s, "lot4", "pono_house", 999);
  assert.equal(r.ok, false, "pono_house は購入不可パーツなので拒否される");
  assert.equal(r.reason, "unknown_part");

  r = L.buyAndPlace(s, "lot4", "flower_cluster", 999);
  assert.equal(r.ok, false, "flower_cluster は plantFlower 専用でありlotへの直接購入は拒否される");
  assert.equal(r.reason, "unknown_part");

  r = L.buyAndPlace(s, "lot-does-not-exist", "bench", 999);
  assert.equal(r.ok, false, "存在しない lotId は拒否される");
  assert.equal(r.reason, "unknown_lot");
}

// ── 6. storePart: owned へ返却して区画を空ける ──────────────────────
{
  const s = L.createInitialState();
  L.buyAndPlace(s, "lot3", "cottage_akane", 100);
  assert.equal(s.lots[2].partId, "cottage_akane");

  let r = L.storePart(s, "lot3");
  assert.equal(r.ok, true, "設置済み区画の格納は成功する");
  assert.equal(r.partId, "cottage_akane");
  assert.equal(s.lots[2].partId, null, "格納後は区画が空になる");
  assert.equal(s.owned.cottage_akane, 1, "格納したパーツは owned に加算される");

  r = L.buyAndPlace(s, "lot4", "cottage_akane", 0); // 残高0でも owned 在庫があれば無償で再設置できる
  assert.equal(r.ok, true, "owned 在庫があれば残高不足でも再設置できる");
  assert.equal(r.cost, 0, "owned からの再設置はコスト0");
  assert.equal(r.source, "owned");
  assert.equal(s.owned.cottage_akane, undefined, "再設置で owned 在庫が消費され0になったキーは削除される");

  r = L.storePart(s, "lot1");
  assert.equal(r.ok, false, "家は固定のため格納できない");
  assert.equal(r.reason, "fixed");

  r = L.storePart(s, "lot5");
  assert.equal(r.ok, false, "空区画の格納は失敗する");
  assert.equal(r.reason, "empty");

  r = L.storePart(s, "lot-does-not-exist");
  assert.equal(r.ok, false, "存在しない lotId の格納は失敗する");
  assert.equal(r.reason, "unknown_lot");
}

// ── 7. plantFlower は FLOWER_SLOT_COUNT で頭打ちになる ──────────────
{
  const s = L.createInitialState();
  for (let i = 0; i < L.FLOWER_SLOT_COUNT; i++) {
    const r = L.plantFlower(s, 1000); // 残高は常に潤沢
    assert.equal(r.ok, true, `plantFlower ${i + 1}回目は上限内なので成功する`);
    assert.equal(r.flowers, i + 1);
  }
  assert.equal(s.flowers, L.FLOWER_SLOT_COUNT, "flowers は FLOWER_SLOT_COUNT に到達する");

  const overflow = L.plantFlower(s, 1000);
  assert.equal(overflow.ok, false, "上限到達後の plantFlower は失敗する");
  assert.equal(overflow.reason, "full");
  assert.equal(s.flowers, L.FLOWER_SLOT_COUNT, "上限を超えて増えない");

  const poor = L.createInitialState();
  poor.harvestSpent = 0; // 残高を使い切った状態を模す
  const r = L.plantFlower(poor, 0);
  assert.equal(r.ok, false, "残高不足の plantFlower は上限とは独立に拒否される");
  assert.equal(r.reason, "insufficient_balance");
  assert.equal(poor.flowers, 0, "残高不足で拒否されたら flowers は増えない");
}

// ── 8. normalizeState は壊れた保存データでも例外を投げず耐性がある ──
{
  assert.doesNotThrow(() => L.normalizeState(null), "null を渡してもクラッシュしない");
  assert.doesNotThrow(() => L.normalizeState(undefined), "undefined を渡してもクラッシュしない");
  assert.doesNotThrow(() => L.normalizeState({}), "空オブジェクトを渡してもクラッシュしない");
  assert.doesNotThrow(() => L.normalizeState("garbage-string"), "文字列を渡してもクラッシュしない");
  assert.doesNotThrow(() => L.normalizeState(12345), "数値を渡してもクラッシュしない");
  assert.doesNotThrow(() => L.normalizeState({ lots: "not-an-array" }), "lots が配列でなくてもクラッシュしない");
  assert.doesNotThrow(() => L.normalizeState({ lots: [null, undefined, "garbage", 42] }), "lots 要素が不正型でもクラッシュしない");
  assert.doesNotThrow(
    () => L.normalizeState({ harvestSpent: "nope", flowers: "nope", milestoneSeen: "nope", owned: "nope" }),
    "各フィールドが不正型でもクラッシュしない"
  );

  const n1 = L.normalizeState(null);
  assert.equal(n1.lots.length, L.LOT_COUNT, "null からでも常に LOT_COUNT ぶんの lots を返す");
  assert.equal(n1.lots[0].partId, "pono_house", "null からでも中央区画は pono_house");
  assert.equal(n1.harvestSpent, -3, "null からでもスターター残高オフセットのデフォルトに戻る");

  const n2 = L.normalizeState({
    harvestSpent: 5,
    lots: [
      { partId: "ignored_for_center_lot" },
      { partId: "well" },
      { partId: "unknown_bad_part" },
      { partId: "cottage_aoi" }
    ],
    owned: { bench: 2, unknown_part_xyz: 4, fence: -1, well: "not-a-number" },
    flowers: 999,
    milestoneSeen: { district1: "truthy-string" }
  });
  assert.equal(n2.harvestSpent, 5, "妥当な harvestSpent は保持される");
  assert.equal(n2.lots[0].partId, "pono_house", "中央区画は raw の値に関わらず常に pono_house に強制される");
  assert.equal(n2.lots[1].partId, "well", "妥当な partId は保持される");
  assert.equal(n2.lots[2].partId, null, "未知の partId は null に丸められる");
  assert.equal(n2.lots[3].partId, "cottage_aoi", "妥当な partId は保持される (2)");
  for (let i = 4; i < L.LOT_COUNT; i++) {
    assert.equal(n2.lots[i].partId, null, `raw に無い区画${i}は空になる`);
  }
  assert.deepEqual(n2.owned, { bench: 2 }, "未知/負数/非数値の owned エントリは除去される");
  assert.equal(n2.flowers, L.FLOWER_SLOT_COUNT, "flowers は FLOWER_SLOT_COUNT で頭打ちにクランプされる");
  assert.equal(n2.milestoneSeen.district1, true, "milestoneSeen.district1 は真偽値へ強制される");

  const n3 = L.normalizeState({ flowers: -50 });
  assert.equal(n3.flowers, 0, "負の flowers は0にクランプされる");
}

// ── 9. milestoneReached は12/12到達で一度だけ発火する ───────────────
{
  const s = L.createInitialState();
  const fillIds = [
    "cottage_akane", "cottage_aoi", "well", "bench", "fence",
    "flowerbed", "streetlamp", "pond_bridge", "yasai_stand", "tree_maru"
  ];
  let fillIdx = 0;
  for (let i = 0; i < s.lots.length; i++) {
    if (s.lots[i].partId) continue;
    s.lots[i].partId = fillIds[fillIdx++];
  }
  assert.ok(s.lots.every(l => !!l.partId), "テスト前提: 12区画すべてが埋まっている");
  assert.equal(fillIdx, fillIds.length, "テスト前提: 埋めるべき10区画ぶんすべて使い切った");

  assert.equal(L.milestoneReached(s), true, "12/12到達で最初の呼び出しは true を返す");
  assert.equal(s.milestoneSeen.district1, true, "milestoneSeen.district1 が true にセットされる");
  assert.equal(L.milestoneReached(s), false, "2回目以降は再発火しない");
  assert.equal(L.milestoneReached(s), false, "3回目も再発火しない (安定してfalse)");

  const partial = L.createInitialState(); // 2/12 (家+木) のみ
  assert.equal(L.milestoneReached(partial), false, "2/12 の時点では発火しない");

  const almostFull = L.createInitialState();
  let idx = 0;
  for (let i = 0; i < almostFull.lots.length - 1; i++) {
    if (almostFull.lots[i].partId) continue;
    almostFull.lots[i].partId = fillIds[idx++];
  }
  const emptyCount = almostFull.lots.filter(l => !l.partId).length;
  assert.equal(emptyCount, 1, "テスト前提: 11/12まで埋めて1区画だけ空にする");
  assert.equal(L.milestoneReached(almostFull), false, "11/12では発火しない");
}

// ── 10. setNowForTest が day/evening の境界を正しく駆動する ─────────
{
  L.setNowForTest(new Date(2026, 6, 23, 17, 0, 0));
  assert.equal(L.isEvening(L.getNow()), true, "17:00 ちょうどは夕方境界の開始として evening 扱い");

  L.setNowForTest(new Date(2026, 6, 23, 16, 59, 59));
  assert.equal(L.isEvening(L.getNow()), false, "16:59:59 はまだ昼");

  L.setNowForTest(new Date(2026, 6, 23, 5, 59, 0));
  assert.equal(L.isEvening(L.getNow()), true, "05:59 はまだ夜明け前の evening 扱い");

  L.setNowForTest(new Date(2026, 6, 23, 6, 0, 0));
  assert.equal(L.isEvening(L.getNow()), false, "06:00 ちょうどは夜明け境界で昼扱いに切り替わる");

  L.setNowForTest(new Date(2026, 6, 23, 23, 30, 0));
  assert.equal(L.isEvening(L.getNow()), true, "23:30 は深夜帯で evening 扱い");

  L.setNowForTest(new Date(2026, 6, 23, 12, 0, 0));
  assert.equal(L.isEvening(L.getNow()), false, "正午は昼");

  L.setNowForTest(null);
  const real = L.getNow();
  assert.ok(Math.abs(real.getTime() - Date.now()) < 5000, "setNowForTest(null) で実時刻に戻る");
}

// ── 11. 構文検証 (logic.js) ─────────────────────────────────────────
{
  assert.doesNotThrow(() => new vm.Script(logicJsSrc, { filename: "machizukuri-logic.js" }), "logic.js は構文的に妥当");
  assert.doesNotThrow(() => require(logicPath), "logic.js は require で例外を投げない (二重require時も安全)");
}

console.log("machizukuri regression stage 1 (logic): PASS");

// ═══════════════════════════════════════════════════════════════════
// Stage 1.5: CSS at-rule 除去ヘルパー (stripAtRuleBlocks) の契約テスト。
// @media/@keyframes/@supports のようにブレース `{ }` を own body として持つ
// at-rule と、 @import/@charset/@namespace のようにブレースを持たず `;` で
// 終わる文の 2 系統が混在するため、 後者を前者と誤認すると次の無関係な
// CSS ルールを丸ごと飲み込んでしまう (pointer-events-none 監査の盲点になる)。
// この Stage は machizukuri/styles.css の実在有無に依存せず常時実行する。
// ═══════════════════════════════════════════════════════════════════
function stripAtRuleBlocks(css) {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const atIdx = css.indexOf("@", i);
    if (atIdx === -1) { out += css.slice(i); break; }
    out += css.slice(i, atIdx);
    const braceIdx = css.indexOf("{", atIdx);
    const semiIdx = css.indexOf(";", atIdx);
    if (semiIdx !== -1 && (braceIdx === -1 || semiIdx < braceIdx)) {
      i = semiIdx + 1;
      continue;
    }
    if (braceIdx === -1) { out += css.slice(atIdx); break; }
    let depth = 1;
    let j = braceIdx + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth += 1;
      else if (css[j] === "}") depth -= 1;
      j += 1;
    }
    i = j;
  }
  return out;
}

{
  const withImport = "@import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;700;900&display=swap');\n.after-import { color: red; }";
  const strippedImport = stripAtRuleBlocks(withImport);
  assert.doesNotMatch(strippedImport, /@import/, "stripAtRuleBlocks は @import 文自体を除去する");
  assert.match(strippedImport, /\.after-import\s*\{[^}]*color:\s*red/, "brace-less @import の直後にある無関係ルールを飲み込まない (regression: url() 内の '@400' に惑わされない)");

  const withCharset = '@charset "UTF-8";\n.after-charset { pointer-events: none; }';
  const strippedCharset = stripAtRuleBlocks(withCharset);
  assert.doesNotMatch(strippedCharset, /@charset/, "stripAtRuleBlocks は @charset 文自体を除去する");
  assert.match(strippedCharset, /\.after-charset\s*\{[^}]*pointer-events:\s*none/, "brace-less @charset の直後にある pointer-events:none ルールを飲み込まない");

  const withNamespace = "@namespace svg url(http://www.w3.org/2000/svg);\n.after-ns { color: blue; }";
  const strippedNs = stripAtRuleBlocks(withNamespace);
  assert.match(strippedNs, /\.after-ns\s*\{[^}]*color:\s*blue/, "brace-less @namespace の直後にある無関係ルールを飲み込まない");

  const withMedia = "@media (min-width: 600px) { .in-media { pointer-events: none; } }\n.after-media { color: green; }";
  const strippedMedia = stripAtRuleBlocks(withMedia);
  assert.doesNotMatch(strippedMedia, /in-media/, "brace 持ちの @media はその own body ごと丸ごと除去する (従来通りの挙動を維持)");
  assert.match(strippedMedia, /\.after-media\s*\{[^}]*color:\s*green/, "@media ブロックの後続ルールは保持される");

  const mixed = '@import "a.css";\n@media (min-width: 1px) { .in-media2 { pointer-events: none; } }\n.plain { pointer-events: none; }';
  const strippedMixed = stripAtRuleBlocks(mixed);
  const survivingRuleCount = (strippedMixed.match(/\{[^{}]*\}/g) || []).length;
  assert.equal(survivingRuleCount, 1, "brace-less と brace 持ちの at-rule が混在しても、残るのは無関係な通常ルール1個だけ (rule-count sanity check)");
  assert.match(strippedMixed, /\.plain\s*\{[^}]*pointer-events:\s*none/, "mixed ケースでも通常ルールの pointer-events:none は飲み込まれず監査対象に残る");

  console.log("machizukuri regression stage 1.5 (stripAtRuleBlocks helper contract): PASS");
}

// ═══════════════════════════════════════════════════════════════════
// Stage 2: ページシェル構造アサート (ws-c、index.html + styles.css が
// 両方そろった時だけ武装。 未実施の間は SKIP を出して何もしない)
// ═══════════════════════════════════════════════════════════════════
{
  const indexHtmlPath = path.join(root, "machizukuri/index.html");
  const stylesCssPath = path.join(root, "machizukuri/styles.css");

  if (fs.existsSync(indexHtmlPath) && fs.existsSync(stylesCssPath)) {
    const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");
    const stylesCss = fs.readFileSync(stylesCssPath, "utf8");

    // ── 2a. ブートリトライ機構が存在すること ──────────────────────
    assert.match(indexHtml, /function\s+retryScriptTags/, "index.html に retryScriptTags 関数が定義されている");
    assert.match(indexHtml, /function\s+checkAndRecover/, "index.html に checkAndRecover 関数が定義されている");
    assert.match(indexHtml, /onerror\s*=\s*"window\.__machiScriptErrored/, "各 script タグに onerror ハンドラが付いている");
    assert.match(indexHtml, /onload\s*=\s*"window\.__machiScriptLoaded/, "各 script タグに onload ハンドラが付いている");
    assert.match(indexHtml, /bust\s*=\s*'\?retry='\s*\+\s*Date\.now\(\)/, "リトライはキャッシュバイパス (cache-bust) のクエリを付与する");
    assert.match(indexHtml, /id="machi-boot-error-retry"/, "可視エラーUIに手動リトライボタンが存在する");
    assert.match(stylesCss, /\.error-ui\s*\{[^}]*display:\s*none/, "エラーUIは既定で非表示");
    assert.match(stylesCss, /\.error-ui\.show\s*\{[^}]*display:\s*flex/, "エラーUIも .show クラスで表示される");

    // ── 2b. 画面/シート/ポップオーバー/チュートリアル/エラーUI は .show クラスで遷移すること ──
    assert.match(indexHtml, /id="start-screen"\s+class="screen show"/, "#start-screen は初期状態から class=\"screen show\"");
    assert.doesNotMatch(indexHtml, /class="screen[^"]*"[^>]*hidden/, "index.html の .screen 要素は hidden 属性を使っていない");
    assert.match(stylesCss, /\.screen\s*\{[^}]*display:\s*none/, ".screen ベースが display:none");
    assert.match(stylesCss, /\.screen\.show\s*\{[^}]*display:\s*flex/, ".screen.show が display:flex");
    assert.match(stylesCss, /\.sheet\s*\{[^}]*display:\s*none/, ".sheet ベースが display:none");
    assert.match(stylesCss, /\.sheet\.show\s*\{[^}]*display:\s*flex/, ".sheet.show が display:flex");
    assert.match(stylesCss, /\.tut-dim\.show\s*\{[^}]*display:\s*block/, ".tut-dim.show が display:block");
    assert.match(stylesCss, /\.tut-bubble\.show\s*\{[^}]*display:\s*block/, ".tut-bubble.show が display:block");
    assert.match(stylesCss, /#landscape-notice\.show\s*\{[^}]*display:\s*flex/, "#landscape-notice.show が display:flex");

    // ── 2c. 対話要素の祖先が pointer-events:none を持たないこと ──────
    // @media/@keyframes/@supports は内部に入れ子の { } を含み単純な非入れ子
    // 正規表現では正しく分解できないため、まずそれらの本体をブレース深度
    // カウントで丸ごと除去してから、残ったトップレベルのルールだけを
    // selector/body ペアとして走査する。 stripAtRuleBlocks 自体は Stage 1.5
    // で brace-less at-rule (@import 等) を含めて契約テスト済み。
    const flatCss = stripAtRuleBlocks(stylesCss);

    // sanity check: このファイルの実際の @import (Google Fonts) 直後にある
    // universal reset ルールが飲み込まれていないことを直接確認する。
    // brace-less @import を誤ってブレース持ち at-rule として扱うと、
    // まさにこの次のルールが丸ごと消える (このプロジェクトで実際に再現した blind spot)。
    if (/@import\b/.test(stylesCss)) {
      assert.match(
        flatCss,
        /\*,\s*\*::before,\s*\*::after\s*\{[^}]*box-sizing:\s*border-box/,
        "@import 直後の universal reset ルールが stripAtRuleBlocks に飲み込まれず残っている (実ファイルでの blind-spot regression 確認)"
      );
    }

    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    const pointerNoneSelectors = [];
    let ruleMatch;
    while ((ruleMatch = ruleRe.exec(flatCss))) {
      const body = ruleMatch[2];
      if (!/pointer-events\s*:\s*none/.test(body)) continue;
      const selectors = ruleMatch[1].split(",").map(sel => sel.trim().replace(/\s+/g, " "));
      pointerNoneSelectors.push(...selectors);
    }

    const PROTECTED_ANCESTOR_OR_INTERACTIVE = new Set([
      "html", "body", "#stage", "#town-screen", "#scene-lots",
      ".screen", ".screen.show", "#hud",
      ".sheet", ".sheet.show", ".sheet-card", ".popover-card",
      "#part-popover", "#picker-sheet", "#start-screen", ".start-card",
      ".lot", ".lot.is-empty", ".lot.is-house", ".lot:active", ".lot:focus-visible",
      ".part-btn", ".part-btn:active", ".part-btn:disabled",
      ".popover-btn", ".popover-store-btn", ".popover-door-btn",
      ".hud-btn", "#hud-flower-btn",
      ".sheet-close-btn", ".popover-close-btn",
      ".tut-next-btn", ".error-ui-btn",
      "#start-btn", ".landscape-back", ".picker-cta", ".picker-cta.show"
    ]);

    for (const sel of pointerNoneSelectors) {
      assert.ok(
        !PROTECTED_ANCESTOR_OR_INTERACTIVE.has(sel),
        `pointer-events:none が対話要素またはその祖先セレクタ "${sel}" に設定されている (回帰禁止)`
      );
    }
    assert.ok(
      pointerNoneSelectors.includes("#scene-bg"),
      "装飾レイヤー #scene-bg (兄弟レイヤー、#scene-lots の祖先ではない) は pointer-events:none を保つ"
    );
    assert.ok(
      pointerNoneSelectors.includes(".lot > *"),
      ".lot > * (区画内アイコン) は pointer-events:none のまま、タップは .lot ボタン自体へ通す"
    );

    // ── 2d. 画像ストレッチ禁止 (background-size:100% 100% / object-fit:fill) ──
    for (const [name, src] of [["index.html", indexHtml], ["styles.css", stylesCss]]) {
      assert.doesNotMatch(src, /background-size:\s*100%\s+100%/, `${name} に background-size:100% 100% (stretch) が存在しない`);
      assert.doesNotMatch(src, /object-fit:\s*fill/, `${name} に object-fit:fill (stretch) が存在しない`);
    }

    console.log("machizukuri regression stage 2 (shell/styles): PASS");
  } else {
    console.log("  (SKIP: machizukuri/index.html または machizukuri/styles.css が未作成。ws-c-shell 実装待ち)");
  }
}

// ═══════════════════════════════════════════════════════════════════
// Stage 3: play.html 統合ガード (ws-f、APP_TITLE_MENU_IDS 登録が
// 実施された時だけ武装。 未実施の間は SKIP を出して何もしない。
// 登録漏れ再発防止テスト、donguri-wakekko 事故を踏まえたパターン踏襲)
// ═══════════════════════════════════════════════════════════════════
{
  const playHtmlPath = path.join(root, "play.html");
  if (fs.existsSync(playHtmlPath)) {
    const playHtml = fs.readFileSync(playHtmlPath, "utf8");
    const hasGamesEntry = /id:\s*['"]machizukuri['"]/.test(playHtml);
    if (hasGamesEntry) {
      const menuIdsMatch = playHtml.match(/APP_TITLE_MENU_IDS\s*=\s*\[([\s\S]*?)\]/);
      assert.ok(menuIdsMatch, "play.html に APP_TITLE_MENU_IDS 配列が見つかる");
      assert.match(menuIdsMatch[1], /['"]machizukuri['"]/, "APP_TITLE_MENU_IDS 配列内に 'machizukuri' が含まれる (登録漏れ厳禁)");
      console.log("machizukuri regression stage 3 (play.html integration): PASS");
    } else {
      console.log("  (SKIP: play.html への machizukuri GAMES 登録は未実施。ws-f-integration 担当のタスク)");
    }
  } else {
    console.log("  (SKIP: play.html が見つからない)");
  }
}

console.log("machizukuri regression: PASS");
