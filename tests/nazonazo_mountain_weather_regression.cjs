"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "nazonazo-tunnel/index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "nazonazo-tunnel/styles.css"), "utf8");
const game = fs.readFileSync(path.join(root, "nazonazo-tunnel/js/game.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

assert.match(html, /styles\.css\?v=20260714-1294/, "the current Nazonazo scenery and stage games must bypass stale CSS caches");
assert.match(html, /js\/game\.js\?v=20260714-1294/, "the current Nazonazo runtime must bypass stale game-script caches");
assert.ok(
  Number(sw.match(/const CACHE_VERSION = (\d+);/)?.[1]) >= 2151,
  "the current Nazonazo bundle must ship with at least its original service-worker generation",
);

function numericConstant(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9.]+)`));
  assert.ok(match, `${name} must remain a named numeric constant`);
  return Number(match[1]);
}

const townHorizonParallax = numericConstant(game, "TOWN_HORIZON_PARALLAX");
assert.equal(townHorizonParallax, 0.16, "the second-farthest town mountains must visibly scroll throughout the stage");
assert.ok(0 < townHorizonParallax && townHorizonParallax < 0.25 && 0.25 < 1,
  "town depth speeds must remain ordered as fixed sky < horizon < middle scenery < track");

const townLocalStops = Array.from({ length: 5 }, (_, index) => 320 + index * 430 - 24);
const townHorizonTravel = townLocalStops.map(localX => Number((localX * townHorizonParallax).toFixed(2)));
assert.deepEqual(townHorizonTravel, [47.36, 116.16, 184.96, 253.76, 322.56],
  "the town horizon must keep accumulating visible parallax at all five quiz stops");
const townHorizonLegTravel = townHorizonTravel.slice(1).map((value, index) => Number((value - townHorizonTravel[index]).toFixed(2)));
assert.deepEqual(townHorizonLegTravel, [68.8, 68.8, 68.8, 68.8],
  "every later town run must move the horizon instead of freezing after the second stop");
assert.ok(townHorizonTravel.every((value, index) => index === 0 || value > townHorizonTravel[index - 1]),
  "the horizon may never return to the old 70vw plateau during the five questions");

for (const id of ["rainFar", "rainMid", "weatherShade", "rainNear"]) {
  assert.match(html, new RegExp(`id="${id}"[^>]+aria-hidden="true"`), `${id} must remain decorative`);
}
assert.match(css, /\.weather-rain-layer\{[^}]*pointer-events:none/, "rain must never block child input");
assert.match(css, /\.weather-rain-layer\{[^}]*opacity:0;visibility:hidden/, "particle planes must stay hidden outside active rain");
assert.match(css, /\.rain-particle\{[^}]*pointer-events:none[^}]*animation:rainParticleFall[^}]*infinite paused/, "each decorative drop must be an independently paused particle by default");
assert.doesNotMatch(css, /\.weather-rain-layer\{[^}]*will-change:/, "the full viewport rain wrappers must not become permanent compositor layers");
assert.doesNotMatch(css, /\.weather-rain-layer::before|@keyframes rainTile|--rain-x|--rain-y/, "the old repeating-gradient rain tiles must be fully removed");
for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  if (rule[1].includes(".rain-particle")) {
    assert.doesNotMatch(rule[2], /(?:filter|backdrop-filter|box-shadow|mix-blend-mode)\s*:/, "particles must avoid per-drop compositing effects");
  }
}
assert.match(css, /body\.pono-game-ready\.weather-rain:not\(\.tunnel-interior\) \.weather-rain-layer\{visibility:visible;transition-delay:0s\}/, "ready rainy scenes must reveal the particle planes");
assert.match(css, /body\.pono-game-ready\.weather-rain:not\(\.tunnel-interior\) #rainFar\{opacity:\.82\}/, "far rain opacity must stay subtle");
assert.match(css, /body\.pono-game-ready\.weather-rain:not\(\.tunnel-interior\) #rainMid\{opacity:\.9\}/, "middle rain opacity must be stronger than far rain");
assert.match(css, /body\.pono-game-ready\.weather-rain:not\(\.tunnel-interior\) #rainNear\{opacity:\.96\}/, "near rain opacity must be strongest");
assert.match(css, /#weatherShade\{[^}]*pointer-events:none/, "the weather shade must never block scene interactions");
assert.match(css, /body\.pono-game-ready\.weather-rain:not\(\.tunnel-interior\) #weatherShade\{opacity:1\}/, "rain must still darken the scenery");
assert.match(css, /body\.pono-game-ready\.weather-rain:not\(\.tunnel-interior\) \.rain-particle\{animation-play-state:running;will-change:transform\}/, "rain may animate only on a ready, unlocked, rainy exterior screen");
assert.match(css, /body:not\(\.weather-rain\) \.rain-particle,body\.tunnel-interior \.rain-particle\{animation-play-state:paused;will-change:auto\}/, "clear weather and tunnels must pause particle work");
assert.match(css, /#rainFar\{z-index:1\}/, "far rain must stay behind middle scenery");
assert.match(css, /#rainMid\{z-index:6\}/, "middle rain must stay behind the train");
assert.match(css, /#rainNear\{z-index:9\}/, "near rain must pass in front of the train but behind UI");
assert.equal((html.match(/id="townHorizonLoop"[\s\S]*?<\/div>/)?.[0].match(/class="town-loop-tile"/g) || []).length, 4, "the hill panorama needs enough mirrored tiles");
assert.equal((html.match(/id="townMidLoop"[\s\S]*?<\/div>/)?.[0].match(/class="town-loop-tile"/g) || []).length, 4, "the near panorama needs enough mirrored tiles");
assert.equal((html.match(/id="jungleHorizonLoop"[\s\S]*?<\/div>/)?.[0].match(/class="jungle-loop-tile"/g) || []).length, 4, "the jungle horizon needs enough mirrored tiles for the full parallax run");
assert.match(css, /\.town-loop-tile\{[^}]*overflow:hidden/, "tile layout boxes must stay fixed at every panorama join");
assert.match(css, /\.town-loop-tile::before\{[^}]*inset:-1px[^}]*background-size:cover/, "panorama artwork must overscan each fixed tile by one pixel without changing its aspect ratio");
assert.match(css, /\.town-loop-tile:nth-child\(even\)::before\{transform:scaleX\(-1\)\}/, "only the artwork inside alternate tiles may mirror so WebKit cannot move the layout boundary");
assert.doesNotMatch(css, /\.town-loop-tile:nth-child\(even\)\{transform:/, "mirroring the tile element itself creates fractional WebKit gaps");
assert.match(css, /body\.st-town #horizon,body\.st-town #midT\{background-image:none!important\}/, "town must use the mirrored strips instead of the old hard seams");
assert.match(css, /body\.st-town #horizon\{width:100vw\}/, "the town horizon viewport must stay fixed while its mirrored artwork scrolls inside");
assert.doesNotMatch(css, /#town(?:Horizon|Mid)Loop[^}]*background-size:\s*100%\s+100%/, "panorama aspect ratios must not be stretched");
assert.match(css, /\.jungle-loop-tile\{[^}]*overflow:hidden/, "jungle horizon tile boxes must stay fixed at mirrored joins");
assert.match(css, /\.jungle-loop-tile::before\{[^}]*inset:-1px[^}]*background-size:cover[^}]*jungle_horizon_layer_whiteback_20260712_v2\.webp/, "the cleaned jungle horizon must overscan each fixed tile");
assert.match(css, /\.jungle-loop-tile:nth-child\(even\)::before\{transform:scaleX\(-1\)\}/, "alternate jungle artwork must mirror without moving its tile boundary");
assert.doesNotMatch(css, /\.jungle-loop-tile:nth-child\(even\)\{transform:/, "jungle mirroring must not move the tile layout box");
assert.match(css, /body\.st-jungle #horizon\{background-image:none!important\}/, "jungle must use the mirrored far-horizon strip instead of the non-repeating background");
assert.match(html, /id="jungleHabitatBack"[^>]+aria-hidden="true"[\s\S]*?id="world"/, "the habitat band must remain decorative and behind station world art");
assert.match(css, /#jungleHabitatBack\{[^}]*bottom:20vh;height:14vh;z-index:3;display:none;overflow:hidden[^}]*background-size:auto 100%;background-repeat:repeat-x;pointer-events:none/, "the habitat band must meet the raised ground without blocking play");
assert.match(css, /body\.st-jungle:not\(\.tunnel-interior\) #jungleHabitatBack\{display:block\}/, "the habitat band must appear only in the exterior jungle scene");
assert.match(css, /body\.tunnel-interior #jungleHabitatBack\{display:none!important\}/, "the habitat band must disappear inside the tunnel");
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.rain-particle\{[^}]*animation:none!important/, "reduced motion must leave a small static rain sample instead of fast flicker");
assert.match(css, /#rainFar \.rain-particle:nth-child\(n\+8\),#rainMid \.rain-particle:nth-child\(n\+6\),#rainNear \.rain-particle:nth-child\(n\+4\)\{display:none\}/, "reduced motion must cap visible drops at seven, five, and three");
assert.match(css, /\.rain-particle\[hidden\]\{display:none\}/, "inactive pooled particles must not render");
assert.match(css, /--town-sky-lift:42vh/, "the baked far mountain must move substantially higher on regular screens");
assert.match(css, /#townHorizonLoop\{top:-50vh;height:134%\}/, "the cleaned second mountain must extend below its raised position to meet the ground layers");
assert.match(css, /#townHorizonLoop \.town-loop-tile::before\{background-image:url\("\.\.\/assets\/images\/nazonazo-tunnel\/town_horizon_layer_whiteback_20260712_v2\.webp"\)\}/, "the town horizon must use the cleaned white-background-derived artwork");
assert.match(css, /#townMidLoop \.town-loop-tile::before\{background-image:url\("\.\.\/assets\/images\/nazonazo-tunnel\/town_mid_layer_whiteback_20260713_v3\.webp"\)\}/, "the town middle strip must use the cleaned internal-alpha artwork");
assert.match(css, /@media \(min-aspect-ratio:2\/1\)\{:root\{--town-sky-lift:34vh\}\}/, "ultrawide screens must retain more sky while lifting the far mountain by the same amount");
assert.match(game, /id:"town"[^\n]+skyPosition:"center calc\(100% - var\(--town-sky-lift,42vh\)\)"/, "the sky asset must use the responsive mountain lift without stretching");
assert.match(game, /id:"jungle"[^\n]+skyPosition:"center calc\(100% - 22vh\)"/, "the cloud-bearing farthest jungle backdrop must move substantially higher at every aspect ratio");
assert.match(game, /skyA\.style\.backgroundColor=st\.id==="town"\?"#c7d659":\(st\.id==="jungle"\?"#34793f":"transparent"\);/, "the raised town and jungle skies need sampled ground-color fallbacks behind their transparent layers");
assert.match(css, /#jungleHorizonLoop\{top:-46vh;height:126%\}/, "the second-farthest jungle mountains must move higher while keeping their rendered scale");
assert.match(css, /body\.st-jungle #midT\{background-size:auto 116%;background-position-y:-18vh\}/, "the third jungle canopy layer must keep its existing depth while only the two farthest layers rise");
for (const [stage, height] of [["town", "17"], ["jungle", "20"], ["number", "17"], ["future", "17.4"]]) {
  assert.match(css, new RegExp(`body\\.st-${stage} #groundT\\{height:${height.replace(".", "\\.")}vh`), `${stage}: the train track must move upward without exposing a gap below it`);
}
assert.match(css, /body\.st-town\.v-train #cars,[^}]+\{bottom:9\.8vh\}/, "train-stage passenger cars must rise with the running rail");
assert.match(css, /body\.st-town\.v-train #veh,[^}]+\{bottom:9\.8vh\}/, "the locomotive must rise with the running rail");
assert.match(css, /body\.st-jungle\.v-train #cars,body\.st-jungle\.v-train #veh\{bottom:13\.3vh\}/, "the jungle train and passenger car must share the newly raised rail baseline");
assert.match(game, /function trainBottomVh\(\)\{\s*const st=STAGES\[stg\];\s*if\(st&&st\.id==="jungle"\)return 13\.3;\s*return st&&\(st\.id==="town"\|\|st\.id==="number"\|\|st\.id==="future"\)\?9\.8:9\.1;\s*\}/, "passenger animations must target the stage-specific train baselines");
assert.match(css, /\.decor\.town-decor\{bottom:14\.2vh\}/, "town scenery must remain rooted at the raised ground edge");
assert.match(css, /\.decor\.jungle-decor\{bottom:17\.3vh/, "jungle station-line trees must rise with the running rail");
assert.match(css, /body\.st-town \.tun\.station,body\.st-jungle \.tun\.station\{bottom:10\.15vh\}/, "the shared station fallback baseline must remain stable");
assert.match(css, /body\.st-jungle \.tun\.station\.jungle-station\{bottom:14\.95vh\}/, "the jungle station platform must rise with the running rail");
assert.match(css, /body\.st-town \.dropStation,[^}]+\{bottom:10\.25vh\}/, "drop-off platforms must rise with the running rail");
assert.match(css, /body\.st-jungle \.dropStation\{bottom:13\.75vh\}/, "the jungle drop-off platform must share the raised scene baseline");
assert.match(game, /habitat:"\.\.\/assets\/images\/nazonazo-tunnel\/jungle_habitat_loop_whiteback_20260712\.webp"/, "the jungle skin must expose the dedicated habitat band asset");
assert.match(game, /if\(jungleHabitatBack\)jungleHabitatBack\.style\.backgroundImage=st\.id==="jungle"&&st\.assets&&st\.assets\.habitat\?bgUrl\(st\.assets\.habitat\):"none";/, "skin changes must connect and clear the habitat band deterministically");
assert.match(game, /jungleHabitatBack\.style\.backgroundPositionX=cssXFromVw\(-\(worldX-o\)\*\.92\)/, "the habitat band must follow its own near-background parallax speed");
assert.match(game, /const JOURNEY_SHOWER_CHANCE=\.25;/, "exactly one quarter of new journeys may contain town showers");
assert.match(game, /const SHOWER_FIRST_DELAY_MS=\[2500,6000\];/, "a selected journey must start clear before its first shower");
assert.match(game, /const SHOWER_RAIN_DURATION_MS=\[6000,10000\];/, "rain must stop after a bounded random duration");
assert.match(game, /const SHOWER_CLEAR_DURATION_MS=\[12000,20000\];/, "successive showers must have a substantial clear gap");
assert.match(game, /function weatherForStage\(stage\)\{\s*if\(!stage\|\|stage\.id!=="town"\)return "clear";/, "weather must remain clear outside the town scenery");
assert.match(game, /debug\.isAllowed\(\)/, "weather overrides must stay behind the existing debug gate");
assert.match(game, /value==="rain"\|\|value==="clear"/, "tests must be able to force rain or clear weather without a child-facing control");
assert.match(game, /townHorizonLoop=\$\("townHorizonLoop"\)/, "the moving town horizon strip must be connected to its DOM node");
const renderBlock = game.slice(game.indexOf("function render(now)"), game.indexOf("function setWheelPeriod("));
assert.match(renderBlock, /document\.body\.classList\.contains\("st-town"\)&&townHorizonLoop/, "the internal horizon loop must have a town-only render path");
assert.match(renderBlock, /horizon\.style\.transform="translate3d\(0(?:px)?,0(?:px)?,0\)"/, "town must keep the outer horizon viewport stationary");
assert.match(renderBlock, /\(window\.innerHeight\|\|390\)\*1\.34\*\(1983\/793\)/, "the horizon loop period must preserve the existing 134% height and source aspect ratio");
assert.match(renderBlock, /\(worldX-o\)\*TOWN_HORIZON_PARALLAX\*\(window\.innerWidth\|\|844\)\/100/, "the horizon must use stage-local distance and the dedicated 0.16 depth speed");
assert.match(renderBlock, /%\w*[Pp]eriod\+\w*[Pp]eriod\)%\w*[Pp]eriod/, "the horizon offset must wrap across an original-plus-mirror pair without negative phases");
assert.match(renderBlock, /IOS_DEVICE\?Math\.round\([^:]+\):Number\([^)]*\.toFixed\(2\)\)/, "the mirrored horizon movement must retain the existing iOS pixel rounding policy");
assert.match(renderBlock, /townHorizonLoop\.style\.transform="translate3d\("\+\(-\w+\)\+"px,0,0\)"/, "the internal mirrored horizon strip, not its viewport, must receive the parallax transform");
assert.match(game, /townMidLoop\.style\.transform="translate3d\("\+\(-loopOffset\)/, "the near mirrored strip must follow parallax motion");
assert.match(game, /const period=tileWidth\*2;/, "the near panorama must wrap only after one original-plus-mirror pair");
assert.match(game, /%period\+period\)%period/, "the near panorama offset must stay inside its seamless pair");
assert.match(css, /@keyframes rainParticleFall\{\s*from\{transform:translate3d\(0,0,0\) rotate\(var\(--rain-angle\)\)\}\s*to\{transform:translate3d\(var\(--rain-drift\),150vh,0\) rotate\(var\(--rain-angle\)\)\}\s*\}/, "particles must fall with transform-only movement outside both viewport edges");
assert.match(game, /const RAIN_PARTICLE_PROFILES=\[[\s\S]*depth:"far"[\s\S]*depth:"mid"[\s\S]*depth:"near"/, "rain must keep distinct far, middle, and near particle profiles");
assert.match(game, /layer\.replaceChildren\(fragment\)/, "particle pool construction must replace instead of append");
assert.equal((game.match(/buildRainParticles\(false\);/g) || []).length, 1, "particle pools must be initialized exactly once outside applySkin");
assert.equal((game.match(/addEventListener\("resize",scheduleRainParticleRebuild/g) || []).length, 1, "particle resizing must register exactly one listener");
assert.match(game, /addEventListener\("pageshow",\(\)=>\{closeGameSettings\(\);ensureAC\(\);updateRainParticleVisibility\(false\);\}\)/, "BFCache restore must close settings and refresh particle visibility without rebuilding");
assert.match(game, /addEventListener\("pagehide",\(\)=>\{closeGameSettings\(\);hideWeatherNotice\(\);pauseSeaInput\(\);clearTimeout\(rainParticleResizeTimer\);safeSuspend\(\);\}\)/, "pagehide must close settings and clear the weather notice, sea input, and pending resize callback");
assert.doesNotMatch(game.slice(game.indexOf("function applySkin("), game.indexOf("function buildWorld(")), /buildRainParticles|scheduleRainParticle/, "skin changes must never rebuild particle DOM");
assert.match(game, /if\(window\.__PONO_TIER_LOCKED__\)/, "locked LP views must not create hidden particle work");
assert.doesNotMatch(css, /#world(?:,|\{)[^}]*filter:/, "the multi-thousand-vw world container must never receive one giant group filter");
assert.match(css, /#world>\.tun[^}]*[\s\S]*filter:brightness\(\.7\)/, "bounded town scenery should still darken in rain");

async function verifyPanoramaAssets() {
  const cleanedPanoramas = [
    ["town_horizon_layer_whiteback_20260712_v2.webp", 1983 / 793],
    ["town_mid_layer_whiteback_20260713_v3.webp", 1774 / 887],
    ["jungle_horizon_layer_whiteback_20260712_v2.webp", 1700 / 933]
  ];
  for (const [name, expectedRatio] of cleanedPanoramas) {
    const info = await sharp(path.join(root, "assets/images/nazonazo-tunnel", name)).metadata();
    assert.ok(info.hasAlpha, `${name} must retain its transparent upper area`);
    assert.ok(Math.abs((info.width / info.height) - expectedRatio) < 0.002, `${name} aspect ratio changed unexpectedly`);

    const { data, info: rawInfo } = await sharp(path.join(root, "assets/images/nazonazo-tunnel", name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let partial = 0;
    let magentaPartial = 0;
    for (let offset = 0; offset < data.length; offset += rawInfo.channels) {
      const r = data[offset], g = data[offset + 1], b = data[offset + 2], a = data[offset + 3];
      if (a <= 0 || a >= 255) continue;
      partial++;
      if (r > g + 35 && b > g + 35) magentaPartial++;
    }
    assert.ok(partial > 0, `${name} must retain antialiased silhouette edges`);
    assert.ok(magentaPartial / partial < .01, `${name} must not restore the old purple chroma-key fringe`);
  }

  const horizonPath = path.join(root, "assets/images/nazonazo-tunnel", "town_horizon_layer_whiteback_20260712_v2.webp");
  const { data, info } = await sharp(horizonPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaqueTailStart = info.height;
  for (let y = info.height - 1; y >= 0; y--) {
    let rowOpaque = true;
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] !== 255) { rowOpaque = false; break; }
    }
    if (!rowOpaque) break;
    opaqueTailStart = y;
  }
  const opaqueScreenStart = -50 + 134 * (opaqueTailStart / info.height);
  const horizonBottom = -50 + 134;
  const regularSkyBottom = 100 - 42;
  const ultrawideSkyBottom = 100 - 34;
  assert.ok(opaqueScreenStart <= regularSkyBottom + 1, "the raised second mountain must become opaque before the regular far-sky bitmap ends");
  assert.ok(opaqueScreenStart <= ultrawideSkyBottom + 1, "the raised second mountain must cover the ultrawide far-sky bottom");
  assert.equal(horizonBottom, 84, "the extended second mountain must reach one viewport-height unit behind the town track");

  const midPath = path.join(root, "assets/images/nazonazo-tunnel", "town_mid_layer_whiteback_20260713_v3.webp");
  const { data: midData, info: midInfo } = await sharp(midPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rowCoverage = screenY => {
    const sourceY = Math.max(0, Math.min(midInfo.height - 1, Math.round(((screenY + 16) / 114) * (midInfo.height - 1))));
    let visible = 0;
    for (let x = 0; x < midInfo.width; x++) if (midData[(sourceY * midInfo.width + x) * midInfo.channels + 3] > 12) visible++;
    return visible / midInfo.width;
  };
  assert.ok(rowCoverage(horizonBottom) >= .5, "the existing middle panorama must cover at least half of the raised horizon bottom");
  assert.ok(rowCoverage(83) >= .9, "the existing middle panorama must cover the raised town ground approach");

  const jungleHorizonPath = path.join(root, "assets/images/nazonazo-tunnel", "jungle_horizon_layer_whiteback_20260712_v2.webp");
  const { data: jungleData, info: jungleInfo } = await sharp(jungleHorizonPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let jungleOpaqueTailStart = jungleInfo.height;
  for (let y = jungleInfo.height - 1; y >= 0; y--) {
    let rowOpaque = true;
    for (let x = 0; x < jungleInfo.width; x++) {
      if (jungleData[(y * jungleInfo.width + x) * jungleInfo.channels + 3] !== 255) { rowOpaque = false; break; }
    }
    if (!rowOpaque) break;
    jungleOpaqueTailStart = y;
  }
  const jungleOpaqueScreenStart = -46 + 126 * (jungleOpaqueTailStart / jungleInfo.height);
  const jungleHorizonBottom = -46 + 126;
  const jungleSkyBottom = 100 - 22;
  const jungleGroundTop = 100 - 20;
  assert.ok(jungleOpaqueScreenStart <= 42, "the lifted jungle horizon must become fully opaque above the middle of the screen");
  assert.equal(jungleHorizonBottom, jungleGroundTop, "the raised horizon must meet the jungle track without a vertical gap");
  assert.ok(jungleHorizonBottom >= jungleSkyBottom + 2, "the immediately-front horizon must overlap the raised cloud backdrop by two viewport-height units");

  const habitatPath = path.join(root, "assets/images/nazonazo-tunnel", "jungle_habitat_loop_whiteback_20260712.webp");
  const habitatMeta = await sharp(habitatPath).metadata();
  assert.equal(habitatMeta.width, 2048, "the habitat band must retain its long loop canvas");
  assert.equal(habitatMeta.height, 256, "the habitat band must retain its shallow grounding canvas");
  assert.ok(habitatMeta.hasAlpha, "the habitat band must keep openings for animals to peek through");
  const { data: habitatData, info: habitatInfo } = await sharp(habitatPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let x = 0; x < habitatInfo.width; x++) {
    assert.equal(habitatData[((habitatInfo.height - 1) * habitatInfo.width + x) * habitatInfo.channels + 3], 255, "the habitat band bottom edge must seal against the track across its full width");
  }

  const skyPath = path.join(root, "assets/images/nazonazo-tunnel", "town_sky_back_20260703.webp");
  const { data: skyData, info: skyInfo } = await sharp(skyPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const fallback = [0xc7, 0xd6, 0x59];
  const rowStart = (skyInfo.height - 1) * skyInfo.width * skyInfo.channels;
  const average = [0, 1, 2].map(channel => {
    let sum = 0;
    for (let x = 0; x < skyInfo.width; x++) sum += skyData[rowStart + x * skyInfo.channels + channel];
    return sum / skyInfo.width;
  });
  assert.ok(average.every((value, channel) => Math.abs(value - fallback[channel]) <= 18), `town fallback ${fallback} must stay close to the sky asset's bottom row ${average.map(value => value.toFixed(1))}`);
}

verifyPanoramaAssets()
  .then(() => console.log("nazonazo mountain/weather regression: PASS"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
