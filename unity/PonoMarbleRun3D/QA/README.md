# QA evidence

macOSプレイヤーから取得した画面と機械可読記録です。通常起動ではQAドライバーも操作プローブも動きません。

## 部品バリエーション追加の正本

- `Screenshots/16x9/variety-menu.png`: 「すぐ ころがす」を先頭にした7項目のメニュー。
- `Screenshots/16x9/variety-samples.png`: 従来4コース＋「トルネード タワー」「エレベーター シティ」の6見本。
- `Screenshots/16x9/variety-edit.png`: 新6部品を含む11部品のスターターコースと、新部品を上部へ並べた19部品パレット。
- `Screenshots/16x9/variety-run.png`: 透明筒からエレベーターへ進む6色の玉。
- `Screenshots/16x9/variety-top.png`: スターターコースの真上表示。
- `Screenshots/4x3/variety-edit.png`: 1024 × 768の編集画面。
- `Screenshots/20x9/variety-edit.png`: 1800 × 810の編集画面。

画面サイズ、状態、部品数、高さ、活動中の玉数は対応する `variety-*.json` に記録しています。

## 新コースの実物理ゴール

- `variety-tornado-physical.json`: 「トルネード タワー」6 / 6玉、13.547秒。
- `variety-elevator-physical.json`: 「エレベーター シティ」6 / 6玉、18.009秒。
- `variety-starter-physical.json`: 新6部品を全て含む「すぐ ころがす」6 / 6玉、19.338秒。

全て最終macOSアプリを1280 × 720で起動し、実際のRigidbody走行とGoalSensorで `Celebrating` へ到達した記録です。

## 新ビルドの通常起動と実クリック

`launchservices-variety.json` は、最終アプリをLaunchServicesで通常起動し、macOSのCGEventで「すぐ ころがす」を実クリックした最終状態です。`state=Editing`、`mode=starter`、`piece_count=11` を確認しました。

## 立体コース画面

- `Screenshots/16x9/vertical-tower-run.png`: 1280 × 720。6色の玉、2段下降ぐるぐる、高架支柱。
- `Screenshots/4x3/vertical-tower-run.png`: 1024 × 768。同じ試走の4:3表示。
- `Screenshots/20x9/vertical-tower-run.png`: 1800 × 810。同じ試走の20:9表示。
- `Screenshots/16x9/vertical-steps-run.png`: 高架カーブと2本のかいだんを使う「そらの まよいみち」。
- `Screenshots/16x9/vertical-lift-run.png`: ぐるぐる、色付きローラーの動力上昇、かいだんを使う「のぼって おりて」。
- `Screenshots/16x9/vertical-lift-top.png`: 同コースの真上表示。全体を見ながら再編集できます。

各PNGと同名のJSONには画面サイズ、ゲーム状態、部品数、選択中の高さ、活動中の玉数を記録しています。

## 実物理ゴール

- `vertical-tower-physical.json`: 「にじいろ タワー」6 / 6玉、10.426秒。
- `vertical-steps-physical.json`: 「そらの まよいみち」6 / 6玉、10.393秒。
- `vertical-lift-physical.json`: 「のぼって おりて」6 / 6玉、13.126秒。

全て最終macOSアプリを1280 × 720で起動し、実際のRigidbody走行とGoalSensorで `Celebrating` へ到達した記録です。

## 通常起動と実クリック

`launchservices-vertical.json` は、LaunchServices経由で通常起動した最終アプリへOSレベルのクリックを送り、次を確認した最終状態です。

- 見本一覧を開く
- 「のぼって おりて」を選ぶ
- 「▲ うえ」で高さを変える
- 高架レールを選ぶ
- 「↻ くるっ／みぎに まわす」で右へ90度回す

## 既存証跡

従来のmenu、edit、invalid、pause、goal、保存再読込、`vertical-*` の画像とJSONも回帰証跡として残しています。今回の部品バリエーション追加で更新した正本は `variety-*` と `launchservices-variety.json` です。詳細結果は [../TEST_RESULTS.md](../TEST_RESULTS.md) を参照してください。
