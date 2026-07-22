// hyokkori-hightouch/: 向き判定 API (screen.orientation / matchMedia) が例外を
// 投げる環境でも、ゲームが起動して start-btn が機能することを保証する回帰テスト。
//
// 背景: 独立レビューで computeIsPortrait()/updateLandscapeNotice() が
// window.screen.orientation / matchMedia の例外を一切 catch していないことが
// 指摘された。 boot() 冒頭近くで同期的に呼ばれる updateLandscapeNotice() が
// 例外を投げると、boot() 自体は try/catch に包まれていなかったため、
// 例外発生地点より後ろの穴生成・start-btn の click バインドが実行されず
// 「見た目はスタートボタンが動いているのにタップ無反応」という、
// 元のバグより気づきにくい壊れ方をする再現手順が示された
// (`Object.defineProperty(window.screen, 'orientation', { get() { throw ... } })`
// + `window.matchMedia = () => { throw ... }`)。
//
// この修正では (1) computeIsPortrait / isCoarsePointer 個別に try/catch で
// fail-open (= notice を出さない) にし、 (2) boot() 全体も bootInner() を
// try/catch で包む二重防御にした。本ファイルはその両方を固定する。
const { test, expect } = require('@playwright/test');

async function setupPage(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) { /* noop */ }
  });
}

// レビュー指摘の再現コード (screen.orientation の getter と matchMedia を例外送出に
// 差し替える) を踏襲する。 ただし matchMedia は '(pointer: ...)' クエリだけに絞って
// 例外を投げる: '(orientation: ...)' まで無条件に壊すと、common/menu.js
// (window.initMenu 内、start-btn クリック後に呼ばれる) の
// matchMedia('(orientation: portrait)') 呼び出しという、今回のレビュー対象
// (hyokkori-hightouch/js/game.js の computeIsPortrait/updateLandscapeNotice) とは
// 無関係な別ファイル・別バグまで巻き込んでしまい、このテストの狙い (game.js 側の
// fail-open 検証) がぼやける。 screen.orientation の getter 例外だけで
// computeIsPortrait() の orientation 分岐は十分再現できるため、matchMedia 側は
// isCoarsePointer() が使う '(pointer: coarse)' に絞る (この文字列は common/ 配下の
// 他コードでは使われていないことを確認済み)。 hyokkori-hightouch/ 配下の修正スコープに
// 合わせ、対象を絞る。
async function forceOrientationApisToThrow(page) {
  await page.addInitScript(() => {
    try {
      Object.defineProperty(window.screen, 'orientation', {
        configurable: true,
        get() { throw new Error('simulated screen.orientation failure'); },
      });
    } catch (_e) { /* 環境によっては re-define 不可。その場合は matchMedia 側だけで再現 */ }
    const original = window.matchMedia;
    window.matchMedia = (query) => {
      if (query.indexOf('pointer') >= 0) {
        throw new Error('simulated matchMedia failure: ' + query);
      }
      return original(query);
    };
  });
}

test('screen.orientation / matchMedia が例外を投げても start-btn が機能しゲームが起動する (縦長ビューポート)', async ({ browser }) => {
  // 縦長 + タッチ相当にして、旧実装なら updateLandscapeNotice() 経由で
  // computeIsPortrait() が確実に呼ばれる条件を作る。
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);
  await forceOrientationApisToThrow(page);

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  await page.goto('/hyokkori-hightouch/index.html');
  await page.waitForFunction(() => !!window.HyokkoriLogic);

  // fail-open 設計: 判定不能なので notice は出ない (=ゲームをブロックしない) はず。
  await expect(page.locator('#landscape-notice')).toBeHidden();

  // 本体: start-btn が実際にカウントダウンへ遷移させられること (バグの核心)。
  await expect(page.locator('#start-screen')).toBeVisible();
  await page.locator('#start-btn').click({ force: true });
  await expect(page.locator('#start-screen')).toBeHidden();
  await expect(page.locator('#countdown-screen')).toBeVisible();

  // 例外は内部で catch 済みのはずなので、ページ全体を落とす未捕捉エラーは無いこと。
  expect(pageErrors).toEqual([]);

  await ctx.close();
});

test('screen.orientation / matchMedia が例外を投げても start-btn が機能しゲームが起動する (横長ビューポート)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);
  await forceOrientationApisToThrow(page);

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  await page.goto('/hyokkori-hightouch/index.html');
  await page.waitForFunction(() => !!window.HyokkoriLogic);

  await expect(page.locator('#landscape-notice')).toBeHidden();
  await page.locator('#start-btn').click({ force: true });
  await expect(page.locator('#countdown-screen')).toBeVisible();
  expect(pageErrors).toEqual([]);

  await ctx.close();
});
