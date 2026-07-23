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

test.describe('hatake-nikki: layout regression (畝4枚がひし形地面の実測座標に合う)', () => {
  const viewports = [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
    { width: 1366, height: 768 }
  ];
  const expectedPositions = [
    { left: 30.583333, top: 27.328358 },
    { left: 13.583333, top: 43.328358 },
    { left: 47.583333, top: 43.328358 },
    { left: 30.583333, top: 59.328358 }
  ];
  const expectedCenters = [
    { x: 0.405, y: 0.38 },
    { x: 0.235, y: 0.54 },
    { x: 0.575, y: 0.54 },
    { x: 0.405, y: 0.7 }
  ];
  const fieldDiamond = [
    { x: 0.5, y: 0.125 },
    { x: 0.905, y: 0.54 },
    { x: 0.5, y: 0.961 },
    { x: 0.095, y: 0.537 }
  ];

  for (const viewport of viewports) test(`${viewport.width}x${viewport.height}: 畝4枚がひし形面内の2×2配置に合う`, async ({ page }) => {
    await gotoFreshField(page, viewport);
    await closeTutorialIfOpen(page);

    // #field-bg 幽霊要素の完全撤去
    await expect(page.locator('#field-bg')).toHaveCount(0);

    // 畝は4枚ちょうど。ロック枠はなく、最初からすべて操作対象。
    const plots = page.locator('.plot');
    await expect(plots).toHaveCount(4);

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
    for (let i = 0; i < 4; i++) {
      const plotBox = await plots.nth(i).boundingBox();
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

      // green.png 上の2×2畑として決めた左上・中心座標。
      expect(Math.abs(normalized.x - expectedPositions[i].left / 100)).toBeLessThan(0.002);
      expect(Math.abs(normalized.y - expectedPositions[i].top / 100)).toBeLessThan(0.002);
      expect(Math.abs(normalizedCenter.x - expectedCenters[i].x)).toBeLessThan(0.002);
      expect(Math.abs(normalizedCenter.y - expectedCenters[i].y)).toBeLessThan(0.002);
      expect(Math.abs(normalized.width - 238 / 1200)).toBeLessThan(0.002);
      expect(Math.abs(normalized.height - 143 / 670)).toBeLessThan(0.002);

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

      // 最小横画面でも指で押せるヒット領域を維持。
      expect(plotBox.width).toBeGreaterThanOrEqual(44);
      expect(plotBox.height).toBeGreaterThanOrEqual(44);

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
    expect(hitTargets.centers).toEqual(['0', '1', '2', '3']);
    expect(Object.values(hitTargets.visibleSamplesByPlot).every((count) => count > 0)).toBe(true);
    expect(hitTargets.mismatches).toEqual([]);

    await page.screenshot({ path: `test-results/hatake_layout_4plots_${viewport.width}x${viewport.height}.png` });
  });

  test('奥の枠と4枠目を順に触っても、対象の畝だけに植えられる', async ({ page }) => {
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
    expect(state.plots[1].seedId).toBe(null);
    expect(state.plots[2].seedId).toBe(null);

    // 4枠目も最初から使用可能で、中心タップが0〜2枠目を変更しない。
    await page.locator('#tool-seed-btn').dispatchEvent('pointerdown');
    await page.waitForSelector('#seed-picker.show');
    await page.locator('.seed-choice[data-seed="ninjin"]').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);

    const plot3 = page.locator('.plot[data-plot="3"]');
    await touchPlot(page, plot3, 'start', 1426);
    await page.waitForTimeout(100);
    await touchPlot(page, plot3, 'end', 1426);
    await page.waitForTimeout(100);

    const stateAfterPlot3 = await page.evaluate(() => JSON.parse(localStorage.getItem('pono_hatake_state_v1')));
    expect(stateAfterPlot3.plots).toHaveLength(4);
    expect(stateAfterPlot3.plots[0].seedId).toBe('tomato');
    expect(stateAfterPlot3.plots[1].seedId).toBe(null);
    expect(stateAfterPlot3.plots[2].seedId).toBe(null);
    expect(stateAfterPlot3.plots[3].seedId).toBe('ninjin');
  });

  test('旧3区画セーブを4区画へ移行し、既存データを保ったまま4枠目を植栽・水やりできる', async ({ page }) => {
    const legacyPlots = [
      { seedId: 'tomato', daysGrown: 2, wateredToday: true, wilted: false, bug: false },
      { seedId: 'ninjin', daysGrown: 1, wateredToday: false, wilted: true, bug: false },
      { seedId: null, daysGrown: 0, wateredToday: false, wilted: false, bug: false }
    ];
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

    await expect(page.locator('.plot')).toHaveCount(4);
    const migratedState = await page.evaluate(() => JSON.parse(localStorage.getItem('pono_hatake_state_v1')));
    expect(migratedState.plots).toHaveLength(4);
    expect(migratedState.plots.slice(0, 3)).toEqual(legacyPlots);
    expect(migratedState.plots[3]).toEqual({
      seedId: null,
      daysGrown: 0,
      wateredToday: false,
      wilted: false,
      bug: false
    });

    await page.locator('#tool-seed-btn').dispatchEvent('pointerdown');
    await page.waitForSelector('#seed-picker.show');
    await page.locator('.seed-choice[data-seed="tomato"]').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);
    const plot3 = page.locator('.plot[data-plot="3"]');
    await touchPlot(page, plot3, 'start', 1430);
    await page.waitForTimeout(100);
    await touchPlot(page, plot3, 'end', 1430);
    await page.waitForTimeout(100);

    await page.locator('#tool-water-btn').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);
    await expect(plot3).toHaveClass(/is-water-target/);
    await touchPlot(page, plot3, 'start', 1431);
    await page.waitForTimeout(900);
    await touchPlot(page, plot3, 'end', 1431);
    await page.waitForTimeout(100);

    const finalState = await page.evaluate(() => JSON.parse(localStorage.getItem('pono_hatake_state_v1')));
    expect(finalState.plots).toHaveLength(4);
    expect(finalState.plots.slice(0, 3)).toEqual(legacyPlots);
    expect(finalState.plots[3]).toEqual({
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
    await expect(plots.nth(0)).toHaveAttribute('aria-label', 'おくの あいている はたけ');
    await expect(plots.nth(1)).toHaveAttribute('aria-label', 'ひだりの あいている はたけ');
    await expect(plots.nth(2)).toHaveAttribute('aria-label', 'みぎの あいている はたけ');
    await expect(plots.nth(3)).toHaveAttribute('aria-label', 'てまえの あいている はたけ');

    const seedTool = page.locator('#tool-seed-btn');
    await seedTool.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#seed-picker')).toHaveClass(/show/);

    const tomatoChoice = page.locator('.seed-choice[data-seed="tomato"]');
    await tomatoChoice.focus();
    await page.keyboard.press('Space');
    await expect(page.locator('#seed-picker')).not.toHaveClass(/show/);
    await expect(seedTool).toHaveClass(/is-active/);

    const frontPlot = plots.nth(3);
    await frontPlot.focus();
    await page.keyboard.press('Enter');
    await expect(frontPlot).toHaveAttribute('aria-label', 'てまえの とまとの はたけ。きょうの みずやりは まだ');

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
    await expect(backPlot).toHaveAttribute('aria-label', 'おくの にんじんの はたけ。きょうの みずやりは まだ');

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
    await expect(page.locator('.plot[data-plot="1"]')).not.toHaveClass(/is-water-target/);
    await expect(page.locator('.plot[data-plot="2"]')).not.toHaveClass(/is-water-target/);
    await expect(page.locator('.plot[data-plot="3"]')).not.toHaveClass(/is-water-target/);

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
