#!/usr/bin/env node
/* Remove the border-connected magenta background from the generated pot. */
const path = require('path');
const sharp = require('sharp');

const here = __dirname;
const root = path.resolve(here, '../../..');
const source = path.join(here, 'boil_pot_complete_raw.png');
const alphaOutput = path.join(here, 'boil_pot_complete_alpha.png');
const runtimeOutput = path.join(root, 'assets/images/bento/cooking/boil/boil_pot_cold.png');

async function main() {
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const total = width * height;
  const candidate = new Uint8Array(total);
  const distance = new Float32Array(total);
  for (let i = 0; i < total; i += 1) {
    const p = i * channels;
    const r = data[p], g = data[p + 1], b = data[p + 2];
    const d = Math.max(Math.abs(r - 255), g, Math.abs(b - 255));
    distance[i] = d;
    candidate[i] = d < 150 && Math.min(r, b) - g > 34 ? 1 : 0;
  }

  const connected = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0, tail = 0;
  const enqueue = (index) => {
    if (!candidate[index] || connected[index]) return;
    connected[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y += 1) { enqueue(y * width); enqueue(y * width + width - 1); }
  while (head < tail) {
    const i = queue[head++];
    const x = i % width;
    if (x) enqueue(i - 1);
    if (x + 1 < width) enqueue(i + 1);
    if (i >= width) enqueue(i - width);
    if (i + width < total) enqueue(i + width);
  }

  const rgba = Buffer.alloc(total * 4);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let i = 0; i < total; i += 1) {
    const p = i * channels;
    let alpha = 255;
    if (candidate[i]) {
      // The generated flat field varies from exact #ff00ff by about 10–35
      // levels near the canvas edge. Keep that variation fully transparent.
      let t = Math.max(0, Math.min(1, (distance[i] - 42) / 92));
      t = t * t * (3 - 2 * t);
      alpha = Math.round(t * 255);
      if (alpha < 8) alpha = 0;
      if (alpha > 248) alpha = 255;
    }
    const q = i * 4;
    if (alpha === 0) {
      rgba[q] = rgba[q + 1] = rgba[q + 2] = 0;
    } else {
      const r = data[p], g = data[p + 1], b = data[p + 2];
      // Suppress residual magenta only in the antialiased boundary pixels.
      const spill = alpha < 255 ? Math.max(0, Math.min(r, b) - g) * (1 - alpha / 255) : 0;
      rgba[q] = Math.max(0, Math.round(r - spill));
      rgba[q + 1] = g;
      rgba[q + 2] = Math.max(0, Math.round(b - spill));
      const x = i % width, y = Math.floor(i / width);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    rgba[q + 3] = alpha;
  }

  await sharp(rgba, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(alphaOutput);
  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .resize(836, 471, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toFile(runtimeOutput);
  console.log(JSON.stringify({ width, height, connectedPixels: tail, visibleBBox: [minX, minY, maxX + 1, maxY + 1], outputs: [alphaOutput, runtimeOutput] }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
