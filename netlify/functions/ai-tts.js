// Netlify Function: Gemini 3.1 Flash TTS プロキシ
// 環境変数 (優先順):
//   1. GEMINI_API_KEY       — Gemini API キー（必須）
//   2. GOOGLE_TTS_API_KEY   — Cloud TTS 用キー（保険・現状は未使用）
//
// リクエスト (POST application/json):
//   { text: "読み上げるテキスト",
//     voice?: "Leda" | "Aoede" | ... (Gemini 30 prebuilt voice、旧 Cloud TTS 名も legacy map で受理),
//     stylePrompt?: "[gently]" | "[cheerfully]" | "[excitedly]" | "",
//     model?: (無視される、後方互換のみ) }
//
// レスポンス (200):
//   { audio: "<base64 WAV>",
//     mime:  "audio/wav",
//     voice: "Leda",
//     chars: 12,
//     model: "gemini-3.1-flash-tts-preview",
//     sampleRate: 24000 }

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  var apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    return jsonResp(500, { error: 'GEMINI_API_KEY not configured on server' });
  }

  var adminSecret = process.env.TTS_ADMIN_SECRET;
  if (adminSecret) {
    var provided = (event.headers && (event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'])) || '';
    if (provided !== adminSecret) {
      return jsonResp(401, { error: 'Unauthorized' });
    }
  }

  var body;
  try { body = JSON.parse(event.body || '{}'); }
  catch(e) { return jsonResp(400, { error: 'Invalid JSON' }); }

  var text = (body.text || '').toString().trim();
  if (!text) return jsonResp(400, { error: 'text が必要です' });
  if (text.length > 2000) return jsonResp(400, { error: 'text が長すぎます（2000字まで）' });

  // voice 解決: Gemini prebuilt voice allowlist + 旧 Cloud TTS 名の legacy map
  var ALLOWED_VOICES = [
    'Leda', 'Aoede', 'Callirrhoe', 'Despina', 'Autonoe',
    'Zephyr', 'Puck', 'Orus', 'Kore', 'Charon', 'Fenrir',
    'Iapetus', 'Umbriel', 'Algieba', 'Erinome', 'Enceladus'
  ];
  // 旧 Cloud TTS ja-JP voice → Gemini voice への最良マッピング
  var LEGACY_VOICE_MAP = {
    'ja-JP-Neural2-B':   'Leda',       // female, default
    'ja-JP-Neural2-C':   'Puck',       // male bright
    'ja-JP-Neural2-D':   'Kore',       // male deep
    'ja-JP-Wavenet-A':   'Zephyr',     // female variant
    'ja-JP-Wavenet-B':   'Aoede',      // female variant
    'ja-JP-Wavenet-C':   'Orus',       // male variant
    'ja-JP-Wavenet-D':   'Charon',     // male variant
    'ja-JP-Standard-A':  'Despina',
    'ja-JP-Standard-B':  'Callirrhoe',
    'ja-JP-Standard-C':  'Puck',
    'ja-JP-Standard-D':  'Kore'
  };
  var DEFAULT_VOICE = 'Leda';
  var rawVoice = body.voice || DEFAULT_VOICE;
  var voice = LEGACY_VOICE_MAP[rawVoice] || rawVoice;
  if (ALLOWED_VOICES.indexOf(voice) === -1) voice = DEFAULT_VOICE;

  // Audio Tag (stylePrompt) 解決
  var ALLOWED_STYLES = ['[gently]', '[cheerfully]', '[excitedly]', '[giggles]', '[whispers]', ''];
  var style = (typeof body.stylePrompt === 'string') ? body.stylePrompt.trim() : '[gently]';
  if (ALLOWED_STYLES.indexOf(style) === -1) style = '[gently]';
  var styledText = style ? (style + ' ' + text) : text;

  // Gemini 3.1 Flash TTS Preview は現状 PROHIBITED_CONTENT を日本語の無害文で誤検出することがあるため、
  // 3.1 でブロックされたら 2.5 Flash Preview TTS へ自動フォールバック
  var MODEL_PRIMARY  = body.modelOverride || 'gemini-3.1-flash-tts-preview';
  var MODEL_FALLBACK = 'gemini-2.5-flash-preview-tts';

  // 子供向けテキストなのに safety filter が過剰反応するため BLOCK_NONE を指定
  var SAFETY_OFF = [
    { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_CIVIC_INTEGRITY',   threshold: 'BLOCK_NONE' }
  ];

  // Note: Gemini TTS モデルは systemInstruction 非対応（400: "Developer instruction is not enabled"）
  // 代わりに Audio Tag と、必要なら短すぎる日本語にパディング prefix を付ける
  var payload = {
    contents: [{ parts: [{ text: styledText }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice }
        }
      }
    },
    safetySettings: SAFETY_OFF
  };

  async function callModel(modelId, customPayload) {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelId + ':generateContent?key=' + encodeURIComponent(apiKey);
    var resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customPayload || payload)
    });
    var data = await resp.json();
    var parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    var audioPart = parts && parts.find(function(p){ return p && p.inlineData && p.inlineData.data; });
    var finishReason = data && data.candidates && data.candidates[0] && data.candidates[0].finishReason;
    var blockReason = data && data.promptFeedback && data.promptFeedback.blockReason;
    return { resp: resp, data: data, audioPart: audioPart, finishReason: finishReason, blockReason: blockReason };
  }

  // Google Cloud TTS への最終フォールバック（Gemini TTS プレビュー不安定時）
  // Gemini voice 名 → Cloud TTS ja-JP voice 名への逆マッピング
  var GEMINI_TO_CLOUD_VOICE = {
    'Leda': 'ja-JP-Neural2-B', 'Aoede': 'ja-JP-Wavenet-B', 'Callirrhoe': 'ja-JP-Standard-B',
    'Despina': 'ja-JP-Standard-A', 'Autonoe': 'ja-JP-Neural2-B',
    'Zephyr': 'ja-JP-Wavenet-A',
    'Puck': 'ja-JP-Neural2-C', 'Orus': 'ja-JP-Wavenet-C',
    'Kore': 'ja-JP-Neural2-D', 'Charon': 'ja-JP-Wavenet-D', 'Fenrir': 'ja-JP-Wavenet-C'
  };
  async function callCloudTts(geminiVoice) {
    var cloudVoice = GEMINI_TO_CLOUD_VOICE[geminiVoice] || 'ja-JP-Neural2-B';
    var cloudKey = process.env.GOOGLE_TTS_API_KEY || apiKey;
    var url = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(cloudKey);
    var payload2 = {
      input: { text: text },   // Cloud TTS は audio tag 未対応なので plain text
      voice: { languageCode: 'ja-JP', name: cloudVoice },
      audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000, speakingRate: 1.0, pitch: 1.0 }
    };
    var resp = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload2)
    });
    var data = await resp.json();
    return { resp: resp, data: data, cloudVoice: cloudVoice };
  }

  function isBlockedOrEmpty(r) {
    // audio が取れなかった全ケースで次モデルへ（400/500系含む）
    return !r.audioPart;
  }

  try {
    var attemptChain = [];
    var result = await callModel(MODEL_PRIMARY);
    attemptChain.push({ model: MODEL_PRIMARY, fr: result.finishReason, br: result.blockReason, hasAudio: !!result.audioPart });
    var modelUsed = MODEL_PRIMARY;

    // 1段目フォールバック: Gemini 3.1 → 2.5
    if (isBlockedOrEmpty(result) && MODEL_PRIMARY !== MODEL_FALLBACK) {
      result = await callModel(MODEL_FALLBACK);
      attemptChain.push({ model: MODEL_FALLBACK, fr: result.finishReason, br: result.blockReason, hasAudio: !!result.audioPart });
      modelUsed = MODEL_FALLBACK;
    }

    // 2段目フォールバック: Gemini 全滅 → Cloud TTS
    if (isBlockedOrEmpty(result)) {
      var cloudResult = await callCloudTts(voice);
      if (cloudResult.resp.ok && cloudResult.data && cloudResult.data.audioContent) {
        return jsonResp(200, {
          audio: cloudResult.data.audioContent,   // Cloud TTS は WAV ヘッダ付きで返る
          mime: 'audio/wav',
          voice: cloudResult.cloudVoice,
          chars: text.length,
          model: 'cloud-tts',
          fallbackUsed: true,
          attemptChain: attemptChain,
          sampleRate: 24000
        });
      }
      attemptChain.push({ model: 'cloud-tts', status: cloudResult.resp.status, err: (cloudResult.data && cloudResult.data.error && cloudResult.data.error.message) || null });
    }

    if (!result.resp.ok) {
      var safeMsg = (result.data && result.data.error && result.data.error.message) || 'Gemini TTS API error';
      return jsonResp(result.resp.status >= 500 ? 502 : result.resp.status, { error: safeMsg, attemptChain: attemptChain });
    }

    if (!result.audioPart) {
      return jsonResp(502, {
        error: 'No audio in Gemini TTS response',
        debug: { modelTried: modelUsed, finishReason: result.finishReason, blockReason: result.blockReason, attemptChain: attemptChain }
      });
    }

    var pcmB64 = result.audioPart.inlineData.data;
    var wavB64 = wrapPcmToWavB64(pcmB64, 24000, 1, 16);

    return jsonResp(200, {
      audio: wavB64,
      mime: 'audio/wav',
      voice: voice,
      chars: text.length,
      model: modelUsed,
      fallbackUsed: modelUsed !== MODEL_PRIMARY,
      attemptChain: attemptChain,
      sampleRate: 24000
    });
  } catch (e) {
    return jsonResp(500, { error: e.message });
  }
};

function wrapPcmToWavB64(pcmB64, sampleRate, channels, bitsPerSample) {
  var pcm = Buffer.from(pcmB64, 'base64');
  var byteRate = sampleRate * channels * bitsPerSample / 8;
  var blockAlign = channels * bitsPerSample / 8;
  var header = Buffer.alloc(44);
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

function jsonResp(status, obj) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(obj)
  };
}
