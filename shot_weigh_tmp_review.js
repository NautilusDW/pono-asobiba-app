const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto('http://localhost:8000/machizukuri/index.html');
  await page.evaluate(() => {
    localStorage.clear();
    const lots = [];
    for (let i = 0; i < 12; i++) lots.push({ lotId: 'lot' + (i + 1), partId: null });
    lots[0].partId = 'pono_house';
    lots[2].partId = 'yasai_stand';
    localStorage.setItem('pono_machi_state_v1', JSON.stringify({ v:1, harvestSpent:0, lots, owned:{}, flowers:0, milestoneSeen:{district1:false} }));
    localStorage.setItem('pono_hatake_harvest_queue_v1', JSON.stringify([{ seedId:'tomato', name:'とまと', img:'../assets/images/hatake-nikki/crops/tomato_stage_4_ready.webp', weightMultiplier:1.75, weight:175, wiltCount:0, bugsMissed:0, extraDays:5, ts: Date.now() }]));
    localStorage.setItem('pono_machi_tut_seen_v1', '1');
  });
  await page.reload();
  await page.waitForFunction(() => document.body.classList.contains('pono-game-ready'), null, { timeout: 10000 });
  await page.locator('#start-btn').click({ force: true });
  await page.waitForSelector('#town-screen.show', { timeout: 5000 }).catch(()=>{});
  await page.locator('.lot[data-lot-id="lot3"]').click({ force: true, timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'weigh_reveal.png' });
  await browser.close();
})();
