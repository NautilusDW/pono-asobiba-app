'use strict';

// Static regression test for the analytics admin surface
// (docs/data-analytics-plan.md §6-3 集計層 / §6-4 可視化 / §8 統合ロードマップ).
// Style follows existing tests/*.cjs (fs.readFileSync + assert/strict + regex/string
// level checks on source, no runtime Worker/D1 mocking) — see e.g.
// tests/analytics_events_api_regression.cjs / tests/maze_admin_minigame_debug_regression.cjs.
//
// Scope: src/worker.js routing + scheduled() wiring, src/api/analytics-admin.js
// (4 GET + 1 POST handlers). src/api/analytics-rollup.js is owned by a parallel
// workstream and is only referenced here via its documented contract
// (handleScheduledRollup(env) / runRollupForDate(env, date) / ensureSchema) —
// this test never requires/imports it, so it stays green whether or not that
// file exists yet on disk.
//
// Run: node tests/analytics_admin_api_regression.cjs

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const worker = read('src/worker.js');
const admin = read('src/api/analytics-admin.js');

// ---------------------------------------------------------------------------
// 1. worker.js: analytics-rollup.js / analytics-admin.js からの import が存在する
//    (実体を書き換えず、契約シグネチャどおりに import するだけ)
// ---------------------------------------------------------------------------
assert.match(
  worker,
  /import\s*\{\s*handleScheduledRollup\s*\}\s*from\s*'\.\/api\/analytics-rollup\.js'/,
  'worker.js must import handleScheduledRollup from ./api/analytics-rollup.js'
);
assert.match(
  worker,
  /import\s*\{[\s\S]{0,200}\}\s*from\s*'\.\/api\/analytics-admin\.js'/,
  'worker.js must import the analytics-admin handlers from ./api/analytics-admin.js'
);
for (const name of [
  'handleAnalyticsOverview',
  'handleAnalyticsGames',
  'handleAnalyticsRetention',
  'handleAnalyticsStatus',
  'handleAnalyticsRollupTrigger'
]) {
  const importBlockMatch = worker.match(/import\s*\{([\s\S]{0,300})\}\s*from\s*'\.\/api\/analytics-admin\.js'/);
  assert.ok(importBlockMatch, 'worker.js must have an analytics-admin.js import block');
  assert.ok(importBlockMatch[1].includes(name), `worker.js analytics-admin.js import must include ${name}`);
}

// ---------------------------------------------------------------------------
// 2. worker.js: export default に scheduled(event, env, ctx) が生えており、
//    ctx.waitUntil(handleScheduledRollup(env)) を呼んでいる
//    (cron: wrangler.toml top-level [triggers] / [env.staging-app.triggers] crons=["0 19 * * *"])
// ---------------------------------------------------------------------------
assert.match(
  worker,
  /async\s+scheduled\s*\(\s*event\s*,\s*env\s*,\s*ctx\s*\)\s*\{/,
  'worker.js default export must define async scheduled(event, env, ctx)'
);
{
  const scheduledIdx = worker.search(/async\s+scheduled\s*\(\s*event\s*,\s*env\s*,\s*ctx\s*\)\s*\{/);
  assert.ok(scheduledIdx >= 0);
  const scheduledBody = worker.slice(scheduledIdx, scheduledIdx + 400);
  assert.match(
    scheduledBody,
    /ctx\.waitUntil\(\s*handleScheduledRollup\(env\)\s*\)/,
    'scheduled() must invoke handleScheduledRollup(env) via ctx.waitUntil'
  );
}
// scheduled must live inside the same `export default { ... }` object as fetch
// (not a stray top-level function that Workers would never call).
{
  const exportDefaultIdx = worker.search(/export default \{/);
  const scheduledIdx = worker.search(/async\s+scheduled\s*\(\s*event\s*,\s*env\s*,\s*ctx\s*\)\s*\{/);
  const fetchIdx = worker.search(/async fetch\(request, env, ctx\)/);
  assert.ok(exportDefaultIdx >= 0 && fetchIdx >= 0 && scheduledIdx >= 0);
  assert.ok(exportDefaultIdx < fetchIdx, 'fetch() must be inside export default {...}');
  assert.ok(fetchIdx < scheduledIdx, 'scheduled() must be declared after fetch() inside the same export default {...}');
  // Nothing that looks like a second top-level `export default` / module boundary
  // should appear between fetch and scheduled.
  const between = worker.slice(fetchIdx, scheduledIdx);
  assert.ok(!/^export default/m.test(between), 'fetch and scheduled must share a single export default object literal');
}

// ---------------------------------------------------------------------------
// 3. worker.js ルーティング: 4 GET + 1 POST が全て Basic Auth (checkBasicAuth) を
//    通過してからハンドラに委譲されている。既存 /api/admin/* と同じ方式
//    (OPTIONS 素通し → method チェック → checkBasicAuth → handler) を踏襲していること。
// ---------------------------------------------------------------------------
const ROUTES = [
  { path: '/api/admin/analytics/overview', method: 'GET', handler: 'handleAnalyticsOverview' },
  { path: '/api/admin/analytics/games', method: 'GET', handler: 'handleAnalyticsGames' },
  { path: '/api/admin/analytics/retention', method: 'GET', handler: 'handleAnalyticsRetention' },
  { path: '/api/admin/analytics/status', method: 'GET', handler: 'handleAnalyticsStatus' },
  { path: '/api/admin/analytics/rollup', method: 'POST', handler: 'handleAnalyticsRollupTrigger' }
];

for (const route of ROUTES) {
  const pathRe = new RegExp(`path === '${route.path.replace(/\//g, '\\/')}'`);
  const blockStart = worker.search(pathRe);
  assert.ok(blockStart >= 0, `worker.js must route path === '${route.path}'`);
  // Grab a generous slice of the block (each block in this file is well under 700 chars).
  const block = worker.slice(blockStart, blockStart + 700);

  assert.match(
    block,
    new RegExp(`request\\.method !== '${route.method}'`),
    `${route.path} block must reject methods other than ${route.method}`
  );
  assert.match(
    block,
    /if \(request\.method === 'OPTIONS'\)/,
    `${route.path} block must handle OPTIONS preflight`
  );

  // Basic Auth gate must appear, and it must appear BEFORE the handler is invoked
  // (not after — an auth check placed after the handler call would be dead code).
  const authIdx = block.search(/checkBasicAuth\(request, env\)/);
  const handlerCallRe = new RegExp(`return ${route.handler}\\(`);
  const handlerIdx = block.search(handlerCallRe);
  assert.ok(authIdx >= 0, `${route.path} must call checkBasicAuth(request, env)`);
  assert.ok(handlerIdx >= 0, `${route.path} must call ${route.handler}(...)`);
  assert.ok(authIdx < handlerIdx, `${route.path} must check checkBasicAuth before invoking ${route.handler}`);

  // Auth failure must short-circuit with the shared authChallenge() (401 Basic realm),
  // same as every other existing /api/admin/* route.
  assert.match(
    block,
    /if \(!checkBasicAuth\(request, env\)\) return authChallenge\(\);/,
    `${route.path} must return authChallenge() on failed Basic Auth (matches existing admin route convention)`
  );
}

// ---------------------------------------------------------------------------
// 4. src/api/analytics-admin.js: 4 GET + 1 POST ハンドラが全て export されている
// ---------------------------------------------------------------------------
for (const route of ROUTES) {
  assert.match(
    admin,
    new RegExp(`export\\s+async\\s+function\\s+${route.handler}\\s*\\(`),
    `analytics-admin.js must export async function ${route.handler}(...)`
  );
}

// ---------------------------------------------------------------------------
// 5. analytics-admin.js: D1 バインド (env.ANALYTICS_DB) 未設定 env では
//    overview/games/retention/rollup が {error:"analytics-not-provisioned"} を
//    200 で返す (D1 未プロビジョニング env = LP staging を admin UI が優しく表示できる)。
// ---------------------------------------------------------------------------
assert.match(
  admin,
  /function notProvisioned\(\)\s*\{[\s\S]{0,200}analytics-not-provisioned/,
  'analytics-admin.js must define a notProvisioned() helper returning the analytics-not-provisioned sentinel'
);
for (const fn of ['handleAnalyticsOverview', 'handleAnalyticsGames', 'handleAnalyticsRetention', 'handleAnalyticsRollupTrigger']) {
  const fnIdx = admin.search(new RegExp(`export\\s+async\\s+function\\s+${fn}\\s*\\(`));
  assert.ok(fnIdx >= 0, `${fn} must be defined`);
  const body = admin.slice(fnIdx, fnIdx + 300);
  assert.match(
    body,
    /if \(!env\.ANALYTICS_DB\) return notProvisioned\(\);/,
    `${fn} must guard on !env.ANALYTICS_DB and short-circuit via notProvisioned()`
  );
}
// status is the config-diagnostic endpoint and must NOT short-circuit on a missing
// D1 binding — hasDb:false is itself the useful signal it reports.
{
  const fnIdx = admin.search(/export\s+async\s+function\s+handleAnalyticsStatus\s*\(/);
  assert.ok(fnIdx >= 0);
  const body = admin.slice(fnIdx, fnIdx + 200);
  assert.doesNotMatch(
    body,
    /notProvisioned\(\)/,
    'handleAnalyticsStatus must not short-circuit via notProvisioned() — it always reports hasDb/hasToken/datasetVar'
  );
  assert.match(admin, /hasDb\s*=\s*!!env\.ANALYTICS_DB/, 'status must compute hasDb from env.ANALYTICS_DB');
  assert.match(admin, /hasToken\s*=\s*!!env\.WAE_SQL_TOKEN/, 'status must compute hasToken from env.WAE_SQL_TOKEN');
  assert.match(admin, /datasetVar\s*=\s*env\.ANALYTICS_DATASET/, 'status must surface env.ANALYTICS_DATASET as datasetVar');
}
// Cross-workstream contract check: admin/index.html (analytics UI, built in parallel)
// renders lastRollup as a plain string (via a `data.lastRollup ? data.lastRollup : ...`-shaped
// local variable, not `escapeHtml(data.lastRollup ...)` directly — the earlier, narrower version
// of this guard only matched the latter literal pattern and silently no-op'd once the real code
// went through a local variable, letting a `data.lastRollup.date` object-access bug slip past
// all green test runs). So the status handler must assign row.date (a string), never an object,
// to the lastRollup variable, and admin/index.html must never dereference `.date` off it.
{
  const adminUiPath = path.join(root, 'admin/index.html');
  if (fs.existsSync(adminUiPath)) {
    const adminUi = fs.readFileSync(adminUiPath, 'utf8');
    // Broad "does this file render lastRollup at all" probe — not the narrow literal-call-site
    // regex that caused the original miss. Matches `data.lastRollup` appearing anywhere (direct
    // escapeHtml() call, or read into a local variable first).
    if (/data\.lastRollup/.test(adminUi)) {
      assert.match(
        admin,
        /lastRollup\s*=\s*row\.date;/,
        'admin/index.html renders lastRollup — handleAnalyticsStatus must set lastRollup = row.date (a plain string, not an object)'
      );
      assert.doesNotMatch(
        admin,
        /lastRollup\s*=\s*\{\s*date:/,
        'lastRollup must not be an object — admin/index.html expects a plain date string'
      );
      // admin/index.html must never treat data.lastRollup as an object with a .date property
      // (this exact pattern — `data.lastRollup && data.lastRollup.date` — was the real bug: the
      // ternary always fell through to '未実施' because .date on a string is undefined).
      assert.doesNotMatch(
        adminUi,
        /data\.lastRollup\s*&&\s*data\.lastRollup\.date/,
        'admin/index.html must not read data.lastRollup.date — lastRollup is a plain string per the API contract, never an object'
      );
      assert.doesNotMatch(
        adminUi,
        /data\.lastRollup\.date\b/,
        'admin/index.html must not dereference .date off data.lastRollup — it is a plain string'
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 6. D1 クエリは全て prepared statement (バインドパラメータ) 経由。
//    文字列連結によるSQL組み立て (テンプレートリテラルへの変数埋め込み含む) が無いこと。
// ---------------------------------------------------------------------------
const prepareCalls = (admin.match(/\.prepare\(/g) || []).length;
const bindCalls = (admin.match(/\.bind\(/g) || []).length;
assert.ok(prepareCalls >= 6, `expected at least 6 .prepare(...) call sites, got ${prepareCalls}`);
// Every date-ranged query must bind its parameters; only the unparameterized
// rollup_log LIMIT 1 status query is allowed to skip .bind().
assert.ok(bindCalls >= prepareCalls - 1, `expected .bind(...) on all but at most one .prepare(...) call site (prepare=${prepareCalls}, bind=${bindCalls})`);

// No SQL template literal may interpolate a variable directly (the hallmark of
// unsafe string-built SQL). All backtick-delimited strings in this file are SQL
// statements, so none of them may contain a `${` substitution.
{
  const templateLiterals = admin.match(/`[^`]*`/gs) || [];
  assert.ok(templateLiterals.length > 0, 'expected at least one template-literal SQL statement');
  for (const lit of templateLiterals) {
    assert.ok(!lit.includes('${'), `SQL template literal must not interpolate variables (unsafe concatenation): ${lit.slice(0, 80)}...`);
  }
}
// Guard against the other common unsafe pattern: quoted SQL fragments joined with `+`.
assert.doesNotMatch(
  admin,
  /['"]\s*\+\s*(startDate|endDate|date|days)\b/,
  'must not build SQL by string-concatenating date/days variables'
);

// Every WHERE clause touching a date range must use `?` placeholders, not literals.
assert.match(admin, /WHERE date >= \? AND date <= \?/, 'daily_events/daily_clients date-range queries must use ? placeholders');
assert.match(admin, /WHERE c\.first_seen >= \? AND c\.first_seen <= \?/, 'retention cohort query must use ? placeholders on first_seen');

// ---------------------------------------------------------------------------
// 7. days パラメータは 1..90 に clamp される
// ---------------------------------------------------------------------------
assert.match(admin, /MIN_DAYS\s*=\s*1\b/, 'MIN_DAYS must be 1');
assert.match(admin, /MAX_DAYS\s*=\s*90\b/, 'MAX_DAYS must be 90');
assert.match(admin, /function clampDays\(/, 'clampDays() must be defined');
{
  const fnIdx = admin.search(/function clampDays\(/);
  const body = admin.slice(fnIdx, fnIdx + 300);
  assert.match(body, /n < MIN_DAYS/, 'clampDays must floor at MIN_DAYS');
  assert.match(body, /n > MAX_DAYS/, 'clampDays must ceil at MAX_DAYS');
}
// clampDays must actually be applied by every days-aware handler.
for (const fn of ['handleAnalyticsOverview', 'handleAnalyticsGames', 'handleAnalyticsRetention']) {
  const fnIdx = admin.search(new RegExp(`export\\s+async\\s+function\\s+${fn}\\s*\\(`));
  const body = admin.slice(fnIdx, fnIdx + 300);
  assert.match(body, /clampDays\(url\.searchParams\.get\('days'\)\)/, `${fn} must clamp the days query param via clampDays()`);
}

// ---------------------------------------------------------------------------
// 8. 4 GET + 1 POST エンドポイント定義の網羅確認 (worker.js 側)
// ---------------------------------------------------------------------------
const definedPaths = ROUTES.map(r => r.path);
for (const p of definedPaths) {
  assert.ok(worker.includes(`'${p}'`), `worker.js must reference the literal path '${p}'`);
}
assert.equal(new Set(definedPaths).size, 5, 'exactly 5 distinct analytics admin routes expected (4 GET + 1 POST)');

// ---------------------------------------------------------------------------
// 9. rollup トリガーは日付未指定時 JST 昨日にフォールバックし、
//    scheduled() と同じ runRollupForDate(env, date) を呼ぶ (契約シグネチャ準拠)。
// ---------------------------------------------------------------------------
assert.match(
  admin,
  /import\s*\{\s*ensureSchema,\s*runRollupForDate\s*\}\s*from\s*'\.\/analytics-rollup\.js'/,
  'analytics-admin.js must import { ensureSchema, runRollupForDate } from ./analytics-rollup.js per the cross-workstream contract'
);
assert.match(admin, /runRollupForDate\(env, date\)/, 'rollup trigger must call runRollupForDate(env, date)');
assert.match(admin, /jstDaysAgo\(1\)/, 'rollup trigger must default the date to JST yesterday when the request body omits it');

console.log('==== analytics_admin_api_regression: all checks passed ====');
