const { chromium } = require('playwright');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function snap(page) { return page.evaluate(() => window.__townDockSnapshot ? window.__townDockSnapshot() : null); }

async function testZeroInput() {
  console.log('\n--- TEST: 15s+ zero input must not fail-loop ---');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 932, height: 430 } });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto('http://localhost:8792/nazonazo-tunnel/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.locator('#startBtn').click();
  await page.waitForTimeout(500);
  const before = await snap(page);
  console.log('before wait:', JSON.stringify(before));
  await page.waitForTimeout(18000); // 18s of doing absolutely nothing
  const after = await snap(page);
  console.log('after 18s zero input:', JSON.stringify(after));
  console.log('console errors:', errors);
  const ok = after.phase === 'run' && after.attempts === 0 && after.pos === 0 && after.armed === false;
  console.log('ZERO-INPUT TEST RESULT:', ok ? 'PASS' : 'FAIL');
  await browser.close();
  return ok;
}

async function testHoldThroughFail() {
  console.log('\n--- TEST: continuous hold through forced fail->retry, eventually succeeds via assist ---');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 932, height: 430 } });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto('http://localhost:8792/nazonazo-tunnel/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.locator('#startBtn').click();
  await page.waitForTimeout(500);

  const throttle = page.locator('#townDockThrottle');
  const box = await throttle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); // single pointerdown, NEVER released for the whole test
  let maxHeldPointers = 0, minHeldPointersAfterDown = 99, sawAttempt1 = false, sawAttempt2 = false, sawAssist = false, succeeded = false;
  const log = [];
  for (let i = 0; i < 1600; i++) { // up to ~112s (gate-anchored zone sits further out now)
    await sleep(70);
    const s = await snap(page);
    if (!s) continue;
    maxHeldPointers = Math.max(maxHeldPointers, s.heldPointers);
    minHeldPointersAfterDown = Math.min(minHeldPointersAfterDown, s.heldPointers);
    if (s.attempts >= 1) sawAttempt1 = true;
    if (s.attempts >= 2) sawAttempt2 = true;
    if (s.assist) sawAssist = true;
    if (i % 10 === 0) log.push(`t+${(i * 70 / 1000).toFixed(1)}s phase=${s.phase} pos=${s.pos.toFixed(1)} attempts=${s.attempts} assist=${s.assist} held=${s.heldPointers}`);
    if (s.phase === 'boarding' || s.stationIndex >= 1) { succeeded = true; break; }
  }
  await page.mouse.up();
  console.log(log.join('\n'));
  console.log('maxHeldPointers (should be 1 throughout once pressed):', maxHeldPointers);
  console.log('minHeldPointersAfterDown (should never drop to 0 before success):', minHeldPointersAfterDown);
  console.log('sawAttempt1:', sawAttempt1, 'sawAttempt2:', sawAttempt2, 'sawAssist:', sawAssist, 'succeeded:', succeeded);
  console.log('console errors:', errors);
  const ok = succeeded && sawAttempt1 && sawAssist && minHeldPointersAfterDown === 1;
  console.log('HOLD-THROUGH-FAIL TEST RESULT:', ok ? 'PASS' : 'FAIL');
  await browser.close();
  return ok;
}

(async () => {
  const r1 = await testZeroInput();
  const r2 = await testHoldThroughFail();
  console.log('\n=== SUMMARY === zeroInput:', r1, ' holdThroughFail:', r2);
  process.exit(r1 && r2 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
