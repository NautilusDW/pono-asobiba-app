// hatake-nikki/: 作物の立て札と、生成画像による水やり済み表示の回帰テスト。
// 色だけに頼らず「湿った土・水色の縁・しずく付き立て札」が同時に見えること、
// 立て札が植え付けから収穫まで seedId と同期することを確認する。

const { test, expect } = require('@playwright/test');

test.use({ hasTouch: true });

const URL = '/hatake-nikki/index.html';

async function waitForGameReady(page) {
  await page.waitForFunction(
    () => document.body.classList.contains('pono-game-ready'),
    null,
    { timeout: 10000 }
  );
}

async function gotoSeededField(page, viewport, plots) {
  await page.setViewportSize(viewport);
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto(URL);
  await page.evaluate((seededPlots) => {
    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, '0');
    const todayKey = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    localStorage.setItem('pono_hatake_tut_seen_v1', '1');
    localStorage.setItem('pono_hatake_state_v1', JSON.stringify({
      lastSeenKey: todayKey,
      plots: seededPlots
    }));
  }, plots);
  await page.reload();
  await waitForGameReady(page);
  await page.locator('#start-btn').click({ force: true });
  await expect(page.locator('#field-screen')).toHaveClass(/show/);
  await page.waitForTimeout(100);
}

async function tapPlot(page, selector) {
  await page.locator(selector).evaluate((el) => {
    const r = el.getBoundingClientRect();
    const touch = new Touch({
      identifier: 1427,
      target: el,
      clientX: r.x + r.width / 2,
      clientY: r.y + r.height / 2
    });
    el.dispatchEvent(new TouchEvent('touchstart', {
      changedTouches: [touch], touches: [touch], bubbles: true, cancelable: true
    }));
    el.dispatchEvent(new TouchEvent('touchend', {
      changedTouches: [touch], touches: [], bubbles: true, cancelable: true
    }));
  });
}

function pointInsidePlotDiamond(point, plotBox) {
  const x = (point.x - plotBox.x) / plotBox.width;
  const y = (point.y - plotBox.y) / plotBox.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return false;

  // .plot-hit-area の clip-path:
  // polygon(50% 0%, 100% 46%, 50% 100%, 0% 46%)
  if (y <= 0.46) {
    const halfWidth = 0.5 * (y / 0.46);
    return x >= 0.5 - halfWidth && x <= 0.5 + halfWidth;
  }
  const halfWidth = 0.5 * ((1 - y) / 0.54);
  return x >= 0.5 - halfWidth && x <= 0.5 + halfWidth;
}

const visualState = [
  { seedId: 'tomato', daysGrown: 0, wateredToday: true, wilted: false, bug: false },
  { seedId: 'ninjin', daysGrown: 1, wateredToday: true, wilted: false, bug: false },
  { seedId: 'tomato', daysGrown: 2, wateredToday: true, wilted: false, bug: false },
  { seedId: 'ninjin', daysGrown: 0, wateredToday: true, wilted: false, bug: false }
];

for (const viewport of [
  { width: 667, height: 375 },
  { width: 844, height: 390 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 }
]) {
  test(`${viewport.width}x${viewport.height}: 立て札と水やり済み生成画像が畑のそばで判別できる`, async ({ page }) => {
    await gotoSeededField(page, viewport, visualState);

    const plots = page.locator('.plot');
    const signs = page.locator('.crop-sign');
    const drops = page.locator('.watered-drop');
    const expectedCrops = ['tomato', 'ninjin', 'tomato', 'ninjin'];
    const expectedSignSources = [
      /crop_sign_tomato_iso_v2\.png$/,
      /crop_sign_ninjin_iso_v2\.png$/,
      /crop_sign_tomato_iso_v2\.png$/,
      /crop_sign_ninjin_iso_v2\.png$/
    ];

    await expect(plots).toHaveCount(4);
    await expect(page.locator('#plot-area')).toHaveAttribute('aria-label', '4つの はたけ');
    for (let index = 0; index < 4; index += 1) {
      const plot = plots.nth(index);
      const sign = signs.nth(index);
      const drop = drops.nth(index);
      await expect(plot).toHaveAttribute('data-crop', expectedCrops[index]);
      await expect(plot).toHaveClass(/is-watered/);
      await expect(sign).toHaveClass(/is-visible/);
      await expect(sign).toHaveAttribute('src', expectedSignSources[index]);
      await expect(drop).toBeVisible();
      await expect(drop).toHaveAttribute('src', /watered_drop_mark_v2\.png$/);
    }

    const artState = await page.evaluate(() => {
      const plots = Array.from(document.querySelectorAll('.plot'));
      const markers = Array.from(document.querySelectorAll('.plot-marker'));
      const signs = Array.from(document.querySelectorAll('.crop-sign'));
      const drops = Array.from(document.querySelectorAll('.watered-drop'));
      const wateringCan = document.querySelector('#tool-water-btn img');
      return {
        backgrounds: plots.map((el) => getComputedStyle(el).backgroundImage),
        backgroundSizes: plots.map((el) => getComputedStyle(el).backgroundSize),
        markerGeometry: markers.map((marker, index) => ({
          anchorX: marker.offsetLeft / plots[index].clientWidth,
          anchorY: marker.offsetTop / plots[index].clientHeight,
          width: marker.offsetWidth,
          expectedWidth: Math.min(56, Math.max(30, plots[index].clientWidth * 0.2)),
          widthRatio: marker.offsetWidth / plots[index].clientWidth,
          tilt: parseFloat(getComputedStyle(plots[index]).getPropertyValue('--crop-sign-tilt'))
        })),
        dropGeometry: drops.map((el, index) => {
          const marker = markers[index];
          return {
            width: el.offsetWidth,
            expectedWidth: Math.min(32, Math.max(20, marker.clientWidth * 0.7)),
            markerWidth: marker.clientWidth
          };
        }),
        plantAnchors: plots.map((plot) => {
          const plant = plot.querySelector('.plant-emoji');
          if (!plant) return null;
          return {
            x: plant.offsetLeft / plot.clientWidth,
            y: plant.offsetTop / plot.clientHeight
          };
        }).filter(Boolean),
        signsLoaded: signs.every((el) => el.complete && el.naturalWidth > 0),
        dropsLoaded: drops.every((el) => el.complete && el.naturalWidth > 0),
        pointerEvents: markers.concat(signs, drops).map((el) => getComputedStyle(el).pointerEvents),
        wateringCanLoaded: !!wateringCan && wateringCan.complete && wateringCan.naturalWidth > 0,
        wateringCanText: document.getElementById('tool-water-btn').textContent.trim()
      };
    });
    expect(artState.backgrounds).toHaveLength(4);
    expect(artState.backgrounds.every((value) => value.includes('hatake_crop_wet.png'))).toBe(true);
    expect(artState.backgroundSizes).toEqual(['contain', 'contain', 'contain', 'contain']);
    for (const marker of artState.markerGeometry) {
      expect(Math.abs(marker.anchorX - 0.1)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(marker.anchorY - 0.5)).toBeLessThanOrEqual(0.01);
      expect(marker.width).toBeGreaterThanOrEqual(29);
      expect(marker.width).toBeLessThanOrEqual(57);
      expect(Math.abs(marker.width - marker.expectedWidth)).toBeLessThanOrEqual(1.5);
      // clamp の下限・上限に当たらない画面では plot 幅の約20%。
      if (marker.expectedWidth > 30 && marker.expectedWidth < 56) {
        expect(Math.abs(marker.widthRatio - 0.2)).toBeLessThanOrEqual(0.01);
      }
    }
    expect(artState.markerGeometry.map((value) => value.tilt)).toEqual([-1.5, 0.75, -0.75, 1.25]);
    for (const drop of artState.dropGeometry) {
      expect(drop.width).toBeGreaterThanOrEqual(19);
      expect(drop.width).toBeLessThanOrEqual(33);
      expect(Math.abs(drop.width - drop.expectedWidth)).toBeLessThanOrEqual(1.5);
      if (drop.expectedWidth > 20 && drop.expectedWidth < 32) {
        expect(Math.abs(drop.width / drop.markerWidth - 0.7)).toBeLessThanOrEqual(0.04);
      }
    }
    expect(artState.plantAnchors).toHaveLength(3);
    for (const plant of artState.plantAnchors) {
      expect(Math.abs(plant.x - 0.5)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(plant.y - 0.5)).toBeLessThanOrEqual(0.01);
    }
    expect(artState.signsLoaded).toBe(true);
    expect(artState.dropsLoaded).toBe(true);
    expect(artState.pointerEvents.every((value) => value === 'none')).toBe(true);
    expect(artState.wateringCanLoaded).toBe(true);
    expect(artState.wateringCanText).toBe('');

    const plotBoxes = await Promise.all(
      Array.from({ length: 4 }, (_, index) => plots.nth(index).boundingBox())
    );
    const signBoxes = await Promise.all(
      Array.from({ length: 4 }, (_, index) => signs.nth(index).boundingBox())
    );
    const dropBoxes = await Promise.all(
      Array.from({ length: 4 }, (_, index) => drops.nth(index).boundingBox())
    );
    const stageBox = await page.locator('#stage').boundingBox();

    for (let index = 0; index < 4; index += 1) {
      const plotBox = plotBoxes[index];
      const signBox = signBoxes[index];
      const dropBox = dropBoxes[index];

      // しずくは離れたバッジではなく、札の左上へ一部重ねる。
      expect(dropBox.x).toBeLessThan(signBox.x + signBox.width * 0.5);
      expect(dropBox.x + dropBox.width).toBeGreaterThan(signBox.x);
      expect(dropBox.y).toBeLessThan(signBox.y + signBox.height * 0.35);
      expect(dropBox.y + dropBox.height).toBeGreaterThan(signBox.y);

      // 水やりマークが畑中央の芽を覆わない。
      const plantCenter = {
        x: plotBox.x + plotBox.width * 0.5,
        y: plotBox.y + plotBox.height * 0.5
      };
      expect(
        plantCenter.x >= dropBox.x &&
        plantCenter.x <= dropBox.x + dropBox.width &&
        plantCenter.y >= dropBox.y &&
        plantCenter.y <= dropBox.y + dropBox.height
      ).toBe(false);

      // 畝の透明な矩形AABB同士は意図的に重なるため、clip-pathで見えている
      // ひし形だけを対象に、しずくの四隅・辺中央・中心が侵入しないことを確認。
      const dropSamplePoints = [
        { x: dropBox.x, y: dropBox.y },
        { x: dropBox.x + dropBox.width * 0.5, y: dropBox.y },
        { x: dropBox.x + dropBox.width, y: dropBox.y },
        { x: dropBox.x, y: dropBox.y + dropBox.height * 0.5 },
        { x: dropBox.x + dropBox.width * 0.5, y: dropBox.y + dropBox.height * 0.5 },
        { x: dropBox.x + dropBox.width, y: dropBox.y + dropBox.height * 0.5 },
        { x: dropBox.x, y: dropBox.y + dropBox.height },
        { x: dropBox.x + dropBox.width * 0.5, y: dropBox.y + dropBox.height },
        { x: dropBox.x + dropBox.width, y: dropBox.y + dropBox.height }
      ];
      for (let adjacent = 0; adjacent < 4; adjacent += 1) {
        if (adjacent === index) continue;
        const otherPlot = plotBoxes[adjacent];
        expect.soft(
          dropSamplePoints.some((point) => pointInsidePlotDiamond(point, otherPlot)),
          `plot${index} のしずくが plot${adjacent} の見える土へ入らない`
        ).toBe(false);
      }
    }
    for (const box of [...signBoxes, ...dropBoxes, ...plotBoxes]) {
      expect(box.x).toBeGreaterThanOrEqual(stageBox.x - 1);
      expect(box.y).toBeGreaterThanOrEqual(stageBox.y - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(stageBox.x + stageBox.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(stageBox.y + stageBox.height + 1);
    }

    await expect(plots.nth(0)).toHaveAttribute('aria-label', 'おくの とまとの はたけ。きょうの みずやり できた');
    await expect(plots.nth(1)).toHaveAttribute('aria-label', 'ひだりの にんじんの はたけ。きょうの みずやり できた');

    await page.screenshot({
      path: `test-results/hatake_markers_4plots_${viewport.width}x${viewport.height}.png`
    });
  });
}

test('収穫すると立て札・湿った土・しずくが空畑の状態へ戻る', async ({ page }) => {
  await gotoSeededField(page, { width: 844, height: 390 }, [
    { seedId: null, daysGrown: 0, wateredToday: false, wilted: false, bug: false },
    { seedId: null, daysGrown: 0, wateredToday: false, wilted: false, bug: false },
    { seedId: null, daysGrown: 0, wateredToday: false, wilted: false, bug: false },
    { seedId: 'tomato', daysGrown: 3, wateredToday: true, wilted: false, bug: false }
  ]);

  const plots = page.locator('.plot');
  const plot3 = page.locator('.plot[data-plot="3"]');
  await expect(plots).toHaveCount(4);
  await expect(plot3.locator('.crop-sign')).toBeVisible();
  await expect(plot3.locator('.watered-drop')).toBeVisible();
  await tapPlot(page, '.plot[data-plot="3"]');
  await expect(plots).toHaveCount(4);
  await expect(plot3).not.toHaveAttribute('data-crop', /.+/);
  await expect(plot3.locator('.crop-sign')).toBeHidden();
  await expect(plot3.locator('.crop-sign')).not.toHaveAttribute('src', /.+/);
  await expect(plot3).not.toHaveClass(/is-watered/);
  await expect(plot3.locator('.watered-drop')).toBeHidden();
  await expect(plot3).toHaveAttribute('aria-label', 'てまえの あいている はたけ');
  const savedPlots = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pono_hatake_state_v1')).plots
  );
  expect(savedPlots).toHaveLength(4);
  expect(savedPlots[3].seedId).toBe(null);
});
