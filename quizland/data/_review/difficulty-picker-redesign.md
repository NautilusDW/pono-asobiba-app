# Difficulty Picker Redesign Report

## HTML changes
- `quizland/index.html` L907-919: 3 つの `.diff-btn` を再構成
  - 各ボタンに `aria-pressed="false"` 属性を追加
  - 中身を `<span class="diff-stars">★[★★]</span>` + `<span class="diff-label">かんたん|ふつう|むずかしい</span>` の 2 行構造へ
  - ラベル変更: やさしい → かんたん (★1)、ふつう (★2)、むずかしい (★3)
  - data-diff キー (`easy`/`normal`/`hard`) は不変 → JS / localStorage / buildPlaylist 互換性維持

```html
<div class="diff-row" id="diff-row">
  <button class="diff-btn" data-diff="easy" aria-pressed="false">
    <span class="diff-stars">★</span>
    <span class="diff-label">かんたん</span>
  </button>
  <button class="diff-btn" data-diff="normal" aria-pressed="false">
    <span class="diff-stars">★★</span>
    <span class="diff-label">ふつう</span>
  </button>
  <button class="diff-btn" data-diff="hard" aria-pressed="false">
    <span class="diff-stars">★★★</span>
    <span class="diff-label">むずかしい</span>
  </button>
</div>
```

## CSS changes
- `quizland/index.html` L716-771 (`.diff-row` / `.diff-btn` 周辺) を全面書き直し:
  - `.diff-row` — `gap: 16px`, `max-width: 720px`, `align-items: stretch`
  - `.diff-btn` — `min-height: 120px`, `padding: 1em 0.6em`, `border: 4px solid var(--wood-mid)`, `border-radius: 22px`, paper グラデ背景 (`linear-gradient(180deg, var(--paper), var(--paper-2))`), `display:flex; flex-direction:column` で星+ラベルを縦並び中央寄せ。立体木枠 box-shadow を強化 (`0 5px 0 var(--wood-dark), 0 8px 16px ...`)。
  - `.diff-btn .diff-stars` — `font-size: clamp(28px, 5.5vw, 44px)`、inactive 時は muted gold `#C49A2C`、letter-spacing で星間ゆとり。
  - `.diff-btn .diff-label` — `font-size: clamp(20px, 3.6vw, 28px)`、weight 900。
  - `.diff-btn.is-active` — `linear-gradient(180deg, #FBBF24, var(--primary))` で温かいオレンジ、scale 1.04、`--wood-dark` ボーダー、内側に `--hint-bg` ハイライトリング。
  - `.diff-btn.is-active .diff-stars` — `color: #FFD700` + glow text-shadow。
  - `.diff-btn.is-active .diff-label` — 白 + 木影シャドウで視認性確保。

## sw.js
- 673 → 674 (L4)

## Self-verify
- inline JS syntax: ✓ (`new Function()` で 1 ブロック parse 成功)
- ボタン高さ実測: `min-height: 120px` (＋ padding 1em 上下 で実描画は 130px 前後を想定)
- aria-pressed: ✓ on all 3 (HTML 検査で `diff-btn"[^>]*aria-pressed="false"` × 3 マッチ)
- ラベル: かんたん/ふつう/むずかしい (やさしい は `.diff-btn` 直下から削除 — mode-btn 側「やさしい」とは衝突しないコンテキスト)
- 星: ★ / ★★ / ★★★

## Notes for reviewers
- 既存 JS (`refreshDiffActive` / クリックリスナー / localStorage / `selectedDifficulty` 既定値 `'easy'`) には一切手を入れていません。`data-diff` キーが不変なので buildPlaylist の挙動は完全に同じ。
- `.diff-btn` の中身を `<span>` でラップした影響でクリックターゲットは button 全体のまま（`event.currentTarget` 経由ではなく `btn.dataset.diff` を直読みしているのでバブリングOK）。
- `.diff-row max-width` を 360px → 720px に拡張したため横幅にゆとり。`mode-screen` のフレキ縦組みコンテナ内で中央寄せされる前提。
- 色トークンは既存 CSS 変数 (`--paper`, `--paper-2`, `--wood-mid`, `--wood-dark`, `--primary`, `--hint-bg`) のみを使用。新規変数の追加なし。
- アクティブ星色は仕様の `#FFD700` を採用。inactive 星は紙地と同化しないよう `#C49A2C` の muted gold。
