#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium, webkit } = require("playwright");

const root = path.resolve(__dirname, "..");
const mime = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".png": "image/png", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg", ".json": "application/json; charset=utf-8",
};

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const relative = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
      const file = path.resolve(root, `.${relative}`);
      if (!file.startsWith(`${root}${path.sep}`)) return response.writeHead(403).end("forbidden");
      fs.readFile(file, (error, data) => {
        if (error) return response.writeHead(404).end("not found");
        response.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" });
        response.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

async function keepNetworkLocal(context, base) {
  await context.route("**/*", route => {
    const url = route.request().url();
    if (url.startsWith(base) || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
    return route.abort();
  });
}

async function openGame(browserType, name, base, viewport, reducedMotion = "no-preference") {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport, reducedMotion });
  await keepNetworkLocal(context, base);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    localStorage.setItem("slide_tut_seen", "1");
    localStorage.setItem("pono_bgm_enabled", "off");
  });
  await page.goto(`${base}/slide/`, { waitUntil: "domcontentloaded" });
  await page.locator("#ov-btn").click();
  await page.waitForFunction(() => eval("state === S.PLAYING && !journeyActor.active"));
  assert.deepEqual(errors, [], `${name} ${viewport.width}x${viewport.height}: no page error`);
  return { browser, page, errors };
}

async function inspectGame(browserType, name, base, viewport) {
  const { browser, page, errors } = await openGame(browserType, name, base, viewport);
  try {
    assert.equal(await page.locator(".journey-progress-track").count(), 1,
      `${name}: exactly one visual track`);
    assert.equal(await page.getByRole("progressbar").count(), 2,
      `${name}: both travellers have non-colour semantics`);
    const decoded = await page.locator(".journey-progress-marker img").evaluateAll(images =>
      images.map(image => image.complete && image.naturalWidth > 0));
    assert.deepEqual(decoded, [true, true], `${name}: both face markers decode`);

    const boxes = await page.evaluate(() => {
      function box(selector) {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
          width: rect.width, height: rect.height };
      }
      return { rail: box(".game-rail"), stage: box("#hud-stage"),
        progress: box("#stage-num"), moves: box("#hud-moves"), pause: box("#btn-pause") };
    });
    assert.ok(boxes.stage.right <= boxes.progress.left + 0.5,
      `${name}: stage name does not cover the journey bar`);
    assert.ok(boxes.progress.right <= boxes.moves.left + 0.5,
      `${name}: journey bar does not cover the move count`);
    assert.ok(boxes.progress.left >= boxes.rail.left && boxes.progress.right <= boxes.rail.right,
      `${name}: faces and track stay inside the HUD width`);
    assert.ok(boxes.pause.right < boxes.rail.left,
      `${name}: journey HUD stays clear of pause`);

    const initial = await page.evaluate(() => ({
      pono: Number(document.querySelector("#stage-num").style.getPropertyValue("--pono-progress")),
      mother: Number(document.querySelector("#stage-num").style.getPropertyValue("--mother-progress")),
      ponoNow: Number(document.querySelector("#journey-pono-progress").getAttribute("aria-valuenow")),
      motherNow: Number(document.querySelector("#journey-mother-progress").getAttribute("aria-valuenow")),
    }));
    assert.deepEqual(initial, { pono: 0, mother: 0.25, ponoNow: 0, motherNow: 2 },
      `${name}: Pono starts at home while mother is at the first story checkpoint`);

    const expectedMother = [0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1];
    for (let index = 0; index < 8; index++) {
      const positions = await page.evaluate(nextIndex => eval(`(() => {
        stageIdx = nextIndex;
        updateHUD({ instant: true });
        const node = document.querySelector('#stage-num');
        return {
          pono: Number(node.style.getPropertyValue('--pono-progress')),
          mother: Number(node.style.getPropertyValue('--mother-progress'))
        };
      })()`), index);
      assert.equal(positions.pono, index / 8, `${name}: stage ${index + 1} starts at Pono's real place`);
      assert.equal(positions.mother, expectedMother[index],
        `${name}: stage ${index + 1} uses its next story checkpoint for mother`);
    }

    const midRoute = await page.evaluate(() => eval(`(() => {
      stageIdx = 2;
      updateHUD({ instant: true });
      journeyActor.tutorial = false;
      journeyActor.phase = JOURNEY_PHASE.EXIT;
      journeyActor.path = [{x:0,y:0},{x:100,y:0}];
      journeyActor.t0 = 0;
      journeyActor.duration = 1000;
      updateJourneyPosition(500);
      const node = document.querySelector('#stage-num');
      return Number(node.style.getPropertyValue('--pono-progress'));
    })()`));
    assert.equal(midRoute, 2.5 / 8, `${name}: green progress follows Pono between checkpoints`);

    const cutscene = await page.evaluate(() => eval(`(() => {
      stageIdx = 1;
      updateHUD({ instant: true });
      showCutscene();
      const node = document.querySelector('#stage-num');
      const rail = document.querySelector('.game-rail');
      const overlayNode = document.querySelector('#overlay');
      return {
        pono: Number(node.style.getPropertyValue('--pono-progress')),
        mother: Number(node.style.getPropertyValue('--mother-progress')),
        together: node.classList.contains('is-together'),
        railZ: Number(getComputedStyle(rail).zIndex),
        overlayZ: Number(getComputedStyle(overlayNode).zIndex),
        stageDisplay: getComputedStyle(document.querySelector('#hud-stage')).display,
        movesDisplay: getComputedStyle(document.querySelector('#hud-moves')).display,
      };
    })()`));
    assert.deepEqual({ pono: cutscene.pono, mother: cutscene.mother, together: cutscene.together },
      { pono: 0.25, mother: 0.25, together: true },
      `${name}: stage 2 paper story shows both faces at the 25% checkpoint`);
    assert.ok(cutscene.railZ > cutscene.overlayZ, `${name}: checkpoint remains visible on the paper story`);
    assert.deepEqual([cutscene.stageDisplay, cutscene.movesDisplay], ["none", "none"],
      `${name}: only the journey bar remains on the paper story`);

    const next = await page.evaluate(() => eval(`(() => {
      nextStage();
      const node = document.querySelector('#stage-num');
      return {
        pono: Number(node.style.getPropertyValue('--pono-progress')),
        mother: Number(node.style.getPropertyValue('--mother-progress')),
        cutscene: document.body.classList.contains('slide-cutscene-open')
      };
    })()`));
    assert.deepEqual(next, { pono: 0.25, mother: 0.5, cutscene: false },
      `${name}: after the story mother moves ahead while Pono stays at the reached place`);

    for (const [index, checkpoint] of [[3, 0.5], [5, 0.75]]) {
      const laterStory = await page.evaluate(nextIndex => eval(`(() => {
        stageIdx = nextIndex;
        updateHUD({ instant: true });
        showCutscene();
        const node = document.querySelector('#stage-num');
        return {
          pono: Number(node.style.getPropertyValue('--pono-progress')),
          mother: Number(node.style.getPropertyValue('--mother-progress')),
          together: node.classList.contains('is-together')
        };
      })()`), index);
      assert.deepEqual(laterStory, { pono: checkpoint, mother: checkpoint, together: true },
        `${name}: stage ${index + 1} paper story joins both faces at ${checkpoint * 100}%`);
    }

    const reunion = await page.evaluate(() => eval(`(() => {
      document.body.classList.remove('slide-cutscene-open');
      overlay.classList.add('hidden');
      stageIdx = 7;
      updateHUD({ instant: true });
      pickupTileIdx = -1;
      journeyActor.tutorial = false;
      journeyActor.phase = JOURNEY_PHASE.EXIT;
      finishExitWithDiscovery(performance.now());
      const node = document.querySelector('#stage-num');
      return {
        pono: Number(node.style.getPropertyValue('--pono-progress')),
        mother: Number(node.style.getPropertyValue('--mother-progress')),
        together: node.classList.contains('is-together')
      };
    })()`));
    assert.deepEqual(reunion, { pono: 1, mother: 1, together: true },
      `${name}: the final arrival joins both faces at the end of the bar`);

    const tutorial = await page.evaluate(() => eval(`(() => {
      _slideTutActive = false;
      showTutorial();
      pickupTileIdx = -1;
      journeyActor.phase = JOURNEY_PHASE.EXIT;
      finishExitWithDiscovery(performance.now());
      const node = document.querySelector('#stage-num');
      return {
        trackCount: node.querySelectorAll('.journey-progress-track').length,
        tutorial: node.classList.contains('is-tutorial'),
        label: node.getAttribute('aria-label'),
        visibleText: node.querySelector('.journey-progress-tutorial-label').textContent.trim(),
        hiddenProgress: [...node.querySelectorAll('[role="progressbar"]')]
          .every(progress => progress.getAttribute('aria-hidden') === 'true')
      };
    })()`));
    assert.deepEqual(tutorial, {
      trackCount: 1, tutorial: true, label: "れんしゅう", visibleText: "れんしゅう",
      hiddenProgress: true
    }, `${name}: tutorial keeps its label through arrival without destroying or restoring the official bar`);
    assert.deepEqual(errors, [], `${name}: no delayed page error`);
  } finally {
    await browser.close();
  }
}

async function inspectReducedMotion(base) {
  const { browser, page, errors } = await openGame(chromium, "chromium-reduced", base,
    { width: 844, height: 390 }, "reduce");
  try {
    const result = await page.evaluate(() => eval(`(() => {
      stageIdx = 3;
      updateHUD({ instant: true });
      pickupTileIdx = -1;
      journeyActor.tutorial = false;
      journeyActor.phase = JOURNEY_PHASE.EXIT;
      finishExitWithDiscovery(performance.now());
      const node = document.querySelector('#stage-num');
      return {
        reduced: reducedMotionQuery.matches,
        pono: Number(node.style.getPropertyValue('--pono-progress')),
        mother: Number(node.style.getPropertyValue('--mother-progress')),
        transition: getComputedStyle(document.querySelector('.journey-progress-fill--mother')).transitionDuration
      };
    })()`));
    assert.equal(result.reduced, true, "reduced-motion query is active");
    assert.deepEqual([result.pono, result.mother], [0.5, 0.5],
      "reduced motion snaps both travellers to the stage 4 story checkpoint");
    assert.equal(result.transition, "0s", "the mother bar does not animate with reduced motion");

    const reducedTutorial = await page.evaluate(() => eval(`(() => {
      _slideTutActive = false;
      showTutorial();
      pickupTileIdx = -1;
      journeyActor.phase = JOURNEY_PHASE.EXIT;
      finishExitWithDiscovery(performance.now());
      const node = document.querySelector('#stage-num');
      return {
        tutorial: node.classList.contains('is-tutorial'),
        hiddenProgress: [...node.querySelectorAll('[role="progressbar"]')]
          .every(progress => progress.getAttribute('aria-hidden') === 'true')
      };
    })()`));
    assert.deepEqual(reducedTutorial, { tutorial: true, hiddenProgress: true },
      "reduced-motion tutorial also keeps the practice label through arrival");
    assert.deepEqual(errors, [], "reduced-motion run has no page error");
  } finally {
    await browser.close();
  }
}

(async () => {
  const { server, base } = await startServer();
  try {
    await inspectGame(chromium, "chromium-small", base, { width: 568, height: 320 });
    await inspectGame(chromium, "chromium-phone", base, { width: 844, height: 390 });
    await inspectGame(chromium, "chromium-desktop", base, { width: 1366, height: 768 });
    await inspectGame(webkit, "webkit-phone", base, { width: 844, height: 390 });
    await inspectReducedMotion(base);
    console.log("slide dual progress visual regression: ok");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
