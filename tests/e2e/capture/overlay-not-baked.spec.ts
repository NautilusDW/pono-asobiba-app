import { promises as fs } from 'node:fs';
import path from 'node:path';
import { expect, test, type Download, type Page } from '@playwright/test';
import {
  CAPTURE_OVERLAY_SELECTOR,
  PRESETS,
  gotoWithCapture,
} from '../../lib/capture-helpers';

/**
 * Regression test for v1388: capture overlay must NOT be baked into the PNG.
 *
 * Repro: open /bento/?capture=1, the overlay UI sits at right:16px/bottom:16px
 * with `background: rgba(20,20,28,0.92)` — a near-black rounded rectangle.
 * Prior to v1388 html2canvas walked the overlay too because
 *   1. uiRoot had no `data-capture-hide` attribute (ignoreElements missed it)
 *   2. shoot() did nothing to hide the overlay during the capture
 *
 * The v1388 fix adds BOTH:
 *   A. uiRoot.setAttribute('data-capture-hide', '1') at creation
 *   B. shoot() flips uiRoot.style.visibility='hidden' around the build call
 *
 * Verification: capture lp-16x9 (1920×1080) and sample the bottom-right
 * region where the overlay sits. The overlay is dark navy
 * (rgba(20,20,28,0.92)) — if it was baked, that 280×~140 region near
 * (1920-296, 1080-156) would be dominated by near-black pixels (R+G+B <~ 90).
 * A clean bento UI in that area is full of warm browns, creams, food colors
 * with R+G+B typically > 250.
 *
 * We assert: in a 200×100 window at the overlay position, FEWER than 30 %
 * of pixels are "near-black" (R+G+B < 120). Before the fix the same window
 * was ~100 % near-black; after the fix it's ~0 % (bento UI showing through).
 */

const OVERLAY_REGION = {
  // CSS positions overlay at right:16px / bottom:16px with maxWidth:280px.
  // PNG is 1920×1080. Sample 200×100 starting ~30px from each edge to land
  // squarely inside the overlay if it was baked, while staying inside the
  // bento UI bounds otherwise.
  w: 200,
  h: 100,
  rightInset: 30,
  bottomInset: 30,
} as const;

async function shootLp16x9(page: Page): Promise<Download> {
  const overlay = page.locator(CAPTURE_OVERLAY_SELECTOR);
  await overlay.locator('select').selectOption(PRESETS[0].id);
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    overlay.locator('.pc-shoot').click(),
  ]);
  return download;
}

/** Returns the fraction of pixels in the bottom-right overlay region whose
 *  R+G+B sum is below `darkThreshold`. */
async function fractionNearBlack(
  page: Page,
  filePath: string,
  darkThreshold: number,
): Promise<{ fraction: number; sampled: number }> {
  const bytes = await fs.readFile(filePath);
  const base64 = bytes.toString('base64');
  return page.evaluate(
    async (args: {
      b64: string;
      regionW: number;
      regionH: number;
      rightInset: number;
      bottomInset: number;
      darkThreshold: number;
    }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + args.b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      if (!ctx) return { fraction: 0, sampled: 0 };
      ctx.drawImage(img, 0, 0);
      const x0 = Math.max(0, img.width - args.rightInset - args.regionW);
      const y0 = Math.max(0, img.height - args.bottomInset - args.regionH);
      const data = ctx.getImageData(x0, y0, args.regionW, args.regionH).data;
      let dark = 0;
      let total = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 16) continue; // skip fully transparent letterbox pixels
        total++;
        if (r + g + b < args.darkThreshold) dark++;
      }
      return {
        fraction: total ? dark / total : 0,
        sampled: total,
      };
    },
    {
      b64: base64,
      regionW: OVERLAY_REGION.w,
      regionH: OVERLAY_REGION.h,
      rightInset: OVERLAY_REGION.rightInset,
      bottomInset: OVERLAY_REGION.bottomInset,
      darkThreshold: 120,
    },
  );
}

test.describe('capture overlay NOT baked into PNG (v1388 regression)', () => {
  for (const game of [
    { id: 'OV-bento', url: '/bento/?capture=1', gameId: 'bento' },
    { id: 'OV-puzzle', url: '/puzzle/?capture=1', gameId: 'puzzle' },
  ] as const) {
    test(`${game.id} ${game.gameId}: bottom-right area is NOT dominated by overlay UI`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(90_000);

      await gotoWithCapture(page, game.url);

      await page.waitForFunction(
        () =>
          typeof (
            window as unknown as { PonoCapture?: { isAllowed?: () => boolean } }
          ).PonoCapture !== 'undefined' &&
          (
            window as unknown as { PonoCapture?: { isAllowed?: () => boolean } }
          ).PonoCapture?.isAllowed?.() === true,
        { timeout: 10_000 },
      );

      // Confirm overlay is actually rendered on the page (i.e. not hidden by
      // some unrelated bug) — otherwise our "is the overlay baked in" test
      // would trivially pass even without the v1388 fix.
      await expect(page.locator(CAPTURE_OVERLAY_SELECTOR)).toBeVisible();

      const download = await shootLp16x9(page);

      // Persist the PNG into a stable dir for human inspection — Playwright
      // auto-cleans testInfo.outputDir on pass, so we keep a copy under
      // test-results/manual-review/ that survives green runs.
      const stableDir = path.join(
        process.cwd(),
        'test-results',
        'manual-review',
      );
      await fs.mkdir(stableDir, { recursive: true });
      const outPath = path.join(stableDir, `${game.gameId}_lp16x9.png`);
      await download.saveAs(outPath);
      await testInfo.attach(`${game.gameId}_lp16x9.png`, {
        path: outPath,
        contentType: 'image/png',
      });

      const { fraction, sampled } = await fractionNearBlack(
        page,
        outPath,
        120,
      );
      testInfo.annotations.push({
        type: 'overlay-region-dark-fraction',
        description: `${game.gameId}: dark=${(fraction * 100).toFixed(1)}% of ${sampled}px (threshold <30% pass)`,
      });

      // The overlay UI is rgba(20,20,28,0.92) — fully baked it makes
      // ~100% of pixels in the region "near-black". The bento/puzzle game
      // UI in that region is bright/colorful and yields ~0-5% near-black.
      // Threshold of 30 % gives plenty of margin while still catching the
      // regression deterministically.
      expect(fraction).toBeLessThan(0.3);
    });
  }
});
