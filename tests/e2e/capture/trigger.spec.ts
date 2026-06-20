import { expect, test } from '@playwright/test';
import {
  CAPTURE_OVERLAY_SELECTOR,
  clearServiceWorkers,
} from '../../lib/capture-helpers';

/**
 * T02 — Shift+Alt+C keyboard trigger on localhost.
 *
 * Verifies capture.js's keyboard trigger path:
 *   1. Loading /maze/ WITHOUT `?capture=1` must NOT render the overlay.
 *   2. Pressing Shift+Alt+C must render the overlay.
 *
 * Hostname guard: localhost is in STAGING_HOSTS, so no shim required.
 * capture.js listens for `e.shiftKey && e.altKey && e.key.toLowerCase()==='c'`
 * (see common/capture.js armUI()), so either an explicit modifier-chain press
 * or Playwright's `Shift+Alt+c` accelerator should fire it.
 */
test.describe('capture overlay keyboard trigger', () => {
  test.beforeEach(async ({ page }) => {
    await clearServiceWorkers(page);
  });

  test('T02 Shift+Alt+C reveals overlay on /maze/ (explicit modifier chain)', async ({
    page,
  }) => {
    await page.goto('/maze/', { waitUntil: 'domcontentloaded' });

    // Give capture.js a moment to init even without ?capture=1.
    await page.waitForTimeout(500);

    // Pre-condition: overlay must NOT be visible without the trigger.
    const overlay = page.locator(CAPTURE_OVERLAY_SELECTOR);
    await expect(overlay).toHaveCount(0);

    // Send the trigger as an explicit modifier chain to match real key events.
    await page.keyboard.down('Shift');
    await page.keyboard.down('Alt');
    await page.keyboard.press('KeyC');
    await page.keyboard.up('Alt');
    await page.keyboard.up('Shift');

    await expect(overlay).toBeVisible({ timeout: 5_000 });
  });

  test('T02b Shift+Alt+c reveals overlay on /maze/ (accelerator form)', async ({
    page,
  }) => {
    await page.goto('/maze/', { waitUntil: 'domcontentloaded' });

    await page.waitForTimeout(500);

    const overlay = page.locator(CAPTURE_OVERLAY_SELECTOR);
    await expect(overlay).toHaveCount(0);

    // Playwright accelerator form: produces a single keydown carrying the
    // shift+alt modifier flags, which is what capture.js actually inspects.
    await page.keyboard.press('Shift+Alt+KeyC');

    await expect(overlay).toBeVisible({ timeout: 5_000 });
  });
});
