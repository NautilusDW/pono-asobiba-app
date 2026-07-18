// Cross-review verification script for achievements display fix.
// Seeds localStorage with ALL achievement ids (archived + active) marked unlocked,
// then checks 3 screens: stamp-rally board, room/index.html achievements tab,
// collection/index.html stamp list.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8934';

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  // Step 1: load a page that has common/achievements.js to extract full id list + counts.
  await page.goto(`${BASE}/collection/index.html`, { waitUntil: 'domcontentloaded' });
  const info = await page.evaluate(() => {
    const all = window.getAchievements ? window.getAchievements() : [];
    const active = window.getActiveAchievements ? window.getActiveAchievements() : [];
    return {
      allCount: all.length,
      activeCount: active.length,
      allIds: all.map(a => a.id),
      archivedGames: [...new Set(all.filter(a => a.archived).map(a => a.game))],
      activeGames: [...new Set(active.map(a => a.game))],
    };
  });
  const onlyArchivedGames = info.archivedGames.filter(g => !info.activeGames.includes(g));
  console.log('=== achievements.js info ===');
  console.log('total:', info.allCount, 'active:', info.activeCount);
  console.log('games that are 100% archived (should never appear in UI):', onlyArchivedGames);

  const seedScript = (ids) => {
    const unlocked = {};
    ids.forEach(id => { unlocked[id] = true; });
    localStorage.setItem('pono_achievements', JSON.stringify(unlocked));
  };

  // ---------- Screen A: stamp-rally.js board (via play.html) ----------
  await page.goto(`${BASE}/play.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(seedScript, info.allIds);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const stampResult = await page.evaluate(() => {
    if (window.PonoStampRally && typeof window.PonoStampRally.showAchievementList === 'function') {
      window.PonoStampRally.showAchievementList();
      return 'ok';
    }
    return 'MISSING window.PonoStampRally.showAchievementList';
  });
  await page.waitForTimeout(300);
  const stampData = await page.evaluate(() => {
    const box = document.querySelector('.ach-list-ov');
    if (!box) return null;
    const countText = box.querySelector('div div')?.parentElement?.innerText || box.innerText.slice(0, 200);
    return countText;
  });
  console.log('\n=== Screen A: stamp-rally showAchievementList() ===');
  console.log('invoke result:', stampResult);
  console.log('count line snippet:', JSON.stringify(stampData));

  // ---------- Screen B: room/index.html じっせきタブ ----------
  await page.goto(`${BASE}/room/index.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(seedScript, info.allIds);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const roomResult = await page.evaluate(() => {
    if (typeof renderTakaraAchievements === 'function') {
      renderTakaraAchievements();
      return 'ok';
    }
    return 'MISSING renderTakaraAchievements';
  });
  await page.waitForTimeout(300);
  const roomData = await page.evaluate(() => {
    const container = document.getElementById('takara-achievements');
    if (!container) return null;
    return {
      countLine: (container.innerText.match(/たっせい[\s\S]{0,30}/) || [null])[0],
      hasWordmatch: /ことばあわせ|wordmatch/i.test(container.innerHTML),
      hasBowling: /ボウリング/i.test(container.innerHTML),
      hasBreakout: /ブロックくずし|ブロック\d+だんめ|ブロックマスター/i.test(container.innerHTML),
      hasSlide: /みちつなぎ/i.test(container.innerHTML),
      hasFossil: /かせき/i.test(container.innerHTML),
      fullTextSnippet: container.innerText.slice(0, 200),
    };
  });
  console.log('\n=== Screen B: room/index.html renderTakaraAchievements() ===');
  console.log('invoke result:', roomResult);
  console.log(JSON.stringify(roomData, null, 2));

  // ---------- Screen C: collection/index.html ずかん stamp list ----------
  await page.goto(`${BASE}/collection/index.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(seedScript, info.allIds);
  await page.reload({ waitUntil: 'domcontentloaded' }); // IIFE runs at load time, must reload after seeding
  await page.waitForTimeout(800);
  const collResult = 'IIFE runs automatically on (re)load';
  const collData = await page.evaluate(() => {
    const list = document.getElementById('stamp-list');
    if (!list) return { error: 'no #stamp-list element found on this page/state' };
    return {
      childCount: list.children.length,
      hasWordmatch: /ことばあわせ|wordmatch/i.test(list.innerHTML),
      hasBowling: /ボウリング/i.test(list.innerHTML),
      hasBreakout: /ブロックくずし|ブロック\d+だんめ|ブロックマスター/i.test(list.innerHTML),
      hasSlide: /みちつなぎ/i.test(list.innerHTML),
      hasFossil: /かせき/i.test(list.innerHTML),
      snippet: list.innerText.slice(0, 200),
    };
  });
  console.log('\n=== Screen C: collection/index.html stamp list ===');
  console.log('invoke result:', collResult);
  console.log(JSON.stringify(collData, null, 2));

  await browser.close();
};

run().catch(e => { console.error(e); process.exit(1); });
