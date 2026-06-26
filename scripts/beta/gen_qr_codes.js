#!/usr/bin/env node
/*
 * gen_qr_codes.js
 *
 * out/beta_fids.csv を読んで、 各 fid の beta_url を QR コード PNG に変換する。
 *
 * 仕様:
 *  - 入力: out/beta_fids.csv (--in で差し替え可)
 *  - 出力: out/qr/<fid>.png (--out-dir で差し替え可)
 *  - サイズ: 1200x1200px (60mm 印刷想定で大きめ)
 *  - 余白: 8 module (印刷品質確保)
 *  - 誤り訂正レベル: H (チラシでの汚れ/折れ対応)
 *  - QR は npm の "qrcode" パッケージを使用 (要 npm install)
 *
 * 使い方:
 *   npm install qrcode --no-save     # 初回のみ (or package.json に追加)
 *   node scripts/beta/gen_qr_codes.js
 *   node scripts/beta/gen_qr_codes.js --in out/beta_fids.csv --out-dir out/qr
 *
 * Exit code:
 *   0 成功 / 1 引数/環境不正 / 2 入力不正 / 3 書き出し失敗
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const DEFAULT_IN = path.join('out', 'beta_fids.csv');
const DEFAULT_OUT_DIR = path.join('out', 'qr');
const QR_OPTIONS = {
  errorCorrectionLevel: 'H', // 高い ECC で印刷時の汚損に強く
  type: 'png',
  margin: 8, // module 単位の余白
  width: 1200, // px
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
};

// ---------------------------------------------------------------------------
// 引数パース
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { in: DEFAULT_IN, outDir: DEFAULT_OUT_DIR };
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    const val = argv[i + 1];
    switch (key) {
      case '--in':
        args.in = val;
        i++;
        break;
      case '--out-dir':
        args.outDir = val;
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
  console.log(`Usage: node scripts/beta/gen_qr_codes.js [options]

Options:
  --in <path>       入力 CSV (default: ${DEFAULT_IN})
  --out-dir <path>  出力ディレクトリ (default: ${DEFAULT_OUT_DIR})
  -h, --help        このヘルプを表示

依存:
  qrcode パッケージが必要です。 未インストールなら:
    npm install qrcode --no-save
`);
}

// ---------------------------------------------------------------------------
// qrcode require (未インストール時の親切なエラー)
// ---------------------------------------------------------------------------

function requireQrcode() {
  try {
    // eslint-disable-next-line global-require
    return require('qrcode');
  } catch (e) {
    console.error('[error] "qrcode" パッケージが見つかりません。');
    console.error('        以下のコマンドでインストールしてください:');
    console.error('          npm install qrcode --no-save');
    console.error('        (または package.json の devDependencies に追加)');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// CSV 読み込み (gen_beta_fids.js が出力する単純な形式を想定)
// ---------------------------------------------------------------------------

function parseCsvLine(line) {
  // 簡易 CSV パーサ。 ダブルクォート対応のみ。 gen_beta_fids.js の出力に合わせた最低限
  const out = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else if (ch === '"' && cur === '') {
      inQuote = true;
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function loadCsv(csvPath) {
  if (!fs.existsSync(csvPath)) {
    console.error(`[error] 入力 CSV が見つかりません: ${csvPath}`);
    process.exit(2);
  }
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) {
    console.error(`[error] 入力 CSV にデータ行がありません: ${csvPath}`);
    process.exit(2);
  }
  const header = parseCsvLine(lines[0]).map((s) => s.trim());
  const fidIdx = header.indexOf('fid');
  const urlIdx = header.indexOf('beta_url');
  if (fidIdx < 0 || urlIdx < 0) {
    console.error('[error] ヘッダに "fid" / "beta_url" が見つかりません');
    console.error(`        header: ${header.join(', ')}`);
    process.exit(2);
  }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const fid = (fields[fidIdx] || '').trim();
    const url = (fields[urlIdx] || '').trim();
    if (!fid || !url) {
      console.warn(`[warn] 行 ${i + 1} に fid/beta_url 不足のためスキップ`);
      continue;
    }
    rows.push({ fid, url });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// QR 生成
// ---------------------------------------------------------------------------

async function generateOne(qrcode, row, outDir) {
  const outPath = path.join(outDir, `${row.fid}.png`);
  await qrcode.toFile(outPath, row.url, QR_OPTIONS);
  return outPath;
}

// ---------------------------------------------------------------------------
// メイン
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);
  const qrcode = requireQrcode();

  const inPath = path.resolve(args.in);
  const outDir = path.resolve(args.outDir);

  console.log(`[info] 入力: ${inPath}`);
  console.log(`[info] 出力: ${outDir}`);

  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch (e) {
    console.error(`[error] 出力ディレクトリ作成失敗: ${outDir} (${e.message})`);
    process.exit(3);
  }

  const rows = loadCsv(inPath);
  console.log(`[info] 対象 ${rows.length} 件`);

  let ok = 0;
  let ng = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const outPath = await generateOne(qrcode, row, outDir);
      console.log(`[qr ${String(i + 1).padStart(3, ' ')}/${rows.length}] fid=${row.fid} → ${path.relative(process.cwd(), outPath)}`);
      ok++;
    } catch (e) {
      console.error(`[qr ${String(i + 1).padStart(3, ' ')}/${rows.length}] fid=${row.fid} 失敗: ${e.message}`);
      ng++;
    }
  }

  console.log(`[done] 成功 ${ok} / 失敗 ${ng} / 合計 ${rows.length}`);
  if (ng > 0) process.exit(3);
}

main().catch((e) => {
  console.error(`[fatal] ${e && e.stack ? e.stack : e}`);
  process.exit(3);
});
