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
const questionsJs = read("nazonazo-tunnel/data/questions.js");

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

function makeClassList(initial = []) {
  const names = new Set(initial);
  return {
    names,
    contains: name => names.has(name),
    add: (...values) => values.forEach(value => names.add(value)),
    remove: (...values) => values.forEach(value => names.delete(value)),
    toggle: (name, force) => {
      const next = force === undefined ? !names.has(name) : !!force;
      if (next) names.add(name);
      else names.delete(name);
      return next;
    }
  };
}

function makeElement(tagName = "span") {
  const attributes = new Map();
  const children = [];
  const properties = new Map();
  return {
    tagName: tagName.toUpperCase(),
    className: "",
    textContent: "",
    hidden: false,
    dataset: {},
    children,
    classList: makeClassList(),
    style: {
      setProperty: (name, value) => properties.set(name, value),
      removeProperty: name => properties.delete(name),
      properties
    },
    append: (...nodes) => children.push(...nodes),
    appendChild: node => { children.push(node); return node; },
    replaceChildren: (...nodes) => { children.splice(0, children.length, ...nodes); },
    setAttribute: (name, value) => attributes.set(name, String(value)),
    getAttribute: name => attributes.get(name),
    removeAttribute: name => attributes.delete(name),
    querySelector: selector => {
      if (selector === ".sea-boss-wrap") return children.find(child => child.className === "sea-boss-wrap") || null;
      if (selector === ".sea-boss-meter") return children.find(child => child.className === "sea-boss-meter") || null;
      if (selector === ".sea-boss-guide") return children.find(child => child.className === "sea-boss-guide") || null;
      if (selector === "span") return children.find(child => child.tagName === "SPAN") || null;
      return null;
    },
    attributes
  };
}

function assertNoChildFacingKanji(source, label) {
  const literals = [...source.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map(match => match[2]);
  for (const literal of literals.filter(value => /[ぁ-んァ-ヶ一-龠]/.test(value))) {
    assert.doesNotMatch(literal, /[一-龠]/, `${label}: child-facing string contains kanji: ${literal}`);
  }
}

const questionSandbox = { window: {} };
vm.createContext(questionSandbox);
vm.runInContext(questionsJs, questionSandbox);
const questionData = questionSandbox.window.PonoNazonazoQuestionData;
assert.ok(questionData && Array.isArray(questionData.SEA) && Array.isArray(questionData.WORDPLAY));
assert.match(html, /data\/questions\.js\?v=20260713-1273/, "the sea-creature registry update needs a fresh questions cache key");
assert.ok(questionData.SEA.some(question => question.a[1] === "うみがめ"), "the sea registry needs a rescuable creature in the former shell slot");
assert.ok(!questionData.SEA.some(question => question.a[1] === "かいがら"), "non-creature shell entries would make the rescue registry impossible to complete");

const seaRescueQuestionKeyBody = extractFunction(js, "seaRescueQuestionKey");
const buildSeaRescueListBody = extractFunction(js, "buildSeaRescueList");
const buildQListBody = extractFunction(js, "buildQList");
const seaQuestionOptionsBody = extractFunction(js, "seaQuestionOptions");
const showQuizBody = extractFunction(js, "showQuiz");
const renderSeaBubbleBody = extractFunction(js, "renderSeaBubbleGame");
const beginSeaTargetBurstBody = extractFunction(js, "beginSeaTargetBurst");
const showSeaRescueMessageBody = extractFunction(js, "showSeaRescueMessage");
const clearSeaRescueMessageBody = extractFunction(js, "clearSeaRescueMessage");
const syncSeaCompanionsBody = extractFunction(js, "syncSeaCompanions");
const seaBossPlayableBody = extractFunction(js, "seaBossPlayable");
const seaBossDamageBody = extractFunction(js, "seaBossDamagePerVolley");
const updateSeaBossVisualBody = extractFunction(js, "updateSeaBossVisual");
const hitSeaBossBody = extractFunction(js, "hitSeaBoss");
const finishSeaBossVictoryBody = extractFunction(js, "finishSeaBossVictory");
const showSeaBossBody = extractFunction(js, "showSeaBossEncounter");
const clearSeaBossBody = extractFunction(js, "clearSeaBossEncounter");
const proceedBody = extractFunction(js, "proceed");

/* Rescue runs: generators are allowed to repeat, but the five rescued species are not. */
assert.doesNotMatch(buildSeaRescueListBody, /WORDPLAY/, "sea rescue list must never pull a wordplay question");
assert.ok(
  buildQListBody.indexOf('if(st.id==="sea")') < buildQListBody.indexOf("WORDPLAY"),
  "the sea branch must return before the generic WORDPLAY injection"
);
assert.doesNotMatch(buildSeaRescueListBody, /かいがら/, "the rescue builder must not need a hidden registry exception");
assert.match(buildSeaRescueListBody, /seen\.has\(key\)/);

for (let difficulty = 0; difficulty < 3; difficulty += 1) {
  const repeated = { q: "なんども でる もんだい", a: ["🐙", "たこ"], d: [["🐟", "さかな"]], h: "" };
  const context = {
    level: difficulty,
    QN: 5,
    GENS: { repeatA: () => repeated, repeatB: () => repeated },
    pick: values => values[0],
    shuffle: values => values.slice()
  };
  vm.createContext(context);
  vm.runInContext(
    `${seaRescueQuestionKeyBody};${buildSeaRescueListBody};this.buildSeaRescueList=buildSeaRescueList;`,
    context
  );
  const list = context.buildSeaRescueList({ bank: questionData.SEA, gens: ["repeatA", "repeatB"] });
  const labels = list.map(question => question.a[1]);
  assert.equal(list.length, 5, `difficulty ${difficulty}: rescue run must contain five questions`);
  assert.equal(new Set(labels).size, 5, `difficulty ${difficulty}: rescued species must be unique`);
  assert.ok(!labels.includes("かいがら"), `difficulty ${difficulty}: an object cannot become a rescued companion`);
  assert.ok(list.every(question => questionData.SEA.includes(question) || question === repeated),
    `difficulty ${difficulty}: rescue run must use only the sea bank and sea generators`);
  assert.ok(list.every(question => !questionData.WORDPLAY.includes(question)),
    `difficulty ${difficulty}: WORDPLAY must stay out of the sea rescue run`);
}

/* The bubble copy and semantic mode explain that the creature is trapped and shrunken. */
assert.match(html, /id="seaRescueMessage"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"[^>]*hidden/);
assert.match(showQuizBody, /あわの ともだちを たすけよう！/);
assert.match(seaQuestionOptionsBody, /ok:true,mode:"sea"/);
assert.match(seaQuestionOptionsBody, /ok:false,mode:"sea"/);
assert.match(renderSeaBubbleBody, /あわの なかで ちいさくされた/);
assert.match(renderSeaBubbleBody, /className="em sea-captive"/);
assert.match(cssRule("\\.sea-answer-bubble \\.em"), /scale\(var\(--sea-captive-scale,\.66\)\)/);
assert.match(extractFunction(js, "updateSeaAnswerTargets"), /--sea-captive-scale[\s\S]*?\/entry\.scale/,
  "the creature must stay visibly small while its prison bubble inflates");

const optionContext = {
  shuffle: values => values.slice(),
  cars: [{ t: "かに", pending: false }],
  passengerLabel: friend => friend.t,
  qList: [{ a: ["🦀", "かに"] }, { a: ["🐢", "うみがめ"] }],
  seaRescueQuestionKey: question => question.a[1],
  SEA_DECOYS: [["🐔", "にわとり"], ["🐝", "はち"]],
  seaDecoysSeen: new Set()
};
vm.createContext(optionContext);
vm.runInContext(`${seaQuestionOptionsBody};this.seaQuestionOptions=seaQuestionOptions;`, optionContext);
const modeOptions = optionContext.seaQuestionOptions({ a: ["🐙", "たこ"], d: [["🦀", "かに"], ["🐢", "かめ"], ["🐔", "にわとり"]] });
assert.equal(modeOptions.length, 2);
assert.ok(modeOptions.every(option => option.mode === "sea"));
assert.ok(!modeOptions.some(option => !option.ok && option.t === "かに"), "a rescued species must not return as a decoy bubble");
assert.ok(!modeOptions.some(option => !option.ok && option.e === "🐢"), "a future rescue must not appear early under a different label");

/* Only a correct prison gets the large rescue burst; a wrong answer is repelled. */
function makeBurstSandbox(reduced = false) {
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
    seaShooterEpoch: 7,
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
    picks: [],
    onPick: (button, value) => {
      state.picks.push(value);
      if (!value.ok) { button.classList.add("dim"); button.disabled = true; }
    },
    setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
    clearTimeout: () => {},
    timers,
    answerButton,
    otherButton
  };
  vm.createContext(state);
  vm.runInContext(`${beginSeaTargetBurstBody};this.beginSeaTargetBurst=beginSeaTargetBurst;`, state);
  return state;
}

const wrongBurst = makeBurstSandbox(false);
wrongBurst.beginSeaTargetBurst({
  button: wrongBurst.answerButton,
  value: { ok: false, mode: "sea" },
  bursting: false,
  x: 100,
  y: 100
});
assert.ok(wrongBurst.answerButton.classList.contains("is-repelled"));
assert.equal(wrongBurst.particleCalls, 0, "wrong bubbles must not use the rescue explosion");
assert.equal(wrongBurst.timers[0].delay, 220);
wrongBurst.timers.shift().callback();
assert.equal(wrongBurst.picks.length, 1);
assert.equal(wrongBurst.picks[0].ok, false);
assert.equal(wrongBurst.particleCalls, 0);

const correctBurst = makeBurstSandbox(false);
const correctEntry = {
  button: correctBurst.answerButton,
  value: { ok: true, mode: "sea" },
  bursting: false,
  x: 100,
  y: 100
};
correctBurst.seaBubbleOptions = [correctEntry, { button: correctBurst.otherButton, value: { ok: false } }];
correctBurst.beginSeaTargetBurst(correctEntry);
assert.ok(correctBurst.otherButton.classList.contains("is-dismissed"), "the decoy bubble must disappear before the rescue message");
assert.equal(correctBurst.timers[0].delay, 140);
correctBurst.timers.shift().callback();
assert.equal(correctBurst.particleCalls, 1, "correct rescue must create the large bubble explosion");
assert.ok(correctBurst.answerButton.classList.contains("is-bursting"));
assert.equal(correctBurst.timers[0].delay, 380);
correctBurst.timers.shift().callback();
assert.equal(correctBurst.picks.length, 1);
assert.equal(correctBurst.picks[0].ok, true);

/* Rescue feedback is visible, announced, bounded, and feeds the normal passenger path. */
assert.match(showSeaRescueMessageBody, /SEA_RESCUE_LINES\[index%SEA_RESCUE_LINES\.length\]/);
assert.match(showSeaRescueMessageBody, /announce\(\(passengerLabel\(passenger\)\|\|"うみの ともだち"\)/);
assert.match(showSeaRescueMessageBody, /1450/);
const rescueLineMatch = /const SEA_RESCUE_LINES=(\[[\s\S]*?\]);/.exec(js);
assert.ok(rescueLineMatch, "SEA_RESCUE_LINES is missing");
const rescueLines = vm.runInNewContext(rescueLineMatch[1]);
assert.equal(rescueLines.length, 5);
assert.match(rescueLines.join(" "), /てつだう/);
assert.match(rescueLines.join(" "), /この おくは あぶない/);
rescueLines.forEach((line, index) => assert.doesNotMatch(line, /[一-龠]/, `rescue line ${index} contains kanji`));

const onPickBody = extractFunction(js, "onPick");
assert.match(onPickBody, /const seaRescue=isSeaStage\(\)&&o\.mode==="sea"/);
assert.match(onPickBody, /boardPassenger\(passenger,pe,seaRescue\?el:t\)/);
assert.match(onPickBody, /if\(seaRescue\)showSeaRescueMessage\(passenger,qSeg\)/);
assert.match(onPickBody, /seaRescue\?1500:1050/);

/* Companions are de-duplicated by species and only the newest three follow. */
const companionLayer = makeElement("div");
const companionContext = {
  seaCompanionLayer: companionLayer,
  window: { __PONO_TIER_LOCKED__: false },
  isSeaStage: () => true,
  cars: [
    { e: "🐙", t: "たこ" },
    { e: "🐋", t: "くじら" },
    { e: "🦀", t: "かに" },
    { e: "🐳", t: "くじら" },
    { e: "🦑", t: "いか" },
    { pending: true, e: "🐡", t: "ふぐ" },
    { e: "🐬", t: "いるか" }
  ],
  SEA_COMPANION_LIMIT: 3,
  seaCompanionKey: "",
  seaCompanionSprites: [],
  seaTrail: [],
  document: { createElement: tag => makeElement(tag) }
};
vm.createContext(companionContext);
vm.runInContext(`${syncSeaCompanionsBody};this.syncSeaCompanions=syncSeaCompanions;`, companionContext);
companionContext.syncSeaCompanions();
assert.equal(companionContext.seaCompanionSprites.length, 3);
assert.deepEqual(
  companionLayer.children.map(element => element.children[0].textContent),
  ["🐳", "🦑", "🐬"],
  "the last three unique, non-pending rescued species must follow the submarine"
);

/* Boss asset, semantic HP meter, damage states, and reduced-motion fallback. */
assert.match(js, /boss:"\.\.\/assets\/images\/nazonazo-tunnel\/sea_boss_anglerfish_20260713\.png"/);
const bossAsset = path.join(root, "assets/images/nazonazo-tunnel/sea_boss_anglerfish_20260713.png");
assert.ok(fs.existsSync(bossAsset), "anglerfish boss asset is missing");
assert.ok(fs.statSync(bossAsset).size < 3 * 1024 * 1024, "anglerfish boss asset exceeds 3MB");
assert.match(html, /id="seaBossLayer"[^>]*role="group"[^>]*aria-label="おおあわぬしとの たたかい"[^>]*hidden/);
const buildSeaBossBody = extractFunction(js, "buildSeaBossEncounter");
assert.match(buildSeaBossBody, /role","progressbar"/);
assert.match(buildSeaBossBody, /aria-label","あわバリア"/);
assert.match(buildSeaBossBody, /aria-valuemin","0"/);
const updateSeaBossProgressBody = extractFunction(js, "updateSeaBossProgress");
assert.match(updateSeaBossProgressBody, /aria-valuemax/);
assert.match(updateSeaBossProgressBody, /aria-valuenow/);
assert.match(updateSeaBossProgressBody, /aria-valuetext","あわバリア のこり /);
assert.match(cssRule("\\.sea-boss-wrap\\.is-hit \\.sea-boss-art"), /brightness\(1\.36\)[\s\S]*hue-rotate\(-18deg\)/);
assert.match(css, /\.sea-boss-wrap\.damage-1[\s\S]*\.sea-boss-wrap\.damage-2[\s\S]*\.sea-boss-wrap\.damage-3/);
assert.match(updateSeaBossVisualBody, /seaReducedMotion\(\)\|\|seaBossPhase!=="active"\?0:Math\.sin/);
assert.match(updateSeaBossVisualBody, /classList\.toggle\("is-hit",seaBossPhase==="active"&&\(now\|\|_nowMs\(\)\)<seaBossFlashUntil\)/,
  "hit color must be derived from flashUntil so rapid hits extend rather than race old timers");
const reducedCss = css.slice(css.indexOf("@media (prefers-reduced-motion:reduce)"));
assert.match(reducedCss, /\*\{animation-duration:\.01s!important;transition-duration:\.01s!important\}/);

const bossHpMatch = /const SEA_BOSS_HP=\[([^\]]+)\];/.exec(js);
assert.ok(bossHpMatch, "SEA_BOSS_HP is missing");
const bossHp = bossHpMatch[1].split(",").map(Number);
assert.deepEqual(bossHp, [144, 192, 240]);
assert.deepEqual(bossHp.map(hp => hp / 4), [36, 48, 60],
  "three rescued companions should turn the boss HP into a 36/48/60-volley finale");

const damageContext = { SEA_COMPANION_LIMIT: 3, seaCompanionSprites: [] };
vm.createContext(damageContext);
vm.runInContext(`${seaBossDamageBody};this.seaBossDamagePerVolley=seaBossDamagePerVolley;`, damageContext);
assert.equal(damageContext.seaBossDamagePerVolley(), 1);
damageContext.seaCompanionSprites = [{}, {}, {}];
assert.equal(damageContext.seaBossDamagePerVolley(), 4, "submarine plus three friends must deal four damage per volley");
damageContext.seaCompanionSprites = [{}, {}, {}, {}, {}];
assert.equal(damageContext.seaBossDamagePerVolley(), 4, "extra stale companions must not exceed the three-friend cap");

/* LP, intro, hidden DOM, and defeated phases cannot accept boss damage. */
const playableClasses = makeClassList(["sea-boss-active"]);
const playableContext = {
  window: { __PONO_TIER_LOCKED__: false },
  seaBossPhase: "active",
  document: { body: { classList: playableClasses } },
  seaBossLayer: { hidden: false }
};
vm.createContext(playableContext);
vm.runInContext(`${seaBossPlayableBody};this.seaBossPlayable=seaBossPlayable;`, playableContext);
assert.equal(playableContext.seaBossPlayable(), true);
playableContext.window.__PONO_TIER_LOCKED__ = true;
assert.equal(playableContext.seaBossPlayable(), false);
playableContext.window.__PONO_TIER_LOCKED__ = false;
playableContext.seaBossPhase = "intro";
assert.equal(playableContext.seaBossPlayable(), false);
playableContext.seaBossPhase = "active";
playableContext.seaBossLayer.hidden = true;
assert.equal(playableContext.seaBossPlayable(), false);
assert.match(showSeaBossBody, /if\(window\.__PONO_TIER_LOCKED__\|\|!isSeaStage\(\)\|\|!playing\|\|seaBossDefeated\)return/);
assert.match(showSeaBossBody, /seaBossPhase="intro"/);
assert.match(showSeaBossBody, /seaBossPhase="active"/);

/* One salvo does one HP transaction, including all companion damage, and thresholds fire once. */
const hitContext = {
  seaBossPhase: "active",
  seaBossHp: 16,
  seaBossMaxHp: 16,
  seaBossFlashUntil: 0,
  seaBossSalvos: new Set(),
  seaBossThresholds: new Set(),
  seaCompanionSprites: [{}, {}, {}],
  SEA_COMPANION_LIMIT: 3,
  seaBossPlayable: () => hitContext.seaBossPhase === "active" && !hitContext.locked,
  locked: false,
  _nowMs: () => 1000,
  createSeaHitSpark: () => { hitContext.sparkCalls += 1; },
  tone: () => {},
  updateSeaBossProgress: () => { hitContext.progressCalls += 1; },
  seaBossGuide: message => hitContext.guides.push(message),
  finishSeaBossVictory: () => { hitContext.victoryCalls += 1; hitContext.seaBossPhase = "defeated"; },
  sparkCalls: 0,
  progressCalls: 0,
  victoryCalls: 0,
  guides: []
};
vm.createContext(hitContext);
vm.runInContext(`${seaBossDamageBody};${hitSeaBossBody};this.hitSeaBoss=hitSeaBoss;`, hitContext);
assert.equal(hitContext.hitSeaBoss(1, 500, 120), true);
assert.equal(hitContext.seaBossHp, 12);
assert.equal(hitContext.seaBossFlashUntil, 1155);
assert.equal(hitContext.hitSeaBoss(1, 500, 120), false, "submarine and companion shots sharing a salvo must not stack twice");
assert.equal(hitContext.seaBossHp, 12);
assert.equal(hitContext.hitSeaBoss(2, 500, 120), true);
assert.equal(hitContext.hitSeaBoss(3, 500, 120), true);
assert.deepEqual(hitContext.guides, ["きいてる！", "あと はんぶん！", "もう すこし！"]);
assert.equal(hitContext.hitSeaBoss(4, 500, 120), true);
assert.equal(hitContext.seaBossHp, 0);
assert.equal(hitContext.victoryCalls, 1);
assert.equal(hitContext.hitSeaBoss(5, 500, 120), false, "defeated boss must reject overkill volleys");
assert.equal(hitContext.victoryCalls, 1);
assert.equal(hitContext.sparkCalls, 4);
assert.equal(hitContext.progressCalls, 4);

/* Victory is idempotent, epoch-owned, reduced-motion aware, and completes the stage once. */
function makeVictorySandbox(reduced = false) {
  const timers = [];
  const wrap = { classList: makeClassList() };
  const state = {
    seaBossPhase: "active",
    seaBossDefeated: false,
    seaBossX: 620,
    seaBossY: 150,
    seaBossWidth: 260,
    seaBossEpoch: 9,
    seaBossTimer: 0,
    seaMoveKeys: new Set(["ArrowLeft"]),
    seaBossLayer: { querySelector: selector => selector === ".sea-boss-wrap" ? wrap : null },
    stopSeaFiring: () => { state.stopCalls += 1; },
    cancelSeaPointer: () => {},
    cancelSeaFirePointer: () => {},
    removeAllSeaShots: () => {},
    createSeaBurstParticles: () => { state.burstCalls += 1; },
    seaBossGuide: () => {},
    showStamp: () => {},
    tone: () => {},
    confetti: () => {},
    playing: true,
    isSeaStage: () => true,
    clearSeaBossEncounter: () => { state.clearCalls += 1; },
    completeCurrentStage: value => { state.completeCalls.push(value); },
    origin: stage => stage * 100,
    stg: 3,
    SEA_BOSS_VICTORY_MS: 1050,
    seaReducedMotion: () => reduced,
    setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
    timers,
    wrap,
    stopCalls: 0,
    burstCalls: 0,
    clearCalls: 0,
    completeCalls: []
  };
  vm.createContext(state);
  vm.runInContext(`${finishSeaBossVictoryBody};this.finishSeaBossVictory=finishSeaBossVictory;`, state);
  return state;
}

const victory = makeVictorySandbox(false);
victory.finishSeaBossVictory();
victory.finishSeaBossVictory();
assert.equal(victory.seaBossPhase, "defeated");
assert.equal(victory.burstCalls, 1);
assert.equal(victory.timers.length, 1, "victory may schedule stage completion only once");
assert.equal(victory.timers[0].delay, 1050);
victory.timers[0].callback();
assert.equal(victory.clearCalls, 1);
assert.deepEqual(victory.completeCalls, [300]);

const staleVictory = makeVictorySandbox(false);
staleVictory.finishSeaBossVictory();
staleVictory.seaBossEpoch += 1;
staleVictory.timers[0].callback();
assert.equal(staleVictory.clearCalls, 0);
assert.deepEqual(staleVictory.completeCalls, [], "stale boss victory timer must not clear a later scene");

const reducedVictory = makeVictorySandbox(true);
reducedVictory.finishSeaBossVictory();
assert.equal(reducedVictory.timers[0].delay, 80, "reduced motion must preserve victory progression without the long exit motion");

/* The fifth rescue drives to the boss instead of clearing the sea stage. */
function makeProceedSandbox({ qSeg = 4, defeated = false } = {}) {
  const state = {
    playing: true,
    stg: 3,
    qSeg,
    QN: 5,
    seaBossDefeated: defeated,
    target: 0,
    pending: null,
    driving: false,
    rareSpawned: true,
    setDriverMood: () => {},
    drawDots: () => {},
    origin: () => 1000,
    scheduleRareSpawn: () => {},
    sndGo: () => {},
    stops: (originValue, index) => originValue + index * 100,
    isSeaStage: () => true,
    completeCurrentStage: value => { state.completeCalls.push(value); },
    completeCalls: []
  };
  vm.createContext(state);
  vm.runInContext(`${proceedBody};this.proceed=proceed;`, state);
  return state;
}

const afterFifth = makeProceedSandbox();
afterFifth.proceed();
assert.equal(afterFifth.qSeg, 5);
assert.equal(afterFifth.pending, "seaBoss");
assert.equal(afterFifth.driving, true);
assert.deepEqual(afterFifth.completeCalls, [], "question five must not clear the stage before the boss");

const alreadyDefeated = makeProceedSandbox({ defeated: true });
alreadyDefeated.proceed();
assert.deepEqual(alreadyDefeated.completeCalls, [1000]);

/* Cleanup owns every boss timer/set/DOM node and every exit goes through the sea reset. */
const bossLayer = makeElement("div");
bossLayer.hidden = false;
bossLayer.appendChild(makeElement("span"));
const cleanupClasses = makeClassList(["sea-boss-active", "sea-arena-active"]);
const cleanupContext = {
  seaBossEpoch: 4,
  seaBossTimer: 77,
  seaBossPhase: "active",
  seaBossHp: 20,
  seaBossMaxHp: 24,
  seaBossX: 600,
  seaBossY: 150,
  seaBossRadiusX: 80,
  seaBossRadiusY: 60,
  seaBossWidth: 220,
  seaBossFlashUntil: 1200,
  seaBossSalvos: new Set([1, 2]),
  seaBossThresholds: new Set([.75]),
  seaRoundPhase: "idle",
  seaBossLayer: bossLayer,
  helpBtn: { disabled: true },
  seaMoveKeys: new Set(["ArrowLeft"]),
  document: { body: { classList: cleanupClasses } },
  clearTimeout: timer => { cleanupContext.clearedTimer = timer; },
  cancelSeaPointer: () => {},
  cancelSeaFirePointer: () => {},
  stopSeaFiring: () => {},
  removeAllSeaShots: () => { cleanupContext.shotsCleared += 1; },
  clearedTimer: 0,
  shotsCleared: 0
};
vm.createContext(cleanupContext);
vm.runInContext(`${clearSeaBossBody};this.clearSeaBossEncounter=clearSeaBossEncounter;`, cleanupContext);
cleanupContext.clearSeaBossEncounter();
assert.equal(cleanupContext.seaBossEpoch, 5);
assert.equal(cleanupContext.clearedTimer, 77);
assert.equal(cleanupContext.seaBossPhase, "idle");
assert.equal(cleanupContext.seaBossHp, 0);
assert.equal(cleanupContext.seaBossMaxHp, 0);
assert.equal(cleanupContext.seaBossFlashUntil, 0);
assert.equal(cleanupContext.seaBossSalvos.size, 0);
assert.equal(cleanupContext.seaBossThresholds.size, 0);
assert.equal(bossLayer.hidden, true);
assert.equal(bossLayer.children.length, 0);
assert.equal(cleanupClasses.contains("sea-boss-active"), false);
assert.equal(cleanupClasses.contains("sea-arena-active"), false);
assert.equal(cleanupContext.helpBtn.disabled, false);
assert.equal(cleanupContext.seaMoveKeys.size, 0);
assert.equal(cleanupContext.shotsCleared, 1);

const resetSeaBody = extractFunction(js, "resetSeaInteraction");
assert.match(resetSeaBody, /clearSeaBubbleGame\(\);clearSeaBossEncounter\(\);clearSeaRescueMessage\(\)/);
for (const functionName of ["startJourneyAt", "beginStageTransit", "openMap", "ending"]) {
  assert.match(extractFunction(js, functionName), /resetSeaInteraction\(\)/, `${functionName}: boss state is not cleaned up`);
}
assert.match(extractFunction(js, "nazonazoAdminPreviewArm"), /resetSeaInteraction\(\)/,
  "admin stage switching must clear a live boss encounter");
assert.match(clearSeaRescueMessageBody, /clearTimeout\(seaRescueMessageTimer\)/);
assert.match(clearSeaRescueMessageBody, /hidden=true/);
assert.match(clearSeaRescueMessageBody, /replaceChildren\(\)/);

/* Child-facing rescue and boss strings stay in kana/katakana. */
for (const [label, source] of [
  ["sea rescue key", seaRescueQuestionKeyBody],
  ["sea rescue list", buildSeaRescueListBody],
  ["sea question mode", seaQuestionOptionsBody],
  ["sea rescue message", showSeaRescueMessageBody],
  ["sea boss build", buildSeaBossBody],
  ["sea boss progress", updateSeaBossProgressBody],
  ["sea boss hit", hitSeaBossBody],
  ["sea boss victory", finishSeaBossVictoryBody],
  ["sea boss intro", showSeaBossBody]
]) assertNoChildFacingKanji(source, label);

const seaBossGuideBody = extractFunction(js, "seaBossGuide");
assert.match(seaBossGuideBody, /if\(announceMessage\)announce\(message\)/,
  "boss guide must announce its visible message, not the boolean announce flag");

console.log("nazonazo sea rescue and boss regression: OK");
