const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 932, height: 430 } });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));

  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto('http://localhost:8791/nazonazo-tunnel/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const startBtn = page.locator('#startBtn');
  await startBtn.waitFor({ state: 'visible', timeout: 5000 });
  await startBtn.click();
  await page.waitForTimeout(1200);

  const snap1 = await page.evaluate(() => window.__townDockSnapshot ? window.__townDockSnapshot() : null);
  console.log('after start click:', JSON.stringify(snap1, null, 2));
  console.log('console errors so far:', errors);

  await page.screenshot({ path: '/private/tmp/claude-501/-Users-ndw-mac-AppDevelopment-pono-asobiba-app/87e89b3e-0c3e-48af-afe3-4e0c6c4f2ce7/scratchpad/town_dock_explore_start.png' });

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
