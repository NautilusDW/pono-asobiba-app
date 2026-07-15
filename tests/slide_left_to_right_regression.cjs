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
assert.ok(verticalMatch, "legacy vertical level data must remain available for the horizontal transform");

const transformMatch = html.match(
  /const TRANSPOSE_TILE = \{[\s\S]*?\n\};\n\nfunction transposeVerticalLevelToLeftRight\(level\) \{[\s\S]*?\n\}\n\nconst LEVELS = VERTICAL_LEVELS\.map\(transposeVerticalLevelToLeftRight\);/
);
assert.ok(transformMatch, "the runtime left-to-right level transform must exist");

const sandbox = {};
vm.runInNewContext(
  `const VERTICAL_LEVELS = ${verticalMatch[1]};\n${transformMatch[0]}\n` +
  "globalThis.__vertical = VERTICAL_LEVELS;" +
  "globalThis.__levels = LEVELS;" +
  "globalThis.__tileMap = TRANSPOSE_TILE;",
  sandbox,
  { filename: "slide-level-rotation.js" }
);

const verticalLevels = JSON.parse(JSON.stringify(sandbox.__vertical));
const levels = JSON.parse(JSON.stringify(sandbox.__levels));
const tileMap = JSON.parse(JSON.stringify(sandbox.__tileMap));

assert.equal(levels.length, 8, "all eight stages must survive the direction change");
assert.deepEqual(tileMap, {
  H: "V", V: "H", TR: "BL", RB: "RB", BL: "TR", LT: "LT",
  CROSS: "CROSS", BLANK: "BLANK",
});

const tileEdges = {
  H: [0, 1, 0, 1], V: [1, 0, 1, 0],
  TR: [1, 1, 0, 0], RB: [0, 1, 1, 0],
  BL: [0, 0, 1, 1], LT: [1, 0, 0, 1],
  CROSS: [1, 1, 1, 1], BLANK: [0, 0, 0, 0],
};
const dr = [-1, 0, 1, 0];
const dc = [0, 1, 0, -1];
const opposite = edge => (edge + 2) % 4;

function findLeftToRightPath(level, board) {
  const queue = [{ row: level.start.row, col: 0, fromEdge: 3, trail: [] }];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();
    const key = `${current.row},${current.col},${current.fromEdge}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (current.row < 0 || current.row >= level.rows || current.col < 0 || current.col >= level.cols) continue;

    const tile = board[current.row * level.cols + current.col];
    if (!tile || tile === "BLANK" || !tileEdges[tile][current.fromEdge]) continue;
    const trail = current.trail.concat({ row: current.row, col: current.col });

    for (let edge = 0; edge < 4; edge++) {
      if (edge === current.fromEdge || !tileEdges[tile][edge]) continue;
      if (current.row === level.goal.row && current.col === level.cols - 1 && edge === 1) {
        return [
          { row: level.start.row, col: -1 },
          ...trail,
          { row: level.goal.row, col: level.cols },
        ];
      }
      queue.push({
        row: current.row + dr[edge],
        col: current.col + dc[edge],
        fromEdge: opposite(edge),
        trail,
      });
    }
  }
  return null;
}

const expectedDimensions = [[3, 3], [3, 3], [3, 3], [4, 3], [4, 3], [4, 4], [4, 4], [5, 4]];
levels.forEach((level, index) => {
  const vertical = verticalLevels[index];
  assert.deepEqual([level.cols, level.rows], expectedDimensions[index], `stage ${index + 1}: rotated dimensions`);
  assert.equal(level.cols, vertical.rows, `stage ${index + 1}: old rows become columns`);
  assert.equal(level.rows, vertical.cols, `stage ${index + 1}: old columns become rows`);
  assert.equal(level.solved.length, level.cols * level.rows, `stage ${index + 1}: board dimensions match data`);
  assert.deepEqual(level.start, { row: vertical.start.col, side: "left" });
  assert.deepEqual(level.goal, { row: vertical.goal.col, side: "right" });
  assert.ok(level.start.row >= 0 && level.start.row < level.rows, `stage ${index + 1}: start row is in bounds`);
  assert.ok(level.goal.row >= 0 && level.goal.row < level.rows, `stage ${index + 1}: goal row is in bounds`);
  assert.equal(level.solved.filter(tile => tile === null).length, 1, `stage ${index + 1}: one empty cell`);

  for (let row = 0; row < vertical.rows; row++) {
    for (let col = 0; col < vertical.cols; col++) {
      const oldTile = vertical.solved[row * vertical.cols + col];
      const nextRow = col;
      const nextCol = row;
      const expectedTile = oldTile === null ? null : tileMap[oldTile];
      assert.equal(level.solved[nextRow * level.cols + nextCol], expectedTile,
        `stage ${index + 1}: cell ${row},${col} transposes into the horizontal board`);
    }
  }

  const pathToGoal = findLeftToRightPath(level, level.solved);
  assert.ok(pathToGoal, `stage ${index + 1}: solved board must connect left to right`);
  assert.deepEqual(pathToGoal[0], { row: level.start.row, col: -1 }, `stage ${index + 1}: path starts left of grid`);
  assert.deepEqual(pathToGoal.at(-1), { row: level.goal.row, col: level.cols }, `stage ${index + 1}: path exits right of grid`);
  for (let point = 1; point < pathToGoal.length; point++) {
    assert.ok(pathToGoal[point].row >= pathToGoal[point - 1].row,
      `stage ${index + 1}: vertical turns never make the front-facing Pono walk backward`);
  }
});

function seededRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function shuffledLikeGame(level, seed) {
  const random = seededRandom(seed);
  for (let attempt = 0; attempt < 100; attempt++) {
    const board = [...level.solved];
    let empty = board.indexOf(null);
    let lastMoved = -1;
    const history = [];

    for (let move = 0; move < level.shuffleMoves; move++) {
      const row = Math.floor(empty / level.cols);
      const col = empty % level.cols;
      const neighbors = [];
      if (row > 0) neighbors.push(empty - level.cols);
      if (row < level.rows - 1) neighbors.push(empty + level.cols);
      if (col > 0) neighbors.push(empty - 1);
      if (col < level.cols - 1) neighbors.push(empty + 1);
      const candidates = neighbors.filter(index => index !== lastMoved);
      const picked = candidates[Math.floor(random() * candidates.length)];
      history.push({ emptyBefore: empty, picked });
      lastMoved = empty;
      board[empty] = board[picked];
      board[picked] = null;
      empty = picked;
    }

    if (!findLeftToRightPath(level, board)) return { board, history };
  }
  throw new Error(`stage ${level.name}: could not produce an unsolved seeded shuffle`);
}

const tileMultiset = board => board.map(tile => String(tile)).sort();
levels.forEach((level, levelIndex) => {
  for (let sample = 0; sample < 25; sample++) {
    const shuffled = shuffledLikeGame(level, (levelIndex + 1) * 1000 + sample);
    assert.equal(shuffled.board.filter(tile => tile === null).length, 1,
      `stage ${levelIndex + 1} shuffle ${sample}: one empty cell`);
    assert.deepEqual(tileMultiset(shuffled.board), tileMultiset(level.solved),
      `stage ${levelIndex + 1} shuffle ${sample}: tile multiset is preserved`);
    assert.equal(findLeftToRightPath(level, shuffled.board), null,
      `stage ${levelIndex + 1} shuffle ${sample}: board does not begin cleared`);

    const recovered = [...shuffled.board];
    for (let move = shuffled.history.length - 1; move >= 0; move--) {
      const { emptyBefore, picked } = shuffled.history[move];
      recovered[picked] = recovered[emptyBefore];
      recovered[emptyBefore] = null;
    }
    assert.deepEqual(recovered, level.solved,
      `stage ${levelIndex + 1} shuffle ${sample}: reversing legal moves recovers the solution`);
  }
});
assert.match(html, /if \(checkWin\(\)\) \{\s*shuffleGrid\(level\);\s*return;\s*\}/,
  "the runtime shuffle must retry rather than start on a connected path");
assert.match(html, /suggestedMoveIdx = lastMoved;[\s\S]*?hintDismissed = false;/,
  "the reversible shuffle must retain exactly one safe first-move suggestion");

const tutorialMatch = html.match(
  /const TUTORIAL_GRID = (\[[\s\S]*?\]);\nconst TUTORIAL_EMPTY = (\d+);\nconst TUTORIAL_STEPS = (\[[\s\S]*?\]);/
);
assert.ok(tutorialMatch, "the left-to-right tutorial constants must exist");
const tutorial = vm.runInNewContext(
  `({ grid: ${tutorialMatch[1]}, empty: ${tutorialMatch[2]}, steps: ${tutorialMatch[3]} })`
);
const tutorialGrid = JSON.parse(JSON.stringify(tutorial.grid));
const tutorialSteps = JSON.parse(JSON.stringify(tutorial.steps));
let tutorialEmpty = tutorial.empty;
assert.equal(tutorialEmpty, 3);
assert.equal(tutorialSteps.length, 3);

for (const step of tutorialSteps) {
  const target = step.row * 3 + step.col;
  const emptyRow = Math.floor(tutorialEmpty / 3);
  const emptyCol = tutorialEmpty % 3;
  assert.equal(Math.abs(emptyRow - step.row) + Math.abs(emptyCol - step.col), 1,
    `tutorial tap ${step.row},${step.col} must border the empty cell`);
  tutorialGrid[tutorialEmpty] = tutorialGrid[target];
  tutorialGrid[target] = null;
  tutorialEmpty = target;
}
assert.deepEqual(tutorialGrid, levels[0].solved, "three tutorial taps must produce the stage-one horizontal solution");
assert.ok(findLeftToRightPath(levels[0], tutorialGrid), "tutorial result must connect left to right");

const markerDraw = html.match(/function drawStartGoal\(now, connectedSet\) \{[\s\S]*?\n\}\n\nfunction drawJourneyActor\(now\)/);
assert.ok(markerDraw, "start/goal marker drawing must exist");
const journeyGeometry = html.match(/function getJourneyGeometry\(\) \{[\s\S]*?\n\}/);
assert.ok(journeyGeometry, "the continuous journey must own left-entry and right-exit geometry");
const goalBeaconGeometry = html.match(/function getGoalBeaconBounds\(geo\) \{[\s\S]*?\n\}/);
assert.ok(goalBeaconGeometry, "the right-side goal must own inspectable marker bounds");
assert.match(markerDraw[0], /level\.start\.row/);
assert.match(markerDraw[0], /level\.goal\.row/);
assert.match(journeyGeometry[0], /const leftEdge = gridOX/);
assert.match(goalBeaconGeometry[0], /geo\.goalX/);
assert.match(goalBeaconGeometry[0], /centerY: geo\.goalY/,
  "the permanent finish flag must identify the exact configured goal row");
assert.match(journeyGeometry[0], /const rightEdge = gridOX \+ curCols \* cellSize/);
assert.match(journeyGeometry[0], /entryX: leftEdge - cellSize \* 1\.25/);
assert.match(journeyGeometry[0], /departX: rightEdge \+ cellSize \* 1\.35/);
assert.match(markerDraw[0], /const ponoH = Math\.max\(52, Math\.min\(132, cellSize \* 0\.88\)\)/,
  "the left marker must use a readable full-body Pono on the shortest landscape screen");
assert.match(markerDraw[0], /imgPonoWorld\.naturalWidth \/ imgPonoWorld\.naturalHeight/,
  "the full-body Pono marker must preserve its source aspect ratio");
assert.match(markerDraw[0], /const momH = Math\.max\(66, Math\.min\(160, cellSize \* 1\.15\)\)/,
  "the reunion marker must remain readable on the final stage");
assert.match(markerDraw[0], /momH \* imgMomFull\.naturalWidth \/ imgMomFull\.naturalHeight/,
  "the mother marker must preserve its source aspect ratio");
assert.match(markerDraw[0], /drawWorldLabel\('ポノ'/);
assert.match(markerDraw[0], /drawWorldLabel\('おかあさん'/);
assert.doesNotMatch(markerDraw[0], /level\.start\.col|level\.goal\.col|bottomEdge/,
  "marker drawing must not fall back to the old top/bottom coordinates");

assert.match(html, /ひだりから みぎへ みちを つなごう/);
assert.match(html, /🌳 ひだりから みぎへ<br>みちを つなげよう！/);
assert.match(html, /if \(level\.start\.side === 'left'\)[\s\S]*?startEdge = 3/);
assert.match(html, /if \(level\.goal\.side === 'right'\)[\s\S]*?goalExitEdge = 1/);
assert.match(html, /const horizontal = Math\.abs\(journeyActor\.dx \|\| 1\) >= Math\.abs\(journeyActor\.dy \|\| 0\)/,
  "left-to-right travel must select the side sprite on horizontal segments");
assert.match(html, /initMenu\(\{ bgmToggle: function\(\) \{/,
  "the visible shared settings menu must retain the BGM toggle after the compact HUD hides its legacy header");
assert.doesNotMatch(html, /もう一回/, "child-facing retry copy must use kana only");

console.log("slide_left_to_right_regression: all assertions passed");
