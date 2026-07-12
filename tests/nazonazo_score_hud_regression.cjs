#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const html = read("nazonazo-tunnel/index.html");
const css = read("nazonazo-tunnel/styles.css");
const game = read("nazonazo-tunnel/js/game.js");

function scanBalanced(source, openAt, openChar, closeChar) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = openAt; index < source.length; index += 1) {
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
    if (char === openChar) depth += 1;
    else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name}: function declaration missing`);
  const bodyAt = source.indexOf("{", start + marker.length);
  const end = scanBalanced(source, bodyAt, "{", "}");
  assert.ok(end > bodyAt, `${name}: unterminated function body`);
  return source.slice(start, end + 1);
}

function extractRule(source, selector) {
  const start = source.indexOf(selector);
  assert.ok(start >= 0, `${selector}: CSS selector missing`);
  const bodyAt = source.indexOf("{", start + selector.length);
  const end = scanBalanced(source, bodyAt, "{", "}");
  assert.ok(end > bodyAt, `${selector}: unterminated CSS body`);
  return source.slice(start, end + 1);
}

/* ---------- DOM and responsive layout contract ---------- */
for (const id of [
  "scoreHud", "scoreCurrentPill", "scoreHudValue", "scoreHudTail",
  "highScorePill", "highScoreValue", "helpBadge", "carBadge"
]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `${id}: score HUD node missing`);
}
assert.match(html, /id="scoreCurrentPill"[\s\S]*?>\s*<span[^>]*>スコア<\/span>[\s\S]*?id="scoreHudValue"[^>]*>0(?:てん)?</, "current score needs a short kana label and initial value");
assert.match(html, /id="highScorePill"[\s\S]*?>\s*<span[^>]*>ハイスコア<\/span>[\s\S]*?id="highScoreValue"[^>]*>0(?:てん)?</, "high score needs a visible label and initial value");

const order = Object.fromEntries([
  "hud", "dots", "scoreHud", "scoreCurrentPill", "scoreHudValue", "scoreHudTail",
  "highScorePill", "highScoreValue", "helpBadge", "carBadge", "homeBtn"
].map(id => [id, html.indexOf(`id="${id}"`)]));
assert.ok(Object.values(order).every(index => index >= 0), "score HUD ordering nodes missing");
assert.ok(order.hud < order.dots && order.dots < order.scoreHud && order.scoreHud < order.homeBtn, "score HUD must live between stage progress and map button");
assert.ok(order.scoreCurrentPill < order.scoreHudTail && order.scoreHudTail < order.highScorePill, "the high-score tail must be a sibling to the centered current pill");
assert.ok(order.highScoreValue < order.helpBadge && order.helpBadge < order.carBadge && order.carBadge < order.homeBtn, "right-side order must be high score, help, passengers, map");

const scoreHudRule = extractRule(css, "#scoreHud");
assert.match(scoreHudRule, /position\s*:\s*absolute/, "score HUD must not consume flex width or shift the true center");
assert.match(scoreHudRule, /left\s*:\s*50%/, "current score anchor must be the viewport center");
assert.match(scoreHudRule, /transform\s*:\s*translateX\(\s*-50%\s*\)/, "current score must center on its own width");
assert.match(scoreHudRule, /pointer-events\s*:\s*none/, "read-only score information must not block play");
const scoreTailRule = extractRule(css, "#scoreHudTail");
assert.match(scoreTailRule, /position\s*:\s*absolute/, "the high-score tail must not pull the current score away from center");
assert.match(scoreTailRule, /left\s*:\s*calc\(\s*100%\s*\+/, "high score and counters must extend only to the current score's right");
assert.match(scoreTailRule, /display\s*:\s*flex/, "high score and the two counters must remain in one row");
assert.match(css, /#scoreHud #helpBadge\s*,\s*#scoreHud #carBadge\s*\{[^}]*position\s*:\s*static/, "legacy lower-left counters must be re-homed inside the score row");
assert.match(css, /@media\s*\(orientation\s*:\s*portrait\)[\s\S]*?#scoreHud\s*\{[^}]*display\s*:\s*none/, "portrait rotate screen must hide the landscape score row");
assert.match(css, /@media\s*\(orientation\s*:\s*landscape\)\s*and\s*\(max-width\s*:\s*(?:9\d\d|1000)px\)[\s\S]*?#dots\s*\{[^}]*gap\s*:/, "compact landscape must shrink stage progress before it can collide with the centered score");

/* ---------- high-score persistence contract ---------- */
const saveGame = extractFunction(game, "saveGame");
const loadGame = extractFunction(game, "loadGame");
const resetJourneyScore = extractFunction(game, "resetJourneyScore");
const addScore = extractFunction(game, "addScore");
const drawPersistentScoreHud = extractFunction(game, "drawPersistentScoreHud");
const drawTunnelScoreHud = extractFunction(game, "drawTunnelScoreHud");

assert.match(game, /let\s+[^;]*\bhighScore\s*=\s*0\b/, "journey high score state must start at zero");
assert.match(saveGame, /\bhighScore\b/, "high score must be saved with existing game progress");
assert.match(loadGame, /data\.highScore/, "high score must restore from the existing save object");
assert.match(loadGame, /(?:Number\(data\.highScore\)|data\.highScore)[\s\S]*?\|\|\s*0|Math\.max\(\s*0/, "missing or invalid legacy highScore must fall back to zero");
assert.doesNotMatch(resetJourneyScore, /highScore\s*=/, "starting over must reset current score without erasing the record");
assert.match(addScore, /journeyScore\s*>\s*highScore|Math\.max\(\s*highScore\s*,\s*journeyScore\s*\)/, "new points must promote a new high score immediately");
assert.match(addScore, /saveGame\(\)/, "a new record must be persisted immediately rather than only at the ending");
assert.match(drawPersistentScoreHud, /journeyScore/, "top HUD must read the current journey score");
assert.match(drawPersistentScoreHud, /scoreHudValue/, "top HUD must render the current journey score");
assert.match(drawPersistentScoreHud, /highScore/, "top HUD must read the saved record");
assert.match(drawPersistentScoreHud, /highScoreValue/, "top HUD must render the saved record");
assert.match(drawTunnelScoreHud, /drawPersistentScoreHud\(\)/, "every existing score update path must also refresh the top HUD");
assert.match(game, /loadGame\(\)[\s\S]{0,300}drawPersistentScoreHud\(\)/, "saved high score must render during synchronous boot before first reveal");
assert.match(saveGame, /schemaVersion\s*:\s*1\b/, "an optional highScore field must stay backward-compatible with schema v1 saves");

function createPersistenceHarness() {
  const storage = new Map();
  const context = {
    console,
    Math,
    Number,
    Set,
    JSON,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); }
    },
    clamp(value, min, max) { return Math.max(min, Math.min(max, value)); },
    drawPersistentScoreHud() {}
  };
  vm.runInNewContext(`
    const SAVE_KEY="pono_nazonazo_tunnel_v1";
    let level=0,unlockedLoop=0,bestStarsByStage={},highScore=0;
    const zkReg=new Set();
    ${saveGame}
    ${loadGame}
    this.__api={
      seed:value=>localStorage.setItem(SAVE_KEY,JSON.stringify(value)),
      clear:()=>{localStorage.setItem(SAVE_KEY,"");level=0;unlockedLoop=0;bestStarsByStage={};highScore=0;zkReg.clear();},
      load:loadGame,
      setHigh:value=>{highScore=value;},
      save:saveGame,
      raw:()=>localStorage.getItem(SAVE_KEY),
      state:()=>({level,unlockedLoop,bestStarsByStage,highScore,collectedFriends:[...zkReg]})
    };
  `, context, { filename: "nazonazo-score-save-vm.js", timeout: 1000 });
  return context.__api;
}

const persistence = createPersistenceHarness();
persistence.seed({ schemaVersion: 1, lastLevel: 2, unlockedLoop: 1, bestStarsByStage: { "0|town|0": 3 }, collectedFriends: ["🐿️|りす"] });
persistence.load();
assert.equal(persistence.state().highScore, 0, "a pre-score schema v1 save must still load with a zero record");
assert.equal(persistence.state().level, 2, "legacy progress must survive the high-score addition");
persistence.seed({ schemaVersion: 1, lastLevel: 1, unlockedLoop: 0, bestStarsByStage: {}, collectedFriends: [], highScore: 9876 });
persistence.load();
assert.equal(persistence.state().highScore, 9876, "saved high score did not restore");
persistence.setHigh(12345);
persistence.save();
assert.equal(JSON.parse(persistence.raw()).highScore, 12345, "save payload lost the high score");

/* ---------- optional browser geometry and live persistence ---------- */
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png"
};

async function startStaticServer() {
  if (process.env.NAZONAZO_BASE_URL) return { base: process.env.NAZONAZO_BASE_URL.replace(/\/$/, ""), close: async () => {} };
  const server = http.createServer((request, response) => {
    const rawPath = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const rel = rawPath.endsWith("/") ? `${rawPath}index.html` : rawPath;
    const full = path.resolve(root, `.${rel}`);
    if (full !== root && !full.startsWith(`${root}${path.sep}`)) return response.writeHead(403).end("forbidden");
    fs.readFile(full, (error, body) => {
      if (error) return response.writeHead(error.code === "ENOENT" ? 404 : 500).end("not found");
      response.writeHead(200, { "content-type": mime[path.extname(full)] || "application/octet-stream", "cache-control": "no-store" });
      response.end(body);
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) };
}

async function runBrowser(browserName, base) {
  const { chromium, webkit } = require("playwright");
  const browserType = browserName.startsWith("webkit") ? webkit : chromium;
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
  await context.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    localStorage.setItem("pono_nazonazo_tunnel_v1", JSON.stringify({
      schemaVersion: 1, lastLevel: 0, unlockedLoop: 0, bestStarsByStage: {}, collectedFriends: [], highScore: 9876
    }));
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`${base}/nazonazo-tunnel/?weather=clear#fast`, { waitUntil: "networkidle" });
  assert.match(await page.locator("#highScoreValue").textContent(), /^9,876(?:てん)?$/, `${browserName}: saved high score missing at boot`);

  for (const [width, height] of [[390, 844], [740, 320], [844, 390], [1024, 768], [1366, 768]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const metrics = await page.evaluate(() => {
      document.getElementById("stgName").textContent = "🌆 あさやけの みらいシティ";
      document.getElementById("scoreHudValue").textContent = "99,999てん";
      document.getElementById("highScoreValue").textContent = "99,999てん";
      const help = document.getElementById("helpBadge");
      const car = document.getElementById("carBadge");
      help.textContent = "🍀 ×3"; help.style.display = "block";
      car.textContent = "👥 ×30"; car.style.display = "block";
      const rect = id => {
        const el = document.getElementById(id);
        const box = el.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height, display: getComputedStyle(el).display };
      };
      return {
        portrait: matchMedia("(orientation:portrait)").matches,
        score: rect("scoreHud"), current: rect("scoreCurrentPill"), high: rect("highScorePill"),
        help: rect("helpBadge"), car: rect("carBadge"), dots: rect("dots"), home: rect("homeBtn"), rotate: rect("rotateHint"),
        viewportWidth: innerWidth,
        overflowX: document.documentElement.scrollWidth - innerWidth,
        overflowY: document.documentElement.scrollHeight - innerHeight
      };
    });
    assert.ok(metrics.overflowX <= 1 && metrics.overflowY <= 1, `${browserName}: overflow at ${width}x${height}`);
    if (metrics.portrait) {
      assert.equal(metrics.score.display, "none", `${browserName}: portrait score HUD must be hidden`);
      assert.equal(metrics.rotate.display, "flex", `${browserName}: portrait rotation prompt missing`);
      continue;
    }
    assert.ok(Math.abs((metrics.current.left + metrics.current.right) / 2 - metrics.viewportWidth / 2) <= 1, `${browserName}: current score is not centered at ${width}x${height}`);
    assert.ok(metrics.dots.right <= metrics.current.left, `${browserName}: stage progress overlaps current score at ${width}x${height}`);
    assert.ok(metrics.current.right <= metrics.high.left && metrics.high.right <= metrics.help.left && metrics.help.right <= metrics.car.left, `${browserName}: score/high-score/help/passenger order drifted at ${width}x${height}`);
    assert.ok(metrics.car.right <= metrics.home.left, `${browserName}: passenger count overlaps map button at ${width}x${height}`);
  }
  assert.deepEqual(errors, [], `${browserName}: page errors\n${errors.join("\n")}`);
  await context.close();

  const liveContext = await browser.newContext({ viewport: { width: 844, height: 390 } });
  await liveContext.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    localStorage.setItem("pono_nazonazo_tunnel_v1", JSON.stringify({ schemaVersion: 1, lastLevel: 0, unlockedLoop: 0, bestStarsByStage: {}, collectedFriends: [] }));
  });
  const livePage = await liveContext.newPage();
  await livePage.goto(`${base}/nazonazo-tunnel/?weather=clear#fast`, { waitUntil: "networkidle" });
  assert.match(await livePage.locator("#highScoreValue").textContent(), /^0(?:てん)?$/, `${browserName}: legacy save did not fall back to zero`);
  await livePage.locator("#startBtn").click();
  const correct = livePage.locator('#quiz.show .choice[data-ok="1"]');
  await correct.waitFor({ state: "visible", timeout: 20000 });
  await correct.click();
  await livePage.waitForFunction(() => /^150(?:てん)?$/.test(document.getElementById("highScoreValue").textContent), null, { timeout: 5000 });
  const saved = await livePage.evaluate(() => JSON.parse(localStorage.getItem("pono_nazonazo_tunnel_v1")));
  assert.equal(saved.highScore, 150, `${browserName}: first new record was not persisted immediately`);
  await liveContext.close();
  await browser.close();
}

(async () => {
  if (process.env.NAZONAZO_BROWSER) {
    const server = await startStaticServer();
    try {
      for (const browserName of process.env.NAZONAZO_BROWSER.split(",").map(value => value.trim()).filter(Boolean)) await runBrowser(browserName, server.base);
    } finally {
      await server.close();
    }
  }
  console.log("nazonazo score HUD regression: PASS");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
