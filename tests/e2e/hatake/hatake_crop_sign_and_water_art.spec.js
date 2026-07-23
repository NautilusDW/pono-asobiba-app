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

const PLOT_COUNT = 9;
const DOM_VISUAL_ORDER = [0, 4, 5, 1, 6, 2, 7, 8, 3];
const TILTS_BY_DATA_INDEX = [-1.5, 0.75, -0.75, 1.25, -0.4, 1, -1.1, 0.5, -0.9];
const ADJACENT_PLOTS = {
  0: [4, 5],
  1: [4, 7],
  2: [5, 8],
  3: [7, 8],
  4: [0, 1, 6],
  5: [0, 2, 6],
  6: [4, 5, 7, 8],
  7: [1, 3, 6],
  8: [2, 3, 6]
};

const visualState = Array.from({ length: PLOT_COUNT }, (_, index) => ({
  seedId: index % 2 === 0 ? 'tomato' : 'ninjin',
  daysGrown: index % 4,
  wateredToday: true,
  wilted: false,
  bug: false
}));

for (const viewport of [
  { width: 667, height: 375 },
  { width: 844, height: 390 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 }
]) {
  test(`${viewport.width}x${viewport.height}: 立て札と水やり済み生成画像が畑のそばで判別できる`, async ({ page }) => {
    await gotoSeededField(page, viewport, visualState);

    const plots = page.locator('.plot');
    await expect(plots).toHaveCount(PLOT_COUNT);
    await expect(page.locator('.plot-marker')).toHaveCount(PLOT_COUNT);
    await expect(page.locator('.crop-sign')).toHaveCount(PLOT_COUNT);
    await expect(page.locator('.watered-drop')).toHaveCount(PLOT_COUNT);
    await expect(page.locator('#plot-area')).toHaveAttribute('aria-label', '9つの はたけ');
    expect(await plots.evaluateAll((elements) =>
      elements.map((element) => Number(element.dataset.plot))
    )).toEqual(DOM_VISUAL_ORDER);

    for (let dataIndex = 0; dataIndex < PLOT_COUNT; dataIndex += 1) {
      const expectedCrop = dataIndex % 2 === 0 ? 'tomato' : 'ninjin';
      const expectedSignSource = expectedCrop === 'tomato'
        ? /crop_sign_tomato_iso_v2\.png$/
        : /crop_sign_ninjin_iso_v2\.png$/;
      const plot = page.locator(`.plot[data-plot="${dataIndex}"]`);
      const sign = plot.locator('.crop-sign');
      const drop = plot.locator('.watered-drop');
      await expect(plot).toHaveAttribute('data-crop', expectedCrop);
      await expect(plot).toHaveClass(/is-watered/);
      await expect(sign).toHaveClass(/is-visible/);
      await expect(sign).toHaveAttribute('src', expectedSignSource);
      await expect(drop).toBeVisible();
      await expect(drop).toHaveAttribute('src', /watered_drop_mark_v2\.png$/);
    }

    const artState = await page.evaluate(() => {
      const plots = Array.from(document.querySelectorAll('.plot'));
      const wateringCan = document.querySelector('#tool-water-btn img');
      const overlaps = (a, b) =>
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return {
        backgrounds: plots.map((el) => getComputedStyle(el).backgroundImage),
        backgroundSizes: plots.map((el) => getComputedStyle(el).backgroundSize),
        geometry: plots.map((plot) => {
          const marker = plot.querySelector('.plot-marker');
          const sign = plot.querySelector('.crop-sign');
          const drop = plot.querySelector('.watered-drop');
          const markerWidth = marker.clientWidth;
          const markerHeight = marker.clientHeight;
          const signRect = {
            left: sign.offsetLeft,
            top: sign.offsetTop,
            right: sign.offsetLeft + sign.offsetWidth,
            bottom: sign.offsetTop + sign.offsetHeight
          };
          const dropRect = {
            left: drop.offsetLeft,
            top: drop.offsetTop,
            right: drop.offsetLeft + drop.offsetWidth,
            bottom: drop.offsetTop + drop.offsetHeight
          };
          // 小さい表示でも確実に読ませる作物絵の主要識別領域を板の中央右側に置く。
          // 左上のしずくがこの40%〜86% × 30%〜72%へ入らないことを固定する。
          const cropArtSafeZone = {
            left: signRect.left + sign.offsetWidth * 0.40,
            top: signRect.top + sign.offsetHeight * 0.30,
            right: signRect.left + sign.offsetWidth * 0.86,
            bottom: signRect.top + sign.offsetHeight * 0.72
          };
          return {
            dataIndex: Number(plot.dataset.plot),
            anchorX: marker.offsetLeft / plot.clientWidth,
            anchorY: marker.offsetTop / plot.clientHeight,
            markerWidth,
            markerExpectedWidth: Math.min(44, Math.max(24, plot.clientWidth * 0.2)),
            markerWidthRatio: markerWidth / plot.clientWidth,
            tilt: parseFloat(getComputedStyle(plot).getPropertyValue('--crop-sign-tilt')),
            dropWidth: drop.offsetWidth,
            dropExpectedWidth: Math.min(22, Math.max(14, markerWidth * 0.45)),
            dropWidthRatio: drop.offsetWidth / markerWidth,
            dropLeftRatio: drop.offsetLeft / markerWidth,
            dropTopRatio: drop.offsetTop / markerHeight,
            dropOverlapsSignUpperLeft:
              dropRect.right > signRect.left &&
              dropRect.bottom > signRect.top &&
              dropRect.left < signRect.left + sign.offsetWidth * 0.28 &&
              dropRect.top < signRect.top + sign.offsetHeight * 0.30,
            dropOverlapsCropArtSafeZone: overlaps(dropRect, cropArtSafeZone),
            signLoaded: sign.complete && sign.naturalWidth > 0,
            dropLoaded: drop.complete && drop.naturalWidth > 0,
            pointerEvents: [marker, sign, drop].map((el) => getComputedStyle(el).pointerEvents)
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
        wateringCanLoaded: !!wateringCan && wateringCan.complete && wateringCan.naturalWidth > 0,
        wateringCanText: document.getElementById('tool-water-btn').textContent.trim()
      };
    });
    expect(artState.backgrounds).toHaveLength(PLOT_COUNT);
    expect(artState.backgrounds.every((value) => value.includes('hatake_crop_wet.png'))).toBe(true);
    expect(artState.backgroundSizes).toEqual(Array(PLOT_COUNT).fill('contain'));
    expect(artState.geometry).toHaveLength(PLOT_COUNT);
    for (const geometry of artState.geometry) {
      expect(Math.abs(geometry.anchorX - 0.1)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(geometry.anchorY - 0.5)).toBeLessThanOrEqual(0.01);
      expect(geometry.markerWidth).toBeGreaterThanOrEqual(23);
      expect(geometry.markerWidth).toBeLessThanOrEqual(45);
      expect(Math.abs(geometry.markerWidth - geometry.markerExpectedWidth)).toBeLessThanOrEqual(1.5);
      // clamp の下限・上限に当たらない画面では plot 幅の約20%。
      if (geometry.markerExpectedWidth > 24 && geometry.markerExpectedWidth < 44) {
        expect(Math.abs(geometry.markerWidthRatio - 0.2)).toBeLessThanOrEqual(0.01);
      }
      expect(geometry.tilt).toBe(TILTS_BY_DATA_INDEX[geometry.dataIndex]);
      expect(geometry.dropWidth).toBeGreaterThanOrEqual(13);
      expect(geometry.dropWidth).toBeLessThanOrEqual(23);
      expect(Math.abs(geometry.dropWidth - geometry.dropExpectedWidth)).toBeLessThanOrEqual(1.5);
      if (geometry.dropExpectedWidth > 14 && geometry.dropExpectedWidth < 22) {
        expect(Math.abs(geometry.dropWidthRatio - 0.45)).toBeLessThanOrEqual(0.04);
      }
      expect(Math.abs(geometry.dropLeftRatio - (-0.2))).toBeLessThanOrEqual(0.03);
      expect(Math.abs(geometry.dropTopRatio - (-0.18))).toBeLessThanOrEqual(0.03);
      expect(geometry.dropOverlapsSignUpperLeft).toBe(true);
      expect(geometry.dropOverlapsCropArtSafeZone).toBe(false);
      expect(geometry.signLoaded).toBe(true);
      expect(geometry.dropLoaded).toBe(true);
      expect(geometry.pointerEvents.every((value) => value === 'none')).toBe(true);
    }
    expect(artState.plantAnchors).toHaveLength(5);
    for (const plant of artState.plantAnchors) {
      expect(Math.abs(plant.x - 0.5)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(plant.y - 0.5)).toBeLessThanOrEqual(0.01);
    }
    expect(artState.wateringCanLoaded).toBe(true);
    expect(artState.wateringCanText).toBe('');

    const boxesByDataIndex = await Promise.all(
      Array.from({ length: PLOT_COUNT }, async (_, dataIndex) => {
        const plot = page.locator(`.plot[data-plot="${dataIndex}"]`);
        return {
          dataIndex,
          plot: await plot.boundingBox(),
          sign: await plot.locator('.crop-sign').boundingBox(),
          drop: await plot.locator('.watered-drop').boundingBox()
        };
      })
    );
    const stageBox = await page.locator('#stage').boundingBox();

    for (const boxes of boxesByDataIndex) {
      const plotBox = boxes.plot;
      const signBox = boxes.sign;
      const dropBox = boxes.drop;

      // しずくは離れたバッジではなく、札の左上へ一部重ねる。
      expect(dropBox.x).toBeLessThan(signBox.x + signBox.width * 0.3);
      expect(dropBox.x + dropBox.width).toBeGreaterThan(signBox.x);
      expect(dropBox.y).toBeLessThan(signBox.y + signBox.height * 0.3);
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

      // 畝も生成しずくも透明な矩形キャンバスを持つ。矩形角ではなく、実際の
      // しずくシルエット（先端・左右輪郭・下の水輪）をサンプルし、隣接する
      // clip-path の見える土へ描画画素が侵入しないことを確認する。
      const dropVisibleSilhouette = [
        [0.50, 0.05],
        [0.36, 0.25], [0.64, 0.25],
        [0.22, 0.48], [0.50, 0.45], [0.78, 0.48],
        [0.10, 0.68], [0.50, 0.68], [0.90, 0.68],
        [0.05, 0.84], [0.25, 0.84], [0.50, 0.84], [0.75, 0.84], [0.95, 0.84],
        [0.12, 0.93], [0.50, 0.95], [0.88, 0.93]
      ];
      const dropSamplePoints = dropVisibleSilhouette.map(([x, y]) => ({
        x: dropBox.x + dropBox.width * x,
        y: dropBox.y + dropBox.height * y
      }));
      for (const adjacent of ADJACENT_PLOTS[boxes.dataIndex]) {
        const otherPlot = boxesByDataIndex[adjacent].plot;
        expect.soft(
          dropSamplePoints.some((point) => pointInsidePlotDiamond(point, otherPlot)),
          `plot${boxes.dataIndex} のしずくが plot${adjacent} の見える土へ入らない`
        ).toBe(false);
      }
    }
    for (const box of boxesByDataIndex.flatMap((boxes) => [boxes.sign, boxes.drop, boxes.plot])) {
      expect(box.x).toBeGreaterThanOrEqual(stageBox.x - 1);
      expect(box.y).toBeGreaterThanOrEqual(stageBox.y - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(stageBox.x + stageBox.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(stageBox.y + stageBox.height + 1);
    }

    await expect(page.locator('.plot[data-plot="0"]')).toHaveAttribute(
      'aria-label',
      'いちばん おくの とまとの はたけ。きょうの みずやり できた'
    );
    await expect(page.locator('.plot[data-plot="1"]')).toHaveAttribute(
      'aria-label',
      'ひだりの にんじんの はたけ。きょうの みずやり できた'
    );

    await page.screenshot({
      path: `test-results/hatake_markers_9plots_${viewport.width}x${viewport.height}.png`
    });
  });
}

test('収穫すると立て札・湿った土・しずくが空畑の状態へ戻る', async ({ page }) => {
  const harvestState = Array.from({ length: PLOT_COUNT }, () => ({
    seedId: null,
    daysGrown: 0,
    wateredToday: false,
    wilted: false,
    bug: false
  }));
  harvestState[8] = {
    seedId: 'tomato',
    daysGrown: 3,
    wateredToday: true,
    wilted: false,
    bug: false
  };
  await gotoSeededField(page, { width: 844, height: 390 }, harvestState);

  const plots = page.locator('.plot');
  const plot8 = page.locator('.plot[data-plot="8"]');
  await expect(plots).toHaveCount(PLOT_COUNT);
  await expect(plot8.locator('.crop-sign')).toBeVisible();
  await expect(plot8.locator('.watered-drop')).toBeVisible();
  await tapPlot(page, '.plot[data-plot="8"]');
  await expect(plots).toHaveCount(PLOT_COUNT);
  await expect(plot8).not.toHaveAttribute('data-crop', /.+/);
  await expect(plot8.locator('.crop-sign')).toBeHidden();
  await expect(plot8.locator('.crop-sign')).not.toHaveAttribute('src', /.+/);
  await expect(plot8).not.toHaveClass(/is-watered/);
  await expect(plot8.locator('.watered-drop')).toBeHidden();
  await expect(plot8).toHaveAttribute('aria-label', 'てまえの みぎの あいている はたけ');
  const savedPlots = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pono_hatake_state_v1')).plots
  );
  expect(savedPlots).toHaveLength(PLOT_COUNT);
  expect(savedPlots[8].seedId).toBe(null);
});
