#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "slide/index.html"), "utf8");

function extractNamedFunction(source, name) {
  const signature = new RegExp(`function\\s+${name}\\s*\\(`, "g");
  const match = signature.exec(source);
  assert.ok(match, `function ${name} must exist`);
  const open = source.indexOf("{", match.index);
  assert.ok(open >= 0, `function ${name} must have a body`);

  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < source.length; index++) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index++;
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
      index++;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index++;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (depth === 0) return source.slice(match.index, index + 1);
    }
  }
  throw new Error(`function ${name} body is not balanced`);
}

const verticalMatch = html.match(
  /const VERTICAL_LEVELS = (\[[\s\S]*?\n\]);\n\n\/\/ 行列の転置/
);
const transformStart = html.indexOf("const TRANSPOSE_TILE = {");
const transformEndToken = "const LEVELS = VERTICAL_LEVELS.map(transposeVerticalLevelToLeftRight);";
const transformEnd = html.indexOf(transformEndToken, transformStart);
assert.ok(verticalMatch && transformStart >= 0 && transformEnd >= 0,
  "level data and horizontal transform remain inspectable");

const sandbox = Object.create(null);
const transformSource = html.slice(transformStart, transformEnd + transformEndToken.length);
vm.runInNewContext(
  `const VERTICAL_LEVELS=${verticalMatch[1]};\n${transformSource}\n` +
    "globalThis.levels=LEVELS;",
  sandbox,
  { filename: "slide-checkpoint-levels.js" },
);
const levels = JSON.parse(JSON.stringify(sandbox.levels));

assert.equal(levels.length, 8, "the checkpoint prototype keeps all eight stages");
assert.deepEqual(
  levels.map((level, index) => level.checkpoint ? index : -1).filter(index => index >= 0),
  [2],
  "only stage three introduces the two-part checkpoint rule",
);

const stage3 = levels[2];
assert.deepEqual(stage3.checkpoint, {
  cell: { row: 0, col: 1 },
  entryEdge: 3,
  exitEdge: 2,
  secondShuffle: [{ row: 1, col: 1 }, { row: 1, col: 2 }],
  lockedCells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
}, "stage three metadata transposes the fixed checkpoint and both route legs left-to-right");
assert.deepEqual(stage3.pickup, stage3.checkpoint.cell,
  "the four-way charm and checkpoint share one fixed world location");

function applyMove(boardState, fromIndex) {
  const next = boardState.board.slice();
  next[boardState.empty] = next[fromIndex];
  next[fromIndex] = null;
  return { board: next, empty: fromIndex };
}

let secondLeg = { board: stage3.solved.slice(), empty: stage3.solved.indexOf(null) };
for (const cell of stage3.checkpoint.secondShuffle) {
  const index = cell.row * stage3.cols + cell.col;
  assert.ok(Math.abs(Math.floor(secondLeg.empty / stage3.cols) - cell.row) +
    Math.abs(secondLeg.empty % stage3.cols - cell.col) === 1,
  "every second-leg shuffle step is a legal slide");
  secondLeg = applyMove(secondLeg, index);
}
assert.deepEqual(secondLeg, {
  board: ["H", "CROSS", "BLANK", "BLANK", "H", null, "BLANK", "CROSS", "BLANK"],
  empty: 5,
}, "the midpoint always presents the same understandable two-move second leg");
secondLeg = applyMove(secondLeg, 4);
secondLeg = applyMove(secondLeg, 7);
assert.deepEqual(secondLeg.board, stage3.solved,
  "reversing the two guaranteed slides restores the solved checkpoint-to-goal route");

const routeDispatch = extractNamedFunction(html, "handleRouteCompletion");
assert.match(routeDispatch,
  /state !== S\.PLAYING \|\| journeyActor\.active/,
  "route dispatch is idempotent once an actor has started travelling");
const checkpointBranch = routeDispatch.indexOf("level.checkpoint && !stageCheckpointReached");
const finalBranch = routeDispatch.indexOf("if (checkWin())");
assert.ok(checkpointBranch >= 0 && finalBranch > checkpointBranch,
  "route completion gives the unreached checkpoint priority over final clear");
assert.match(routeDispatch,
  /findCheckpointRoute\(\)[\s\S]*?onCheckpointReached\(checkpointRoute, now\)[\s\S]*?return true/,
  "a connected first leg starts its own journey and consumes that completion once");
assert.match(routeDispatch, /if \(checkWin\(\)\)[\s\S]*?onStageClear\(\)/,
  "the ordinary stage clear remains available only after checkpoint dispatch");
const stageClear = extractNamedFunction(html, "onStageClear");
assert.match(stageClear, /state !== S\.PLAYING \|\| journeyActor\.active/,
  "the final clear itself rejects duplicate re-entry");
assert.match(routeDispatch, /hasBareGoalRoute\(\)[\s\S]*?まずは おかあさんの しるしまで/,
  "a route that bypasses the checkpoint receives a concrete board-safe reminder");

const goalRoute = extractNamedFunction(html, "findGoalRoute");
assert.match(goalRoute,
  /checkpointStart && fromEdge < 0 && e !== level\.checkpoint\.exitEdge/,
  "the second leg can leave its checkpoint only through the authored exit edge");
const drawStartGoal = extractNamedFunction(html, "drawStartGoal");
assert.match(drawStartGoal,
  /\(!level\.checkpoint \|\| stageCheckpointReached\) && Boolean\(findGoalRoute\(\)\)/,
  "the final beacon cannot glow before the checkpoint story beat");

assert.match(html,
  /CHECKPOINT:\s*'CHECKPOINT'[\s\S]*?CHECKPOINT_DISCOVERY:\s*'CHECKPOINT_DISCOVERY'/,
  "the actor owns distinct walk and discovery phases at the midpoint");
const checkpointStart = extractNamedFunction(html, "onCheckpointReached");
assert.match(checkpointStart, /stopStageClock\(checkpointNow\)/,
  "midpoint walking pauses the active-play clock");
assert.match(checkpointStart, /state = S\.TRAVELLING/,
  "midpoint walking leaves the puzzle input state");
assert.match(checkpointStart,
  /setJourneyPath\(JOURNEY_PHASE\.CHECKPOINT, points/,
  "the persistent actor walks the connected first-leg trail");

const checkpointArrival = extractNamedFunction(html, "finishCheckpointArrival");
assert.match(checkpointArrival,
  /pickupCollected = true[\s\S]*?magicCharmOwned = true/,
  "arrival collects the charm exactly at its world checkpoint");
assert.match(checkpointArrival,
  /journeyActor\.phase = JOURNEY_PHASE\.CHECKPOINT_DISCOVERY/,
  "arrival has a short discovery beat before rebuilding the board");

const updateJourney = extractNamedFunction(html, "updateJourney");
assert.match(updateJourney,
  /JOURNEY_PHASE\.CHECKPOINT[\s\S]*?reducedMotionQuery\.matches[\s\S]*?finishCheckpointArrival\(now\)/,
  "reduced motion completes the checkpoint walk without leaving a stuck actor");
assert.match(updateJourney,
  /JOURNEY_PHASE\.CHECKPOINT_DISCOVERY[\s\S]*?finishCheckpointDiscovery\(now\)/,
  "the discovery beat hands control to the second leg");

const moveTrackedTile = extractNamedFunction(html, "moveTrackedTile");
assert.match(moveTrackedTile,
  /!LEVELS\[stageIdx\]\.checkpoint\s*&&\s*pickupTileIdx === fromIdx/,
  "the checkpoint stays fixed in the world while ordinary pickup panels can move");
const handleTap = extractNamedFunction(html, "handleTap");
assert.match(handleTap,
  /isCheckpointLockedCell\(tappedIdx\)[\s\S]*?return false/,
  "settled first-leg cells cannot be moved after Pono has walked over them");

const setupSecondLeg = extractNamedFunction(html, "setupCheckpointSecondLeg");
assert.match(setupSecondLeg,
  /grid = level\.solved\.slice\(\)[\s\S]*?checkpoint\.secondShuffle\.forEach/,
  "the second leg is derived reversibly from the canonical solved board");
assert.match(setupSecondLeg,
  /stageCheckpointReached = true[\s\S]*?new Set\(getCheckpointLockedIndices\(level\)\)/,
  "the reached checkpoint settles and locks the completed first leg");
assert.match(setupSecondLeg,
  /suggestedMoveIdx = getLevelCellIndex\(level, checkpoint\.secondShuffle\[0\]\)/,
  "the first reversible second-leg move remains the gentle hint");
const checkpointFallback = extractNamedFunction(html, "setCheckpointFallbackBoard");
assert.match(checkpointFallback,
  /\[4, 1, 2, 5\][\s\S]*?suggestedMoveIdx = 2/,
  "the bounded initial fallback points at a real road panel that reverses safely");
assert.match(html,
  /const hintMoveBase = stageCheckpointReached[\s\S]*?moveCount === hintMoveBase/,
  "the second leg gets its hint even after the first leg used several moves");

const ponoPlayTarget = extractNamedFunction(html, "getActivePonoPlayTarget");
assert.match(ponoPlayTarget,
  /level\.checkpoint && !stageCheckpointReached[\s\S]*?getPonoCheckpointProgress/,
  "live journey progress reserves half of the stage distance for the second leg");
const motherPlayTarget = extractNamedFunction(html, "getActiveMotherPlayTarget");
assert.match(motherPlayTarget,
  /level\.checkpoint && !stageCheckpointReached[\s\S]*?getMotherCheckpointProgress/,
  "the mother's live position follows the same two-leg checkpoint pacing");

const captureSnapshot = extractNamedFunction(html, "captureStageAttemptSnapshot");
for (const signal of ["moveCountBase", "stageCheckpointReached", "stageCheckpointTrail",
  "checkpointLockedCells"]) {
  assert.ok(captureSnapshot.includes(signal), `${signal} is saved at the midpoint retry boundary`);
}
const finishDiscovery = extractNamedFunction(html, "finishCheckpointDiscovery");
assert.ok(finishDiscovery.indexOf("setupCheckpointSecondLeg(now)") >= 0 &&
  finishDiscovery.indexOf("captureStageAttemptSnapshot()") >
    finishDiscovery.indexOf("setupCheckpointSecondLeg(now)"),
"the retry snapshot is recaptured only after the guaranteed second leg is ready");

const restart = extractNamedFunction(html, "restartTimedOutStage");
for (const signal of ["stageCheckpointReached", "stageCheckpointTrail",
  "stageCheckpointLockedCells"]) {
  assert.ok(restart.includes(signal), `${signal} is restored on a same-board retry`);
}
assert.match(restart,
  /if \(stageCheckpointReached\)[\s\S]*?resumeCheckpointLeg\(now, preservedProgress\)[\s\S]*?else[\s\S]*?startCurrentStageIntro/,
  "a midpoint retry resumes there instead of replaying the left-edge entry");
const resumeCheckpoint = extractNamedFunction(html, "resumeCheckpointLeg");
assert.match(resumeCheckpoint,
  /getCheckpointCenter\(\)[\s\S]*?journeyActor\.phase = JOURNEY_PHASE\.PLAYING/,
  "the resumed actor stays at the checkpoint in normal play");

const checkpointCopy = [
  "おかあさんの しるしまで みちを つなごう！",
  "おかあさんの しるしを みつけた！\nつぎの みちを つなごう！",
  "ここは もう とおった みちだよ",
  "しるしの つづきから みちを つなごう！",
];
const kanji = /[\u3400-\u4dbf\u4e00-\u9fff]/u;
for (const copy of checkpointCopy) {
  assert.ok(html.includes(copy.replace("\n", "\\n")) || html.includes(copy),
    `checkpoint copy remains present: ${copy.replace("\n", " / ")}`);
  assert.doesNotMatch(copy, kanji, "checkpoint guidance follows the child-facing kana rule");
  assert.doesNotMatch(copy, /おいつ/, "the midpoint never claims the final reunion");
}

console.log("slide_checkpoint_journey_regression: all assertions passed");
