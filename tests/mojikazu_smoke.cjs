const { chromium } = require("playwright");
const assert = require("node:assert/strict");

const base = process.env.MOJIKAZU_BASE_URL || "http://127.0.0.1:4178";
const pages = [
  "/mojikazu/",
  "/mojikazu/junban-touch/",
  "/mojikazu/suuji-pachinko/",
  "/mojikazu/suuji-train/",
  "/mojikazu/kazu-jump/"
];
const viewports = [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 }
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      for (const path of pages) {
        const page = await browser.newPage({ viewport });
        const errors = [];
        page.on("pageerror", (error) => errors.push(String(error)));
        page.on("response", (response) => {
          if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
        });
        await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        assert.equal(overflow, false, `${path} overflows at ${viewport.width}x${viewport.height}`);
        assert.deepEqual(errors, [], `${path} errors at ${viewport.width}x${viewport.height}`);
        await page.close();
      }
    }

    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });

    await page.goto(`${base}/mojikazu/junban-touch/`);
    for (let value = 1; value <= 5; value += 1) {
      await page.locator(`.number-button[data-number="${value}"]`).click();
    }
    await page.locator("#celebration:not([hidden])").waitFor();

    await page.goto(`${base}/mojikazu/suuji-train/`);
    await page.locator('[data-mode="five"]').click();
    for (let value = 1; value <= 5; value += 1) {
      await page.locator(`.piece[data-number="${value}"]`).click();
      await page.locator(`.slot[data-number="${value}"]`).click();
    }
    await page.locator("#finish:not([hidden])").waitFor();

    await page.goto(`${base}/mojikazu/kazu-jump/`);
    await page.locator('[data-level="5"]').click();
    for (let value = 2; value <= 5; value += 1) {
      await page.locator(`.platform[data-value="${value}"]`).click();
      await page.waitForTimeout(680);
    }
    await page.locator("#finish:not([hidden])").waitFor();

    await page.goto(`${base}/mojikazu/suuji-pachinko/`);
    await page.locator('[data-level="easy"]').click();
    const wanted = Number((await page.locator("#prompt").textContent()).match(/\d+/)[0]);
    await page.locator(".number-ball", { hasText: String(wanted) }).first().click();
    await page.waitForTimeout(800);
    assert.equal(await page.locator("#roundLabel").textContent(), "2 / 5");
    await page.close();

    const titlePage = await browser.newPage({ viewport: { width: 844, height: 390 } });
    await titlePage.addInitScript(() => {
      window.__APP_BUILD__ = 1;
      localStorage.setItem("pono_tap_intro_seen_v1", "1");
    });
    await titlePage.goto(`${base}/play.html`, { waitUntil: "domcontentloaded" });
    await titlePage.locator('.game-card[data-id="mojikazu"]').first().waitFor({ state: "attached" });
    await titlePage.close();
  } finally {
    await browser.close();
  }
  console.log("mojikazu smoke: PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
