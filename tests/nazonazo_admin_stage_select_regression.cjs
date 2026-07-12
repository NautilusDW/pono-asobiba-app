"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const admin = read("admin/index.html");
const html = read("nazonazo-tunnel/index.html");
const game = read("nazonazo-tunnel/js/game.js");
const styles = read("nazonazo-tunnel/styles.css");
const worker = read("src/worker.js");
const sw = read("sw.js");

function parseInlineScripts(label, source, expectedCount) {
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;
  while ((match = re.exec(source))) {
    if (/\bsrc=/.test(match[1])) continue;
    count++;
    new vm.Script(match[2], { filename: `${label}-inline-${count}.js` });
  }
  assert.equal(count, expectedCount, `${label}: unexpected inline script count`);
}

parseInlineScripts("admin", admin, 2);
new vm.Script(game, { filename: "nazonazo-game.js" });

const expectedStages = [
  ["town", "まちはずれ"],
  ["jungle", "ジャングル"],
  ["number", "すうじのへや"],
  ["sea", "ふかいうみ"],
  ["future", "みらいシティ"],
  ["space", "うちゅう"],
];
const expectedIds = expectedStages.map(([id]) => id);

// The dashboard renders exactly one canonical button per stage and one lazy preview frame.
assert.match(admin, /<button class="tab" data-panel="nazonazo">🚂 なぞなぞ<\/button>/);
assert.equal((admin.match(/id="panel-nazonazo"/g) || []).length, 1);
const adminButtons = Array.from(admin.matchAll(/data-nazonazo-stage="([^"]+)"/g), (m) => m[1]);
assert.deepEqual(adminButtons, expectedIds);
assert.equal(new Set(adminButtons).size, expectedIds.length, "stage buttons must be unique");
for (const [id, label] of expectedStages) {
  assert.match(admin, new RegExp(`data-nazonazo-stage="${id}"[^>]*aria-pressed="false"[^>]*>[^<]*${label}<\\/button>`));
}
assert.equal((admin.match(/id="nazonazo-admin-frame"/g) || []).length, 1);
assert.match(
  admin,
  /id="nazonazo-admin-frame"[^>]*allow="autoplay"[^>]*data-src="\.\.\/nazonazo-tunnel\/\?adminStagePreview=1"/,
);
assert.match(admin, /\.nazonazo-admin-preview\s*\{[\s\S]*?aspect-ratio:\s*16\s*\/\s*9;/);
assert.match(admin, /\.nazonazo-admin-stage-btn\s*\{[\s\S]*?min-height:\s*48px;/);
assert.match(admin, /\.nazonazo-admin-preview-actions \.btn\s*\{\s*min-height:\s*44px;/);
assert.match(
  admin,
  /@media \(max-width: 520px\)[\s\S]*?\.nazonazo-admin-stage-btn\s*\{[^}]*min-height:\s*46px;/,
);
assert.match(admin, /href="\.\.\/nazonazo-tunnel\/"[^>]*target="_blank"[^>]*rel="noopener"/);
assert.match(admin, /管理プレビュー中はハイスコア・図鑑・進行状況を保存しません/);
assert.match(admin, /if \(!window\.__APP_BUILD__\)[\s\S]*?App staging/);
assert.match(admin, /function nazonazoSelectStage\(stageId\)[\s\S]*?frame\.setAttribute\('src',[\s\S]*?adminPreviewToken=/);
assert.match(admin, /event\.origin !== location\.origin \|\| event\.source !== frame\.contentWindow/);
assert.match(admin, /data\.token !== nazonazoAdminPreviewToken/);
assert.match(admin, /btn\.setAttribute\('aria-pressed', active \? 'true' : 'false'\)/);
assert.match(admin, /panelId !== 'nazonazo'[\s\S]*?nazonazoStopStagePreview\(true\)/);

// The child bridge is isolated so its trust predicate and canonical mapping can be VM-tested.
const bridgeStart = game.indexOf("/* ================= Basic Auth 管理ダッシュボード専用ステージ選択 ================= */");
const bridgeEnd = game.indexOf("\n/* ================= wiring ================= */", bridgeStart);
assert.ok(bridgeStart > 0 && bridgeEnd > bridgeStart, "Nazonazo admin stage bridge is missing");
const bridge = game.slice(bridgeStart, bridgeEnd);

function runTrust(windowObject) {
  const context = { window: windowObject };
  vm.runInNewContext(
    bridge + ";this.__ids=Object.keys(NAZONAZO_ADMIN_STAGE_INDEX);this.__indexes=this.__ids.map(id=>NAZONAZO_ADMIN_STAGE_INDEX[id]);this.__trusted=nazonazoAdminPreviewParentIsTrusted();",
    context,
  );
  return {
    ids: Array.from(context.__ids),
    indexes: Array.from(context.__indexes),
    trusted: context.__trusted,
  };
}

const trustedWindow = {
  location: { origin: "https://example.test", pathname: "/nazonazo-tunnel/" },
  parent: { location: { origin: "https://example.test", pathname: "/admin/" } },
};
const trusted = runTrust(trustedWindow);
assert.deepEqual(trusted.ids, expectedIds);
assert.deepEqual(trusted.indexes, [0, 1, 2, 3, 4, 5]);
assert.equal(trusted.trusted, true, "same-origin /admin parent should be trusted");

const selfWindow = { location: { origin: "https://example.test", pathname: "/nazonazo-tunnel/" } };
selfWindow.parent = selfWindow;
assert.equal(runTrust(selfWindow).trusted, false, "top-level preview query must be inert");
assert.equal(
  runTrust({
    location: { origin: "https://example.test", pathname: "/nazonazo-tunnel/" },
    parent: { location: { origin: "https://example.test", pathname: "/play.html" } },
  }).trusted,
  false,
  "a non-admin same-origin parent must be rejected",
);
assert.equal(
  runTrust({
    location: { origin: "https://example.test", pathname: "/nazonazo-tunnel/" },
    parent: { location: { origin: "https://evil.test", pathname: "/admin/" } },
  }).trusted,
  false,
  "a cross-origin parent must be rejected",
);
const throwingParent = {};
Object.defineProperty(throwingParent, "location", { get() { throw new Error("cross-origin"); } });
assert.equal(
  runTrust({ location: { origin: "https://example.test", pathname: "/nazonazo-tunnel/" }, parent: throwingParent }).trusted,
  false,
  "cross-origin location access must fail closed",
);

assert.match(bridge, /requested=params\.get\("adminStagePreview"\)==="1"/);
assert.match(bridge, /token=params\.get\("adminPreviewToken"\)\|\|""/);
assert.match(bridge, /!window\.__APP_BUILD__\|\|window\.__PONO_TIER_LOCKED__/);
assert.match(bridge, /fetch\("\/admin\/",\{method:"HEAD",credentials:"same-origin",cache:"no-store"\}\)/);
assert.ok(
  bridge.indexOf("nazonazoAdminPreviewMode=true") < bridge.indexOf("await nazonazoAdminPreviewHasAdminAuth()"),
  "save suppression must start before the asynchronous Basic Auth confirmation",
);
assert.ok(
  bridge.indexOf("await nazonazoAdminPreviewHasAdminAuth()") < bridge.indexOf('window.addEventListener("message"'),
  "stage messages must remain disabled until Basic Auth confirmation succeeds",
);
assert.match(bridge, /const start=\$\("startBtn"\);[\s\S]*?start\.disabled=true;start\.textContent="かくにんちゅう"/);
assert.match(bridge, /const levelButtons=\[\.\.\.document\.querySelectorAll\("#lvSel \.selBtn"\)\];[\s\S]*?button\.disabled=true/);
assert.match(bridge, /event\.origin!==window\.location\.origin\|\|event\.source!==window\.parent/);
assert.match(bridge, /data\.token!==nazonazoAdminPreviewToken/);
assert.match(bridge, /Object\.prototype\.hasOwnProperty\.call\(NAZONAZO_ADMIN_STAGE_INDEX,stageId\)/);
assert.ok(!/params\.get\(["'](?:stage|adminStage)["']\)/.test(game), "public stage query launch must not exist");

const armedLabel = { hidden: true, textContent: "" };
const armedStart = { disabled: true, textContent: "" };
const bridgeCalls = [];
const armContext = {
  window: {
    location: { origin: "https://example.test", pathname: "/nazonazo-tunnel/" },
    parent: {
      location: { origin: "https://example.test", pathname: "/admin/" },
      postMessage(payload) { bridgeCalls.push(["notify", payload.type, payload.stageId || ""]); },
    },
  },
  STAGES: expectedStages.map(([id, label]) => ({ id, names: [label] })),
  stg: 0,
  loop: 0,
  playing: true,
  driving: true,
  pending: "quiz",
  vel: 10,
  worldX: 0,
  target: 0,
  resetSeaInteraction() { bridgeCalls.push(["reset-sea"]); },
  clearFutureRailGame() { bridgeCalls.push(["clear-future-rail"]); },
  clearSpaceConstellationGame() { bridgeCalls.push(["clear-space-constellation"]); },
  stopStageWeather() { bridgeCalls.push(["stop-weather"]); },
  applySkin() { bridgeCalls.push(["skin"]); },
  origin(index) { return index * 100; },
  buildWorld() { bridgeCalls.push(["world"]); },
  drawDots() {},
  renderCars() {},
  updateHelpHud() {},
  render() {},
  $(id) { return id === "adminStagePreviewLabel" ? armedLabel : armedStart; },
};
vm.runInNewContext(
  bridge + ';nazonazoAdminPreviewMode=true;nazonazoAdminPreviewToken="valid-token";this.__armed=nazonazoAdminPreviewArm("sea");this.__armState={stg,loop,playing,driving,pending,vel,worldX,target,nazonazoAdminPreviewStageIndex};',
  armContext,
);
assert.equal(armContext.__armed, true);
assert.deepEqual(
  JSON.parse(JSON.stringify(armContext.__armState)),
  { stg: 3, loop: 0, playing: false, driving: false, pending: null, vel: 0, worldX: 300, target: 300, nazonazoAdminPreviewStageIndex: 3 },
);
assert.equal(armedStart.disabled, false);
assert.equal(armedStart.textContent, "ふかいうみを はじめる！");
assert.match(armedLabel.textContent, /ふかいうみ/);
assert.ok(bridgeCalls.some((call) => call[0] === "notify" && call[1] === "armed" && call[2] === "sea"));

const armStart = bridge.indexOf("function nazonazoAdminPreviewArm(stageId)");
const armEnd = bridge.indexOf("\nasync function initNazonazoAdminStagePreviewBridge", armStart);
const arm = bridge.slice(armStart, armEnd);
assert.ok(armStart >= 0 && armEnd > armStart);
assert.ok(!arm.includes("startJourneyAt("), "parent selection must arm only; child tap must start audio/gameplay");
assert.match(arm, /start\.disabled=false/);
assert.match(arm, /start\.textContent=STAGES\[index\]\.names\[0\]\+"を はじめる！"/);

const startHandlerStart = game.indexOf('bindTap($("startBtn"),()=>{');
const startHandlerEnd = game.indexOf('\nbindTap($("goBtn")', startHandlerStart);
const startHandler = game.slice(startHandlerStart, startHandlerEnd);
assert.match(startHandler, /const startStage=nazonazoAdminPreviewMode\?nazonazoAdminPreviewStageIndex:0;/);
assert.match(startHandler, /const p=ensureAC\(\);[\s\S]*?primeAC\(\);[\s\S]*?startJourneyAt\(startStage\);/);
assert.match(startHandler, /nazonazoAdminPreviewNotify\("started"/);

// Preview writes are blocked globally, while the ordinary save path remains intact.
const saveStart = game.indexOf("function saveGame(){");
const saveEnd = game.indexOf("\nfunction loadGame(){", saveStart);
const saveFunction = game.slice(saveStart, saveEnd);
assert.ok(saveStart > 0 && saveEnd > saveStart);
assert.ok(
  saveFunction.indexOf('typeof nazonazoAdminPreviewMode!=="undefined"&&nazonazoAdminPreviewMode') < saveFunction.indexOf("localStorage.setItem"),
  "preview guard must precede every persistent write",
);
let previewWrites = 0;
vm.runInNewContext(
  'let nazonazoAdminPreviewMode=true;let level=0,unlockedLoop=0,highScore=0,bestStarsByStage={};const zkReg=new Set(),SAVE_KEY="test";' + saveFunction + ';saveGame();',
  { localStorage: { setItem() { previewWrites++; } }, JSON },
);
assert.equal(previewWrites, 0, "admin preview must not write localStorage");
let normalWrites = 0;
vm.runInNewContext(
  'let nazonazoAdminPreviewMode=false;let level=0,unlockedLoop=0,highScore=0,bestStarsByStage={};const zkReg=new Set(),SAVE_KEY="test";' + saveFunction + ';saveGame();',
  { localStorage: { setItem() { normalWrites++; } }, JSON },
);
assert.equal(normalWrites, 1, "ordinary play must retain its save path");

assert.match(game, /const wasAdminPreview=document\.body\.classList\.contains\("nazonazo-admin-stage-preview"\);/);
assert.match(game, /if\(wasAdminPreview\)document\.body\.classList\.add\("nazonazo-admin-stage-preview"\);/);
assert.match(html, /id="adminStagePreviewLabel" hidden/);
assert.match(html, /js\/game\.js\?v=20260713-1271/);
assert.match(html, /styles\.css\?v=20260713-1271/);
assert.match(styles, /@media \(orientation:landscape\) and \(max-height:180px\)[\s\S]*?body\.nazonazo-admin-stage-preview #title h1,[\s\S]*?#zkBtnTitle\{display:none\}/);
assert.match(styles, /body\.nazonazo-admin-stage-preview #lvSel\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.match(styles, /body\.nazonazo-admin-stage-preview #startBtn\{[^}]*min-height:38px/);

// Preserve the server-side admin boundary and App-only tier behavior.
assert.match(worker, /const PROTECTED_PREFIXES = \[[\s\S]*?'\/admin\/'[\s\S]*?'\/admin'/);
assert.match(worker, /function checkBasicAuth\(request, env\)/);
assert.match(sw, /event\.request\.url\.includes\('\/admin\/'\)[\s\S]*?return;/);
assert.ok(Number(sw.match(/const CACHE_VERSION = (\d+);/)?.[1]) >= 2151);

console.log("nazonazo admin stage select regression: PASS");
