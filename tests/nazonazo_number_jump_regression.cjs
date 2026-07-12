#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "nazonazo-tunnel/index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "nazonazo-tunnel/styles.css"), "utf8");
const game = fs.readFileSync(path.join(root, "nazonazo-tunnel/js/game.js"), "utf8");

function extractFunction(name) {
  const start = game.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name}: function missing`);
  const bodyStart = game.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < game.length; index += 1) {
    const char = game[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return game.slice(start, index + 1);
    }
  }
  assert.fail(`${name}: unterminated function`);
}

function extractCssBlock(selector) {
  const start = css.indexOf(`${selector}{`);
  assert.ok(start >= 0, `${selector}: CSS block missing`);
  const bodyStart = css.indexOf("{", start);
  const end = css.indexOf("}", bodyStart);
  assert.ok(end > bodyStart, `${selector}: CSS block unterminated`);
  return css.slice(start, end + 1);
}

assert.match(game, /let numberCargoPicked=\[\],numberCargoGoalShown=false;/, "cargo activity state must have explicit safe defaults");
assert.match(extractFunction("isNumberCargoQuestion"), /STAGES\[stg\]\.id==="number"/, "the cargo activity must only replace choices in the number stage");
assert.match(extractFunction("numberCargoLimit"), /\[3,5,9\]\[level\]\|\|3/, "easy, normal, and hard cargo fields must contain three, five, and nine objects");
assert.match(extractFunction("numberCargoAnswer"), /clamp\(Number\(cur&&cur\.a&&cur\.a\[0\]\)\|\|0,0,numberCargoLimit\(\)\)/, "the target answer must stay inside the available cargo count");

const showQuiz = extractFunction("showQuiz");
assert.match(showQuiz, /resetNumberCargoGame\(\);/, "every question must start with an empty wagon");
assert.match(showQuiz, /choicesEl\.replaceChildren\(\);/, "stale answer controls must be removed before rendering the activity");
assert.match(showQuiz, /if\(isNumberCargoQuestion\(\)\)renderNumberCargoGame\(\);else if\(isSeaStage\(\)\)renderSeaBubbleGame\(\);else if\(isFutureStage\(\)\)renderFutureRailGame\(\);else if\(isSpaceStage\(\)\)renderSpaceConstellationGame\(\);else renderChoiceCards\(\);/, "number, sea, future, and space questions must keep their own answer games while other stages use cards");
assert.match(extractFunction("renderChoiceCards"), /className="choice"/, "non-number stages must keep their normal answer cards");

const renderGame = extractFunction("renderNumberCargoGame");
assert.match(extractFunction("numberCargoColumnCount"), /\(window\.innerWidth\|\|844\)<560\?3:5/, "490px-class landscape screens must switch to three stable cargo columns");
assert.match(extractFunction("syncNumberCargoColumns"), /numberCargoColumnCount\(numberCargoLimit\(\)\)/, "visible cargo grids must follow split-view width changes without resetting picked objects");
for (const fragment of [
  /className="number-cargo-game"/,
  /role","group"/,
  /aria-labelledby","qText"/,
  /className="number-cargo-field"/,
  /aria-label","タップして のせる"/,
  /for\(let i=0;i<limit;i\+\+\)/,
  /document\.createElement\("button"\)/,
  /\.type="button"/,
  /className="number-cargo-target"/,
  /\.dataset\.cargoIndex=String\(i\)/,
  /\.setAttribute\("aria-pressed","false"\)/,
  /bindTap\([^,]+,\(\)=>collectNumberCargo\(i,[^)]+\)\)/,
  /className="number-cargo-art"/,
  /className="number-cargo-wagon"/,
  /className="number-cargo-load"/,
  /className="number-cargo-goal"/,
  /numberCargoControl\("undo","1こ もどす"/,
  /numberCargoControl\("confirm","しゅっぱつ！"/
]) assert.match(renderGame, fragment);
assert.doesNotMatch(renderGame, /(?:field|cargoField)\.setAttribute\("aria-hidden"/, "interactive cargo objects must remain exposed to assistive technology");

const cargoControl = extractFunction("numberCargoControl");
assert.match(cargoControl, /document\.createElement\("button"\)/, "cargo commands must be real buttons");
assert.match(cargoControl, /button\.type="button"/, "cargo commands must not inherit form submission");
assert.match(cargoControl, /bindTap\(button,\(\)=>onTap\(button\)\)/, "cargo commands must use the app's unified touch binding");

const updateGame = extractFunction("updateNumberCargoGame");
assert.match(updateGame, /const count=numberCargoPicked\.length/, "the visible cargo count must come from the selected-object array");
assert.match(updateGame, /root\.querySelectorAll\("\[data-cargo-index\]"\)/, "updates must reuse the original fixed target buttons");
assert.match(updateGame, /numberCargoPicked\.includes\(Number\([^)]*dataset\.cargoIndex\)\)/, "each target must reflect whether its index is already in the wagon");
assert.match(updateGame, /\.classList\.toggle\("is-picked",picked\)/, "picked targets must get an explicit visual state");
assert.match(updateGame, /\.setAttribute\("aria-pressed",picked\?"true":"false"\)/, "picked state must be announced semantically");
assert.match(updateGame, /\.disabled=answerLocked\|\|picked/, "picked targets must reject duplicate taps and lock during judging");
assert.match(updateGame, /goal\.hidden=!numberCargoGoalShown/, "the answer goal must stay hidden until help or a second miss");
assert.match(updateGame, /numberCargoGoalShown[\s\S]*?numberCargoAnswer\(\)/, "a revealed goal must show the exact answer count");
assert.match(updateGame, /undo\.disabled=answerLocked\|\|count<=0/, "undo must stop at an empty wagon and while judging");
assert.match(updateGame, /confirm\.disabled=answerLocked\|\|count<=0/, "an empty wagon must not be accidentally submitted");
assert.match(updateGame, /announce\(count\+"こ"\)/, "each changed cargo count must be announced once through the shared live region");
assert.doesNotMatch(updateGame, /number-cargo-field[\s\S]*?replaceChildren/, "count updates must not rebuild moving targets or shift their tap regions");

const collectCargo = extractFunction("collectNumberCargo");
assert.match(collectCargo, /index<0\|\|index>=numberCargoLimit\(\)/, "invalid cargo indices must be ignored");
assert.match(collectCargo, /numberCargoPicked\.includes\(index\)/, "one moving object must never be collected twice");
assert.match(collectCargo, /numberCargoPicked\.length>=numberCargoLimit\(\)/, "the wagon must never exceed the visible object pool");
assert.match(collectCargo, /numberCargoPicked\.push\(index\)/, "collecting must preserve object identity for undo");
assert.doesNotMatch(collectCargo, /submitNumberCargo|onPick/, "collecting the correct count must never auto-submit");

const undoCargo = extractFunction("undoNumberCargo");
assert.match(undoCargo, /numberCargoPicked\.pop\(\)/, "undo must return the most recently collected object first");
assert.doesNotMatch(undoCargo, /numberCargoPicked\s*=\s*\[\]/, "one undo action must not empty the whole wagon");

const submitCargo = extractFunction("submitNumberCargo");
assert.match(submitCargo, /numberCargoPicked\.length<=0/, "an empty wagon must not submit");
assert.match(submitCargo, /onPick\(button,\{ok:numberCargoPicked\.length===numberCargoAnswer\(\),mode:"number"\}\)/, "cargo answers must reuse the existing score and passenger flow");

const onPick = extractFunction("onPick");
const numberMissBranch = onPick.match(/if\(o\.mode==="number"\)\{[\s\S]*?\n  \}else/)?.[0] || "";
assert.match(numberMissBranch, /missInQ===1\)showNumberCargoHint\(false\)/, "the first miss must give only a more-or-less direction");
assert.match(numberMissBranch, /missInQ>=2\)showNumberCargoHint\(true\)/, "the second miss must reveal the exact goal");
assert.doesNotMatch(numberMissBranch, /classList\.add\([^)]*"dim"|numberCargoPicked\s*=|resetNumberCargoGame/, "a wrong answer must keep every collected object editable");
assert.match(extractFunction("useHelp"), /if\(isNumberCargoQuestion\(\)\)\{[\s\S]*?numberCargoGoalShown=true;[\s\S]*?updateNumberCargoGame\(\)/, "an earned help item must reveal the cargo goal immediately");
assert.match(extractFunction("showHint"), /if\(isNumberCargoQuestion\(\)\)\{showNumberCargoHint\(false\);return;\}/, "the normal hint button must explain cargo play without exposing the answer on the first request");

for (const boundary of ["startJourneyAt", "openMap"]) {
  assert.match(extractFunction(boundary), /resetNumberCargoGame\(\);/, `${boundary}: leaving the activity must clear its state`);
}

const childCopy = [
  "のせた", "こ", "タップして のせる", "1こ もどす", "しゅっぱつ！",
  "もう すこし のせよう", "すこし もどしてみよう", "めざす"
].join("");
assert.doesNotMatch(childCopy, /[一-龯々〆ヵヶ]/, "cargo activity copy must remain kana-only");
assert.match(html, /id="choices"[^>]*aria-label="こたえ"/, "the existing answer region must remain labelled");
assert.match(css, /body\.st-number #fgT\{display:none\}/, "the floating nearest number foreground must remain removed");

const fieldCss = extractCssBlock(".number-cargo-field");
assert.match(fieldCss, /display:grid/, "the moving objects need stable grid cells");
assert.match(fieldCss, /overflow:hidden/, "visual drift must remain inside the activity field");
const targetCss = extractCssBlock(".number-cargo-target");
assert.match(targetCss, /min-width:(?:4[4-9]|5\d)px/, "object targets must remain at least 44px wide");
assert.match(targetCss, /min-height:(?:4[4-9]|5\d)px/, "object targets must remain at least 44px tall");
assert.doesNotMatch(targetCss, /animation:/, "the real target region must stay fixed while only its art drifts");
const artCss = extractCssBlock(".number-cargo-art");
assert.match(artCss, /animation:numberCargoDrift/, "themed object art should drift gently inside the fixed target");
assert.match(css, /@keyframes numberCargoDrift\{[^}]*transform:/, "cargo drift must use a composited transform");
const actionCss = extractCssBlock(".number-cargo-action");
assert.match(actionCss, /min-height:(?:4[4-9]|5\d)px/, "undo and confirm must remain child-sized touch targets");
assert.match(css, /@media \(orientation:landscape\) and \(max-height:360px\)\{[\s\S]*?\.number-cargo-game\{/, "740x320-class screens need an explicit compact cargo layout");
assert.match(css, /@media \(orientation:landscape\) and \(max-width:559px\) and \(max-height:360px\)\{[\s\S]*?\.number-cargo-field\{[^}]*grid-auto-rows:46px[\s\S]*?\.number-cargo-action\{[^}]*min-height:46px/, "490x317-class screens need a height-bounded three-row layout without shrinking touch targets");
assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?\.number-cargo-art[^}]*animation:none!important[\s\S]*?\.number-cargo-fly[^}]*animation:none!important/, "reduced motion must stop both ambient drift and fly-to-wagon motion");
assert.doesNotMatch(game + css, /numberJump|number-jump|ジャンプ！/, "the retired jump-counter implementation must not remain active or cached in CSS");

const actionContext = {
  Math,
  actionLog: [],
  updateLog: [],
  animationLog: [],
  toneLog: [],
  clamp(value, min, max) { return Math.max(min, Math.min(max, value)); },
  quiz: { classList: { contains: name => name === "show" } },
  STAGES: [{ id: "number" }],
  stg: 0,
  level: 2,
  cur: { a: ["2", "に"] },
  driving: false,
  answerLocked: false,
  updateNumberCargoGame(options) { actionContext.updateLog.push(options || null); },
  animateNumberCargoToWagon(button, index) { actionContext.animationLog.push({ button, index }); },
  tone(...args) { actionContext.toneLog.push(args); },
  announce() {},
  onPick(button, result) { actionContext.actionLog.push({ button, result }); }
};
vm.runInNewContext(`
  let numberCargoPicked=[],numberCargoGoalShown=false;
  ${extractFunction("isNumberCargoQuestion")}
  ${extractFunction("numberCargoLimit")}
  ${extractFunction("numberCargoAnswer")}
  ${collectCargo}
  ${undoCargo}
  ${submitCargo}
  this.__actions={
    collect:collectNumberCargo,
    undo:undoNumberCargo,
    submit:submitNumberCargo,
    picked:()=>numberCargoPicked.slice(),
    setPicked:value=>{numberCargoPicked=value.slice();}
  };
`, actionContext, { filename: "nazonazo-number-cargo-actions.js" });
const actions = actionContext.__actions;
actions.collect(-1, { id: "invalid-negative" });
actions.collect(12, { id: "invalid-high" });
assert.deepEqual(Array.from(actions.picked()), [], "invalid targets must not change the wagon");
actions.collect(4, { id: "cargo-4" });
actions.collect(4, { id: "cargo-4-again" });
actions.collect(1, { id: "cargo-1" });
assert.deepEqual(Array.from(actions.picked()), [4, 1], "two different taps must load two identified objects exactly once");
assert.equal(actionContext.updateLog.length, 2, "only successful collects should redraw the cargo state");
actions.undo();
assert.deepEqual(Array.from(actions.picked()), [4], "undo must return cargo index 1 before cargo index 4");
actions.setPicked([4, 1]);
actions.submit({ id: "confirm-correct" });
assert.deepEqual(JSON.parse(JSON.stringify(actionContext.actionLog.at(-1).result)), { ok: true, mode: "number" }, "two loaded objects must submit as the correct answer two");
actions.setPicked([4]);
actions.submit({ id: "confirm-wrong" });
assert.deepEqual(JSON.parse(JSON.stringify(actionContext.actionLog.at(-1).result)), { ok: false, mode: "number" }, "an intentionally wrong cargo count must use the normal number-mode retry path");
assert.deepEqual(Array.from(actions.picked()), [4], "submitting a wrong count must preserve the selected cargo");
actions.setPicked([]);
actions.submit({ id: "confirm-empty" });
assert.equal(actionContext.actionLog.length, 2, "an empty wagon must never reach the answer handler");
actions.setPicked([0, 1, 2, 3, 4, 5, 6, 7, 8]);
actions.collect(9, { id: "cargo-over-limit" });
assert.equal(actions.picked().length, 9, "hard mode must stop at nine loaded objects");

console.log("nazonazo number cargo regression: PASS");
