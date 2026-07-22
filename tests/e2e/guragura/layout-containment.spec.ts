// guragura-seesaw/: シーソー板と両皿が 16:9 レターボックス (#stage) の内側に
// 常に完全収容されることを bounding box の実測値で検証する回帰テスト。
//
// 背景: #plank (styles.css 99-108行) は `left:50%; width:58%;` のみでセンタリング
// 補正 (translateX(-50%) 等) が無く、「左端が舞台中央 → 右へ58%伸びる」矩形になって
// いた。回転ゼロでも 50%+58%=108%>100% で必ず右皿が #stage の右外へはみ出し不可視に
// なっていた (初回コミット e46006e77 から存在)。修正は #plankPivot という位置決め専用
// ラッパーを新設して #plank から centering を分離する二層構造 (game.js の rAF ループが
// #plank の transform を rotate(...) で毎フレーム上書きするため、CSS 単体の
// translateX(-50%) 追加では JS 起動直後に消えて修正にならない)。

const { test, expect } = require('@playwright/test');

async function setupPage(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) {}
    // 初回自動チュートリアルが #tut-dim/#tut-bubble を覆い操作の妨げにならないよう、
    // このテストでは「既読」フラグを事前セットしてスキップする (§3.1 はレイアウト検証が主眼)。
    try { window.localStorage.setItem('pono_guragura_tut_seen_v1', '1'); } catch (_e) {}
  });
}

function assertContained(box, stage, label) {
  expect(box, `${label}: bounding box が取得できませんでした`).toBeTruthy();
  expect(box.x, `${label}.x が stage 左端より外`).toBeGreaterThanOrEqual(stage.x - 1);
  expect(box.x + box.width, `${label} 右端が stage 右端より外`).toBeLessThanOrEqual(stage.x + stage.width + 1);
  expect(box.y, `${label}.y が stage 上端より外`).toBeGreaterThanOrEqual(stage.y - 1);
  expect(box.y + box.height, `${label} 下端が stage 下端より外`).toBeLessThanOrEqual(stage.y + stage.height + 1);
}

const VIEWPORTS = [
  { width: 1057, height: 605, label: '1057x605' },
  { width: 844, height: 390, label: '844x390 (iPhone横持ち相当)' },
  { width: 1280, height: 720, label: '1280x720' },
];

for (const vp of VIEWPORTS) {
  test(`静止状態: 板/両皿が #stage 内に完全収容される (${vp.label})`, async ({ page }) => {
    await setupPage(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/guragura-seesaw/index.html');
    await page.locator('#startBtn').click({ force: true });
    await expect(page.locator('#playScreen')).toBeVisible();

    const stage = await page.locator('#stage').boundingBox();
    const plank = await page.locator('#plank').boundingBox();
    const panLeft = await page.locator('#panLeft').boundingBox();
    const panRight = await page.locator('#panRight').boundingBox();

    assertContained(plank, stage, '#plank');
    assertContained(panLeft, stage, '#panLeft');
    assertContained(panRight, stage, '#panRight');

    // 「右皿が見えている」ことの直接検証: 中心が stage 右半分にあること
    // (今回のバグでは #panRight の中心自体が stage の外にあった)。
    const panRightCenterX = panRight.x + panRight.width / 2;
    expect(panRightCenterX).toBeGreaterThan(stage.x + stage.width * 0.5);
  });
}

test('最大傾斜 (+14deg) でも板/両皿が #stage 内に完全収容される', async ({ page }) => {
  await setupPage(page);
  await page.setViewportSize({ width: 1057, height: 605 });
  await page.goto('/guragura-seesaw/index.html');
  await page.locator('#startBtn').click({ force: true });
  await expect(page.locator('#playScreen')).toBeVisible();

  // rAF ループが transform を上書きし続けるため、evaluate 内で回転値を設定してから
  // 同期的に3要素の getBoundingClientRect を取得しその戻り値を assert する
  // (setTimeout/次フレームを挟まない一発 evaluate で「上書きされる前」を確実に捉える)。
  const stage = await page.locator('#stage').boundingBox();
  const rects = await page.evaluate(() => {
    const plank = document.getElementById('plank');
    plank.style.transform = 'rotate(14deg)';
    const p = plank.getBoundingClientRect();
    const l = document.getElementById('panLeft').getBoundingClientRect();
    const r = document.getElementById('panRight').getBoundingClientRect();
    const toBox = (rect) => ({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    return { plank: toBox(p), panLeft: toBox(l), panRight: toBox(r) };
  });

  assertContained(rects.plank, stage, '#plank (+14deg)');
  assertContained(rects.panLeft, stage, '#panLeft (+14deg)');
  assertContained(rects.panRight, stage, '#panRight (+14deg)');
});

test('最大傾斜 (-14deg) でも板/両皿が #stage 内に完全収容される', async ({ page }) => {
  await setupPage(page);
  await page.setViewportSize({ width: 1057, height: 605 });
  await page.goto('/guragura-seesaw/index.html');
  await page.locator('#startBtn').click({ force: true });
  await expect(page.locator('#playScreen')).toBeVisible();

  const stage = await page.locator('#stage').boundingBox();
  const rects = await page.evaluate(() => {
    const plank = document.getElementById('plank');
    plank.style.transform = 'rotate(-14deg)';
    const p = plank.getBoundingClientRect();
    const l = document.getElementById('panLeft').getBoundingClientRect();
    const r = document.getElementById('panRight').getBoundingClientRect();
    const toBox = (rect) => ({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    return { plank: toBox(p), panLeft: toBox(l), panRight: toBox(r) };
  });

  assertContained(rects.plank, stage, '#plank (-14deg)');
  assertContained(rects.panLeft, stage, '#panLeft (-14deg)');
  assertContained(rects.panRight, stage, '#panRight (-14deg)');
});

test.describe('初回自動チュートリアル', () => {
  test('localStorage が空の新規コンテキストでは開始直後にチュートリアルが自動表示される', async ({ page }) => {
    await page.addInitScript(() => {
      window.__APP_BUILD__ = 1;
      try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) {}
    });
    await page.goto('/guragura-seesaw/index.html');
    await page.locator('#startBtn').click({ force: true });
    await expect(page.locator('#playScreen')).toBeVisible();

    await expect(page.locator('#tut-bubble')).toBeVisible();

    // 「つぎへ」で2枚目 (視覚的な対応を取る「みぎの おさら」文言) へ進める
    await page.locator('#tut-next').click({ force: true });
    await expect(page.locator('#tut-bubble')).toBeVisible();
    await expect(page.locator('#tut-bubble')).toContainText('みぎの おさら');

    // 3枚目へ進める
    await page.locator('#tut-next').click({ force: true });
    await expect(page.locator('#tut-bubble')).toBeVisible();

    // 最終ステップの「とじる」で非表示になる
    await page.locator('#tut-next').click({ force: true });
    await expect(page.locator('#tut-dim')).toBeHidden();
    await expect(page.locator('#tut-bubble')).toBeHidden();
  });

  test('既読フラグがある場合はチュートリアルが自動表示されない', async ({ page }) => {
    await page.addInitScript(() => {
      window.__APP_BUILD__ = 1;
      try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) {}
      try { window.localStorage.setItem('pono_guragura_tut_seen_v1', '1'); } catch (_e) {}
    });
    await page.goto('/guragura-seesaw/index.html');
    await page.locator('#startBtn').click({ force: true });
    await expect(page.locator('#playScreen')).toBeVisible();
    await expect(page.locator('#tut-bubble')).toBeHidden();
  });

  test('チュートリアル表示中でも背景タップ (#tut-dim) で閉じられる', async ({ page }) => {
    await page.addInitScript(() => {
      window.__APP_BUILD__ = 1;
      try { window.sessionStorage.setItem('pono_debug_mode_session', '1'); } catch (_e) {}
    });
    await page.goto('/guragura-seesaw/index.html');
    await page.locator('#startBtn').click({ force: true });
    await expect(page.locator('#tut-bubble')).toBeVisible();

    await page.locator('#tut-dim').click({ force: true, position: { x: 5, y: 5 } });
    await expect(page.locator('#tut-dim')).toBeHidden();
    await expect(page.locator('#tut-bubble')).toBeHidden();
  });
});
