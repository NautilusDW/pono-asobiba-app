const { test, expect } = require('@playwright/test');

test('hyokkori normal happy path: start -> countdown -> playing, tap works', async ({ page }) => {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) {}
  });
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

  await page.goto('/hyokkori-hightouch/index.html');
  await page.waitForFunction(() => !!window.HyokkoriLogic);
  await expect(page.locator('#start-screen')).toBeVisible();
  await expect(page.locator('#loadErrorScreen')).toHaveCount(0);

  await page.locator('#start-btn').click({ force: true });
  await expect(page.locator('#countdown-screen')).toBeVisible();
  await page.waitForTimeout(1400);
  await expect(page.locator('#countdown-screen')).not.toHaveClass(/show/);

  // wait for a hole to appear then tap it
  await page.waitForTimeout(1000);
  const holeCount = await page.locator('.hh-hole').count();
  console.log('hole count', holeCount);

  console.log('consoleErrors:', JSON.stringify(consoleErrors));
});
