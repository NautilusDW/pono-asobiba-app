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
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".mp3": "audio/mpeg",
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

async function clickTile(page, index) {
  const geometry = await page.evaluate(tileIndex => eval(`(() => ({
    CW, CH, gridOX, gridOY, cellSize, curCols,
    row: Math.floor(${tileIndex} / curCols), col: ${tileIndex} % curCols
  }))()`), index);
  const box = await page.locator("#gameCanvas").boundingBox();
  await page.mouse.click(
    box.x + (geometry.gridOX + (geometry.col + 0.5) * geometry.cellSize) * box.width / geometry.CW,
    box.y + (geometry.gridOY + (geometry.row + 0.5) * geometry.cellSize) * box.height / geometry.CH,
  );
}

async function inspectEngine(browserType, label, base, viewport = { width: 844, height: 390 }) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport, hasTouch: true, isMobile: viewport.width <= 568 });
  await keepNetworkLocal(context, base);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    localStorage.setItem("slide_tut_seen", "1");
    localStorage.setItem("pono_bgm_enabled", "off");
    window.__charmDraws = 0;
    const nativeDraw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function(image, ...args) {
      if (image && String(image.src || "").includes("fourway_charm.webp")) window.__charmDraws++;
      return nativeDraw.call(this, image, ...args);
    };
  });

  try {
    await page.goto(`${base}/slide/`, { waitUntil: "domcontentloaded" });
    await page.locator("#ov-btn").click();
    await page.waitForFunction(() => eval("state === S.PLAYING && !journeyActor.active"));
    await page.waitForFunction(() => eval(
      "imgFourwayCharm.complete && imgFourwayCharm.naturalWidth > 0 && " +
      "imgGoalMarker.complete && imgGoalMarker.naturalWidth > 0 && " +
      "Object.values(roadTextureImgs).every(image => image.complete && image.naturalWidth > 0)"));

    for (const stage of [0, 1]) {
      const basic = await page.evaluate(nextStage => eval(`(() => {
        beginStage(${nextStage});
        journeyActor.t0 -= 100000;
        updateJourney(performance.now());
        return {
          pickup: pickupTileIdx,
          magic: magicCrossTileIdx,
          buttonHidden: magicCrossBtn.classList.contains('hidden')
        };
      })()`), stage);
      assert.deepEqual(basic, { pickup: -1, magic: -1, buttonHidden: true },
        `${label} stage${stage + 1}: basic play has no later mechanic UI or state`);
    }

    const stage3 = await page.evaluate(() => eval(`(() => {
      beginStage(2);
      journeyActor.t0 -= 100000;
      updateJourney(performance.now());
      window.__charmDraws = 0;
      draw(performance.now());
      return {
        pickupTileIdx,
        pickupType: grid[pickupTileIdx],
        collected: pickupCollected,
        draws: window.__charmDraws,
        buttonHidden: magicCrossBtn.classList.contains('hidden'),
        toast: document.getElementById('journey-toast').textContent
      };
    })()`));
    assert.equal(stage3.pickupType, "CROSS", `${label} stage3: pickup stays attached to its shuffled road tile`);
    assert.equal(stage3.collected, false, `${label} stage3: the item is not granted before Pono walks through it`);
    assert.ok(stage3.draws >= 1, `${label} stage3: the generated charm is visibly drawn on the route`);
    assert.equal(stage3.buttonHidden, true, `${label} stage3: collecting needs no new control`);
    assert.match(stage3.toast, /ひかりを とおって/, `${label} stage3: one short route instruction is shown`);

    const journeyPickup = await page.evaluate(() => eval(`(() => {
      grid = [...LEVELS[2].solved];
      emptyIdx = grid.indexOf(null);
      resetStageMechanics(LEVELS[2]);
      state = S.PLAYING;
      journeyActor.active = false;
      calcLayout();
      if (!checkWin()) throw new Error('stage3 solved route did not include pickup');
      onStageClear();
      const beforeProgress = pickupJourneyProgress;
      updateJourneyPosition(journeyActor.t0);
      const before = pickupCollected;
      updateJourneyPosition(journeyActor.t0 + journeyActor.duration);
      window.__charmDraws = 0;
      draw(performance.now());
      return {
        beforeProgress,
        before,
        after: pickupCollected,
        owned: magicCharmOwned,
        drawsAfter: window.__charmDraws,
      };
    })()`));
    assert.ok(journeyPickup.beforeProgress > 0 && journeyPickup.beforeProgress < 1,
      `${label} stage3: pickup has a real point inside the walking route`);
    assert.equal(journeyPickup.before, false, `${label} stage3: item remains before the actor reaches it`);
    assert.equal(journeyPickup.after, true, `${label} stage3: actor crossing collects the item`);
    assert.equal(journeyPickup.owned, true, `${label} stage3: collected item carries into the next rule`);
    assert.equal(journeyPickup.drawsAfter, 0, `${label} stage3: collected item disappears from its panel`);

    const bypass = await page.evaluate(() => eval(`(() => {
      stageIdx = 2;
      curCols = LEVELS[2].cols;
      curRows = LEVELS[2].rows;
      grid = [...LEVELS[2].solved];
      grid[8] = 'H';
      emptyIdx = grid.indexOf(null);
      pickupTileIdx = 8;
      pickupCollected = false;
      magicCrossTileIdx = -1;
      return { bare: hasBareGoalRoute(), complete: checkWin() };
    })()`));
    assert.deepEqual(bypass, { bare: true, complete: false },
      `${label} stage3: reaching the flag while skipping the charm remains non-punitive play`);

    const stage4 = await page.evaluate(() => eval(`(() => {
      beginStage(3);
      journeyActor.t0 -= 100000;
      updateJourney(performance.now());
      grid = [...LEVELS[3].solved];
      emptyIdx = grid.indexOf(null);
      resetStageMechanics(LEVELS[3]);
      state = S.PLAYING;
      journeyActor.active = false;
      calcLayout();
      syncMagicCrossButton();
      return {
        rawWin: checkWin(),
        buttonHidden: magicCrossBtn.classList.contains('hidden'),
        buttonDisabled: magicCrossBtn.disabled,
        target: LEVELS[3].magicCross.target.row * curCols + LEVELS[3].magicCross.target.col,
        grid: JSON.stringify(grid)
      };
    })()`));
    assert.equal(stage4.rawWin, false, `${label} stage4: raw straight/vertical roads cannot clear`);
    assert.equal(stage4.buttonHidden, false, `${label} stage4: the generated charm control appears only now`);
    assert.equal(stage4.buttonDisabled, false, `${label} stage4: charm control is operational in PLAYING`);

    const compactLayout = await page.evaluate(() => {
      const button = document.getElementById("magic-cross-btn").getBoundingClientRect();
      const rail = document.querySelector(".game-rail").getBoundingClientRect();
      return {
        buttonLeft: button.left,
        buttonWidth: button.width,
        buttonHeight: button.height,
        railRight: rail.right,
        emptySelectable: eval("isMagicSelectableTile(emptyIdx)"),
        selectableCount: eval("grid.filter((tile, index) => isMagicSelectableTile(index)).length"),
      };
    });
    assert.ok(compactLayout.buttonHeight >= 48 && compactLayout.buttonWidth >= 88,
      `${label} stage4: charm control remains a child-sized touch target`);
    assert.ok(compactLayout.buttonLeft >= compactLayout.railRight,
      `${label} stage4: charm control does not cover the story HUD`);
    assert.equal(compactLayout.emptySelectable, false,
      `${label} stage4: the recessed empty well is never presented as a charm target`);
    assert.ok(compactLayout.selectableCount >= 3,
      `${label} stage4: several road panels remain safe, visible choices`);

    await page.locator("#magic-cross-btn").click();
    assert.equal(await page.locator("#magic-cross-btn").getAttribute("aria-pressed"), "true",
      `${label} stage4: button clearly enters one-tile selection mode`);
    const wrong = await page.evaluate(() => eval("LEVELS[3].goal.row * curCols"));
    await clickTile(page, wrong);
    const afterWrong = await page.evaluate(() => eval(`({
      selected: magicCrossTileIdx,
      playing: state === S.PLAYING,
      complete: checkWin(),
      grid: JSON.stringify(grid),
      label: magicCrossBtnLabel.textContent,
      ariaLabel: magicCrossBtn.getAttribute('aria-label')
    })`));
    assert.equal(afterWrong.selected, wrong, `${label} stage4: first choice is applied without penalty`);
    assert.equal(afterWrong.playing, true, `${label} stage4: a wrong choice does not fail or leave play`);
    assert.equal(afterWrong.complete, false, `${label} stage4: wrong choice does not fake a connection`);
    assert.equal(afterWrong.grid, stage4.grid, `${label} stage4: magic never rewrites the underlying tiles`);
    assert.equal(afterWrong.label, "つけかえ", `${label} stage4: the same button exposes reassignment`);
    assert.match(afterWrong.ariaLabel, /つけかえる/,
      `${label} stage4: assistive label also explains reassignment`);

    await page.locator("#magic-cross-btn").click();
    await clickTile(page, stage4.target);
    const afterCorrect = await page.evaluate(() => eval(`({
      selected: magicCrossTileIdx,
      travelling: state === S.TRAVELLING,
      phase: journeyActor.phase,
      grid: JSON.stringify(grid)
    })`));
    assert.equal(afterCorrect.selected, stage4.target, `${label} stage4: charm moves to the intended road`);
    assert.equal(afterCorrect.travelling, true, `${label} stage4: reassignment itself can complete the route`);
    assert.equal(afterCorrect.phase, "EXIT", `${label} stage4: one actor begins the normal exit journey`);
    assert.equal(afterCorrect.grid, stage4.grid, `${label} stage4: successful magic still preserves base tile data`);

    const seam = await page.evaluate(() => eval(`(() => {
      stageIdx = 0;
      curCols = LEVELS[0].cols;
      curRows = LEVELS[0].rows;
      grid = [...LEVELS[0].solved];
      emptyIdx = grid.indexOf(null);
      resetStageMechanics(LEVELS[0]);
      state = S.PLAYING;
      journeyActor.active = false;
      calcLayout();
      draw(1000);
      const boundaryX = Math.round(gridOX + cellSize);
      const centerY = Math.round(gridOY + (LEVELS[0].start.row + 0.5) * cellSize);
      const pixels = ctx.getImageData(boundaryX - 4, centerY, 9, 1).data;
      const luminance = [];
      for (let i = 0; i < pixels.length; i += 4) {
        luminance.push((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
      }
      return { minimum: Math.min(...luminance), spread: Math.max(...luminance) - Math.min(...luminance) };
    })()`));
    assert.ok(seam.minimum >= 95,
      `${label}: generated road remains painted through the shared panel boundary`);
    assert.ok(seam.spread <= 125,
      `${label}: flat overlapping road ends do not leave a dark rounded gap`);
    assert.deepEqual(errors, [], `${label}: mechanics produce no page errors`);
  } finally {
    await browser.close();
  }
}

async function main() {
  const { server, base } = await startServer();
  try {
    await inspectEngine(chromium, "chromium", base);
    await inspectEngine(webkit, "webkit", base);
    await inspectEngine(chromium, "chromium compact touch", base, { width: 568, height: 320 });
    console.log("slide_route_mechanics_visual_regression: all assertions passed");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
