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

function mockStyle() {
  const values = new Map();
  return {
    setProperty(name, value) { values.set(name, value); },
    getPropertyValue(name) { return values.get(name) || ""; }
  };
}

function makeButton(ok) {
  return {
    disabled: false,
    dataset: { ok: ok ? "1" : "0" },
    classList: mockClassList(),
    style: mockStyle(),
    focus() {}
  };
}

function assertNoChildFacingKanji(source, label) {
  const literals = [...source.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map(match => match[2]);
  for (const literal of literals.filter(value => /[ぁ-んァ-ヶ一-龠々]/.test(value))) {
    assert.doesNotMatch(literal, /[一-龠々]/, `${label}: child-facing string contains kanji: ${literal}`);
  }
}

/* Full-screen semantic layer and large controls. */
const layerTag = /<div id="spaceGravityLayer"[^>]*>/.exec(html);
assert.ok(layerTag, "space gravity layer is missing");
assert.match(layerTag[0], /role="group"/);
assert.match(layerTag[0], /aria-labelledby="qText"/);
assert.match(layerTag[0], /\shidden(?:\s|>)/, "space gravity layer must start hidden");
assert.doesNotMatch(html, /id="spaceConstellationLayer"/, "the retired three-tap layer must not remain");

const layerRule = cssRule("#spaceGravityLayer");
assert.match(layerRule, /position\s*:\s*absolute/);
assert.match(layerRule, /inset\s*:\s*0/, "the gravity game must use the whole scene");
assert.match(layerRule, /pointer-events\s*:\s*none/);
assert.match(css, /#spaceGravityLayer\[hidden\]\s*\{[^}]*display\s*:\s*none!important/);
assert.match(css, /body\.space-gravity-active #veh,body\.space-gravity-active #cars\{opacity:0!important\}/,
  "the parked scene vehicle must not compete with the orbiting minigame rocket");
const boardRule = cssRule("\\.space-gravity-board");
assert.match(boardRule, /position\s*:\s*absolute/);
assert.match(boardRule, /inset\s*:\s*0/);
assert.match(boardRule, /overflow\s*:\s*hidden/);
const padRule = cssRule("\\.space-gravity-pad");
assert.match(padRule, /width\s*:\s*clamp\(88px,20vmin,130px\)/, "gravity pad needs a forgiving child target");
assert.match(padRule, /pointer-events\s*:\s*auto/);
assert.match(padRule, /touch-action\s*:\s*none/);
const portalRule = cssRule("\\.space-gravity-portal");
assert.match(portalRule, /width\s*:\s*clamp\(112px,20vw,174px\)/);
assert.match(portalRule, /min-height\s*:\s*clamp\(64px,16vh,96px\)/);
assert.match(portalRule, /pointer-events\s*:\s*auto/);
assert.match(css, /#choices\.space-mode\s*\{[^}]*display\s*:\s*none/);

/* The answer knowledge remains one correct plus one distractor. */
const questionOptions = extractFunction(game, "spaceQuestionOptions");
const optionSandbox = { shuffle: values => values.slice().reverse() };
vm.createContext(optionSandbox);
vm.runInContext(`${questionOptions};this.spaceQuestionOptions=spaceQuestionOptions;`, optionSandbox);
const options = optionSandbox.spaceQuestionOptions({
  a: ["✅", "せいかい"],
  d: [["1️⃣", "ひとつ"], ["2️⃣", "ふたつ"]]
});
assert.equal(options.length, 2);
assert.equal(options.filter(option => option.ok).length, 1);
assert.equal(options.filter(option => !option.ok).length, 1);

const renderSpace = extractFunction(game, "renderSpaceGravityGame");
assert.match(renderSpace, /spaceQuestionOptions\(cur\)/);
assert.match(game, /rocket:"\.\.\/assets\/images\/nazonazo-tunnel\/space_vehicle_exploration_rocket_pono_20260713\.png"/);
assert.match(renderSpace, /rocket\.src=ASSETS\.space\.rocket/);
assert.match(renderSpace, /button\.className="choice space-gravity-portal"/);
assert.match(renderSpace, /pad\.className="space-gravity-pad charge-0"/);
assert.match(renderSpace, /guide\.textContent=reduced\?"こたえを えらんで、まんなかを 3かい おそう！"/,
  "reduced motion must describe its actual three-press interaction");
assert.match(renderSpace, /finale\.className="space-constellation-bloom"/);
assert.match(renderSpace, /bindTap\(button,\(\)=>selectSpaceGravityTarget\(index\)\)/);
assert.match(renderSpace, /pointerdown",startSpaceGravityHold/);
assert.match(renderSpace, /pointerup",releaseSpaceGravityHold/);
assert.match(renderSpace, /pointercancel",cancelSpaceGravityHold/);
assert.match(renderSpace, /lostpointercapture",cancelSpaceGravityHold/);
assert.match(renderSpace, /click",handleSpaceGravityPadClick/,
  "the gravity pad must accept assistive-technology synthetic clicks");
assert.doesNotMatch(game, /SPACE_CONSTELLATION_PATTERNS|renderSpaceConstellationGame|space-node-star/,
  "the fixed three-tap constellation must be fully retired");

/* Hold/release: undercharge and an empty orbit window never submit an answer. */
const startHold = extractFunction(game, "startSpaceGravityHold");
const releaseHold = extractFunction(game, "releaseSpaceGravityHold");
const cancelHold = extractFunction(game, "cancelSpaceGravityHold");
const padClick = extractFunction(game, "handleSpaceGravityPadClick");
assert.match(startHold, /setPointerCapture/);
assert.match(releaseHold, /spaceGravityEnergy<\.5/);
assert.match(releaseHold, /const selected=spaceGravityOptions\[spaceGravityKeyboardTarget\],delta=spaceAngleDelta/,
  "touch release must grade only the portal the child selected");
assert.match(releaseHold, /if\(!entry\|\|entry\.button\.disabled\)/);
assert.match(cancelHold, /spaceGravityEnergy=0/);
assert.doesNotMatch(cancelHold, /resolveSpaceGravity|onPick/,
  "OS pointer cancellation must never become an answer");
assert.match(padClick, /event\.detail!==0/);
assert.match(padClick, /pulseSpaceGravityReduced\(\)/,
  "a synthetic click needs a deterministic no-hold power step");

const holdPad = {
  captured: [],
  released: [],
  setPointerCapture(id) { this.captured.push(id); },
  releasePointerCapture(id) { this.released.push(id); }
};
const holdOptions = [
  { button: makeButton(false), o: { ok: false, t: "ちがう" }, index: 0 },
  { button: makeButton(true), o: { ok: true, t: "せいかい" }, index: 1 }
];
const holdResolutions = [];
const holdSandbox = {
  options: holdOptions,
  Math,
  futureReducedMotion: () => false,
  spaceGravityPlayable: () => true,
  ensureAC() {},
  _nowMs: () => 1000,
  spaceGravityLayer: { querySelector: selector => selector === ".space-gravity-pad" ? holdPad : null },
  spaceGravityGuide() {},
  updateSpaceGravityVisual() {},
  tone() {},
  resolveSpaceGravity(entry) { holdResolutions.push(entry); }
};
vm.createContext(holdSandbox);
vm.runInContext(`
  const SPACE_GRAVITY_PORTAL_ANGLES=[-.72,.72];
  var spaceGravityOptions=this.options;
  var spaceGravityAngle=3.05;
  var spaceGravityHolding=false;
  var spaceGravityPointerId=null;
  var spaceGravityHoldStartedAt=0;
  var spaceGravityEnergy=0;
  var spaceGravityMisses=0;
  var spaceGravityAssisted=false;
  var spaceGravityKeyboardTarget=0;
  ${extractFunction(game, "spaceAngleDelta")}
  ${extractFunction(game, "spaceGravityWindow")}
  ${startHold}
  ${releaseHold}
  ${cancelHold}
  this.holdApi={
    start:startSpaceGravityHold,
    release:releaseSpaceGravityHold,
    cancel:cancelSpaceGravityHold,
    setEnergy:value=>{spaceGravityEnergy=value;},
    setAngle:value=>{spaceGravityAngle=value;},
    state:()=>({holding:spaceGravityHolding,pointer:spaceGravityPointerId,energy:spaceGravityEnergy,misses:spaceGravityMisses})
  };
`, holdSandbox);
const holdApi = holdSandbox.holdApi;
let prevented = 0;
const pointerEvent = id => ({
  button: 0,
  pointerId: id,
  preventDefault() { prevented += 1; }
});

holdApi.start(pointerEvent(7));
assert.deepEqual(holdPad.captured, [7]);
assert.equal(holdApi.state().holding, true);
holdApi.setEnergy(0.3);
holdApi.release(pointerEvent(7));
assert.equal(holdApi.state().holding, false);
assert.equal(holdApi.state().misses, 1, "undercharge is a motor retry, not a quiz answer");
assert.equal(holdResolutions.length, 0);

holdApi.start(pointerEvent(8));
holdApi.setEnergy(0.8);
holdApi.setAngle(3.05);
holdApi.release(pointerEvent(8));
assert.equal(holdApi.state().misses, 2, "empty space should widen/slow the next orbit without grading");
assert.equal(holdResolutions.length, 0, "empty release must not call the answer path");

holdApi.start(pointerEvent(9));
holdApi.setEnergy(0.9);
holdApi.cancel(pointerEvent(9));
assert.equal(holdApi.state().holding, false);
assert.equal(holdApi.state().pointer, null);
assert.equal(holdApi.state().energy, 0);
assert.equal(holdApi.state().misses, 2);
assert.equal(holdResolutions.length, 0, "pointer cancel must not resolve a portal");

holdApi.start(pointerEvent(10));
holdApi.setEnergy(0.8);
holdApi.setAngle(-0.72);
holdApi.release(pointerEvent(10));
assert.equal(holdResolutions.length, 1, "a charged release inside a portal window resolves once");
assert.equal(holdResolutions[0], holdOptions[0]);
assert.ok(prevented >= 8, "owned pointer events should suppress native behavior");

/* Wrong and correct portals each reach the common scoring path exactly once. */
const resolveSpace = extractFunction(game, "resolveSpaceGravity");
assert.match(resolveSpace, /onPick\(entry\.button,\{ok:entry\.o\.ok,mode:"space"\}\)/);
assert.match(resolveSpace, /portalRect\.left\+portalRect\.width\/2-rocketRect\.left-rocketRect\.width\/2/,
  "warp midpoint must pass through the selected portal");
assert.doesNotMatch(resolveSpace, /\b(?:addScore|proceed)\s*\(/,
  "space must not bypass the common answer/scoring path");

const guide = { textContent: "" };
const board = { classList: mockClassList() };
const rocket = { style: mockStyle() };
const trail = { classList: mockClassList(), style: mockStyle(), setAttribute() {} };
const stars = Array.from({ length: 5 }, () => ({ classList: mockClassList() }));
const wrongButton = makeButton(false);
const correctButton = makeButton(true);
const runtimeOptions = [
  { button: wrongButton, o: { ok: false, t: "ちがう" }, index: 0 },
  { button: correctButton, o: { ok: true, t: "せいかい" }, index: 1 }
];
const timers = [];
const picks = [];
let clearCalls = 0;
const resolutionSandbox = {
  options: runtimeOptions,
  spaceGravityPlayable: () => true,
  futureReducedMotion: () => false,
  isSpaceStage: () => true,
  quiz: { classList: { contains: name => name === "show" } },
  document: { body: { classList: mockClassList(["st-space", "space-gravity-active"]) } },
  spaceGravityLayer: {
    hidden: false,
    querySelector(selector) {
      if (selector === ".space-gravity-board") return board;
      if (selector === ".space-gravity-rocket") return rocket;
      if (selector === ".space-gravity-guide") return guide;
      if (selector === ".space-journey-trail") return trail;
      return null;
    },
    querySelectorAll(selector) { return selector === ".space-journey-star" ? stars : []; }
  },
  tone() {},
  confetti() {},
  clamp(value, min, max) { return Math.min(max, Math.max(min, value)); },
  _nowMs: () => 1000,
  updateSpaceGravityVisual() {},
  setTimeout(callback, delay) { timers.push({ callback, delay }); return timers.length; },
  clearTimeout() {},
  clearSpaceGravityGame() { clearCalls += 1; },
  onPick(button, result) {
    picks.push(result);
    if (!result.ok) {
      button.classList.add("ng", "dim");
      button.disabled = true;
    }
  }
};
vm.createContext(resolutionSandbox);
vm.runInContext(`
  const QN=5;
  var qSeg=1;
  var spaceGravityEpoch=0;
  var spaceGravityTimer=0;
  var spaceGravityResolving=false;
  var spaceGravityHolding=false;
  var spaceGravityEnergy=0;
  var spaceGravityKeyboardTarget=-1;
  var spaceGravityOptions=this.options;
  ${extractFunction(game, "spaceGravityGuide")}
  ${extractFunction(game, "updateSpaceJourneyTrail")}
  ${resolveSpace}
  this.resolveApi={
    resolve:resolveSpaceGravity,
    setQuestion:index=>{qSeg=index;},
    resolving:()=>spaceGravityResolving
  };
`, resolutionSandbox);

const resolveApi = resolutionSandbox.resolveApi;
resolveApi.resolve(runtimeOptions[0]);
assert.equal(picks.length, 0, "wrong portal waits for its rejection animation");
const wrongResolve = timers.shift();
assert.equal(wrongResolve.delay, 520);
wrongResolve.callback();
assert.equal(picks.length, 1);
assert.equal(picks[0].ok, false);
assert.equal(picks[0].mode, "space");
const wrongReturn = timers.shift();
assert.equal(wrongReturn.delay, 620);
wrongReturn.callback();
assert.equal(resolveApi.resolving(), false);
assert.equal(wrongButton.disabled, true);

resolveApi.resolve(runtimeOptions[1]);
const correctResolve = timers.shift();
assert.equal(correctResolve.delay, 520);
correctResolve.callback();
assert.equal(picks.length, 2);
assert.equal(picks[1].ok, true);
assert.equal(picks[1].mode, "space");
const correctCleanup = timers.shift();
assert.equal(correctCleanup.delay, 460);
correctCleanup.callback();
assert.equal(clearCalls, 1);
assert.equal(picks.map(result => result.ok).join(","), "false,true", "each graded portal submits exactly once");

/* Reduced motion is target selection plus exactly three static charge presses. */
const reducedResolutions = [];
const reducedGuide = { textContent: "" };
const reducedOptions = [
  { button: makeButton(false), o: { ok: false, t: "ちがう" }, index: 0 },
  { button: makeButton(true), o: { ok: true, t: "せいかい" }, index: 1 }
];
const reducedSandbox = {
  options: reducedOptions,
  spaceGravityPlayable: () => true,
  tone() {},
  updateSpaceGravityVisual() {},
  _nowMs: () => 0,
  spaceGravityLayer: { querySelector: () => reducedGuide },
  resolveSpaceGravity(entry) { reducedResolutions.push(entry); }
};
vm.createContext(reducedSandbox);
vm.runInContext(`
  var spaceGravityOptions=this.options;
  var spaceGravityKeyboardTarget=1;
  var spaceGravityEnergy=0;
  ${extractFunction(game, "spaceGravityGuide")}
  ${extractFunction(game, "pulseSpaceGravityReduced")}
  this.reducedApi={pulse:pulseSpaceGravityReduced,energy:()=>spaceGravityEnergy};
`, reducedSandbox);
reducedSandbox.reducedApi.pulse();
reducedSandbox.reducedApi.pulse();
assert.equal(reducedResolutions.length, 0);
assert.ok(Math.abs(reducedSandbox.reducedApi.energy() - 2 / 3) < 1e-9);
reducedSandbox.reducedApi.pulse();
assert.equal(reducedResolutions.length, 1, "third reduced-motion press resolves the selected target");
assert.equal(reducedResolutions[0], reducedOptions[1]);
assert.match(renderSpace, /futureReducedMotion\(\)\?"3かい おして じゅうりょくを ためる"/);

/* Keyboard: arrows choose knowledge target; Space or Enter keydown/up owns hold/release. */
const keyDown = extractFunction(game, "handleSpaceGravityKeyDown");
const keyUp = extractFunction(game, "handleSpaceGravityKeyUp");
assert.match(game, /window\.addEventListener\("keydown",handleSpaceGravityKeyDown\)/);
assert.match(game, /window\.addEventListener\("keyup",handleSpaceGravityKeyUp\)/);
let focused = "";
let startCalls = 0;
let releaseCalls = 0;
const keyOptions = [
  { button: { disabled: false, focus() { focused = "top"; } }, o: { t: "うえ" } },
  { button: { disabled: false, focus() { focused = "bottom"; } }, o: { t: "した" } }
];
const keySandbox = {
  options: keyOptions,
  spaceGravityPlayable: () => true,
  updateSpaceGravityVisual() {},
  _nowMs: () => 0,
  spaceGravityGuide() {},
  startSpaceGravityHold() { startCalls += 1; keySandbox.spaceGravityHolding = true; },
  releaseSpaceGravityHold() { releaseCalls += 1; keySandbox.spaceGravityHolding = false; }
};
vm.createContext(keySandbox);
vm.runInContext(`
  var spaceGravityOptions=this.options;
  var spaceGravityKeyboardTarget=-1;
  var spaceGravityHolding=false;
  ${keyDown}
  ${keyUp}
  this.keyApi={down:handleSpaceGravityKeyDown,up:handleSpaceGravityKeyUp,target:()=>spaceGravityKeyboardTarget};
`, keySandbox);
const plainTarget = { closest: () => null, matches: () => false };
let keyPrevented = 0;
keySandbox.keyApi.down({ key: "ArrowDown", code: "ArrowDown", defaultPrevented: false, repeat: false, target: plainTarget, preventDefault() { keyPrevented += 1; } });
assert.equal(keySandbox.keyApi.target(), 1);
assert.equal(focused, "bottom");
keySandbox.keyApi.down({ key: " ", code: "Space", defaultPrevented: false, repeat: false, target: plainTarget, preventDefault() { keyPrevented += 1; } });
assert.equal(startCalls, 1);
keySandbox.keyApi.up({ key: " ", code: "Space", target: plainTarget, preventDefault() { keyPrevented += 1; } });
assert.equal(releaseCalls, 1);
keySandbox.keyApi.down({ key: "Enter", code: "Enter", defaultPrevented: false, repeat: false, target: plainTarget, preventDefault() { keyPrevented += 1; } });
keySandbox.keyApi.up({ key: "Enter", code: "Enter", target: plainTarget, preventDefault() { keyPrevented += 1; } });
assert.equal(startCalls, 2);
assert.equal(releaseCalls, 2);
assert.equal(keyPrevented, 5);

/* Help removes the wrong portal, highlights correct, and expands capture width. */
const activeChoice = extractFunction(game, "activeChoiceButtons");
const useHelp = extractFunction(game, "useHelp");
const assist = extractFunction(game, "assistSpaceGravityGame");
assert.match(activeChoice, /space-gravity-active/);
assert.match(activeChoice, /querySelectorAll\("\.space-gravity-portal"\)/);
assert.match(useHelp, /if\(isSpaceStage\(\)\)assistSpaceGravityGame\(\)/);
const helpBoard = { classList: mockClassList() };
const helpOptions = [
  { button: makeButton(false), o: { ok: false }, index: 0 },
  { button: makeButton(true), o: { ok: true }, index: 1 }
];
const helpSandbox = {
  options: helpOptions,
  spaceGravityLayer: {
    hidden: false,
    querySelector: selector => selector === ".space-gravity-board" ? helpBoard : null
  },
  spaceGravityGuide() {},
  updateSpaceGravityVisual() {},
  _nowMs: () => 0
};
vm.createContext(helpSandbox);
vm.runInContext(`
  var spaceGravityOptions=this.options;
  var spaceGravityAssisted=false;
  var spaceGravityMisses=0;
  var spaceGravityKeyboardTarget=-1;
  ${extractFunction(game, "spaceGravityWindow")}
  ${assist}
  this.helpApi={assist:assistSpaceGravityGame,width:spaceGravityWindow,target:()=>spaceGravityKeyboardTarget};
`, helpSandbox);
const baseWindow = helpSandbox.helpApi.width();
helpSandbox.helpApi.assist();
assert.equal(helpOptions[0].button.disabled, true);
assert.equal(helpOptions[0].button.classList.contains("dim"), true);
assert.equal(helpOptions[1].button.classList.contains("glow"), true);
assert.equal(helpSandbox.helpApi.target(), 1);
assert.ok(helpSandbox.helpApi.width() > baseWindow, "help must widen the correct capture window");
assert.equal(helpBoard.classList.contains("is-assisted"), true);

/* qSeg paints a five-question constellation; only the fifth answer completes it. */
const constellationBoard = { classList: mockClassList() };
const trailSandbox = {
  QN: 5,
  clamp(value, min, max) { return Math.min(max, Math.max(min, value)); },
  spaceGravityLayer: {
    querySelectorAll: selector => selector === ".space-journey-star" ? stars : [],
    querySelector: selector => selector === ".space-journey-trail" ? trail : (selector === ".space-gravity-board" ? constellationBoard : null)
  }
};
vm.createContext(trailSandbox);
vm.runInContext(`${extractFunction(game, "updateSpaceJourneyTrail")};this.update=updateSpaceJourneyTrail;`, trailSandbox);
stars.forEach(star => star.classList.remove("is-on"));
trail.classList.remove("is-complete");
trailSandbox.update(4);
assert.equal(stars.filter(star => star.classList.contains("is-on")).length, 4);
assert.equal(trail.classList.contains("is-complete"), false);
assert.equal(trail.style.getPropertyValue("--trail-fill"), "80%");
trailSandbox.update(5);
assert.equal(stars.filter(star => star.classList.contains("is-on")).length, 5);
assert.equal(trail.classList.contains("is-complete"), true);
assert.equal(trail.style.getPropertyValue("--trail-fill"), "100%");
assert.equal(constellationBoard.classList.contains("is-constellation-complete"), true);
assert.match(resolveSpace, /updateSpaceJourneyTrail\(qSeg\+1\)/);
assert.match(resolveSpace, /qSeg===QN-1\?"おおきな せいざが できた！":"じゅうりょく ブースト！"/);
assert.match(renderSpace, /for\(let index=0;index<QN;index\+\+\)/);

/* Cleanup cancels pending work and every route out of the question clears state. */
const clearSpace = extractFunction(game, "clearSpaceGravityGame");
assert.match(clearSpace, /spaceGravityEpoch\+\+/);
assert.match(clearSpace, /clearTimeout\(spaceGravityTimer\)/);
assert.match(clearSpace, /releasePointerCapture/);
assert.match(clearSpace, /spaceGravityHolding=false/);
assert.match(clearSpace, /spaceGravityPointerId=null/);
assert.match(clearSpace, /spaceGravityEnergy=0/);
assert.match(clearSpace, /spaceGravityLayer\.replaceChildren\(\);spaceGravityLayer\.hidden=true/);

const showQuiz = extractFunction(game, "showQuiz");
assert.match(showQuiz, /clearSpaceGravityGame\(\)/);
assert.match(showQuiz, /else if\(isSpaceStage\(\)\)renderSpaceGravityGame\(\)/);
const onPick = extractFunction(game, "onPick");
assert.match(onPick, /classList\.contains\("space-gravity-portal"\)\)el\.disabled=true/);
for (const lifecycle of ["startJourneyAt", "ending", "openMap", "nazonazoAdminPreviewArm"]) {
  assert.match(extractFunction(game, lifecycle), /clearSpaceGravityGame\(\)/, `${lifecycle}: gravity state must be cleared`);
}

/* Motion preference and kana copy remain part of the child-facing contract. */
assert.match(css, /\.space-gravity-portal\.is-target\{[^}]*border-color:#9cecff/);
assert.match(css, /\.space-gravity-portal\.is-window\{[^}]*border-color:#fff18a/);
assert.doesNotMatch(css, /\.space-gravity-portal\.is-window,\.space-gravity-portal\.is-target/,
  "selected target and release window need distinct visual signals");
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.space-journey-trail,\.space-journey-star,\.space-gravity-pad,\.space-gravity-portal,\.space-gravity-rocket,\.space-constellation-bloom,\.vehicle-steer-shell\{animation:none!important;transition:none!important\}/);
const spaceCopy = game.slice(game.indexOf("function spaceQuestionOptions"), game.indexOf("function renderChoiceCards"));
assertNoChildFacingKanji(spaceCopy, "space gravity JS");

console.log("nazonazo space gravity regression: PASS");
