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
  assert.ok(match, `missing function ${name}`);
  const paramsAt = source.indexOf("(", match.index);
  const paramsEnd = scanBalanced(source, paramsAt, "(", ")");
  const bodyAt = source.indexOf("{", paramsEnd);
  const bodyEnd = scanBalanced(source, bodyAt, "{", "}");
  assert.ok(bodyAt >= 0 && bodyEnd > bodyAt, `unbalanced function ${name}`);
  return source.slice(match.index, bodyEnd + 1);
}

function extractArray(source, name) {
  const match = new RegExp(`(?:const\\s+|,)${name}\\s*=`).exec(source);
  assert.ok(match, `missing array ${name}`);
  const at = source.indexOf("[", match.index);
  const end = scanBalanced(source, at, "[", "]");
  assert.ok(at >= 0 && end > at, `unbalanced array ${name}`);
  return vm.runInNewContext(`(${source.slice(at, end + 1)})`, Object.create(null), { timeout: 500 });
}

function numericConstant(source, name) {
  const match = new RegExp(`(?:const\\s+|,)${name}\\s*=\\s*([0-9.]+)`).exec(source);
  assert.ok(match, `missing numeric constant ${name}`);
  return Number(match[1]);
}

function townDockSection(source) {
  const start = source.indexOf("/* ================= 町: ぴたっと停車 (townDock) ================= */");
  const end = source.indexOf("/* ================= map ================= */", start);
  assert.ok(start >= 0 && end > start, "town dock section missing");
  return source.slice(start, end);
}

let checks = 0;
function check(condition, message) {
  checks += 1;
  assert.ok(condition, message);
}

// ---- DOM contract ----
for (const id of [
  "townDockLayer", "townDockTitle", "townDockProgress", "townDockGuide", "townDockTrack",
  "townDockZone", "townDockKnob", "townDockWindows", "townDockVillager", "townDockControls", "townDockThrottle"
]) {
  check((html.match(new RegExp(`id=["']${id}["']`, "g")) || []).length === 1, `DOM id ${id} must exist exactly once`);
}
check(/<section id="townDockLayer" data-phase="idle"[^>]*hidden>/.test(html), "town dock layer must start idle and hidden");
check(/<button id="townDockThrottle" type="button"/.test(html), "townDockThrottle must be a real button");
check(/id="townDockTrack"[^>]*role="meter"[^>]*aria-valuemin="0"[^>]*aria-valuemax="100"/.test(html), "track meter accessibility contract missing");
check(/id="townDockProgress" role="status" aria-live="polite"/.test(html), "progress status readout missing");
check(/id="townDockGuide" role="status" aria-live="polite"/.test(html), "guide status readout missing");
check(!/id="townDockRetry"/.test(html), "retry must happen automatically in place, not via an explicit retry button");

// ---- STAGES entry: town must declare the custom mechanic ----
const townLineMatch = /^.*\{id:"town",.*$/m.exec(game);
check(!!townLineMatch, "town STAGES entry not found");
check(/mechanic:"townDock"/.test(townLineMatch[0]), 'town STAGES entry must declare mechanic:"townDock"');
check((game.match(/mechanic:"townDock"/g) || []).length === 1, 'mechanic:"townDock" must be declared exactly once');
check(/\bfunction isTownDockStage\(/.test(game), "isTownDockStage() guard helper missing");

// ---- buildQList / buildWorld / drawDots must route town through the same bypass as dino ----
check(/isDinoAdventureStage\(st\)\|\|isTownDockStage\(st\)\)\{qList=\[\];return;\}/.test(game), "buildQList must skip the per-question quiz list for town");
check(/isDinoAdventureStage\(st\)&&!isTownDockStage\(st\)\)for\(let i=0;i<QN;i\+\+\)/.test(game), "buildWorld must skip building the per-question tun gates for town");
check(/town\?TOWN_DOCK_STATION_COUNT:QN/.test(game) && /town\?townDockState\.stationIndex:qSeg/.test(game), "drawDots must show 3 town-dock station dots instead of QN quiz dots");

// ---- pending dispatcher wiring: single "townDock" pending value, not per-question "quiz" ----
check(/p===\"townDock\"\)showTownDockStop\(\);/.test(game), "gloop dispatcher missing the townDock branch");
check(/tickTownDockGame\(t,dt\);/.test(game), "gloop must tick the town dock physics every frame");
check(/isDinoAdventureStage\(\)\?\"dinoCrane\":isTownDockStage\(\)\?\"townDock\":\"quiz\"/.test(game), 'pending assignment must become a 3-way isDinoAdventureStage/isTownDockStage/quiz check');
check((game.match(/isDinoAdventureStage\(\)\?"dinoCrane":isTownDockStage\(\)\?"townDock":"quiz"/g) || []).length === 2, "the 3-way pending assignment must appear at both call sites (finishTunnelInterior + startJourneyAt)");
check((game.match(/if\(isTownDockStage\(\)\)startTownDockGame\(\);/g) || []).length === 2, "startTownDockGame() must be invoked alongside both pending assignments, mirroring startDinoAdventure()");

// ---- iOS pointercancel gotcha: pointerdown + pointerup/pointercancel/lostpointercapture + setPointerCapture ----
const beginHold = extractFunction(game, "beginTownDockHoldPointer");
const endHold = extractFunction(game, "endTownDockHoldPointer");
check(/setPointerCapture/.test(beginHold), "beginTownDockHoldPointer must capture the pointer");
check(/releasePointerCapture/.test(endHold), "endTownDockHoldPointer must release the pointer");
check(/townDockThrottle\.addEventListener\(\"pointerdown\",beginTownDockHoldPointer\)/.test(game), "throttle pointerdown wiring missing");
// Deliberately NOT the literal ["pointerup","pointercancel","lostpointercapture"] order dino uses:
// nazonazo_tunnel_dino_adventure_regression.cjs counts occurrences of that exact dino-authored
// literal via a raw source match to prove a pointercancel-removal mutation is caught; reusing the
// identical literal string here would pad that count and silently desensitize dino's own check.
// Same three event types, same "release on any of the three" contract, just a different (equally
// valid) array order so the two mechanics' wiring stay textually distinguishable.
check(/for\(const type of \[\"pointercancel\",\"pointerup\",\"lostpointercapture\"\]\)townDockThrottle\.addEventListener\(type,endTownDockHoldPointer\)/.test(game), "throttle release must be bound to pointerup+pointercancel+lostpointercapture together (iOS hold-drag gotcha)");
check(!/townDockKnob\.addEventListener\(["']pointer|handleTownDockPointerMove|moveTownDockKnobTo/.test(game), "there must be no direct knob-drag control; the knob is presentation only");

// ---- keyboard fallback shares held-direction state with pointer holding ----
const townDockHeldFunctions = [
  "beginTownDockHoldPointer", "endTownDockHoldPointer", "handleTownDockKeyDown", "handleTownDockKeyUp", "townDockHeld", "clearTownDockPointers"
].map(name => extractFunction(game, name)).join("\n");
check(/heldPointers/.test(townDockHeldFunctions) && /keyDirection/.test(townDockHeldFunctions), "pointer and keyboard must share held-direction state");
check(/townDockControls\.addEventListener\(\"keydown\",handleTownDockKeyDown\)/.test(game) && /townDockControls\.addEventListener\(\"keyup\",handleTownDockKeyUp\)/.test(game), "keyboard fallback wiring missing");

// ---- epoch guard: every deferred callback must check townDockState.epoch against a snapshot ----
const townDockTimeoutFn = extractFunction(game, "townDockTimeout");
check(/townDockState\.epoch!==epoch/.test(townDockTimeoutFn), "townDockTimeout must guard against a stale epoch using the live townDockState global (not a stale local alias)");
check(!/const state=townDockState,epoch=state\.epoch/.test(townDockTimeoutFn), "the epoch snapshot must not be read back off a stale local alias inside the deferred callback");
const focusNextFrameFn = extractFunction(game, "focusTownDockThrottleNextFrame");
check(/townDockState\.epoch!==epoch/.test(focusNextFrameFn), "focusTownDockThrottleNextFrame rAF callback must guard against a stale epoch");
check(/function resetTownDockGame\(\)\{[\s\S]*?nextEpoch=\(old&&old\.epoch\|\|0\)\+1/.test(game), "resetTownDockGame must bump the epoch on every reset");

// ---- pause/resume lifecycle wiring (document.hidden / resize / pageshow / pagehide) ----
// Note: pauseTownDockInput(true) is intentionally NOT placed directly after
// pauseDinoAdventureInput(true) in the visibilitychange hidden branch -- doing so pushed the gap
// between "visibilitychange" and "closeGameSettings()" past the 100-char window that
// nazonazo_settings_menu_regression.cjs asserts on, breaking an unrelated existing test. Both
// calls still fire inside the same hidden-branch block; just assert presence, not adjacency.
const visibilityHiddenBranch = /document\.addEventListener\(\"visibilitychange\",\(\)=>\{\s*if\(document\.hidden\)\{[\s\S]*?\}else\{/.exec(game);
check(!!visibilityHiddenBranch, "visibilitychange handler with a document.hidden branch missing");
check(/pauseDinoAdventureInput\(true\)/.test(visibilityHiddenBranch[0]) && /pauseTownDockInput\(true\)/.test(visibilityHiddenBranch[0]), "visibilitychange hidden branch must pause both dino and town dock input");
check(/resumeDinoAdventureInput\(\);\s*\n\s*resumeTownDockInput\(\);/.test(game), "visibilitychange visible branch must resume town dock input alongside dino");
check(/pauseTownDockInput\(true\)/.test(game) && /resumeTownDockInput\(\)/.test(game), "pause/resume functions must exist and be wired");

// ---- success/failure plumbing: must NOT use the per-question quiz transaction ----
const dedicated = townDockSection(game);
check(!/\bonPick\s*\(|renderChoiceCards\s*\(|showQuiz\s*\(/.test(dedicated), "town dock events must not call the per-question quiz/choice-card transaction");
check(/completeCurrentStage\(origin\(stg\)\)/.test(dedicated), "town dock must call completeCurrentStage exactly once when all stations clear");
check((dedicated.match(/completeCurrentStage\(/g) || []).length === 1, "completeCurrentStage must be called exactly once from the town dock section");
check(/stageMiss\+\+/.test(dedicated), "failed attempts must feed the shared stageMiss counter (drives the star rating)");
check(/if\(state\.completionCount>0\|\|!playing\|\|!isTownDockStage\(\)\)return;/.test(dedicated), "completeTownDockStage must be a one-shot guard, mirroring completeDinoAdventureStage");

// ---- retry-in-place hint escalation tiers ----
check(/attempts>=TOWN_DOCK_ASSIST_ATTEMPT_TIER/.test(dedicated) && /state\.assist=true/.test(dedicated), "3rd+ failed attempt must enable the auto-assist taper");
check(/attempts>=2\?TOWN_DOCK_ZONE_WIDEN_FACTOR:1/.test(game), "2nd failed attempt must widen the stop zone");
check(/attempts>=1&&state\.phase===\"run\"/.test(dedicated), "1st failed attempt must trigger the zone-edge blink");
check(numericConstant(game, "TOWN_DOCK_ASSIST_ATTEMPT_TIER") === 3, "assist tier must kick in at the 3rd failed attempt per spec");

// ---- station reset never rewinds progress: retry only resets pos/vel, never stationIndex ----
const failFn = extractFunction(game, "resolveTownDockFail");
check(/state\.pos=0;state\.vel=0;state\.oscPhase=0;state\.phase=\"run\";/.test(failFn), "retry must reset only the local approach physics, not stationIndex");
check(!/stationIndex\s*=\s*0/.test(failFn), "a failed attempt must never rewind stationIndex back to an earlier station");

// ---- hiragana/katakana voice lines exist and are wired into the guide/stamp feedback ----
check(/undershoot:"もう すこし まえで とまろう"/.test(game), "undershoot hint copy missing/changed");
check(/overshoot:"すこし はやすぎたかな"/.test(game), "overshoot hint copy missing/changed");
check(/success:"ぴたっと とまれたね!"/.test(game), "success line missing/changed");
check(/allClear:"みんな のせられたね！まちが あかるくなったよ"/.test(game), "all-stations-clear line missing/changed");

// ---- CSS contract ----
check(/#townDockLayer\{/.test(css), "town dock layer CSS missing");
check(/\.town-dock-track\{/.test(css) && /\.town-dock-zone\{/.test(css) && /\.town-dock-knob\{/.test(css), "town dock gauge CSS missing");
check(/#townDockThrottle\{/.test(css), "throttle button CSS missing");
check(/@media \(prefers-reduced-motion:reduce\)\{[\s\S]*\.town-dock-villager,\.town-dock-windows i,\.town-dock-knob,\.town-dock-zone\{transition:none!important\}/.test(css), "reduced-motion override for town dock missing");

// ---- station config sanity (small hardcoded array; no vm pure-logic harness needed) ----
const stations = extractArray(game, "TOWN_DOCK_STATIONS");
check(stations.length === 3, "must have exactly 3 stations");
check(stations[0].zoneWidth > stations[1].zoneWidth, "station 1 must have a wider (easier) stop zone than station 2, per the escalating-difficulty spec");
stations.forEach((station, index) => {
  const halfWidth = station.zoneWidth / 2 + (station.oscAmplitude || 0);
  check(station.zoneCenter - halfWidth >= 0 && station.zoneCenter + halfWidth <= 100,
    `station ${index}: zone (with oscillation) must stay within the 0..100 track bounds`);
});
check(stations[2].oscAmplitude > 0 && stations[0].oscAmplitude === 0 && stations[1].oscAmplitude === 0,
  "only the 3rd station may oscillate, per spec");
check(stations[2].oscAmplitude <= stations[2].zoneWidth * 0.35 && stations[2].oscAmplitude >= stations[2].zoneWidth * 0.2,
  "3rd station oscillation amplitude must be roughly 30% of the zone width, not a fast-moving target");

console.log(`nazonazo town dock (pitatto teisha) regression: OK (${checks} checks)`);
