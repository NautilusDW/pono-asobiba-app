// Verify that waiting Service Worker updates stay passive and do not block
// title-card navigation.

const { chromium } = require('playwright-core');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SW_PATH = path.join(ROOT, 'sw.js');

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
};

function readSwVersion() {
  const raw = fs.readFileSync(SW_PATH, 'utf8');
  const match = raw.match(/^const CACHE_VERSION = (\d+);/m);
  if (!match) throw new Error('CACHE_VERSION not found');
  return Number(match[1]);
}

function bumpSw(fromVersion, toVersion) {
  const raw = fs.readFileSync(SW_PATH, 'utf8');
  const next = raw.replace(
    'const CACHE_VERSION = ' + fromVersion + ';',
    'const CACHE_VERSION = ' + toVersion + ';'
  );
  if (next === raw) throw new Error('CACHE_VERSION replace failed');
  fs.writeFileSync(SW_PATH, next, 'utf8');
}

function createServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/play.html';
    const filePath = path.resolve(ROOT, pathname.replace(/^\/+/, ''));
    if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Cache-Control': 'no-store' });
        res.end('Not found');
        return;
      }
      res.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function readUpdateUiState(page) {
  return page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const text = document.body ? document.body.innerText : '';
    return {
      url: location.href,
      controller: !!navigator.serviceWorker.controller,
      waiting: !!(reg && reg.waiting),
      toastCount: document.querySelectorAll('.pono-sw-toast').length,
      hasToastText: text.includes('あたらしい バージョンが あります'),
      hasCatchupText: text.includes('あたらしい バージョンに こうしんしています'),
    };
  });
}

async function assertNoUpdateUi(page, label) {
  const state = await readUpdateUiState(page);
  console.log(label, JSON.stringify(state));
  if (state.toastCount || state.hasToastText || state.hasCatchupText) {
    throw new Error(label + ': update UI was visible');
  }
  return state;
}

async function main() {
  const originalSw = fs.readFileSync(SW_PATH, 'utf8');
  const startVersion = readSwVersion();
  const bumpedVersion = startVersion + 1;
  const server = await createServer();
  const port = server.address().port;
  const base = 'http://127.0.0.1:' + port;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: 'allow',
  });
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('pono_audio_unlocked', '1');
      sessionStorage.setItem('pono_audio_primed_ts', String(Date.now()));
      localStorage.setItem('pono_sound_off', '1');
      localStorage.setItem('pono_player_profile_v1', JSON.stringify({
        name: 'テスト',
        gender: 'none',
        age: '5',
        avatar: { presetId: 'avatar_pono_kko_20260706' },
      }));
    } catch (_) {}
  });

  const page = await context.newPage();
  const pageErrors = [];
  const failed = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('requestfailed', (req) => {
    const url = req.url();
    if (url.includes('/assets/audio/')) return;
    failed.push(url + ' ' + (req.failure() && req.failure().errorText));
  });

  try {
    await page.goto(base + '/play.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 10000 });
    await assertNoUpdateUi(page, 'cold-load');

    bumpSw(startVersion, bumpedVersion);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    await assertNoUpdateUi(page, 'after-sw-bump');

    const bentoCard = page.locator('.game-card[data-id="bento"][data-rep="1"]').first();
    await bentoCard.click({ timeout: 10000 });
    await page.waitForURL(/\/bento\/index\.html(?:$|[?#])/, { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);
    await assertNoUpdateUi(page, 'bento-after-card-click');

    if (pageErrors.length) throw new Error('page errors: ' + JSON.stringify(pageErrors));
    if (failed.length) throw new Error('request failures: ' + JSON.stringify(failed.slice(0, 5)));
    console.log('PASS sw_passive_update_verify');
  } finally {
    fs.writeFileSync(SW_PATH, originalSw, 'utf8');
    await context.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
