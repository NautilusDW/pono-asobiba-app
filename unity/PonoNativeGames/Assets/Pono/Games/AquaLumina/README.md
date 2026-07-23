# AquaLumina — 水中描画スパイク (プロトタイプ / 非出荷)

「ポノの水族館」(現行 Web/PixiJS 版) を Unity ネイティブで作り直す価値があるかを判断するための、
見た目専用の技術スパイクです。ゲームプレイは無く、以下 4 要素だけを実証します。

- ゴッドレイ (光芒) — スクリーンスペース放射ブラー (GPU Gems 3 方式)
- コースティクス — ワールドスペースの Voronoi フィラメントで水底の光模様を再現
- 屈折/歪み — カメラのカラーテクスチャを自前コピーしてフローノイズで UV を歪ませる
- シマー (水面のきらめき) — 屈折と同じパスでスパークル/バンドを加算

現行 Web 版 (`assets/aquarium` 系の GLSL リップルのみ・静的な半透明「光の帯」ポリゴン) と比べて、
本物のコースティクス・屈折・ゴッドレイがある状態でどれだけ見栄えが変わるかを、この Editor
セットアップ経由のスクリーンショットで比較できるようにするのが目的です。

このパッケージは非出荷です。シーンは `90_` プレフィックスで区別され、
`EditorBuildSettings.scenes` には決して登録されません
(HideSeekCreatures/ColorWaterDelivery の出荷用シーンリストとは完全に独立)。

## 安全設計 (共有アセットへの影響ゼロ)

- `Assets/Settings/Renderer2D.asset` (index 0, 両出荷ゲーム共用) は一切編集しません。
- 専用の `AquaLuminaRenderer2D.asset` を `AssetDatabase.CopyAsset` で複製し、
  `Assets/Settings/UniversalRP.asset` の `m_RendererDataList` に **追加** (index 1+) するだけです。
- `m_RequireDepthTexture` / `m_RequireOpaqueTexture` はどちらも `0` のまま変更しません
  (各パスはカメラのカラーテクスチャを自分でコピーして使うため不要)。
- 撤去したい場合は Editor メニュー `Pono/Aqua Lumina/Remove Renderer From Pipeline` を実行してください。

## ローカルセットアップ

Unity 6.3 (`6000.3.19f1`) をコマンドラインで起動し、次を実行します。

```text
-batchmode -quit -projectPath <PonoNativeGames> \
  -executeMethod Pono.AquaLumina.Editor.AquaLuminaProjectSetup.SetupFromCommandLine \
  -logFile -
```

これで `90_AquaLumina.unity` シーン・専用 Renderer2DData・専用 VolumeProfile が
(再実行しても壊れない形で) 作成/更新され、続けて `VerifySpike()` による検証が走ります。

macOS版は次のメソッドで `Builds/macOS/PonoAquaLumina.app` に生成されます
(`00_Boot` は含みません — HideSeekCreatures 起動用のシーンなので、このスパイクの
ビルドには不要です)。

```text
-batchmode -quit -projectPath <PonoNativeGames> \
  -executeMethod Pono.AquaLumina.Editor.AquaLuminaProjectSetup.BuildMacFromCommandLine \
  -logFile -
```

検証だけ・撤去だけを行いたい場合は Editor メニューからも実行できます。

- `Pono/Aqua Lumina/Rebuild Spike Scene`
- `Pono/Aqua Lumina/Verify Spike`
- `Pono/Aqua Lumina/Remove Renderer From Pipeline`

## 画面QA引数

Standalone player へ次の引数を渡すと、指定モードで効果を切り替えてから自動スクリーンショットを撮れます。

```text
-ponoSpikeCapture <png path>
-ponoSpikeCaptureMode baseline|full|godrays|caustics|distortion
-ponoSpikeCaptureDelay <秒数, 0-10, 既定 1.5>
-ponoQuitAfterCapture
```

| モード | ゴッドレイ | コースティクス | 屈折/シマー | Bloom |
| --- | --- | --- | --- | --- |
| `baseline` | off | off | off | off |
| `full` | on | on | on | on |
| `godrays` | on | off | off | on |
| `caustics` | off | on | off | off |
| `distortion` | off | off | on | off |

撮影後、同名 `.txt` に `mode=` / `delay=` / `renderer=` / `godRays=on|off|unavailable` /
`caustics=` / `distortion=` / `bloom=` / `avgFrameMs=` を書き出します
(該当する Volume コンポーネントが見つからない場合は `unavailable` になります)。
