"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "nazonazo-tunnel/index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "nazonazo-tunnel/styles.css"), "utf8");
const game = fs.readFileSync(path.join(root, "nazonazo-tunnel/js/game.js"), "utf8");

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
assert.match(css, /\.town-loop-tile\{[^}]*overflow:hidden/, "tile layout boxes must stay fixed at every panorama join");
assert.match(css, /\.town-loop-tile::before\{[^}]*inset:-1px[^}]*background-size:cover/, "panorama artwork must overscan each fixed tile by one pixel without changing its aspect ratio");
assert.match(css, /\.town-loop-tile:nth-child\(even\)::before\{transform:scaleX\(-1\)\}/, "only the artwork inside alternate tiles may mirror so WebKit cannot move the layout boundary");
assert.doesNotMatch(css, /\.town-loop-tile:nth-child\(even\)\{transform:/, "mirroring the tile element itself creates fractional WebKit gaps");
assert.match(css, /body\.st-town #horizon,body\.st-town #midT\{background-image:none!important\}/, "town must use the mirrored strips instead of the old hard seams");
assert.doesNotMatch(css, /#town(?:Horizon|Mid)Loop[^}]*background-size:\s*100%\s+100%/, "panorama aspect ratios must not be stretched");
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.rain-particle\{[^}]*animation:none!important/, "reduced motion must leave a small static rain sample instead of fast flicker");
assert.match(css, /#rainFar \.rain-particle:nth-child\(n\+8\),#rainMid \.rain-particle:nth-child\(n\+6\),#rainNear \.rain-particle:nth-child\(n\+4\)\{display:none\}/, "reduced motion must cap visible drops at seven, five, and three");
assert.match(css, /\.rain-particle\[hidden\]\{display:none\}/, "inactive pooled particles must not render");
assert.match(css, /--town-sky-lift:42vh/, "the baked far mountain must move substantially higher on regular screens");
assert.match(css, /#townHorizonLoop\{top:-50vh;height:124%\}/, "the second-farthest mountain must rise another twelve viewport-height units without rescaling its seamless tiles");
assert.match(css, /@media \(min-aspect-ratio:2\/1\)\{:root\{--town-sky-lift:34vh\}\}/, "ultrawide screens must retain more sky while lifting the far mountain by the same amount");
assert.match(game, /id:"town"[^\n]+skyPosition:"center calc\(100% - var\(--town-sky-lift,42vh\)\)"/, "the sky asset must use the responsive mountain lift without stretching");
assert.match(game, /skyA\.style\.backgroundColor=st\.id==="town"\?"#c7d659":"transparent";/, "the strongly raised town sky needs a sampled meadow fallback behind transparent hill valleys");
for (const [stage, height] of [["town", "17"], ["jungle", "16.5"], ["number", "17"], ["future", "17.4"]]) {
  assert.match(css, new RegExp(`body\\.st-${stage} #groundT\\{height:${height.replace(".", "\\.")}vh`), `${stage}: the train track must move upward without exposing a gap below it`);
}
assert.match(css, /body\.st-town\.v-train #cars,[^}]+\{bottom:9\.8vh\}/, "train-stage passenger cars must rise with the running rail");
assert.match(css, /body\.st-town\.v-train #veh,[^}]+\{bottom:9\.8vh\}/, "the locomotive must rise with the running rail");
assert.match(game, /function trainBottomVh\(\)\{[\s\S]*?\?9\.8:9\.1;/, "passenger animations must target the raised train baseline");
assert.match(css, /\.decor\.town-decor\{bottom:14\.2vh\}/, "town scenery must remain rooted at the raised ground edge");
assert.match(css, /body\.st-town \.tun\.station,body\.st-jungle \.tun\.station\{bottom:10\.15vh\}/, "station platforms must rise with the running rail");
assert.match(css, /body\.st-town \.dropStation,[^}]+\{bottom:10\.25vh\}/, "drop-off platforms must rise with the running rail");
assert.match(game, /const JOURNEY_SHOWER_CHANCE=\.25;/, "exactly one quarter of new journeys may contain town showers");
assert.match(game, /const SHOWER_FIRST_DELAY_MS=\[2500,6000\];/, "a selected journey must start clear before its first shower");
assert.match(game, /const SHOWER_RAIN_DURATION_MS=\[6000,10000\];/, "rain must stop after a bounded random duration");
assert.match(game, /const SHOWER_CLEAR_DURATION_MS=\[12000,20000\];/, "successive showers must have a substantial clear gap");
assert.match(game, /function weatherForStage\(stage\)\{\s*if\(!stage\|\|stage\.id!=="town"\)return "clear";/, "weather must remain clear outside the town scenery");
assert.match(game, /debug\.isAllowed\(\)/, "weather overrides must stay behind the existing debug gate");
assert.match(game, /value==="rain"\|\|value==="clear"/, "tests must be able to force rain or clear weather without a child-facing control");
assert.match(game, /townMidLoop\.style\.transform="translate3d\("\+\(-loopOffset\)/, "the near mirrored strip must follow parallax motion");
assert.match(game, /const period=tileWidth\*2;/, "the near panorama must wrap only after one original-plus-mirror pair");
assert.match(game, /%period\+period\)%period/, "the near panorama offset must stay inside its seamless pair");
assert.match(css, /@keyframes rainParticleFall\{\s*from\{transform:translate3d\(0,0,0\) rotate\(var\(--rain-angle\)\)\}\s*to\{transform:translate3d\(var\(--rain-drift\),150vh,0\) rotate\(var\(--rain-angle\)\)\}\s*\}/, "particles must fall with transform-only movement outside both viewport edges");
assert.match(game, /const RAIN_PARTICLE_PROFILES=\[[\s\S]*depth:"far"[\s\S]*depth:"mid"[\s\S]*depth:"near"/, "rain must keep distinct far, middle, and near particle profiles");
assert.match(game, /layer\.replaceChildren\(fragment\)/, "particle pool construction must replace instead of append");
assert.equal((game.match(/buildRainParticles\(false\);/g) || []).length, 1, "particle pools must be initialized exactly once outside applySkin");
assert.equal((game.match(/addEventListener\("resize",scheduleRainParticleRebuild/g) || []).length, 1, "particle resizing must register exactly one listener");
assert.match(game, /addEventListener\("pageshow",\(\)=>\{ensureAC\(\);updateRainParticleVisibility\(false\);\}\)/, "BFCache restore must refresh particle visibility without rebuilding");
assert.match(game, /addEventListener\("pagehide",\(\)=>\{hideWeatherNotice\(\);clearTimeout\(rainParticleResizeTimer\);safeSuspend\(\);\}\)/, "pagehide must clear both the weather notice and pending resize callback");
assert.doesNotMatch(game.slice(game.indexOf("function applySkin("), game.indexOf("function buildWorld(")), /buildRainParticles|scheduleRainParticle/, "skin changes must never rebuild particle DOM");
assert.match(game, /if\(window\.__PONO_TIER_LOCKED__\)/, "locked LP views must not create hidden particle work");
assert.doesNotMatch(css, /#world(?:,|\{)[^}]*filter:/, "the multi-thousand-vw world container must never receive one giant group filter");
assert.match(css, /#world>\.tun[^}]*[\s\S]*filter:brightness\(\.7\)/, "bounded town scenery should still darken in rain");

async function verifyPanoramaAssets() {
  for (const [name, expectedRatio] of [["town_horizon_layer_20260703.webp", 1983 / 793], ["town_mid_layer_20260703.webp", 1774 / 887]]) {
    const info = await sharp(path.join(root, "assets/images/nazonazo-tunnel", name)).metadata();
    assert.ok(info.hasAlpha, `${name} must retain its transparent upper area`);
    assert.ok(Math.abs((info.width / info.height) - expectedRatio) < 0.002, `${name} aspect ratio changed unexpectedly`);
  }

  const horizonPath = path.join(root, "assets/images/nazonazo-tunnel", "town_horizon_layer_20260703.webp");
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
  const opaqueScreenStart = -50 + 124 * (opaqueTailStart / info.height);
  const horizonBottom = -50 + 124;
  const regularSkyBottom = 100 - 42;
  const ultrawideSkyBottom = 100 - 34;
  assert.ok(opaqueScreenStart <= regularSkyBottom + 1, "the raised second mountain must become opaque before the regular far-sky bitmap ends");
  assert.ok(opaqueScreenStart <= ultrawideSkyBottom + 1, "the raised second mountain must cover the ultrawide far-sky bottom");
  assert.equal(horizonBottom, 74, "the second mountain must move upward without changing its 124vh scale");

  const midPath = path.join(root, "assets/images/nazonazo-tunnel", "town_mid_layer_20260703.webp");
  const { data: midData, info: midInfo } = await sharp(midPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rowCoverage = screenY => {
    const sourceY = Math.max(0, Math.min(midInfo.height - 1, Math.round(((screenY + 16) / 114) * (midInfo.height - 1))));
    let visible = 0;
    for (let x = 0; x < midInfo.width; x++) if (midData[(sourceY * midInfo.width + x) * midInfo.channels + 3] > 12) visible++;
    return visible / midInfo.width;
  };
  assert.ok(rowCoverage(horizonBottom) >= .5, "the existing middle panorama must cover at least half of the raised horizon bottom");
  assert.ok(rowCoverage(83) >= .9, "the existing middle panorama must cover the raised town ground approach");

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
