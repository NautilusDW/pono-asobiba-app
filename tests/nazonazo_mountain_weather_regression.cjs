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
assert.match(css, /\.weather-rain-layer::before\{[^}]*inset:-100px -70px/, "rain planes must only overscan their maximum tile movement");
assert.doesNotMatch(css, /\.weather-rain-layer\{[^}]*will-change:/, "the full viewport rain wrappers must not become permanent compositor layers");
assert.equal((html.match(/id="townHorizonLoop"[\s\S]*?<\/div>/)?.[0].match(/class="town-loop-tile"/g) || []).length, 4, "the hill panorama needs enough mirrored tiles");
assert.equal((html.match(/id="townMidLoop"[\s\S]*?<\/div>/)?.[0].match(/class="town-loop-tile"/g) || []).length, 4, "the near panorama needs enough mirrored tiles");
assert.match(css, /\.town-loop-tile\{[^}]*overflow:hidden/, "tile layout boxes must stay fixed at every panorama join");
assert.match(css, /\.town-loop-tile::before\{[^}]*inset:-1px[^}]*background-size:cover/, "panorama artwork must overscan each fixed tile by one pixel without changing its aspect ratio");
assert.match(css, /\.town-loop-tile:nth-child\(even\)::before\{transform:scaleX\(-1\)\}/, "only the artwork inside alternate tiles may mirror so WebKit cannot move the layout boundary");
assert.doesNotMatch(css, /\.town-loop-tile:nth-child\(even\)\{transform:/, "mirroring the tile element itself creates fractional WebKit gaps");
assert.match(css, /body\.st-town #horizon,body\.st-town #midT\{background-image:none!important\}/, "town must use the mirrored strips instead of the old hard seams");
assert.doesNotMatch(css, /#town(?:Horizon|Mid)Loop[^}]*background-size:\s*100%\s+100%/, "panorama aspect ratios must not be stretched");
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.weather-rain-layer::before\{animation:none!important/, "reduced motion must not turn rain into a fast flicker");
assert.match(game, /id:"town"[^\n]+skyPosition:"center calc\(100% - 8vh\)"/, "the baked mountains must be raised without stretching the sky");
assert.match(game, /loop===0&&stage&&stage\.id==="town"\?"rain":"clear"/, "only loop-zero town should rain in normal play");
assert.match(game, /debug\.isAllowed\(\)/, "weather overrides must stay behind the existing debug gate");
assert.match(game, /value==="rain"\|\|value==="clear"/, "tests must be able to force rain or clear weather without a child-facing control");
assert.match(game, /townMidLoop\.style\.transform="translate3d\("\+\(-loopOffset\)/, "the near mirrored strip must follow parallax motion");
assert.match(game, /const period=tileWidth\*2;/, "the near panorama must wrap only after one original-plus-mirror pair");
assert.match(game, /%period\+period\)%period/, "the near panorama offset must stay inside its seamless pair");
assert.match(css, /from\{transform:translate3d\(calc\(var\(--rain-x\) \* \.5\),calc\(var\(--rain-y\) \* -\.5\),0\)\}[\s\S]*to\{transform:translate3d\(calc\(var\(--rain-x\) \* -\.5\),calc\(var\(--rain-y\) \* \.5\),0\)\}/, "rain must move by exactly one repeated tile so the animation reset cannot jump");
assert.doesNotMatch(css, /#rainFar::before\{[^}]*filter:/, "the oversized far-rain plane must avoid an iOS-expensive full-screen filter");
assert.doesNotMatch(css, /#world(?:,|\{)[^}]*filter:/, "the multi-thousand-vw world container must never receive one giant group filter");
assert.match(css, /#world>\.tun[^}]*[\s\S]*filter:brightness\(\.7\)/, "bounded town scenery should still darken in rain");

async function verifyPanoramaAssets() {
  for (const [name, expectedRatio] of [["town_horizon_layer_20260703.webp", 1983 / 793], ["town_mid_layer_20260703.webp", 1774 / 887]]) {
    const info = await sharp(path.join(root, "assets/images/nazonazo-tunnel", name)).metadata();
    assert.ok(info.hasAlpha, `${name} must retain its transparent upper area`);
    assert.ok(Math.abs((info.width / info.height) - expectedRatio) < 0.002, `${name} aspect ratio changed unexpectedly`);
  }
}

verifyPanoramaAssets()
  .then(() => console.log("nazonazo mountain/weather regression: PASS"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
