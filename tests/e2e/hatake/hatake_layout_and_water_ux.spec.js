// hatake-nikki/: 畑レイアウト崩れ(#field-bg 幽霊アセット + #tool-rail/.plot 重なり)
// 修正と、水やり操作 discoverability 改善 (パルス演出 / ヒントトースト / 初回チュートリアル自動
// 表示) の回帰テスト。レイアウトは小画面縦/横・タブレット・デスクトップの4幅で確認する。
//
// tier ガード: hatake-nikki/index.html は tier:'app' 専用ゲームのため、
// window.__APP_BUILD__=1 を addInitScript で注入しないと tier ロック画面が出て
// #start-btn 以降のフローを検証できない (donguri-wakekko の e2e パターンを踏襲)。
//
// 日付依存 (catchUpDays) を排除するため、各テストは localStorage.clear() してから
// 開始する (決定論的にするための仕様書の指示どおり)。

const { test, expect } = require('@playwright/test');

const VIEWPORT = { width: 844, height: 390 };

async function setAppBuild(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
  });
}

// index.html の FOUC guard は DOMContentLoaded 後に2連続 rAF を経てから
// body.pono-game-ready を付与し、その瞬間に #stage が visibility:visible になる
// (それまでは #stage が visibility:hidden で実際にはヒットテストされず、
// force:true でクリックしても座標にイベントが届かない)。クリック前に必ず
// このクラス付与を待つことで、ページ読み込み直後のクリックのフレーク (競合状態)
// を無くす。
async function waitForGameReady(page) {
  await page.waitForFunction(() => document.body.classList.contains('pono-game-ready'), null, { timeout: 10000 });
}

// 新規アクセス相当 (localStorage 空) で #field-screen まで進める。
// diary-overlay (daysPassed>=1) は初回は出ないが、念のため出ていたら閉じる。
async function gotoFreshField(page, viewport) {
  await setAppBuild(page);
  await page.setViewportSize(viewport || VIEWPORT);
  await page.goto('/hatake-nikki/index.html');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload();
  await waitForGameReady(page);
  await page.locator('#start-btn').click({ force: true });
  await page.waitForSelector('#field-screen.show');
  await page.waitForTimeout(150);
  const diaryVisible = await page.locator('#diary-overlay.show').count();
  if (diaryVisible) {
    await page.locator('#diary-close-btn').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);
  }
}

// tut-dim (バックドロップ) をタップして、ステップ数に関わらず即座にチュートリアルを閉じる。
async function closeTutorialIfOpen(page) {
  const dimHidden = await page.locator('#tut-dim').evaluate(el => el.classList.contains('hidden'));
  if (!dimHidden) {
    await page.locator('#tut-dim').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);
  }
}

async function touchPlot(page, plotLocator, phase, identifier) {
  const box = await plotLocator.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const touch = { clientX: cx, clientY: cy, identifier };
  if (phase === 'start') {
    await plotLocator.dispatchEvent('touchstart', { touches: [touch], changedTouches: [touch] });
  } else if (phase === 'end') {
    await plotLocator.dispatchEvent('touchend', { changedTouches: [touch] });
  }
}

function isInsideConvexQuad(point, polygon, epsilon) {
  let direction = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (Math.abs(cross) <= epsilon) continue;
    const current = cross > 0 ? 1 : -1;
    if (direction && current !== direction) return false;
    direction = current;
  }
  return true;
}

test.describe('hatake-nikki: layout regression (論理3×3の畝9枚がひし形地面の中央に合う)', () => {
  const viewports = [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
    { width: 1366, height: 768 }
  ];
  const visualOrder = ['0', '4', '5', '1', '6', '2', '7', '8', '3'];
  const expectedById = {
    0: { left: 42.75, top: 22.698, centerX: 0.5, centerY: 0.305 },
    1: { left: 17.75, top: 46.198, centerX: 0.25, centerY: 0.54 },
    2: { left: 67.75, top: 46.198, centerX: 0.75, centerY: 0.54 },
    3: { left: 42.75, top: 69.698, centerX: 0.5, centerY: 0.775 },
    4: { left: 30.25, top: 34.448, centerX: 0.375, centerY: 0.4225 },
    5: { left: 55.25, top: 34.448, centerX: 0.625, centerY: 0.4225 },
    6: { left: 42.75, top: 46.198, centerX: 0.5, centerY: 0.54 },
    7: { left: 30.25, top: 57.948, centerX: 0.375, centerY: 0.6575 },
    8: { left: 55.25, top: 57.948, centerX: 0.625, centerY: 0.6575 }
  };
  const fieldDiamond = [
    { x: 0.5, y: 0.125 },
    { x: 0.905, y: 0.54 },
    { x: 0.5, y: 0.961 },
    { x: 0.095, y: 0.537 }
  ];

  for (const viewport of viewports) test(`${viewport.width}x${viewport.height}: 畝9枚が中央の1／2／3／2／1配置に合う`, async ({ page }) => {
    await gotoFreshField(page, viewport);
    await closeTutorialIfOpen(page);

    // #field-bg 幽霊要素の完全撤去
    await expect(page.locator('#field-bg')).toHaveCount(0);

    // 畝は9枚ちょうど。ロック枠はなく、最初からすべて操作対象。
    const plots = page.locator('.plot');
    await expect(plots).toHaveCount(9);
    await expect(page.locator('#plot-area')).toHaveAttribute('aria-label', '9つの はたけ');
    expect(await plots.evaluateAll((els) => els.map((el) => el.dataset.plot))).toEqual(visualOrder);

    const stageBox = await page.locator('#stage').boundingBox();
    const plotAreaBox = await page.locator('#plot-area').boundingBox();
    const railBox = await page.locator('#tool-rail').boundingBox();
    expect(stageBox).toBeTruthy();
    expect(plotAreaBox).toBeTruthy();
    expect(railBox).toBeTruthy();

    // 背景 contain と同じ 1200×670 面が stage の中央にあること。
    expect(Math.abs(plotAreaBox.width / plotAreaBox.height - 1200 / 670)).toBeLessThan(0.002);
    expect(Math.abs((plotAreaBox.y + plotAreaBox.height / 2) - (stageBox.y + stageBox.height / 2))).toBeLessThanOrEqual(1);
    expect(Math.abs(plotAreaBox.x - stageBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(plotAreaBox.width - stageBox.width)).toBeLessThanOrEqual(1);

    const EPS = 1; // 誤差1px許容
    const measuredCenters = [];
    for (let id = 0; id < 9; id++) {
      const plotBox = await page.locator(`.plot[data-plot="${id}"]`).boundingBox();
      expect(plotBox).toBeTruthy();

      const normalized = {
        x: (plotBox.x - plotAreaBox.x) / plotAreaBox.width,
        y: (plotBox.y - plotAreaBox.y) / plotAreaBox.height,
        width: plotBox.width / plotAreaBox.width,
        height: plotBox.height / plotAreaBox.height
      };
      const normalizedCenter = {
        x: normalized.x + normalized.width / 2,
        y: normalized.y + normalized.height / 2
      };

      // green.png 上の論理3×3畑として決めた左上・中心座標。
      const expected = expectedById[id];
      expect(Math.abs(normalized.x - expected.left / 100)).toBeLessThan(0.002);
      expect(Math.abs(normalized.y - expected.top / 100)).toBeLessThan(0.002);
      expect(Math.abs(normalizedCenter.x - expected.centerX)).toBeLessThan(0.002);
      expect(Math.abs(normalizedCenter.y - expected.centerY)).toBeLessThan(0.002);
      expect(Math.abs(normalized.width - 0.145)).toBeLessThan(0.002);
      expect(Math.abs(normalized.height - (0.145 * (1200 / 670) * (143 / 238)))).toBeLessThan(0.002);
      measuredCenters.push(normalizedCenter);

      // 畝絵の4頂点が green.png のひし形面内に入ること。
      const plotDiamond = [
        { x: normalizedCenter.x, y: normalized.y },
        { x: normalized.x + normalized.width, y: normalizedCenter.y },
        { x: normalizedCenter.x, y: normalized.y + normalized.height },
        { x: normalized.x, y: normalizedCenter.y }
      ];
      for (const vertex of plotDiamond) {
        expect(isInsideConvexQuad(vertex, fieldDiamond, 0.004)).toBe(true);
      }

      // 操作可能な横画面では最小667×375でも44px以上。縦画面は回転案内が全面を覆う。
      if (viewport.width > viewport.height) {
        expect(plotBox.width).toBeGreaterThanOrEqual(44);
        expect(plotBox.height).toBeGreaterThanOrEqual(44);
      }

      // (i) #stage に完全内包
      expect(plotBox.x).toBeGreaterThanOrEqual(stageBox.x - EPS);
      expect(plotBox.y).toBeGreaterThanOrEqual(stageBox.y - EPS);
      expect(plotBox.x + plotBox.width).toBeLessThanOrEqual(stageBox.x + stageBox.width + EPS);
      expect(plotBox.y + plotBox.height).toBeLessThanOrEqual(stageBox.y + stageBox.height + EPS);

      // (ii) #tool-rail との水平交差がゼロ (plot 右端 <= rail 左端、または plot 左端 >= rail 右端)
      const plotRight = plotBox.x + plotBox.width;
      const plotLeft = plotBox.x;
      const railLeft = railBox.x;
      const railRight = railBox.x + railBox.width;
      const noHorizontalOverlap = (plotRight <= railLeft + EPS) || (plotLeft >= railRight - EPS);
      expect(noHorizontalOverlap).toBe(true);
    }

    // 9区画の重心は畑面中央(50%, 54%)。
    const meanCenter = measuredCenters.reduce(
      (sum, center) => ({ x: sum.x + center.x / 9, y: sum.y + center.y / 9 }),
      { x: 0, y: 0 }
    );
    expect(Math.abs(meanCenter.x - 0.5)).toBeLessThan(0.002);
    expect(Math.abs(meanCenter.y - 0.54)).toBeLessThan(0.002);

    // アイソメ3×3は、奥から1／2／3／2／1枚の等間隔な5帯になる。
    const rows = [
      ['0'],
      ['4', '5'],
      ['1', '6', '2'],
      ['7', '8'],
      ['3']
    ];
    expect(rows.map((row) => row.length)).toEqual([1, 2, 3, 2, 1]);
    const rowCenters = rows.map((row) => row.map((id) => expectedById[id].centerX));
    expect(rowCenters.map((row) => row.reduce((sum, x) => sum + x, 0) / row.length))
      .toEqual([0.5, 0.5, 0.5, 0.5, 0.5]);
    expect(rows.map((row) => expectedById[row[0]].centerY)).toEqual([0.305, 0.4225, 0.54, 0.6575, 0.775]);

    // 各plotの見えている土が、そのplot自身へ正しくヒットすること。
    // 画像の透明な矩形角は一部重なり得るため、矩形ではなくclip-pathの
    // ひし形を基準に elementFromPoint() の実ヒット先を検査する。
    // locator.dispatchEvent() は実ブラウザのhit-testを迂回するため、
    // elementFromPoint() で全plotの中心と、土面内のサンプル点を検査する。
    const hitTargets = await page.evaluate(() => {
      const plotEls = Array.from(document.querySelectorAll('.plot'));
      const layers = plotEls.map((el, domIndex) => ({
        el,
        domIndex,
        id: el.dataset.plot,
        z: Number(getComputedStyle(el).zIndex) || 0,
        box: el.getBoundingClientRect()
      }));
      const pointInDiamond = (x, y, box) => {
        const nx = (x - box.left) / box.width;
        const ny = (y - box.top) / box.height;
        if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return false;
        const halfWidth = ny <= 0.46 ? ny / 0.92 : (1 - ny) / 1.08;
        return nx >= 0.5 - halfWidth && nx <= 0.5 + halfWidth;
      };
      const plotIdAt = (x, y) => {
        const hit = document.elementFromPoint(x, y);
        const plot = hit && hit.closest('.plot');
        return plot ? plot.dataset.plot : null;
      };
      const topmostDiamondAt = (x, y) => {
        const candidates = layers.filter((layer) => pointInDiamond(x, y, layer.box));
        candidates.sort((a, b) => (a.z - b.z) || (a.domIndex - b.domIndex));
        return candidates.length ? candidates[candidates.length - 1] : null;
      };
      const result = {
        centers: [],
        visibleSamplesByPlot: Object.fromEntries(layers.map((layer) => [layer.id, 0])),
        mismatches: []
      };
      layers.forEach((layer) => {
        const box = layer.box;
        result.centers.push(plotIdAt(box.left + box.width / 2, box.top + box.height / 2));
      });

      layers.forEach((sampleLayer) => {
        const sampleBox = sampleLayer.box;
        for (let gy = 1; gy < 20; gy++) {
          for (let gx = 1; gx < 20; gx++) {
            const x = sampleBox.left + sampleBox.width * gx / 20;
            const y = sampleBox.top + sampleBox.height * gy / 20;
            if (!pointInDiamond(x, y, sampleBox)) continue;

            const expectedLayer = topmostDiamondAt(x, y);
            if (!expectedLayer) continue;
            const actualId = plotIdAt(x, y);
            result.visibleSamplesByPlot[expectedLayer.id]++;
            if (actualId !== expectedLayer.id) {
              result.mismatches.push({ x, y, expected: expectedLayer.id, actual: actualId });
            }
          }
        }
      });
      return result;
    });
    expect(hitTargets.centers).toEqual(visualOrder);
    expect(Object.values(hitTargets.visibleSamplesByPlot).every((count) => count > 0)).toBe(true);
    expect(hitTargets.mismatches).toEqual([]);

    await page.screenshot({ path: `test-results/hatake_layout_9plots_${viewport.width}x${viewport.height}.png` });
  });

  test('奥の枠と新しい9枠目を順に触っても、対象の畝だけに植えられる', async ({ page }) => {
    await gotoFreshField(page, VIEWPORT);
    await closeTutorialIfOpen(page);
    await page.locator('#tool-seed-btn').dispatchEvent('pointerdown');
    await page.waitForSelector('#seed-picker.show');
    await page.locator('.seed-choice[data-seed="tomato"]').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);

    const targetInfo = await page.evaluate(() => {
      const back = document.querySelector('.plot[data-plot="0"]');
      const box = back.getBoundingClientRect();
      const point = {
        x: box.left + box.width / 2,
        y: box.top + box.height / 2
      };
      const target = document.elementFromPoint(point.x, point.y);
      const touch = { clientX: point.x, clientY: point.y, identifier: 1425 };
      for (const type of ['touchstart', 'touchend']) {
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'changedTouches', { value: [touch] });
        Object.defineProperty(event, 'touches', { value: type === 'touchstart' ? [touch] : [] });
        target.dispatchEvent(event);
      }
      const plot = target && target.closest('.plot');
      return { point, targetPlot: plot ? plot.dataset.plot : null };
    });

    expect(targetInfo).toBeTruthy();
    expect(targetInfo.targetPlot).toBe('0');
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('pono_hatake_state_v1')));
    expect(state.plots[0].seedId).toBe('tomato');
    expect(state.plots.slice(1).every((plot) => plot.seedId === null)).toBe(true);

    // 新しい9枠目も最初から使用可能で、中心タップがほかの8枠を変更しない。
    await page.locator('#tool-seed-btn').dispatchEvent('pointerdown');
    await page.waitForSelector('#seed-picker.show');
    await page.locator('.seed-choice[data-seed="ninjin"]').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);

    const plot8 = page.locator('.plot[data-plot="8"]');
    await touchPlot(page, plot8, 'start', 1426);
    await page.waitForTimeout(100);
    await touchPlot(page, plot8, 'end', 1426);
    await page.waitForTimeout(100);

    const stateAfterPlot8 = await page.evaluate(() => JSON.parse(localStorage.getItem('pono_hatake_state_v1')));
    expect(stateAfterPlot8.plots).toHaveLength(9);
    expect(stateAfterPlot8.plots[0].seedId).toBe('tomato');
    expect(stateAfterPlot8.plots.slice(1, 8).every((plot) => plot.seedId === null)).toBe(true);
    expect(stateAfterPlot8.plots[8].seedId).toBe('ninjin');
  });

  for (const legacyCount of [3, 4]) test(`旧${legacyCount}区画セーブを9区画へ移行し、既存データを保ったまま9枠目を植栽・水やりできる`, async ({ page }) => {
    const legacyPlots = [
      { seedId: 'tomato', daysGrown: 2, wateredToday: true, wilted: false, bug: false },
      { seedId: 'ninjin', daysGrown: 1, wateredToday: false, wilted: true, bug: false },
      { seedId: null, daysGrown: 0, wateredToday: false, wilted: false, bug: false },
      { seedId: 'tomato', daysGrown: 1, wateredToday: false, wilted: false, bug: false }
    ].slice(0, legacyCount);
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.addInitScript(({ plots }) => {
      window.__APP_BUILD__ = 1;
      const now = new Date();
      const pad2 = value => String(value).padStart(2, '0');
      const todayKey = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
      localStorage.setItem('pono_hatake_state_v1', JSON.stringify({
        lastSeenKey: todayKey,
        plots
      }));
    }, { plots: legacyPlots });
    await page.setViewportSize(VIEWPORT);
    await page.goto('/hatake-nikki/index.html');
    await waitForGameReady(page);
    await page.locator('#start-btn').click({ force: true });
    await page.waitForSelector('#field-screen.show');
    await page.waitForTimeout(150);
    await closeTutorialIfOpen(page);

    await expect(page.locator('.plot')).toHaveCount(9);
    const migratedState = await page.evaluate(() => JSON.parse(localStorage.getItem('pono_hatake_state_v1')));
    expect(migratedState.plots).toHaveLength(9);
    expect(migratedState.plots.slice(0, legacyCount)).toEqual(legacyPlots);
    expect(migratedState.plots.slice(legacyCount).every((plot) => (
      plot.seedId === null &&
      plot.daysGrown === 0 &&
      plot.wateredToday === false &&
      plot.wilted === false &&
      plot.bug === false
    ))).toBe(true);

    await page.locator('#tool-seed-btn').dispatchEvent('pointerdown');
    await page.waitForSelector('#seed-picker.show');
    await page.locator('.seed-choice[data-seed="tomato"]').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);
    const plot8 = page.locator('.plot[data-plot="8"]');
    await touchPlot(page, plot8, 'start', 1430);
    await page.waitForTimeout(100);
    await touchPlot(page, plot8, 'end', 1430);
    await page.waitForTimeout(100);

    await page.locator('#tool-water-btn').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);
    await expect(plot8).toHaveClass(/is-water-target/);
    await touchPlot(page, plot8, 'start', 1431);
    await page.waitForTimeout(900);
    await touchPlot(page, plot8, 'end', 1431);
    await page.waitForTimeout(100);

    const finalState = await page.evaluate(() => JSON.parse(localStorage.getItem('pono_hatake_state_v1')));
    expect(finalState.plots).toHaveLength(9);
    expect(finalState.plots.slice(0, legacyCount)).toEqual(legacyPlots);
    expect(finalState.plots.slice(legacyCount, 8).every((plot) => plot.seedId === null)).toBe(true);
    expect(finalState.plots[8]).toEqual({
      seedId: 'tomato',
      daysGrown: 0,
      wateredToday: true,
      wilted: false,
      bug: false
    });
    expect(pageErrors).toEqual([]);
  });

  test('キーボードだけでチュートリアル・種選択・植栽・水やりまで進められる', async ({ page }) => {
    await gotoFreshField(page, VIEWPORT);

    // 初回チュートリアルは各段階で次ボタンへフォーカスし、Enter / Spaceで閉じられる。
    await expect(page.locator('#tut-bubble')).not.toHaveClass(/hidden/);
    await expect(page.locator('#tut-next')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tut-next')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('#tut-next')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tut-bubble')).toHaveClass(/hidden/);

    const plots = page.locator('.plot');
    await expect(plots).toHaveCount(9);
    expect(await plots.evaluateAll((els) => els.map((el) => ({
      id: el.dataset.plot,
      label: el.getAttribute('aria-label')
    })))).toEqual([
      { id: '0', label: 'いちばん おくの あいている はたけ' },
      { id: '4', label: 'おくの ひだりの あいている はたけ' },
      { id: '5', label: 'おくの みぎの あいている はたけ' },
      { id: '1', label: 'ひだりの あいている はたけ' },
      { id: '6', label: 'まんなかの あいている はたけ' },
      { id: '2', label: 'みぎの あいている はたけ' },
      { id: '7', label: 'てまえの ひだりの あいている はたけ' },
      { id: '8', label: 'てまえの みぎの あいている はたけ' },
      { id: '3', label: 'いちばん てまえの あいている はたけ' }
    ]);

    const seedTool = page.locator('#tool-seed-btn');
    await seedTool.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#seed-picker')).toHaveClass(/show/);

    const tomatoChoice = page.locator('.seed-choice[data-seed="tomato"]');
    await tomatoChoice.focus();
    await page.keyboard.press('Space');
    await expect(page.locator('#seed-picker')).not.toHaveClass(/show/);
    await expect(seedTool).toHaveClass(/is-active/);

    const frontPlot = page.locator('.plot[data-plot="3"]');
    await frontPlot.focus();
    await page.keyboard.press('Enter');
    await expect(frontPlot).toHaveAttribute('aria-label', 'いちばん てまえの とまとの はたけ。きょうの みずやりは まだ');

    const waterTool = page.locator('#tool-water-btn');
    await waterTool.focus();
    await page.keyboard.press('Space');
    await expect(waterTool).toHaveClass(/is-active/);

    await frontPlot.focus();
    await page.keyboard.press('Enter');
    await expect(frontPlot).toHaveClass(/is-watered/);
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('pono_hatake_state_v1')));
    expect(state.plots[3].seedId).toBe('tomato');
    expect(state.plots[3].wateredToday).toBe(true);
  });

  test('マウスclickでもツール選択・植栽・水やりが二重発火せず進む', async ({ page }) => {
    await gotoFreshField(page, VIEWPORT);
    await closeTutorialIfOpen(page);

    await page.locator('#tool-seed-btn').click();
    await expect(page.locator('#seed-picker')).toHaveClass(/show/);
    await page.locator('.seed-choice[data-seed="ninjin"]').click();

    const backPlot = page.locator('.plot[data-plot="0"]');
    const plotBox = await backPlot.boundingBox();
    await page.mouse.click(plotBox.x + plotBox.width / 2, plotBox.y + plotBox.height / 2);
    await expect(backPlot).toHaveAttribute('aria-label', 'いちばん おくの にんじんの はたけ。きょうの みずやりは まだ');

    const waterTool = page.locator('#tool-water-btn');
    await waterTool.click();
    await expect(waterTool).toHaveClass(/is-active/);
    await page.mouse.click(plotBox.x + plotBox.width / 2, plotBox.y + plotBox.height / 2);
    await expect(backPlot).toHaveClass(/is-watered/);

    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('pono_hatake_state_v1')));
    expect(state.plots[0].seedId).toBe('ninjin');
    expect(state.plots[0].wateredToday).toBe(true);
    expect(state.plots.slice(1).every((plot) => plot.seedId === null)).toBe(true);
  });
});

test.describe('hatake-nikki: 初回チュートリアル自動表示', () => {
  test('初回アクセスで #tut-bubble が自動表示され、2回目以降は表示されない', async ({ page }) => {
    await setAppBuild(page);
    await page.setViewportSize(VIEWPORT);
    await page.goto('/hatake-nikki/index.html');
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await page.reload();
    await waitForGameReady(page);

    await page.locator('#start-btn').click({ force: true });
    await page.waitForSelector('#field-screen.show');
    await page.waitForTimeout(150);

    // 初回: チュートリアルが自動表示される
    await expect(page.locator('#tut-bubble')).not.toHaveClass(/hidden/);
    await expect(page.locator('#tut-dim')).not.toHaveClass(/hidden/);
    const bubbleText = await page.locator('#tut-bubble').innerText();
    expect(bubbleText).toContain('じょうろ');

    // 閉じてリロード
    await page.locator('#tut-dim').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);
    await expect(page.locator('#tut-bubble')).toHaveClass(/hidden/);

    await page.reload();
    await waitForGameReady(page);
    await page.locator('#start-btn').click({ force: true });
    await page.waitForSelector('#field-screen.show');
    await page.waitForTimeout(150);

    // 2回目以降: 自動表示されない
    await expect(page.locator('#tut-bubble')).toHaveClass(/hidden/);
  });
});

test.describe('hatake-nikki: 水やりツール discoverability', () => {
  test('水ツール選択中は植栽済みの畝だけが is-water-target でパルスする', async ({ page }) => {
    await gotoFreshField(page);
    await closeTutorialIfOpen(page);

    // plot0 ににんじんを植える
    await page.locator('#tool-seed-btn').dispatchEvent('pointerdown');
    await page.waitForSelector('#seed-picker.show');
    await page.locator('.seed-choice[data-seed="ninjin"]').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);

    const plot0 = page.locator('.plot[data-plot="0"]');
    await touchPlot(page, plot0, 'start', 10);
    await page.waitForTimeout(100);
    await touchPlot(page, plot0, 'end', 10);
    await page.waitForTimeout(100);

    const stage0 = await plot0.locator('.plant').getAttribute('data-stage');
    expect(stage0).toBe('0'); // たね植栽済み (stage0)

    // じょうろを選択 (pointerdown)
    await page.locator('#tool-water-btn').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);

    await expect(plot0).toHaveClass(/is-water-target/);
    for (let id = 1; id < 9; id++) {
      await expect(page.locator(`.plot[data-plot="${id}"]`)).not.toHaveClass(/is-water-target/);
    }

    // じょうろを再度押して解除
    await page.locator('#tool-water-btn').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);
    await expect(plot0).not.toHaveClass(/is-water-target/);
  });

  test('空の畝を水ツールで押すと #hint-toast にヒントが表示される', async ({ page }) => {
    await gotoFreshField(page);
    await closeTutorialIfOpen(page);

    await page.locator('#tool-water-btn').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);

    // plot1 は空のまま。pointer イベントでは plot のリスナーが反応しないため
    // touchstart/touchend を使う (game.js:342-354 は touch専用リスナー)。
    const plot1 = page.locator('.plot[data-plot="1"]');
    await touchPlot(page, plot1, 'start', 20);
    await page.waitForTimeout(150);

    await expect(page.locator('#hint-toast')).toHaveClass(/is-visible/);
    const hintText = await page.locator('#hint-toast').innerText();
    expect(hintText).toContain('たねを うえてね');

    await touchPlot(page, plot1, 'end', 20);
  });
});

test.describe('hatake-nikki: 水やり本体機能の非破壊確認', () => {
  test('植栽済み畝への800ms長押しで wateredToday が true になる (既存挙動は変わらない)', async ({ page }) => {
    await gotoFreshField(page);
    await closeTutorialIfOpen(page);

    // plot0 にとまとを植える
    await page.locator('#tool-seed-btn').dispatchEvent('pointerdown');
    await page.waitForSelector('#seed-picker.show');
    await page.locator('.seed-choice[data-seed="tomato"]').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);

    const plot0 = page.locator('.plot[data-plot="0"]');
    await touchPlot(page, plot0, 'start', 30);
    await page.waitForTimeout(100);
    await touchPlot(page, plot0, 'end', 30);
    await page.waitForTimeout(100);

    // 水ツールを選択して長押し (900ms > WATER_HOLD_MS=800ms)
    await page.locator('#tool-water-btn').dispatchEvent('pointerdown');
    await touchPlot(page, plot0, 'start', 31);
    await page.waitForTimeout(900);
    await touchPlot(page, plot0, 'end', 31);
    await page.waitForTimeout(100);

    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('pono_hatake_state_v1')));
    expect(state.plots[0].wateredToday).toBe(true);
  });
});
