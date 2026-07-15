#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const html = read("nazonazo-tunnel/index.html");
const game = read("nazonazo-tunnel/js/game.js");
const css = read("nazonazo-tunnel/styles.css");
const registrySource = read("nazonazo-tunnel/data/quiz-art.js");

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(registrySource, sandbox, { filename: "quiz-art.js" });
const registry = sandbox.window.PonoNazonazoQuizArt;
assert.ok(registry && registry.items && registry.ui, "the illustration registry needs separate quiz and UI maps");

function assetPath(src) {
  const clean = String(src || "").split(/[?#]/, 1)[0];
  return clean.startsWith("/")
    ? path.join(root, clean)
    : path.resolve(root, "nazonazo-tunnel", clean);
}

function assertAsset(src, label) {
  assert.equal(typeof src, "string", `${label}: source must be a string`);
  assert.ok(src.length > 0, `${label}: source is empty`);
  const absolute = assetPath(src);
  assert.ok(fs.existsSync(absolute), `${label}: missing ${src}`);
  const bytes = fs.statSync(absolute).size;
  assert.ok(bytes > 0, `${label}: asset is empty`);
  assert.ok(bytes < 3 * 1024 * 1024, `${label}: asset exceeds 3MB`);
  return absolute;
}

/* Every non-answer illustration ID used by static and runtime UI must resolve. */
const requiredUiIds = [
  "pono", "owl", "sparkle", "touch", "fire", "help", "friends", "map", "home", "rainbow", "sprout",
  "trophy", "perfectMedal", "littleBird", "whiteDove", "hint", "book", "train", "rocket",
  "smartphone", "flower", "star", "rain", "umbrella", "earth", "cargo", "target", "city",
  "space", "master", "station", "rare", "stageTown", "stageJungle", "stageNumber", "stageSea",
  "stageFuture", "stageSpace"
];
for (const id of requiredUiIds) {
  assert.ok(Object.hasOwn(registry.ui, id), `missing UI illustration mapping: ${id}`);
  assertAsset(registry.ui[id], `ui.${id}`);
}

/* The ten missing motifs were generated as transparent 512px source illustrations. */
const generatedUiFiles = [
  "ui_adventure_map_20260714.webp",
  "ui_four_leaf_clover_20260714.webp",
  "ui_friend_group_20260714.webp",
  "ui_little_bird_20260714.webp",
  "ui_perfect_medal_20260714.webp",
  "ui_rainbow_20260714.webp",
  "ui_sprout_20260714.webp",
  "ui_touch_hand_20260714.webp",
  "ui_trophy_20260714.webp",
  "ui_white_dove_20260714.webp"
];
for (const file of generatedUiFiles) {
  const absolute = assertAsset(`../assets/images/nazonazo-tunnel/ui-art/${file}`, file);
  const probe = spawnSync("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height,pix_fmt", "-of", "json", absolute
  ], { encoding: "utf8" });
  assert.equal(probe.status, 0, `${file}: ffprobe failed: ${probe.stderr}`);
  const stream = JSON.parse(probe.stdout).streams?.[0];
  assert.equal(stream?.width, 512, `${file}: width changed`);
  assert.equal(stream?.height, 512, `${file}: height changed`);
  assert.match(stream?.pix_fmt || "", /a/i, `${file}: transparent alpha plane is missing`);
  const decoded = spawnSync("ffmpeg", [
    "-v", "error", "-i", absolute, "-frames:v", "1",
    "-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1"
  ], { maxBuffer: 2 * 1024 * 1024 });
  assert.equal(decoded.status, 0, `${file}: RGBA decode failed: ${decoded.stderr}`);
  const rgba = decoded.stdout;
  assert.equal(rgba.length, 512 * 512 * 4, `${file}: incomplete RGBA frame`);
  for (const offset of [3, 511 * 4 + 3, 511 * 512 * 4 + 3, rgba.length - 1]) {
    assert.equal(rgba[offset], 0, `${file}: a baked background reaches an outer corner`);
  }
  assert.ok(rgba.some((value, index) => index % 4 === 3 && value > 0), `${file}: illustration is fully transparent`);
}

/* Runtime-only collectible keys must resolve to art instead of becoming fallback glyphs. */
for (const key of [
  "🦋|ちょう", "🍀|よつば", "🐦|ことり", "🕊️|しろい はと", "🦜|にじいろ おうむ",
  "💯|ひゃくてんまん", "🐳|そらとぶ くじら", "🛸|なぞの ゆーふぉー", "☄️|おおながれぼし"
]) assertAsset(registry.items[key], `items.${key}`);

/* Static child-facing chrome contains image hosts, never platform-dependent pictographs. */
assert.doesNotMatch(html, /\p{Extended_Pictographic}/u, "static child-facing HTML must not render emoji glyphs");
for (const id of ["help", "friends", "map", "home", "pono", "hint", "book", "train", "rocket", "sprout", "flower", "star", "smartphone", "rainbow", "touch", "fire"]) {
  assert.match(html, new RegExp(`data-ui-art="${id}"`), `static UI is missing the ${id} image host`);
}
assert.match(html, /data\/quiz-art\.js\?v=20260714-1297/);
assert.match(html, /js\/game\.js\?v=20260716-1309/);
assert.match(html, /styles\.css\?v=20260716-1309/);

/* Every non-choice runtime route goes through the same generated/reused image renderers. */
const runtimeRoutes = [
  [/function hydrateStaticUiArt[\s\S]*?fillArtHolder\(holder,resolveUiArt\(id\)/, "static image hydration"],
  [/className="runEvent";b\.appendChild\(createQuizArt\(ev\[0\],ev\[1\]/, "journey collectibles"],
  [/function renderPassengerSeat[\s\S]*?createQuizArt\(c\.e,passengerLabel\(c\)/, "car passengers"],
  [/function boardPassenger[\s\S]*?createQuizArt\(passenger\.e,passengerLabel\(passenger\)/, "boarding flyer"],
  [/function maybeSpawnRare[\s\S]*?createQuizArt\(e,t,"rare-art"\)/, "rare friend"],
  [/function syncSeaCompanions[\s\S]*?createQuizArt\(friend\.e,passengerLabel\(friend\)/, "sea allies"],
  [/function startTunnelFriendGame[\s\S]*?createQuizArt\(friend\.e,friend\.t,"tunnel-friend-art"\)/, "tunnel silhouettes"],
  [/function updateHelpHud[\s\S]*?illustratedCounter\(helpBadge[\s\S]*?illustratedCounter\(helpBtn/, "help HUD"],
  [/function drawDots[\s\S]*?createUiArt\(STAGES\[stg\]\.art[\s\S]*?createUiArt\("star"/, "stage HUD"],
  [/function openMap[\s\S]*?createUiArt\(s\.art[\s\S]*?createUiArt\("star"/, "adventure map"],
  [/function openZukan[\s\S]*?createUiArt\(g\.art[\s\S]*?createQuizArt\(it\.e,it\.t,"ze",it\.img\)/, "friend book"],
  [/function renderQuizSpeaker[\s\S]*?cur\.helper\.request[\s\S]*?createUiArt\("pono"/, "quiz speaker"],
  [/function confetti[\s\S]*?createQuizArt\(item\[0\],item\[1\],"confetti-art"\)/, "celebration confetti"],
  [/function ending[\s\S]*?createUiArt\("trophy"[\s\S]*?createUiArt\("star"/, "ending score"],
  [/function showRainNotice[\s\S]*?illustratedText\(slow,"umbrella"[\s\S]*?illustratedText\(benefit,"star"/, "weather notice"]
];
for (const [pattern, label] of runtimeRoutes) assert.match(game, pattern, `${label}: image route missing`);
assert.match(game, /carBadge\.setAttribute\("aria-label","ともだち "\+realCount\+"にん"\)/,
  "the illustrated friend counter needs a spoken label");
assert.match(game, /helpBadge\.setAttribute\("aria-label","おたすけ "\+n\+"こ"\)/,
  "the illustrated help counter needs a spoken label");
assert.match(game, /helpBtn\.setAttribute\("aria-label","おたすけ "\+n\+"こ"\)/,
  "the help button needs to announce its remaining count");
assert.match(game, /image\.loading=holder\.dataset\.uiArtEager==="1"\?"eager":"lazy"/,
  "hidden overlay illustrations should stay lazy unless a first-open control explicitly opts in");
assert.match(game, /whiteSpace:"nowrap"[\s\S]{0,180}pointerEvents:"none"/,
  "pickup score feedback must not wrap on iPad landscape");

assert.match(game, /fallback\.textContent="\?"/, "failed art needs a neutral non-emoji fallback");
assert.doesNotMatch(game, /fallback\.textContent\s*=\s*(?:emoji|["']❓)/, "image failures must not restore emoji");
assert.match(game, /STATION_HELPERS\.map\(h=>\(\{e:h\.e,t:h\.name,img:h\.normal\}\)\)/,
  "station friends must keep their generated portrait in the friend book");

/* Child controls stay usable after replacing one-glyph emoji with real image boxes. */
assert.match(css, /#settingsBtn\{[^}]*width:56px[^}]*height:56px/);
assert.match(css, /\.settings-menu-item\{[^}]*min-height:52px/);
assert.match(css, /#spkBtn,#helpBtn\{[^}]*min-width:46px[^}]*min-height:46px/);
assert.match(css, /\.selBtn\{[^}]*min-height:46px/);
assert.match(css, /\.bigBtn\{[^}]*min-height:46px/);
assert.match(css, /#scoreHud #helpBadge \.hud-counter-art[^}]*width:24px[^}]*height:24px/,
  "collected item art must stay legible in the top HUD");
assert.match(css, /\.runEvent\{[^}]*width:clamp\(48px/);
assert.match(css, /\.rare\{[^}]*width:clamp\(54px/);
assert.match(css, /\.ui-art-image\{[^}]*object-fit:contain/);

console.log(`nazonazo UI illustration regression: PASS (${requiredUiIds.length} UI routes, ${generatedUiFiles.length} generated assets)`);
