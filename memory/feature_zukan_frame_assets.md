---
name: Zukan 装飾フレーム素材 (アンティーク絵本フレーム)
description: zukan/preview/full/ エディタの userbox に重ねる装飾フレーム素材群。動物バナー/カードマス/うさぎポートレート/テキスト下線の 4 種。SVG プレースホルダー → 透過 PNG 本番素材への置き換え運用
type: feature
---

# Zukan 装飾フレーム素材

**Status:** 本番 PNG 投入完了 (2026-05-11, sw v926) — Codex GPT-Image 2 経由、 alpha_pending/16 から配置
**Type:** Feature — Asset / Visual

---

## Why

`zukan/preview/full/index.html` のエディタ上では、ユーザが自由配置するスロット (`.userbox`) はオレンジの半透明矩形として描画される (`background: rgba(255, 178, 86, ...)`)。 これだけだと最終的なビジュアル (アンティーク絵本) のイメージが掴めない。

quizland の `Fukuro_frame_001-004.png` パターン (= 「要素別の透過 PNG を background-image または overlay として乗せる」運用) に揃え、フレームを 4 種に分類して使い分ける。 bezier ワープ OFF 前提 (= フラット矩形)。

---

## 4 種類のフレーム

| kind | アスペクト比 | viewBox | 用途 | 想定枚数 |
|---|---|---|---|---|
| `animal-banner`   | 4:1   | 800×200 | 左ページ上部、動物アイコンを載せる横長バナー | 1 個 |
| `card-square`     | 1:1   | 200×200 | 左ページ下部、カードマス (グリッド)         | 6 個 (同じ src 再利用) |
| `rabbit-portrait` | ~16:21 | 320×420 | 右ページ、メインキャラクター大画像枠          | 1 個 |
| `text-underline`  | 15:2  | 600×80  | 右ページのテキスト矩形 (下線型のみ・四辺で囲わない) | 3〜4 個 (同じ src 再利用) |

viewBox は実装側の `<img class="zk-frame">` を `object-fit: fill` で当てる前提なので、 本番 PNG もこのアスペクト比に合わせる。

---

## 配置 (現状)

```
assets/zukan/frames/
├── placeholder/
│   ├── animal-banner.svg          ← 投入済
│   ├── card-square.svg            ← 投入済
│   ├── rabbit-portrait.svg        ← 投入済
│   └── text-underline.svg         ← 投入済
├── animal-banner.png              ← 投入済 (本番)
├── card-square.png                ← 投入済 (本番)
├── rabbit-portrait.png            ← 投入済 (本番)
└── text-underline.png             ← 投入済 (本番)
```

プレースホルダーは fill="none" の外枠 (薄茶 #b07a3a) + 角に小アスタリスク + 中央透過のシンプル構成。 「アンティーク風の輪郭を最小コードで」 表現したものなので、 本番素材で置き換える前提。

---

## エディタ側の利用

`zukan/preview/full/index.html` 末尾の `initZkFrameOverlay` IIFE が以下を担当:

1. **CSS**: `.zk-frame { position: absolute; inset: 0; pointer-events: none; z-index: 5; object-fit: fill; }`
2. **`createUserbox()` の wrap**: `opts.frameKind` 指定で `<img class="zk-frame">` を子要素として挿入
3. **MutationObserver**: safe-area への userbox 追加を監視し、 `dataset.frameKind` があれば自動で frame を当てる (paste / restore 経路用)
4. **`collectUserboxes` / `restoreUserboxes` の wrap**: 保存 JSON に `frameKind` を載せ、 再ロードで復元
5. **ツールバー UI** (`#zk-frame-kind` select): 選択中 userbox に対してフレーム種別を割り当て

ツールバーの 「🖼 装飾フレーム」 select で:
- `（なし）` … フレーム除去
- `動物バナー (横長)` → `animal-banner.svg`
- `カードマス (正方形)` → `card-square.svg`
- `うさぎポートレート (縦長)` → `rabbit-portrait.svg`
- `テキスト下線` → `text-underline.svg`

### 🎯 自動割当ボタン (sw v928 〜)

`#zk-frame-auto-btn` (ツールバーの 装飾フレーム select 直後) を 1 回押すと、 **全 userbox にサイズ推測でフレームを一括適用** する。

- 推測ロジック (`guessFrameKind(w, h)` 純粋関数): ratio = w/h で判定
  - `ratio >= 5.0` → `text-underline`   (7.5:1 寄り)
  - `ratio >= 2.5` → `animal-banner`    (4:1 寄り)
  - `ratio < 0.85` → `rabbit-portrait`  (縦長)
  - その他          → `card-square`     (1:1 寄り、デフォルト)
- 使い方: 全 userbox 配置後にボタンを 1 回押すだけで一括適用。 個別調整は dropdown で上書き可能。
- **既存の `dataset.frameKind` は上書きされる**ことに留意 (= 自動 → 後で一部だけ手動修正、 のフロー想定)。 ボタンを押さない限り自動推測は走らない。
- 完了後は `saveResizeState()` を呼びつつ画面下に toast 表示 (2 秒)。
- `window.guessFrameKind` として公開 (将来の他箇所からの利用に備える)。

---

## 「スロット差替画像」 input との関係

`input#img-file` は `.slot` 要素 (← 旧 grid layout 用) の `background-image` を data URL で差し替えるハンドラなので、 `.userbox` には作用しない。 frame の src 差し替えはこの input ではなく、 後段の 「本番 PNG 配置プロセス」 で行う (= 本番 PNG が `assets/zukan/frames/*.png` に置かれた時点で、 SVG パスを `.png` に書き換える)。

---

## 生成プロンプト雛形 (Codex GPT-Image 2 / Higgsfield Nano Banana Pro 兼用)

```
antique storybook frame, sepia and warm brown ink lines, ornate corners,
transparent background (RGBA), no drop shadow extending outside frame bounds,
picture book aesthetic for a Japanese children's nature encyclopedia,
hand-drawn texture, no inner art (frame only — center fully transparent),
flat front view (no perspective),
aspect ratio {{ASPECT}}, resolution short side >= 1024px, output PNG with alpha.
```

`{{ASPECT}}` の例 (使用時に具体的なアスペクト比文字列に置換すること):
- `animal-banner`: `4:1 (800x200 reference)`
- `card-square`: `1:1 (1024x1024)`
- `rabbit-portrait`: `16:21 (1024x1344)`
- `text-underline`: `15:2 (1500x200) — bottom underline only, no top/side border`

注意:
- `text-underline` のみ「下辺の装飾線 + 両端飾り」 を指示 (=「frame」 ではなく 「underline ornament」)。
- ドロップシャドウは絶対に枠の外に出さない (タイル並べ時に重なる)。
- 中央は完全透過 (アルファ 0)。

---

## 生成 → 投入運用

1. Codex / Higgsfield で 4 種を生成
2. `tmp/alpha_pending/<NN>/` に raw 投入 (回ごとに連番)
3. Claude が `assets/zukan/frames/` に最終配置 + `pngquant --quality=70-90` で最適化
4. `index.html` の `FRAME_SRC` を `.svg` → `.png` に切り替え (1 行差分)
5. `sw.js` の `CACHE_VERSION` をバンプ

---

## 関連

- 編集ファイル: `zukan/preview/full/index.html`
- プレースホルダー: `assets/zukan/frames/placeholder/*.svg`
- 関連既存パターン: `quizland/assets/Fukuro_frame_*.png` (= layout-editor 系の参考)
- 仕組み的に近い既存 feature: `memory/feature_quiz_framed_image_flag.md`
