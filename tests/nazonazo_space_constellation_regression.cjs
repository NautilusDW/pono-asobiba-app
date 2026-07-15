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

/* The station game is answer selection, three profiled dials, then rapid power charge. */
assert.match(html, /id="spaceGalaxyLayer"[^>]*role="group"[^>]*aria-labelledby="qText"[^>]*hidden/);
assert.doesNotMatch(game, /SPACE_GALAXY_WIND_GOAL|advanceSpaceGalaxyWind|windSpaceGalaxy|resolveSpaceGalaxySelection|renderSpaceGalaxyGame/,
  "the former star-engine interaction must not return");
assert.doesNotMatch(game, /space-galaxy-engine|space-galaxy-dock/,
  "the abstract engine and dock controls must not be rendered");
assert.match(game, /const SPACE_REPAIR_SCREW_COUNT=3;/);
assert.match(game, /const SPACE_REPAIR_STOP_TOLERANCE=Math\.PI\/12;/);
assert.match(game, /const SPACE_REPAIR_CHARGE_GOALS=\[8,10,12\];/);
assert.match(game, /const SPACE_REPAIR_CHARGE_MIN_MS=55;/);
assert.match(game, /const SPACE_REPAIR_POINTER_SAMPLE_CAP=\.50;/);
assert.match(game, /const SPACE_REPAIR_POINTER_DEADZONE_RATIO=\.18;/);
assert.match(game, /const SPACE_REPAIR_CLICK_STEP=Math\.PI\/2;/);
assert.match(game, /const SPACE_REPAIR_KEY_STEP=Math\.PI\/6;/);

const profilesMatch = /const SPACE_REPAIR_SCREW_PROFILES=(\[[\s\S]*?\n\]);/.exec(game);
assert.ok(profilesMatch, "per-station screw profiles are missing");
const profileDataSandbox = { Math };
vm.createContext(profileDataSandbox);
vm.runInContext(`this.profiles=${profilesMatch[1]};`, profileDataSandbox);
const profiles = JSON.parse(JSON.stringify(profileDataSandbox.profiles));
assert.deepEqual(profiles.map(row => row.map(profile => profile.turns)), [
  [2, 3, 2],
  [3, 2, 3],
  [2, 3, 2],
  [3, 2, 3],
  [2, 3, 3]
], "all five stations need their own two/three-turn rhythm");
assert.deepEqual(profiles.map(row => row.map(profile => profile.stop)), [
  [-Math.PI / 2, -Math.PI / 4, 0],
  [Math.PI / 2, -Math.PI / 4, Math.PI],
  [Math.PI, 0, Math.PI / 4],
  [-Math.PI / 4, -Math.PI / 2, Math.PI / 2],
  [0, Math.PI / 4, -Math.PI / 4]
], "each station must retain deterministic final stop angles");

const normalizeAngle = extractFunction(game, "normalizeSpaceRepairAngle");
const profileFn = extractFunction(game, "spaceRepairProfile");
const goalFn = extractFunction(game, "spaceRepairGoal");
const chargeGoalFn = extractFunction(game, "spaceRepairChargeGoal");
const stopNameFn = extractFunction(game, "spaceRepairStopName");
const alignedFn = extractFunction(game, "spaceRepairScrewAligned");
const completeFn = extractFunction(game, "spaceRepairScrewComplete");
const instructionFn = extractFunction(game, "spaceRepairInstruction");
const profileSandbox = {
  SPACE_REPAIR_SCREW_PROFILES: profiles,
  SPACE_REPAIR_SCREW_COUNT: 3,
  SPACE_REPAIR_STOP_TOLERANCE: Math.PI / 12,
  SPACE_REPAIR_CHARGE_GOALS: [8, 10, 12],
  spaceRepairProgress: [0, 0, 0],
  spaceRepairRotations: [0, 0, 0],
  qSeg: 0,
  level: 0,
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  Math,
  Number
};
vm.createContext(profileSandbox);
vm.runInContext([
  normalizeAngle,
  profileFn,
  goalFn,
  chargeGoalFn,
  stopNameFn,
  alignedFn,
  completeFn,
  instructionFn,
  "this.profile=spaceRepairProfile;this.goal=spaceRepairGoal;this.chargeGoal=spaceRepairChargeGoal;",
  "this.stopName=spaceRepairStopName;this.aligned=spaceRepairScrewAligned;this.complete=spaceRepairScrewComplete;this.instruction=spaceRepairInstruction;"
].join("\n"), profileSandbox);
for (let station = 0; station < profiles.length; station += 1) {
  profileSandbox.qSeg = station;
  for (let screw = 0; screw < 3; screw += 1) {
    assert.equal(profileSandbox.profile(screw).turns, profiles[station][screw].turns);
    assert.equal(profileSandbox.goal(screw), profiles[station][screw].turns * Math.PI * 2);
  }
}
profileSandbox.qSeg = 0;
assert.deepEqual([0, 1, 2].map(index => profileSandbox.stopName(index)), ["うえ", "みぎうえ", "みぎ"]);
assert.equal(profileSandbox.instruction(1), "3しゅう まわして みぎうえで とめよう");
const firstGoal = profileSandbox.goal(0);
const firstStop = profileSandbox.profile(0).stop;
profileSandbox.spaceRepairProgress[0] = firstGoal;
profileSandbox.spaceRepairRotations[0] = firstStop + firstGoal + Math.PI / 6;
assert.equal(profileSandbox.complete(0), false, "full turns at the wrong angle must not complete a dial");
profileSandbox.spaceRepairRotations[0] = firstStop + firstGoal;
assert.equal(profileSandbox.aligned(0), true);
assert.equal(profileSandbox.complete(0), true, "full turns aligned with the marker must complete the dial");
assert.deepEqual([0, 1, 2].map(level => { profileSandbox.level = level; return profileSandbox.chargeGoal(); }), [8, 10, 12]);

const optionFn = extractFunction(game, "spaceQuestionOptions");
const optionSandbox = { shuffle: values => values.slice().reverse() };
vm.createContext(optionSandbox);
vm.runInContext(`${optionFn};this.spaceQuestionOptions=spaceQuestionOptions;`, optionSandbox);
const options = optionSandbox.spaceQuestionOptions({ a: ["ok", "せいかい"], d: [["one", "ひとつ"], ["two", "ふたつ"]] });
assert.equal(options.length, 2);
assert.equal(options.filter(option => option.ok).length, 1);
assert.equal(options.filter(option => !option.ok).length, 1);

const renderRepair = extractFunction(game, "renderSpaceRepairGame");
assert.match(renderRepair, /className="space-repair-board"/);
assert.match(renderRepair, /className="choice space-repair-answer"/);
assert.match(renderRepair, /selectSpaceRepairAnswer/);
assert.match(renderRepair, /className="space-repair-bay"/);
assert.match(renderRepair, /className="space-repair-screws"/);
assert.match(renderRepair, /index<SPACE_REPAIR_SCREW_COUNT/);
assert.match(renderRepair, /setAttribute\("role","slider"\)/);
assert.match(renderRepair, /className="space-repair-target-marker"/);
assert.match(renderRepair, /className="space-repair-turn-label"/);
assert.match(renderRepair, /turns\.textContent=profile\.turns\+"しゅう"/);
assert.match(renderRepair, /for\(let lamp=0;lamp<4;lamp\+\+\)/,
  "each dial needs four stable progress lamps");
assert.match(renderRepair, /pointerdown",handleSpaceRepairPointerDown/);
assert.match(renderRepair, /lostpointercapture",finishSpaceRepairPointer/);
assert.match(renderRepair, /advanceSpaceRepairScrew\(SPACE_REPAIR_CLICK_STEP\)/,
  "a simple tap must retain the accessible half-turn fallback");
assert.match(renderRepair, /className="space-repair-charge"/);
assert.match(renderRepair, /className="space-repair-charge-meter"/);
assert.match(renderRepair, /setAttribute\("role","progressbar"\)/);
assert.match(renderRepair, /chargeGoal=spaceRepairChargeGoal\(\)/);
assert.match(renderRepair, /index<chargeGoal/,
  "the meter must render exactly 8, 10, or 12 cells for the chosen difficulty");
assert.match(renderRepair, /--space-charge-columns",String\(Math\.ceil\(chargeGoal\/2\)\)/,
  "8, 10, and 12 charge cells need balanced two-row meters");
assert.match(renderRepair, /aria-label","リペア チェック"/);
assert.match(renderRepair, /index<SPACE_REPAIR_SCREW_COUNT/,
  "all three required calibration checks must stay visible regardless of collision count");
assert.match(renderRepair, /className="space-repair-charge-button"/);
assert.match(renderRepair, /chargeButton\.type="button"/);
assert.match(renderRepair, /chargeButton\.addEventListener\("click",\(\)=>advanceSpaceRepairCharge\(1\)\)/);
assert.match(renderRepair, /spaceRepairRotations=Array\.from\(\{length:SPACE_REPAIR_SCREW_COUNT\},\(_,index\)=>spaceRepairProfile\(index\)\.stop\)/,
  "each dial must begin at its own visible stop marker");

const selectAnswer = extractFunction(game, "selectSpaceRepairAnswer");
assert.equal((selectAnswer.match(/onPick\(entry\.button,\{ok:false,mode:"space"\}\)/g) || []).length, 1,
  "one wrong answer tap must be submitted exactly once");
assert.doesNotMatch(selectAnswer, /onPick\(entry\.button,\{ok:true/,
  "the correct answer must not be graded before repair and charge");
assert.match(selectAnswer, /spaceRepairPhase="repair"/);
assert.match(selectAnswer, /spaceRepairActiveScrew=0/);
assert.match(selectAnswer, /spaceRepairGuide\(spaceRepairInstruction\(0\)\)/);
assert.match(selectAnswer, /spaceRepairOptions\.forEach\([^;]+button\.disabled=true/,
  "answer buttons must stop accepting input during repair");
assert.match(selectAnswer, /},620\)/,
  "wrong-answer recovery should return to selection after the shared unlock");
assert.doesNotMatch(selectAnswer, /sndNG\(\)|sndOK\(\)/,
  "the shared onPick path owns wrong/correct jingles");

const finishScrew = extractFunction(game, "finishSpaceRepairScrew");
const startCharge = extractFunction(game, "startSpaceRepairCharge");
const finishCharge = extractFunction(game, "finishSpaceRepairCharge");
assert.match(finishScrew, /spaceRepairProgress\[index\]=spaceRepairGoal\(index\)/);
assert.match(finishScrew, /spaceRepairRotations\[index\]=spaceRepairProfile\(index\)\.stop/,
  "completed dials must snap exactly to their individual stop marker");
assert.match(finishScrew, /index<SPACE_REPAIR_SCREW_COUNT-1/);
assert.match(finishScrew, /spaceRepairActiveScrew=index\+1/);
assert.match(finishScrew, /spaceRepairGuide\(spaceRepairInstruction\(index\+1\)\)/);
assert.match(finishScrew, /},120\)/,
  "focus should advance 120ms after a completed dial");
assert.match(finishScrew, /spaceRepairSchedule\(startSpaceRepairCharge,160\)/,
  "the third dial must lead to charge instead of grading");
assert.doesNotMatch(finishScrew, /onPick\(|spaceRepairPhase="complete"/,
  "dial completion alone must never submit the correct answer");
assert.match(startCharge, /spaceRepairPhase="charge"/);
assert.match(startCharge, /れんだして パワーを ためよう/);
assert.match(startCharge, /space-repair-charge-button/);
assert.equal((finishCharge.match(/onPick\(entry\.button,\{ok:true,mode:"space"\}\)/g) || []).length, 1,
  "full charge must submit one correct result");
assert.match(finishCharge, /spaceRepairSubmissionCommitted=true/);
assert.match(finishCharge, /futureReducedMotion\(\)\?120:420/);
assert.match(finishCharge, /spaceObstacleDamage=0/,
  "route damage clears only after the final charge");
assert.doesNotMatch(finishCharge, /sndNG\(\)|sndOK\(\)/,
  "completion must not duplicate the shared success jingle");

const advanceScrew = extractFunction(game, "advanceSpaceRepairScrew");
assert.match(advanceScrew, /spaceRepairRotations\[index\]\+=amount/);
assert.match(advanceScrew, /Math\.abs\(spaceRepairRotations\[index\]-profile\.stop\)/,
  "progress must derive from signed displacement instead of absolute per-event travel");
assert.match(advanceScrew, /Math\.max\(before,Math\.min\(goal,/,
  "small reverse corrections must not erase the furthest completed turn");
assert.doesNotMatch(advanceScrew, /before\+Math\.abs\(amount\)/,
  "back-and-forth wiggle must not accumulate fake turns");
assert.match(advanceScrew, /spaceRepairScrewComplete\(index\)/);
const advanceSandbox = {
  SPACE_REPAIR_SCREW_PROFILES: profiles,
  SPACE_REPAIR_SCREW_COUNT: 3,
  SPACE_REPAIR_STOP_TOLERANCE: Math.PI / 12,
  qSeg: 0,
  spaceRepairPhase: "repair",
  spaceRepairResolving: false,
  spaceRepairActiveScrew: 0,
  spaceRepairProgress: [0, 0, 0],
  spaceRepairRotations: [profiles[0][0].stop, profiles[0][1].stop, profiles[0][2].stop],
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  tone: () => {},
  updateSpaceRepairVisual: () => {},
  spaceRepairGuide: message => { advanceSandbox.guide = message; },
  finishSpaceRepairScrew: () => { advanceSandbox.finishCalls += 1; },
  finishCalls: 0,
  guide: "",
  Math,
  Number
};
vm.createContext(advanceSandbox);
vm.runInContext([
  normalizeAngle,
  profileFn,
  goalFn,
  alignedFn,
  completeFn,
  advanceScrew,
  "this.advance=advanceSpaceRepairScrew;this.goal=spaceRepairGoal;"
].join("\n"), advanceSandbox);
const signedGoal = advanceSandbox.goal(0);
advanceSandbox.advance(Math.PI);
assert.equal(advanceSandbox.spaceRepairProgress[0], Math.PI);
advanceSandbox.advance(-Math.PI);
assert.equal(advanceSandbox.spaceRepairProgress[0], Math.PI,
  "reversing to align must keep the furthest real turn instead of erasing child progress");
assert.equal(advanceSandbox.spaceRepairRotations[0], profiles[0][0].stop);
advanceSandbox.advance(Math.PI);
advanceSandbox.advance(-Math.PI);
assert.equal(advanceSandbox.spaceRepairProgress[0], Math.PI,
  "repeating the same short wiggle must not accumulate another turn");
advanceSandbox.advance(signedGoal + Math.PI / 6);
assert.equal(advanceSandbox.spaceRepairProgress[0], signedGoal);
assert.equal(advanceSandbox.finishCalls, 0, "full turns past the stop marker must wait for alignment");
assert.equal(advanceSandbox.guide, "ひかる しるしで とめよう");
advanceSandbox.advance(-Math.PI / 6);
assert.equal(advanceSandbox.finishCalls, 1, "returning to the target angle must finish the dial");
advanceSandbox.spaceRepairProgress[0] = 0;
advanceSandbox.spaceRepairRotations[0] = profiles[0][0].stop;
advanceSandbox.advance(-signedGoal);
assert.equal(advanceSandbox.finishCalls, 2, "either full rotation direction must remain valid");

const pointerAngle = extractFunction(game, "spaceRepairPointerAngleFor");
assert.match(pointerAngle, /geometry\.radius\*SPACE_REPAIR_POINTER_DEADZONE_RATIO/);
const pointerMove = extractFunction(game, "handleSpaceRepairPointerMove");
assert.match(pointerMove, /normalizeSpaceRepairAngle\(angle-spaceRepairPointerAngle\)/);
assert.match(pointerMove, /clamp\(delta,-SPACE_REPAIR_POINTER_SAMPLE_CAP,SPACE_REPAIR_POINTER_SAMPLE_CAP\)/);
assert.match(pointerMove, /advanceSpaceRepairScrew\(delta\)/);
const pointerEnd = extractFunction(game, "finishSpaceRepairPointer");
assert.doesNotMatch(pointerEnd, /spaceRepairProgress\s*=|onPick/,
  "cancel and lost capture must preserve dial progress and never grade");
assert.match(pointerEnd, /spaceRepairSuppressClick=true/,
  "the click after a real circular drag must be suppressed");

const keyHandler = extractFunction(game, "handleSpaceRepairKeyDown");
assert.match(keyHandler, /if\(!spaceRepairPlayable\(\)\|\|event\.defaultPrevented\)return;/,
  "portrait repair keys must return before preventDefault or mutation");
assert.match(keyHandler, /ArrowLeft/);
assert.match(keyHandler, /ArrowRight/);
assert.match(keyHandler, /SPACE_REPAIR_KEY_STEP/);
assert.match(keyHandler, /Space/);
assert.match(keyHandler, /Enter/);
assert.match(keyHandler, /!event\.repeat/,
  "Space/Enter must add only one half-turn per physical press");
assert.doesNotMatch(keyHandler.match(/if\(event\.key==="ArrowLeft"[\s\S]*?return;/)?.[0] || "", /event\.repeat/,
  "Left/Right key repeat should keep turning the active dial");

const advanceCharge = extractFunction(game, "advanceSpaceRepairCharge");
assert.match(advanceCharge, /now-spaceRepairChargeLastAt<SPACE_REPAIR_CHARGE_MIN_MS/);
assert.match(advanceCharge, /spaceRepairCharge=Math\.min\(goal,before\+amount\)/);
assert.match(advanceCharge, /if\(spaceRepairCharge>=goal\)finishSpaceRepairCharge\(\)/);
const chargeSandbox = {
  SPACE_REPAIR_CHARGE_MIN_MS: 55,
  spaceRepairPhase: "charge",
  spaceRepairResolving: false,
  spaceRepairCharge: 0,
  spaceRepairChargeLastAt: 0,
  clock: 100,
  _nowMs: () => chargeSandbox.clock,
  spaceRepairChargeGoal: () => 8,
  tone: () => {},
  updateSpaceRepairVisual: () => {},
  finishSpaceRepairCharge: () => {
    chargeSandbox.finishCalls += 1;
    chargeSandbox.spaceRepairPhase = "complete";
    chargeSandbox.spaceRepairResolving = true;
  },
  finishCalls: 0,
  Math,
  Number
};
vm.createContext(chargeSandbox);
vm.runInContext(`${advanceCharge};this.advance=advanceSpaceRepairCharge;`, chargeSandbox);
chargeSandbox.advance(1);
assert.equal(chargeSandbox.spaceRepairCharge, 1);
chargeSandbox.clock = 130;
chargeSandbox.advance(1);
assert.equal(chargeSandbox.spaceRepairCharge, 1, "a duplicate tap inside 55ms must be ignored");
chargeSandbox.clock = 155;
chargeSandbox.advance(1);
assert.equal(chargeSandbox.spaceRepairCharge, 2, "a tap on the 55ms boundary must count");
while (chargeSandbox.spaceRepairCharge < 8) {
  chargeSandbox.clock += 55;
  chargeSandbox.advance(1);
}
assert.equal(chargeSandbox.finishCalls, 1);
chargeSandbox.clock += 55;
chargeSandbox.advance(1);
assert.equal(chargeSandbox.finishCalls, 1, "charge completion must latch against extra taps");

const finishChargeSandbox = {
  spaceRepairPhase: "charge",
  spaceRepairResolving: false,
  spaceRepairCharge: 0,
  spaceRepairSubmissionCommitted: false,
  spaceRepairSelectedIndex: 0,
  spaceRepairOptions: [{ button: {}, o: { ok: true } }],
  spaceObstacleDamage: 3,
  spaceRepairChargeGoal: () => 8,
  spaceRepairGuide: () => {},
  updateSpaceRepairVisual: () => {},
  confetti: () => {},
  futureReducedMotion: () => false,
  document: { body: { classList: { add() {} } } },
  onPick: () => { finishChargeSandbox.pickCalls += 1; },
  clearSpaceRepairGame: () => { finishChargeSandbox.clearCalls += 1; },
  spaceRepairSchedule: callback => callback(),
  pickCalls: 0,
  clearCalls: 0
};
vm.createContext(finishChargeSandbox);
vm.runInContext(`${finishCharge};this.finish=finishSpaceRepairCharge;`, finishChargeSandbox);
finishChargeSandbox.finish();
finishChargeSandbox.finish();
assert.equal(finishChargeSandbox.spaceRepairPhase, "complete");
assert.equal(finishChargeSandbox.spaceRepairCharge, 8);
assert.equal(finishChargeSandbox.spaceObstacleDamage, 0);
assert.equal(finishChargeSandbox.spaceRepairSubmissionCommitted, true);
assert.equal(finishChargeSandbox.pickCalls, 1, "the completion callback must commit one correct onPick");
assert.equal(finishChargeSandbox.clearCalls, 1);

const help = extractFunction(game, "assistSpaceRepairGame");
assert.match(help, /wrong\.button\.disabled=true/);
assert.match(help, /correct\.button\.classList\.add\("glow"\)/);
assert.match(help, /spaceRepairProgress\[index\]=spaceRepairGoal\(index\)/);
assert.match(help, /spaceRepairRotations\[index\]=spaceRepairProfile\(index\)\.stop/,
  "repair help must align only the active dial before advancing");
assert.match(help, /spaceRepairPhase==="charge"/);
assert.match(help, /spaceRepairCharge=spaceRepairChargeGoal\(\);finishSpaceRepairCharge\(\)/,
  "charge help must use the same latched completion path");
assert.doesNotMatch(help, /onPick\(/,
  "help must never bypass the repair completion latch with a direct grade");
const guide = extractFunction(game, "spaceRepairGuide");
assert.match(guide, /illustratedText\(hintText,"space",message,"hint-inline-art"\)/,
  "every phase instruction must stay visible in the question bar");

const clear = extractFunction(game, "clearSpaceRepairGame");
assert.match(clear, /spaceRepairEpoch\+\+;clearTimeout\(spaceRepairTimer\)/);
assert.match(clear, /releaseSpaceRepairPointer\(\)/);
assert.match(clear, /spaceRepairProgress=\[0,0,0\]/);
assert.match(clear, /spaceRepairRotations=\[0,0,0\]/);
assert.match(clear, /spaceRepairCharge=0;spaceRepairChargeLastAt=0/);
assert.match(clear, /spaceRepairSubmissionCommitted=false/);
assert.match(clear, /classList\.remove\("space-repair-active","space-repair-complete"\)/);
assert.match(clear, /spaceGalaxyLayer\.replaceChildren\(\);spaceGalaxyLayer\.hidden=true/);
for (const lifecycle of ["startJourneyAt", "showQuiz", "ending", "openMap", "nazonazoAdminPreviewArm"]) {
  assert.match(extractFunction(game, lifecycle), /clearSpaceRepairGame\(\)/, `${lifecycle}: repair and charge state must be cleared`);
}
assert.match(extractFunction(game, "showQuiz"), /isSpaceStage\(\)\)renderSpaceRepairGame\(\)/);
assert.match(extractFunction(game, "activeChoiceButtons"), /space-repair-active[\s\S]*space-repair-answer/);
const playable = extractFunction(game, "spaceRepairPlayable");
assert.match(playable, /!window\.__PONO_TIER_LOCKED__/);
assert.match(playable, /spaceLandscapePlayable\(\)/,
  "portrait rotation hint must suspend input without clearing progress");
assert.match(playable, /spaceRepairPhase==="charge"/);
const updateVisual = extractFunction(game, "updateSpaceRepairVisual");
assert.match(updateVisual, /spaceRepairGoal\(index\)/);
assert.match(updateVisual, /spaceRepairScrewComplete\(index\)/);
assert.match(updateVisual, /--space-target-angle/);
assert.match(updateVisual, /active=spaceLandscapePlayable\(\)&&spaceRepairPhase==="repair"/,
  "the active dial must become disabled while portrait guidance covers the game");
assert.match(updateVisual, /chargeActive=spaceLandscapePlayable\(\)&&spaceRepairPhase==="charge"/,
  "the charge button must also suspend in portrait without losing charge");
assert.match(updateVisual, /chargeButton\.disabled=!chargeActive/);
assert.match(updateVisual, /chargeMeter\.setAttribute\("aria-valuenow"/);
assert.match(renderRepair, /click",event=>\{[^}]*spaceRepairSuppressClick[\s\S]*if\(!spaceRepairPlayable\(\)\)\{event\.preventDefault\(\);return;\}/,
  "native click fallback must not advance a dial behind the portrait hint");

/* Responsive operational UI: three upper dials and a separate lower charge band. */
assert.match(cssRule("\\.space-repair-panel"), /width:min\(calc\(100vw - 20px\),760px\)/);
assert.match(cssRule("\\.space-repair-panel"), /touch-action:none/);
assert.match(cssRule("\\.space-repair-bay"), /grid-template-rows:minmax\(0,1fr\) auto/);
assert.match(cssRule("\\.space-repair-screws"), /grid-template-columns:repeat\(3,minmax\(72px,1fr\)\)/,
  "844x390 and larger layouts need all three dials in one upper row");
assert.match(cssRule("\\.space-repair-screw"), /min-width:64px/);
assert.match(cssRule("\\.space-repair-screw"), /min-height:64px/);
assert.match(css, /\.space-repair-screw\.is-active\{/);
assert.match(css, /\.space-repair-screw\.is-aligning\{/,
  "full turns at a wrong angle need a distinct alignment state");
assert.match(cssRule("\\.space-repair-target-marker"), /--space-target-angle/);
assert.match(cssRule("\\.space-repair-charge"), /min-height:clamp\(56px,10vh,74px\)/);
assert.match(cssRule("\\.space-repair-charge-meter"), /repeat\(var\(--space-charge-columns,6\),minmax\(4px,1fr\)\)/,
  "the meter column count must balance each difficulty into two rows");
assert.match(cssRule("\\.space-repair-charge-button"), /min-height:56px/);
assert.match(cssRule("\\.space-repair-charge-button"), /touch-action:manipulation/);
assert.match(css, /\.space-repair-board:is\(\[data-repair-phase="repair"\],\[data-repair-phase="charge"\],\[data-repair-phase="complete"\]\) \.space-repair-panel\{grid-template-columns:minmax\(0,1fr\)\}/,
  "repair and charge must use the full panel width");
assert.match(css, /\.space-repair-board:is\(\[data-repair-phase="repair"\],\[data-repair-phase="charge"\],\[data-repair-phase="complete"\]\) \.space-repair-answers\{display:none\}/,
  "answered choices must leave room for upper controls and lower charge");
assert.match(css, /@media \(orientation:landscape\) and \(max-height:360px\)[\s\S]*\.space-repair-charge-button\{[^}]*min-height:48px/,
  "568x320 needs a compact but still usable charge button");
assert.match(css, /max-height:360px[\s\S]*\.space-repair-board\{--space-repair-panel-top:124px;--space-repair-panel-bottom:8px\}/);
assert.match(css, /body\.st-space\.space-repair-active #quiz\{[^}]*top:calc\(54px/);
assert.match(cssRule("\\.space-repair-guide"), /top:calc\(var\(--space-repair-panel-top\) - 29px\)/,
  "tall screens must keep the standalone guide between the question bar and panel");
assert.match(css, /@media \(orientation:landscape\) and \(max-height:640px\)\{[\s\S]*\.space-repair-guide\{display:none\}/,
  "short landscape must use the synced question-bar hint instead of an occluded guide");
assert.match(css, /body\.ios-device #quiz:not\(\.sea-quiz\):not\(\.future-capsule-quiz\):not\(\.space-galaxy-quiz\):not\(\.space-repair-quiz\)/,
  "iPad's centered ordinary-quiz override must not cover the repair panel");
assert.match(css, /body\.ios-device #quiz\.show:not\(\.sea-quiz\):not\(\.future-capsule-quiz\):not\(\.space-galaxy-quiz\):not\(\.space-repair-quiz\)/,
  "the shown iPad override must leave the repair question bar at the top");
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.space-repair-charge-button\{animation:none!important;transition:none!important\}/,
  "reduced motion must stop dial and charge pulses");
assert.match(css, /prefers-reduced-motion:reduce[\s\S]*\.space-repair-board\.is-complete::after\{display:none!important\}/,
  "reduced motion must remove the expanding completion ring");
assert.match(css, /prefers-reduced-motion:reduce[\s\S]*\.space-repair-board\.is-complete \.space-repair-bay/,
  "reduced motion needs a visible static completion state");

for (const [name, source] of [
  ["spaceRepairStopName", stopNameFn],
  ["spaceRepairInstruction", instructionFn],
  ["updateSpaceRepairVisual", updateVisual],
  ["renderSpaceRepairGame", renderRepair],
  ["selectSpaceRepairAnswer", selectAnswer],
  ["finishSpaceRepairScrew", finishScrew],
  ["startSpaceRepairCharge", startCharge],
  ["finishSpaceRepairCharge", finishCharge],
  ["advanceSpaceRepairScrew", advanceScrew],
  ["assistSpaceRepairGame", help]
]) assertNoChildFacingKanji(source, name);

console.log("Nazonazo space profiled repair and charge regression checks passed.");
