# KawaGlint — 川面描画スパイク (プロトタイプ / 非出荷)

「ポノのつりゲーム 川づり」(現行 Web/CSS+SVG+絵文字プレースホルダー版) の水面表現を Unity ネイティブで
作り直す価値があるかを判断するための、見た目専用の技術スパイクです。ゲームプレイ (釣りの状態機械) は
無く、真横カットアウェイ (水面線を境に上=空・岸・釣り人、下=半透明の水中) の川面ビジュアルだけを
以下 6 要素で実証します。

- うねる水面線 — ピン留めされた3-sine解析波形をなぞる、明るく発光するクレストライン
- 屈折 — カメラのカラーテクスチャを自前コピーしてフローノイズで UV を歪ませる (水面線より下のみ)
- 圧縮された疑似反射 — 水面線の下側に、上側 (岸・空) を縦圧縮してミラーした帯を重ねる
- 岸辺の泡 — 岸との接触点に集まるぶくぶくした泡テクスチャ
- スペキュラきらめき — 水平方向に伸びたきらめきグリント (Bloom でハロー付き)
- ウキ — 波形にそのまま乗って半没水する浮き、局所傾斜に応じて傾く

現行 Web 版 (静的な 2px CSS ライン + repeating-linear-gradient シマー) と比べて、本物のうねり・屈折・
疑似反射・泡・きらめきがある状態でどれだけ見栄えが変わるかを、この Editor セットアップ経由の
スクリーンショットで比較できるようにするのが目的です。判断プロセスは AquaLumina (水族館スパイク) と
同一です。

このパッケージは非出荷です。シーンは `91_` プレフィックスで区別され (`90_` は AquaLumina)、
`EditorBuildSettings.scenes` には決して登録されません
(HideSeekCreatures/ColorWaterDelivery/AquaLumina の出荷用シーンリストとは完全に独立)。

## 安全設計 (共有アセットへの影響ゼロ)

- `Assets/Settings/Renderer2D.asset` (index 0, 両出荷ゲーム + AquaLumina 共用) は一切編集しません。
- 専用の `KawaGlintRenderer2D.asset` を `AssetDatabase.CopyAsset` で複製し、
  `Assets/Settings/UniversalRP.asset` の `m_RendererDataList` に **追加** (index 1 以上) するだけです。
  AquaLumina のエントリが既にリストに存在していても、その要素は検査・移動・削除しません
  (自分自身のエントリだけを走査/追加/削除します)。
- `m_RequireDepthTexture` / `m_RequireOpaqueTexture` はどちらも `0` のまま変更しません
  (屈折パスはカメラのカラーテクスチャを自分でコピーして使うため不要)。
- Volume の上書き (`KawaRefractionVolume` + URP `Bloom`) は必ず本スパイク専用の
  `KawaGlintVolumeProfile.asset` にのみ追加されます。プロジェクト全体の既定プロファイルである
  `Assets/DefaultVolumeProfile.asset` (`UniversalRenderPipelineGlobalSettings` からグローバル
  フォールバックとして参照され、HideSeekCreatures/ColorWaterDelivery/AquaLumina を含む全シーンに
  影響する) には **絶対に** 追加しません。過去に AquaLumina の統合作業で、Unity 側の
  「新規 VolumeComponent サブクラスをコンパイル時にグローバル既定プロファイルへ自動同期する」挙動
  により、そのコンポーネントが `DefaultVolumeProfile.asset` 側へ意図せず追加されてしまった事故が
  あり (2026-07-24 に検出・復旧済み)、KawaGlint も同じ再発防止策を踏襲します:
  - `KawaRefractionVolume` の全ての強度パラメータ (`refractionStrength`/`reflectionStrength`/
    `shimmerStrength`) はクラス既定値が本物の `0` で、`IsActive()` も既定で `false` を返します。
  - `VerifySpike()` がこの共有アセットを毎回チェックし、混入していればエラーで検出します。
  - `RebuildSpikeScene()` / `Remove Renderer From Pipeline` / `BuildMacFromCommandLine` (finally 節)
    の全てが、実行のたびに `Assets/DefaultVolumeProfile.asset` から本スパイクのコンポーネントを
    冪等に取り除きます (混入していなければ何もしません)。
  - 単独でクリーンアップしたい場合は Editor メニュー
    `Pono/Kawa Glint/Clean Shared Default Volume Profile` を実行してください。
- 撤去したい場合は Editor メニュー `Pono/Kawa Glint/Remove Renderer From Pipeline` を実行してください。

## ローカルセットアップ

Unity 6.3 (`6000.3.19f1`) をコマンドラインで起動し、次を実行します。

```text
-batchmode -quit -projectPath <PonoNativeGames> \
  -executeMethod Pono.KawaGlint.Editor.KawaGlintProjectSetup.SetupFromCommandLine \
  -logFile -
```

これで `91_KawaGlint.unity` シーン・専用 Renderer2DData・専用 VolumeProfile が
(再実行しても壊れない形で) 作成/更新され、続けて `VerifySpike()` による検証が走ります。

macOS版は次のメソッドで `Builds/macOS/PonoKawaGlint.app` に生成されます
(`00_Boot` は含みません — HideSeekCreatures 起動用のシーンなので、このスパイクの
ビルドには不要です)。

```text
-batchmode -quit -projectPath <PonoNativeGames> \
  -executeMethod Pono.KawaGlint.Editor.KawaGlintProjectSetup.BuildMacFromCommandLine \
  -logFile -
```

検証だけ・撤去だけを行いたい場合は Editor メニューからも実行できます。

- `Pono/Kawa Glint/Rebuild Spike Scene`
- `Pono/Kawa Glint/Verify Spike`
- `Pono/Kawa Glint/Remove Renderer From Pipeline`
- `Pono/Kawa Glint/Clean Shared Default Volume Profile` (手動で `Assets/DefaultVolumeProfile.asset`
  だけをクリーンアップしたい場合。上記 2 つのメニューも内部でこれを毎回呼びます)

## 画面QA引数

Standalone player へ次の引数を渡すと、指定モードで効果を切り替えてから自動スクリーンショットを撮れます。

```text
-ponoSpikeCapture <png path>
-ponoSpikeCaptureMode baseline|full|refraction|surface|actors
-ponoSpikeCaptureDelay <秒数, 0-10, 既定 1.5>
-ponoQuitAfterCapture
```

| モード | 屈折/疑似反射 | 水面バンド | アクター (魚影/ウキ) | Bloom |
| --- | --- | --- | --- | --- |
| `baseline` | off | off | off | off |
| `full` | on | on | on | on |
| `refraction` | on | off | off | off |
| `surface` | off | on | off | on |
| `actors` | off | off | on | off |

撮影後、同名 `.txt` に `mode=` / `delay=` / `renderer=` / `refraction=on|off|unavailable` /
`surface=` / `actors=` / `bloom=` / `avgFrameMs=` を書き出します
(該当する Volume コンポーネント/モジュールが見つからない場合は `unavailable` になります)。
