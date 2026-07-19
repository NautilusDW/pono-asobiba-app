import { expect, test } from '@playwright/test';
import {
  CAPTURE_OVERLAY_SELECTOR,
  clearServiceWorkers,
  seedSessionStorage,
  shimHostname,
} from '../../lib/capture-helpers';

/**
 * T03/T04/T05 — production hostname gate.
 *
 * capture.js's `isCaptureAllowed()` returns false on production hostnames
 * (anything NOT in STAGING_HOSTS) UNLESS sessionStorage.admin_capture_unlocked
 * is '1'. These tests try to shim `location.hostname` to a production value
 * via Page.addInitScript so the guard sees a production hostname while we
 * stay on localhost:8000.
 *
 * ── Known chromium limitation ─────────────────────────────────────────────
 *   `window.location` is a WebIDL `[Unforgeable]` attribute. Although its
 *   property descriptor reports `configurable: true`, V8 actually throws
 *   `TypeError: Cannot redefine property: location` (and similarly for
 *   `hostname`) when JS tries `Object.defineProperty`. `shimHostname` in
 *   `tests/lib/capture-helpers.ts` swallows the error to keep T01 stable,
 *   so a silent no-op is possible at runtime.
 *
 *   To avoid false greens, every gate test below probes the shim AFTER
 *   navigation and marks itself fixme with a clear reason if the override
 *   did not take. Manual fallback verification:
 *
 *     1. Deploy the current branch to staging
 *        (https://pono-asobiba-app-staging.ndw.workers.dev) — capture is
 *        allowed there, so we cannot reuse it for the negative case.
 *     2. Open https://pono-asobiba-app.ndw.workers.dev/maze/?capture=1 in a
 *        real browser. Confirm `.pono-capture-overlay` is absent.
 *     3. Press Shift+Alt+C on the same page. Confirm nothing happens.
 *     4. Open devtools and run:
 *          sessionStorage.setItem('admin_capture_unlocked', '1');
 *          location.reload();
 *        Confirm the overlay now appears (covers T05).
 *
 * If/when Playwright (or a CDP escape hatch in `shimHostname`) starts
 * actually overriding `location.hostname`, the runtime probe below will
 * return the shimmed value and the tests will run their full assertions
 * automatically.
 */

const PRODUCTION_HOSTNAMES = [
  'pono.kodama-no-mori.com',
  'pono-asobiba-app.ndw.workers.dev',
] as const;

async function expectHostnameShim(
  page: import('@playwright/test').Page,
  expected: string,
): Promise<void> {
  const actual = await page.evaluate(() => location.hostname);
  if (actual !== expected) {
    test.fixme(
      true,
      `shimHostname did not take effect (saw ${actual} instead of ${expected}). ` +
        `Chromium [Unforgeable] location guard active; run manual fallback ` +
        `documented at the top of gate.spec.ts.`,
    );
  }
}

test.describe('capture overlay production gate', () => {
  for (const hostname of PRODUCTION_HOSTNAMES) {
    test(`T03 ?capture=1 is ignored on ${hostname}`, async ({ page }) => {
      await shimHostname(page, hostname);
      await clearServiceWorkers(page);

      await page.goto('/maze/?capture=1', { waitUntil: 'domcontentloaded' });

      await expectHostnameShim(page, hostname);

      // Wait long enough for any deferred capture.js init to attempt rendering.
      await page.waitForTimeout(5_000);

      const overlay = page.locator(CAPTURE_OVERLAY_SELECTOR);
      // Guard short-circuits before DOM construction → element must not exist.
      await expect(overlay).toHaveCount(0);
    });
  }

  test('T04 Shift+Alt+C is ignored on production hostname', async ({ page }) => {
    await shimHostname(page, 'pono.kodama-no-mori.com');
    await clearServiceWorkers(page);

    await page.goto('/maze/', { waitUntil: 'domcontentloaded' });

    await expectHostnameShim(page, 'pono.kodama-no-mori.com');

    // Give capture.js a moment to attach (or decline to attach) listeners.
    await page.waitForTimeout(500);

    await page.keyboard.down('Shift');
    await page.keyboard.down('Alt');
    await page.keyboard.press('KeyC');
    await page.keyboard.up('Alt');
    await page.keyboard.up('Shift');

    // Wait beyond the trigger to confirm no late rendering occurs.
    await page.waitForTimeout(4_500);

    const overlay = page.locator(CAPTURE_OVERLAY_SELECTOR);
    await expect(overlay).toHaveCount(0);
  });

  test('T05 admin_capture_unlocked re-enables overlay on production hostname', async ({
    page,
  }) => {
    await shimHostname(page, 'pono.kodama-no-mori.com');
    await seedSessionStorage(page, 'admin_capture_unlocked', '1');
    await clearServiceWorkers(page);

    await page.goto('/maze/?capture=1', { waitUntil: 'domcontentloaded' });

    await expectHostnameShim(page, 'pono.kodama-no-mori.com');

    const overlay = page.locator(CAPTURE_OVERLAY_SELECTOR);
    await expect(overlay).toBeVisible({ timeout: 5_000 });
  });
});
