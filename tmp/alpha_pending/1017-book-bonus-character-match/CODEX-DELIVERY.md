> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Book Bonus Sticker Character-Match Raw Candidates

Batch: `1017-book-bonus-character-match`
Date: 2026-07-01
Worker: Codex

## 目的

前回のえほん特典シール候補でキャラクターが似ていなかったため、参照元を限定して再生成した raw 候補。

## 正参照

今回の正参照は、ユーザーがこのチャットで添付した以下4キャラクターのみ。

- ポノ: 最新添付の薄茶色のくま全身
- ママ: オレンジ茶色のくま全身
- アヒル: 白いアヒルの正面/横/背面モデルシート
- ハリネズミ: 正面/横/背面モデルシート

## 明示的に参照から外したもの

- えほん表紙
- 既存 `book_bonus_*` シール
- 前回の GPT Image 2 生成候補
- 表紙からの切り出し/カード化した作業中案

## Raw Files

- `raw/book_bonus_refonly_pono_raw_20260701.png`
  - 添付ポノ参照だけを使った単体候補。
- `raw/book_bonus_refonly_pono_duck_raw_20260701.png`
  - 添付ポノ + 白いアヒル参照だけを使った候補。
- `raw/book_bonus_refonly_pono_hedgehog_raw_20260701.png`
  - 添付ポノ + ハリネズミ参照だけを使った候補。
- `raw/book_bonus_refonly_group_raw_20260701.png`
  - 添付4キャラ参照だけを使った集合候補。

## 未実施

- alpha/crop/最適化
- `assets/ui/gacha/stickers/` への配置
- `assets/data/game-stickers.json` 登録
- cache/sw 更新
