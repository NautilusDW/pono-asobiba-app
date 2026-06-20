import { expect, test } from '@playwright/test';
import {
  PRESETS,
  gotoWithCapture,
  shootAndGetDownload,
} from '../../lib/capture-helpers';
import { readPngSize } from '../../lib/png';

/**
 * T06–T10 — preset → PNG size parity (v1345 silent-fallback regression guard).
 *
 * Background:
 *   v1345 shipped a silent fallback where capture.js's shoot() expected
 *   `preset.width / preset.height` but PRESETS used `{w, h}`. The fallback
 *   path made the output canvas resolve to the SOURCE canvas dimensions
 *   (viewport × dpr) instead of the requested preset, so App Store assets
 *   shipped at the wrong resolution silently. capture.js now accepts both
 *   `{w,h}` and `{width,height}` (common/capture.js:191-196), but this
 *   regression is exactly the kind of thing that could come back via a
 *   refactor — hence these tests assert IHDR width/height against the
 *   literal PRESETS values.
 *
 * Strategy:
 *   - All cases use maze (canvas-direct registrant; cheapest + highest
 *     signal: source canvas size is viewport-dependent and therefore
 *     guaranteed NOT to match any preset by coincidence).
 *   - PNG sizes are read straight from IHDR via lib/png.ts (no decoder).
 *   - Filenames are matched against the documented format so a regression
 *     where the size is right but the file is mis-named also fails.
 *
 * Failure modes this catches:
 *   - preset.w / preset.h key drift  → IHDR != literal preset → fail.
 *   - silent fallback to source canvas dims → IHDR == viewport/dpr ints
 *     (e.g. 1280×720) instead of e.g. 1284×2778 → fail.
 *   - filename format regression (missing seq pad, wrong gameId) → T06
 *     filename assert + T10 dedicated regex test both catch it.
 */

const FILENAME_PATTERN = /^maze_\d{8}_\d{3}(?:_[a-z0-9_-]*)?\.png$/;

interface PresetCase {
  caseId: string;
  index: number;
}

const SIZE_CASES: readonly PresetCase[] = [
  { caseId: 'T06', index: 0 }, // lp-16x9   1920x1080
  { caseId: 'T07', index: 1 }, // lp-9x16   1080x1920
  { caseId: 'T08', index: 2 }, // square    1080x1080
  { caseId: 'T09', index: 3 }, // ios-65    1284x2778  ← v1345 regression sentinel
] as const;

test.describe('capture preset → PNG IHDR parity', () => {
  for (const { caseId, index } of SIZE_CASES) {
    const preset = PRESETS[index];
    test(`${caseId} preset '${preset.id}' (${preset.w}×${preset.h}) emits PNG with matching IHDR`, async ({
      page,
    }) => {
      await gotoWithCapture(page, '/maze/?capture=1');

      const download = await shootAndGetDownload(page, preset);

      // Playwright with default acceptDownloads:true streams the body to a
      // temp file on disk; path() returns the absolute path once the stream
      // is closed. If chromium ever returns null here, fall through to a
      // saveAs() so we still have bytes to inspect.
      let pngPath = await download.path();
      if (!pngPath) {
        const fallback = test.info().outputPath(`${preset.id}.png`);
        await download.saveAs(fallback);
        pngPath = fallback;
      }

      const { width, height } = readPngSize(pngPath);
      expect(
        { width, height },
        `${caseId}: IHDR for preset '${preset.id}' must match literal preset dims; ` +
          `mismatch implies v1345-style silent fallback to source canvas dims.`,
      ).toEqual({ width: preset.w, height: preset.h });

      // Co-located filename check: T06 specifically is also asserted in T10
      // below, but keeping the assertion local to each size case makes a
      // failure self-diagnosing ("size right, name wrong" vs the reverse).
      expect(download.suggestedFilename()).toMatch(FILENAME_PATTERN);
    });
  }

  // T10 — independent filename-format check.
  //
  // Duplicates a small slice of T06 deliberately. The point of T10 is that
  // when CI lights up red, the diagnostician can look at T10 in isolation:
  //   - T10 fails alone  → filename regex regression (label sanitizer,
  //                        gameId source, seq padding, date stamp).
  //   - T06 fails alone  → size regression (the v1345 class of bug).
  //   - Both fail        → broader capture.js breakage; start with shoot().
  test('T10 download.suggestedFilename() matches documented format', async ({
    page,
  }) => {
    await gotoWithCapture(page, '/maze/?capture=1');
    const download = await shootAndGetDownload(page, PRESETS[0]);
    const name = download.suggestedFilename();
    expect(
      name,
      `filename '${name}' must match ${FILENAME_PATTERN}; ` +
        `format = '<gameId>_YYYYMMDD_NNN[_label].png' per capture.js makeFileName()`,
    ).toMatch(FILENAME_PATTERN);
  });
});
