// Service Worker for ポノのあそびば PWA
// Network-first + version-based cache busting

// v1244: Maze janken fixes player-win logic, removes cumulative chance drift, and switches player choices to hand art.
// v1243: Bento book tier adds nori face/shape parts and furikake decoration assets.
// v1242: Tier lock copy now routes free users to the book secret word and book users to the app.
// v1241: Bento free tier no longer falls back to all NPC requesters; free starts as self-made bento.
// v1240: play.html title bottom nav right edge aligns to the actual game plate right edge, accounting for card-list shadow padding.
// v1239: Daily gacha gold capsule assets refreshed and rarity/color weights made configurable.
// v1238: Daily gacha super-rare reveal fanfare synced to develop.
// v1236: Daily gacha rarity reveal profiles and gold capsule assets synced to develop.
// v1237: Daily gacha gold capsule deepened and super-rare reveal made more distinct.
// v1234: Daily gacha one-per-day start/end copy synced to develop, with sticker-book guidance after the reveal.
// v1233: Daily gacha final-turn stinger synced to develop, and capsule-exit SE leads the drop slightly.
// v1232: Daily gacha switches from the top BGM to the gacha bed loop, and the help pressed mask extends to the right edge.
// v1231: Bottom nav uses the user-cleaned GPT Image 2 official-site alpha sprites and updated aspect ratio.
// v1230: Daily gacha adds bubbles_v1 to the capsule opening moment.
// v1229: Bottom nav swaps the top button to an official-site button using user-cleaned alpha sprites.
// v1228: Daily gacha hides the close X, moves reveal actions to the top right, and opens the tray landing mask.
// v1227: Daily gacha generated home buttons and reveal polish synced to develop: home returns to play top, glow edges are smoothed, and tray clipping is retuned.
// v1226: Daily gacha reveal polish synced to develop — capsule is clipped behind the outlet lip, reveal zoom is calmer, and the final actions use sticker/home image buttons.
// v1225: Daily gacha cue and outlet mask polish synced to develop — arrow color unified, idle hand/label separated, and mask starts at the outlet opening.
// v1224: Daily gacha lever grip and outlet mask synced to develop — guide hand grips the right lever end, and capsule exit is clipped at the outlet.
// v1223: Daily gacha animated-arrow cue synced to develop — high-contrast moving arrow, guide hand orbits the lever, and capsule drop starts from the outlet.
// v1222: Daily gacha open-hand turn cue synced to develop — static open hand, blinking turn cue, one-full-turn lever input, and smoother smaller capsule drop.
// v1221: Daily gacha direct lever flow synced to develop — side button/meter panel removed, machine centered, and hand guide added over the lever.
// v1220: Daily gacha outlet motion synced to develop — machine is raised, 3-step outlet zoom is stronger/smoother, and the smaller capsule exits then settles on the lip.
// v1219: Daily gacha outlet zoom synced to develop — final zoom targets the outlet, capsule drop uses more bounce frames, and the bounced capsule stays in-frame.
// v1218: Daily gacha final reveal audio synced to develop — final notch no longer repeats capsule-toy SFX 01, and opened sticker reveal layers a longer magic sparkle.
// v1217: Daily gacha pacing and SFX synced to develop — 3 notches stay, lever drag has heavier pull-to-notch feedback, reveal suspense is restored, and capsule-toy SFX 01/02 are used for notches/exit.
// v1216: Daily gacha reveal tightened on develop — both split capsule halves open together, drop capsule is larger, flow is 3 notches, and final zoom avoids panel clipping.
// v1215: Daily gacha final reveal polish synced to develop — sticker sparkle SFX, short gear-notch turn SFX, random first-open capsule color, and reward reveal backdrops.
// v1214: Daily gacha audio synced to develop — imported Suno-style low drum-roll turn SFX, grand reveal SFX, subtle modal bed loop, mute/visibility handling, and repeat-button pointer fix.
// v1213: Daily gacha luxury light staging synced to develop — dark start, per-notch backlight/rays/sparkles ramp, final gold bloom, and Pono-badge open capsule as the primary/default open view.
// v1212: Daily gacha repeat flow synced to develop: centered lever axle, centered staged zoom, repeatable "もういっかい" action, and no daily gate.
// v1211: Daily gacha lever tuning synced to develop: smaller centered lever, four hard notched turns, staged zoom, boom/drop, and random split-capsule variants.

// v1210: play.html にアプリ版限定のデイリーシールガチャを同期。APP_BUILD/開発モード時だけ表示し、レバー操作からシール付与まで行う。assets/ui/gacha/ に alpha 済み素材を追加。
const CACHE_VERSION = 1245; // v1245: Maze/puzzle free-book allowlist split.
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
