#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

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

assert.match(game, /let numberJumpCount=0,numberJumpTargetShown=false;/, "number activity state must have explicit safe defaults");
assert.match(extractFunction("isNumberJumpQuestion"), /STAGES\[stg\]\.id==="number"/, "the mini-game must only replace choices in the number stage");
assert.match(extractFunction("numberJumpLimit"), /\[3,5,9\]\[level\]\|\|3/, "easy, normal, and hard tracks must stay short enough for their age bands");
assert.match(extractFunction("numberJumpAnswer"), /clamp\(Number\(cur&&cur\.a&&cur\.a\[0\]\)\|\|0,0,numberJumpLimit\(\)\)/, "the target answer must stay inside the visible track");

const showQuiz = extractFunction("showQuiz");
assert.match(showQuiz, /resetNumberJumpGame\(\);/, "every question must start with a clean jump count");
assert.match(showQuiz, /choicesEl\.replaceChildren\(\);/, "stale answer cards must be removed before rendering the activity");
assert.match(showQuiz, /if\(isNumberJumpQuestion\(\)\)renderNumberJumpGame\(\);else renderChoiceCards\(\);/, "only number questions should render the jump activity");
assert.match(extractFunction("renderChoiceCards"), /className="choice"/, "non-number stages must keep their normal answer cards");

const renderGame = extractFunction("renderNumberJumpGame");
for (const fragment of [
  /className="number-jump-game"/,
  /role","group"/,
  /aria-labelledby","qText"/,
  /role","status"/,
  /aria-live","polite"/,
  /className="number-jump-track"/,
  /for\(let i=0;i<=limit;i\+\+\)/,
  /runnerArt\.textContent="🐻"/,
  /numberJumpButton\("back","1こ もどす"/,
  /numberJumpButton\("jump","ジャンプ！"/,
  /numberJumpButton\("confirm","ここ！"/
]) assert.match(renderGame, fragment);

const numberButton = extractFunction("numberJumpButton");
assert.match(numberButton, /document\.createElement\("button"\)/, "all activity controls must be real buttons");
assert.match(numberButton, /button\.type="button"/, "activity controls must not inherit form submission");
assert.match(numberButton, /bindTap\(button,\(\)=>onTap\(button\)\)/, "activity controls must use the app's unified touch binding");

const updateGame = extractFunction("updateNumberJumpGame");
assert.match(updateGame, /step\.classList\.toggle\("is-target",numberJumpTargetShown&&value===numberJumpAnswer\(\)\)/, "help must light exactly the answer step");
assert.match(updateGame, /back\.disabled=answerLocked\|\|numberJumpCount<=0/, "back must stop at zero and while judging");
assert.match(updateGame, /jump\.disabled=answerLocked\|\|numberJumpCount>=numberJumpLimit\(\)/, "jump must stop at the end of the track");
assert.match(updateGame, /confirm\.disabled=answerLocked\|\|numberJumpCount<=0/, "zero must not be accidentally submitted");
assert.match(updateGame, /announce\(numberJumpCount\+"かい"\)/, "each jump count must be announced");

const changeJump = extractFunction("changeNumberJump");
assert.match(changeJump, /clamp\(numberJumpCount\+delta,0,numberJumpLimit\(\)\)/, "jump count must remain in the visible range");
assert.doesNotMatch(changeJump, /submitNumberJump|onPick/, "reaching a number must never auto-submit; the child confirms intentionally");
const submitJump = extractFunction("submitNumberJump");
assert.match(submitJump, /numberJumpCount<=0/, "empty activity must not submit");
assert.match(submitJump, /onPick\(button,\{ok:numberJumpCount===numberJumpAnswer\(\),mode:"number"\}\)/, "the activity must reuse the existing score and passenger flow");

const onPick = extractFunction("onPick");
assert.match(onPick, /if\(o\.mode==="number"\)\{[\s\S]*?missInQ===1\)showNumberJumpHint\(false\);[\s\S]*?missInQ>=2\)showNumberJumpHint\(true\);/, "a first miss needs direction and a second miss needs a visible target");
assert.doesNotMatch(onPick.match(/if\(o\.mode==="number"\)\{[\s\S]*?\n  \}else/)?.[0] || "", /classList\.add\([^)]*"dim"/, "a wrong count must remain editable rather than disabling the activity");
assert.match(extractFunction("useHelp"), /if\(isNumberJumpQuestion\(\)\)\{[\s\S]*?numberJumpTargetShown=true;[\s\S]*?updateNumberJumpGame\(\)/, "an earned help item must reveal the target inside the number activity");

for (const boundary of ["startJourneyAt", "openMap"]) {
  assert.match(extractFunction(boundary), /resetNumberJumpGame\(\);/, `${boundary}: leaving the activity must clear its state`);
}

const childCopy = ["いま", "かい", "1こ もどす", "ジャンプ！", "ここ！", "ジャンプで かずを つくる"].join("");
assert.doesNotMatch(childCopy, /[一-龯々〆ヵヶ]/, "number activity copy must remain kana-only");
assert.match(html, /id="choices"[^>]*aria-label="こたえ"/, "the existing answer region must remain labelled");
assert.match(css, /body\.st-number #fgT\{display:none\}/, "the floating nearest number foreground must be completely removed");
assert.match(css, /\.number-jump-runner\{[^}]*transform:translate3d\(calc\(var\(--jump-count\) \* 100%\),0,0\)/, "the runner must move with a composited transform");
assert.match(css, /\.number-jump-action\{[^}]*min-height:52px/, "activity controls must keep child-sized touch targets");
assert.match(css, /@media \(orientation:landscape\) and \(max-height:360px\)\{[\s\S]*?\.number-jump-action\{min-height:46px/, "short landscape screens need a compact but tappable activity layout");
assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?\.number-jump-runner\{transition:none!important\}[\s\S]*?\.number-jump-runner-art,\.number-jump-step\.is-target\{animation:none!important\}/, "reduced motion must remove both jumping and pulsing");

console.log("nazonazo number jump regression: PASS");
