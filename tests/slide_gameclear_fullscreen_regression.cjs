#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "slide/index.html"), "utf8");

function mainInlineScript(source) {
  const start = source.lastIndexOf("<script>");
  const end = source.indexOf("</script>", start);
  assert.ok(start >= 0 && end > start, "slide main inline script must exist");
  return source.slice(start + "<script>".length, end);
}

assert.match(html,
  /\.ov-card\.cutscene-mode\.cutscene-fullscreen\.reunion-fullscreen\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;/,
  "the reunion card fills the complete 16:9 game shell");
assert.match(html,
  /reunion-fullscreen\s*\{[\s\S]*?grid-template-areas:[\s\S]*?'title button'[\s\S]*?'message button'/,
  "the ending art keeps one non-overlapping caption and replay area");
assert.match(html,
  /\.cutscene-fullscreen\.reunion-fullscreen \.ov-msg\s*\{[\s\S]*?display:\s*block;/,
  "fullscreen reunion preserves the mother's dialogue and move count");
assert.match(html,
  /\.ov-card\.reunion-fullscreen \.ov-btn\s*\{[\s\S]*?safe-area-inset-right[\s\S]*?safe-area-inset-bottom/,
  "the replay action stays clear of landscape safe areas");

const showOverlayFunction = html.match(/function showOverlay\(type\) \{[\s\S]*?\n\}/);
assert.ok(showOverlayFunction, "showOverlay function exists");
assert.match(showOverlayFunction[0],
  /type === 'gameclear'[\s\S]*?classList\.add\('cutscene-mode', 'cutscene-fullscreen', 'reunion-fullscreen'\)/,
  "only the game-clear reward opts into the final fullscreen layout");
assert.match(showOverlayFunction[0],
  /type === 'gameclear'[\s\S]*?document\.body\.classList\.add\('slide-cutscene-open'\)/,
  "the reunion hides unrelated board controls");
assert.match(showOverlayFunction[0],
  /type === 'gameclear'[\s\S]*?syncJourneyProgress\(1, 1, \{ instant: true \}\)/,
  "the journey bar puts Pono and mother together at the final destination");
assert.match(showOverlayFunction[0], /cutscene_ending\.png/,
  "the existing parent-and-child ending illustration remains the reward art");
assert.match(showOverlayFunction[0], /ポノの だいすきな きのみと[\s\S]*?てかず\$\{moveCount\} でクリア/,
  "the final story and score remain available in fullscreen mode");
assert.match(showOverlayFunction[0], /もういっかい ▶/,
  "the fullscreen reward keeps one clear replay action");
assert.match(html,
  /classList\.remove\([\s\S]*?'cutscene-mode', 'cutscene-fullscreen', 'reunion-fullscreen'\)/,
  "starting another overlay clears the final-only layout state");

new vm.Script(mainInlineScript(html), { filename: "slide-gameclear-fullscreen-inline.js" });

console.log("slide gameclear fullscreen regression: PASS");
