// hatake-nikki/: 水やり長押し中のネイティブコールアウト抑止 + 水やり成功フィードバック
// (バッジ/演出/flash文言) + 常設ステータスバー + #stage背景のcontain化(ひし形頂点欠け
// 不能化) の回帰テスト。既存 hatake_layout_and_water_ux.spec.js と同じ流儀を踏襲する。
//
// tier ガード: hatake-nikki/index.html は tier:'app' 専用ゲームのため、
// window.__APP_BUILD__=1 を addInitScript で注入しないと tier ロック画面が出て
// #start-btn 以降のフローを検証できない (donguri-wakekko / 既存 hatake spec のパターンを踏襲)。

const { test, expect } = require('@playwright/test');

test.use({ hasTouch: true, viewport: { width: 844, height: 390 } });

const URL = '/hatake-nikki/index.html';

async function setAppBuild(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
  });
}

async function waitForGameReady(page) {
  await page.waitForFunction(() => document.body.classList.contains('pono-game-ready'), null, { timeout: 10000 });
}

async function startGame(page) {
  await setAppBuild(page);
  await page.goto(URL);
  await page.evaluate(() => {
    try {
      localStorage.setItem('pono_hatake_tut_seen_v1', '1'); // チュートリアル抑止
      localStorage.removeItem('pono_hatake_state_v1');
    } catch (e) {}
  });
  await page.reload();
  await waitForGameReady(page);
  await page.locator('#start-btn').click({ force: true });
  await expect(page.locator('#field-screen')).toHaveClass(/show/);
  await page.waitForTimeout(150);
  const diaryVisible = await page.locator('#diary-overlay.show').count();
  if (diaryVisible) {
    await page.locator('#diary-close-btn').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);
  }
}

// TouchEvent を .plot の実リスナー (touchstart/touchend/touchcancel) に直接届ける
function touchOn(page, selector, type) {
  return page.locator(selector).evaluate((el, t) => {
    const r = el.getBoundingClientRect();
    const touch = new Touch({
      identifier: 1, target: el,
      clientX: r.x + r.width / 2, clientY: r.y + r.height / 2
    });
    el.dispatchEvent(new TouchEvent(t, { changedTouches: [touch], bubbles: true, cancelable: true }));
  }, type);
}

async function plantNinjin(page, idx) {
  await page.locator('#tool-seed-btn').dispatchEvent('pointerdown');
  await page.waitForSelector('#seed-picker.show');
  await page.locator('.seed-choice[data-seed="ninjin"]').dispatchEvent('pointerdown');
  await page.waitForTimeout(100);
  await touchOn(page, `.plot[data-plot="${idx}"]`, 'touchstart');
  await touchOn(page, `.plot[data-plot="${idx}"]`, 'touchend');
  await page.waitForTimeout(100);
}

test('contextmenu は preventDefault される (長押しメニュー抑止)', async ({ page }) => {
  await startGame(page);
  const prevented = await page.locator('#stage').evaluate(el => {
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  expect(prevented).toBe(true);
  // -webkit-touch-callout は WebKit 系のみ計算値が取れるので存在時のみ検証
  const callout = await page.evaluate(() =>
    ('webkitTouchCallout' in document.body.style)
      ? getComputedStyle(document.querySelector('.plot')).webkitTouchCallout : null);
  if (callout !== null) expect(callout).toBe('none');
});

test('800ms長押しで水やり成功 → is-watered + 成功flash + パルス除外', async ({ page }) => {
  await startGame(page);
  await plantNinjin(page, 0);
  await page.locator('#tool-water-btn').dispatchEvent('pointerdown');
  await page.waitForTimeout(100);
  await expect(page.locator('.plot[data-plot="0"]')).toHaveClass(/is-water-target/);
  await touchOn(page, '.plot[data-plot="0"]', 'touchstart');
  await page.waitForTimeout(100);
  await expect(page.locator('#status-bar')).toHaveText('そのまま ゆびを はなさないでね…');
  await page.waitForTimeout(850);
  await touchOn(page, '.plot[data-plot="0"]', 'touchend');
  await page.waitForTimeout(100);
  await expect(page.locator('.plot[data-plot="0"]')).toHaveClass(/is-watered/);
  await expect(page.locator('.plot[data-plot="0"]')).not.toHaveClass(/is-water-target/); // 済みはパルスしない
  await expect(page.locator('#status-bar')).toHaveText('💧 みずやり できた！');
  const watered = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pono_hatake_state_v1')).plots[0].wateredToday);
  expect(watered).toBe(true);
  await page.waitForTimeout(1700); // flash 復帰
  await expect(page.locator('#status-bar')).toHaveText('きょうの みずやりは ぜんぶ できたよ！');
});

test('水やり成功flash中でも別畝の長押しはholding文言で即座に割り込む(優先度1)', async ({ page }) => {
  await startGame(page);
  await plantNinjin(page, 0);
  await plantNinjin(page, 1);
  await page.locator('#tool-water-btn').dispatchEvent('pointerdown');
  await page.waitForTimeout(100);
  await touchOn(page, '.plot[data-plot="0"]', 'touchstart');
  await page.waitForTimeout(850);
  await touchOn(page, '.plot[data-plot="0"]', 'touchend');
  await page.waitForTimeout(50);
  await expect(page.locator('#status-bar')).toHaveText('💧 みずやり できた！'); // flash開始(最大1.6秒表示され得る)
  // flash 表示中に畝1を長押し開始 → 優先度1のholding文言が即座に(200ms未満で)割り込むはず
  await touchOn(page, '.plot[data-plot="1"]', 'touchstart');
  await page.waitForTimeout(100); // 保持 ~100ms 時点
  await expect(page.locator('#status-bar')).toHaveText('そのまま ゆびを はなさないでね…');
  await page.waitForTimeout(600); // 保持 ~700ms 時点(800msタイマー完了前)でも継続していること
  await expect(page.locator('#status-bar')).toHaveText('そのまま ゆびを はなさないでね…');
  await page.waitForTimeout(250); // 800msタイマー完了 → 自動で水やり成立
  await expect(page.locator('.plot[data-plot="1"]')).toHaveClass(/is-watered/);
});

test('水やり済みの畝を再度長押ししても成功フローは再生されない', async ({ page }) => {
  await startGame(page);
  await plantNinjin(page, 0);
  await page.locator('#tool-water-btn').dispatchEvent('pointerdown');
  await page.waitForTimeout(100);
  await touchOn(page, '.plot[data-plot="0"]', 'touchstart');
  await page.waitForTimeout(850);
  await touchOn(page, '.plot[data-plot="0"]', 'touchend');
  await page.waitForTimeout(1700); // flash 復帰待ち
  await expect(page.locator('#status-bar')).toHaveText('きょうの みずやりは ぜんぶ できたよ！');
  const splashCountBefore = await page.locator('.plot[data-plot="0"] .water-splash-fx').count();
  // 既に水やり済みの畝をあえて再度長押し
  await touchOn(page, '.plot[data-plot="0"]', 'touchstart');
  await page.waitForTimeout(100);
  await expect(page.locator('.plot[data-plot="0"]')).not.toHaveClass(/is-watering/); // ゲージ演出が始まらない
  await page.waitForTimeout(850);
  await touchOn(page, '.plot[data-plot="0"]', 'touchend');
  await page.waitForTimeout(100);
  await expect(page.locator('#status-bar')).not.toHaveText('💧 みずやり できた！'); // 成功flashが再生されない
  const splashCountAfter = await page.locator('.plot[data-plot="0"] .water-splash-fx').count();
  expect(splashCountAfter).toBe(splashCountBefore);
});

test('touchcancel で中断 → 水やり不成立 + リトライ文言', async ({ page }) => {
  await startGame(page);
  await plantNinjin(page, 0);
  await page.locator('#tool-water-btn').dispatchEvent('pointerdown');
  await page.waitForTimeout(100);
  await touchOn(page, '.plot[data-plot="0"]', 'touchstart');
  await page.waitForTimeout(300);
  await touchOn(page, '.plot[data-plot="0"]', 'touchcancel');
  await page.waitForTimeout(100);
  await expect(page.locator('.plot[data-plot="0"]')).not.toHaveClass(/is-watered/);
  await expect(page.locator('.plot[data-plot="0"]')).not.toHaveClass(/is-watering/);
  await expect(page.locator('#status-bar')).toHaveText('もういちど ながおしして みてね');
  const watered = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pono_hatake_state_v1')).plots[0].wateredToday);
  expect(watered).toBe(false);
});

test('早すぎるリリース(800ms未満) → 水やり不成立 + リトライ文言', async ({ page }) => {
  await startGame(page);
  await plantNinjin(page, 0);
  await page.locator('#tool-water-btn').dispatchEvent('pointerdown');
  await page.waitForTimeout(100);
  await touchOn(page, '.plot[data-plot="0"]', 'touchstart');
  await page.waitForTimeout(200);
  await touchOn(page, '.plot[data-plot="0"]', 'touchend');
  await page.waitForTimeout(100);
  await expect(page.locator('.plot[data-plot="0"]')).not.toHaveClass(/is-watered/);
  await expect(page.locator('#status-bar')).toHaveText('もうすこし ながく おしてね');
});

test('ステータスバーの状態遷移', async ({ page }) => {
  await startGame(page);
  await expect(page.locator('#status-bar')).toHaveText('🌱ボタンで たねを うえよう');
  await page.locator('#tool-seed-btn').dispatchEvent('pointerdown');
  await page.waitForSelector('#seed-picker.show');
  await page.locator('.seed-choice[data-seed="ninjin"]').dispatchEvent('pointerdown');
  await page.waitForTimeout(100);
  await expect(page.locator('#status-bar')).toHaveText('あいている はたけを タップ！ たねを うえるよ');
  await touchOn(page, '.plot[data-plot="1"]', 'touchstart');
  await touchOn(page, '.plot[data-plot="1"]', 'touchend');
  await page.waitForTimeout(100);
  await expect(page.locator('#status-bar')).toHaveText('🚿ボタンを おして みずやりしよう');
  await page.locator('#tool-water-btn').dispatchEvent('pointerdown');
  await page.waitForTimeout(100);
  await expect(page.locator('#status-bar')).toHaveText('ひかる はたけを ながおしして みずやり！');
});

for (const vp of [{ width: 1057, height: 605 }, { width: 844, height: 390 }, { width: 932, height: 430 }, { width: 667, height: 375 }]) {
  test(`stage/畑背景が画面内に収まる ${vp.width}x${vp.height}`, async ({ page }) => {
    await setAppBuild(page);
    await page.setViewportSize(vp);
    await page.goto(URL);
    await waitForGameReady(page);
    const box = await page.locator('#stage').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(-0.5);
    expect(box.y).toBeGreaterThanOrEqual(-0.5);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 0.5);
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 0.5);
    expect(Math.abs(box.width / box.height - 16 / 9)).toBeLessThan(0.02); // 16:9 厳守
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    // contain なら背景クロップゼロ = ひし形頂点欠け不能
    expect(await page.evaluate(() =>
      getComputedStyle(document.getElementById('stage')).backgroundSize)).toBe('contain');
  });
}
