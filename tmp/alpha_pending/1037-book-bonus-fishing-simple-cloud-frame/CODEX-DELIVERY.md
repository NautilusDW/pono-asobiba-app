> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# CODEX Delivery: 1037 Book Bonus Fishing Simple Cloud Frame

## Summary

えほん購入特典スーパーレア候補「ママとポノのつり」の外周フレームを再調整。

ユーザー指摘の「もくもく感が強すぎる」「こんなに外側の形が複雑なシールは見たことがない」を受け、`1036-book-bonus-fishing-single-white-frame` をベースに、細かい小波を減らして大きめの雲形へ寄せた。

## Files

- `raw/book_bonus_super_mama_pono_fishing_large_cloud_practical_raw_20260702.png`
  - 1371x1148
  - 3,058,078 bytes (約 2.92 MiB)
  - 少し雲らしさを残した案。下辺にやや細かさが残る
- `raw/book_bonus_super_mama_pono_fishing_large_cloud_simple_raw_20260702.png`
  - 1388x1133
  - 3,047,642 bytes (約 2.91 MiB)
  - 推奨候補。大きい雲のかたまり中心で、実際のシールの抜き型として自然

## Notes

- GPT Image 2 raw のみ。
- alpha removal / crop / optimization / `assets/ui/gacha/stickers/` 配置 / `assets/data/game-stickers.json` 登録 / `sw.js` cache 更新は未実施。
- どちらも 3 MiB 未満。
- 白枠は単一。外側の二重白枠や細かい外側トレースは入れていない。

## Review

- 目視確認済み。
- `simple` は外周の複雑さを大きく減らし、雲型の大きい丸みを優先。
- `practical` は元の雲感を少し残した比較案。
