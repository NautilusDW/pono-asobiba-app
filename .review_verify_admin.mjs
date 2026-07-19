import { chromium } from 'playwright';
const BASE = 'http://localhost:8934';
const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });
  await page.goto(`${BASE}/admin/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const tabText = await page.evaluate(() => {
    const wm = document.querySelector('.tab[data-panel="wordmatch"]');
    return wm ? wm.textContent : 'NOT FOUND';
  });
  const knownGamesCount = await page.evaluate(() => {
    // KNOWN_GAMES is a module-scope var, not exposed globally; check rendered select/options instead if any.
    return typeof KNOWN_GAMES !== 'undefined' ? KNOWN_GAMES.length : 'KNOWN_GAMES not global (expected, closured)';
  });
  console.log('wordmatch tab text:', tabText);
  console.log('KNOWN_GAMES global check:', knownGamesCount);
  console.log('JS errors encountered:', errors.length ? errors : 'none');
  await browser.close();
};
run().catch(e => { console.error(e); process.exit(1); });
