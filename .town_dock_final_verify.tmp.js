const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8935/nazonazo-tunnel/index.html';

async function snap(page) { return page.evaluate(() => window.__townDockSnapshot()); }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push('pageerror: ' + err.message));

  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto(BASE);
  await page.waitForSelector('#startBtn', { state: 'visible', timeout: 15000 });
  await page.click('#startBtn');
  await page.waitForFunction(() => { const l = document.getElementById('townDockLayer'); return l && !l.hidden; }, { timeout: 20000 });

  const throttle = page.locator('#townDockThrottle');
  const box = await throttle.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  console.log('=== CHECK 2: aria-label of townDockWindows (must not read as a chances/lives counter) ===');
  console.log(await page.evaluate(() => document.getElementById('townDockWindows').getAttribute('aria-label')));

  console.log('\n=== CHECK 3: continuous hold across a forced fail+retry (never releasing the mouse) ===');
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  let sawFail = false, sawPostRetryMovement = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    const s = await snap(page);
    if (s.phase === 'fail-pause') sawFail = true;
    if (sawFail && s.phase === 'run' && s.pos > 2) { sawPostRetryMovement = true; break; }
    await page.waitForTimeout(100);
  }
  await page.mouse.up();
  console.log('sawFail=', sawFail, 'sawPostRetryMovement (pos climbed again, same never-released pointer)=', sawPostRetryMovement);
  await page.waitForTimeout(1500);

  console.log('\n=== CHECK 4: full normal hold/release playthrough to completeCurrentStage ===');
  // reset by reloading fresh
  await page.goto(BASE);
  await page.waitForSelector('#startBtn', { state: 'visible', timeout: 15000 });
  await page.click('#startBtn');
  await page.waitForFunction(() => { const l = document.getElementById('townDockLayer'); return l && !l.hidden; }, { timeout: 20000 });
  const box2 = await page.locator('#townDockThrottle').boundingBox();
  const cx2 = box2.x + box2.width / 2, cy2 = box2.y + box2.height / 2;

  const HOLDS = [1450, 1300, 1600, 1200, 1800, 1000, 2000, 1350, 1550, 1150];
  let attempts = 0, done = false;
  while (attempts < 20) {
    const s = await snap(page);
    const layerGone = await page.evaluate(() => { const l = document.getElementById('townDockLayer'); return !l || l.hidden; });
    if (layerGone) { done = true; break; }
    if (s.phase !== 'run') { await page.waitForTimeout(250); continue; }
    attempts++;
    await page.mouse.move(cx2, cy2);
    await page.mouse.down();
    await page.waitForTimeout(HOLDS[(attempts - 1) % HOLDS.length]);
    await page.mouse.up();
    await page.waitForTimeout(1600);
  }
  await page.waitForTimeout(1500);
  const finalStamp = await page.evaluate(() => document.getElementById('stamp').textContent);
  console.log('reached completeCurrentStage (layer hidden)=', done, 'attempts used=', attempts, 'final stamp=', finalStamp);

  console.log('\n=== CHECK 5: console errors across the whole session ===');
  console.log('count=', consoleErrors.length);
  consoleErrors.forEach(e => console.log('  -', e));

  await browser.close();
  process.exit((sawFail && sawPostRetryMovement && done && consoleErrors.length === 0) ? 0 : 1);
})().catch(err => { console.error('SCRIPT ERROR:', err); process.exit(1); });
