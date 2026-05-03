# Difficulty Picker Redesign Review 2: Functional

## Overall verdict
- 🟢 採用可

機能面のリグレッションなし。`data-diff` キー、localStorage、`refreshDiffActive`、`buildPlaylist` 連携、CACHE_VERSION バンプ、inline JS syntax、すべて確認済み。HTML/CSS の差し替えのみで JS 側は完全に未変更。

## data-diff preserved
- easy:   ✓ L933 `<button class="diff-btn" data-diff="easy" aria-pressed="false">`
- normal: ✓ L937 `<button class="diff-btn" data-diff="normal" aria-pressed="false">`
- hard:   ✓ L941 `<button class="diff-btn" data-diff="hard" aria-pressed="false">`
- 3 ボタンの順序 (easy → normal → hard) も維持。

## localStorage
- key:     ✓ `DIFF_STORAGE_KEY = 'pono_quizland_difficulty'` (L1051) — 不変
- save:    ✓ `localStorage.setItem(DIFF_STORAGE_KEY, d)` (L1608) — 不変
- restore: ✓ `localStorage.getItem(DIFF_STORAGE_KEY)` + `DIFF_LEVELS.indexOf(_saved) !== -1` (L1054-1055) — 不変
- 既定値 `selectedDifficulty = 'easy'` (L1052) も不変。

## refreshDiffActive
- is-active:   ✓ L1595 `b.classList.add('is-active')` / L1598 `b.classList.remove('is-active')`
- aria-pressed: ✓ L1596 `b.setAttribute('aria-pressed', 'true')` / L1599 `b.setAttribute('aria-pressed', 'false')`
- `b.dataset.diff === selectedDifficulty` 判定 (L1594) — 新 HTML の `data-diff` 属性と一致するので動作互換。
- 初期化呼び出し L1612 `refreshDiffActive();` 維持。

## buildPlaylist
- selectedDifficulty integration: ✓ L1225 `const minLv = DIFF_MIN_LEVEL[selectedDifficulty]` / L1226 `const maxLv = DIFF_MAX_LEVEL[selectedDifficulty]` — 不変
- `pool.filter(q => q.level >= minLv && q.level <= maxLv)` (L1232) — 不変
- pool size verification (per difficulty) — `quizland/data/questions.js` を node でカウント:
  - level:1 (easy)   → **57 問**
  - level:2 (normal) → **56 問**
  - level:3 (hard)   → **56 問**
  - **total: 169 問** (報告書の "168 問" とは +1 のずれ — 差分ではなく実データのオフバイワン誤記の可能性。今回の HTML/CSS 差分とは無関係)
- 各難易度に十分な問題数 (各 56+) があり、TOTAL_Q (= ALL_CATS で perCat 配分) に対して poll exhaustion なし。

## CACHE_VERSION
- 673 → 674: ✓ `sw.js` L4 `const CACHE_VERSION = 674;` 確認

## Inline JS syntax
- ✓ `new Function()` で 1 inline `<script>` block (21,157 chars) の parse 成功 / 0 errors
- 計測コマンド: `const re = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi` でマッチ後、本文を `new Function(body)` に流して例外なし。

## Collateral changes
- mode-btn: untouched? ✓
  - `.mode-screen .mode-btn` の CSS (L682-704) は redesign 範囲外で不変
  - `<button class="mode-btn" data-mode="inspire">` 😊 やさしい (L922-924) / `data-mode="know"` 💡 ものしり (L926-928) — テキスト・属性とも不変
  - `document.querySelectorAll('.mode-btn').forEach(...)` (L1574) のクリックリスナーも不変
- game logic: untouched? ✓
  - `buildPlaylist` (L1222-1236), `loadQuestion`/render 系、`shuffle`、`HUD`/`result-overlay` ハンドラーすべて不変
  - クリックハンドラー L1603-1611 (`btn.dataset.diff` 直読みでバブリング不要) は新しい `<span class="diff-stars">`/`<span class="diff-label">` 子要素にも互換 — `event.currentTarget` ではなく `btn` を直接参照しているため、子要素クリックでも正しく親 button が拾われる。
- orphan references: なし
  - 残存セレクタ `.diff-row` / `.diff-btn` / `.diff-btn.is-active` は CSS と HTML 両方で対応
  - 新規追加セレクタ `.diff-btn .diff-stars` / `.diff-btn .diff-label` も HTML 側に対応する `<span>` あり
  - 削除されたセレクタ・クラスなし (旧コードに `.diff-stars`/`.diff-label` は存在しなかったため orphan も生じない)

## Issues
- なし (採用可)
- 軽微 note: 報告書の "168 問" は実カウント 169 問とずれているが、今回の差分には影響しない (data ファイル無変更)。次回 questions.js を編集する際に確認推奨。
