> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# batch:1056-nazonazo-vehicle-town-assets

GPT Image 2 built-in 経路で、なぞなぞトンネル向け raw PNG を生成しました。

## Files

- `nazonazo_vehicle_body_nowheels_chromakey_raw.png`
  - メイン車両本体。タイヤなし、運転席窓あり。後で alpha 抜きして `#veh` 本体へ差し替えやすい候補。
- `nazonazo_vehicle_wheels_sheet_chromakey_raw.png`
  - タイヤシート。通常スポーク、サイズ違い、回転ブラー候補あり。後で切り出して CSS `rotate()` 用に使う。
- `nazonazo_driver_characters_expressions_sheet_chromakey_raw.png`
  - 運転席差し替え用。くま / きつね / うさぎ / ふくろう × 4 表情。
- `nazonazo_machihazure_sky_back_raw.png`
  - まちはずれのフル背景。`#skyA` / base backdrop 候補。
- `nazonazo_machihazure_horizon_layer_chromakey_raw.png`
  - 遠景。丘、遠い家、低い木。`#horizon` 候補。
- `nazonazo_machihazure_mid_layer_chromakey_raw.png`
  - 中景。木、柵、ポスト、低い草。`#midT` 候補。
- `nazonazo_machihazure_foreground_layer_chromakey_raw.png`
  - 前景。草、花、端の木幹。`#fgT` 候補。
- `nazonazo_machihazure_ground_strip_raw.png`
  - 地面/線路 strip。`#groundT` 候補。実装時は下部中心で crop して使うのがよい。

## Notes

- すべて raw PNG のままです。
- alpha 抜き、crop、分割、最適化、`assets/` 配置、`nazonazo-tunnel` 実装接続、`sw.js` cache bump は未実施です。
- クロマキー背景は車両/タイヤが `#00ff00`、キャラ/背景レイヤーが `#ff00ff` です。
- 全ファイル 3MB 未満です。
