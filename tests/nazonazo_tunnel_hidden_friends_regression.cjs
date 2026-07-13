#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const html = read("nazonazo-tunnel/index.html");
const css = read("nazonazo-tunnel/styles.css");
const game = read("nazonazo-tunnel/js/game.js");

const TITLE = "トンネルの かくれともだち";
const scoreFunctionNames = [
  "emptyStageScoreBreakdown",
  "formatScore",
  "resetStageScore",
  "resetJourneyScore",
  "addScore",
  "collectHelpItem",
  "drawPersistentScoreHud",
  "drawTunnelScoreHud",
  "tunnelScoreBreakdownText"
];
const wallFunctionNames = [
  "tunnelFriendStaticMode",
  "tunnelFriendVisualVariation",
  "tunnelWallBayWidthVw",
  "tunnelFriendWallSlots",
  "updateTunnelFriendWallMotion"
];
const friendFunctionNames = [
  "prepareTunnelFriends",
  "drawTunnelFriendHud",
  "startTunnelFriendGame",
  "findTunnelFriend",
  "showTunnelFriendResult",
  "clearTunnelFriendGame"
];
const functionNames = [...scoreFunctionNames, ...wallFunctionNames, ...friendFunctionNames];

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
    else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name}: function declaration missing`);
  const bodyAt = source.indexOf("{", start + marker.length);
  assert.ok(bodyAt >= 0, `${name}: function body missing`);
  const end = scanBalanced(source, bodyAt, "{", "}");
  assert.ok(end > bodyAt, `${name}: unterminated function body`);
  return source.slice(start, end + 1);
}

function extractRule(source, selector) {
  const start = source.indexOf(selector);
  assert.ok(start >= 0, `${selector}: CSS selector missing`);
  const bodyAt = source.indexOf("{", start + selector.length);
  assert.ok(bodyAt >= 0, `${selector}: CSS body missing`);
  const end = scanBalanced(source, bodyAt, "{", "}");
  assert.ok(end > bodyAt, `${selector}: unterminated CSS body`);
  return source.slice(start, end + 1);
}

function extractTunnelConstants(source) {
  const declarations = [];
  const pattern = /const\s+(?:SCORE_POINTS|TUNNEL_(?:GAME|TRANSIT|WALL|FRIEND)_[A-Z0-9_]+)\s*=/g;
  let match;
  while ((match = pattern.exec(source))) {
    let quote = "";
    let escaped = false;
    let square = 0;
    let round = 0;
    let curly = 0;
    let end = match.index;
    for (; end < source.length; end += 1) {
      const char = source[end];
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
      if (char === "[") square += 1;
      else if (char === "]") square -= 1;
      else if (char === "(") round += 1;
      else if (char === ")") round -= 1;
      else if (char === "{") curly += 1;
      else if (char === "}") curly -= 1;
      else if (char === ";" && square === 0 && round === 0 && curly === 0) break;
    }
    assert.ok(end < source.length, "unterminated TUNNEL_FRIEND constant declaration");
    declarations.push(source.slice(match.index, end + 1));
    pattern.lastIndex = end + 1;
  }
  return declarations.join("\n");
}

const hiddenFunctions = Object.fromEntries(functionNames.map(name => [name, extractFunction(game, name)]));
function extractConstObject(source, name) {
  const marker = `const ${name}=`;
  const markerAt = source.indexOf(marker);
  assert.ok(markerAt >= 0, `${name}: declaration missing`);
  const objectAt = source.indexOf("{", markerAt + marker.length);
  assert.ok(objectAt >= 0, `${name}: object literal missing`);
  const end = scanBalanced(source, objectAt, "{", "}");
  assert.ok(end > objectAt, `${name}: unterminated object literal`);
  return vm.runInNewContext(`(${source.slice(objectAt, end + 1)})`, Object.create(null), { timeout: 1000 });
}
function numericConstant(source, name) {
  const match = source.match(new RegExp(`\\b${name}\\s*=\\s*(\\d+(?:\\.\\d+)?|\\.\\d+)\\b`));
  assert.ok(match, `${name}: numeric declaration missing`);
  return Number(match[1]);
}
const scorePoints = JSON.parse(JSON.stringify(extractConstObject(game, "SCORE_POINTS")));
const enterTunnel = extractFunction(game, "enterTunnelInterior");
const exitApproach = extractFunction(game, "startTunnelExitApproach");
const finishTunnel = extractFunction(game, "finishTunnelInterior");
const showDropoff = extractFunction(game, "showDropoff");
const startJourney = extractFunction(game, "startJourneyAt");
const openMap = extractFunction(game, "openMap");
const ending = extractFunction(game, "ending");
const onPick = extractFunction(game, "onPick");
const proceed = extractFunction(game, "proceed");
const completeCurrentStage = extractFunction(game, "completeCurrentStage");
const resetStageScore = extractFunction(game, "resetStageScore");
const onRunEvent = extractFunction(game, "onRunEvent");
const maybeSpawnRare = extractFunction(game, "maybeSpawnRare");
const collectRareEvent = extractFunction(game, "collectRareEvent");
const setTunnelInteriorBackdrop = extractFunction(game, "setTunnelInteriorBackdrop");
const gameLoop = extractFunction(game, "gloop");

/* ---------- child-facing DOM and styling contract ---------- */
for (const id of [
  "tunnelFriendGame", "tunnelFriendGuide", "tunnelFriendLayer", "tunnelFriendResult",
  "tunnelStageScore", "tunnelJourneyScore", "tunnelResultStage", "tunnelResultBreakdown", "tunnelResultTotal"
]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `${id}: DOM node missing`);
}
assert.match(html, /id="tunnelFriendGame"[^>]*(?:\shidden(?:\s|=|>)|aria-hidden="true")/, "the bonus surface must start hidden to assistive technology");
assert.match(html, /id="tunnelFriendGame"[^>]*(?:aria-label="トンネルの かくれともだち"|aria-labelledby="[^"]+")/, "the bonus surface needs an accessible name");
assert.match(html, /id="tunnelFriend(?:Title|Guide)"[^>]*>[\s\S]*?トンネルの かくれともだち[\s\S]*?<\/[^>]+>/, "the exact selected title must be visible in the tunnel");
assert.match(html, /id="tunnelFriendResult"[^>]*role="status"[^>]*aria-live="polite"/, "the result needs a non-interrupting live region");
assert.match(html, /id="tunnelStageScore"[^>]*>0てん</, "the tunnel must show the current-stage score");
assert.match(html, /id="tunnelJourneyScore"[^>]*>0てん</, "the tunnel must show the journey score");
assert.match(html, /id="tunnelFriendGuide"[^>]*>[^<]*1にん\s*\+100てん[^<]*ぜんぶ\s*\+200てん[^<]*</, "the per-friend and 3/3 bonus scores must be explained before play");
const friendDomStart = html.indexOf('id="tunnelFriendGame"');
const friendDomEnd = html.indexOf('id="tunnelFriendResult"', friendDomStart);
assert.ok(friendDomStart >= 0 && friendDomEnd > friendDomStart);
assert.doesNotMatch(html.slice(friendDomStart, friendDomEnd + 300), /<img\b[^>]*\bsrc\s*=/i, "LP markup must not eagerly request friend images");

const gameRule = extractRule(css, "#tunnelFriendGame");
assert.match(gameRule, /pointer-events\s*:\s*none/, "the bonus layer itself must not block the map or vehicle");
assert.match(extractRule(css, "#tunnelFriendLayer"), /z-index\s*:\s*6\b/, "wall silhouettes must sit on the tunnel wall layer");
assert.match(extractRule(css, "#veh.inTun,#cars.inTun"), /z-index\s*:\s*8\b/, "the train must pass in front of wall silhouettes");
assert.match(extractRule(css, "#tunnelFriendPanel"), /z-index\s*:\s*10\b/, "the score panel must stay above the train");
assert.match(extractRule(css, "#tunnelFriendResult"), /z-index\s*:\s*23\b/, "the result card must stay above the tunnel scene");
const buttonRule = extractRule(css, ".tunnel-friend");
assert.match(buttonRule, /pointer-events\s*:\s*auto/, "only friend buttons may receive tunnel input");
assert.match(buttonRule, /top\s*:\s*var\(--friend-y\)/, "wall friends need an explicit wall-height anchor");
assert.match(buttonRule, /--friend-screen-x/, "wall friends must move through the shared wall-position variable");
assert.match(buttonRule, /background\s*:\s*transparent/, "wall silhouettes must not look like floating cards");
assert.match(buttonRule, /border\s*:\s*0\b/, "wall silhouettes must not have a floating frame");
assert.doesNotMatch(buttonRule, /(?:scale|rotate)\s*\(/, "random visual size/tilt must not transform or shrink the button hit target");
const minimumButtonWidths = [...buttonRule.matchAll(/(?:min-)?width\s*:\s*(?:clamp\(\s*)?(\d+(?:\.\d+)?)px/g)].map(match => Number(match[1]));
assert.ok(minimumButtonWidths.some(width => width >= 52), "friend buttons must be at least 52px wide");
assert.ok(
  [...buttonRule.matchAll(/(?:min-)?height\s*:\s*(?:clamp\(\s*)?(\d+(?:\.\d+)?)px/g)].some(match => Number(match[1]) >= 52) || /aspect-ratio\s*:\s*1(?:\s*\/\s*1)?/.test(buttonRule),
  "friend buttons must be at least 52px tall or square"
);
assert.match(css, /\.tunnel-friend:focus-visible\s*\{[^}]*outline/, "friend buttons need a visible keyboard focus ring");
const visualRule = extractRule(css, ".tunnel-friend-visual");
assert.match(visualRule, /transform\s*:[^;}]*var\(--friend-scale/, "the silhouette art, not its hit target, must receive random scale");
assert.match(visualRule, /transform\s*:[^;}]*var\(--friend-rotate/, "the silhouette art, not its hit target, must receive random tilt");
const reducedAt = css.indexOf("@media (prefers-reduced-motion:reduce)");
assert.ok(reducedAt >= 0, "reduced-motion media query missing");
const reducedCss = css.slice(reducedAt);
assert.match(reducedCss, /\.tunnel-friend(?:\b|[^,{]*,)[^{]*\{[^}]*animation\s*:\s*none\s*!important/, "reduced motion must stop friend peeking/bobbing");

/* ---------- lifecycle and non-blocking progression contract ---------- */
assert.match(game, /const\s+TUNNEL_FRIEND_LIMIT\s*=\s*3\b/, "exactly three friends must be offered per tunnel");
assert.match(showDropoff, /prepareTunnelFriends\(\)/, "the just-completed car group must feed the tunnel recap");
assert.ok(showDropoff.indexOf("prepareTunnelFriends()") < showDropoff.indexOf("cars=[]"), "friends must be captured before passengers leave the cars array");
assert.match(enterTunnel, /startTunnelFriendGame\(\)/, "the bonus must start only after entering the tunnel interior");
assert.match(exitApproach, /showTunnelFriendResult\(\)/, "the existing exit-approach phase must carry the result");
for (const [label, source] of [["finish", finishTunnel], ["journey", startJourney], ["map", openMap]]) {
  assert.match(source, /clearTunnelFriendGame\(\)/, `${label}: tunnel friend UI/state cleanup missing`);
}
assert.doesNotMatch(startJourney, /tunnelFriendTotalFound\s*=\s*0/, "map resume must not erase the current journey total");
assert.match(ending, /tunnelFriendTotalFound/, "the journey result must include the hidden-friend total");
assert.match(ending, /formatScore\(journeyScore\)/, "the journey result must include the final numeric score");

for (const [name, source] of Object.entries(hiddenFunctions)) {
  assert.doesNotMatch(source, /\b(?:target|pending|driving|worldX|stg|qSeg)\s*=/, `${name}: the optional bonus must not control route progression`);
  assert.doesNotMatch(source, /setTimeout|setInterval/, `${name}: the bonus must reuse tunnel phases instead of extending them with timers`);
}
assert.match(game, /TUNNEL_INTERIOR_RUN_VW\s*=\s*360\b/, "the tuned tunnel play run must keep its original distance");
assert.match(game, /TUNNEL_EXIT_APPROACH_RUN_VW\s*=\s*135\b/, "the tuned result approach must keep its original distance");
assert.equal(numericConstant(game, "TUNNEL_GAME_MAX_V"), 32, "the searchable tunnel run needs the slower 32vw/s cap");
assert.equal(numericConstant(game, "TUNNEL_TRANSIT_MAX_V"), 58, "entry/result transit must keep the 58vw/s cap");
assert.equal(numericConstant(game, "TUNNEL_WALL_PARALLAX"), 0.55, "wall art and silhouettes must share the same parallax depth");
const tunnelSearchSeconds = numericConstant(game, "TUNNEL_INTERIOR_RUN_VW") / numericConstant(game, "TUNNEL_GAME_MAX_V");
assert.ok(tunnelSearchSeconds >= 10.5 && tunnelSearchSeconds <= 12.5, `the normal search window must be about 11.25 seconds, got ${tunnelSearchSeconds}`);
assert.match(gameLoop, /tunnelGameRun\?TUNNEL_GAME_MAX_V:\(tunnelRun\?TUNNEL_TRANSIT_MAX_V:/, "only the searchable tunnel phase may use the slower speed");
assert.match(setTunnelInteriorBackdrop, /-panWorld\*TUNNEL_WALL_PARALLAX/, "the wall background must use the shared parallax factor");
assert.match(hiddenFunctions.updateTunnelFriendWallMotion, /\(worldX-tunnelFriendStartWorldX\)\*TUNNEL_WALL_PARALLAX/, "wall friends must move at the wall background's parallax factor");
assert.match(hiddenFunctions.tunnelFriendStaticMode, /FAST>1/, "#fast must use stable, tappable silhouette slots");
assert.match(hiddenFunctions.tunnelFriendStaticMode, /prefers-reduced-motion:\s*reduce/, "reduced motion must use stable, tappable silhouette slots");
assert.match(hiddenFunctions.tunnelFriendVisualVariation, /Math\.random|randomFn/, "normal tunnels must draw fresh visual variation");
assert.match(hiddenFunctions.tunnelFriendVisualVariation, /scale[\s\S]*?rotation/, "visual variation must cover both size and angle");
assert.match(hiddenFunctions.tunnelFriendWallSlots, /TUNNEL_FRIEND_STATIC_SLOTS/, "static modes must use the dedicated on-screen slots");

assert.deepEqual(scorePoints, {
  correct: 100,
  firstTry: 50,
  stageClear: 300,
  noMiss: 200,
  helpOverflow: 50,
  rare: 300,
  tunnelFriend: 100,
  tunnelPerfect: 200
}, "the public score table drifted");
const perfectStagePoints = 5 * (scorePoints.correct + scorePoints.firstTry) + scorePoints.stageClear + scorePoints.noMiss;
const perfectBaseJourneyPoints = 6 * perfectStagePoints + 5 * (3 * scorePoints.tunnelFriend + scorePoints.tunnelPerfect);
assert.equal(perfectStagePoints, 1250, "a five-question no-miss stage must total 1,250 points before its tunnel");
assert.equal(perfectBaseJourneyPoints, 10000, "the six-stage, five-tunnel perfect base journey must total exactly 10,000 points");
assert.match(onPick, /SCORE_POINTS\.correct\+\(missInQ===0\?SCORE_POINTS\.firstTry:0\)/, "a correct first try must grant 100 + 50 points");
assert.match(completeCurrentStage, /if\(!playing\|\|stageCompletionHandled\)return/, "stage completion itself needs an idempotency guard that does not block replaying a cleared stage");
assert.match(completeCurrentStage, /stageCompletionHandled=true/, "stage completion must latch only the current run");
assert.doesNotMatch(completeCurrentStage, /if\([^)]*cleared\[stg\]/, "the persistent cleared history must not block a replayed stage from completing");
assert.match(resetStageScore, /stageCompletionHandled=false/, "each stage run must reset the completion latch");
assert.match(completeCurrentStage, /if\(!stageClearScoreGranted\)/, "stage-clear scoring needs a duplicate guard");
assert.match(completeCurrentStage, /SCORE_POINTS\.stageClear/, "stage clear must grant 300 points");
assert.match(completeCurrentStage, /stageMiss===0[\s\S]*?SCORE_POINTS\.noMiss/, "a no-miss clear must grant 200 points");
assert.match(hiddenFunctions.collectHelpItem, /helpItems\.length>=HELP_MAX[\s\S]*?SCORE_POINTS\.helpOverflow/, "the fourth and later help pickups must convert to 50 points");
assert.doesNotMatch(maybeSpawnRare, /addScore\(SCORE_POINTS\.rare,["']rare["']\)/,
  "spawning a rare friend must not grant points before the child collects it");
assert.match(maybeSpawnRare, /collectRareEvent\(el,e,t\)/,
  "pointer collection must use the shared rare-event transaction");
assert.match(collectRareEvent, /addScore\(SCORE_POINTS\.rare,["']rare["']\)/,
  "the shared rare-event transaction must grant 300 points");
assert.match(collectRareEvent, /dataset\.collected===?["']1["']/,
  "the shared rare-event transaction needs an idempotency guard");
assert.match(onRunEvent, /collectHelpItem\(/, "ordinary help pickups must share the overflow-score rule");
assert.match(hiddenFunctions.showTunnelFriendResult, /(?:tunnelFriendsFound\s*(?:===|>=)\s*TUNNEL_FRIEND_LIMIT|total\s*===\s*TUNNEL_FRIEND_LIMIT\s*&&\s*tunnelFriendsFound\s*===\s*total)/, "only a 3/3 find may grant the help reward");
assert.match(hiddenFunctions.showTunnelFriendResult, /collectHelpItem\(/, "the 3/3 reward must respect the shared help cap and overflow score");
assert.match(hiddenFunctions.findTunnelFriend, /disabled|\.found|dataset/, "repeat activation needs an idempotency guard");
assert.match(hiddenFunctions.findTunnelFriend, /addScore\(SCORE_POINTS\.tunnelFriend,["']tunnel["']\)/, "each wall friend must grant 100 points");
assert.match(hiddenFunctions.findTunnelFriend, /!tunnelFriendPerfectScoreGranted[\s\S]*?SCORE_POINTS\.tunnelPerfect/, "3/3 must grant the 200-point perfect bonus exactly once");
assert.match(hiddenFunctions.startTunnelFriendGame, /createElement\(["']button["']\)/, "hidden friends must be real buttons");
assert.match(hiddenFunctions.startTunnelFriendGame, /\.type\s*=\s*["']button["']|setAttribute\(["']type["'],\s*["']button["']\)/, "friend buttons must not act as form submits");
assert.match(hiddenFunctions.startTunnelFriendGame, /aria-label/, "every friend button needs a spoken action label");
assert.match(hiddenFunctions.startTunnelFriendGame, /setProperty\(["']--friend-scale["']/, "each silhouette must receive its own visual scale");
assert.match(hiddenFunctions.startTunnelFriendGame, /setProperty\(["']--friend-rotate["']/, "each silhouette must receive its own wall tilt");
assert.match(hiddenFunctions.startTunnelFriendGame, /tunnelFriendVisualVariation\(/, "silhouette scale and tilt must be assigned for every button");
assert.match(hiddenFunctions.drawTunnelScoreHud, /tunnelStageScore[\s\S]*?stageScore/, "the tunnel HUD must show the stage score");
assert.match(hiddenFunctions.drawTunnelScoreHud, /tunnelJourneyScore[\s\S]*?journeyScore/, "the tunnel HUD must show the journey score");
assert.match(hiddenFunctions.showTunnelFriendResult, /tunnelResultStage[\s\S]*?stageScore/, "the result must show the stage score");
assert.match(hiddenFunctions.showTunnelFriendResult, /tunnelResultTotal[\s\S]*?journeyScore/, "the result must show the journey score");

/* A shared rare collection transaction owns scoring for both pointer and vehicle collisions. */
const rareRecords = { scores: [], stamps: [], registrations: 0, sounds: 0, confetti: 0, speech: [] };
const rareElement = {
  parentNode: {},
  dataset: {},
  remove() { this.parentNode = null; }
};
const rareContext = {
  rareEl: rareElement,
  rareCount: 0,
  SCORE_POINTS: { rare: scorePoints.rare },
  addScore(points, category) { rareRecords.scores.push([points, category]); return points; },
  registerZk() { rareRecords.registrations += 1; return true; },
  sndNew() { rareRecords.sounds += 1; },
  confetti(count) { rareRecords.confetti += count; },
  showStamp(message, kind) { rareRecords.stamps.push([message, kind]); },
  speak(message) { rareRecords.speech.push(message); }
};
vm.runInNewContext(`${collectRareEvent};this.__collectRareEvent=collectRareEvent;`, rareContext, {
  filename: "nazonazo-shared-rare-event-vm.js",
  timeout: 1000
});
assert.equal(rareContext.__collectRareEvent(rareElement, "🐬", "いるか"), true);
assert.equal(rareContext.rareCount, 1);
assert.deepEqual(rareRecords.scores, [[scorePoints.rare, "rare"]], "collecting a rare friend must score exactly 300 points once");
assert.equal(rareElement.dataset.collected, "1");
assert.equal(rareContext.rareEl, null);
assert.match(rareRecords.stamps[0][0], /\+300てん/);
rareElement.parentNode = {};
assert.equal(rareContext.__collectRareEvent(rareElement, "🐬", "いるか"), false,
  "a pointer/collision race must not collect the same rare friend twice");
assert.equal(rareContext.rareCount, 1);
assert.deepEqual(rareRecords.scores, [[scorePoints.rare, "rare"]], "duplicate collection must not duplicate rare score");

/* ---------- isolated VM behavior harness ---------- */
class FakeClassList {
  constructor(owner) {
    this.owner = owner;
    this.values = new Set();
  }
  add(...names) { names.forEach(name => this.values.add(name)); this.sync(); }
  remove(...names) { names.forEach(name => this.values.delete(name)); this.sync(); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) {
    const next = force === undefined ? !this.values.has(name) : Boolean(force);
    if (next) this.values.add(name); else this.values.delete(name);
    this.sync();
    return next;
  }
  sync() { this.owner._className = [...this.values].join(" "); }
}

class FakeElement {
  constructor(tagName = "div", id = "") {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.style = { setProperty(name, value) { this[name] = value; } };
    this.attributes = new Map();
    this.classList = new FakeClassList(this);
    this._className = "";
    this._textContent = "";
    this._innerHTML = "";
    this.hidden = true;
    this.disabled = false;
    this.type = "";
    this.src = "";
    this.alt = "";
  }
  get className() { return this._className; }
  set className(value) {
    this.classList.values = new Set(String(value).split(/\s+/).filter(Boolean));
    this.classList.sync();
  }
  get textContent() {
    return this._textContent + this.children.map(child => child.textContent || "").join("");
  }
  set textContent(value) {
    this._textContent = String(value ?? "");
    this.children = [];
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(value) {
    this._innerHTML = String(value ?? "");
    this._textContent = "";
    this.children = [];
  }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  replaceChildren(...children) { this.children = []; this._textContent = ""; children.forEach(child => this.appendChild(child)); }
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter(child => child !== this);
    this.parentNode = null;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); if (name === "disabled") this.disabled = true; }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  removeAttribute(name) { this.attributes.delete(name); if (name === "disabled") this.disabled = false; }
  addEventListener(type, callback) { this[`__${type}`] = callback; }
  matches(selector) {
    if (selector.startsWith(".")) return this.classList.contains(selector.slice(1));
    if (selector.startsWith("#")) return this.id === selector.slice(1);
    return this.tagName === selector.toUpperCase();
  }
  querySelectorAll(selector) {
    const found = [];
    const visit = element => element.children.forEach(child => {
      if (child.matches(selector)) found.push(child);
      visit(child);
    });
    visit(this);
    return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  getBoundingClientRect() { return { left: 100, top: 100, right: 164, bottom: 164, width: 64, height: 64 }; }
  setPointerCapture() {}
}

function descendants(element) {
  return element.children.flatMap(child => [child, ...descendants(child)]);
}

function createHiddenFriendHarness({ fast = 1, reducedMotion = false, randomValues = [0.08, 0.91, 0.24, 0.73, 0.42, 0.58, 0.16, 0.84] } = {}) {
  const ids = Object.fromEntries([
    "tunnelFriendGame", "tunnelFriendTitle", "tunnelFriendGuide", "tunnelFriendCounter", "tunnelFriendLayer", "tunnelFriendResult",
    "tunnelStageScore", "tunnelJourneyScore", "tunnelResultStage", "tunnelResultBreakdown", "tunnelResultTotal",
    "scoreCurrentPill", "scoreHudValue", "highScorePill", "highScoreValue",
    "helpBadge", "app"
  ].map(id => [id, new FakeElement("div", id)]));
  const records = { announcements: [], stamps: [], tones: 0, helpHudUpdates: 0, saves: 0 };
  const document = {
    body: new FakeElement("body", "body"),
    createElement(tag) { return new FakeElement(tag); },
    createDocumentFragment() { return new FakeElement("fragment"); },
    getElementById(id) { return ids[id] || null; }
  };
  let randomIndex = 0;
  const nextRandom = () => {
    const value = randomValues[randomIndex % randomValues.length];
    randomIndex += 1;
    return value;
  };
  const deterministicMath = Object.create(Math);
  deterministicMath.random = nextRandom;
  const context = {
    console,
    document,
    window: {
      innerWidth: 844,
      innerHeight: 390,
      matchMedia: () => ({ matches: reducedMotion })
    },
    Math: deterministicMath,
    Number,
    Set,
    Array,
    FAST: fast,
    HELP_MAX: 3,
    tunnelFriendGame: ids.tunnelFriendGame,
    tunnelFriendTitle: ids.tunnelFriendTitle,
    tunnelFriendGuide: ids.tunnelFriendGuide,
    tunnelFriendCounter: ids.tunnelFriendCounter,
    tunnelFriendLayer: ids.tunnelFriendLayer,
    tunnelFriendResult: ids.tunnelFriendResult,
    tunnelStageScore: ids.tunnelStageScore,
    tunnelJourneyScore: ids.tunnelJourneyScore,
    tunnelResultStage: ids.tunnelResultStage,
    tunnelResultBreakdown: ids.tunnelResultBreakdown,
    tunnelResultTotal: ids.tunnelResultTotal,
    scoreCurrentPill: ids.scoreCurrentPill,
    scoreHudValue: ids.scoreHudValue,
    highScorePill: ids.highScorePill,
    highScoreValue: ids.highScoreValue,
    $: id => ids[id],
    shuffle: values => values.slice(),
    pick: values => values[0],
    rnd: (min, max) => min + (max - min) * nextRandom(),
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    passengerLabel: passenger => passenger.name || passenger.t || "",
    bindTap(element, callback) { element.__tap = callback; },
    announce(message) { records.announcements.push(String(message)); },
    showStamp(message) { records.stamps.push(String(message)); },
    tone() { records.tones += 1; },
    sndNew() { records.tones += 1; },
    confetti() {},
    updateHelpHud() { records.helpHudUpdates += 1; },
    saveGame() { records.saves += 1; },
    requestAnimationFrame(callback) { callback(); },
    setTimeout(callback) { callback(); return 1; },
    clearTimeout() {},
    performance: { now: () => 0 }
  };
  const constantSource = extractTunnelConstants(game);
  vm.runInNewContext(`
    ${constantSource}
    let cars=[];
    let helpItems=[];
    let tunnelFriendCandidates=[];
    let tunnelFriendsFound=0;
    let tunnelFriendTotalFound=0;
    let tunnelFriendRewardGranted=false;
    let tunnelFriendPerfectScoreGranted=false;
    let tunnelFriendGameActive=false;
    let tunnelFriendStartWorldX=0;
    let worldX=0;
    let journeyScore=0;
    let highScore=0;
    let stageScore=0;
    let stageScoreBreakdown=emptyStageScoreBreakdown();
    let stageClearScoreGranted=false;
    ${functionNames.map(name => hiddenFunctions[name]).join("\n")}
    this.__tunnelApi={
      setCars:value=>{cars=value;},
      setHelp:value=>{helpItems=value;},
      setScores:(journey,stage,breakdown)=>{
        journeyScore=journey;stageScore=stage;
        stageScoreBreakdown=Object.assign(emptyStageScoreBreakdown(),breakdown||{});
        drawTunnelScoreHud();
      },
      setWall:(start,current)=>{tunnelFriendStartWorldX=start;worldX=current;},
      prepare:prepareTunnelFriends,
      start:startTunnelFriendGame,
      find:findTunnelFriend,
      result:showTunnelFriendResult,
      clear:clearTunnelFriendGame,
      draw:drawTunnelFriendHud,
      slots:tunnelFriendWallSlots,
      move:updateTunnelFriendWallMotion,
      collectHelp:collectHelpItem,
      state:()=>({
        candidates:tunnelFriendCandidates,
        found:tunnelFriendsFound,
        total:tunnelFriendTotalFound,
        reward:tunnelFriendRewardGranted,
        perfect:tunnelFriendPerfectScoreGranted,
        active:tunnelFriendGameActive,
        help:helpItems,
        journeyScore,
        stageScore,
        breakdown:stageScoreBreakdown
      })
    };`, context, { filename: "nazonazo-tunnel-hidden-friends-vm.js", timeout: 1000 });
  return { api: context.__tunnelApi, ids, records };
}

function plain(value) { return JSON.parse(JSON.stringify(value)); }

const harness = createHiddenFriendHarness();
const sourceCars = [
  { e: "🐿️", t: "りすちゃん", name: "りすちゃん", img: "risu.webp" },
  { e: "🐿️", t: "りすちゃん", name: "りすちゃん", img: "risu.webp" },
  { e: "🦆", t: "あひるさん", name: "あひるさん" },
  { pending: true, e: "", t: "" },
  { e: "🦌", t: "しかさん", name: "しかさん" },
  { e: "🐱", t: "ねこさん", name: "ねこさん" }
];
harness.api.setCars(sourceCars);
harness.api.prepare();
let state = plain(harness.api.state());
assert.equal(state.candidates.length, 3, "candidate preparation must cap the recap at three friends");
assert.deepEqual(state.candidates.map(friend => friend.t), ["あひるさん", "しかさん", "ねこさん"], "the recap must use the last three real passengers in boarding order");
assert.ok(state.candidates.every(friend => !friend.pending), "pending seats must not become hidden friends");
assert.equal(sourceCars.length, 6, "candidate preparation must not mutate the car history");

const repeatedHarness = createHiddenFriendHarness();
repeatedHarness.api.setCars([
  { e: "🐻", t: "くまさん" },
  { e: "🐰", t: "うさぎさん" },
  { e: "🐭", t: "ねずみ" },
  { e: "🐭", t: "ねずみ" },
  { e: "🐭", t: "ねずみ" }
]);
repeatedHarness.api.prepare();
assert.equal(plain(repeatedHarness.api.state()).candidates.length, 3, "repeated answers must still produce a reachable 3/3 tunnel bonus");

harness.api.setScores(1000, 750, { quiz: 750 });
harness.api.setWall(100, 100);
harness.api.start();
state = plain(harness.api.state());
assert.equal(state.active, true);
assert.equal(harness.ids.tunnelFriendGame.getAttribute("aria-hidden"), "false", "the game must become visible on tunnel entry");
const buttons = descendants(harness.ids.tunnelFriendLayer).filter(element => element.tagName === "BUTTON");
assert.equal(buttons.length, 3, "all three wall friends must be created when the search starts");
const visualScales = buttons.map(button => Number(button.style["--friend-scale"]));
const visualRotations = buttons.map(button => Number(String(button.style["--friend-rotate"]).replace("deg", "")));
assert.ok(visualScales.every(scale => Number.isFinite(scale) && scale >= 0.72 && scale <= 1.3), `silhouette scale escaped its natural range: ${visualScales}`);
assert.ok(visualRotations.every(rotation => Number.isFinite(rotation) && Math.abs(rotation) <= 16), `silhouette tilt escaped its natural range: ${visualRotations}`);
assert.ok(new Set(visualScales.map(scale => scale.toFixed(3))).size >= 2, "all three wall silhouettes still use the same size");
assert.ok(new Set(visualRotations.map(rotation => rotation.toFixed(2))).size >= 2, "all three wall silhouettes still use the same angle");
assert.ok(buttons.every(button => button.getBoundingClientRect().width >= 52 && button.getBoundingClientRect().height >= 52), "randomized silhouette art shrank a button hit target");
for (const button of buttons) {
  assert.equal(button.type, "button");
  assert.ok(button.getAttribute("aria-label"), "each friend button needs an aria-label");
  assert.equal(typeof button.__tap, "function", "each friend button must use the app's tap binding");
}
assert.match(html, new RegExp(TITLE));
assert.match(harness.ids.tunnelFriendCounter.textContent, /0\s*\/\s*3/, "the initial counter must be visible");
assert.equal(harness.ids.tunnelStageScore.textContent, "750てん", "the score HUD must carry the just-cleared stage score into the tunnel");
assert.equal(harness.ids.tunnelJourneyScore.textContent, "1,000てん", "the score HUD must carry the journey total into the tunnel");

const wallStartX = buttons.map(button => Number(button.style["--friend-screen-x"].replace("vw", "")));
const wallSpeedVwPerSecond = numericConstant(game, "TUNNEL_GAME_MAX_V") * numericConstant(game, "TUNNEL_WALL_PARALLAX");
for (const [index, startX] of wallStartX.entries()) {
  const visibleFrom = Math.max(0, (startX - 100) / wallSpeedVwPerSecond);
  const visibleUntil = Math.min(tunnelSearchSeconds, startX / wallSpeedVwPerSecond);
  assert.ok(visibleUntil - visibleFrom >= 2.5, `friend ${index}: normal-speed wall visibility is too short (${(visibleUntil - visibleFrom).toFixed(2)}s)`);
}
harness.api.setWall(100, 120);
harness.api.move();
const wallMovedX = buttons.map(button => Number(button.style["--friend-screen-x"].replace("vw", "")));
wallStartX.forEach((startX, index) => {
  assert.ok(Math.abs((startX - wallMovedX[index]) - 11) <= 0.02, `friend ${index}: 20vw of travel must move the wall silhouette by 11vw`);
});

buttons[0].__tap();
state = plain(harness.api.state());
assert.equal(state.found, 1);
assert.equal(state.total, 1);
assert.equal(state.stageScore, 850, "one wall friend must add 100 to the stage score");
assert.equal(state.journeyScore, 1100, "one wall friend must add 100 to the journey score");
harness.api.find(buttons[0], state.candidates[0]);
state = plain(harness.api.state());
assert.equal(state.found, 1, "a found/disabled friend must not count twice");
assert.equal(state.total, 1, "double activation must not inflate the journey score");
assert.equal(state.stageScore, 850, "double activation must not duplicate wall-friend points");
buttons[1].__tap();
buttons[2].__tap();
state = plain(harness.api.state());
assert.equal(state.found, 3);
assert.equal(state.total, 3);
assert.equal(state.perfect, true, "3/3 must latch the one-time perfect bonus guard");
assert.equal(state.stageScore, 1250, "three friends (+300) and the perfect bonus (+200) must add 500 points");
assert.equal(state.journeyScore, 1500, "the journey score must receive the same 500 tunnel points");
assert.equal(state.breakdown.tunnel, 500, "the stage breakdown must group all hidden-friend points");
assert.equal(buttons[2].dataset.score, "+300", "the final friend pop must include its 100 points plus the 200 perfect bonus");
assert.equal(state.help.length, 0, "the help reward belongs to the result phase, not individual taps");

harness.api.result();
state = plain(harness.api.state());
assert.equal(state.reward, true, "3/3 must grant the next-stage reward");
assert.equal(state.help.length, 1, "3/3 must grant exactly one help item");
assert.equal(state.stageScore, 1250, "storing the 3/3 help reward must not add overflow points");
assert.match(harness.ids.tunnelResultBreakdown.textContent, /ぜんぶ|3\s*\/\s*3|3にん/, "the exit approach must celebrate a complete find");
assert.match(harness.ids.tunnelResultStage.textContent, /1,250てん/, "the result must show the completed stage score");
assert.match(harness.ids.tunnelResultBreakdown.textContent, /なぞなぞ \+750/, "the result must summarize quiz points");
assert.match(harness.ids.tunnelResultBreakdown.textContent, /かくれともだち \+500/, "the result must summarize wall-friend points");
assert.match(harness.ids.tunnelResultTotal.textContent, /1,500てん/, "the result must show the journey score");
harness.api.result();
state = plain(harness.api.state());
assert.equal(state.help.length, 1, "re-rendering the exit result must not duplicate the reward");
assert.equal(state.stageScore, 1250, "re-rendering the exit result must not duplicate score");

harness.api.clear();
state = plain(harness.api.state());
assert.equal(state.active, false);
assert.equal(state.found, 0);
assert.equal(state.reward, false);
assert.equal(state.candidates.length, 0);
assert.equal(state.total, 3, "stage cleanup must preserve the journey-wide score");
assert.equal(state.journeyScore, 1500, "stage cleanup must preserve the journey-wide point total");
assert.equal(harness.ids.tunnelFriendGame.getAttribute("aria-hidden"), "true");

harness.api.setHelp([]);
harness.api.setScores(1500, 1250, { quiz: 750, tunnel: 500 });
harness.api.setCars(sourceCars);
harness.api.prepare();
harness.api.start();
harness.api.result();
state = plain(harness.api.state());
assert.equal(state.found, 0, "ignoring the optional game must remain valid");
assert.equal(state.help.length, 0, "0/3 must not grant a help item");
assert.equal(state.journeyScore, 1500, "0/3 must not subtract or add points");
assert.match(harness.ids.tunnelResultBreakdown.textContent, /0|こんど|また/, "0/3 still needs a friendly, non-failing result");

const overflowHarness = createHiddenFriendHarness();
overflowHarness.api.setHelp([{ e: "🍀" }, { e: "🌼" }, { e: "🦋" }]);
overflowHarness.api.collectHelp({ e: "🎈" });
overflowHarness.api.collectHelp({ e: "🐦" });
state = plain(overflowHarness.api.state());
assert.equal(state.help.length, 3, "help inventory must never exceed three items");
assert.equal(state.stageScore, 100, "the fourth and fifth help pickups must grant 50 points each");
assert.equal(state.breakdown.help, 100, "help overflow points need their own stage-summary category");

overflowHarness.api.setScores(0, 0);
overflowHarness.api.setCars(sourceCars);
overflowHarness.api.prepare();
overflowHarness.api.setWall(0, 0);
overflowHarness.api.start();
const overflowButtons = descendants(overflowHarness.ids.tunnelFriendLayer).filter(element => element.tagName === "BUTTON");
overflowButtons.forEach(button => button.__tap());
overflowHarness.api.result();
state = plain(overflowHarness.api.state());
assert.equal(state.stageScore, 550, "full-inventory 3/3 must grant 500 tunnel points plus 50 overflow points");
assert.equal(state.help.length, 3, "full-inventory 3/3 must not create a fourth help item");
overflowHarness.api.result();
assert.equal(plain(overflowHarness.api.state()).stageScore, 550, "repeat result rendering must not duplicate help-overflow points");

for (const mode of [
  { label: "#fast", options: { fast: 8 } },
  { label: "reduced motion", options: { reducedMotion: true } }
]) {
  const staticHarness = createHiddenFriendHarness(mode.options);
  staticHarness.api.setCars(sourceCars);
  staticHarness.api.prepare();
  staticHarness.api.setWall(100, 100);
  staticHarness.api.start();
  const staticButtons = descendants(staticHarness.ids.tunnelFriendLayer).filter(element => element.tagName === "BUTTON");
  assert.deepEqual(staticButtons.map(button => Number(button.dataset.wallStartX)), [10, 34, 90], `${mode.label}: static slot positions drifted`);
  assert.equal(staticHarness.ids.tunnelFriendGame.classList.contains("is-static"), true, `${mode.label}: static mode class missing`);
  staticHarness.api.setWall(100, 300);
  staticHarness.api.move();
  assert.deepEqual(staticButtons.map(button => button.style["--friend-screen-x"]), ["10.00vw", "34.00vw", "90.00vw"], `${mode.label}: wall friends must stay tappable on screen`);
}

/* ---------- optional end-to-end browser check ---------- */
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg"
};

async function startStaticServer() {
  if (process.env.NAZONAZO_BASE_URL) return { base: process.env.NAZONAZO_BASE_URL.replace(/\/$/, ""), close: async () => {} };
  const server = http.createServer((request, response) => {
    const rawPath = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const rel = rawPath.endsWith("/") ? `${rawPath}index.html` : rawPath;
    const full = path.resolve(root, `.${rel}`);
    if (full !== root && !full.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end("forbidden");
      return;
    }
    fs.readFile(full, (error, body) => {
      if (error) {
        response.writeHead(error.code === "ENOENT" ? 404 : 500).end("not found");
        return;
      }
      response.writeHead(200, { "content-type": mime[path.extname(full)] || "application/octet-stream", "cache-control": "no-store" });
      response.end(body);
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return { base: `http://127.0.0.1:${address.port}`, close: () => new Promise(resolve => server.close(resolve)) };
}

async function answerStage(page) {
  for (let index = 0; index < 5; index += 1) {
    const correct = page.locator('#quiz.show .choice[data-ok="1"]');
    await correct.waitFor({ state: "visible", timeout: 25000 });
    await correct.click();
    await page.waitForFunction(() => !document.getElementById("quiz").classList.contains("show"), null, { timeout: 5000 });
  }
}

async function runBrowser(browserName, base) {
  const { chromium, webkit } = require("playwright");
  const isIOS = browserName === "webkit-ios";
  const browserType = browserName.startsWith("webkit") ? webkit : chromium;
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 740, height: 320 },
    userAgent: isIOS
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
      : undefined
  });
  const page = await context.newPage();
  const errors = [];
  const failed = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("requestfailed", request => failed.push(`${request.method()} ${request.url()} ${request.failure() && request.failure().errorText}`));
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto(`${base}/nazonazo-tunnel/?weather=clear#fast`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.__tunnelFriendAudit = { results: [] };
    const result = document.getElementById("tunnelFriendResult");
    new MutationObserver(() => {
      const text = result.textContent.trim();
      if (text && window.__tunnelFriendAudit.results.at(-1) !== text) window.__tunnelFriendAudit.results.push(text);
    }).observe(result, { childList: true, characterData: true, subtree: true });
  });
  await page.locator("#startBtn").click();
  await answerStage(page);
  await page.waitForFunction(() => document.body.classList.contains("tunnel-interior") && document.getElementById("tunnelFriendGame").getAttribute("aria-hidden") === "false", null, { timeout: 70000 });
  assert.equal((await page.locator("#tunnelFriendTitle").textContent()).includes(TITLE), true, `${browserName}: exact title missing`);
  assert.match(await page.locator("#tunnelFriendGuide").textContent(), /1にん\s*\+100てん[\s\S]*ぜんぶ\s*\+200てん/, `${browserName}: score rules missing from the tunnel panel`);
  assert.match(await page.locator("#tunnelStageScore").textContent(), /1,250てん/, `${browserName}: perfect stage score missing on tunnel entry`);
  assert.match(await page.locator("#tunnelJourneyScore").textContent(), /1,250てん/, `${browserName}: journey score missing on tunnel entry`);
  const friendButtons = page.locator("#tunnelFriendLayer .tunnel-friend");
  assert.equal(await friendButtons.count(), 3, `${browserName}: all three friends must appear on entry`);
  const buttonMetrics = await friendButtons.evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      label: element.getAttribute("aria-label") || "",
      scale: Number(getComputedStyle(element).getPropertyValue("--friend-scale")),
      rotation: Number(getComputedStyle(element).getPropertyValue("--friend-rotate").replace("deg", "")),
      inside: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      hittable: Boolean(hit && (hit === element || element.contains(hit)))
    };
  }));
  for (const metric of buttonMetrics) {
    assert.ok(metric.width >= 52 && metric.height >= 52, `${browserName}: undersized friend target ${metric.width}x${metric.height}`);
    assert.ok(metric.label, `${browserName}: friend aria-label missing`);
    assert.ok(metric.inside, `${browserName}: friend target is clipped`);
    assert.ok(metric.hittable, `${browserName}: friend target is covered by another layer`);
    assert.ok(Number.isFinite(metric.scale) && metric.scale >= 0.72 && metric.scale <= 1.3, `${browserName}: invalid silhouette scale ${metric.scale}`);
    assert.ok(Number.isFinite(metric.rotation) && Math.abs(metric.rotation) <= 16, `${browserName}: invalid silhouette rotation ${metric.rotation}`);
  }
  assert.ok(new Set(buttonMetrics.map(metric => metric.scale.toFixed(3))).size >= 2, `${browserName}: wall silhouettes still share one size`);
  assert.ok(new Set(buttonMetrics.map(metric => metric.rotation.toFixed(2))).size >= 2, `${browserName}: wall silhouettes still share one angle`);
  assert.ok(Math.max(...buttonMetrics.map(metric => metric.width)) - Math.min(...buttonMetrics.map(metric => metric.width)) <= 1, `${browserName}: visual scale leaked into button width`);
  assert.ok(Math.max(...buttonMetrics.map(metric => metric.height)) - Math.min(...buttonMetrics.map(metric => metric.height)) <= 1, `${browserName}: visual scale leaked into button height`);
  const staticCenters = buttonMetrics.map(metric => metric.centerX / 740 * 100);
  [10, 34, 90].forEach((expected, index) => {
    assert.ok(Math.abs(staticCenters[index] - expected) <= 1, `${browserName}: #fast friend ${index} left its static wall slot`);
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedNames = await friendButtons.evaluateAll(elements => elements.map(element => getComputedStyle(element).animationName));
  assert.ok(reducedNames.every(name => name === "none"), `${browserName}: reduced-motion friend animation still runs`);

  await page.mouse.click(buttonMetrics[0].centerX, buttonMetrics[0].centerY);
  const afterOne = await page.locator("#tunnelFriendCounter").textContent();
  await page.mouse.click(buttonMetrics[0].centerX, buttonMetrics[0].centerY);
  assert.equal(await page.locator("#tunnelFriendCounter").textContent(), afterOne, `${browserName}: duplicate activation changed the count`);
  await page.mouse.click(buttonMetrics[1].centerX, buttonMetrics[1].centerY);
  await page.mouse.click(buttonMetrics[2].centerX, buttonMetrics[2].centerY);
  assert.match(await page.locator("#tunnelFriendCounter").textContent(), /3\s*\/\s*3/, `${browserName}: 3/3 counter missing`);
  assert.match(await page.locator("#tunnelStageScore").textContent(), /1,750てん/, `${browserName}: tunnel points were not added to the stage HUD`);
  assert.match(await page.locator("#tunnelJourneyScore").textContent(), /1,750てん/, `${browserName}: tunnel points were not added to the journey HUD`);
  // #fast compresses the 2.33-second production recap to roughly 0.39 seconds,
  // so capture its live-region text instead of requiring the transient card to
  // remain visible while several Playwright assertions are awaited.
  await page.waitForFunction(() => window.__tunnelFriendAudit.results.some(text =>
    /この めん\s*1,750てん/.test(text) &&
    /かくれともだち\s*\+500/.test(text) &&
    /ぜんぶ\s*1,750てん/.test(text)
  ), null, { timeout: 10000 });
  const capturedResult = await page.evaluate(() => window.__tunnelFriendAudit.results.find(text =>
    /この めん\s*1,750てん/.test(text) &&
    /かくれともだち\s*\+500/.test(text) &&
    /ぜんぶ\s*1,750てん/.test(text)
  ) || "");
  assert.match(capturedResult, /ぜんぶ|3\s*\/\s*3|3にん/, `${browserName}: complete exit result missing`);
  await page.waitForFunction(() => /×\s*1/.test(document.getElementById("helpBadge").textContent), null, { timeout: 10000 });
  await page.waitForFunction(() => document.body.classList.contains("st-jungle") && document.getElementById("quiz").classList.contains("show"), null, { timeout: 70000 });
  const firstResults = await page.evaluate(() => window.__tunnelFriendAudit.results.slice());
  assert.ok(firstResults.some(text => /ぜんぶ|3\s*\/\s*3|3にん/.test(text)), `${browserName}: complete result was never shown during exit approach`);

  // The untapped 0/3 branch and its no-reward guarantee are exercised in the
  // deterministic VM harness above. Keep this optional E2E focused on the
  // requested town -> tunnel -> next-stage journey so #fast cannot outrun a
  // second transient tunnel while Playwright is polling it.
  assert.deepEqual(errors, [], `${browserName}: page errors\n${errors.join("\n")}`);
  assert.deepEqual(failed, [], `${browserName}: request failures\n${failed.join("\n")}`);

  const lockedContext = await browser.newContext({ viewport: { width: 740, height: 320 } });
  const lockedPage = await lockedContext.newPage();
  const eagerFriendRequests = [];
  lockedPage.on("request", request => {
    if (/\/assets\/images\/bento\/npc\//.test(request.url())) eagerFriendRequests.push(request.url());
  });
  await lockedPage.goto(`${base}/nazonazo-tunnel/?weather=clear#fast`, { waitUntil: "networkidle" });
  await lockedPage.locator("#ponoTierLockScreen").waitFor({ state: "visible", timeout: 10000 });
  assert.equal(await lockedPage.locator("#tunnelFriendLayer .tunnel-friend").count(), 0, `${browserName}: LP lock built the bonus game`);
  assert.deepEqual(eagerFriendRequests, [], `${browserName}: LP lock eagerly requested friend images`);
  await lockedContext.close();
  await context.close();
  await browser.close();
}

(async () => {
  if (process.env.NAZONAZO_BROWSER) {
    const server = await startStaticServer();
    try {
      const requested = process.env.NAZONAZO_BROWSER.split(",").map(value => value.trim()).filter(Boolean);
      for (const browserName of requested) await runBrowser(browserName, server.base);
    } finally {
      await server.close();
    }
  }
  console.log("nazonazo tunnel hidden friends regression: PASS");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
