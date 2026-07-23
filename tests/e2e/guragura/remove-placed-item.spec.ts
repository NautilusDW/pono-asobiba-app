// guragura-seesaw/: 「誤って乗せたアイテムを取り除けず詰む」バグ (2026-07-23 ユーザー報告)
// の恒久回帰テスト。
//
// 根本原因: .pan-items { pointer-events: none } (styles.css) が皿に置いた
// .item-box まで無効化しており、endDragSingle/endDragTwin の「皿の外へドラッグ
// して離すとトレイへ戻る」経路 (js/game.js) 自体は正しく実装されていたにも
// かかわらず、置いたアイテムの touchstart/pointerdown が二度と発火せず
// 実質デッドコードになっていた。 tray 側は pointer-events を制限していない
// ため今まで気づかれなかった (batch:1414-hatake-seesaw の初回実装から存在する
// 潜在バグで、当セッションの near-balance/twin-basket 追加による regression では
// ない)。
//
// 修正: .item-box に pointer-events:auto を明示 (styles.css)。
//
// 本specは「置く→(誤配置に気づいて)取り除く→もう一度正しく置く」という
// フルサイクルを、単一皿の2ラウンド (最初のラウンド、および石カテゴリが混ざる
// 終盤ラウンド) で検証する。
//
// 2026-07-23 v3 再設計 (人形/大きさ=重さ統一・10ラウンド化) でふたご皿メカニクスは
// どのラウンドからも使わなくなった (TWIN_ROUND_CONFIG={}) ため、旧「ラウンド3
// (ふたご皿): A皿・B皿それぞれで…」テストは前提が崩れている。 ふたご皿UI自体が
// 実行時に一切到達しないことは twin-basket-round3.spec.ts が検証するため、本ファイル
// では単一皿の石アイテム (star_block/mystery_stone) を使った remove サイクルに
// 置き換える (石カテゴリはトレイに登場するのが終盤ラウンドのみのため、単一皿
// 経路でも別途カバーしておく価値がある)。
const { test, expect } = require('@playwright/test');

async function setupPage(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) { /* noop */ }
    try { window.localStorage.setItem('pono_guragura_tut_seen_v1', '1'); } catch (_e) { /* noop */ }
  });
}

async function dragMouse(page, fromBox, toBox) {
  await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 12 });
  await page.mouse.up();
}

test.describe('guragura-seesaw: 皿に置いたアイテムをトレイへ取り除ける (詰み事故回帰)', () => {
  test('ラウンド1 (単一皿): 置く→取り除く→別アイテムを置き直せる', async ({ page }) => {
    await setupPage(page);
    await page.goto('/guragura-seesaw/index.html');
    await page.locator('#startBtn').click({ force: true });
    await expect(page.locator('#playScreen')).toBeVisible();
    await page.waitForTimeout(200); // レイアウト確定待ち (並列worker起動直後のflaky対策)

    // 誤って cherry を置いてしまったと仮定
    const cherry = page.locator('#tray .item-box[data-item-id="cherry"]');
    const cherryBox = await cherry.boundingBox();
    const panBox = await page.locator('#panRight').boundingBox();
    expect(cherryBox, 'tray cherry bounding box').toBeTruthy();
    expect(panBox, 'panRight bounding box').toBeTruthy();
    if (!cherryBox || !panBox) return;
    await dragMouse(page, cherryBox, panBox);
    await expect(page.locator('#panRightItems .item-box[data-item-id="cherry"]')).toBeVisible();

    // バネが静定するまで待つ (置いた直後は #plank が傾いてアイテムの実座標が
    // 動き続けるため、静定前に取得した座標でドラッグすると外れる恐れがある)
    await page.waitForTimeout(2000);

    // 気づいて取り除く: 皿の外(トレイ)までドラッグして離す
    const placed = page.locator('#panRightItems .item-box[data-item-id="cherry"]');
    const placedBox = await placed.boundingBox();
    const trayBox = await page.locator('#tray').boundingBox();
    expect(placedBox, 'placed cherry bounding box').toBeTruthy();
    expect(trayBox, 'tray bounding box').toBeTruthy();
    if (!placedBox || !trayBox) return;
    await dragMouse(page, placedBox, trayBox);

    // 皿から消えてトレイへ戻っている (詰みバグならここで #panRightItems に残り続ける)
    await expect(page.locator('#panRightItems .item-box[data-item-id="cherry"]')).toHaveCount(0);
    await expect(page.locator('#tray .item-box[data-item-id="cherry"]')).toBeVisible();

    // 詰みでないことの最終確認: 取り除いた後も別アイテムを新たに置ける
    const blueberry = page.locator('#tray .item-box[data-item-id="blueberry"]');
    const blueberryBox = await blueberry.boundingBox();
    const panBox2 = await page.locator('#panRight').boundingBox();
    expect(blueberryBox, 'tray blueberry bounding box').toBeTruthy();
    expect(panBox2, 'panRight bounding box (2nd)').toBeTruthy();
    if (!blueberryBox || !panBox2) return;
    await dragMouse(page, blueberryBox, panBox2);
    await expect(page.locator('#panRightItems .item-box[data-item-id="blueberry"]')).toBeVisible();
  });

  test('ラウンド10 (石カテゴリが混ざる最終ラウンド・単一皿): 置く→取り除く→別の石を置き直せる', async ({ page }) => {
    await setupPage(page);
    await page.goto('/guragura-seesaw/index.html');
    await page.locator('#startBtn').click({ force: true });
    await expect(page.locator('#playScreen')).toBeVisible();
    await page.waitForTimeout(200); // レイアウト確定待ち (並列worker起動直後のflaky対策)
    await page.evaluate(() => {
      // @ts-ignore debug-only global, guragura-seesaw/js/game.js 参照
      window.__guraguraDebugGotoRound(9); // 最終ラウンド (0-indexed9): tray に mystery_stone/star_block を含む
    });
    // v3 (2026-07-23) 再設計以降、ふたご皿はどのラウンドでも使わないため
    // #plank に is-twin-round は付かず、単一皿 (#panRight/#panRightItems) 経路になる
    // (ふたご皿UIが実行時に到達しないこと自体は twin-basket-round3.spec.ts が別途検証)。
    await expect(page.locator('#plank')).not.toHaveClass(/is-twin-round/);

    // ふしぎな いし を誤配置 → 取り除く → ほしの ブロックを置き直す
    const stone = page.locator('#tray .item-box[data-item-id="mystery_stone"]');
    const stoneBox = await stone.boundingBox();
    const panBox = await page.locator('#panRight').boundingBox();
    expect(stoneBox, 'tray mystery_stone bounding box').toBeTruthy();
    expect(panBox, 'panRight bounding box').toBeTruthy();
    if (!stoneBox || !panBox) return;
    await dragMouse(page, stoneBox, panBox);
    await expect(page.locator('#panRightItems .item-box[data-item-id="mystery_stone"]')).toBeVisible();
    await page.waitForTimeout(2000);

    const placedStone = page.locator('#panRightItems .item-box[data-item-id="mystery_stone"]');
    const placedStoneBox = await placedStone.boundingBox();
    const trayBox = await page.locator('#tray').boundingBox();
    expect(placedStoneBox, 'placed mystery_stone bounding box').toBeTruthy();
    expect(trayBox, 'tray bounding box').toBeTruthy();
    if (!placedStoneBox || !trayBox) return;
    await dragMouse(page, placedStoneBox, trayBox);
    await expect(page.locator('#panRightItems .item-box[data-item-id="mystery_stone"]')).toHaveCount(0);
    await expect(page.locator('#tray .item-box[data-item-id="mystery_stone"]')).toBeVisible();

    const star = page.locator('#tray .item-box[data-item-id="star_block"]');
    const starBox = await star.boundingBox();
    const panBox2 = await page.locator('#panRight').boundingBox();
    expect(starBox, 'tray star_block bounding box').toBeTruthy();
    expect(panBox2, 'panRight bounding box (2nd)').toBeTruthy();
    if (!starBox || !panBox2) return;
    await dragMouse(page, starBox, panBox2);
    await expect(page.locator('#panRightItems .item-box[data-item-id="star_block"]')).toBeVisible();

    // 詰みでないことの最終確認: 取り除いた後も別アイテムを新たに置ける
    await page.waitForTimeout(2000);
    const lemon = page.locator('#tray .item-box[data-item-id="lemon"]').first();
    const lemonBox = await lemon.boundingBox();
    const panBox3 = await page.locator('#panRight').boundingBox();
    expect(lemonBox, 'tray lemon bounding box').toBeTruthy();
    expect(panBox3, 'panRight bounding box (3rd)').toBeTruthy();
    if (!lemonBox || !panBox3) return;
    await dragMouse(page, lemonBox, panBox3);
    await expect(page.locator('#panRightItems .item-box[data-item-id="lemon"]')).toBeVisible();
  });

  test('皿の中へ戻して離した場合 (実質タップ) はno-opで、置いたままになる', async ({ page }) => {
    await setupPage(page);
    await page.goto('/guragura-seesaw/index.html');
    await page.locator('#startBtn').click({ force: true });
    await expect(page.locator('#playScreen')).toBeVisible();
    await page.waitForTimeout(200); // レイアウト確定待ち (並列worker起動直後のflaky対策)

    const cherry = page.locator('#tray .item-box[data-item-id="cherry"]');
    const cherryBox = await cherry.boundingBox();
    const panBox = await page.locator('#panRight').boundingBox();
    expect(cherryBox, 'tray cherry bounding box').toBeTruthy();
    expect(panBox, 'panRight bounding box').toBeTruthy();
    if (!cherryBox || !panBox) return;
    await dragMouse(page, cherryBox, panBox);
    await expect(page.locator('#panRightItems .item-box[data-item-id="cherry"]')).toBeVisible();
    await page.waitForTimeout(2000);

    // 置いたアイテムを同じ皿の中で少し動かして離す (= 皿内へ戻したとみなされ no-op)
    const placed = page.locator('#panRightItems .item-box[data-item-id="cherry"]');
    const placedBox = await placed.boundingBox();
    expect(placedBox, 'placed cherry bounding box').toBeTruthy();
    if (!placedBox) return;
    await page.mouse.move(placedBox.x + placedBox.width / 2, placedBox.y + placedBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(placedBox.x + placedBox.width / 2 + 4, placedBox.y + placedBox.height / 2, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // no-op: 皿に残ったまま、トレイには戻らない
    await expect(page.locator('#panRightItems .item-box[data-item-id="cherry"]')).toBeVisible();
    await expect(page.locator('#tray .item-box[data-item-id="cherry"]')).toHaveCount(0);
  });
});
