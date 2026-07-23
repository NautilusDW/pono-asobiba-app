// machizukuri/: やさいスタンド計量リビール (はたけにっき収穫 → common/hatake-harvest-bridge.js
// キュー → 天秤演出) の E2E 回帰テスト。
//
// tier ロック回避に window.__APP_BUILD__=1 が必須 (common/tier.js: APP_BUILD=1 の
// 時のみ 'app' tier になり、machizukuri の tier ロック画面を回避できる。
// tests/e2e/hatake/hatake_landscape_notice_start_btn.spec.js と同じパターン)。
//
// 収穫→キュー書き込みは hatake-nikki 側の実プレイフローに依存させず、
// localStorage に直接 pono_machi_state_v1 (lot3 に yasai_stand 設置済み) と
// pono_hatake_harvest_queue_v1 (未計量の収穫1件) を注入して決定的に再現する
// (common/hatake-harvest-bridge.js のスキーマは実ファイルで確認済み)。

const { test, expect } = require('@playwright/test');

async function setupPage(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
  });
}

async function waitForGameReady(page) {
  await page.waitForFunction(() => document.body.classList.contains('pono-game-ready'), null, { timeout: 10000 });
}

const MACHI_STATE_KEY = 'pono_machi_state_v1';
const QUEUE_KEY = 'pono_hatake_harvest_queue_v1';
const TUT_SEEN_KEY = 'pono_machi_tut_seen_v1'; // 初回2ステップチュートリアル (#tut-dim) が
// #stage 全面を覆い .lot タップを遮ってしまうため、既読済み扱いにして自動表示を止める
// (js/game.js TUT_SEEN_KEY と同じキー)。

function machiStateWithYasaiStand() {
  const lots = [];
  for (let i = 0; i < 12; i++) lots.push({ lotId: 'lot' + (i + 1), partId: null });
  lots[0].partId = 'pono_house';
  lots[1].partId = 'tree_maru';
  lots[2].partId = 'yasai_stand'; // lot3
  return {
    v: 1,
    harvestSpent: 0,
    lots,
    owned: {},
    flowers: 0,
    milestoneSeen: { district1: false },
  };
}

function harvestQueueItem(overrides) {
  return Object.assign({
    seedId: 'tomato',
    name: 'とまと',
    img: '../assets/images/hatake-nikki/crops/tomato_stage_4_ready.webp',
    weightMultiplier: 1.75,
    weight: 175,
    wiltCount: 0,
    bugsMissed: 0,
    extraDays: 5,
    ts: Date.now(),
  }, overrides || {});
}

async function seedStorage(page, { state, queue }) {
  await page.goto('/machizukuri/index.html');
  await page.evaluate(({ key1, val1, key2, val2, key3 }) => {
    try {
      localStorage.clear();
      if (val1 !== undefined) localStorage.setItem(key1, JSON.stringify(val1));
      if (val2 !== undefined) localStorage.setItem(key2, JSON.stringify(val2));
      localStorage.setItem(key3, '1');
    } catch (e) {}
  }, { key1: MACHI_STATE_KEY, val1: state, key2: QUEUE_KEY, val2: queue, key3: TUT_SEEN_KEY });
  await page.reload();
  await waitForGameReady(page);
}

async function startGame(page) {
  await page.locator('#start-btn').click({ force: true });
  await expect(page.locator('#town-screen')).toHaveClass(/show/);
}

test('未計量の収穫がある時、やさいスタンドをタップすると計量リビールが開き、天秤が静定してメッセージが出る', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await seedStorage(page, { state: machiStateWithYasaiStand(), queue: [harvestQueueItem({ weightMultiplier: 1.75 })] });
  await startGame(page);

  await page.locator('.lot[data-lot-id="lot3"]').click({ force: true });

  await expect(page.locator('#weigh-reveal')).toHaveClass(/show/);
  await expect(page.locator('#weigh-crop-img')).toHaveAttribute('src', /tomato_stage_4_ready\.webp/);

  // 天秤が静定してメッセージが表示されるまで待つ (revealSpringStep は数百msで静定する設計)
  await expect(page.locator('#weigh-msg')).toHaveClass(/show/, { timeout: 3000 });
  await expect(page.locator('#weigh-msg')).toHaveText('とっても おおきく そだったね！✨');

  // キューが消費されたこと (localStorage から取り除かれている)
  const remaining = await page.evaluate((key) => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return null; }
  }, QUEUE_KEY);
  expect(remaining).toEqual([]);

  expect(errors).toEqual([]);
  await ctx.close();
});

test('計量リビールを開いた直後 (静定を待たず) に閉じても harvestSpent ボーナスは既に反映されている', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);

  await seedStorage(page, { state: machiStateWithYasaiStand(), queue: [harvestQueueItem({ weightMultiplier: 1.75 })] });
  await startGame(page);

  await page.locator('.lot[data-lot-id="lot3"]').click({ force: true });
  await expect(page.locator('#weigh-reveal')).toHaveClass(/show/);

  // 静定を待たず即座に閉じる (アニメを見ずに背景タップ/close連打する子どもの操作を模す)
  await page.locator('#weigh-close-btn').click({ force: true });
  await expect(page.locator('#weigh-reveal')).not.toHaveClass(/show/);

  // weightMultiplier=1.75 → harvestWeighBonus = round(1.75) = 2 → harvestSpent 0-2=-2
  const savedState = await page.evaluate((key) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }, MACHI_STATE_KEY);
  expect(savedState.harvestSpent).toBe(-2);

  await ctx.close();
});

test('未計量の収穫が無い時、やさいスタンドをタップすると従来通りの装飾ポップオーバーが開く', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);

  await seedStorage(page, { state: machiStateWithYasaiStand(), queue: [] });
  await startGame(page);

  await page.locator('.lot[data-lot-id="lot3"]').click({ force: true });

  await expect(page.locator('#part-popover')).toHaveClass(/show/);
  await expect(page.locator('#weigh-reveal')).not.toHaveClass(/show/);
  await expect(page.locator('#popover-name')).toHaveText('やさいすたんど');

  await ctx.close();
});

test('低い weightMultiplier でも貶さない優しいメッセージが出る (罰の演出にしない)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);

  await seedStorage(page, { state: machiStateWithYasaiStand(), queue: [harvestQueueItem({ weightMultiplier: 0.4, seedId: 'ninjin', name: 'にんじん', img: '../assets/images/hatake-nikki/crops/ninjin_stage_4_ready.webp' })] });
  await startGame(page);

  await page.locator('.lot[data-lot-id="lot3"]').click({ force: true });
  await expect(page.locator('#weigh-msg')).toHaveClass(/show/, { timeout: 3000 });
  await expect(page.locator('#weigh-msg')).toHaveText('まあまあの おおきさだったよ。つぎも たのしみだね！');

  await ctx.close();
});
