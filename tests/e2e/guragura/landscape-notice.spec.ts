// guragura-seesaw/: 横画面誤検知 + スタートボタン無反応バグ (2026-07-22 報告) の
// 恒久回帰テスト。
//
// 背景: 調査の結果、HEAD (165fe7d7d/4c382f172 以降) では両事象とも再現しない
// ことを確認済み (js/game.js:90-104 の updateLandscapeNotice / js/game.js:602-611
// の boot フォールバック)。既存 screen-transitions.spec.ts にも landscape-notice の
// 出し分けテストが1本あるが、複数の実機相当ビューポート横断・スタートボタンの
// 実際の遷移確認・回転シミュレーションまでは網羅していない。本ファイルはその
// 恒久固定版として、代表的な横長ビューポート群で「案内が出ないこと」と
// 「はじめるボタンが機能すること」を束ねて検証する。
//
// tier ロック回避に window.__APP_BUILD__=1 が必須 (common/tier.js: APP_BUILD=1 の
// 時のみ 'app' tier になり guragura-seesaw のロック画面が出ない。他の e2e spec と同じ
// パターン)。
const { test, expect } = require('@playwright/test');

async function setupPage(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) { /* noop */ }
    // 初回自動チュートリアルが #startBtn タップ後の画面遷移確認を妨げないよう既読化。
    // チュートリアル自体の検証は layout-containment.spec.ts が担当する。
    try { window.localStorage.setItem('pono_guragura_tut_seen_v1', '1'); } catch (_e) { /* noop */ }
  });
}

// (pointer: coarse) をタッチ端末相当に固定する。hasTouch:true だけでは実行環境の
// chromium ヘッドレス設定によって matchMedia の判定が揺れることがあるため、
// screen-transitions.spec.ts と同じ方式で明示的にモンキーパッチする。
async function forceCoarsePointer(page) {
  await page.addInitScript(() => {
    const original = window.matchMedia;
    window.matchMedia = (query) => {
      if (query.indexOf('pointer: coarse') >= 0) {
        return { matches: true, media: query, addListener() {}, removeListener() {} };
      }
      return original(query);
    };
  });
}

const LANDSCAPE_VIEWPORTS = [
  { width: 844, height: 390, label: 'iPhone 14 横' },
  { width: 896, height: 414, label: 'iPhone 11 横' },
  { width: 1024, height: 600, label: '小型Androidタブレット横' },
  { width: 1180, height: 820, label: 'iPad Air 横' },
];

for (const vp of LANDSCAPE_VIEWPORTS) {
  test(`横長 ${vp.width}x${vp.height} (${vp.label}): 案内非表示 + スタート機能`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await setupPage(page);
    await forceCoarsePointer(page);

    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/guragura-seesaw/index.html');

    // (a) 横画面誤検知がないこと
    await expect(page.locator('#landscape-notice')).toBeHidden();
    await expect(page.locator('#landscape-notice')).toHaveAttribute('aria-hidden', 'true');

    // (b) スタートボタンが機能すること (startPulse アニメーション対策で force:true)
    await page.locator('#startBtn').click({ force: true });
    await expect(page.locator('#playScreen')).toBeVisible();
    await expect(page.locator('#titleScreen')).toBeHidden();

    // (c) JS エラーなし
    expect(errors).toEqual([]);

    await ctx.close();
  });
}

test('縦長タッチ端末 390x844 では案内が表示される (判定の反対側)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);
  await forceCoarsePointer(page);

  await page.goto('/guragura-seesaw/index.html');
  await expect(page.locator('#landscape-notice')).toBeVisible();
  await expect(page.locator('#landscape-notice')).toHaveAttribute('aria-hidden', 'false');

  await ctx.close();
});

test('回転シミュレーション: 縦→横 resize で案内が消える', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);
  await forceCoarsePointer(page);

  await page.goto('/guragura-seesaw/index.html');
  await expect(page.locator('#landscape-notice')).toBeVisible();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#landscape-notice')).toBeHidden();

  await ctx.close();
});
