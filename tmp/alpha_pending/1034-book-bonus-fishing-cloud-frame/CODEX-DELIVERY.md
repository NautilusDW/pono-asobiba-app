> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# CODEX Delivery: 1034 Book Bonus Fishing Cloud Frame

## Summary

えほん購入特典スーパーレア候補「ママとポノのつり」の外周フレーム調整案。

ユーザー指摘の「雲っぽい輪郭にするなら大きい波と小さい波の差がほしい」「シルエットの少し外側をぼんやりトレースしている部分がほしい」を反映するため、`1030-book-bonus-fishing-mama-pose` の `lean` 案をベースに、外周フレーム中心で 2 案生成した。

## Files

- `raw/book_bonus_super_mama_pono_fishing_cloud_frame_balanced_raw_20260701.png`
  - 1389x1132
  - 3,080,389 bytes (約 2.94 MiB)
  - 推奨候補。中身の変化を抑えつつ、雲形の大小差と淡い外側トレースを追加
- `raw/book_bonus_super_mama_pono_fishing_cloud_frame_loose_trace_raw_20260701.png`
  - 1382x1138
  - 2,967,730 bytes (約 2.83 MiB)
  - 外側のぼんやりトレースは強め。ただしキャラ同士の距離感も少し変化

## Notes

- GPT Image 2 raw のみ。
- alpha removal / crop / optimization / `assets/ui/gacha/stickers/` 配置 / `assets/data/game-stickers.json` 登録 / `sw.js` cache 更新は未実施。
- どちらも 3 MiB 未満。

## Review

- 目視確認済み。
- `balanced` はキャラ・構図維持優先。
- `loose_trace` は雲フレーム演出優先。
