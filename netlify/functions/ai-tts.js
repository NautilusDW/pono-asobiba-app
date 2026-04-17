// Netlify Function: Google Cloud Text-to-Speech プロキシ
// 環境変数: GEMINI_API_KEY を Netlify ダッシュボードで設定（ai-name.js と共用）
//   ※ Gemini API Key ではなく Google Cloud API Key。同じプロジェクトなら同じキーでOK
//   ※ Cloud Console で「Cloud Text-to-Speech API」を有効化しておくこと
//
// リクエスト (POST application/json):
//   { text: "読み上げるテキスト",
//     voice?: "ja-JP-Neural2-B" | "Leda" | ... (後方互換で旧Gemini名も受理),
//     stylePrompt?: (無視される、後方互換のみ),
//     model?: (無視される、後方互換のみ) }
//
// レスポンス (200):
//   { audio: "<base64 WAV>",
//     mime:  "audio/wav",
//     voice: "ja-JP-Neural2-B",
//     chars: 12,
//     model: "cloud-tts",
//     sampleRate: 24000 }

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

  // voice 解決: Cloud TTS ja-JP ボイス allowlist + 旧 Gemini 名の後方互換マップ
  var ALLOWED_VOICES = [
    'ja-JP-Neural2-B', 'ja-JP-Neural2-C', 'ja-JP-Neural2-D',
    'ja-JP-Wavenet-A', 'ja-JP-Wavenet-B', 'ja-JP-Wavenet-C', 'ja-JP-Wavenet-D',
    'ja-JP-Standard-A', 'ja-JP-Standard-B', 'ja-JP-Standard-C', 'ja-JP-Standard-D'
  ];
  var LEGACY_VOICE_MAP = {
    // 旧 Gemini 名 → Cloud TTS ja-JP Neural2 への最良マッピング（子供向け優先）
    'Leda':       'ja-JP-Neural2-B',   // female, default
    'Aoede':      'ja-JP-Neural2-B',   // female
    'Callirrhoe': 'ja-JP-Neural2-B',   // female
    'Despina':    'ja-JP-Neural2-B',   // female
    'Kore':       'ja-JP-Neural2-D',   // male
    'Puck':       'ja-JP-Neural2-C',   // male
    'Charon':     'ja-JP-Neural2-D',   // male
    'Orus':       'ja-JP-Neural2-C',   // male
    'Zephyr':     'ja-JP-Wavenet-A',   // female variant
    'Fenrir':     'ja-JP-Wavenet-C'    // male variant
  };
  var DEFAULT_VOICE = 'ja-JP-Neural2-B';
  var rawVoice = body.voice || DEFAULT_VOICE;
  var voice = LEGACY_VOICE_MAP[rawVoice] || rawVoice;
  if (ALLOWED_VOICES.indexOf(voice) === -1) voice = DEFAULT_VOICE;

  // 子供向けピッチ・速度（クライアント側で playbackRate=1.15 がかかるので抑えめ）
  var speakingRate = 1.0;
  var pitch = 1.0;   // やや高め（0 = 標準）

  var apiUrl = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(apiKey);

  var payload = {
    input: { text: text },
    voice: {
      languageCode: 'ja-JP',
      name: voice
    },
    audioConfig: {
      audioEncoding: 'LINEAR16',     // WAV ヘッダ付き PCM で返る
      sampleRateHertz: 24000,
      speakingRate: speakingRate,
      pitch: pitch
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
      var safeMsg = (data && data.error && data.error.message) || 'Cloud TTS API error';
      return jsonResp(resp.status >= 500 ? 502 : resp.status, { error: safeMsg });
    }

    if (!data || !data.audioContent) {
      return jsonResp(502, { error: 'No audio in Cloud TTS response' });
    }

    // Cloud TTS の LINEAR16 は WAV コンテナ付きで返るのでそのまま
    return jsonResp(200, {
      audio: data.audioContent,
      mime: 'audio/wav',
      voice: voice,
      chars: text.length,
      model: 'cloud-tts',
      sampleRate: 24000
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
