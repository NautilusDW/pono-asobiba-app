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

function extractFunction(source, name) {
  const match = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(source);
  assert.ok(match, `${name}: function missing`);
  const open = source.indexOf("{", match.index);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(match.index, index + 1);
    }
  }
  assert.fail(`${name}: function is not closed`);
}

function cssRule(selectorPattern) {
  const match = new RegExp(`${selectorPattern}\\s*\\{([^}]+)\\}`).exec(css);
  assert.ok(match, `CSS rule missing: ${selectorPattern}`);
  return match[1];
}

assert.match(html, /styles\.css\?v=20260713-1271/);
assert.match(html, /js\/game\.js\?v=20260713-1271/);
assert.match(html, /id="futureRailLayer"[^>]*role="group"[^>]*aria-labelledby="qText"[^>]*hidden/);
assert.equal((html.match(/id="futureHorizonLoop"[\s\S]*?<\/div>/)?.[0].match(/class="future-loop-tile"/g) || []).length, 4);
assert.equal((html.match(/id="futureMidLoop"[\s\S]*?<\/div>/)?.[0].match(/class="future-loop-tile"/g) || []).length, 4);
assert.equal((html.match(/id="futureForegroundLoop"[\s\S]*?<\/div>/)?.[0].match(/class="future-loop-tile"/g) || []).length, 8);

assert.match(game, /future:\{[\s\S]{0,650}horizon:"\.\.\/assets\/images\/nazonazo-tunnel\/future_city_horizon_cutout_loop_20260712\.webp"/);
assert.match(game, /future:\{[\s\S]{0,650}mid:"\.\.\/assets\/images\/nazonazo-tunnel\/future_city_mid_cutout_loop_20260712\.webp"/);
assert.match(game, /future:\{[\s\S]{0,650}station:"\.\.\/assets\/images\/nazonazo-tunnel\/future_city_station_checkpoint_20260712\.webp"/);
assert.doesNotMatch(game, /future_city_(?:horizon|mid)_loop_long_20260707\.webp/, "the baked rectangular seams must not remain active");

const defaultSteer = cssRule("(?:^|\\n)\\.vehicle-steer-shell");
assert.match(defaultSteer, /transform\s*:\s*none/, "non-sea locomotives must ignore stale submarine offsets");
assert.doesNotMatch(defaultSteer, /--sea-steer-[xy]/);
const seaSteer = cssRule("body\\.st-sea \\.vehicle-steer-shell");
assert.match(seaSteer, /translate3d\([^;]*--sea-steer-x[^;]*--sea-steer-y/);
const adminArm = extractFunction(game, "nazonazoAdminPreviewArm");
assert.match(adminArm, /resetSeaInteraction\(\);clearFutureRailGame\(\);/, "admin sea → future switching must clear the submarine transform before repaint");

assert.match(css, /body\.st-future #horizon\{[^}]*opacity:1[^}]*mask-image:none/);
assert.match(css, /body\.st-future #midT\{[^}]*opacity:1[^}]*mask-image:none/);
assert.doesNotMatch(css, /body\.st-future #midT\{[^}]*opacity:\.94/);
assert.match(css, /\.future-loop-tile:nth-child\(even\)::before\{transform:scaleX\(-1\)\}/);
assert.doesNotMatch(css, /\.future-loop-tile:nth-child\(even\)\{[^}]*transform/, "mirror artwork, not the layout box");
assert.match(css, /#futureHorizonLoop\{bottom:17\.2vh;height:68vh\}/);
assert.match(css, /#futureMidLoop\{bottom:17\.2vh;height:56vh\}/);
assert.match(css, /body\.st-future \.tun\.station\.future-station\{[^}]*bottom:15\.2vh[^}]*aspect-ratio:2102\/492/);

for (const [name, value] of [
  ["FUTURE_HORIZON_PARALLAX", ".10"],
  ["FUTURE_MID_PARALLAX", ".32"],
  ["FUTURE_FOREGROUND_PARALLAX", "1.12"]
]) {
  assert.match(game, new RegExp(`${name}=${value.replace(".", "\\.")}`));
}
const render = extractFunction(game, "render");
assert.match(render, /st-future[\s\S]{0,800}FUTURE_HORIZON_PARALLAX/);
assert.match(render, /st-future[\s\S]{0,800}FUTURE_MID_PARALLAX/);
assert.match(render, /futureForegroundLoop[\s\S]{0,500}FUTURE_FOREGROUND_PARALLAX/);
assert.match(render, /const period=tileWidth\*2/);
assert.match(render, /%period\+period\)%period/, "future offsets must wrap instead of stopping");
assert.doesNotMatch(render.match(/st-future[\s\S]{0,900}futureHorizonLoop/)?.[0] || "", /clamp\([^)]*,0,70\)/, "future horizon must not use the old 70vw cap");

const questionOptions = extractFunction(game, "futureQuestionOptions");
const sandbox = { shuffle: values => values.slice().reverse() };
vm.createContext(sandbox);
vm.runInContext(`${questionOptions};this.futureQuestionOptions=futureQuestionOptions;`, sandbox);
const options = sandbox.futureQuestionOptions({
  a: ["✅", "せいかい"],
  d: [["1️⃣", "ひとつ"], ["2️⃣", "ふたつ"], ["3️⃣", "みっつ"]]
});
assert.equal(options.length, 2);
assert.equal(options.filter(option => option.ok).length, 1);
assert.equal(options.filter(option => !option.ok).length, 1);

const futureRender = extractFunction(game, "renderFutureRailGame");
assert.match(futureRender, /futureQuestionOptions\(cur\)/);
assert.match(futureRender, /document\.createElementNS\("http:\/\/www\.w3\.org\/2000\/svg","svg"\)/);
assert.match(futureRender, /button\.className="choice future-rail-home"/);
assert.match(futureRender, /pointerdown/);
assert.match(futureRender, /pointermove/);
assert.match(futureRender, /futureReducedMotion\(\)\|\|event\.detail===0/);
assert.match(extractFunction(game, "futureRailPointerMove"), /finishFutureRailRoute\(futureRailRoute\)/);
assert.match(extractFunction(game, "finishFutureRailRoute"), /onPick\(entry\.button,\{ok:entry\.o\.ok,mode:"future"\}\)/);
assert.match(extractFunction(game, "onPick"), /classList\.contains\("sea-answer-bubble"\)\|\|el\.classList\.contains\("future-rail-home"\)\|\|el\.classList\.contains\("space-answer-star"\)\)el\.disabled=true/, "wrong future and space targets must leave the keyboard tab order before retry");
const futureKeyHandler = extractFunction(game, "handleFutureRailKeyDown");
assert.match(futureKeyHandler, /ArrowUp/);
assert.match(futureKeyHandler, /ArrowDown/);
assert.match(futureKeyHandler, /Enter/);
assert.match(futureKeyHandler, /target\.matches\("button,a,input,select,textarea,\[contenteditable='true'\]"\)/, "answer keys must not hijack the sound, help, or navigation buttons");
const keyCalls = [];
const keySandbox = {
  futureRailPlayable: () => true,
  futureRailOptions: [],
  futureKeyboardRoute: 0,
  futureRailGuide() {},
  selectFutureRailRoute(index) { keyCalls.push(index); }
};
vm.createContext(keySandbox);
vm.runInContext(`${futureKeyHandler};this.handleFutureRailKeyDown=handleFutureRailKeyDown;`, keySandbox);
let outsidePrevented = false;
keySandbox.handleFutureRailKeyDown({
  key: "Enter",
  repeat: false,
  defaultPrevented: false,
  target: { closest: () => null, matches: selector => selector.includes("button") },
  preventDefault() { outsidePrevented = true; }
});
assert.equal(outsidePrevented, false, "Enter on help or sound controls must retain native activation");
assert.deepEqual(keyCalls, [], "Enter on controls outside the rail board must not choose an answer");
assert.match(extractFunction(game, "showQuiz"), /isFutureStage\(\)\)renderFutureRailGame\(\)/);
assert.match(extractFunction(game, "activeChoiceButtons"), /future-rail-home/);
assert.match(extractFunction(game, "useHelp"), /isFutureStage\(\)\)resetFutureRailTrace\(\)/);

const boardRule = cssRule("\\.future-rail-board");
assert.match(boardRule, /touch-action\s*:\s*none/);
assert.match(boardRule, /pointer-events\s*:\s*auto/);
const homeRule = cssRule("\\.future-rail-home");
assert.match(homeRule, /width\s*:\s*clamp\(100px,17vw,160px\)/);
assert.match(homeRule, /min-height\s*:\s*clamp\(62px,14vh,92px\)/);
assert.match(css, /\.future-rail-home:active\{transform:translate\(-50%,-50%\)!important\}/, "pressed homes must not jump away from their route endpoints");
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.future-rail-glow[^}]*animation:none!important/);
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.future-rail-home\.glow,\.future-rail-home\.ng\{animation:none!important\}/);

const assets = [
  ["future_city_horizon_cutout_loop_20260712.webp", 2096, 594, 0.94],
  ["future_city_mid_cutout_loop_20260712.webp", 2136, 532, 0.94],
  ["future_city_station_checkpoint_20260712.webp", 2102, 492, 0.70]
];

(async () => {
  for (const [file, width, height, opaqueRatio] of assets) {
    const absolute = path.join(root, "assets/images/nazonazo-tunnel", file);
    assert.ok(fs.existsSync(absolute), `${file}: missing`);
    assert.ok(fs.statSync(absolute).size < 3 * 1024 * 1024, `${file}: exceeds 3MB`);
    const image = sharp(absolute);
    const metadata = await image.metadata();
    assert.equal(metadata.width, width, `${file}: unexpected width`);
    assert.equal(metadata.height, height, `${file}: unexpected height`);
    assert.equal(metadata.channels, 4, `${file}: alpha channel required`);
    const { data } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0;
    let opaque = 0;
    let partial = 0;
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] === 0) transparent += 1;
      else if (data[index] === 255) opaque += 1;
      else partial += 1;
    }
    assert.ok(transparent > 0, `${file}: background was not removed`);
    assert.ok(opaque / (opaque + partial) >= opaqueRatio, `${file}: painted subjects became too transparent`);
  }
  console.log("nazonazo future city regression: PASS");
})().catch(error => {
  console.error(error);
  process.exit(1);
});
