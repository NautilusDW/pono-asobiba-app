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
assert.match(html, /function drawEmptySlot\(now\)[\s\S]*?ctx\.fillText\('ここへ'/,
  "the empty destination must name the primary action in child-facing kana");

/* A legal next move and the start-connected route must be visible at a glance. */
assert.match(html, /function getStartConnectedTileSet\(\)/);
assert.match(html, /connected\.add\(idx\)/);
assert.match(html, /const connectedSet = hasBoard \? getStartConnectedTileSet\(\) : new Set\(\)/);
assert.match(html, /connected: connectedSet\.has\(i\)/);
assert.match(html, /\? new Set\(getAdjacentIndices\(emptyIdx\)\.filter\(index => grid\[index\] !== null\)\)/);
assert.match(html, /movableSet\.forEach\(index => drawMoveHint\(index, now\)\)/);
assert.match(html, /ctx\.lineDashOffset = reducedMotionQuery\.matches \? 0/,
  "flow and hint animation must become static when reduced motion is requested");
assert.match(html, /roadStyle: 'wood'/);
assert.match(html, /roadStyle: 'stone'/);
assert.match(html, /roadStyle: 'starlight'/);
assert.match(html, /visual\.movable \? th\.move : th\.slabBorder/,
  "movable panels use a state color distinct from the connected route and empty hollow");

/* Characters occupy the world, preserve aspect ratio, and render only once per frame. */
assert.match(html, /imgPonoWorld\.src = '\.\.\/assets\/images\/characters\/pono\/pono_001\.png'/);
assert.equal((html.match(/ctx\.drawImage\(imgPonoWorld,/g) || []).length, 1,
  "stationary Pono must have one draw site");
assert.equal((html.match(/ctx\.drawImage\(imgMomFull,/g) || []).length, 1,
  "the final-stage mother must have one draw site");
assert.match(html, /ponoH \* ponoRatio/);
assert.match(html, /momH \* imgMomFull\.naturalWidth \/ imgMomFull\.naturalHeight/);
assert.match(html, /if \(!winAnim\.active && state === S\.PLAYING\)/,
  "stationary Pono must disappear while the single walking sprite is active");

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
        if (source.includes("/pono/pono_001.png")) window.__slideDirectDraws.world++;
        if (source.includes("pono_walk_sheet") || source.includes("pono_walk_side_sheet")) {
          window.__slideDirectDraws.walk++;
        }
      }
      return nativeDrawImage.call(this, image, ...args);
    };
  });
  await page.goto(`${base}/slide/`, { waitUntil: "domcontentloaded" });
  await page.locator("#ov-btn").click();
  await page.locator("#ov-btn").click();
  await page.waitForTimeout(220);
  assert.equal(await page.locator("#overlay").evaluate(element => element.classList.contains("hidden")), true,
    `${browserName} ${viewport.width}x${viewport.height}: gameplay overlay closes`);
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
      CW, CH, cellSize, gridOX, gridOY, emptyIdx, moveCount,
      movable: getAdjacentIndices(emptyIdx).filter(index => grid[index] !== null)
    })`));
    assert.ok(before.movable.length >= 2, `${browserName}: at least two legal neighbors are hinted`);
    const chosen = before.movable[0];
    const row = Math.floor(chosen / 3), col = chosen % 3;
    const canvas = await page.locator("#gameCanvas").boundingBox();
    await page.mouse.click(
      canvas.x + (before.gridOX + (col + 0.5) * before.cellSize) * canvas.width / before.CW,
      canvas.y + (before.gridOY + (row + 0.5) * before.cellSize) * canvas.height / before.CH,
    );
    await page.waitForTimeout(220);
    const after = await page.evaluate(() => eval("({ emptyIdx, moveCount })"));
    assert.equal(after.emptyIdx, chosen, `${browserName}: tapping a hinted panel moves it into the hollow`);
    assert.equal(after.moveCount, 1, `${browserName}: a legal move increments the HUD once`);

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
        assert.equal(runtime.theme, stage < 3 ? "forest" : stage < 7 ? "cave" : "night",
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
        winAnim.active = false;
        window.__slideDirectDraws = { world: 0, walk: 0 };
        draw(1000);
        const standing = { ...window.__slideDirectDraws };

        state = S.STAGE_CLEAR;
        winAnim.active = true;
        winAnim.t0 = 1000;
        winAnim.path = traceWinPath();
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

    await page.evaluate(() => eval("if (winAnim.active) winAnim.t0 -= 100000"));
    await page.waitForTimeout(220);
    await page.locator("#tut-next").waitFor({ state: "visible" });
    assert.match(await page.locator("#tut-bubble").textContent(), /できた！/,
      "the three guided moves end with connected-route feedback");
    assert.equal(await page.evaluate(() => eval("moveCount")), 3,
      "the guided tutorial performs exactly three legal moves");
    await page.locator("#tut-next").click();
    await page.waitForTimeout(80);
    assert.equal(await page.locator("#btn-pause").isEnabled(), true,
      "pause is restored after the guided tutorial ends");
    assert.equal(await page.evaluate(() => localStorage.getItem("slide_tut_seen")), "1",
      "tutorial completion is remembered");
    assert.equal(await page.evaluate(() => eval("state === S.IDLE")), true,
      "the stage-start modal is non-playing after the tutorial");
    await page.locator("#btn-pause").click();
    assert.equal(await page.evaluate(() => eval("state === S.IDLE")), true,
      "pause cannot put the stage-start modal into a stale paused state");
    assert.equal(await page.locator("#btn-pause").textContent(), "⏸");
    await page.locator("#ov-btn").click();
    assert.equal(await page.evaluate(() => eval("state === S.PLAYING")), true,
      "closing stage-start enters gameplay");
    assert.equal(await page.locator("#btn-pause").textContent(), "⏸",
      "gameplay begins with the pause action and icon aligned");
    assert.deepEqual(errors, [], "first-run tutorial creates no page errors");
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

    const reduced = await openPlayingPage(chromium, "chromium-reduced", base,
      { width: 844, height: 390 }, "reduce");
    try {
      assert.equal(await reduced.page.evaluate(() => eval("reducedMotionQuery.matches")), true,
        "reduced-motion users receive the static world-board treatment");
      const identicalFrames = await reduced.page.evaluate(() => eval(`(() => {
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
