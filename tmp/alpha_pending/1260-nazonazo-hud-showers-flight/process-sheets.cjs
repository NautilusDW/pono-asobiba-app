const path = require('node:path');
const sharp = require('sharp');

const root = __dirname;
const rawDir = path.join(root, 'raw');
const processedDir = path.join(root, 'processed');

function clamp(value, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function removeMagenta(buffer, width, height, channels) {
  const out = Buffer.alloc(width * height * 4);
  const background = [245, 15, 245];

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const sourceOffset = pixel * channels;
    const targetOffset = pixel * 4;
    const red = buffer[sourceOffset];
    const green = buffer[sourceOffset + 1];
    const blue = buffer[sourceOffset + 2];
    const minRedBlue = Math.min(red, blue);
    const redBlueDelta = Math.abs(red - blue);
    const looksMagenta = redBlueDelta < 124
      && red > green * 1.2
      && blue > green * 1.2
      && minRedBlue > 55;

    let alpha = 1;
    if (looksMagenta) {
      alpha = smoothstep((190 - minRedBlue) / 100);
      if (alpha < 0.015) alpha = 0;
      if (alpha > 0.92) alpha = 1;
    }

    if (alpha === 0) {
      out[targetOffset] = 0;
      out[targetOffset + 1] = 0;
      out[targetOffset + 2] = 0;
      out[targetOffset + 3] = 0;
      continue;
    }

    if (alpha < 1) {
      out[targetOffset] = clamp(Math.round((red - background[0] * (1 - alpha)) / alpha));
      out[targetOffset + 1] = clamp(Math.round((green - background[1] * (1 - alpha)) / alpha));
      out[targetOffset + 2] = clamp(Math.round((blue - background[2] * (1 - alpha)) / alpha));
    } else {
      out[targetOffset] = red;
      out[targetOffset + 1] = green;
      out[targetOffset + 2] = blue;
    }
    out[targetOffset + 3] = Math.round(alpha * 255);
  }

  return out;
}

function keepLargestAlphaComponent(buffer, width, height) {
  const pixelCount = width * height;
  const labels = new Int32Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let component = 0;
  let largestComponent = 0;
  let largestSize = 0;

  for (let start = 0; start < pixelCount; start += 1) {
    if (labels[start] !== 0 || buffer[start * 4 + 3] <= 10) continue;
    component += 1;
    let head = 0;
    let tail = 0;
    let size = 0;
    queue[tail++] = start;
    labels[start] = component;

    while (head < tail) {
      const current = queue[head++];
      size += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const nextX = x + offsetX;
          const nextY = y + offsetY;
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
          const next = nextY * width + nextX;
          if (labels[next] !== 0 || buffer[next * 4 + 3] <= 10) continue;
          labels[next] = component;
          queue[tail++] = next;
        }
      }
    }

    if (size > largestSize) {
      largestSize = size;
      largestComponent = component;
    }
  }

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (labels[pixel] === largestComponent) continue;
    const offset = pixel * 4;
    buffer[offset] = 0;
    buffer[offset + 1] = 0;
    buffer[offset + 2] = 0;
    buffer[offset + 3] = 0;
  }
  return buffer;
}

async function buildSheet(config) {
  const sourcePath = path.join(rawDir, config.input);
  const { data, info } = await sharp(sourcePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = removeMagenta(data, info.width, info.height, info.channels);
  const boundaries = [0, 1, 2, 3].map((index) => Math.round((info.width * index) / 3));
  const frames = [];

  for (let index = 0; index < 3; index += 1) {
    const left = boundaries[index];
    const cellWidth = boundaries[index + 1] - left;
    const anchor = config.anchors[index];
    const resizedWidth = Math.round(cellWidth * config.scale);
    const resizedHeight = Math.round(info.height * config.scale);
    const cell = await sharp(rgba, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .extract({ left, top: 0, width: cellWidth, height: info.height })
      .raw()
      .toBuffer();
    const cleanedCell = keepLargestAlphaComponent(cell, cellWidth, info.height);
    const resized = await sharp(cleanedCell, {
      raw: { width: cellWidth, height: info.height, channels: 4 },
    })
      .resize(resizedWidth, resizedHeight, { kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();

    const sourceLeft = Math.round(config.anchorTarget.x - anchor.x * config.scale);
    const sourceTop = Math.round(config.anchorTarget.y - anchor.y * config.scale);
    const cropLeft = Math.max(0, -sourceLeft);
    const cropTop = Math.max(0, -sourceTop);
    const targetLeft = Math.max(0, sourceLeft);
    const targetTop = Math.max(0, sourceTop);
    const cropWidth = Math.min(resizedWidth - cropLeft, config.frameWidth - targetLeft);
    const cropHeight = Math.min(resizedHeight - cropTop, config.frameHeight - targetTop);
    const cropped = await sharp(resized)
      .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
      .png()
      .toBuffer();
    frames.push(await sharp({
      create: {
        width: config.frameWidth,
        height: config.frameHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: cropped, left: targetLeft, top: targetTop }])
      .png()
      .toBuffer());
  }

  const sheet = sharp({
    create: {
      width: config.frameWidth * 3,
      height: config.frameHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  await sheet
    .composite(frames.map((input, index) => ({ input, left: index * config.frameWidth, top: 0 })))
    .webp({ quality: 88, alphaQuality: 100, effort: 6 })
    .toFile(path.join(processedDir, config.output));
}

async function main() {
  await buildSheet({
    input: 'jungle_flying_toucan_3frame_raw.png',
    output: 'jungle_flying_toucan_3frame_20260712.webp',
    frameWidth: 256,
    frameHeight: 192,
    scale: 0.36,
    anchorTarget: { x: 75, y: 105 },
    anchors: [
      { x: 190, y: 444 },
      { x: 186, y: 444 },
      { x: 165, y: 444 },
    ],
  });
  await buildSheet({
    input: 'jungle_flying_butterfly_3frame_raw.png',
    output: 'jungle_flying_butterfly_3frame_20260712.webp',
    frameWidth: 192,
    frameHeight: 192,
    scale: 0.3,
    anchorTarget: { x: 85, y: 110 },
    anchors: [
      { x: 182, y: 555 },
      { x: 276, y: 505 },
      { x: 164, y: 548 },
    ],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
