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
  ".css": "text/css; charset=utf-8", ".png": "image/png", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".mp3": "audio/mpeg",
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
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

async function keepNetworkLocal(context, base) {
  await context.route("**/*", route => {
    const url = route.request().url();
    if (url.startsWith(base) || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
    return route.abort();
  });
}

(async () => {
  const { server, base } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
  await keepNetworkLocal(context, base);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    localStorage.setItem("slide_tut_seen", "1");
    localStorage.setItem("pono_bgm_enabled", "off");
  });

  try {
    await page.goto(`${base}/slide/`, { waitUntil: "domcontentloaded" });
    await page.locator("#ov-btn").click();
    await page.waitForFunction(() => eval("state === S.PLAYING && stageClock.active"));

    const budgets = await page.evaluate(() => eval(`({
      budgets: STAGE_TIME_BUDGETS.slice(),
      retry: LEVELS.map((_, index) => getStageBudgetMs(index, 1) / 1000)
    })`));
    assert.deepEqual(budgets.budgets, [65, 80, 80, 105, 100, 125, 140, 180],
      "difficulty-derived limits include board size, shuffle guarantee, and mechanics");
    assert.deepEqual(budgets.retry, budgets.budgets.map(seconds => Math.round(seconds * 1.25)),
      "the first same-board retry receives 25 percent more time");

    const inlineGuide = await page.evaluate(() => eval(`(() => {
      overlay.classList.add('hidden');
      state = S.PLAYING;
      journeyActor.active = false;
      slideWindowFocused = true;
      stageClock.active = true;
      stageClock.elapsedMs = 0;
      stageClock.lastTick = performance.now();
      showJourneyToast('みちを つないでみよう！', false);
      const hideAt = journeyHudMessageHideAt;
      updateStageClock(stageClock.lastTick + 1000);
      const during = {
        elapsed: stageClock.elapsedMs,
        overlayToast: document.querySelector('#journey-toast').classList.contains('show'),
        hud: document.querySelector('#hud-stage').textContent
      };
      updateJourneyToast(hideAt + 1);
      return { during, restored: document.querySelector('#hud-stage').textContent };
    })()`));
    assert.deepEqual(inlineGuide, {
      during: { elapsed: 0, overlayToast: false, hud: 'みちを つないでみよう！' },
      restored: 'おかあさん いないよ？'
    }, "active guidance uses the HUD instead of covering the board, and pauses the clock while read");

    const monotonic = await page.evaluate(() => eval(`(() => {
      stageIdx = 4;
      stageRetryCount = 0;
      resetStageClock(4);
      overlay.classList.add('hidden');
      state = S.PLAYING;
      journeyActor.active = false;
      slideWindowFocused = true;
      stageClock.active = true;
      stageClock.lastTick = 1000;
      const values = [];
      for (const fraction of [0.1, 0.25, 0.5, 0.75]) {
        updateStageClock(1000 + stageClock.budgetMs * fraction);
        values.push({ pono: stageClock.ponoProgress, mother: stageClock.motherProgress });
      }
      return values;
    })()`));
    for (let index = 1; index < monotonic.length; index++) {
      assert.ok(monotonic[index].pono > monotonic[index - 1].pono,
        "Pono advances on every realtime sample");
      assert.ok(monotonic[index].mother > monotonic[index - 1].mother,
        "mother advances on every realtime sample");
    }
    for (const sample of monotonic) {
      assert.ok(sample.pono <= sample.mother,
        "mother remains visibly a little ahead during the search");
    }

    const suspension = await page.evaluate(() => eval(`(() => {
      stageIdx = 0;
      resetStageClock(0);
      overlay.classList.add('hidden');
      journeyActor.active = false;
      slideWindowFocused = true;
      state = S.PLAYING;
      stageClock.active = true;
      stageClock.lastTick = 1000;
      const result = {};
      function sample(name, setup, teardown) {
        setup();
        const before = stageClock.elapsedMs;
        updateStageClock(stageClock.lastTick + 10000);
        result[name] = stageClock.elapsedMs - before;
        teardown();
      }
      sample('pause', () => { state = S.PAUSED; }, () => { state = S.PLAYING; });
      sample('menu', () => { document.querySelector('.pono-dropdown').classList.add('show'); },
        () => { document.querySelector('.pono-dropdown').classList.remove('show'); });
      sample('confirm', () => { document.querySelector('.pono-confirm-overlay').classList.add('show'); },
        () => { document.querySelector('.pono-confirm-overlay').classList.remove('show'); });
      sample('focus', () => { slideWindowFocused = false; }, () => { slideWindowFocused = true; });
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      sample('hidden', () => {}, () => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      });
      const beforeResume = stageClock.elapsedMs;
      updateStageClock(stageClock.lastTick + 100);
      result.resume = stageClock.elapsedMs - beforeResume;
      return result;
    })()`));
    assert.deepEqual(suspension,
      { pause: 0, menu: 0, confirm: 0, focus: 0, hidden: 0, resume: 100 },
      "only active foreground puzzle time is accumulated");

    const exit = await page.evaluate(() => eval(`(() => {
      stageIdx = 2;
      stageRetryCount = 0;
      resetStageClock(2);
      overlay.classList.add('hidden');
      state = S.PLAYING;
      journeyActor.active = false;
      slideWindowFocused = true;
      stageClock.active = true;
      stageClock.lastTick = 2000;
      updateStageClock(2000 + stageClock.budgetMs * 0.55);
      const before = { pono: stageClock.ponoProgress, mother: stageClock.motherProgress };
      onStageClear();
      updateJourneyPosition(journeyActor.t0 + journeyActor.duration * 0.5);
      const middle = { pono: stageClock.ponoProgress, mother: stageClock.motherProgress };
      updateJourneyPosition(journeyActor.t0 + journeyActor.duration);
      const end = { pono: stageClock.ponoProgress, mother: stageClock.motherProgress };
      return { before, middle, end };
    })()`));
    assert.ok(exit.middle.pono >= exit.before.pono && exit.end.pono >= exit.middle.pono,
      "Pono never rewinds when the real route walk begins");
    assert.ok(exit.middle.mother >= exit.before.mother && exit.end.mother >= exit.middle.mother,
      "mother never rewinds when the real route walk begins");
    assert.deepEqual(exit.end, { pono: 0.375, mother: 0.4125 },
      "stage three reaches its own Pono endpoint while mother stays ahead toward the next story");

    const deadlineClear = await page.evaluate(() => eval(`(() => {
      window.__deadlineClearStats = 0;
      window.incrementStat = () => { window.__deadlineClearStats++; };
      stageIdx = 0;
      curCols = LEVELS[0].cols;
      curRows = LEVELS[0].rows;
      const solvedBoard = LEVELS[0].solved.slice();
      grid = solvedBoard.slice();
      emptyIdx = grid.indexOf(null);
      resetStageMechanics(LEVELS[0]);
      let moved = -1;
      const solvedEmpty = emptyIdx;
      for (const candidate of getAdjacentIndices(solvedEmpty)) {
        const board = solvedBoard.slice();
        board[solvedEmpty] = board[candidate];
        board[candidate] = null;
        grid = board;
        emptyIdx = candidate;
        if (!checkWin()) { moved = candidate; break; }
      }
      if (moved < 0) throw new Error('no one-move deadline fixture');
      resetStageClock(0);
      overlay.classList.add('hidden');
      state = S.PLAYING;
      journeyActor.active = false;
      slideWindowFocused = true;
      stageClock.active = true;
      const row = Math.floor(solvedEmpty / curCols);
      const col = solvedEmpty % curCols;
      handleTap(gridOX + (col + 0.5) * cellSize, gridOY + (row + 0.5) * cellSize);
      stageClock.elapsedMs = stageClock.budgetMs - 1;
      stageClock.lastTick = anim.t0;
      updateStageClock(anim.t0 + 10);
      const pendingWhileMoving = stageClock.timeoutPending;
      updateAnim(anim.t0 + SLIDE_DUR + 1);
      updateStageClock(anim.t0 + SLIDE_DUR + 2);
      return {
        pendingWhileMoving,
        pendingAfter: stageClock.timeoutPending,
        phase: journeyActor.phase,
        travelling: state === S.TRAVELLING,
        stats: window.__deadlineClearStats,
        connected: checkWin()
      };
    })()`));
    assert.deepEqual(deadlineClear, {
      pendingWhileMoving: false, pendingAfter: false, phase: "EXIT",
      travelling: true, stats: 1, connected: true
    }, "a final accepted slide that connects at the deadline wins before timeout");

    const retry = await page.evaluate(() => eval(`(() => {
      window.__timeoutClearStats = 0;
      window.incrementStat = () => { window.__timeoutClearStats++; };
      beginStage(3);
      const initial = JSON.stringify({
        grid: stageAttemptSnapshot.grid,
        empty: stageAttemptSnapshot.emptyIdx,
        pickup: stageAttemptSnapshot.pickupTileIdx,
        suggested: stageAttemptSnapshot.suggestedMoveIdx
      });
      journeyActor.t0 -= 100000;
      updateJourney(performance.now());
      const oldEmpty = emptyIdx;
      const moved = getAdjacentIndices(emptyIdx)[0];
      moveTrackedTile(moved, oldEmpty);
      grid[oldEmpty] = grid[moved];
      grid[moved] = null;
      emptyIdx = moved;
      moveCount = 7;
      magicCrossTileIdx = grid.findIndex(tile => tile && tile !== 'BLANK' && tile !== 'CROSS');
      const firstBudget = stageClock.budgetMs;
      stageClock.elapsedMs = firstBudget;
      stageClock.active = true;
      stageClock.lastTick = 5000;
      state = S.PLAYING;
      animating = false;
      slideWindowFocused = true;
      overlay.classList.add('hidden');
      updateStageClock(5001);
      const timedOut = {
        stage: stageIdx,
        pending: stageClock.timeoutPending,
        text: document.querySelector('#journey-toast').textContent,
        stats: window.__timeoutClearStats,
        state
      };
      updateStageClock(stageClock.restartAt + 1);
      const restored = JSON.stringify({
        grid,
        empty: emptyIdx,
        pickup: pickupTileIdx,
        suggested: suggestedMoveIdx
      });
      return {
        initial, restored, timedOut,
        stage: stageIdx, moves: moveCount, retryCount: stageRetryCount,
        budget: stageClock.budgetMs, firstBudget,
        unlimited: stageClock.unlimited,
        time: document.querySelector('#hud-time').textContent,
        phase: journeyActor.phase, active: stageClock.active,
        magic: magicCrossTileIdx
      };
    })()`));
    assert.equal(retry.timedOut.stage, 3, "timeout keeps the current stage index");
    assert.equal(retry.timedOut.pending, true, "timeout enters one short retry beat");
    assert.match(retry.timedOut.text, /この みちを もういちど/,
      "timeout explains the same-road retry without failure language");
    assert.equal(retry.timedOut.stats, 0, "timeout never emits a clear statistic");
    assert.equal(retry.initial, retry.restored, "retry restores the exact first arrangement and tracking");
    assert.deepEqual({ stage: retry.stage, moves: retry.moves, retryCount: retry.retryCount },
      { stage: 3, moves: 0, retryCount: 1 },
      "retry resets only the current attempt");
    assert.equal(retry.budget, Math.round(retry.firstBudget / 1000 * 1.25) * 1000,
      "same-board retry receives its promised extra time");
    assert.deepEqual([retry.unlimited, retry.time], [true, "ゆっくり"],
      "the same-board retry keeps the realtime bar but removes the hard deadline");
    assert.equal(retry.phase, "INTRO", "retry replays the same stage's gentle entry");
    assert.equal(retry.active, false, "retry time waits until that entry finishes");
    assert.equal(retry.magic, -1, "stage mechanic selection returns to its initial state");

    const slowRetry = await page.evaluate(() => eval(`(() => {
      journeyActor.t0 -= 100000;
      updateJourney(performance.now());
      journeyHudMessageHideAt = 0;
      state = S.PLAYING;
      stageClock.active = true;
      stageClock.elapsedMs = stageClock.budgetMs * 2;
      stageClock.lastTick = performance.now();
      updateStageClock(stageClock.lastTick + 1000);
      return {
        unlimited: stageClock.unlimited,
        pending: stageClock.timeoutPending,
        playing: state === S.PLAYING,
        time: document.querySelector('#hud-time').textContent
      };
    })()`));
    assert.deepEqual(slowRetry,
      { unlimited: true, pending: false, playing: true, time: "ゆっくり" },
      "the slow retry can continue past its pacing budget without another timeout");

    const pickupRetry = await page.evaluate(() => eval(`(() => {
      magicCharmOwned = false;
      beginStage(2);
      const initial = {
        board: JSON.stringify(stageAttemptSnapshot.grid),
        pickup: stageAttemptSnapshot.pickupTileIdx,
        collected: stageAttemptSnapshot.pickupCollected,
        owned: stageAttemptSnapshot.magicCharmOwned
      };
      journeyActor.t0 -= 100000;
      updateJourney(performance.now());
      journeyHudMessageHideAt = 0;
      const oldEmpty = emptyIdx;
      const moved = getAdjacentIndices(emptyIdx)[0];
      moveTrackedTile(moved, oldEmpty);
      grid[oldEmpty] = grid[moved];
      grid[moved] = null;
      emptyIdx = moved;
      pickupCollected = true;
      magicCharmOwned = true;
      handleStageTimeout(performance.now());
      updateStageClock(stageClock.restartAt + 1);
      return {
        initial,
        board: JSON.stringify(grid),
        pickup: pickupTileIdx,
        collected: pickupCollected,
        owned: magicCharmOwned,
        stage: stageIdx,
        moves: moveCount
      };
    })()`));
    assert.deepEqual(pickupRetry, {
      initial: pickupRetry.initial,
      board: pickupRetry.initial.board,
      pickup: pickupRetry.initial.pickup,
      collected: pickupRetry.initial.collected,
      owned: pickupRetry.initial.owned,
      stage: 2,
      moves: 0
    }, "stage three retry restores its moving pickup and pre-collection ownership exactly");

    const pendingVisibility = await page.evaluate(() => eval(`(() => {
      beginStage(0);
      journeyActor.t0 -= 100000;
      updateJourney(performance.now());
      state = S.PLAYING;
      slideWindowFocused = true;
      overlay.classList.add('hidden');
      handleStageTimeout(performance.now());
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
      stageClock.restartAt = performance.now() - RETRY_MESSAGE_MS - 1000;
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      const resumedAt = performance.now();
      document.dispatchEvent(new Event('visibilitychange'));
      const renewedRestartAt = stageClock.restartAt;
      updateStageClock(renewedRestartAt - 1);
      return {
        pending: stageClock.timeoutPending,
        renewed: renewedRestartAt >= resumedAt + RETRY_MESSAGE_MS - 5,
        beforeDeadline: performance.now() < renewedRestartAt,
        toastVisible: document.getElementById('journey-toast').classList.contains('show') &&
          document.getElementById('journey-toast').classList.contains('retry'),
        messageLastsThroughRestart: journeyToastHideAt >= renewedRestartAt + 350
      };
    })()`));
    assert.deepEqual(pendingVisibility, {
      pending: true,
      renewed: true,
      beforeDeadline: true,
      toastVisible: true,
      messageLastsThroughRestart: true
    },
      "visibility recovery replays the retry explanation instead of restarting immediately");

    const pendingMenu = await page.evaluate(() => eval(`(() => {
      beginStage(0);
      journeyActor.t0 -= 100000;
      updateJourney(performance.now());
      state = S.PLAYING;
      slideWindowFocused = true;
      overlay.classList.add('hidden');
      const startedAt = performance.now();
      handleStageTimeout(startedAt);
      const menu = document.querySelector('.pono-dropdown');
      if (!menu) throw new Error('shared menu was not initialized');
      menu.classList.add('show');
      document.getElementById('journey-toast').classList.remove('show');
      journeyToastHideAt = 0;
      const suspendedAt = startedAt + RETRY_MESSAGE_MS + 1000;
      updateStageClock(suspendedAt);
      const renewedRestartAt = stageClock.restartAt;
      let repeatedTextMutations = 0;
      const observer = new MutationObserver(records => {
        repeatedTextMutations += records.filter(record => record.type === 'childList').length;
      });
      observer.observe(document.getElementById('journey-toast'), { childList: true });
      updateStageClock(suspendedAt + 16);
      observer.disconnect();
      const result = {
        pending: stageClock.timeoutPending,
        renewed: renewedRestartAt >= suspendedAt + RETRY_MESSAGE_MS,
        toastVisible: document.getElementById('journey-toast').classList.contains('show'),
        messageLastsThroughRestart: journeyToastHideAt >= renewedRestartAt + 400,
        repeatedTextMutations
      };
      menu.classList.remove('show');
      updateStageClock(renewedRestartAt - 1);
      result.pendingBeforeDeadline = stageClock.timeoutPending;
      return result;
    })()`));
    assert.deepEqual(pendingMenu, {
      pending: true,
      renewed: true,
      toastVisible: true,
      messageLastsThroughRestart: true,
      repeatedTextMutations: 0,
      pendingBeforeDeadline: true
    }, "an open shared menu renews both the retry wait and its visible explanation");

    await page.setViewportSize({ width: 390, height: 844 });
    const portrait = await page.evaluate(() => eval(`(() => {
      overlay.classList.add('hidden');
      state = S.PLAYING;
      journeyActor.active = false;
      slideWindowFocused = true;
      stageClock.timeoutPending = false;
      stageClock.active = true;
      stageClock.elapsedMs = 500;
      stageClock.lastTick = 1000;
      updateStageClock(21000);
      return { elapsed: stageClock.elapsedMs, suspended: isStageClockSuspended() };
    })()`));
    assert.deepEqual(portrait, { elapsed: 500, suspended: true },
      "portrait guidance freezes the attempt instead of consuming time");

    await page.setViewportSize({ width: 844, height: 390 });
    const tutorialDuringRetry = await page.evaluate(() => eval(`(() => {
      _slideTutActive = false;
      beginStage(0);
      journeyActor.t0 -= 100000;
      updateJourney(performance.now());
      state = S.PLAYING;
      slideWindowFocused = true;
      overlay.classList.add('hidden');
      handleStageTimeout(performance.now());
      const oldRestartAt = stageClock.restartAt;
      showTutorial();
      updateStageClock(oldRestartAt + 10000);
      const boardBeforeMove = JSON.stringify(grid);
      const first = TUTORIAL_STEPS[0];
      handleTap(gridOX + (first.col + 0.5) * cellSize,
        gridOY + (first.row + 0.5) * cellSize);
      updateAnim(anim.t0 + SLIDE_DUR + 1);
      return {
        active: _slideTutActive,
        pending: stageClock.timeoutPending,
        state,
        phase: journeyActor.phase,
        actorTutorial: journeyActor.tutorial,
        boardBeforeMove,
        expected: JSON.stringify(TUTORIAL_GRID),
        moves: moveCount,
        progressTutorial: document.querySelector('#stage-num').classList.contains('is-tutorial'),
        clockActive: stageClock.active,
        label: document.querySelector('#hud-stage').textContent,
        time: document.querySelector('#hud-time').textContent
      };
    })()`));
    assert.deepEqual(tutorialDuringRetry, {
      active: true, pending: false, state: 1, phase: "PLAYING", actorTutorial: true,
      boardBeforeMove: tutorialDuringRetry.expected, expected: tutorialDuringRetry.expected,
      moves: 1, progressTutorial: true, clockActive: false,
      label: "れんしゅう", time: "じかん なし"
    }, "practice cancels a pending retry and remains practice after an actual slide");

    assert.deepEqual(errors, [], "realtime chase produces no page errors");
    console.log("slide realtime chase visual regression: ok");
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
