// Verify batch:1058-sw-toast-fix.
// Runs against local python http.server on port 54921.
// Scenarios:
//  1) Cold install of vSTART on play.html — no toast (no prior controller).
//  2) Bump sw.js on disk to simulate new deploy, reload play.html — toast fires ONCE.
//  3) Navigate to bento — no toast interruption; bento loads.
//  4) Return to play.html — no toast re-fire (session + cooldown gate).
//  5) Reload play.html many times — toast never re-fires within 30s window.
//  6) Click × on toast, reload — toast never re-fires.
//  7) Click 今すぐ更新 → activate → reload → no toast.
//  8) After activate, bump sw again → toast fires ONCE (fresh version legit).

const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const OUT = 'C:\\Users\\surfe\\AppData\\Local\\Temp\\claude\\d--AppDevelopment-pono-asobiba-app\\f9999e22-47da-4d64-a4a1-f4525d95d537\\scratchpad';
const BASE = 'http://127.0.0.1:54921';
const SW_PATH = path.resolve(__dirname, '..', 'sw.js');

function readSwVersion() {
  const raw = fs.readFileSync(SW_PATH, 'utf8');
  const m = raw.match(/^const CACHE_VERSION = (\d+);/m);
  return parseInt(m[1], 10);
}

function bumpSw(fromN, toN) {
  const raw = fs.readFileSync(SW_PATH, 'utf8');
  const nu = raw.replace('const CACHE_VERSION = ' + fromN + ';', 'const CACHE_VERSION = ' + toN + ';');
  if (nu === raw) throw new Error('bump failed ' + fromN + '->' + toN);
  fs.writeFileSync(SW_PATH, nu, 'utf8');
}

async function initToastWatcher(page) {
  await page.addInitScript(() => {
    window.__ponoToastEvents = [];
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
      lsCooldown: localStorage.getItem('pono_sw_toast_last_shown_at'),
      lsDismissed: localStorage.getItem('pono_sw_toast_dismissed_ack'),
      toastCount: document.querySelectorAll('.pono-sw-toast').length,
      toastAdds: (window.__ponoToastEvents || []).filter(e => e.action === 'added' || e.action === 'existing_on_boot').length,
    };
  });
}

async function main() {
  const START_V = readSwVersion();
  console.log('starting SW v=' + START_V);
  const rawOrig = fs.readFileSync(SW_PATH, 'utf8');
  const summary = { steps: [], errors: [] };

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'allow' });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => { pageErrors.push(e.message); summary.errors.push('pageerror: ' + e.message); });
  await initToastWatcher(page);

  try {
    // Step 1: cold install vSTART on play.html
    console.log('\n== Step 1: cold install v' + START_V);
    await page.goto(BASE + '/play.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const s1 = await readState(page);
    console.log('state:', JSON.stringify(s1));
    summary.steps.push({ step: 1, state: s1 });
    if (s1.toastAdds !== 0) summary.errors.push('Step 1: unexpected toast on cold install');

    // Bump SW
    const NEW_V = START_V + 1;
    console.log('\n bumping sw.js to v' + NEW_V);
    bumpSw(START_V, NEW_V);

    // Step 2: reload play.html → toast fires ONCE
    console.log('\n== Step 2: reload play.html after bump');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    const s2 = await readState(page);
    console.log('state:', JSON.stringify(s2));
    summary.steps.push({ step: 2, state: s2 });
    if (s2.toastAdds !== 1) summary.errors.push('Step 2: expected 1 toast, got ' + s2.toastAdds);
    if (!s2.sessionFlag) summary.errors.push('Step 2: session flag missing');
    if (!s2.lsCooldown) summary.errors.push('Step 2: localStorage cooldown missing');
    await page.screenshot({ path: path.join(OUT, 'fix_verify_step2_toast_shown.png') });

    // Step 3: navigate to bento — no toast interruption
    console.log('\n== Step 3: navigate to bento');
    await page.goto(BASE + '/bento/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    const s3 = await readState(page);
    console.log('state:', JSON.stringify(s3));
    summary.steps.push({ step: 3, state: s3 });
    // bento doesn't include sw-update.js so no toast can appear there
    if (s3.toastAdds !== 0) summary.errors.push('Step 3: bento should not show toast (does not include sw-update.js), got ' + s3.toastAdds);

    // Step 4: return to play.html — no toast re-fire
    console.log('\n== Step 4: return to play.html');
    await page.goto(BASE + '/play.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const s4 = await readState(page);
    console.log('state:', JSON.stringify(s4));
    summary.steps.push({ step: 4, state: s4 });
    if (s4.toastAdds !== 0) summary.errors.push('Step 4: unexpected re-fire on return, got ' + s4.toastAdds);

    // Step 5: reload play.html 3 times → still no re-fire (cooldown gate)
    console.log('\n== Step 5: 3x reload cycle');
    for (let i = 0; i < 3; i++) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);
    }
    const s5 = await readState(page);
    console.log('state after 3 reloads:', JSON.stringify(s5));
    summary.steps.push({ step: 5, state: s5 });
    if (s5.toastAdds !== 0) summary.errors.push('Step 5: reload loop re-fired toast, got ' + s5.toastAdds);

    // Step 6: click 今すぐ更新 button (need to force it to appear again)
    // Clear cooldown to force show, then click go
    console.log('\n== Step 6: force show + click go');
    await page.evaluate(() => {
      localStorage.removeItem('pono_sw_toast_last_shown_at');
      localStorage.removeItem('pono_sw_toast_dismissed_ack');
      sessionStorage.removeItem('pono_sw_toast_shown_session');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const goBtn = page.locator('.pono-sw-toast .pono-sw-toast-go').first();
    const goCount = await goBtn.count();
    console.log('go button visible after force clear:', goCount);
    if (goCount === 0) summary.errors.push('Step 6: force-cleared, but toast did not show for click test');
    if (goCount > 0) {
      await goBtn.click({ timeout: 3000 });
      console.log('clicked go, waiting for activate + reload');
      await page.waitForTimeout(10000);
      const s6 = await readState(page);
      console.log('state after go click:', JSON.stringify(s6));
      summary.steps.push({ step: 6, state: s6 });
      // After activate, dismissed_ack should be cleared and cooldown too
      if (s6.waiting) summary.errors.push('Step 6: SW should have activated');
      if (s6.lsDismissed) summary.errors.push('Step 6: dismissal flag should be cleared after activate');
      if (s6.lsCooldown) summary.errors.push('Step 6: cooldown should be cleared after activate');
    }

    // Step 7: bump AGAIN and reload → should fire toast for a fresh new version
    const NEW_V2 = NEW_V + 1;
    bumpSw(NEW_V, NEW_V2);
    console.log('\n== Step 7: bump to v' + NEW_V2 + ' and reload');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    const s7 = await readState(page);
    console.log('state:', JSON.stringify(s7));
    summary.steps.push({ step: 7, state: s7 });
    if (s7.toastAdds !== 1) summary.errors.push('Step 7: expected 1 toast for legit new version, got ' + s7.toastAdds);

    // Step 8: click × to dismiss, reload — no re-fire even after cooldown clear
    console.log('\n== Step 8: click × dismiss + reload');
    const closeBtn = page.locator('.pono-sw-toast .pono-sw-toast-close').first();
    const closeCount = await closeBtn.count();
    if (closeCount > 0) {
      await closeBtn.click({ timeout: 3000 });
      await page.waitForTimeout(1000);
      const afterClose = await readState(page);
      console.log('after close x:', JSON.stringify(afterClose));
      if (!afterClose.lsDismissed) summary.errors.push('Step 8: × click should set dismissed_ack');
      // Now clear cooldown but not dismissed_ack
      await page.evaluate(() => {
        localStorage.removeItem('pono_sw_toast_last_shown_at');
        sessionStorage.removeItem('pono_sw_toast_shown_session');
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);
      const s8 = await readState(page);
      console.log('state after dismiss + reload:', JSON.stringify(s8));
      summary.steps.push({ step: 8, state: s8 });
      if (s8.toastAdds !== 0) summary.errors.push('Step 8: toast re-fired after × dismiss + reload');
    }

    console.log('\n== ERRORS:', JSON.stringify(summary.errors, null, 2));
    console.log('== PAGE ERRORS:', JSON.stringify(pageErrors));
    console.log('\n== summary steps:', summary.steps.length, 'errors:', summary.errors.length);

    // Final screenshot
    await page.screenshot({ path: path.join(OUT, 'fix_verify_final.png') });

  } finally {
    // restore sw.js
    fs.writeFileSync(SW_PATH, rawOrig, 'utf8');
    console.log('restored sw.js to original');
    await browser.close();
  }
  process.exit(summary.errors.length > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
