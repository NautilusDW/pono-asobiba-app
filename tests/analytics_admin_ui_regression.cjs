'use strict';

// 仕様: docs/data-analytics-plan.md §6-3/§6-4/§8
// admin/index.html に「📊 ぶんせき」タブを追加し、/api/admin/analytics/* から
// KPI・日次トレンド(インラインSVG)・ゲーム別ランキング・ファネル2本・リテンション表を
// 描画することを固定する回帰テスト。

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const admin = read('admin/index.html');

function parseInlineScripts(label, source, expectedCount) {
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;
  while ((match = re.exec(source))) {
    if (/\bsrc=/.test(match[1])) continue;
    count++;
    new vm.Script(match[2], { filename: `${label}-inline-${count}.js` });
  }
  assert.equal(count, expectedCount, `${label}: unexpected inline script count`);
}

// admin/index.html の既存インラインscript数(2)を変えていないこと = 既存パネル群の
// switchTab()等を壊さず追記できていることの簡易保証。
parseInlineScripts('admin', admin, 2);

// ── タブ登録 ──
assert.match(admin, /<button class="tab" data-panel="analytics">📊 ぶんせき<\/button>/);
assert.equal((admin.match(/id="panel-analytics"/g) || []).length, 1, 'panel-analytics must exist exactly once');
assert.match(admin, /panelId === 'analytics'\) analyticsInitPanel\(\)/);

// ── 設定診断バー ──
assert.match(admin, /id="analytics-diag"/);
assert.match(admin, /function analyticsRenderDiag\(data\)/);
assert.match(admin, /WAE_SQL_TOKEN（集計読み出し用トークン）/);
assert.match(admin, /ANALYTICS_DB（D1データベース）/);
assert.match(admin, /analytics-not-provisioned/);

// ── lastRollup はプレーン文字列として扱う (GET /api/admin/analytics/status の契約:
//    src/api/analytics-admin.js handleAnalyticsStatus は lastRollup = row.date というプレーン
//    文字列を返す。 `data.lastRollup.date`のようなオブジェクトアクセスをすると文字列への
//    `.date`アクセスは常にundefinedになり、ロールアップが正常に動いていても診断バーが恒久的に
//    「未実施」と表示され続けるリグレッションが過去に発生した) ──
{
  const fnMatch = admin.match(/function analyticsRenderDiag\(data\) \{([\s\S]*?)\n\}/);
  assert.ok(fnMatch, 'analyticsRenderDiag must be defined');
  const body = fnMatch[1];
  assert.doesNotMatch(
    body,
    /data\.lastRollup\.date\b/,
    'analyticsRenderDiag must not dereference .date off data.lastRollup — the status API returns a plain date string, not an object'
  );
  assert.doesNotMatch(
    body,
    /data\.lastRollup\s*&&\s*data\.lastRollup\.date/,
    'analyticsRenderDiag must not read data.lastRollup as {date: ...} — this exact pattern silently broke the diagnostic bar in the past'
  );
  assert.match(
    body,
    /var lastRollupDate = data\.lastRollup \? data\.lastRollup : '未実施';/,
    'analyticsRenderDiag must treat data.lastRollup as a plain string, falling back to 未実施 only when falsy'
  );
}

// ── 期間セレクタ 7/30/90日 ──
assert.match(admin, /data-days="7"/);
assert.match(admin, /data-days="30"/);
assert.match(admin, /data-days="90"/);
assert.match(admin, /function analyticsSetDays\(days\)/);

// ── 5 KPI ラベル存在 ──
const expectedKpiLabels = [
  '週間アクティブ端末数',
  'ゲーム起動数',
  'ゲームクリア数',
  'paywall到達数',
  'アップグレードCTAクリック数',
];
for (const label of expectedKpiLabels) {
  assert.ok(admin.includes(label), `KPI label missing: ${label}`);
}
// uu ツールチップ (client_id ベースの粗い識別子である旨)
assert.match(admin, /ブラウザ\/端末の粗い識別子であり、厳密な物理端末数ではありません/);

// ── SVG 使用 (外部チャートライブラリ不使用でインラインSVG描画) ──
assert.match(admin, /function analyticsBuildTrendSvg\(daysArr\)/);
assert.match(admin, /<svg viewBox="0 0 ' \+ w \+ ' ' \+ h \+ '"/);
assert.match(admin, /role="img" aria-label="日次トレンド/);
// 値ツールチップは title 要素で表現している
assert.match(admin, /<title>' \+ dateLabel \+/);

// ── ファネル2本 (session_start→game_launch→game_clear / paywall_hit→upgrade_cta_click) ──
assert.match(admin, /id="analytics-funnel-play"/);
assert.match(admin, /id="analytics-funnel-paywall"/);
assert.match(admin, /label: 'セッション開始', value: totals\.session_start \|\| 0/);
assert.match(admin, /label: 'ゲーム起動', value: totals\.game_launch \|\| 0/);
assert.match(admin, /label: 'ゲームクリア', value: totals\.game_clear \|\| 0/);
assert.match(admin, /label: '課金導線到達 \(paywall_hit\)', value: totals\.paywall_hit \|\| 0/);
assert.match(admin, /label: 'アップグレードCTAクリック', value: totals\.upgrade_cta_click \|\| 0/);

// ── リテンション表 (client_id ベースのコホート、d1/d7/d30) ──
assert.match(admin, /id="analytics-retention-table"/);
assert.match(admin, /function analyticsRenderRetention\(cohorts\)/);
assert.match(admin, /first_seen_date/);
assert.match(admin, /Number\(c\.d1\)/);
assert.match(admin, /Number\(c\.d7\)/);
assert.match(admin, /Number\(c\.d30\)/);

// ── ゲーム別ランキング表 (launches降順・上位15) ──
assert.match(admin, /id="analytics-games-table"/);
assert.match(admin, /function analyticsRenderGames\(games\)/);
assert.match(admin, /\.slice\(0, 15\)/);

// ── 手動ロールアップボタン ──
assert.match(admin, /id="analytics-rollup-btn"[^>]*onclick="analyticsRunRollup\(\)"/);
assert.match(admin, /function analyticsRunRollup\(\)/);
assert.match(admin, /runOne\(yesterday\)\.then\(function\(r1\) \{/);

// ── fetch 先 5 エンドポイントの綴り一致 ──
const expectedEndpoints = [
  '/api/admin/analytics/status',
  '/api/admin/analytics/overview?days=',
  '/api/admin/analytics/games?days=',
  '/api/admin/analytics/retention?days=',
  '/api/admin/analytics/rollup',
];
for (const ep of expectedEndpoints) {
  assert.ok(admin.includes(ep), `endpoint spelling missing/changed: ${ep}`);
}
// admin 分析タブから他綴りの分析系エンドポイントを叩いていないこと(誤字混入防止)
const analyticsFetchCalls = Array.from(
  admin.matchAll(/(?:analyticsFetchJson\(|fetch\()'(\/api\/admin\/analytics\/[^']*)'/g),
  (m) => m[1],
);
assert.ok(analyticsFetchCalls.length >= 5, 'expected at least 5 analytics fetch call sites');
for (const url of analyticsFetchCalls) {
  assert.ok(
    /^\/api\/admin\/analytics\/(status|overview\?days=|games\?days=|retention\?days=|rollup)$/.test(url),
    `unexpected analytics endpoint spelling: ${url}`,
  );
}

// ── session_id 由来の値と client_id 由来の値を同じKPI/表に混在させない設計チェック ──
// ファネル(session_id結合可)にはKPIカードの client_id 系キー(uu)を混ぜない。
assert.ok(!/analytics-funnel-(play|paywall)[\s\S]{0,400}totals\.uu\b/.test(admin), 'funnels must not use client_id-based uu');

// ── 外部 script src が cloud.umami.is 以外に増えていないこと ──
const externalScriptSrcs = Array.from(
  admin.matchAll(/<script[^>]+src="(https?:\/\/[^"]+)"/g),
  (m) => m[1],
);
for (const src of externalScriptSrcs) {
  assert.ok(src.includes('cloud.umami.is'), `unexpected external script src introduced: ${src}`);
}

// ── sw.js: admin/ は SW 介在なし (このタブ追加でキャッシュ対象化していないことの確認) ──
const sw = read('sw.js');
assert.match(sw, /event\.request\.url\.includes\('\/admin\/'\)[\s\S]*?return;/);

console.log('analytics admin ui regression: PASS');
