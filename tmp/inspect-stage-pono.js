// Headless inspection of #stage-pono on the staging quizland.
// Usage: node tmp/inspect-stage-pono.js
const { chromium } = require('playwright');

(async () => {
  const url = 'https://pono-asobiba-staging.ndw.workers.dev/quizland/?debug=all';
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  const consoleLogs = [];
  page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  const failed = [];
  page.on('requestfailed', (req) => failed.push(`${req.failure()?.errorText} ${req.url()}`));
  const status404 = [];
  page.on('response', (res) => {
    if (res.status() >= 400) status404.push(`${res.status()} ${res.url()}`);
  });

  console.log('Loading', url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

  // Try to start a quiz so loadQuestion fires (which triggers startStagePono).
  // The title screen has category buttons; we want to click the first non-trivia category.
  const categoryButtons = await page.$$('[data-cat]');
  console.log('Found data-cat buttons:', categoryButtons.length);

  // Click the first non-trivia category if possible
  let entered = false;
  for (const btn of categoryButtons) {
    const cat = await btn.getAttribute('data-cat');
    if (cat && cat !== 'trivia') {
      console.log('Clicking category:', cat);
      await btn.click();
      entered = true;
      break;
    }
  }
  if (!entered && categoryButtons.length) {
    console.log('Falling back: clicking first category');
    await categoryButtons[0].click();
    entered = true;
  }

  // Wait for #stage-pono-img to have a src OR 5s
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    const el = document.getElementById('stage-pono');
    const img = document.getElementById('stage-pono-img');
    const out = {
      bodyClasses: document.body.className,
      stagePonoExists: !!el,
      imgExists: !!img,
    };
    if (el) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      out.computed = {
        display: cs.display,
        position: cs.position,
        left: cs.left,
        bottom: cs.bottom,
        width: cs.width,
        height: cs.height,
        visibility: cs.visibility,
        opacity: cs.opacity,
        zIndex: cs.zIndex,
      };
      out.rect = { x: r.x, y: r.y, width: r.width, height: r.height };
      // Parent positioning ancestor
      let p = el.parentElement;
      const chain = [];
      while (p) {
        const pcs = getComputedStyle(p);
        chain.push({
          tag: p.tagName,
          id: p.id || '',
          cls: p.className || '',
          position: pcs.position,
          display: pcs.display,
          overflow: pcs.overflow,
        });
        if (chain.length > 6) break;
        p = p.parentElement;
      }
      out.ancestors = chain;
    }
    if (img) {
      out.imgSrc = img.src;
      out.imgComplete = img.complete;
      out.imgNaturalW = img.naturalWidth;
      out.imgNaturalH = img.naturalHeight;
      const cs = getComputedStyle(img);
      out.imgComputed = {
        display: cs.display,
        width: cs.width,
        height: cs.height,
        opacity: cs.opacity,
      };
    }
    out.stagePonoStarted = (typeof window._stagePonoStarted !== 'undefined') ? window._stagePonoStarted : 'n/a (local var)';
    return out;
  });

  console.log('--- INSPECTION RESULT ---');
  console.log(JSON.stringify(result, null, 2));

  // Probe image asset directly
  const probeUrl = 'https://pono-asobiba-staging.ndw.workers.dev/assets/images/characters/pono/dance/think_video/think_v_01.png';
  const probe = await page.evaluate(async (u) => {
    try {
      const res = await fetch(u, { cache: 'no-store' });
      return { status: res.status, ct: res.headers.get('content-type') };
    } catch (e) {
      return { error: String(e) };
    }
  }, probeUrl);
  console.log('Image probe:', probeUrl, probe);

  await page.screenshot({ path: 'tmp/stage-pono-screenshot.png', fullPage: false });

  if (consoleLogs.length) {
    console.log('--- CONSOLE LOGS (last 20) ---');
    consoleLogs.slice(-20).forEach((l) => console.log(l));
  }
  if (failed.length) {
    console.log('--- FAILED REQUESTS ---');
    failed.forEach((l) => console.log(l));
  }
  if (status404.length) {
    console.log('--- HTTP >=400 ---');
    status404.forEach((l) => console.log(l));
  }

  await browser.close();
})();
