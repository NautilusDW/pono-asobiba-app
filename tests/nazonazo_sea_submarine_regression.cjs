#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const html = read("nazonazo-tunnel/index.html");
const css = read("nazonazo-tunnel/styles.css");
const js = read("nazonazo-tunnel/js/game.js");

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

function assertNoChildFacingKanji(source, label) {
  const literals = [...source.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map(match => match[2]);
  const visibleJapanese = literals.filter(value => /[ぁ-んァ-ヶ一-龠]/.test(value));
  for (const literal of visibleJapanese) {
    assert.doesNotMatch(literal, /[一-龠]/, `${label}: child-facing string contains kanji: ${literal}`);
  }
}

function optionBuilderUsedBy(renderBody) {
  if (/cur\.a/.test(renderBody) && /cur\.d/.test(renderBody)) return renderBody;
  const calls = [...renderBody.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map(match => match[1]);
  for (const name of calls) {
    if (["if", "for", "while", "switch", "function"].includes(name)) continue;
    try {
      const body = extractFunction(js, name);
      if (/cur\.a/.test(body) && /cur\.d/.test(body)) return body;
    } catch (_) {
      // Built-ins and DOM methods are intentionally ignored.
    }
  }
  assert.fail("sea answer renderer does not use the current question answer/distractors");
}

/* DOM/layering: steering is below the vehicle; semantic answer buttons live outside it. */
assert.match(
  html,
  /id="vehicleSteerShell"[^>]*class="vehicle-steer-shell"[^>]*>[\s\S]*?<div class="vbody">/,
  "a dedicated steering wrapper must contain .vbody so portal and idle transforms cannot overwrite steering"
);
assert.match(html, /id="seaSteerSurface"[^>]*aria-hidden="true"/, "the touch surface must remain decorative to assistive technology");
assert.match(html, /id="seaAnswerLayer"[^>]*(?:role="group"|aria-labelledby="qText")/, "the answer-bubble layer needs group/question semantics");

const steerShellCss = cssRule("\\.vehicle-steer-shell");
assert.match(steerShellCss, /translate3d\([^;]*var\(--sea-steer-y/, "steering wrapper must use transform-only Y motion");
assert.match(steerShellCss, /var\(--sea-steer-tilt/, "steering wrapper must expose a bounded tilt variable");
assert.doesNotMatch(steerShellCss, /(?:top|bottom|left|right)\s*:/, "steering wrapper must not animate layout coordinates");

const surfaceCss = cssRule("#seaSteerSurface");
assert.match(surfaceCss, /touch-action\s*:\s*none/, "touch steering must prevent browser gesture cancellation only on its own surface");
assert.match(surfaceCss, /pointer-events\s*:\s*none/, "steering surface must be inert by default");
assert.match(css, /body\.st-sea[^,{]*\.sea-steer-active[^,{]*#seaSteerSurface\s*\{[^}]*pointer-events\s*:\s*auto/, "only an active sea stage may expose the steering surface");
assert.match(css, /body\.st-sea[^,{]*#veh\s*\{[^}]*pointer-events\s*:\s*none/, "the submarine art must not steal input from the steering surface");

assert.match(css, /body\.st-sea\.v-sub #veh\s*\{[^}]*width\s*:\s*clamp\(118px,\s*19vw,\s*210px\)/, "travel submarine size must remain safe at 740x320");
assert.match(css, /body\.st-sea[^,{]*\.sea-quiz-active[^,{]*#veh\s*\{[^}]*width\s*:\s*clamp\(90px,\s*13vw,\s*126px\)/, "quiz submarine must shrink enough for three vertical lanes");

const bubbleCss = cssRule("\\.sea-answer-bubble");
const minimumWidths = [...bubbleCss.matchAll(/min-(?:width|height)\s*:\s*([\d.]+)px/g)].map(match => Number(match[1]));
assert.ok(minimumWidths.length >= 2 && minimumWidths.every(value => value >= 46), "answer bubbles need at least a 46px touch target in both dimensions");
assert.match(css, /#seaAnswerLayer\s*\{[^}]*pointer-events\s*:\s*none/, "empty parts of the answer layer must not block steering");
assert.match(css, /\.sea-answer-bubble\s*\{[^}]*pointer-events\s*:\s*auto/, "only real answer bubbles may receive direct taps");

/* Runtime wiring and input ownership. */
assert.match(js, /const[^;]*vehicleSteerShell=\$\("vehicleSteerShell"\)/, "steering wrapper DOM reference missing");
assert.match(js, /const[^;]*seaSteerSurface=\$\("seaSteerSurface"\)/, "steering surface DOM reference missing");
assert.match(js, /const[^;]*seaAnswerLayer=\$\("seaAnswerLayer"\)/, "sea answer-layer DOM reference missing");
assert.match(js, /vehicleSteerShell\.style\.setProperty\("--sea-steer-y"/, "JS must apply the same steering Y variable to the wrapper");
assert.match(js, /carsEl\.style\.setProperty\("--sea-steer-y"/, "passenger cars must follow the submarine vertically");

for (const eventName of ["pointerdown", "pointermove", "pointerup", "pointercancel"]) {
  assert.match(js, new RegExp(`seaSteerSurface\\.addEventListener\\("${eventName}"`), `steering surface is missing ${eventName}`);
}
assert.match(js, /seaSteerSurface\.setPointerCapture\(/, "touch steering must retain its active pointer while the finger drifts");
assert.match(js, /seaSteerSurface\.releasePointerCapture\(/, "touch steering must release capture cleanly");

const seaFunctionNames = [...js.matchAll(/function\s+([A-Za-z_$][\w$]*Sea[A-Za-z_$\w]*)\s*\(/g)].map(match => match[1]);
const inputFunctionNames = seaFunctionNames.filter(name => /(?:Steer|Pointer|Control|Motion|Target)/i.test(name));
assert.ok(inputFunctionNames.length >= 2, "sea steering needs explicit, testable input/motion functions");
for (const name of inputFunctionNames) {
  const body = extractFunction(js, name);
  assert.doesNotMatch(body, /(?:^|[;{}])\s*(?:worldX|vel|target)\s*(?:=|\+=|-=|\+\+|--)/m, `${name}: steering must not mutate forced-scroll progress`);
  assert.doesNotMatch(body, /\b(?:addScore|proceed|onPick)\s*\(/, `${name}: movement alone must not score or answer`);
}

/* Quiz integration reuses the established scoring/help/question path. */
const showQuizBody = extractFunction(js, "showQuiz");
const renderSeaBubbleBody = extractFunction(js, "renderSeaBubbleGame");
const launchSeaBubbleBody = extractFunction(js, "launchSeaBubbleChoice");
const nearestSeaBubbleBody = extractFunction(js, "nearestSeaBubble");
const activeChoiceBody = extractFunction(js, "activeChoiceButtons");
const useHelpBody = extractFunction(js, "useHelp");
const onPickBody = extractFunction(js, "onPick");

assert.match(showQuizBody, /renderSeaBubbleGame\(/, "sea questions must branch to the bubble minigame");
assert.match(showQuizBody, /(?:cancel|reset|clear)[A-Za-z_$]*Sea[A-Za-z_$]*\(/, "a fresh sea quiz must cancel the travel pointer before accepting an answer");
assert.match(renderSeaBubbleBody, /document\.createElement\("button"\)/, "each sea answer must be a real button");
assert.match(renderSeaBubbleBody, /sea-answer-bubble/, "sea answer button class missing");
assert.match(renderSeaBubbleBody, /dataset\.ok/, "sea answer correctness metadata missing");
assert.match(renderSeaBubbleBody, /bindTap\([^;]*launchSeaBubbleChoice/s, "direct tap/Enter must use the same bubble launch path");
assert.match(extractFunction(js, "handleSeaPointerUp"), /launchSeaBubbleChoice\(/, "releasing a deliberate steering gesture must launch the nearest answer bubble");
assert.match(nearestSeaBubbleBody, /vehicleSteerShell\.getBoundingClientRect\(\)/, "alignment must follow the submarine's rendered position, not jump ahead to the pointer target");
assert.doesNotMatch(nearestSeaBubbleBody, /steerTargetY/, "a quick tap must not answer before the submarine reaches the lane");

const optionBuilder = optionBuilderUsedBy(renderSeaBubbleBody);
assert.match(optionBuilder, /cur\.a/, "correct answer must come from the current question");
assert.match(optionBuilder, /cur\.d/, "distractors must come from the current question");
assert.match(optionBuilder, /shuffle\(/, "answer bubbles must not keep the correct answer in a fixed lane");
assert.match(optionBuilder, /level===0[\s\S]*?slice\(0,2\)/, "easy mode must show two bubbles while harder modes retain three");
assert.match(renderSeaBubbleBody, /opts\.length===2\?\[35,58\]:\[30,46,62\]/, "bubble lanes must clear the top HUD and bottom question panel at 740x320");

assert.match(launchSeaBubbleBody, /onPick\(/, "bubble collision must delegate to the existing scoring/boarding handler");
assert.doesNotMatch(launchSeaBubbleBody, /\b(?:addScore|SCORE_POINTS|qSeg\+\+|proceed)\b/, "sea bubble launch must not fork score or progression logic");
assert.match(launchSeaBubbleBody, /(?:launchPending|seaBubbleLaunchPending)/, "bubble dash needs a double-submit guard");
assert.match(launchSeaBubbleBody, /classList\.contains\("dim"\)/, "a dimmed wrong bubble must reject keyboard and synthesized activation");
assert.match(activeChoiceBody, /seaAnswerLayer/, "active choice lookup must include out-of-panel sea bubbles");
assert.match(activeChoiceBody, /choicesEl/, "active choice lookup must preserve ordinary cards and number gameplay");
assert.match(useHelpBody, /activeChoiceButtons\(\)/, "help must dim/glow sea bubbles through the common choice lookup");
assert.match(useHelpBody, /seaBubbleLaunchPending/, "help must not consume an item while the submarine is already dashing to an answer");
assert.match(onPickBody, /activeChoiceButtons\(\)/, "second-miss glow must include sea bubbles");
assert.match(onPickBody, /SCORE_POINTS\.correct/, "correct sea answers must retain the normal score path");

assert.match(js, /id:"sea"[\s\S]{0,180}veh:"sub"[\s\S]{0,180}bank:SEA[\s\S]{0,180}gens:\["legsS","sizeS"\]/, "sea question bank and generators must remain unchanged");
assertNoChildFacingKanji(renderSeaBubbleBody, "renderSeaBubbleGame");
assertNoChildFacingKanji(launchSeaBubbleBody, "launchSeaBubbleChoice");

/* Reset boundaries prevent stale drags/dashes leaking into another phase. */
for (const functionName of ["startJourneyAt", "beginStageTransit", "openMap", "ending"]) {
  const body = extractFunction(js, functionName);
  assert.match(body, /(?:clear|reset|cancel)[A-Za-z_$]*Sea[A-Za-z_$]*\(/, `${functionName}: stale sea interaction is not cleared`);
}

/* Reduced motion remains playable but removes autonomous/inertial motion. */
const buildSeaFishBody = extractFunction(js, "buildSeaFish");
const renderSeaFishBody = extractFunction(js, "renderSeaFish");
assert.match(buildSeaFishBody, /14/, "desktop sea should retain its full fish population");
assert.match(buildSeaFishBody, /10/, "iOS sea should cap its fish population");
assert.match(buildSeaFishBody, /6/, "reduced-motion sea should cap fish at six");
assert.match(renderSeaFishBody, /(?:prefers-reduced-motion|SeaReducedMotion|seaReducedMotion)/, "JS-driven fish need an explicit reduced-motion path");
assert.match(renderSeaFishBody, /(?:swim|bob)[^;=]*=\s*(?:reduced\s*\?\s*0|0\s*:\s*)/, "reduced motion must remove independent fish swim/bob offsets");
assert.match(js, /(?:SeaReducedMotion|seaReducedMotion)[\s\S]{0,900}(?:currentY|steerY)[\s\S]{0,240}(?:targetY|steerTargetY)/, "reduced motion must snap controlled Y position instead of adding inertia");
assert.match(launchSeaBubbleBody, /(?:SeaReducedMotion|seaReducedMotion|prefers-reduced-motion)/, "reduced motion must skip the answer dash");

const reducedCss = css.slice(css.indexOf("@media (prefers-reduced-motion:reduce)"));
assert.ok(reducedCss.length < css.length, "reduced-motion media query missing");
assert.match(reducedCss, /\.sea-answer-bubble[^,{]*[,{][^}]*animation\s*:\s*none\s*!important/, "answer-bubble pulse must stop in reduced motion");
assert.match(reducedCss, /\.vehicle-steer-shell[^,{]*[,{][^}]*transition\s*:\s*none\s*!important/, "controlled submarine must not coast in reduced motion");
assert.match(reducedCss, /body\.st-sea\.v-sub #veh \.vbody,body\.st-sea\.v-sub #veh \.submarine-art\{animation\s*:\s*none\s*!important\}/, "reduced motion must stop the submarine's autonomous drift and swim loops");

console.log("nazonazo sea submarine regression: OK");
