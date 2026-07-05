// src/api/savedata.js
// -----------------------------------------------------------------------------
// Step C: 合言葉型クラウド同期の router + handler。
//   POST /api/savedata            -> 新しい合言葉を発行して payload を保存 (上書き無し)
//   GET  /api/savedata/:passcode  -> 合言葉で payload を取得 (有効期限をスライド延長)
//
// 既存 src/worker.js に import して 1 行のルーティングで組み込む (別 worker を立てない)。
// KV binding (env.SAVEDATA_KV) と secret (env.PASSCODE_HMAC_SECRET) が未設定の env
// (LP staging/prod など) では 503 を返して安全に無効化される。
//
// セキュリティ設計 (仕様書 CRITICAL/HIGH):
//   - CRITICAL-6: denylist を POST 受信時 (validateAndSanitize) と GET 返却時
//     (sanitizeStoredData) の両方で適用
//   - HIGH-5: JSON.parse 前に body ≤500KB、 parse 後に flat map / キー数≤300 を検証
//   - HIGH-3/3b: グローバル + IP + failed-counter の多層 rate-limit
//   - 論点9: PUT/上書き無し。 POST は常に新しい合言葉を発行
//   - MED-10: created_at から絶対 180 日上限。 GET でスライド延長 (90日) するが 180日天井
//   - MED-4: CORS は env 別 allowlist。 production に localhost を含めない
// -----------------------------------------------------------------------------

import { validateAndSanitize, sanitizeStoredData, MAX_BODY_BYTES } from './validate.js';
import {
  generatePasscode, hmacKeyName, hmacKeyNames,
  isValidPasscodeFormat, isKnownPasscode
} from './passcode.js';
import {
  hashIp, getClientIp, checkAndCountGlobal, checkIpGet, checkIpPost, recordFailure
} from './ratelimit.js';

const SOFT_TTL_MS = 90 * 24 * 60 * 60 * 1000;   // スライド延長単位 (90日)
const ABS_TTL_MS = 180 * 24 * 60 * 60 * 1000;   // 絶対上限 (180日)
const PATH_POST = '/api/savedata';
const PATH_GET_PREFIX = '/api/savedata/';
const PASSCODE_ALLOC_TRIES = 6;

// ---- CORS (env 別 allowlist) ----
function allowedOrigins(env) {
  const prod = [
    'https://pono.kodama-no-mori.com',
    'https://pono-asobiba-app.ndw.workers.dev'
  ];
  // staging-app (APP_BUILD=1) と dev のみ localhost / staging origin を許可
  if (env && env.APP_BUILD === '1') {
    return prod.concat([
      'https://pono-asobiba-app-staging.ndw.workers.dev',
      'http://localhost:8787',
      'http://127.0.0.1:8787',
      'http://localhost:8788',
      'http://127.0.0.1:8788'
    ]);
  }
  return prod;
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const headers = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  };
  if (allowedOrigins(env).indexOf(origin) >= 0) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function jsonr(status, obj, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) }
  });
}

// body を stream で読み、 累積バイトが maxBytes を超えた時点で abort する (MED)。
// Workers では request.body は ReadableStream。 テスト等 stream が無い場合は
// text() で読んでから byte 長で判定する fallback。
// 戻り値: { ok:true, text } | { ok:false, tooLarge } | { ok:false, error }
async function readBodyLimited(request, maxBytes) {
  const body = request.body;
  if (body && typeof body.getReader === 'function') {
    const reader = body.getReader();
    const chunks = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.byteLength) {
          total += value.byteLength;
          if (total > maxBytes) {
            try { await reader.cancel(); } catch (_) {}
            return { ok: false, tooLarge: true };
          }
          chunks.push(value);
        }
      }
    } catch (_) {
      return { ok: false, error: true };
    }
    const buf = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
    return { ok: true, text: new TextDecoder().decode(buf) };
  }
  // fallback (stream 非対応): text() → byte 長チェック
  let text;
  try {
    text = await request.text();
  } catch (_) {
    return { ok: false, error: true };
  }
  if (new TextEncoder().encode(text).length > maxBytes) {
    return { ok: false, tooLarge: true };
  }
  return { ok: true, text };
}

// ---- entry ----
export async function handleSaveData(request, env, ctx, path) {
  const cors = corsHeaders(request, env);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (!env.SAVEDATA_KV) {
    return jsonr(503, { ok: false, error: 'savedata_not_configured' }, cors);
  }
  const secret = env.PASSCODE_HMAC_SECRET;
  if (!secret) {
    return jsonr(503, { ok: false, error: 'savedata_secret_missing' }, cors);
  }
  const kv = env.SAVEDATA_KV;
  const ipSalt = env.RL_IP_SALT || secret; // 専用 salt が無ければ HMAC secret を流用

  if (path === PATH_POST) {
    return handlePost(request, env, ctx, kv, secret, ipSalt, cors);
  }
  if (path.indexOf(PATH_GET_PREFIX) === 0) {
    return handleGet(request, env, ctx, kv, secret, ipSalt, cors, path);
  }
  return jsonr(404, { ok: false, error: 'not_found' }, cors);
}

// ---- POST /api/savedata ----
async function handlePost(request, env, ctx, kv, secret, ipSalt, cors) {
  if (request.method !== 'POST') {
    return jsonr(405, { ok: false, error: 'method_not_allowed' }, cors);
  }
  // Content-Type 強制 (HIGH): application/json 以外は 415。
  // これで cross-origin 攻撃は non-simple request となり preflight が飛び、
  // CORS allowlist で弾かれる。 正規 client は application/json で送るので無影響。
  const ctype = (request.headers.get('Content-Type') || '').toLowerCase();
  if (ctype.indexOf('application/json') !== 0) {
    return jsonr(415, { ok: false, error: 'unsupported_media_type' }, cors);
  }
  // per-IP POST 制限 (HIGH): 1 IP がグローバル POST 枠 (10/分) を枯渇させるのを防ぐ
  const ip = getClientIp(request, env);
  const ipHash = await hashIp(ip, ipSalt);
  const ipCheck = await checkIpPost(kv, ipHash, ctx);
  if (!ipCheck.ok) {
    return jsonr(429, { ok: false, error: 'rate_limited' }, { ...cors, 'Retry-After': String(ipCheck.retryAfter) });
  }
  // グローバル POST rate-limit (10/分)
  const g = await checkAndCountGlobal(kv, 'post', ctx);
  if (!g.ok) {
    return jsonr(429, { ok: false, error: 'rate_limited' }, { ...cors, 'Retry-After': String(g.retryAfter) });
  }
  // Content-Length による早期拒否 (本体読み込み前の安価な一次フィルタ)
  const cl = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (Number.isFinite(cl) && cl > MAX_BODY_BYTES) {
    return jsonr(413, { ok: false, error: 'payload_too_large' }, cors);
  }
  // body を stream で読み、 累積が上限超過で即 abort (MED: CL 偽装 / chunked 対策)
  const read = await readBodyLimited(request, MAX_BODY_BYTES);
  if (!read.ok) {
    if (read.tooLarge) return jsonr(413, { ok: false, error: 'payload_too_large' }, cors);
    return jsonr(400, { ok: false, error: 'invalid_body' }, cors);
  }
  const text = read.text;

  const v = validateAndSanitize(text);
  if (!v.ok) {
    return jsonr(v.status, { ok: false, error: v.code }, cors);
  }

  const now = Date.now();
  const record = {
    schema_version: 1,
    app_version: v.meta.app_version,
    exported_at: v.meta.exported_at,
    items_count: v.meta.items_count,
    // Object.create(null) のままだと JSON.stringify は問題ないが、 plain object に落とす
    data: Object.assign({}, v.clean),
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
    expires_at: new Date(now + SOFT_TTL_MS).toISOString(),
    abs_expires_at: new Date(now + ABS_TTL_MS).toISOString(),
    read_count: 0
  };

  // 合言葉を発行 (KV 既存確認で衝突回避、 数回だけ試行)
  let passcode = null;
  let keyName = null;
  for (let i = 0; i < PASSCODE_ALLOC_TRIES; i++) {
    const pc = generatePasscode();
    const kn = await hmacKeyName(pc, secret);
    const existing = await kv.get(kn);
    if (!existing) {
      passcode = pc;
      keyName = kn;
      break;
    }
  }
  if (!passcode) {
    return jsonr(500, { ok: false, error: 'passcode_alloc_failed' }, cors);
  }

  try {
    // KV 自体の TTL は絶対上限 (180日)。 GET のスライド延長も天井はこれ。
    await kv.put(keyName, JSON.stringify(record), { expirationTtl: Math.ceil(ABS_TTL_MS / 1000) });
  } catch (e) {
    return jsonr(500, { ok: false, error: 'store_failed' }, cors);
  }

  return jsonr(200, { ok: true, passcode, expires_at: record.expires_at }, cors);
}

// ---- GET /api/savedata/:passcode ----
async function handleGet(request, env, ctx, kv, secret, ipSalt, cors, path) {
  if (request.method !== 'GET') {
    return jsonr(405, { ok: false, error: 'method_not_allowed' }, cors);
  }

  const ip = getClientIp(request, env);
  const ipHash = await hashIp(ip, ipSalt);

  // IP 別 (lock 確認込み) -> グローバル の順に rate-limit
  const ipCheck = await checkIpGet(kv, ipHash, ctx, env);
  if (!ipCheck.ok) {
    return jsonr(429, { ok: false, error: 'rate_limited' }, { ...cors, 'Retry-After': String(ipCheck.retryAfter) });
  }
  const g = await checkAndCountGlobal(kv, 'get', ctx);
  if (!g.ok) {
    return jsonr(429, { ok: false, error: 'rate_limited' }, { ...cors, 'Retry-After': String(g.retryAfter) });
  }

  // 形式検証 (不正形式は KV アクセスせず 400)
  let seg;
  try {
    seg = decodeURIComponent(path.slice(PATH_GET_PREFIX.length));
  } catch (_) {
    return jsonr(400, { ok: false, error: 'invalid_passcode' }, cors);
  }
  if (!isValidPasscodeFormat(seg) || !isKnownPasscode(seg)) {
    return jsonr(400, { ok: false, error: 'invalid_passcode' }, cors);
  }

  // rotation 対応: 現行 + PREV/NEXT secret でキーを引く
  const keyNames = await hmacKeyNames(seg, env);
  let raw = null;
  let hitKey = null;
  for (const kn of keyNames) {
    raw = await kv.get(kn);
    if (raw) { hitKey = kn; break; }
  }
  if (!raw) {
    await recordFailure(kv, ipHash, ctx);
    return jsonr(404, { ok: false, error: 'not_found' }, cors);
  }

  let record;
  try {
    record = JSON.parse(raw);
  } catch (_) {
    return jsonr(404, { ok: false, error: 'not_found' }, cors);
  }

  const now = Date.now();
  const absMs = Date.parse(record.abs_expires_at || '') || 0;
  if (absMs && now > absMs) {
    // 絶対上限超過: 削除して 404
    const del = kv.delete(hitKey);
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(del); else await del;
    return jsonr(404, { ok: false, error: 'expired' }, cors);
  }

  // denylist を再適用 (保存時に漏れた場合の二重防御)
  const s = sanitizeStoredData(record.data);

  // 有効期限スライド延長 (90日、 ただし絶対 180日天井)
  const softTarget = now + SOFT_TTL_MS;
  const cappedSoft = absMs ? Math.min(softTarget, absMs) : softTarget;
  record.data = s.clean;
  record.items_count = s.count;
  record.updated_at = new Date(now).toISOString();
  record.expires_at = new Date(cappedSoft).toISOString();
  record.read_count = (record.read_count | 0) + 1;

  const remainTtl = absMs
    ? Math.max(60, Math.ceil((absMs - now) / 1000))
    : Math.ceil(ABS_TTL_MS / 1000);
  const writeBack = kv.put(hitKey, JSON.stringify(record), { expirationTtl: remainTtl });
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(writeBack); else await writeBack;

  // Step A 互換の payload 形状で返す (client の import 検証パイプラインに通せる)
  return jsonr(200, {
    ok: true,
    schema_version: 1,
    app_version: record.app_version || 0,
    exported_at: record.exported_at || '',
    items_count: s.count,
    data: s.clean,
    expires_at: record.expires_at
  }, cors);
}
