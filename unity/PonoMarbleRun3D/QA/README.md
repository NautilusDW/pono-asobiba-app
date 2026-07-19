# QA evidence

macOS完成プレイヤーから取得した画面と機械可読記録です。通常起動ではQAドライバーも操作プローブも動きません。

## batch:1175g の正本

今回の完了判定では、`pastel-camera-icons-*` のPNG／JSONを正本とします。1175fの `cute-*`、1175eの `pastel-*`／`camera-*`／`gravity-*`、それ以前の `variety-*`／`vertical-*` は回帰比較用です。

## 4色パステル・画像パレット・操作アイコン

- `Screenshots/16x9/pastel-camera-icons-edit-final.png`: 1280×720。紙色と4色パステル、Kosugi Maru、実際の3D部品を写した左パレット、絵主体の操作ボタン、28部品・level 0〜4のコース。
- `Screenshots/4x3/pastel-camera-icons-edit-final.png`: 960×720。狭い横幅でも部品画像、14pxの名前／残数補助、下部操作列が重ならない状態。
- `Screenshots/20x9/pastel-camera-icons-edit-final.png`: 1600×720。横長でもコース全景と操作アイコンを判別できる状態。
- `pastel-camera-icons-edit-final.json`、`pastel-camera-icons-edit-4x3-final.json`、`pastel-camera-icons-edit-20x9-final.json`: 全て `passed=true`、`game_state=Editing`、`piece_count=28`。

左パレットの透明PNG 19種は、`WoodenPieceFactory` の実形状からUnity Editorで1回だけ生成したアセットです。完成プレイヤーはPNGを読むだけで、サムネイル用Camera／RenderTextureを作りません。この点はPlayModeテストでも検査しています。

操作ボタンはGPT Image 2で生成した12操作の4×3アトラスを使用します。Unity配置版 `Assets/Resources/UI/MarbleActionIcons.png` は724×543 px、562,866 bytesです。絵を主役にし、意味を補う箇所だけ短いかなを添えています。生成時の生素材は `tmp/alpha_pending/1175g-marble-run-pastel-camera/` に保存しています。

## 緩やかな先読みカメラ

- `Screenshots/16x9/pastel-camera-icons-run-early-final.png`: 試走前半。6玉へ近づき、次のコースが見える斜め角度から追従。
- `pastel-camera-icons-run-early-final.json`: `camera_follow=true`、Yaw 83.11°、Pitch 38.02°、距離13.50、ターゲット `(5.58, 4.35, -6.07)`。
- `Screenshots/16x9/pastel-camera-icons-run-mid-final.png`: 15秒・トルネード付近。玉が螺旋内で別方向へ動いていても、カメラは細かな動きへ追随せず全体を表示。
- `pastel-camera-icons-run-mid-final.json`: `camera_follow=true`、Yaw 94.76°、Pitch 38.88°、距離14.24、ターゲット `(9.40, 3.66, -6.73)`。6玉の位置と瞬間速度も `details` に保存。

前半記録から約8.8秒後のトルネード記録までのYaw差は11.65度です。6玉の瞬間速度が互いに反対向きでも、螺旋一周ごとにカメラが振られず、全体をゆっくり追うことを確認しました。

実装上は距離11.5〜16、Pitch 36〜40度を維持し、玉群の外れ値を除外します。速度は1.2秒、方向は1.5秒で平滑化し、進路決定の78%を先のコースから得ます。Yawは通常10度／秒、最大12度／秒です。0.20秒間隔で正面と左右35度・70度へSphereCastし、壁で隠れそうな場合は次の進路が見える側を選びます。左右の選択は1.35秒保持し、手動操作後は3.5秒自動復帰を保留します。境界値と遮蔽候補の選択はEditModeで検査しています。

## 28部品コースの実物理ゴール

- `pastel-camera-icons-variety-physical-final.json`: `passed=true`、`game_state=Celebrating`、`piece_count=28`、`active_marbles=6`、`marbles_at_goal=6`、`starter_goal_seconds=25.130`。

level 0〜4、3段上昇エレベーター、3段下降トルネード、上下交差、透明筒／カーブ、波、回転羽根を含む全部入りコースです。6色全てが実際のRigidbody走行とGoalSensorでゴールしています。

## Finder相当の通常起動

- `pastel-camera-icons-launchservices-final.json`: LaunchServicesから完成 `.app` を起動し、1280×720のメニューへ入り、`passed=true`、正常終了した記録。
- `Logs/pastel-camera-icons-launchservices-final.log`: 上記起動のPlayerログ。

macOS実行ファイルはx86_64＋arm64のUniversal、ad-hoc署名済みで、`codesign --verify --deep --strict` に成功しています。実行ファイルSHA-256は `8def910aaccddf5032b010573feeef86ac52105981995d18f138d1eea8e80311` です。

## 自動テストとAndroid成果物

- `TestResults/EditMode.xml`: 75 / 75成功。
- `TestResults/PlayMode.xml`: 28 / 28成功。
- `Builds/Android/PonoMarbleRun.apk`: 30,087,177 bytes、SHA-256 `2a01bc6c4aa885557d42640419f7c391fa271d9337e2d41e412f59bada1aac68`。ARM64 IL2CPP、min SDK 25、target SDK 36、ZIP整合、APK Signature Scheme v2デバッグ署名を確認。

Android実機と、配布用署名／公証は未確認です。詳細は [../TEST_RESULTS.md](../TEST_RESULTS.md) を参照してください。

## 記録の読み方

各JSONの主な項目は次のとおりです。

- `passed`: QA条件を満たしたか。
- `game_state`: `Editing`、`Running`、`Celebrating` などの状態。
- `piece_count`: 読み込んだコースの部品数。
- `active_marbles` / `marbles_at_goal`: 活動中の玉数とゴール数。
- `camera_follow`: 自動追従が有効か。
- `camera_target` / `camera_yaw` / `camera_pitch` / `camera_distance`: 撮影時のカメラ状態。
- `details`: 玉ごとの位置／速度、ゴール秒数など、そのQA固有の値。

## 回帰証跡

1175fの `cute-*` は太い丸レール、積み木橋脚、接続ソケット、玩具部屋装飾の回帰、1175eの `gravity-*` は平面レールが隠れて加速しない物理と各見本コースのゴール回帰に使います。menu、invalid、pause、goal、保存再読込、`vertical-*`、`variety-*` も既存操作との比較用に残しています。
