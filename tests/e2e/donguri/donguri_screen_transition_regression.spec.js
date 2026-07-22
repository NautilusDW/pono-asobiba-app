// donguri-wakekko/: title/board/result 3画面の排他表示 + ボタン遷移の回帰テスト。
//
// 背景: styles.css の .overlay-screen / .board-screen が対象要素へ無条件に
// display:flex を宣言していたため、UA stylesheet の [hidden]{display:none} が
// カスケードで打ち消され、title/board/result の3画面が常時同時描画される事故が
// 発生した (2026-07-22)。JS 側の hidden 属性切り替え自体は正しく動いていたため、
// 属性の有無だけを見る静的テストではこのバグを検出できない。
// toBeVisible()/toBeHidden() は computed style (display:none 等) を見るので、
// 「hidden 属性は付いているが CSS に打ち消されて実際には見えている」という
// このバグを実ブラウザレンダリングで正確に検出できる。
//
// 修正: styles.css に `#app [hidden] { display: none !important; }` を追加して
// author CSS が UA stylesheet に必ず勝つようにした (donguri-wakekko/styles.css)。

const { test, expect } = require('@playwright/test');

// common/tier.js は APP_BUILD=1 (アプリ版ビルド) でないと 'app' tier にならず、
// donguri-wakekko は tier:'app' 専用ゲームのため未設定だと tier ロック画面が
// 表示され続けて board/result 側の検証ができない。bento の e2e テスト群と同じ
// パターンで addInitScript により最初のスクリプト評価前に注入する。
async function setAppBuild(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
  });
}

test('title/board/result の3画面が排他的に表示され、ボタンで正しく遷移する', async ({ page }) => {
  await setAppBuild(page);
  await page.goto('/donguri-wakekko/index.html');

  // 初期状態: はじめる だけが見え、board/result は不可視 (バグ再発検知の核心)
  await expect(page.locator('#startBtn')).toBeVisible();
  await expect(page.locator('#board')).toBeHidden();
  await expect(page.locator('#resultScreen')).toBeHidden();

  await page.locator('#startBtn').click();
  await expect(page.locator('#titleScreen')).toBeHidden(); // display:none を実レンダリングで検証
  await expect(page.locator('#board')).toBeVisible();
  await expect(page.locator('#resultScreen')).toBeHidden();

  // マッチ完走はタイマー依存 (HINT 2.5s + REVEAL 0.9s + JUDGE 1.2s ×3〜4R) で長いので、
  // 結果画面の表示経路は showRematchUI 相当の状態を直接作って検証する。
  await page.evaluate(() => { document.getElementById('resultScreen').hidden = false; });
  await expect(page.locator('#rematchBtn')).toBeVisible();
  await expect(page.locator('#startBtn')).toBeHidden(); // title が result と同時に見えないこと
  await expect(page.locator('#board')).toBeVisible(); // result は board の上に半透明オーバーレイされる (仕様通り)

  // もういっかい → startMatch() が走り board へ戻る
  await page.locator('#rematchBtn').click();
  await expect(page.locator('#resultScreen')).toBeHidden();
  await expect(page.locator('#board')).toBeVisible();
});

test('横画面 (16:9) 化: landscape-notice がポートレート/ランドスケープで正しく出し分けられる', async ({ page }) => {
  await setAppBuild(page);
  // タッチデバイス相当のコンテキストで検証 (updateLandscapeNotice は pointer:coarse を要求する)。
  await page.addInitScript(() => {
    // matchMedia('(pointer: coarse)') をタッチ相当に固定する。
    const original = window.matchMedia;
    window.matchMedia = (query) => {
      if (query.indexOf('pointer: coarse') >= 0) {
        return { matches: true, media: query, addListener() {}, removeListener() {} };
      }
      return original(query);
    };
  });

  // portrait (縦長): 通知が表示され、#app が inert 化される
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/donguri-wakekko/index.html');
  await expect(page.locator('#landscape-notice')).toBeVisible();
  await expect(page.locator('#app')).toHaveAttribute('inert', '');

  // landscape (横長): 通知が消え、#app の inert が外れる
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(150); // resize ハンドラの反映待ち
  await expect(page.locator('#landscape-notice')).toBeHidden();
  await expect(page.locator('#app')).not.toHaveAttribute('inert', '');
});
