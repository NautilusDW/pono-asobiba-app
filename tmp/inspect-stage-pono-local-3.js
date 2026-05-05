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
    const csSp = getComputedStyle(stagePono);
    const csBody = getComputedStyle(document.querySelector('.safe-area > .body'));

    // Walk up from stagePono and from .body and find divergent ancestor.
    function chain(el) {
      const arr = [];
      while (el && el !== document.documentElement) {
        const cs = getComputedStyle(el);
        arr.push({
          tag: el.tagName, id: el.id, cls: typeof el.className === 'string' ? el.className.slice(0, 60) : '',
          position: cs.position, zIndex: cs.zIndex, isolation: cs.isolation, transform: cs.transform,
          opacity: cs.opacity, filter: cs.filter, willChange: cs.willChange, mixBlendMode: cs.mixBlendMode,
        });
        el = el.parentElement;
      }
      return arr;
    }
    return {
      stagePono: { position: csSp.position, zIndex: csSp.zIndex, filter: csSp.filter, opacity: csSp.opacity, transform: csSp.transform },
      bodyEl: { position: csBody.position, zIndex: csBody.zIndex },
      stagePonoChain: chain(stagePono),
    };
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
