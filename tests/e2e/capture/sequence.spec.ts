import { expect, test } from '@playwright/test';
import {
  PRESETS,
  gotoWithCapture,
  shootAndGetDownload,
} from '../../lib/capture-helpers';

/**
 * T11 — seq counter increments monotonically within a single page session.
 *
 * capture.js stores `pono_capture_seq` in **sessionStorage** (not
 * localStorage), incremented by nextSeq() inside makeFileName()
 * (common/capture.js:81-89). gotoWithCapture() calls clearServiceWorkers()
 * which runs `sessionStorage.clear()` before the page boots, so a fresh
 * page reliably starts the counter from 1. Within a single page context
 * the counter must increase by exactly 1 each shoot — that is what this
 * test pins.
 *
 * We do NOT assert "starts at 001" deliberately: anything that clears
 * sessionStorage on navigation (e.g. a future SW that intercepts navigation
 * and reloads) could shift the start, but the +1/+1 invariant is the
 * actual contract makeFileName() promises. Allowing N → N+1 → N+2 (any N)
 * keeps the test focused on the property under regression risk.
 */

const FILENAME_PATTERN = /^maze_\d{8}_(\d{3})(?:_[a-z0-9_-]*)?\.png$/;

function seqFromFilename(name: string): number {
  const m = name.match(FILENAME_PATTERN);
  if (!m) {
    throw new Error(`unexpected filename format: '${name}'`);
  }
  return parseInt(m[1], 10);
}

// describe.serial: a single page context is reused across the steps below
// and tests must execute in order so the seq counter has meaning.
test.describe.serial('capture seq counter', () => {
  test('T11 seq increments by exactly 1 across 3 consecutive shoots', async ({
    page,
  }) => {
    await gotoWithCapture(page, '/maze/?capture=1');

    const seqs: number[] = [];
    for (let i = 0; i < 3; i++) {
      const download = await shootAndGetDownload(page, PRESETS[0]); // lp-16x9 ×3
      const name = download.suggestedFilename();
      seqs.push(seqFromFilename(name));
    }

    // Must be strictly +1 / +1. We don't pin the start value (see header).
    expect(
      seqs[1] - seqs[0],
      `seq must increment by 1 between shoot 1 and 2; got ${seqs.join(', ')}`,
    ).toBe(1);
    expect(
      seqs[2] - seqs[1],
      `seq must increment by 1 between shoot 2 and 3; got ${seqs.join(', ')}`,
    ).toBe(1);
  });
});
