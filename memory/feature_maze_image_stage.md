# 迷路 — 画像ベースステージ Phase 1

**追加日**: 2026-04-27
**状態**: Phase 1 (最小遊べる) 完了 / Phase 2 (エディタ + 細線化) 未着手

## 概要
従来のグリッドタイル迷路 (直進+L字のみ) に加え、AI生成画像を背景にしたポリライン歩行ステージを並列導入。曲がり道・大カーブ・緩急のあるカーブを「画像のまま」表現でき、横画面 (landscape) 専用、キャラクター中央維持のカメラ追従スクロール対応。

## ステージ追加ワークフロー (推奨)
1. **AI で迷路画像を 16:9 で生成** (1画面=1920×1080 〜 2画面=3840×1080 等)
2. **エディタを開く**: ブラウザで `tools/maze-editor.html`
3. **画像をドロップ** → ステージ名を入力 (英数字・_-)
4. **ノード配置**: スタート/ゴール/中継ノードを画像上にクリックで置く
5. **道を描く**: ノード A → アンカー点を順にクリック → ノード B で確定 (Esc で取消)。アンカー点を通る Catmull-Rom 曲線で繋がる
6. **「▶ 迷路で試す」でドラフトプレビュー**: sessionStorage 経由で新タブを開いて即試遊。コミット/デプロイ不要
7. OK なら **「💾 JSON ダウンロード」** → `maze/imageStages/<name>.json` に配置
8. **画像コピー** → `maze/imageStages/<name>.<ext>` に配置 (元の拡張子)
9. コミット → auto push → GH Actions → staging に反映 → `maze/?image=<name>` で遊べる

### ドラフトプレビュー (`?image=__draft__`)
- エディタの「▶ 迷路で試す」が `sessionStorage` に def + image dataURL を入れて新タブを開く
- 新タブは window.open() で開かれた同オリジン子タブなので、sessionStorage を継承
- maze/index.html の `_loadImageStageFromURL` が `raw === '__draft__'` を特別扱いして storage から読み込む
- 画像が大きい (>5MB) と quota error → JSON だけ渡し、画像はサーバーの `imageUrl` から fetch (forest_entrance.png は既にサーバーにある)

## アクセス方法
URL: `maze/?image=<name>` で `maze/imageStages/<name>.json` を読み込む。

- ファイル名は `[A-Za-z0-9_-]+` のみ許可 (パストラバーサル対策)
- JSON `type` が `'image'` でない場合は読み込み拒否
- パラメータが無い/読み込み失敗時は通常のグリッドステージ (既存11ステージ) にフォールバック

PoC サンプル: `maze/?image=sample1` (3840×1080, 4ノード, 3エッジ, 横スクロール例)

## ファイル構成
- [maze/image-runtime.js](../maze/image-runtime.js) — `window.MazeImage` モジュール (純JS, 外部依存なし)
- [maze/imageStages/sample1.svg](../maze/imageStages/sample1.svg) — PoC 画像
- [maze/imageStages/sample1.json](../maze/imageStages/sample1.json) — PoC ステージ定義
- [maze/index.html](../maze/index.html) — `stage.type === 'image'` ディスパッチを追加 (240行追加, 既存無改変)
- [tools/maze-editor.html](../tools/maze-editor.html) — クリックでノード/道を定義する単独ページのエディタ (Phase 1.5)。SW キャッシュ対象外なので開発で常に fresh。**Catmull-Rom スプライン曲線対応** — クリックしたアンカー点を滑らかな曲線が通る。アンカー 2 個 = 直線、3 個以上 = 曲線。書き出し時に densify されて `polyline` フィールドに、`_editor.controls` にアンカー保持で再編集ロスレス

## ステージ JSON フォーマット
```json
{
  "type": "image",
  "name": "ステージ名",
  "imageUrl": "imageStages/<name>.svg",
  "viewBox": { "w": 3840, "h": 1080 },
  "orientation": "landscape",
  "cameraFollow": true,
  "nodes": [
    { "id": "start", "x": 200,  "y": 540, "kind": "start" },
    { "id": "mid1",  "x": 1300, "y": 540, "kind": "stop"  },
    { "id": "goal",  "x": 3640, "y": 540, "kind": "goal"  }
  ],
  "edges": [
    { "from": "start", "to": "mid1", "polyline": [{"x":200,"y":540}, ...] }
  ]
}
```
- `kind` は `start` / `stop` / `goal` のいずれか
- `polyline` の最初と最後の点は両端ノード座標と一致させる
- 数値は `Number.isFinite` チェックされる (NaN/Infinity 拒否)
- エッジは双方向 (戻ることもできる)

## 実装上の重要ポイント
1. **既存グリッドステージは 1 行も振る舞いを変えない** — `stage.type === 'image'` ガード前提のディスパッチ。`buildStage()` の戻り値に `type: 'grid'` を追加した点だけ注意。
2. **歩行**: 矢印タップ → 現在ノードから出るエッジのうち、最初のセグメントの角度が矢印方向に最も近いもの (60° 以内) を選択。
3. **カメラ**: `lerp = 1 - exp(-dt * 8)` で時間非依存スムージング。画像端で clamp。
4. **スプライト**: 既存の歩行スプライト (front/side sheets) を `tangentToFace` で 4 方向に量子化して再利用。
5. **報酬の隔離**: `onClear()` は image ステージで `addAcornsDaily` / `triggerFirstClearReward` をスキップする (報酬ファーミング対策)。
6. **charm 系 (hint/breeze/warp)**: image モードでは UI 非表示 + 関数冒頭で early return。

## Phase 2 計画 (未着手)
- `maze/maze-thinning.js` — 大津法二値化 + Zhang-Suen 細線化 + BFS パス追跡 + Douglas-Peucker
- エディタへの「自動エッジ追跡」ボタン追加 (現在は polyline をクリックで手描き)
- エディタへの「既存 JSON を読み込んで編集再開」機能
- ホタルの実 / まよいムシ ノード対応 (現在は start/goal/stop のみ)

## 既知の制限 (Phase 1)
- りんご収集・charm システムは画像ステージ未対応
- ステージ進行 (acorn・初回クリア報酬) からは隔離されている
- 画像ステージは現状 `?image=<name>` URL でしか到達できない (通常進行に組み込まない方針)
