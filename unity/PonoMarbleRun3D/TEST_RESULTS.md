# テスト結果

実施日: 2026-07-11

Unity: 6000.3.19f1

対象: `batch:1175g-marble-run-pastel-camera`（1175f以前の編集・保存・物理・表示回帰を含む）

## 結果概要

| 区分 | 結果 | 確認内容 |
| --- | --- | --- |
| EditMode | 75 / 75 成功 | 19部品、接続・占有・保存互換、物理回帰、操作アイコン12種、部品画像19種、緩やかな追従・先読み・遮蔽回避の計算 |
| PlayMode | 28 / 28 成功 | 編集・保存・走行・停止・ゴール、4色UI、Kosugi Maru、画像中心の部品パレット／操作列、実行時サムネイルCamera・RenderTextureが0個、Safe Area |
| macOSプレイヤー | 成功 | LaunchServices起動、28部品コースの6 / 6玉実走、16:9・4:3・20:9、近距離追従と緩やかな回り込み |
| Android APK | 生成・検証成功 | ARM64 IL2CPP、min SDK 25、target SDK 36、ZIP整合、APK Signature Scheme v2デバッグ署名 |
| Android実機 | 未実施 | 接続可能なAndroid端末がないため、インストールと実タッチは未確認 |

機械可読の結果は `TestResults/EditMode.xml` と `TestResults/PlayMode.xml`、完成macOSプレイヤーの記録は `QA/pastel-camera-icons-*.json`、対応画面は `QA/Screenshots/*/pastel-camera-icons-*.png` に保存しています。

## 今回の主な変更

### 4色パステルと丸い書体

- UI背景を明るい紙色にし、操作色を空色 `#A9DCF2`、ミント `#B8E2C1`、さくら `#F4B6B0`、ラベンダー `#D4C3EC` の4色へ絞りました。
- 子ども向けUIは見出し、ボタン、補助文を含めてKosugi Maruへ統一し、読めない環境ではNoto Sans JPへフォールバックします。
- 3D木部も明るいパステルの玩具表現へ戻し、濃い操作色が画面を占めない構成にしました。
- 子ども向け表示は、ひらがな・カタカナと記号だけです。

### 絵で選べる部品パレット

- 左パレットの全19部品へ、`WoodenPieceFactory` が作る実際の3D形状を同じ角度から撮った透明PNGを付けました。
- PNGはUnity Editorで1回生成するアセットです。完成プレイヤーでは画像を読むだけで、サムネイル撮影用CameraとRenderTextureを実行時に作りません。
- 部品カードは絵を主役にし、名前と残り個数は14pxの補助表示にしました。
- EditModeで19画像の存在・透過・読込設定、PlayModeで各カードの画像表示と実行時Camera／RenderTextureが増えないことを確認しました。

### アイコン中心の操作ボタン

- GPT Image 2で、回転、削除、ひとつ戻す、全消去、保存、読込、カメラ回転、全景、玉リセット、開始、一時停止、編集の12操作を1枚の4×3アトラスとして生成しました。
- Unity用アトラスは `Assets/Resources/UI/MarbleActionIcons.png`、724×543 px、562,866 bytesです。
- 各ボタンは絵を先に見せ、意味が不足する箇所だけ短いかなを添えています。
- アトラスは必要時に1度だけ12セルへ分けてキャッシュします。生素材は `tmp/alpha_pending/1175g-marble-run-pastel-camera/` に保存しています。
- EditModeでセル順、切出し、キャッシュ、PlayModeで編集／走行ボタンへの表示を確認しました。

### 螺旋を細かく追わない先読みカメラ

- 試走中の距離を11.5〜16、ピッチを36〜40度に保ち、以前より玉へ寄せました。
- 複数の玉は中央値を中心にし、離れすぎた玉を外れ値として除外します。
- 玉群の速度は1.2秒、進行方向は1.5秒かけて平滑化します。トルネード内で各玉が反対方向へ動く瞬間があっても、その細かな向きへカメラが振り回されません。
- 視線方向は先に続くコースを78%、玉群の動きを22%として決めるため、現在位置だけでなく次の動きも見せます。
- Yawは通常10度／秒、必要時でも最大12度／秒へ抑えました。
- 0.20秒間隔で正面と左右35度・70度の5候補へSphereCastし、壁やトンネルで玉が隠れそうなら、次の進路が見える側へ回り込みます。
- 選んだ左右を1.35秒保つヒステリシスを設け、遮蔽物の境目で左右へ細かく揺れることを防ぎます。
- 手動回転／ズームのあとは3.5秒その視点を保ち、その後ゆっくり自動追従へ戻ります。

## macOSプレイヤー実走

最新の `Builds/macOS/PonoMarbleRun.app` を1280×720で起動し、28部品の「すぐ ころがす」を実際のRigidbodyとGoalSensorで再走しました。

| コース | 部品数 | 結果 | 証跡 |
| --- | ---: | --- | --- |
| すぐ ころがす | 28 | 6 / 6玉、25.130秒で `Celebrating` | `QA/pastel-camera-icons-variety-physical-final.json` |

このコースはlevel 0〜4、3段上昇エレベーター、3段下降トルネード、上下交差、さかみち、かいだん、透明筒／カーブ、波、回転羽根を含みます。CCD、最大速度制限、停止・盤外検知、個別リセット、GoalSensorの重複集計防止、一時停止中の物理完全停止も従来どおり回帰しています。

1175f以前に確認した「トルネード タワー」6 / 6玉・19.034秒、「エレベーター シティ」6 / 6玉・22.515秒、平坦な「はじめての みち」6 / 6玉・13.536秒の記録も回帰証跡として残しています。

## カメラ実機確認

| 場面 | Yaw | Pitch | 距離 | ターゲット | 証跡 |
| --- | ---: | ---: | ---: | --- | --- |
| 試走前半 | 83.11° | 38.02° | 13.50 | `(5.58, 4.35, -6.07)` | `QA/pastel-camera-icons-run-early-final.json` |
| 15秒・トルネード付近 | 94.76° | 38.88° | 14.24 | `(9.40, 3.66, -6.73)` | `QA/pastel-camera-icons-run-mid-final.json` |

15秒記録では6玉の瞬間速度が互いに反対向きになる場面を含みます。それでも約8.8秒の間のYaw差は11.65度に留まり、螺旋一周ごとの素早い動きではなく、コース全体を緩やかに追うことを確認しました。Pitchと距離も指定範囲内です。遮蔽候補の選択、次経路の先読み、左右ヒステリシス、最大Yaw速度はEditModeで境界値を検査しています。

## 画面比率

| 比率 | 解像度 | 確認結果 | 証跡 |
| --- | --- | --- | --- |
| 16:9 | 1280×720 | 28部品、5段、画像パレット、アイコン操作列を安全領域内に表示 | `QA/pastel-camera-icons-edit-final.json` |
| 4:3 | 960×720 | 狭い横幅でもスクロール可能な部品画像と下部操作列が重ならない | `QA/pastel-camera-icons-edit-4x3-final.json` |
| 20:9 | 1600×720 | 横長でもコース全体と画像中心の操作UIを判別可能 | `QA/pastel-camera-icons-edit-20x9-final.json` |

対応PNGは `QA/Screenshots/{16x9,4x3,20x9}/pastel-camera-icons-edit-final.png` です。試走中の近距離カメラは `QA/Screenshots/16x9/pastel-camera-icons-run-{early,mid}-final.png` で確認できます。

## 成果物

### macOS

- パス: `Builds/macOS/PonoMarbleRun.app`
- アーキテクチャ: x86_64 + arm64（Universal）
- Bundle ID: `com.kodamanomori.pono.marblerun3d`
- 表示名: `ポノの マーブルラン`
- ローカルプレビュー用ad-hoc署名
- `codesign --verify --deep --strict` 成功
- LaunchServicesからの通常起動、1280×720メニュー表示、正常終了を `QA/pastel-camera-icons-launchservices-final.json` で確認
- 実行ファイルSHA-256: `8def910aaccddf5032b010573feeef86ac52105981995d18f138d1eea8e80311`

### Android

- パス: `Builds/Android/PonoMarbleRun.apk`
- ARM64 IL2CPP、min SDK 25、target SDK 36
- パッケージ: `com.kodamanomori.pono.marblerun3d`
- APKサイズ: 30,087,177 bytes
- SHA-256: `2a01bc6c4aa885557d42640419f7c391fa271d9337e2d41e412f59bada1aac68`
- ZIP整合確認済み
- APK Signature Scheme v2デバッグ署名

## 分離確認

- 変更と成果物は `unity/PonoMarbleRun3D/` 内で独立しています。
- `unity/PonoNativeGames/`、`HideSeekCreatures`、Web版、既存ゲーム選択画面へ統合していません。
- 開発トランクは `develop-app` だけで、凍結済みの `develop` への同期は行っていません。

## 未確認事項

- Android実機でのインストール、実タッチ、ピンチ、Safe Area、発熱、長時間性能。
- 配布用Developer ID署名と公証、Androidリリースキー署名。現在の成果物はローカルmacOSプレビューとテストAPKです。
