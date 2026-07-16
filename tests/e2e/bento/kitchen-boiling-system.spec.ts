import { expect, test } from '@playwright/test';

test('broccoli uses the shared pot, slotted spoon and draining bowl', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    (window as Window & { __APP_BUILD__?: number }).__APP_BUILD__ = 1;
  });
  await page.goto('/bento/kitchen.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#mode-cook-btn').click({ force: true });
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'fridge');
  await page.waitForTimeout(360);
  await page.locator('[data-recipe-id="broccoli"]').evaluate((element: HTMLElement) => element.click());
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'workshop');

  for (const name of ['ブロッコリー', 'しお']) await page.locator('.workshop-ingredient', { hasText: name }).click();
  await page.waitForTimeout(450);
  for (let i = 0; i < 3; i += 1) await page.locator('#workshop-scene').press('Enter');
  await page.waitForTimeout(450);
  for (let i = 0; i < 4; i += 1) await page.locator('#workshop-scene').press('Enter');
  await page.waitForTimeout(450);

  await expect(page.locator('#workshop-instruction')).toHaveText('しおゆで しよう');
  await expect(page.locator('#workshop-scene')).toHaveClass(/is-boil-step/);
  await expect(page.locator('#workshop-boil-pot')).toHaveAttribute('src', /boil_pot_cold\.png/);
  await expect(page.locator('#workshop-boil-food')).toHaveAttribute('src', /boil_broccoli_raw\.png/);
  await page.locator('#workshop-scene').press('Enter');
  await page.locator('#workshop-scene').press('Enter');
  await expect(page.locator('#workshop-boil-pot')).toHaveAttribute('src', /boil_pot_hot\.png/);
  await expect(page.locator('#workshop-boil-food')).toHaveAttribute('src', /boil_broccoli_cooked\.png/);
  await page.locator('#workshop-scene').press('Enter');
  await page.waitForTimeout(450);

  await expect(page.locator('#workshop-instruction')).toHaveText('おゆを きろう');
  await expect(page.locator('#workshop-boil-game')).toHaveClass(/is-drain/);
  await expect(page.locator('#workshop-boil-spoon')).toHaveAttribute('src', /boil_spoon\.png/);
  await expect(page.locator('#workshop-boil-bowl')).toHaveAttribute('src', /boil_drain_bowl\.png/);
});
