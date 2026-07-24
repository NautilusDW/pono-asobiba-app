const { chromium } = require('playwright');

const SHOT_DIR = '/private/tmp/claude-501/-Users-ndw-mac-AppDevelopment-pono-asobiba-app/87e89b3e-0c3e-48af-afe3-4e0c6c4f2ce7/scratchpad';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function snap(page) {
  return page.evaluate(() => window.__townDockSnapshot ? window.__townDockSnapshot() : null);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 932, height: 430 } });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));

  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto('http://localhost:8791/nazonazo-tunnel/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const startBtn = page.locator('#startBtn');
  await startBtn.waitFor({ state: 'visible', timeout: 5000 });
  await startBtn.click();
  await page.waitForTimeout(600);

  let s = await snap(page);
  console.log('=== leg0 start snapshot ===', JSON.stringify(s));
  await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v4_a_early.png` });

  const throttle = page.locator('#townDockThrottle');
  const box = await throttle.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  const legTimes = [];
  let shotB = false, shotC = false;

  for (let leg = 0; leg < 3; leg++) {
    const legStartWall = Date.now();
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    let released = false;
    let attemptsSeenMax = 0;
    let sawFail = false;
    const DECEL = 8;
    for (let iter = 0; iter < 2000; iter++) {
      await sleep(35);
      s = await snap(page);
      if (!s) continue;
      attemptsSeenMax = Math.max(attemptsSeenMax, s.attempts);
      if (s.phase === 'fail-pause') { sawFail = true; continue; }
      if (s.phase !== 'run') break; // boarding / complete
      if (!released && s.bounds) {
        const warnLead = 42;
        if (leg === 0 && !shotB && s.pos >= s.bounds.start - warnLead && s.pos < s.bounds.start - warnLead + 6) {
          await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v4_b_brakezone.png` });
          shotB = true;
        }
        const predictedStop = s.pos + (s.vel * s.vel) / (2 * DECEL);
        if (predictedStop >= s.bounds.start) {
          await page.mouse.up();
          released = true;
        }
      }
      if (leg === 0 && released && !shotC && s.bounds && s.pos >= s.bounds.start && s.pos <= s.bounds.end) {
        await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v4_c_stopbox.png` });
        shotC = true;
      }
    }
    s = await snap(page);
    const legElapsed = (Date.now() - legStartWall) / 1000;
    legTimes.push({ leg, elapsedSec: legElapsed, attemptsSeenMax, sawFail, endPhase: s && s.phase });
    console.log(`=== leg${leg} end snapshot ===`, JSON.stringify(s));
    if (leg === 0) {
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v4_d_boarding.png` });
    }
    // wait for boarding pause to finish -> next leg's phase:"run" (or overall complete)
    for (let iter = 0; iter < 200; iter++) {
      await sleep(50);
      s = await snap(page);
      if (!s) continue;
      if (s.phase === 'run' || s.stageCompletionHandled) break;
    }
  }

  console.log('=== leg timings ===', JSON.stringify(legTimes, null, 2));
  const finalSnap = await snap(page);
  console.log('=== final snapshot ===', JSON.stringify(finalSnap, null, 2));
  console.log('=== console errors ===', errors);

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
