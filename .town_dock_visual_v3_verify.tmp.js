const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8937/nazonazo-tunnel/index.html';
const SHOT_DIR = '/private/tmp/claude-501/-Users-ndw-mac-AppDevelopment-pono-asobiba-app/87e89b3e-0c3e-48af-afe3-4e0c6c4f2ce7/scratchpad';

async function snap(page) { return page.evaluate(() => window.__townDockSnapshot()); }
async function worldX(page) { return page.evaluate(() => window.__townDockWorldXDebug ? window.__townDockWorldXDebug() : null); }

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
  // Wait for the initial cruise (driving=true toward the approach start) to finish and stop.
  await page.waitForFunction(() => !window.__townDockSnapshot || true, {}); // no-op sync
  await page.waitForTimeout(600);

  console.log('=== SCREENSHOT 1: stopped at the approach start (before any player input) ===');
  const s1 = await snap(page);
  console.log('snapshot at rest:', s1);
  await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v3_01_approach_start.png` });
  console.log('saved 01_approach_start.png');

  const throttle = page.locator('#townDockThrottle');
  const box = await throttle.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  console.log('\n=== CHECK: hold moves the train (critical regression check) ===');
  const before = await snap(page);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(700);
  const mid1 = await snap(page);
  console.log('pos before hold=', before.pos, ' pos at 700ms=', mid1.pos, ' #veh has .go?', await page.evaluate(() => document.getElementById('veh').classList.contains('go')));

  console.log('\n=== SCREENSHOT 2: mid-hold, real gate approaching via real worldX scroll ===');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v3_02_approaching.png` });
  console.log('saved 02_approaching.png, pos now=', (await snap(page)).pos);

  // Try to land precisely: release around the point where it should settle in the zone.
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(1200);
  const afterRelease = await snap(page);
  console.log('after release, phase=', afterRelease.phase, 'pos=', afterRelease.pos);

  console.log('\n=== Play attempts until a real success (screenshot 3: pitatto stop, screenshot 4: boarding) ===');
  let landed = false, boarded = false;
  const HOLDS = [1450, 1300, 1600, 1200, 1800, 1000, 2000, 1350, 1550, 1150];
  for (let attempt = 0; attempt < 8 && !boarded; attempt++) {
    const s = await snap(page);
    if (s.phase !== 'run') { await page.waitForTimeout(300); continue; }
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.waitForTimeout(HOLDS[attempt % HOLDS.length]);
    await page.mouse.up();
    // poll for settle: watch for vel~0 (we approximate via repeated snapshots) then boarding phase
    const pollStart = Date.now();
    while (Date.now() - pollStart < 2200) {
      const s2 = await snap(page);
      if (!landed && Math.abs(s2.vel) < 0.5 && s2.armed && s2.phase === 'run') {
        landed = true;
        console.log('=== SCREENSHOT 3: settled precisely at the real station gate ===');
        await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v3_03_stopped_at_gate.png` });
        console.log('saved 03_stopped_at_gate.png, pos=', s2.pos);
      }
      if (s2.phase === 'boarding') {
        boarded = true;
        await page.waitForTimeout(150);
        console.log('=== SCREENSHOT 4: real boardPassenger() flight/boarding animation ===');
        await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v3_04_boarding.png` });
        console.log('saved 04_boarding.png, #cars children=', await page.evaluate(() => document.getElementById('cars').children.length));
        break;
      }
      await page.waitForTimeout(60);
    }
  }
  if (!landed) console.log('WARNING: never observed a clean near-zero-velocity settle for screenshot 3 within budget');
  if (!boarded) {
    console.log('WARNING: never observed a boarding phase within budget; saving current state for screenshot 3/4 anyway');
    await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v3_03_stopped_at_gate.png` });
    await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v3_04_boarding.png` });
  }

  console.log('\n=== zero-input check: reload, reach town-dock, wait 15s untouched, confirm no fail loop ===');
  await page.goto(BASE);
  await page.waitForSelector('#startBtn', { state: 'visible', timeout: 15000 });
  await page.click('#startBtn');
  await page.waitForFunction(() => { const l = document.getElementById('townDockLayer'); return l && !l.hidden; }, { timeout: 20000 });
  await page.waitForTimeout(600);
  let failCount = 0;
  const zeroInputStart = Date.now();
  while (Date.now() - zeroInputStart < 15000) {
    const s = await snap(page);
    if (s.phase === 'fail-pause') failCount++;
    await page.waitForTimeout(300);
  }
  console.log('zero-input 15s: fail-pause observations=', failCount, '(must be 0)');
  const zeroInputFinal = await snap(page);
  console.log('final snapshot after 15s untouched:', zeroInputFinal);

  console.log('\n=== continuous-hold-across-retry check (fresh reload) ===');
  await page.goto(BASE);
  await page.waitForSelector('#startBtn', { state: 'visible', timeout: 15000 });
  await page.click('#startBtn');
  await page.waitForFunction(() => { const l = document.getElementById('townDockLayer'); return l && !l.hidden; }, { timeout: 20000 });
  await page.waitForTimeout(600);
  const box2 = await page.locator('#townDockThrottle').boundingBox();
  const cx2 = box2.x + box2.width / 2, cy2 = box2.y + box2.height / 2;
  await page.mouse.move(cx2, cy2);
  await page.mouse.down();
  let sawFail = false, sawPostRetryMovement = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    const s = await snap(page);
    if (s.phase === 'fail-pause') sawFail = true;
    if (sawFail && s.phase === 'run' && s.pos > 2) { sawPostRetryMovement = true; break; }
    await page.waitForTimeout(80);
  }
  await page.mouse.up();
  console.log('continuous-hold-across-retry: sawFail=', sawFail, 'sawPostRetryMovement=', sawPostRetryMovement);

  console.log('\n=== full 3-station completion (fresh reload) ===');
  await page.goto(BASE);
  await page.waitForSelector('#startBtn', { state: 'visible', timeout: 15000 });
  await page.click('#startBtn');
  await page.waitForFunction(() => { const l = document.getElementById('townDockLayer'); return l && !l.hidden; }, { timeout: 20000 });
  await page.waitForTimeout(600);
  const box3 = await page.locator('#townDockThrottle').boundingBox();
  const cx3 = box3.x + box3.width / 2, cy3 = box3.y + box3.height / 2;
  let attempts = 0, done = false;
  while (attempts < 25) {
    const layerGone = await page.evaluate(() => { const l = document.getElementById('townDockLayer'); return !l || l.hidden; });
    if (layerGone) { done = true; break; }
    const s = await snap(page);
    if (s.phase !== 'run') { await page.waitForTimeout(250); continue; }
    attempts++;
    await page.mouse.move(cx3, cy3);
    await page.mouse.down();
    await page.waitForTimeout(HOLDS[(attempts - 1) % HOLDS.length]);
    await page.mouse.up();
    await page.waitForTimeout(2200); // account for the extra inter-station cruise time now
  }
  await page.waitForTimeout(2000);
  const finalStamp = await page.evaluate(() => document.getElementById('stamp').textContent);
  const carsCount = await page.evaluate(() => document.getElementById('cars').children.length);
  console.log('reached completeCurrentStage (layer hidden)=', done, 'attempts used=', attempts, 'final stamp=', finalStamp, 'final #cars children=', carsCount);

  console.log('\n=== console errors across entire session ===');
  console.log('count=', consoleErrors.length);
  consoleErrors.forEach(e => console.log('  -', e));

  await browser.close();
  process.exit((sawFail && sawPostRetryMovement && done && failCount === 0 && consoleErrors.length === 0) ? 0 : 1);
})().catch(err => { console.error('SCRIPT ERROR:', err); process.exit(1); });
