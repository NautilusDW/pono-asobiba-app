import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the pono-asobiba-app capture.js E2E harness.
 *
 * - Default project (`chromium-localhost`) runs against `python -m http.server 8000`.
 *   capture.js's hostname guard always treats `localhost` as enabled, so no shim is
 *   required for the local project.
 * - `chromium-staging-smoke` runs only tests tagged `@smoke` against the app staging
 *   worker. This project is opt-in (invoke with `--project=chromium-staging-smoke`)
 *   and is intended for nightly use; do NOT enable it for the default test run.
 *
 * The local `webServer` block boots `python -m http.server 8000` from the repo root.
 * `reuseExistingServer: true` lets a long-running dev server be reused so iterative
 * runs don't fight over port 8000.
 */
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results/',
  fullyParallel: true,
  workers: 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:8000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  webServer: {
    // capture.js is a pure-client module; `python -m http.server` is sufficient
    // and avoids wrangler/SW interference in tests.
    command: 'python -m http.server 8000',
    port: 8000,
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  projects: [
    {
      name: 'chromium-localhost',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:8000',
      },
    },
    {
      name: 'chromium-staging-smoke',
      grep: /@smoke/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://pono-asobiba-app-staging.ndw.workers.dev',
      },
    },
  ],
});
