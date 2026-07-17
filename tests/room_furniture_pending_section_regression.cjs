const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('room/furniture_adjuster.html', 'utf8');

assert(html.includes("GH_BRANCH = 'develop-app'"), 'pivot discovery and saves must target the active development trunk');
assert(!html.includes("GH_BRANCH = 'develop';"), 'the frozen legacy branch must not be used by the pivot tool');
assert(html.includes('id="pending-items-section"'), 'pending section must exist');
assert(html.includes('id="pending-item-list"'), 'pending item list must exist');
assert(html.includes('id="pending-items-status"'), 'discovery status must be visible');
assert(html.includes("imp._discovered && pendingListEl ? pendingListEl : listEl"), 'discovered furniture must be routed to the pending list');
assert(html.includes("setPendingDiscoveryStatus('ready', added"), 'successful discovery must show a count');
assert(html.includes("setPendingDiscoveryStatus('empty', 0"), 'zero-result discovery must be explicit');
assert(html.includes("setPendingDiscoveryStatus('error', 0, '管理画面でGitHubトークンを設定"), 'missing token must be explained');
assert(html.includes("setPendingDiscoveryStatus('error', 0, '未調整家具の検出に失敗しました:"), 'API failures must be shown in the pending section');

console.log('PASS: pending furniture has a dedicated list and explicit discovery states');
