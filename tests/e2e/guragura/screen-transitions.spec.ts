// guragura-seesaw/: title/play/result 3画面の排他表示 + ボタン遷移の回帰テスト。
//
// 背景: tests/e2e/donguri/donguri_screen_transition_regression.spec.js が実証した通り、
// 「CSS の無条件 display 宣言が .show トグルを打ち消して複数画面が同時描画される」
// バグ class は、hidden 属性やクラス文字列を見るだけの静的/DOM-mock テストでは
// 検出できない。toBeVisible()/toBeHidden() は実ブラウザの computed style
// (display:none 等) を見るため、この class のバグを正確に検出できる。
// (guragura-seesaw では showScreen() が .show クラスのみで画面を切り替え、
// hidden 属性は使わない設計 — tests/guragura_seesaw_regression.cjs §10 参照。
// 本ファイルはその設計を実ブラウザレンダリングで裏付ける e2e カウンターパート)

const { test, expect } = require('@playwright/test');

// common/tier.js は APP_BUILD=1 でないと 'app' tier にならず、guragura-seesaw は
// tier:'app' 専用ゲームのため未設定だと tier ロック画面が表示され続けて
// play/result 側の検証ができない。donguri/bento の e2e テストと同じパターンで
// addInitScript により最初のスクリプト評価前に注入する。
// 併せて common/debug-mode.js の isAllowed() (localhost + sessionStorage フラグ)
// を満たしておき、window.__guraguraDebugFinish() デバッグフックを有効化する。
async function setupPage(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try {
      window.sessionStorage.setItem('pono_debug_mode_session', '1');
    } catch (_e) { /* noop */ }
  });
}

test('title/play/result の3画面が排他的に表示され、ボタンで正しく遷移する', async ({ page }) => {
  await setupPage(page);
  await page.goto('/guragura-seesaw/index.html');

  // 初期状態: タイトルだけが見え、play/result は不可視 (バグ再発検知の核心)
  await expect(page.locator('#titleScreen')).toBeVisible();
  await expect(page.locator('#startBtn')).toBeVisible();
  await expect(page.locator('#playScreen')).toBeHidden();
  await expect(page.locator('#resultScreen')).toBeHidden();

  // #startBtn には常時 startPulse アニメーション (scale 1↔0.96) が付いており
  // Playwright の "element is stable" 判定 (連続2フレームで矩形が変化しない) が
  // 通常の .click() だと永久に成立しないため { force: true } で安定性チェックを
  // スキップする。ハンドラは pointerdown で登録されているため click() で発火する。
  await page.locator('#startBtn').click({ force: true });
  await expect(page.locator('#titleScreen')).toBeHidden(); // display:none を実レンダリングで検証
  await expect(page.locator('#playScreen')).toBeVisible();
  await expect(page.locator('#resultScreen')).toBeHidden();

  // ラウンド完走はドラッグ操作依存で長いので、window.__guraguraDebugFinish() で
  // 最終ラウンド達成状態まで一気に進めて結果画面の表示経路を検証する。
  // finishGame() は window.showTreasure がある場合そちらの宝箱演出を先に挟む
  // (自動クローズ 10s) ため、この e2e では showScreen('resultScreen') の
  // 排他表示そのものを検証したいので showTreasure を無効化して即座に
  // showResultUI() の else 経路 (common/treasure.js 未搭載時と同じ経路) を通す。
  await page.evaluate(() => {
    window.showTreasure = null;
    if (typeof window.__guraguraDebugFinish === 'function') {
      window.__guraguraDebugFinish();
    }
  });
  await expect(page.locator('#resultScreen')).toBeVisible();
  await expect(page.locator('#retryBtn')).toBeVisible();
  await expect(page.locator('#titleScreen')).toBeHidden();
  await expect(page.locator('#playScreen')).toBeHidden(); // result が play と同時に見えないこと

  // もういちど → startGame() が走り playScreen へ戻る
  await page.locator('#retryBtn').click();
  await expect(page.locator('#resultScreen')).toBeHidden();
  await expect(page.locator('#playScreen')).toBeVisible();
});

test('横画面 (16:9) 化: landscape-notice がポートレート/ランドスケープで正しく出し分けられる', async ({ page }) => {
  await setupPage(page);
  // タッチデバイス相当のコンテキストで検証 (updateLandscapeNotice は pointer:coarse を要求する)。
  await page.addInitScript(() => {
    const original = window.matchMedia;
    window.matchMedia = (query) => {
      if (query.indexOf('pointer: coarse') >= 0) {
        return { matches: true, media: query, addListener() {}, removeListener() {} };
      }
      return original(query);
    };
  });

  // portrait (縦長): 通知が表示される
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/guragura-seesaw/index.html');
  await expect(page.locator('#landscape-notice')).toBeVisible();

  // landscape (横長): 通知が消える
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(150); // resize ハンドラの反映待ち
  await expect(page.locator('#landscape-notice')).toBeHidden();
});
