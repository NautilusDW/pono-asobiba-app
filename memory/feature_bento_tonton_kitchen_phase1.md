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

`bento/kitchen.html`（自己完結 HTML + inline CSS/JS、IIFE 構成、約 2404 行、sw v391 時点）。 ユーザーが既存 `bento/index.html` を開く前にここを通る想定。

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

#### chop 画面アセット配置の確定値（v391、ユーザーフィードバックを反映）
- `.cutting-board`（hit area / 透明）: `left: 45.5%; top: 80%; width: 60%; aspect-ratio: 1.18/1`（画像内のまな板実測中心、やや左寄り）
- `.knife` PNG: **`width: 70%; aspect-ratio: 240/140`（v391 で % 化、cutting-board 基準）**; `left: 68%; top: -55%; transform: translate(-50%, 0) rotate(0deg); transform-origin: 50% 80%`
  - knife.png は対角 -22° の絵本タッチ → **そのままの傾きを活かす（追加 rotate なし、v389 で「右上から差し込む」型を廃止し「真上から垂直落下」型に変更、v391 で「もっと右、もう少し下」要望に応じ left を 50→68%、top も % 化）**
  - `@keyframes knifeChop` は **`translate(-50%, 0 → 50% → 20% → 0) rotate(0deg)`、translateY も要素自身の高さ %（v391 で px → % 化、要素サイズが変わっても比率を保つ）**
- `.ingredient-on-board`: `position: absolute; left: 50%; top: 42%; width: 74%; transform: translate(-50%,-50%)`（v391 で top 50→42%、width 60→74% = 1.23倍、まな板の上方寄せ）+ `ingShake` は `translate(-50%,-50%)` 基準の `calc()` シェイクでセンタリング保持
  - **v389 で `<img>` 注入化**: carrot は絵文字 `🥕` ではなく `carrot_001.png`（丸ごと葉付き、横長 3.2:1）を表示
- **v391 で「右から削れる」マスク演出を新設**: `updateCarrotMask()` で `mask-image: linear-gradient(to right, black 0%, black N%, transparent N%, transparent 100%)`（`-webkit-mask-image` 併用で Safari 対応）。N = `(1 - chopProgress/chopCount) * 100`、5タップで `100→80→60→40→20→0%` と削れ、5回目で完全消滅 → completeIngredient → fridge 遷移
  - 呼出: `onBoardTap` 内 chopProgress++ 直後、`onIngredientPick` 直後（リセット相当）、`resetBoard()` 内（明示リセット = `resetCarrotMask()`）
  - 既存の `addCutPieceToBowl()` で `carrot_002〜011.png` をランダム小皿投入する演出と併走（マスクで本体が削れる一方、輪切りが小皿に飛ぶ）
- `.knife` 内の dead `<span>` 3 個 (blade/handle/rivets) は削除済み（PNG 化による）

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
- chop polish: 包丁右寄せ・% 化 + にんじん上1.23倍 + 右からマスク削れ + 5チップ1行化 + 戻る右下小型化: **v391（現行）**

## 16:9 contain-fit ステージ

他ゲーム（quizland / writing-mori）と同様の **1600×900 contain-fit** に準拠。`.stage-wrap`（viewport 全面、画面別グラデでレターボックス）+ `.stage`（1600×900 固定）構造で、`fitStage = Math.min(w/1600, h/900)` + `transform: translate(ox,oy) scale(s)`。`window.resize` / `orientationchange` / `visibilitychange` で再計算。

- `position: fixed` 要素（`.toast`, `#screen-announcer`, `.back-confirm`）は `.stage` の外側に置き、scale を継承させない（座標系の二重補正回避）
- `flySparklesToFridge` は document.body に直接 append（getBoundingClientRect の実画面ピクセルと一致させるため）
- `clamp()` 24件 → 固定 rem 化（stage 内では vw が意味喪失）
- portrait 向け「📱 よこむきに してね」全面警告 overlay 実装済

## 新規画像アセット

`assets/images/bento/cooking/` 配下（v387 追加 + v389 追加）:
- `kitchen_bg.png` (2.1MB、auto_optimize_image.py で 3.2MB から圧縮済、要 WebP 化検討) — chop 画面の絵本タッチ背景、手前カウンターに大きなまな板が描き込まれている
- `knife.png` (170KB) — 子供向け緑柄＋黄色お花マークの包丁、対角 -22° で描画

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
- 包丁の垂直落下幅 (`translateY 50%`) は実機検証で「沈み込みすぎ／届かない」なら ±10% で微調整
- `select` 画面の carrot 材料カードはまだ絵文字 `🥕`。デザイン一貫性のため `carrot_001.png` への差し替え検討（Phase 2 候補）
- 5チップが Edge ブラウザのフォント幅で 928px に収まるかは要実機確認（はみ出したら font 0.75→0.72rem に再調整余地あり）

---

## 関連メモリ

- [[feature_audio_balance]] — SFX/BGM の音量基準（Phase 4 で SFX 追加時に参照）
- [[feedback_auto_push]] — Cloudflare Workers staging 自動デプロイフロー
- 既存 [bento/index.html](../bento/index.html) — `OKAZU_MEAT` 19種 / `OKAZU_VEG` 16種 / `FRUITS` 11種 / `RICE` 3種 / `NPC_REQUESTERS` 6体（Phase 3 で連携対象）

## 関連ドキュメント

- 仕様書: [tmp/Bento/pono_tonton_kitchen_claude_code_instructions.md](../tmp/Bento/pono_tonton_kitchen_claude_code_instructions.md)
- ハンドオフ: HANDOFF.md の `batch:46-bento-tonton-kitchen-phase1` 系統
