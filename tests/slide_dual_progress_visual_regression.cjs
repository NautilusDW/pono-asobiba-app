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
      return { app: box("#app"), rail: box(".game-rail"), track: box(".journey-progress-track"),
        stage: box("#hud-stage"), progress: box("#stage-num"), time: box("#hud-time"),
        viewportWidth: window.innerWidth,
        moves: box("#hud-moves"), pause: box("#btn-pause"), menu: box(".pono-menu-toggle") };
    });
    assert.ok(boxes.stage.bottom <= boxes.progress.top + 0.5,
      `${name}: stage name sits above the journey bar`);
    assert.ok(boxes.time.bottom <= boxes.progress.top + 0.5,
      `${name}: visible countdown sits above the journey bar`);
    assert.ok(boxes.moves.bottom <= boxes.progress.top + 0.5,
      `${name}: move count sits above the journey bar`);
    assert.ok(boxes.progress.left >= boxes.rail.left && boxes.progress.right <= boxes.rail.right,
      `${name}: faces and track stay inside the HUD width`);
    assert.ok(boxes.rail.width >= boxes.viewportWidth * 0.995,
      `${name}: the HUD reaches the actual viewport edges, including wide-phone letterbox space`);
    assert.ok(boxes.track.width >= boxes.viewportWidth * 0.99,
      `${name}: the actual track, not empty chrome, receives essentially the whole screen`);
    assert.ok(boxes.rail.left <= 0.5 && boxes.rail.right >= boxes.viewportWidth - 0.5,
      `${name}: the rail is visually edge-to-edge`);
    assert.ok(boxes.pause.top >= boxes.rail.bottom - 0.5,
      `${name}: pause moves below the full-width journey HUD (${JSON.stringify(boxes)})`);
    assert.ok(boxes.menu.top >= boxes.rail.bottom - 0.5,
      `${name}: settings moves below the full-width journey HUD`);
    assert.ok(Math.abs(boxes.menu.top - boxes.pause.top) <= 0.5,
      `${name}: settings and pause share one shell-relative control row`);

    const initial = await page.evaluate(() => ({
      pono: Number(document.querySelector("#stage-num").style.getPropertyValue("--pono-progress")),
      mother: Number(document.querySelector("#stage-num").style.getPropertyValue("--mother-progress")),
      ponoNow: Number(document.querySelector("#journey-pono-progress").getAttribute("aria-valuenow")),
      motherNow: Number(document.querySelector("#journey-mother-progress").getAttribute("aria-valuenow")),
    }));
    assert.ok(initial.pono >= 0 && initial.pono < 0.005 &&
      initial.mother > 0.055 && initial.mother < 0.07,
      `${name}: the intro visibly sends mother ahead while Pono starts from home`);
    assert.deepEqual([initial.ponoNow, initial.motherNow], [0, 0.48],
      `${name}: assistive progress exposes the same initial distance without relying on colour`);

    const liveMotion = await page.evaluate(() => {
      const pono = document.querySelector('.journey-progress-marker--pono').getBoundingClientRect();
      const mother = document.querySelector('.journey-progress-marker--mother').getBoundingClientRect();
      const gap = getComputedStyle(document.querySelector('.journey-progress-gap'));
      return {
        ponoX: pono.left,
        motherX: mother.left,
        moving: document.querySelector('#stage-num').classList.contains('is-moving'),
        gapAnimation: gap.animationName,
        gapDuration: parseFloat(gap.animationDuration)
      };
    });
    await page.waitForTimeout(1000);
    const liveMotionAfter = await page.evaluate(() => ({
      ponoX: document.querySelector('.journey-progress-marker--pono').getBoundingClientRect().left,
      motherX: document.querySelector('.journey-progress-marker--mother').getBoundingClientRect().left
    }));
    assert.equal(liveMotion.moving, true, `${name}: the journey advertises active realtime motion`);
    assert.equal(liveMotion.gapAnimation, 'journeyGapFlow', `${name}: the visible distance bridge flows`);
    assert.ok(liveMotion.gapDuration <= 1, `${name}: motion is perceptible within one second`);
    assert.ok(liveMotionAfter.ponoX - liveMotion.ponoX >= 1.8,
      `${name}: Pono visibly changes position during one real second`);
    assert.ok(liveMotionAfter.motherX - liveMotion.motherX >= 1.5,
      `${name}: mother visibly changes position during one real second`);

    const markerRange = await page.evaluate(() => eval(`(() => {
      const node = document.querySelector('#stage-num');
      syncJourneyProgress(0, 0, { instant: true });
      const start = document.querySelector('.journey-progress-marker--pono').getBoundingClientRect();
      syncJourneyProgress(1, 1, { instant: true });
      const end = document.querySelector('.journey-progress-marker--pono').getBoundingClientRect();
      syncJourneyProgress(0.5, 0.56, { instant: true });
      const track = document.querySelector('.journey-progress-track').getBoundingClientRect();
      const gap = document.querySelector('.journey-progress-gap').getBoundingClientRect();
      return {
        startLeft: start.left,
        endRight: end.right,
        travel: end.left - start.left,
        gapRatio: gap.width / (track.width - 28)
      };
    })()`));
    assert.ok(markerRange.startLeft >= -0.5 && markerRange.endRight <= boxes.viewportWidth + 0.5,
      `${name}: both endpoint faces remain fully on screen (${JSON.stringify(markerRange)})`);
    assert.ok(markerRange.travel >= boxes.viewportWidth * 0.94,
      `${name}: the face has a genuinely screen-wide travel distance`);
    assert.ok(Math.abs(markerRange.gapRatio - 0.06) < 0.002,
      `${name}: the glowing bridge shows the exact logical distance`);

    const nearButSeparate = await page.evaluate(() => eval(`(() => {
      syncJourneyProgress(0.2482, 0.25, { instant: true });
      const node = document.querySelector('#stage-num');
      return {
        chasing: node.classList.contains('is-chasing'),
        together: node.classList.contains('is-together'),
        label: node.getAttribute('aria-label')
      };
    })()`));
    assert.equal(nearButSeparate.chasing, true,
      `${name}: the distance bridge remains visible right up to the real reunion`);
    assert.equal(nearButSeparate.together, false,
      `${name}: a late timer position never pretends both travellers already met`);
    assert.doesNotMatch(nearButSeparate.label, /おなじ ばしょ/,
      `${name}: assistive text also waits for the actual checkpoint reunion`);

    const retryEdge = await page.evaluate(() => eval(`(() => {
      syncJourneyProgress(0.9999002, 1, { instant: true });
      const node = document.querySelector('#stage-num');
      return {
        together: node.classList.contains('is-together'),
        label: node.getAttribute('aria-label')
      };
    })()`));
    assert.equal(retryEdge.together, false,
      `${name}: even the final unlimited retry stays separate until actual arrival`);
    assert.match(retryEdge.label, /あと 1こ/,
      `${name}: the last visible sliver is never announced as zero distance`);

    const expectedMother = [0.06, 0.1625, 0.31, 0.4125, 0.56, 0.6625, 0.81, 0.9125];
    for (let index = 0; index < 8; index++) {
      const positions = await page.evaluate(nextIndex => eval(`(() => {
        stageIdx = nextIndex;
        resetStageClock(nextIndex);
        updateHUD({ resetProgress: true, instant: true });
        const node = document.querySelector('#stage-num');
        return {
          pono: Number(node.style.getPropertyValue('--pono-progress')),
          mother: Number(node.style.getPropertyValue('--mother-progress'))
        };
      })()`), index);
      assert.equal(positions.pono, index / 8, `${name}: stage ${index + 1} starts at Pono's real place`);
      assert.equal(positions.mother, expectedMother[index],
        `${name}: stage ${index + 1} continues the mother's live chapter segment`);
    }

    const liveQuarter = await page.evaluate(() => eval(`(() => {
      stageIdx = 0;
      resetStageClock(0);
      overlay.classList.add('hidden');
      state = S.PLAYING;
      journeyActor.active = false;
      slideWindowFocused = true;
      stageClock.active = true;
      stageClock.lastTick = 1000;
      updateStageClock(1000 + stageClock.budgetMs * 0.25);
      return {
        pono: stageClock.ponoProgress,
        mother: stageClock.motherProgress,
        elapsed: stageClock.elapsedMs,
        budget: stageClock.budgetMs,
        time: document.querySelector('#hud-time').textContent
      };
    })()`));
    assert.equal(liveQuarter.pono, 0.125 * 0.5625,
      `${name}: Pono advances continuously during the puzzle`);
    assert.equal(liveQuarter.mother, 0.06 + (0.1625 - 0.06) * 0.5625,
      `${name}: mother advances continuously and stays a little ahead`);
    assert.equal(liveQuarter.elapsed, liveQuarter.budget * 0.25,
      `${name}: the bar is driven by active elapsed time`);
    assert.match(liveQuarter.time, /^あと /, `${name}: the real limit is visible`);

    const midRoute = await page.evaluate(() => eval(`(() => {
      stageIdx = 2;
      resetStageClock(2);
      updateHUD({ resetProgress: true, instant: true });
      stageClock.exitPonoStart = 0.3;
      stageClock.exitMotherStart = 0.35;
      journeyActor.tutorial = false;
      journeyActor.phase = JOURNEY_PHASE.EXIT;
      journeyActor.path = [{x:0,y:0},{x:100,y:0}];
      journeyActor.t0 = 0;
      journeyActor.duration = 1000;
      updateJourneyPosition(500);
      const node = document.querySelector('#stage-num');
      return Number(node.style.getPropertyValue('--pono-progress'));
    })()`));
    assert.equal(midRoute, 0.3375,
      `${name}: green progress continues from its live clear position without rewinding`);

    const cutscene = await page.evaluate(() => eval(`(() => {
      stageIdx = 1;
      resetStageClock(1);
      updateHUD({ resetProgress: true, instant: true });
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
        railWidth: rail.getBoundingClientRect().width,
        viewportWidth: window.innerWidth,
        stageDisplay: getComputedStyle(document.querySelector('#hud-stage')).display,
        timeDisplay: getComputedStyle(document.querySelector('#hud-time')).display,
        movesDisplay: getComputedStyle(document.querySelector('#hud-moves')).display,
        journeyStatus: document.querySelector('#cutscene-journey-status').textContent,
      };
    })()`));
    assert.deepEqual({ pono: cutscene.pono, mother: cutscene.mother, together: cutscene.together },
      { pono: 0.25, mother: 0.25, together: true },
      `${name}: stage 2 paper story shows both faces at the 25% checkpoint`);
    assert.ok(cutscene.railZ > cutscene.overlayZ, `${name}: checkpoint remains visible on the paper story`);
    assert.ok(cutscene.railWidth >= cutscene.viewportWidth * 0.995,
      `${name}: the paper-story checkpoint also remains edge-to-edge`);
    assert.deepEqual([cutscene.stageDisplay, cutscene.timeDisplay, cutscene.movesDisplay],
      ["none", "none", "none"],
      `${name}: only the journey bar remains on the paper story`);
    assert.equal(cutscene.journeyStatus, "ポノが おかあさんに おいつきました",
      `${name}: the modal itself describes the paper-story reunion to assistive technology`);

    const next = await page.evaluate(() => eval(`(() => {
      nextStage();
      const node = document.querySelector('#stage-num');
      return {
        pono: Number(node.style.getPropertyValue('--pono-progress')),
        mother: Number(node.style.getPropertyValue('--mother-progress')),
        cutscene: document.body.classList.contains('slide-cutscene-open')
      };
    })()`));
    assert.deepEqual(next, { pono: 0.25, mother: 0.25, cutscene: false },
      `${name}: after the story both begin together and the next chase starts smoothly`);

    for (const [index, checkpoint] of [[3, 0.5], [5, 0.75]]) {
      const laterStory = await page.evaluate(nextIndex => eval(`(() => {
        stageIdx = nextIndex;
        resetStageClock(nextIndex);
        updateHUD({ resetProgress: true, instant: true });
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
      resetStageClock(7);
      updateHUD({ resetProgress: true, instant: true });
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
      updateHUD();
      pickupTileIdx = -1;
      journeyActor.phase = JOURNEY_PHASE.EXIT;
      finishExitWithDiscovery(performance.now());
      const node = document.querySelector('#stage-num');
      return {
        trackCount: node.querySelectorAll('.journey-progress-track').length,
        tutorial: node.classList.contains('is-tutorial'),
        label: node.getAttribute('aria-label'),
        stage: document.querySelector('#hud-stage').textContent,
        time: document.querySelector('#hud-time').textContent,
        visibleText: node.querySelector('.journey-progress-tutorial-label').textContent.trim(),
        hiddenProgress: [...node.querySelectorAll('[role="progressbar"]')]
          .every(progress => progress.getAttribute('aria-hidden') === 'true')
      };
    })()`));
    assert.deepEqual(tutorial, {
      trackCount: 1, tutorial: true, label: "れんしゅう", stage: "れんしゅう",
      time: "じかん なし", visibleText: "れんしゅう",
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
      resetStageClock(3);
      updateHUD({ resetProgress: true, instant: true });
      pickupTileIdx = -1;
      journeyActor.tutorial = false;
      journeyActor.phase = JOURNEY_PHASE.EXIT;
      finishExitWithDiscovery(performance.now());
      const node = document.querySelector('#stage-num');
      node.classList.add('is-moving', 'is-chasing');
      return {
        reduced: reducedMotionQuery.matches,
        pono: Number(node.style.getPropertyValue('--pono-progress')),
        mother: Number(node.style.getPropertyValue('--mother-progress')),
        transition: getComputedStyle(document.querySelector('.journey-progress-fill--mother')).transitionDuration,
        fillAnimation: getComputedStyle(document.querySelector('.journey-progress-fill--pono')).animationName,
        gapAnimation: getComputedStyle(document.querySelector('.journey-progress-gap')).animationName,
        faceAnimation: getComputedStyle(document.querySelector('.journey-progress-marker--pono img')).animationName
      };
    })()`));
    assert.equal(result.reduced, true, "reduced-motion query is active");
    assert.deepEqual([result.pono, result.mother], [0.5, 0.5],
      "reduced motion snaps both travellers to the stage 4 story checkpoint");
    assert.equal(result.transition, "0s", "the mother bar does not animate with reduced motion");
    assert.deepEqual([result.fillAnimation, result.gapAnimation, result.faceAnimation],
      ["none", "none", "none"],
      "reduced motion removes flowing stripes and walking bob while keeping exact progress");

    const reducedRetry = await page.evaluate(() => eval(`(() => {
      _slideTutActive = false;
      stageIdx = 7;
      stageRetryCount = 1;
      overlay.classList.add('hidden');
      startCurrentStageIntro(1000, true, { pono: 0.997, mother: 0.999 });
      const start = { pono: stageClock.ponoProgress, mother: stageClock.motherProgress };
      updateJourney(1002);
      const afterIntro = { pono: stageClock.ponoProgress, mother: stageClock.motherProgress };
      updateStageClock(stageClock.lastTick + 1000);
      const afterTick = { pono: stageClock.ponoProgress, mother: stageClock.motherProgress };
      return { start, afterIntro, afterTick, phase: journeyActor.phase, active: stageClock.active };
    })()`));
    assert.deepEqual(reducedRetry.afterIntro, reducedRetry.start,
      "reduced-motion retry also preserves its live position through the instant intro");
    assert.ok(reducedRetry.afterTick.pono >= reducedRetry.afterIntro.pono &&
      reducedRetry.afterTick.mother >= reducedRetry.afterIntro.mother,
      "reduced-motion retry continues forward on its first active tick");
    assert.deepEqual([reducedRetry.phase, reducedRetry.active], ["PLAYING", true],
      "reduced-motion retry reaches normal play without a rewind");

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
    await inspectGame(chromium, "chromium-tablet", base, { width: 1024, height: 768 });
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
