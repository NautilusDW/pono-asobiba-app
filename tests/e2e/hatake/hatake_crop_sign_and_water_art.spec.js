// hatake-nikki/: 作物の立て札と、生成画像による水やり済み表示の回帰テスト。
// 色だけに頼らず「湿った土・水色の縁・大きなしずく」が同時に見えること、
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

const visualState = [
  { seedId: 'tomato', daysGrown: 0, wateredToday: true, wilted: false, bug: false },
  { seedId: 'ninjin', daysGrown: 1, wateredToday: true, wilted: false, bug: false },
  { seedId: 'tomato', daysGrown: 2, wateredToday: true, wilted: false, bug: false }
];

for (const viewport of [
  { width: 667, height: 375 },
  { width: 844, height: 390 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 }
]) {
  test(`${viewport.width}x${viewport.height}: 立て札と水やり済み生成画像が畑のそばで判別できる`, async ({ page }) => {
    await gotoSeededField(page, viewport, visualState);

    const plot0 = page.locator('.plot[data-plot="0"]');
    const plot1 = page.locator('.plot[data-plot="1"]');
    const plot2 = page.locator('.plot[data-plot="2"]');
    const sign0 = plot0.locator('.crop-sign');
    const sign1 = plot1.locator('.crop-sign');
    const sign2 = plot2.locator('.crop-sign');
    const drop0 = plot0.locator('.watered-drop');
    const drop1 = plot1.locator('.watered-drop');
    const drop2 = plot2.locator('.watered-drop');

    await expect(plot0).toHaveAttribute('data-crop', 'tomato');
    await expect(plot1).toHaveAttribute('data-crop', 'ninjin');
    await expect(plot2).toHaveAttribute('data-crop', 'tomato');
    await expect(sign0).toHaveClass(/is-visible/);
    await expect(sign1).toHaveClass(/is-visible/);
    await expect(sign2).toHaveClass(/is-visible/);
    await expect(sign0).toHaveAttribute('src', /crop_sign_tomato_iso_v2\.png$/);
    await expect(sign1).toHaveAttribute('src', /crop_sign_ninjin_iso_v2\.png$/);
    await expect(sign2).toHaveAttribute('src', /crop_sign_tomato_iso_v2\.png$/);

    await expect(plot0).toHaveClass(/is-watered/);
    await expect(plot1).toHaveClass(/is-watered/);
    await expect(plot2).toHaveClass(/is-watered/);
    await expect(drop0).toBeVisible();
    await expect(drop1).toBeVisible();
    await expect(drop2).toBeVisible();

    const artState = await page.evaluate(() => {
      const plots = Array.from(document.querySelectorAll('.plot'));
      const signs = Array.from(document.querySelectorAll('.crop-sign'));
      const drops = Array.from(document.querySelectorAll('.watered-drop'));
      const wateringCan = document.querySelector('#tool-water-btn img');
      return {
        backgrounds: plots.map((el) => getComputedStyle(el).backgroundImage),
        backgroundSizes: plots.map((el) => getComputedStyle(el).backgroundSize),
        signAnchors: signs.map((el) => ({
          x: el.offsetLeft / el.parentElement.clientWidth,
          y: el.offsetTop / el.parentElement.clientHeight,
          tilt: parseFloat(getComputedStyle(el.parentElement).getPropertyValue('--crop-sign-tilt'))
        })),
        dropGeometry: drops.map((el) => {
          const plot = el.parentElement.getBoundingClientRect();
          const drop = el.getBoundingClientRect();
          return {
            centerX: (drop.left + drop.width / 2 - plot.left) / plot.width,
            centerY: (drop.top + drop.height / 2 - plot.top) / plot.height,
            widthRatio: drop.width / plot.width
          };
        }),
        plantAnchors: plots.slice(0, 2).map((plot) => {
          const plant = plot.querySelector('.plant-emoji');
          return {
            x: plant.offsetLeft / plot.clientWidth,
            y: plant.offsetTop / plot.clientHeight
          };
        }),
        signsLoaded: signs.every((el) => el.complete && el.naturalWidth > 0),
        dropsLoaded: drops.every((el) => el.complete && el.naturalWidth > 0),
        pointerEvents: signs.concat(drops).map((el) => getComputedStyle(el).pointerEvents),
        wateringCanLoaded: !!wateringCan && wateringCan.complete && wateringCan.naturalWidth > 0,
        wateringCanText: document.getElementById('tool-water-btn').textContent.trim()
      };
    });
    expect(artState.backgrounds[0]).toContain('hatake_crop_wet.png');
    expect(artState.backgrounds[1]).toContain('hatake_crop_wet.png');
    expect(artState.backgrounds[2]).toContain('hatake_crop_wet.png');
    expect(artState.backgroundSizes).toEqual(['contain', 'contain', 'contain']);
    for (const anchor of artState.signAnchors) {
      expect(Math.abs(anchor.x - 0.27)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(anchor.y - 0.72)).toBeLessThanOrEqual(0.01);
    }
    expect(artState.signAnchors.map((v) => v.tilt)).toEqual([-1.5, 0.75, -0.75]);
    for (const drop of artState.dropGeometry) {
      expect(drop.centerX).toBeGreaterThanOrEqual(0.72);
      expect(drop.centerX).toBeLessThanOrEqual(0.84);
      expect(drop.centerY).toBeGreaterThanOrEqual(0.25);
      expect(drop.centerY).toBeLessThanOrEqual(0.44);
      expect(drop.widthRatio).toBeGreaterThanOrEqual(0.18);
    }
    for (const plant of artState.plantAnchors) {
      expect(Math.abs(plant.x - 0.5)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(plant.y - 0.5)).toBeLessThanOrEqual(0.01);
    }
    expect(artState.signsLoaded).toBe(true);
    expect(artState.dropsLoaded).toBe(true);
    expect(artState.pointerEvents.every((value) => value === 'none')).toBe(true);
    expect(artState.wateringCanLoaded).toBe(true);
    expect(artState.wateringCanText).toBe('');

    const plot0Box = await plot0.boundingBox();
    const plot2Box = await plot2.boundingBox();
    const sign0Box = await sign0.boundingBox();
    const sign1Box = await sign1.boundingBox();
    const sign2Box = await sign2.boundingBox();
    const drop0Box = await drop0.boundingBox();
    const drop1Box = await drop1.boundingBox();
    const drop2Box = await drop2.boundingBox();
    const stageBox = await page.locator('#stage').boundingBox();

    expect(sign0Box.width).toBeGreaterThanOrEqual(46);
    expect(sign1Box.width).toBeGreaterThanOrEqual(46);
    expect(sign2Box.width).toBeGreaterThanOrEqual(46);
    expect(drop0Box.width).toBeGreaterThanOrEqual(36);
    expect(drop1Box.width).toBeGreaterThanOrEqual(36);
    expect(drop2Box.width).toBeGreaterThanOrEqual(36);
    // しずくは離れたバッジではなく、3区画とも畑の右上側へ重ねる。
    for (const [plotBox, dropBox] of [
      [plot0Box, drop0Box],
      [await plot1.boundingBox(), drop1Box],
      [plot2Box, drop2Box]
    ]) {
      expect(dropBox.x).toBeGreaterThan(plotBox.x + plotBox.width * 0.55);
      expect(dropBox.x + dropBox.width).toBeLessThanOrEqual(plotBox.x + plotBox.width + 1);
      expect(dropBox.y).toBeGreaterThanOrEqual(plotBox.y - 1);
      expect(dropBox.y + dropBox.height).toBeLessThan(plotBox.y + plotBox.height * 0.82);
    }
    for (const box of [sign0Box, sign1Box, sign2Box, drop0Box, drop1Box, drop2Box, plot2Box]) {
      expect(box.x).toBeGreaterThanOrEqual(stageBox.x - 1);
      expect(box.y).toBeGreaterThanOrEqual(stageBox.y - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(stageBox.x + stageBox.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(stageBox.y + stageBox.height + 1);
    }

    await expect(plot0).toHaveAttribute('aria-label', 'とまとの はたけ。きょうの みずやり できた');
    await expect(plot1).toHaveAttribute('aria-label', 'にんじんの はたけ。きょうの みずやり できた');
  });
}

test('収穫すると立て札・湿った土・しずくが空畑の状態へ戻る', async ({ page }) => {
  await gotoSeededField(page, { width: 844, height: 390 }, [
    { seedId: 'tomato', daysGrown: 3, wateredToday: true, wilted: false, bug: false },
    { seedId: null, daysGrown: 0, wateredToday: false, wilted: false, bug: false },
    { seedId: null, daysGrown: 0, wateredToday: false, wilted: false, bug: false }
  ]);

  const plot0 = page.locator('.plot[data-plot="0"]');
  await expect(plot0.locator('.crop-sign')).toBeVisible();
  await expect(plot0.locator('.watered-drop')).toBeVisible();
  await tapPlot(page, '.plot[data-plot="0"]');
  await expect(plot0).not.toHaveAttribute('data-crop', /.+/);
  await expect(plot0.locator('.crop-sign')).toBeHidden();
  await expect(plot0.locator('.crop-sign')).not.toHaveAttribute('src', /.+/);
  await expect(plot0).not.toHaveClass(/is-watered/);
  await expect(plot0.locator('.watered-drop')).toBeHidden();
  await expect(plot0).toHaveAttribute('aria-label', 'あいている はたけ');
  const savedSeedId = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pono_hatake_state_v1')).plots[0].seedId
  );
  expect(savedSeedId).toBe(null);
});
