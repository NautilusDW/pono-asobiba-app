const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:8934/nazonazo-tunnel/index.html';

async function readState(page) {
  return page.evaluate(() => {
    const track = document.getElementById('townDockTrack');
    const layer = document.getElementById('townDockLayer');
    const progress = document.getElementById('townDockProgress');
    const guide = document.getElementById('townDockGuide');
    const throttle = document.getElementById('townDockThrottle');
    const stamp = document.getElementById('stamp');
    return {
      hidden: layer ? layer.hidden : null,
      phase: layer ? layer.dataset.phase : null,
      pos: track ? track.getAttribute('aria-valuenow') : null,
      progress: progress ? progress.textContent : null,
      guide: guide ? guide.textContent : null,
      throttleClasses: throttle ? throttle.className : null,
      stamp: stamp ? stamp.textContent : null,
      bodyClasses: document.body.className,
    };
  });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push('pageerror: ' + err.message));

  // This game gates its entire DOM behind app-tier (window.__APP_BUILD__===1) via a synchronous
  // head script; the real deployment injects that via a Cloudflare Worker prepend for the
  // staging-app env. Emulate that for local static-server testing.
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto(BASE);
  await page.waitForSelector('#startBtn', { state: 'visible', timeout: 15000 });
  await page.click('#startBtn');

  await page.waitForFunction(() => {
    const layer = document.getElementById('townDockLayer');
    return layer && !layer.hidden;
  }, { timeout: 20000 });

  console.log('=== STEP 1: townDockLayer visible ===');
  console.log(await readState(page));

  const throttle = page.locator('#townDockThrottle');
  const box = await throttle.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  console.log('\n=== STEP 2: critical-bug check -- hold 2.2s, confirm train actually moves (aria-valuenow != "0") ===');
  const before = await readState(page);
  console.log('before hold:', before);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(700);
  const mid1 = await readState(page);
  console.log('700ms into hold:', mid1);
  await page.waitForTimeout(1500);
  const mid2 = await readState(page);
  console.log('2.2s into hold (total):', mid2);
  await page.mouse.up();
  await page.waitForTimeout(1200);
  const afterRelease = await readState(page);
  console.log('1.2s after release:', afterRelease);

  const criticalBugFixed = mid1.pos !== '0' && mid2.pos !== '0' && Number(mid2.pos) > Number(mid1.pos || 0);
  console.log('\n>>> CRITICAL BUG CHECK: train moved while held =', criticalBugFixed, `(pos at 700ms=${mid1.pos}, pos at 2.2s=${mid2.pos})`);

  console.log('\n=== STEP 2b: continuous-hold-across-retry check ===');
  console.log('current phase after the above:', (await readState(page)).phase);

  console.log('\n=== STEP 3: attempt to actually clear all 3 stations ===');
  const HOLD_MS_BY_ATTEMPT = [1450, 1300, 1600, 1200, 1800, 1000, 2000];
  let stationsCleared = 0;
  let totalAttempts = 0;
  const MAX_TOTAL_ATTEMPTS = 30;
  let reachedComplete = false;

  while (totalAttempts < MAX_TOTAL_ATTEMPTS) {
    const layerGone = await page.evaluate(() => {
      const layer = document.getElementById('townDockLayer');
      return !layer || layer.hidden;
    });
    if (layerGone) { reachedComplete = true; break; }

    const s = await readState(page);
    if (s.phase !== 'run') {
      // mid-transition (fail-pause / boarding), wait it out
      await page.waitForTimeout(300);
      continue;
    }

    totalAttempts++;
    const holdMs = HOLD_MS_BY_ATTEMPT[(totalAttempts - 1) % HOLD_MS_BY_ATTEMPT.length];
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.waitForTimeout(holdMs);
    await page.mouse.up();
    await page.waitForTimeout(1600); // let physics settle + resolve fire

    const after = await readState(page);
    console.log(`attempt#${totalAttempts} holdMs=${holdMs} -> progress="${after.progress}" phase="${after.phase}" pos="${after.pos}" stamp="${after.stamp}"`);
  }

  await page.waitForTimeout(2000);
  const finalState = await readState(page);
  console.log('\n=== STEP 4: final state ===');
  console.log('reachedComplete (layer hidden/gone) =', reachedComplete);
  console.log('finalState:', finalState);
  console.log('totalAttempts used:', totalAttempts);

  console.log('\n=== STEP 5: console errors ===');
  console.log('consoleErrors count:', consoleErrors.length);
  consoleErrors.forEach(e => console.log('  -', e));

  await browser.close();
  process.exit(0);
})().catch(err => { console.error('PLAYTEST SCRIPT ERROR:', err); process.exit(1); });
