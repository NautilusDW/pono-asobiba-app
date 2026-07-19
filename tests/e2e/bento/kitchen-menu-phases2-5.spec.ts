import { expect, test } from '@playwright/test';

async function openWorkshop(page: import('@playwright/test').Page, recipeId: string) {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    (window as Window & { __APP_BUILD__?: number }).__APP_BUILD__ = 1;
  });
  await page.goto('/bento/kitchen.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#mode-cook-btn').click({ force: true });
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'fridge');
  await page.waitForTimeout(360);
  await page.locator(`.recipe-card[data-recipe-id="${recipeId}"]`).evaluate((element: HTMLElement) => element.click());
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'workshop');
}

test('all phases 2-5 standard cards are available', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    (window as Window & { __APP_BUILD__?: number }).__APP_BUILD__ = 1;
  });
  await page.goto('/bento/kitchen.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#mode-cook-btn').click({ force: true });
  const ids = [
    'tomato', 'broccoli', 'edamame', 'ichigo', 'mikan', 'ringo', 'kiwi', 'melon',
    'tamagoyaki', 'potato_salad', 'corn_spinach', 'napolitan', 'pineapple', 'momo',
    'gyoza', 'harumaki', 'bacon_maki', 'rice_ume', 'rice_goma', 'rice_furikake',
  ];
  await expect(page.locator('.recipe-card')).toHaveCount(31);
  for (const id of ids) {
    await expect(page.locator(`.recipe-card[data-recipe-id="${id}"].unlocked`)).toHaveCount(1);
  }
});

test('tomato completes its full choose, wash, trim and serve route', async ({ page }) => {
  await openWorkshop(page, 'tomato');
  await page.locator('.workshop-ingredient', { hasText: 'プチトマト' }).click();
  await expect(page.locator('#workshop-instruction')).toHaveText('みずで やさしく あらおう');
  for (let step = 0; step < 3; step += 1) {
    const count = step === 0 ? 3 : 2;
    for (let i = 0; i < count; i += 1) await page.locator('#workshop-scene').press('Enter');
    if (step < 2) await page.waitForTimeout(460);
  }
  await expect(page.locator('#workshop-finish')).toHaveClass(/show/);
  await expect(page.locator('#workshop-finish-label')).toHaveText('プチトマト できあがり！');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('bentoUnlockedRecipes') || '[]')))
    .toContain('tomato');
});

test('drag cooking works and keyboard remains available', async ({ page }) => {
  await openWorkshop(page, 'mikan');
  await page.locator('.workshop-ingredient', { hasText: 'みかん' }).click();
  await expect(page.locator('#workshop-instruction')).toHaveText('かわを むこう');
  const box = await page.locator('#workshop-scene').boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + 90, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width - 90, box!.y + box!.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => Number((await page.locator('#workshop-meter-fill').getAttribute('style'))?.match(/[\d.]+/)?.[0] || 0)).toBeGreaterThan(0);
  while ((await page.locator('#workshop-instruction').textContent()) === 'かわを むこう') {
    await page.locator('#workshop-scene').press('Enter');
    await page.waitForTimeout(30);
  }
  await expect(page.locator('#workshop-instruction')).toHaveText('ふさに わけよう');
});
