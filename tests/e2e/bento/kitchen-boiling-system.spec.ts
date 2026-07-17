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
  const sceneBox = await page.locator('#workshop-scene').boundingBox();
  const saltBox = await page.locator('#workshop-boil-salt').boundingBox();
  if (!sceneBox || !saltBox) throw new Error('boil scene and salt shaker must be visible');
  await page.mouse.move(saltBox.x + saltBox.width / 2, saltBox.y + saltBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sceneBox.x + sceneBox.width * .5, sceneBox.y + sceneBox.height * .4, { steps: 4 });
  await page.mouse.move(sceneBox.x + sceneBox.width * .5, sceneBox.y + sceneBox.height * .3, { steps: 2 });
  await page.mouse.move(sceneBox.x + sceneBox.width * .5, sceneBox.y + sceneBox.height * .5, { steps: 2 });
  await page.mouse.move(sceneBox.x + sceneBox.width * .5, sceneBox.y + sceneBox.height * .3, { steps: 2 });
  await page.mouse.up();
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

test('edamame pods wash, take salt, mix separately, and enter boiling water one by one', async ({ page }) => {
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
  const prepBox = await prepScene.boundingBox();
  if (!prepBox) throw new Error('edamame prep scene must be visible');
  await prepScene.press('Enter');
  await prepScene.press('Enter');
  await prepScene.press('Enter');
  await page.waitForTimeout(500);
  await expect(page.locator('#workshop-instruction')).toHaveText('しおを ぱらぱら かけよう');
  await page.locator('#workshop-edamame-salt').click();
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
});
