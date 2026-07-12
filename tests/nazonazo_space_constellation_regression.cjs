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

function cssRule(selectorPattern) {
  const match = new RegExp(`${selectorPattern}\\s*\\{([^}]+)\\}`).exec(css);
  assert.ok(match, `CSS rule missing: ${selectorPattern}`);
  return match[1];
}

function mockClassList(initial = []) {
  const values = new Set(initial);
  return {
    add(...names) { names.forEach(name => values.add(name)); },
    remove(...names) { names.forEach(name => values.delete(name)); },
    contains(name) { return values.has(name); },
    toggle(name, force) {
      const next = force === undefined ? !values.has(name) : Boolean(force);
      if (next) values.add(name);
      else values.delete(name);
      return next;
    }
  };
}

function assertNoChildFacingKanji(source, label) {
  const literals = [...source.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map(match => match[2]);
  for (const literal of literals.filter(value => /[ぁ-んァ-ヶ一-龠々]/.test(value))) {
    assert.doesNotMatch(literal, /[一-龠々]/, `${label}: child-facing string contains kanji: ${literal}`);
  }
}

/* Semantic layer and fixed touch geometry. */
const layerTag = /<div id="spaceConstellationLayer"[^>]*>/.exec(html);
assert.ok(layerTag, "space constellation layer is missing");
assert.match(layerTag[0], /role="group"/);
assert.match(layerTag[0], /aria-labelledby="qText"/);
assert.match(layerTag[0], /\shidden(?:\s|>)/, "space layer must start hidden outside a question");

const layerRule = cssRule("#spaceConstellationLayer");
assert.match(layerRule, /position\s*:\s*absolute/);
assert.match(layerRule, /inset\s*:\s*0/);
assert.match(layerRule, /pointer-events\s*:\s*none/, "only the constellation board should own pointer input");
assert.match(css, /#spaceConstellationLayer\[hidden\]\s*\{[^}]*display\s*:\s*none!important/);

const boardRule = cssRule("\\.space-constellation-board");
assert.match(boardRule, /top\s*:\s*11vh/);
assert.match(boardRule, /height\s*:\s*min\(50vh,300px\)/);
assert.match(boardRule, /pointer-events\s*:\s*auto/);
const nodeRule = cssRule("(?<!,)\\.space-node-star");
assert.match(nodeRule, /width\s*:\s*clamp\(58px,9vmin,72px\)/, "step stars need a large child touch target");
assert.match(css, /\.space-start-star,\.space-node-star\s*\{[^}]*aspect-ratio\s*:\s*1/);
const answerRule = cssRule("\\.space-answer-star");
assert.match(answerRule, /width\s*:\s*clamp\(110px,18vw,168px\)/);
assert.match(answerRule, /min-height\s*:\s*clamp\(64px,14vh,94px\)/);
assert.match(answerRule, /pointer-events\s*:\s*auto/);
assert.match(css, /#choices\.space-mode\s*\{[^}]*display\s*:\s*none/);
assert.match(css, /\.space-constellation-board\s*\{top:50px;height:52vh;border-radius:18px\}/,
  "short landscape screens need a compact board below the score HUD");

/* Every pattern is start + two shared taps; the third tap is an answer. */
const patternMatch = /const SPACE_CONSTELLATION_PATTERNS=(\[[\s\S]*?\]);\nlet spaceConstellationOptions/.exec(game);
assert.ok(patternMatch, "space constellation patterns are missing");
const patterns = vm.runInNewContext(patternMatch[1]);
assert.ok(patterns.length >= 2, "constellation shape should vary without random unsafe coordinates");
patterns.forEach((pattern, index) => {
  assert.equal(pattern.nodes.length, 2, `pattern ${index}: exactly two shared star taps are required`);
  for (const point of [pattern.start, ...pattern.nodes]) {
    assert.ok(point.x > 0 && point.x < 0.7, `pattern ${index}: stem point must stay left of answer buttons`);
    assert.ok(point.y > 0.15 && point.y < 0.85, `pattern ${index}: stem point must stay inside the board`);
  }
});

const questionOptions = extractFunction(game, "spaceQuestionOptions");
const optionSandbox = { shuffle: values => values.slice().reverse() };
vm.createContext(optionSandbox);
vm.runInContext(`${questionOptions};this.spaceQuestionOptions=spaceQuestionOptions;`, optionSandbox);
const options = optionSandbox.spaceQuestionOptions({
  a: ["✅", "せいかい"],
  d: [["1️⃣", "ひとつ"], ["2️⃣", "ふたつ"]]
});
assert.equal(options.length, 2, "space always needs one compact pair of answer stars");
assert.equal(options.filter(option => option.ok).length, 1);
assert.equal(options.filter(option => !option.ok).length, 1);

const renderSpace = extractFunction(game, "renderSpaceConstellationGame");
assert.match(renderSpace, /spaceQuestionOptions\(cur\)/);
assert.match(renderSpace, /spaceConstellationPattern\.nodes\.forEach/);
assert.match(renderSpace, /button\.className="space-node-star"/);
assert.match(renderSpace, /button\.className="choice space-answer-star"/);
assert.match(renderSpace, /bindTap\(button,event=>connectSpaceConstellationNode\(index,event\)\)/);
assert.match(renderSpace, /bindTap\(button,\(\)=>finishSpaceConstellation\(entry\)\)/);
assert.doesNotMatch(renderSpace, /pointermove|setPointerCapture|releasePointerCapture/,
  "space must stay a discrete three-tap game, not another tracing gesture");

const updateSpace = extractFunction(game, "updateSpaceConstellationVisual");
const connectSpace = extractFunction(game, "connectSpaceConstellationNode");
const finishSpace = extractFunction(game, "finishSpaceConstellation");
assert.match(connectSpace, /index!==spaceConstellationStep\|\|index>1/);
assert.match(connectSpace, /spaceConstellationStep=index\+1/);
assert.match(finishSpace, /spaceConstellationStep<2/);
assert.match(finishSpace, /onPick\(entry\.button,\{ok:entry\.o\.ok,mode:"space"\}\)/,
  "the final star must reuse common scoring, retry, and station progression");
assert.doesNotMatch(finishSpace, /\b(?:addScore|proceed)\s*\(/,
  "the space game must not bypass the common answer path");
assert.doesNotMatch(finishSpace, /spaceConstellationStep\s*=/,
  "answer resolution must preserve the two shared connections after a wrong answer");

/* Execute the actual state functions: two shared taps, wrong branch, then one-tap retry. */
const sharedLines = [0, 1].map(segment => ({ dataset: { segment: String(segment) }, classList: mockClassList() }));
const answerLines = [0, 1].map(index => ({ dataset: { answer: String(index) }, classList: mockClassList() }));
const nodes = [0, 1].map(() => ({ disabled: true, classList: mockClassList() }));
const guide = { textContent: "" };
const board = {
  classList: mockClassList(),
  querySelectorAll(selector) {
    if (selector === ".space-route-line[data-segment]") return sharedLines;
    if (selector === ".space-node-star") return nodes;
    return [];
  },
  querySelector(selector) {
    const answer = /data-answer="(\d)"/.exec(selector);
    return answer ? answerLines[Number(answer[1])] : null;
  }
};
function makeAnswer(ok) {
  return {
    disabled: true,
    dataset: { ok: ok ? "1" : "0" },
    classList: mockClassList(),
    focus() {}
  };
}
const wrongButton = makeAnswer(false);
const correctButton = makeAnswer(true);
const runtimeOptions = [
  { button: wrongButton, o: { ok: false }, index: 0 },
  { button: correctButton, o: { ok: true }, index: 1 }
];
const timers = [];
const picks = [];
let cleared = 0;
const runtimeSandbox = {
  options: runtimeOptions,
  Number,
  ensureAC() {},
  tone() {},
  futureReducedMotion: () => true,
  spaceConstellationPlayable: () => true,
  isSpaceStage: () => true,
  quiz: { classList: { contains: name => name === "show" } },
  spaceConstellationLayer: {
    hidden: false,
    querySelector(selector) {
      if (selector === ".space-constellation-board") return board;
      if (selector === ".space-constellation-guide") return guide;
      return null;
    }
  },
  document: { body: { classList: mockClassList(["st-space", "space-constellation-active"]) } },
  setTimeout(callback, delay) { timers.push({ callback, delay }); return timers.length; },
  clearTimeout() {},
  clearSpaceConstellationGame() { cleared += 1; },
  onPick(button, result) {
    picks.push(result);
    if (!result.ok) {
      button.classList.add("ng", "dim");
      button.disabled = true;
    }
  }
};
vm.createContext(runtimeSandbox);
vm.runInContext(`
  var spaceConstellationStep=0;
  var spaceConstellationResolving=false;
  var spaceConstellationTimer=0;
  var spaceConstellationOptions=this.options;
  ${extractFunction(game, "spaceConstellationGuide")}
  ${updateSpace}
  ${connectSpace}
  ${finishSpace}
  this.spaceApi={
    updateSpaceConstellationVisual,
    connectSpaceConstellationNode,
    finishSpaceConstellation,
    step:()=>spaceConstellationStep,
    resolving:()=>spaceConstellationResolving
  };
`, runtimeSandbox);

const api = runtimeSandbox.spaceApi;
api.updateSpaceConstellationVisual();
assert.equal(api.step(), 0);
assert.equal(nodes[0].disabled, false, "first shared star starts enabled");
assert.equal(nodes[1].disabled, true);
assert.equal(wrongButton.disabled, true);
assert.equal(correctButton.disabled, true);

api.connectSpaceConstellationNode(0, { detail: 1 });
assert.equal(api.step(), 1);
assert.equal(sharedLines[0].classList.contains("is-complete"), true);
assert.equal(sharedLines[1].classList.contains("is-complete"), false);
assert.equal(nodes[1].disabled, false, "second shared star becomes the only next action");

api.connectSpaceConstellationNode(1, { detail: 1 });
assert.equal(api.step(), 2);
assert.equal(sharedLines[0].classList.contains("is-complete"), true);
assert.equal(sharedLines[1].classList.contains("is-complete"), true);
assert.equal(wrongButton.disabled, false);
assert.equal(correctButton.disabled, false, "answer stars unlock only after two shared taps");

api.finishSpaceConstellation(runtimeOptions[0]);
assert.equal(api.step(), 2, "wrong answer must not erase the shared constellation stem");
assert.equal(answerLines[0].classList.contains("is-complete"), true, "selected branch lights before resolving");
const wrongResolve = timers.shift();
assert.equal(wrongResolve.delay, 30, "reduced motion uses the short static resolve path");
assert.equal(picks.length, 0);
wrongResolve.callback();
assert.equal(picks.at(-1).ok, false);
assert.equal(picks.at(-1).mode, "space");
const wrongCleanup = timers.shift();
assert.equal(wrongCleanup.delay, 600);
wrongCleanup.callback();
assert.equal(api.step(), 2);
assert.equal(sharedLines.every(line => line.classList.contains("is-complete")), true,
  "both shared lines remain connected for the retry");
assert.equal(wrongButton.disabled, true);
assert.equal(correctButton.disabled, false, "retry needs only the remaining answer tap");
assert.equal(answerLines[0].classList.contains("is-complete"), false, "only the wrong branch retracts");

api.finishSpaceConstellation(runtimeOptions[1]);
assert.equal(api.step(), 2);
assert.equal(answerLines[1].classList.contains("is-complete"), true);
const correctResolve = timers.shift();
correctResolve.callback();
assert.equal(picks.at(-1).ok, true);
assert.equal(picks.at(-1).mode, "space");
const correctCleanup = timers.shift();
correctCleanup.callback();
assert.equal(cleared, 1, "correct completion owns one cleanup");

/* Help uses only the two answer stars and leaves the shared node controls alone. */
const activeChoice = extractFunction(game, "activeChoiceButtons");
const useHelp = extractFunction(game, "useHelp");
assert.match(activeChoice, /space-constellation-active/);
assert.match(activeChoice, /querySelectorAll\("\.space-answer-star"\)/);
assert.match(useHelp, /const choices=activeChoiceButtons\(\)/);
assert.match(useHelp, /wrong\.classList\.add\("dim"\);wrong\.disabled=true/);
assert.match(useHelp, /ok\.classList\.add\("glow"\)/);

const helpWrong = makeAnswer(false);
const helpCorrect = makeAnswer(true);
const helpItems = [{ t: "おともだち" }];
const helpSandbox = {
  answerLocked: false,
  driving: false,
  seaBubbleLaunchPending: false,
  quiz: { classList: { contains: name => name === "show" } },
  isSeaStage: () => false,
  seaRoundPlayable: () => true,
  isNumberCargoQuestion: () => false,
  isFutureStage: () => false,
  helpItems,
  updateHelpHud() {},
  tone() {},
  showStamp() {},
  announce() {},
  seaAnswerLayer: null,
  futureRailLayer: null,
  spaceConstellationLayer: { querySelectorAll: () => [helpWrong, helpCorrect] },
  choicesEl: { querySelectorAll: () => [] },
  document: {
    body: {
      classList: {
        contains: name => name === "space-constellation-active"
      }
    }
  }
};
vm.createContext(helpSandbox);
vm.runInContext(`${activeChoice};${useHelp};this.useHelp=useHelp;`, helpSandbox);
helpSandbox.useHelp();
assert.equal(helpItems.length, 0);
assert.equal(helpWrong.disabled, true);
assert.equal(helpWrong.classList.contains("dim"), true);
assert.equal(helpCorrect.classList.contains("glow"), true);

/* Keyboard is scoped to answer stars; native Enter/Space clicks remain untouched. */
const keyHandler = extractFunction(game, "handleSpaceConstellationKeyDown");
assert.match(keyHandler, /spaceConstellationStep<2/);
assert.match(keyHandler, /event\.key!=="ArrowUp"&&event\.key!=="ArrowDown"/);
assert.match(keyHandler, /closest\("\.space-answer-star"\)/);
assert.match(keyHandler, /target\.matches\("button,a,input,select,textarea,\[contenteditable='true'\]"\)/);
assert.match(keyHandler, /focus\(\{preventScroll:true\}\)/);
assert.match(game, /window\.addEventListener\("keydown",handleSpaceConstellationKeyDown\)/);

let focused = "";
const keyOptions = [
  { button: { disabled: false, classList: mockClassList(), focus() { focused = "top"; } } },
  { button: { disabled: false, classList: mockClassList(), focus() { focused = "bottom"; } } }
];
const keySandbox = {
  spaceConstellationPlayable: () => true,
  spaceConstellationStep: 2,
  spaceConstellationOptions: keyOptions,
  spaceConstellationGuide() {}
};
vm.createContext(keySandbox);
vm.runInContext(`${keyHandler};this.handleSpaceConstellationKeyDown=handleSpaceConstellationKeyDown;`, keySandbox);
let prevented = false;
keySandbox.handleSpaceConstellationKeyDown({
  key: "ArrowDown",
  target: { closest: () => null, matches: () => true },
  preventDefault() { prevented = true; }
});
assert.equal(prevented, false, "arrow keys on help, sound, or navigation controls must stay native");
assert.equal(focused, "");
keySandbox.handleSpaceConstellationKeyDown({
  key: "ArrowDown",
  target: { closest: () => null, matches: () => false },
  preventDefault() { prevented = true; }
});
assert.equal(prevented, true);
assert.equal(focused, "bottom");

/* Motion preference, kana copy, dispatch, cleanup, and common wrong-answer handling. */
assert.match(finishSpace, /futureReducedMotion\(\)\?30:260/);
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.space-star-particle::before,\.space-route-line,\.space-node-star,\.space-constellation-board,\.vehicle-steer-shell\{animation:none!important;transition:none!important\}/);
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.space-answer-star\.glow,\.space-answer-star\.ng\{animation:none!important\}/);

const spaceCopy = game.slice(game.indexOf("function spaceQuestionOptions"), game.indexOf("function renderChoiceCards"));
assertNoChildFacingKanji(spaceCopy, "space constellation JS");
assertNoChildFacingKanji('.space-answer-star::after{content:"こたえの ほし"}.space-start-star::after{content:"スタート"}', "space constellation CSS");

const showQuiz = extractFunction(game, "showQuiz");
assert.match(showQuiz, /clearSpaceConstellationGame\(\)/);
assert.match(showQuiz, /else if\(isSpaceStage\(\)\)renderSpaceConstellationGame\(\)/);
const onPick = extractFunction(game, "onPick");
assert.match(onPick, /classList\.contains\("space-answer-star"\)\)el\.disabled=true/);
for (const lifecycle of ["startJourneyAt", "ending", "openMap", "nazonazoAdminPreviewArm"]) {
  assert.match(extractFunction(game, lifecycle), /clearSpaceConstellationGame\(\)/, `${lifecycle}: space state must be cleared`);
}

console.log("nazonazo space constellation regression: PASS");
