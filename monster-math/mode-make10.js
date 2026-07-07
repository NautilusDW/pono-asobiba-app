// monster-math/mode-make10.js
// 10づくり (パクン) — T0 stub。 self-registration のみ。
// Impl 2 がこのファイル 1 本のみを編集して実装する (index.html / engine.js は触らない、
// SPEC §3.1 / §4.2 の worktree isolation 前提)。
//
// engine.js (window.MM) が未ロード、 または本ファイルが 404 の場合でもタイトル画面は
// 落ちない設計 (該当ドアが「じゅんびちゅう」表示になるだけ) — engine.js 側の
// _renderTitleDoors() / _renderStageGrid() が def 未登録を許容する。
if (window.MM) {
  window.MM.registerMode('make10', {
    label: '10づくり',
    monsterId: 'pakun',
    difficultyLabel: 'ふつう',
    // SPEC §2.2: Stage1 あわせて / Stage2 サイコ / Stage3 たくさん / Stage4 ごちそうミックス
    // Impl 2 が各ステージ設定 (数域/prefill/択数/こうぶつ設定等) をここに埋める。
    stages: [], // T0: 空 (stage select は「じゅんびちゅう」プレースホルダーを表示)
    createRound: function (stageCfg, scaffold) { return null; }, // stub
    onFoodTap: function (food, ctx) {},
    onAnswerTap: function (card, ctx) {},
    tutorialSteps: []
  });
} else {
  try { console.warn('[mode-make10] window.MM not found — registration skipped'); } catch (e) {}
}
