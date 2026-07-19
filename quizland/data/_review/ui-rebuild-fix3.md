# UI Rebuild — Final 3 Fixes Report

## 3 fixes applied (one-line each)

1. **FAIL 1: Bell/gear PNG (Criterion 4)** — `quizland/index.html:288-313` に `ctrl-btn-news.png` / `ctrl-btn-settings.png` の `background-image` ルールを追加 + `.icon` / `.ctrl-label` を `color: transparent` で消し、 `body.sheet-on` では PNG も枠も全消ししてシート絵だけ見えるようにした。

2. **FAIL 2: なぞなぞ title 二重表示 (Criterion 5)** — `quizland/index.html:211-228` に `.title-card` に `title-card.png` 背景 + `body.sheet-on` 限定で `.title-card / small / span` を `color: transparent !important` に。 これでシートの手描き札と CSS テキスト + 茶色グラデ枠の三重表示が解消。

3. **FAIL 3: iPhone landscape 390px 高 (Criterion 2)** — `quizland/index.html:660-755` の mode-screen / diff-row 系を縮小:
   - `.mode-screen` padding 24→12, gap 18→8
   - `.mode-screen .mode-btn` padding 18px 24px → 10px 18px, font 1.15rem → 1rem
   - `.mode-screen-row` gap 14→8
   - `.diff-btn` **min-height 120 → 64**, padding 1em 0.6em → 0.4em 0.5em, gap 8→4
   - `.diff-btn .diff-stars` clamp(28,5.5vw,44) → clamp(20,4vw,32)
   - `.diff-btn .diff-label` clamp(20,3.6vw,28) → clamp(14,3vw,22)
   - `.diff-row` gap 16→8

## iPhone landscape 390px height recalculation

旧 reviewer 計算 (FAIL): 22 + 170 + 16 + 120 + 72 + 48 ≈ 448 > 390 → オーバーフロー

新計算 (clamp 値は 390px 幅で確定):
- mode-screen-title: clamp(1rem, 3.4vw, 1.4rem) → 3.4 * 3.9 = 13.26px だが下限 1rem = 16px → ~18px (text 1行 line-height ~1.1)
- mode-screen-row: 2 つの mode-btn (padding 10×2 + 1rem*1.25 + 0.7rem*1.0 + margin 2px ≈ 各 50-55px) + gap 8 → ~115px
- diff-screen-title: clamp(0.85rem, 2.8vw, 1.1rem) → 下限 0.85rem ≈ 13.6px → ~15px (margin-top 2px 込み)
- diff-row: **diff-btn min-height 64px** + border 4×2 = ~72px (実効 stack)
- mode-screen 親の gap 8px × 3 (4 子間) = 24px
- mode-screen 親の padding 12px × 2 = 24px

**合計: 18 + 115 + 15 + 72 + 24 + 24 = 268px**

390px landscape iPhone の高さに対して **122px の余裕** (≒ 30%強)。 安全マージン目標 30px を大きく上回るので、 別 OS のシステム UI/notch や font-size auto-zoom があっても十分収まる。

## sw.js CACHE_VERSION

675 → **676** に bump 済み (`d:/AppDevelopment/pono-asobiba-app/sw.js:4`)。

## Self-verification

- 全 PNG パス存在確認: `assets/preview-placeholders/ctrl-btn-news.png` / `ctrl-btn-settings.png` / `title-card.png` 全て disk 上に存在 ✓
- 相対パス `../assets/preview-placeholders/...` は `quizland/index.html` 起点で解決 → `assets/preview-placeholders/...` に到達 ✓
- inline JS `new Function(code)` パースチェック: OK script #0 (24571 chars) ✓
- saved-layout.json applier (line 1124-1185) は触っていない ✓
- preview/full の編集なし ✓
- questions.js 編集なし ✓
- Hiragana / 簡単な漢字保持 ✓
