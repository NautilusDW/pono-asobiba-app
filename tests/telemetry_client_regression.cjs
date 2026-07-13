"use strict";

// common/telemetry.js の静的検証。 B班 (クライアント計測モジュール) の契約:
//   docs/data-analytics-plan.md §5-1/§5-3/§5-4/§5-5/§6-2/§7-1 準拠。
// ブラウザ環境 (fetch/IndexedDB/localStorage) を必要としないよう、
// 実行はせずソーステキストへの静的アサーションのみで検証する
// (既存 tests/*_regression.cjs のスタイルを踏襲)。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(root, "common/telemetry.js"), "utf8");

// ---- 基本構造 ----
assert.match(src, /\(function\s*\(\)\s*\{/, "must be an IIFE");
assert.match(src, /'use strict';/, "must be strict mode");
assert.match(src, /window\.PonoTelemetry\s*=\s*\{/, "must expose window.PonoTelemetry");
["track", "optOut", "isOptedOut", "resetClientId"].forEach(function (fn) {
  assert.match(
    src,
    new RegExp(fn + "\\s*:\\s*" + fn),
    "window.PonoTelemetry must expose " + fn
  );
});

// ---- common/tier.js 未ロード時のフォールバック ----
assert.match(src, /return 'unknown';/, "getTier() must fall back to 'unknown' when common/tier.js is absent");

// ---- crypto.randomUUID 使用 ----
assert.match(src, /crypto\.randomUUID\s*\(/, "must use crypto.randomUUID for anonymous id generation");

// ---- sendBeacon を使わない (計画書 §7-1) ----
assert.ok(!/sendBeacon/.test(src), "must not use navigator.sendBeacon (fetch keepalive only, per §7-1)");

// ---- fetch keepalive:true ----
assert.match(src, /keepalive\s*:\s*true/, "fetch call must set keepalive:true");

// ---- チャンク上限 (50件 / 約30KB) ----
assert.match(src, /CHUNK_MAX_EVENTS\s*=\s*50\s*;/, "chunk event-count cap must be 50");
assert.match(src, /CHUNK_MAX_BYTES\s*=\s*30\s*\*\s*1024\s*;/, "chunk byte-size cap must be ~30KB");
assert.match(src, /estimateBytes/, "chunk builder must estimate payload byte size");

// ---- opt_out 早期 return が track と flush 双方にある ----
function functionBody(name) {
  const idx = src.indexOf("function " + name + "(");
  assert.ok(idx >= 0, "function " + name + "() must exist");
  return src.slice(idx, idx + 400);
}
// track() は opt-out 中/name欠落時に false を返す (下記の trackDailyReturnOnce()
// dedup 修正が「実際に enqueue できたか」を判別するために必要な契約)。
assert.match(
  functionBody("track"),
  /isOptedOut\(\)\s*\)\s*return false;/,
  "track() must early-return false when isOptedOut()"
);
assert.match(
  functionBody("track"),
  /return true;/,
  "track() must return true when it actually enqueues"
);
assert.match(
  functionBody("flush"),
  /isOptedOut\(\)\s*\)\s*return;/,
  "flush() must early-return when isOptedOut()"
);

// ---- PII キー (name/age/gender/email) がペイロード構築コードに含まれない ----
// sendChunk() (envelope の JSON.stringify を組み立てる関数) を切り出して検証する。
const sendChunkIdx = src.indexOf("function sendChunk(");
assert.ok(sendChunkIdx >= 0, "sendChunk() must exist");
const nextFnIdx = src.indexOf("\n  var flushing", sendChunkIdx);
assert.ok(nextFnIdx > sendChunkIdx, "must be able to isolate sendChunk() body");
const sendChunkBody = src.slice(sendChunkIdx, nextFnIdx);
[/\bname\s*:/i, /\bage\s*:/i, /\bgender\s*:/i, /\bemail\s*:/i].forEach(function (re) {
  assert.ok(
    !re.test(sendChunkBody),
    "payload envelope (sendChunk) must not contain PII key matching " + re
  );
});
// プロフィール保存キーそのものも参照してはいけない (二重防御)。
assert.ok(
  !/pono_player_profile|pono_profile/.test(src),
  "telemetry.js must never read the profile storage keys (name/age/gender source)"
);

// ---- ストレージキー設計 (§5-3) ----
assert.match(src, /LS_CLIENT_ID\s*=\s*'pono_client_id'/, "client_id key must be pono_client_id");
assert.match(src, /LS_OPT_OUT\s*=\s*'pono_telemetry_opt_out'/, "opt-out key must be pono_telemetry_opt_out");
assert.match(src, /LS_NOTICE_SHOWN\s*=\s*'pono_telemetry_notice_shown'/, "notice-shown key must be pono_telemetry_notice_shown");
assert.match(src, /SS_SID\s*=\s*'pono_telemetry_sid'/, "session id key must be pono_telemetry_sid");
assert.match(src, /SS_SID_TS\s*=\s*'pono_telemetry_sid_ts'/, "session id timestamp key must be pono_telemetry_sid_ts");

// ---- 常時購読 (PonoGameStickerGranted / pono-acorns-changed) ----
assert.match(src, /addEventListener\('PonoGameStickerGranted',\s*onStickerGranted\)/, "must subscribe to PonoGameStickerGranted unconditionally");
assert.match(src, /addEventListener\('pono-acorns-changed',\s*onAcornsChanged\)/, "must subscribe to pono-acorns-changed unconditionally");
assert.match(src, /track\('game_clear',/, "sticker-granted handler must track game_clear");
assert.match(src, /track\('acorn_earned',/, "acorns-changed handler must track acorn_earned");
// spend (delta<=0) は acorn_earned の対象外であること。
assert.match(src, /if\s*\(\s*delta\s*<=\s*0\s*\)\s*return;/, "acorn_earned tracking must skip non-positive delta (spend)");

// ---- auto 属性ゲート (session_start / daily_return / 告知バナー) ----
assert.match(src, /data-pono-telemetry-auto/, "must read the data-pono-telemetry-auto script attribute");
assert.match(src, /if\s*\(\s*AUTO_FLAG\s*\)\s*\{/, "session_start/daily_return/notice must be gated on AUTO_FLAG");
assert.match(src, /trackSessionStart\(\);/, "auto branch must call trackSessionStart");
assert.match(src, /trackDailyReturnOnce\(\);/, "auto branch must call trackDailyReturnOnce");
assert.match(src, /maybeShowNotice\(\);/, "auto branch must call maybeShowNotice");

// ---- daily_return dedup (JST, js/daily-quest.js の todayKeyJST を複製) ----
assert.match(src, /出典: js\/daily-quest\.js/, "todayKeyJST duplication must cite its source per task spec");
assert.match(src, /getUTCFullYear\(\)\s*\+\s*'-'\s*\+\s*pad2\(j\.getUTCMonth\(\)\s*\+\s*1\)/, "todayKeyJST must match js/daily-quest.js JST logic");

// ---- daily_return dedup マーカーは track() が実際に enqueue できた時だけ保存する
// (クロスレビュー指摘: opt-out 中に無条件で保存すると、同日中の opt-in 後に
// daily_return が二度と発火しなくなる)。
{
  const fnIdx = src.indexOf("function trackDailyReturnOnce(");
  assert.ok(fnIdx >= 0, "trackDailyReturnOnce() must exist");
  const fnBody = src.slice(fnIdx, fnIdx + 400);
  assert.match(
    fnBody,
    /if\s*\(\s*track\('daily_return',\s*\{\s*date_jst:\s*today\s*\}\)\s*\)\s*\{\s*lsSet\(LS_LAST_DR,\s*today\);/,
    "trackDailyReturnOnce() must only persist LS_LAST_DR when track() returns true"
  );
}

// ---- IndexedDB フォールバック (private mode 等) ----
assert.match(src, /idbAvailable\s*=\s*false/, "must flip idbAvailable=false when IndexedDB is unusable");
assert.match(src, /var memQueue\s*=\s*\[\];/, "must maintain an in-memory queue fallback");

console.log("telemetry client regression: PASS");
