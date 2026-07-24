// machigai/: machigai-sagashi からの新規移植ゲーム。既存の新ゲーム追加時の慣習
// (専用e2e spec追加) に沿った基本スモークテスト。
//
// 確認範囲:
// 1. タイトル画面が起動しロゴが表示される
// 2. タイトル画面の 🏠 (title-home) がハブ (../play.html) へ遷移する
// 3. あそぶ→ステージ選択→ゲーム→⌂ でのシーン遷移一式が動作する
//    (select 画面の ⌂ は仕様どおり title へ、game 画面の ⌂ は select へ戻る。
//     この既存挙動は今回の移植で変更していない)
//
// tier ロック回避に window.__APP_BUILD__=1 を注入する (common/tier.js: APP_BUILD=1
// の時のみ 'app' tier)。他の e2e spec と同じパターンを踏襲する。
const { test, expect } = require('@playwright/test');

async function setupPage(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) { /* noop */ }
  });
}

test('タイトル画面が起動し、ロゴが表示される', async ({ page }) => {
  await setupPage(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/machigai/index.html');
  await expect(page.locator('.title-logo')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.title-logo')).toHaveText('まちがいさがしランド');

  expect(errors).toEqual([]);
});

test('タイトル画面の 🏠 ボタンでハブ (play.html) へ遷移する', async ({ page }) => {
  await setupPage(page);
  await page.goto('/machigai/index.html');
  await expect(page.locator('.title-home')).toBeVisible({ timeout: 10000 });

  await page.locator('.title-home').click();
  await page.waitForURL(/\/play\.html$/, { timeout: 10000 });
  expect(page.url()).toMatch(/\/play\.html$/);
});

test('あそぶ→ステージ選択→ゲーム開始→⌂ で select へ戻る一連のシーン遷移', async ({ page }) => {
  await setupPage(page);
  await page.goto('/machigai/index.html');

  await page.locator('.title-play-btn').click();
  await expect(page.locator('.select-title')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.select-title')).toHaveText('ステージを えらんでね');

  const firstCard = page.locator('.stage-card:not(.disabled)').first();
  await expect(firstCard).toBeVisible({ timeout: 10000 });
  await firstCard.click();

  await expect(page.locator('.game-panels')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.game-topbar .home')).toBeVisible();

  await page.locator('.game-topbar .home').click();
  await expect(page.locator('.select-title')).toBeVisible({ timeout: 10000 });

  // select 画面の ⌂ は title へ戻る（既存仕様、今回変更なし）
  await page.locator('.select-topbar .home').click();
  await expect(page.locator('.title-logo')).toBeVisible({ timeout: 10000 });
});
