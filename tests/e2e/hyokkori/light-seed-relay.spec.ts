const { test, expect } = require('@playwright/test');

const ASSET_BASE = '/assets/images/hyokkori-hightouch/';
const EXPECTED_ASSETS = [
  'bg_forest_morning_16x9.png',
  'flowerbed_stage_0_soil.png',
  'flowerbed_stage_1_sprout.png',
  'flowerbed_stage_2_buds.png',
  'flowerbed_stage_3_bloom.png',
  'friend_araiguma_awake.png',
  'friend_araiguma_sleeping.png',
  'friend_fukurou_awake.png',
  'friend_fukurou_sleeping.png',
  'friend_harinezumi_awake.png',
  'friend_harinezumi_sleeping.png',
  'friend_hikari_momonga_bonus_awake.png',
  'friend_karasu_awake.png',
  'friend_karasu_sleeping.png',
  'friend_kitsune_awake.png',
  'friend_kitsune_sleeping.png',
  'friend_kojika_awake.png',
  'friend_kojika_sleeping.png',
  'friend_risu_awake.png',
  'friend_risu_sleeping.png',
  'friend_usagi_awake.png',
  'friend_usagi_sleeping.png',
  'fx_highfive_burst.png',
  'fx_leaf_puff.png',
  'fx_overheat_swirl.png',
  'fx_sleep_moon_cloud.png',
  'hideout_leaf_bush.png',
  'hideout_stump.png',
  'hideout_tree_roots.png',
  'mechanic_light_seed.png',
  'menu_thumb_highfive_relay.png',
  'pono_result_bloom.png',
  'pono_title_highfive.png',
];

async function relaySnapshot(page) {
  return page.evaluate(() => {
    const seed = document.getElementById('light-seed');
    const flowerbed = document.getElementById('flowerbed-img');
    const relay = document.getElementById('relay-progress');
    const announcement = document.getElementById('relay-announcement');
    const pips = Array.from(document.querySelectorAll('#relay-pips .relay-pip'));
    return {
      holder: seed && seed.getAttribute('data-holder'),
      stage: flowerbed && flowerbed.getAttribute('data-stage'),
      flowerSrc: flowerbed && new URL(flowerbed.getAttribute('src'), location.href).pathname,
      litPips: pips.map((pip) => pip.classList.contains('is-lit')),
      // 花壇段階と4つの点灯状態を、画面上のリレー進行値として固定する。
      relayProgress: `${flowerbed && flowerbed.getAttribute('data-stage')}:${pips
        .map((pip) => (pip.classList.contains('is-lit') ? '1' : '0'))
        .join('')}`,
      relayLabel: relay && relay.getAttribute('aria-label'),
      announcement: announcement && announcement.textContent,
    };
  });
}

async function visibleHoleIndices(page, kind) {
  return page.evaluate((wantedKind) => Array.from(document.querySelectorAll('.hh-hole'))
    .filter((hole) => {
      const wrap = hole.querySelector('.hh-char-wrap');
      if (!wrap || !wrap.classList.contains('is-visible')) return false;
      const sleeping = wrap.classList.contains('is-sleeping');
      return wantedKind === 'sleeping' ? sleeping : !sleeping;
    })
    .map((hole) => hole.getAttribute('data-hole')), kind);
}

async function clickNextAwake(page, previousHolder) {
  const deadline = Date.now() + 12_000;

  while (Date.now() < deadline) {
    const candidates = await visibleHoleIndices(page, 'awake');
    for (const index of candidates) {
      if (index === previousHolder) continue;

      const hole = page.locator(`.hh-hole[data-hole="${index}"]`);
      // aria-label は内部 occupant と同時に戻るので、退場アニメだけが残った穴を除外できる。
      if (await hole.getAttribute('aria-label') !== 'ハイタッチする おともだち') continue;

      const holderBefore = await page.locator('#light-seed').getAttribute('data-holder');
      await hole.locator('.hh-window').click({ force: true });
      try {
        await page.waitForFunction(
          ({ next, before }) => {
            const seed = document.getElementById('light-seed');
            const holder = seed && seed.getAttribute('data-holder');
            return holder === next && holder !== before;
          },
          { next: index, before: holderBefore },
          { timeout: 550 },
        );
        return index;
      } catch (_e) {
        // 出現期限との境界で空振りになった場合は、入力ロック解除後に次のawakeを待つ。
        await page.waitForTimeout(420);
      }
    }
    await page.waitForTimeout(45);
  }

  throw new Error('awake のおともだちを時間内に安全にタップできませんでした');
}

async function expectHolderExcludedDuringNextSpawn(page, holder) {
  const wrap = page.locator(`.hh-hole[data-hole="${holder}"] .hh-char-wrap`);

  // 成功時の退場アニメが終わった時点から、開始時の最大出現間隔(1250ms)を
  // 1回以上またいで監視する。たねを持つ穴が次の出現候補に戻る回帰を検知する。
  await expect(wrap).not.toHaveClass(/is-visible/, { timeout: 900 });
  const deadline = Date.now() + 1_450;
  while (Date.now() < deadline) {
    expect(await wrap.getAttribute('class')).not.toMatch(/\bis-visible\b/);
    await page.waitForTimeout(40);
  }
}

async function clickSleepingAndAssertRelayUnchanged(page, holder) {
  const holderWrap = page.locator(`.hh-hole[data-hole="${holder}"] .hh-char-wrap`);
  await expect(holderWrap).not.toHaveClass(/is-visible/, { timeout: 900 });
  const deadline = Date.now() + 38_000;

  while (Date.now() < deadline) {
    // 最後の成功地点は、睡眠を待つ間も出現候補から外れ続ける。
    expect(await holderWrap.getAttribute('class')).not.toMatch(/\bis-visible\b/);

    const sleepers = await visibleHoleIndices(page, 'sleeping');
    for (const index of sleepers) {
      if (index === holder) continue;
      const hole = page.locator(`.hh-hole[data-hole="${index}"]`);
      if (await hole.getAttribute('aria-label') !== 'ねている おともだち') continue;

      const before = await relaySnapshot(page);
      await hole.locator('.hh-window').click({ force: true });
      await expect(hole.locator('.hh-char-wrap')).toHaveClass(/is-wobble/, { timeout: 700 });
      const after = await relaySnapshot(page);
      expect(after).toEqual(before);
      return;
    }
    await page.waitForTimeout(45);
  }

  throw new Error('sleeping のおともだちが時間内に出現しませんでした');
}

test('ひかりのたね: 4回のリレーで花壇が育ち、睡眠タップでは進行しない', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) { /* noop */ }
  });

  const consoleErrors = [];
  const pageErrors = [];
  const failedAssetRequests = [];
  const assetResponses = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith(ASSET_BASE)) {
      failedAssetRequests.push(`${url.pathname}: ${request.failure() && request.failure().errorText}`);
    }
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith(ASSET_BASE)) {
      assetResponses.push({ path: url.pathname, status: response.status() });
    }
  });

  await page.goto('/hyokkori-hightouch/index.html');
  await page.waitForFunction(() => !!window.HyokkoriLogic);

  expect(EXPECTED_ASSETS).toHaveLength(33);
  expect(EXPECTED_ASSETS.some((name) => name.includes('reference_only'))).toBe(false);
  const assetResults = await page.evaluate(async ({ base, names }) => Promise.all(names.map(async (name) => {
    const response = await fetch(base + name, { cache: 'no-store' });
    const type = response.headers.get('content-type') || '';
    await response.blob();
    return { name, status: response.status, ok: response.ok, type };
  })), { base: ASSET_BASE, names: EXPECTED_ASSETS });
  expect(assetResults).toEqual(EXPECTED_ASSETS.map((name) => expect.objectContaining({
    name,
    status: 200,
    ok: true,
    type: expect.stringMatching(/^image\/png(?:;|$)/),
  })));

  await page.locator('#start-btn').click({ force: true });
  await expect(page.locator('#countdown-screen')).not.toHaveClass(/show/, { timeout: 3_000 });

  let holder = 'flowerbed';
  for (let hit = 1; hit <= 4; hit += 1) {
    const nextHolder = await clickNextAwake(page, holder);
    expect(nextHolder).not.toBe(holder);
    holder = nextHolder;

    const snapshot = await relaySnapshot(page);
    expect(snapshot.holder).toBe(holder);
    expect(snapshot.stage).toBe(String(Math.floor(hit / 4)));
    expect(snapshot.litPips.filter(Boolean)).toHaveLength(hit % 4);

    if (hit < 4) await expectHolderExcludedDuringNextSpawn(page, holder);
  }

  const grown = await relaySnapshot(page);
  expect(grown.stage).toBe('1');
  expect(grown.flowerSrc).toBe(`${ASSET_BASE}flowerbed_stage_1_sprout.png`);
  await expect(page.locator('#relay-announcement')).toHaveText('', { timeout: 2_000 });
  await clickSleepingAndAssertRelayUnchanged(page, holder);

  expect(failedAssetRequests).toEqual([]);
  expect(assetResponses.some(({ path }) => path.includes('reference_only'))).toBe(false);
  expect(assetResponses.filter(({ status }) => status === 404)).toEqual([]);
  for (const name of EXPECTED_ASSETS) {
    expect(assetResponses.some(({ path, status }) => path === ASSET_BASE + name && status === 200)).toBe(true);
  }
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('キーボードで開始・チュートリアル送りができ、説明中はゲーム時間が止まる', async ({ page }) => {
  test.setTimeout(20_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/hyokkori-hightouch/index.html');
  await page.waitForFunction(() => !!window.HyokkoriLogic);

  await page.locator('#start-btn').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#countdown-screen')).not.toHaveClass(/show/, { timeout: 3_000 });
  await expect(page.locator('.pono-menu-toggle')).toBeVisible();

  await page.locator('.pono-menu-toggle').click({ force: true });
  await page.getByText('あそびかた', { exact: true }).click({ force: true });
  await expect(page.locator('#tut-bubble')).not.toHaveClass(/hidden/);

  const timerBefore = await page.locator('#hud-timer').textContent();
  await page.waitForTimeout(1_700);
  await expect(page.locator('#hud-timer')).toHaveText(timerBefore || '');

  await page.locator('#tut-next').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#tut-bubble')).toContainText('ねてる こは');

  await page.locator('#tut-dim').evaluate((element) => element.click());
  await expect(page.locator('#tut-bubble')).toHaveClass(/hidden/);
  await page.waitForFunction(
    (before) => document.getElementById('hud-timer')?.textContent !== before,
    timerBefore,
    { timeout: 2_500 },
  );
});
