#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const modeKeys = [
  'mojikkoFarmWritingModeV1',
  'mojikkoFarmWordHoleV1',
  'mojikkoFarmDailyThreeV1'
];
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
      const file = path.resolve(root, `.${relative}`);
      if (!file.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end('forbidden');
        return;
      }
      fs.readFile(file, (error, data) => {
        if (error) {
          response.writeHead(404).end('not found');
          return;
        }
        response.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
        response.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

async function keepNetworkLocal(context, base, options = {}) {
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (options.blockWords && url.includes('/mojicrane/data/words.js')) return route.abort();
    if (url.startsWith(base) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    return route.abort();
  });
}

async function configureContext(context, seed = {}, appBuild = true) {
  await context.addInitScript(({ seedValues, app }) => {
    if (app) window.__APP_BUILD__ = 1;
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      Object.entries(seedValues).forEach(([key, value]) => localStorage.setItem(key, value));
      localStorage.setItem('pono_bgm_enabled', 'off');
    }
  }, { seedValues: seed, app: appBuild });
}

async function openPage(context, base, errors) {
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/writing-mori/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.MojikkoWritingGame);
  return page;
}

async function forceComplete(page) {
  await page.evaluate(() => {
    const item = window.MojikkoWritingGame.getCurrentCharacter();
    strokesCompleted = item.strokes;
    currentStrokeIndex = Math.max(0, item.strokes - 1);
    fillAllLetterPixels();
    return completeWriting(false, { totalStrokes: item.strokes });
  });
}

async function installDelayedModeClaim(page) {
  await page.evaluate(() => {
    window.__nativeModeTaskClaim = window.__nativeModeTaskClaim || window.claimModeTaskCompletion;
    window.__delayedModeClaimReady = false;
    window.__delayedModeCompletionSettled = false;
    window.__delayedModeClaimError = '';
    window.__releaseDelayedModeClaim = null;
    window.claimModeTaskCompletion = (receiptId) => (
      window.__nativeModeTaskClaim(receiptId).then((claimed) => new Promise((resolve) => {
        window.__delayedModeClaimReady = true;
        window.__releaseDelayedModeClaim = () => {
          window.claimModeTaskCompletion = window.__nativeModeTaskClaim;
          resolve(claimed);
        };
      }))
    );
  });
}

async function startDelayedModeCompletion(page) {
  await page.evaluate(() => {
    const item = MojikkoWritingGame.getCurrentCharacter();
    strokesCompleted = item.strokes;
    currentStrokeIndex = Math.max(0, item.strokes - 1);
    fillAllLetterPixels();
    Promise.resolve(completeWriting(false, { totalStrokes: item.strokes })).then(
      () => { window.__delayedModeCompletionSettled = true; },
      (error) => {
        window.__delayedModeClaimError = String(error && error.message || error);
        window.__delayedModeCompletionSettled = true;
      }
    );
  });
  await page.waitForFunction(() => (
    window.__delayedModeClaimReady && typeof window.__releaseDelayedModeClaim === 'function'
  ));
}

async function releaseDelayedModeClaim(page) {
  await page.evaluate(() => window.__releaseDelayedModeClaim());
  await page.waitForFunction(() => window.__delayedModeCompletionSettled);
  assert.equal(await page.evaluate(() => window.__delayedModeClaimError), '');
}

async function readModeStorage(page) {
  return page.evaluate((keys) => Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)])), modeKeys);
}

async function readReceiptKeys(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('mojikkoFarmModeTaskReceiptsV1', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('claims')) request.result.createObjectStore('claims');
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('claims', 'readonly');
      const keys = transaction.objectStore('claims').getAllKeys();
      keys.onerror = () => reject(keys.error);
      keys.onsuccess = () => {
        database.close();
        resolve(keys.result.map(String).sort());
      };
    };
  }));
}

async function runAtomicModeRace(browser, base, mode, trial, errors) {
  const careSeed = JSON.stringify({
    hatched: true,
    sukusuku: 0,
    stars: 0,
    foodSystemVersion: 2,
    inventory: {
      moji_milk: { count: 0 },
      moji_gohan: { count: 0 },
      moji_cookie: { count: 0 }
    }
  });
  const context = await browser.newContext({ viewport: { width: 1024, height: 600 } });
  await keepNetworkLocal(context, base);
  await configureContext(context, { mojikkoFarmCareStateV1: careSeed });
  const pageA = await openPage(context, base, errors);
  const pageB = await openPage(context, base, errors);
  for (const page of [pageA, pageB]) {
    await page.evaluate(() => {
      window.__atomicRace = { completeNotifications: 0, writingAchievements: 0 };
      const originalComplete = window.onWritingComplete;
      window.onWritingComplete = function(result) {
        window.__atomicRace.completeNotifications += 1;
        return originalComplete(result);
      };
      const originalIncrement = window.incrementStat;
      window.incrementStat = function(name, amount) {
        if (name === 'writing_chars') window.__atomicRace.writingAchievements += 1;
        return typeof originalIncrement === 'function' ? originalIncrement(name, amount) : undefined;
      };
    });
  }
  assert.equal(await pageA.evaluate((value) => MojikkoWritingGame.selectMode(value), mode), true);
  assert.equal(await pageB.evaluate((value) => MojikkoWritingGame.selectMode(value), mode), true);
  const before = await Promise.all([pageA, pageB].map((page) => page.evaluate(() => ({
    token: MojikkoWritingGame.getModeState().activeModeTaskId,
    stars: Number(document.getElementById('starCount').textContent)
  }))));
  assert.equal(before[0].token, before[1].token, `${mode} trial ${trial} must race one receipt`);

  await Promise.all([forceComplete(pageA), forceComplete(pageB)]);
  const after = await Promise.all([pageA, pageB].map((page) => page.evaluate(() => ({
    modeState: MojikkoWritingGame.getModeState(),
    stars: Number(document.getElementById('starCount').textContent),
    rewardHidden: document.getElementById('resultRewardWrap').hidden,
    prompt: document.getElementById('promptText').textContent,
    counts: window.__atomicRace
  }))));
  assert.equal(
    after[0].stars + after[1].stars - before[0].stars - before[1].stars,
    10,
    `${mode} trial ${trial} must grant exactly one star reward`
  );
  assert.equal(after[0].counts.completeNotifications + after[1].counts.completeNotifications, 1);
  assert.equal(after[0].counts.writingAchievements + after[1].counts.writingAchievements, 1);
  assert.equal(after.filter((entry) => entry.rewardHidden === false).length, 1);
  const rewardedPage = after.find((entry) => entry.rewardHidden === false);
  assert.match(rewardedPage.prompt, /スター \+10/);
  assert.match(rewardedPage.prompt, /もじミルク/);
  const care = await pageA.evaluate(() => JSON.parse(localStorage.getItem('mojikkoFarmCareStateV1')));
  assert.equal(Object.values(care.inventory).reduce((sum, item) => sum + Number(item.count || 0), 0), 1);
  if (mode === 'word-hole') {
    const taskId = after[0].modeState.wordHole.tasks.find((id) => (
      after[0].modeState.wordHole.completedTaskIds.includes(id)
    ));
    assert.ok(taskId);
  } else {
    assert.equal(after[0].modeState.dailyThree.completedIds.length, 1);
  }
  await Promise.all([pageA, pageB].map((page) => page.evaluate(() => MojikkoWritingGame.resetWriting())));
  const nextTokens = await Promise.all([pageA, pageB].map((page) => (
    page.evaluate(() => MojikkoWritingGame.getModeState().activeModeTaskId)
  )));
  assert.equal(nextTokens[0], nextTokens[1]);
  assert.notEqual(nextTokens[0], before[0].token);
  await context.close();
}

(async () => {
  const { server, base } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const tabsContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await keepNetworkLocal(tabsContext, base);
    await configureContext(tabsContext);
    const tabA = await openPage(tabsContext, base, errors);
    const tabB = await openPage(tabsContext, base, errors);

    assert.equal(await tabA.evaluate(() => MojikkoWritingGame.selectMode('word-hole')), true);
    assert.equal(await tabB.evaluate(() => MojikkoWritingGame.selectMode('word-hole')), true);
    const pinnedWord = await tabB.evaluate(() => ({
      state: MojikkoWritingGame.getModeState(),
      characterId: MojikkoWritingGame.getCurrentCharacter().id,
      clue: document.getElementById('modeClue').innerHTML,
      stars: document.getElementById('starCount').textContent
    }));
    assert.equal(
      await tabA.evaluate(() => MojikkoWritingGame.getModeState().activeModeTaskId),
      pinnedWord.state.activeModeTaskId
    );
    await forceComplete(tabA);
    const wordTaskId = pinnedWord.state.wordHole.tasks.find(
      (id) => !pinnedWord.state.wordHole.completedTaskIds.includes(id)
    );
    await tabB.waitForFunction((taskId) => (
      MojikkoWritingGame.getModeState().wordHole.completedTaskIds.includes(taskId)
    ), wordTaskId);
    assert.deepEqual(await tabB.evaluate(() => ({
      token: MojikkoWritingGame.getModeState().activeModeTaskId,
      characterId: MojikkoWritingGame.getCurrentCharacter().id,
      clue: document.getElementById('modeClue').innerHTML
    })), {
      token: pinnedWord.state.activeModeTaskId,
      characterId: pinnedWord.characterId,
      clue: pinnedWord.clue
    });
    await forceComplete(tabB);
    assert.equal(await tabB.locator('#starCount').textContent(), pinnedWord.stars);
    assert.equal(await tabB.locator('#resultRewardWrap').getAttribute('hidden'), '');
    await tabB.waitForTimeout(980);
    assert.equal(await tabB.evaluate(() => MojikkoWritingGame.getMode()), 'word-hole');
    assert.notEqual(
      await tabB.evaluate(() => MojikkoWritingGame.getModeState().activeModeTaskId),
      pinnedWord.state.activeModeTaskId
    );

    assert.equal(await tabA.evaluate(() => MojikkoWritingGame.selectMode('daily-three')), true);
    assert.equal(await tabB.evaluate(() => MojikkoWritingGame.selectMode('daily-three')), true);
    const pinnedDaily = await tabB.evaluate(() => ({
      state: MojikkoWritingGame.getModeState(),
      characterId: MojikkoWritingGame.getCurrentCharacter().id,
      clue: document.getElementById('modeClue').innerHTML,
      stars: document.getElementById('starCount').textContent
    }));
    await forceComplete(tabA);
    await tabB.waitForFunction((characterId) => (
      MojikkoWritingGame.getModeState().dailyThree.completedIds.includes(characterId)
    ), pinnedDaily.characterId);
    assert.deepEqual(await tabB.evaluate(() => ({
      token: MojikkoWritingGame.getModeState().activeModeTaskId,
      characterId: MojikkoWritingGame.getCurrentCharacter().id,
      clue: document.getElementById('modeClue').innerHTML
    })), {
      token: pinnedDaily.state.activeModeTaskId,
      characterId: pinnedDaily.characterId,
      clue: pinnedDaily.clue
    });
    await forceComplete(tabB);
    assert.equal(await tabB.locator('#starCount').textContent(), pinnedDaily.stars);
    assert.equal(await tabB.locator('#resultRewardWrap').getAttribute('hidden'), '');
    await tabsContext.close();

    for (const mode of ['word-hole', 'daily-three']) {
      for (let trial = 1; trial <= 5; trial += 1) {
        await runAtomicModeRace(browser, base, mode, trial, errors);
      }
    }

    const prepContext = await browser.newContext({ viewport: { width: 844, height: 390 } });
    await keepNetworkLocal(prepContext, base);
    await configureContext(prepContext);
    const prepPage = await openPage(prepContext, base, errors);
    assert.equal(await prepPage.evaluate(() => MojikkoWritingGame.selectMode('word-hole')), true);
    const validSeed = await readModeStorage(prepPage);
    assert.equal(await prepPage.evaluate(() => MojikkoWritingGame.selectMode('daily-three')), true);
    validSeed.mojikkoFarmDailyThreeV1 = await prepPage.evaluate(() => localStorage.getItem('mojikkoFarmDailyThreeV1'));
    validSeed.mojikkoFarmWritingModeV1 = JSON.stringify({ version: 1, activeMode: 'word-hole' });
    await prepContext.close();

    const lockedSeed = {
      mojikkoFarmWritingModeV1: '{"version":1,"activeMode":"word-hole"}',
      mojikkoFarmWordHoleV1: '{"sentinel":"word"}',
      mojikkoFarmDailyThreeV1: '{"sentinel":"daily"}'
    };
    const lockedContext = await browser.newContext({ viewport: { width: 844, height: 390 } });
    await keepNetworkLocal(lockedContext, base);
    await configureContext(lockedContext, lockedSeed, false);
    const lockedPage = await openPage(lockedContext, base, errors);
    assert.deepEqual(await readModeStorage(lockedPage), lockedSeed);
    assert.equal(await lockedPage.evaluate(() => MojikkoWritingGame.getModeState().initialized), false);
    assert.equal(await lockedPage.evaluate(() => window.__PONO_TIER_LOCKED__), true);
    await lockedContext.close();

    const portraitContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await keepNetworkLocal(portraitContext, base);
    await configureContext(portraitContext, validSeed);
    const portraitPage = await openPage(portraitContext, base, errors);
    assert.deepEqual(await readModeStorage(portraitPage), validSeed);
    assert.equal(await portraitPage.evaluate(() => MojikkoWritingGame.getModeState().initialized), false);
    await portraitPage.setViewportSize({ width: 844, height: 390 });
    await portraitPage.waitForFunction(() => MojikkoWritingGame.getModeState().initialized);
    assert.equal(await portraitPage.evaluate(() => MojikkoWritingGame.getMode()), 'word-hole');
    const keyRects = await portraitPage.evaluate(() => ['settingsBtn', 'modeSwitchBtn'].map((id) => {
      const rect = document.getElementById(id).getBoundingClientRect();
      return { id, width: rect.width, height: rect.height };
    }));
    keyRects.forEach(({ id, width, height }) => {
      assert.ok(width >= 44 && height >= 44, `${id} hit area was ${width}x${height}`);
    });
    assert.equal(await portraitPage.locator('#modeChoiceOverlay').evaluate((node) => node.inert), true);
    await portraitPage.locator('#modeSwitchBtn').click();
    assert.equal(await portraitPage.locator('#modeChoiceOverlay').evaluate((node) => node.inert), false);
    const closeRect = await portraitPage.locator('#modeChoiceCloseBtn').boundingBox();
    assert.ok(closeRect && closeRect.height >= 44, `mode close hit area was ${closeRect && closeRect.height}`);
    await portraitPage.locator('#modeChoiceCloseBtn').click();
    assert.equal(await portraitPage.locator('#modeChoiceOverlay').evaluate((node) => node.inert), true);
    assert.equal(await portraitPage.evaluate(() => document.activeElement.id), 'modeSwitchBtn');
    await portraitPage.locator('#modeSwitchBtn').click();
    await portraitPage.keyboard.press('Escape');
    assert.equal(await portraitPage.locator('#modeChoiceOverlay').evaluate((node) => node.inert), true);
    await portraitContext.close();

    const futureDaily = JSON.parse(validSeed.mojikkoFarmDailyThreeV1);
    futureDaily.dateKey = '2099-12-31';
    futureDaily.planId = `daily-three-${futureDaily.dateKey}:${futureDaily.taskIds.join('|')}`;
    futureDaily.completedIds = futureDaily.taskIds.slice();
    const clockContext = await browser.newContext({ viewport: { width: 1024, height: 600 } });
    await keepNetworkLocal(clockContext, base);
    await configureContext(clockContext, {
      ...validSeed,
      mojikkoFarmWritingModeV1: JSON.stringify({ version: 1, activeMode: 'daily-three' }),
      mojikkoFarmDailyThreeV1: JSON.stringify(futureDaily)
    });
    const clockPage = await openPage(clockContext, base, errors);
    assert.equal(await clockPage.evaluate(() => MojikkoWritingGame.selectMode('daily-three')), true);
    assert.equal(await clockPage.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('mojikkoFarmDailyThreeV1'));
      return state.dateKey === getLocalDateKey() && MojikkoWritingGame.getModeState().dailyThree.dateKey === getLocalDateKey();
    }), true);
    await clockContext.close();

    const unavailableContext = await browser.newContext({ viewport: { width: 1024, height: 600 } });
    await keepNetworkLocal(unavailableContext, base, { blockWords: true });
    await configureContext(unavailableContext, validSeed);
    const unavailablePage = await openPage(unavailableContext, base, errors);
    assert.equal(await unavailablePage.evaluate(() => MojikkoWritingGame.getMode()), 'sequence');
    assert.deepEqual(await readModeStorage(unavailablePage), validSeed);
    await unavailableContext.unroute('**/*');
    await keepNetworkLocal(unavailableContext, base);
    await unavailablePage.reload({ waitUntil: 'domcontentloaded' });
    await unavailablePage.waitForFunction(() => MojikkoWritingGame.getModeState().initialized);
    assert.equal(await unavailablePage.evaluate(() => MojikkoWritingGame.getMode()), 'word-hole');
    await unavailableContext.close();

    const runtimeContext = await browser.newContext({ viewport: { width: 844, height: 390 } });
    await keepNetworkLocal(runtimeContext, base);
    await configureContext(runtimeContext);
    const runtimePage = await openPage(runtimeContext, base, errors);
    assert.equal(await runtimePage.evaluate(() => MojikkoWritingGame.selectMode('word-hole')), true);
    const beforeRotate = await runtimePage.evaluate(() => ({
      storage: Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)]),
      modeState: MojikkoWritingGame.getModeState(),
      characterId: MojikkoWritingGame.getCurrentCharacter().id,
      stars: document.getElementById('starCount').textContent
    }));
    const beforeRotateReceipts = await readReceiptKeys(runtimePage);
    await runtimePage.evaluate(() => {
      const item = MojikkoWritingGame.getCurrentCharacter();
      strokesCompleted = item.strokes;
      currentStrokeIndex = Math.max(0, item.strokes - 1);
      maybeFinishWritingAfterProgress({ totalStrokes: item.strokes });
    });
    await runtimePage.locator('#settingsBtn').click();
    assert.equal(await runtimePage.locator('#settingsPopover').getAttribute('aria-hidden'), 'false');
    await runtimePage.setViewportSize({ width: 390, height: 844 });
    await runtimePage.waitForTimeout(1000);
    assert.deepEqual(await runtimePage.evaluate(() => ({
      hidden: settingsPopover.hidden,
      ariaHidden: settingsPopover.getAttribute('aria-hidden'),
      expanded: settingsBtn.getAttribute('aria-expanded'),
      itemTabIndex: settingsBackBtn.tabIndex
    })), {
      hidden: true,
      ariaHidden: 'true',
      expanded: 'false',
      itemTabIndex: -1
    }, 'portrait lock did not close settings accessibly');
    assert.deepEqual(await runtimePage.evaluate(() => ({
      storage: Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)]),
      modeState: MojikkoWritingGame.getModeState(),
      characterId: MojikkoWritingGame.getCurrentCharacter().id,
      stars: document.getElementById('starCount').textContent
    })), beforeRotate);
    assert.deepEqual(await readReceiptKeys(runtimePage), beforeRotateReceipts);
    await runtimePage.setViewportSize({ width: 844, height: 390 });
    await runtimePage.waitForTimeout(180);
    await forceComplete(runtimePage);
    assert.equal(Number(await runtimePage.locator('#starCount').textContent()), Number(beforeRotate.stars) + 10);

    const wordIntermediateToken = await runtimePage.evaluate(() => MojikkoWritingGame.getModeState().activeModeTaskId);
    await runtimePage.locator('#modeSwitchBtn').click();
    const wordBoundaryToken = await runtimePage.evaluate(() => MojikkoWritingGame.getModeState().activeModeTaskId);
    assert.notEqual(wordBoundaryToken, wordIntermediateToken);
    await runtimePage.locator('#modeChoiceCloseBtn').click();
    await runtimePage.waitForTimeout(950);
    assert.equal(await runtimePage.evaluate(() => MojikkoWritingGame.getModeState().activeModeTaskId), wordBoundaryToken);
    assert.equal(await runtimePage.locator('#resultOverlay').getAttribute('class'), 'result-overlay');

    assert.equal(await runtimePage.evaluate(() => MojikkoWritingGame.selectMode('daily-three')), true);
    const dailyIntermediateToken = await runtimePage.evaluate(() => MojikkoWritingGame.getModeState().activeModeTaskId);
    await forceComplete(runtimePage);
    await runtimePage.locator('#modeSwitchBtn').click();
    const dailyBoundaryToken = await runtimePage.evaluate(() => MojikkoWritingGame.getModeState().activeModeTaskId);
    assert.notEqual(dailyBoundaryToken, dailyIntermediateToken);
    await runtimePage.keyboard.press('Escape');
    await runtimePage.waitForTimeout(950);
    assert.equal(await runtimePage.evaluate(() => MojikkoWritingGame.getModeState().activeModeTaskId), dailyBoundaryToken);
    assert.equal(await runtimePage.locator('#resultOverlay').getAttribute('class'), 'result-overlay');

    await runtimePage.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('mojikkoFarmWordHoleV1'));
      state.completedTaskIds = state.tasks.slice(0, 4);
      localStorage.setItem('mojikkoFarmWordHoleV1', JSON.stringify(state));
      localStorage.setItem('mojikkoFarmWritingModeV1', JSON.stringify({ version: 1, activeMode: 'word-hole' }));
    });
    await runtimePage.reload({ waitUntil: 'domcontentloaded' });
    await runtimePage.waitForFunction(() => MojikkoWritingGame.getModeState().initialized);
    assert.equal(await runtimePage.evaluate(() => MojikkoWritingGame.getMode()), 'word-hole');
    await forceComplete(runtimePage);
    await runtimePage.locator('#modeSwitchBtn').click();
    assert.equal(await runtimePage.evaluate(() => MojikkoWritingGame.getMode()), 'sequence');
    await runtimePage.locator('#modeChoiceOverlay').click({ position: { x: 2, y: 2 } });
    await runtimePage.waitForTimeout(650);
    assert.equal(await runtimePage.locator('#modeChoiceOverlay').evaluate((node) => node.inert), true);
    assert.equal(await runtimePage.locator('#resultOverlay').getAttribute('class'), 'result-overlay');
    await runtimeContext.close();

    const idbFallbackContext = await browser.newContext({ viewport: { width: 1024, height: 600 } });
    await keepNetworkLocal(idbFallbackContext, base);
    await configureContext(idbFallbackContext);
    await idbFallbackContext.addInitScript(() => {
      let recovered = false;
      try { recovered = localStorage.getItem('__mojikkoIdbRecovered') === '1'; } catch (_) {}
      if (recovered) return;
      Object.defineProperty(window, 'indexedDB', {
        configurable: true,
        value: { open() { throw new Error('forced IndexedDB failure'); } }
      });
    });
    const idbFallbackPage = await openPage(idbFallbackContext, base, errors);
    assert.equal(await idbFallbackPage.evaluate(() => MojikkoWritingGame.selectMode('word-hole')), true);
    const fallbackWordState = await idbFallbackPage.evaluate(() => localStorage.getItem('mojikkoFarmWordHoleV1'));
    const fallbackToken = await idbFallbackPage.evaluate(() => MojikkoWritingGame.getModeState().activeModeTaskId);
    await forceComplete(idbFallbackPage);
    assert.equal(Number(await idbFallbackPage.locator('#starCount').textContent()), 10);
    assert.equal(await idbFallbackPage.evaluate(() => (
      Object.keys(localStorage).filter((key) => key.startsWith('mojikkoFarmModeTaskReceiptV1:')).length
    )), 1);
    await idbFallbackPage.evaluate((raw) => {
      localStorage.setItem('mojikkoFarmWordHoleV1', raw);
      localStorage.setItem('mojikkoFarmWritingModeV1', JSON.stringify({ version: 1, activeMode: 'word-hole' }));
      localStorage.setItem('__mojikkoIdbRecovered', '1');
    }, fallbackWordState);
    await idbFallbackPage.reload({ waitUntil: 'domcontentloaded' });
    await idbFallbackPage.waitForFunction(() => MojikkoWritingGame.getModeState().initialized);
    assert.equal(await idbFallbackPage.evaluate(() => MojikkoWritingGame.getModeState().activeModeTaskId), fallbackToken);
    assert.deepEqual(await readReceiptKeys(idbFallbackPage), []);
    await forceComplete(idbFallbackPage);
    assert.equal(Number(await idbFallbackPage.locator('#starCount').textContent()), 10);
    assert.equal(await idbFallbackPage.locator('#resultRewardWrap').evaluate((node) => node.hidden), true);
    assert.deepEqual(await readReceiptKeys(idbFallbackPage), []);
    await idbFallbackContext.close();

    const unreadableReceiptContext = await browser.newContext({ viewport: { width: 1024, height: 600 } });
    await keepNetworkLocal(unreadableReceiptContext, base);
    await configureContext(unreadableReceiptContext);
    await unreadableReceiptContext.addInitScript(() => {
      const nativeGet = Storage.prototype.getItem;
      Storage.prototype.getItem = function(key) {
        if (String(key).startsWith('mojikkoFarmModeTaskReceiptV1:')) {
          throw new Error('forced receipt ledger read failure');
        }
        return nativeGet.call(this, key);
      };
    });
    const unreadableReceiptPage = await openPage(unreadableReceiptContext, base, errors);
    assert.equal(await unreadableReceiptPage.evaluate(() => MojikkoWritingGame.selectMode('word-hole')), true);
    await forceComplete(unreadableReceiptPage);
    assert.equal(Number(await unreadableReceiptPage.locator('#starCount').textContent()), 0);
    assert.equal(await unreadableReceiptPage.locator('#resultRewardWrap').evaluate((node) => node.hidden), true);
    assert.deepEqual(await readReceiptKeys(unreadableReceiptPage), []);
    await unreadableReceiptContext.close();

    const noReceiptContext = await browser.newContext({ viewport: { width: 1024, height: 600 } });
    await keepNetworkLocal(noReceiptContext, base);
    await configureContext(noReceiptContext);
    await noReceiptContext.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', {
        configurable: true,
        value: { open() { throw new Error('forced IndexedDB failure'); } }
      });
      const nativeGet = Storage.prototype.getItem;
      const nativeSet = Storage.prototype.setItem;
      Storage.prototype.getItem = function(key) {
        if (String(key).startsWith('mojikkoFarmModeTaskReceiptV1:')) throw new Error('forced receipt read failure');
        return nativeGet.call(this, key);
      };
      Storage.prototype.setItem = function(key, value) {
        if (String(key).startsWith('mojikkoFarmModeTaskReceiptV1:')) throw new Error('forced receipt write failure');
        return nativeSet.call(this, key, value);
      };
    });
    const noReceiptPage = await openPage(noReceiptContext, base, errors);
    assert.equal(await noReceiptPage.evaluate(() => MojikkoWritingGame.selectMode('word-hole')), true);
    const noReceiptToken = await noReceiptPage.evaluate(() => MojikkoWritingGame.getModeState().activeModeTaskId);
    await forceComplete(noReceiptPage);
    assert.equal(Number(await noReceiptPage.locator('#starCount').textContent()), 0);
    assert.equal(await noReceiptPage.locator('#resultRewardWrap').evaluate((node) => node.hidden), true);
    await noReceiptPage.evaluate(() => MojikkoWritingGame.resetWriting());
    assert.notEqual(await noReceiptPage.evaluate(() => MojikkoWritingGame.getModeState().activeModeTaskId), noReceiptToken);
    await noReceiptContext.close();

    const delayedResetContext = await browser.newContext({ viewport: { width: 1024, height: 600 } });
    await keepNetworkLocal(delayedResetContext, base);
    await configureContext(delayedResetContext);
    const delayedResetPage = await openPage(delayedResetContext, base, errors);
    assert.equal(await delayedResetPage.evaluate(() => MojikkoWritingGame.selectMode('word-hole')), true);
    const delayedResetBefore = await delayedResetPage.evaluate(() => {
      const state = MojikkoWritingGame.getModeState();
      return {
        token: state.activeModeTaskId,
        taskId: state.wordHole.tasks.find((id) => !state.wordHole.completedTaskIds.includes(id)),
        characterId: MojikkoWritingGame.getCurrentCharacter().id,
        stars: Number(document.getElementById('starCount').textContent)
      };
    });
    await installDelayedModeClaim(delayedResetPage);
    await startDelayedModeCompletion(delayedResetPage);
    assert.equal((await readReceiptKeys(delayedResetPage)).length, 1);
    await delayedResetPage.locator('#resetBtn').click();
    await releaseDelayedModeClaim(delayedResetPage);
    await delayedResetPage.waitForFunction((token) => (
      MojikkoWritingGame.getModeState().activeModeTaskId !== token
    ), delayedResetBefore.token);
    const delayedResetAfter = await delayedResetPage.evaluate(() => ({
      state: MojikkoWritingGame.getModeState(),
      progress: JSON.parse(localStorage.getItem('mojikkoFarmWritingProgressV2')),
      care: JSON.parse(localStorage.getItem('mojikkoFarmCareStateV1')),
      stars: Number(document.getElementById('starCount').textContent),
      resultClass: document.getElementById('resultOverlay').className
    }));
    assert.equal(delayedResetAfter.stars, delayedResetBefore.stars + 10);
    assert.equal(delayedResetAfter.care.stars, delayedResetBefore.stars + 10);
    assert.ok(delayedResetAfter.state.wordHole.completedTaskIds.includes(delayedResetBefore.taskId));
    assert.ok(delayedResetAfter.progress.completedIds.includes(delayedResetBefore.characterId));
    assert.equal(delayedResetAfter.resultClass, 'result-overlay');
    await delayedResetPage.waitForTimeout(1000);
    assert.equal(Number(await delayedResetPage.locator('#starCount').textContent()), delayedResetBefore.stars + 10);
    assert.equal((await readReceiptKeys(delayedResetPage)).length, 1);
    await delayedResetContext.close();

    const delayedChooserContext = await browser.newContext({ viewport: { width: 1024, height: 600 } });
    await keepNetworkLocal(delayedChooserContext, base);
    await configureContext(delayedChooserContext);
    const delayedChooserPage = await openPage(delayedChooserContext, base, errors);
    assert.equal(await delayedChooserPage.evaluate(() => MojikkoWritingGame.selectMode('word-hole')), true);
    const delayedChooserBefore = await delayedChooserPage.evaluate(() => {
      const state = MojikkoWritingGame.getModeState();
      return {
        token: state.activeModeTaskId,
        taskId: state.wordHole.tasks.find((id) => !state.wordHole.completedTaskIds.includes(id)),
        stars: Number(document.getElementById('starCount').textContent)
      };
    });
    await installDelayedModeClaim(delayedChooserPage);
    await startDelayedModeCompletion(delayedChooserPage);
    await delayedChooserPage.locator('#modeSwitchBtn').click();
    assert.equal(await delayedChooserPage.locator('#modeChoiceOverlay').evaluate((node) => node.inert), true);
    await releaseDelayedModeClaim(delayedChooserPage);
    await delayedChooserPage.waitForFunction(() => (
      document.getElementById('modeChoiceOverlay').classList.contains('show')
    ));
    const delayedChooserAfter = await delayedChooserPage.evaluate(() => ({
      state: MojikkoWritingGame.getModeState(),
      stars: Number(document.getElementById('starCount').textContent),
      chooserInert: document.getElementById('modeChoiceOverlay').inert,
      resultClass: document.getElementById('resultOverlay').className
    }));
    assert.equal(delayedChooserAfter.stars, delayedChooserBefore.stars + 10);
    assert.ok(delayedChooserAfter.state.wordHole.completedTaskIds.includes(delayedChooserBefore.taskId));
    assert.notEqual(delayedChooserAfter.state.activeModeTaskId, delayedChooserBefore.token);
    assert.equal(delayedChooserAfter.chooserInert, false);
    assert.equal(delayedChooserAfter.resultClass, 'result-overlay');
    await delayedChooserPage.locator('#modeChoiceCloseBtn').click();
    await delayedChooserPage.waitForTimeout(1000);
    assert.equal(Number(await delayedChooserPage.locator('#starCount').textContent()), delayedChooserBefore.stars + 10);
    assert.equal((await readReceiptKeys(delayedChooserPage)).length, 1);
    await delayedChooserContext.close();

    const delayedPortraitContext = await browser.newContext({ viewport: { width: 844, height: 390 } });
    await keepNetworkLocal(delayedPortraitContext, base);
    await configureContext(delayedPortraitContext);
    const delayedPortraitPage = await openPage(delayedPortraitContext, base, errors);
    assert.equal(await delayedPortraitPage.evaluate(() => MojikkoWritingGame.selectMode('word-hole')), true);
    const delayedPortraitBefore = await delayedPortraitPage.evaluate(() => {
      const state = MojikkoWritingGame.getModeState();
      return {
        token: state.activeModeTaskId,
        taskId: state.wordHole.tasks.find((id) => !state.wordHole.completedTaskIds.includes(id)),
        characterId: MojikkoWritingGame.getCurrentCharacter().id,
        stars: Number(document.getElementById('starCount').textContent)
      };
    });
    await installDelayedModeClaim(delayedPortraitPage);
    await startDelayedModeCompletion(delayedPortraitPage);
    await delayedPortraitPage.setViewportSize({ width: 390, height: 844 });
    await delayedPortraitPage.waitForTimeout(180);
    assert.equal(await delayedPortraitPage.evaluate(() => isWritingModeRuntimeBlocked()), true);
    await releaseDelayedModeClaim(delayedPortraitPage);
    const delayedPortraitBlocked = await delayedPortraitPage.evaluate(() => ({
      state: MojikkoWritingGame.getModeState(),
      progress: JSON.parse(localStorage.getItem('mojikkoFarmWritingProgressV2')),
      care: JSON.parse(localStorage.getItem('mojikkoFarmCareStateV1')),
      stars: Number(document.getElementById('starCount').textContent),
      resultClass: document.getElementById('resultOverlay').className,
      chooserInert: document.getElementById('modeChoiceOverlay').inert
    }));
    assert.equal(delayedPortraitBlocked.stars, delayedPortraitBefore.stars + 10);
    assert.equal(delayedPortraitBlocked.care.stars, delayedPortraitBefore.stars + 10);
    assert.ok(delayedPortraitBlocked.state.wordHole.completedTaskIds.includes(delayedPortraitBefore.taskId));
    assert.ok(delayedPortraitBlocked.progress.completedIds.includes(delayedPortraitBefore.characterId));
    assert.equal(delayedPortraitBlocked.state.activeModeTaskId, delayedPortraitBefore.token);
    assert.equal(delayedPortraitBlocked.resultClass, 'result-overlay');
    assert.equal(delayedPortraitBlocked.chooserInert, true);
    await delayedPortraitPage.setViewportSize({ width: 844, height: 390 });
    await delayedPortraitPage.waitForFunction((token) => (
      MojikkoWritingGame.getModeState().activeModeTaskId !== token
    ), delayedPortraitBefore.token);
    assert.equal(await delayedPortraitPage.locator('#resultOverlay').getAttribute('class'), 'result-overlay');
    assert.equal(Number(await delayedPortraitPage.locator('#starCount').textContent()), delayedPortraitBefore.stars + 10);
    assert.equal((await readReceiptKeys(delayedPortraitPage)).length, 1);
    await delayedPortraitContext.close();

    const layoutContext = await browser.newContext();
    await keepNetworkLocal(layoutContext, base);
    await configureContext(layoutContext);
    for (const viewport of [
      { width: 1600, height: 900 },
      { width: 1280, height: 720 },
      { width: 1024, height: 600 },
      { width: 844, height: 390 },
      { width: 667, height: 375 }
    ]) {
      const page = await layoutContext.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      await page.setViewportSize(viewport);
      await page.goto(`${base}/writing-mori/`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => MojikkoWritingGame.getModeState().initialized);
      assert.equal(await page.locator('#modeSwitchBtn').isVisible(), true);
      assert.doesNotMatch(await page.locator('#stage').getAttribute('style'), /NaN|Infinity/);
      if (viewport.width === 667) {
        for (const id of ['settingsBtn', 'modeSwitchBtn']) {
          const rect = await page.locator(`#${id}`).boundingBox();
          assert.ok(rect && rect.height >= 44, `${id} at 667x375 was ${rect && rect.height}px high`);
        }
        await page.locator('#settingsBtn').click();
        const settingsBackRect = await page.locator('#settingsBackBtn').boundingBox();
        assert.ok(settingsBackRect && settingsBackRect.width >= 44 && settingsBackRect.height >= 44, `settingsBackBtn at 667x375 was ${settingsBackRect && `${settingsBackRect.width}x${settingsBackRect.height}`}`);
        await page.keyboard.press('Escape');
      }
      await page.close();
    }
    const timerPage = await openPage(layoutContext, base, errors);
    await timerPage.setViewportSize({ width: 667, height: 375 });
    await timerPage.evaluate(() => MojikkoWritingGame.selectMode('sequence'));
    await forceComplete(timerPage);
    await timerPage.evaluate(() => MojikkoWritingGame.resetWriting());
    await timerPage.waitForTimeout(620);
    assert.equal(await timerPage.locator('#resultOverlay').getAttribute('class'), 'result-overlay');
    await forceComplete(timerPage);
    await timerPage.waitForTimeout(560);
    const modalRects = await timerPage.evaluate(() => {
      const ids = ['resultTitle', 'resultCopy', 'resultRewardWrap', 'careBtn', 'modalRetryBtn'];
      const card = document.querySelector('.result-card').getBoundingClientRect();
      return {
        card: { left: card.left, right: card.right, top: card.top, bottom: card.bottom },
        children: ids.map((id) => {
          const rect = document.getElementById(id).getBoundingClientRect();
          return { id, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, height: rect.height };
        }),
        clientWidth: document.querySelector('.result-card').clientWidth,
        scrollWidth: document.querySelector('.result-card').scrollWidth
      };
    });
    assert.ok(
      modalRects.scrollWidth <= modalRects.clientWidth + 1,
      `modal scrolled horizontally: ${modalRects.scrollWidth}px > ${modalRects.clientWidth}px`
    );
    modalRects.children.forEach((rect) => {
      assert.ok(rect.left >= modalRects.card.left - 1 && rect.right <= modalRects.card.right + 1, `${rect.id} overflowed modal horizontally`);
      assert.ok(rect.top >= modalRects.card.top - 1 && rect.bottom <= modalRects.card.bottom + 1, `${rect.id} overflowed modal vertically`);
    });
    ['careBtn', 'modalRetryBtn'].forEach((id) => {
      assert.ok(modalRects.children.find((rect) => rect.id === id).height >= 44, `${id} modal hit area was under 44px`);
    });
    await layoutContext.close();

    assert.deepEqual(errors, [], `browser page errors: ${errors.join(' | ')}`);
    console.log('Mojikko writing modes browser regression: PASS');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
