// common/treasure.js: 多重呼び出しキュー (batch:1371) の回帰テスト。
//
// 背景: common/stamp-rally.js の checkSlotReward(total) は、スタンプカードの境界
// (合計スタンプ数が15,30,45...ちょうどの時) に「未取得のスロット報酬」(setTimeout 200ms)
// と「カード完成報酬」(setTimeout 1200ms) の2つの showTreasure() を独立に呼ぶ。
// showTreasure() の _choiceMode/_choices/_onChoose はモジュール単一(シングルトン)状態
// だったため、後発(1200ms後)の呼び出しが先発(200ms後)の宝箱の選択未確定のまま状態を
// 上書きし、先発の onChoose が二度と呼ばれず grantReward が永久にロストする事故が
// 実機検証で確認された (2026-07-19 独立レビュー指摘)。
//
// 修正: showTreasure() を「表示中なら _queue に積み、表示中の宝箱が完全に閉じきる
// (_doClose 完了 = onClose 発火後) まで次の呼び出しを待たせる」方式に変更した。
// このテストは実際の common/treasure.js を実ブラウザ(chromium)にロードし、
// (a) 待ち時間ゼロで2連続 showTreasure() を呼ぶ最悪ケース(タップして選ぶ経路)、
// (b) 1件目をユーザーが一切操作せずオートクローズ(安全策の自動選択)させるケース、
// の両方で、両方の宝箱の onChoose/onClose が過不足なく・正しい順序で
// (先発の onChoose→onClose が完了してから後発の onChoose が始まる) 発火することを検証する。

const { test, expect } = require('@playwright/test');

const FIXTURE_PATH = '/tests/e2e/treasure/queue-fixture.html';

// common/treasure.js の内部定数 AUTO_CLOSE_MS (10000ms) と同期。オートクローズ経路の
// 待機に使う (値を変更する場合はここも合わせて調整すること)。
const AUTO_CLOSE_MS = 10000;

async function waitForOverlayLabel(page, label) {
  await page.waitForFunction(
    (want) => {
      var el = document.getElementById('treasure-label');
      var overlay = document.getElementById('treasure-overlay');
      return !!el && el.textContent === want && overlay && overlay.classList.contains('show');
    },
    label,
    { timeout: 8000 }
  );
}

async function tapToOpen(page) {
  // treasure-container は表示直後 transform:scale(0) から 0.4s かけてバウンドしながら
  // scale(1) になる (requestAnimationFrame で .visible 付与→CSS transition)。この
  // アニメーションが始まる前にクリックすると要素の実質サイズが 0 のままで
  // Playwright が "outside of viewport" として弾くため、.visible 付与を待ってから
  // さらにアニメーションがある程度進む(要素が十分な大きさになる)まで待つ。
  await page.waitForFunction(
    () => {
      var overlay = document.getElementById('treasure-overlay');
      var btn = document.querySelector('.treasure-tap-overlay button');
      if (!overlay || !overlay.classList.contains('visible') || !btn) return false;
      var r = btn.getBoundingClientRect();
      return r.width > 10 && r.height > 10;
    },
    undefined,
    { timeout: 8000 }
  );
  const btn = page.locator('#treasure-container').getByText('タップして あけよう！');
  // ボタンには stampBtnPulse (transform:scale) の無限CSSアニメーションが掛かっており、
  // Playwright の actionability チェック(要素が"安定"するまで待つ)が永遠に満たされない。
  // アニメーションはテスト対象の挙動と無関係なので force click で回避する。
  await btn.click({ force: true });
}

async function waitForChoiceGridShown(page) {
  // 動画パスはこのfixtureでは意図的に404するため、3秒 soft timeout → CSS フォールバック
  // (🎁, 800ms後 _showReward) を必ず通る。マージンを持って待つ。
  // 注意: waitForFunction(fn, options) の2引数呼び出しは options が「arg」として扱われ
  // options 側が未指定(=既定のPWタイムアウト)になってしまうため、必ず arg に undefined
  // を明示してから options を渡す (page.waitForFunction<R>(pageFunction, arg?, options?))。
  await page.waitForFunction(
    () => {
      var grid = document.getElementById('treasure-choice-grid');
      return !!grid && grid.classList.contains('show');
    },
    undefined,
    { timeout: 8000 }
  );
}

async function chooseAndClose(page, choiceIdx) {
  await waitForChoiceGridShown(page);
  await page.locator('.treasure-choice-btn[data-choice-idx="' + choiceIdx + '"]').click();
  // 閉じるボタンが出るまで待ってタップ (選択確定→reveal→msg→closeBtn の演出を経由)
  await page.waitForFunction(
    () => {
      var btn = document.getElementById('treasure-close');
      return !!btn && btn.classList.contains('show');
    },
    undefined,
    { timeout: 8000 }
  );
  await page.locator('#treasure-close').click();
}

test.describe('treasure.js 多重呼び出しキュー', () => {
  test.setTimeout(60_000);

  test('待ち時間ゼロで2連続呼び出しても両方の onChoose/onClose が順序通り確実に発火する', async ({ page }) => {
    await page.goto(FIXTURE_PATH);
    await page.evaluate(() => window.__fireTwo());

    // ── 1件目 (CALL1) ──
    await waitForOverlayLabel(page, 'CALL1');
    await tapToOpen(page);
    await chooseAndClose(page, 0); // A1 を選ぶ

    // 1件目が完全に閉じ切った直後、キューから2件目 (CALL2) が自動的に始まること。
    await waitForOverlayLabel(page, 'CALL2');
    await tapToOpen(page);
    await chooseAndClose(page, 1); // B2 を選ぶ

    // 2件目の close も完了するまで少し待つ (onClose 発火の非同期タイマー分の余裕)
    await page.waitForFunction(
      () => window.__log && window.__log.onClose && window.__log.onClose.length >= 2,
      undefined,
      { timeout: 8000 }
    );

    const log = await page.evaluate(() => window.__log);

    // 両方とも過不足なく (二重付与ゼロ・ロストゼロ) 発火していること
    expect(log.onChoose).toEqual([
      { call: 1, name: 'A1' },
      { call: 2, name: 'B2' },
    ]);
    expect(log.onClose).toEqual([1, 2]);

    // 先発の onChoose→onClose が完了してから後発の onChoose が始まる、という
    // 直列化の順序そのものを検証する (これが今回のバグの核心)。
    expect(log.order).toEqual(['onChoose1', 'onClose1', 'onChoose2', 'onClose2']);
  });

  test('1件目をノータッチでオートクローズさせても、2件目は正しく直列でキュー実行される', async ({ page }) => {
    await page.goto(FIXTURE_PATH);
    await page.evaluate(() => window.__fireTwoNoInteraction());

    await waitForOverlayLabel(page, 'AUTO1');
    // 一切操作しない。common/treasure.js の AUTO_CLOSE_MS 経過で
    // 安全策 (_selectChoice(0, true)) が自動選択→自動closeする。
    await page.waitForFunction(
      () => window.__log && window.__log.onClose && window.__log.onClose.indexOf('auto1') !== -1,
      undefined,
      { timeout: AUTO_CLOSE_MS + 5000 }
    );

    // 2件目が自動的にキューから始まる
    await waitForOverlayLabel(page, 'AUTO2');
    await tapToOpen(page);
    await chooseAndClose(page, 0);

    await page.waitForFunction(
      () => window.__log && window.__log.onClose && window.__log.onClose.indexOf('auto2') !== -1,
      undefined,
      { timeout: 8000 }
    );

    const log = await page.evaluate(() => window.__log);
    expect(log.onChoose).toEqual([
      { call: 'auto1', name: 'AutoA' }, // safety net は choices[0] を自動選択する
      { call: 'auto2', name: 'AutoA2' },
    ]);
    expect(log.onClose).toEqual(['auto1', 'auto2']);
    expect(log.order).toEqual(['onChoose-auto1', 'onClose-auto1', 'onChoose-auto2', 'onClose-auto2']);
  });
});
