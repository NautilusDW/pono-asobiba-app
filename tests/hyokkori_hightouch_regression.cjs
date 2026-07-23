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

const gameJs = read("hyokkori-hightouch/js/game.js");
const logicJsSrc = read("hyokkori-hightouch/js/logic.js");
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
        const hole = L.pickHole(occupiedIdx, rand);
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
      hole = (hole + 1) % L.HOLE_COUNT;
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
  const assetNames = [
    "bg_forest_combo_terraces.png",
    "menu_thumb_highfive_combo.png",
    "hideout_leaf_bush.png",
    "fx_highfive_burst.png",
    "fx_leaf_puff.png",
    "fx_overheat_swirl.png",
    "fx_sleep_moon_cloud.png",
    "pono_title_highfive.png",
    "pono_result_bloom.png",
    "friend_hikari_momonga_bonus_awake.png",
    ...["araiguma", "fukurou", "harinezumi", "karasu", "kitsune", "kojika", "risu", "usagi"]
      .flatMap(id => [`friend_${id}_awake.png`, `friend_${id}_sleeping.png`]),
  ];
  assert.equal(assetNames.length, 26, "花壇・たねを外した実行時画像は26点");
  for (const name of assetNames) {
    assert.ok(fs.existsSync(path.join(root, "assets/images/hyokkori-hightouch", name)), `${name} が配置されている`);
  }
  assert.match(gameJs, /friend_araiguma_awake\.png/, "awake専用画像を参照する");
  assert.match(gameJs, /friend_araiguma_sleeping\.png/, "sleeping専用画像を参照する");
  assert.match(gameJs, /friend_hikari_momonga_bonus_awake\.png/, "見た目で区別できるボーナス専用画像を参照する");
  assert.match(indexHtml + gameJs, /fx_sleep_moon_cloud\.png/, "閉眼ポーズに加えて月雲を使う");
  assert.match(stylesCss, /\.is-sleeping/, "styles.css に .is-sleeping クラスが存在する");
  assert.doesNotMatch(stylesCss, /grayscale/, "睡眠状態を色だけで区別しない");
  assert.doesNotMatch(indexHtml + gameJs, /💤/, "旧emoji睡眠表示を専用画像へ置換済み");
  assert.doesNotMatch(indexHtml + gameJs, /reference_only_/, "比較用画像を実行時参照しない");
  assert.match(gameJs, /var\s+lastSuccessfulHole\s*=\s*null/, "直前の成功地点だけを内部保持する");
  assert.match(gameJs, /forbidden\.push\(lastSuccessfulHole\)/, "直前の成功地点を次の出現候補から外す");
  assert.match(gameJs, /function\s+rememberSuccessfulHole\([^)]*\)[\s\S]*?lastSuccessfulHole\s*=\s*idx/, "awake・bonus成功時だけ地点を更新する");
  assert.match(gameJs, /lastSuccessfulHole\s*=\s*null;[\s\S]{0,120}dataset\.lastSuccessfulHole\s*=\s*['"]['"]/, "リトライ時に成功地点の除外を解除する");
  assert.doesNotMatch(indexHtml, /id=["'](?:relay-progress|relay-announcement|relay-pips|flowerbed-img|light-seed)["']/, "花壇・たねの表示DOMを撤去する");
  assert.doesNotMatch(gameJs + logicJsSrc + stylesCss, /relayProgressAt|advanceRelay|FLOWER_STAGE_MAX|mechanic_light_seed|#light-seed|#flowerbed-img/, "花壇・たねの実行時処理とCSSを撤去する");
  assert.equal((indexHtml.match(/class=["'][^"']*hh-hideout-foreground/g) || []).length, 1, "templateに共通の手前縁を1つ定義する");
  assert.match(stylesCss, /\.hh-hideout-foreground\s*\{[^}]*z-index:\s*4[^}]*clip-path:\s*inset\(60%\s+0\s+0\s+0\)/s, "手前縁を穴の暗部より下へ置き、キャラより上に重ねる");
  assert.match(stylesCss, /#board\s*\{[^}]*row-gap:\s*30%[^}]*column-gap:\s*2%[^}]*padding:\s*0\s+9%/s, "背景の接地点へ揃えた3x2配置を使う");
  assert.match(stylesCss, /\.hh-hideout\s*\{[^}]*translate\(-53\.5%,\s*-50%\)/s, "茂み画像内の穴中心53.5%をキャラ窓へ合わせる");
  assert.match(stylesCss, /\.hh-window\s*\{[^}]*clip-path:\s*inset\(0\s+0\s+35\.5%\s+0/s, "通常画面のキャラ窓下端を前葉の開始位置より上に保つ");
  assert.match(stylesCss, /\.hh-char-wrap\.is-visible\s*\{[^}]*translate\(-50%,\s*0\)/s, "停止時は胴体が不自然に切れない高さまで表示する");
  assert.match(stylesCss, /@media\s*\(max-height:\s*430px\)[\s\S]*?\.hh-window\s*\{[^}]*clip-path:\s*inset\(0\s+0\s+32%\s+0/s, "短画面でもキャラ窓と前葉を隙間なく重ねる");
  assert.match(stylesCss, /\.hh-hole:nth-child\(-n \+ 3\)\s*\{[^}]*--depth-scale:\s*0\.88/s, "上段を小さくして奥行きを付ける");
  assert.match(stylesCss, /@container\s*\(max-height:\s*430px\)[\s\S]*?--depth-scale:\s*0\.9/s, "短画面では上段の可読サイズを少し戻す");
  assert.match(stylesCss, /\.hh-window\s*\{[^}]*scale\(var\(--depth-scale\)\)/s, "キャラも茂みと同じ前後比率で拡縮する");
  assert.match(stylesCss, /\.hh-hole\.is-pressed\s+\.hh-hideout\s*\{[^}]*translate\(-53\.5%,\s*-50%\)[^}]*scale\(var\(--depth-scale\)\)\s+scale\(0\.96\)/s, "押した瞬間も穴中心補正と前後パースを保つ");
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
  assert.match(gameJs, /\[BONUS_PARTNER\.awake,\s*HIDEOUT_IMAGE\]\.concat\(/, "ボーナス画像をローカルpreloadの先頭で優先する");
  assert.match(indexHtml, /rel=["']preload["'][^>]*friend_hikari_momonga_bonus_awake\.png/, "ボーナス画像をHTMLからも先読みする");

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
      assert.match(playHtml, /bg:\s*['"]assets\/images\/hyokkori-hightouch\/bg_forest_combo_terraces\.png['"]/, "カード背景も中央レーン版へ更新する");
    } else {
      console.log("  (skip: play.html への hyokkori-hightouch 統合は未実施。統合担当のタスク)");
    }
  } else {
    console.log("  (skip: play.html が見つからない)");
  }
}

// ── 13. 構文検証 ─────────────────────────────────────────────────────
{
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

// ── 16. logic.js 読込失敗フォールバック (guragura-seesaw 2026-07-22 バグ再発防止の移植) ──
{
  assert.match(indexHtml, /src="js\/logic\.js\?v=/, "index.html の js/logic.js に ?v= キャッシュバスティングが付いている");
  assert.match(indexHtml, /src="js\/game\.js\?v=/, "index.html の js/game.js に ?v= キャッシュバスティングが付いている");
  assert.match(indexHtml, /href="styles\.css\?v=/, "index.html の styles.css に ?v= キャッシュバスティングが付いている");
  assert.match(gameJs, /function showLoadError\s*\(/, "game.js に showLoadError フォールバックが存在する");
  assert.match(gameJs, /\?retry=/, "game.js が logic.js 再取得時にキャッシュバイパス (?retry=) を使っている");
  assert.match(gameJs, /function boot\s*\(/, "game.js の本体が boot() 関数でラップされている");
  assert.match(gameJs, /if\s*\(\s*window\.HyokkoriLogic\s*\)\s*\{\s*boot\(\);\s*return;\s*\}/, "HyokkoriLogic 正常時は即座に boot() を呼ぶ");
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

console.log("hyokkori hightouch regression: PASS");
