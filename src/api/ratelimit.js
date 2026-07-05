// src/api/ratelimit.js
// -----------------------------------------------------------------------------
// Step C の多層 rate-limit (HIGH-3 / HIGH-3b)。 KV counter ベースで実装し、
// 追加バインディング無しでも動く。 Cloudflare 純正 Rate Limiting binding
// (env.SAVEDATA_RL_IP) があれば IP GET ゲートを純正側に委譲する (任意の強化)。
//
//   - グローバル GET: 全世界合計 100 回/分 (IP 分散攻撃対策)
//   - グローバル POST: 全世界合計  10 回/分
//   - IP 別 GET:  5 回/分 を超えたら 15 分ロック
//   - failed:{ip_hash}:  404 が 15 分以内に 10 回で 24 時間ロック
//
// KV counter の注意:
//   KV は結果整合 (eventual consistency) かつ read-modify-write が非アトミック。
//   高並列時にカウントを取りこぼす可能性があるが、 濫用「抑止」目的では許容範囲
//   (正規ユーザは上限に達しない / 攻撃者は概ね絞られる)。 厳密な保証が要るなら
//   純正 Rate Limiting binding を併用する (SETUP.md 参照)。
//
// IP は生値を保存しない。 SHA-256(salt|ip) の先頭 32hex のみを鍵に使う (プライバシー)。
// -----------------------------------------------------------------------------

export const GLOBAL_GET_LIMIT = 100;   // /分
export const GLOBAL_POST_LIMIT = 10;   // /分
export const IP_GET_LIMIT = 5;         // /分
export const IP_LOCK_SEC = 15 * 60;    // 15 分
export const FAIL_LIMIT = 10;          // 15 分窓での連続 fail
export const FAIL_WINDOW_SEC = 15 * 60;
export const FAIL_LOCK_SEC = 24 * 60 * 60; // 24 時間
const COUNTER_TTL_SEC = 120;           // 分バケット counter の寿命 (>60s の余裕)

function minuteBucket() {
  return Math.floor(Date.now() / 60000);
}

function toHex(buf) {
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

export async function hashIp(ip, salt) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode((salt || '') + '|' + (ip || 'unknown')));
  return toHex(buf).slice(0, 32);
}

export function getClientIp(request) {
  const cf = request.headers.get('CF-Connecting-IP');
  if (cf) return cf;
  const xff = request.headers.get('X-Forwarded-For');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}

function waitPut(kv, key, value, ttl, ctx) {
  const p = kv.put(key, value, { expirationTtl: ttl });
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(p);
    return Promise.resolve();
  }
  return p;
}

async function readCount(kv, key) {
  const v = await kv.get(key);
  const n = parseInt(v || '0', 10);
  return Number.isFinite(n) ? n : 0;
}

// グローバル GET/POST counter。 kind = 'get' | 'post'
export async function checkAndCountGlobal(kv, kind, ctx) {
  const limit = kind === 'post' ? GLOBAL_POST_LIMIT : GLOBAL_GET_LIMIT;
  const key = `rl:g:${kind}:${minuteBucket()}`;
  const cur = await readCount(kv, key);
  if (cur >= limit) return { ok: false, retryAfter: 60, reason: 'global' };
  await waitPut(kv, key, String(cur + 1), COUNTER_TTL_SEC, ctx);
  return { ok: true };
}

// IP 別 GET ゲート。 lock を先に見て、 分 counter を増やし、 超過で 15 分 lock。
export async function checkIpGet(kv, ipHash, ctx, env) {
  // 24h fail lock -> 15min ip lock の順で確認
  if (await kv.get(`rl:faillock:${ipHash}`)) {
    return { ok: false, retryAfter: FAIL_LOCK_SEC, reason: 'fail_lock' };
  }
  if (await kv.get(`rl:iplock:${ipHash}`)) {
    return { ok: false, retryAfter: IP_LOCK_SEC, reason: 'ip_lock' };
  }

  // 純正 Rate Limiting binding があれば IP レートは純正側で判定 (任意)
  if (env && env.SAVEDATA_RL_IP && typeof env.SAVEDATA_RL_IP.limit === 'function') {
    try {
      const { success } = await env.SAVEDATA_RL_IP.limit({ key: ipHash });
      if (!success) {
        await waitPut(kv, `rl:iplock:${ipHash}`, '1', IP_LOCK_SEC, ctx);
        return { ok: false, retryAfter: IP_LOCK_SEC, reason: 'ip_rate' };
      }
      return { ok: true };
    } catch (_) {
      // 純正側エラー時は KV フォールバックへ
    }
  }

  const key = `rl:ip:${ipHash}:${minuteBucket()}`;
  const cur = await readCount(kv, key);
  if (cur + 1 > IP_GET_LIMIT) {
    await waitPut(kv, `rl:iplock:${ipHash}`, '1', IP_LOCK_SEC, ctx);
    return { ok: false, retryAfter: IP_LOCK_SEC, reason: 'ip_rate' };
  }
  await waitPut(kv, key, String(cur + 1), COUNTER_TTL_SEC, ctx);
  return { ok: true };
}

// 404 (存在しない合言葉) を記録。 15 分窓で 10 回に達したら 24h ロック。
export async function recordFailure(kv, ipHash, ctx) {
  const key = `rl:failed:${ipHash}`;
  const cur = await readCount(kv, key);
  const next = cur + 1;
  // fail counter はゲートに使うので waitUntil ではなく確実に書く
  await kv.put(key, String(next), { expirationTtl: FAIL_WINDOW_SEC });
  if (next >= FAIL_LIMIT) {
    await kv.put(`rl:faillock:${ipHash}`, '1', { expirationTtl: FAIL_LOCK_SEC });
  }
}
