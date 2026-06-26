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
      '@keyframes pono-de-spin{to{transform:rotate(360deg);}}'
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

  function openModal() {
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

    // Block 1: Export
    var block1 = document.createElement('div');
    block1.className = 'pono-de-block';
    block1.innerHTML =
      '<h4>① データを 保存</h4>' +
      '<div class="desc">いまのデータを ファイルとして パソコン/タブレットに ほぞんします。</div>';
    var exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'pono-de-btn';
    exportBtn.textContent = 'データを 保存する';
    exportBtn.addEventListener('click', function () {
      exportData();
    });
    block1.appendChild(exportBtn);
    card.appendChild(block1);

    // Block 2: Import
    var block2 = document.createElement('div');
    block2.className = 'pono-de-block';
    block2.innerHTML =
      '<h4>② データを ロード</h4>' +
      '<div class="desc">ほぞんした ファイルを よみこんで、 つづきから あそべます。<br><span style="color:#D9573A;font-weight:800;">いまの データは うえがき されます。</span></div>';
    var importBtn = document.createElement('button');
    importBtn.type = 'button';
    importBtn.className = 'pono-de-btn secondary';
    importBtn.textContent = 'ファイルを えらぶ';
    importBtn.addEventListener('click', function () {
      startImportFlow(ui.modal);
    });
    block2.appendChild(importBtn);
    card.appendChild(block2);

    // 余白 (Step C で ③ 「あいことばで ひきつぐ」 用)
    var spacer = document.createElement('div');
    spacer.style.height = '8px';
    card.appendChild(spacer);

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
    addRow('ファイル', file.name + ' (' + Math.round(file.size / 1024) + ' KB)');
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
        showToast('ロードしました', 'success',
          String(result.written) + ' このデータを よみこみました。');
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
    // 内部テスト・診断用
    _isExportAllowed: isExportAllowed,
    _isImportAllowed: isImportAllowed,
    _parseImportJson: parseImportJson,
    _generateAdditionGate: generateAdditionGate
  };
})();
