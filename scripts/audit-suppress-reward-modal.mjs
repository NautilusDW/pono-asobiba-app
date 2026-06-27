#!/usr/bin/env node
// @ts-check
/**
 * audit-suppress-reward-modal.mjs
 *
 * Scans the repository for `addAcornsDaily(` invocations and inspects their
 * 4th argument (the options object) to determine whether
 * `suppressRewardModal: true` is set.
 *
 * Status values per call site:
 *   - 'missing'      : no 4th argument at all
 *   - 'suppressed'   : 4th arg present and suppressRewardModal: true
 *   - 'no-suppress'  : 4th arg present but suppressRewardModal is false or absent
 *
 * Allowlist (games with their own custom reward modal — MUST be suppressed):
 *   - quizland/index.html
 *   - breakout/index.html
 *
 * Anything in the allowlist that is NOT 'suppressed' will print a warning and
 * cause exit code 1 (CI gate). Outside the allowlist, 'no-suppress' anywhere
 * also fails the audit so the team is forced to make a conscious decision.
 *
 * Usage:
 *   node scripts/audit-suppress-reward-modal.mjs
 *   node scripts/audit-suppress-reward-modal.mjs --summary
 *
 * Exit codes:
 *   0  all addAcornsDaily() call sites are healthy
 *   1  at least one 'no-suppress' or allowlist miss detected
 *   2  unexpected I/O error
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const TARGET_EXT = new Set(['.html', '.js']);

const EXCLUDED_DIR_NAMES = new Set([
    'node_modules',
    '.git',
    '.github',
    '.vscode',
    '.idea',
    '.wrangler',
    '.cache',
    '.next',
    '.parcel-cache',
    'tmp',
    'temp',
    'logs',
    '_claude',
    'scripts',
    'archive',
    'build',
    'dist',
    'out',
    'coverage',
    '__pycache__',
    'venv',
    '.venv',
    'env',
    'public_html_backup',
]);

/**
 * Games that have their own custom reward UI / progression modal.
 * For these, suppressRewardModal: true MUST be set, otherwise we get a
 * double-modal stacking bug.
 */
const ALLOWLIST_MUST_SUPPRESS = new Set([
    'quizland/index.html',
    'breakout/index.html',
]);

const CALL_REGEX = /addAcornsDaily\s*\(/g;
const LOOKAHEAD_LINES = 5;

const args = process.argv.slice(2);
const SUMMARY_ONLY = args.includes('--summary');

/**
 * Recursively walk a directory, yielding absolute file paths for files
 * with extensions we care about.
 * @param {string} dir
 * @returns {AsyncGenerator<string>}
 */
async function* walk(dir) {
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
        return;
    }

    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (EXCLUDED_DIR_NAMES.has(entry.name)) continue;
            if (entry.name.startsWith('.')) {
                // Skip any other dot-directories (artifacts, lockfiles, etc).
                continue;
            }
            yield* walk(full);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (TARGET_EXT.has(ext)) {
                yield full;
            }
        }
    }
}

/**
 * Given the source text and a starting index pointing at the `(` after
 * `addAcornsDaily`, return the substring containing the balanced argument
 * list (without the surrounding parens). Returns null if no balance can be
 * found within `maxChars`.
 * @param {string} src
 * @param {number} openIdx Index of the opening '(' character.
 * @param {number} [maxChars]
 * @returns {string|null}
 */
function extractArgList(src, openIdx, maxChars = 4000) {
    if (src[openIdx] !== '(') return null;
    let depth = 0;
    let inString = null; // null | '"' | "'" | '`'
    let inLineComment = false;
    let inBlockComment = false;
    const end = Math.min(src.length, openIdx + maxChars);

    let i = openIdx;
    for (; i < end; i++) {
        const ch = src[i];
        const next = src[i + 1];

        if (inLineComment) {
            if (ch === '\n') inLineComment = false;
            continue;
        }
        if (inBlockComment) {
            if (ch === '*' && next === '/') {
                inBlockComment = false;
                i++;
            }
            continue;
        }
        if (inString) {
            if (ch === '\\') { i++; continue; }
            if (ch === inString) inString = null;
            continue;
        }
        if (ch === '/' && next === '/') { inLineComment = true; i++; continue; }
        if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
        if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }

        if (ch === '(') depth++;
        else if (ch === ')') {
            depth--;
            if (depth === 0) {
                return src.slice(openIdx + 1, i);
            }
        }
    }
    return null;
}

/**
 * Split a top-level argument list into individual arguments, respecting
 * nested parens, brackets, braces and strings.
 * @param {string} argList
 * @returns {string[]}
 */
function splitTopLevelArgs(argList) {
    const out = [];
    let depthParen = 0, depthBracket = 0, depthBrace = 0;
    let inString = null;
    let start = 0;

    for (let i = 0; i < argList.length; i++) {
        const ch = argList[i];
        if (inString) {
            if (ch === '\\') { i++; continue; }
            if (ch === inString) inString = null;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }
        if (ch === '(') depthParen++;
        else if (ch === ')') depthParen--;
        else if (ch === '[') depthBracket++;
        else if (ch === ']') depthBracket--;
        else if (ch === '{') depthBrace++;
        else if (ch === '}') depthBrace--;
        else if (
            ch === ',' &&
            depthParen === 0 &&
            depthBracket === 0 &&
            depthBrace === 0
        ) {
            out.push(argList.slice(start, i).trim());
            start = i + 1;
        }
    }
    const tail = argList.slice(start).trim();
    if (tail.length > 0) out.push(tail);
    return out;
}

/**
 * Crude check for `suppressRewardModal: true` inside an object literal source
 * snippet. Returns:
 *   - 'true' if explicitly true
 *   - 'false' if explicitly false
 *   - 'absent' otherwise
 * @param {string} optsSrc
 * @returns {'true'|'false'|'absent'}
 */
function readSuppressFlag(optsSrc) {
    const re = /suppressRewardModal\s*:\s*(true|false)\b/;
    const m = optsSrc.match(re);
    if (!m) return 'absent';
    return /** @type {'true'|'false'} */ (m[1]);
}

/**
 * Compute the 1-based line number for a character offset.
 * @param {string} src
 * @param {number} offset
 * @returns {number}
 */
function lineNumberAt(src, offset) {
    let line = 1;
    for (let i = 0; i < offset && i < src.length; i++) {
        if (src[i] === '\n') line++;
    }
    return line;
}

/**
 * Extract a short snippet around the call site (call line + up to N lookahead
 * lines). Used purely for human-readable reporting.
 * @param {string} src
 * @param {number} offset
 * @returns {string}
 */
function buildSnippet(src, offset) {
    const startLineStart = src.lastIndexOf('\n', offset) + 1;
    let endLineStart = startLineStart;
    let seen = 0;
    while (seen <= LOOKAHEAD_LINES && endLineStart < src.length) {
        const next = src.indexOf('\n', endLineStart);
        if (next === -1) { endLineStart = src.length; break; }
        endLineStart = next + 1;
        seen++;
    }
    return src.slice(startLineStart, endLineStart).replace(/\s+$/g, '');
}

/**
 * Audit a single file for addAcornsDaily call sites.
 * @param {string} absPath
 * @returns {Promise<Array<{file:string,line:number,status:'missing'|'suppressed'|'no-suppress',snippet:string,reasonHint:string|null}>>}
 */
async function auditFile(absPath) {
    /** @type {Array<{file:string,line:number,status:'missing'|'suppressed'|'no-suppress',snippet:string,reasonHint:string|null}>} */
    const findings = [];
    let src;
    try {
        src = await fs.readFile(absPath, 'utf8');
    } catch {
        return findings;
    }
    if (src.indexOf('addAcornsDaily(') === -1) return findings;

    CALL_REGEX.lastIndex = 0;
    let match;
    while ((match = CALL_REGEX.exec(src)) !== null) {
        // Position of opening paren is end of match - 1.
        const openIdx = match.index + match[0].length - 1;
        const line = lineNumberAt(src, match.index);
        const snippet = buildSnippet(src, match.index);
        const argListSrc = extractArgList(src, openIdx);

        /** @type {'missing'|'suppressed'|'no-suppress'} */
        let status;
        let reasonHint = null;

        if (argListSrc === null) {
            // Could not balance — treat as no-suppress so a human eyes it.
            status = 'no-suppress';
        } else {
            const argList = splitTopLevelArgs(argListSrc);
            if (argList.length < 4) {
                status = 'missing';
            } else {
                const opts = argList[3];
                const flag = readSuppressFlag(opts);
                if (flag === 'true') status = 'suppressed';
                else status = 'no-suppress';

                const reasonMatch = opts.match(/reason\s*:\s*['"`]([^'"`]+)['"`]/);
                if (reasonMatch) reasonHint = reasonMatch[1];
            }
        }

        const relPath = path.relative(REPO_ROOT, absPath).replace(/\\/g, '/');
        findings.push({
            file: relPath,
            line,
            status,
            snippet,
            reasonHint,
        });
    }
    return findings;
}

async function main() {
    /** @type {Array<{file:string,line:number,status:'missing'|'suppressed'|'no-suppress',snippet:string,reasonHint:string|null}>} */
    const all = [];

    for await (const file of walk(REPO_ROOT)) {
        const findings = await auditFile(file);
        if (findings.length > 0) all.push(...findings);
    }

    // Stable sort: file, then line.
    all.sort((a, b) => {
        if (a.file !== b.file) return a.file < b.file ? -1 : 1;
        return a.line - b.line;
    });

    const summary = {
        total: all.length,
        suppressed: all.filter(x => x.status === 'suppressed').length,
        missing: all.filter(x => x.status === 'missing').length,
        noSuppress: all.filter(x => x.status === 'no-suppress').length,
        files: new Set(all.map(x => x.file)).size,
    };

    // Allowlist enforcement: every file in ALLOWLIST_MUST_SUPPRESS must have
    // AT LEAST one call site, and ALL of that file's call sites must be
    // 'suppressed'.
    /** @type {string[]} */
    const allowlistViolations = [];
    for (const allowed of ALLOWLIST_MUST_SUPPRESS) {
        const calls = all.filter(x => x.file === allowed);
        if (calls.length === 0) {
            allowlistViolations.push(
                `${allowed}: expected at least one addAcornsDaily() call (allowlisted), found none`
            );
            continue;
        }
        const bad = calls.filter(x => x.status !== 'suppressed');
        for (const b of bad) {
            allowlistViolations.push(
                `${allowed}:${b.line}: status=${b.status}, expected 'suppressed' (custom reward modal game)`
            );
        }
    }

    const hasNoSuppressOutsideAllowlist = all.some(
        x => x.status === 'no-suppress' && !ALLOWLIST_MUST_SUPPRESS.has(x.file)
    );

    if (SUMMARY_ONLY) {
        const out = {
            summary,
            allowlistViolations,
        };
        process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    } else {
        const out = {
            summary,
            allowlistViolations,
            findings: all,
        };
        process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    }

    const fail =
        allowlistViolations.length > 0 ||
        all.some(x => x.status === 'no-suppress');
    process.exit(fail ? 1 : 0);
}

main().catch(err => {
    process.stderr.write(`audit-suppress-reward-modal: fatal: ${err && err.stack || err}\n`);
    process.exit(2);
});
