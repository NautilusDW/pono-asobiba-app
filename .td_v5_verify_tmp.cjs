const { chromium } = require('playwright');

const SHOT_DIR = '/private/tmp/claude-501/-Users-ndw-mac-AppDevelopment-pono-asobiba-app/87e89b3e-0c3e-48af-afe3-4e0c6c4f2ce7/scratchpad';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function snap(page) { return page.evaluate(() => window.__townDockSnapshot ? window.__townDockSnapshot() : null); }

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 932, height: 430 } });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));

  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto('http://localhost:8792/nazonazo-tunnel/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const startBtn = page.locator('#startBtn');
  await startBtn.waitFor({ state: 'visible', timeout: 5000 });
  await startBtn.click();
  await page.waitForTimeout(600);

  let s = await snap(page);
  console.log('=== leg0 start snapshot ===', JSON.stringify(s));
  await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v5_a_early.png` });

  const throttle = page.locator('#townDockThrottle');
  const box = await throttle.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  const legTimes = [];
  let shotB = false, shotC = false, shotStationOverlap = false;
  const DECEL = 8;

  for (let leg = 0; leg < 3; leg++) {
    const legStartWall = Date.now();
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    let released = false;
    let attemptsSeen = 0;
    for (let iter = 0; iter < 3000; iter++) {
      await sleep(35);
      s = await snap(page);
      if (!s) continue;
      if (s.phase === 'fail-pause') continue;
      if (s.phase !== 'run') break;
      // v5 test-harness fix: if a fail happened (attempts increased) and we're back in "run"
      // with pos reset to 0, the earlier mouse.up() already fired for the failed attempt --
      // re-press so the retry actually gets driven (otherwise the loop just sits idle at
      // pos=0/vel=0 forever, which is a test-script limitation, not a game bug: the game's
      // own hold-preservation only applies to a *continuous* hold that never released).
      if (s.attempts > attemptsSeen) {
        attemptsSeen = s.attempts;
        if (released && s.pos === 0) { await page.mouse.down(); released = false; }
      }
      if (!released && s.bounds) {
        const warnLead = 42;
        if (leg === 0 && !shotB && s.pos >= s.bounds.start - warnLead && s.pos < s.bounds.start - warnLead + 6) {
          await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v5_b_brakezone.png` });
          shotB = true;
        }
        // v5: aim to land deep in the zone (near bounds.end), close to the real station,
        // instead of the earliest valid point -- this both represents a more typical
        // (not minimax-optimal) child player AND lets us verify the box actually lines up
        // with the station art in the same frame.
        const predictedStop = s.pos + (s.vel * s.vel) / (2 * DECEL);
        const target = s.bounds.end - s.bounds.width * 0.12;
        if (predictedStop >= target) {
          await page.mouse.up();
          released = true;
        }
      }
      if (leg === 0 && released && !shotC && s.bounds && s.pos >= s.bounds.start && s.pos <= s.bounds.end) {
        await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v5_c_stopbox.png` });
        shotC = true;
      }
      // check for the real station gate + our stop-box appearing in the same viewport frame
      if (leg === 0 && released && !shotStationOverlap) {
        const overlapInfo = await page.evaluate(() => {
          const gate = document.querySelectorAll('.tun.station')[0];
          const box = document.querySelector('.town-dock-stop-box');
          if (!gate || !box || box.hidden) return null;
          const g = gate.getBoundingClientRect(), b = box.getBoundingClientRect();
          const overlapX = Math.min(g.right, b.right) - Math.max(g.left, b.left);
          return { gateLeft: g.left, gateRight: g.right, boxLeft: b.left, boxRight: b.right, overlapX, gateVisible: g.right > 0 && g.left < window.innerWidth };
        });
        if (overlapInfo && overlapInfo.gateVisible && overlapInfo.overlapX > 20) {
          await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v5_station_overlap.png` });
          console.log('station/box overlap info:', JSON.stringify(overlapInfo));
          shotStationOverlap = true;
        }
      }
    }
    s = await snap(page);
    const legElapsed = (Date.now() - legStartWall) / 1000;
    legTimes.push({ leg, elapsedSec: legElapsed, endPhase: s && s.phase, endAttempts: s && s.attempts });
    console.log(`=== leg${leg} end snapshot ===`, JSON.stringify(s));
    if (leg === 0) {
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v5_d_boarding.png` });
    }
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
  console.log('shotStationOverlap achieved:', shotStationOverlap);

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
