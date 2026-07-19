// Quick playwright test to reproduce the kurumi tab bug.
// Loads tools/op-layout-editor.html via file://, clicks くるみ側 tab, captures
// active class state and right-pane SLOT label.

const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning') {
      console.log('[console.' + m.type() + ']', m.text());
    }
  });

  const file = process.env.URL || 'file:///' + path.resolve('tools/op-layout-editor.html').replace(/\\/g, '/');
  console.log('Opening:', file);
  // Pre-seed localStorage with PRE-KURUMI saved state to simulate existing user.
  // Use addInitScript so it runs BEFORE any page script.
  await page.addInitScript(() => {
    // Minimal pre-kurumi saved state: pono+hakase only, no kurumi key.
    const legacyState = {
      pono: {
        variant: 'think_chin_clasp',
        slotW: 300, slotH: 400, slotAspect: 'fixed_0.75',
        objectPosition: 'bottom', slotOffsetX: 0, slotOffsetY: -60,
        boxMode: 'image', boxImage: 'frame_001',
        boxW: 480, boxH: 180, boxX: 0, boxY: 240, boxPadding: 32,
        boxRadius: 16, boxColor: '#fde2e4',
        fontSize: 18, lineHeight: 1.5,
        aspectLock: false, aspectLockRatio: 0,
        textAlignH: 'center', textAlignV: 'center',
        labelAnchor: 'bl', labelInside: true,
        labelOffsetX: 0, labelOffsetY: 0, labelFontSize: 22,
        sampleText: 'はーい！'
      },
      hakase: {
        slotW: 300, slotH: 400, slotAspect: 'fixed_0.75',
        objectPosition: 'bottom', slotOffsetX: 0, slotOffsetY: -60,
        boxMode: 'image', boxImage: 'frame_001',
        boxW: 480, boxH: 180, boxX: 0, boxY: 240, boxPadding: 32,
        boxRadius: 16, boxColor: '#fde2e4',
        fontSize: 18, lineHeight: 1.5,
        aspectLock: false, aspectLockRatio: 0,
        textAlignH: 'center', textAlignV: 'center',
        labelAnchor: 'bl', labelInside: true,
        labelOffsetX: 0, labelOffsetY: 0, labelFontSize: 22,
        sampleText: 'ほっほっほ'
      },
      speaker: 'hakase'
      // INTENTIONALLY no kurumi key (simulates legacy state)
    };
    try {
      const PFX = 'pono.opLayoutEditor.v1.';
      localStorage.setItem(PFX + 'B', JSON.stringify(legacyState));
      localStorage.setItem(PFX + 'C', JSON.stringify(legacyState));
      localStorage.setItem(PFX + 'D', JSON.stringify(legacyState));
    } catch (e) { console.error('localStorage seed failed:', e); }
  });
  await page.goto(file);
  // Wait for init
  await page.waitForFunction(() => typeof window.state === 'object' && window.state && window.state.B, null, { timeout: 5000 }).catch(() => {});
  await page.waitForSelector('#tab-bar button', { timeout: 5000 });

  const before = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('#tab-bar button')).map(b => ({
      tab: b.dataset.tab, active: b.classList.contains('active')
    }));
    const labels = Array.from(document.querySelectorAll('#tab-body .prop-row label')).map(l => l.textContent);
    return { tabs, labels: labels.slice(0, 5), currentTab: window.currentTab };
  });
  console.log('BEFORE click:', JSON.stringify(before, null, 2));

  // Click kurumi tab
  await page.click('#tab-bar button[data-tab="kurumi"]');
  await page.waitForTimeout(200);
  // Then click hakase
  await page.click('#tab-bar button[data-tab="hakase"]');
  await page.waitForTimeout(200);
  const afterHakase = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('#tab-bar button')).map(b => ({
      tab: b.dataset.tab, active: b.classList.contains('active')
    }));
    const labels = Array.from(document.querySelectorAll('#tab-body .prop-row label')).map(l => l.textContent);
    return { tabs, firstLabel: labels[0] };
  });
  console.log('AFTER click hakase:', JSON.stringify(afterHakase, null, 2));
  // Then back to pono
  await page.click('#tab-bar button[data-tab="pono"]');
  await page.waitForTimeout(200);
  const backToPono = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('#tab-bar button')).map(b => ({
      tab: b.dataset.tab, active: b.classList.contains('active')
    }));
    const labels = Array.from(document.querySelectorAll('#tab-body .prop-row label')).map(l => l.textContent);
    return { tabs, firstLabel: labels[0] };
  });
  console.log('AFTER click back to pono:', JSON.stringify(backToPono, null, 2));
  // Now go back to kurumi for final check below.
  await page.click('#tab-bar button[data-tab="kurumi"]');
  await page.waitForTimeout(200);

  const after = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('#tab-bar button')).map(b => ({
      tab: b.dataset.tab, active: b.classList.contains('active')
    }));
    const labels = Array.from(document.querySelectorAll('#tab-body .prop-row label')).map(l => l.textContent);
    // Read currentTab via eval since not on window
    let currentTab, kurumiKeys, ponoVariant, kurumiVariant;
    try { currentTab = eval('currentTab'); } catch (e) { currentTab = '<eval failed: ' + e.message + '>'; }
    try {
      const k = eval('state["B"].kurumi');
      kurumiKeys = k ? Object.keys(k) : null;
      kurumiVariant = k ? k.variant : null;
      ponoVariant = eval('state["B"].pono.variant');
    } catch (e) { kurumiKeys = '<eval failed: ' + e.message + '>'; }
    // Also check storage seed worked
    const PFX = 'pono.opLayoutEditor.v1.';
    const rawB = localStorage.getItem(PFX + 'B');
    let savedHasKurumi = null;
    try { savedHasKurumi = !!(JSON.parse(rawB).kurumi); } catch (_) {}
    return { tabs, labels: labels.slice(0, 5), currentTab, kurumiKeys, kurumiVariant, ponoVariant, savedHasKurumi };
  });
  console.log('AFTER click kurumi:', JSON.stringify(after, null, 2));

  await browser.close();
})().catch(e => { console.error('test failed:', e); process.exit(1); });
