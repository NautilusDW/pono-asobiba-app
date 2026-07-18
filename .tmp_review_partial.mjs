import { chromium } from 'playwright';
const BASE = 'http://localhost:8934';

(async () => {
  const browser2 = await chromium.launch();
  const page2 = await browser2.newPage();
  await page2.goto(`${BASE}/play.html`, { waitUntil: 'domcontentloaded' });
  const mix = await page2.evaluate(() => {
    const all = window.getAchievements();
    const active = window.getActiveAchievements();
    const archivedOnly = all.filter(a => a.archived);
    const unlocked = {};
    archivedOnly.forEach(a => unlocked[a.id] = true);
    active.slice(0, 5).forEach(a => unlocked[a.id] = true);
    localStorage.setItem('pono_achievements', JSON.stringify(unlocked));
    return { archivedUnlockedCount: archivedOnly.length, activeUnlockedCount: 5, activeTotal: active.length };
  });
  await page2.reload({ waitUntil: 'domcontentloaded' });
  await page2.waitForTimeout(800);
  const result = await page2.evaluate(() => {
    window.PonoStampRally.showAchievementList();
    const box = document.querySelector('.ach-list-ov');
    const m = box.innerText.match(/(\d+)\s*\/\s*(\d+)\s*かいほう/);
    return m ? { done: Number(m[1]), total: Number(m[2]) } : null;
  });
  console.log('=== Extra partial-mix check (expect done=5, total=43) ===');
  console.log('seeded:', mix, ' -> rendered:', result);
  await browser2.close();
})();
