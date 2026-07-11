#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const html = read("nazonazo-tunnel/index.html");
const css = read("nazonazo-tunnel/styles.css");
const js = read("nazonazo-tunnel/js/game.js");

const animals = [
  "monkey", "owl", "toucans", "butterflies",
  "sloth", "snake", "frog", "crocodile",
  "elephant", "giraffe", "lion", "zebra"
];

for (const id of ["Far", "Mid", "Near"]) {
  assert.match(html, new RegExp(`id="jungleAnimals${id}"[^>]*class="jungle-animal-layer"[^>]*aria-hidden="true"`));
}
assert.match(html, /id="jungleAnimalsNear"[\s\S]*?id="world"/, "near animals must remain behind stations/train world");
assert.match(css, /\.jungle-animal-layer\{[^}]*pointer-events:none/);
assert.match(css, /body\.st-jungle \.jungle-animal-layer\{display:block\}/);
assert.match(css, /body\.tunnel-interior \.jungle-animal-layer\{display:none!important\}/);
assert.match(css, /#jungleAnimalsNear\{[^}]*bottom:14\.5vh/);
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*?\.jungle-animal-art\{animation:none!important;transform:none!important\}/);
const motionStart = css.indexOf("@keyframes jungleAnimalSway");
const motionEnd = css.indexOf("#groundT", motionStart);
const motionCss = css.slice(motionStart, motionEnd);
assert.ok(motionStart >= 0 && motionEnd > motionStart);
assert.doesNotMatch(motionCss, /(?:left|right|top|bottom|filter|background-position)\s*:/, "animal keyframes must stay transform-only");

assert.match(js, /if\(window\.__PONO_TIER_LOCKED__\)return;/, "LP lock must not build app-only animals");
assert.match(js, /const limit=IOS_DEVICE\?Math\.min\(5,layout\.length\):layout\.length;/, "iOS sprite cap missing");
assert.match(js, /if\(!jungleAnimalSprites\.length\|\|tunnelInteriorMode\|\|!document\.body\.classList\.contains\("st-jungle"\)\)return;/);
assert.match(js, /if\(renderKey===lastJungleAnimalRenderKey\)return;/, "stationary frames must not rewrite every animal transform");
assert.match(js, /renderSeaFish\(now\);\s*renderJungleAnimals\(\);/);
assert.doesNotMatch(js.slice(js.indexOf("function buildJungleAnimals"), js.indexOf("function renderJungleAnimals")), /addEventListener|bindTap/, "ambient animals must not be interactive");

for (const animal of animals) {
  const rel = `assets/images/nazonazo-tunnel/jungle_animal_${animal}_20260711.webp`;
  const full = path.join(root, rel);
  assert.ok(fs.existsSync(full), `${rel} missing`);
  const stat = fs.statSync(full);
  assert.ok(stat.size > 1000 && stat.size < 3 * 1024 * 1024, `${rel} unexpected size ${stat.size}`);
  const buf = fs.readFileSync(full);
  assert.equal(buf.subarray(0, 4).toString("ascii"), "RIFF", `${rel} is not RIFF WebP`);
  assert.equal(buf.subarray(8, 12).toString("ascii"), "WEBP", `${rel} is not WebP`);
  assert.ok(buf.includes(Buffer.from("ALPH")), `${rel} must contain alpha data`);
  assert.match(js, new RegExp(`jungle_animal_${animal}_20260711\\.webp`));
}

async function runBrowser(browserName) {
  const { chromium, webkit } = require("playwright");
  const isIOS = browserName === "webkit-ios";
  const browserType = browserName.startsWith("webkit") ? webkit : chromium;
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    userAgent: isIOS
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
      : undefined
  });
  const page = await context.newPage();
  const errors = [];
  const failed = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("requestfailed", request => failed.push(`${request.method()} ${request.url()} ${request.failure() && request.failure().errorText}`));
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
  });
  const base = process.env.NAZONAZO_BASE_URL || "http://127.0.0.1:8765";
  await page.goto(`${base}/nazonazo-tunnel/?weather=clear#fast`, { waitUntil: "networkidle" });
  await page.locator("#startBtn").click();
  for (let i = 0; i < 5; i += 1) {
    const correct = page.locator('#quiz.show .choice[data-ok="1"]');
    await correct.waitFor({ state: "visible", timeout: 20000 });
    await correct.click();
    await page.waitForFunction(() => !document.getElementById("quiz").classList.contains("show"), null, { timeout: 5000 });
  }
  try {
    await page.waitForFunction(() => document.body.classList.contains("st-jungle"), null, { timeout: 70000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      bodyClass: document.body.className,
      locked: Boolean(window.__PONO_TIER_LOCKED__),
      sprites: document.querySelectorAll(".jungle-animal-sprite").length,
      quizShown: document.getElementById("quiz").classList.contains("show"),
      question: document.getElementById("qText").textContent,
      stamp: document.getElementById("stamp").textContent
    }));
    throw new Error(`${browserName}: jungle transition timeout ${JSON.stringify(diagnostic)} pageerrors=${JSON.stringify(errors)}`, { cause: error });
  }
  await page.waitForFunction(() => document.querySelectorAll(".jungle-animal-sprite").length >= 15, null, { timeout: 20000 });
  await page.locator("#quiz.show").waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(() => Array.from(document.querySelectorAll(".jungle-animal-art")).every(img => img.complete && img.naturalWidth > 0), null, { timeout: 20000 });

  const scene = await page.evaluate(() => {
    const layers = ["jungleAnimalsFar", "jungleAnimalsMid", "jungleAnimalsNear"].map(id => {
      const el = document.getElementById(id);
      const r = el.getBoundingClientRect();
      return { id, display: getComputedStyle(el).display, pointer: getComputedStyle(el).pointerEvents, z: getComputedStyle(el).zIndex, bottom: r.bottom };
    });
    const visible = Array.from(document.querySelectorAll(".jungle-animal-sprite")).filter(el => {
      const r = el.getBoundingClientRect();
      return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight && Number(getComputedStyle(el).opacity) > 0;
    }).length;
    const choice = document.querySelector(".choice");
    const cr = choice.getBoundingClientRect();
    const hit = document.elementFromPoint(cr.left + cr.width / 2, cr.top + cr.height / 2);
    return {
      layers,
      visible,
      count: document.querySelectorAll(".jungle-animal-sprite").length,
      nearBeforeWorld: document.getElementById("jungleAnimalsNear").nextElementSibling.id === "world",
      animalIntercept: Boolean(hit && hit.closest(".jungle-animal-layer")),
      overflowX: document.documentElement.scrollWidth - innerWidth,
      overflowY: document.documentElement.scrollHeight - innerHeight
    };
  });
  assert.equal(scene.count, isIOS ? 15 : 18, `${browserName}: unexpected per-depth sprite cap`);
  assert.ok(scene.visible >= (isIOS ? 8 : 10), `${browserName}: expected plentiful visible wildlife, got ${scene.visible}`);
  assert.ok(scene.layers.every(layer => layer.display === "block" && layer.pointer === "none"), `${browserName}: invalid layer state`);
  assert.deepEqual(scene.layers.map(layer => layer.z), ["1", "2", "3"]);
  assert.ok(Math.abs(scene.layers[2].bottom - 390 * 0.855) < 3, `${browserName}: near clipping boundary drifted`);
  assert.ok(scene.nearBeforeWorld, `${browserName}: near animals must remain before the world layer`);
  assert.equal(scene.animalIntercept, false, `${browserName}: animals intercepted foreground controls`);
  assert.ok(scene.overflowX <= 1 && scene.overflowY <= 1, `${browserName}: overflow detected`);

  const beforeMotion = await page.locator(".jungle-animal-art.motion-flutter").evaluate(el => getComputedStyle(el).transform);
  await page.waitForTimeout(650);
  const afterMotion = await page.locator(".jungle-animal-art.motion-flutter").evaluate(el => getComputedStyle(el).transform);
  assert.notEqual(beforeMotion, afterMotion, `${browserName}: animal micro-motion did not advance`);

  const viewports = [[390, 844], [740, 320], [844, 390], [1024, 768], [1366, 768]];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(80);
    const fit = await page.evaluate(() => ({ x: document.documentElement.scrollWidth - innerWidth, y: document.documentElement.scrollHeight - innerHeight }));
    assert.ok(fit.x <= 1 && fit.y <= 1, `${browserName}: overflow at ${width}x${height}`);
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await page.locator(".jungle-animal-art.motion-flutter").evaluate(el => ({ name: getComputedStyle(el).animationName, transform: getComputedStyle(el).transform }));
  assert.equal(reduced.name, "none", `${browserName}: reduced-motion animation must stop`);
  assert.equal(reduced.transform, "none", `${browserName}: reduced-motion transform must be static`);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 930, height: 499 });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `/tmp/nazonazo-jungle-animals-${browserName}.png`, fullPage: true });

  const hidden = await page.evaluate(() => {
    document.body.classList.add("tunnel-interior");
    return Array.from(document.querySelectorAll(".jungle-animal-layer")).every(el => getComputedStyle(el).display === "none");
  });
  assert.ok(hidden, `${browserName}: tunnel must hide animal layers`);
  assert.deepEqual(errors, [], `${browserName}: page errors\n${errors.join("\n")}`);
  assert.deepEqual(failed, [], `${browserName}: request failures\n${failed.join("\n")}`);
  await browser.close();
}

(async () => {
  if (process.env.NAZONAZO_BROWSER) {
    const requested = process.env.NAZONAZO_BROWSER.split(",").map(value => value.trim()).filter(Boolean);
    for (const browserName of requested) await runBrowser(browserName);
  }
  console.log(`nazonazo jungle animals regression: OK (${animals.length} alpha assets)`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
