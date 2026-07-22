// donguri-wakekko/: 横画面誤検知 + スタートボタン無反応 (2026-07-22 報告) の恒久回帰テスト。
//
// 根本原因: 旧実装は `window.innerHeight >= window.innerWidth` で向きを推定していた。
// 実機 WebView 起動直後/bfcache 復帰直後は innerWidth/innerHeight が 0 や古い値になる
// ことがあり、「0>=0 → portrait」と誤検知して #landscape-notice を表示し、同時に
// #app に inert を付与して #startBtn を完全無反応にする事故が起きうる。再評価トリガも
// orientationchange/resize のみで pageshow/load 等を購読していなかったため、一度誤判定
// すると固着したまま復帰しない。
//
// 修正 (donguri-wakekko/js/game.js): screen.orientation.type を最優先で使い、判定不能
// (viewport 未確定含む) な場合は fail-open (通知を出さない) にした。加えて
// pageshow/load/screen.orientation change/matchMedia(orientation) change/
// visualViewport resize を再評価トリガに追加し、初回誤判定があっても自己修復させる。
// hatake-nikki/js/game.js:58-107 の実績実装と同型。
//
// 既存 tests/e2e/donguri/donguri_screen_transition_regression.spec.js にも
// landscape-notice の出し分けテストが1本あるが、複数の実機相当ビューポート横断・
// スタートボタンの実際の遷移確認・viewport 未確定時の fail-open 確認までは
// 網羅していない。本ファイルはその恒久固定版。
const { test, expect } = require('@playwright/test');

// tier ロック回避 (common/tier.js: APP_BUILD=1 の時のみ 'app' tier)。他の e2e spec と同じパターン。
async function setupPage(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) { /* noop */ }
  });
}

// (pointer: coarse) をタッチ端末相当に固定する。hasTouch:true だけでは実行環境の
// chromium ヘッドレス設定によって matchMedia の判定が揺れることがあるため、
// guragura-seesaw/landscape-notice.spec.ts と同じ方式で明示的にモンキーパッチする。
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
  { width: 660, height: 393, label: 'iPhone 14 Pro 横' },
  { width: 1024, height: 600, label: '小型Androidタブレット横' },
  { width: 1180, height: 820, label: 'iPad Air 横' },
  { width: 1194, height: 834, label: 'iPad Pro 11 横' },
];

for (const vp of LANDSCAPE_VIEWPORTS) {
  test(`横長 ${vp.width}x${vp.height} (${vp.label}): 案内非表示 + スタートボタン機能`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await setupPage(page);
    await forceCoarsePointer(page);

    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/donguri-wakekko/index.html');

    await expect(page.locator('#landscape-notice')).toBeHidden();
    await expect(page.locator('#landscape-notice')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#app')).not.toHaveAttribute('inert', '');

    await page.locator('#startBtn').click();
    await expect(page.locator('#board')).toBeVisible();
    await expect(page.locator('#titleScreen')).toBeHidden();

    expect(errors).toEqual([]);

    await context.close();
  });
}

test('縦長 390x844 (coarse): 案内は正しく表示される (出し分けの生存確認)', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await setupPage(page);
  await forceCoarsePointer(page);
  await page.goto('/donguri-wakekko/index.html');
  await expect(page.locator('#landscape-notice')).toBeVisible();
  await expect(page.locator('#app')).toHaveAttribute('inert', '');
  await context.close();
});

test('viewport 未確定 (innerWidth/innerHeight=0) でも横画面案内を誤表示しない (fail-open)', async ({ browser }) => {
  // 実機 WebView 起動直後の「0>=0 → portrait 誤検知」機序の直接再現。旧実装ならこのテストが落ちる。
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await setupPage(page);
  await forceCoarsePointer(page);
  await page.addInitScript(() => {
    // 物理向きは landscape のまま、レイアウト viewport だけ未確定 (0) を偽装する
    Object.defineProperty(window, 'innerWidth', { get: () => 0, configurable: true });
    Object.defineProperty(window, 'innerHeight', { get: () => 0, configurable: true });
    try {
      Object.defineProperty(window.screen, 'orientation', {
        configurable: true,
        value: { type: 'landscape-primary', addEventListener() {} },
      });
    } catch (_e) { /* noop */ }
  });
  await page.goto('/donguri-wakekko/index.html');
  await expect(page.locator('#landscape-notice')).toBeHidden();
  await expect(page.locator('#app')).not.toHaveAttribute('inert', '');
  await context.close();
});

test('回転シミュレーション: 縦→横 resize で案内が消え、はじめるが機能する', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await setupPage(page);
  await forceCoarsePointer(page);

  await page.goto('/donguri-wakekko/index.html');
  await expect(page.locator('#landscape-notice')).toBeVisible();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#landscape-notice')).toBeHidden();
  await expect(page.locator('#app')).not.toHaveAttribute('inert', '');

  await page.locator('#startBtn').click();
  await expect(page.locator('#board')).toBeVisible();

  await context.close();
});
