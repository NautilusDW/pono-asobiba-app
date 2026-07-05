// Node test for Step C savedata backend (ESM). Run: node tests/savedata-api.test.mjs
// Exercises wordlist entropy, validate denylist, passcode format/HMAC, and a full
// POST->GET round-trip through handleSaveData with an in-memory KV mock.
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import { WORDS, WORD_SET } from '../src/api/wordlist.js';
import {
  validateAndSanitize, sanitizeStoredData, isImportAllowedKey, MAX_BODY_BYTES
} from '../src/api/validate.js';
import {
  generatePasscode, isValidPasscodeFormat, isKnownPasscode,
  hmacKeyName, passcodeEntropyBits
} from '../src/api/passcode.js';
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
function makeReq({ method = 'GET', headers = {}, body = null, stream = null, url = 'https://x/' } = {}) {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  // stream: Uint8Array -> expose request.body as a ReadableStream (exercises readBodyLimited)
  let rbody = null;
  if (stream) {
    rbody = new ReadableStream({
      start(controller) { controller.enqueue(stream); controller.close(); }
    });
  }
  return {
    method,
    url,
    body: rbody,
    headers: { get: (k) => (h.has(k.toLowerCase()) ? h.get(k.toLowerCase()) : null) },
    async text() {
      if (stream) return new TextDecoder().decode(stream);
      return body == null ? '' : body;
    }
  };
}
const JSON_CT = { Origin: 'https://pono-asobiba-app-staging.ndw.workers.dev', 'Content-Type': 'application/json' };
const ctx = { waitUntil() {} };
const APP_ENV = () => ({ SAVEDATA_KV: makeKV(), PASSCODE_HMAC_SECRET: 'test-secret-xyz', APP_BUILD: '1' });
const ORIGIN = 'https://pono-asobiba-app-staging.ndw.workers.dev';

await section('wordlist entropy + purity', async () => {
  ok(WORDS.length >= 604, `union >= 604 (got ${WORDS.length})`);
  ok(passcodeEntropyBits() >= 41, `entropy >= 41 bits (got ${passcodeEntropyBits().toFixed(2)})`);
  const ALLOWED = new Set('あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわんぁぃぅぇぉっゃゅょ');
  const bad = WORDS.filter(w => [...w].some(c => !ALLOWED.has(c)));
  ok(bad.length === 0, `all words seion-only (offenders: ${bad.join(',')})`);
  ok(WORD_SET.size === WORDS.length, 'WORD_SET matches WORDS length');
});

await section('passcode format + generation + HMAC', async () => {
  const pc = generatePasscode();
  ok(isValidPasscodeFormat(pc), `generated matches format: ${pc}`);
  ok(isKnownPasscode(pc), `generated is known (words in set): ${pc}`);
  ok(pc.split('-').length === 4, '3 words + 4 digits');
  ok(/^[0-9]{4}$/.test(pc.split('-')[3]), 'last segment is 4 digits');
  ok(!isValidPasscodeFormat('abc'), 'reject "abc"');
  ok(!isValidPasscodeFormat('さくら-もり-2417'), 'reject 2 words');
  ok(!isKnownPasscode('ずずず-ずずず-ずずず-1234'), 'reject unknown words');
  ok(!isKnownPasscode(WORDS[0] + '-' + WORDS[1] + '-' + WORDS[2] + '-12'), 'reject 2-digit tail');
  const a = await hmacKeyName('さくら-もり-ほし-2417', 's1');
  const b = await hmacKeyName('さくら-もり-ほし-2417', 's1');
  const c = await hmacKeyName('さくら-もり-ほし-2417', 's2');
  ok(a === b && a.startsWith('savedata:v1:'), 'HMAC deterministic + prefixed');
  ok(a !== c, 'HMAC differs by secret');
  // unbiased digit distribution smoke test
  let hi = 0; for (let i = 0; i < 400; i++) { const d = +generatePasscode().split('-')[3]; if (d >= 5000) hi++; }
  ok(hi > 130 && hi < 270, `digit distribution roughly uniform (hi=${hi}/400)`);
});

await section('validate: denylist + structure (CRITICAL-6 / HIGH-5)', async () => {
  const good = JSON.stringify({ schema_version: 1, app_version: 1, data: {
    pono_profile_name: 'x', pono_acorns: '12', bowling_best: '9',
    pono_premium: '1', pono_sub_active: '1', pono_unlocked_sea: '1', pono_premium_bonus: '1',
    pono_admin_flag: '1', pono_debug_x: '1', pono_tts_cache: '1', pono_capture_1: '1',
    NotAllowed: 'y', __proto__: 'z'
  }});
  const r = validateAndSanitize(good);
  ok(r.ok, 'valid payload accepted');
  const keys = Object.keys(r.clean);
  ok(keys.includes('pono_profile_name') && keys.includes('pono_acorns') && keys.includes('bowling_best'), 'allowed keys kept');
  ok(!keys.includes('pono_premium') && !keys.includes('pono_sub_active') && !keys.includes('pono_unlocked_sea') && !keys.includes('pono_premium_bonus'), 'tier/unlocked denied');
  ok(!keys.includes('pono_admin_flag') && !keys.includes('pono_debug_x') && !keys.includes('pono_tts_cache') && !keys.includes('pono_capture_1'), 'admin/debug/tts/capture prefixes denied');
  ok(!keys.includes('NotAllowed') && !keys.includes('__proto__'), 'non-allowlisted + proto key denied');
  ok(Object.getPrototypeOf(r.clean) === null, 'clean has null prototype');

  ok(validateAndSanitize('{bad json').status === 400, 'invalid json -> 400');
  ok(validateAndSanitize(JSON.stringify({ schema_version: 2, data: {} })).code === 'unsupported_schema', 'schema!=1 -> unsupported_schema');
  ok(validateAndSanitize(JSON.stringify({ schema_version: 1, data: { k: { nested: 1 } } })).code === 'nested_value', 'nested value -> reject');
  const many = {}; for (let i = 0; i < 301; i++) many['pono_k' + i] = 'v';
  ok(validateAndSanitize(JSON.stringify({ schema_version: 1, data: many })).code === 'too_many_keys', '>300 keys -> reject');
  const big = 'a'.repeat(MAX_BODY_BYTES + 10);
  ok(validateAndSanitize(JSON.stringify({ schema_version: 1, data: { pono_x: big } })).status === 413, 'oversize -> 413');
  ok(isImportAllowedKey('pono_acorns') && !isImportAllowedKey('pono_premium') && !isImportAllowedKey('__proto__'), 'isImportAllowedKey basics');

  const s = sanitizeStoredData({ pono_acorns: '3', pono_premium: '1', bad_key: '1', n: 5 });
  ok(s.count === 1 && s.clean.pono_acorns === '3' && !('pono_premium' in s.clean), 'sanitizeStoredData re-applies denylist');
});

await section('round-trip POST -> GET through handleSaveData', async () => {
  const env = APP_ENV();
  const body = JSON.stringify({ schema_version: 1, app_version: 1968, data: {
    pono_profile_name: 'てすと', pono_acorns: '42', pono_premium: '1'
  }});
  const postRes = await handleSaveData(makeReq({ method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body }), env, ctx, '/api/savedata');
  ok(postRes.status === 200, `POST 200 (got ${postRes.status})`);
  const postJson = await postRes.json();
  ok(postJson.ok && isKnownPasscode(postJson.passcode), `POST returns known passcode: ${postJson.passcode}`);
  ok(postRes.headers.get('Access-Control-Allow-Origin') === ORIGIN, 'CORS reflects allowed staging origin');

  const pc = postJson.passcode;
  const getRes = await handleSaveData(makeReq({ method: 'GET', headers: { Origin: ORIGIN, 'CF-Connecting-IP': '1.2.3.4' } }), env, ctx, '/api/savedata/' + encodeURIComponent(pc));
  ok(getRes.status === 200, `GET 200 (got ${getRes.status})`);
  const getJson = await getRes.json();
  ok(getJson.data.pono_profile_name === 'てすと' && getJson.data.pono_acorns === '42', 'GET returns stored allowed data');
  ok(!('pono_premium' in getJson.data), 'GET output denylist applied (pono_premium absent)');
  ok(getJson.schema_version === 1 && typeof getJson.expires_at === 'string', 'GET payload shape (schema_version + expires_at)');

  // unknown but well-formed passcode -> 404
  const unknown = WORDS[0] + '-' + WORDS[1] + '-' + WORDS[2] + '-0001';
  const nf = await handleSaveData(makeReq({ method: 'GET', headers: { 'CF-Connecting-IP': '9.9.9.9' } }), env, ctx, '/api/savedata/' + encodeURIComponent(unknown));
  ok(nf.status === 404, 'unknown passcode -> 404');

  // malformed -> 400 without KV access
  const bad = await handleSaveData(makeReq({ method: 'GET', headers: { 'CF-Connecting-IP': '9.9.9.8' } }), env, ctx, '/api/savedata/abc');
  ok(bad.status === 400, 'malformed passcode -> 400');

  // PUT / overwrite rejected
  const put = await handleSaveData(makeReq({ method: 'PUT', headers: { Origin: ORIGIN } }), env, ctx, '/api/savedata');
  ok(put.status === 405, 'PUT -> 405 (no overwrite)');

  // OPTIONS preflight
  const opt = await handleSaveData(makeReq({ method: 'OPTIONS', headers: { Origin: ORIGIN } }), env, ctx, '/api/savedata');
  ok(opt.status === 204 && opt.headers.get('Access-Control-Allow-Origin') === ORIGIN, 'OPTIONS -> 204 with CORS');

  // production CORS must NOT include localhost origin
  const prodEnv = { SAVEDATA_KV: makeKV(), PASSCODE_HMAC_SECRET: 's' }; // no APP_BUILD
  const lh = await handleSaveData(makeReq({ method: 'OPTIONS', headers: { Origin: 'http://localhost:8787' } }), prodEnv, ctx, '/api/savedata');
  ok(lh.headers.get('Access-Control-Allow-Origin') == null, 'production: localhost origin not allowed');
});

await section('unconfigured env -> 503', async () => {
  const res = await handleSaveData(makeReq({ method: 'POST', body: '{}' }), {}, ctx, '/api/savedata');
  ok(res.status === 503, 'no SAVEDATA_KV -> 503');
});

await section('HIGH: Content-Type enforcement + streaming body (MED)', async () => {
  const env = APP_ENV();
  const body = JSON.stringify({ schema_version: 1, data: { pono_x: '1' } });
  const noCt = await handleSaveData(makeReq({ method: 'POST', headers: { Origin: ORIGIN, 'CF-Connecting-IP': '7.0.0.1' }, body }), env, ctx, '/api/savedata');
  ok(noCt.status === 415, 'POST without Content-Type -> 415');
  const tp = await handleSaveData(makeReq({ method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'text/plain', 'CF-Connecting-IP': '7.0.0.2' }, body }), env, ctx, '/api/savedata');
  ok(tp.status === 415, 'POST text/plain -> 415 (blocks CORS-simple cross-origin)');
  const okCt = await handleSaveData(makeReq({ method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json; charset=utf-8', 'CF-Connecting-IP': '7.0.0.3' }, body }), env, ctx, '/api/savedata');
  ok(okCt.status === 200, 'POST application/json; charset -> 200');
  // streaming oversize body -> 413 via real ReadableStream (no Content-Length header)
  const envB = APP_ENV();
  const bigBytes = new TextEncoder().encode('{"schema_version":1,"data":{"pono_x":"' + 'a'.repeat(MAX_BODY_BYTES + 100) + '"}}');
  const over = await handleSaveData(makeReq({ method: 'POST', headers: { ...JSON_CT, 'CF-Connecting-IP': '7.0.0.4' }, stream: bigBytes }), envB, ctx, '/api/savedata');
  ok(over.status === 413, `streaming oversize body -> 413 (got ${over.status})`);
});

await section('rate limits (HIGH-3 / HIGH-3b)', async () => {
  // global POST 10/min — distinct IPs so per-IP POST cap doesn't mask the global cap
  const env = APP_ENV();
  let last = 200;
  for (let i = 0; i < 12; i++) {
    const r = await handleSaveData(makeReq({ method: 'POST', headers: { ...JSON_CT, 'CF-Connecting-IP': '10.0.0.' + i }, body: JSON.stringify({ schema_version: 1, data: { pono_x: String(i) } }) }), env, ctx, '/api/savedata');
    last = r.status;
  }
  ok(last === 429, 'global POST limit -> 429 after 10/min (distinct IPs)');

  // per-IP POST 3/min -> 429 (same IP) [HIGH]
  const envP = APP_ENV();
  const postStatuses = [];
  for (let i = 0; i < 5; i++) {
    const r = await handleSaveData(makeReq({ method: 'POST', headers: { ...JSON_CT, 'CF-Connecting-IP': '3.3.3.3' }, body: JSON.stringify({ schema_version: 1, data: { pono_x: String(i) } }) }), envP, ctx, '/api/savedata');
    postStatuses.push(r.status);
  }
  ok(postStatuses.slice(-1)[0] === 429, `per-IP POST limit -> 429 (statuses: ${postStatuses.join(',')})`);

  // IP GET 5/min -> 15min lock (use fresh env, well-formed-but-unknown passcode)
  const env2 = APP_ENV();
  const unknown = WORDS[3] + '-' + WORDS[4] + '-' + WORDS[5] + '-1234';
  let statuses = [];
  for (let i = 0; i < 7; i++) {
    const r = await handleSaveData(makeReq({ method: 'GET', headers: { 'CF-Connecting-IP': '5.5.5.5' } }), env2, ctx, '/api/savedata/' + encodeURIComponent(unknown));
    statuses.push(r.status);
  }
  ok(statuses.slice(-1)[0] === 429, `IP GET limit -> 429 (statuses: ${statuses.join(',')})`);
});

console.log(`\n==== ${passed} passed, ${failed} failed ====`);
if (failed) { console.log('FAILURES:', fails.join(' | ')); process.exit(1); }
