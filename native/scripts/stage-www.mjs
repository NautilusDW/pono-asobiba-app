#!/usr/bin/env node
/* ============================================================
   native/scripts/stage-www.mjs

   native/content-manifest.json に明示された実行時コンテンツだけを、
   Capacitor の webDir (native/www/) へ安全に展開する。

   安全性の方針:
     - manifest / 全コピー元 / HTML変換 / 出力衝突を先に検証する。
     - コピーは一時ディレクトリへ行い、成功後だけ www/ と入れ替える。
     - 不足ファイル、symlink、秘密ファイル、未知フィールドを黙って無視しない。
     - --dry-run は同じ preflight を行うが、ファイルシステムを変更しない。

   Node.js 標準ライブラリのみを使用する。

   Usage:
     node scripts/stage-www.mjs
     node scripts/stage-www.mjs --dry-run
     node scripts/stage-www.mjs --dry-run --verbose
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const DEFAULT_NATIVE_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_REPO_ROOT = path.resolve(DEFAULT_NATIVE_ROOT, '..');
const DEFAULT_MANIFEST_PATH = path.join(DEFAULT_NATIVE_ROOT, 'content-manifest.json');
const DEFAULT_WWW_DIR = path.join(DEFAULT_NATIVE_ROOT, 'www');

const MANIFEST_KEYS = new Set(['schemaVersion', 'entries']);
const ENTRY_KEYS = new Set(['source', 'destination', 'type', 'files', 'stripTapIntroAd']);
const ENTRY_TYPES = new Set(['file', 'directory', 'file-list']);

const FORBIDDEN_SOURCE_TOP_LEVEL = new Set([
  '.git', '.github', '.claude', '.vscode', '.wrangler',
  'admin', 'docs', 'logs', 'memory', 'native', 'node_modules',
  'scripts', 'src', 'tests', 'test-results', 'tmp', 'tools'
]);
const FORBIDDEN_DESTINATION_ROOT_FILES = new Set([
  'manifest.json', 'package.json', 'sw.js', 'wrangler.toml', '.dev.vars'
]);
const SECRET_NAME_PATTERNS = [/^\.env(?:\.|$)/i, /^\.dev\.vars(?:\.|$)/i];
const CONTROL_CHARACTER_RE = /[\u0000-\u001f\u007f]/;
const WINDOWS_ABSOLUTE_RE = /^(?:[A-Za-z]:[\\/]|\\\\)/;

const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });
const AD_BLOCK_MARKER = '<div class="tap-intro-ad"';
const NATIVE_INJECTION_MARKER = 'data-pono-native-flags';
const INJECT_SCRIPT =
  `<script ${NATIVE_INJECTION_MARKER}>window.__APP_BUILD__=1;window.__NATIVE_BUILD__=1;` +
  `window.PONO_API_BASE='https://pono-asobiba-app.ndw.workers.dev';</script>`;

function compareCodeUnits(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function formatMiB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} はオブジェクトである必要があります。`);
  }
}

function assertOnlyKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`${label} に未知のフィールド "${key}" があります。`);
    }
  }
}

function validateRelativePath(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} は空でない文字列である必要があります。`);
  }
  if (CONTROL_CHARACTER_RE.test(value)) {
    throw new Error(`${label} に制御文字は使用できません: ${JSON.stringify(value)}`);
  }
  if (value.includes('\\')) {
    throw new Error(`${label} は POSIX 区切り (/) で記述してください: ${value}`);
  }
  if (path.posix.isAbsolute(value) || WINDOWS_ABSOLUTE_RE.test(value)) {
    throw new Error(`${label} に絶対パスは使用できません: ${value}`);
  }

  const segments = value.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error(`${label} は正規化済み相対パスである必要があります: ${value}`);
  }
  if (path.posix.normalize(value) !== value) {
    throw new Error(`${label} は正規化済み相対パスである必要があります: ${value}`);
  }
  if (segments.some((segment) => segment.startsWith('.'))) {
    throw new Error(`${label} に隠しファイル/ディレクトリは使用できません: ${value}`);
  }

  return value;
}

function assertSafeSourcePath(source, label) {
  const segments = source.split('/');
  if (FORBIDDEN_SOURCE_TOP_LEVEL.has(segments[0])) {
    throw new Error(`${label} は native build に同梱できない領域です: ${source}`);
  }
  for (const segment of segments) {
    if (SECRET_NAME_PATTERNS.some((pattern) => pattern.test(segment))) {
      throw new Error(`${label} に秘密ファイル名を指定できません: ${source}`);
    }
  }
}

function assertSafeDestinationPath(destination, label) {
  const segments = destination.split('/');
  if (segments.length === 1 && FORBIDDEN_DESTINATION_ROOT_FILES.has(destination)) {
    throw new Error(`${label} は Web/LP 専用のため native root に配置できません: ${destination}`);
  }
}

function assertPathInside(baseDir, absolutePath, label) {
  const relative = path.relative(baseDir, absolutePath);
  if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
    return;
  }
  throw new Error(`${label} が許可されたルートの外を指しています: ${absolutePath}`);
}

function assertNoSymlinkInSourcePath(repoRoot, source) {
  let current = repoRoot;
  for (const segment of source.split('/')) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        throw new Error(`manifest source が存在しません: ${source}`);
      }
      throw error;
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`manifest source に symlink は使用できません: ${source}`);
    }
  }
}

function readUtf8FileStrict(filePath, label) {
  try {
    return UTF8_DECODER.decode(fs.readFileSync(filePath));
  } catch (error) {
    throw new Error(`${label} を UTF-8 として読めません: ${error.message}`);
  }
}

export function loadContentManifest(manifestPath = DEFAULT_MANIFEST_PATH) {
  let manifest;
  try {
    manifest = JSON.parse(readUtf8FileStrict(manifestPath, 'content manifest'));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`content manifest の JSON が不正です: ${error.message}`);
    }
    throw error;
  }

  assertPlainObject(manifest, 'content manifest');
  assertOnlyKeys(manifest, MANIFEST_KEYS, 'content manifest');
  if (manifest.schemaVersion !== 1) {
    throw new Error(`未対応の content manifest schemaVersion: ${manifest.schemaVersion}`);
  }
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    throw new Error('content manifest.entries は空でない配列である必要があります。');
  }

  const entries = manifest.entries.map((rawEntry, index) => {
    const label = `content manifest.entries[${index}]`;
    assertPlainObject(rawEntry, label);
    assertOnlyKeys(rawEntry, ENTRY_KEYS, label);

    const source = validateRelativePath(rawEntry.source, `${label}.source`);
    const destination = validateRelativePath(rawEntry.destination, `${label}.destination`);
    assertSafeSourcePath(source, `${label}.source`);
    assertSafeDestinationPath(destination, `${label}.destination`);

    if (!ENTRY_TYPES.has(rawEntry.type)) {
      throw new Error(`${label}.type は "file" / "directory" / "file-list" のいずれかである必要があります。`);
    }
    if ('stripTapIntroAd' in rawEntry && typeof rawEntry.stripTapIntroAd !== 'boolean') {
      throw new Error(`${label}.stripTapIntroAd は boolean である必要があります。`);
    }
    if (rawEntry.stripTapIntroAd && (rawEntry.type !== 'file' || !/\.html?$/i.test(destination))) {
      throw new Error(`${label}.stripTapIntroAd は HTML file にだけ指定できます。`);
    }

    let files;
    if (rawEntry.type === 'file-list') {
      if (!Array.isArray(rawEntry.files) || rawEntry.files.length === 0) {
        throw new Error(`${label}.files は file-list で使う空でない配列である必要があります。`);
      }
      const seenFiles = new Map();
      files = rawEntry.files.map((rawFile, fileIndex) => {
        const file = validateRelativePath(rawFile, `${label}.files[${fileIndex}]`);
        const key = canonicalDestination(file);
        if (seenFiles.has(key)) {
          throw new Error(
            `${label}.files が重複/大小文字・Unicode正規化で衝突します: ` +
            `${seenFiles.get(key)} と ${file}`
          );
        }
        seenFiles.set(key, file);
        return file;
      });
    } else if ('files' in rawEntry) {
      throw new Error(`${label}.files は type="file-list" にだけ指定できます。`);
    }

    return Object.freeze({
      source,
      destination,
      type: rawEntry.type,
      files: files ? Object.freeze(files) : undefined,
      stripTapIntroAd: rawEntry.stripTapIntroAd === true
    });
  });

  return Object.freeze({ schemaVersion: 1, entries: Object.freeze(entries) });
}

function assertAllowedSourceNode(stat, sourceLabel) {
  if (stat.isSymbolicLink()) {
    throw new Error(`manifest source に symlink は使用できません: ${sourceLabel}`);
  }
  if (!stat.isFile() && !stat.isDirectory()) {
    throw new Error(`manifest source に通常ファイル/ディレクトリ以外は使用できません: ${sourceLabel}`);
  }
}

function assertSafeDescendantName(name, sourceLabel) {
  if (name.startsWith('.')) {
    throw new Error(`manifest directory に隠し項目を含められません: ${sourceLabel}`);
  }
  if (SECRET_NAME_PATTERNS.some((pattern) => pattern.test(name))) {
    throw new Error(`manifest directory に秘密ファイルを含められません: ${sourceLabel}`);
  }
}

function expandDirectory(sourceDir, destinationDir, sourceLabel, entryIndex, files) {
  const children = fs.readdirSync(sourceDir, { withFileTypes: true })
    .sort((a, b) => compareCodeUnits(a.name, b.name));

  for (const child of children) {
    const childSourceLabel = `${sourceLabel}/${child.name}`;
    assertSafeDescendantName(child.name, childSourceLabel);

    const childSource = path.join(sourceDir, child.name);
    const childDestination = path.posix.join(destinationDir, child.name);
    const stat = fs.lstatSync(childSource);
    assertAllowedSourceNode(stat, childSourceLabel);

    if (stat.isDirectory()) {
      expandDirectory(childSource, childDestination, childSourceLabel, entryIndex, files);
    } else {
      files.push({
        entryIndex,
        sourceAbs: childSource,
        sourceRel: childSourceLabel,
        destinationRel: childDestination,
        sourceBytes: stat.size,
        sourceMtimeMs: stat.mtimeMs,
        stripTapIntroAd: false
      });
    }
  }
}

function canonicalDestination(destination) {
  return destination.normalize('NFC').toLowerCase();
}

function validateDestinationCollisions(files) {
  const destinations = new Map();
  const directories = new Map();
  for (const file of files) {
    const key = canonicalDestination(file.destinationRel);
    const existing = destinations.get(key);
    if (existing) {
      throw new Error(
        `出力先が重複/大小文字・Unicode正規化で衝突します: ` +
        `${existing.destinationRel} と ${file.destinationRel}`
      );
    }
    destinations.set(key, file);

    const segments = file.destinationRel.split('/');
    for (let length = 1; length < segments.length; length++) {
      const directory = segments.slice(0, length).join('/');
      const directoryKey = canonicalDestination(directory);
      const existingDirectory = directories.get(directoryKey);
      if (existingDirectory && existingDirectory !== directory) {
        throw new Error(
          `出力directoryが大小文字・Unicode正規化で衝突します: ` +
          `${existingDirectory} と ${directory}`
        );
      }
      directories.set(directoryKey, directory);
    }
  }

  for (const file of files) {
    const segments = file.destinationRel.split('/');
    for (let length = 1; length < segments.length; length++) {
      const ancestor = segments.slice(0, length).join('/');
      const ancestorFile = destinations.get(canonicalDestination(ancestor));
      if (ancestorFile) {
        throw new Error(
          `出力先の file/directory が衝突します: ${ancestorFile.destinationRel} と ${file.destinationRel}`
        );
      }
    }
  }
}

function stripAdBlock(html, sourceLabel) {
  const startIndex = html.indexOf(AD_BLOCK_MARKER);
  if (startIndex === -1) {
    throw new Error(`tap-intro-ad ブロックが見つかりません: ${sourceLabel}`);
  }

  const tagPattern = /<div\b|<\/div\s*>/gi;
  tagPattern.lastIndex = startIndex;
  let depth = 0;
  let endIndex = -1;
  let match;
  while ((match = tagPattern.exec(html))) {
    if (/^<div/i.test(match[0])) depth += 1;
    else depth -= 1;
    if (depth === 0) {
      endIndex = match.index + match[0].length;
      break;
    }
  }

  if (endIndex === -1) {
    throw new Error(`tap-intro-ad ブロックの終了タグが見つかりません: ${sourceLabel}`);
  }
  if (html.indexOf(AD_BLOCK_MARKER, endIndex) !== -1) {
    throw new Error(`tap-intro-ad ブロックが複数あります: ${sourceLabel}`);
  }

  return html.slice(0, startIndex).replace(/[ \t]*$/, '') + html.slice(endIndex);
}

function stripWebManifestLinks(html) {
  let stripped = 0;
  const output = html.replace(/<link\b[^>]*>/gi, (tag) => {
    const relMatch = /\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
    const relValue = relMatch ? (relMatch[1] || relMatch[2] || relMatch[3] || '') : '';
    const relTokens = relValue.toLowerCase().split(/\s+/).filter(Boolean);
    if (!relTokens.includes('manifest')) return tag;
    stripped += 1;
    return '';
  });
  return { html: output, stripped };
}

function transformHtml(rawHtml, file) {
  let html = rawHtml;
  if (html.includes(NATIVE_INJECTION_MARKER) || /window\.__NATIVE_BUILD__\s*=\s*1\b/.test(html)) {
    throw new Error(`native flags がコピー元 HTML に既に存在します: ${file.sourceRel}`);
  }
  if (file.stripTapIntroAd) {
    html = stripAdBlock(html, file.sourceRel);
  }
  const manifestResult = stripWebManifestLinks(html);
  html = manifestResult.html;

  // コメント中の「<head> preload」のような説明文をタグと誤認しない。
  // 空白置換で文字数を保つため、match.index は元 HTML にそのまま適用できる。
  const htmlStructure = html.replace(/<!--[\s\S]*?-->/g, (comment) => ' '.repeat(comment.length));
  const openHeads = [...htmlStructure.matchAll(/<head\b[^>]*>/gi)];
  const closeHeads = [...htmlStructure.matchAll(/<\/head\s*>/gi)];
  if (openHeads.length !== 1 || closeHeads.length !== 1) {
    throw new Error(
      `HTML は <head> と </head> をちょうど1組持つ必要があります: ${file.sourceRel} ` +
      `(open=${openHeads.length}, close=${closeHeads.length})`
    );
  }
  const openHead = openHeads[0];
  if (closeHeads[0].index <= openHead.index) {
    throw new Error(`HTML の <head> 構造が不正です: ${file.sourceRel}`);
  }

  const insertAt = openHead.index + openHead[0].length;
  return {
    html: html.slice(0, insertAt) + `\n  ${INJECT_SCRIPT}` + html.slice(insertAt),
    strippedWebManifestLinks: manifestResult.stripped
  };
}

function prepareOutput(file) {
  const isHtml = /\.html?$/i.test(file.destinationRel);
  if (!isHtml) {
    return {
      ...file,
      isHtml: false,
      outputBytes: file.sourceBytes,
      outputBuffer: null,
      strippedWebManifestLinks: 0
    };
  }

  const rawHtml = readUtf8FileStrict(file.sourceAbs, `HTML (${file.sourceRel})`);
  const transformed = transformHtml(rawHtml, file);
  const outputBuffer = Buffer.from(transformed.html, 'utf8');
  return {
    ...file,
    isHtml: true,
    outputBytes: outputBuffer.length,
    outputBuffer,
    strippedWebManifestLinks: transformed.strippedWebManifestLinks
  };
}

export function buildStagePlan({
  repoRoot = DEFAULT_REPO_ROOT,
  manifestPath = DEFAULT_MANIFEST_PATH
} = {}) {
  const resolvedRepoRoot = path.resolve(repoRoot);
  const resolvedManifestPath = path.resolve(manifestPath);
  const manifest = loadContentManifest(resolvedManifestPath);
  const expandedFiles = [];

  manifest.entries.forEach((entry, entryIndex) => {
    const sourceAbs = path.resolve(resolvedRepoRoot, ...entry.source.split('/'));
    assertPathInside(resolvedRepoRoot, sourceAbs, `entries[${entryIndex}].source`);
    assertNoSymlinkInSourcePath(resolvedRepoRoot, entry.source);

    const stat = fs.lstatSync(sourceAbs);
    assertAllowedSourceNode(stat, entry.source);
    if (entry.type === 'file' && !stat.isFile()) {
      throw new Error(`manifest type mismatch (file を期待): ${entry.source}`);
    }
    if ((entry.type === 'directory' || entry.type === 'file-list') && !stat.isDirectory()) {
      throw new Error(`manifest type mismatch (directory を期待): ${entry.source}`);
    }

    const beforeCount = expandedFiles.length;
    if (entry.type === 'file') {
      expandedFiles.push({
        entryIndex,
        sourceAbs,
        sourceRel: entry.source,
        destinationRel: entry.destination,
        sourceBytes: stat.size,
        sourceMtimeMs: stat.mtimeMs,
        stripTapIntroAd: entry.stripTapIntroAd
      });
    } else if (entry.type === 'directory') {
      expandDirectory(sourceAbs, entry.destination, entry.source, entryIndex, expandedFiles);
      if (expandedFiles.length === beforeCount) {
        throw new Error(`空の directory entry は同梱できません: ${entry.source}`);
      }
    } else {
      for (const listedFile of entry.files) {
        const listedSourceRel = path.posix.join(entry.source, listedFile);
        const listedDestinationRel = path.posix.join(entry.destination, listedFile);
        assertNoSymlinkInSourcePath(resolvedRepoRoot, listedSourceRel);
        const listedSourceAbs = path.resolve(resolvedRepoRoot, ...listedSourceRel.split('/'));
        assertPathInside(resolvedRepoRoot, listedSourceAbs, `entries[${entryIndex}].files`);
        const listedStat = fs.lstatSync(listedSourceAbs);
        assertAllowedSourceNode(listedStat, listedSourceRel);
        if (!listedStat.isFile()) {
          throw new Error(`file-list は通常ファイルだけを指定できます: ${listedSourceRel}`);
        }
        expandedFiles.push({
          entryIndex,
          sourceAbs: listedSourceAbs,
          sourceRel: listedSourceRel,
          destinationRel: listedDestinationRel,
          sourceBytes: listedStat.size,
          sourceMtimeMs: listedStat.mtimeMs,
          stripTapIntroAd: false
        });
      }
    }
  });

  expandedFiles.sort((a, b) => compareCodeUnits(a.destinationRel, b.destinationRel));
  validateDestinationCollisions(expandedFiles);

  const files = expandedFiles.map(prepareOutput);
  const entrySummaries = manifest.entries.map((entry, entryIndex) => {
    const entryFiles = files.filter((file) => file.entryIndex === entryIndex);
    return {
      ...entry,
      fileCount: entryFiles.length,
      bytes: entryFiles.reduce((sum, file) => sum + file.outputBytes, 0)
    };
  });

  return {
    manifestPath: resolvedManifestPath,
    manifest,
    files,
    entrySummaries,
    totalFiles: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.outputBytes, 0),
    htmlFiles: files.filter((file) => file.isHtml).length,
    strippedAdBlocks: files.filter((file) => file.stripTapIntroAd).length,
    strippedWebManifestLinks: files.reduce(
      (sum, file) => sum + file.strippedWebManifestLinks,
      0
    )
  };
}

function walkOutputFiles(outputRoot, relativeBase = '', files = []) {
  const absoluteDir = relativeBase
    ? path.join(outputRoot, ...relativeBase.split('/'))
    : outputRoot;
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true })
    .sort((a, b) => compareCodeUnits(a.name, b.name));

  for (const entry of entries) {
    const relative = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
    const absolute = path.join(absoluteDir, entry.name);
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      throw new Error(`stage output に symlink が混入しました: ${relative}`);
    }
    if (stat.isDirectory()) {
      walkOutputFiles(outputRoot, relative, files);
    } else if (stat.isFile()) {
      files.push({ relative, bytes: stat.size });
    } else {
      throw new Error(`stage output に通常ファイル以外が混入しました: ${relative}`);
    }
  }
  return files;
}

export function verifyOutputInventory(outputRoot, plan) {
  const expected = new Map(plan.files.map((file) => [file.destinationRel, file.outputBytes]));
  const actualFiles = walkOutputFiles(outputRoot);
  const actual = new Map(actualFiles.map((file) => [file.relative, file.bytes]));

  for (const [relative, bytes] of actual) {
    if (!expected.has(relative)) {
      throw new Error(`manifest にないファイルが stage output にあります: ${relative}`);
    }
    if (expected.get(relative) !== bytes) {
      throw new Error(
        `stage output のサイズが計画と一致しません: ${relative} ` +
        `(expected=${expected.get(relative)}, actual=${bytes})`
      );
    }
  }
  for (const relative of expected.keys()) {
    if (!actual.has(relative)) {
      throw new Error(`manifest のファイルが stage output にありません: ${relative}`);
    }
  }
  if (actual.size !== expected.size) {
    throw new Error(`stage output のファイル数が計画と一致しません: expected=${expected.size}, actual=${actual.size}`);
  }

  for (const file of plan.files) {
    const outputAbsolute = path.join(outputRoot, ...file.destinationRel.split('/'));
    const outputBuffer = fs.readFileSync(outputAbsolute);
    const expectedBuffer = file.outputBuffer || fs.readFileSync(file.sourceAbs);
    if (!outputBuffer.equals(expectedBuffer)) {
      throw new Error(`stage output の内容がコピー元/変換計画と一致しません: ${file.destinationRel}`);
    }
  }
}

function assertSourceUnchanged(file) {
  const stat = fs.lstatSync(file.sourceAbs);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size !== file.sourceBytes ||
    stat.mtimeMs !== file.sourceMtimeMs
  ) {
    throw new Error(`preflight 後にコピー元が変更されました。再実行してください: ${file.sourceRel}`);
  }
}

function writeStageDirectory(stageDir, plan) {
  fs.mkdirSync(stageDir, { recursive: true });
  for (const file of plan.files) {
    assertSourceUnchanged(file);
    const destinationAbs = path.resolve(stageDir, ...file.destinationRel.split('/'));
    assertPathInside(stageDir, destinationAbs, `stage destination (${file.destinationRel})`);
    fs.mkdirSync(path.dirname(destinationAbs), { recursive: true });
    if (file.outputBuffer) {
      fs.writeFileSync(destinationAbs, file.outputBuffer);
    } else {
      fs.copyFileSync(file.sourceAbs, destinationAbs);
    }
  }
  verifyOutputInventory(stageDir, plan);
}

function replaceDirectoryTransactionally(stageDir, wwwDir) {
  const parent = path.dirname(wwwDir);
  const backupDir = path.join(parent, `.www-backup-${process.pid}-${Date.now()}`);
  const hadPrevious = fs.existsSync(wwwDir);
  let previousMoved = false;

  try {
    if (hadPrevious) {
      fs.renameSync(wwwDir, backupDir);
      previousMoved = true;
    }
    fs.renameSync(stageDir, wwwDir);
    if (previousMoved) fs.rmSync(backupDir, { recursive: true, force: true });
  } catch (error) {
    if (!fs.existsSync(wwwDir) && previousMoved && fs.existsSync(backupDir)) {
      fs.renameSync(backupDir, wwwDir);
    }
    throw error;
  } finally {
    if (fs.existsSync(backupDir) && fs.existsSync(wwwDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
  }
}

function logPlan(plan, { logger, verbose }) {
  logger(`manifest: ${plan.manifestPath}`);
  for (const summary of plan.entrySummaries) {
    logger(
      `  ${summary.source} -> ${summary.destination} ` +
      `[${summary.type}, ${summary.fileCount} files, ${formatMiB(summary.bytes)}]`
    );
  }
  logger(
    `preflight PASS: ${plan.totalFiles} files, ${formatMiB(plan.totalBytes)}, ` +
    `${plan.htmlFiles} HTML, ${plan.strippedAdBlocks} ad blocks stripped, ` +
    `${plan.strippedWebManifestLinks} Web manifest links stripped`
  );
  if (verbose) {
    for (const file of plan.files) {
      logger(`    ${file.sourceRel} -> ${file.destinationRel} (${file.outputBytes} bytes)`);
    }
  }
}

export function stageContent({
  repoRoot = DEFAULT_REPO_ROOT,
  nativeRoot = DEFAULT_NATIVE_ROOT,
  manifestPath = DEFAULT_MANIFEST_PATH,
  wwwDir,
  dryRun = false,
  verbose = false,
  logger = (message) => console.log(`[stage-www] ${message}`)
} = {}) {
  const resolvedNativeRoot = path.resolve(nativeRoot);
  const resolvedWwwDir = path.resolve(wwwDir || path.join(resolvedNativeRoot, 'www'));
  assertPathInside(resolvedNativeRoot, resolvedWwwDir, 'wwwDir');
  if (resolvedWwwDir === resolvedNativeRoot) {
    throw new Error('wwwDir に native root 自体は指定できません。');
  }

  logger(dryRun ? 'DRY RUN -- preflight only; no files will be written' : 'preflight ...');
  const plan = buildStagePlan({ repoRoot, manifestPath });
  logPlan(plan, { logger, verbose });
  if (dryRun) return plan;

  const stageDir = path.join(resolvedNativeRoot, `.www-stage-${process.pid}-${Date.now()}`);
  try {
    logger('copying to transactional staging directory ...');
    writeStageDirectory(stageDir, plan);
    replaceDirectoryTransactionally(stageDir, resolvedWwwDir);
  } catch (error) {
    if (fs.existsSync(stageDir)) fs.rmSync(stageDir, { recursive: true, force: true });
    throw error;
  }

  logger(`done -> ${resolvedWwwDir}`);
  return plan;
}

export function parseCliArgs(args) {
  const allowed = new Set(['--dry-run', '--verbose']);
  for (const arg of args) {
    if (!allowed.has(arg)) {
      throw new Error(`未知のオプションです: ${arg}`);
    }
  }
  return {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose')
  };
}

function isMainModule() {
  return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === path.resolve(SCRIPT_PATH);
}

if (isMainModule()) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    stageContent(options);
  } catch (error) {
    console.error(`[stage-www] FATAL: ${error.message}`);
    process.exitCode = 1;
  }
}
