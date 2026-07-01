> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# CODEX Delivery: 1036 Book Bonus Fishing Single White Frame

## Summary

えほん購入特典スーパーレア候補「ママとポノのつり」の白枠二重化を修正。

`1034-book-bonus-fishing-cloud-frame` の `balanced` 案をベースに、雲形の大小差と金foil感は残しつつ、外側に出ていた硬い白い二重輪郭を消した。

## Files

- `raw/book_bonus_super_mama_pono_fishing_single_white_frame_raw_20260702.png`
  - 1370x1148
  - 3,118,020 bytes (約 2.97 MiB)
  - 推奨候補。白い切り抜き枠は1層のみ

## Notes

- GPT Image 2 raw のみ。
- alpha removal / crop / optimization / `assets/ui/gacha/stickers/` 配置 / `assets/data/game-stickers.json` 登録 / `sw.js` cache 更新は未実施。
- 3 MiB 未満。

## Review

- 目視確認済み。
- 外側の白い二重輪郭は消え、白枠は単一化。
- 雲形の大小差は維持。
