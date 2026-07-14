#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const html = read("nazonazo-tunnel/index.html");
const css = read("nazonazo-tunnel/styles.css");
const game = read("nazonazo-tunnel/js/game.js");

function extractFunction(source, name) {
  const match = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(source);
  assert.ok(match, `${name}: function missing`);
  const open = source.indexOf("{", match.index);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
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
      if (depth === 0) return source.slice(match.index, index + 1);
    }
  }
  assert.fail(`${name}: function is not closed`);
}

function extractBlock(source, marker) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${marker}: block missing`);
  const open = source.indexOf("{", start);
  assert.notEqual(open, -1, `${marker}: opening brace missing`);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`${marker}: block is not closed`);
}

function numericConstant(name) {
  const match = new RegExp(`\\b${name}\\s*(?:=|:)\\s*([0-9]+(?:\\.[0-9]+)?)`).exec(game);
  assert.ok(match, `${name}: numeric constant missing`);
  return Number(match[1]);
}

function cssRule(selectorPattern) {
  const match = new RegExp(`${selectorPattern}\\s*\\{([^}]+)\\}`).exec(css);
  assert.ok(match, `CSS rule missing: ${selectorPattern}`);
  return match[1];
}

const checks = [];
function check(name, callback) {
  try {
    callback();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error });
  }
}

const reducedMotion = extractBlock(css, "@media (prefers-reduced-motion:reduce)");

/* Wheel motion: engine, rods and every passenger car must share one readable cadence. */
check("wheel periods stay readable on iPad", () => {
  const fast = numericConstant("WHEEL_FAST_PERIOD");
  const slow = numericConstant("WHEEL_SLOW_PERIOD");
  const tunnel = numericConstant("TUNNEL_GAME_WHEEL_PERIOD");
  assert.ok(fast >= 0.95, `WHEEL_FAST_PERIOD ${fast}s is too fast for the detailed wheel art`);
  assert.ok(slow >= fast + 0.35, "the stop approach needs a visibly slower wheel cadence");
  assert.ok(tunnel >= fast, "tunnel wheels must not become faster than outdoor running wheels");
});

check("iOS period normalization never speeds the requested cadence up", () => {
  const source = extractFunction(game, "setWheelPeriod");
  const requested = numericConstant("WHEEL_FAST_PERIOD");
  const values = { veh: "", cars: "" };
  const sandbox = {
    IOS_DEVICE: true,
    lastWheelPeriod: -1,
    veh: { style: { setProperty: (_key, value) => { values.veh = value; } } },
    carsEl: { style: { setProperty: (_key, value) => { values.cars = value; } } }
  };
  vm.createContext(sandbox);
  vm.runInContext(`${source};this.run=setWheelPeriod;`, sandbox);
  sandbox.run(requested);
  assert.equal(values.veh, values.cars, "engine and passenger cars need the same normalized duration");
  assert.ok(parseFloat(values.veh) >= requested - 0.02, `iOS rounded ${requested}s down to ${values.veh}`);
});

check("all visible train running gear uses the shared wheel period", () => {
  assert.match(css, /#veh\.go \.train-wheel\s*\{[^}]*var\(--wheel-period/);
  assert.match(css, /body\.v-train #cars\.go \.car-wheel\s*\{[^}]*var\(--wheel-period/);
  assert.match(css, /#veh\.go \.train-wheel-rod\s*\{[^}]*var\(--wheel-period/);
  assert.match(css, /#veh\.go \.train-main-rod\s*\{[^}]*var\(--wheel-period/);
  assert.match(css, /#veh\.go \.train-crosshead\s*\{[^}]*var\(--wheel-period/);
});

check("passenger cars couple at their visible artwork edges", () => {
  assert.match(game, /const\s+TRAIN_CAR_ART_ASPECT\s*=\s*1853\s*\/\s*636\s*;/);
  const heightSource = extractFunction(game, "trainCarHeightPx");
  const visualWidthSource = extractFunction(game, "trainCarVisualWidthVw");
  const gapSource = extractFunction(game, "carGap");
  assert.match(gapSource, /trainCarVisualWidthVw\(\)/,
    "train spacing must follow the rendered image width instead of a fixed vw step");
  for (const width of [740, 844, 1024, 1366]) {
    const sandbox = {
      window: { innerWidth: width },
      TRAIN_CAR_HEIGHT_MIN_PX: numericConstant("TRAIN_CAR_HEIGHT_MIN_PX"),
      TRAIN_CAR_HEIGHT_VW: numericConstant("TRAIN_CAR_HEIGHT_VW"),
      TRAIN_CAR_HEIGHT_MAX_PX: numericConstant("TRAIN_CAR_HEIGHT_MAX_PX"),
      TRAIN_CAR_ART_ASPECT: 1853 / 636,
      STAGES: [{ veh: "train" }],
      stg: 0
    };
    vm.runInNewContext(`${heightSource}\n${visualWidthSource}\n${gapSource}\nthis.gap=carGap();`, sandbox);
    const expectedPx = Math.max(83, Math.min(133, width * 0.131)) * 1853 / 636;
    assert.ok(Math.abs(sandbox.gap * width / 100 - expectedPx) < 0.5,
      `${width}px: car gap no longer matches the visible ${expectedPx.toFixed(1)}px artwork width`);
  }
});

/* Never turn reduced motion into 100 Hz motion. This caused all reported iPad symptoms at once. */
check("reduced motion does not collapse every animation to 0.01 seconds", () => {
  assert.doesNotMatch(
    reducedMotion,
    /\*\s*\{[^}]*animation-duration\s*:\s*\.0?1s\s*!important/,
    "0.01s infinite animations strobe instead of reducing motion"
  );
});

/* Smoke must remain visible without flooding iPad Safari with hundreds of composited nodes. */
check("iPad uses scene smoke and keeps it visible while the train runs", () => {
  const tick = extractFunction(game, "tickMagicPuffs");
  assert.match(tick, /IOS_DEVICE&&smokeLayer/);
  assert.match(tick, /useSceneSmoke\?smokeLayer:veh\.querySelector\("\.puff"\)/);
  assert.match(css, /#veh\.go \.puff\s*\{[^}]*opacity\s*:\s*1/);
  assert.match(css, /\.magic-puff\s*\{[^}]*animation\s*:\s*magicPuffFly var\(--puff-life\)/);
  assert.doesNotMatch(css, /body\.ios-device[^{}]*#smokeLayer[^{}]*\{[^}]*display\s*:\s*none/);
});

check("iPad smoke cadence and pool are bounded", () => {
  const interval = numericConstant("IOS_SMOKE_INTERVAL_MIN_MS");
  const jitter = numericConstant("IOS_SMOKE_INTERVAL_JITTER_MS");
  const limit = numericConstant("IOS_SMOKE_MAX_PUFFS");
  const reducedLimit = numericConstant("REDUCED_SMOKE_MAX_PUFFS");
  const reducedLife = numericConstant("REDUCED_SMOKE_LIFE_MS");
  const desktopMean = numericConstant("SMOKE_INTERVAL_MIN_MS") + numericConstant("SMOKE_INTERVAL_JITTER_MS") / 2;
  const iosMean = interval + jitter / 2;
  assert.ok(interval >= 80, `iPad smoke interval ${interval}ms is too dense`);
  assert.ok(limit >= 6 && limit <= 32, `iPad smoke pool ${limit} should stay visible without overloading Safari`);
  assert.ok(reducedLimit >= 8 && reducedLimit <= 12,
    `reduced-motion smoke pool ${reducedLimit} must remain visibly full without flooding Safari`);
  assert.ok(reducedLife >= 2400, `reduced-motion smoke lifetime ${reducedLife}ms recreates the reported two-puff trickle`);
  assert.ok(iosMean <= desktopMean * 1.1,
    `iPad mean smoke cadence ${iosMean}ms is visibly thinner than desktop ${desktopMean}ms`);
  assert.ok(Math.floor(reducedLife / iosMean) >= 7,
    "reduced-motion iPad smoke must keep at least seven puffs visible at its mean cadence");
  const tick = extractFunction(game, "tickMagicPuffs");
  assert.match(tick, /IOS_SMOKE_INTERVAL_MIN_MS/);
  assert.match(tick, /IOS_SMOKE_MAX_PUFFS/);
  assert.match(tick, /REDUCED_SMOKE_MAX_PUFFS/);
  assert.match(tick, /REDUCED_SMOKE_LIFE_MS/);
});

check("low iPad frame rates do not stretch route travel", () => {
  assert.match(game, /const\s+FRAME_DT_MAX_SECONDS\s*=\s*IOS_DEVICE\?\.1:\.05\s*;/,
    "iPad needs a 100ms frame allowance so 10fps remains real-time");
  const loop = extractFunction(game, "gloop");
  assert.match(loop, /Math\.min\(FRAME_DT_MAX_SECONDS,\(t-lastT\)\/1000\)\*FAST/);
});

/* A pickup is a scored cause-and-effect event, even before the three-item inventory is full. */
check("every help pickup awards points", () => {
  const pickup = numericConstant("helpPickup");
  assert.ok(pickup > 0, "helpPickup must be worth a positive score");
  const runEvent = extractFunction(game, "onRunEvent");
  assert.match(runEvent, /(?:const|let)\s+(?:gained|points)\s*=\s*helpResult\.stored\s*\?\s*addScore\(SCORE_POINTS\.helpPickup,"help"\)\s*:\s*helpResult\.points/);
});

check("pickup feedback visibly includes its score", () => {
  const runEvent = extractFunction(game, "onRunEvent");
  const award = /(?:const|let)\s+(gained|pickupPoints)\s*=\s*helpResult\.stored\s*\?\s*addScore\(SCORE_POINTS\.helpPickup,"help"\)\s*:\s*helpResult\.points/.exec(runEvent);
  assert.ok(award, "pickup feedback must use the score awarded for this pickup");
  assert.match(runEvent, new RegExp(`showStamp\\([^;]*${award[1]}[^;]*\\+\\s*"てん"`),
    "the pickup stamp must state the points just awarded");
  assert.match(runEvent, /className="spark"/);
  assert.match(css, /#stamp\.new\s*\{[^}]*animation\s*:\s*pop\s+(?:0?\.[6-9]|1(?:\.\d+)?)s/,
    "pickup feedback must remain readable for at least 0.6s");
});

/* The question card is the primary action and should sit at the visual center on iPad. */
check("the shown quiz is centered instead of anchored to the floor", () => {
  const quizBase = cssRule("(?:^|\\n)#quiz");
  const quizShown = cssRule("(?:^|\\n)#quiz\\.show");
  assert.match(quizBase, /top\s*:\s*50%/);
  assert.match(quizBase, /bottom\s*:\s*auto/);
  assert.match(quizShown, /transform\s*:\s*translate\(\s*-50%\s*,\s*-50%\s*\)/);
  const lowHeightQuizRules = [...css.matchAll(/(?:^|\n)\s*#quiz(?:\.number-quiz)?\s*\{([^}]+)\}/g)].map(match => match[1]);
  for (const rule of lowHeightQuizRules) {
    assert.doesNotMatch(rule, /bottom\s*:\s*(?!auto)[^;}]+/, "a responsive override moved the quiz back to the bottom");
  }
  assert.match(css, /body\.st-sea\.sea-quiz-active #quiz[\s\S]*body\.st-future\.future-capsule-active #quiz[\s\S]*body\.st-space\.space-galaxy-active #quiz/,
    "full-screen minigames must retain a dedicated question-bar layout instead of covering their center controls");
});

/* Tunnel travel must continue under reduced motion; only friend motion may be simplified. */
check("tunnel interior always pans with world travel", () => {
  const setBackdrop = extractFunction(game, "setTunnelInteriorBackdrop");
  assert.match(setBackdrop, /worldX/);
  assert.doesNotMatch(setBackdrop, /tunnelFriendStartWorldX/,
    "reduced motion currently freezes the whole tunnel backdrop at its starting frame");
  assert.match(setBackdrop, /--tunnel-track-x/);
  assert.match(css, /body\.tunnel-interior #scene::after\s*\{[^}]*display\s*:\s*block/);
});

check("tunnel driving owns positive distance, speed and running classes", () => {
  assert.ok(numericConstant("TUNNEL_INTERIOR_RUN_VW") >= 240);
  assert.ok(numericConstant("TUNNEL_GAME_MAX_V") >= 24);
  const enter = extractFunction(game, "enterTunnelInterior");
  assert.match(enter, /target=worldX\+TUNNEL_INTERIOR_RUN_VW/);
  assert.match(enter, /pending="tunnelExit";driving=true/);
  assert.match(enter, /veh\.classList\.add\("go","inTun"\)/);
  assert.match(enter, /carsEl\.classList\.add\("go","inTun"\)/);
});

/* Number-world ambient art may drift slowly, but must never flash at the reduced-motion 100 Hz rate. */
check("number-world motion has calm base durations", () => {
  const buildNumberFx = extractFunction(game, "buildNumberFx");
  const cardsBlock = /const cards=\[([\s\S]*?)\];/.exec(buildNumberFx);
  assert.ok(cardsBlock, "number card timing table is missing");
  const cardDurations = [...cardsBlock[1].matchAll(/\[([^\]]+)\]/g)]
    .map(match => Number(match[1].split(",").at(-1)));
  assert.ok(cardDurations.length >= 6, "number cards need explicit calm duration data");
  assert.ok(Math.min(...cardDurations) >= 4, "number cards must not flash or flip several times per second");
  assert.match(css, /\.num-card\s*\{[^}]*animation\s*:\s*numCardDrift var\(--dur\)/);
});

check("reduced motion freezes number ambience instead of strobing it", () => {
  for (const selector of [".num-scene::before", ".num-card", ".num-poly", ".num-ring"]) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(reducedMotion, new RegExp(`${escaped}[^{}]*\\{[^}]*animation\\s*:\\s*none\\s*!important`),
      `${selector} needs an explicit static reduced-motion state`);
  }
});

/* Stage changes must clear transient number/future/space state before another stage appears. */
check("number minigame cleanup removes every animated cargo surface", () => {
  const reset = extractFunction(game, "resetNumberCargoGame");
  assert.match(reset, /querySelectorAll\("\.number-cargo-fly"\)[^;]*remove/);
  assert.match(reset, /querySelector\("\.number-cargo-game"\)[\s\S]*?activeGame\.remove\(\)/,
    "the hidden cargo grid must stop animating as soon as its answer is judged");
  const pick = extractFunction(game, "onPick");
  assert.match(pick, /if\(o\.mode==="number"\)resetNumberCargoGame\(\)/,
    "a correct number answer must release its animated DOM before train travel starts");
});

check("future and space cleanup own their timers, classes and layers", () => {
  const future = extractFunction(game, "clearFutureCapsuleGame");
  assert.match(future, /futureCapsuleTimers\.forEach\(clearTimeout\);futureCapsuleTimers\.clear\(\)/);
  assert.match(future, /classList\.remove\("future-capsule-active","future-capsule-complete"\)/);
  assert.match(future, /futureCapsuleLayer\.replaceChildren\(\);futureCapsuleLayer\.hidden=true/);
  const space = extractFunction(game, "clearSpaceGalaxyGame");
  assert.match(space, /clearTimeout\(spaceGalaxyTimer\);spaceGalaxyTimer=0/);
  assert.match(space, /spaceGalaxyPointerId=null/);
  assert.match(space, /classList\.remove\("space-galaxy-active","space-galaxy-complete"\)/);
  assert.match(space, /spaceGalaxyLayer\.replaceChildren\(\);spaceGalaxyLayer\.hidden=true/);
});

check("every major lifecycle clears number, future and space games", () => {
  for (const lifecycle of ["startJourneyAt", "showQuiz", "ending", "openMap", "nazonazoAdminPreviewArm"]) {
    const source = extractFunction(game, lifecycle);
    assert.match(source, /resetNumberCargoGame\(\)/, `${lifecycle}: number cleanup missing`);
    assert.match(source, /clearFutureCapsuleGame\(\)/, `${lifecycle}: future cleanup missing`);
    assert.match(source, /clearSpaceGalaxyGame\(\)/, `${lifecycle}: space cleanup missing`);
  }
});

/* Guard the semantic elements involved in the reported interactions. */
check("runtime feedback and quiz DOM remain present", () => {
  assert.match(html, /id="smokeLayer"[^>]*aria-hidden="true"/);
  assert.match(html, /id="scoreHudValue"/);
  assert.match(html, /id="stamp"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /id="quiz"/);
});

const failures = checks.filter(result => !result.ok);
for (const result of checks) {
  if (result.ok) console.log(`PASS ${result.name}`);
  else console.error(`FAIL ${result.name}\n  ${result.error.message}`);
}
if (failures.length) {
  console.error(`\n${failures.length}/${checks.length} iPad runtime contracts failed.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${checks.length} Nazonazo iPad runtime regression checks passed.`);
}
