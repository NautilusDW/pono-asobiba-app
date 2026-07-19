---
name: feature-quizland-contain-fit-default
description: quizland の fitStage を cover→contain 化 + stage を 16:9 (1600×900) 化 + safe-area = stage 同一化 + メディアクエリの --safe-w 動的縮小を全廃 + .stage 背景削除で stage-wrap 背景 1 枚に統一 + 4 帯メディアクエリ (16:10/14:9/4:3/5:4) を完全撤去で内側 UI も画面比不変 + .board の base max-width 絞り (v994 由来) を撤去で saved-layout WYSIWYG 化 (2026-05-14〜16, sw v993→v1008)。画面比違いは全部レターボックスで吸収、 stage 内外の継ぎ目=帯も解消、 内側 UI の段階的変形も完全消滅、 .board は saved-layout 971x503 のまま描画
metadata:
  type: feature
---

# quizland 16:9 stage + 完全レターボックス + 継ぎ目=帯解消 (sw v1008, 2026-05-14〜16)

## なに

`quizland/index.html` の `fitStage()` のデフォルトを cover-fit (`Math.max`) から **contain-fit (`Math.min`)** に反転した。固定キャンバス 2100×900 (21:9) を、画面より大きくクリップする方式から、画面より小さく letterbox 化する方式へ。

## なぜ

iPad mini (CSS 比 1.52:1) など 4:3 寄りデバイスで、cover-fit だと右側の `.answer-tray` (回答ボタン 2x2) が画面外にハミ出て **3 つ目・4 つ目のボタンが切れる**症状があった。CSS `@media (max-aspect-ratio: 4/3)` で右カラム幅を縮める対応はあったが、saved-layout.json の固定座標と cover-fit の組み合わせが根本問題。

contain-fit にすると **どんなアスペクト比でも UI が必ず画面内に収まる**。レターボックス余白は `.stage-wrap` に `stage-bg.png` を `background-size: cover` で敷くことで、stage 内側の背景画像と継ぎ目なく繋がる。

## 実装の最小性 (差分 6 行)

既存に `?fit=contain` URL 切替機構 (行 3883-3887) と `fitStage()` の Math.min/Math.max 両モード分岐 (行 3909-3911) がすでに実装済だったため、**デフォルト反転だけ**で実現:

```js
// Before
const QZ_FIT_MODE = (_qzFitFromUrl === 'contain' || _qzFitFromLS === 'contain') ? 'contain' : 'cover';
// After
const QZ_FIT_MODE = (_qzFitFromUrl === 'cover' || _qzFitFromLS === 'cover') ? 'cover' : 'contain';
```

+ `.stage-wrap { background: #000 }` → `#0c0c0c url('../assets/_legacy/preview-placeholders/stage-bg.png') center/cover no-repeat`
+ sw.js CACHE_VERSION 992 → 993

## 退避路 (16:9 ユーザーで違和感が出た場合)

- URL: `https://pono-asobiba-staging.ndw.workers.dev/quizland/?fit=cover`
- DevTools Console: `localStorage.setItem('pono_fit_mode','cover')` → リロード

両方 OR 条件で旧 cover-fit に即時退避可能。コード revert 不要。

## 他ゲームへの波及検討メモ

quizland 以外 (maze, zukan, drawing 等) も同様の cover-fit を使っているかは未調査。 ユーザー報告ベースで個別対応する方針 (一括 contain-fit 化はしない)。

## 関連メモリ

- [[reference-layout-system]] — LayoutSystem (common/layout/) の共通レイアウトモジュール
- [[reference-op-layout-publish-workflow]] — OP layout の publish ワークフロー (本変更とは独立)
- [[feature-quizland-per-question-layout]] — 問題ごとの emoji-display 個別座標

## 関連ファイル (file:line)

- `quizland/index.html:110` — `.stage-wrap` 背景拡張 (v993)
- `quizland/index.html:789` — `.board` ベース定義の `max-width: calc(var(--safe-w, 1600px) - 700px - 16px)` (v994、wide path 限定で 884px 制約)
- `quizland/index.html:2035 / 2089 / 2189 / 2245` — 16:10 / 14:9 / 4:3 / 5:4 メディアクエリに `max-width: none !important` (v994、ベース制約を狭アスペクトで解除)
- `quizland/index.html:3876-3878` — fit-mode コメント (反転後)
- `quizland/index.html:3887` — `QZ_FIT_MODE` 三項演算 (反転後)
- `quizland/index.html:3909-3915` — `fitStage()` の Math.min/Math.max 分岐 + `--safe-w` 取得 (v994 で safe-area fit 化)
- `quizland/index.html:3976` — `?diag=1` ハーネスの fit-mode 表示
- `sw.js:4` — CACHE_VERSION 994

## v994 更新 (2026-05-14)

v993 で contain-fit デフォルト化したが、stage 全体 (2100×900 = 21:9) を fit 対象にしていたため 4:3 デバイスで上下余白が広く出る + 16:9 wide で `.board` (saved-layout 971px) が q-col 領域 (884px) を超えて右ズレが起きていた。

### v994 の変更
1. **fit ターゲットを 16:9 safe-area (1600px) に変更**: `fitStage()` で `--safe-w` CSS 変数を取得し、contain scale 計算を `Math.min(w/safeW, h/stageH)` に。translate は stage 中央寄せのまま (safe-area は stage 中央にあるので結果同じ)。cover 退避路は stageW のまま維持
2. **.board に max-width 制約 (wide path 限定)**: `.board { max-width: calc(var(--safe-w, 1600px) - 700px - 16px) }` でデスクトップ 16:9 で 884px に絞る。狭アスペクト 4 帯 (16:10/14:9/4:3/5:4) には `.board { max-width: none !important }` を追加してベース制約を解除 (既存 `width: auto !important` と整合)
3. **CACHE_VERSION 993 → 994**

### 効果 (iPad mini 1133×744 で実測)
- 余白: 上下 130px × 2 → 約 53px × 2 (半減)
- 右ズレ: 14/9 帯では既存 `width: auto !important` で grid 任せなので元から右ズレなし

### AGENTS.md §3 ルール準拠
当初 `saved-layout.json` の `.board|0.w` を 971→884 に手書きする案だったが、AGENTS.md §3 「saved-layout.json は layout-editor 経由でのみ更新、手書き禁止」に違反するためルール準拠で CSS `max-width` 方式に変更。コードレビュアーの指摘で発見

### 残課題
- 16:10 帯 (1440×900 等) では max-width: none で制約解除しているため saved-layout 971px のまま (右ズレ残存)。ユーザー主訴は iPad mini / wide 中心のためスコープ外として温存。必要なら別タスクで layout-editor 経由で `.board|0.w` を 884 (もしくは 16:10 用の 784) に更新
- code-reviewer から「`scaledW = stageW * scale` で `scale = w/safeW` の式と不整合では」と HIGH 指摘されたが、stage 中央寄せ = safe-area 中央寄せ (safe-area が stage 中央にあるため) の数式的に正しい。レビュア提案の `scaledW = safeW * scale` に変えると逆に safe-area が右に 300px ズレる

## v995 更新 (2026-05-14、 v994 デプロイ直後の追加修正)

### 発見された残課題
v994 デプロイ後、ユーザーが iPad DevTools 1024×768 (4:3) で確認 → **右側 2×2 回答ボタンの右列 (「2つ」「4つ」等) が画面右端で切れる** ことが判明。v994 / fitStage は正しく動作 (transform scale=0.853 確認済) していたが、**4/3 帯メディアクエリの chip 幅計算が a-col 容量を 20px 超過していた**。 

具体的:
- 4/3 帯: `.body { grid-template-columns: 1fr 440px }` で a-col=440px
- `box-sizing: border-box` で `.chip { width: 196px !important }` × 2 + gap 10 + pad 24 + border 10 = 計算上 **+2px の余裕しかなく** subpixel rounding で overflow
- 14/9 / 5/4 帯も同様に余裕 +2px しか無く脆弱

Plan エージェントの初期分析と私 (orchestrator) はこの内側 grid 制約を見落とした (= safe-area が画面に収まる ≠ a-col 内側の chip も収まる)。

### v995 の変更
3 帯の chip width を **-8px ずつ縮めて余裕 +10〜+20px を確保**:
- 14/9 帯: 216 → **208** (余裕 +10px)
- 4/3 帯:  196 → **188** (余裕 +20px、今回の主犯)
- 5/4 帯:  190 → **182** (余裕 +18px)
- 16:10 帯は `1fr` 指定なので変更不要

quizland/index.html 6 行変更 + sw.js CACHE_VERSION 994 → 995。

### 教訓
**「fit-target = safe-area が画面内に収まる」は内側 grid (q-col / a-col) の chip 配置が収まることを保証しない**。メディアクエリで `.chip { width: Npx !important }` のような `!important` 強制サイズを当てている場合、box-sizing と padding / border / gap を **全部足して** a-col 容量内に収まるか毎回再計算が必要。v994 リサーチで Plan エージェントは内側 chip サイズまでチェックしなかった (= safe-area 配置までで止めた)。今後同種の修正では **「safe-area 配置 OK + 内側 grid 容量 OK」を 2 段階で確認**することを徹底

## v996-v998 (2026-05-14、stage 21:9 → 16:9 統合の第 1 段)

### 残課題発見
v995 適用後も iPad 4:3 (1024×768) で右ボタン切れが続く。 ユーザー指摘で根本判明: stage が **21:9 (2100×900)** の固定キャンバスで、内側に 16:9 (1600×900) の safe-area を中央配置している **入れ子設計** が「stage 全体を fit → 上下余白」「safe-area を fit → 左右余白で UI 切れ」のジレンマを生んでいた。 ユーザーが望むのは **「stage = 16:9 で、画面比違いは全部レターボックス」** の王道方式。

### v998 の変更
- `:root { --canvas-w: 2100px → 1600px }` (stage を 16:9 に縮小、safe-area と同サイズに統合)
- 冒頭コメントを stage 16:9 仕様に更新
- fitStage 周辺コメントを「contain-fit デフォルト + レターボックス」前提に書き換え
- saved-layout.json は **無変更** (Plan エージェント分析: tx/ty は safe-area 内 natural-flow からの delta、 stage 縮小に追従)
- CACHE_VERSION 995 → 998 (auto-commit hook 連鎖で複数 bump)

### v998 だけでは効果が出ない問題
ユーザーがローカル + staging 両方で「変わらない」と報告。 原因解明: **4 帯のメディアクエリ (16:10 / 14:9 / 4:3 / 5:4) が `:root { --safe-w: 1400/1080/1020/980 }` で `--safe-w` を縮めていた**ため、 fitStage が `parseFloat(--safe-w)` で縮小値を取得 → scale 計算が旧来通り (例 0.853) → stage 16:9 化の効果が完全に潰された。

これは PR1 を「最小変更」に絞った私の判断ミス。Plan エージェントの案 A (= メディアクエリ温存) が、 fitStage が `--safe-w` を参照する経路 (v994 で追加) を見落としていた。

## v999-v1000 (2026-05-14、stage 16:9 化の完成)

### v999 の変更
- 4 帯メディアクエリの `:root { --safe-w: Npx }` ブロックを **全削除** (12 行削除)
- `--safe-w` は常に :root の 1600px (= stage 全幅) に固定
- fitStage の scale 計算が `Math.min(w/1600, h/900)` = stage 全体 contain-fit に確定
- 4 帯メディアクエリ内の `.body grid-template-columns` / `.chip width !important` / `.character` 等の **内側 UI サイズ調整は全部温存** (視認性確保のため必要)
- CACHE_VERSION 998 → 1000 (auto-commit hook で連鎖 bump)

### 完成した挙動 (画面比×スケール早見表)
| viewport | scale | 描画後 stage | レターボックス |
|---|---|---|---|
| 1024×768 (4:3) | min(1024/1600, 768/900) = 0.64 | 1024×576 | 上下 96px ずつ |
| 1133×744 (iPad mini 8.3") | min(1133/1600, 744/900) = 0.708 | 1133×637 | 上下 53px ずつ |
| 1920×1080 (16:9) | min(1920/1600, 1080/900) = 1.2 | 1920×1080 | **なし、ぴったり** |
| 2560×1080 (21:9) | min(2560/1600, 1080/900) = 1.2 | 1920×1080 | 左右 320px ずつ |
| 852×393 (iPhone 横) | min(852/1600, 393/900) = 0.437 | 698×393 | 左右 77px ずつ |

レターボックス領域は `.stage-wrap` の `background: stage-bg.png cover` で自然に埋まる。

### 教訓 (今回の最重要)
**設計変更を「最小差分」で段階導入する時、 既存コードがどの CSS 変数 / 値を参照しているかを `grep` で全件追跡しないと、 主目的が無効化される**。 今回は `--canvas-w` を変えただけでは効果ゼロだった (= fitStage が `--safe-w` を見ていたため)。 Plan エージェントの「段階導入 = 安全」発想は、 依存関係を見落とすと逆に「変更が無効」になる落とし穴。 stage / safe-area / fit-target の 3 概念を統合した瞬間に、メディアクエリの `--safe-w` 動的縮小も同時撤去するのが正解だった。

## v1001 (2026-05-15、 stage 内外の継ぎ目=帯解消)

### 残課題発見
v1000 で stage 16:9 化 + 完全レターボックス対応 完了後も、 ユーザーが 4:3 デバイス (DevTools iPad Mini プリセット 1024×768) で「上下に薄い色の帯が見える」と指摘。

### 真因
v993 時点で `.stage-wrap` (画面全体) と `.stage` (transform 後の 16:9 領域) **両方に同じ stage-bg.png を `cover` で当てていた**。 これが「**同じ画像が異なるスケールで描画される 2 重貼り**」状態を生み、 stage 内 (例 1024×576) と stage-wrap (1024×768) の境界に **明らかな段差** (= ユーザーが「帯」と認識) が出ていた。

### v1001 の変更
- `.stage` の `background: url('...stage-bg.png') ... cover ...` 行を **完全削除** (= 透明化)
- `.stage-wrap` の background は **温存** (画面全体に画像 1 枚)
- これで stage 内/外の境界に **物理的に継ぎ目が存在しない** 状態に
- saved-layout / fitStage / メディアクエリ / chip サイズすべて温存
- CACHE_VERSION 1000 → 1001
- diff 合計 3 行 (index.html -1 行 + sw.js +1/-1 行)

### 副作用ゼロ確認済み
- UI (board / chip / character / hdr 等) は **stage の子要素として transform で scale される**ので、 画面中央の UI 配置は不変
- board は独自の papyrus テクスチャ画像を持つので、 UI 中央領域は変わらず識別可能
- stage 外の余白領域 (4:3 で上下、 21:9 で左右) は stage-wrap の背景 1 枚で覆われる

### 教訓
**同じ画像を 2 重貼りすると、 スケール差で継ぎ目が見える**。 これは「stage と stage-wrap で同じ絵を使う」設計の落とし穴。 1 枚に統一するか、 完全に異なる画像を使うかのどちらか。 中間 (同じ画像で違うスケール) は避ける。

## v1007 (2026-05-15、 4 帯メディアクエリ完全撤去で内側 UI も画面比不変化)

### 残課題発見
v1000-v1001 で stage scale は 16:9 contain-fit になっていたが、 ユーザーが「クイズが今でもレスポンシブ的な動きをしている」と報告。 調査の結果、 fitStage は v1000 以降で純粋な 16:9 contain-fit になっていたが、 内側 UI が 4 帯メディアクエリ (16:10 / 14:9 / 4:3 / 5:4) で段階的に変形していたのが「レスポンシブ症状」の正体だった。 具体的には `.hdr / .body { grid-template-columns: ... }` の grid 列幅、 `.chip { width: Npx !important }` の chip 強制サイズ、 `.character` 各種が画面比ごとに変わっていた。

ユーザーに撤去範囲を確認 →「4 帯すべて撤去 (内側 UI も画面比で一切変えない)」で方針確定。

### v1007 の変更
- 4 帯 `@media (orientation: landscape) and (max-aspect-ratio:)` ブロック (16:10 / 14:9 / 4:3 / 5:4) を **丸ごと撤去** (244 行削除 → コメントブロック 12 行に置換、 純減 -223 行)
- 撤去対象は `.hdr / .body { grid-template-columns: ... }` の画面比別 grid 列幅、 `.chip { width: Npx !important }` の chip 強制サイズ、 `.character` 各種すべて含む
- 4:3 帯にあった saved-layout.json の値を `!important` で打ち消すブロックも同時撤去
- fitStage 関数内の `aspect-narrow` / `aspect-wide` クラス付与ロジック (4 行) も削除 (対応 CSS が消えてデッドコードになっていたため)
- sw CACHE_VERSION 1006 → 1007 bump
- `saved-layout.json` は **完全無変更** (AGENTS.md §3 厳守)

### 完成した挙動
- stage は完全に 16:9 (1600×900) 固定
- 画面比違いは 100% レターボックスで吸収
- 内側 UI (grid / chip / character) は画面比で一切変わらない (4 帯ごとの段階的変形は完全消滅)

### 副作用 (構造的に発生する仕様)
- 4:3 デバイス (iPad 1024×768) では scale=0.64 で UI 全体が相対的に小さくなる
- 16:10 / 14:9 などの「ほぼ 16:9」帯では saved-layout の grid 設計 (16:9 想定) のまま contain-fit で表示される
- 切れ / はみ出し / 押せないボタン等の機能破綻は構造上発生しない (= 仕様の必然)

### 温存
- `?fit=cover` URL クエリ / `localStorage.pono_fit_mode='cover'` 退避路
- 縦持ち警告 (`@media (orientation: portrait)` の `.landscape-notice`)
- OP シネマティック専用 `@media (min-aspect-ratio: 85/100|14/10|19/10)` クエリ
- saved-layout.json (AGENTS.md §3 厳守、 完全無変更)

### 教訓 (今回の最重要)
- **「stage scale = 16:9」 ≠ 「内側 UI も画面比不変」**。 v998-v1001 でユーザーは「stage が 16:9 になった」のに「クイズがまだレスポンシブ」と感じていた。 これは内側 UI (grid / chip / character) のメディアクエリが残っていたため。 「16:9 固定」を本当に意味通り実現するには、 stage scale だけでなく内側 UI のメディアクエリも全撤去が必要だった
- **「視認性のための温存」は二重の正解を持つ罠**。 v1000 で「4 帯の grid / chip サイズ調整は視認性のため温存」と判断したが、 ユーザーの「常に 16:9」要求は「視認性より一貫性優先」だった。 仕様判断はユーザーに確認するのが正解
- **デッドコードは派生して残る**。 4 帯メディアクエリを消したとき、 fitStage 内の `aspect-narrow` / `aspect-wide` クラス付与は対応 CSS を失ってデッドコードになった。 クロスレビューで指摘されて発見

## v1008 (2026-05-16、 .board の base max-width 絞り撤去で saved-layout WYSIWYG 化)

### ユーザー報告
v1007 適用後、 画面比 2:1 wide (2235×1115) で「左下フレーム (.board / papyrus 紙ボード) が縦長に潰れている」と指摘。 saved-layout 上のデザイナー実態値 (971×503 = 1.93:1) より明らかに縦長 (= 横が絞られている) 比率で描画されていた。

### 真因
- v994 で導入された `.board` ベース定義 `max-width: calc(var(--safe-w, 1600px) - 700px - 16px) = 884px` が、 saved-layout `.board|0.w = 971px` を CSS で **884px に強制絞り** していた。 結果 884×503 = **1.757:1** で描画 (= 縦長に潰れて見える正体)
- これは v994 当時の 21:9 stage (2100×900) における **右ズレ対策** として導入されたもので、 v998 で stage を 16:9 完全固定化した時点で **対策の前提自体が崩れていた潜在問題**。 16:9 stage では saved-layout 971×503 がデザイナー実態値であり、 そのまま描画すべき
- v1007 までで気づけなかった理由:
  - 16:10 帯メディアクエリ (`max-aspect-ratio: 1599/900`) に `.board { max-width: none !important }` の override があり、 狭アスペクト帯では絞りが解除されていた (= 一部画面比では症状が出なかった)
  - wide path (16:9 以上) では base 884 が常に効いていたが、 saved-layout がそれを前提に「右側 87px は a-col 側に意図的に食い込ませる」 設計に見えていた可能性
  - v1007 で 4 帯メディアクエリを全廃したことで `max-width: none !important` も同時に消え、 base 884 絞りの存在が顕在化した

### v1008 の変更
- `quizland/index.html` 行 801 付近の `.board` ベース定義から `max-width: calc(var(--safe-w, 1600px) - 700px - 16px)` の **1 行を削除**
- sw CACHE_VERSION 1007 → 1008 bump
- `saved-layout.json` は **完全無変更** (AGENTS.md §3 厳守)
- diff 合計 2 行 (index.html -1 行 + sw.js +1/-1 行)

### 完成した挙動
- 全画面比で `.board` は saved-layout 971×503 (= 1.93:1) のまま描画
- q-col grid 列 (884px) から 87px overflow するが、 これは saved-layout WYSIWYG エディタでの設計値そのまま
- 「saved-layout で見えている通りに本番でも見える」 = WYSIWYG が成立

### 副作用 (構造的に発生)
- `.board` の右端 (saved-layout tx=22 + w=971 = 993px) が a-col 開始位置 (900px) を **93px 超える**
- ただし a-col 内の chip 2x2 は saved-layout で独自配置されている可能性が高く、 通常重なりは出ない想定
- 万一重なりが顕在化したら、 saved-layout エディタで `.board|0.w` を調整するのが正規ルート (= AGENTS.md §3 厳守、 CSS で打ち消すのは NG)

### 教訓 (今回の最重要)
- **「base 定義の制約」 は時代を経ると本来の前提が崩れる**。 v994 で導入された 21:9 stage 用の右ズレ対策が、 v998 stage 16:9 化で前提自体が崩れていたのに 3 段階 (v998-v1001 / v1007 / v1008) に渡って気づけなかった。 「過去のメモリ ([feature_quizland_contain_fit.md] v994 セクション) を読んで前提変更が base 定義に波及していないか確認する」 を新ルールにすべき
- **メディアクエリ全廃の副作用は wide path にも出る**。 v1007 で「狭アスペクト用の override しか撤去していない、 wide path には影響なし」 と判断したが、 実は狭アスペクトで「base の絞りを解除していた」 つまり「wide path にも絞りが効いていた」 ことを覆い隠していた。 メディアクエリ撤去時は **base 定義側に何があるかも撤去前に確認** すべき
- **「saved-layout はデザイナー実態値、 CSS で絞らない」 が WYSIWYG の本質**。 saved-layout エディタで配置した値が本番で別サイズに化ける時点で WYSIWYG ではない。 AGENTS.md §3 (saved-layout.json は layout-editor 経由でのみ更新) の精神を CSS 側でも徹底する (= saved-layout のサイズを CSS で打ち消さない) のが正解

