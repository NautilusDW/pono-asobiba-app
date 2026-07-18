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
  await expect(page.locator('.workshop-boil-flame')).toHaveClass(/heat-glow/);
  const visibleFlameOpacity = await page.locator('.workshop-boil-flame').evaluate((element) => parseFloat(getComputedStyle(element).opacity));
  expect(visibleFlameOpacity).toBeGreaterThan(.5);
  const flameMatchesExisting = await page.locator('.workshop-boil-flame').evaluate((element) => {
    const existing = document.querySelector('#grill-stage .heat-glow');
    if (!existing) return false;
    const flame = getComputedStyle(element);
    const base = getComputedStyle(existing);
    const flameTongue = getComputedStyle(element, '::before');
    const baseTongue = getComputedStyle(existing, '::before');
    return flame.backgroundImage === base.backgroundImage
      && flameTongue.backgroundImage === baseTongue.backgroundImage
      && flameTongue.content === baseTongue.content;
  });
  expect(flameMatchesExisting).toBe(true);
  await expect(page.locator('#workshop-instruction')).toHaveText('しおを いれよう');
  await expect(page.locator('#workshop-boil-salt')).toHaveAttribute('src', /salt_shaker_still\.png/);
  const sceneBox = await page.locator('#workshop-scene').boundingBox();
  const saltBox = await page.locator('#workshop-boil-salt').boundingBox();
  if (!sceneBox || !saltBox) throw new Error('boil scene and salt shaker must be visible');
  await page.mouse.move(saltBox.x + saltBox.width / 2, saltBox.y + saltBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sceneBox.x + sceneBox.width * .68, sceneBox.y + sceneBox.height * .28, { steps: 4 });
  await page.mouse.move(sceneBox.x + sceneBox.width * .68, sceneBox.y + sceneBox.height * .14, { steps: 2 });
  await page.mouse.move(sceneBox.x + sceneBox.width * .68, sceneBox.y + sceneBox.height * .3, { steps: 2 });
  await page.mouse.move(sceneBox.x + sceneBox.width * .68, sceneBox.y + sceneBox.height * .14, { steps: 2 });
  await page.mouse.up();
  const saltVectors = await page.locator('.workshop-boil-salt-particle').evaluateAll((particles) => particles.map((particle) => {
    const style = (particle as HTMLElement).style;
    return { dx: parseFloat(style.getPropertyValue('--salt-dx')), dy: parseFloat(style.getPropertyValue('--salt-dy')) };
  }));
  expect(saltVectors.length).toBeGreaterThan(0);
  expect(saltVectors.every((vector) => vector.dx < 0 && vector.dy > 0)).toBe(true);
  await page.waitForTimeout(450);
  await expect(page.locator('#workshop-instruction')).toHaveText('おゆが わくまで まとう');
  await page.waitForTimeout(2100);
  await expect(page.locator('#workshop-instruction')).toHaveText('こぶさを 1こずつ おなべに いれよう');
  await expect(page.locator('#workshop-boil-game')).toHaveClass(/is-boiling/);
  await expect(page.locator('.workshop-boil-bubbles')).toHaveCSS('opacity', '1');
  await expect(page.locator('#workshop-boil-food')).toBeHidden();
  const boilSceneBounds = await page.locator('#workshop-scene').boundingBox();
  const potBounds = await page.locator('#workshop-boil-pot').boundingBox();
  const plateBounds = await page.locator('.workshop-boil-plate').boundingBox();
  const waterBounds = await page.locator('#workshop-boil-water-mask').boundingBox();
  const rippleRatio = await page.locator('.workshop-boil-bubbles').evaluate((element) => {
    const style = getComputedStyle(element, '::before');
    return parseFloat(style.width) / parseFloat(style.height);
  });
  const bankBounds = await page.locator('.workshop-boil-piece:not(.is-in-pot)').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  }));
  if (!boilSceneBounds || !potBounds || !plateBounds || !waterBounds) throw new Error('boil layout must be measurable');
  expect(potBounds.y + potBounds.height).toBeLessThanOrEqual(boilSceneBounds.y + boilSceneBounds.height - 8);
  expect(Math.abs(waterBounds.width / waterBounds.height - rippleRatio)).toBeLessThan(.08);
  for (const bounds of bankBounds) {
    expect(bounds.left).toBeGreaterThanOrEqual(plateBounds.x);
    expect(bounds.right).toBeLessThanOrEqual(plateBounds.x + plateBounds.width);
    expect(bounds.top).toBeGreaterThanOrEqual(plateBounds.y);
    expect(bounds.bottom).toBeLessThanOrEqual(plateBounds.y + plateBounds.height);
  }
  for (let i = 1; i <= 5; i += 1) {
    await page.locator('.workshop-boil-piece:not(.is-in-pot)').first().click();
    await expect(page.locator('.workshop-boil-piece.is-in-pot')).toHaveCount(i);
    await expect(page.locator('#workshop-boil-water-mask .workshop-boil-piece.is-in-pot')).toHaveCount(i);
  }
  await expect(page.locator('#workshop-hint')).toContainText('ぜんぶ はいったよ');
  await expect(page.locator('#workshop-boil-pot')).toHaveAttribute('src', /boil_pot_cold\.png/);
  await page.waitForTimeout(500);
  await expect(page.locator('#workshop-instruction')).toHaveText('ぐつぐつ ゆでよう');
  await expect(page.locator('#workshop-boil-game')).toHaveClass(/is-boiling/);
  await page.waitForTimeout(3000);

  await expect(page.locator('#workshop-instruction')).toHaveText('あなあきおたまで おゆを きろう');
  await expect(page.locator('#workshop-boil-game')).toHaveClass(/is-drain/);
  await expect(page.locator('#workshop-boil-spoon')).toHaveAttribute('src', /boil_spoon\.png/);
  await expect(page.locator('#workshop-boil-bowl')).toHaveAttribute('src', /prep_plate\.png\?v=1353/);
  const drainSceneBox = await page.locator('#workshop-scene').boundingBox();
  let spoonBox = await page.locator('#workshop-boil-spoon').boundingBox();
  if (!drainSceneBox || !spoonBox) throw new Error('drain tools must be visible');
  await page.mouse.move(spoonBox.x + spoonBox.width / 2, spoonBox.y + spoonBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(drainSceneBox.x + drainSceneBox.width * .5, drainSceneBox.y + drainSceneBox.height * .4, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('#workshop-hint')).toContainText('ボウルへ はこぼう');
  spoonBox = await page.locator('#workshop-boil-spoon').boundingBox();
  if (!spoonBox) throw new Error('drain spoon must remain visible');
  await page.mouse.move(spoonBox.x + spoonBox.width / 2, spoonBox.y + spoonBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(drainSceneBox.x + drainSceneBox.width * .74, drainSceneBox.y + drainSceneBox.height * .72, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('#workshop-boil-food')).toHaveCSS('clip-path', 'none');
  await page.waitForTimeout(600);
  await expect(page.locator('#workshop-finish')).toHaveClass(/show/);
});

test('edamame pods take falling salt, mix separately, and enter boiling water one by one', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    (window as Window & { __APP_BUILD__?: number }).__APP_BUILD__ = 1;
  });
  await page.goto('/bento/kitchen.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#mode-prep-btn').click({ force: true });
  await page.locator('.ingredient-btn[data-id="edamame"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'workshop');
  await expect(page.locator('#workshop-scene')).toHaveClass(/is-edamame-prep/);
  await expect(page.locator('.workshop-edamame-pod')).toHaveCount(8);

  const prepScene = page.locator('#workshop-scene');
  await expect(page.locator('#workshop-instruction')).toHaveText('しおを ぱらぱら かけよう');
  await page.locator('#workshop-edamame-salt').click();
  await expect(page.locator('.workshop-edamame-salt-particle')).toHaveCount(20);
  await expect(page.locator('#workshop-edamame-settled i')).toHaveCount(12);
  await page.locator('#workshop-edamame-salt').click();
  await page.locator('#workshop-edamame-salt').click();
  await page.waitForTimeout(500);
  await expect(page.locator('#workshop-instruction')).toHaveText('しおで もみもみ しよう');
  await expect(page.locator('#workshop-edamame-prep')).toHaveClass(/has-salt/);
  await prepScene.press('Enter');
  await prepScene.press('Enter');
  await prepScene.press('Enter');
  await prepScene.press('Enter');
  await page.waitForTimeout(550);
  await expect(page.locator('#workshop-finish')).toHaveClass(/show/);
  await page.locator('#workshop-finish-btn').click();
  await page.waitForTimeout(420);
  await page.locator('[data-recipe-id="edamame"]').evaluate((element: HTMLElement) => element.click());
  await expect(page.locator('#workshop-instruction')).toHaveText('コンロの ひを つけよう');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'workshop');
  await prepScene.press('Enter');
  await page.waitForTimeout(500);
  await expect(page.locator('#workshop-instruction')).toHaveText('おゆが わくまで まとう');
  await page.waitForTimeout(2100);
  await expect(page.locator('#workshop-instruction')).toHaveText('さやを 1つずつ おなべに いれよう');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'workshop');
  await expect(prepScene).toBeVisible();
  await expect(page.locator('.workshop-boil-piece:not(.is-in-pot)')).toHaveCount(8);
  const edamamePlateBounds = await page.locator('.workshop-boil-plate').boundingBox();
  const edamameBankBounds = await page.locator('.workshop-boil-piece:not(.is-in-pot)').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  }));
  if (!edamamePlateBounds) throw new Error('edamame plate must be measurable');
  for (const bounds of edamameBankBounds) {
    expect(bounds.left).toBeGreaterThanOrEqual(edamamePlateBounds.x);
    expect(bounds.right).toBeLessThanOrEqual(edamamePlateBounds.x + edamamePlateBounds.width);
    expect(bounds.top).toBeGreaterThanOrEqual(edamamePlateBounds.y);
    expect(bounds.bottom).toBeLessThanOrEqual(edamamePlateBounds.y + edamamePlateBounds.height);
  }

  const firstPod = page.locator('.workshop-boil-piece:not(.is-in-pot)').first();
  const podBox = await firstPod.boundingBox();
  const boilBox = await prepScene.boundingBox();
  if (!podBox || !boilBox) throw new Error('pod and boiling scene must be visible');
  await page.mouse.move(podBox.x + podBox.width / 2, podBox.y + podBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(boilBox.x + boilBox.width * .5, boilBox.y + boilBox.height * .42, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.workshop-boil-piece.is-in-pot')).toHaveCount(1);
  await expect(page.locator('.workshop-boil-entry-effect')).toHaveCount(1);
  for (let count = 2; count <= 8; count += 1) {
    await page.locator('.workshop-boil-piece:not(.is-in-pot)').first().click();
    await expect(page.locator('.workshop-boil-piece.is-in-pot')).toHaveCount(count);
  }
  await expect(page.locator('#workshop-hint')).toContainText('ぜんぶ はいったよ');
  await page.waitForTimeout(500);
  await expect(page.locator('#workshop-instruction')).toHaveText('ぐつぐつ ゆでよう');
});
