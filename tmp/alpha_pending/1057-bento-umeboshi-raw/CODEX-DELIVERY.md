> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# batch:1057-bento-umeboshi-raw

## Files

- `umeboshi_single_raw_gpt_image2_chromakey.png`
  - GPT Image 2 built-in raw
  - 1254 x 1254 px / 1,648,925 bytes
  - やや写実寄り。梅干しのしわは明確。
- `umeboshi_single_soft_raw_gpt_image2_chromakey.png`
  - GPT Image 2 built-in raw
  - 1254 x 1254 px / 1,241,851 bytes
  - 推奨候補。しわが少なめで、弁当 free-layout の小物として使いやすい。

## Notes

- どちらも raw 納品のみ。alpha 抜き、crop、最適化、`assets/` 配置、`bento/index.html` 接続、`sw.js` バンプは未実施。
- 背景は後処理用の単色 `#00ff00` chroma-key。
- 既存 `assets/images/bento/free-layout/decor_umeboshi.png` は上書きしていない。

## Final Prompt Direction

Create a single umeboshi pickled plum decoration for Pono no Asobiba Bento free-layout, matching child-friendly toy-like Bento food assets. Use a centered top-down to slight 3/4 single object with deep red/crimson color, gentle dimples and simplified soft wrinkles, clearly umeboshi and not cherry tomato. Use a perfectly flat solid `#00ff00` chroma-key background, generous padding, no rice, seaweed, plate, stem, seeds, face, text, logo, watermark, shadow, reflection, or extra objects.
