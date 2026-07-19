#!/usr/bin/env node
"use strict";

// シールミュージアムの獲得数は、保存済みの正数 count を持つ
// カタログ内ユニークIDだけを数える。所持0件をデモ所持へ置き換えないことを固定する。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const mainPath = path.join(root, "Prototypes/StickerExhibitionCarousel/main.js");
const indexPath = path.join(root, "Prototypes/StickerExhibitionCarousel/index.html");
const catalogPath = path.join(root, "assets/data/game-stickers.json");
const mainSource = fs.readFileSync(mainPath, "utf8");
const indexSource = fs.readFileSync(indexPath, "utf8");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} function missing`);
  const bodyStart = source.indexOf("{", start + marker.length);
  assert.ok(bodyStart >= 0, `${name} body missing`);

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

const applyOwnershipSource = extractFunction(mainSource, "applyOwnership");
const readOwnedIdsSource = extractFunction(mainSource, "readOwnedIds");
const assignRoomSource = extractFunction(mainSource, "assignRoom");
const hasAnySource = extractFunction(mainSource, "hasAny");

assert.doesNotMatch(
  mainSource,
  /function demoOwned\s*\(/,
  "prototype demo ownership must not return to the live museum"
);
assert.doesNotMatch(
  applyOwnershipSource,
  /owned\.size\s*===\s*0|useDemo|demoOwned/,
  "empty ownership must stay empty instead of activating demo data"
);
assert.match(
  applyOwnershipSource,
  /const nextOwned\s*=\s*owned\.has\(sticker\.id\)[\s\S]*?sticker\.owned\s*=\s*nextOwned/,
  "ownership must come directly from the saved positive-count ID set"
);
assert.match(mainSource, /window\.addEventListener\("pageshow", refreshOwnershipView\)/, "BFCache/history return must refresh ownership");
assert.match(
  mainSource,
  /window\.addEventListener\("storage",[\s\S]*?event\.key === STATE_KEY \|\| event\.key === null[\s\S]*?refreshOwnershipView\(\)/,
  "cross-tab sticker updates and storage clear must refresh ownership"
);
assert.match(
  mainSource,
  /openDetail\(detailSticker, \{ preserveFocus: true \}\)/,
  "an open sticker detail must refresh with the new ownership state"
);
const mainVersion = indexSource.match(/main\.js\?v=(\d{8})-(\d+)"><\/script>/);
assert.ok(mainVersion, "museum main.js must keep a dated cache-buster");
assert.ok(
  Number(mainVersion[1]) > 20260712
    || (Number(mainVersion[1]) === 20260712 && Number(mainVersion[2]) >= 2),
  `museum main.js cache-buster ${mainVersion[1]}-${mainVersion[2]} predates the ownership fix`
);

const catalogStickers = Object.entries(catalog.pages || {}).flatMap(([pageId, page]) =>
  (Array.isArray(page.stickers) ? page.stickers : []).map((sticker) => ({
    id: sticker.id,
    serial: Number.parseInt(sticker.serial || "0", 10) || 0,
    name: sticker.name || "",
    rarity: sticker.rarity || "normal",
    pageId,
  }))
);
assert.ok(catalogStickers.length > 0, "catalog must contain museum stickers");
assert.equal(
  new Set(catalogStickers.map((sticker) => sticker.id)).size,
  catalogStickers.length,
  "catalog sticker IDs must remain unique for unique-type counting"
);

function createRuntime(rawState) {
  const sandbox = {
    localStorage: {
      getItem(key) {
        return key === "pono_game_stickers_v1" ? rawState : null;
      },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(
    `const STATE_KEY = "pono_game_stickers_v1";\n${readOwnedIdsSource}\n${applyOwnershipSource}\n${hasAnySource}\n${assignRoomSource}\n` +
    "globalThis.__applyOwnership = applyOwnership; globalThis.__assignRoom = assignRoom;",
    sandbox,
    { timeout: 1000 }
  );
  return sandbox;
}

function evaluateState(stateValue) {
  const rawState = typeof stateValue === "string" ? stateValue : JSON.stringify(stateValue);
  const runtime = createRuntime(rawState);
  const stickers = catalogStickers.map((sticker) => ({ ...sticker }));
  for (const sticker of stickers) sticker.roomId = runtime.__assignRoom(sticker);
  runtime.stickers = stickers;
  vm.runInContext("__applyOwnership(stickers)", runtime, { timeout: 1000 });
  const ownedIds = stickers.filter((sticker) => sticker.owned).map((sticker) => sticker.id);
  const byRoom = Object.fromEntries(
    [...new Set(stickers.map((sticker) => sticker.roomId))].map((roomId) => [
      roomId,
      stickers.filter((sticker) => sticker.roomId === roomId && sticker.owned).length,
    ])
  );
  return { stickers, ownedIds, byRoom };
}

for (const emptyState of [
  null,
  { pages: {} },
  { pages: { quizland: { owned: {} } } },
  { pages: { quizland: { owned: { [catalogStickers[0].id]: { count: 0 } } } } },
  { pages: { quizland: { owned: { [catalogStickers[0].id]: { count: -2 } } } } },
  { pages: { retired: { owned: { unknown_sticker_id: { count: 9 } } } } },
  "{not valid json",
]) {
  const result = evaluateState(emptyState);
  assert.equal(result.ownedIds.length, 0, `empty/invalid state must render 0 owned: ${JSON.stringify(emptyState)}`);
  assert.ok(Object.values(result.byRoom).every((count) => count === 0), "every map room must show zero for empty state");
}

const ids = catalogStickers.slice(0, 3).map((sticker) => sticker.id);
const partialState = {
  pages: {
    first: {
      owned: {
        [ids[0]]: { count: 4 },
        [ids[1]]: { count: 0 },
        unknown_sticker_id: { count: 9 },
      },
    },
    second: {
      owned: {
        [ids[0]]: { count: 2 },
        [ids[2]]: 1,
      },
    },
  },
};
const partial = evaluateState(partialState);
assert.deepEqual(
  partial.ownedIds.slice().sort(),
  [ids[0], ids[2]].sort(),
  "positive records count unique known sticker types; duplicates and unknown IDs do not inflate the map"
);
assert.equal(
  Object.values(partial.byRoom).reduce((sum, count) => sum + count, 0),
  2,
  "sum of room numerators must equal the actual owned catalog ID count"
);

const allOwnedState = {
  pages: {
    all: {
      owned: Object.fromEntries(catalogStickers.map((sticker) => [sticker.id, { count: 1 }])),
    },
  },
};
const allOwned = evaluateState(allOwnedState);
assert.equal(allOwned.ownedIds.length, catalogStickers.length, "all positive catalog IDs must render as all owned");
assert.equal(
  Object.values(allOwned.byRoom).reduce((sum, count) => sum + count, 0),
  catalogStickers.length,
  "all room numerators must partition the full catalog without loss or duplication"
);

console.log("sticker_museum_owned_counts_regression: all assertions passed");
