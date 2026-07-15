#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "nazonazo-tunnel/index.html"), "utf8");
const game = fs.readFileSync(path.join(root, "nazonazo-tunnel/js/game.js"), "utf8");
const css = fs.readFileSync(path.join(root, "nazonazo-tunnel/styles.css"), "utf8");
const questionsSource = fs.readFileSync(path.join(root, "nazonazo-tunnel/data/questions.js"), "utf8");
const registryPath = path.join(root, "nazonazo-tunnel/data/quiz-art.js");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name}: function missing`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
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
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`${name}: unterminated function`);
}

function extractLiteral(pattern, label) {
  const match = pattern.exec(game);
  assert.ok(match, `${label}: literal missing`);
  return vm.runInNewContext(match[1]);
}

/* The registry must load between question data and the runtime, with fresh cache keys. */
const questionScriptIndex = html.indexOf('src="data/questions.js');
const artScriptIndex = html.indexOf('src="data/quiz-art.js?v=20260714');
const gameScriptIndex = html.indexOf('src="js/game.js?v=20260716');
assert.ok(questionScriptIndex >= 0 && questionScriptIndex < artScriptIndex && artScriptIndex < gameScriptIndex,
  "quiz art must load after questions and before game.js");
assert.match(html, /styles\.css\?v=20260716/, "illustration layout needs a fresh stylesheet cache key");

/* Every static and generated semantic pair must have an exact composite-key entry. */
assert.ok(fs.existsSync(registryPath), "nazonazo-tunnel/data/quiz-art.js is missing");
const questionSandbox = { window: {} };
vm.createContext(questionSandbox);
vm.runInContext(questionsSource, questionSandbox, { filename: "questions.js" });
const data = questionSandbox.window.PonoNazonazoQuestionData;
assert.ok(data, "question data did not initialize");

const pairs = new Map();
function addPair(pair) {
  if (!Array.isArray(pair) || pair.length < 2) return;
  pairs.set(`${pair[0]}|${pair[1]}`, [pair[0], pair[1]]);
}
for (const bankName of ["TOWN", "JUNGLE", "SEA", "FUTURE", "SPACE", "WORDPLAY"]) {
  for (const question of data[bankName]) {
    addPair(question.a);
    question.d.forEach(addPair);
    addPair(question.pe);
  }
}
for (const listName of ["CNT_EMO", "JLEGS", "SLEGS", "JSIZE", "SSIZE", "SPEED"]) data[listName].forEach(addPair);
extractLiteral(/const SEA_DECOYS=(\[[\s\S]*?\]);/, "SEA_DECOYS").forEach(addPair);
extractLiteral(/const NUMBER_CARGO_THEMES=(\[[\s\S]*?\]);/, "NUMBER_CARGO_THEMES")
  .forEach(theme => addPair([theme.e, theme.name]));
assert.equal(pairs.size, 175, "the complete quiz-content inventory changed; review the art registry deliberately");

const registrySandbox = { window: {} };
vm.createContext(registrySandbox);
vm.runInContext(fs.readFileSync(registryPath, "utf8"), registrySandbox, { filename: "quiz-art.js" });
const exported = registrySandbox.window.PonoNazonazoQuizArt;
const registry = exported && exported.items && typeof exported.items === "object" ? exported.items : exported;
assert.ok(registry && typeof registry === "object", "quiz art registry did not initialize");

function itemSrc(item) {
  return typeof item === "string" ? item : item && item.src;
}
for (const key of pairs.keys()) {
  assert.ok(Object.hasOwn(registry, key), `missing generated illustration mapping: ${key}`);
  const src = itemSrc(registry[key]);
  assert.equal(typeof src, "string", `${key}: registry value needs a URL string or {src}`);
  assert.ok(src.length > 0, `${key}: empty illustration URL`);
  const cleanSrc = src.split(/[?#]/, 1)[0];
  const assetPath = cleanSrc.startsWith("/") ? path.join(root, cleanSrc) : path.resolve(root, "nazonazo-tunnel", cleanSrc);
  assert.ok(fs.existsSync(assetPath), `${key}: generated illustration is missing at ${cleanSrc}`);
  assert.ok(fs.statSync(assetPath).size < 3 * 1024 * 1024, `${key}: generated illustration exceeds 3MB`);
}

for (const [left, right] of [
  ["🍬|あめ", "🌧️|あめ"],
  ["🐙|たこ", "🪁|たこ"],
  ["🐢|かめ", "🐢|うみがめ"],
  ["🧱|れんが", "🧱|かべ"]
]) {
  assert.ok(Object.hasOwn(registry, left) && Object.hasOwn(registry, right), `${left} / ${right}: composite collision lost an entry`);
  assert.notEqual(itemSrc(registry[left]), itemSrc(registry[right]), `${left} / ${right}: distinct meanings must not collapse to one illustration`);
}

/* The shared renderer accepts string and object entries and reveals a plain-text fallback only on failure. */
const helperNames = ["quizArtKey", "quizArtItems", "resolveQuizArt", "fillArtHolder", "createQuizArt"];
const helperSource = helperNames.map(name => extractFunction(game, name)).join("\n");
function fakeElement(tagName) {
  const listeners = {};
  const classes = new Set();
  return {
    tagName: tagName.toUpperCase(), dataset: {}, children: [], hidden: false, className: "", alt: "", src: "",
    style: { setProperty() {} },
    classList: { add(...names) { names.forEach(name => classes.add(name)); }, contains(name) { return classes.has(name); } },
    setAttribute(name, value) { this[name] = String(value); },
    addEventListener(name, callback) { listeners[name] = callback; },
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    __dispatch(name) { if (listeners[name]) listeners[name](); }
  };
}
const helperContext = {
  window: { PonoNazonazoQuizArt: { items: {
    "🍎|りんご": "../assets/apple.webp",
    "🍬|あめ": { src: "../assets/candy.webp" },
    "🌧️|あめ": { src: "../assets/rain.webp" }
  } } },
  document: { createElement: fakeElement }
};
vm.createContext(helperContext);
vm.runInContext(`${helperSource};this.api={quizArtKey,resolveQuizArt,createQuizArt};`, helperContext);
assert.equal(helperContext.api.quizArtKey("🍬", "あめ"), "🍬|あめ");
assert.equal(helperContext.api.resolveQuizArt("🍎", "りんご"), "../assets/apple.webp");
assert.equal(helperContext.api.resolveQuizArt("🍬", "あめ"), "../assets/candy.webp");
assert.notEqual(helperContext.api.resolveQuizArt("🍬", "あめ"), helperContext.api.resolveQuizArt("🌧️", "あめ"));
const validArt = helperContext.api.createQuizArt("🍎", "りんご");
assert.equal(validArt.children[0].src, "../assets/apple.webp");
assert.equal(validArt.children[1].hidden, true, "text fallback must be hidden while the generated image loads normally");
validArt.children[0].__dispatch("error");
assert.equal(validArt.children[0].hidden, true);
assert.equal(validArt.children[1].hidden, false, "an image error must reveal the semantic text fallback");
assert.equal(validArt.children[1].textContent, "?", "failure fallback must not reintroduce an emoji glyph");
const missingArt = helperContext.api.createQuizArt("❓", "みとうろく");
assert.equal(missingArt.children[0].hidden, true);
assert.equal(missingArt.children[1].hidden, false, "a missing registry entry must fail safely without a blank answer");

/* Every quiz display route must call the shared renderer instead of exposing content emoji. */
const routeExpectations = new Map([
  ["renderChoiceCards", /createQuizArt\(o\.e,o\.t\)/],
  ["renderSeaBubbleGame", /createQuizArt\(o\.e,o\.t,"sea-captive"\)/],
  ["renderFutureCapsuleGame", /createQuizArt\(o\.e,o\.t\)/],
  ["renderSpaceRepairGame", /createQuizArt\(o\.e,o\.t\)/],
  ["renderNumberCargoGame", /createQuizArt\(theme\.e,theme\.name,"number-cargo-art"\)[\s\S]*createQuizArt\(theme\.e,theme\.name,"number-cargo-load-art"\)/],
  ["animateNumberCargoToWagon", /createQuizArt\(theme\.e,theme\.name,"number-cargo-fly"\)/],
  ["renderQuizQuestion", /for\(let index=0;index<count;index\+\+\)grid\.appendChild\(createQuizArt\(cur\.pe\[0\],cur\.pe\[1\],"number-count-art"\)\)/],
  ["showSeaRescueMessage", /createQuizArt\([^;]+"sea-rescue-friend"/],
  ["openZukan", /has\?createQuizArt\(it\.e,it\.t,"ze",it\.img\)/]
]);
for (const [name, pattern] of routeExpectations) {
  const source = extractFunction(game, name);
  assert.match(source, pattern, `${name}: generated illustration renderer is missing`);
  assert.doesNotMatch(source, /(?:emoji|art|fly|friend)\.textContent\s*=\s*(?:o|theme|passenger|cur)\.(?:e|pe)/,
    `${name}: content emoji must not be the normal visual path`);
}
assert.match(extractFunction(game, "showQuiz"), /renderQuizQuestion\(\)/, "all question text must pass through the count-art renderer");
assert.match(extractFunction(game, "onPick"), /img:resolveQuizArt\(pe\[0\],pe\[1\]\)/,
  "the correct generated illustration must travel into the passenger, companion, and tunnel recap flows");
assert.doesNotMatch(extractFunction(game, "renderChoiceCards"), /innerHTML|textContent\s*=\s*o\.e/,
  "ordinary answer cards must not inject emoji HTML");

/* Stable holders prevent layout shift across normal, mini-game, and count contexts. */
for (const selector of [
  ".quiz-art-image", ".choice>.quiz-art", ".sea-answer-bubble .quiz-art", ".future-capsule .quiz-art",
  ".space-repair-answer .quiz-art", ".number-cargo-art", ".number-cargo-slot>.number-cargo-load-art",
  ".number-cargo-fly", ".number-count-grid", ".number-count-art", ".zkCell .ze.quiz-art"
]) assert.ok(css.includes(`${selector}{`), `${selector}: illustration sizing rule missing`);
assert.match(css, /\.quiz-art-fallback\[hidden\]\{display:none!important\}/,
  "fallback text must stay hidden during normal image rendering");
assert.match(css, /\.quiz-art-image\{[^}]*object-fit:contain/, "generated art must never be cropped inside a choice");
assert.match(css, /\.number-count-grid\{[^}]*grid-template-columns/, "up to nine count illustrations need a bounded grid");

console.log(`Nazonazo quiz illustration regression: PASS (${pairs.size} semantic pairs)`);
