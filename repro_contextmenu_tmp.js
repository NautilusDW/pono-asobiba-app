// Repro script for hatake-nikki bug #1: long-press on watering plot fires native contextmenu.
// Uses CDP Input.dispatchTouchEvent (trusted-level touch injection) instead of
// page.locator.dispatchEvent (untrusted synthetic events that don't go through Blink's
// long-press gesture recognizer and therefore can't reproduce this class of bug).
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });

  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(String(e)));

  await page.goto('http://localhost:8000/hatake-nikki/index.html');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload();
  await page.waitForFunction(() => document.body.classList.contains('pono-game-ready'));
  await page.locator('#start-btn').click({ force: true });
  await page.waitForSelector('#field-screen.show');
  await page.waitForTimeout(150);
  const dimHidden = await page.locator('#tut-dim').evaluate(el => el.classList.contains('hidden'));
  if (!dimHidden) {
    await page.locator('#tut-dim').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);
  }

  // Plant a seed in plot0 first (need seedId for water tool to act on it)
  await page.locator('#tool-seed-btn').dispatchEvent('pointerdown');
  await page.waitForSelector('#seed-picker.show');
  await page.locator('.seed-choice[data-seed="tomato"]').dispatchEvent('pointerdown');
  await page.waitForTimeout(100);

  const plot0 = page.locator('.plot[data-plot="0"]');
  const box0 = await plot0.boundingBox();
  const cx0 = box0.x + box0.width / 2;
  const cy0 = box0.y + box0.height / 2;

  // Plant via trusted tap (tap uses touchscreen, real trusted event)
  await page.touchscreen.tap(cx0, cy0);
  await page.waitForTimeout(150);
  const stage0 = await plot0.locator('.plant').getAttribute('data-stage');
  console.log('plot0 stage after planting tap:', stage0);

  // Select water tool
  await page.locator('#tool-water-btn').dispatchEvent('pointerdown');
  await page.waitForTimeout(100);
  const isWaterTarget = await plot0.evaluate(el => el.classList.contains('is-water-target'));
  console.log('plot0 is-water-target after selecting water tool:', isWaterTarget);

  // Install contextmenu listener to detect firing (in-page, will report via console)
  await page.evaluate(() => {
    window.__ctxMenuFired = 0;
    window.__ctxMenuDefaultPrevented = null;
    document.addEventListener('contextmenu', (e) => {
      window.__ctxMenuFired++;
      window.__ctxMenuDefaultPrevented = e.defaultPrevented;
      console.log('[page] contextmenu event fired! defaultPrevented=', e.defaultPrevented, 'target=', e.target && e.target.className);
    }, true);
  });

  // Now perform a REAL trusted long-press via CDP Input domain (dispatchTouchEvent)
  const client = await context.newCDPSession(page);
  console.log('Dispatching trusted touchStart at', cx0, cy0);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: cx0, y: cy0, id: 1 }],
  });

  await page.waitForTimeout(1000); // hold for 1000ms (> WATER_HOLD_MS=800ms) to trigger both game logic + potential native long-press contextmenu

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });

  await page.waitForTimeout(300);

  const ctxFired = await page.evaluate(() => window.__ctxMenuFired);
  const ctxDefaultPrevented = await page.evaluate(() => window.__ctxMenuDefaultPrevented);
  console.log('=== RESULT ===');
  console.log('contextmenu fired count:', ctxFired);
  console.log('contextmenu defaultPrevented:', ctxDefaultPrevented);

  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('pono_hatake_state_v1')));
  console.log('plot0 wateredToday:', state.plots[0].wateredToday);

  const isWateringClassStillThere = await plot0.evaluate(el => el.classList.contains('is-watering'));
  console.log('plot0 is-watering class (should be false if timer completed normally):', isWateringClassStillThere);

  console.log('page errors:', consoleErrors);

  await page.screenshot({ path: '/private/tmp/claude-501/-Users-ndw-mac-AppDevelopment-pono-asobiba-app/9a7cb2a3-f666-45d0-97e1-63357f944278/scratchpad/repro_contextmenu.png' });

  await browser.close();
})();
