// Headless verification for batch:1058-hotfix2 bento tut2 fixes.
// Requires: python -m http.server 8000 running in repo root.
// Runs from repo root: node scratchpad/b1058h2_verify.cjs

const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const OUTDIR = 'C:\\Users\\surfe\\AppData\\Local\\Temp\\claude\\d--AppDevelopment-pono-asobiba-app\\f9999e22-47da-4d64-a4a1-f4525d95d537\\scratchpad';
const BASE = 'http://localhost:8000/bento/';

const results = { errors: [], screenshots: [], bubbleRects: [], observations: [] };

function snap(file) { return path.join(OUTDIR, file); }

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  page.on('pageerror', e => results.errors.push('pageerror: ' + e.message));
  page.on('response', r => {
    const u = r.url();
    if (r.status() === 404 && /\.(png|webp|svg|mp3|wav|json)$/.test(u) && u.indexOf('/bento/') >= 0) {
      results.errors.push('404: ' + u);
    }
  });

  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('pono_tier', 'book');
  });

  page.on('console', m => {
    const t = m.text();
    if (t.indexOf('[bento') === 0 || t.indexOf('tut') === 0) results.errors.push('LOG: ' + t.slice(0, 200));
  });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const dbg1 = await page.evaluate(() => ({
    simpleBentoMode: (typeof simpleBentoMode !== 'undefined') ? simpleBentoMode : null,
    tutState: (typeof tutorialState !== 'undefined') ? { active: tutorialState.active, step: tutorialState.step, phase: tutorialState.phase } : null,
    tutPaused: (typeof BENTO_TUTORIAL_PAUSED !== 'undefined') ? BENTO_TUTORIAL_PAUSED : null,
    tutDone: (typeof tutorialReadDone === 'function') ? tutorialReadDone() : null,
    skIntroVisible: !!document.getElementById('sk-intro') && !document.getElementById('sk-intro').classList.contains('hidden'),
    titleVisible: !!document.getElementById('title-screen') && !document.getElementById('title-screen').classList.contains('hidden'),
  }));
  results.observations.push({ step: 'after_load', dbg: dbg1 });

  // Skip title screen: click じぶんでつくる (simple mode)
  try {
    const simpleBtn = page.locator('button:has-text("じぶんでつくる")').first();
    if (await simpleBtn.count() > 0) await simpleBtn.click({ timeout: 2000 });
  } catch (_) {}
  await page.waitForTimeout(2500);

  const dbg2 = await page.evaluate(() => ({
    simpleBentoMode: (typeof simpleBentoMode !== 'undefined') ? simpleBentoMode : null,
    tutState: (typeof tutorialState !== 'undefined') ? { active: tutorialState.active, step: tutorialState.step, phase: tutorialState.phase } : null,
    skIntroVisible: !!document.getElementById('sk-intro') && !document.getElementById('sk-intro').classList.contains('hidden'),
    skIntroBtnPresent: !!document.getElementById('sk-intro-btn'),
    bubbleVisible: !!document.querySelector('.tut-bubble') && !document.querySelector('.tut-bubble').classList.contains('hidden'),
  }));
  results.observations.push({ step: 'after_title_click', dbg: dbg2 });

  // Force-close sk-intro via direct button click if present
  try {
    const btn = page.locator('#sk-intro-btn');
    if (await btn.count() > 0 && await btn.isVisible()) {
      await btn.click({ timeout: 2000, force: true });
      await page.waitForTimeout(600);
    }
  } catch (_) {}

  const captureBubble = async label => {
    const bub = page.locator('#tut-bubble-tutorial').first();
    if (await bub.count() === 0) {
      results.bubbleRects.push({ step: label, rect: null });
      return null;
    }
    const r = await bub.boundingBox().catch(() => null);
    results.bubbleRects.push({ step: label, rect: r });
    return r;
  };

  // Screenshot: initial
  await page.screenshot({ path: snap('b1058h2_00_initial.png') });
  results.screenshots.push('00_initial');
  await captureBubble('initial');

  // Try to advance greet (start tut2)
  try {
    const next = page.locator('#tut-greet-next');
    if (await next.count() > 0) await next.click({ timeout: 2000 });
  } catch (_) {}
  await page.waitForTimeout(1200);

  // Handle sk-intro modal (わかった！ / つぎへ / はじめよう / OK) up to 6 taps
  for (let i = 0; i < 6; i++) {
    const btn = page.locator('button:has-text("わかった"), button:has-text("つぎへ"), button:has-text("はじめよう"), button:has-text("よし"), button:has-text("OK")').first();
    if (await btn.count() === 0) break;
    try { await btn.click({ timeout: 800 }); } catch (_) { break; }
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: snap('b1058h2_01_box.png') });
  await captureBubble('box');
  results.screenshots.push('01_box');

  // Click OK to advance box → rice
  const okBtn = page.locator('#free-box-confirm').first();
  if (await okBtn.count() > 0) {
    try { await okBtn.click({ timeout: 2000 }); } catch (_) {}
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: snap('b1058h2_02_rice_A.png') });
  await captureBubble('rice_A');
  results.screenshots.push('02_rice_A');

  const ghostA = await page.locator('#tut-ghost-layer img').first().getAttribute('src').catch(() => null);
  results.observations.push({ step: 'rice_A', ghostSrc: ghostA });
  const trims_riceA = await page.locator('.tut-trim-box').count();
  results.observations.push({ step: 'rice_A', trimBoxes: trims_riceA });

  // Wait for Phase B
  await page.waitForTimeout(2500);
  await page.screenshot({ path: snap('b1058h2_03_rice_B.png') });
  await captureBubble('rice_B');
  results.screenshots.push('03_rice_B');

  // Verify palette-focus classes on rice tab
  const focusedInRice = await page.locator('.free-palette-item.tut-focus-target').count();
  const dimmedInRice = await page.locator('.free-palette-item.tut-locked').count();
  results.observations.push({ step: 'rice_B', focused: focusedInRice, dimmed: dimmedInRice });

  // Click rice palette to advance → 4A (nori-face-eyes)
  const ricePalette = page.locator('.free-item-list .free-palette-item').first();
  if (await ricePalette.count() > 0) {
    try { await ricePalette.click({ timeout: 2000 }); } catch (_) {}
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: snap('b1058h2_04_4A_A.png') });
  await captureBubble('4A_A');
  results.screenshots.push('04_4A_A');

  // Verify 4A ghost src (should be nori_eye_round.png)
  const ghost4A = await page.locator('#tut-ghost-layer img').first().getAttribute('src').catch(() => null);
  results.observations.push({ step: '4A_A', ghostSrc: ghost4A });

  // Verify palette focus at 4A Phase A: nori_eye_round should be focused, face-sets should be dimmed
  const focused4A_round = await page.locator('.free-palette-item.tut-focus-target[data-item-id="nori_eye_round"]').count();
  const dimmed4A_faceSet = await page.locator('.free-palette-item.tut-locked[data-item-id^="nori_face_set_"]').count();
  const dimmed4A_bookEye = await page.locator('.free-palette-item.tut-locked[data-item-id="nori_eye_sleepy_book"]').count();
  results.observations.push({ step: '4A_A', focused_round: focused4A_round, dimmed_faceSets: dimmed4A_faceSet, dimmed_bookEye: dimmed4A_bookEye });

  // Trim rings
  const trims_4A = await page.locator('.tut-trim-box').count();
  results.observations.push({ step: '4A_A', trimBoxes: trims_4A });

  // Attempt WRONG tap: nori_eye_sleepy_book
  const wrong = page.locator('.free-palette-item[data-item-id="nori_eye_sleepy_book"]').first();
  const decorBefore = await page.locator('#free-layout-stage .free-placed-item.type-decor').count();
  if (await wrong.count() > 0) {
    try { await wrong.click({ timeout: 2000 }); } catch (_) {}
    await page.waitForTimeout(700);
  }
  const decorAfterWrong = await page.locator('#free-layout-stage .free-placed-item.type-decor').count();
  results.observations.push({ step: 'wrong_tap', decorBefore, decorAfterWrong });

  // Wait for Phase B if not already there
  await page.waitForTimeout(1400);
  await page.screenshot({ path: snap('b1058h2_05_4A_B.png') });
  await captureBubble('4A_B');
  results.screenshots.push('05_4A_B');

  // Tap CORRECT: nori_eye_round
  const correct = page.locator('.free-palette-item[data-item-id="nori_eye_round"]').first();
  if (await correct.count() > 0) {
    try { await correct.click({ timeout: 2000 }); } catch (_) {}
  }
  await page.waitForTimeout(1600);
  await page.screenshot({ path: snap('b1058h2_06_after_first_eye.png') });
  await captureBubble('after_first_eye');
  results.screenshots.push('06_after_first_eye');

  const decorAfterCorrect = await page.locator('#free-layout-stage .free-placed-item.type-decor').count();
  results.observations.push({ step: 'after_first_eye', decorPlaced: decorAfterCorrect });

  const placedRect = await page.locator('#free-layout-stage .free-placed-item.type-decor').first().boundingBox().catch(() => null);
  results.observations.push({ step: 'after_first_eye', placedRect });

  await browser.close();
  fs.writeFileSync(snap('b1058h2_verify_report.json'), JSON.stringify(results, null, 2));
  console.log('=== VERIFY REPORT ===');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
