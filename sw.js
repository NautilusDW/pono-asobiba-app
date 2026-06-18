// Service Worker for ポノのあそびば PWA
// Network-first + version-based cache busting

// v1283: Roll back the Bento staff/NPC staging bundle and restore the previous Bento defaults.
// v1281: Oto adds Alps Ichimanjaku as a new hard lion-rival rhythm stage.
// v1280: Oto lion-rival rhythm notes use a simple crown mark instead of claw/burst marks.
// v1278: Oto watches legacy sticker reward close events so next-stage openings continue on staging.
// v1277: Oto next-stage transitions close the result/name gate before sticker rewards and cleanly leave stuck rhythm states.
// v1276: SW update checks stay passive and no longer show a blocking in-page version prompt.
// v1275: Bento rolls back generated control button/frame sprites to the previous compact CSS controls.
// v1274: Oto Kero frustrated reaction uses imported fixed alpha art and left/right anger smoke.
// v1273: Oto rhythm stage select is open so uncleared stages can be chosen directly.
// v1272: Oto 3D note buttons share one closed top rim between side polygons and the textured top.
// v1271: Oto 3D note button top textures keep colored edges instead of dark rims.
// v1270: Bento text buttons use fixed-size slots across states while palette rows keep measured tile spacing.
// v1270: Oto 3D note button top textures are opaque so the beveled top has no groove.
// v1269: Bento palette rows use natural tile height and generated UI backgrounds keep measured PNG ratios.
// v1268: Bento applies NPC saved positions before showing portraits and stops stretching generated UI frames.
// v1267: Oto 3D note buttons use a rounded two-step bevel instead of a straight slab.
// v1266: Oto 3D note buttons remove the top-surface groove and silence audio immediately when inactive.
// v1265: Bento character position editor adds zoomed mask preview, undo, and 0.1% mask sliders.
// v1264: Oto rhythm rival openings use separate imported BGM tracks for the robot and lion rivals.
// v1263: Sea Album shows the key item art prominently when the hermit awards it.
// v1262: Sea Album coin rotation uses the imported alpha coin frames from the item folder.
// v1261: Bento staff waving-2 portraits reuse the matching staff art with alternate hand angles.
// v1260: Oto rhythm song menu uses a black backdrop, rival openings fade in from black, and Pono battle reactions are larger with FX.
// v1259: Bento character position editor can apply one placement to every expression or pose for a character.
// v1258: Sea Album adds story setup, broader SFX, stronger key handoff, and alpha-aware coin sprites.
// v1257: Oto adds imported title, rival dialogue, and stage-clear BGM with a settings toggle.
// v1256: Bento shop staff counter mask is adjustable in the character editor.

// v1255: Sea Album adds story setup, broader SFX, stronger key handoff, and alpha-aware coin sprites.
// v1254: Bento character position editor allows higher vertical placement for staff and NPC sprites.
// v1253: Sea Album caps pointer-follow speed, adds touch-offset flick jet, tougher enemies, staged feed lines, and generated coin sprites
// v1251: Oto reward stickers land from an enlarged impact with don SFX, and rhythm openings/results hide left battle cards while centering rivals in the main monitor.
// v1250: Bento shop opening uses layered staff background and alpha staff sprites with editable staff poses.
// v1249: StickerBookThreeJS uses generated transparent page-thickness textures instead of plain bottom rectangles.
// v1248: StickerBookThreeJS removes the outer vertical page-stack strips that appeared as cut-off pieces behind tabs.
// v1247: Oto rhythm rival lines are gentler, first rival openings introduce themselves, and sticker rewards use a richer celebration before next-stage openings.
// v1246: StickerBookThreeJS cover now fills the page ratio, and the binder uses internal split-ring sockets.
// v1244: Oto rhythm stage clear keeps defeated rival speech visible beside the result panel, including low-height screens.
// v1243: StickerBookThreeJS uses 20260617-596 cover/thickness assets for cache busting.
// v1242: Quizland stage question/answer phase layouts now reset stale inline geometry and stop answer preview from inheriting question-stage sizing.
// v1241: Bento squirrel NPC portraits use the consistent bright 20260614-120131 set.
// v1240: StickerBookThreeJS restores rich source-based covers and adds simulated left/right page-stack thickness.
// v1239: Oto rhythm stage clear composites the defeated rival and a final rival line over the clear background.
// v1238: Bento NPC position editor and runtime share versioned portraits and happy falls back to normal positioning.
// v1237: Bento squirrel NPC normal/almost portraits now match the newer round style.
// v1236: StickerBookThreeJS cover mode is now a closed-cover-only view, and inside pages use left list / right free sticker area.
// v1235: Bento uses imported alpha UI button/frame sprites for controls, group-colored palette tiles, and fixed selected-item toolbar.
// v1234: Oto free-mode choice thumbnails now use real screenshots, and Kero right-side sweat/action-line FX are flipped to face outward correctly.
// v1233: Oto rival openings are shorter and sticker rewards wait until result/high-score UI is dismissed; sticker toasts now defer behind visible game overlays.
// v1232: StickerBookThreeJS inside pages now use fixed production page render textures, with spine below pages and stable left page state.
// v1231: Bento tutorial requester now uses free-tier food (araiguma with taco wiener / tomato) to avoid locked yakizake.
// v1230: Oto free start asks for button/stage play style, renames free view tabs, and enlarges centered 3D Pono.
const CACHE_VERSION = 1283; // v1283: Roll back the Bento staff/NPC staging bundle and restore the previous Bento defaults. | v1281: Oto adds Alps Ichimanjaku as a new hard lion-rival rhythm stage. | v1280: Oto lion-rival rhythm notes use a simple crown mark instead of claw/burst marks. | v1278: Oto watches legacy sticker reward close events so next-stage openings continue on staging.
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
