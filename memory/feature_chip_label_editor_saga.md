---
name: Quizland chip-label / chip-illust レイアウトエディタ編集系の v964-v973 連続修正
description: chip-label 改行 wrap 位置ズレ修正 → 「第N問」中隠蔽 + 編集機能復活 → overlay 子要素混入根絶 → JSON merge marker 解決 + 全角対応 → chip-illust wrapper化 → DOM walk テキスト抽出への変遷。 layout-editor の resize handle が target 要素の直接子として append される設計と、 contenteditable の browser 挙動差異への対処パターンが今後の必読知見
type: feature
---

# Quizland chip-label / chip-illust レイアウトエディタ編集系の v964-v973 連続修正

**Status:** Implemented (2026-05-12)
**Type:** Feature — Editor Internals / Layout System

---

## Why

quizland の 4 択選択肢ボタン (`.chip`) で発生した連鎖バグの修正記録。 v964 → v973 と同日 (2026-05-12) で 7 段階の修正が必要だった。 同じパターンの問題が他の resizable target (`emoji-display`, `.q-text-card`, `.shape-img` 等) でも起こり得るため、 根本構造を残す。

---

## 7 段階の修正履歴

### v964 — 改行 wrap 時の位置ズレ修正
**症状**: 複数行に wrap した chip だけ視覚的に位置ズレ、 `?edit=1` の dashed overlay 寸法ラベルも `288×38` 等の不自然な値。

**真因**: `.chip-label` が `display: block` で natural content height、 `.chip` の `flex column + justify-content: center` で box top y が行数依存。 saved-layout は固定 `tx/ty` を保存するので不一致。

**修正** ([quizland/index.html](../quizland/index.html)):
```css
.chip .chip-label {
  display: flex; flex: 1 1 0%; min-height: 0;
  align-items: center; justify-content: center;
  overflow: hidden;  /* box-shadow 保護のため chip でなく chip-label 側 */
}
```

### v967 — 編集機能復活 + 「第N問」 中の問題文/4 択 隠蔽
**症状 1**: v964 後、 dblclick での chip-label 編集が不能 (contenteditable の caret 不安定 + overflow:hidden で見えない)。

**修正 1** ([common/layout/layout-editor.css](../common/layout/layout-editor.css)): `body.layout-editor-on .chip-text-editing { display: block !important; overflow: visible !important; min-height: 1.2em; }`

**症状 2**: 「第N問」 プレート + kurumi 音声中に問題文/4択が visible になる。

**修正 2**: 案 C 採用 — `_qzPlateActive = (qIdx < 5)` で typewriter 中 reveal 抑止、 `hideQuestionNumberPlate` で一括 revealed 昇格。

### v968 — chip-label 編集時の overlay 子要素混入根絶
**症状**: 編集 → save → 戻ると textContent に大量 `\n` + `288×240` 寸法テキスト混入。

**真因**: `.chip-label` は `QZ_RESIZABLE_SELECTORS` 登録対象 → エディタ enable で `attachHandle()` が 8 個の `.resize-handle` div + 1 個の `.resize-size-label` を **chip-label の直接子として append**。 contenteditable 化で scope に入り、 commit の innerHTML→text 変換で `\n × 8 + "288×240"` 混入。

**修正** (4 段防御):
1. **detach/reattach**: dblclick で `:scope > .resize-handle, :scope > .resize-size-label` を退避、 commit/cancel で reattach
2. **cloneNode strip**: class 指定で overlay 除去 (defense-in-depth)
3. **tail regex sanitizer**: `/\n+\d+×\d+\s*$/g` で既存 broken データの runtime 自己治癒
4. **idempotency guard**: cancel→blur 二重 commit を `_done` flag で防止

### v970 — JSON merge marker 解決 + 全角対応 + broad strip
**症状** (再再): v968 後もユーザーから「直っていない」 報告。

**真因 (2 件)**:
1. **`quizland/saved-layout.json` に unresolved git merge marker** (`<<<<<<<`/`=======`/`>>>>>>>`) が L2270-2282 に焼き込まれており **JSON parse fail** → runtime が override 全部無視で v968 の修正は test 不可能だった
2. 既存壊れデータに **半角 `288×240` + 全角 `２８８×２４０` 混在**、 旧 tail regex (半角のみ) では取り切れない

**修正** (5 段防御に強化):
1. saved-layout.json merge marker 解決 + 4 entries の Python 直接 sanitize
2. clone strip を **broad strip** (`clone.querySelectorAll('*').forEach(remove)` + `<br>` 除外) で将来 class 追加に強く
3. **2-pass + 固定点反復** sanitizer (全角 `[0-9０-９]` + `× / x / X / *` 区切り対応)
4. `layout-system.js` に **load-time sanitizer** 新設 (`window._currentLayoutData = data` 直前)
5. 既存 v968 の 4 段防御は温存

### v971 — chip-illust (`<img>`) の個別 resize 化
**症状**: `?edit=1` で chip-with-image の illustration が個別に動かせない。

**真因**:
1. `.chip-illust { pointer-events: none }` (通常 play 用) が editor mode でも残って click/drag 不能
2. `<img>` は HTML replaced element で append された resize handle DOM が描画されない (仕様レベル)

**修正** ([quizland/index.html](../quizland/index.html) + [common/layout/layout-applier.js](../common/layout/layout-applier.js) + [common/layout/layout-editor.js](../common/layout/layout-editor.js)):
- `<img class="chip-illust">` を `<div class="chip-illust-wrap"><img class="chip-illust"></div>` に wrap
- `body.layout-editor-on .chip-illust-wrap { pointer-events: auto }` で editor mode のみ操作可
- `QZ_RESIZABLE_SELECTORS` を `.chip .chip-illust` → `.chip .chip-illust-wrap` に
- layout-applier に saved-layout key alias (旧 `.chip .chip-illust|N` fallback)

### v972 — chip-label テキスト抽出を DOM walk 化
**症状**: 編集で改行入力 → save → 戻ると 1 行に詰まって表示、 端切れ。

**真因**: v970 の broad strip (`querySelectorAll('*').remove()` で `<br>` 除外) が **contenteditable で Enter 時に browser が挿入する `<div>line2</div>`** を**中身ごと削除**。 改行 + テキストが両方消失。

**修正**: 旧 regex chain (`<\/(div|p)>` → `\n` + `<br>` → `\n` + 他タグ削除) を **再帰 DOM walk によるテキスト抽出**に置換:
```js
function _extractChipLabelText(rootClone) {
  var SKIP_CLASSES = ['resize-handle', 'resize-size-label', 'le-lock-badge', 'userbox-badge', 'userbox-del'];
  var BLOCK_TAGS = /^(DIV|P|H[1-6]|LI|UL|OL|BLOCKQUOTE)$/i;
  // text node → push value、 BR → push '\n'、 block 開始/末尾に '\n' 補完、 overlay class skip
}
```

### v973 — block 要素 leading `\n` 追加 (cross-reviewer HIGH 修正)
**症状** (v972 部分修正残り): `あ<div>い</div>` → `あい` (期待 `あ\nい`)。 iOS Safari / Shift+Enter で `<div>` ベース改行が消える。

**真因**: v972 の walk が「block 末尾だけ `\n` 追加」 になっていた。 block 要素の **開始時にも leading `\n` を補完**する必要があった。

**修正**: `walk()` の子走査ループ直前に `if (isBlock && out.length > 0 && out[out.length - 1] !== '\n') out.push('\n');` を追加 (trailing と同じ重複防止条件)。

---

## How to apply (今後の類似タスクで使える知見)

### 1. saved-layout.json の git merge marker は最初に検証する
v964→v967→v968 で 3 回連続「直したつもり」 でユーザーから「直ってない」 と言われた最大原因は **JSON が parse fail で runtime に届いていなかった** こと。
- 編集前に `node -e "JSON.parse(require('fs').readFileSync('quizland/saved-layout.json','utf8'))"` を必ず実行
- `grep -c "<<<<<<<\\|>>>>>>>\\|=======" quizland/saved-layout.json` で marker 件数を確認
- auto-commit hook + git rebase 中の paused 状態で working tree が swept up されると、 conflict marker が JSON にそのまま commit されることがある

### 2. `<img>` などの replaced element に resize handle は描画されない
- HTML 仕様レベルの制約 (`<img>` `<input>` `<br>` 等)
- 解決策: `<div>` wrapper でラップして wrapper を resize 対象にする (v971 パターン)
- saved-layout key alias で旧キー fallback すれば既存 saved-layout を破壊しない

### 3. layout-editor の resize handle は target 要素の直接子
- `attachHandle()` が `.resize-handle × 8` + `.resize-size-label` を target に append
- target が contenteditable になると scope に入る → 4 段防御 (detach/reattach + cloneNode strip + sanitizer + idempotency guard) で対処

### 4. contenteditable の改行表現は browser によって異なる
- Chrome/Edge: 主に `<br>` (execCommand 経由)、 ただし default 設定で `<div>line</div>` ラッパー挿入もあり
- Firefox: 同上
- iOS Safari: `<div>line</div>` 形式が出やすい
- Shift+Enter: 標準で `<br>` だが実装依存
- 解決策: **regex で innerHTML を剥がさず、 DOM walk で構造を保ったまま text を抽出** (v972+v973 パターン)

### 5. DOM walk の block 補完は前後両方が必要
- 末尾だけだと `あ<div>い</div>` → `あい` で失敗
- 前後両方なら `あ\nい`
- 重複防止条件 (`out.length > 0 && out[out.length - 1] !== '\n'`) で `\n` の連続を防ぐ

### 6. cancel→blur 二重 commit を `_done` flag で防ぐ
- `cancel()` 内で `el.contentEditable = 'false'` は同期 blur を起こす
- `removeEventListener('blur', commit)` の前に commit が走るので idempotency guard 必須
- `var _done = false;` をクロージャに置いて両方の冒頭で `if (_done) return; _done = true;`

### 7. 既存壊れデータの修復は runtime sanitizer + 直接書き換えの両輪
- runtime sanitizer (tail regex / 2-pass DIM_RE) で次回 save 時に自己治癒
- saved-layout.json を Python で直接書き換えて即時クリーン化
- どちらか単独だと、 反映ラグ中に「runtime は壊れたまま」 期間が残る

---

## Related

- [feature_quiz_question_reveal_sequence.md](feature_quiz_question_reveal_sequence.md) — v967 の「第N問」 中隠蔽の Sequence 設計
- [feature_quizland_per_question_layout.md](feature_quizland_per_question_layout.md) — chip whitelist + `@qid` suffix + 旧 `|0` fallback
- [reference_layout_system.md](reference_layout_system.md) — `common/layout/` 全体の WYSIWYG エディタ + applier
- [feedback_orchestrator_mode_strict.md](feedback_orchestrator_mode_strict.md) — git/破壊的操作も含めて例外なくエージェント経由 (v968→v970 で auto-commit + rebase loop で痛い目を見た教訓)
