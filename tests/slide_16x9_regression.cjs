#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "slide/index.html"), "utf8");

function pngSize(relativePath) {
  const file = fs.readFileSync(path.join(root, relativePath));
  assert.equal(file.subarray(1, 4).toString("ascii"), "PNG", `${relativePath}: PNG signature`);
  return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
}

function mainInlineScript(source) {
  const start = source.lastIndexOf("<script>");
  const end = source.indexOf("</script>", start);
  assert.ok(start >= 0 && end > start, "slide main inline script must exist");
  return source.slice(start + "<script>".length, end);
}

/* The playable surface is a centered 16:9 shell, including coarse-pointer devices. */
assert.match(html, /--slide-shell-width:\s*min\(100vw, calc\(100dvh \* 16 \/ 9\)\)/);
assert.match(html, /--slide-shell-height:\s*min\(100dvh, calc\(100vw \* 9 \/ 16\)\)/);
assert.match(html, /body > #app\s*\{[\s\S]*?height:\s*var\(--slide-shell-height\) !important/,
  "shared coarse-pointer CSS must not stretch the game back to portrait/full height");
assert.match(html, /class="game-rail"/);
assert.match(html, /@media \(orientation: landscape\) and \(max-height: 480px\),\s*\(orientation: landscape\) and \(max-width: 853px\)/,
  "compact overlays must follow the 16:9 shell height even when the viewport itself is taller");
assert.match(html, /\.ov-btn\s*\{[\s\S]*?min-height:\s*48px/,
  "the short-landscape primary button must retain a touch-sized target");
assert.match(html, /\.tut-next-btn\s*\{[^}]*min-height:\s*48px/,
  "tutorial actions must retain a child-sized touch target");

/* Portrait is a fallback gate; gameplay itself remains landscape. */
assert.match(html, /<strong>よこむき<\/strong>にしてね！/);
assert.match(html, /class="landscape-back"[^>]*>ホームにもどる<\/a>/);
assert.match(html, /const isPortrait = window\.innerHeight >= window\.innerWidth/);
assert.match(html, /notice\.style\.display = isPortrait \? 'flex' : 'none'/);
assert.match(html, /new ResizeObserver\(function\(\) \{ resize\(\); \}\)/,
  "the canvas must follow the centered shell after viewport changes");

/* The hardest 4x5 stage keeps a child-sized tile on the shortest supported screen. */
function landscapeCell(viewportWidth, viewportHeight, cols, rows) {
  const shellWidth = Math.min(viewportWidth, viewportHeight * 16 / 9);
  const shellHeight = Math.min(viewportHeight, viewportWidth * 9 / 16);
  const safe = Math.max(8, Math.min(20, shellHeight * 0.025));
  return Math.floor(Math.min(
    (shellWidth - safe * 2) / cols,
    (shellHeight - safe * 2) / (rows + 1.3),
    shellHeight * 0.22,
  ));
}
assert.ok(landscapeCell(844, 390, 4, 5) >= 58, "844x390 stage 8 tiles must remain at least 58px");
assert.ok(landscapeCell(1024, 768, 4, 5) >= 86, "iPad landscape stage 8 tiles must remain at least 86px");
assert.match(html, /const maxByHeight = \(CH - safe \* 2\) \/ \(curRows \+ 1\.3\)/,
  "the implementation must reserve vertical breathing room around the stage grid");
assert.match(html, /const maxByTouch = CH \* 0\.22/,
  "the implementation must preserve the tested short-landscape tile cap");

/* Sprite crops follow the optimized files instead of the deleted 128px-high originals. */
const front = pngSize("assets/images/characters/pono/pono_walk_sheet.png");
const side = pngSize("assets/images/characters/pono/pono_walk_side_sheet.png");
assert.deepEqual(front, { width: 1200, height: 67 });
assert.deepEqual(side, { width: 1200, height: 57 });
const frontFrameCount = Number(html.match(/const WALK_FRAMES = (\d+);/)?.[1]);
const sideFrameCount = Number(html.match(/const SIDE_WALK_FRAMES = (\d+);/)?.[1]);
assert.equal(frontFrameCount, 25);
assert.equal(sideFrameCount, 35);
assert.equal(front.width / frontFrameCount, 48);
assert.ok(Math.abs(side.width / sideFrameCount - 34.285714285714285) < 1e-9);
for (const [sheet, frameCount] of [[front, frontFrameCount], [side, sideFrameCount]]) {
  const sourceWidth = sheet.width / frameCount;
  for (let frame = 0; frame < frameCount; frame++) {
    const sourceX = frame * sourceWidth;
    assert.ok(sourceX >= 0 && sourceX + sourceWidth <= sheet.width,
      `sprite frame ${frame} must stay inside its optimized sheet`);
  }
}
assert.doesNotMatch(html, /WALK_FRAME_W|WALK_FRAME_H|SIDE_WALK_FRAME_W|SIDE_WALK_FRAME_H/,
  "old pre-optimization source rectangles must not return");
assert.match(html, /imgWalkSheet\.naturalWidth \/ WALK_FRAMES/);
assert.match(html, /imgWalkSideSheet\.naturalWidth \/ SIDE_WALK_FRAMES/);
assert.match(html, /const sourceH = imgWalkSheet\.naturalHeight/);
assert.match(html, /const sourceH = imgWalkSideSheet\.naturalHeight/);
assert.equal((html.match(/ctx\.drawImage\(imgWalkSheet,/g) || []).length, 1,
  "front walking renders once per animation frame");
assert.equal((html.match(/ctx\.drawImage\(imgWalkSideSheet,/g) || []).length, 2,
  "side walking has one mutually-exclusive draw for each facing direction");
assert.match(html, /if \(!winAnim\.active && state === S\.PLAYING\)/,
  "the stationary face must stay hidden while the walking sprite is active");

/* Initial and tutorial-only frames stay error-free and avoid stacked completion UI. */
assert.match(html, /const tileKey = grid\[i\];\s*if \(!tileKey\) continue/,
  "the idle overlay must not try to draw undefined tiles");
assert.match(html, /winAnim\.active = false;[\s\S]*?if \(_slideTutActive\) return;/,
  "tutorial completion must not open a normal stage-clear overlay behind its own prompt");
assert.match(html, /grid\s*=\s*tutGrid\.slice\(\);[\s\S]*?emptyIdx\s*=\s*tutEmpty;[\s\S]*?state\s*=\s*S\.PLAYING;/,
  "opening the tutorial from the shared menu must reset to its fixed three-move board");
assert.match(html, /const t = Math\.max\(0, Math\.min\(elapsed \/ dur, 1\)\)/,
  "the first clear frame must not index the walking path with a negative timestamp");
assert.equal((html.match(/Math\.floor\(spriteElapsed \/ \(1000 \/ WALK_FPS\)\)/g) || []).length, 2,
  "front and side sprite sheets must both start on frame zero when rAF time is slightly behind performance.now");
assert.match(html, /function updatePauseButton\(isPaused\)[\s\S]*?isPaused \? '▶' : '⏸'[\s\S]*?isPaused \? 'さいかい' : 'ポーズ'/,
  "the pause control must expose the action matching its current state");
assert.match(html, /prepauseState = S\.PLAYING;[\s\S]*?updatePauseButton\(false\);/,
  "opening the tutorial from a paused game must restore the active pause-button state");

new vm.Script(mainInlineScript(html), { filename: "slide/index.inline.js" });

console.log("slide_16x9_regression: all assertions passed");
