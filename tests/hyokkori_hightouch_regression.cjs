#!/usr/bin/env node
"use strict";

// ひょっこりハイタッチ 新規実装の回帰テスト。
// NOTE: このタスクのスコープは hyokkori-hightouch/ ディレクトリ (+本テストファイル) のみ。
// play.html / sw.js への統合は別担当が行う。ただし §12 (play.html 統合検証) だけは
// donguri-wakekko の APP_TITLE_MENU_IDS 登録漏れ再発防止テストとして事前に用意しておく
// (実装仕様書 §8 ケース12)。 統合が未実施の間は該当セクションが skip される。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const logicPath = path.join(root, "hyokkori-hightouch/js/logic.js");
const L = require(logicPath);
const locationsPath = path.join(root, "hyokkori-hightouch/js/locations.js");
const D = require(locationsPath);

const gameJs = read("hyokkori-hightouch/js/game.js");
const logicJsSrc = read("hyokkori-hightouch/js/logic.js");
const locationsJsSrc = read("hyokkori-hightouch/js/locations.js");
const indexHtml = read("hyokkori-hightouch/index.html");
const stylesCss = read("hyokkori-hightouch/styles.css");

// ── mulberry32 seeded LCG (決定論シミュレーション用) ──────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 1. カーブ健全性 ─────────────────────────────────────────────────
{
  const sampleTimes = [-10, 0, 5, 10, 20, 30, 45, 60, 90, 9999];

  assert.equal(L.GAME_DURATION, 30, "1ゲームは30秒");
  assert.equal(L.SHOW_TIME_MAX, 1.65, "開始時の表示時間は1.65秒");
  assert.equal(L.SHOW_TIME_MIN, 1.25, "終盤の表示時間は1.25秒");
  assert.equal(L.SPAWN_INTERVAL_MAX_MS, 1250, "開始時の出現間隔は1250ms");
  assert.equal(L.SPAWN_INTERVAL_MIN_MS, 900, "終盤の出現間隔は900ms");
  assert.equal(L.SLEEP_RATIO_MIN, 0.18, "開始時のsleeping比率は18%");
  assert.equal(L.SLEEP_RATIO_MAX, 0.28, "終盤のsleeping比率は28%");
  assert.equal(L.SLEEP_PENALTY, 0, "sleepingタップでは減点しない");

  let prevShow = Infinity;
  let prevBonusShow = Infinity;
  for (const t of sampleTimes) {
    const v = L.showTimeAt(t);
    assert.ok(Number.isFinite(v), `showTimeAt(${t}) は有限値`);
    assert.ok(v <= prevShow + 1e-9, `showTimeAt は単調非増加であること (t=${t})`);
    assert.ok(v <= 1.65 + 1e-9 && v >= 1.25 - 1e-9, `showTimeAt は 1.25〜1.65 にクランプされる (t=${t} got=${v})`);
    prevShow = v;

    const bonusV = L.bonusShowTimeAt(t);
    assert.ok(Number.isFinite(bonusV), `bonusShowTimeAt(${t}) は有限値`);
    assert.ok(bonusV <= prevBonusShow + 1e-9, `bonusShowTimeAt は単調非増加であること (t=${t})`);
    assert.ok(bonusV >= v - 1e-9 && bonusV <= 1.90 + 1e-9, `bonusShowTimeAt(${t}) は通常以上・1.90秒以下`);
    prevBonusShow = bonusV;
  }
  assert.equal(L.showTimeAt(0), 1.65, "showTimeAt(0) は1.65から始まる");
  assert.ok(Math.abs(L.showTimeAt(30) - 1.25) < 1e-9, "showTimeAt(30) は1.25に達する");
  assert.ok(Math.abs(L.bonusShowTimeAt(0) - 1.90) < 1e-9, "開始時のbonus表示は1.90秒でクランプ");
  assert.ok(Math.abs(L.bonusShowTimeAt(30) - 1.55) < 1e-9, "終盤のbonus表示は通常より0.30秒長い");

  assert.equal(L.spawnIntervalAt(0), 1250, "spawnIntervalAt(0) は1250msから始まる");
  assert.ok(Math.abs(L.spawnIntervalAt(30) - 900) < 1e-9, "spawnIntervalAt(30) は900msに達する");
  assert.ok(L.spawnIntervalAt(120) >= 900 - 1e-9, "spawnIntervalAt(120) でも下限900ms以上");
  assert.ok(L.spawnIntervalAt(9999) >= 900 - 1e-9 && Number.isFinite(L.spawnIntervalAt(9999)), "極端な t でも有限かつ下限クランプ");

  for (const t of sampleTimes) {
    const ratio = L.sleepRatioAt(t);
    assert.ok(Number.isFinite(ratio), `sleepRatioAt(${t}) は有限値`);
    assert.ok(ratio >= 0.18 - 1e-9 && ratio <= 0.28 + 1e-9, `sleepRatioAt(${t}) は0.18〜0.28に収まる (got ${ratio})`);
  }
  assert.ok(Math.abs(L.sleepRatioAt(0) - 0.18) < 1e-9, "sleepRatioAt(0) は0.18から始まる");
  assert.ok(Math.abs(L.sleepRatioAt(30) - 0.28) < 1e-9, "sleepRatioAt(30) は0.28に達する");
}

// ── 2. pickSpawnKind: 3連続sleeping禁止 ────────────────────────────
{
  // rand を常に 0 に固定 (sleepRatio > 0 な限り必ず sleeping を選ぼうとする) しても、
  // 直近2体が sleeping なら強制的に awake が返ること。
  const alwaysSleepRand = () => 0;
  const k1 = L.pickSpawnKind(30, [], alwaysSleepRand);
  assert.equal(k1, "sleeping", "前提: rand=0 固定・履歴なしなら sleeping が選ばれる");
  const k2 = L.pickSpawnKind(30, ["sleeping"], alwaysSleepRand);
  assert.equal(k2, "sleeping", "前提: 直近1体だけの sleeping では強制awakeにならない");
  const k3 = L.pickSpawnKind(30, ["sleeping", "sleeping"], alwaysSleepRand);
  assert.equal(k3, "awake", "直近2体連続sleeping後は強制的にawakeが選ばれる (3連続禁止)");

  // 履歴が [awake, sleeping] の場合は連続禁止に抵触しないので通常ロジックに従う
  const k4 = L.pickSpawnKind(30, ["awake", "sleeping"], alwaysSleepRand);
  assert.equal(k4, "sleeping", "直近2体が awake→sleeping の場合は強制介入しない");
}

// ── 2b. 7体ごとの決定論ボーナス ────────────────────────────────────
{
  assert.equal(L.BONUS_SPAWN_EVERY, 7, "ボーナスは実出現7体ごと");
  assert.equal(typeof L.isBonusSpawn, "function", "isBonusSpawn が公開される");
  assert.equal(typeof L.bonusShowTimeAt, "function", "bonusShowTimeAt が公開される");
  const bonusPositions = [];
  for (let actualSpawnCount = 1; actualSpawnCount <= 30; actualSpawnCount++) {
    if (L.isBonusSpawn(actualSpawnCount)) bonusPositions.push(actualSpawnCount);
  }
  assert.deepEqual(bonusPositions, [7, 14, 21, 28], "30体中のボーナス位置は7・14・21・28で固定");
  for (const invalid of [0, -7, NaN, Infinity, 7.5, undefined, null]) {
    assert.equal(L.isBonusSpawn(invalid), false, `不正な実出現数 ${String(invalid)} はボーナスにしない`);
  }
}

// ── 2c. 5地点データ・可変かくれ場所・さんぽ進行 ─────────────────────
{
  assert.deepEqual(
    D.ROUTE_IDS,
    ["komorebi_clearing", "donguri_path", "mizube", "mushroom_hill", "moonlight_forest"],
    "広場→こみち→みずべ→きのこのおか→つきあかりのもりの固定5地点"
  );
  assert.equal(D.WALK_SAVE_KEY, "pono_hyokkori_walk_v1", "さんぽ進行は専用v1キーへ保存する");
  assert.equal(D.LOCATIONS.length, 5, "場所定義は物語の終点まで5件");
  const browserSandbox = { window: {} };
  vm.runInNewContext(locationsJsSrc, browserSandbox, { filename: "hyokkori-locations-browser.js" });
  assert.equal(typeof browserSandbox.window.HyokkoriLocations.normalizeWalkState, "function", "ブラウザへHyokkoriLocationsを公開する");
  assert.equal(browserSandbox.window.HyokkoriLocations.LOCATIONS.length, 5, "ブラウザ公開APIにも5地点が入る");

  const expectedSlots = {
    komorebi_clearing: [
      [31, 64.5, 0.8, "far", 0], [69.5, 64, 0.83, "far", 0],
      [29.5, 79, 0.9, "near", 0], [70.5, 79, 0.92, "near", 0],
      [35, 92, 1.02, "near", 0], [65, 92, 1.04, "near", 0]
    ],
    donguri_path: [
      [30, 58, 0.88, "far", 0], [82, 38, 0.86, "far", 0],
      [27, 81, 0.95, "near", 0], [72, 77, 0.97, "near", 0],
      [50, 94, 1.06, "near", 0]
    ],
    mizube: [
      [13, 47, 0.82, "far", 0], [80, 45, 0.86, "far", 0],
      [20, 88, 1.04, "near", 0], [80, 87, 1.02, "near", 0]
    ],
    mushroom_hill: [
      [31.2, 69, 0.8, "far", 0], [71, 40, 0.86, "far", 0],
      [18, 78, 0.98, "near", 0], [50, 84, 1.07, "near", 0],
      [68, 81, 0.94, "near", 0]
    ],
    moonlight_forest: [
      [27, 39, 0.84, "far", 0], [73, 39, 0.86, "far", 0],
      [21, 79, 1.04, "near", 0], [79, 79, 1.04, "near", 0]
    ]
  };
  const expectedWorldAssets = {
    komorebi_clearing: {
      background: "bg_world_komorebi_lowangle_20260724.png",
      far: "hideout_world_komorebi_far_v2_20260724.png",
      near: "hideout_world_komorebi_near_v2_20260724.png"
    },
    donguri_path: {
      background: "bg_world_donguri_overlook_20260724.png",
      far: "hideout_world_donguri_far_v2_20260724.png",
      near: "hideout_world_donguri_near_v2_20260724.png"
    },
    mizube: {
      background: "bg_world_mizube_waterline_v2_20260724.png",
      far: "hideout_world_mizube_far_v2_20260724.png",
      near: "hideout_world_mizube_near_v2_20260724.png"
    },
    mushroom_hill: {
      background: "bg_world_mushroom_hill_sunset_20260724.png",
      far: "hideout_world_mushroom_far_20260724.png",
      near: "hideout_world_mushroom_near_20260724.png"
    },
    moonlight_forest: {
      background: "bg_world_moonlight_forest_clearing_20260724.png",
      far: "hideout_world_moonlight_far_20260724.png",
      near: "hideout_world_moonlight_near_20260724.png"
    }
  };
  const expectedHideoutLayouts = {
    komorebi_clearing: {
      far: { groundAnchorY: 78.2, foregroundTop: 67, windowBottom: 36.26, windowSafetyBottom: 28.58, charWidth: 52, charLiftPct: 18.34, foregroundMask: "../assets/images/hyokkori-hightouch/mask_hideout_world_komorebi_far_v2_20260724.png" },
      near: { groundAnchorY: 75.3, foregroundTop: 64, windowBottom: 35.75, windowSafetyBottom: 24.26, charWidth: 58, charLiftPct: 19.56, foregroundMask: "../assets/images/hyokkori-hightouch/mask_hideout_world_komorebi_near_v2_20260724.png" }
    },
    donguri_path: {
      far: { groundAnchorY: 68.2, foregroundTop: 60, windowBottom: 28.87, windowSafetyBottom: 20, charWidth: 48, charLiftPct: 18.34, foregroundMask: "../assets/images/hyokkori-hightouch/mask_hideout_world_donguri_far_v3_20260724.png" },
      near: { groundAnchorY: 81, foregroundTop: 64, windowBottom: 42.72, windowSafetyBottom: 35.02, charWidth: 52, charLiftPct: 20.79, foregroundMask: "../assets/images/hyokkori-hightouch/mask_hideout_world_donguri_near_v2_20260724.png" }
    },
    mizube: {
      far: { groundAnchorY: 69.8, foregroundTop: 64, windowBottom: 27.36, windowSafetyBottom: 24.58, charWidth: 50, charLiftPct: 17.12, foregroundMask: "../assets/images/hyokkori-hightouch/mask_hideout_world_mizube_far_v2_20260724.png" },
      near: { groundAnchorY: 66.8, foregroundTop: 56, windowBottom: 34.06, windowSafetyBottom: 25.99, charWidth: 55, charLiftPct: 19.56, foregroundMask: "../assets/images/hyokkori-hightouch/mask_hideout_world_mizube_near_v2_20260724.png" }
    },
    mushroom_hill: {
      far: { groundAnchorY: 67.8, foregroundTop: 60, windowBottom: 28.92, windowSafetyBottom: 34.42, charWidth: 50, charLiftPct: 18.34, foregroundMask: "../assets/images/hyokkori-hightouch/mask_hideout_world_mushroom_far_20260724.png" },
      near: { groundAnchorY: 76.3, foregroundTop: 64, windowBottom: 36.79, windowSafetyBottom: 30.59, charWidth: 55, charLiftPct: 19.56, foregroundMask: "../assets/images/hyokkori-hightouch/mask_hideout_world_mushroom_near_20260724.png" }
    },
    moonlight_forest: {
      far: { groundAnchorY: 65.8, foregroundTop: 60, windowBottom: 24.92, windowSafetyBottom: 26.25, charWidth: 50, charLiftPct: 18.34, foregroundMask: "../assets/images/hyokkori-hightouch/mask_hideout_world_moonlight_far_20260724.png" },
      near: { groundAnchorY: 67.9, foregroundTop: 61, windowBottom: 26.97, windowSafetyBottom: 25.92, charWidth: 55, charLiftPct: 19.56, foregroundMask: "../assets/images/hyokkori-hightouch/mask_hideout_world_moonlight_near_20260724.png" }
    }
  };

  for (const location of D.LOCATIONS) {
    assert.equal(D.LOCATION_BY_ID[location.id], location, `${location.id} をIDから同じ定義へ引ける`);
    assert.deepEqual(
      location.slots.map(slot => [slot.x, slot.groundY, slot.depth, slot.hideout, slot.rotate]),
      expectedSlots[location.id],
      `${location.id} の接地座標・前後パース・開口種・傾きが企画値と一致`
    );
    assert.equal(path.basename(location.background), expectedWorldAssets[location.id].background, `${location.id} は専用構図の背景を使う`);
    assert.equal(path.basename(location.hideouts.far), expectedWorldAssets[location.id].far, `${location.id} は遠景専用の開口を使う`);
    assert.equal(path.basename(location.hideouts.near), expectedWorldAssets[location.id].near, `${location.id} は近景専用の開口を使う`);
    assert.deepEqual(location.hideoutLayouts, expectedHideoutLayouts[location.id], `${location.id} の開口ごとのマスク・動物幅がα境界の監査値と一致`);
    assert.equal(location.scoreGoal, 50, `${location.id} は5回の通常成功で届く50点を次面条件にする`);
    for (const variant of ["far", "near"]) {
      assert.ok(Number.isFinite(location.hideoutLayouts[variant].groundAnchorY), `${location.id} ${variant} に素材内の接地アンカーがある`);
      assert.ok(location.hideoutLayouts[variant].groundAnchorY > 0 && location.hideoutLayouts[variant].groundAnchorY <= 100, `${location.id} ${variant} の接地アンカーは素材内に収まる`);
      assert.ok(Number.isFinite(location.hideoutLayouts[variant].foregroundTop), `${location.id} ${variant} に手前縁位置がある`);
      assert.ok(Number.isFinite(location.hideoutLayouts[variant].windowBottom), `${location.id} ${variant} に動物窓の下端がある`);
      assert.ok(Number.isFinite(location.hideoutLayouts[variant].windowSafetyBottom), `${location.id} ${variant} に外装下漏れ防止の安全クリップがある`);
      assert.notEqual(location.hideoutLayouts[variant].windowSafetyBottom, location.hideoutLayouts[variant].windowBottom, `${location.id} ${variant} の安全クリップは表示用の旧水平下端と分離する`);
      assert.ok(Number.isFinite(location.hideoutLayouts[variant].charWidth), `${location.id} ${variant} に動物幅がある`);
      assert.ok(Number.isFinite(location.hideoutLayouts[variant].charLiftPct), `${location.id} ${variant} にstack比の動物持ち上げ量がある`);
      assert.match(location.hideoutLayouts[variant].foregroundMask, /mask_hideout_world_.+\.png$/, `${location.id} ${variant} に外装専用alpha maskがある`);
    }
    const masks = ["far", "near"].map(variant => location.hideoutLayouts[variant].foregroundMask);
    assert.equal(new Set(masks).size, 2, `${location.id} の遠景・近景は別々の輪郭マスクを使う`);
    assert.ok(location.slots.every(slot => !Object.prototype.hasOwnProperty.call(slot, "y")), `${location.id} に画像中心基準の旧y座標を残さない`);
    assert.ok(location.slots.every(slot => Number.isFinite(slot.groundY) && slot.groundY >= 0 && slot.groundY <= 100), `${location.id} の全slotに画面内の接地座標がある`);
    assert.ok(location.slots.every(slot => ["far", "near"].includes(slot.hideout)), `${location.id} の全slotに遠景・近景種別がある`);
    assert.ok(location.slots.every(slot => slot.rotate === 0), `${location.id} の全slotは接地辺を浮かせる傾きを付けない`);
    assert.equal(location.partnerIds.length, 6, `${location.id} の通常動物は6種`);
    assert.equal(new Set(location.partnerIds).size, 6, `${location.id} の通常動物IDは重複しない`);
    for (const partnerId of location.partnerIds) {
      const catalogEntry = D.PARTNER_CATALOG[partnerId];
      assert.ok(catalogEntry, `${location.id}: ${partnerId} がカタログに存在する`);
      assert.equal(typeof catalogEntry.awake, "string", `${partnerId} にawake画像がある`);
      assert.equal(typeof catalogEntry.sleeping, "string", `${partnerId} にsleeping画像がある`);
    }
    assert.equal(location.bonusPartnerId, "hikari_momonga", `${location.id} の案内役はひかりモモンガ`);
  }

  // こもれび面は背景の左右に高い花・シダ・岩、上側に崖のリップがある。
  // 外装をそこへ重ねると、背景1枚絵との前後関係が逆転して見えるため、
  // 6か所すべてを中央の開けた草地3列へ収める。
  const clearingSlots = D.LOCATION_BY_ID.komorebi_clearing.slots;
  assert.ok(clearingSlots.every(slot => slot.x >= 29 && slot.x <= 71), "ひろばの全外装を左右の高い植生帯から外す");
  assert.ok(clearingSlots.every(slot => slot.x <= 42 || slot.x >= 58), "ひろば中央のコンボ表示帯を空ける");
  assert.ok(clearingSlots.slice(0, 2).every(slot => slot.groundY >= 63 && slot.groundY <= 66), "奥列を崖縁でなく平らな草地へ置く");
  assert.ok(clearingSlots.slice(2, 4).every(slot => slot.groundY >= 77 && slot.groundY <= 81), "中列を左右の花壇から外す");
  assert.ok(clearingSlots.slice(4, 6).every(slot => slot.groundY >= 90 && slot.groundY <= 93), "手前列を画面内の開けた草地へ置く");
  assert.ok(
    Math.max(...clearingSlots.slice(0, 2).map(slot => slot.depth))
      < Math.min(...clearingSlots.slice(2, 4).map(slot => slot.depth))
      && Math.max(...clearingSlots.slice(2, 4).map(slot => slot.depth))
      < Math.min(...clearingSlots.slice(4, 6).map(slot => slot.depth)),
    "ひろばの奥・中・手前で前後パースを段階的に大きくする"
  );

  const allForegroundMasks = D.LOCATIONS.flatMap(location => (
    ["far", "near"].map(variant => location.hideoutLayouts[variant].foregroundMask)
  ));
  assert.equal(allForegroundMasks.length, 10, "5場所×遠近の専用輪郭マスクが10件ある");
  assert.equal(new Set(allForegroundMasks).size, 10, "10種類の開口画像はすべて固有の輪郭マスクを使う");

  assert.match(D.LOCATION_BY_ID.komorebi_clearing.background, /bg_world_komorebi_lowangle_20260724\.png$/, "ひろばは子どもの目線の専用背景を使う");
  assert.match(D.LOCATION_BY_ID.donguri_path.background, /bg_world_donguri_overlook_20260724\.png$/, "こみちは見下ろし構図の専用背景を使う");
  assert.match(D.LOCATION_BY_ID.mizube.background, /bg_world_mizube_waterline_v2_20260724\.png$/, "みずべは泡状の石ドームを除いた修正版背景を使う");
  assert.match(D.LOCATION_BY_ID.mushroom_hill.background, /bg_world_mushroom_hill_sunset_20260724\.png$/, "きのこのおかは斜面を見上げる夕焼け専用背景を使う");
  assert.match(D.LOCATION_BY_ID.moonlight_forest.background, /bg_world_moonlight_forest_clearing_20260724\.png$/, "つきあかりのもりは円形広場を見下ろす専用背景を使う");
  assert.doesNotMatch(locationsJsSrc, /bg_world_mizube_waterline_20260724\.png/, "生成失敗の泡状石ドームを含む旧みずべ背景を実行時参照しない");
  assert.ok(D.LOCATION_BY_ID.donguri_path.partnerIds.includes("tanuki"), "こみちに新規たぬきが出る");
  assert.ok(D.LOCATION_BY_ID.mizube.partnerIds.includes("kawauso"), "みずべに新規かわうそが出る");
  assert.ok(D.LOCATION_BY_ID.mizube.partnerIds.includes("kaeru"), "みずべに新規かえるが出る");
  assert.ok(D.LOCATION_BY_ID.mushroom_hill.partnerIds.includes("yamane"), "きのこのおかに新規やまねが出る");
  assert.ok(D.LOCATION_BY_ID.moonlight_forest.partnerIds.includes("yamane"), "つきあかりのもりにもやまねが出る");
  assert.deepEqual(
    D.LOCATIONS.map(location => [location.startStory, location.resultStory]),
    [
      ["ひかりの たねを\nつきの はなへ とどけよう", "たねが こみちへ すすんだ！"],
      ["りすたちに みちを\nおしえて もらおう", "みずべまで きたよ！"],
      ["かわうそと たねを\nむこうぎしへ とどけよう", "ゆうやけの おかが みえた！"],
      ["きのこの あかりを\nたよりに のぼろう", "つきあかりまで あと いっぽ！"],
      ["つきあかりへ たねを\nとどけよう", "つきの はなが さいた！"]
    ],
    "5面を通してひかりのたねを月の花へ届ける物語がつながる"
  );
  assert.equal(D.LOCATION_BY_ID.moonlight_forest.afterStory, "あたらしい たねで また さんぽ！", "5面完走後は次の周回の目的を示す");

  for (const holeCount of [4, 5, 6]) {
    assert.equal(L.pickHole(holeCount, [], () => 0), 0, `${holeCount}か所: rand=0なら先頭`);
    assert.equal(L.pickHole(holeCount, [], () => 0.999999), holeCount - 1, `${holeCount}か所: rand≒1なら末尾`);
    assert.equal(
      L.pickHole(holeCount, Array.from({ length: holeCount - 1 }, (_, index) => index), () => 0.5),
      holeCount - 1,
      `${holeCount}か所: 禁止されていない唯一の候補を返す`
    );
    assert.equal(
      L.pickHole(holeCount, Array.from({ length: holeCount }, (_, index) => index), () => 0),
      null,
      `${holeCount}か所: 全候補禁止ならnull`
    );
  }
  assert.equal(L.pickHole(0, [], () => 0), null, "0か所は安全にnull");
  assert.equal(L.pickHole(NaN, [], () => 0), null, "不正な場所数は安全にnull");
  assert.equal(L.pickHole(4, [], () => NaN), 0, "不正な乱数は安全に先頭候補へフォールバック");
  assert.equal(L.pickHole([0, 1, 2, 3, 4], () => 0), 5, "旧2引数形式は6か所版として移行互換を保つ");

  const emptyWalk = D.normalizeWalkState(null);
  assert.deepEqual(emptyWalk, {
    version: 2,
    routeId: "mori-5-v1",
    routeCompletedRuns: 0,
    completedLocationIds: [],
    mode: "route",
    selectedLocationId: null,
    lastCompletedRunId: null,
    locationRecords: {}
  }, "保存なしは広場から始まる安全な初期状態");
  assert.equal(D.locationForRun(emptyWalk).id, "komorebi_clearing", "0完走は広場");
  assert.equal(D.locationForRun({ routeCompletedRuns: 1 }).id, "donguri_path", "1完走はこみち");
  assert.equal(D.locationForRun({ routeCompletedRuns: 2 }).id, "mizube", "2完走はみずべ");
  assert.equal(D.locationForRun({ routeCompletedRuns: 3 }).id, "mushroom_hill", "3完走はきのこのおか");
  assert.equal(D.locationForRun({ routeCompletedRuns: 4 }).id, "moonlight_forest", "4完走はつきあかりのもり");
  assert.equal(D.locationForRun({ routeCompletedRuns: 5 }).id, "komorebi_clearing", "5完走で広場へ一周する");
  assert.equal(D.scoreGoalForLocation("komorebi_clearing"), 50, "広場の達成点を取得できる");
  assert.equal(D.scoreGoalForLocation("unknown"), Infinity, "未知の場所は進行できない達成点にする");
  assert.equal(D.meetsLocationScoreGoal("komorebi_clearing", 49), false, "49点では次面へ進まない");
  assert.equal(D.meetsLocationScoreGoal("komorebi_clearing", 50), true, "50点ちょうどで次面へ進む");
  assert.equal(D.meetsLocationScoreGoal("unknown", 999), false, "未知の場所は高得点でも進行しない");
  assert.equal(
    D.locationForRun({ mode: "select", selectedLocationId: "mizube", routeCompletedRuns: 0 }).id,
    "mizube",
    "選択モードは指定場所を返す"
  );

  const repaired = D.normalizeWalkState({
    version: -8,
    routeId: "unknown",
    routeCompletedRuns: -4,
    completedLocationIds: ["mizube", "unknown", "mizube", "komorebi_clearing"],
    mode: "select",
    selectedLocationId: "unknown",
    lastCompletedRunId: "  run-old  ",
    locationRecords: {
      mizube: { plays: 2.9, bestScore: 123.8, bestCombo: -2 },
      unknown: { plays: 99, bestScore: 99, bestCombo: 99 }
    },
    extra: "drop me"
  });
  assert.equal(repaired.version, 2, "versionは現行へ正規化");
  assert.equal(repaired.routeId, "mori-5-v1", "routeIdは現行へ正規化");
  assert.equal(repaired.routeCompletedRuns, 0, "負の完走数は0");
  assert.deepEqual(repaired.completedLocationIds, ["komorebi_clearing", "mizube"], "完走地点は既知IDをルート順に重複排除");
  assert.equal(repaired.mode, "route", "未知の選択地点は一本道へ戻す");
  assert.equal(repaired.selectedLocationId, null, "未知の選択地点を残さない");
  assert.equal(repaired.lastCompletedRunId, "run-old", "runIdの外側空白を除く");
  assert.deepEqual(repaired.locationRecords, {
    mizube: { plays: 2, bestScore: 123, bestCombo: 0 }
  }, "場所別記録を既知ID・非負整数へ正規化");
  assert.equal(D.normalizeWalkState("{bad json").routeCompletedRuns, 0, "壊れたJSONは初期状態へ戻す");
  assert.equal(D.normalizeWalkState({ mode: "select", selectedLocationId: "toString" }).mode, "route", "Object.prototype名も未知の場所として扱う");
  assert.deepEqual(
    D.normalizeWalkState(JSON.stringify({ routeCompletedRuns: 2 })),
    D.normalizeWalkState({ routeCompletedRuns: 2 }),
    "JSON文字列とオブジェクトを同じ決定論状態へ正規化"
  );

  const migratedLegacyLap = D.normalizeWalkState({
    version: 1,
    routeId: "mori-3-v1",
    routeCompletedRuns: 3,
    completedLocationIds: ["mizube"],
    mode: "select",
    selectedLocationId: "mizube",
    lastCompletedRunId: " legacy-run ",
    locationRecords: {
      komorebi_clearing: { plays: 4, bestScore: 321, bestCombo: 18 },
      mizube: { plays: 1, bestScore: 99, bestCombo: 7 }
    }
  });
  assert.equal(migratedLegacyLap.version, 2, "旧3面保存をv2へ移行する");
  assert.equal(migratedLegacyLap.routeId, "mori-5-v1", "旧3面保存を5面ルートへ付け替える");
  assert.equal(migratedLegacyLap.routeCompletedRuns, 3, "旧3面を一周済みなら4面から再開する");
  assert.equal(D.locationForRun(migratedLegacyLap).id, "mushroom_hill", "移行直後の現在地はきのこのおか");
  assert.deepEqual(
    migratedLegacyLap.completedLocationIds,
    ["komorebi_clearing", "donguri_path", "mizube"],
    "旧ルート一周済みなら最初の3面を完了済みとして補完する"
  );
  assert.equal(migratedLegacyLap.mode, "route", "移行直後は旧選択モードを解除して4面へ案内する");
  assert.equal(migratedLegacyLap.selectedLocationId, null, "移行直後に旧選択地点を残さない");
  assert.equal(migratedLegacyLap.lastCompletedRunId, "legacy-run", "移行時も二重完了防止runIdを保持する");
  assert.deepEqual(
    migratedLegacyLap.locationRecords,
    {
      komorebi_clearing: { plays: 4, bestScore: 321, bestCombo: 18 },
      mizube: { plays: 1, bestScore: 99, bestCombo: 7 }
    },
    "移行時も既存の場所別記録を保持する"
  );

  const migratedManyLegacyLaps = D.normalizeWalkState({
    version: 1,
    routeId: "mori-3-v1",
    routeCompletedRuns: 77,
    completedLocationIds: ["komorebi_clearing", "donguri_path", "mizube"]
  });
  assert.equal(migratedManyLegacyLaps.routeCompletedRuns, 3, "旧版を何周していても新しい4・5面を飛ばさず4面へ移す");
  assert.equal(D.locationForRun(migratedManyLegacyLaps).id, "mushroom_hill", "旧版の大きな完走数でも4面から始める");

  const legacyInProgress = D.normalizeWalkState({
    version: 1,
    routeId: "mori-3-v1",
    routeCompletedRuns: 2,
    completedLocationIds: ["komorebi_clearing", "donguri_path"]
  });
  assert.equal(legacyInProgress.routeCompletedRuns, 2, "旧3面を一周前なら進行位置を維持する");
  assert.equal(D.locationForRun(legacyInProgress).id, "mizube", "旧3面の途中保存は次の未完了面から再開する");

  const currentRouteLap = D.normalizeWalkState({
    version: 2,
    routeId: "mori-5-v1",
    routeCompletedRuns: 5,
    completedLocationIds: D.ROUTE_IDS
  });
  assert.equal(currentRouteLap.routeCompletedRuns, 5, "現行5面保存を旧版移行と誤判定しない");
  assert.equal(D.locationForRun(currentRouteLap).id, "komorebi_clearing", "現行5面完走後は新しい種で1面へ戻る");

  const beforeFirstAdvance = D.normalizeWalkState(null);
  const firstAdvance = D.advanceWalkState(beforeFirstAdvance, {
    runId: "run-1",
    locationId: "komorebi_clearing",
    mode: "route",
    score: 108,
    bestCombo: 7
  });
  assert.equal(beforeFirstAdvance.routeCompletedRuns, 0, "advanceWalkStateは入力を変更しない");
  assert.equal(firstAdvance.routeCompletedRuns, 1, "完走で一本道を1歩進める");
  assert.deepEqual(firstAdvance.completedLocationIds, ["komorebi_clearing"], "完走した場所を追加");
  assert.deepEqual(firstAdvance.locationRecords.komorebi_clearing, {
    plays: 1,
    bestScore: 108,
    bestCombo: 7
  }, "場所別回数・最高点・最大コンボを記録");
  assert.equal(firstAdvance.lastCompletedRunId, "run-1", "反映済みrunIdを保存");
  assert.equal(D.locationForRun(firstAdvance).id, "donguri_path", "次のrunはこみち");

  const duplicateAdvance = D.advanceWalkState(firstAdvance, {
    runId: "run-1",
    locationId: "donguri_path",
    mode: "route",
    score: 999,
    bestCombo: 99
  });
  assert.deepEqual(duplicateAdvance, firstAdvance, "同じrunIdの二重完了では歩数・記録を増やさない");
  assert.notEqual(duplicateAdvance, firstAdvance, "重複時も呼び出し側が安全に扱える新しい正規化オブジェクトを返す");

  const secondFailed = D.advanceWalkState(firstAdvance, {
    runId: "run-2-low",
    locationId: "donguri_path",
    mode: "route",
    score: 49,
    bestCombo: 4
  });
  assert.equal(secondFailed.routeCompletedRuns, 1, "49点では一本道を進めない");
  assert.deepEqual(secondFailed.completedLocationIds, ["komorebi_clearing"], "未達の場所を完了済みにしない");
  assert.deepEqual(secondFailed.locationRecords.donguri_path, {
    plays: 1,
    bestScore: 49,
    bestCombo: 4
  }, "未達でも遊んだ回数・最高点・最大コンボは残す");
  assert.equal(secondFailed.lastCompletedRunId, "run-2-low", "未達runIdも二重記録防止のため保存する");
  assert.equal(D.locationForRun(secondFailed).id, "donguri_path", "未達後は同じこみちから再挑戦する");

  const duplicateFailed = D.advanceWalkState(secondFailed, {
    runId: "run-2-low",
    locationId: "donguri_path",
    mode: "route",
    score: 999,
    bestCombo: 99
  });
  assert.deepEqual(duplicateFailed, secondFailed, "同じ未達runIdを二重に記録しない");

  const secondAdvance = D.advanceWalkState(secondFailed, {
    runId: "run-2",
    locationId: "donguri_path",
    mode: "route",
    score: 50,
    bestCombo: 5
  });
  assert.equal(secondAdvance.routeCompletedRuns, 2, "50点ちょうどで一本道を1歩進める");
  assert.equal(secondAdvance.locationRecords.donguri_path.plays, 2, "再挑戦も遊んだ回数へ記録する");
  assert.equal(secondAdvance.locationRecords.donguri_path.bestScore, 50, "達成時の最高点へ更新する");
  assert.equal(D.locationForRun(secondAdvance).id, "mizube", "2歩目の次はみずべ");

  const thirdAdvance = D.advanceWalkState(secondAdvance, {
    runId: "run-3",
    locationId: "mizube",
    mode: "route",
    score: 80,
    bestCombo: 6
  });
  assert.equal(thirdAdvance.routeCompletedRuns, 3, "みずべ完走で4面へ進む");
  assert.equal(D.locationForRun(thirdAdvance).id, "mushroom_hill", "みずべの次はきのこのおか");
  const fourthAdvance = D.advanceWalkState(thirdAdvance, {
    runId: "run-4",
    locationId: "mushroom_hill",
    mode: "route",
    score: 120,
    bestCombo: 10
  });
  assert.equal(fourthAdvance.routeCompletedRuns, 4, "きのこのおか完走で5面へ進む");
  assert.equal(D.locationForRun(fourthAdvance).id, "moonlight_forest", "きのこのおかの次はつきあかりのもり");
  const fifthAdvance = D.advanceWalkState(fourthAdvance, {
    runId: "run-5",
    locationId: "moonlight_forest",
    mode: "route",
    score: 150,
    bestCombo: 12
  });
  assert.equal(fifthAdvance.routeCompletedRuns, 5, "つきあかりのもり完走で5面ルートを一周する");
  assert.equal(D.locationForRun(fifthAdvance).id, "komorebi_clearing", "5面完走後は新しい種で広場へ戻る");
  assert.deepEqual(fifthAdvance.completedLocationIds, D.ROUTE_IDS, "5面完走時に全地点が完了済みになる");

  const wrongRouteLocation = D.advanceWalkState(secondAdvance, {
    runId: "run-other-location",
    locationId: "komorebi_clearing",
    mode: "route",
    score: 10,
    bestCombo: 1
  });
  assert.equal(wrongRouteLocation.routeCompletedRuns, 2, "現在地と違う古いrunは一本道を飛ばさない");
  assert.equal(wrongRouteLocation.locationRecords.komorebi_clearing.plays, 2, "古いrunも遊んだ場所の記録としては残す");

  const selectedAdvance = D.advanceWalkState({
    ...secondAdvance,
    mode: "select",
    selectedLocationId: "komorebi_clearing"
  }, {
    runId: "run-select",
    locationId: "komorebi_clearing",
    mode: "select",
    score: 222,
    bestCombo: 12
  });
  assert.equal(selectedAdvance.routeCompletedRuns, 2, "場所選択の完走は一本道を進めない");
  assert.deepEqual(selectedAdvance.locationRecords.komorebi_clearing, {
    plays: 2,
    bestScore: 222,
    bestCombo: 12
  }, "場所選択でも場所別記録は更新する");
  assert.deepEqual(
    D.advanceWalkState(secondAdvance, { runId: "", locationId: "mizube", mode: "route" }),
    secondAdvance,
    "runIdなしでは完走を反映しない"
  );
}

// ── 3. registerTap 基礎 ─────────────────────────────────────────────
{
  assert.equal(L.NORMAL_HIT_SCORE, 10, "通常の基本点は10");
  assert.equal(L.BONUS_HIT_SCORE, 30, "ボーナスの基本点は30");
  assert.equal(L.MAX_COMBO_BONUS, 10, "コンボ加点上限は10");
  assert.equal(typeof L.hitScoreFor, "function", "hitScoreFor が公開される");

  const scoreCases = [
    { before: 0, target: "awake", next: 1, base: 10, comboBonus: 0, delta: 10, isBonus: false },
    { before: 1, target: "awake", next: 2, base: 10, comboBonus: 1, delta: 11, isBonus: false },
    { before: 10, target: "awake", next: 11, base: 10, comboBonus: 10, delta: 20, isBonus: false },
    { before: 11, target: "awake", next: 12, base: 10, comboBonus: 10, delta: 20, isBonus: false },
    { before: 0, target: "bonus", next: 1, base: 30, comboBonus: 0, delta: 30, isBonus: true },
    { before: 2, target: "bonus", next: 3, base: 30, comboBonus: 2, delta: 32, isBonus: true },
    { before: 999, target: "bonus", next: 1000, base: 30, comboBonus: 10, delta: 40, isBonus: true },
    { before: NaN, target: "awake", next: 1, base: 10, comboBonus: 0, delta: 10, isBonus: false },
    { before: -5, target: "bonus", next: 1, base: 30, comboBonus: 0, delta: 30, isBonus: true }
  ];
  for (const c of scoreCases) {
    assert.deepEqual(
      L.hitScoreFor(c.before, c.target),
      { nextCombo: c.next, baseScore: c.base, comboBonus: c.comboBonus, scoreDelta: c.delta, isBonus: c.isBonus },
      `hitScoreFor(${String(c.before)}, ${c.target}) の内訳が一致`
    );
  }

  // awake: +10+min(combo,10)、ボーナス上限10をループで検証
  const state = L.createInitialState();
  assert.equal(state.bonusHits, 0, "初期bonusHitsは0");
  let t = 0;
  for (let i = 0; i < 15; i++) {
    const before = state.score;
    const expectedBonus = Math.min(state.combo, 10);
    const res = L.registerTap(state, t, "awake");
    assert.equal(res.result, "hit", `#${i}: awakeタップは hit`);
    assert.equal(res.scoreDelta, 10 + expectedBonus, `#${i}: scoreDelta は 10+min(combo,10)`);
    assert.equal(res.combo, i + 1, `#${i}: 戻り値comboがリアルタイム値と一致`);
    assert.equal(res.bestCombo, i + 1, `#${i}: 戻り値bestComboが更新される`);
    assert.equal(res.baseScore, 10, `#${i}: 通常のbaseScoreは10`);
    assert.equal(res.comboBonus, expectedBonus, `#${i}: comboBonus内訳が一致`);
    assert.equal(res.isBonus, false, `#${i}: 通常hitはisBonus=false`);
    assert.equal(state.score, before + 10 + expectedBonus, `#${i}: score加算が一致`);
    t += 1.0; // クールダウン(0.22s)より十分長い間隔で連打を回避
  }
  assert.ok(state.bestCombo >= 15, "bestCombo が更新され続けている");

  // normal → normal → bonus: 10 + 11 + 32 = 53。
  const mixed = L.createInitialState();
  const m1 = L.registerTap(mixed, 0, "awake");
  const m2 = L.registerTap(mixed, 1, "awake");
  const m3 = L.registerTap(mixed, 2, "bonus");
  assert.deepEqual([m1.scoreDelta, m2.scoreDelta, m3.scoreDelta], [10, 11, 32], "通常・通常・ボーナスの加点列");
  assert.equal(mixed.score, 53, "通常・通常・ボーナスの合計は53点");
  assert.equal(mixed.combo, 3, "3回連続成功で3コンボ");
  assert.equal(mixed.bestCombo, 3, "最大コンボも3");
  assert.equal(mixed.hits, 3, "bonusを含む成功数は3");
  assert.equal(mixed.bonusHits, 1, "bonus成功数だけを別記録");
  assert.equal(m3.baseScore, 30, "bonusのbaseScoreは30");
  assert.equal(m3.comboBonus, 2, "3コンボ目のcomboBonusは2");
  assert.equal(m3.isBonus, true, "bonus hitのメタデータ");

  // sleeping: 減点なし・combo=0・bestCombo維持・lock 1.0s
  const s2 = L.createInitialState();
  const r2a = L.registerTap(s2, 0, "sleeping");
  assert.equal(r2a.result, "sleepPenalty");
  assert.equal(s2.score, 0, "sleepingタップでもscoreは0のまま");
  assert.equal(r2a.scoreDelta, 0, "sleepingタップのscoreDeltaは0");
  assert.equal(s2.combo, 0, "sleepingタップでcomboが0");
  assert.equal(s2.inputLockUntil, 1.0, "sleepingタップ後は1.0秒ロック");

  const s2b = L.createInitialState();
  L.registerTap(s2b, 0, "awake"); // combo=1, score=10
  L.registerTap(s2b, 1.0, "awake"); // combo=2, score=10+11=21
  const scoreBefore = s2b.score;
  const bestBefore = s2b.bestCombo;
  const r2c = L.registerTap(s2b, 2.0, "sleeping");
  assert.equal(s2b.score, scoreBefore, "sleepingタップでも得点は減らない");
  assert.equal(r2c.scoreDelta, 0, "sleepingのscoreDeltaは0");
  assert.equal(s2b.combo, 0, "sleepingタップでcomboリセット");
  assert.equal(s2b.bestCombo, bestBefore, "sleepingタップでも最大コンボは維持");

  // empty: combo=0・lock 0.35s・score不変
  const s3 = L.createInitialState();
  L.registerTap(s3, 0, "awake");
  const scoreBeforeEmpty = s3.score;
  const r3 = L.registerTap(s3, 1.0, "empty");
  assert.equal(r3.result, "whiff");
  assert.equal(r3.scoreDelta, 0, "emptyタップはscoreDelta 0");
  assert.equal(s3.score, scoreBeforeEmpty, "emptyタップでscoreが不変");
  assert.equal(s3.combo, 0, "emptyタップでcomboリセット");
  assert.equal(s3.bestCombo, 1, "emptyタップでも最大コンボは維持");
  assert.equal(s3.inputLockUntil, 1.35, "emptyタップ後は0.35秒ロック");

  // 無入力の取り逃しは、急かさないためcomboを維持する。
  const missed = L.createInitialState();
  L.registerTap(missed, 0, "awake");
  L.registerTap(missed, 1, "bonus");
  const missedSnapshot = { score: missed.score, combo: missed.combo, bestCombo: missed.bestCombo };
  assert.equal(L.missedAwake(missed), missed, "missedAwakeは同じstateを返す");
  assert.deepEqual(
    { score: missed.score, combo: missed.combo, bestCombo: missed.bestCombo },
    missedSnapshot,
    "awake / bonusの自然退場では得点・combo・最大comboをすべて維持"
  );
  assert.equal(L.missedAwake(null), null, "stateなしでも安全");
}

// ── 3b. 表示を増やさない成功地点リズム ─────────────────────────────
{
  assert.equal(L.RELAY_HITS_PER_STAGE, undefined, "花壇進行の公開定数を撤去");
  assert.equal(L.FLOWER_STAGE_MAX, undefined, "花壇段階の公開定数を撤去");
  assert.equal(L.relayProgressAt, undefined, "花壇進行APIを撤去");
  assert.equal(L.advanceRelay, undefined, "ひかりのたね進行APIを撤去");
  const initial = L.createInitialState();
  for (const key of ["relayHits", "relayStep", "flowerStage"]) {
    assert.equal(Object.prototype.hasOwnProperty.call(initial, key), false, `${key} をゲーム状態へ残さない`);
  }
}

// ── 4. クールダウン ──────────────────────────────────────────────────
{
  const state = L.createInitialState();
  L.registerTap(state, 0, "awake");
  const scoreAfterFirstHit = state.score;

  const rLocked = L.registerTap(state, 0.1, "awake");
  assert.equal(rLocked.result, "locked", "0.1秒後 (0.22秒クールダウン未経過) は locked");
  assert.equal(state.score, scoreAfterFirstHit, "locked中はscoreが変化しない");
  assert.equal(state.combo, 1, "locked入力ではcomboをリセットしない");
  assert.equal(state.bestCombo, 1, "locked入力では最大comboも変えない");

  const rHit = L.registerTap(state, 0.25, "awake");
  assert.equal(rHit.result, "hit", "0.25秒後 (クールダウン経過後) は hit になる");
  assert.ok(state.score > scoreAfterFirstHit, "クールダウン経過後は加点される");
}

// ── 5. 【MUST】スパム vs 正当プレイ シミュレーション ────────────────
{
  const SEED = 20260722;

  // 30秒分の出現スケジュールを構築 (両戦略に同一スケジュールを与える)。
  function buildSchedule(seed) {
    const rand = mulberry32(seed);
    const state = L.createInitialState();
    const recentKinds = [];
    const occupied = []; // 現在埋まっている穴 index の配列 (簡易モデル: showUntilで解放)
    const schedule = [];
    let spawnTimerMs = 0;
    let actualSpawnCount = 0;
    const DT = 0.05; // 50ms刻みでスケジュール構築 (spawnInterval最小900msより十分細かい)

    while (state.elapsed < L.GAME_DURATION) {
      // 期限切れの占有穴を解放
      for (let i = occupied.length - 1; i >= 0; i--) {
        if (state.elapsed >= occupied[i].showUntil) occupied.splice(i, 1);
      }
      spawnTimerMs += DT * 1000;
      const interval = L.spawnIntervalAt(state.elapsed);
      if (spawnTimerMs >= interval && occupied.filter(o => o).length < 2) {
        spawnTimerMs = 0;
        const occupiedIdx = occupied.map(o => o.hole);
        const hole = L.pickHole(D.LOCATIONS[0].slots.length, occupiedIdx, rand);
        if (hole !== null) {
          actualSpawnCount += 1;
          const kind = L.isBonusSpawn(actualSpawnCount)
            ? "bonus"
            : L.pickSpawnKind(state.elapsed, recentKinds, rand);
          recentKinds.push(kind === "bonus" ? "awake" : kind);
          if (recentKinds.length > 6) recentKinds.shift();
          const showTime = kind === "bonus" ? L.bonusShowTimeAt(state.elapsed) : L.showTimeAt(state.elapsed);
          const tShow = state.elapsed;
          const tHide = state.elapsed + showTime;
          occupied.push({ hole, showUntil: tHide });
          schedule.push({ tShow, tHide, hole, kind });
        }
      }
      state.elapsed += DT;
      state.time += DT;
    }
    return schedule;
  }

  function resolveTarget(schedule, hole, t) {
    for (const item of schedule) {
      if (item.hole === hole && t >= item.tShow && t < item.tHide) return item.kind;
    }
    return "empty";
  }

  const scheduleA = buildSchedule(SEED);
  const scheduleB = buildSchedule(SEED);
  const scheduleC = buildSchedule(SEED);

  // 戦略A (honest): 各awake/bonus出現の tShow+0.15 にその穴だけをタップする。
  function runHonest(schedule) {
    const state = L.createInitialState();
    const taps = [];
    for (const item of schedule) {
      if (item.kind === "awake" || item.kind === "bonus") taps.push({ t: item.tShow + 0.15, hole: item.hole });
    }
    taps.sort((a, b) => a.t - b.t);
    for (const tap of taps) {
      if (tap.t > L.GAME_DURATION) continue;
      const target = resolveTarget(schedule, tap.hole, tap.t);
      L.registerTap(state, tap.t, target);
    }
    L.tickTimer(state, L.GAME_DURATION);
    return state;
  }

  // 戦略B (machine-gun): t=0から60ms刻みで穴(i%6)を機械的に連打。
  function runMachineGun(schedule, stepMs) {
    const state = L.createInitialState();
    let hole = 0;
    for (let t = 0; t <= L.GAME_DURATION; t += stepMs / 1000) {
      const target = resolveTarget(schedule, hole, t);
      L.registerTap(state, t, target);
      hole = (hole + 1) % D.LOCATIONS[0].slots.length;
    }
    L.tickTimer(state, L.GAME_DURATION);
    return state;
  }

  const stateHonest = runHonest(scheduleA);
  const stateSpam60 = runMachineGun(scheduleB, 60);
  const stateSpam16 = runMachineGun(scheduleC, 16);

  assert.ok(stateHonest.score > stateSpam60.score, "honest戦略は60ms連打より高スコア");
  assert.ok(stateHonest.score > stateSpam16.score, "honest戦略は16ms連打より高スコア");
  assert.ok(stateSpam60.score < stateHonest.score * 0.5, "60ms連打はhonestの半分にも届かない");
  assert.ok(stateSpam16.score < stateHonest.score * 0.5, "16ms連打はhonestの半分にも届かない");
  assert.ok(stateSpam60.overheatCount >= 1, "60ms連打でOVERHEATが実際に発火する");
  assert.ok(stateSpam16.overheatCount >= 1, "16ms連打でOVERHEATが実際に発火する");
  assert.ok(stateHonest.score > 0, "honest戦略自体が成立している (テストの自己健全性)");
  assert.ok(stateHonest.bonusHits >= 1, "30秒のhonest戦略で決定論bonusを実際に獲得できる");
  assert.equal(stateHonest.overheatCount, 0, "honest戦略はSPAM_THRESHOLDに一度も達しない (正当プレイ誤爆なし)");
}

// ── 6. OVERHEAT 解除 ────────────────────────────────────────────────
{
  const state = L.createInitialState();
  // 短時間に SPAM_THRESHOLD(8) 回タップして OVERHEAT を発火させる
  let overheated = false;
  let t = 0;
  for (let i = 0; i < 10; i++) {
    const res = L.registerTap(state, t, "empty");
    if (res.result === "overheat") overheated = true;
    t += 0.05;
  }
  assert.ok(overheated, "前提: 連打でOVERHEATが発火している");
  assert.equal(state.combo, 0, "OVERHEATで現在comboをリセットする");
  assert.equal(state.bestCombo, 0, "成功前のOVERHEATでは最大comboは0のまま");
  const lockedAt = state.inputLockUntil;

  // 恒久ロックではない: OVERHEAT_LOCK 経過後の単発タップは hit になる
  const tAfter = lockedAt + 0.01;
  const resAfter = L.registerTap(state, tAfter, "awake");
  assert.equal(resAfter.result, "hit", "OVERHEAT_LOCK経過後の単発タップはhitになる (恒久ロックは連打継続時のみ)");

  const streak = L.createInitialState();
  L.registerTap(streak, 0, "awake");
  L.registerTap(streak, 1, "bonus");
  for (let i = 0; i < L.SPAM_THRESHOLD; i++) {
    L.registerTap(streak, 2 + i * 0.05, "empty");
  }
  assert.ok(streak.overheatCount >= 1, "成功後の連打でもOVERHEATが発火する");
  assert.equal(streak.combo, 0, "成功後のOVERHEATで現在comboは0");
  assert.equal(streak.bestCombo, 2, "OVERHEATでも達成済み最大comboは維持");
}

// ── 7. タイマー ──────────────────────────────────────────────────────
{
  const state = L.createInitialState();
  L.tickTimer(state, 29.999);
  assert.equal(state.finished, false, "29.999秒ではまだfinishedではない");
  assert.ok(Math.abs(state.elapsed - 29.999) < 1e-9, "29.999秒を保持する");
  L.tickTimer(state, 0.001);
  assert.equal(state.finished, true, "30秒到達でfinished === true");
  assert.equal(state.elapsed, 30, "elapsedは30秒でクランプ");

  const resAfterFinish = L.registerTap(state, state.time, "awake");
  assert.equal(resAfterFinish.result, "finished", "finished後のregisterTapはfinished");

  // finished間際のsleepingタップの1.0sロックがsettling中に解除される
  const s2 = L.createInitialState();
  L.tickTimer(s2, 29.5);
  assert.equal(s2.finished, false, "前提: 29.5秒時点ではまだfinishedではない");
  const rSleep = L.registerTap(s2, s2.time, "sleeping");
  assert.equal(rSleep.result, "sleepPenalty");
  const lockUntil = s2.inputLockUntil; // 29.5 + 1.0 = 30.5
  assert.ok(lockUntil > L.GAME_DURATION, "前提: ロック解除時刻がGAME_DURATIONを超えている");

  L.tickTimer(s2, 0.9); // time=30.4 -> elapsedは30でクランプされfinished=true。まだlockUntil(30.5)未満
  assert.equal(s2.finished, true, "30秒超過でfinishedになる");
  assert.ok(s2.time < lockUntil, "finished直後はまだロック解除時刻未満のはず");

  L.tickTimer(s2, 0.5); // time=30.9, settling中を模擬。壁時計が進みロック解除時刻を超える
  assert.ok(s2.time >= lockUntil, "settling中でも壁時計が進みロック解除時刻を超える");
}

// ── 8. iOS タッチ対策 (regex) ────────────────────────────────────────
{
  assert.match(gameJs, /addEventListener\(\s*['"]touchstart['"]/, "touchstart リスナーが存在する");
  assert.match(gameJs, /addEventListener\(\s*['"]touchend['"]/, "touchend リスナーが存在する");
  assert.match(gameJs, /addEventListener\(\s*['"]touchcancel['"]/, "touchcancel リスナーが存在する");
  const hasTouchActionNone = /touch-action:\s*none/.test(stylesCss) || /touch-action:\s*none/.test(indexHtml);
  assert.ok(hasTouchActionNone, "styles.css または index.html に touch-action: none が存在する");
}

// ── 9. 共有モジュール結線 (regex) ────────────────────────────────────
{
  const scriptSrcOrder = [...indexHtml.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/g)].map(m => m[1]);
  const idxOf = needle => scriptSrcOrder.findIndex(src => src.includes(needle));

  const idxHighscore = idxOf("highscore.js");
  const idxHaptics = idxOf("haptics.js");
  const idxAchievements = idxOf("achievements.js");
  const idxMenu = idxOf("menu.js");
  const idxLocations = idxOf("js/locations.js");
  const idxLogic = idxOf("js/logic.js");
  const idxGame = idxOf("js/game.js");

  for (const [name, idx] of [["highscore.js", idxHighscore], ["haptics.js", idxHaptics], ["achievements.js", idxAchievements], ["menu.js", idxMenu]]) {
    assert.ok(idx !== -1, `${name} が index.html に読み込まれている`);
  }
  assert.ok(idxLocations !== -1, "js/locations.js が index.html に読み込まれている");
  assert.ok(idxLogic !== -1, "js/logic.js が index.html に読み込まれている");
  assert.ok(idxGame !== -1, "js/game.js が index.html に読み込まれている");
  assert.ok(idxHighscore < idxLogic && idxHaptics < idxLogic && idxAchievements < idxLogic && idxMenu < idxLogic,
    "共通モジュールは logic.js より前に読み込まれる");
  assert.ok(idxLocations < idxLogic && idxLogic < idxGame, "locations.js → logic.js → game.js の順で読み込む");

  assert.match(gameJs, /var\s+HIGH_SCORE_GAME_ID\s*=\s*['"]hyokkori-hightouch-v2['"]/, "30秒版は旧60秒版と分けたハイスコアIDを使う");
  assert.match(gameJs, /saveHighScore\(\s*HIGH_SCORE_GAME_ID\s*,/, "game.js が30秒版IDで saveHighScore(...) を呼ぶ");
  assert.match(gameJs, /showHighScoreTable\(\s*HIGH_SCORE_GAME_ID\s*,/, "game.js が30秒版IDで showHighScoreTable(...) を呼ぶ");
}

// ── 10. AR (画像縦横比) 違反禁止 (regex) ─────────────────────────────
{
  for (const [name, src] of [["styles.css", stylesCss], ["index.html", indexHtml], ["game.js", gameJs]]) {
    assert.doesNotMatch(src, /background-size:\s*100%\s+100%/, `${name} に background-size:100% 100% (stretch) が存在しない`);
    assert.doesNotMatch(src, /object-fit:\s*fill/, `${name} に object-fit:fill (stretch) が存在しない`);
  }
  assert.match(stylesCss, /object-fit:\s*contain/, "styles.css がキャラ画像に object-fit:contain を使っている");
}

// ── 11. 専用画像・色だけに頼らない睡眠表現 ──────────────────────────
{
  const fixedAssetNames = [
    "menu_thumb_highfive_combo.png",
    "fx_highfive_burst.png",
    "fx_leaf_puff.png",
    "fx_overheat_swirl.png",
    "fx_sleep_moon_cloud.png",
    "pono_title_highfive.png",
    "story_moon_flower_bloom.png"
  ];
  const catalogAssetNames = Object.values(D.PARTNER_CATALOG)
    .flatMap(entry => [entry.awake, entry.sleeping].filter(Boolean))
    .map(assetPath => path.basename(assetPath));
  const locationAssetNames = D.LOCATIONS
    .flatMap(location => [
      location.background,
      location.hideouts.far,
      location.hideouts.near,
      location.hideoutLayouts.far.foregroundMask,
      location.hideoutLayouts.near.foregroundMask
    ])
    .map(assetPath => path.basename(assetPath));
  const assetNames = [...fixedAssetNames, ...catalogAssetNames, ...locationAssetNames];
  assert.equal(assetNames.length, new Set(assetNames).size, "場所データから導出した実行時画像名は重複しない");
  for (const name of assetNames) {
    assert.ok(fs.existsSync(path.join(root, "assets/images/hyokkori-hightouch", name)), `${name} が配置されている`);
  }
  assert.match(D.PARTNER_CATALOG.araiguma.awake, /friend_araiguma_awake\.png$/, "awake専用画像を参照する");
  assert.match(D.PARTNER_CATALOG.araiguma.sleeping, /friend_araiguma_sleeping\.png$/, "sleeping専用画像を参照する");
  assert.match(D.PARTNER_CATALOG.kaeru.awake, /friend_kaeru_awake\.png$/, "みずべのかえるにawake専用画像がある");
  assert.match(D.PARTNER_CATALOG.kaeru.sleeping, /friend_kaeru_sleeping\.png$/, "みずべのかえるにsleeping専用画像がある");
  assert.match(D.PARTNER_CATALOG.yamane.awake, /friend_yamane_awake\.png$/, "後半のやまねにawake専用画像がある");
  assert.match(D.PARTNER_CATALOG.yamane.sleeping, /friend_yamane_sleeping\.png$/, "後半のやまねにsleeping専用画像がある");
  assert.match(D.PARTNER_CATALOG.hikari_momonga.awake, /friend_hikari_momonga_bonus_awake\.png$/, "見た目で区別できるボーナス専用画像を参照する");
  assert.match(gameJs, /HyokkoriLocations/, "game.js が場所・動物カタログを参照する");
  assert.match(indexHtml + gameJs, /fx_sleep_moon_cloud\.png/, "閉眼ポーズに加えて月雲を使う");
  assert.match(stylesCss, /\.is-sleeping/, "styles.css に .is-sleeping クラスが存在する");
  assert.doesNotMatch(stylesCss, /grayscale/, "睡眠状態を色だけで区別しない");
  assert.doesNotMatch(indexHtml + gameJs, /💤/, "旧emoji睡眠表示を専用画像へ置換済み");
  assert.doesNotMatch(indexHtml + gameJs, /reference_only_/, "比較用画像を実行時参照しない");
  assert.doesNotMatch(
    locationsJsSrc + gameJs + indexHtml + stylesCss,
    /bg_forest_combo_terraces\.png|bg_donguri_path_autumn_20260723\.png|bg_mizube_cool_20260723\.png|hideout_leaf_bush\.png/,
    "旧背景・共通開口を実行時ソースへ残さない"
  );
  assert.match(gameJs, /var\s+lastSuccessfulHole\s*=\s*null/, "直前の成功地点だけを内部保持する");
  assert.match(gameJs, /forbidden\.push\(lastSuccessfulHole\)/, "直前の成功地点を次の出現候補から外す");
  assert.match(gameJs, /function\s+rememberSuccessfulHole\([^)]*\)[\s\S]*?lastSuccessfulHole\s*=\s*idx/, "awake・bonus成功時だけ地点を更新する");
  assert.match(gameJs, /lastSuccessfulHole\s*=\s*null;[\s\S]{0,120}dataset\.lastSuccessfulHole\s*=\s*['"]['"]/, "リトライ時に成功地点の除外を解除する");
  assert.doesNotMatch(indexHtml, /id=["'](?:relay-progress|relay-announcement|relay-pips|flowerbed-img|light-seed)["']/, "花壇・たねの表示DOMを撤去する");
  assert.doesNotMatch(gameJs + logicJsSrc + stylesCss, /relayProgressAt|advanceRelay|FLOWER_STAGE_MAX|mechanic_light_seed|#light-seed|#flowerbed-img/, "花壇・たねの実行時処理とCSSを撤去する");
  assert.equal((indexHtml.match(/class=["'][^"']*hh-hideout-foreground/g) || []).length, 1, "templateに共通の手前縁を1つ定義する");
  assert.match(stylesCss, /--foreground-top:\s*62%/, "mask-image非対応時の水平前景fallbackを持つ");
  assert.match(stylesCss, /--window-bottom:\s*35\.5%/, "救済タップ判定用の見えている下端を持つ");
  assert.match(stylesCss, /--window-safety-bottom:\s*24%/, "外装下からの漏れだけを防ぐ安全クリップ既定値を持つ");
  assert.match(stylesCss, /--foreground-mask:\s*none/, "外装専用alpha maskのCSS変数を持つ");
  assert.match(stylesCss, /--char-ground-lift:\s*18\.34%/, "動物停止位置の既定値をground stack比で持つ");
  assert.match(stylesCss, /top:\s*calc\(0px\s*-\s*var\(--char-ground-lift\)\)/, "動物停止位置に固定px clampを挟まずstack比をそのまま使う");
  assert.match(stylesCss, /\.hh-hideout-foreground\s*\{[^}]*z-index:\s*4[^}]*clip-path:\s*inset\(var\(--foreground-top\)\s+0\s+0\s+0\)/s, "非対応環境だけは水平前景fallbackをキャラより上に重ねる");
  assert.match(stylesCss, /@supports[^{]*-webkit-mask-image[^{]*mask-image[^{]*\{[\s\S]*?\.hh-hideout-foreground\s*\{[\s\S]*?clip-path:\s*none/s, "mask-image対応環境では水平前景を解除する");
  assert.match(stylesCss, /-webkit-mask-image:\s*var\(--foreground-mask\)/, "Safari PWA向けにprefixed alpha maskを使う");
  assert.match(stylesCss, /(?<!-webkit-)mask-image:\s*var\(--foreground-mask\)/, "標準alpha maskも併記する");
  assert.match(stylesCss, /mask-mode:\s*alpha/, "PNGの透過alphaを輪郭マスクとして解釈する");
  assert.match(stylesCss, /-webkit-mask-size:\s*100%\s+100%/, "Safariでも開口画像とマスクを同じ正方形へ合わせる");
  assert.match(stylesCss, /(?<!-webkit-)mask-size:\s*100%\s+100%/, "標準maskも開口画像と同じ正方形へ合わせる");
  assert.match(stylesCss, /#board\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/s, "可変配置の盤面をステージ全面へ重ねる");
  assert.match(stylesCss, /\.hh-hole\s*\{[^}]*position:\s*absolute[^}]*top:\s*var\(--slot-y[^}]*left:\s*var\(--slot-x/s, "かくれ場所buttonの中心を定義データの接地点へ置く");
  assert.match(gameJs, /function\s+buildHoles\(\s*location\s*\)[\s\S]*?location\.slots\.length/, "場所のslots数だけ操作buttonを構築する");
  for (const property of ["--slot-x", "--slot-y", "--depth-scale", "--slot-z", "--hideout-rotate", "--ground-anchor-y", "--foreground-top", "--window-bottom", "--window-safety-bottom", "--char-width", "--char-ground-lift"]) {
    assert.ok(gameJs.includes(`setProperty('${property}'`), `${property} を場所定義からCSSへ渡す`);
  }
  assert.match(gameJs, /var\s+foregroundMask\s*=\s*hideoutLayout\.foregroundMask/, "外装ごとの専用alpha maskを場所定義から読む");
  assert.match(gameJs, /if\s*\(\s*!foregroundMask\s*\)\s*throw\s+new\s+Error/, "専用alpha mask欠落時に水平切断へ黙って退行しない");
  assert.match(gameJs, /setProperty\(\s*['"]--foreground-mask['"]\s*,[\s\S]*?foregroundMask\.replace/, "外装専用alpha maskをCSSへ安全に渡す");
  assert.match(gameJs, /dataset\.hideoutVariant\s*=\s*hideoutVariant/, "各buttonへ遠景・近景の開口種別を記録する");
  assert.match(gameJs, /var\s+slotGroundY\s*=\s*Number\(slot\.groundY\)/, "slotのy値は画像中心ではなく背景上の接地点として読む");
  assert.match(gameJs, /slotGroundY\s*<\s*0\s*\|\|\s*slotGroundY\s*>\s*100/, "画面外の接地点を受け付けない");
  assert.match(gameJs, /dataset\.groundY\s*=\s*String\(slotGroundY\)/, "接地点を実行時監査用data属性へ記録する");
  assert.match(gameJs, /var\s+groundAnchorY\s*=\s*Number\(hideoutLayout\.groundAnchorY\)/, "素材ごとの接地アンカーを読む");
  assert.match(gameJs, /groundAnchorY\s*<=\s*0\s*\|\|\s*groundAnchorY\s*>\s*100/, "素材外の接地アンカーを受け付けない");
  assert.doesNotMatch(gameJs + stylesCss, /depth-shift-y/, "中心補正の旧depth-shift-yを接地アンカー実装へ残さない");
  assert.equal((indexHtml.match(/class=["']hh-ground-stack["']/g) || []).length, 1, "templateに接地単位のstackを1つ定義する");
  assert.match(indexHtml, /class=["']hh-ground-stack["'][\s\S]*?hh-hideout-base[\s\S]*?hh-char-wrap[\s\S]*?hh-hideout-foreground[\s\S]*?<\/span>/s, "開口・動物・手前縁を同じ接地stackでまとめる");
  const groundStackRule = stylesCss.match(/\.hh-ground-stack\s*\{([^}]*)\}/s);
  assert.ok(groundStackRule, ".hh-ground-stack のCSS規則がある");
  assert.match(groundStackRule[1], /top:\s*50%/, "接地stackの上辺をbutton中心の背景接地点へ合わせる");
  assert.match(groundStackRule[1], /translateX\(-50%\)[^;]*scale\(var\(--depth-scale\)\)[^;]*rotate\(var\(--hideout-rotate\)\)/s, "開口・動物・演出を接地点基準でまとめて遠近拡縮する");
  assert.match(groundStackRule[1], /transform-origin:\s*50%\s+0/, "遠近拡縮の原点を接地stackの上辺中央に固定する");
  const hideoutRule = stylesCss.match(/\.hh-hideout\s*\{([^}]*)\}/s);
  assert.ok(hideoutRule, ".hh-hideout のCSS規則がある");
  assert.match(hideoutRule[1], /top:\s*calc\(0%\s*-\s*var\(--ground-anchor-y\)\)/, "素材内の接地アンカー分だけ開口画像を上へ戻す");
  assert.match(hideoutRule[1], /width:\s*100%/, "素材内アンカーと同じ正方形幅で開口を描画する");
  assert.doesNotMatch(hideoutRule[1], /\btransform\s*:/, "開口画像単体を中心基準で再変形しない");
  assert.doesNotMatch(hideoutRule[1], /\bfilter\s*:/, "開口画像へ後付けの色調filterを重ねない");
  assert.doesNotMatch(stylesCss, /@media\s*\(max-height:\s*430px\)[\s\S]*?\.hh-hideout\s*\{[^}]*\bwidth\s*:/, "短い画面でも画像だけを縮めて接地アンカーをずらさない");
  assert.match(indexHtml, /class=["']hh-char-wrap["'][\s\S]*?class=["']hh-window["'][\s\S]*?class=["']hh-char-rise["'][\s\S]*?class=["']hh-char["'][\s\S]*?<\/span>\s*<\/span>\s*<span class=["']hh-sparkle["']/s, "動物本体だけを窓内へ置き、月・光はマスク外の兄弟レイヤーにする");
  assert.match(stylesCss, /\.hh-char-wrap\s*\{[^}]*overflow:\s*visible/s, "月・光・加点を包む状態wrapは切り抜かない");
  assert.match(stylesCss, /\.hh-window\s*\{[^}]*overflow:\s*visible/s, "動物窓の上・左右はボーナス画像内の星と光彩を切らない");
  assert.match(stylesCss, /\.hh-window\s*\{[^}]*clip-path:\s*inset\(-30%\s+-30%\s+var\(--window-safety-bottom\)\s+-30%\)/s, "動物窓の直線は画面へ見せず、外装下漏れ防止の安全位置だけを切る");
  assert.doesNotMatch(stylesCss, /\.hh-window\s*\{[^}]*clip-path:[^}]*var\(--window-bottom\)/s, "表示用の旧水平下端を動物の見える輪郭へ再利用しない");
  assert.match(stylesCss, /\.hh-char-wrap\.is-bonus\s+\.hh-window::before\s*\{[^}]*box-shadow:/s, "ボーナス光輪も動物窓の下側マスク内へ置く");
  assert.doesNotMatch(stylesCss, /\.hh-char-wrap\.is-bonus::before/, "ボーナス光輪をマスク外のwrapへ残さない");
  assert.match(stylesCss, /\.hh-char-wrap\.is-visible\s+\.hh-char-rise\s*\{[^}]*translate\(-50%,\s*0\)/s, "停止時は胴体が不自然に切れない高さまで表示する");
  assert.match(gameJs, /var\s+charLiftPct\s*=\s*Number\(hideoutLayout\.charLiftPct\)/, "場所別停止位置をstack比で読む");
  assert.match(gameJs, /setProperty\(\s*['"]--char-ground-lift['"]\s*,\s*charLiftPct\s*\+\s*['"]%['"]\s*\)/, "停止位置を画面高ではなくstack比でCSSへ渡す");
  assert.ok(D.LOCATIONS.every(location => location.slots.filter(slot => slot.hideout === "far").length >= 2), "各場所に遠景専用の開口が2個以上ある");
  assert.ok(D.LOCATIONS.every(location => location.slots.filter(slot => slot.hideout === "near").length >= 2), "各場所に近景専用の開口が2個以上ある");
  assert.ok(D.LOCATIONS.every(location => location.slots.filter(slot => slot.hideout === "far").every(slot => slot.depth < 0.9)), "遠景列は0.9倍未満にする");
  assert.ok(D.LOCATIONS.every(location => location.slots.filter(slot => slot.hideout === "near").every(slot => slot.depth >= 0.9)), "近景列は0.9倍以上にする");
  assert.doesNotMatch(stylesCss, /\.hh-char-wrap\s*\{[^}]*scale\(var\(--depth-scale\)\)/s, "キャラだけへ遠近scaleを二重適用しない");
  assert.match(stylesCss, /\.hh-hole\.is-pressed\s+\.hh-ground-stack\s*\{[^}]*translateX\(-50%\)[^}]*scale\(var\(--depth-scale\)\)[^}]*rotate\(var\(--hideout-rotate\)\)[^}]*scale\(0\.96\)/s, "押した瞬間も接地点基準のstack全体で前後パースを保つ");
  assert.match(stylesCss, /\.hh-hole\s*\{[^}]*border-radius:\s*0\s*;/s, "透明buttonの角で見えている耳・翼を判定外にしない");
  assert.match(gameJs, /function\s+resolveVisibleCharacterFromPoint\(\s*clientX\s*,\s*clientY\s*\)/, "見えている動物を基準にした救済タップ判定がある");
  assert.match(gameJs, /resolveHoleFromPoint\([^)]*\)\s*\{[\s\S]*?resolveVisibleCharacterFromPoint\(/, "DOMの穴判定より先に見えている動物を解決する");
  assert.match(gameJs, /imageRect\.width\s*\*\s*0\.12[\s\S]*?bestDistance/, "動物サイズに沿う余白と最短候補で隣穴の誤反応を防ぐ");
  assert.match(gameJs, /phase\s*!==\s*['"]playing['"]\s*\|\|\s*tutorialOpen\s*\|\|\s*boardEl\.hasAttribute\(\s*['"]inert['"]\s*\)/, "説明中・非操作中は救済判定を背後へ通さない");
  assert.match(indexHtml, /styles\.css\?v=20260725-1469/, "styles.css は1469の達成結果UI版キャッシュトークンで読む");
  assert.match(indexHtml, /js\/game\.js\?v=20260725-1469/, "game.js は1469の50点進行版キャッシュトークンで読む");
  assert.match(indexHtml, /js\/locations\.js\?v=20260725-1469d/, "locations.js は1469のキノコ丘最終配置・達成点版キャッシュトークンで読む");
}

// ── 11b. ボーナス出現・リアルタイムコンボ・最大記録UI ──────────────
{
  assert.match(gameJs, /actualSpawnCount\s*\+=\s*1|actualSpawnCount\+\+/, "実際に配置できた出現数だけを数える");
  assert.match(gameJs, /L\.isBonusSpawn\(\s*actualSpawnCount\s*\)/, "実出現数を7体ごとのボーナス判定へ渡す");
  assert.match(gameJs, /L\.bonusShowTimeAt\(/, "ボーナスには見分けやすい専用表示時間を使う");
  assert.match(gameJs, /target\s*=\s*[^;]*isBonus\s*\?\s*['"]bonus['"]\s*:/, "ボーナスタップを通常awakeとは別の得点対象として渡す");
  assert.match(gameJs, /var\s+BEST_COMBO_KEY\s*=\s*['"]pono_hyokkori_best_combo_v2['"]/, "最大コンボ記録はゲーム専用キーで保存する");
  assert.match(gameJs, /localStorage\.setItem\(\s*BEST_COMBO_KEY/, "最大コンボ記録をlocalStorageへ保存する");
  assert.match(gameJs, /Math\.max\(\s*lifetimeBestCombo\s*,\s*readBestComboRecord\(\)\s*\)/, "終了時に別タブの最新記録を再読込し、小さい値で上書きしない");
  assert.match(gameJs, /prefersReducedMotion\(\)\s*\?\s*620\s*:\s*300/, "うごきをへらす設定でも加点表示の静止時間を残す");
  assert.match(gameJs, /!holes\[idx\]\.occupant[\s\S]{0,180}classList\.contains\(['"]is-visible['"]\)\)\s*return/, "成功後の見た目への追いタップは空振りにしない");
  assert.match(gameJs, /function\s+locationFrameAssetUrls\(\s*location\s*\)[\s\S]*?hideouts\.far[\s\S]*?hideouts\.near[\s\S]*?farLayout\.foregroundMask[\s\S]*?nearLayout\.foregroundMask/, "背景・遠近開口・両方の専用輪郭マスクを場所単位で先読みする");
  assert.match(gameJs, /function\s+locationAssetUrls\(\s*location\s*\)[\s\S]*?location\.bonusPartnerId/, "場所の必須画像に共通ボーナスを含める");
  assert.match(gameJs, /function\s+preloadLocationAssets\(\s*location\s*\)[\s\S]*?locationAssetUrls\(location\)/, "現在地単位で必須画像を先読みする");
  assert.match(gameJs, /function\s+warmNextLocation\(\s*location\s*\)[\s\S]*?preloadLocationAssets\(location\)/, "遊んでいる間に次の場所だけを温める");
  assert.doesNotMatch(indexHtml, /rel=["']preload["'][^>]*friend_hikari_momonga_bonus_awake\.png/, "初回必須転送へボーナス画像を混ぜない");
  assert.match(indexHtml, /id=["']result-visual["'][^>]*loading=["']lazy["']/, "結果画像はlazy読込で初回表示を塞がない");
  assert.match(gameJs, /FX_IMAGES\s*=\s*\[[\s\S]*?story_moon_flower_bloom\.png[\s\S]*?\]/, "月の花はプレイ中に温めて最終結果へ備える");
  assert.match(indexHtml, /id=["']cd-story["']/, "連続プレイのカウントダウンに物語文の表示先がある");
  assert.match(gameJs, /cdStory\.textContent\s*=\s*currentLocation\.startStory/, "各面の開始物語を見えるカウントダウンへ反映する");
  assert.match(gameJs, /function\s+resetStageViewportScroll\(\)[\s\S]*?stageEl\.scrollTop\s*=\s*0[\s\S]*?stageEl\.scrollLeft\s*=\s*0/, "結果ボタンのfocusで動いたstage内スクロールを次面開始前に戻す");
  assert.match(gameJs, /retryBtn\.blur\(\)[\s\S]{0,120}resetStageViewportScroll\(\)/, "結果ボタンを隠す前にfocusを外してstageのHUDを画面内へ戻す");

  for (const id of ["combo-hud", "combo-count", "combo-status-sr", "result-combo", "result-best-combo", "result-combo-new"]) {
    assert.match(indexHtml, new RegExp(`id=["']${id}["']`), `${id} の表示先が存在する`);
  }
  assert.match(indexHtml, /id=["']combo-status-sr["'][^>]*role=["']status["'][^>]*aria-live=["']polite["']/, "常時存在する読み上げ用コンボstatusがある");
  assert.match(indexHtml, /class=["'][^"']*hh-bonus-badge[^"']*["'][^>]*>30てん</, "ボーナスキャラに30てんの視覚ラベルがある");
  assert.match(indexHtml, /class=["'][^"']*hh-score-pop/, "リアルタイム加点の表示先がある");
  assert.match(stylesCss, /#combo-hud\.is-visible/, "2コンボ以上を見せるHUD状態がある");
  assert.match(stylesCss, /\.hh-char-wrap\.is-visible\.is-bonus/, "ボーナスを通常キャラと見分ける表示状態がある");
  assert.match(stylesCss, /\.hh-score-pop\.is-bonus/, "ボーナス加点を見分ける表示状態がある");

  const comboHudTag = indexHtml.match(/<div\b[^>]*id=["']combo-hud["'][^>]*>/);
  assert.ok(comboHudTag, "中央コンボ表示の開始タグがある");
  assert.doesNotMatch(comboHudTag[0], /\bhud-pill\b/, "コンボ表示をテキストボックス型HUDに戻さない");
  assert.match(comboHudTag[0], /data-tier=["']0["']/, "コンボ段階は非表示の0から始まる");

  const comboRuleMatch = stylesCss.match(/#combo-hud\s*\{([^}]*)\}/);
  assert.ok(comboRuleMatch, "#combo-hud の単独CSSルールがある");
  const comboRule = comboRuleMatch[1];
  assert.match(comboRule, /top:\s*50%/, "コンボ表示は画面中央に置く");
  assert.match(comboRule, /left:\s*50%/, "コンボ表示は横中央に置く");
  assert.match(comboRule, /transform:\s*translate\(\s*-50%\s*,\s*-50%\s*\)/, "コンボ自身の中心を画面中央へ合わせる");
  assert.match(comboRule, /padding:\s*0\s*;/, "箱型の内側余白を持たない");
  assert.match(comboRule, /border:\s*0\s*;/, "コンボ表示に枠を付けない");
  assert.match(comboRule, /background:\s*transparent\s*;/, "コンボ表示に背景箱を付けない");
  assert.match(comboRule, /box-shadow:\s*none\s*;/, "コンボ表示に箱影を付けない");
  assert.match(comboRule, /pointer-events:\s*none\s*;/, "中央の大きな文字でハイタッチを遮らない");
  assert.match(stylesCss, /#combo-count\s*\{[^}]*font-size:\s*clamp\(\s*64px\s*,/s, "コンボ数は最低64pxの大きな文字");
  for (const tier of [2, 3, 4]) {
    assert.match(stylesCss, new RegExp(`#combo-hud\\[data-tier=["']${tier}["']\\]`), `tier ${tier} の色演出がある`);
  }
  assert.match(gameJs, /L\.comboFxProfileAt\(\s*combo\s*\)/, "現在コンボを文字成長・花火プロファイルへ変換する");
  assert.match(gameJs, /comboHudEl\.dataset\.tier\s*=\s*String\(profile\.tier\)/, "実行時のコンボ段階をDOMへ反映する");
  assert.match(gameJs, /spawnComboFireworks\(\s*profile\s*\)/, "コンボ段階に合わせた花火を発火する");
  assert.match(gameJs, /dataset\.comboFxParticles\s*=\s*String\(profile\.particleCount\)/, "花火粒子数を実行時検証可能なdata属性へ反映する");
  assert.match(gameJs, /function\s+spawnComboFireworks\([^)]*\)[\s\S]*?prefersReducedMotion\(\)\)\s*return;/, "うごきをへらす設定で花火粒子を生成しない");
  assert.match(stylesCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?#combo-hud\.is-slam\s+\.combo-core[\s\S]*?animation:\s*none\s*!important/, "うごきをへらす設定で文字スラムを停止する");
}

// ── 11c. 寝ている子への幼児向け失敗フィードバック ───────────────
{
  const feedbackTag = indexHtml.match(/<div\b[^>]*id=["']sleep-miss-feedback["'][^>]*>/);
  assert.ok(feedbackTag, "寝ている子への中央フィードバックがある");
  assert.match(feedbackTag[0], /aria-hidden=["']true["']/, "見える中央表示は読み上げを二重発火しない");
  assert.match(indexHtml, /class=["']sleep-miss-mark["'][^>]*>×</, "色だけでなく大きな×で失敗を示す");
  assert.match(indexHtml, /class=["']sleep-miss-copy["'][^>]*>ねてるよ</, "幼児向けの短いかな文言を表示する");

  const feedbackRuleMatch = stylesCss.match(/#sleep-miss-feedback\s*\{([^}]*)\}/s);
  assert.ok(feedbackRuleMatch, "中央睡眠フィードバックのCSS規則がある");
  assert.match(feedbackRuleMatch[1], /top:\s*50%/, "睡眠フィードバックを画面中央へ置く");
  assert.match(feedbackRuleMatch[1], /left:\s*50%/, "睡眠フィードバックを横中央へ置く");
  assert.match(feedbackRuleMatch[1], /z-index:\s*735/, "中央コンボより手前へ出す");
  assert.match(feedbackRuleMatch[1], /pointer-events:\s*none/, "失敗表示で次の操作面を塞がない");
  assert.match(stylesCss, /\.sleep-miss-mark\s*\{[^}]*font-size:\s*clamp\(\s*64px\s*,/s, "×は短い画面でも64px以上にする");
  assert.match(stylesCss, /#sleep-miss-feedback\.is-visible\s*\{[^}]*hh-sleep-miss-center/s, "約1秒の中央表示アニメーションを持つ");
  assert.match(stylesCss, /\.hh-char-wrap\.is-sleep-miss\s+\.hh-char-rise/, "触れた寝姿を局所的にも反応させる");
  assert.match(stylesCss, /\.is-sleeping\.is-sleep-miss\s+\.hh-sleep-fx/, "月のしるしも失敗時に反応させる");
  assert.match(stylesCss, /\.hh-hole\.is-locked\.is-sleep-target\s*\{[^}]*opacity:\s*1/s, "触れた寝姿だけはロック中も明るく残す");
  assert.match(stylesCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?#sleep-miss-feedback\.is-visible\s*\{[^}]*animation:\s*none\s*!important/s, "うごきを減らす設定でも中央表示を静止して残す");
  assert.match(stylesCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.hh-char-wrap\.is-sleep-miss\s+\.hh-char-rise[\s\S]*?animation:\s*none\s*!important/s, "うごきを減らす設定では寝姿を沈めない");

  assert.match(gameJs, /SLEEP_MISS_FEEDBACK_MS\s*=\s*Math\.round\(L\.SLEEP_PENALTY_LOCK\s*\*\s*1000\)/, "中央表示時間を1秒入力ロックと同期する");
  assert.match(gameJs, /case\s+['"]sleepPenalty['"][\s\S]*?showUntil\s*=\s*Math\.max\([\s\S]*?state\.elapsed\s*\+\s*L\.SLEEP_PENALTY_LOCK/s, "出現終了ぎりぎりでも寝姿を案内終了まで残す");
  assert.match(gameJs, /case\s+['"]sleepPenalty['"][\s\S]*?is-sleep-miss[\s\S]*?is-sleep-target[\s\S]*?boardLockedUntil\s*=\s*Math\.max\([\s\S]*?state\.inputLockUntil[\s\S]*?triggerSleepMissFeedback\(\)/s, "局所反応・対象強調・見える入力ロック・中央表示を同期する");
  assert.match(gameJs, /function\s+triggerSleepMissFeedback\(\)[\s\S]*?SLEEP_MISS_STATUS[\s\S]*?SLEEP_MISS_FEEDBACK_MS/s, "中央表示と読み上げを専用タイマーで解除する");
  assert.match(gameJs, /sleepMissFeedbackTimer\s*=\s*setTimeout\([\s\S]*?sleepMissFeedbackToken\s*\+=\s*1[\s\S]*?clearSleepMissVisuals\(\)/s, "終了後に遅い読み上げフレームを無効化し局所反応も一括解除する");
  assert.match(gameJs, /function\s+resetGameState\(\)\s*\{\s*hideSleepMissFeedback\(\)/, "再挑戦時に失敗表示を消す");
  assert.match(gameJs, /function\s+finishGame\(\)[\s\S]*?hideSleepMissFeedback\(\)[\s\S]*?hideComboHud/s, "結果へ進む前に失敗表示を消す");
  assert.match(gameJs, /case\s+['"]overheat['"]\s*:\s*\{[\s\S]*?hideSleepMissFeedback\(\)/, "連打案内へ切り替わる時に睡眠表示を重ねない");
  assert.match(gameJs, /function\s+retractHole\([^)]*\)[\s\S]*?is-wobble[\s\S]*?is-sleep-miss/s, "寝姿が引っ込む時に局所表示だけを空中へ残さない");

  assert.match(gameJs, /function\s+resumeAudioContext\([^)]*\)[\s\S]*?['"]suspended['"][\s\S]*?['"]interrupted['"][\s\S]*?\.resume\(\)/s, "WebKitの生成直後suspended/interrupted AudioContextを同じ操作内で再開する");
  assert.match(gameJs, /function\s+slideTone\([^)]*\)[\s\S]*?frequency\.exponentialRampToValueAtTime[\s\S]*?gain\.exponentialRampToValueAtTime/s, "否定音はクリックを避けた周波数・音量包絡にする");
  assert.match(gameJs, /function\s+playSleepSound\(\)\s*\{\s*slideTone\(392,\s*330,\s*0\.03,\s*0\.11,\s*0\.075\);\s*slideTone\(294,\s*220,\s*0\.17,\s*0\.17,\s*0\.085\);/s, "成功音と逆向きの柔らかい下降2音を使う");
  assert.match(gameJs, /osc\.onended\s*=\s*function[\s\S]*?osc\.disconnect\(\)[\s\S]*?gain\.disconnect\(\)/s, "短いSEのAudioNodeを終了後に切断する");
  assert.doesNotMatch(indexHtml + gameJs, /\.(?:mp3|wav|ogg)(?:["'?]|$)/i, "音声・TTS素材を追加せずWebAudioのSEだけを使う");
}

// ── 11d. 可変場所・シャッフル袋・さんぽ保存の実行時結線 ─────────────
{
  assert.match(gameJs, /var\s+H\s*=\s*window\.HyokkoriLocations/, "場所APIをboot内で受け取る");
  assert.match(gameJs, /var\s+PARTNER_CATALOG\s*=\s*H\.PARTNER_CATALOG/, "動物画像の正本を場所カタログへ一本化する");
  assert.match(gameJs, /L\.pickHole\(\s*holeRefs\.length\s*,\s*forbidden\s*,\s*Math\.random\s*\)/, "現在地の実スロット数をpickHoleへ渡す");
  assert.doesNotMatch(gameJs, /L\.HOLE_COUNT/, "game.js は旧6か所固定値を参照しない");

  for (const functionName of ["refillPartnerBag", "takeDeferredPartner", "pickPartner"]) {
    assert.match(gameJs, new RegExp(`function\\s+${functionName}\\s*\\(`), `${functionName} が実装されている`);
  }
  assert.match(gameJs, /partnerBag\s*=\s*\(\s*currentLocation[^;]*partnerIds/s, "シャッフル袋は現在地の6種から作る");
  assert.match(gameJs, /partnerBag\.push\(\s*id\s*\)/, "同時出現中・直前の動物は捨てず袋の後ろへ回す");
  assert.match(gameJs, /PARTNER_CATALOG\[\s*currentLocation\.bonusPartnerId\s*\]/, "場所共通の案内役IDからボーナスを出す");
  assert.match(gameJs, /refs\.wrap\.dataset\.partner\s*=\s*partner\.id/, "動物ごとの見え方補正へpartner idを渡す");
  assert.match(stylesCss, /\.hh-char-wrap\[data-partner=["']kawauso["']\]\s+\.hh-char\s*\{[^}]*width:\s*130%[^}]*height:\s*130%/s, "長い尾を含むかわうそだけ穴内で見やすく拡大する");

  assert.match(gameJs, /function\s+readWalkState\(\)[\s\S]*?H\.normalizeWalkState\(\s*raw\s*\)/, "保存を読むたびに進行を正規化する");
  assert.match(gameJs, /function\s+writeWalkState\([^)]*\)[\s\S]*?H\.WALK_SAVE_KEY[\s\S]*?JSON\.stringify/, "正規化した進行をゲーム専用キーへ保存する");
  assert.match(gameJs, /currentLocation\s*=\s*H\.locationForRun\(\s*walkState\s*\)/, "起動時の場所を完走回数から決める");
  assert.match(gameJs, /activeRun\s*=\s*\{[\s\S]*?runId:[\s\S]*?locationId:\s*currentLocation\.id[\s\S]*?mode:\s*walkState\.mode/, "run開始時にID・場所・モードを固定する");
  assert.match(gameJs, /function\s+advanceCompletedRunOnce\(\)[\s\S]*?activeRunAdvanced[\s\S]*?readWalkState\(\)[\s\S]*?H\.advanceWalkState\(/, "完走時は最新保存を再読込し1回だけ進行を確定する");
  assert.match(gameJs, /H\.advanceWalkState\([^;]*\{[\s\S]*?score:\s*state\.score[\s\S]*?bestCombo:\s*state\.bestCombo/, "場所別記録へ得点と最大コンボを渡す");
  assert.match(gameJs, /resultCleared\s*=\s*H\.meetsLocationScoreGoal\(\s*activeRun\.locationId,\s*state\.score\s*\)/, "場所の達成点を結果進行の単一判定にする");
  assert.match(gameJs, /nextLocation\s*=\s*resultCleared\s*\?\s*H\.locationForRun\(\s*walkState\s*\)\s*:\s*currentLocation/, "未達時は現在地、達成時だけ保存済みの次地点へ進む");
  assert.match(gameJs, /function\s+finishGame\(\)[\s\S]*?phase\s*===\s*['"]result['"][\s\S]*?advanceCompletedRunOnce\(\)/, "結果処理の二重発火を止めてから散歩を進める");

  assert.match(gameJs, /!resultCleared[\s\S]*?おしい！/, "未達時は見出しで再挑戦だと伝える");
  assert.match(gameJs, /あと ['"]?\s*\+\s*scoreRemaining\s*\+\s*['"]てんで つぎへ/, "未達時は次面まで残り何点か伝える");
  assert.match(gameJs, /retryEl\.textContent\s*=\s*resultCleared\s*\?\s*['"]さんぽを つづける['"]\s*:\s*['"]もういちど['"]/, "結果の主ボタンを達成／未達で明確に切り替える");
  assert.match(gameJs, /if\s*\(\s*resultCleared\s*&&\s*rank\s*>=\s*1\s*\)/, "未達時に成功の紙吹雪・新記録ファンファーレを重ねない");
  for (const id of ["start-location", "start-goal", "walk-progress", "result-goal-status", "result-next-location", "retry-btn"]) {
    assert.match(indexHtml, new RegExp(`id=["']${id}["']`), `${id} の表示先が存在する`);
  }
  assert.equal((indexHtml.match(/class=["'][^"']*walk-dot/g) || []).length, D.ROUTE_IDS.length, "散歩道の点数をルート定義と揃える");
  assert.match(gameJs, /resultCompletedLap\s*&&\s*currentLocation\s*&&\s*currentLocation\.id\s*===\s*['"]moonlight_forest['"]/, "5面を完走した時だけ最終開花演出にする");
  assert.match(gameJs, /story_moon_flower_bloom\.png/, "最終結果で月の花の専用画像を使う");
  assert.match(gameJs, /currentLocation\.resultStory/, "最終結果に場所定義の『つきの はなが さいた！』を使う");
  assert.match(gameJs, /currentLocation\.afterStory/, "開花後に次の種で周回する物語を案内する");
  assert.match(stylesCss, /#result-card\.is-final-bloom/, "最終開花だけを見分ける結果カード演出がある");
  assert.match(stylesCss, /#result-card\s+\.result-pono\.is-moon-flower/, "月の花画像に専用の開花アニメーションがある");
  assert.match(gameJs, /swapLocation\(\s*targetLocation\s*,\s*false\s*\)[\s\S]*?beginCountdown\(\)/, "つづける操作は次地点の読込完了後にカウントダウンする");
  assert.match(gameJs, /stageEl\.style\.setProperty\(\s*['"]--location-bg['"]/, "背景を場所定義からステージへ反映する");
  assert.match(gameJs, /requestEpoch\s*!==\s*locationLoadEpoch/, "遅れて完了した旧場所の画像読込を無視する");
  assert.match(gameJs, /epoch\s*!==\s*boardEpoch/, "旧盤面の遅延退場処理を新しい場所へ反映しない");
}

// ── 12. play.html 統合検証 (donguri-wakekko 登録漏れの再発防止) ──────
{
  const playHtmlPath = path.join(root, "play.html");
  if (fs.existsSync(playHtmlPath)) {
    const playHtml = fs.readFileSync(playHtmlPath, "utf8");
    const hasGamesEntry = /id:\s*['"]hyokkori-hightouch['"]/.test(playHtml);
    if (hasGamesEntry) {
      const menuIdsMatch = playHtml.match(/APP_TITLE_MENU_IDS\s*=\s*\[([\s\S]*?)\]/);
      assert.ok(menuIdsMatch, "play.html に APP_TITLE_MENU_IDS 配列が見つかる");
      assert.match(menuIdsMatch[1], /['"]hyokkori-hightouch['"]/, "APP_TITLE_MENU_IDS 配列内に 'hyokkori-hightouch' が含まれる (登録漏れ厳禁)");
      assert.match(playHtml, /subtitle:\s*['"]ハイタッチで コンボを つなごう['"]/, "メニュー副題から花壇・たねの説明を外す");
      assert.match(playHtml, /thumb:\s*['"]assets\/images\/hyokkori-hightouch\/menu_thumb_highfive_combo\.png['"]/, "たねのないハイタッチ用サムネイルを使う");
      assert.match(playHtml, /bg:\s*['"]assets\/images\/hyokkori-hightouch\/bg_world_komorebi_lowangle_20260724\.png['"]/, "カード背景も絵本調の新しい世界へ更新する");
    } else {
      console.log("  (skip: play.html への hyokkori-hightouch 統合は未実施。統合担当のタスク)");
    }
  } else {
    console.log("  (skip: play.html が見つからない)");
  }
}

// ── 13. 構文検証 ─────────────────────────────────────────────────────
{
  assert.doesNotThrow(() => new vm.Script(locationsJsSrc, { filename: "hyokkori-hightouch-locations.js" }));
  assert.doesNotThrow(() => new vm.Script(logicJsSrc, { filename: "hyokkori-hightouch-logic.js" }));
  assert.doesNotThrow(() => new vm.Script(gameJs, { filename: "hyokkori-hightouch-game.js" }));

  const htmlWithoutComments = indexHtml.replace(/<!--[\s\S]*?-->/g, "");
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  let parsed = 0;
  while ((match = scriptPattern.exec(htmlWithoutComments))) {
    const attrs = match[1] || "";
    if (/\bsrc\s*=/.test(attrs) || /type\s*=\s*["']text\/babel["']/.test(attrs)) continue;
    const body = match[2];
    if (!body.trim()) continue;
    assert.doesNotThrow(() => new vm.Script(body, { filename: "hyokkori-hightouch-inline-" + parsed + ".js" }));
    parsed += 1;
  }
  assert.ok(parsed >= 1, "index.html に少なくとも1つのインライン script が存在し構文検証された");
}

// ── 14. 難易度選択なし ───────────────────────────────────────────────
{
  assert.match(logicJsSrc, /GAME_DURATION\s*=\s*30\b/, "logic.js に GAME_DURATION = 30 (秒) が定義されている");
  assert.match(indexHtml, /id=["']hud-timer["'][^>]*>⏱\s*30</, "初期HUDも30秒表示でJS更新前の60秒を見せない");
  assert.doesNotMatch(indexHtml, /diff-btn/, "index.html に難易度選択UI (diff-btn) が存在しない");
}

// ── 15. 横画面 (16:9) 強制 ──────────────────────────────────────────
{
  assert.match(indexHtml, /よこむき/, "landscape-notice が『よこむき』を促す (横画面強制)");
  assert.doesNotMatch(indexHtml, /たてむき/, "旧・縦持ち強制の文言『たてむき』が残っていない");
  assert.match(gameJs, /function\s+computeIsPortrait\s*\(/, "game.js に computeIsPortrait 判定関数が存在する");
  assert.doesNotMatch(gameJs, /isLandscape\s*&&\s*isTouch/, "旧・横向き時表示の判定式が残っていない");
  assert.match(stylesCss, /16\s*\/\s*9/, "styles.css の #stage が 16:9 比率を使っている");
}

// ── 15b. 向き判定 API 例外時の fail-open (2026-07-23 レビュー指摘対応) ──────
{
  assert.match(
    gameJs,
    /function\s+computeIsPortrait\s*\([^)]*\)\s*\{\s*try\s*\{/,
    "computeIsPortrait() の本体が try で始まっている (screen.orientation/matchMedia アクセスを保護)"
  );
  assert.doesNotMatch(
    gameJs,
    /return\s+window\.innerHeight\s*>=\s*window\.innerWidth\s*;/,
    "旧・innerHeight>=innerWidth への素朴フォールバックが復活していない (fail-open に置換済み)"
  );
  assert.match(gameJs, /function\s+isCoarsePointer\s*\(/, "matchMedia('(pointer: coarse)') 呼び出しを守る isCoarsePointer() ヘルパーが存在する");
  assert.match(
    gameJs,
    /function\s+isCoarsePointer\s*\([^)]*\)\s*\{\s*try\s*\{/,
    "isCoarsePointer() の本体が try で始まっている"
  );
  assert.match(gameJs, /function\s+bootInner\s*\(/, "boot() 本体が bootInner() に分離されている");
  assert.match(
    gameJs,
    /function\s+boot\s*\(\s*\)\s*\{\s*try\s*\{\s*bootInner\(\);\s*\}\s*catch/,
    "boot() が bootInner() 全体を try/catch で包み、例外時に showLoadError へフォールバックする"
  );
}

// ── 16. locations / logic 読込失敗フォールバック ───────────────────
{
  assert.match(indexHtml, /src="js\/locations\.js\?v=/, "index.html の js/locations.js に ?v= キャッシュバスティングが付いている");
  assert.match(indexHtml, /src="js\/logic\.js\?v=/, "index.html の js/logic.js に ?v= キャッシュバスティングが付いている");
  assert.match(indexHtml, /src="js\/game\.js\?v=/, "index.html の js/game.js に ?v= キャッシュバスティングが付いている");
  assert.match(indexHtml, /href="styles\.css\?v=/, "index.html の styles.css に ?v= キャッシュバスティングが付いている");
  assert.match(gameJs, /function showLoadError\s*\(/, "game.js に showLoadError フォールバックが存在する");
  assert.match(gameJs, /\?retry=/, "game.js が必須スクリプト再取得時にキャッシュバイパス (?retry=) を使っている");
  assert.match(gameJs, /function boot\s*\(/, "game.js の本体が boot() 関数でラップされている");
  assert.match(gameJs, /function\s+dependenciesReady\(\)[\s\S]*?window\.HyokkoriLocations\s*&&\s*window\.HyokkoriLogic/, "場所・ロジックの両方が揃った時だけ起動する");
  assert.match(gameJs, /if\s*\(\s*dependenciesReady\(\)\s*\)\s*\{\s*boot\(\);\s*return;\s*\}/, "必須モジュール正常時は即座にboot()を呼ぶ");
  assert.match(gameJs, /if\s*\(\s*!window\.HyokkoriLocations\s*\)\s*retryQueue\.push\(\s*['"]js\/locations\.js['"]\s*\)/, "場所定義の読込失敗を個別に再試行する");
  assert.match(gameJs, /if\s*\(\s*!window\.HyokkoriLogic\s*\)\s*retryQueue\.push\(\s*['"]js\/logic\.js['"]\s*\)/, "純粋ロジックの読込失敗を個別に再試行する");
}

// ── 17. 中央コンボ演出の段階・上限・不正値耐性 ───────────────────────────
{
  assert.equal(typeof L.comboFxProfileAt, "function", "comboFxProfileAt が公開される");

  const boundaryCases = [
    { combo: 0, tier: 0, growPx: 0, bursts: 0, particles: 0, duration: 0 },
    { combo: 1, tier: 0, growPx: 0, bursts: 0, particles: 0, duration: 0 },
    { combo: 2, tier: 1, growPx: 0, bursts: 1, particles: 8, duration: 760 },
    { combo: 4, tier: 1, growPx: 5.2, bursts: 1, particles: 8, duration: 760 },
    { combo: 5, tier: 2, growPx: 7.8, bursts: 1, particles: 18, duration: 850 },
    { combo: 9, tier: 2, growPx: 18.2, bursts: 1, particles: 18, duration: 850 },
    { combo: 10, tier: 3, growPx: 20.8, bursts: 2, particles: 32, duration: 950 },
    { combo: 14, tier: 3, growPx: 31.2, bursts: 2, particles: 32, duration: 950 },
    { combo: 15, tier: 4, growPx: 33.8, bursts: 3, particles: 54, duration: 1050 },
    { combo: 100, tier: 4, growPx: 50, bursts: 3, particles: 54, duration: 1050 }
  ];
  for (const expected of boundaryCases) {
    const actual = L.comboFxProfileAt(expected.combo);
    assert.deepEqual(
      actual,
      {
        combo: expected.combo,
        tier: expected.tier,
        growPx: expected.growPx,
        burstCount: expected.bursts,
        particleCount: expected.particles,
        durationMs: expected.duration
      },
      `${expected.combo}コンボの文字成長と花火量が段階仕様に一致`
    );
  }

  let previous = L.comboFxProfileAt(0);
  for (let combo = 1; combo <= 100; combo += 1) {
    const current = L.comboFxProfileAt(combo);
    for (const key of ["combo", "tier", "growPx", "burstCount", "particleCount", "durationMs"]) {
      assert.ok(Number.isFinite(current[key]), `${combo}コンボの ${key} は有限値`);
    }
    assert.ok(current.tier >= previous.tier, `${combo}コンボでtierが逆行しない`);
    assert.ok(current.growPx >= previous.growPx, `${combo}コンボで文字サイズが逆行しない`);
    assert.ok(current.burstCount >= previous.burstCount, `${combo}コンボで花火数が逆行しない`);
    assert.ok(current.particleCount >= previous.particleCount, `${combo}コンボで粒子数が逆行しない`);
    assert.ok(current.durationMs >= previous.durationMs, `${combo}コンボで演出時間が逆行しない`);
    assert.ok(current.growPx <= 50, `${combo}コンボで文字成長上限50pxを超えない`);
    assert.ok(current.particleCount <= 54, `${combo}コンボで粒子上限54を超えない`);
    previous = current;
  }

  for (const invalid of [NaN, Infinity, -Infinity, -1, undefined, null, "abc", {}, []]) {
    assert.deepEqual(
      L.comboFxProfileAt(invalid),
      { combo: 0, tier: 0, growPx: 0, burstCount: 0, particleCount: 0, durationMs: 0 },
      `不正値 ${String(invalid)} は安全な非表示状態へ正規化する`
    );
  }
  assert.equal(L.comboFxProfileAt(4.99).combo, 4, "小数コンボは切り捨てる");
  assert.equal(L.comboFxProfileAt("10").tier, 3, "数値文字列は安全に正規化する");
  assert.equal(L.comboFxProfileAt(Number.MAX_SAFE_INTEGER).growPx, 50, "極端に大きいコンボも文字成長上限で止まる");
}

// ── 18. v2開口画像の実alpha下端と接地アンカー ───────────────────────
(async function verifyHideoutAlphaGroundAnchors() {
  // wrangler/miniflare の開発依存として常に導入される sharp で、CSS値同士ではなく
  // PNGの実alphaを読む。画像差し替え時に接地点だけ古いまま残る回帰を防ぐ。
  const sharp = require("sharp");
  const seen = new Set();

  for (const location of D.LOCATIONS) {
    for (const variant of ["far", "near"]) {
      const assetPath = path.resolve(
        root,
        "hyokkori-hightouch",
        location.hideouts[variant]
      );
      if (seen.has(assetPath)) continue;
      seen.add(assetPath);

      const result = await sharp(assetPath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const { width, height, channels } = result.info;
      assert.equal(channels, 4, `${path.basename(assetPath)} はRGBAとして読める`);
      assert.ok(fs.statSync(assetPath).size < 3 * 1024 * 1024, `${path.basename(assetPath)} は3MB未満`);

      let lastAlphaY = -1;
      for (let y = 0; y < height; y += 1) {
        const rowStart = y * width * channels;
        for (let x = 0; x < width; x += 1) {
          if (result.data[rowStart + x * channels + 3] > 0) lastAlphaY = y;
        }
      }
      assert.ok(lastAlphaY >= 0, `${path.basename(assetPath)} に可視alphaがある`);

      const alphaBottomPercent = (lastAlphaY + 1) / height * 100;
      const configuredAnchor = location.hideoutLayouts[variant].groundAnchorY;
      assert.ok(
        Math.abs(alphaBottomPercent - configuredAnchor) <= 0.12,
        `${location.id} ${variant} のgroundAnchorYは実alpha下端と一致する ` +
        `(asset=${alphaBottomPercent.toFixed(3)} configured=${configuredAnchor})`
      );

      const cornerAlphaOffsets = [
        3,
        (width - 1) * channels + 3,
        (height - 1) * width * channels + 3,
        ((height * width) - 1) * channels + 3
      ];
      assert.ok(
        cornerAlphaOffsets.every(offset => result.data[offset] === 0),
        `${path.basename(assetPath)} の四隅は完全透過`
      );
    }
  }

  console.log("hyokkori hightouch regression: PASS");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
