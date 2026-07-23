#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const original = Object.freeze({
  html: read("nazonazo-tunnel/index.html"),
  css: read("nazonazo-tunnel/styles.css"),
  game: read("nazonazo-tunnel/js/game.js")
});

function scanBalanced(source, openAt, openChar, closeChar) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openAt; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === openChar) depth += 1;
    else if (char === closeChar && --depth === 0) return index;
  }
  return -1;
}

function extractFunction(source, name) {
  const match = new RegExp(`function\\s+${name}\\s*\\(`).exec(source);
  if (!match) return "";
  const paramsAt = source.indexOf("(", match.index);
  const paramsEnd = scanBalanced(source, paramsAt, "(", ")");
  const bodyAt = source.indexOf("{", paramsEnd);
  const bodyEnd = scanBalanced(source, bodyAt, "{", "}");
  if (bodyAt < 0 || bodyEnd <= bodyAt) return "";
  return source.slice(match.index, bodyEnd + 1);
}

function extractElement(source, id) {
  const start = source.indexOf(`id="${id}"`);
  if (start < 0) return "";
  const tagAt = source.lastIndexOf("<", start);
  const tagMatch = /^<([a-z0-9-]+)/i.exec(source.slice(tagAt));
  if (!tagMatch) return "";
  const tag = tagMatch[1];
  if (["img", "input", "br", "hr", "meta", "link"].includes(tag.toLowerCase())) {
    const end = source.indexOf(">", start);
    return end >= 0 ? source.slice(tagAt, end + 1) : "";
  }
  const close = `</${tag}>`;
  const end = source.indexOf(close, start);
  return end >= 0 ? source.slice(tagAt, end + close.length) : "";
}

function extractRange(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  return start >= 0 && end > start ? source.slice(start, end) : "";
}

function numericConstant(source, name) {
  const match = new RegExp(`(?:const\\s+|,)${name}\\s*=\\s*([0-9.]+)`).exec(source);
  return match ? Number(match[1]) : NaN;
}

function childFacingLiterals(source) {
  return [...source.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)]
    .map(match => match[2])
    .filter(value => /[ぁ-んァ-ヶ一-龠々]/.test(value));
}

function compact(source) {
  return source.replace(/\s+/g, "");
}

function validate(candidate) {
  const errors = [];
  let checks = 0;
  const check = (condition, code, detail = "") => {
    checks += 1;
    if (!condition) errors.push(detail ? `${code}: ${detail}` : code);
  };
  const { html, css, game } = candidate;
  const htmlCompact = compact(html);
  const cssCompact = compact(css);

  const requiredIds = [
    "dinoApproachNotice",
    "dinoCraneBackdrop",
    "dinoCraneSuccessBackdrop",
    "dinoCraneBriefing",
    "dinoCraneBriefingTitle",
    "dinoCraneBriefingText",
    "dinoCraneStart",
    "dinoCraneContinue",
    "dinoWaterDinos",
    "dinoWaterSuccessScene",
    "dinoWaterBriefing",
    "dinoWaterBriefingTitle",
    "dinoWaterBriefingText",
    "dinoWaterStart",
    "dinoWaterContinue"
  ];
  for (const id of requiredIds) {
    check((html.match(new RegExp(`id=["']${id}["']`, "g")) || []).length === 1, "dom-contract", id);
  }

  const notice = extractElement(html, "dinoApproachNotice");
  const craneBriefing = extractElement(html, "dinoCraneBriefing");
  const waterBriefing = extractElement(html, "dinoWaterBriefing");
  const craneSection = extractRange(html, '<div id="dinoCraneGame"', '<div id="dinoWaterGame"');
  const waterSection = extractRange(html, '<div id="dinoWaterGame"', '<div id="dinoBossGame"');

  check(/role="status"/.test(notice) && /aria-live="assertive"/.test(notice) && /\shidden(?:\s|>)/.test(notice), "warning-a11y");
  check(/おや[？?]/.test(notice) && /まえで こどもの きょうりゅうが こまってる/.test(notice), "warning-copy");
  check(/\shidden(?:\s|>)/.test(craneBriefing) && /すみかの でぐちが ふさがってる/.test(craneBriefing) && /クレーンで どかして あげよう/.test(craneBriefing), "crane-briefing-copy");
  check(/\shidden(?:\s|>)/.test(waterBriefing) && /わきみずが いけまで とどかない/.test(waterBriefing) && /みずの みちを つなごう/.test(waterBriefing), "water-briefing-copy");
  for (const [id, label] of [["dinoCraneStart", "たすける"], ["dinoWaterStart", "みずを とどける"]]) {
    const button = extractElement(html, id);
    check(new RegExp(`<button[^>]*id="${id}"[^>]*type="button"`).test(button), "briefing-real-button", id);
    check(button.includes(label), "briefing-action-copy", id);
  }
  check(/<img[^>]*id="dinoCraneSuccessBackdrop"[^>]*aria-hidden="true"/.test(html), "crane-success-image");
  check(/<img[^>]*id="dinoWaterSuccessScene"[^>]*aria-hidden="true"/.test(html), "water-success-image");
  check(/id="dinoCraneContinue"[^>]*>しゅっぱつ<\/button>/.test(html), "crane-continue-copy");
  check(!/(?:みず|わきみず|いけ|みぞ)/.test(craneSection), "crane-water-separation", "crane HTML contains a water objective");
  check(/わきみず/.test(waterSection) && /いけ/.test(waterSection), "water-objective");

  for (const literal of childFacingLiterals(`${notice}\n${craneBriefing}\n${waterBriefing}`)) {
    check(!/[一-龠々]/.test(literal), "kana-ui", literal);
  }

  check(cssCompact.includes('#dinoAdventureLayer[data-phase="travel-warning"]{pointer-events:none'), "warning-nonblocking");
  check(/\.dino-approach-notice\[hidden\]\{display:none!important\}/.test(cssCompact), "warning-hidden");
  check(/\.dino-adventure-briefing\{/.test(css), "briefing-layout");
  check(/#dinoCraneStart|#dinoWaterStart|\.dino-adventure-briefing>button/.test(css) &&
    /min-height\s*:\s*(?:4[4-9]|[5-9]\d)px/.test(css), "briefing-touch-target");
  check(/\.dino-crane-game\.is-rescued\s+\.dino-crane-success-backdrop\{[^}]*opacity\s*:\s*1/.test(css), "crane-success-crossfade");
  check(/dino-crane-game(?::is\([^)]*(?:resolving|success)|\[data-phase=["'](?:resolving|success)["']\])[^}]*\s+(?:\.dino-crane-train|\.dino-crane-playfield)/.test(css) ||
    /dino-crane-game(?::is\([^)]*(?:resolving|success)|\[data-phase=["'](?:resolving|success)["']\])[^}]*\{[^}]*(?:opacity\s*:\s*0|visibility\s*:\s*hidden)/.test(css), "crane-success-reveal");
  check(/\.dino-water-game(?::is\([^)]*\.is-filling|\.is-filling)/.test(css) && /\.dino-water-success-scene/.test(css), "water-success-crossfade");
  check(/transition\s*:\s*opacity\s+\.7s/.test(css), "crossfade-duration");
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion:reduce)"));
  check(/dino-crane-backdrop/.test(reduced) && /dino-water-(?:dry-scene|success-scene)/.test(reduced) && /transition\s*:\s*none!important/.test(reduced), "reduced-motion");

  const requiredFunctions = [
    "maybeShowDinoCraneApproachWarning",
    "beginDinoCraneRescue",
    "commitDinoCraneSuccess",
    "finalizeDinoCraneSuccess",
    "beginDinoWaterPuzzle",
    "beginDinoWaterSuccess",
    "tickDinoWaterSuccess",
    "commitDinoWaterSuccess",
    "finishDinoCraneSuccess",
    "finishDinoWaterSuccess",
    "revealDinoCraneEvent",
    "revealDinoWaterEvent",
    "dinoAdventureDebugSnapshot"
  ];
  const functions = Object.fromEntries(requiredFunctions.map(name => [name, extractFunction(game, name)]));
  for (const [name, body] of Object.entries(functions)) check(Boolean(body), "runtime-function", name);

  check(numericConstant(game, "DINO_CRANE_WARNING_DISTANCE") >= 60 && numericConstant(game, "DINO_CRANE_WARNING_DISTANCE") <= 110, "warning-distance");
  check(numericConstant(game, "DINO_CRANE_RESCUE_CROSSFADE_MS") === 700, "crane-crossfade-timing");
  check(numericConstant(game, "DINO_WATER_FLOW_STEP_MS") >= 90 && numericConstant(game, "DINO_WATER_FLOW_STEP_MS") <= 180, "water-flow-timing");
  check(numericConstant(game, "DINO_WATER_CROSSFADE_MS") === 700, "water-crossfade-timing");
  for (const phase of ["travel-warning", "crane-briefing", "crane-resolving", "crane-success", "water-briefing", "resolve-water-flow", "resolve-water-crossfade", "resolve-water"]) {
    check(game.includes(`"${phase}"`) || game.includes(`'${phase}'`), "phase-contract", phase);
  }

  const warning = functions.maybeShowDinoCraneApproachWarning;
  check(/DINO_CRANE_WARNING_DISTANCE/.test(warning) && /dinoApproachNotice/.test(warning) && /travel-warning/.test(warning), "warning-trigger");
  const gameLoop = extractFunction(game, "gloop");
  check(gameLoop.indexOf("maybeShowDinoCraneApproachWarning") >= 0 &&
    gameLoop.indexOf("maybeShowDinoCraneApproachWarning") < gameLoop.indexOf("worldX>=target"), "warning-before-stop");

  const revealCrane = functions.revealDinoCraneEvent;
  check(/crane-briefing/.test(revealCrane) && /dinoCraneBriefing\.hidden=false/.test(revealCrane), "crane-briefing-hold");
  check(/resetDinoCraneAttempt\s*\(/.test(revealCrane) && /inputLocked=true/.test(revealCrane) &&
    /dinoCraneStart/.test(revealCrane), "crane-controls-gated");
  const startCrane = functions.beginDinoCraneRescue;
  check(/crane-briefing/.test(startCrane) && /dinoCraneBriefing\.hidden=true/.test(startCrane) &&
    /inputLocked=false/.test(startCrane) && /dinoCraneSetPhase\(["']ready["']\)/.test(startCrane), "crane-start-transaction");
  const movementAllowed = extractFunction(game, "dinoCraneMovementAllowed");
  check(/ready/.test(movementAllowed) && /carrying/.test(movementAllowed) && !/briefing/.test(movementAllowed), "crane-controls-disabled-before-start");

  const commitCrane = functions.commitDinoCraneSuccess;
  const finalizeCrane = functions.finalizeDinoCraneSuccess;
  check(/placedCount!==DINO_CRANE_CARGO_DEFS\.length/.test(commitCrane), "crane-all-cargo-gate");
  check(/dinoCraneSetPhase\(["']resolving["']\)/.test(commitCrane) && /dinoCraneSuccessBackdrop/.test(commitCrane) &&
    /is-rescued/.test(commitCrane) && /finalizeDinoCraneSuccess/.test(extractFunction(game, "tickDinoCrane")), "crane-rescue-resolution");
  check(/crane-success/.test(finalizeCrane) && /dinoCraneContinue\.hidden=false/.test(finalizeCrane), "crane-success-hold");
  check(!/finishDinoCraneSuccess\s*\(/.test(extractFunction(game, "tickDinoCrane")), "crane-no-auto-advance");

  const craneRuntime = [
    warning,
    revealCrane,
    startCrane,
    extractFunction(game, "finishDinoCraneAction"),
    extractFunction(game, "registerDinoCraneMiss"),
    extractFunction(game, "retryDinoCraneEvent"),
    commitCrane,
    finalizeCrane
  ].join("\n");
  for (const literal of childFacingLiterals(craneRuntime)) {
    check(!/(?:みず|わきみず|いけ|みぞ)/.test(literal), "crane-water-separation", literal);
  }

  const revealWater = functions.revealDinoWaterEvent;
  const startWater = functions.beginDinoWaterPuzzle;
  check(/water-briefing/.test(revealWater) && /dinoWaterBriefing\.hidden=false/.test(revealWater), "water-briefing-hold");
  check(/water-briefing/.test(startWater) && /dinoWaterBriefing\.hidden=true/.test(startWater) &&
    /inputLocked=false/.test(startWater) && /dinoAdventureSetPhase\(["']water["']\)/.test(startWater), "water-start-transaction");

  const beginFlow = functions.beginDinoWaterSuccess;
  const tickFlow = functions.tickDinoWaterSuccess;
  const commitWater = functions.commitDinoWaterSuccess;
  check(/resolve-water-flow/.test(beginFlow) && /flowQueue=\[\.\.\.water\.path\]/.test(beginFlow) &&
    /flowIndex=1/.test(beginFlow), "water-flow-start");
  check(/DINO_WATER_FLOW_STEP_MS/.test(tickFlow) && /resolve-water-crossfade/.test(tickFlow) && /DINO_WATER_CROSSFADE_MS/.test(tickFlow), "water-flow-order");
  check(/is-filling/.test(tickFlow) && /commitDinoWaterSuccess/.test(tickFlow), "water-crossfade-commit");
  check(/water\.completed=true/.test(commitWater) && /water\.waterCharges=DINO_BOSS_WATER_CHARGES/.test(commitWater) &&
    /dinoWaterContinue\.hidden=false/.test(commitWater), "water-success-hold");
  check(!/finishDinoWaterSuccess\s*\(/.test(extractFunction(game, "tickDinoAdventure")), "water-no-auto-advance");

  const stateFactory = extractFunction(game, "createDinoAdventureState");
  check(/warning/i.test(stateFactory) && /flow/i.test(stateFactory) && /crossfade/i.test(stateFactory), "story-state");
  const debug = functions.dinoAdventureDebugSnapshot;
  check(/noticeVisible|warning/i.test(debug) && /flow/i.test(debug) && /pond/i.test(debug), "debug-story-evidence");
  const resume = extractFunction(game, "resumeDinoAdventureInput");
  check(/water\.nextFlowAt/.test(resume) && /water\.crossfadeStartedAt/.test(resume) && /\+=delta/.test(resume), "resume-flow-clock");

  const reset = extractFunction(game, "resetDinoAdventure");
  check(/dinoApproachNotice\.hidden=true/.test(reset) && /dinoCraneBriefing\.hidden=true/.test(reset) &&
    /dinoWaterBriefing\.hidden=true/.test(reset) && /is-filling/.test(reset) && /is-rescued/.test(reset), "story-cleanup");

  check(new RegExp('bindTap\\(dinoCraneStart,[^\\n]*beginDinoCraneRescue').test(game), "crane-start-binding");
  check(new RegExp('bindTap\\(dinoWaterStart,[^\\n]*beginDinoWaterPuzzle').test(game), "water-start-binding");
  check(/bindTap\(dinoCraneContinue,[^\n]*finishDinoCraneSuccess/.test(game) &&
    /bindTap\(dinoWaterContinue,[^\n]*finishDinoWaterSuccess/.test(game), "continue-bindings");

  return { errors, checks };
}

function replaceExactlyOnce(source, from, to) {
  const count = source.split(from).length - 1;
  assert.equal(count, 1, `mutation anchor count for ${from}: ${count}`);
  return source.replace(from, to);
}

let mutationCount = 0;
function mutation(name, expectedCode, mutate) {
  mutationCount += 1;
  const candidate = mutate({ ...original });
  const result = validate(candidate);
  assert.ok(result.errors.some(error => error === expectedCode || error.startsWith(`${expectedCode}:`)),
    `${name}: mutation survived; errors=${result.errors.join(", ")}`);
}

const result = validate(original);
assert.equal(result.errors.length, 0, `dino rescue story contracts failed (${result.checks} checks):\n${result.errors.join("\n")}`);

mutation("approach notice is removed", "dom-contract", candidate => ({
  ...candidate,
  html: replaceExactlyOnce(candidate.html, 'id="dinoApproachNotice"', 'id="removedDinoApproachNotice"')
}));
mutation("warning begins only at the stopping point", "warning-distance", candidate => ({
  ...candidate,
  game: replaceExactlyOnce(candidate.game, "DINO_CRANE_WARNING_DISTANCE=82", "DINO_CRANE_WARNING_DISTANCE=0")
}));
mutation("crane briefing leaks the old water objective", "crane-water-separation", candidate => ({
  ...candidate,
  html: replaceExactlyOnce(candidate.html, "クレーンで どかして あげよう！", "どかして わきみずを だそう！")
}));
mutation("crane background skips its readable crossfade", "crane-crossfade-timing", candidate => ({
  ...candidate,
  game: replaceExactlyOnce(candidate.game, "DINO_CRANE_RESCUE_CROSSFADE_MS=700", "DINO_CRANE_RESCUE_CROSSFADE_MS=150")
}));
mutation("water flow becomes instantaneous", "water-flow-timing", candidate => ({
  ...candidate,
  game: replaceExactlyOnce(candidate.game, "DINO_WATER_FLOW_STEP_MS=110", "DINO_WATER_FLOW_STEP_MS=0")
}));
mutation("water success crossfade becomes a flash", "water-crossfade-timing", candidate => ({
  ...candidate,
  game: replaceExactlyOnce(candidate.game, "DINO_WATER_CROSSFADE_MS=700", "DINO_WATER_CROSSFADE_MS=200")
}));
mutation("crane start action loses its handler", "crane-start-binding", candidate => ({
  ...candidate,
  game: replaceExactlyOnce(candidate.game, 'if(dinoCraneStart)bindTap(dinoCraneStart,()=>{beginDinoCraneRescue();});', "")
}));
mutation("water start action loses its handler", "water-start-binding", candidate => ({
  ...candidate,
  game: replaceExactlyOnce(candidate.game, 'if(dinoWaterStart)bindTap(dinoWaterStart,()=>{beginDinoWaterPuzzle();});', "")
}));

console.log(`nazonazo dino rescue story regression: OK (${result.checks} checks, ${mutationCount} mutations rejected)`);
