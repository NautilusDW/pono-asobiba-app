#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "slide/index.html"), "utf8");

const verticalMatch = html.match(
  /const VERTICAL_LEVELS = (\[[\s\S]*?\n\]);\n\n\/\/ 行列の転置/
);
const transformMatch = html.match(
  /const TRANSPOSE_TILE = \{[\s\S]*?\n\};\n\nfunction transposeVerticalLevelToLeftRight\(level\) \{[\s\S]*?\n\}\n\nconst LEVELS = VERTICAL_LEVELS\.map\(transposeVerticalLevelToLeftRight\);/
);
assert.ok(verticalMatch && transformMatch, "slide level data and horizontal transform remain inspectable");

const sandbox = Object.create(null);
vm.runInNewContext(
  `const VERTICAL_LEVELS=${verticalMatch[1]};\n${transformMatch[0]}\n` +
  "globalThis.levels=LEVELS;",
  sandbox,
  { filename: "slide-route-mechanics-levels.js" },
);
const levels = JSON.parse(JSON.stringify(sandbox.levels));

const edges = {
  H: [0, 1, 0, 1], V: [1, 0, 1, 0],
  TR: [1, 1, 0, 0], RB: [0, 1, 1, 0],
  BL: [0, 0, 1, 1], LT: [1, 0, 0, 1],
  CROSS: [1, 1, 1, 1], BLANK: [0, 0, 0, 0],
};
const dr = [-1, 0, 1, 0];
const dc = [0, 1, 0, -1];
const opposite = edge => (edge + 2) % 4;

function findRoute(level, board, options = {}) {
  const pickupIdx = options.pickupIdx ?? -1;
  const requirePickup = Boolean(options.requirePickup);
  const magicIdx = options.magicIdx ?? -1;
  const requireMagic = Boolean(options.requireMagic);
  if (requireMagic && magicIdx < 0) return null;

  const queue = [{ row: level.start.row, col: 0, fromEdge: 3, picked: false, trail: [] }];
  const visited = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (current.row < 0 || current.row >= level.rows || current.col < 0 || current.col >= level.cols) continue;
    const index = current.row * level.cols + current.col;
    const base = board[index];
    if (!base || base === "BLANK") continue;
    const tile = index === magicIdx ? "CROSS" : base;
    if (!edges[tile][current.fromEdge]) continue;
    const picked = current.picked || index === pickupIdx;
    const visit = `${current.row},${current.col},${current.fromEdge},${picked ? 1 : 0}`;
    if (visited.has(visit)) continue;
    visited.add(visit);
    const trail = current.trail.concat(index);
    for (let edge = 0; edge < 4; edge++) {
      if (edge === current.fromEdge || !edges[tile][edge]) continue;
      if (current.row === level.goal.row && current.col === level.cols - 1 && edge === 1 &&
          (!requirePickup || picked)) return trail;
      queue.push({
        row: current.row + dr[edge], col: current.col + dc[edge],
        fromEdge: opposite(edge), picked, trail,
      });
    }
  }
  return null;
}

assert.equal(levels[0].pickup, null, "stage1 has no extra route rule");
assert.equal(levels[0].magicCross, null, "stage1 has no magic control");
assert.equal(levels[1].pickup, null, "stage2 keeps the original basic rule");
assert.equal(levels[1].magicCross, null, "stage2 keeps the original basic rule");

const pickupLevel = levels[2];
const pickupIdx = pickupLevel.pickup.row * pickupLevel.cols + pickupLevel.pickup.col;
assert.equal(pickupLevel.solved[pickupIdx], "CROSS", "stage3 pickup is attached to a real road tile");
const pickupRoute = findRoute(pickupLevel, pickupLevel.solved, {
  pickupIdx, requirePickup: true,
});
assert.ok(pickupRoute, "stage3 solved route reaches the goal after collecting the charm");
assert.ok(pickupRoute.includes(pickupIdx), "stage3 teaching route visibly passes through the charm");

const bypassBoard = [...pickupLevel.solved];
bypassBoard[8] = "H";
assert.ok(findRoute(pickupLevel, bypassBoard), "a bare goal route can exist");
assert.equal(findRoute(pickupLevel, bypassBoard, { pickupIdx: 8, requirePickup: true }), null,
  "a route that skips the required charm must not clear");

const magicLevel = levels[3];
const targetIdx = magicLevel.magicCross.target.row * magicLevel.cols + magicLevel.magicCross.target.col;
const rawBefore = [...magicLevel.solved];
assert.equal(magicLevel.solved[targetIdx], "V", "stage4 target starts as a vertical-only road");
assert.equal(findRoute(magicLevel, magicLevel.solved), null,
  "stage4 raw solution cannot reach the right-side goal");
assert.ok(findRoute(magicLevel, magicLevel.solved, { magicIdx: targetIdx, requireMagic: true }),
  "the intended tile reaches the goal when granted four-way edges");
const wrongIdx = magicLevel.goal.row * magicLevel.cols;
assert.equal(findRoute(magicLevel, magicLevel.solved, { magicIdx: wrongIdx, requireMagic: true }), null,
  "placing the charm on the wrong straight tile does not fake a clear");
assert.deepEqual(magicLevel.solved, rawBefore,
  "testing and reassigning magic never mutates the underlying tile multiset");

assert.deepEqual(pickupLevel.pickup, pickupLevel.checkpoint.cell,
  "stage3 charm is now a fixed place in the forest rather than panel cargo");
assert.match(html,
  /!LEVELS\[stageIdx\]\.checkpoint && pickupTileIdx === fromIdx/,
  "checkpoint pickup stays in the world while ordinary tracked panels remain supported");
assert.match(html, /moveTrackedTile\(fromIdx, oldEmpty\)/,
  "shuffle moves applied magic with its panel through the shared slide helper");
assert.match(html, /moveTrackedTile\(anim\.idx, oldEmpty\)/,
  "player slides move pickup and applied magic with their panel");
assert.match(html, /function getEffectiveTileKeyAt[\s\S]*?return 'CROSS'/,
  "magic supplies effective CROSS edges without rewriting grid data");
assert.match(html, /if \(magicCrossSelectMode\)[\s\S]*?magicCrossTileIdx = tappedIdx[\s\S]*?handleRouteCompletion\(performance\.now\(\)\)/,
  "assigning or reassigning the charm can itself complete the stage exactly once");
assert.match(html, /function finishCheckpointArrival[\s\S]*?pickupCollected = true[\s\S]*?magicCharmOwned = true/,
  "the route actor collects the item only after physically reaching the checkpoint");
assert.match(html, /stageIdx = 0;[\s\S]*?resetStageMechanics\(LEVELS\[0\]\)/,
  "the shared tutorial clears all later-stage mechanic state");
assert.match(html, /ひかりを とおって ゴールへ！/);
assert.match(html, /ひかりの よつぼしを つかってみよう！/);
assert.match(html, /みちを ひとつ えらんでね/);

console.log("slide_route_mechanics_regression: all assertions passed");
