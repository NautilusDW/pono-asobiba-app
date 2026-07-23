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
const game = read("nazonazo-tunnel/js/game.js");

function scanBalanced(source, openAt, openChar, closeChar) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openAt; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
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
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
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
  assert.ok(match, `missing function ${name}`);
  const paramsAt = source.indexOf("(", match.index);
  const paramsEnd = scanBalanced(source, paramsAt, "(", ")");
  const bodyAt = source.indexOf("{", paramsEnd);
  const bodyEnd = scanBalanced(source, bodyAt, "{", "}");
  assert.ok(bodyAt >= 0 && bodyEnd > bodyAt, `unbalanced function ${name}`);
  return source.slice(match.index, bodyEnd + 1);
}

function extractArray(source, name) {
  const match = new RegExp(`(?:const\\s+|,)${name}\\s*=`).exec(source);
  assert.ok(match, `missing array ${name}`);
  const at = source.indexOf("[", match.index);
  const end = scanBalanced(source, at, "[", "]");
  assert.ok(at >= 0 && end > at, `unbalanced array ${name}`);
  return vm.runInNewContext(`(${source.slice(at, end + 1)})`, Object.create(null), { timeout: 500 });
}

function numericConstant(source, name) {
  const match = new RegExp(`(?:const\\s+|,)${name}\\s*=\\s*([0-9.]+)`).exec(source);
  assert.ok(match, `missing numeric constant ${name}`);
  return Number(match[1]);
}

function dinoSection(source) {
  const start = source.indexOf("/* ================= dinosaur adventure ================= */");
  const end = source.indexOf("/* ================= game loop ================= */", start);
  assert.ok(start >= 0 && end > start, "dinosaur adventure section missing");
  return source.slice(start, end);
}

let checks = 0;
function check(condition, message) {
  checks += 1;
  assert.ok(condition, message);
}

// Crane V2 DOM and input contract.
for (const id of [
  "dinoCraneCargoLayer", "dinoCraneBranch", "dinoCraneLog", "dinoCraneRock",
  "dinoCraneRingGuides", "dinoCraneSafePlatform", "dinoCranePlatformArt",
  "dinoCraneCargoStatus", "dinoCraneSwing", "dinoCraneChances", "dinoCraneControls",
  "dinoCraneLeft", "dinoCraneLower", "dinoCraneRight", "dinoCraneRetry",
  "dinoWaterGrid", "dinoWaterHint"
]) {
  check((html.match(new RegExp(`id=["']${id}["']`, "g")) || []).length === 1, `DOM id ${id} must exist exactly once`);
}
check((html.match(/class=["'][^"']*dino-crane-cargo(?:\s|["'])/g) || []).length === 3, "crane must render exactly three payload images");
check((html.match(/class=["'][^"']*dino-crane-bay(?:\s|["'])/g) || []).length === 3, "crane must render exactly three bays");
for (const id of ["dinoCraneLeft", "dinoCraneLower", "dinoCraneRight", "dinoCraneRetry", "dinoWaterHint"]) {
  check(new RegExp(`<button id=["']${id}["'][^>]*type=["']button["']`).test(html), `${id} must be a real button`);
}
check(/id="dinoCraneHook"\s+class="dino-crane-hook"\s+aria-hidden="true"/.test(html), "hook must be presentation, not the direct-drag control");
check(/id="dinoCraneSwing"[^>]*role="meter"[^>]*aria-valuemin="0"[^>]*aria-valuemax="18"/.test(html), "swing meter accessibility contract");
check(/id="dinoWaterGrid"[^>]*role="grid"/.test(html), "water grid role missing");
check(!/id="dinoWaterRetry"/.test(html), "rotation water game must not expose trace retry");

const cargoDefs = extractArray(game, "DINO_CRANE_CARGO_DEFS");
check(cargoDefs.length === 3, "crane payload count must be exactly three");
check(JSON.stringify(cargoDefs.map(item => item.id)) === JSON.stringify(["branch", "log", "rock"]), "crane payload identity/order drifted");
check(new Set(cargoDefs.map(item => item.bay)).size === 3 && cargoDefs.every((item, index) => item.bay === index), "payloads need three distinct matching bays");
check(cargoDefs[0].weight < cargoDefs[1].weight && cargoDefs[1].weight < cargoDefs[2].weight, "light/medium/heavy weight order missing");
check(cargoDefs[0].speed > cargoDefs[1].speed && cargoDefs[1].speed > cargoDefs[2].speed, "heavy payload must move more slowly");
check(cargoDefs[0].swing > cargoDefs[1].swing && cargoDefs[1].swing > cargoDefs[2].swing, "payload swing response must differ");
check(numericConstant(game, "DINO_CRANE_CHANCES") === 3, "crane event must fail after three misses");
check(numericConstant(game, "DINO_CRANE_SWING_GREEN_DEG") >= 4 && numericConstant(game, "DINO_CRANE_SWING_GREEN_DEG") <= 7, "green timing window must be readable but meaningful");

const craneFunctions = [
  "dinoCraneReadyToPlace", "beginDinoCraneMovePointer", "endDinoCraneMovePointer",
  "beginDinoCraneLower", "finishDinoCraneAction", "registerDinoCraneMiss",
  "retryDinoCraneEvent", "commitDinoCraneSuccess", "tickDinoCrane",
  "handleDinoCraneKeyDown", "handleDinoCraneKeyUp"
].map(name => extractFunction(game, name)).join("\n");
check(/movePointers/.test(craneFunctions) && /keyDirection/.test(craneFunctions), "pointer and keyboard must share held-direction state");
check(/DINO_CRANE_SWING_GREEN_DEG/.test(craneFunctions) && /swingAngle/.test(craneFunctions), "placement must use the swing timing window");
check(/nearestDinoCraneCargo/.test(extractFunction(game, "beginDinoCraneLower")), "lowering must auto-attach the nearby payload");
check(/crane\.misses\+\+/.test(extractFunction(game, "registerDinoCraneMiss")) && /crane\.chances=Math\.max\(0,crane\.chances-1\)/.test(extractFunction(game, "registerDinoCraneMiss")), "one miss must consume exactly one chance");
const retryCrane = extractFunction(game, "retryDinoCraneEvent");
check(/cargo=>!cargo\.placed/.test(retryCrane) && !/placed=false/.test(retryCrane), "event retry must preserve already placed cargo");
const commitCrane = extractFunction(game, "commitDinoCraneSuccess");
check(/crane\.placedCount!==DINO_CRANE_CARGO_DEFS\.length/.test(commitCrane), "crane may complete only at 3/3");
const finalizeCrane = extractFunction(game, "finalizeDinoCraneSuccess");
check(/crane\.completed/.test(commitCrane) && /crane\.scoreGranted/.test(finalizeCrane), "crane completion and score need one-shot guards");
check(!/handleDinoCranePointerDown|handleDinoCranePointerMove|moveDinoCraneHookTo|dinoCraneHook\.addEventListener\(["']pointer/.test(game), "direct hook/object drag must be absent");
check(/dinoCraneLeft\.addEventListener\(["']pointerdown/.test(game) && /dinoCraneRight\.addEventListener\(["']pointerdown/.test(game) && /dinoCraneLower\.addEventListener\(["']click/.test(game), "left/right hold plus lower/drop wiring missing");

// Rotation water puzzle source contract.
check(numericConstant(game, "DINO_WATER_ROWS") === 4 && numericConstant(game, "DINO_WATER_COLS") === 7, "water board must remain 4x7");
check(numericConstant(game, "DINO_WATER_START") === 14 && numericConstant(game, "DINO_WATER_GOAL") === 13, "source must be on the left and pond on the right");
check(numericConstant(game, "DINO_WATER_GENERATION_ATTEMPTS") === 32, "generator fallback cap must be 32");
check(!/DINO_WATER_DIG_BUDGET|traceDinoWaterCell|resolveDinoWaterAttempt/.test(game), "trace/budget mechanics must be removed");
for (const name of [
  "generateDinoWaterBoard", "dinoWaterReachable", "dinoWaterBoardSolved",
  "rotateDinoWaterTile", "useDinoWaterHint"
]) extractFunction(game, name);
check(/tile\.rotation=\(tile\.rotation\+1\)%4/.test(extractFunction(game, "rotateDinoWaterTile")), "one tap must rotate exactly 90 degrees");
check(/water\.helpRemaining=0/.test(extractFunction(game, "useDinoWaterHint")), "help must be consumable once");
check(/water\.waterCharges=DINO_BOSS_WATER_CHARGES/.test(extractFunction(game, "commitDinoWaterSuccess")), "water success must grant the three boss charges");
check(/pending=["']dinoBoss["']/.test(extractFunction(game, "finishDinoWaterSuccess")), "water success must cross the boss boundary once");
check(/visited=new Set\(\[DINO_WATER_START\]\)/.test(extractFunction(game, "dinoWaterReachable")), "wet BFS needs a visited set for loops");
check(/queue=\[DINO_WATER_START\]/.test(extractFunction(game, "dinoWaterReachable")), "wet propagation must be breadth-first/reachable traversal");
check(/document\.createElement\(["']button["']\)/.test(extractFunction(game, "buildDinoWaterGrid")), "all water cells must be real buttons");
check(/DINO_WATER_ROWS\*DINO_WATER_COLS/.test(extractFunction(game, "buildDinoWaterGrid")), "water grid must build all 28 cells");

// Evaluate the actual pure generator/reachability functions, not a copied model.
const pureNames = [
  "dinoWaterCoordinates", "dinoWaterIndexAt", "createDinoWaterRandom",
  "dinoWaterDirectionBetween", "dinoWaterBaseOpenings", "dinoWaterTileOpenings",
  "dinoWaterSolutionRotation", "dinoWaterPathTurns", "dinoWaterGeneratePath", "generateDinoWaterBoard",
  "dinoWaterReachable", "dinoWaterBoardSolved"
];
const rows = numericConstant(game, "DINO_WATER_ROWS");
const cols = numericConstant(game, "DINO_WATER_COLS");
const start = numericConstant(game, "DINO_WATER_START");
const goal = numericConstant(game, "DINO_WATER_GOAL");
const generationAttempts = numericConstant(game, "DINO_WATER_GENERATION_ATTEMPTS");
const fallbackPath = extractArray(game, "DINO_WATER_FALLBACK_PATH");
const directions = extractArray(game, "DINO_WATER_DIRECTIONS");
const pureSource = [
  `const DINO_WATER_ROWS=${rows},DINO_WATER_COLS=${cols},DINO_WATER_START=${start},DINO_WATER_GOAL=${goal},DINO_WATER_GENERATION_ATTEMPTS=${generationAttempts};`,
  `const DINO_WATER_FALLBACK_PATH=Object.freeze(${JSON.stringify(fallbackPath)});`,
  `const DINO_WATER_DIRECTIONS=Object.freeze(${JSON.stringify(directions)}.map(item=>Object.freeze(item)));`,
  ...pureNames.map(name => extractFunction(game, name)),
  `globalThis.__api={${pureNames.join(",")}};`
].join("\n");
const context = vm.createContext({ Object, Math, Set, Map, Array, JSON });
vm.runInContext(pureSource, context, { timeout: 1000 });
const api = context.__api;
const tileTypesSeen = new Set();
let maxPath = 0;
let maxTurns = 0;
let fallbackCount = 0;
for (let seed = 0; seed < 1000; seed += 1) {
  const first = api.generateDinoWaterBoard(seed);
  const second = api.generateDinoWaterBoard(seed);
  check(JSON.stringify(first) === JSON.stringify(second), `seed ${seed}: generation must be deterministic`);
  check(first.board.length === 28, `seed ${seed}: board must contain exactly 28 tiles`);
  check(first.seed === seed && first.attempts >= 1 && first.attempts <= 32, `seed ${seed}: attempt metadata out of range`);
  check(first.board.every((tile, index) => tile.index === index), `seed ${seed}: board index order drifted`);
  first.board.forEach(tile => tileTypesSeen.add(tile.type));
  check(first.board[start].type === "source" && start % cols === 0, `seed ${seed}: source is not fixed on left edge`);
  check(first.board[goal].type === "pond" && goal % cols === cols - 1, `seed ${seed}: pond is not fixed on right edge`);
  check(first.board[start].fixed && first.board[goal].fixed, `seed ${seed}: source/pond must not rotate`);
  check(!api.dinoWaterBoardSolved(first.board), `seed ${seed}: initial board must always be unsolved`);
  const solved = first.board.map(tile => tile.onPath ? { ...tile, rotation: tile.solutionRotation } : { ...tile });
  check(api.dinoWaterBoardSolved(solved), `seed ${seed}: stored path must always solve the board`);
  check(first.path[0] === start && first.path.at(-1) === goal, `seed ${seed}: path endpoints drifted`);
  check(new Set(first.path).size === first.path.length, `seed ${seed}: solution path contains a loop`);
  check(first.path.every((index, position) => {
    if (position === 0) return true;
    const before = first.path[position - 1];
    return Math.abs(Math.floor(index / cols) - Math.floor(before / cols)) + Math.abs(index % cols - before % cols) === 1;
  }), `seed ${seed}: solution path contains a non-adjacent step`);
  const pathDirections = first.path.slice(1).map((index, position) => api.dinoWaterDirectionBetween(first.path[position], index));
  const turns = pathDirections.slice(1).filter((direction, index) => direction !== pathDirections[index]).length;
  maxPath = Math.max(maxPath, first.path.length);
  maxTurns = Math.max(maxTurns, turns);
  check(first.path.length >= 8 && first.path.length <= 12, `seed ${seed}: path length ${first.path.length} exceeds child-facing bound 8..12`);
  check(turns >= 2 && turns <= 6, `seed ${seed}: turn count ${turns} exceeds child-facing bound 2..6`);
  if (first.fallback) fallbackCount += 1;
}
check(JSON.stringify([...tileTypesSeen].sort()) === JSON.stringify(["curve", "pond", "rock", "source", "straight", "tee"]), "water board must use exactly six tile types");
check(JSON.stringify(fallbackPath) === JSON.stringify([14, 15, 8, 9, 10, 11, 12, 13]), "verified fallback path drifted");

// Dedicated dinosaur flow must remain independent from quiz/future-crane transactions.
const dedicated = dinoSection(game);
check(!/\bonPick\s*\(|futureCrane|futureCapsule|renderChoiceCards\s*\(/.test(dedicated), "dinosaur events must not call quiz/future-crane transactions");
check(/pauseDinoAdventureInput/.test(game) && /resumeDinoAdventureInput/.test(game) && /handleDinoCraneViewportChange/.test(game), "lifecycle/resize guards missing");
check(/dinoAdventureState\.epoch!==epoch/.test(extractFunction(game, "revealDinoCraneEvent")) && /dinoAdventureState\.epoch!==epoch/.test(extractFunction(game, "revealDinoWaterEvent")), "stale reveal epoch guards missing");
check(/sources\.length!==7/.test(extractFunction(game, "preloadDinoCraneAssets")), "all seven crane assets must predecode");
check(/sources\.length!==12/.test(extractFunction(game, "preloadDinoWaterTileAssets")), "all dry/wet tile assets must predecode");
const revealCrane = extractFunction(game, "revealDinoCraneEvent");
const prepareCrane = extractFunction(game, "prepareDinoCraneGameplayAssets");
check(/await preloadDinoRescueAssets/.test(revealCrane) &&
  /prepareDinoAdventureDomImage\(dinoCraneBackdrop,DINO_ADVENTURE_ASSETS\.rescueBlocked\)/.test(revealCrane) &&
  /Promise\.all\(\[preloadDinoRescueSuccessAsset\(\),preloadDinoCraneAssets\(\)\]\)/.test(prepareCrane) &&
  (prepareCrane.match(/prepareDinoAdventureDomImage/g) || []).length === 8 &&
  /assetsReady=true/.test(prepareCrane),
"crane briefing must paint blocked art before secondary gameplay art unlocks start");
check(/Promise\.all/.test(extractFunction(game, "revealDinoWaterEvent")) && /preloadDinoWaterTileAssets/.test(extractFunction(game, "revealDinoWaterEvent")), "water reveal must wait for all tile art");

check(/\.dino-crane-controls\{/.test(css), "crane controls CSS missing");
check(/\.dino-crane-swing/.test(css), "swing feedback CSS missing");
check(/\.dino-water-tile-rotator/.test(css), "rotating water tile CSS missing");
check(/@media \(prefers-reduced-motion:reduce\)/.test(css), "reduced-motion policy missing");

console.log(`nazonazo dino crane/water v2 regression: OK (${checks} checks; 1000 seeds; maxPath=${maxPath}; maxTurns=${maxTurns}; fallbacks=${fallbackCount})`);
