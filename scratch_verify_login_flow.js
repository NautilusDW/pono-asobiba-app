const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('[console:' + msg.type() + ']', msg.text()));
  page.on('pageerror', (err) => console.log('[pageerror]', err.message, err.stack && err.stack.split('\n').slice(0,3).join(' | ')));

  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    localStorage.setItem('pono_stamp_log', JSON.stringify({
      dates: ['2026-07-13', '2026-07-14', '2026-07-15'],
      total: 3
    }));
  });

  await page.goto('http://localhost:8934/play.html', { waitUntil: 'load' });

  for (let t = 0; t <= 8000; t += 1000) {
    await page.waitForTimeout(1000);
    const state = await page.evaluate(() => {
      return {
        hasModal: !!document.getElementById('stamp-b-card'),
        busy: !!window._stampBatchBusy,
        given: JSON.parse(localStorage.getItem('pono_stamp_rewards_given') || '[]'),
        log: JSON.parse(localStorage.getItem('pono_stamp_log') || '{}'),
      };
    });
    console.log('t=' + (t + 1000) + 'ms', JSON.stringify(state));
  }

  await browser.close();
})();
