"use strict";

// batch:1236 (v2101): デバッグ機能 'survey-multi-submit' の静的回帰テスト。
// ON のときだけご感想 (survey.html) と★モーダル (rating-modal.js) の永久 dedup
// (pono_rating_completed_forever) をバイパスできること、 および本番安全性
// (debug-mode.js の isAllowed() gating) が維持されていることを検証する。
// 実行: node tests/survey_debug_multi_submit_regression.cjs

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const survey = fs.readFileSync(path.join(root, "survey.html"), "utf8");
const features = fs.readFileSync(path.join(root, "common/debug-features.js"), "utf8");
const debugMode = fs.readFileSync(path.join(root, "common/debug-mode.js"), "utf8");
const ratingModal = fs.readFileSync(path.join(root, "common/rating-modal.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

// ---- 1. debug-features.js: カタログに survey-multi-submit がある ----
assert.match(features, /id:\s*'survey-multi-submit'/, "debug-features.js must register the survey-multi-submit feature id");
assert.match(features, /label:\s*'ご感想：何回でも送れる'/, "the survey-multi-submit feature must keep its Japanese debug-board label");
const featureEntry = features.match(/\{[^{}]*id:\s*'survey-multi-submit'[^{}]*\}/);
assert.ok(featureEntry, "the survey-multi-submit catalog entry must be a single flat object");
assert.match(featureEntry[0], /default:\s*false/, "survey-multi-submit must stay opt-in (default false)");

// ---- 2. survey.html: debug-mode.js 読込 + feature 参照 ----
assert.match(survey, /<script src="\/common\/debug-mode\.js"><\/script>/, "survey.html must load common/debug-mode.js (sw.js caches it as /common/debug-mode.js)");
assert.ok(
  survey.indexOf('<script src="/common/debug-mode.js">') < survey.indexOf("window.PONO_SW_VERSION"),
  "debug-mode.js must load before the inline survey script so PonoDebugMode exists"
);
assert.match(survey, /isFeatureEnabled\('survey-multi-submit'\)/, "survey.html must gate the bypass on the survey-multi-submit feature");
assert.match(
  survey,
  /function isDebugMultiSubmit\(\)\{\s*try \{ return !!\(window\.PonoDebugMode && window\.PonoDebugMode\.isFeatureEnabled\('survey-multi-submit'\)\); \} catch\(e\)\{ return false; \}/,
  "the survey helper must guard window.PonoDebugMode existence and never throw"
);

// ---- 3. survey.html: dedup チェックが debug バイパス条件付き ----
assert.equal(
  (survey.match(/if \(!isDebugMultiSubmit\(\) && isAlreadySubmitted\(\)\)\{/g) || []).length,
  2,
  "both the mount-time early return and the submit-handler recheck must skip dedup only when debug is ON"
);
// markSubmitted は debug ON でも従来どおり呼ぶ (本番との差分最小化)
assert.match(survey, /\n    markSubmitted\(\);/, "markSubmitted() must still run unconditionally after submit");
assert.doesNotMatch(survey, /isDebugMultiSubmit\(\)[^\n]*markSubmitted/, "markSubmitted() must not be gated by the debug feature");
// 再送信ボタンは debug ON のときだけ DOM 生成される
const resendBlock = survey.match(/if \(isDebugMultiSubmit\(\)\)\{[\s\S]*?debugResendBtn[\s\S]*?\n    \}/);
assert.ok(resendBlock, "the debug resend button must only be created inside an isDebugMultiSubmit() guard");
assert.match(resendBlock[0], /__submitted = false;/, "the resend button must reset the double-fire flag");
assert.match(resendBlock[0], /againBtn\.disabled = false;/, "the resend button must re-enable the submit button");
assert.equal((survey.match(/debugResendBtn/g) || []).length, 2, "debugResendBtn must not leak outside the guarded block (create-once check + id)");

// ---- 4. survey.html: 既存 SecReview 対策が残っている ----
assert.match(survey, /if \(freeText\.length > 500\) freeText = freeText\.slice\(0, 500\);/, "the freeText 500-char clamp must stay");
assert.match(survey, /if \(email && !\/\^\[\^\\s@\]\{1,64\}@\[\^\\s@\]\{1,255\}\$\/\.test\(email\)\)/, "the email format validation must stay");
assert.match(survey, /if \(s < 1 \|\| s > 5\) s = 0;/, "the star clamp must stay");
assert.match(survey, /if \(__submitted\) return;/, "the double-fire guard must stay");

// ---- 5. rating-modal.js: forever フラグの debug バイパス ----
assert.match(
  ratingModal,
  /function isDebugMultiSubmit\(\) \{\s*try \{\s*return !!\(window\.PonoDebugMode && window\.PonoDebugMode\.isFeatureEnabled\('survey-multi-submit'\)\);\s*\} catch \(e\) \{ return false; \}/,
  "rating-modal.js must guard window.PonoDebugMode existence and never throw"
);
assert.match(
  ratingModal,
  /function isCompletedForever\(\) \{\s*if \(isDebugMultiSubmit\(\)\) return false;/,
  "isCompletedForever must consult the debug bypass before reading the forever flag"
);
// 4 箇所のチェック (saveRating / postStarToAppsScript / maybeShowAfterClear / _shouldSuppressTitleLPOpen)
// はすべて共通ヘルパー経由。 生の getItem はヘルパー内の 1 箇所だけ。
assert.equal(
  (ratingModal.match(/getItem\('pono_rating_completed_forever'\)/g) || []).length,
  1,
  "the raw forever-flag read must live only inside isCompletedForever"
);
assert.equal(
  (ratingModal.match(/if \(isCompletedForever\(\)\) return;/g) || []).length,
  2,
  "saveRating and postStarToAppsScript must both use the shared helper"
);
assert.match(ratingModal, /if \(isCompletedForever\(\)\) return Promise\.resolve\(false\);/, "maybeShowAfterClear must use the shared helper");
assert.match(ratingModal, /if \(isCompletedForever\(\)\) return 'forever';/, "_shouldSuppressTitleLPOpen must keep its 'forever' status semantics");
// set 側 (CTA commit) は debug ON でも従来どおり
assert.match(ratingModal, /setItem\('pono_rating_completed_forever', '1'\)/, "the CTA commit must still set the forever flag even in debug mode");

// ---- 6. 本番安全性: debug-mode.js の gating が不変 ----
assert.match(
  debugMode,
  /function isFeatureEnabled\(featureKey\) \{\s*if \(!isAllowed\(\)\) return false;/,
  "isFeatureEnabled must keep its isAllowed() gate as the first check"
);
assert.match(
  debugMode,
  /function isAllowed\(\) \{\s*if \(!isStagingHost\(\)\) return false;/,
  "isAllowed must keep its staging-host gate"
);
assert.match(debugMode, /ss\.getItem\(SS_KEY\) === '1'/, "isAllowed must keep the manage-unlock sessionStorage gate");

// ---- 7. sw.js CACHE_VERSION bump + survey.html PONO_SW_VERSION 同期 ----
const swVersion = sw.match(/const CACHE_VERSION = (\d+);/);
assert.ok(swVersion, "sw.js must declare CACHE_VERSION");
assert.ok(parseInt(swVersion[1], 10) >= 2099, "CACHE_VERSION must be bumped to at least 2099 for this change");
// クロスレビュー指摘 (Medium): sw.js だけバンプする将来 batch で恒久 fail しないよう、
// CACHE_VERSION との完全一致は要求せず 「v数値形式 + この変更時点 (v2101) 以上」 に緩和。
const surveyVersion = survey.match(/window\.PONO_SW_VERSION = 'v(\d+)';/);
assert.ok(surveyVersion, "survey.html must declare window.PONO_SW_VERSION in v<number> form");
assert.ok(parseInt(surveyVersion[1], 10) >= 2099, "survey.html PONO_SW_VERSION must be synced to at least v2099");
// changelog は 「どこかの行が survey-multi-submit に言及」 でよい (最新行であることは要求しない)
assert.match(sw, /\/\/ v\d+: .*survey-multi-submit/, "a sw.js changelog line must describe the survey-multi-submit bump");

console.log("survey debug multi-submit regression: PASS");
