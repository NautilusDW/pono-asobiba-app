> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# CODEX Delivery: 1038 Book Bonus Pono Duck Water Play

## Summary

えほん購入特典シール候補「ポノと白いアヒルの みずあそび」を生成。

ユーザー選択の候補 1 を反映し、ママなし・白いアヒル中心・レア寄りの水辺シールとして作成した。スーパーレアの金foil感は避け、白フチ + 青系アクセント + 水しぶき + 小さな虹に抑えている。

## Files

- `raw/book_bonus_pono_duck_water_play_jump_raw_20260702.png`
  - 1399x1124
  - 2,557,723 bytes (約 2.44 MiB)
  - 動きが強い比較案。ポノと白いアヒルが水しぶきで遊んでいる
- `raw/book_bonus_pono_duck_water_play_stream_raw_20260702.png`
  - 1389x1132
  - 2,613,238 bytes (約 2.49 MiB)
  - 推奨候補。浅瀬でぱしゃぱしゃ遊ぶ落ち着いた案

## Notes

- GPT Image 2 raw のみ。
- alpha removal / crop / optimization / `assets/ui/gacha/stickers/` 配置 / `assets/data/game-stickers.json` 登録 / `sw.js` cache 更新は未実施。
- どちらも 3 MiB 未満。
- 黄色いアヒル/ひよこ、ママ、ハリネズミ、追加動物、身につけものは入れていない。

## Review

- 目視確認済み。
- `stream` はキャラの読みやすさと実装しやすさ優先。
- `jump` は勢いと楽しさ優先。
