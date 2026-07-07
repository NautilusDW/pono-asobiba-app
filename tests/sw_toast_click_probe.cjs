// SW toast CLICK flow probe.
// Loads play.html, bumps sw.js, reloads → toast shows, clicks it → observe activation + reload.
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
    window.__ponoToastEvents = window.__ponoToastEvents || [];
    const setup = () => {
      document.querySelectorAll('.pono-sw-toast').forEach(() => {
        window.__ponoToastEvents.push({ at: Date.now(), action: 'existing_on_boot' });
      });
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
    if (document.body) setup();
    else document.addEventListener('DOMContentLoaded', setup);
  });
}

async function readState(page) {
  return await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return {
      controller: !!navigator.serviceWorker.controller,
      controllerURL: navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL : null,
      waiting: reg && !!reg.waiting,
      installing: reg && !!reg.installing,
      active: reg && !!reg.active,
      sessionFlag: sessionStorage.getItem('pono_sw_toast_shown_session'),
      catchupFlag: sessionStorage.getItem('__ponoSwCatchupV2027'),
      lastSeen: localStorage.getItem('ponoLastSeenCacheVer'),
      toastCount: document.querySelectorAll('.pono-sw-toast').length,
      totalEventCount: (window.__ponoToastEvents || []).length,
    };
  });
}

async function main() {
  const raw0 = fs.readFileSync(SW_PATH, 'utf8');
  const START_V = 2027;
  const NEW_V = 2028;
  console.log('start v=' + START_V + ' bump to v=' + NEW_V);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'allow' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('framenavigated', f => {
    if (f === page.mainFrame()) {
      // Log navigations
      // console.log('nav:', f.url());
    }
  });
  await initToastWatcher(page);

  try {
    // Step 1: cold install v2027
    console.log('\n== Step 1: cold install v' + START_V);
    await page.goto(BASE + '/play.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    console.log('  state:', JSON.stringify(await readState(page)));

    // Bump SW to v2028 to simulate a new deploy
    bumpSw(START_V, NEW_V);
    console.log('\n== bumped sw.js on disk to v' + NEW_V);

    // Step 2: reload → new SW installs as waiting → toast appears
    console.log('\n== Step 2: reload play.html');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    console.log('  state:', JSON.stringify(await readState(page)));

    // Step 3: click the toast go button
    const goBtn = page.locator('.pono-sw-toast .pono-sw-toast-go').first();
    const cnt = await goBtn.count();
    console.log('\n== Step 3: toast go button count =', cnt);
    if (cnt > 0) {
      // Track sessionStorage clear timing
      await page.evaluate(() => {
        window.__flagClears = [];
        const orig = sessionStorage.removeItem.bind(sessionStorage);
        sessionStorage.removeItem = function (k) {
          if (k === 'pono_sw_toast_shown_session') {
            window.__flagClears.push({ at: Date.now(), stack: new Error().stack });
          }
          return orig(k);
        };
      });

      await goBtn.click({ timeout: 3000 });
      console.log('  click posted. waiting for reload cycle...');
      await page.waitForTimeout(10000);
      const state3 = await readState(page);
      const flagClears = await page.evaluate(() => window.__flagClears || []);
      console.log('  state after click+wait:', JSON.stringify(state3));
      console.log('  flag clears:', flagClears.length);
      await page.screenshot({ path: path.join(OUT, 'click_probe_after_go.png') });
    }

    // Step 4: bump AGAIN and check if toast re-fires from a new-installation cycle
    bumpSw(NEW_V, NEW_V + 1);
    console.log('\n== bumped sw.js again to v' + (NEW_V + 1));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    const state4 = await readState(page);
    console.log('  state after 2nd bump+reload:', JSON.stringify(state4));
    console.log('  toast events on this page:', JSON.stringify(await page.evaluate(() => window.__ponoToastEvents.slice(-5))));

    console.log('\n== errors:', JSON.stringify(errors));
  } finally {
    fs.writeFileSync(SW_PATH, raw0, 'utf8');
    console.log('\nrestored sw.js');
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
