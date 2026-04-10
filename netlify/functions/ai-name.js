// Netlify Function: Gemini Vision API プロキシ
// 環境変数: GEMINI_API_KEY をNetlifyダッシュボードで設定

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
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'GEMINI_API_KEY not configured on server' })
    };
  }

  var body;
  try { body = JSON.parse(event.body || '{}'); }
  catch(e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  var imageBase64 = body.image;
  var mimeType = body.mimeType || 'image/png';
  var prompt = body.prompt;
  if (!prompt) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'prompt が必要です' })
    };
  }

  // Gemini モデル選択 (2026-04 時点で動作確認済み)
  // - gemini-flash-latest   : 現行安定版へのエイリアス (デフォルト・別クォータプール)
  // - gemini-2.5-flash-lite : 無料枠 ~1000 req/日
  // - gemini-2.5-flash      : 無料枠 20 req/日のみ (バッチ処理には不向き)
  // クライアントが body.model を指定した場合はそれを使う
  var model = body.model || 'gemini-flash-latest';
  var apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/'
    + encodeURIComponent(model)
    + ':generateContent?key=' + encodeURIComponent(apiKey);

  // 複数画像モード: body.images = [{data, mimeType}, ...]
  var images = body.images;
  var parts;
  if (images && Array.isArray(images) && images.length > 0) {
    parts = images.map(function(img) {
      return { inline_data: { mime_type: img.mimeType || 'image/png', data: img.data } };
    });
    parts.push({ text: prompt });
  } else if (imageBase64) {
    parts = [{ inline_data: { mime_type: mimeType, data: imageBase64 } }, { text: prompt }];
  } else {
    parts = [{ text: prompt }];
  }

  try {
    var resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: parts
        }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          maxOutputTokens: 4096
        }
      })
    });

    var data = await resp.json();

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Gemini API error', details: data })
      };
    }

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid Gemini response', details: data })
      };
    }

    var text = data.candidates[0].content.parts[0].text;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ text: text })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
