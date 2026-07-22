// Test hypothesis: what happens to #stage sizing if the modern min()/dvh CSS is
// unsupported (parser drops the whole width/height declaration) -> width/height revert
// to their initial 'auto' value on a position:fixed element.
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1057, height: 605 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto('http://localhost:8000/hatake-nikki/index.html');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload();
  await page.waitForFunction(() => document.body.classList.contains('pono-game-ready'));
  await page.locator('#start-btn').click({ force: true });
  await page.waitForSelector('#field-screen.show');
  await page.waitForTimeout(150);

  // Simulate "min()/dvh unsupported -> declaration dropped -> width/height:auto"
  const result = await page.evaluate(() => {
    const stage = document.getElementById('stage');
    stage.style.setProperty('width', 'auto');
    stage.style.setProperty('height', 'auto');
    const r = stage.getBoundingClientRect();
    return { width: r.width, height: r.height, x: r.x, y: r.y };
  });
  console.log('With width/height:auto (simulating unsupported min()/dvh):', result);

  await page.screenshot({ path: '/Users/ndw_mac/AppDevelopment/pono-asobiba-app/repro_layout_fallback_auto.png' });

  await browser.close();
})();
