---
name: クリーンエッジスタジオ タイムライン再生機能
description: 分割スプライトをID連番順にタイムライン配置してFPS+各コマフレーム数で即時再生する機能。歩きアニメ等の連番素材の動作確認用。
type: project
---

# クリーンエッジスタジオ タイムライン再生機能

## 目的
歩きアニメ等の連番素材を作るとき、「分割→眺める→ダメなコマだけ作り直し→もう一度眺める」反復のコストを下げる。スプライト分割直後にその場で連続再生して動きを確認できるようにした。

**Why**: 従来は分割した素材を別ツールに書き出さないと動きが見えなかった。LP用ループ素材や水族館の生き物アニメなど、連番素材の用途が増えてきたため反復ループを内製化する必要があった。

**How to apply**: クリーンエッジスタジオ ([tools/creature_studio.html](../tools/creature_studio.html)) に新機能を追加するときは、既存の `sprites = []` 配列に乗ってデータを共有する。タイムラインは独立したUIではなくタブとして同居させ、`renderSpritesGrid()` 経由で自動同期される。

## 実装場所
- **HTML/CSS/JS**: [tools/creature_studio.html](../tools/creature_studio.html) 1ファイル内
- データソース: 既存の `sprites = []` (`{canvas, srcX, srcY, w, h, name, id, ...}`)

## 主要コンポーネント

### 1. スプライトグリッドの手動並び替え
- 各 `.sprite-card` の `.card-preview` (サムネ画像) を `draggable=true` にしてハンドル化
- card 全体は drop ターゲット
- 既存の card-hdr クリックドラッグ選択 (pointerdown ベース) と衝突しない
- ドラッグ後に `sprites.splice(from,1) + splice(to,0,moved)` → `renderSpritesGrid()` で再描画
- 並び替え後に「📝 連番」ボタンを押せば現在の順で `_001, _002…` が振られる

### 2. タイムラインタブ
- タブバーに `data-tab="timeline"` ボタン追加
- 上部コントロール: ▶ ⏸ ⏹ / 🔁ループ / 🔂ピンポン / FPS / 各コマfr / 背景
- 中央: `<canvas id="timeline-canvas">` (ステージサイズに自動合わせ)
- 進捗バー: クリックでシーク
- フィルムストリップ: 各セルに サムネ + #連番 + frames個別オーバーライド + 🎯比較タブジャンプ

### 3. Timeline モジュール (`const Timeline = {...}`)
- `_seqNum(sp)`: ID/name 末尾の数字を抽出。なければ `Infinity` でカード順 fallback
- `getOrder()`: 連番昇順 (同値は配列順) で sprite idx を返す
- `getTotalFrames()`: 全コマの frames 合計
- `spriteAtFrame(f)`: 累積で frame 番号 → sprite idx
- `play()`: requestAnimationFrame ループ。`startTs = now - (pausedFrame/fps)*1000` で再開精度
- ループ/ピンポン: `frame % total` または `cyc - frame` で折り返し
- `pause()` 時に経過時間から現在フレームを計算して `pausedFrame` に保存
- `seek(frame)` で進捗バークリックに対応
- `visibilitychange` でタブ非表示中は自動 pause、戻ったら再開

### 4. 比較タブハイライト (`highlightSpriteInCompare(idx)`)
- `#box-proc` を `position: relative` 化、内部に `.sprite-highlight` div を配置
- canvas の表示スケールを計算して矩形位置を当てる
- `box.scrollTo()` で該当箇所までスクロール
- パルスアニメ (`@keyframes spriteHighlightPulse` 1.4s × 3) で一時的に強調 → 5秒で自動消し

### 5. 連携ポイント
- `renderSpritesGrid()` 末尾で `Timeline.refresh()` を呼ぶ → スプライト数変動が即反映
- タブ切替ハンドラで `data-tab="timeline"` 選択時に `Timeline.bindEvents()` + `Timeline.refresh()`
- `Timeline.bindEvents()` は `bound` フラグで初回のみ動作

## ID 連番ルール
- 「📝 連番」ボタン: 選択中のスプライトに `<base>_001, <base>_002, ...` を振る
- Timeline はそれを末尾の `(\d+)` で抽出してソート
- 連番付けの前にカードをドラッグして並び順を整える ワークフローが推奨

## 注意点
- `card-preview` 自体に `position: relative` が必要 (drag ハンドルアイコン `::after` 用)
- `.compare-canvas-box` には `position: relative` を追加 (sprite-highlight の親)
- タイムライン canvas は `imageSmoothingEnabled = false` でドット絵向きに描画
- 大量スプライト時のサムネは 84×60 で 1 度生成のみ
- HTML/CSS/JS を変更したので `sw.js` の `CACHE_VERSION` bump 必須

## 検証
1. 適当な歩きアニメ風画像 → 背景除去 → 分割
2. スプライトタブでサムネをドラッグして任意順に並べ替え
3. 「📝 連番」で `walk_001, walk_002…` 命名
4. タイムラインタブ → 連番順で並び再生
5. FPS 12 / frames 1, FPS 24 / frames 2 などで尺確認
6. 個別セルの frames を上げてそこだけ滞在を長くできるか
7. 🎯 ボタンで比較タブの元矩形にハイライト + スクロールするか
