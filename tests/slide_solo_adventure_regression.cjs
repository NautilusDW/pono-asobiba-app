#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const slideDir = path.join(root, "slide");
const html = fs.readFileSync(path.join(slideDir, "index.html"), "utf8");

function mainInlineScript(source) {
  const start = source.lastIndexOf("<script>");
  const end = source.indexOf("</script>", start);
  assert.ok(start >= 0 && end > start, "slide main inline script must exist");
  return source.slice(start + "<script>".length, end);
}

const script = mainInlineScript(html);

function evalConstArray(name) {
  const match = script.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n\\]);`));
  assert.ok(match, `${name} must remain a directly inspectable array literal`);
  return vm.runInNewContext(match[1], Object.create(null), {
    filename: `slide-${name.toLowerCase()}.js`,
  });
}

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

function allNamedFunctions(source) {
  const result = new Map();
  const names = source.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g);
  for (const match of names) {
    if (!result.has(match[1])) result.set(match[1], extractNamedFunction(source, match[1]));
  }
  return result;
}

function jpegSize(file) {
  let offset = 2;
  while (offset + 9 < file.length) {
    if (file[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = file[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = file.readUInt16BE(offset + 2);
    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame) {
      return { width: file.readUInt16BE(offset + 7), height: file.readUInt16BE(offset + 5) };
    }
    assert.ok(length >= 2, "JPEG segment length must be valid");
    offset += 2 + length;
  }
  throw new Error("JPEG dimensions not found");
}

function webpSize(file) {
  let offset = 12;
  while (offset + 8 <= file.length) {
    const fourcc = file.subarray(offset, offset + 4).toString("ascii");
    const length = file.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (fourcc === "VP8X") {
      return {
        width: file.readUIntLE(data + 4, 3) + 1,
        height: file.readUIntLE(data + 7, 3) + 1,
      };
    }
    if (fourcc === "VP8L") {
      assert.equal(file[data], 0x2f, "lossless WebP signature");
      const bits = file.readUInt32LE(data + 1);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    if (fourcc === "VP8 ") {
      assert.equal(file.subarray(data + 3, data + 6).toString("hex"), "9d012a", "lossy WebP frame header");
      return {
        width: file.readUInt16LE(data + 6) & 0x3fff,
        height: file.readUInt16LE(data + 8) & 0x3fff,
      };
    }
    offset = data + length + (length % 2);
  }
  throw new Error("WebP dimensions not found");
}

function imageSize(filePath) {
  const file = fs.readFileSync(filePath);
  if (file.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") {
    return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
  }
  if (file[0] === 0xff && file[1] === 0xd8) return jpegSize(file);
  if (file.subarray(0, 4).toString("ascii") === "RIFF" &&
      file.subarray(8, 12).toString("ascii") === "WEBP") return webpSize(file);
  throw new Error(`${path.relative(root, filePath)} must be PNG, JPEG, or WebP`);
}

const failures = [];
function check(label, callback) {
  try {
    callback();
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
  }
}

check("eight unique landscape story backgrounds", () => {
  const backgrounds = evalConstArray("STAGE_BGS");
  assert.equal(backgrounds.length, 8, "the eight-stage journey needs one background per stage");

  const files = backgrounds.map((source, index) => {
    assert.equal(typeof source, "string", `stage ${index + 1}: background source is a string`);
    const filePath = path.resolve(slideDir, source);
    assert.ok(filePath.startsWith(`${root}${path.sep}`), `stage ${index + 1}: background stays in the repository`);
    assert.ok(fs.existsSync(filePath), `stage ${index + 1}: ${source} exists`);
    return filePath;
  });

  assert.equal(new Set(files).size, 8, "every stage must reference its own background asset");
  const hashes = files.map(filePath =>
    crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex"));
  assert.equal(new Set(hashes).size, 8, "background files must also contain eight distinct illustrations");

  files.forEach((filePath, index) => {
    const { width, height } = imageSize(filePath);
    assert.ok(width > height, `stage ${index + 1}: background is landscape (${width}x${height})`);
    assert.ok(Math.abs(width / height - 16 / 9) <= 0.01,
      `stage ${index + 1}: background is 16:9, got ${width}x${height}`);
  });
});

check("bright gameplay plates keep the preferred earlier story illustrations", () => {
  const levelMatch = script.match(/const VERTICAL_LEVELS = (\[[\s\S]*?\n\]);\n\n\/\/ 行列の転置/);
  assert.ok(levelMatch, "level story data remains inspectable");
  const levels = vm.runInNewContext(levelMatch[1], Object.create(null), {
    filename: "slide-story-art.js",
  });
  const expectedStoryArt = new Map([
    [1, "../assets/images/Slide/cutscene_1.png"],
    [3, "../assets/images/Slide/cutscene_2.png"],
    [5, "../assets/images/Slide/cutscene_3.png"],
  ]);
  expectedStoryArt.forEach((source, index) => {
    assert.equal(levels[index].cutscene.img, source,
      `stage ${index + 1}: restores its earlier story illustration`);
    const filePath = path.resolve(slideDir, source);
    assert.ok(fs.existsSync(filePath), `${source} exists`);
    assert.ok(fs.statSync(filePath).size < 3 * 1024 * 1024,
      `${source} stays below the repository image limit`);
    const size = imageSize(filePath);
    assert.ok(Math.abs(size.width / size.height - 16 / 9) <= 0.01,
      `${source} remains a 16:9 story card`);
  });

  assert.match(script,
    /imgMomFull\.src = '\.\.\/assets\/images\/Slide\/pono_mom_only\.png'/,
    "the final world marker uses the mother matching the earlier story art");
  const motherPath = path.join(root, "assets/images/Slide/pono_mom_only.png");
  assert.ok(fs.existsSync(motherPath), "the earlier mother cutout exists");
  assert.ok(fs.statSync(motherPath).size < 3 * 1024 * 1024,
    "the earlier mother cutout stays below the repository image limit");
  const moonCluePath = path.join(root, "assets/images/Slide/adventure/moonlight_clue.webp");
  assert.ok(fs.existsSync(moonCluePath), "the moonlight discovery has a matched clue asset");
  assert.match(script, /imgMoonClue\.src = '\.\.\/assets\/images\/Slide\/adventure\/moonlight_clue\.webp'/,
    "the moonlight clue is preloaded with the other journey art");

  const showCutscene = extractNamedFunction(script, "showCutscene");
  assert.match(showCutscene, /level\.cutscene\.img[\s\S]*?cutscene-img/,
    "story postcards display each earlier complete illustration without recomposing its character");
  const showOverlay = extractNamedFunction(script, "showOverlay");
  assert.match(showOverlay, /cutscene_ending\.png[\s\S]*?cutscene-img/,
    "the earlier parent-and-child ending illustration returns");
  const draw = extractNamedFunction(script, "draw");
  assert.match(draw, /wash\.addColorStop\(0, 'rgba\(20,67,73,0\.04\)'\)/,
    "the top wash remains nearly transparent");
  assert.match(draw, /wash\.addColorStop\(1, 'rgba\(13,47,61,0\.06\)'\)/,
    "the bottom wash remains nearly transparent");
});

check("the empty cell reads as a physical hole without visible copy", () => {
  assert.doesNotMatch(html, /['"`]ここへ['"`]|>\s*ここへ\s*</,
    "the ambiguous visible label ここへ must not return");
  const drawEmptySlot = extractNamedFunction(script, "drawEmptySlot");
  assert.doesNotMatch(drawEmptySlot, /fillText\s*\(/,
    "the empty hole is explained by depth, not text");
  assert.doesNotMatch(drawEmptySlot, /setLineDash\s*\(/,
    "a dashed target outline must not flatten the hole into another selectable panel");
  assert.match(drawEmptySlot, /create(?:Linear|Radial)Gradient\s*\(/,
    "the recessed well needs a depth gradient");
  assert.match(drawEmptySlot, /\b(?:rim|lip|bevel|outerEdge)\b/i,
    "the renderer needs a named outer rim/lip layer");
  assert.match(drawEmptySlot, /\b(?:well|hollow|recess|depth|innerWell)\b/i,
    "the renderer needs a named inner well/depth layer");
  assert.match(drawEmptySlot, /shadowOffsetY\s*=/,
    "offset light/shadow must communicate which surface is lower");
  const pathLayers = (drawEmptySlot.match(/\.(?:roundRect|rect|arc)\s*\(/g) || []).length;
  assert.ok(pathLayers >= 2, "the hole needs separate outer-rim and inner-well geometry");
});

check("a permanent goal beacon marks the exact right-side row", () => {
  assert.match(script, /const GOAL_STYLE = Object\.freeze\([\s\S]*?marker: '#FF6F7A'/,
    "one fixed coral goal language is shared by every world theme");
  const bounds = extractNamedFunction(script, "getGoalBeaconBounds");
  assert.match(bounds, /geo\.goalX/);
  assert.match(bounds, /centerY: geo\.goalY/,
    "the beacon remains centered on the configured goal row");

  const beacon = extractNamedFunction(script, "drawGoalBeacon");
  assert.match(beacon, /geo\.rightEdge[\s\S]*?geo\.goalY/,
    "a solid socket attaches the outside marker to the board exit");
  assert.match(beacon, /GOAL_STYLE\.marker/,
    "the goal uses a stable color distinct from theme-dependent paths and holes");
  assert.match(beacon, /reducedMotionQuery\.matches/,
    "goal emphasis becomes static for reduced-motion users");
  assert.doesNotMatch(beacon, /fillText\s*\(|setLineDash\s*\(/,
    "the finish flag communicates without another instruction or dashed empty-slot cue");

  const goalDraw = extractNamedFunction(script, "drawStartGoal");
  const beaconAt = goalDraw.indexOf("drawGoalBeacon(");
  const discoveryGateAt = goalDraw.indexOf("if (!clueDiscovered)");
  assert.ok(beaconAt >= 0 && discoveryGateAt > beaconAt,
    "the generic goal remains visible before the discovery reward is revealed");
});

check("clues stay hidden until Pono reaches the discovery beat", () => {
  assert.match(script, /(?:let|var)\s+clueDiscovered\s*=\s*false\s*;/,
    "a stage-owned clueDiscovered flag must begin false");
  const goalDraw = extractNamedFunction(script, "drawStartGoal");
  const iconAt = goalDraw.search(/level\.goalIcon|imgMomFull/);
  assert.ok(iconAt >= 0, "goal drawing still has a clue or reunion marker");

  const positiveGate = goalDraw.search(/if\s*\(\s*clueDiscovered\s*\)/);
  const earlyReturnGate = goalDraw.search(/if\s*\(\s*!clueDiscovered\s*\)\s*(?:\{[\s\S]{0,240}?return\b|return\b)/);
  assert.ok(
    (positiveGate >= 0 && positiveGate < iconAt) ||
    (earlyReturnGate >= 0 && earlyReturnGate < iconAt),
    "all goal-icon/mother drawing must sit behind the discovery gate",
  );

  const onStageClear = extractNamedFunction(script, "onStageClear");
  assert.doesNotMatch(onStageClear, /clueDiscovered\s*=\s*true/,
    "solving the board alone must not reveal the clue before the exit walk finishes");

  const functions = allNamedFunctions(script);
  const revealers = [...functions.entries()].filter(([, body]) =>
    /clueDiscovered\s*=\s*true/.test(body));
  assert.equal(revealers.length, 1, "one explicit journey beat owns clue discovery");
  const [revealName, revealBody] = revealers[0];
  assert.match(revealName, /(?:reveal|discover|complete|finish)/i,
    "the discovery owner must be a clearly named completion/reveal function");
  assert.match(revealBody, /(?:DISCOVERY|DISCOVERED)/,
    "revealing the clue also advances the journey to its discovery phase");
  assert.match(script, /clueDiscovered\s*=\s*false/g,
    "a new stage resets discovery before play resumes");
});

check("one continuous actor owns intro, play, exit, and discovery", () => {
  assert.match(script, /\b(?:JOURNEY|TRAVEL)(?:_PHASE|_STATE|_STATES|_PHASES)\b[\s\S]*?\b(?:INTRO|ENTERING)\b[\s\S]*?\b(?:PLAY|PLAYING|EXPLORING)\b[\s\S]*?\b(?:EXIT|EXITING|STAGE_EXIT)\b[\s\S]*?\b(?:DISCOVERY|DISCOVERED)\b/,
    "the journey state machine must name all four ordered beats");

  const actorMatch = script.match(
    /(?:let|const)\s+([A-Za-z_$][\w$]*(?:Actor|Travel|Journey|Anim)[\w$]*)\s*=\s*\{([^}]+)\}/,
  );
  assert.ok(actorMatch, "Pono needs one persistent travel/actor state object");
  const actorName = actorMatch[1];
  assert.match(actorMatch[2], /\b(?:active|phase|mode)\b/,
    `${actorName} stores its current render/travel mode`);
  assert.match(actorMatch[2], /\b(?:path|progress|x|position)\b/,
    `${actorName} stores continuity along the route`);

  const drawStartGoal = extractNamedFunction(script, "drawStartGoal");
  assert.equal((script.match(/ctx\.drawImage\(imgPonoWorld,/g) || []).length, 1,
    "stationary Pono has exactly one draw site");
  assert.match(drawStartGoal, new RegExp(`if\\s*\\([^)]*!${actorName}\\.active|if\\s*\\([^)]*!winAnim\\.active`),
    "stationary Pono is hidden whenever the travel actor is walking");

  const walkGate = new RegExp(`if\\s*\\(\\s*${actorName}\\.active|if\\s*\\(\\s*winAnim\\.active`);
  assert.match(script, walkGate,
    "walking-sheet rendering is owned by the complementary active actor branch");
});

check("stage transitions follow intro then play then exit then discovery", () => {
  const onStageClear = extractNamedFunction(script, "onStageClear");
  assert.match(onStageClear, /(?:EXIT|EXITING|STAGE_EXIT)/,
    "a solved board starts the exit beat");

  const startGame = extractNamedFunction(script, "startGame");
  const nextStage = extractNamedFunction(script, "nextStage");
  const stageStarts = `${startGame}\n${nextStage}`;
  assert.match(stageStarts, /(?:INTRO|ENTERING)/,
    "the first and following stages begin with Pono entering the next scene");
  assert.doesNotMatch(stageStarts, /showOverlay\s*\(\s*['"]stagestart['"]\s*\)/,
    "a large stage-start modal must not interrupt the continuous journey");

  const functions = allNamedFunctions(script);
  const introFinishers = [...functions.values()].filter(body =>
    /(?:INTRO|ENTERING)/.test(body) && /(?:PLAY|PLAYING|EXPLORING)/.test(body));
  assert.ok(introFinishers.length >= 1, "an intro completion hands control to normal play");

  const exitFinishers = [...functions.values()].filter(body =>
    /(?:EXIT|EXITING|STAGE_EXIT)/.test(body) && /(?:DISCOVERY|DISCOVERED)/.test(body));
  assert.ok(exitFinishers.length >= 1, "the exit completion reveals the discovery before stage advance");
});

check("new child-facing journey copy remains kana", () => {
  const levelMatch = script.match(/const VERTICAL_LEVELS = (\[[\s\S]*?\n\]);\n\n\/\/ 行列の転置/);
  assert.ok(levelMatch, "level story data remains inspectable");
  const levels = vm.runInNewContext(levelMatch[1], Object.create(null), {
    filename: "slide-story-copy.js",
  });
  assert.equal(levels.length, 8, "the story still spans eight stages");
  levels.slice(0, -1).forEach((level, index) => {
    assert.ok(level.clueCell || level.clueAsset,
      `stage ${index + 1} provides a visible discovery after Pono arrives`);
  });

  const kanji = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff々〆ヵヶ]/u;
  levels.forEach((level, index) => {
    const fields = ["name", "storyMsg", "clearMsg", "introMsg", "exitMsg", "discoveryMsg"];
    fields.forEach(field => {
      if (typeof level[field] === "string") {
        assert.doesNotMatch(level[field], kanji, `stage ${index + 1} ${field} uses kana/katakana`);
      }
    });
    if (level.cutscene && typeof level.cutscene.text === "string") {
      assert.doesNotMatch(level.cutscene.text, kanji, `stage ${index + 1} cutscene text uses kana/katakana`);
    }
  });

  const assignedCopy = [...script.matchAll(
    /\.(?:textContent|innerHTML)\s*=\s*(['"`])((?:(?!\1)[\s\S])*?)\1/g,
  )].map(match => match[2]).join("\n");
  assert.doesNotMatch(assignedCopy, kanji,
    "directly assigned child-facing overlay/tutorial copy uses kana/katakana");
});

check("reduced motion preserves the journey order without long travel", () => {
  assert.match(html, /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
    "the page keeps a CSS reduced-motion fallback");

  const functions = allNamedFunctions(script);
  const transitionFallbacks = [...functions.entries()].filter(([, body]) =>
    /reducedMotionQuery\.matches/.test(body) &&
    /(?:INTRO|ENTERING|EXIT|EXITING|DISCOVERY|DISCOVERED|clueDiscovered)/.test(body));
  assert.ok(transitionFallbacks.length >= 1,
    "a transition function must branch on reduced motion, not only decorative canvas pulses");
  assert.ok(transitionFallbacks.some(([, body]) =>
    /(?:complete|finish|reveal|discover)[A-Za-z_$]*\s*\(/.test(body) ||
    /(?:duration|dur)\s*=\s*0\b/.test(body)),
  "reduced motion immediately completes the travel beat while retaining its state order");
});

check("pause stays honest during travel and browser focus changes", () => {
  const introFinish = extractNamedFunction(script, "finishJourneyIntro");
  const onStageClear = extractNamedFunction(script, "onStageClear");
  const beginStage = extractNamedFunction(script, "beginStage");
  assert.match(introFinish, /setPauseAvailable\(true\)/,
    "pause becomes available when INTRO hands control to PLAYING");
  assert.match(onStageClear, /setPauseAvailable\(false\)/,
    "pause becomes unavailable before EXIT starts");
  assert.match(beginStage, /setPauseAvailable\(false\)/,
    "the next INTRO visibly disables its non-operational pause control");
  assert.match(script,
    /visibilitychange[\s\S]*?bgmEnabled && state !== S\.PAUSED[\s\S]*?window\.addEventListener\('focus'[\s\S]*?bgmEnabled && state !== S\.PAUSED/,
    "focus and visibility recovery must not restart BGM behind a paused screen");
});

if (failures.length > 0) {
  console.error("slide_solo_adventure_regression: failed invariants");
  failures.forEach((failure, index) => console.error(`  ${index + 1}. ${failure}`));
  process.exitCode = 1;
} else {
  console.log("slide_solo_adventure_regression: all assertions passed");
}
