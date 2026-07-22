const { chromium } = require('@playwright/test');

const VIEWPORTS = [
  { width: 1057, height: 605 },
  { width: 844, height: 390 },
];

(async () => {
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
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

    const info = await page.evaluate(() => {
      const stage = document.getElementById('stage');
      const stageBox = stage.getBoundingClientRect();
      const cs = getComputedStyle(stage);
      const plots = Array.from(document.querySelectorAll('.plot')).map(el => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
      return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        stageBox: { x: stageBox.x, y: stageBox.y, w: stageBox.width, h: stageBox.height },
        stageBgSize: cs.backgroundSize,
        stageBgImage: cs.backgroundImage,
        plots,
      };
    });
    console.log(`=== Viewport ${vp.width}x${vp.height} ===`);
    console.log(JSON.stringify(info, null, 2));

    await page.screenshot({ path: `/Users/ndw_mac/AppDevelopment/pono-asobiba-app/repro_layout_${vp.width}x${vp.height}.png` });
    await context.close();
  }
  await browser.close();
})();
