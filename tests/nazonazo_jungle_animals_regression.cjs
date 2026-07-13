#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const html = read("nazonazo-tunnel/index.html");
const css = read("nazonazo-tunnel/styles.css");
const js = read("nazonazo-tunnel/js/game.js");

const staticAnimals = [
  "toucans", "sloth", "crocodile", "giraffe", "elephant"
];
const animalFiles = {
  toucans: "jungle_animal_toucans_livedin_20260712.webp",
  sloth: "jungle_animal_sloth_livedin_20260712.webp",
  crocodile: "jungle_animal_crocodile_livedin_20260712.webp",
  giraffe: "jungle_animal_giraffe_full_20260712.webp",
  elephant: "jungle_animal_elephant_trunk_3frame_20260712.webp"
};
const flightFiles = {
  birds: [
    "jungle_flying_toucan_3frame_20260712.webp",
    "jungle_flying_macaw_3frame_20260712.webp",
    "jungle_flying_hummingbird_3frame_20260712.webp"
  ],
  butterflies: [
    "jungle_flying_butterfly_3frame_20260712_v2.webp",
    "jungle_flying_butterfly_orange_3frame_20260712.webp",
    "jungle_flying_butterfly_yellow_3frame_20260712.webp"
  ]
};
const allFlightFiles = Object.values(flightFiles).flat();
const habitatFile = "jungle_habitat_loop_whiteback_20260712.webp";

function extractConstObject(source, name) {
  const marker = `const ${name}=`;
  const markerAt = source.indexOf(marker);
  assert.ok(markerAt >= 0, `${name}: declaration missing`);
  const objectAt = source.indexOf("{", markerAt + marker.length);
  assert.ok(objectAt >= 0, `${name}: object literal missing`);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = objectAt; index < source.length; index += 1) {
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
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        const literal = source.slice(objectAt, index + 1);
        const value = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1000 });
        return JSON.parse(JSON.stringify(value));
      }
    }
  }
  assert.fail(`${name}: unterminated object literal`);
}

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const markerAt = source.indexOf(marker);
  assert.ok(markerAt >= 0, `${name}: function declaration missing`);
  const bodyAt = source.indexOf("{", markerAt + marker.length);
  assert.ok(bodyAt >= 0, `${name}: function body missing`);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyAt; index < source.length; index += 1) {
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
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(markerAt, index + 1);
    }
  }
  assert.fail(`${name}: unterminated function body`);
}

function hasPositiveNumber(value) {
  if (Number.isFinite(value)) return value > 0;
  if (Array.isArray(value)) return value.length > 0 && value.every(hasPositiveNumber);
  if (value && typeof value === "object") {
    const numericValues = Object.values(value).filter(Number.isFinite);
    return numericValues.length > 0 && numericValues.every(number => number > 0);
  }
  return typeof value === "string" && /\d/.test(value);
}

const runtimeAssets = extractConstObject(js, "ASSETS");
const runtimeFlightAssets = runtimeAssets.jungle && runtimeAssets.jungle.flight;
assert.ok(runtimeFlightAssets && typeof runtimeFlightAssets === "object", "jungle flight asset registry missing");
assert.deepEqual(Object.keys(runtimeFlightAssets).sort(), ["birds", "butterflies"], "jungle flights must be split into bird and butterfly variant arrays");
assert.ok(!Object.hasOwn(runtimeFlightAssets, "bird") && !Object.hasOwn(runtimeFlightAssets, "butterfly"), "legacy single-flight asset keys must be retired");

const runtimeFlightVariants = {};
for (const type of ["birds", "butterflies"]) {
  const variants = runtimeFlightAssets[type];
  assert.ok(Array.isArray(variants), `${type}: flight variants must be an array`);
  assert.equal(variants.length, 3, `${type}: exactly three visibly different species are required`);
  assert.equal(new Set(variants.map(variant => variant.id)).size, 3, `${type}: every variant needs a distinct species id`);
  assert.deepEqual(
    variants.map(variant => path.basename(variant.src)).sort(),
    flightFiles[type].slice().sort(),
    `${type}: runtime files do not match the selected three-species set`
  );
  for (const variant of variants) {
    assert.equal(typeof variant.id, "string", `${type}: species id missing`);
    assert.ok(variant.id.trim().length > 0, `${type}: species id must not be blank`);
    assert.equal(typeof variant.src, "string", `${variant.id}: source path missing`);
    assert.ok(hasPositiveNumber(variant.width), `${variant.id}: responsive width metadata missing`);
    assert.ok(hasPositiveNumber(variant.speed), `${variant.id}: positive flight speed metadata missing`);
  }
  runtimeFlightVariants[type === "birds" ? "bird" : "butterfly"] = variants;
}
assert.equal(new Set(Object.values(runtimeFlightVariants).flat().map(variant => variant.id)).size, 6, "all six flight species ids must be unique");
const flightSpeciesByType = Object.fromEntries(Object.entries(runtimeFlightVariants).map(([type, variants]) => [
  type,
  variants.map(variant => variant.id)
]));
const flightFileBySpecies = Object.fromEntries(Object.values(runtimeFlightVariants).flat().map(variant => [
  variant.id,
  path.basename(variant.src)
]));

const jungleAnimalLayout = extractConstObject(js, "JUNGLE_ANIMAL_LAYOUT");
const layoutSpecs = Object.entries(jungleAnimalLayout).flatMap(([layer, specs]) =>
  specs.map((spec, index) => ({ ...spec, layer, index }))
);
const expectedAnchorBySpecies = {
  toucans: "perch",
  sloth: "hang",
  crocodile: "understory",
  elephant: null,
  giraffe: null
};
const expectedStageXById = {
  "elephant-far-a": 296,
  "elephant-hero": 726,
  "giraffe-far-a": 1156,
  "giraffe-hero": 1586,
  "elephant-mid-b": 2016,
  "giraffe-mid-b": 2016
};
const expectedYById = {
  "elephant-far-a": 74.5,
  "elephant-hero": 80,
  "giraffe-far-a": 73.5,
  "giraffe-hero": 80,
  "elephant-mid-b": 78,
  "giraffe-mid-b": 78
};
const expectedAnchorYBySpecies = { elephant: 80.9, giraffe: 86.8 };
const stageIdsAtStops = [
  ["elephant-far-a"],
  ["elephant-hero"],
  ["giraffe-far-a"],
  ["giraffe-hero"],
  ["elephant-mid-b", "giraffe-mid-b"]
];
const stopWorldX = [296, 726, 1156, 1586, 2016];

assert.deepEqual(Object.keys(jungleAnimalLayout).sort(), ["far", "mid", "near"]);
assert.deepEqual(Object.fromEntries(Object.entries(jungleAnimalLayout).map(([layer, specs]) => [layer, specs.length])), {
  far: 3,
  mid: 4,
  near: 2
}, "the nine wildlife placements must remain distributed through the three depth layers");
assert.equal(layoutSpecs.length, 9, "the jungle must contain exactly nine controlled wildlife placements");
assert.equal(new Set(layoutSpecs.map(spec => spec.id)).size, 9, "every wildlife placement needs a stable unique id");
assert.deepEqual(
  Object.fromEntries(staticAnimals.map(species => [species, layoutSpecs.filter(spec => spec.species === species).length])),
  { toucans: 1, sloth: 1, crocodile: 1, giraffe: 3, elephant: 3 },
  "elephant and giraffe may appear three times each; every other resting species must appear once"
);
assert.ok(!layoutSpecs.some(spec => spec.species === "butterflies" || spec.anchor === "air"), "a butterfly must not remain frozen in the static animal layout");
for (const spec of layoutSpecs) {
  const label = `${spec.layer}[${spec.index}] ${spec.species || "unknown"}`;
  if (spec.species === "elephant" || spec.species === "giraffe") {
    assert.equal(spec.anchor, spec.role === "hero" ? "ground" : "habitat", `${label}: featured habitat anchor mismatch`);
  } else {
    assert.equal(spec.anchor, expectedAnchorBySpecies[spec.species], `${label}: habitat anchor mismatch`);
  }
  assert.ok(Number.isFinite(spec.anchorY) && spec.anchorY >= 0 && spec.anchorY <= 100, `${label}: invalid image anchorY`);
  assert.ok(Number.isFinite(spec.moveY), `${label}: moveY must be explicit`);
  assert.ok((Number.isFinite(spec.w) || typeof spec.wCss === "string") && Number.isFinite(spec.min) && Number.isFinite(spec.max), `${label}: size intent missing`);
  assert.ok(spec.min > 0 && spec.max >= spec.min, `${label}: invalid size clamp`);
  assert.equal(spec.opacity, 1, `${label}: wildlife must be fully opaque`);
  if (spec.anchor !== "air") {
    assert.equal(spec.moveY, 0, `${label}: attached animals must not float vertically`);
    assert.ok(!["bob", "flutter"].includes(spec.motion), `${label}: attached animals need anchored motion`);
  }
  if (spec.anchor === "perch" || spec.anchor === "hang") {
    assert.equal(spec.loop, "mid", `${label}: tree animals must share the middle-forest tile loop`);
    assert.equal(spec.depth, 0.25, `${label}: tree animals must travel with the middle-forest layer`);
    assert.ok(spec.x <= 28 || spec.x >= 100, `${label}: tree animal must stay in the forest tile's canopy bands`);
  }
  if (spec.species === "elephant" || spec.species === "giraffe") {
    assert.equal(spec.loop, "stage", `${label}: featured animals must not repeat on a short modulo loop`);
    assert.equal(spec.stageX, expectedStageXById[spec.id], `${label}: stage placement drifted`);
    assert.equal(spec.y, expectedYById[spec.id], `${label}: habitat baseline drifted`);
    assert.equal(spec.anchorY, expectedAnchorYBySpecies[spec.species], `${label}: the sole, not the foliage alpha edge, must define grounding`);
    assert.ok(["left", "right"].includes(spec.align) && Number.isFinite(spec.inset), `${label}: safe edge alignment is missing`);
  }
  if (spec.anchor === "ground" || spec.anchor === "understory") {
    assert.equal(spec.y, 80, `${label}: ground animals must align with the 80vh jungle ground-box top`);
    assert.ok(spec.depth >= 0.85, `${label}: ground habitat must travel with the near landscape`);
  }
}

const stageSpecs = layoutSpecs.filter(spec => spec.loop === "stage");
const layoutById = Object.fromEntries(layoutSpecs.map(spec => [spec.id, spec]));
const elephantSpecs = layoutSpecs.filter(spec => spec.species === "elephant");
const giraffeSpecs = layoutSpecs.filter(spec => spec.species === "giraffe");
const elephantHero = elephantSpecs.find(spec => spec.role === "hero");
const giraffeHero = giraffeSpecs.find(spec => spec.role === "hero");
assert.deepEqual(stageSpecs.map(spec => spec.stageX).filter((value, index, values) => values.indexOf(value) === index).sort((a, b) => a - b), stopWorldX);
assert.deepEqual(elephantSpecs.map(spec => spec.role).sort(), ["distant", "distant", "hero"]);
assert.deepEqual(giraffeSpecs.map(spec => spec.role).sort(), ["distant", "distant", "hero"]);
assert.match(giraffeHero.wCss, /min\(22vw,54vmin\)/, "giraffe hero must use a viewport-safe large width");
assert.ok(giraffeHero.max >= 250, "giraffe hero desktop clamp must stay prominent");
assert.match(elephantHero.wCss, /min\(28vw,72vmin\)/, "elephant hero must read much larger than the train while staying inside short landscapes");
assert.ok(elephantHero.max >= 290, "elephant hero desktop clamp must stay prominent");
assert.deepEqual(
  elephantSpecs.filter(spec => spec.frames === 3 && !Number.isFinite(spec.fixedFrame)).map(spec => spec.id),
  ["elephant-hero"],
  "only the elephant hero may animate across the three trunk poses"
);
assert.deepEqual(
  elephantSpecs.filter(spec => spec.role === "distant").map(spec => spec.fixedFrame).sort((a, b) => a - b),
  [0, 2],
  "the two distant elephants must hold different trunk poses"
);
assert.deepEqual([...new Set(giraffeSpecs.filter(spec => spec.role === "distant").map(spec => spec.flip))].sort(), [-1, 1], "distant giraffes must use both directions");
assert.ok(elephantSpecs.filter(spec => spec.role === "distant").every(spec => spec.max < elephantHero.max), "both distant elephants must stay smaller than the hero");
assert.ok(giraffeSpecs.filter(spec => spec.role === "distant").every(spec => spec.max < giraffeHero.max), "both distant giraffes must stay smaller than the hero");
assert.ok(new Set(layoutSpecs.map(spec => spec.wCss || spec.w)).size >= 5, "animal widths need at least five visibly distinct scales");
assert.ok(Math.max(...layoutSpecs.map(spec => spec.max)) / Math.min(...layoutSpecs.map(spec => spec.max)) >= 2.5, "animal scale range is too uniform");

function renderedWidthVw(spec, viewportWidth, viewportHeight) {
  const vminPx = Math.min(viewportWidth, viewportHeight) / 100;
  let preferredPx;
  if (typeof spec.wCss === "string") {
    const match = spec.wCss.match(/^min\(([\d.]+)vw,([\d.]+)vmin\)$/);
    assert.ok(match, `${spec.id}: unsupported animal width expression ${spec.wCss}`);
    preferredPx = Math.min(viewportWidth * Number(match[1]) / 100, vminPx * Number(match[2]));
  } else {
    preferredPx = vminPx * spec.w;
  }
  return Math.max(spec.min, Math.min(spec.max, preferredPx)) / viewportWidth * 100;
}

for (const [viewportWidth, viewportHeight] of [[390, 844], [740, 320], [844, 390], [1024, 768], [1366, 768]]) {
  for (const spec of stageSpecs) {
    const widthVw = renderedWidthVw(spec, viewportWidth, viewportHeight);
    const homeX = spec.align === "right" ? 100 - spec.inset - widthVw : spec.inset;
    assert.ok(homeX >= -0.01 && homeX + widthVw <= 100.01, `${spec.id}: target placement crops at ${viewportWidth}x${viewportHeight}`);
  }
}

for (let stopIndex = 0; stopIndex < stopWorldX.length; stopIndex += 1) {
  const localWorldX = stopWorldX[stopIndex];
  const visibleStageIds = stageSpecs.filter(spec => {
    const widthVw = renderedWidthVw(spec, 844, 390);
    const homeX = spec.align === "right" ? 100 - spec.inset - widthVw : spec.inset;
    const x = homeX + (spec.stageX - localWorldX) * spec.depth;
    return !(x + widthVw < -12 || x > 112);
  }).map(spec => spec.id).sort();
  assert.deepEqual(visibleStageIds, stageIdsAtStops[stopIndex].slice().sort(), `stop ${stopIndex + 1}: featured animal sequence drifted`);
  assert.ok(visibleStageIds.length + 3 <= 5, `stop ${stopIndex + 1}: iOS must display at most five resting animals at once`);
}

for (const id of ["Far", "Mid", "Near"]) {
  assert.match(html, new RegExp(`id="jungleAnimals${id}"[^>]*class="jungle-animal-layer"[^>]*aria-hidden="true"`));
}
assert.match(html, /id="jungleAnimalsNear"[\s\S]*?id="jungleHabitatBack"[^>]*aria-hidden="true"[\s\S]*?id="world"/, "the habitat lip must paint over animal feet but remain behind stations and train-world decor");
assert.match(css, /\.jungle-animal-layer\{[^}]*pointer-events:none/);
assert.match(css, /body\.st-jungle \.jungle-animal-layer\{display:block\}/);
assert.match(css, /body\.tunnel-interior \.jungle-animal-layer\{display:none!important\}/);
assert.match(css, /#jungleAnimalsNear\{[^}]*z-index:3[^}]*bottom:19\.5vh/, "near clip must leave a half-vh alpha-padding pocket below the 80vh ground line");
assert.match(css, /body\.st-jungle #groundT\{[^}]*height:20vh/, "jungle ground box must begin at 80vh");
assert.match(css, /#jungleHabitatBack\{[^}]*bottom:20vh[^}]*height:14vh[^}]*z-index:3[^}]*pointer-events:none/, "habitat grounding lip geometry drifted");
assert.match(css, /body\.st-jungle:not\(\.tunnel-interior\) #jungleHabitatBack\{display:block\}/);
assert.match(css, /body\.tunnel-interior #jungleHabitatBack\{display:none!important\}/);
assert.match(css, /body\.st-jungle\.v-train \.train-art::before\{[^}]*z-index:1[^}]*background:linear-gradient/, "opaque jungle cab interior must hide passing wildlife behind the driver");
const reducedMotionCss = css.slice(css.indexOf("@media (prefers-reduced-motion:reduce)"));
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*?\.jungle-animal-art\{animation:none!important;transform:none!important\}/);
assert.match(css, /\.jungle-animal-frame-sheet\{[^}]*width:300%[^}]*jungleAnimalTrunkFrames/, "elephant trunk sheet must expose three horizontal cells");
assert.match(css, /@keyframes jungleAnimalTrunkFrames\{[\s\S]*?-33\.3333%[\s\S]*?-66\.6667%/, "elephant trunk animation must visit left, center, and right poses");
assert.match(css, /\.jungle-animal-frame-sheet\.is-fixed-frame\{[^}]*animation:none[^}]*var\(--animal-fixed-frame,0\)/, "distant elephant poses must remain fixed rather than synchronously animating");
assert.match(reducedMotionCss, /\.jungle-animal-frame-sheet\{[^}]*translate3d\(-33\.3333%,0,0\)!important/, "reduced motion must keep the elephant's centered trunk frame");
assert.match(html, /<(?:div|section)[^>]*(?:id|class)="[^"]*(?:jungle[^" ]*flight|flight[^" ]*jungle)[^"]*"[^>]*aria-hidden="true"/i, "the ambient flight layer must be decorative and hidden from assistive technology");
assert.match(css, /body\.st-jungle[^,{]*[,{][\s\S]*?(?:jungle[^,{]*flight|flight[^,{]*jungle)/, "flight sprites must only be exposed in the jungle scene");
assert.match(reducedMotionCss, /(?:jungle[^,{]*flight|flight[^,{]*jungle)[^{]*\{[^}]*display\s*:\s*none\s*!important/, "large cross-screen flights must be removed in reduced-motion mode");
const motionStart = css.indexOf("@keyframes jungleAnimalSway");
const motionEnd = css.indexOf(".jungle-flight-layer", motionStart);
const motionCss = css.slice(motionStart, motionEnd);
assert.ok(motionStart >= 0 && motionEnd > motionStart);
assert.doesNotMatch(motionCss, /(?:left|right|top|bottom|filter|background-position)\s*:/, "animal keyframes must stay transform-only");

assert.match(js, /if\(window\.__PONO_TIER_LOCKED__\)return;/, "LP lock must not build app-only animals");
assert.match(js, /const limit=IOS_DEVICE\?Math\.min\(5,layout\.length\):layout\.length;/, "iOS sprite cap missing");
assert.match(js, /if\(!jungleAnimalSprites\.length\|\|tunnelInteriorMode\|\|!document\.body\.classList\.contains\("st-jungle"\)\)return;/);
assert.match(js, /if\(renderKey===lastJungleAnimalRenderKey\)return;/, "stationary frames must not rewrite every animal transform");
assert.match(js, /const JUNGLE_MID_TILE_ASPECT=2,JUNGLE_MID_TILE_SCALE=1\.16;/, "middle-forest tile dimensions must stay explicit");
assert.match(js, /const midPeriod=\(\(window\.innerHeight\|\|1\)\*JUNGLE_MID_TILE_ASPECT\*JUNGLE_MID_TILE_SCALE\/\(window\.innerWidth\|\|1\)\)\*100;/, "tree animals must use the rendered 116% middle-forest tile width");
assert.match(js, /renderSeaFish\(now\);\s*(?:updateSeaBossVisual\(now\);\s*)?(?:renderSeaSteering\(\);\s*)?renderJungleAnimals\(\);/);
assert.match(js, /spec\.wCss\|\|spec\.w\+"vmin"/, "runtime must accept viewport-safe CSS widths for large animals");
assert.match(js, /spec\.frames>1\?document\.createElement\("span"\):null/, "runtime must build a clipped frame sheet only for animated animals");
assert.match(js, /animalAssets\[spec\.asset\]/, "all depth variants must reuse the keyed five-asset map");
assert.match(js, /Number\.isFinite\(spec\.fixedFrame\)\?" is-fixed-frame":""/, "runtime must identify the two fixed elephant poses");
assert.match(js, /--animal-fixed-frame",\(-33\.3333\*spec\.fixedFrame\)\+"%"/, "runtime must select the requested fixed trunk cell");
assert.match(js, /if\(animal\.loop==="stage"\)\{[\s\S]*?const x=homeX\+\(animal\.stageX-localWorldX\)\*animal\.depth;[\s\S]*?visibility=/, "stage animals must cross once without modulo repetition and hide offscreen");
assert.match(js, /jungleHabitatBack\.style\.backgroundImage=st\.id==="jungle"[\s\S]*?st\.assets\.habitat/, "jungle skin must install the habitat asset");
assert.match(js, /jungleHabitatBack\.style\.backgroundPositionX=cssXFromVw\(-\(worldX-o\)\*\.92\)/, "habitat lip must pan with the near-animal depth");
assert.doesNotMatch(js.slice(js.indexOf("function buildJungleAnimals"), js.indexOf("function renderJungleAnimals")), /addEventListener|bindTap/, "ambient animals must not be interactive");

for (const animal of staticAnimals) {
  const file = animalFiles[animal];
  const rel = `assets/images/nazonazo-tunnel/${file}`;
  const full = path.join(root, rel);
  assert.ok(fs.existsSync(full), `${rel} missing`);
  const stat = fs.statSync(full);
  assert.ok(stat.size > 1000 && stat.size < 3 * 1024 * 1024, `${rel} unexpected size ${stat.size}`);
  const buf = fs.readFileSync(full);
  assert.equal(buf.subarray(0, 4).toString("ascii"), "RIFF", `${rel} is not RIFF WebP`);
  assert.equal(buf.subarray(8, 12).toString("ascii"), "WEBP", `${rel} is not WebP`);
  assert.ok(buf.includes(Buffer.from("ALPH")), `${rel} must contain alpha data`);
  assert.ok(js.includes(`../assets/images/nazonazo-tunnel/${file}`), `${animal}: runtime reference missing`);
  assert.doesNotMatch(js, new RegExp(`jungle_animal_${animal}_(?:storybook(?:_v2)?_)?20260711\\.webp`), `${animal}: previous animal asset still referenced`);
}
const runtimeAnimalReferences = [...js.matchAll(/\.\.\/assets\/images\/nazonazo-tunnel\/(jungle_animal_[^"']+\.webp)/g)]
  .map(match => match[1]);
assert.equal(runtimeAnimalReferences.length, 5, "runtime must reference exactly the five selected static jungle animal assets");
assert.deepEqual(runtimeAnimalReferences.slice().sort(), Object.values(animalFiles).slice().sort(), "runtime jungle animal references must match the selected replacement set");
assert.doesNotMatch(js, /jungle_animal_(?:elephant|giraffe)_livedin_20260712\.webp/, "cropped elephant and giraffe assets must be fully retired");
assert.doesNotMatch(js, /jungle_animal_butterflies_livedin_20260712\.webp/, "the old frozen butterfly group must not remain in the runtime asset map");
assert.doesNotMatch(js, /jungle_animal_(?:monkey|owl|snake|frog|lion|zebra)_[^"']+\.webp/, "removed species must not remain in the runtime asset map");

const habitatPath = path.join(root, "assets/images/nazonazo-tunnel", habitatFile);
assert.ok(fs.existsSync(habitatPath), `assets/images/nazonazo-tunnel/${habitatFile} missing`);
assert.ok(fs.statSync(habitatPath).size > 1000 && fs.statSync(habitatPath).size < 3 * 1024 * 1024, "habitat loop must stay within the repository image limit");
assert.ok(js.includes(`../assets/images/nazonazo-tunnel/${habitatFile}`), "runtime habitat asset reference missing");

for (const file of allFlightFiles) {
  const rel = `assets/images/nazonazo-tunnel/${file}`;
  const full = path.join(root, rel);
  assert.ok(fs.existsSync(full), `${rel} missing`);
  const stat = fs.statSync(full);
  assert.ok(stat.size > 1000 && stat.size < 3 * 1024 * 1024, `${rel} unexpected size ${stat.size}`);
  const buf = fs.readFileSync(full);
  assert.equal(buf.subarray(0, 4).toString("ascii"), "RIFF", `${rel} is not RIFF WebP`);
  assert.equal(buf.subarray(8, 12).toString("ascii"), "WEBP", `${rel} is not WebP`);
  assert.equal((js.match(new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1, `${file}: flight sheet must be declared exactly once`);
}
assert.match(css, /\.jungle-flight-sheet\{[^}]*width\s*:\s*300%/, "three-frame sheets must expose exactly three horizontal cells");
assert.match(css, /\.jungle-flight-sheet\{[^}]*animation\s*:[^;}]*jungleFlightFrames[^;}]*(?:step-end|steps\(\s*3)/, "wing animation must jump between frames rather than sliding the sheet");
assert.match(css, /@keyframes\s+jungleFlightFrames\s*\{[\s\S]*?translate3d\(\s*-33\.33[\s\S]*?translate3d\(\s*-66\.66/, "flight animation must visit all three sheet cells");
assert.match(js, /(?:render|update|start|build)JungleFlight/i, "runtime flight lifecycle is missing");
assert.match(js, /jungleFlight[\s\S]*?translate3d/i, "flying animals must cross the scene with transform-only motion");

const nextFlightVariantSource = extractFunction(js, "nextJungleFlightVariant");
const prepareFlightVariantSource = extractFunction(js, "prepareJungleFlightVariant");
const buildFlightsSource = extractFunction(js, "buildJungleFlights");
const resetFlightSource = extractFunction(js, "resetJungleFlight");
const renderFlightsSource = extractFunction(js, "renderJungleFlights");
assert.match(nextFlightVariantSource, /bag/i, "flight variants must be drawn from a shuffle bag rather than independent replacement picks");
assert.match(nextFlightVariantSource, /shuffle|sort\s*\(/i, "flight bag must randomize each three-species cycle");
assert.match(nextFlightVariantSource, /last|prev|previous/i, "flight bag must remember the previous species across cycle boundaries");
assert.match(nextFlightVariantSource, /species|\.id/i, "flight bag boundary guard must compare actual species ids");
assert.match(prepareFlightVariantSource, /nextJungleFlightVariant\s*\(/, "variant preparation must consume the next shuffled species");
assert.match(prepareFlightVariantSource, /dataset\.flightSpecies\s*=/, "the rendered sprite must expose its actual species id");
assert.match(prepareFlightVariantSource, /\.src\s*=/, "variant preparation must swap the three-frame sheet source");
assert.match(prepareFlightVariantSource, /width/i, "variant preparation must apply species-specific display width");
assert.match(prepareFlightVariantSource, /speed/i, "variant preparation must apply species-specific travel speed");
assert.match(buildFlightsSource, /prepareJungleFlightVariant\s*\(/, "the initial bird and butterfly sprites must receive a species before their first flight");
assert.match(resetFlightSource, /prepareJungleFlightVariant\s*\(/, "a completed flight must prepare a different queued species while hidden");
assert.match(resetFlightSource, /!initial\|\|!flight\.variant/, "pausing or first activation must not consume a species that has not flown yet");
assert.match(renderFlightsSource, /progress\s*>=\s*1[\s\S]*?resetJungleFlight\s*\(/, "finishing a crossing must advance through the reset/variant lifecycle");
assert.match(buildFlightsSource, /__PONO_TIER_LOCKED__[\s\S]*?jungleFlightReducedMotion\(\)[\s\S]*?return/, "LP lock and reduced motion must stop flight construction before variant assets are assigned");
assert.doesNotMatch(buildFlightsSource, /(?:assets\.birds|assets\.butterflies)\.forEach[\s\S]*?appendChild/, "six species must rotate through two sprites, not create six animated DOM nodes");

function exerciseFlightVariantContract() {
  const sandbox = Object.create(null);
  vm.runInNewContext(`
    const STAGES=[{id:"jungle",assets:{flight:${JSON.stringify(runtimeFlightAssets)}}}];
    let stg=0;
    const jungleFlightBags={bird:[],butterfly:[]};
    const jungleFlightLast={bird:"",butterfly:""};
    let shuffleCalls=0;
    const shuffle=values=>{shuffleCalls+=1;return shuffleCalls%2?values.slice():values.slice().reverse();};
    ${extractFunction(js, "jungleFlightVariants")}
    ${nextFlightVariantSource}
    ${prepareFlightVariantSource}
    const sequences={};
    for(const type of ["bird","butterfly"]){
      sequences[type]=Array.from({length:6},()=>nextJungleFlightVariant(type).id);
    }
    jungleFlightBags.bird=[];jungleFlightLast.bird="";
    const sheet={src:"",getAttribute(){return this.src;}};
    const flight={el:{dataset:{},style:{width:""},querySelector(){return sheet;}}};
    const preparedVariant=prepareJungleFlightVariant(flight,"bird");
    result={sequences,prepared:{
      id:preparedVariant.id,
      dataset:flight.el.dataset.flightSpecies,
      type:flight.el.dataset.flightType,
      src:sheet.src,
      width:flight.el.style.width,
      speedScale:flight.speedScale
    }};
  `, sandbox, { timeout: 1000 });
  return JSON.parse(JSON.stringify(sandbox.result));
}

const flightVariantContract = exerciseFlightVariantContract();
for (const type of ["bird", "butterfly"]) {
  const sequence = flightVariantContract.sequences[type];
  const expected = flightSpeciesByType[type].slice().sort();
  assert.deepEqual(sequence.slice(0, 3).sort(), expected, `${type}: first shuffle bag must contain every species exactly once`);
  assert.deepEqual(sequence.slice(3, 6).sort(), expected, `${type}: refilled shuffle bag must contain every species exactly once`);
  assert.notEqual(sequence[2], sequence[3], `${type}: the last species of one bag must not repeat at the next bag boundary`);
}
const preparedRuntimeVariant = runtimeFlightVariants.bird.find(variant => variant.id === flightVariantContract.prepared.id);
assert.ok(preparedRuntimeVariant, "prepared bird species must come from the runtime registry");
assert.equal(flightVariantContract.prepared.dataset, preparedRuntimeVariant.id, "prepared sprite species dataset drifted");
assert.equal(flightVariantContract.prepared.type, "bird", "prepared sprite type dataset drifted");
assert.equal(flightVariantContract.prepared.src, preparedRuntimeVariant.src, "prepared sprite source drifted");
assert.equal(flightVariantContract.prepared.width, preparedRuntimeVariant.width, "prepared sprite width drifted");
assert.equal(flightVariantContract.prepared.speedScale, preparedRuntimeVariant.speed, "prepared sprite speed drifted");

async function settleViewport(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function collectSceneMetrics(page) {
  return page.evaluate(() => {
    const before = (first, second) => Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
    const layerByDepth = {
      far: document.getElementById("jungleAnimalsFar"),
      mid: document.getElementById("jungleAnimalsMid"),
      near: document.getElementById("jungleAnimalsNear")
    };
    const layers = Object.values(layerByDepth).map(el => {
      const rect = el.getBoundingClientRect();
      return {
        id: el.id,
        display: getComputedStyle(el).display,
        pointer: getComputedStyle(el).pointerEvents,
        z: getComputedStyle(el).zIndex,
        top: rect.top,
        bottom: rect.bottom
      };
    });
    const groundTop = document.getElementById("groundT").getBoundingClientRect().top;
    const animalRects = Array.from(document.querySelectorAll(".jungle-animal-sprite")).map(el => {
      const rect = el.getBoundingClientRect();
      const layerRect = layerByDepth[el.dataset.animalDepth].getBoundingClientRect();
      const anchorY = Number(el.dataset.animalAnchorY);
      const style = getComputedStyle(el);
      const clippedTop = Math.max(rect.top, layerRect.top, 0);
      const clippedBottom = Math.min(rect.bottom, layerRect.bottom, innerHeight);
      return {
        id: el.dataset.animalId || "",
        role: el.dataset.animalRole || "",
        species: el.dataset.animalSpecies || "",
        anchor: el.dataset.animalAnchor || "",
        anchorY,
        anchorPx: rect.top + rect.height * anchorY / 100,
        opacity: Number(style.opacity),
        visibility: style.visibility,
        width: rect.width,
        height: rect.height,
        area: rect.width * rect.height,
        verticalVisibleRatio: Math.max(0, clippedBottom - clippedTop) / Math.max(1, rect.height),
        onScreen: style.visibility !== "hidden" && rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight && Number(style.opacity) > 0
      };
    });
    const habitatEl = document.getElementById("jungleHabitatBack");
    const habitatRect = habitatEl.getBoundingClientRect();
    const habitatStyle = getComputedStyle(habitatEl);
    const habitat = {
      display: habitatStyle.display,
      pointer: habitatStyle.pointerEvents,
      z: habitatStyle.zIndex,
      top: habitatRect.top,
      bottom: habitatRect.bottom,
      height: habitatRect.height,
      backgroundImage: habitatStyle.backgroundImage
    };
    const speciesBoxes = {};
    for (const animal of animalRects) {
      const box = speciesBoxes[animal.species] || { width: 0, height: 0, area: 0 };
      box.width = Math.max(box.width, animal.width);
      box.height = Math.max(box.height, animal.height);
      box.area = Math.max(box.area, animal.area);
      speciesBoxes[animal.species] = box;
    }
    const controls = Array.from(document.querySelectorAll("#homeBtn,#spkBtn,#helpBtn,.choice")).filter(el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    });
    const animalIntercepts = controls.map((control, index) => {
      const rect = control.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return {
        id: control.id || `choice-${index}`,
        animalIntercept: Boolean(hit && hit.closest(".jungle-animal-layer"))
      };
    }).filter(result => result.animalIntercept);
    const orderedLayers = [
      document.getElementById("jungleAnimalsFar"),
      document.getElementById("midT"),
      document.getElementById("jungleAnimalsMid"),
      document.getElementById("groundT"),
      document.getElementById("jungleAnimalsNear"),
      document.getElementById("jungleHabitatBack"),
      document.getElementById("world"),
      document.getElementById("fgT")
    ];
    return {
      layers,
      habitat,
      groundTop,
      animals: animalRects,
      speciesBoxes,
      visible: animalRects.filter(animal => animal.onScreen).length,
      count: animalRects.length,
      layerOrder: orderedLayers.every((layer, index) => index === orderedLayers.length - 1 || before(layer, orderedLayers[index + 1])),
      animalIntercepts,
      overflowX: document.documentElement.scrollWidth - innerWidth,
      overflowY: document.documentElement.scrollHeight - innerHeight,
      viewport: { width: innerWidth, height: innerHeight }
    };
  });
}

function assertGroundedScene(scene, label, expectedCount) {
  assert.equal(scene.count, expectedCount, `${label}: unexpected per-depth sprite cap`);
  assert.ok(scene.visible >= 4, `${label}: expected at least four naturally spaced wildlife sprites, got ${scene.visible}`);
  assert.ok(scene.visible <= 5, `${label}: fixed wildlife sequence exposed too many repeated sprites (${scene.visible})`);
  assert.ok(scene.layers.every(layer => layer.display === "block" && layer.pointer === "none"), `${label}: invalid layer state`);
  assert.deepEqual(scene.layers.map(layer => layer.z), ["1", "2", "3"]);
  const expectedClipPocket = scene.viewport.height * 0.005;
  assert.ok(Math.abs((scene.layers[2].bottom - scene.groundTop) - expectedClipPocket) <= 1, `${label}: near layer must leave a 0.5vh alpha-padding pocket below the ground line`);
  assert.equal(scene.habitat.display, "block", `${label}: habitat lip is not visible`);
  assert.equal(scene.habitat.pointer, "none", `${label}: habitat lip blocked a control`);
  assert.equal(scene.habitat.z, "3", `${label}: habitat lip must share the behind-station depth`);
  assert.ok(Math.abs(scene.habitat.bottom - scene.groundTop) <= 1, `${label}: habitat lip must end exactly at the 80vh ground-box top`);
  assert.ok(Math.abs(scene.habitat.height - scene.viewport.height * 0.14) <= 1, `${label}: habitat lip height drifted`);
  assert.match(scene.habitat.backgroundImage, /jungle_habitat_loop_whiteback_20260712\.webp/, `${label}: habitat art is missing`);
  assert.ok(scene.layerOrder, `${label}: animal/foliage/world layer order drifted`);
  assert.deepEqual(scene.animalIntercepts, [], `${label}: wildlife blocked a foreground control`);
  assert.ok(scene.overflowX <= 1 && scene.overflowY <= 1, `${label}: overflow detected`);
  assert.deepEqual([...new Set(scene.animals.map(animal => animal.species))].sort(), staticAnimals.slice().sort(), `${label}: runtime species metadata incomplete`);
  for (const animal of scene.animals) {
    const spec = layoutById[animal.id];
    assert.ok(spec, `${label}: ${animal.id || animal.species} has no layout contract`);
    const expectedAnchor = spec.species === "elephant" || spec.species === "giraffe" ? (spec.role === "hero" ? "ground" : "habitat") : expectedAnchorBySpecies[spec.species];
    assert.equal(animal.anchor, expectedAnchor, `${label}: ${animal.species} runtime anchor mismatch`);
    assert.ok(Number.isFinite(animal.anchorY), `${label}: ${animal.species} runtime anchorY missing`);
    assert.equal(animal.opacity, 1, `${label}: ${animal.species} is still translucent`);
    assert.ok(Math.abs(animal.anchorPx - scene.viewport.height * spec.y / 100) <= 1.1, `${label}: ${animal.id} anchor drifted from its habitat baseline`);
    if (animal.onScreen) {
      const minimumVisibleRatio = spec.layer === "near" ? spec.anchorY / 100 - 0.025 : 0.85;
      assert.ok(animal.verticalVisibleRatio >= minimumVisibleRatio, `${label}: ${animal.id} vertically clipped (${animal.verticalVisibleRatio.toFixed(3)})`);
    }
    if (animal.anchor === "ground" || animal.anchor === "understory") {
      assert.ok(Math.abs(animal.anchorPx - scene.groundTop) <= 1.1, `${label}: ${animal.species} feet/log float away from ground (${animal.anchorPx.toFixed(1)} vs ${scene.groundTop.toFixed(1)})`);
    }
  }
  const boxes = scene.speciesBoxes;
  assert.ok(boxes.giraffe.height >= boxes.elephant.height * 1.15, `${label}: giraffe must read clearly taller than elephant`);
}

async function alphaEdgeIsClear(image, threshold = 12) {
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + 3];
  for (let x = 0; x < info.width; x += 1) {
    if (alphaAt(x, 0) > threshold || alphaAt(x, info.height - 1) > threshold) return false;
  }
  for (let y = 0; y < info.height; y += 1) {
    if (alphaAt(0, y) > threshold || alphaAt(info.width - 1, y) > threshold) return false;
  }
  return true;
}

async function verifyFlightSheets() {
  const habitatInfo = await sharp(habitatPath).metadata();
  assert.equal(habitatInfo.format, "webp", "habitat loop must be WebP");
  assert.equal(habitatInfo.hasAlpha, true, "habitat loop must preserve transparent sky above its foliage lip");
  assert.deepEqual([habitatInfo.width, habitatInfo.height], [2048, 256], "habitat loop must retain its mirrored 8:1 runtime canvas");
  const habitatRaw = await sharp(habitatPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data: habitatPixels, info: habitatRawInfo } = habitatRaw;
  for (let y = 0; y < habitatRawInfo.height; y += 1) {
    for (let channel = 0; channel < habitatRawInfo.channels; channel += 1) {
      const first = habitatPixels[(y * habitatRawInfo.width) * habitatRawInfo.channels + channel];
      const last = habitatPixels[(y * habitatRawInfo.width + habitatRawInfo.width - 1) * habitatRawInfo.channels + channel];
      assert.equal(first, last, `habitat repeat seam differs at row ${y}, channel ${channel}`);
    }
  }
  let lowerOpaque = 0;
  const lowerStart = Math.floor(habitatRawInfo.height * 2 / 3);
  const lowerPixels = (habitatRawInfo.height - lowerStart) * habitatRawInfo.width;
  for (let y = lowerStart; y < habitatRawInfo.height; y += 1) {
    for (let x = 0; x < habitatRawInfo.width; x += 1) {
      if (habitatPixels[(y * habitatRawInfo.width + x) * habitatRawInfo.channels + 3] > 12) lowerOpaque += 1;
    }
  }
  assert.ok(lowerOpaque / lowerPixels >= 0.9, "habitat loop needs a continuous opaque lower lip to ground animal foliage");

  for (const [type, files] of Object.entries(flightFiles)) {
    for (const file of files) {
      const flightPath = path.join(root, "assets/images/nazonazo-tunnel", file);
      const info = await sharp(flightPath).metadata();
      assert.equal(info.format, "webp", `${file}: flight sheet must be WebP`);
      assert.equal(info.hasAlpha, true, `${file}: flight sheet must keep transparent surroundings`);
      assert.equal(info.width % 3, 0, `${file}: sheet width must divide into exactly three equal frames`);
      const frameWidth = info.width / 3;
      assert.ok(frameWidth >= 160 && info.height >= 160, `${file}: individual flight frames are unexpectedly small`);
      const expectedRatio = type === "birds" ? 4 / 3 : 1;
      assert.ok(Math.abs(frameWidth / info.height - expectedRatio) <= 0.02, `${file}: frame aspect ratio must match its runtime clip`);
      for (let frame = 0; frame < 3; frame += 1) {
        assert.equal(
          await alphaEdgeIsClear(sharp(flightPath).extract({ left: frame * frameWidth, top: 0, width: frameWidth, height: info.height })),
          true,
          `${file} frame ${frame + 1}: wing, beak, tail, or antenna is cropped`
        );
      }
    }
  }

  const elephantPath = path.join(root, "assets/images/nazonazo-tunnel", animalFiles.elephant);
  const elephantInfo = await sharp(elephantPath).metadata();
  assert.deepEqual([elephantInfo.width, elephantInfo.height], [1536, 512], "elephant must keep three equal trunk-pose cells");
  for (let frame = 0; frame < 3; frame += 1) {
    assert.equal(await alphaEdgeIsClear(sharp(elephantPath).extract({ left: frame * 512, top: 0, width: 512, height: 512 })), true, `elephant frame ${frame + 1}: body and surrounding foliage must not be cropped`);
  }

  const giraffePath = path.join(root, "assets/images/nazonazo-tunnel", animalFiles.giraffe);
  const giraffeInfo = await sharp(giraffePath).metadata();
  assert.deepEqual([giraffeInfo.width, giraffeInfo.height], [512, 768], "giraffe must retain a tall full-body canvas");
  assert.equal(await alphaEdgeIsClear(sharp(giraffePath)), true, "giraffe and surrounding foliage must not be cropped at either side");
}

async function runBrowser(browserName) {
  const { chromium, webkit } = require("playwright");
  const isIOS = browserName === "webkit-ios";
  const browserType = browserName.startsWith("webkit") ? webkit : chromium;
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    userAgent: isIOS
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
      : undefined
  });
  const page = await context.newPage();
  const errors = [];
  const failed = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("requestfailed", request => failed.push(`${request.method()} ${request.url()} ${request.failure() && request.failure().errorText}`));
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
  });
  const base = process.env.NAZONAZO_BASE_URL || "http://127.0.0.1:8765";
  await page.goto(`${base}/nazonazo-tunnel/?weather=clear#fast`, { waitUntil: "networkidle" });
  await page.locator("#startBtn").click();
  for (let i = 0; i < 5; i += 1) {
    const correct = page.locator('#quiz.show .choice[data-ok="1"]');
    await correct.waitFor({ state: "visible", timeout: 20000 });
    await correct.click();
    await page.waitForFunction(() => !document.getElementById("quiz").classList.contains("show"), null, { timeout: 5000 });
  }
  try {
    await page.waitForFunction(() => document.body.classList.contains("st-jungle"), null, { timeout: 70000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      bodyClass: document.body.className,
      locked: Boolean(window.__PONO_TIER_LOCKED__),
      sprites: document.querySelectorAll(".jungle-animal-sprite").length,
      quizShown: document.getElementById("quiz").classList.contains("show"),
      question: document.getElementById("qText").textContent,
      stamp: document.getElementById("stamp").textContent
    }));
    throw new Error(`${browserName}: jungle transition timeout ${JSON.stringify(diagnostic)} pageerrors=${JSON.stringify(errors)}`, { cause: error });
  }
  await page.waitForFunction(() => document.querySelectorAll(".jungle-animal-sprite").length > 0, null, { timeout: 20000 });
  assert.equal(await page.locator(".jungle-animal-sprite").count(), 9, `${browserName}: runtime did not build all nine wildlife placements`);
  await page.locator("#quiz.show").waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(() => Array.from(document.querySelectorAll(".jungle-animal-art")).every(img => img.complete && img.naturalWidth > 0), null, { timeout: 20000 });
  await page.waitForFunction(() => {
    const flights = Array.from(document.querySelectorAll(".jungle-flight"));
    return flights.length === 2 && flights.every(el => {
      const img = el.querySelector(".jungle-flight-sheet");
      return img && img.complete && img.naturalWidth > 0 && el.dataset.flightSpecies;
    });
  }, null, { timeout: 20000 });
  await page.waitForFunction(() => document.querySelectorAll(".jungle-flight.is-flying:not([hidden])").length === 2, null, { timeout: 20000 });

  const scene = await collectSceneMetrics(page);
  assertGroundedScene(scene, `${browserName} 844x390`, 9);

  const flights = await page.evaluate(() => Array.from(document.querySelectorAll(".jungle-flight")).map(el => {
    const img = el.querySelector(".jungle-flight-sheet");
    const style = getComputedStyle(el);
    const sheetStyle = getComputedStyle(img);
    const rect = el.getBoundingClientRect();
    return {
      type: el.classList.contains("jungle-flight-bird") ? "bird" : "butterfly",
      species: el.dataset.flightSpecies || "",
      file: img.src.split("/").pop().split("?")[0],
      display: style.display,
      pointer: style.pointerEvents,
      animationName: sheetStyle.animationName,
      sheetRatio: img.getBoundingClientRect().width / Math.max(1, rect.width),
      width: rect.width,
      height: rect.height
    };
  }));
  assert.deepEqual(flights.map(flight => flight.type).sort(), ["bird", "butterfly"], `${browserName}: exactly one bird and one butterfly flight sprite are required`);
  for (const flight of flights) {
    assert.ok(flightSpeciesByType[flight.type].includes(flight.species), `${browserName}: ${flight.type} exposed unknown species ${flight.species}`);
    assert.equal(flight.file, flightFileBySpecies[flight.species], `${browserName}: ${flight.species} dataset and three-frame sheet disagree`);
  }
  assert.ok(flights.every(flight => flight.display !== "none" && flight.pointer === "none"), `${browserName}: ambient flights must be visible but non-interactive`);
  assert.ok(flights.every(flight => flight.animationName && flight.animationName !== "none"), `${browserName}: flight animation is not running`);
  assert.ok(flights.every(flight => Math.abs(flight.sheetRatio - 3) <= 0.05), `${browserName}: flight sheets are not divided into three frames`);
  assert.ok(flights.every(flight => flight.width > 0 && flight.height > 0), `${browserName}: flight sprite has no rendered area`);

  const beforeMotion = await page.locator(".jungle-animal-art.motion-sway").first().evaluate(el => getComputedStyle(el).transform);
  await page.waitForTimeout(650);
  const afterMotion = await page.locator(".jungle-animal-art.motion-sway").first().evaluate(el => getComputedStyle(el).transform);
  assert.notEqual(beforeMotion, afterMotion, `${browserName}: animal micro-motion did not advance`);

  const viewports = [[390, 844], [740, 320], [844, 390], [1024, 768], [1366, 768]];
  for (const [width, height] of viewports) {
    await settleViewport(page, width, height);
    const fit = await page.evaluate(() => ({ x: document.documentElement.scrollWidth - innerWidth, y: document.documentElement.scrollHeight - innerHeight }));
    assert.ok(fit.x <= 1 && fit.y <= 1, `${browserName}: overflow at ${width}x${height}`);
    if (width === 1366 && height === 768) {
      const desktopScene = await collectSceneMetrics(page);
      assertGroundedScene(desktopScene, `${browserName} ${width}x${height}`, 9);
    }
  }
  await settleViewport(page, 844, 390);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await page.locator(".jungle-animal-art.motion-sway").first().evaluate(el => ({ name: getComputedStyle(el).animationName, transform: getComputedStyle(el).transform }));
  assert.equal(reduced.name, "none", `${browserName}: reduced-motion animation must stop`);
  assert.equal(reduced.transform, "none", `${browserName}: reduced-motion transform must be static`);
  const reducedFlights = await page.evaluate(() => Array.from(document.querySelectorAll(".jungle-flight-layer")).map(layer => getComputedStyle(layer).display));
  assert.deepEqual(reducedFlights, ["none", "none"], `${browserName}: reduced motion must hide both cross-screen flight sprites`);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await settleViewport(page, 930, 499);
  const screenshotScene = await collectSceneMetrics(page);
  assertGroundedScene(screenshotScene, `${browserName} 930x499`, 9);
  await page.screenshot({ path: `/tmp/nazonazo-jungle-animals-${browserName}.png`, fullPage: true });

  const hidden = await page.evaluate(() => {
    document.body.classList.add("tunnel-interior");
    return Array.from(document.querySelectorAll(".jungle-animal-layer")).every(el => getComputedStyle(el).display === "none") && getComputedStyle(document.getElementById("jungleHabitatBack")).display === "none";
  });
  assert.ok(hidden, `${browserName}: tunnel must hide animal and habitat layers`);
  assert.deepEqual(errors, [], `${browserName}: page errors\n${errors.join("\n")}`);
  assert.deepEqual(failed, [], `${browserName}: request failures\n${failed.join("\n")}`);
  const lockedContext = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const lockedPage = await lockedContext.newPage();
  const lockedAnimalRequests = [];
  lockedPage.on("request", request => {
    if (/\/jungle_(?:animal|flying|habitat)_[^/]+\.webp(?:\?|$)/.test(request.url())) lockedAnimalRequests.push(request.url());
  });
  await lockedPage.goto(`${base}/nazonazo-tunnel/?weather=clear#fast`, { waitUntil: "networkidle" });
  await lockedPage.locator("#ponoTierLockScreen").waitFor({ state: "visible", timeout: 10000 });
  assert.equal(await lockedPage.locator(".jungle-animal-sprite").count(), 0, `${browserName}: LP lock built app-only animals`);
  assert.equal(await lockedPage.locator(".jungle-flight").count(), 0, `${browserName}: LP lock built app-only flight variants`);
  assert.deepEqual(lockedAnimalRequests, [], `${browserName}: LP lock requested app-only animal assets`);
  await lockedContext.close();
  await browser.close();
}

(async () => {
  await verifyFlightSheets();
  if (process.env.NAZONAZO_BROWSER) {
    const requested = process.env.NAZONAZO_BROWSER.split(",").map(value => value.trim()).filter(Boolean);
    for (const browserName of requested) await runBrowser(browserName);
  }
  console.log(`nazonazo jungle animals regression: OK (${staticAnimals.length} resting assets, ${allFlightFiles.length} three-frame flights)`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
