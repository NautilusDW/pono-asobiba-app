import { chromium, expect, test } from '@playwright/test';

/**
 * Throwaway probe — verifies that chromium's `--host-resolver-rules` causes
 * `location.hostname` inside the page context to report the production
 * hostname while the underlying socket goes to 127.0.0.1:8000.
 *
 * Delete after the gate-prod-shim spec lands.
 */
test('probe: host-resolver-rules changes location.hostname', async () => {
  const browser = await chromium.launch({
    args: [
      '--host-resolver-rules=MAP pono.kodama-no-mori.com 127.0.0.1, MAP pono-asobiba-app.ndw.workers.dev 127.0.0.1',
      '--ignore-certificate-errors',
    ],
  });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('http://pono.kodama-no-mori.com:8000/maze/');
  const hostname = await page.evaluate(() => location.hostname);
  // eslint-disable-next-line no-console
  console.log('PROBE_HOSTNAME=' + hostname);
  expect(hostname).toBe('pono.kodama-no-mori.com');
  await browser.close();
});
