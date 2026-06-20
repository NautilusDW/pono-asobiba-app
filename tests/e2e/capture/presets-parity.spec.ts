import { expect, test } from '@playwright/test';
import { PRESETS, gotoWithCapture } from '../../lib/capture-helpers';

/**
 * PRESETS-PARITY — drift detection between capture.js runtime and test mirror.
 *
 * Background:
 *   `tests/lib/capture-helpers.ts` exports a static TypeScript copy of
 *   `common/capture.js`'s `PRESETS` array. Other capture specs (T06–T09 in
 *   preset.spec.ts) compare PNG IHDR dims and filenames against that mirror.
 *   If capture.js drifts (key rename `w` → `width`, preset added/removed/edited)
 *   without a matching update to the mirror, those tests would happily compare
 *   the mirror's literal value against the same mirror-derived expectation and
 *   pass — masking a capture.js bug. This spec guards against that by reading
 *   the runtime PRESETS straight off `window.PonoCapture.PRESETS` (exposed at
 *   common/capture.js:419) and asserting deep equality with the mirror.
 *
 * Strategy:
 *   - Open `/maze/?capture=1` (cheapest registrant, hostname gate is "localhost"
 *     → allowed) and wait for the capture overlay so we know capture.js is
 *     fully initialized and `window.PonoCapture` is published.
 *   - Read `window.PonoCapture.PRESETS` via page.evaluate and compare against
 *     the mirror with `toEqual` (key set + values; order also matches since
 *     both sides are plain arrays of plain objects with insertion order).
 *   - Separately assert that every runtime entry has the four required keys
 *     with the expected primitive types — so a future addition that forgets
 *     a key (e.g. only `{ id, w, h }` without `label`) fails loudly even if
 *     the mirror is also wrong in the same way.
 */

test.describe('PRESETS parity (capture.js mirror drift detection)', () => {
  test('PRESETS-PARITY tests/lib/capture-helpers.ts mirror matches runtime PonoCapture.PRESETS', async ({
    page,
  }) => {
    await gotoWithCapture(page, '/maze/?capture=1');
    const runtimePresets = await page.evaluate(() => {
      // PonoCapture publishes PRESETS as a defensive copy of the internal array
      // (common/capture.js:419 — `PRESETS: PRESETS.slice()`).
      const pc = (window as unknown as { PonoCapture?: { PRESETS?: unknown } })
        .PonoCapture;
      return pc?.PRESETS;
    });
    expect(
      runtimePresets,
      'window.PonoCapture.PRESETS should be exposed by common/capture.js',
    ).toBeTruthy();
    // Deep equal — key names, order, and values all must match. If capture.js
    // renames `w` → `width`, this assertion fails because the runtime objects
    // would have a `width` key that the mirror lacks (and vice versa).
    expect(runtimePresets).toEqual(PRESETS);
  });

  test('PRESETS-PARITY all preset entries have required keys (id, label, w, h)', async ({
    page,
  }) => {
    await gotoWithCapture(page, '/maze/?capture=1');
    const runtimePresets = await page.evaluate(() => {
      const pc = (window as unknown as {
        PonoCapture?: { PRESETS?: unknown };
      }).PonoCapture;
      return pc?.PRESETS as Array<Record<string, unknown>> | undefined;
    });
    expect(runtimePresets, 'window.PonoCapture.PRESETS should be exposed').toBeTruthy();
    expect(Array.isArray(runtimePresets)).toBe(true);
    expect((runtimePresets as unknown[]).length).toBeGreaterThan(0);
    for (const p of runtimePresets as Array<Record<string, unknown>>) {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('label');
      expect(p).toHaveProperty('w');
      expect(p).toHaveProperty('h');
      expect(typeof p.id).toBe('string');
      expect(typeof p.label).toBe('string');
      expect(typeof p.w).toBe('number');
      expect(typeof p.h).toBe('number');
    }
  });
});
