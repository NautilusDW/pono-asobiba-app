// Service Worker for ポノのあそびば PWA
// Network-first + version-based cache busting

const CACHE_VERSION = 1227; // v1227: Quizland final-question card is opaque and progress dots use unsquashed CSS circles | v1226: Quizland uses difficulty-only mixed-category question selection | v1225: Play bottom nav restores the original colored sticker icon | v1224: Play bottom nav sticker icon uses the dedicated monochrome button asset | v1223: Play bottom nav integrates sticker book as fifth button with alpha sprite assets | v1222: Quizland local editor saves stay clean on static localhost, speaker buttons keep position when parent frames move, and leaf/Fuji stage art is refreshed | v1221: Sea Album restores alpha shell item sprites and separate shell-open sparkle overlays | v1220: StickerBookThreeJS regenerates dedicated page/tab/spine layer textures without source crop masks | v1219: Help page clarifies book-holder benefits without fixing future content details | v1218: Sea Album reduces guide noise, limits speech bubbles, adds angry face layer, removes realistic item sprites | v1217: Help page copy matches current book/app scope and removes inactive stamp guidance | v1216: Sea Album uses imported alpha item sprites for shell chest, key, and sandball | v1215: Sea Album friendship meter, sandball key item, gated boss loop, multi-slot homing torpedoes | v1214: Play tap-intro overlay is opaque and blocks title-card input until fully dismissed | v1213: Oto free mode can switch classic round buttons / 3D stage with tap magic effects | v1212: Sea Album hide target labels during speech and document power/shop upgrade plan | v1211: Sea Album stage1 simplified to one key-and-shell-chest gimmick with delayed hermit pacing | v1210: Sea Album stage1 central item notices, objective strip, speech/text foregrounding | v1209: Oto free mode uses rhythm-style 3D stage with sound controls | v1208: Oto title keeps blue background for rhythm/free choice | v1207: Sea Album stage1 shell chest, bubble switch, pearl gate, horizontal exploration flow | v1206: Oto rhythm bubble above rival, 3D key press cleanup, louder tap pitch with hold sustain | v1205: Sea Album pink happy bubbles, heart vanish effect, 3D spinning coins, Japanese stage plan | v1204: Sea Album homing bait torpedo pacing and concrete exploration gimmick plan | v1203: Oto rhythm opening speech bubble follow-up cache sync | v1202: Oto rhythm bubble + left fire settle | v1201: Sea Album boss charge recovery, staged feeding, bidirectional explore, coin scatter magnet, bubble food bombs | v1200: Oto rhythm opening rival appears center, then settles into left card | v1199: Sea Album slower pacing, shorter lines, tougher boss, persistent coins HUD | v1198: Sea Album feed bullets, bomb arc, boss warning/fixed fight, horseshoe charge/laser, jet dodge | v1197: sticker book procedural angled flip + app-only sticker hints (drop mismatched generated flip sheet) | v1196: reclassify non-MVP MENU_GAMES to tier:sub per user policy (MVP以外は全てアプリ版限定) | v1195: hide tier:sub menu cards entirely on 本版 (no title, no comingSoon overlay) - fixes user confusion about sub-only games appearing as future content | v1194: PonoTier propagation to play-all.html (4 sites) - finish premium gating for アプリ版 | v1193: PonoTier propagation to breakout/stacking/slide/promo/acorns/writing - fix premium games inaccessible on アプリ版 | v1192: tier resolution = APP_BUILD-driven (アプリ版 auto sub / 本版 sub unreachable) | v1191: navigation handler bypass (opaqueredirect loop fix) | v1190: fix app-staging SW navigation loop (redirect:'manual' + opaqueredirect passthrough) | v1188: fix Oto rhythm Pono/rival idle placement | v1187: add generated kids sticker book assets | v1186: add Oto rhythm rival alpha reactions | v1185: separate Canvas sticker book
const CACHE_NAME = 'pono-v' + CACHE_VERSION;

self.addEventListener('install', event => {
  // 開いているゲームへ新しいSWを即時適用すると、controllerchange経由で
  // ページがリロードされ、ゲームがタイトル状態へ戻ってしまう。
  // 待機状態にして、次回起動/遷移時に自然に切り替える。
});

// ── Opt-in skip-waiting (v1137-) ──
// ページ側 (common/sw-update.js) がトースト経由で明示的にユーザータップを
// 取った時だけ postMessage({type:'SKIP_WAITING'}) を送ってくる。
// install での skipWaiting() 呼び出しを避ける慎重設計はそのまま、
// 「ユーザーが明示的にアップデートしたい時だけ即時切替」を可能にする。
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
