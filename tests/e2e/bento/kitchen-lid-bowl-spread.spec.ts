import { expect, test } from '@playwright/test';

const viewports = [
  { width: 844, height: 390 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
];

for (const viewport of viewports) {
  test(`egg lid follows the pointer and closes at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      (window as Window & { __APP_BUILD__?: number }).__APP_BUILD__ = 1;
    });
    await page.goto('/bento/kitchen.html', { waitUntil: 'domcontentloaded' });
    // Portrait QA keeps the app's rotate notice in place, so force only the
    // setup clicks; the lid drag below still uses real pointer hit-testing.
    await page.locator('#mode-cook-btn').click({ force: true });
    await page.getByRole('button', { name: 'めだまやきを つくる' }).click({ force: true });
    await expect(page.locator('#grill-stage')).toHaveClass(/is-preheated/);

    await page.evaluate(() => {
      const state = (window as Window & { __bentoState?: Record<string, unknown> }).__bentoState!;
      state.cookFoodPlaced = true;
      state.cookEggLidReady = true;
      state.cookEggLidClosed = false;
      state.cookEggLidDragging = false;
      state.cookServed = false;
      state.cookProgress = 0;
      state.cookAnimating = false;
      const stage = document.querySelector<HTMLElement>('#grill-stage')!;
      const lid = document.querySelector<HTMLElement>('#egg-glass-lid')!;
      stage.dataset.ingredient = 'egg';
      stage.classList.add('food-placed', 'egg-lid-ready');
      lid.style.left = '78%';
      lid.style.top = '8%';
      lid.style.width = '21%';
      lid.style.transform = 'translate(-120px, 55px) scale(0.88)';
    });

    await page.evaluate(() => {
      const lid = document.querySelector<HTMLElement>('#egg-glass-lid')!;
      const pan = document.querySelector<HTMLElement>('.grill-pan')!;
      const panBox = pan.getBoundingClientRect();
      const x = panBox.left + panBox.width * 0.5;
      const y = panBox.top + panBox.height * 0.35;
      const fire = (type: string) => lid.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        pointerId: 42,
        clientX: x,
        clientY: y,
      }));
      fire('pointerdown');
      fire('pointermove');
      fire('pointerup');
    });

    await expect(page.locator('#grill-stage')).toHaveClass(/egg-lid-closed/);
    await expect.poll(() => page.evaluate(() => {
      const lidEl = document.querySelector<HTMLElement>('#egg-glass-lid')!;
      return lidEl.dataset.lidDragInline || lidEl.style.transform;
    })).toBe('');
  });
}

test('touch pointercancel never throws the egg lid to the left wall', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    (window as Window & { __APP_BUILD__?: number }).__APP_BUILD__ = 1;
  });
  await page.goto('/bento/kitchen.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#mode-cook-btn').click({ force: true });
  await page.getByRole('button', { name: 'めだまやきを つくる' }).click({ force: true });
  await expect(page.locator('#grill-stage')).toHaveClass(/is-preheated/);

  const result = await page.evaluate(() => {
    const state = (window as Window & { __bentoState?: Record<string, unknown> }).__bentoState!;
    state.cookFoodPlaced = true;
    state.cookEggLidReady = true;
    state.cookEggLidClosed = false;
    state.cookEggLidDragging = false;
    state.cookServed = false;
    state.cookProgress = 0;
    state.cookAnimating = false;
    const stage = document.querySelector<HTMLElement>('#grill-stage')!;
    const lid = document.querySelector<HTMLElement>('#egg-glass-lid')!;
    stage.dataset.ingredient = 'egg';
    stage.classList.add('food-placed', 'egg-lid-ready');
    const rect = lid.getBoundingClientRect();
    const fire = (type: string, x: number, y: number) => lid.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, button: 0, buttons: type === 'pointercancel' ? 0 : 1,
      pointerId: 77, pointerType: 'touch', clientX: x, clientY: y,
    }));
    fire('pointerdown', rect.left + rect.width / 2, rect.top + rect.height / 2);
    fire('pointermove', rect.left + rect.width / 2 - 40, rect.top + rect.height / 2 + 20);
    fire('pointercancel', 0, 0);
    return {
      left: lid.style.left,
      top: lid.style.top,
      dragging: state.cookEggLidDragging,
      touchAction: getComputedStyle(lid).touchAction,
    };
  });

  expect(result).toEqual({ left: '', top: '', dragging: false, touchAction: 'none' });
});
