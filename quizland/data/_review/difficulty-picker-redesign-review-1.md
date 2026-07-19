# Difficulty Picker Redesign Review 1: Visual

## Overall verdict
- 🟢 採用可

## Content
| check | result |
|---|---|
| ★/★★/★★★ visible | ✓ index.html L934 (★) / L938 (★★) / L942 (★★★) |
| labels (かんたん/ふつう/むずかしい) | ✓ index.html L935 (かんたん) / L939 (ふつう) / L943 (むずかしい) |
| no numbers (1/2/3) | ✓ ボタン内に 1/2/3 の出現なし (L933-944 検査) |
| no arrow above buttons | ✓ `.diff-row` の上は L931 `.diff-screen-title`「むずかしさ」のみ。矢印・↓・⬇ いずれも file 全体で 0 件 |

## Touch size
| 計測項目 | 値 | OK? |
|---|---|---|
| min-height | 120px (L725) | ✓ (≥100, 120-140 ターゲット下限ぴったり) |
| padding | 1em 0.6em (L727) | ✓ 上下 padding ~16px → 実描画 ~130-140px に |
| width | flex:1, max-width:720px / 3 列 + gap16 → 1 ボタン ~ 約 226px (L719,718,724) | ✓ 200px+ 確保 |
| line-height | 1.1 (L736), gap 8px (L739) | ✓ 星とラベルが縦に詰まりすぎない |

## Active state
- `.diff-btn.is-active` (L760-766): 背景 `linear-gradient(180deg, #FBBF24, var(--primary))` + `border-color: var(--wood-dark)` + `transform: scale(1.04)` + 内側 `--hint-bg` ハイライトリング → 非アクティブ (paper グラデ + wood-mid 枠) と明確に区別可能。
- `.diff-btn.is-active .diff-stars` (L767-770): `color: #FFD700` + glow text-shadow → 仕様の gold star 達成。
- `.diff-btn.is-active .diff-label` (L771-774): 白 + 木影シャドウで紙→オレンジ移行時のラベル可読性確保。
- 非アクティブ星色: `#C49A2C` muted gold (L746) → 仕様一致。
- 4 つの差分軸 (背景 / 枠色 / scale / 星色) で同時に切り替わるため、子供にもアクティブが瞬時に判別できる。

## Collision check
- `.mode-btn[data-mode="inspire"]` の「やさしい」ラベル: index.html L923 で残存 (未変更) → 仕様通り。
- `.diff-btn` 直下の「やさしい」: 0 件 (Grep で diff-btn 内テキストに無し)。`data-diff="easy"` のラベルは「かんたん」(L935) に置換済み。
- 画面上「やさしい」は mode-btn のみ、「かんたん」は diff-btn のみ → 同一画面内での重複・衝突なし。
- 残りの「やさしい」出現箇所は JS コメント (L1046,1057,1573) のみで非表示。

## aria-pressed
- L933 / L937 / L941 すべて `aria-pressed="false"` で初期化済み → 仕様一致。
- `refreshDiffActive` (L1592-1602) が `selectedDifficulty` (既定 'easy') と一致するボタンに `aria-pressed="true"` をセット → 初期表示時に easy が active へ昇格する。L1612 で初回呼び出し済み。
- HTML 静的状態は全 false で正しい (JS が runtime に true を 1 つだけ立てるモデル)。

## Aesthetic match
- `.mode-btn` 既存スタイル (paper-card / wood-frame / 木影 box-shadow) と同系統:
  - 共通: `border: 4px solid var(--wood-mid)` 系、`border-radius` 大きめ (mode-btn と同等の柔らかさ)、`box-shadow: 0 5px 0 var(--wood-dark), 0 8px 16px ...` の 2 段木影 (L740) → mode-btn の立体木枠と整合。
  - 背景: `linear-gradient(180deg, var(--paper), var(--paper-2))` (L730) → paper-card 系統トークンを使用。
  - アクティブ: `linear-gradient(180deg, #FBBF24, var(--primary))` (L761) → 既存 `--primary` を活用しつつ温かいオレンジ。
- カラーパレット: `--paper` `--paper-2` `--wood-mid` `--wood-dark` `--primary` `--hint-bg` のみ使用。新規変数なし。仕様一致。
- 星色: muted `#C49A2C` (inactive) / bright `#FFD700` (active) → 仕様一致。

## Layout
- `.diff-row` (L716-722): `flex-direction: row`, `gap: 16px`, `max-width: 720px`, `justify-content: center`, `align-items: stretch` → 3 ボタン等間隔・中央寄せ・同じ高さに揃う。
- `width: 100%` + `max-width: 720px` + 親 `mode-screen` の縦組みコンテナ内中央寄せ前提 → 横画面で過度に広がらない。
- L931 「むずかしさ」ラベルは変更なし (`.diff-screen-title`) で `.diff-row` の直前に配置。

## Issues
- なし (重大乖離・軽微修正どちらも検出されず)。
- 任意改善メモ (採否は実装者判断):
  - `min-height: 120px` は仕様の 120-140px の下限。子端末で更に大きくしたい場合は 128-132px 程度を検討してもよい。ただし本タスクの "at least 100px / target 120-140px" は満たしている。
  - `.diff-stars` の clamp 上限 44px / `.diff-label` の clamp 上限 28px は、720px 幅で十分大きく、視認性 OK。

## Verdict reasoning
- Content / Touch / Active / Collision / aria-pressed / Aesthetic / Layout の 7 観点すべて仕様を満たしている。
- 既存 JS (`refreshDiffActive`, click listener, localStorage, `selectedDifficulty='easy'` 既定) は不変で `data-diff` キーも維持されているため、ロジック影響ゼロ。
- 「やさしい」衝突問題は、`.diff-btn` のラベルを「かんたん」に切り替えることで根本解決済み (画面上の重複ラベル消失)。
- sw.js CACHE_VERSION 673→674 (実装者報告) も AGENTS.md の規約通り。
- 以上より採用可と判定。
