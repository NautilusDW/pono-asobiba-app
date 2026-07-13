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
  for (const literal of literals.filter(value => /[ぁ-んァ-ヶ一-龠]/.test(value))) {
    assert.doesNotMatch(literal, /[一-龠]/, `${label}: child-facing string contains kanji: ${literal}`);
  }
}

/* DOM and layering: semantic targets stay separate from the full-scene pointer owner. */
assert.match(html, /id="vehicleSteerShell"[^>]*class="vehicle-steer-shell"[^>]*>[\s\S]*?<div class="vbody">/);
assert.match(html, /id="seaSteerSurface"[^>]*aria-hidden="true"/);
assert.match(html, /id="seaAnswerLayer"[^>]*(?:role="group"|aria-labelledby="qText")/);
assert.match(html, /id="seaCompanionLayer"[^>]*aria-hidden="true"/);
assert.match(html, /id="seaShotLayer"[^>]*aria-hidden="true"/);
assert.match(html, /<button id="seaFireButton"[^>]*aria-label="おしっぱなしで れんしゃ"[^>]*hidden/);
assert.match(html, /id="seaArenaShade"[^>]*aria-hidden="true"/, "sea arena needs a dedicated background-only shade");
const seaCountdownTag = /<[^>]+id="seaRoundCountdown"[^>]*>/.exec(html);
assert.ok(seaCountdownTag, "sea round countdown DOM is missing");
assert.match(seaCountdownTag[0], /role="status"/);
assert.match(seaCountdownTag[0], /aria-live="(?:polite|assertive)"/);
assert.match(seaCountdownTag[0], /hidden/, "countdown must be inert and invisible outside the sea arena");

const steerShellCss = cssRule("(?:^|\\n)\\.vehicle-steer-shell");
assert.match(steerShellCss, /transform\s*:\s*none/, "non-sea locomotives must ignore stale submarine offsets");
assert.doesNotMatch(steerShellCss, /(?:top|bottom|left|right)\s*:/);
const seaSteerShellCss = cssRule("body\\.st-sea \\.vehicle-steer-shell");
assert.match(seaSteerShellCss, /translate3d\([^;]*var\(--sea-steer-x[^;]*var\(--sea-steer-y/, "submarine steering must stay transform-only in X and Y");
assert.match(seaSteerShellCss, /var\(--sea-steer-tilt/);

const surfaceCss = cssRule("#seaSteerSurface");
assert.match(surfaceCss, /touch-action\s*:\s*none/);
assert.match(surfaceCss, /pointer-events\s*:\s*none/);
assert.match(css, /body\.st-sea[^,{]*\.sea-steer-active[^,{]*#seaSteerSurface\s*\{[^}]*pointer-events\s*:\s*auto/);
assert.match(css, /body\.st-sea[^,{]*#veh\s*\{[^}]*pointer-events\s*:\s*none/);
assert.match(css, /body\.st-sea #cars\s*\{[^}]*display\s*:\s*none/, "old yellow passenger pods must not duplicate option-like friends");
assert.match(css, /#app\s*\{[^}]*overflow\s*:\s*hidden[^}]*overflow\s*:\s*clip/,
  "the fixed game frame must not internally scroll and expose a black strip after start");
assert.match(js, /sea:\{[\s\S]{0,500}station:"\.\.\/assets\/images\/nazonazo-tunnel\/sea_station_checkpoint_20260712\.webp"/,
  "deep sea checkpoints must use the generated station instead of the generic tunnel gate");
const seaStationPath = path.join(root, "assets/images/nazonazo-tunnel/sea_station_checkpoint_20260712.webp");
assert.ok(fs.existsSync(seaStationPath), "generated undersea station asset is missing");
assert.ok(fs.statSync(seaStationPath).size < 3 * 1024 * 1024, "generated undersea station must stay below the repository image limit");
assert.match(css, /body\.st-sea \.tun\.station\.sea-station\s*\{[^}]*bottom\s*:\s*17vh[^}]*aspect-ratio\s*:\s*2023\/777/,
  "the undersea station platform must sit above the foreground corals");
assert.match(css, /body\.st-sea #groundT\s*\{[^}]*height\s*:\s*24vh/,
  "the opaque seabed must rise high enough to cover the viewport bottom");
assert.match(css, /body\.st-sea #fgT\s*\{[^}]*height\s*:\s*14vh[^}]*background-size\s*:\s*auto 21vh[^}]*background-position-y\s*:\s*calc\(100% \+ 1\.4vh\)/,
  "the near coral layer must be cropped lower so its transparent tail stays offscreen");

const seaRenderBody = extractFunction(js, "render");
assert.match(seaRenderBody, /st-sea[\s\S]{0,220}backgroundPositionX=cssXFromVw\(-\(worldX-o\)\*\.1\)/,
  "the far sea layer must keep looping slowly instead of stopping at the old 70vw cap");
assert.match(seaRenderBody, /midT\.style\.backgroundPositionX=cssXFromVw\(-\(worldX-o\)\*\.44\)/,
  "the sea mid layer needs a readable depth step");
assert.match(seaRenderBody, /st-sea[\s\S]{0,180}cssXFromVw\(-\(worldX-o\)\*1\.06\)/,
  "the coral foreground must remain nearest while moving only slightly faster than the station");

const fireCss = cssRule("#seaFireButton");
assert.match(fireCss, /width\s*:\s*clamp\(64px,10vmin,80px\)/);
assert.match(fireCss, /min-width\s*:\s*64px/);
assert.match(fireCss, /min-height\s*:\s*64px/);
assert.match(fireCss, /touch-action\s*:\s*none/);

const arenaShadeCss = cssRule("#seaArenaShade");
assert.match(arenaShadeCss, /position\s*:\s*absolute/);
assert.match(arenaShadeCss, /inset\s*:\s*0/);
assert.match(arenaShadeCss, /pointer-events\s*:\s*none/);
assert.match(arenaShadeCss, /opacity\s*:\s*0/, "LP/default scene must not be darkened");
assert.match(css, /body\.st-sea\.sea-arena-active #seaArenaShade\s*\{[^}]*opacity\s*:\s*(?:\.?[1-9]\d*)/,
  "the shade must only appear in an active sea arena");
assert.match(css, /body\.st-sea\.sea-arena-active #fgT\s*\{[^}]*(?:filter\s*:\s*[^;}]*brightness|opacity\s*:)/,
  "the z-index foreground must also dim instead of floating bright above the shade");
const countdownCss = cssRule("#seaRoundCountdown");
assert.match(countdownCss, /position\s*:\s*absolute/);
assert.match(countdownCss, /pointer-events\s*:\s*none/);
assert.match(countdownCss, /z-index\s*:\s*(?:1[2-9]|[2-9]\d)/, "countdown must stay above targets and quiz chrome");
assert.match(css, /#seaRoundCountdown\[hidden\]\s*\{[^}]*display\s*:\s*none/, "hidden countdown must not intercept the scene");

const targetCss = cssRule("\\.sea-answer-bubble");
assert.match(targetCss, /min-width\s*:\s*64px/);
assert.match(targetCss, /min-height\s*:\s*64px/);
assert.match(targetCss, /pointer-events\s*:\s*none/, "touch must pass through targets to the shooting surface");
assert.match(css, /\.sea-answer-visual\s*\{[^}]*border-radius\s*:\s*50%/, "target motion and burst visuals need separate transform owners");
assert.match(css, /\.sea-answer-bubble\.ng \.sea-answer-visual\s*\{[^}]*animation\s*:\s*seaTargetWrong/, "wrong-answer shake must not overwrite target position");
assert.match(css, /\.sea-answer-bubble\.is-tensing \.sea-answer-visual\s*\{[^}]*seaTargetTense \.14s/,
  "the full bubble needs a short pressure hold before it ruptures");
assert.match(css, /\.sea-answer-bubble\.is-bursting \.sea-answer-visual\s*\{[^}]*seaTargetBurst \.38s/,
  "the rupture visual must own the configured 380ms burst window");
assert.match(css, /@keyframes seaTargetBurst\s*\{[^}]*scale\(1\.12\)[\s\S]*?18%\{[^}]*scale\(1\.22\)[\s\S]*?30%,100%\{[^}]*opacity:0[^}]*scale\(\.12\)/,
  "the taut membrane and its label must vanish sharply while fragments continue outward");
assert.match(css, /\.sea-burst-flash\s*\{[^}]*animation\s*:\s*seaBurstFlash \.44s/,
  "the rupture needs a short white center flash");
assert.match(css, /\.sea-burst-ring\s*\{[^}]*animation\s*:\s*seaBurstRing \.7s/,
  "the final pop needs one large dashed expanding shockwave");
assert.match(css, /\.sea-burst-drop\s*\{[^}]*animation\s*:\s*seaBurstDrop \.72s/,
  "burst fragments must remain long enough to read as a clean explosion");
assert.match(css, /\.sea-shot\s*\{[^}]*will-change\s*:\s*transform/);
assert.match(css, /\.sea-companion\s*\{[^}]*will-change\s*:\s*transform/);

/* Runtime state and pointer/keyboard ownership. */
assert.match(js, /const SEA_FIRE_INTERVAL_MS=90;/);
assert.match(js, /const SEA_SHOT_LIMIT=56;/);
assert.match(js, /const SEA_COMPANION_LIMIT=3;/);
assert.match(js, /const SEA_TARGET_HIT_GOALS=\[16,20,24\];/);
assert.match(js, /const SEA_TARGET_MAX_SCALE=2\.2;/);
assert.match(js, /const SEA_TARGET_REDUCED_SCALE=1\.34;/);
assert.match(js, /const SEA_ASSIST_FIRE_MS=3600;/);
assert.match(js, /const SEA_BURST_TENSION_MS=140;/);
assert.match(js, /const SEA_BURST_VISUAL_MS=380;/);
assert.match(js, /const SEA_BURST_PARTICLE_MS=720;/);
assert.match(js, /const SEA_READY_MS=\d+;/, "ready countdown duration must be explicit");
assert.match(js, /const SEA_GO_MS=\d+;/, "go countdown duration must be explicit");

const seaFireIntervalMs = 90;
const seaHitGoals = [16, 20, 24];
const idealDamageDurations = seaHitGoals.map(goal => (goal - 1) * seaFireIntervalMs);
assert.deepEqual(idealDamageDurations, [1350, 1710, 2070],
  "the rapid-fire sequence must deliver many hits without turning one answer into a long stage pause");
assert.ok(3600 > idealDamageDurations.at(-1) + 1000,
  "keyboard/assist fire must outlast the hardest hit sequence plus projectile travel");
assert.match(js, /let steerTargetX=0,steerX=0,steerTargetY=0,steerY=0/);
assert.match(js, /let seaRoundPhase="idle"[^;]*seaRoundCountdownTimer=0/,
  "the sea arena countdown needs one explicit phase and owned timer");
assert.match(js, /const[^;]*seaCompanionLayer=\$\("seaCompanionLayer"\)[^;]*seaShotLayer=\$\("seaShotLayer"\)[^;]*seaFireButton=\$\("seaFireButton"\)/);
assert.match(js, /(?:const|let)[^;]*seaArenaShade=\$\("seaArenaShade"\)/, "arena shade must be an owned DOM reference");
assert.match(js, /(?:const|let)[^;]*seaRoundCountdown=\$\("seaRoundCountdown"\)/, "countdown must be an owned DOM reference");
assert.match(js, /vehicleSteerShell\.style\.setProperty\("--sea-steer-x"/);
assert.match(js, /vehicleSteerShell\.style\.setProperty\("--sea-steer-y"/);
const steerBoundsBody = extractFunction(js, "seaSteerBounds");
assert.match(steerBoundsBody, /viewportHeight\*\.72/, "travel must reserve the future question panel height");
assert.match(steerBoundsBody, /const maxCenterRatio=[^;]*\?\s*\.(?:4[4-8])\s*:\s*\.5;/,
  "travel may use half the screen, but the ordered arena must keep the submarine in the left playfield");
assert.doesNotMatch(steerBoundsBody, /\.82/, "quiz opening must not contract an 82vw travel range in one frame");

const boundsState = { quizShown: false, arenaActive: false };
const boundsSandbox = {
  window: { innerWidth: 844, innerHeight: 390 },
  veh: { offsetWidth: 135, offsetHeight: 96, offsetLeft: 169, offsetTop: 210 },
  document: {
    body: { classList: { contains: name => name === "sea-quiz-active" && boundsState.arenaActive } },
    getElementById: () => ({ getBoundingClientRect: () => ({ bottom: 50 }) })
  },
  quiz: {
    classList: { contains: name => name === "show" && boundsState.quizShown },
    getBoundingClientRect: () => ({ top: 304 })
  }
};
vm.createContext(boundsSandbox);
vm.runInContext(`${steerBoundsBody};this.seaSteerBounds=seaSteerBounds;`, boundsSandbox);
const travelBounds = boundsSandbox.seaSteerBounds();
boundsState.quizShown = true;
const quizBoundsBeforeArena = boundsSandbox.seaSteerBounds();
assert.equal(travelBounds.maxX, quizBoundsBeforeArena.maxX, "showing the question panel alone must not move the submarine");
boundsState.arenaActive = true;
const quizBounds = boundsSandbox.seaSteerBounds();
assert.ok(quizBounds.maxX < travelBounds.maxX, "the active arena must reserve the right side for two answers");
assert.ok(travelBounds.maxY <= quizBounds.maxY, "reserved travel floor must not snap Y upward when quiz opens");

for (const eventName of ["pointerdown", "pointermove", "pointerup", "pointercancel", "lostpointercapture"]) {
  assert.match(js, new RegExp(`seaSteerSurface\\.addEventListener\\("${eventName}"`), `steering surface is missing ${eventName}`);
}
for (const eventName of ["pointerdown", "pointerup", "pointercancel", "lostpointercapture"]) {
  assert.match(js, new RegExp(`seaFireButton\\.addEventListener\\("${eventName}"`), `fire button is missing ${eventName}`);
}
assert.match(js, /window\.addEventListener\("keydown",handleSeaKeyDown\)/);
assert.match(js, /window\.addEventListener\("keyup",handleSeaKeyUp\)/);
assert.match(js, /seaSteerSurface\.setPointerCapture\(/);
assert.match(js, /seaSteerSurface\.releasePointerCapture\(/);

const pointerDown = extractFunction(js, "handleSeaPointerDown");
const pointerMove = extractFunction(js, "handleSeaPointerMove");
const pointerUp = extractFunction(js, "handleSeaPointerUp");
assert.match(pointerDown, /setSeaSteerTarget\(ev\.clientX,ev\.clientY/);
assert.match(pointerMove, /setSeaSteerTarget\(ev\.clientX,ev\.clientY/);
assert.match(pointerDown, /setSeaFireSource\("steer",true\)/, "pressing the scene must begin autofire during a question");
assert.match(pointerUp, /cancelSeaPointer\(\)/, "release must stop its owned fire source");
assert.doesNotMatch(pointerUp, /onPick|beginSeaTargetBurst/, "movement release must never answer directly");
for (const body of [pointerDown, pointerMove, pointerUp, extractFunction(js, "setSeaSteerTarget"), extractFunction(js, "updateSeaKeyboardMovement")]) {
  assert.doesNotMatch(body, /(?:^|[;{}])\s*(?:worldX|vel|target)\s*(?:=|\+=|-=|\+\+|--)/m, "viewport steering must not mutate forced-scroll progress");
  assert.doesNotMatch(body, /\b(?:addScore|proceed|onPick)\s*\(/, "movement alone must not score or answer");
}

const keyDown = extractFunction(js, "handleSeaKeyDown");
assert.match(keyDown, /ArrowLeft/);
assert.match(keyDown, /KeyA/);
assert.match(keyDown, /Space/);
assert.match(keyDown, /setSeaFireSource\("keyboard",true\)/);
const keyUp = extractFunction(js, "handleSeaKeyUp");
assert.match(keyUp, /classList\.contains\("sea-answer-bubble"\)\)return/, "Space on a focused target must keep native button activation");
assert.match(keyUp, /setSeaFireSource\("keyboard",false\)/);
assert.match(extractFunction(js, "updateSeaKeyboardMovement"), /Math\.hypot\(axisX,axisY\)/, "diagonal keyboard movement must be normalized");
assert.match(extractFunction(js, "seaControlAvailable"), /seaLandscapeReady\(\)/, "portrait controls must stay behind the rotate gate");

/* Moving answer targets remain real buttons and reuse the common question data. */
const showQuizBody = extractFunction(js, "showQuiz");
const seaQuestionOptionsBody = extractFunction(js, "seaQuestionOptions");
const seaRoundPlayableBody = extractFunction(js, "seaRoundPlayable");
const setSeaRoundPhaseBody = extractFunction(js, "setSeaRoundPhase");
const startSeaRoundBody = extractFunction(js, "startSeaRoundCountdown");
const clearSeaRoundBody = extractFunction(js, "clearSeaRoundCountdown");
const positionSeaArenaBody = extractFunction(js, "positionSeaArenaStart");
const renderSeaBody = extractFunction(js, "renderSeaBubbleGame");
const updateTargetsBody = extractFunction(js, "updateSeaAnswerTargets");
const separateTargetsBody = extractFunction(js, "separateSeaAnswerTargets");
const spawnVolleyBody = extractFunction(js, "spawnSeaVolley");
const updateShotsBody = extractFunction(js, "updateSeaShots");
const hitTargetBody = extractFunction(js, "hitSeaAnswerTarget");
const burstParticlesBody = extractFunction(js, "createSeaBurstParticles");
const burstTargetBody = extractFunction(js, "beginSeaTargetBurst");
const fireClickBody = extractFunction(js, "handleSeaFireClick");
const clearSeaBody = extractFunction(js, "clearSeaBubbleGame");
const activeChoiceBody = extractFunction(js, "activeChoiceButtons");
const useHelpBody = extractFunction(js, "useHelp");
const onPickBody = extractFunction(js, "onPick");

assert.match(showQuizBody, /renderSeaBubbleGame\(/);
assert.match(showQuizBody, /cancelSeaPointer\(\);clearSeaBubbleGame\(\)/);
assert.match(renderSeaBody, /seaQuestionOptions\(cur\)/);
assert.match(seaQuestionOptionsBody, /\.a/);
assert.match(seaQuestionOptionsBody, /\.d/);
assert.match(seaQuestionOptionsBody, /shuffle\(/);
assert.doesNotMatch(seaQuestionOptionsBody, /\blevel\b/,
  "answer count must stay exactly two at every difficulty; difficulty only changes hit goal");
assert.match(renderSeaBody, /document\.createElement\("button"\)/);
assert.match(renderSeaBody, /button\.className="sea-answer-bubble"/);
assert.match(renderSeaBody, /button\.dataset\.ok/);
assert.match(renderSeaBody, /bindTap\(button,\(\)=>startSeaKeyboardTargetFire\(button,o\)\)/, "Enter/AT fallback must visibly autofire rather than select immediately");
assert.match(renderSeaBody, /SEA_TARGET_HIT_GOALS\[level\]/);
assert.match(renderSeaBody, /startSeaRoundCountdown\(\)/, "targets must not become live before the ready/go countdown");
assert.match(startSeaRoundBody, /positionSeaArenaStart\(\)/, "every question must reset the submarine into the left-center start position");
assert.doesNotMatch(startSeaRoundBody, /if\s*\(\s*!seaSteerUsed\s*\)[\s\S]{0,120}positionSeaArenaStart/,
  "later questions must not inherit an arbitrary previous submarine position");

const layoutMatch = /const layout=\[\[([\d.]+),([\d.]+)\],\[([\d.]+),([\d.]+)\]\]/.exec(renderSeaBody);
assert.ok(layoutMatch, "sea answers need one explicit two-row layout");
const [, topXRaw, topYRaw, bottomXRaw, bottomYRaw] = layoutMatch;
const topX = Number(topXRaw), topY = Number(topYRaw), bottomX = Number(bottomXRaw), bottomY = Number(bottomYRaw);
assert.ok(topX >= 0.64 && topX <= 0.91 && bottomX >= 0.64 && bottomX <= 0.91,
  "both answers must start inside the right-side arena");
assert.ok(Math.abs(topX - bottomX) <= 0.02, "answers must form a vertical column rather than a diagonal");
assert.ok(topY < 0.5 && bottomY > 0.5 && bottomY - topY >= 0.3,
  "answer rows need enough vertical separation for two 64px targets");

/* Option generation is independent of difficulty: one correct plus one distractor. */
const optionsSandbox = {
  shuffle: values => values.slice().reverse(),
  cars: [],
  passengerLabel: friend => friend.t,
  qList: [],
  seaRescueQuestionKey: question => question.a[1],
  SEA_DECOYS: [["🐔", "にわとり"], ["🐝", "はち"]],
  seaDecoysSeen: new Set()
};
vm.createContext(optionsSandbox);
vm.runInContext(`${seaQuestionOptionsBody};this.seaQuestionOptions=seaQuestionOptions;`, optionsSandbox);
const optionQuestion = {
  a: ["✅", "せいかい"],
  d: [["1️⃣", "ひとつ"], ["2️⃣", "ふたつ"], ["3️⃣", "みっつ"]]
};
for (let difficulty = 0; difficulty < 3; difficulty += 1) {
  optionsSandbox.level = difficulty;
  const options = optionsSandbox.seaQuestionOptions(optionQuestion);
  assert.equal(options.length, 2, `difficulty ${difficulty}: sea arena must always render exactly two answers`);
  assert.equal(options.filter(option => option.ok).length, 1, `difficulty ${difficulty}: exactly one answer must be correct`);
  assert.equal(options.filter(option => !option.ok).length, 1, `difficulty ${difficulty}: exactly one distractor is required`);
}

assert.match(updateTargetsBody, /seaReducedMotion\(\)/);
assert.match(updateTargetsBody, /document\.activeElement===entry\.button/, "focused targets must pause so keyboard fallback stays usable");
assert.match(updateTargetsBody, /seaRoundPlayable\(\)|seaRoundPhase==="active"/, "targets must stay arranged and still during ようい / ドン！");
assert.match(updateTargetsBody, /Math\.sin/);
assert.match(updateTargetsBody, /const balloonCurve=\.28\*ratio\+\.72\*ratio\*ratio/,
  "growth must accelerate nonlinearly like a balloon instead of staying linear");
assert.match(updateTargetsBody, /SEA_TARGET_REDUCED_SCALE:SEA_TARGET_MAX_SCALE/,
  "reduced motion needs its own restrained growth ceiling");
assert.match(updateTargetsBody, /const visualHalf=entry\.size\*entry\.scale\*\.5/,
  "the much larger final bubble must be positioned using its rendered size");
assert.match(updateTargetsBody, /lane(?:Height|Top|Bottom)|entry\.index/, "each answer needs its own vertical lane to prevent overlap");
assert.match(updateTargetsBody, /safe\.sceneRect\.width\*\.(?:6[4-9]|[7-8]\d)/,
  "moving targets must remain inside the right-side arena");
assert.match(updateTargetsBody, /separateSeaAnswerTargets\(seaBubbleOptions\)/,
  "inflated targets must run through pairwise separation before painting");
assert.match(separateTargetsBody, /gap=a\._boundaryHalf\+b\._boundaryHalf\+12/,
  "pairwise separation must include both rendered radii and a readable gap");
assert.match(updateTargetsBody, /\.14\*Math\.sqrt\(balloonCurve\)\*\(entry\.index===0\?-1:1\)/,
  "growth must progressively fan the top target left and the bottom target right before separation activates");
assert.doesNotMatch(updateTargetsBody, /(?:left|top)\s*=/, "target movement must remain transform-only");

function makeTargetMotionSandbox() {
  const state = { phase: "ready", reduced: false };
  const makeButton = () => {
    const names = new Set();
    return {
      isConnected: true,
      style: { setProperty(name, value) { this[name] = value; } },
      classList: {
        contains: name => names.has(name),
        toggle: (name, force) => {
          if (force) names.add(name);
          else names.delete(name);
          return !!force;
        }
      }
    };
  };
  const entries = [
    { button: makeButton(), index: 0, baseX: topX, baseY: topY, size: 64, ampX: 38, ampY: 20, rate: 1.18, phase: .7,
      rotation: 2.2, hits: 0, hitGoal: 24, flashUntil: 0, scale: 1, radius: 28, x: 0, y: 0, bursting: false },
    { button: makeButton(), index: 1, baseX: bottomX, baseY: bottomY, size: 64, ampX: 46, ampY: 24, rate: 1.33, phase: 2.4,
      rotation: 2.9, hits: 0, hitGoal: 24, flashUntil: 0, scale: 1, radius: 28, x: 0, y: 0, bursting: false }
  ];
  const context = {
    SEA_TARGET_MAX_SCALE: 2.2,
    SEA_TARGET_REDUCED_SCALE: 1.34,
    seaBubbleOptions: entries,
    seaAnswerSafeRect: () => ({ sceneRect: { left: 0, top: 0, width: 844, height: 390 }, top: 50, bottom: 290, height: 240 }),
    seaReducedMotion: () => state.reduced,
    seaRoundPlayable: () => state.phase === "active",
    seaRoundPhase: state.phase,
    homeBtn: null,
    document: { activeElement: null },
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    _nowMs: () => 1000,
    state,
    entries
  };
  vm.createContext(context);
  vm.runInContext(`${separateTargetsBody};${updateTargetsBody};this.updateSeaAnswerTargets=updateSeaAnswerTargets;`, context);
  return context;
}

const targetMotion = makeTargetMotionSandbox();
targetMotion.updateSeaAnswerTargets(1000);
const readyPositions = targetMotion.entries.map(entry => ({ x: entry.x, y: entry.y }));
targetMotion.updateSeaAnswerTargets(1800);
assert.deepEqual(targetMotion.entries.map(entry => ({ x: entry.x, y: entry.y })), readyPositions,
  "targets must stay in their ordered rows throughout ようい / ドン！");

targetMotion.state.phase = "active";
targetMotion.seaRoundPhase = "active";
targetMotion.updateSeaAnswerTargets(1000);
const firstActivePositions = targetMotion.entries.map(entry => ({ x: entry.x, y: entry.y }));
targetMotion.updateSeaAnswerTargets(1700);
targetMotion.entries.forEach((entry, index) => {
  const before = firstActivePositions[index];
  assert.ok(Math.abs(entry.x - before.x) > .25 || Math.abs(entry.y - before.y) > .25,
    `target ${index}: both choices must evade after ドン！`);
  assert.ok(entry.x - entry.radius >= 844 * .6 && entry.x + entry.radius <= 844,
    `target ${index}: target must remain fully in the right playfield`);
  assert.ok(entry.y - entry.radius >= 50 && entry.y + entry.radius <= 290,
    `target ${index}: target must remain between HUD and quiz`);
});
assert.ok(targetMotion.entries[1].y - targetMotion.entries[0].y >= 72,
  "top and bottom target lanes must remain visibly non-overlapping while both evade");

const growthTarget = targetMotion.entries[0];
const growthScales = [0, 6, 12, 18, 24].map(hits => {
  growthTarget.hits = hits;
  growthTarget.flashUntil = 0;
  targetMotion.updateSeaAnswerTargets(2000);
  return growthTarget.scale;
});
assert.ok(Math.abs(growthScales[0] - 1) < 1e-9);
assert.ok(Math.abs(growthScales.at(-1) - 2.2) < 1e-9,
  "24 hits must finish at the full 2.2x balloon scale");
const growthSteps = growthScales.slice(1).map((scale, index) => scale - growthScales[index]);
for (let index = 1; index < growthSteps.length; index += 1) {
  assert.ok(growthSteps[index] > growthSteps[index - 1],
    "each later quarter of the hit sequence must inflate more than the previous quarter");
}
const finalVisualHalf = growthTarget.size * growthTarget.scale * .5;
assert.ok(growthTarget.x - finalVisualHalf >= 0 && growthTarget.x + finalVisualHalf <= 844,
  "the 2.2x bubble must stay fully inside the viewport");
assert.ok(growthTarget.y - finalVisualHalf >= 50 && growthTarget.y + finalVisualHalf <= 290,
  "the 2.2x bubble must stay between the HUD and question panel");
assert.ok(growthTarget.radius > growthTarget.size * .9,
  "the hit area must grow with the visible balloon so late shots remain generous");
targetMotion.homeBtn = { getBoundingClientRect: () => ({ left: 730, right: 830, top: 10, bottom: 66 }) };
targetMotion.updateSeaAnswerTargets(2050);
const finalBoundaryHalf = finalVisualHalf * 1.12;
assert.ok(growthTarget.x + finalBoundaryHalf <= 722.01,
  "the taut 2.2x target must reserve the real right-side map-button rectangle");
targetMotion.homeBtn = null;
const hitByHitX = [];
for (let hits = 0; hits <= 24; hits += 1) {
  growthTarget.hits = hits;
  targetMotion.updateSeaAnswerTargets(2100);
  hitByHitX.push(growthTarget.x);
  const other = targetMotion.entries[1];
  const distance = Math.hypot(growthTarget.x - other.x, growthTarget.y - other.y);
  assert.ok(distance + .51 >= growthTarget._boundaryHalf + other._boundaryHalf + 12,
    `hit ${hits}: answers must keep a readable pairwise gap`);
}
for (let index = 1; index < hitByHitX.length; index += 1) {
  assert.ok(Math.abs(hitByHitX[index] - hitByHitX[index - 1]) < 28,
    `hit ${index}: target must fan outward without a one-frame side swap`);
}

targetMotion.state.reduced = true;
targetMotion.updateSeaAnswerTargets(2200);
assert.ok(Math.abs(growthTarget.scale - 1.34) < 1e-9,
  "reduced motion must show restrained progress without the full 2.2x expansion");
const reducedPositions = targetMotion.entries.map(entry => ({ x: entry.x, y: entry.y }));
targetMotion.updateSeaAnswerTargets(3200);
assert.deepEqual(targetMotion.entries.map(entry => ({ x: entry.x, y: entry.y })), reducedPositions,
  "reduced-motion must keep both targets stationary even after the round becomes active");

/* The arena is inert through ようい / ドン！ and unlocks only after both phases. */
assert.match(seaRoundPlayableBody, /seaRoundPhase==="active"/);
assert.match(seaRoundPlayableBody, /!window\.__PONO_TIER_LOCKED__/,
  "LP lock must make the arena unplayable even if a stale class survives");
assert.match(startSeaRoundBody, /window\.__PONO_TIER_LOCKED__/,
  "LP lock must prevent countdown/arena creation");
assert.match(startSeaRoundBody, /const epoch=seaShooterEpoch/,
  "countdown callbacks must belong to the current question epoch");
assert.ok((startSeaRoundBody.match(/epoch!==seaShooterEpoch/g) || []).length >= 2,
  "both ready and go callbacks must reject a stale question epoch");
assert.match(startSeaRoundBody, /setSeaRoundPhase\("ready"\)/);
assert.match(startSeaRoundBody, /setSeaRoundPhase\("go"\)/);
assert.match(startSeaRoundBody, /setSeaRoundPhase\("active"\)/);
assert.match(startSeaRoundBody, /SEA_READY_MS/);
assert.match(startSeaRoundBody, /SEA_GO_MS/);
assert.match(setSeaRoundPhaseBody, /\.disabled=!playable|\.disabled=phase!=="active"|\.disabled=true/,
  "semantic answer buttons must be disabled until the countdown completes");
assert.match(setSeaRoundPhaseBody, /classList\.contains\("dim"\)[\s\S]{0,220}(?:\.disabled=!playable|\.disabled=false)/,
  "only non-dim answers should unlock after ドン！");

assert.match(clearSeaRoundBody, /clearTimeout\(seaRoundCountdownTimer\)/);
assert.match(clearSeaRoundBody, /seaRoundCountdownTimer=0/);
assert.match(clearSeaRoundBody, /setSeaRoundPhase\("idle"\)|seaRoundPhase="idle"/);
assert.match(clearSeaBody, /clearSeaRoundCountdown\(\)/,
  "stage/question cleanup must own countdown cleanup too");
assert.match(clearSeaBody, /seaShooterEpoch\+\+/,
  "clearing a question must invalidate queued countdown callbacks");

function makeCountdownSandbox(locked = false) {
  const timers = [];
  const phaseCalls = [];
  const state = {
    SEA_READY_MS: 700,
    SEA_GO_MS: 500,
    seaRoundCountdownTimer: 0,
    seaShooterEpoch: 11,
    window: { __PONO_TIER_LOCKED__: locked },
    document: { hidden: false },
    quiz: { classList: { contains: name => name === "show" } },
    isSeaStage: () => true,
    clearSeaRoundCountdown: () => {},
    positionSeaArenaStart: () => {},
    setSeaRoundPhase: phase => phaseCalls.push(phase),
    updateSeaAnswerTargets: () => {},
    pauseSeaInput: () => {},
    _nowMs: () => 1000,
    clearTimeout: () => {},
    setTimeout: callback => { timers.push(callback); return timers.length; },
    timers,
    phaseCalls
  };
  vm.createContext(state);
  vm.runInContext(`${startSeaRoundBody};this.startSeaRoundCountdown=startSeaRoundCountdown;`, state);
  return state;
}

const normalCountdown = makeCountdownSandbox(false);
normalCountdown.startSeaRoundCountdown();
assert.deepEqual(normalCountdown.phaseCalls, ["ready"]);
assert.equal(normalCountdown.timers.length, 1);
normalCountdown.timers.shift()();
assert.deepEqual(normalCountdown.phaseCalls, ["ready", "go"]);
assert.equal(normalCountdown.timers.length, 1);
normalCountdown.timers.shift()();
assert.deepEqual(normalCountdown.phaseCalls, ["ready", "go", "active"]);

const staleCountdown = makeCountdownSandbox(false);
staleCountdown.startSeaRoundCountdown();
staleCountdown.seaShooterEpoch += 1;
staleCountdown.timers.shift()();
assert.deepEqual(staleCountdown.phaseCalls, ["ready"], "a stale ready timer must never start or unlock a newer round");
assert.equal(staleCountdown.timers.length, 0, "a stale ready timer must not schedule the go timer");

const lockedCountdown = makeCountdownSandbox(true);
lockedCountdown.startSeaRoundCountdown();
assert.deepEqual(lockedCountdown.phaseCalls, [], "LP lock must not reveal the arena or countdown");
assert.equal(lockedCountdown.timers.length, 0, "LP lock must not leave a countdown timer behind");

const seaControlBody = extractFunction(js, "seaControlAvailable");
const seaShooterBody = extractFunction(js, "seaShooterActive");
for (const [label, body] of [
  ["seaControlAvailable", seaControlBody],
  ["seaShooterActive", seaShooterBody],
  ["hitSeaAnswerTarget", hitTargetBody],
  ["beginSeaTargetBurst", burstTargetBody],
  ["startSeaKeyboardTargetFire", extractFunction(js, "startSeaKeyboardTargetFire")]
]) {
  assert.match(body, /seaRoundPlayable\(\)|seaShooterActive\(\)|seaRoundPhase==="active"/, `${label}: ready/go must block interaction`);
}

assert.match(positionSeaArenaBody, /setSeaSteerTarget\(/);
const startPositionMatch = /setSeaSteerTarget\([^;]*\*([.\d]+)[^,]*,[^;]*\*([.\d]+)[^,]*,true\)/.exec(positionSeaArenaBody);
assert.ok(startPositionMatch, "arena reset must place the submarine immediately using viewport-relative X/Y");
const startXRatio = Number(startPositionMatch[1]), startYRatio = Number(startPositionMatch[2]);
assert.ok(startXRatio >= 0.18 && startXRatio <= 0.32, "submarine must start left of center");
assert.ok(startYRatio >= 0.4 && startYRatio <= 0.6, "submarine must start around vertical center");
assert.match(positionSeaArenaBody, /seaTrail=\[\]/,
  "companion trails must reset with the submarine instead of flying from the previous question");

const keyboardAimBody = extractFunction(js, "updateSeaKeyboardAim");
assert.match(keyboardAimBody, /setSeaSteerTarget\((?:NaN|[^,]*(?:steerTargetX|steerX))/,
  "keyboard target fire must preserve the submarine's current horizontal position");
assert.doesNotMatch(keyboardAimBody, /(?:innerWidth|viewportWidth)[^;]*\*\.47/,
  "keyboard auto-aim must not drag the left-side submarine to the old 47% position");

/* Every volley includes all friends but can damage only one target once. */
assert.match(spawnVolleyBody, /const salvoId=\+\+seaVolleyCount/);
assert.match(spawnVolleyBody, /spawnSeaShot\([^;]*false,salvoId,aimY\)/);
assert.match(spawnVolleyBody, /seaCompanionSprites\.forEach/);
assert.match(spawnVolleyBody, /spawnSeaShot\([^;]*true,salvoId,aimY\)/);
const syncCompanionBody = extractFunction(js, "syncSeaCompanions");
assert.match(syncCompanionBody, /const friends=\[\],seen=new Set\(\)/);
assert.match(syncCompanionBody, /for\(let index=cars\.length-1;index>=0&&friends\.length<SEA_COMPANION_LIMIT;index--\)/);
assert.match(syncCompanionBody, /seen\.has\(species\)/, "the visible firing formation must not repeat one rescued species");
assert.match(syncCompanionBody, /friends\.unshift\(friend\)/, "the latest unique friends must keep their journey order");
const companionRenderBody = extractFunction(js, "renderSeaCompanions");
assert.match(companionRenderBody, /seaTrailPointAt\(now-135\*\(index\+1\)/);
assert.match(companionRenderBody, /const point=reduced\?subPoint:/, "reduced motion must use a fixed formation rather than delayed trail motion");
const passengerTargetBody = extractFunction(js, "passengerSeatTargetAt");
assert.match(passengerTargetBody, /if\(isSeaStage\(\)&&vehicleSteerShell\)/, "sea boarding must target the rendered submarine instead of hidden cars");
assert.match(passengerTargetBody, /vehicleSteerShell\.getBoundingClientRect\(\)/);
assert.match(passengerTargetBody, /SEA_COMPANION_LIMIT/);
assert.ok(passengerTargetBody.indexOf("if(isSeaStage()") < passengerTargetBody.indexOf('carsEl.querySelector(".pending-seat")'), "sea target must be resolved before the display:none pending seat");
const passengerSandbox = {
  STAGES: [{ id: "sea", veh: "sub" }],
  stg: 0,
  isSeaStage: () => true,
  vehicleSteerShell: { getBoundingClientRect: () => ({ left: 190, top: 122, width: 135, height: 96 }) },
  window: { innerWidth: 844, innerHeight: 390 },
  SEA_COMPANION_LIMIT: 3,
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  carsEl: { querySelector: () => { throw new Error("hidden pending seat must not be queried in sea"); } },
  vehicleLeftVw: () => 28,
  carGap: () => 8.8
};
vm.createContext(passengerSandbox);
vm.runInContext(`${passengerTargetBody};this.passengerSeatTargetAt=passengerSeatTargetAt;`, passengerSandbox);
const seaBoardTarget = passengerSandbox.passengerSeatTargetAt(0);
assert.ok(parseFloat(seaBoardTarget.left) > 100, "rescued friend must not fly to left:0");
assert.ok(parseFloat(seaBoardTarget.bottom) > 20 && parseFloat(seaBoardTarget.bottom) < 300, "rescued friend must join beside the submarine, not the top edge");
assert.match(updateShotsBody, /seaBubbleOptions\.find/);
assert.match(updateShotsBody, /if\(shot\.companion\)shot\.y\+=\(shot\.aimY-shot\.y\)/, "friend shots must converge on the submarine aim instead of crossing another answer lane");
assert.match(updateShotsBody, /button\.disabled/);
assert.match(updateShotsBody, /classList\.contains\("dim"\)/);
assert.match(updateShotsBody, /hitSeaAnswerTarget\(targetEntry,shot\.salvoId/);
assert.match(updateShotsBody, /removeSeaShotsForSalvo\(shot\.salvoId\)/);
assert.match(hitTargetBody, /seaSalvoHits\.has\(salvoId\)/);
assert.match(hitTargetBody, /seaSalvoHits\.add\(salvoId\)/);
assert.match(hitTargetBody, /entry\.hits\+1/);
assert.match(hitTargetBody, /500\+620\*Math\.pow\(hitRatio,\.72\)/,
  "rapid impact pitch must rise smoothly without the old unbounded per-hit climb");
assert.match(hitTargetBody, /beginSeaTargetBurst\(entry\)/);

/* The large final explosion is one center flash, one shockwave, and 36 varied fragments. */
assert.match(burstParticlesBody, /flash\.className="sea-burst-flash"/);
assert.match(burstParticlesBody, /ring\.className="sea-burst-ring"/);
assert.match(burstParticlesBody, /for\(let i=0;i<36;i\+\+\)/);
assert.match(burstParticlesBody, /i%3===0\?" is-star":""/);
assert.match(burstParticlesBody, /SEA_BURST_PARTICLE_MS\+40/);
assert.match(burstParticlesBody, /SEA_BURST_PARTICLE_MS\+90/);

function makeBurstParticleElement() {
  const properties = new Map();
  return {
    className: "",
    style: { setProperty: (name, value) => properties.set(name, value), properties },
    removed: false,
    remove() { this.removed = true; }
  };
}
const burstParticleChildren = [];
const burstParticleTimers = [];
const burstParticleSandbox = {
  SEA_BURST_PARTICLE_MS: 720,
  seaShotLayer: { appendChild: element => burstParticleChildren.push(element) },
  document: { createElement: () => makeBurstParticleElement() },
  setTimeout: (callback, delay) => { burstParticleTimers.push({ callback, delay }); return burstParticleTimers.length; }
};
vm.createContext(burstParticleSandbox);
vm.runInContext(`${burstParticlesBody};this.createSeaBurstParticles=createSeaBurstParticles;`, burstParticleSandbox);
burstParticleSandbox.createSeaBurstParticles({ x: 620, y: 150, size: 72, scale: 2.2 });
assert.equal(burstParticleChildren.length, 38, "one flash, one ring, and 36 fragments must be rendered");
assert.equal(burstParticleChildren.filter(element => element.className === "sea-burst-flash").length, 1);
assert.equal(burstParticleChildren.filter(element => element.className === "sea-burst-ring").length, 1);
assert.equal(burstParticleChildren.filter(element => element.className.startsWith("sea-burst-drop")).length, 36);
assert.equal(burstParticleChildren.filter(element => element.className.includes("is-star")).length, 12,
  "twelve fragments should use the brighter star shape");
assert.equal(burstParticleTimers.filter(timer => timer.delay === 500).length, 1,
  "the center flash must own a short cleanup timer");
assert.equal(burstParticleTimers.filter(timer => timer.delay === 760).length, 1,
  "the ring cleanup must follow the 720ms effect");
assert.equal(burstParticleTimers.filter(timer => timer.delay === 810).length, 36,
  "every fragment must own a bounded cleanup timer");

/* Keyboard/assist activation owns a full 3.6-second burst and releases it once. */
assert.match(fireClickBody, /SEA_ASSIST_FIRE_MS/);
const assistTimers = [];
const assistSources = [];
const assistSandbox = {
  SEA_ASSIST_FIRE_MS: 3600,
  seaAssistFireTimer: 0,
  seaShooterActive: () => true,
  ensureAC: () => {},
  setSeaFireSource: (source, active) => assistSources.push([source, active]),
  clearTimeout: () => {},
  setTimeout: (callback, delay) => { assistTimers.push({ callback, delay }); return assistTimers.length; }
};
vm.createContext(assistSandbox);
vm.runInContext(`${fireClickBody};this.handleSeaFireClick=handleSeaFireClick;`, assistSandbox);
assistSandbox.handleSeaFireClick({ detail: 0, preventDefault: () => assert.fail("keyboard click must start assist fire") });
assert.deepEqual(assistSources, [["assist", true]]);
assert.equal(assistTimers.length, 1);
assert.equal(assistTimers[0].delay, 3600);
assistTimers[0].callback();
assert.deepEqual(assistSources, [["assist", true], ["assist", false]],
  "assist fire must release its owned source after 3.6 seconds");

/* The final burst is the only bridge to the established answer/scoring flow. */
assert.match(burstTargetBody, /seaBubbleLaunchPending=true/, "collision must lock synchronously before another shot can submit");
assert.match(burstTargetBody, /activeChoiceButtons\(\)\.forEach\(choice=>\{choice\.disabled=true;/);
assert.match(burstTargetBody, /const epoch=seaShooterEpoch/);
assert.match(burstTargetBody, /epoch!==seaShooterEpoch/);
assert.match(burstTargetBody, /setTimeout\(explode,SEA_BURST_TENSION_MS\)/,
  "normal motion must hold the taut balloon for 140ms before rupture");
assert.match(burstTargetBody, /setTimeout\(finish,SEA_BURST_VISUAL_MS\)/,
  "answer resolution must wait for the 380ms rupture visual");
assert.match(burstTargetBody, /createSeaBurstParticles\(entry\)/,
  "the rupture phase must create its ring and fragments");
assert.match(burstTargetBody, /onPick\(entry\.button,entry\.value\)/);
assert.doesNotMatch(burstTargetBody, /\b(?:addScore|SCORE_POINTS|qSeg\+\+|proceed|boardPassenger)\b/, "shooter must not fork scoring or progression");
assert.match(burstTargetBody, /if\(seaReducedMotion\(\)\)finish\(\)/, "reduced motion must skip the burst delay");
assert.match(activeChoiceBody, /seaAnswerLayer/);
assert.match(activeChoiceBody, /choicesEl/);
assert.match(useHelpBody, /activeChoiceButtons\(\)/);
assert.match(useHelpBody, /seaBubbleLaunchPending/);
assert.match(useHelpBody, /!seaRoundPlayable\(\)|seaRoundPhase!=="active"/,
  "the short ready/go phase must not consume a help item before play begins");
assert.match(onPickBody, /activeChoiceButtons\(\)/);
assert.match(onPickBody, /SCORE_POINTS\.correct/);

/* Execute the salvo guard: one salvo can increment one target only once. */
const classNames = new Set();
const sandbox = {
  seaSalvoHits: new Set(),
  seaBubbleLaunchPending: false,
  answerLocked: false,
  seaRoundPhase: "active",
  seaRoundPlayable: () => true,
  seaShooterEpoch: 7,
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  _nowMs: () => 1000,
  setTimeout: callback => { callback(); return 1; },
  createSeaHitSpark: () => {},
  tone: () => {},
  burstCalls: 0,
  beginSeaTargetBurst: () => { sandbox.burstCalls += 1; }
};
vm.createContext(sandbox);
vm.runInContext(`${hitTargetBody};this.hitSeaAnswerTarget=hitSeaAnswerTarget;`, sandbox);
const targetEntry = {
  hits: 0,
  hitGoal: 24,
  flashUntil: 0,
  bursting: false,
  button: {
    disabled: false,
    dataset: {},
    classList: {
      contains: name => classNames.has(name),
      add: name => classNames.add(name),
      remove: name => classNames.delete(name)
    }
  }
};
sandbox.seaRoundPhase = "ready";
sandbox.seaRoundPlayable = () => false;
assert.equal(sandbox.hitSeaAnswerTarget(targetEntry, 0, 100, 100), false, "ready/go shots must never damage an answer");
assert.equal(targetEntry.hits, 0);
sandbox.seaRoundPhase = "active";
sandbox.seaRoundPlayable = () => true;
assert.equal(sandbox.hitSeaAnswerTarget(targetEntry, 1, 100, 100), true);
assert.equal(targetEntry.hits, 1);
assert.equal(sandbox.hitSeaAnswerTarget(targetEntry, 1, 100, 100), false, "a companion shot from the same salvo must not add damage");
assert.equal(targetEntry.hits, 1);
for (let salvoId = 2; salvoId < 24; salvoId += 1) {
  assert.equal(sandbox.hitSeaAnswerTarget(targetEntry, salvoId, 100, 100), true);
}
assert.equal(targetEntry.hits, 23);
assert.equal(sandbox.burstCalls, 0, "the target must absorb all first 23 hits without an early pop");
assert.equal(sandbox.hitSeaAnswerTarget(targetEntry, 24, 100, 100), true);
assert.equal(targetEntry.hits, 24);
assert.equal(sandbox.burstCalls, 1);

/* Execute wrong-answer burst/resume and stale-epoch protection. */
function makeClassList(initial = []) {
  const names = new Set(initial);
  return {
    names,
    contains: name => names.has(name),
    add: (...values) => values.forEach(value => names.add(value)),
    remove: (...values) => values.forEach(value => names.delete(value))
  };
}
function makeBurstSandbox(reduced) {
  const timers = [];
  const answerButton = { disabled: false, isConnected: true, classList: makeClassList() };
  const otherButton = { disabled: false, isConnected: true, classList: makeClassList() };
  const state = {
    seaBubbleLaunchPending: false,
    answerLocked: false,
    driving: false,
    seaRoundPhase: "active",
    seaRoundPlayable: () => true,
    seaMoveKeys: new Set(),
    seaShooterEpoch: 4,
    SEA_BURST_TENSION_MS: 140,
    SEA_BURST_VISUAL_MS: 380,
    seaBubbleLaunchTimer: 0,
    seaShooterResumeTimer: 0,
    quiz: { classList: { contains: name => name === "show" } },
    document: { body: { classList: { contains: name => name === "sea-quiz-active" } } },
    stopSeaFiring: () => {},
    cancelSeaPointer: () => {},
    cancelSeaFirePointer: () => {},
    removeAllSeaShots: () => {},
    activeChoiceButtons: () => [answerButton, otherButton],
    seaBubbleOptions: [],
    createSeaBurstParticles: () => { state.particleCalls += 1; },
    tone: () => {},
    seaReducedMotion: () => reduced,
    clearSeaBubbleGame: () => { state.clearCalls += 1; },
    clearCalls: 0,
    particleCalls: 0,
    pickCalls: 0,
    onPick: (button, value) => {
      state.pickCalls += 1;
      if (!value.ok) {
        button.classList.add("dim");
        button.disabled = true;
      }
    },
    setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
    clearTimeout: () => {},
    timers,
    answerButton,
    otherButton
  };
  vm.createContext(state);
  vm.runInContext(`${burstTargetBody};this.beginSeaTargetBurst=beginSeaTargetBurst;`, state);
  return state;
}

const wrongBurst = makeBurstSandbox(true);
wrongBurst.beginSeaTargetBurst({ button: wrongBurst.answerButton, value: { ok: false }, bursting: false, x: 100, y: 100 });
assert.equal(wrongBurst.pickCalls, 1);
assert.equal(wrongBurst.seaBubbleLaunchPending, true, "wrong answer must stay locked through feedback");
assert.equal(wrongBurst.otherButton.disabled, true);
assert.equal(wrongBurst.particleCalls, 0, "reduced motion must skip explosive fragments");
assert.equal(wrongBurst.timers.length, 1);
assert.equal(wrongBurst.timers[0].delay, 620);
wrongBurst.timers.shift().callback();
assert.equal(wrongBurst.seaBubbleLaunchPending, false);
assert.equal(wrongBurst.answerButton.disabled, true, "popped wrong target must stay disabled");
assert.equal(wrongBurst.otherButton.disabled, false, "remaining targets must resume after wrong feedback");

const staleBurst = makeBurstSandbox(false);
staleBurst.beginSeaTargetBurst({ button: staleBurst.answerButton, value: { ok: true }, bursting: false, x: 100, y: 100 });
assert.equal(staleBurst.pickCalls, 0);
assert.equal(staleBurst.timers.length, 1);
assert.equal(staleBurst.timers[0].delay, 140, "the first phase must be the 140ms pressure hold");
staleBurst.seaShooterEpoch += 1;
staleBurst.timers.shift().callback();
assert.equal(staleBurst.pickCalls, 0, "an old burst timer must not answer a new question");
assert.equal(staleBurst.particleCalls, 0, "a stale pressure timer must not leave explosion DOM behind");

const stagedBurstRun = makeBurstSandbox(false);
stagedBurstRun.beginSeaTargetBurst({ button: stagedBurstRun.answerButton, value: { ok: true }, bursting: false, x: 100, y: 100 });
assert.ok(stagedBurstRun.answerButton.classList.contains("is-tensing"));
assert.equal(stagedBurstRun.timers[0].delay, 140);
stagedBurstRun.timers.shift().callback();
assert.equal(stagedBurstRun.particleCalls, 1);
assert.ok(stagedBurstRun.answerButton.classList.contains("is-bursting"));
assert.equal(stagedBurstRun.pickCalls, 0, "rupture particles must precede answer submission");
assert.equal(stagedBurstRun.timers.length, 1);
assert.equal(stagedBurstRun.timers[0].delay, 380, "the rupture aftermath must stay visible for 380ms");
stagedBurstRun.timers.shift().callback();
assert.equal(stagedBurstRun.pickCalls, 1);
assert.equal(stagedBurstRun.timers.length, 1);
assert.equal(stagedBurstRun.timers[0].delay, 420,
  "correct-answer cleanup must leave enough time for the ring and fragments to finish");

/* Every exit boundary clears stale pointers, timers, shots and target state. */
assert.match(clearSeaBody, /seaShooterEpoch\+\+/);
assert.match(clearSeaBody, /clearTimeout\(seaBubbleLaunchTimer\)/);
assert.match(clearSeaBody, /clearTimeout\(seaShooterResumeTimer\)/);
assert.match(clearSeaBody, /cancelSeaPointer\(\);cancelSeaFirePointer\(\);stopSeaFiring\(\)/);
assert.match(clearSeaBody, /clearSeaShotLayer\(\)/);
assert.match(clearSeaBody, /seaSalvoHits\.clear\(\)/);
for (const functionName of ["startJourneyAt", "beginStageTransit", "openMap", "ending"]) {
  assert.match(extractFunction(js, functionName), /(?:clear|reset|cancel)[A-Za-z_$]*Sea[A-Za-z_$]*\(/, `${functionName}: stale sea interaction is not cleared`);
}
assert.match(js, /if\(document\.hidden\)\{[\s\S]{0,360}hideWeatherNotice\(\)[\s\S]{0,360}pauseSeaInput\(\);safeSuspend\(\)/,
  "backgrounding must still pause sea input and audio");
assert.match(js, /seaRoundPhase==="ready"\|\|seaRoundPhase==="go"[\s\S]{0,180}clearTimeout\(seaRoundCountdownTimer\)/,
  "backgrounding during countdown must stop the unseen timer");
assert.match(js, /!seaRoundCountdownTimer[\s\S]{0,180}startSeaRoundCountdown\(\)/,
  "foregrounding must replay an interrupted ようい / ドン！ sequence");
assert.match(js, /window\.addEventListener\("pagehide",\(\)=>\{hideWeatherNotice\(\);pauseSeaInput\(\)/);
assert.match(js, /window\.addEventListener\("resize",handleSeaViewportChange/);

/* Reduced motion and LP lock remain explicit. */
const buildFishBody = extractFunction(js, "buildSeaFish");
const renderFishBody = extractFunction(js, "renderSeaFish");
assert.match(buildFishBody, /14/);
assert.match(buildFishBody, /10/);
assert.match(buildFishBody, /6/);
assert.match(renderFishBody, /seaReducedMotion\(\)/);
assert.match(renderFishBody, /reduced\?0/);
assert.match(extractFunction(js, "seaControlAvailable"), /!window\.__PONO_TIER_LOCKED__/);
assert.match(extractFunction(js, "spawnSeaShot"), /window\.__PONO_TIER_LOCKED__/);
assert.match(extractFunction(js, "syncSeaCompanions"), /window\.__PONO_TIER_LOCKED__/);
const reducedCss = css.slice(css.indexOf("@media (prefers-reduced-motion:reduce)"));
assert.match(reducedCss, /\.sea-hit-spark,\.sea-burst-drop,\.sea-burst-ring,\.sea-burst-flash[^}]*display:none!important/,
  "reduced motion must suppress sparks, fragments, the expanding ring, and center flash");
assert.match(reducedCss, /\.vehicle-steer-shell[^}]*transition:none!important/);
assert.match(reducedCss, /body\.st-sea\.v-sub #veh \.vbody,body\.st-sea\.v-sub #veh \.submarine-art\{animation:none!important\}/);
assert.match(reducedCss, /#seaRoundCountdown[^,{]*(?:,[^{]*)?\{[^}]*animation\s*:\s*none!important/,
  "reduced-motion must keep ようい / ドン！ readable without scale animation");

assert.match(js, /id:"sea"[\s\S]{0,180}veh:"sub"[\s\S]{0,180}bank:SEA[\s\S]{0,180}gens:\["legsS","sizeS"\]/);
assertNoChildFacingKanji(renderSeaBody, "renderSeaBubbleGame");
assertNoChildFacingKanji(setSeaRoundPhaseBody, "setSeaRoundPhase");
assertNoChildFacingKanji(seaQuestionOptionsBody, "seaQuestionOptions");
assertNoChildFacingKanji(burstTargetBody, "beginSeaTargetBurst");
assertNoChildFacingKanji(extractFunction(js, "startSeaKeyboardTargetFire"), "startSeaKeyboardTargetFire");

console.log("nazonazo sea shooter regression: OK");
