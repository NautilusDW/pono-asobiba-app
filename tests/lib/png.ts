import { openSync, readSync, closeSync } from 'node:fs';

/**
 * PNG IHDR reader.
 *
 * Reads exactly the first 24 bytes of the file and extracts width / height from
 * the IHDR chunk. We do NOT decode the image; the caller only needs the canvas
 * dimensions emitted by capture.js for `expect(width).toBe(preset.w)` checks.
 *
 * Byte layout (PNG spec):
 *   [0..8)   PNG signature (89 50 4E 47 0D 0A 1A 0A)
 *   [8..12)  IHDR length (always 13, big-endian, unused here)
 *   [12..16) Chunk type "IHDR"
 *   [16..20) Width  (uint32 BE)
 *   [20..24) Height (uint32 BE)
 */
export interface PngSize {
  width: number;
  height: number;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IHDR = Buffer.from('IHDR', 'ascii');

export function readPngSize(path: string): PngSize {
  const buf = Buffer.alloc(24);
  const fd = openSync(path, 'r');
  try {
    const bytesRead = readSync(fd, buf, 0, 24, 0);
    if (bytesRead < 24) {
      throw new Error(
        `readPngSize: file too small (${bytesRead} bytes) — path=${path}`,
      );
    }
  } finally {
    closeSync(fd);
  }

  const hex = buf.toString('hex');

  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(
      `readPngSize: PNG signature mismatch at ${path} — first24=${hex}`,
    );
  }

  if (!buf.subarray(12, 16).equals(IHDR)) {
    throw new Error(
      `readPngSize: IHDR chunk not found at ${path} — first24=${hex}`,
    );
  }

  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}
