# Layout System (`common/layout/`)

ページごとに WYSIWYG なレイアウト編集 + 保存済みレイアウトの再現を、
`<script>` 1 本 + 4 行の `init()` で導入できる共通モジュールです。

> 設計の詳細・背景は [`quizland/data/_review/layout-system-architecture.md`](../../quizland/data/_review/layout-system-architecture.md) を参照。

---

## 1. What is this?

- **Applier**: `saved-layout.json` を読み込み、各要素の `w / h / tx / ty` と `__headerH` `__hidden` `__texts` `__userboxes` を再現する render-only モジュール。常に読み込まれます。
- **Editor**: `?edit=1` を URL に付けたときだけ遅延ロードされる完全な WYSIWYG エディタ。ドラッグ・リサイズ・整列・比較表示・undo/redo・GitHub PUT 保存などを提供します。
- **Legacy sandbox**: `quizland/preview/full/` は従来どおり残しています (リファレンス用)。新規ページはこの README の手順に従って `common/layout/` を opt-in してください。

設計目標は **「編集モードと再生モードで完全に同じ DOM/CSS を共有する」** ことなので、エディタで触ったものはそのままゲームに反映されます。

---

## 2. Quick start (5 steps)

### Step 1. 共通 CSS をリンク

```html
<link rel="stylesheet" href="../common/layout/layout-shared.css">
```

### Step 2. システムスクリプトをロード

```html
<script src="../common/layout/layout-system.js" defer></script>
```

### Step 3. 安定したセレクタを持つ canvas root を用意

```html
<div id="stage">
  <div class="title-pill">タイトル</div>
  <button class="menu-button">メニュー</button>
  ...
</div>
```

### Step 4. `LayoutSystem.init()` を呼ぶ

```html
<script>
  function bootLayout() {
    if (!window.LayoutSystem) { setTimeout(bootLayout, 0); return; }
    window.LayoutSystem.init({
      layoutUrl: './saved-layout.json',
      canvas: '#stage',
      editableSelectors: [
        ['.title-pill',   'wh', 'タイトル'],
        ['.menu-button',  'wh', 'メニュー'],
        ['.character',    'wh', 'キャラクター'],
        // ... さらに必要な要素
      ],
      ghPath: 'mypage/saved-layout.json',
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootLayout, { once: true });
  } else { bootLayout(); }
</script>
```

### Step 5. (任意) 空の `saved-layout.json` を置く

```bash
echo "{}" > mypage/saved-layout.json
```

ファイルが無くても applier は warning を出すだけで安全に通ります。
最初の `?edit=1` での保存時に自動で作成しても OK。

---

## 3. `editableSelectors` の書き方

タプル `[selector, axes, label]` の配列です。

| フィールド | 型 | 内容 |
|---------|----|------|
| `selector` | `string` | 標準的な CSS セレクタ。canvas root 内を querySelectorAll で検索 |
| `axes` | `'w' \| 'h' \| 'wh'` | リサイズハンドルが許可する軸 (再生モードでは無視) |
| `label` | `string` | エディタの要素一覧パネルやサイズラベルに表示される名前 (ひらがな推奨) |

### 複数マッチの扱い

セレクタに複数の要素がマッチする場合、`saved-layout.json` の中では `selector|0`, `selector|1`, ... のサフィックスで区別されます。
`LayoutApplier.apply()` も同じ規約で順番に適用します。

```js
['.chip', 'wh', '回答チップ']
// → saved-layout.json では .chip|0, .chip|1, .chip|2 ...
```

### プレーン文字列でも可

ラベル無しで applier-only に使う場合は `'selector'` 単独でも受け付けます (エディタで使うときは tuple 推奨)。

---

## 4. `saved-layout.json` のフォーマット

詳細は architecture doc §5 を参照。最低限おさえる構造は以下:

```json
{
  ".title-pill|0":   { "w": "120px", "h": "40px", "tx": 4, "ty": -2 },
  ".menu-button|0":  { "w": "80px",  "h": "80px" },
  "__headerH":       "142px",
  "__hidden":        [".obsolete-thing|0"],
  "__texts":         { "div#stage>p.editable-text:nth-of-type(1)": "あいうえお" },
  "__userboxes":     [{ "id": "ub1", "label": "ヒント領域", "left": "12px", "top": "200px", "w": "180px", "h": "60px" }],
  "__version":       "1.0.0",
  "__locked":        [".chip|0"],
  "__zoom":          1.0,
  "__comparison":    { "mode": "overlay", "opacity": 0.5 },
  "__grid":          { "size": 16, "on": true }
}
```

- 個別要素キー: `<selector>|<index>` → `{w, h, tx, ty}` (どれもオプショナル)
- `__headerH`: `--header-h` CSS 変数に書き戻される
- `__hidden`: 配列。各要素は `<selector>|<index>` 形式。applier が `.user-hidden` クラスを付与
- `__texts`: `class="editable-text"` を付けた要素にだけ反映される (footgun 防止のため opt-in 必須)
- `__userboxes`: 任意の矩形プレースホルダ。座標計算用の参照領域などに
- `__version` / `__locked` / `__zoom` / `__comparison` / `__grid`: 追加メタ。古いコードは無視するので round-trip 安全

最小ファイルは `{}` で OK です。

---

## 5. Editor mode (`?edit=1`)

### 起動方法

URL に `?edit=1` を追加するだけ:

```
https://pono-asobiba-staging.ndw.workers.dev/quizland/?edit=1
```

`config.editorQueryParam` / `config.editorQueryValue` でクエリ名は変更可能。
`config.enableEditor: true` で URL 無視で常時 ON、`false` で常時 OFF にもできます。

### 切り替わる挙動

- `<body>` に `layout-editor-on` クラスが付く
- 上部にツールバーが mount される (保存・undo/redo・整列・グリッド・比較・ズーム・要素一覧 …)
- `editableSelectors` でマッチした要素はすべて `class="resizable"` + 8 ハンドル + サイズラベルを獲得
- 数値 +/- スピナーや要素一覧サイドバーも有効化

### 保存方法

| 操作 | 結果 |
|------|------|
| ツールバーの **💾 保存** ボタン | localStorage に snapshot + GitHub PUT (`/api/gh/<ghPath>`) |
| **Ctrl+S** | 同上 |

GitHub PUT は worker 側 (`src/worker.js`) の `/api/gh/` プロキシを通ります。
`config.ghPath` を明示しておくのが安全です (パス推定が曖昧なケースを防ぐため)。

### キーボードショートカット (フル)

| キー | 動作 |
|------|------|
| Ctrl+S | 保存 |
| Ctrl+Z / Ctrl+Y | Undo / Redo |
| Ctrl+D | 選択中を複製 |
| Ctrl+L | 選択中をロック / 解除 |
| Ctrl+0 / + / - | ズーム リセット / 拡大 / 縮小 |
| Ctrl + ホイール | ズーム |
| ↑ ↓ ← → | 選択中を ±1 px ナッジ |
| Shift + ↑↓←→ | ±10 px ナッジ |
| Alt + クリック (スピナー) | ±0.5 ステップ |
| Shift + クリック | 複数選択 (toggle) |
| Delete / Backspace | 選択中を `__hidden` に追加 (注釈モードでは描画削除) |
| Esc | 選択解除 / モーダル閉じる / preview mode 終了 |
| ? | ショートカットヘルプ表示 |
| (注釈モード中) m / t / r / a / l / e / v | marker / text / rect / arrow / line / eraser / select |

### 比較リファレンス画像

side-by-side / overlay / onion-skin の比較モードで使う元絵は、
`config.comparisonImage` でコミット済みパスを指定するか、
ツールバーから手元のファイルを picker で読み込めます。

---

## 6. UX features overview

| 機能 | 概要 |
|------|------|
| Touch-friendly handles | `(pointer:coarse)` 環境で 28px ヒット / 16px ビジュアル (iPad 自動適用) |
| 数値 +/- スピナー | ArrowUp/Down ±1, Shift+Arrow ±10, Alt+クリック ±0.5 |
| 整列ツールバー | left / center-h / right / top / center-v / bottom / distribute-h / distribute-v の 8 ボタン |
| 要素一覧サイドバー | クリックで選択、👁 表示切替・🔒 ロック切替 |
| 比較モード | side-by-side / overlay / onion-skin |
| Snap-to-grid | 8 / 16 / 32 px |
| Lock / Unlock | 要素ごと、Ctrl+L |
| Copy / Duplicate | Ctrl+D |
| ズーム | 25–200% スライダ、Ctrl+ホイール、Ctrl+0/+/- |
| Undo / Redo | 100 stack、Ctrl+Z / Ctrl+Y |
| 注釈モード | marker / text / rect / arrow / line / eraser、単キー切替 |

---

## 7. Advanced configuration

### 必須

| キー | 型 | 説明 |
|------|----|------|
| `layoutUrl` | `string` | `saved-layout.json` の URL (相対可) |
| `canvas` | `string \| Element` | レイアウトを適用するルート要素 (CSS セレクタまたは Element) |
| `editableSelectors` | `Array<[selector, axes, label]>` | 編集対象要素の指定 (再生モードでは selector のみ参照) |

### Applier 寄り

| キー | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `textPathRoot` | `string` | `null` | `__texts` の DOM path 起点を限定する場合に指定 |
| `hideClass` | `string` | `'user-hidden'` | `__hidden` 要素に付ける CSS クラス名 |
| `headerHVar` | `string` | `'--header-h'` | `__headerH` の書き込み先 CSS 変数名 |
| `scaleVar` | `string` | `null` | fitStage scale を CSS 変数に出すときに指定 |
| `applyOnDynamic` | `boolean` | `true` | MutationObserver で動的追加にも自動再適用するか |

### Editor 寄り

| キー | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `saveTo` | `'github' \| 'localStorage' \| 'custom'` | `'github'` | 保存先 |
| `storageKey` | `string` | `'le_layout_' + pathname` | localStorage キー |
| `ghPath` | `string` | location から推定 | GitHub PUT プロキシ (`/api/gh/<ghPath>`) のパス |
| `customSave` | `(data) => Promise` | - | 独自の保存処理を差し込みたいとき |
| `comparisonImage` | `string` | - | 比較モード用リファレンス画像 |
| `gridSize` | `number` | `0` (off) | スナップグリッドの初期サイズ (8/16/32) |
| `zoomRange` | `[min, max]` | `[0.25, 2.0]` | スライダの可動域 |
| `initialZoom` | `number` | `1.0` | 初期ズーム |
| `enableEditor` | `boolean` | (auto) | true で常時 ON / false で常時 OFF / 未指定で URL 判定 |
| `editorQueryParam` | `string` | `'edit'` | エディタ起動クエリ名 |
| `editorQueryValue` | `string` | `'1'` | エディタ起動クエリ値 |
| `pages` | `Array<{name, url, current?}>` | (built-in default list) | ツールバーの **🌐 ページ** ドロップダウンに並ぶ移動先。詳細は §7.5 |

### コールバック

| キー | 引数 | 説明 |
|------|------|------|
| `beforeApply` | `(data) => data?` | 適用前にデータを変換できる (return undefined で元データを使用) |
| `onReady` | `({ applier, editor, data })` | applier 適用完了 + (任意で) editor enable 完了後 |
| `onSave` | `(data, response)` | 保存成功時 |
| `onError` | `(err)` | fetch / apply / save の失敗時 |

---

### Page navigation (`🌐 ページ` button)

ツールバーの **🌐 ページ** ボタンを押すと、編集可能な他ページへジャンプできるドロップダウンが開きます。

各エントリのスキーマ:

| フィールド | 型 | 必須 | 説明 |
|---------|----|------|------|
| `name` | `string` | ✅ | ドロップダウンに表示されるラベル |
| `url` | `string` | ✅ | クリック時の遷移先 (相対 / 絶対どちらも可) |
| `current` | `boolean` | - | `true` の項目は 📍 マーク付きでリンク化されない (現在ページの目印) |

例:

```js
LayoutSystem.init({
  // ...
  pages: [
    { name: 'なぞなぞ (このページ)',  url: location.pathname + '?edit=1', current: true },
    { name: 'なぞなぞ (旧サンドボックス)', url: '/quizland/preview/full/' },
    { name: 'ずかん (ベジェ編集あり)', url: '/zukan/preview/full/' },
  ],
});
```

`pages` を渡さなかった場合は `layout-system.js` 内蔵のデフォルト一覧
(`なぞなぞ` / `なぞなぞ サンドボックス` / `ずかん`) が使われます。
明示的に `pages: []` を渡すとボタン自体を非表示にできます。

ドロップダウン外をクリックすると閉じます。Esc キーや別ボタンの操作でも閉じます。

---

## 8. Dynamic content

ページ内で実行時に DOM を生成する要素 (例: `quizland` の `.chip` を `renderChoices` で毎問描き直す) に対応するには、
`LayoutApplier.apply(data, scopeRoot)` を再描画後に明示的に呼びます。

```js
function renderChoices(question) {
  trayEl.innerHTML = '';
  question.choices.forEach(function (c) {
    var chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = c.text;
    trayEl.appendChild(chip);
  });
  // 動的描画後にレイアウトを再適用
  if (window.LayoutApplier && window._currentLayoutData) {
    window.LayoutApplier.apply(window._currentLayoutData, trayEl, {
      selectors: QZ_RESIZABLE_SELECTORS,
    });
  }
}
```

`window._currentLayoutData` には `LayoutSystem.init()` が fetch した直近のレイアウトデータがキャッシュされています。
`applyOnDynamic: true` (デフォルト) のときは MutationObserver でも自動再適用が走りますが、
明示呼び出しのほうがタイミングが確実です。

---

## 9. Migration from inline applier

旧来の構成 (`quizland/index.html` の `qzApplySavedLayout` のような ~150 行のインライン applier) からの置き換え手順:

1. インラインの `saved-layout.json` 読み込み + apply 関数を全削除
2. `<head>` に `layout-shared.css` の `<link>` を追加
3. `<body>` 末尾近くに `layout-system.js` の `<script>` を追加
4. インラインで定義していたセレクタ配列を tuple 化 (`[selector, axes, label]`)
5. `LayoutSystem.init({ layoutUrl, canvas, editableSelectors, ghPath })` を呼ぶ
6. (動的描画があれば) renderer 内で `LayoutApplier.apply(window._currentLayoutData, scopeRoot, { selectors })` を呼ぶ

quizland のコミット履歴 (Phase B / Phase 6) を参考実装として参照してください。

---

## 10. Adding to other pages (`wordmatch`, `oto`, `bento`, `maze` ...)

- 各ページが **自分専用の `saved-layout.json`** を持つ (例: `wordmatch/saved-layout.json`)
- opt-in は完全にページ単位。1 ページ追加しても他ページは無影響
- まだ opt-in していないページは従来どおり動作する (legacy sandbox 含む)

各ページで必要なのは:
1. `editableSelectors` をそのページ用に書き直す
2. `ghPath` をそのページ用に書く
3. 空の `saved-layout.json` を 1 つ置く (なくても動くが警告が出る)

---

## 11. FAQ

**Q. `?edit=1` 無しでも使える?**
A. はい。applier-only モードが常時動作するので、保存済みレイアウトはそのまま再現されます。エディタ UI は読み込まれません (lazy load なので転送量も増えません)。

**Q. `quizland/preview/full/` と `quizland/` を同時に編集できる?**
A. それぞれ別ファイル (`quizland/preview/full/saved-layout.json` と `quizland/saved-layout.json`) を編集します。architecture doc §7.1 のとおり、両方の編集を同時に走らせると GitHub の SHA precondition で衝突する可能性があるので、片方ずつ保存するのが安全です。

**Q. `saved-layout.json` がまだ無いページではどうなる?**
A. `LayoutApplier.fetch()` は 404 / network error / 不正 JSON のいずれも `null` で resolve するので、applier は noop で通り抜けます。最初の保存時に自動で `{}` ベースのファイルが作成されます。

**Q. 要素をレイアウトから削除したい (DOM からは消したくない)**
A. `__hidden` 配列に `<selector>|<index>` を追加します。エディタ上では Delete / Backspace キー、または要素一覧の 👁 トグルで操作できます。

**Q. 同じセレクタが N 個ある順序が動的に変わると?**
A. キーは `selector|0` から順に振られるので、DOM 順序が変わると割り当てがズレます。安定した順序を保つか、より具体的なセレクタに分割してください。

---

## 12. Troubleshooting

| 症状 | 確認ポイント |
|------|------------|
| エディタ UI が出ない | URL に `?edit=1` が付いているか / DevTools console に `[LayoutSystem]` warning が出ていないか / `layout-shared.css` がロードされているか |
| 保存が失敗する (`save:error`) | `src/worker.js` の `/api/gh/` プロキシが動作しているか / GitHub 認証 (PAT) が有効か / `config.ghPath` が正しいか / SHA 衝突 (=他で先に保存) なら一度ページをリロードして再保存 |
| 位置がズレる (再生モードで微妙に動く) | `--header-h` CSS 変数が `__headerH` と一致しているか / fitStage の scale が適用順を間違えていないか / `applyOnDynamic` が必要なケースで切られていないか |
| 動的に追加した要素にレイアウトが効かない | renderer の最後で `LayoutApplier.apply(window._currentLayoutData, scopeRoot, { selectors })` を呼んでいるか |
| `__texts` が反映されない | 対象要素に `class="editable-text"` が付いているか (opt-in 必須・footgun 防止) |
| Editor の DOM が play mode に残る | `body.layout-editor-on` クラスがクリアされているか / `layout-editor.css` が `body.layout-editor-on` 配下にスコープされているか |

---

## See also

- Architecture: `quizland/data/_review/layout-system-architecture.md`
- Reference implementation: `quizland/index.html` (`LayoutSystem.init` 周辺)
- Modules: `layout-system.js` / `layout-applier.js` / `layout-editor.js`
- Shared CSS: `layout-shared.css` / Editor CSS: `layout-editor.css`
