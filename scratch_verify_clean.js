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
    // 今日の日付を含む7件を先に積んでおく => addStampToday() は no-op => ログイン演出モーダルは出ない
    // (dates配列は昇順である必要はない。today文字列と一致する要素があれば addStampToday は何もしない)
    var today = (function () {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    })();
    localStorage.setItem('pono_stamp_log', JSON.stringify({
      dates: ['2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13', today],
      total: 7
    }));
    // pono_stamp_before を total と一致させておく => _initStampRally の「未見スタンプ追いつき演出」
    // (stampsToShow = finalTotal - _beforeGame) が 0 になり、起動時のログイン演出モーダルを完全にスキップできる。
    // これでボーナススタンプ演出だけを単独で検証できる。
    localStorage.setItem('pono_stamp_before', '7');
    window.__showTreasureCalls = [];
    var install = function () {
      if (window.showTreasure && !window.showTreasure.__wrapped) {
        var orig = window.showTreasure;
        var wrapped = function (...args) {
          window.__showTreasureCalls.push({ name: args[0] && args[0].name, hasUI: !!document.querySelector('[id*="treasure" i]') });
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
  await page.waitForTimeout(1500);

  const preState = await page.evaluate(() => ({
    hasLoginModal: !!document.getElementById('stamp-b-card'),
    log: JSON.parse(localStorage.getItem('pono_stamp_log') || '{}'),
    given: JSON.parse(localStorage.getItem('pono_stamp_rewards_given') || '[]'),
    isApp: window.PonoTier.isApp(),
    hasShowTreasure: typeof window.showTreasure,
  }));
  console.log('起動直後の状態 (ログイン演出モーダルは出ないはず):', JSON.stringify(preState));

  console.log('\n=== PonoDailyQuestCleared 発火 ===');
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

  console.log('\n=== ボーナススタンプ演出 (total 7→8, slot8=ベッド報酬) をタップで進める ===');
  const gotBtn = await waitFor(page, () => !!document.getElementById('stamp-b-btn'), 8000);
  console.log('うけとる！ ボタン出現:', gotBtn);
  await clickDom(page, '#stamp-b-btn');
  const gotClose = await waitFor(page, () => !!document.getElementById('stamp-b-close'), 8000);
  console.log('やったー！ ボタン出現:', gotClose);
  await clickDom(page, '#stamp-b-close');
  await page.waitForTimeout(1500);

  const finalState = await page.evaluate(() => ({
    given: JSON.parse(localStorage.getItem('pono_stamp_rewards_given') || '[]'),
    log: JSON.parse(localStorage.getItem('pono_stamp_log') || '{}'),
    showTreasureCalls: window.__showTreasureCalls,
    roomCardUnlocked: localStorage.getItem('pono_room_card_open'),
  }));
  console.log('\n最終状態:', JSON.stringify(finalState, null, 2));

  await browser.close();
})();
