// Verify the fix: load the LOCAL quizland/index.html via file:// and check stage-pono z-index.
// Since CSS-only change, we can confirm with computed style + element stack.
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  // Serve the local file via file:// — but assets/ relative paths won't resolve to staging.
  // We just need to verify the CSS change is parsed and stage-pono shows above .body.
  const url = 'file:///' + path.resolve('quizland/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const result = await page.evaluate(() => {
    const stagePono = document.getElementById('stage-pono');
    if (!stagePono) return { err: 'no stage-pono' };
    const cs = getComputedStyle(stagePono);
    const r = stagePono.getBoundingClientRect();
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const stack = document.elementsFromPoint(cx, cy).slice(0, 5).map((el) => ({
      tag: el.tagName,
      id: el.id,
      cls: typeof el.className === 'string' ? el.className.slice(0, 60) : '',
      z: getComputedStyle(el).zIndex,
    }));
    return {
      bodyClasses: document.body.className,
      stagePonoZ: cs.zIndex,
      stagePonoDisplay: cs.display,
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      atCenter: { x: cx, y: cy, stack },
    };
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
