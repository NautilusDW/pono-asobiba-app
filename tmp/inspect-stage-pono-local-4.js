const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file:///' + path.resolve('quizland/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Move stagePono to a known visible location, hide overlays, then check stack.
  const result = await page.evaluate(() => {
    document.querySelectorAll('.start-screen, .overlay, #qz-debug-nav').forEach((el) => el.remove());

    const sp = document.getElementById('stage-pono');
    // Now check the actual rect and what's at center
    const r = sp.getBoundingClientRect();
    // Force img to have a placeholder size so the box is visible
    const img = document.getElementById('stage-pono-img');
    img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>';

    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const stack = document.elementsFromPoint(cx, cy).slice(0, 8).map((el) => ({
      tag: el.tagName, id: el.id, cls: typeof el.className === 'string' ? el.className.slice(0, 60) : '',
      z: getComputedStyle(el).zIndex, position: getComputedStyle(el).position,
    }));
    return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, stack, spZ: getComputedStyle(sp).zIndex };
  });
  console.log(JSON.stringify(result, null, 2));

  await page.screenshot({ path: 'tmp/stage-pono-screenshot-fixed.png', clip: { x: 0, y: 600, width: 400, height: 200 } });
  await browser.close();
})();
