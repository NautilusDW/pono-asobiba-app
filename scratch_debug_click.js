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
  try {
    await page.click('#stamp-b-btn', { timeout: 5000 });
    console.log('click succeeded');
  } catch (e) {
    console.log('click FAILED:', e.message);
  }
  await page.waitForTimeout(500);
  const phase2exists = await page.evaluate(() => !!document.getElementById('stamp-b-wrap'));
  console.log('phase2 (stamp-b-wrap) exists after click:', phase2exists);
  await browser.close();
})();
