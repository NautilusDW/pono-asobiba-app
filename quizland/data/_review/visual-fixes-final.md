# Visual Fixes Final Report

## Fixes applied

### Fix 1: --header-h
- Before: `150px`
- After: `142px`
- Line: 53
- 効果: saved-layout の `__headerH: 142px` と main 側の `--header-h` が一致し、シート画像の painted 位置と main コンテナのヘッダー実位置が aligned される

### Fix 2: sheet-on CSS UI visibility
**title-card (`.hdr-left .title-card`)**
- 旧: `body.sheet-on .hdr-left .title-card { background-image: none !important; background-color: transparent !important; border-color: transparent !important; box-shadow: none !important; }`
- 新 (lines 218-222): `border-color: transparent !important; box-shadow: none !important;` のみ
- → `background-image: url('../assets/preview-placeholders/title-card.png')` (line 213) はそのまま反映
- `color: transparent` 維持 (lines 224-229) — PNG にテキストが描画されているので CSS テキストは透明化したまま

**ctrl-btn (bell / gear)**
- 旧 (line 305-311): `body.sheet-on .hdr-right .ctrl-btn { background-image: none !important; background-color: transparent !important; border-color: transparent !important; box-shadow: none !important; }`
- 新 (lines 305-310): `border-color: transparent !important; box-shadow: none !important;` のみ
- → `.hdr-right .ctrl-btn:nth-child(1)` の `background-image: ctrl-btn-news.png` (line 290) と `:nth-child(2)` の `ctrl-btn-settings.png` (line 295) がシートモードでも表示される
- `color: transparent` 維持 (lines 301-304) — PNG が painted ラベル付きなので CSS の絵文字 🔔/⚙️ と "おしらせ"/"せってい" テキストは透明化したまま

**変更しなかったルール (重要)**
- `body.sheet-on .hdr-pill, .q-text-card, .board, .answer-tray, .chip, .slot { background-image: none; background-color: transparent; border-color: transparent; box-shadow: none; }` (lines 107-117) — 維持。pill 全体の枠と背景はシート絵に任せる方針
- `body.sheet-on .hdr-left .progress-num` (lines 118-131) — 維持
- `body.sheet-on .hdr-left .dot` (lines 136-139) — 維持

### Fix 3: audio button
- 旧 (line 1034): `<button id="question-speaker" ... aria-label="もんだいを よむ" style="display:none;">🔊</button>`
- 新: inline `style="display:none;"` を削除
- JS 側 `setupNarration` (lines 1556 付近) が `btn.style.display = (has && Narration.getMode() !== 'off') ? '' : 'none';` で動的制御するので、narration entry が無いときは隠れたまま、 ある時に表示される

### Fix 4: stage items vertical centering
**`#stage-area` (lines 379-388)**
- 追加: `align-content: center;` (line 384)
- 効果: flex-wrap:wrap の単一行 (.item-row) が wrap container 全体の縦中央に寄る

**`.item-row` (lines 390-400)**
- 追加: `align-self: center; flex: 0 0 auto;`
- コメントで意図を明示
- 効果: 親 `#stage-area` の cross-axis (vertical) で確実に center に寄り、内容物の高さ以上に伸びない

**Mental test**: 6個の strawberry (130px × 6 + gap 24px × 5 = 900px width, height 130px) を flex-wrap で並べる場合
- saved-layout 適用後の `.board { height: 503px; padding: 16px }` → 内寸 471px tall
- `#stage-area { width:100%; height:100%; flex; align-items:center; align-content:center; flex-wrap:wrap }` → 471px tall flex container
- 単一の `.item-row` (height ≒ 130px, `align-self:center`) → 縦中央 (top:170px) に配置 ✓

### Fix 5: chip text vertical centering
**HTML markup 変更 (lines 1505-1510)**
- 旧: `btn.classList.add('chip-count'); btn.textContent = String(choice);` (anonymous text node)
- 新: `<span class="chip-count-num">4</span>` を append (制御可能な子要素にする)

**CSS 追加 (lines 559-568)**
```css
.chip.chip-count { font-size: 56px; }
.chip.chip-count .chip-count-num {
  display: block;
  line-height: 1;
  padding: 0;
  margin: 0;
  text-align: center;
}
```
- 効果: descender を含む line-height 1.2 の余白を排除し、数字の line-box がチップの中央に正確に来る
- `.chip` 自身は `display:flex; flex-direction:column; align-items:center; justify-content:center` (lines 532-550, 既存) → span 子要素を中央配置

**Mental test**: 220px chip 内に 56px font, line-height:1 の数字 = 56px の line-box → top: (220-56)/2 = 82px。 完全中央 ✓

## sw.js
- 676 → 677 (line 4)

## Verification
- inline JS parses: ✓ (`new Function()` 経由で 1 ブロック確認)
- saved-layout applier intact: ✓ (lines 1182-1236 — `qzApplyOne`, `qzApplySavedLayout`, `loadSavedLayout` 完全に未修正)
- preview/full untouched: ✓ (Edit 操作対象外)
- questions.js untouched: ✓
- Hiragana / simple kanji preserved: ✓ (新規コメントは hiragana/汉字のみ、難読語なし)

## Notes for reviewer

1. **Fix 2 のリスク**: シート画像 `quizland-sheet-v1.png` が title-card / bell / gear の painted 版を**既に**含んでいる場合、CSS の PNG と二重表示になる可能性。 もしそうなら、シート画像を更新するか、 CSS 側 PNG を消すかの判断が必要 (ユーザーの screenshot で要確認)

2. **Fix 4 の `align-content: center` 追加**: flex-wrap が無効 (children が overflow しない) ケースでは効果なし。 念のため `.item-row` 側に `align-self: center` も入れて二重保険にしてある。 saved-layout の `.board { height:503px, tx:7, ty:-5 }` 適用下でも崩れないはず

3. **Fix 5 の markup 変更**: `count_total` チップが `<span.chip-count-num>` を含むようになったため、 もし他の JS / CSS で `.chip.chip-count` 直下のテキストノードを参照している箇所があれば壊れる可能性 (検索した限り無し)

4. **`color: transparent` の維持**: title-card と ctrl-btn の CSS テキスト (small/span/.icon/.ctrl-label) は PNG が painted で文字を持っているので透明化のまま維持。 もし PNG に文字が無かったら CSS 文字を表示する必要があるが、 preview/full の挙動と一致

5. **saved-layout applier の優先順**: `--header-h` は CSS で 142px に設定 + saved-layout の `__headerH` でも 142px を上書き — 同値なので副作用なし
