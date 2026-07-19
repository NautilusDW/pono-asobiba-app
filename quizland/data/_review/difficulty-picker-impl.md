# Difficulty Picker Implementation Report

## Changes
- HTML (DOM markup): `quizland/index.html` L905-L911 — `#mode-screen` の中に `.diff-screen-title` (むずかしさ) と `.diff-row` (3 ボタン) を追加。 mode-btn ブロックの直後に置いた。
- CSS: `quizland/index.html` L706-L749 — `.diff-screen-title` / `.diff-row` / `.diff-btn` / `.diff-btn:active` / `.diff-btn.is-active` を追加。 wood-frame / paper-card 系トーン (`--paper` / `--wood-mid` / `--wood-dark` / `--hint-bg` / `--primary`) を使い、mode-btn と統一感を出した。
- JS:
  - L1013-L1023 — DIFF 定数を整理 (`DIFF_LEVELS` / `DIFF_MIN_LEVEL` / `DIFF_MAX_LEVEL` / `DIFF_STORAGE_KEY`) し、 localStorage から `selectedDifficulty` を起動時に復元。
  - L1557-L1578 — `refreshDiffActive()` でアクティブ状態を再描画。 `.diff-btn` クリックで `selectedDifficulty` 更新 + localStorage 保存 + 再描画。 ロード時に `refreshDiffActive()` を一度呼んで初期表示の active クラスを付与。

## DOM placement
- `#mode-screen` (背景: amber グラデーション) の中に、 既存の以下が縦に並ぶ:
  1. `.mode-screen-title` ("どっちで あそぶ？")
  2. `.mode-screen-row` (やさしい / ものしり 縦 2 ボタン — 既存)
  3. `.diff-screen-title` ("むずかしさ" — 新規)
  4. `.diff-row` (やさしい / ふつう / むずかしい 横 3 ピル — 新規)
- `.mode-screen` は `display: flex; flex-direction: column; gap: 18px;` のため、 mode 選択の真下に難易度セクションが自然に並ぶ。
- `.diff-row` は `flex-direction: row` の 3 等分。 `flex: 1 1 0` で各ボタン幅が均等。
- アクティブピルは橙 (`--primary` #F59E0B) 背景 + 木枠ダーク (`--wood-dark`) ボーダー + 黄色 inset リング (`--hint-bg`) + scale(1.04) で視覚的に強調。
- 非アクティブは紙肌色 (`--paper` #f5e9c4) + 木枠中色 (`--wood-mid`) ボーダー + ボトム 4px の擬似立体影。

## State management
- `selectedDifficulty: 'easy' | 'normal' | 'hard'`
- localStorage key: `pono_quizland_difficulty`
- Default: `'easy'` (Lv1 のみ)
- 起動時: try/catch で `localStorage.getItem` を読み、 `DIFF_LEVELS` 配列に含まれる値ならば反映。 無効値や localStorage 不可環境ではデフォルト維持。
- 保存も try/catch で囲み、 失敗してもメモリ上の選択は継続。

## buildPlaylist integration
- `DIFF_MIN_LEVEL` / `DIFF_MAX_LEVEL` を `{ easy: 1/1, normal: 2/2, hard: 3/3 }` に修正 (旧コードでは `normal.min = 1` というバグがあり、 normal 選択時に Lv1+Lv2 が混ざっていた)。
- buildPlaylist は変更不要。 既に L1191-L1192 で `DIFF_MIN_LEVEL[selectedDifficulty]` / `DIFF_MAX_LEVEL[selectedDifficulty]` を読んで level filter している。
- 結果として:
  - やさしい → pool = level === 1 (56 問から TOTAL_Q=5 を抽選)
  - ふつう  → pool = level === 2 (56 問から TOTAL_Q=5 を抽選)
  - むずかしい → pool = level === 3 (56 問から TOTAL_Q=5 を抽選)

## sw.js
- `CACHE_VERSION = 672 → 673`

## Self-verify
- inline JS syntax: ✓ (`new Function(joinedScripts)` で OK、 21182 文字, 1 ブロック)
- difficulty 定数の整合性: ✓ (`min === max` で各レベルだけ抽出される)
- localStorage 保存/復元: ✓ (try/catch でガード、 `DIFF_LEVELS` で値検証)
- アクティブクラス更新: ✓ (`refreshDiffActive` がロード時 + 各クリック時に呼ばれ、 `aria-pressed` も同期)
- mode タップ時の挙動: ✓ (mode-btn ハンドラは `selectedDifficulty` を一切 reset せず、 ユーザが選んだ難易度のまま `initGame()` → `buildPlaylist()`)
- Reachable questions: 56 (Lv1) / 56 (Lv2) / 56 (Lv3) — total 168 ✓ across 3 sessions (難易度を切り替えれば全カテゴリ・全レベルにアクセス可能)

## Notes for reviewers
- **重点 1: 既存バグ fix の妥当性** — 旧 `DIFF_MIN_LEVEL = { easy: 1, normal: 1, hard: 3 }` は normal で Lv1-Lv2 を混ぜていた。 仕様 ("ふつう = Lv2 のみ") に合わせて `normal: 2` へ修正。 これが意図した修正かレビューしてほしい。
- **重点 2: 視覚デザイン** — preview/full に難易度ピッカーは無いため、 既存の wood/paper トークン (`--paper`, `--wood-mid`, `--wood-dark`, `--primary`, `--hint-bg`) を組み合わせて自前デザイン。 ピル形状・色味が他画面 (paper-card) と整合しているか目視確認推奨。
- **重点 3: ラベルの曖昧さ** — `mode-btn` の inspire ボタンも "やさしい" 表記、 `diff-btn` にも "やさしい" がある。 同一画面に "やさしい" が 2 箇所登場する点が UX 的に許容範囲か要確認。 (mode は 3-4 歳向けカテゴリ、 diff は問題レベル、 という別軸の概念)
- **重点 4: hud-back-btn / result-cat-btn の戻り** — どちらも mode-screen に戻るが、 `selectedDifficulty` は維持される (localStorage に保存済み・メモリも保持)。 戻ったときに pill のアクティブ状態は表示済みのまま (hidden から show するだけなので class は保持)。 仕様通り。
- **重点 5: a11y** — `aria-pressed` を toggle group 風に切替えているが、 厳密には `role="radiogroup"` + `role="radio"` のほうが意味的に正確。 子供向けタッチ UI のため過度な ARIA は省略している。
