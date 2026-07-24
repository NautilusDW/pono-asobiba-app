const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 932, height: 430 } });
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto('http://localhost:8791/nazonazo-tunnel/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.locator('#startBtn').click();
  await page.waitForTimeout(600);
  const rects = await page.evaluate(() => {
    function r(sel) { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { sel, top: b.top, bottom: b.bottom, height: b.height, zIndex: cs.zIndex, opacity: cs.opacity, display: cs.display }; }
    return {
      viewportH: window.innerHeight,
      fgT: r('#fgT'), groundT: r('#groundT'), midT: r('#midT'), veh: r('#veh'), cars: r('#cars'),
      brakeZone: r('.town-dock-brake-zone'), stopBox: r('.town-dock-stop-box'), world: r('#world'),
      scene: r('#scene')
    };
  });
  console.log(JSON.stringify(rects, null, 2));
  await browser.close();
})();
