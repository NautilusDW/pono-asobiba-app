"use strict";

// Regression coverage for the "card list flickers/disappears while dragging near
// the top/bottom edge" bug (iOS real-device only — Playwright's synthetic pointer
// events never reproduced it because they don't trigger the native-pan
// pointercancel that real iOS Safari fires the instant a touch-action:pan-y
// scroller takes over). v2183-era fix moved isDragging tracking from
// pointerdown/pointerup to touchstart/touchend(window)/touchcancel(window), made
// every LOOP_COPIES thumb <img> eager (rep=2 was still lazy and went blank when a
// big drag exposed it), split the loop-teleport into a synchronous "physical edge
// only" path (scroll listener) and a debounced "normal band" path (settleLoop,
// gated on isDragging), and made the snap easing (animateScrollTo) abort the
// instant isDragging flips true mid-animation.
//
// Part 1 (static): grep-level invariants that block a silent revert of any of the
// four mechanisms above, even in environments without Playwright.
// Part 2 (dynamic): drives the real isDragging state machine via touch events in
// a headless WebKit page and asserts on actual scrollTop behavior.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const play = fs.readFileSync(path.join(root, "play.html"), "utf8");

// ===================== Part 1: static invariants =====================

function extractArrowFnBody(html, name) {
  const re = new RegExp(`const\\s+${name}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{`);
  const m = re.exec(html);
  assert.ok(m, `${name} arrow function must exist as a top-level const in setupLoopScroll`);
  const bodyStart = m.index + m[0].length - 1; // index of the opening '{'
  let depth = 0;
  let i = bodyStart;
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  assert.ok(depth === 0 && i < html.length, `${name} body braces must balance`);
  return html.slice(bodyStart, i + 1);
}

function extractScrollListenerBody(html) {
  const startMarker = "cardList.addEventListener('scroll'";
  const start = html.indexOf(startMarker);
  assert.ok(start !== -1, "cardList scroll listener must exist");
  const endMarker = "}, { passive: true });";
  const end = html.indexOf(endMarker, start);
  assert.ok(end !== -1, "cardList scroll listener must close with '}, { passive: true });'");
  return html.slice(start, end + endMarker.length);
}

// 1. rep-conditional lazy loading must not come back (rep=2 blank-thumb regression).
assert.match(
  play,
  /const isEager\s*=\s*true\s*;/,
  "isEager must be unconditionally true — every LOOP_COPIES thumb must be eager",
);
assert.ok(
  !/const isEager\s*=\s*rep\s*<=/.test(play),
  "isEager must not reintroduce a rep<=PRIORITY_REP conditional (leaves rep=2 lazy, blank on a big drag)",
);

// 2. loadingAttr must still be threaded from isEager into the <img loading> attr,
// so check 1 actually constrains what ships on the DOM node.
assert.match(
  play,
  /loading="\$\{loadingAttr\}"/,
  "thumb <img> markup must set loading from the loadingAttr variable",
);
assert.match(
  play,
  /const loadingAttr\s*=\s*isEager\s*\?\s*'eager'\s*:\s*'lazy'/,
  "loadingAttr must still derive from isEager (so check 1 above actually reaches the DOM)",
);

// 3. The synchronous scroll handler may only do the physical-edge emergency
// teleport (set * 0.15); the normal-band (0.5set/1.5set) teleport must live in
// the debounced settleLoop instead, or it fights the compositor mid-gesture.
const scrollListenerBody = extractScrollListenerBody(play);
assert.ok(
  !scrollListenerBody.includes("set * 0.5"),
  "the synchronous scroll handler must not contain the 0.5set band-return teleport (belongs in debounced settleLoop)",
);
assert.ok(
  !scrollListenerBody.includes("set * 1.5"),
  "the synchronous scroll handler must not contain the 1.5set band-return teleport (belongs in debounced settleLoop)",
);
assert.ok(
  scrollListenerBody.includes("set * 0.15"),
  "the synchronous scroll handler must keep the emergency-margin (0.15set) teleport",
);

// 4. settleLoop: debounced, isDragging-gated, does the band-return teleport, then snaps.
const settleLoopBody = extractArrowFnBody(play, "settleLoop");
assert.ok(settleLoopBody.includes("isDragging"), "settleLoop must gate on cardScrollState.isDragging");
assert.ok(settleLoopBody.includes("set * 0.5"), "settleLoop must contain the 0.5set band-return teleport");
assert.ok(settleLoopBody.includes("set * 1.5"), "settleLoop must contain the 1.5set band-return teleport");
assert.ok(settleLoopBody.includes("snapToNearest"), "settleLoop must hand off to snapToNearest after teleporting");

// 5. isDragging must be driven by touch events, not pointer events (pointercancel
// fires the instant real iOS Safari's native pan takes over touch-action:pan-y).
assert.ok(play.includes("cardList.addEventListener('touchstart'"), "cardList must track touchstart for isDragging");
assert.ok(play.includes("window.addEventListener('touchend'"), "window must track touchend for isDragging (finger can leave cardList's box mid-drag)");
assert.ok(play.includes("window.addEventListener('touchcancel'"), "window must track touchcancel for isDragging");

// 6. The old pointerup-based state machine must not come back.
assert.ok(!play.includes("handlePointerUp"), "handlePointerUp (pointerup/pointercancel-driven isDragging) must not be reintroduced");
assert.ok(!play.includes("cardScrollState.pointerId"), "cardScrollState.pointerId (pointerup-era marker) must not be reintroduced");
assert.ok(!play.includes("loopScrollReady"), "loopScrollReady (pointerup-era cold-start gate) must not be reintroduced");

// 7. The snap-easing animation must abort the instant a finger grabs the list.
const animateScrollToBody = extractArrowFnBody(play, "animateScrollTo");
assert.ok(
  animateScrollToBody.includes("cardScrollState.isDragging"),
  "animateScrollTo's tick must abort when cardScrollState.isDragging becomes true mid-animation",
);

console.log("title_card_loop_drag_regression: Part 1 (static) passed");

// ===================== Part 2: dynamic (Playwright / WebKit) =====================

const { webkit } = require("playwright");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
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
        "cache-control": "no-store",
      });
      response.end(body);
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return { base: `http://127.0.0.1:${address.port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}

// Opens the title screen with the intro auto-scroll hint (fires at 2200ms) and
// the first-run #pono-game-splash overlay both pre-dismissed: setting any
// pono_* localStorage key makes the splash's own "existing user" branch hide it
// synchronously on the next load, and the hint checks the same key before
// animating. Portrait viewport (height > width) already keeps #tapIntro from
// showing at all, so no separate handling is needed for it.
async function openTitleScreen(context, base) {
  const page = await context.newPage();
  await page.goto(`${base}/play.html`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.setItem("pono_cards_intro_hint_shown_v1", "1"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#cardList .game-card", { timeout: 15000 });
  // Let the rAF-deferred recomputeHeightImpl (which sizes #cardList to exactly 4
  // cards and is what makes the list scrollable in the first place) settle.
  await page.waitForTimeout(300);
  return page;
}

async function measureOneSet(page) {
  return page.evaluate(() => {
    const list = document.getElementById("cardList");
    const cards = Array.from(document.querySelectorAll(".game-card"));
    const rep0Count = cards.filter((c) => c.dataset.rep === "0").length;
    const cardH = cards[0].offsetHeight;
    const gap = parseFloat(getComputedStyle(list).rowGap || getComputedStyle(list).gap) || 0;
    return { oneSet: (cardH + gap) * rep0Count, cardH, gap };
  });
}

// Real Touch()/TouchEvent() construction throws "Illegal constructor"/"Type
// error" in this WebKit build (no Touch constructor, and the TouchEvent
// constructor rejects plain touch dicts). The page's own onCardTouchStart/
// onCardTouchEnd handlers only branch on the event type string (onCardTouchStart
// takes no argument at all; onCardTouchEnd only reads e.touches to detect a
// second finger, which we're not simulating), so a plain Event with a matching
// `type` drives the exact same isDragging state machine as a real touch would.
async function dispatchTouch(page, type) {
  await page.evaluate((eventType) => {
    document.getElementById("cardList").dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
  }, type);
}

async function testSlowDragNearBand(context, base) {
  const page = await openTitleScreen(context, base);
  try {
    const { oneSet, cardH, gap } = await measureOneSet(page);
    const step = cardH + gap;

    // Reposition to the safe middle band ourselves: setupLoopScroll's own
    // `cardList.scrollTop = oneSetH()` at init races the rAF that first makes
    // #cardList scrollable (its .style.height is only narrowed inside that rAF),
    // so the very first assignment can silently clamp to 0. That race is
    // orthogonal to this bug; seed a known-good baseline before testing.
    await page.evaluate((oneSet) => {
      document.getElementById("cardList").scrollTop = oneSet;
    }, oneSet);
    await page.waitForTimeout(80);
    const baseline = await page.evaluate(() => document.getElementById("cardList").scrollTop);
    assert.ok(Math.abs(baseline - oneSet) < 1, `baseline scrollTop must reach oneSet (got ${baseline}, expected ~${oneSet})`);

    await dispatchTouch(page, "touchstart");

    // Step 3: 8 small increments, each held long enough to blow past the 140ms
    // settle debounce. If isDragging isn't honored, snapToNearest/settleLoop
    // will fight these writes and `actual` will drift from `expected`.
    const dragResult = await page.evaluate(async () => {
      const list = document.getElementById("cardList");
      const log = [];
      const onScroll = () => log.push(list.scrollTop);
      list.addEventListener("scroll", onScroll, { passive: true });
      const steps = [];
      for (let i = 0; i < 8; i++) {
        list.scrollTop += 4;
        const expected = list.scrollTop;
        await new Promise((resolve) => setTimeout(resolve, 180));
        steps.push({ expected, actual: list.scrollTop });
      }
      list.removeEventListener("scroll", onScroll);
      let maxJump = 0;
      for (let i = 1; i < log.length; i++) maxJump = Math.max(maxJump, Math.abs(log[i] - log[i - 1]));
      return { steps, maxJump };
    });
    for (const [i, s] of dragResult.steps.entries()) {
      assert.equal(s.actual, s.expected, `drag step ${i}: scrollTop must not move under the finger (expected ${s.expected}, got ${s.actual}) — snap/teleport fired while isDragging`);
    }
    assert.ok(
      dragResult.maxJump < oneSet * 0.8,
      `no single scroll-event frame may jump >= 0.8*oneSet while dragging (got ${dragResult.maxJump}, oneSet=${oneSet})`,
    );

    // Step 4: hold at a normal-band-external position (0.3*oneSet, below the
    // 0.5*oneSet settleLoop threshold) — the band-return teleport must not fire
    // while the finger is still down.
    const target03 = oneSet * 0.3;
    await page.evaluate((t) => {
      document.getElementById("cardList").scrollTop = t;
    }, target03);
    await page.waitForTimeout(300);
    const afterHold = await page.evaluate(() => document.getElementById("cardList").scrollTop);
    assert.ok(
      Math.abs(afterHold - target03) < 1,
      `scrollTop must stay at 0.3*oneSet while the finger is still down (expected ~${target03}, got ${afterHold})`,
    );

    // Step 5: release — settleLoop must now teleport back into [0.5,1.5]*oneSet
    // and snapToNearest must land on a card-boundary multiple of step.
    await dispatchTouch(page, "touchend");
    await page.waitForTimeout(800);
    const afterSettle = await page.evaluate(() => document.getElementById("cardList").scrollTop);
    assert.ok(
      afterSettle >= oneSet * 0.5 - 1 && afterSettle <= oneSet * 1.5 + 1,
      `after release, scrollTop must settle inside [0.5,1.5]*oneSet (got ${afterSettle}, band=[${oneSet * 0.5},${oneSet * 1.5}])`,
    );
    const remainder = ((afterSettle % step) + step) % step;
    const snapped = remainder < 1 || step - remainder < 1;
    assert.ok(snapped, `after release, scrollTop must snap to a card-boundary multiple of step=${step} (got ${afterSettle}, remainder ${remainder})`);
  } finally {
    await page.close();
  }
}

async function testEmergencyMarginDuringDrag(context, base) {
  const page = await openTitleScreen(context, base);
  try {
    const { oneSet } = await measureOneSet(page);
    await page.evaluate((oneSet) => {
      document.getElementById("cardList").scrollTop = oneSet;
    }, oneSet);
    await page.waitForTimeout(80);

    await dispatchTouch(page, "touchstart");
    await page.evaluate(() => {
      document.getElementById("cardList").scrollTop = 1;
    });
    // Two animation frames: the emergency-margin teleport is synchronous inside
    // the 'scroll' listener (unlike the debounced band-return one), so it must
    // already have fired by the time the second rAF callback runs.
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    const afterTwoFrames = await page.evaluate(() => document.getElementById("cardList").scrollTop);
    const expected = 1 + oneSet;
    assert.ok(
      Math.abs(afterTwoFrames - expected) <= 2,
      `emergency-margin teleport must fire even while isDragging is true (expected ~${expected}, got ${afterTwoFrames})`,
    );
    await dispatchTouch(page, "touchend");
  } finally {
    await page.close();
  }
}

async function testAllThumbsEagerAndHydrate(context, base) {
  const page = await openTitleScreen(context, base);
  try {
    const staticCheck = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll(".game-card__thumb"));
      return { count: imgs.length, loadingValues: imgs.map((img) => img.getAttribute("loading")) };
    });
    assert.ok(staticCheck.count > 0, "expected at least one .game-card__thumb in the DOM (all LOOP_COPIES reps included)");
    for (const [i, v] of staticCheck.loadingValues.entries()) {
      assert.equal(v, "eager", `.game-card__thumb #${i} must have loading="eager" (including rep=2 copies)`);
    }

    await page.waitForLoadState("networkidle");
    const hydrate = await page.evaluate(async () => {
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        const imgs = Array.from(document.querySelectorAll(".game-card__thumb"));
        const notReady = imgs.filter((img) => !(img.complete && img.naturalWidth > 0) && !img.classList.contains("is-broken"));
        if (notReady.length === 0) return { ok: true, remaining: 0, total: imgs.length };
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      const imgs = Array.from(document.querySelectorAll(".game-card__thumb"));
      const stillNotReady = imgs.filter((img) => !(img.complete && img.naturalWidth > 0) && !img.classList.contains("is-broken"));
      return { ok: stillNotReady.length === 0, remaining: stillNotReady.length, total: imgs.length };
    });
    assert.ok(
      hydrate.ok,
      `all ${hydrate.total} .game-card__thumb images must finish loading (complete && naturalWidth>0) or fall back to .is-broken within 10s (${hydrate.remaining} still pending)`,
    );
  } finally {
    await page.close();
  }
}

async function testFlingBeyondNormalBandRecovers(context, base) {
  const page = await openTitleScreen(context, base);
  try {
    const { oneSet, cardH, gap } = await measureOneSet(page);
    const step = cardH + gap;
    await page.evaluate((oneSet) => {
      document.getElementById("cardList").scrollTop = oneSet;
    }, oneSet);
    await page.waitForTimeout(80);

    await dispatchTouch(page, "touchstart");
    // 6 frames, stepping from 1.0*oneSet to 1.9*oneSet — stays clear of the
    // physical emergency margin (which starts at maxScroll - 0.15*oneSet) so
    // only the debounced band-return teleport is exercised, post-release.
    await page.evaluate(async (oneSet) => {
      const list = document.getElementById("cardList");
      const steps = 6;
      for (let i = 1; i <= steps; i++) {
        list.scrollTop = oneSet * (1.0 + (0.9 * i) / steps);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }, oneSet);
    await dispatchTouch(page, "touchend");
    await page.waitForTimeout(800);
    const afterSettle = await page.evaluate(() => document.getElementById("cardList").scrollTop);
    assert.ok(
      afterSettle >= oneSet * 0.5 - 1 && afterSettle <= oneSet * 1.5 + 1,
      `after a fast fling past 1.5*oneSet, release must settle back inside [0.5,1.5]*oneSet (got ${afterSettle})`,
    );
    const remainder = ((afterSettle % step) + step) % step;
    const snapped = remainder < 1 || step - remainder < 1;
    assert.ok(snapped, `after the fling, scrollTop must snap to a card-boundary multiple of step=${step} (got ${afterSettle}, remainder ${remainder})`);
  } finally {
    await page.close();
  }
}

(async () => {
  const server = await startStaticServer();
  const browser = await webkit.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      hasTouch: true,
      isMobile: true,
    });
    try {
      await testSlowDragNearBand(context, server.base);
      console.log("title_card_loop_drag_regression: testA (slow drag near band) passed");
      await testEmergencyMarginDuringDrag(context, server.base);
      console.log("title_card_loop_drag_regression: testB (emergency margin during drag) passed");
      await testAllThumbsEagerAndHydrate(context, server.base);
      console.log("title_card_loop_drag_regression: testC (all thumbs eager + hydrate) passed");
      await testFlingBeyondNormalBandRecovers(context, server.base);
      console.log("title_card_loop_drag_regression: testD (fling beyond band recovers) passed");
    } finally {
      await context.close().catch(() => {});
    }
  } finally {
    await browser.close().catch(() => {});
    await server.close();
  }
  console.log("title_card_loop_drag_regression: all assertions passed");
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
