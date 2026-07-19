import { expect, test } from '@playwright/test';

const viewports = [
  { width: 390, height: 844, name: 'portrait' },
  { width: 844, height: 390, name: 'landscape' },
  { width: 1024, height: 768, name: 'tablet' },
  { width: 1366, height: 768, name: 'desktop' },
];

for (const viewport of viewports) {
  test(`ingredient cards stay readable in vertical carousel at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript(() => {
      (window as Window & { __APP_BUILD__?: number }).__APP_BUILD__ = 1;
    });
    await page.goto('/bento/kitchen.html', { waitUntil: 'domcontentloaded' });

    if (viewport.name === 'portrait') {
      const orientationMessage = await page.locator('body').evaluate((element) => getComputedStyle(element, '::before').content);
      expect(orientationMessage).toContain('よこむきに してね');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      return;
    }

    await page.locator('#mode-prep-btn').click({ force: true });
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'select');

    const carousel = page.locator('#ingredient-bar');
    const rows = carousel.locator('.ingredient-carousel-row');
    const cards = carousel.locator('.ingredient-btn');
    const stageBox = await page.locator('.select-stage').boundingBox();
    expect(stageBox).not.toBeNull();
    expect(stageBox!.width / stageBox!.height).toBeGreaterThan(1.55);
    expect(stageBox!.width / stageBox!.height).toBeLessThan(1.65);
    await expect(rows).not.toHaveCount(0);
    expect(await rows.count()).toBeGreaterThan(3);
    expect(await cards.count()).toBeGreaterThan(9);
    await expect(rows.first().locator('.ingredient-btn')).toHaveCount(3);

    const firstNames = await rows.first().locator('.ingredient-name').allTextContents();
    expect(firstNames).toHaveLength(3);
    expect(firstNames.every((name) => name.trim().length > 0)).toBeTruthy();
    await expect(rows.first().locator('.ingredient-name').first()).toBeVisible();
    const artWidth = await rows.first().locator('.ingredient-art').first().evaluate((element) => element.getBoundingClientRect().width);
    expect(artWidth).toBeLessThanOrEqual(121);

    const backdropFilter = await page.locator('.select-stage').evaluate((element) => getComputedStyle(element, '::before').filter);
    expect(backdropFilter).toContain('blur(4px)');
    expect(backdropFilter).toContain('brightness(0.52)');

    const before = await carousel.evaluate((element) => element.scrollTop);
    await carousel.evaluate((element) => element.scrollBy({ top: 240, behavior: 'auto' }));
    await page.waitForTimeout(350);
    const after = await carousel.evaluate((element) => element.scrollTop);
    expect(after).toBeGreaterThan(before + 100);
    await expect(rows.nth(1).locator('.ingredient-name').first()).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
