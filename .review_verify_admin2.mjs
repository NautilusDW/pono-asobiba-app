import { chromium } from 'playwright';
const BASE = 'http://localhost:8934';
const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('response', r => { if (r.status() === 404) console.log('404:', r.url()); });
  await page.goto(`${BASE}/admin/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await browser.close();
};
run().catch(e => { console.error(e); process.exit(1); });
