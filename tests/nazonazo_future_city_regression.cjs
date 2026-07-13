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

/* Existing opaque, looped Future City scenery must remain intact. */
assert.equal((html.match(/id="futureHorizonLoop"[\s\S]*?<\/div>/)?.[0].match(/class="future-loop-tile"/g) || []).length, 4);
assert.equal((html.match(/id="futureMidLoop"[\s\S]*?<\/div>/)?.[0].match(/class="future-loop-tile"/g) || []).length, 4);
assert.equal((html.match(/id="futureForegroundLoop"[\s\S]*?<\/div>/)?.[0].match(/class="future-loop-tile"/g) || []).length, 8);
assert.match(css, /body\.st-future #horizon\{[^}]*opacity:1[^}]*mask-image:none/);
assert.match(css, /body\.st-future #midT\{[^}]*opacity:1[^}]*mask-image:none/);
assert.match(css, /\.future-loop-tile:nth-child\(even\)::before\{transform:scaleX\(-1\)\}/);
for (const [name, value] of [["FUTURE_HORIZON_PARALLAX", ".10"], ["FUTURE_MID_PARALLAX", ".32"], ["FUTURE_FOREGROUND_PARALLAX", "1.12"]]) {
  assert.match(game, new RegExp(`${name}=${value.replace(".", "\\.")}`));
}

/* The former timing gate is gone; the whole screen is now a direct builder. */
assert.match(html, /id="futureBuilderLayer"[^>]*role="group"[^>]*aria-labelledby="qText"[^>]*hidden/);
assert.doesNotMatch(html, /id="futureMagnetLayer"|id="futureRailLayer"/);
assert.doesNotMatch(game, /FUTURE_MAGNET|futureMagnet|renderFutureRailGame|futureRailPointerMove/);
assert.doesNotMatch(css, /future-magnet|future-rail|#futureMagnetLayer|#futureRailLayer/);

const layerRule = cssRule("#futureBuilderLayer");
assert.match(layerRule, /position\s*:\s*fixed/);
assert.match(layerRule, /inset\s*:\s*0/);
assert.match(css, /#futureBuilderLayer\[hidden\]\{display:none!important\}/);
const boardRule = cssRule("\\.future-builder-board");
assert.match(boardRule, /position:absolute/);
assert.match(boardRule, /inset:0/);
const towerRule = cssRule("\\.future-builder-tower");
assert.match(towerRule, /width:38%/);
assert.match(towerRule, /height:56%/);
assert.match(towerRule, /z-index:9/);
assert.match(towerRule, /pointer-events:auto/);
assert.match(towerRule, /touch-action:none/);
assert.match(css, /body\.future-builder-active #veh,body\.future-builder-active #cars/);
assert.match(css, /#choices\.future-builder-mode,#choices\.space-galaxy-mode\{display:none\}/);

const optionFn = extractFunction(game, "futureQuestionOptions");
const optionSandbox = { shuffle: values => values.slice().reverse() };
vm.createContext(optionSandbox);
vm.runInContext(`${optionFn};this.futureQuestionOptions=futureQuestionOptions;`, optionSandbox);
const options = optionSandbox.futureQuestionOptions({ a: ["✅", "せいかい"], d: [["1️⃣", "ひとつ"], ["2️⃣", "ふたつ"]] });
assert.equal(options.length, 2);
assert.equal(options.filter(option => option.ok).length, 1);
assert.equal(options.filter(option => !option.ok).length, 1);

assert.match(game, /const FUTURE_BUILDER_STEPS=3;/);
assert.match(game, /const FUTURE_BUILDER_DRAG_RATIO=\[\.36,\.42,\.48\];/);
assert.match(game, /const FUTURE_BUILDER_FIRST_LOCK=\.28;/);
const renderBuilder = extractFunction(game, "renderFutureBuilderGame");
assert.match(renderBuilder, /futureQuestionOptions\(cur\)\.forEach/);
assert.match(renderBuilder, /className="choice future-builder-tower tower-"/);
assert.match(renderBuilder, /className="future-builder-segment segment-"/);
assert.match(renderBuilder, /className="future-builder-meter"/);
assert.match(renderBuilder, /setAttribute\("role","progressbar"\)/);
assert.match(renderBuilder, /pointerdown",event=>handleFutureBuilderPointerDown/);
assert.match(renderBuilder, /pointermove",event=>handleFutureBuilderPointerMove/);
assert.match(renderBuilder, /pointercancel",event=>finishFutureBuilderPointer\(event,index,true\)/);
assert.match(renderBuilder, /click",event=>handleFutureBuilderClick/);
assert.match(renderBuilder, /className="future-builder-history"/);
assert.match(renderBuilder, /className="future-builder-runner"/);
assert.match(renderBuilder, /className="future-builder-hologram"/);

const shouldLock = extractFunction(game, "futureBuilderShouldLock");
const lockSandbox = { FUTURE_BUILDER_FIRST_LOCK: .28 };
vm.createContext(lockSandbox);
vm.runInContext(`${shouldLock};this.futureBuilderShouldLock=futureBuilderShouldLock;`, lockSandbox);
assert.equal(lockSandbox.futureBuilderShouldLock(.279, 0), false, "a tentative pull below 28% must remain cancellable");
assert.equal(lockSandbox.futureBuilderShouldLock(.28, 0), true, "the first deliberate floor threshold must lock the chosen tower");
assert.equal(lockSandbox.futureBuilderShouldLock(0, 1 / 3), true, "an already committed floor must keep the same tower selected");

const pointerMove = extractFunction(game, "handleFutureBuilderPointerMove");
assert.match(pointerMove, /futureBuilderStartY-event\.clientY/);
assert.match(pointerMove, /FUTURE_BUILDER_DRAG_RATIO\[level\]/);
assert.match(pointerMove, /Math\.max\(entry\.committed,futureBuilderStartProgress\+distance\/travel\)/,
  "a pull must directly determine tower height without a timing window");
assert.match(pointerMove, /futureBuilderShouldLock\(entry\.progress,entry\.committed\)/);
const pointerFinish = extractFunction(game, "finishFutureBuilderPointer");
assert.match(pointerFinish, /if\(cancelled\)\{[\s\S]*updateFutureBuilderEntry\(entry,entry\.committed,\{silent:true\}\);[\s\S]*return;/,
  "pointer cancellation must not submit an answer");
assert.match(pointerFinish, /Math\.ceil\(entry\.progress\*FUTURE_BUILDER_STEPS-\.02\)\/FUTURE_BUILDER_STEPS/,
  "released towers must snap to one of three stable floors");
assert.match(pointerFinish, /if\(!futureBuilderShouldLock\(entry\.progress,entry\.committed\)\)/,
  "a short or downward pull must unlock both answers instead of trapping the child");
assert.match(pointerFinish, /if\(entry\.committed>=\.999\)resolveFutureBuilder\(entry\)/);

const tapStep = extractFunction(game, "stepFutureBuilder");
assert.match(tapStep, /futureBuilderTapQueue/,
  "rapid taps must be queued so all three floor latches remain visible");
const drainTap = extractFunction(game, "drainFutureBuilderTapQueue");
assert.match(drainTap, /entry\.committed\+1\/FUTURE_BUILDER_STEPS/,
  "a simple tap must be a drag-free one-floor alternative");
assert.match(drainTap, /futureReducedMotion\(\)\?90:220/);
const tapTimers = [];
const tapSandbox = {
  FUTURE_BUILDER_STEPS: 3,
  futureBuilderOptions: [{ button: { disabled: false }, committed: 0 }],
  futureBuilderTapIndex: -1,
  futureBuilderTapQueue: 0,
  futureBuilderTapAnimating: false,
  futureBuilderResolving: false,
  futureBuilderStepTimer: 0,
  futureBuilderPlayable: () => true,
  selectFutureBuilder: () => true,
  updateFutureBuilderEntry: (entry, progress) => { entry.committed = progress; },
  futureBuilderGuide: () => {},
  futureReducedMotion: () => false,
  setTimeout: callback => { tapTimers.push(callback); return tapTimers.length; },
  resolveCalls: 0
};
tapSandbox.resolveFutureBuilder = () => { tapSandbox.resolveCalls += 1; };
vm.createContext(tapSandbox);
vm.runInContext(`${drainTap};${tapStep};this.stepFutureBuilder=stepFutureBuilder;`, tapSandbox);
tapSandbox.stepFutureBuilder(0);
tapSandbox.stepFutureBuilder(0);
tapSandbox.stepFutureBuilder(0);
assert.equal(tapSandbox.futureBuilderOptions[0].committed, 1 / 3, "rapid taps must first show floor one");
assert.equal(tapSandbox.futureBuilderTapQueue, 2, "the remaining rapid taps must stay queued");
tapTimers.shift()();
assert.equal(tapSandbox.futureBuilderOptions[0].committed, 2 / 3, "the next latch must be shown on its own tick");
tapTimers.shift()();
assert.equal(tapSandbox.futureBuilderOptions[0].committed, 1, "the third latch must complete the building");
assert.equal(tapSandbox.resolveCalls, 1, "three queued taps must submit exactly once");
const autoStep = extractFunction(game, "autoCompleteFutureBuilder");
assert.match(autoStep, /futureBuilderAutoPlaying=true/);
assert.match(autoStep, /setTimeout\(raise,futureReducedMotion\(\)\?80:170\)/,
  "keyboard and assistive clicks must show the same three-floor cause and effect");

const resolve = extractFunction(game, "resolveFutureBuilder");
assert.match(resolve, /onPick\(entry\.button,\{ok:false,mode:"future"\}\)/);
assert.match(resolve, /onPick\(entry\.button,\{ok:true,mode:"future"\}\)/);
assert.match(resolve, /updateFutureBuilderHistory\(qSeg\+1\)/,
  "each answer must remain visible as a completed city building");
assert.match(resolve, /classList\.add\("is-city-awake"\)/);
assert.match(resolve, /classList\.add\("is-folding"\)[\s\S]*updateFutureBuilderEntry\(entry,0,\{silent:true\}\)[\s\S]*onPick\(entry\.button,\{ok:false,mode:"future"\}\)/,
  "the wrong tower must visibly fold before the shared miss flow dims it");
assert.match(resolve, /querySelector\("\.future-builder-hologram"\)/);
assert.match(resolve, /futureReducedMotion\(\)\?450:2600/,
  "the city wake-up payoff must stay visible long enough to read");
assert.match(css, /\.future-builder-board\.is-city-awake \.future-builder-skyline>i/);
assert.match(css, /\.future-builder-board\.is-city-awake \.future-builder-runner\{[^}]*futureBuilderLaunch/);

const help = extractFunction(game, "assistFutureBuilderGame");
assert.match(help, /wrong\.button\.disabled=true/);
assert.match(help, /correct\.committed=Math\.max\(correct\.committed,1\/FUTURE_BUILDER_STEPS\)/);
assert.doesNotMatch(help, /resolveFutureBuilder\(/, "help must reveal and prebuild, not auto-answer");

const clear = extractFunction(game, "clearFutureBuilderGame");
assert.match(clear, /futureBuilderEpoch\+\+;clearTimeout\(futureBuilderTimer\)/);
assert.match(clear, /futureBuilderPointerId=null/);
assert.match(clear, /futureBuilderLayer\.replaceChildren\(\);futureBuilderLayer\.hidden=true/);
for (const lifecycle of ["startJourneyAt", "showQuiz", "ending", "openMap", "nazonazoAdminPreviewArm"]) {
  assert.match(extractFunction(game, lifecycle), /clearFutureBuilderGame\(\)/, `${lifecycle}: builder state must be cleared`);
}
assert.match(extractFunction(game, "showQuiz"), /isFutureStage\(\)\)renderFutureBuilderGame\(\)/);
assert.match(extractFunction(game, "activeChoiceButtons"), /future-builder-active[\s\S]*future-builder-tower/);
assert.match(extractFunction(game, "onPick"), /classList\.contains\("future-builder-tower"\)/);
assert.match(extractFunction(game, "useHelp"), /futureBuilderPointerId!==null/,
  "help must not rewrite a tower while a drag is still captured");
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.future-builder-handle b,[\s\S]*animation:none!important/);
assert.match(css, /prefers-reduced-motion:reduce[\s\S]*\.future-builder-board\.is-city-awake \.future-builder-runner\{display:none!important\}/);

assertNoChildFacingKanji(renderBuilder, "renderFutureBuilderGame");
assertNoChildFacingKanji(resolve, "resolveFutureBuilder");

console.log("Nazonazo future builder regression checks passed.");
