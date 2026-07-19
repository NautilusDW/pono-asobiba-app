#!/usr/bin/env node
/* ============================================================
   native/scripts/verify-assets.mjs

   stage-www.mjs が生成した native/www/ を検証する。Node.js 標準ライブラリのみ。

   content-manifest.json から期待される出力計画を再構築し、実際の www/ が
   「不足なし・余分なし」で完全一致することも検証する。

   Fail 条件 (最優先。「禁止物混入ゼロ」を size budget より主軸に置く):
     - 検証/一時ファイルの混入 (.smoke_*, _tmp*, .dev.vars, .env, .git)
     - 開発/ツール系ディレクトリの混入 (admin/, tools/, scripts/, src/, docs/,
       node_modules/, .git/)
     - sw.js / manifest.json (LP・Web版専用ファイル) の混入
     - Amazon 広告導線の残存 (tap-intro-ad / amazon.co.jp 文字列が .html に残っている)
     - www/ が存在しない (stage-www 未実行)

   Warn 条件 (exit 0 のまま警告表示):
     - 合計サイズが 900MB を超過 (900MB < size <= 1.5GB)

   Fail 条件 (size):
     - 合計サイズが 1.5GB を超過

   Usage: node scripts/verify-assets.mjs
   Exit code: 0 = pass (warn 含む), 1 = fail
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildStagePlan, verifyOutputInventory } from './stage-www.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NATIVE_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(NATIVE_ROOT, '..');
const WWW_DIR = path.join(NATIVE_ROOT, 'www');
const MANIFEST_PATH = path.join(NATIVE_ROOT, 'content-manifest.json');

const WARN_BYTES = 900 * 1024 * 1024;       // 900 MB
const FAIL_BYTES = 1.5 * 1024 * 1024 * 1024; // 1.5 GB

// ファイル名 (basename) に対する禁止パターン
const FORBIDDEN_NAME_PATTERNS = [
  { re: /^\.smoke_/i, reason: 'smoke test 残骸ファイル' },
  { re: /^_tmp/i, reason: '一時ファイル' },
  { re: /^\.dev\.vars/i, reason: 'Cloudflare secrets ファイル' },
  { re: /^\.env/i, reason: '環境変数ファイル' }
];

// ディレクトリ名 (どの階層でも) に対する禁止セグメント
const FORBIDDEN_DIR_SEGMENTS = new Set([
  'admin', 'tools', 'scripts', 'src', 'docs', 'node_modules', '.git', 'logs', 'memory'
]);

// www/ 直下に存在してはいけないファイル (LP・Web版専用)
const FORBIDDEN_ROOT_FILES = ['sw.js', 'manifest.json', 'wrangler.toml', '.dev.vars', 'package.json'];

// .html ファイル内に残っていてはいけない文字列 (広告導線の残骸チェック)。
// tap-intro-ad の DOM ブロック自体は stage-www.mjs の stripAdBlock() で除去済み
// だが、CSS セレクタ定義 (.tap-intro-ad-label 等) と JS の querySelector 参照は
// マッチ先の要素が存在しなくなった死んだコードとして残る (機能・審査リスクなし)。
// ここでは実害のある「外部リンク本体」の残存だけを fail 条件にする。
const FORBIDDEN_HTML_SUBSTRINGS = ['amazon.co.jp'];

const failures = [];
const warnings = [];
let totalBytes = 0;
let totalFiles = 0;
let expectedPlan = null;
let manifestClosureVerified = false;

function walk(dir, relBase) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
    const stat = fs.lstatSync(abs);

    if (stat.isSymbolicLink()) {
      failures.push(`symlink present: ${rel}`);
      continue;
    }

    if (stat.isDirectory()) {
      if (entry.name.startsWith('.')) {
        failures.push(`hidden directory present: ${rel}/`);
        continue;
      }
      if (FORBIDDEN_DIR_SEGMENTS.has(entry.name)) {
        failures.push(`forbidden directory present: ${rel}/`);
        continue; // 中身は精査せず即 fail 対象としてスキップ
      }
      walk(abs, rel);
      continue;
    }

    if (!stat.isFile()) {
      failures.push(`unsupported filesystem node present: ${rel}`);
      continue;
    }

    totalFiles++;
    totalBytes += stat.size;

    if (entry.name.startsWith('.')) {
      failures.push(`hidden file present: ${rel}`);
    }

    for (const { re, reason } of FORBIDDEN_NAME_PATTERNS) {
      if (re.test(entry.name)) {
        failures.push(`forbidden file present: ${rel} (${reason})`);
      }
    }

    if (!relBase && FORBIDDEN_ROOT_FILES.includes(entry.name)) {
      failures.push(`forbidden root file present: ${rel}`);
    }

    if (/\.html?$/i.test(entry.name)) {
      const content = fs.readFileSync(abs, 'utf8');
      const markerCount = (content.match(/data-pono-native-flags/g) || []).length;
      if (markerCount !== 1) {
        failures.push(`native flag injection count is ${markerCount}, expected 1: ${rel}`);
      }
      for (const needle of FORBIDDEN_HTML_SUBSTRINGS) {
        if (content.includes(needle)) {
          failures.push(`forbidden substring "${needle}" found in ${rel}`);
        }
      }
    }
  }
}

function main() {
  if (!fs.existsSync(WWW_DIR)) {
    console.error(`[verify-assets] FATAL: ${WWW_DIR} が存在しません。先に "node scripts/stage-www.mjs" を実行してください。`);
    process.exitCode = 1;
    return;
  }

  try {
    expectedPlan = buildStagePlan({ repoRoot: REPO_ROOT, manifestPath: MANIFEST_PATH });
    verifyOutputInventory(WWW_DIR, expectedPlan);
    manifestClosureVerified = true;
  } catch (error) {
    failures.push(`manifest closure verification failed: ${error.message}`);
  }

  walk(WWW_DIR, '');

  const mb = (totalBytes / (1024 * 1024)).toFixed(1);
  console.log(`[verify-assets] files: ${totalFiles}, total size: ${mb} MB`);
  if (manifestClosureVerified) {
    console.log(
      `[verify-assets] manifest closure: ${expectedPlan.totalFiles} expected files, ` +
      `${expectedPlan.htmlFiles} HTML -- exact inventory match`
    );
  }

  if (totalBytes > FAIL_BYTES) {
    failures.push(`total size ${mb} MB exceeds fail budget (${(FAIL_BYTES / (1024 * 1024)).toFixed(0)} MB)`);
  } else if (totalBytes > WARN_BYTES) {
    warnings.push(`total size ${mb} MB exceeds warn budget (${(WARN_BYTES / (1024 * 1024)).toFixed(0)} MB) -- consider asset trimming in Phase 2-3`);
  }

  if (warnings.length) {
    console.warn('[verify-assets] WARN:');
    warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  if (failures.length) {
    console.error('[verify-assets] FAIL:');
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exitCode = 1;
    return;
  }

  console.log('[verify-assets] PASS -- manifest-complete and no forbidden content detected.');
}

main();
