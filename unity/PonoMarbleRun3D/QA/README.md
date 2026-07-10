# QA evidence

macOSプレイヤーから取得した画面と機械可読記録です。通常起動ではQAドライバーも操作プローブも動きません。

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

従来のmenu、edit、invalid、pause、goal、保存再読込などの画像とJSONも残しています。今回の立体化で追加・更新した正本は上記 `vertical-*` と `launchservices-vertical.json` です。詳細結果は [../TEST_RESULTS.md](../TEST_RESULTS.md) を参照してください。
