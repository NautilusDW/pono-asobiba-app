import { expect, test } from '@playwright/test';

test('broccoli is prepped first, then boils with particles on the stove', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => {
    (window as Window & { __APP_BUILD__?: number }).__APP_BUILD__ = 1;
  });
  await page.goto('/bento/kitchen.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#mode-prep-btn').click({ force: true });
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'select');
  await page.locator('.ingredient-btn[data-id="broccoli"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'chop');
  await expect(page.locator('#ingredient-on-board img')).toHaveAttribute('src', /boil_broccoli_whole\.png/);
  for (let i = 0; i < 5; i += 1) {
    await page.locator('#cutting-board').click({ force: true });
    await page.waitForTimeout(320);
  }
  await page.waitForTimeout(1500);
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'fridge');
  await page.waitForTimeout(360);
  await page.locator('[data-recipe-id="broccoli"]').evaluate((element: HTMLElement) => element.click());
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'workshop');

  await expect(page.locator('#workshop-instruction')).toHaveText('コンロの ひを つけよう');
  await expect(page.locator('#workshop-scene')).toHaveClass(/is-boil-step/);
  await expect(page.locator('#workshop-boil-pot')).toHaveAttribute('src', /boil_pot_cold\.png/);
  await page.locator('#workshop-scene').press('Enter');
  await page.waitForTimeout(450);
  await expect(page.locator('#workshop-boil-game')).toHaveClass(/is-heat-on/);
  await expect(page.locator('#workshop-instruction')).toHaveText('しおを いれよう');
  await expect(page.locator('#workshop-boil-salt')).toHaveAttribute('src', /salt_shaker_still\.png/);
  for (let i = 0; i < 3; i += 1) await page.locator('#workshop-scene').press('Enter');
  await page.waitForTimeout(450);
  await expect(page.locator('#workshop-instruction')).toHaveText('おゆが わくまで まとう');
  await page.waitForTimeout(2100);
  await expect(page.locator('#workshop-instruction')).toHaveText('こぶさを 1こずつ おなべに いれよう');
  await expect(page.locator('#workshop-boil-game')).toHaveClass(/is-boiling/);
  await expect(page.locator('.workshop-boil-bubbles')).toHaveCSS('opacity', '1');
  await expect(page.locator('#workshop-boil-food')).toBeHidden();
  for (let i = 1; i <= 5; i += 1) {
    await page.locator('.workshop-boil-piece:not(.is-in-pot)').first().click();
    await expect(page.locator('.workshop-boil-piece.is-in-pot')).toHaveCount(i);
  }
  await expect(page.locator('#workshop-hint')).toContainText('ぜんぶ はいったよ');
  await expect(page.locator('#workshop-boil-pot')).toHaveAttribute('src', /boil_pot_cold\.png/);
  await page.waitForTimeout(450);

  await expect(page.locator('#workshop-instruction')).toHaveText('おゆを きろう');
  await expect(page.locator('#workshop-boil-game')).toHaveClass(/is-drain/);
  await expect(page.locator('#workshop-boil-spoon')).toHaveAttribute('src', /boil_spoon\.png/);
  await expect(page.locator('#workshop-boil-bowl')).toHaveAttribute('src', /boil_drain_bowl\.png/);
});
