/* ============================================================
   common/telemetry.js  (匿名あそびの記録 / P0 テレメトリ クライアント)

   正本: docs/data-analytics-plan.md (§5-1 P0イベント8個 / §5-3 匿名ID・
   オプトアウト / §5-4 告知と法的ゲート / §5-5 集めないリスト / §6-2 収集
   エンドポイント設計)。 依存ゼロの単独 IIFE。 common/tier.js が未ロードでも
   動作する (tier='unknown' にフォールバック)。

   公開 API (window.PonoTelemetry):
     - track(name, props)   イベントをキューに積んで非同期送信
     - optOut(bool)         テレメトリのオプトアウト ON/OFF
     - isOptedOut()          現在オプトアウト中か
     - resetClientId()      端末の匿名 client_id を再発行 (保護者の明示操作用)

   識別子 (すべて氏名・年齢・性別とは物理的に別キー。 §5-5 準拠で PII は一切
   扱わない):
     - localStorage pono_client_id            端末永続・匿名 (crypto.randomUUID)
     - localStorage pono_telemetry_opt_out    '1' で全送信停止
     - localStorage pono_telemetry_notice_shown  初回告知バナーの表示済みフラグ
     - localStorage pono_telemetry_last_dr    daily_return の JST 日付 dedup
     - sessionStorage pono_telemetry_sid / pono_telemetry_sid_ts
         セッション単位 (30分無操作で新規発行)

   送信: POST (window.PONO_API_BASE || '') + '/api/e'。 fetch keepalive:true
   のみ (離脱直前の beacon 送信 API は §7-1 の制約により不採用)。 IndexedDB (db=pono_telemetry
   / store=queue) を write-ahead キューとして使い、 上限500件・7日TTL。
   IndexedDB が使えない環境 (プライベートモード等) はメモリキューへ黙って
   フォールバックする。

   常時購読 (auto 属性の有無に関わらず有効):
     - window 'PonoGameStickerGranted' → track('game_clear', ...)
     - window 'pono-acorns-changed'    → track('acorn_earned', ...)  (delta>0 のみ)

   auto ページ限定 (<script src="common/telemetry.js" data-pono-telemetry-auto="1">
   のときのみ): session_start / daily_return の自動発火 + 初回告知バナー表示。
   ============================================================ */
(function () {
  'use strict';

  if (window.PonoTelemetry) return;

  // ---- ストレージキー ----
  var LS_CLIENT_ID    = 'pono_client_id';
  var LS_OPT_OUT       = 'pono_telemetry_opt_out';
  var LS_NOTICE_SHOWN  = 'pono_telemetry_notice_shown';
  var LS_LAST_DR       = 'pono_telemetry_last_dr';
  var SS_SID           = 'pono_telemetry_sid';
  var SS_SID_TS        = 'pono_telemetry_sid_ts';
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30分無操作で新規セッション

  // ---- IndexedDB write-ahead キュー ----
  var DB_NAME  = 'pono_telemetry';
  var DB_STORE = 'queue';
  var DB_VERSION = 1;
  var QUEUE_MAX = 500;
  var QUEUE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7日

  // ---- バッチ送信の上限 (fetch keepalive の暗黙上限 ~64KiB に対する保守的な上限) ----
  var CHUNK_MAX_EVENTS = 50;
  var CHUNK_MAX_BYTES = 30 * 1024; // 約30KB

  var FLUSH_INTERVAL_MS = 30 * 1000;

  // native/staging 切替は既存イディオムをそのまま流用 (common/cloud-sync.js と同型)。
  var ENDPOINT = (window.PONO_API_BASE || '') + '/api/e';

  // ---- own <script> タグの検出 (auto 属性判定) ----
  // NOTE: document.currentScript は「実行中のスクリプト」でしか使えないため、
  // ここで同期的に (IIFE 評価のこの瞬間に) 確定させる。 DOMContentLoaded 等の
  // 非同期コールバック内から呼ぶと既に null になっているため使えない。
  var AUTO_FLAG = (function () {
    try {
      var cs = document.currentScript;
      if (cs && cs.getAttribute) {
        return cs.getAttribute('data-pono-telemetry-auto') === '1';
      }
    } catch (e) {}
    try {
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        var src = scripts[i].getAttribute('src') || '';
        if (src.indexOf('telemetry.js') !== -1) {
          return scripts[i].getAttribute('data-pono-telemetry-auto') === '1';
        }
      }
    } catch (e) {}
    return false;
  })();

  // ---- safe storage ラッパー ----
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function lsRemove(k) { try { window.localStorage.removeItem(k); } catch (e) {} }
  function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }

  // ---- オプトアウト ----
  function isOptedOut() {
    return lsGet(LS_OPT_OUT) === '1';
  }
  function optOut(on) {
    if (on) {
      lsSet(LS_OPT_OUT, '1');
      // プライバシー配慮: オプトアウト時点で未送信キューは破棄する (既存の
      // 送信済みイベントは既にサーバーへ届いているため対象外)。
      memQueue = [];
      idbClearAll();
    } else {
      lsRemove(LS_OPT_OUT);
    }
  }

  // ---- 匿名ID生成 ----
  // crypto.randomUUID を第一選択、非対応環境 (古い WebView / non-secure context)
  // のみ Math.random ベースの簡易 UUID v4 風文字列にフォールバックする。
  function genId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : ((r & 0x3) | 0x8);
      return v.toString(16);
    });
  }

  function getClientId() {
    var id = lsGet(LS_CLIENT_ID);
    if (!id) {
      id = genId();
      lsSet(LS_CLIENT_ID, id);
    }
    return id;
  }

  function resetClientId() {
    var id = genId();
    lsSet(LS_CLIENT_ID, id);
    return id;
  }

  function getSessionId() {
    var now = Date.now();
    var sid = ssGet(SS_SID);
    var ts = parseInt(ssGet(SS_SID_TS) || '0', 10);
    if (!sid || !ts || isNaN(ts) || (now - ts) > SESSION_TIMEOUT_MS) {
      sid = genId();
      ssSet(SS_SID, sid);
    }
    ssSet(SS_SID_TS, String(now));
    return sid;
  }

  // ---- tier (common/tier.js 未ロード時は 'unknown') ----
  function getTier() {
    try {
      if (window.PonoTier && typeof window.PonoTier.getTier === 'function') {
        return window.PonoTier.getTier();
      }
    } catch (e) {}
    return 'unknown';
  }

  // ---- platform (native/web-app/web の判定。 hostname sniffing は使わない) ----
  function getPlatform() {
    try {
      if (window.__NATIVE_BUILD__ === 1 || window.__NATIVE_BUILD__ === '1') return 'native-android';
      if (window.__APP_BUILD__ === 1 || window.__APP_BUILD__ === '1') return 'web-app';
    } catch (e) {}
    return 'web';
  }

  // ---- game_id (pathname の最初のディレクトリ名。 play.html 自体は 'hub') ----
  function getGameId() {
    try {
      var path = String(location.pathname || '').replace(/^\/+/, '');
      var first = path.split('/')[0] || '';
      if (!first || first.indexOf('.') !== -1) return 'hub';
      return first;
    } catch (e) { return 'hub'; }
  }

  // ---- daily_return 用 JST 日付キー ----
  // 出典: js/daily-quest.js:23-28 の jstNow()/pad2()/todayKeyJST() をそのまま複製
  // (import 不可のため自前実装)。
  function jstNow() { return new Date(Date.now() + 9 * 60 * 60 * 1000); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function todayKeyJST() {
    var j = jstNow();
    return j.getUTCFullYear() + '-' + pad2(j.getUTCMonth() + 1) + '-' + pad2(j.getUTCDate());
  }

  // ============================================================
  // ---- IndexedDB write-ahead キュー ----
  // ============================================================
  var idbAvailable = true;
  var idbPromise = null;

  function openDB() {
    if (idbPromise) return idbPromise;
    idbPromise = new Promise(function (resolve) {
      try {
        if (!window.indexedDB) { idbAvailable = false; resolve(null); return; }
        var req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function () {
          try {
            var db = req.result;
            if (!db.objectStoreNames.contains(DB_STORE)) {
              db.createObjectStore(DB_STORE, { keyPath: '_id' });
            }
          } catch (e) {}
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { idbAvailable = false; resolve(null); };
        req.onblocked = function () { idbAvailable = false; resolve(null); };
      } catch (e) {
        idbAvailable = false;
        resolve(null);
      }
    });
    return idbPromise;
  }

  function idbPut(rec) {
    if (!idbAvailable) return;
    openDB().then(function (db) {
      if (!db) return;
      try {
        db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).put(rec);
      } catch (e) {}
    }).catch(function () {});
  }

  function idbDelete(ids) {
    if (!idbAvailable || !ids || !ids.length) return;
    openDB().then(function (db) {
      if (!db) return;
      try {
        var store = db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE);
        for (var i = 0; i < ids.length; i++) store.delete(ids[i]);
      } catch (e) {}
    }).catch(function () {});
  }

  function idbClearAll() {
    if (!idbAvailable) return;
    openDB().then(function (db) {
      if (!db) return;
      try {
        db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).clear();
      } catch (e) {}
    }).catch(function () {});
  }

  function idbLoadAll() {
    return openDB().then(function (db) {
      if (!db) return [];
      return new Promise(function (resolve) {
        try {
          var req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).getAll();
          req.onsuccess = function () { resolve(req.result || []); };
          req.onerror = function () { resolve([]); };
        } catch (e) { resolve([]); }
      });
    }).catch(function () { return []; });
  }

  // ---- メモリキュー (IndexedDB 不可環境のフォールバック先。 通常時も
  //      flush() 対象の一次ソースとして常に使う) ----
  var memQueue = [];

  function genLocalId() {
    return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function purgeExpired() {
    var now = Date.now();
    var kept = [];
    var removedIds = [];
    for (var i = 0; i < memQueue.length; i++) {
      var r = memQueue[i];
      if (now - r.ts > QUEUE_TTL_MS) removedIds.push(r._id);
      else kept.push(r);
    }
    if (removedIds.length) {
      memQueue = kept;
      idbDelete(removedIds);
    }
  }

  function trimQueue() {
    if (memQueue.length <= QUEUE_MAX) return;
    var removed = memQueue.splice(0, memQueue.length - QUEUE_MAX);
    idbDelete(removed.map(function (r) { return r._id; }));
  }

  function enqueue(n, ts, p) {
    var rec = { _id: genLocalId(), n: n, ts: ts, p: p || {} };
    memQueue.push(rec);
    trimQueue();
    idbPut(rec);
    scheduleFlush();
  }

  // ============================================================
  // ---- バッチ分割 + 送信 ----
  // ============================================================
  function estimateBytes(records) {
    try { return JSON.stringify(records).length; } catch (e) { return 0; }
  }

  function buildChunks(records) {
    var chunks = [];
    var cur = [];
    for (var i = 0; i < records.length; i++) {
      var next = cur.concat([records[i]]);
      if (cur.length > 0 && (next.length > CHUNK_MAX_EVENTS || estimateBytes(next) > CHUNK_MAX_BYTES)) {
        chunks.push(cur);
        cur = [records[i]];
      } else {
        cur = next;
      }
    }
    if (cur.length) chunks.push(cur);
    return chunks;
  }

  // ---- payload build (PII厳禁: name/age/gender/email 等のプロフィール情報は
  //      一切扱わない。 §5-5 集めないリスト準拠) ----
  function sendChunk(records) {
    if (isOptedOut()) return Promise.resolve(false);
    var body;
    try {
      body = JSON.stringify({
        v: 1,
        cid: getClientId(),
        sid: getSessionId(),
        tier: getTier(),
        platform: getPlatform(),
        events: records.map(function (r) {
          return { n: r.n, ts: r.ts, p: r.p };
        })
      });
    } catch (e) {
      return Promise.resolve(false);
    }
    try {
      return fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true
      }).then(function (res) {
        return !!(res && res.ok);
      }).catch(function () { return false; });
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  var flushing = false;
  var flushScheduled = false;

  function flush() {
    if (isOptedOut()) return;
    if (flushing) return;
    purgeExpired();
    if (!memQueue.length) return;
    flushing = true;
    var chunks = buildChunks(memQueue.slice());
    var idx = 0;
    function sendNext() {
      if (idx >= chunks.length) { flushing = false; return; }
      var chunk = chunks[idx++];
      sendChunk(chunk).then(function (ok) {
        if (ok) {
          var ids = chunk.map(function (r) { return r._id; });
          memQueue = memQueue.filter(function (r) { return ids.indexOf(r._id) === -1; });
          idbDelete(ids);
          sendNext();
        } else {
          // 失敗分は次回の flush トリガーで再送する。
          flushing = false;
        }
      });
    }
    sendNext();
  }

  function scheduleFlush() {
    if (flushScheduled) return;
    flushScheduled = true;
    setTimeout(function () {
      flushScheduled = false;
      flush();
    }, 0);
  }

  // ============================================================
  // ---- track() ----
  // ============================================================
  // 戻り値: 実際に enqueue できたか (true/false)。 opt-out 中や name 欠落時は
  // false を返す — 呼び出し側 (trackDailyReturnOnce 等) が「送信できた時だけ
  // dedup マーカーを保存する」ために使う。
  function track(name, props) {
    if (isOptedOut()) return false;
    if (!name) return false;
    try {
      enqueue(String(name), Date.now(), (props && typeof props === 'object') ? props : {});
      return true;
    } catch (e) { return false; }
  }

  // ============================================================
  // ---- 常時購読: game_clear / acorn_earned ----
  // ============================================================
  function onStickerGranted(e) {
    if (isOptedOut()) return;
    try {
      var d = (e && e.detail) || {};
      track('game_clear', {
        game_id: d.gameId || getGameId(),
        clear_event: d.event || 'clear'
      });
    } catch (err) {}
  }

  function onAcornsChanged(e) {
    if (isOptedOut()) return;
    try {
      var d = (e && e.detail) || {};
      var delta = typeof d.delta === 'number' ? d.delta : 0;
      if (delta <= 0) return; // spend 等の負/ゼロ差分は「獲得」ではないので対象外
      var reason = String(d.reason || '');
      var m = reason.match(/^daily:(.+)$/);
      var gameId = m ? m[1] : getGameId();
      var reachedCap = false;
      try {
        if (typeof window.getDailyTotalAcorns === 'function' && typeof window.getDailyTotalCap === 'function') {
          reachedCap = window.getDailyTotalAcorns() >= window.getDailyTotalCap();
        }
      } catch (err2) {}
      track('acorn_earned', {
        game_id: gameId,
        delta: delta,
        reached_daily_cap: reachedCap
      });
    } catch (err) {}
  }

  // ============================================================
  // ---- 初回告知バナー (auto ページ限定・1回のみ) ----
  // ============================================================
  function maybeShowNotice() {
    try {
      if (lsGet(LS_NOTICE_SHOWN) === '1') return;
    } catch (e) { return; }
    lsSet(LS_NOTICE_SHOWN, '1');
    showNoticeBanner();
  }

  function showNoticeBanner() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', showNoticeBanner, { once: true });
      return;
    }
    try {
      if (document.querySelector('.pono-telemetry-notice')) return;

      var bar = document.createElement('div');
      bar.className = 'pono-telemetry-notice';
      bar.style.cssText = [
        'position:fixed', 'left:10px', 'right:10px', 'bottom:10px', 'z-index:9998',
        'margin:0 auto', 'max-width:520px',
        'background:rgba(255,255,255,0.97)', 'border-radius:16px',
        'box-shadow:0 4px 18px rgba(0,0,0,0.22)',
        'padding:10px 12px', 'display:flex', 'align-items:center', 'gap:8px',
        'flex-wrap:wrap',
        'font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN",sans-serif',
        'font-size:0.78rem', 'font-weight:700', 'color:#5D4E37',
        'transition:opacity 0.25s ease'
      ].join(';');

      var msg = document.createElement('span');
      msg.style.cssText = 'flex:1 1 200px;line-height:1.5';
      msg.textContent = 'もっと楽しく遊べるように、遊んだゲームと回数を、お名前とは結びつけずに記録しています。';
      bar.appendChild(msg);

      var detailLink = document.createElement('a');
      detailLink.href = '/privacy.html';
      detailLink.textContent = 'くわしく';
      detailLink.style.cssText = 'color:#3B82F6;font-weight:900;text-decoration:underline;white-space:nowrap';
      bar.appendChild(detailLink);

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = 'わかった';
      closeBtn.style.cssText = [
        'border:none', 'border-radius:50px', 'padding:6px 16px',
        'background:linear-gradient(135deg,#60A5FA,#3B82F6)', 'color:#fff',
        'font-family:inherit', 'font-size:0.78rem', 'font-weight:900', 'cursor:pointer',
        'white-space:nowrap'
      ].join(';');
      closeBtn.addEventListener('click', function () {
        if (bar.parentNode) bar.parentNode.removeChild(bar);
      });
      bar.appendChild(closeBtn);

      document.body.appendChild(bar);
    } catch (e) {}
  }

  // ============================================================
  // ---- 初期化 ----
  // ============================================================
  function trackDailyReturnOnce() {
    var today = todayKeyJST();
    if (lsGet(LS_LAST_DR) === today) return;
    // track() が opt-out 等で no-op だった場合はマーカーを保存しない
    // (同日中に opt-in された場合に daily_return が二度と発火しなくなる事故を防ぐ)。
    if (track('daily_return', { date_jst: today })) {
      lsSet(LS_LAST_DR, today);
    }
  }

  function trackSessionStart() {
    var displayMode = 'browser';
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        displayMode = 'pwa';
      }
    } catch (e) {}
    track('session_start', { platform: displayMode });
  }

  function init() {
    // 前回セッションの未送信キュー (IndexedDB 永続分) を読み込んでメモリキューへ
    // マージしてから flush する。
    idbLoadAll().then(function (records) {
      var seen = {};
      for (var i = 0; i < memQueue.length; i++) seen[memQueue[i]._id] = true;
      for (var j = 0; j < records.length; j++) {
        var r = records[j];
        if (r && r._id && !seen[r._id]) {
          memQueue.push(r);
          seen[r._id] = true;
        }
      }
      purgeExpired();
      trimQueue();
      flush(); // ロード時トリガー
    });

    try { window.addEventListener('online', flush); } catch (e) {}
    try { setInterval(flush, FLUSH_INTERVAL_MS); } catch (e) {}
    try {
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') flush();
      });
    } catch (e) {}

    // 常時購読 (auto 属性の有無に関わらず有効)
    try { window.addEventListener('PonoGameStickerGranted', onStickerGranted); } catch (e) {}
    try { window.addEventListener('pono-acorns-changed', onAcornsChanged); } catch (e) {}

    if (AUTO_FLAG) {
      trackSessionStart();
      trackDailyReturnOnce();
      maybeShowNotice();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // ---- export ----
  window.PonoTelemetry = {
    track: track,
    optOut: optOut,
    isOptedOut: isOptedOut,
    resetClientId: resetClientId
  };
})();
