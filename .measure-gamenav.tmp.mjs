// Measure game navigation load times across bento, puzzle, maze
// Starts from play.html (warm SW), then navigates to each game and tracks image load timing.
import { chromium } from 'playwright';

const BASE = 'https://pono-asobiba-app-staging.ndw.workers.dev';
const PLAY = `${BASE}/play.html`;
const GAMES = [
  { name: 'bento',  url: `${BASE}/bento/` },
  { name: 'puzzle', url: `${BASE}/puzzle/` },
  { name: 'maze',   url: `${BASE}/maze/` },
];

const TIMEOUT = 30000;

function nowIso() { return new Date().toISOString(); }

async function collectGame(page, name, url) {
  // Per-game collectors
  const responses = [];
  const reqStarts = new Map(); // url -> requestStart wall ms

  const onRequest = (req) => {
    reqStarts.set(req.url(), Date.now());
  };
  const onResponse = async (resp) => {
    try {
      const req = resp.request();
      const reqUrl = req.url();
      const resourceType = req.resourceType();
      // Track images + fonts + media + other (to be safe); also script for hints
      // But we only report on images per the schema.
      let bodySize = 0;
      try {
        const buf = await resp.body();
        bodySize = buf ? buf.length : 0;
      } catch {}
      const headers = resp.headers();
      const ct = headers['content-type'] || '';
      const cacheStatus = headers['cf-cache-status'] || headers['x-cache'] || '';
      const fromSW = !!resp.fromServiceWorker?.();
      const startedAt = reqStarts.get(reqUrl) ?? Date.now();
      const finishedAt = Date.now();
      responses.push({
        url: reqUrl,
        resourceType,
        contentType: ct,
        status: resp.status(),
        bodySize,
        startedAt,
        finishedAt,
        cacheStatus,
        fromSW,
      });
    } catch (e) {
      // ignore
    }
  };

  page.on('request', onRequest);
  page.on('response', onResponse);

  const navStartWall = Date.now();
  let navErr = null;
  let gotoMs = null;
  const gotoStart = Date.now();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: TIMEOUT });
    gotoMs = Date.now() - gotoStart;
  } catch (e) {
    navErr = `goto: ${e.message}`;
    gotoMs = Date.now() - gotoStart;
  }

  // After load, give it some time for late images to come in. Many games
  // load assets after first paint. Wait for networkidle or up to TIMEOUT.
  try {
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT });
  } catch (e) {
    // ok, may be a game with constant audio etc.
  }

  // Extra buffer for late images
  await page.waitForTimeout(2000);

  // Paint timing & navigation timing relative to this navigation
  const timing = await page.evaluate(() => {
    const paints = performance.getEntriesByType('paint').map(p => ({ name: p.name, startTime: p.startTime }));
    const nav = performance.getEntriesByType('navigation')[0];
    const lcp = (() => {
      const lcps = performance.getEntriesByType('largest-contentful-paint');
      if (!lcps || lcps.length === 0) return null;
      const last = lcps[lcps.length - 1];
      return { startTime: last.startTime, size: last.size, url: last.url || '' };
    })();
    const imgRes = performance.getEntriesByType('resource')
      .filter(r => r.initiatorType === 'img' || /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(r.name))
      .map(r => ({
        name: r.name,
        startTime: r.startTime,
        responseEnd: r.responseEnd,
        duration: r.duration,
        transferSize: r.transferSize,
        encodedBodySize: r.encodedBodySize,
        decodedBodySize: r.decodedBodySize,
      }));
    return { paints, nav: nav ? {
      domContentLoaded: nav.domContentLoadedEventEnd,
      load: nav.loadEventEnd,
      responseEnd: nav.responseEnd,
      domInteractive: nav.domInteractive,
    } : null, lcp, imgRes };
  });

  page.off('request', onRequest);
  page.off('response', onResponse);

  // Build slowest images list using performance API timing
  const images = timing.imgRes
    .map(r => ({
      url: r.name,
      finishedAtMs: Math.round(r.responseEnd),
      durationMs: Math.round(r.duration),
      bytes: r.transferSize || r.encodedBodySize || 0,
    }))
    .sort((a, b) => b.finishedAtMs - a.finishedAtMs);

  // First paint / FCP
  const fp  = timing.paints.find(p => p.name === 'first-paint')?.startTime ?? null;
  const fcp = timing.paints.find(p => p.name === 'first-contentful-paint')?.startTime ?? null;

  // Total bytes transferred (images only, from PerformanceResourceTiming)
  const totalImgBytes = timing.imgRes.reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0);
  const imgCount = timing.imgRes.length;

  // Spread analysis (max - min image responseEnd, indicating staggered late paints)
  const finishedTimes = timing.imgRes.map(r => r.responseEnd).filter(x => x > 0);
  const earliestImg = finishedTimes.length ? Math.min(...finishedTimes) : null;
  const latestImg = finishedTimes.length ? Math.max(...finishedTimes) : null;
  const spreadMs = (earliestImg !== null && latestImg !== null) ? Math.round(latestImg - earliestImg) : null;

  // Count images that loaded > 2000ms after FCP (perceived "popping in")
  let lateImgCount = 0;
  if (fcp !== null) {
    lateImgCount = timing.imgRes.filter(r => r.responseEnd - fcp > 2000).length;
  }

  return {
    name,
    url,
    navErr,
    gotoMs,
    paint: { fp, fcp, lcp: timing.lcp },
    nav: timing.nav,
    images, // sorted desc
    totalImgBytes,
    imgCount,
    spreadMs,
    earliestImg,
    latestImg,
    lateImgCount,
    netResponses: responses.length,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 414, height: 896 }, // iPhone-ish
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Warm-up to play.html, wait for SW active
  const playStart = Date.now();
  try {
    await page.goto(PLAY, { waitUntil: 'load', timeout: TIMEOUT });
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  } catch (e) {
    console.error('play.html load error:', e.message);
  }
  // Wait for SW active
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      return !!(reg && reg.active);
    } catch { return null; }
  }).catch(() => null);
  const playMs = Date.now() - playStart;

  const results = [];
  for (const g of GAMES) {
    const r = await collectGame(page, g.name, g.url);
    results.push(r);
  }

  await browser.close();

  // Build final output
  const startedAtIso = nowIso();
  const all = { startedAtIso, playWarmupMs: playMs, results };
  console.log('===RAW===');
  console.log(JSON.stringify(all, null, 2));
}

main().catch(e => { console.error('fatal:', e); process.exit(1); });
