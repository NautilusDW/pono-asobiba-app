import { chromium } from 'playwright';

const BASE = 'http://localhost:8934';

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  // Force app tier so rewardsBlocked() returns false (mvp-flags.js checks window.__APP_BUILD__ via PonoTier.isApp()).
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });

  await page.goto(`${BASE}/play.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200); // let _loadRewardsJSON fetch resolve

  // ---------- 1. Slot rewards 1/8/15 ----------
  const slotInfo = await page.evaluate(() => {
    const out = {};
    [1, 5, 8, 10, 15, 20].forEach(n => {
      out[n] = window.PonoStampRally.getSlotRewardInfo(n);
    });
    return out;
  });
  console.log('=== Slot rewards (1,5,8,10,15,20) ===');
  console.log(JSON.stringify(slotInfo, null, 2));

  // ---------- 2. Card complete rewards rotation (1..6, should cycle every 5) ----------
  const cardRewards = await page.evaluate(() => {
    const out = [];
    for (let i = 1; i <= 6; i++) out.push({ card: i, reward: window.PonoStampRally.getCompleteReward(i) });
    return out;
  });
  console.log('\n=== Card complete rewards (card 1..6, should repeat at 6==1) ===');
  cardRewards.forEach(r => console.log(r.card, '->', r.reward && r.reward.name, '(id=' + (r.reward && r.reward.id) + ')'));

  // ---------- 3a. History WITHOUT snapshot (legacy fallback path) ----------
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('pono_stamp_rewards_given', JSON.stringify(['card_1']));
    // deliberately no pono_stamp_rewards_detail
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const noSnapshotResult = await page.evaluate(() => {
    window.PonoStampRally.showRewardHistory();
    const box = document.querySelector('.reward-history-ov');
    return box ? box.innerText : null;
  });
  console.log('\n=== 3a. showRewardHistory() WITHOUT detail snapshot (should recompute via getCompleteReward(1)) ===');
  console.log(noSnapshotResult);

  // ---------- 3b. History WITH a snapshot that intentionally diverges from current array ----------
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('pono_stamp_rewards_given', JSON.stringify(['card_1']));
    localStorage.setItem('pono_stamp_rewards_detail', JSON.stringify({
      card_1: { icon: '🧪', name: 'テストスナップショットアイテム', type: 'wall', id: 'test_snapshot_id', img: '', afterMsg: '' }
    }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const snapshotResult = await page.evaluate(() => {
    window.PonoStampRally.showRewardHistory();
    const box = document.querySelector('.reward-history-ov');
    return box ? box.innerText : null;
  });
  console.log('\n=== 3b. showRewardHistory() WITH detail snapshot (should show "テストスナップショットアイテム", NOT current card_1 array item) ===');
  console.log(snapshotResult);

  // ---------- 4. Simulate actual completion flow end-to-end: does checkSlotReward() write the snapshot? ----------
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const liveGrant = await page.evaluate(() => {
    // Stub grantReward/showTreasure so checkSlotReward doesn't throw on missing UI deps.
    window.grantReward = function() {};
    window.showTreasure = function(opts) { if (opts && opts.onClose) opts.onClose(); };
    // Simulate total=15 (card 1 just completed).
    window.PonoStampRally.checkSlotReward(15);
    return {
      given: JSON.parse(localStorage.getItem('pono_stamp_rewards_given') || '[]'),
      detail: JSON.parse(localStorage.getItem('pono_stamp_rewards_detail') || '{}')
    };
  });
  console.log('\n=== 4. checkSlotReward(15) live run: given[] + detail{} snapshot written? ===');
  console.log(JSON.stringify(liveGrant, null, 2));

  await browser.close();
};

run().catch(e => { console.error(e); process.exit(1); });
