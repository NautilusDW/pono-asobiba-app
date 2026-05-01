// Service Worker for ポノのあそびば PWA
// Network-first + version-based cache busting

const CACHE_VERSION = 598;
const CACHE_NAME = 'pono-v' + CACHE_VERSION;

self.addEventListener('install', event => {
  // 新しいSWが見つかったら即座にアクティブ化
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // 全キャッシュを削除して最新状態にする + 既存クライアントに通知して強制リロード
  // iOS ホーム画面 PWA では controllerchange が発火しにくいケースがあるため
  // postMessage でも通知し、ページ側の message リスナーが reload() する
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
    .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
    .then(clients => {
      for (const client of clients) {
        try { client.postMessage({ type: 'sw-updated', version: CACHE_VERSION }); }
        catch (e) { /* ignore */ }
      }
    })
  );
});

// Network-first strategy: try network, fall back to cache
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // 管理ツール（tools/, admin/, room pivots, /api/ 系）は SW 介在なしでブラウザに直接通す。
  // Basic Auth の 401 チャレンジ時にポップアップが正しく出るようにするため。
  // respondWith を呼ばない = デフォルトのネットワーク取得 + ブラウザ側のダイアログ処理が有効。
  if (event.request.url.includes('/admin/')
      || event.request.url.includes('/tools/')
      || event.request.url.includes('/room/furniture_adjuster')
      || event.request.url.includes('/room/yard_adjuster')
      || event.request.url.includes('/api/gh/')
      || event.request.url.includes('/api/gemini/')) {
    return;
  }

  // HTML はキャッシュしない（常に最新を取得）
  // iOS WebKit の HTTP キャッシュも迂回するため cache: 'no-store' を明示
  const isHTML = event.request.destination === 'document'
    || event.request.headers.get('accept')?.includes('text/html');
  if (isHTML) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 画像は SW キャッシュをスキップして常にネットワーク取得
  // （ピボットツールでスワップした画像が即反映されるように）
  // オフライン時のみ既存キャッシュにフォールバック
  if (event.request.destination === 'image') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 動画 (宝箱・ハリネズミ等) も SW キャッシュをスキップ
  // 古い mp4 がキャッシュされると再生が止まる問題の対策
  if (event.request.destination === 'video'
      || event.request.url.includes('/assets/videos/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // items.js / rewards.json / tts manifest / BGM はデプロイ直後に即反映させたいので HTTP キャッシュも無効化。
  // BGM (assets/audio/bgm/*.mp3) はユーザーが差し替えても古いブラウザ HTTP キャッシュが
  // 居座って「差し替えた曲がなぜか鳴らない」現象の原因になりがち。cache:'no-store' で毎回
  // ネットワーク取得、SW キャッシュだけ更新してオフライン用に保持 (2026-04-21)。
  if (event.request.url.includes('/room/items.js')
      || event.request.url.includes('/assets/data/rewards.json')
      || event.request.url.includes('/assets/tts/manifest.json')
      || event.request.url.includes('/assets/audio/bgm/')
      || event.request.url.includes('/assets/audio/storyboard/')
      || event.request.url.includes('/maze/imageStages/')
      || event.request.url.includes('/quizland/preview/full/saved-layout.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // その他のアセット類は network-first + cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
