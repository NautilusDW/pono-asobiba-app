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
// v3 redesign: the v2 bespoke "#townDockApproachLayer" scrolling layer (itself a replacement for
// the v1 abstract gauge) is *also* gone now -- per user feedback, inventing any parallel visual
// system was the wrong move. v3 reuses the exact same real world/#veh/#cars/.tun.station machinery
// every other stage already uses: townDockState.pos is now written straight into the shared
// worldX, and buildWorld() grows a small isTownDockStage() branch that emits 3 real .tun.station
// gates (see below). Only the HUD ids (progress/guide/controls/throttle) remain from prior rounds.
for (const id of ["townDockLayer", "townDockTitle", "townDockProgress", "townDockGuide", "townDockControls", "townDockThrottle"]) {
  check((html.match(new RegExp(`id=["']${id}["']`, "g")) || []).length === 1, `DOM id ${id} must exist exactly once`);
}
check(/<section id="townDockLayer" data-phase="idle"[^>]*hidden>/.test(html), "town dock layer must start idle and hidden");
check(/<button id="townDockThrottle" type="button"/.test(html), "townDockThrottle must be a real button");
check(/id="townDockProgress" role="status" aria-live="polite"/.test(html), "progress status readout missing");
check(/id="townDockGuide" role="status" aria-live="polite"/.test(html), "guide status readout missing");
check(!/id="townDockRetry"/.test(html), "retry must happen automatically in place, not via an explicit retry button");
check(!/townDockApproachLayer|townDockStationMarker|town-dock-track|town-dock-zone|town-dock-knob|town-dock-villager|town-dock-windows|town-dock-approach-layer|town-dock-station-marker|town-dock-station-art\{|town-dock-station-bubble/.test(html + css),
  "neither the v1 abstract gauge nor the v2 bespoke approach-layer/marker may survive in HTML or CSS -- v3 must render through the real world/#veh/.tun.station machinery only");

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

// ---- v3: buildWorld must generate 3 REAL .tun.station gates for town, reusing the exact same
// DOM/asset pattern every other stage's station checkpoints use (not a bespoke element) ----
const buildWorldFn = extractFunction(game, "buildWorld");
check(/\}else if\(isTownDockStage\(st\)\)\{/.test(buildWorldFn), "buildWorld needs a dedicated isTownDockStage() branch alongside the existing QN-gate loop");
const townDockGateBranch = buildWorldFn.slice(buildWorldFn.indexOf("}else if(isTownDockStage(st)){"), buildWorldFn.indexOf("if(!isMainlineFinalStg(stg)){"));
check(/for\(let i=0;i<TOWN_DOCK_STATION_COUNT;i\+\+\)/.test(townDockGateBranch), "must generate exactly TOWN_DOCK_STATION_COUNT (3) gates, not QN (5)");
check(/class="station-art"/.test(townDockGateBranch) && /bgUrl\(st\.assets\.station\)/.test(townDockGateBranch), "must reuse the exact same .station-art + ASSETS.town.station pattern as every other stage's checkpoints, not a new asset");
check(/t\.style\.left=tunX\(o,i\)\+"vw"/.test(townDockGateBranch), "gates must sit at the real tunX(o,i) world position, same formula as every other stage");
check(/hp\.className="station-helper town-dock-station-helper"/.test(townDockGateBranch), "must include a waiting-villager element using the same .station-helper visual grammar as the classic town quiz flow");
check(/townDockGates\.push\(t\)/.test(townDockGateBranch), "town-dock gates must be pushed to the dedicated townDockGates array");
check(!/tunnels\.push/.test(townDockGateBranch), "town-dock gates must NOT be pushed into the shared tunnels[] array (onPick's classic quiz flow reads tunnels; townDock must stay fully decoupled from it)");
check(!/RUN_EVENTS|qList\[i\]\.helper|decor/.test(townDockGateBranch), "the minimal town-dock gate branch must not copy the quiz-only RUN_EVENTS/decor/qList[i].helper machinery from the QN loop");
check(/townDockGates=\[\]/.test(buildWorldFn), "townDockGates must be reset alongside tunnels on every buildWorld() call");

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
check(!/townDockGates\[[^\]]*\]\.addEventListener\(["']pointer|handleTownDockPointerMove|moveTownDockKnobTo|moveTownDockStationMarkerTo/.test(game), "there must be no direct drag control on the real gates; approach is driven purely by writing worldX from state.pos in tickTownDockGame");

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
check(/state\.pos=0;state\.vel=0;state\.oscPhase=0;state\.armed=false;state\.phase=\"run\";/.test(failFn), "retry must reset only the local approach physics (incl. the armed gate), not stationIndex");
check(!/stationIndex\s*=\s*0/.test(failFn), "a failed attempt must never rewind stationIndex back to an earlier station");

// ---- regression guard: premature auto-fail before any input, and lost-hold-across-transitions ----
// A real Playwright run caught both of these; the static checks above did not, since they only
// pattern-match source text. Encode the fix's invariants explicitly so they can't silently regress.
const tickFn = extractFunction(game, "tickTownDockGame");
check(/armed:false/.test(extractFunction(game, "createTownDockState")), "state must start unarmed so a fresh/retried station never judges before any input");
check(/if\(state\.pos>0\)state\.armed=true;/.test(tickFn), "armed must only flip true once the train has actually left position 0 (i.e. real acceleration happened)");
check(/if\(!state\.armed\)return;/.test(tickFn), "pass/fail judging must be skipped entirely until armed -- otherwise pos=0,vel=0 at station start/retry reads as an instant settled-undershoot");
const beginStationFn = extractFunction(game, "beginTownDockStation");
check(/state\.armed=false/.test(beginStationFn), "beginTownDockStation must reset armed for the fresh station");
check(!/clearTownDockPointers\(\)/.test(failFn), "resolveTownDockFail must NOT clear heldPointers -- a player holding through the retry pause fires no new pointerdown, so clearing here permanently drops their hold");
const successFn = extractFunction(game, "resolveTownDockSuccess");
check(!/clearTownDockPointers\(\)/.test(successFn), "resolveTownDockSuccess must NOT clear heldPointers -- a player holding through the station-to-station transition must stay recognized as held");
check(/clearTownDockPointers\(\)/.test(extractFunction(game, "completeTownDockStage")), "completeTownDockStage (the real, final exit) should still clear pointers/capture");
check(!/townDockThrottle\.disabled=/.test(extractFunction(game, "updateTownDockThrottlePresentation")), 'updateTownDockThrottlePresentation must never set the native "disabled" attribute: per the Pointer Events spec, disabling a pointer-captured element implicitly releases capture (fires lostpointercapture), which would silently drop a continuous hold. Use a CSS class instead.');
check(/is-waiting/.test(css) && /is-waiting/.test(game), "a non-disabling is-waiting visual state must exist to replace the old :disabled dimming");

// ---- regression guard: reported "held with zero input, infinite fail loop" incident ----
// A user reported the train failing forever without ever touching the throttle. A dedicated
// Playwright run with true zero input over 22s showed no issue with the armed gate itself, which
// points at (a) a stale cached build predating the armed fix, and/or (b) a real device silently
// dropping a pointer release event so heldPointers never clears. (a) is addressed by bumping
// CACHE_VERSION below; (b) is addressed by this self-healing reconciliation.
const reconcileFn = extractFunction(game, "reconcileTownDockPointers");
check(/hasPointerCapture/.test(reconcileFn), "must reconcile heldPointers against the browser's own hasPointerCapture() truth, self-healing a pointer whose release event never reached us");
check(/state\.heldPointers\.delete\(pointerId\)/.test(reconcileFn), "must actually remove a pointerId once the browser confirms it is no longer captured");
check(/if\(state\.heldPointers\.size\)reconcileTownDockPointers\(\);/.test(tickFn), "tickTownDockGame must reconcile stale pointer capture every frame before computing held");

// ---- regression guard: real boarding must replace the old CSS-shape villager/window-lights ----
// Per user feedback the visuals didn't read as connected to the real train. Station clear must now
// drive the game's own real passenger system (boardPassenger -> #cars), not a bespoke stand-in.
check(!/body\.town-dock-active #veh,body\.town-dock-active #cars\{visibility:hidden!important\}/.test(css), "the real locomotive/cars must stay visible during town-dock (previously force-hidden)");
check(/boardPassenger\(passenger,null,gate\)/.test(dedicated), "station clear must call the game's real boardPassenger() (arc-flight + seat in #cars) using the just-cleared REAL gate as the flight-origin element, not a bespoke CSS villager");
check(/gate\.classList\.add\("open"\)/.test(dedicated), "the cleared real gate should get the same .open treatment (door opens, sign flips to ○) every other stage's stations already use on a correct answer");
const passengers = extractArray(game, "TOWN_DOCK_PASSENGERS");
check(passengers.length === numericConstant(game, "TOWN_DOCK_STATION_COUNT"), "must have exactly one simple passenger object per station");
passengers.forEach((p, i) => check(typeof p.e === "string" && p.e.length > 0 && typeof p.t === "string" && p.t.length > 0, `passenger ${i} needs an emoji (e) and hiragana/katakana label (t) so boardPassenger's createQuizArt fallback and zukan registration both work`));
check(new Set(passengers.map(p => p.e)).size === passengers.length, "the 3 town-dock passengers should be visually distinct");
check(/veh\.classList\.toggle\("go",held\);veh\.classList\.toggle\("idle",!held\)/.test(extractFunction(game, "updateTownDockThrottlePresentation")), "holding the throttle must toggle the real #veh.go/.idle classes (real wheel-spin/smoke), not a new abstract indicator");

// ---- hiragana/katakana voice lines exist and are wired into the guide/stamp feedback ----
check(/undershoot:"もう すこし まえで とまろう"/.test(game), "undershoot hint copy missing/changed");
check(/overshoot:"すこし はやすぎたかな"/.test(game), "overshoot hint copy missing/changed");
check(/success:"ぴたっと とまれたね!"/.test(game), "success line missing/changed");
check(/allClear:"みんな のせられたね！まちが あかるくなったよ"/.test(game), "all-stations-clear line missing/changed");

// ---- CSS contract ----
check(/#townDockLayer\{/.test(css), "town dock layer CSS missing");
check(/\.town-dock-station-helper-figure\{/.test(css), "the CSS-shape waiting-villager figure (no new image asset) inside the real .station-helper must exist");
check(/\.tun\.is-blink\{/.test(css), "hint-tier-1 blink must target the real gate element directly (no bespoke marker to blink anymore)");
check(/#townDockThrottle\{/.test(css), "throttle button CSS missing");
check(/@media \(prefers-reduced-motion:reduce\)\{[\s\S]*\.tun\.is-blink\{animation:none!important/.test(css), "reduced-motion override for the real gate's blink missing");
// body.town-dock-active must no longer hide #veh/#cars (checked above in the DOM contract via the
// exact old rule text), and there must be no separate z-index-layered approach scene anymore --
// the real .tun.station gates live inside #world itself and inherit its stacking/scroll for free.
check(!/#townDockApproachLayer/.test(css), "no separate approach-layer stacking context should exist in v3");

// ---- regression guard: the visual redesign must be presentation-only ----
// syncTownDockPresentation() may READ townDockState fields to decide what to draw, but it must
// never WRITE to any of the physics/judgment fields -- that would blur the line between
// "presentation" and "the state machine three reviews already stabilized."
const presentationFn = extractFunction(game, "syncTownDockPresentation");
check(!/state\.(pos|vel|armed|attempts|assist|phase|stationIndex|oscPhase)\s*=(?!=)/.test(presentationFn), "syncTownDockPresentation must only read townDockState, never assign to its physics/judgment fields");

// ---- v3 core: townDockApproachStartX bridges the untouched local pos scale onto the real worldX
// coordinate system, and tickTownDockGame writes worldX (NOT a bespoke marker position) ----
check(/function townDockApproachStartX\(stationIndex\)\{/.test(game), "townDockApproachStartX bridge function missing");
const approachStartXFn = extractFunction(game, "townDockApproachStartX");
check(/return stops\(origin\(stg\),stationIndex\)-TOWN_DOCK_STATIONS\[stationIndex\]\.zoneCenter;/.test(approachStartXFn), "townDockApproachStartX must equal stops(origin(stg),i)-zoneCenter[i] -- the same real per-gate stop offset every other stage uses, minus the untouched zoneCenter so pos===zoneCenter lines up exactly with the real gate");
check(/worldX=townDockApproachStartX\(state\.stationIndex\)\+state\.pos;/.test(tickFn), "tickTownDockGame must write the real worldX (position bridge) right after computing state.pos, so the existing unconditional render()'s world.style.transform picks it up for free -- no bespoke rendering code needed");
// The worldX write must sit strictly AFTER the untouched physics (state.pos=nextPos) and BEFORE
// the untouched armed/settled/undershoot/overshoot judgment, proving it's a bridge, not a rewrite.
const tickPosIdx = tickFn.indexOf("state.pos=nextPos;");
const tickWorldXIdx = tickFn.indexOf("worldX=townDockApproachStartX(state.stationIndex)+state.pos;");
const tickArmedIdx = tickFn.indexOf("if(state.pos>0)state.armed=true;");
check(tickPosIdx >= 0 && tickWorldXIdx > tickPosIdx && tickArmedIdx > tickWorldXIdx, "worldX bridge must be written after the physics update and before the untouched armed/judgment logic, changing nothing about the judgment itself");
check(!/driving\s*=\s*true/.test(tickFn) && !/driving\s*=\s*false/.test(tickFn), "tickTownDockGame must never touch `driving` itself -- the shared cruise (driving=true) and the local per-frame worldX write are mutually exclusive by construction (phase!=='run' gates the whole function), and must stay that way");

// ---- v3: the initial cruise now stops at the approach START (not the first gate itself) ----
check(/target=townDockApproachStartX\(0\);pending="townDock";driving=true;/.test(extractFunction(game, "startTownDockGame")), 'startTownDockGame must cruise to townDockApproachStartX(0) (where the player then takes over), not directly to the first station stop');

// ---- v3: station-to-station transition bridges via the existing shared cruise, not a pos-reset
// teleport (GAP=430vw between real gates vs. at most 100vw of local approach distance -- a direct
// reset would visibly teleport worldX by 300+vw) ----
check(/target=townDockApproachStartX\(state\.stationIndex\);pending="townDock";driving=true;/.test(successFn), "resolveTownDockSuccess must hand the non-last transition off to the shared cruise (driving=true) toward the next station's approach start, not jump state.pos to 0 directly under an unrelated worldX");
check(/townDockState\.stationIndex/.test(extractFunction(game, "showTownDockStop")), "showTownDockStop must resume at townDockState.stationIndex (not a hardcoded 0), since the shared-cruise bridge reuses this same dispatch for station 2 and 3 too");

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
