#!/usr/bin/env node
/*
 * md_to_html.js
 *
 * βテスト配布物 (Markdown) を印刷向け HTML に一括変換する。
 *
 * 仕様:
 *  - 自前の簡易 Markdown パーサ (npm install 不要、 標準ライブラリのみ)
 *  - 対応要素: 見出し / 段落 / リスト (2階層) / 強調 / インラインコード /
 *             コードブロック / リンク (.md→.html 自動置換) / 水平線 /
 *             テーブル / インライン HTML パススルー / 末尾2スペース→<br>
 *  - 出力 HTML は <!DOCTYPE html> + <html lang="ja"> + 印刷向けインライン CSS 入り
 *  - A4 印刷想定 (@page A4 margin 15mm)、 落ち着いたネイビー配色
 *
 * 使い方:
 *   node scripts/beta/md_to_html.js                 # デフォルト 6 ファイルを一括変換
 *   node scripts/beta/md_to_html.js path/to/file.md # 個別ファイル指定
 *
 * Exit code:
 *   0 成功 / 1 引数/環境不正 / 3 書き出し失敗
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const DEFAULT_INPUTS = [
  path.join('docs', 'beta', 'google_forms_template.md'),
  path.join('docs', 'beta', 'google_forms_setup_guide.md'),
  path.join('assets', 'beta', 'parent_flyer.md'),
  path.join('assets', 'beta', 'daycare_request.md'),
  path.join('assets', 'beta', 'daycare_qa.md'),
  path.join('assets', 'beta', 'consent_form.md'),
];

const DEFAULT_OUT_DIR = path.join('docs', 'beta', '_html');

// ---------------------------------------------------------------------------
// 印刷向け CSS (インライン埋め込み)
// ---------------------------------------------------------------------------

const PRINT_CSS = `
@page { size: A4; margin: 15mm; }

:root {
  --ink: #1d2733;
  --accent: #1a4d7a;
  --accent-soft: #2f6ea3;
  --muted: #6b7785;
  --rule: #c9d3df;
  --bg: #ffffff;
  --code-bg: #f4f6f9;
  --code-border: #dde3ec;
}

* { box-sizing: border-box; }

html, body {
  background: var(--bg);
  color: var(--ink);
  font-family: 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif;
  font-size: 11pt;
  line-height: 1.7;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
}

main {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 700;
  line-height: 1.4;
  color: var(--accent);
  page-break-after: avoid;
}

h1 {
  font-size: 22pt;
  margin: 1.6em 0 0.6em;
  padding-bottom: 0.3em;
  border-bottom: 3px double var(--accent);
  page-break-before: always;
}
h1:first-of-type,
main > h1:first-child {
  page-break-before: auto;
  margin-top: 0.2em;
}

h2 {
  font-size: 16pt;
  margin: 1.5em 0 0.5em;
  padding: 0.2em 0 0.2em 0.6em;
  border-left: 6px solid var(--accent);
  background: linear-gradient(to right, rgba(26,77,122,0.06), transparent);
}

h3 {
  font-size: 13pt;
  margin: 1.3em 0 0.4em;
  padding-bottom: 0.15em;
  border-bottom: 1px dashed var(--rule);
}

h4 { font-size: 12pt; margin: 1.2em 0 0.3em; }
h5 { font-size: 11pt; margin: 1.1em 0 0.3em; }
h6 { font-size: 10.5pt; margin: 1.0em 0 0.3em; color: var(--muted); }

p {
  margin: 0.6em 0;
  orphans: 3;
  widows: 3;
}

strong {
  color: var(--accent);
  font-weight: 700;
}

em { font-style: italic; }

a {
  color: var(--accent-soft);
  text-decoration: underline;
  text-underline-offset: 2px;
}
a:visited { color: var(--accent-soft); }

ul, ol {
  margin: 0.5em 0 0.8em;
  padding-left: 1.6em;
}
li { margin: 0.2em 0; }
li > ul, li > ol { margin: 0.2em 0 0.3em; }

hr {
  border: none;
  border-top: 1px solid var(--rule);
  margin: 1.6em 0;
}

/* hr.page-break クラスを付ければ印刷時に改ページ可能 */
hr.page-break {
  border: none;
  margin: 0;
  height: 0;
  page-break-after: always;
}

blockquote {
  margin: 0.8em 0;
  padding: 0.6em 1em;
  border-left: 4px solid var(--accent-soft);
  background: rgba(47,110,163,0.06);
  color: var(--muted);
}
blockquote p { margin: 0.3em 0; }

code {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.92em;
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: 3px;
  padding: 0.05em 0.35em;
}

pre {
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: 4px;
  padding: 0.8em 1em;
  overflow-x: auto;
  page-break-inside: avoid;
  line-height: 1.5;
}
pre code {
  background: transparent;
  border: 0;
  padding: 0;
  font-size: 0.88em;
  white-space: pre;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.9em 0;
  page-break-inside: avoid;
  font-size: 0.95em;
}
th, td {
  border: 1px solid var(--rule);
  padding: 0.45em 0.7em;
  vertical-align: top;
  text-align: left;
}
th {
  background: rgba(26,77,122,0.08);
  font-weight: 700;
  color: var(--accent);
}
tr:nth-child(even) td { background: rgba(0,0,0,0.015); }

img { max-width: 100%; height: auto; }

@media print {
  body { font-size: 10.5pt; }
  main { max-width: 100%; padding: 0; }
  a { color: var(--ink); text-decoration: none; }
  pre, table, blockquote { page-break-inside: avoid; }
}
`.trim();

// ---------------------------------------------------------------------------
// 引数パース
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { inputs: [], outDir: DEFAULT_OUT_DIR };
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (key === '-h' || key === '--help') {
      printUsage();
      process.exit(0);
    } else if (key === '--out-dir') {
      args.outDir = argv[i + 1];
      i++;
    } else if (key.startsWith('-')) {
      console.error(`[error] unknown argument: ${key}`);
      printUsage();
      process.exit(1);
    } else {
      args.inputs.push(key);
    }
  }
  if (args.inputs.length === 0) {
    args.inputs = DEFAULT_INPUTS.slice();
  }
  return args;
}

function printUsage() {
  console.log(`Usage: node scripts/beta/md_to_html.js [options] [file.md ...]

Options:
  --out-dir <path>  出力ディレクトリ (default: ${DEFAULT_OUT_DIR})
  -h, --help        このヘルプを表示

引数なしで実行するとデフォルトの 6 ファイル (βテスト配布物) を一括変換します。
個別ファイルを指定した場合は、 そのファイルだけを変換して同じ出力ディレクトリへ書き出します。
`);
}

// ---------------------------------------------------------------------------
// HTML エスケープ
// ---------------------------------------------------------------------------

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// HTML タグらしき行か (パススルー判定)
function looksLikeHtmlBlock(line) {
  return /^\s*<\/?[a-zA-Z][^>]*>\s*$/.test(line) ||
         /^\s*<[a-zA-Z][^>]*\/>\s*$/.test(line) ||
         // <tag ...>...</tag> (同一行で開閉が完結する空 div など)
         /^\s*<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>.*<\/\1>\s*$/.test(line);
}

// ---------------------------------------------------------------------------
// インライン処理 (リンク / 強調 / インラインコード / 末尾2スペース改行)
// ---------------------------------------------------------------------------
//
// 順序が重要:
//   1. インラインコード `...` を先に抽出 (中身は escape して保護、 強調適用しない)
//   2. リンク [text](url) を処理 (.md → .html 置換)
//   3. 強調 **bold**, *italic* (greedy 回避のため非貪欲マッチ)
//   4. 末尾の 2スペース → <br>

function renderInline(rawText, options) {
  const opts = options || {};
  // 既存の HTML タグはパススルーしたいので、 まず < > & を escape しない方針を取る…
  // と書きたいところだが、 セキュリティ上 < > & のうち
  //   - 既存 HTML タグ風 (`<tag ...>`, `</tag>`, `<tag/>`) はパススルー
  //   - それ以外は escape
  // という分岐は実装が重くなるので、 ここでは「インライン HTML 互換」のために
  // テキストはそのまま受け取り、 リンク/強調/コード変換だけ施す。
  // (本プロジェクトの md は信頼できるソースなのでこの方針で OK)

  let text = rawText;

  // 1. インラインコードを先にプレースホルダ化
  const codeSlots = [];
  text = text.replace(/`([^`\n]+)`/g, (_, code) => {
    const idx = codeSlots.length;
    codeSlots.push(`<code>${escapeHtml(code)}</code>`);
    return ` CODE${idx} `;
  });

  // 2. リンク [text](url) — text にネスト [] は許さない簡易版
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, label, url, title) => {
    const finalUrl = rewriteMdLink(url, opts);
    const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
    return `<a href="${escapeAttr(finalUrl)}"${titleAttr}>${label}</a>`;
  });

  // 3. 強調 (非貪欲)
  //    ** で囲まれた bold を先に処理してから、 残った * を italic に
  text = text.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');

  // 4. 末尾 2スペース → <br>
  text = text.replace(/[ ]{2,}$/g, '<br>');

  // 5. プレースホルダ復元
  text = text.replace(/ CODE(\d+) /g, (_, i) => codeSlots[Number(i)]);

  return text;
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// .md リンクを .html へ書き換え (同一プロジェクト内のローカル相対パスのみ)
function rewriteMdLink(url, opts) {
  // 絶対 URL (http/https/mailto/tel/#anchor) はそのまま
  if (/^(https?:|mailto:|tel:|#)/i.test(url)) return url;
  // .md 末尾を .html に
  // クエリ/フラグメント保持
  const m = url.match(/^([^#?]+?)\.md(\?[^#]*)?(#.*)?$/i);
  if (m) {
    return `${m[1]}.html${m[2] || ''}${m[3] || ''}`;
  }
  return url;
}

// ---------------------------------------------------------------------------
// ブロックレベルパーサ
// ---------------------------------------------------------------------------
//
// 戦略: 行ベースで状態機械を回す。
//   - コードフェンス ``` 内: 全て pre code として収集
//   - HTML ブロック (1行で完結する <div ...> 等): パススルー
//   - テーブル: パイプ行が 2 行以上連続し、 2行目が区切り行ならテーブル
//   - リスト: -/*/+/1. で始まる行、 インデント 2 段階対応
//   - 見出し: # 〜 ######
//   - 水平線: ---, ***, ___ (3 文字以上)
//   - その他: 段落 (空行区切り)

function mdToHtml(md, options) {
  const opts = options || {};
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // --- コードフェンス ---
    const fenceMatch = line.match(/^```(\S*)\s*$/);
    if (fenceMatch) {
      const lang = fenceMatch[1] || '';
      const buf = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      // 終端 ``` を消費
      if (i < lines.length) i++;
      const langAttr = lang ? ` class="language-${escapeAttr(lang)}"` : '';
      out.push(`<pre><code${langAttr}>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    // --- 空行 ---
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // --- 水平線 ---
    if (/^\s{0,3}([-*_])\s*\1\s*\1[\s\1]*$/.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    // --- 見出し ---
    const h = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (h) {
      const level = h[1].length;
      const content = renderInline(h[2], opts);
      out.push(`<h${level}>${content}</h${level}>`);
      i++;
      continue;
    }

    // --- HTML ブロック (1行で完結する開きタグや単独タグ) ---
    if (looksLikeHtmlBlock(line)) {
      out.push(line.trim());
      i++;
      continue;
    }

    // --- テーブル ---
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length &&
        /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(lines[i + 1])) {
      const headerCells = parseTableRow(line);
      const aligns = parseAlignRow(lines[i + 1]);
      i += 2;
      const bodyRows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        bodyRows.push(parseTableRow(lines[i]));
        i++;
      }
      out.push(renderTable(headerCells, aligns, bodyRows, opts));
      continue;
    }

    // --- リスト ---
    if (isListLine(line)) {
      const consumed = parseList(lines, i, opts);
      out.push(consumed.html);
      i = consumed.nextIdx;
      continue;
    }

    // --- 引用 (おまけ: > で始まる行) ---
    if (/^\s*>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      const inner = mdToHtml(buf.join('\n'), opts);
      out.push(`<blockquote>${inner}</blockquote>`);
      continue;
    }

    // --- 段落 (空行までを 1 段落として収集) ---
    const pBuf = [line];
    i++;
    while (i < lines.length &&
           !/^\s*$/.test(lines[i]) &&
           !/^```/.test(lines[i]) &&
           !/^(#{1,6})\s+/.test(lines[i]) &&
           !/^\s{0,3}([-*_])\s*\1\s*\1[\s\1]*$/.test(lines[i]) &&
           !isListLine(lines[i]) &&
           !/^\s*>\s?/.test(lines[i]) &&
           !looksLikeHtmlBlock(lines[i]) &&
           !(/^\s*\|.*\|\s*$/.test(lines[i]) &&
             i + 1 < lines.length &&
             /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(lines[i + 1]))) {
      pBuf.push(lines[i]);
      i++;
    }
    const para = pBuf.map((l) => renderInline(l, opts)).join('\n');
    out.push(`<p>${para}</p>`);
  }

  return out.join('\n');
}

// ---------------------------------------------------------------------------
// リスト
// ---------------------------------------------------------------------------

function isListLine(line) {
  return /^(\s*)([-*+]|\d+\.)\s+\S/.test(line);
}

function listInfo(line) {
  const m = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
  if (!m) return null;
  const indent = m[1].length;
  const marker = m[2];
  const ordered = /\d+\./.test(marker);
  return { indent, ordered, content: m[3] };
}

// インデント 2階層まで対応する簡易リストパーサ
function parseList(lines, start, opts) {
  const root = { type: null, items: [] };
  let i = start;
  const baseInfo = listInfo(lines[i]);
  if (!baseInfo) return { html: '', nextIdx: i + 1 };
  root.type = baseInfo.ordered ? 'ol' : 'ul';
  const baseIndent = baseInfo.indent;

  let currentItem = null;

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) {
      // 空行はリスト継続 (次の行もリストなら継続)
      const next = lines[i + 1];
      if (next && isListLine(next)) {
        i++;
        continue;
      }
      break;
    }
    const info = listInfo(line);
    if (!info) {
      // リスト項目の継続行 (インデントが付いた通常テキスト)
      if (currentItem && /^\s{2,}\S/.test(line)) {
        currentItem.text += '\n' + line.trim();
        i++;
        continue;
      }
      break;
    }

    if (info.indent <= baseIndent) {
      // 同階層 → 新項目
      currentItem = { text: info.content, children: null };
      root.items.push(currentItem);
      i++;
    } else {
      // ネスト
      const child = parseList(lines, i, opts);
      if (currentItem) {
        currentItem.children = child.html;
      } else {
        // 親なしのいきなりネストは独立リストとして扱う
        currentItem = { text: '', children: child.html };
        root.items.push(currentItem);
      }
      i = child.nextIdx;
    }
  }

  const html = renderListNode(root, opts);
  return { html, nextIdx: i };
}

function renderListNode(node, opts) {
  const tag = node.type || 'ul';
  const parts = [`<${tag}>`];
  for (const item of node.items) {
    let li = '<li>';
    if (item.text) li += renderInline(item.text, opts);
    if (item.children) li += '\n' + item.children;
    li += '</li>';
    parts.push(li);
  }
  parts.push(`</${tag}>`);
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// テーブル
// ---------------------------------------------------------------------------

function parseTableRow(line) {
  // 前後の | を削ぎ落としてから split
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

function parseAlignRow(line) {
  return parseTableRow(line).map((c) => {
    const left = c.startsWith(':');
    const right = c.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return null;
  });
}

function renderTable(header, aligns, body, opts) {
  const parts = ['<table>', '<thead>', '<tr>'];
  header.forEach((cell, idx) => {
    const a = aligns[idx];
    const styleAttr = a ? ` style="text-align:${a}"` : '';
    parts.push(`<th${styleAttr}>${renderInline(cell, opts)}</th>`);
  });
  parts.push('</tr>', '</thead>', '<tbody>');
  for (const row of body) {
    parts.push('<tr>');
    row.forEach((cell, idx) => {
      const a = aligns[idx];
      const styleAttr = a ? ` style="text-align:${a}"` : '';
      parts.push(`<td${styleAttr}>${renderInline(cell, opts)}</td>`);
    });
    parts.push('</tr>');
  }
  parts.push('</tbody>', '</table>');
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// ドキュメント全体の組み立て
// ---------------------------------------------------------------------------

function buildHtmlDocument(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
${PRINT_CSS}
</style>
</head>
<body>
<main>
${bodyHtml}
</main>
</body>
</html>
`;
}

// 先頭の # 見出しを title に拾う (なければファイル名)
function extractTitle(md, fallback) {
  const m = md.match(/^\s*#\s+(.+?)\s*$/m);
  return m ? m[1].replace(/[*_`]/g, '') : fallback;
}

// ---------------------------------------------------------------------------
// 1ファイル変換
// ---------------------------------------------------------------------------

function convertOne(inputPath, outDir) {
  const absIn = path.resolve(inputPath);
  if (!fs.existsSync(absIn)) {
    console.error(`[skip] 入力が存在しません: ${inputPath}`);
    return null;
  }
  const md = fs.readFileSync(absIn, 'utf8');
  const baseName = path.basename(absIn, path.extname(absIn));
  const title = extractTitle(md, baseName);
  const body = mdToHtml(md, { sourcePath: absIn });
  const html = buildHtmlDocument(title, body);

  const outPath = path.join(outDir, `${baseName}.html`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  return outPath;
}

// ---------------------------------------------------------------------------
// メイン
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv);
  const outDir = path.resolve(args.outDir);

  console.log(`[info] 出力ディレクトリ: ${outDir}`);
  console.log(`[info] 対象 ${args.inputs.length} ファイル`);

  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch (e) {
    console.error(`[error] 出力ディレクトリ作成失敗: ${outDir} (${e.message})`);
    process.exit(3);
  }

  let ok = 0;
  let ng = 0;
  for (let i = 0; i < args.inputs.length; i++) {
    const src = args.inputs[i];
    const idxStr = `${String(i + 1).padStart(2, ' ')}/${args.inputs.length}`;
    try {
      const outPath = convertOne(src, outDir);
      if (outPath) {
        console.log(`[md→html ${idxStr}] ${src} → ${path.relative(process.cwd(), outPath)}`);
        ok++;
      } else {
        ng++;
      }
    } catch (e) {
      console.error(`[md→html ${idxStr}] ${src} 失敗: ${e.message}`);
      ng++;
    }
  }

  console.log(`[done] 成功 ${ok} / 失敗 ${ng} / 合計 ${args.inputs.length}`);
  if (ng > 0) process.exit(3);
}

main();
