#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const html = read("nazonazo-tunnel/index.html");
const css = read("nazonazo-tunnel/styles.css");
const game = read("nazonazo-tunnel/js/game.js");
const serviceWorker = read("sw.js");

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name}: function missing`);
  const open = source.indexOf("{", start + marker.length);
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
    else if (char === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name}: function is not closed`);
}

function numericConstant(name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*([0-9]+(?:\\.[0-9]+)?)`).exec(game);
  assert.ok(match, `${name}: numeric constant missing`);
  return Number(match[1]);
}

for (const [name, expected] of Object.entries({
  SMOKE_INTERVAL_MIN_MS: 70,
  SMOKE_INTERVAL_JITTER_MS: 40,
  SMOKE_LIFE_MIN_MS: 4800,
  SMOKE_LIFE_JITTER_MS: 1400,
  SMOKE_MAX_PUFFS: 48,
  SMOKE_WARM_START_COUNT: 12
})) assert.equal(numericConstant(name), expected, `${name}: density contract changed`);

assert.doesNotMatch(game, /\b(?:IOS|REDUCED)_SMOKE_(?:INTERVAL|LIFE|MAX)/,
  "desktop, iPad and reduced motion must not diverge in smoke density");
assert.match(html, /styles\.css\?v=20260714-1297/);
assert.match(html, /js\/game\.js\?v=20260714-1297/);
assert.match(serviceWorker, /v2183: なぞなぞトレインの煙/);
assert.match(serviceWorker, /const CACHE_VERSION = 2183;/);
assert.match(css, /body\.tunnel-enter-run #veh \.puff,body\.tunnel-exit-run #veh \.puff\{opacity:0\}/);
assert.match(css, /body\.tunnel-enter-run #smokeLayer,body\.tunnel-exit-run #smokeLayer\{display:none\}/);

/* 48 moving nodes retain the visual weight of the former ~105-node desktop plume. */
const lobeBefore = /\.magic-puff::before\{opacity:([0-9.]+)/.exec(css);
const lobeAfter = /\.magic-puff::after\{opacity:([0-9.]+)/.exec(css);
assert.ok(lobeBefore && lobeAfter, "bounded puffs need lightweight visual lobes");
const weightedLobes = numericConstant("SMOKE_MAX_PUFFS") * (1 + Number(lobeBefore[1]) + Number(lobeAfter[1]));
assert.ok(weightedLobes >= 120, `visual plume weight ${weightedLobes.toFixed(1)} fell below the old PC baseline`);
assert.match(css, /\.magic-puff::before,\.magic-puff::after\{[^}]*background:inherit/);
assert.match(css, /body\.ios-device \.magic-puff::before,body\.ios-device \.magic-puff::after\{display:none\}/,
  "the already larger iPad puffs must not triple again and obscure the game");

class FakeStyle {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, String(value)); }
  getPropertyValue(name) { return this.values.get(name) || ""; }
}

class FakeElement {
  constructor() {
    this.children = [];
    this.className = "";
    this.dataset = {};
    this.style = new FakeStyle();
    this.parentNode = null;
    this._queries = new Map();
  }
  appendChild(child) {
    child.remove();
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  replaceChildren(...children) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    for (const child of children) this.appendChild(child);
  }
  remove() {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    if (index >= 0) this.parentNode.children.splice(index, 1);
    this.parentNode = null;
  }
  querySelector(selector) { return this._queries.get(selector) || null; }
  get firstElementChild() { return this.children[0] || null; }
  get offsetWidth() { return 1; }
  getBoundingClientRect() { return { left: 190, top: 150, width: 260, height: 130 }; }
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function createSmokeHarness({ ios, reduced, seed }) {
  let clock = 0;
  let timerId = 0;
  let maxCount = 0;
  const timers = [];
  const desktopBox = new FakeElement();
  const smokeLayer = new FakeElement();
  const veh = new FakeElement();
  veh._queries.set(".puff", desktopBox);
  veh.classList = { contains: name => name === "go" };
  const bodyClasses = new Set(["v-train"]);
  const random = seededRandom(seed);
  const math = Object.create(Math);
  math.random = random;
  const sandbox = {
    Math: math,
    Number,
    Date,
    performance: { now: () => clock },
    document: {
      body: { classList: { contains: name => bodyClasses.has(name) } },
      createElement: () => new FakeElement()
    },
    veh,
    smokeLayer,
    IOS_DEVICE: ios,
    playing: true,
    prefersReducedMotionActive: () => reduced,
    rnd: (min, max) => min + Math.floor(random() * (max - min + 1)),
    $: id => {
      assert.equal(id, "scene");
      return { getBoundingClientRect: () => ({ left: 0, top: 0, width: 844, height: 390 }) };
    },
    setTimeout(callback, delay) {
      const entry = { id: ++timerId, due: clock + Number(delay), callback };
      timers.push(entry);
      return entry.id;
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(`
    const SMOKE_INTERVAL_MIN_MS=${numericConstant("SMOKE_INTERVAL_MIN_MS")};
    const SMOKE_INTERVAL_JITTER_MS=${numericConstant("SMOKE_INTERVAL_JITTER_MS")};
    const SMOKE_LIFE_MIN_MS=${numericConstant("SMOKE_LIFE_MIN_MS")};
    const SMOKE_LIFE_JITTER_MS=${numericConstant("SMOKE_LIFE_JITTER_MS")};
    const SMOKE_MAX_PUFFS=${numericConstant("SMOKE_MAX_PUFFS")};
    const SMOKE_WARM_START_COUNT=${numericConstant("SMOKE_WARM_START_COUNT")};
    let nextMagicPuffAt=0,magicPuffsWarmed=false;
    ${extractFunction(game, "spawnMagicPuff")}
    ${extractFunction(game, "warmMagicPuffs")}
    ${extractFunction(game, "tickMagicPuffs")}
    this.tick=tickMagicPuffs;
  `, sandbox);
  const box = ios ? smokeLayer : desktopBox;

  function runTimers() {
    timers.sort((a, b) => a.due - b.due);
    while (timers.length && timers[0].due <= clock) timers.shift().callback();
  }
  function advanceTo(target) {
    while (clock < target) {
      clock = Math.min(target, clock + 16);
      runTimers();
      sandbox.tick(clock);
      maxCount = Math.max(maxCount, box.children.length);
    }
    runTimers();
  }
  function snapshot() {
    const born = box.children.map(node => Number(node.dataset.smokeBornAt));
    return {
      count: box.children.length,
      maxCount,
      youngest: born.length ? clock - Math.max(...born) : Infinity,
      born,
      puffs: [...box.children]
    };
  }
  return { advanceTo, snapshot, box };
}

const deterministic = [];
for (const ios of [false, true]) {
  for (const reduced of [false, true]) {
    const harness = createSmokeHarness({ ios, reduced, seed: 1297 });
    harness.advanceTo(16);
    const warm = harness.snapshot();
    assert.equal(warm.puffs.filter(node => Number(node.dataset.smokeAgeAtSpawn) > 0).length, 12,
      `${ios ? "iPad" : "PC"} ${reduced ? "reduced" : "normal"}: warm start is not twelve pre-aged puffs`);
    harness.advanceTo(3500);
    const at3500 = harness.snapshot();
    assert.ok(at3500.count >= 40 && at3500.count <= 48, `3.5s count ${at3500.count}`);
    assert.ok(at3500.youngest < 250, `3.5s youngest ${at3500.youngest}ms`);
    harness.advanceTo(5000);
    const at5000 = harness.snapshot();
    assert.ok(at5000.count >= 46 && at5000.count <= 48, `5s count ${at5000.count}`);
    assert.ok(at5000.youngest < 250, `5s youngest ${at5000.youngest}ms`);
    harness.advanceTo(15000);
    const at15000 = harness.snapshot();
    assert.ok(at15000.count >= 46 && at15000.count <= 48, `15s count ${at15000.count}`);
    assert.ok(at15000.maxCount <= 48, `DOM pool grew to ${at15000.maxCount}`);
    assert.ok(at15000.count <= at5000.count, "15s smoke pool kept growing after saturation");
    assert.ok(at15000.youngest < 250, `15s chimney froze for ${at15000.youngest}ms`);
    assert.deepEqual(at15000.born, [...at15000.born].sort((a, b) => a - b),
      "oldest-first recycling order was lost");
    if (reduced) {
      for (const puff of at15000.puffs) {
        const dx = parseFloat(puff.style.getPropertyValue("--puff-dx"));
        const dy = parseFloat(puff.style.getPropertyValue("--puff-dy"));
        const rotation = parseFloat(puff.style.getPropertyValue("--puff-rot"));
        const scale = parseFloat(puff.style.getPropertyValue("--puff-end-scale"));
        assert.ok(dx >= -80 && dx <= -40, `reduced x ${dx}px`);
        assert.ok(dy >= -22 && dy <= -8, `reduced y ${dy}px`);
        assert.equal(rotation, 0, "reduced puff rotated");
        assert.ok(scale >= 1.02 && scale <= 1.20, `reduced scale ${scale}`);
      }
    }
    deterministic.push({ ios, reduced, at3500, at5000, at15000 });
  }
}

for (const reduced of [false, true]) {
  const pc = deterministic.find(item => !item.ios && item.reduced === reduced);
  const ipad = deterministic.find(item => item.ios && item.reduced === reduced);
  for (const key of ["at3500", "at5000", "at15000"]) {
    assert.ok(Math.abs(pc[key].count - ipad[key].count) <= 4,
      `${reduced ? "reduced" : "normal"} ${key}: PC/iPad delta exceeded four`);
  }
}

function smokeSnapshotScript() {
  const sceneBox = document.body.classList.contains("ios-device")
    ? document.getElementById("smokeLayer")
    : document.querySelector("#veh .puff");
  const puffs = [...sceneBox.querySelectorAll(".magic-puff")];
  const born = puffs.map(puff => Number(puff.dataset.smokeBornAt));
  return {
    count: puffs.length,
    totalCount: document.querySelectorAll(".magic-puff").length,
    youngest: born.length ? performance.now() - Math.max(...born) : Infinity,
    ios: document.body.classList.contains("ios-device"),
    routeQuizAt: window.__smokeRouteQuizAt || 0,
    maxCount: window.__smokeMaxCount || puffs.length,
    reduced: puffs.map(puff => ({
      dx: parseFloat(puff.style.getPropertyValue("--puff-dx")),
      dy: parseFloat(puff.style.getPropertyValue("--puff-dy")),
      rotation: parseFloat(puff.style.getPropertyValue("--puff-rot")),
      scale: parseFloat(puff.style.getPropertyValue("--puff-end-scale"))
    }))
  };
}

async function runBrowserCheck() {
  const requested = (process.env.NAZONAZO_BROWSER || "").split(",").map(value => value.trim()).filter(Boolean);
  if (!requested.length) return;
  const base = (process.env.NAZONAZO_BASE_URL || "http://127.0.0.1:8874").replace(/\/$/, "");
  const { chromium, webkit } = require("playwright");
  for (const browserName of requested) {
    const browserType = browserName.startsWith("webkit") ? webkit : chromium;
    const launchOptions = browserName === "chromium" && process.platform === "darwin"
      ? { headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" }
      : { headless: true };
    const browser = await browserType.launch(launchOptions);
    try {
      const scenarios = [];
      for (const [width, height] of [[844, 390], [1024, 768], [1366, 768]]) {
        for (const reduced of [false, true]) scenarios.push({ width, height, reduced });
      }
      const results = await Promise.all(scenarios.map(async scenario => {
        const isWebKit = browserName.startsWith("webkit");
        const context = await browser.newContext({
          viewport: { width: scenario.width, height: scenario.height },
          hasTouch: isWebKit,
          deviceScaleFactor: isWebKit ? 2 : 1,
          isMobile: isWebKit,
          userAgent: isWebKit
            ? "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
            : undefined
        });
        await context.addInitScript(() => { window.__APP_BUILD__ = 1; });
        const page = await context.newPage();
        await page.emulateMedia({ reducedMotion: scenario.reduced ? "reduce" : "no-preference" });
        const pageErrors = [];
        const requestFailures = [];
        page.on("pageerror", error => pageErrors.push(String(error)));
        page.on("requestfailed", request => requestFailures.push(request.url()));
        await page.goto(`${base}/nazonazo-tunnel/?weather=clear`, { waitUntil: "networkidle" });
        await page.locator("#startBtn").click();
        await page.evaluate(() => {
          const started = performance.now();
          window.__smokeRouteQuizAt = 0;
          window.__smokeMaxCount = 0;
          window.__smokeKeepAlive = setInterval(() => {
            document.getElementById("veh")?.classList.add("go");
            window.__smokeMaxCount = Math.max(window.__smokeMaxCount,
              document.querySelectorAll(".magic-puff").length);
            if (!window.__smokeRouteQuizAt && document.getElementById("quiz")?.classList.contains("show")) {
              window.__smokeRouteQuizAt = performance.now() - started;
            }
          }, 25);
        });
        await page.waitForTimeout(3500);
        const at3500 = await page.evaluate(smokeSnapshotScript);
        assert.ok(at3500.count >= 40 && at3500.count <= 48,
          `${browserName} ${scenario.width}x${scenario.height} ${scenario.reduced}: 3.5s=${at3500.count}`);
        assert.equal(at3500.count, at3500.totalCount, "smoke leaked into both render containers");
        assert.ok(at3500.youngest < 250, `3.5s newest puff is ${at3500.youngest}ms old`);
        if (process.env.NAZONAZO_SMOKE_SCREENSHOTS === "1") {
          const suffix = `${browserName}-${scenario.width}x${scenario.height}-${scenario.reduced ? "reduced" : "normal"}`;
          await page.screenshot({ path: `/tmp/pono-1297-smoke-${suffix}.png` });
        }
        await page.waitForTimeout(1500);
        const at5000 = await page.evaluate(smokeSnapshotScript);
        assert.ok(at5000.count >= 46 && at5000.count <= 48, `5s=${at5000.count}`);
        assert.ok(at5000.youngest < 250, `5s newest puff is ${at5000.youngest}ms old`);
        await page.waitForTimeout(10000);
        const at15000 = await page.evaluate(smokeSnapshotScript);
        assert.ok(at15000.count >= 46 && at15000.count <= 48, `15s=${at15000.count}`);
        assert.ok(at15000.maxCount <= 48, `smoke DOM grew past its cap to ${at15000.maxCount}`);
        assert.ok(at15000.youngest < 250, `15s chimney froze for ${at15000.youngest}ms`);
        assert.ok(at15000.routeQuizAt > 0 && at15000.routeQuizAt <= 13000,
          `route timing changed: first quiz ${at15000.routeQuizAt}ms`);
        assert.equal(at15000.ios, isWebKit, `${browserName}: iPad rendering path mismatch`);
        if (scenario.reduced) {
          for (const puff of at15000.reduced) {
            assert.ok(puff.dx >= -80 && puff.dx <= -40, `reduced x ${puff.dx}`);
            assert.ok(puff.dy >= -22 && puff.dy <= -8, `reduced y ${puff.dy}`);
            assert.equal(puff.rotation, 0);
            assert.ok(puff.scale >= 1.02 && puff.scale <= 1.20, `reduced scale ${puff.scale}`);
          }
        }
        assert.deepEqual(pageErrors, [], `${browserName}: page errors\n${pageErrors.join("\n")}`);
        assert.deepEqual(requestFailures, [], `${browserName}: request failures\n${requestFailures.join("\n")}`);
        await context.close();
        return { scenario, at3500, at5000, at15000 };
      }));
      for (const reduced of [false, true]) {
        const set = results.filter(result => result.scenario.reduced === reduced);
        const counts = set.map(result => result.at5000.count);
        assert.ok(Math.max(...counts) - Math.min(...counts) <= 4,
          `${browserName} viewport parity exceeded four puffs: ${counts.join(",")}`);
      }
      console.log(`${browserName} smoke measurements: ${results.map(result =>
        `${result.scenario.width}x${result.scenario.height}/${result.scenario.reduced ? "reduced" : "normal"}=` +
        `${result.at3500.count},${result.at5000.count},${result.at15000.count}`
      ).join(" | ")}`);
    } finally {
      await browser.close();
    }
  }
}

runBrowserCheck().then(() => {
  console.log("nazonazo smoke density regression: PASS");
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
