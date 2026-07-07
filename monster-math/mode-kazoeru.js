// monster-math/mode-kazoeru.js
// かぞえる (プッチ) — T0 stub。 self-registration のみ。
// Impl 3 がこのファイル 1 本のみを編集して実装する (index.html / engine.js は触らない、
// SPEC §3.1 / §4.2 の worktree isolation 前提)。
if (window.MM) {
  window.MM.registerMode('kazoeru', {
    label: 'かぞえる',
    monsterId: 'pucchi',
    difficultyLabel: 'やさしい',
    // SPEC §2.2: Stage1-5、 出題形式 A(ドット→おさら)/B(数字→おさら)/C(おさら→数字)
    // Impl 3 が各ステージ設定 (数域/形式/配置バリエーション) をここに埋める。
    stages: [], // T0: 空 (stage select は「じゅんびちゅう」プレースホルダーを表示)
    createRound: function (stageCfg, scaffold) { return null; }, // stub
    onFoodTap: function (food, ctx) {},
    onAnswerTap: function (card, ctx) {},
    tutorialSteps: []
  });
} else {
  try { console.warn('[mode-kazoeru] window.MM not found — registration skipped'); } catch (e) {}
}
