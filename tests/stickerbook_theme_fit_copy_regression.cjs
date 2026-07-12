"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const prototypeRoot = path.join(root, "Prototypes/StickerBookThreeJS");
const main = fs.readFileSync(path.join(prototypeRoot, "main.js"), "utf8");
const css = fs.readFileSync(path.join(prototypeRoot, "styles.css"), "utf8");
const index = fs.readFileSync(path.join(prototypeRoot, "index.html"), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} function missing`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let cursor = bodyStart; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    const next = source[cursor + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        cursor += 1;
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
      cursor += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      cursor += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, cursor + 1);
    }
  }
  assert.fail(`${name} function is unterminated`);
}

assert.match(index, /aria-label="シールちょうを えらぶ"[^>]*>[\s\S]*?ちょうを えらぶ/, "the top action needs the new short and accessible copy");
assert.match(index, /<h2>シールちょうを えらぶ<\/h2>/, "the panel heading must explain the actual operation");
assert.match(index, /<span>いまの シールちょう<\/span>/, "the current-book preview needs a descriptive label");
assert.doesNotMatch(index, /きせかえ/, "the current book-theme UI must reserve きせかえ for future dress-up stickers");
assert.match(main, /textDemo: "シールちょうを えらんだり\\nミュージアムで シールを みられるよ"/, "the tutorial must use the renamed operation");

const selectableThemes = [...index.matchAll(/data-book-theme="([^"]+)"/g)].map((match) => match[1]);
assert.ok(selectableThemes.length >= 4, "the theme picker must retain its selectable books");
const bookFitsStart = main.indexOf("const BOOK_IMAGE_FITS = Object.freeze(");
const bookFitsEnd = main.indexOf("\n\nfunction bookImageFit", bookFitsStart);
assert.ok(bookFitsStart >= 0 && bookFitsEnd > bookFitsStart, "BOOK_IMAGE_FITS configuration must be extractable");
const bookFitsSandbox = {};
vm.createContext(bookFitsSandbox);
vm.runInContext(`${main.slice(bookFitsStart, bookFitsEnd)}\nglobalThis.__fits = BOOK_IMAGE_FITS;`, bookFitsSandbox, { timeout: 1000 });
const configuredFits = bookFitsSandbox.__fits;
assert.deepEqual(
  Object.keys(configuredFits).sort(),
  [...new Set(selectableThemes)].sort(),
  "all 25 retained theme assets need explicit fit metadata",
);
for (const theme of selectableThemes) {
  assert.ok(configuredFits[theme]?.cover, `${theme} needs explicit cover-fit metadata`);
}
const expectedPageInsets = {
  girl: [0, 12, 0, 12],
  shinobi: [4, 16, 4, 12],
  hero: [8, 0, 8, 24],
  rainbow_dream: [0, 0, 0, 8],
};
for (const theme of selectableThemes) {
  const configuredInsets = configuredFits[theme]?.page?.insets;
  if (expectedPageInsets[theme]) {
    assert.deepEqual(Array.from(configuredInsets || []), expectedPageInsets[theme], `${theme} must keep its audited page-edge trim`);
  } else {
    assert.equal(configuredInsets, undefined, `${theme} must not gain an unaudited page-edge trim`);
  }
}
assert.match(
  main,
  /book_buyer_edition: Object\.freeze\(\{[\s\S]*?zoom: 1,[\s\S]*?binding: "baked"/,
  "とくべつ must remain the zero-zoom baked-binding reference",
);

const sourceRectSource = extractFunction(main, "bookImageSourceRect");
const rectSandbox = {};
vm.createContext(rectSandbox);
vm.runInContext(`${sourceRectSource}\nglobalThis.__rect = bookImageSourceRect;`, rectSandbox, { timeout: 1000 });
const targetAspect = 1472 / 1536;
const specialRect = rectSandbox.__rect(
  { naturalWidth: 1254, naturalHeight: 1254 },
  targetAspect,
  { zoom: 1, focusX: 0.5, focusY: 0.5, insets: [0, 0, 0, 0] },
);
assert.ok(Math.abs(specialRect.width / specialRect.height - targetAspect) < 1e-9, "cover fitting must preserve the book aspect without stretching");
assert.ok(Math.abs(specialRect.x - 26.125) < 0.001, "the reference square cover needs only the canonical horizontal crop");
assert.ok(Math.abs(specialRect.y) < 0.001, "the reference cover must keep its full vertical artwork");

const tunedRect = rectSandbox.__rect(
  { naturalWidth: 1254, naturalHeight: 1254 },
  targetAspect,
  { zoom: 1.044, focusX: 0.504, focusY: 0.4968, insets: [0, 0, 0, 0] },
);
assert.ok(tunedRect.width < specialRect.width && tunedRect.height < specialRect.height, "a padded cover must receive a small isotropic zoom");
assert.ok(tunedRect.x >= 0 && tunedRect.y >= 0 && tunedRect.x + tunedRect.width <= 1254.0001 && tunedRect.y + tunedRect.height <= 1254.0001, "tuned source rectangles must stay in bounds");

const pageRect = rectSandbox.__rect(
  { naturalWidth: 1472, naturalHeight: 1536 },
  targetAspect,
  { zoom: 1, focusX: 0.5, focusY: 0.5, insets: [4, 16, 4, 12] },
);
assert.ok(pageRect.x >= 4 && pageRect.y >= 16, "page fitting must trim the audited pale perimeter");
assert.ok(Math.abs(pageRect.width / pageRect.height - targetAspect) < 1e-9, "trimmed pages must still preserve the canonical aspect");

const drawBookSource = extractFunction(main, "drawBookImageCover");
assert.match(drawBookSource, /bookImageSourceRect/, "book bases must use the source-rect fit helper");
assert.match(drawBookSource, /ctx\.drawImage\(image, source\.x, source\.y, source\.width, source\.height/, "only the base image source rectangle should be cropped");
assert.doesNotMatch(drawBookSource, /texture\.(?:repeat|offset|center)/, "final sticker-bearing textures must never receive UV transforms");

const coverTemplateSource = extractFunction(main, "createCoverTemplateTexture");
assert.ok(
  coverTemplateSource.indexOf("drawBookImageCover") < coverTemplateSource.indexOf("drawStickerCanvasPage"),
  "cover art must be fitted before placed stickers are drawn",
);
const pageTemplateSource = extractFunction(main, "createPageTemplateTexture");
assert.ok(
  pageTemplateSource.indexOf("drawStickerImage2FreePageTemplate") < pageTemplateSource.indexOf("drawDynamicPageContent"),
  "page art must be fitted before placed stickers are drawn",
);
assert.match(
  extractFunction(main, "drawStickerImage2FreePageTemplate"),
  /drawBookImageCover\(ctx, image, bookName, "freePage"/,
  "the free-page base itself must use the per-theme source crop",
);
assert.match(extractFunction(main, "coverTextureForBook"), /getFittedBookSurfaceTexture\(bookName, "cover"\)/, "collection covers need the same fit as free-mode covers");
assert.match(extractFunction(main, "coverInsideTextureForBook"), /getFittedBookSurfaceTexture\(normalizedBook, "coverInside"\)/, "inside covers need the same fit pipeline");
assert.match(extractFunction(main, "applyVariantState"), /getFittedBookSurfaceTexture\(activeBook, "coverBack"\)/, "back covers need the same fit pipeline");
const fittedSurfaceSource = extractFunction(main, "getFittedBookSurfaceTexture");
assert.match(fittedSurfaceSource, /releaseFittedBookSurfaceTexturesExcept\(normalizedBook\)/, "switching themes must release fitted canvases from older books");
const fittedSurfaceReleaseSource = extractFunction(main, "releaseFittedBookSurfaceTexturesExcept");
assert.match(fittedSurfaceReleaseSource, /texture\?\.dispose\?\.\(\)/, "released fitted canvases must also free their GPU texture");
assert.match(fittedSurfaceReleaseSource, /fittedBookSurfaceTextureMap\.delete\(key\)/, "released fitted canvases must leave the cache");
const released = [];
const retainedTexture = { dispose: () => released.push("retained") };
const releaseSandbox = {
  __map: new Map([
    ["girl:cover:girl-front", { dispose: () => released.push("girl-cover") }],
    ["girl:coverBack:girl-back", { dispose: () => released.push("girl-back") }],
    ["hero:cover:hero-front", retainedTexture],
  ]),
};
vm.createContext(releaseSandbox);
vm.runInContext(
  `const fittedBookSurfaceTextureMap = globalThis.__map;
   function normalizeBookThemeId(value) { return value; }
   ${fittedSurfaceReleaseSource}
   releaseFittedBookSurfaceTexturesExcept("hero");`,
  releaseSandbox,
  { timeout: 1000 },
);
assert.deepEqual(released.sort(), ["girl-back", "girl-cover"], "theme switches must dispose every older fitted surface and retain the active one");
assert.deepEqual(Array.from(releaseSandbox.__map.keys()), ["hero:cover:hero-front"], "the active theme must be the only fitted-surface cache prefix left");

const ringLayerSource = extractFunction(main, "createCover3DRingLayer");
assert.match(ringLayerSource, /bindingPlate/, "themes without baked binding art need a binding plate beneath the rings");
assert.match(ringLayerSource, /bindingSeam/, "the generated binding plate needs a visible inner seam");
assert.match(ringLayerSource, /bindingPlate:[\s\S]*?transparent: true,[\s\S]*?alphaTest: 0\.02/, "the generated binding plate must blend the texture's soft alpha edge");
assert.match(extractFunction(main, "createCoverSpinePlateGeometry"), /setAttribute\("uv"/, "the themed spine texture needs normalized binding-plate UVs");
const ringThemeSource = extractFunction(main, "applyCover3DRingTheme");
assert.match(ringThemeSource, /binding === "overlay"/, "baked and generated bindings must remain mutually exclusive");
assert.match(ringThemeSource, /getStickerSpineTexture\(activeBook\)/, "the binding overlay must reuse the existing themed spine texture");

assert.match(css, /--sb3d-ui-button-theme: url\("[^\n]+\.webp"\)/, "the renamed action must use the optimized textless button art");
assert.doesNotMatch(css, /--sb3d-ui-button-theme-text/, "the old baked きせかえ button must no longer be referenced");
assert.match(css, /\.top-theme-button \.top-button-label \{[\s\S]*?opacity: 1;/, "the new HTML button label must be visible");
assert.match(css, /\.top-theme-button \{[\s\S]*?background-image: var\(--sb3d-ui-button-theme\)/, "the top action must use the textless art");
assert.doesNotMatch(css, /\.top-theme-button \{[\s\S]{0,180}?padding:\s*0\s+5%\s+0\s+34%/, "button-internal spacing must not resolve against the parent width");
assert.match(css, /\.top-theme-button \{\s*width: 186px;\s*padding: 0 9px 0 60px;/, "the full-size action needs enough fixed-width room for its label");
assert.match(css, /\.top-theme-button \{\s*width: 132px;\s*height: 42px;\s*padding: 0 6px 0 43px;/, "the shortest landscape action must keep the whole label visible");
assert.ok((css.match(/aspect-ratio: 1472 \/ 1536;/g) || []).length >= 2, "current and selectable previews must use the real book ratio");
assert.match(css, /background-size: var\(--book-thumb-size, auto 100%\)/, "theme previews must mirror each cover's fit scale");
assert.match(css, /"label picker"[\s\S]*?"current picker"/, "short landscape panels must avoid nested full-width stacking");

const textlessButton = path.join(root, "assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_ui_button_theme_ribbon_wood_gpt_image2_20260623.webp");
assert.ok(fs.existsSync(textlessButton), "the optimized textless theme button asset must exist");
assert.ok(fs.statSync(textlessButton).size < 200 * 1024, "the textless button must not add a megabyte-scale startup cost");
assert.match(index, /styles\.css\?v=20260713-1273/, "the renamed and resized UI must bypass stale CSS caches");
assert.match(index, /main\.js\?v=20260713-1273/, "the per-theme fit pipeline must bypass stale module caches");

console.log("stickerbook_theme_fit_copy_regression: all assertions passed");
