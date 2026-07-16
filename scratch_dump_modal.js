const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));

  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    localStorage.setItem('pono_stamp_log', JSON.stringify({
      dates: ['2026-07-13', '2026-07-14', '2026-07-15'],
      total: 3
    }));
  });

  await page.goto('http://localhost:8934/play.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const html = await page.evaluate(() => {
    const el = document.getElementById('stamp-b-card');
    return el ? el.outerHTML : 'NOT FOUND';
  });
  console.log('MODAL HTML:', html.slice(0, 3000));

  const btnExists = await page.evaluate(() => !!document.getElementById('stamp-b-btn'));
  console.log('btn exists:', btnExists);

  await browser.close();
})();
