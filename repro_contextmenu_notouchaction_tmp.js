const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.setContent('<div id="target" style="width:300px;height:300px;background:red;"></div>');
  await page.evaluate(() => {
    window.__fired = 0;
    document.addEventListener('contextmenu', () => { window.__fired++; console.log('CTX FIRED'); }, true);
  });
  const box = await page.locator('#target').boundingBox();
  const cx = box.x + box.width/2, cy = box.y + box.height/2;
  const client = await context.newCDPSession(page);

  console.log('--- Test A: no touch-action set (default auto) ---');
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{x: cx, y: cy, id: 1}] });
  await page.waitForTimeout(1000);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(200);
  console.log('fired (touch-action:auto):', await page.evaluate(() => window.__fired));

  await page.evaluate(() => { window.__fired = 0; document.getElementById('target').style.touchAction = 'none'; });
  console.log('--- Test B: touch-action:none on target ---');
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{x: cx, y: cy, id: 2}] });
  await page.waitForTimeout(1000);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(200);
  console.log('fired (touch-action:none):', await page.evaluate(() => window.__fired));

  await browser.close();
})();
