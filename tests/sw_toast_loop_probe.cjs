// Reproduce "toast keeps re-appearing" scenario.
// Requires: python http.server 54921 already running at repo root.
// Simulates a new SW arriving by bumping sw.js's CACHE_VERSION on disk between navigations.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const OUT = 'C:\\Users\\surfe\\AppData\\Local\\Temp\\claude\\d--AppDevelopment-pono-asobiba-app\\f9999e22-47da-4d64-a4a1-f4525d95d537\\scratchpad';
const BASE = 'http://127.0.0.1:54921';
const SW_PATH = path.resolve(__dirname, '..', 'sw.js');

function bumpSw(fromN, toN) {
  const raw = fs.readFileSync(SW_PATH, 'utf8');
  const nu = raw.replace('const CACHE_VERSION = ' + fromN + ';', 'const CACHE_VERSION = ' + toN + ';');
  if (nu === raw) throw new Error('CACHE_VERSION not replaced from ' + fromN + ' to ' + toN);
  fs.writeFileSync(SW_PATH, nu, 'utf8');
}

async function initToastWatcher(page) {
  await page.addInitScript(() => {
    window.__ponoToastEvents = [];
    const setupObs = () => {
      const check = (root) => {
        if (root.querySelectorAll) {
          root.querySelectorAll('.pono-sw-toast').forEach(el => {
            window.__ponoToastEvents.push({ at: Date.now(), action: 'existing_on_boot' });
          });
        }
      };
      check(document.body || document.documentElement);
      const mo = new MutationObserver((muts) => {
        for (const mu of muts) {
          for (const n of mu.addedNodes) {
            if (n && n.nodeType === 1 && n.classList && n.classList.contains('pono-sw-toast')) {
              window.__ponoToastEvents.push({ at: Date.now(), action: 'added' });
            }
          }
          for (const n of mu.removedNodes) {
            if (n && n.nodeType === 1 && n.classList && n.classList.contains('pono-sw-toast')) {
              window.__ponoToastEvents.push({ at: Date.now(), action: 'removed' });
            }
          }
        }
      });
      mo.observe(document.body || document.documentElement, { childList: true, subtree: true });
    };
    if (document.body) setupObs();
    else document.addEventListener('DOMContentLoaded', setupObs);
  });
}

async function main() {
  // Ensure we start from a clean sw v2027.
  const raw0 = fs.readFileSync(SW_PATH, 'utf8');
  const m = raw0.match(/^const CACHE_VERSION = (\d+);/m);
  if (!m) throw new Error('cant read CACHE_VERSION');
  const START_V = parseInt(m[1], 10);
  console.log('start SW version =', START_V);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'allow' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await initToastWatcher(page);

  console.log('\n=== Step 1: fresh install of vSTART on play.html ===');
  await page.goto(BASE + '/play.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  const t1 = await page.evaluate(() => window.__ponoToastEvents.slice());
  console.log('toastEvents t1:', JSON.stringify(t1));

  // Bump CACHE_VERSION on disk so that on next reload the browser fetches a new SW.
  const NEW_V = START_V + 1;
  console.log('bumping sw.js on disk to v' + NEW_V + '...');
  bumpSw(START_V, NEW_V);

  try {
    console.log('\n=== Step 2: reload play.html (should install new SW as waiting + fire toast ONCE) ===');
    await page.goto(BASE + '/play.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    const t2 = await page.evaluate(() => window.__ponoToastEvents.slice());
    const swState2 = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return {
        controller: !!navigator.serviceWorker.controller,
        controllerURL: navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL : null,
        waiting: reg && !!reg.waiting,
        installing: reg && !!reg.installing,
        active: reg && !!reg.active,
        sessionFlag: sessionStorage.getItem('pono_sw_toast_shown_session'),
      };
    });
    console.log('toastEvents t2:', JSON.stringify(t2));
    console.log('swState t2:', JSON.stringify(swState2));
    await page.screenshot({ path: path.join(OUT, 'loop_probe_t2_new_sw_waiting.png') });

    console.log('\n=== Step 3: navigate to bento/index.html WITHOUT clicking the toast (should NOT re-fire) ===');
    await page.goto(BASE + '/bento/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    const t3 = await page.evaluate(() => window.__ponoToastEvents.slice());
    const swState3 = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return {
        waiting: reg && !!reg.waiting,
        installing: reg && !!reg.installing,
        sessionFlag: sessionStorage.getItem('pono_sw_toast_shown_session'),
      };
    });
    console.log('toastEvents t3:', JSON.stringify(t3));
    console.log('swState t3:', JSON.stringify(swState3));
    await page.screenshot({ path: path.join(OUT, 'loop_probe_t3_bento_nav.png') });

    console.log('\n=== Step 4: back to play.html (still waiting SW, still same session) ===');
    await page.goto(BASE + '/play.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const t4 = await page.evaluate(() => window.__ponoToastEvents.slice());
    console.log('toastEvents t4:', JSON.stringify(t4));

    console.log('\n=== Step 5: click toast go button IF present ===');
    const goBtn = page.locator('.pono-sw-toast .pono-sw-toast-go').first();
    const goCount = await goBtn.count();
    console.log('go button count:', goCount);
    if (goCount > 0) {
      await goBtn.click({ timeout: 3000 });
      await page.waitForTimeout(8000); // wait for controllerchange + safeReload
      const t5 = await page.evaluate(() => window.__ponoToastEvents.slice());
      console.log('toastEvents t5:', JSON.stringify(t5));
      await page.screenshot({ path: path.join(OUT, 'loop_probe_t5_after_go.png') });
    }

    console.log('\n=== Step 6: after click reload settled, verify toast is gone ===');
    const finalState = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const toastCount = document.querySelectorAll('.pono-sw-toast').length;
      return {
        toastCount,
        controllerURL: navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL : null,
        waiting: reg && !!reg.waiting,
        active: reg && !!reg.active,
        sessionFlag: sessionStorage.getItem('pono_sw_toast_shown_session'),
      };
    });
    console.log('final state:', JSON.stringify(finalState));
    console.log('\n=== errors:', JSON.stringify(errors));
    console.log('=== summary: total toast add events =', (await page.evaluate(() => window.__ponoToastEvents.filter(e => e.action==='added' || e.action==='existing_on_boot').length)));
  } finally {
    // Restore sw.js to original
    fs.writeFileSync(SW_PATH, raw0, 'utf8');
    console.log('restored sw.js');
    await browser.close();
  }
}

main().catch(e => { console.error('probe error:', e); process.exit(1); });
