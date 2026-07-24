const { test, expect } = require('@playwright/test');

const WALK_SAVE_KEY = 'pono_hyokkori_walk_v1';
const LOCATIONS = [
  {
    id: 'komorebi_clearing',
    name: 'こもれびの ひろば',
    startStory: 'ひかりの たねを つきの はなへ とどけよう',
    resultStory: 'たねが こみちへ すすんだ！',
    background: 'bg_world_komorebi_lowangle_20260724.png',
    holes: 6,
  },
  {
    id: 'donguri_path',
    name: 'どんぐりの こみち',
    startStory: 'りすたちに みちを おしえて もらおう',
    resultStory: 'みずべまで きたよ！',
    background: 'bg_world_donguri_overlook_20260724.png',
    holes: 5,
  },
  {
    id: 'mizube',
    name: 'せせらぎの みずべ',
    startStory: 'かわうそと たねを むこうぎしへ とどけよう',
    resultStory: 'ゆうやけの おかが みえた！',
    background: 'bg_world_mizube_waterline_v2_20260724.png',
    holes: 4,
  },
  {
    id: 'mushroom_hill',
    name: 'きのこの おか',
    startStory: 'きのこの あかりを たよりに のぼろう',
    resultStory: 'つきあかりまで あと いっぽ！',
    background: 'bg_world_mushroom_hill_sunset_20260724.png',
    holes: 5,
  },
  {
    id: 'moonlight_forest',
    name: 'つきあかりの もり',
    startStory: 'つきあかりへ たねを とどけよう',
    resultStory: 'つきの はなが さいた！',
    afterStory: 'あたらしい たねで また さんぽ！',
    background: 'bg_world_moonlight_forest_clearing_20260724.png',
    holes: 4,
  },
];

async function waitForLocation(page, location) {
  await page.waitForFunction(
    ({ id, holes }) => (
      document.body.classList.contains('pono-game-ready')
      && document.getElementById('stage')?.dataset.location === id
      && document.getElementById('board')?.dataset.location === id
      && document.querySelectorAll('.hh-hole').length === holes
    ),
    { id: location.id, holes: location.holes },
  );
}

async function expectHolesDisabled(page, expected) {
  const state = await page.locator('.hh-hole').evaluateAll((holes) => ({
    count: holes.length,
    allDisabled: holes.every((hole) => hole.disabled),
    anyFocused: holes.some((hole) => hole === document.activeElement),
  }));
  expect(state.count).toBeGreaterThan(0);
  expect(state.allDisabled).toBe(expected);
  if (expected) expect(state.anyFocused).toBe(false);
}

async function runToResult(page) {
  await expect(page.locator('#countdown-screen')).toHaveClass(/show/);
  await expectHolesDisabled(page, true);
  await page.clock.runFor(1_250);
  await expect(page.locator('#countdown-screen')).not.toHaveClass(/show/);
  await expectHolesDisabled(page, false);
  await page.clock.runFor(34_000);
  await expect(page.locator('#result-overlay')).toHaveClass(/show/);
  await expectHolesDisabled(page, true);
}

async function continueTo(page, location) {
  await page.locator('#retry-btn').click({ force: true });
  for (let elapsed = 0; elapsed < 2_000; elapsed += 50) {
    await page.clock.runFor(50);
    if (await page.locator('#stage').getAttribute('data-location') === location.id) break;
  }
  await waitForLocation(page, location);
  await expect(page.locator('#result-overlay')).not.toHaveClass(/show/);
  await expect(page.locator('#start-screen')).toBeHidden();
  await expect(page.locator('#countdown-screen')).toHaveClass(/show/);
  await expect(page.locator('#cd-text')).toHaveText(location.name);
  await expect(page.locator('#cd-story')).toBeVisible();
  await expect(page.locator('#cd-story')).toHaveText(location.startStory);
  await expectHolesDisabled(page, true);
}

async function expectWalkDots(page, completedCount, currentIndex = null) {
  const dots = page.locator('.walk-dot');
  await expect(dots).toHaveCount(LOCATIONS.length);
  for (let index = 0; index < LOCATIONS.length; index += 1) {
    if (index < completedCount) await expect(dots.nth(index)).toHaveClass(/is-complete/);
    else await expect(dots.nth(index)).not.toHaveClass(/is-complete/);

    if (index === currentIndex) await expect(dots.nth(index)).toHaveClass(/is-current/);
    else await expect(dots.nth(index)).not.toHaveClass(/is-current/);
  }
}

async function expectLocationPresentation(page, location, index) {
  await expect(page.locator('#start-location')).toHaveText(`${index + 1}/${LOCATIONS.length}　${location.name}`);
  await expect(page.locator('#start-desc')).toHaveText(location.startStory);
  await expect(page.locator('.hh-hole')).toHaveCount(location.holes);
  await expect(page.locator('#stage')).toHaveCSS('background-image', new RegExp(`${location.background.replaceAll('.', '\\.')}`));
}

test('30秒完走ごとに6→5→4→5→4か所を歩き、物語と5面の記録をつないで月の花から1面へ戻る', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.clock.install({ time: new Date('2026-07-23T00:00:00Z') });
  await page.addInitScript(({ key }) => {
    window.__APP_BUILD__ = 1;
    Math.random = () => 0.75;
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.setItem('pono_debug_mode_session', '1');
    } catch (_e) { /* noop */ }
  }, { key: WALK_SAVE_KEY });

  const pageErrors = [];
  const failedImages = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (
      url.pathname.startsWith('/assets/images/hyokkori-hightouch/')
      && response.status() >= 400
    ) {
      failedImages.push({ path: url.pathname, status: response.status() });
    }
  });

  await page.goto('/hyokkori-hightouch/index.html');
  await waitForLocation(page, LOCATIONS[0]);
  await expectLocationPresentation(page, LOCATIONS[0], 0);
  await expectHolesDisabled(page, true);
  await page.locator('.hh-hole').first().focus();
  await expectHolesDisabled(page, true);

  await page.locator('#start-btn').click({ force: true });
  await expect(page.locator('#cd-text')).toHaveText(LOCATIONS[0].name);
  await expect(page.locator('#cd-story')).toBeVisible();
  await expect(page.locator('#cd-story')).toHaveText(LOCATIONS[0].startStory);
  await runToResult(page);

  await expect(page.locator('#result-title')).toHaveText('さいごまで あそべた！');
  await expect(page.locator('#result-next-location')).toHaveText(LOCATIONS[0].resultStory);
  await expect(page.locator('#retry-btn')).toHaveText('さんぽを つづける');
  await expectWalkDots(page, 1, 1);

  let saved = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), WALK_SAVE_KEY);
  expect(saved.version).toBe(2);
  expect(saved.routeId).toBe('mori-5-v1');
  expect(saved.routeCompletedRuns).toBe(1);
  expect(saved.completedLocationIds).toEqual(['komorebi_clearing']);
  expect(saved.locationRecords.komorebi_clearing).toEqual({
    plays: 1,
    bestScore: 0,
    bestCombo: 0,
  });

  await continueTo(page, LOCATIONS[1]);
  await expectLocationPresentation(page, LOCATIONS[1], 1);
  await runToResult(page);
  await expect(page.locator('#result-title')).toHaveText('さいごまで あそべた！');
  await expect(page.locator('#result-next-location')).toHaveText(LOCATIONS[1].resultStory);
  await expectWalkDots(page, 2, 2);

  saved = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), WALK_SAVE_KEY);
  expect(saved.routeCompletedRuns).toBe(2);
  expect(saved.completedLocationIds).toEqual(['komorebi_clearing', 'donguri_path']);
  expect(saved.locationRecords.donguri_path.plays).toBe(1);

  await continueTo(page, LOCATIONS[2]);
  await expectLocationPresentation(page, LOCATIONS[2], 2);
  await runToResult(page);
  await expect(page.locator('#result-title')).toHaveText('さいごまで あそべた！');
  await expect(page.locator('#result-next-location')).toHaveText(LOCATIONS[2].resultStory);
  await expectWalkDots(page, 3, 3);

  saved = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), WALK_SAVE_KEY);
  expect(saved.routeCompletedRuns).toBe(3);
  expect(saved.completedLocationIds).toEqual(LOCATIONS.slice(0, 3).map(({ id }) => id));
  expect(saved.locationRecords.mizube.plays).toBe(1);

  await continueTo(page, LOCATIONS[3]);
  await expectLocationPresentation(page, LOCATIONS[3], 3);
  await runToResult(page);
  await expect(page.locator('#result-title')).toHaveText('さいごまで あそべた！');
  await expect(page.locator('#result-next-location')).toHaveText(LOCATIONS[3].resultStory);
  await expectWalkDots(page, 4, 4);

  saved = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), WALK_SAVE_KEY);
  expect(saved.routeCompletedRuns).toBe(4);
  expect(saved.completedLocationIds).toEqual(LOCATIONS.slice(0, 4).map(({ id }) => id));
  expect(saved.locationRecords.mushroom_hill.plays).toBe(1);

  await continueTo(page, LOCATIONS[4]);
  await expectLocationPresentation(page, LOCATIONS[4], 4);
  await runToResult(page);
  await expect(page.locator('#result-card')).toHaveClass(/is-final-bloom/);
  await expect(page.locator('#result-title')).toHaveText(LOCATIONS[4].resultStory);
  await expect(page.locator('#result-next-location')).toHaveText(LOCATIONS[4].afterStory);
  await expect(page.locator('#result-visual')).toHaveClass(/is-moon-flower/);
  await expect(page.locator('#result-visual')).toHaveAttribute('src', /story_moon_flower_bloom\.png$/);
  await expect(page.locator('#result-visual')).toHaveAttribute('alt', 'つきの はなが さいたよ');
  await expectWalkDots(page, 5, null);

  // 最小横画面でも、開花・物語・主ボタンを結果カード内へ収める。
  await page.setViewportSize({ width: 568, height: 320 });
  const finalGeometry = await page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const card = document.getElementById('result-card').getBoundingClientRect();
    const flower = document.getElementById('result-visual').getBoundingClientRect();
    const story = document.getElementById('result-next-location').getBoundingClientRect();
    const button = document.getElementById('retry-btn').getBoundingClientRect();
    return {
      viewport,
      card: { left: card.left, top: card.top, right: card.right, bottom: card.bottom },
      flower: { left: flower.left, top: flower.top, right: flower.right, bottom: flower.bottom },
      story: { left: story.left, top: story.top, right: story.right, bottom: story.bottom },
      button: {
        left: button.left,
        top: button.top,
        right: button.right,
        bottom: button.bottom,
        height: button.height,
      },
    };
  });
  expect(finalGeometry.card.left).toBeGreaterThanOrEqual(0);
  expect(finalGeometry.card.top).toBeGreaterThanOrEqual(0);
  expect(finalGeometry.card.right).toBeLessThanOrEqual(finalGeometry.viewport.width);
  expect(finalGeometry.card.bottom).toBeLessThanOrEqual(finalGeometry.viewport.height);
  for (const part of [finalGeometry.flower, finalGeometry.story, finalGeometry.button]) {
    expect(part.left).toBeGreaterThanOrEqual(finalGeometry.card.left);
    expect(part.top).toBeGreaterThanOrEqual(finalGeometry.card.top);
    expect(part.right).toBeLessThanOrEqual(finalGeometry.card.right);
    expect(part.bottom).toBeLessThanOrEqual(finalGeometry.card.bottom);
  }
  expect(finalGeometry.button.height).toBeGreaterThanOrEqual(44);
  await page.setViewportSize({ width: 844, height: 390 });

  saved = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), WALK_SAVE_KEY);
  expect(saved.routeCompletedRuns).toBe(5);
  expect(saved.completedLocationIds).toEqual(LOCATIONS.map(({ id }) => id));
  expect(saved.locationRecords.moonlight_forest.plays).toBe(1);
  expect(Object.keys(saved.locationRecords).sort()).toEqual(
    LOCATIONS.map(({ id }) => id).sort(),
  );

  // 5面完走後も結果ボタンからタイトルを挟まず、新しい種とともに1面へ戻る。
  await continueTo(page, LOCATIONS[0]);
  await expectLocationPresentation(page, LOCATIONS[0], 0);
  await expect(page.locator('#cd-text')).toHaveText(LOCATIONS[0].name);

  expect(failedImages).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('旧3面ルートを完走済みなら、保存記録を保ったまま4面から再開する', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(({ key }) => {
    window.__APP_BUILD__ = 1;
    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      routeId: 'mori-3-v1',
      routeCompletedRuns: 3,
      completedLocationIds: ['komorebi_clearing', 'donguri_path', 'mizube'],
      mode: 'route',
      selectedLocationId: null,
      lastCompletedRunId: 'legacy-third-run',
      locationRecords: {
        komorebi_clearing: { plays: 1, bestScore: 20, bestCombo: 2 },
        donguri_path: { plays: 1, bestScore: 30, bestCombo: 3 },
        mizube: { plays: 1, bestScore: 40, bestCombo: 4 },
      },
    }));
  }, { key: WALK_SAVE_KEY });

  await page.goto('/hyokkori-hightouch/index.html');
  await waitForLocation(page, LOCATIONS[3]);
  await expectLocationPresentation(page, LOCATIONS[3], 3);

  const migrated = await page.evaluate((key) => (
    JSON.parse(window.localStorage.getItem(key))
  ), WALK_SAVE_KEY);
  expect(migrated.version).toBe(2);
  expect(migrated.routeId).toBe('mori-5-v1');
  expect(migrated.routeCompletedRuns).toBe(3);
  expect(migrated.completedLocationIds).toEqual(LOCATIONS.slice(0, 3).map(({ id }) => id));
  expect(migrated.locationRecords.mizube).toEqual({
    plays: 1,
    bestScore: 40,
    bestCombo: 4,
  });
});

test('旧3面ルートが2面までなら、未完の進行を保って3面から再開する', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(({ key }) => {
    window.__APP_BUILD__ = 1;
    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      routeId: 'mori-3-v1',
      routeCompletedRuns: 2,
      completedLocationIds: ['komorebi_clearing', 'donguri_path'],
      mode: 'route',
      selectedLocationId: null,
      lastCompletedRunId: 'legacy-second-run',
      locationRecords: {
        komorebi_clearing: { plays: 1, bestScore: 20, bestCombo: 2 },
        donguri_path: { plays: 1, bestScore: 30, bestCombo: 3 },
      },
    }));
  }, { key: WALK_SAVE_KEY });

  await page.goto('/hyokkori-hightouch/index.html');
  await waitForLocation(page, LOCATIONS[2]);
  await expectLocationPresentation(page, LOCATIONS[2], 2);

  const migrated = await page.evaluate((key) => (
    JSON.parse(window.localStorage.getItem(key))
  ), WALK_SAVE_KEY);
  expect(migrated.version).toBe(2);
  expect(migrated.routeId).toBe('mori-5-v1');
  expect(migrated.routeCompletedRuns).toBe(2);
  expect(migrated.completedLocationIds).toEqual(LOCATIONS.slice(0, 2).map(({ id }) => id));
});

test('同じrunIdの完了反映は二重に歩数・場所別playsを増やさない', async ({ page }) => {
  await page.goto('/hyokkori-hightouch/index.html');
  await page.waitForFunction(() => !!window.HyokkoriLocations);

  const result = await page.evaluate(() => {
    const H = window.HyokkoriLocations;
    const first = H.advanceWalkState(H.normalizeWalkState(null), {
      runId: 'same-run',
      locationId: 'komorebi_clearing',
      mode: 'route',
      score: 42,
      bestCombo: 5,
    });
    const duplicate = H.advanceWalkState(first, {
      runId: 'same-run',
      locationId: 'komorebi_clearing',
      mode: 'route',
      score: 999,
      bestCombo: 99,
    });
    return { first, duplicate };
  });

  expect(result.duplicate).toEqual(result.first);
  expect(result.duplicate.routeCompletedRuns).toBe(1);
  expect(result.duplicate.locationRecords.komorebi_clearing).toEqual({
    plays: 1,
    bestScore: 42,
    bestCombo: 5,
  });
});
