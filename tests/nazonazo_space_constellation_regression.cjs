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

/* The station game is now answer selection followed by three physical screw repairs. */
assert.match(html, /id="spaceGalaxyLayer"[^>]*role="group"[^>]*aria-labelledby="qText"[^>]*hidden/);
assert.doesNotMatch(game, /SPACE_GALAXY_WIND_GOAL|advanceSpaceGalaxyWind|windSpaceGalaxy|resolveSpaceGalaxySelection|renderSpaceGalaxyGame/,
  "the former 3.25-turn star engine must not remain executable");
assert.doesNotMatch(game, /space-galaxy-engine|space-galaxy-dock/,
  "the abstract engine and dock controls must not be rendered");
assert.match(game, /const SPACE_REPAIR_SCREW_GOALS=\[Math\.PI\*1\.10,Math\.PI\*1\.40,Math\.PI\*1\.70\];/);
assert.match(game, /const SPACE_REPAIR_SCREW_COUNT=3;/);
assert.match(game, /const SPACE_REPAIR_POINTER_SAMPLE_CAP=\.50;/);
assert.match(game, /const SPACE_REPAIR_POINTER_DEADZONE_RATIO=\.18;/);
assert.match(game, /const SPACE_REPAIR_CLICK_STEP=Math\.PI\/2;/);
assert.match(game, /const SPACE_REPAIR_KEY_STEP=Math\.PI\/6;/);

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
assert.match(renderRepair, /for\(let lamp=0;lamp<4;lamp\+\+\)/,
  "each screw needs four quarter-progress lamps");
assert.match(renderRepair, /pointerdown",handleSpaceRepairPointerDown/);
assert.match(renderRepair, /lostpointercapture",finishSpaceRepairPointer/);
assert.match(renderRepair, /advanceSpaceRepairScrew\(SPACE_REPAIR_CLICK_STEP\)/,
  "a simple tap must advance the active screw by a half turn");

const selectAnswer = extractFunction(game, "selectSpaceRepairAnswer");
assert.equal((selectAnswer.match(/onPick\(entry\.button,\{ok:false,mode:"space"\}\)/g) || []).length, 1,
  "one wrong answer tap must be submitted exactly once");
assert.doesNotMatch(selectAnswer, /onPick\(entry\.button,\{ok:true/,
  "the correct answer must not be graded before all three screws are repaired");
assert.match(selectAnswer, /spaceRepairPhase="repair"/);
assert.match(selectAnswer, /spaceRepairActiveScrew=0/);
assert.match(selectAnswer, /spaceRepairOptions\.forEach\([^;]+button\.disabled=true/,
  "answer buttons must stop accepting input during repair");
assert.match(selectAnswer, /},620\)/,
  "wrong-answer recovery should return to selection after the shared 520ms unlock");
assert.doesNotMatch(selectAnswer, /sndNG\(\)|sndOK\(\)/,
  "the shared onPick path owns wrong/correct jingles");

const finishScrew = extractFunction(game, "finishSpaceRepairScrew");
assert.match(finishScrew, /index<SPACE_REPAIR_SCREW_COUNT-1/);
assert.match(finishScrew, /spaceRepairActiveScrew=index\+1/);
assert.match(finishScrew, /},120\)/,
  "focus should advance 120ms after a completed screw");
assert.equal((finishScrew.match(/onPick\(entry\.button,\{ok:true,mode:"space"\}\)/g) || []).length, 1,
  "the third screw must submit one correct result");
assert.match(finishScrew, /futureReducedMotion\(\)\?120:420/);
assert.match(finishScrew, /spaceRepairSubmissionCommitted=true/);
assert.doesNotMatch(finishScrew, /sndNG\(\)|sndOK\(\)/,
  "completion must not duplicate the shared success jingle");

const advance = extractFunction(game, "advanceSpaceRepairScrew");
assert.match(advance, /spaceRepairProgress\[index\]=Math\.min\(goal,before\+Math\.abs\(amount\)\)/,
  "clockwise and counter-clockwise turning must both repair");
const advanceSandbox = {
  spaceRepairPhase: "repair",
  spaceRepairResolving: false,
  spaceRepairActiveScrew: 0,
  spaceRepairProgress: [0, 0, 0],
  spaceRepairRotations: [0, 0, 0],
  spaceRepairGoal: () => 4,
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  tone: () => {},
  updateSpaceRepairVisual: () => {},
  finishSpaceRepairScrew: () => { advanceSandbox.finished = true; },
  finished: false,
  Math,
  Number
};
vm.createContext(advanceSandbox);
vm.runInContext(`${advance};this.advance=advanceSpaceRepairScrew;`, advanceSandbox);
advanceSandbox.advance(-0.5);
assert.equal(advanceSandbox.spaceRepairProgress[0], 0.5);
assert.equal(advanceSandbox.spaceRepairRotations[0], -0.5);

const pointerAngle = extractFunction(game, "spaceRepairPointerAngleFor");
assert.match(pointerAngle, /geometry\.radius\*SPACE_REPAIR_POINTER_DEADZONE_RATIO/);
const pointerMove = extractFunction(game, "handleSpaceRepairPointerMove");
assert.match(pointerMove, /normalizeSpaceRepairAngle\(angle-spaceRepairPointerAngle\)/);
assert.match(pointerMove, /clamp\(delta,-SPACE_REPAIR_POINTER_SAMPLE_CAP,SPACE_REPAIR_POINTER_SAMPLE_CAP\)/);
assert.match(pointerMove, /advanceSpaceRepairScrew\(delta\)/);
const pointerEnd = extractFunction(game, "finishSpaceRepairPointer");
assert.doesNotMatch(pointerEnd, /spaceRepairProgress\s*=|onPick/,
  "cancel and lost capture must preserve screw progress and never grade");
assert.match(pointerEnd, /spaceRepairSuppressClick=true/,
  "the click after a real circular drag must be suppressed");

const keyHandler = extractFunction(game, "handleSpaceRepairKeyDown");
assert.match(keyHandler, /if\(!spaceRepairPlayable\(\)\|\|event\.defaultPrevented\)return;/,
  "portrait repair keys must return before preventDefault or any progress mutation");
assert.match(keyHandler, /ArrowLeft/);
assert.match(keyHandler, /ArrowRight/);
assert.match(keyHandler, /SPACE_REPAIR_KEY_STEP/);
assert.match(keyHandler, /Space/);
assert.match(keyHandler, /Enter/);
assert.match(keyHandler, /!event\.repeat/,
  "Space/Enter must add only one half-turn per physical press");
assert.doesNotMatch(keyHandler.match(/if\(event\.key==="ArrowLeft"[\s\S]*?return;/)?.[0] || "", /event\.repeat/,
  "Left/Right key repeat should keep turning the active screw");

const help = extractFunction(game, "assistSpaceRepairGame");
assert.match(help, /wrong\.button\.disabled=true/);
assert.match(help, /correct\.button\.classList\.add\("glow"\)/);
assert.match(help, /spaceRepairGoal\(\)-spaceRepairProgress\[spaceRepairActiveScrew\]/,
  "help during repair completes only the currently active screw");
assert.doesNotMatch(help, /onPick\(/,
  "help must not grade or complete the whole three-screw sequence");
const guide = extractFunction(game, "spaceRepairGuide");
assert.match(guide, /illustratedText\(hintText,"space",message,"hint-inline-art"\)/,
  "every repair phase instruction must stay visible in the question bar");

const clear = extractFunction(game, "clearSpaceRepairGame");
assert.match(clear, /spaceRepairEpoch\+\+;clearTimeout\(spaceRepairTimer\)/);
assert.match(clear, /releaseSpaceRepairPointer\(\)/);
assert.match(clear, /spaceRepairProgress=\[0,0,0\]/);
assert.match(clear, /classList\.remove\("space-repair-active","space-repair-complete"\)/);
assert.match(clear, /spaceGalaxyLayer\.replaceChildren\(\);spaceGalaxyLayer\.hidden=true/);
for (const lifecycle of ["startJourneyAt", "showQuiz", "ending", "openMap", "nazonazoAdminPreviewArm"]) {
  assert.match(extractFunction(game, lifecycle), /clearSpaceRepairGame\(\)/, `${lifecycle}: repair state must be cleared`);
}
assert.match(extractFunction(game, "showQuiz"), /isSpaceStage\(\)\)renderSpaceRepairGame\(\)/);
assert.match(extractFunction(game, "activeChoiceButtons"), /space-repair-active[\s\S]*space-repair-answer/);
assert.match(extractFunction(game, "spaceRepairPlayable"), /!window\.__PONO_TIER_LOCKED__/);
assert.match(extractFunction(game, "spaceRepairPlayable"), /spaceLandscapePlayable\(\)/,
  "portrait rotation hint must suspend repair input without clearing progress");
assert.match(extractFunction(game, "updateSpaceRepairVisual"), /active=spaceLandscapePlayable\(\)&&spaceRepairPhase==="repair"/,
  "the active screw must become disabled while the portrait hint covers the game");
assert.match(renderRepair, /click",event=>\{[^}]*spaceRepairSuppressClick[\s\S]*if\(!spaceRepairPlayable\(\)\)\{event\.preventDefault\(\);return;\}/,
  "native Space/Enter click fallback must not advance a screw behind the portrait hint");

/* Guided responsive UI: one active screw, 64px+ controls, and a short-landscape row. */
assert.match(cssRule("\\.space-repair-panel"), /width:min\(calc\(100vw - 20px\),760px\)/);
assert.match(cssRule("\\.space-repair-panel"), /touch-action:none/);
assert.match(cssRule("\\.space-repair-screw"), /min-width:64px/);
assert.match(cssRule("\\.space-repair-screw"), /min-height:64px/);
assert.match(css, /\.space-repair-screw\.is-active\{/);
assert.match(css, /@media \(orientation:landscape\) and \(max-height:360px\)[\s\S]*\.space-repair-screws\{[^}]*grid-template-columns:repeat\(3/,
  "568x320 and 844x390 need all three screws in one row");
assert.match(css, /max-height:360px[\s\S]*\.space-repair-board\{--space-repair-panel-top:124px;--space-repair-panel-bottom:8px\}/);
assert.match(css, /body\.st-space\.space-repair-active #quiz\{[^}]*top:calc\(54px/);
assert.match(cssRule("\\.space-repair-guide"), /top:calc\(var\(--space-repair-panel-top\) - 29px\)/,
  "tall screens must keep the standalone guide between the question bar and repair panel");
assert.match(css, /@media \(orientation:landscape\) and \(max-height:640px\)\{[\s\S]*\.space-repair-guide\{display:none\}/,
  "short landscape must use the synced question-bar hint instead of an occluded guide");
assert.match(css, /body\.ios-device #quiz:not\(\.sea-quiz\):not\(\.future-capsule-quiz\):not\(\.space-galaxy-quiz\):not\(\.space-repair-quiz\)/,
  "iPad's centered ordinary-quiz override must not cover the Space repair panel");
assert.match(css, /body\.ios-device #quiz\.show:not\(\.sea-quiz\):not\(\.future-capsule-quiz\):not\(\.space-galaxy-quiz\):not\(\.space-repair-quiz\)/,
  "the shown iPad override must leave the Space repair question bar at the top");
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.space-repair-screw[\s\S]*animation:none!important/);
assert.match(css, /prefers-reduced-motion:reduce[\s\S]*\.space-repair-board\.is-complete \.space-repair-bay/,
  "reduced motion needs a visible static completion state");

for (const [name, source] of [
  ["renderSpaceRepairGame", renderRepair],
  ["selectSpaceRepairAnswer", selectAnswer],
  ["finishSpaceRepairScrew", finishScrew],
  ["assistSpaceRepairGame", help]
]) assertNoChildFacingKanji(source, name);

console.log("Nazonazo space three-screw repair regression checks passed.");
