// guragura-seesaw: ふたご皿 (twin basket) UI が [休眠中 / DORMANT] であることの
// 恒久回帰テスト。
//
// 背景: 2026-07-23 v3 再設計 (人形/大きさ=重さ統一・10ラウンド化) でふたご皿
// メカニクスはどのラウンドからも使わない方針になった (TWIN_ROUND_CONFIG={})。
// js/game.js・js/logic.js・index.html・styles.css の実装コード自体は将来の
// 再導入に備えて削除せず休眠させて残す判断がされているため (各ファイルの
// [休眠中 / DORMANT] コメント参照)、「実装は残っているが実行時には絶対に
// 到達しない」ことをこの e2e で実ブラウザ上で保証する。
//
// 旧 twin-basket-round3.spec.ts (v3以前) はラウンド3(index2)がふたご皿である
// 前提で A/B バスケットへの実配置を検証していたが、v3 では該当ラウンドが
// 単一皿に変わり前提が崩れたため、本ファイルは「ふたご皿UIが一切表示されない
// こと」を検証する内容に全面置き換えた (twin basket 実配置の単体挙動は
// tests/guragura_seesaw_regression.cjs §18/19 が合成 round config で検証済み)。
const { test, expect } = require('@playwright/test');

async function setupPage(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) {}
    try { window.localStorage.setItem('pono_guragura_tut_seen_v1', '1'); } catch (_e) {}
  });
}

test.describe('guragura-seesaw: ふたご皿 (twin basket) UI は全10ラウンドで休眠したまま', () => {
  test('全10ラウンドとも #plank に is-twin-round が付かず、#panRightTwin は非表示で #panRight のみ表示される', async ({ page }) => {
    await setupPage(page);
    await page.goto('/guragura-seesaw/index.html');
    await page.locator('#startBtn').click({ force: true });
    await expect(page.locator('#playScreen')).toBeVisible();

    const roundCount = await page.evaluate(() => window.GuraguraLogic.ROUNDS.length);
    expect(roundCount).toBe(10);

    for (let i = 0; i < roundCount; i++) {
      await page.evaluate((ri) => { window.__guraguraDebugGotoRound(ri); }, i);
      await expect(page.locator('#plank'), `round ${i}: #plank should not carry is-twin-round`).not.toHaveClass(/is-twin-round/);
      await expect(page.locator('#panRightTwin'), `round ${i}: #panRightTwin must stay hidden`).toBeHidden();
      await expect(page.locator('#panRight'), `round ${i}: #panRight (single pan) must stay visible`).toBeVisible();
    }
  });

  test('ドラッグでトレイのアイテムを右皿へ落としても、常に単一皿 (#panRightItems) 経路に入る (どのラウンドも endDragTwin には到達しない)', async ({ page }) => {
    await setupPage(page);
    await page.goto('/guragura-seesaw/index.html');
    await page.locator('#startBtn').click({ force: true });
    await expect(page.locator('#playScreen')).toBeVisible();
    await page.waitForTimeout(200);

    // ラウンド0 (最初のラウンド) で実際にドラッグしても panRightAItems/panRightBItems
    // ではなく panRightItems に入ることを確認する (旧実装ではラウンド3(index2)が
    // ふたご皿だったため、この経路自体が実質新規の回帰対象)。
    const tray = page.locator('#tray .item-box').first();
    const trayBox = await tray.boundingBox();
    const panBox = await page.locator('#panRight').boundingBox();
    expect(trayBox, 'tray item bounding box').toBeTruthy();
    expect(panBox, 'panRight bounding box').toBeTruthy();
    if (!trayBox || !panBox) return;
    await page.mouse.move(trayBox.x + trayBox.width / 2, trayBox.y + trayBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(panBox.x + panBox.width / 2, panBox.y + panBox.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const rightSingleCount = await page.locator('#panRightItems .item-box').count();
    const rightACount = await page.locator('#panRightAItems .item-box').count();
    const rightBCount = await page.locator('#panRightBItems .item-box').count();
    expect(rightSingleCount, 'placed item should land in the single pan').toBeGreaterThan(0);
    expect(rightACount, 'twin basket A must stay empty (dormant)').toBe(0);
    expect(rightBCount, 'twin basket B must stay empty (dormant)').toBe(0);
  });
});
