---
name: feature_maze_rough_to_editor_workflow
description: maze ラフ → エディタ シームレス auto-handoff + edges 一括削除 + start/goal radius 可変 + handoff 画像 rescale + gh proxy 日本語ファイル名対応 + maze-rough PNG インポート (sw v1000)
type: feature
---

# maze ラフ → エディタ シームレス handoff ワークフロー (2026-05-14)

ラフ作成ツール (`tools/maze-rough.html`) で描いたタイル迷路を、 そのままエディタ (`tools/maze-editor.html`) で開いて「画像差し替え + 微調整」 だけで本番化できるシームレス連携を実装したセッションのまとめ。 関連: [[feature_maze_image_stage]], [[feature_maze_rough_maker]], [[feedback_codex_canvas_safe_margin]]。

## 関連 commit (時系列)
1. `eb895e4` — gh proxy URL-encoded 日本語ファイル名対応 + encoded traversal/NUL 追加防御
2. `2395c60` — maze-rough.html に PNG インポート機能追加
3. `ae7bf76` — ラフ → エディタ シームレス auto-handoff (localStorage + sessionStorage)
4. `fe9ce36` — handoff 画像 rescale (viewBox 保持 + sx/sy で nodes/edges/obstacles/creatures 一括変換)
5. `bd4d4d9` — edges 一括削除ボタン + start/goal radius slider + ランタイム描画反映 (sw v999→1000)

---

## 1. gh proxy URL-encoded 日本語ファイル名対応 (bug fix)

### 場所
- `src/worker.js:437-453` の `ALLOWED_GH_PATTERNS` (9 つの正規表現)
- `src/worker.js:494-504` 追加防御 (encoded traversal/NUL)

### 問題
`maze/imageStages/ステージ4_キノコの小道.json` 等の日本語ファイル名が `encodeURI()` 経由で proxy にリクエストされると、 `%E3%82%B9...` の `%` が `ALLOWED_GH_PATTERNS` の文字クラス `[A-Za-z0-9_\-]` に弾かれて 403。

### 修正
9 つの正規表現の文字クラスすべてに `%` を追加して URL-encoded UTF-8 を許可。

### 副作用 + 追加防御
`%` を許可すると `%2E%2E` (encoded `..` path traversal) と `%00` (NUL injection) が通過する可能性がある。 line 494-504 で `decodeURIComponent` 後の path に `..` または `\x00` が含まれていたら 403 にする防御層を追加。

### 学び
URL-encoded 経路のホワイトリスト緩和は、 必ず decode 後の semantic-level チェック (path traversal / NUL / 制御文字) と二段構えにする。

---

## 2. maze-rough PNG インポート (新機能)

### 場所
- `tools/maze-rough.html:400-403` (UI)
- `tools/maze-rough.html:2953-3072` (`_importFromPngImage` + handler)

### 機能
過去にダウンロードした PNG (1920×1080 / 3840×1080、 単パネル/2 パネル両対応) からタイル + start + goal を復元する。

### 復元できるもの
- `COLOR_PATH` `#FAF6E8` (クリーム色) → `tiles[y][x] = 'path'`
- `COLOR_WALL` `#7AB540`/`#6A9F36` (緑市松) → `tiles[y][x] = 'wall'`
- Start: 青円 `#3B8DD9` の重心
- Goal: 赤円 `#D74E4E` の重心

### 復元できないもの (PNG にもとから描かれていない)
- `creatures` (お邪魔虫)
- `waypoints` (中継ノード)
- `obstacles` (障害物)

これらはユーザーが PNG 出力 *後* に追加する想定なので、 PNG からは再構築できない。 別系統 (JSON 保存/ロード) で永続化する。

### 学び
「PNG から復元」 は片道変換であることを UI バナーで明示する。 完全な round-trip 永続化が必要なら JSON 経路を使う。

---

## 3. ラフ → エディタ シームレス auto-handoff (大きな新機能)

### localStorage キー設計
| キー | スコープ | 用途 |
|---|---|---|
| `pono_maze_rough_handoff_v1` | localStorage | handoff データ本体 (ラフ → エディタ 引き継ぎ JSON) |
| `pono_maze_rough_handoff_loaded_v1` | sessionStorage | 同一セッションでの多重ロード抑止フラグ |

sessionStorage を使うのは、 ブラウザタブを閉じれば自動クリアされ次回起動時に再取り込み確認できるため。

### ラフ側 (`tools/maze-rough.html`) の実装
- `_doAutoSave` の末尾で `_doAutoSaveHandoff` を try/catch 並列実行 (autoSave 本体は失敗させない)
- `state.tiles` を BFS で start→goal の最短経路探索 → 方向重複除去で polyline 化
- 経路なし (start/goal が壁で遮断、 または BFS 不能) は 2 点直線フォールバック
- `start` または `goal` の片方でも null なら handoff 書き出しスキップ (既存 handoff JSON を温存して上書きしない)

### handoff JSON 形式
```json
{
  "version": 1,
  "savedAt": <unix ms>,
  "source": "maze-rough.html",
  "panels": 1 | 2,
  "viewBox": { "w": 1920|3840, "h": 1080 },
  "name": "ステージ名",
  "nodes": [
    { "id": "start", "kind": "start", "x": <px>, "y": <px> },
    { "id": "goal",  "kind": "goal",  "x": <px>, "y": <px> }
  ],
  "edges": [
    { "from": "start", "to": "goal", "polyline": [{"x":..,"y":..}, ...] }
  ],
  "creatures": [...],
  "obstacles":  [...]
}
```

**重要**: `imageUrl` は意図的に流さない (ユーザーは AI 生成画像を別途差し替える前提)。

### エディタ側 (`tools/maze-editor.html`) の実装
- 起動時に `_maybeAutoLoadHandoff` で localStorage を検出
- **既存 draft が空** (state.nodes と state.edges が両方 length 0、 imageUrl 未設定) → 自動取り込み + 緑バナー「📥 ラフから取り込みました」
- **作業中** (既存 draft あり) → 緑バナー + 2 ボタン:
  - 「📥 ラフから取り込み」 (空 draft なら自動、 既存 draft あっても明示確認すれば上書き)
  - 「↻ ラフから再取り込み」 (sessionStorage フラグをクリアして再ロード)

### sessionStorage 多重ロード抑止
同一タブ内で handoff JSON を 2 回ロードしないように `pono_maze_rough_handoff_loaded_v1` フラグを set。 ユーザーが「↻ 再取り込み」 を押した時のみフラグをクリアして再 fire。

### 学び
- 「両ツールが localStorage を介して非同期に同期」 パターンは、 単純で堅牢 (postMessage より復元しやすい)
- handoff 書き出し条件 (start/goal 両方ある) を厳しめにすると、 「ラフが未完成なのにエディタ側の作業をリセットしてしまう」 事故が起きない

---

## 4. handoff 画像 rescale (semantics 不一致 fix)

### 問題
- ラフは 1920×1080 固定座標で polyline / nodes を書き出す
- AI 生成画像は別解像度 (1024×576 / 1600×900 / 1536×864 等)
- エディタで画像読み込み → polyline が画像とずれる (例: 1920 → 1024 で 47% 縮む)

### 修正設計
1. handoff JSON に `viewBox: {w, h}` を入れて出す (= ラフ側の固定 1920×1080 を明示)
2. エディタの `state.handoffViewBox` で保持
3. 画像読み込み時 (`loadImageFile`) に `sx = imgW / vb.w`, `sy = imgH / vb.h` を計算
4. nodes / edges (controls + polyline) / obstacles / creatures を一括 rescale
5. `Math.round` で整数化、 完了後 `state.handoffViewBox = null` でクリア (二重 rescale 防止)

### handoff 適用時に画像が既にあれば即時 rescale (両経路で発火)
- 「画像 → handoff」 順: 画像で `imgW/imgH` 確定済 → handoff 取り込み時に即 rescale
- 「handoff → 画像」 順: handoff 時は `handoffViewBox` 保持のみ → 画像読み込み時に rescale 実行

### pushHistory で生座標を残さない
rescale 後に `history` 最新エントリを上書き (undo で 1920 系の旧座標に戻らないようにする)。 これをやらないと「undo で polyline が画像から飛び出す」 事故が起きる。

### クロスレビューで追加された 3 件
1. **HIGH**: undo 履歴上書き (上述)
2. **MEDIUM**: 整数等倍判定 `imgW===vb.w && imgH===vb.h` で no-op (rescale 不要の最適化 + 浮動小数誤差ゼロ化)
3. **MEDIUM**: silent オプションで loadImageFile 経路の二重 draw 抑制 (rescale 中に途中状態が描画されない)

### 学び
**「同じ概念 (radius) を別々の意味で使う」 二重定義事故を、 クロスレビュー (code-reviewer + 動作トレース) で発見できた** → 「事前合意 (JSON schema を Explore で確定)」 + 「事後 cross-validation (両側を別エージェントで読み比べる)」 の二重ガードが効果的。

---

## 5. edges 一括削除 + start/goal radius 可変 (新機能、 ユーザー直接要望)

### 5.1 「✂️ 道をすべて削除」 ボタン
- 場所: resetBtn 隣
- 挙動: `confirm()` ダイアログ → `state.edges = []` → `pushHistory` (undo で復元)
- `nodes` は温存 (start/goal/waypoint は残す)
- 200ms debounce で auto-save

### 5.2 start/goal radius slider
- range: 20-300px, step 5
- node に optional `radius` フィールド追加 (number)
- export 時は `Number.isFinite(n.radius) && n.radius > 0` の時だけ JSON に出力 (= 既存 JSON は radius 不出力で後方互換)

### 5.3 描画ヘルパの一元化
```js
function defaultRadiusForKind(kind) {
  // start/goal = 大きめ、 stop/waypoint = 小さめ
}
function effectiveNodeRadius(n) {
  return Number.isFinite(n.radius) && n.radius > 0
    ? n.radius
    : defaultRadiusForKind(n.kind);
}
```
- `drawNode` / `_drawNodeBoundingBox` / `findNodeAt` の 3 箇所で `effectiveNodeRadius(n)` を使う
- DRY 化で「半径変えたのに hit-test が古い値のまま」 系のバグを排除

### 5.4 ランタイム側 `maze/index.html` の対応
`imgNodeMarkerSize(stage, node)`:
- `node.radius` を 「描画全高 (px)」 として解釈 → `sz = r` (元 `sz = r * 2` から修正)
- 未設定なら fallback `viewBox.h / 6` (既存 JSON 互換)
- `[5, 500]` クランプ

### 5.5 semantics 修正 (= 二重定義事故の発見)
- 元: ランタイム `sz = r * 2` (= radius を「半径」 と解釈、 描画は直径 = 2r)
- エディタ: `radius` を「描画全高 (= 直径)」 として slider 表示・bounding box 描画
- → 同じ JSON 値でもエディタ vs ランタイムで描画サイズが 2 倍ずれる
- 修正: ランタイム `sz = r` に変更 (エディタの「全高」 解釈に合わせる)

### 5.6 handoff rescale 連動
- `start/goal/stop` ノードの radius も rescale 対象
- `Math.min(sx, sy)` で等方スケール (歪まず、 円が楕円にならない)

### sw.js CACHE_VERSION
999 → 1000 bump (maze/index.html を変更したため)

### 学び
- **エディタとランタイムで「同じフィールド名 (radius) を別 semantics で使う」 のは必ず事故る**
- slider 値を ランタイム描画と 1:1 一致させるのは UX の最低ライン
- DRY ヘルパ (`effectiveNodeRadius`) を作ってから各呼び出し箇所を置換する順序で、 漏れを防げる

---

## 重要な設計知見 (将来セッション向け)

### 知見 A: ラフとエディタのデータ構造は全然違う
- **ラフ**: `tiles[y][x]` (2D グリッド) + `start`/`goal` の px 座標
- **エディタ**: `nodes` + `edges` (graph base)、 `type:"image"` 必須、 `viewBox` + `imageUrl` 期待
- **変換関数** (tiles → polyline BFS) が必須 → ラフ側の `_doAutoSaveHandoff` 内で BFS + 方向重複除去で polyline 化

### 知見 B: 座標系の二系統問題
- ラフは 1920×1080 (or 3840×1080) 固定座標
- AI 生成画像は別解像度 (1024×576 / 1600×900 等)
- **解決パターン**: handoff JSON に `viewBox` を入れて、 エディタの画像読み込み時に `sx=imgW/vb.w, sy=imgH/vb.h` で rescale
- 「同じ概念 (radius) を別々の意味で使う」 二重定義事故を、 クロスレビュー (code-reviewer + 動作トレース) で発見できた経験 → semantics の明文化を必ず JSON schema コメントに残す

### 知見 C: 並列実装の整合性確保
- 「事前合意 (JSON schema を Explore で確定)」 + 「事後 cross-validation (両側を別エージェントで読み比べる)」 の二重ガードが効果的
- 3 ファイル並列実装 (maze-rough.html / maze-editor.html / maze/index.html) でも、 schema を先に合意できれば並列で進められる
- 並列タスクでも「シリアル順序を要求するレビュー pass」 を 1 回挟むだけで整合性が担保される

### 知見 D: tools/ は SW バイパス、 maze/ はキャッシュ対象
- `sw.js:35-39` で `tools/`, `admin/`, `/api/` は SW 介在なしで通す
- **tools/ 配下の変更は sw.js bump 不要** (= maze-rough.html / maze-editor.html の変更単独では bump しない)
- **maze/, quizland/ 等は SW キャッシュ対象なので変更時は CACHE_VERSION bump** (= 今回 maze/index.html の radius semantics 修正で 999→1000)

### 知見 E: localStorage 経由の非同期 handoff パターン
- postMessage や URL params より、 localStorage + sessionStorage の組み合わせの方が
  - 復元しやすい (タブを閉じても残る)
  - 二重ロード抑止しやすい (sessionStorage フラグ)
  - 「片方のツールでは未完成、 もう片方はそれを取り込まない」 が制御しやすい (条件付き書き出し)
- ただし quota error (画像 dataURL > 5MB 等) には注意 → handoff JSON は画像を流さない設計が安全

---

## 検証チェックリスト (将来の改修時)

### ラフ → エディタ シームレス連動
- [ ] ラフで道を描く → エディタタブを開く → polyline が自動取り込みされる
- [ ] エディタで画像を読み込む → polyline が画像にフィットして表示される
- [ ] エディタで undo → rescale 後の座標で戻る (= 1920 系の旧座標は履歴に残らない)
- [ ] ラフで道を変える → エディタタブ更新 → 「↻ ラフから再取り込み」 で最新反映
- [ ] ラフで start/goal を片方消す → エディタの既存 handoff が温存される (上書きされない)

### radius
- [ ] エディタ slider で radius=100 → ランタイムで描画全高 100px の start マーカー
- [ ] JSON export → radius=100 が出力される (未指定なら不出力)
- [ ] 既存 JSON (radius 未指定) を読み込み → 旧 fallback (viewBox.h/6) で描画

### gh proxy
- [ ] `maze/imageStages/ステージ4_キノコの小道.json` を gh proxy 経由で PUT できる
- [ ] `maze/imageStages/%2E%2E/etc/passwd` 系のリクエストが 403 で弾かれる
- [ ] `maze/imageStages/foo%00.json` 系の NUL injection が 403 で弾かれる

---

## 関連ファイル
- [tools/maze-rough.html](../tools/maze-rough.html) — ラフ作成 (handoff 書き出し側)
- [tools/maze-editor.html](../tools/maze-editor.html) — エディタ (handoff 取り込み側 + radius slider + edges 削除 + handoff rescale)
- [maze/index.html](../maze/index.html) — ランタイム (`imgNodeMarkerSize` radius 描画反映)
- [src/worker.js](../src/worker.js) — gh proxy (ALLOWED_GH_PATTERNS + encoded traversal 防御)
- [sw.js](../sw.js) — CACHE_VERSION 999→1000 bump

## 関連 memory
- [[feature_maze_image_stage]] — 画像ベースステージ Phase 1/2 (本機能の前提)
- [[feature_maze_rough_maker]] — ラフ作成ツール (本 handoff の起点)
- [[feedback_codex_canvas_safe_margin]] — 画像生成時の外周ぼかしルール (handoff 画像差し替えで重要)
- [[feedback_auto_commit_hook_rebase_risk]] — auto-commit hook 経由で develop に流すので関連
