// Netlify Function: Gemini 2.5 Flash TTS プロキシ
// 環境変数: GEMINI_API_KEY を Netlify ダッシュボードで設定（ai-name.js と共用）
//
// リクエスト (POST application/json):
//   { text: "読み上げるテキスト",
//     voice?: "Leda" | "Kore" | "Puck" | "Charon" | "Aoede" | ...,
//     stylePrompt?: "明るく元気な子供向けナレーターのように: ",
//     model?: "gemini-2.5-flash-preview-tts" }
//
// レスポンス (200):
//   { audio: "<base64 WAV>",
//     mime:  "audio/wav",
//     voice: "Leda",
//     chars: 12,
//     model: "gemini-2.5-flash-preview-tts" }

exports.handler = async function(event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  var apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResp(500, { error: 'GEMINI_API_KEY not configured on server' });
  }

  // 任意: TTS_ADMIN_SECRET 環境変数が設定されていれば一致必須（quota abuse 防止）
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

  // voice allowlist（Gemini prebuilt voices）
  var ALLOWED_VOICES = ['Leda','Kore','Puck','Charon','Aoede','Zephyr','Fenrir','Orus','Callirrhoe','Despina'];
  var voice = body.voice || 'Leda';
  if (ALLOWED_VOICES.indexOf(voice) === -1) voice = 'Leda';

  var stylePrompt = typeof body.stylePrompt === 'string' ? body.stylePrompt.slice(0, 300) : '';
  var defaultStyle = '5歳の子供向けに、ひらがな表記に忠実に、やさしくはっきり自然な速さで読んでください: ';
  var finalText = (stylePrompt || defaultStyle) + text;

  // モデル allowlist（任意の文字列を受け付けない）
  var ALLOWED_MODELS = ['gemini-2.5-flash-preview-tts', 'gemini-2.5-flash-tts'];
  var model = ALLOWED_MODELS.indexOf(body.model) !== -1 ? body.model : ALLOWED_MODELS[0];
  var apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/'
    + encodeURIComponent(model)
    + ':generateContent?key=' + encodeURIComponent(apiKey);

  var payload = {
    contents: [{ parts: [{ text: finalText }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice }
        }
      }
    }
  };

  try {
    var resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    var data = await resp.json();

    if (!resp.ok) {
      var safeMsg = (data && data.error && data.error.message) || 'Gemini API error';
      return jsonResp(resp.status >= 500 ? 502 : resp.status, { error: safeMsg });
    }

    var parts = data && data.candidates && data.candidates[0]
              && data.candidates[0].content && data.candidates[0].content.parts;
    if (!parts || !parts.length) {
      return jsonResp(502, { error: 'Invalid Gemini response' });
    }

    var audioPart = null;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].inlineData && parts[i].inlineData.data) {
        audioPart = parts[i].inlineData;
        break;
      }
      // 新形式: inline_data (snake) 互換
      if (parts[i].inline_data && parts[i].inline_data.data) {
        audioPart = parts[i].inline_data;
        break;
      }
    }
    if (!audioPart) {
      return jsonResp(502, { error: 'No audio in Gemini response' });
    }

    // Gemini TTS は PCM 16-bit mono を返す。mimeType 例: "audio/L16;codec=pcm;rate=24000"
    var mime = audioPart.mimeType || audioPart.mime_type || 'audio/L16;codec=pcm;rate=24000';
    var sampleRate = parseSampleRate(mime, 24000);
    var pcmBase64 = audioPart.data;

    // PCM → WAV (ヘッダ付与)
    var wavBase64 = pcmBase64ToWavBase64(pcmBase64, sampleRate, 1, 16);

    return jsonResp(200, {
      audio: wavBase64,
      mime: 'audio/wav',
      voice: voice,
      chars: text.length,
      model: model,
      sampleRate: sampleRate
    });
  } catch (e) {
    return jsonResp(500, { error: e.message });
  }
};

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

function parseSampleRate(mime, fallback) {
  var m = /rate=(\d+)/i.exec(mime || '');
  return m ? parseInt(m[1], 10) : fallback;
}

// PCM (base64) を WAV (base64) に変換。16-bit, mono 前提。
function pcmBase64ToWavBase64(pcmB64, sampleRate, numChannels, bitsPerSample) {
  var pcm = Buffer.from(pcmB64, 'base64');
  var byteRate = sampleRate * numChannels * bitsPerSample / 8;
  var blockAlign = numChannels * bitsPerSample / 8;
  var dataSize = pcm.length;
  var header = Buffer.alloc(44);

  header.write('RIFF', 0);                         // ChunkID
  header.writeUInt32LE(36 + dataSize, 4);          // ChunkSize
  header.write('WAVE', 8);                         // Format
  header.write('fmt ', 12);                        // Subchunk1 ID
  header.writeUInt32LE(16, 16);                    // Subchunk1 Size (PCM=16)
  header.writeUInt16LE(1, 20);                     // AudioFormat PCM=1
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);                        // Subchunk2 ID
  header.writeUInt32LE(dataSize, 40);              // Subchunk2 Size

  return Buffer.concat([header, pcm]).toString('base64');
}
