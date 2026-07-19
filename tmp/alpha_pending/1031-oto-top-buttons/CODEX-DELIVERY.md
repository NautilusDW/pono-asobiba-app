> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# CODEX Delivery - batch:1031-oto-top-buttons

## Summary

音タッチ右上の `ステージ` / `ハイスコア` 用小ボタン raw を GPT Image 2 で生成。
既存の `assets/_legacy/preview-placeholders/ctrl-btn-settings.png` と同じ、金茶フレーム + クリーム内側 + 茶色アイコン + 下部ラベルの方向で合わせた。

## Raw Files

- `raw/oto_top_stage_button_raw_20260701.png`
  - 1254 x 1254 px / RGB / 2,325,923 bytes
  - 音符譜面アイコン + `ステージ`
- `raw/oto_top_highscore_button_raw_20260701.png`
  - 1254 x 1254 px / RGB / 2,132,723 bytes
  - トロフィーアイコン + `ハイスコア`

## Rejected

- `rejected/oto_top_highscore_button_checker_rejected_20260701.png`
  - 1254 x 1254 px / RGB / 2,456,526 bytes
  - 背景に透明風チェッカー柄が焼き込まれているため不採用。

## Prompt Notes

Use case: game UI button raw.
Purpose: OtoTouch top-right utility controls.
Style direction: match the existing settings button; rounded square, warm golden-brown carved outer frame, cream parchment inner face, soft bevel, subtle highlight, brown icon, Japanese label.
Implementation: raw only. Text is baked into the image.
Avoid: extra text, logos, watermark, emoji style, characters, unrelated props, checkerboard transparency pattern.

## Follow-Up Needed

- 白背景を alpha 化して、既存設定ボタンと同じ透明角にする。
- 120 x 120 px など実使用サイズへ crop / resize / optimize する。
- `assets/` 配置後、`oto/index.html` の `.oto-top-action` を画像背景化する。
- `play.html` / `sw.js` の cache version を同期バンプする。
- 390 x 844 / 844 x 390 / 1024 x 768 / 1366 x 768 で、右上3ボタンがゲームを邪魔しないか確認する。
