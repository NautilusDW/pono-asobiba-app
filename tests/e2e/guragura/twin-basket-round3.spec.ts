// guragura-seesaw/: ふたご皿 (twin basket) メカニクス e2e スモークテスト。
//
// ラウンド3 (index2, おだい=elephant単体(重さ10), "普通"ティア: 1皿最大3個/局所重さ
// 上限7) を対象に、実際のドラッグ操作 (page.mouse: このゲームは HTML5 dragTo ではなく
// pointerdown/pointermove/pointerup の自前実装なので dragTo() は使えない) で
// A/B バスケットへ配置 → 釣り合い成立 → 次ラウンドへ自動進行することを検証する。
// 加えて局所超過、軽すぎる初手、別皿2ブロックによる全体超過の拒否と
// 方向どおりのメッセージ表示も検証する。 §3-24 (game.js/styles.css 実装) の実地確認。
// ふしぎブロック導入 (2026-07-23): ぞう(10) に対して、現実の小動物を寄せ集めず
// ほし(7)→A、ぶどう(3)→B の発見型ルートで解く。

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
  test('ほし→A、ぶどう→B で釣り合い、ラウンド4へ自動進行する', async ({ page }) => {
    await gotoTwinRound3(page);

    await dragTrayItemTo(page, 'star_block', page.locator('#panRightA'));
    await expect(page.locator('#panRightAItems .item-box[data-item-id="star_block"]')).toBeVisible();

    await dragTrayItemTo(page, 'grapes', page.locator('#panRightB'));
    await expect(page.locator('#panRightBItems .item-box[data-item-id="grapes"]')).toBeVisible();

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

    // ほし(7) → A: localOverloadMax(7) ちょうどなので成功
    await dragTrayItemTo(page, 'star_block', page.locator('#panRightA'));
    await expect(page.locator('#panRightAItems .item-box[data-item-id="star_block"]')).toBeVisible();

    // はーと(7) → A: ほし(7)+はーと(7)=14 > localOverloadMax(7) で localSlip 拒否
    await dragTrayItemTo(page, 'heart_block', page.locator('#panRightA'));

    await expect(page.locator('#slipBubbleA')).toHaveClass(/show/);
    await expect(page.locator('#slipBubbleA')).toContainText('こっちのおさらだけ');

    // はーとは拒否されトレイに残ったまま (A には入っていない)
    await expect(page.locator('#panRightAItems .item-box[data-item-id="heart_block"]')).toHaveCount(0);
    await expect(page.locator('#tray .item-box[data-item-id="heart_block"]')).toBeVisible();

    // B側のバスケット/バブルには影響が及んでいない (局所限定であることの確認)
    await expect(page.locator('#panRightBItems .item-box')).toHaveCount(0);
    await expect(page.locator('#slipBubbleB')).not.toHaveClass(/show/);
  });

  test('ぶどうを先に置いた軽すぎる試行は、重すぎると逆案内しない', async ({ page }) => {
    await gotoTwinRound3(page);

    // ぶどう(3)だけでは elephant(10) との差7が slipDiff(4)以上。
    // 置く順番のヒントとして軽い方向を正しく伝え、ぶどうはトレイへ戻す。
    await dragTrayItemTo(page, 'grapes', page.locator('#panRightA'));

    await expect(page.locator('#slipBubble')).toHaveClass(/show/);
    await expect(page.locator('#slipBubble')).toContainText('まだ かるいみたい');
    await expect(page.locator('#slipBubble')).not.toContainText('おもすぎ');
    await expect(page.locator('#panRightAItems .item-box[data-item-id="grapes"]')).toHaveCount(0);
    await expect(page.locator('#tray .item-box[data-item-id="grapes"]')).toBeVisible();
  });

  test('ブロックを別々のお皿へ2個置く全体超過は境界値で拒否される', async ({ page }) => {
    await gotoTwinRound3(page);

    await dragTrayItemTo(page, 'star_block', page.locator('#panRightA'));
    await expect(page.locator('#panRightAItems .item-box[data-item-id="star_block"]')).toBeVisible();

    // ほし(7)+はーと(7)=14、elephant(10)との差4は slipDiff(4)ちょうど。
    // B単独は上限7以内なので localSlip ではなく全体slipになる。
    await dragTrayItemTo(page, 'heart_block', page.locator('#panRightB'));

    await expect(page.locator('#slipBubble')).toHaveClass(/show/);
    await expect(page.locator('#slipBubble')).toContainText('おもすぎたみたい');
    await expect(page.locator('#panRightBItems .item-box[data-item-id="heart_block"]')).toHaveCount(0);
    await expect(page.locator('#tray .item-box[data-item-id="heart_block"]')).toBeVisible();
    await expect(page.locator('#slipBubbleB')).not.toHaveClass(/show/);
  });
});
