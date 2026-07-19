"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const play = fs.readFileSync(path.join(root, "play.html"), "utf8");
const stickerApi = fs.readFileSync(path.join(root, "js/game-stickers.js"), "utf8");

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} function missing`);
  const paramsStart = source.indexOf("(", start + marker.length - 1);
  let paramsDepth = 0;
  let paramsEnd = -1;
  for (let index = paramsStart; index < source.length; index += 1) {
    if (source[index] === "(") paramsDepth += 1;
    if (source[index] === ")") {
      paramsDepth -= 1;
      if (paramsDepth === 0) {
        paramsEnd = index;
        break;
      }
    }
  }
  const bodyStart = source.indexOf("{", paramsEnd);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = bodyStart; index < source.length; index += 1) {
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
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`${name} function is unterminated`);
}

assert.match(
  play,
  /id="dailyGachaRewardOwnership" role="status" aria-live="polite" hidden/,
  "the reveal must contain a dedicated ownership status"
);
assert.match(play, /data-gacha-ownership="duplicate"/, "duplicate reveals need a distinct visual state");
assert.match(play, /\.daily-gacha-modal\.is-opened \.daily-gacha-reward-ownership/, "the status must reveal with the sticker");
assert.match(play, /\.daily-gacha-reward-ownership\[hidden\]\s*\{[\s\S]*?display:\s*none !important/, "hidden ownership status must be absent visually and accessibly");
assert.match(
  play,
  /@media \(max-height: 540px\)[\s\S]*?flex-basis: 44px[\s\S]*?max\(calc\(var\(--daily-gacha-result-center-x\) - clamp\(68px, 12vw, 102px\) \+ 16px\), 191px\)/,
  "short result screens must compact the fixed actions and keep the ownership badge beside them"
);

function shortResultGeometry(viewportWidth, viewportHeight) {
  const shellWidth = Math.min(viewportWidth - 16, (viewportHeight - 16) * 16 / 9);
  const innerWidth = Math.min(viewportWidth * 0.88, shellWidth);
  const offset = Math.max(68, Math.min(viewportWidth * 0.12, 102));
  return {
    fixedActionsRight: 5 + 8 + 44 * 2 + 6,
    ownershipLeft: (shellWidth - innerWidth) / 2
      + Math.max(innerWidth / 2 - offset + 16, 191)
      - 76,
  };
}
for (const [width, height] of [
  [400, 360],
  [568, 320],
  [740, 320],
  [781, 320],
  [800, 320],
  [844, 390],
  [1024, 520],
  [1366, 320],
]) {
  const geometry = shortResultGeometry(width, height);
  assert.ok(
    geometry.ownershipLeft >= geometry.fixedActionsRight + 8,
    `${width}x${height} ownership text must clear fixed actions by at least 8px`
  );
}

const countTextSource = extractFunction(play, "dailyGachaStickerCountText");
const ownershipSource = extractFunction(play, "dailyGachaOwnershipSummary");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(
  `${countTextSource}\n${ownershipSource}\n` +
    "globalThis.__summary = (value) => JSON.stringify(dailyGachaOwnershipSummary(value));",
  sandbox,
  { timeout: 1000 }
);

assert.deepEqual(
  JSON.parse(sandbox.__summary({ first: true, count: 99 })),
  { kind: "first", title: "はじめて！", detail: "ぜんぶで １まい" },
  "first=true is authoritative and must announce the first owned copy"
);
assert.deepEqual(
  JSON.parse(sandbox.__summary({ first: false, count: 2 })),
  { kind: "duplicate", title: "もってる シール！", detail: "これで ２まいめ" },
  "the second copy must be unmistakably marked as already owned"
);
assert.deepEqual(
  JSON.parse(sandbox.__summary({ count: 12 })),
  { kind: "duplicate", title: "もってる シール！", detail: "これで １２まいめ" },
  "multi-digit duplicate totals must remain readable"
);
assert.deepEqual(
  JSON.parse(sandbox.__summary({ first: false, count: "broken" })),
  { kind: "duplicate", title: "もってる シール！", detail: "" },
  "malformed legacy data must not invent a copy number"
);

const resetSource = extractFunction(play, "resetDailyGachaModal");
assert.match(resetSource, /dailyGachaRewardOwnership\.hidden = true/, "reset must hide stale ownership status");
assert.match(resetSource, /removeAttribute\('data-gacha-ownership'\)/, "reset must clear first/duplicate styling");

const setRewardSource = extractFunction(play, "setDailyGachaReward");
assert.match(setRewardSource, /dailyGachaOwnershipSummary\(result\)/, "the reveal must use the grant result payload");
assert.match(setRewardSource, /dataset\.gachaOwnership = ownership\.kind/, "the result kind must drive visual styling");
assert.doesNotMatch(setRewardSource, /dailyGachaRewardOwnership\.hidden = false/, "the live status must stay hidden until the capsule visibly opens");
assert.doesNotMatch(setRewardSource, /getDailyGachaCount/, "daily pull count must never be confused with sticker copy count");
assert.match(
  play,
  /dailyGachaRewardOwnership\.hidden = false;\s*void dailyGachaRewardOwnership\.offsetWidth;[\s\S]*?dailyGachaCloseup\.setAttribute\('aria-hidden', 'false'\);\s*dailyGachaModal\.classList\.add\('is-opened'\)/,
  "ownership announcement and closeup accessibility must begin at the visual reveal"
);

assert.match(
  stickerApi,
  /count:\s*current\.count,[\s\S]*?first:\s*current\.count === 1/,
  "grant() must keep returning post-grant copy count and first-copy status"
);

async function verifyRealGrantContract() {
  const storage = new Map();
  const stickerWindow = {
    addEventListener() {},
    dispatchEvent() {},
  };
  const grantSandbox = {
    window: stickerWindow,
    document: {
      getElementsByTagName() { return []; },
      querySelector() { return null; },
    },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); },
    },
    sessionStorage: { getItem() { return null; }, setItem() {} },
    location: { href: "http://127.0.0.1/play.html" },
    fetch: async () => ({
      ok: true,
      json: async () => ({
        pages: {
          sample: {
            stickers: [{ id: "same-sticker", name: "おなじシール", unlockOn: ["daily_gacha"] }],
          },
        },
      }),
    }),
    CustomEvent: class CustomEvent {
      constructor(type, init) { this.type = type; this.detail = init?.detail; }
    },
    URL,
    Date,
    console,
    setTimeout,
    clearTimeout,
  };
  stickerWindow.setTimeout = setTimeout;
  vm.createContext(grantSandbox);
  vm.runInContext(stickerApi, grantSandbox, { timeout: 1000 });
  const first = await stickerWindow.PonoGameStickers.grant({
    gameId: "sample",
    stickerId: "same-sticker",
    event: "daily_gacha",
    show: false,
  });
  const second = await stickerWindow.PonoGameStickers.grant({
    gameId: "sample",
    stickerId: "same-sticker",
    event: "daily_gacha",
    show: false,
  });
  assert.equal(first.count, 1);
  assert.equal(first.first, true);
  assert.equal(second.count, 2);
  assert.equal(second.first, false);
  assert.equal(stickerWindow.PonoGameStickers.getOwned("sample")["same-sticker"].count, 2);
}

verifyRealGrantContract().then(() => {
  console.log("daily_gacha_duplicate_status_regression: all assertions passed");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
