'use strict';

// Static regression test for POST /api/e (data-analytics-plan.md §6-2).
// Style follows existing tests/*.cjs (fs.readFileSync + assert/strict + regex/string
// level checks on source, no runtime Worker mocking) — see e.g.
// tests/maze_admin_minigame_debug_regression.cjs / tests/nazonazo_admin_stage_select_regression.cjs.
//
// Run: node tests/analytics_events_api_regression.cjs

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const events = read('src/api/events.js');
const worker = read('src/worker.js');
const savedata = read('src/api/savedata.js');
const wranglerToml = read('wrangler.toml');

// ---------------------------------------------------------------------------
// 1. イベント名 allowlist: P0の7個 (game_title_tap を除く) が定義されている
// ---------------------------------------------------------------------------
const REQUIRED_EVENT_NAMES = [
  'session_start',
  'daily_return',
  'game_launch',
  'game_clear',
  'paywall_hit',
  'upgrade_cta_click',
  'acorn_earned'
];

const allowlistBlockMatch = events.match(/ALLOWED_EVENT_NAMES\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
assert.ok(allowlistBlockMatch, 'events.js must define ALLOWED_EVENT_NAMES as a Set literal');
const allowlistBlock = allowlistBlockMatch[1];
for (const name of REQUIRED_EVENT_NAMES) {
  assert.ok(
    allowlistBlock.includes(`'${name}'`),
    `ALLOWED_EVENT_NAMES must include '${name}'`
  );
}
assert.equal(
  (allowlistBlock.match(/'[a-z_]+'/g) || []).length,
  REQUIRED_EVENT_NAMES.length,
  `ALLOWED_EVENT_NAMES must contain exactly ${REQUIRED_EVENT_NAMES.length} event names (got: ${allowlistBlock})`
);
assert.ok(
  !events.includes("'game_title_tap'"),
  'game_title_tap is measured via Umami data-umami-event, not /api/e — must not appear in ALLOWED_EVENT_NAMES'
);

// ---------------------------------------------------------------------------
// 2. prop キー allowlist が定義されている (PII 混入防止の第一防衛線)
// ---------------------------------------------------------------------------
assert.match(
  events,
  /ALLOWED_PROP_KEYS\s*=\s*new Set\(\[/,
  'events.js must define an ALLOWED_PROP_KEYS allowlist for event properties'
);
for (const key of ['game_id', 'zone', 'clear_event', 'date_jst', 'delta', 'reached_daily_cap']) {
  assert.ok(events.includes(`'${key}'`), `ALLOWED_PROP_KEYS must include '${key}'`);
}
// name/age/gender/email 等 PII キーは絶対に allowlist に含まれてはならない
for (const pii of ['name', 'age', 'gender', 'email']) {
  assert.ok(
    !new RegExp(`ALLOWED_PROP_KEYS[\\s\\S]*?'${pii}'[\\s\\S]*?\\]\\)`).test(events)
      || !events.match(/ALLOWED_PROP_KEYS\s*=\s*new Set\(\[([\s\S]*?)\]\)/)[1].includes(`'${pii}'`),
    `ALLOWED_PROP_KEYS must not include PII key '${pii}'`
  );
}
// 値の型/長さバリデーションが存在する (string|number|boolean, 128文字上限)
assert.match(events, /typeof value === 'string'/, 'prop value validation must check for string type');
assert.match(events, /typeof value === 'number'/, 'prop value validation must check for number type');
assert.match(events, /typeof value === 'boolean'/, 'prop value validation must check for boolean type');
assert.match(events, /MAX_PROP_STRING_LEN\s*=\s*128/, 'string prop values must be capped at 128 chars');

// ---------------------------------------------------------------------------
// 3. cid は UUID 形式チェック
// ---------------------------------------------------------------------------
assert.match(
  events,
  /UUID_RE\s*=\s*\/\^\[0-9a-f\]\{8\}-/i,
  'events.js must validate cid against a UUID-shaped regex'
);
assert.match(events, /UUID_RE\.test\(cid\)/, 'cid must be validated with UUID_RE.test(cid)');

// ---------------------------------------------------------------------------
// 4. バリデーション系ステータスコード: 405 (non-POST) / 400 (bad JSON/shape) / 413 (too large)
// ---------------------------------------------------------------------------
assert.match(events, /request\.method\s*!==\s*'POST'/, 'must reject non-POST methods');
assert.match(events, /noBody\(405,\s*cors\)/, 'non-POST must respond 405');
assert.match(events, /noBody\(400,\s*cors\)/, 'malformed payloads must respond 400');
assert.match(events, /noBody\(413,\s*cors\)/, 'oversize payloads must respond 413');
assert.match(events, /MAX_BODY_BYTES\s*=\s*64\s*\*\s*1024/, 'body size cap must be 64KB');
assert.match(events, /MAX_EVENTS_PER_REQUEST\s*=\s*50/, 'batch size cap must be 50 events/request');
assert.match(
  events,
  /envelope\.events\.length\s*>\s*MAX_EVENTS_PER_REQUEST/,
  '>50 events in one request must be rejected'
);

// ---------------------------------------------------------------------------
// 5. 国ゲート (request.cf.country !== 'JP' は書き込まず 204)
// ---------------------------------------------------------------------------
assert.match(
  events,
  /request\.cf\s*&&\s*request\.cf\.country/,
  'must read request.cf.country for the country gate'
);
assert.match(
  events,
  /country\s*!==\s*'JP'/,
  'country gate must compare against the literal \'JP\''
);

// ---------------------------------------------------------------------------
// 6. bot/E2E UA 除外 (HeadlessChrome / Playwright)
// ---------------------------------------------------------------------------
assert.match(
  events,
  /BOT_UA_RE\s*=\s*\/HeadlessChrome\|Playwright\/i/,
  'must define a bot UA regex covering HeadlessChrome and Playwright'
);
assert.match(events, /BOT_UA_RE\.test\(ua\)/, 'bot UA regex must actually be applied to the request UA');

// ---------------------------------------------------------------------------
// 7. Origin 検証は savedata.js の allowedOrigins を再利用している
// ---------------------------------------------------------------------------
assert.match(savedata, /export\s+function\s+allowedOrigins\s*\(env\)/, 'savedata.js must export allowedOrigins(env) for reuse');
assert.match(
  events,
  /import\s*\{\s*allowedOrigins\s*\}\s*from\s*'\.\/savedata\.js'/,
  'events.js must import allowedOrigins from ./savedata.js rather than re-implementing its own CORS allowlist'
);
assert.match(events, /allowedOrigins\(env\)/, 'events.js must actually call allowedOrigins(env)');

// ---------------------------------------------------------------------------
// 8. env.EVENTS (WAE binding) 未定義なら 503 ではなく 204
// ---------------------------------------------------------------------------
assert.match(
  events,
  /!env\.EVENTS\s*\|\|\s*typeof\s+env\.EVENTS\.writeDataPoint\s*!==\s*'function'/,
  'missing/invalid env.EVENTS binding must be detected explicitly'
);
{
  const guardIdx = events.search(/!env\.EVENTS\s*\|\|\s*typeof\s+env\.EVENTS\.writeDataPoint\s*!==\s*'function'/);
  assert.ok(guardIdx >= 0);
  const afterGuard = events.slice(guardIdx, guardIdx + 200);
  assert.match(afterGuard, /noBody\(204,\s*cors\)/, 'missing env.EVENTS must respond 204, not 503');
}
assert.ok(!/env\.EVENTS[\s\S]{0,40}503/.test(events), 'events.js must never 503 due to a missing EVENTS binding');

// ---------------------------------------------------------------------------
// 8b. fail-closed ゲート: env.SAVEDATA_KV 未定義なら受信自体を無効化 (204、writeDataPoint 未到達)。
//     クロスレビュー major 指摘の是正 — レート制限は SAVEDATA_KV 依存のため、
//     production のように EVENTS はあるが SAVEDATA_KV が無い env でレート制限なしの
//     WAE 書込が可能だった残存リスクを構造的に塞ぐ。
// ---------------------------------------------------------------------------
{
  const guardIdx = events.search(/if\s*\(\s*!env\.SAVEDATA_KV\s*\)\s*\{\s*\n\s*return noBody\(204,\s*cors\)/);
  assert.ok(
    guardIdx >= 0,
    'events.js must gate on !env.SAVEDATA_KV and return 204 before any body/EVENTS handling (fail-closed ingestion disable)'
  );
  // このゲートは EVENTS binding チェックより前 (早期段階) に置かれていなければならない。
  const eventsGuardIdx = events.search(/!env\.EVENTS\s*\|\|\s*typeof\s+env\.EVENTS\.writeDataPoint\s*!==\s*'function'/);
  assert.ok(eventsGuardIdx >= 0, 'events.js must still guard on env.EVENTS binding presence');
  assert.ok(
    guardIdx < eventsGuardIdx,
    'the fail-closed !env.SAVEDATA_KV gate must run before the env.EVENTS binding check (early gate, before any write path)'
  );
  // 実際の書込み呼び出しサイト (handleEvents 内の writeAll() 起動) より前でなければならない
  // (env.EVENTS.writeDataPoint( 自体は writeEvent() のヘルパー定義内にも出現し handleEvents
  // より前のテキスト位置にあるため、そちらではなく実呼び出し箇所で比較する)。
  const writeAllCallIdx = events.search(/(?:ctx\.waitUntil\(writeAll\(\)\)|await writeAll\(\))/);
  assert.ok(writeAllCallIdx >= 0, 'events.js must invoke writeAll() to actually perform the WAE writes');
  assert.ok(
    guardIdx < writeAllCallIdx,
    'the fail-closed !env.SAVEDATA_KV gate must run before the writeAll() call site'
  );
}

// ---------------------------------------------------------------------------
// 9. writeDataPoint 呼び出しがある (indexes/blobs/doubles を組み立てている)
// ---------------------------------------------------------------------------
assert.match(events, /env\.EVENTS\.writeDataPoint\(/, 'must call env.EVENTS.writeDataPoint(...)');
assert.match(events, /indexes:\s*\[cid\]/, 'writeDataPoint indexes must carry client_id (cid)');
assert.match(events, /doubles:\s*\[ts\]/, 'writeDataPoint doubles must carry the event timestamp (ts)');
assert.match(events, /MAX_BLOB_TOTAL_BYTES/, 'must guard the WAE blob total size budget');

// ---------------------------------------------------------------------------
// 10. worker.js ルーティング: POST /api/e -> handleEvents
//     GET /privacy は worker 側で特別扱いしない (静的アセットの html_handling
//     既定が拡張子なし URL を自動配信するため。かつて存在した /privacy ->
//     /privacy.html rewrite は ASSETS 側の 307 正規化と衝突し無限リダイレクト
//     ループを起こしたため撤去済み — 2026-07-13 staging で実証)
// ---------------------------------------------------------------------------
assert.match(
  worker,
  /import\s*\{\s*handleEvents\s*\}\s*from\s*'\.\/api\/events\.js'/,
  'worker.js must import handleEvents from ./api/events.js'
);
assert.match(
  worker,
  /path\s*===\s*'\/api\/e'[\s\S]{0,80}return handleEvents\(request,\s*env,\s*ctx\)/,
  'worker.js must route path === \'/api/e\' to handleEvents(request, env, ctx)'
);
assert.doesNotMatch(
  worker,
  /path\s*===\s*'\/privacy'/,
  'worker.js must not special-case GET /privacy (static assets auto-serve privacy.html via html_handling; a rewrite conflicts with ASSETS 307 normalization and causes an infinite redirect loop)'
);

// ---------------------------------------------------------------------------
// 11. wrangler.toml: EVENTS binding registered for production + both staging envs,
//     each with its own dataset (BENTO_MASK_CONFIG cross-env sharing incident precedent)
// ---------------------------------------------------------------------------
function extractDataset(toml, headerRe) {
  const m = toml.match(headerRe);
  assert.ok(m, `wrangler.toml missing analytics_engine_datasets block for ${headerRe}`);
  const block = toml.slice(m.index, m.index + 200);
  const bindingMatch = block.match(/binding\s*=\s*"EVENTS"/);
  const datasetMatch = block.match(/dataset\s*=\s*"([a-z0-9_]+)"/);
  assert.ok(bindingMatch, `binding = "EVENTS" not found near ${headerRe}`);
  assert.ok(datasetMatch, `dataset = "..." not found near ${headerRe}`);
  return datasetMatch[1];
}

const prodDataset = extractDataset(wranglerToml, /^\[\[analytics_engine_datasets\]\]/m);
const stagingDataset = extractDataset(wranglerToml, /^\[\[env\.staging\.analytics_engine_datasets\]\]/m);
const stagingAppDataset = extractDataset(wranglerToml, /^\[\[env\.staging-app\.analytics_engine_datasets\]\]/m);

assert.equal(prodDataset, 'pono_events', 'production EVENTS dataset name');
assert.equal(stagingDataset, 'pono_events_stg', 'LP staging EVENTS dataset name');
assert.equal(stagingAppDataset, 'pono_events_stgapp', 'App staging EVENTS dataset name');
assert.ok(
  new Set([prodDataset, stagingDataset, stagingAppDataset]).size === 3,
  'production/staging/staging-app must each use a distinct dataset (no cross-env sharing)'
);

// Top-level [[analytics_engine_datasets]] must appear before the first [section] header
// per this file's own TOML ordering convention documented at the top (routes comment) —
// array-of-tables with a fully-qualified name are exempt (works anywhere), but keep the
// production block colocated with the other production-only bindings for readability.
const firstSectionIdx = wranglerToml.search(/^\[env\./m);
const prodBlockIdx = wranglerToml.search(/^\[\[analytics_engine_datasets\]\]/m);
assert.ok(prodBlockIdx < firstSectionIdx, 'production EVENTS binding should be declared before the [env.*] sections');

console.log('==== analytics_events_api_regression: all checks passed ====');
