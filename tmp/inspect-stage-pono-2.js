const { chromium } = require('playwright');

(async () => {
  const url = 'https://pono-asobiba-staging.ndw.workers.dev/quizland/?debug=all';
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    const stagePono = document.getElementById('stage-pono');
    const safeArea = document.querySelector('.safe-area');
    const body = document.querySelector('.safe-area > .body');
    const stage = document.getElementById('stage');
    const out = {};

    function info(name, el) {
      if (!el) { out[name] = 'NOT FOUND'; return; }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      out[name] = {
        rect: { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom },
        position: cs.position,
        zIndex: cs.zIndex,
        display: cs.display,
        overflow: cs.overflow,
      };
    }
    info('stage', stage);
    info('safe-area', safeArea);
    info('body', body);
    info('stage-pono', stagePono);

    // Element at the location where stage-pono SHOULD be (left+30, bottom-30)
    if (stagePono) {
      const r = stagePono.getBoundingClientRect();
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      const stack = document.elementsFromPoint(cx, cy).slice(0, 8).map((el) => ({
        tag: el.tagName,
        id: el.id,
        cls: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
        z: getComputedStyle(el).zIndex,
        pe: getComputedStyle(el).pointerEvents,
      }));
      out.stackAtCenter = { x: cx, y: cy, stack };
    }
    return out;
  });
  console.log(JSON.stringify(result, null, 2));

  await page.screenshot({ path: 'tmp/stage-pono-screenshot-2.png', fullPage: false });
  // Crop screenshot to the bottom-left to see if pono is there
  await browser.close();
})();
