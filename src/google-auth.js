// src/google-auth.js
// Google Cloud Service Account → OAuth2 access token (RS256 JWT)
// Cloudflare Workers 専用。 Web Crypto API のみ使用。 外部依存ゼロ。

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const TOKEN_TTL_SEC = 3600;
const CACHE_TTL_SEC = 3000;  // 50 分、 実 TTL より少し短く

function base64UrlEncode(buf) {
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeString(s) {
  return base64UrlEncode(new TextEncoder().encode(s));
}

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

async function signJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: now,
    exp: now + TOKEN_TTL_SEC,
  };
  const headerB64 = base64UrlEncodeString(JSON.stringify(header));
  const payloadB64 = base64UrlEncodeString(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const keyData = pemToArrayBuffer(serviceAccount.private_key);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(sig)}`;
}

async function fetchAccessToken(jwt) {
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });
  const r = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`token exchange failed: ${r.status} ${text}`);
  }
  const data = await r.json();
  if (!data.access_token) throw new Error('no access_token in response');
  return data.access_token;
}

/**
 * Service Account JSON から access token を取得 (KV キャッシュ付き)。
 * env.GOOGLE_SERVICE_ACCOUNT_JSON 未設定なら null を返す (caller でフォールバック判定)
 *
 * @param {Object} env Cloudflare Worker env
 * @param {KVNamespace} [env.BENTO_MASK_CONFIG] token キャッシュ用
 * @param {string} [env.GOOGLE_SERVICE_ACCOUNT_JSON] Service Account JSON 全文
 */
export async function getGoogleAccessToken(env) {
  const raw = env && env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  let serviceAccount;
  try {
    serviceAccount = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    console.warn('GOOGLE_SERVICE_ACCOUNT_JSON parse failed:', e.message);
    return null;
  }
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    console.warn('service account JSON lacks client_email/private_key');
    return null;
  }

  const cacheKey = `gcloud-token:${serviceAccount.client_email}`;
  const kv = env && env.BENTO_MASK_CONFIG;

  // 1. KV キャッシュ確認
  if (kv) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached) return cached;
    } catch (_) {}
  }

  // 2. JWT 署名 → token 交換
  const jwt = await signJwt(serviceAccount);
  const token = await fetchAccessToken(jwt);

  // 3. KV にキャッシュ
  if (kv && token) {
    try {
      await kv.put(cacheKey, token, { expirationTtl: CACHE_TTL_SEC });
    } catch (_) {}
  }

  return token;
}
