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

async function advanceToTwoActionableFriends(page, budgetMs = 8_000) {
  for (let advanced = 0; advanced <= budgetMs; advanced += 50) {
    const candidates = page.locator('.hh-hole').filter({
      has: page.locator('.hh-char-wrap.is-visible:not(.is-bonus):not(.is-sleeping)'),
    });
    if (await candidates.count() >= 2) return [candidates.nth(0), candidates.nth(1)];
    await page.clock.runFor(50);
  }
  throw new Error('同時にハイタッチできる2体が時間内に出現しませんでした');
}

test('中央コンボレーンが4画面サイズで上下のキャラ窓と重ならない', async ({ page }) => {
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto('/hyokkori-hightouch/index.html');

  for (const viewport of [
    { width: 568, height: 320 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    const geometry = await page.evaluate(() => {
      const comboHud = document.getElementById('combo-hud');
      const comboCount = document.getElementById('combo-count');
      comboHud.classList.add('is-visible');
      comboHud.dataset.tier = '4';
      comboHud.style.setProperty('--combo-grow', '50px');
      comboCount.textContent = '88';
      const coreElement = document.querySelector('.combo-core');
      const impactScale = Number.parseFloat(getComputedStyle(comboHud).getPropertyValue('--combo-impact-scale')) || 1;
      coreElement.style.transform = `scale(${impactScale})`;
      const stage = document.getElementById('stage').getBoundingClientRect();
      const combo = comboHud.getBoundingClientRect();
      const core = coreElement.getBoundingClientRect();
      const holes = Array.from(document.querySelectorAll('.hh-hole'));
      const windows = Array.from(document.querySelectorAll('.hh-window')).map((element) => element.getBoundingClientRect());
      const depthScales = holes.map((element) => Number.parseFloat(
        getComputedStyle(element).getPropertyValue('--depth-scale'),
      ));
      document.querySelectorAll('#start-screen, #countdown-screen, #result-overlay, #landscape-notice').forEach((element) => {
        element.style.display = 'none';
      });
      const hitTargets = holes.map((hole) => {
        const rect = hole.getBoundingClientRect();
        const points = [
          [rect.left + rect.width * 0.5, rect.top + rect.height * 0.5],
          [rect.left + rect.width * 0.2, rect.top + rect.height * 0.5],
          [rect.left + rect.width * 0.8, rect.top + rect.height * 0.5],
          [rect.left + rect.width * 0.5, rect.top + rect.height * 0.2],
          [rect.left + rect.width * 0.5, rect.top + rect.height * 0.8],
        ];
        return {
          width: rect.width,
          height: rect.height,
          transform: getComputedStyle(hole).transform,
          allPointsHitHole: points.every(([x, y]) => document.elementFromPoint(x, y)?.closest('.hh-hole') === hole),
        };
      });
      const scaleX = (element) => {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
        return Math.hypot(matrix.a, matrix.b);
      };
      document.querySelectorAll('.hh-hideout').forEach((element) => {
        element.style.transition = 'none';
      });
      holes[0].classList.add('is-pressed');
      holes[3].classList.add('is-pressed');
      const pressedScales = {
        topBase: scaleX(holes[0].querySelector('.hh-hideout-base')),
        topForeground: scaleX(holes[0].querySelector('.hh-hideout-foreground')),
        bottomBase: scaleX(holes[3].querySelector('.hh-hideout-base')),
        bottomForeground: scaleX(holes[3].querySelector('.hh-hideout-foreground')),
      };
      holes[0].classList.remove('is-pressed');
      holes[3].classList.remove('is-pressed');
      const topBottom = Math.max(...windows.slice(0, 3).map((rect) => rect.bottom));
      const bottomTop = Math.min(...windows.slice(3, 6).map((rect) => rect.top));
      return {
        stageWidth: stage.width,
        stageHeight: stage.height,
        centerDx: combo.left + combo.width / 2 - (stage.left + stage.width / 2),
        centerDy: combo.top + combo.height / 2 - (stage.top + stage.height / 2),
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        overflowY: document.documentElement.scrollHeight - window.innerHeight,
        coreTop: core.top,
        coreBottom: core.bottom,
        topBottom,
        bottomTop,
        topWindowWidth: windows.slice(0, 3).reduce((sum, rect) => sum + rect.width, 0) / 3,
        bottomWindowWidth: windows.slice(3, 6).reduce((sum, rect) => sum + rect.width, 0) / 3,
        topDepthScale: depthScales[0],
        bottomDepthScale: depthScales[3],
        hitTargets,
        pressedScales,
        impactScale,
        pointerEvents: getComputedStyle(comboHud).pointerEvents,
      };
    });
    expect(Math.abs(geometry.centerDx)).toBeLessThanOrEqual(geometry.stageWidth * 0.02);
    expect(Math.abs(geometry.centerDy)).toBeLessThanOrEqual(geometry.stageHeight * 0.02);
    expect(geometry.overflowX).toBeLessThanOrEqual(0);
    expect(geometry.overflowY).toBeLessThanOrEqual(0);
    expect(geometry.coreTop - geometry.topBottom).toBeGreaterThanOrEqual(2);
    expect(geometry.bottomTop - geometry.coreBottom).toBeGreaterThanOrEqual(2);
    expect(geometry.impactScale).toBeGreaterThan(1);
    expect(geometry.impactScale).toBeLessThanOrEqual(1.14);
    expect(geometry.bottomWindowWidth / geometry.topWindowWidth).toBeGreaterThan(1.09);
    expect(geometry.bottomWindowWidth / geometry.topWindowWidth).toBeLessThan(1.15);
    expect(geometry.topDepthScale).toBeCloseTo(geometry.stageHeight <= 430 ? 0.9 : 0.88, 3);
    expect(geometry.bottomDepthScale).toBeCloseTo(1, 3);
    expect(geometry.hitTargets.every((target) => target.transform === 'none')).toBe(true);
    expect(geometry.hitTargets.every((target) => target.width >= 44 && target.height >= 44)).toBe(true);
    expect(geometry.hitTargets.every((target) => target.allPointsHitHole)).toBe(true);
    expect(geometry.pressedScales.topBase).toBeCloseTo(geometry.topDepthScale * 0.96, 3);
    expect(geometry.pressedScales.topForeground).toBeCloseTo(geometry.topDepthScale * 0.96, 3);
    expect(geometry.pressedScales.bottomBase).toBeCloseTo(geometry.bottomDepthScale * 0.96, 3);
    expect(geometry.pressedScales.bottomForeground).toBeCloseTo(geometry.bottomDepthScale * 0.96, 3);
    expect(geometry.pointerEvents).toBe('none');
  }
});

test('近い間隔の連続成功でも、前のタイマーが新しいコンボ演出を消さない', async ({ page }) => {
  test.setTimeout(15_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.clock.install({ time: new Date('2026-07-23T00:00:00Z') });
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    Math.random = () => 0.75;
  });
  await page.goto('/hyokkori-hightouch/index.html');
  await page.locator('#start-btn').click({ force: true });
  await page.clock.runFor(1_250);

  const first = await advanceToActionableFriend(page);
  await tapFriendAndReadDelta(page, first);
  await page.clock.runFor(350);
  await expect(page.locator('#combo-count')).toHaveText('1');

  const [second, third] = await advanceToTwoActionableFriends(page);
  await tapFriendAndReadDelta(page, second);
  await expect(page.locator('#combo-count')).toHaveText('2');
  await page.clock.runFor(250);
  await tapFriendAndReadDelta(page, third);
  await expect(page.locator('#combo-count')).toHaveText('3');
  await expect(page.locator('#combo-hud')).toHaveClass(/is-visible/);
  await expect(page.locator('#combo-hud')).toHaveClass(/is-slam/);

  // 2コンボ目のslam期限(560ms)とhide期限(760ms)を越えても、
  // 250ms後に始まった3コンボ目の演出は残る。
  await page.clock.runFor(330);
  await expect(page.locator('#combo-hud')).toHaveClass(/is-slam/);
  await expect(page.locator('#combo-hud')).toHaveClass(/is-visible/);
  // 自身の560ms境界から60ms離し、runnerの時刻丸めでも安定して判定する。
  await page.clock.runFor(170);
  await expect(page.locator('#combo-hud')).toHaveClass(/is-slam/);
  await expect(page.locator('#combo-hud')).toHaveClass(/is-visible/);
  await expect(page.locator('#fx-canvas')).toHaveAttribute('data-combo-fx-particles', '8');

  // 3コンボ目自身の期限でだけslam→HUD／花火の順に終わる。
  await page.clock.runFor(80);
  await expect(page.locator('#combo-hud')).not.toHaveClass(/is-slam/);
  await expect(page.locator('#combo-hud')).toHaveClass(/is-visible/);
  await page.clock.runFor(200);
  await expect(page.locator('#combo-hud')).not.toHaveClass(/is-visible/);
  await expect(page.locator('#combo-hud')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#fx-canvas')).toHaveAttribute('data-combo-fx-particles', '0');
});

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
  let growAtTwo = 0;
  for (let hit = 1; hit <= 6; hit += 1) {
    const hole = await advanceToActionableFriend(page);
    const score = await tapFriendAndReadDelta(page, hole);
    expect(score.delta).toBe(9 + hit); // 1体目10点、2体目11点 … 6体目15点

    const scorePop = hole.locator('.hh-score-pop');
    await expect(scorePop).toContainText(String(score.delta));
    await expect(scorePop).toHaveClass(/show/);

    await expect(page.locator('#combo-count')).toHaveText(String(hit));
    const profile = await page.evaluate((combo) => window.HyokkoriLogic.comboFxProfileAt(combo), hit);
    await expect(page.locator('#combo-hud')).toHaveAttribute('data-tier', String(profile.tier));
    if (hit === 1) {
      await expect(page.locator('#combo-hud')).not.toHaveClass(/is-visible/);
      await expect(page.locator('#combo-hud')).toHaveAttribute('aria-hidden', 'true');
      await expect(page.locator('#fx-canvas')).toHaveAttribute('data-combo-fx-particles', '0');
    } else {
      await expect(page.locator('#combo-hud')).toHaveClass(/is-visible/);
      await expect(page.locator('#combo-hud')).toHaveClass(/is-slam/);
      await expect(page.locator('#combo-hud')).toHaveAttribute('aria-hidden', 'false');
      await expect(page.locator('#fx-canvas')).toHaveAttribute('data-combo-fx-tier', String(profile.tier));
      await expect(page.locator('#fx-canvas')).toHaveAttribute('data-combo-fx-bursts', String(profile.burstCount));
      await expect(page.locator('#fx-canvas')).toHaveAttribute('data-combo-fx-particles', String(profile.particleCount));

      const growPx = await page.locator('#combo-hud').evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).getPropertyValue('--combo-grow')));
      expect(growPx).toBeCloseTo(profile.growPx, 5);

      if (hit === 2) {
        growAtTwo = growPx;
        const visual = await page.evaluate(() => {
          const stage = document.getElementById('stage').getBoundingClientRect();
          const combo = document.getElementById('combo-hud').getBoundingClientRect();
          const comboStyle = getComputedStyle(document.getElementById('combo-hud'));
          const countStyle = getComputedStyle(document.getElementById('combo-count'));
          const centerElement = document.elementFromPoint(combo.left + combo.width / 2, combo.top + combo.height / 2);
          return {
            stageCenterX: stage.left + stage.width / 2,
            stageCenterY: stage.top + stage.height / 2,
            comboCenterX: combo.left + combo.width / 2,
            comboCenterY: combo.top + combo.height / 2,
            stageWidth: stage.width,
            stageHeight: stage.height,
            backgroundColor: comboStyle.backgroundColor,
            borderTopWidth: comboStyle.borderTopWidth,
            boxShadow: comboStyle.boxShadow,
            paddingTop: comboStyle.paddingTop,
            pointerEvents: comboStyle.pointerEvents,
            countFontSize: Number.parseFloat(countStyle.fontSize),
            centerBlockedByCombo: !!(centerElement && centerElement.closest('#combo-hud')),
          };
        });
        expect(Math.abs(visual.comboCenterX - visual.stageCenterX)).toBeLessThanOrEqual(visual.stageWidth * 0.02);
        expect(Math.abs(visual.comboCenterY - visual.stageCenterY)).toBeLessThanOrEqual(visual.stageHeight * 0.02);
        expect(visual.backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(visual.borderTopWidth).toBe('0px');
        expect(visual.boxShadow).toBe('none');
        expect(visual.paddingTop).toBe('0px');
        expect(visual.pointerEvents).toBe('none');
        expect(visual.countFontSize).toBeGreaterThanOrEqual(64);
        expect(visual.centerBlockedByCombo).toBe(false);
      }
      if (hit === 5) {
        expect(profile.tier).toBe(2);
        expect(profile.particleCount).toBeGreaterThan(8);
        expect(growPx).toBeGreaterThan(growAtTwo);
      }
    }

    // 成功キャラの退場を完了させ、同じDOMを空振りとして二重タップしない。
    // 3コンボ目では、前回の旧タイマー境界を越えても今回のスラムが残ることも確認する。
    if (hit === 3) {
      await page.clock.runFor(250);
      await expect(page.locator('#combo-hud')).toHaveClass(/is-slam/);
      await page.clock.runFor(100);
    } else {
      await page.clock.runFor(350);
    }
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

  const bonusProfile = await page.evaluate(() => window.HyokkoriLogic.comboFxProfileAt(7));
  await expect(page.locator('#combo-hud')).toHaveAttribute('data-tier', String(bonusProfile.tier));
  await expect(page.locator('#fx-canvas')).toHaveAttribute('data-combo-fx-particles', String(bonusProfile.particleCount));

  // 10コンボまで続けると、中央数字がさらに育ち、花火は左右2か所・32粒へ強くなる。
  await page.clock.runFor(350);
  for (let hit = 8; hit <= 10; hit += 1) {
    const hole = await advanceToActionableFriend(page);
    const score = await tapFriendAndReadDelta(page, hole);
    expect(score.delta).toBe(9 + hit);
    await expect(page.locator('#combo-count')).toHaveText(String(hit));
    await expect(page.locator('#combo-hud')).toHaveClass(/is-visible/);
    await expect(page.locator('#combo-hud')).toHaveClass(/is-slam/);
    await page.clock.runFor(350);
  }
  const tierThreeProfile = await page.evaluate(() => window.HyokkoriLogic.comboFxProfileAt(10));
  await expect(page.locator('#combo-hud')).toHaveAttribute('data-tier', '3');
  await expect(page.locator('#fx-canvas')).toHaveAttribute('data-combo-fx-bursts', String(tierThreeProfile.burstCount));
  await expect(page.locator('#fx-canvas')).toHaveAttribute('data-combo-fx-particles', String(tierThreeProfile.particleCount));
  expect(tierThreeProfile.burstCount).toBe(2);
  expect(tierThreeProfile.particleCount).toBe(32);

  // 意図的な空振りは現在コンボと一過性の花火を即座に解除する。
  const emptyPoint = await page.locator('#stage').evaluate((stage) => {
    const rect = stage.getBoundingClientRect();
    const point = { x: rect.left + 8, y: rect.top + rect.height / 2 };
    const target = document.elementFromPoint(point.x, point.y);
    return { ...point, isHole: !!(target && target.closest('.hh-hole')) };
  });
  expect(emptyPoint.isHole).toBe(false);
  await page.mouse.click(emptyPoint.x, emptyPoint.y);
  await expect(page.locator('#combo-count')).toHaveText('0');
  await expect(page.locator('#combo-hud')).not.toHaveClass(/is-visible/);
  await expect(page.locator('#combo-hud')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#combo-hud')).toHaveAttribute('data-tier', '0');
  await expect(page.locator('#fx-canvas')).toHaveAttribute('data-combo-fx-tier', '0');
  await expect(page.locator('#fx-canvas')).toHaveAttribute('data-combo-fx-particles', '0');
  await expect(page.locator('#combo-status-sr')).toHaveText('コンボ おしまい');

  // 現在コンボを解除しても、今回の最大10コンボは端末記録3を更新する。
  await page.clock.runFor(34_000);
  await expect(page.locator('#result-overlay')).toHaveClass(/show/);
  await expect(page.locator('#result-combo')).toHaveText('さいだい 10コンボ');
  await expect(page.locator('#result-best-combo')).toHaveText('きろく 10コンボ');
  await expect(page.locator('#result-combo-new')).not.toHaveClass(/hidden/);
  await expect(page.locator('#result-new')).toHaveText('スコア しんきろく！');
  expect(await page.evaluate((key) => window.localStorage.getItem(key), COMBO_RECORD_KEY)).toBe('10');

  expect(bonusResponses).toContain(200);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);

  await page.locator('#retry-btn').click({ force: true });
  await expect(page.locator('#combo-status-sr')).toHaveText('');
  await expect(page.locator('#combo-hud')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#fx-canvas')).toHaveAttribute('data-combo-fx-particles', '0');
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

  // 2回目の成功で大きな中央数字は表示するが、スラムと花火粒子は動かさない。
  const second = await advanceToActionableFriend(page);
  await tapFriendAndReadDelta(page, second);
  await expect(page.locator('#combo-count')).toHaveText('2');
  await expect(page.locator('#combo-hud')).toHaveClass(/is-visible/);
  await expect(page.locator('#combo-hud')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#combo-hud')).toHaveAttribute('data-tier', '1');
  await expect(page.locator('#fx-canvas')).toHaveAttribute('data-combo-fx-tier', '0');
  await expect(page.locator('#fx-canvas')).toHaveAttribute('data-combo-fx-bursts', '0');
  await expect(page.locator('#fx-canvas')).toHaveAttribute('data-combo-fx-particles', '0');

  const reducedCombo = await page.locator('#combo-hud').evaluate((element) => {
    const core = element.querySelector('.combo-core');
    const count = element.querySelector('#combo-count');
    return {
      animationName: core ? getComputedStyle(core).animationName : '',
      countFontSize: count ? Number.parseFloat(getComputedStyle(count).fontSize) : 0,
      pointerEvents: getComputedStyle(element).pointerEvents,
      visible: getComputedStyle(element).visibility,
    };
  });
  expect(reducedCombo.animationName).toBe('none');
  expect(reducedCombo.countFontSize).toBeGreaterThanOrEqual(64);
  expect(reducedCombo.pointerEvents).toBe('none');
  expect(reducedCombo.visible).toBe('visible');
});
