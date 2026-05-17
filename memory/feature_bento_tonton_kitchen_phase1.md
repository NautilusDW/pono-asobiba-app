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

`bento/kitchen.html`（自己完結 HTML + inline CSS/JS、IIFE 構成、約 2731 行、sw v405 時点）。 ユーザーが既存 `bento/index.html` を開く前にここを通る想定。

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

**式（chopProgress 1 つで刃先 X とマスク境界 X が完全連動）**:
```
t = chopProgress / chopCount
targetBladeX = startX_pct + (endX_pct - startX_pct) * t
compensation = -(bladeTipOffsetX_pct * knifeWidthPct / 100)  // knifeWidthPct = 70 (CSS .knife { width: 70% })
nextX (knife コンテナ中央) = targetBladeX + compensation
maskVisiblePct = (1 - t) * 100
マスク境界 X (cutting-board基準) = 13 + (visiblePct / 100) * 74  // 食材幅 74% (= 87-13)
```

→ にんじん 5タップで刃先 X は 87% → 72.2% → 57.4% → 42.6% → 27.8% → 13% と均等 14.8%pt 刻み、マスク境界 X と同じ位置で進行。

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
- editor 対象 (`editableSelectors`、v399 で v394 状態に戻して 4 要素): `.app-header`, `.knife`, `.chopY-marker`（[ツール] 包丁の最下点）, `.bowl`
- per-ingredient 対象 (`perQuestionSelectors`、v399 で 2 要素): `.knife`, `.chopY-marker`（食材切替時に座標も切替）
- **`.ingredient-on-board` と `.cutting-board` は editor 対象に直接含めない**: CSS の `width:74%; aspect-ratio` 依存で editor の px 固定化と相容れない（v394 で判明した極小化バグ）+ 親要素 drag で子要素グループ追従バグ。**v398 で `.ingredient-bbox-marker` 経由で間接編集する設計を導入したが、マーカーが 4 種に増えてユーザー混乱（「赤いやつ何のため？」「人参動かない」「包丁スケールしか動かせない」）したため v399 で 3 マーカー（ingredient-bbox/startX/endX）を撤去、`.chopY-marker` のみ残す方針に**
- 代わりに **にんじん位置は INGREDIENTS の chopMechanics に `ingredientLeft_pct`/`ingredientTop_pct`/`ingredientWidth_pct` フィールド (.cutting-board 基準 %、null なら CSS デフォルト) で Claude がコード値調整**する。値変更例: 「もう少し右上」→ `ingredientLeft_pct: 55, ingredientTop_pct: 36`
- `.bowl` は **共通**（per-ingredient しない、ユーザー指示）
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

#### chop メカニクスエディタ用 マーカー（v399 以降、1 種のみ）

| マーカー | 形・色 | 編集対象 | 反映先 | スコープ |
|---|---|---|---|---|
| `.chopY-marker` | 橙 #D86E2F dashed 円 **48×48px + 中央 ⬇ アイコン**（v402 で視認性強化） | Y 位置のみ | `chopMechanics.chopY_pct` | per-ingredient |

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
- chopY-marker editor mode で消える真因 (.resizable の position:relative 強制) を `data-le-keep-position="1"` で opt-out + 念のため CSS `position: absolute !important`: **v405（現行）**

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
