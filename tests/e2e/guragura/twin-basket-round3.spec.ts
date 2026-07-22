// guragura-seesaw/: ふたご皿 (twin basket) メカニクス e2e スモークテスト。
//
// ラウンド3 (index2, おだい=elephant単体, "普通"ティア: 1皿最大3個/局所重さ上限5) を
// 対象に、実際のドラッグ操作 (page.mouse: このゲームは HTML5 dragTo ではなく
// pointerdown/pointermove/pointerup の自前実装なので dragTo() は使えない) で
// A/B バスケットへ配置 → 釣り合い成立 → 次ラウンドへ自動進行することを検証する。
// 加えて局所超過 (「こっちのおさらだけ、おもすぎたみたい！」) の拒否・メッセージ表示も
// 検証する。 §3-24 (game.js/styles.css 実装) の実地確認。

const { test, expect } = require('@playwright/test');

async function setupPage(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) {}
    // 初回自動チュートリアルがドラッグ操作の邪魔をしないよう既読フラグを事前セット
    // (このテストの主眼はふたご皿UIであり、チュートリアル自体は他specでカバー済み)。
    try { window.localStorage.setItem('pono_guragura_tut_seen_v1', '1'); } catch (_e) {}
  });
}

// ラウンド3 (index2) まで __guraguraDebugGotoRound() で一気に進める。
// (debug-mode.js 経由でのみ公開される test 専用API。 ラウンド1・2 の単一皿操作を
// 毎回解く必要をなくし、ふたご皿UI自体の検証に集中する)
async function gotoTwinRound3(page) {
  await setupPage(page);
  await page.goto('/guragura-seesaw/index.html');
  await page.locator('#startBtn').click({ force: true });
  await expect(page.locator('#playScreen')).toBeVisible();

  await page.evaluate(() => {
    // @ts-ignore debug-only global, guragura-seesaw/js/game.js 参照
    window.__guraguraDebugGotoRound(2);
  });

  await expect(page.locator('#plank')).toHaveClass(/is-twin-round/);
  await expect(page.locator('#panRightTwin')).toBeVisible();
  await expect(page.locator('#panRight')).toBeHidden();
}

async function dragTrayItemTo(page, itemId, targetLocator) {
  const item = page.locator(`#tray .item-box[data-item-id="${itemId}"]`);
  const itemBox = await item.boundingBox();
  const targetBox = await targetLocator.boundingBox();
  expect(itemBox, `#tray のアイテム(${itemId}) の bounding box が取得できる`).toBeTruthy();
  expect(targetBox, 'ドロップ先の bounding box が取得できる').toBeTruthy();
  if (!itemBox || !targetBox) return;
  await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 });
  await page.mouse.up();
}

test.describe('guragura-seesaw: ふたご皿 (twin basket) ラウンド3', () => {
  test('dog→A, lemon→B で釣り合い、ラウンド4へ自動進行する (検証済みの解)', async ({ page }) => {
    await gotoTwinRound3(page);

    await dragTrayItemTo(page, 'dog', page.locator('#panRightA'));
    await expect(page.locator('#panRightAItems .item-box[data-item-id="dog"]')).toBeVisible();

    await dragTrayItemTo(page, 'lemon', page.locator('#panRightB'));
    await expect(page.locator('#panRightBItems .item-box[data-item-id="lemon"]')).toBeVisible();

    // バネ静定(最大3秒程度)+ 600ms保持 を見込んでバナー表示を長めに待つ
    await expect(page.locator('#balanceBanner')).toHaveClass(/show/, { timeout: 8000 });

    // onRoundBalanced() の 1600ms 遷移後、ラウンド4 (index3, dog+cherry) へ進み
    // ふたご皿バスケットがリセットされている (この後もラウンド4もふたご皿対象)
    await expect
      .poll(
        () => page.evaluate(() => {
          const dots = document.querySelectorAll('#roundDots .round-dot');
          return dots[3] ? dots[3].classList.contains('is-current') : false;
        }),
        { timeout: 8000 }
      )
      .toBe(true);

    await expect(page.locator('#plank')).toHaveClass(/is-twin-round/, { timeout: 2000 }); // ラウンド4もふたご皿
    await expect(page.locator('#panRightAItems .item-box')).toHaveCount(0);
    await expect(page.locator('#panRightBItems .item-box')).toHaveCount(0);
  });

  test('局所超過 (そのお皿だけ おもすぎ) は拒否され、専用メッセージが出る', async ({ page }) => {
    await gotoTwinRound3(page);

    // dog(4) → A: localOverloadMax(5) 以内なので成功
    await dragTrayItemTo(page, 'dog', page.locator('#panRightA'));
    await expect(page.locator('#panRightAItems .item-box[data-item-id="dog"]')).toBeVisible();

    // apple(2) → A: dog(4)+apple(2)=6 > localOverloadMax(5) で localSlip 拒否
    await dragTrayItemTo(page, 'apple', page.locator('#panRightA'));

    await expect(page.locator('#slipBubbleA')).toHaveClass(/show/);
    await expect(page.locator('#slipBubbleA')).toContainText('こっちのおさらだけ');

    // apple は拒否されトレイに残ったまま (A には入っていない)
    await expect(page.locator('#panRightAItems .item-box[data-item-id="apple"]')).toHaveCount(0);
    await expect(page.locator('#tray .item-box[data-item-id="apple"]')).toBeVisible();

    // B側のバスケット/バブルには影響が及んでいない (局所限定であることの確認)
    await expect(page.locator('#panRightBItems .item-box')).toHaveCount(0);
    await expect(page.locator('#slipBubbleB')).not.toHaveClass(/show/);
  });
});
