#!/usr/bin/env node
/*
 * gen_beta_fids.js
 *
 * βテスト用 family ID (fid) 発行 + prefilled URL 一括ジェネレータ。
 *
 * 仕様:
 *  - fid: 6 文字 base32 (使用文字: ABCDEFGHJKMNPQRSTUVWXYZ23456789)
 *    0/O/1/I/L を除外して目視/手書き混同を防ぐ
 *  - 既存 out/beta_fids.csv があれば読み込み、 fid 衝突を回避
 *  - 出力 CSV: family_no, fid, beta_url, mid_survey_url, final_survey_url
 *  - 依存ライブラリ無し (Node.js 内蔵 crypto + fs のみ)
 *
 * 使い方:
 *   node scripts/beta/gen_beta_fids.js \
 *     --count 10 \
 *     --mid-form-id 1FAIpQLSe-MID-XXXXXXXXXXXXXXXXXXXXX \
 *     --mid-entry entry.1234567890 \
 *     --final-form-id 1FAIpQLSe-FINAL-XXXXXXXXXXXXXXXXXXXXX \
 *     --final-entry entry.0987654321
 *
 * Exit code:
 *   0 成功 / 1 引数不正 / 2 衝突回避失敗 / 3 書き出し失敗
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 文字 (本来 base32 の I/L/O/0/1 を除外)
const FID_LENGTH = 6;
const DEFAULT_COUNT = 10;
const DEFAULT_OUT = path.join('out', 'beta_fids.csv');
const BETA_URL_BASE = 'https://pono.kodama-no-mori.com/b/';
const FORMS_BASE = 'https://docs.google.com/forms/d/e/';
const MAX_TRIES_PER_FID = 1000; // 31^6 = ~887M、 1000 試行で衝突回避不可なら異常

// ---------------------------------------------------------------------------
// 引数パース
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    count: DEFAULT_COUNT,
    midFormId: null,
    midEntry: null,
    finalFormId: null,
    finalEntry: null,
    out: DEFAULT_OUT,
  };
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    const val = argv[i + 1];
    switch (key) {
      case '--count':
        args.count = parseInt(val, 10);
        i++;
        break;
      case '--mid-form-id':
        args.midFormId = val;
        i++;
        break;
      case '--mid-entry':
        args.midEntry = val;
        i++;
        break;
      case '--final-form-id':
        args.finalFormId = val;
        i++;
        break;
      case '--final-entry':
        args.finalEntry = val;
        i++;
        break;
      case '--out':
        args.out = val;
        i++;
        break;
      case '-h':
      case '--help':
        printUsage();
        process.exit(0);
        break;
      default:
        console.error(`[error] unknown argument: ${key}`);
        printUsage();
        process.exit(1);
    }
  }
  return args;
}

function printUsage() {
  console.log(`Usage: node scripts/beta/gen_beta_fids.js [options]

Options:
  --count <N>              発行する fid 数 (default: ${DEFAULT_COUNT})
  --mid-form-id <ID>       中間アンケート Google Forms の formId
  --mid-entry <entry.XXX>  中間 fid hidden field の entry ID
  --final-form-id <ID>     最終アンケート Google Forms の formId
  --final-entry <entry.X>  最終 fid hidden field の entry ID
  --out <path>             出力 CSV path (default: ${DEFAULT_OUT})
  -h, --help               このヘルプを表示
`);
}

function validateArgs(args) {
  if (!Number.isInteger(args.count) || args.count <= 0) {
    console.error('[error] --count は 1 以上の整数を指定してください');
    return false;
  }
  const required = [
    ['mid-form-id', args.midFormId],
    ['mid-entry', args.midEntry],
    ['final-form-id', args.finalFormId],
    ['final-entry', args.finalEntry],
  ];
  for (const [name, val] of required) {
    if (!val || typeof val !== 'string') {
      console.error(`[error] --${name} が未指定です`);
      return false;
    }
  }
  // entry ID は entry.<digits> 形式
  const entryRe = /^entry\.\d+$/;
  if (!entryRe.test(args.midEntry)) {
    console.error(`[error] --mid-entry は "entry.1234567890" 形式で指定してください: ${args.midEntry}`);
    return false;
  }
  if (!entryRe.test(args.finalEntry)) {
    console.error(`[error] --final-entry は "entry.1234567890" 形式で指定してください: ${args.finalEntry}`);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// fid 発行
// ---------------------------------------------------------------------------

function generateFid() {
  const bytes = crypto.randomBytes(FID_LENGTH);
  let out = '';
  for (let i = 0; i < FID_LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

function generateUniqueFid(existing) {
  for (let i = 0; i < MAX_TRIES_PER_FID; i++) {
    const fid = generateFid();
    if (!existing.has(fid)) {
      existing.add(fid);
      return fid;
    }
  }
  throw new Error(`fid 生成で ${MAX_TRIES_PER_FID} 回連続衝突。 ALPHABET / FID_LENGTH を見直してください`);
}

// ---------------------------------------------------------------------------
// 既存 CSV 読み込み (衝突回避用)
// ---------------------------------------------------------------------------

function loadExistingFids(csvPath) {
  const existing = new Set();
  if (!fs.existsSync(csvPath)) {
    return { existing, lastFamilyNo: 0, headerLine: null, lines: [] };
  }
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { existing, lastFamilyNo: 0, headerLine: null, lines: [] };
  }
  const header = lines[0];
  const cols = header.split(',').map((s) => s.trim());
  const fidIdx = cols.indexOf('fid');
  const familyNoIdx = cols.indexOf('family_no');
  let lastFamilyNo = 0;
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    if (fidIdx >= 0 && row[fidIdx]) {
      existing.add(row[fidIdx].trim());
    }
    if (familyNoIdx >= 0 && row[familyNoIdx]) {
      const n = parseInt(row[familyNoIdx], 10);
      if (Number.isInteger(n) && n > lastFamilyNo) lastFamilyNo = n;
    }
  }
  return { existing, lastFamilyNo, headerLine: header, lines };
}

// ---------------------------------------------------------------------------
// URL 構築
// ---------------------------------------------------------------------------

function buildBetaUrl(fid) {
  return `${BETA_URL_BASE}${fid}`;
}

function buildSurveyUrl(formId, entryId, fid) {
  // entryId は "entry.1234567890" 形式。 URL 上は = と数値だけ encodeURIComponent でケア
  const encEntry = encodeURIComponent(entryId);
  const encFid = encodeURIComponent(fid);
  return `${FORMS_BASE}${formId}/viewform?usp=pp_url&${encEntry}=${encFid}`;
}

// ---------------------------------------------------------------------------
// CSV 行整形 (フィールドにカンマ/改行が混入しても破綻しない様、 簡易クォート)
// ---------------------------------------------------------------------------

function csvField(v) {
  const s = String(v == null ? '' : v);
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function csvRow(fields) {
  return fields.map(csvField).join(',');
}

// ---------------------------------------------------------------------------
// メイン
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv);
  if (!validateArgs(args)) {
    process.exit(1);
  }

  const outPath = path.resolve(args.out);
  const outDir = path.dirname(outPath);

  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch (e) {
    console.error(`[error] 出力ディレクトリ作成失敗: ${outDir} (${e.message})`);
    process.exit(3);
  }

  console.log(`[info] 出力先: ${outPath}`);
  const existingInfo = loadExistingFids(outPath);
  if (existingInfo.existing.size > 0) {
    console.log(`[info] 既存 fid ${existingInfo.existing.size} 件を読み込み (重複回避用)`);
    console.log(`[info] 既存 family_no 最大値: ${existingInfo.lastFamilyNo}`);
  } else {
    console.log('[info] 新規 CSV を生成します');
  }

  // ヘッダ
  const header = ['family_no', 'fid', 'beta_url', 'mid_survey_url', 'final_survey_url'];
  const headerLine = csvRow(header);

  // 新規行を生成
  const newRows = [];
  let nextFamilyNo = existingInfo.lastFamilyNo + 1;

  let issuedCount = 0;
  try {
    for (let i = 0; i < args.count; i++) {
      const fid = generateUniqueFid(existingInfo.existing);
      const row = [
        nextFamilyNo,
        fid,
        buildBetaUrl(fid),
        buildSurveyUrl(args.midFormId, args.midEntry, fid),
        buildSurveyUrl(args.finalFormId, args.finalEntry, fid),
      ];
      newRows.push(csvRow(row));
      console.log(`[issue ${String(i + 1).padStart(3, ' ')}/${args.count}] family_no=${nextFamilyNo} fid=${fid}`);
      nextFamilyNo++;
      issuedCount++;
    }
  } catch (e) {
    console.error(`[error] fid 発行中にエラー: ${e.message}`);
    process.exit(2);
  }

  // 書き出し (既存があれば追記モード相当: 既存行 + 新規行)
  let outLines;
  if (existingInfo.headerLine) {
    // 既存ヘッダがあればそのまま、 但しカラム不一致なら警告
    if (existingInfo.headerLine.trim() !== headerLine.trim()) {
      console.warn('[warn] 既存 CSV のヘッダが期待値と異なります。 上書きせず追記しますが、 カラム順を確認してください');
      console.warn(`       既存: ${existingInfo.headerLine}`);
      console.warn(`       期待: ${headerLine}`);
    }
    outLines = existingInfo.lines.concat(newRows);
  } else {
    outLines = [headerLine].concat(newRows);
  }

  try {
    fs.writeFileSync(outPath, outLines.join('\n') + '\n', 'utf8');
  } catch (e) {
    console.error(`[error] CSV 書き出し失敗: ${e.message}`);
    process.exit(3);
  }

  console.log(`[done] 新規 ${issuedCount} 件発行 / 全体 ${outLines.length - 1} 件 → ${outPath}`);
}

main();
