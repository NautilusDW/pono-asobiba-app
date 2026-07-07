// SW toast repro / probe for batch:1058-sw-toast-fix.
// Requires: python http.server 54921 already running at repo root.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const OUTDIR = 'C:\\Users\\surfe\\AppData\\Local\\Temp\\claude\\d--AppDevelopment-pono-asobiba-app\\f9999e22-47da-4d64-a4a1-f4525d95d537\\scratchpad';
const BASE = 'http://127.0.0.1:54921';

function snap(name) { return path.join(OUTDIR, name); }

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'allow' });
  const page = await ctx.newPage();
  const events = [];
  const toastAppearances = [];
  const errors = [];
  const consoleLogs = [];

  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    const t = m.text();
    if (t.startsWith('[sw]') || t.includes('SW') || t.includes('service worker') || m.type() === 'error') {
      consoleLogs.push(m.type() + ':' + t.slice(0, 200));
    }
  });

  await page.addInitScript(() => {
    // Install a MutationObserver watching for toast className.
    window.__ponoToastEvents = [];
    const observe = () => {
      const mo = new MutationObserver((muts) => {
        for (const mu of muts) {
          for (const n of mu.addedNodes) {
            if (n && n.nodeType === 1 && n.classList && n.classList.contains('pono-sw-toast')) {
              window.__ponoToastEvents.push({ at: Date.now(), action: 'added' });
            }
          }
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    };
    if (document.body) observe();
    else document.addEventListener('DOMContentLoaded', observe);
  });

  console.log('=== Test 1: cold load play.html ===');
  await page.goto(BASE + '/play.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  const t1 = await page.evaluate(() => (window.__ponoToastEvents || []).slice());
  const swState1 = await page.evaluate(async () => {
    if (!navigator.serviceWorker) return { ok: false };
    const reg = await navigator.serviceWorker.getRegistration();
    return {
      controller: !!navigator.serviceWorker.controller,
      controllerScriptURL: navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL : null,
      hasReg: !!reg,
      waiting: reg && !!reg.waiting,
      installing: reg && !!reg.installing,
      active: reg && !!reg.active,
      sessionFlag: sessionStorage.getItem('pono_sw_toast_shown_session'),
      catchupFlag: sessionStorage.getItem('__ponoSwCatchupV2027'),
      lastSeenVer: localStorage.getItem('ponoLastSeenCacheVer'),
    };
  });
  console.log('toastEvents after t1:', JSON.stringify(t1));
  console.log('sw state after t1:', JSON.stringify(swState1));
  await page.screenshot({ path: snap('probe_t1_afterload.png'), fullPage: false });

  console.log('=== Test 2: navigate to bento/index.html (existing SW) ===');
  await page.goto(BASE + '/bento/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  const t2 = await page.evaluate(() => (window.__ponoToastEvents || []).slice());
  const swState2 = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return {
      controller: !!navigator.serviceWorker.controller,
      hasReg: !!reg,
      waiting: reg && !!reg.waiting,
      installing: reg && !!reg.installing,
      sessionFlag: sessionStorage.getItem('pono_sw_toast_shown_session'),
    };
  });
  console.log('toastEvents after t2:', JSON.stringify(t2));
  console.log('sw state after t2:', JSON.stringify(swState2));
  await page.screenshot({ path: snap('probe_t2_bento.png'), fullPage: false });

  console.log('=== Test 3: simulate a new SW arriving (register a fresh URL) ===');
  // Force reg.update() and see behavior.
  await page.goto(BASE + '/play.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  // Inject a synthetic waiting condition by directly registering an alternate script
  const simSetup = await page.evaluate(async () => {
    // Create a fake `waiting` situation by using a modified sw registration.
    // We fake the toast eligibility by clearing sessionStorage first.
    sessionStorage.removeItem('pono_sw_toast_shown_session');
    // Trigger updatefound via reg.update()
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return { note: 'no reg' };
    try { reg.update(); } catch (e) {}
    return {
      waiting: !!reg.waiting,
      installing: !!reg.installing,
      sessionFlag: sessionStorage.getItem('pono_sw_toast_shown_session'),
    };
  });
  await page.waitForTimeout(4000);
  const t3 = await page.evaluate(() => (window.__ponoToastEvents || []).slice());
  console.log('sim setup:', JSON.stringify(simSetup));
  console.log('toastEvents after t3:', JSON.stringify(t3));

  console.log('=== errors:', JSON.stringify(errors, null, 2));
  console.log('=== consoleLogs:', JSON.stringify(consoleLogs, null, 2));

  await browser.close();
}

main().catch(e => {
  console.error('probe error:', e);
  process.exit(1);
});
