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

  const result = await page.evaluate(() => {
    const ss = document.getElementById('start-screen');
    if (ss) ss.style.display = 'none';
    const stagePono = document.getElementById('stage-pono');
    const r = stagePono.getBoundingClientRect();
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const stack = document.elementsFromPoint(cx, cy).slice(0, 5).map((el) => ({
      tag: el.tagName, id: el.id, cls: typeof el.className === 'string' ? el.className.slice(0, 60) : '', z: getComputedStyle(el).zIndex,
    }));
    return { stack, z: getComputedStyle(stagePono).zIndex };
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
