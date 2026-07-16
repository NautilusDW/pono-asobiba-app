import { expect, test } from '@playwright/test';

async function openCookMenu(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    (window as Window & { __APP_BUILD__?: number }).__APP_BUILD__ = 1;
    localStorage.setItem('bentoUnlockedIngredients', JSON.stringify(['carrot', 'green_bean', 'potato', 'mince_patty', 'onion']));
    localStorage.setItem('bentoUnlockedRecipes', JSON.stringify(['ninjin_ingen', 'kinpira', 'korokke', 'meatball']));
  });
  await page.goto('/bento/kitchen.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#mode-cook-btn').click({ force: true });
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'fridge');
}

test('ninjin ingen pieces spread and move when the spatula is dragged', async ({ page }) => {
  await openCookMenu(page);
  await page.locator('.recipe-card[data-recipe-id="ninjin_ingen"]').click({ force: true });
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'grill');
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __bentoState?: { cookPreheated?: boolean } }).__bentoState?.cookPreheated))).toBe(true);

  const tray = page.locator('#stir-fry-tray-pieces');
  await expect(tray.locator('img')).toHaveCount(7);
  await tray.dragTo(page.locator('.grill-pan'), { force: true });
  await expect.poll(() => page.evaluate(() => (window as Window & { __bentoState?: { stirFryPhase?: string; stirFryPieces?: unknown[] } }).__bentoState && ({
    phase: (window as Window & { __bentoState?: { stirFryPhase?: string } }).__bentoState?.stirFryPhase,
    pieces: (window as Window & { __bentoState?: { stirFryPieces?: unknown[] } }).__bentoState?.stirFryPieces?.length,
  }))).toEqual({ phase: 'green_bean', pieces: 9 });
  await expect(tray.locator('img').first()).toHaveAttribute('src', /green_bean_piece_/);
  await expect.poll(() => page.evaluate(() => !(window as Window & { __bentoState?: { stirFryPieces?: Array<{ image?: HTMLImageElement }> } }).__bentoState?.stirFryPieces?.some(piece => piece.image?.src.includes('green_bean_piece_')))).toBe(true);
  await tray.dragTo(page.locator('.grill-pan'), { force: true });
  await expect(page.locator('#grill-stage')).toHaveClass(/stir-fry-active/);
  await expect.poll(() => page.evaluate(() => (window as Window & { __bentoState?: { stirFryPieces?: unknown[] } }).__bentoState?.stirFryPieces?.length || 0)).toBe(18);

  const canvas = page.locator('#stir-fry-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await expect.poll(() => page.evaluate(({ x, y }) => (document.elementFromPoint(x, y) as HTMLElement | null)?.id || '', {
    x: box.x + box.width * .5,
    y: box.y + box.height * .5,
  })).toBe('stir-fry-canvas');
  await page.mouse.move(box.x + box.width * .2, box.y + box.height * .5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .75, box.y + box.height * .5, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => {
    const state = (window as Window & { __bentoState?: { stirFryDistance?: number; stirFryMoved?: Set<number> } }).__bentoState;
    return { distance: Math.round(state?.stirFryDistance || 0), moved: state?.stirFryMoved?.size || 0 };
  })).toMatchObject({ distance: expect.any(Number), moved: expect.any(Number) });
  const moved = await page.evaluate(() => (window as Window & { __bentoState?: { stirFryMoved?: Set<number> } }).__bentoState?.stirFryMoved?.size || 0);
  expect(moved).toBeGreaterThan(0);
  await canvas.focus();
  for (let i = 0; i < 5; i += 1) await canvas.press('Space');
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __bentoState?: { cookServed?: boolean } }).__bentoState?.cookServed))).toBe(true);
});

for (const recipeId of ['ninjin_ingen', 'kinpira']) {
  test(`${recipeId} keeps its selected carrot result`, async ({ page }) => {
    await openCookMenu(page);
    await page.locator(`.recipe-card[data-recipe-id="${recipeId}"]`).click({ force: true });
    await expect.poll(() => page.evaluate(() => {
      const state = (window as Window & { __bentoState?: Record<string, unknown> }).__bentoState!;
      return { recipe: state.activeRecipeId, ingredient: (state.current as { id?: string })?.id, action: state.actionIndex };
    })).toEqual({ recipe: recipeId, ingredient: 'carrot', action: 1 });
    await expect(page.locator('#grilling-food')).toHaveAttribute('src', recipeId === 'ninjin_ingen'
      ? /ninjin_ingen\/cutting\/carrot_pieces\.png/
      : /carrot\/carrot_pieces_mid\.png/);
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
