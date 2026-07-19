# Phase 6 Review (Visual Regression)

## Overall verdict
- 🟢 採用可

ライブの quizland ページが「移行前と完全に同じ見た目」で描画される条件をすべて満たしています。
ソースの saved-layout.json が byte-identical で、`layoutUrl` のフリップ以外に視覚に影響する変更は一切なく、preview/full サンドボックスも完全に温存されています。

## 1. JSON byte-identity

- diff result: **identical**
- `diff quizland/saved-layout.json quizland/preview/full/saved-layout.json` → 出力なし (no differences)。
- SHA256 (Bash `sha256sum`):
  - `quizland/saved-layout.json`                  → `78c300a65f72da97cf2215fe410263e8f49a63ff6dd981fce254df6bb3ae72f9`
  - `quizland/preview/full/saved-layout.json`     → `78c300a65f72da97cf2215fe410263e8f49a63ff6dd981fce254df6bb3ae72f9`
- byte size (`wc -c`): 両方とも `4136 bytes`。
- 結論: 中身は完全な複製。同じ data → 同じ tx/ty/w/h/__hidden/__headerH → 同じ視覚出力。

## 2. layoutUrl flip

- `layoutUrl: './saved-layout.json'`        — `quizland/index.html:1179` ✓
- `ghPath: 'quizland/saved-layout.json'`    — `quizland/index.html:1182` ✓
- 説明コメント                               — `quizland/index.html:1172-1174` ✓
  ```
  /* Layout editor: append ?edit=1 to URL for visual layout editing.
     Saves to quizland/saved-layout.json via /api/gh/ proxy.
     preview/full/ remains as legacy sandbox (untouched). */
  ```
  実装者の注記どおり、init コール部はインライン `<script>` 内なので JS ブロックコメント (`/* ... */`) で記述。HTML コメントを `<script>` 内に書くのは構文上不正なので、この選択は妥当 (内容はスペックを満たす)。

## 3. Render path

mental trace (no `?edit`):
1. ブラウザが `quizland/index.html` を取得。
2. `<link rel="stylesheet" href="../common/layout/layout-shared.css">` (新規追加, `quizland/index.html:17`)。
3. `<script src="../common/layout/layout-applier.js" defer>` + `<script src="../common/layout/layout-system.js" defer>` (`quizland/index.html:18-19`)。
4. インライン `initLayoutSystem()` (`quizland/index.html:1175-1192`) が走り `LayoutSystem.init({ layoutUrl: './saved-layout.json', canvas: '#stage', editableSelectors: QZ_RESIZABLE_SELECTORS, ghPath: 'quizland/saved-layout.json' })` を呼ぶ。
5. `LayoutSystem.init` (`common/layout/layout-system.js:105-171`) が `applier.fetch('./saved-layout.json')` (`layout-applier.js:62-73`) を実行。`./saved-layout.json` は HTML が `quizland/index.html` 配下なので **`quizland/saved-layout.json`** に解決される (新パス)。
6. fetch 成功 → `window._currentLayoutData = data` → `applier.apply(data, null, applyCfg)` → `__headerH`, `__hidden`, `__texts` (.editable-text のみ), `__userboxes` (空), さらに `selectors` ごとに `w/h/tx/ty` を適用 (Phase6 implementer report と一致)。
7. `MutationObserver` が `#stage` を監視し、`renderChoices()` が動的に挿入する `.chip` / `.chip .circle` にも `applier.apply(data, canvasEl, applyCfg)` が再適用される。
8. さらに `quizland/index.html:1487-1493` でも `renderChoices()` 内から手動再適用フォールバックを呼んでいる。
9. 結果: 同じ JSON → 同じ transforms / sizes / hidden states / `--header-h` → **page LOOKS identical to before the flip**。
- visual identity: ✓

備考: 旧コードは `qzApplyOne` で `s.tx || s.ty` のときだけ transform を書き、`__hidden` は `.user-hidden` クラス + 自前 `<style>` で隠していた。新パスは `LayoutApplier` を経由するが、同じ `__hidden` を `display:none` 系で隠し、同じ tx/ty で transform を当てるので視覚は同じ。`.editable-text` クラスは quizland HTML には存在しない (implementer report §11.1 / Commit 2 で確認済) ため、`__texts` の 12 エントリは安全に no-op となり、動的問題テキストも上書きされない。

## 4. preview/full integrity

- `quizland/preview/full/index.html` 変更なし: ✓ (`git status quizland/preview/full/` → `nothing to commit`)
- `quizland/preview/full/saved-layout.json` 変更なし: ✓ (同上)
- preview/full の editor 自身の保存先は `quizland/preview/full/index.html:2345` に `const GH_LAYOUT_PATH = 'quizland/preview/full/saved-layout.json';` のまま固定 → 自分の JSON へ PUT する (legacy sandbox 継続)。

## 5. Save path correctness

- `?edit=1` の場合、`LayoutSystem.shouldEnableEditor` (`common/layout/layout-system.js:83-95`) が true を返し → `loadEditor(config)` (`layout-system.js:190-202`) が `LayoutEditor.enable(config)` を呼ぶ。
- `LayoutEditor.save` → `ghPath()` (`common/layout/layout-editor.js:176-183`) は `cfg.ghPath` を最優先で返す。今回の config では `'quizland/saved-layout.json'` なので、PUT 先は `/api/gh/repos/.../contents/quizland/saved-layout.json` (`layout-editor.js:336-347`)。
- 旧パス `quizland/preview/full/saved-layout.json` への書き込み経路は **main の editor 側には存在しない** (派生 fallback でも `cfg.ghPath` が先に当たるので `layoutUrl` 由来の derivation は使われない)。
- preview/full 側の editor は別 HTML に閉じた自前ロジックで `quizland/preview/full/saved-layout.json` を見ているので、互いに干渉しない。
- ✓

## 6. sw.js

- `sw.js:4` → `const CACHE_VERSION = 682;` ✓
- これにより既存 PWA クライアントが旧 `./preview/full/saved-layout.json` レスポンスをキャッシュから返してしまう問題は次回ロード時に解消される。

## Issues found

- (なし) — 視覚回帰の観点で阻害要因は検出されず。
- 軽微 note (修正不要):
  - HTML comment 要件を JS ブロックコメントで満たしている件 (`quizland/index.html:1172-1174`) — `<script>` 内なので構文上これが正解。implementer report で既に説明済み。
  - `quizland/saved-layout.json` は untracked (新規ファイル)。コミット時に `git add` で取り込めば OK (Phase 6 の commit ステップ)。
  - 旧 `qzSavedLayout` / `qzApplyOne` / `injectHiddenStyle` などのローカル実装は完全に撤去され、共通実装 (`common/layout/`) に一本化された。視覚出力は同じだが、`renderChoices` 後の再適用は (a) `MutationObserver` (`layout-system.js:173-183`) と (b) `quizland/index.html:1487-1493` の二系統で冗長に走る。冪等なので問題なし。
