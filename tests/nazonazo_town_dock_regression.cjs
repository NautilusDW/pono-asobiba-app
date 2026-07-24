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
check(/@media \(prefers-reduced-motion:reduce\)\{[\s\S]*\.town-dock-approach-arrow-glyph\{animation:none!important/.test(css), "reduced-motion override for the approach-arrow's bounce missing");
// body.town-dock-active must no longer hide #veh/#cars (checked above in the DOM contract via the
// exact old rule text), and there must be no separate z-index-layered approach scene anymore --
// the real .tun.station gates live inside #world itself and inherit its stacking/scroll for free.
check(!/#townDockApproachLayer/.test(css), "no separate approach-layer stacking context should exist in v3");

// ---- v5 (round7 追補): on-track brake-zone strip + green stop-target box + approach arrow,
// replacing the old abstract floating gauge concept entirely. A user screenshot review found
// two problems with the first v4 cut: (1) placed at low "track height" inside #world, the zone
// was hidden behind the foreground decor layer #fgT (z-index:8) because #world establishes its
// own stacking context (position:absolute + z-index:3), so no child z-index can ever paint above
// a *sibling* of #world -- moving the zone up to bottom:18-19vh "fixed" the occlusion but made it
// read as a floating band disconnected from the track/station art, which is what the user then
// flagged. (2) the zone's world-space anchor was derived from legLen (distance to the quiz-style
// stops(o,i) checkpoint), which is CHECKPOINT_STOP_LEFT_VW(24vw) *before* the real gate's rendered
// left edge (tunX(o,i)=stops(o,i)+24) -- so the stop-box never actually reached the gate art.
// v5 fixes both: the three elements move to be direct children of #scene (siblings of
// #world/#fgT/#veh, escaping #world's stacking context so a z-index above #fgT actually works),
// positioned every frame via the same "transform:translate3d(cssXFromVw(worldSpaceX-worldX),0,0)"
// technique the branch-stage-polish sprites already use elsewhere in this file for world-synced
// sibling layers; and the zone's center is now anchored directly to the real gate's own coordinate
// (tunX(origin(stg),stationIndex)), not a legLen subtraction. ----
check(/\.town-dock-brake-zone\{/.test(css), "brake-zone strip CSS missing");
check(/\.town-dock-stop-box\{/.test(css), "stop-target box CSS missing");
check(/\.town-dock-approach-arrow\{/.test(css) && /\.town-dock-approach-arrow-glyph\{/.test(css), "approach-arrow guide CSS (outer position element + inner bouncing glyph) missing");
check(!/\.town-dock-brake-zone\{[^}]*position:\s*fixed/.test(css) && !/\.town-dock-stop-box\{[^}]*position:\s*fixed/.test(css) && !/\.town-dock-approach-arrow\{[^}]*position:\s*fixed/.test(css),
  "brake-zone/stop-box/approach-arrow must be position:absolute, never position:fixed (that would reintroduce the floating-HUD-bar anti-pattern the user explicitly rejected)");
// v5: colors must read as "approach / OK to release", not the old orange/red "danger" language.
check(!/\.town-dock-stop-box\{[^}]*#ff3b30/.test(css) && !/\.town-dock-brake-zone\{[^}]*rgba\(255,1[34]\d,\d+/.test(css),
  "v5: the old orange/red danger-colored brake-zone/stop-box must be gone, replaced by a blue(approach)/green(OK-to-release) color language per user feedback");
check(/\.town-dock-stop-box\{[^}]*border:5px solid #2ecc71/.test(css), "stop-box border must be green (release-here-OK signal), not the old red");
// v5: z-index must clear the foreground decor layer #fgT (z-index:8, a *sibling* of #scene's other
// children) -- anything less would silently re-hide the zone behind foreground bushes/fences again.
const zoneZIndexMatch = /\.town-dock-brake-zone\{[^}]*z-index:(\d+)/.exec(css);
const boxZIndexMatch = /\.town-dock-stop-box\{[^}]*z-index:(\d+)/.exec(css);
const arrowZIndexMatch = /\.town-dock-approach-arrow\{[^}]*z-index:(\d+)/.exec(css);
check(!!zoneZIndexMatch && Number(zoneZIndexMatch[1]) > 8, "brake-zone z-index must be greater than #fgT's z-index:8, or it will be hidden behind foreground decor again");
check(!!boxZIndexMatch && Number(boxZIndexMatch[1]) > 8, "stop-box z-index must be greater than #fgT's z-index:8, or it will be hidden behind foreground decor again");
check(!!arrowZIndexMatch && Number(arrowZIndexMatch[1]) > 8, "approach-arrow z-index must be greater than #fgT's z-index:8, or it will be hidden behind foreground decor again");
check(/const world=\$\("world"\),scene=\$\("scene"\)/.test(game), "module-level `scene` element ref missing (needed to host the brake-zone/stop-box/arrow as #world's siblings)");
check(/let townDockZoneEl=null,townDockStopBoxEl=null,townDockArrowEl=null;/.test(game), "module-level refs for the brake-zone/stop-box/arrow elements missing");
const buildWorldFnV5 = extractFunction(game, "buildWorld");
check(/townDockZoneEl=document\.createElement\("div"\)/.test(buildWorldFnV5) && /townDockZoneEl\.className="town-dock-brake-zone"/.test(buildWorldFnV5), "buildWorld must create the brake-zone element inside the isTownDockStage() branch, same as the .tun.station gates");
check(/townDockStopBoxEl=document\.createElement\("div"\)/.test(buildWorldFnV5) && /townDockStopBoxEl\.className="town-dock-stop-box"/.test(buildWorldFnV5), "buildWorld must create the stop-box element inside the isTownDockStage() branch, same as the .tun.station gates");
check(/townDockArrowEl=document\.createElement\("div"\)/.test(buildWorldFnV5) && /townDockArrowEl\.className="town-dock-approach-arrow"/.test(buildWorldFnV5), "buildWorld must create the approach-arrow element inside the isTownDockStage() branch");
check(/const zoneHost=scene\|\|world;/.test(buildWorldFnV5), "v5: brake-zone/stop-box/arrow must be hosted on #scene (falling back to #world only if #scene is somehow missing), not literally forced into #world's stacking context");
check(/zoneHost\.appendChild\(townDockZoneEl\)/.test(buildWorldFnV5) && /zoneHost\.appendChild\(townDockStopBoxEl\)/.test(buildWorldFnV5) && /zoneHost\.appendChild\(townDockArrowEl\)/.test(buildWorldFnV5), "brake-zone/stop-box/arrow must be appended to the zoneHost (#scene), not literally into #world (which would reintroduce the z-index/stacking-context bug)");
check(/if\(townDockZoneEl&&townDockZoneEl\.parentNode\)townDockZoneEl\.parentNode\.removeChild\(townDockZoneEl\);/.test(buildWorldFnV5), "buildWorld must explicitly remove any previous brake-zone element before recreating it -- world.innerHTML=\"\" no longer clears these since v5 moved them off of #world");
check(/function townDockUpdateZoneVisual\(\)\{/.test(game), "townDockUpdateZoneVisual() missing -- must position the brake-zone/stop-box/arrow from real leg/zone geometry every frame");
const zoneVisualFn = extractFunction(game, "townDockUpdateZoneVisual");
check(/function townDockWorldToScreenVw\(worldSpaceX\)\{return worldSpaceX-worldX;\}/.test(game), "townDockWorldToScreenVw bridge missing -- must convert a real world-space vw coordinate into a worldX-relative screen offset (worldSpaceX-worldX), mirroring the same math #world's own translate3d(-worldX,...) applies to its children");
check(/townDockZoneEl\.style\.transform="translate3d\("\+cssXFromVw\(townDockWorldToScreenVw\(state\.legStartX\+warnStart\)\)\+",0,0\)";/.test(zoneVisualFn), "brake-zone position must be written via transform:translate3d(cssXFromVw(worldSpaceX-worldX),...) every frame, not a static #world-relative left (v5: no longer a child of #world)");
check(/townDockStopBoxEl\.style\.transform="translate3d\("\+cssXFromVw\(townDockWorldToScreenVw\(state\.legStartX\+bounds\.start\)\)\+",0,0\)";/.test(zoneVisualFn), "stop-box position must be written via transform:translate3d(cssXFromVw(worldSpaceX-worldX),...) every frame, matching the exact success-judgment zone (bounds.start..bounds.end)");
check(/townDockArrowEl\.style\.transform=/.test(zoneVisualFn) && /townDockArrowEl\.style\.opacity=/.test(zoneVisualFn), "approach-arrow position/intensity must be updated every frame from real zone geometry");
check(/townDockUpdateZoneVisual\(\);/.test(extractFunction(game, "syncTownDockPresentation")), "syncTownDockPresentation (called every tick) must refresh the brake-zone/stop-box/arrow position every frame, so the 3rd station's oscillating zone stays in sync");
// v5: the arrow's worldX-synced *position* transform (written every frame from JS) must never be
// animated by the same CSS property via a keyframe animation on the same element -- a CSS
// animation targeting `transform` overrides the inline style while running, which would silently
// break the worldX position sync. The bounce must live on a separate inner glyph element instead.
check(!/\.town-dock-approach-arrow\{[^}]*animation:/.test(css), "the OUTER .town-dock-approach-arrow (JS-positioned every frame) must not carry a CSS transform-animation itself -- that would fight the per-frame worldX sync");
check(/\.town-dock-approach-arrow-glyph\{[^}]*animation:townDockArrowBounce/.test(css), "the bounce animation must live on the inner .town-dock-approach-arrow-glyph, decoupled from the outer element's JS-driven position transform");

// ---- regression guard: the visual redesign must be presentation-only ----
// syncTownDockPresentation() may READ townDockState fields to decide what to draw, but it must
// never WRITE to any of the physics/judgment fields -- that would blur the line between
// "presentation" and "the state machine three reviews already stabilized."
const presentationFn = extractFunction(game, "syncTownDockPresentation");
check(!/state\.(pos|vel|armed|attempts|assist|phase|stationIndex|oscPhase)\s*=(?!=)/.test(presentationFn), "syncTownDockPresentation must only read townDockState, never assign to its physics/judgment fields");

// ---- v4 (round7) core: each leg now spans the REAL full inter-station distance (not just a
// short final stretch), and the leg's start-X is carried on townDockState.legStartX itself
// (set once per leg in beginTownDockStation) rather than derived from a fixed per-station
// offset function. tickTownDockGame writes worldX=legStartX+pos (NOT a bespoke marker
// position, and NOT the old townDockApproachStartX(stationIndex)+pos formula) ----
check(!/function townDockApproachStartX\(/.test(game), "v4: townDockApproachStartX (the old short-final-stretch bridge) must be removed, not just renamed -- legStartX replaces it");
check(/legStartX:0/.test(extractFunction(game, "createTownDockState")), "townDockState must carry a legStartX field (worldX corresponding to pos===0 for the current leg)");
check(/worldX=state\.legStartX\+state\.pos;/.test(tickFn), "tickTownDockGame must write the real worldX (position bridge) as legStartX+pos right after computing state.pos, so the existing unconditional render()'s world.style.transform picks it up for free -- no bespoke rendering code needed");
// The worldX write must sit strictly AFTER the untouched physics (state.pos=nextPos) and BEFORE
// the untouched armed/settled/undershoot/overshoot judgment, proving it's a bridge, not a rewrite.
const tickPosIdx = tickFn.indexOf("state.pos=nextPos;");
const tickWorldXIdx = tickFn.indexOf("worldX=state.legStartX+state.pos;");
const tickArmedIdx = tickFn.indexOf("if(state.pos>0)state.armed=true;");
check(tickPosIdx >= 0 && tickWorldXIdx > tickPosIdx && tickArmedIdx > tickWorldXIdx, "worldX bridge must be written after the physics update and before the untouched armed/judgment logic, changing nothing about the judgment itself");
check(!/driving\s*=\s*true/.test(tickFn) && !/driving\s*=\s*false/.test(tickFn), "tickTownDockGame must never touch `driving` itself -- the shared cruise (driving=true) and the local per-frame worldX write are mutually exclusive by construction (phase!=='run' gates the whole function), and must stay that way");

// ---- v4 (round7): the user-reported regression was that MOST of the inter-station distance was
// covered by an automatic hand-off to the shared cruise (driving=true), with only a short final
// stretch under local hold/release control -- reading as "it drives itself, then suddenly stops
// with a fresh depart button" at every station, not just once at the very start. That hand-off
// mechanism must be fully gone: no code path may set pending="townDock" with driving=true. ----
check(!/pending\s*=\s*"townDock"/.test(game), 'v4: no code may set pending="townDock" anymore -- that string was the marker for the removed automatic-cruise-for-long-haul hand-off; every leg is now driven end-to-end by the local physics only');
const startGameFn = extractFunction(game, "startTownDockGame");
check(/driving=false/.test(startGameFn), "startTownDockGame must explicitly keep driving=false -- the very first leg (stage entry -> station 1) is local-physics-driven from the start, not handed to the shared cruise");
check(/showTownDockStop\(\);/.test(startGameFn), "startTownDockGame must call showTownDockStop() directly and synchronously (no async cruise-then-dispatch detour) to begin the first leg");
const successFnBody = extractFunction(game, "resolveTownDockSuccess");
check(!/driving\s*=\s*true/.test(successFnBody), "resolveTownDockSuccess must never set driving=true -- the next leg (if any) starts via a direct beginTownDockStation() call, continuing seamlessly from wherever the train actually stopped");
check(/else beginTownDockStation\(state\.stationIndex\);/.test(successFnBody), "resolveTownDockSuccess must start the next leg with a direct beginTownDockStation() call (no teleport, no shared-cruise hand-off) once the non-last station's boarding pause elapses");

// ---- v4 (round7): beginTownDockStation must capture legStartX from the live worldX at call
// time. For station 0 this is the stage entry position (startTownDockGame sets worldX=origin(stg)
// immediately before calling showTownDockStop()->beginTownDockStation(0)); for stations 1/2 this
// is wherever the train actually settled (tickTownDockGame never writes worldX while
// phase!=="run", so worldX is frozen at the exact settle point through the boarding pause) ----
const beginStationFnV4 = extractFunction(game, "beginTownDockStation");
check(/state\.legStartX=worldX;/.test(beginStationFnV4), "beginTownDockStation must snapshot the live worldX into state.legStartX -- this is what makes leg transitions seamless (zero teleport) instead of jumping to a fixed per-station offset");

// ---- v4 (round7): each leg's real length is derived from the real stops()/origin() geometry,
// not a fixed shared constant -- leg 0 (stage entry -> station 1) is shorter (~296vw, INTRO minus
// the checkpoint offset) than legs 1/2 (station -> station, a full GAP=430vw) ----
check(/function townDockLegLen\(\)\{/.test(game), "townDockLegLen() helper missing -- must compute the current leg's real vw length from stops(origin(stg),stationIndex)-legStartX");
const legLenFn = extractFunction(game, "townDockLegLen");
check(/stops\(origin\(stg\),townDockState\.stationIndex\)-townDockState\.legStartX/.test(legLenFn), "townDockLegLen must be derived from the real stops()/legStartX geometry, never a fixed constant");
// v5: the hard position clamp must be at least bounds.end+margin, not just townDockLegLen() alone.
// Since v5 anchors the success zone to the real gate (tunX(o,i), which sits CHECKPOINT_STOP_LEFT_VW
// (24vw) *past* stops(o,i)), bounds.end can now legitimately exceed townDockLegLen() -- clamping to
// townDockLegLen() alone would make the far part of the zone physically unreachable.
check(/const trackLen=Math\.max\(townDockLegLen\(\),bounds\.end\+40\);/.test(tickFn) && /nextPos>=trackLen/.test(tickFn), "tickTownDockGame's hard position clamp must be max(townDockLegLen(), bounds.end+margin) so the gate-anchored zone's far edge always stays physically reachable");

// ---- station config sanity: zoneWidth/zoneGateAnchorVw are real vw quantities (not a 0..100
// abstract scale), and zoneCenter is derived at runtime directly from the real gate's own
// coordinate (tunX(origin(stg),stationIndex)) so the same knobs work correctly whether the
// current leg is ~296vw (station 1) or ~430vw (stations 2/3) ----
const stations = extractArray(game, "TOWN_DOCK_STATIONS");
check(stations.length === 3, "must have exactly 3 stations");
check(stations.every(s => typeof s.zoneWidth === "number" && typeof s.zoneGateAnchorVw === "number" && !("zoneCenter" in s) && !("zoneEndGap" in s)),
  "v5: station knobs must be zoneWidth/zoneGateAnchorVw (real vw), not a precomputed zoneCenter and not the v4 zoneEndGap (which was derived from legLen, not the real gate, and put the zone ~32vw before the gate art)");
check(stations[0].zoneWidth > stations[1].zoneWidth, "station 1 must have a wider (easier) stop zone than station 2, per the escalating-difficulty spec");
check(stations.every(s => s.zoneWidth >= 30), "every station's stop zone must be a reasonably sized real-vw window a child can react to, not razor-thin");
check(stations[2].oscAmplitude > 0 && stations[0].oscAmplitude === 0 && stations[1].oscAmplitude === 0,
  "only the 3rd station may oscillate, per spec");
check(stations[2].oscAmplitude <= stations[2].zoneWidth * 0.35 && stations[2].oscAmplitude >= stations[2].zoneWidth * 0.2,
  "3rd station oscillation amplitude must be roughly 30% of the zone width, not a fast-moving target");
// v5: zoneGateAnchorVw must actually land the zone's center within (or immediately adjacent to)
// the real gate art's 49vw width, so the zone visually overlaps the station image rather than
// sitting tens of vw before it (the exact bug the user's screenshot review caught in v4).
check(stations.every(s => s.zoneGateAnchorVw >= 0 && s.zoneGateAnchorVw <= 49), "zoneGateAnchorVw must land within the real .tun.station gate's 49vw width (see styles.css .tun.station{width:49vw}), so the success zone visually overlaps the station art");
const gateAnchorPosFn = extractFunction(game, "townDockGateAnchorPos");
check(/tunX\(origin\(stg\),townDockState\.stationIndex\)-townDockState\.legStartX/.test(gateAnchorPosFn), "townDockGateAnchorPos must be derived from tunX(origin(stg),stationIndex) -- the exact same real coordinate buildWorld() uses as the .tun.station gate's own left edge (t.style.left=tunX(o,i)+\"vw\") -- not stops(o,i) or legLen (both of which sit CHECKPOINT_STOP_LEFT_VW=24vw before the gate's actual rendered position)");
const zoneCenterFn = extractFunction(game, "townDockZoneCenter");
check(/townDockGateAnchorPos\(\)\+station\.zoneGateAnchorVw/.test(zoneCenterFn), "zoneCenter must be townDockGateAnchorPos()+zoneGateAnchorVw so the success zone is anchored directly to the real gate's own coordinate, not derived from legLen (which the v4 cut got wrong by 24vw+)");

// ---- v4 (round7): the assist (3rd+ attempt auto-taper) safety net must converge to a stop in a
// bounded amount of time regardless of how long the current leg is. A physics-inconsistent
// ad hoc taper (constant fraction of cruise speed, decelerated at the same gentle rate used for
// normal player releases) was caught taking 60+ real seconds to converge once legs got long --
// effectively an unbounded stall, defeating the "guarantee a stuck child can still eventually
// succeed" purpose. The fix: a dedicated (stronger) assist deceleration rate, and a target speed
// computed each frame as the exact speed that stops precisely at the zone center under that rate. ----
check(/TOWN_DOCK_ASSIST_DECEL_RATE/.test(game), "a dedicated assist deceleration rate constant must exist, separate from the normal release-coast TOWN_DOCK_DECEL_RATE");
const tickAssistBlock = tickFn.slice(tickFn.indexOf("if(state.assist){"), tickFn.indexOf("const decelRate="));
check(/Math\.sqrt\(2\*TOWN_DOCK_ASSIST_DECEL_RATE\*remaining\)/.test(tickAssistBlock), "assist target speed must be the physically-correct stopping speed (sqrt(2*decelRate*remaining)) so convergence time stays bounded no matter how long the leg is");
check(/decelRate=state\.assist\?TOWN_DOCK_ASSIST_DECEL_RATE:TOWN_DOCK_DECEL_RATE/.test(tickFn), "the accel/decel clamp must switch to the stronger assist-only deceleration rate while state.assist is true, so the lower target speed computed above is actually reached quickly");

console.log(`nazonazo town dock (pitatto teisha) regression: OK (${checks} checks)`);
