const { chromium } = require('playwright');
const SHOT_DIR = '/private/tmp/claude-501/-Users-ndw-mac-AppDevelopment-pono-asobiba-app/87e89b3e-0c3e-48af-afe3-4e0c6c4f2ce7/scratchpad';
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function snap(page) { return page.evaluate(() => window.__townDockSnapshot ? window.__townDockSnapshot() : null); }

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 932, height: 430 } });
  const errors = [];
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto('http://localhost:8792/nazonazo-tunnel/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.locator('#startBtn').click();
  await page.waitForTimeout(600);

  const throttle = page.locator('#townDockThrottle');
  const tbox = await throttle.boundingBox();
  const cx = tbox.x + tbox.width / 2, cy = tbox.y + tbox.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();

  let bestShotTaken = false;
  let clearShotTaken = false;
  for (let iter = 0; iter < 1200; iter++) {
    await sleep(30);
    const s = await snap(page);
    if (!s || s.phase !== 'run') { if (s && s.phase !== 'run') break; continue; }
    const info = await page.evaluate(() => {
      const gate = document.querySelectorAll('.tun.station')[0];
      const box = document.querySelector('.town-dock-stop-box');
      const btn = document.getElementById('townDockThrottle');
      if (!gate || !box || box.hidden) return null;
      const g = gate.getBoundingClientRect(), b = box.getBoundingClientRect(), t = btn.getBoundingClientRect();
      const overlapX = Math.min(g.right, b.right) - Math.max(g.left, b.left);
      const boxClearOfButton = b.right < t.left || b.left > t.right;
      return { gateLeft: g.left, gateRight: g.right, boxLeft: b.left, boxRight: b.right, overlapX, boxClearOfButton, btnLeft: t.left, btnRight: t.right };
    });
    if (info && info.overlapX > 60 && !clearShotTaken) {
      // release right around here so the train visibly settles inside/near the overlap
      const predictedStop = s.pos + (s.vel * s.vel) / 16;
      if (predictedStop >= s.bounds.end - s.bounds.width * 0.3) {
        await page.mouse.up();
      }
      if (info.boxClearOfButton || iter % 4 === 0) {
        await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v5_station_overlap.png` });
        console.log('clear overlap frame @iter', iter, JSON.stringify(info));
        clearShotTaken = true;
      }
    }
  }
  // let it settle/fail and grab the final resting frame too
  for (let iter = 0; iter < 100; iter++) {
    await sleep(50);
    const s = await snap(page);
    if (s && s.phase !== 'run') break;
  }
  await page.screenshot({ path: `${SHOT_DIR}/town_dock_visual_v5_e_settled.png` });
  console.log('errors', errors);
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
