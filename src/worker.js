// Cloudflare Worker entry point
// - Static assets: served via ASSETS binding (wrangler.toml [assets])
// - API: /.netlify/functions/ai-name  -> Gemini Vision proxy (handleAiName)
//        /.netlify/functions/ai-tts   -> Gemini TTS proxy + fallbacks (handleAiTts)
//   Legacy /.netlify/functions/* paths are kept so existing frontend calls work unchanged.

import { Buffer } from 'node:buffer';
import { getGoogleAccessToken, getGoogleServiceAccountProjectId } from './google-auth.js';
import { handleSaveData } from './api/savedata.js';
import { handleEvents } from './api/events.js';
import { handleScheduledRollup } from './api/analytics-rollup.js';
import {
  handleAnalyticsOverview,
  handleAnalyticsGames,
  handleAnalyticsRetention,
  handleAnalyticsStatus,
  handleAnalyticsRollupTrigger
} from './api/analytics-admin.js';

const PROTECTED_PREFIXES = [
  '/admin/',
  '/admin',
  '/tools/',
  '/tools',
  '/room/furniture_adjuster',
  '/room/yard_adjuster'
];

const BENTO_MASK_CONFIG_KEY = 'bento-mask-defaults-v1';
const BENTO_MASK_HISTORY_PREFIX = 'bento-mask-defaults-v1:history:';
const BENTO_MASK_HISTORY_MAX = 10;
const NPC_POSITIONS_CURRENT_KEY = 'npc-positions:current';
const NPC_POSITIONS_HISTORY_PREFIX = 'npc-positions:history:';
const NPC_POSITIONS_HISTORY_MAX = 10;

function requiresAuth(path) {
  return PROTECTED_PREFIXES.some(p => path === p || path.startsWith(p + '/') || path.startsWith(p + '.'));
}

function checkBasicAuth(request, env) {
  const expected = env.ADMIN_PASSWORD;
  if (!expected) return false;
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Basic ')) return false;
  try {
    const decoded = atob(auth.slice(6));
    const idx = decoded.indexOf(':');
    if (idx < 0) return false;
    const pass = decoded.slice(idx + 1);
    return pass === expected;
  } catch {
    return false;
  }
}

function constantTimeTextEqual(left, right) {
  const a = new TextEncoder().encode(String(left || ''));
  const b = new TextEncoder().encode(String(right || ''));
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    diff |= (a[i % Math.max(a.length, 1)] || 0) ^ (b[i % Math.max(b.length, 1)] || 0);
  }
  return diff === 0;
}

function isSameOriginOrNonBrowser(request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

function checkTtsRequestAuth(request, env) {
  if (!isSameOriginOrNonBrowser(request)) return false;
  if (checkBasicAuth(request, env)) return true;
  const expected = env && env.TTS_ADMIN_SECRET;
  if (!expected) return false;
  const provided = request.headers.get('x-admin-secret') || '';
  return constantTimeTextEqual(provided, expected);
}

function authChallenge() {
  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="pono-asobiba admin", charset="UTF-8"' }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/.netlify/functions/ai-name' || path === '/api/ai-name') {
      return handleAiName(request, env);
    }
    if (path === '/.netlify/functions/ai-tts' || path === '/api/ai-tts') {
      if (request.method !== 'OPTIONS' && !checkTtsRequestAuth(request, env)) {
        return json(401, { error: 'Unauthorized' }, noStoreHeaders());
      }
      return handleAiTts(request, env);
    }
    if (path === '/api/bento/mask-defaults') {
      return handleBentoMaskDefaults(request, env);
    }
    // Step C: 合言葉型クラウド同期 (POST /api/savedata, GET /api/savedata/:passcode)
    if (path === '/api/savedata' || path.startsWith('/api/savedata/')) {
      return handleSaveData(request, env, ctx, path);
    }
    // データ分析基盤: テレメトリ収集 (POST /api/e -> Workers Analytics Engine)。
    // GET/OPTIONS 等の method ハンドリングは handleEvents 側で完結させる (savedata と同じ流儀)。
    if (path === '/api/e') {
      return handleEvents(request, env, ctx);
    }
    if (path === '/api/admin/bento-npc-positions') {
      if (request.method === 'OPTIONS') {
        return new Response('', { status: 200, headers: { ...CORS, ...noStoreHeaders() } });
      }
      if (request.method === 'GET') {
        if (!checkBasicAuth(request, env)) return authChallenge();
        return handleBentoNpcPositionsGet(request, env);
      }
      if (request.method === 'POST') {
        if (!checkBasicAuth(request, env)) return authChallenge();
        return handleBentoNpcPositionsPost(request, env);
      }
      return new Response('Method Not Allowed', { status: 405, headers: { ...CORS, ...noStoreHeaders() } });
    }
    if (path === '/api/admin/bento-mask-defaults-history') {
      if (request.method === 'OPTIONS') {
        return new Response('', { status: 200, headers: { ...CORS, ...noStoreHeaders() } });
      }
      if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405, headers: { ...CORS, ...noStoreHeaders() } });
      }
      if (!checkBasicAuth(request, env)) return authChallenge();
      return handleBentoMaskDefaultsHistoryGet(request, env, url);
    }
    if (path === '/api/admin/tts-generate') {
      if (!isSameOriginOrNonBrowser(request)) {
        return json(403, { error: 'Forbidden' }, noStoreHeaders());
      }
      if (!checkBasicAuth(request, env)) return authChallenge();
      return handleAiTts(request, env);
    }
    // データ分析基盤: admin/index.html「📈 分析」タブ向け読み取り API + 手動ロールアップ起点。
    // 仕様正本: docs/data-analytics-plan.md §6-3/§6-4/§8。実処理は src/api/analytics-admin.js
    // に委譲 (このファイル自体は既存 /api/admin/* と同じ Basic Auth 保護のみを担当)。
    if (path === '/api/admin/analytics/overview') {
      if (request.method === 'OPTIONS') {
        return new Response('', { status: 200, headers: { ...CORS, ...noStoreHeaders() } });
      }
      if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405, headers: { ...CORS, ...noStoreHeaders() } });
      }
      if (!checkBasicAuth(request, env)) return authChallenge();
      return handleAnalyticsOverview(request, env, url);
    }
    if (path === '/api/admin/analytics/games') {
      if (request.method === 'OPTIONS') {
        return new Response('', { status: 200, headers: { ...CORS, ...noStoreHeaders() } });
      }
      if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405, headers: { ...CORS, ...noStoreHeaders() } });
      }
      if (!checkBasicAuth(request, env)) return authChallenge();
      return handleAnalyticsGames(request, env, url);
    }
    if (path === '/api/admin/analytics/retention') {
      if (request.method === 'OPTIONS') {
        return new Response('', { status: 200, headers: { ...CORS, ...noStoreHeaders() } });
      }
      if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405, headers: { ...CORS, ...noStoreHeaders() } });
      }
      if (!checkBasicAuth(request, env)) return authChallenge();
      return handleAnalyticsRetention(request, env, url);
    }
    if (path === '/api/admin/analytics/status') {
      if (request.method === 'OPTIONS') {
        return new Response('', { status: 200, headers: { ...CORS, ...noStoreHeaders() } });
      }
      if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405, headers: { ...CORS, ...noStoreHeaders() } });
      }
      if (!checkBasicAuth(request, env)) return authChallenge();
      return handleAnalyticsStatus(request, env);
    }
    if (path === '/api/admin/analytics/rollup') {
      if (request.method === 'OPTIONS') {
        return new Response('', { status: 200, headers: { ...CORS, ...noStoreHeaders() } });
      }
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: { ...CORS, ...noStoreHeaders() } });
      }
      if (!checkBasicAuth(request, env)) return authChallenge();
      return handleAnalyticsRollupTrigger(request, env);
    }

    if (path.startsWith('/api/gh/')) {
      if (!checkBasicAuth(request, env)) return authChallenge();
      return handleGhProxy(request, env);
    }
    if (path.startsWith('/api/gemini/')) {
      if (!checkBasicAuth(request, env)) return authChallenge();
      return handleGeminiProxy(request, env);
    }

    if (requiresAuth(path)) {
      if (!checkBasicAuth(request, env)) return authChallenge();
    }

    const response = await env.ASSETS.fetch(request);
    const cached = applyCacheHeaders(request, response);
    // batch:1210b: APP_BUILD 注入が実際に適用されたかどうかを先に確定させ、
    // 後段の attachHtmlEtag() の variant サフィックス (-app1/-app0) と食い違わないようにする。
    const appBuildApplied = shouldInjectAppBuildFlag(cached, env);
    const built = injectAppBuildFlag(cached, env);
    return attachHtmlEtag(request, built, env, appBuildApplied);
  },

  // データ分析基盤: 日次ロールアップ (docs/data-analytics-plan.md §6-3)。
  // wrangler.toml の [triggers]/[env.staging-app.triggers] crons=["0 19 * * *"]
  // (UTC19時=JST翌4時、production/staging-appのみ。LP stagingは crons=[] で無効化済み) から
  // 起動される。実処理は src/api/analytics-rollup.js の handleScheduledRollup(env) に委譲し、
  // 同関数は WAE_SQL_TOKEN/ANALYTICS_DB/ANALYTICS_DATASET のいずれかが env に無ければ
  // エラーで落とさず graceful skip する (契約: このファイルからは env を渡すだけで良い)。
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduledRollup(env));
  }
};

// アプリ版 staging worker (pono-asobiba-app-staging) では env.APP_BUILD="1" を設定し、
// 静的 HTML レスポンスへ window.__APP_BUILD__=1 を <head> 直後に注入する。
// - API レスポンス (/.netlify/functions/*, /api/*) はこの関数まで到達しないので安全。
// - 既存 worker (production / staging) は APP_BUILD 未定義なので 100% 既存動作のままパススルー。
// - HTMLRewriter は Cloudflare Workers 標準のストリーミング変換 API なので
//   巨大な HTML でもメモリに全展開せず低コスト。
function shouldInjectAppBuildFlag(response, env) {
  if (env.APP_BUILD !== '1') return false;
  if (response.status < 200 || response.status >= 300) return false;
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('text/html');
}

function injectAppBuildFlag(response, env) {
  if (!shouldInjectAppBuildFlag(response, env)) return response;
  return new HTMLRewriter()
    .on('head', {
      element(el) {
        el.prepend('<script>window.__APP_BUILD__=1;</script>', { html: true });
      }
    })
    .transform(response);
}

// ---------------------------------------------------------------------------
// batch:1210b — HTML の ETag / 条件付きリクエスト (If-None-Match) 対応。
//
// 【実測で確認した根本原因 (2026-07-10)】
//   env.ASSETS.fetch() が返す HTML レスポンスには ETag / Last-Modified が
//   一切付かない。これは APP_BUILD 注入 (injectAppBuildFlag/HTMLRewriter) や
//   applyCacheHeaders のヘッダー再構築が原因ではない —
//   - APP_BUILD=1 の App staging (/play) と APP_BUILD 未設定の LP staging (/) の
//     両方で ETag 欠落を確認 (HTMLRewriter を経由しない LP staging でも欠落する
//     ため、 HTMLRewriter が犯人ではない)。
//   - applyCacheHeaders は `new Headers(response.headers)` で複製するだけで
//     ETag を触っていない (該当コード参照)。
//   - 直接ファイル名+拡張子で一致する静的アセット (例: /common/tier.js) には
//     Workers Assets のマニフェスト content-hash ETag が付く一方、
//     html_handling (auto-trailing-slash) 経由で解決される HTML
//     (`/play.html` → 307 → `/play` 等) には付かない。
//   → 結論: ETag が失われているのは worker.js ではなく upstream
//     (Workers Assets の html_handling 経路) 側の未文書化の挙動。
//
// 【対応方針】
//   upstream に ETag が無い以上、「upstream の ETag に variant サフィックスを
//   付けて再利用する」だけでは 304 は永久に成立しない。そこで:
//     1) upstream に「強い」ETag がもしあれば (将来 Cloudflare 側で付与されるように
//        なった場合や他経路向けの保険として) それを再利用し、
//        APP_BUILD 注入の有無を表す variant サフィックス (-app1/-app0) を付与する
//        (同じ upstream ファイルでも注入あり/なしで本文が変わるため)。
//        弱い upstream ETag (W/"...") は昇格させず 2) に落とす (RFC 7232 §2.1、
//        attachHtmlEtag() 冒頭のコメント参照)。
//     2) upstream に ETag が無ければ、本文 (APP_BUILD 注入後の最終バイト列) の
//        SHA-1 ハッシュから自前の ETag を生成する。ハッシュ計算のため本文を
//        一度バッファする必要があるが、対象は HTML のみ (165-220KB 程度) で
//        Worker CPU コストは軽微。ネットワーク越しに client へ送るバイト数を
//        減らすことが目的であり、 Worker 内部で本文を読むこと自体はコストにならない。
//   ※ ETag は必ず「強い形式」("...") で出力する (W/ 付きの弱い形式は Cloudflare
//     エッジが egress で削除するため。 2026-07-10 live 実測。 詳細は
//     attachHtmlEtag() 内の自前ハッシュ分岐コメント参照)。
//   ※※ ただし 2026-07-10 の決定実験で、 強い形式でも html_handling HTML の
//     ETag はエッジに削除されることが判明。 クライアントに実際に届く validator は
//     ハッシュ符号化 Last-Modified (encodeValidatorLastModified() 上のコメント参照)。
//     ETag / If-None-Match ロジックは「届く環境向けの保険 + 判定精度の高い経路」
//     として温存する (INM が届けば RFC 7232 §6 に従い INM 優先で判定)。
//   条件付きリクエストの判定は 「compare-after-fetch」方式を採用する
//   (upstream 側の If-None-Match を書き換えて 304 を誘発する inverse-mapping 方式は、
//   upstream が今のところ ETag を返さないため成立せず、素通しで害もないので不要)。
//   client の If-None-Match が確定した ETag と一致するか、 If-Modified-Since が
//   符号化 Last-Modified と完全一致すれば、 ここで body を送らず 304 を返す
//   (body 変換は既に完了済みだが、 ネットワーク転送そのものをスキップできるので
//   目的は達成できる)。
// ---------------------------------------------------------------------------

function normalizeEtagValue(raw) {
  const m = /^(W\/)?"(.*)"$/.exec((raw || '').trim());
  return m ? m[2] : (raw || '').replace(/"/g, '').trim();
}

// 複数 ETag のカンマ区切り、W/ 弱比較プレフィックス、`*` ワイルドカードを許容する。
function ifNoneMatchHits(headerValue, etag) {
  if (!headerValue || !etag) return false;
  const trimmed = headerValue.trim();
  if (trimmed === '*') return true;
  const target = normalizeEtagValue(etag);
  return trimmed.split(',').some(part => normalizeEtagValue(part) === target);
}

async function sha1Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// ハッシュ符号化 Last-Modified (2026-07-10 決定実験の結果を受けた本命 validator)。
//
// 【決定実験 (2026-07-10、 staging-app に一時プローブを手動デプロイして実測)】
//   html_handling 経由の HTML レスポンスに ETag / Last-Modified / カスタムヘッダーを
//   同時に付けて配送状況を確認した結果:
//     - ETag: 強い形式 ("...") でも Accept-Encoding の有無を問わず全ケースで
//       エッジに削除されクライアントに届かない (弱い W/"..." も同様)。
//       ※ /manifest.json 等「直接拡張子マッチの静的アセット」の ETag は届くため、
//         エッジは html_handling 解決された HTML の validator だけをサニタイズしている。
//       ※ worker 内の ETag 計算・If-None-Match 判定自体は生きている
//         (`If-None-Match: *` → 304 が live 成立、 tail に例外ログゼロ)。
//     - Last-Modified: 全ケースで無傷でクライアントに届く。
//     - カスタムヘッダー (x-po-probe): 届く。
//     - inbound の If-None-Match / If-Modified-Since: どちらも worker まで届く
//       (プローブでヘッダー値をエコーして確認)。
//   → 唯一クライアントに届く標準 validator は Last-Modified。
//
// 【方式】
//   コンテンツ SHA-1 の先頭 32bit を 27bit にマスクし、 固定基準日
//   (2020-01-01T00:00:00Z) からのオフセット秒として過去日時にエンコードする
//   (最大オフセット 2^27-1 秒 ≈ 4.25 年 → 2024-04-05 まで。 常に過去日時)。
//   ブラウザは `Cache-Control: no-cache` + Last-Modified の組で自然に
//   If-Modified-Since を送ってくるので、 これで 304 フローが成立する。
//
// 【If-Modified-Since は「完全一致」比較にする理由】
//   本 Last-Modified は実時刻ではなくハッシュの符号化なので、 RFC 7232 の
//   「received >= lastModified なら 304」比較を使うと、 たまたま新しい日時を持つ
//   無関係な IMS に対して誤って 304 を返してしまう。 エンコード値と完全一致した
//   場合のみ「同一コンテンツの再検証」とみなす (不一致は全て 200 full body = 安全側)。
//   衝突確率は 1/2^27 ≈ 7.5e-9 (ページ更新時に旧新の符号化値が偶然一致して
//   304 が返り続ける確率) で実用上無視できる。
// ---------------------------------------------------------------------------
const LM_BASE_EPOCH_MS = Date.UTC(2020, 0, 1);
const LM_OFFSET_MASK = 0x7ffffff; // 27bit

function encodeValidatorLastModified(hashHex) {
  const offsetSec = (parseInt((hashHex || '').slice(0, 8), 16) || 0) & LM_OFFSET_MASK;
  return new Date(LM_BASE_EPOCH_MS + offsetSec * 1000).toUTCString();
}

function ifModifiedSinceHits(headerValue, lastModified) {
  if (!headerValue || !lastModified) return false;
  const received = Date.parse(headerValue);
  const expected = Date.parse(lastModified);
  return Number.isFinite(received) && Number.isFinite(expected) && received === expected;
}

async function attachHtmlEtag(request, response, env, appBuildApplied) {
  // GET / HEAD のみ対象。 RFC 9110 §13.1.3 は「GET/HEAD 以外のメソッドでは
  // If-Modified-Since を無視しなければならない (MUST)」と定めており、 304 自体も
  // GET/HEAD 専用。 本番の Workers Assets は非 GET/HEAD に 405 を返すので現状は
  // status !== 200 ガードでも到達しないが、 それは未文書化の upstream 挙動への
  // 依存であり (本日 ETag 削除で二度学んだ通り)、 ここで明示的に閉じる
  // (2026-07-10 最終レビューで検出、 stub test Test 13 で再現)。
  if (request.method !== 'GET' && request.method !== 'HEAD') return response;
  // 200 のみ対象 (2xx 全般ではない)。 206 Partial Content を通すと「部分 body の
  // ハッシュ」を表現全体の強い ETag として公開してしまい、 後続の If-None-Match /
  // If-Range 判定を壊す。 204 も body が無いので validator を作れない
  // (2026-07-10 再レビューで検出、 stub test Test 11 で再現)。
  if (response.status !== 200) return response;
  const url = new URL(request.url);
  const contentType = response.headers.get('content-type') || '';
  const isHTML = contentType.includes('text/html')
    || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (!isHTML) return response;

  const variantSuffix = appBuildApplied ? 'app1' : 'app0';
  const rawUpstreamEtag = response.headers.get('etag');
  // 弱い upstream ETag (W/"...") は再利用しない。 弱い validator は「意味的等価」しか
  // 主張しておらず、 それを強い形式 ("...") に昇格させて再発行すると upstream が
  // 保証していないバイト同一性を主張することになる (RFC 7232 §2.1 違反。 If-Range の
  // バイトレンジ結合等で実害が出うる)。 弱い場合は upstream ETag 無し扱いにして
  // 下の自前ハッシュ分岐 (最終バイト列の SHA-1 = 正真の強い ETag) に落とす
  // (2026-07-10 再レビューで検出、 stub test Test 10 で再現)。
  const upstreamEtag = rawUpstreamEtag && !/^\s*W\//i.test(rawUpstreamEtag)
    ? rawUpstreamEtag
    : null;

  let outgoingEtag = null;
  let outgoingLastModified = null;
  let bodyText = null;

  if (upstreamEtag) {
    // upstream (将来 or 他経路) に強い ETag があれば再利用。body には触れないので
    // ストリーミングのメリットはそのまま維持される。
    // ※ 強い ETag 形式 (W/ なし) で出すこと。 Worker から弱い W/"..." を返すと
    //   Cloudflare エッジが egress で ETag ヘッダーごと削除する
    //   (2026-07-10 実測。 詳細は下の自前ハッシュ分岐のコメント参照)。
    outgoingEtag = `"${normalizeEtagValue(upstreamEtag)}-${variantSuffix}"`;
    // Last-Modified はエッジに削除されない唯一の標準 validator なので必ず併送する
    // (encodeValidatorLastModified() 上のコメント参照)。 upstream ETag は
    // content-hash なので「ETag 値 + variant」を種にすれば body を読まずに
    // 決定的な符号化日時を導出できる (ストリーミング維持)。
    try {
      outgoingLastModified = encodeValidatorLastModified(
        await sha1Hex(normalizeEtagValue(upstreamEtag) + '-' + variantSuffix)
      );
    } catch (e) {
      // LM が作れなくても ETag のみで続行 (安全側)。
      console.error('[attachHtmlEtag] LM derivation failed for ' + url.pathname + ': ' + (e && e.name) + ': ' + (e && e.message));
      outgoingLastModified = null;
    }
  } else if (request.method === 'HEAD') {
    // HEAD には body が無く本文ハッシュを計算できないので、
    // validator なしの従来動作にフォールバックする（安全側）。
    return response;
  } else {
    try {
      bodyText = await response.text();
    } catch (e) {
      // 本文取得に失敗したら validator なしの従来動作にフォールバック。
      // 2026-07-10: この catch がステージング環境で ETag 欠落の原因を完全に
      // 隠していた (failure-safe 設計が実際の runtime-only 例外を握りつぶす)。
      // 原因を特定できるよう、フォールバックする前に必ずログへ残す。
      console.error('[attachHtmlEtag] response.text() failed for ' + url.pathname + ': ' + (e && e.name) + ': ' + (e && e.message));
      return response;
    }
    try {
      const hash = await sha1Hex(bodyText);
      // 【強い ETag 形式 (W/ なし) を使う理由 — 2026-07-10 live 実測で確定】
      //   Worker が弱い ETag (W/"...") を返すと、 Cloudflare エッジは egress で
      //   ETag ヘッダーを丸ごと削除する (Accept-Encoding の有無を問わず全ケースで
      //   欠落を確認)。 一方、 強い ETag ("...") は:
      //     - 無圧縮応答ではそのまま届く
      //     - エッジが gzip/br 圧縮した応答では W/"..." に自動降格されて届く
      //       (/manifest.json・/common/tier.js の upstream 強 ETag で実測)。
      //   つまり client に validator を届けるには強い形式で渡すしかない。
      //   worker 内の attachHtmlEtag が正しく動いていることは
      //   `If-None-Match: *` → 304 が live で成立したことにより確認済み
      //   (= コードの例外ではなくエッジのヘッダー削除が根本原因)。
      //   本 ETag は最終バイト列全体の SHA-1 なので「同一タグ = バイト同一」が
      //   成立し、 強い ETag の意味論を正しく満たす。 client がエッジ降格後の
      //   W/"..." を If-None-Match で送り返しても、 ifNoneMatchHits() は
      //   W/ プレフィックスを無視して比較する (RFC 7232 の weak comparison) ので
      //   304 は正しく成立する。
      // 【追記 (2026-07-10 決定実験後)】 強い形式にしてもエッジは html_handling
      //   HTML の ETag を削除することが判明 (encodeValidatorLastModified() 上の
      //   コメント参照)。 ETag 送出は「届く環境では併用できる保険 + INM 判定の
      //   ソース」として温存し、 クライアントに実際に届く validator は下の
      //   ハッシュ符号化 Last-Modified が担う。
      outgoingEtag = `"h${hash.slice(0, 16)}-${variantSuffix}"`;
      // body ハッシュ (注入後の最終バイト列) をそのまま種に使う。 variant は body に
      // 織り込み済みなので app0/app1 で自然に別日時になる。
      outgoingLastModified = encodeValidatorLastModified(hash);
    } catch (e) {
      // crypto.subtle が使えない環境向けの保険（Workers では通常発生しない）。
      console.error('[attachHtmlEtag] sha1Hex() failed for ' + url.pathname + ': ' + (e && e.name) + ': ' + (e && e.message));
      // 既に body は読み切っているので bodyText で作り直して返す。
      // response.headers をそのまま使うと、 response.text() が Content-Encoding
      // (gzip/br 等) を透過的に解凍した後の平文を Content-Encoding 付きのヘッダーで
      // 送ることになり、 クライアント側で解凍に失敗して HTML が壊れる
      // (2026-07-10 レビューで検出。 下の 200/304 分岐と同じ理由なのでここでも
      // 同様に Content-Length / Content-Encoding を削除する)。
      const fallbackHeaders = new Headers(response.headers);
      fallbackHeaders.delete('Content-Length');
      fallbackHeaders.delete('Content-Encoding');
      return new Response(bodyText, {
        status: response.status,
        statusText: response.statusText,
        headers: fallbackHeaders
      });
    }
  }

  const ifNoneMatch = request.headers.get('if-none-match');
  const ifModifiedSince = request.headers.get('if-modified-since');
  // RFC 7232 §6: If-None-Match が存在する場合、 If-Modified-Since は無視する
  // (ETag の方が精度が高いため)。 実運用では エッジが ETag を削除するので
  // ブラウザは If-Modified-Since しか送ってこない → ハッシュ符号化 Last-Modified の
  // 完全一致比較 (ifModifiedSinceHits) が本命の 304 経路になる。
  const notModified = ifNoneMatch !== null
    ? ifNoneMatchHits(ifNoneMatch, outgoingEtag)
    : ifModifiedSinceHits(ifModifiedSince, outgoingLastModified);
  if (notModified) {
    const headers = new Headers(response.headers);
    headers.set('ETag', outgoingEtag);
    if (outgoingLastModified) headers.set('Last-Modified', outgoingLastModified);
    headers.delete('Content-Length');
    // bodyText を読んだ (= response.text() でデコード済み) 場合、 Content-Encoding は
    // もう実体と一致しない (compressed bytes はデコードで失われている) ので削除する。
    // 304 自体は body を持たないので直接の実害は無いが、 中間キャッシュ/プロキシが
    // 304 のヘッダーを対応する 200 の予告として扱うケースに備えて一貫させる
    // (2026-07-10 レビューで検出。 下の 200 分岐と同じ理由)。
    if (bodyText !== null) headers.delete('Content-Encoding');
    if (bodyText === null && response.body && typeof response.body.cancel === 'function') {
      response.body.cancel().catch(() => {});
    }
    // 304 は spec 上 body を持てない (null body)。
    return new Response(null, { status: 304, statusText: 'Not Modified', headers });
  }

  const headers = new Headers(response.headers);
  headers.set('ETag', outgoingEtag);
  if (outgoingLastModified) headers.set('Last-Modified', outgoingLastModified);
  if (bodyText !== null) {
    // response.text() は Content-Encoding (gzip/br 等) があれば透過的に解凍した上で
    // デコードするが、 response.headers 側の Content-Encoding はそのまま残る
    // (Fetch 実装はヘッダーを書き換えない、いわゆる "Content-Encoding の嘘")。
    // decode 済みの bodyText をそのまま新しい Response に詰めるとき Content-Encoding
    // を残すと、 「圧縮されている」と主張したまま平文が流れることになりクライアント側で
    // 解凍に失敗して HTML 全体が壊れる (2026-07-10 レビューで検出、 stub test Test 7 で
    // 再現)。 Content-Length も本文長が変わるため削除する。
    headers.delete('Content-Length');
    headers.delete('Content-Encoding');
  }
  return new Response(bodyText !== null ? bodyText : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

// HTML は常に最新、それ以外（画像・動画・JS・CSS）は長期キャッシュ
// CDN-Cache-Control / Cloudflare-CDN-Cache-Control は Cloudflare エッジに効く
function applyCacheHeaders(request, response) {
  const url = new URL(request.url);
  const path = url.pathname;
  const contentType = response.headers.get('content-type') || '';
  const isHTML = contentType.includes('text/html')
    || path.endsWith('/') || path.endsWith('.html');
  // 常に再取得させたいデータ系（完全一致で意図を明確化）
  const isFreshData = path === '/room/items.js'
    || path === '/assets/data/rewards.json'
    || path === '/assets/tts/manifest.json'
    || path === '/manifest.json'
    || path === '/sw.js'
    // 迷路 image ステージのインデックスと個別 JSON は本番保存後すぐ反映したい
    || path === '/maze/imageStages/_index.json'
    || (path.startsWith('/maze/imageStages/') && path.endsWith('.json'))
    // preview の保存レイアウトは PC で書いたら即スマホで見えるように毎回フレッシュ
    || path === '/quizland/preview/full/saved-layout.json'
    || path === '/quizland/saved-layout.json';

  if (isHTML || isFreshData) {
    const headers = new Headers(response.headers);
    // no-cache = 「保存してよいが使用前に必ず再検証」。 旧 no-store は保存自体を禁止する
    // ため ETag 304 が成立せず、 タイトル⇔ゲーム遷移のたびに HTML 全文 (brotli 165-222KB)
    // を再ダウンロードしていた。 no-cache なら毎リクエスト検証で deploy 即時反映は同一の
    // まま、 変更が無ければ 304 (body なし) で済む (2026-07-10)。
    // batch:1210b 追記: 実測の結果、 env.ASSETS.fetch() は HTML に ETag を付与しない
    // (html_handling 経由の upstream 側の挙動。 詳細は attachHtmlEtag() のコメント参照)。
    // validator の生成・条件付きリクエスト判定は attachHtmlEtag() (fetch ハンドラの
    // 最終段) が担当するので、 ここでは Cache-Control 系ヘッダーの上書きのみ行う
    // (下の new Response は headers を複製するだけで ETag には触れない)。
    headers.set('Cache-Control', 'no-cache');
    headers.set('CDN-Cache-Control', 'no-store');
    headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
  return response;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

function json(status, obj, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...(extraHeaders || {}) }
  });
}

function noStoreHeaders() {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
}

function roundBentoMaskNumber(value, fallback = 0, digits = 4) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const scale = Math.pow(10, digits);
  const rounded = Math.round(n * scale) / scale;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function clampBentoMaskNumber(value, min, max, fallback, digits = 4) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return roundBentoMaskNumber(Math.min(max, Math.max(min, n)), fallback, digits);
}

function normalizeBentoMaskRel(rel) {
  return {
    x: clampBentoMaskNumber(rel && rel.x, -0.5, 1.5, 0),
    y: clampBentoMaskNumber(rel && rel.y, -0.5, 1.5, 0),
    w: clampBentoMaskNumber(rel && rel.w, 0.05, 1.5, 1),
    h: clampBentoMaskNumber(rel && rel.h, 0.05, 1.5, 1)
  };
}

function normalizeBentoCompleteLayout(layout) {
  return {
    x: clampBentoMaskNumber(layout && layout.x, -120, 120, 0, 1),
    y: clampBentoMaskNumber(layout && layout.y, -160, 280, 0, 1),
    w: clampBentoMaskNumber(layout && layout.w, 80, 120, 100, 1)
  };
}

function normalizeBentoCompleteLid(lid) {
  return {
    x: clampBentoMaskNumber(lid && lid.x, -160, 160, 0, 1),
    y: clampBentoMaskNumber(lid && lid.y, -180, 240, 0, 1),
    w: clampBentoMaskNumber(lid && lid.w, 70, 130, 100, 1)
  };
}

function getBentoEntryValue(entry, aliases) {
  if (!entry || typeof entry !== 'object') return null;
  for (const alias of aliases) {
    if (entry[alias] && typeof entry[alias] === 'object') return entry[alias];
  }
  return ['x', 'y', 'w', 'h'].some(prop => Object.prototype.hasOwnProperty.call(entry, prop))
    ? entry
    : null;
}

function normalizeBentoMaskBoundsMap(map) {
  const normalized = {};
  if (!map || typeof map !== 'object' || Array.isArray(map)) return normalized;
  Object.keys(map).sort().forEach(key => {
    if (!/^[a-z0-9_:-]{1,80}$/i.test(key)) return;
    const rel = getBentoEntryValue(map[key], ['rel']);
    if (rel) normalized[key] = { rel: normalizeBentoMaskRel(rel) };
  });
  return normalized;
}

function normalizeBentoCompleteLayoutMap(map) {
  const normalized = {};
  if (!map || typeof map !== 'object' || Array.isArray(map)) return normalized;
  Object.keys(map).sort().forEach(key => {
    if (!/^[a-z0-9_:-]{1,100}$/i.test(key)) return;
    const entry = map[key];
    if (key.endsWith(':mask')) {
      const rel = getBentoEntryValue(entry, ['rel', 'mask']);
      if (rel) normalized[key] = { rel: normalizeBentoMaskRel(rel) };
      return;
    }
    if (key.endsWith(':lid')) {
      const lid = getBentoEntryValue(entry, ['lid', 'layout']);
      if (lid) normalized[key] = { lid: normalizeBentoCompleteLid(lid) };
      return;
    }
    const layout = getBentoEntryValue(entry, ['layout']);
    if (layout) normalized[key] = { layout: normalizeBentoCompleteLayout(layout) };
  });
  return normalized;
}

const BENTO_SLOT_LAYOUT_LIMITS = {
  'main-food': 2,
  'side-food': 4,
  cup: 4,
  leaf: 1,
  divider: 7,
  other: 1
};
const BENTO_SHARED_SLOT_KINDS = new Set(['leaf', 'other']);
const BENTO_SHARED_SAMPLE_SIZE_KINDS = new Set(['main-food', 'side-food', 'leaf', 'divider', 'other']);
const BENTO_SLOT_BOX_ORDER = [
  'box_rect_split',
  'box_square',
  'box_round',
  'box_bear',
  'box_bear_pink',
  'box_cat_blue',
  'box_cat'
];
const BENTO_SLOT_BOX_ALIASES = {
  box_bear_pink: 'box_bear',
  box_cat: 'box_cat_blue'
};
const BENTO_CUP_SLOT_SIZES = [150];
const BENTO_SLOT_GLOBAL_SCALE_MIN = 0.6;
const BENTO_SLOT_GLOBAL_SCALE_MAX = 1.4;
const BENTO_SLOT_GLOBAL_SCALE_DEFAULT = 1;

function normalizeBentoSlotCounts(raw) {
  const normalized = {};
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const side = source['side-food'] ?? source.sideFood ?? source.sideFoodSlotCount;
  if (Number.isFinite(Number(side))) {
    normalized['side-food'] = clampBentoMaskNumber(side, 3, 4, 3, 0);
  }
  return normalized;
}

function normalizeBentoSlotGlobalScale(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return BENTO_SLOT_GLOBAL_SCALE_DEFAULT;
  return Math.round(clampBentoMaskNumber(n, BENTO_SLOT_GLOBAL_SCALE_MIN, BENTO_SLOT_GLOBAL_SCALE_MAX, BENTO_SLOT_GLOBAL_SCALE_DEFAULT, 3) * 100) / 100;
}

function normalizeBentoSlotSize(size, kind) {
  const n = clampBentoMaskNumber(size, 32, 340, 120, 1);
  if (kind !== 'cup') return n;
  return BENTO_CUP_SLOT_SIZES.reduce((best, value) => (
    Math.abs(value - n) < Math.abs(best - n) ? value : best
  ), BENTO_CUP_SLOT_SIZES[0]);
}

function normalizeBentoSlotSampleOverrides(point, kind) {
  const raw = point && point.sampleOverrides;
  const normalized = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return normalized;
  Object.keys(raw).sort().forEach(sampleId => {
    const id = String(sampleId || '').trim();
    const src = raw[sampleId];
    if (!/^[a-z0-9_:-]{1,80}$/i.test(id) || !src || typeof src !== 'object' || Array.isArray(src)) return;
    const override = normalizeBentoSlotPoint(src, kind);
    delete override.sampleId;
    delete override.sampleOverrides;
    delete override.markerX;
    delete override.markerY;
    if (src.positionOverride === true) override.positionOverride = true;
    normalized[id] = override;
  });
  return normalized;
}

// batch:1058-hotfix5: 仕切りG(index6)の縦強制変換は撤去。admin の横見本の明示選択を尊重する。
// 旧短縮形ID(divider_wood/divider_wave)の自動移行は 2026-07-02 の KV 再構築で対象データが実在しないため不要。
function normalizeBentoSlotSampleId(kind, index, sampleId) {
  return String(sampleId || '').trim();
}

function normalizeBentoSlotPoint(point, kind, index = null) {
  const normalized = {
    x: clampBentoMaskNumber(point && point.x, 0, 760, 380, 1),
    y: clampBentoMaskNumber(point && point.y, 0, 460, 230, 1)
  };
  if ((kind === 'side-food' || kind === 'cup')
      && Number.isFinite(Number(point && point.markerX))
      && Number.isFinite(Number(point && point.markerY))) {
    normalized.markerX = clampBentoMaskNumber(point.markerX, 0, 760, 380, 1);
    normalized.markerY = clampBentoMaskNumber(point.markerY, 0, 460, 230, 1);
  }
  if (Number.isFinite(Number(point && point.size))) {
    normalized.size = normalizeBentoSlotSize(point.size, kind);
  }
  const sampleId = normalizeBentoSlotSampleId(kind, index, point && point.sampleId);
  if (/^[a-z0-9_:-]{1,80}$/i.test(sampleId)) {
    normalized.sampleId = sampleId;
  }
  const sampleOverrides = normalizeBentoSlotSampleOverrides(point, kind);
  if (Object.keys(sampleOverrides).length) {
    normalized.sampleOverrides = sampleOverrides;
  }
  return normalized;
}
function mergeBentoSharedSlotPoints(list, kind) {
  const valid = Array.isArray(list)
    ? list.filter(point => point && typeof point === 'object' && !Array.isArray(point))
    : [];
  if (!valid.length) return [];
  const merged = normalizeBentoSlotPoint(valid[0], kind, 0);
  const overrides = merged.sampleOverrides && typeof merged.sampleOverrides === 'object' && !Array.isArray(merged.sampleOverrides)
    ? { ...merged.sampleOverrides }
    : {};
  valid.forEach((point, index) => {
    const normalized = normalizeBentoSlotPoint(point, kind, index);
    Object.entries(normalized.sampleOverrides || {}).forEach(([sampleId, override]) => {
      if (!override) return;
      overrides[sampleId] = { ...override, x: merged.x, y: merged.y };
    });
    if (normalized.sampleId && Number.isFinite(Number(normalized.size))) {
      overrides[normalized.sampleId] = {
        ...(overrides[normalized.sampleId] || {}),
        x: merged.x,
        y: merged.y,
        size: normalized.size
      };
    }
  });
  if (Object.keys(overrides).length) merged.sampleOverrides = overrides;
  return [merged];
}

function getBentoSlotPointSampleSize(point, sampleId, kind) {
  if (!point || !sampleId) return null;
  const overrides = point.sampleOverrides && typeof point.sampleOverrides === 'object' && !Array.isArray(point.sampleOverrides)
    ? point.sampleOverrides
    : null;
  const override = overrides && overrides[sampleId];
  if (override && Number.isFinite(Number(override.size))) return normalizeBentoSlotSize(override.size, kind);
  if (point.sampleId === sampleId && Number.isFinite(Number(point.size))) return normalizeBentoSlotSize(point.size, kind);
  return null;
}

function getBentoSlotLayoutBoxIds(map) {
  const seen = new Set();
  const ids = [];
  if (!map || typeof map !== 'object' || Array.isArray(map)) return ids;
  BENTO_SLOT_BOX_ORDER.forEach(boxId => {
    if (Object.prototype.hasOwnProperty.call(map, boxId)) {
      const canonicalBoxId = BENTO_SLOT_BOX_ALIASES[boxId] || boxId;
      if (canonicalBoxId !== boxId && Object.prototype.hasOwnProperty.call(map, canonicalBoxId)) return;
      if (!seen.has(canonicalBoxId)) {
        seen.add(canonicalBoxId);
        ids.push(boxId);
      }
    }
  });
  Object.keys(map).sort().forEach(boxId => {
    if (/^[a-z0-9_:-]{1,80}$/i.test(boxId)) {
      const canonicalBoxId = BENTO_SLOT_BOX_ALIASES[boxId] || boxId;
      if (canonicalBoxId !== boxId && Object.prototype.hasOwnProperty.call(map, canonicalBoxId)) return;
      if (seen.has(canonicalBoxId)) return;
      seen.add(canonicalBoxId);
      ids.push(boxId);
    }
  });
  return ids;
}

function collectBentoSlotSampleSizes(points, kind, sizes = {}) {
  if (!BENTO_SHARED_SAMPLE_SIZE_KINDS.has(kind) || !Array.isArray(points)) return sizes;
  points.forEach(point => {
    if (!point || typeof point !== 'object' || Array.isArray(point)) return;
    if (point.sampleId && sizes[point.sampleId] == null) {
      const activeSize = getBentoSlotPointSampleSize(point, point.sampleId, kind);
      if (activeSize != null) sizes[point.sampleId] = activeSize;
    }
    const overrides = point.sampleOverrides && typeof point.sampleOverrides === 'object' && !Array.isArray(point.sampleOverrides)
      ? point.sampleOverrides
      : {};
    Object.keys(overrides).sort().forEach(sampleId => {
      if (sizes[sampleId] != null) return;
      const size = getBentoSlotPointSampleSize(point, sampleId, kind);
      if (size != null) sizes[sampleId] = size;
    });
  });
  return sizes;
}

function syncBentoSlotSampleSizes(points, kind, sharedSizes) {
  if (!BENTO_SHARED_SAMPLE_SIZE_KINDS.has(kind) || !Array.isArray(points)) return points;
  const sizes = sharedSizes || collectBentoSlotSampleSizes(points, kind, {});
  if (!Object.keys(sizes).length) return points;
  return points.map(point => {
    const next = { ...point };
    const overrides = next.sampleOverrides && typeof next.sampleOverrides === 'object' && !Array.isArray(next.sampleOverrides)
      ? { ...next.sampleOverrides }
      : {};
    Object.keys(sizes).forEach(sampleId => {
      const override = overrides[sampleId] || {};
      const nextOverride = {
        x: Number.isFinite(Number(override.x)) ? override.x : next.x,
        y: Number.isFinite(Number(override.y)) ? override.y : next.y,
        size: sizes[sampleId]
      };
      if (override.positionOverride === true) nextOverride.positionOverride = true;
      overrides[sampleId] = nextOverride;
      if (next.sampleId === sampleId) next.size = sizes[sampleId];
    });
    if (Object.keys(overrides).length) next.sampleOverrides = overrides;
    return normalizeBentoSlotPoint(next, kind);
  });
}

function normalizeBentoSlotLayoutMap(map) {
  const normalized = {};
  if (!map || typeof map !== 'object' || Array.isArray(map)) return normalized;
  getBentoSlotLayoutBoxIds(map).forEach(boxId => {
    if (!/^[a-z0-9_:-]{1,80}$/i.test(boxId)) return;
    const canonicalBoxId = BENTO_SLOT_BOX_ALIASES[boxId] || boxId;
    if (normalized[canonicalBoxId]) return;
    const box = map[boxId];
    if (!box || typeof box !== 'object' || Array.isArray(box)) return;
    const entry = {};
    const globalScale = normalizeBentoSlotGlobalScale(box.globalScale);
    if (Math.abs(globalScale - BENTO_SLOT_GLOBAL_SCALE_DEFAULT) >= 0.001) entry.globalScale = globalScale;
    const slotCounts = normalizeBentoSlotCounts(box.slotCounts || {});
    if (Object.keys(slotCounts).length) entry.slotCounts = slotCounts;
    Object.keys(BENTO_SLOT_LAYOUT_LIMITS).forEach(kind => {
      const list = Array.isArray(box[kind]) ? box[kind] : [];
      const validPoints = list.filter(point => point && typeof point === 'object' && !Array.isArray(point));
      const points = BENTO_SHARED_SLOT_KINDS.has(kind)
        ? mergeBentoSharedSlotPoints(validPoints, kind)
        : validPoints.slice(0, BENTO_SLOT_LAYOUT_LIMITS[kind]).map((point, index) => normalizeBentoSlotPoint(point, kind, index));
      if (points.length) entry[kind] = points;
    });
    if (Object.keys(entry).length) normalized[canonicalBoxId] = entry;
  });
  BENTO_SHARED_SAMPLE_SIZE_KINDS.forEach(kind => {
    const sizes = {};
    getBentoSlotLayoutBoxIds(normalized).forEach(boxId => {
      const box = normalized[boxId];
      collectBentoSlotSampleSizes(box && box[kind], kind, sizes);
    });
    if (!Object.keys(sizes).length) return;
    getBentoSlotLayoutBoxIds(normalized).forEach(boxId => {
      const box = normalized[boxId];
      if (box && Array.isArray(box[kind])) {
        box[kind] = syncBentoSlotSampleSizes(box[kind], kind, sizes);
      }
    });
  });
  return normalized;
}

function normalizeBentoNpcPositionsMap(map) {
  const normalized = {};
  if (!map || typeof map !== 'object' || Array.isArray(map)) return normalized;
  Object.keys(map).sort().forEach(key => {
    if (!/^[a-z0-9_:-]{1,100}$/i.test(key)) return;
    const src = map[key];
    if (!src || typeof src !== 'object' || Array.isArray(src)) return;
    const entry = {};
    if (Number.isFinite(Number(src.x))) entry.x = clampBentoMaskNumber(src.x, 0, 100, 58, 1);
    if (Number.isFinite(Number(src.y))) entry.y = clampBentoMaskNumber(src.y, 0, 100, 23, 1);
    if (Number.isFinite(Number(src.scale))) entry.scale = clampBentoMaskNumber(src.scale, 0.5, 2, 1, 2);
    if (Number.isFinite(Number(src.scaleX))) entry.scaleX = clampBentoMaskNumber(src.scaleX, 0.5, 2, 1, 2);
    if (Number.isFinite(Number(src.scaleY))) entry.scaleY = clampBentoMaskNumber(src.scaleY, 0.5, 2, 1, 2);
    if (Number.isFinite(Number(src.rotation))) entry.rotation = clampBentoMaskNumber(src.rotation, -20, 20, 0, 1);
    if (Number.isFinite(Number(src.opacity))) entry.opacity = clampBentoMaskNumber(src.opacity, 0, 1, 1, 2);
    if (Object.keys(entry).length) normalized[key] = entry;
  });
  return normalized;
}

function normalizeBentoCounterMask(mask, defaults) {
  const fallback = defaults || { x: 0, y: 0, width: 100, height: 100, opacity: 1 };
  const src = mask && typeof mask === 'object' && !Array.isArray(mask) ? mask : {};
  const normalized = {
    x: clampBentoMaskNumber(src.x, 0, 100, fallback.x, 1),
    y: clampBentoMaskNumber(src.y, 0, 100, fallback.y, 1),
    width: clampBentoMaskNumber(src.width, 1, 100, fallback.width, 1),
    height: clampBentoMaskNumber(src.height, 1, 100, fallback.height, 1),
    opacity: clampBentoMaskNumber(src.opacity, 0, 1, fallback.opacity, 2)
  };
  if (normalized.x + normalized.width > 100) normalized.width = Math.max(1, roundBentoMaskNumber(100 - normalized.x, fallback.width, 1));
  if (normalized.y + normalized.height > 100) normalized.height = Math.max(1, roundBentoMaskNumber(100 - normalized.y, fallback.height, 1));
  return normalized;
}

async function handleBentoMaskDefaults(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: { ...CORS, ...noStoreHeaders() } });
  }
  if (!env.BENTO_MASK_CONFIG) {
    return json(503, { ok: false, error: 'BENTO_MASK_CONFIG is not configured' }, noStoreHeaders());
  }
  if (request.method === 'GET') {
    try {
      const stored = await env.BENTO_MASK_CONFIG.get(BENTO_MASK_CONFIG_KEY, 'json');
      const npcStored = await env.BENTO_MASK_CONFIG.get(NPC_POSITIONS_CURRENT_KEY, 'json').catch(() => null);
      const base = stored || {
        ok: true,
        exists: false,
        version: 1,
        updatedAt: null,
        maskBounds: {},
        completeLayout: {},
        slotLayout: {}
      };
      const merged = {
        ...base,
        slotLayout: normalizeBentoSlotLayoutMap(base.slotLayout || {}),
        npcPositions: normalizeBentoNpcPositionsMap(npcStored && (npcStored.data || npcStored.npcPositions)),
        npcUpdatedAt: (npcStored && (npcStored.updated_at || npcStored.updatedAt)) || null,
        staffCounterMask: npcStored && npcStored.staffCounterMask
          ? normalizeBentoCounterMask(npcStored.staffCounterMask, { x: 0, y: 44, width: 100, height: 38, opacity: 1 })
          : null,
        customerCounterMask: npcStored && npcStored.customerCounterMask
          ? normalizeBentoCounterMask(npcStored.customerCounterMask, { x: 0, y: 73, width: 100, height: 27, opacity: 1 })
          : null
      };
      return json(200, merged, noStoreHeaders());
    } catch (e) {
      return json(500, { ok: false, error: e.message }, noStoreHeaders());
    }
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { ...CORS, ...noStoreHeaders() } });
  }
  if (!checkBasicAuth(request, env)) return authChallenge();

  let text = '';
  try {
    text = await request.text();
  } catch {
    return json(400, { ok: false, error: 'Invalid request body' }, noStoreHeaders());
  }
  if (text.length > 120000) {
    return json(413, { ok: false, error: 'Payload too large' }, noStoreHeaders());
  }

  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON' }, noStoreHeaders());
  }

  const payload = {
    ok: true,
    exists: true,
    version: 1,
    updatedAt: new Date().toISOString(),
    maskBounds: normalizeBentoMaskBoundsMap(body.maskBounds || body.mask || {}),
    completeLayout: normalizeBentoCompleteLayoutMap(body.completeLayout || body.complete || {}),
    slotLayout: normalizeBentoSlotLayoutMap(body.slotLayout || body.slots || {})
  };

  // Backup: preserve the current value as history before it gets overwritten
  // (see NPC positions backup below for the same pattern). Best-effort — a
  // backup failure must never block the main save.
  try {
    const previous = await env.BENTO_MASK_CONFIG.get(BENTO_MASK_CONFIG_KEY);
    if (previous) {
      const backupAt = new Date().toISOString();
      await env.BENTO_MASK_CONFIG.put(BENTO_MASK_HISTORY_PREFIX + backupAt, previous);

      // Prune history: keep newest BENTO_MASK_HISTORY_MAX entries.
      // Keys are ISO timestamps so lexicographic sort = chronological sort.
      const list = await env.BENTO_MASK_CONFIG.list({ prefix: BENTO_MASK_HISTORY_PREFIX });
      const keys = (list && list.keys ? list.keys.map(k => k.name) : []).sort();
      if (keys.length > BENTO_MASK_HISTORY_MAX) {
        const excess = keys.slice(0, keys.length - BENTO_MASK_HISTORY_MAX);
        for (const k of excess) {
          try { await env.BENTO_MASK_CONFIG.delete(k); } catch {}
        }
      }
    }
  } catch {
    // history backup best-effort; don't fail save if backup itself errors
  }

  try {
    await env.BENTO_MASK_CONFIG.put(BENTO_MASK_CONFIG_KEY, JSON.stringify(payload));
    return json(200, payload, noStoreHeaders());
  } catch (e) {
    return json(500, { ok: false, error: e.message }, noStoreHeaders());
  }
}

// ---------------------------------------------------------------------------
// bento-mask-defaults history read (admin-only). Backup writes happen inline
// in handleBentoMaskDefaults() above (mirrors the NPC positions backup
// pattern below), keyed by ISO timestamp under BENTO_MASK_HISTORY_PREFIX.
// ---------------------------------------------------------------------------
async function handleBentoMaskDefaultsHistoryGet(request, env, url) {
  if (!env.BENTO_MASK_CONFIG) {
    return json(503, { ok: false, error: 'BENTO_MASK_CONFIG is not configured' }, noStoreHeaders());
  }

  const ts = url.searchParams.get('ts');
  if (ts) {
    try {
      const stored = await env.BENTO_MASK_CONFIG.get(BENTO_MASK_HISTORY_PREFIX + ts, 'json');
      if (!stored) {
        return json(404, { ok: false, error: 'not_found' }, noStoreHeaders());
      }
      return json(200, { ok: true, timestamp: ts, data: stored }, noStoreHeaders());
    } catch (e) {
      return json(500, { ok: false, error: e.message }, noStoreHeaders());
    }
  }

  if (url.searchParams.get('list') === '1') {
    try {
      const list = await env.BENTO_MASK_CONFIG.list({ prefix: BENTO_MASK_HISTORY_PREFIX });
      const keys = (list && list.keys ? list.keys.map(k => k.name) : []).sort();
      const timestamps = keys.map(k => k.slice(BENTO_MASK_HISTORY_PREFIX.length)).reverse();
      return json(200, { ok: true, count: timestamps.length, timestamps }, noStoreHeaders());
    } catch (e) {
      return json(500, { ok: false, error: e.message }, noStoreHeaders());
    }
  }

  return json(400, { ok: false, error: 'specify list=1 or ts=<timestamp>' }, noStoreHeaders());
}

// ---------------------------------------------------------------------------
// NPC position backup (see admin/index.html npcPosSaveAll).
// LocalStorage is primary; KV (BENTO_MASK_CONFIG namespace, key prefix
// "npc-positions:") is cross-device backup. Restored to localStorage on
// admin load if LS empty. Reuses the existing BENTO_MASK_CONFIG KV binding
// rather than creating a new namespace.
// ---------------------------------------------------------------------------
async function handleBentoNpcPositionsGet(request, env) {
  if (!env.BENTO_MASK_CONFIG) {
    return json(503, { ok: false, error: 'BENTO_MASK_CONFIG is not configured' }, noStoreHeaders());
  }
  try {
    const stored = await env.BENTO_MASK_CONFIG.get(NPC_POSITIONS_CURRENT_KEY, 'json');
    if (!stored) {
      return json(404, { ok: false, error: 'not_found' }, noStoreHeaders());
    }
    return json(200, stored, noStoreHeaders());
  } catch (e) {
    return json(500, { ok: false, error: e.message }, noStoreHeaders());
  }
}

async function handleBentoNpcPositionsPost(request, env) {
  if (!env.BENTO_MASK_CONFIG) {
    return json(503, { ok: false, error: 'BENTO_MASK_CONFIG is not configured' }, noStoreHeaders());
  }

  let text = '';
  try {
    text = await request.text();
  } catch {
    return json(400, { ok: false, error: 'Invalid request body' }, noStoreHeaders());
  }
  if (text.length > 200000) {
    return json(413, { ok: false, error: 'Payload too large' }, noStoreHeaders());
  }

  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON' }, noStoreHeaders());
  }

  if (!body || typeof body !== 'object' || !body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
    return json(400, { ok: false, error: 'data object required' }, noStoreHeaders());
  }

  const updatedAt = new Date().toISOString();
  const payload = {
    data: normalizeBentoNpcPositionsMap(body.data),
    staffCounterMask: body.staffCounterMask
      ? normalizeBentoCounterMask(body.staffCounterMask, { x: 0, y: 44, width: 100, height: 38, opacity: 1 })
      : null,
    customerCounterMask: body.customerCounterMask
      ? normalizeBentoCounterMask(body.customerCounterMask, { x: 0, y: 73, width: 100, height: 27, opacity: 1 })
      : null,
    updated_at: updatedAt
  };
  const serialized = JSON.stringify(payload);

  try {
    await env.BENTO_MASK_CONFIG.put(NPC_POSITIONS_CURRENT_KEY, serialized);
    await env.BENTO_MASK_CONFIG.put(NPC_POSITIONS_HISTORY_PREFIX + updatedAt, serialized);

    // Prune history: keep newest NPC_POSITIONS_HISTORY_MAX entries.
    // Keys are ISO timestamps so lexicographic sort = chronological sort.
    let historyCount = 0;
    try {
      const list = await env.BENTO_MASK_CONFIG.list({ prefix: NPC_POSITIONS_HISTORY_PREFIX });
      const keys = (list && list.keys ? list.keys.map(k => k.name) : []).sort();
      historyCount = keys.length;
      if (historyCount > NPC_POSITIONS_HISTORY_MAX) {
        const excess = keys.slice(0, historyCount - NPC_POSITIONS_HISTORY_MAX);
        for (const k of excess) {
          try { await env.BENTO_MASK_CONFIG.delete(k); } catch {}
        }
        historyCount = NPC_POSITIONS_HISTORY_MAX;
      }
    } catch {
      // history listing best-effort; don't fail save if prune itself errors
    }

    return json(200, { saved: true, history_count: historyCount, updated_at: updatedAt }, noStoreHeaders());
  } catch (e) {
    return json(500, { ok: false, error: e.message }, noStoreHeaders());
  }
}

async function handleAiName(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: CORS });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return json(500, { error: 'GEMINI_API_KEY not configured on server' });

  let body;
  try { body = await request.json(); }
  catch { return new Response('Invalid JSON', { status: 400, headers: CORS }); }

  const prompt = body.prompt;
  if (!prompt) return json(400, { error: 'prompt が必要です' });

  const imageBase64 = body.image;
  const mimeType = body.mimeType || 'image/png';
  const model = body.model || 'gemini-flash-latest';
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/'
    + encodeURIComponent(model)
    + ':generateContent';

  let parts;
  const images = body.images;
  if (images && Array.isArray(images) && images.length > 0) {
    parts = images.map(img => ({ inline_data: { mime_type: img.mimeType || 'image/png', data: img.data } }));
    parts.push({ text: prompt });
  } else if (imageBase64) {
    parts = [{ inline_data: { mime_type: mimeType, data: imageBase64 } }, { text: prompt }];
  } else {
    parts = [{ text: prompt }];
  }

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey.trim() },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          maxOutputTokens: 4096
        }
      })
    });
    const data = await resp.json();
    if (!resp.ok) return json(resp.status, { error: 'Gemini API error', details: data });
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      return json(502, { error: 'Invalid Gemini response', details: data });
    }
    const text = data.candidates[0].content.parts[0].text;
    return json(200, { text });
  } catch (e) {
    return json(500, { error: e.message });
  }
}

async function handleAiTts(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: CORS });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_TTS_API_KEY;
  const hasServiceAccount = !!env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!apiKey && !hasServiceAccount) {
    return json(500, {
      error: 'No TTS auth configured. Set GEMINI_API_KEY / GOOGLE_TTS_API_KEY / GOOGLE_SERVICE_ACCOUNT_JSON.',
    });
  }

  let body;
  try { body = await request.json(); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  if (body.mode === 'list-voices') {
    const listKey = env.GOOGLE_TTS_API_KEY || apiKey;
    if (!listKey) {
      return json(501, { error: 'list-voices requires GEMINI_API_KEY or GOOGLE_TTS_API_KEY (OAuth2-only env not supported for this mode).' });
    }
    const lang = body.languageCode || 'ja-JP';
    const listUrl = 'https://texttospeech.googleapis.com/v1/voices?languageCode='
      + encodeURIComponent(lang) + '&key='
      + encodeURIComponent(listKey);
    try {
      const lr = await fetch(listUrl);
      const ld = await lr.json();
      return json(lr.status, ld);
    } catch (e) { return json(500, { error: e.message }); }
  }

  const text = (body.text || '').toString().trim();
  if (!text) return json(400, { error: 'text が必要です' });
  if (text.length > 2000) return json(400, { error: 'text が長すぎます（2000字まで）' });

  const ALLOWED_VOICES = [
    'Leda', 'Aoede', 'Callirrhoe', 'Despina', 'Autonoe',
    'Zephyr', 'Puck', 'Orus', 'Kore', 'Charon', 'Fenrir',
    'Iapetus', 'Umbriel', 'Algieba', 'Erinome', 'Enceladus'
  ];
  const LEGACY_VOICE_MAP = {
    'ja-JP-Neural2-B':  'Leda',
    'ja-JP-Neural2-C':  'Puck',
    'ja-JP-Neural2-D':  'Kore',
    'ja-JP-Wavenet-A':  'Zephyr',
    'ja-JP-Wavenet-B':  'Aoede',
    'ja-JP-Wavenet-C':  'Orus',
    'ja-JP-Wavenet-D':  'Charon',
    'ja-JP-Standard-A': 'Despina',
    'ja-JP-Standard-B': 'Callirrhoe',
    'ja-JP-Standard-C': 'Puck',
    'ja-JP-Standard-D': 'Kore'
  };
  const DEFAULT_VOICE = 'Leda';
  const rawVoice = body.voice || DEFAULT_VOICE;
  let voice = LEGACY_VOICE_MAP[rawVoice] || rawVoice;
  if (ALLOWED_VOICES.indexOf(voice) === -1) voice = DEFAULT_VOICE;

  const ALLOWED_STYLES = ['[gently]', '[cheerfully]', '[excitedly]', '[giggles]', '[whispers]', ''];
  let style = (typeof body.stylePrompt === 'string') ? body.stylePrompt.trim() : '[gently]';
  if (ALLOWED_STYLES.indexOf(style) === -1) style = '[gently]';
  const promptText = (typeof body.promptText === 'string') ? body.promptText.trim() : '';
  if (promptText.length > 3000) return json(400, { error: 'promptText が長すぎます（3000字まで）' });
  const CLOUD_STYLE_PROMPTS = {
    '[gently]': 'Speak gently and clearly in a calm, warm female narrator voice.',
    '[cheerfully]': 'Speak clearly in a bright but controlled female narrator voice.',
    '[excitedly]': 'Speak with lively energy while staying clear and child-friendly.',
    '[giggles]': 'Speak playfully with a light smile, without adding words or sounds.',
    '[whispers]': 'Speak softly and clearly in a gentle whisper.',
    '': 'Speak clearly in a calm female narrator voice.',
  };
  const cloudPrompt = typeof body.cloudPrompt === 'string'
    ? body.cloudPrompt.trim()
    : CLOUD_STYLE_PROMPTS[style];
  if (cloudPrompt.length > 3000) return json(400, { error: 'cloudPrompt が長すぎます（3000字まで）' });
  const styledText = promptText || (style ? (style + ' ' + text) : text);

  const MODEL_PRIMARY  = body.modelOverride || 'gemini-3.1-flash-tts-preview';
  const MODEL_FALLBACK = 'gemini-2.5-flash-preview-tts';

  const SAFETY_OFF = [
    { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_CIVIC_INTEGRITY',   threshold: 'BLOCK_NONE' }
  ];

  const payload = {
    contents: [{ parts: [{ text: styledText }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
      }
    },
    safetySettings: SAFETY_OFF
  };

  async function callModel(modelId, customPayload) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelId
      + ':generateContent';
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey.trim() },
      body: JSON.stringify(customPayload || payload)
    });
    const data = await resp.json();
    const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    const audioPart = parts && parts.find(p => p && p.inlineData && p.inlineData.data);
    const finishReason = data && data.candidates && data.candidates[0] && data.candidates[0].finishReason;
    const blockReason = data && data.promptFeedback && data.promptFeedback.blockReason;
    return { resp, data, audioPart, finishReason, blockReason };
  }

  const CHIRP3_AVAILABLE = {
    Leda:1,Aoede:1,Callirrhoe:1,Despina:1,Autonoe:1,Zephyr:1,Erinome:1,
    Puck:1,Orus:1,Kore:1,Charon:1,Fenrir:1,Iapetus:1,Umbriel:1,Algieba:1,Enceladus:1
  };
  // Cloud TTS は API key 認証を 2025 末に廃止し、 OAuth2 access token 必須に。
  // GOOGLE_SERVICE_ACCOUNT_JSON secret から JWT 署名 → access token 交換 (google-auth.js)、
  // 取得できなければ後方互換で旧 ?key= 経路 (Cloud TTS は 401 を返す想定だが secret 登録前は壊れたまま運用可)。
  async function cloudTtsAuth() {
    let token = null;
    try {
      token = await getGoogleAccessToken(env);
    } catch (e) {
      console.warn('getGoogleAccessToken failed:', e && e.message);
      token = null;
    }
    if (token) {
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
      const projectId = getGoogleServiceAccountProjectId(env);
      if (projectId) headers['x-goog-user-project'] = projectId;
      return { authMode: 'oauth2', headers, urlSuffix: '' };
    }
    const cloudKey = env.GOOGLE_TTS_API_KEY || apiKey;
    if (cloudKey) {
      return { authMode: 'api_key', headers: { 'Content-Type': 'application/json' }, urlSuffix: '?key=' + encodeURIComponent(cloudKey) };
    }
    return { authMode: 'none', headers: { 'Content-Type': 'application/json' }, urlSuffix: '' };
  }

  async function callCloudGeminiTts(modelId, geminiVoice) {
    const byteLength = value => new TextEncoder().encode(value).length;
    const textBytes = byteLength(text);
    const promptBytes = byteLength(cloudPrompt);
    if (textBytes > 4000 || promptBytes > 4000 || textBytes + promptBytes > 8000) {
      return {
        resp: { ok: false, status: 400 },
        data: { error: { status: 'INPUT_LIMIT_EXCEEDED' } },
        authMode: 'not_requested',
      };
    }

    const auth = await cloudTtsAuth();
    if (auth.authMode !== 'oauth2') {
      return {
        resp: { ok: false, status: 503 },
        data: { error: { status: 'OAUTH2_UNAVAILABLE' } },
        authMode: auth.authMode,
      };
    }

    const input = { text };
    if (cloudPrompt) input.prompt = cloudPrompt;
    try {
      const resp = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
        method: 'POST',
        headers: auth.headers,
        body: JSON.stringify({
          input,
          voice: {
            languageCode: 'ja-JP',
            name: geminiVoice,
            modelName: modelId,
          },
          audioConfig: {
            audioEncoding: 'LINEAR16',
            sampleRateHertz: 24000,
          },
        }),
        signal: AbortSignal.timeout(120000),
      });
      let data;
      try {
        data = await resp.json();
      } catch (_) {
        data = { error: { status: 'INVALID_UPSTREAM_RESPONSE' } };
      }
      return { resp, data, authMode: auth.authMode };
    } catch (_) {
      return {
        resp: { ok: false, status: 502 },
        data: { error: { status: 'UPSTREAM_FETCH_FAILED' } },
        authMode: auth.authMode,
      };
    }
  }

  async function callChirp3(geminiVoice) {
    const cloudVoice = CHIRP3_AVAILABLE[geminiVoice] ? ('ja-JP-Chirp3-HD-' + geminiVoice) : 'ja-JP-Chirp3-HD-Leda';
    const auth = await cloudTtsAuth();
    const url = 'https://texttospeech.googleapis.com/v1/text:synthesize' + auth.urlSuffix;
    const resp = await fetch(url, {
      method: 'POST', headers: auth.headers,
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ja-JP', name: cloudVoice },
        audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 }
      })
    });
    const data = await resp.json();
    return { resp, data, cloudVoice, authMode: auth.authMode };
  }
  async function callCloudNeural2(geminiVoice) {
    const NEURAL2_MAP = {
      Leda:'ja-JP-Neural2-B',Aoede:'ja-JP-Neural2-B',Callirrhoe:'ja-JP-Neural2-B',
      Despina:'ja-JP-Neural2-B',Autonoe:'ja-JP-Neural2-B',Zephyr:'ja-JP-Neural2-B',
      Puck:'ja-JP-Neural2-C',Orus:'ja-JP-Neural2-C',
      Kore:'ja-JP-Neural2-D',Charon:'ja-JP-Neural2-D',Fenrir:'ja-JP-Neural2-D'
    };
    const cloudVoice = NEURAL2_MAP[geminiVoice] || 'ja-JP-Neural2-B';
    const auth = await cloudTtsAuth();
    const url = 'https://texttospeech.googleapis.com/v1/text:synthesize' + auth.urlSuffix;
    const resp = await fetch(url, {
      method: 'POST', headers: auth.headers,
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ja-JP', name: cloudVoice },
        audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000, speakingRate: 1.0, pitch: 1.0 }
      })
    });
    const data = await resp.json();
    return { resp, data, cloudVoice, authMode: auth.authMode };
  }

  const isBlockedOrEmpty = r => !r.audioPart;

  try {
    const attemptChain = [];

    const wantsCloudGemini = body.engine === 'gemini-cloud'
      || (!apiKey && hasServiceAccount);
    if (wantsCloudGemini) {
      if (MODEL_PRIMARY !== 'gemini-3.1-flash-tts-preview') {
        return json(400, { error: 'Cloud Gemini-TTS supports only the approved TTS 3.1 model.' }, noStoreHeaders());
      }
      const cloudGemini = await callCloudGeminiTts(MODEL_PRIMARY, voice);
      const cloudError = cloudGemini.data && cloudGemini.data.error;
      const cloudAudio = cloudGemini.data && cloudGemini.data.audioContent;
      let hasCloudWav = false;
      if (typeof cloudAudio === 'string' && cloudAudio.length > 16) {
        try {
          const decoded = Buffer.from(cloudAudio, 'base64');
          hasCloudWav = decoded.length >= 44
            && decoded.toString('ascii', 0, 4) === 'RIFF'
            && decoded.toString('ascii', 8, 12) === 'WAVE';
        } catch (_) {}
      }
      attemptChain.push({
        model: MODEL_PRIMARY,
        engine: 'cloud-tts-oauth2',
        authMode: cloudGemini.authMode,
        status: cloudGemini.resp.status,
        hasAudio: hasCloudWav,
        errCode: cloudError && (cloudError.status || cloudError.code)
          || (!hasCloudWav ? 'INVALID_AUDIO_RESPONSE' : null),
      });
      if (cloudGemini.resp.ok && hasCloudWav) {
        return json(200, {
          audio: cloudAudio,
          mime: 'audio/wav',
          voice,
          chars: text.length,
          model: MODEL_PRIMARY,
          engine: 'cloud-tts-oauth2',
          fallbackUsed: false,
          attemptChain,
          sampleRate: 24000,
        }, noStoreHeaders());
      }
      if (body.engine === 'gemini-cloud' || body.strictModel === true) {
        const upstreamStatus = cloudGemini.resp.status;
        const status = Number.isInteger(upstreamStatus) && upstreamStatus >= 400
          ? Math.min(599, upstreamStatus)
          : 502;
        const message = status === 401 || status === 403
          ? 'Cloud Gemini-TTS authorization failed.'
          : status === 429
            ? 'Cloud Gemini-TTS rate limit reached.'
            : status >= 500
              ? 'Cloud Gemini-TTS is temporarily unavailable.'
              : 'Cloud Gemini-TTS request was rejected.';
        return json(status, { error: message, attemptChain }, noStoreHeaders());
      }
    }

    if (body.engine === 'chirp3') {
      const chirpDirect = await callChirp3(voice);
      attemptChain.push({ model: 'chirp3-hd', authMode: chirpDirect.authMode, status: chirpDirect.resp.status, err: (chirpDirect.data && chirpDirect.data.error && chirpDirect.data.error.message) || null });
      if (chirpDirect.resp.ok && chirpDirect.data && chirpDirect.data.audioContent) {
        return json(200, {
          audio: chirpDirect.data.audioContent, mime: 'audio/wav',
          voice: chirpDirect.cloudVoice, chars: text.length,
          model: 'chirp3-hd', fallbackUsed: false,
          attemptChain, sampleRate: 24000
        });
      }
      return json(502, { error: (chirpDirect.data && chirpDirect.data.error && chirpDirect.data.error.message) || 'Chirp 3: HD error', attemptChain });
    }

    let result;
    let modelUsed = MODEL_PRIMARY;
    if (apiKey) {
      result = await callModel(MODEL_PRIMARY);
      attemptChain.push({ model: MODEL_PRIMARY, fr: result.finishReason, br: result.blockReason, hasAudio: !!result.audioPart });

      if (isBlockedOrEmpty(result) && MODEL_PRIMARY !== MODEL_FALLBACK) {
        result = await callModel(MODEL_FALLBACK);
        attemptChain.push({ model: MODEL_FALLBACK, fr: result.finishReason, br: result.blockReason, hasAudio: !!result.audioPart });
        modelUsed = MODEL_FALLBACK;
      }
    } else {
      // No Gemini key — skip Gemini entirely and fall through to Cloud TTS (OAuth2) chirp3/neural2.
      result = { resp: { ok: false, status: 502 }, data: null, audioPart: null, finishReason: 'SKIPPED', blockReason: 'no_gemini_api_key' };
      attemptChain.push({ model: MODEL_PRIMARY, skipped: 'no_gemini_api_key' });
    }

    if (isBlockedOrEmpty(result)) {
      const chirpResult = await callChirp3(voice);
      if (chirpResult.resp.ok && chirpResult.data && chirpResult.data.audioContent) {
        return json(200, {
          audio: chirpResult.data.audioContent, mime: 'audio/wav',
          voice: chirpResult.cloudVoice, chars: text.length,
          model: 'chirp3-hd', fallbackUsed: true,
          attemptChain, sampleRate: 24000
        });
      }
      attemptChain.push({ model: 'chirp3-hd', authMode: chirpResult.authMode, status: chirpResult.resp.status, err: (chirpResult.data && chirpResult.data.error && chirpResult.data.error.message) || null });

      const neuralResult = await callCloudNeural2(voice);
      if (neuralResult.resp.ok && neuralResult.data && neuralResult.data.audioContent) {
        return json(200, {
          audio: neuralResult.data.audioContent, mime: 'audio/wav',
          voice: neuralResult.cloudVoice, chars: text.length,
          model: 'cloud-tts-neural2', fallbackUsed: true,
          attemptChain, sampleRate: 24000
        });
      }
      attemptChain.push({ model: 'cloud-tts-neural2', authMode: neuralResult.authMode, status: neuralResult.resp.status, err: (neuralResult.data && neuralResult.data.error && neuralResult.data.error.message) || null });
    }

    if (!result.resp.ok) {
      const skippedGemini = !apiKey;
      const safeMsg = skippedGemini
        ? 'Cloud TTS fallback failed (Gemini skipped: no API key)'
        : (result.data && result.data.error && result.data.error.message) || 'Gemini TTS API error';
      return json(result.resp.status >= 500 ? 502 : result.resp.status, { error: safeMsg, attemptChain });
    }
    if (!result.audioPart) {
      return json(502, {
        error: 'No audio in Gemini TTS response',
        debug: { modelTried: modelUsed, finishReason: result.finishReason, blockReason: result.blockReason, attemptChain }
      });
    }

    const pcmB64 = result.audioPart.inlineData.data;
    const wavB64 = wrapPcmToWavB64(pcmB64, 24000, 1, 16);

    return json(200, {
      audio: wavB64, mime: 'audio/wav',
      voice, chars: text.length,
      model: modelUsed, fallbackUsed: modelUsed !== MODEL_PRIMARY,
      attemptChain, sampleRate: 24000
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
}

// 2026-05-10: handleGhProxy はもともと /api/gh/* を完全透過プロキシだったため、
// 認証済 user (Basic Auth pass を知る人) が GitHub の任意エンドポイント
// (refs/heads/main の force-push、 actions/secrets/* の書込、 user 情報取得 等)
// を叩けてしまっていた。 path allowlist でアプリが実際に必要とする範囲に限定する。
//
// 既存ユースケース (= allowlist で必ずカバーが必要) ─────────────────────────
//   layout-system (saved-layout.json):
//     quizland/saved-layout.json
//     quizland/preview/full/saved-layout.json
//     zukan/preview/full/saved-layout.json
//     zukan/preview/investigation/saved-layout.json
//   quizland editor playtest:
//     quizland/data/_review/playtest_notes.json
//     quizland/data/_review/playtest_screenshots/<file>
//   layout-editor stage image (今回追加):
//     assets/images/<...>/<file>.{png,jpe?g,webp}
//   admin/index.html / creature_studio:
//     assets/data/{rewards,creatures,staging,quiz-sound-animals}.json
//     assets/tts/manifest.json + assets/tts/<file>
//     assets/images/{Bento_parts,Rooms/walls,Rooms/floors,Rooms/furnitures_final,
//                    quiz-sound,staging,ocean,word,ai-generated,...}/<...>
//     room/items.js + room/index.html
//     quizland/data/questions.js
//   maze-editor / maze-rough:
//     maze/imageStages/_index.json + maze/imageStages/<name>.{json,jpg,png}
//   admin connection test:
//     /repos/<owner>/<repo>            (repo info; GET only)
//     /repos/<owner>/<repo>/contents/<dir>  (folder listing)
// 書込許可パターン (PUT / DELETE / POST 用)。 GET と書込で同一範囲。
const ALLOWED_GH_PATTERNS = [
  // saved-layout.json (LayoutSystem 配下、 quizland/zukan 等)
  /^\/repos\/[^/]+\/[^/]+\/contents\/(?:[A-Za-z0-9%_./-]+\/)?saved-layout\.json$/,
  // quizland 関連 (questions.js / _review / playtest_screenshots 等)
  /^\/repos\/[^/]+\/[^/]+\/contents\/quizland\/[A-Za-z0-9%_./-]+$/,
  // maze image stages (_index.json + 各ステージの json/jpg/png)
  /^\/repos\/[^/]+\/[^/]+\/contents\/maze\/imageStages(?:\/[A-Za-z0-9%_./-]+)?$/,
  // maze OP layout (maze-op-editor.html が PUT)
  /^\/repos\/[^/]+\/[^/]+\/contents\/maze\/op-layout\.json$/,
  // assets 配下: data (JSON) / tts / images / sounds
  /^\/repos\/[^/]+\/[^/]+\/contents\/assets\/data\/[A-Za-z0-9%_.-]+\.json$/,
  /^\/repos\/[^/]+\/[^/]+\/contents\/assets\/tts(?:\/[A-Za-z0-9%_./-]+)?$/,
  /^\/repos\/[^/]+\/[^/]+\/contents\/assets\/images\/[A-Za-z0-9%_./-]+$/,
  /^\/repos\/[^/]+\/[^/]+\/contents\/assets\/sounds\/[A-Za-z0-9%_./-]+$/,
  // room/ (items.js / index.html / 配下)
  /^\/repos\/[^/]+\/[^/]+\/contents\/room\/[A-Za-z0-9%_./-]+$/,
];

// 接続テスト等の GET 専用エンドポイント。 admin/index.html の「PAT 接続テスト」が
// /repos/<owner>/<repo> を直接叩くので、 GET (および HEAD) のみ許可する。
const ALLOWED_GH_GET_ONLY_PATTERNS = [
  /^\/repos\/[^/]+\/[^/]+$/,
];

// 2026-05-10: HIGH 2 修正 — `*` で許す代わりに既知 origin のみ反射。
// `credentials: 'include'` 経路はブラウザが `*` をブロックするので
// 主に curl / 非ブラウザによる濫用対策 (二重防御)。
const ALLOWED_GH_ORIGINS = [
  'https://pono-asobiba-staging.ndw.workers.dev',
  'https://pono-asobiba-app-staging.ndw.workers.dev',
  'https://pono-asobiba-app.ndw.workers.dev',
  'https://pono.kodama-no-mori.com',
  'http://localhost:8788',
  'http://127.0.0.1:8788',
];

function corsAllowedOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  return ALLOWED_GH_ORIGINS.indexOf(origin) >= 0 ? origin : 'null';
}

async function handleGhProxy(request, env) {
  const url = new URL(request.url);
  const ghPath = url.pathname.replace(/^\/api\/gh/, '');
  if (!env.GITHUB_TOKEN) return json(500, { error: 'GITHUB_TOKEN not configured on server' });

  // Path traversal guard — `..` を URL に通すと assets/images/../../foo を叩ける。
  // 念のため normalize して比較する。
  if (ghPath.indexOf('..') >= 0) {
    return new Response(JSON.stringify({ error: 'Path traversal blocked', path: ghPath }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsAllowedOrigin(request),
      },
    });
  }

  // Encoded path traversal guard — `%` を ALLOWED_GH_PATTERNS の文字クラスに加えた副作用で
  // `%2E%2E` (encoded `..`) や `%00` (NUL injection) が allowlist を素通りするので追加で塞ぐ。
  if (/%2[eE]%2[eE]/.test(ghPath) || /%00/i.test(ghPath)) {
    return new Response(JSON.stringify({ error: 'Encoded path traversal blocked', path: ghPath }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsAllowedOrigin(request),
      },
    });
  }

  // Allowlist 検査 — 既存機能 (saved-layout / playtest / 画像 PUT / admin / maze) を
  // カバーしつつ、 refs/heads/* や actions/secrets/* 等の危険エンドポイントを弾く。
  const method = request.method;
  const isReadOnly = method === 'GET' || method === 'HEAD';
  const isAllowedWrite = ALLOWED_GH_PATTERNS.some(p => p.test(ghPath));
  const isAllowedReadOnly = isReadOnly
    && ALLOWED_GH_GET_ONLY_PATTERNS.some(p => p.test(ghPath));
  if (!isAllowedWrite && !isAllowedReadOnly) {
    return new Response(JSON.stringify({ error: 'Path not allowed by gh proxy', path: ghPath, method }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsAllowedOrigin(request),
      },
    });
  }

  const ghUrl = 'https://api.github.com' + ghPath + url.search;
  const headers = {
    'Authorization': 'Bearer ' + env.GITHUB_TOKEN,
    'Accept': request.headers.get('Accept') || 'application/vnd.github+json',
    'User-Agent': 'pono-asobiba-app',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  const ct = request.headers.get('Content-Type');
  if (ct) headers['Content-Type'] = ct;

  const body = (request.method === 'GET' || request.method === 'HEAD')
    ? null
    : await request.arrayBuffer();

  try {
    const resp = await fetch(ghUrl, { method: request.method, headers, body });
    const respBody = await resp.arrayBuffer();
    const respHeaders = {
      'Content-Type': resp.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': corsAllowedOrigin(request),
      'Vary': 'Origin'
    };
    return new Response(respBody, { status: resp.status, headers: respHeaders });
  } catch (e) {
    return json(502, { error: 'GitHub proxy error: ' + e.message });
  }
}

async function handleGeminiProxy(request, env) {
  const url = new URL(request.url);
  const geminiPath = url.pathname.replace(/^\/api\/gemini/, '');
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return json(500, { error: 'GEMINI_API_KEY not configured on server' });

  const searchParams = new URLSearchParams(url.search);
  searchParams.delete('key');
  const geminiUrl = 'https://generativelanguage.googleapis.com' + geminiPath + '?' + searchParams.toString();

  const headers = { 'Content-Type': request.headers.get('Content-Type') || 'application/json', 'x-goog-api-key': apiKey.trim() };
  const body = (request.method === 'GET' || request.method === 'HEAD')
    ? null
    : await request.arrayBuffer();

  try {
    const resp = await fetch(geminiUrl, { method: request.method, headers, body });
    const respBody = await resp.arrayBuffer();
    return new Response(respBody, {
      status: resp.status,
      headers: {
        'Content-Type': resp.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return json(502, { error: 'Gemini proxy error: ' + e.message });
  }
}

function wrapPcmToWavB64(pcmB64, sampleRate, channels, bitsPerSample) {
  const pcm = Buffer.from(pcmB64, 'base64');
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]).toString('base64');
}
