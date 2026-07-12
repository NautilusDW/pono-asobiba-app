// src/google-auth.js
// Google Cloud Service Account → OAuth2 access token (RS256 JWT)
// Cloudflare Workers 専用。 Web Crypto API のみ使用。 外部依存ゼロ。
//
// セキュリティ:
// - SCOPE = 'cloud-platform' は広いが Cloud TTS の OAuth 認証に必要。
//   IAM 側では用途に必要な role だけを付与し、 token 自体はログやレスポンスへ出さない。
//   Gemini-TTS 3.1 は Cloud TTS API に加えて aiplatform.endpoints.predict が必要。
// - 生成された access_token はログ・レスポンス・永続ストレージへ出さず、
//   Worker isolate のメモリ内だけに短時間保持する。
// - error 内に Google からの description が含まれる可能性あり (機密情報は無いはず)。

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const TOKEN_TTL_SEC = 3600;
const CACHE_TTL_MS = 3000 * 1000;  // 50 分、 実 TTL より少し短く
const memoryTokenCache = new Map();

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
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) {
    throw new Error(`token_exchange_http_${r.status}`);
  }
  const data = await r.json();
  if (!data.access_token) throw new Error('no access_token in response');
  return data.access_token;
}

/**
 * Service Account JSON から access token を取得 (isolate メモリキャッシュ付き)。
 * env.GOOGLE_SERVICE_ACCOUNT_JSON 未設定なら null を返す (caller でフォールバック判定)
 *
 * @param {Object} env Cloudflare Worker env
 * @param {string} [env.GOOGLE_SERVICE_ACCOUNT_JSON] Service Account JSON 全文
 */
export async function getGoogleAccessToken(env) {
  const raw = env && env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  let serviceAccount;
  try {
    serviceAccount = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (_) {
    console.warn('GOOGLE_SERVICE_ACCOUNT_JSON parse failed');
    return null;
  }
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    console.warn('service account JSON lacks client_email/private_key');
    return null;
  }

  const cacheKey = serviceAccount.client_email;
  const now = Date.now();
  const cached = memoryTokenCache.get(cacheKey);
  if (cached && cached.token && cached.expiresAt > now) return cached.token;
  if (cached && cached.pending) return cached.pending;

  const pending = (async () => {
    try {
      const jwt = await signJwt(serviceAccount);
      const token = await fetchAccessToken(jwt);
      memoryTokenCache.set(cacheKey, { token, expiresAt: Date.now() + CACHE_TTL_MS });
      return token;
    } catch (_) {
      memoryTokenCache.delete(cacheKey);
      console.warn('getGoogleAccessToken JWT/token error');
      return null;
    }
  })();
  memoryTokenCache.set(cacheKey, { pending, expiresAt: 0 });
  return pending;
}

/**
 * quota project ヘッダー用に Service Account の project_id だけを返す。
 * JSON 本文や秘密鍵は呼び出し側へ渡さない。
 */
export function getGoogleServiceAccountProjectId(env) {
  const raw = env && env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return '';
  try {
    const serviceAccount = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const projectId = serviceAccount && typeof serviceAccount.project_id === 'string'
      ? serviceAccount.project_id.trim()
      : '';
    return /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId) ? projectId : '';
  } catch (_) {
    return '';
  }
}
