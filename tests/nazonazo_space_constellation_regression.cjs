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

function extractFirstFunction(source, names) {
  const name = names.find(candidate => new RegExp(`function\\s+${candidate}\\s*\\(`).test(source));
  assert.ok(name, `expected one function: ${names.join(", ")}`);
  return { name, source: extractFunction(source, name) };
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

/* Full-screen game: fixed answer selection and a separate circular engine. */
assert.match(html, /id="spaceGalaxyLayer"[^>]*role="group"[^>]*aria-labelledby="qText"[^>]*hidden/);
assert.doesNotMatch(html, /id="spaceGravityLayer"|id="spaceConstellationLayer"/);
assert.doesNotMatch(game, /SPACE_GRAVITY|spaceGravity|startSpaceGravityHold|releaseSpaceGravityHold/);
const layerRule = cssRule("#spaceGalaxyLayer");
assert.match(layerRule, /position:fixed/);
assert.match(layerRule, /inset:0/);
assert.match(css, /#spaceGalaxyLayer\[hidden\]\{display:none!important\}/);
const boardRule = cssRule("\\.space-galaxy-board");
assert.match(boardRule, /position:absolute/);
assert.match(boardRule, /inset:0/);
const planetRule = cssRule("\\.space-galaxy-planet-choice");
assert.match(planetRule, /position:absolute/);
assert.match(planetRule, /pointer-events:auto/);
assert.doesNotMatch(planetRule, /will-change:left,top/,
  "answer choices must remain fixed while the independent engine turns");
assert.match(css, /\.space-galaxy-planet-choice\.is-selected|\.space-galaxy-planet-choice\[aria-pressed="true"\]/,
  "the selected answer needs a persistent visual state");
const engineRule = cssRule("\\.space-galaxy-engine(?:,\\.space-galaxy-star-engine)?");
assert.match(engineRule, /pointer-events:auto/);
assert.match(engineRule, /touch-action:none/);
assert.match(engineRule, /border-radius:50%/);
assert.doesNotMatch(css, /\.space-galaxy-dock|spaceGalaxyDock|>ドック</,
  "the rejected dock metaphor must not remain visible or executable");

const optionFn = extractFunction(game, "spaceQuestionOptions");
const optionSandbox = { shuffle: values => values.slice().reverse() };
vm.createContext(optionSandbox);
vm.runInContext(`${optionFn};this.spaceQuestionOptions=spaceQuestionOptions;`, optionSandbox);
const options = optionSandbox.spaceQuestionOptions({ a: ["✅", "せいかい"], d: [["1️⃣", "ひとつ"], ["2️⃣", "ふたつ"]] });
assert.equal(options.length, 2);
assert.equal(options.filter(option => option.ok).length, 1);
assert.equal(options.filter(option => !option.ok).length, 1);

assert.match(game, /const SPACE_GALAXY_WIND_GOAL=Math\.PI\*2\*3\.25;/,
  "the engine needs 3.25 full turns instead of the former 1.15-turn shortcut");
assert.doesNotMatch(game, /SPACE_GALAXY_PLANET_ANGLES|SPACE_GALAXY_DOCK_WINDOW|dockSpaceGalaxy/);
assert.match(game, /rocket:"\.\.\/assets\/images\/nazonazo-tunnel\/space_vehicle_exploration_rocket_pono_20260713\.png"/);

const renderGalaxy = extractFunction(game, "renderSpaceGalaxyGame");
assert.match(renderGalaxy, /className="space-galaxy-board/);
assert.match(renderGalaxy, /button\.className="choice space-galaxy-planet-choice"/);
assert.match(renderGalaxy, /setAttribute\("aria-pressed","false"\)/);
assert.match(renderGalaxy, /selectSpaceGalaxyAnswer/);
assert.match(renderGalaxy, /className="space-galaxy-engine"/);
assert.match(renderGalaxy, /engine\.disabled=true/,
  "the engine must not confirm anything before an answer is selected");
assert.match(renderGalaxy, /engine\.addEventListener\("pointerdown",handleSpaceGalaxyPointerDown\)/,
  "only the engine, not the whole board, should capture circular gestures");
assert.doesNotMatch(renderGalaxy, /board\.addEventListener\("pointerdown",handleSpaceGalaxyPointerDown\)/,
  "answer taps must not bubble into the circular gesture");
assert.match(renderGalaxy, /for\(let index=0;index<12;index\+\+\)/,
  "the long wind-up needs twelve visible progress notches");
assert.match(renderGalaxy, /className="space-galaxy-meter"/);
assert.match(renderGalaxy, /setAttribute\("role","progressbar"\)/);
assert.match(renderGalaxy, /className="space-galaxy-rocket"/);

const selectAnswer = extractFunction(game, "selectSpaceGalaxyAnswer");
assert.match(selectAnswer, /spaceGalaxySelectedIndex=index/);
assert.match(selectAnswer, /setAttribute\("aria-pressed",(?:item\.index===index|selected\?"true":"false")/);
assert.match(selectAnswer, /spaceGalaxyPhase="wind"|spaceGalaxyPhase="armed"/);
assert.match(selectAnswer, /engine\.disabled=false|\.disabled=false/);
assert.doesNotMatch(selectAnswer, /onPick\(|resolveSpaceGalaxy/,
  "choosing an answer must never grade it before the engine is wound");

const pointerAngle = extractFunction(game, "spaceGalaxyPointerAngleFor");
assert.match(pointerAngle, /event\.clientX-geo\.cx/);
assert.match(pointerAngle, /event\.clientY-geo\.cy/);
assert.match(pointerAngle, /Math\.atan2\(y,x\)/);
const pointerMove = extractFunction(game, "handleSpaceGalaxyPointerMove");
assert.match(pointerMove, /normalizeSpaceGalaxyAngle\(angle-spaceGalaxyPointerAngle\)/);
assert.match(pointerMove, /windSpaceGalaxy\(|advanceSpaceGalaxyWind\(/);
const pointerEnd = extractFunction(game, "finishSpaceGalaxyPointer");
assert.doesNotMatch(pointerEnd, /onPick|resolveSpaceGalaxy/,
  "lifting or cancelling a pointer must not grade an incomplete turn");

const windGesture = extractFunction(game, "windSpaceGalaxy");
assert.match(windGesture, /advanceSpaceGalaxyWind\(Math\.abs\(delta\)\)/);
const wind = extractFunction(game, "advanceSpaceGalaxyWind");
assert.match(wind, /spaceGalaxyWind\+clamp\(Math\.abs\(amount\)/);
assert.match(wind, /spaceGalaxyWind>=SPACE_GALAXY_WIND_GOAL-.001/);
assert.match(wind, /SPACE_GALAXY_WIND_GOAL/);
assert.match(wind, /spaceGalaxyTurnsAnnounced|Math\.floor\(spaceGalaxyWind\/\(Math\.PI\*2\)\)/,
  "whole-turn milestones must be tracked for pleasurable feedback");
assert.match(extractFunction(game, "updateSpaceGalaxyVisual"), /--galaxy-power/);
assert.match(extractFunction(game, "updateSpaceGalaxyVisual"), /querySelectorAll\("\.space-galaxy-meter i"\)/);

const resolve = extractFirstFunction(game, ["resolveSpaceGalaxySelection", "resolveSpaceGalaxyChoice", "resolveSpaceGalaxyCorrect"]);
assert.match(resolve.source, /spaceGalaxySelectedIndex/,
  "the final grade must use the explicitly selected fixed answer");
assert.match(resolve.source, /onPick\(entry\.button,\{ok:false,mode:"space"/,
  "a fully wound wrong answer must enter the shared retry flow");
assert.equal((resolve.source.match(/onPick\(entry\.button,\{ok:false,mode:"space"/g) || []).length, 1,
  "one completed wrong wind-up must be scored once");
assert.match(resolve.source, /onPick\(entry\.button,\{ok:true,mode:"space"/);
assert.match(resolve.source, /classList\.add\("is-bursting"\)/);
assert.doesNotMatch(resolve.source, /tone\((?:180|220|247)\b/,
  "success must not begin with a low note resembling the wrong-answer cue");
const immediateOkSounds = (resolve.source.match(/sndOK\(\)/g) || []).length;
assert.ok(immediateOkSounds <= 1, "space completion must not layer multiple correct jingles");
if (immediateOkSounds === 1) {
  assert.match(resolve.source, /(?:skipOkSound|soundPlayed|silentOk):true/,
    "an immediate success jingle must tell shared onPick not to play it twice");
}
assert.match(resolve.source, /spaceGalaxyWind=0/,
  "a wrong result must reset the engine for the remaining answer");
assert.match(resolve.source, /spaceGalaxySelectedIndex=-1/,
  "a wrong result must return to explicit answer selection");

const onPick = extractFunction(game, "onPick");
assert.equal((onPick.match(/sndOK\(\)/g) || []).length, 1,
  "the shared success path must contain one correct jingle call");
if (immediateOkSounds === 1) {
  assert.match(onPick, /if\s*\(\s*!o\.skipOkSound\s*\)\s*\{?\s*sndOK\(\)/,
    "the shared path must honor skipOkSound after the space finale already played sndOK");
}
assert.match(onPick, /classList\.contains\("space-galaxy-planet-choice"\)/);

const help = extractFunction(game, "assistSpaceGalaxyGame");
assert.match(help, /wrong\.button\.disabled=true/);
assert.match(help, /selectSpaceGalaxyAnswer\(correct\.index/,
  "help should explicitly select the revealed correct answer");
assert.match(help, /(?:windSpaceGalaxy|advanceSpaceGalaxyWind)\(Math\.PI\*2\)/,
  "help contributes one turn, leaving more than two turns for the child");
assert.doesNotMatch(help, /resolveSpaceGalaxy|onPick\(/,
  "help must not auto-confirm the selected answer");

const keyHandler = extractFunction(game, "handleSpaceGalaxyKeyDown");
assert.match(keyHandler, /space-galaxy-planet-choice/);
assert.match(keyHandler, /space-galaxy-engine/);
assert.match(keyHandler, /Space|Enter/);
assert.match(keyHandler, /windSpaceGalaxy|advanceSpaceGalaxyWind/);

const clear = extractFunction(game, "clearSpaceGalaxyGame");
assert.match(clear, /spaceGalaxyEpoch\+\+;clearTimeout\(spaceGalaxyTimer\)/);
assert.match(clear, /spaceGalaxyPointerId=null/);
assert.match(clear, /spaceGalaxySelectedIndex=-1/);
assert.match(clear, /spaceGalaxyPhase="idle"/);
assert.match(clear, /spaceGalaxyLayer\.replaceChildren\(\);spaceGalaxyLayer\.hidden=true/);
for (const lifecycle of ["startJourneyAt", "showQuiz", "ending", "openMap", "nazonazoAdminPreviewArm"]) {
  assert.match(extractFunction(game, lifecycle), /clearSpaceGalaxyGame\(\)/, `${lifecycle}: galaxy state must be cleared`);
}
assert.match(extractFunction(game, "showQuiz"), /isSpaceStage\(\)\)renderSpaceGalaxyGame\(\)/);
assert.match(extractFunction(game, "activeChoiceButtons"), /space-galaxy-active[\s\S]*space-galaxy-planet-choice/);
assert.match(extractFunction(game, "useHelp"), /spaceGalaxyPointerId!==null/);

/* Reduced motion keeps discrete progress and a visible static success rocket. */
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.space-galaxy-engine[\s\S]*animation:none!important/);
assert.match(css, /prefers-reduced-motion:reduce[\s\S]*\.space-galaxy-board\.is-bursting \.space-galaxy-rocket\{[^}]*(?:opacity:1|display:block)/,
  "reduced motion must not leave the success rocket at its base opacity zero");
assert.match(css, /\.space-galaxy-board\.is-constellation-complete \.space-galaxy-finale/);

assertNoChildFacingKanji(renderGalaxy, "renderSpaceGalaxyGame");
assertNoChildFacingKanji(selectAnswer, "selectSpaceGalaxyAnswer");
assertNoChildFacingKanji(resolve.source, resolve.name);

console.log("Nazonazo selected-answer galaxy engine regression checks passed.");
