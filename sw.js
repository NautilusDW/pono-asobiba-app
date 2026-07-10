// Service Worker for ポノのあそびば PWA
// Network-first + version-based cache busting
// v1270: Maze のはしご取得後に入口/出口を同時点灯し、正解ボタン中央化、ステージ札の矢印回避、混入動物画像5種の再クロップを反映。play.html PAGE_CACHE_VERSION と同期。
// v1269: Maze のつづき予告をstage3後ではなくfree全ステージ完了後だけ表示し、絵本の軽い案内と「もどる」導線を追加。play.html PAGE_CACHE_VERSION と同期。
// v1268: Maze のじゃんけん音声を順番再生にし、角の設定ボタンを上中央ステージ札へ統合。stage3予告文言も迷子救助の目的へ統一。play.html PAGE_CACHE_VERSION と同期。
// v1267: ホームのどんぐり数を、行ボックスではなく数字の字形が白いプレート中央に見える位置へ再調整。play.html PAGE_CACHE_VERSION と同期。
// v1266: ホームのプロフィール土台で、どんぐり数を見た目のプレート縦中央へ揃える。play.html PAGE_CACHE_VERSION と同期。
// v1265: Puzzle のアプリ枠ロック仲間を完全なグレーシルエットへ変更し、「サブスク」を「アプリ」へ更新。下部操作列から仲間選択をいつでも開き直せるボタンも追加。play.html PAGE_CACHE_VERSION と同期。
// v1264: QuizLand の「つぎへ」を下方向グロウから全周フレーム発光へ変更し、Puzzle 仲間解放画面の料金区分ラベルを削除。play.html PAGE_CACHE_VERSION と同期。
// v1263: ホームのプロフィール土台で、アバターとラベルを左枠内へ収め、どんぐりを右側の円中央へ揃える。play.html PAGE_CACHE_VERSION と同期。
// v1262: 音タッチ book のリズム曲をネジマエストロ初登場の「ちょうちょう」まで解放。play.html PAGE_CACHE_VERSION と同期。
// v1261: Bento タイトルの上側ピルを非表示にし、無料版でもおねがいモードを見えるロックとして残す。Bento 食材 tier を free 10 / book 16 / sub 30 へ更新。play.html PAGE_CACHE_VERSION と同期。
// v1260: Bento チュートリアルで、成功 sparkle を配置先へ出し、のり編集説明のちらつきと
//   はっぱ/しきり説明の順序を「おかず4つ後」へ同期。admin の配置エディタ直リンクにも対応。play.html PAGE_CACHE_VERSION と同期。
// v1259: Bento チュートリアルで、のり移動/編集の青枠残りを掃除し、
//   はっぱ手順を「おかずタップ」ではなく葉っぱ選択→好きな場所タップへ同期。play.html PAGE_CACHE_VERSION と同期。
// v1258: Bento チュートリアルで、パレットスクロール完了後に青枠を出すようにし、
//   のり編集パネルの青枠、はっぱタブ/おかず選択導線を同期。play.html PAGE_CACHE_VERSION と同期。
// v1257: Bento チュートリアルのはっぱ手順で、食材/カップの半透明見本残り・吹き出しのタップ阻害・
//   leaf タブ状態ずれを修正。book/free 案内モーダルの重複タイトルを省き、
//   合言葉の場所を「えほんの さいごの ページ」表記へ統一。play.html PAGE_CACHE_VERSION と同期。
// v1256: LP staging にシール帳/展示室 runtime とシール画像一式を同期し、
//   play.html のプロフィール＆どんぐり土台を右下3ボタンと同じ高さへ再調整。
// v1255: Maze modal sizing polish synced from app staging: acorn close/amount alignment, janken choice-hand orientation, and truefalse short-screen fit.
// v1254: Maze teaser/acorn/janken polish synced from app staging: teaser fits landscape, animals show as two normal cards, acorn modal X stays inside frame, and janken hands use alpha art.
// v1247: LP staging title menu shows Web MVP games plus non-clickable coming-soon wood cards.
// v1246: LP staging uses the refreshed landing page hero, Web-version metadata, and local play links.
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
const CACHE_VERSION = 1270; // v1270: maze ladder/quiz/HUD polish.
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
