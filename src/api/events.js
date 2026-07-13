// src/api/events.js
// -----------------------------------------------------------------------------
// POST /api/e — first-party テレメトリ収集エンドポイント。
//   仕様正本: docs/data-analytics-plan.md §5-1 (P0イベント8個) / §5-3 (匿名ID) /
//             §5-4 (COPPA・国ゲート) / §5-5 (集めないリスト) / §6-2 (収集エンドポイント設計)。
//   受信した P0 イベント (最大 50 件/リクエスト) を Cloudflare Workers Analytics Engine
//   (env.EVENTS binding、wrangler.toml [[analytics_engine_datasets]]) へ書き込む。
//   GET は提供しない (§6-2「必ず POST」要件)。
//
// クライアント契約 (オーケストレーター確定、common/telemetry.js が window.PonoTelemetry として実装):
//   POST body (JSON) = { v:1, cid, sid, tier, platform, events:[{n, ts, p}] }
//     - cid: pono_client_id (localStorage 永続、crypto.randomUUID)
//     - sid: pono_telemetry_sid (sessionStorage、タブ/セッション単位)
//     - tier: free|book|app (common/tier.js getTier())
//     - platform: native-android|web-app|web (__NATIVE_BUILD__/__APP_BUILD__ 由来)
//     - events[].n: イベント名 (allowlist 7種。game_title_tap は Umami 側計測なので含まない)
//     - events[].ts: ms epoch (クライアント生成。不正/欠落時はサーバー Date.now() で補完)
//     - events[].p: イベント固有プロパティ (allowlist キーのみ、値は string|number|boolean)
//
// 設計方針 (docs/data-analytics-plan.md 準拠):
//   - PII 非収集 (§5-5): プロパティキーは allowlist 制。name/age/gender/email 等は
//     そもそも受理されない (allowlist に無いキーは黙って drop)。
//   - 国ゲート (§6-2): request.cf.country が 'JP' 以外は書き込まず 204 で黙って捨てる
//     (VPN 等による判定誤差はベストエフォート許容)。
//   - bot/E2E 除外: UA に HeadlessChrome/Playwright を含む場合も同様に 204 drop
//     (Playwright での実機検証トラフィックを分析データに混入させない)。
//   - CORS (§7-1): Origin ヘッダがある場合のみ savedata.js の allowedOrigins() で検証。
//     無い場合 (ネイティブ WebView 等、非ブラウザ経路) はスキップする。
//     savedata.js とは異なり、ここでは Origin 不一致を「ポリシーゲート」として扱い
//     国ゲート/bot ゲートと同じ 204 (黙って捨てる) で応答する — allowlist の有無を
//     エラーコードの違いで外部に漏らさないため。
//   - env.EVENTS 未バインドの env (LP staging 等、または binding 追加漏れ) では
//     503 ではなく 204 を返し、クライアントの再送/キューロジックを壊さない。
// -----------------------------------------------------------------------------

import { allowedOrigins } from './savedata.js';
import { hashIp, getClientIp, checkAndCountGlobal, checkIpPost } from './ratelimit.js';

const MAX_BODY_BYTES = 64 * 1024;        // 64KB (API 契約: 1リクエスト最大約30KB目安、保守的に64KB上限)
const MAX_EVENTS_PER_REQUEST = 50;       // API 契約: 1リクエスト最大50イベント
const MAX_PROP_STRING_LEN = 128;         // 文字列プロパティ値の上限
const MAX_BLOB_TOTAL_BYTES = 5 * 1024;   // WAE blob 合計上限 (公式上限16KBに対し保守的に5KB)

// ---- rate limit (レビュー指摘: mass fake-event injection 対策) ----
// savedata.js (合言葉発行、稀な明示操作) と違い、テレメトリは正規利用でも
// 「タブ1枚が30秒毎に自動 flush」+「同一 IP (家庭内 NAT) に複数端末」が常態のため、
// savedata.js のデフォルト閾値 (IP 3回/分・グローバル10回/分) をそのまま流用すると
// 正規トラフィックまで弾いてしまう。 ns='ev' で savedata.js とは別の KV キー空間を
// 使い、この専用の緩めの閾値を適用する (src/api/ratelimit.js の opts 引数で上書き)。
const EVENTS_IP_POST_LIMIT = 30;         // IP 別 POST: 30回/分
const EVENTS_IP_POST_LOCK_SEC = 2 * 60;  // 超過時 2分ロック (savedata.js の5分より短め)
const EVENTS_GLOBAL_POST_LIMIT = 1000;   // グローバル POST: 1000回/分 (大量偽装イベント対策の下限ガード)

// P0 イベント allowlist (計画書 §5-1 の8個から game_title_tap を除いた7個。
// game_title_tap は Umami 側の data-umami-event 属性で計測するため本エンドポイントでは受けない)。
export const ALLOWED_EVENT_NAMES = new Set([
  'session_start',
  'daily_return',
  'game_launch',
  'game_clear',
  'paywall_hit',
  'upgrade_cta_click',
  'acorn_earned'
]);

// イベント固有プロパティの allowlist (計画書 §5-1 P0 テーブル準拠)。
// ここに無いキーは sanitizeProps() で黙って破棄される (PII 混入防止の第一防衛線)。
export const ALLOWED_PROP_KEYS = new Set([
  'game_id',            // game_launch / game_clear / paywall_hit / upgrade_cta_click / acorn_earned
  'zone',                // game_launch: playable|app_only|coming_soon
  'clear_event',         // game_clear: clear|stage_clear|perfect|complete
  'date_jst',             // daily_return: YYYY-MM-DD (JST dedup 用)
  'delta',                // acorn_earned: どんぐり加算量
  'reached_daily_cap',    // acorn_earned: 日次上限到達フラグ
  'tier',                  // paywall_hit / upgrade_cta_click: エンベロープの tier と重複可
  'platform'               // session_start: pwa|browser (common/telemetry.js の displayMode 判定。
                            // エンベロープ直下の platform=native-android|web-app|web とは別軸の値なので
                            // 同名だが別ディメンションとして扱う)
]);

const ALLOWED_TIER_VALUES = new Set(['free', 'book', 'app']);
const ALLOWED_PLATFORM_VALUES = new Set(['native-android', 'web-app', 'web']);

// 値が既知の有限集合を持つ prop キーは、キーだけでなく値も allowlist 検証する
// (レビュー指摘: allowlist キーであれば任意の文字列値がそのまま WAE blob に載る問題)。
// game_id はゲーム追加のたびに更新が必要な可変集合かつ本ファイルから参照できる
// 単一の正本カタログが存在しないため、対象外 (128文字上限 + rate limit で影響範囲を限定)。
const ALLOWED_ZONE_VALUES = new Set(['playable', 'app_only', 'coming_soon']);
const ALLOWED_CLEAR_EVENT_VALUES = new Set(['clear', 'stage_clear', 'perfect', 'complete']);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT_UA_RE = /HeadlessChrome|Playwright/i;

function noStoreHeaders() {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
}

// savedata.js の corsHeaders() と同じ「Origin を reflect するだけ」の形。
// 実際のブロックは isOriginAllowed() 側で行う (このファイルの応答は常に cors ヘッダーを付ける)。
function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const headers = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...noStoreHeaders()
  };
  if (origin && allowedOrigins(env).indexOf(origin) >= 0) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

// Origin ヘッダがある場合のみ allowlist 検証する (savedata.js の allowedOrigins() を再利用)。
// ヘッダが無い場合 (ネイティブ WebView の一部経路や non-browser) はスキップして許可する。
function isOriginAllowed(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  return allowedOrigins(env).indexOf(origin) >= 0;
}

function noBody(status, headers) {
  return new Response(null, { status, headers: headers || {} });
}

// savedata.js の readBodyLimited() と同じ設計 (stream を累積バイトで見て早期 abort)。
// savedata.js からは import せず本ファイル専用に複製する — allowedOrigins 以外の
// export 表面を savedata.js 側に増やさないため (A班所有ファイル外への変更を最小化)。
async function readBodyLimited(request, maxBytes) {
  const body = request.body;
  if (body && typeof body.getReader === 'function') {
    const reader = body.getReader();
    const chunks = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.byteLength) {
          total += value.byteLength;
          if (total > maxBytes) {
            try { await reader.cancel(); } catch (_) {}
            return { ok: false, tooLarge: true };
          }
          chunks.push(value);
        }
      }
    } catch (_) {
      return { ok: false, error: true };
    }
    const buf = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
    return { ok: true, text: new TextDecoder().decode(buf) };
  }
  // fallback (stream 非対応、主にテスト環境向け): text() → byte 長チェック
  let text;
  try {
    text = await request.text();
  } catch (_) {
    return { ok: false, error: true };
  }
  if (new TextEncoder().encode(text).length > maxBytes) {
    return { ok: false, tooLarge: true };
  }
  return { ok: true, text };
}

function sanitizeEnum(value, allowedSet) {
  return (typeof value === 'string' && allowedSet.has(value)) ? value : '';
}

function sanitizePropValue(value) {
  if (typeof value === 'string') return value.slice(0, MAX_PROP_STRING_LEN);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  return null; // string|number|boolean 以外の型は破棄 (PII/意図しない構造化データの混入防止)
}

// events[].p を allowlist キーのみに絞り込む。未知キー・不正型は黙って削除し、
// リクエスト全体は失敗させない (savedata.js validateAndSanitize と同じ「allowlist で削る」思想)。
// キー allowlist に加え、既知の有限集合を持つキー (zone/clear_event) は値も検証する。
function sanitizeProps(p) {
  const out = {};
  if (!p || typeof p !== 'object' || Array.isArray(p)) return out;
  for (const key of Object.keys(p)) {
    if (!ALLOWED_PROP_KEYS.has(key)) continue;
    const v = sanitizePropValue(p[key]);
    if (v === null) continue;
    if (key === 'zone' && !ALLOWED_ZONE_VALUES.has(v)) continue;
    if (key === 'clear_event' && !ALLOWED_CLEAR_EVENT_VALUES.has(v)) continue;
    out[key] = v;
  }
  return out;
}

// 1イベント分の blob 配列を組み立てる: [name, platform, tier, sid, game_id, extraJSON]。
// 合計サイズが MAX_BLOB_TOTAL_BYTES を超える場合は extraJSON を落として安全側に倒す
// (game_id 等の主要ディメンションは残す。allowlist+128文字上限のため通常は到達しない保険)。
function buildBlobs(name, platform, tier, sid, props) {
  const gameId = typeof props.game_id === 'string' ? props.game_id : '';
  const extra = { ...props };
  delete extra.game_id;
  let extraJSON = Object.keys(extra).length ? JSON.stringify(extra) : '';
  const byteLen = (s) => new TextEncoder().encode(s || '').length;
  let blobs = [name, platform, tier, sid, gameId, extraJSON];
  const total = blobs.reduce((sum, b) => sum + byteLen(b), 0);
  if (total > MAX_BLOB_TOTAL_BYTES) {
    extraJSON = '';
    blobs = [name, platform, tier, sid, gameId, extraJSON];
  }
  return blobs;
}

function writeEvent(env, cid, ts, blobs) {
  try {
    // env.EVENTS.writeDataPoint() は同期 API (Promise を返さない)。失敗しても
    // レスポンス自体は 204 のまま返す (テレメトリ書き込み失敗でクライアント動作を壊さない)。
    env.EVENTS.writeDataPoint({
      indexes: [cid],   // WAE のサンプリング主キー。1本のみ・最大96バイト (cid=UUID 36文字で余裕)
      blobs,
      doubles: [ts]
    });
  } catch (e) {
    console.error('[events] writeDataPoint failed: ' + (e && e.message));
  }
}

// ---- entry: POST /api/e ----
export async function handleEvents(request, env, ctx) {
  if (request.method === 'OPTIONS') {
    return noBody(204, corsHeaders(request, env));
  }
  const cors = corsHeaders(request, env);
  if (request.method !== 'POST') {
    return noBody(405, cors);
  }

  // ---- ここから「安価なゲート」: ヘッダーのみで判定でき、body の読み込み/JSON.parse
  // より先に評価する (レビュー指摘: 攻撃者に body 読み込み+parse のコストを払わせない)。
  // 不一致でも 4xx を返さず 204 で黙って捨てる (allowlist/country/bot 判定の有無を
  // エラーコードの違いで外部に漏らさないため。クライアントの再送/キューロジックも
  // 壊さない — savedata.js の 503 ガードと同じ思想)。

  if (!isOriginAllowed(request, env)) {
    return noBody(204, cors);
  }

  // 国ゲート (§6-2): request.cf.country が 'JP' 以外は書き込まず 204。
  // request.cf 自体が無い実行環境 (ローカル dev 等) も 'JP' 以外扱いになる。
  const country = request.cf && request.cf.country;
  if (country !== 'JP') {
    return noBody(204, cors);
  }

  // bot/E2E 除外: Playwright 等の自動テストトラフィックを分析データに混入させない。
  const ua = request.headers.get('User-Agent') || '';
  if (BOT_UA_RE.test(ua)) {
    return noBody(204, cors);
  }

  // WAE binding 未設定の env (LP staging 等、または binding 追加漏れ) では
  // 503 ではなく 204 を返す (クライアントを壊さない)。 body を読む前に弾く。
  if (!env.EVENTS || typeof env.EVENTS.writeDataPoint !== 'function') {
    return noBody(204, cors);
  }

  // ---- rate limit (レビュー指摘 major: mass fake-event injection 対策) ----
  // savedata.js と同じ src/api/ratelimit.js の primitive (checkIpPost/checkAndCountGlobal)
  // を再利用しつつ、ns='ev' + 専用閾値で savedata.js の KV counter とは完全に独立させる
  // (同一 IP からの savedata 合言葉発行とテレメトリ POST が互いの枠を奪わないようにするため)。
  // env.SAVEDATA_KV は savedata.js 用の既存 binding を流用する (専用 KV を新設しない —
  // 新規 KV namespace 作成には Cloudflare 側の手動プロビジョニングが要るため)。
  // SAVEDATA_KV 未設定の env (2026-07時点で production は未設定、staging-app のみ設定済み。
  // wrangler.toml の Step C セットアップ手順参照) では rate limit 自体はスキップし、
  // 上記の安価なゲート (Origin/国/bot) のみで防御する — 既存の「必須 binding が無くても
  // 503 にせず機能を維持する」設計方針を踏襲 (production への SAVEDATA_KV 導入は本タスクの
  // スコープ外、savedata.js 側で既に手順化済みの別タスク)。
  if (env.SAVEDATA_KV) {
    const kv = env.SAVEDATA_KV;
    const ipSalt = env.RL_IP_SALT || env.PASSCODE_HMAC_SECRET || '';
    const ip = getClientIp(request, env);
    const ipHash = await hashIp(ip, ipSalt);
    const ipCheck = await checkIpPost(kv, ipHash, ctx, 'ev', {
      limit: EVENTS_IP_POST_LIMIT,
      lockSec: EVENTS_IP_POST_LOCK_SEC
    });
    if (!ipCheck.ok) {
      return noBody(429, { ...cors, 'Retry-After': String(ipCheck.retryAfter) });
    }
    const g = await checkAndCountGlobal(kv, 'events_post', ctx, { limit: EVENTS_GLOBAL_POST_LIMIT });
    if (!g.ok) {
      return noBody(429, { ...cors, 'Retry-After': String(g.retryAfter) });
    }
  }

  const ctype = (request.headers.get('Content-Type') || '').toLowerCase();
  if (ctype.indexOf('application/json') !== 0) {
    return noBody(400, cors);
  }

  // Content-Length による早期拒否 (本体読み込み前の安価な一次フィルタ)
  const cl = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (Number.isFinite(cl) && cl > MAX_BODY_BYTES) {
    return noBody(413, cors);
  }
  const read = await readBodyLimited(request, MAX_BODY_BYTES);
  if (!read.ok) {
    if (read.tooLarge) return noBody(413, cors);
    return noBody(400, cors);
  }

  let envelope;
  try {
    envelope = JSON.parse(read.text);
  } catch (_) {
    return noBody(400, cors);
  }
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return noBody(400, cors);
  }

  const cid = envelope.cid;
  if (typeof cid !== 'string' || !UUID_RE.test(cid)) {
    return noBody(400, cors);
  }
  const sid = (typeof envelope.sid === 'string' && envelope.sid.trim())
    ? envelope.sid.trim().slice(0, MAX_PROP_STRING_LEN)
    : '';
  if (!sid) {
    return noBody(400, cors);
  }
  const tier = sanitizeEnum(envelope.tier, ALLOWED_TIER_VALUES);
  const platform = sanitizeEnum(envelope.platform, ALLOWED_PLATFORM_VALUES);

  if (!Array.isArray(envelope.events) || envelope.events.length === 0) {
    return noBody(400, cors);
  }
  if (envelope.events.length > MAX_EVENTS_PER_REQUEST) {
    return noBody(400, cors);
  }

  // イベント名 allowlist / prop allowlist を per-event に適用。allowlist 外のイベント名は
  // 黙って除外する (client が将来イベントを先行追加していても request 全体は失敗させない)。
  const now = Date.now();
  const validEvents = [];
  for (const ev of envelope.events) {
    if (!ev || typeof ev !== 'object' || Array.isArray(ev)) continue;
    if (typeof ev.n !== 'string' || !ALLOWED_EVENT_NAMES.has(ev.n)) continue;
    const ts = (typeof ev.ts === 'number' && Number.isFinite(ev.ts) && ev.ts > 0) ? ev.ts : now;
    const props = sanitizeProps(ev.p);
    validEvents.push({ n: ev.n, ts, props });
  }

  const writeAll = async () => {
    for (const ev of validEvents) {
      const blobs = buildBlobs(ev.n, platform, tier, sid, ev.props);
      writeEvent(env, cid, ev.ts, blobs);
    }
  };
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(writeAll());
  } else {
    await writeAll();
  }

  return noBody(204, cors);
}
