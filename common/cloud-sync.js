/* ============================================================
   common/cloud-sync.js  (Step C)

   合言葉型クラウド同期のクライアント通信層。
   Step A (common/data-export.js) の payload 生成 / import 検証パイプラインを
   再利用し、 Cloudflare Worker の /api/savedata (POST/GET) と通信する。

   公開API (window.PonoCloudSync):
     - save()          → 現在の localStorage を payload 化 (profile 系キー除外) して
                         POST。 成功で { ok:true, passcode, expires_at } を返す。
     - load(passcode)  → GET → data-export.js の _parseImportJson (4 段防御) に通し、
                         { ok:true, parsed, expires_at } を返す (適用は data-export.js の
                         applyImport = denylist 経由で二重防御)。
     - isAvailable()   → オンライン & fetch 使用可否 (503 未設定は呼んで初めて分かる)

   方針 / セキュリティ:
     - 名前 (個人情報) はクラウドに送らない / 復元しない。 SAVE (save) と LOAD (load) の
       両方向で profile 系 4 キーを strip する (対称化):
         pono_profile / pono_profile_name / pono_player_profile_v1 / pono_hero_name
       (play.html の現行プロフィールは pono_player_profile_v1、 他ゲームは pono_profile。
        いずれも .name を含みうる。 pono_hero_name は将来の勇者名連携用の予約。
        Backend の validate.js 側にも同じ 4 キーが入る = 二重防御)
       LOAD 側にも strip を入れる理由: 細工 payload を直接 POST → GET → applyImport で
       名前が localStorage に書き戻る非対称の穴を塞ぐため。
     - GET で受けた data も _parseImportJson (4 段防御) に通し、 適用時に isImportAllowed
       (denylist) を再適用する二重防御。 細工 payload の POST→GET→localStorage 迂回を封じる。
     - エラーは network / rate_limited / not_found / not_configured / too_large /
       invalid / unknown に分類し、 UI 側 (data-export.js) が文言を出し分けられるようにする。
     - 503 (savedata 未設定 staging) は「準備中」フォールバック用に not_configured を返す。
   ============================================================ */
(function () {
  'use strict';

  // Capacitor native shell has no same-origin Worker to hit '/api/savedata' against,
  // so native/scripts/stage-www.mjs injects window.PONO_API_BASE with the absolute
  // production Worker URL. Web build: PONO_API_BASE is undefined -> '' -> unchanged
  // relative path (original behavior preserved).
  var API_BASE = (window.PONO_API_BASE || '') + '/api/savedata';
  var TIMEOUT_MS = 8000; // fetch timeout 8 秒

  // 名前 (個人情報) を保持しうるキー。 SAVE では送らず、 LOAD では復元しない (対称)。
  // Backend の validate.js 側にも同じ 4 キーが入る (二重防御)。
  var PROFILE_STRIP_EXACT = {
    'pono_profile': true,
    'pono_profile_name': true,
    'pono_player_profile_v1': true,
    'pono_hero_name': true
  };

  function isProfileKey(key) {
    return Object.prototype.hasOwnProperty.call(PROFILE_STRIP_EXACT, key);
  }

  // data (flat map) から profile 系キーを破壊的に除去。 SAVE / LOAD 両方向で対称に使う。
  function stripProfileKeys(data) {
    if (!data || typeof data !== 'object') return;
    for (var k in PROFILE_STRIP_EXACT) {
      if (!Object.prototype.hasOwnProperty.call(PROFILE_STRIP_EXACT, k)) continue;
      if (Object.prototype.hasOwnProperty.call(data, k)) {
        try { delete data[k]; } catch (_) {}
      }
    }
  }

  function isOnline() {
    try { return navigator.onLine !== false; } catch (_) { return true; }
  }

  function isAvailable() {
    return isOnline() && typeof fetch === 'function';
  }

  function fetchWithTimeout(url, options) {
    options = options || {};
    var controller = (typeof AbortController === 'function') ? new AbortController() : null;
    if (controller) options.signal = controller.signal;
    var timer = setTimeout(function () {
      try { if (controller) controller.abort(); } catch (_) {}
    }, TIMEOUT_MS);
    return fetch(url, options).then(function (res) {
      clearTimeout(timer);
      return res;
    }, function (err) {
      clearTimeout(timer);
      throw err;
    });
  }

  // ---- payload 生成 (data-export.js を再利用 + profile 除去) ----
  function buildCloudPayload() {
    var de = window.PonoDataExport;
    if (!de || typeof de._collectExportData !== 'function') {
      return null;
    }
    var collected = de._collectExportData(); // { data, count }
    var src = (collected && collected.data) ? collected.data : {};
    var data = {};
    var count = 0;
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      if (isProfileKey(k)) continue;            // ← 名前 (個人情報) を送らない
      if (typeof src[k] !== 'string') continue;
      data[k] = src[k];
      count++;
    }
    var appVersion = 0;
    try {
      if (typeof de._getAppVersion === 'function') appVersion = de._getAppVersion();
    } catch (_) {}
    return {
      schema_version: 1,
      app_version: appVersion,
      exported_at: new Date().toISOString(),
      items_count: count,
      data: data
      // profile_name はクラウドに送らない (故意に省略)
    };
  }

  // ---- passcode 正規化 & 形式チェック ----
  // ひらがな 3 語 (各 1-12 文字、 長音符 ー を含む) + ハイフン + 4 桁数字
  var PASSCODE_RE = /^[ぁ-ゖー]{1,12}-[ぁ-ゖー]{1,12}-[ぁ-ゖー]{1,12}-\d{4}$/;

  function normalizePasscode(raw) {
    var s = String(raw == null ? '' : raw);
    // 空白 (半角/全角) 除去
    s = s.replace(/[\s　]/g, '');
    // 全角数字 → 半角
    s = s.replace(/[０-９]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30);
    });
    // 各種ダッシュ → ASCII ハイフン (語中の長音符 U+30FC は変換しない)
    s = s.replace(/[－‐‑‒–—―−]/g, '-');
    return s;
  }

  function isValidPasscode(passcode) {
    return PASSCODE_RE.test(passcode);
  }

  function parseRetryAfter(res) {
    try {
      var h = (res.headers && res.headers.get) ? res.headers.get('Retry-After') : null;
      if (h) {
        var n = parseInt(h, 10);
        if (!isNaN(n) && n > 0) return n;
      }
    } catch (_) {}
    return 0;
  }

  // ---- SAVE ----
  function save() {
    if (!isOnline() || typeof fetch !== 'function') {
      return Promise.resolve({ ok: false, error: 'network' });
    }
    var payload = buildCloudPayload();
    if (!payload) {
      return Promise.resolve({ ok: false, error: 'unknown' });
    }
    var body;
    try {
      body = JSON.stringify(payload);
    } catch (_) {
      return Promise.resolve({ ok: false, error: 'unknown' });
    }
    return fetchWithTimeout(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
      cache: 'no-store'
    }).then(function (res) {
      return handleSaveResponse(res);
    }, function () {
      return { ok: false, error: 'network' };
    });
  }

  function handleSaveResponse(res) {
    var status = res.status;
    if (status === 200) {
      return res.json().then(function (json) {
        if (json && json.ok && typeof json.passcode === 'string') {
          return { ok: true, passcode: json.passcode, expires_at: json.expires_at || '' };
        }
        return { ok: false, error: 'unknown' };
      }, function () {
        return { ok: false, error: 'unknown' };
      });
    }
    if (status === 503) return { ok: false, error: 'not_configured' };
    if (status === 413) return { ok: false, error: 'too_large' };
    if (status === 429) return { ok: false, error: 'rate_limited', retryAfter: parseRetryAfter(res) };
    if (status === 400) return { ok: false, error: 'invalid' };
    return { ok: false, error: 'unknown' };
  }

  // ---- LOAD ----
  function load(passcode) {
    var norm = normalizePasscode(passcode);
    if (!isValidPasscode(norm)) {
      return Promise.resolve({ ok: false, error: 'invalid' });
    }
    if (!isOnline() || typeof fetch !== 'function') {
      return Promise.resolve({ ok: false, error: 'network' });
    }
    var url = API_BASE + '/' + encodeURIComponent(norm); // ひらがなを URL エンコード
    return fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    }).then(function (res) {
      return handleLoadResponse(res);
    }, function () {
      return { ok: false, error: 'network' };
    });
  }

  function handleLoadResponse(res) {
    var status = res.status;
    if (status === 200) {
      return res.json().then(function (json) {
        if (!json || !json.ok) return { ok: false, error: 'not_found' };
        var de = window.PonoDataExport;
        if (!de || typeof de._parseImportJson !== 'function') {
          return { ok: false, error: 'unknown' };
        }
        var parsed;
        try {
          // Step A の 4 段防御 (parse + value string-only sanitize) に通す。
          // denylist は適用時 (applyImport / isImportAllowed) に再適用される。
          parsed = de._parseImportJson(JSON.stringify(json));
        } catch (_) {
          return { ok: false, error: 'invalid' };
        }
        // LOAD 側 profile strip (SAVE と対称)。 細工 payload で名前が書き戻るのを防ぐ。
        stripProfileKeys(parsed.data);
        parsed._cloud = true; // data-export.js 側の preview / toast 分岐用
        return { ok: true, parsed: parsed, expires_at: json.expires_at || '' };
      }, function () {
        return { ok: false, error: 'unknown' };
      });
    }
    if (status === 400) return { ok: false, error: 'invalid' };
    if (status === 404) return { ok: false, error: 'not_found' };
    if (status === 503) return { ok: false, error: 'not_configured' };
    if (status === 429) return { ok: false, error: 'rate_limited', retryAfter: parseRetryAfter(res) };
    return { ok: false, error: 'unknown' };
  }

  // ---- 公開 ----
  window.PonoCloudSync = {
    save: save,
    load: load,
    isAvailable: isAvailable,
    // 内部テスト・診断用
    _normalizePasscode: normalizePasscode,
    _isValidPasscode: isValidPasscode,
    _buildCloudPayload: buildCloudPayload
  };
})();
