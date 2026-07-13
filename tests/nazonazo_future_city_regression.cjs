#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const sharp = require("sharp");

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

assert.match(html, /styles\.css\?v=20260713-1281/);
assert.match(html, /js\/game\.js\?v=20260713-1281/);
assert.match(html, /id="futureMagnetLayer"[^>]*role="group"[^>]*aria-labelledby="qText"[^>]*hidden/);
assert.doesNotMatch(html, /id="futureRailLayer"/, "the obsolete one-branch rail layer must be removed");
assert.equal((html.match(/id="futureHorizonLoop"[\s\S]*?<\/div>/)?.[0].match(/class="future-loop-tile"/g) || []).length, 4);
assert.equal((html.match(/id="futureMidLoop"[\s\S]*?<\/div>/)?.[0].match(/class="future-loop-tile"/g) || []).length, 4);
assert.equal((html.match(/id="futureForegroundLoop"[\s\S]*?<\/div>/)?.[0].match(/class="future-loop-tile"/g) || []).length, 8);

assert.match(game, /future:\{[\s\S]{0,650}horizon:"\.\.\/assets\/images\/nazonazo-tunnel\/future_city_horizon_cutout_loop_20260712\.webp"/);
assert.match(game, /future:\{[\s\S]{0,650}mid:"\.\.\/assets\/images\/nazonazo-tunnel\/future_city_mid_cutout_loop_20260712\.webp"/);
assert.match(game, /future:\{[\s\S]{0,650}station:"\.\.\/assets\/images\/nazonazo-tunnel\/future_city_station_checkpoint_20260712\.webp"/);
assert.doesNotMatch(game, /future_city_(?:horizon|mid)_loop_long_20260707\.webp/, "the baked rectangular seams must not remain active");

const defaultSteer = cssRule("(?:^|\\n)\\.vehicle-steer-shell");
assert.match(defaultSteer, /transform\s*:\s*none/, "non-sea locomotives must ignore stale submarine offsets");
assert.doesNotMatch(defaultSteer, /--sea-steer-[xy]/);
const seaSteer = cssRule("body\\.st-sea \\.vehicle-steer-shell");
assert.match(seaSteer, /translate3d\([^;]*--sea-steer-x[^;]*--sea-steer-y/);
const adminArm = extractFunction(game, "nazonazoAdminPreviewArm");
assert.match(adminArm, /resetSeaInteraction\(\);clearFutureMagnetGame\(\);clearSpaceGravityGame\(\);/, "admin switching must clear every full-screen answer activity before repaint");

assert.match(css, /body\.st-future #horizon\{[^}]*opacity:1[^}]*mask-image:none/);
assert.match(css, /body\.st-future #midT\{[^}]*opacity:1[^}]*mask-image:none/);
assert.doesNotMatch(css, /body\.st-future #midT\{[^}]*opacity:\.94/);
assert.match(css, /\.future-loop-tile:nth-child\(even\)::before\{transform:scaleX\(-1\)\}/);
assert.doesNotMatch(css, /\.future-loop-tile:nth-child\(even\)\{[^}]*transform/, "mirror artwork, not the layout box");
assert.match(css, /#futureHorizonLoop\{bottom:17\.2vh;height:68vh\}/);
assert.match(css, /#futureMidLoop\{bottom:17\.2vh;height:56vh\}/);
assert.match(css, /body\.st-future \.tun\.station\.future-station\{[^}]*bottom:15\.2vh[^}]*aspect-ratio:2102\/492/);

for (const [name, value] of [
  ["FUTURE_HORIZON_PARALLAX", ".10"],
  ["FUTURE_MID_PARALLAX", ".32"],
  ["FUTURE_FOREGROUND_PARALLAX", "1.12"]
]) {
  assert.match(game, new RegExp(`${name}=${value.replace(".", "\\.")}`));
}
const render = extractFunction(game, "render");
assert.match(render, /st-future[\s\S]{0,800}FUTURE_HORIZON_PARALLAX/);
assert.match(render, /st-future[\s\S]{0,800}FUTURE_MID_PARALLAX/);
assert.match(render, /futureForegroundLoop[\s\S]{0,500}FUTURE_FOREGROUND_PARALLAX/);
assert.match(render, /const period=tileWidth\*2/);
assert.match(render, /%period\+period\)%period/, "future offsets must wrap instead of stopping");
assert.doesNotMatch(render.match(/st-future[\s\S]{0,900}futureHorizonLoop/)?.[0] || "", /clamp\([^)]*,0,70\)/, "future horizon must not use the old 70vw cap");

const questionOptions = extractFunction(game, "futureQuestionOptions");
const sandbox = { shuffle: values => values.slice().reverse() };
vm.createContext(sandbox);
vm.runInContext(`${questionOptions};this.futureQuestionOptions=futureQuestionOptions;`, sandbox);
const options = sandbox.futureQuestionOptions({
  a: ["✅", "せいかい"],
  d: [["1️⃣", "ひとつ"], ["2️⃣", "ふたつ"], ["3️⃣", "みっつ"]]
});
assert.equal(options.length, 2);
assert.equal(options.filter(option => option.ok).length, 1);
assert.equal(options.filter(option => !option.ok).length, 1);

assert.match(game, /const FUTURE_MAGNET_GOAL=3;/, "the city must require three successful captures");
assert.match(game, /const FUTURE_MAGNET_TRAVEL_MS=\[2200,1900,1650\];/, "each difficulty needs an explicit capsule pace");
assert.doesNotMatch(game, /FUTURE_RAIL_ROUTES|futureRailPointerMove|finishFutureRailRoute|renderFutureRailGame/, "the old traced fork must not remain callable");
assert.doesNotMatch(css, /\.future-rail-|#futureRailLayer/, "old rail-choice styling must not remain active");

const futureRender = extractFunction(game, "renderFutureMagnetGame");
assert.match(futureRender, /futureQuestionOptions\(cur\)/);
assert.match(futureRender, /futureMagnetOptions=futureQuestionOptions\(cur\)\.map/);
assert.match(futureRender, /className="future-magnet-board charge-0"/);
assert.match(futureRender, /className="future-magnet-meter"/);
assert.match(futureRender, /setAttribute\("role","progressbar"\)/);
assert.match(futureRender, /setAttribute\("aria-valuemax",String\(FUTURE_MAGNET_GOAL\)\)/);
assert.match(futureRender, /for\(let index=0;index<FUTURE_MAGNET_GOAL;index\+\+\)meter\.appendChild/);
assert.match(futureRender, /className="future-magnet-gate"/);
assert.match(futureRender, /bindTap\(gate,event=>activateFutureMagnet\(!!\(event&&event\.type==="click"&&event\.detail===0\)\)\)/,
  "assistive-technology click must use the nonvisual timing path");
assert.match(futureRender, /className="future-magnet-runner"/);

const activateFutureMagnet = extractFunction(game, "activateFutureMagnet");
assert.match(activateFutureMagnet, /inside=!!keyboardAssist\|\|futureReducedMotion\(\)/,
  "keyboard and assistive input must not require a visual timing window");
assert.match(activateFutureMagnet, /futureMagnetCharge=Math\.min\(FUTURE_MAGNET_GOAL,futureMagnetCharge\+1\)/);
assert.match(activateFutureMagnet, /futureMagnetCharge<FUTURE_MAGNET_GOAL/);
assert.match(activateFutureMagnet, /onPick\(token\.el,\{ok:true,mode:"future"\}\)/);
assert.match(activateFutureMagnet, /onPick\(token\.el,\{ok:false,mode:"future"\}\)/);
assert.match(activateFutureMagnet, /token\.el\.classList\.add\(token\.entry\.o\.ok\?"is-captured":"is-rejected"\)/);
assert.match(extractFunction(game, "spawnFutureMagnetToken"), /gate\.setAttribute\("aria-label","いまは "\+entry\.o\.t/,
  "the focused gate must announce which capsule is passing");
assert.match(extractFunction(game, "useHelp"), /futureMagnetResolving\|\|futureMagnetCharge>=FUTURE_MAGNET_GOAL/,
  "help items must not be consumed during the final capture flourish");

function makeClassList(initial = []) {
  const values = new Set(initial);
  return {
    values,
    add(...names) { names.forEach(name => values.add(name)); },
    remove(...names) { names.forEach(name => values.delete(name)); },
    toggle(name, force) {
      if (force === undefined ? !values.has(name) : force) values.add(name);
      else values.delete(name);
      return values.has(name);
    },
    contains(name) { return values.has(name); }
  };
}

function createMagnetActivationSandbox() {
  const timers = [];
  const picks = [];
  const energyUpdates = [];
  const board = { classList: makeClassList() };
  const gate = { classList: makeClassList(), offsetWidth: 120 };
  const bodyClasses = makeClassList();
  const context = {
    FUTURE_MAGNET_GOAL: 3,
    futureMagnetCharge: 0,
    futureMagnetToken: null,
    futureMagnetEpoch: 4,
    futureMagnetResolving: false,
    futureMagnetWrongLocked: false,
    futureMagnetAssisted: false,
    futureMagnetTimer: 0,
    futureMagnetNextAt: 0,
    futureMagnetPlayable: () => true,
    futureReducedMotion: () => true,
    ensureAC() {},
    futureMagnetGuide() {},
    tone() {},
    confetti() {},
    _nowMs: () => 1000,
    document: { body: { classList: bodyClasses } },
    futureMagnetLayer: {
      querySelector(selector) {
        if (selector === ".future-magnet-board") return board;
        if (selector === ".future-magnet-gate") return gate;
        return null;
      }
    },
    setTimeout(callback) { timers.push(callback); return timers.length; },
    removeFutureMagnetToken() { context.futureMagnetToken = null; },
    updateFutureMagnetEnergy() { energyUpdates.push(context.futureMagnetCharge); },
    onPick(_element, result) { picks.push({ ok: result.ok, mode: result.mode }); },
    clearFutureMagnetGame() { context.cleanupCalls += 1; },
    cleanupCalls: 0
  };
  vm.createContext(context);
  vm.runInContext(`${activateFutureMagnet};this.activateFutureMagnet=activateFutureMagnet;`, context);
  return { context, timers, picks, energyUpdates, board, gate, bodyClasses };
}

function setMagnetToken(context, ok) {
  const element = { classList: makeClassList() };
  context.futureMagnetToken = { progress: 0.5, entry: { o: { ok } }, el: element };
  return element;
}

const captureRun = createMagnetActivationSandbox();
for (let capture = 1; capture <= 3; capture += 1) {
  setMagnetToken(captureRun.context, true);
  captureRun.context.activateFutureMagnet();
  assert.equal(captureRun.context.futureMagnetCharge, capture, `capture ${capture} must add exactly one energy cell`);
  assert.equal(captureRun.energyUpdates.at(-1), capture, `capture ${capture} must refresh the progress meter`);
  if (capture < 3) {
    assert.deepEqual(captureRun.picks, [], "the answer must not resolve before all three cells are charged");
    const settle = captureRun.timers.shift();
    assert.equal(typeof settle, "function", "a non-final capture must schedule its reset");
    settle();
  }
}
assert.ok(captureRun.board.classList.contains("is-complete"), "the third capture must trigger the city-wide release");
assert.ok(captureRun.bodyClasses.contains("future-magnet-complete"), "the third capture must expose the completion state");
const resolveCorrect = captureRun.timers.shift();
assert.equal(typeof resolveCorrect, "function", "the final launch must defer answer resolution until its payoff is visible");
resolveCorrect();
assert.deepEqual(captureRun.picks, [{ ok: true, mode: "future" }], "three captures must resolve the quiz exactly once");
const finishCleanup = captureRun.timers.shift();
assert.equal(typeof finishCleanup, "function", "the completed activity must schedule cleanup");
finishCleanup();
assert.equal(captureRun.context.cleanupCalls, 1, "completion must clear the full-screen activity exactly once");

const wrongRun = createMagnetActivationSandbox();
wrongRun.context.futureMagnetCharge = 2;
const wrongElement = setMagnetToken(wrongRun.context, false);
wrongRun.context.activateFutureMagnet();
assert.equal(wrongRun.context.futureMagnetCharge, 2, "a rejected capsule must never erase stored energy");
assert.equal(wrongRun.energyUpdates.length, 0, "a rejected capsule must not rewrite the energy meter");
assert.ok(wrongRun.context.futureMagnetWrongLocked, "one wrong capture must suppress repeated wrong scoring");
assert.ok(wrongElement.classList.contains("is-rejected"), "a wrong capsule needs visible repulsion feedback");
assert.deepEqual(wrongRun.picks, [{ ok: false, mode: "future" }], "a wrong capture must enter the shared miss flow once");

const futureKeyHandler = extractFunction(game, "handleFutureMagnetKeyDown");
assert.match(futureKeyHandler, /event\.code!=="Space"/);
assert.match(futureKeyHandler, /event\.key!=="Enter"/);
assert.match(futureKeyHandler, /target\.matches\("button,a,input,select,textarea,\[contenteditable='true'\]"\)/, "answer keys must not hijack sound, help, or navigation controls");
const keyCalls = [];
const keySandbox = {
  futureMagnetPlayable: () => true,
  activateFutureMagnet() { keyCalls.push("activate"); }
};
vm.createContext(keySandbox);
vm.runInContext(`${futureKeyHandler};this.handleFutureMagnetKeyDown=handleFutureMagnetKeyDown;`, keySandbox);
let outsidePrevented = false;
keySandbox.handleFutureMagnetKeyDown({
  code: "Enter",
  key: "Enter",
  repeat: false,
  defaultPrevented: false,
  target: { closest: () => null, matches: selector => selector.startsWith("button") },
  preventDefault() { outsidePrevented = true; }
});
assert.equal(outsidePrevented, false, "Enter on help or sound controls must retain native activation");
assert.deepEqual(keyCalls, [], "Enter on controls outside the magnet must not trigger it");
let gatePrevented = false;
keySandbox.handleFutureMagnetKeyDown({
  code: "Space",
  key: " ",
  repeat: false,
  defaultPrevented: false,
  target: { closest: selector => selector === ".future-magnet-gate" ? {} : null, matches: () => true },
  preventDefault() { gatePrevented = true; }
});
assert.equal(gatePrevented, true, "Space on the magnet must suppress page scrolling");
assert.deepEqual(keyCalls, ["activate"], "Space must trigger exactly one magnet pulse");

assert.match(extractFunction(game, "showQuiz"), /isFutureStage\(\)\)renderFutureMagnetGame\(\)/);
assert.match(extractFunction(game, "activeChoiceButtons"), /future-magnet-active[\s\S]*future-magnet-capsule/);
assert.match(extractFunction(game, "useHelp"), /isFutureStage\(\)\)assistFutureMagnetGame\(\)/);
const assistFuture = extractFunction(game, "assistFutureMagnetGame");
assert.match(assistFuture, /futureMagnetAssisted=true;futureMagnetWrongLocked=true/);
assert.match(assistFuture, /futureMagnetToken&&!futureMagnetToken\.entry\.o\.ok/);
assert.match(assistFuture, /removeFutureMagnetToken\(\)/, "help must immediately remove a visible wrong capsule");
assert.match(extractFunction(game, "renderFutureMagnet"), /futureMagnetAssisted&&futureMagnetToken\.entry\.o\.ok\?1\.35:1/, "help must slow the correct capsule without auto-solving");
assert.match(extractFunction(game, "renderFutureMagnet"), /const progress=reduced\?0\.5:/, "reduced motion must park capsules at the capture gate");

const layerRule = cssRule("#futureMagnetLayer");
assert.match(layerRule, /position\s*:\s*absolute/);
assert.match(layerRule, /inset\s*:\s*0/, "the future activity must use the whole scene");
const boardRule = cssRule("\\.future-magnet-board");
assert.match(boardRule, /inset\s*:\s*0/, "the board must not collapse back into a small route card");
const gateRule = cssRule("\\.future-magnet-gate");
assert.match(gateRule, /width\s*:\s*clamp\(112px,23vmin,176px\)/);
assert.match(gateRule, /pointer-events\s*:\s*auto/);
assert.match(gateRule, /touch-action\s*:\s*manipulation/);
assert.match(css, /\.future-magnet-board\.charge-1[\s\S]*\.future-magnet-board\.charge-2[\s\S]*\.future-magnet-board\.charge-3/, "each stored cell must visibly brighten the city");
assert.match(css, /\.future-magnet-board\.is-complete \.future-magnet-runner[^{]*\{[^}]*futureLinearLaunch/, "the third cell must release a visible linear launch");
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.future-magnet-lane::before,\.future-magnet-lane::after,\.future-magnet-capsule,\.future-magnet-gate,\.future-magnet-runner,\.future-magnet-board::after\{animation:none!important;transition:none!important\}/);

const clearFuture = extractFunction(game, "clearFutureMagnetGame");
assert.match(clearFuture, /futureMagnetEpoch\+\+;clearTimeout\(futureMagnetTimer\)/, "cleanup must invalidate delayed captures");
assert.match(clearFuture, /futureMagnetCharge=0/);
assert.match(clearFuture, /futureMagnetToken=null/);
assert.match(clearFuture, /classList\.remove\("future-magnet-active","future-magnet-complete"\)/);
assert.match(clearFuture, /futureMagnetLayer\.replaceChildren\(\);futureMagnetLayer\.hidden=true/);
assert.match(extractFunction(game, "startJourneyAt"), /clearFutureMagnetGame\(\)/);
assert.match(extractFunction(game, "openMap"), /clearFutureMagnetGame\(\)/);

const cleanupClasses = makeClassList(["future-magnet-active", "future-magnet-complete"]);
const cleanupQuizClasses = makeClassList(["future-magnet-quiz"]);
const cleanupChoiceClasses = makeClassList(["future-mode"]);
let clearedTimer = null;
let replacedChildren = 0;
const cleanupSandbox = {
  futureMagnetEpoch: 9,
  futureMagnetTimer: 77,
  futureMagnetOptions: [{ o: {} }],
  futureMagnetCharge: 3,
  futureMagnetToken: { stale: true },
  futureMagnetTokenStartedAt: 12,
  futureMagnetNextAt: 44,
  futureMagnetSpawnCount: 8,
  futureMagnetResolving: true,
  futureMagnetWrongLocked: true,
  futureMagnetAssisted: true,
  clearTimeout(id) { clearedTimer = id; },
  document: { body: { classList: cleanupClasses } },
  quiz: { classList: cleanupQuizClasses },
  choicesEl: { classList: cleanupChoiceClasses, setAttribute(name, value) { this[name] = value; } },
  futureMagnetLayer: { hidden: false, replaceChildren() { replacedChildren += 1; } }
};
vm.createContext(cleanupSandbox);
vm.runInContext(`${clearFuture};this.clearFutureMagnetGame=clearFutureMagnetGame;`, cleanupSandbox);
cleanupSandbox.clearFutureMagnetGame();
assert.equal(clearedTimer, 77);
assert.equal(cleanupSandbox.futureMagnetEpoch, 10);
assert.equal(cleanupSandbox.futureMagnetCharge, 0);
assert.equal(cleanupSandbox.futureMagnetToken, null);
assert.equal(cleanupSandbox.futureMagnetResolving, false);
assert.equal(cleanupSandbox.futureMagnetAssisted, false);
assert.equal(cleanupSandbox.futureMagnetLayer.hidden, true);
assert.equal(replacedChildren, 1);
assert.equal(cleanupClasses.contains("future-magnet-active"), false);
assert.equal(cleanupQuizClasses.contains("future-magnet-quiz"), false);

const assets = [
  ["future_city_horizon_cutout_loop_20260712.webp", 2096, 594, 0.94],
  ["future_city_mid_cutout_loop_20260712.webp", 2136, 532, 0.94],
  ["future_city_station_checkpoint_20260712.webp", 2102, 492, 0.70]
];

(async () => {
  for (const [file, width, height, opaqueRatio] of assets) {
    const absolute = path.join(root, "assets/images/nazonazo-tunnel", file);
    assert.ok(fs.existsSync(absolute), `${file}: missing`);
    assert.ok(fs.statSync(absolute).size < 3 * 1024 * 1024, `${file}: exceeds 3MB`);
    const image = sharp(absolute);
    const metadata = await image.metadata();
    assert.equal(metadata.width, width, `${file}: unexpected width`);
    assert.equal(metadata.height, height, `${file}: unexpected height`);
    assert.equal(metadata.channels, 4, `${file}: alpha channel required`);
    const { data } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0;
    let opaque = 0;
    let partial = 0;
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] === 0) transparent += 1;
      else if (data[index] === 255) opaque += 1;
      else partial += 1;
    }
    assert.ok(transparent > 0, `${file}: background was not removed`);
    assert.ok(opaque / (opaque + partial) >= opaqueRatio, `${file}: painted subjects became too transparent`);
  }
  console.log("nazonazo future city regression: PASS");
})().catch(error => {
  console.error(error);
  process.exit(1);
});
