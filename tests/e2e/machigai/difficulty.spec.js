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

function pointForSide(diff, side) {
  return diff[side] || diff;
}

test('後半7面だけが局所的な形・向き・位置差を描画する', async ({ page }) => {
  await setupPage(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await openStage(page, 'space');
  await expect(page.locator('.panel[data-side="a"] .subtle-difference-patch')).toHaveCount(0);
  await expect(page.locator('.panel[data-side="b"].subtle-variant')).toHaveCount(1);
  await expect(page.locator('.panel[data-side="b"] .subtle-difference-patch')).toHaveCount(5);

  const curve = await page.evaluate(() => window.STAGE_DATA.stages.map((stage) => ({
    id: stage.id,
    difficulty: stage.difficulty,
    variantBase: stage.variantBase || null,
    kinds: stage.differences.map((diff) => diff.kind || null)
  })));
  expect(curve.slice(0, 5).every((stage) => stage.difficulty === 'easy')).toBe(true);
  expect(curve.slice(5, 8).every((stage) => stage.difficulty === 'medium')).toBe(true);
  expect(curve.slice(8).every((stage) =>
    stage.difficulty === 'hard' &&
    stage.variantBase === 'A' &&
    stage.kinds.every((kind) => ['shape', 'direction', 'pattern', 'position'].includes(kind))
  )).toBe(true);
  expect(errors).toEqual([]);
});

test('配置差のヒントがA/Bそれぞれの実位置へ出る', async ({ page }) => {
  await setupPage(page);
  await openStage(page, 'festival');
  const stage = await stageData(page, 'festival');
  const panels = {
    a: page.locator('.panel[data-side="a"]'),
    b: page.locator('.panel[data-side="b"]')
  };

  const first = pointForSide(stage.differences[0], 'a');
  const boxA = await panels.a.boundingBox();
  expect(boxA).not.toBeNull();
  await panels.a.click({
    position: { x: first.x * boxA.width, y: first.y * boxA.height }
  });
  await expect(page.locator('.stars-row .star.filled')).toHaveCount(1);

  await page.locator('.hint').click();
  const second = stage.differences[1];
  const expectedA = pointForSide(second, 'a');
  const expectedB = pointForSide(second, 'b');
  const centers = await page.locator('.panel').evaluateAll((panelEls) => panelEls.map((panel) => {
    const panelRect = panel.getBoundingClientRect();
    const glow = panel.querySelector('.hint-glow');
    const glowRect = glow.getBoundingClientRect();
    return {
      side: panel.dataset.side,
      x: (glowRect.left + glowRect.width / 2 - panelRect.left) / panelRect.width,
      y: (glowRect.top + glowRect.height / 2 - panelRect.top) / panelRect.height
    };
  }));
  const actualA = centers.find((center) => center.side === 'a');
  const actualB = centers.find((center) => center.side === 'b');
  expect(actualA.x).toBeCloseTo(expectedA.x, 2);
  expect(actualA.y).toBeCloseTo(expectedA.y, 2);
  expect(actualB.x).toBeCloseTo(expectedB.x, 2);
  expect(actualB.y).toBeCloseTo(expectedB.y, 2);
  expect(Math.abs(actualA.x - actualB.x)).toBeGreaterThan(0.005);
});

test('高難度のおしろ面を左右どちらからでも5個見つけてクリアできる', async ({ page }) => {
  await setupPage(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await openStage(page, 'castle');
  const stage = await stageData(page, 'castle');
  const panels = {
    a: page.locator('.panel[data-side="a"]'),
    b: page.locator('.panel[data-side="b"]')
  };

  for (let index = 0; index < stage.differences.length; index++) {
    const side = index % 2 === 0 ? 'a' : 'b';
    const diff = stage.differences[index];
    const point = pointForSide(diff, side);
    const box = await panels[side].boundingBox();
    expect(box).not.toBeNull();
    await panels[side].click({
      position: { x: point.x * box.width, y: point.y * box.height }
    });
    await expect(page.locator('.stars-row .star.filled')).toHaveCount(index + 1);
  }

  await expect(page.locator('.clear-title')).toHaveText('できた！', { timeout: 5000 });
  await expect(page.locator('.clear-stars .star.filled')).toHaveCount(3);
  expect(errors).toEqual([]);
});
