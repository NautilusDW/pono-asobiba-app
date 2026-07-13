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

/* Full-screen semantics and direct-manipulation surface. */
assert.match(html, /id="spaceGalaxyLayer"[^>]*role="group"[^>]*aria-labelledby="qText"[^>]*hidden/);
assert.doesNotMatch(html, /id="spaceGravityLayer"|id="spaceConstellationLayer"/);
assert.doesNotMatch(game, /SPACE_GRAVITY|spaceGravity|startSpaceGravityHold|releaseSpaceGravityHold/);
assert.doesNotMatch(css, /space-gravity|#spaceGravityLayer/);
const layerRule = cssRule("#spaceGalaxyLayer");
assert.match(layerRule, /position:fixed/);
assert.match(layerRule, /inset:0/);
assert.match(css, /#spaceGalaxyLayer\[hidden\]\{display:none!important\}/);
const boardRule = cssRule("\\.space-galaxy-board");
assert.match(boardRule, /position:absolute/);
assert.match(boardRule, /inset:0/);
assert.match(boardRule, /pointer-events:auto/);
assert.match(boardRule, /touch-action:none/);
const planetRule = cssRule("\\.space-galaxy-planet-choice");
assert.match(planetRule, /width:clamp\(118px,22vw,196px\)/);
assert.match(planetRule, /min-height:clamp\(66px,16vh,96px\)/);
assert.match(planetRule, /pointer-events:auto/);
assert.doesNotMatch(planetRule, /transition:[^;]*(?:left|top)/,
  "answer stars must stay under the finger instead of easing behind the gesture");
const ringRule = cssRule("\\.space-galaxy-ring");
assert.match(ringRule, /width:min\(68vw,760px\)/);
assert.match(ringRule, /height:min\(46vh,310px\)/);
assert.doesNotMatch(ringRule, /rotate\(var\(--galaxy-angle/,
  "the visible ellipse must remain aligned with the JS ellipse and fixed dock");
assert.match(cssRule("\\.space-galaxy-ring>i"), /left:var\(--star-x\)/);
assert.match(cssRule("\\.space-galaxy-ring>i"), /top:var\(--star-y\)/);
assert.match(css, /body\.space-galaxy-active #veh,body\.space-galaxy-active #cars\{opacity:0!important\}/);

/* One correct and one distractor remain, but position now performs selection. */
const optionFn = extractFunction(game, "spaceQuestionOptions");
const optionSandbox = { shuffle: values => values.slice().reverse() };
vm.createContext(optionSandbox);
vm.runInContext(`${optionFn};this.spaceQuestionOptions=spaceQuestionOptions;`, optionSandbox);
const options = optionSandbox.spaceQuestionOptions({ a: ["✅", "せいかい"], d: [["1️⃣", "ひとつ"], ["2️⃣", "ふたつ"]] });
assert.equal(options.length, 2);
assert.equal(options.filter(option => option.ok).length, 1);
assert.equal(options.filter(option => !option.ok).length, 1);

assert.match(game, /const SPACE_GALAXY_PLANET_ANGLES=\[-2\.2,2\.2\];/);
assert.match(game, /const SPACE_GALAXY_DOCK_WINDOW=\.20;/);
assert.match(game, /const SPACE_GALAXY_WIND_GOAL=Math\.PI\*2\*1\.15;/);
assert.match(game, /rocket:"\.\.\/assets\/images\/nazonazo-tunnel\/space_vehicle_exploration_rocket_pono_20260713\.png"/);
const geometry = extractFunction(game, "spaceGalaxyGeometry");
assert.match(geometry, /Math\.min\(width\*\.34,height\*\.72,380\)/);
assert.match(geometry, /Math\.min\(height\*\.23,width\*\.16,155\)/);

const renderGalaxy = extractFunction(game, "renderSpaceGalaxyGame");
assert.match(renderGalaxy, /className="space-galaxy-board is-idle"/);
assert.match(renderGalaxy, /className="space-galaxy-ring"/);
assert.match(renderGalaxy, /--star-x/);
assert.match(renderGalaxy, /--star-y/);
assert.match(renderGalaxy, /className="space-galaxy-dock"/);
assert.match(renderGalaxy, /button\.className="choice space-galaxy-planet-choice"/);
assert.match(renderGalaxy, /baseAngle:SPACE_GALAXY_PLANET_ANGLES\[index\]/);
assert.match(renderGalaxy, /button\.addEventListener\("click",event=>stepSpaceGalaxyPlanet/);
assert.match(renderGalaxy, /board\.addEventListener\("pointerdown",handleSpaceGalaxyPointerDown\)/);
assert.match(renderGalaxy, /className="space-galaxy-meter"/);
assert.match(renderGalaxy, /setAttribute\("aria-valuemax","100"\)/);
assert.match(renderGalaxy, /className="space-galaxy-finale"/);
assert.match(renderGalaxy, /rocket\.src=ASSETS\.space\.rocket/);
assert.doesNotMatch(renderGalaxy, /reduced\?[^:]+:/,
  "reduced motion must keep the same spatial decision instead of replacing it with repeated taps");

const angleFn = extractFunction(game, "normalizeSpaceGalaxyAngle");
const angleSandbox = { Math };
vm.createContext(angleSandbox);
vm.runInContext(`${angleFn};this.normalizeSpaceGalaxyAngle=normalizeSpaceGalaxyAngle;`, angleSandbox);
assert.ok(Math.abs(angleSandbox.normalizeSpaceGalaxyAngle(Math.PI * 2 + .25) - .25) < 1e-9);
assert.ok(Math.abs(angleSandbox.normalizeSpaceGalaxyAngle(-Math.PI * 2 - .4) + .4) < 1e-9);

const pointerAngle = extractFunction(game, "spaceGalaxyPointerAngleFor");
assert.match(pointerAngle, /event\.clientX-geo\.cx/);
assert.match(pointerAngle, /event\.clientY-geo\.cy/);
assert.match(pointerAngle, /Math\.atan2\(y,x\)/,
  "the gesture must use the actual angle around the elliptical galaxy");
const pointerMove = extractFunction(game, "handleSpaceGalaxyPointerMove");
assert.match(pointerMove, /normalizeSpaceGalaxyAngle\(angle-spaceGalaxyPointerAngle\)/);
assert.match(pointerMove, /advanceSpaceGalaxyRotation\(delta\)/);
const pointerEnd = extractFunction(game, "finishSpaceGalaxyPointer");
assert.doesNotMatch(pointerEnd, /dockSpaceGalaxy|onPick|resolveSpaceGalaxyCorrect/,
  "lifting or cancelling a pointer must never grade an answer");

/* Crossing the dock between two pointer samples must still snap exactly once. */
const advanceRotation = extractFunction(game, "advanceSpaceGalaxyRotation");
const dockingCalls = [];
const rotationSandbox = {
  Math,
  Number,
  SPACE_GALAXY_DOCK_WINDOW: .20,
  spaceGalaxyPlayable: () => true,
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  updateSpaceGalaxyVisual() {},
  dockSpaceGalaxy(entry) { dockingCalls.push(entry.index); },
  advanceSpaceGalaxyWind() {},
};
vm.createContext(rotationSandbox);
vm.runInContext(`
  var spaceGalaxyPhase="choose";
  var spaceGalaxyRotation=1.95;
  var spaceGalaxyOptions=[{index:0,baseAngle:-2.2,button:{disabled:false}}];
  ${angleFn}
  ${advanceRotation}
  this.run=advanceSpaceGalaxyRotation;
  this.rotation=()=>spaceGalaxyRotation;
`, rotationSandbox);
rotationSandbox.run(.5);
assert.deepEqual(dockingCalls, [0], "a fast crossing must dock instead of skipping the target");
assert.ok(Math.abs(rotationSandbox.rotation() - 2.2) < 1e-9, "docking must snap the chosen star to angle zero");

const tapPlanet = extractFunction(game, "stepSpaceGalaxyPlanet");
assert.match(tapPlanet, /amount=event&&event\.detail===0\?1\.15:\.76/,
  "tap, keyboard, and assistive clicks need a non-drag alternative that still rotates space");
assert.match(tapPlanet, /advanceSpaceGalaxyRotation\(clamp\(target,-amount,amount\)\)/);

const dock = extractFunction(game, "dockSpaceGalaxy");
assert.match(dock, /onPick\(entry\.button,\{ok:false,mode:"space"\}\)/,
  "a wrong star must enter the shared miss flow once");
assert.match(dock, /spaceGalaxyPhase="wind"/);
assert.match(dock, /spaceGalaxyCoreIndex=entry\.index/);
assert.match(dock, /if\(item!==entry\)item\.button\.disabled=true/,
  "only the docked core may remain focusable during winding");
assert.match(dock, /entry\.button\.focus\(\{preventScroll:true\}\)/);
assert.doesNotMatch(dock.match(/spaceGalaxyPhase="wind"[\s\S]*/)?.[0] || "", /onPick\(entry\.button,\{ok:true/,
  "correct knowledge alone must not skip the galaxy winding interaction");

const wind = extractFunction(game, "advanceSpaceGalaxyWind");
assert.match(wind, /spaceGalaxyWind\+clamp\(Math\.abs\(amount\),0,1\.60\)/,
  "slow strokes and direction reversals must contribute while fallback controls stay brisk");
assert.match(wind, /spaceGalaxyWind\/SPACE_GALAXY_WIND_GOAL\*3/);
assert.match(wind, /resolveSpaceGalaxyCorrect\(\)/);
assert.match(extractFunction(game, "updateSpaceGalaxyVisual"), /--galaxy-power/,
  "fractional winding must visibly fill the meter before the first whole stage");
const windGesture = extractFunction(game, "windSpaceGalaxy");
assert.match(windGesture, /if\(!futureReducedMotion\(\)\)spaceGalaxyRotation\+=delta/);
assert.match(windGesture, /advanceSpaceGalaxyWind\(Math\.abs\(delta\)\)/);
const windCalls = [];
const windSandbox = {
  Number,
  spaceGalaxyPhase: "wind",
  spaceGalaxyResolving: false,
  spaceGalaxyRotation: 0,
  futureReducedMotion: () => false,
  advanceSpaceGalaxyWind: amount => windCalls.push(amount)
};
vm.createContext(windSandbox);
vm.runInContext(`${windGesture};this.windSpaceGalaxy=windSpaceGalaxy;this.rotation=()=>spaceGalaxyRotation;`, windSandbox);
windSandbox.windSpaceGalaxy(Math.PI / 3);
assert.ok(Math.abs(windSandbox.rotation() - Math.PI / 3) < 1e-9, "tap/keyboard winding must visibly rotate the galaxy");
assert.deepEqual(windCalls, [Math.PI / 3]);
const resolve = extractFunction(game, "resolveSpaceGalaxyCorrect");
assert.match(resolve, /spaceGalaxyPhase="burst"/);
assert.match(resolve, /updateSpaceGalaxyJourney\(qSeg\+1\)/);
assert.match(resolve, /onPick\(entry\.button,\{ok:true,mode:"space"\}\)/);
assert.match(resolve, /classList\.add\("is-bursting"\)/);
assert.match(css, /\.space-galaxy-board\.is-bursting::after/);
assert.match(css, /\.space-galaxy-board\.is-bursting \.space-galaxy-rocket\{[^}]*spaceGalaxyRocket/);

const help = extractFunction(game, "assistSpaceGalaxyGame");
assert.match(help, /wrong\.button\.disabled=true/);
assert.match(help, /spaceGalaxyRotation=near-correct\.baseAngle/,
  "help may move the correct star near the dock without answering it");
assert.match(help, /if\(spaceGalaxyPhase==="wind"\)\{windSpaceGalaxy\(SPACE_GALAXY_WIND_GOAL\/3\)/);
assert.doesNotMatch(help, /dockSpaceGalaxy\(correct\)|resolveSpaceGalaxyCorrect\(\)/);

const keyHandler = extractFunction(game, "handleSpaceGalaxyKeyDown");
assert.match(keyHandler, /event\.key==="ArrowUp"\|\|event\.key==="ArrowDown"/);
assert.match(keyHandler, /event\.key==="ArrowLeft"\|\|event\.key==="ArrowRight"/);
assert.match(keyHandler, /advanceSpaceGalaxyRotation/);
assert.match(keyHandler, /spaceGalaxyOptions\.filter\(entry=>!entry\.button\.disabled\)/);
assert.match(keyHandler, /spaceGalaxyPhase==="wind"[\s\S]*windSpaceGalaxy\(Math\.PI\/3\)/);

const clear = extractFunction(game, "clearSpaceGalaxyGame");
assert.match(clear, /spaceGalaxyEpoch\+\+;clearTimeout\(spaceGalaxyTimer\)/);
assert.match(clear, /spaceGalaxyPointerId=null/);
assert.match(clear, /spaceGalaxyPhase="idle"/);
assert.match(clear, /spaceGalaxyLayer\.replaceChildren\(\);spaceGalaxyLayer\.hidden=true/);
for (const lifecycle of ["startJourneyAt", "showQuiz", "ending", "openMap", "nazonazoAdminPreviewArm"]) {
  assert.match(extractFunction(game, lifecycle), /clearSpaceGalaxyGame\(\)/, `${lifecycle}: galaxy state must be cleared`);
}
assert.match(extractFunction(game, "showQuiz"), /isSpaceStage\(\)\)renderSpaceGalaxyGame\(\)/);
assert.match(extractFunction(game, "activeChoiceButtons"), /space-galaxy-active[\s\S]*space-galaxy-planet-choice/);
assert.match(extractFunction(game, "onPick"), /classList\.contains\("space-galaxy-planet-choice"\)/);
assert.match(extractFunction(game, "useHelp"), /spaceGalaxyPointerId!==null/);
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.space-galaxy-ring::before,[\s\S]*animation:none!important/);
assert.match(css, /prefers-reduced-motion:reduce[\s\S]*\.space-galaxy-board\.is-bursting::after[^}]*animation:none!important/,
  "reduced motion must disable the full-screen expanding burst wave");
assert.match(css, /\.space-galaxy-board\.is-constellation-complete \.space-galaxy-finale/);

assertNoChildFacingKanji(renderGalaxy, "renderSpaceGalaxyGame");
assertNoChildFacingKanji(dock, "dockSpaceGalaxy");
assertNoChildFacingKanji(resolve, "resolveSpaceGalaxyCorrect");

console.log("Nazonazo rotating galaxy regression checks passed.");
