const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const logs = [];
  page.on('console', (msg) => logs.push('[console:' + msg.type() + '] ' + msg.text()));
  page.on('pageerror', (err) => logs.push('[pageerror] ' + err.message));

  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
  });

  await page.goto('http://localhost:8934/play.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const setupResult = await page.evaluate(() => {
    const out = {};
    out.isApp = !!(window.PonoTier && window.PonoTier.isApp && window.PonoTier.isApp());
    out.hasStampRally = !!window.PonoStampRally;
    out.hasGrantFn = !!(window.PonoStampRally && typeof window.PonoStampRally.grantDailyQuestBonusStamp === 'function');
    out.hasDailyQuest = !!window.PonoDailyQuest;
    out.hasTreasure = !!(window.showTreasure);
    out.rewardsBlocked = !!(window.PonoMvpFlags && window.PonoMvpFlags.rewardsBlocked && window.PonoMvpFlags.rewardsBlocked());
    out.stampRallySectionExists = !!document.getElementById('stampRallySection');
    return out;
  });
  console.log('SETUP:', JSON.stringify(setupResult, null, 2));

  // Instrument showTreasure + checkSlotReward + grantDailyQuestBonusStamp to record calls
  await page.evaluate(() => {
    window.__calls = { showTreasure: 0, grantDailyQuestBonusStamp: 0, checkSlotReward: 0 };
    if (window.showTreasure) {
      const orig = window.showTreasure;
      window.showTreasure = function (...args) {
        window.__calls.showTreasure++;
        return orig.apply(this, args);
      };
    }
    if (window.PonoStampRally && window.PonoStampRally.grantDailyQuestBonusStamp) {
      const orig = window.PonoStampRally.grantDailyQuestBonusStamp;
      window.PonoStampRally.grantDailyQuestBonusStamp = function (...args) {
        window.__calls.grantDailyQuestBonusStamp++;
        return orig.apply(this, args);
      };
    }
    if (window.PonoStampRally && window.PonoStampRally.checkSlotReward) {
      const orig = window.PonoStampRally.checkSlotReward;
      window.PonoStampRally.checkSlotReward = function (...args) {
        window.__calls.checkSlotReward++;
        return orig.apply(this, args);
      };
    }
  });

  // Get today's quest id to clear it correctly
  const questInfo = await page.evaluate(() => {
    try {
      const q = window.PonoDailyQuest.getToday();
      return q;
    } catch (e) {
      return { error: String(e) };
    }
  });
  console.log('QUEST TODAY:', JSON.stringify(questInfo));

  // Simulate clearing the quest via markCleared (same path drainPendingStickerGrants uses)
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

  const stampLogAfter = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('pono_stamp_log') || '{}'); } catch (e) { return { error: String(e) }; }
  });
  console.log('STAMP LOG (immediately after dispatch):', JSON.stringify(stampLogAfter));

  await page.waitForTimeout(6000);

  const gachaEntry = await page.evaluate(() => {
    try {
      return { isBonusActive: window.PonoDailyQuest.isBonusActive ? window.PonoDailyQuest.isBonusActive() : null };
    } catch (e) { return { error: String(e) }; }
  });
  console.log('GACHA BONUS STATE:', JSON.stringify(gachaEntry));

  const calls = await page.evaluate(() => window.__calls);
  console.log('CALLS:', JSON.stringify(calls));

  console.log('--- console logs (last 30) ---');
  logs.slice(-30).forEach((l) => console.log(l));

  await browser.close();
})();
