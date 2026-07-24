const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8919';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 600 } });

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push('pageerror: ' + err.message));

  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) {}
  });

  await page.goto(BASE + '/nazonazo-tunnel/index.html', { waitUntil: 'load' });

  await page.waitForSelector('#startBtn', { state: 'visible', timeout: 15000 });
  await page.click('#startBtn');

  await page.waitForSelector('#townDockLayer', { state: 'visible', timeout: 15000 });
  console.log('townDockLayer visible. phase=', await page.getAttribute('#townDockLayer', 'data-phase'));

  const throttle = page.locator('#townDockThrottle');
  const box = await throttle.boundingBox();
  if (!box) throw new Error('no bounding box for throttle');
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  async function readState() {
    return page.evaluate(() => {
      const track = document.getElementById('townDockTrack');
      return {
        ariaValueNow: track ? track.getAttribute('aria-valuenow') : null,
        phase: document.getElementById('townDockLayer').dataset.phase,
      };
    });
  }

  console.log('--- HOLD #1 (2s) ---');
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 0; i < 5; i++) {
    await sleep(400);
    console.log(JSON.stringify(await readState()));
  }
  await page.mouse.up();
  await sleep(200);
  console.log('after release #1:', JSON.stringify(await readState()));

  console.log('--- wait to see if fail/retry happens, then hold again WITHOUT gap ---');
  // Poll phase up to ~2s to catch fail-pause -> run transition
  let sawFail = false;
  for (let i = 0; i < 10; i++) {
    const st = await readState();
    if (st.phase === 'fail-pause') sawFail = true;
    if (st.phase === 'boarding') { console.log('succeeded on hold #1, phase=boarding'); break; }
    await sleep(200);
  }
  console.log('sawFail after hold1:', sawFail, 'state now:', JSON.stringify(await readState()));

  console.log('--- HOLD #2 (regression check: hold through retry) ---');
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 0; i < 8; i++) {
    await sleep(400);
    console.log(JSON.stringify(await readState()));
  }
  await page.mouse.up();
  await sleep(300);
  console.log('after release #2:', JSON.stringify(await readState()));

  // Try to get through station 1 clear by repeated hold/observe/adjust cycles for a bit longer
  console.log('--- Attempt clear loop (station 1, widest zone) ---');
  let cleared = false;
  for (let attempt = 0; attempt < 6 && !cleared; attempt++) {
    const st0 = await readState();
    if (st0.phase === 'complete' || st0.phase === 'boarding') { cleared = true; break; }
    // hold for a variable duration to try to land in zone (station1 center=50 width=36 -> generous)
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await sleep(650 + attempt * 40);
    await page.mouse.up();
    await sleep(1400); // allow settle + possible fail-pause retry delay (1150ms) to elapse
    const st1 = await readState();
    console.log('attempt', attempt, '->', JSON.stringify(st1));
    if (st1.phase === 'boarding') { cleared = true; }
  }
  console.log('cleared station 1:', cleared);

  await sleep(500);
  console.log('FINAL state:', JSON.stringify(await readState()));
  console.log('console errors count:', consoleErrors.length);
  if (consoleErrors.length) console.log('console errors:', JSON.stringify(consoleErrors, null, 2));

  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(1); });
