// Cold load measurement for App staging
// Service Workers blocked + HTTP cache disabled to force fresh network for everything
import { chromium } from 'playwright';

const URL_TARGET = 'https://pono-asobiba-app-staging.ndw.workers.dev/play.html';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    serviceWorkers: 'block',
  });

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.clearBrowserCache');
  await cdp.send('Network.clearBrowserCookies');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

  const responses = [];
  const navStartMs = Date.now();

  page.on('response', async (response) => {
    try {
      const req = response.request();
      const url = response.url();
      const status = response.status();
      const headers = response.headers();
      const ct = headers['content-type'] || '';
      const cl = headers['content-length'] || '';
      const timing = response.timing();
      let bodySize = null;
      try {
        const buf = await response.body();
        bodySize = buf.length;
      } catch (_) {
        bodySize = null;
      }
      responses.push({
        url,
        method: req.method(),
        resourceType: req.resourceType(),
        status,
        contentType: ct,
        contentLength: cl ? Number(cl) : null,
        bodySize,
        timing,
        receivedAtMs: Date.now() - navStartMs,
      });
    } catch (e) {}
  });

  const tNav0 = Date.now();
  let gotoError = null;
  try {
    await page.goto(URL_TARGET, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (e) {
    gotoError = String(e.message || e);
  }
  const tNav1 = Date.now();

  let perf = null;
  try {
    perf = await page.evaluate(() => {
      const navEntry = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint').map(p => ({ name: p.name, startTime: p.startTime }));
      const resources = performance.getEntriesByType('resource').map(r => ({
        name: r.name,
        initiatorType: r.initiatorType,
        startTime: r.startTime,
        responseEnd: r.responseEnd,
        duration: r.duration,
        transferSize: r.transferSize,
        encodedBodySize: r.encodedBodySize,
        decodedBodySize: r.decodedBodySize,
      }));
      return {
        navigation: navEntry ? {
          startTime: navEntry.startTime,
          domContentLoadedEventEnd: navEntry.domContentLoadedEventEnd,
          loadEventEnd: navEntry.loadEventEnd,
          responseEnd: navEntry.responseEnd,
          duration: navEntry.duration,
        } : null,
        paint,
        resources,
      };
    });
  } catch (e) {
    perf = { error: String(e.message || e) };
  }

  let lcpFinal = null;
  try {
    lcpFinal = await page.evaluate(() => new Promise((resolve) => {
      try {
        let last = null;
        const po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            last = { startTime: entry.startTime, size: entry.size, url: entry.url, renderTime: entry.renderTime, loadTime: entry.loadTime };
          }
        });
        po.observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => { po.disconnect(); resolve(last); }, 500);
      } catch (e) {
        resolve({ error: String(e.message || e) });
      }
    }));
  } catch (e) { lcpFinal = { error: String(e.message || e) }; }

  await browser.close();

  const isImage = (r) => {
    const ct = (r.contentType || '').toLowerCase();
    if (/image\//.test(ct)) return true;
    const u = r.url.toLowerCase();
    return /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/.test(u);
  };

  const images = responses.filter(isImage);
  images.sort((a, b) => (a.receivedAtMs - b.receivedAtMs));

  const totalBytes = responses.reduce((acc, r) => acc + (r.bodySize || r.contentLength || 0), 0);
  const imageBytes = images.reduce((acc, r) => acc + (r.bodySize || r.contentLength || 0), 0);

  const slowestImages = images
    .map(r => ({
      url: r.url,
      bodySize: r.bodySize,
      contentLength: r.contentLength,
      receivedAtMs: r.receivedAtMs,
      durationMs: r.timing ? (r.timing.responseEnd - 0) : null,
      startTime: r.timing ? r.timing.startTime : null,
    }))
    .sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0))
    .slice(0, 15);

  const result = {
    scenario: 'cold-load',
    url: URL_TARGET,
    timestamp: new Date().toISOString(),
    navigation: {
      gotoStartMs: 0,
      gotoEndMs: tNav1 - tNav0,
      gotoError,
    },
    perf,
    lcpFinal,
    totals: {
      totalResponses: responses.length,
      totalBytes,
      imageResponses: images.length,
      imageBytes,
    },
    imagesTimeline: images.map(r => ({
      url: r.url,
      contentType: r.contentType,
      bodySize: r.bodySize,
      receivedAtMs: r.receivedAtMs,
      timing: r.timing,
    })),
    slowestImages,
    allResponses: responses.map(r => ({
      url: r.url,
      resourceType: r.resourceType,
      status: r.status,
      contentType: r.contentType,
      bodySize: r.bodySize,
      receivedAtMs: r.receivedAtMs,
    })),
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
