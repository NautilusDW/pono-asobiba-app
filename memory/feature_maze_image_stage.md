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

## Phase 2 (実装済み — 2026-04-27 同日追加)
- ✅ **アンカー点ドラッグ編集**: エディタの「✏️ ポイント編集」モードで既存の道のアンカー (中間点) を後からドラッグして微調整可能。pointer events で実装
- ✅ **本番に保存ボタン**: エディタの「💾 本番に保存 (commit)」が `/api/gh/` 経由で GitHub Contents API で `maze/imageStages/<name>.json` + 画像 + `_index.json` の 3 ファイルを develop に直接 PUT。Basic Auth は `/tools/` の認証が再利用される
- ✅ **`_index.json` overrides**: ランタイム起動時に `imageStages/_index.json` を fetch し、`{ "overrides": { "1": "forest_entrance" } }` 形式で STAGES の指定 slot を image ステージに差し替え or 末尾追加
- ✅ **公式フラグ `_official`**: `_index.json` 経由で読み込まれた image ステージのみ acorn / first-clear 報酬対象。`?image=<name>` の一回限りプレビューや `?image=__draft__` は報酬対象外 (報酬ファーミング対策)
- ✅ **🌙 ランタンの夜モード**: stage def に `lantern: true` (or 詳細オブジェクト) を入れると、ランタイムがポノを中心にラジアルグラデーションで「ランタンの灯」エフェクトを描画。「夜の演出」=迷路全体は青いフィルター越しにうっすら見える状態を保ち、ランタンの中心だけ明るく原色で見える設計。デフォルト値: `tintA=0.55` (半透明、向こうが透ける)、`tintR/G/B = 8,22,60` (青い夜)、`inner=10%短辺` / `outer=30%短辺` (狭めの光円 + 短いフェード)。ポノ近傍に暖色グロウ (`rgba 255,220,130`、additive blend)。微弱な脈動 (`sin(now/400)`) で炎のゆらぎ。エディタに「🌙 夜モード」チェックボックス。詳細チューニングは `lantern: { innerRadius, outerRadius, tintR/G/B/A, warmth }` のオブジェクト形式で。**過去の値 (tintA=0.94) は迷路が見えなくなりすぎたためトーンダウン → さらに `tintA=0.35` / `inner=6%` / `outer=18%` まで明るく+小さく調整 (2026-04-27)**。色は `10,28,70` のさらに深いブルー
- ✅ **`?stage=N` URL パラメータ**: ランタイム起動時に `?stage=N` があれば、その slot から始める (チュートリアル経由なし)。エディタの「💾 本番に保存」成功後に `?stage=N` で直接開くか確認するダイアログを表示。テスト時にチュートリアルから毎回プレイし直さずに済む
- ✅ **オーバーレイ「スタート ▶」ボタンの loadStage(0) 削除**: 以前は init で正しい slot を loadStage しても、オーバーレイの「スタート ▶」をクリックすると `loadStage(0)` を再呼び出しして slot 0 (チュートリアル) にリセットされてしまう不具合があった (「一瞬新しい画面が出るけど前の迷路に戻る」現象の原因)。クリック時は `hideOverlay()` のみ実行する形に修正
- ✅ **障害物 (obstacles) 配置 + 通行不可**: stage def に `obstacles: [{kind, x, y}]` を追加。`kind` は `tree`/`pond`/`hole`/`stump`/`rock` の 5 種類で、既存の `assets/images/maze/` の画像を使用。エディタの「🌳 障害物」モード + 種類サブボタンで配置。**歩行中に障害物の半径 (viewBox.h/18) 内に入ると `_checkObstacleCollision` でバウンス → 1 つ前のノードに戻る + ヒント「🚫 [木が/みずたまりが/...] とおれない！べつの みち を ためそう」表示**。ミニゲーム無し (障害物は交渉不能)
- ✅ **お邪魔虫 (creatures) + じゃんけんミニゲーム**: stage def に `creatures: [{id, kind, x, y}]` を追加。`kind` は `mayoi`/`odoke`/`nemuri`/`pyon` の 4 種類 (Phase A は全部じゃんけん、Phase B でクイズ等に拡張予定)。歩行中にお邪魔虫の半径内に入ると `_checkCreatureCollision` が `_triggerEncounter` を発火 → モーダル表示 → じゃんけん (グー/チョキ/パー、CPU はランダム、あいこ で再戦)。勝ち=お邪魔虫消滅 (`_defeatedCreatures` Set に追加) + walk 再開、**負け=walkAnim.startNodeId (この walk を開始したノード) にバウンス + 矢印再表示** (以前は stage.start に戻していたが懲罰的すぎたため 1 つ前のノードに変更, 2026-04-27)。Reward への影響は無し (image ステージは _official フラグでのみ報酬対象)
- ✅ **ポノを `pono_lantan.png` に固定 (image ステージのみ)**: 歩行スプライトシートの差し替え (front/side, 25/35 frames) を image ステージでは使わず、ランタンを持つ円形ポノアイコン (`pono_lantan.png`, 1024x1024) を viewBox.h/9 サイズで描画。歩行中だけ軽い上下バウンス (`sin(now/130)`)。グリッドステージは従来通り歩行アニメ維持
- ✅ **エディタの localStorage 自動保存**: `pono_maze_editor_draft_v1` キーで `state.nodes/edges/obstacles/creatures + stage 名/番号/lantern + 圧縮画像 dataURL (1600px Q70 JPEG, 4MB 上限)` を 800ms debounce で自動保存。ページ再読み込み時に自動復元 (バナーで「約 N 分前の状態を復元」表示)。`pushHistory` をラップして node/edge/obstacle/creature の各操作後に保存 + ステージ名/番号/lantern 入力にも `input/change` リスナで連動。「↺ ぜんぶリセット」で localStorage も削除。サイドバー status エリアに「💾 自動保存済み (XX KB)」表示で動作確認可能
- ✅ **スタート/ゴール マーカー画像**: 物語設定の世界観に合った装飾アセット (`assets/images/maze/marker_start.png`「スタート」フレーム, `marker_goal.png`「ゴール」アーチ) を start/goal ノード位置に描画。ランタイム (image ステージ): obstacles/creatures より下のレイヤーに、`viewBox.h / 6` サイズで縦横比保持して描画。エディタ: 同じ画像を `state.imgH / 6` サイズで描画 (start=オレンジ環、goal=緑環の薄いアウトラインつき) してクリック中心が分かるようにする。stop ノードは従来通り白丸 + id ラベル
- ✅ **チュートリアル (旧 STAGES[0]) 削除**: 「チュートリアル — やじるしを おしてみよう」のグリッドステージを `maze/index.html` の STAGES から完全削除 (11 → 10 ステージ)。物語が「ポノと まよいの森の ランタン」(画像ベース) に切り替わったため、旧 grid 用チュートリアルは不要。`maze/imageStages/_index.json` の overrides キーも slot 1 → slot 0 に繰り上げ。これにより `?stage=0` がデフォルトの最初のステージ = ユーザーの image ステージになり、チュートリアル経由なしで遊べる (2026-04-27)
- ✅ **旧 grid ステージ完全削除**: 残ってた 10 個のグリッドステージ定義 (「ステージ 1 — どっちに いく？」～「ステージ 10 — さいごの もり」) も削除し `STAGES = []` で初期化。`_loadImageStageIndex()` が `_index.json` の overrides を auto-pad で push するように変更 (slot 0 が空でも slot 1 から始められる)。`loadStage()` に null ガード追加 — 該当 slot が null なら最初の有効な image ステージにフォールバック。`_getInitialStageIdx()` のデフォルトは 1、`?stage=0` も拒否 (方針一貫)。`#imgStageLabel` のロジックを反転: 常時表示が基本、grid モード時のみ非表示
- ✅ **お邪魔虫ミニゲーム拡充 Phase B (4 種追加)**: じゃんけんに加えて以下 4 種を実装。`_currentCreature` グローバルと `_GAME_STARTERS` ディスパッチ表で `_showEncounterStart()` から分岐。各お邪魔虫の `kind` に `defaultGame` を割り当て (mayoi=janken / odoke=truefalse / nemuri=silhouette / pyon=simon)。stage def の `creatures[].minigame` で個別オーバーライド可能 (ホワイトリスト検証)
  - **シルエットクイズ**: 黒シルエット 1 つ + 3 択 (絵文字)。お題プール 20 問
  - **○×クイズ**: 短文 + 絵文字 + ⭕❌ 2 択。お題プール 30 問
  - **なかまはずれ**: 4 つの絵から仲間外れ 1 つ選択 + ヒント表示。お題プール 20 セット
  - **リズムまね (Simon Says)**: 4 色のセル (🔴🔵🟢🟡) が順番に光る → 同順タップで再現。Web Audio で 440/523/659/784 Hz の sine wave。`_simonCancelled` フラグで遅延 timer の DOM 汚染防止
  - 共通 `_resolveQuiz(correct)` で結果表示 → 「すすむ ▶」「もどる ▶」ボタン → `_closeEncounter(true|false)` 呼び出し
  - dialog 表示は `innerHTML` から `textContent + <br>` DOM 構築に変更 (XSS 緩和)

## Phase 2 計画 (未着手)
- `maze/maze-thinning.js` — 大津法二値化 + Zhang-Suen 細線化 + BFS パス追跡 + Douglas-Peucker
- エディタへの「自動エッジ追跡」ボタン追加 (現在は polyline をクリックで手描き)
- ホタルの実 / まよいムシ ノード対応 (現在は start/goal/stop のみ)
- ノードのドラッグ移動 (現在はノードは削除 → 配置し直しのみ)
- スロット並び替え (現在は `_index.json` を手で書き換える必要あり)

## 既知の制限 (Phase 1)
- りんご収集・charm システムは画像ステージ未対応
- ステージ進行 (acorn・初回クリア報酬) からは隔離されている
- 画像ステージは現状 `?image=<name>` URL でしか到達できない (通常進行に組み込まない方針)
