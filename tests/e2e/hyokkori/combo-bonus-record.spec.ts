const { test, expect } = require('@playwright/test');

const COMBO_RECORD_KEY = 'pono_hyokkori_best_combo_v2';
const BONUS_ASSET = '/assets/images/hyokkori-hightouch/friend_hikari_momonga_bonus_awake.png';

function scoreFromHud(text) {
  const match = String(text || '').match(/(\d+)\s*$/);
  if (!match) throw new Error(`スコアHUDを数値として読めませんでした: ${text}`);
  return Number(match[1]);
}

async function advanceToActionableFriend(page, options = {}) {
  const wantedBonus = options.bonus === true;
  const budgetMs = options.budgetMs || 5_000;

  for (let advanced = 0; advanced <= budgetMs; advanced += 50) {
    const candidate = page.locator('.hh-hole').filter({
      has: page.locator(`.hh-char-wrap.is-visible${wantedBonus ? '.is-bonus' : ':not(.is-bonus)'}`),
    }).filter({ has: page.locator('.hh-window') }).first();

    if (await candidate.count()) {
      const label = await candidate.getAttribute('aria-label');
      if (label && label.includes('ハイタッチ')) return candidate;
    }
    await page.clock.runFor(50);
  }

  throw new Error(wantedBonus
    ? '7体ごとのボーナスキャラが時間内に出現しませんでした'
    : '通常のawakeキャラが時間内に出現しませんでした');
}

async function tapFriendAndReadDelta(page, hole) {
  const before = scoreFromHud(await page.locator('#hud-score').textContent());
  await hole.locator('.hh-window').click({ force: true });
  const after = scoreFromHud(await page.locator('#hud-score').textContent());
  expect(after).toBeGreaterThan(before);
  return { before, after, delta: after - before };
}

test('30びょう版: 7体目のボーナス、コンボ加点、最大コンボ記録が一続きで更新される', async ({ page }) => {
  test.setTimeout(30_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.clock.install({ time: new Date('2026-07-23T00:00:00Z') });
  await page.addInitScript(({ recordKey }) => {
    window.__APP_BUILD__ = 1;
    // 穴・通常キャラの種類は固定しつつ、sleeping抽選だけは必ずawake側へ寄せる。
    // ボーナス判定そのものは実出現数(7,14,...)なので Math.random に依存しない。
    Math.random = () => 0.75;
    try {
      window.sessionStorage.setItem('pono_debug_mode_session', '1');
      window.localStorage.setItem(recordKey, '3');
    } catch (_e) { /* noop */ }
  }, { recordKey: COMBO_RECORD_KEY });

  const consoleErrors = [];
  const pageErrors = [];
  const bonusResponses = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('response', (response) => {
    if (new URL(response.url()).pathname === BONUS_ASSET) bonusResponses.push(response.status());
  });

  await page.goto('/hyokkori-hightouch/index.html');
  await page.waitForFunction(() => !!window.HyokkoriLogic);
  expect(await page.evaluate(() => window.HyokkoriLogic.GAME_DURATION)).toBe(30);
  await expect(page.locator('#hud-timer')).toHaveText('⏱ 30');
  await expect(page.locator('#combo-hud')).toHaveAttribute('aria-hidden', 'true');

  await page.locator('#start-btn').click({ force: true });
  await page.clock.runFor(1_250);
  await expect(page.locator('#countdown-screen')).not.toHaveClass(/show/);
  await expect(page.locator('#hud-timer')).toHaveText('⏱ 30');

  // 1〜6体目は通常awake。2体目から中央の数字コンボHUDを表示し、
  // 「基本10点 + 直前コンボ数」がリアルタイムに加算される。
  for (let hit = 1; hit <= 6; hit += 1) {
    const hole = await advanceToActionableFriend(page);
    const score = await tapFriendAndReadDelta(page, hole);
    expect(score.delta).toBe(9 + hit); // 1体目10点、2体目11点 … 6体目15点

    const scorePop = hole.locator('.hh-score-pop');
    await expect(scorePop).toContainText(String(score.delta));
    await expect(scorePop).toHaveClass(/show/);

    await expect(page.locator('#combo-count')).toHaveText(String(hit));
    if (hit === 1) {
      await expect(page.locator('#combo-hud')).not.toHaveClass(/is-visible/);
      await expect(page.locator('#combo-hud')).toHaveAttribute('aria-hidden', 'true');
    } else {
      await expect(page.locator('#combo-hud')).toHaveClass(/is-visible/);
      await expect(page.locator('#combo-hud')).toHaveAttribute('aria-hidden', 'false');
    }

    // 成功キャラの退場を完了させ、同じDOMを空振りとして二重タップしない。
    await page.clock.runFor(350);
  }

  const bonusHole = await advanceToActionableFriend(page, { bonus: true });
  const bonusWrap = bonusHole.locator('.hh-char-wrap');
  await expect(bonusWrap).toHaveClass(/is-visible/);
  await expect(bonusWrap).toHaveClass(/is-bonus/);
  await expect(bonusHole.locator('.hh-char')).toHaveAttribute('src', /friend_hikari_momonga_bonus_awake\.png$/);
  await expect(bonusHole.locator('.hh-bonus-badge')).toBeVisible();
  await expect(bonusHole.locator('.hh-bonus-badge')).toHaveText('30てん');
  await expect(bonusHole).toHaveAttribute('aria-label', /ハイタッチ|30てん/);

  const bonusScore = await tapFriendAndReadDelta(page, bonusHole);
  expect(bonusScore.delta).toBe(36); // ボーナス基本30点 + 直前6コンボ
  await expect(page.locator('#hud-score')).toHaveText(`🖐️ ${bonusScore.after}`);
  await expect(page.locator('#combo-count')).toHaveText('7');
  await expect(bonusHole.locator('.hh-score-pop')).toContainText('36');
  await expect(bonusHole.locator('.hh-score-pop')).toHaveClass(/is-bonus/);

  // 残り時間は入力せず進める。自然退場ではコンボを壊さないため、
  // 30秒終了後に今回の最大7コンボが端末記録3を更新する。
  await page.clock.runFor(34_000);
  await expect(page.locator('#result-overlay')).toHaveClass(/show/);
  await expect(page.locator('#result-combo')).toHaveText('さいだい 7コンボ');
  await expect(page.locator('#result-best-combo')).toHaveText('きろく 7コンボ');
  await expect(page.locator('#result-combo-new')).not.toHaveClass(/hidden/);
  await expect(page.locator('#result-new')).toHaveText('スコア しんきろく！');
  expect(await page.evaluate((key) => window.localStorage.getItem(key), COMBO_RECORD_KEY)).toBe('7');

  expect(bonusResponses).toContain(200);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);

  await page.locator('#retry-btn').click({ force: true });
  await expect(page.locator('#combo-status-sr')).toHaveText('');
  await expect(page.locator('#combo-hud')).toHaveAttribute('aria-hidden', 'true');
});

test('別タブで伸びた最大コンボを、小さい今回値で上書きしない', async ({ page }) => {
  test.setTimeout(25_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.clock.install({ time: new Date('2026-07-23T00:00:00Z') });
  await page.addInitScript(({ recordKey }) => {
    Math.random = () => 0.75;
    window.localStorage.setItem(recordKey, '1');
  }, { recordKey: COMBO_RECORD_KEY });

  await page.goto('/hyokkori-hightouch/index.html');
  await page.locator('#start-btn').click({ force: true });
  await page.clock.runFor(1_250);

  for (let hit = 0; hit < 2; hit += 1) {
    const hole = await advanceToActionableFriend(page);
    await tapFriendAndReadDelta(page, hole);
    await page.clock.runFor(350);
  }
  await expect(page.locator('#combo-count')).toHaveText('2');

  // このページが遊ばれている間に、別タブがより大きい記録を保存した状態を再現。
  await page.evaluate((key) => window.localStorage.setItem(key, '5'), COMBO_RECORD_KEY);
  await page.clock.runFor(34_000);

  await expect(page.locator('#result-overlay')).toHaveClass(/show/);
  await expect(page.locator('#result-combo')).toHaveText('さいだい 2コンボ');
  await expect(page.locator('#result-best-combo')).toHaveText('きろく 5コンボ');
  await expect(page.locator('#result-combo-new')).toHaveClass(/hidden/);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), COMBO_RECORD_KEY)).toBe('5');
});

test('うごきをへらす設定でも、加点を静止表示してから退場する', async ({ page }) => {
  test.setTimeout(15_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-07-23T00:00:00Z') });
  await page.addInitScript(() => { Math.random = () => 0.75; });

  await page.goto('/hyokkori-hightouch/index.html');
  await page.locator('#start-btn').click({ force: true });
  await page.clock.runFor(1_250);

  const candidate = await advanceToActionableFriend(page);
  const holeIndex = await candidate.getAttribute('data-hole');
  const hole = page.locator(`.hh-hole[data-hole="${holeIndex}"]`);
  await tapFriendAndReadDelta(page, hole);
  const wrap = hole.locator('.hh-char-wrap');
  const pop = hole.locator('.hh-score-pop');
  await expect(wrap).toHaveClass(/is-visible/);
  await expect(pop).toHaveClass(/show/);
  await expect(pop).toBeVisible();

  const scoreAfterHit = await page.locator('#hud-score').textContent();
  await page.clock.runFor(300); // 220msクールダウン後もキャラは静止表示中。
  await hole.locator('.hh-window').click({ force: true });
  await expect(page.locator('#hud-score')).toHaveText(scoreAfterHit || '');
  await expect(page.locator('#combo-count')).toHaveText('1');

  await page.clock.runFor(200);
  await expect(wrap).toHaveClass(/is-visible/);
  await expect(pop).toBeVisible();

  await page.clock.runFor(150);
  await expect(wrap).not.toHaveClass(/is-visible/);
  await expect(pop).not.toHaveClass(/show/);
});
