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
 * is '1'. These tests shim location.hostname to a production value via
 * Page.addInitScript (runs before any page script, so capture.js sees the
 * faked hostname on its first guard check).
 *
 * If `Object.defineProperty(window.location, 'hostname', …)` is silently
 * rejected by chromium, the shim degrades to a no-op and the assertions in
 * T03–T05 will misfire. The fallback plan is documented inline at each test:
 *   - If a gate test starts failing because hostname stays 'localhost',
 *     mark it test.fixme() and run the same check manually against
 *     pono-asobiba-app.ndw.workers.dev (production worker) with devtools.
 */

const PRODUCTION_HOSTNAMES = [
  'pono.kodama-no-mori.com',
  'pono-asobiba-app.ndw.workers.dev',
] as const;

test.describe('capture overlay production gate', () => {
  for (const hostname of PRODUCTION_HOSTNAMES) {
    test(`T03 ?capture=1 is ignored on ${hostname}`, async ({ page }) => {
      await shimHostname(page, hostname);
      await clearServiceWorkers(page);
      // clearServiceWorkers navigates to '/' which would burn the shim if it
      // were set later, but addInitScript persists across navigations, so the
      // hostname stays shimmed on the next goto.

      await page.goto('/maze/?capture=1', { waitUntil: 'domcontentloaded' });

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

    const overlay = page.locator(CAPTURE_OVERLAY_SELECTOR);
    await expect(overlay).toBeVisible({ timeout: 5_000 });
  });
});
