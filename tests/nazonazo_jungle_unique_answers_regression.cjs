#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(root, "nazonazo-tunnel/js/game.js"), "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = game.indexOf(marker);
  assert.ok(start >= 0, `${name}: function missing`);
  const open = game.indexOf("{", start + marker.length);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = open; index < game.length; index += 1) {
    const char = game[index];
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
      if (depth === 0) return game.slice(start, index + 1);
    }
  }
  assert.fail(`${name}: unterminated function`);
}

const answerKey = extractFunction("questionAnswerKey");
const buildJungle = extractFunction("buildJungleQuestionList");
const buildQList = extractFunction("buildQList");

assert.match(buildQList, /if\(st\.id==="jungle"\)\{qList=buildJungleQuestionList\(st\);return;\}/,
  "the jungle must use its duplicate-safe question builder");
assert.match(buildJungle, /seen\.has\(key\)/, "jungle selection must reject a repeated correct answer");
assert.match(buildJungle, /attempt<64/, "generated collisions need a bounded retry path");

function question(label, kind, min = 0) {
  return { q: label, a: [label, label], d: [], h: "", kind, min };
}

function runLevel(level) {
  const generated = [
    question("ぞう", "generated"),
    question("ぞう", "generated"),
    question("らいおん", "generated"),
    question("ふくろう", "generated"),
    question("うさぎ", "generated")
  ];
  let generatedAt = 0;
  const stage = {
    id: "jungle",
    gens: ["legsJ", "sizeJ"],
    bank: [
      question("ぞう", "static", 0),
      question("きりん", "static", 0),
      question("さる", "static", 0),
      question("かめ", "static", 0),
      question("しまうま", "static", 0),
      question("こあら", "static", 1),
      question("わに", "static", 2)
    ]
  };
  const context = {
    level,
    QN: 5,
    GENS: {
      legsJ: () => generated[generatedAt++ % generated.length],
      sizeJ: () => generated[generatedAt++ % generated.length]
    },
    WORDPLAY: [question("ふらいぱん", "wordplay")],
    shuffle: values => values.slice(),
    pick: values => values[0],
    stage
  };
  vm.runInNewContext(`${answerKey}\n${buildJungle}\nthis.result=buildJungleQuestionList(stage);`, context, {
    filename: `nazonazo-jungle-unique-level-${level}.js`,
    timeout: 1000
  });
  return JSON.parse(JSON.stringify(context.result));
}

for (const [level, expectedGenerated, expectedWordplay] of [[0, 1, 0], [1, 2, 0], [2, 2, 1]]) {
  const result = runLevel(level);
  const keys = result.map(item => item.a[1]);
  assert.equal(result.length, 5, `level ${level}: the stage must still contain five questions`);
  assert.equal(new Set(keys).size, 5, `level ${level}: repeated passengers escaped into ${keys.join(", ")}`);
  assert.equal(result.filter(item => item.kind === "generated").length, expectedGenerated,
    `level ${level}: generated-question balance drifted`);
  assert.equal(result.filter(item => item.kind === "wordplay").length, expectedWordplay,
    `level ${level}: wordplay balance drifted`);
  assert.ok(result.filter(item => item.kind === "static").every(item => (item.min || 0) <= level),
    `level ${level}: a question above the selected difficulty was included`);
}

console.log("nazonazo jungle unique answers regression: PASS");
