const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('[console:' + msg.type() + ']', msg.text()));
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));

  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
  });

  await page.goto('http://localhost:8934/play.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    window.__calls = { showTreasure: 0 };
    if (window.showTreasure) {
      const orig = window.showTreasure;
      window.showTreasure = function (...args) {
        window.__calls.showTreasure++;
        console.log('showTreasure CALLED with', JSON.stringify(args[0], (k,v)=> k==='onClose'?undefined:v));
        return orig.apply(this, args);
      };
    } else {
      console.log('window.showTreasure NOT DEFINED');
    }
  });

  await page.waitForTimeout(3500); // let _rewardsReady settle (3s abort timeout)

  const result = await page.evaluate(() => {
    try {
      window.PonoStampRally.checkSlotReward(5);
      return 'called';
    } catch (e) {
      return 'error: ' + e.message;
    }
  });
  console.log('checkSlotReward(5) result:', result);

  await page.waitForTimeout(2000);

  const calls = await page.evaluate(() => window.__calls);
  console.log('CALLS:', JSON.stringify(calls));

  await browser.close();
})();
