> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# CODEX Delivery: 1030 Book Bonus Fishing Mama Pose

## Summary

既存の `1026-book-bonus-fishing-mama-foil-fix` 採用候補をベースに、ママの棒立ち感を減らすためのポーズ違い raw を 2 案生成。

どちらも、最新の「ポノとママが同じ画像内に並んでいる参照」から作ったキャラクター差分を維持しつつ、昼のスーパーレアfoil感を残す方向。

## Files

- `raw/book_bonus_super_mama_pono_fishing_mama_crouch_day_raw_20260701.png`
  - 1402x1122
  - 3,135,052 bytes (約 2.99 MiB)
  - ママのしゃがみ感は強いが、顔が少し幼く寄る
- `raw/book_bonus_super_mama_pono_fishing_mama_lean_day_raw_20260701.png`
  - 1402x1122
  - 3,045,239 bytes (約 2.90 MiB)
  - 推奨候補。ポーズ変化は控えめだが、ママの元デザインが比較的残る

## Notes

- GPT Image 2 raw のみ。
- alpha removal / crop / optimization / `assets/ui/gacha/stickers/` 配置 / `assets/data/game-stickers.json` 登録 / `sw.js` cache 更新は未実施。
- どちらも 3 MiB 未満。
- 身につけものは追加していない。例外として釣り竿と糸、浮きのみ使用。

## Review

- 目視確認済み。
- `lean` はキャラクター維持優先、`crouch` はポーズ変化優先。
