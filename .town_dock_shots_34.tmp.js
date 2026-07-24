const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8937/nazonazo-tunnel/index.html';
const SHOT_DIR = '/private/tmp/claude-501/-Users-ndw-mac-AppDevelopment-pono-asobiba-app/87e89b3e-0c3e-48af-afe3-4e0c6c4f2ce7/scratchpad';
async function snap(page) { return page.evaluate(() => window.__townDockSnapshot()); }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto(BASE);
  await page.waitForSelector('#startBtn', { state: 'visible', timeout: 15000 });
  await page.click('#startBtn');
  await page.waitForFunction(() => { const l = document.getElementById('townDockLayer'); return l && !l.hidden; }, { timeout: 20000 });
  await page.waitForTimeout(600);

  const throttle = page.locator('#townDockThrottle');
  const box = await throttle.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(1250);
  await page.mouse.up();

  console.log('polling tightly (every 25ms) for the settle + boarding transition...');
  let shot3taken = false, shot4taken = false;
  const start = Date.now();
  while (Date.now() - start < 4000 && !shot4taken) {
    const s = await snap(page);
    if (!shot3taken && Math.abs(s.vel) < 1.5 && s.phase === 'run' && s.armed) {
      shot3taken = true;
      console.log('t=' + (Date.now() - start) + 'ms settling: pos=', s.pos, 'vel=', s.vel);
      await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v3_03_stopped_at_gate.png` });
      console.log('saved 03_stopped_at_gate.png');
    }
    if (s.phase === 'boarding') {
      await page.waitForTimeout(180); // let the flyer be mid-arc
      console.log('t=' + (Date.now() - start) + 'ms boarding phase, pos=', s.pos);
      await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v3_04_boarding.png` });
      console.log('saved 04_boarding.png, #cars children=', await page.evaluate(() => document.getElementById('cars').children.length));
      console.log('#cars innerHTML seat count=', await page.evaluate(() => document.querySelectorAll('#cars .seat-a,#cars .seat-b,#cars .seat-c,#cars .seat-d').length));
      shot4taken = true;
      break;
    }
    await page.waitForTimeout(25);
  }
  console.log('shot3taken=', shot3taken, 'shot4taken=', shot4taken);
  await browser.close();
  process.exit((shot3taken && shot4taken) ? 0 : 1);
})().catch(err => { console.error('SCRIPT ERROR:', err); process.exit(1); });
