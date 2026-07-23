const { test, expect } = require('@playwright/test');

const ASSET_BASE = '/assets/images/hyokkori-hightouch/';
const WALK_SAVE_KEY = 'pono_hyokkori_walk_v1';
const PARTNERS = [
  'araiguma',
  'fukurou',
  'harinezumi',
  'karasu',
  'kitsune',
  'kojika',
  'risu',
  'usagi',
  'tanuki',
  'kawauso',
];
const EXPECTED_ASSETS = [
  'bg_forest_combo_terraces.png',
  'bg_donguri_path_20260723.png',
  'bg_mizube_20260723.png',
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
const LOCATIONS = [
  {
    id: 'komorebi_clearing',
    name: 'こもれびの ひろば',
    background: 'bg_forest_combo_terraces.png',
    slots: [
      { x: 21, y: 30, depth: 0.88 },
      { x: 50, y: 30, depth: 0.88 },
      { x: 79, y: 30, depth: 0.88 },
      { x: 21, y: 79, depth: 1 },
      { x: 50, y: 79, depth: 1 },
      { x: 79, y: 79, depth: 1 },
    ],
  },
  {
    id: 'donguri_path',
    name: 'どんぐりの こみち',
    background: 'bg_donguri_path_20260723.png',
    slots: [
      { x: 20, y: 29, depth: 0.88 },
      { x: 50, y: 29, depth: 0.88 },
      { x: 80, y: 29, depth: 0.88 },
      { x: 34, y: 79, depth: 1 },
      { x: 66, y: 79, depth: 1 },
    ],
  },
  {
    id: 'mizube',
    name: 'せせらぎの みずべ',
    background: 'bg_mizube_20260723.png',
    slots: [
      { x: 29, y: 30, depth: 0.88 },
      { x: 71, y: 30, depth: 0.88 },
      { x: 21, y: 79, depth: 1 },
      { x: 79, y: 79, depth: 1 },
    ],
  },
];

function walkStateAt(routeCompletedRuns) {
  return {
    version: 1,
    routeId: 'mori-3-v1',
    routeCompletedRuns,
    completedLocationIds: LOCATIONS.slice(0, routeCompletedRuns % LOCATIONS.length).map(({ id }) => id),
    mode: 'route',
    selectedLocationId: null,
    lastCompletedRunId: null,
    locationRecords: {},
  };
}

async function setupApp(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) { /* noop */ }
  });
}

async function waitForLocation(page, location) {
  await page.waitForFunction(
    ({ id, count }) => (
      document.body.classList.contains('pono-game-ready')
      && document.getElementById('stage')?.dataset.location === id
      && document.querySelectorAll('.hh-hole').length === count
    ),
    { id: location.id, count: location.slots.length },
  );
}

async function loadLocation(page, locationIndex) {
  const location = LOCATIONS[locationIndex];
  await page.evaluate(
    ({ key, state }) => window.localStorage.setItem(key, JSON.stringify(state)),
    { key: WALK_SAVE_KEY, state: walkStateAt(locationIndex) },
  );
  await page.reload();
  await waitForLocation(page, location);
}

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

test('3背景・10種の動物・共通の葉の開口を使い、旧花壇素材を読み込まない', async ({ page }) => {
  test.setTimeout(35_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await setupApp(page);

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
  await waitForLocation(page, LOCATIONS[0]);

  await expect(page.locator('#relay-progress, #flowerbed-img, #light-seed')).toHaveCount(0);
  await expect(page.locator('.hh-hole')).toHaveCount(6);
  await expect(page.locator('.hh-hideout-base')).toHaveCount(6);
  await expect(page.locator('.hh-hideout-foreground')).toHaveCount(6);
  expect(await page.locator('.hh-hole').evaluateAll((holes) =>
    holes.every((hole) => hole.tagName === 'BUTTON' && hole.getAttribute('type') === 'button'))).toBe(true);
  await expect(page.locator('#start-location')).toHaveText('1/3　こもれびの ひろば');

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

test('3場所×4画面で6・5・4個の実buttonを定義座標へ置き、遠近と下側マスクを保つ', async ({ page }) => {
  test.setTimeout(70_000);
  await setupApp(page);
  await page.goto('/hyokkori-hightouch/index.html');
  await waitForLocation(page, LOCATIONS[0]);

  const viewports = [
    { width: 568, height: 320 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
    { width: 1366, height: 768 },
  ];
  const openingCenterRatio = 673 / 1254;

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (let locationIndex = 0; locationIndex < LOCATIONS.length; locationIndex += 1) {
      const location = LOCATIONS[locationIndex];
      await loadLocation(page, locationIndex);

      const geometry = await page.evaluate(({ sourceOpeningCenter }) => {
        const stage = document.getElementById('stage');
        const stageRect = stage.getBoundingClientRect();
        const compact = stageRect.height <= 430;
        const windowVisibleRatio = compact ? 0.68 : 0.645;
        return {
          stageLocation: stage.dataset.location,
          backgroundImage: getComputedStyle(stage).backgroundImage,
          overflowX: document.documentElement.scrollWidth - window.innerWidth,
          overflowY: document.documentElement.scrollHeight - window.innerHeight,
          holes: Array.from(document.querySelectorAll('.hh-hole')).map((hole) => {
            const windowEl = hole.querySelector('.hh-window');
            const foreground = hole.querySelector('.hh-hideout-foreground');
            const base = hole.querySelector('.hh-hideout-base');
            const windowRect = windowEl.getBoundingClientRect();
            const foregroundRect = foreground.getBoundingClientRect();
            const baseRect = base.getBoundingClientRect();
            const hitRect = hole.getBoundingClientRect();
            const windowCenterX = windowRect.left + windowRect.width / 2;
            const windowCenterY = windowRect.top + windowRect.height / 2;
            return {
              tagName: hole.tagName,
              type: hole.getAttribute('type'),
              hole: hole.getAttribute('data-hole'),
              basePath: new URL(base.getAttribute('src'), location.href).pathname,
              foregroundPath: new URL(foreground.getAttribute('src'), location.href).pathname,
              windowZ: Number(getComputedStyle(windowEl).zIndex),
              foregroundZ: Number(getComputedStyle(foreground).zIndex),
              pointerEvents: getComputedStyle(foreground).pointerEvents,
              foregroundClip: getComputedStyle(foreground).clipPath,
              windowClip: getComputedStyle(windowEl).clipPath,
              depthScale: Number.parseFloat(getComputedStyle(hole).getPropertyValue('--depth-scale')),
              slotX: Number.parseFloat(hole.style.getPropertyValue('--slot-x')),
              slotY: Number.parseFloat(hole.style.getPropertyValue('--slot-y')),
              hitWidth: hitRect.width,
              hitHeight: hitRect.height,
              baseWidth: baseRect.width,
              windowWidth: windowRect.width,
              columnRatio: (windowCenterX - stageRect.left) / stageRect.width,
              rowRatio: (windowCenterY - stageRect.top) / stageRect.height,
              openingCenterError: Math.abs(
                baseRect.left + baseRect.width * sourceOpeningCenter - windowCenterX
              ),
              maskClearance:
                foregroundRect.top + foregroundRect.height * 0.6
                - (windowRect.top + windowRect.height * windowVisibleRatio),
              overlapsWindowBottom: foregroundRect.bottom > windowRect.bottom - windowRect.height * 0.2,
            };
          }),
        };
      }, { sourceOpeningCenter: openingCenterRatio });

      expect(geometry.stageLocation).toBe(location.id);
      expect(geometry.backgroundImage).toContain(location.background);
      expect(geometry.overflowX).toBeLessThanOrEqual(0);
      expect(geometry.overflowY).toBeLessThanOrEqual(0);
      expect(geometry.holes).toHaveLength(location.slots.length);

      for (const [index, hole] of geometry.holes.entries()) {
        const slot = location.slots[index];
        expect(hole.tagName).toBe('BUTTON');
        expect(hole.type).toBe('button');
        expect(hole.hole).toBe(String(index));
        expect(hole.basePath).toBe(`${ASSET_BASE}hideout_leaf_bush.png`);
        expect(hole.foregroundPath).toBe(`${ASSET_BASE}hideout_leaf_bush.png`);
        expect(hole.foregroundZ).toBeGreaterThan(hole.windowZ);
        expect(hole.pointerEvents).toBe('none');
        expect(hole.foregroundClip).not.toBe('none');
        expect(hole.windowClip).not.toBe('none');
        expect(hole.overlapsWindowBottom).toBe(true);
        expect(hole.hitWidth).toBeGreaterThanOrEqual(44);
        expect(hole.hitHeight).toBeGreaterThanOrEqual(44);
        expect(hole.slotX).toBeCloseTo(slot.x, 3);
        expect(hole.slotY).toBeCloseTo(slot.y, 3);
        expect(hole.depthScale).toBeCloseTo(slot.depth, 3);
        expect(
          Math.abs(hole.columnRatio - slot.x / 100),
          `${location.id} ${viewport.width}x${viewport.height} hole ${index}: x座標`,
        ).toBeLessThan(0.006);
        expect(
          Math.abs(hole.rowRatio - slot.y / 100),
          `${location.id} ${viewport.width}x${viewport.height} hole ${index}: y座標`,
        ).toBeLessThan(0.006);
        expect(
          hole.openingCenterError,
          `${location.id} ${viewport.width}x${viewport.height} hole ${index}: 茂み内の穴中心`,
        ).toBeLessThanOrEqual(1.5);
        expect(
          hole.maskClearance,
          `${location.id} ${viewport.width}x${viewport.height} hole ${index}: 窓下端が前葉より下へ漏れない`,
        ).toBeGreaterThanOrEqual(-0.25);
        expect(
          hole.maskClearance,
          `${location.id} ${viewport.width}x${viewport.height} hole ${index}: 窓と前葉の間を空けすぎない`,
        ).toBeLessThanOrEqual(3);
      }

      const far = geometry.holes.filter((hole) => Math.abs(hole.depthScale - 0.88) < 0.001);
      const near = geometry.holes.filter((hole) => Math.abs(hole.depthScale - 1) < 0.001);
      expect(far.length).toBeGreaterThanOrEqual(2);
      expect(near.length).toBeGreaterThanOrEqual(2);
      const baseDepthRatio = near[0].baseWidth / far[0].baseWidth;
      const characterDepthRatio = near[0].windowWidth / far[0].windowWidth;
      expect(baseDepthRatio).toBeGreaterThan(1.11);
      expect(baseDepthRatio).toBeLessThan(1.16);
      expect(characterDepthRatio).toBeGreaterThan(1.11);
      expect(characterDepthRatio).toBeLessThan(1.16);
    }
  }
});

test('直前に成功した場所だけを次から外し、次地点開始で解除する', async ({ page }) => {
  test.setTimeout(25_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.clock.install({ time: new Date('2026-07-23T00:00:00Z') });
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    Math.random = () => 0.75;
  });
  await page.goto('/hyokkori-hightouch/index.html');
  await waitForLocation(page, LOCATIONS[0]);
  await page.locator('#start-btn').click({ force: true });
  await page.clock.runFor(1_250);

  const first = await advanceToAwake(page);
  const firstIndex = await first.getAttribute('data-hole');
  await first.click({ force: true });
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
  await second.click({ force: true });
  await expect(page.locator('#board')).toHaveAttribute('data-last-successful-hole', secondIndex || '');

  await page.clock.runFor(34_000);
  await expect(page.locator('#result-overlay')).toHaveClass(/show/);
  await page.locator('#retry-btn').click({ force: true });
  await page.clock.runFor(100);
  await expect(page.locator('#stage')).toHaveAttribute('data-location', 'donguri_path');
  await expect(page.locator('#board')).toHaveAttribute('data-last-successful-hole', '');
});

test('キーボードで開始・穴のハイタッチ・チュートリアル送りができ、説明中は時間が止まる', async ({ page }) => {
  test.setTimeout(20_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/hyokkori-hightouch/index.html');
  await page.waitForFunction(() => !!window.HyokkoriLogic && !!window.HyokkoriLocations);

  await page.locator('#start-btn').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#countdown-screen')).not.toHaveClass(/show/, { timeout: 3_000 });
  await expect(page.locator('.pono-menu-toggle')).toBeVisible();

  const focusableHole = await page.locator('.hh-hole').filter({
    has: page.locator('.hh-char-wrap.is-visible:not(.is-sleeping)'),
  }).first();
  await focusableHole.focus();
  const scoreBefore = await page.locator('#hud-score').textContent();
  await page.keyboard.press('Enter');
  await expect(page.locator('#hud-score')).not.toHaveText(scoreBefore || '');

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
