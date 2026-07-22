// hyokkori-hightouch/: 横画面誤検知 + はじめるボタン無反応バグ (2026-07-22 報告) の恒久回帰テスト。
//
// 背景: 統制環境 (静的サーバ + Playwright、横長viewport 5パターン) では両事象とも
// 再現しなかった (updateLandscapeNotice の判定式に不等号逆転等のバグは無し。
// #start-btn の pointerdown バインドは実タッチで即座に発火する)。それでも実機限定の
// 誤発火経路 (URLバー展開アニメ中の中間 resize、iPad Slide Over/Split View、
// Android WebView の回転タイミング差) を構造的に潰すため、判定ソースを
// screen.orientation 優先 + 300ms 非対称ヒステリシスへ堅牢化した
// (hyokkori-hightouch/js/game.js の updateLandscapeNotice)。本ファイルはその
// 恒久固定版として、代表的な横長ビューポート群で「案内が出ないこと」と
// 「はじめるボタンが機能してカウントダウンへ遷移すること」、および中間リサイズで
// 誤表示しないことを束ねて検証する。guragura-seesaw の同種テスト
// (tests/e2e/hh_manual_check.spec.ts) と同じ検証パターンを踏襲する。
//
// tier ロック回避に window.__APP_BUILD__=1 が必須 (common/tier.js: APP_BUILD=1 の
// 時のみ 'app' tier になる)。hyokkori-hightouch はロック画面自体は持たないが、
// 他 e2e spec とパターンを揃えるため同様に注入しておく。
const { test, expect } = require('@playwright/test');

async function setupPage(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) { /* noop */ }
  });
}

// (pointer: coarse) をタッチ端末相当に固定する。hasTouch:true だけでは実行環境の
// chromium ヘッドレス設定によって matchMedia の判定が揺れることがあるため、
// guragura の screen-transitions.spec.ts / hh_manual_check.spec.ts と同じ方式で
// 明示的にモンキーパッチする。(orientation: ...) は素通しし viewport 追従させる。
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
  { width: 844, height: 390, label: 'iPhone 12-14 横' },
  { width: 896, height: 414, label: 'iPhone 11/XR 横' },
  { width: 1024, height: 600, label: '小型Androidタブレット横' },
  { width: 1180, height: 820, label: 'iPad Air 横' },
  { width: 1024, height: 768, label: 'iPad 旧世代横' },
];

for (const vp of LANDSCAPE_VIEWPORTS) {
  test(`横長 ${vp.width}x${vp.height} (${vp.label}): notice が出ず、start ボタンが機能する`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await setupPage(page);
    await forceCoarsePointer(page);

    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/hyokkori-hightouch/index.html');
    await page.waitForFunction(() => !!window.HyokkoriLogic);

    // ヒステリシス確定時間(300ms)を跨いでも表示されないこと (遅延誤表示の検知)
    await page.waitForTimeout(600);
    await expect(page.locator('#landscape-notice')).toBeHidden();
    await expect(page.locator('#landscape-notice')).toHaveAttribute('aria-hidden', 'true');

    // startPulse アニメーション (scale 1⇄0.96) で Playwright の "element is stable" 判定が
    // 成立しないため、tests/e2e/guragura/screen-transitions.spec.ts と同様に
    // { force: true } で安定性チェックをスキップする。pointerdown バインドなので
    // click() (内部で pointerdown を発火) で確実に発火する。
    await page.locator('#start-btn').click({ force: true });

    await expect(page.locator('#start-screen')).toBeHidden();
    await expect(page.locator('#countdown-screen')).toBeVisible();
    expect(errors).toEqual([]);

    await ctx.close();
  });
}

test('縦長タッチ端末 390x844: notice がヒステリシス確定後に表示される', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);
  await forceCoarsePointer(page);

  await page.goto('/hyokkori-hightouch/index.html');
  await expect(page.locator('#landscape-notice')).toBeVisible(); // auto-retry が 300ms 遅延を吸収
  await expect(page.locator('#landscape-notice')).toHaveAttribute('aria-hidden', 'false');

  await ctx.close();
});

test('一瞬だけ縦判定になる中間リサイズでは notice が表示されない (ヒステリシス検証)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);
  await forceCoarsePointer(page);

  await page.goto('/hyokkori-hightouch/index.html');
  // 実機のURLバー展開アニメ相当: 100ms だけ縦長 → 横長へ復帰
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100); // 確定時間(300ms)未満
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(600);
  await expect(page.locator('#landscape-notice')).toBeHidden();

  await ctx.close();
});

test('マウス環境 (pointer:fine) では縦長でも notice を出さない', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await setupPage(page);
  // forceCoarsePointer は呼ばない = 実行環境の既定 (pointer:fine 相当) のまま検証する

  await page.goto('/hyokkori-hightouch/index.html');
  await page.waitForTimeout(600);
  await expect(page.locator('#landscape-notice')).toBeHidden();

  await ctx.close();
});

test('回転シミュレーション: 縦→横 resize で notice が消える', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);
  await forceCoarsePointer(page);

  await page.goto('/hyokkori-hightouch/index.html');
  await expect(page.locator('#landscape-notice')).toBeVisible();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#landscape-notice')).toBeHidden();

  await ctx.close();
});
