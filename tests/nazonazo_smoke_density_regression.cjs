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
  SMOKE_WARM_START_COUNT: 18,
  SMOKE_WARM_MAX_AGE_MS: 1600
})) assert.equal(numericConstant(name), expected, `${name}: density contract changed`);

assert.doesNotMatch(game, /\b(?:IOS|REDUCED)_SMOKE_(?:INTERVAL|LIFE|MAX)/,
  "desktop, iPad and reduced motion must not diverge in smoke density");
assert.match(html, /styles\.css\?v=20260715-1304/);
assert.match(html, /js\/game\.js\?v=20260715-1304/);
assert.match(serviceWorker, /v2186: なぞなぞトレインの煙/);
assert.ok(Number(serviceWorker.match(/const CACHE_VERSION = (\d+);/)?.[1]) >= 2193,
  "later game releases may advance the global service-worker cache version");
assert.match(css, /body\.tunnel-enter-run #veh \.puff,body\.tunnel-exit-run #veh \.puff\{opacity:0\}/);
assert.match(css, /body\.tunnel-enter-run #smokeLayer,body\.tunnel-exit-run #smokeLayer\{display:none\}/);
assert.match(css, /body\.tunnel-interior #veh \.puff,body\.tunnel-interior #smokeLayer\{display:none!important\}/,
  "tunnel interior must hard-hide both smoke render paths");
assert.match(game, /function smokeCanRun\(\)/);
assert.match(game, /!document\.body\.classList\.contains\("tunnel-interior"\)/);

/* 48 nodes: each has main+before, and every fourth gets one after lobe. */
const lobeBefore = /\.magic-puff::before\{opacity:([0-9.]+)/.exec(css);
const lobeAfter = /\.magic-puff::after\{[^}]*opacity:([0-9.]+)/.exec(css);
assert.ok(lobeBefore && lobeAfter, "bounded puffs need lightweight visual lobes");
const tripleCount = numericConstant("SMOKE_MAX_PUFFS") / 4;
const logicalLobes = numericConstant("SMOKE_MAX_PUFFS") * 2 + tripleCount;
const weightedLobes = numericConstant("SMOKE_MAX_PUFFS") * (1 + Number(lobeBefore[1])) + tripleCount * Number(lobeAfter[1]);
assert.equal(logicalLobes, 108, "desktop logical lobe budget changed");
assert.equal(Number(weightedLobes.toFixed(2)), 102.96, "desktop opacity-weighted lobe budget changed");
assert.match(css, /\.magic-puff::before,\.magic-puff::after\{[^}]*background:inherit/);
assert.match(css, /\.magic-puff\.magic-puff--triple::after\{display:block\}/);
assert.match(css, /body\.ios-device \.magic-puff::before,body\.ios-device \.magic-puff::after\{display:none\}/,
  "iPad must render one logical lobe per puff");

class FakeStyle {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, String(value)); }
  getPropertyValue(name) { return this.values.get(name) || ""; }
}

class FakeElement {
  constructor() {
    this.children = [];
    this.className = "";
    this._classNames = new Set();
    this.classList = {
      add: (...names) => names.forEach(name => this._classNames.add(name)),
      remove: (...names) => names.forEach(name => this._classNames.delete(name)),
      contains: name => this._classNames.has(name)
    };
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
  veh.classList.add("go");
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
    const SMOKE_WARM_MAX_AGE_MS=${numericConstant("SMOKE_WARM_MAX_AGE_MS")};
    let nextMagicPuffAt=0,smokeRunning=false,smokeSerial=0;
    ${extractFunction(game, "smokeCanRun")}
    ${extractFunction(game, "recycleOldestMagicPuff")}
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
  function setRunning(running) {
    if (running) veh.classList.add("go");
    else veh.classList.remove("go");
  }
  function setTunnel(active) {
    if (active) bodyClasses.add("tunnel-interior");
    else bodyClasses.delete("tunnel-interior");
  }
  return { advanceTo, snapshot, box, setRunning, setTunnel };
}

const deterministic = [];
for (const ios of [false, true]) {
  for (const reduced of [false, true]) {
    const harness = createSmokeHarness({ ios, reduced, seed: 1297 });
    harness.advanceTo(16);
    const warm = harness.snapshot();
    assert.equal(warm.puffs.filter(node => Number(node.dataset.smokeAgeAtSpawn) > 0).length, 18,
      `${ios ? "iPad" : "PC"} ${reduced ? "reduced" : "normal"}: warm start is not eighteen pre-aged puffs`);
    assert.ok(Math.max(...warm.puffs.map(node => Number(node.dataset.smokeAgeAtSpawn))) <= 1600,
      "warm-start age exceeded 1600ms");
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
        const start = parseFloat(puff.style.getPropertyValue("--puff-start-scale"));
        assert.ok(dx >= -20 && dx <= -8, `reduced x ${dx}px`);
        assert.ok(dy >= -9 && dy <= -3, `reduced y ${dy}px`);
        assert.equal(rotation, 0, "reduced puff rotated");
        assert.ok(start >= 1.15 && start <= 1.35, `reduced start scale ${start}`);
        assert.ok(scale >= start && scale <= start + .04, `reduced scale ${start} -> ${scale}`);
      }
      assert.equal(new Set(at15000.puffs.map(puff => puff.dataset.smokeSlot)).size, 48,
        "reduced smoke did not occupy all deterministic distribution slots");
    }
    deterministic.push({ ios, reduced, at3500, at5000, at15000 });
  }
}

/* A real stop drains naturally; every subsequent false→true edge gets a new warm start. */
{
  const harness = createSmokeHarness({ ios: false, reduced: false, seed: 2197 });
  harness.advanceTo(16);
  assert.equal(harness.snapshot().count, 18);
  harness.setRunning(false);
  harness.advanceTo(7016);
  assert.equal(harness.snapshot().count, 0, "stopped smoke did not drain within seven seconds");
  harness.setRunning(true);
  harness.advanceTo(7032);
  assert.equal(harness.snapshot().count, 18, "first restart did not warm-start");
  harness.setRunning(false);
  harness.advanceTo(14032);
  assert.equal(harness.snapshot().count, 0, "second stop did not drain");
  harness.setRunning(true);
  harness.advanceTo(14048);
  assert.equal(harness.snapshot().count, 18, "second restart did not warm-start");
  harness.setTunnel(true);
  harness.advanceTo(14064);
  harness.setTunnel(false);
  harness.advanceTo(14080);
  assert.ok(harness.snapshot().count >= 18, "outdoor return did not create a new warm edge");
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
    warmCount: puffs.filter(puff => Number(puff.dataset.smokeAgeAtSpawn) > 0).length,
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

function percentile(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))];
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// Frozen from commit 35785611 (the last rich-PC plume): Chrome 1024x768,
// seed 1297, real quiz stop 7s -> answer -> 5s drive, smoke-only isolation.
// Seven independent runs used this same frozen-snapshot central-96%-alpha
// algorithm; these are their medians (each run is itself three settled frames).
const OLD_PC_SMOKE_GOLDEN = Object.freeze({
  ink: 31122.47843137139,
  centralWidth: 341,
  centralHeight: 116
});
const SMOKE_RAW_RUNAWAY_MAX = Object.freeze({ width: 539, height: 225 });

function withDeadline(label, milliseconds, operation) {
  let timer = 0;
  return Promise.race([
    Promise.resolve().then(operation),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} exceeded ${milliseconds}ms`)), milliseconds);
    })
  ]).finally(() => clearTimeout(timer));
}

async function smokeAlphaMetrics(page, screenshotPath) {
  await page.evaluate(() => {
    const liveSource = document.body.classList.contains("ios-device")
      ? document.getElementById("smokeLayer")
      : document.querySelector("#veh .puff");
    if (!liveSource) throw new Error("live smoke source missing");
    const snapshot = liveSource.cloneNode(false);
    snapshot.id = "smokeMeasurementSnapshot";
    snapshot.dataset.smokeMeasurementSnapshot = "1";
    const sourceStyle = getComputedStyle(liveSource);
    for (const property of [
      "position", "left", "top", "right", "bottom", "width", "height", "z-index",
      "overflow", "opacity", "transform", "contain", "isolation", "pointer-events", "display"
    ]) snapshot.style.setProperty(property, sourceStyle.getPropertyValue(property));
    for (const puff of liveSource.querySelectorAll(".magic-puff")) {
      puff.style.animationPlayState = "paused";
      const style = getComputedStyle(puff);
      const frozen = puff.cloneNode(true);
      frozen.style.setProperty("animation", "none", "important");
      frozen.style.setProperty("transform", style.transform, "important");
      frozen.style.setProperty("opacity", style.opacity, "important");
      snapshot.appendChild(frozen);
    }
    liveSource.dataset.smokeMeasurementLive = "1";
    liveSource.after(snapshot);
  });
  await page.addStyleTag({ content: `
    html,body,#app,#scene{background:none!important;background-image:none!important}
    body *{visibility:hidden!important;box-shadow:none!important}
    [data-smoke-measurement-live]{visibility:hidden!important}
    html,body,#app,#scene,#veh,#smokeMeasurementSnapshot,
    #smokeMeasurementSnapshot .magic-puff{visibility:visible!important}
  ` });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const frames = [];
  for (let frame = 0; frame < 3; frame += 1) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    const buffer = await page.screenshot({ omitBackground: true, scale: "css" });
    if (screenshotPath && frame === 1) fs.writeFileSync(screenshotPath, buffer);
    frames.push(await page.evaluate(async encoded => {
      const response = await fetch(`data:image/png;base64,${encoded}`);
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
      const xMass = new Float64Array(bitmap.width);
      const yMass = new Float64Array(bitmap.height);
      let ink = 0;
      let minX = bitmap.width;
      let minY = bitmap.height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < bitmap.height; y += 1) {
        for (let x = 0; x < bitmap.width; x += 1) {
          const alpha = pixels[(y * bitmap.width + x) * 4 + 3];
          const weight = alpha / 255;
          ink += weight;
          xMass[x] += weight;
          yMass[y] += weight;
          if (alpha < 3) continue;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
      const centralRange = mass => {
        const lowTarget = ink * .02;
        const highTarget = ink * .98;
        let cumulative = 0;
        let low = 0;
        let high = mass.length - 1;
        let lowFound = false;
        for (let index = 0; index < mass.length; index += 1) {
          cumulative += mass[index];
          if (!lowFound && cumulative >= lowTarget) {
            low = index;
            lowFound = true;
          }
          if (cumulative >= highTarget) {
            high = index;
            break;
          }
        }
        return { low, high, size: ink > 0 ? high - low + 1 : 0 };
      };
      const centralX = centralRange(xMass);
      const centralY = centralRange(yMass);
      return {
        ink,
        centralWidth: centralX.size,
        centralHeight: centralY.size,
        rawWidth: maxX >= minX ? maxX - minX + 1 : 0,
        rawHeight: maxY >= minY ? maxY - minY + 1 : 0,
        settledCount: document.querySelectorAll("#smokeMeasurementSnapshot .magic-puff").length
      };
    }, buffer.toString("base64")));
  }
  assert.equal(new Set(frames.map(frame => frame.settledCount)).size, 1,
    "settled smoke snapshot changed between frames");
  return {
    ink: median(frames.map(frame => frame.ink)),
    centralWidth: median(frames.map(frame => frame.centralWidth)),
    centralHeight: median(frames.map(frame => frame.centralHeight)),
    rawWidth: Math.max(...frames.map(frame => frame.rawWidth)),
    rawHeight: Math.max(...frames.map(frame => frame.rawHeight)),
    rawFrames: frames.map(frame => `${frame.rawWidth}x${frame.rawHeight}`)
  };
}

async function runBrowserCheck() {
  const requested = (process.env.NAZONAZO_BROWSER || "").split(",").map(value => value.trim()).filter(Boolean);
  if (!requested.length) return;
  const base = (process.env.NAZONAZO_BASE_URL || "http://127.0.0.1:8874").replace(/\/$/, "");
  const { chromium, webkit } = require("playwright");
  const fullMatrix = process.env.NAZONAZO_SMOKE_PROFILE === "full";
  const allResults = [];
  for (const browserName of requested) {
    const browserType = browserName.startsWith("webkit") ? webkit : chromium;
    const launchOptions = browserName === "chromium" && process.platform === "darwin"
      ? { headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" }
      : { headless: true };
    const browser = await browserType.launch(launchOptions);
    try {
      const scenarios = [];
      if (fullMatrix) {
        for (const [width, height] of [[844, 390], [1024, 768], [1366, 768]]) {
          for (const reduced of [false, true]) {
            scenarios.push({ width, height, reduced });
          }
        }
      } else if (browserName.startsWith("webkit")) {
        // iPad mini landscape: verify both the normal and reduced-motion visual plume.
        scenarios.push(
          { width: 1024, height: 768, reduced: false },
          { width: 1024, height: 768, reduced: true }
        );
      } else {
        // PC: use the same CSS viewport as iPad for a controlled cross-engine alpha comparison.
        scenarios.push({ width: 1024, height: 768, reduced: false });
      }
      const results = [];
      for (const scenario of scenarios) {
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
        try {
          await context.addInitScript(seed => {
            window.__APP_BUILD__ = 1;
            let state = seed >>> 0;
            Math.random = () => {
              state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
              return state / 0x100000000;
            };
          }, 1297);
          const page = await context.newPage();
          page.setDefaultTimeout(12000);
          page.setDefaultNavigationTimeout(12000);
          await page.emulateMedia({ reducedMotion: scenario.reduced ? "reduce" : "no-preference" });
          const pageErrors = [];
          const requestFailures = [];
          page.on("pageerror", error => pageErrors.push(String(error)));
          page.on("requestfailed", request => requestFailures.push(request.url()));
          const measurement = await withDeadline(
            `${browserName} ${scenario.width}x${scenario.height}/${scenario.reduced ? "reduced" : "normal"}`,
            45000,
            async () => {
              const routeStartedAt = Date.now();
              await page.goto(`${base}/nazonazo-tunnel/?weather=clear`, { waitUntil: "networkidle" });
              await page.locator("#startBtn").click();
              await page.evaluate(() => {
                window.__smokeFrameTimes = [];
                window.__smokeObserveDrive = false;
                window.__smokeMaxCount = 0;
                const watch = now => {
                  if (window.__smokeObserveDrive) {
                    window.__smokeFrameTimes.push(now);
                    window.__smokeMaxCount = Math.max(window.__smokeMaxCount,
                      document.querySelectorAll(".magic-puff").length);
                  }
                  requestAnimationFrame(watch);
                };
                requestAnimationFrame(watch);
              });
              await page.waitForFunction(() => document.getElementById("quiz")?.classList.contains("show"), null, { timeout: 20000 });
              const routeQuizAt = Date.now() - routeStartedAt;
              assert.ok(routeQuizAt > 0 && routeQuizAt <= 15000, `route timing changed: first quiz ${routeQuizAt}ms`);
              assert.equal(await page.locator("#veh").evaluate(node => node.classList.contains("go")), false,
                "quiz stop retained the running class");
              await page.waitForTimeout(7000);
              const stopped = await page.evaluate(smokeSnapshotScript);
              assert.equal(stopped.totalCount, 0,
                `${browserName} ${scenario.width}x${scenario.height}: stopped plume did not drain`);
              await page.locator("#choices .choice[data-ok='1']").click();
              await page.waitForFunction(() => {
                const quiz = document.getElementById("quiz");
                return document.getElementById("veh")?.classList.contains("go") && !quiz?.classList.contains("show");
              }, null, { timeout: 10000 });
              const restartWarm = await page.evaluate(smokeSnapshotScript);
              assert.ok(restartWarm.warmCount >= 18,
                `restart had only ${restartWarm.warmCount} pre-aged warm puffs`);
              const driveStart = await page.evaluate(() => {
                window.__smokeFrameTimes = [];
                window.__smokeMaxCount = 0;
                window.__smokeObserveDrive = true;
                return performance.now();
              });
              await page.waitForTimeout(3500);
              const at3500 = await page.evaluate(smokeSnapshotScript);
              assert.ok(at3500.count >= 42 && at3500.count <= 48,
                `${browserName} ${scenario.width}x${scenario.height} ${scenario.reduced}: 3.5s=${at3500.count}`);
              assert.equal(at3500.count, at3500.totalCount, "smoke leaked into both render containers");
              assert.ok(at3500.youngest < 250, `3.5s newest puff is ${at3500.youngest}ms old`);
              await page.waitForTimeout(1500);
              const at5000 = await page.evaluate(smokeSnapshotScript);
              const perf = await page.evaluate(() => {
                window.__smokeObserveDrive = false;
                return { frames: window.__smokeFrameTimes, maxCount: window.__smokeMaxCount };
              });
              assert.ok(at5000.count >= 46 && at5000.count <= 48, `5s=${at5000.count}`);
              assert.ok(at5000.youngest < 250, `5s newest puff is ${at5000.youngest}ms old`);
              assert.ok(perf.maxCount <= 48, `smoke DOM grew past its cap to ${perf.maxCount}`);
              assert.equal(at5000.ios, isWebKit, `${browserName}: iPad rendering path mismatch`);
              const frameTimes = perf.frames.filter(time => time >= driveStart && time <= driveStart + 5000);
              const frameDeltas = frameTimes.slice(1).map((time, index) => time - frameTimes[index]);
              const callbacksPerSecond = [];
              assert.ok(frameDeltas.length >= 75, `real drive produced only ${frameDeltas.length} frame intervals`);
              assert.ok(percentile(frameDeltas, .5) <= 25, `rAF median ${percentile(frameDeltas, .5)}ms`);
              assert.ok(percentile(frameDeltas, .95) <= 66, `rAF p95 ${percentile(frameDeltas, .95)}ms`);
              for (let second = 0; second < 5; second += 1) {
                const callbacks = frameTimes.filter(time => time >= driveStart + second * 1000 && time < driveStart + (second + 1) * 1000).length;
                callbacksPerSecond.push(callbacks);
                assert.ok(callbacks >= 15, `second ${second + 1} had only ${callbacks} rAF callbacks`);
              }
              if (scenario.reduced) {
                for (const puff of at5000.reduced) {
                  assert.ok(puff.dx >= -20 && puff.dx <= -8, `reduced x ${puff.dx}`);
                  assert.ok(puff.dy >= -9 && puff.dy <= -3, `reduced y ${puff.dy}`);
                  assert.equal(puff.rotation, 0);
                  assert.ok(puff.scale >= 1.15 && puff.scale <= 1.39, `reduced scale ${puff.scale}`);
                }
              }
              const suffix = `${browserName}-${scenario.width}x${scenario.height}-${scenario.reduced ? "reduced" : "normal"}`;
              const alpha = await smokeAlphaMetrics(page,
                process.env.NAZONAZO_SMOKE_SCREENSHOTS === "1" ? `/tmp/pono-1297-smoke-${suffix}.png` : "");
              assert.deepEqual(pageErrors, [], `${browserName}: page errors\n${pageErrors.join("\n")}`);
              assert.deepEqual(requestFailures, [], `${browserName}: request failures\n${requestFailures.join("\n")}`);
              return {
                browserName,
                scenario,
                at3500,
                at5000,
                alpha,
                raf: {
                  samples: frameDeltas.length,
                  median: percentile(frameDeltas, .5),
                  p95: percentile(frameDeltas, .95),
                  minPerSecond: Math.min(...callbacksPerSecond)
                }
              };
            }
          );
          results.push(measurement);
          console.log(`${browserName} settled ${scenario.width}x${scenario.height}/${scenario.reduced ? "reduced" : "normal"}: ` +
            `ink=${measurement.alpha.ink.toFixed(0)},central=${measurement.alpha.centralWidth}x${measurement.alpha.centralHeight},` +
            `raw<=${measurement.alpha.rawWidth}x${measurement.alpha.rawHeight}`);
        } finally {
          await context.close();
        }
      }
      for (const reduced of [false, true]) {
        const set = results.filter(result => result.scenario.reduced === reduced);
        const counts = set.map(result => result.at5000.count);
        if (counts.length < 2) continue;
        assert.ok(Math.max(...counts) - Math.min(...counts) <= 4,
          `${browserName} viewport parity exceeded four puffs: ${counts.join(",")}`);
      }
      for (const result of results) {
        assert.ok(result.alpha.rawWidth <= SMOKE_RAW_RUNAWAY_MAX.width,
          `${browserName} raw smoke width ran away to ${result.alpha.rawWidth}px`);
        assert.ok(result.alpha.rawHeight <= SMOKE_RAW_RUNAWAY_MAX.height,
          `${browserName} raw smoke height ran away to ${result.alpha.rawHeight}px`);
      }
      for (const result of results.filter(item => !item.scenario.reduced)) {
        assert.ok(result.alpha.ink >= OLD_PC_SMOKE_GOLDEN.ink * .85 &&
          result.alpha.ink <= OLD_PC_SMOKE_GOLDEN.ink * 1.15,
        `${browserName} normal alpha ink ${result.alpha.ink.toFixed(0)} left old-PC ±15% range`);
        const widthRatio = result.alpha.centralWidth / OLD_PC_SMOKE_GOLDEN.centralWidth;
        const heightRatio = result.alpha.centralHeight / OLD_PC_SMOKE_GOLDEN.centralHeight;
        assert.ok(widthRatio >= .8 && widthRatio <= 1.2,
          `${browserName} normal central width ratio ${widthRatio.toFixed(3)} left old-PC 80–120% range`);
        assert.ok(heightRatio >= .8 && heightRatio <= 1.2,
          `${browserName} normal central height ratio ${heightRatio.toFixed(3)} left old-PC 80–120% range`);
      }
      const normalResults = results.filter(item => !item.scenario.reduced);
      const deviceNormal = normalResults.length ? {
        ink: median(normalResults.map(result => result.alpha.ink)),
        centralWidth: median(normalResults.map(result => result.alpha.centralWidth)),
        centralHeight: median(normalResults.map(result => result.alpha.centralHeight))
      } : null;
      const reducedInkRatios = [];
      for (const reduced of results.filter(item => item.scenario.reduced)) {
        if (!deviceNormal) continue;
        const normal = normalResults.find(item =>
          item.scenario.width === reduced.scenario.width && item.scenario.height === reduced.scenario.height);
        assert.ok(normal, `${browserName}: matching normal smoke metric missing for ${reduced.scenario.width}x${reduced.scenario.height}`);
        const inkRatio = reduced.alpha.ink / normal.alpha.ink;
        reducedInkRatios.push(inkRatio);
        assert.ok(inkRatio >= .75 && inkRatio <= 1.15,
          `${browserName} ${reduced.scenario.width}x${reduced.scenario.height} reduced/normal ink ratio ${inkRatio.toFixed(3)}`);
        const widthRatio = reduced.alpha.centralWidth / deviceNormal.centralWidth;
        const heightRatio = reduced.alpha.centralHeight / deviceNormal.centralHeight;
        assert.ok(widthRatio >= .75 && widthRatio <= 1.2,
          `${browserName} reduced central width ratio ${widthRatio.toFixed(3)} vs device normal`);
        assert.ok(heightRatio >= .7 && heightRatio <= 1.2,
          `${browserName} reduced central height ratio ${heightRatio.toFixed(3)} vs device normal`);
      }
      if (reducedInkRatios.length) {
        const deviceRatio = median(reducedInkRatios);
        assert.ok(deviceRatio >= .82 && deviceRatio <= 1.10,
          `${browserName} median reduced/normal ink ratio ${deviceRatio.toFixed(3)}`);
      }
      console.log(`${browserName} smoke measurements: ${results.map(result =>
        `${result.scenario.width}x${result.scenario.height}/${result.scenario.reduced ? "reduced" : "normal"}=` +
        `${result.at3500.count},${result.at5000.count}; ink=${result.alpha.ink.toFixed(0)},` +
        `central=${result.alpha.centralWidth}x${result.alpha.centralHeight},` +
        `raw<=${result.alpha.rawWidth}x${result.alpha.rawHeight}[${result.alpha.rawFrames.join(",")}]; ` +
        `rAF=${result.raf.median.toFixed(1)}/${result.raf.p95.toFixed(1)}ms,min=${result.raf.minPerSecond}/s`
      ).join(" | ")}`);
      allResults.push(...results);

      /* Complete five real questions on the fast route and verify smoke cannot cover tunnel silhouettes.
         The representative matrix runs this on iPad/WebKit, the riskiest independent smoke layer. */
      const shouldCheckTunnel = fullMatrix || browserName.startsWith("webkit") || !requested.some(name => name.startsWith("webkit"));
      if (!shouldCheckTunnel) continue;
      const tunnelContext = await browser.newContext({
        viewport: { width: 844, height: 390 },
        hasTouch: browserName.startsWith("webkit"),
        deviceScaleFactor: browserName.startsWith("webkit") ? 2 : 1,
        isMobile: browserName.startsWith("webkit"),
        userAgent: browserName.startsWith("webkit")
          ? "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
          : undefined
      });
      try {
        await withDeadline(`${browserName} tunnel smoke exclusion`, 45000, async () => {
          await tunnelContext.addInitScript(() => { window.__APP_BUILD__ = 1; });
          const page = await tunnelContext.newPage();
          page.setDefaultTimeout(10000);
          page.setDefaultNavigationTimeout(12000);
          await page.goto(`${base}/nazonazo-tunnel/?weather=clear#fast`, { waitUntil: "networkidle" });
          await page.locator("#startBtn").click();
          for (let question = 0; question < 5; question += 1) {
            await page.waitForFunction(() => document.getElementById("quiz")?.classList.contains("show"), null, { timeout: 10000 });
            await page.locator("#choices .choice[data-ok='1']").click();
            await page.waitForFunction(() => !document.getElementById("quiz")?.classList.contains("show"), null, { timeout: 5000 });
          }
          await page.waitForFunction(() => document.body.classList.contains("tunnel-interior"), null, { timeout: 15000 });
          await page.waitForFunction(() => document.querySelectorAll(".tunnel-friend").length > 0, null, { timeout: 3000 });
          const tunnelCheckedAt = Date.now();
          assert.equal(await page.locator(".magic-puff").count(), 0, `${browserName}: smoke remained at tunnel entry`);
          const hitCheck = await page.evaluate(() => {
            const candidates = [...document.querySelectorAll(".tunnel-friend")].filter(button => {
              const rect = button.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight;
            });
            return candidates.map(button => {
              const rect = button.getBoundingClientRect();
              const x = Math.max(1, Math.min(innerWidth - 1, rect.left + rect.width / 2));
              const y = Math.max(1, Math.min(innerHeight - 1, rect.top + rect.height / 2));
              const hit = document.elementFromPoint(x, y);
              return !!hit && (hit === button || button.contains(hit));
            });
          });
          assert.ok(hitCheck.length > 0, `${browserName}: no tunnel silhouette entered the viewport`);
          assert.ok(hitCheck.some(Boolean), `${browserName}: tunnel silhouettes were blocked from hit-testing`);
          await page.waitForTimeout(Math.max(0, 2000 - (Date.now() - tunnelCheckedAt)));
          assert.equal(await page.locator(".magic-puff").count(), 0, `${browserName}: smoke respawned inside tunnel`);
        });
      } finally {
        await tunnelContext.close();
      }
    } finally {
      await browser.close();
    }
  }
  const pcResults = allResults.filter(result => !result.browserName.startsWith("webkit") && !result.scenario.reduced);
  const ipadResults = allResults.filter(result => result.browserName.startsWith("webkit") && !result.scenario.reduced);
  if (pcResults.length && ipadResults.length) {
    for (const pc of pcResults) {
      const ipad = ipadResults.find(result =>
        result.scenario.width === pc.scenario.width && result.scenario.height === pc.scenario.height);
      assert.ok(ipad, "matching iPad smoke metric missing");
      // Fable contract is a symmetric cross-engine delta, intentionally normalized by the larger ink mass.
      const engineDelta = Math.abs(ipad.alpha.ink - pc.alpha.ink) / Math.max(pc.alpha.ink, ipad.alpha.ink);
      assert.ok(engineDelta <= .15,
        `iPad/PC ink delta ${(engineDelta * 100).toFixed(1)}% exceeds 15% at ${pc.scenario.width}x${pc.scenario.height}`);
    }
  }
}

runBrowserCheck().then(() => {
  console.log("nazonazo smoke density regression: PASS");
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
