> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# CODEX Delivery: 1039 Book Bonus Pono Duck Water Play Character Fix

Batch: `1039-book-bonus-pono-duck-water-play-character-fix`
Date: 2026-07-02
Generator: GPT Image 2 via Codex built-in `image_gen`

## Purpose

えほん購入特典シール候補「ポノと白いアヒルの みずあそび」のキャラクター参照寄せ修正版。

前回 `1038-book-bonus-pono-duck-water-play` の水辺・白フチ・レア寄りの方向性は維持しつつ、ユーザー添付の最新「ポノ + 白いアヒル」参照を主参照として、以下を重点修正した。

- 白いアヒル: ポノより年上の落ち着いた成鳥感、白い体、黒い目、オレンジ寄りのくちばしと足
- ポノ: より細め、なで肩、口元の白い部分を完全な楕円から外し、胸の白い部分も縦長で少し不規則に寄せる

## Files

- `raw/book_bonus_pono_duck_water_play_charfix_v1_adult_duck_raw_20260702.png`
  - 1498x1050, 2.40 MiB
  - アヒルの成鳥感が最も強い案。ポノの口元はまだやや整った楕円寄り。

- `raw/book_bonus_pono_duck_water_play_charfix_v2_slim_pono_raw_20260702.png`
  - 1402x1122, 2.63 MiB
  - ポノの細さ・なで肩・胸パッチが最も参照寄りの案。アヒルは少し幼く戻っている。

- `raw/book_bonus_pono_duck_water_play_charfix_v3_balanced_raw_20260702.png`
  - 1403x1121, 2.61 MiB
  - 推奨候補。アヒルの落ち着いた成鳥感と、ポノの修正のバランスが最も安定している。

## Recommendation

現時点の推奨は `book_bonus_pono_duck_water_play_charfix_v3_balanced_raw_20260702.png`。

アヒルが白い成鳥として読め、くちばし・足のオレンジ感も出ている。ポノはまだ完璧に参照一致ではないが、前回より丸さが抑えられ、シール全体としての完成度は一番高い。

## Not Done

- alpha 抜き
- crop / trim
- WebP 変換・最適化
- `assets/` 配置
- `assets/data/game-stickers.json` 登録
- `sw.js` cache bump
- 実装反映

この batch は raw 画像納品のみ。
