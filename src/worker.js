// Cloudflare Worker entry point
// - Static assets: served via ASSETS binding (wrangler.toml [assets])
// - API: /.netlify/functions/ai-name  -> Gemini Vision proxy (handleAiName)
//        /.netlify/functions/ai-tts   -> Gemini TTS proxy + fallbacks (handleAiTts)
//   Legacy /.netlify/functions/* paths are kept so existing frontend calls work unchanged.

import { Buffer } from 'node:buffer';
import { getGoogleAccessToken } from './google-auth.js';

const PROTECTED_PREFIXES = [
  '/admin/',
  '/admin',
  '/tools/',
  '/tools',
  '/room/furniture_adjuster',
  '/room/yard_adjuster'
];

const BENTO_MASK_CONFIG_KEY = 'bento-mask-defaults-v1';
const NPC_POSITIONS_CURRENT_KEY = 'npc-positions:current';
const NPC_POSITIONS_HISTORY_PREFIX = 'npc-positions:history:';
const NPC_POSITIONS_HISTORY_MAX = 10;

function requiresAuth(path) {
  return PROTECTED_PREFIXES.some(p => path === p || path.startsWith(p + '/') || path.startsWith(p + '.'));
}

function checkBasicAuth(request, env) {
  const expected = env.ADMIN_PASSWORD;
  if (!expected) return false;
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Basic ')) return false;
  try {
    const decoded = atob(auth.slice(6));
    const idx = decoded.indexOf(':');
    if (idx < 0) return false;
    const pass = decoded.slice(idx + 1);
    return pass === expected;
  } catch {
    return false;
  }
}

function authChallenge() {
  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="pono-asobiba admin", charset="UTF-8"' }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/.netlify/functions/ai-name' || path === '/api/ai-name') {
      return handleAiName(request, env);
    }
    if (path === '/.netlify/functions/ai-tts' || path === '/api/ai-tts') {
      return handleAiTts(request, env);
    }
    if (path === '/api/bento/mask-defaults') {
      return handleBentoMaskDefaults(request, env);
    }
    if (path === '/api/admin/bento-npc-positions') {
      if (request.method === 'OPTIONS') {
        return new Response('', { status: 200, headers: { ...CORS, ...noStoreHeaders() } });
      }
      if (request.method === 'GET') {
        if (!checkBasicAuth(request, env)) return authChallenge();
        return handleBentoNpcPositionsGet(request, env);
      }
      if (request.method === 'POST') {
        if (!checkBasicAuth(request, env)) return authChallenge();
        return handleBentoNpcPositionsPost(request, env);
      }
      return new Response('Method Not Allowed', { status: 405, headers: { ...CORS, ...noStoreHeaders() } });
    }
    if (path === '/api/admin/tts-generate') {
      if (!checkBasicAuth(request, env)) return authChallenge();
      return handleAiTts(request, env);
    }

    if (path.startsWith('/api/gh/')) {
      if (!checkBasicAuth(request, env)) return authChallenge();
      return handleGhProxy(request, env);
    }
    if (path.startsWith('/api/gemini/')) {
      if (!checkBasicAuth(request, env)) return authChallenge();
      return handleGeminiProxy(request, env);
    }

    if (requiresAuth(path)) {
      if (!checkBasicAuth(request, env)) return authChallenge();
    }

    const response = await env.ASSETS.fetch(request);
    const cached = applyCacheHeaders(request, response);
    return injectAppBuildFlag(cached, env);
  }
};

// アプリ版 staging worker (pono-asobiba-app-staging) では env.APP_BUILD="1" を設定し、
// 静的 HTML レスポンスへ window.__APP_BUILD__=1 を <head> 直後に注入する。
// - API レスポンス (/.netlify/functions/*, /api/*) はこの関数まで到達しないので安全。
// - 既存 worker (production / staging) は APP_BUILD 未定義なので 100% 既存動作のままパススルー。
// - HTMLRewriter は Cloudflare Workers 標準のストリーミング変換 API なので
//   巨大な HTML でもメモリに全展開せず低コスト。
function injectAppBuildFlag(response, env) {
  if (env.APP_BUILD !== '1') return response;
  if (response.status < 200 || response.status >= 300) return response;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;
  return new HTMLRewriter()
    .on('head', {
      element(el) {
        el.prepend('<script>window.__APP_BUILD__=1;</script>', { html: true });
      }
    })
    .transform(response);
}

// HTML は常に最新、それ以外（画像・動画・JS・CSS）は長期キャッシュ
// CDN-Cache-Control / Cloudflare-CDN-Cache-Control は Cloudflare エッジに効く
function applyCacheHeaders(request, response) {
  const url = new URL(request.url);
  const path = url.pathname;
  const contentType = response.headers.get('content-type') || '';
  const isHTML = contentType.includes('text/html')
    || path.endsWith('/') || path.endsWith('.html');
  // 常に再取得させたいデータ系（完全一致で意図を明確化）
  const isFreshData = path === '/room/items.js'
    || path === '/assets/data/rewards.json'
    || path === '/assets/tts/manifest.json'
    || path === '/manifest.json'
    || path === '/sw.js'
    // 迷路 image ステージのインデックスと個別 JSON は本番保存後すぐ反映したい
    || path === '/maze/imageStages/_index.json'
    || (path.startsWith('/maze/imageStages/') && path.endsWith('.json'))
    // preview の保存レイアウトは PC で書いたら即スマホで見えるように毎回フレッシュ
    || path === '/quizland/preview/full/saved-layout.json'
    || path === '/quizland/saved-layout.json';

  if (isHTML || isFreshData) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('CDN-Cache-Control', 'no-store');
    headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
  return response;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

function json(status, obj, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...(extraHeaders || {}) }
  });
}

function noStoreHeaders() {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
}

function roundBentoMaskNumber(value, fallback = 0, digits = 4) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const scale = Math.pow(10, digits);
  const rounded = Math.round(n * scale) / scale;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function clampBentoMaskNumber(value, min, max, fallback, digits = 4) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return roundBentoMaskNumber(Math.min(max, Math.max(min, n)), fallback, digits);
}

function normalizeBentoMaskRel(rel) {
  return {
    x: clampBentoMaskNumber(rel && rel.x, -0.5, 1.5, 0),
    y: clampBentoMaskNumber(rel && rel.y, -0.5, 1.5, 0),
    w: clampBentoMaskNumber(rel && rel.w, 0.05, 1.5, 1),
    h: clampBentoMaskNumber(rel && rel.h, 0.05, 1.5, 1)
  };
}

function normalizeBentoCompleteLayout(layout) {
  return {
    x: clampBentoMaskNumber(layout && layout.x, -120, 120, 0, 1),
    y: clampBentoMaskNumber(layout && layout.y, -160, 280, 0, 1),
    w: clampBentoMaskNumber(layout && layout.w, 80, 120, 100, 1)
  };
}

function normalizeBentoCompleteLid(lid) {
  return {
    x: clampBentoMaskNumber(lid && lid.x, -160, 160, 0, 1),
    y: clampBentoMaskNumber(lid && lid.y, -180, 240, 0, 1),
    w: clampBentoMaskNumber(lid && lid.w, 70, 130, 100, 1)
  };
}

function getBentoEntryValue(entry, aliases) {
  if (!entry || typeof entry !== 'object') return null;
  for (const alias of aliases) {
    if (entry[alias] && typeof entry[alias] === 'object') return entry[alias];
  }
  return ['x', 'y', 'w', 'h'].some(prop => Object.prototype.hasOwnProperty.call(entry, prop))
    ? entry
    : null;
}

function normalizeBentoMaskBoundsMap(map) {
  const normalized = {};
  if (!map || typeof map !== 'object' || Array.isArray(map)) return normalized;
  Object.keys(map).sort().forEach(key => {
    if (!/^[a-z0-9_:-]{1,80}$/i.test(key)) return;
    const rel = getBentoEntryValue(map[key], ['rel']);
    if (rel) normalized[key] = { rel: normalizeBentoMaskRel(rel) };
  });
  return normalized;
}

function normalizeBentoCompleteLayoutMap(map) {
  const normalized = {};
  if (!map || typeof map !== 'object' || Array.isArray(map)) return normalized;
  Object.keys(map).sort().forEach(key => {
    if (!/^[a-z0-9_:-]{1,100}$/i.test(key)) return;
    const entry = map[key];
    if (key.endsWith(':mask')) {
      const rel = getBentoEntryValue(entry, ['rel', 'mask']);
      if (rel) normalized[key] = { rel: normalizeBentoMaskRel(rel) };
      return;
    }
    if (key.endsWith(':lid')) {
      const lid = getBentoEntryValue(entry, ['lid', 'layout']);
      if (lid) normalized[key] = { lid: normalizeBentoCompleteLid(lid) };
      return;
    }
    const layout = getBentoEntryValue(entry, ['layout']);
    if (layout) normalized[key] = { layout: normalizeBentoCompleteLayout(layout) };
  });
  return normalized;
}

const BENTO_SLOT_LAYOUT_LIMITS = {
  'main-food': 2,
  'side-food': 3,
  cup: 3,
  divider: 3,
  other: 1
};
const BENTO_SHARED_SLOT_KINDS = new Set(['other']);
const BENTO_CUP_SLOT_SIZES = [150, 190, 230];

function normalizeBentoSlotSize(size, kind) {
  const n = clampBentoMaskNumber(size, 32, 340, 120, 1);
  if (kind !== 'cup') return n;
  return BENTO_CUP_SLOT_SIZES.reduce((best, value) => (
    Math.abs(value - n) < Math.abs(best - n) ? value : best
  ), BENTO_CUP_SLOT_SIZES[1]);
}

function normalizeBentoSlotPoint(point, kind) {
  const normalized = {
    x: clampBentoMaskNumber(point && point.x, 0, 760, 380, 1),
    y: clampBentoMaskNumber(point && point.y, 0, 460, 230, 1)
  };
  if (Number.isFinite(Number(point && point.size))) {
    normalized.size = normalizeBentoSlotSize(point.size, kind);
  }
  const sampleId = String((point && point.sampleId) || '').trim();
  if (/^[a-z0-9_:-]{1,80}$/i.test(sampleId)) {
    normalized.sampleId = sampleId;
  }
  return normalized;
}

function normalizeBentoSlotLayoutMap(map) {
  const normalized = {};
  if (!map || typeof map !== 'object' || Array.isArray(map)) return normalized;
  Object.keys(map).sort().forEach(boxId => {
    if (!/^[a-z0-9_:-]{1,80}$/i.test(boxId)) return;
    const box = map[boxId];
    if (!box || typeof box !== 'object' || Array.isArray(box)) return;
    const entry = {};
    Object.keys(BENTO_SLOT_LAYOUT_LIMITS).forEach(kind => {
      const list = Array.isArray(box[kind]) ? box[kind] : [];
      const validPoints = list.filter(point => point && typeof point === 'object' && !Array.isArray(point));
      const source = BENTO_SHARED_SLOT_KINDS.has(kind)
        ? validPoints.slice(0, 1)
        : validPoints.slice(0, BENTO_SLOT_LAYOUT_LIMITS[kind]);
      const points = source
        .map(point => normalizeBentoSlotPoint(point, kind));
      if (points.length) entry[kind] = points;
    });
    if (Object.keys(entry).length) normalized[boxId] = entry;
  });
  return normalized;
}

function normalizeBentoNpcPositionsMap(map) {
  const normalized = {};
  if (!map || typeof map !== 'object' || Array.isArray(map)) return normalized;
  Object.keys(map).sort().forEach(key => {
    if (!/^[a-z0-9_:-]{1,100}$/i.test(key)) return;
    const src = map[key];
    if (!src || typeof src !== 'object' || Array.isArray(src)) return;
    const entry = {};
    if (Number.isFinite(Number(src.x))) entry.x = clampBentoMaskNumber(src.x, 0, 100, 58, 1);
    if (Number.isFinite(Number(src.y))) entry.y = clampBentoMaskNumber(src.y, 0, 100, 23, 1);
    if (Number.isFinite(Number(src.scale))) entry.scale = clampBentoMaskNumber(src.scale, 0.5, 2, 1, 2);
    if (Number.isFinite(Number(src.scaleX))) entry.scaleX = clampBentoMaskNumber(src.scaleX, 0.5, 2, 1, 2);
    if (Number.isFinite(Number(src.scaleY))) entry.scaleY = clampBentoMaskNumber(src.scaleY, 0.5, 2, 1, 2);
    if (Number.isFinite(Number(src.rotation))) entry.rotation = clampBentoMaskNumber(src.rotation, -20, 20, 0, 1);
    if (Number.isFinite(Number(src.opacity))) entry.opacity = clampBentoMaskNumber(src.opacity, 0, 1, 1, 2);
    if (Object.keys(entry).length) normalized[key] = entry;
  });
  return normalized;
}

function normalizeBentoCounterMask(mask, defaults) {
  const fallback = defaults || { x: 0, y: 0, width: 100, height: 100, opacity: 1 };
  const src = mask && typeof mask === 'object' && !Array.isArray(mask) ? mask : {};
  const normalized = {
    x: clampBentoMaskNumber(src.x, 0, 100, fallback.x, 1),
    y: clampBentoMaskNumber(src.y, 0, 100, fallback.y, 1),
    width: clampBentoMaskNumber(src.width, 1, 100, fallback.width, 1),
    height: clampBentoMaskNumber(src.height, 1, 100, fallback.height, 1),
    opacity: clampBentoMaskNumber(src.opacity, 0, 1, fallback.opacity, 2)
  };
  if (normalized.x + normalized.width > 100) normalized.width = Math.max(1, roundBentoMaskNumber(100 - normalized.x, fallback.width, 1));
  if (normalized.y + normalized.height > 100) normalized.height = Math.max(1, roundBentoMaskNumber(100 - normalized.y, fallback.height, 1));
  return normalized;
}

async function handleBentoMaskDefaults(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: { ...CORS, ...noStoreHeaders() } });
  }
  if (!env.BENTO_MASK_CONFIG) {
    return json(503, { ok: false, error: 'BENTO_MASK_CONFIG is not configured' }, noStoreHeaders());
  }
  if (request.method === 'GET') {
    try {
      const stored = await env.BENTO_MASK_CONFIG.get(BENTO_MASK_CONFIG_KEY, 'json');
      const npcStored = await env.BENTO_MASK_CONFIG.get(NPC_POSITIONS_CURRENT_KEY, 'json').catch(() => null);
      const base = stored || {
        ok: true,
        exists: false,
        version: 1,
        updatedAt: null,
        maskBounds: {},
        completeLayout: {},
        slotLayout: {}
      };
      const merged = {
        ...base,
        slotLayout: normalizeBentoSlotLayoutMap(base.slotLayout || {}),
        npcPositions: normalizeBentoNpcPositionsMap(npcStored && (npcStored.data || npcStored.npcPositions)),
        npcUpdatedAt: (npcStored && (npcStored.updated_at || npcStored.updatedAt)) || null,
        staffCounterMask: npcStored && npcStored.staffCounterMask
          ? normalizeBentoCounterMask(npcStored.staffCounterMask, { x: 0, y: 44, width: 100, height: 38, opacity: 1 })
          : null,
        customerCounterMask: npcStored && npcStored.customerCounterMask
          ? normalizeBentoCounterMask(npcStored.customerCounterMask, { x: 0, y: 73, width: 100, height: 27, opacity: 1 })
          : null
      };
      return json(200, merged, noStoreHeaders());
    } catch (e) {
      return json(500, { ok: false, error: e.message }, noStoreHeaders());
    }
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { ...CORS, ...noStoreHeaders() } });
  }
  if (!checkBasicAuth(request, env)) return authChallenge();

  let text = '';
  try {
    text = await request.text();
  } catch {
    return json(400, { ok: false, error: 'Invalid request body' }, noStoreHeaders());
  }
  if (text.length > 120000) {
    return json(413, { ok: false, error: 'Payload too large' }, noStoreHeaders());
  }

  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON' }, noStoreHeaders());
  }

  const payload = {
    ok: true,
    exists: true,
    version: 1,
    updatedAt: new Date().toISOString(),
    maskBounds: normalizeBentoMaskBoundsMap(body.maskBounds || body.mask || {}),
    completeLayout: normalizeBentoCompleteLayoutMap(body.completeLayout || body.complete || {}),
    slotLayout: normalizeBentoSlotLayoutMap(body.slotLayout || body.slots || {})
  };

  try {
    await env.BENTO_MASK_CONFIG.put(BENTO_MASK_CONFIG_KEY, JSON.stringify(payload));
    return json(200, payload, noStoreHeaders());
  } catch (e) {
    return json(500, { ok: false, error: e.message }, noStoreHeaders());
  }
}

// ---------------------------------------------------------------------------
// NPC position backup (see admin/index.html npcPosSaveAll).
// LocalStorage is primary; KV (BENTO_MASK_CONFIG namespace, key prefix
// "npc-positions:") is cross-device backup. Restored to localStorage on
// admin load if LS empty. Reuses the existing BENTO_MASK_CONFIG KV binding
// rather than creating a new namespace.
// ---------------------------------------------------------------------------
async function handleBentoNpcPositionsGet(request, env) {
  if (!env.BENTO_MASK_CONFIG) {
    return json(503, { ok: false, error: 'BENTO_MASK_CONFIG is not configured' }, noStoreHeaders());
  }
  try {
    const stored = await env.BENTO_MASK_CONFIG.get(NPC_POSITIONS_CURRENT_KEY, 'json');
    if (!stored) {
      return json(404, { ok: false, error: 'not_found' }, noStoreHeaders());
    }
    return json(200, stored, noStoreHeaders());
  } catch (e) {
    return json(500, { ok: false, error: e.message }, noStoreHeaders());
  }
}

async function handleBentoNpcPositionsPost(request, env) {
  if (!env.BENTO_MASK_CONFIG) {
    return json(503, { ok: false, error: 'BENTO_MASK_CONFIG is not configured' }, noStoreHeaders());
  }

  let text = '';
  try {
    text = await request.text();
  } catch {
    return json(400, { ok: false, error: 'Invalid request body' }, noStoreHeaders());
  }
  if (text.length > 200000) {
    return json(413, { ok: false, error: 'Payload too large' }, noStoreHeaders());
  }

  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON' }, noStoreHeaders());
  }

  if (!body || typeof body !== 'object' || !body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
    return json(400, { ok: false, error: 'data object required' }, noStoreHeaders());
  }

  const updatedAt = new Date().toISOString();
  const payload = {
    data: normalizeBentoNpcPositionsMap(body.data),
    staffCounterMask: body.staffCounterMask
      ? normalizeBentoCounterMask(body.staffCounterMask, { x: 0, y: 44, width: 100, height: 38, opacity: 1 })
      : null,
    customerCounterMask: body.customerCounterMask
      ? normalizeBentoCounterMask(body.customerCounterMask, { x: 0, y: 73, width: 100, height: 27, opacity: 1 })
      : null,
    updated_at: updatedAt
  };
  const serialized = JSON.stringify(payload);

  try {
    await env.BENTO_MASK_CONFIG.put(NPC_POSITIONS_CURRENT_KEY, serialized);
    await env.BENTO_MASK_CONFIG.put(NPC_POSITIONS_HISTORY_PREFIX + updatedAt, serialized);

    // Prune history: keep newest NPC_POSITIONS_HISTORY_MAX entries.
    // Keys are ISO timestamps so lexicographic sort = chronological sort.
    let historyCount = 0;
    try {
      const list = await env.BENTO_MASK_CONFIG.list({ prefix: NPC_POSITIONS_HISTORY_PREFIX });
      const keys = (list && list.keys ? list.keys.map(k => k.name) : []).sort();
      historyCount = keys.length;
      if (historyCount > NPC_POSITIONS_HISTORY_MAX) {
        const excess = keys.slice(0, historyCount - NPC_POSITIONS_HISTORY_MAX);
        for (const k of excess) {
          try { await env.BENTO_MASK_CONFIG.delete(k); } catch {}
        }
        historyCount = NPC_POSITIONS_HISTORY_MAX;
      }
    } catch {
      // history listing best-effort; don't fail save if prune itself errors
    }

    return json(200, { saved: true, history_count: historyCount, updated_at: updatedAt }, noStoreHeaders());
  } catch (e) {
    return json(500, { ok: false, error: e.message }, noStoreHeaders());
  }
}

async function handleAiName(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: CORS });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return json(500, { error: 'GEMINI_API_KEY not configured on server' });

  let body;
  try { body = await request.json(); }
  catch { return new Response('Invalid JSON', { status: 400, headers: CORS }); }

  const prompt = body.prompt;
  if (!prompt) return json(400, { error: 'prompt が必要です' });

  const imageBase64 = body.image;
  const mimeType = body.mimeType || 'image/png';
  const model = body.model || 'gemini-flash-latest';
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/'
    + encodeURIComponent(model)
    + ':generateContent?key=' + encodeURIComponent(apiKey);

  let parts;
  const images = body.images;
  if (images && Array.isArray(images) && images.length > 0) {
    parts = images.map(img => ({ inline_data: { mime_type: img.mimeType || 'image/png', data: img.data } }));
    parts.push({ text: prompt });
  } else if (imageBase64) {
    parts = [{ inline_data: { mime_type: mimeType, data: imageBase64 } }, { text: prompt }];
  } else {
    parts = [{ text: prompt }];
  }

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          maxOutputTokens: 4096
        }
      })
    });
    const data = await resp.json();
    if (!resp.ok) return json(resp.status, { error: 'Gemini API error', details: data });
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      return json(502, { error: 'Invalid Gemini response', details: data });
    }
    const text = data.candidates[0].content.parts[0].text;
    return json(200, { text });
  } catch (e) {
    return json(500, { error: e.message });
  }
}

async function handleAiTts(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: CORS });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_TTS_API_KEY;
  const hasServiceAccount = !!env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!apiKey && !hasServiceAccount) {
    return json(500, {
      error: 'No TTS auth configured. Set GEMINI_API_KEY / GOOGLE_TTS_API_KEY / GOOGLE_SERVICE_ACCOUNT_JSON.',
    });
  }

  const adminSecret = env.TTS_ADMIN_SECRET;
  if (adminSecret) {
    const provided = request.headers.get('x-admin-secret') || '';
    if (provided !== adminSecret) return json(401, { error: 'Unauthorized' });
  }

  let body;
  try { body = await request.json(); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  if (body.mode === 'list-voices') {
    const listKey = env.GOOGLE_TTS_API_KEY || apiKey;
    if (!listKey) {
      return json(501, { error: 'list-voices requires GEMINI_API_KEY or GOOGLE_TTS_API_KEY (OAuth2-only env not supported for this mode).' });
    }
    const lang = body.languageCode || 'ja-JP';
    const listUrl = 'https://texttospeech.googleapis.com/v1/voices?languageCode='
      + encodeURIComponent(lang) + '&key='
      + encodeURIComponent(listKey);
    try {
      const lr = await fetch(listUrl);
      const ld = await lr.json();
      return json(lr.status, ld);
    } catch (e) { return json(500, { error: e.message }); }
  }

  const text = (body.text || '').toString().trim();
  if (!text) return json(400, { error: 'text が必要です' });
  if (text.length > 2000) return json(400, { error: 'text が長すぎます（2000字まで）' });

  const ALLOWED_VOICES = [
    'Leda', 'Aoede', 'Callirrhoe', 'Despina', 'Autonoe',
    'Zephyr', 'Puck', 'Orus', 'Kore', 'Charon', 'Fenrir',
    'Iapetus', 'Umbriel', 'Algieba', 'Erinome', 'Enceladus'
  ];
  const LEGACY_VOICE_MAP = {
    'ja-JP-Neural2-B':  'Leda',
    'ja-JP-Neural2-C':  'Puck',
    'ja-JP-Neural2-D':  'Kore',
    'ja-JP-Wavenet-A':  'Zephyr',
    'ja-JP-Wavenet-B':  'Aoede',
    'ja-JP-Wavenet-C':  'Orus',
    'ja-JP-Wavenet-D':  'Charon',
    'ja-JP-Standard-A': 'Despina',
    'ja-JP-Standard-B': 'Callirrhoe',
    'ja-JP-Standard-C': 'Puck',
    'ja-JP-Standard-D': 'Kore'
  };
  const DEFAULT_VOICE = 'Leda';
  const rawVoice = body.voice || DEFAULT_VOICE;
  let voice = LEGACY_VOICE_MAP[rawVoice] || rawVoice;
  if (ALLOWED_VOICES.indexOf(voice) === -1) voice = DEFAULT_VOICE;

  const ALLOWED_STYLES = ['[gently]', '[cheerfully]', '[excitedly]', '[giggles]', '[whispers]', ''];
  let style = (typeof body.stylePrompt === 'string') ? body.stylePrompt.trim() : '[gently]';
  if (ALLOWED_STYLES.indexOf(style) === -1) style = '[gently]';
  const promptText = (typeof body.promptText === 'string') ? body.promptText.trim() : '';
  if (promptText.length > 3000) return json(400, { error: 'promptText が長すぎます（3000字まで）' });
  const styledText = promptText || (style ? (style + ' ' + text) : text);

  const MODEL_PRIMARY  = body.modelOverride || 'gemini-3.1-flash-tts-preview';
  const MODEL_FALLBACK = 'gemini-2.5-flash-preview-tts';

  const SAFETY_OFF = [
    { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_CIVIC_INTEGRITY',   threshold: 'BLOCK_NONE' }
  ];

  const payload = {
    contents: [{ parts: [{ text: styledText }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
      }
    },
    safetySettings: SAFETY_OFF
  };

  async function callModel(modelId, customPayload) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelId
      + ':generateContent?key=' + encodeURIComponent(apiKey);
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customPayload || payload)
    });
    const data = await resp.json();
    const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    const audioPart = parts && parts.find(p => p && p.inlineData && p.inlineData.data);
    const finishReason = data && data.candidates && data.candidates[0] && data.candidates[0].finishReason;
    const blockReason = data && data.promptFeedback && data.promptFeedback.blockReason;
    return { resp, data, audioPart, finishReason, blockReason };
  }

  const CHIRP3_AVAILABLE = {
    Leda:1,Aoede:1,Callirrhoe:1,Despina:1,Autonoe:1,Zephyr:1,Erinome:1,
    Puck:1,Orus:1,Kore:1,Charon:1,Fenrir:1,Iapetus:1,Umbriel:1,Algieba:1,Enceladus:1
  };
  // Cloud TTS は API key 認証を 2025 末に廃止し、 OAuth2 access token 必須に。
  // GOOGLE_SERVICE_ACCOUNT_JSON secret から JWT 署名 → access token 交換 (google-auth.js)、
  // 取得できなければ後方互換で旧 ?key= 経路 (Cloud TTS は 401 を返す想定だが secret 登録前は壊れたまま運用可)。
  async function cloudTtsAuth() {
    let token = null;
    try {
      token = await getGoogleAccessToken(env);
    } catch (e) {
      console.warn('getGoogleAccessToken failed:', e && e.message);
      token = null;
    }
    if (token) {
      return { authMode: 'oauth2', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, urlSuffix: '' };
    }
    const cloudKey = env.GOOGLE_TTS_API_KEY || apiKey;
    if (cloudKey) {
      return { authMode: 'api_key', headers: { 'Content-Type': 'application/json' }, urlSuffix: '?key=' + encodeURIComponent(cloudKey) };
    }
    return { authMode: 'none', headers: { 'Content-Type': 'application/json' }, urlSuffix: '' };
  }

  async function callChirp3(geminiVoice) {
    const cloudVoice = CHIRP3_AVAILABLE[geminiVoice] ? ('ja-JP-Chirp3-HD-' + geminiVoice) : 'ja-JP-Chirp3-HD-Leda';
    const auth = await cloudTtsAuth();
    const url = 'https://texttospeech.googleapis.com/v1/text:synthesize' + auth.urlSuffix;
    const resp = await fetch(url, {
      method: 'POST', headers: auth.headers,
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ja-JP', name: cloudVoice },
        audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 }
      })
    });
    const data = await resp.json();
    return { resp, data, cloudVoice, authMode: auth.authMode };
  }
  async function callCloudNeural2(geminiVoice) {
    const NEURAL2_MAP = {
      Leda:'ja-JP-Neural2-B',Aoede:'ja-JP-Neural2-B',Callirrhoe:'ja-JP-Neural2-B',
      Despina:'ja-JP-Neural2-B',Autonoe:'ja-JP-Neural2-B',Zephyr:'ja-JP-Neural2-B',
      Puck:'ja-JP-Neural2-C',Orus:'ja-JP-Neural2-C',
      Kore:'ja-JP-Neural2-D',Charon:'ja-JP-Neural2-D',Fenrir:'ja-JP-Neural2-D'
    };
    const cloudVoice = NEURAL2_MAP[geminiVoice] || 'ja-JP-Neural2-B';
    const auth = await cloudTtsAuth();
    const url = 'https://texttospeech.googleapis.com/v1/text:synthesize' + auth.urlSuffix;
    const resp = await fetch(url, {
      method: 'POST', headers: auth.headers,
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ja-JP', name: cloudVoice },
        audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000, speakingRate: 1.0, pitch: 1.0 }
      })
    });
    const data = await resp.json();
    return { resp, data, cloudVoice, authMode: auth.authMode };
  }

  const isBlockedOrEmpty = r => !r.audioPart;

  try {
    const attemptChain = [];

    if (body.engine === 'chirp3') {
      const chirpDirect = await callChirp3(voice);
      attemptChain.push({ model: 'chirp3-hd', authMode: chirpDirect.authMode, status: chirpDirect.resp.status, err: (chirpDirect.data && chirpDirect.data.error && chirpDirect.data.error.message) || null });
      if (chirpDirect.resp.ok && chirpDirect.data && chirpDirect.data.audioContent) {
        return json(200, {
          audio: chirpDirect.data.audioContent, mime: 'audio/wav',
          voice: chirpDirect.cloudVoice, chars: text.length,
          model: 'chirp3-hd', fallbackUsed: false,
          attemptChain, sampleRate: 24000
        });
      }
      return json(502, { error: (chirpDirect.data && chirpDirect.data.error && chirpDirect.data.error.message) || 'Chirp 3: HD error', attemptChain });
    }

    let result;
    let modelUsed = MODEL_PRIMARY;
    if (apiKey) {
      result = await callModel(MODEL_PRIMARY);
      attemptChain.push({ model: MODEL_PRIMARY, fr: result.finishReason, br: result.blockReason, hasAudio: !!result.audioPart });

      if (isBlockedOrEmpty(result) && MODEL_PRIMARY !== MODEL_FALLBACK) {
        result = await callModel(MODEL_FALLBACK);
        attemptChain.push({ model: MODEL_FALLBACK, fr: result.finishReason, br: result.blockReason, hasAudio: !!result.audioPart });
        modelUsed = MODEL_FALLBACK;
      }
    } else {
      // No Gemini key — skip Gemini entirely and fall through to Cloud TTS (OAuth2) chirp3/neural2.
      result = { resp: { ok: false, status: 502 }, data: null, audioPart: null, finishReason: 'SKIPPED', blockReason: 'no_gemini_api_key' };
      attemptChain.push({ model: MODEL_PRIMARY, skipped: 'no_gemini_api_key' });
    }

    if (isBlockedOrEmpty(result)) {
      const chirpResult = await callChirp3(voice);
      if (chirpResult.resp.ok && chirpResult.data && chirpResult.data.audioContent) {
        return json(200, {
          audio: chirpResult.data.audioContent, mime: 'audio/wav',
          voice: chirpResult.cloudVoice, chars: text.length,
          model: 'chirp3-hd', fallbackUsed: true,
          attemptChain, sampleRate: 24000
        });
      }
      attemptChain.push({ model: 'chirp3-hd', authMode: chirpResult.authMode, status: chirpResult.resp.status, err: (chirpResult.data && chirpResult.data.error && chirpResult.data.error.message) || null });

      const neuralResult = await callCloudNeural2(voice);
      if (neuralResult.resp.ok && neuralResult.data && neuralResult.data.audioContent) {
        return json(200, {
          audio: neuralResult.data.audioContent, mime: 'audio/wav',
          voice: neuralResult.cloudVoice, chars: text.length,
          model: 'cloud-tts-neural2', fallbackUsed: true,
          attemptChain, sampleRate: 24000
        });
      }
      attemptChain.push({ model: 'cloud-tts-neural2', authMode: neuralResult.authMode, status: neuralResult.resp.status, err: (neuralResult.data && neuralResult.data.error && neuralResult.data.error.message) || null });
    }

    if (!result.resp.ok) {
      const skippedGemini = !apiKey;
      const safeMsg = skippedGemini
        ? 'Cloud TTS fallback failed (Gemini skipped: no API key)'
        : (result.data && result.data.error && result.data.error.message) || 'Gemini TTS API error';
      return json(result.resp.status >= 500 ? 502 : result.resp.status, { error: safeMsg, attemptChain });
    }
    if (!result.audioPart) {
      return json(502, {
        error: 'No audio in Gemini TTS response',
        debug: { modelTried: modelUsed, finishReason: result.finishReason, blockReason: result.blockReason, attemptChain }
      });
    }

    const pcmB64 = result.audioPart.inlineData.data;
    const wavB64 = wrapPcmToWavB64(pcmB64, 24000, 1, 16);

    return json(200, {
      audio: wavB64, mime: 'audio/wav',
      voice, chars: text.length,
      model: modelUsed, fallbackUsed: modelUsed !== MODEL_PRIMARY,
      attemptChain, sampleRate: 24000
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
}

// 2026-05-10: handleGhProxy はもともと /api/gh/* を完全透過プロキシだったため、
// 認証済 user (Basic Auth pass を知る人) が GitHub の任意エンドポイント
// (refs/heads/main の force-push、 actions/secrets/* の書込、 user 情報取得 等)
// を叩けてしまっていた。 path allowlist でアプリが実際に必要とする範囲に限定する。
//
// 既存ユースケース (= allowlist で必ずカバーが必要) ─────────────────────────
//   layout-system (saved-layout.json):
//     quizland/saved-layout.json
//     quizland/preview/full/saved-layout.json
//     zukan/preview/full/saved-layout.json
//     zukan/preview/investigation/saved-layout.json
//   quizland editor playtest:
//     quizland/data/_review/playtest_notes.json
//     quizland/data/_review/playtest_screenshots/<file>
//   layout-editor stage image (今回追加):
//     assets/images/<...>/<file>.{png,jpe?g,webp}
//   admin/index.html / creature_studio:
//     assets/data/{rewards,creatures,staging,quiz-sound-animals}.json
//     assets/tts/manifest.json + assets/tts/<file>
//     assets/images/{Bento_parts,Rooms/walls,Rooms/floors,Rooms/furnitures_final,
//                    quiz-sound,staging,ocean,word,ai-generated,...}/<...>
//     room/items.js + room/index.html
//     quizland/data/questions.js
//   maze-editor / maze-rough:
//     maze/imageStages/_index.json + maze/imageStages/<name>.{json,jpg,png}
//   admin connection test:
//     /repos/<owner>/<repo>            (repo info; GET only)
//     /repos/<owner>/<repo>/contents/<dir>  (folder listing)
// 書込許可パターン (PUT / DELETE / POST 用)。 GET と書込で同一範囲。
const ALLOWED_GH_PATTERNS = [
  // saved-layout.json (LayoutSystem 配下、 quizland/zukan 等)
  /^\/repos\/[^/]+\/[^/]+\/contents\/(?:[A-Za-z0-9%_./-]+\/)?saved-layout\.json$/,
  // quizland 関連 (questions.js / _review / playtest_screenshots 等)
  /^\/repos\/[^/]+\/[^/]+\/contents\/quizland\/[A-Za-z0-9%_./-]+$/,
  // maze image stages (_index.json + 各ステージの json/jpg/png)
  /^\/repos\/[^/]+\/[^/]+\/contents\/maze\/imageStages(?:\/[A-Za-z0-9%_./-]+)?$/,
  // maze OP layout (maze-op-editor.html が PUT)
  /^\/repos\/[^/]+\/[^/]+\/contents\/maze\/op-layout\.json$/,
  // assets 配下: data (JSON) / tts / images / sounds
  /^\/repos\/[^/]+\/[^/]+\/contents\/assets\/data\/[A-Za-z0-9%_.-]+\.json$/,
  /^\/repos\/[^/]+\/[^/]+\/contents\/assets\/tts(?:\/[A-Za-z0-9%_./-]+)?$/,
  /^\/repos\/[^/]+\/[^/]+\/contents\/assets\/images\/[A-Za-z0-9%_./-]+$/,
  /^\/repos\/[^/]+\/[^/]+\/contents\/assets\/sounds\/[A-Za-z0-9%_./-]+$/,
  // room/ (items.js / index.html / 配下)
  /^\/repos\/[^/]+\/[^/]+\/contents\/room\/[A-Za-z0-9%_./-]+$/,
];

// 接続テスト等の GET 専用エンドポイント。 admin/index.html の「PAT 接続テスト」が
// /repos/<owner>/<repo> を直接叩くので、 GET (および HEAD) のみ許可する。
const ALLOWED_GH_GET_ONLY_PATTERNS = [
  /^\/repos\/[^/]+\/[^/]+$/,
];

// 2026-05-10: HIGH 2 修正 — `*` で許す代わりに既知 origin のみ反射。
// `credentials: 'include'` 経路はブラウザが `*` をブロックするので
// 主に curl / 非ブラウザによる濫用対策 (二重防御)。
const ALLOWED_GH_ORIGINS = [
  'https://pono-asobiba-staging.ndw.workers.dev',
  'https://pono-asobiba-app-staging.ndw.workers.dev',
  'https://pono-asobiba-app.ndw.workers.dev',
  'https://pono.kodama-no-mori.com',
  'http://localhost:8788',
  'http://127.0.0.1:8788',
];

function corsAllowedOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  return ALLOWED_GH_ORIGINS.indexOf(origin) >= 0 ? origin : 'null';
}

async function handleGhProxy(request, env) {
  const url = new URL(request.url);
  const ghPath = url.pathname.replace(/^\/api\/gh/, '');
  if (!env.GITHUB_TOKEN) return json(500, { error: 'GITHUB_TOKEN not configured on server' });

  // Path traversal guard — `..` を URL に通すと assets/images/../../foo を叩ける。
  // 念のため normalize して比較する。
  if (ghPath.indexOf('..') >= 0) {
    return new Response(JSON.stringify({ error: 'Path traversal blocked', path: ghPath }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsAllowedOrigin(request),
      },
    });
  }

  // Encoded path traversal guard — `%` を ALLOWED_GH_PATTERNS の文字クラスに加えた副作用で
  // `%2E%2E` (encoded `..`) や `%00` (NUL injection) が allowlist を素通りするので追加で塞ぐ。
  if (/%2[eE]%2[eE]/.test(ghPath) || /%00/i.test(ghPath)) {
    return new Response(JSON.stringify({ error: 'Encoded path traversal blocked', path: ghPath }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsAllowedOrigin(request),
      },
    });
  }

  // Allowlist 検査 — 既存機能 (saved-layout / playtest / 画像 PUT / admin / maze) を
  // カバーしつつ、 refs/heads/* や actions/secrets/* 等の危険エンドポイントを弾く。
  const method = request.method;
  const isReadOnly = method === 'GET' || method === 'HEAD';
  const isAllowedWrite = ALLOWED_GH_PATTERNS.some(p => p.test(ghPath));
  const isAllowedReadOnly = isReadOnly
    && ALLOWED_GH_GET_ONLY_PATTERNS.some(p => p.test(ghPath));
  if (!isAllowedWrite && !isAllowedReadOnly) {
    return new Response(JSON.stringify({ error: 'Path not allowed by gh proxy', path: ghPath, method }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsAllowedOrigin(request),
      },
    });
  }

  const ghUrl = 'https://api.github.com' + ghPath + url.search;
  const headers = {
    'Authorization': 'Bearer ' + env.GITHUB_TOKEN,
    'Accept': request.headers.get('Accept') || 'application/vnd.github+json',
    'User-Agent': 'pono-asobiba-app',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  const ct = request.headers.get('Content-Type');
  if (ct) headers['Content-Type'] = ct;

  const body = (request.method === 'GET' || request.method === 'HEAD')
    ? null
    : await request.arrayBuffer();

  try {
    const resp = await fetch(ghUrl, { method: request.method, headers, body });
    const respBody = await resp.arrayBuffer();
    const respHeaders = {
      'Content-Type': resp.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': corsAllowedOrigin(request),
      'Vary': 'Origin'
    };
    return new Response(respBody, { status: resp.status, headers: respHeaders });
  } catch (e) {
    return json(502, { error: 'GitHub proxy error: ' + e.message });
  }
}

async function handleGeminiProxy(request, env) {
  const url = new URL(request.url);
  const geminiPath = url.pathname.replace(/^\/api\/gemini/, '');
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return json(500, { error: 'GEMINI_API_KEY not configured on server' });

  const searchParams = new URLSearchParams(url.search);
  searchParams.delete('key');
  searchParams.set('key', apiKey);
  const geminiUrl = 'https://generativelanguage.googleapis.com' + geminiPath + '?' + searchParams.toString();

  const headers = { 'Content-Type': request.headers.get('Content-Type') || 'application/json' };
  const body = (request.method === 'GET' || request.method === 'HEAD')
    ? null
    : await request.arrayBuffer();

  try {
    const resp = await fetch(geminiUrl, { method: request.method, headers, body });
    const respBody = await resp.arrayBuffer();
    return new Response(respBody, {
      status: resp.status,
      headers: {
        'Content-Type': resp.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return json(502, { error: 'Gemini proxy error: ' + e.message });
  }
}

function wrapPcmToWavB64(pcmB64, sampleRate, channels, bitsPerSample) {
  const pcm = Buffer.from(pcmB64, 'base64');
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]).toString('base64');
}
