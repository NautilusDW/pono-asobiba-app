> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# CODEX Delivery: 1026 Book Bonus Fishing Mama Foil Fix

## Summary

えほん購入特典のスーパーレア候補「ママとポノのつり」を再生成。
ユーザー添付の「ポノとママが同じ画像内に並んでいる参照」を主参照にし、前回まで崩れていたママの顔・体格・短い腕・丸い前足を優先して修正した。

前回の昼foil案は、スーパーレアの方向性としては近かったが、ママがポノ寄りの別キャラになっていたため不採用。
今回の採用候補は、キャラクター差分が同時に見える最新参照から生成している。

## Files

- `raw/book_bonus_super_mama_pono_fishing_combinedref_day_raw_20260701.png`
  - 1402x1122
  - 3,126,500 bytes (約 2.98 MiB)
  - 推奨候補

## Notes

- GPT Image 2 raw のみ。
- alpha removal / crop / optimization / `assets/ui/gacha/stickers/` 配置 / `assets/data/game-stickers.json` 登録 / `sw.js` cache 更新は未実施。
- 背景外側は白ベースで、後続の切り抜きに回しやすい構成。
- 身につけものは追加していない。例外として釣り竿と糸、浮きのみ使用。

## Review

- 目視確認済み。
- ママは最新の同一画像参照に寄せ、ポノと同色・同体型化しないことを優先。
- ファイルサイズは 3 MiB 未満。
