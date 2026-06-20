import type { Download, Page } from '@playwright/test';

/**
 * Mirror of capture.js's PRESETS array.
 *
 * SOURCE OF TRUTH: `common/capture.js` (variable `PRESETS`). This file is a
 * static TypeScript copy so tests can `expect(download.suggestedFilename())`
 * and `expect(readPngSize(...)).toEqual({ width, height })` against literals
 * without parsing the runtime config. If capture.js drifts, a separate parity
 * check job (TBD) should fail. Until then, update this constant by hand when
 * `PRESETS` changes in capture.js.
 */
export interface CapturePreset {
  id: string;
  label: string;
  w: number;
  h: number;
}

export const PRESETS: readonly CapturePreset[] = [
  { id: 'lp-16x9', label: 'LP 16:9 (1920×1080)', w: 1920, h: 1080 },
  { id: 'lp-9x16', label: '縦 9:16 (1080×1920)', w: 1080, h: 1920 },
  { id: 'square', label: 'スクエア (1080×1080)', w: 1080, h: 1080 },
  { id: 'ios-65', label: 'App Store 6.5" (1284×2778)', w: 1284, h: 2778 },
] as const;

const OVERLAY_SELECTOR = '.pono-capture-overlay';

/**
 * Unregister any existing service workers and clear site-local storage so the
 * page loads a fresh capture.js bundle. capture.js itself does not register a
 * SW, but the host games do (`sw.js`) and a stale SW would serve cached HTML
 * without the `?capture=1` query reaching capture.js init.
 */
export async function clearServiceWorkers(page: Page): Promise<void> {
  await page.context().clearCookies();
  try {
    await page.context().clearPermissions();
  } catch {
    // older Playwright versions may not implement this for chromium — safe to ignore
  }
  // Navigate to the origin so we can run `navigator.serviceWorker.getRegistrations()`.
  // about:blank cannot reach navigator.serviceWorker in some envs.
  await page.goto('/', { waitUntil: 'domcontentloaded' }).catch(() => {
    /* root might 404 on python http.server; that's fine */
  });
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
}

/**
 * Goto a capture-enabled URL and wait for the overlay to be rendered.
 *
 * Use this whenever the test URL contains `?capture=1`. It waits up to 5 s for
 * `.pono-capture-overlay` to be visible — long enough to cover initial bundle
 * parse on slow CI machines but short enough that hostname-gate regressions
 * fail fast.
 */
export async function gotoWithCapture(page: Page, url: string): Promise<void> {
  await clearServiceWorkers(page);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(OVERLAY_SELECTOR, { state: 'visible', timeout: 5_000 });
}

/**
 * Inject a `location.hostname` override BEFORE any page script runs. Used to
 * exercise capture.js's hostname gate without ever pointing the test at the
 * real production worker.
 */
export async function shimHostname(page: Page, hostname: string): Promise<void> {
  await page.addInitScript((h: string) => {
    try {
      Object.defineProperty(window.location, 'hostname', {
        value: h,
        configurable: true,
      });
    } catch {
      /* ignore — some chromium builds disallow this; tests should detect via overlay presence */
    }
  }, hostname);
}

/**
 * Seed a sessionStorage key before page scripts run. Useful for cue-replay
 * flags, capture overrides, etc.
 */
export async function seedSessionStorage(
  page: Page,
  key: string,
  value: string,
): Promise<void> {
  await page.addInitScript(
    ({ k, v }: { k: string; v: string }) => {
      try {
        sessionStorage.setItem(k, v);
      } catch {
        /* ignore */
      }
    },
    { k: key, v: value },
  );
}

/**
 * Convenience: seed `pono_capture_tier_override=1` (PonoTier.setCaptureOverride
 * equivalent) so capture.js shows the overlay regardless of saved tier.
 */
export async function setCaptureTierOverride(page: Page): Promise<void> {
  await seedSessionStorage(page, 'pono_capture_tier_override', '1');
}

/**
 * Click a preset button in the overlay and wait for the download to start.
 *
 * The overlay's shoot button does not vary per preset; instead it uses a
 * `<select>` element whose value is the preset `id`. We set that value first,
 * then click `.pc-shoot` and wait for `'download'`.
 */
export async function shootAndGetDownload(
  page: Page,
  preset: { id: string },
): Promise<Download> {
  const overlay = page.locator(OVERLAY_SELECTOR);
  await overlay.locator('select').selectOption(preset.id);
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15_000 }),
    overlay.locator('.pc-shoot').click(),
  ]);
  return download;
}

export const CAPTURE_OVERLAY_SELECTOR = OVERLAY_SELECTOR;
