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

  const throttle = page.locator('#townDockThrottle');
  const box = await throttle.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  async function readState() {
    return page.evaluate(() => {
      const track = document.getElementById('townDockTrack');
      return {
        ariaValueNow: track ? Number(track.getAttribute('aria-valuenow')) : null,
        phase: document.getElementById('townDockLayer').dataset.phase,
        attempts: (window.townDockState || {}).attempts,
      };
    });
  }

  console.log('=== TEST: hold continuously through an induced overshoot-fail -> retry cycle, never releasing mouse ===');
  console.log('initial:', JSON.stringify(await readState()));

  await page.mouse.move(cx, cy);
  await page.mouse.down(); // single pointerdown; never released until very end of script

  // Hold long enough to run the track to its cap (pos=100) which forces a settled overshoot-fail
  // even while held (vel clamps to 0 at the track end).
  let firstFailSeen = false;
  let sawSecondRunPhaseGrowth = false;
  let lastPhase = null;
  const log = [];
  for (let i = 0; i < 40; i++) { // ~40*250ms = 10s ceiling
    await sleep(250);
    const st = await readState();
    log.push(st);
    if (st.phase === 'fail-pause' && !firstFailSeen) {
      firstFailSeen = true;
      console.log('fail-pause reached at sample', i, JSON.stringify(st), '(mouse still down, no mouse.up() called)');
    }
    if (firstFailSeen && st.phase === 'run' && lastPhase === 'fail-pause') {
      console.log('retry run phase resumed at sample', i, JSON.stringify(st));
    }
    if (firstFailSeen && lastPhase !== null && st.phase === 'run') {
      // once back in run after the fail, check pos growth over subsequent samples
    }
    lastPhase = st.phase;
    if (firstFailSeen && st.phase === 'run' && st.ariaValueNow > 3) {
      sawSecondRunPhaseGrowth = true;
      console.log('CONFIRMED: position growing again post-retry WITHOUT any new mouse.down():', JSON.stringify(st));
      break;
    }
    if (st.phase === 'boarding' || st.phase === 'complete') {
      console.log('reached boarding/complete before we could observe a fail; stopping loop', JSON.stringify(st));
      break;
    }
  }

  await page.mouse.up();
  await sleep(200);
  console.log('final readState:', JSON.stringify(await readState()));
  console.log('firstFailSeen:', firstFailSeen, 'sawSecondRunPhaseGrowth:', sawSecondRunPhaseGrowth);
  console.log('full sample log:', JSON.stringify(log));
  console.log('console errors count:', consoleErrors.length);
  if (consoleErrors.length) console.log('console errors:', JSON.stringify(consoleErrors, null, 2));

  await browser.close();
  process.exit(firstFailSeen && sawSecondRunPhaseGrowth ? 0 : 2);
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(1); });
