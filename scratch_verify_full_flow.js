const { chromium } = require('playwright');

async function clickWhenReady(page, selector, timeout) {
  try {
    await page.waitForSelector(selector, { timeout: timeout || 8000 });
    // ボタンに無限pulseアニメーションが付いているため Playwright の
    // actionability(stability)チェックが永久にfailする。DOM click()で直接発火する。
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.click();
    }, selector);
    return true;
  } catch (e) {
    console.log('clickWhenReady error for', selector, ':', e.message);
    return false;
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));

  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    // assets/data/rewards.json の実データでは reward slot は 1/8/15/... (ハードコードfallbackの1/5/10/15とは異なる)。
    // 6 past logins + today's login (auto) => total 7 before bonus; bonus push => total 8 => slot8 (bed) reward
    localStorage.setItem('pono_stamp_log', JSON.stringify({
      dates: ['2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13'],
      total: 6
    }));
    window.__calls = { showTreasure: 0, showTreasureNames: [] };
    var install = function () {
      if (window.showTreasure && !window.showTreasure.__wrapped) {
        var orig = window.showTreasure;
        var wrapped = function (...args) {
          window.__calls.showTreasure++;
          try { window.__calls.showTreasureNames.push(args[0] && args[0].name); } catch (e) {}
          return orig.apply(this, args);
        };
        wrapped.__wrapped = true;
        window.showTreasure = wrapped;
      }
    };
    var iv = setInterval(function () { install(); }, 20);
    setTimeout(function () { clearInterval(iv); }, 15000);
  });

  await page.goto('http://localhost:8934/play.html', { waitUntil: 'load' });

  // ── 1. ログインスタンプ演出 (page load 時に自動発火) を最後まで進める ──
  console.log('--- Waiting for login stamp celebration modal (phase1: うけとる！) ---');
  const clicked1a = await clickWhenReady(page, '#stamp-b-btn', 8000);
  console.log('Clicked "うけとる！" button:', clicked1a);
  console.log('--- Waiting for phase3 (やったー！) ---');
  const clicked1 = await clickWhenReady(page, '#stamp-b-close', 8000);
  console.log('Clicked login-stamp "やったー！" button:', clicked1);
  await page.waitForTimeout(1000);

  const stateAfterLogin = await page.evaluate(() => ({
    given: JSON.parse(localStorage.getItem('pono_stamp_rewards_given') || '[]'),
    log: JSON.parse(localStorage.getItem('pono_stamp_log') || '{}'),
    calls: window.__calls,
  }));
  console.log('State after login-stamp flow (total=4, slot1 reward expected):', JSON.stringify(stateAfterLogin));

  // ── 2. お題クリア (PonoDailyQuestCleared) を発火 → grantDailyQuestBonusStamp 配線を検証 ──
  const questInfo = await page.evaluate(() => window.PonoDailyQuest.getToday());
  console.log('QUEST TODAY:', JSON.stringify(questInfo));

  const clearResult = await page.evaluate((questId) => {
    const result = window.PonoDailyQuest.markCleared(questId);
    if (result && result.wasMatch && !result.alreadyCleared) {
      window.dispatchEvent(new CustomEvent('PonoDailyQuestCleared', {
        detail: { questId: questId, date: result.state && result.state.date }
      }));
    }
    return result;
  }, questInfo.questId);
  console.log('CLEAR RESULT:', JSON.stringify(clearResult));

  const gachaBonus = await page.evaluate(() => window.PonoDailyQuest.isBonusActive());
  console.log('GACHA isBonusActive:', gachaBonus);

  console.log('--- Waiting for bonus-stamp celebration modal (phase1: うけとる！) ---');
  const clicked2a = await clickWhenReady(page, '#stamp-b-btn', 8000);
  console.log('Clicked "うけとる！" button:', clicked2a);
  console.log('--- Waiting for phase3 (やったー！) ---');
  const clicked2 = await clickWhenReady(page, '#stamp-b-close', 8000);
  console.log('Clicked bonus-stamp "やったー！" button:', clicked2);
  await page.waitForTimeout(1000);

  const finalState = await page.evaluate(() => ({
    given: JSON.parse(localStorage.getItem('pono_stamp_rewards_given') || '[]'),
    log: JSON.parse(localStorage.getItem('pono_stamp_log') || '{}'),
    calls: window.__calls,
  }));
  console.log('FINAL STATE (total=5, slot5 bed reward + showTreasure expected):', JSON.stringify(finalState));

  // idempotency check: dispatch again, should be no-op (alreadyCleared)
  const secondClear = await page.evaluate((questId) => window.PonoDailyQuest.markCleared(questId), questInfo.questId);
  console.log('SECOND markCleared (idempotency check, expect alreadyCleared:true):', JSON.stringify(secondClear));

  await browser.close();
})();
