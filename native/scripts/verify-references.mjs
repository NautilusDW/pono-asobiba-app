#!/usr/bin/env node
/* ============================================================
   native/scripts/verify-references.mjs

   native/www/ に展開された runtime HTML/CSS の同一origin参照と、
   シールカタログ内の動的画像参照を検証する。

   JavaScript で組み立てる全URLの一般解析は行わない。代わりに、動的参照が
   多い game-stickers.json / sticker_book_content_plan.json は構造を直接検証する。
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const NATIVE_ROOT = path.resolve(SCRIPT_DIR, '..');
const WWW_DIR = path.join(NATIVE_ROOT, 'www');
const LOCAL_ORIGIN = 'http://pono-native.invalid/';

const failures = [];
const checkedReferences = new Set();
let scannedTextFiles = 0;
let externalReferences = 0;
let dynamicReferencesSkipped = 0;
let devOnlyReferencesSkipped = 0;

const KNOWN_DEV_ONLY_TARGETS = new Set(['play-all.html']);

function compareCodeUnits(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function walk(dir, relativeBase = '', files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => compareCodeUnits(a.name, b.name));
  for (const entry of entries) {
    const relative = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute, relative, files);
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function stripTextComments(content, extension) {
  let stripped = content.replace(/\/\*[\s\S]*?\*\//g, '');
  if (extension === '.html' || extension === '.htm') {
    stripped = stripped.replace(/<!--[\s\S]*?-->/g, '');
  }
  return stripped;
}

function extractLiteralReferences(content, extension) {
  const references = [];
  const stripped = stripTextComments(content, extension);

  if (extension === '.css') {
    const cssUrlPattern = /url\(\s*(?:(["'])(.*?)\1|([^)'"\s][^)]*?))\s*\)/gi;
    let cssMatch;
    while ((cssMatch = cssUrlPattern.exec(stripped))) {
      references.push(cssMatch[2] ?? cssMatch[3] ?? '');
    }
    return references;
  }

  // inline script の `img.src = ' + value + '` 等をHTML属性と誤認しない。
  // script/style の開始タグ自体は残し、src属性は引き続き検証する。
  const inlineStyleBodies = [...stripped.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)]
    .map((match) => match[1]);
  const markupOnly = stripped
    .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script\s*>)/gi, '$1$2')
    .replace(/(<style\b[^>]*>)[\s\S]*?(<\/style\s*>)/gi, '$1$2');

  const attributePattern = /\b(?:src|href|poster)\s*=\s*(["'])(.*?)\1/gi;
  let match;
  while ((match = attributePattern.exec(markupOnly))) references.push(match[2]);

  const srcsetPattern = /\bsrcset\s*=\s*(["'])(.*?)\1/gi;
  while ((match = srcsetPattern.exec(markupOnly))) {
    for (const candidate of match[2].split(',')) {
      const reference = candidate.trim().split(/\s+/)[0];
      if (reference) references.push(reference);
    }
  }

  const cssUrlPattern = /url\(\s*(?:(["'])(.*?)\1|([^)'"\s][^)]*?))\s*\)/gi;
  for (const styleBody of inlineStyleBodies) {
    while ((match = cssUrlPattern.exec(styleBody))) {
      references.push(match[2] ?? match[3] ?? '');
    }
    cssUrlPattern.lastIndex = 0;
  }

  return references;
}

function shouldIgnoreReference(reference) {
  const value = reference.trim();
  if (!value || value.startsWith('#') || value.startsWith('?')) return true;
  if (/^(?:data|blob|javascript|mailto|tel|about):/i.test(value)) return true;
  if (value.includes('${') || value.includes('{{') || value.includes('...') || value.includes('＜')) {
    dynamicReferencesSkipped += 1;
    return true;
  }
  return false;
}

function resolveLocalReference(sourceRelative, rawReference) {
  const reference = decodeHtmlEntities(rawReference.trim());
  if (shouldIgnoreReference(reference)) return null;

  let resolved;
  try {
    resolved = new URL(reference, new URL(sourceRelative, LOCAL_ORIGIN));
  } catch (error) {
    failures.push(`${sourceRelative}: URLを解決できません: ${JSON.stringify(reference)} (${error.message})`);
    return null;
  }
  if (resolved.origin !== new URL(LOCAL_ORIGIN).origin) {
    externalReferences += 1;
    return null;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(resolved.pathname);
  } catch (error) {
    failures.push(`${sourceRelative}: URLエンコードが不正です: ${JSON.stringify(reference)}`);
    return null;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const relative = pathname.replace(/^\/+/, '');
  return relative || 'index.html';
}

function verifyReference(sourceRelative, rawReference) {
  const targetRelative = resolveLocalReference(sourceRelative, rawReference);
  if (!targetRelative) return;
  if (KNOWN_DEV_ONLY_TARGETS.has(targetRelative)) {
    devOnlyReferencesSkipped += 1;
    return;
  }

  const key = `${sourceRelative}\u0000${targetRelative}`;
  if (checkedReferences.has(key)) return;
  checkedReferences.add(key);

  const targetAbsolute = path.resolve(WWW_DIR, ...targetRelative.split('/'));
  const relativeFromRoot = path.relative(WWW_DIR, targetAbsolute);
  if (relativeFromRoot === '..' || relativeFromRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeFromRoot)) {
    failures.push(`${sourceRelative}: 同梱root外を参照しています: ${rawReference}`);
    return;
  }
  if (!fs.existsSync(targetAbsolute) || !fs.statSync(targetAbsolute).isFile()) {
    failures.push(`${sourceRelative}: 同梱ファイルがありません: ${rawReference} -> ${targetRelative}`);
  }
}

function verifyTextReferences() {
  const textFiles = walk(WWW_DIR).filter((relative) => /\.(?:html?|css)$/i.test(relative));
  for (const relative of textFiles) {
    scannedTextFiles += 1;
    const absolute = path.join(WWW_DIR, ...relative.split('/'));
    const extension = path.extname(relative).toLowerCase();
    const content = fs.readFileSync(absolute, 'utf8');
    for (const reference of extractLiteralReferences(content, extension)) {
      verifyReference(relative, reference);
    }
  }
}

function collectValuesByKey(value, wantedKey, output = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectValuesByKey(item, wantedKey, output));
    return output;
  }
  if (!value || typeof value !== 'object') return output;
  for (const [key, child] of Object.entries(value)) {
    if (key === wantedKey && typeof child === 'string') output.push(child);
    collectValuesByKey(child, wantedKey, output);
  }
  return output;
}

function readJson(relative) {
  const absolute = path.join(WWW_DIR, ...relative.split('/'));
  return JSON.parse(fs.readFileSync(absolute, 'utf8'));
}

function verifyStructuredCatalogs() {
  const gameStickerCatalog = readJson('assets/data/game-stickers.json');
  for (const reference of collectValuesByKey(gameStickerCatalog, 'img')) {
    verifyReference('index.html', reference);
  }

  const stickerBookPlan = readJson('Prototypes/StickerBookThreeJS/sticker_book_content_plan.json');
  for (const reference of collectValuesByKey(stickerBookPlan, 'assetPath')) {
    verifyReference('index.html', reference);
  }
}

function main() {
  if (!fs.existsSync(WWW_DIR)) {
    console.error(`[verify-references] FATAL: ${WWW_DIR} が存在しません。先に stage-www を実行してください。`);
    process.exitCode = 1;
    return;
  }

  try {
    verifyTextReferences();
    verifyStructuredCatalogs();
  } catch (error) {
    failures.push(`検証処理に失敗しました: ${error.message}`);
  }

  console.log(
    `[verify-references] scanned: ${scannedTextFiles} HTML/CSS, ` +
    `${checkedReferences.size} unique local references, ${externalReferences} external references`
  );
  if (dynamicReferencesSkipped) {
    console.log(`[verify-references] skipped dynamic/template references: ${dynamicReferencesSkipped}`);
  }
  if (devOnlyReferencesSkipped) {
    console.log(`[verify-references] skipped hidden developer-only references: ${devOnlyReferencesSkipped}`);
  }

  if (failures.length) {
    console.error('[verify-references] FAIL:');
    failures.forEach((failure) => console.error(`  - ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log('[verify-references] PASS -- all literal runtime references are present.');
}

main();
