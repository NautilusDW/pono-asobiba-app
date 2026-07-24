const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:8935/nazonazo-tunnel/index.html';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  const logs = [];
  page.on('console', msg => {
    const t = msg.text();
    logs.push(t);
    if (t.startsWith('[TD]')) console.log('CONSOLE:', t);
  });
  page.on('pageerror', err => console.log('PAGEERROR:', err.message));

  await page.addInitScript(() => { window.__APP_BUILD__ = 1; window.__TD_DEBUG__ = true; });
  await page.goto(BASE);
  await page.waitForSelector('#startBtn', { state: 'visible', timeout: 15000 });
  await page.click('#startBtn');
  await page.waitForFunction(() => {
    const layer = document.getElementById('townDockLayer');
    return layer && !layer.hidden;
  }, { timeout: 20000 });

  console.log('=== townDockLayer visible, now doing ABSOLUTELY NOTHING for 22 seconds ===');
  console.log('initial snapshot:', await page.evaluate(() => window.__townDockSnapshot()));

  const snapshots = [];
  const start = Date.now();
  while (Date.now() - start < 22000) {
    const snap = await page.evaluate(() => window.__townDockSnapshot());
    snapshots.push({ t: Date.now() - start, ...snap });
    await page.waitForTimeout(200);
  }

  console.log('\n=== snapshot trace (every 200ms, showing only when something changed) ===');
  let prev = null;
  for (const s of snapshots) {
    const key = JSON.stringify(s);
    if (key !== prev) {
      console.log(`t=${s.t}ms`, s);
      prev = key;
    }
  }

  const finalStamp = await page.evaluate(() => document.getElementById('stamp').textContent);
  const finalGuide = await page.evaluate(() => document.getElementById('townDockGuide').textContent);
  console.log('\nfinal stamp:', finalStamp);
  console.log('final guide:', finalGuide);

  console.log('\ntotal console log lines captured:', logs.length);
  const tdLogs = logs.filter(l => l.startsWith('[TD]'));
  console.log('[TD]-prefixed diagnostic lines:', tdLogs.length);
  console.log('resolveTownDockFail call count:', tdLogs.filter(l => l.includes('resolveTownDockFail')).length);
  console.log('beginTownDockHoldPointer call count:', tdLogs.filter(l => l.includes('beginTownDockHoldPointer')).length);
  console.log('armed-flip call count:', tdLogs.filter(l => l.includes('armed flipped true')).length);
  console.log('anomalous dt count:', tdLogs.filter(l => l.includes('anomalous dt')).length);

  await browser.close();
  process.exit(0);
})().catch(err => { console.error('SCRIPT ERROR:', err); process.exit(1); });
