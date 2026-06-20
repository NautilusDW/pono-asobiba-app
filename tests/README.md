# Playwright E2E Harness

Capture.js verification tests for pono-asobiba-app.

## Setup

```
npm install
npx playwright install chromium
npm run test:e2e
```

`npm run test:e2e` boots `python -m http.server 8000` automatically (see
`playwright.config.ts`). Run a single sanity test with
`npx playwright test sanity.spec.ts`. UI mode: `npm run test:e2e:ui`.
Nightly smoke against the staging worker: `npm run test:e2e:smoke`.
