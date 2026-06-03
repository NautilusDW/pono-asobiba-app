---
name: feature-bento-tonton-kitchen-phase1
description: ポノのトントンキッチン Phase 1 (bento/kitchen.html) — SPA 3画面構造、にんじん1材料 end-to-end、既存 bento/index.html 前段として動作
metadata:
  type: project
---

# ポノのトントンキッチン Phase 1（bento/kitchen.html）

**目的**: 既存の「お弁当を詰める」だけのゲームが単調なので、前段に料理準備ミニゲーム「トントンキッチン」を追加。子供に「準備したから作れるものが増えた！」という開放感を出すことが核心。

**仕様書**: [tmp/Bento/pono_tonton_kitchen_claude_code_instructions.md](../tmp/Bento/pono_tonton_kitchen_claude_code_instructions.md)

**Why**: スクショ参考画像は「5画面の進行フロー図」であり、1画面詰め込み用ではなかった。各画面は1ステップだけにフルフォーカスさせる SPA 構造が要件。

**How to apply**: bento/kitchen.html を編集するときは必ずこの「SPA 3画面構造を維持・各画面1ステップ集中」の原則を守る。1画面に冷蔵庫＋まな板＋材料選択を同居させない。

---

## 全体フロー

`bento/kitchen.html`（自己完結 HTML + inline CSS/JS、IIFE 構成、約 3500 行、sw v429 時点）。 ユーザーが既存 `bento/index.html` を開く前にここを通る想定。

```
① 材料をえらぶ (screen-select)
   ↓ 材料カードタップ
② トントン切る (screen-chop)
   ↓ 必要回数タップ完了
③ 冷蔵庫に入れる (screen-fridge)
   ↓ 「おべんとうを つくる」ボタン
→ bento/index.html（既存）
```

ヘッダー共通の **5ステップフローチップ**:
- ① 材料をえらぶ（緑）
- ② トントン切る（オレンジ） 
- ③ 冷蔵庫に入れる（水色）
- ④ おかずを作る（ピンク・Phase 2 用に aria-disabled + tabindex=-1）
- ⑤ おべんとうにつめる（黄色・タップで bento/index.html へ）

`stepMap = { select:1, chop:2, fridge:3 }` で `setActiveStep()` 呼出。チップタップで強制画面切替可能。

---

## 画面別の構造とフォーカス要件

### ① screen-select「材料をえらぶ」
- 主役: **6枚の材料カード**（3×2 grid、レスポンシブ）
- 副: ポノ＋吹き出し「きょうは なにを じゅんびする？」
- 背景: 暖黄（`--bg-1/2/3`: #FFF7E1 → #FFD79A）
- **冷蔵庫やまな板を出さない**

### 共通ヘッダー（全画面共通）
- v391 で **5ステップフローチップ を横一列に強制 1 行化** (`.flow-chips { flex-wrap: nowrap; min-width: 0 }` + 各チップ縮小: padding 8/16→5/10、font 0.85→0.75rem、step-num 22→18px、矢印リボン 14→9px)
- ヘッダー下マージン 8→4px、grid 1.1:1.4→1.1:1.5fr に再調整して**全体を上にシフト**

### 共通: 「← もどる」ボタン (v391 で再配置)
- 各 `<section class="screen">` の **右下に absolute 配置** (`position: absolute; right: 18px; bottom: 14px; padding: 10px 18px; font 0.85rem; min-height: 44px (子供タップ確保); 白半透明 92% + 柔影; 完全 pill`)
- 各 screen に `position: relative` を追加して absolute 基準化
- **Why**: 旧 left:上の大きなボタンが「異様にデカい」とのフィードバックを受け、視認は確保しつつ控えめなトーンに

### ② screen-chop「トントン切る」
- 主役: **キッチン背景に描き込まれたまな板 + 包丁 PNG + 食材**
- 副: 横の情報パネル（コンボピル＋虹色プログレス＋ボウル＋ポノ応援吹き出し）
- 左上: 「← もどる」（chopProgress > 0 のとき確認モーダル）
- 背景: **`assets/images/bento/cooking/kitchen_bg.png`**（絵本タッチの暖色キッチン全景、`background-size: cover` + `background-position: center 70%` でまな板手前エッジを保護）。レターボックスは暖橙グラデ
- **冷蔵庫やレシピパネルを出さない**

#### chop メカニクス（v393、INGREDIENTS.chopMechanics でコード管理）

各食材の chop 設定は INGREDIENTS 配列の `chopMechanics` オブジェクトに持つ（**コード管理が確定方針**、layout-editor では設定しない）:

```js
chopMechanics: {
  startX_pct: 87,        // 包丁切り始め X (cutting-board 基準 %、右寄り)
  endX_pct:   13,        // 包丁切り終わり X (cutting-board 基準 %、左寄り)
  liftY_pct:   0,        // 持ち上げ縦位置 (knife 自身高さ %)
  chopY_pct:  50,        // 振り下ろし最下点 (knife 自身高さ %)
  maskAxis: 'right-to-left',  // 'right-to-left' / 'left-to-right' / 'top-to-bottom' / 'bottom-to-top'
  bladeTipOffsetX_pct: -12.34, // knife コンテナ中央から見た刃先 X オフセット (画像幅 %、対角配置補正)
}
```

**Why 縦位置を食材ごとに変える**: ユーザー指示で「縦位置は食材ごとに変えられる」。layout-editor の `.chopY-marker` で WYSIWYG 調整可能。

**式（v414 でモデル B に変更）**:
```
// モデル B (v414〜): t = (chopProgress - 1) / (chopCount - 1)、 startX = 最初の切り口、 endX = 最後の切り口
denom = Math.max(1, chopCount - 1)  // chopCount=1 のエッジケース対応
t = (chopProgress - 1) / denom       // 0 (1st tap) → 1 (last tap)
targetBladeX = startX_pct + (endX_pct - startX_pct) * t
compensation = -(bladeTipOffsetX_pct * knifeWidthPct / 100)
nextX (knife コンテナ中央) = targetBladeX + compensation
maskVisiblePct = (1 - t) * 100       // 同じ t で線形対応 (シンプル実装)
```

→ にんじん 5タップで刃先 X は **87% (1st) → 68.5% → 50% → 31.5% → 13% (5th)** と均等 18.5%pt 刻み。

**モデル A→B 変更経緯 (v414)**:
- 旧モデル A (v393〜v413): `t = chopProgress / chopCount` (0.2→1.0)、 startX = 包丁の初期 rest 位置、 endX = 最後の切り口、 1st cut = startX + (endX-startX)/chopCount で startX 自身は切り口ではない
- ユーザー質問「始点と終点 = 最初/最後の切り口という認識でOK?」を受けて、 直感的なモデル B に切替
- 新モデル B (v414〜): startX = **最初の切り口**、 endX = **最後の切り口**、 1st tap で刃先が startX、 N tap (=last) で endX に着地

**chopCount で食材ごとの切り方をアレンジ**:
- にんじん輪切り: chopCount=5（startX=87, endX=13 を 5 等分）
- キャベツ千切り: chopCount=15-20（同じ範囲を細かく）
- ハンバーグこね: chopCount=3（大きくこねる）
- えびフライ衣つけ: chopCount=4-6

→ `chopMechanics.chopCount` を食材ごとにコード値で設定するだけで切り方を変えられる土台ができた。

**bladeTipOffsetX_pct の意味**: knife.png は対角 -22° で blade tip が画像左寄り。`.knife` は `transform: translate(-50%, ...)` で「コンテナ中央」を `--knife-x` に置くため、画像中心 ≠ 刃先の差分を逆補正する必要がある。carrot は -12.34 を画像実測で採用（v393）。

#### chop 画面アセット配置の確定値（v391、ユーザーフィードバックを反映）
- `.cutting-board`（hit area / 透明）: `left: 45.5%; top: 80%; width: 60%; aspect-ratio: 1.18/1`（画像内のまな板実測中心、やや左寄り）
- `.knife` PNG: **`width: 70%; aspect-ratio: 240/140`（v391 で % 化、cutting-board 基準）**; `left: var(--knife-x, 68%); top: -55%; transform: translate(-50%, var(--knife-y, 0%)) rotate(0deg); transition: transform 0.18s ease-out, left 0.18s ease-out`
  - knife.png は対角 -22° の絵本タッチ → **そのままの傾きを活かす（追加 rotate なし）**
  - **v393 で `@keyframes knifeChop` 廃止、CSS 変数 + transition で動的化**。`playChopAnim()` が `style.setProperty('--knife-x', nextX + '%')` と `--knife-y` を更新するだけ。X はタップ後その位置に留まる（transition の自然な挙動）
  - 振り下ろし: `--knife-y` を `chopY_pct%` に → 180ms 後に `liftY_pct%` に戻す（setTimeout は `pendingTimers` 登録で resetBoard/showScreen で確実にキャンセル）
- `.ingredient-on-board`: `position: absolute; left: 50%; top: 42%; width: 74%; transform: translate(-50%,-50%)`（v391 で top 50→42%、width 60→74% = 1.23倍、まな板の上方寄せ）+ `ingShake` は `translate(-50%,-50%)` 基準の `calc()` シェイクでセンタリング保持
  - **v389 で `<img>` 注入化**: carrot は絵文字 `🥕` ではなく `carrot_001.png`（丸ごと葉付き、横長 3.2:1）を表示
- **v391 で「右から削れる」マスク演出を新設、v393 で `updateIngredientMask()` に汎用化（4 軸対応）**:
  - `right-to-left` / `left-to-right` / `top-to-bottom` / `bottom-to-top` の 4 方向対応（`maskAxis` で切替）
  - `mask-image: linear-gradient(...)` + `-webkit-mask-image` 併用で Safari 対応
  - visiblePct = `(1 - chopProgress/chopCount) * 100`、5タップで `100→80→60→40→20→0%` と削れ、5回目で完全消滅 → completeIngredient → fridge 遷移
  - 呼出: `onBoardTap` 内 chopProgress++ 直後、`loadIngredient` 内（DOM 変更**前**にリセット = `resetIngredientMask()`、Phase 2 で複数食材切替時の前マスク残存バグ防止）、`resetBoard()` 内（明示リセット）
  - 既存の `addCutPieceToBowl()` で `carrot_002〜011.png` をランダム小皿投入する演出と併走（マスクで本体が削れる一方、輪切りが小皿に飛ぶ）
- `.knife` 内の dead `<span>` 3 個 (blade/handle/rivets) は削除済み（PNG 化による）

#### per-ingredient レイアウトエディタ（v393 で導入）

`common/layout/editor-bootstrap.js` 統合により、`?edit=1` で WYSIWYG エディタ起動。**食材ごとに別座標**を保存可能（quizland の per-Q パターン `@qid` を `@carrot`/`@wiener` に流用）。

- 保存先: `bento/kitchen/saved-layout.json`（flat JSON、`.knife|0@carrot` 形式）
- editor 対象 (`editableSelectors`): `.app-header`, `.knife`, `.chopY-marker`（[ツール] 包丁の最下点）, `.ingredient-bbox-marker`（[ツール] 食材の位置とサイズ）, `.startX-marker`（[ツール] 包丁の切り始め X、v410 新規）, `.endX-marker`（[ツール] 包丁の切り終わり X、v410 新規）, `.bowl`, `.bowl-fill-mask`, その他調理道具系 (grill-stove-bg / grill-pan / fry-stove-bg / fry-pot / egg-glass-lid / fry-oil-mask)
- **per-ingredient 対象 (`perQuestionSelectors`、v748 で 4 要素に縮減)**: `.chopY-marker`, `.ingredient-bbox-marker`, `.startX-marker`, `.endX-marker` の **4 つのみ**（食材切替時に座標も切替）
- **共通対象 (perQuestionSelectors に含まれない editableSelectors の残り)**: `.knife` / `.bowl` / `.bowl-fill-mask` / `.app-header` / 調理道具系。 これらは saved-layout に `<sel>|0` のみ保存され、 食材を切替えても同じ値が使われる
- **`.ingredient-on-board` と `.cutting-board` は editor 対象に直接含めない**: CSS の `width:74%; aspect-ratio` 依存で editor の px 固定化と相容れない（v394 で判明した極小化バグ）+ 親要素 drag で子要素グループ追従バグ。**v398 で `.ingredient-bbox-marker` 経由で間接編集する設計を導入したが、マーカーが 4 種に増えてユーザー混乱（「赤いやつ何のため？」「人参動かない」「包丁スケールしか動かせない」）したため v399 で 3 マーカー（ingredient-bbox/startX/endX）を撤去、`.chopY-marker` のみ残す方針に**
- 代わりに **にんじん位置は INGREDIENTS の chopMechanics に `ingredientLeft_pct`/`ingredientTop_pct`/`ingredientWidth_pct` フィールド (.cutting-board 基準 %、null なら CSS デフォルト) で Claude がコード値調整**する。値変更例: 「もう少し右上」→ `ingredientLeft_pct: 55, ingredientTop_pct: 36`
- **v748 で `.knife` / `.bowl` / `.bowl-fill-mask` を共通化** (ユーザー指示「包丁とお皿は共通なものだから 1 回 1 回違ってるとおかしい」)。 v747 までは `perQuestionSelectors` に `.knife` も入っていたため、 editor で食材ごとに別位置を保存 + base fallback で読まれる二段構えだったが、 食材を追加するたび包丁/お皿/お皿マスクが食材別に分岐するのが UX 上不自然になっていた。 v748 ではこれら 3 つを perQuestionSelectors から除外し、 saved-layout の per-ingredient エントリ 11 件 (`.knife|0@<7食材>`, `.bowl|0@onion`/`@chicken_marinated`, `.bowl-fill-mask|0@onion`/`@chicken_marinated`) を全削除、 共通キー `.knife|0` (carrot 由来の調整値) / `.bowl|0` (onion 由来) / `.bowl-fill-mask|0` (chicken_marinated 由来) に昇格
- 現在の食材を取得: `window.BENTO_KITCHEN_GET_CURRENT_INGREDIENT()` + `QUIZLAND_GET_CURRENT_QID` alias で layout-editor が自動参照
- `window.__bentoState = state` で内部状態を公開
- `body.layout-editor-on` 時に `onBoardTap` を no-op 化（drag 衝突回避）
- **chopY マーカー** (`.chopY-marker`): 橙破線円 28×28、editor モード時のみ表示。layout-editor で動かすと `loadIngredient` 内の `syncChopYFromMarker()` が marker 座標（px ベース）を読んで `chopMechanics.chopY_pct` に反映
- naming: `perQuestionSelectors` という名前は quizland 由来だが汎用リネームは別 PR スコープ、コメントで「per-ingredient と読み替え」明記

**Why 既存 layout-editor の流用**: 新規 GUI を 1 から作るより、quizland で成熟済みの per-entity パターンを alias リネームで使い回す方が早く・壊れにくい。

**Why editor 対象縮減 → 4 マーカー再拡張 → 3 マーカー撤去の経緯（v394→v398→v399）**:
- v394: `.ingredient-on-board` / `.cutting-board` を editor から外した（CSS % が editor の px 固定化で潰れる + 親子追従バグ）
- v398: 「全食材動かしたい」「包丁の chop 範囲も editor で」要望を受け 4 マーカー（ingredient-bbox + startX + endX + chopY）を導入
- v399: マーカー多すぎ + 視認性不足で **ユーザーが「赤いやつ何のため？」「人参動かない」「包丁スケールしか動かせない」「マスク？それはまだつけなくていい、こんがらがってくるから」と混乱**。3 マーカー（ingredient-bbox/startX/endX）を撤去し、chopY-marker のみ残す
- **教訓**: editor の WYSIWYG UI を増やしすぎると子供向けゲームの「単純さ」を提供する側のメンタルモデルが壊れる。マーカー方式 + 既存 layout-editor のハイブリッドは UX 摩擦が大きい。代わりに **「editor は包丁本体の位置調整のみ。chop メカニクス数値（startX/endX/chopY）はコード or 専用 UI で設定」** の方向で進める

#### chop メカニクスエディタ用 マーカー（v410 で 4 種に）

| マーカー | 形・色 | 編集対象 | 反映先 | スコープ |
|---|---|---|---|---|
| `.chopY-marker` | 橙 #D86E2F dashed 円 48×48px + 中央 ⬇ アイコン | Y 位置のみ | `chopMechanics.chopY_pct` | per-ingredient |
| `.ingredient-bbox-marker` (v406 再導入) | 緑 #4CAF50 dashed rect (CSS で `width: 74%; aspect-ratio: 3.2/1` 初期値) | 位置 + サイズ | `.ingredient-on-board` の left/top/width（% で inline 上書き） | per-ingredient |
| **`.startX-marker` (v410 新規)** | 青 #2196F3 dashed 縦線 4×80px (CSS デフォルト left:87%) | X 位置のみ | `chopMechanics.startX_pct`（切り始め） | per-ingredient |
| **`.endX-marker` (v410 新規)** | 赤 #F44336 dashed 縦線 4×80px (CSS デフォルト left:13%) | X 位置のみ | `chopMechanics.endX_pct`（切り終わり） | per-ingredient |

**ingredient-bbox-marker は v398 で導入 → v399 撤去 → v406 再導入**。再導入時は v405 で学んだ `data-le-keep-position="1"` + `position: absolute !important` 二段構えを最初から適用しているので画面外消滅バグは起きない。

**applyIngredientPlacement とのレイヤリング** (loadIngredient 内の順序、v408 で seedIngredientBboxFromOnBoard 追加、v428 で applyIngredientBboxFromSavedLayout 追加):
1. `applyIngredientPlacement(ing)`: chopMechanics の `ingredientLeft/Top/Width_pct`（コード値）を `.ingredient-on-board` の inline style に反映
2. **`applyIngredientBboxFromSavedLayout(ing)`**（v428 新規、v427 パターン踏襲）: `window._currentLayoutData['.ingredient-bbox-marker|0@<id>']` の `{tx, ty, w, h}` を直読みして `.ingredient-on-board.{left, top, width}` を `%` で上書き。 entry 無し → no-op で 1. が効く。 entry あり → saved-layout 値が勝つ。 通常プレイ時 (marker `display:none`) でも動くのが鍵。
3. **`seedIngredientBboxFromOnBoard()`**（v408、逆方向）: 2. で更新された `.ingredient-on-board` の現在位置を読んで `.ingredient-bbox-marker` の inline style に書く → editor で緑矩形がにんじん本体と同じ位置に表示。 marker 編集済み (editor mode で transform / width inline 設定済み) は触らない。
4. `syncMechanicsFromMarkers(ing)` → `syncIngredientBboxFromMarker(ing)`:
   - marker 未編集 → no-op で 1. + 2. の値が効く
   - marker 編集済み → marker の `getBoundingClientRect` から inline を再上書き（editor drag のリアルタイム反映用）
5. requestAnimationFrame × 2 後に **2. + 3. + 4. 再走**（img onload 後の精度確保 + board.getBoundingClientRect が fitStage 後で安定したタイミング）
6. img.onload 時にも 2. + 3. 再走（画像寸法確定後の正確な % 算出）

これで「コード値で設定」「editor で WYSIWYG 調整 + saved-layout 直読みで通常プレイ反映」「editor drag リアルタイム同期」の 3 経路が共存可能。

**v428 真因と責務分担**:
- v408 までは ingredient → marker 方向 (`seedIngredientBboxFromOnBoard`) と marker → ingredient 方向 (`syncIngredientBboxFromMarker`) の 2 経路で双方向同期していたが、 後者は `marker.getBoundingClientRect` 依存で **marker が `display:none` の通常プレイでは早期 return**。 結果、 editor で動かして保存した緑枠位置が**初回ロード時に本体 PNG に反映されない**致命バグが残っていた (v427 と同型の症状を ingredient-bbox-marker で起こしていた)。
- v428 で **saved-layout 直読み経路** `applyIngredientBboxFromSavedLayout` を新設し marker DOM bbox 依存を排除。 これでズレた初期位置がそのまま 1st cut のマスク・刃先位置に波及する致命連鎖を遮断。

**v429 真因と修正 (3 バグ同時)**:

1. **切り口 X が saved-layout と大幅にズレるバグ (Critical)**: v427 `applyMarkerXFromSavedLayout` と v428 `applyIngredientBboxFromSavedLayout` は分母に `bRect.width` (= `getBoundingClientRect().width`、 stage `scale()` 込みの SCALED 値) を使っていた。 一方 saved-layout の `tx/ty/w` は marker の local 座標系 (UNSCALED px) で保存される。 scale != 1 の端末で式が破綻し、 carrot startX-marker.tx=-57.31 のとき:
   - 旧式 (scale=0.44, bRect.width=422): pct = 87 + 100×(-57.31+12)/422 = **76.27%**
   - 新式 (offsetWidth=960):          pct = 87 + 100×(-57.31+12)/960 = **82.28%** ← editor が表示する視覚位置と一致
   修正: 全 `applyXxxFromSavedLayout` 系で分母を `els.board.offsetWidth/offsetHeight` (layout = unscaled) に統一。 ユーザー報告「1 発目は人参より遥か右、 2 発目は緑色部分、 3 発目は真ん中」は端末 scale で startX_pct が大きく外側にズレていた結果。
2. **chopCount=5 で 1 回多く包丁が下りるバグ (High)**: `updateIngredientMask` の v414 モデル B (`t = (cut-1)/(chopCount-1)`) は cut=1 で visible 100% (1st タップで何も削れない)、 cut=5 で 0%。 最終タップで mask 即 0 → 空のまな板に `playChopAnim` Phase 2 が 200ms 後に振り下ろし発火 → 「最後の一切れになってるのに 1 回多い」報告。 修正: モデル C (`visiblePct = (1 - cut/chopCount) × 100`) に変更し 1 タップで 1/N 削れる均等リダクションへ移行 + Phase 2 setTimeout に `state.cutting` ガード追加 (完了後の振り下ろし skip)。 knife X 補間 (v414 model B) は維持: cut=1 → startX、 cut=N → endX。
3. **chopY-marker が saved-layout から駆動されていないバグ (Medium)**: `syncChopYFromMarker` も marker の `getBoundingClientRect` 依存で通常プレイ (display:none) では `markerRect.height === 0` で早期 return。 結果 `chopMechanics.chopY_pct` が JS デフォルト 50 のまま固定され、 editor で動かした橙マーカーが振り下ろし最下点に反映されない。 修正: 新関数 `applyChopYMarkerFromSavedLayout(ing)` を追加 (v427/v428 と同型パターン)。 計算は board-local UNSCALED px で:
   ```
   markerCY_local = (CSS top% / 100) × board.offsetHeight + ty + halfHeight
   knifeCY_local  = knife.offsetTop + knife.offsetHeight / 2 + (knife._ty || 0)
   chopY_pct = (markerCY_local - knifeCY_local) / knife.offsetHeight × 100
   ```
   carrot 検証 (ty=44.88, board.offsetHeight=813.6, knife.offsetHeight≈876, knife._ty=125.74): chopY_pct ≈ **41.05%** (旧デフォルト 50 から減少 → 振り下ろし最下点が上にシフトしユーザーの編集位置に追従)。

**v429 共通ルール (saved-layout 直読みの座標系):**
- 分母は必ず `els.board.offsetWidth / offsetHeight` (layout、 UNSCALED) を使う。
- `getBoundingClientRect().width/height` は stage `scale()` 込みの SCALED 値で、 saved-layout の `tx/ty/w/h` (unscaled px) と組み合わせると scale バグになる。
- 1 回でも分子と分母の座標系が混ざると scale != 1 の端末で破綻する → コードレビュー時の必須チェック項目。

#### MutationObserver でリアルタイム drag/resize 同期（v408 で導入）

**問題**: `syncIngredientBboxFromMarker` / `syncChopYFromMarker` は `loadIngredient` 初回のみ呼ばれ、editor で marker を drag/resize しても再走しないため `.ingredient-on-board` / `chopMechanics` に反映されない（ユーザー報告: 「動かしたところで何も変化がない」）。

**対策**: `init()` 末尾で各 marker の `style` 属性に MutationObserver を仕掛け、変化があれば即座に sync 関数を呼ぶ:
```js
function attachBboxMarkerObserver() {
  if (!els.ingBboxMarker) return;
  var obs = new MutationObserver(function () {
    if (state.current) syncIngredientBboxFromMarker(state.current);
  });
  obs.observe(els.ingBboxMarker, { attributes: true, attributeFilter: ['style'] });
}
// 同パターンで attachChopYMarkerObserver も新設
```

**無限ループ評価**:
- sync 関数は `.ingredient-on-board.style` / `chopMechanics` のみ書き換え、marker.style は触らない → 自己発火しない
- seed → marker.style 変更 → observer → sync (ingOnBoard 側書き換え) → 次の発火なし、単発で収束

**今後 marker を増やすときの定型パターン**: 新規 marker を作るたびに `attachXxxMarkerObserver()` を 1 関数追加して `init()` 末尾で呼ぶだけ。これで editor drag/resize がリアルタイム反映される（startX/endX-marker 追加時もこの形）。

実装:
- `body.layout-editor-on` 時のみ `display: flex`（基底 `display: none`）、通常時は完全非表示
- v402 で `body.layout-editor-on .chopY-marker { pointer-events: auto }` を追加して editor 時に drag 可能化（v401 で `.knife` に追加したパターンを反映）
- `syncChopYFromMarker(ing)` で marker の transform を読んで `chopMechanics.chopY_pct` に反映、`loadIngredient` 末尾 + `requestAnimationFrame` 2 回で再走
- 「**editor 由来 transform が無ければ no-op**」のガードで、通常プレイ時に CSS デフォルトを破壊しない設計
- editor 由来 transform 検出: `/translate\([^,]+,/.test(transform) && transform.indexOf('-50%') === -1`

**廃止済み（v399 で撤去）**: `.ingredient-bbox-marker` / `.startX-marker` / `.endX-marker`（v398 で導入したが UX 混乱の元と判明）。これらの編集対象は INGREDIENTS の `chopMechanics`（コード値）で代替管理する。

#### .knife / .chopY-marker の pointer-events トリック（v401〜v402）

通常プレイでは `.knife` と `.chopY-marker` は `pointer-events: none`（まな板タップを邪魔しないため必須）。
editor 時のみ drag できるよう、`body.layout-editor-on` で `pointer-events: auto` に上書き:
```css
body.layout-editor-on .knife { pointer-events: auto; }
body.layout-editor-on .chopY-marker { display: flex; pointer-events: auto; }
```

**Why**: v400 までは `.knife` も `.chopY-marker` も常時 `pointer-events: none` だったため、editor で resize handle は出るが本体を掴んで drag できない（ユーザー「スケールしか動かない」「橙円が見当たらない」）。editor 時のみ復活が正解。

#### [恒久ルール] CSS の `transform: translate(-50%, -50%)` 中央寄せ要素を editor 対象に含める際の注意（v403 大事故から導出）

**事故内容**: v402 で chopY-marker を見やすくする CSS 改修をしたが、ユーザーがシークレットモード + ハードリロードしても「橙円が見えない」報告。原因は `bento/kitchen/saved-layout.json` に v398 時代の editor 初期化で自動書き込まれた `.chopY-marker|0@carrot: { w:"", h:"", tx:0, ty:0 }` エントリが残存していたこと。applier がこの `tx:0/ty:0` を読んで `style.transform = "translate(0px, 0px)"` を inline で書き込み、CSS の `transform: translate(-50%, -50%)` を完全に上書き → 要素が cutting-board の左上隅に押し出されて画面外に消えていた。スクショの「0×0」サイズラベルがこの問題のシグナルだった。

**根本原因**: `common/layout/layout-editor.js` は要素を canvas に登録した瞬間（editor 初回起動時など）、現在の値で default entry を saved-layout に自動書き込む。新規要素が CSS の `transform: translate(-50%, -50%)` で中央寄せされている場合、editor の `style.transform = "translate(0,0)"` が CSS を上書きして中心がずれる。

**予防ルール**:
1. **CSS で `transform: translate(-50%, -50%)` を使う要素を新規追加して editor 対象にする時は、saved-layout.json に手動で entry が書かれていないか必ず確認**
2. 仮に書かれた場合は **entry を削除**（または `tx`/`ty` を `null` にして applier が transform 上書きしないようにする）
3. 同種バグ予兆: editor 起動時にサイズラベル「0×0」が表示される要素 → CSS layout が破壊されているシグナル
4. 別解: CSS で `transform: translate(-50%, -50%) !important` を付けて editor の上書きを禁止する手もあるが、editor 内 drag も効かなくなるので注意

#### [恒久ルール] editor と独自アニメで同じ要素の transform を奪い合わない (v419 大事故から導出)

**事故内容**: v417 で `els.knife.style.transform = 'translate(-50%, chopY%)...'` を直接代入で Y motion 復活させたが、ユーザーから「1 発目が右下に行く、editor で設定した位置と全然違う」と報告。

**根本原因**: layout-editor は `.knife` の inline `transform` プロパティ（`translate(<tx>px, <ty>px)`）に per-ingredient 位置調整を書き込む。chop アニメも同じ要素の `style.transform` を上書きしていたため、editor の位置設定が毎タップで失われる「同じプロパティに複数アクター」競合が発生。

**根本対策 (v419)**: **wrapper + inner の 2 層構造で責務分離**:
```html
<div class="knife">                     <!-- wrapper: editor が transform 制御 -->
  <div class="knife-inner"></div>       <!-- inner: chop アニメが transform 制御 -->
</div>
```
CSS transform は親→子で**自然に合成**されるので、editor 位置（wrapper.transform = `translate(tx, ty)`）+ chop アニメ（inner.transform = `translate(0, chopY%)`）が衝突なく同時表示される。

**予防ルール**:
1. **同じ DOM 要素の同じ CSS プロパティ（transform / opacity / etc）を複数アクターで書こうとしない**。editor、独自アニメ、ライブラリ、JS のいずれかでも複数が同時に書くと上書き合戦が起きる
2. 責務分離は **DOM 階層** で実現（wrapper / inner）。CSS transform は親→子で合成されるので、各層が独立した transform を持てる
3. 「editor で動かした位置」と「動的アニメ」を組み合わせる時は必ず wrapper / inner パターンを検討
4. CSS 変数で var(--x) を transform 内に置く方式（v417 で試した）も同様の問題に陥りやすい（v417 ルール参照）

#### [chop アニメの 3 フェーズ直角リニアモーション (v419 → v425 で順序逆転)]

**v425 (現行)**: 「左→下→上」に再構成。 chop メカニクスのモデルは:
- **rest pose (chopProgress=0)**: 包丁は editor で配置した「用意の構え」位置 (`.knife|0@<ing>` の tx/ty)
- **1st タップ**: rest pose → **startX (青ライン、最初の切り口)** へ横スライド → 振り下ろし → 持ち上げ
- **N-th タップ**: 前位置 → N 番目目標 X (startX→endX 線形補間) → 振り下ろし → 持ち上げ
- **last タップ**: → **endX (赤ライン、最後の切り口)** → 振り下ろし → (持ち上げ skip) → completeIngredient
- **resetBoard / 食材切替**: rest pose に戻る (LayoutApplier.apply の qid 付き再走で editor 由来 translate(tx, ty) を復元)

```
[v425]
t=0ms     ◀ wrapper を targetX へ横スライド (chopProgress=1 なら startX)
            ・ wrapper.style.transform = '' で editor 由来 translate を一旦クリア
            ・ クリア前の実 X (getBoundingClientRect) を --knife-x として書き戻し → 視覚維持
            ・ 強制 reflow 後に transition 復帰 → rAF で --knife-x を targetWrapperX へ
            ・ CSS transition: left 0.1s linear が走り横スライド成立
t=100ms   ▼ knife-inner.transform = translate(0, chopY%)  ← 真下
t=200ms   ▲ knife-inner.transform = translate(0, liftY%)  ← 真上 (cutting 中は skip)
t=300ms     完了、次タップ待ち (rest pose には戻らず target X で停止)

[v419 (旧、参考)]
t=0ms     ▼ chopY  → t=100ms ▲ liftY → t=200ms ◀ nextX (次タップ予告)
※ この順序だと 1st タップが editor 位置で振り下ろしになり、 青ライン (startX) が 2nd 切り口に
   ズレるバグ。 v425 で「現タップ目標 X」に先に横移動するモデルへ修正。
```

**実装上の罠**:
1. Phase 2 (chop down) を `state.pendingTimers` に積むと、 最終タップで completeIngredient の `clearPendingTimers()` に cancel されて「最後の切り」が見えなくなる → v425 では Phase 2 だけ pendingTimers に積まず、 cutting フラグも見ない (実際の包丁モーションは常に見せる)。 Phase 3 (lift) は pendingTimers + cutting check の両方で skip させる。
2. wrapper.style.transform をクリアする際、 何もしないと editor の translate(-289px, +45px) が突然消えて視覚的ジャンプ。 → 現在の実 X を `--knife-x` に書き戻して transform を消すと視覚位置維持。 その後 rAF で目標値を書くと transition がトリガされて自然な横スライドに見える。
3. rest pose 復帰は loadIngredient 末尾の `LayoutApplier.apply()` (qid 付き、 v420 で導入) が担う。 v425 では同じ apply 処理を `reapplyKnifeLayout()` ヘルパに抽出。

CSS transition は全て `0.1s linear`（旧 `0.18s ease-out` のベジェ風挙動を廃止）。

#### [恒久ルール] CSS 変数を transform 内に置くと transition が trigger しない（v417 大事故から導出）

**事故内容**: v414 でモデル B 変更後、ユーザーが「ゲーム画面の方で、包丁が縦に移動してない」と報告。X は動くが Y は動かない。saved-layout の chopY-marker entry 削除（v416）でも改善せず。最終的に Explore agent が真因を特定。

**根本原因**: CSS で
```css
.knife {
  transform: translate(-50%, var(--knife-y, 0%)) rotate(0deg);
  transition: transform 0.18s ease-out;
}
```
の構造で、JS から `style.setProperty('--knife-y', '50%')` で CSS 変数を更新しても、**transform プロパティ自体の文字列値は変わらない**（`var(--knife-y)` のまま）。一部のブラウザ（Chrome 119+、Safari 18+）は **CSS 変数の解決結果が変わっても transform の transition を trigger しない**挙動になっている。X は `left: var(--knife-x)` でプロパティ直接なので問題なく動いていた。

**根本対策**:
- transform 内に `var(--xxx)` を入れる構造を廃止
- 代わりに JS から `element.style.transform = 'translate(-50%, ${y}%) rotate(0deg)'` のように **transform 文字列を直接代入**
- これなら transform プロパティの値そのものが変わるので transition が確実に trigger される
- CSS 側の `transform: ... var(...)` は **fallback として残す**（inline transform クリア時の保険）

**予防ルール**:
1. CSS で `transform: ... var(--x) ...` のように **transform 内に CSS 変数を置く** 構造は避ける（transition が動かないリスク）
2. JS から動的に transform を変えたい場合は `element.style.transform = '...'` で直接代入
3. 同症状（一部のプロパティだけ animation/transition が動かない）が出たら、その値が CSS 変数経由かどうかを確認
4. 同じ要素で「X はプロパティ直接（`left`/`top` 等）、Y は transform 経由」のような構造は要注意。**プロパティ直接の方は動くが、transform 経由の方は動かない**という非対称が出やすい

#### [恒久ルール] editor 対象要素で `position: absolute` を維持するには `data-le-keep-position="1"` 必須（v405 大事故から導出）

**事故内容**: v402〜v404 で chopY-marker が editor mode に入った瞬間に消える問題を `saved-layout` の entry 削除（v403）→ debug 強化版（v404）と試行錯誤。最終的に Explore agent が `common/layout/layout-editor.css` の以下ルールを発見:
```css
body.layout-editor-on .resizable:not([data-le-keep-position]) {
  position: relative;
}
```

editor は editor 対象要素に `.resizable` クラスを付け、上記ルールで **`position: absolute` を `position: relative` に強制変換** する。これにより `left:50%; top:50%; transform: translate(-50%, -50%)` で cutting-board 中央寄せしていた `.chopY-marker` が、相対配置になって左上方向に飛び画面外消滅。CSS `display: flex !important` でも `z-index: 9999 !important` でも、要素は「描画はされている」が画面外なので見えない（ユーザーは「赤い円は通常プレイで見えるが editor mode で消える」と的確に報告）。

**根本対策（二段構え）**:
1. **HTML 側**: `data-le-keep-position="1"` 属性を付与 → editor の `position: relative` 強制を opt-out
2. **CSS 側**: `body.layout-editor-on .selector { position: absolute !important; }` で再保証

**予防ルール**:
1. editor 対象 (`editableSelectors`) に登録する要素で **CSS で `position: absolute` を使っていて、子要素の中央寄せに `left:50%; top:50%; transform: translate(-50%, -50%)` を使っているもの** には必ず `data-le-keep-position="1"` を付ける
2. 症状: editor mode で要素が「見えなくなる」「画面外に飛ぶ」→ まず `.resizable` クラス付与時の position 強制変換を疑う
3. debug 手段: CSS に `display: flex !important` + `z-index: 9999 !important` を一時的に付けて、通常プレイで見えるが editor で消えるなら → position 強制変換が真因
4. `common/layout/layout-editor.css` の selector 一覧を grep して、editor が要素に何を強制するかを事前確認できる
5. **適用事例**: v405 で `.chopY-marker`、v406 で `.ingredient-bbox-marker`、v410 で `.startX-marker`/`.endX-marker`、**v423 で `.knife` 本体**（editor mode と通常プレイで tx/ty が同じでも視覚位置がズレる症状 → position:relative vs absolute の差が真因）に適用。 editor 対象すべてに `data-le-keep-position="1"` を付ける運用ルールにすると安全

#### [恒久ルール] per-entity（qid）切替時は LayoutApplier.apply() を手動呼出し（v420 で確立）

**問題**: `LayoutSystem.init()` の MutationObserver は childList 変化のみ監視で、 attribute や JS の `window.QUIZLAND_GET_CURRENT_QID` 返り値変化は検知しない。 SPA で食材（qid 相当）を切替えただけでは applier が再走せず、 per-ingredient 値（`.knife|0@carrot` 等）が反映されない。

**対策 (v420 で導入)**: `loadIngredient(ing)` の末尾で:
```js
if (window.LayoutApplier && window._currentLayoutData) {
  window.LayoutApplier.apply(window._currentLayoutData, null, {
    selectors: [/* editableSelectors と同じリスト */],
    perQuestionSelectors: [/* perQuestionSelectors と同じリスト */],
    qid: ing.id
  });
}
```

`window._currentLayoutData` は `LayoutSystem.init()` が fetch 結果をキャッシュした layout JSON。 `qid: ing.id` を渡すことで `.knife|0@<ing.id>` の per-ingredient エントリが優先適用される。

**Why これがないと editor の per-ingredient 設定が無意味**: editor で食材ごとに別位置を保存しても、 通常プレイで食材を切替えた瞬間に直前の食材の値が残留する。 「editor の意味がない」と感じるユーザー体験になる。

**予防ルール**:
1. SPA で qid 相当の状態が変わる箇所（食材切替、問題切替、ステージ切替）には **必ず手動 `LayoutApplier.apply` を呼ぶ**
2. quizland の `loadQuestion` も同じパターンを使っている（既存実装を参照のこと）
3. `window._currentLayoutData` が undefined になっていないか init 完了を待つ

#### chop 画面のレイアウト追従性（v391 で恒久対応）
- **chop 画面内の絶対 px 配置を全廃**、全要素を `.cutting-board` 基準の `%` で記述
- 追従要素（cutting-board が動けば一緒に動く）: `.knife` / `.ingredient-on-board` / `.spark`（spark のみ局所 px 残置、エフェクト演出なので許容）/ `.empty-board-hint`
- 独立要素（cutting-board と独立、サイドパネル内）: `.bowl`
- **Why**: 「後からレイアウトを変えたり、ウィンドウサイズを横に広げても位置がズレないようにしたい」のユーザー要望に対し、cutting-board を将来動かしても子要素が全部追従する設計に統一。stage 1600×900 contain-fit (`Math.min(w/1600,h/900)`) と組み合わせて、ウィンドウサイズ変化にも完全追従

### ③ screen-fridge「冷蔵庫に入れる」
- 主役: **大きな冷蔵庫**（扉が左ヒンジで `rotateY(-92deg)` で開く演出）
- ポノ row（遅延 1.4s で表示）
- アクション: 「もういちど じゅんびする」（緑 secondary）/ 「おべんとうを つくる」（オレンジ primary）
- 下部: 「作れるおかずがふえたよ！」レシピカード群
- 背景: 水色（`--bg-fridge-1/2/3`: #E8F6FF → #9FD0EC）

---

## 重要な技術ポイント

### 材料は「消費型」ではなく「解放型」
- 一度トントンしたら `unlockedIngredients` に追加される（在庫管理しない）
- 子供に「材料がなくなったからまた作業」とストレスを与えないため

### localStorage キー
- `bentoUnlockedIngredients`: 解放済み材料の配列（Set を JSON 配列化）
- `bentoNewIngredients`: NEW! バッジ表示用の配列

### 画面切替（SPA）
- `state.currentScreen = 'select'|'chop'|'fridge'`
- `showScreen(name)` で `<section hidden>` の出し入れ、0.3s fade transition
- `state.transitioning` フラグで連打防止
- `state.pendingTimers` 配列で `completeIngredient` の遅延タイマーを管理、`resetBoard` / `showScreen` 冒頭で `clearPendingTimers()` 呼出（**chop 完了直後に「もどる」押下しても 1.4秒後に fridge へ強制ジャンプしない**）

### Phase 1 対応材料（6種、にんじんのみ end-to-end 動作）
- carrot（実装済み・5タップ）/ wiener / egg / broccoli / potato / apple（残り5種は Phase 2 で実装）
- 未実装材料は `aria-disabled + tabindex=-1 + 🔒バッジ`、タップで「じゅんびちゅう！」吹き出し

### Phase 1 で解放されるレシピ（にんじん）
- にんじんいんげん `ninjin_ingen2.png`
- きんぴらごぼう `kinpira2.png`
- ちくぜんに `chikuzenni.png`

レシピカードはアンロック前は灰色＋「🥕で ひらく」ヒント表示（needs 配列ベース）。画像 fallback は emoji プレースホルダ（🍱）。

---

## アクセシビリティ・子供向け配慮

- `.cutting-board` に `touch-action: manipulation` + `tabindex="0"` + Enter/Space ハンドラ
- `.flow-chip[aria-disabled="true"]` に `tabindex="-1"` 併用（Tab フォーカスも遮断）
- 各 `<section>` に `tabindex="-1"`、画面切替時に `section.focus({preventScroll:true})`
- `<div id="screen-announcer" aria-live="polite">` で SR 通知（例: 「ざいりょうを えらぶ がめんに なったよ」）
- 否定形回避: 「まだつくれない」→「○○を じゅんびすると つくれるよ！」
- chop 進捗あり時の「もどる」は画面内モーダルで確認（「つづける」/「やめる」、ESC/外タップで閉じる）
- `prefers-reduced-motion: reduce` で冷蔵庫扉アニメ無効化

---

## ヘッダー fixed ボタンは出さない（重要）

`.top-actions` の固定「おべんとうを つくる」ボタンは `display: none !important` で全画面非表示。理由は「各画面1ステップ集中」要件と矛盾するため。fridge 画面下部に同等ボタンが既存。HTML/JS の参照は将来復活用に温存。

---

## CACHE_VERSION（sw.js）

bento/kitchen.html を編集したら毎回 `sw.js` の `CACHE_VERSION` を +1 する MUST ルール。
- Phase 1 MVP 初版: v377
- スクショ反映 + レビュー6件: v378
- SPA リファクタ + レビュー9件: v379
- 16:9 contain-fit (1600×900 stage) + 冷蔵庫主役化: v382
- キッチン背景 PNG + 包丁 PNG 統合 + 配置補正: v387
- 包丁 4倍拡大 + 垂直振り下ろし + にんじん PNG 11枚統合: v389
- chop polish: 包丁右寄せ・% 化 + にんじん上1.23倍 + 右からマスク削れ + 5チップ1行化 + 戻る右下小型化: v391
- chop メカニクス完全連動 (startX→endX 横移動 + マスク式統一) + per-ingredient layout-editor 統合 + bladeTipOffset 補正: v393
- editor 対象縮減 (にんじん極小化 + 親子追従バグ解消、editor 4 要素のみに): v394
- knife.png 高解像度版差し替え + 圧縮 (213KB→101KB): v396
- editor マーカー 4 種 (ingredient-bbox/startX/endX/chopY) で食材位置+包丁chop範囲を WYSIWYG 化: v398
- v398 マーカー 3 種撤去 (混乱の元) + にんじん位置を chopMechanics でコード管理 (ingredientLeft/Top/Width_pct): v399
- 包丁 drag バグ (pointer-events:none) 解消 + 新 knife.png (953×1242 縦長、余白削減) + bladeTipOffsetX_pct -12.34→-39: v401
- chopY-marker 可視化 + drag 不能解消 (pointer-events:auto、48×48 + ⬇ アイコン): v402
- saved-layout.json から chopY-marker の `tx:0, ty:0` エントリを削除 (CSS の translate(-50%,-50%) 上書きで画面外に消えてた): v403
- chopY-marker editor mode で消える真因 (.resizable の position:relative 強制) を `data-le-keep-position="1"` で opt-out + 念のため CSS `position: absolute !important`: v405
- 食材の位置・サイズ editor 化: .ingredient-bbox-marker (緑 dashed rect) を v405 知見ベースで再導入 (data-le-keep-position 必須、 applyIngredientPlacement とのレイヤリング): v406
- bbox-marker 初期位置ずれ修正 (seedIngredientBboxFromOnBoard) + MutationObserver でリアルタイム drag/resize 同期 (bbox + chopY 両方): v408
- bbox 初期位置 img.onload 再 seed で disk cache miss 時もずれない: v409
- 包丁 startX/endX editor 化 (青/赤 縦線 marker、 v408 定型パターン × 2): v410
- startX/endX marker 本体 drag 可能化 (hit area 24×100px + ::before で視覚分離): v411
- marker z-index 階層化 (startX/endX 縦線を最前面 z:6 に、にんじんに重なっても確実に掴める): v412
- chop メカニクス モデル A→B 変更 (startX = 最初の切り口、endX = 最後の切り口、ユーザー直感通り): v414
- editor mode 時に画面上部 toolbar に被されてゲーム画面が見切れる問題を fitStage オフセットで解消 (v415)、 saved-layout の chopY-marker entry をリセット (v416)
- 包丁 Y 移動が動かない真因 (CSS var-in-transform で transition 不発) を style.transform 直接代入で解消: v417
- chop アニメを直角リニアモーション化 (knife wrapper + inner 2 層化、3 フェーズ「下→上→左」分割、editor 位置と chop アニメを完全分離): v419
- per-ingredient レイアウトが食材切替時に反映されない問題を解消 (loadIngredient で `LayoutApplier.apply()` を手動呼出し、 quizland の qid 切替パターンを流用): v420
- v420 動作検証用デバッグログ追加 (applierExists / dataExists / knifeStyleAfter): v421
- editor と通常プレイで .knife 位置が食い違うバグ修正 (`.knife` に `data-le-keep-position="1"` 付与 + `body.layout-editor-on .knife { position: absolute !important; }`、v405 の chopY-marker と同型バグ): v423
- chop アニメで「editor 位置 = rest pose、 青ライン (startX) = 1st 切り口」モデルへ再定義 (3 フェーズを v419 「下→上→左」から v425 「左→下→上」へ逆転、 1st タップで wrapper を rest pose → startX へ横スライドさせてから振り下ろし、 wrapper.style.transform は chop 中だけ一時クリア + rest pose 復帰は LayoutApplier.apply qid 付き再走): v425
- v425 レビュー反映: Y 軸ジャンプ修正 + 横スライド 0.18s + Phase 2 連打ガード (Critical 1: wrapper.style.transform を完全クリアせず translate(0, ty) で editor 由来 Y 成分 (ty) を保持 → 1st タップ時の垂直ジャンプ消失。 Major 2: `.knife` の left transition 0.1s→0.18s + playChopAnim の Phase 2 100ms→200ms / Phase 3 200ms→300ms にずらし子供の目に見えるテンポへ。 Major 3: Phase 2/3 setTimeout に `state.chopProgress !== chopSnapshot` ガード追加で連打時の stale callback チラつき抑止。 Major 4: loadIngredient の transition 復元を `prevKnifeTransition || ''` から空文字 (CSS Sheet 由来へ戻す) に変更。 Minor 1: v419 残コメントを v426 仕様に同期): v426
- 青/赤 marker (startX/endX) が通常プレイの chop に駆動できない致命バグを修正: 真因は `.startX-marker { display: none }` で通常プレイ時に marker bbox が無く `syncStartXFromMarker` の `getBoundingClientRect().width === 0` で早期 return、 `chopMechanics.startX_pct` が JS デフォルト 87/13 のまま固着する症状。 修正は **saved-layout から直接 tx を読む経路 `applyMarkerXFromSavedLayout(ing)` を追加** し、 `syncMechanicsFromMarkers` の冒頭で実行 (editor 時は直後の bbox 同期が更新値で上書き、 通常プレイ時はこの saved-layout 読み込みだけが効く)。 計算式 `pct = cssDefault% + 100 * (tx + 12) / boardWidth` (12 は marker width=24px の半分。 CSS `translate(-50%,-50%)` を editor の `translate(tx,ty)` が打ち消すための補正)。 これで青/赤マーカーを動かして保存 → 通常プレイ chop で包丁が saved-layout 通りの startX/endX を横移動するように: v427
- にんじん本体 (.ingredient-on-board) が緑 bbox-marker と**初期表示で**位置・サイズ不一致になり、 そのズレた位置が 1st cut のマスク・刃先位置に波及していた致命バグを修正: 真因は v427 と同型 — `.ingredient-bbox-marker { display: none }` で通常プレイ時に marker bbox が無く `syncIngredientBboxFromMarker` の `getBoundingClientRect().width === 0` で早期 return、 `.ingredient-on-board` の left/top/width は `applyIngredientPlacement` の chopMechanics 値 (55/36/74) のまま固着する症状。 v408 の `seedIngredientBboxFromOnBoard` は ingredient-on-board → marker 方向の同期で、 marker → ingredient 方向の初期同期が成立していなかった。 修正は v427 パターンを踏襲し **`applyIngredientBboxFromSavedLayout(ing)` を新設** (`bento/kitchen.html` L2655 付近)、 saved-layout の `.ingredient-bbox-marker|0@<id>` の `{tx, ty, w, h}` を直読みして `.ingredient-on-board.style.{left, top, width}` を `%` で上書き。 計算式: `centerX_pct = 50 + 100×(tx + w/2)/boardW`、 `centerY_pct = 42 + 100×(ty + h/2)/boardH`、 `widthPct = 100×w/boardW`。 CSS デフォルト 50%/42%/74% (bbox-marker の left/top/width 初期値) が基準。 `loadIngredient` 内では `applyIngredientPlacement(ing)` 直後 + img.onload 後 + rAF×2 後の 3 経路で再走。 既存の v408 `seedIngredientBboxFromOnBoard` (ingredient → marker 方向、 editor で緑枠を可視化する用途) と v408 `syncIngredientBboxFromMarker` (editor drag 中のリアルタイム逆方向同期) は責務として温存し、 初期ロード時の **saved-layout → ingredient** 経路のみ新設関数が担う。 `.ingredient-on-board` の CSS `transform: translate(-50%, -50%)` は inline 化せず温存 (v403 chopY-marker と同じ事故を避ける): **v428（現行）**
- Phase 2 MVP として grill / fry mini-game を追加し、SPA を `select | chop | grill | fry | fridge` の 5 画面へ拡張。chop の saved-layout / marker / knife 2 層構造には触れず、`cookingActions` による順次処理で `chop → grill/fry → fridge` を実現。pan/pot は CSS で描画し、raw/mid/done は `assets/images/Bento_parts/*` の完成画像を 150KB 以下の暫定 stage PNG として `assets/images/bento/cooking/<dir>/` に配置、CSS の焼き色/揚げ色 filter で段階差を出す。正式素材ができたら同名 PNG を上書きすれば resolver がそのまま採用する設計。対象は carrot / cabbage / egg / wiener / mince_patty / salmon / chicken_marinated / shrimp_breaded / korokke_raw の 9 材料、レシピは 9 種。CACHE_VERSION v442: v442
- 包丁 (`.knife`) / お皿 (`.bowl`) / お皿マスク (`.bowl-fill-mask`) を全食材共通化: `perQuestionSelectors` から 3 セレクタ削除、 saved-layout の per-ingredient エントリ 11 件削除、 共通キー `.knife|0` / `.bowl|0` / `.bowl-fill-mask|0` にそれぞれ carrot / onion / chicken_marinated の調整済み値を昇格。 chop 範囲マーカー (chopY / startX / endX) と食材本体 (`.ingredient-bbox-marker`) は食材別のまま温存。 `applyChopYMarkerFromSavedLayout` / `getSavedLayoutEntryForCurrentIngredient` の base fallback が機能するため knife rest pose は新食材でも自動で共通値を読み込む: v748
- 4 件のバグ修正 (Phase A): (a) chop 画面で carrot/cabbage/onion/chicken_marinated の食材画像がまな板に出ない真因は `loadIngredient` の `<img src="..." + ing.imageBase + ".png">` 機械結合で、 imageBase が `.webp` で終わる食材は `*.webp.png` の二重拡張子 404 になっていた。 拡張子検出 (`/\.(png|webp|jpg|jpeg|svg|avif)$/i`) で条件付き補完に変更。 (b) 温まり後ドラッグ時の指示マーカーが salmon でもお皿端っこ (egg と同位置) に出る真因は `getEggTargetPoint('rim')` の plate 選択が ingredient フィルター無しの `.prep-plate` querySelector で、 salmon でもこの関数経由で plate edge が target になっていた。 `isCurrentEggGrillAction()` ガードを追加し、 egg 以外はフライパン中央 (`els.fryPan/grillPan/cookPan` bounds) へ fallback。 (c) 殻割れスプライト (`egg-shell-left/right.png`) が「上下も左右も逆」に表示される真因は `.egg-crack-shells i:first/last-child` の `rotate(±118deg)` に対し PNG 内の絵柄向きが H/V 反対。 `transform` に `scale(-1, -1)` を追加して **rotate 符号は元 (-118/118) を温存** することで H+V 反転を達成 (rotate を反転して `scale(-1,-1)` を追加すると合成効果が `rotate(298deg) = rotate(-62deg)` 相当になり 56 度ずれるので注意、 round 1 で実装エージェントが両方適用してしまった経緯あり)。 (d) (c) の round 2 修正中に発見した dead code (L12268-L12273 の unreachable `return {x:28, y:60, rx:10, ry:7}` ブロック 6 行) を削除: v749
- Phase B: 鮭の裏面 (`salmon_001_back_raw.png` / `*_002_back_mid.png` / `*_003_back_done.png`) と油容器 (`oil_jar_still.png` / `oil_jar_tilted.png`) / 油レイヤー (`oil_layer.png`) / 塩容器 (`salt_shaker_still.png` / `salt_shaker_sprinkling.png`) の 8 アセットが未生成だったため、 fal.ai MCP 未設定環境で **Pillow による functional placeholder PNG を `scripts/gen_cooking_placeholders.py` で生成** し、 既存アセットを上書きしないよう新規 path (`assets/images/bento/cooking/salmon/*_back_*.png`, `oil/*.png`, `salt/*.png`) に配置。 Codex (OpenAI Codex) に画像生成を委ねるための詳細 brief を `tmp/Bento/cooking_assets_brief.md` に作成 (英語プロンプト + negative prompt + 寸法 + 既存スタイル基準 + path 上書き手順 + OpenAI Images API スニペット)。 placeholder は本画像に同名上書きで自動差し替えされる設計 (kitchen.html 改修不要): v750 直前
- Phase C: 鮭 (salmon) の grill シネマ演出を 8 段 subStep declarative state machine で実装。 INGREDIENTS の salmon `cookingActions[0]` に `subSteps: [intro, salt, oil, placeFood, cookFront, flip, cookBack, done]` + `backStages: ['salmon_001_back_raw', 'salmon_002_back_mid', 'salmon_003_back_done']` を追加。 state に `cookSubStepIndex`/`cookSaltApplied`/`cookOilApplied`/`cookFlipped`/`cookSubStepLock`/`cookSaltTaps` を追加 (`clearPendingTimers` 末尾で `resetCookSubStepUI()` を呼んで stale DOM 残留を防止)。 新規 17 関数 (`startSubStepSequence` / `advanceSubStep` / `showIntroSubStep` / `showSaltSubStep` / `onSaltShakerTap` / `spawnSaltGrains` / `showOilSubStep` / `onOilCruetTap` / `triggerOilPour` / `showPlaceFoodSubStep` / `waitForFoodPlaced` / `cookFrontSubStep` / `runFlipSubStep` (アニメ中盤で `img.src = backStages[stage]` 直接 swap) / `cookBackSubStep` / `runDoneSubStep` / `isInSubStepCookMode` / `handleSubStepGrillTap`)。 既存 egg/chicken_marinated/mince_patty/shrimp_breaded/korokke_raw は `Array.isArray(action.subSteps) && action.subSteps.length` ガードで完全 fall-through、 旧 path 非破壊。 salt/oil 容器の background は subStep `container` フィールド + `cookingAssetPath(...)` で `.png` 自動補完して解決。 油レイヤー (`.cook-substep-oil-layer`) は subStep `layerImg` フィールドが指定されれば `style.backgroundImage` を上書き、 無ければ CSS ハードコードがフォールバック: v750
- Phase D: `.fry-oil-mask` にイラレ風 cubic Bezier editor を実装 (4-anchor + 8-handle、 `clip-path: path('M ... C ... Z')` 経由)。 既存 `border-radius: 50%` を削除し `clip-path: var(--fry-oil-mask-clip, ellipse(50% 50% at 50% 50%))` + `-webkit-clip-path` の 2 行で楕円フォールバック。 `bento/kitchen.html` 内で完結 (`common/layout/*` は **編集禁止** = 他ゲーム巻き込み回避)。 既定値は kappa = 4*(√2-1)/3 ≈ 0.5523 で楕円近似 (`defaultFryOilBezierAnchors`)、 saved-layout に `__fry_oil_mask_bezier.anchors[].{x, y, hx1, hy1, hx2, hy2}` で永続化 (entry 内ではなく **top-level の `__` prefix キー** に格上げ — `LayoutEditor.snapshot()` が entry を `{w,h,tx,ty}` のみで再生成する仕様のため)。 `LayoutEditor.snapshot` を monkey-patch して `_currentLayoutData[FRY_OIL_BEZIER_KEY]` を snap に注入 (`__fry_oil_bezier_patched` フラグで重複防止、 LayoutEditor 未ロード時は no-op)。 dirty flag は `markDirty / emit('dirty',true) / state._dirty=true / #le-save.classList.add('dirty')` の 4 経路 try/catch fall-back。 **CRITICAL バグ回避**: clip-path の座標系は要素の unscaled layout box なので `applyFryOilMaskBezier` の分母は `el.offsetWidth/Height` を必須 (`getBoundingClientRect().width` は stage scale 込みの scaled px で、 v429 で学んだ知見の再発を防いだ)。 drag handler (`onFryOilBezierPointerMove`) は `(evt.clientX - eRect.left) / eRect.width * 100` で % を計算するが、 分子・分母とも scaled px なので scale が相殺して正しい — % が「unscaled layout px (clip-path) と scaled viewport px (drag) を橋渡しする共通通貨」になる構造: v751
- Phase D round 2: cross-review 検出の (1) `applyFryOilMaskBezier` の `getBoundingClientRect → offsetWidth/Height` 切替 (CRITICAL stage-scale 修正、 v429 既知パターンの再発防止)、 (2) `LayoutEditor.snapshot` monkey-patch 実装 (HIGH: 初回 GitHub PUT で `__fry_oil_mask_bezier` が body に含まれない問題)、 (3) dirty flag 4 経路 fall-back (HIGH: bezier 単独編集で save button が反応しない問題)、 (4) `fryOilBezierState.maskObs` + `.resizeHandler` の参照保存 (MEDIUM: observer/listener disconnect 不可)。 `common/layout/*` 無編集を維持: v752
- 鮭 salt subStep でゆで卵用の橙破線インジケータ (`.egg-target-cue`) が plate-rim 位置に漏出するバグ修正: Phase A2 (v749) で JS 側 `getEggTargetPoint('rim')` に `isCurrentEggGrillAction()` ガードを追加していたが、 [bento/kitchen.html#L2971-L2984](bento/kitchen.html#L2971) の **CSS 4 selector** に食材ガードが無く、 何らかの経路で `.egg-target-rim/center` クラスが付くと salmon でも `opacity: 1` で発火していた。 修正: 4 selector すべてに `[data-ingredient="egg"]` を prepend して egg 以外で構文上一切マッチしないように + defense-in-depth として `beginCookAction` 冒頭で `els.grillStage.classList.remove('egg-target-rim', 'egg-target-center')` を追加 (食材切替時のクラス残留を排除): v755
- 油 (oil) と塩 (salt) の実画像 8 枚 (`D:/ポノのおへや/Bento/cooking/調味料/`) を `assets/images/bento/cooking/{oil,salt}/` の Phase B placeholder に同名上書きで配置 (油容器立位/傾斜、 油レイヤー楕円、 油雫 3 種、 塩入れ立位/傾斜)。 視覚演出を 3 つ強化: (a) 油レイヤー (`.cook-substep-oil-layer`) に `mix-blend-mode: multiply` + `.show` 時 `opacity: 0.7` + `@keyframes oilShimmer 3s` (filter brightness/saturate 微変動) で「フライパンが透けて油っぽい光沢」を表現、 (b) `spawnSaltGrains` の中身を **DOM パーティクル 12-20 個** に置換 (3-6px 白円、 放物線落下、 800-1500ms fade、 50 個 cap、 will-change で GPU 合成 — 関数名は維持して呼び出し側無改修)、 (c) `triggerOilPour` 内で `spawnOilDrops` を呼び 5-8 個の雫 (`oil_drop_001/002/003.png` ランダム) を容器底から落下させる。 `resetCookSubStepUI` に `.salt-particle, .oil-drop` 一括除去を追加して画面/食材切替で残留を防止: v756
- パーティクル座標 v429 同型バグ修正: `spawnSaltGrains` / `spawnOilDrops` の origin 計算で `getBoundingClientRect()` 差分 (stage `scale()` 込みの scaled viewport px) を `style.left/top` (unscaled layout px) に直渡ししていたため、 タブレット縦・スマホ・小ウィンドウ (stage scale < 1) でパーティクルが容器位置からズレる致命バグ。 v429 で学んだ既知パターン (Phase D で `applyFryOilMaskBezier` で同型を修正済み) の再発。 修正: `stageScale = stageRect.width / stage.offsetWidth` を取得し、 差分を除算してから `style.left/top` にセットすることで unscaled layout px に統一: v757
- 鮭 (salmon) の実画像 6 枚 (`D:/ポノのおへや/Bento/cooking/焼く/鮭/`) を配置: 表 3 枚 (`salmon_001_raw`/`002_mid`/`003_done` 既存上書き、 534-541×169-172、 鮮オレンジ→深焼色) + 裏 3 枚 (`salmon_001_back_raw`/`002_back_mid`/`003_back_done` Phase B placeholder 上書き、 494-538×151-153、 銀灰うろこ→焼色 + grill marks)。 既存 path 完全互換 (kitchen.html 改修不要)。 CSS は `.cooking-food { width: 24%; aspect-ratio: 1/1 }` + `img { max-width: 100%; height: auto }` で **画像のアスペクト比を保ったまま fit** する設計のため、 新 PNG (約 3:1 横長) でもストレッチなし。 Phase C の `runFlipSubStep` の中盤 `img.src = backStages[stage]` 直接 swap で新 back PNG が自動採用される: v758
- Phase C 鮭シネマの根本再実装 (ユーザー報告 7 件への一括対応): ユーザー再説明の正しい仕様 「鮭がお皿に乗ったまま画面中央のやや下に出現 → そのまま中央で塩を振りかけ → 塩容器が左下に移動 (鮭はずっと中央) → 油容器が中央 → 右下に移動 → ユーザーが油容器をフライパン中央にドラッグして注ぐ → 鮭+お皿が左下に移動 → 鮭をフライパンへ → 表焼き → 裏返し → 裏焼き → 完成」 のうち、 (a) 鮭が intro 700ms 後に base CSS の `left:16% top:65%` に戻って左下に飛ぶ、 (b) 塩容器がタップ式で位置固定 (`onSaltShakerTap`) のため鮭に届かない、 (c) 塩振り後の rest-lower-left transition が inline drag style に負けて発火しない、 (d) 油 hit-test 半径 28pp で広すぎフライパン外でも発火、 (e) placeFood 後も塩シェイカーが残留、 (f) `[data-ingredient="egg"]` ガード無しの非表示ルール (`.food-placed`/`.egg-lid-ready`/`.egg-lid-closed`) で `.egg-target-cue` が鮭でも漏出、 の 6 件が壊れていた。 修正の柱:
  1. **新クラス `cook-substep-on-plate-center`** (salmon scoped、 `left:50% top:58% width:30%` + `.prep-plate` も同位置) を `showIntroSubStep` 末尾で `cook-substep-intro` から **置換** (削除ではなく繋ぎ替え) し、 `showSaltSubStep` / `showOilSubStep` は触らず維持、 `showPlaceFoodSubStep` 冒頭で初めて削除して base 位置 (`left:16% top:65%`) に transition。 「一時クラスを削除すると base CSS に戻って座標飛び」 という knife / chopY-marker で経験した typed-state machine の応用。 既存 egg / chicken_marinated / mince_patty / shrimp_breaded / korokke_raw / meatball は `subSteps` を持たないため `cook-substep-on-plate-center` 一切付与されず完全互換。
  2. **塩容器を pointer drag handler に改造**: `onSaltShakerTap` の関数名は維持しつつ中身を `pointerdown` → `setPointerCapture` + closure `onMove` / `onEnd` で `pointermove` / `pointerup` / `pointercancel` を処理する drag に置換。 `pointermove` 内で `isOverSalmonClient` (= `els.grillingFoodWrap.getBoundingClientRect()` の ±15% padding 矩形と pointer 衝突) を呼び、 衝突中は `.tilted` クラスで `salt_shaker_sprinkling.png` に画像差替 + `spawnSaltGrains()` を **260ms スロットル** で発火 + `state.cookSaltTaps` 加算、 maxTaps (3) 到達で `finishSaltSubStep()` 内で inline drag style クリア + `rest-lower-left` 追加 + 700ms 後 advance。 `applyPos` の % 計算は `(clientX - stageRect.left) / stageRect.width * 100` で scale 相殺型 (v429 同型バグの再発なし)、 `spawnSaltGrains` も `stageScale = stageRect.width / stage.offsetWidth` で px 除算する v429 知見適用済み。
  3. **`.cook-substep-shaker.rest-lower-left` に `!important` + `transition: left/top/width 0.6s ease-out` を明示**、 `finishSaltSubStep` で inline `left/top/transform` をクリア → CSS rule が確実に勝って左下へスムーズ移動。
  4. **油 hit-test 厳密化**: `(dx*dx + dy*dy) < (28*28)` 旧半径 28pp → `(dx*dx + dy*dy) < (16*16) && yPct >= 35 && yPct <= 68` でフライパン中央のみ (矩形 bound + 円形半径の AND)。
  5. **`showPlaceFoodSubStep` 冒頭で `cook-substep-on-plate-center` 削除 + `els.cookSubStepSalt.classList.remove('show')` + `els.cookSubStepOil.classList.remove('show')`** で鮭+お皿の左下移動と同時に塩・油シェイカーを画面から消す。
  6. **`[data-ingredient="egg"]` を `.egg-target-cue` の表示・非表示両方の selector に対称適用** ([bento/kitchen.html#L2992-L2997](bento/kitchen.html#L2992) の `.food-placed`/`.egg-lid-ready`/`.egg-lid-closed` の 3 hide rule に prepend) + 追加 defense `#grill-stage:not([data-ingredient="egg"]) .egg-target-cue { opacity: 0 !important; display: none !important }` を宣言、 さらに `beginCookAction` 冒頭で `els.grillStage.dataset.ingredient = ing.id` / `els.fryStage.dataset.ingredient = ing.id` を即時設定 (旧来 `updateCookStageState` の遅延設定に頼っていたため初動フレームで egg 用 CSS が salmon にも当たり得る穴があった): v760
- v760 デプロイ後のユーザー報告 5 件への一括対応:
  1. **塩画像 cache buster**: `cookingAssetPath()` の戻り値末尾に `?v=761` を付与 + sw v761 同期で、 ブラウザ HTTP キャッシュが古い salt placeholder を返す現象を解消。 ただし `cookingAssetPath` を経由しない直接パス参照が 203 箇所 (`EGG_CRACK_WHOLE_SRC` / `fridgeImage` / CSS ハードコード `oil_layer.png?v=761` 等) 残っており、 次の bump で順次 `cookingAssetPath` 経由化を検討 (MEDIUM 残債)。
  2. **塩 drag 即時消滅 (掴むと縮小して左下に飛ぶ) の真因**: `showSaltSubStep` 冒頭で `state.cookSaltTaps`/`cookSaltApplied`/`cookSaltSprinkleAt`/`cookSubStepLock` のリセットが漏れていて、 前 session で `taps=3 / applied=true` のまま残ると pointerdown → onMove 初回で maxTaps 即到達 → `finishSaltSubStep` 発火 → `rest-lower-left` 即適用で左下へスーッ。 修正: 冒頭で 4 つの state を強制リセット。
  3a. **oil subStep で鮭+お皿が pan を覆って油注ぎ不能だった件**: v760 の `cook-substep-on-plate-center` を salt+oil 両方で維持していたため pan 上に皿が居座っていた。 修正: `showOilSubStep` 冒頭で `cook-substep-on-plate-center` を削除し、 鮭が CSS transition で base food-placed 位置 (`var(--grill-food-x, 58%)` 等) に滑らかに移動 → pan clear。 これでユーザーが油容器を pan 中央にドロップできる (salt subStep 中だけ center 維持、 oil subStep 開始で base 位置へ — typed-state machine の class chain を 3 段化)。
  3b. **油 layer が透明すぎて見えない件**: `.cook-substep-oil-layer` の `mix-blend-mode: multiply` + `opacity: 0.7` が多重減色で「油が引いた感」をほぼ消していた。 修正: `mix-blend-mode` を撤去 + opacity 0.7→0.92 + 常時 `filter: brightness(1.05) saturate(1.2)` + 強化 shimmer (0%/100% 同値 → 50% で 1.18/1.4) で「ギラッと光る黄金プール」 視認性を確保。
  4a. **cookFront/cookBack 進行不明の件**: subStep モードで `stopCookTimingGauge()` を呼ぶ仕様で timing gauge は意図的に無効化されており、 タップ進捗のフィードバックが完全欠落していた。 修正: `cookFrontSubStep`/`cookBackSubStep` で `state.cookFrontProgress`/`cookBackProgress` を 0 初期化 + banner に `おもてを やこう (0/3)` 形式で表示、 `handleSubStepGrillTap` でタップ毎に `(N/M)` を更新、 maxTaps 到達で advance。 ゲージ無しでもタップ数の手がかりがバナーに常時出る。
  4b. **flip が一瞬で気付かない件**: 既存 `@keyframes foodFlip` (0.5s, rotateY 0→88→180 のみ) は控えめで salmon の flip が分からなかった。 修正: salmon 専用 `@keyframes foodFlipEnhanced` (1100ms ease-in-out) を新設し `0%→20% 持ち上げ scale(1.1) translateY(-22px) → 50% rotateY(90deg) scale(1.15) translateY(-34px) → 80% rotateY(180deg) scale(1.1) translateY(-16px) → 100% 着地` で「ふわっと持ち上がってクルッと裏返って着地」のフライパン振り演出。 `runFlipSubStep` のバナーも 「ひっくり かえそう！」に統一して工程を明示。 蓋 (`.egg-glass-lid`) は egg 専用の設計のまま (ユーザーの 「蓋もない」 質問への回答: salmon に蓋演出は仕様外)。
  5. **chop 切れ端が中央に重なる件 (carrot/potato/chicken_marinated)**: `addSingleCutPieceToBowl` の else 枝 (非 isParticle/非 isLeafy/非 isChicken) で散布半径が `Math.min(w, h) * 0.25` と狭すぎ、 さらに境界 clip が isLeafy/isParticle のみで else 枝には適用されていなかった。 修正: 半径 `0.25 → 0.42` (cabbage の `0.48` と同程度) + else 枝にもボウル境界 clip (`Math.max(w*0.05, Math.min(w-pieceSize-w*0.05, rawX))` 形式、 y は 0.08 マージン) を追加 → 広く均等に散らばりかつボウル外には飛ばない。 isChicken/isLeafy/isParticle の独自分岐は非干渉: v761
- v761 デプロイ後のユーザー報告 3 件 (お弁当回転 / 塩着地 / 油 UX) への一括対応:
  1. **お弁当 (`bento/index.html`) のおかず回転機能**: `.free-placed-item` の CSS `transform: ... rotate(var(--rot, 0deg))` と各 item オブジェクトの `rotation` フィールドは前から実装済み (v442 系統で `FREE_COOKED_OKAZU` の初期値 -6〜8 度として設定されていた) だが、 ユーザーが配置後に回転させる UI が無かった。 修正: `bento/index.html` に `rotateSelectedItem(deltaAngle)` 新規関数 (0-360 正規化 + 負値補正) を追加し、 `createFreeContextToolbar` の既存サイズ/レイヤーボタン群と削除ボタンの間に `↺` / `↻` 15 度刻みボタン 2 個を挿入。 `!item.snapTarget` ガードでカップには非表示。 永続化は既存 `saveFavorite` の `placedItems.map(i => ({ ...i }))` スナップショットで自動取り込み (専用保存呼び出し不要)。
  2. **塩のパーティクルが鮭を素通りする件**: `spawnSaltGrains` のパーティクルが origin から放物線で y 方向に落ち続けるだけで salmon との collision 検出が無く、 鮭の高さを通り過ぎて画面下方に消えていた (「鮭に塩がかかっていない」 視認性問題)。 修正: spawn 時に `els.grillingFoodWrap.getBoundingClientRect()` から鮭中心 y を取得し `stageScale` で除算して **unscaled layout px の `salmonY`** をキャッシュ (v429 知見適用、 frame 毎 getBoundingClientRect 呼ばない設計)、 各パーティクルの `animateSaltParticle` rAF tick で `currentY >= salmonY` に達した時点で物理停止 + `scale(0.7)` + opacity 0.85 + 220ms フェードに切替 → 「塩が鮭の上に着地して溶ける」 視認性。 `grillingFoodWrap` 不在時は `salmonY = null` フォールバックで従来落下を維持。
  3. **油の回転 / 注ぎ方が分からない件**: v761 で hit-test を 16pp + Y 帯 35-68% に厳密化した結果、 子供の指には狭すぎてドラッグしても hit せず + 「どこに置けば pour されるか」 視覚的ヒントが皆無で、 ユーザーは cruet が右下 rest に自動移動するのを「ドラッグした結果」 と誤認していた。 修正:
     - **hit-test 緩和**: 16pp → 22pp 半径 (WCAG タッチターゲット 44px 相当) + Y 帯 30-70% に広げる
     - **`#oil-drop-target` 点滅破線円** を新規追加 (`#grill-stage` 直下、 `left: var(--grill-food-x, 58%) top: var(--grill-food-y, 52%)` で pan center 自動追従、 `oilTargetPulse` で box-shadow が外側に拡散する 1.4s ループ)、 `onOilCruetTap` の pointerdown で `.show` 追加 / pointerup / `triggerOilPour` 成功 / `resetCookSubStepUI` の 4 経路でクリーンアップ
     - **rest 到達後の hint-bounce + バナー誘導**: cruet が `rest-lower-right` に到達後 1700ms で `state.cookOilApplied` 早期 return ガード付きで `hint-bounce` (容器が 3 回 scale 0.65→0.7 ピョコ) + バナー「ドラッグして フライパンへ」 を表示。 「素早くドラッグ完了したユーザー」 では誤発火しない設計。
  キャッシュバスター同期: `cookingAssetPath` `?v=761 → ?v=762` + CSS ハードコードの `oil_layer.png?v=762` + sw.js v762。 `?v=761` 残存 grep 0 件で完全置換: v762

## 16:9 contain-fit ステージ

他ゲーム（quizland / writing-mori）と同様の **1600×900 contain-fit** に準拠。`.stage-wrap`（viewport 全面、画面別グラデでレターボックス）+ `.stage`（1600×900 固定）構造で、`fitStage = Math.min(w/1600, h/900)` + `transform: translate(ox,oy) scale(s)`。`window.resize` / `orientationchange` / `visibilitychange` で再計算。

- `position: fixed` 要素（`.toast`, `#screen-announcer`, `.back-confirm`）は `.stage` の外側に置き、scale を継承させない（座標系の二重補正回避）
- `flySparklesToFridge` は document.body に直接 append（getBoundingClientRect の実画面ピクセルと一致させるため）
- `clamp()` 24件 → 固定 rem 化（stage 内では vw が意味喪失）
- portrait 向け「📱 よこむきに してね」全面警告 overlay 実装済

## 新規画像アセット

`assets/images/bento/cooking/` 配下（v387 追加 + v389 追加 + v401 で knife 差替）:
- `kitchen_bg.png` (2.1MB、auto_optimize_image.py で 3.2MB から圧縮済、要 WebP 化検討) — chop 画面の絵本タッチ背景、手前カウンターに大きなまな板が描き込まれている
- `knife.png` **(v401 で差替: 953×1242 縦長、166KB、余白ほぼゼロ版)** — 子供向け緑柄＋黄色お花マークの包丁、対角配置（旧 1200×675 横長版から余白削減で大幅 aspect 変更）。CSS `aspect-ratio: 953/1242` で同期、`bladeTipOffsetX_pct: -39`（画像内刃先 X ≈ 10.8% 実測ベース）

`assets/images/bento/cooking/carrot/` 配下（v389 追加、11 枚）:
- `carrot_001.png` (249KB) — **丸ごとのにんじん**（葉付き、横長 3.2:1）→ `.ingredient-on-board` でまな板上に表示
- `carrot_002.png` 〜 `carrot_011.png` (29〜77KB×10枚) — **輪切りバリエーション 10 種**（厚み・角度・色味に個体差）→ `addCutPieceToBowl()` で 2..11 ランダム選択し小皿に積もる切れ端 PNG。実装は `Math.floor(Math.random()*10)+2` + `padStart(3,'0')` で `carrot_002〜011.png` から均等抽選

出典:
- 背景・包丁: `D:/ポノのおへや/Bento/cooking/` (kitchen.png → kitchen_bg.png にリネーム、knife.png はそのまま)
- にんじん: `D:/ポノのおへや/Bento/cooking/人参/` (レイヤー 0_…_001〜011.png → carrot_001〜011.png にリネーム)

---

## Phase 2/3/4 残課題

### Phase 2
- 残り 5 材料（wiener / egg / broccoli / potato / apple）の実装
- 複数材料レシピ（例: ブロッコリー + コーン → ブロッコリーコーン）
- 冷蔵庫タップで「作れるおかず一覧」モーダル
- 中断レジューム（chop 中リロード対応、localStorage に state.current / chopProgress 保存）
- モーダルのフォーカストラップ強化

### Phase 3
- 既存 `bento/index.html` 側と連携: 解放済みおかずのみ `OKAZU_MEAT/VEG/FRUITS` から見せる
- 未解放おかずに「○○を じゅんびすると つくれるよ！」ヒント
- 既存の三色（sk: r/y/g）判定・NPC評価・豆知識は温存（変更禁止）

### Phase 4
- ④ おかずを作る画面（料理ミニゲーム、フライパン+火加減）
- 効果音差し込み口（「トン！」「キラキラ」「冷蔵庫開く音」）
- ポノ表情差し替え（既存 dance assets 流用）
- ローカライズ層（直書き文言を抽選プール化）

### 画像最適化（次回）
- `kitchen_bg.png` を WebP 化（理想 1MB 以下）。pre-commit hook が 2MB 超で警告中
- 包丁の chopMechanics 数値（startX_pct, endX_pct, chopY_pct, bladeTipOffsetX_pct）は実機で微調整余地あり（layout-editor の `?edit=1` で `.knife@carrot` 位置を視覚調整可能）
- `select` 画面の carrot 材料カードはまだ絵文字 `🥕`。デザイン一貫性のため `carrot_001.png` への差し替え検討（Phase 2 候補）
- 5チップが Edge ブラウザのフォント幅で 928px に収まるかは要実機確認（はみ出したら font 0.75→0.72rem に再調整余地あり）

### chop メカニクス Phase 2 候補
- `addCutPieceToBowl()` の `ing.id === 'carrot'` ハードコードを `ing.imagePieces.{dir,from,to,pad}` 参照に汎用化（INGREDIENTS にフィールドはあるが未参照）
- 残り 5 材料（wiener / egg / broccoli / potato / apple）に chopMechanics を実測値で設定
- `.chopY-marker` の drag end イベント購読で「動かしたら即時 preview」を実現（現状は `loadIngredient` 再走でしか反映されない）
- `perQuestionSelectors` → `perEntitySelectors` への汎用リネーム（layout-editor.js / system.js / applier.js 3 ファイル横断）

---

## 関連メモリ

- [[feature_audio_balance]] — SFX/BGM の音量基準（Phase 4 で SFX 追加時に参照）
- [[feedback_auto_push]] — Cloudflare Workers staging 自動デプロイフロー
- 既存 [bento/index.html](../bento/index.html) — `OKAZU_MEAT` 19種 / `OKAZU_VEG` 16種 / `FRUITS` 11種 / `RICE` 3種 / `NPC_REQUESTERS` 6体（Phase 3 で連携対象）

## 関連ドキュメント

- 仕様書: [tmp/Bento/pono_tonton_kitchen_claude_code_instructions.md](../tmp/Bento/pono_tonton_kitchen_claude_code_instructions.md)
- ハンドオフ: HANDOFF.md の `batch:46-bento-tonton-kitchen-phase1` 系統
