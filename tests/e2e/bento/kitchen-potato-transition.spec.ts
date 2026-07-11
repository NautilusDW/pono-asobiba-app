import { expect, test, type Page } from '@playwright/test';

test.use({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 2,
  serviceWorkers: 'block',
});

const MASH_BASE = '/assets/images/bento/cooking/potato/potato_boiled_001.png';
const MASH_NEXT = '/assets/images/bento/cooking/potato/potato_mash_002.png';
const MIX_STATE_0 = '/assets/images/bento/cooking/korokke/prep/storybook_v1247/korokke_mix_storybook_state0.png';

type Rgb = [number, number, number];

function distance(a: Rgb, b: Rgb): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

async function enterPotatoMash(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as Window & { __APP_BUILD__?: number }).__APP_BUILD__ = 1;
  });
  await page.goto('/bento/kitchen.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#mode-prep-btn').click();
  await page.locator('.ingredient-btn[data-id="potato"]').click();
  const board = page.locator('#cutting-board');
  await expect(board).toBeVisible();
  for (let index = 0; index < 14; index++) {
    if ((await page.locator('#prep-stage').getAttribute('data-prep-kind')) === 'mash_potato') break;
    await board.press('Enter');
    // One cut is committed at the knife impact; wait until the blade has
    // released so the next keyboard press is not intentionally coalesced.
    await page.waitForTimeout(440);
  }
  await expect(page.locator('#prep-stage')).toHaveAttribute('data-prep-kind', 'mash_potato', { timeout: 8_000 });
  await page.waitForFunction(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#knead-canvas');
    return !!canvas && canvas.width > 300 && canvas.height > 150;
  });
}

async function findUpperLeftProbe(page: Page): Promise<{ u: number; v: number }> {
  return page.evaluate(async ({ baseSrc, nextSrc }) => {
    const load = async (src: string): Promise<HTMLImageElement> => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return image;
    };
    const [base, next] = await Promise.all([load(baseSrc), load(nextSrc)]);
    const canvas = document.createElement('canvas');
    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2d context unavailable');
    ctx.drawImage(base, 0, 0);
    const a = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(next, 0, 0);
    const b = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let best = { u: 0.25, v: 0.22, score: -1 };
    for (let y = Math.floor(canvas.height * 0.2); y <= Math.floor(canvas.height * 0.29); y++) {
      for (let x = Math.floor(canvas.width * 0.21); x <= Math.floor(canvas.width * 0.3); x++) {
        const offset = (y * canvas.width + x) * 4;
        const score = Math.abs(a[offset] - b[offset])
          + Math.abs(a[offset + 1] - b[offset + 1])
          + Math.abs(a[offset + 2] - b[offset + 2]);
        if (score > best.score) best = { u: (x + 0.5) / canvas.width, v: (y + 0.5) / canvas.height, score };
      }
    }
    if (best.score < 30) throw new Error(`upper-left source images are not visually distinct enough: ${best.score}`);
    return { u: best.u, v: best.v };
  }, { baseSrc: MASH_BASE, nextSrc: MASH_NEXT });
}

async function findOuterPlateProbe(page: Page): Promise<{ u: number; v: number }> {
  return page.evaluate(async ({ baseSrc, nextSrc }) => {
    const load = async (src: string): Promise<HTMLImageElement> => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return image;
    };
    const [base, next] = await Promise.all([load(baseSrc), load(nextSrc)]);
    const canvas = document.createElement('canvas');
    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2d context unavailable');
    ctx.drawImage(base, 0, 0);
    const a = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(next, 0, 0);
    const b = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let best = { u: 0.1, v: 0.5, score: -1 };
    for (let y = Math.floor(canvas.height * 0.44); y <= Math.floor(canvas.height * 0.56); y++) {
      for (let x = Math.floor(canvas.width * 0.07); x <= Math.floor(canvas.width * 0.14); x++) {
        const offset = (y * canvas.width + x) * 4;
        const score = Math.abs(a[offset] - b[offset])
          + Math.abs(a[offset + 1] - b[offset + 1])
          + Math.abs(a[offset + 2] - b[offset + 2]);
        if (score > best.score) best = { u: (x + 0.5) / canvas.width, v: (y + 0.5) / canvas.height, score };
      }
    }
    if (best.score < 20) throw new Error(`outer plate source images are not visually distinct enough: ${best.score}`);
    return { u: best.u, v: best.v };
  }, { baseSrc: MASH_BASE, nextSrc: MASH_NEXT });
}

async function sampleCanvasAndAssets(
  page: Page,
  u: number,
  v: number,
  firstSrc: string,
  secondSrc: string,
): Promise<{ actual: Rgb; first: Rgb; second: Rgb }> {
  return page.evaluate(async ({ u, v, firstSrc, secondSrc }) => {
    const live = document.querySelector<HTMLCanvasElement>('#knead-canvas');
    if (!live) throw new Error('knead canvas missing');
    const load = async (src: string): Promise<HTMLImageElement> => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return image;
    };
    const [firstImage, secondImage] = await Promise.all([load(firstSrc), load(secondSrc)]);
    const render = (image: HTMLImageElement): HTMLCanvasElement => {
      const canvas = document.createElement('canvas');
      canvas.width = live.width;
      canvas.height = live.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('reference 2d context unavailable');
      const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      return canvas;
    };
    const first = render(firstImage);
    const second = render(secondImage);
    const fitScale = Math.min(live.width / firstImage.naturalWidth, live.height / firstImage.naturalHeight);
    const fitWidth = firstImage.naturalWidth * fitScale;
    const fitHeight = firstImage.naturalHeight * fitScale;
    const x = Math.round((live.width - fitWidth) / 2 + fitWidth * u);
    const y = Math.round((live.height - fitHeight) / 2 + fitHeight * v);
    const average = (canvas: HTMLCanvasElement): Rgb => {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('sample 2d context unavailable');
      const data = ctx.getImageData(Math.max(0, x - 2), Math.max(0, y - 2), 5, 5).data;
      let r = 0; let g = 0; let b = 0;
      for (let index = 0; index < data.length; index += 4) {
        r += data[index]; g += data[index + 1]; b += data[index + 2];
      }
      const count = data.length / 4;
      return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
    };
    return { actual: average(live), first: average(first), second: average(second) };
  }, { u, v, firstSrc, secondSrc });
}

async function pointForUv(page: Page, u: number, v: number): Promise<{ x: number; y: number }> {
  return page.evaluate(({ u, v }) => {
    const canvas = document.querySelector<HTMLCanvasElement>('#knead-canvas');
    if (!canvas) throw new Error('knead canvas missing');
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(canvas.width / 380, canvas.height / 220);
    const fitWidth = 380 * scale;
    const fitHeight = 220 * scale;
    const internalX = (canvas.width - fitWidth) / 2 + fitWidth * u;
    const internalY = (canvas.height - fitHeight) / 2 + fitHeight * v;
    return {
      x: rect.left + internalX * rect.width / canvas.width,
      y: rect.top + internalY * rect.height / canvas.height,
    };
  }, { u, v });
}

test('upper-left old potato contour is locally replaced before the stage snap', async ({ page }) => {
  test.setTimeout(45_000);
  await enterPotatoMash(page);

  const probe = await findUpperLeftProbe(page);
  const before = await sampleCanvasAndAssets(page, probe.u, probe.v, MASH_BASE, MASH_NEXT);
  expect(distance(before.actual, before.first)).toBeLessThanOrEqual(4);

  // The accounting cell is inside the upper-left zone, while the probe lies
  // beyond that zone but within the physical masher footprint. This is the
  // exact regression that the former zone-clipped visual mask could not paint.
  const press = await pointForUv(page, 9.5 / 36, 6.5 / 22);
  await page.mouse.click(press.x, press.y);
  await expect(page.locator('#prep-stage')).toHaveAttribute('data-mash-stage', '0');
  await page.waitForFunction(() => Number(document.querySelector<HTMLElement>('#prep-stage')?.dataset.mashAdded || 0) > 0);
  await page.waitForTimeout(120);

  const after = await sampleCanvasAndAssets(page, probe.u, probe.v, MASH_BASE, MASH_NEXT);
  expect(distance(after.actual, after.first)).toBeGreaterThan(10);
  expect(distance(after.actual, after.second)).toBeLessThan(distance(after.actual, after.first));
  expect(Number(await page.locator('#prep-stage').getAttribute('data-mash-coverage'))).toBeLessThan(0.98);

  const untouched = await sampleCanvasAndAssets(page, 0.74, 0.7, MASH_BASE, MASH_NEXT);
  expect(distance(untouched.actual, untouched.first)).toBeLessThanOrEqual(4);
});

test('leaving and re-entering the potato starts a new stroke instead of bridging across the plate', async ({ page }) => {
  test.setTimeout(45_000);
  await enterPotatoMash(page);

  const probe = await findOuterPlateProbe(page);
  const before = await sampleCanvasAndAssets(page, probe.u, probe.v, MASH_BASE, MASH_NEXT);
  expect(distance(before.first, before.second)).toBeGreaterThan(12);
  expect(distance(before.actual, before.first)).toBeLessThanOrEqual(4);

  const start = await pointForUv(page, 0.35, 0.5);
  const outside = await pointForUv(page, 0.04, 0.5);
  const reentry = await pointForUv(page, 0.51, 0.5);
  const continueInside = await pointForUv(page, 0.55, 0.5);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(outside.x, outside.y);
  await page.mouse.move(reentry.x, reentry.y);
  await page.mouse.move(continueInside.x, continueInside.y);
  await page.mouse.up();
  await page.waitForTimeout(120);

  const after = await sampleCanvasAndAssets(page, probe.u, probe.v, MASH_BASE, MASH_NEXT);
  expect(distance(after.actual, after.first)).toBeLessThanOrEqual(4);
});

test('mix keeps the mash footprint and starts from the storybook state', async ({ page }) => {
  test.setTimeout(55_000);
  await enterPotatoMash(page);
  const mashBox = await page.locator('#knead-canvas').boundingBox();
  expect(mashBox).not.toBeNull();

  const stage = page.locator('#prep-stage');
  for (let index = 0; index < 75; index++) {
    if ((await stage.getAttribute('data-prep-kind')) !== 'mash_potato') break;
    await stage.press('Enter');
    await page.waitForTimeout(28);
  }
  await expect(stage).toHaveAttribute('data-prep-kind', 'mix_mince_potato', { timeout: 8_000 });
  await page.waitForFunction(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#knead-canvas');
    const stage = document.querySelector<HTMLElement>('#prep-stage');
    return !!canvas && canvas.width > 300 && stage?.dataset.mixLocalReveal === '1';
  });

  const mixBox = await page.locator('#knead-canvas').boundingBox();
  expect(mixBox).not.toBeNull();
  expect(Math.abs((mixBox?.width || 0) - (mashBox?.width || 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((mixBox?.height || 0) - (mashBox?.height || 0))).toBeLessThanOrEqual(1);

  const center = await sampleCanvasAndAssets(
    page,
    0.5,
    0.47,
    MIX_STATE_0,
    '/assets/images/bento/cooking/potato/potato_mash_003.png',
  );
  expect(distance(center.actual, center.first)).toBeLessThanOrEqual(5);
  expect(distance(center.actual, center.second)).toBeGreaterThan(12);
});
