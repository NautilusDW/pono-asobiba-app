const { test, expect } = require('@playwright/test');

async function setupPage(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) { /* noop */ }
  });
}

async function openStage(page, stageId) {
  await page.goto('/machigai/index.html');
  await expect(page.locator('.title-logo')).toBeVisible({ timeout: 10000 });
  await page.evaluate((id) => {
    window.MSL.Main.goto('game', { stageId: id });
  }, stageId);
  await expect(page.locator('.game-panels')).toBeVisible({ timeout: 10000 });
}

async function stageData(page, stageId) {
  return page.evaluate((id) => {
    const stage = window.STAGE_DATA.stages.find((candidate) => candidate.id === id);
    return JSON.parse(JSON.stringify(stage));
  }, stageId);
}

test('後半7面は生成済みB画像で形・向き・模様の意味が明確な差を表示する', async ({ page }) => {
  await setupPage(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await openStage(page, 'jungle');
  const curve = await page.evaluate(() => window.STAGE_DATA.stages.map((stage) => ({
    id: stage.id,
    difficulty: stage.difficulty,
    imgB: stage.imgB,
    variantBase: stage.variantBase || null,
    kinds: stage.differences.map((diff) => diff.kind || null),
    hasRuntimeVisual: stage.differences.some((diff) => !!diff.visual)
  })));
  expect(curve.slice(0, 5).every((stage) => stage.difficulty === 'easy')).toBe(true);
  expect(curve.slice(5, 8).every((stage) => stage.difficulty === 'medium')).toBe(true);
  expect(curve.slice(8).every((stage) =>
    stage.difficulty === 'hard' &&
    stage.imgB.endsWith('_b.webp') &&
    stage.variantBase === null &&
    stage.hasRuntimeVisual === false &&
    stage.kinds.every((kind) => ['shape', 'direction', 'pattern'].includes(kind))
  )).toBe(true);

  expect((await stageData(page, 'jungle')).differences.map(({ label, kind }) => ({ label, kind }))).toEqual([
    { label: 'おうむの はね', kind: 'pattern' },
    { label: 'さるの しっぽ', kind: 'shape' },
    { label: 'きりんの もよう', kind: 'pattern' },
    { label: 'ぞうの みみ', kind: 'shape' }
  ]);
  expect((await stageData(page, 'bedroom')).differences.map(({ label }) => label)).toEqual([
    'おつきさまの むき',
    'うさぎの みみ',
    'ぞうの はな',
    'まくらの かど'
  ]);
  expect((await stageData(page, 'castle')).differences.slice(3).map(({ label }) => label)).toEqual([
    'どらごんの はね',
    'かんむりの おおきさ'
  ]);

  for (const stage of curve.slice(8)) {
    await page.evaluate((id) => {
      window.MSL.Main.goto('game', { stageId: id });
    }, stage.id);
    await expect(page.locator('.game-panels')).toBeVisible();
    await expect.poll(async () => page.locator('.panel img').evaluateAll((images) =>
      images.map((image) => ({
        complete: image.complete,
        width: image.naturalWidth,
        height: image.naturalHeight,
        src: image.getAttribute('src')
      }))
    )).toEqual([
      {
        complete: true,
        width: 1024,
        height: 1024,
        src: `assets/processed/${stage.id}_a.webp`
      },
      {
        complete: true,
        width: 1024,
        height: 1024,
        src: `assets/processed/${stage.id}_b.webp`
      }
    ]);
    await expect(page.locator('.subtle-difference-patch')).toHaveCount(0);
  }

  expect(errors).toEqual([]);
});

test('ヒントは左右の同じ細部へ正しく表示される', async ({ page }) => {
  await setupPage(page);
  await openStage(page, 'festival');
  const stage = await stageData(page, 'festival');
  const panels = page.locator('.panel');

  const first = stage.differences[0];
  const boxA = await panels.nth(0).boundingBox();
  expect(boxA).not.toBeNull();
  await panels.nth(0).click({
    position: { x: first.x * boxA.width, y: first.y * boxA.height }
  });
  await expect(page.locator('.stars-row .star.filled')).toHaveCount(1);

  await page.locator('.hint').click();
  const second = stage.differences[1];
  const centers = await panels.evaluateAll((panelEls) => panelEls.map((panel) => {
    const panelRect = panel.getBoundingClientRect();
    const glow = panel.querySelector('.hint-glow');
    const glowRect = glow.getBoundingClientRect();
    return {
      x: (glowRect.left + glowRect.width / 2 - panelRect.left) / panelRect.width,
      y: (glowRect.top + glowRect.height / 2 - panelRect.top) / panelRect.height
    };
  }));
  expect(centers[0].x).toBeCloseTo(second.x, 2);
  expect(centers[0].y).toBeCloseTo(second.y, 2);
  expect(centers[1].x).toBeCloseTo(second.x, 2);
  expect(centers[1].y).toBeCloseTo(second.y, 2);
  expect(centers[0].x).toBeCloseTo(centers[1].x, 4);
  expect(centers[0].y).toBeCloseTo(centers[1].y, 4);
});

test('再調整した3面を左右どちらからでも全て見つけてクリアできる', async ({ page }) => {
  await setupPage(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  for (const stageId of ['jungle', 'bedroom', 'castle']) {
    await openStage(page, stageId);
    const stage = await stageData(page, stageId);
    const panels = page.locator('.panel');

    for (let index = 0; index < stage.differences.length; index++) {
      const panel = panels.nth(index % 2);
      const diff = stage.differences[index];
      const box = await panel.boundingBox();
      expect(box).not.toBeNull();
      await panel.click({
        position: { x: diff.x * box.width, y: diff.y * box.height }
      });
      await expect(page.locator('.stars-row .star.filled')).toHaveCount(index + 1);
    }

    await expect(page.locator('.clear-title')).toHaveText('できた！', { timeout: 5000 });
    await expect(page.locator('.clear-stars .star.filled')).toHaveCount(3);
  }
  expect(errors).toEqual([]);
});
