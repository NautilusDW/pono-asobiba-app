/* ============================================================
   common/data-export.js  (Step A)

   セーブデータ JSON エクスポート/インポート機能。
   保護者がブラウザ変更/端末乗り換え時にセーブデータを引き継げるよう、
   localStorage の関連キーを丸ごと JSON にエクスポート/インポートする。

   公開API (window.PonoDataExport):
     - exportData()        → 即時 JSON 生成 + ファイル DL
     - importData(file)    → File オブジェクトを受け取り、検証 + 保護者ゲート + 確認 + 上書き
     - openModal()         → データ管理モーダルを表示 (足し算ゲート経由)

   セキュリティ層 (4 段防御):
     1. JSON.parse 結果は Object.create(null) で受け、各キーに hasOwnProperty チェック
     2. キーを正規表現バリデート (__proto__, constructor, prototype 等を弾く)
     3. value 型は string のみ accept (number/object/null は reject)
     4. denylist で tier/admin/unlocked を import 時 skip

   メモ:
     - sw.js は network-first 単独で precache list を持たない設計なので、
       CACHE_VERSION の bump のみで配信される。
     - 既存 admin/ の NPC position export/import パターンと
       common/sw-update.js / common/tier.js / common/acorns.js の設計を踏襲。
   ============================================================ */
(function () {
  'use strict';

  // ---- 定数 ----

  // Export 対象 (allowlist) — pono_* + 明示追加
  var KEY_ALLOW_PATTERN = /^pono_[a-z0-9_]+$/;
  var EXPLICIT_ALLOW = [
    'bowling_best',
    'narration_mode',
    'narration_rate',
    'narration_volume'
  ];

  // Export 時 deny (除外) — 開発・デバッグ用
  var EXPORT_DENY_PREFIXES = [
    'pono_capture_',
    'pono_debug_',
    'pono_tts_',
    'pono_admin_'
  ];

  // Import 時 deny (skip、 現在値を保持) — tier 詐欺対策
  // tier 系 + unlocked 系 (絶対防御) + 開発・デバッグ系 (二重防御)
  var IMPORT_DENY_EXACT = [
    'pono_premium',
    'pono_sub_active',
    'pono_unlocked_sea',
    'pono_unlocked_furn',
    'pono_unlocked_wall',
    'pono_unlocked_floor',
    'pono_unlocked_bg',
    'pono_premium_bonus'
  ];
  var IMPORT_DENY_PREFIXES = [
    'pono_capture_',
    'pono_debug_',
    'pono_tts_',
    'pono_admin_'
  ];

  // Import 時 preserve-if-absent — record にキーが無い場合のみ現値を維持
  // (旧バージョン export 等で未対応キーが localStorage.clear() で静かに 0 化されるのを防ぐ)
  var CORE_PRESERVE_IF_ABSENT = [
    'pono_acorns',
    'pono_stats',
    'pono_stamp_log',
    'pono_thankyou'
  ];

  // セキュリティ: キー自体の正規表現バリデート (allowlist より緩いが、
  // __proto__ / constructor / prototype 等を弾く一次フィルタ)
  var KEY_SAFE_PATTERN = /^[a-z][a-z0-9_]*$/;

  // 危険キー名 (defense-in-depth)
  var FORBIDDEN_KEY_NAMES = {
    __proto__: true,
    constructor: true,
    prototype: true,
    hasOwnProperty: true
  };

  var SCHEMA_VERSION = 1;
  var MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
  var FILE_PICK_TIMEOUT_MS = 60 * 1000;

  // ---- ユーティリティ ----

  function getAppVersion() {
    // sw-update.js が exposed する SW version か、 メタタグから読む。
    // 取れない場合は 0。
    try {
      if (window.PonoSwUpdate && typeof window.PonoSwUpdate.getVersion === 'function') {
        var v = window.PonoSwUpdate.getVersion();
        if (typeof v === 'number' && v > 0) return v;
      }
    } catch (_) {}
    // フォールバック: meta 経由
    try {
      var meta = document.querySelector('meta[name="pono-app-version"]');
      if (meta) {
        var n = parseInt(meta.getAttribute('content'), 10);
        if (!isNaN(n) && n > 0) return n;
      }
    } catch (_) {}
    return 0;
  }

  function getProfileName() {
    try {
      var n = localStorage.getItem('pono_profile_name');
      if (n) return String(n);
    } catch (_) {}
    return '';
  }

  function isExportAllowed(key) {
    if (!key || typeof key !== 'string') return false;
    // Export deny 優先
    for (var i = 0; i < EXPORT_DENY_PREFIXES.length; i++) {
      if (key.indexOf(EXPORT_DENY_PREFIXES[i]) === 0) return false;
    }
    if (KEY_ALLOW_PATTERN.test(key)) return true;
    for (var j = 0; j < EXPLICIT_ALLOW.length; j++) {
      if (key === EXPLICIT_ALLOW[j]) return true;
    }
    return false;
  }

  function isImportAllowed(key) {
    if (!key || typeof key !== 'string') return false;
    // 1. キー名安全性 (forbidden names)
    if (Object.prototype.hasOwnProperty.call(FORBIDDEN_KEY_NAMES, key)) return false;
    // 2. キーフォーマット validate
    if (!KEY_SAFE_PATTERN.test(key)) return false;
    // 3. Import deny exact
    for (var i = 0; i < IMPORT_DENY_EXACT.length; i++) {
      if (key === IMPORT_DENY_EXACT[i]) return false;
    }
    // 4. Import deny prefix
    for (var j = 0; j < IMPORT_DENY_PREFIXES.length; j++) {
      if (key.indexOf(IMPORT_DENY_PREFIXES[j]) === 0) return false;
    }
    // 5. allowlist (pono_* または明示)
    if (KEY_ALLOW_PATTERN.test(key)) return true;
    for (var k = 0; k < EXPLICIT_ALLOW.length; k++) {
      if (key === EXPLICIT_ALLOW[k]) return true;
    }
    return false;
  }

  // ---- Export ----

  function collectExportData() {
    var data = {};
    var count = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!isExportAllowed(key)) continue;
        var val = localStorage.getItem(key);
        if (typeof val !== 'string') continue;
        data[key] = val;
        count++;
      }
    } catch (e) {
      console.warn('[PonoDataExport] localStorage iteration failed:', e);
    }
    return { data: data, count: count };
  }

  function formatDateForFilename(d) {
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function downloadBlob(blob, filename) {
    try {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        try { document.body.removeChild(a); } catch (_) {}
        try { URL.revokeObjectURL(url); } catch (_) {}
      }, 1500);
      return true;
    } catch (e) {
      console.error('[PonoDataExport] download failed:', e);
      return false;
    }
  }

  function exportData() {
    var collected = collectExportData();
    var now = new Date();
    var payload = {
      schema_version: SCHEMA_VERSION,
      app_version: getAppVersion(),
      exported_at: now.toISOString(),
      profile_name: getProfileName(),
      items_count: collected.count,
      data: collected.data
    };
    var json;
    try {
      json = JSON.stringify(payload, null, 2);
    } catch (e) {
      console.error('[PonoDataExport] JSON.stringify failed:', e);
      showToast('保存に しっぱい しました。もう いちど お試しください。', 'error');
      return false;
    }
    var filename = 'pono-savedata-' + formatDateForFilename(now) + '.json';
    var blob = new Blob([json], { type: 'application/json' });
    var ok = downloadBlob(blob, filename);
    if (ok) {
      showToast('保存しました', 'success', 'ダウンロードフォルダに保存されました。大切に保管してください。');
    } else {
      showToast('保存に しっぱい しました', 'error');
    }
    return ok;
  }

  // ---- Import ----

  // 4 段防御 (1): JSON.parse を Object.create(null) ベースに受け、各キーに hasOwnProperty チェック
  function parseImportJson(text) {
    var raw;
    try {
      raw = JSON.parse(text);
    } catch (e) {
      throw new Error('JSON の よみとりに しっぱい しました');
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('ファイルの けいしきが ただしくありません');
    }
    // 必須フィールド検証
    if (!Object.prototype.hasOwnProperty.call(raw, 'schema_version')) {
      throw new Error('schema_version が ありません');
    }
    if (!Object.prototype.hasOwnProperty.call(raw, 'app_version')) {
      throw new Error('app_version が ありません');
    }
    if (!Object.prototype.hasOwnProperty.call(raw, 'data')) {
      throw new Error('data が ありません');
    }
    var sv = raw.schema_version;
    if (typeof sv !== 'number' || sv < 1) {
      throw new Error('schema_version が ふくしんです');
    }
    var data = raw.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('data の けいしきが ただしくありません');
    }
    // Object.create(null) ベースに sanitize
    var safeData = Object.create(null);
    for (var key in data) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      // 4 段防御 (3): value 型は string のみ accept
      var v = data[key];
      if (typeof v !== 'string') continue;
      safeData[key] = v;
    }
    return {
      schema_version: sv,
      app_version: (typeof raw.app_version === 'number') ? raw.app_version : 0,
      exported_at: (typeof raw.exported_at === 'string') ? raw.exported_at : '',
      profile_name: (typeof raw.profile_name === 'string') ? raw.profile_name : '',
      items_count: (typeof raw.items_count === 'number') ? raw.items_count : 0,
      data: safeData,
      _futureSchema: (sv > SCHEMA_VERSION)
    };
  }

  // インメモリ snapshot — quota 突破時に二重に詰まないよう sessionStorage は使わない
  function snapshotLocalStorage() {
    var snap = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k) continue;
        var v = localStorage.getItem(k);
        snap.push([k, v]);
      }
    } catch (e) {
      console.warn('[PonoDataExport] snapshot failed:', e);
    }
    return snap;
  }

  function restoreLocalStorage(snapshot) {
    try {
      localStorage.clear();
    } catch (_) {}
    for (var i = 0; i < snapshot.length; i++) {
      var pair = snapshot[i];
      try {
        localStorage.setItem(pair[0], pair[1]);
      } catch (_) {
        // restore 中の quota は望みなしなので諦める (せめて部分復元)
      }
    }
  }

  function applyImport(parsed) {
    // インメモリ snapshot
    var snap = snapshotLocalStorage();

    // 既存の deny キーの現値を退避 (上書きしない)
    var preserved = Object.create(null);
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k) continue;
        // import 時に書き込まないキー = 現値を保持
        if (!isImportAllowed(k)) {
          preserved[k] = localStorage.getItem(k);
        }
      }
    } catch (_) {}

    // record に無いコア進捗キーは非破壊的に維持 (preserve-if-absent)
    // 例: pono_acorns (どんぐり) 等、 import データ側に未対応でキー自体が無い場合に
    // localStorage.clear() で静かに 0 化されるのを防ぐ
    var coreBackup = Object.create(null);
    try {
      for (var ci = 0; ci < CORE_PRESERVE_IF_ABSENT.length; ci++) {
        var ck = CORE_PRESERVE_IF_ABSENT[ci];
        if (!(ck in parsed.data)) {
          var cv = localStorage.getItem(ck);
          if (cv != null) coreBackup[ck] = cv;
        }
      }
    } catch (_) {}

    // クリア (deny 含む全消し → 後で deny は preserved から戻す)
    try {
      localStorage.clear();
    } catch (e) {
      // クリアできなければ snapshot 復元して失敗扱い
      restoreLocalStorage(snap);
      throw new Error('データの しょきかに しっぱい しました');
    }

    // deny キーの preserved を最初に書き戻す
    var writeErr = null;
    for (var pk in preserved) {
      if (!Object.prototype.hasOwnProperty.call(preserved, pk)) continue;
      try {
        if (preserved[pk] != null) localStorage.setItem(pk, preserved[pk]);
      } catch (e) {
        writeErr = e;
        break;
      }
    }
    if (writeErr) {
      // 書き戻し失敗 → snapshot から復元 (deny 上書き完了は局所的ロス)
      restoreLocalStorage(snap);
      throw new Error('データの 書きこみに しっぱい しました (deny 復元)');
    }

    // import data を書く (allowed only)
    var data = parsed.data;
    var written = 0;
    for (var key in data) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      // 4 段防御 (4): import deny 適用
      if (!isImportAllowed(key)) continue;
      try {
        localStorage.setItem(key, data[key]);
        written++;
      } catch (e) {
        // QuotaExceededError → 即中断 → snapshot から復元
        console.error('[PonoDataExport] setItem quota / error:', e);
        restoreLocalStorage(snap);
        throw new Error('データの 書きこみに しっぱい しました (ようりょう 不足の おそれ)');
      }
    }

    // preserve-if-absent: record に無かったコア進捗キーを書き戻す
    for (var pck in coreBackup) {
      if (!Object.prototype.hasOwnProperty.call(coreBackup, pck)) continue;
      try {
        localStorage.setItem(pck, coreBackup[pck]);
      } catch (_) {
        // 書き戻し失敗は致命的ではない (コア進捗の非破壊維持が目的のため黙って諦める)
      }
    }

    return { written: written, preserved: Object.keys(preserved).length };
  }

  // ---- 保護者ゲート (足し算: たすと 10 になる ふたつの かずは？) ----

  function generateAdditionGate() {
    // 正解: 1 + 9, 2 + 8, 3 + 7, 4 + 6, 5 + 5 のいずれか
    var pairs = [[1, 9], [2, 8], [3, 7], [4, 6], [5, 5]];
    var correct = pairs[Math.floor(Math.random() * pairs.length)];
    var correctStr = correct[0] + ' と ' + correct[1];

    // 不正解 (合計 != 10) を 2 つ作る
    var wrong = [];
    var attempts = 0;
    while (wrong.length < 2 && attempts < 50) {
      attempts++;
      var a = 1 + Math.floor(Math.random() * 9);
      var b = 1 + Math.floor(Math.random() * 9);
      if (a + b === 10) continue;
      var s = a + ' と ' + b;
      if (s === correctStr) continue;
      var dup = false;
      for (var i = 0; i < wrong.length; i++) {
        if (wrong[i] === s) { dup = true; break; }
      }
      if (dup) continue;
      wrong.push(s);
    }
    // v1672 (review fix): 50 試行で wrong が埋まらなかった場合の fallback。
    // 「undefined」 ボタンが出る事故を防ぐため、 合計 10 にならない安全な定数を順に補充。
    var WRONG_FALLBACKS = ['3 と 5', '2 と 4', '6 と 1', '7 と 2', '8 と 5'];
    for (var f = 0; f < WRONG_FALLBACKS.length && wrong.length < 2; f++) {
      var fb = WRONG_FALLBACKS[f];
      if (fb === correctStr) continue;
      var already = false;
      for (var w = 0; w < wrong.length; w++) {
        if (wrong[w] === fb) { already = true; break; }
      }
      if (!already) wrong.push(fb);
    }

    // シャッフル
    var choices = [correctStr, wrong[0], wrong[1]];
    for (var k = choices.length - 1; k > 0; k--) {
      var r = Math.floor(Math.random() * (k + 1));
      var tmp = choices[k]; choices[k] = choices[r]; choices[r] = tmp;
    }
    return { question: 'たすと 10 になる ふたつの かずは？', choices: choices, correct: correctStr };
  }

  // ---- UI: モーダル / トースト / ダイアログ ----

  function ensureStyleInjected() {
    if (document.getElementById('pono-data-export-style')) return;
    var css = [
      '.pono-de-modal{position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:20px;font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN","BIZ UDPGothic",sans-serif;}',
      '.pono-de-modal[hidden]{display:none;}',
      '.pono-de-card{background:#FFFBEE;border:4px solid #F8C56D;border-radius:18px;padding:22px 22px 18px;max-width:420px;width:100%;box-shadow:0 12px 32px rgba(0,0,0,.3);max-height:calc(100dvh - 40px);overflow-y:auto;color:#5D4E37;}',
      '.pono-de-card h3{font-size:1.2rem;font-weight:900;color:#F2915A;text-align:center;margin:0 0 14px;}',
      '.pono-de-card p{font-size:.92rem;line-height:1.6;text-align:center;margin:0 0 12px;}',
      '.pono-de-card p.sub{font-size:.82rem;color:#8a7359;}',
      '.pono-de-block{background:#fff;border:2px dashed #F8C56D;border-radius:14px;padding:14px 12px;margin-bottom:12px;}',
      '.pono-de-block h4{font-size:1rem;font-weight:900;color:#5D4E37;text-align:center;margin:0 0 8px;}',
      '.pono-de-block .desc{font-size:.78rem;color:#8a7359;text-align:center;margin-bottom:10px;line-height:1.5;}',
      '.pono-de-btn{display:block;width:100%;padding:12px;border:none;border-radius:50px;background:linear-gradient(180deg,#FFD84D,#F5A800);color:#5C3A00;font-family:inherit;font-size:.95rem;font-weight:900;cursor:pointer;box-shadow:0 3px 0 #B87200;}',
      '.pono-de-btn:active{transform:translateY(2px);box-shadow:0 1px 0 #B87200;}',
      '.pono-de-btn.secondary{background:linear-gradient(180deg,#fff,#f4ecd8);color:#5D4E37;box-shadow:0 3px 0 #c0a877;border:2px solid #c0a877;}',
      '.pono-de-btn.danger{background:linear-gradient(180deg,#FF8A65,#D9573A);color:#fff;box-shadow:0 3px 0 #8a3a23;}',
      '.pono-de-close{display:block;width:100%;margin-top:8px;padding:10px;border:none;border-radius:50px;background:#eee;color:#5D4E37;font-family:inherit;font-size:.9rem;font-weight:800;cursor:pointer;}',
      '.pono-de-gate-choice{display:flex;gap:8px;justify-content:center;margin:10px 0 4px;flex-wrap:wrap;}',
      '.pono-de-gate-choice button{padding:12px 16px;font:900 1.05rem/1 "Zen Maru Gothic",sans-serif;border:2px solid #F8C56D;border-radius:14px;background:#fff;color:#5D4E37;cursor:pointer;min-width:88px;}',
      '.pono-de-gate-choice button:active{transform:translateY(1px);background:#FFFBEE;}',
      '.pono-de-status{min-height:1.4em;font-size:.82rem;color:#D9573A;text-align:center;margin-top:6px;font-weight:800;}',
      '.pono-de-preview{background:#FFFBEE;border:1.5px solid #F8C56D;border-radius:10px;padding:10px;margin:8px 0;text-align:left;}',
      '.pono-de-preview dl{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;margin:0;font-size:.82rem;}',
      '.pono-de-preview dt{color:#8a7359;font-weight:700;}',
      '.pono-de-preview dd{margin:0;color:#5D4E37;font-weight:800;word-break:break-all;}',
      '.pono-de-toast{position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:6000;background:#fff;border:3px solid #F8C56D;border-radius:14px;padding:12px 18px;box-shadow:0 8px 24px rgba(0,0,0,.25);font-family:inherit;color:#5D4E37;max-width:380px;text-align:center;}',
      '.pono-de-toast.error{border-color:#D9573A;}',
      '.pono-de-toast .ttl{font-weight:900;font-size:1rem;}',
      '.pono-de-toast .sub{font-size:.78rem;color:#8a7359;margin-top:4px;}',
      '.pono-de-spinner{display:inline-block;width:18px;height:18px;border:3px solid #F8C56D;border-top-color:transparent;border-radius:50%;animation:pono-de-spin 0.8s linear infinite;vertical-align:middle;}',
      '@keyframes pono-de-spin{to{transform:rotate(360deg);}}',
      /* Step C: クラウド同期 UI */
      '.pono-de-collapse{display:block;width:100%;margin:4px 0 12px;padding:9px;border:none;border-radius:12px;background:transparent;color:#8a7359;font-family:inherit;font-size:.82rem;font-weight:800;cursor:pointer;text-align:center;}',
      '.pono-de-collapse:active{background:#f4ecd8;}',
      '.pono-de-input{display:block;width:100%;box-sizing:border-box;padding:12px 10px;border:2px solid #F8C56D;border-radius:12px;background:#fff;color:#5D4E37;font-family:inherit;font-size:1.05rem;font-weight:800;text-align:center;margin:6px 0 10px;letter-spacing:.02em;}',
      '.pono-de-input:focus{outline:none;border-color:#F2915A;}',
      '.pono-de-passcode{display:block;background:#FFFBEE;border:3px dashed #F2915A;border-radius:14px;padding:16px 12px;margin:12px 0;font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN",sans-serif;font-size:1.7rem;line-height:1.35;font-weight:900;color:#C4562A;text-align:center;word-break:break-all;letter-spacing:.03em;}',
      '.pono-de-warn{font-size:.82rem;font-weight:900;color:#D9573A;text-align:center;margin:6px 0 4px;line-height:1.5;}',
      '.pono-de-btn.mini{display:inline-block;width:auto;padding:10px 16px;margin:0;font-size:.86rem;}',
      '.pono-de-btnrow{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:8px 0 4px;}'
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'pono-data-export-style';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function showToast(title, level, sub) {
    ensureStyleInjected();
    var t = document.createElement('div');
    t.className = 'pono-de-toast' + (level === 'error' ? ' error' : '');
    var ttl = document.createElement('div');
    ttl.className = 'ttl';
    ttl.textContent = title;
    t.appendChild(ttl);
    if (sub) {
      var s = document.createElement('div');
      s.className = 'sub';
      s.textContent = sub;
      t.appendChild(s);
    }
    document.body.appendChild(t);
    setTimeout(function () {
      try { document.body.removeChild(t); } catch (_) {}
    }, level === 'error' ? 4000 : 3200);
  }

  // 汎用モーダル factory
  function makeModal() {
    ensureStyleInjected();
    var modal = document.createElement('div');
    modal.className = 'pono-de-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    var card = document.createElement('div');
    card.className = 'pono-de-card';
    modal.appendChild(card);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        try { document.body.removeChild(modal); } catch (_) {}
      }
    });
    return { modal: modal, card: card };
  }

  // Step C: モーダルを 2 セクション化。
  //   かんたん（あいことば / クラウド）: ☁ 保存 / ☁ ロード
  //   くわしい方向け（折り畳み）        : ファイルで 保存 / ロード (Step A の ①②)
  // opts.prefer === 'load' の時 (「以前あそんだことがある方」 導線) は
  //   クラウドの「ロード」ボタンを最上段に置く。
  function openModal(opts) {
    opts = opts || {};
    var preferLoad = (opts.prefer === 'load');
    var ui = makeModal();
    var card = ui.card;
    card.innerHTML = '';

    var h = document.createElement('h3');
    h.textContent = 'データかんり';
    card.appendChild(h);

    var note = document.createElement('p');
    note.className = 'sub';
    note.textContent = 'きしゅへんこうや、 ブラウザを かえるときに つかえます。';
    card.appendChild(note);

    var hasCloud = !!(window.PonoCloudSync && typeof window.PonoCloudSync.save === 'function');

    // ── かんたん（あいことば / クラウド）──
    if (hasCloud) {
      var cloudBlock = document.createElement('div');
      cloudBlock.className = 'pono-de-block';
      var cloudH = document.createElement('h4');
      cloudH.textContent = 'かんたん（あいことば）';
      cloudBlock.appendChild(cloudH);
      var cloudDesc = document.createElement('div');
      cloudDesc.className = 'desc';
      cloudDesc.textContent = 'ファイルを つかわずに、 「あいことば」だけで べつの たんまつに ひきつげます。';
      cloudBlock.appendChild(cloudDesc);

      var cloudSaveBtn = document.createElement('button');
      cloudSaveBtn.type = 'button';
      cloudSaveBtn.textContent = '☁ クラウドに 保存';
      cloudSaveBtn.addEventListener('click', function () {
        startCloudSaveFlow(ui.modal);
      });

      var cloudLoadBtn = document.createElement('button');
      cloudLoadBtn.type = 'button';
      cloudLoadBtn.textContent = '☁ クラウドから ロード';
      cloudLoadBtn.addEventListener('click', function () {
        startCloudLoadFlow(ui.modal);
      });

      if (preferLoad) {
        cloudLoadBtn.className = 'pono-de-btn';
        cloudSaveBtn.className = 'pono-de-btn secondary';
        cloudSaveBtn.style.marginTop = '8px';
        cloudBlock.appendChild(cloudLoadBtn);
        cloudBlock.appendChild(cloudSaveBtn);
      } else {
        cloudSaveBtn.className = 'pono-de-btn';
        cloudLoadBtn.className = 'pono-de-btn secondary';
        cloudLoadBtn.style.marginTop = '8px';
        cloudBlock.appendChild(cloudSaveBtn);
        cloudBlock.appendChild(cloudLoadBtn);
      }
      card.appendChild(cloudBlock);
    }

    // ── くわしい方向け（ファイル）── クラウドがある時は折り畳み
    var collapsible = hasCloud;
    var fileBlock = document.createElement('div');
    fileBlock.className = 'pono-de-block';
    var fileH = document.createElement('h4');
    fileH.textContent = 'ファイルで 保存 / ロード';
    fileBlock.appendChild(fileH);
    var fileDesc = document.createElement('div');
    fileDesc.className = 'desc';
    fileDesc.innerHTML =
      'データを ファイル（JSON）として ほぞん / よみこみ します。' +
      '<br><span style="color:#D9573A;font-weight:800;">ロードすると いまの データは うえがき されます。</span>';
    fileBlock.appendChild(fileDesc);

    var exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'pono-de-btn secondary';
    exportBtn.textContent = 'ファイルで 保存';
    exportBtn.addEventListener('click', function () {
      exportData();
    });
    fileBlock.appendChild(exportBtn);

    var importBtn = document.createElement('button');
    importBtn.type = 'button';
    importBtn.className = 'pono-de-btn secondary';
    importBtn.style.marginTop = '8px';
    importBtn.textContent = 'ファイルで ロード';
    importBtn.addEventListener('click', function () {
      startImportFlow(ui.modal);
    });
    fileBlock.appendChild(importBtn);

    if (collapsible) {
      var COLLAPSED = '▸ くわしい方向け（ファイルで 保存 / ロード）';
      var EXPANDED = '▾ くわしい方向け（ファイルで 保存 / ロード）';
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'pono-de-collapse';
      toggle.textContent = COLLAPSED;
      toggle.setAttribute('aria-expanded', 'false');
      fileBlock.hidden = true;
      toggle.addEventListener('click', function () {
        var show = fileBlock.hidden;
        fileBlock.hidden = !show;
        toggle.textContent = show ? EXPANDED : COLLAPSED;
        toggle.setAttribute('aria-expanded', show ? 'true' : 'false');
      });
      card.appendChild(toggle);
    }
    card.appendChild(fileBlock);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'pono-de-close';
    closeBtn.textContent = 'とじる';
    closeBtn.addEventListener('click', function () {
      try { document.body.removeChild(ui.modal); } catch (_) {}
    });
    card.appendChild(closeBtn);

    document.body.appendChild(ui.modal);
  }

  // ============================================================
  // Step C: クラウド (あいことば) フロー
  // ============================================================

  // rate-limit の待ち時間を Retry-After(秒) から やさしい日本語に。
  // サーバーは 60 / 300 / 900 / 86400 秒 (24h fail-lock) を返しうる。
  function rateLimitMessage(res) {
    var ra = (res && typeof res.retryAfter === 'number') ? res.retryAfter : 0;
    if (ra >= 86400) return 'たくさん ためしたので、 きょうは おやすみです。 あした もういちど おためしください。';
    if (ra >= 3600) return 'こんざつしています。 やく ' + Math.round(ra / 3600) + 'じかん たってから もういちど おためしください。';
    if (ra >= 60) return 'しばらくたってから もういちど おためしください（やく ' + Math.round(ra / 60) + 'ふん）。';
    if (ra > 0) return 'すこし まってから もういちど おためしください。';
    return 'しばらくたってから もういちど おためしください（5ふん）。';
  }

  function cloudErrorMessage(res, mode) {
    switch (res && res.error) {
      case 'rate_limited':
        return rateLimitMessage(res);
      case 'not_configured':
        return mode === 'load'
          ? 'クラウドは じゅんびちゅうです。「ファイルで ロード」を おつかいください。'
          : 'クラウドは じゅんびちゅうです。「ファイルで 保存」を おつかいください。';
      case 'network':
        return mode === 'load'
          ? 'クラウドに つながりません。「ファイルで ロード」を おためしください。'
          : 'クラウドに つながりません。「ファイルで 保存」を おためしください。';
      case 'too_large':
        return 'データが おおきすぎて クラウドに ほぞんできません。「ファイルで 保存」を おつかいください。';
      case 'not_found':
        return 'あいことばが ちがうみたい。 その あいことばの データが みつかりません。 もじを かくにんしてね。';
      case 'invalid':
        return mode === 'load'
          ? 'あいことばの けいしきが ちがうみたい。 ひらがな3つ - すうじ4つ を かくにんしてね。'
          : 'クラウドに ほぞんできませんでした。「ファイルで 保存」を おつかいください。';
      default:
        return mode === 'load'
          ? 'クラウドから よみこめませんでした。「ファイルで ロード」を おためしください。'
          : 'クラウドに ほぞんできませんでした。「ファイルで 保存」を おためしください。';
    }
  }

  function renderCloudSpinner(card, msg) {
    card.innerHTML = '';
    var h = document.createElement('h3');
    h.textContent = 'クラウド';
    card.appendChild(h);
    var p = document.createElement('p');
    var sp = document.createElement('span');
    sp.className = 'pono-de-spinner';
    p.appendChild(sp);
    var t = document.createElement('span');
    t.textContent = ' ' + msg;
    p.appendChild(t);
    card.appendChild(p);
  }

  function copyToClipboard(text, cb) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { cb(true); },
          function () { cb(fallbackCopy(text)); }
        );
        return;
      }
    } catch (_) {}
    cb(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      try { document.body.removeChild(ta); } catch (_) {}
      return ok;
    } catch (_) { return false; }
  }

  // ---- クラウド保存 ----
  function startCloudSaveFlow(parentModal) {
    try { if (parentModal) document.body.removeChild(parentModal); } catch (_) {}
    var ui = makeModal();
    renderCloudSpinner(ui.card, 'クラウドに ほぞん しています…');
    document.body.appendChild(ui.modal);

    var api = window.PonoCloudSync;
    if (!api || typeof api.save !== 'function') {
      renderCloudSaveError(ui, { error: 'not_configured' });
      return;
    }
    api.save().then(function (res) {
      if (res && res.ok) {
        renderCloudSaveSuccess(ui, res.passcode);
      } else {
        renderCloudSaveError(ui, res || { error: 'unknown' });
      }
    }, function () {
      renderCloudSaveError(ui, { error: 'network' });
    });
  }

  function renderCloudSaveSuccess(ui, passcode) {
    var card = ui.card;
    card.innerHTML = '';
    var h = document.createElement('h3');
    h.textContent = 'あいことば';
    card.appendChild(h);

    var p = document.createElement('p');
    p.textContent = 'この「あいことば」を メモや メールで のこしてください。';
    card.appendChild(p);

    var code = document.createElement('div');
    code.className = 'pono-de-passcode';
    code.textContent = passcode;
    card.appendChild(code);

    var warn = document.createElement('p');
    warn.className = 'pono-de-warn';
    warn.textContent = '⚠ あいことばを わすれると ふっきゅうできません。';
    card.appendChild(warn);

    var status = document.createElement('div');
    status.className = 'pono-de-status';
    status.style.color = '#3a8a3a';

    var row = document.createElement('div');
    row.className = 'pono-de-btnrow';

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'pono-de-btn mini';
    copyBtn.textContent = 'コピー';
    copyBtn.addEventListener('click', function () {
      copyToClipboard(passcode, function (ok) {
        status.textContent = ok ? 'コピーしました' : 'コピーできませんでした。 メモしてください。';
      });
    });
    row.appendChild(copyBtn);

    var mailBtn = document.createElement('button');
    mailBtn.type = 'button';
    mailBtn.className = 'pono-de-btn mini secondary';
    mailBtn.textContent = 'メールで送る';
    mailBtn.addEventListener('click', function () {
      var subject = 'ポノのあそびば あいことば';
      var body = 'ポノのあそびばの「あいことば」です。\n\n' + passcode +
        '\n\nべつの たんまつで「クラウドから ロード」に いれると、 つづきから あそべます。\n' +
        '※ わすれると ふっきゅうできません。';
      var href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      try { window.location.href = href; } catch (_) {}
    });
    row.appendChild(mailBtn);

    card.appendChild(row);
    card.appendChild(status);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'pono-de-close';
    closeBtn.textContent = 'とじる';
    closeBtn.addEventListener('click', function () {
      try { document.body.removeChild(ui.modal); } catch (_) {}
    });
    card.appendChild(closeBtn);
  }

  function renderCloudSaveError(ui, res) {
    var card = ui.card;
    card.innerHTML = '';
    var h = document.createElement('h3');
    h.textContent = 'クラウド';
    card.appendChild(h);

    var p = document.createElement('p');
    p.textContent = cloudErrorMessage(res, 'save');
    card.appendChild(p);

    var showFallback = (res.error === 'not_configured' || res.error === 'network' ||
      res.error === 'too_large' || res.error === 'invalid' || res.error === 'unknown');
    if (showFallback) {
      var fbBtn = document.createElement('button');
      fbBtn.type = 'button';
      fbBtn.className = 'pono-de-btn';
      fbBtn.textContent = 'ファイルで 保存する';
      fbBtn.addEventListener('click', function () { exportData(); });
      card.appendChild(fbBtn);
    }

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'pono-de-close';
    closeBtn.textContent = 'とじる';
    closeBtn.addEventListener('click', function () {
      try { document.body.removeChild(ui.modal); } catch (_) {}
    });
    card.appendChild(closeBtn);
  }

  // ---- クラウド復元 ----
  function startCloudLoadFlow(parentModal) {
    try { if (parentModal) document.body.removeChild(parentModal); } catch (_) {}
    var ui = makeModal();
    document.body.appendChild(ui.modal);
    renderCloudLoadInput(ui);
  }

  function renderCloudLoadInput(ui) {
    var card = ui.card;
    card.innerHTML = '';
    var h = document.createElement('h3');
    h.textContent = 'クラウドから ロード';
    card.appendChild(h);

    var p = document.createElement('p');
    p.textContent = 'ほぞんした ときの「あいことば」を いれてください。';
    card.appendChild(p);

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'pono-de-input';
    input.placeholder = 'さくら-もり-ほし-1234';
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('inputmode', 'text');
    input.setAttribute('aria-label', 'あいことば');
    card.appendChild(input);

    var status = document.createElement('div');
    status.className = 'pono-de-status';

    var goBtn = document.createElement('button');
    goBtn.type = 'button';
    goBtn.className = 'pono-de-btn';
    goBtn.textContent = 'ロードする';
    function submit() {
      var val = input.value;
      if (!val || !val.trim()) {
        status.textContent = 'あいことばを いれてください。';
        return;
      }
      submitCloudLoad(ui, val, status, goBtn);
    }
    goBtn.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    card.appendChild(goBtn);
    card.appendChild(status);

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'pono-de-close';
    cancelBtn.textContent = 'やめる';
    cancelBtn.addEventListener('click', function () {
      try { document.body.removeChild(ui.modal); } catch (_) {}
    });
    card.appendChild(cancelBtn);

    setTimeout(function () { try { input.focus(); } catch (_) {} }, 60);
  }

  function submitCloudLoad(ui, passcode, status, goBtn) {
    var api = window.PonoCloudSync;
    if (!api || typeof api.load !== 'function') {
      status.textContent = cloudErrorMessage({ error: 'not_configured' }, 'load');
      return;
    }
    goBtn.disabled = true;
    status.innerHTML = '<span class="pono-de-spinner"></span> よみこんでいます…';
    api.load(passcode).then(function (res) {
      goBtn.disabled = false;
      if (res && res.ok) {
        // 既存の preview → 保護者ゲート → 上書き確認 → applyImport フローに合流。
        // (parsed._cloud=true が cloud-sync.js で付与済み)
        try { document.body.removeChild(ui.modal); } catch (_) {}
        showImportPreview(null, res.parsed, null);
      } else {
        // すべての分類エラーを renderCloudLoadError に渡し、 コード別の正しい文言を出す。
        // (not_found / rate_limited / too_large / invalid の分岐も到達可能になる。
        //  誤 passcode → 「あいことばが ちがうみたい」、 rate_limited → 動的待ち時間文言)
        renderCloudLoadError(ui, res || { error: 'unknown' });
      }
    }, function () {
      goBtn.disabled = false;
      renderCloudLoadError(ui, { error: 'network' });
    });
  }

  function renderCloudLoadError(ui, res) {
    var card = ui.card;
    card.innerHTML = '';
    var h = document.createElement('h3');
    h.textContent = 'クラウドから ロード';
    card.appendChild(h);

    var p = document.createElement('p');
    p.textContent = cloudErrorMessage(res, 'load');
    card.appendChild(p);

    var showFallback = (res.error === 'not_configured' || res.error === 'network' || res.error === 'unknown');
    if (showFallback) {
      var fbBtn = document.createElement('button');
      fbBtn.type = 'button';
      fbBtn.className = 'pono-de-btn';
      fbBtn.textContent = 'ファイルで ロードする';
      fbBtn.addEventListener('click', function () {
        try { document.body.removeChild(ui.modal); } catch (_) {}
        startImportFlow(null);
      });
      card.appendChild(fbBtn);
    }

    var retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'pono-de-btn secondary';
    retryBtn.style.marginTop = '8px';
    retryBtn.textContent = 'あいことばを いれなおす';
    retryBtn.addEventListener('click', function () {
      renderCloudLoadInput(ui);
    });
    card.appendChild(retryBtn);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'pono-de-close';
    closeBtn.textContent = 'とじる';
    closeBtn.addEventListener('click', function () {
      try { document.body.removeChild(ui.modal); } catch (_) {}
    });
    card.appendChild(closeBtn);
  }

  function startImportFlow(parentModal) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    document.body.appendChild(input);

    var picked = false;
    var pickTimer = setTimeout(function () {
      if (picked) return;
      try { document.body.removeChild(input); } catch (_) {}
      // タイムアウト時はサイレント (UI 停止しない)
    }, FILE_PICK_TIMEOUT_MS);

    input.addEventListener('change', function () {
      picked = true;
      clearTimeout(pickTimer);
      var file = input.files && input.files[0];
      try { document.body.removeChild(input); } catch (_) {}
      if (!file) return;
      handleImportFile(file, parentModal);
    });

    input.click();
  }

  function handleImportFile(file, parentModal) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      showToast('ファイルが おおきすぎます (50MB まで)', 'error');
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () {
      showToast('ファイルの よみこみに しっぱい しました', 'error');
    };
    reader.onload = function () {
      var text = reader.result;
      if (typeof text !== 'string') {
        showToast('ファイルの けいしきが ただしくありません', 'error');
        return;
      }
      var parsed;
      try {
        parsed = parseImportJson(text);
      } catch (e) {
        showToast(e && e.message ? e.message : 'よみこみに しっぱい しました', 'error');
        return;
      }
      showImportPreview(file, parsed, parentModal);
    };
    reader.readAsText(file);
  }

  function showImportPreview(file, parsed, parentModal) {
    var ui = makeModal();
    var card = ui.card;
    var h = document.createElement('h3');
    h.textContent = 'よみこむ データの ないよう';
    card.appendChild(h);

    var preview = document.createElement('div');
    preview.className = 'pono-de-preview';
    var dl = document.createElement('dl');
    function addRow(k, v) {
      var dt = document.createElement('dt'); dt.textContent = k;
      var dd = document.createElement('dd'); dd.textContent = v;
      dl.appendChild(dt); dl.appendChild(dd);
    }
    addRow('けんすう', String(Object.keys(parsed.data).length) + ' こ');
    if (file) {
      addRow('ファイル', file.name + ' (' + Math.round(file.size / 1024) + ' KB)');
    } else if (parsed && parsed._cloud) {
      addRow('もとデータ', 'クラウド（あいことば）');
    }
    if (parsed.exported_at) addRow('ほぞん日時', parsed.exported_at);
    if (parsed.profile_name) addRow('なまえ', parsed.profile_name);
    if (parsed.app_version) addRow('app_version', String(parsed.app_version));
    preview.appendChild(dl);
    card.appendChild(preview);

    var note = document.createElement('p');
    note.className = 'sub';
    note.style.textAlign = 'left';
    note.textContent = '※ プレイ日時の きろくも ふくまれます。';
    card.appendChild(note);

    if (parsed && parsed._cloud) {
      var cnote = document.createElement('p');
      cnote.className = 'sub';
      cnote.style.textAlign = 'left';
      cnote.textContent = '※ おなまえは クラウドに ふくまれません。 ロードのあとに もういちど いれてください。';
      card.appendChild(cnote);
    }

    if (parsed._futureSchema) {
      var warn = document.createElement('p');
      warn.className = 'sub';
      warn.style.color = '#D9573A';
      warn.style.fontWeight = '800';
      warn.textContent = '⚠ あたらしい バージョンの ファイルです。 そのまま よみこむと いっぶ よみこめない こうもくが あるかもしれません。';
      card.appendChild(warn);
    }

    var goBtn = document.createElement('button');
    goBtn.type = 'button';
    goBtn.className = 'pono-de-btn';
    goBtn.textContent = '読み込み';
    goBtn.addEventListener('click', function () {
      try { document.body.removeChild(ui.modal); } catch (_) {}
      showParentGate(parsed);
    });
    card.appendChild(goBtn);

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'pono-de-close';
    cancelBtn.textContent = 'やめる';
    cancelBtn.addEventListener('click', function () {
      try { document.body.removeChild(ui.modal); } catch (_) {}
    });
    card.appendChild(cancelBtn);

    document.body.appendChild(ui.modal);
  }

  function showParentGate(parsed) {
    var gate = generateAdditionGate();
    var ui = makeModal();
    var card = ui.card;
    var h = document.createElement('h3');
    h.textContent = 'おうちの ひとへ';
    card.appendChild(h);

    var q = document.createElement('p');
    q.style.fontWeight = '900';
    q.style.fontSize = '1.05rem';
    q.textContent = gate.question;
    card.appendChild(q);

    var choices = document.createElement('div');
    choices.className = 'pono-de-gate-choice';
    var status = document.createElement('div');
    status.className = 'pono-de-status';

    for (var i = 0; i < gate.choices.length; i++) {
      (function (label) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.addEventListener('click', function () {
          if (label === gate.correct) {
            try { document.body.removeChild(ui.modal); } catch (_) {}
            showFinalConfirm(parsed);
          } else {
            status.textContent = 'ちがうみたい。 もう いちど かんがえてね。';
            // 不正解時は選択肢を残し、 ボタン無効化はしない
            // (再チャレンジ可、 別 choice を試せる)
          }
        });
        choices.appendChild(btn);
      })(gate.choices[i]);
    }
    card.appendChild(choices);
    card.appendChild(status);

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'pono-de-close';
    cancelBtn.textContent = 'やめる';
    cancelBtn.addEventListener('click', function () {
      try { document.body.removeChild(ui.modal); } catch (_) {}
    });
    card.appendChild(cancelBtn);

    document.body.appendChild(ui.modal);
  }

  function showFinalConfirm(parsed) {
    var ui = makeModal();
    var card = ui.card;
    var h = document.createElement('h3');
    h.textContent = 'さいごの かくにん';
    card.appendChild(h);

    var p = document.createElement('p');
    p.innerHTML = 'いまのデータは <b style="color:#D9573A;">上書きされます</b>。<br>だいじょうぶですか？';
    card.appendChild(p);

    var goBtn = document.createElement('button');
    goBtn.type = 'button';
    goBtn.className = 'pono-de-btn danger';
    goBtn.textContent = 'ロードする';
    goBtn.addEventListener('click', function () {
      try { document.body.removeChild(ui.modal); } catch (_) {}
      try {
        var result = applyImport(parsed);
        if (parsed && parsed._cloud) {
          // クラウドには 名前を送っていないので、 復元後に名前入力導線へ繋ぐ。
          // reload 後、 play.html の maybeOpenFirstProfile() が
          // pono_player_profile_v1 不在を検知して名前入力モーダルを開く。
          showToast('ロードしました', 'success', 'おなまえを もういちど いれてね。');
        } else {
          showToast('ロードしました', 'success',
            String(result.written) + ' このデータを よみこみました。');
        }
        // page reload (snapshot 後、 ゲーム側の cached state を捨てる)
        setTimeout(function () {
          try { location.reload(); } catch (_) {}
        }, 1500);
      } catch (e) {
        console.error('[PonoDataExport] import failed:', e);
        showToast(e && e.message ? e.message : 'ロードに しっぱい しました', 'error');
      }
    });
    card.appendChild(goBtn);

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'pono-de-close';
    cancelBtn.textContent = 'やめる';
    cancelBtn.addEventListener('click', function () {
      try { document.body.removeChild(ui.modal); } catch (_) {}
    });
    card.appendChild(cancelBtn);

    document.body.appendChild(ui.modal);
  }

  // Public API for direct File 入力 (help.html 等から file input でファイル渡し)
  function importDataPublic(file) {
    handleImportFile(file, null);
  }

  // ---- 公開 ----
  window.PonoDataExport = {
    exportData: exportData,
    importData: importDataPublic,
    openModal: openModal,
    // 内部テスト・診断用 + cloud-sync.js (Step C) からの再利用用
    _isExportAllowed: isExportAllowed,
    _isImportAllowed: isImportAllowed,
    _parseImportJson: parseImportJson,
    _generateAdditionGate: generateAdditionGate,
    _collectExportData: collectExportData,
    _getAppVersion: getAppVersion
  };
})();
