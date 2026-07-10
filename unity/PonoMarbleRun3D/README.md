# ポノの マーブルラン 3D

3〜6歳向けの、斜め上から遊ぶ独立3Dマーブルランです。部品を置き、玉を転がし、動きを見て何度でも作り直せます。制限時間・減点・ゲームオーバー・怖い失敗演出はありません。

このUnityプロジェクトは `unity/PonoMarbleRun3D/` だけで完結しています。既存のネイティブゲーム、Web版、ゲーム選択画面には接続していません。アプリ版限定の試作なので、`develop` への同期も行いません。

## すぐに遊ぶ

Unity Editorを開かず、Finderで次をダブルクリックします。

`Builds/macOS/PonoMarbleRun.app`

現在のmacOSビルドはIntel MacとApple siliconの両方を含むUniversalアプリです。ローカル実行用のad-hoc署名を付けて検証済みですが、配布用のDeveloper ID署名・公証は行っていません。

Androidテスト用APKは次にあります。

`Builds/Android/PonoMarbleRun.apk`

## 遊び方

- メニュー: 「あそびかた」「チャレンジ １〜３」「じゆうに つくる」「みほん コース」を選びます。
- 部品を置く: 左の部品を盤面までドラッグします。部品を一度押してから盤面を押す方法も使えます。
- 部品を動かす: 盤面の部品をドラッグします。接続点の近くでは自動でスナップします。
- 回転・削除: 置いた部品を一度押して選び、画面下の「↻ くるっ／みぎに まわす」または「けす」を押します。回転は右へ90度単位です。さかみちは2回押して180度回すと、のぼり向きとくだり向きが入れ替わります。
- Undo・全消去: 「ひとつ もどす」「ぜんぶ けす」を使います。全消去は誤操作防止のため2回押します。
- 試走: 「ためす」で玉を転がします。落下や長時間停止はやさしく知らせ、すぐ「たまを もどす」で再開できます。
- 保存: 「ほぞん」で現在のコースを保存し、「よみこむ」で再編集します。
- カメラ: 空いている盤面をドラッグすると回転、マウスホイールでズームします。タッチでは2本指の移動で回転、ピンチでズームします。「みわたす」で初期位置へ戻せます。
- 一時停止: 「いったん とめる」で時間と3D物理を完全に止め、「つづける」で戻します。

子どもが見る日本語は、ひらがな・カタカナと記号だけです。キャラクター音声は使わず、操作音・リセット音・ゴール音は実行時に生成する非言語効果音だけです。

## モード

- あそびかた: 置く、つなぐ、回す、試す、を短い順番で案内します。
- チャレンジ １: まっすぐ・カーブ・さかみちで自由な経路を作ります。
- チャレンジ ２: トンネルとシーソーを含むコースを作ります。
- チャレンジ ３: ぶんき・じょうご・ドミノを含む複数経路を試します。
- じゆうに つくる: 全10部品を個数制限なしで使えます。スタートとゴールも移動できます。
- みほん コース: 「はじめての みち」「くねくね みち」「そらの はし」「くるくる じょうご」の4種類です。そのまま試走でき、すべての部品を動かす・回す・消す・足す操作で自由に改造できます。

各チャレンジは接続グラフと部品数だけを条件にし、固定の正解配置を持ちません。テストでは各チャレンジに対して異なる2種類、合計6コースが実物理でゴールすることを確認しています。

## 部品

スタート、ゴール、まっすぐ、カーブ、さかみち、ぶんき、トンネル、じょうご、シーソー、ドミノを実装しています。木製玩具を意識した明るい色、木の台、接続ペグとリング、配置前の半透明ゴースト、配置不可時の赤い×表示を使用します。

## 設計

- `Core/MarbleRunData.cs`: コースデータ、部品カタログ、接続点の定義。
- `Core/PlacementSolver.cs`: グリッド境界、占有判定、接続点スナップ、スタートからゴールまでの接続グラフ。
- `Core/CourseHistoryAndStorage.cs`: スナップショット型Undoと一時ファイルを使う安全なJSON保存。
- `Core/ChallengeCatalog.cs`: チュートリアル、3チャレンジ、サンドボックスの部品制限と初期配置。
- `Gameplay/WoodenPieceFactory.cs`: 木製玩具風3D部品、走行Collider、配置判定領域、可動機構の生成。
- `Gameplay/MarbleRunGameController.cs`: 編集、試走、安全復帰、停止、ゴール演出の状態管理。
- `UI/MarbleRunUi.cs`: マウス・タッチ共通のuGUIとSafe Area対応。

コースの正本はシリアライズ可能な `CourseData` です。画面上のGameObjectはデータから再構築するため、Undo・保存・復元後も同じ経路を編集できます。配置照会、走行形状、盤面、玉は専用Physics Layerへ分けています。

### 物理設定

- Unity標準3D物理、Fixed Timestepは1/60秒、Maximum Timestepは1/15秒。
- 玉は `ContinuousDynamic` と補間を使用し、最大速度14 m/s、初速6.8 m/s。
- ソルバー反復10回、速度反復4回。玉だけは12回・5回へ増強。
- 木製レールと玉に低反発・低摩擦の `PhysicsMaterial` を使用。
- さかみちは約16.70度で、1段（0.90 m）の高低差へ正確につながります。180度回すとのぼり向きとくだり向きを切り替えられ、高い接続点へ置いた平面部品は自動で上段へスナップします。
- カーブとじょうごは標準3D物理の衝突を保ちながら、低速停止や高速飛び出しを抑える上限付きの `Rigidbody` 加速度ガイドをトリガー内だけで適用します。
- 玉の落下、盤外、停止を監視し、重複生成せずスタートへ戻します。
- 一時停止中は `Time.timeScale = 0` に加え、Physicsの自動シミュレーションを止めます。
- AndroidはARM64・IL2CPP、MSAA 2x、影距離24、Vulkan/OpenGLES3の順で設定しています。

## 保存先

モードごとに1コースを保存します。4つの見本もそれぞれ別に保存するため、「じゆうに つくる」の内容を上書きしません。macOSのサンドボックス保存先は次です。

`~/Library/Application Support/com.kodamanomori.pono.marblerun3d/MarbleRunCourses/sandbox.json`

破損JSON、空データ、異なるモードのデータは読み込まず、現在のコースを保持します。

## 開発環境

- Unity `6000.3.19f1`
- Built-in Render Pipeline
- uGUI `2.0.0`
- Unity Test Framework `1.6.0`
- npmや外部ビルドツールは不要

Unity Hubからこのディレクトリを直接開きます。最初にメニュー `Pono > Marble Run > Verify Project` を実行すると、シーン、フォント、マテリアル、Physics Layer、Fixed Timestepを検証できます。

## テスト

リポジトリ直下から実行します。

```bash
/Applications/Unity/Hub/Editor/6000.3.19f1/Unity.app/Contents/MacOS/Unity \
  -batchmode -nographics \
  -projectPath "$PWD/unity/PonoMarbleRun3D" \
  -runTests -testPlatform EditMode \
  -testResults "$PWD/unity/PonoMarbleRun3D/Logs/EditMode-results.xml" \
  -logFile "$PWD/unity/PonoMarbleRun3D/Logs/EditMode.log"

/Applications/Unity/Hub/Editor/6000.3.19f1/Unity.app/Contents/MacOS/Unity \
  -batchmode -nographics \
  -projectPath "$PWD/unity/PonoMarbleRun3D" \
  -runTests -testPlatform PlayMode \
  -testResults "$PWD/unity/PonoMarbleRun3D/Logs/PlayMode-results.xml" \
  -logFile "$PWD/unity/PonoMarbleRun3D/Logs/PlayMode.log"
```

確定済みの結果は [TEST_RESULTS.md](TEST_RESULTS.md)、画面確認は [QA/README.md](QA/README.md) にあります。

## ビルド

### macOS

```bash
rm -rf "$PWD/unity/PonoMarbleRun3D/Builds/macOS/PonoMarbleRun.app"
/Applications/Unity/Hub/Editor/6000.3.19f1/Unity.app/Contents/MacOS/Unity \
  -batchmode -nographics \
  -projectPath "$PWD/unity/PonoMarbleRun3D" \
  -executeMethod Pono.MarbleRun3D.Editor.MarbleRunProjectSetup.BuildMacFromCommandLine \
  -buildOutput "$PWD/unity/PonoMarbleRun3D/Builds/macOS/PonoMarbleRun.app" \
  -logFile "$PWD/unity/PonoMarbleRun3D/Logs/Build-macOS.log" \
  -quit
```

ビルド処理は、Finder上の名前を「ポノの マーブルラン」のまま保ちつつ内部実行ファイル名をASCIIへ正規化し、内包ライブラリとアプリへ順番にad-hoc署名を付け、`codesign --verify --deep --strict` まで行います。

### Android

Unity HubでAndroid Build Support、SDK/NDK Tools、OpenJDKを導入してから実行します。

```bash
/Applications/Unity/Hub/Editor/6000.3.19f1/Unity.app/Contents/MacOS/Unity \
  -batchmode -nographics \
  -projectPath "$PWD/unity/PonoMarbleRun3D" \
  -executeMethod Pono.MarbleRun3D.Editor.MarbleRunProjectSetup.BuildAndroidFromCommandLine \
  -buildOutput "$PWD/unity/PonoMarbleRun3D/Builds/Android/PonoMarbleRun.apk" \
  -logFile "$PWD/unity/PonoMarbleRun3D/Logs/Build-Android.log" \
  -quit
```

`Builds/`、`Library/`、`Logs/`、`UserSettings/` は生成物としてgit管理外です。完成したアプリとAPKはこのワークスペースには残りますが、クローン先では上記コマンドで再生成してください。

## ライセンス

日本語表示用にNoto Sans JPを同梱しています。ライセンスは [ThirdParty/NotoSansJP-LICENSE.txt](ThirdParty/NotoSansJP-LICENSE.txt) を参照してください。
