import urllib.request, json, time, sys
url = "https://pono.kodama-no-mori.com/api/ai-tts"
payload = {
    "text": "こんにちは。",
    "voice": "Aoede",
    "stylePrompt": "[gently]"
}
req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode('utf-8'),
    headers={
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Origin": "https://pono.kodama-no-mori.com",
        "Referer": "https://pono.kodama-no-mori.com/admin/"
    },
    method="POST"
)
t0 = time.time()
try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode('utf-8')
        print(f"status={resp.status}")
        print(f"elapsed_http={time.time()-t0:.2f}s")
        try:
            data = json.loads(body)
            # mask audioContent
            if 'audioContent' in data:
                ac = data['audioContent']
                data['audioContent'] = f"<{len(ac)} bytes b64>"
            print(json.dumps(data, ensure_ascii=False, indent=2))
        except Exception as e:
            print(f"body (raw, first 1000 chars): {body[:1000]}")
except urllib.error.HTTPError as e:
    print(f"HTTPError {e.code}: {e.read().decode('utf-8', errors='replace')[:1000]}")
except Exception as e:
    print(f"err: {type(e).__name__}: {e}")
