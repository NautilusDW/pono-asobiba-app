#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const html = read("nazonazo-tunnel/index.html");
const css = read("nazonazo-tunnel/styles.css");
const game = read("nazonazo-tunnel/js/game.js");
const artSource = read("nazonazo-tunnel/data/quiz-art.js");

/* The shared wooden control is reused without importing common/menu.js side effects or emoji. */
assert.doesNotMatch(html, /common\/menu\.js/, "the full-screen game must not import the shared viewport mutator");
assert.match(html, /id="gameSettings"[\s\S]*?id="settingsBtn"[^>]*type="button"[^>]*aria-label="せってい"[^>]*aria-haspopup="menu"[^>]*aria-controls="settingsDropdown"[^>]*aria-expanded="false"/);
assert.match(html, /id="settingsBtn"[\s\S]{0,260}?src="\.\.\/assets\/_legacy\/preview-placeholders\/ctrl-btn-settings\.png"/,
  "the established wooden settings artwork must be reused");
assert.match(html, /id="settingsDropdown"[^>]*role="menu"[^>]*aria-label="せってい"[^>]*aria-hidden="true"[^>]*hidden/);
assert.match(html, /id="mapMenuBtn"[^>]*role="menuitem"[\s\S]{0,180}?data-ui-art="map"[^>]*data-ui-art-eager="1"[\s\S]{0,100}?ちず/);
assert.match(html, /id="returnHomeLink"[^>]*href="\.\.\/play\.html"[^>]*role="menuitem"[\s\S]{0,180}?data-ui-art="home"[^>]*data-ui-art-eager="1"[\s\S]{0,100}?ホームへ もどる/);
const settingsMarkup = html.slice(html.indexOf('<div id="gameSettings"'), html.indexOf('<div id="rotateHint"'));
assert.doesNotMatch(settingsMarkup, /\p{Extended_Pictographic}/u, "the new menu must not reintroduce platform emoji");
assert.match(html, /styles\.css\?v=20260721-1408/);
assert.match(html, /data\/quiz-art\.js\?v=20260721-1408/);
assert.match(html, /js\/game\.js\?v=20260721-1408/);

const artSandbox = { window: {} };
vm.runInNewContext(artSource, artSandbox, { filename: "quiz-art.js" });
const homeArt = artSandbox.window.PonoNazonazoQuizArt?.ui?.home;
assert.equal(homeArt, "../assets/ui/gacha/daily_gacha_action_home_normal.png");
assert.ok(fs.existsSync(path.resolve(root, "nazonazo-tunnel", homeArt)), "generated home artwork is missing");

/* It remains reachable above tunnel/full-screen overlays and fits short landscape screens. */
assert.match(css, /#gameSettings\{[^}]*position:fixed[^}]*right:max\(12px,env\(safe-area-inset-right\)\)[^}]*z-index:120[^}]*width:56px/);
assert.match(css, /#settingsBtn\{[^}]*width:56px[^}]*height:56px[^}]*pointer-events:auto/);
assert.match(css, /#settingsDropdown\{[^}]*top:58px[^}]*min-width:210px[^}]*pointer-events:auto/);
assert.match(css, /#settingsDropdown\[hidden\]\{display:none\}/);
assert.match(css, /\.settings-menu-item\{[^}]*min-height:52px/);
assert.match(css, /@media \(orientation:landscape\) and \(max-height:360px\)[\s\S]*?#settingsBtn\{width:48px;height:48px\}[\s\S]*?\.settings-menu-item\{min-height:48px/);
assert.match(css, /body\.nazonazo-admin-stage-preview #gameSettings\{display:none!important\}/);
assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*?#settingsBtn,\.settings-menu-item\{transition:none!important\}/);

/* Local state owns ARIA, focus, key navigation and outside-tap consumption. */
for (const fn of [
  "gameSettingsMenuItems", "gameSettingsMenuIsOpen", "focusGameSettingsItem",
  "setGameSettingsOpen", "closeGameSettings", "initGameSettingsMenu"
]) assert.match(game, new RegExp(`function ${fn}\\(`), `${fn}: menu lifecycle function missing`);
assert.match(game, /settingsDropdown\.hidden=!next[\s\S]{0,180}?aria-hidden[\s\S]{0,180}?aria-expanded/,
  "open state must synchronize hidden and ARIA state");
assert.match(game, /item\.tabIndex=next\?0:-1/, "closed menu items must leave the tab order");
assert.match(game, /image\.loading=holder\.dataset\.uiArtEager==="1"\?"eager":"lazy"/,
  "dropdown artwork must already be available on the first open");
assert.match(game, /event\.key==="Escape"[\s\S]{0,180}?restoreFocus:true/, "Escape must close and restore focus");
for (const key of ["ArrowDown", "ArrowUp", "Home", "End"]) {
  assert.match(game, new RegExp(`event\\.key===\"${key}\"`), `${key}: keyboard menu navigation missing`);
}
assert.match(game, /document\.addEventListener\("pointerdown"[\s\S]{0,260}?stopImmediatePropagation\(\)[\s\S]{0,80}?closeGameSettings\(\)[\s\S]{0,20}?\},true\)/,
  "the tap used to close the menu must not leak into a quiz or steering surface");
assert.match(game, /event\.target!==settingsOutsideClickTarget/,
  "outside-click suppression must not swallow a fast follow-up tap on Home");
assert.match(game, /bindTap\(mapMenuBtn,[\s\S]{0,120}?closeGameSettings\(\)[\s\S]{0,260}?openMap\(\)/,
  "the former one-tap map action must remain available inside settings");
assert.match(game, /if\(settingsBtn&&entry\.index===0\)[\s\S]{0,260}?settingsBtn\.getBoundingClientRect\(\)/,
  "moving sea choices must reserve the visible settings button instead of a hidden map item");
assert.doesNotMatch(game, /\bhomeBtn\b/, "the removed HUD map button must not survive as stale runtime state");
assert.match(game, /visibilitychange[\s\S]{0,100}?closeGameSettings\(\)/);
assert.match(game, /pageshow[\s\S]{0,100}?closeGameSettings\(\)/);
assert.match(game, /pagehide[\s\S]{0,100}?closeGameSettings\(\)/);

async function runBrowserCheck() {
  const browserName = process.env.NAZONAZO_BROWSER;
  if (!browserName) return;
  const base = (process.env.NAZONAZO_BASE_URL || "http://127.0.0.1:8874").replace(/\/$/, "");
  const { chromium, webkit } = require("playwright");
  const type = browserName === "webkit" ? webkit : chromium;
  const launchOptions = browserName === "chromium" && process.platform === "darwin"
    ? { headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" }
    : { headless: true };
  const browser = await type.launch(launchOptions);
  try {
    for (const [width, height] of [[390, 844], [844, 390], [1024, 768], [1366, 768]]) {
      const context = await browser.newContext({ viewport: { width, height } });
      await context.addInitScript(() => { window.__APP_BUILD__ = 1; });
      const page = await context.newPage();
      const pageErrors = [], requestFailures = [];
      page.on("pageerror", error => pageErrors.push(String(error)));
      page.on("requestfailed", request => requestFailures.push(request.url()));
      await page.goto(`${base}/nazonazo-tunnel/?weather=clear#fast`, { waitUntil: "networkidle" });
      const closed = await page.evaluate(() => {
        const button = document.getElementById("settingsBtn");
        const rect = button.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return {
          rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
          hit: hit === button || button.contains(hit),
          expanded: button.getAttribute("aria-expanded"),
          hidden: document.getElementById("settingsDropdown").hidden,
          overflowX: document.documentElement.scrollWidth - innerWidth,
          overflowY: document.documentElement.scrollHeight - innerHeight
        };
      });
      assert.ok(closed.rect.width >= 48 && closed.rect.height >= 48, `${browserName} ${width}x${height}: settings hit target shrank`);
      assert.ok(closed.rect.left >= 0 && closed.rect.right <= width && closed.rect.top >= 0 && closed.rect.bottom <= height,
        `${browserName} ${width}x${height}: settings escaped the viewport`);
      assert.equal(closed.hit, true, `${browserName} ${width}x${height}: another layer covers settings`);
      assert.equal(closed.expanded, "false");
      assert.equal(closed.hidden, true);
      assert.ok(closed.overflowX <= 1 && closed.overflowY <= 1, `${browserName} ${width}x${height}: menu introduced overflow`);

      await page.locator("#settingsBtn").click();
      const open = await page.evaluate(() => {
        const dropdown = document.getElementById("settingsDropdown");
        const rect = dropdown.getBoundingClientRect();
        return {
          expanded: document.getElementById("settingsBtn").getAttribute("aria-expanded"),
          hidden: dropdown.hidden,
          left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
          heights: [...dropdown.querySelectorAll('[role="menuitem"]')].map(item => item.getBoundingClientRect().height),
          artReady: [...dropdown.querySelectorAll("img")].every(image => image.complete && image.naturalWidth > 0)
        };
      });
      assert.equal(open.expanded, "true");
      assert.equal(open.hidden, false);
      assert.ok(open.left >= 0 && open.right <= width && open.top >= 0 && open.bottom <= height,
        `${browserName} ${width}x${height}: dropdown escaped the viewport`);
      assert.ok(open.heights.every(value => value >= 48), `${browserName} ${width}x${height}: menu item below 48px`);
      assert.equal(open.artReady, true, `${browserName} ${width}x${height}: dropdown artwork was blank on first open`);

      const titleWasHidden = await page.locator("#title").evaluate(element => element.classList.contains("hidden"));
      if (height > width) await page.locator("#rotateHint").click({ position: { x: width / 2, y: height / 2 } });
      else await page.locator("#startBtn").click();
      assert.equal(await page.locator("#title").evaluate(element => element.classList.contains("hidden")), titleWasHidden,
        `${browserName} ${width}x${height}: outside close tap leaked into start`);
      assert.equal(await page.locator("#settingsDropdown").evaluate(element => element.hidden), true);

      await page.locator("#settingsBtn").press("Enter");
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      assert.equal(await page.evaluate(() => document.activeElement?.id), "mapMenuBtn",
        `${browserName} ${width}x${height}: keyboard open did not focus first item`);
      await page.keyboard.press("ArrowDown");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "returnHomeLink");
      await page.keyboard.press("Escape");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "settingsBtn");
      assert.equal(await page.locator("#settingsDropdown").evaluate(element => element.hidden), true);
      assert.deepEqual(pageErrors, [], `${browserName} ${width}x${height}: page errors\n${pageErrors.join("\n")}`);
      assert.deepEqual(requestFailures, [], `${browserName} ${width}x${height}: request failures\n${requestFailures.join("\n")}`);
      await context.close();
    }

    /* A quick outside-close -> reopen -> Home sequence must still navigate. */
    const navigationContext = await browser.newContext({ viewport: { width: 844, height: 390 } });
    await navigationContext.addInitScript(() => { window.__APP_BUILD__ = 1; });
    const navigationPage = await navigationContext.newPage();
    await navigationPage.goto(`${base}/nazonazo-tunnel/?weather=clear#fast`, { waitUntil: "networkidle" });
    await navigationPage.locator("#settingsBtn").click();
    await navigationPage.locator("#startBtn").click();
    await navigationPage.locator("#settingsBtn").click();
    await Promise.all([
      navigationPage.waitForURL(url => /\/play(?:\.html)?\/?$/.test(url.pathname)),
      navigationPage.locator("#returnHomeLink").click()
    ]);
    assert.match(new URL(navigationPage.url()).pathname, /\/play(?:\.html)?\/?$/, `${browserName}: Home did not return to play`);
    await navigationContext.close();
  } finally {
    await browser.close();
  }
}

runBrowserCheck().then(() => {
  console.log("nazonazo settings menu regression: PASS");
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
