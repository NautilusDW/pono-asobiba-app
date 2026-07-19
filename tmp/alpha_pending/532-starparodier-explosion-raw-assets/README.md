> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Starparodier Explosion Raw Assets

Generated with built-in imagegen for batch `532-starparodier-explosion-raw-assets`.

- `explosion_zako_small_4x4_16frames_raw.png`: small enemy explosion, 4x4 / 16 frames.
- `explosion_lazarus_big_4x4_16frames_pure_raw.png`: preferred Lazarus large explosion, 4x4 / 16 frames.
- `explosion_lazarus_big_4x4_16frames_with_core_raw.png`: optional Lazarus destruction version with visible boss core fragments, 4x4 / 16 frames.
- `explosion_starbrain_variants_3x8_24frames_raw.png`: Star Brain large explosion variants, 3 rows x 8 frames. Use rows as separate random/sequential burst variants.

All files are raw RGB PNG sheets on a flat pale gray background. No alpha removal or frame splitting has been done.
