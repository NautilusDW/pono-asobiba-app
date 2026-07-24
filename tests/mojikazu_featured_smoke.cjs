const { chromium } = require("playwright");
const assert = require("node:assert/strict");

const base = process.env.BASE_URL || "http://127.0.0.1:4178";
const viewports = [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
];
const pages = [
  ["hub", "/mojikazu/featured/", "#stage"],
  ["oekaki", "/mojikazu/featured/oekaki/", "#stage"],
  ["dungeon", "/mojikazu/featured/dungeon/", "#stage"],
  ["mahou", "/mojikazu/featured/mahou-koubou/", "#stage"],
  ["karakuri", "/mojikazu/featured/karakuri-iseki/", "#stage"],
  ["tantei", "/mojikazu/featured/tantei/", ".stage"],
];

async function openChecked(page, path) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
  assert(response && response.ok(), `${path}: HTTP ${response && response.status()}`);
  await page.waitForTimeout(150);
  assert.deepEqual(errors, [], `${path}: pageerror ${errors.join(" | ")}`);
}

async function verifyLayouts(browser) {
  for (const viewport of viewports) {
    for (const [name, path, stageSelector] of pages) {
      const page = await browser.newPage({ viewport });
      await openChecked(page, path);
      const metrics = await page.locator(stageSelector).evaluate((stage) => {
        const rect = stage.getBoundingClientRect();
        return {
          ratio: rect.width / rect.height,
          width: rect.width,
          height: rect.height,
          pageOverflow:
            document.documentElement.scrollWidth > window.innerWidth + 1 ||
            document.documentElement.scrollHeight > window.innerHeight + 1,
        };
      });
      assert(Math.abs(metrics.ratio - 16 / 9) < 0.01, `${name}: ratio ${metrics.ratio}`);
      assert(metrics.width <= viewport.width + 1, `${name}: width overflow`);
      assert(metrics.height <= viewport.height + 1, `${name}: height overflow`);
      assert.equal(metrics.pageOverflow, false, `${name}: document overflow`);
      await page.close();
    }
  }
}

async function verifyHubAndCard(browser) {
  const hub = await browser.newPage({ viewport: { width: 844, height: 390 } });
  await openChecked(hub, "/mojikazu/featured/");
  assert.equal(await hub.locator(".card").count(), 5, "hub must contain exactly five games");
  await hub.screenshot({ path: "/tmp/mojikazu-featured-hub.png" });
  await hub.close();

  const play = await browser.newPage({ viewport: { width: 844, height: 390 } });
  await play.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    localStorage.setItem("pono_age", "5");
  });
  await openChecked(play, "/play.html");
  const card = play.locator('.game-card[data-id="mojikazu"]').first();
  await card.waitFor({ state: "visible" });
  assert.match(await card.innerText(), /もじ.*かず.*ぼうけん/s);
  await play.close();
}

async function verifyKarakuri(browser) {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  await openChecked(page, "/mojikazu/featured/karakuri-iseki/");
  await page.locator('[data-weight="2"]').click();
  await page.locator('[data-weight="3"]').click();
  await page.waitForTimeout(1600);
  for (let i = 0; i < 3; i += 1) await page.locator("#leftBucket").click();
  for (let i = 0; i < 3; i += 1) await page.locator("#rightBucket").click();
  await page.waitForTimeout(1700);
  for (const value of [2, 4, 6, 8]) await page.locator(`[data-number="${value}"]`).click();
  await page.locator("#finish").waitFor({ state: "visible" });
  await page.screenshot({ path: "/tmp/mojikazu-karakuri-finish.png" });
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await verifyLayouts(browser);
    await verifyHubAndCard(browser);
    await verifyKarakuri(browser);
    console.log("mojikazu featured smoke: PASS");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
