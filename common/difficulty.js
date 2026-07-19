// common/difficulty.js
// MVP 5 ゲーム横断の難易度ラベル一元化 (2026-06-28 確定)
// 子供画面に年齢数字は絶対に出さない。 ラベルは「やさしい/ふつう/むずかしい」 のみ。
//
// 整合メモ:
// - admin/index.html の DIFF_LABEL = { 1: '☆ やさしい', 2: '★ ふつう', 3: '★★ むずかしい' }
//   は管理画面内部の表示用 (Lv 数値キー)。 子供画面側のラベル定義は本ファイルが正本。
// - quizland (旧) は 'かんたん/ふつう/むずかしい' を内部 DIFF_LABELS に保持しているが、
//   新ラベルは 'やさしい' に統一。 normalizeLabel() が 'かんたん' → EASY を吸収するので、
//   保存済み localStorage / 旧データとの後方互換は維持される。
// - quizland 側の refactor (DIFF_LABELS → PonoDifficulty.DIFFICULTY 参照) は次フェーズ。
//   本フェーズでは触らない (CLAUDE.md 「CRLF→LF guard」 / 「事前に既存ラベル把握」 ルール準拠)。
(function (global) {
  'use strict';

  var DIFFICULTY = {
    EASY:   { key: 'easy',   label: 'やさしい',   stars: '★',     starsFull: '★☆☆' },
    NORMAL: { key: 'normal', label: 'ふつう',     stars: '★★',    starsFull: '★★☆' },
    HARD:   { key: 'hard',   label: 'むずかしい', stars: '★★★', starsFull: '★★★' }
  };

  // ステージ番号 (1-based) → 難易度。 ゲーム別の範囲を定義
  // maze:   stage 1-3 easy / 4-5 normal / 6+ hard
  // puzzle: stage 1-5 easy / 6-12 normal / 13+ hard
  var STAGE_TO_DIFFICULTY = {
    maze:   function (n) { return n <= 3 ? DIFFICULTY.EASY   : n <= 5  ? DIFFICULTY.NORMAL : DIFFICULTY.HARD; },
    puzzle: function (n) { return n <= 5 ? DIFFICULTY.EASY   : n <= 12 ? DIFFICULTY.NORMAL : DIFFICULTY.HARD; }
  };

  // tier → 難易度 (bento リクエストモード等)
  // 2026-07-11 tier 名 'sub'→'app' リネーム (買い切り確定)。 PonoTier.getTier() の返り値がキー。
  var TIER_TO_DIFFICULTY = {
    free: DIFFICULTY.EASY,
    book: DIFFICULTY.NORMAL,
    app:  DIFFICULTY.HARD
  };

  // 表記揺れ正規化 (旧データ「かんたん」「難しい」 を新ラベルにマップ)
  function normalizeLabel(s) {
    if (!s) return null;
    var t = String(s).trim();
    if (t === 'かんたん' || t === 'やさしい' || t === '簡単' || t === 'easy')      return DIFFICULTY.EASY;
    if (t === 'ふつう'   || t === '普通'     || t === 'normal')                     return DIFFICULTY.NORMAL;
    if (t === '難しい'   || t === 'むずかしい' || t === 'hard')                     return DIFFICULTY.HARD;
    return null;
  }

  global.PonoDifficulty = {
    DIFFICULTY: DIFFICULTY,
    STAGE_TO_DIFFICULTY: STAGE_TO_DIFFICULTY,
    TIER_TO_DIFFICULTY: TIER_TO_DIFFICULTY,
    normalizeLabel: normalizeLabel,
    // ヘルパー: ゲーム別のステージ番号→ラベル変換
    forStage: function (game, stageNumber) {
      var fn = STAGE_TO_DIFFICULTY[game];
      return fn ? fn(stageNumber) : null;
    },
    // ヘルパー: tier→ラベル変換 (bento 等)
    forTier: function (tier) {
      return TIER_TO_DIFFICULTY[tier] || null;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
