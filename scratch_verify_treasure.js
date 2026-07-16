const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const logs = [];
  page.on('console', (msg) => logs.push('[console:' + msg.type() + '] ' + msg.text()));
  page.on('pageerror', (err) => logs.push('[pageerror] ' + err.message));

  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    // Pre-seed stamp log with 3 past dates so today's login stamp brings total to 4,
    // and the daily-quest bonus stamp then lands exactly on slot 5 (bed reward -> showTreasure).
    localStorage.setItem('pono_stamp_log', JSON.stringify({
      dates: ['2026-07-13', '2026-07-14', '2026-07-15'],
      total: 3
    }));
  });

  await page.addInitScript(() => {
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
    // treasure.js は script tag ロード後に window.showTreasure を定義するので polling で待つ
    var iv = setInterval(function () { install(); }, 20);
    setTimeout(function () { clearInterval(iv); }, 10000);
  });

  await page.goto('http://localhost:8934/play.html', { waitUntil: 'load' });
  // 初回ログインスタンプの showStampBatch アニメーションが完全に終わるまで待つ
  // (busy 中に2つ目の showStampBatch を重ねて起動すると DOM id 衝突で挙動不定になるため、
  //  テスト側で意図的に間隔を空けて実運用の「別画面から戻ってきた時」を模す)
  await page.waitForTimeout(6000);

  const givenBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('pono_stamp_rewards_given') || '[]'));
  console.log('REWARDS GIVEN before quest clear:', JSON.stringify(givenBefore));
  console.log('showTreasure calls so far (during login-stamp flow):', JSON.stringify(await page.evaluate(() => window.__calls)));

  const logBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('pono_stamp_log') || '{}'));
  console.log('STAMP LOG before quest clear (after login-stamp init):', JSON.stringify(logBefore));

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

  await page.waitForTimeout(7000);

  const logAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('pono_stamp_log') || '{}'));
  console.log('STAMP LOG after (total should be 5):', JSON.stringify(logAfter));

  const calls = await page.evaluate(() => window.__calls);
  console.log('showTreasure CALLS:', JSON.stringify(calls));

  const treasureVisible = await page.evaluate(() => {
    // treasure.js likely creates some overlay element; check body innerHTML length / any element with id containing treasure
    var els = document.querySelectorAll('[id*="treasure" i], [class*="treasure" i]');
    return els.length;
  });
  console.log('DOM elements matching "treasure":', treasureVisible);

  console.log('--- console logs (last 20) ---');
  logs.slice(-20).forEach((l) => console.log(l));

  await page.screenshot({ path: '/Users/ndw_mac/AppDevelopment/pono-asobiba-app/scratch_treasure_screenshot.png' });

  await browser.close();
})();
