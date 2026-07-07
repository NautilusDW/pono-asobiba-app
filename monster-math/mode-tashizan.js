// monster-math/mode-tashizan.js
// たしざん (ガブル) — T0 stub。 self-registration のみ。
// Impl 4 がこのファイル 1 本のみを編集して実装する (index.html / engine.js は触らない、
// SPEC §3.1 / §4.2 の worktree isolation 前提)。
// 注意: soft gate (10づくり累計★<12 で推奨表示) は Impl 2 の progress スキーマ確定後に
// MM.progress.getStars('make10', n) を合算して判定する (SPEC §4.2 の依存関係)。
if (window.MM) {
  window.MM.registerMode('tashizan', {
    label: 'たしざん',
    monsterId: 'gaburu',
    difficultyLabel: 'むずかしい',
    // SPEC §2.2: Stage1-5、 2皿給餌→数字カード回答、 Stage4+ でキャリー (make-10 bridge)
    // Impl 4 が各ステージ設定 (出題域/択数/フレーム構成) をここに埋める。
    stages: [], // T0: 空 (stage select は「じゅんびちゅう」プレースホルダーを表示)
    createRound: function (stageCfg, scaffold) { return null; }, // stub
    onFoodTap: function (food, ctx) {},
    onAnswerTap: function (card, ctx) {},
    tutorialSteps: []
  });
} else {
  try { console.warn('[mode-tashizan] window.MM not found — registration skipped'); } catch (e) {}
}
