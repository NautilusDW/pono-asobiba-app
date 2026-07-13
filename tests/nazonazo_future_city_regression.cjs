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

/* Existing opaque, looped Future City scenery remains the stage foundation. */
assert.equal((html.match(/id="futureHorizonLoop"[\s\S]*?<\/div>/)?.[0].match(/class="future-loop-tile"/g) || []).length, 4);
assert.equal((html.match(/id="futureMidLoop"[\s\S]*?<\/div>/)?.[0].match(/class="future-loop-tile"/g) || []).length, 4);
assert.equal((html.match(/id="futureForegroundLoop"[\s\S]*?<\/div>/)?.[0].match(/class="future-loop-tile"/g) || []).length, 8);
assert.match(css, /body\.st-future #horizon\{[^}]*opacity:1[^}]*mask-image:none/);
assert.match(css, /body\.st-future #midT\{[^}]*opacity:1[^}]*mask-image:none/);
assert.match(css, /\.future-loop-tile:nth-child\(even\)::before\{transform:scaleX\(-1\)\}/);
for (const [name, value] of [["FUTURE_HORIZON_PARALLAX", ".10"], ["FUTURE_MID_PARALLAX", ".32"], ["FUTURE_FOREGROUND_PARALLAX", "1.12"]]) {
  assert.match(game, new RegExp(`${name}=${value.replace(".", "\\.")}`));
}

/* The answer is a stable, direct capsule choice; timing gates and the tower builder stay retired. */
assert.match(html, /id="futureCapsuleLayer"[^>]*role="group"[^>]*aria-labelledby="qText"[^>]*hidden/);
assert.doesNotMatch(html, /id="futureBuilderLayer"|id="futureMagnetLayer"|id="futureRailLayer"/);
assert.doesNotMatch(game, /FUTURE_BUILDER|[Ff]utureBuilder|FUTURE_MAGNET|[Ff]utureMagnet|renderFutureRailGame/);
assert.doesNotMatch(css, /future-builder|future-magnet|future-rail|#futureBuilderLayer|#futureMagnetLayer|#futureRailLayer/);

const layerRule = cssRule("#futureCapsuleLayer");
assert.match(layerRule, /position\s*:\s*fixed/);
assert.match(layerRule, /inset\s*:\s*0/);
assert.match(css, /#futureCapsuleLayer\[hidden\]\{display:none!important\}/);
const boardRule = cssRule("\\.future-capsule-board");
assert.match(boardRule, /position:absolute/);
assert.match(boardRule, /inset:0/);
const choiceRule = cssRule("\\.future-capsule-lane");
assert.match(choiceRule, /position:relative/);
assert.match(choiceRule, /width:100%/);
assert.match(choiceRule, /pointer-events:auto/);
assert.match(choiceRule, /touch-action:(?:manipulation|none)/);
assert.match(css, /body\.future-capsule-active #veh,body\.future-capsule-active #cars/);
assert.match(css, /#choices\.future-capsule-mode,#choices\.space-galaxy-mode\{display:none\}/);

const optionFn = extractFunction(game, "futureQuestionOptions");
const optionSandbox = { shuffle: values => values.slice().reverse() };
vm.createContext(optionSandbox);
vm.runInContext(`${optionFn};this.futureQuestionOptions=futureQuestionOptions;`, optionSandbox);
const options = optionSandbox.futureQuestionOptions({ a: ["✅", "せいかい"], d: [["1️⃣", "ひとつ"], ["2️⃣", "ふたつ"]] });
assert.equal(options.length, 2, "exactly two capsules must be shown together");
assert.equal(options.filter(option => option.ok).length, 1);
assert.equal(options.filter(option => !option.ok).length, 1);

assert.match(game, /const FUTURE_CAPSULE_TRAVEL_MS=\[[^\]]+\];/);
assert.match(game, /const FUTURE_CAPSULE_PULSE_MS=\d+;/);
const renderCapsule = extractFunction(game, "renderFutureCapsuleGame");
assert.match(renderCapsule, /futureQuestionOptions\(cur\)\.forEach/);
assert.match(renderCapsule, /className="choice future-capsule-lane/);
assert.match(renderCapsule, /className="future-capsule"/,
  "each stable lane must contain one moving visual capsule");
assert.match(renderCapsule, /button\.dataset\.ok=o\.ok\?"1":"0"/);
assert.match(renderCapsule, /button\.addEventListener\("click"|bindTap\(button/,
  "each visible capsule must be a stable direct choice, not a timing window");
assert.match(renderCapsule, /className="future-capsule-guide"/);
assert.match(renderCapsule, /className="future-capsule-energy"/);
assert.match(renderCapsule, /className="future-capsule-city"/);
assert.match(renderCapsule, /className="future-capsule-runner"/);
assert.doesNotMatch(renderCapsule, /requestAnimationFrame[\s\S]*(?:hitWindow|captureWindow|timing)/i,
  "rendering must not bring back a timing gate");

const selectCapsule = extractFunction(game, "selectFutureCapsule");
assert.match(selectCapsule, /futureCapsuleOptions\[index\]/);
assert.match(selectCapsule, /futureCapsuleSelectedIndex=index/);
assert.match(selectCapsule, /classList\.add\("is-(?:selected|captured|absorbing)"\)/,
  "the touched capsule must visibly travel to the center");
assert.doesNotMatch(selectCapsule, /getBoundingClientRect\(\)[\s\S]*(?:>=|<=)[\s\S]*window/,
  "a direct capsule tap must work regardless of its current animation position");

const resolveCapsule = extractFunction(game, "resolveFutureCapsule");
assert.match(resolveCapsule, /onPick\(entry\.button,\{ok:false,mode:"future"\}\)/,
  "a wrong capsule must enter the shared miss flow exactly once");
assert.equal((resolveCapsule.match(/onPick\(entry\.button,\{ok:false,mode:"future"\}\)/g) || []).length, 1,
  "one wrong tap must never be scored twice");
assert.match(resolveCapsule, /futureCapsuleEnergy(?:\+\+|\+=1|=pulse)/,
  "a correct capsule must charge the city automatically");
assert.match(resolveCapsule, /futureCapsuleEnergy[^\n]{0,120}3|pulse[^\n]{0,120}3/i,
  "the correct capture must produce three automatic energy pulses");
assert.match(resolveCapsule, /classList\.add\("is-(?:complete|city-awake)"\)/,
  "three pulses must visibly wake the city and launch the linear");
assert.match(resolveCapsule, /updateFutureCapsuleHistory\(qSeg\+1\)/);
assert.match(resolveCapsule, /onPick\(entry\.button,\{ok:true,mode:"future"\}\)/);
assert.match(resolveCapsule, /futureCapsuleEpoch/,
  "delayed capture pulses must be invalidated when the screen is left");

const updateCapsule = extractFunction(game, "updateFutureCapsuleVisual");
assert.match(updateCapsule, /futureCapsuleOptions/);
assert.match(updateCapsule, /futureCapsuleStartedAt/);
assert.match(updateCapsule, /FUTURE_CAPSULE_TRAVEL_MS/);
assert.doesNotMatch(updateCapsule, /onPick|resolveFutureCapsule/,
  "visual motion alone must never submit an answer");

const help = extractFunction(game, "assistFutureCapsuleGame");
assert.match(help, /wrong\.button\.disabled=true/);
assert.match(help, /correct\.button\.classList\.add\("glow"\)/);
assert.doesNotMatch(help, /selectFutureCapsule\(|resolveFutureCapsule\(|onPick\(/,
  "help may reveal the correct moving capsule but must not answer it");

const clear = extractFunction(game, "clearFutureCapsuleGame");
assert.match(clear, /futureCapsuleEpoch\+\+/);
assert.match(clear, /futureCapsuleTimers\.forEach\(clearTimeout\)/);
assert.match(clear, /futureCapsuleTimers\.clear\(\)/);
assert.match(clear, /futureCapsuleSelectedIndex=-1/);
assert.match(clear, /futureCapsuleLayer\.replaceChildren\(\);futureCapsuleLayer\.hidden=true/);
for (const lifecycle of ["startJourneyAt", "showQuiz", "ending", "openMap", "nazonazoAdminPreviewArm"]) {
  assert.match(extractFunction(game, lifecycle), /clearFutureCapsuleGame\(\)/, `${lifecycle}: capsule state must be cleared`);
}
assert.match(extractFunction(game, "showQuiz"), /isFutureStage\(\)\)renderFutureCapsuleGame\(\)/);
assert.match(extractFunction(game, "activeChoiceButtons"), /future-capsule-active[\s\S]*future-capsule-lane/);
assert.match(extractFunction(game, "onPick"), /classList\.contains\("future-capsule-lane"\)/);
assert.match(extractFunction(game, "useHelp"), /futureCapsuleResolving/,
  "help must not rewrite a capsule during its capture sequence");

/* Short landscape and reduced-motion retain both choices and a readable static payoff. */
assert.match(css, /@media [^{]*max-height:(?:360|480)px[^\{]*\{[\s\S]*\.future-capsule-lane/,
  "568x320 needs an explicit short-height capsule layout");
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.future-capsule-lane[\s\S]*animation:none!important/);
assert.match(css, /prefers-reduced-motion:reduce[\s\S]*\.future-capsule-board\.is-(?:complete|city-awake)[\s\S]*(?:opacity:1|display:none)/,
  "reduced motion must preserve a clear completed-city state");

assertNoChildFacingKanji(renderCapsule, "renderFutureCapsuleGame");
assertNoChildFacingKanji(selectCapsule, "selectFutureCapsule");
assertNoChildFacingKanji(resolveCapsule, "resolveFutureCapsule");

console.log("Nazonazo future capsule regression checks passed.");
