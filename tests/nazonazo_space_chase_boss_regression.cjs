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
const sw = read("sw.js");

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
    if (char === '"' || char === "'" || char === "`") { quote = char; continue; }
    if (char === "{") depth += 1;
    if (char === "}" && --depth === 0) return source.slice(match.index, index + 1);
  }
  assert.fail(`${name}: function is not closed`);
}

function cssRule(pattern) {
  const match = new RegExp(`${pattern}\\s*\\{([^}]+)\\}`).exec(css);
  assert.ok(match, `CSS rule missing: ${pattern}`);
  return match[1];
}

function assertNoChildFacingKanji(source, label) {
  const literals = [...source.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map(match => match[2]);
  for (const literal of literals.filter(value => /[ぁ-んァ-ヶ一-龠々]/.test(value))) {
    assert.doesNotMatch(literal, /[一-龠々]/, `${label}: child-facing string contains kanji: ${literal}`);
  }
}

assert.match(html, /styles\.css\?v=20260716-1309/);
assert.match(html, /js\/game\.js\?v=20260716-1309/);
assert.match(sw, /v2199: なぞなぞトレイン宇宙面の全問後/);
assert.match(sw, /const CACHE_VERSION = 2199;/);

/* The finale is its own zoomed-out chase layer, not another repair or obstacle round. */
const layerBlock = html.match(/<div id="spaceChaseLayer"[\s\S]*?<div id="seaRoundCountdown"/)?.[0] || "";
assert.match(layerBlock, /role="group" aria-label="うちゅう おいかけっこ" hidden/);
assert.match(layerBlock, /class="space-chase-camera"/);
assert.match(layerBlock, /class="space-chase-comet"[\s\S]*data-ui-art="fire"/);
assert.match(layerBlock, /space_vehicle_exploration_rocket_pono_20260713\.png/);
assert.match(layerBlock, /id="spaceChaseBoostButton"[^>]*type="button"[^>]*disabled/);
assert.match(layerBlock, /id="spaceChaseTapMeter"[^>]*role="progressbar"[^>]*aria-valuemax="4"/);
assert.match(layerBlock, /class="space-chase-rounds"[^>]*role="progressbar"[^>]*aria-valuemax="3"/);
assert.equal((layerBlock.match(/space-chase-tap-meter[\s\S]*?<\/div>/)?.[0].match(/<i>/g) || []).length, 4);

const layerCss = cssRule("#spaceChaseLayer");
assert.match(layerCss, /position\s*:\s*fixed/);
assert.match(layerCss, /inset\s*:\s*0/);
assert.match(layerCss, /z-index\s*:\s*18/);
assert.match(cssRule("#spaceChaseBoostButton"), /min-height\s*:\s*78px/);
assert.match(cssRule("#spaceChaseBoostButton"), /touch-action\s*:\s*manipulation/);
assert.match(css, /@keyframes spaceChasePullBack\{0%\{[^}]*scale\(1\.38\)[\s\S]*?100%\{[^}]*scale\(1\)/);
assert.match(css, /\.space-chase-board\.is-boosting \.space-chase-star-stream\{[^}]*animation-duration:\.38s/);
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*?\.space-chase-camera,[\s\S]*?animation:none!important/);
assert.match(css, /@media \(orientation:portrait\)[\s\S]*?#rotateHint\{display:flex\}/);
assert.match(css, /body\.space-chase-active #veh[\s\S]*?visibility:hidden!important/);
assert.match(css, /body\.space-chase-active #stamp\{z-index:23\}/,
  "intro, map-block, and victory stamps must stay visible above the opaque chase layer");

/* Space completion must queue the chase before the existing stage clear/ending path. */
const buildQList = extractFunction(game, "buildQList");
const proceed = extractFunction(game, "proceed");
const gloop = extractFunction(game, "gloop");
const resetSpaceSteering = extractFunction(game, "resetSpaceSteering");
const clearChase = extractFunction(game, "clearSpaceChaseEncounter");
const showChase = extractFunction(game, "showSpaceChaseEncounter");
const updateChase = extractFunction(game, "updateSpaceChase");
assert.match(buildQList, /if\(st\.id==="space"\)spaceChaseDefeated=false/,
  "each new Space run, including loop two, must reset the finale flag");
assert.ok(proceed.indexOf('pending="spaceChase"') < proceed.indexOf("completeCurrentStage(o)"),
  "the finale must run before stage-clear score, stars, save, and ending");
assert.match(proceed, /!window\.__PONO_TIER_LOCKED__/,
  "locked LP tiers must not queue an encounter that cannot start");
assert.match(gloop, /p==="spaceChase"\)showSpaceChaseEncounter\(\)/);
assert.match(resetSpaceSteering, /clearSpaceChaseEncounter\(\)/,
  "journey, transition, map, ending, and admin resets share Space steering cleanup");
assert.doesNotMatch(clearChase, /spaceChaseDefeated\s*=/,
  "ordinary encounter cleanup must not make the won finale reappear");
assert.match(showChase, /spaceChaseCompletionCommitted=false/);
assert.match(showChase, /clearRareEvent\(\)/);
assert.match(showChase, /resetSpaceObstacles\(\)/);
assert.match(updateChase, /spaceChaseCompletionCommitted=true;const stageOrigin=origin\(stg\);clearSpaceChaseEncounter\(\);completeCurrentStage\(stageOrigin\)/,
  "victory must latch before cleanup and call stage completion once");

const chaseFunctionNames = [
  "spaceChaseRuntimeActive", "spaceChasePlayable", "beginSpaceChaseCharge",
  "finishSpaceChaseVictory", "finishSpaceChaseBoost", "chargeSpaceChaseBoost", "updateSpaceChase"
];
const chaseSource = chaseFunctionNames.map(name => extractFunction(game, name)).join("\n");
assert.doesNotMatch(chaseSource, /setTimeout|setInterval/,
  "RAF state progress avoids stale timers after map, resize, or page lifecycle changes");
assert.doesNotMatch(chaseSource, /worldX\s*=|target\s*=|driving\s*=|pending\s*=/,
  "the visual chase must not take ownership of the train journey state");
assert.doesNotMatch(chaseSource, /addScore|stageMiss|totalStars/,
  "the no-fail finale must not mutate quiz scoring before completeCurrentStage");
assert.match(extractFunction(game, "spaceChaseRuntimeActive"), /!document\.hidden/);
assert.match(extractFunction(game, "spaceChaseRuntimeActive"), /!gameSettingsMenuIsOpen\(\)/);
assert.match(extractFunction(game, "spaceChaseRuntimeActive"), /spaceLandscapePlayable\(\)/);
assertNoChildFacingKanji(chaseSource, "Space chase");

/* Behavioral model: slow taps never decay, four taps launch exactly one automatic burst,
   portrait/settings/background pause it, and three bursts complete exactly once. */
const sandbox = {
  SPACE_CHASE_TAPS_PER_BURST: 4,
  SPACE_CHASE_BURST_GOAL: 3,
  SPACE_CHASE_INTRO_MS: 650,
  SPACE_CHASE_BOOST_MS: 900,
  SPACE_CHASE_COAST_MS: 420,
  SPACE_CHASE_VICTORY_MS: 950,
  FAST: 1,
  window: { __PONO_TIER_LOCKED__: false, innerWidth: 844, innerHeight: 390 },
  document: { hidden: false },
  playing: true,
  spaceChaseLayer: { hidden: false },
  spaceChasePhase: "intro",
  spaceChaseTapCount: 0,
  spaceChaseBurstCount: 0,
  spaceChaseProgress: 0,
  spaceChaseBoostStartProgress: 0,
  spaceChaseBoostTargetProgress: 0,
  spaceChasePhaseElapsedMs: 0,
  spaceChaseFrameAt: 0,
  spaceChaseCompletionCommitted: false,
  spaceChaseDefeated: false,
  stg: 5,
  settingsOpen: false,
  isSpaceStage: () => true,
  spaceLandscapePlayable() { return sandbox.window.innerWidth >= sandbox.window.innerHeight; },
  gameSettingsMenuIsOpen: () => sandbox.settingsOpen,
  futureReducedMotion: () => false,
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  ensureAC: () => {},
  setSpaceChaseGuide: message => { sandbox.guide = message; },
  updateSpaceChaseVisual: () => { sandbox.visualWrites += 1; },
  focusSpaceChaseBoost: () => { sandbox.focusCalls += 1; },
  showStamp: () => {},
  tone: () => {},
  confetti: () => {},
  origin: stage => stage * 1000,
  clearSpaceChaseEncounter: () => { sandbox.clearCalls += 1; },
  completeCurrentStage: value => { sandbox.completeCalls.push(value); },
  _nowMs: () => sandbox.clock,
  guide: "",
  visualWrites: 0,
  focusCalls: 0,
  clearCalls: 0,
  completeCalls: [],
  clock: 0,
  Math,
  Number
};
vm.createContext(sandbox);
vm.runInContext(`${chaseSource}\nthis.charge=chargeSpaceChaseBoost;this.update=updateSpaceChase;`, sandbox);

function advance(ms) {
  const end = sandbox.clock + ms;
  while (sandbox.clock < end) {
    sandbox.clock = Math.min(end, sandbox.clock + 25);
    sandbox.update(sandbox.clock);
  }
}
function finishCharge() {
  while (sandbox.spaceChaseTapCount < 4) assert.equal(sandbox.charge(), true);
  assert.equal(sandbox.spaceChasePhase, "boost");
  assert.equal(sandbox.charge(), false, "automatic boost must ignore extra taps instead of queuing another burst");
}

advance(700);
assert.equal(sandbox.spaceChasePhase, "charge");
assert.equal(sandbox.charge(), true);
advance(5000);
assert.equal(sandbox.spaceChasePhase, "charge");
assert.equal(sandbox.spaceChaseTapCount, 1, "slow taps must remain stored with no timeout or decay");
finishCharge();
const firstStart = sandbox.spaceChaseProgress;
sandbox.settingsOpen = true;
advance(1800);
assert.equal(sandbox.spaceChaseProgress, firstStart, "settings must pause automatic movement");
sandbox.settingsOpen = false;
advance(950);
assert.equal(sandbox.spaceChaseBurstCount, 1);
assert.equal(sandbox.spaceChasePhase, "coast");
assert.ok(sandbox.spaceChaseProgress >= firstStart);
advance(450);
assert.equal(sandbox.spaceChasePhase, "charge");

sandbox.window.innerWidth = 390; sandbox.window.innerHeight = 844;
const tapsBeforePortrait = sandbox.spaceChaseTapCount;
assert.equal(sandbox.charge(), false, "portrait rotate overlay must suspend chase input");
advance(1200);
assert.equal(sandbox.spaceChaseTapCount, tapsBeforePortrait);
sandbox.window.innerWidth = 844; sandbox.window.innerHeight = 390;
finishCharge();
const secondStart = sandbox.spaceChaseProgress;
sandbox.document.hidden = true;
advance(1800);
assert.equal(sandbox.spaceChaseProgress, secondStart, "background time must not jump the chase forward");
sandbox.document.hidden = false;
advance(950);
assert.equal(sandbox.spaceChaseBurstCount, 2);
assert.ok(sandbox.spaceChaseProgress >= secondStart);
advance(450);
assert.equal(sandbox.spaceChasePhase, "charge");

finishCharge();
advance(950);
assert.equal(sandbox.spaceChasePhase, "victory");
assert.equal(sandbox.spaceChaseBurstCount, 3);
assert.equal(sandbox.spaceChaseDefeated, true);
assert.equal(sandbox.spaceChaseProgress, 1);
advance(1000);
assert.deepEqual(sandbox.completeCalls, [5000]);
assert.equal(sandbox.clearCalls, 1);
advance(2000);
assert.deepEqual(sandbox.completeCalls, [5000], "victory must never award stage completion twice");

console.log("nazonazo space chase boss regression: ok");
