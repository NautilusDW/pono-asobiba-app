#!/usr/bin/env node
"use strict";

// ポノのつりゲーム Phase 0 共有コアの回帰テスト。
// NOTE: このタスクのスコープは common/tsuri/core.js・fish-data.js・input.js
// (+本テストファイル) のみ。 tsuri-kawa/** や play.html/sw.js への統合は別担当が
// 行う (guragura-seesaw と同様の並列分担パターン)。

const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const Core = require(path.join(root, "common/tsuri/core.js"));
const FishData = require(path.join(root, "common/tsuri/fish-data.js"));
const Input = require(path.join(root, "common/tsuri/input.js"));

let passCount = 0;
function section(name, fn) {
  fn();
  passCount++;
  console.log(`  [OK] ${name}`);
}

console.log("── tsuri (ポノのつり) core 回帰テスト ──");

// ── 最小フェイク EventTarget (input.js の addEventListener/removeEventListener だけ実装) ──
function makeFakeEl() {
  const listeners = {};
  return {
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    removeEventListener(type, fn) {
      if (!listeners[type]) return;
      const idx = listeners[type].indexOf(fn);
      if (idx !== -1) listeners[type].splice(idx, 1);
    },
    dispatch(type, evt) {
      const fns = (listeners[type] || []).slice();
      for (const fn of fns) fn(evt);
    },
    listenerCount(type) {
      return (listeners[type] || []).length;
    }
  };
}

function touch(x, y, id) {
  return { clientX: x, clientY: y, identifier: id === undefined ? 0 : id };
}
function touchEvent(x, y, id, cancelable) {
  const t = touch(x, y, id);
  return {
    changedTouches: [t],
    cancelable: cancelable === undefined ? true : cancelable,
    preventDefault() { this._defaultPrevented = true; }
  };
}

// ═══ 1. TUNING / GEAR_MODS_NEUTRAL 契約 ═══════════════════════════════
section("TUNING / GEAR_MODS_NEUTRAL の形が契約どおり", () => {
  assert.deepEqual(Core.TUNING, {
    windowSec: { relaxed: 1.5, expert: 0.8 },
    windowGraceSec: { relaxed: 0.5, expert: 0 },
    gaugeFloorPct: 30,
    gaugeDecayPerSec: 4,
    assistDoubleWindowAfterMisses: 2,
    autoHookAfterMisses: 3,
    helpAfterFloorSec: 10,
    pityWindowBonusPctPerEscape: 20
  }, "TUNING が企画書どおりの初期目安値を持つ");
  assert.ok(Object.isFrozen(Core.TUNING), "TUNING は Object.freeze されている");

  assert.deepEqual(Core.GEAR_MODS_NEUTRAL, { windowMul: 1, gainMul: 1, decayMul: 1, lureTableId: null });
  assert.ok(Object.isFrozen(Core.GEAR_MODS_NEUTRAL), "GEAR_MODS_NEUTRAL は Object.freeze されている");
});

// ═══ 2. createSession 初期形状 ════════════════════════════════════════
section("createSession 初期形状", () => {
  const pool = FishData.RIVER_SPECIES;
  const session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  assert.equal(session.phase, "idle");
  assert.equal(session.speciesId, null);
  assert.equal(session.waitRemainingSec, 0);
  assert.equal(session.biteWindowRemainingSec, 0);
  assert.equal(session.gaugePct, 0);
  assert.equal(session.consecutiveMisses, 0);
  assert.deepEqual(session.pityBySpecies, {});
  assert.deepEqual(session.sessionSeenIds, []);
  assert.equal(session.floorHeldSec, 0);
  assert.deepEqual(session.caughtLog, []);
  assert.equal(session.mode, "relaxed");

  const expertSession = Core.createSession({ speciesPool: pool, mode: "expert" });
  assert.equal(expertSession.mode, "expert", "mode='expert' も受け付ける");

  const defaultSession = Core.createSession({ speciesPool: pool });
  assert.equal(defaultSession.mode, "relaxed", "mode 省略時は relaxed 既定");
});

// ═══ 3. cast(): idle/landed/escaped → wait ════════════════════════════
section("cast(): idle → wait 遷移 + waitRemainingSec が範囲内", () => {
  const pool = FishData.RIVER_SPECIES;
  for (let i = 0; i < 200; i++) {
    const session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
    const next = Core.cast(session, { waitSecRange: [2, 5] });
    assert.equal(next.phase, "wait");
    assert.ok(next.waitRemainingSec >= 2 && next.waitRemainingSec <= 5, `waitRemainingSec(${next.waitRemainingSec}) は [2,5] 範囲内`);
    assert.ok(pool.some(sp => sp.id === next.speciesId), "speciesId はプール内の値");
  }
});

section("cast(): landed/escaped からも wait へ遷移できる", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Object.assign({}, session, { phase: "landed" });
  const fromLanded = Core.cast(session, { waitSecRange: [1, 1] });
  assert.equal(fromLanded.phase, "wait", "landed から cast できる");

  session = Object.assign({}, session, { phase: "escaped" });
  const fromEscaped = Core.cast(session, { waitSecRange: [1, 1] });
  assert.equal(fromEscaped.phase, "wait", "escaped から cast できる");
});

section("cast(): wait/bite/renda 中の cast() 呼び出しは無視される (no-op)", () => {
  const pool = FishData.RIVER_SPECIES;
  for (const phase of ["wait", "bite", "renda"]) {
    let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
    session = Object.assign({}, session, { phase, speciesId: "fish_ayu" });
    const next = Core.cast(session, { waitSecRange: [1, 1] });
    assert.equal(next.phase, phase, `phase='${phase}' 中の cast() は no-op`);
  }
});

section("cast(): 元 session を非破壊 (mutate しない)", () => {
  const pool = FishData.RIVER_SPECIES;
  const session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  const before = JSON.parse(JSON.stringify(session));
  Core.cast(session, { waitSecRange: [2, 5] });
  assert.deepEqual(session, before, "cast() は引数 session を書き換えない");
});

// ═══ 4. tick(): wait → bite (窓計算) ══════════════════════════════════
section("tick(): wait 終了で bite へ。 のんびり実効2.0秒/めいじん0.8秒 (ニュートラル・ミスなし・pityなし)", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Core.cast(session, { waitSecRange: [1, 1] });
  assert.equal(session.waitRemainingSec, 1);
  session = Core.tick(session, 1, Core.GEAR_MODS_NEUTRAL);
  assert.equal(session.phase, "bite");
  assert.ok(Math.abs(session.biteWindowRemainingSec - 2.0) < 1e-9, `relaxed 実効窓は2.0秒 (got ${session.biteWindowRemainingSec})`);

  let expertSession = Core.createSession({ speciesPool: pool, mode: "expert" });
  expertSession = Core.cast(expertSession, { waitSecRange: [1, 1] });
  expertSession = Core.tick(expertSession, 1, Core.GEAR_MODS_NEUTRAL);
  assert.equal(expertSession.phase, "bite");
  assert.ok(Math.abs(expertSession.biteWindowRemainingSec - 0.8) < 1e-9, `expert 実効窓は0.8秒 (got ${expertSession.biteWindowRemainingSec})`);
});

section("tick(): wait 途中では phase 不変、waitRemainingSec のみ減る", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Core.cast(session, { waitSecRange: [3, 3] });
  session = Core.tick(session, 1, Core.GEAR_MODS_NEUTRAL);
  assert.equal(session.phase, "wait");
  assert.ok(Math.abs(session.waitRemainingSec - 2) < 1e-9);
});

section("tick(): gearMods.windowMul が bite 窓に反映される", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Core.cast(session, { waitSecRange: [1, 1] });
  session = Core.tick(session, 1, { windowMul: 1.5, gainMul: 1, decayMul: 1, lureTableId: null });
  assert.ok(Math.abs(session.biteWindowRemainingSec - 3.0) < 1e-9, `2.0 * 1.5 = 3.0 (got ${session.biteWindowRemainingSec})`);
});

section("tick(): gearMods 省略時は GEAR_MODS_NEUTRAL 相当で動く", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Core.cast(session, { waitSecRange: [1, 1] });
  session = Core.tick(session, 1); // gearMods 省略
  assert.ok(Math.abs(session.biteWindowRemainingSec - 2.0) < 1e-9, "gearMods 省略時もニュートラル値相当");
});

// ═══ 5. tick(): bite → escaped、pity 蓄積 ═════════════════════════════
section("tick(): bite 窓が尽きると escaped へ。 consecutiveMisses++、pity+20%", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Core.cast(session, { waitSecRange: [1, 1] });
  session = Core.tick(session, 1, Core.GEAR_MODS_NEUTRAL); // → bite, 窓2.0
  const speciesId = session.speciesId;
  assert.equal(session.consecutiveMisses, 0);
  session = Core.tick(session, 2.0, Core.GEAR_MODS_NEUTRAL); // 窓を使い切る
  assert.equal(session.phase, "escaped");
  assert.equal(session.consecutiveMisses, 1);
  assert.equal(session.pityBySpecies[speciesId], 20, "同一種の pity が+20%される");
  assert.ok(Core.isTerminal(session), "escaped は isTerminal");
});

section("tick(): bite 窓内は escaped にならない (早すぎタップを失敗にしない、の裏付け)", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Core.cast(session, { waitSecRange: [1, 1] });
  session = Core.tick(session, 1, Core.GEAR_MODS_NEUTRAL); // → bite, 窓2.0
  session = Core.tick(session, 1.9, Core.GEAR_MODS_NEUTRAL); // 窓の残り0.1秒
  assert.equal(session.phase, "bite", "窓が尽きるまでは bite のまま");
  assert.ok(!Core.isTerminal(session));
});

// ═══ 6. tapHook(): bite のときだけ有効 ════════════════════════════════
section("tapHook(): phase==='bite' のときだけ renda へ、他は no-op", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Core.cast(session, { waitSecRange: [1, 1] });
  session = Core.tick(session, 1, Core.GEAR_MODS_NEUTRAL); // → bite
  const hooked = Core.tapHook(session);
  assert.equal(hooked.phase, "renda");
  assert.equal(hooked.gaugePct, 0);

  for (const phase of ["idle", "wait", "renda", "landed", "escaped"]) {
    let s = Core.createSession({ speciesPool: pool, mode: "relaxed" });
    s = Object.assign({}, s, { phase });
    const result = Core.tapHook(s);
    assert.equal(result.phase, phase, `phase='${phase}' 中の tapHook() は no-op`);
  }
});

section("tapHook(): 元 session を非破壊", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Core.cast(session, { waitSecRange: [1, 1] });
  session = Core.tick(session, 1, Core.GEAR_MODS_NEUTRAL);
  const before = JSON.parse(JSON.stringify(session));
  Core.tapHook(session);
  assert.deepEqual(session, before);
});

// ═══ 7. 暗黙アシスト: 2連続逃し→窓2倍、3連続逃し→自動フッキング ═══════
section("暗黙アシスト: 2連続逃しの後(3回目)は窓が2倍になる", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  // 1回目・2回目を逃す (pickSpecies はランダムなので、同じ種を連続で引いてpityが
  // 窓に乗った場合に備え、常に実際の biteWindowRemainingSec ぶんだけ経過させる。
  // 固定dtだと「pityで窓が伸びて経過不足→escapedにならない」flakeを生むため NG)
  for (let i = 0; i < 2; i++) {
    session = Core.cast(session, { waitSecRange: [1, 1] });
    session = Core.tick(session, 1, Core.GEAR_MODS_NEUTRAL); // → bite
    session = Core.tick(session, session.biteWindowRemainingSec, Core.GEAR_MODS_NEUTRAL); // escaped
  }
  assert.equal(session.consecutiveMisses, 2);
  // 3回目 (assist発動) — 種が変わると pity が乗ってしまい2倍か判別できなくなるため、
  // pity を明示的にリセットして assist 単体の効果を検証する
  session = Core.cast(session, { waitSecRange: [1, 1] });
  session.pityBySpecies = {};
  session = Core.tick(session, 1, Core.GEAR_MODS_NEUTRAL);
  assert.equal(session.phase, "bite");
  assert.ok(Math.abs(session.biteWindowRemainingSec - 4.0) < 1e-9, `2連続逃し後は窓2倍 (2.0*2=4.0, got ${session.biteWindowRemainingSec})`);
});

section("暗黙アシスト: 3連続逃しの後(4回目)は自動フッキング(bite を経ずrendaへ)", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  for (let i = 0; i < 3; i++) {
    session = Core.cast(session, { waitSecRange: [1, 1] });
    session = Core.tick(session, 1, Core.GEAR_MODS_NEUTRAL); // → bite (i=2回目は窓2倍だが今回は無視)
    session = Core.tick(session, session.biteWindowRemainingSec, Core.GEAR_MODS_NEUTRAL); // escaped
  }
  assert.equal(session.consecutiveMisses, 3);
  session = Core.cast(session, { waitSecRange: [1, 1] });
  session = Core.tick(session, 1, Core.GEAR_MODS_NEUTRAL);
  assert.equal(session.phase, "renda", "3連続逃し後は bite を経由せず直接 renda (自動フッキング)");
  assert.equal(session.gaugePct, 0, "自動フッキングは連打ゲージ0から開始");
});

// ═══ 8. 連打ゲージ: 床・断続タップ・おたすけ ═════════════════════════
const AYU = FishData.getSpeciesById("fish_ayu"); // tapsBase:8

section("tapRenda(): タップでゲージ増加、100超えで landed、consecutiveMisses は0にリセット", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Object.assign({}, session, { phase: "renda", gaugePct: 0, speciesId: "fish_ayu", consecutiveMisses: 2 });
  let taps = 0;
  while (session.phase === "renda" && taps < 100) {
    session = Core.tapRenda(session, AYU, Core.GEAR_MODS_NEUTRAL);
    taps++;
  }
  assert.equal(session.phase, "landed");
  assert.equal(session.gaugePct, 100);
  assert.equal(session.consecutiveMisses, 0, "landed で consecutiveMisses が0にリセットされる");
  assert.ok(taps <= 8, `tapsBase=8 以内でlandedに到達する (got ${taps})`);
  assert.equal(session.caughtLog.length, 1);
  assert.equal(session.caughtLog[0].speciesId, "fish_ayu");
  assert.equal(typeof session.caughtLog[0].at, "number");
  assert.ok(session.sessionSeenIds.includes("fish_ayu"), "landed した種が sessionSeenIds に記録される");
});

section("tapRenda(): phase!=='renda' のときは no-op", () => {
  const pool = FishData.RIVER_SPECIES;
  for (const phase of ["idle", "wait", "bite", "landed", "escaped"]) {
    let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
    session = Object.assign({}, session, { phase, gaugePct: 10 });
    const result = Core.tapRenda(session, AYU, Core.GEAR_MODS_NEUTRAL);
    assert.equal(result.phase, phase);
    assert.equal(result.gaugePct, 10, `phase='${phase}' 中の tapRenda() はゲージを変えない`);
  }
});

section("tick(): renda 中の放置減衰は床(30%)より下に落ちない", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Object.assign({}, session, { phase: "renda", gaugePct: 0, speciesId: "fish_ayu" });
  session = Core.tick(session, 0.1, Core.GEAR_MODS_NEUTRAL);
  assert.equal(session.gaugePct, Core.TUNING.gaugeFloorPct, "初期0からの最初のtickで床まで持ち上がる");
  for (let i = 0; i < 50; i++) {
    session = Core.tick(session, 0.5, Core.GEAR_MODS_NEUTRAL);
    assert.ok(session.gaugePct >= Core.TUNING.gaugeFloorPct, `放置してもgaugePct(${session.gaugePct})は床を割らない`);
  }
});

section("tick(): 断続タップでもゲージは前進する(タップ→放置→タップを繰り返しても100へ近づく)", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Object.assign({}, session, { phase: "renda", gaugePct: 0, speciesId: "fish_ayu" });
  let lastGauge = -1;
  for (let round = 0; round < 20 && session.phase === "renda"; round++) {
    session = Core.tapRenda(session, AYU, Core.GEAR_MODS_NEUTRAL);
    if (session.phase !== "renda") break;
    session = Core.tick(session, 0.05, Core.GEAR_MODS_NEUTRAL); // 少し放置(微減衰)
    assert.ok(session.gaugePct >= lastGauge - 0.001 || session.gaugePct >= Core.TUNING.gaugeFloorPct, "断続タップでも後退し続けない");
    lastGauge = session.gaugePct;
  }
  assert.equal(session.phase, "landed", "断続タップでも最終的にlandedへ到達する");
});

section("tick(): のんびりモードは床10秒保持で「おたすけ」自動landed", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Object.assign({}, session, { phase: "renda", gaugePct: 0, speciesId: "fish_ayu" });
  let elapsed = 0;
  const dt = 0.25;
  while (session.phase === "renda" && elapsed < 30) {
    session = Core.tick(session, dt, Core.GEAR_MODS_NEUTRAL);
    elapsed += dt;
  }
  assert.equal(session.phase, "landed", "タップなしでものんびりはおたすけでlandedになる");
  assert.ok(elapsed <= 11, `床到達からおよそ10秒以内でおたすけ発動する (got elapsed=${elapsed})`);
  assert.equal(session.caughtLog.length, 1);
});

section("tick(): めいじんモードは床に留まっても自動landedしない(自力で詰まない=床維持のまま)", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "expert" });
  session = Object.assign({}, session, { phase: "renda", gaugePct: 0, speciesId: "fish_ayu" });
  for (let i = 0; i < 200; i++) { // 50秒分放置
    session = Core.tick(session, 0.25, Core.GEAR_MODS_NEUTRAL);
  }
  assert.equal(session.phase, "renda", "めいじんは長時間放置してもおたすけで自動完了しない");
  assert.equal(session.gaugePct, Core.TUNING.gaugeFloorPct, "床に留まり続ける(詰みはしない=いつでもタップで再開できる)");
});

section("tick(): gearMods.decayMul が減衰速度を補正する", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Object.assign({}, session, { phase: "renda", gaugePct: 80, speciesId: "fish_ayu" });
  const slow = Core.tick(session, 1, { windowMul: 1, gainMul: 1, decayMul: 0.5, lureTableId: null });
  const fast = Core.tick(session, 1, { windowMul: 1, gainMul: 1, decayMul: 2, lureTableId: null });
  assert.ok(slow.gaugePct > fast.gaugePct, "decayMul が小さいほど減衰が緩やか(ゲージが高く残る)");
});

section("tapRenda(): gearMods.gainMul がタップ増加量を補正する", () => {
  const pool = FishData.RIVER_SPECIES;
  let base = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  base = Object.assign({}, base, { phase: "renda", gaugePct: 0, speciesId: "fish_ayu" });
  const neutral = Core.tapRenda(base, AYU, Core.GEAR_MODS_NEUTRAL);
  const boosted = Core.tapRenda(base, AYU, { windowMul: 1, gainMul: 2, decayMul: 1, lureTableId: null });
  assert.ok(boosted.gaugePct > neutral.gaugePct, "gainMul が大きいほど1タップの伸びが大きい");
});

// ═══ 9. isTerminal() ═══════════════════════════════════════════════════
section("isTerminal(): landed/escaped のみ true", () => {
  const pool = FishData.RIVER_SPECIES;
  for (const phase of ["idle", "wait", "bite", "renda"]) {
    const session = Object.assign(Core.createSession({ speciesPool: pool }), { phase });
    assert.equal(Core.isTerminal(session), false, `phase='${phase}' は isTerminal=false`);
  }
  for (const phase of ["landed", "escaped"]) {
    const session = Object.assign(Core.createSession({ speciesPool: pool }), { phase });
    assert.equal(Core.isTerminal(session), true, `phase='${phase}' は isTerminal=true`);
  }
  assert.equal(Core.isTerminal(null), false, "null は false (例外を投げない)");
  assert.equal(Core.isTerminal(undefined), false, "undefined は false (例外を投げない)");
});

// ═══ 10. pickSpecies() / computeSpeciesProbabilities() 抽選 ═══════════
section("pickSpecies(): 常にプール内の id を返す(空プールはnull)", () => {
  const pool = FishData.RIVER_SPECIES;
  for (let i = 0; i < 500; i++) {
    const id = Core.pickSpecies(pool, {}, []);
    assert.ok(pool.some(sp => sp.id === id), `pickSpecies が返す id(${id}) はプール内`);
  }
  assert.equal(Core.pickSpecies([], {}, []), null, "空プールは null");
  assert.equal(Core.pickSpecies(null, {}, []), null, "プール未指定は null (例外を投げない)");
});

section("pickSpecies(): 単一種プールは常にその種を返す(決定的境界ケース)", () => {
  const onlyAyu = [FishData.getSpeciesById("fish_ayu")];
  for (let i = 0; i < 20; i++) {
    assert.equal(Core.pickSpecies(onlyAyu, {}, []), "fish_ayu");
  }
});

section("computeSpeciesProbabilities(): 川5種で非食用(ざりがに+ながぐつ)合計が10〜15%", () => {
  const pool = FishData.RIVER_SPECIES;
  const probs = Core.computeSpeciesProbabilities(pool, []);
  const total = Object.values(probs).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `全種の確率合計は1 (got ${total})`);

  const nonEdibleIds = pool.filter(sp => !sp.edible).map(sp => sp.id);
  assert.deepEqual(nonEdibleIds.sort(), ["treasure_boot", "zarigani"].sort());
  const nonEdibleTotal = nonEdibleIds.reduce((sum, id) => sum + (probs[id] || 0), 0);
  assert.ok(nonEdibleTotal >= 0.10 && nonEdibleTotal <= 0.15, `非食用合計(${(nonEdibleTotal * 100).toFixed(2)}%)は10〜15%の範囲`);

  // レアリティ既定重み: rare(fish_salmon) は normal 帯合計より低い確率になる
  assert.ok(probs.fish_salmon < probs.fish_ayu, "rare(salmon)はnormalの主力種(ayu)より出にくい");
});

section("computeSpeciesProbabilities(): sessionSeenIds に含まれる種は重みが下がる(完全排除はしない)", () => {
  const pool = FishData.RIVER_SPECIES;
  const before = Core.computeSpeciesProbabilities(pool, []);
  const afterSeen = Core.computeSpeciesProbabilities(pool, ["fish_ayu"]);
  assert.ok(afterSeen.fish_ayu < before.fish_ayu, "既に釣った種の確率は下がる");
  assert.ok(afterSeen.fish_ayu > 0, "完全に0にはしない(排除しない)");
  // 他種の確率はそのぶん相対的に上がる
  assert.ok(afterSeen.fish_nijimasu > before.fish_nijimasu, "デデュープで他の同レアリティ種の相対確率が上がる");
});

// ═══ 11. species pity: 逃走ごとに窓+20%累積 ═══════════════════════════
section("pity: 同一speciesを複数回逃すと窓ボーナスが累積する(2回逃し→+40%)", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Core.cast(session, { waitSecRange: [1, 1] });
  const speciesId = session.speciesId;
  session = Core.tick(session, 1, Core.GEAR_MODS_NEUTRAL); // bite
  session = Core.tick(session, session.biteWindowRemainingSec, Core.GEAR_MODS_NEUTRAL); // escaped (1回目)
  assert.equal(session.pityBySpecies[speciesId], 20);

  // 同じ種をもう一度引かせるため、pickSpeciesをバイパスして直接同種を再セット
  session = Object.assign({}, session, { speciesId, phase: "wait", waitRemainingSec: 1, consecutiveMisses: 0 });
  session = Core.tick(session, 1, Core.GEAR_MODS_NEUTRAL); // bite (pity+20%が窓に反映されるはず)
  const expectedWindow = (Core.TUNING.windowSec.relaxed + Core.TUNING.windowGraceSec.relaxed) * 1.2;
  assert.ok(Math.abs(session.biteWindowRemainingSec - expectedWindow) < 1e-9, `pity+20%が窓に反映される (got ${session.biteWindowRemainingSec}, expected ${expectedWindow})`);

  session = Core.tick(session, session.biteWindowRemainingSec, Core.GEAR_MODS_NEUTRAL); // escaped (2回目)
  assert.equal(session.pityBySpecies[speciesId], 40, "2回逃すとpityが+40%まで累積する");
});

// ═══ 12. Lv1(GEAR_MODS_NEUTRAL)ベースライン: 全normal魚+レシピ必須rare魚が必ず釣れる ═══
section("Lv1ベースライン: 全種がGEAR_MODS_NEUTRAL・のんびりで有限回のtapRendaでlandedに到達する", () => {
  const pool = FishData.RIVER_SPECIES;
  for (const species of pool) {
    let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
    session = Object.assign({}, session, { phase: "renda", gaugePct: 0, speciesId: species.id });
    let taps = 0;
    const maxTaps = species.challengeProfile.tapsBase + 2; // 端数繰り上げの余裕
    while (session.phase === "renda" && taps < maxTaps) {
      session = Core.tapRenda(session, species, Core.GEAR_MODS_NEUTRAL);
      taps++;
    }
    assert.equal(session.phase, "landed", `${species.id} はLv1装備・のんびりでtapsBase以内に必ず釣れる`);
  }
});

section("Lv1ベースライン: タップが遅くても(0タップでも)のんびりは10秒程度でおたすけにより必ず釣れる", () => {
  const pool = FishData.RIVER_SPECIES;
  for (const species of pool) {
    let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
    session = Object.assign({}, session, { phase: "renda", gaugePct: 0, speciesId: species.id });
    let elapsed = 0;
    while (session.phase === "renda" && elapsed < 15) {
      session = Core.tick(session, 0.5, Core.GEAR_MODS_NEUTRAL);
      elapsed += 0.5;
    }
    assert.equal(session.phase, "landed", `${species.id} はタップ0回でもおたすけで必ず釣れる(詰みなし不変条件)`);
  }
});

// ═══ 12.5 tug ステート・スタブ (企画書§3.7/§9/§10確定ゲート項目3) ═══════
section("tug スタブ: phase enum に'tug'が含まれても createSession/tick/tapHook/tapRenda/isTerminal が例外を投げない", () => {
  const pool = FishData.RIVER_SPECIES;
  assert.doesNotThrow(() => {
    let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
    session = Object.assign({}, session, { phase: "tug", speciesId: "fish_ayu" });
    const ticked = Core.tick(session, 1, Core.GEAR_MODS_NEUTRAL);
    assert.equal(ticked.phase, "tug", "Phase 0 の tick() は 'tug' を未知の実装対象として no-op で素通りする");
    const hooked = Core.tapHook(session);
    assert.equal(hooked.phase, "tug", "tapHook() は phase==='bite' 以外は no-op なので 'tug' も no-op");
    const rendaTapped = Core.tapRenda(session, FishData.getSpeciesById("fish_ayu"), Core.GEAR_MODS_NEUTRAL);
    assert.equal(rendaTapped.phase, "tug", "tapRenda() は phase==='renda' 以外は no-op なので 'tug' も no-op");
    assert.equal(Core.isTerminal(session), false, "'tug' は landed/escaped ではないので isTerminal=false");
  }, "'tug' を phase に持つ session を渡しても各API関数は例外を投げない");
});

section("tug スタブ: TUG_CONFIG.enabledDefault は Phase 0 で常に false、isTugEnabled() も常に false", () => {
  assert.equal(Core.TUG_CONFIG.enabledDefault, false, "Phase 0 の tug は無効化フラグがデフォルトfalse");
  assert.ok(Object.isFrozen(Core.TUG_CONFIG), "TUG_CONFIG は Object.freeze されている");
  assert.equal(Core.isTugEnabled(), false, "gearMods省略時もisTugEnabled()はfalse");
  assert.equal(Core.isTugEnabled(Core.GEAR_MODS_NEUTRAL), false, "GEAR_MODS_NEUTRAL(Phase0既定値)でもfalse");
  assert.equal(Core.isTugEnabled({ windowMul: 1, gainMul: 1, decayMul: 1, lureTableId: null }), false, "tugEnabledフィールドが無いgearModsでもfalse");
});

section("tug スタブ: Phase 0 の通常フローでは renda→landed が直接遷移し、tug へは絶対に入らない(おたすけ経路)", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Object.assign({}, session, { phase: "renda", gaugePct: 0, speciesId: "fish_ayu" });
  let elapsed = 0;
  const dt = 0.25;
  const seenPhases = new Set();
  while (session.phase === "renda" && elapsed < 30) {
    session = Core.tick(session, dt, Core.GEAR_MODS_NEUTRAL);
    seenPhases.add(session.phase);
    elapsed += dt;
  }
  assert.equal(session.phase, "landed", "おたすけ経路は従来どおり直接landedへ到達する(tugを経由しない)");
  assert.ok(!seenPhases.has("tug"), "Phase 0 の tick() ループ中に一度も'tug'へ遷移しない");
});

section("tug スタブ: Phase 0 の通常フローでは renda→landed が直接遷移し、tug へは絶対に入らない(タップ完走経路)", () => {
  const pool = FishData.RIVER_SPECIES;
  let session = Core.createSession({ speciesPool: pool, mode: "relaxed" });
  session = Object.assign({}, session, { phase: "renda", gaugePct: 0, speciesId: "fish_ayu" });
  const seenPhases = new Set();
  let taps = 0;
  while (session.phase === "renda" && taps < 100) {
    session = Core.tapRenda(session, AYU, Core.GEAR_MODS_NEUTRAL);
    seenPhases.add(session.phase);
    taps++;
  }
  assert.equal(session.phase, "landed", "タップ完走経路は従来どおり直接landedへ到達する(tugを経由しない)");
  assert.ok(!seenPhases.has("tug"), "Phase 0 の tapRenda() ループ中に一度も'tug'へ遷移しない");
});

// ═══ 13. fish-data.js 契約 ═══════════════════════════════════════════
section("fish-data.js: RIVER_SPECIES が企画書§3.2の値と完全一致する", () => {
  assert.deepEqual(FishData.RIVER_SPECIES, [
    { id: 'fish_ayu', name: 'あゆ', rarity: 'normal', size: 's', zones: ['river'], edible: true,
      inventoryKey: 'fish_ayu', weight: 22, sizeRangeCm: [12, 22], movePattern: 'static',
      challengeProfile: { windowMul: 1.0, tapsBase: 8, runs: 0 } },
    { id: 'fish_nijimasu', name: 'にじます', rarity: 'normal', size: 'm', zones: ['river'], edible: true,
      inventoryKey: 'fish_nijimasu', weight: 20, sizeRangeCm: [20, 35], movePattern: 'static',
      challengeProfile: { windowMul: 1.0, tapsBase: 10, runs: 0 } },
    { id: 'zarigani', name: 'ざりがに', rarity: 'normal', size: 's', zones: ['river'], edible: false,
      inventoryKey: null, weight: 5, sizeRangeCm: [8, 12], movePattern: 'static',
      challengeProfile: { windowMul: 1.2, tapsBase: 6, runs: 0 } },
    { id: 'fish_salmon', name: 'さけ', rarity: 'rare', size: 'l', zones: ['river', 'sea'], edible: true,
      inventoryKey: 'fish_salmon', weight: 8, sizeRangeCm: [50, 75], movePattern: 'static',
      challengeProfile: { windowMul: 0.9, tapsBase: 12, runs: 0 } },
    { id: 'treasure_boot', name: 'ながぐつ', rarity: 'normal', size: 's', zones: ['river'], edible: false,
      inventoryKey: null, weight: 4, movePattern: 'static',
      challengeProfile: { windowMul: 1.3, tapsBase: 4, runs: 0 } }
  ]);
});

section("fish-data.js: getSpeciesById / RIVER_SPECIES_BY_ID が全種を1対1で解決する", () => {
  for (const sp of FishData.RIVER_SPECIES) {
    assert.deepEqual(FishData.getSpeciesById(sp.id), sp);
    assert.deepEqual(FishData.RIVER_SPECIES_BY_ID[sp.id], sp);
  }
  assert.equal(FishData.getSpeciesById("nonexistent"), null, "存在しないidはnull(例外を投げない)");
});

// ═══ 14. input.js: attachTap ═══════════════════════════════════════════
section("input.js attachTap(): タッチのみでonTapが1回だけ呼ばれる", () => {
  const el = makeFakeEl();
  let callCount = 0;
  Input.attachTap(el, () => { callCount++; });
  el.dispatch("touchstart", touchEvent(100, 100));
  el.dispatch("touchend", touchEvent(100, 100));
  assert.equal(callCount, 1, "touchstart→touchendでonTapが1回呼ばれる");
});

section("input.js attachTap(): touchend後の合成clickは二重発火しない(dedupe)", () => {
  const el = makeFakeEl();
  let callCount = 0;
  Input.attachTap(el, () => { callCount++; });
  el.dispatch("touchstart", touchEvent(50, 50));
  el.dispatch("touchend", touchEvent(50, 50));
  el.dispatch("click", { cancelable: true, preventDefault() {} }); // 合成click(タッチ環境が発火させるやつ)
  assert.equal(callCount, 1, "touchendのタップとその直後のclickは合わせて1回しか呼ばれない");
});

section("input.js attachTap(): touchend→touchendの連続タップ(clickを介さない)は毎回発火する(連打対応の回帰防止)", () => {
  // レビュー指摘の再現ケース: 発火元を区別しない時間ベースdedupeだと、
  // clickを一切介さない touchstart/touchend の連続列すら握りつぶされ、
  // 連打(れんだ)フェーズの高速タップが2タップ/秒を超えると欠落していた。
  const el = makeFakeEl();
  let callCount = 0;
  Input.attachTap(el, () => { callCount++; });
  for (let i = 0; i < 5; i++) {
    el.dispatch("touchstart", touchEvent(10, 10));
    el.dispatch("touchend", touchEvent(10, 10));
  }
  assert.equal(callCount, 5, "clickを介さないtouchend連続5回は5回とも発火する(旧500ms時間dedupeバグの回帰防止)");
});

section("input.js attachTap(): マウス環境はclickのみでonTapが呼ばれる", () => {
  const el = makeFakeEl();
  let callCount = 0;
  Input.attachTap(el, () => { callCount++; });
  el.dispatch("click", { cancelable: true, preventDefault() {} });
  assert.equal(callCount, 1, "touch無しのclick単体でも呼ばれる(マウス環境)");
});

section("input.js attachTap(): 閾値を超えて動くとタップと判定しない(ドラッグ/スクロール扱い)", () => {
  const el = makeFakeEl();
  let callCount = 0;
  Input.attachTap(el, () => { callCount++; });
  el.dispatch("touchstart", touchEvent(0, 0));
  el.dispatch("touchmove", touchEvent(100, 0)); // 12px閾値を大きく超える
  el.dispatch("touchend", touchEvent(100, 0));
  assert.equal(callCount, 0, "動きすぎた場合はonTapが呼ばれない");
});

section("input.js attachTap(): touchcancelは失敗イベントを出さず中立リセットする", () => {
  const el = makeFakeEl();
  let callCount = 0;
  Input.attachTap(el, () => { callCount++; });
  el.dispatch("touchstart", touchEvent(0, 0));
  el.dispatch("touchcancel", {});
  el.dispatch("touchend", touchEvent(0, 0)); // cancel後のtouchendはtouching=falseなので無視される
  assert.equal(callCount, 0, "touchcancel後は同じシーケンスのtouchendでタップが発火しない");
});

section("input.js attachTap(): detach後はイベントに反応しない", () => {
  const el = makeFakeEl();
  let callCount = 0;
  const detach = Input.attachTap(el, () => { callCount++; });
  detach();
  el.dispatch("touchstart", touchEvent(0, 0));
  el.dispatch("touchend", touchEvent(0, 0));
  el.dispatch("click", { cancelable: true, preventDefault() {} });
  assert.equal(callCount, 0, "detach後は一切発火しない");
  assert.equal(el.listenerCount("touchstart"), 0, "detachでリスナーが除去されている");
});

section("input.js attachTap(): el/onTap 不正でも例外を投げない(no-op関数を返す)", () => {
  assert.doesNotThrow(() => {
    const detach1 = Input.attachTap(null, () => {});
    detach1();
    const detach2 = Input.attachTap(makeFakeEl(), null);
    detach2();
  });
});

// ═══ 15. input.js: attachDrag スケルトン (Phase 2 用) ═════════════════
section("input.js attachDrag(): touch移動で内部stateのisTouching/dragActive/dragDirectionが正しく動く", () => {
  const el = makeFakeEl();
  const events = [];
  const detach = Input.attachDrag(el, {
    onDragStart: () => events.push("start"),
    onDragMove: (dx) => events.push("move:" + dx),
    onDragEnd: () => events.push("end")
  });
  assert.equal(detach.state.isTouching, false);

  el.dispatch("touchstart", touchEvent(100, 100, 1));
  assert.equal(detach.state.isTouching, true, "touchstartでisTouching=true");
  assert.equal(detach.state.dragActive, false, "閾値未満の移動前はdragActive=false");

  el.dispatch("touchmove", touchEvent(110, 100, 1)); // 10px < 24px閾値
  assert.equal(detach.state.dragActive, false, "24px未満はdragActiveにならない");

  el.dispatch("touchmove", touchEvent(140, 100, 1)); // dx=40 >= 24px閾値、右方向
  assert.equal(detach.state.dragActive, true, "24px以上の移動でdragActive=true");
  assert.equal(detach.state.dragDirection, 1, "右方向の移動はdragDirection=1");

  el.dispatch("touchmove", touchEvent(50, 100, 1)); // dx=-50、左方向
  assert.equal(detach.state.dragDirection, -1, "左方向の移動はdragDirection=-1");

  el.dispatch("touchend", touchEvent(50, 100, 1));
  assert.equal(detach.state.isTouching, false, "touchendでisTouching=false");
  assert.equal(detach.state.dragActive, false, "touchendでdragActiveもfalse");

  assert.deepEqual(events.filter(e => e === "start" || e === "end"), ["start", "end"], "onDragStart/onDragEndが1回ずつ呼ばれる");
});

section("input.js attachDrag(): touchcancelは失敗イベントを出さず中立リセットする", () => {
  const el = makeFakeEl();
  const events = [];
  const detach = Input.attachDrag(el, {
    onDragStart: () => events.push("start"),
    onDragEnd: () => events.push("end")
  });
  el.dispatch("touchstart", touchEvent(0, 0, 1));
  el.dispatch("touchcancel", {});
  assert.equal(detach.state.isTouching, false, "touchcancelでisTouching=falseにリセットされる");
  assert.deepEqual(events, ["start", "end"], "touchcancelはonDragEnd相当の中立リセットのみ(専用の失敗コールバックは無い)");
});

section("input.js attachDrag(): 最初の1本の指(identifier)のみ追跡し、2本目は無視する", () => {
  const el = makeFakeEl();
  const detach = Input.attachDrag(el, {});
  el.dispatch("touchstart", touchEvent(0, 0, 1)); // 1本目
  el.dispatch("touchstart", touchEvent(0, 0, 2)); // 2本目(無視されるはず)
  assert.equal(detach.state.isTouching, true);
  el.dispatch("touchmove", touchEvent(999, 0, 2)); // 2本目の大移動は無視される
  assert.equal(detach.state.dragActive, false, "追跡していない指の移動はdragActiveに影響しない");
  el.dispatch("touchmove", touchEvent(999, 0, 1)); // 1本目の移動は反映される
  assert.equal(detach.state.dragActive, true);
});

section("input.js attachDrag(): マウス(pointerType==='mouse')でも同様に動く。 非mouseポインタは無視", () => {
  const el = makeFakeEl();
  const detach = Input.attachDrag(el, {});
  el.dispatch("pointerdown", { pointerType: "touch", clientX: 0 }); // 非mouseは無視
  assert.equal(detach.state.isTouching, false, "pointerType!=='mouse' はearly returnされる");
  el.dispatch("pointerdown", { pointerType: "mouse", clientX: 0 });
  assert.equal(detach.state.isTouching, true);
  el.dispatch("pointermove", { pointerType: "mouse", clientX: 30 });
  assert.equal(detach.state.dragActive, true, "30px >= 24px閾値でdragActive");
  el.dispatch("pointerup", { pointerType: "mouse", clientX: 30 });
  assert.equal(detach.state.isTouching, false);
});

section("input.js attachDrag(): detach後はイベントに反応しない", () => {
  const el = makeFakeEl();
  const detach = Input.attachDrag(el, {});
  detach();
  el.dispatch("touchstart", touchEvent(0, 0, 1));
  assert.equal(detach.state.isTouching, false, "detach後はtouchstartでもisTouchingが変化しない");
  assert.equal(el.listenerCount("touchstart"), 0);
});

console.log(`\n全 ${passCount} セクション green.`);
