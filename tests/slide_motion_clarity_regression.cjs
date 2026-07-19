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

const duration = Number((html.match(/const SLIDE_DUR = (\d+);/) || [])[1]);
assert.ok(duration >= 300 && duration <= 500,
  `a road panel must remain trackable for 300-500ms (received ${duration})`);
assert.match(html, /const REDUCED_SLIDE_DUR = 1;/,
  "reduced-motion users receive an effectively instant board commit");

assert.doesNotMatch(html, /function drawMoveHint\(|drawMoveHint\(/,
  "the old cyan center arrow must not obscure a road opening");
assert.doesNotMatch(html, /move: '#B8E9FF'|move: '#B9D9FF'/,
  "move affordances must not reuse the former water-blue family");
assert.match(html, /move: '#FFD45C'/,
  "the forest move affordance is warm gold and distinct from route connectivity");
assert.match(html, /const isStrongCue = isSuggested \|\| isMoving/);
assert.match(html, /ctx\.shadowColor = isStrongCue \? th\.moveGlow/,
  "the selected panel keeps a full lift shadow during the actual move");

assert.match(html, /function getHintPreviewAmount\(now, index\)[\s\S]*?\* 0\.12/,
  "the suggested panel itself previews a visible trip toward the hollow");
assert.match(html, /function drawMovableEdgeCue\(visual\)[\s\S]*?visual\.movable[\s\S]*?Math\.abs\(dx\) \+ Math\.abs\(dy\) !== 1/,
  "legal neighbors use small hole-facing edge handles instead of extra full boxes");
assert.match(html, /drawEmptySlot\(now, suggestedMoveIdx, \{ preview: true \}\)/,
  "preview motion reveals the source hollow behind that exact panel");
assert.match(html, /drawEmptySlot\(now, anim\.idx, \{ source: true \}\)/,
  "actual motion reveals the source hollow while the panel is still moving");
assert.match(html, /const destinationIdx = animating && anim\.targetIdx >= 0 \? anim\.targetIdx : emptyIdx/,
  "the destination hollow is tied to the accepted move, not a mutable later board state");

assert.match(html, /const legalMovableSet = new Set[\s\S]*?grid\[index\] !== null && !isCheckpointLockedCell\(index\)/,
  "all legal neighbors are indicated while a checkpoint-locked trail stays inert");
assert.match(html, /movable: movable,[\s\S]*?suggested: suggested,[\s\S]*?animating:/,
  "legal, suggested, and moving visuals remain separate states");
assert.match(html, /connected: !\(animating && i === anim\.idx\) && connectedSet\.has\(i\)/,
  "a moving panel cannot retain the old green connected-route glow");

assert.match(html, /let anim = \{[\s\S]*?idx: -1, targetIdx: -1/,
  "the accepted source and destination indices are retained transactionally");
assert.match(html, /anim\.targetIdx !== emptyIdx[\s\S]*?grid\[anim\.targetIdx\] !== null[\s\S]*?grid\[anim\.idx\] === null/,
  "a board replacement safely cancels an obsolete move");
assert.match(html, /const oldEmpty = anim\.targetIdx;/,
  "the accepted destination is the commit destination");
assert.match(html, /function syncSlideAnimationSuspension\(now\)[\s\S]*?isJourneyEnvironmentSuspended\(\)[\s\S]*?anim\.t0 \+=/,
  "a hidden, blurred, menu-covered, or portrait board pauses the longer glide");
assert.match(html, /visibilitychange[\s\S]*?syncSlideAnimationSuspension\(performance\.now\(\)\)/,
  "visibility changes capture suspension before requestAnimationFrame pauses");
assert.match(html, /moveFeedback\.fromIdx = anim\.idx;[\s\S]*?moveFeedback\.toIdx = oldEmpty;/,
  "landing feedback identifies both the newly empty source and the filled destination");
assert.match(html, /function drawMoveFeedback\(now\)[\s\S]*?MOVE_FEEDBACK_DUR/,
  "the new hollow and landed panel receive one short confirmation beat");
assert.match(html, /resetMoveFeedback\(\);\s*animating = true;/,
  "a new move clears the previous landing beat before it can overlap");

assert.match(html, /function waitForCurrentSlide\(callback\)[\s\S]*?if \(animating\)[\s\S]*?requestAnimationFrame\(check\)/,
  "tutorial sequencing waits for the board commit instead of a stale millisecond constant");
assert.match(html, /waitForCurrentSlide\(function\(\) \{[\s\S]*?tutStepIdx\+\+/,
  "tutorial praise follows the visible landing");
assert.doesNotMatch(html, /\/\/ アニメーション完了後[\s\S]{0,80}setTimeout\(function/,
  "no fixed tutorial timeout may race the longer slide");

assert.match(html, /function readInitialStageIndex\(\)[\s\S]*?window\.__APP_BUILD__[\s\S]*?new URLSearchParams\(location\.search\)\.get\('stage'\)/,
  "App staging can open a requested stage for direct prototype review");
assert.match(html, /function startGame\(\)[\s\S]*?beginStage\(INITIAL_STAGE_IDX\)/,
  "the direct-review stage survives the start button");
assert.match(html, /!localStorage\.getItem\('slide_tut_seen'\) && INITIAL_STAGE_IDX === 0/,
  "a direct stage review is not intercepted by first-run practice");

new vm.Script(mainInlineScript(html), { filename: "slide-motion-clarity-inline.js" });

console.log("slide motion clarity regression: PASS");
