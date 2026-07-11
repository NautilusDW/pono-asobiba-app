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
assert.match(css, /--town-sky-lift:30vh/, "the baked far mountain must move decisively higher on regular screens");
assert.match(css, /#townHorizonLoop\{top:-38vh;height:124%\}/, "the next mountain layer must rise to its last gap-safe position");
assert.match(css, /@media \(min-aspect-ratio:2\/1\)\{:root\{--town-sky-lift:22vh\}\}/, "ultrawide screens must retain more of the sky and clouds");
assert.match(game, /id:"town"[^\n]+skyPosition:"center calc\(100% - var\(--town-sky-lift,30vh\)\)"/, "the sky asset must use the responsive mountain lift without stretching");
assert.match(game, /const JOURNEY_RAIN_CHANCE=\.5;/, "new journeys must use an even clear-or-rain draw");
assert.match(game, /if\(!stage\|\|stage\.id!=="town"\)return "clear";\s*return forcedWeather\(\)\|\|journeyWeather;/, "the drawn weather must stay stable in town without leaking into later scenery");
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
assert.match(game, /addEventListener\("pagehide",\(\)=>\{clearTimeout\(rainParticleResizeTimer\);safeSuspend\(\);\}\)/, "pagehide must clear the pending resize callback");
assert.doesNotMatch(game.slice(game.indexOf("function applySkin()"), game.indexOf("function buildWorld(")), /buildRainParticles|scheduleRainParticle/, "skin changes must never rebuild particle DOM");
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
  const opaqueScreenStart = -38 + 124 * (opaqueTailStart / info.height);
  const horizonBottom = -38 + 124;
  assert.ok(opaqueScreenStart <= 70, `the fully opaque panorama tail must cover the raised regular sky bottom (starts at ${opaqueScreenStart.toFixed(2)}vh)`);
  assert.ok(opaqueScreenStart <= 78, "the fully opaque panorama tail must cover the ultrawide sky bottom");
  assert.ok(horizonBottom >= 85, "the raised panorama must still overlap the town ground");
}

verifyPanoramaAssets()
  .then(() => console.log("nazonazo mountain/weather regression: PASS"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
