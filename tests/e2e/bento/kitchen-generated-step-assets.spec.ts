import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

async function enterAppKitchen(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    (window as Window & { __APP_BUILD__?: number }).__APP_BUILD__ = 1;
    localStorage.clear();
  });
  await page.goto('/bento/kitchen.html', { waitUntil: 'domcontentloaded' });
}

test('fruit workshop changes from whole fruit to separated cut pieces on the board', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await enterAppKitchen(page);
  await page.locator('#mode-cook-btn').click({ force: true });
  await page.locator('.recipe-card[data-recipe-id="ichigo"]').evaluate((element: HTMLElement) => element.click());
  await page.locator('.workshop-ingredient', { hasText: 'いちご' }).evaluate((element: HTMLElement) => element.click());
  await page.waitForTimeout(460);
  await expect(page.locator('#workshop-food')).toHaveAttribute('src', /ichigo_whole\.png$/);

  for (let index = 0; index < 6; index += 1) {
    if ((await page.locator('#workshop-instruction').textContent()) !== 'みずで やさしく あらおう') break;
    await page.locator('#workshop-scene').dispatchEvent('keydown', { key: 'Enter' });
    await page.waitForTimeout(520);
  }
  await expect(page.locator('#workshop-instruction')).toHaveText('へたを とろう');
  for (let index = 0; index < 4; index += 1) {
    if ((await page.locator('#workshop-instruction').textContent()) !== 'へたを とろう') break;
    await page.locator('#workshop-scene').dispatchEvent('keydown', { key: 'Enter' });
    await page.waitForTimeout(520);
  }
  await expect(page.locator('#workshop-instruction')).toHaveText('たて はんぶんに きろう');
  await expect(page.locator('#workshop-scene')).toHaveClass(/is-cut-step/);
  await page.locator('#workshop-scene').dispatchEvent('keydown', { key: 'Enter' });
  await expect(page.locator('#workshop-food')).toHaveAttribute('src', /ichigo_cut\.png$/);
});

test('green beans can be chopped into individual pieces and stored', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await enterAppKitchen(page);
  await page.locator('#mode-prep-btn').click();
  await page.locator('.ingredient-btn[data-id="green_bean"]').click();
  await expect(page.locator('#ingredient-on-board')).toHaveAttribute('data-ingredient', 'green_bean');
  await page.waitForTimeout(520);

  for (let index = 0; index < 5; index += 1) {
    await page.locator('#cutting-board').press('Enter');
    await page.waitForTimeout(520);
  }
  await expect.poll(() => page.evaluate(() => (
    JSON.parse(localStorage.getItem('bentoUnlockedIngredients') || '[]') as string[]
  ))).toContain('green_bean');
});

test('kitchen layout editor targets develop-app and exposes the new ingredient scope', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await enterAppKitchen(page);
  const config = await page.evaluate(() => (window as Window & {
    EditorBootstrapConfig?: { ghBranch?: string; perQuestionSelectors?: string[] };
  }).EditorBootstrapConfig);
  expect(config?.ghBranch).toBe('develop-app');
  expect(config?.perQuestionSelectors).toEqual(expect.arrayContaining([
    '.ingredient-bbox-marker', '.startX-marker', '.endX-marker', '.chopY-marker',
  ]));

  await page.locator('#mode-prep-btn').click();
  await page.locator('.ingredient-btn[data-id="green_bean"]').click();
  await expect(page.locator('#ingredient-on-board')).toHaveAttribute('data-ingredient', 'green_bean');
  await expect.poll(() => page.evaluate(() => {
    const getter = (window as Window & { QUIZLAND_GET_CURRENT_QID?: () => string | null }).QUIZLAND_GET_CURRENT_QID;
    return getter ? getter() : null;
  })).toBe('green_bean');
  await expect.poll(() => page.locator('#ingredient-on-board').evaluate((element: HTMLElement) => (
    parseFloat(element.style.width)
  ))).toBeGreaterThan(60);
  await expect.poll(() => page.locator('#ingredient-on-board').evaluate((element: HTMLElement) => (
    parseFloat(element.style.width)
  ))).toBeLessThan(64);
  await expect.poll(() => page.evaluate(() => {
    const data = (window as Window & { _currentLayoutData?: Record<string, unknown> })._currentLayoutData;
    const board = document.querySelector<HTMLElement>('#cutting-board');
    return !!data?.['.startX-marker|0@green_bean'] && (board?.offsetWidth || 0) > 0;
  })).toBeTruthy();
  const markerAlignment = await page.evaluate(() => {
    const state = (window as Window & {
      __bentoState?: { current?: { chopMechanics?: { startX_pct: number; endX_pct: number } } };
      _currentLayoutData?: Record<string, { tx?: number }>;
    }).__bentoState;
    const data = (window as Window & { _currentLayoutData?: Record<string, { tx?: number }> })._currentLayoutData || {};
    const board = document.querySelector<HTMLElement>('#cutting-board');
    const width = board?.offsetWidth || 0;
    const startTx = data['.startX-marker|0@green_bean']?.tx || 0;
    const endTx = data['.endX-marker|0@green_bean']?.tx || 0;
    return {
      actualStart: state?.current?.chopMechanics?.startX_pct,
      actualEnd: state?.current?.chopMechanics?.endX_pct,
      expectedStart: 87 + 100 * (startTx + 12) / width,
      expectedEnd: 13 + 100 * (endTx + 12) / width,
    };
  });
  expect(markerAlignment.actualStart).toBeCloseTo(markerAlignment.expectedStart, 3);
  expect(markerAlignment.actualEnd).toBeCloseTo(markerAlignment.expectedEnd, 3);

  await page.evaluate(() => document.body.classList.add('layout-editor-on'));
  await page.waitForTimeout(120);
  const visibleStartX = await page.locator('#startX-marker').evaluate((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const board = document.querySelector<HTMLElement>('#cutting-board')!.getBoundingClientRect();
    return {
      pct: ((rect.left + rect.width / 2 - board.left) / board.width) * 100,
      left: element.style.left,
      transform: element.style.transform,
      rectLeft: rect.left,
      rectWidth: rect.width,
      boardLeft: board.left,
      boardWidth: board.width,
      boardOffsetWidth: document.querySelector<HTMLElement>('#cutting-board')!.offsetWidth,
    };
  });
  await page.evaluate(() => document.body.classList.remove('layout-editor-on'));
  await page.waitForTimeout(120);
  await page.locator('#cutting-board').press('Enter');
  await page.waitForTimeout(115);
  const firstBladeX = await page.locator('#knife').evaluate((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const board = document.querySelector<HTMLElement>('#cutting-board')!.getBoundingClientRect();
    return ((rect.left + rect.width * 0.108 - board.left) / board.width) * 100;
  });
  expect(Math.abs(firstBladeX - visibleStartX.pct)).toBeLessThan(0.3);
});

test('all newly added cutting and fruit assets are available', async ({ request }) => {
  const fruitIds = ['ichigo', 'mikan', 'ringo', 'kiwi', 'melon', 'pineapple', 'momo'];
  const paths = fruitIds.flatMap((id) => [
    `/assets/images/bento/cooking/workshop/fruit/${id}_whole.png`,
    `/assets/images/bento/cooking/workshop/fruit/${id}_cut.png`,
  ]).concat([
    '/assets/images/bento/cooking/ninjin_ingen/cutting/green_beans_whole.png',
    '/assets/images/bento/cooking/ninjin_ingen/cutting/green_beans_pieces.png',
    '/assets/images/bento/cooking/ninjin_ingen/cutting/carrot_pieces.png',
    '/assets/images/bento/cooking/boil/boil_broccoli_whole.png',
  ]);
  for (const path of paths) {
    const response = await request.get(path);
    expect(response.ok(), path).toBeTruthy();
  }
});
