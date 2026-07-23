const { test, expect } = require('@playwright/test');

const ASSET_BASE = '/assets/images/hyokkori-hightouch/';
const PARTNERS = ['araiguma', 'fukurou', 'harinezumi', 'karasu', 'kitsune', 'kojika', 'risu', 'usagi'];
const EXPECTED_ASSETS = [
  'bg_forest_combo_terraces.png',
  'menu_thumb_highfive_combo.png',
  'hideout_leaf_bush.png',
  'fx_highfive_burst.png',
  'fx_leaf_puff.png',
  'fx_overheat_swirl.png',
  'fx_sleep_moon_cloud.png',
  'pono_result_bloom.png',
  'pono_title_highfive.png',
  'friend_hikari_momonga_bonus_awake.png',
  ...PARTNERS.flatMap((id) => [`friend_${id}_awake.png`, `friend_${id}_sleeping.png`]),
];
const LEGACY_PROGRESS_ASSETS = [
  'flowerbed_stage_0_soil.png',
  'flowerbed_stage_1_sprout.png',
  'flowerbed_stage_2_buds.png',
  'flowerbed_stage_3_bloom.png',
  'mechanic_light_seed.png',
];

async function advanceToAwake(page, excludedIndex = null, budgetMs = 8_000) {
  for (let advanced = 0; advanced <= budgetMs; advanced += 50) {
    const holes = page.locator('.hh-hole');
    for (let index = 0; index < await holes.count(); index += 1) {
      if (String(index) === String(excludedIndex)) continue;
      const hole = holes.nth(index);
      const wrap = hole.locator('.hh-char-wrap');
      const visible = await wrap.evaluate((element) => element.classList.contains('is-visible'));
      const sleeping = await wrap.evaluate((element) => element.classList.contains('is-sleeping'));
      const label = await hole.getAttribute('aria-label');
      if (visible && !sleeping && label && label.includes('ハイタッチ')) return hole;
    }
    await page.clock.runFor(50);
  }
  throw new Error('awake のおともだちが時間内に出現しませんでした');
}

test('共通の葉の開口と新背景を使い、花壇・たね素材を読み込まない', async ({ page }) => {
  test.setTimeout(30_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });

  const consoleErrors = [];
  const pageErrors = [];
  const failedAssetRequests = [];
  const assetResponses = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('requestfailed', (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith(ASSET_BASE)) failedAssetRequests.push(pathname);
  });
  page.on('response', (response) => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith(ASSET_BASE)) assetResponses.push({ path: pathname, status: response.status() });
  });

  await page.goto('/hyokkori-hightouch/index.html');
  await page.waitForFunction(() => !!window.HyokkoriLogic);

  await expect(page.locator('#relay-progress, #flowerbed-img, #light-seed')).toHaveCount(0);
  await expect(page.locator('.hh-hideout-base')).toHaveCount(6);
  await expect(page.locator('.hh-hideout-foreground')).toHaveCount(6);

  const layerGeometry = await page.evaluate(() => Array.from(document.querySelectorAll('.hh-hole')).map((hole) => {
    const windowEl = hole.querySelector('.hh-window');
    const foreground = hole.querySelector('.hh-hideout-foreground');
    const base = hole.querySelector('.hh-hideout-base');
    const windowRect = windowEl.getBoundingClientRect();
    const foregroundRect = foreground.getBoundingClientRect();
    return {
      hole: hole.getAttribute('data-hole'),
      basePath: new URL(base.getAttribute('src'), location.href).pathname,
      foregroundPath: new URL(foreground.getAttribute('src'), location.href).pathname,
      windowZ: Number(getComputedStyle(windowEl).zIndex),
      foregroundZ: Number(getComputedStyle(foreground).zIndex),
      pointerEvents: getComputedStyle(foreground).pointerEvents,
      foregroundClip: getComputedStyle(foreground).clipPath,
      windowClip: getComputedStyle(windowEl).clipPath,
      centerX: windowRect.left + windowRect.width / 2,
      centerY: windowRect.top + windowRect.height / 2,
      overlapsWindowBottom: foregroundRect.bottom > windowRect.bottom - windowRect.height * 0.2,
    };
  }));
  expect(layerGeometry).toHaveLength(6);
  for (const item of layerGeometry) {
    expect(item.basePath).toBe(`${ASSET_BASE}hideout_leaf_bush.png`);
    expect(item.foregroundPath).toBe(`${ASSET_BASE}hideout_leaf_bush.png`);
    expect(item.foregroundZ).toBeGreaterThan(item.windowZ);
    expect(item.pointerEvents).toBe('none');
    expect(item.foregroundClip).not.toBe('none');
    expect(item.windowClip).not.toBe('none');
    expect(item.overlapsWindowBottom).toBe(true);
  }
  for (const row of [layerGeometry.slice(0, 3), layerGeometry.slice(3, 6)]) {
    expect(Math.max(...row.map((item) => item.centerY)) - Math.min(...row.map((item) => item.centerY))).toBeLessThan(1);
  }
  for (let column = 0; column < 3; column += 1) {
    expect(Math.abs(layerGeometry[column].centerX - layerGeometry[column + 3].centerX)).toBeLessThan(1);
  }

  const assetResults = await page.evaluate(async ({ base, names }) => Promise.all(names.map(async (name) => {
    const response = await fetch(base + name, { cache: 'no-store' });
    return {
      name,
      status: response.status,
      ok: response.ok,
      type: response.headers.get('content-type') || '',
    };
  })), { base: ASSET_BASE, names: EXPECTED_ASSETS });
  expect(assetResults).toEqual(EXPECTED_ASSETS.map((name) => expect.objectContaining({
    name,
    status: 200,
    ok: true,
    type: expect.stringMatching(/^image\/png(?:;|$)/),
  })));

  await page.locator('#start-btn').click({ force: true });
  await expect(page.locator('#countdown-screen')).not.toHaveClass(/show/, { timeout: 3_000 });
  await page.waitForTimeout(1_500);
  const loadedPaths = await page.evaluate(() => performance.getEntriesByType('resource')
    .map((entry) => new URL(entry.name).pathname));
  for (const legacyName of LEGACY_PROGRESS_ASSETS) {
    expect(loadedPaths).not.toContain(`${ASSET_BASE}${legacyName}`);
  }
  expect(failedAssetRequests).toEqual([]);
  expect(assetResponses.filter(({ status }) => status >= 400)).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('直前に成功した場所だけを次から外し、もういちどで解除する', async ({ page }) => {
  test.setTimeout(25_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.clock.install({ time: new Date('2026-07-23T00:00:00Z') });
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    Math.random = () => 0.75;
  });
  await page.goto('/hyokkori-hightouch/index.html');
  await page.locator('#start-btn').click({ force: true });
  await page.clock.runFor(1_250);

  const first = await advanceToAwake(page);
  const firstIndex = await first.getAttribute('data-hole');
  await first.locator('.hh-window').click({ force: true });
  await expect(page.locator('#board')).toHaveAttribute('data-last-successful-hole', firstIndex || '');

  const emptyPoint = await page.locator('#stage').evaluate((stage) => {
    const rect = stage.getBoundingClientRect();
    return { x: rect.left + 6, y: rect.top + rect.height / 2 };
  });
  await page.mouse.click(emptyPoint.x, emptyPoint.y);
  await expect(page.locator('#board')).toHaveAttribute('data-last-successful-hole', firstIndex || '');

  await page.clock.runFor(400);
  await expect(first.locator('.hh-char-wrap')).not.toHaveClass(/is-visible/, { timeout: 1_000 });
  for (let elapsed = 0; elapsed < 1_500; elapsed += 50) {
    await page.clock.runFor(50);
    await expect(first.locator('.hh-char-wrap')).not.toHaveClass(/is-visible/);
  }

  const second = await advanceToAwake(page, firstIndex);
  const secondIndex = await second.getAttribute('data-hole');
  expect(secondIndex).not.toBe(firstIndex);
  await second.locator('.hh-window').click({ force: true });
  await expect(page.locator('#board')).toHaveAttribute('data-last-successful-hole', secondIndex || '');

  await page.clock.runFor(34_000);
  await expect(page.locator('#result-overlay')).toHaveClass(/show/);
  await page.locator('#retry-btn').click({ force: true });
  await expect(page.locator('#board')).toHaveAttribute('data-last-successful-hole', '');
});

test('キーボードで開始・チュートリアル送りができ、説明中はゲーム時間が止まる', async ({ page }) => {
  test.setTimeout(20_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/hyokkori-hightouch/index.html');
  await page.waitForFunction(() => !!window.HyokkoriLogic);

  await page.locator('#start-btn').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#countdown-screen')).not.toHaveClass(/show/, { timeout: 3_000 });
  await expect(page.locator('.pono-menu-toggle')).toBeVisible();

  await page.locator('.pono-menu-toggle').click({ force: true });
  await page.getByText('あそびかた', { exact: true }).click({ force: true });
  await expect(page.locator('#tut-bubble')).not.toHaveClass(/hidden/);

  const timerBefore = await page.locator('#hud-timer').textContent();
  await page.waitForTimeout(1_700);
  await expect(page.locator('#hud-timer')).toHaveText(timerBefore || '');

  await page.locator('#tut-next').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#tut-bubble')).toContainText('ねてる こは');
  await page.locator('#tut-next').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#tut-bubble')).toContainText('キラキラの こは 30てん');
  await expect(page.locator('#tut-bubble')).not.toContainText('おはな');

  await page.locator('#tut-dim').evaluate((element) => element.click());
  await expect(page.locator('#tut-bubble')).toHaveClass(/hidden/);
  await page.waitForFunction(
    (before) => document.getElementById('hud-timer')?.textContent !== before,
    timerBefore,
    { timeout: 2_500 },
  );
});
