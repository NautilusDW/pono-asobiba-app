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
assert.equal((admin.match(/id="nazonazo-admin-space-chase"/g) || []).length, 1);
assert.match(admin, /id="nazonazo-admin-space-chase"[^>]*data-nazonazo-preview-kind="spaceChase"[^>]*aria-pressed="false"/);
assert.match(admin, /nazonazoSelectSpaceChase\(\)/);
assert.match(admin, /最終おいかけっこだけ すぐ試す/);
assert.equal((admin.match(/id="nazonazo-admin-frame"/g) || []).length, 1);
assert.match(
  admin,
  /id="nazonazo-admin-frame"[^>]*allow="autoplay"[^>]*data-src="\.\.\/nazonazo-tunnel\/\?adminStagePreview=1"/,
);
assert.match(admin, /\.nazonazo-admin-preview\s*\{[\s\S]*?aspect-ratio:\s*16\s*\/\s*9;/);
assert.match(admin, /\.nazonazo-admin-stage-btn\s*\{[\s\S]*?min-height:\s*48px;/);
assert.match(admin, /\.nazonazo-admin-special-preview\s*\{[\s\S]*?min-height:\s*50px;/);
assert.match(admin, /\.nazonazo-admin-preview-actions \.btn\s*\{\s*min-height:\s*44px;/);
assert.match(
  admin,
  /@media \(max-width: 520px\)[\s\S]*?\.nazonazo-admin-stage-btn\s*\{[^}]*min-height:\s*46px;/,
);
assert.match(admin, /href="\.\.\/nazonazo-tunnel\/"[^>]*target="_blank"[^>]*rel="noopener"/);
assert.match(admin, /管理プレビュー中はハイスコア・図鑑・進行状況を保存しません/);
assert.match(admin, /if \(!window\.__APP_BUILD__\)[\s\S]*?App staging/);
assert.match(admin, /function nazonazoSelectStage\(stageId, previewKind\)[\s\S]*?frame\.setAttribute\('src',[\s\S]*?adminPreviewToken=/);
assert.match(admin, /previewKind:\s*nazonazoAdminPendingPreviewKind/);
assert.match(admin, /previewKind === 'spaceChase' && stageId === 'space'/);
assert.match(admin, /event\.origin !== location\.origin \|\| event\.source !== frame\.contentWindow/);
assert.match(admin, /data\.token !== nazonazoAdminPreviewToken/);
assert.match(admin, /btn\.setAttribute\('aria-pressed', active \? 'true' : 'false'\)/);
assert.match(admin, /panelId !== 'nazonazo'[\s\S]*?nazonazoStopStagePreview\(true\)/);
assert.match(admin, /nazonazoAdminPendingPreviewKind = 'stage'/);

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
assert.match(bridge, /previewKind=String\(data\.previewKind\|\|""\)/);
assert.match(bridge, /previewKind==="spaceChase"&&stageId==="space"/);
assert.match(bridge, /nazonazoAdminPreviewArm\(stageId,previewKind\)/);
assert.ok(!/params\.get\(["'](?:stage|adminStage)["']\)/.test(game), "public stage query launch must not exist");
assert.ok(!/params\.get\(["'](?:previewKind|spaceChase)["']\)/.test(game), "direct finale kind must come only from the authenticated parent message");

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
  nazonazoAdminPreviewKind: "stage",
  resetNumberCargoGame() { bridgeCalls.push(["reset-number-cargo"]); },
  resetSeaInteraction() { bridgeCalls.push(["reset-sea"]); },
  clearFutureCapsuleGame() { bridgeCalls.push(["clear-future-capsule"]); },
  clearSpaceRepairGame() { bridgeCalls.push(["clear-space-repair"]); },
  resetSpaceSteering() { bridgeCalls.push(["reset-space-steering"]); },
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
  bridge + ';nazonazoAdminPreviewMode=true;nazonazoAdminPreviewToken="valid-token";this.__armed=nazonazoAdminPreviewArm("sea","stage");this.__armState={stg,loop,playing,driving,pending,vel,worldX,target,nazonazoAdminPreviewStageIndex,nazonazoAdminPreviewKind};this.__allowed={normal:nazonazoAdminPreviewKindIsAllowed("sea","stage"),direct:nazonazoAdminPreviewKindIsAllowed("space","spaceChase"),wrongStage:nazonazoAdminPreviewKindIsAllowed("sea","spaceChase"),wrongKind:nazonazoAdminPreviewKindIsAllowed("space","boss")};',
  armContext,
);
assert.equal(armContext.__armed, true);
assert.deepEqual(
  JSON.parse(JSON.stringify(armContext.__armState)),
  { stg: 3, loop: 0, playing: false, driving: false, pending: null, vel: 0, worldX: 300, target: 300, nazonazoAdminPreviewStageIndex: 3, nazonazoAdminPreviewKind: "stage" },
);
assert.deepEqual(JSON.parse(JSON.stringify(armContext.__allowed)), { normal: true, direct: true, wrongStage: false, wrongKind: false });
assert.equal(armedStart.disabled, false);
assert.equal(armedStart.textContent, "ふかいうみを はじめる！");
assert.match(armedLabel.textContent, /ふかいうみ/);
assert.ok(bridgeCalls.some((call) => call[0] === "notify" && call[1] === "armed" && call[2] === "sea"));
assert.ok(bridgeCalls.some((call) => call[0] === "reset-number-cargo"), "arming a preview must clear the current number cargo game");
assert.ok(bridgeCalls.some((call) => call[0] === "clear-future-capsule"), "arming a preview must clear the current future capsule game");
assert.ok(bridgeCalls.some((call) => call[0] === "clear-space-repair"), "arming a preview must clear the current space repair game");
assert.ok(bridgeCalls.some((call) => call[0] === "reset-space-steering"), "arming a preview must clear stale rocket steering state");

vm.runInNewContext('this.__directArmed=nazonazoAdminPreviewArm("space","spaceChase");this.__directState={stg,nazonazoAdminPreviewStageIndex,nazonazoAdminPreviewKind};', armContext);
assert.equal(armContext.__directArmed, true);
assert.deepEqual(JSON.parse(JSON.stringify(armContext.__directState)), { stg: 5, nazonazoAdminPreviewStageIndex: 5, nazonazoAdminPreviewKind: "spaceChase" });
assert.equal(armedStart.textContent, "おいかけっこを はじめる！");
assert.match(armedLabel.textContent, /さいしゅう おいかけっこ/);

const armStart = bridge.indexOf("function nazonazoAdminPreviewArm(stageId,previewKind)");
const armEnd = bridge.indexOf("\nasync function initNazonazoAdminStagePreviewBridge", armStart);
const arm = bridge.slice(armStart, armEnd);
assert.ok(armStart >= 0 && armEnd > armStart);
assert.ok(!arm.includes("startJourneyAt("), "parent selection must arm only; child tap must start audio/gameplay");
assert.match(arm, /start\.disabled=false/);
assert.match(arm, /previewKind==="spaceChase"\?"おいかけっこを はじめる！"/);

const startHandlerStart = game.indexOf('bindTap($("startBtn"),()=>{');
const startHandlerEnd = game.indexOf('\nbindTap($("goBtn")', startHandlerStart);
const startHandler = game.slice(startHandlerStart, startHandlerEnd);
assert.match(startHandler, /const startStage=nazonazoAdminPreviewMode\?nazonazoAdminPreviewStageIndex:0;/);
assert.match(startHandler, /const p=ensureAC\(\);[\s\S]*?primeAC\(\);[\s\S]*?startJourneyAt\(startStage,\{adminSpaceChase:nazonazoAdminPreviewKind==="spaceChase"\}\);/);
assert.match(startHandler, /nazonazoAdminPreviewNotify\("started"/);

const startJourney = game.slice(game.indexOf("function startJourneyAt(s,options){"), game.indexOf("\nfunction isNumberCargoQuestion", game.indexOf("function startJourneyAt(s,options){")));
assert.match(startJourney, /options&&options\.adminSpaceChase&&nazonazoAdminPreviewMode&&nazonazoAdminPreviewKind==="spaceChase"/);
assert.match(startJourney, /STAGES\[s\]&&STAGES\[s\]\.id==="space"/);
assert.match(startJourney, /qSeg=QN;drawDots\(\);worldX=stops\(origin\(s\),QN-1\)\+120;target=worldX;pending=null;driving=false;playing=true/);
assert.equal((startJourney.match(/showSpaceChaseEncounter\(\)/g) || []).length, 1);
assert.ok(startJourney.indexOf("if(adminSpaceChase)") < startJourney.indexOf("sndGo();"), "direct finale must skip the ordinary first-quiz departure sound/path");

const againHandlerStart = game.indexOf('bindTap($("againBtn"),()=>{');
const againHandlerEnd = game.indexOf('\nbindTap($("loopBtn")', againHandlerStart);
const againHandler = game.slice(againHandlerStart, againHandlerEnd);
assert.match(againHandler, /adminSpaceChase:nazonazoAdminPreviewMode&&nazonazoAdminPreviewKind==="spaceChase"/,
  "again must return a direct-finale preview to the finale, not the five questions");

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
assert.match(game, /const wasAdminSpaceChase=nazonazoAdminPreviewMode&&nazonazoAdminPreviewKind==="spaceChase";/);
assert.match(game, /if\(wasAdminSpaceChase\)document\.body\.classList\.add\("nazonazo-admin-space-chase-preview"\);/);
assert.match(html, /id="adminStagePreviewLabel" hidden/);
assert.match(html, /js\/game\.js\?v=20260716-1319/);
assert.match(html, /styles\.css\?v=20260716-1319/);
assert.match(styles, /body\.nazonazo-admin-stage-preview #gameSettings\{display:none!important\}/,
  "the public return menu must not cover the tiny authenticated stage preview");
assert.match(styles, /@media \(orientation:landscape\) and \(max-height:180px\)[\s\S]*?body\.nazonazo-admin-stage-preview #title h1,[\s\S]*?#zkBtnTitle\{display:none\}/);
assert.match(styles, /body\.nazonazo-admin-stage-preview #lvSel\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.match(styles, /body\.nazonazo-admin-stage-preview #startBtn\{[^}]*min-height:38px/);
assert.match(styles, /body\.nazonazo-admin-space-chase-preview #titleGameGuide,[\s\S]*?#zkBtnTitle\{display:none!important\}/);

// Preserve the server-side admin boundary and App-only tier behavior.
assert.match(worker, /const PROTECTED_PREFIXES = \[[\s\S]*?'\/admin\/'[\s\S]*?'\/admin'/);
assert.match(worker, /function checkBasicAuth\(request, env\)/);
assert.match(sw, /event\.request\.url\.includes\('\/admin\/'\)[\s\S]*?return;/);
assert.ok(Number(sw.match(/const CACHE_VERSION = (\d+);/)?.[1]) >= 2151);

console.log("nazonazo admin stage select regression: PASS");
