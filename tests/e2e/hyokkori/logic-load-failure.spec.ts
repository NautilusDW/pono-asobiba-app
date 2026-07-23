// hyokkori-hightouch/: 必須の locations.js / logic.js 読み込み失敗時の耐性テスト。
// どちらか一方が欠けても、見た目だけ正常で無反応なタイトルを残さず、
// 1回のキャッシュバイパス再試行か、明示的な再読込UIへ縮退することを固定する。
const { test, expect } = require('@playwright/test');

async function setupPage(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) {}
  });
}

for (const dependency of ['locations', 'logic']) {
  test(`${dependency}.js の初回読み込みが失敗しても自動リトライで復帰し、開始できる`, async ({ page }) => {
    await setupPage(page);
    let aborted = false;
    await page.route(`**/hyokkori-hightouch/js/${dependency}.js*`, (route) => {
      if (!aborted) {
        aborted = true;
        return route.abort();
      }
      return route.continue();
    });
    await page.goto('/hyokkori-hightouch/index.html');

    await page.waitForFunction(() => (
      !!window.HyokkoriLocations
      && !!window.HyokkoriLogic
      && document.body.classList.contains('pono-game-ready')
    ));
    await expect(page.locator('#start-screen')).toBeVisible();
    await expect(page.locator('#loadErrorScreen')).toBeHidden();
    await expect(page.locator('#loadErrorScreen')).toHaveAttribute('hidden', '');

    await page.locator('#start-btn').click({ force: true });
    await expect(page.locator('#countdown-screen')).toBeVisible();
  });

  test(`${dependency}.js がリトライ含め読めない場合、無言ではなく再読込UIを表示する`, async ({ page }) => {
    await setupPage(page);
    await page.route(`**/hyokkori-hightouch/js/${dependency}.js*`, (route) => route.abort());
    await page.goto('/hyokkori-hightouch/index.html');

    await expect(page.locator('#loadErrorScreen')).toBeVisible();
    await expect(page.locator('#loadErrorScreen button')).toBeVisible();
  });
}

test('game.js が読み込めない場合も、hiddenの盤面だけを残さずかなの再読込UIを表示する', async ({ page }) => {
  test.setTimeout(15_000);
  await setupPage(page);
  await page.route('**/hyokkori-hightouch/js/game.js*', (route) => route.abort());
  await page.goto('/hyokkori-hightouch/index.html');

  const errorScreen = page.locator('#loadErrorScreen');
  await expect(errorScreen).toBeVisible({ timeout: 8_000 });
  await expect(errorScreen).toContainText('よみこみが うまくいかなかったよ');
  await expect(errorScreen.getByRole('button')).toHaveText(/もういちど よみこむ/);
  await expect(errorScreen).toHaveAttribute('role', 'alert');
});
