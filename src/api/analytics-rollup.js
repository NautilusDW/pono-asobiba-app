// src/api/analytics-rollup.js
// -----------------------------------------------------------------------------
// データ分析基盤: 日次ロールアップエンジン (docs/data-analytics-plan.md §6-3)。
//   POST /api/e (src/api/events.js) が env.EVENTS (Workers Analytics Engine, WAE) へ
//   書き込んだ生イベントを、日次で D1 (env.ANALYTICS_DB) へ集計・保存する。
//
// 読み出し契約 (オーケストレーター確定):
//   WAE の生データは Worker binding から直接 SELECT できないため、
//   Cloudflare REST SQL API (POST https://api.cloudflare.com/client/v4/accounts/{id}/analytics_engine/sql,
//   Bearer = secret env.WAE_SQL_TOKEN) を叩く。 SQL 方言は ClickHouse 風だが未文書化の
//   関数は避け、timestamp 比較 + toDateTime()（公式サンプルで使用例のある関数）のみを使う。
//
// events.js の書込み形 (writeDataPoint) との対応:
//   indexes: [cid]                                    -> index1
//   blobs:   [name, platform, tier, sid, gameId, extraJSON] -> blob1..blob6
//   doubles: [ts]                                      -> double1
//   (src/api/events.js buildBlobs() 参照。 本ファイルはこの列順を前提に SELECT する)
//
// 書込み先スキーマ (D1, 確定契約どおり):
//   daily_events(date, event, game_id, platform, tier, count)  PRIMARY KEY(date,event,game_id,platform,tier)
//   daily_clients(date, cid)                                    PRIMARY KEY(date,cid)
//   clients(cid, first_seen, last_seen)                         PRIMARY KEY(cid)
//   rollup_log(date, rolled_at, events_rows, clients_rows)      PRIMARY KEY(date)
//
// 集計方針:
//   - count 系 (daily_events) は WAE の adaptive sampling による過小カウントを補正するため
//     SUM(_sample_interval) を使う（COUNT(*) は使わない）。DISTINCT cid (daily_clients) は
//     サンプリング下で過小になり得る既知の限界を許容する (v1、docs §6-1/§9 に明記済み)。
//   - daily_events / daily_clients は「その日付の再集計」が常に安全なように
//     DELETE FROM ... WHERE date=? → batch INSERT で書き直す (再実行 idempotent)。
//   - clients は日付スコープではなく cid 単位の累積テーブルのため DELETE→INSERT ではなく
//     upsert (INSERT ... ON CONFLICT DO UPDATE) で first_seen=MIN / last_seen=MAX を更新する。
//     この upsert も同一日付を何度再実行しても結果が変わらない (idempotent)。
//
// 日付境界: アプリは国ゲートで日本のみのため JST 固定。 JST の暦日 date (YYYY-MM-DD) は
//   UTC では [date 00:00 JST - 9h, date 00:00 JST - 9h + 24h) = [前日15:00Z, 当日15:00Z) に対応する。
//
// 遅延書込みカバー: cron (handleScheduledRollup) は「昨日」だけでなく「一昨日」も毎回
//   再集計する (docs §6-3 確定契約)。 WAE への書込みは即時反映が保証されないため、昨日分の
//   初回ロールアップ後に遅れて着地するイベントが発生しうる。 上記の DELETE→INSERT / upsert
//   (MIN/MAX) の idempotency により、一昨日を再実行しても安全に自己修復できる。
//
// secrets/binding 欠如時は graceful skip ({skipped:true, reason}) を返し、例外を投げて
// cron/呼び出し元を落とさない。 WAE_SQL_TOKEN はログ・例外メッセージのいずれにも含めない
// (Cloudflare API のエラーレスポンス本体には元々含まれないため、それをそのまま出力しても安全)。
// -----------------------------------------------------------------------------

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATASET_NAME_RE = /^[A-Za-z0-9_]+$/;
const D1_BATCH_CHUNK_SIZE = 100; // 1回の db.batch() あたりの statement 数上限 (保守的な安全値)

// ---- スキーマ定義 (確定契約どおり、CREATE TABLE IF NOT EXISTS で idempotent) ----
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS daily_events (
    date TEXT NOT NULL,
    event TEXT NOT NULL,
    game_id TEXT NOT NULL DEFAULT '',
    platform TEXT NOT NULL DEFAULT '',
    tier TEXT NOT NULL DEFAULT '',
    count INTEGER NOT NULL,
    PRIMARY KEY (date, event, game_id, platform, tier)
  )`,
  `CREATE TABLE IF NOT EXISTS daily_clients (
    date TEXT NOT NULL,
    cid TEXT NOT NULL,
    PRIMARY KEY (date, cid)
  )`,
  `CREATE TABLE IF NOT EXISTS clients (
    cid TEXT PRIMARY KEY,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS rollup_log (
    date TEXT PRIMARY KEY,
    rolled_at INTEGER NOT NULL,
    events_rows INTEGER NOT NULL,
    clients_rows INTEGER NOT NULL
  )`
];

// 引数は env (D1Database そのものではなく env.ANALYTICS_DB を保持するオブジェクト) を取る。
// src/api/analytics-admin.js の全ハンドラが env.ANALYTICS_DB の存在チェック後に
// ensureSchema(env) という形で呼び出す確立済みの契約に合わせている (D1 が未プロビジョニングの
// env では呼び出し側が事前に notProvisioned() で弾くため、db 欠如時はここでは静かに no-op)。
export async function ensureSchema(env) {
  const db = env && env.ANALYTICS_DB;
  if (!db) return;
  // CREATE TABLE IF NOT EXISTS は個々に実行しても安全 (DDL を batch に混ぜない、
  // D1 の batch は DML 向けの想定で使い分ける)。
  for (const stmt of SCHEMA_STATEMENTS) {
    await db.prepare(stmt).run();
  }
}

// ---- JST 日付ユーティリティ (js/daily-quest.js todayKeyJST() と同じ考え方: Date.now()+9h を
//      UTC getter で読むことで JST の暦日成分を取り出す。 タイムゾーン付き Date API に依存しない) ----
function pad2(n) { return String(n).padStart(2, '0'); }

function jstYesterdayDateString(nowMs) {
  const base = (typeof nowMs === 'number' && Number.isFinite(nowMs)) ? nowMs : Date.now();
  const j = new Date(base + JST_OFFSET_MS - 24 * 60 * 60 * 1000);
  return `${j.getUTCFullYear()}-${pad2(j.getUTCMonth() + 1)}-${pad2(j.getUTCDate())}`;
}

// JST の「一昨日」(today - 2日)。 jstYesterdayDateString(nowMs) は「nowMs から見た前日」を
// 返すので、 nowMs を 24h 遡らせて渡すことで「一昨日」を得る (jstYesterdayDateString(now - 24h)
// = (now - 24h) から見た前日 = now から見た一昨日)。
function jstDayBeforeYesterdayDateString(nowMs) {
  const base = (typeof nowMs === 'number' && Number.isFinite(nowMs)) ? nowMs : Date.now();
  return jstYesterdayDateString(base - 24 * 60 * 60 * 1000);
}

// dateJst (YYYY-MM-DD, JST の暦日) を UTC の [start, end) ms 範囲に変換する。
// JST 00:00 の dateJst は UTC では前日 15:00 (JST=UTC+9 なので 9h 引く)。
function jstDateBoundsUtc(dateJst) {
  const m = DATE_RE.exec(dateJst);
  if (!m) return null;
  const y = Number(dateJst.slice(0, 4));
  const mo = Number(dateJst.slice(5, 7));
  const d = Number(dateJst.slice(8, 10));
  const startMs = Date.UTC(y, mo - 1, d, 0, 0, 0) - JST_OFFSET_MS;
  const endMs = startMs + 24 * 60 * 60 * 1000;
  return { startMs, endMs };
}

// WAE SQL (ClickHouse 風 toDateTime()) が受理できる 'YYYY-MM-DD HH:MM:SS' 形式に整形する。
function formatSqlDateTime(ms) {
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
}

function normalizeDateOrYesterday(date) {
  if (date === undefined || date === null || date === '') {
    return { ok: true, date: jstYesterdayDateString() };
  }
  if (typeof date === 'string' && DATE_RE.test(date)) {
    return { ok: true, date };
  }
  return { ok: false };
}

// ---- 設定チェック (graceful skip 用) ----
function missingConfig(env) {
  if (!env || !env.WAE_SQL_TOKEN) return 'missing-wae-sql-token';
  if (!env.ANALYTICS_DB) return 'missing-analytics-db';
  if (!env.ANALYTICS_DATASET) return 'missing-analytics-dataset';
  if (!DATASET_NAME_RE.test(env.ANALYTICS_DATASET)) return 'invalid-analytics-dataset-name';
  if (!env.CF_ACCOUNT_ID) return 'missing-cf-account-id';
  return null;
}

// ---- WAE SQL API 呼び出し ----
// トークンは Authorization ヘッダーにのみ載せ、ログ・例外メッセージには一切出さない。
// Cloudflare API のエラーレスポンス本体はリクエストヘッダーをエコーしないため、
// status/body をそのままログに出しても token 漏洩にはならない。
async function runWaeSql(env, sql) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.WAE_SQL_TOKEN}`,
      'Content-Type': 'text/plain'
    },
    body: sql
  });
  if (!resp.ok) {
    let bodyText = '';
    try { bodyText = await resp.text(); } catch (_) { /* ignore */ }
    console.error(
      '[analytics-rollup] WAE SQL API request failed: status=' + resp.status +
      (bodyText ? (' body=' + bodyText.slice(0, 300)) : '')
    );
    throw new Error('wae-sql-http-' + resp.status);
  }
  return resp.json();
}

// 対象 JST 日の生イベント行を取得する。 列は events.js の writeDataPoint 列順に対応:
//   index1=cid, blob1=name(event), blob2=platform, blob3=tier, blob5=game_id, double1=ts。
// GROUP BY は使わず生行のまま取得し、Worker 側 (aggregateRows) でサンプリング補正込みの
// 集計を行う (確定契約: 「取得行を Worker 内で集計」)。
async function fetchWaeRows(env, dateJst) {
  const bounds = jstDateBoundsUtc(dateJst);
  if (!bounds) throw new Error('invalid-date-bounds');
  const startSql = formatSqlDateTime(bounds.startMs);
  const endSql = formatSqlDateTime(bounds.endMs);
  const sql =
    'SELECT index1 AS cid, blob1 AS name, blob2 AS platform, blob3 AS tier, blob5 AS game_id, ' +
    'double1 AS ts, _sample_interval AS sample_interval ' +
    `FROM ${env.ANALYTICS_DATASET} ` +
    `WHERE timestamp >= toDateTime('${startSql}') AND timestamp < toDateTime('${endSql}')`;
  const result = await runWaeSql(env, sql);
  return (result && Array.isArray(result.data)) ? result.data : [];
}

// ---- Worker 内集計 ----
// daily_events は (event, game_id, platform, tier) 毎に SUM(_sample_interval) で集計する
// (COUNT(*) だとサンプリングによる過小カウントを補正できない)。
// daily_clients / clients は DISTINCT cid (この日に観測された cid の集合)。
function aggregateRows(rows) {
  const eventsMap = new Map(); // key = JSON.stringify([event, game_id, platform, tier]) -> SUM(_sample_interval)
  const clientIds = new Set();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const cid = typeof row.cid === 'string' ? row.cid : '';
    if (cid) clientIds.add(cid);

    const name = typeof row.name === 'string' ? row.name : '';
    if (!name) continue; // event 名が無い行は daily_events 集計対象外 (cid は既に daily_clients 側で拾済み)

    const gameId = typeof row.game_id === 'string' ? row.game_id : '';
    const platform = typeof row.platform === 'string' ? row.platform : '';
    const tier = typeof row.tier === 'string' ? row.tier : '';

    const sampleInterval = Number(row.sample_interval);
    // _sample_interval は「このデータポイントが代表しているサンプル数」。 欠落/不正値は
    // 安全側に倒して1件分として数える (adaptive sampling が発動していない場合の既定値も1)。
    const weight = Number.isFinite(sampleInterval) && sampleInterval > 0 ? sampleInterval : 1;

    // JSON.stringify([...]) をキーにする: 単純な区切り文字連結だと値そのものに区切り文字が
    // 含まれた場合に別カテゴリと衝突しうるため、要素ごとに quote される JSON エンコードで
    // 衝突を回避する (制御文字を区切りに使う手も可能だが可読性/grep しやすさを優先)。
    const key = JSON.stringify([name, gameId, platform, tier]);
    eventsMap.set(key, (eventsMap.get(key) || 0) + weight);
  }
  return { eventsMap, clientIds };
}

// ---- D1 書込み ----
async function runBatched(db, stmts) {
  if (!stmts.length) return;
  for (let i = 0; i < stmts.length; i += D1_BATCH_CHUNK_SIZE) {
    const chunk = stmts.slice(i, i + D1_BATCH_CHUNK_SIZE);
    await db.batch(chunk);
  }
}

// DELETE FROM daily_events WHERE date=? → batch INSERT (同一 date の再実行で重複しない)。
async function writeDailyEvents(db, date, eventsMap) {
  const stmts = [db.prepare('DELETE FROM daily_events WHERE date = ?').bind(date)];
  for (const [key, sum] of eventsMap.entries()) {
    const [event, gameId, platform, tier] = JSON.parse(key);
    const count = Math.round(sum);
    stmts.push(
      db.prepare(
        'INSERT INTO daily_events (date, event, game_id, platform, tier, count) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(date, event, gameId, platform, tier, count)
    );
  }
  await runBatched(db, stmts);
}

// DELETE FROM daily_clients WHERE date=? → batch INSERT (同上、idempotent)。
async function writeDailyClients(db, date, clientIds) {
  const stmts = [db.prepare('DELETE FROM daily_clients WHERE date = ?').bind(date)];
  for (const cid of clientIds) {
    stmts.push(db.prepare('INSERT INTO daily_clients (date, cid) VALUES (?, ?)').bind(date, cid));
  }
  await runBatched(db, stmts);
}

// clients は date スコープではなく cid 単位の累積テーブルなので DELETE→INSERT ではなく
// upsert (first_seen=MIN / last_seen=MAX) で更新する。 同一 date を何度再実行しても
// 結果は変わらない (MIN/MAX は再計算しても同じ値に収束する)。
async function upsertClients(db, date, clientIds) {
  const stmts = [];
  for (const cid of clientIds) {
    stmts.push(
      db.prepare(
        `INSERT INTO clients (cid, first_seen, last_seen) VALUES (?, ?, ?)
         ON CONFLICT(cid) DO UPDATE SET
           first_seen = MIN(first_seen, excluded.first_seen),
           last_seen = MAX(last_seen, excluded.last_seen)`
      ).bind(cid, date, date)
    );
  }
  await runBatched(db, stmts);
}

// rollup_log は date PRIMARY KEY の 1行 upsert (再実行のたびに rolled_at/行数を更新)。
async function upsertRollupLog(db, date, eventsRows, clientsRows) {
  await db.prepare(
    `INSERT INTO rollup_log (date, rolled_at, events_rows, clients_rows) VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       rolled_at = excluded.rolled_at,
       events_rows = excluded.events_rows,
       clients_rows = excluded.clients_rows`
  ).bind(date, Date.now(), eventsRows, clientsRows).run();
}

// ---- コア処理: 指定された JST 日付1日分をロールアップする ----
export async function runRollup(env, dateJst) {
  if (!DATE_RE.test(dateJst || '')) {
    return { skipped: false, error: true, reason: 'invalid-date' };
  }

  const skipReason = missingConfig(env);
  if (skipReason) {
    // secrets/binding 欠如時の graceful skip: エラーで落とさずログのみ (呼び出し元 = cron/admin API
    // 双方が壊れないようにする。 WAE_SQL_TOKEN 等の値そのものは出力しない、キー名のみ)。
    console.log('[analytics-rollup] skipped: ' + skipReason);
    return { skipped: true, reason: skipReason };
  }

  try {
    await ensureSchema(env);

    const rows = await fetchWaeRows(env, dateJst);
    const { eventsMap, clientIds } = aggregateRows(rows);

    await writeDailyEvents(env.ANALYTICS_DB, dateJst, eventsMap);
    await writeDailyClients(env.ANALYTICS_DB, dateJst, clientIds);
    await upsertClients(env.ANALYTICS_DB, dateJst, clientIds);
    await upsertRollupLog(env.ANALYTICS_DB, dateJst, eventsMap.size, clientIds.size);

    return {
      skipped: false,
      error: false,
      date: dateJst,
      rawRows: rows.length,
      eventsRows: eventsMap.size,
      clientsRows: clientIds.size
    };
  } catch (e) {
    // 失敗時は console.error に記録し、例外は投げない (次回 cron のリトライに任せる、
    // 確定契約 §6-3 手順5)。 e.message には token を含まない (runWaeSql 側で保証済み)。
    console.error('[analytics-rollup] runRollup failed for date=' + dateJst + ': ' + (e && e.message));
    return { skipped: false, error: true, reason: 'exception', date: dateJst };
  }
}

// ---- エントリポイント 1: 手動実行 (POST /api/admin/analytics/rollup, body {date?}) ----
// date 省略時は JST 昨日を対象にする (確定契約どおり)。 不正な形式の date は
// WAE/D1 に一切触れずに { error:true, reason:'invalid-date' } を返す。
export async function runRollupForDate(env, date) {
  const normalized = normalizeDateOrYesterday(date);
  if (!normalized.ok) {
    return { skipped: false, error: true, reason: 'invalid-date' };
  }
  return runRollup(env, normalized.date);
}

// ---- エントリポイント 2: scheduled (cron) ----
// JST「昨日」+「一昨日」の2日分を毎回再集計する (docs/data-analytics-plan.md §6-3 確定契約:
// WAE の遅延書込みをカバーするため)。 WAE へのイベント書込みは即時反映が保証されておらず、
// 「昨日」分のロールアップ実行時点でまだ WAE 側に着地していないイベントが後から遅れて
// 書き込まれるケースがある。 1日分しか再集計しないと、その日を境に cron が二度と触らないため
// 遅延書込み分が永久に daily_events/daily_clients/clients (ひいては first_seen 起点の
// retention コホート) から欠落する。 DELETE→INSERT / upsert(MIN/MAX) は同一日付の再実行が
// 常に安全 (idempotent) な設計なので、「一昨日」を毎日再実行しても副作用なく自己修復できる。
// scheduled ハンドラと手動実行 (runRollupForDate) が同じロジックを共有する点は変わらない。
export async function handleScheduledRollup(env) {
  const now = Date.now();
  const yesterday = jstYesterdayDateString(now);
  const dayBeforeYesterday = jstDayBeforeYesterdayDateString(now);
  const yesterdayResult = await runRollupForDate(env, yesterday);
  const dayBeforeYesterdayResult = await runRollupForDate(env, dayBeforeYesterday);
  return { yesterday: yesterdayResult, dayBeforeYesterday: dayBeforeYesterdayResult };
}
