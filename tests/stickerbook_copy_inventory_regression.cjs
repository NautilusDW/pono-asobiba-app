"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "Prototypes/StickerBookThreeJS/main.js"), "utf8");
const css = fs.readFileSync(path.join(root, "Prototypes/StickerBookThreeJS/styles.css"), "utf8");
const index = fs.readFileSync(path.join(root, "Prototypes/StickerBookThreeJS/index.html"), "utf8");

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

const normalizeSource = extractFunction(main, "normalizeOwnedStickerCount");
const readOwnedSource = extractFunction(main, "readOwnedStickerCounts");
const placedSource = extractFunction(main, "readPlacedStickerCounts");
const inventorySource = extractFunction(main, "stickerCopyInventory");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(
  `${normalizeSource}\n${placedSource}\n${inventorySource}\n` +
    "globalThis.__normalize = normalizeOwnedStickerCount;" +
    "globalThis.__placed = (state) => JSON.stringify(Object.fromEntries(readPlacedStickerCounts(state)));" +
    "globalThis.__inventory = (id, owned, placed) => JSON.stringify(stickerCopyInventory(id, { unlimited: false, owned: new Map(owned), placed: new Map(placed) }));",
  sandbox,
  { timeout: 1000 }
);

const ownershipSandbox = {
  __rawOwned: {},
  window: {
    PonoGameStickers: {
      getOwned() {
        return ownershipSandbox.__rawOwned;
      },
    },
  },
  localStorage: { getItem() { return null; } },
};
vm.createContext(ownershipSandbox);
vm.runInContext(
  `${normalizeSource}\n${readOwnedSource}\n` +
    "globalThis.__readOwned = () => JSON.stringify(Object.fromEntries(readOwnedStickerCounts()));",
  ownershipSandbox,
  { timeout: 1000 }
);

for (const [value, expected] of [[3, 3], ["2.9", 2], [1, 1], [0, 0], [-4, 0], [Infinity, 0], [NaN, 0]]) {
  assert.equal(sandbox.__normalize(value), expected, `owned count ${String(value)} must sanitize to ${expected}`);
}

ownershipSandbox.__rawOwned = {
  quizland: { owned: { alpha: { count: 2 }, bad: { count: -4 } } },
  maze: { owned: { alpha: { count: 1 }, beta: { count: "2.8" } } },
};
assert.deepEqual(
  JSON.parse(ownershipSandbox.__readOwned()),
  { alpha: 3, beta: 2 },
  "saved positive copy counts must be preserved and safely aggregated"
);
ownershipSandbox.__rawOwned = { alpha: { count: 4 }, beta: { count: 0 } };
assert.deepEqual(
  JSON.parse(ownershipSandbox.__readOwned()),
  { alpha: 4 },
  "the direct owned-map API shape must remain supported"
);

const state = {
  pages: {
    cover: [{ stickerId: "alpha" }],
    1: [{ stickerId: "alpha" }, { stickerId: "beta" }],
    8: [{ stickerId: "alpha" }, {}, null],
    broken: "not-an-array",
  },
};
assert.deepEqual(
  JSON.parse(sandbox.__placed(state)),
  { alpha: 3, beta: 1 },
  "placement usage must aggregate the cover and every interior page"
);

assert.deepEqual(
  JSON.parse(sandbox.__inventory("alpha", [["alpha", 3]], [["alpha", 2]])),
  { owned: 3, placed: 2, remaining: 1, unlimited: false },
  "three owned copies with two placements must leave one selectable copy"
);
assert.deepEqual(
  JSON.parse(sandbox.__inventory("alpha", [["alpha", 1]], [["alpha", 4]])),
  { owned: 1, placed: 4, remaining: 0, unlimited: false },
  "legacy over-placement must clamp at zero without deleting the saved layout"
);
assert.equal(state.pages.cover.length, 1, "inventory reads must not mutate legacy cover placements");
assert.equal(state.pages[1].length, 2, "inventory reads must not mutate interior placements");
assert.deepEqual(
  JSON.parse(sandbox.__inventory("beta", [["alpha", 3], ["beta", 2]], [["alpha", 3], ["beta", 1]])),
  { owned: 2, placed: 1, remaining: 1, unlimited: false },
  "one sticker's usage must not consume another sticker's copies"
);

const traySource = extractFunction(main, "renderStickerThumbnailTray");
assert.match(traySource, /createStickerCopyInventorySnapshot\(\)/, "tray cards must share one inventory snapshot per render");
assert.match(traySource, /copyCount\.textContent = inventory\.unlimited \? "×∞" : `×\$\{inventory\.remaining\}`/, "tray badge must show remaining copies");
assert.match(traySource, /dataset\.stickerDepleted = "1"/, "owned but exhausted cards need an explicit state");
assert.match(traySource, /aria-disabled/, "exhausted cards must expose their state accessibly");

const pointerSource = extractFunction(main, "handleStickerTrayPointerDown");
assert.match(pointerSource, /dataset\.stickerDepleted === "1"/, "pointer pickup must reject exhausted cards");
assert.match(pointerSource, /!canPlaceStickerCopy/, "pointer pickup must use a live authoritative count guard");

for (const addName of ["addStickerFromTrayToPage", "addStickerToActivePage"]) {
  const addSource = extractFunction(main, addName);
  assert.match(addSource, /!canPlaceStickerCopy\(stickerId\)/, `${addName} must reject the N+1 placement`);
  assert.match(addSource, /return false/, `${addName} must report a rejected placement`);
}

const addToEditorSource = extractFunction(main, "addStickerToActivePage");
const canPlaceSource = extractFunction(main, "canPlaceStickerCopy");
const addSandbox = {
  stickerOptions: [{ id: "alpha", label: "アルファ", assetUrl: "alpha.png" }],
  editorState: { pages: { 1: [] } },
  activeEditorPage: 1,
  selectedPlacementId: null,
  THREE: { MathUtils: { clamp(value, min, max) { return Math.max(min, Math.min(max, value)); } } },
  createPlacementId: (() => { let id = 0; return () => `p${++id}`; })(),
  defaultStickerScale() { return 1; },
  nextPlacementZ(placements) { return placements.length * 10 + 10; },
  getActivePagePlacements() { return addSandbox.editorState.pages[1]; },
  saveEditorState() {},
  renderEditorShell() {},
  scheduleStickerCopyInventoryUiRefresh() {},
};
vm.createContext(addSandbox);
vm.runInContext(
  `${placedSource}\n${inventorySource}\n${canPlaceSource}\n${addToEditorSource}\n` +
    "function createStickerCopyInventorySnapshot() { return { unlimited: false, owned: new Map([['alpha', 3]]), placed: readPlacedStickerCounts(editorState) }; }" +
    "globalThis.__add = addStickerToActivePage;",
  addSandbox,
  { timeout: 1000 }
);
assert.equal(addSandbox.__add("alpha"), true);
assert.equal(addSandbox.__add("alpha"), true);
assert.equal(addSandbox.__add("alpha"), true);
assert.equal(addSandbox.__add("alpha"), false, "the fourth placement must be blocked when only three copies are owned");
assert.equal(addSandbox.editorState.pages[1].length, 3);
addSandbox.editorState.pages[1].splice(1, 1);
assert.equal(addSandbox.__add("alpha"), true, "deleting one placement must make one copy selectable again");
assert.equal(addSandbox.editorState.pages[1].length, 3);

const deleteSource = extractFunction(main, "deleteSelectedPlacement");
assert.match(deleteSource, /scheduleStickerCopyInventoryUiRefresh\(\)/, "deleting a placement must restore the visible remaining count");
const refreshUiSource = extractFunction(main, "refreshStickerCopyInventoryUi");
assert.match(refreshUiSource, /querySelectorAll\('\[data-sticker-tray-id\]/, "count refresh must update existing tray cards in place");
assert.doesNotMatch(refreshUiSource, /renderCollectionStickerTray\(\)/, "count refresh must not reset the child's horizontal tray position");
const enterTutorialSource = extractFunction(main, "enterStickerTutorialCleanAlbum");
const restoreTutorialSource = extractFunction(main, "restoreStickerTutorialCleanAlbum");
assert.match(enterTutorialSource, /refreshStickerCopyInventoryUi\(\)/, "the clean tutorial album must recalculate available copies");
assert.match(restoreTutorialSource, /refreshStickerCopyInventoryUi\(\)/, "restoring the real album must restore its counts");

const snapshotSource = extractFunction(main, "createStickerCopyInventorySnapshot");
assert.match(snapshotSource, /unlimited: readDebugAllStickersEnabled\(\)/, "authorized all-sticker debug mode must stay unlimited");
assert.match(main, /PonoGameStickerGranted[\s\S]*?applyStickerAvailability\(\{ forceRender: true \}\)/, "same-tab grants must refresh count badges");
assert.match(main, /event\.key === "pono_game_stickers_v1"[\s\S]*?applyStickerAvailability\(\{ forceRender: true \}\)/, "cross-tab grants must refresh count badges");

assert.match(css, /\.sticker-tray-copy-count\s*\{/, "the lower tray needs a visible copy-count badge");
assert.match(css, /\.sticker-tray-card\.is-depleted\s*\{/, "the lower tray needs a distinct exhausted state");
assert.match(css, /\.sticker-pick-copy-count\s*\{/, "the full sticker picker needs the same count badge");
assert.match(css, /\.sticker-pick\.is-depleted/, "the full sticker picker needs a distinct exhausted state");

assert.match(index, /styles\.css\?v=\d{8}-\d+/, "StickerBook CSS must keep a dated cache-buster");
assert.match(index, /main\.js\?v=\d{8}-\d+/, "StickerBook JS must keep a dated cache-buster");

console.log("stickerbook_copy_inventory_regression: all assertions passed");
