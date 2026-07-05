// src/api/validate.js
// -----------------------------------------------------------------------------
// Step C payload の 4 段防御。 common/data-export.js の import 検証パイプラインと
// 「対称」 になるよう Worker 側に duplicate する (CRITICAL-6)。
//
//   1. Object.create(null) ベースに sanitize (prototype 汚染防止)
//   2. キー名を正規表現でバリデート (__proto__ / constructor 等を弾く)
//   3. value は string のみ accept (object/array は DoS として reject、 その他 scalar は drop)
//   4. denylist / allowlist を適用 (tier/admin/unlocked/capture/debug/tts を除去)
//
// !!! CRITICAL !!!
//   下記の定数は common/data-export.js の IMPORT_DENY_EXACT / IMPORT_DENY_PREFIXES /
//   KEY_ALLOW_PATTERN / KEY_SAFE_PATTERN / FORBIDDEN_KEY_NAMES / EXPLICIT_ALLOW を
//   「一字一句そのまま」写したもの。 client 側を変更したら必ずこちらも同期すること。
//   (POST 受信時 + GET 返却時の両方で適用し、 細工 payload の localStorage 迂回を封じる)
// -----------------------------------------------------------------------------

// ---- data-export.js から写した定数 (変更時は両方同期) ----

// Export 対象 allowlist (pono_* + 明示追加)
export const KEY_ALLOW_PATTERN = /^pono_[a-z0-9_]+$/;
export const EXPLICIT_ALLOW = [
  'bowling_best',
  'narration_mode',
  'narration_rate',
  'narration_volume'
];

// Import 時 deny (tier 詐欺 + unlocked + 開発デバッグ)
export const IMPORT_DENY_EXACT = [
  'pono_premium',
  'pono_sub_active',
  'pono_unlocked_sea',
  'pono_unlocked_furn',
  'pono_unlocked_wall',
  'pono_unlocked_floor',
  'pono_unlocked_bg',
  'pono_premium_bonus'
];
export const IMPORT_DENY_PREFIXES = [
  'pono_capture_',
  'pono_debug_',
  'pono_tts_',
  'pono_admin_'
];

// キー自体の一次フィルタ
export const KEY_SAFE_PATTERN = /^[a-z][a-z0-9_]*$/;

// 危険キー名 (defense-in-depth)。 Object リテラルではなく Set で持つ
// (Object にすると __proto__ 等が prototype に化けるため)。
export const FORBIDDEN_KEY_NAMES = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'hasOwnProperty'
]);

// ---- 制限値 ----
export const MAX_BODY_BYTES = 500 * 1024; // 500KB (HIGH-5)
export const MAX_DATA_KEYS = 300;         // flat map のキー数上限 (HIGH-5 / DoS)
export const SCHEMA_VERSION = 1;

// ---- キー判定 (data-export.js isImportAllowed と同一ロジック) ----
export function isImportAllowedKey(key) {
  if (!key || typeof key !== 'string') return false;
  // 1. forbidden names
  if (FORBIDDEN_KEY_NAMES.has(key)) return false;
  // 2. キーフォーマット
  if (!KEY_SAFE_PATTERN.test(key)) return false;
  // 3. deny exact
  for (let i = 0; i < IMPORT_DENY_EXACT.length; i++) {
    if (key === IMPORT_DENY_EXACT[i]) return false;
  }
  // 4. deny prefix
  for (let j = 0; j < IMPORT_DENY_PREFIXES.length; j++) {
    if (key.indexOf(IMPORT_DENY_PREFIXES[j]) === 0) return false;
  }
  // 5. allowlist
  if (KEY_ALLOW_PATTERN.test(key)) return true;
  for (let k = 0; k < EXPLICIT_ALLOW.length; k++) {
    if (key === EXPLICIT_ALLOW[k]) return true;
  }
  return false;
}

function fail(status, code) {
  return { ok: false, status, code };
}

function byteLength(str) {
  return new TextEncoder().encode(str).length;
}

// ---- POST 受信時: 生テキストを検証して clean な flat map を返す ----
// 戻り値: { ok:true, clean, meta } | { ok:false, status, code }
export function validateAndSanitize(text) {
  if (typeof text !== 'string') return fail(400, 'invalid_body');
  if (byteLength(text) > MAX_BODY_BYTES) return fail(413, 'payload_too_large');

  let raw;
  try {
    raw = JSON.parse(text);
  } catch (_) {
    return fail(400, 'invalid_json');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return fail(400, 'invalid_format');
  }
  // schema_version === 1 (仕様書 POST §3)
  if (!Object.prototype.hasOwnProperty.call(raw, 'schema_version')) {
    return fail(400, 'missing_schema_version');
  }
  if (raw.schema_version !== SCHEMA_VERSION) {
    return fail(400, 'unsupported_schema');
  }
  if (!Object.prototype.hasOwnProperty.call(raw, 'data')) {
    return fail(400, 'missing_data');
  }
  const data = raw.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return fail(400, 'invalid_data');
  }
  const keys = Object.keys(data);
  if (keys.length > MAX_DATA_KEYS) {
    return fail(400, 'too_many_keys');
  }

  // 4 段防御を適用しながら clean な flat map を構築
  const clean = Object.create(null);
  let count = 0;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    const v = data[key];
    // 深いネスト = DoS。 object / array は reject (flat map 以外は許さない)
    if (v !== null && typeof v === 'object') {
      return fail(400, 'nested_value');
    }
    // string 以外の scalar (number/boolean/null) は drop (client と同じ挙動)
    if (typeof v !== 'string') continue;
    // denylist / allowlist
    if (!isImportAllowedKey(key)) continue;
    clean[key] = v;
    count++;
  }

  return {
    ok: true,
    clean,
    meta: {
      schema_version: SCHEMA_VERSION,
      // profile_name は「意図的に」取り込まない (個人情報を server に置かない / 設計判断 2)
      app_version: (typeof raw.app_version === 'number') ? raw.app_version : 0,
      exported_at: (typeof raw.exported_at === 'string') ? raw.exported_at.slice(0, 40) : '',
      items_count: count
    }
  };
}

// ---- GET 返却時: KV から読んだ data map に denylist を「再適用」(二重防御) ----
// 戻り値: { clean (plain object), count }
export function sanitizeStoredData(data) {
  const clean = {};
  let count = 0;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const keys = Object.keys(data);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      const v = data[key];
      if (typeof v !== 'string') continue;
      if (!isImportAllowedKey(key)) continue;
      clean[key] = v;
      count++;
    }
  }
  return { clean, count };
}
