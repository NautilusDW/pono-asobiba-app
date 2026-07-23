#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const html = read("nazonazo-tunnel/index.html");
const css = read("nazonazo-tunnel/styles.css");
const game = read("nazonazo-tunnel/js/game.js");
const compact = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").replace(/\s+/g, "");

const profiles = Object.freeze({
  easy: Object.freeze({ id: "easy", label: "かんたん", rows: 3, cols: 4, start: 4, goal: 7, first: 5, beforeGoal: 6, minLength: 4, maxLength: 4, minTurns: 0, maxTurns: 0, fallbackPath: Object.freeze([4, 5, 6, 7]) }),
  normal: Object.freeze({ id: "normal", label: "ふつう", rows: 4, cols: 5, start: 10, goal: 9, first: 11, beforeGoal: 8, minLength: 6, maxLength: 9, minTurns: 2, maxTurns: 5, fallbackPath: Object.freeze([10, 11, 6, 7, 8, 9]) }),
  hard: Object.freeze({ id: "hard", label: "むずかしい", rows: 4, cols: 7, start: 14, goal: 13, first: 15, beforeGoal: 12, minLength: 8, maxLength: 12, minTurns: 2, maxTurns: 6, fallbackPath: Object.freeze([14, 15, 8, 9, 10, 11, 12, 13]) })
});

function scanBalanced(source, openAt, openChar, closeChar) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = openAt; index < source.length; index += 1) {
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
    if (char === openChar) depth += 1;
    else if (char === closeChar && --depth === 0) return index;
  }
  return -1;
}

function extractFunction(source, name) {
  const match = new RegExp(`function\\s+${name}\\s*\\(`).exec(source);
  if (!match) return "";
  const parametersAt = source.indexOf("(", match.index);
  const parametersEnd = scanBalanced(source, parametersAt, "(", ")");
  const bodyAt = source.indexOf("{", parametersEnd);
  const bodyEnd = scanBalanced(source, bodyAt, "{", "}");
  return bodyEnd > bodyAt ? source.slice(match.index, bodyEnd + 1) : "";
}

function numericConstant(source, name) {
  const match = new RegExp(`(?:const\\s+|,)${name}\\s*=\\s*([0-9.]+)`).exec(source);
  return match ? Number(match[1]) : NaN;
}

function testSourceContracts() {
  assert.match(game, /DINO_WATER_DEFAULT_DIFFICULTY="easy"/);
  assert.match(game, /easy:Object\.freeze\(\{[^}]*rows:3,cols:4[^}]*start:4,goal:7/);
  assert.match(game, /normal:Object\.freeze\(\{[^}]*rows:4,cols:5[^}]*start:10,goal:9/);
  assert.match(game, /hard:Object\.freeze\(\{[^}]*rows:DINO_WATER_ROWS,cols:DINO_WATER_COLS[^}]*start:DINO_WATER_START,goal:DINO_WATER_GOAL/);
  assert.equal((html.match(/data-water-difficulty="(?:easy|normal|hard)"/g) || []).length, 3);
  assert.match(html, /data-water-difficulty="easy"[^>]*aria-pressed="true"/);
  assert.match(html, /data-water-difficulty="normal"[^>]*aria-pressed="false"/);
  assert.match(html, /data-water-difficulty="hard"[^>]*aria-pressed="false"/);
  assert.match(game, /goal\.className="dino-water-goal-label"/);

  const cssCompact = compact(css);
  assert.ok(cssCompact.includes("grid-template-columns:repeat(var(--water-cols),var(--water-cell))"));
  assert.ok(cssCompact.includes("grid-template-rows:repeat(var(--water-rows),var(--water-cell))"));
  assert.ok(cssCompact.includes('.dino-water-grid[data-difficulty="easy"]'));
  assert.ok(cssCompact.includes('.dino-water-grid[data-difficulty="normal"]'));
  assert.ok(cssCompact.includes('@keyframesdinoWaterGoalGlow'));
  assert.ok(cssCompact.includes('.dino-water-cell[data-kind="pond"]'));
  assert.ok(cssCompact.includes("white-space:nowrap"));
  assert.match(extractFunction(game, "rotateDinoWaterTile"), /tile\.displayRotation=displayRotation\+1/);
  assert.match(game, /dinoWaterDifficultyButtons\.forEach\(button=>bindTap\(button,/);
}

function testGenerators() {
  const names = [
    "dinoWaterDifficultyProfile", "dinoWaterCoordinates", "dinoWaterIndexAt", "createDinoWaterRandom",
    "dinoWaterDirectionBetween", "dinoWaterBaseOpenings", "dinoWaterTileOpenings",
    "dinoWaterSolutionRotation", "dinoWaterPathTurns", "dinoWaterGeneratePath",
    "generateDinoWaterBoard", "dinoWaterReachable", "dinoWaterBoardSolved"
  ];
  const context = {
    DINO_WATER_DIFFICULTIES: profiles,
    DINO_WATER_ROWS: 4,
    DINO_WATER_COLS: 7,
    DINO_WATER_START: 14,
    DINO_WATER_GOAL: 13,
    DINO_WATER_GENERATION_ATTEMPTS: numericConstant(game, "DINO_WATER_GENERATION_ATTEMPTS"),
    DINO_WATER_FALLBACK_PATH: profiles.hard.fallbackPath,
    DINO_WATER_DIRECTIONS: Object.freeze([
      Object.freeze({ key: "N", dr: -1, dc: 0, opposite: "S" }),
      Object.freeze({ key: "E", dr: 0, dc: 1, opposite: "W" }),
      Object.freeze({ key: "S", dr: 1, dc: 0, opposite: "N" }),
      Object.freeze({ key: "W", dr: 0, dc: -1, opposite: "E" })
    ]),
    Math,
    Set
  };
  vm.createContext(context);
  vm.runInContext(`${names.map(name => extractFunction(game, name)).join("\n")};this.runtime={${names.join(",")}};`, context);

  for (const [difficulty, profile] of Object.entries(profiles)) {
    for (let seed = 0; seed < 256; seed += 1) {
      const first = context.runtime.generateDinoWaterBoard(seed, difficulty);
      const repeated = context.runtime.generateDinoWaterBoard(seed, difficulty);
      assert.equal(JSON.stringify(first), JSON.stringify(repeated), `${difficulty}/${seed}: nondeterministic`);
      assert.equal(first.board.length, profile.rows * profile.cols, `${difficulty}/${seed}: wrong board size`);
      assert.equal(first.path[0], profile.start, `${difficulty}/${seed}: wrong source`);
      assert.equal(first.path.at(-1), profile.goal, `${difficulty}/${seed}: wrong goal`);
      assert.ok(first.path.length >= profile.minLength && first.path.length <= profile.maxLength, `${difficulty}/${seed}: path length`);
      const turns = context.runtime.dinoWaterPathTurns(first.path, profile);
      assert.ok(turns >= profile.minTurns && turns <= profile.maxTurns, `${difficulty}/${seed}: turn count`);
      assert.equal(context.runtime.dinoWaterBoardSolved(first.board, difficulty), false, `${difficulty}/${seed}: starts solved`);
      const solved = first.board.map(tile => tile.onPath ? { ...tile, rotation: tile.solutionRotation } : { ...tile });
      assert.equal(context.runtime.dinoWaterBoardSolved(solved, difficulty), true, `${difficulty}/${seed}: solution invalid`);
    }
  }
}

async function edgeWaterCenter(file, edge) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const values = [];
  const span = 8;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (edge === "top" && y >= span) continue;
      if (edge === "right" && x < info.width - span) continue;
      const offset = (y * info.width + x) * 3;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      if (blue > red * 1.25 && green > red * 1.3 && blue > 130) values.push(edge === "top" ? x : y);
    }
  }
  assert.ok(values.length > 0, `${path.basename(file)}: ${edge} opening not found`);
  return (Math.min(...values) + Math.max(...values)) / 2;
}

async function testCurveCenterNormalization() {
  const curve = path.join(root, "assets/images/nazonazo-tunnel/branch_dino_adventure_water_tile_curve_wet_20260723.webp");
  const top = await edgeWaterCenter(curve, "top");
  const right = await edgeWaterCenter(curve, "right");
  const rule = /\.dino-water-cell\[data-kind="curve"\]\s+\.dino-water-tile-channel\{[^}]*transform:translate\(([-0-9.]+)%,0\)\s+scale\(([-0-9.]+),([-0-9.]+)\)/.exec(css);
  assert.ok(rule, "curve normalization rule missing");
  const translateX = Number(rule[1]) / 100 * 512;
  const scaleX = Number(rule[2]);
  const scaleY = Number(rule[3]);
  assert.ok(Math.abs(top * scaleX + translateX - 255.5) <= 1, `curve top remains off-center: ${top * scaleX + translateX}`);
  assert.ok(Math.abs(right * scaleY - 255.5) <= 1, `curve right remains off-center: ${right * scaleY}`);
}

async function main() {
  testSourceContracts();
  testGenerators();
  await testCurveCenterNormalization();
  console.log("nazonazo dino water difficulty regression: PASS (3x4 / 4x5 / 4x7, 768 deterministic boards, centered curve, glowing goal)");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
