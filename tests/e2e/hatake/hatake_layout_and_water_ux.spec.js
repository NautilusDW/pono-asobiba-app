// hatake-nikki/: 畑レイアウト崩れ(#field-bg 幽霊アセット + #tool-rail/.plot[data-plot="2"] 重なり)
// 修正と、水やり操作 discoverability 改善 (パルス演出 / ヒントトースト / 初回チュートリアル自動
// 表示) の回帰テスト。viewport は横画面 844x390 (子供が実際に遊ぶ横持ちスマホ相当)。
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

test.describe('hatake-nikki: layout regression (畝3枚がひし形地面の実測座標に合う)', () => {
  const viewports = [
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
    { width: 1366, height: 768 }
  ];
  const expectedCenters = [
    { x: 0.355, y: 0.429 },
    { x: 0.238, y: 0.549 },
    { x: 0.483, y: 0.565 }
  ];
  const fieldDiamond = [
    { x: 0.5, y: 0.125 },
    { x: 0.905, y: 0.54 },
    { x: 0.5, y: 0.961 },
    { x: 0.095, y: 0.537 }
  ];

  for (const viewport of viewports) test(`${viewport.width}x${viewport.height}: 畝3枚がひし形面内の実測三角配置に合う`, async ({ page }) => {
    await gotoFreshField(page, viewport);
    await closeTutorialIfOpen(page);

    // #field-bg 幽霊要素の完全撤去
    await expect(page.locator('#field-bg')).toHaveCount(0);

    // 畝は3枚ちょうど
    const plots = page.locator('.plot');
    await expect(plots).toHaveCount(3);

    const stageBox = await page.locator('#stage').boundingBox();
    const plotAreaBox = await page.locator('#plot-area').boundingBox();
    const railBox = await page.locator('#tool-rail').boundingBox();
    expect(stageBox).toBeTruthy();
    expect(plotAreaBox).toBeTruthy();
    expect(railBox).toBeTruthy();

    // 背景 contain と同じ 1200×670 面が stage の中央にあること。
    expect(Math.abs(plotAreaBox.width / plotAreaBox.height - 1200 / 670)).toBeLessThan(0.002);
    expect(Math.abs((plotAreaBox.y + plotAreaBox.height / 2) - (stageBox.y + stageBox.height / 2))).toBeLessThanOrEqual(1);

    const EPS = 1; // 誤差1px許容
    for (let i = 0; i < 3; i++) {
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

      // egg/index.html FARM_PLOT_POS と共通の実測中心座標。
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

    await page.screenshot({ path: `test-results/hatake_layout_3plots_${viewport.width}x${viewport.height}.png` });
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

    // 🚿 を選択 (pointerdown)
    await page.locator('#tool-water-btn').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);

    await expect(plot0).toHaveClass(/is-water-target/);
    await expect(page.locator('.plot[data-plot="1"]')).not.toHaveClass(/is-water-target/);
    await expect(page.locator('.plot[data-plot="2"]')).not.toHaveClass(/is-water-target/);

    // 🚿 を再度押して解除
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
