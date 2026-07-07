#!/usr/bin/env node
/* ============================================================
   native/scripts/stage-www.mjs

   Capacitor Phase 1: リポジトリのソースから native/www/ (Capacitor webDir)
   を機械的に再生成する。Node.js 標準ライブラリのみを使用 (追加依存禁止)。

   方式: allowlist copy
     - リポジトリ直下の「ファイル」は allowlist (今のところ play.html のみ)。
       直下には .smoke_play.html / .smoke_play3.tmp のような SW register を
       含む検証ゴミが実際に git 管理下で残存しており (2026-07-06 実測)、
       denylist 方式だと新種のゴミに対して脆弱なため allowlist で確実に排除する。
     - リポジトリ直下の「ディレクトリ」は denylist (開発/ツール/LP専用ディレクトリ
       のみ除外し、それ以外の全ディレクトリをコピーする)。素材の厳選 (1.4GB→
       600-800MB) は Phase 2-3 に送る方針のため、ここでの過剰包含は許容する。

   処理内容:
     1. play.html を www/play.html と www/index.html (Capacitor エントリポイント)
        の 2 箇所へ複製。複製時に tap-intro-ad (Amazon 広告導線) ブロックを
        depth-balanced に丸ごと除去する。
     2. 全 .html ファイルの <head ...> 直後に __APP_BUILD__ / __NATIVE_BUILD__ /
        PONO_API_BASE を注入する script タグを挿入 (src/worker.js:114-126 の
        Web 版注入と同型)。
     3. denylist 以外の直下ディレクトリを再帰コピー。assets/ 配下は
        _orig 系 / _PonoSubmarine / _legacy_png / staging を追加除外する。

   Usage:
     node scripts/stage-www.mjs            # 実行 (native/www/ を再生成)
     node scripts/stage-www.mjs --dry-run   # コピー計画のみ表示、書き込みなし
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NATIVE_ROOT = path.resolve(__dirname, '..');       // native/
const REPO_ROOT = path.resolve(NATIVE_ROOT, '..');       // repo root
const WWW_DIR = path.join(NATIVE_ROOT, 'www');

const DRY_RUN = process.argv.includes('--dry-run');

// --- リポジトリ直下でコピーする「ファイル」の allowlist ---
// これ以外の直下ファイル (.smoke_*, _tmp*, tmp_capture_*.png, index.html(LP),
// sw.js, manifest.json, package.json 等) は一切コピーしない。
const ROOT_FILE_ALLOWLIST = ['play.html'];

// --- リポジトリ直下でコピーしない「ディレクトリ」の denylist ---
// これ以外の直下ディレクトリ (aquarium, bento, breakout, common, js, assets, ...)
// は全部コピー対象 (ゲーム/共通コードの素材厳選は Phase 2-3 で行う)。
const ROOT_DIR_DENYLIST = new Set([
  '.git', '.github', '.claude', '.claude-design-bundle', '.pytest_cache', '.vscode', '.wrangler',
  'node_modules', 'Prototypes', '_backups', '_capture_tmp',
  'admin', 'docs', 'logs', 'memory', 'message', 'others',
  'playwright-report', 'scratchpad', 'scripts', 'src',
  'test-results', 'tests', 'tmp', 'tmp-investigate', 'tools',
  // native/ 自身 (念のため。REPO_ROOT 走査対象には通常含まれないが二重ガード)
  'native'
]);

// assets/ 配下でさらに除外するパスセグメント (旧素材バックアップ・staging 残骸・archive)
const ASSET_PATH_EXCLUDE_PATTERNS = [
  /(^|[\\/])_orig[^\\/]*([\\/]|$)/i,
  /(^|[\\/])_PonoSubmarine([\\/]|$)/i,
  /(^|[\\/])_legacy_png([\\/]|$)/i,
  /(^|[\\/])staging([\\/]|$)/i,
  /(^|[\\/])_archive([\\/]|$)/i
];

// native build 判定フラグ注入 (worker 側 window.__APP_BUILD__=1 注入
// [src/worker.js:114-126] と同型の仕組みを native 版として複製)
const INJECT_SCRIPT =
  "<script>window.__APP_BUILD__=1;window.__NATIVE_BUILD__=1;window.PONO_API_BASE='https://pono-asobiba-app.ndw.workers.dev';</script>";

// play.html から除去する広告ブロックの開始マーカー。
// native app では Amazon 誘導導線は不要 (Store 審査リスク回避 + タップ動線分離)。
const AD_BLOCK_MARKER = '<div class="tap-intro-ad"';

let filesCopied = 0;
let bytesCopied = 0;
let adBlockStrippedCount = 0;
let injectedHtmlCount = 0;
const plan = [];

function log(...args) {
  console.log('[stage-www]', ...args);
}

function shouldExcludeAssetPath(relPath) {
  return ASSET_PATH_EXCLUDE_PATTERNS.some((re) => re.test(relPath));
}

function ensureDir(dir) {
  if (DRY_RUN) return;
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * tap-intro-ad の <div ...>...</div> を depth-balanced (入れ子 div 対応) に
 * 丸ごと除去する。同一コンテンツ内にちょうど 1 件だけ存在することを assert し、
 * 0 件 / 2 件以上の場合は throw して stage を失敗させる (構造変化の検知)。
 */
function stripAdBlock(html, sourceLabel) {
  const startIdx = html.indexOf(AD_BLOCK_MARKER);
  if (startIdx === -1) {
    throw new Error(
      `tap-intro-ad ブロックが見つかりません (${sourceLabel})。play.html の構造が変わった可能性があります。`
    );
  }

  const tagRe = /<div\b|<\/div>/gi;
  tagRe.lastIndex = startIdx;
  let depth = 0;
  let endIdx = -1;
  let m;
  while ((m = tagRe.exec(html))) {
    if (/^<div/i.test(m[0])) {
      depth++;
    } else {
      depth--;
    }
    if (depth === 0) {
      endIdx = m.index + m[0].length;
      break;
    }
  }
  if (endIdx === -1) {
    throw new Error(`tap-intro-ad ブロックの終了タグが見つかりません (${sourceLabel})`);
  }

  // 同一コンテンツ内に 2 件目が存在しないことを確認 (1 件のみである保証)
  const secondIdx = html.indexOf(AD_BLOCK_MARKER, endIdx);
  if (secondIdx !== -1) {
    throw new Error(
      `tap-intro-ad ブロックが複数見つかりました (${sourceLabel})。安全のため中断します。`
    );
  }

  adBlockStrippedCount++;
  const before = html.slice(0, startIdx).replace(/[ \t]*$/, '');
  const after = html.slice(endIdx);
  return before + after;
}

/** 全 .html ファイルの <head ...> 直後に native フラグ注入 script を挿入する。 */
function injectNativeFlags(html) {
  const headMatch = /<head[^>]*>/i.exec(html);
  if (!headMatch) return html; // <head> の無い断片 HTML はそのまま (対象外)
  const insertAt = headMatch.index + headMatch[0].length;
  injectedHtmlCount++;
  return html.slice(0, insertAt) + '\n  ' + INJECT_SCRIPT + html.slice(insertAt);
}

function processHtmlContent(raw, { isPlayHtml, sourceLabel }) {
  let html = raw;
  if (isPlayHtml) {
    html = stripAdBlock(html, sourceLabel);
  }
  html = injectNativeFlags(html);
  return html;
}

function copyFile(srcPath, destPath, relLabel) {
  const stat = fs.statSync(srcPath);
  plan.push({ src: relLabel, dest: path.relative(NATIVE_ROOT, destPath), bytes: stat.size });
  filesCopied++;
  bytesCopied += stat.size;

  const isHtml = /\.html?$/i.test(srcPath);
  if (isHtml) {
    const raw = fs.readFileSync(srcPath, 'utf8');
    const isPlayHtml = path.resolve(srcPath) === path.resolve(REPO_ROOT, 'play.html');
    const processed = processHtmlContent(raw, { isPlayHtml, sourceLabel: relLabel });
    if (!DRY_RUN) {
      ensureDir(path.dirname(destPath));
      fs.writeFileSync(destPath, processed, 'utf8');
    }
  } else if (!DRY_RUN) {
    ensureDir(path.dirname(destPath));
    fs.copyFileSync(srcPath, destPath);
  }
}

function copyDirRecursive(srcDir, destDir, relBase) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
    if (shouldExcludeAssetPath(relPath)) continue;
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, relPath);
    } else if (entry.isFile()) {
      copyFile(srcPath, destPath, relPath);
    }
  }
}

function main() {
  log(DRY_RUN ? 'DRY RUN -- no files will be written' : 'staging www/ ...');

  if (!DRY_RUN) {
    // クリーンビルド: 既存 www/ を除去してから作り直す (stale ファイル残留防止)
    fs.rmSync(WWW_DIR, { recursive: true, force: true });
    ensureDir(WWW_DIR);
  }

  // 1) play.html -> www/play.html (native flags 注入 + 広告ブロック除去)
  const playHtmlSrc = path.join(REPO_ROOT, 'play.html');
  if (!fs.existsSync(playHtmlSrc)) {
    throw new Error(`play.html が見つかりません: ${playHtmlSrc}`);
  }
  copyFile(playHtmlSrc, path.join(WWW_DIR, 'play.html'), 'play.html');

  // 2) play.html -> www/index.html (Capacitor の webDir エントリポイント。同一内容の複製)
  copyFile(playHtmlSrc, path.join(WWW_DIR, 'index.html'), 'play.html (as index.html)');

  // 3) denylist 以外の直下ディレクトリを再帰コピー
  const topEntries = fs.readdirSync(REPO_ROOT, { withFileTypes: true });
  for (const entry of topEntries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') && !ROOT_DIR_DENYLIST.has(entry.name)) {
      // 未知のドットディレクトリは安全側で除外 (denylist に無くても取り込まない)
      continue;
    }
    if (ROOT_DIR_DENYLIST.has(entry.name)) continue;
    copyDirRecursive(path.join(REPO_ROOT, entry.name), path.join(WWW_DIR, entry.name), entry.name);
  }

  // --- summary ---
  const mb = (bytesCopied / (1024 * 1024)).toFixed(1);
  log(`files copied: ${filesCopied}, total: ${mb} MB`);
  log(`html files injected (__NATIVE_BUILD__ flags): ${injectedHtmlCount}`);
  log(`ad block stripped (tap-intro-ad): ${adBlockStrippedCount} (expected: 2 -- play.html copied to both play.html and index.html)`);

  if (adBlockStrippedCount !== 2) {
    console.error(
      `[stage-www] FATAL: ad block strip count (${adBlockStrippedCount}) !== 2. Aborting -- refusing to ship an unverified www/.`
    );
    process.exitCode = 1;
    return;
  }

  if (DRY_RUN) {
    log('--- copy plan (first 60 entries) ---');
    plan.slice(0, 60).forEach((p) => log(`  ${p.src} -> ${p.dest} (${p.bytes} bytes)`));
    if (plan.length > 60) log(`  ... and ${plan.length - 60} more`);
  } else {
    log(`done -> ${WWW_DIR}`);
  }
}

main();
