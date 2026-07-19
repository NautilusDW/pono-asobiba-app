// TEMP reviewer-only script, not part of the permanent suite. Deleted after use.
const { test, expect } = require('@playwright/test');

const FIXTURE_PATH = '/tests/e2e/treasure/_manual_repro_boundary15.html';

async function waitForOverlayLabel(page, label) {
  await page.waitForFunction(
    (want) => {
      var el = document.getElementById('treasure-label');
      var overlay = document.getElementById('treasure-overlay');
      return !!el && el.textContent === want && overlay && overlay.classList.contains('show');
    },
    label,
    { timeout: 8000 }
  );
}

async function tapToOpen(page) {
  await page.waitForFunction(
    () => {
      var overlay = document.getElementById('treasure-overlay');
      var btn = document.querySelector('.treasure-tap-overlay button');
      if (!overlay || !overlay.classList.contains('visible') || !btn) return false;
      var r = btn.getBoundingClientRect();
      return r.width > 10 && r.height > 10;
    },
    undefined,
    { timeout: 8000 }
  );
  const btn = page.locator('#treasure-container').getByText('タップして あけよう！');
  await btn.click({ force: true });
}

async function waitForChoiceGridShown(page) {
  await page.waitForFunction(
    () => {
      var grid = document.getElementById('treasure-choice-grid');
      return !!grid && grid.classList.contains('show');
    },
    undefined,
    { timeout: 8000 }
  );
}

// showAfterMsgOverlay() (common/stamp-rally.js) creates its own z-index:99999 modal
// appended to document.body AFTER #treasure-overlay, so it visually stacks on top of
// (and blocks taps into) any treasure box the queue has already silently started
// underneath it. Dismiss it the way a real child would (tap through つぎへ→/わかった！).
async function dismissAnyAfterMsg(page) {
  // _doClose()'s onClose (which is what fires showAfterMsgOverlay) only runs 350ms
  // after the close-button click (see common/treasure.js _doClose's scale-out
  // setTimeout), so give it a moment to actually appear before concluding there's
  // nothing to dismiss.
  await page.waitForTimeout(600);
  for (let i = 0; i < 3; i++) {
    const btn = page.getByText('わかった！').or(page.getByText('つぎへ →'));
    const count = await btn.count();
    if (count === 0) return;
    await btn.first().click();
    await page.waitForTimeout(400);
  }
}

async function chooseAndClose(page, choiceIdx) {
  await waitForChoiceGridShown(page);
  await page.locator('.treasure-choice-btn[data-choice-idx="' + choiceIdx + '"]').click();
  await page.waitForFunction(
    () => {
      var btn = document.getElementById('treasure-close');
      return !!btn && btn.classList.contains('show');
    },
    undefined,
    { timeout: 8000 }
  );
  await page.locator('#treasure-close').click();
}

test('REAL common/treasure.js + common/stamp-rally.js: total=15 boundary grants both slot15 and card1-complete rewards, no loss no dup', async ({ page }) => {
  test.setTimeout(60_000);
  page.on('console', (msg) => console.log('PAGE:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));
  await page.goto(FIXTURE_PATH);
  await page.evaluate(() => window.__runBoundary15());

  // ── 1件目: スロット15報酬 (「スタンプボーナス」ラベル) ──
  await waitForOverlayLabel(page, 'スタンプボーナス');
  await tapToOpen(page);
  await chooseAndClose(page, 0); // きのほんだな (boy) を選ぶ
  await dismissAnyAfterMsg(page); // 「ほんだなが もらえたよ！」わかった！ を閉じる

  // ── 2件目: カード完成報酬 (「カードかんせいボーナス」ラベル) ──
  // 1件目が完全に閉じ切った直後、キューから自動的に始まるはず (これがCriticalバグの核心)。
  await waitForOverlayLabel(page, 'カードかんせいボーナス');
  await tapToOpen(page);
  await chooseAndClose(page, 1); // ハートのかべがみ (girl) を選ぶ
  await dismissAnyAfterMsg(page);

  // 2件目の close 完了を待つ
  await page.waitForTimeout(500);

  const grantLog = await page.evaluate(() => window.grantLog);
  const given = await page.evaluate(() => JSON.parse(localStorage.getItem('pono_stamp_rewards_given') || '[]'));
  const detail = await page.evaluate(() => JSON.parse(localStorage.getItem('pono_stamp_rewards_detail') || '{}'));

  console.log('grantLog:', JSON.stringify(grantLog));
  console.log('given:', JSON.stringify(given));
  console.log('detail keys:', Object.keys(detail));

  expect(grantLog.length).toBe(2);
  expect(grantLog).toEqual(
    expect.arrayContaining([
      { type: 'furn', id: 'imp_furn_5eb65839' }, // きのほんだな (boy variant, choice idx 0)
      { type: 'wall', id: 'wall_heart' },        // ハートのかべがみ (girl variant, choice idx 1)
    ])
  );
  // given[] starts pre-seeded with card1_slot1/card1_slot8 (simulating that those were
  // already granted earlier in real progression) + the 2 newly granted at this total=15
  // boundary = 4 total, all unique (no double-grant of anything, including the pre-seeded).
  expect(given.length).toBe(4);
  expect(new Set(given).size).toBe(4);
  expect(given).toEqual(expect.arrayContaining(['card1_slot1', 'card1_slot8', 'card1_slot15', 'card_1']));
});
