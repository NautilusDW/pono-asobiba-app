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

### 🖼 イラスト独立スケール (sw v939 〜)

`.userbox-with-bg` (= bgImage 付き userbox) の **イラストだけ**を、 装飾フレーム (`.zk-frame`) のサイズはそのままに縮小できる。 「フレームから動物が食み出している」 ような時に有効。

- CSS: `.userbox.userbox-with-bg { background-size: var(--zk-art-size, contain); }` — デフォルト `contain` で従来挙動を維持、 percentage 指定で縮小する。
- 永続化: `el.dataset.artScale` (30〜100 の数字文字列) + `collectUserboxes` / `restoreUserboxes` wrap で saved-layout JSON に `artScale` を保存／復元。
- ツールバー UI: `#zk-art-scale-input` (range 30-100, step 5) と `#zk-art-scale-val` (現在値) を `🎯 自動割当` ボタンの直後に静的 HTML で配置。 300ms ポーリングで選択中 userbox を追従し、 enable/disable + value を同期。 `input` イベントでリアルタイム反映、 `change` で `saveResizeState()`。
- 🎯 自動割当 / dropdown 経由で `applyFrame(el, kind)` が走った時、 該当 userbox に `dataset.artScale` がまだ無くかつ `.userbox-with-bg` なら、 kind 別デフォルトを自動セット: `card-square` 70%、 `rabbit-portrait` 80%、 `animal-banner` 90% (`text-underline` はテキスト用なのでスキップ)。 既に手動設定済みなら尊重 (上書きしない)。

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

---

## 調査画面エディター 追加ツールバー (2026-05-11, sw v940)

`zukan/preview/investigation/index.html` に **ページ固有 fixed 浮動ツールバー** (`.zk-inv-toolbar`) を直書きで追加。 layout-editor.js が動的注入する toolbar とは独立、 右上 fixed。 3 ボタン構成:

| ボタン | 機能 | enable 条件 |
|---|---|---|
| `📐 100%` | 選択中 1 要素の `<img>` (or `dataset.bgImage` / computed `background-image`) を `naturalWidth × naturalHeight` で probe して、 親要素の `style.width / height` を `!important` で直書き | 単一選択時のみ |
| `🔄 90°回転` | 選択中 1 要素の `dataset.rotate` を `0→90→180→270→0` 循環。 内側 `<img>` があれば CSS rule `[data-rotate] > img { transform: rotate(...) }` で回転、 無ければ `.zk-rotate-layer` 子 div を JS 注入して bg を移植して回転 (親 userbox の `style.transform=translate()` を壊さない) | 単一選択時のみ |
| `🔒 比率固定 ON/OFF` | `LayoutEditor._state.cornerHandleFreeMode` をトグル。 OFF=自由 (デフォルト、 角ハンドルでも縦横自由)、 ON=Photoshop 既定 (角=自動ロック)。 選択要素があれば `dataset.aspectLock='1'` を同期 (永続化用) | 常時 |

**横幅固定の根本原因** (= ユーザー主訴): `common/layout/layout-editor.js` 1947-1949 行の resize ハンドラで「角ハンドル + Shift OFF → aspectLock=true」 という Photoshop 既定挙動が組み込まれていた (`isCornerHandle && !shiftHeld`)。 投合のために `state.cornerHandleFreeMode` フラグを新設し、 true なら角の既定動作を「自由 / Shift で逆ロック」 に反転 できるよう改修。 `?edit=1` で起動時に free モード (=true) を初期セット、 ボタンで切替可能。 既存ページ (quizland 等) は flag デフォルト false のままなので挙動不変。

### 永続化 (collect / restore)

- `common/layout/layout-editor.js` の `collectUserboxes()` に `rotate` / `aspectLock` を任意追加 (旧 JSON と互換)
- `common/layout/layout-applier.js` の `applyUserboxes()` で読み戻し → `dataset.rotate` / `dataset.aspectLock` を焼き、 ページ JS の `window.__zk_inv_applyRotate(div)` が CSS variable と layer 挿入で見た目に反映
- 非 userbox (`.hint-panel` 等のページ既存要素) は per-selector `{w,h,tx,ty}` のみ保存される従来仕様のまま — rotate / aspectLock は「セッション内のみ」 有効 (永続化したい場合は対象要素を userbox 化する)

### CSS 設計のポイント

- 親 `.userbox` の `style.transform=translate(tx,ty)` は resize 中も毎フレーム上書きされるので、 そこに `rotate(deg)` を append すると失われる。 そこで「**内側 img の transform に rotate を持たせる**」 ことで親 transform と干渉せず、 リサイズ操作も維持される
- bg-image only の要素 (ユーザーが drop-image した userbox 等) は `<img>` が無いので `.zk-rotate-layer` 子 div を JS で動的注入 (CSS var `--zk-rotate-bg` 経由) してそこに bg を写し、 layer を rotate する
- `[data-aspect-lock="1"]::after` で右上に小さい 🔒 アイコンを出して「この要素は比率ロック対象」 を可視化
