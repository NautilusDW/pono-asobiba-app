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

function waterPourParts(page, idx) {
  const plot = page.locator(`.plot[data-plot="${idx}"]`);
  const wrapper = plot.locator('.watering-pour-fx');
  return {
    plot,
    wrapper,
    can: wrapper.locator('.watering-can-fx'),
    stream: wrapper.locator('.watering-stream-fx'),
    splash: wrapper.locator('.water-splash-fx')
  };
}

async function expectNoWaterPour(page, idx) {
  const fx = waterPourParts(page, idx);
  await expect(fx.wrapper).toHaveCount(0);
  await expect(fx.can).toHaveCount(0);
  await expect(fx.stream).toHaveCount(0);
  await expect(fx.splash).toHaveCount(0);
}

async function pausePourAt(fx, currentTimeMs) {
  await fx.wrapper.evaluate((wrapper, timeMs) => {
    for (const selector of ['.watering-can-fx', '.watering-stream-fx']) {
      const element = wrapper.querySelector(selector);
      const animation = element && element.getAnimations()[0];
      if (!animation) throw new Error(`${selector} のanimationが見つかりません`);
      animation.pause();
      animation.currentTime = timeMs;
    }
    // currentTimeの変更を同じフレーム内でレイアウトへ反映する。
    wrapper.getBoundingClientRect();
  }, currentTimeMs);
}

async function resumePour(fx) {
  await fx.wrapper.evaluate((wrapper) => {
    for (const selector of ['.watering-can-fx', '.watering-stream-fx']) {
      const animation = wrapper.querySelector(selector)?.getAnimations()[0];
      if (animation && animation.playState === 'paused') animation.play();
    }
  });
}

async function measurePourAlignment(fx) {
  return fx.wrapper.evaluate((wrapper) => {
    const plot = wrapper.closest('.plot');
    const can = wrapper.querySelector('.watering-can-fx');
    const stream = wrapper.querySelector('.watering-stream-fx');
    const plotRect = plot.getBoundingClientRect();
    const streamRect = stream.getBoundingClientRect();

    // computed transform matrixをtransform-originの前後へ適用する。
    // CSS変数の値を写さず、実画像486×375内で計測した散水口画素65×174を
    // 独立した基準にして、CSS側のアンカーずれを検出する。
    const style = getComputedStyle(can);
    const matrix = style.transform === 'none'
      ? new DOMMatrixReadOnly()
      : new DOMMatrixReadOnly(style.transform);
    const [originX, originY] = style.transformOrigin
      .split(/\s+/)
      .slice(0, 2)
      .map(Number.parseFloat);
    const width = Number.parseFloat(style.width);
    const height = Number.parseFloat(style.height);
    const localSpout = new DOMPoint(
      width * (65 / can.naturalWidth) - originX,
      height * (174 / can.naturalHeight) - originY
    ).matrixTransform(matrix);
    const offsetParentRect = can.offsetParent.getBoundingClientRect();
    const canSpout = {
      x: offsetParentRect.left + can.offsetLeft + originX + localSpout.x,
      y: offsetParentRect.top + can.offsetTop + originY + localSpout.y
    };
    const streamStart = {
      x: streamRect.left + streamRect.width / 2,
      y: streamRect.top
    };
    const streamEnd = {
      x: streamRect.left + streamRect.width / 2,
      y: streamRect.bottom
    };
    const plotCenter = {
      x: plotRect.left + plotRect.width / 2,
      y: plotRect.top + plotRect.height / 2
    };
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    return {
      canNaturalWidth: can.naturalWidth,
      canNaturalHeight: can.naturalHeight,
      canSpout,
      streamStart,
      streamEnd,
      plotCenter,
      canToStreamDistance: distance(canSpout, streamStart),
      streamToPlotDistance: distance(streamEnd, plotCenter)
    };
  });
}

function expectPourAligned(geometry) {
  expect(geometry.canNaturalWidth).toBe(486);
  expect(geometry.canNaturalHeight).toBe(375);
  expect(geometry.canToStreamDistance).toBeLessThanOrEqual(2);
  expect(geometry.streamToPlotDistance).toBeLessThanOrEqual(2);
}

async function startSuccessfulPour(page, idx = 0) {
  await startGame(page);
  await plantNinjin(page, idx);
  await page.locator('#tool-water-btn').dispatchEvent('pointerdown');
  await page.waitForTimeout(100);
  await touchOn(page, `.plot[data-plot="${idx}"]`, 'touchstart');
  const fx = waterPourParts(page, idx);
  await page.waitForTimeout(790);
  await expect(fx.wrapper).toHaveCount(1, { timeout: 450 });
  await touchOn(page, `.plot[data-plot="${idx}"]`, 'touchend');
  return fx;
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
  await expect(page.locator('#status-bar')).toHaveText('みずやり できた！');
  const watered = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pono_hatake_state_v1')).plots[0].wateredToday);
  expect(watered).toBe(true);

  // 成功した対象畝だけに、実画像じょうろ・水流・着水演出をまとめて生成する。
  const fx = waterPourParts(page, 0);
  await expect(page.locator('.watering-pour-fx')).toHaveCount(1);
  await expect(fx.wrapper).toHaveCount(1);
  await expect(fx.can).toHaveCount(1);
  await expect(fx.stream).toHaveCount(1);
  await expect(fx.splash).toHaveCount(1);
  await expect(fx.can).toHaveAttribute(
    'src',
    /assets\/images\/Rooms\/furnitures_final\/deco_watering_can_B\.png$/
  );
  await expect(fx.splash).toHaveAttribute(
    'src',
    /assets\/images\/hatake-nikki\/watered_drop_mark_v2\.png$/
  );
  await expect.poll(() => fx.can.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  // 注水中盤へ固定し、実画像の散水口と水流が接続した状態を安定して測る。
  await pausePourAt(fx, 475);

  const fxState = await fx.wrapper.evaluate((wrapper) => {
    const plot = wrapper.closest('.plot');
    const plotRect = plot.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const centerTarget = document.elementFromPoint(
      plotRect.left + plotRect.width / 2,
      plotRect.top + plotRect.height / 2
    );
    const nodes = [
      wrapper,
      wrapper.querySelector('.watering-can-fx'),
      wrapper.querySelector('.watering-stream-fx'),
      wrapper.querySelector('.water-splash-fx')
    ];
    return {
      parentPlot: plot.dataset.plot,
      pointerEvents: nodes.map(node => getComputedStyle(node).pointerEvents),
      centerIsBlockedByFx: !!centerTarget && wrapper.contains(centerTarget),
      wrapperRect: {
        x: wrapperRect.x,
        y: wrapperRect.y,
        width: wrapperRect.width,
        height: wrapperRect.height
      },
      plotRect: {
        x: plotRect.x,
        y: plotRect.y,
        width: plotRect.width,
        height: plotRect.height
      }
    };
  });
  expect(fxState.parentPlot).toBe('0');
  expect(fxState.pointerEvents).toEqual(['none', 'none', 'none', 'none']);
  expect(fxState.centerIsBlockedByFx).toBe(false);
  expect(Math.abs(fxState.wrapperRect.x - fxState.plotRect.x)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(fxState.wrapperRect.y - fxState.plotRect.y)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(fxState.wrapperRect.width - fxState.plotRect.width)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(fxState.wrapperRect.height - fxState.plotRect.height)).toBeLessThanOrEqual(0.5);

  // 散水口→水流上端、水流下端→畝中央をそれぞれ2px以内へ固定する。
  const pourGeometry = await measurePourAlignment(fx);
  expectPourAligned(pourGeometry);
  const [plotBox, streamBox, splashBox] = await Promise.all([
    fx.plot.boundingBox(),
    fx.stream.boundingBox(),
    fx.splash.boundingBox()
  ]);
  expect(plotBox).toBeTruthy();
  expect(streamBox).toBeTruthy();
  expect(splashBox).toBeTruthy();
  const streamEndX = (streamBox.x + streamBox.width / 2 - plotBox.x) / plotBox.width;
  const streamEndY = (streamBox.y + streamBox.height - plotBox.y) / plotBox.height;
  const splashCenterX = (splashBox.x + splashBox.width / 2 - plotBox.x) / plotBox.width;
  expect(streamEndX).toBeGreaterThanOrEqual(0.46);
  expect(streamEndX).toBeLessThanOrEqual(0.58);
  expect(streamEndY).toBeGreaterThanOrEqual(0.42);
  expect(streamEndY).toBeLessThanOrEqual(0.62);
  expect(splashCenterX).toBeGreaterThanOrEqual(0.44);
  expect(splashCenterX).toBeLessThanOrEqual(0.58);

  // animationend（失火時は1300ms保険）で一時DOMを必ず片付ける。
  await resumePour(fx);
  await expect(fx.wrapper).toHaveCount(0, { timeout: 1400 });
  await expect(page.locator('#status-bar')).toHaveText(
    'きょうの みずやりは ぜんぶ できたよ！',
    { timeout: 1800 }
  );
  await expect(page.locator('.watering-pour-fx')).toHaveCount(0);
  await expect(page.locator('#status-bar')).toHaveText('きょうの みずやりは ぜんぶ できたよ！');
});

for (const viewport of [
  { width: 500, height: 300 },
  { width: 667, height: 375 },
  { width: 1169, height: 740 }
]) {
  test(`じょうろの散水口と水流は ${viewport.width}x${viewport.height} でも2px以内で接続する`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const fx = await startSuccessfulPour(page);
    await pausePourAt(fx, 475);
    expectPourAligned(await measurePourAlignment(fx));
    await resumePour(fx);
  });
}

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
  await expect(page.locator('#status-bar')).toHaveText('みずやり できた！'); // flash開始(最大1.6秒表示され得る)
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
  await expectNoWaterPour(page, 0);
  // 既に水やり済みの畝をあえて再度長押し
  await touchOn(page, '.plot[data-plot="0"]', 'touchstart');
  await page.waitForTimeout(100);
  await expect(page.locator('.plot[data-plot="0"]')).not.toHaveClass(/is-watering/); // ゲージ演出が始まらない
  await expectNoWaterPour(page, 0);
  await page.waitForTimeout(850);
  await touchOn(page, '.plot[data-plot="0"]', 'touchend');
  await page.waitForTimeout(100);
  await expect(page.locator('#status-bar')).not.toHaveText('みずやり できた！'); // 成功flashが再生されない
  await expectNoWaterPour(page, 0);
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
  await expectNoWaterPour(page, 0);
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
  await expectNoWaterPour(page, 0);
});

test('動きをへらす設定では0.35秒以内の静かな水やり演出になり、自動で片付く', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startGame(page);
  await plantNinjin(page, 0);
  await page.locator('#tool-water-btn').dispatchEvent('pointerdown');
  await page.waitForTimeout(100);

  const fx = waterPourParts(page, 0);
  await touchOn(page, '.plot[data-plot="0"]', 'touchstart');
  // 800ms成功直前まで進め、短いreduced-motion演出を確実に捕まえる。
  await page.waitForTimeout(790);
  await expect(fx.wrapper).toHaveCount(1, { timeout: 450 });
  await expect(fx.can).toHaveCount(1);
  await expect(fx.stream).toHaveCount(1);
  await expect(fx.splash).toHaveCount(1);
  await expect(fx.plot).toHaveClass(/is-watered/);

  const reducedMotionState = await fx.wrapper.evaluate((wrapper) => {
    const can = wrapper.querySelector('.watering-can-fx');
    const stream = wrapper.querySelector('.watering-stream-fx');
    const splash = wrapper.querySelector('.water-splash-fx');
    const durationSeconds = (element) => {
      const value = getComputedStyle(element).animationDuration.split(',')[0].trim();
      return value.endsWith('ms') ? parseFloat(value) / 1000 : parseFloat(value);
    };
    return {
      names: [can, stream, splash].map(element => getComputedStyle(element).animationName),
      durations: [can, stream, splash].map(durationSeconds),
      pointerEvents: [wrapper, can, stream, splash]
        .map(element => getComputedStyle(element).pointerEvents)
    };
  });
  expect(reducedMotionState.names).toEqual([
    'wateringCanReduced',
    'wateringStreamReduced',
    'waterSplashReduced'
  ]);
  for (const duration of reducedMotionState.durations) {
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThanOrEqual(0.35);
  }
  expect(reducedMotionState.pointerEvents).toEqual(['none', 'none', 'none', 'none']);

  await pausePourAt(fx, 170);
  expectPourAligned(await measurePourAlignment(fx));
  await resumePour(fx);
  await touchOn(page, '.plot[data-plot="0"]', 'touchend');
  await expect(fx.wrapper).toHaveCount(0, { timeout: 800 });
  await expectNoWaterPour(page, 0);
});

test('ステータスバーの状態遷移', async ({ page }) => {
  await startGame(page);
  await expect(page.locator('#status-bar')).toHaveText('たねボタンで たねを うえよう');
  await page.locator('#tool-seed-btn').dispatchEvent('pointerdown');
  await page.waitForSelector('#seed-picker.show');
  await page.locator('.seed-choice[data-seed="ninjin"]').dispatchEvent('pointerdown');
  await page.waitForTimeout(100);
  await expect(page.locator('#status-bar')).toHaveText('あいている はたけを タップ！ たねを うえるよ');
  await touchOn(page, '.plot[data-plot="1"]', 'touchstart');
  await touchOn(page, '.plot[data-plot="1"]', 'touchend');
  await page.waitForTimeout(100);
  await expect(page.locator('#status-bar')).toHaveText('じょうろボタンを おして みずやりしよう');
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
