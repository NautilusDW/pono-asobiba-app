// Node test for POST /api/e (src/api/events.js), ESM. Run: node tests/events-api.test.mjs
//
// Cross-review fix regression (major finding: "zero rate limiting" / mass fake-event
// injection). Exercises the real handleEvents() with an in-memory KV mock, following
// the same pattern as tests/savedata-api.test.mjs (which already covers src/api/ratelimit.js
// via savedata.js). Focus areas:
//   1. cheap gates (Origin/country/bot-UA/EVENTS-binding) now run before body read/parse
//   2. per-IP + global POST rate limiting (env.SAVEDATA_KV reuse, ns='ev' isolation from
//      savedata.js's own counters)
//   3. fail-closed ingestion gate: when env.SAVEDATA_KV is absent, /api/e disables
//      ingestion entirely (204, but writeDataPoint is NEVER called) — this is the
//      hardening fix for a follow-up cross-review major finding ("production-only,
//      rate-limit-free WAE writes" because production ships EVENTS without SAVEDATA_KV).
//   4. zone/clear_event prop VALUE allowlisting (minor finding)

import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import { handleEvents } from '../src/api/events.js';
import { handleSaveData } from '../src/api/savedata.js';

let passed = 0, failed = 0;
const fails = [];
function ok(cond, name) {
  if (cond) { passed++; console.log('  PASS:', name); }
  else { failed++; fails.push(name); console.log('  FAIL:', name); }
}
async function section(name, fn) { console.log('\n#', name); await fn(); }

// ---- mocks ----
function makeKV() {
  const store = new Map();
  return {
    _store: store,
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async put(k, v) { store.set(k, String(v)); },
    async delete(k) { store.delete(k); }
  };
}
function makeEventsBinding() {
  const calls = [];
  return {
    _calls: calls,
    writeDataPoint(rec) { calls.push(rec); }
  };
}
function makeReq({ method = 'POST', headers = {}, body = null, cf = { country: 'JP' } } = {}) {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    method,
    cf,
    body: null, // force the non-stream fallback path in readBodyLimited (text())
    headers: { get: (k) => (h.has(k.toLowerCase()) ? h.get(k.toLowerCase()) : null) },
    async text() { return body == null ? '' : body; }
  };
}
function makeCtx() {
  let p = null;
  return { waitUntil(promise) { p = promise; }, _settle: () => p };
}
function envelope(events, extra) {
  return JSON.stringify(Object.assign({
    v: 1,
    cid: '11111111-2222-3333-4444-555555555555',
    sid: 'sess-1',
    tier: 'free',
    platform: 'web',
    events
  }, extra || {}));
}
const JSON_HEADERS = { 'Content-Type': 'application/json' };
function baseEnv() {
  return { SAVEDATA_KV: makeKV(), EVENTS: makeEventsBinding(), PASSCODE_HMAC_SECRET: 'test-secret' };
}

await section('OPTIONS / non-POST', async () => {
  const env = baseEnv();
  const ctx = makeCtx();
  const opt = await handleEvents(makeReq({ method: 'OPTIONS' }), env, ctx);
  ok(opt.status === 204, `OPTIONS -> 204 (got ${opt.status})`);
  const get = await handleEvents(makeReq({ method: 'GET' }), env, ctx);
  ok(get.status === 405, `GET -> 405 (got ${get.status})`);
});

await section('baseline: valid batch accepted end-to-end', async () => {
  const env = baseEnv();
  const ctx = makeCtx();
  const body = envelope([{ n: 'session_start', ts: Date.now(), p: { platform: 'browser' } }]);
  const res = await handleEvents(makeReq({ headers: { ...JSON_HEADERS, 'CF-Connecting-IP': '1.1.1.1' }, body }), env, ctx);
  ok(res.status === 204, `valid batch -> 204 (got ${res.status})`);
  await ctx._settle();
  ok(env.EVENTS._calls.length === 1, `writeDataPoint called once (got ${env.EVENTS._calls.length})`);
  const call = env.EVENTS._calls[0];
  ok(Array.isArray(call.indexes) && call.indexes[0] === '11111111-2222-3333-4444-555555555555', 'indexes carries cid');
  ok(call.blobs[0] === 'session_start', 'blobs[0] is event name');
});

await section('cheap gates run before Content-Type/body-read/JSON.parse (order fix)', async () => {
  const env = baseEnv();
  const ctx = makeCtx();
  // non-JP country + no Content-Type + unparseable body: pre-fix this hit the
  // Content-Type check first and returned 400 (leaking that the request reached
  // body validation). Post-fix it must be silently dropped at the country gate (204),
  // never touching body-read/JSON.parse.
  const res = await handleEvents(makeReq({ headers: { 'CF-Connecting-IP': '2.2.2.2' }, cf: { country: 'US' }, body: '{not json' }), env, ctx);
  ok(res.status === 204, `non-JP + malformed body -> 204, not 400 (got ${res.status})`);
  await ctx._settle();
  ok(env.EVENTS._calls.length === 0, 'non-JP request never reaches writeDataPoint');

  // same proof for the bot-UA gate
  const res2 = await handleEvents(makeReq({ headers: { 'CF-Connecting-IP': '2.2.2.3', 'User-Agent': 'Mozilla/5.0 HeadlessChrome/1.0' }, body: 'also not json' }), env, ctx);
  ok(res2.status === 204, `bot UA + malformed body -> 204, not 400 (got ${res2.status})`);
});

await section('rate limit: per-IP POST throttled (ns=ev, independent of body content)', async () => {
  const env = baseEnv();
  const ctx = makeCtx();
  const body = envelope([{ n: 'session_start', ts: Date.now(), p: {} }]);
  const statuses = [];
  for (let i = 0; i < 32; i++) {
    const r = await handleEvents(makeReq({ headers: { ...JSON_HEADERS, 'CF-Connecting-IP': '9.9.9.1' }, body }), env, ctx);
    statuses.push(r.status);
  }
  ok(statuses.slice(-1)[0] === 429, `per-IP POST limit -> 429 after 30/min (statuses tail: ${statuses.slice(-5).join(',')})`);
  ok(statuses.slice(0, 30).every((s) => s === 204), 'first 30 requests from the same IP succeed');
});

await section('rate limit: global POST cap trips 429 (pre-seeded KV, distinct IPs)', async () => {
  const env = baseEnv();
  const ctx = makeCtx();
  const minuteBucket = Math.floor(Date.now() / 60000);
  // Pre-seed the global counter to just under the cap so we don't need 1000+
  // real round-trips to prove the threshold logic actually fires.
  env.SAVEDATA_KV._store.set(`rl:g:events_post:${minuteBucket}`, '1000');
  const body = envelope([{ n: 'session_start', ts: Date.now(), p: {} }]);
  const res = await handleEvents(makeReq({ headers: { ...JSON_HEADERS, 'CF-Connecting-IP': '9.9.9.2' }, body }), env, ctx);
  ok(res.status === 429, `global POST cap -> 429 once at threshold (got ${res.status})`);
  ok(!!res.headers.get('Retry-After'), 'global cap response carries Retry-After');
});

await section('rate limit: events.js and savedata.js counters do not collide (ns isolation)', async () => {
  const kv = makeKV();
  const eventsEnv = { SAVEDATA_KV: kv, EVENTS: makeEventsBinding(), PASSCODE_HMAC_SECRET: 'test-secret' };
  const savedataEnv = { SAVEDATA_KV: kv, PASSCODE_HMAC_SECRET: 'test-secret' };
  const ctx = makeCtx();
  const ip = '9.9.9.3';

  // Exhaust savedata.js's per-IP POST cap (3/min) from this IP.
  for (let i = 0; i < 4; i++) {
    await handleSaveData(makeReq({ headers: { ...JSON_HEADERS, 'CF-Connecting-IP': ip }, body: JSON.stringify({ schema_version: 1, data: { pono_x: String(i) } }) }), savedataEnv, ctx, '/api/savedata');
  }
  const savedataLocked = await handleSaveData(makeReq({ headers: { ...JSON_HEADERS, 'CF-Connecting-IP': ip }, body: JSON.stringify({ schema_version: 1, data: {} }) }), savedataEnv, ctx, '/api/savedata');
  ok(savedataLocked.status === 429, 'savedata.js per-IP POST cap (3/min) trips first, as expected');

  // events.js from the SAME IP, sharing the SAME KV instance, must be unaffected.
  const body = envelope([{ n: 'session_start', ts: Date.now(), p: {} }]);
  const eventsRes = await handleEvents(makeReq({ headers: { ...JSON_HEADERS, 'CF-Connecting-IP': ip }, body }), eventsEnv, ctx);
  ok(eventsRes.status === 204, `events.js POST from same IP unaffected by savedata.js lockout (got ${eventsRes.status})`);
});

await section('fail-closed: no env.SAVEDATA_KV -> ingestion disabled entirely (204, but never writes)', async () => {
  // Hardening fix for the follow-up cross-review major finding: production ships
  // EVENTS without SAVEDATA_KV, which previously meant "rate-limit-free WAE writes
  // in production". The fix disables ingestion outright when SAVEDATA_KV is absent —
  // the client still sees 204 (no broken retry/queue logic), but writeDataPoint()
  // must never be reached, closing the gap structurally rather than relying on the
  // rate limiter alone.
  const env = { EVENTS: makeEventsBinding() }; // SAVEDATA_KV intentionally absent
  const ctx = makeCtx();
  const body = envelope([{ n: 'session_start', ts: Date.now(), p: { platform: 'browser' } }]);

  // A single, otherwise-fully-valid batch must still be dropped before writeDataPoint.
  const single = await handleEvents(makeReq({ headers: { ...JSON_HEADERS, 'CF-Connecting-IP': '9.9.9.9' }, body }), env, ctx);
  ok(single.status === 204, `valid batch without SAVEDATA_KV -> 204 (got ${single.status})`);
  await ctx._settle();
  ok(env.EVENTS._calls.length === 0, 'valid batch without SAVEDATA_KV never reaches writeDataPoint');

  // Repeated requests from the same IP must also never succeed at writing, and must
  // never 429/503 either (no rate limiter engaged because ingestion is off, not because
  // the limiter forgot to run).
  let allOk = true;
  for (let i = 0; i < 40; i++) {
    const r = await handleEvents(makeReq({ headers: { ...JSON_HEADERS, 'CF-Connecting-IP': '9.9.9.4' }, body }), env, ctx);
    if (r.status !== 204) allOk = false;
  }
  ok(allOk, 'without SAVEDATA_KV, 40 same-IP requests all still respond 204, never 503/429');
  await ctx._settle();
  ok(env.EVENTS._calls.length === 0, 'without SAVEDATA_KV, none of the 41 total requests ever call writeDataPoint');
});

await section('prop value allowlisting: zone/clear_event enums (minor finding)', async () => {
  const env = baseEnv();
  const ctx = makeCtx();
  const body = envelope([
    { n: 'game_launch', ts: Date.now(), p: { game_id: 'maze', zone: 'not_a_real_zone' } },      // invalid zone -> dropped
    { n: 'game_launch', ts: Date.now(), p: { game_id: 'maze', zone: 'playable' } },              // valid zone -> kept
    { n: 'game_clear', ts: Date.now(), p: { game_id: 'maze', clear_event: 'clear' } },           // valid clear_event -> kept
    { n: 'game_clear', ts: Date.now(), p: { game_id: 'maze', clear_event: 'not_a_real_event' } } // invalid -> dropped
  ]);
  const res = await handleEvents(makeReq({ headers: { ...JSON_HEADERS, 'CF-Connecting-IP': '9.9.9.5' }, body }), env, ctx);
  ok(res.status === 204, `batch with invalid enum values -> still 204, not rejected wholesale (got ${res.status})`);
  await ctx._settle();
  const calls = env.EVENTS._calls;
  ok(calls.length === 4, `all 4 events still written, only the bad fields are dropped (got ${calls.length})`);
  ok(calls[0].blobs[5] === '', `invalid zone value stripped from extraJSON (got: ${calls[0].blobs[5]})`);
  ok(calls[1].blobs[5] === JSON.stringify({ zone: 'playable' }), `valid zone value kept in extraJSON (got: ${calls[1].blobs[5]})`);
  ok(calls[2].blobs[5] === JSON.stringify({ clear_event: 'clear' }), `valid clear_event value kept in extraJSON (got: ${calls[2].blobs[5]})`);
  ok(calls[3].blobs[5] === '', `invalid clear_event value stripped from extraJSON (got: ${calls[3].blobs[5]})`);
});

console.log(`\n==== ${passed} passed, ${failed} failed ====`);
if (failed) { console.log('FAILURES:', fails.join(' | ')); process.exit(1); }
