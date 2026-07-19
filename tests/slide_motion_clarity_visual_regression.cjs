#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
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
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

async function keepNetworkLocal(context, base) {
  await context.route("**/*", route => {
    const url = route.request().url();
    if (url.startsWith(base) || url.startsWith("data:") || url.startsWith("blob:")) {
      return route.continue();
    }
    return route.abort();
  });
}

async function openPlaying(base, options = {}) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: options.viewport || { width: 844, height: 390 },
    reducedMotion: options.reducedMotion || "no-preference",
  });
  await keepNetworkLocal(context, base);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ tutorialSeen }) => {
    window.__APP_BUILD__ = 1;
    localStorage.setItem("pono_bgm_enabled", "off");
    if (tutorialSeen) localStorage.setItem("slide_tut_seen", "1");
    else localStorage.removeItem("slide_tut_seen");
  }, { tutorialSeen: options.tutorialSeen !== false });
  await page.goto(`${base}/slide/${options.query || ""}`, { waitUntil: "domcontentloaded" });
  return { browser, context, page, errors };
}

async function enterPlay(page) {
  await page.locator("#ov-btn").click();
  await page.evaluate(() => eval(`(() => {
    if (journeyActor.active) {
      journeyActor.t0 -= 100000;
      updateJourney(performance.now());
    }
  })()`));
  await page.waitForFunction(() => eval("state === S.PLAYING && !journeyActor.active"));
}

async function inspectMotion(base, viewport) {
  const session = await openPlaying(base, { viewport });
  const { browser, page, errors } = session;
  try {
    await enterPlay(page);
    const cue = await page.evaluate(() => eval(`(() => {
      hintReadyAt = 0;
      hintDismissed = false;
      const source = suggestedMoveIdx;
      const destination = emptyIdx;
      const previewNow = 3465 - source * 79;
      const calls = [];
      const original = drawEmptySlot;
      drawEmptySlot = function(now, index, visual) {
        calls.push({ index, visual: { ...(visual || {}) } });
        return original(now, index, visual);
      };
      draw(previewNow);
      drawEmptySlot = original;
      return {
        source, destination,
        amount: getHintPreviewAmount(previewNow, source),
        calls,
        legal: getAdjacentIndices(emptyIdx).filter(index =>
          grid[index] !== null && !isCheckpointLockedCell(index)),
        cellSize,
      };
    })()`));
    assert.ok(cue.amount >= 0.119,
      `${viewport.width}x${viewport.height}: the whole suggested panel visibly previews its move`);
    assert.ok(cue.calls.some(call => call.index === cue.destination && call.visual.target),
      "the empty destination receives the matching warm receiver rim");
    assert.ok(cue.calls.some(call => call.index === cue.source && call.visual.preview),
      "the preview reveals the future hollow under the source panel");
    assert.ok(cue.legal.includes(cue.source), "the previewed source is a legal neighbor");
    assert.ok(cue.cellSize >= 58, `${viewport.width}x${viewport.height}: panels remain touch-sized`);

    const before = await page.evaluate(() => eval(`({
      source: suggestedMoveIdx,
      destination: emptyIdx,
      tile: grid[suggestedMoveIdx],
      grid: JSON.stringify(grid),
      moveCount,
      CW, CH, gridOX, gridOY, cellSize, curCols
    })`));
    const canvas = await page.locator("#gameCanvas").boundingBox();
    const sourceRow = Math.floor(before.source / before.curCols);
    const sourceCol = before.source % before.curCols;
    await page.mouse.click(
      canvas.x + (before.gridOX + (sourceCol + 0.5) * before.cellSize) * canvas.width / before.CW,
      canvas.y + (before.gridOY + (sourceRow + 0.5) * before.cellSize) * canvas.height / before.CH,
    );

    const motion = await page.evaluate(() => eval(`(() => {
      const acceptedSource = anim.idx;
      const acceptedTarget = anim.targetIdx;
      const beforeGrid = JSON.stringify(grid);
      const beforeEmpty = emptyIdx;
      const beforeMoves = moveCount;
      const midpoint = anim.t0 + getSlideDuration() * 0.5;
      updateAnim(midpoint);
      const slotCalls = [];
      const tileCalls = [];
      const originalSlot = drawEmptySlot;
      const originalTile = drawTileBase;
      drawEmptySlot = function(now, index, visual) {
        slotCalls.push({ index, visual: { ...(visual || {}) } });
        return originalSlot(now, index, visual);
      };
      drawTileBase = function(x, y, size, tileKey, visual) {
        tileCalls.push({ x, y, size, index: visual.index,
          animating: !!visual.animating, suggested: !!visual.suggested });
        return originalTile(x, y, size, tileKey, visual);
      };
      draw(midpoint);
      drawEmptySlot = originalSlot;
      drawTileBase = originalTile;
      const mid = {
        animating, source: acceptedSource, target: acceptedTarget,
        x: anim.curX, y: anim.curY,
        fromX: anim.fromX, fromY: anim.fromY, toX: anim.toX, toY: anim.toY,
        gridUnchanged: JSON.stringify(grid) === beforeGrid,
        emptyUnchanged: emptyIdx === beforeEmpty,
        movesUnchanged: moveCount === beforeMoves,
        secondTapAccepted: handleTap(anim.fromX + cellSize / 2, anim.fromY + cellSize / 2),
        slotCalls, tileCalls,
      };
      updateAnim(anim.t0 + getSlideDuration() + 1);
      const done = {
        animating, emptyIdx, moveCount,
        sourceTile: grid[acceptedSource], targetTile: grid[acceptedTarget],
        emptyCount: grid.filter(tile => tile === null).length,
        feedback: { ...moveFeedback },
      };
      state = S.PLAYING;
      journeyActor.active = false;
      overlay.classList.add('hidden');
      const nextSource = getAdjacentIndices(emptyIdx).find(index =>
        grid[index] !== null && !isCheckpointLockedCell(index));
      const nextRow = Math.floor(nextSource / curCols), nextCol = nextSource % curCols;
      const nextAccepted = handleTap(gridOX + (nextCol + 0.5) * cellSize,
        gridOY + (nextRow + 0.5) * cellSize);
      const nextStart = anim.t0;
      updateAnim(nextStart + 80);
      const beforeSuspend = { x: anim.curX, y: anim.curY };
      slideWindowFocused = false;
      syncSlideAnimationSuspension(nextStart + 80);
      updateAnim(nextStart + 5080);
      const whileSuspended = { x: anim.curX, y: anim.curY, animating };
      slideWindowFocused = true;
      syncSlideAnimationSuspension(nextStart + 5080);
      updateAnim(nextStart + 5080);
      const afterResume = { x: anim.curX, y: anim.curY, animating };
      updateAnim(anim.t0 + getSlideDuration() + 1);
      return {
        mid, done,
        suspension: { nextAccepted, beforeSuspend, whileSuspended, afterResume },
      };
    })()`));

    assert.equal(motion.mid.animating, true, "the panel remains in-flight at the midpoint");
    assert.equal(motion.mid.gridUnchanged, true, "the board is not committed halfway through the glide");
    assert.equal(motion.mid.emptyUnchanged, true, "the accepted destination stays the hollow until landing");
    assert.equal(motion.mid.movesUnchanged, true, "the HUD does not count a half-finished move");
    assert.equal(motion.mid.secondTapAccepted, false, "a second tap cannot replace an in-flight panel");
    assert.ok(motion.mid.slotCalls.some(call => call.index === motion.mid.source && call.visual.source),
      "the vacated source hollow is painted under the in-flight panel");
    assert.ok(motion.mid.slotCalls.some(call => call.index === motion.mid.target && call.visual.target),
      "the original destination hollow remains visible until the panel covers it");
    const movingTile = motion.mid.tileCalls.find(call => call.index === motion.mid.source && call.animating);
    assert.ok(movingTile, "exactly the selected source panel keeps the moving visual state");
    assert.ok(movingTile.size > before.cellSize,
      "the selected panel lifts slightly without hiding its road opening");
    assert.ok(Math.abs(motion.mid.x - motion.mid.fromX) > 1 && Math.abs(motion.mid.x - motion.mid.toX) > 1 ||
      Math.abs(motion.mid.y - motion.mid.fromY) > 1 && Math.abs(motion.mid.y - motion.mid.toY) > 1,
      "the midpoint lies between the source and destination");

    assert.equal(motion.done.animating, false, "the move commits once");
    assert.equal(motion.done.emptyIdx, before.source, "the source becomes the next empty hollow");
    assert.equal(motion.done.sourceTile, null, "the source panel is visibly vacated");
    assert.equal(motion.done.targetTile, before.tile, "the same road panel lands in the accepted destination");
    assert.equal(motion.done.emptyCount, 1, "the board still contains exactly one hollow");
    assert.equal(motion.done.moveCount, before.moveCount + 1, "one visible landing counts as one move");
    assert.deepEqual(
      [motion.done.feedback.fromIdx, motion.done.feedback.toIdx],
      [before.source, before.destination],
      "the short landing beat links the filled destination and new hollow",
    );
    assert.equal(motion.suspension.nextAccepted, true, "a following legal move starts normally");
    assert.deepEqual(
      [motion.suspension.whileSuspended.x, motion.suspension.whileSuspended.y],
      [motion.suspension.beforeSuspend.x, motion.suspension.beforeSuspend.y],
      "the panel cannot finish while the child cannot see the board",
    );
    assert.deepEqual(
      [motion.suspension.afterResume.x, motion.suspension.afterResume.y],
      [motion.suspension.beforeSuspend.x, motion.suspension.beforeSuspend.y],
      "the panel resumes from the same visible position instead of jumping",
    );
    assert.equal(motion.suspension.afterResume.animating, true,
      "the remaining glide continues after focus returns");
    assert.deepEqual(errors, [], `${viewport.width}x${viewport.height}: no page errors`);
  } finally {
    await browser.close();
  }
}

async function inspectReducedMotion(base) {
  const session = await openPlaying(base, {
    viewport: { width: 844, height: 390 }, reducedMotion: "reduce",
  });
  const { browser, page, errors } = session;
  try {
    await enterPlay(page);
    const result = await page.evaluate(() => eval(`(() => {
      hintReadyAt = 0;
      hintDismissed = false;
      draw(1000);
      const first = canvas.toDataURL();
      draw(5000);
      const second = canvas.toDataURL();
      const source = suggestedMoveIdx;
      const row = Math.floor(source / curCols), col = source % curCols;
      const accepted = handleTap(gridOX + (col + 0.5) * cellSize,
        gridOY + (row + 0.5) * cellSize);
      updateAnim(anim.t0 + REDUCED_SLIDE_DUR + 1);
      return {
        reduced: reducedMotionQuery.matches,
        amount: getHintPreviewAmount(1000, source),
        identical: first === second,
        accepted, animating, emptyIdx, source,
      };
    })()`));
    assert.equal(result.reduced, true);
    assert.equal(result.amount, 0, "reduced motion removes the automatic panel nudge");
    assert.equal(result.identical, true, "the static gold cue does not pulse over time");
    assert.equal(result.accepted, true);
    assert.equal(result.animating, false, "the reduced-motion move commits immediately");
    assert.equal(result.emptyIdx, result.source);
    assert.deepEqual(errors, [], "reduced-motion run has no page errors");
  } finally {
    await browser.close();
  }
}

async function inspectDirectCheckpointReview(base) {
  const session = await openPlaying(base, {
    viewport: { width: 844, height: 390 }, query: "?stage=3", tutorialSeen: false,
  });
  const { browser, page, errors } = session;
  try {
    assert.match(await page.locator("#ov-msg").textContent(), /もりが ふかく/,
      "the direct link opens the stage-three story instead of hiding it behind stage one");
    assert.equal(await page.locator("#ov-btn").textContent(), "さがしにいく ▶",
      "direct prototype review bypasses first-run practice");
    await enterPlay(page);
    const state = await page.evaluate(() => eval(`({
      stageIdx,
      hasCheckpoint: !!LEVELS[stageIdx].checkpoint,
      checkpointReached: stageCheckpointReached,
      phase: journeyActor.phase
    })`));
    assert.deepEqual(
      [state.stageIdx, state.hasCheckpoint, state.checkpointReached, state.phase],
      [2, true, false, "PLAYING"],
      "the review link lands on the first checkpoint leg",
    );
    assert.deepEqual(errors, [], "direct checkpoint review has no page errors");
  } finally {
    await browser.close();
  }
}

(async () => {
  const { server, base } = await startServer();
  try {
    await inspectMotion(base, { width: 568, height: 320 });
    await inspectMotion(base, { width: 844, height: 390 });
    await inspectReducedMotion(base);
    await inspectDirectCheckpointReview(base);
    console.log("slide motion clarity visual regression: PASS");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
