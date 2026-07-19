#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../../..");
const RAW_DIR = path.join(SCRIPT_DIR, "raw");
const FINAL_DIR = path.join(
  REPO_ROOT,
  "assets/images/Rooms/furnitures_final",
);
const QA_PATH = path.join(SCRIPT_DIR, "qa-final-assets.json");

const PANEL_RECTS = Object.freeze({
  TL: { left: 0, top: 0, width: 627, height: 627 },
  TR: { left: 627, top: 0, width: 627, height: 627 },
  BL: { left: 0, top: 627, width: 627, height: 627 },
  LEFT_887: { left: 0, top: 0, width: 887, height: 887 },
});

const ASSETS = Object.freeze([
  { id: "furn_sofa_beige", raw: "set01_sofa_beige_pink_v3_chest_raw.png", panel: "TL" },
  { id: "furn_sofa_pink", raw: "set01_sofa_beige_pink_v3_chest_raw.png", panel: "BL" },
  { id: "furn_sofa_blue", raw: "set02_sofa_blue_floor_cushion_raw.png", panel: "TL" },
  { id: "furn_tv_stand", raw: "set03_tv_counter_v2_chest_raw.png", panel: "TL" },
  { id: "furn_coffee_table", raw: "set04_coffee_dining_raw.png", panel: "TL" },
  { id: "deco_floor_cushion_stripe", raw: "set02b_floor_cushion_raw.png", panel: "LEFT_887" },
  { id: "furn_kitchen_counter", raw: "set03_tv_counter_v2_chest_raw.png", panel: "BL", preserveEnclosedWhite: true },
  { id: "furn_fridge", raw: "set05_fridge_kitchen_cabinet_raw.png", panel: "TL", preserveEnclosedWhite: true },
  {
    id: "furn_dining_table_set",
    raw: "set04_coffee_dining_raw.png",
    panel: "BL",
    rect: { left: 0, top: 590, width: 627, height: 664 },
    punchPureWhiteHoles: true,
  },
  { id: "furn_kitchen_cabinet", raw: "set05_fridge_kitchen_cabinet_raw.png", panel: "BL", preserveEnclosedWhite: true },
  { id: "deco_fruit_basket", raw: "set06_fruit_cookie_raw.png", panel: "TL" },
  { id: "deco_cookie_jar", raw: "set06_fruit_cookie_raw.png", panel: "BL", preserveEnclosedWhite: true },
  {
    id: "furn_garden_bench",
    raw: "set07_bench_A_chairedit_J2_raw.png",
    panel: "FULL",
    sourceOrientation: "B",
    punchPureWhiteHoles: true,
  },
  { id: "furn_sandbox", raw: "set07_sandbox_v2_raw.png", panel: "LEFT_887" },
  {
    id: "furn_garden_table_parasol",
    raw: "set08_garden_table_planter_raw.png",
    panel: "TL",
    rect: { left: 0, top: 0, width: 627, height: 680 },
  },
  { id: "deco_planter_flowers", raw: "set08_garden_table_planter_raw.png", panel: "BL" },
  {
    id: "deco_watering_can",
    raw: "set09_watering_birdhouse_v2_raw.png",
    panel: "TL",
    punchPureWhiteHoles: true,
  },
  { id: "deco_birdhouse", raw: "set09_watering_birdhouse_v2_raw.png", panel: "BL" },
  { id: "furn_wardrobe_wood", raw: "set10_wardrobe_wood_pink_raw.png", panel: "TL" },
  { id: "furn_wardrobe_pink", raw: "set10_wardrobe_wood_pink_raw.png", panel: "BL" },
  { id: "furn_wardrobe_blue", raw: "set11_wardrobe_blue_tanabata_v3_raw.png", panel: "TR" },
  { id: "deco_tanabata_bamboo", raw: "set11_wardrobe_blue_tanabata_v3_raw.png", panel: "BL" },
  { id: "deco_christmas_tree_mini", raw: "set12_christmas_pumpkin_raw.png", panel: "TL" },
  { id: "deco_pumpkin_lantern", raw: "set12_christmas_pumpkin_raw.png", panel: "BL" },
]);

const BACKGROUND_MAX_DIFF = 115;
const BACKGROUND_MIN_BRIGHTNESS = 140;
const CLEAR_DIFF = 5;
const OPAQUE_DIFF = 150;
const CROP_ALPHA_THRESHOLD = 8;
const CROP_PADDING = 16;
const PANEL_EDGE_CLEAR_MARGIN = 3;
const MIN_COMPONENT_PIXELS = 64;
const MIN_COMPONENT_FRACTION = 0.005;
const MAX_FILE_BYTES = 3 * 1024 * 1024;

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function sha256File(filePath) {
  return sha256(await fs.readFile(filePath));
}

function median(values) {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

function estimateBackground(rgb, width, height) {
  const channels = [[], [], []];
  const band = Math.max(2, Math.min(10, Math.floor(Math.min(width, height) / 20)));

  const sample = (x, y) => {
    const offset = (y * width + x) * 3;
    const r = rgb[offset];
    const g = rgb[offset + 1];
    const b = rgb[offset + 2];
    if ((r + g + b) / 3 < 225) return;
    channels[0].push(r);
    channels[1].push(g);
    channels[2].push(b);
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x < band || x >= width - band || y < band || y >= height - band) {
        sample(x, y);
      }
    }
  }

  if (channels.some((channel) => channel.length === 0)) {
    return [255, 255, 255];
  }
  return channels.map((channel) => median(channel));
}

function pixelDiff(rgb, offset, background) {
  return Math.max(
    Math.abs(rgb[offset] - background[0]),
    Math.abs(rgb[offset + 1] - background[1]),
    Math.abs(rgb[offset + 2] - background[2]),
  );
}

function buildCandidateMask(rgb, width, height, background) {
  const candidate = new Uint8Array(width * height);
  const diffs = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i += 1) {
    const offset = i * 3;
    const diff = pixelDiff(rgb, offset, background);
    const brightness = (rgb[offset] + rgb[offset + 1] + rgb[offset + 2]) / 3;
    diffs[i] = diff;
    if (diff <= BACKGROUND_MAX_DIFF && brightness >= BACKGROUND_MIN_BRIGHTNESS) {
      candidate[i] = 1;
    }
  }

  return { candidate, diffs };
}

function floodExterior(candidate, width, height) {
  const exterior = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const enqueue = (index) => {
    if (!candidate[index] || exterior[index]) return;
    exterior[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  const neighborX = [-1, 0, 1, -1, 1, -1, 0, 1];
  const neighborY = [-1, -1, -1, 0, 0, 1, 1, 1];

  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % width;
    const y = Math.floor(index / width);
    for (let n = 0; n < 8; n += 1) {
      const nx = x + neighborX[n];
      const ny = y + neighborY[n];
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      enqueue(ny * width + nx);
    }
  }

  return exterior;
}

function punchPureWhiteHoles(candidate, diffs, exterior, width, height) {
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const component = new Int32Array(width * height);
  const neighborX = [-1, 0, 1, -1, 1, -1, 0, 1];
  const neighborY = [-1, -1, -1, 0, 0, 1, 1, 1];

  for (let start = 0; start < width * height; start += 1) {
    if (!candidate[start] || exterior[start] || seen[start]) continue;
    let head = 0;
    let tail = 0;
    let count = 0;
    let pureCount = 0;
    let diffTotal = 0;
    seen[start] = 1;
    queue[tail++] = start;

    while (head < tail) {
      const index = queue[head++];
      component[count++] = index;
      diffTotal += diffs[index];
      if (diffs[index] <= 10) pureCount += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      for (let n = 0; n < 8; n += 1) {
        const nx = x + neighborX[n];
        const ny = y + neighborY[n];
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = ny * width + nx;
        if (!candidate[next] || exterior[next] || seen[next]) continue;
        seen[next] = 1;
        queue[tail++] = next;
      }
    }

    const pureRatio = pureCount / count;
    const averageDiff = diffTotal / count;
    if (count >= 48 && pureRatio >= 0.55 && averageDiff <= 22) {
      for (let i = 0; i < count; i += 1) exterior[component[i]] = 1;
    }
  }
}

function alphaForDiff(diff) {
  if (diff <= CLEAR_DIFF) return 0;
  const normalized = Math.min(1, (diff - CLEAR_DIFF) / (OPAQUE_DIFF - CLEAR_DIFF));
  return Math.round(255 * Math.pow(normalized, 0.86));
}

function decontaminateChannel(value, background, alpha) {
  if (alpha <= 0) return 0;
  if (alpha >= 255) return value;
  const fraction = alpha / 255;
  return Math.max(
    0,
    Math.min(255, Math.round((value - background * (1 - fraction)) / fraction)),
  );
}

function makeRgba(rgb, width, height, background, exterior) {
  const rgba = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i += 1) {
    const rgbOffset = i * 3;
    const rgbaOffset = i * 4;
    const alpha = exterior[i]
      ? alphaForDiff(pixelDiff(rgb, rgbOffset, background))
      : 255;
    rgba[rgbaOffset] = decontaminateChannel(rgb[rgbOffset], background[0], alpha);
    rgba[rgbaOffset + 1] = decontaminateChannel(rgb[rgbOffset + 1], background[1], alpha);
    rgba[rgbaOffset + 2] = decontaminateChannel(rgb[rgbOffset + 2], background[2], alpha);
    rgba[rgbaOffset + 3] = alpha;
  }

  return rgba;
}

function clearPanelEdge(rgba, width, height) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (
        x >= PANEL_EDGE_CLEAR_MARGIN
        && x < width - PANEL_EDGE_CLEAR_MARGIN
        && y >= PANEL_EDGE_CLEAR_MARGIN
        && y < height - PANEL_EDGE_CLEAR_MARGIN
      ) {
        continue;
      }
      const offset = (y * width + x) * 4;
      rgba[offset] = 0;
      rgba[offset + 1] = 0;
      rgba[offset + 2] = 0;
      rgba[offset + 3] = 0;
    }
  }
}

function removeTinyAlphaComponents(rgba, width, height) {
  const pixelCount = width * height;
  const foreground = new Uint8Array(pixelCount);
  const seen = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  const components = [];

  for (let i = 0; i < pixelCount; i += 1) {
    if (rgba[i * 4 + 3] >= CROP_ALPHA_THRESHOLD) foreground[i] = 1;
  }

  for (let start = 0; start < pixelCount; start += 1) {
    if (!foreground[start] || seen[start]) continue;
    let head = 0;
    let tail = 0;
    seen[start] = 1;
    queue[tail++] = start;
    const pixels = [];
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    while (head < tail) {
      const index = queue[head++];
      pixels.push(index);
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const next = ny * width + nx;
          if (!foreground[next] || seen[next]) continue;
          seen[next] = 1;
          queue[tail++] = next;
        }
      }
    }
    components.push({ pixels, minX, minY, maxX, maxY });
  }

  const largest = Math.max(
    0,
    ...components.map((component) => component.pixels.length),
  );
  const keepThreshold = Math.max(
    MIN_COMPONENT_PIXELS,
    Math.floor(largest * MIN_COMPONENT_FRACTION),
  );
  let removedPixels = 0;
  let removedComponents = 0;
  let removedPanelLines = 0;
  for (const component of components) {
    const componentWidth = component.maxX - component.minX + 1;
    const componentHeight = component.maxY - component.minY + 1;
    const panelLine = (
      componentWidth >= width * 0.8 && componentHeight <= 6
    ) || (
      componentHeight >= height * 0.8 && componentWidth <= 6
    ) || (
      componentHeight <= 6
      && componentWidth >= Math.max(40, componentHeight * 20)
    ) || (
      componentWidth <= 6
      && componentHeight >= Math.max(40, componentWidth * 20)
    );
    if (component.pixels.length >= keepThreshold && !panelLine) continue;
    removedComponents += 1;
    if (panelLine) removedPanelLines += 1;
    removedPixels += component.pixels.length;
    for (const index of component.pixels) {
      const offset = index * 4;
      rgba[offset] = 0;
      rgba[offset + 1] = 0;
      rgba[offset + 2] = 0;
      rgba[offset + 3] = 0;
    }
  }
  return {
    componentCount: components.length,
    keepThreshold,
    removedComponents,
    removedPanelLines,
    removedPixels,
  };
}

function cropToAlpha(rgba, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] < CROP_ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error("No foreground alpha remained after background removal");
  }

  const contentWidth = maxX - minX + 1;
  const contentHeight = maxY - minY + 1;
  const cropWidth = contentWidth + CROP_PADDING * 2;
  const cropHeight = contentHeight + CROP_PADDING * 2;
  const cropped = Buffer.alloc(cropWidth * cropHeight * 4);

  for (let y = 0; y < contentHeight; y += 1) {
    const sourceStart = ((minY + y) * width + minX) * 4;
    const destinationStart = ((y + CROP_PADDING) * cropWidth + CROP_PADDING) * 4;
    rgba.copy(
      cropped,
      destinationStart,
      sourceStart,
      sourceStart + contentWidth * 4,
    );
  }

  return {
    data: cropped,
    width: cropWidth,
    height: cropHeight,
    sourceBbox: {
      left: minX,
      top: minY,
      width: contentWidth,
      height: contentHeight,
    },
    padding: CROP_PADDING,
  };
}

function horizontalFlip(rgba, width, height) {
  const flipped = Buffer.alloc(rgba.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const source = (y * width + x) * 4;
      const destination = (y * width + (width - 1 - x)) * 4;
      rgba.copy(flipped, destination, source, source + 4);
    }
  }
  return flipped;
}

function alphaStats(rgba, width, height) {
  let zero = 0;
  let partial = 0;
  let opaque = 0;
  let min = 255;
  let max = 0;
  for (let i = 3; i < rgba.length; i += 4) {
    const alpha = rgba[i];
    min = Math.min(min, alpha);
    max = Math.max(max, alpha);
    if (alpha === 0) zero += 1;
    else if (alpha === 255) opaque += 1;
    else partial += 1;
  }
  const total = width * height;
  const corners = [
    rgba[3],
    rgba[(width - 1) * 4 + 3],
    rgba[((height - 1) * width) * 4 + 3],
    rgba[(height * width - 1) * 4 + 3],
  ];
  return {
    min,
    max,
    zero,
    partial,
    opaque,
    nonzeroCoverage: Number(((partial + opaque) / total).toFixed(6)),
    opaqueCoverage: Number((opaque / total).toFixed(6)),
    corners,
  };
}

async function readPanel(asset) {
  const rawPath = path.join(RAW_DIR, asset.raw);
  const image = sharp(rawPath, { limitInputPixels: false });
  const metadata = await image.metadata();
  const rect = asset.rect ?? (asset.panel === "FULL"
    ? { left: 0, top: 0, width: metadata.width, height: metadata.height }
    : PANEL_RECTS[asset.panel]);
  if (!rect) throw new Error(`Unknown panel ${asset.panel} for ${asset.id}`);
  if (rect.left + rect.width > metadata.width || rect.top + rect.height > metadata.height) {
    throw new Error(
      `${asset.id}: ${asset.panel} ${JSON.stringify(rect)} exceeds ${metadata.width}x${metadata.height}`,
    );
  }
  const { data, info } = await sharp(rawPath, { limitInputPixels: false })
    .extract(rect)
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 3) {
    throw new Error(`${asset.id}: expected 3 RGB channels, received ${info.channels}`);
  }
  return { rgb: data, width: info.width, height: info.height, rect, rawPath };
}

async function writeRgbaPng(filePath, rgba, width, height) {
  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    .toFile(filePath);
}

async function decodedRgba(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

async function main() {
  await fs.mkdir(FINAL_DIR, { recursive: true });
  const usedRawNames = [...new Set(ASSETS.map((asset) => asset.raw))].sort();
  const allRawNames = (await fs.readdir(RAW_DIR))
    .filter((name) => name.toLowerCase().endsWith(".png"))
    .sort();
  const rawBefore = Object.fromEntries(
    await Promise.all(
      allRawNames.map(async (name) => [name, await sha256File(path.join(RAW_DIR, name))]),
    ),
  );

  const records = [];
  for (const asset of ASSETS) {
    const panel = await readPanel(asset);
    const background = estimateBackground(panel.rgb, panel.width, panel.height);
    const { candidate, diffs } = buildCandidateMask(
      panel.rgb,
      panel.width,
      panel.height,
      background,
    );
    const exterior = floodExterior(candidate, panel.width, panel.height);
    if (asset.punchPureWhiteHoles && !asset.preserveEnclosedWhite) {
      punchPureWhiteHoles(candidate, diffs, exterior, panel.width, panel.height);
    }
    const rgba = makeRgba(
      panel.rgb,
      panel.width,
      panel.height,
      background,
      exterior,
    );
    clearPanelEdge(rgba, panel.width, panel.height);
    const componentCleanup = removeTinyAlphaComponents(
      rgba,
      panel.width,
      panel.height,
    );
    const cropped = cropToAlpha(rgba, panel.width, panel.height);
    const sourceOrientation = asset.sourceOrientation ?? "A";
    const flipped = horizontalFlip(cropped.data, cropped.width, cropped.height);
    const finalA = sourceOrientation === "B" ? flipped : cropped.data;
    const finalB = sourceOrientation === "B" ? cropped.data : flipped;
    const aPath = path.join(FINAL_DIR, `${asset.id}_A.png`);
    const bPath = path.join(FINAL_DIR, `${asset.id}_B.png`);

    await writeRgbaPng(aPath, finalA, cropped.width, cropped.height);
    await writeRgbaPng(bPath, finalB, cropped.width, cropped.height);

    const decodedA = await decodedRgba(aPath);
    const decodedB = await decodedRgba(bPath);
    const decodedFlipA = horizontalFlip(decodedA.data, decodedA.width, decodedA.height);
    const aStat = await fs.stat(aPath);
    const bStat = await fs.stat(bPath);
    const statsA = alphaStats(decodedA.data, decodedA.width, decodedA.height);
    const statsB = alphaStats(decodedB.data, decodedB.width, decodedB.height);
    const flipExact = decodedFlipA.equals(decodedB.data);

    if (decodedA.channels !== 4 || decodedB.channels !== 4) {
      throw new Error(`${asset.id}: final output is not decoded RGBA`);
    }
    if (!statsA.corners.every((alpha) => alpha === 0)) {
      throw new Error(`${asset.id}: A corners are not fully transparent: ${statsA.corners}`);
    }
    if (!statsB.corners.every((alpha) => alpha === 0)) {
      throw new Error(`${asset.id}: B corners are not fully transparent: ${statsB.corners}`);
    }
    if (statsA.nonzeroCoverage <= 0.03 || statsA.nonzeroCoverage >= 0.95) {
      throw new Error(`${asset.id}: implausible alpha coverage ${statsA.nonzeroCoverage}`);
    }
    if (!flipExact) throw new Error(`${asset.id}: B is not the pixel-exact horizontal flip of A`);
    if (aStat.size >= MAX_FILE_BYTES || bStat.size >= MAX_FILE_BYTES) {
      throw new Error(`${asset.id}: output exceeds the 3 MB limit`);
    }

    records.push({
      id: asset.id,
      source: {
        raw: path.relative(REPO_ROOT, panel.rawPath),
        rawSha256: rawBefore[asset.raw],
        panel: asset.panel,
        panelRect: panel.rect,
        sourceOrientation,
        backgroundRgb: background,
      },
      crop: cropped.sourceBbox,
      padding: cropped.padding,
      componentCleanup,
      dimensions: { width: cropped.width, height: cropped.height },
      A: {
        path: path.relative(REPO_ROOT, aPath),
        channels: decodedA.channels,
        bytes: aStat.size,
        sha256: await sha256File(aPath),
        alpha: statsA,
      },
      B: {
        path: path.relative(REPO_ROOT, bPath),
        channels: decodedB.channels,
        bytes: bStat.size,
        sha256: await sha256File(bPath),
        alpha: statsB,
      },
      bIsPixelExactHorizontalFlipOfA: flipExact,
    });
  }

  const rawAfter = Object.fromEntries(
    await Promise.all(
      allRawNames.map(async (name) => [name, await sha256File(path.join(RAW_DIR, name))]),
    ),
  );
  const rawUnchanged = allRawNames.every((name) => rawBefore[name] === rawAfter[name]);
  if (!rawUnchanged) throw new Error("One or more source raw files changed during processing");

  const qa = {
    batch: "1371-room-furniture-repertoire-expansion",
    correctionBatch: "1371c-room-furniture-angle-correction",
    processor: path.relative(REPO_ROOT, fileURLToPath(import.meta.url)),
    settings: {
      backgroundMaxDiff: BACKGROUND_MAX_DIFF,
      backgroundMinBrightness: BACKGROUND_MIN_BRIGHTNESS,
      clearDiff: CLEAR_DIFF,
      opaqueDiff: OPAQUE_DIFF,
      cropAlphaThreshold: CROP_ALPHA_THRESHOLD,
      cropPadding: CROP_PADDING,
      panelEdgeClearMargin: PANEL_EDGE_CLEAR_MARGIN,
      minComponentPixels: MIN_COMPONENT_PIXELS,
      minComponentFraction: MIN_COMPONENT_FRACTION,
    },
    summary: {
      assetCount: records.length,
      outputCount: records.length * 2,
      allDecodedRgba: records.every(
        (record) => record.A.channels === 4 && record.B.channels === 4,
      ),
      allCornersTransparent: records.every(
        (record) => record.A.alpha.corners.every((value) => value === 0)
          && record.B.alpha.corners.every((value) => value === 0),
      ),
      allBPixelExactFlipOfA: records.every(
        (record) => record.bIsPixelExactHorizontalFlipOfA,
      ),
      allUnder3Mb: records.every(
        (record) => record.A.bytes < MAX_FILE_BYTES && record.B.bytes < MAX_FILE_BYTES,
      ),
      rawSourcesUnchanged: rawUnchanged,
    },
    rawSourcesBefore: rawBefore,
    rawSourcesAfter: rawAfter,
    usedRawSources: usedRawNames,
    assets: records,
  };

  await fs.writeFile(QA_PATH, `${JSON.stringify(qa, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(qa.summary, null, 2));
  console.log(`QA: ${path.relative(REPO_ROOT, QA_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
