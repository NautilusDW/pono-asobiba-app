import { expect, test, type Page } from '@playwright/test';
import {
  CAPTURE_OVERLAY_SELECTOR,
  clearServiceWorkers,
  seedSessionStorage,
} from '../../lib/capture-helpers';

/**
 * T03/T04/T05 — production hostname gate, exercised via chromium's
 * `--host-resolver-rules` DNS shim (configured in the `chromium-prod-shim`
 * Playwright project).
 *
 * Strategy (vs. the legacy gate.spec.ts which is fixme'd):
 *   - The `chromium-prod-shim` project launches chromium with
 *       --host-resolver-rules=MAP pono.kodama-no-mori.com 127.0.0.1,
 *                             MAP pono-asobiba-app.ndw.workers.dev 127.0.0.1
 *     so production hostnames resolve to the local python http.server.
 *   - When the page navigates to e.g. `http://pono.kodama-no-mori.com:8000/maze/`,
 *     chromium serves the local static bundle but `location.hostname` inside
 *     the page reports the genuine production host. capture.js's
 *     `isStagingHost()` therefore returns false and the gate engages — exactly
 *     the production behavior we need to verify.
 *
 * Every test asserts the real `location.hostname` up front so a regression in
 * the project args (chromium dropping host-resolver-rules, project misconfig,
 * etc.) fails loudly instead of silently passing on localhost.
 *
 * Run with:
 *   npx playwright test tests/e2e/capture/gate-prod-shim.spec.ts \
 *     --project=chromium-prod-shim --reporter=list
 *
 * The `@prod-shim` tag in every test title keeps these tests excluded from the
 * default `chromium-localhost` project (and vice-versa).
 */

async function assertHostname(page: Page, expected: string): Promise<void> {
  const actual = await page.evaluate(() => location.hostname);
  expect(
    actual,
    `host-resolver-rules shim should make location.hostname report ${expected}; ` +
      `got ${actual}. Check playwright.config.ts → chromium-prod-shim launchOptions.args.`,
  ).toBe(expected);
}

test.describe('T03-T05 production hostname gate (@prod-shim)', () => {
  test('T03 ?capture=1 ignored on pono.kodama-no-mori.com (@prod-shim)', async ({
    page,
  }) => {
    await clearServiceWorkers(page);

    await page.goto('http://pono.kodama-no-mori.com:8000/maze/?capture=1', {
      waitUntil: 'domcontentloaded',
    });

    await assertHostname(page, 'pono.kodama-no-mori.com');

    // capture.js arms the overlay synchronously on url-trigger, but allow time
    // for any deferred init so a late render would still be caught.
    await page.waitForTimeout(3_000);

    await expect(page.locator(CAPTURE_OVERLAY_SELECTOR)).toHaveCount(0);
  });

  test('T03b ?capture=1 ignored on pono-asobiba-app.ndw.workers.dev (@prod-shim)', async ({
    page,
  }) => {
    await clearServiceWorkers(page);

    await page.goto(
      'http://pono-asobiba-app.ndw.workers.dev:8000/maze/?capture=1',
      { waitUntil: 'domcontentloaded' },
    );

    await assertHostname(page, 'pono-asobiba-app.ndw.workers.dev');

    await page.waitForTimeout(3_000);

    await expect(page.locator(CAPTURE_OVERLAY_SELECTOR)).toHaveCount(0);
  });

  test('T04 Shift+Alt+C ignored on production hostname (@prod-shim)', async ({
    page,
  }) => {
    await clearServiceWorkers(page);

    await page.goto('http://pono.kodama-no-mori.com:8000/maze/', {
      waitUntil: 'domcontentloaded',
    });

    await assertHostname(page, 'pono.kodama-no-mori.com');

    // Give capture.js a beat to attach (or decline to attach) the keydown listener.
    await page.waitForTimeout(500);

    await page.keyboard.down('Shift');
    await page.keyboard.down('Alt');
    await page.keyboard.press('KeyC');
    await page.keyboard.up('Alt');
    await page.keyboard.up('Shift');

    // Wait beyond the trigger so a late-armed overlay would still be observed.
    await page.waitForTimeout(3_000);

    await expect(page.locator(CAPTURE_OVERLAY_SELECTOR)).toHaveCount(0);
  });

  test('T05 admin_capture_unlocked re-enables overlay on production hostname (@prod-shim)', async ({
    page,
  }) => {
    // Seed BEFORE goto so capture.js sees the unlocked flag during init.
    await seedSessionStorage(page, 'admin_capture_unlocked', '1');
    await clearServiceWorkers(page);
    // clearServiceWorkers calls localStorage.clear()/sessionStorage.clear() on
    // the root navigation, so re-seed via addInitScript-on-next-navigation:
    await seedSessionStorage(page, 'admin_capture_unlocked', '1');

    await page.goto('http://pono.kodama-no-mori.com:8000/maze/?capture=1', {
      waitUntil: 'domcontentloaded',
    });

    await assertHostname(page, 'pono.kodama-no-mori.com');

    // Sanity-check the seed survived clearServiceWorkers + navigation.
    const unlocked = await page.evaluate(() =>
      sessionStorage.getItem('admin_capture_unlocked'),
    );
    expect(unlocked).toBe('1');

    await expect(page.locator(CAPTURE_OVERLAY_SELECTOR)).toBeVisible({
      timeout: 5_000,
    });
  });
});
