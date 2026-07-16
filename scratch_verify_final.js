const { chromium } = require('playwright');

async function clickDom(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) { el.click(); return true; }
    return false;
  }, selector);
}

async function waitFor(page, fn, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await page.evaluate(fn)) return true;
    await page.waitForTimeout(100);
  }
  return false;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));

  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    // 6 past logins + today's auto login => total 7 before bonus; bonus push => total 8 => slot8 (bed, real rewards.json) reward
    localStorage.setItem('pono_stamp_log', JSON.stringify({
      dates: ['2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13'],
      total: 6
    }));
    window.__showTreasureCalls = [];
    var install = function () {
      if (window.showTreasure && !window.showTreasure.__wrapped) {
        var orig = window.showTreasure;
        var wrapped = function (...args) {
          window.__showTreasureCalls.push((args[0] && args[0].name) || null);
          return orig.apply(this, args);
        };
        wrapped.__wrapped = true;
        window.showTreasure = wrapped;
      }
    };
    var iv = setInterval(install, 20);
    setTimeout(function () { clearInterval(iv); }, 20000);
  });

  await page.goto('http://localhost:8934/play.html', { waitUntil: 'load' });

  console.log('=== Phase A: 起動時ログインスタンプ演出を最後まで進める (total 6→7, slot reward無し) ===');
  await waitFor(page, () => !!document.getElementById('stamp-b-btn'), 8000);
  await clickDom(page, '#stamp-b-btn');
  await waitFor(page, () => !!document.getElementById('stamp-b-close'), 8000);
  await clickDom(page, '#stamp-b-close');
  await waitFor(page, () => !document.getElementById('stamp-b-card'), 5000);
  console.log('ログインスタンプ演出モーダル 消滅確認:', await page.evaluate(() => !document.getElementById('stamp-b-card')));

  const afterLogin = await page.evaluate(() => ({
    given: JSON.parse(localStorage.getItem('pono_stamp_rewards_given') || '[]'),
    log: JSON.parse(localStorage.getItem('pono_stamp_log') || '{}'),
    showTreasureCalls: window.__showTreasureCalls,
  }));
  console.log('Phase A 結果:', JSON.stringify(afterLogin));

  console.log('\n=== Phase B: PonoDailyQuestCleared 発火 → grantDailyQuestBonusStamp 配線検証 ===');
  const questInfo = await page.evaluate(() => window.PonoDailyQuest.getToday());
  console.log('本日のお題:', JSON.stringify(questInfo));

  const clearResult = await page.evaluate((questId) => {
    const result = window.PonoDailyQuest.markCleared(questId);
    if (result && result.wasMatch && !result.alreadyCleared) {
      window.dispatchEvent(new CustomEvent('PonoDailyQuestCleared', {
        detail: { questId: questId, date: result.state && result.state.date }
      }));
    }
    return result;
  }, questInfo.questId);
  console.log('markCleared 結果:', JSON.stringify(clearResult));

  const gachaBonusActive = await page.evaluate(() => window.PonoDailyQuest.isBonusActive());
  console.log('ガチャボーナス isBonusActive():', gachaBonusActive);

  console.log('\n=== Phase C: ボーナススタンプ演出を最後まで進める (total 7→8, slot8=ベッド報酬) ===');
  await waitFor(page, () => !!document.getElementById('stamp-b-btn'), 8000);
  await clickDom(page, '#stamp-b-btn');
  await waitFor(page, () => !!document.getElementById('stamp-b-close'), 8000);
  await clickDom(page, '#stamp-b-close');
  await waitFor(page, () => !document.getElementById('stamp-b-card'), 5000);

  const finalState = await page.evaluate(() => ({
    given: JSON.parse(localStorage.getItem('pono_stamp_rewards_given') || '[]'),
    log: JSON.parse(localStorage.getItem('pono_stamp_log') || '{}'),
    showTreasureCalls: window.__showTreasureCalls,
    roomCardUnlocked: localStorage.getItem('pono_room_card_open'),
  }));
  console.log('Phase C 結果 (最終):', JSON.stringify(finalState));

  console.log('\n=== Phase D: 冪等性チェック (2回目 markCleared) ===');
  const secondClear = await page.evaluate((questId) => window.PonoDailyQuest.markCleared(questId), questInfo.questId);
  console.log('2回目 markCleared (alreadyCleared:true が期待値):', JSON.stringify(secondClear));

  await browser.close();
})();
