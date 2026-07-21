#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const sources = Object.freeze({
  game: read("nazonazo-tunnel/js/game.js"),
  html: read("nazonazo-tunnel/index.html"),
  css: read("nazonazo-tunnel/styles.css")
});

const SPAN = 2860;
const CAT_STOP_ANCHORS = Object.freeze([296, 726, 1156, 1586, 2016]);
const VIEWPORTS = Object.freeze([
  Object.freeze({ width: 844, height: 390 }),
  Object.freeze({ width: 1174, height: 658 }),
  Object.freeze({ width: 1366, height: 768 })
]);

// Values are the visually meaningful alpha edge measured from the canonical
// WebP files (alpha > 16), not the crop script's nominal guard size.
const CAT_GROUNDING = Object.freeze({
  farTownA: Object.freeze({ groundAnchorY: .6758, transparentBottomPx: 342 }),
  farTownB: Object.freeze({ groundAnchorY: .7678, transparentBottomPx: 245 }),
  midGardenA: Object.freeze({ groundAnchorY: .8436, transparentBottomPx: 165 }),
  midLaneB: Object.freeze({ groundAnchorY: .8436, transparentBottomPx: 165 }),
  cottage: Object.freeze({ groundAnchorY: .9825, transparentBottomPx: 17 }),
  garden: Object.freeze({ groundAnchorY: .9811, transparentBottomPx: 16 }),
  fence: Object.freeze({ groundAnchorY: .9809, transparentBottomPx: 18 }),
  rooftop: Object.freeze({ groundAnchorY: .9743, transparentBottomPx: 17 }),
  bridge: Object.freeze({ groundAnchorY: .9868, transparentBottomPx: 12 }),
  plaza: Object.freeze({ groundAnchorY: .9846, transparentBottomPx: 12 }),
  tree: Object.freeze({ groundAnchorY: .9819, transparentBottomPx: 18 }),
  lane: Object.freeze({ groundAnchorY: .9806, transparentBottomPx: 19 })
});

const DINO_GROUNDING = Object.freeze({
  farHerd: Object.freeze({ groundAnchorY: .953678, transparentBottomPx: 17, groundPlaneY: .66, parallax: .06 }),
  waterhole: Object.freeze({ groundAnchorY: .976454, transparentBottomPx: 17, groundPlaneY: .79, anchor: 368, parallax: .14, layer: "far" }),
  parasaurolophus: Object.freeze({ groundAnchorY: .980494, transparentBottomPx: 15, groundPlaneY: .79, anchor: 820, parallax: .16, layer: "far" }),
  nest: Object.freeze({ groundAnchorY: .982434, transparentBottomPx: 14, groundPlaneY: .815, anchor: 980, parallax: .32, layer: "mid" }),
  sauropod: Object.freeze({ groundAnchorY: .982703, transparentBottomPx: 16, groundPlaneY: .79, anchor: 1335, parallax: .14, layer: "far" }),
  stegosaurus: Object.freeze({ groundAnchorY: .977893, transparentBottomPx: 17, groundPlaneY: .815, anchor: 1620, parallax: .62, layer: "near" }),
  trex: Object.freeze({ groundAnchorY: .970588, transparentBottomPx: 16, groundPlaneY: .815, anchor: 2050, parallax: .70, layer: "near" })
});

// The rare cutouts use their reviewed alpha edge (alpha > 16). Grounded
// friends share the physical plane of their stage; the golden cloud is the
// sole branch-stage rare that intentionally remains airborne.
const BRANCH_RARE_PLACEMENT = Object.freeze({
  dino: Object.freeze({ mode: "ground", groundPlaneY: .815, groundAnchorY: .986441 }),
  toy: Object.freeze({ mode: "ground", groundPlaneY: .82, groundAnchorY: .985752 }),
  cat: Object.freeze({ mode: "ground", groundPlaneY: .85, groundAnchorY: .985974 }),
  fantasy: Object.freeze({ mode: "ground", groundPlaneY: .82, groundAnchorY: .985166 }),
  ruins: Object.freeze({ mode: "ground", groundPlaneY: .82, groundAnchorY: .985383 }),
  sky: Object.freeze({ mode: "air" })
});

const compact = value => value
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "")
  .replace(/\s+/g, "");

function scanBalanced(source, openAt, openChar, closeChar) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openAt; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) { if (char === "\n") lineComment = false; continue; }
    if (blockComment) { if (char === "*" && next === "/") { blockComment = false; index += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") { lineComment = true; index += 1; continue; }
    if (char === "/" && next === "*") { blockComment = true; index += 1; continue; }
    if (char === "\"" || char === "'" || char === "`") { quote = char; continue; }
    if (char === openChar) depth += 1;
    else if (char === closeChar && --depth === 0) return index;
  }
  return -1;
}

function extractBalancedAfter(source, marker, openChar, closeChar) {
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) return "";
  const openAt = source.indexOf(openChar, markerAt + marker.length);
  const end = openAt >= 0 ? scanBalanced(source, openAt, openChar, closeChar) : -1;
  return end > openAt ? source.slice(openAt, end + 1) : "";
}

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) return "";
  const openAt = source.indexOf("{", markerAt + marker.length);
  const end = openAt >= 0 ? scanBalanced(source, openAt, "{", "}") : -1;
  return end > openAt ? source.slice(markerAt, end + 1) : "";
}

function replaceFunction(source, name, replacement) {
  const original = extractFunction(source, name);
  assert.ok(original, `${name} must exist before it can be mutated`);
  return source.replace(original, replacement);
}

function mutateFunction(source, name, mutate) {
  const original = extractFunction(source, name);
  assert.ok(original, `${name} must exist before it can be mutated`);
  const replacement = mutate(original);
  assert.notEqual(replacement, original, `${name} mutation must change its source`);
  return source.replace(original, replacement);
}

function evalLiteral(source, context = {}) {
  if (!source) return null;
  try {
    return vm.runInNewContext(`(${source})`, { Object, Array, Math, Number, ...context }, { timeout: 1000 });
  } catch {
    return null;
  }
}

function extractNumericConst(source, name) {
  const match = source.match(new RegExp(`(?:const|,)\\s*${name}\\s*=\\s*(-?(?:\\d+(?:\\.\\d*)?|\\.\\d+))`));
  return match ? Number(match[1]) : NaN;
}

function compilePureFunction(source, name) {
  const body = extractFunction(source, name);
  if (!body) return null;
  try {
    return vm.runInNewContext(`(${body})`, { Math, Number }, { timeout: 1000 });
  } catch {
    return null;
  }
}

function near(actual, expected, tolerance = 1e-6) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
}

function cssBlocksFor(css, selectorNeedle) {
  const blocks = [];
  const matcher = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = matcher.exec(css))) {
    if (match[1].includes(selectorNeedle)) blocks.push({ selectors: match[1], declarations: match[2] });
  }
  return blocks;
}

function parseConfigs(game) {
  const catGroundPlaneY = extractNumericConst(game, "BRANCH_CAT_GROUND_PLANE_Y");
  const catFarParallax = extractNumericConst(game, "BRANCH_CAT_FAR_PARALLAX");
  const catMidParallax = extractNumericConst(game, "BRANCH_CAT_MID_PARALLAX");
  const catNearParallax = extractNumericConst(game, "BRANCH_CAT_NEAR_PARALLAX");
  const catContext = {
    BRANCH_CAT_STOP_ANCHORS: CAT_STOP_ANCHORS,
    BRANCH_CAT_GROUND_PLANE_Y: catGroundPlaneY,
    BRANCH_CAT_FAR_PARALLAX: catFarParallax,
    BRANCH_CAT_MID_PARALLAX: catMidParallax,
    BRANCH_CAT_NEAR_PARALLAX: catNearParallax,
    BRANCH_CAT_MID_ANCHOR_OFFSET: 32 / catMidParallax,
    BRANCH_CAT_NEAR_ANCHOR_OFFSET: -32 / catNearParallax,
    QN: 5,
    GAP: 430
  };
  const catFar = evalLiteral(extractBalancedAfter(game, "const BRANCH_CAT_FAR_CONFIG=Object.freeze(", "[", "]"), catContext);
  const midCall = extractBalancedAfter(game, "const BRANCH_CAT_MID_CONFIG=Object.freeze", "(", ")");
  const catMid = evalLiteral(midCall ? `Object.freeze${midCall}` : "", catContext);
  const catNear = evalLiteral(extractBalancedAfter(game, "const BRANCH_CAT_NEAR_CONFIG=Object.freeze(", "[", "]"), catContext);
  const dinoLife = evalLiteral(extractBalancedAfter(game, "const BRANCH_DINO_WORLD_LIFE_CONFIG=Object.freeze(", "[", "]"));
  const dinoFarGround = evalLiteral(extractBalancedAfter(game, "const BRANCH_DINO_FAR_HERD_GROUND=Object.freeze(", "{", "}"));
  const dinoFar = dinoFarGround && {
    ...dinoFarGround,
    parallax: extractNumericConst(game, "BRANCH_DINO_FAR_HERD_PARALLAX")
  };
  return { catFar, catMid, catNear, dinoLife, dinoFar };
}

function parseRarePlacement(game) {
  return evalLiteral(extractBalancedAfter(game, "const RARE_GROUND_CONFIG=Object.freeze(", "{", "}"));
}

function validate(candidate) {
  const errors = [];
  const check = (condition, code) => { if (!condition && !errors.includes(code)) errors.push(code); };
  const { game, html, css } = candidate;
  const gameCompact = compact(game);
  const render = extractFunction(game, "renderBranchStagePolish");
  const renderCompact = compact(render);
  const buildLife = compact(extractFunction(game, "buildBranchWorldLifeSprite"));
  const projectSource = compact(extractFunction(game, "projectBranchWorldSpriteX"));
  const configs = parseConfigs(game);
  const rarePlacement = parseRarePlacement(game);
  const maybeSpawnRare = extractFunction(game, "maybeSpawnRare");
  const maybeSpawnRareCompact = compact(maybeSpawnRare);
  const syncRarePlacement = extractFunction(game, "syncRareGrounding");
  const syncRarePlacementCompact = compact(syncRarePlacement);

  // The old nearest-scene billboard implementation freezes at its clamp and
  // teleports when the selected scene changes. None of those mechanisms may
  // return under a renamed CSS state.
  check(!renderCompact.includes("activeCatByRole") && !/nearest/i.test(render) &&
    !renderCompact.includes("clamp(travel") && !renderCompact.includes("if(!active)continue") &&
    !renderCompact.includes("travelLimit") && !buildLife.includes("travelLimit") &&
    !gameCompact.includes("dataset.travelLimit") && !projectSource.includes("clamp(") &&
    !/Math\.max\([^)]*Math\.min\(/.test(projectSource), "cat-no-sticky-selector");
  check(!renderCompact.includes(".classList.toggle(\"is-active\"") &&
    !renderCompact.includes("dataset.active=") &&
    !cssBlocksFor(css, ".branch-world-life.is-cat").some(block => /(?:\.is-active|data-active)/.test(block.selectors)),
  "cat-no-active-billboards");

  const project = compilePureFunction(game, "projectBranchWorldSpriteX");
  check(typeof project === "function", "projection-helper");
  if (typeof project === "function") {
    const samples = [
      { anchor: 296, local: 296, parallax: .1, expected: 50 },
      { anchor: 726, local: 511, parallax: .18, expected: 88.7 },
      { anchor: 980, local: 1200, parallax: .32, expected: -20.4 },
      { anchor: 2050, local: 1800, parallax: .7, expected: 225 }
    ];
    check(samples.every(sample => near(project(sample.anchor, sample.local, sample.parallax), sample.expected)), "projection-helper");
  }
  check(renderCompact.includes("projectBranchWorldSpriteX(sprite.anchor,localWorldX,sprite.parallax") &&
    renderCompact.includes("branchWorldLifeSprites.length") &&
    renderCompact.includes('sprite.el.style.transform="translate3d("+cssXFromVw(x)'), "projection-consumed");

  const catGroups = [configs.catFar, configs.catMid, configs.catNear];
  const cats = catGroups.every(Array.isArray) ? catGroups.flat() : [];
  check(catGroups.every(Array.isArray) && configs.catFar.length === 5 && configs.catMid.length === 9 &&
    configs.catNear.length === 9 && cats.length === 23, "cat-config-count");
  check(cats.every(config => Number.isFinite(config.anchor) && Number.isFinite(config.parallax) && config.parallax > 0 &&
    near(config.groundPlaneY, .85, 1e-6) &&
    Number.isFinite(config.groundAnchorY) && Number.isInteger(config.transparentBottomPx)), "cat-fixed-config");
  check(cats.every(config => CAT_GROUNDING[config.asset] &&
    near(config.groundAnchorY, CAT_GROUNDING[config.asset].groundAnchorY, .002) &&
    config.transparentBottomPx === CAT_GROUNDING[config.asset].transparentBottomPx), "cat-ground-values");

  // Each individual scene must have a non-zero, constant velocity. Visibility
  // culling is deliberately excluded from the position equation.
  if (typeof project === "function" && cats.length === 23) {
    let continuous = true;
    let maxError = 0;
    for (const config of cats) {
      let previous = project(config.anchor, 0, config.parallax);
      for (let local = .5; local <= SPAN; local += .5) {
        const current = project(config.anchor, local, config.parallax);
        const expected = 50 + (config.anchor - local) * config.parallax;
        const delta = current - previous;
        maxError = Math.max(maxError, Math.abs(current - expected));
        if (!near(delta, -.5 * config.parallax, 1e-8) || Math.abs(delta) < 1e-9) continuous = false;
        previous = current;
      }
    }
    check(continuous && maxError <= 1e-8, "cat-continuous-motion");
  } else {
    check(false, "cat-continuous-motion");
  }

  const grounding = compilePureFunction(game, "computeBranchWorldSpriteBottomPx");
  check(typeof grounding === "function", "grounding-helper");
  if (typeof grounding === "function") {
    const probes = [
      { stageHeight: 390, renderedHeight: 154, plane: .82, anchor: .6758, occlusion: 0 },
      { stageHeight: 658, renderedHeight: 240, plane: .79, anchor: .976454, occlusion: 3 },
      { stageHeight: 768, renderedHeight: 190, plane: .815, anchor: .982434, occlusion: 6 }
    ];
    check(probes.every(probe => {
      const bottom = grounding(probe.stageHeight, probe.renderedHeight, probe.plane, probe.anchor, probe.occlusion);
      const visibleGroundY = probe.stageHeight - bottom - probe.renderedHeight * (1 - probe.anchor);
      return near(visibleGroundY, probe.stageHeight * probe.plane + probe.occlusion, .001);
    }), "grounding-helper");
  }
  check(buildLife.includes("groundPlaneY:config.groundPlaneY") &&
    buildLife.includes("groundAnchorY:config.groundAnchorY") &&
    buildLife.includes("transparentBottomPx:config.transparentBottomPx") &&
    (gameCompact.match(/computeBranchWorldSpriteBottomPx\(/g) || []).length >= 2 &&
    gameCompact.includes("sprite.groundPlaneY") && gameCompact.includes("sprite.groundAnchorY"), "grounding-consumed");

  const groundedRareStages = ["dino", "toy", "cat", "fantasy", "ruins"];
  check(rarePlacement && groundedRareStages.every(stageId => {
    const actual = rarePlacement[stageId];
    const expected = BRANCH_RARE_PLACEMENT[stageId];
    return actual &&
      near(actual.groundPlaneY, expected.groundPlaneY, 1e-6) &&
      near(actual.groundAnchorY, expected.groundAnchorY, 1e-6) &&
      !Object.keys(actual).some(key => /^top(?:Min|Max)?$/i.test(key));
  }) && !rarePlacement.sky &&
    /stage\.id\s*===\s*"sky"\s*\?\s*"air"\s*:\s*"legacy-air"/.test(maybeSpawnRare),
  "rare-stage-placement-map");

  const stageMapIsConsumed = /\bstage\s*=\s*STAGES\s*\[\s*stg\s*\]/.test(maybeSpawnRare) &&
    /RARE_GROUND_CONFIG\s*\[\s*stage\.id\s*\]/.test(maybeSpawnRare);
  check(stageMapIsConsumed && maybeSpawnRareCompact.includes("syncRareGrounding(") &&
    (maybeSpawnRareCompact.match(/rnd\(0,18\)/g) || []).length === 1 &&
    /if\s*\(\s*groundConfig\s*\)\s*\{[^}]*style\.bottom\s*=\s*"0px"[^}]*style\.top\s*=\s*"auto"[^}]*\}\s*else\s*\{[^}]*style\.top\s*=\s*\(\s*10\s*\+\s*rnd\(\s*0\s*,\s*18\s*\)\s*\)\s*\+\s*"vh"/.test(maybeSpawnRare),
  "rare-stage-placement-consumed");

  // Placement must use the image's current rendered height, not the nominal
  // CSS clamp or source-file height. This keeps the reviewed alpha anchor on
  // the same plane after responsive resizing.
  check(syncRarePlacementCompact.includes('el.dataset.placement!=="ground"') &&
    syncRarePlacementCompact.includes("RARE_GROUND_CONFIG[el.dataset.rareStage]") &&
    syncRarePlacementCompact.includes("config.groundPlaneY") &&
    syncRarePlacementCompact.includes("config.groundAnchorY") &&
    syncRarePlacementCompact.includes("image.getBoundingClientRect()") &&
    syncRarePlacementCompact.includes(".height") &&
    syncRarePlacementCompact.includes("computeBranchWorldSpriteBottomPx(") &&
    syncRarePlacementCompact.includes("style.bottom=") &&
    /addEventListener\("resize",[^\n]*rare/i.test(game), "rare-grounding-consumed");

  const scheduleRare = compact(extractFunction(game, "scheduleRareSpawn"));
  check(/const\s+FORCERARE\s*=\s*\(\s*location\.hash\s*===\s*"#fast"\s*\)/.test(game) &&
    scheduleRare.includes("maybeSpawnRare()") && maybeSpawnRareCompact.includes("!FORCERARE") &&
    maybeSpawnRareCompact.includes("rareSpawnChance()"), "forced-rare-contract-consumed");

  if (typeof grounding === "function" && rarePlacement) {
    let grounded = true;
    VIEWPORTS.forEach((viewport, viewportIndex) => groundedRareStages.forEach(stageId => {
      const config = rarePlacement[stageId];
      if (!config) { grounded = false; return; }
      const renderedHeight = [54, 72, 82][viewportIndex];
      const bottom = grounding(viewport.height, renderedHeight, config.groundPlaneY, config.groundAnchorY, 0);
      const visibleGroundY = viewport.height - bottom - renderedHeight * (1 - config.groundAnchorY);
      if (!near(visibleGroundY, viewport.height * config.groundPlaneY, .01)) grounded = false;
    }));
    check(grounded, "rare-grounding-three-viewports");
  } else {
    check(false, "rare-grounding-three-viewports");
  }

  // Verify the grounding equation at every requested viewport. Rendered height
  // varies by asset and breakpoint; the equation must be invariant to it.
  if (typeof grounding === "function" && cats.length === 23) {
    let grounded = true;
    VIEWPORTS.forEach(viewport => cats.forEach((config, index) => {
      const renderedHeight = Math.max(42, viewport.width * (.08 + (index % 7) * .017));
      const occlusion = Number.isFinite(config.occlusionPx) ? config.occlusionPx : 0;
      const bottom = grounding(viewport.height, renderedHeight, config.groundPlaneY, config.groundAnchorY, occlusion);
      const visibleGroundY = viewport.height - bottom - renderedHeight * (1 - config.groundAnchorY);
      if (!near(visibleGroundY, viewport.height * config.groundPlaneY + occlusion, .01)) grounded = false;
    }));
    check(grounded, "cat-grounding-three-viewports");
  } else {
    check(false, "cat-grounding-three-viewports");
  }

  const dinoLife = Array.isArray(configs.dinoLife) ? configs.dinoLife : [];
  check(dinoLife.length === 6 && configs.dinoFar && typeof configs.dinoFar === "object", "dino-config-count");
  check(dinoLife.every(config => {
    const expected = DINO_GROUNDING[config.asset];
    return expected && near(config.anchor, expected.anchor, .001) && config.ratio === undefined &&
      near(config.parallax, expected.parallax, .001) && near(config.groundPlaneY, expected.groundPlaneY, .001) &&
      near(config.groundAnchorY, expected.groundAnchorY, .002) &&
      config.transparentBottomPx === expected.transparentBottomPx &&
      (expected.layer === "far" ? config.layer === "far" : config.role === expected.layer);
  }), "dino-life-ground-values");
  check(configs.dinoFar && near(configs.dinoFar.parallax, DINO_GROUNDING.farHerd.parallax, .001) &&
    near(configs.dinoFar.groundPlaneY, DINO_GROUNDING.farHerd.groundPlaneY, .001) &&
    near(configs.dinoFar.groundAnchorY, DINO_GROUNDING.farHerd.groundAnchorY, .002) &&
    configs.dinoFar.transparentBottomPx === DINO_GROUNDING.farHerd.transparentBottomPx,
  "dino-far-ground-values");

  const buildDino = compact(extractFunction(game, "buildBranchDinoWorldLife"));
  check(buildLife.includes('config.layer==="far"?branchEffectFar:branchWorldLifeLayer') &&
    buildDino.includes("BRANCH_DINO_WORLD_LIFE_CONFIG.forEach") &&
    buildDino.includes("branchEffectFar") &&
    dinoLife.filter(config => config.layer === "far").length === 3 &&
    dinoLife.filter(config => config.layer !== "far").length === 3, "dino-layer-parent");
  const farAt = html.indexOf('id="branchEffectFar"');
  const midAt = html.indexOf('id="midT"');
  const lifeAt = html.indexOf('id="branchWorldLifeLayer"');
  const fgAt = html.indexOf('id="fgT"');
  check(farAt >= 0 && midAt > farAt && lifeAt > midAt && fgAt > lifeAt, "dino-layer-parent");

  const nestBlocks = cssBlocksFor(css, ".branch-dino-nest-landmark");
  check(game.includes('className:"branch-dino-nest-landmark"') &&
    nestBlocks.every(block => !/(?:^|;)\s*bottom\s*:/.test(block.declarations)),
    "dino-nest-no-bottom-override");

  if (typeof grounding === "function" && dinoLife.length === 6 && configs.dinoFar) {
    const allDino = [configs.dinoFar, ...dinoLife];
    let grounded = true;
    VIEWPORTS.forEach(viewport => allDino.forEach((config, index) => {
      const renderedHeight = Math.max(48, viewport.width * (.07 + index * .021));
      const occlusion = Number.isFinite(config.occlusionPx) ? config.occlusionPx : 0;
      const bottom = grounding(viewport.height, renderedHeight, config.groundPlaneY, config.groundAnchorY, occlusion);
      const visibleGroundY = viewport.height - bottom - renderedHeight * (1 - config.groundAnchorY);
      if (!near(visibleGroundY, viewport.height * config.groundPlaneY + occlusion, .01)) grounded = false;
    }));
    check(grounded, "dino-grounding-three-viewports");
  } else {
    check(false, "dino-grounding-three-viewports");
  }

  // Width and height may both scale, but max-height must not squash only the
  // vertical axis of an intrinsic-ratio sprite.
  const spriteImageBlocks = [
    ...cssBlocksFor(css, ".branch-world-life img"),
    ...cssBlocksFor(css, ".branch-dino-far-herd img"),
    ...cssBlocksFor(css, ".branch-cat-population--far img"),
    ...cssBlocksFor(css, ".branch-cat-population--mid img"),
    ...cssBlocksFor(css, ".branch-cat-population--near img")
  ];
  check(spriteImageBlocks.length > 0 && spriteImageBlocks.every(block => !/(?:^|;)\s*max-height\s*:/.test(block.declarations)) &&
    spriteImageBlocks.every(block => !/(?:^|;)\s*height\s*:(?!\s*auto(?:\s*!important)?(?:;|$))/.test(block.declarations)),
  "sprite-intrinsic-ar");

  // groundAnchorY already describes the raw image's visible bottom edge.
  // Translating that image again by transparentBottomPx would apply the alpha
  // padding correction twice and move the visible feet/base below the plane.
  check(!gameCompact.includes("branchWorldLifeSprites.forEach(syncOneBranchCutoutGuard)") &&
    !gameCompact.includes("branchDinoFarHerdSprites.forEach(syncOneBranchCutoutGuard)") &&
    spriteImageBlocks.every(block => !/(?:--life-guard-y|--dino-far-guard-y)/.test(block.declarations)),
  "grounding-no-double-transparent-offset");

  return { errors };
}

const baseline = validate(sources);
assert.deepEqual(baseline.errors, [], `grounding/scroll baseline failed: ${baseline.errors.join(", ")}`);

const mutations = [
  {
    name: "cat clamp reintroduced",
    expected: "cat-no-sticky-selector",
    game: replaceFunction(sources.game, "projectBranchWorldSpriteX",
      "function projectBranchWorldSpriteX(anchor,localWorldX,parallax){const travel=(anchor-localWorldX)*parallax;return 50+Math.max(-12,Math.min(12,travel));}")
  },
  {
    name: "world anchor ignored",
    expected: "projection-helper",
    game: replaceFunction(sources.game, "projectBranchWorldSpriteX",
      "function projectBranchWorldSpriteX(anchor,localWorldX,parallax){return 50-localWorldX*parallax;}")
  },
  {
    name: "ground anchor ignored",
    expected: "grounding-helper",
    game: replaceFunction(sources.game, "computeBranchWorldSpriteBottomPx",
      "function computeBranchWorldSpriteBottomPx(stageHeight,renderedHeight,groundPlaneY,groundAnchorY,occlusionPx=0){return stageHeight*(1-groundPlaneY)-occlusionPx;}")
  },
  {
    name: "rare top 10-28vh random band reintroduced",
    expected: "rare-stage-placement-consumed",
    game: mutateFunction(sources.game, "maybeSpawnRare", body =>
      body.replace('rareEl.style.left="104vw";', 'rareEl.style.left="104vw";rareEl.style.top=(10+rnd(0,18))+"vh";'))
  },
  {
    name: "rare stage mapping ignored",
    expected: "rare-stage-placement-consumed",
    game: mutateFunction(sources.game, "maybeSpawnRare", body => {
      return body.replace(/RARE_GROUND_CONFIG\s*\[\s*stage\.id\s*\]/, "RARE_GROUND_CONFIG.dino");
    })
  },
  {
    name: "rare ground anchor ignored",
    expected: "rare-grounding-consumed",
    game: mutateFunction(sources.game, "syncRareGrounding", body =>
      body.replace(/\b(?:config|placement)\.groundAnchorY\b/g, "1"))
  },
  {
    name: "forced rare browser contract ignored",
    expected: "forced-rare-contract-consumed",
    game: mutateFunction(sources.game, "maybeSpawnRare", body =>
      body.replace(/!FORCERARE\s*&&\s*Math\.random\(\)\s*>\s*rareSpawnChance\(\)/, "Math.random()>rareSpawnChance()"))
  }
];

mutations.forEach(mutation => {
  const result = validate({ ...sources, game: mutation.game });
  assert.ok(result.errors.includes(mutation.expected), `${mutation.name}: expected ${mutation.expected}, got ${result.errors.join(", ")}`);
});

console.log(`nazonazo grounding/scroll regression: PASS (cat 23 fixed scenes, dino 7 grounded scenes, 5 grounded + 1 airborne branch rares, ${VIEWPORTS.length} viewports, ${mutations.length}/${mutations.length} mutations REJECT)`);
