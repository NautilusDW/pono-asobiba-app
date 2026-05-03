# Fix3 Re-Verification

## Overall verdict
- 🟢 採用可

3 件の FAIL (#2 / #4 / #5) はすべて修正済み。CSS の追加 (PNG 移植 + sheet-on 透明化) と mode/diff 画面の縮小が実コードに反映されており、math 再計算でも iPhone landscape 390px に収まることを確認。サニティチェック (sw.js 676 / inline JS パース / saved-layout applier) もすべて通過。

---

## Criterion 4 (Bell/gear PNG)
- 🟢 PASS
- CSS rules:
  - `quizland/index.html:288-300` — `.hdr-right .ctrl-btn:nth-child(1) { background-image: url('../assets/preview-placeholders/ctrl-btn-news.png'); ... }` と `:nth-child(2) { ...ctrl-btn-settings.png... }`
  - `quizland/index.html:301-304` — `.hdr-right .ctrl-btn .icon, .hdr-right .ctrl-btn .ctrl-label { color: transparent; }`
  - `quizland/index.html:305-311` — `body.sheet-on .hdr-right .ctrl-btn { background-image: none !important; background-color: transparent !important; border-color: transparent !important; box-shadow: none !important; }`
- PNG paths resolve: ✓
  - `assets/preview-placeholders/ctrl-btn-news.png` 実在 (Glob 確認)
  - `assets/preview-placeholders/ctrl-btn-settings.png` 実在 (Glob 確認)
  - 相対パス `../assets/preview-placeholders/...` は `quizland/index.html` 起点で `assets/preview-placeholders/...` に到達 ✓
- emoji `color: transparent`: ✓ (line 301-304 で `.icon` と `.ctrl-label` 両方を transparent 化)
- `body.sheet-on` 修飾子: ✓ (line 306-311 で PNG/枠/影をすべて消し、シート絵だけが透けて見える)
- 評価コメント: 通常モード (sheet-off) では PNG が背景表示され emoji は透明、sheet-on モードではすべて消えてシート画像の手描きベル/歯車だけが見える。preview/full と完全に同じ挙動。三重表示は解消。

## Criterion 5 (なぞなぞ title)
- 🟢 PASS
- CSS rules:
  - `quizland/index.html:211-217` — `.hdr-left .title-card { background-image: url('../assets/preview-placeholders/title-card.png'); background-size: contain; ... }`
  - `quizland/index.html:218-223` — `body.sheet-on .hdr-left .title-card { background-image: none !important; background-color: transparent !important; border-color: transparent !important; box-shadow: none !important; }`
  - `quizland/index.html:224-229` — `body.sheet-on .hdr-left .title-card, body.sheet-on .hdr-left .title-card small, body.sheet-on .hdr-left .title-card span { color: transparent !important; text-shadow: none !important; }`
- title-card.png referenced: ✓ (`assets/preview-placeholders/title-card.png` 実在 Glob 確認, 相対パス OK)
- text hidden under sheet-on: ✓ (line 224-229 で title-card 親 + small + span の文字色を transparent + text-shadow も無効化)
- 評価コメント: sheet-on 中は CSS テキスト「フクロウはかせの / なぞなぞ」と茶色グラデ枠が両方消え、シート絵の手描き札だけが残る。saved-layout が `.title-card|0 { w:296, h:128 }` で寸法を揃えてくれるので位置もズレない。preview/full と同じ単一表示。

## Criterion 2 (iPhone landscape fit)
- 🟢 PASS
- 各 CSS 値の実測 (`quizland/index.html`):
  - `.mode-screen` padding: **12px** (line 710), gap: **8px** (line 711)
  - `.mode-screen-title` font-size: clamp(1rem, 3.4vw, 1.4rem) → 390px 幅で 3.4vw=13.26px なので下限 16px 採用 (line 716)
  - `.mode-screen-row` gap: **8px** (line 723), flex column
  - `.mode-screen .mode-btn` padding: **10px 18px** (line 727), border: **4px** (line 728), font-size: **1rem** = 16px (line 734), line-height: **1.25** (line 737)
  - `.mode-screen .mode-btn .mode-sub` font-size: **0.7rem** ≈ 11.2px, margin-top: **2px** (line 744-747)
  - `.diff-screen-title` font-size: clamp(0.85rem, 2.8vw, 1.1rem) → 0.85rem=13.6px (line 753), margin-top: **2px** (line 758)
  - `.diff-row` gap: **8px** (line 762)
  - `.diff-btn` min-height: **64px** ✓ target (line 769), border: **4px** (line 772), padding: 0.4em 0.5em (line 771)
- diff-btn min-height: **64px** (target 64) ✓
- Total height calculation (mode-screen flex column = title + mode-row + diff-screen-title + diff-row, 子 4 / gap 3):
  - mode-screen padding (top + bottom): 12 + 12 = **24px**
  - mode-screen-title (16px font × 1.1 line-height): **~18px**
  - mode-screen-row (2 mode-btn 縦 stack + 内部 gap 8):
    - 1 mode-btn = padding-top 10 + (1rem × 1.25 = 20) + (mode-sub 11.2 × 1 = 11.2) + margin-top 2 + padding-bottom 10 + border 4×2 = ~61px
    - 2 mode-btn + gap 8 = 61 × 2 + 8 = **~130px**
  - diff-screen-title (13.6px × 1.1 + margin-top 2): **~17px**
  - diff-row (diff-btn min-height 64 + border 4×2): **~72px**
  - mode-screen 子間 gap 8 × 3 = **24px**
  - **SUM: 24 + 18 + 130 + 17 + 72 + 24 = 285px**
- Fits 390px? ✓ (余裕 ~105px / ~27%)
- 評価コメント: implementer 報告の 268px とは少しズレる (mode-btn の高さを 50-55px と低く見積もっていたが実際は ~61px)、しかし 285px でも 390px に対して 105px の余裕があり、システム UI / notch / font auto-zoom を吸収可能。「むずかしい」 ボタンが切れて押せない問題は解消。

## Sanity checks
- sw.js 676: ✓ (`d:/AppDevelopment/pono-asobiba-app/sw.js:4` `const CACHE_VERSION = 676;`)
- inline JS parses: ✓ (`new Function(code)` チェック OK script #0 (24571 chars))
- saved-layout applier intact: ✓ (`quizland/index.html:1146-1222` の `QZ_LAYOUT_URL` / `QZ_RESIZABLE_SELECTORS` / `qzApplyOne` / `qzApplySavedLayout` / `loadSavedLayout` IIFE / `injectHiddenStyle` 全て前回 review 時と同一構造で残存)
