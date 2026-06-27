import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'https://pono-asobiba-app-staging.ndw.workers.dev/bento/';
const OUT = process.argv[2] || 'D:/AppDevelopment/pono-asobiba-app/scratchpad/bento-fouc-result.json';

const result = {
  scenario: 'bento-cold',
  url: URL,
  paintTimings: {},
  imageWaterfall: [],
  cssBackgroundLateLoads: [],
  foucEvidence: {},
  observations: [],
  responses: [],
  inlineStyleSelectors: [],
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    serviceWorkers: 'block',
    viewport: { width: 414, height: 896 },
    bypassCSP: false,
  });
  const page = await context.newPage();

  // Capture every response
  const responses = [];
  const t0 = Date.now();
  page.on('response', async (resp) => {
    try {
      const req = resp.request();
      const timing = req.timing();
      const url = resp.url();
      const headers = resp.headers();
      const ct = headers['content-type'] || '';
      const cl = parseInt(headers['content-length'] || '0', 10);
      const fromCache = resp.fromServiceWorker() === false && (resp.request().resourceType() === 'image' || resp.request().resourceType() === 'stylesheet' || resp.request().resourceType() === 'script')
        ? (headers['cf-cache-status'] === 'HIT' || headers['age'] !== undefined)
        : false;
      responses.push({
        url,
        contentType: ct,
        sizeKB: cl > 0 ? Math.round(cl / 1024 * 10) / 10 : 0,
        startMs: timing ? Math.round(timing.startTime) : Date.now() - t0,
        endMs: timing ? Math.round(timing.responseEnd) : Date.now() - t0,
        cacheHit: !!fromCache,
        resourceType: req.resourceType(),
        status: resp.status(),
      });
    } catch (e) { /* ignore */ }
  });

  const navStart = Date.now();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const domLoaded = Date.now() - navStart;

  // Immediate sampling after DCL: 100 samples at ~16ms
  const samples = await page.evaluate(async () => {
    const samples = [];
    const selectors = ['canvas', '#game', '.game-root', '[data-game-root]', '#app', '#stage', 'main', '.bento-stage', '.lunch-box', '#lunchbox', 'body'];
    const startedAt = performance.now();
    for (let i = 0; i < 100; i++) {
      const t = performance.now() - startedAt;
      const snap = { t, bodyReady: document.body.classList.contains('pono-game-ready'), els: {} };
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const cs = getComputedStyle(el);
          snap.els[sel] = {
            display: cs.display,
            visibility: cs.visibility,
            opacity: cs.opacity,
            exists: true,
            rect: el.getBoundingClientRect ? (() => {
              const r = el.getBoundingClientRect();
              return { w: Math.round(r.width), h: Math.round(r.height) };
            })() : null,
          };
        } else {
          snap.els[sel] = { exists: false };
        }
      }
      samples.push(snap);
      await new Promise((r) => setTimeout(r, 16));
    }
    return samples;
  });

  // Inspect inline styles for FOUC guard selectors
  const inlineStyleInfo = await page.evaluate(() => {
    const styles = Array.from(document.querySelectorAll('style'));
    const guards = [];
    for (const s of styles) {
      const txt = s.textContent || '';
      // Find rules that set visibility:hidden or opacity:0 with selectors
      const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
      let m;
      while ((m = ruleRegex.exec(txt)) !== null) {
        const sel = m[1].trim();
        const body = m[2].trim();
        if (/visibility\s*:\s*hidden/i.test(body) || /opacity\s*:\s*0\b/i.test(body) || /display\s*:\s*none/i.test(body)) {
          // check whether this selector matches anything currently
          let matchCount = 0;
          try {
            // strip pseudo selectors for matching test
            const probe = sel.split(',').map(s => s.trim());
            for (const p of probe) {
              try {
                const cleaned = p.replace(/::?(before|after|first-letter|first-line|placeholder|selection)/g, '');
                if (cleaned && !cleaned.includes(':not(')) {
                  matchCount += document.querySelectorAll(cleaned).length;
                }
              } catch { /* invalid selector */ }
            }
          } catch { /* */ }
          guards.push({ selector: sel.substring(0, 200), declaration: body.substring(0, 200), matchCount });
        }
      }
    }
    return guards;
  });

  // Wait for networkidle and grab paint timings
  try {
    await page.waitForLoadState('networkidle', { timeout: 8000 });
  } catch { /* */ }

  const paintTimings = await page.evaluate(() => {
    const out = {};
    const paints = performance.getEntriesByType('paint');
    for (const p of paints) {
      if (p.name === 'first-paint') out.firstPaintMs = Math.round(p.startTime);
      if (p.name === 'first-contentful-paint') out.fcpMs = Math.round(p.startTime);
    }
    const lcpList = performance.getEntriesByType('largest-contentful-paint');
    if (lcpList.length) out.lcpMs = Math.round(lcpList[lcpList.length - 1].startTime);
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) out.loadEventMs = Math.round(nav.loadEventEnd);
    return out;
  });

  result.paintTimings = paintTimings;
  result.responses = responses;
  result.inlineStyleSelectors = inlineStyleInfo;

  // Determine fouc evidence
  // pick the most plausible gameRoot
  const candidateSelectors = ['canvas', '#game', '.game-root', '[data-game-root]', '#app', '#stage', '.bento-stage', '#lunchbox', '.lunch-box', 'main'];
  let chosen = null;
  for (const sel of candidateSelectors) {
    const s0 = samples[0]?.els?.[sel];
    if (s0 && s0.exists) { chosen = sel; break; }
  }
  if (!chosen) chosen = 'body';

  const initial = samples[0]?.els?.[chosen];
  let becameVisibleAtMs = -1;
  for (const sn of samples) {
    const e = sn.els[chosen];
    if (!e || !e.exists) continue;
    if (e.visibility !== 'hidden' && e.display !== 'none' && parseFloat(e.opacity || '1') > 0.01) {
      becameVisibleAtMs = Math.round(sn.t);
      break;
    }
  }
  let readyClassAddedAtMs = -1;
  for (const sn of samples) {
    if (sn.bodyReady) { readyClassAddedAtMs = Math.round(sn.t); break; }
  }
  // flashDetected: game body visible before pono-game-ready was added (or ready class never appeared but game was visible)
  const flashDetected = (becameVisibleAtMs >= 0) && (readyClassAddedAtMs < 0 || becameVisibleAtMs < readyClassAddedAtMs);

  result.foucEvidence = {
    gameRootSelector: chosen,
    initialVisibility: initial ? `display=${initial.display}; visibility=${initial.visibility}; opacity=${initial.opacity}` : 'not-present',
    becameVisibleAtMs,
    readyClassAddedAtMs,
    flashDetected,
  };

  // imageWaterfall: top 25 image responses
  result.imageWaterfall = responses
    .filter(r => r.resourceType === 'image' || /image\//.test(r.contentType))
    .sort((a, b) => a.startMs - b.startMs)
    .slice(0, 25)
    .map(r => ({ url: r.url, contentType: r.contentType, sizeKB: r.sizeKB, startMs: r.startMs, endMs: r.endMs, cacheHit: !!r.cacheHit }));

  // cssBackgroundLateLoads: CSS background-image URLs that finished after FCP
  const fcp = paintTimings.fcpMs || 0;
  const cssLate = [];
  // crude detection: scan inline styles and stylesheets for background-image: url(...)
  const cssBgUrls = await page.evaluate(() => {
    const urls = new Set();
    const sheets = Array.from(document.styleSheets);
    for (const sh of sheets) {
      let rules;
      try { rules = sh.cssRules; } catch { continue; }
      if (!rules) continue;
      for (const rule of rules) {
        const css = rule.cssText || '';
        const re = /background(?:-image)?\s*:[^;]*url\(["']?([^"')]+)["']?\)/gi;
        let m;
        while ((m = re.exec(css)) !== null) {
          urls.add(m[1]);
        }
      }
    }
    // also inline style attributes
    document.querySelectorAll('[style*="background"]').forEach((el) => {
      const s = el.getAttribute('style') || '';
      const re = /background(?:-image)?\s*:[^;]*url\(["']?([^"')]+)["']?\)/gi;
      let m;
      while ((m = re.exec(s)) !== null) urls.add(m[1]);
    });
    return Array.from(urls);
  });

  for (const u of cssBgUrls) {
    // find response that matches end of url
    const hit = responses.find(r => r.url.includes(u) || u.includes(r.url));
    if (hit && hit.endMs > fcp + 50) {
      cssLate.push(`${u} (endMs=${hit.endMs}, fcp=${fcp})`);
    } else if (!hit) {
      cssLate.push(`${u} (no-response-record - inline only or relative)`);
    }
  }
  result.cssBackgroundLateLoads = cssLate;

  // Observations
  const obs = [];
  obs.push(`DOMContentLoaded at ${domLoaded}ms; FCP=${paintTimings.fcpMs}ms; LCP=${paintTimings.lcpMs}ms`);
  obs.push(`Chosen gameRoot selector: '${chosen}'. Initial state: ${result.foucEvidence.initialVisibility}`);
  obs.push(`gameRoot became visible at +${becameVisibleAtMs}ms after DCL; pono-game-ready class added at +${readyClassAddedAtMs}ms`);
  obs.push(`flashDetected = ${flashDetected}`);

  const guardsForBody = inlineStyleInfo.filter(g => /\bbody\b/i.test(g.selector));
  const guardsHidingGame = inlineStyleInfo.filter(g => /game|canvas|stage|lunchbox|bento/i.test(g.selector));
  obs.push(`Inline <style> guard rules matching body: ${guardsForBody.length}. Hiding-game candidates: ${guardsHidingGame.length}.`);
  for (const g of guardsHidingGame.slice(0, 5)) {
    obs.push(`  guard sel='${g.selector}' decl='${g.declaration}' matches=${g.matchCount}`);
  }
  for (const g of guardsForBody.slice(0, 3)) {
    obs.push(`  body-guard sel='${g.selector}' decl='${g.declaration}' matches=${g.matchCount}`);
  }
  // Inline guard match check
  const anyMatch = inlineStyleInfo.some(g => g.matchCount > 0 && (/visibility\s*:\s*hidden/i.test(g.declaration) || /display\s*:\s*none/i.test(g.declaration) || /opacity\s*:\s*0/i.test(g.declaration)));
  obs.push(`Any inline FOUC-guard selector actually matches current DOM? ${anyMatch}`);

  result.observations = obs;

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log('WROTE', OUT);
  console.log('flashDetected:', flashDetected, 'becameVisibleAt:', becameVisibleAtMs, 'readyAt:', readyClassAddedAtMs);
  console.log('FCP:', paintTimings.fcpMs, 'LCP:', paintTimings.lcpMs);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
