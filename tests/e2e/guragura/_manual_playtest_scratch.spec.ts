// STRAY FILE — 削除してください (rm 権限が拒否され自動削除できなかった。
// 2026-07-23 v3 再設計セッションでも再度 rm を試みたが同様に拒否された)。
// このファイルは 2026-07-22 の guragura-seesaw 重さ再設計 (旧5ラウンド版) タスクで、
// 実ブラウザで全5ラウンドがクリア可能かを手動確認するための一時 e2e スクリプト
// でした。内容は 2026-07-23 v3 再設計 (10ラウンド化・ふたご皿廃止) により完全に
// 陳腐化しています (旧 ROUND1-5 の解の記録は現行 CATALOG/ROUNDS と対応しません)。
// tests/e2e/guragura/ の正式なテストスイートには含めない想定です
// (test.skip で無効化済み、CI/回帰には一切影響しません)。
// 全10ラウンドの手動確認は本タスクで別途 e2e スクリプトを使って実施済み
// (このファイルへの追記はしない)。
// 次に rm 権限のあるセッションで削除してください:
//   rm tests/e2e/guragura/_manual_playtest_scratch.spec.ts
const { test } = require('@playwright/test');
test.skip('STRAY FILE - please delete (see comment header)', () => {});
