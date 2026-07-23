const { test, expect } = require('@playwright/test');

const WALK_SAVE_KEY = 'pono_hyokkori_walk_v1';
const LOCATIONS = [
  {
    id: 'komorebi_clearing',
    name: 'こもれびの ひろば',
    background: 'bg_forest_combo_terraces.png',
    holes: 6,
  },
  {
    id: 'donguri_path',
    name: 'どんぐりの こみち',
    background: 'bg_donguri_path_20260723.png',
    holes: 5,
  },
  {
    id: 'mizube',
    name: 'せせらぎの みずべ',
    background: 'bg_mizube_20260723.png',
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
  await expectHolesDisabled(page, true);
}

test('30秒完走ごとに6→5→4か所へ直接進み、3地点の進行と場所別記録を保存する', async ({ page }) => {
  test.setTimeout(60_000);
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
  await expect(page.locator('#start-location')).toHaveText('1/3　こもれびの ひろば');
  await expect(page.locator('.hh-hole')).toHaveCount(6);
  await expectHolesDisabled(page, true);
  await page.locator('.hh-hole').first().focus();
  await expectHolesDisabled(page, true);
  await expect(page.locator('#stage')).toHaveCSS('background-image', /bg_forest_combo_terraces\.png/);

  await page.locator('#start-btn').click({ force: true });
  await expect(page.locator('#cd-text')).toHaveText(LOCATIONS[0].name);
  await runToResult(page);

  await expect(page.locator('#result-title')).toHaveText('さいごまで あそべた！');
  await expect(page.locator('#result-next-location')).toHaveText(`つぎは ${LOCATIONS[1].name}`);
  await expect(page.locator('#retry-btn')).toHaveText('さんぽを つづける');
  await expect(page.locator('.walk-dot')).toHaveCount(3);
  await expect(page.locator('.walk-dot').nth(0)).toHaveClass(/is-complete/);
  await expect(page.locator('.walk-dot').nth(1)).toHaveClass(/is-current/);
  await expect(page.locator('.walk-dot').nth(2)).not.toHaveClass(/is-complete|is-current/);

  let saved = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), WALK_SAVE_KEY);
  expect(saved.routeCompletedRuns).toBe(1);
  expect(saved.completedLocationIds).toEqual(['komorebi_clearing']);
  expect(saved.locationRecords.komorebi_clearing).toEqual({
    plays: 1,
    bestScore: 0,
    bestCombo: 0,
  });

  await continueTo(page, LOCATIONS[1]);
  await expect(page.locator('.hh-hole')).toHaveCount(5);
  await expect(page.locator('#stage')).toHaveCSS('background-image', /bg_donguri_path_20260723\.png/);
  await runToResult(page);
  await expect(page.locator('#result-title')).toHaveText('さいごまで あそべた！');
  await expect(page.locator('#result-next-location')).toHaveText(`つぎは ${LOCATIONS[2].name}`);
  await expect(page.locator('.walk-dot').nth(0)).toHaveClass(/is-complete/);
  await expect(page.locator('.walk-dot').nth(1)).toHaveClass(/is-complete/);
  await expect(page.locator('.walk-dot').nth(2)).toHaveClass(/is-current/);

  saved = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), WALK_SAVE_KEY);
  expect(saved.routeCompletedRuns).toBe(2);
  expect(saved.completedLocationIds).toEqual(['komorebi_clearing', 'donguri_path']);
  expect(saved.locationRecords.donguri_path.plays).toBe(1);

  await continueTo(page, LOCATIONS[2]);
  await expect(page.locator('.hh-hole')).toHaveCount(4);
  await expect(page.locator('#stage')).toHaveCSS('background-image', /bg_mizube_20260723\.png/);
  await runToResult(page);
  await expect(page.locator('#result-title')).toHaveText('もりを ひとまわり できた！');
  await expect(page.locator('#result-next-location')).toHaveText(`つぎは ${LOCATIONS[0].name}`);
  for (let index = 0; index < 3; index += 1) {
    await expect(page.locator('.walk-dot').nth(index)).toHaveClass(/is-complete/);
    await expect(page.locator('.walk-dot').nth(index)).not.toHaveClass(/is-current/);
  }

  saved = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), WALK_SAVE_KEY);
  expect(saved.routeCompletedRuns).toBe(3);
  expect(saved.completedLocationIds).toEqual(LOCATIONS.map(({ id }) => id));
  expect(saved.locationRecords.mizube.plays).toBe(1);
  expect(Object.keys(saved.locationRecords).sort()).toEqual(
    LOCATIONS.map(({ id }) => id).sort(),
  );

  // ルート完走後も結果ボタンからタイトルを挟まず、最初の場所へ戻る。
  await continueTo(page, LOCATIONS[0]);
  await expect(page.locator('.hh-hole')).toHaveCount(6);
  await expect(page.locator('#cd-text')).toHaveText(LOCATIONS[0].name);

  expect(failedImages).toEqual([]);
  expect(pageErrors).toEqual([]);
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
