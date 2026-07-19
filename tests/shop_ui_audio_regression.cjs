"use strict";

// batch:1253 regression: もりのおみせの BGM 排他と吹き出し組版。
// - ガチャの上にショップを開いても、ガチャ bed が gesture/focus 復帰しない
// - close 後に shop BGM の遅延 retry がタイトル曲へ重ならない
// - 時刻案内は一行、開店案内は意図した二行、吹き出し本体はリスの顔を覆わない

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium, webkit } = require("playwright");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "play.html"), "utf8");

assert.match(html, /function shouldDailyGachaBedRun\(\)[\s\S]*?!isDonguriShopOpen\(\)/,
  "daily gacha bed predicate must exclude the open shop");
assert.match(html, /function startDailyGachaBed\([^)]*\)[\s\S]*?if \(!shouldDailyGachaBedRun\(\)\) return;/,
  "daily gacha bed start must enforce the central predicate itself");
assert.match(html, /function ensureShopBgmPlaying\(\)[\s\S]*?!isDonguriShopOpen\(\)/,
  "shop BGM retries must verify the shop is still open");
assert.match(html, /function stopDonguriShopBgm\(\)[\s\S]*?_clearDonguriShopBgmRetryTimers\(\)/,
  "closing the shop must cancel outstanding BGM retries");
assert.match(html, /function _setShopBubbleText\([^)]*\)/,
  "all shop bubble copy must pass through the layout classifier");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav"
};

async function startStaticServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const rawPath = decodeURIComponent(url.pathname);
    const relative = rawPath.endsWith("/") ? `${rawPath}index.html` : rawPath;
    const full = path.resolve(root, `.${relative}`);
    if (full !== root && !full.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end("forbidden");
      return;
    }
    fs.readFile(full, (error, body) => {
      if (error) {
        response.writeHead(error.code === "ENOENT" ? 404 : 500).end("not found");
        return;
      }
      response.writeHead(200, {
        "content-type": mime[path.extname(full).toLowerCase()] || "application/octet-stream",
        "cache-control": "no-store"
      });
      response.end(body);
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return {
    base: `http://127.0.0.1:${address.port}`,
    close: () => new Promise(resolve => server.close(resolve))
  };
}

async function installFixture(page, muted = false) {
  await page.addInitScript(({ muted }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("pono_sound_off", muted ? "1" : "0");
    sessionStorage.setItem("pono_audio_unlocked", "1");
    window.__APP_BUILD__ = 1;
    window.__shopTestMedia = [];
    window.__shopTestMediaNextId = 1;
    window.__shopTestEnsureMedia = element => {
      if (!element.__shopTestMediaId) {
        element.__shopTestMediaId = window.__shopTestMediaNextId++;
        window.__shopTestMedia.push(element);
      }
      return element;
    };
    const nativePlay = HTMLMediaElement.prototype.play;
    const nativePause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.play = function () {
      window.__shopTestEnsureMedia(this);
      return nativePlay.call(this);
    };
    HTMLMediaElement.prototype.pause = function () {
      window.__shopTestEnsureMedia(this);
      return nativePause.call(this);
    };
  }, { muted });
}

async function mediaSnapshot(page) {
  return page.evaluate(() => {
    document.querySelectorAll("audio,video").forEach(window.__shopTestEnsureMedia);
    return window.__shopTestMedia.map(element => ({
      testId: element.__shopTestMediaId,
      name: element.id || (() => {
        try { return new URL(element.currentSrc || element.src).pathname.split("/").pop(); }
        catch (_) { return element.src || "media"; }
      })(),
      loop: !!element.loop,
      paused: !!element.paused,
      ended: !!element.ended,
      muted: !!element.muted,
      volume: Number(element.volume),
      readyState: Number(element.readyState),
      currentTime: Number(element.currentTime) || 0,
      forcePaused: element.getAttribute && element.getAttribute("data-pono-force-paused")
    }));
  });
}

async function advancingLoops(page, waitMs = 650) {
  const before = await mediaSnapshot(page);
  await page.waitForTimeout(waitMs);
  const after = await mediaSnapshot(page);
  const first = new Map(before.map(item => [item.testId, item]));
  return after.filter(item => {
    const old = first.get(item.testId);
    if (!old || !item.loop || item.paused || item.ended || item.muted || item.volume <= 0 || item.readyState < 2) return false;
    const delta = item.currentTime >= old.currentTime
      ? item.currentTime - old.currentTime
      : item.currentTime;
    return delta > .08;
  }).map(item => item.name).sort();
}

async function expectLoops(page, expected, label) {
  let actual = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    actual = await advancingLoops(page);
    if (JSON.stringify(actual) === JSON.stringify(expected.slice().sort())) return;
    await page.waitForTimeout(200);
  }
  assert.deepEqual(actual, expected.slice().sort(), label);
}

async function runAudioRegression(base) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"]
  });
  let context = null;
  try {
    context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    serviceWorkers: "block"
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(String(error)));
  await installFixture(page);
  await page.goto(`${base}/play.html`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => typeof showShop === "function" && !document.getElementById("play-bgm").paused);

  await expectLoops(page, ["play-bgm"], "title must be the only advancing loop before overlays");

  await page.evaluate(() => openDailyGacha());
  await expectLoops(page, ["daily_gacha_bed_loop.mp3"], "gacha bed must replace the title BGM");

  await page.evaluate(() => showShop());
  await page.evaluate(() => {
    window.__shopTestDocumentHidden = true;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => window.__shopTestDocumentHidden
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => window.__shopTestDocumentHidden ? "hidden" : "visible"
    });
    document.dispatchEvent(new Event("visibilitychange"));
    window.__shopTestDocumentHidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new PageTransitionEvent("pageshow"));
  });
  await page.waitForTimeout(1200);
  await expectLoops(page, ["shop-bgm"], "shop visibility/gesture/focus paths must not revive the gacha bed");

  await page.evaluate(() => {
    var toggle = document.getElementById("soundToggle");
    toggle.checked = false;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expectLoops(page, [], "sound OFF in the shop must stop every advancing loop");
  const mutedState = await mediaSnapshot(page);
  assert.equal(mutedState.find(item => item.name === "shop-bgm").paused, true,
    "sound OFF must pause shop BGM itself");

  await page.evaluate(() => {
    var toggle = document.getElementById("soundToggle");
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expectLoops(page, ["shop-bgm"], "sound ON in the shop must restore only shop BGM");
  const openState = await mediaSnapshot(page);
  const gachaBed = openState.find(item => item.name === "daily_gacha_bed_loop.mp3");
  assert.equal(gachaBed && gachaBed.paused, true, "gacha bed must stay paused behind the shop");
  assert.equal(gachaBed && gachaBed.forcePaused, "1", "visibility guard must see the gacha bed as intentionally paused");

  await page.evaluate(() => { ensureShopBgmPlaying(); hideShop(); });
  await page.waitForTimeout(1350);
  await expectLoops(page, ["daily_gacha_bed_loop.mp3"], "closing shop over gacha must restore only the gacha bed");

  await page.evaluate(() => closeDailyGacha());
  await expectLoops(page, ["play-bgm"], "closing the final overlay must restore only the title BGM");

  // Purchase retention schedules 120/450/1100ms retries. A fast close must cancel all of them.
  await page.evaluate(() => { showShop(); ensureShopBgmPlaying(); hideShop(); });
  await page.waitForTimeout(1350);
  await expectLoops(page, ["play-bgm"], "purchase retention retry must not revive shop BGM after close");

  // Initial autoplay rejection used to schedule an unconditional one-second replay after close.
  await page.evaluate(() => {
    var shopBgm = document.getElementById("shop-bgm");
    var realPlay = shopBgm.play.bind(shopBgm);
    var rejectOnce = true;
    shopBgm.play = function () {
      if (rejectOnce) {
        rejectOnce = false;
        return Promise.reject(new DOMException("test rejection", "NotAllowedError"));
      }
      return realPlay();
    };
    showShop();
    hideShop();
  });
  await page.waitForTimeout(1200);
  await expectLoops(page, ["play-bgm"], "rejected start retry must not revive shop BGM after close");

    assert.deepEqual(pageErrors, [], `audio flow page errors:\n${pageErrors.join("\n")}`);
  } finally {
    if (context) await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

function rectIntersection(a, b) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

async function inspectBubble(page, text) {
  return page.evaluate(message => {
    _setShopkeeperReaction("calm", message, { sticky: true });
    const bubble = document.getElementById("donguriShopBubble");
    const keeper = document.querySelector(".donguri-shop-v2-shopkeeper");
    const note = document.querySelector(".donguri-shop-v2-rotation-note");
    const box = element => {
      const r = element.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const characterLines = [];
    for (let index = 0; index < bubble.textContent.length; index += 1) {
      const char = bubble.textContent[index];
      if (/\s/.test(char)) continue;
      const range = document.createRange();
      range.setStart(bubble.firstChild, index);
      range.setEnd(bubble.firstChild, index + 1);
      const rect = range.getBoundingClientRect();
      let line = characterLines.find(item => Math.abs(item.top - rect.top) < 1);
      if (!line) {
        line = { top: rect.top, chars: "", left: rect.left, right: rect.right };
        characterLines.push(line);
      }
      line.chars += char;
      line.left = Math.min(line.left, rect.left);
      line.right = Math.max(line.right, rect.right);
    }
    characterLines.sort((a, b) => a.top - b.top);
    return {
      layout: bubble.dataset.layout,
      bubble: box(bubble),
      keeper: box(keeper),
      note: box(note),
      lines: characterLines,
      overflowX: document.documentElement.scrollWidth - innerWidth,
      overflowY: document.documentElement.scrollHeight - innerHeight,
      portraitWarningVisible: (() => {
        const warning = document.getElementById("portraitWarn");
        return !!(warning && !warning.hidden && getComputedStyle(warning).display !== "none");
      })()
    };
  }, text);
}

async function runLayoutRegression(browserType, browserName, base, viewports) {
  const browser = await browserType.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, serviceWorkers: "block" });
      try {
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(String(error)));
    await installFixture(page, true);
    await page.goto(`${base}/play.html`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.evaluate(() => showShop());

    for (const copy of ["あさごはんの あと かわるよ", "ばんごはんの あと かわるよ", "もうすぐ かわるよ"]) {
      const state = await inspectBubble(page, copy);
      assert.equal(state.layout, "countdown", `${browserName} ${viewport.width}x${viewport.height}: countdown layout missing`);
      assert.equal(state.lines.length, 1, `${browserName} ${viewport.width}x${viewport.height}: countdown wrapped: ${copy}`);
      assert.ok(state.lines[0].left >= state.bubble.left && state.lines[0].right <= state.bubble.right,
        `${browserName} ${viewport.width}x${viewport.height}: countdown glyphs overflow bubble`);
    }

    const opening = await inspectBubble(page, "いらっしゃい\nきょうは なににする？");
    assert.equal(opening.layout, "dialogue", `${browserName}: opening layout missing`);
    assert.deepEqual(opening.lines.map(line => line.chars), ["いらっしゃい", "きょうはなににする？"],
      `${browserName} ${viewport.width}x${viewport.height}: opening copy must stay on its intended two lines`);

    for (const copy of ["こうかんしたよ", "また ならべるよ", "とっておいたよ", "とりおきは 1つまで"]) {
      const state = await inspectBubble(page, copy);
      assert.equal(state.layout, "short", `${browserName}: short layout missing for ${copy}`);
      assert.equal(state.lines.length, 1, `${browserName} ${viewport.width}x${viewport.height}: short copy wrapped: ${copy}`);
      assert.ok(state.lines.every(line => line.chars.length > 1), `${browserName}: one-character orphan in ${copy}`);
    }

    const state = await inspectBubble(page, "ばんごはんの あと かわるよ");
    const body = {
      left: state.bubble.left,
      right: state.bubble.right,
      top: state.bubble.top + state.bubble.height * 147 / 887,
      bottom: state.bubble.top + state.bubble.height * 650 / 887
    };
    const face = {
      left: state.keeper.left + state.keeper.width * 80 / 387,
      right: state.keeper.left + state.keeper.width * 327 / 387,
      top: state.keeper.top + state.keeper.height * 80 / 459,
      bottom: state.keeper.top + state.keeper.height * 285 / 459
    };
    assert.equal(rectIntersection(body, face), 0,
      `${browserName} ${viewport.width}x${viewport.height}: opaque bubble body overlaps squirrel face`);
    assert.ok(Math.abs(state.bubble.width / state.bubble.height - 1774 / 887) < .03,
      `${browserName} ${viewport.width}x${viewport.height}: bubble aspect ratio changed`);
    assert.ok(state.overflowX <= 1 && state.overflowY <= 1,
      `${browserName} ${viewport.width}x${viewport.height}: page overflow ${state.overflowX}/${state.overflowY}`);
    if (viewport.width > viewport.height) {
      assert.equal(rectIntersection(body, state.note), 0,
        `${browserName} ${viewport.width}x${viewport.height}: raised bubble overlaps rotation note`);
    } else {
      assert.equal(state.portraitWarningVisible, true,
        `${browserName} ${viewport.width}x${viewport.height}: portrait fallback warning missing`);
    }
        assert.deepEqual(pageErrors, [], `${browserName} layout page errors:\n${pageErrors.join("\n")}`);
      } finally {
        await context.close().catch(() => {});
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }
}

(async () => {
  const server = await startStaticServer();
  try {
    await runAudioRegression(server.base);
    await runLayoutRegression(chromium, "chromium", server.base, [
      { width: 390, height: 844 },
      { width: 740, height: 320 },
      { width: 844, height: 390 },
      { width: 1024, height: 768 },
      { width: 1366, height: 768 }
    ]);
    await runLayoutRegression(webkit, "webkit", server.base, [{ width: 844, height: 390 }]);
    console.log("shop UI/audio regression: PASS");
  } finally {
    await server.close();
  }
})().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
