// hatake-nikki/: 横画面誤検知 + はじめるボタン無反応バグ (2026-07-22 報告) の恒久回帰テスト。
//
// 背景: 統制環境 (静的サーバ + Playwright、横長viewport複数パターン、タッチ強制、app tier
// 固定) では両事象とも再現しなかった。それでも実機限定の誤発火経路 (WebView 起動直後/
// bfcache 復帰直後の 0x0/未確定 viewport、回転アニメ中の中間 resize) を構造的に塞ぐため、
// hatake-nikki/js/game.js の updateLandscapeNotice を screen.orientation 優先の
// isPortraitNow() へ堅牢化した (2026-07-23)。本ファイルはその恒久固定版として、代表的な
// 横長 viewport 群で「案内が出ないこと」と「はじめるボタンが機能して #field-screen へ
// 遷移すること」、縦長では案内が出ること、劣化 API 環境でもフォールバックが機能することを
// 束ねて検証する。hyokkori-hightouch/tests/e2e/hyokkori/landscape-and-start.spec.ts と
// 同種の検証パターンを踏襲する。
//
// tier ロック回避に window.__APP_BUILD__=1 が必須 (common/tier.js: APP_BUILD=1 の
// 時のみ 'app' tier になり、hatake-nikki の tier ロック画面を回避できる)。

const { test, expect } = require('@playwright/test');

async function setupPage(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
  });
}

// (pointer: coarse) をタッチ端末相当に固定する。hasTouch:true だけでは実行環境の
// chromium ヘッドレス設定によって matchMedia の判定が揺れることがあるため、
// hyokkori-hightouch の landscape-and-start.spec.ts と同じ方式で明示的にモンキーパッチする。
// (orientation: portrait) クエリは素通しして isPortraitNow() のフォールバック経路を
// 生きたまま検証できるようにする。
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

// index.html の FOUC guard は DOMContentLoaded 後に2連続 rAF を経てから
// body.pono-game-ready を付与する (tests/e2e/hatake/hatake_layout_and_water_ux.spec.js と同型)。
async function waitForGameReady(page) {
  await page.waitForFunction(() => document.body.classList.contains('pono-game-ready'), null, { timeout: 10000 });
}

const LANDSCAPE_VIEWPORTS = [
  { width: 844, height: 390, label: 'iPhone 12-14 横' },
  { width: 896, height: 414, label: 'iPhone 11/XR 横' },
  { width: 1024, height: 600, label: '小型Androidタブレット横' },
  { width: 1180, height: 820, label: 'iPad Air 横' },
];

for (const vp of LANDSCAPE_VIEWPORTS) {
  test(`横長 ${vp.width}x${vp.height} (${vp.label}): notice が出ず、はじめるボタンが機能する`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await setupPage(page);
    await forceCoarsePointer(page);

    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/hatake-nikki/index.html');
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await page.reload();
    await waitForGameReady(page);

    // 起動直後の即時 assert
    await expect(page.locator('#landscape-notice')).toBeHidden();
    await expect(page.locator('#landscape-notice')).toHaveAttribute('aria-hidden', 'true');
    // 1秒後の遅延誤表示も検知する (仕様書 §3.2-1 の2段階assert)
    await page.waitForTimeout(1000);
    await expect(page.locator('#landscape-notice')).toBeHidden();
    await expect(page.locator('#landscape-notice')).toHaveAttribute('aria-hidden', 'true');

    // はじめるボタン: touchscreen.tap で実タッチ相当の座標タップ
    const box = await page.locator('#start-btn').boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

    await expect(page.locator('#field-screen')).toHaveClass(/show/);
    expect(errors).toEqual([]);

    await ctx.close();
  });
}

test('縦長タッチ端末 390x844: notice が表示される (逆方向退行防止)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);
  await forceCoarsePointer(page);

  await page.goto('/hatake-nikki/index.html');
  await waitForGameReady(page);

  await expect(page.locator('#landscape-notice')).toBeVisible();
  await expect(page.locator('#landscape-notice')).toHaveAttribute('aria-hidden', 'false');

  await ctx.close();
});

test('劣化API環境: screen.orientation 不在でも matchMedia フォールバックで横長は非表示', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);
  await forceCoarsePointer(page);
  await page.addInitScript(() => {
    try {
      Object.defineProperty(window.screen, 'orientation', { get: () => undefined, configurable: true });
    } catch (e) { /* noop: 定義不可環境ではテスト対象外経路 */ }
  });

  await page.goto('/hatake-nikki/index.html');
  await waitForGameReady(page);

  await expect(page.locator('#landscape-notice')).toBeHidden();
  await expect(page.locator('#landscape-notice')).toHaveAttribute('aria-hidden', 'true');

  await ctx.close();
});

test('起動直後 viewport 未確定 (0x0) シミュレーション: fail-open で非表示のまま、load 再評価後も非表示', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);
  await forceCoarsePointer(page);
  // screen.orientation / matchMedia(orientation) 双方を無効化し、innerWidth/innerHeight の
  // 数値フォールバック分岐だけを強制的に通す。0x0 (未確定) を模擬して fail-open を検証する。
  await page.addInitScript(() => {
    try {
      Object.defineProperty(window.screen, 'orientation', { get: () => undefined, configurable: true });
    } catch (e) {}
    const originalMM = window.matchMedia;
    window.matchMedia = (query) => {
      if (query.indexOf('orientation:') >= 0) {
        // matches を boolean でなく undefined 相当にして isPortraitNow() のMQ分岐を無効化する
        return { matches: undefined, media: query, addListener() {}, removeListener() {} };
      }
      return originalMM(query);
    };
    try {
      Object.defineProperty(window, 'innerWidth', { get: () => 0, configurable: true });
      Object.defineProperty(window, 'innerHeight', { get: () => 0, configurable: true });
    } catch (e) {}
  });

  await page.goto('/hatake-nikki/index.html');
  await waitForGameReady(page);

  // fail-open: 0x0 未確定でも landscape (非表示) 扱い
  await expect(page.locator('#landscape-notice')).toBeHidden();

  // load 再評価後も (window.innerWidth/Height を getter で 0 固定しているため) 非表示のまま
  await page.waitForTimeout(300);
  await expect(page.locator('#landscape-notice')).toBeHidden();

  await ctx.close();
});

test('クリック系フォールバック: page.click(#start-btn) (マウスイベント経路) でも遷移する', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);
  await forceCoarsePointer(page);

  await page.goto('/hatake-nikki/index.html');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload();
  await waitForGameReady(page);

  await page.locator('#start-btn').click({ force: true });
  await expect(page.locator('#field-screen')).toHaveClass(/show/);

  await ctx.close();
});
