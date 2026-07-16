import { expect, test } from '@playwright/test';

async function openCookMenu(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    (window as Window & { __APP_BUILD__?: number }).__APP_BUILD__ = 1;
    localStorage.setItem('bentoUnlockedIngredients', JSON.stringify(['carrot', 'potato', 'mince_patty', 'onion']));
    localStorage.setItem('bentoUnlockedRecipes', JSON.stringify(['ninjin_ingen', 'kinpira', 'korokke', 'meatball']));
  });
  await page.goto('/bento/kitchen.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#mode-cook-btn').click({ force: true });
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'fridge');
}

for (const recipeId of ['ninjin_ingen', 'kinpira']) {
  test(`${recipeId} keeps its selected carrot result`, async ({ page }) => {
    await openCookMenu(page);
    await page.locator(`.recipe-card[data-recipe-id="${recipeId}"]`).click({ force: true });
    await expect.poll(() => page.evaluate(() => {
      const state = (window as Window & { __bentoState?: Record<string, unknown> }).__bentoState!;
      return { recipe: state.activeRecipeId, ingredient: (state.current as { id?: string })?.id, action: state.actionIndex };
    })).toEqual({ recipe: recipeId, ingredient: 'carrot', action: 1 });
    await expect(page.locator('#grilling-food')).toHaveAttribute('src', /carrot\/carrot_pieces_mid\.png/);
  });
}

test('korokke recipe starts from cutting potato', async ({ page }) => {
  await openCookMenu(page);
  await page.locator('.recipe-card[data-recipe-id="korokke"]').click({ force: true });
  await expect.poll(() => page.evaluate(() => {
    const state = (window as Window & { __bentoState?: Record<string, unknown> }).__bentoState!;
    return { recipe: state.activeRecipeId, ingredient: (state.current as { id?: string })?.id, action: state.actionIndex };
  })).toEqual({ recipe: 'korokke', ingredient: 'potato', action: 0 });
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'chop');
});

test('phase 1 recipe cards use current bento completion art', async ({ page }) => {
  await openCookMenu(page);
  await expect(page.locator('.recipe-card[data-recipe-id="meatball"] .recipe-img'))
    .toHaveAttribute('src', '../assets/images/bento/cooking/meatball/meatball_003_done.png');
  await expect(page.locator('.recipe-card[data-recipe-id="yakizake"] .recipe-img'))
    .toHaveAttribute('src', '../assets/images/bento/cooking/salmon/salmon_half_003_done.png');
});
