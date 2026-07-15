#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium, webkit } = require("playwright");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "slide/index.html"), "utf8");

/* World-board visual contract: no opaque double frame or repeated bitmap tiles. */
assert.match(html, /const THEMES = \{[\s\S]*?forest:[\s\S]*?cave:[\s\S]*?night:/);
assert.doesNotMatch(html, /orangeForest|blankTextures|textureKey|const frameP/);
assert.doesNotMatch(html, /ctx\.drawImage\(tex,/,
  "road panels must not repeat the same noisy bitmap texture in every cell");
assert.match(html, /drawBoardAtmosphere\(now\)/,
  "the board must sit in a soft world clearing instead of an opaque frame");
assert.match(html, /function drawEmptySlot\(now\)[\s\S]*?const rimInset[\s\S]*?const wellInset[\s\S]*?ctx\.shadowOffsetY = Math\.max/,
  "the empty destination must read as a raised rim around a recessed physical well");
assert.doesNotMatch(html, /['"`]ここへ['"`]|ctx\.fillText\([^\n]*ここへ/,
  "the ambiguous ここへ label must not return inside the physical hole");
assert.doesNotMatch(html.match(/function drawEmptySlot\(now\) \{[\s\S]*?\n\}/)[0], /setLineDash|fillText/,
  "the physical hole must not look like another dashed, labelled panel");

/* Only one reassuring first move and the start-connected route are visible at a glance. */
assert.match(html, /function getStartConnectedTileSet\(\)/);
assert.match(html, /connected\.add\(idx\)/);
assert.match(html, /const connectedSet = hasBoard \? getStartConnectedTileSet\(\) : new Set\(\)/);
assert.match(html, /connected: connectedSet\.has\(i\)/);
assert.match(html, /const hintVisible = hasBoard && state === S\.PLAYING && moveCount === 0[\s\S]*?getAdjacentIndices\(emptyIdx\)\.includes\(suggestedMoveIdx\)/);
assert.match(html, /if \(hintVisible && !animating\) \{\s*drawMoveHint\(suggestedMoveIdx, now\);\s*\}/);
assert.match(html, /hintDismissed = true;[\s\S]*?playSlideSound\(\)/,
  "the first legal interaction permanently dismisses the suggestion for that stage");
assert.match(html, /ctx\.lineDashOffset = reducedMotionQuery\.matches \? 0/,
  "flow and hint animation must become static when reduced motion is requested");
assert.match(html, /roadStyle: 'wood'/);
assert.match(html, /roadStyle: 'stone'/);
assert.match(html, /roadStyle: 'starlight'/);
assert.match(html, /visual\.movable \? th\.move : th\.slabBorder/,
  "movable panels use a state color distinct from the connected route and empty hollow");

/* Characters occupy the world, preserve aspect ratio, and render only once per frame. */
assert.match(html, /imgPonoWorld\.src = '\.\.\/assets\/images\/characters\/pono\/pono_003\.png'/);
assert.equal((html.match(/ctx\.drawImage\(imgPonoWorld,/g) || []).length, 1,
  "stationary Pono must have one draw site");
assert.equal((html.match(/ctx\.drawImage\(imgMomFull,/g) || []).length, 1,
  "the final-stage mother must have one draw site");
assert.match(html, /ponoH \* ponoRatio/);
assert.match(html, /momH \* imgMomFull\.naturalWidth \/ imgMomFull\.naturalHeight/);
assert.match(html, /if \(!journeyActor\.active && state === S\.PLAYING\)/,
  "stationary Pono must disappear while the single walking sprite is active");
assert.match(html, /if \(journeyActor\.active\) drawJourneyActor\(now\)/,
  "entry, route travel, discovery, and departure share one persistent walking actor");

const mime = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".mp3": "audio/mpeg",
};

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const relative = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
      const file = path.resolve(root, `.${relative}`);
      if (!file.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end("forbidden");
        return;
      }
      fs.readFile(file, (error, data) => {
        if (error) {
          response.writeHead(404).end("not found");
          return;
        }
        response.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" });
        response.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, base: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function keepNetworkLocal(target, base) {
  await target.route("**/*", route => {
    const url = route.request().url();
    if (url.startsWith(base) || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
    return route.abort();
  });
}

async function openPlayingPage(browserType, browserName, base, viewport,
  reducedMotion = "no-preference", hasTouch = false) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport, reducedMotion, hasTouch, isMobile: hasTouch });
  await keepNetworkLocal(context, base);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    localStorage.setItem("slide_tut_seen", "1");
    localStorage.setItem("pono_bgm_enabled", "off");
    window.__slideDirectDraws = null;
    const nativeDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function(image, ...args) {
      const source = image && image.src ? String(image.src) : "";
      if (window.__slideDirectDraws) {
        if (source.includes("/pono/pono_003.png")) window.__slideDirectDraws.world++;
        if (source.includes("pono_walk_sheet") || source.includes("pono_walk_side_sheet")) {
          window.__slideDirectDraws.walk++;
        }
        if (source.includes("clue_sheet_3x2") || source.includes("moonlight_clue")) {
          window.__slideDirectDraws.clue = (window.__slideDirectDraws.clue || 0) + 1;
        }
        if (source.includes("mom_soft_style")) {
          window.__slideDirectDraws.mom = (window.__slideDirectDraws.mom || 0) + 1;
        }
      }
      return nativeDrawImage.call(this, image, ...args);
    };
  });
  await page.goto(`${base}/slide/`, { waitUntil: "domcontentloaded" });
  await page.locator("#ov-btn").click();
  await page.waitForFunction(() => eval("state === S.PLAYING && !journeyActor.active"));
  assert.equal(await page.locator("#overlay").evaluate(element => element.classList.contains("hidden")), true,
    `${browserName} ${viewport.width}x${viewport.height}: one start action flows through the entry beat into play`);
  assert.deepEqual(errors, [], `${browserName} ${viewport.width}x${viewport.height}: no page errors`);
  return { browser, context, page, errors };
}

async function inspectLandscape(browserType, browserName, base, viewport, minimumFinalCell,
  inspectEveryStage = false, hasTouch = false) {
  const session = await openPlayingPage(browserType, browserName, base, viewport, "no-preference", hasTouch);
  const { browser, page, errors } = session;
  try {
    const shell = await page.locator("#app").boundingBox();
    assert.ok(shell, `${browserName}: shell exists`);
    assert.ok(Math.abs(shell.width / shell.height - 16 / 9) < 0.012,
      `${browserName} ${viewport.width}x${viewport.height}: shell stays 16:9`);
    if (hasTouch) {
      assert.equal(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), true,
        `${browserName} ${viewport.width}x${viewport.height}: coarse-pointer layout is exercised`);
    }

    const before = await page.evaluate(() => eval(`({
      CW, CH, cellSize, gridOX, gridOY, emptyIdx, moveCount, curCols,
      suggested: suggestedMoveIdx,
      movable: getAdjacentIndices(emptyIdx).filter(index => grid[index] !== null)
    })`));
    assert.ok(before.movable.length >= 2, `${browserName}: the physical hole still accepts every legal neighbor`);
    assert.ok(before.movable.includes(before.suggested),
      `${browserName}: the single first-move suggestion is legal`);
    const chosen = before.suggested;
    const row = Math.floor(chosen / before.curCols), col = chosen % before.curCols;
    const canvas = await page.locator("#gameCanvas").boundingBox();
    await page.mouse.click(
      canvas.x + (before.gridOX + (col + 0.5) * before.cellSize) * canvas.width / before.CW,
      canvas.y + (before.gridOY + (row + 0.5) * before.cellSize) * canvas.height / before.CH,
    );
    await page.waitForTimeout(220);
    const after = await page.evaluate(() => eval("({ emptyIdx, moveCount, hintDismissed })"));
    assert.equal(after.emptyIdx, chosen, `${browserName}: tapping a hinted panel moves it into the hollow`);
    assert.equal(after.moveCount, 1, `${browserName}: a legal move increments the HUD once`);
    assert.equal(after.hintDismissed, true, `${browserName}: no later move keeps an instructional arrow`);

    const final = await page.evaluate(() => eval(`(() => {
      stageIdx = 7;
      moveCount = 0;
      shuffleGrid(LEVELS[stageIdx]);
      calcLayout();
      updateHUD();
      state = S.PLAYING;
      const connected = [...getStartConnectedTileSet()];
      return {
        stage: stageIdx + 1, cols: curCols, rows: curRows, cellSize,
        gridLeft: gridOX, gridRight: gridOX + curCols * cellSize,
        gridTop: gridOY, gridBottom: gridOY + curRows * cellSize,
        connected,
        reduced: reducedMotionQuery.matches,
        night: getTheme() === THEMES.night
      };
    })()`));
    assert.deepEqual([final.stage, final.cols, final.rows], [8, 5, 4], `${browserName}: final board remains 5x4`);
    assert.ok(final.cellSize >= minimumFinalCell,
      `${browserName} ${viewport.width}x${viewport.height}: final tiles remain child-sized`);
    assert.ok(final.gridLeft > 0 && final.gridRight < shell.width, `${browserName}: horizontal marker lanes remain visible`);
    assert.ok(final.gridTop > 52 && final.gridBottom < shell.height, `${browserName}: board clears HUD and shell edge`);
    assert.ok(final.connected.every(index => index >= 0 && index < 20), `${browserName}: connected glow contains valid cells only`);
    assert.equal(final.night, true, `${browserName}: final stage uses the night palette`);

    if (inspectEveryStage) {
      const expectedDimensions = [[3, 3], [3, 3], [3, 3], [4, 3], [4, 3], [4, 4], [4, 4], [5, 4]];
      for (let stage = 0; stage < expectedDimensions.length; stage++) {
        const runtime = await page.evaluate(nextStage => eval(`(() => {
          stageIdx = nextStage;
          moveCount = 0;
          shuffleGrid(LEVELS[stageIdx]);
          calcLayout();
          updateHUD();
          state = S.PLAYING;
          draw(performance.now());
          return {
            cols: curCols, rows: curRows, emptyCount: grid.filter(tile => tile === null).length,
            gridLeft: gridOX, gridRight: gridOX + curCols * cellSize,
            gridTop: gridOY, gridBottom: gridOY + curRows * cellSize,
            theme: getTheme() === THEMES.forest ? 'forest' : getTheme() === THEMES.cave ? 'cave' : 'night'
          };
        })()`), stage);
        assert.deepEqual([runtime.cols, runtime.rows], expectedDimensions[stage],
          `${browserName}: stage ${stage + 1} runtime dimensions`);
        assert.equal(runtime.emptyCount, 1, `${browserName}: stage ${stage + 1} keeps one hollow`);
        assert.ok(runtime.gridLeft > 0 && runtime.gridRight < shell.width && runtime.gridTop > 52 && runtime.gridBottom < shell.height,
          `${browserName}: stage ${stage + 1} world board stays inside the shell`);
        assert.equal(runtime.theme, stage < 3 ? "forest" : stage < 6 ? "cave" : "night",
          `${browserName}: stage ${stage + 1} uses its intended world palette`);
      }

      const spriteDraws = await page.evaluate(() => eval(`(() => {
        stageIdx = 0;
        curCols = LEVELS[0].cols;
        curRows = LEVELS[0].rows;
        grid = [...LEVELS[0].solved];
        emptyIdx = grid.indexOf(null);
        calcLayout();
        state = S.PLAYING;
        journeyActor.active = false;
        journeyActor.phase = JOURNEY_PHASE.PLAYING;
        window.__slideDirectDraws = { world: 0, walk: 0 };
        draw(1000);
        const standing = { ...window.__slideDirectDraws };

        const geo = getJourneyGeometry();
        state = S.TRAVELLING;
        setJourneyPath(JOURNEY_PHASE.EXIT, [
          { x: geo.startX, y: geo.startY },
          { x: geo.goalX, y: geo.goalY }
        ], 1000, 1000);
        updateJourneyPosition(1100);
        window.__slideDirectDraws = { world: 0, walk: 0 };
        draw(1100);
        const walking = { ...window.__slideDirectDraws };
        window.__slideDirectDraws = null;
        return { standing, walking };
      })()`));
      assert.deepEqual(spriteDraws.standing, { world: 1, walk: 0 },
        `${browserName}: a normal frame draws one stationary Pono`);
      assert.deepEqual(spriteDraws.walking, { world: 0, walk: 1 },
        `${browserName}: a clear frame replaces Pono with exactly one walking bear`);
    }
    assert.deepEqual(errors, [], `${browserName}: moving and resizing create no page errors`);
  } finally {
    await browser.close();
  }
}

async function inspectFirstRunTutorial(base) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 568, height: 320 } });
  await keepNetworkLocal(context, base);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    localStorage.removeItem("slide_tut_seen");
    localStorage.setItem("pono_bgm_enabled", "off");
  });
  try {
    await page.goto(`${base}/slide/`, { waitUntil: "domcontentloaded" });
    await page.locator("#ov-btn").click();
    await page.locator("#tut-next").waitFor({ state: "visible" });
    await page.locator("#tut-next").click();
    await page.waitForTimeout(80);
    assert.equal(await page.locator("#btn-pause").isDisabled(), true,
      "pause is disabled while a guided move is waiting");
    const beforePauseProbe = await page.evaluate(() => eval("({ state, emptyIdx, animating })"));
    await page.evaluate(() => eval("togglePause()"));
    assert.deepEqual(await page.evaluate(() => eval("({ state, emptyIdx, animating })")), beforePauseProbe,
      "the tutorial pause guard cannot corrupt the empty cell or stale animation state");
    const beforeReentryProbe = await page.evaluate(() => eval("({ state, emptyIdx, moveCount, grid: JSON.stringify(grid) })"));
    await page.evaluate(() => eval("showTutorial()"));
    assert.deepEqual(
      await page.evaluate(() => eval("({ state, emptyIdx, moveCount, grid: JSON.stringify(grid) })")),
      beforeReentryProbe,
      "re-entering the shared tutorial while it is active cannot add another guided flow",
    );

    for (let step = 0; step < 3; step++) {
      if (step > 0) {
        await page.locator("#tut-next").waitFor({ state: "visible" });
        await page.locator("#tut-next").click();
        await page.waitForTimeout(60);
      }
      const target = await page.evaluate(stepIndex => eval(`(() => {
        const next = TUTORIAL_STEPS[stepIndex];
        return { CW, CH, gridOX, gridOY, cellSize, row: next.row, col: next.col };
      })()`), step);
      const canvas = await page.locator("#gameCanvas").boundingBox();
      await page.mouse.click(
        canvas.x + (target.gridOX + (target.col + 0.5) * target.cellSize) * canvas.width / target.CW,
        canvas.y + (target.gridOY + (target.row + 0.5) * target.cellSize) * canvas.height / target.CH,
      );
      await page.waitForTimeout(240);
    }

    await page.evaluate(() => eval(`(() => {
      for (let beat = 0; beat < 3 && journeyActor.active; beat++) {
        journeyActor.t0 -= 100000;
        updateJourney(performance.now());
      }
    })()`));
    await page.waitForTimeout(220);
    await page.locator("#tut-next").waitFor({ state: "visible" });
    assert.match(await page.locator("#tut-bubble").textContent(), /できた！/,
      "the three guided moves end with connected-route feedback");
    assert.equal(await page.evaluate(() => eval("moveCount")), 3,
      "the guided tutorial performs exactly three legal moves");
    await page.locator("#tut-next").click();
    await page.waitForTimeout(80);
    assert.equal(await page.locator("#btn-pause").isDisabled(), true,
      "pause stays unavailable while the first scene-entry beat begins");
    assert.equal(await page.evaluate(() => localStorage.getItem("slide_tut_seen")), "1",
      "tutorial completion is remembered");
    assert.equal(await page.evaluate(() => eval(
      "state === S.TRAVELLING && journeyActor.phase === JOURNEY_PHASE.INTRO")), true,
    "the tutorial hands directly to the first scene-entry beat without a stage modal");
    assert.equal(await page.locator("#overlay").evaluate(element => element.classList.contains("hidden")), true,
      "the continuous journey stays visible after tutorial completion");
    await page.evaluate(() => eval("togglePause()"));
    assert.equal(await page.evaluate(() => eval("state === S.TRAVELLING")), true,
      "even a direct pause request cannot interrupt or duplicate the scene-entry actor");
    assert.equal(await page.locator("#btn-pause").textContent(), "⏸");
    await page.evaluate(() => eval(`(() => {
      journeyActor.t0 -= 100000;
      updateJourney(performance.now());
    })()`));
    assert.equal(await page.evaluate(() => eval("state === S.PLAYING && !journeyActor.active")), true,
      "scene entry hands control to gameplay exactly once");
    assert.equal(await page.locator("#btn-pause").isEnabled(), true,
      "pause becomes available only after scene entry hands over to play");
    assert.equal(await page.locator("#btn-pause").textContent(), "⏸",
      "gameplay begins with the pause action and icon aligned");
    assert.deepEqual(errors, [], "first-run tutorial creates no page errors");
  } finally {
    await browser.close();
  }
}

async function prepareSolvedStage(page, nextStage) {
  return page.evaluate(stage => eval(`(() => {
    beginStage(stage);
    const introPauseDisabled = btnPause.disabled;
    if (journeyActor.phase !== JOURNEY_PHASE.INTRO) {
      throw new Error('stage did not begin in INTRO');
    }
    journeyActor.t0 -= 100000;
    updateJourney(performance.now());
    if (journeyActor.phase !== JOURNEY_PHASE.PLAYING || state !== S.PLAYING) {
      throw new Error('INTRO did not hand off to PLAYING');
    }
    grid = [...LEVELS[stageIdx].solved];
    emptyIdx = grid.indexOf(null);
    clueDiscovered = false;
    animating = false;
    calcLayout();
    return {
      stage: stageIdx,
      phase: journeyActor.phase,
      playing: state === S.PLAYING,
      actorActive: journeyActor.active,
      introPauseDisabled,
      playingPauseDisabled: btnPause.disabled,
    };
  })()`), nextStage);
}

async function startSolvedJourney(page) {
  return page.evaluate(() => eval(`(() => {
    onStageClear();
    return {
      stage: stageIdx,
      phase: journeyActor.phase,
      travelling: state === S.TRAVELLING,
      clue: clueDiscovered,
      actorActive: journeyActor.active,
      pauseDisabled: btnPause.disabled,
    };
  })()`));
}

async function advanceJourneyBeat(page, expectedPhase) {
  return page.evaluate(expected => eval(`(() => {
    if (journeyActor.phase !== expected) {
      throw new Error('expected ' + expected + ', got ' + journeyActor.phase);
    }
    journeyActor.t0 -= 100000;
    updateJourney(performance.now());
    return {
      stage: stageIdx,
      phase: journeyActor.phase,
      playing: state === S.PLAYING,
      travelling: state === S.TRAVELLING,
      gameClear: state === S.GAME_CLEAR,
      clue: clueDiscovered,
      actorActive: journeyActor.active,
      pauseDisabled: btnPause.disabled,
      overlayHidden: overlay.classList.contains('hidden'),
    };
  })()`), expectedPhase);
}

async function captureJourneyActors(page) {
  return page.evaluate(() => eval(`(() => {
    window.__slideDirectDraws = { world: 0, walk: 0, clue: 0, mom: 0 };
    draw(performance.now());
    const result = { ...window.__slideDirectDraws };
    window.__slideDirectDraws = null;
    return result;
  })()`));
}

async function inspectJourneyTransitions(base) {
  const session = await openPlayingPage(chromium, "chromium-journey", base,
    { width: 844, height: 390 });
  const { browser, page, errors } = session;
  try {
    await page.waitForFunction(() => eval(
      "imgPonoWorld.complete && imgPonoWorld.naturalWidth > 0 && " +
      "imgWalkSideSheet.complete && imgWalkSideSheet.naturalWidth > 0 && " +
      "imgClueSheet.complete && imgClueSheet.naturalWidth > 0 && " +
      "imgMomFull.complete && imgMomFull.naturalWidth > 0"));

    /* No-cutscene stage: every state advances exactly once before the next intro. */
    const plainReady = await prepareSolvedStage(page, 0);
    assert.equal(plainReady.introPauseDisabled, true,
      "plain stage: pause is disabled during INTRO");
    assert.equal(plainReady.playingPauseDisabled, false,
      "plain stage: pause is enabled only after PLAYING begins");
    assert.deepEqual(await captureJourneyActors(page), { world: 1, walk: 0, clue: 0, mom: 0 },
      "plain stage: PLAYING draws one stationary Pono and no undiscovered clue");

    const plainExit = await startSolvedJourney(page);
    assert.deepEqual(
      [plainExit.stage, plainExit.phase, plainExit.travelling, plainExit.clue,
        plainExit.actorActive, plainExit.pauseDisabled],
      [0, "EXIT", true, false, true, true],
      "plain stage: onStageClear begins one non-pausable EXIT actor before revealing the clue",
    );
    assert.deepEqual(await captureJourneyActors(page), { world: 0, walk: 1, clue: 0, mom: 0 },
      "plain stage: EXIT replaces stationary Pono with one walking actor");

    const plainDiscovery = await advanceJourneyBeat(page, "EXIT");
    assert.deepEqual(
      [plainDiscovery.phase, plainDiscovery.clue, plainDiscovery.actorActive,
        plainDiscovery.pauseDisabled],
      ["DISCOVERY", true, true, true],
      "plain stage: the clue appears only after EXIT reaches DISCOVERY",
    );
    assert.deepEqual(await captureJourneyActors(page), { world: 0, walk: 1, clue: 1, mom: 0 },
      "plain stage: DISCOVERY keeps one actor beside the newly revealed clue");

    const plainDeparting = await advanceJourneyBeat(page, "DISCOVERY");
    assert.deepEqual(
      [plainDeparting.phase, plainDeparting.clue, plainDeparting.pauseDisabled],
      ["DEPARTING", true, true],
      "plain stage: DISCOVERY advances to a non-pausable DEPARTING beat");
    assert.deepEqual(await captureJourneyActors(page), { world: 0, walk: 1, clue: 1, mom: 0 },
      "plain stage: DEPARTING still draws exactly one travelling Pono");

    const nextIntro = await advanceJourneyBeat(page, "DEPARTING");
    assert.deepEqual(
      [nextIntro.stage, nextIntro.phase, nextIntro.travelling, nextIntro.clue,
        nextIntro.actorActive, nextIntro.pauseDisabled, nextIntro.overlayHidden],
      [1, "INTRO", true, false, true, true, true],
      "plain stage: departure resets the clue and enters the next background without a modal",
    );
    assert.deepEqual(await captureJourneyActors(page), { world: 0, walk: 1, clue: 0, mom: 0 },
      "next INTRO continues with one walking actor and no stale clue");
    const nextPlaying = await advanceJourneyBeat(page, "INTRO");
    assert.deepEqual(
      [nextPlaying.phase, nextPlaying.playing, nextPlaying.actorActive, nextPlaying.pauseDisabled],
      ["PLAYING", true, false, false],
      "next INTRO hands off once and re-enables pause only in PLAYING");

    /* Cutscene stage: departure opens a bright story postcard, then its single next action. */
    const cutsceneReady = await prepareSolvedStage(page, 1);
    assert.equal(cutsceneReady.introPauseDisabled, true,
      "cutscene stage: pause is disabled during INTRO");
    assert.equal(cutsceneReady.playingPauseDisabled, false,
      "cutscene stage: pause is restored in PLAYING");
    const cutsceneExit = await startSolvedJourney(page);
    assert.deepEqual([cutsceneExit.phase, cutsceneExit.clue, cutsceneExit.pauseDisabled],
      ["EXIT", false, true], "cutscene stage: EXIT begins before discovery");
    const cutsceneDiscovery = await advanceJourneyBeat(page, "EXIT");
    assert.deepEqual([cutsceneDiscovery.phase, cutsceneDiscovery.clue], ["DISCOVERY", true],
      "cutscene stage: arrival reveals its clue");
    const cutsceneDeparting = await advanceJourneyBeat(page, "DISCOVERY");
    assert.equal(cutsceneDeparting.phase, "DEPARTING");
    const postcardBeat = await advanceJourneyBeat(page, "DEPARTING");
    assert.deepEqual(
      [postcardBeat.stage, postcardBeat.phase, postcardBeat.actorActive,
        postcardBeat.pauseDisabled, postcardBeat.overlayHidden],
      [1, "DONE", false, true, false],
      "cutscene stage: departure stops the actor and opens the postcard overlay",
    );
    const postcard = await page.evaluate(() => {
      const card = document.querySelector(".ov-card");
      const scene = card.querySelector(".cutscene-scene");
      const color = getComputedStyle(card).backgroundColor.match(/[\d.]+/g).map(Number);
      return {
        cutsceneMode: card.classList.contains("cutscene-mode"),
        brightness: (color[0] + color[1] + color[2]) / 3,
        sceneBackground: scene ? scene.style.backgroundImage : "",
        momCount: card.querySelectorAll(".cutscene-scene .cutscene-mom").length,
        title: document.getElementById("ov-title").textContent,
        expectedTitle: eval("LEVELS[stageIdx].cutscene.text"),
        message: document.getElementById("ov-msg").textContent,
        action: document.getElementById("ov-btn").dataset.ovType,
      };
    });
    assert.equal(postcard.cutsceneMode, true, "story postcard uses the dedicated landscape card mode");
    assert.ok(postcard.brightness >= 245, "story postcard stays bright and child-friendly");
    assert.match(postcard.sceneBackground, /stage2_forest_gate_16x9/,
      "story postcard remains visually anchored to the stage just explored");
    assert.equal(postcard.momCount, 1, "story postcard shows one mother vignette");
    assert.equal(postcard.title, postcard.expectedTitle, "story postcard preserves the stage narrative");
    assert.equal(postcard.message, "", "story postcard avoids a second competing text block");
    assert.equal(postcard.action, "cutscene-next", "story postcard exposes one explicit next action");

    await page.locator("#ov-btn").click();
    const afterPostcard = await page.evaluate(() => eval(`({
      stage: stageIdx,
      phase: journeyActor.phase,
      actorActive: journeyActor.active,
      pauseDisabled: btnPause.disabled,
      overlayHidden: overlay.classList.contains('hidden')
    })`));
    assert.deepEqual(afterPostcard,
      { stage: 2, phase: "INTRO", actorActive: true, pauseDisabled: true, overlayHidden: true },
      "cutscene-next begins exactly one next-stage INTRO with pause unavailable");
    const playingAfterPostcard = await advanceJourneyBeat(page, "INTRO");
    assert.equal(playingAfterPostcard.pauseDisabled, false,
      "pause returns after the post-card INTRO reaches PLAYING");

    /* Final stage: departure terminates in GAME_CLEAR and one reunion composition. */
    const finalReady = await prepareSolvedStage(page, 7);
    assert.equal(finalReady.introPauseDisabled, true, "final stage: pause is disabled during INTRO");
    assert.equal(finalReady.playingPauseDisabled, false, "final stage: pause is enabled in PLAYING");
    await page.evaluate(() => { window.triggerFirstClearReward = null; });
    const finalExit = await startSolvedJourney(page);
    assert.deepEqual([finalExit.phase, finalExit.clue, finalExit.pauseDisabled],
      ["EXIT", false, true], "final stage: reunion stays hidden during EXIT");
    const finalDiscovery = await advanceJourneyBeat(page, "EXIT");
    assert.deepEqual([finalDiscovery.phase, finalDiscovery.clue], ["DISCOVERY", true],
      "final stage: mother appears only when Pono arrives");
    const finalDeparting = await advanceJourneyBeat(page, "DISCOVERY");
    assert.equal(finalDeparting.phase, "DEPARTING");
    const gameClearBeat = await advanceJourneyBeat(page, "DEPARTING");
    assert.deepEqual(
      [gameClearBeat.stage, gameClearBeat.phase, gameClearBeat.gameClear,
        gameClearBeat.actorActive, gameClearBeat.pauseDisabled, gameClearBeat.overlayHidden],
      [7, "DONE", true, false, true, false],
      "final departure terminates in one non-pausable GAME_CLEAR overlay",
    );
    assert.deepEqual(await captureJourneyActors(page), { world: 0, walk: 0, clue: 0, mom: 1 },
      "GAME_CLEAR canvas has no duplicate Pono while retaining the discovered mother");
    const reunion = await page.evaluate(() => ({
      cutsceneMode: document.querySelector(".ov-card").classList.contains("cutscene-mode"),
      title: document.getElementById("ov-title").textContent,
      action: document.getElementById("ov-btn").dataset.ovType,
      ponoCount: document.querySelectorAll(".cutscene-scene .cutscene-pono").length,
      momCount: document.querySelectorAll(".cutscene-scene .cutscene-mom").length,
      heartsCount: document.querySelectorAll(".cutscene-scene .cutscene-hearts").length,
    }));
    assert.deepEqual(reunion, {
      cutsceneMode: true,
      title: "おかあさんと さいかい！",
      action: "gameclear",
      ponoCount: 1,
      momCount: 1,
      heartsCount: 1,
    }, "the reunion postcard contains exactly one Pono and one mother");
    assert.deepEqual(errors, [], "all accelerated normal-stage transitions create no page errors");
  } finally {
    await browser.close();
  }
}

async function main() {
  const { server, base } = await startServer();
  try {
    for (const [viewport, minimumCell, hasTouch] of [
      [{ width: 568, height: 320 }, 58, false],
      [{ width: 667, height: 375 }, 71, true],
      [{ width: 844, height: 390 }, 74, false],
      [{ width: 1024, height: 768 }, 114, false],
      [{ width: 1366, height: 768 }, 157, false],
    ]) {
      await inspectLandscape(chromium, "chromium", base, viewport, minimumCell,
        viewport.width === 844 && viewport.height === 390, hasTouch);
    }
    await inspectLandscape(webkit, "webkit", base, { width: 844, height: 390 }, 74, true);
    await inspectFirstRunTutorial(base);
    await inspectJourneyTransitions(base);

    const reduced = await openPlayingPage(chromium, "chromium-reduced", base,
      { width: 844, height: 390 }, "reduce");
    try {
      assert.equal(await reduced.page.evaluate(() => eval("reducedMotionQuery.matches")), true,
        "reduced-motion users receive the static world-board treatment");
      const identicalFrames = await reduced.page.evaluate(() => eval(`(() => {
        hintReadyAt = 0;
        draw(1000);
        const first = canvas.toDataURL();
        draw(5000);
        return first === canvas.toDataURL();
      })()`));
      assert.equal(identicalFrames, true,
        "reduced-motion world-board pixels remain static across distant timestamps");
    } finally {
      await reduced.browser.close();
    }

    const portraitBrowser = await chromium.launch({ headless: true });
    const portraitContext = await portraitBrowser.newContext({ viewport: { width: 390, height: 844 } });
    await keepNetworkLocal(portraitContext, base);
    const portraitPage = await portraitContext.newPage();
    await portraitPage.addInitScript(() => { window.__APP_BUILD__ = 1; });
    await portraitPage.goto(`${base}/slide/`, { waitUntil: "domcontentloaded" });
    assert.equal(await portraitPage.locator("#landscape-notice").evaluate(element => getComputedStyle(element).display), "flex",
      "portrait keeps the friendly landscape fallback");
    await portraitBrowser.close();

    const gateBrowser = await chromium.launch({ headless: true });
    const gatePage = await gateBrowser.newPage({ viewport: { width: 844, height: 390 } });
    await keepNetworkLocal(gatePage, base);
    await gatePage.goto(`${base}/slide/`, { waitUntil: "domcontentloaded" });
    await gatePage.waitForURL(/\/play\.html(?:$|[?#])/);
    assert.equal(new URL(gatePage.url()).pathname, "/play.html",
      "LP/free-tier visitors remain gated while App builds can play");
    await gateBrowser.close();

    const bookBrowser = await chromium.launch({ headless: true });
    const bookContext = await bookBrowser.newContext({ viewport: { width: 844, height: 390 } });
    await keepNetworkLocal(bookContext, base);
    const bookPage = await bookContext.newPage();
    await bookPage.addInitScript(() => {
      localStorage.setItem("pono_premium", "1");
      localStorage.setItem("slide_tut_seen", "1");
      localStorage.setItem("pono_bgm_enabled", "off");
    });
    await bookPage.goto(`${base}/slide/`, { waitUntil: "domcontentloaded" });
    assert.equal(new URL(bookPage.url()).pathname, "/slide/",
      "LP/book-tier visitors retain access without App-build injection");
    assert.equal(await bookPage.evaluate(() => window.PonoTier.getTier()), "book");
    await bookBrowser.close();
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
  console.log("slide_worldboard_visual_regression: all assertions passed");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
