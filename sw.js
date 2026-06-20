// Service Worker for ポノのあそびば PWA
// Network-first + version-based cache busting

// v1212: Daily gacha repeat flow synced to develop: centered lever axle, centered staged zoom, repeatable "もういっかい" action, and no daily gate.
// v1211: Daily gacha lever tuning synced to develop: smaller centered lever, four hard notched turns, staged zoom, boom/drop, and random split-capsule variants.

// v1210: play.html にアプリ版限定のデイリーシールガチャを同期。APP_BUILD/開発モード時だけ表示し、レバー操作からシール付与まで行う。assets/ui/gacha/ に alpha 済み素材を追加。
const CACHE_VERSION = 1212; // v1212: Daily gacha repeat flow, centered lever axle, centered staged zoom, repeatable action, and no daily gate. | v1211: Daily gacha lever tuning with 4 hard notched turns, staged zoom, final boom/drop, and random split-capsule variants. | v1210: Play top daily sticker gacha with draggable lever, capsule drop/open reveal, and PonoGameStickers grant. | v1209: SW update checks stay passive and no longer show a blocking in-page version prompt. | v1208: Quizland final-question banner uses the provided Dr.owl No folder image | v1207: Quizland final-question banner uses an opaque image asset and next button glows from below | v1206: Quizland restores image-based final-question banner and aspect-correct progress art with glowing next button | v1205: Quizland final-question card is opaque and progress dots use unsquashed CSS circles | v1204: Quizland uses difficulty-only mixed-category question selection | v1203: Play bottom nav restores the original colored sticker icon | v1202: Play bottom nav sticker icon uses the dedicated monochrome button asset | v1201: Play bottom nav integrates sticker book as fifth button with alpha sprite assets | v1200: Local Quizland editor saves stay local-clean on static localhost instead of repeatedly prompting after GitHub proxy misses | v1199: Quizland leaf/Fuji staging art and question/answer stage layouts sync to the main staging branch | v1198: Play tap-intro overlay is opaque and blocks title-card input until fully dismissed | v1197: sticker book procedural angled flip + app-only sticker hints (drop mismatched generated flip sheet) | v1196: reclassify non-MVP MENU_GAMES to tier:sub per user policy (MVP以外は全てアプリ版限定) | v1195: hide tier:sub menu cards entirely on 本版 (no title, no comingSoon overlay) - fixes user confusion about sub-only games appearing as future content | v1194: PonoTier propagation to play-all.html (4 sites) - finish premium gating for アプリ版 | v1193: PonoTier propagation to breakout/stacking/slide/promo/acorns/writing - fix premium games inaccessible on アプリ版 | v1192: tier resolution = APP_BUILD-driven (アプリ版 auto sub / 本版 sub unreachable) | v1191: navigation handler bypass (opaqueredirect loop fix) | v1190: fix app-staging SW navigation loop (redirect:'manual' + opaqueredirect passthrough) | v1189: composite sticker book hard page flip | v1188: fix Oto rhythm Pono/rival idle placement | v1187: add generated kids sticker book assets | v1186: add Oto rhythm rival reactions
const CACHE_NAME = 'pono-v' + CACHE_VERSION;

self.addEventListener('install', event => {
  // 開いているゲームへ新しいSWを即時適用すると、controllerchange経由で
  // ページがリロードされ、ゲームがタイトル状態へ戻ってしまう。
  // 待機状態にして、次回起動/遷移時に自然に切り替える。
});

// ── Legacy skip-waiting message hook (v1137-) ──
// 現行の common/sw-update.js は更新待ちUIを出さず、次回起動/遷移で自然に
// 切り替える。既に開いている旧ページからのメッセージだけ後方互換で受ける。
self.addEventListener('message', event => {
  if (event && event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', event => {
  // 旧キャッシュを削除する。既存クライアントは claim せず、プレイ中の
  // ページを中断しない。新しいSWは次回のページ読み込みから担当する。
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
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

  // ナビゲーション系リクエスト (navigate / document / Accept: text/html) は
  // SW で intercept しない。ブラウザのネイティブな navigation と 307 redirect
  // follow に完全に任せる。
  //
  // 過去に v1190 で redirect:'manual' + Response.redirect(opaqueredirect) 戦略を
  // 試したが、 Fetch 仕様で opaqueredirect の response.url は空文字になるため、
  // フォールバックの event.request.url (= /play.html) に 302 を返してしまい、
  // ブラウザが同じ /play.html を再 fetch → 同じ 302 → 無限ループ
  // → ERR_TOO_MANY_REDIRECTS で両 staging が死亡。
  //
  // オフライン navigation フォールバックは失われるが、致命バグを取る方が優先。
  const isHTML = event.request.destination === 'document'
    || event.request.headers.get('accept')?.includes('text/html');
  if (isHTML) {
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
      || event.request.url.includes('/assets/audio/storyboard/')) {
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
