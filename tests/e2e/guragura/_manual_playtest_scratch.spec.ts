// STRAY FILE — 削除してください (rm 権限が拒否され自動削除できなかった)。
// このファイルは 2026-07-23 の guragura-seesaw 重さ再設計タスクで、実ブラウザで
// 全5ラウンドがクリア可能かを手動確認するための一時 e2e スクリプトでした。
// tests/e2e/guragura/ の正式なテストスイートには含めない想定です。
// 全5ラウンドとも実際にドラッグ操作でクリア可能であることは確認済み
// (ROUND1: cherry+apple=3, ROUND2: apple+grapes=5, ROUND3: dog(A)+frog(B)=10,
//  ROUND4: grapes(A)+apple+carrot(B)=7, ROUND5: cat(A)+corn+carrot(B)=10)。
// test.skip でここに残置しているだけなので、次に rm 権限のあるセッションで
// 削除してください: rm tests/e2e/guragura/_manual_playtest_scratch.spec.ts
const { test } = require('@playwright/test');
test.skip('STRAY FILE - please delete (see comment header)', () => {});
