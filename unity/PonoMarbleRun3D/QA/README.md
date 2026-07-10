# QA evidence

macOSプレイヤーから取得した画面と機械可読記録です。通常起動ではQAドライバーも操作プローブも動きません。

## batch:1175e の正本

今回の正本は、`pastel-*`、`camera-*`、`gravity-*` のPNG／JSONです。以前の `variety-*` と `vertical-*` は回帰比較用に残しています。

## パステル表示と3画面比率

- `Screenshots/16x9/pastel-edit.png`: 1280 × 720。28部品の「すぐ ころがす」、level 0〜4の多層交差、19部品パレット、クリーム／パステル玩具表現。
- `Screenshots/4x3/pastel-edit.png`: 1024 × 768。左パレット、上部の高さ操作、下部編集UIとコースが重ならないことを確認。
- `Screenshots/20x9/pastel-edit.png`: 1800 × 810。横長画面でも全体fit、上下の道、操作UIを判別できることを確認。

対応する `pastel-edit-16x9.json`、`pastel-edit-4x3.json`、`pastel-edit-20x9.json` には、画面サイズ、状態、部品数、選択中の高さ、カメラターゲット／距離を保存しています。全て `state=variety-edit`、`game_state=Editing`、`piece_count=28` です。

## 試走中カメラ

- `Screenshots/16x9/camera-follow.png`: 試走しながら6玉を自動追従している画面。
- `camera-follow-physical.json`: `game_state=Running`、`piece_count=28`、`active_marbles=6`、`camera_follow=true`。玉群に合わせてターゲットがコース全体位置から移動したことを記録。
- `Screenshots/16x9/camera-overview.png`: 同じ試走で「みわたす」へ切り替えた画面。
- `camera-overview-physical.json`: `camera_follow=false`。コース全体の既定ターゲットとfit距離へ戻ったことを記録。
- `manual-camera-input.json`: 最終macOSアプリへCGEventのドラッグ、ホイール、ボタンクリックを送り、試走中の角度・距離・追従状態が実際に変わった値を記録。

試走中、停止中、ゴール演出中も、マウス／1本指ドラッグで回転、ホイール／2本指ピンチでズームできます。「おいかける／みわたす」で自動追従と全景を切り替えます。

## 重力整合コースの実物理ゴール

全て最終macOSアプリを1280 × 720で起動し、実際のRigidbody走行とGoalSensorで `Celebrating` へ到達した記録です。

- `gravity-starter-physical.json`: 28部品の「すぐ ころがす」。level 0〜4、上段／下段の交差、さかみち、かいだん、エレベーター、トルネードを通り、6 / 6玉、25.036秒。
- `gravity-sample5-physical.json`: 21部品の「トルネード タワー」。盤面を曲がりながら高架から3段下降し、6 / 6玉、19.034秒。
- `gravity-sample6-physical.json`: 22部品の「エレベーター シティ」。3段上昇、上段走行、3段下降、上下交差を通り、6 / 6玉、22.515秒。
- `gravity-flat-inertia.json`: 9部品の平坦な「はじめての みち」。スタート台を下った時の運動エネルギーと慣性だけで、6 / 6玉、13.536秒。
- `Screenshots/16x9/gravity-starter-goal.png`: 28部品コースで6玉全てがゴールした最終画面。

通常カーブ、透明筒／カーブ、波、じょうご、ぐるぐる／トルネード、回転羽根は前進速度を生成しません。走行面へ戻す受動拘束だけを使い、上昇エネルギーを加えられる部品は「のぼる みち」と「エレベーター」だけです。受動拘束が補正後速度へ正の仕事をしないことと、螺旋を両方向へ通れることはEditModeでも検査しています。

## 記録の読み方

各JSONの主な項目は次のとおりです。

- `passed`: QA条件を満たしたか。
- `game_state`: `Editing`、`Running`、`Celebrating` などの状態。
- `piece_count`: 読み込んだコースの部品数。
- `active_marbles` / `marbles_at_goal`: 活動中の玉数とゴール数。
- `camera_follow`: 自動追従が有効か。
- `camera_target` / `camera_distance`: 撮影時のカメラ中心と距離。
- `details`: ゴール秒数、追従ターゲットなど、そのQA固有の値。

## 回帰証跡

従来のmenu、edit、invalid、pause、goal、保存再読込、`vertical-*`、`variety-*` の画像とJSONも、既存操作や旧コースとの比較用に残しています。今回の完了判定では上記 `pastel-*`、`camera-*`、`gravity-*` を優先してください。

詳細なテスト範囲と未確認事項は [../TEST_RESULTS.md](../TEST_RESULTS.md) を参照してください。
