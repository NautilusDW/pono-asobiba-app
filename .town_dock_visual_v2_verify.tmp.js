const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8936/nazonazo-tunnel/index.html';
const SHOT_DIR = '/private/tmp/claude-501/-Users-ndw-mac-AppDevelopment-pono-asobiba-app/87e89b3e-0c3e-48af-afe3-4e0c6c4f2ce7/scratchpad';

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

  console.log('=== SCREENSHOT 1: station begin (just arrived, station off in the distance) ===');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v2_01_station_begin.png` });
  console.log('saved 01_station_begin.png');
  console.log('#veh visible?', await page.evaluate(() => getComputedStyle(document.getElementById('veh')).visibility));
  console.log('#cars visible?', await page.evaluate(() => getComputedStyle(document.getElementById('cars')).visibility));

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

  console.log('\n=== SCREENSHOT 2: mid-hold, station approaching the train ===');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v2_02_approaching.png` });
  console.log('saved 02_approaching.png');
  const mid2 = await snap(page);
  console.log('pos now=', mid2.pos);

  await page.mouse.up();
  await page.waitForTimeout(200);

  console.log('\n=== Play until a real success happens, screenshot the boarding animation ===');
  let boarded = false;
  for (let attempt = 0; attempt < 6 && !boarded; attempt++) {
    const s = await snap(page);
    if (s.phase !== 'run') { await page.waitForTimeout(300); continue; }
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.waitForTimeout(1450);
    await page.mouse.up();
    // poll for the "boarding" phase which is when the real boardPassenger() flyer is mid-flight
    const pollStart = Date.now();
    while (Date.now() - pollStart < 2000) {
      const s2 = await snap(page);
      if (s2.phase === 'boarding') { boarded = true; break; }
      await page.waitForTimeout(60);
    }
  }
  if (boarded) {
    await page.waitForTimeout(200); // let the flyer be mid-arc
    console.log('=== SCREENSHOT 3: station cleared, real boardPassenger() flyer animation mid-flight ===');
    await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v2_03_boarding.png` });
    console.log('saved 03_boarding.png');
    console.log('#cars children count now=', await page.evaluate(() => document.getElementById('cars').children.length));
  } else {
    console.log('did not observe a boarding phase within budget; saving current state anyway');
    await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v2_03_boarding.png` });
  }

  console.log('\n=== continue: full 3-station completion + continuous-hold-across-retry + console errors ===');
  let sawFail = false, sawPostRetryMovement = false;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    const s = await snap(page);
    if (s.phase === 'fail-pause') sawFail = true;
    if (sawFail && s.phase === 'run' && s.pos > 2) { sawPostRetryMovement = true; break; }
    const layerGone = await page.evaluate(() => { const l = document.getElementById('townDockLayer'); return !l || l.hidden; });
    if (layerGone) break;
    await page.waitForTimeout(100);
  }
  await page.mouse.up();
  console.log('continuous-hold-across-retry: sawFail=', sawFail, 'sawPostRetryMovement=', sawPostRetryMovement);

  let attempts = 0, done = false;
  const HOLDS = [1450, 1300, 1600, 1200, 1800, 1000, 2000, 1350, 1550, 1150];
  while (attempts < 20) {
    const layerGone = await page.evaluate(() => { const l = document.getElementById('townDockLayer'); return !l || l.hidden; });
    if (layerGone) { done = true; break; }
    const s = await snap(page);
    if (s.phase !== 'run') { await page.waitForTimeout(250); continue; }
    attempts++;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.waitForTimeout(HOLDS[(attempts - 1) % HOLDS.length]);
    await page.mouse.up();
    await page.waitForTimeout(1600);
  }
  await page.waitForTimeout(1500);
  const finalStamp = await page.evaluate(() => document.getElementById('stamp').textContent);
  const carsCount = await page.evaluate(() => document.getElementById('cars').children.length);
  console.log('reached completeCurrentStage (layer hidden)=', done, 'attempts used=', attempts, 'final stamp=', finalStamp, 'final #cars children=', carsCount);

  console.log('\n=== console errors ===');
  console.log('count=', consoleErrors.length);
  consoleErrors.forEach(e => console.log('  -', e));

  await browser.close();
  process.exit((sawFail && sawPostRetryMovement && done && consoleErrors.length === 0) ? 0 : 1);
})().catch(err => { console.error('SCRIPT ERROR:', err); process.exit(1); });
