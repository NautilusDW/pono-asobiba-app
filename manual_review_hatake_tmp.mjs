// Independent manual review script (not reusing project's own test file logic verbatim).
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:8000';

async function withPage(opts, fn) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + String(e)));
  try {
    await fn(page, consoleErrors);
  } finally {
    await browser.close();
  }
}

async function forceCoarse(page) {
  await page.addInitScript(() => {
    const orig = window.matchMedia;
    window.matchMedia = (q) => {
      if (q.includes('pointer: coarse')) return { matches: true, media: q, addListener(){}, removeListener(){} };
      return orig(q);
    };
  });
}

const results = [];
function log(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name + (detail ? ' :: ' + detail : ''));
}

const LANDSCAPE = [
  [844, 390], [1024, 600], [1180, 820]
];

for (const [w, h] of LANDSCAPE) {
  await withPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true }, async (page, errs) => {
    await forceCoarse(page);
    await page.goto(BASE + '/hatake-nikki/index.html');
    await page.evaluate(() => { try { localStorage.clear(); } catch(e){} });
    await page.reload();
    await page.waitForFunction(() => document.body.classList.contains('pono-game-ready'), null, { timeout: 10000 });
    const visible = await page.locator('#landscape-notice').isVisible();
    log(`landscape ${w}x${h}: notice hidden`, !visible, 'visible=' + visible);
    const box = await page.locator('#start-btn').boundingBox();
    await page.touchscreen.tap(box.x + box.width/2, box.y + box.height/2);
    await page.waitForTimeout(300);
    const cls = await page.locator('#field-screen').getAttribute('class');
    log(`landscape ${w}x${h}: start-btn transitions to field-screen`, /show/.test(cls || ''), 'class=' + cls);
    log(`landscape ${w}x${h}: no console errors`, errs.length === 0, JSON.stringify(errs));
  });
}

// Portrait check
await withPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, async (page) => {
  await forceCoarse(page);
  await page.goto(BASE + '/hatake-nikki/index.html');
  await page.waitForFunction(() => document.body.classList.contains('pono-game-ready'), null, { timeout: 10000 });
  const visible = await page.locator('#landscape-notice').isVisible();
  log('portrait 390x844: notice shown', visible === true, 'visible=' + visible);
});

// Degraded API: screen.orientation throws
await withPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }, async (page) => {
  await forceCoarse(page);
  await page.addInitScript(() => {
    Object.defineProperty(window.screen, 'orientation', {
      get() { throw new Error('simulated orientation access failure'); },
      configurable: true
    });
  });
  await page.goto(BASE + '/hatake-nikki/index.html');
  await page.waitForFunction(() => document.body.classList.contains('pono-game-ready'), null, { timeout: 10000 });
  const visible = await page.locator('#landscape-notice').isVisible();
  log('degraded (orientation getter throws) landscape: notice hidden (fail-open via try/catch)', !visible, 'visible=' + visible);
});

// Degraded: matchMedia throws entirely
await withPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }, async (page) => {
  await page.addInitScript(() => {
    window.matchMedia = () => { throw new Error('simulated matchMedia failure'); };
  });
  await page.goto(BASE + '/hatake-nikki/index.html');
  await page.waitForFunction(() => document.body.classList.contains('pono-game-ready'), null, { timeout: 10000 }).catch(()=>{});
  const visible = await page.locator('#landscape-notice').isVisible().catch(()=> 'ERROR');
  log('degraded (matchMedia throws) landscape: notice hidden / no crash', visible === false, 'visible=' + visible);
});

const failed = results.filter(r => !r.ok);
console.log('\n=== SUMMARY ===');
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('FAILURES:', failed.map(f => f.name));
  process.exit(1);
}
