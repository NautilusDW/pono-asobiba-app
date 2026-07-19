import { expect, test } from '@playwright/test';
import { CAPTURE_OVERLAY_SELECTOR, gotoWithCapture } from '../../lib/capture-helpers';

/**
 * T01 — harness sanity check.
 *
 * Proves the scaffold is wired up end-to-end:
 *   - python http.server is reachable on :8000
 *   - maze/index.html loads with `?capture=1`
 *   - capture.js renders the overlay (.pono-capture-overlay)
 *
 * Does NOT take a screenshot — preset/PNG/download assertions live in T02+.
 */
test.describe('capture overlay sanity', () => {
  test('T01 overlay renders on /maze/?capture=1', async ({ page }) => {
    await gotoWithCapture(page, '/maze/?capture=1');
    await expect(page.locator(CAPTURE_OVERLAY_SELECTOR)).toBeVisible();
  });
});
