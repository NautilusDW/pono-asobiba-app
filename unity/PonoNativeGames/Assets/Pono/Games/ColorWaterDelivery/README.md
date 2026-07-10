# いろみずの おつかい — Unity prototype

「FluidInkを飾りに使う」のではなく、2色流体そのものを遊びの中心にした独立1ステージです。

- 青と黄色の泉は自動で流れる
- 3枚の葉をタップして、実際の流れを曲げる
- 青と黄色が同じ場所に来た部分だけ緑になる
- 家の吸水口に届いた実流体だけが進捗になる
- 霧・透明化・発見マスク・攻略用パーティクルは使わない
- Compute Shader非対応端末では同じルールのCPU流体へ切り替わる

## ローカルセットアップ

Unity 6.3 (`6000.3.19f1`) をコマンドラインで起動し、次を実行します。

```text
-batchmode -quit -projectPath <PonoNativeGames> \
  -executeMethod Pono.ColorWaterDelivery.Editor.ColorWaterDeliveryProjectSetup.SetupFromCommandLine
```

macOS版は次のメソッドで `Builds/macOS/PonoColorWaterDelivery.app` に生成されます。

```text
Pono.ColorWaterDelivery.Editor.ColorWaterDeliveryProjectSetup.BuildMacFromCommandLine
```

## 画面QA引数

Standalone playerへ次の引数を渡すと、開始・混色・完成の自動スクリーンショットを撮れます。

```text
-ponoColorWaterCapture <png path>
-ponoColorWaterCaptureMode start|mix|complete
-ponoQuitAfterCapture
```
