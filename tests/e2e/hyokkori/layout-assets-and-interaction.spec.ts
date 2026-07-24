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
  'kaeru',
  'yamane',
];
const EXPECTED_ASSETS = [
  'bg_world_komorebi_lowangle_20260724.png',
  'bg_world_donguri_overlook_20260724.png',
  'bg_world_mizube_waterline_v2_20260724.png',
  'bg_world_mushroom_hill_sunset_20260724.png',
  'bg_world_moonlight_forest_clearing_20260724.png',
  'menu_thumb_highfive_combo.png',
  'hideout_world_komorebi_far_v2_20260724.png',
  'hideout_world_komorebi_near_v2_20260724.png',
  'hideout_world_donguri_far_v2_20260724.png',
  'hideout_world_donguri_near_v2_20260724.png',
  'hideout_world_mizube_far_v2_20260724.png',
  'hideout_world_mizube_near_v2_20260724.png',
  'hideout_world_mushroom_far_20260724.png',
  'hideout_world_mushroom_near_20260724.png',
  'hideout_world_moonlight_far_20260724.png',
  'hideout_world_moonlight_near_20260724.png',
  'mask_hideout_world_komorebi_far_v2_20260724.png',
  'mask_hideout_world_komorebi_near_v2_20260724.png',
  'mask_hideout_world_donguri_far_v2_20260724.png',
  'mask_hideout_world_donguri_near_v2_20260724.png',
  'mask_hideout_world_mizube_far_v2_20260724.png',
  'mask_hideout_world_mizube_near_v2_20260724.png',
  'mask_hideout_world_mushroom_far_20260724.png',
  'mask_hideout_world_mushroom_near_20260724.png',
  'mask_hideout_world_moonlight_far_20260724.png',
  'mask_hideout_world_moonlight_near_20260724.png',
  'fx_highfive_burst.png',
  'fx_leaf_puff.png',
  'fx_overheat_swirl.png',
  'fx_sleep_moon_cloud.png',
  'pono_result_bloom.png',
  'pono_title_highfive.png',
  'story_moon_flower_bloom.png',
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
const LEGACY_WORLD_ASSETS = [
  'bg_forest_combo_terraces.png',
  'bg_donguri_path_autumn_20260723.png',
  'bg_mizube_cool_20260723.png',
  'bg_world_mizube_waterline_20260724.png',
  'hideout_leaf_bush.png',
  'hideout_world_komorebi_far_20260724.png',
  'hideout_world_komorebi_near_20260724.png',
  'hideout_world_donguri_far_20260724.png',
  'hideout_world_donguri_near_20260724.png',
  'hideout_world_mizube_far_20260724.png',
  'hideout_world_mizube_near_20260724.png',
];
const LOCATIONS = [
  {
    id: 'komorebi_clearing',
    name: 'こもれびの ひろば',
    background: 'bg_world_komorebi_lowangle_20260724.png',
    hideouts: {
      far: 'hideout_world_komorebi_far_v2_20260724.png',
      near: 'hideout_world_komorebi_near_v2_20260724.png',
    },
    hideoutLayouts: {
      far: {
        groundAnchorY: 78.2,
        foregroundTop: 67,
        windowBottom: 36.26,
        windowSafetyBottom: 28.58,
        charWidth: 52,
        charLiftPct: 18.34,
        foregroundMask: 'mask_hideout_world_komorebi_far_v2_20260724.png',
      },
      near: {
        groundAnchorY: 75.3,
        foregroundTop: 64,
        windowBottom: 35.75,
        windowSafetyBottom: 24.26,
        charWidth: 58,
        charLiftPct: 19.56,
        foregroundMask: 'mask_hideout_world_komorebi_near_v2_20260724.png',
      },
    },
    slots: [
      { x: 30.8, groundY: 54, depth: 0.82, hideout: 'far', rotate: 0 },
      { x: 78, groundY: 49, depth: 0.88, hideout: 'far', rotate: 0 },
      { x: 24, groundY: 70.5, depth: 0.93, hideout: 'near', rotate: 0 },
      { x: 76, groundY: 70, depth: 0.95, hideout: 'near', rotate: 0 },
      { x: 18, groundY: 91.5, depth: 1.06, hideout: 'near', rotate: 0 },
      { x: 82, groundY: 91.5, depth: 1.08, hideout: 'near', rotate: 0 },
    ],
  },
  {
    id: 'donguri_path',
    name: 'どんぐりの こみち',
    background: 'bg_world_donguri_overlook_20260724.png',
    hideouts: {
      far: 'hideout_world_donguri_far_v2_20260724.png',
      near: 'hideout_world_donguri_near_v2_20260724.png',
    },
    hideoutLayouts: {
      far: {
        groundAnchorY: 68.2,
        foregroundTop: 60,
        windowBottom: 28.87,
        windowSafetyBottom: 40.33,
        charWidth: 48,
        charLiftPct: 18.34,
        foregroundMask: 'mask_hideout_world_donguri_far_v2_20260724.png',
      },
      near: {
        groundAnchorY: 81,
        foregroundTop: 64,
        windowBottom: 42.72,
        windowSafetyBottom: 35.02,
        charWidth: 52,
        charLiftPct: 20.79,
        foregroundMask: 'mask_hideout_world_donguri_near_v2_20260724.png',
      },
    },
    slots: [
      { x: 30, groundY: 58, depth: 0.88, hideout: 'far', rotate: 0 },
      { x: 82, groundY: 38, depth: 0.86, hideout: 'far', rotate: 0 },
      { x: 27, groundY: 81, depth: 0.95, hideout: 'near', rotate: 0 },
      { x: 72, groundY: 77, depth: 0.97, hideout: 'near', rotate: 0 },
      { x: 50, groundY: 94, depth: 1.06, hideout: 'near', rotate: 0 },
    ],
  },
  {
    id: 'mizube',
    name: 'せせらぎの みずべ',
    background: 'bg_world_mizube_waterline_v2_20260724.png',
    hideouts: {
      far: 'hideout_world_mizube_far_v2_20260724.png',
      near: 'hideout_world_mizube_near_v2_20260724.png',
    },
    hideoutLayouts: {
      far: {
        groundAnchorY: 69.8,
        foregroundTop: 64,
        windowBottom: 27.36,
        windowSafetyBottom: 24.58,
        charWidth: 50,
        charLiftPct: 17.12,
        foregroundMask: 'mask_hideout_world_mizube_far_v2_20260724.png',
      },
      near: {
        groundAnchorY: 66.8,
        foregroundTop: 56,
        windowBottom: 34.06,
        windowSafetyBottom: 25.99,
        charWidth: 55,
        charLiftPct: 19.56,
        foregroundMask: 'mask_hideout_world_mizube_near_v2_20260724.png',
      },
    },
    slots: [
      { x: 13, groundY: 47, depth: 0.82, hideout: 'far', rotate: 0 },
      { x: 80, groundY: 45, depth: 0.86, hideout: 'far', rotate: 0 },
      { x: 20, groundY: 88, depth: 1.04, hideout: 'near', rotate: 0 },
      { x: 80, groundY: 87, depth: 1.02, hideout: 'near', rotate: 0 },
    ],
  },
  {
    id: 'mushroom_hill',
    name: 'きのこの おか',
    background: 'bg_world_mushroom_hill_sunset_20260724.png',
    hideouts: {
      far: 'hideout_world_mushroom_far_20260724.png',
      near: 'hideout_world_mushroom_near_20260724.png',
    },
    hideoutLayouts: {
      far: {
        groundAnchorY: 67.8,
        foregroundTop: 60,
        windowBottom: 28.92,
        windowSafetyBottom: 34.42,
        charWidth: 50,
        charLiftPct: 18.34,
        foregroundMask: 'mask_hideout_world_mushroom_far_20260724.png',
      },
      near: {
        groundAnchorY: 76.3,
        foregroundTop: 64,
        windowBottom: 36.79,
        windowSafetyBottom: 30.59,
        charWidth: 55,
        charLiftPct: 19.56,
        foregroundMask: 'mask_hideout_world_mushroom_near_20260724.png',
      },
    },
    slots: [
      { x: 30, groundY: 55, depth: 0.82, hideout: 'far', rotate: 0 },
      { x: 71, groundY: 40, depth: 0.86, hideout: 'far', rotate: 0 },
      { x: 18, groundY: 78, depth: 0.98, hideout: 'near', rotate: 0 },
      { x: 50, groundY: 84, depth: 1.07, hideout: 'near', rotate: 0 },
      { x: 82, groundY: 77, depth: 1, hideout: 'near', rotate: 0 },
    ],
  },
  {
    id: 'moonlight_forest',
    name: 'つきあかりの もり',
    background: 'bg_world_moonlight_forest_clearing_20260724.png',
    hideouts: {
      far: 'hideout_world_moonlight_far_20260724.png',
      near: 'hideout_world_moonlight_near_20260724.png',
    },
    hideoutLayouts: {
      far: {
        groundAnchorY: 65.8,
        foregroundTop: 60,
        windowBottom: 24.92,
        windowSafetyBottom: 26.25,
        charWidth: 50,
        charLiftPct: 18.34,
        foregroundMask: 'mask_hideout_world_moonlight_far_20260724.png',
      },
      near: {
        groundAnchorY: 67.9,
        foregroundTop: 61,
        windowBottom: 26.97,
        windowSafetyBottom: 25.92,
        charWidth: 55,
        charLiftPct: 19.56,
        foregroundMask: 'mask_hideout_world_moonlight_near_20260724.png',
      },
    },
    slots: [
      { x: 27, groundY: 39, depth: 0.84, hideout: 'far', rotate: 0 },
      { x: 73, groundY: 39, depth: 0.86, hideout: 'far', rotate: 0 },
      { x: 21, groundY: 79, depth: 1.04, hideout: 'near', rotate: 0 },
      { x: 79, groundY: 79, depth: 1.04, hideout: 'near', rotate: 0 },
    ],
  },
];
const EXPECTED_FOREGROUND_MASKS = LOCATIONS.flatMap((location) => (
  ['far', 'near'].map((variant) => location.hideoutLayouts[variant].foregroundMask)
));

function insetBottomPercent(clipPath) {
  const values = String(clipPath).match(/-?\d+(?:\.\d+)?(?=%)/g);
  return values && values.length >= 3 ? Number(values[2]) : Number.NaN;
}

function walkStateAt(routeCompletedRuns) {
  return {
    version: 2,
    routeId: 'mori-5-v1',
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

test('5つの絵本世界・場所別の遠近開口・12種の動物を使い、旧世界素材を読み込まない', async ({ page }) => {
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
  await expect(page.locator('#start-location')).toHaveText('1/5　こもれびの ひろば');
  expect(EXPECTED_FOREGROUND_MASKS).toHaveLength(10);
  expect(new Set(EXPECTED_FOREGROUND_MASKS).size).toBe(10);
  for (const maskName of EXPECTED_FOREGROUND_MASKS) {
    expect(EXPECTED_ASSETS).toContain(maskName);
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
  for (const legacyName of LEGACY_WORLD_ASSETS) {
    expect(loadedPaths).not.toContain(`${ASSET_BASE}${legacyName}`);
  }
  expect(failedAssetRequests).toEqual([]);
  expect(assetResponses.filter(({ status }) => status >= 400)).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('10種類の手前マスクは透過つきで、中央の前縁が水平直線ではない', async ({ page }) => {
  await page.goto('/hyokkori-hightouch/index.html');
  const contours = await page.evaluate(async ({ base, maskNames }) => Promise.all(
    maskNames.map(async (name) => {
      const image = new Image();
      image.decoding = 'async';
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error(`${name} をデコードできません`));
        image.src = base + name;
      });
      if (typeof image.decode === 'function') {
        try { await image.decode(); } catch (_error) { /* onload済みならCanvasで監査可能 */ }
      }

      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const startX = Math.floor(canvas.width * 0.28);
      const endX = Math.ceil(canvas.width * 0.72);
      const stepX = Math.max(1, Math.floor(canvas.width / 240));
      const firstOpaqueY = [];
      let transparentPixels = 0;
      let opaquePixels = 0;

      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += stepX) {
          const alpha = pixels[(y * canvas.width + x) * 4 + 3];
          if (alpha <= 8) transparentPixels += 1;
          if (alpha >= 247) opaquePixels += 1;
        }
      }
      for (let x = startX; x <= endX; x += stepX) {
        for (let y = 0; y < canvas.height; y += 1) {
          if (pixels[(y * canvas.width + x) * 4 + 3] >= 128) {
            firstOpaqueY.push(y);
            break;
          }
        }
      }

      return {
        name,
        width: canvas.width,
        height: canvas.height,
        transparentPixels,
        opaquePixels,
        sampledColumns: firstOpaqueY.length,
        distinctBoundaryRows: new Set(firstOpaqueY).size,
        boundaryRange: firstOpaqueY.length
          ? Math.max(...firstOpaqueY) - Math.min(...firstOpaqueY)
          : 0,
      };
    }),
  ), { base: ASSET_BASE, maskNames: EXPECTED_FOREGROUND_MASKS });

  expect(contours).toHaveLength(10);
  for (const contour of contours) {
    expect(contour.width, `${contour.name}: 正方形幅`).toBe(contour.height);
    expect(contour.transparentPixels, `${contour.name}: 透明域`).toBeGreaterThan(0);
    expect(contour.opaquePixels, `${contour.name}: 不透明な手前域`).toBeGreaterThan(0);
    expect(contour.sampledColumns, `${contour.name}: 中央域の前縁`).toBeGreaterThan(20);
    expect(contour.distinctBoundaryRows, `${contour.name}: 水平線ではない前縁`).toBeGreaterThan(3);
    expect(contour.boundaryRange, `${contour.name}: 前縁の上下変化`).toBeGreaterThan(4);
  }
});

test('かえる・やまねの起き寝画像が透過つきでデコードでき、体が端で切れていない', async ({ page }) => {
  await page.goto('/hyokkori-hightouch/index.html');

  const filenames = [
    'friend_kaeru_awake.png',
    'friend_kaeru_sleeping.png',
    'friend_yamane_awake.png',
    'friend_yamane_sleeping.png',
  ];
  const decoded = await page.evaluate(async ({ base, names }) => Promise.all(names.map(async (name) => {
    const response = await fetch(base + name, { cache: 'no-store' });
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.src = objectUrl;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    URL.revokeObjectURL(objectUrl);
    const { width, height } = canvas;
    const pixels = context.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] <= 8) continue;
      const pixelIndex = (index - 3) / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    const alphaAt = (x, y) => pixels[(y * width + x) * 4 + 3];
    return {
      name,
      status: response.status,
      width,
      height,
      bounds: { minX, minY, maxX, maxY },
      transparentCorners: [
        alphaAt(0, 0),
        alphaAt(width - 1, 0),
        alphaAt(0, height - 1),
        alphaAt(width - 1, height - 1),
      ].every((alpha) => alpha === 0),
    };
  })), { base: ASSET_BASE, names: filenames });

  for (const asset of decoded) {
    expect(asset.status).toBe(200);
    expect([asset.width, asset.height]).toEqual([1200, 1200]);
    expect(asset.transparentCorners).toBe(true);
    expect(asset.bounds.minX).toBeGreaterThanOrEqual(24);
    expect(asset.bounds.minY).toBeGreaterThanOrEqual(24);
    expect(asset.width - 1 - asset.bounds.maxX).toBeGreaterThanOrEqual(24);
    expect(asset.height - 1 - asset.bounds.maxY).toBeGreaterThanOrEqual(24);
    expect(asset.bounds.maxX - asset.bounds.minX).toBeGreaterThan(600);
    expect(asset.bounds.maxY - asset.bounds.minY).toBeGreaterThan(700);
  }
});

test('5地点を単色カラコレにせず、色相の豊かさ・明るさ・構図差を保つ', async ({ page }) => {
  test.setTimeout(35_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await setupApp(page);
  await page.goto('/hyokkori-hightouch/index.html');
  await waitForLocation(page, LOCATIONS[0]);

  const palettes = await page.evaluate(async ({ base, backgrounds }) => {
    const hueOf = (r, g, b) => {
      const red = r / 255;
      const green = g / 255;
      const blue = b / 255;
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const delta = max - min;
      if (!delta) return 0;
      let hue = max === red
        ? ((green - blue) / delta) % 6
        : max === green
          ? ((blue - red) / delta) + 2
          : ((red - green) / delta) + 4;
      hue *= 60;
      return hue < 0 ? hue + 360 : hue;
    };

    return Promise.all(backgrounds.map(async ({ id, filename }) => {
      const response = await fetch(base + filename, { cache: 'no-store' });
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);

      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const sums = [0, 0, 0];
      let saturated = 0;
      let lumaSum = 0;
      let lumaSquareSum = 0;
      let centerLuma = 0;
      let centerCount = 0;
      const hueBins = Array(24).fill(0);
      const lumaGridSums = Array(80 * 45).fill(0);
      const lumaGridCounts = Array(80 * 45).fill(0);
      const pixelCount = pixels.length / 4;

      for (let index = 0; index < pixels.length; index += 4) {
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        sums[0] += r;
        sums[1] += g;
        sums[2] += b;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max ? (max - min) / max : 0;
        if (saturation > 0.12) {
          saturated += 1;
          const hue = hueOf(r, g, b);
          hueBins[Math.min(hueBins.length - 1, Math.floor(hue / (360 / hueBins.length)))] += 1;
        }

        const pixelIndex = index / 4;
        const x = pixelIndex % canvas.width;
        const y = Math.floor(pixelIndex / canvas.width);
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        lumaSum += luma;
        lumaSquareSum += luma ** 2;
        const gridIndex = Math.floor(y / 2) * 80 + Math.floor(x / 2);
        lumaGridSums[gridIndex] += luma;
        lumaGridCounts[gridIndex] += 1;
        if (x >= 67 && x <= 93 && y >= 39 && y <= 59) {
          centerLuma += luma;
          centerCount += 1;
        }
      }

      const hueCount = hueBins.reduce((sum, count) => sum + count, 0);
      const hueProbabilities = hueBins
        .filter((count) => count > 0)
        .map((count) => count / Math.max(1, hueCount));
      const hueEntropy = -hueProbabilities.reduce(
        (sum, probability) => sum + probability * Math.log(probability),
        0,
      ) / Math.log(hueBins.length);
      const meanLuma = lumaSum / pixelCount;

      return {
        id,
        status: response.status,
        width: image.naturalWidth,
        height: image.naturalHeight,
        mean: sums.map((sum) => sum / pixelCount),
        saturatedRatio: saturated / pixelCount,
        dominantHueRatio: Math.max(...hueBins) / Math.max(1, hueCount),
        hueEntropy,
        lumaStd: Math.sqrt(Math.max(0, lumaSquareSum / pixelCount - meanLuma ** 2)),
        centerLuma: centerLuma / centerCount,
        lumaGrid: lumaGridSums.map((sum, index) => sum / lumaGridCounts[index]),
      };
    }));
  }, {
    base: ASSET_BASE,
    backgrounds: LOCATIONS.map(({ id, background }) => ({ id, filename: background })),
  });

  const byId = Object.fromEntries(palettes.map((palette) => [palette.id, palette]));
  for (const palette of palettes) {
    expect(palette.status, `${palette.id}: 背景レスポンス`).toBe(200);
    expect([palette.width, palette.height], `${palette.id}: 背景サイズ`).toEqual([1600, 900]);
    expect(palette.saturatedRatio, `${palette.id}: 彩度`).toBeGreaterThan(0.35);
    expect(palette.dominantHueRatio, `${palette.id}: 単一色相への偏り`).toBeLessThan(0.65);
    // The moonlit finale intentionally keeps a tighter blue-violet harmony and
    // a brighter moonbeam clearing than the daylight stages.
    const isMoonlight = palette.id === 'moonlight_forest';
    const minHueEntropy = isMoonlight ? 0.24 : 0.30;
    const maxCenterLuma = isMoonlight ? 230 : 210;
    const maxLumaStd = isMoonlight ? 45 : 35;
    expect(palette.hueEntropy, `${palette.id}: 色相の豊かさ`).toBeGreaterThan(minHueEntropy);
    expect(palette.centerLuma, `${palette.id}: 中央の最低明度`).toBeGreaterThan(145);
    expect(palette.centerLuma, `${palette.id}: 中央の最高明度`).toBeLessThan(maxCenterLuma);
    expect(palette.lumaStd, `${palette.id}: 明暗差の下限`).toBeGreaterThan(15);
    expect(palette.lumaStd, `${palette.id}: 明暗差の上限`).toBeLessThan(maxLumaStd);
  }

  const rgbToLab = (rgb) => {
    const linear = rgb.map((value) => {
      const channel = value / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const xyz = [
      (linear[0] * 0.4124 + linear[1] * 0.3576 + linear[2] * 0.1805) / 0.95047,
      linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722,
      (linear[0] * 0.0193 + linear[1] * 0.1192 + linear[2] * 0.9505) / 1.08883,
    ].map((value) => (value > 0.008856
      ? Math.cbrt(value)
      : 7.787 * value + 16 / 116));
    return [
      116 * xyz[1] - 16,
      500 * (xyz[0] - xyz[1]),
      200 * (xyz[1] - xyz[2]),
    ];
  };
  const colorDistance = (left, right) => {
    const leftLab = rgbToLab(left.mean);
    const rightLab = rgbToLab(right.mean);
    return Math.hypot(
      leftLab[0] - rightLab[0],
      leftLab[1] - rightLab[1],
      leftLab[2] - rightLab[2],
    );
  };
  const compositionCorrelation = (left, right) => {
    const leftMean = left.lumaGrid.reduce((sum, value) => sum + value, 0) / left.lumaGrid.length;
    const rightMean = right.lumaGrid.reduce((sum, value) => sum + value, 0) / right.lumaGrid.length;
    let covariance = 0;
    let leftVariance = 0;
    let rightVariance = 0;
    for (let index = 0; index < left.lumaGrid.length; index += 1) {
      const leftDelta = left.lumaGrid[index] - leftMean;
      const rightDelta = right.lumaGrid[index] - rightMean;
      covariance += leftDelta * rightDelta;
      leftVariance += leftDelta ** 2;
      rightVariance += rightDelta ** 2;
    }
    return covariance / Math.sqrt(leftVariance * rightVariance);
  };
  const pairs = [
    [byId.komorebi_clearing, byId.donguri_path],
    [byId.donguri_path, byId.mizube],
    [byId.mizube, byId.komorebi_clearing],
    [byId.mizube, byId.mushroom_hill],
    [byId.mushroom_hill, byId.moonlight_forest],
    [byId.moonlight_forest, byId.komorebi_clearing],
  ];
  const correlations = [];
  for (const [left, right] of pairs) {
    expect(colorDistance(left, right)).toBeGreaterThan(8);
    const correlation = Math.abs(compositionCorrelation(left, right));
    correlations.push(correlation);
    expect(correlation).toBeLessThan(0.55);
  }
  expect(correlations.reduce((sum, value) => sum + value, 0) / correlations.length).toBeLessThan(0.48);
});

test('5場所×4画面で地面アンカー・遠近・専用輪郭マスク・中央コンボ余白を保つ', async ({ page }) => {
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

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (let locationIndex = 0; locationIndex < LOCATIONS.length; locationIndex += 1) {
      const location = LOCATIONS[locationIndex];
      await loadLocation(page, locationIndex);

      const geometry = await page.evaluate(() => {
        const stage = document.getElementById('stage');
        const stageRect = stage.getBoundingClientRect();
        document.querySelectorAll('#start-screen, #countdown-screen, #result-overlay, #landscape-notice')
          .forEach((element) => { element.style.display = 'none'; });
        const comboHud = document.getElementById('combo-hud');
        const comboCount = document.getElementById('combo-count');
        comboHud.classList.add('is-visible');
        comboHud.dataset.tier = '4';
        comboHud.style.setProperty('--combo-grow', '50px');
        comboCount.textContent = '88';
        const comboCore = comboHud.querySelector('.combo-core');
        const impactScale = Number.parseFloat(
          getComputedStyle(comboHud).getPropertyValue('--combo-impact-scale'),
        ) || 1;
        comboCore.style.transform = `scale(${impactScale})`;
        const comboRect = comboCore.getBoundingClientRect();
        document.getElementById('board').inert = false;
        const holeElements = Array.from(document.querySelectorAll('.hh-hole'));
        holeElements.forEach((hole) => {
          hole.disabled = false;
          hole.tabIndex = 0;
        });
        return {
          stageLocation: stage.dataset.location,
          backgroundImage: getComputedStyle(stage).backgroundImage,
          overflowX: document.documentElement.scrollWidth - window.innerWidth,
          overflowY: document.documentElement.scrollHeight - window.innerHeight,
          holes: holeElements.map((hole) => {
            const stack = hole.querySelector('.hh-ground-stack');
            const windowEl = hole.querySelector('.hh-window');
            const foreground = hole.querySelector('.hh-hideout-foreground');
            const base = hole.querySelector('.hh-hideout-base');
            const stackRect = stack.getBoundingClientRect();
            const windowRect = windowEl.getBoundingClientRect();
            const foregroundRect = foreground.getBoundingClientRect();
            const baseRect = base.getBoundingClientRect();
            const hitRect = hole.getBoundingClientRect();
            const foregroundStyle = getComputedStyle(foreground);
            const windowCenterX = windowRect.left + windowRect.width / 2;
            const windowCenterY = windowRect.top + windowRect.height / 2;
            const foregroundCenterX = foregroundRect.left + foregroundRect.width / 2;
            const foregroundCenterY = foregroundRect.top + foregroundRect.height / 2;
            const baseCenterX = baseRect.left + baseRect.width / 2;
            const baseCenterY = baseRect.top + baseRect.height / 2;
            const holeStyle = getComputedStyle(hole);
            const stackStyle = getComputedStyle(stack);
            const groundAnchorY = Number.parseFloat(holeStyle.getPropertyValue('--ground-anchor-y'));
            const foregroundTop = Number.parseFloat(holeStyle.getPropertyValue('--foreground-top'));
            const windowBottom = Number.parseFloat(holeStyle.getPropertyValue('--window-bottom'));
            const windowSafetyBottom = Number.parseFloat(
              holeStyle.getPropertyValue('--window-safety-bottom'),
            );
            const charWidth = Number.parseFloat(holeStyle.getPropertyValue('--char-width'));
            const charLiftPct = Number.parseFloat(holeStyle.getPropertyValue('--char-ground-lift'));
            const slotX = Number.parseFloat(hole.style.getPropertyValue('--slot-x'));
            const slotGroundY = Number.parseFloat(hole.style.getPropertyValue('--slot-y'));
            const expectedGroundX = stageRect.left + stageRect.width * slotX / 100;
            const expectedGroundY = stageRect.top + stageRect.height * slotGroundY / 100;
            const stackGroundX = stackRect.left + stackRect.width / 2;
            const stackGroundY = stackRect.top;
            const baseAnchorY = baseRect.top + baseRect.height * groundAnchorY / 100;
            const foregroundMaskImage = (
              foregroundStyle.maskImage && foregroundStyle.maskImage !== 'none'
                ? foregroundStyle.maskImage
                : foregroundStyle.webkitMaskImage
            );
            const foregroundMaskSize = foregroundStyle.maskSize || foregroundStyle.webkitMaskSize;
            const foregroundMaskRepeat = foregroundStyle.maskRepeat || foregroundStyle.webkitMaskRepeat;
            return {
              tagName: hole.tagName,
              type: hole.getAttribute('type'),
              hole: hole.getAttribute('data-hole'),
              basePath: new URL(base.getAttribute('src'), location.href).pathname,
              foregroundPath: new URL(foreground.getAttribute('src'), location.href).pathname,
              hideoutVariant: hole.dataset.hideoutVariant,
              windowZ: Number(getComputedStyle(windowEl).zIndex),
              foregroundZ: Number(getComputedStyle(foreground).zIndex),
              pointerEvents: foregroundStyle.pointerEvents,
              foregroundClip: foregroundStyle.clipPath,
              foregroundMaskImage,
              foregroundMaskSize,
              foregroundMaskRepeat,
              windowClip: getComputedStyle(windowEl).clipPath,
              stackTransformOriginY: Number.parseFloat(stackStyle.transformOrigin.split(' ')[1]),
              depthScale: Number.parseFloat(holeStyle.getPropertyValue('--depth-scale')),
              hideoutRotate: Number.parseFloat(holeStyle.getPropertyValue('--hideout-rotate')),
              groundAnchorY,
              foregroundTop,
              windowBottom,
              windowSafetyBottom,
              charWidth,
              charLiftPct,
              slotX,
              slotGroundY,
              dataGroundY: Number.parseFloat(hole.dataset.groundY),
              hitWidth: hitRect.width,
              hitHeight: hitRect.height,
              visibleHitWidth: Math.max(
                0,
                Math.min(hitRect.right, stageRect.right) - Math.max(hitRect.left, stageRect.left),
              ),
              visibleHitHeight: Math.max(
                0,
                Math.min(hitRect.bottom, stageRect.bottom) - Math.max(hitRect.top, stageRect.top),
              ),
              baseWidth: baseRect.width,
              windowWidth: windowRect.width,
              columnRatio: (stackGroundX - stageRect.left) / stageRect.width,
              groundRowRatio: (stackGroundY - stageRect.top) / stageRect.height,
              centerHitOwnHole:
                document.elementFromPoint(windowCenterX, windowCenterY)?.closest('.hh-hole') === hole,
              comboClearance: Math.max(
                Math.max(windowRect.left - comboRect.right, comboRect.left - windowRect.right),
                Math.max(windowRect.top - comboRect.bottom, comboRect.top - windowRect.bottom),
              ),
              groundContactError: Math.hypot(
                stackGroundX - expectedGroundX,
                stackGroundY - expectedGroundY,
              ),
              assetGroundAnchorError: Math.abs(baseAnchorY - stackGroundY),
              baseForegroundCenterError: Math.hypot(
                baseCenterX - foregroundCenterX,
                baseCenterY - foregroundCenterY,
              ),
              baseForegroundWidthError: Math.abs(baseRect.width - foregroundRect.width),
            };
          }),
        };
      });

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
        expect(hole.hideoutVariant).toBe(slot.hideout);
        expect(hole.basePath).toBe(`${ASSET_BASE}${location.hideouts[slot.hideout]}`);
        expect(hole.foregroundPath).toBe(hole.basePath);
        expect(hole.foregroundZ).toBeGreaterThan(hole.windowZ);
        expect(hole.pointerEvents).toBe('none');
        expect(hole.foregroundClip).toBe('none');
        expect(hole.foregroundMaskImage).toContain(
          `${ASSET_BASE}${location.hideoutLayouts[slot.hideout].foregroundMask}`,
        );
        expect(hole.foregroundMaskSize).toBe('100% 100%');
        expect(hole.foregroundMaskRepeat).toBe('no-repeat');
        expect(hole.windowClip).not.toBe('none');
        expect(hole.hitWidth).toBeGreaterThanOrEqual(44);
        expect(hole.hitHeight).toBeGreaterThanOrEqual(44);
        expect(
          hole.visibleHitWidth,
          `${location.id} ${viewport.width}x${viewport.height} hole ${index}: 画面内タップ幅`,
        ).toBeGreaterThanOrEqual(44);
        expect(
          hole.visibleHitHeight,
          `${location.id} ${viewport.width}x${viewport.height} hole ${index}: 画面内タップ高さ`,
        ).toBeGreaterThanOrEqual(44);
        expect(hole.centerHitOwnHole).toBe(true);
        expect(
          hole.comboClearance,
          `${location.id} ${viewport.width}x${viewport.height} hole ${index}: 中央コンボとの余白`,
        ).toBeGreaterThanOrEqual(2);
        expect(hole.slotX).toBeCloseTo(slot.x, 3);
        expect(hole.slotGroundY).toBeCloseTo(slot.groundY, 3);
        expect(hole.dataGroundY).toBeCloseTo(slot.groundY, 3);
        expect(hole.depthScale).toBeCloseTo(slot.depth, 3);
        expect(hole.hideoutRotate).toBeCloseTo(slot.rotate, 3);
        expect(hole.stackTransformOriginY).toBeCloseTo(0, 3);
        expect(hole.groundAnchorY).toBe(location.hideoutLayouts[slot.hideout].groundAnchorY);
        expect(hole.foregroundTop).toBe(location.hideoutLayouts[slot.hideout].foregroundTop);
        expect(hole.windowBottom).toBe(location.hideoutLayouts[slot.hideout].windowBottom);
        expect(hole.windowSafetyBottom).toBe(
          location.hideoutLayouts[slot.hideout].windowSafetyBottom,
        );
        expect(hole.windowSafetyBottom).not.toBe(hole.windowBottom);
        expect(
          Math.abs(insetBottomPercent(hole.windowClip) - hole.windowSafetyBottom),
          `${location.id} ${viewport.width}x${viewport.height} hole ${index}: 安全クリップ下端`,
        ).toBeLessThan(0.001);
        expect(
          Math.abs(insetBottomPercent(hole.windowClip) - hole.windowBottom),
          `${location.id} ${viewport.width}x${viewport.height} hole ${index}: 旧水平線を表示へ戻さない`,
        ).toBeGreaterThan(0.001);
        expect(hole.charWidth).toBe(location.hideoutLayouts[slot.hideout].charWidth);
        expect(hole.charLiftPct).toBe(location.hideoutLayouts[slot.hideout].charLiftPct);
        expect(
          Math.abs(hole.columnRatio - slot.x / 100),
          `${location.id} ${viewport.width}x${viewport.height} hole ${index}: x座標`,
        ).toBeLessThan(0.006);
        expect(
          Math.abs(hole.groundRowRatio - slot.groundY / 100),
          `${location.id} ${viewport.width}x${viewport.height} hole ${index}: 地面のy座標`,
        ).toBeLessThan(0.006);
        expect(
          hole.groundContactError,
          `${location.id} ${viewport.width}x${viewport.height} hole ${index}: stackと背景地面の接地点`,
        ).toBeLessThanOrEqual(1.5);
        expect(
          hole.assetGroundAnchorError,
          `${location.id} ${viewport.width}x${viewport.height} hole ${index}: 画像内アンカーとstack接地点`,
        ).toBeLessThanOrEqual(1.5);
        expect(
          hole.baseForegroundCenterError,
          `${location.id} ${viewport.width}x${viewport.height} hole ${index}: 前後画像の中心`,
        ).toBeLessThanOrEqual(0.5);
        expect(
          hole.baseForegroundWidthError,
          `${location.id} ${viewport.width}x${viewport.height} hole ${index}: 前後画像の幅`,
        ).toBeLessThanOrEqual(0.5);
      }

      const far = geometry.holes.filter((hole) => hole.hideoutVariant === 'far');
      const near = geometry.holes.filter((hole) => hole.hideoutVariant === 'near');
      expect(far.length).toBeGreaterThanOrEqual(2);
      expect(near.length).toBeGreaterThanOrEqual(2);
      const baseDepthRatio = near[0].baseWidth / far[0].baseWidth;
      const characterDepthRatio = near[0].windowWidth / far[0].windowWidth;
      const expectedDepthRatio = near[0].depthScale / far[0].depthScale;
      const expectedCharacterRatio = expectedDepthRatio * near[0].charWidth / far[0].charWidth;
      expect(baseDepthRatio).toBeCloseTo(expectedDepthRatio, 1);
      expect(characterDepthRatio).toBeCloseTo(expectedCharacterRatio, 1);
    }
  }
});

test('5場所×4画面で、動物の見えている輪郭のすぐ外をタップして正しい穴へ当たる', async ({ page }) => {
  test.setTimeout(90_000);
  await page.clock.install({ time: new Date('2026-07-24T00:00:00Z') });
  await setupApp(page);
  await page.addInitScript(() => { Math.random = () => 0.75; });
  await page.goto('/hyokkori-hightouch/index.html');
  await waitForLocation(page, LOCATIONS[0]);

  const viewports = [
    { width: 568, height: 320 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
    { width: 1366, height: 768 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (let locationIndex = 0; locationIndex < LOCATIONS.length; locationIndex += 1) {
      const location = LOCATIONS[locationIndex];
      await loadLocation(page, locationIndex);
      await page.locator('#start-btn').click({ force: true });
      await page.clock.runFor(1_250);
      const awakeHole = await advanceToAwake(page);
      const holeIndex = await awakeHole.getAttribute('data-hole');
      await page.clock.runFor(340);

      const forgivingPoint = await awakeHole.evaluate(async (hole) => {
        const image = hole.querySelector('.hh-char');
        const windowEl = hole.querySelector('.hh-window');
        if (typeof image.decode === 'function') await image.decode();
        const sampleSize = 120;
        const canvas = document.createElement('canvas');
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, sampleSize, sampleSize);
        const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;
        const opaque = [];
        for (let y = 0; y < sampleSize; y += 1) {
          for (let x = 0; x < sampleSize; x += 1) {
            if (pixels[(y * sampleSize + x) * 4 + 3] <= 48) continue;
            opaque.push({ x, y });
          }
        }
        const imageRect = image.getBoundingClientRect();
        const buttonRect = hole.getBoundingClientRect();
        const windowRect = windowEl.getBoundingClientRect();
        const stageRect = document.getElementById('stage').getBoundingClientRect();
        const windowBottom = Number.parseFloat(
          getComputedStyle(hole).getPropertyValue('--window-bottom'),
        );
        const visibleBottom = Math.min(
          imageRect.bottom,
          windowRect.top + windowRect.height * (1 - windowBottom / 100),
        );
        const padX = Math.max(10, Math.min(18, imageRect.width * 0.12));
        const padTop = Math.max(8, Math.min(16, imageRect.height * 0.1));
        const padBottom = Math.max(6, Math.min(12, imageRect.height * 0.08));
        const targetRect = {
          left: imageRect.left - padX,
          right: imageRect.right + padX,
          top: imageRect.top - padTop,
          bottom: visibleBottom + padBottom,
        };
        const inside = (point, rect) => (
          point.x >= rect.left && point.x <= rect.right
          && point.y >= rect.top && point.y <= rect.bottom
        );
        const outsideButton = (point) => !inside(point, buttonRect);
        const visibleOpaque = opaque
          .map(({ x, y }) => ({
            x: imageRect.left + (x + 0.5) * imageRect.width / sampleSize,
            y: imageRect.top + (y + 0.5) * imageRect.height / sampleSize,
          }))
          .filter((point) => point.y <= visibleBottom && inside(point, stageRect));
        let best = null;
        for (const pixel of visibleOpaque) {
          const candidates = [
            { x: pixel.x, y: buttonRect.top - 2 },
            { x: pixel.x, y: buttonRect.bottom + 2 },
            { x: buttonRect.left - 2, y: pixel.y },
            { x: buttonRect.right + 2, y: pixel.y },
          ];
          for (const candidate of candidates) {
            if (!inside(candidate, targetRect) || !inside(candidate, stageRect) || !outsideButton(candidate)) {
              continue;
            }
            const distance = Math.hypot(candidate.x - pixel.x, candidate.y - pixel.y);
            if (!best || distance < best.distanceToVisiblePixel) {
              best = { ...candidate, distanceToVisiblePixel: distance };
            }
          }
        }
        return {
          point: best,
          opaquePixelCount: visibleOpaque.length,
        };
      });

      expect(
        forgivingPoint.opaquePixelCount,
        `${location.id} ${viewport.width}x${viewport.height}: 画面内の動物画素`,
      ).toBeGreaterThan(0);
      expect(
        forgivingPoint.point,
        `${location.id} ${viewport.width}x${viewport.height}: 従来button外の補助タップ点`,
      ).not.toBeNull();
      expect(
        forgivingPoint.point.distanceToVisiblePixel,
        `${location.id} ${viewport.width}x${viewport.height}: 動物輪郭からの距離`,
      ).toBeLessThanOrEqual(24);

      const scoreBefore = await page.locator('#hud-score').textContent();
      if (viewport.width === 568 && locationIndex === 0) {
        await page.locator('#stage').evaluate((stage, point) => {
          const start = new Event('touchstart', { bubbles: true, cancelable: true });
          Object.defineProperty(start, 'changedTouches', {
            value: [{ clientX: point.x, clientY: point.y }],
          });
          stage.dispatchEvent(start);
          stage.dispatchEvent(new Event('touchend', { bubbles: true, cancelable: true }));
        }, forgivingPoint.point);
      } else {
        await page.mouse.click(forgivingPoint.point.x, forgivingPoint.point.y);
      }
      await expect(page.locator('#board')).toHaveAttribute('data-last-successful-hole', holeIndex || '');
      await expect(page.locator('#hud-score')).not.toHaveText(scoreBefore || '');
    }
  }
});

test('右上の月・光・ボーナス表示を動物マスクの外へ分離し、4画面で切らない', async ({ page }) => {
  test.setTimeout(35_000);
  await setupApp(page);
  await page.goto('/hyokkori-hightouch/index.html');
  await waitForLocation(page, LOCATIONS[0]);
  // 5場所で最も右へ寄る x=82 の上段穴でも画面端へ切れないことを確認する。
  await loadLocation(page, 1);

  for (const viewport of [
    { width: 568, height: 320 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    const geometry = await page.evaluate(async () => {
      document.querySelectorAll('#start-screen, #countdown-screen, #result-overlay, #landscape-notice')
        .forEach((element) => { element.style.display = 'none'; });

      const topHoles = Array.from(document.querySelectorAll('.hh-hole')).filter((hole) => (
        Number.parseFloat(hole.style.getPropertyValue('--slot-y')) < 50
      ));
      const hole = topHoles.reduce((rightmost, candidate) => (
        Number.parseFloat(candidate.style.getPropertyValue('--slot-x'))
          > Number.parseFloat(rightmost.style.getPropertyValue('--slot-x'))
          ? candidate
          : rightmost
      ));
      const stage = document.getElementById('stage');
      const wrap = hole.querySelector('.hh-char-wrap');
      const windowEl = hole.querySelector('.hh-window');
      const rise = hole.querySelector('.hh-char-rise');
      const character = hole.querySelector('.hh-char');
      const sparkle = hole.querySelector('.hh-sparkle');
      const sleepFx = hole.querySelector('.hh-sleep-fx');
      const bonusBadge = hole.querySelector('.hh-bonus-badge');
      const scorePop = hole.querySelector('.hh-score-pop');
      const shhBubble = hole.querySelector('.hh-shh-bubble');
      const effects = [sparkle, sleepFx, hole.querySelector('.hh-hit-fx'), bonusBadge, scorePop, shhBubble];

      const rect = (element) => {
        const box = element.getBoundingClientRect();
        return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
      };
      const within = (inner, outer) => (
        inner.left >= outer.left
        && inner.top >= outer.top
        && inner.right <= outer.right
        && inner.bottom <= outer.bottom
      );
      const stageRect = rect(stage);

      // ねむり: アニメ中でも最も上へ浮く位置を固定して月全体を見る。
      wrap.className = 'hh-char-wrap is-visible is-sleeping';
      character.src = '../assets/images/hyokkori-hightouch/friend_fukurou_sleeping.png';
      sleepFx.style.animation = 'none';
      sleepFx.style.transform = 'translateY(-7%) rotate(2deg)';
      const moonRect = rect(sleepFx);
      const moonOpacity = Number.parseFloat(getComputedStyle(sleepFx).opacity);
      const moonTransform = getComputedStyle(sleepFx).transform;

      // おきている子: CSS光点の本体と光彩を表示状態で確認する。
      wrap.className = 'hh-char-wrap is-visible';
      character.src = '../assets/images/hyokkori-hightouch/friend_kitsune_awake.png';
      sparkle.style.animation = 'none';
      const sparkleRect = rect(sparkle);

      // ボーナス: 実画像内の左右の星、drop-shadow、札、背景光を同時に確認する。
      wrap.className = 'hh-char-wrap is-visible is-bonus';
      character.src = '../assets/images/hyokkori-hightouch/friend_hikari_momonga_bonus_awake.png';
      if (typeof character.decode === 'function') {
        try { await character.decode(); } catch (_error) { /* complete/naturalWidth を下で検証 */ }
      }
      const badgeRect = rect(bonusBadge);

      // 最大幅のリアルタイム加点も同じマスク外レイヤーに保つ。
      scorePop.textContent = 'キラキラ ＋40';
      scorePop.style.opacity = '1';
      scorePop.style.animation = 'none';
      scorePop.style.transform = 'translate(-50%, -50%) scale(1)';
      const scoreRect = rect(scorePop);
      return {
        wrapOverflow: getComputedStyle(wrap).overflow,
        windowOverflow: getComputedStyle(windowEl).overflow,
        windowClip: getComputedStyle(windowEl).clipPath,
        windowBottom: Number.parseFloat(getComputedStyle(hole).getPropertyValue('--window-bottom')),
        windowSafetyBottom: Number.parseFloat(
          getComputedStyle(hole).getPropertyValue('--window-safety-bottom'),
        ),
        characterMasked: windowEl.contains(rise) && windowEl.contains(character),
        effectsOutsideMask: effects.every((effect) => effect.parentElement === wrap && !windowEl.contains(effect)),
        moonOpacity,
        moonTransform,
        moonWithinStage: within(moonRect, stageRect),
        sparkleOpacity: Number.parseFloat(getComputedStyle(sparkle).opacity),
        sparkleShadow: getComputedStyle(sparkle).boxShadow,
        sparkleWithinStage: within(sparkleRect, stageRect),
        bonusImageReady: character.complete && character.naturalWidth > 0,
        bonusCharacterFilter: getComputedStyle(character).filter,
        bonusBadgeOpacity: Number.parseFloat(getComputedStyle(bonusBadge).opacity),
        bonusBadgeVisibility: getComputedStyle(bonusBadge).visibility,
        bonusBadgeWithinStage: within(badgeRect, stageRect),
        scoreWithinStage: within(scoreRect, stageRect),
        bonusGlow: getComputedStyle(windowEl, '::before').boxShadow,
        bonusGlowContent: getComputedStyle(windowEl, '::before').content,
        unmaskedWrapGlow: getComputedStyle(wrap, '::before').content,
      };
    });

    expect(geometry.wrapOverflow).toBe('visible');
    expect(geometry.windowOverflow).toBe('visible');
    expect(geometry.windowClip).toContain('-30%');
    expect(geometry.windowSafetyBottom).not.toBe(geometry.windowBottom);
    expect(
      Math.abs(insetBottomPercent(geometry.windowClip) - geometry.windowSafetyBottom),
    ).toBeLessThan(0.001);
    expect(
      Math.abs(insetBottomPercent(geometry.windowClip) - geometry.windowBottom),
    ).toBeGreaterThan(0.001);
    expect(geometry.characterMasked).toBe(true);
    expect(geometry.effectsOutsideMask).toBe(true);
    expect(geometry.moonOpacity).toBe(1);
    expect(geometry.moonTransform).not.toBe('none');
    expect(geometry.moonWithinStage).toBe(true);
    expect(geometry.sparkleOpacity).toBe(1);
    expect(geometry.sparkleShadow).not.toBe('none');
    expect(geometry.sparkleWithinStage).toBe(true);
    expect(geometry.bonusImageReady).toBe(true);
    expect(geometry.bonusCharacterFilter).not.toBe('none');
    expect(geometry.bonusBadgeOpacity).toBe(1);
    expect(geometry.bonusBadgeVisibility).toBe('visible');
    expect(geometry.bonusBadgeWithinStage).toBe(true);
    expect(geometry.scoreWithinStage).toBe(true);
    expect(geometry.bonusGlow).not.toBe('none');
    expect(geometry.bonusGlowContent).not.toBe('none');
    expect(geometry.unmaskedWrapGlow).toBe('none');
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
  const firstSuccessfulIndex = await focusableHole.getAttribute('data-hole');
  await focusableHole.focus();
  const scoreBefore = await page.locator('#hud-score').textContent();
  await page.keyboard.press('Enter');
  await expect(page.locator('#hud-score')).not.toHaveText(scoreBefore || '');
  await page.waitForFunction((excludedIndex) => Array.from(document.querySelectorAll('.hh-hole'))
    .some((hole) => (
      hole.getAttribute('data-hole') !== excludedIndex
      && hole.querySelector('.hh-char-wrap')?.classList.contains('is-visible')
      && !hole.querySelector('.hh-char-wrap')?.classList.contains('is-sleeping')
    )), firstSuccessfulIndex, { timeout: 3_500 });

  await page.locator('.pono-menu-toggle').click({ force: true });
  await page.getByText('あそびかた', { exact: true }).click({ force: true });
  await expect(page.locator('#tut-bubble')).not.toHaveClass(/hidden/);

  const timerBefore = await page.locator('#hud-timer').textContent();
  const scoreDuringTutorial = await page.locator('#hud-score').textContent();
  const lastSuccessfulDuringTutorial = await page.locator('#board').getAttribute('data-last-successful-hole');
  const tutorialTapPoint = await page.locator('.hh-char-wrap.is-visible:not(.is-sleeping) .hh-char')
    .first()
    .evaluate((image) => {
      const rect = image.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.3 };
    });
  await page.locator('#stage').dispatchEvent('pointerdown', {
    pointerType: 'mouse',
    clientX: tutorialTapPoint.x,
    clientY: tutorialTapPoint.y,
  });
  await expect(page.locator('#hud-score')).toHaveText(scoreDuringTutorial || '');
  await expect(page.locator('#board')).toHaveAttribute(
    'data-last-successful-hole',
    lastSuccessfulDuringTutorial || '',
  );
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
