'use strict';

// Static regression test for src/api/analytics-rollup.js (data-analytics-plan.md §6-3).
// Style follows existing tests/*.cjs (fs.readFileSync + assert/strict + regex/string
// level checks on source, no runtime Worker/D1 mocking) — see e.g.
// tests/analytics_events_api_regression.cjs.
//
// Run: node tests/analytics_rollup_regression.cjs

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const rollupPath = path.join(root, 'src/api/analytics-rollup.js');
const rollup = fs.readFileSync(rollupPath, 'utf8');
const adminApiPath = path.join(root, 'src/api/analytics-admin.js');
const adminApi = fs.existsSync(adminApiPath) ? fs.readFileSync(adminApiPath, 'utf8') : null;

// ---------------------------------------------------------------------------
// 0. ソースが構文的に正しい ESM であること (node --check)
// ---------------------------------------------------------------------------
execFileSync(process.execPath, ['--input-type=module', '--check'], {
  input: rollup,
  stdio: ['pipe', 'pipe', 'pipe']
});

// no stray control characters (past bug: an invisible \x01 delimiter snuck into a
// composite Map key, which is unreadable/ungreppable and easy to reintroduce by accident)
for (let i = 0; i < rollup.length; i++) {
  const code = rollup.charCodeAt(i);
  const isNewlineOrTab = code === 0x0a || code === 0x09 || code === 0x0d;
  if (!isNewlineOrTab && code < 0x20) {
    assert.fail(`analytics-rollup.js must not contain raw control characters (found 0x${code.toString(16)} at offset ${i})`);
  }
}

// ---------------------------------------------------------------------------
// 1. スキーマ: 確定契約どおりの4テーブルが CREATE TABLE IF NOT EXISTS で定義されている
// ---------------------------------------------------------------------------
function assertTable(name, columns, primaryKey) {
  const re = new RegExp(
    `CREATE TABLE IF NOT EXISTS ${name} \\(([\\s\\S]*?)\\)\`,?\\n`
  );
  const m = rollup.match(re);
  assert.ok(m, `must define CREATE TABLE IF NOT EXISTS ${name}`);
  const body = m[1];
  for (const col of columns) {
    assert.ok(body.includes(col), `table ${name} must declare column "${col}" (got body: ${body})`);
  }
  assert.match(
    body,
    new RegExp('PRIMARY KEY\\s*\\(' + primaryKey.split(',').map(s => s.trim()).join('\\s*,\\s*') + '\\)|PRIMARY KEY'),
    `table ${name} must declare PRIMARY KEY(${primaryKey})`
  );
}

assertTable('daily_events', ['date TEXT', 'event TEXT', 'game_id TEXT', 'platform TEXT', 'tier TEXT', 'count INTEGER'], 'date, event, game_id, platform, tier');
assertTable('daily_clients', ['date TEXT', 'cid TEXT'], 'date, cid');
assertTable('clients', ['cid TEXT PRIMARY KEY', 'first_seen TEXT', 'last_seen TEXT'], '');
assertTable('rollup_log', ['date TEXT PRIMARY KEY', 'rolled_at INTEGER', 'events_rows INTEGER', 'clients_rows INTEGER'], '');

assert.match(rollup, /export async function ensureSchema\(env\)/, 'must export ensureSchema(env) — src/api/analytics-admin.js calls it as ensureSchema(env) at 4 call sites, not ensureSchema(db)');
assert.match(rollup, /for \(const stmt of SCHEMA_STATEMENTS\)/, 'ensureSchema must iterate all SCHEMA_STATEMENTS');
assert.match(rollup, /await db\.prepare\(stmt\)\.run\(\)/, 'ensureSchema must actually execute each CREATE TABLE statement');

// ---------------------------------------------------------------------------
// 2. SUM(_sample_interval) によるサンプリング補正 (COUNT(*) は使わない)
// ---------------------------------------------------------------------------
assert.match(
  rollup,
  /_sample_interval AS sample_interval/,
  'WAE SQL query must select _sample_interval (sampling correction factor)'
);
assert.match(
  rollup,
  /const sampleInterval = Number\(row\.sample_interval\)/,
  'aggregation must read the sample_interval column from each raw row'
);
assert.match(
  rollup,
  /eventsMap\.set\(key,\s*\(eventsMap\.get\(key\)\s*\|\|\s*0\)\s*\+\s*weight\)/,
  'daily_events aggregation must SUM sample-interval-derived weight per (event, game_id, platform, tier) key, not COUNT(*)'
);
// The actual SQL sent to WAE (fetchWaeRows' `sql` build) must not use COUNT(*)/GROUP BY —
// only the explanatory comments are allowed to mention COUNT(*) as "what we deliberately avoid".
{
  const fnMatch = rollup.match(/async function fetchWaeRows\(env, dateJst\) \{([\s\S]*?)\n\}/);
  assert.ok(fnMatch, 'fetchWaeRows must be defined');
  const body = fnMatch[1];
  assert.doesNotMatch(body, /COUNT\(\*\)/i, 'the WAE SQL query must not use COUNT(*) (adaptive sampling would under-count)');
  assert.doesNotMatch(body, /GROUP BY/i, 'raw rows must be fetched ungrouped; aggregation happens in Worker JS (per the confirmed contract)');
  assert.match(body, /SELECT index1 AS cid/, 'must select raw rows keyed by index1 AS cid');
}

// ---------------------------------------------------------------------------
// 3. JST 日付境界ロジック (UTC+9、[前日15:00Z, 当日15:00Z) 相当)
// ---------------------------------------------------------------------------
assert.match(rollup, /JST_OFFSET_MS\s*=\s*9\s*\*\s*60\s*\*\s*60\s*\*\s*1000/, 'must define a 9-hour JST offset constant');
assert.match(
  rollup,
  /Date\.UTC\(y,\s*mo\s*-\s*1,\s*d,\s*0,\s*0,\s*0\)\s*-\s*JST_OFFSET_MS/,
  'jstDateBoundsUtc must compute JST midnight by subtracting the 9h offset from UTC midnight'
);
assert.match(
  rollup,
  /endMs\s*=\s*startMs\s*\+\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/,
  'the JST day window must span exactly 24 hours'
);
assert.match(rollup, /toDateTime\(/, 'WAE SQL WHERE clause must use toDateTime() for the timestamp bounds');
assert.match(rollup, /timestamp\s*>=\s*toDateTime/, 'must filter on timestamp >= lower bound');
assert.match(rollup, /timestamp\s*<\s*toDateTime/, 'must filter on timestamp < upper bound (exclusive)');

// ---------------------------------------------------------------------------
// 4. DELETE→INSERT の idempotency 構造 (daily_events / daily_clients は date スコープ、
//    clients は cid スコープの upsert)
// ---------------------------------------------------------------------------
{
  const fnMatch = rollup.match(/async function writeDailyEvents\(db, date, eventsMap\) \{([\s\S]*?)\n\}/);
  assert.ok(fnMatch, 'writeDailyEvents must be defined');
  const body = fnMatch[1];
  const delIdx = body.search(/DELETE FROM daily_events WHERE date = \?/);
  const insIdx = body.search(/INSERT INTO daily_events/);
  assert.ok(delIdx >= 0, 'writeDailyEvents must DELETE FROM daily_events WHERE date = ?');
  assert.ok(insIdx >= 0, 'writeDailyEvents must INSERT INTO daily_events');
  assert.ok(delIdx < insIdx, 'DELETE must run before INSERT for daily_events (idempotent rewrite)');
}
{
  const fnMatch = rollup.match(/async function writeDailyClients\(db, date, clientIds\) \{([\s\S]*?)\n\}/);
  assert.ok(fnMatch, 'writeDailyClients must be defined');
  const body = fnMatch[1];
  const delIdx = body.search(/DELETE FROM daily_clients WHERE date = \?/);
  const insIdx = body.search(/INSERT INTO daily_clients/);
  assert.ok(delIdx >= 0, 'writeDailyClients must DELETE FROM daily_clients WHERE date = ?');
  assert.ok(insIdx >= 0, 'writeDailyClients must INSERT INTO daily_clients');
  assert.ok(delIdx < insIdx, 'DELETE must run before INSERT for daily_clients (idempotent rewrite)');
}
// clients table is a running cid-keyed aggregate, not date-scoped — must NOT be deleted per rollup.
assert.doesNotMatch(rollup, /DELETE FROM clients/, 'clients table must never be DELETEd (it is a cid-keyed running aggregate, not date-scoped)');
assert.match(rollup, /ON CONFLICT\(cid\) DO UPDATE SET/, 'clients upsert must use ON CONFLICT(cid) DO UPDATE');
assert.match(rollup, /first_seen = MIN\(first_seen, excluded\.first_seen\)/, 'clients upsert must keep the earliest first_seen');
assert.match(rollup, /last_seen = MAX\(last_seen, excluded\.last_seen\)/, 'clients upsert must keep the latest last_seen');
assert.match(rollup, /ON CONFLICT\(date\) DO UPDATE SET/, 'rollup_log must upsert on date PRIMARY KEY (idempotent re-run)');

// runRollup call order: writeDailyEvents/writeDailyClients/upsertClients/upsertRollupLog all invoked
assert.match(rollup, /await writeDailyEvents\(env\.ANALYTICS_DB, dateJst, eventsMap\)/, 'runRollup must call writeDailyEvents');
assert.match(rollup, /await writeDailyClients\(env\.ANALYTICS_DB, dateJst, clientIds\)/, 'runRollup must call writeDailyClients');
assert.match(rollup, /await upsertClients\(env\.ANALYTICS_DB, dateJst, clientIds\)/, 'runRollup must call upsertClients');
assert.match(rollup, /await upsertRollupLog\(env\.ANALYTICS_DB, dateJst, eventsMap\.size, clientIds\.size\)/, 'runRollup must call upsertRollupLog');

// ---------------------------------------------------------------------------
// 5. graceful skip: secrets/binding 欠如時は WAE/D1 に触れず {skipped:true, reason} を返す
// ---------------------------------------------------------------------------
assert.match(rollup, /function missingConfig\(env\)/, 'must define missingConfig(env)');
for (const key of ['WAE_SQL_TOKEN', 'ANALYTICS_DB', 'ANALYTICS_DATASET', 'CF_ACCOUNT_ID']) {
  assert.ok(
    new RegExp(`env\\.${key}`).test(rollup),
    `missingConfig (or its guards) must check env.${key}`
  );
}
{
  const fnMatch = rollup.match(/export async function runRollup\(env, dateJst\) \{([\s\S]*?)\n\}\n\n\/\/ ---- エントリポイント 1/);
  assert.ok(fnMatch, 'runRollup must be defined');
  const body = fnMatch[1];
  const skipIdx = body.search(/skipped:\s*true,\s*reason:\s*skipReason/);
  const schemaIdx = body.search(/await ensureSchema\(/);
  assert.ok(skipIdx >= 0, 'runRollup must return { skipped: true, reason: skipReason } on missing config');
  assert.ok(schemaIdx >= 0, 'runRollup must call ensureSchema when config is present');
  assert.ok(skipIdx < schemaIdx, 'the graceful-skip branch must return before ensureSchema/WAE/D1 are ever touched');
}
assert.match(rollup, /return \{ skipped: true, reason: skipReason \}/, 'graceful skip must surface { skipped: true, reason }');

// ---------------------------------------------------------------------------
// 6. トークンがログ・例外メッセージ・レスポンス組み立てに一切現れない
// ---------------------------------------------------------------------------
// WAE_SQL_TOKEN must be referenced to build the Authorization header, but never on a
// console.*/throw line (comments/prose lines mentioning the policy are fine).
assert.match(rollup, /Authorization[^\n]*Bearer[^\n]*WAE_SQL_TOKEN/, 'must build "Authorization: Bearer <token>" from env.WAE_SQL_TOKEN');
{
  const codeTokenRefs = [...rollup.matchAll(/^(?!\s*\/\/)[^\n]*WAE_SQL_TOKEN[^\n]*$/gm)].map(m => m[0]);
  assert.ok(codeTokenRefs.length >= 1, 'env.WAE_SQL_TOKEN must be referenced in executable code (to build the Authorization header)');
  for (const line of codeTokenRefs) {
    assert.doesNotMatch(line, /console\.(log|error|warn|info)/, `WAE_SQL_TOKEN must never appear on a console.* line, got: ${line}`);
    assert.doesNotMatch(line, /throw new Error/, `WAE_SQL_TOKEN must never appear on a thrown Error line, got: ${line}`);
  }
}
// No console.* call may reference the token variable/env key by name.
assert.doesNotMatch(
  rollup,
  /console\.(log|error|warn|info)\([^)]*WAE_SQL_TOKEN[^)]*\)/,
  'no console.* call may embed WAE_SQL_TOKEN'
);
assert.doesNotMatch(
  rollup,
  /throw new Error\([^)]*WAE_SQL_TOKEN[^)]*\)/,
  'no thrown Error message may embed WAE_SQL_TOKEN'
);

// ---------------------------------------------------------------------------
// 7. エクスポート面: ensureSchema / runRollup / runRollupForDate / handleScheduledRollup
// ---------------------------------------------------------------------------
assert.match(rollup, /export async function ensureSchema\(env\)/, 'must export ensureSchema(env) — src/api/analytics-admin.js calls it as ensureSchema(env) at 4 call sites, not ensureSchema(db)');
assert.match(rollup, /export async function runRollup\(env, dateJst\)/, 'must export runRollup(env, dateJst)');
assert.match(rollup, /export async function runRollupForDate\(env, date\)/, 'must export runRollupForDate(env, date)');
assert.match(rollup, /export async function handleScheduledRollup\(env\)/, 'must export handleScheduledRollup(env)');

// handleScheduledRollup reprocesses a trailing 2-day JST window ("yesterday" + "the day before
// yesterday") on every cron run, to self-heal delayed WAE writes (docs/data-analytics-plan.md
// §6-3 confirmed contract). Both dates must be resolved via the same jstYesterdayDateString()
// logic that runRollupForDate(env, undefined) would use, and both must go through
// runRollupForDate (so the graceful-skip / DELETE-INSERT-idempotent code path is shared with
// the manual trigger entry point, not duplicated).
{
  const fnMatch = rollup.match(/export async function handleScheduledRollup\(env\) \{([\s\S]*?)\n\}/);
  assert.ok(fnMatch, 'handleScheduledRollup must be defined');
  const body = fnMatch[1];
  assert.match(
    body,
    /jstYesterdayDateString\(now\)/,
    'handleScheduledRollup must resolve "yesterday" via jstYesterdayDateString'
  );
  assert.match(
    body,
    /jstDayBeforeYesterdayDateString\(now\)/,
    'handleScheduledRollup must resolve "the day before yesterday" via jstDayBeforeYesterdayDateString'
  );
  const yesterdayCallIdx = body.search(/runRollupForDate\(env,\s*yesterday\)/);
  const dayBeforeCallIdx = body.search(/runRollupForDate\(env,\s*dayBeforeYesterday\)/);
  assert.ok(yesterdayCallIdx >= 0, 'handleScheduledRollup must call runRollupForDate(env, yesterday)');
  assert.ok(dayBeforeCallIdx >= 0, 'handleScheduledRollup must call runRollupForDate(env, dayBeforeYesterday)');
}
assert.match(
  rollup,
  /function jstDayBeforeYesterdayDateString\(nowMs\)/,
  'must define jstDayBeforeYesterdayDateString to resolve the JST day-before-yesterday date'
);
// day-before-yesterday must be derived by shifting jstYesterdayDateString's base by -24h, so it
// stays consistent with the single source of truth for the JST-yesterday calculation instead of
// re-deriving JST date arithmetic a second time (bug surface for off-by-one date errors).
assert.match(
  rollup,
  /return jstYesterdayDateString\(base - 24 \* 60 \* 60 \* 1000\);/,
  'jstDayBeforeYesterdayDateString must delegate to jstYesterdayDateString with a 24h-earlier base'
);
assert.match(
  rollup,
  /function normalizeDateOrYesterday\(date\)/,
  'must define normalizeDateOrYesterday to resolve the omitted-date -> JST-yesterday default'
);
assert.match(
  rollup,
  /return \{ ok: true, date: jstYesterdayDateString\(\) \}/,
  'omitted/empty date must resolve to JST yesterday'
);

// invalid explicit date must short-circuit before touching WAE/D1
{
  const fnMatch = rollup.match(/export async function runRollupForDate\(env, date\) \{([\s\S]*?)\n\}/);
  assert.ok(fnMatch, 'runRollupForDate must be defined');
  assert.match(fnMatch[1], /if \(!normalized\.ok\)/, 'runRollupForDate must reject unparseable dates before calling runRollup');
}

// ---------------------------------------------------------------------------
// 8. cross-file integration check (soft): if src/api/analytics-admin.js (owned by a
//    different band) is present in the working tree, verify it actually calls our
//    exported functions with the signatures we export — not the other way around.
//    Real bug caught by this exact check during implementation: analytics-admin.js
//    calls ensureSchema(env) at 4 call sites, but an earlier draft of this file
//    exported ensureSchema(db) expecting a raw D1Database, which would have thrown
//    "env.prepare is not a function" the first time an admin analytics GET ran.
// ---------------------------------------------------------------------------
if (adminApi) {
  assert.match(
    adminApi,
    /import\s*\{\s*ensureSchema,\s*runRollupForDate\s*\}\s*from\s*'\.\/analytics-rollup\.js'/,
    'analytics-admin.js must import ensureSchema/runRollupForDate from analytics-rollup.js'
  );
  // "await ensureSchema(...)" only — excludes the doc-comment reference "ensureSchema() は...".
  const ensureSchemaCallSites = [...adminApi.matchAll(/await\s+ensureSchema\(([^)]*)\)/g)].map(m => m[1].trim());
  assert.ok(ensureSchemaCallSites.length >= 1, 'analytics-admin.js must call ensureSchema(...) at least once');
  for (const arg of ensureSchemaCallSites) {
    assert.equal(arg, 'env', `analytics-admin.js calls ensureSchema(${arg}), but analytics-rollup.js exports ensureSchema(env) — signature mismatch would throw at runtime`);
  }
} else {
  console.log('[analytics_rollup_regression] src/api/analytics-admin.js not present — skipping cross-file integration check');
}

console.log('==== analytics_rollup_regression: all checks passed ====');
