// hyokkori-hightouch/: js/logic.js 読み込み失敗時の耐性テスト。
// 背景: guragura-seesaw で発見された「logic.js ロード失敗時に game.js 冒頭ガードが
// 無言 return し、見た目正常なタイトル画面がタップ無反応になる」事故 (2026-07-22 報告)
// と同型の脆弱パターンが hyokkori-hightouch/js/game.js にも存在していたため、
// 同じ自動リトライ + エラーUI修正を移植した際の回帰防止テスト。
// 既存の e2e (存在すれば) はリソース正常配信のハッピーパスのみで、この障害モードを検出できない。
const { test, expect } = require('@playwright/test');

async function setupPage(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) {}
  });
}

test('logic.js の初回読み込みが失敗しても自動リトライで復帰し、はじめるボタンでカウントダウンに進む', async ({ page }) => {
  await setupPage(page);
  let aborted = false;
  await page.route('**/hyokkori-hightouch/js/logic.js*', (route) => {
    if (!aborted) { aborted = true; return route.abort(); } // 初回だけ失敗させる
    return route.continue(); // ?retry= 付きの再試行は成功させる
  });
  await page.goto('/hyokkori-hightouch/index.html');

  // リトライ完了 (= boot() 実行済み) を待ってからタップする
  await page.waitForFunction(() => !!window.HyokkoriLogic);
  await expect(page.locator('#start-screen')).toBeVisible();
  await expect(page.locator('#loadErrorScreen')).toHaveCount(0); // 復帰できたのでエラーUIは出ない

  // 実際にボタンをタップしてカウントダウン画面へ遷移することまで検証する (バグの核心)。
  await page.locator('#start-btn').click({ force: true });
  await expect(page.locator('#countdown-screen')).toBeVisible();
});

test('logic.js がリトライ含め完全に読み込めない場合、無言ではなく再読込UIを表示する', async ({ page }) => {
  await setupPage(page);
  await page.route('**/hyokkori-hightouch/js/logic.js*', (route) => route.abort()); // 全試行を失敗させる
  await page.goto('/hyokkori-hightouch/index.html');

  // 旧実装なら何も起きず「見た目正常・タップ無反応」だった。
  // 新実装ではユーザーに見えるエラーオーバーレイ + 再読込ボタンが出ること。
  await expect(page.locator('#loadErrorScreen')).toBeVisible();
  await expect(page.locator('#loadErrorScreen button')).toBeVisible();
});
