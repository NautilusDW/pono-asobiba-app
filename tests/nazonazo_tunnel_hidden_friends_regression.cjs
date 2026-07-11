#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const html = read("nazonazo-tunnel/index.html");
const css = read("nazonazo-tunnel/styles.css");
const game = read("nazonazo-tunnel/js/game.js");

const TITLE = "トンネルの かくれともだち";
const functionNames = [
  "prepareTunnelFriends",
  "startTunnelFriendGame",
  "findTunnelFriend",
  "showTunnelFriendResult",
  "clearTunnelFriendGame",
  "drawTunnelFriendHud"
];

function scanBalanced(source, openAt, openChar, closeChar) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openAt; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === openChar) depth += 1;
    else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name}: function declaration missing`);
  const bodyAt = source.indexOf("{", start + marker.length);
  assert.ok(bodyAt >= 0, `${name}: function body missing`);
  const end = scanBalanced(source, bodyAt, "{", "}");
  assert.ok(end > bodyAt, `${name}: unterminated function body`);
  return source.slice(start, end + 1);
}

function extractRule(source, selector) {
  const start = source.indexOf(selector);
  assert.ok(start >= 0, `${selector}: CSS selector missing`);
  const bodyAt = source.indexOf("{", start + selector.length);
  assert.ok(bodyAt >= 0, `${selector}: CSS body missing`);
  const end = scanBalanced(source, bodyAt, "{", "}");
  assert.ok(end > bodyAt, `${selector}: unterminated CSS body`);
  return source.slice(start, end + 1);
}

function extractTunnelConstants(source) {
  const declarations = [];
  const pattern = /const\s+TUNNEL_FRIEND_[A-Z0-9_]+\s*=/g;
  let match;
  while ((match = pattern.exec(source))) {
    let quote = "";
    let escaped = false;
    let square = 0;
    let round = 0;
    let curly = 0;
    let end = match.index;
    for (; end < source.length; end += 1) {
      const char = source[end];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === quote) quote = "";
        continue;
      }
      if (char === "\"" || char === "'" || char === "`") {
        quote = char;
        continue;
      }
      if (char === "[") square += 1;
      else if (char === "]") square -= 1;
      else if (char === "(") round += 1;
      else if (char === ")") round -= 1;
      else if (char === "{") curly += 1;
      else if (char === "}") curly -= 1;
      else if (char === ";" && square === 0 && round === 0 && curly === 0) break;
    }
    assert.ok(end < source.length, "unterminated TUNNEL_FRIEND constant declaration");
    declarations.push(source.slice(match.index, end + 1));
    pattern.lastIndex = end + 1;
  }
  return declarations.join("\n");
}

const hiddenFunctions = Object.fromEntries(functionNames.map(name => [name, extractFunction(game, name)]));
const enterTunnel = extractFunction(game, "enterTunnelInterior");
const exitApproach = extractFunction(game, "startTunnelExitApproach");
const finishTunnel = extractFunction(game, "finishTunnelInterior");
const showDropoff = extractFunction(game, "showDropoff");
const startJourney = extractFunction(game, "startJourneyAt");
const openMap = extractFunction(game, "openMap");
const ending = extractFunction(game, "ending");

/* ---------- child-facing DOM and styling contract ---------- */
for (const id of ["tunnelFriendGame", "tunnelFriendGuide", "tunnelFriendLayer", "tunnelFriendResult"]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `${id}: DOM node missing`);
}
assert.match(html, /id="tunnelFriendGame"[^>]*(?:\shidden(?:\s|=|>)|aria-hidden="true")/, "the bonus surface must start hidden to assistive technology");
assert.match(html, /id="tunnelFriendGame"[^>]*(?:aria-label="トンネルの かくれともだち"|aria-labelledby="[^"]+")/, "the bonus surface needs an accessible name");
assert.match(html, /id="tunnelFriend(?:Title|Guide)"[^>]*>[\s\S]*?トンネルの かくれともだち[\s\S]*?<\/[^>]+>/, "the exact selected title must be visible in the tunnel");
assert.match(html, /id="tunnelFriendResult"[^>]*role="status"[^>]*aria-live="polite"/, "the result needs a non-interrupting live region");
const friendDomStart = html.indexOf('id="tunnelFriendGame"');
const friendDomEnd = html.indexOf('id="tunnelFriendResult"', friendDomStart);
assert.ok(friendDomStart >= 0 && friendDomEnd > friendDomStart);
assert.doesNotMatch(html.slice(friendDomStart, friendDomEnd + 300), /<img\b[^>]*\bsrc\s*=/i, "LP markup must not eagerly request friend images");

const gameRule = extractRule(css, "#tunnelFriendGame");
assert.match(gameRule, /pointer-events\s*:\s*none/, "the bonus layer itself must not block the map or vehicle");
const buttonRule = extractRule(css, ".tunnel-friend");
assert.match(buttonRule, /pointer-events\s*:\s*auto/, "only friend buttons may receive tunnel input");
const minimumButtonWidths = [...buttonRule.matchAll(/(?:min-)?width\s*:\s*(?:clamp\(\s*)?(\d+(?:\.\d+)?)px/g)].map(match => Number(match[1]));
assert.ok(minimumButtonWidths.some(width => width >= 52), "friend buttons must be at least 52px wide");
assert.ok(
  [...buttonRule.matchAll(/(?:min-)?height\s*:\s*(?:clamp\(\s*)?(\d+(?:\.\d+)?)px/g)].some(match => Number(match[1]) >= 52) || /aspect-ratio\s*:\s*1(?:\s*\/\s*1)?/.test(buttonRule),
  "friend buttons must be at least 52px tall or square"
);
assert.match(css, /\.tunnel-friend:focus-visible\s*\{[^}]*outline/, "friend buttons need a visible keyboard focus ring");
const reducedAt = css.indexOf("@media (prefers-reduced-motion:reduce)");
assert.ok(reducedAt >= 0, "reduced-motion media query missing");
const reducedCss = css.slice(reducedAt);
assert.match(reducedCss, /\.tunnel-friend(?:\b|[^,{]*,)[^{]*\{[^}]*animation\s*:\s*none\s*!important/, "reduced motion must stop friend peeking/bobbing");

/* ---------- lifecycle and non-blocking progression contract ---------- */
assert.match(game, /const\s+TUNNEL_FRIEND_LIMIT\s*=\s*3\b/, "exactly three friends must be offered per tunnel");
assert.match(showDropoff, /prepareTunnelFriends\(\)/, "the just-completed car group must feed the tunnel recap");
assert.ok(showDropoff.indexOf("prepareTunnelFriends()") < showDropoff.indexOf("cars=[]"), "friends must be captured before passengers leave the cars array");
assert.match(enterTunnel, /startTunnelFriendGame\(\)/, "the bonus must start only after entering the tunnel interior");
assert.match(exitApproach, /showTunnelFriendResult\(\)/, "the existing exit-approach phase must carry the result");
for (const [label, source] of [["finish", finishTunnel], ["journey", startJourney], ["map", openMap]]) {
  assert.match(source, /clearTunnelFriendGame\(\)/, `${label}: tunnel friend UI/state cleanup missing`);
}
assert.doesNotMatch(startJourney, /tunnelFriendTotalFound\s*=\s*0/, "map resume must not erase the current journey total");
assert.match(ending, /tunnelFriendTotalFound/, "the journey result must include the hidden-friend total");

for (const [name, source] of Object.entries(hiddenFunctions)) {
  assert.doesNotMatch(source, /\b(?:target|pending|driving|worldX|stg|qSeg)\s*=/, `${name}: the optional bonus must not control route progression`);
  assert.doesNotMatch(source, /setTimeout|setInterval/, `${name}: the bonus must reuse tunnel phases instead of extending them with timers`);
}
assert.match(game, /TUNNEL_INTERIOR_RUN_VW\s*=\s*360\b/, "the tuned tunnel play run must keep its original distance");
assert.match(game, /TUNNEL_EXIT_APPROACH_RUN_VW\s*=\s*135\b/, "the tuned result approach must keep its original distance");
assert.match(game, /const maxV=tunnelRun\?58:/, "the tunnel bonus must not slow the existing transition");
assert.ok((hiddenFunctions.showTunnelFriendResult.match(/helpItems\.push\(/g) || []).length <= 1, "one tunnel may grant at most one help item");
assert.match(hiddenFunctions.showTunnelFriendResult, /(?:tunnelFriendsFound\s*(?:===|>=)\s*TUNNEL_FRIEND_LIMIT|total\s*===\s*TUNNEL_FRIEND_LIMIT\s*&&\s*tunnelFriendsFound\s*===\s*total)/, "only a 3/3 find may grant the help reward");
assert.match(hiddenFunctions.showTunnelFriendResult, /HELP_MAX/, "the reward must respect the existing help inventory cap");
assert.match(hiddenFunctions.findTunnelFriend, /disabled|\.found|dataset/, "repeat activation needs an idempotency guard");
assert.match(hiddenFunctions.startTunnelFriendGame, /createElement\(["']button["']\)/, "hidden friends must be real buttons");
assert.match(hiddenFunctions.startTunnelFriendGame, /\.type\s*=\s*["']button["']|setAttribute\(["']type["'],\s*["']button["']\)/, "friend buttons must not act as form submits");
assert.match(hiddenFunctions.startTunnelFriendGame, /aria-label/, "every friend button needs a spoken action label");

/* ---------- isolated VM behavior harness ---------- */
class FakeClassList {
  constructor(owner) {
    this.owner = owner;
    this.values = new Set();
  }
  add(...names) { names.forEach(name => this.values.add(name)); this.sync(); }
  remove(...names) { names.forEach(name => this.values.delete(name)); this.sync(); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) {
    const next = force === undefined ? !this.values.has(name) : Boolean(force);
    if (next) this.values.add(name); else this.values.delete(name);
    this.sync();
    return next;
  }
  sync() { this.owner._className = [...this.values].join(" "); }
}

class FakeElement {
  constructor(tagName = "div", id = "") {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.style = { setProperty(name, value) { this[name] = value; } };
    this.attributes = new Map();
    this.classList = new FakeClassList(this);
    this._className = "";
    this._textContent = "";
    this._innerHTML = "";
    this.hidden = true;
    this.disabled = false;
    this.type = "";
    this.src = "";
    this.alt = "";
  }
  get className() { return this._className; }
  set className(value) {
    this.classList.values = new Set(String(value).split(/\s+/).filter(Boolean));
    this.classList.sync();
  }
  get textContent() {
    return this._textContent + this.children.map(child => child.textContent || "").join("");
  }
  set textContent(value) {
    this._textContent = String(value ?? "");
    this.children = [];
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(value) {
    this._innerHTML = String(value ?? "");
    this._textContent = "";
    this.children = [];
  }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  replaceChildren(...children) { this.children = []; this._textContent = ""; children.forEach(child => this.appendChild(child)); }
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter(child => child !== this);
    this.parentNode = null;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); if (name === "disabled") this.disabled = true; }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  removeAttribute(name) { this.attributes.delete(name); if (name === "disabled") this.disabled = false; }
  addEventListener(type, callback) { this[`__${type}`] = callback; }
  matches(selector) {
    if (selector.startsWith(".")) return this.classList.contains(selector.slice(1));
    if (selector.startsWith("#")) return this.id === selector.slice(1);
    return this.tagName === selector.toUpperCase();
  }
  querySelectorAll(selector) {
    const found = [];
    const visit = element => element.children.forEach(child => {
      if (child.matches(selector)) found.push(child);
      visit(child);
    });
    visit(this);
    return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  getBoundingClientRect() { return { left: 100, top: 100, right: 164, bottom: 164, width: 64, height: 64 }; }
  setPointerCapture() {}
}

function descendants(element) {
  return element.children.flatMap(child => [child, ...descendants(child)]);
}

function createHiddenFriendHarness() {
  const ids = Object.fromEntries([
    "tunnelFriendGame", "tunnelFriendTitle", "tunnelFriendGuide", "tunnelFriendCounter", "tunnelFriendLayer", "tunnelFriendResult", "helpBadge", "app"
  ].map(id => [id, new FakeElement("div", id)]));
  const records = { announcements: [], stamps: [], tones: 0, helpHudUpdates: 0 };
  const document = {
    body: new FakeElement("body", "body"),
    createElement(tag) { return new FakeElement(tag); },
    createDocumentFragment() { return new FakeElement("fragment"); },
    getElementById(id) { return ids[id] || null; }
  };
  const context = {
    console,
    document,
    window: {},
    Math,
    Number,
    Set,
    Array,
    TUNNEL_FRIEND_LIMIT: 3,
    HELP_MAX: 3,
    tunnelFriendGame: ids.tunnelFriendGame,
    tunnelFriendTitle: ids.tunnelFriendTitle,
    tunnelFriendGuide: ids.tunnelFriendGuide,
    tunnelFriendCounter: ids.tunnelFriendCounter,
    tunnelFriendLayer: ids.tunnelFriendLayer,
    tunnelFriendResult: ids.tunnelFriendResult,
    $: id => ids[id],
    shuffle: values => values.slice(),
    pick: values => values[0],
    rnd: (min, max) => (min + max) / 2,
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    passengerLabel: passenger => passenger.name || passenger.t || "",
    bindTap(element, callback) { element.__tap = callback; },
    announce(message) { records.announcements.push(String(message)); },
    showStamp(message) { records.stamps.push(String(message)); },
    tone() { records.tones += 1; },
    sndNew() { records.tones += 1; },
    confetti() {},
    updateHelpHud() { records.helpHudUpdates += 1; },
    requestAnimationFrame(callback) { callback(); },
    setTimeout(callback) { callback(); return 1; },
    clearTimeout() {},
    performance: { now: () => 0 }
  };
  const constantSource = extractTunnelConstants(game);
  vm.runInNewContext(`
    ${constantSource}
    let cars=[];
    let helpItems=[];
    let tunnelFriendCandidates=[];
    let tunnelFriendsFound=0;
    let tunnelFriendTotalFound=0;
    let tunnelFriendRewardGranted=false;
    let tunnelFriendGameActive=false;
    ${functionNames.map(name => hiddenFunctions[name]).join("\n")}
    this.__tunnelApi={
      setCars:value=>{cars=value;},
      setHelp:value=>{helpItems=value;},
      prepare:prepareTunnelFriends,
      start:startTunnelFriendGame,
      find:findTunnelFriend,
      result:showTunnelFriendResult,
      clear:clearTunnelFriendGame,
      draw:drawTunnelFriendHud,
      state:()=>({
        candidates:tunnelFriendCandidates,
        found:tunnelFriendsFound,
        total:tunnelFriendTotalFound,
        reward:tunnelFriendRewardGranted,
        active:tunnelFriendGameActive,
        help:helpItems
      })
    };`, context, { filename: "nazonazo-tunnel-hidden-friends-vm.js", timeout: 1000 });
  return { api: context.__tunnelApi, ids, records };
}

function plain(value) { return JSON.parse(JSON.stringify(value)); }

const harness = createHiddenFriendHarness();
const sourceCars = [
  { e: "🐿️", t: "りすちゃん", name: "りすちゃん", img: "risu.webp" },
  { e: "🐿️", t: "りすちゃん", name: "りすちゃん", img: "risu.webp" },
  { e: "🦆", t: "あひるさん", name: "あひるさん" },
  { pending: true, e: "", t: "" },
  { e: "🦌", t: "しかさん", name: "しかさん" },
  { e: "🐱", t: "ねこさん", name: "ねこさん" }
];
harness.api.setCars(sourceCars);
harness.api.prepare();
let state = plain(harness.api.state());
assert.equal(state.candidates.length, 3, "candidate preparation must cap the recap at three friends");
assert.equal(new Set(state.candidates.map(friend => `${friend.e}|${friend.name || friend.t}`)).size, 3, "candidate preparation must remove duplicate passengers");
assert.ok(state.candidates.every(friend => !friend.pending), "pending seats must not become hidden friends");
assert.equal(sourceCars.length, 6, "candidate preparation must not mutate the car history");

harness.api.start();
state = plain(harness.api.state());
assert.equal(state.active, true);
assert.equal(harness.ids.tunnelFriendGame.getAttribute("aria-hidden"), "false", "the game must become visible on tunnel entry");
const buttons = descendants(harness.ids.tunnelFriendLayer).filter(element => element.tagName === "BUTTON");
assert.equal(buttons.length, 3, "all three friends must be available immediately, including under #fast");
for (const button of buttons) {
  assert.equal(button.type, "button");
  assert.ok(button.getAttribute("aria-label"), "each friend button needs an aria-label");
  assert.equal(typeof button.__tap, "function", "each friend button must use the app's tap binding");
}
assert.match(html, new RegExp(TITLE));
assert.match(harness.ids.tunnelFriendCounter.textContent, /0\s*\/\s*3/, "the initial counter must be visible");

buttons[0].__tap();
state = plain(harness.api.state());
assert.equal(state.found, 1);
assert.equal(state.total, 1);
harness.api.find(buttons[0], state.candidates[0]);
state = plain(harness.api.state());
assert.equal(state.found, 1, "a found/disabled friend must not count twice");
assert.equal(state.total, 1, "double activation must not inflate the journey score");
buttons[1].__tap();
buttons[2].__tap();
state = plain(harness.api.state());
assert.equal(state.found, 3);
assert.equal(state.total, 3);
assert.equal(state.help.length, 0, "the help reward belongs to the result phase, not individual taps");

harness.api.result();
state = plain(harness.api.state());
assert.equal(state.reward, true, "3/3 must grant the next-stage reward");
assert.equal(state.help.length, 1, "3/3 must grant exactly one help item");
assert.match(harness.ids.tunnelFriendResult.textContent, /ぜんぶ|3\s*\/\s*3|3にん/, "the exit approach must celebrate a complete find");
harness.api.result();
state = plain(harness.api.state());
assert.equal(state.help.length, 1, "re-rendering the exit result must not duplicate the reward");

harness.api.clear();
state = plain(harness.api.state());
assert.equal(state.active, false);
assert.equal(state.found, 0);
assert.equal(state.reward, false);
assert.equal(state.candidates.length, 0);
assert.equal(state.total, 3, "stage cleanup must preserve the journey-wide score");
assert.equal(harness.ids.tunnelFriendGame.getAttribute("aria-hidden"), "true");

harness.api.setHelp([]);
harness.api.setCars(sourceCars);
harness.api.prepare();
harness.api.start();
harness.api.result();
state = plain(harness.api.state());
assert.equal(state.found, 0, "ignoring the optional game must remain valid");
assert.equal(state.help.length, 0, "0/3 must not grant a help item");
assert.match(harness.ids.tunnelFriendResult.textContent, /0|こんど|また/, "0/3 still needs a friendly, non-failing result");

/* ---------- optional end-to-end browser check ---------- */
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg"
};

async function startStaticServer() {
  if (process.env.NAZONAZO_BASE_URL) return { base: process.env.NAZONAZO_BASE_URL.replace(/\/$/, ""), close: async () => {} };
  const server = http.createServer((request, response) => {
    const rawPath = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const rel = rawPath.endsWith("/") ? `${rawPath}index.html` : rawPath;
    const full = path.resolve(root, `.${rel}`);
    if (full !== root && !full.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end("forbidden");
      return;
    }
    fs.readFile(full, (error, body) => {
      if (error) {
        response.writeHead(error.code === "ENOENT" ? 404 : 500).end("not found");
        return;
      }
      response.writeHead(200, { "content-type": mime[path.extname(full)] || "application/octet-stream", "cache-control": "no-store" });
      response.end(body);
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return { base: `http://127.0.0.1:${address.port}`, close: () => new Promise(resolve => server.close(resolve)) };
}

async function answerStage(page) {
  for (let index = 0; index < 5; index += 1) {
    const correct = page.locator('#quiz.show .choice[data-ok="1"]');
    await correct.waitFor({ state: "visible", timeout: 25000 });
    await correct.click();
    await page.waitForFunction(() => !document.getElementById("quiz").classList.contains("show"), null, { timeout: 5000 });
  }
}

async function runBrowser(browserName, base) {
  const { chromium, webkit } = require("playwright");
  const isIOS = browserName === "webkit-ios";
  const browserType = browserName.startsWith("webkit") ? webkit : chromium;
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 740, height: 320 },
    userAgent: isIOS
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
      : undefined
  });
  const page = await context.newPage();
  const errors = [];
  const failed = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("requestfailed", request => failed.push(`${request.method()} ${request.url()} ${request.failure() && request.failure().errorText}`));
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto(`${base}/nazonazo-tunnel/?weather=clear#fast`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.__tunnelFriendAudit = { results: [] };
    const result = document.getElementById("tunnelFriendResult");
    new MutationObserver(() => {
      const text = result.textContent.trim();
      if (text && window.__tunnelFriendAudit.results.at(-1) !== text) window.__tunnelFriendAudit.results.push(text);
    }).observe(result, { childList: true, characterData: true, subtree: true });
  });
  await page.locator("#startBtn").click();
  await answerStage(page);
  await page.waitForFunction(() => document.body.classList.contains("tunnel-interior") && document.getElementById("tunnelFriendGame").getAttribute("aria-hidden") === "false", null, { timeout: 70000 });
  assert.equal((await page.locator("#tunnelFriendTitle").textContent()).includes(TITLE), true, `${browserName}: exact title missing`);
  const friendButtons = page.locator("#tunnelFriendLayer .tunnel-friend");
  assert.equal(await friendButtons.count(), 3, `${browserName}: all three friends must appear on entry`);
  const buttonMetrics = await friendButtons.evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      label: element.getAttribute("aria-label") || "",
      inside: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      hittable: Boolean(hit && (hit === element || element.contains(hit)))
    };
  }));
  for (const metric of buttonMetrics) {
    assert.ok(metric.width >= 52 && metric.height >= 52, `${browserName}: undersized friend target ${metric.width}x${metric.height}`);
    assert.ok(metric.label, `${browserName}: friend aria-label missing`);
    assert.ok(metric.inside, `${browserName}: friend target is clipped`);
    assert.ok(metric.hittable, `${browserName}: friend target is covered by another layer`);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedNames = await friendButtons.evaluateAll(elements => elements.map(element => getComputedStyle(element).animationName));
  assert.ok(reducedNames.every(name => name === "none"), `${browserName}: reduced-motion friend animation still runs`);

  await page.mouse.click(buttonMetrics[0].centerX, buttonMetrics[0].centerY);
  const afterOne = await page.locator("#tunnelFriendCounter").textContent();
  await page.mouse.click(buttonMetrics[0].centerX, buttonMetrics[0].centerY);
  assert.equal(await page.locator("#tunnelFriendCounter").textContent(), afterOne, `${browserName}: duplicate activation changed the count`);
  await page.mouse.click(buttonMetrics[1].centerX, buttonMetrics[1].centerY);
  await page.mouse.click(buttonMetrics[2].centerX, buttonMetrics[2].centerY);
  assert.match(await page.locator("#tunnelFriendCounter").textContent(), /3\s*\/\s*3/, `${browserName}: 3/3 counter missing`);
  await page.locator("#tunnelFriendResult").waitFor({ state: "visible", timeout: 10000 });
  assert.match(await page.locator("#tunnelFriendResult").textContent(), /ぜんぶ|3\s*\/\s*3|3にん/, `${browserName}: complete exit result missing`);
  await page.waitForFunction(() => /×\s*1/.test(document.getElementById("helpBadge").textContent), null, { timeout: 10000 });
  await page.waitForFunction(() => document.body.classList.contains("st-jungle") && document.getElementById("quiz").classList.contains("show"), null, { timeout: 70000 });
  const firstResults = await page.evaluate(() => window.__tunnelFriendAudit.results.slice());
  assert.ok(firstResults.some(text => /ぜんぶ|3\s*\/\s*3|3にん/.test(text)), `${browserName}: complete result was never shown during exit approach`);

  // The untapped 0/3 branch and its no-reward guarantee are exercised in the
  // deterministic VM harness above. Keep this optional E2E focused on the
  // requested town -> tunnel -> next-stage journey so #fast cannot outrun a
  // second transient tunnel while Playwright is polling it.
  assert.deepEqual(errors, [], `${browserName}: page errors\n${errors.join("\n")}`);
  assert.deepEqual(failed, [], `${browserName}: request failures\n${failed.join("\n")}`);

  const lockedContext = await browser.newContext({ viewport: { width: 740, height: 320 } });
  const lockedPage = await lockedContext.newPage();
  const eagerFriendRequests = [];
  lockedPage.on("request", request => {
    if (/\/assets\/images\/bento\/npc\//.test(request.url())) eagerFriendRequests.push(request.url());
  });
  await lockedPage.goto(`${base}/nazonazo-tunnel/?weather=clear#fast`, { waitUntil: "networkidle" });
  await lockedPage.locator("#ponoTierLockScreen").waitFor({ state: "visible", timeout: 10000 });
  assert.equal(await lockedPage.locator("#tunnelFriendLayer .tunnel-friend").count(), 0, `${browserName}: LP lock built the bonus game`);
  assert.deepEqual(eagerFriendRequests, [], `${browserName}: LP lock eagerly requested friend images`);
  await lockedContext.close();
  await context.close();
  await browser.close();
}

(async () => {
  if (process.env.NAZONAZO_BROWSER) {
    const server = await startStaticServer();
    try {
      const requested = process.env.NAZONAZO_BROWSER.split(",").map(value => value.trim()).filter(Boolean);
      for (const browserName of requested) await runBrowser(browserName, server.base);
    } finally {
      await server.close();
    }
  }
  console.log("nazonazo tunnel hidden friends regression: PASS");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
