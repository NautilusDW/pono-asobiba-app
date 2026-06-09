> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Oto Touch Button Assets - Image 2 Raw

Image 2 で生成した raw 素材です。ローカル描画、ローカル生成、アルファ抜き、切り抜き、文字の後描きはしていません。

## Files

- `sheet_katakana_doremi_image2_raw.png`
  - ド / レ / ミ / ファ / ソ / ラ / シ / ド
- `sheet_roman_cdefgabc_image2_raw.png`
  - C / D / E / F / G / A / B / C
- `sheet_animal_silhouettes_image2_raw.png`
  - cat / dog / cow / pig / horse / lion / frog / crow

## Style Reference

既存 `assets/images/oto/buttons/` のステッチ風ボタン:

- クリーム色の丸い土台
- 金色寄りの外周リム
- 音ごとの色つき破線ステッチリング
- 左上の白いグロッシーハイライト
- 中央にぷっくりした子ども向けモチーフ

## Notes

- 3枚とも Image 2 生成結果をそのままコピーした raw PNG。
- 本番 `assets/images/oto/buttons/` への配置と `sw.js` バンプは未実施。
