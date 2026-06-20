import { expect, test } from '@playwright/test';
import {
  CAPTURE_OVERLAY_SELECTOR,
  PRESETS,
  gotoWithCapture,
  setCaptureTierOverride,
  shootAndGetDownload,
} from '../../lib/capture-helpers';
import { readPngSize } from '../../lib/png';

/**
 * T12 / T13 / T14 — sub-tier hidden games + capture tier override.
 *
 * Sub-tier games (starparodier / undersea-cave / sea-album) only run for the
 * 'sub' tier per common/tier.js. capture.js's overlay is gated by host but the
 * page-level gameplay itself bails early without sub tier. To exercise capture
 * on these games at localhost we use the documented session-scope escape hatch:
 *
 *   sessionStorage['pono_capture_tier_override'] = '1'
 *   → tier.js getTier() returns 'sub' (capture override branch)
 *
 * `setCaptureTierOverride()` seeds that flag BEFORE any page script runs via
 * addInitScript so the very first tier check inside the game module sees sub.
 *
 * Each test:
 *   1. seeds the override flag (sessionStorage, NOT localStorage)
 *   2. opens /<game>/?capture=1 and waits for the capture overlay
 *   3. shoots at the lp-16x9 preset
 *   4. asserts the suggested filename prefix matches the gameId
 *   5. asserts the PNG IHDR is exactly 1920×1080 (compose() pads to preset)
 *
 * Filename prefix is "<gameId>_<YYYYMMDD>_<seq>" per capture.js makeFileName().
 */

const SUB_TIER_GAMES = [
  { id: 'T12', gameId: 'starparodier',  url: '/starparodier/?capture=1' },
  { id: 'T13', gameId: 'undersea-cave', url: '/undersea-cave/?capture=1' },
  { id: 'T14', gameId: 'sea-album',     url: '/sea-album/?capture=1' },
] as const;

test.describe('capture overlay on sub-tier games (override)', () => {
  for (const game of SUB_TIER_GAMES) {
    test(`${game.id} ${game.gameId} captures with tier override at lp-16x9`, async ({
      page,
    }) => {
      // Seed sessionStorage BEFORE any page script runs.
      await setCaptureTierOverride(page);

      // gotoWithCapture waits for .pono-capture-overlay (5s timeout). All three
      // games register PonoCapture inline at the bottom of <body>, so the
      // overlay appears as soon as capture.js's armUI() sees ?capture=1 — the
      // sub-tier game module's deferred bootstrap does not delay this.
      await gotoWithCapture(page, game.url);

      const overlay = page.locator(CAPTURE_OVERLAY_SELECTOR);
      await expect(overlay).toBeVisible();

      const preset = PRESETS[0]; // lp-16x9 → 1920×1080
      const download = await shootAndGetDownload(page, preset);

      // capture.js makeFileName: "<gameId>_<date>_<seq>.png" — prefix check
      // tolerates date/seq drift while pinning the registered gameId.
      expect(download.suggestedFilename()).toMatch(
        new RegExp('^' + game.gameId.replace(/[-/]/g, '\\$&') + '_'),
      );

      const savedPath = await download.path();
      expect(savedPath).not.toBeNull();
      const size = readPngSize(savedPath as string);
      expect(size).toEqual({ width: preset.w, height: preset.h });
    });
  }
});
