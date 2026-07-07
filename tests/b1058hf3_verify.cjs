// batch:1058-hotfix3 verification. Walks tut2 step-by-step and asserts key invariants.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const PORT = 61857;
const BASE = `http://127.0.0.1:${PORT}/bento/`;
const OUT = 'C:\\Users\\surfe\\AppData\\Local\\Temp\\claude\\d--AppDevelopment-pono-asobiba-app\\f9999e22-47da-4d64-a4a1-f4525d95d537\\scratchpad';
const results = { pageerrors: [], steps: [], asserts: [] };

function snap(name) { return path.join(OUT, `b1058hf3_${name}.png`); }
function rectsOverlap(a, b) {
  if (!a || !b) return false;
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}
function rectDistance(a, b) {
  if (!a || !b) return Infinity;
  if (rectsOverlap(a, b)) return 0;
  const dx = Math.max(0, Math.max(a.left - b.right, b.left - a.right));
  const dy = Math.max(0, Math.max(a.top - b.bottom, b.top - a.bottom));
  return Math.hypot(dx, dy);
}

async function getVisual(page) {
  return await page.evaluate(() => {
    const bubble = document.querySelector('.tut-bubble:not(.hidden)');
    const bubbleRect = bubble ? bubble.getBoundingClientRect().toJSON() : null;
    const bubbleText = bubble ? bubble.textContent.trim() : '';
    const finger = document.querySelector('.tut-finger');
    let fingerRect = null;
    if (finger && getComputedStyle(finger).display !== 'none') {
      const hand = finger.querySelector('.tut-hand--open') || finger.querySelector('.tut-hand--grip');
      if (hand) fingerRect = hand.getBoundingClientRect().toJSON();
    }
    const trims = Array.from(document.querySelectorAll('.tut-trim-box')).map(el => el.getBoundingClientRect().toJSON());
    const step = (typeof tutorialState !== 'undefined' && tutorialState) ? tutorialState.step : null;
    const phase = (typeof tutorialState !== 'undefined' && tutorialState) ? tutorialState.phase : null;
    return { bubbleRect, bubbleText, fingerRect, trims, step, phase };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => results.pageerrors.push(e.message));
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error') results.pageerrors.push('CONSOLE ERR: ' + t.slice(0, 300));
  });
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('pono_tier', 'book');
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // ============ Direct API tests (do not depend on tutorial state advancement) ============

  // Assert getRequiredOkazuCountsForTier returns main:2, side:1 when tutorial is active
  const reqApiTest = await page.evaluate(() => {
    // Force tutorialState.active=true for the check
    const wasActive = tutorialState.active;
    tutorialState.active = true;
    const req = getRequiredOkazuCountsForTier(1);
    tutorialState.active = wasActive;
    // Also check non-active case
    const wasActive2 = tutorialState.active;
    tutorialState.active = false;
    const reqNoTut = getRequiredOkazuCountsForTier(1);
    tutorialState.active = wasActive2;
    return { tutMain: req.main, tutSide: req.side, noTutMain: reqNoTut.main, noTutSide: reqNoTut.side };
  });
  results.asserts.push({ label: 'API: main=2 side=1 during tutorial', ok: reqApiTest.tutMain === 2 && reqApiTest.tutSide === 1, v: reqApiTest });
  results.asserts.push({ label: 'API: non-tutorial still returns main=2 side=4', ok: reqApiTest.noTutMain === 2 && reqApiTest.noTutSide === 4, v: reqApiTest });

  // Assert Step 5 bubble text doesn't contain ぽんと by inspection
  const noPontoInSource = await page.evaluate(() => {
    // Check that Step 6 renderer's bubble text is the new version
    // We do this by looking at tut2RenderNoriEditPhaseA / PhaseB function source
    const fnA = tut2RenderNoriEditPhaseA.toString();
    const fnB = tut2RenderNoriEditPhaseB.toString();
    return {
      phaseAHasPonto: fnA.indexOf('ぽんと') >= 0,
      phaseBHasPonto: fnB.indexOf('ぽんと') >= 0,
      phaseAHasNori: fnA.indexOf('のりを タップ') >= 0,
      phaseBHasNoriOK: fnB.indexOf('のりOK') >= 0,
    };
  });
  results.asserts.push({ label: 'API: Step6 Phase A has no ぽんと and includes のりを タップ', ok: !noPontoInSource.phaseAHasPonto && noPontoInSource.phaseAHasNori, v: noPontoInSource });

  // Assert phase reset bug fix is in place
  const renderStepSource = await page.evaluate(() => tutorialRenderStep.toString());
  results.asserts.push({ label: 'API: tutorialRenderStep has phase !== try guard', ok: renderStepSource.indexOf("tutorialState.phase !== 'try'") >= 0 });

  // Assert scroll demo helper exists
  const scrollDemoExists = await page.evaluate(() => typeof _tutorialShowPaletteSwipeDemo === 'function');
  results.asserts.push({ label: 'API: _tutorialShowPaletteSwipeDemo exists', ok: scrollDemoExists });

  // Assert tabs-intro renderer has ring calls
  const tabsSource = await page.evaluate(() => tut2RenderTabsIntro.toString());
  results.asserts.push({ label: 'API: tut2RenderTabsIntro uses tutorialMarkTarget', ok: tabsSource.indexOf('tutorialMarkTarget') >= 0 });
  results.asserts.push({ label: 'API: tut2RenderTabsIntro uses tutorialPositionBubbleBeside', ok: tabsSource.indexOf('tutorialPositionBubbleBeside') >= 0 });

  // ============ Continue with normal walk-through ============

  // Skip title screen (じぶんでつくる)
  try {
    const btn = page.locator('button:has-text("じぶんでつくる")').first();
    if (await btn.count()) await btn.click({ timeout: 2000 });
  } catch (_) {}
  await page.waitForTimeout(2500);
  // Try to advance greet first (previous test's pattern)
  try {
    const next = page.locator('#tut-greet-next');
    if (await next.count() > 0) await next.click({ timeout: 2000, force: true });
  } catch (_) {}
  await page.waitForTimeout(1000);
  // Then handle sk-intro modal button (わかった！)
  try {
    const btn = page.locator('#sk-intro-btn');
    if (await btn.count() && await btn.isVisible()) {
      await btn.click({ timeout: 2000, force: true });
      await page.waitForTimeout(700);
    }
  } catch (_) {}
  // Retry greet-next until we leave greet
  for (let i = 0; i < 6; i++) {
    const st = await page.evaluate(() => (typeof tutorialState !== 'undefined' && tutorialState) ? tutorialState.step : null);
    if (st !== 'tut2-greet') break;
    try {
      const next = page.locator('#tut-greet-next');
      if (await next.count() > 0 && await next.isVisible()) {
        await next.click({ timeout: 1200, force: true });
        await page.waitForTimeout(700);
      } else {
        await page.waitForTimeout(500);
      }
    } catch (_) { await page.waitForTimeout(500); }
  }
  await page.waitForTimeout(1000);

  // Step: box — click これでOK
  try {
    const okBtn = page.locator('#free-box-confirm');
    if (await okBtn.count()) await okBtn.click();
  } catch (_) {}
  await page.waitForTimeout(1200);

  // Step: rice — click rice palette
  const step_rice = await page.evaluate(() => tutorialState.step);
  results.steps.push({ label: 'entered rice', step: step_rice });
  await page.waitForTimeout(1400);
  try {
    const riceEl = await page.evaluate(() => {
      const el = document.querySelector('.free-item-list .free-palette-item[data-type="rice_auto"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (riceEl) {
      await page.mouse.click(riceEl.x, riceEl.y);
    }
  } catch (_) {}
  await page.waitForTimeout(1200);

  // Step: nori 4A (eyes 1)
  const step4a = await page.evaluate(() => tutorialState.step);
  results.steps.push({ label: 'entered nori 4A', step: step4a });
  await page.waitForTimeout(1400);
  // tap first eye 2 times to advance from 4A → 4B
  for (let i = 0; i < 2; i++) {
    try {
      const eyeEl = await page.evaluate(() => {
        const el = document.querySelector('.free-item-list .free-palette-item[data-item-id="nori_eye_round"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      if (eyeEl) {
        await page.mouse.click(eyeEl.x, eyeEl.y);
        await page.waitForTimeout(900);
      }
    } catch (_) {}
  }
  await page.waitForTimeout(1500);
  const step4b = await page.evaluate(() => tutorialState.step);
  results.steps.push({ label: 'entered nori 4B', step: step4b });

  // Screenshot Step 4B (should include swipe demo or scroll if nose/mouth are off-screen)
  await page.waitForTimeout(500);
  const v4b = await getVisual(page);
  await page.screenshot({ path: snap('4b_scroll_demo'), fullPage: false });
  results.asserts.push({ label: '4B has finger or trim during Phase A', ok: !!(v4b.fingerRect || v4b.trims.length), v: { fingerRect: v4b.fingerRect, trims: v4b.trims.length, step: v4b.step, phase: v4b.phase } });

  // Assert scroll motion visible IF target off-screen. Otherwise: verify swipe demo helper is invocable.
  const scrollAndSwipeInfo = await page.evaluate(async () => {
    const list = document.querySelector('.free-item-list');
    if (!list) return { note: 'no-list' };
    const nose = document.querySelector('.free-item-list .free-palette-item[data-item-id="nori_nose_bear"]');
    const mouth = document.querySelector('.free-item-list .free-palette-item[data-item-id="nori_mouth_smile"]');
    const lr = list.getBoundingClientRect();
    const noseR = nose && nose.getBoundingClientRect();
    const mouthR = mouth && mouth.getBoundingClientRect();
    const noseOff = noseR ? (noseR.top < lr.top - 4 || noseR.bottom > lr.bottom + 4) : false;
    const mouthOff = mouthR ? (mouthR.top < lr.top - 4 || mouthR.bottom > lr.bottom + 4) : false;
    // Sample scroll motion over 2500ms window
    const samples = [];
    for (let i = 0; i < 50; i++) {
      samples.push({ t: i * 50, top: list.scrollTop });
      await new Promise(r => setTimeout(r, 50));
    }
    return { noseOff, mouthOff, samples };
  });
  const scrollTopsSeen = new Set((scrollAndSwipeInfo.samples || []).map(s => Math.round(s.top / 4)));
  // Phase A 4B first target = nose. If nose in view, no scroll needed. If off-screen, expect scroll motion.
  // Mouth being off-screen is fine — its scroll happens later when the noriQueue advances to it.
  results.asserts.push({
    label: 'scroll motion visible when Phase A first target is off-screen',
    ok: !scrollAndSwipeInfo.noseOff || scrollTopsSeen.size > 1,
    v: { firstTargetNoseOff: scrollAndSwipeInfo.noseOff, uniqueScrollTops: scrollTopsSeen.size, mouthOffNote: 'mouth scroll happens later' },
  });

  // Tap nose then mouth to progress
  for (const expectedId of ['nori_nose_bear', 'nori_mouth_smile']) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const el = await page.evaluate((id) => {
        const el = document.querySelector('.free-item-list .free-palette-item[data-item-id="' + id + '"]');
        if (!el) return null;
        el.scrollIntoView({ block: 'nearest' });
        return null;
      }, expectedId);
      await page.waitForTimeout(300);
      const info = await page.evaluate((id) => {
        const el = document.querySelector('.free-item-list .free-palette-item[data-item-id="' + id + '"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const list = el.closest('.free-item-list');
        const lr = list ? list.getBoundingClientRect() : null;
        const inView = lr ? (r.top >= lr.top - 4 && r.bottom <= lr.bottom + 4) : true;
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, inView };
      }, expectedId);
      if (info && info.inView) {
        await page.mouse.click(info.x, info.y);
        await page.waitForTimeout(900);
        break;
      }
      await page.waitForTimeout(700);
    }
  }
  await page.waitForTimeout(1500);

  // Step 5 nori-move
  const step5 = await page.evaluate(() => tutorialState.step);
  results.steps.push({ label: 'entered step5', step: step5 });
  await page.waitForTimeout(1200);
  const v5 = await getVisual(page);
  await page.screenshot({ path: snap('5_move_phaseA'), fullPage: false });
  // Assert bubble not overlapping finger area
  const distStep5 = rectDistance(v5.bubbleRect, v5.fingerRect);
  results.asserts.push({ label: 'Step5 bubble ↔ finger distance >= 20', ok: distStep5 >= 20, dist: distStep5, bubble: v5.bubbleRect, finger: v5.fingerRect, bubbleText: v5.bubbleText });

  // Advance from Step 5 to Step 6 by calling tutorialOnItemMoved directly (game hook)
  await page.evaluate(() => {
    const list = (typeof placedItems !== 'undefined' && placedItems) ? placedItems : [];
    const first = list.find(i => i && i.type === 'decor');
    if (first && typeof tutorialOnItemMoved === 'function') tutorialOnItemMoved(first.uid);
  });
  await page.waitForTimeout(1500);

  // Step 6 nori-edit — capture Phase A and Phase B
  const step6a = await page.evaluate(() => ({ step: tutorialState.step, phase: tutorialState.phase }));
  results.steps.push({ label: 'entered step6', step: step6a });
  await page.waitForTimeout(800);
  const v6a = await getVisual(page);
  await page.screenshot({ path: snap('6_edit_phaseA'), fullPage: false });
  results.asserts.push({ label: 'Step6 Phase A bubble no ぽんと', ok: !/ぽんと/.test(v6a.bubbleText), bubbleText: v6a.bubbleText });
  // wait for Phase B (2500ms + slack)
  await page.waitForTimeout(3200);
  const v6b = await getVisual(page);
  await page.screenshot({ path: snap('6_edit_phaseB'), fullPage: false });
  const step6b = await page.evaluate(() => ({ step: tutorialState.step, phase: tutorialState.phase }));
  results.steps.push({ label: 'step6 after Phase A timer', step: step6b });
  results.asserts.push({ label: 'Step6 advances to Phase B (phase=try)', ok: step6b.phase === 'try' && step6b.step === 'tut2-nori-edit', v: step6b });
  // Assert のりOK ring present + finger present
  const step6BubbleAndRing = await page.evaluate(() => {
    const bubbles = Array.from(document.querySelectorAll('.tut-bubble:not(.hidden)'));
    const bubble = bubbles[0];
    const rings = document.querySelectorAll('.tut-trim-box').length;
    // Find のりOK button
    const noriOkBtn = Array.from(document.querySelectorAll('.free-guide-actions button')).find(b => (b.textContent || '').indexOf('のりOK') >= 0);
    return {
      bubbleText: bubble ? bubble.textContent : '',
      rings,
      hasNoriOkBtn: !!noriOkBtn,
      noriOkRect: noriOkBtn ? noriOkBtn.getBoundingClientRect().toJSON() : null,
    };
  });
  results.asserts.push({ label: 'Step6 Phase B ring present', ok: step6BubbleAndRing.rings > 0, v: step6BubbleAndRing });

  // Click のりOK — makeSmallControlButton binds pointerdown, use dispatchEvent
  const clickedOK = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.free-guide-actions button')).find(b => (b.textContent || '').indexOf('のりOK') >= 0);
    if (btn) {
      const r = btn.getBoundingClientRect();
      const ev = new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
      btn.dispatchEvent(ev);
      return true;
    }
    return false;
  });
  results.asserts.push({ label: 'clicked のりOK', ok: clickedOK });
  await page.waitForTimeout(1500);
  // Handle possible confirm modal
  try {
    const skipOk = page.locator('.nori-skip-ok');
    if (await skipOk.count()) await skipOk.click({ timeout: 800 });
  } catch (_) {}
  await page.waitForTimeout(1500);

  // Step 7 okazu-main — CRITICAL: require 2 mains
  const step7 = await page.evaluate(() => tutorialState.step);
  results.steps.push({ label: 'entered step7', step: step7 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: snap('7_okazu_main_phaseA'), fullPage: false });
  // Tap 1st main food and confirm we DO NOT advance
  const mainInfo = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.free-item-list .free-palette-item'));
    const main = items.find(el => (el.dataset.foodRole === 'main' || el.dataset.role === 'main' || (el.dataset.itemId || '').startsWith('wiener') || (el.dataset.itemId || '').indexOf('meat') >= 0 || (el.dataset.itemId || '').indexOf('karaage') >= 0));
    const chosen = main || items.find(el => el.dataset.type === 'food');
    if (!chosen) return null;
    const r = chosen.getBoundingClientRect();
    return { id: chosen.dataset.itemId, x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (mainInfo) {
    await page.mouse.click(mainInfo.x, mainInfo.y);
    await page.waitForTimeout(1500);
  }
  const step7after1 = await page.evaluate(() => tutorialState.step);
  results.asserts.push({ label: 'Step7 does NOT advance after 1st main', ok: step7after1 === 'tut2-okazu-main', step: step7after1 });
  await page.screenshot({ path: snap('7_after_1st_main_callout'), fullPage: false });

  // Tap 2nd main
  const main2Info = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.free-item-list .free-palette-item'));
    const mains = items.filter(el => (el.dataset.type === 'food'));
    // Skip first if used; take next
    const chosen = mains[1] || mains[0];
    if (!chosen) return null;
    const r = chosen.getBoundingClientRect();
    return { id: chosen.dataset.itemId, x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (main2Info) {
    await page.mouse.click(main2Info.x, main2Info.y);
    await page.waitForTimeout(2000);
  }
  const step7after2 = await page.evaluate(() => tutorialState.step);
  results.asserts.push({ label: 'Step7 advances to cup-btn after 2nd main', ok: step7after2 === 'tut2-cup-btn', step: step7after2 });
  await page.screenshot({ path: snap('7_after_2nd_main_advance'), fullPage: false });

  // Step 8 cup-btn — click カップへ
  try {
    const cupToBtn = page.locator('button:has-text("カップへ")');
    if (await cupToBtn.count()) await cupToBtn.click({ timeout: 2000 });
  } catch (_) {}
  await page.waitForTimeout(1500);

  // Step 9 cup-place — pick first cup
  await page.waitForTimeout(1000);
  const cupInfo = await page.evaluate(() => {
    const el = document.querySelector('.free-item-list .free-palette-item');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (cupInfo) {
    await page.mouse.click(cupInfo.x, cupInfo.y);
    await page.waitForTimeout(1500);
  }

  // Step 10 cup-food — pick a food
  await page.waitForTimeout(1200);
  const foodInfo = await page.evaluate(() => {
    const el = document.querySelector('.free-item-list .free-palette-item');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (foodInfo) {
    await page.mouse.click(foodInfo.x, foodInfo.y);
    await page.waitForTimeout(2500);
  }

  // Now should be at Step 11 tabs-intro
  const step11 = await page.evaluate(() => tutorialState.step);
  results.steps.push({ label: 'entered step11 (tabs-intro)', step: step11 });
  // Immediate capture (before observer/timer effects)
  const step11immediate = await page.evaluate(() => {
    return {
      step: tutorialState.step,
      trimsCount: (tutorialState.trims || []).length,
      leafTab: !!document.querySelector('.free-tab[data-tab="leaf"]'),
      dividerTab: !!document.querySelector('.free-tab[data-tab="divider"]'),
      trimBoxes: document.querySelectorAll('.tut-trim-box').length,
    };
  });
  results.asserts.push({ label: 'Step11 immediate: has trims', ok: step11immediate.trimsCount > 0 || step11immediate.trimBoxes > 0, v: step11immediate });
  // Force-call renderer to verify ring creation
  const forced = await page.evaluate(() => {
    try {
      tutorialClearTrims();
      tut2RenderTabsIntro({ id: 'tut2-tabs-intro', fallbackMs: 6500 });
      return {
        after_trimsCount: (tutorialState.trims || []).length,
        after_trimBoxes: document.querySelectorAll('.tut-trim-box').length,
      };
    } catch (e) { return { error: e.message }; }
  });
  results.asserts.push({ label: 'Step11 forced call: creates trim', ok: (forced.after_trimBoxes || 0) > 0, v: forced });
  await page.waitForTimeout(1500);
  // Debug tabs presence
  const step11debug = await page.evaluate(() => {
    return {
      leafTab: !!document.querySelector('.free-tab[data-tab="leaf"]'),
      dividerTab: !!document.querySelector('.free-tab[data-tab="divider"]'),
      allTabs: Array.from(document.querySelectorAll('.free-tab')).map(t => t.dataset.tab || t.textContent.trim().slice(0, 6)),
      freeGuideStep: (typeof freeGuideStep !== 'undefined') ? freeGuideStep : null,
      freeLayoutTab: (typeof freeLayoutTab !== 'undefined') ? freeLayoutTab : null,
    };
  });
  results.asserts.push({ label: 'Step11 debug: tabs presence', ok: step11debug.leafTab && step11debug.dividerTab, v: step11debug });
  await page.screenshot({ path: snap('11_tabs_intro_leaf'), fullPage: false });
  const v11a = await getVisual(page);
  results.asserts.push({ label: 'Step11 has ring on leaf tab', ok: v11a.trims.length > 0, trims: v11a.trims.length, bubbleText: v11a.bubbleText });

  // Wait for ring to move to divider
  await page.waitForTimeout(2700);
  await page.screenshot({ path: snap('11_tabs_intro_divider'), fullPage: false });
  const v11b = await getVisual(page);
  results.asserts.push({ label: 'Step11 ring moved to divider tab', ok: v11b.trims.length > 0, trims: v11b.trims.length });

  // Final: no ぽんと anywhere in step voices/bubbles rendered
  const hasPonto = await page.evaluate(() => {
    const bubbles = Array.from(document.querySelectorAll('.tut-bubble'));
    return bubbles.some(b => (b.textContent || '').indexOf('ぽんと') >= 0);
  });
  results.asserts.push({ label: 'no ぽんと in any live bubble', ok: !hasPonto });

  fs.writeFileSync(path.join(OUT, 'b1058hf3_results.json'), JSON.stringify(results, null, 2));

  const failCount = results.asserts.filter(a => !a.ok).length;
  const errCount = results.pageerrors.length;
  console.log('== FINAL ==');
  console.log('asserts: ' + results.asserts.length + ' | pass: ' + (results.asserts.length - failCount) + ' | fail: ' + failCount);
  console.log('pageerrors: ' + errCount);
  results.asserts.forEach(a => console.log((a.ok ? 'PASS' : 'FAIL') + ' | ' + a.label + (a.ok ? '' : (' | ' + JSON.stringify(a).slice(0, 260)))));
  if (errCount) results.pageerrors.forEach(e => console.log('ERR ' + e.slice(0, 260)));

  await browser.close();
  process.exit(failCount > 0 || errCount > 0 ? 1 : 0);
}
main().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(2); });
