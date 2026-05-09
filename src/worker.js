// Cloudflare Worker entry point
// - Static assets: served via ASSETS binding (wrangler.toml [assets])
// - API: /.netlify/functions/ai-name  -> Gemini Vision proxy (handleAiName)
//        /.netlify/functions/ai-tts   -> Gemini TTS proxy + fallbacks (handleAiTts)
//   Legacy /.netlify/functions/* paths are kept so existing frontend calls work unchanged.

import { Buffer } from 'node:buffer';

const PROTECTED_PREFIXES = [
  '/admin/',
  '/admin',
  '/tools/',
  '/tools',
  '/room/furniture_adjuster',
  '/room/yard_adjuster'
];

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
    return applyCacheHeaders(request, response);
  }
};

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
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(status, obj, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...(extraHeaders || {}) }
  });
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
  if (!apiKey) return json(500, { error: 'GEMINI_API_KEY not configured on server' });

  const adminSecret = env.TTS_ADMIN_SECRET;
  if (adminSecret) {
    const provided = request.headers.get('x-admin-secret') || '';
    if (provided !== adminSecret) return json(401, { error: 'Unauthorized' });
  }

  let body;
  try { body = await request.json(); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  if (body.mode === 'list-voices') {
    const lang = body.languageCode || 'ja-JP';
    const listUrl = 'https://texttospeech.googleapis.com/v1/voices?languageCode='
      + encodeURIComponent(lang) + '&key='
      + encodeURIComponent(env.GOOGLE_TTS_API_KEY || apiKey);
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
  const styledText = style ? (style + ' ' + text) : text;

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
  async function callChirp3(geminiVoice) {
    const cloudVoice = CHIRP3_AVAILABLE[geminiVoice] ? ('ja-JP-Chirp3-HD-' + geminiVoice) : 'ja-JP-Chirp3-HD-Leda';
    const cloudKey = env.GOOGLE_TTS_API_KEY || apiKey;
    const url = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(cloudKey);
    const resp = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ja-JP', name: cloudVoice },
        audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 }
      })
    });
    const data = await resp.json();
    return { resp, data, cloudVoice };
  }
  async function callCloudNeural2(geminiVoice) {
    const NEURAL2_MAP = {
      Leda:'ja-JP-Neural2-B',Aoede:'ja-JP-Neural2-B',Callirrhoe:'ja-JP-Neural2-B',
      Despina:'ja-JP-Neural2-B',Autonoe:'ja-JP-Neural2-B',Zephyr:'ja-JP-Neural2-B',
      Puck:'ja-JP-Neural2-C',Orus:'ja-JP-Neural2-C',
      Kore:'ja-JP-Neural2-D',Charon:'ja-JP-Neural2-D',Fenrir:'ja-JP-Neural2-D'
    };
    const cloudVoice = NEURAL2_MAP[geminiVoice] || 'ja-JP-Neural2-B';
    const cloudKey = env.GOOGLE_TTS_API_KEY || apiKey;
    const url = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(cloudKey);
    const resp = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ja-JP', name: cloudVoice },
        audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000, speakingRate: 1.0, pitch: 1.0 }
      })
    });
    const data = await resp.json();
    return { resp, data, cloudVoice };
  }

  const isBlockedOrEmpty = r => !r.audioPart;

  try {
    const attemptChain = [];

    if (body.engine === 'chirp3') {
      const chirpDirect = await callChirp3(voice);
      attemptChain.push({ model: 'chirp3-hd', status: chirpDirect.resp.status, err: (chirpDirect.data && chirpDirect.data.error && chirpDirect.data.error.message) || null });
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

    let result = await callModel(MODEL_PRIMARY);
    attemptChain.push({ model: MODEL_PRIMARY, fr: result.finishReason, br: result.blockReason, hasAudio: !!result.audioPart });
    let modelUsed = MODEL_PRIMARY;

    if (isBlockedOrEmpty(result) && MODEL_PRIMARY !== MODEL_FALLBACK) {
      result = await callModel(MODEL_FALLBACK);
      attemptChain.push({ model: MODEL_FALLBACK, fr: result.finishReason, br: result.blockReason, hasAudio: !!result.audioPart });
      modelUsed = MODEL_FALLBACK;
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
      attemptChain.push({ model: 'chirp3-hd', status: chirpResult.resp.status, err: (chirpResult.data && chirpResult.data.error && chirpResult.data.error.message) || null });

      const neuralResult = await callCloudNeural2(voice);
      if (neuralResult.resp.ok && neuralResult.data && neuralResult.data.audioContent) {
        return json(200, {
          audio: neuralResult.data.audioContent, mime: 'audio/wav',
          voice: neuralResult.cloudVoice, chars: text.length,
          model: 'cloud-tts-neural2', fallbackUsed: true,
          attemptChain, sampleRate: 24000
        });
      }
      attemptChain.push({ model: 'cloud-tts-neural2', status: neuralResult.resp.status, err: (neuralResult.data && neuralResult.data.error && neuralResult.data.error.message) || null });
    }

    if (!result.resp.ok) {
      const safeMsg = (result.data && result.data.error && result.data.error.message) || 'Gemini TTS API error';
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
  /^\/repos\/[^/]+\/[^/]+\/contents\/(?:[A-Za-z0-9_./-]+\/)?saved-layout\.json$/,
  // quizland 関連 (questions.js / _review / playtest_screenshots 等)
  /^\/repos\/[^/]+\/[^/]+\/contents\/quizland\/[A-Za-z0-9_./-]+$/,
  // maze image stages (_index.json + 各ステージの json/jpg/png)
  /^\/repos\/[^/]+\/[^/]+\/contents\/maze\/imageStages(?:\/[A-Za-z0-9_./-]+)?$/,
  // assets 配下: data (JSON) / tts / images / sounds
  /^\/repos\/[^/]+\/[^/]+\/contents\/assets\/data\/[A-Za-z0-9_.-]+\.json$/,
  /^\/repos\/[^/]+\/[^/]+\/contents\/assets\/tts(?:\/[A-Za-z0-9_./-]+)?$/,
  /^\/repos\/[^/]+\/[^/]+\/contents\/assets\/images\/[A-Za-z0-9_./-]+$/,
  /^\/repos\/[^/]+\/[^/]+\/contents\/assets\/sounds\/[A-Za-z0-9_./-]+$/,
  // room/ (items.js / index.html / 配下)
  /^\/repos\/[^/]+\/[^/]+\/contents\/room\/[A-Za-z0-9_./-]+$/,
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
