// guragura-seesaw/: 向き判定 API (screen.orientation / matchMedia) が例外を
// 投げる環境でも、ゲームが起動して「タップで はじめる」ボタンが機能することを
// 保証する回帰テスト。
//
// 背景: 「またタップで始められない」という再発報告 (2026-07-23) の調査で、
// updateLandscapeNotice() が旧来の window.innerHeight >= window.innerWidth という
// viewport 実寸のみの素朴比較を使っていたことが判明した (姉妹ゲーム
// hyokkori-hightouch/donguri-wakekko/hatake-nikki には screen.orientation 優先 +
// fail-open + try/catch のパターンが既に移植済みだったが、guragura-seesaw だけ
// 未移植のまま取り残されていた)。この修正で computeIsPortrait()/isCoarsePointer()
// を個別に try/catch で fail-open にし、boot() 全体も bootInner() を try/catch で
// 包む二重防御にした (hyokkori-hightouch と同型)。本ファイルはその両方を固定する。
const { test, expect } = require('@playwright/test');

async function setupPage(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) { /* noop */ }
    try { window.localStorage.setItem('pono_guragura_tut_seen_v1', '1'); } catch (_e) { /* noop */ }
  });
}

// レビュー指摘の再現コード (screen.orientation の getter と matchMedia を例外送出に
// 差し替える) を hyokkori-hightouch/tests/e2e/hyokkori/orientation-api-exception.spec.ts
// から踏襲する。matchMedia は '(pointer: ...)' クエリだけに絞って例外を投げる
// (無条件に壊すと common/menu.js 等の無関係な matchMedia 呼び出しまで巻き込み、
// このテストの狙い=game.js 側の fail-open 検証がぼやけるため)。
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

test('screen.orientation / matchMedia が例外を投げても はじめるボタンが機能しプレイ画面へ遷移する (縦長ビューポート)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);
  await forceOrientationApisToThrow(page);

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  await page.goto('/guragura-seesaw/index.html');
  await page.waitForFunction(() => !!window.GuraguraLogic);

  // fail-open 設計: 判定不能なので notice は出ない (=ゲームをブロックしない) はず。
  await expect(page.locator('#landscape-notice')).toBeHidden();

  // 本体: はじめるボタンが実際にプレイ画面へ遷移させられること (バグの核心)。
  await expect(page.locator('#titleScreen')).toBeVisible();
  await page.locator('#startBtn').click({ force: true });
  await expect(page.locator('#titleScreen')).toBeHidden();
  await expect(page.locator('#playScreen')).toBeVisible();

  // 例外は内部で catch 済みのはずなので、ページ全体を落とす未捕捉エラーは無いこと。
  expect(pageErrors).toEqual([]);

  await ctx.close();
});

test('screen.orientation / matchMedia が例外を投げても はじめるボタンが機能しプレイ画面へ遷移する (横長ビューポート)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);
  await forceOrientationApisToThrow(page);

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  await page.goto('/guragura-seesaw/index.html');
  await page.waitForFunction(() => !!window.GuraguraLogic);

  await expect(page.locator('#landscape-notice')).toBeHidden();
  await page.locator('#startBtn').click({ force: true });
  await expect(page.locator('#playScreen')).toBeVisible();
  expect(pageErrors).toEqual([]);

  await ctx.close();
});

// クロスレビュー指摘 (2026-07-23): window.visualViewport への addEventListener 登録だけ
// try/catch で保護されておらず、その呼び出しが例外を投げる環境では bootInner() 全体が
// 例外で止まり、boot() 外側の catch が「よみこみが うまくいかなかったよ」の完全な
// エラー画面にフォールバックしてしまっていた (screen.orientation と同じ理由で
// try/catch すべき、という既存の設計方針との一貫性が崩れていた箇所)。
//
// 注意: window.visualViewport の getter 自体をページ全体で例外送出に差し替えると、
// common/menu.js の fitVisibleViewport() (これも window.visualViewport を未保護で
// 参照している、本タスクのスコープ外の別ファイル) まで巻き込んで壊れ、そちらの
// 未捕捉例外でテストが不安定になる (実際に検証済み)。 そのため呼び出し対象の
// listener 関数名 ('updateLandscapeNotice') で絞り込み、game.js 側の該当呼び出し
// だけを例外送出に差し替える。 menu.js 側の updateVH 登録は正常に通る。
async function forceVisualViewportAddEventListenerToThrowForGameJs(page) {
  await page.addInitScript(() => {
    try {
      if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
        var original = window.visualViewport.addEventListener.bind(window.visualViewport);
        window.visualViewport.addEventListener = function (type, listener, opts) {
          if (listener && listener.name === 'updateLandscapeNotice') {
            throw new Error('simulated visualViewport.addEventListener failure for updateLandscapeNotice');
          }
          return original(type, listener, opts);
        };
      }
    } catch (_e) { /* 環境によっては上書き不可。その場合はこのテストの意味が薄れるが致命ではない */ }
  });
}

test('window.visualViewport.addEventListener が例外を投げても bootInner() が落ちずプレイ画面へ遷移する', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setupPage(page);
  await forceVisualViewportAddEventListenerToThrowForGameJs(page);

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  await page.goto('/guragura-seesaw/index.html');
  await page.waitForFunction(() => !!window.GuraguraLogic);

  // boot() 外側の catch にフォールバックしていないこと (= 完全なエラー画面になっていない)。
  await expect(page.locator('#titleScreen')).toBeVisible();
  await page.locator('#startBtn').click({ force: true });
  await expect(page.locator('#titleScreen')).toBeHidden();
  await expect(page.locator('#playScreen')).toBeVisible();

  // visualViewport の例外は内部で catch 済みのはずなので、未捕捉エラーは無いこと。
  expect(pageErrors).toEqual([]);

  await ctx.close();
});
