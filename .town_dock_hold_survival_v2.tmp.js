const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8936/nazonazo-tunnel/index.html';
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

  console.log('Holding continuously (never releasing) until a forced overshoot fail-pause happens,');
  console.log('then confirming pos climbs again after the retry without any new pointerdown.');
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  let sawFail = false, sawPostRetryMovement = false;
  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    const s = await snap(page);
    samples.push({ t: Date.now() - t0, phase: s.phase, pos: Number(s.pos.toFixed(1)) });
    if (s.phase === 'fail-pause') sawFail = true;
    if (sawFail && s.phase === 'run' && s.pos > 2) { sawPostRetryMovement = true; break; }
    await page.waitForTimeout(80);
  }
  await page.mouse.up();
  const vehGoDuringHold = await page.evaluate(() => document.getElementById('veh').classList.contains('go'));
  console.log('trace (deduped):');
  let prevKey = null;
  for (const s of samples) { const k = s.phase + ':' + Math.round(s.pos / 3); if (k !== prevKey) { console.log(' t=' + s.t + 'ms phase=' + s.phase + ' pos=' + s.pos); prevKey = k; } }
  console.log('sawFail=', sawFail, 'sawPostRetryMovement=', sawPostRetryMovement, 'vehHadGoClassRightAfterRelease=', vehGoDuringHold);
  console.log('console errors:', consoleErrors.length);
  await browser.close();
  process.exit((sawFail && sawPostRetryMovement && consoleErrors.length === 0) ? 0 : 1);
})().catch(err => { console.error('SCRIPT ERROR:', err); process.exit(1); });
