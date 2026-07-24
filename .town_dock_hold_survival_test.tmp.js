const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:8934/nazonazo-tunnel/index.html';

async function readState(page) {
  return page.evaluate(() => {
    const track = document.getElementById('townDockTrack');
    const layer = document.getElementById('townDockLayer');
    const throttle = document.getElementById('townDockThrottle');
    return {
      hidden: layer ? layer.hidden : null,
      phase: layer ? layer.dataset.phase : null,
      pos: track ? Number(track.getAttribute('aria-valuenow')) : null,
      throttleClasses: throttle ? throttle.className : null,
    };
  });
}

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
  await page.waitForFunction(() => {
    const layer = document.getElementById('townDockLayer');
    return layer && !layer.hidden;
  }, { timeout: 20000 });

  const throttle = page.locator('#townDockThrottle');
  const box = await throttle.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  console.log('=== Continuous-hold-through-failure-and-retry test ===');
  console.log('Pressing the mouse down ONCE and holding it the entire test (never calling mouse.up())');
  console.log('until well after we expect a forced overshoot fail (train reaches the track end) and the');
  console.log('automatic in-place retry has reset the run. If the fix is broken, aria-valuenow will get');
  console.log('stuck at 0 forever after the retry, because the held pointer would have been silently');
  console.log('dropped and no new pointerdown will ever arrive (we never lift the mouse).');

  await page.mouse.move(cx, cy);
  await page.mouse.down();

  const samples = [];
  let sawFail = false;
  let sawPostRetryMovement = false;
  const start = Date.now();
  // Poll for up to 8s: expect pos to climb, hit the track end / overshoot, phase to bounce to
  // "fail-pause", then back to "run" after TOWN_DOCK_RETRY_DELAY_MS (1150ms), and -- the actual
  // assertion -- pos must start climbing from 0 AGAIN afterward without us ever having released.
  while (Date.now() - start < 8000) {
    const s = await readState(page);
    samples.push({ t: Date.now() - start, ...s });
    if (s.phase === 'fail-pause') sawFail = true;
    if (sawFail && s.phase === 'run' && s.pos > 2) {
      sawPostRetryMovement = true;
      break;
    }
    await page.waitForTimeout(80);
  }

  await page.mouse.up();

  console.log('\nsample trace (t_ms, phase, pos, throttleClasses):');
  samples.filter((_, i) => i % 3 === 0 || samples[i].phase !== (samples[i-1]||{}).phase).forEach(s => {
    console.log(`  t=${s.t}ms phase=${s.phase} pos=${s.pos} classes=${s.throttleClasses}`);
  });

  console.log('\n>>> sawFail (a forced fail-pause was observed) =', sawFail);
  console.log('>>> sawPostRetryMovement (pos climbed again after the retry, holding the SAME never-released pointer) =', sawPostRetryMovement);
  console.log('>>> RESULT:', (sawFail && sawPostRetryMovement) ? 'PASS -- continuous hold survives a fail+retry transition' : 'FAIL -- hold was NOT preserved across the transition (bug NOT fixed)');

  console.log('\nconsole errors:', consoleErrors.length);
  consoleErrors.forEach(e => console.log('  -', e));

  await browser.close();
  process.exit((sawFail && sawPostRetryMovement && consoleErrors.length === 0) ? 0 : 1);
})().catch(err => { console.error('SCRIPT ERROR:', err); process.exit(1); });
