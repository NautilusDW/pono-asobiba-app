// src/api/analytics-admin.js
// -----------------------------------------------------------------------------
// admin/index.html 「📈 分析」タブ向けの読み取り専用集計 API + 手動ロールアップ起点。
//   仕様正本: docs/data-analytics-plan.md §6-3 (集計層) / §6-4 (可視化) / §8。
//   ここに定義する 4 GET + 1 POST は worker.js 側で env.ADMIN_PASSWORD による
//   Basic Auth (checkBasicAuth) を通過した後にのみ呼び出される — このファイル自体は
//   認可を行わない (呼び出し側の責務。既存 /api/admin/* ハンドラと同じ分担)。
//
// D1 スキーマ (ensureSchema() は src/api/analytics-rollup.js が所有・冪等に
// CREATE TABLE IF NOT EXISTS する。ここでは読み取り前に毎回呼び出すことで、
// ロールアップが一度も走っていない env (D1 は作成直後で 0 テーブル) でも
// 500 にならず空データとして応答できるようにする):
//   daily_events(date, event, game_id, platform, tier, count)  PK(date,event,game_id,platform,tier)
//   daily_clients(date, cid)                                    PK(date,cid)
//   clients(cid, first_seen, last_seen)                         PK(cid)
//   rollup_log(date, rolled_at, events_rows, clients_rows)       PK(date)
//
// 集計方針: session_id 由来の値は単一訪問内ファネルにのみ使い、日次/週次アクティブ端末数・
// リテンションには必ず client_id (cid) を使う (§6-4 画面設計上の鉄則)。DISTINCT cid は
// WAE 側サンプリングの下で過小に出うる旨を rollup 側で許容している (v1)。
//
// 全クエリは env.ANALYTICS_DB.prepare(sql).bind(...) のプレースホルダ経由のみで組み立てる
// (文字列連結による SQL 構築は禁止)。
// -----------------------------------------------------------------------------

import { ensureSchema, runRollupForDate } from './analytics-rollup.js';

const EVENT_KEYS = [
  'session_start',
  'game_launch',
  'game_clear',
  'paywall_hit',
  'upgrade_cta_click',
  'acorn_earned',
  'daily_return'
];

const MIN_DAYS = 1;
const MAX_DAYS = 90;
const DEFAULT_DAYS = 30;

function noStoreHeaders() {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
}

// src/worker.js の CORS 定数と同値。 このファイルの OPTIONS/405 応答は worker.js 側
// (ルーティング層) が CORS 付きで返しているため、実際のハンドラ応答もここで揃えておく
// (揃えないと同一エンドポイントで preflight は CORS 許可・本体応答は CORS 無し、という
// 食い違いになり、将来 admin/index.html 以外のクロスオリジン呼び出し元を追加したときに
// 本体応答だけが黙って弾かれる)。
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

function jsonResponse(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...noStoreHeaders() }
  });
}

function notProvisioned() {
  // D1 未バインド env (LP staging 等) では admin UI が優しく空表示できるよう 200 で返す。
  return jsonResponse(200, { error: 'analytics-not-provisioned' });
}

// days クエリパラメータを 1..90 に clamp する。未指定/不正値は既定 30。
function clampDays(raw) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return DEFAULT_DAYS;
  if (n < MIN_DAYS) return MIN_DAYS;
  if (n > MAX_DAYS) return MAX_DAYS;
  return n;
}

// JST (UTC+9, DST無し。アプリは国ゲートで日本のみのため固定オフセットで十分) の
// "YYYY-MM-DD" 文字列を返す。
function jstDateString(date) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function jstToday() {
  return jstDateString(new Date());
}

// dateStr (YYYY-MM-DD) から n 日ずらした日付文字列を返す (n は負数可)。
// 暦日の加減算のみが目的なので UTC ベースで計算する (JST=UTC+9 固定、DSTなし)。
function shiftDateString(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function jstDaysAgo(n) {
  return shiftDateString(jstToday(), -n);
}

// 直近 days 日分 (当日含む) の YYYY-MM-DD を古い順で返す。
function dateRangeJst(days) {
  const today = jstToday();
  const out = [];
  for (let i = days - 1; i >= 0; i--) out.push(shiftDateString(today, -i));
  return out;
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// GET /api/admin/analytics/overview?days=30
// ---------------------------------------------------------------------------
export async function handleAnalyticsOverview(request, env, url) {
  if (!env.ANALYTICS_DB) return notProvisioned();
  const days = clampDays(url.searchParams.get('days'));
  const dates = dateRangeJst(days);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  try {
    await ensureSchema(env);

    const eventsResult = await env.ANALYTICS_DB
      .prepare('SELECT date, event, SUM(count) AS c FROM daily_events WHERE date >= ? AND date <= ? GROUP BY date, event')
      .bind(startDate, endDate)
      .all();
    const uuByDateResult = await env.ANALYTICS_DB
      .prepare('SELECT date, COUNT(DISTINCT cid) AS uu FROM daily_clients WHERE date >= ? AND date <= ? GROUP BY date')
      .bind(startDate, endDate)
      .all();
    // totals.uu は日別 uu の合算ではなく期間ユニーク (§6-4 の cid ベース鉄則に従う)。
    const periodUuRow = await env.ANALYTICS_DB
      .prepare('SELECT COUNT(DISTINCT cid) AS uu FROM daily_clients WHERE date >= ? AND date <= ?')
      .bind(startDate, endDate)
      .first();

    const byDate = new Map();
    for (const d of dates) {
      const row = { date: d, uu: 0 };
      for (const k of EVENT_KEYS) row[k] = 0;
      byDate.set(d, row);
    }
    for (const r of (eventsResult.results || [])) {
      const row = byDate.get(r.date);
      if (!row || !EVENT_KEYS.includes(r.event)) continue;
      row[r.event] = toNum(r.c);
    }
    for (const r of (uuByDateResult.results || [])) {
      const row = byDate.get(r.date);
      if (!row) continue;
      row.uu = toNum(r.uu);
    }

    const daysOut = dates.map(d => byDate.get(d));
    const totals = { uu: toNum(periodUuRow && periodUuRow.uu) };
    for (const k of EVENT_KEYS) totals[k] = 0;
    for (const row of daysOut) {
      for (const k of EVENT_KEYS) totals[k] += row[k];
    }

    return jsonResponse(200, { days: daysOut, totals });
  } catch (err) {
    return jsonResponse(500, { error: String((err && err.message) || err) });
  }
}

// ---------------------------------------------------------------------------
// GET /api/admin/analytics/games?days=30
// ---------------------------------------------------------------------------
export async function handleAnalyticsGames(request, env, url) {
  if (!env.ANALYTICS_DB) return notProvisioned();
  const days = clampDays(url.searchParams.get('days'));
  const dates = dateRangeJst(days);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  try {
    await ensureSchema(env);

    const result = await env.ANALYTICS_DB
      .prepare(
        `SELECT game_id,
                SUM(CASE WHEN event = 'game_launch' THEN count ELSE 0 END) AS launches,
                SUM(CASE WHEN event = 'game_clear' THEN count ELSE 0 END) AS clears
           FROM daily_events
          WHERE date >= ? AND date <= ?
            AND game_id != ''
            AND event IN ('game_launch', 'game_clear')
          GROUP BY game_id
          ORDER BY launches DESC`
      )
      .bind(startDate, endDate)
      .all();

    const games = (result.results || []).map(r => ({
      game_id: r.game_id,
      launches: toNum(r.launches),
      clears: toNum(r.clears)
    }));

    return jsonResponse(200, { games });
  } catch (err) {
    return jsonResponse(500, { error: String((err && err.message) || err) });
  }
}

// ---------------------------------------------------------------------------
// GET /api/admin/analytics/retention?days=30
//   clients.first_seen を起点に、その日付 +1日/+7日/+30日 に daily_clients へ
//   再訪記録があるかを JOIN で判定する (d1/d7/d30 は「その日数後に再訪した人数」)。
// ---------------------------------------------------------------------------
export async function handleAnalyticsRetention(request, env, url) {
  if (!env.ANALYTICS_DB) return notProvisioned();
  const days = clampDays(url.searchParams.get('days'));
  const dates = dateRangeJst(days);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  try {
    await ensureSchema(env);

    const result = await env.ANALYTICS_DB
      .prepare(
        `SELECT c.first_seen AS first_seen_date,
                COUNT(DISTINCT c.cid) AS size,
                COUNT(DISTINCT d1.cid) AS d1,
                COUNT(DISTINCT d7.cid) AS d7,
                COUNT(DISTINCT d30.cid) AS d30
           FROM clients c
           LEFT JOIN daily_clients d1 ON d1.cid = c.cid AND d1.date = date(c.first_seen, '+1 day')
           LEFT JOIN daily_clients d7 ON d7.cid = c.cid AND d7.date = date(c.first_seen, '+7 day')
           LEFT JOIN daily_clients d30 ON d30.cid = c.cid AND d30.date = date(c.first_seen, '+30 day')
          WHERE c.first_seen >= ? AND c.first_seen <= ?
          GROUP BY c.first_seen
          ORDER BY c.first_seen DESC`
      )
      .bind(startDate, endDate)
      .all();

    const cohorts = (result.results || []).map(r => ({
      first_seen_date: r.first_seen_date,
      size: toNum(r.size),
      d1: toNum(r.d1),
      d7: toNum(r.d7),
      d30: toNum(r.d30)
    }));

    return jsonResponse(200, { cohorts });
  } catch (err) {
    return jsonResponse(500, { error: String((err && err.message) || err) });
  }
}

// ---------------------------------------------------------------------------
// GET /api/admin/analytics/status
//   設定診断用。D1/WAE SQL トークン/dataset 名が env に揃っているかを可視化する
//   ("D1 未バインド env では 200 で優しく表示" の対象そのものが hasDb:false として
//   表現されるため、他の GET と違い notProvisioned() には短絡しない)。
//   lastRollup は日付文字列 (YYYY-MM-DD)。admin/index.html 側が
//   escapeHtml(data.lastRollup || '未実施') とプレーン文字列として直接描画するため、
//   オブジェクトを返してはならない (rolled_at はここでは公開しない)。
// ---------------------------------------------------------------------------
export async function handleAnalyticsStatus(request, env) {
  const hasDb = !!env.ANALYTICS_DB;
  const hasToken = !!env.WAE_SQL_TOKEN;
  const datasetVar = env.ANALYTICS_DATASET || null;

  let lastRollup = null;
  let rows = 0;

  if (hasDb) {
    try {
      await ensureSchema(env);
      const row = await env.ANALYTICS_DB
        .prepare('SELECT date, rolled_at, events_rows, clients_rows FROM rollup_log ORDER BY date DESC LIMIT 1')
        .first();
      if (row) {
        lastRollup = row.date;
        rows = toNum(row.events_rows) + toNum(row.clients_rows);
      }
    } catch (err) {
      // 初回起動でテーブルが無い等は診断情報として握りつぶし、lastRollup=null のまま返す。
      console.error('[analytics-admin] status rollup_log read failed: ' + (err && err.message));
    }
  }

  return jsonResponse(200, { lastRollup, rows, datasetVar, hasToken, hasDb });
}

// 同一 date への連打防止のクールダウン。 このエンドポイントは checkBasicAuth (既存 admin と
// 同じ ADMIN_PASSWORD) で保護されているとはいえ、1回の呼び出しごとに Cloudflare WAE SQL API
// を叩くため、パスワードを知る誰かがスクリプトで連打すると WAE SQL API 使用量/コストを
// 無用に押し上げうる。 直近この date が正常にロールアップ済み (rollup_log.rolled_at が
// 直近) であれば WAE/D1 に触れず 429 を返す (ベストエフォート、失敗時は素通しでブロックしない)。
const ROLLUP_COOLDOWN_MS = 60 * 1000;

// ---------------------------------------------------------------------------
// POST /api/admin/analytics/rollup  body: { date?: "YYYY-MM-DD" } (省略時 = JST昨日)
//   scheduled() と同じ runRollupForDate(env, date) を呼ぶ手動トリガー
//   (App staging 検証用 — §6-5 手順4 の POST /api/admin/analytics/rollup 相当)。
// ---------------------------------------------------------------------------
export async function handleAnalyticsRollupTrigger(request, env) {
  if (!env.ANALYTICS_DB) return notProvisioned();

  let date = null;
  try {
    const text = await request.text();
    if (text) {
      const body = JSON.parse(text);
      if (body && typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
        date = body.date;
      }
    }
  } catch (_) {
    // 不正 JSON はデフォルト日付 (JST昨日) にフォールバックする。
  }
  if (!date) date = jstDaysAgo(1);

  try {
    await ensureSchema(env);
    const lastRun = await env.ANALYTICS_DB
      .prepare('SELECT rolled_at FROM rollup_log WHERE date = ?')
      .bind(date)
      .first();
    const rolledAt = toNum(lastRun && lastRun.rolled_at);
    const elapsed = Date.now() - rolledAt;
    if (rolledAt > 0 && elapsed >= 0 && elapsed < ROLLUP_COOLDOWN_MS) {
      return jsonResponse(429, {
        ok: false,
        date,
        error: 'too-soon',
        retryAfterMs: ROLLUP_COOLDOWN_MS - elapsed
      });
    }
  } catch (_) {
    // クールダウン診断クエリ自体の失敗ではロールアップ本体をブロックしない (ベストエフォート)。
  }

  try {
    const result = await runRollupForDate(env, date);
    return jsonResponse(200, { ok: true, date, result: result || null });
  } catch (err) {
    return jsonResponse(500, { ok: false, date, error: String((err && err.message) || err) });
  }
}
