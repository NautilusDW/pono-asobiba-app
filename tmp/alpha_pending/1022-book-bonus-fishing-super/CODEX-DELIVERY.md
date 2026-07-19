> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Book Bonus Super Rare Fishing Raw Candidates

Batch: `1022-book-bonus-fishing-super`
Date: 2026-07-01
Worker: Codex

## 目的

えほん特典シールのスーパーレア候補 1 枚目。「ママとポノのつり」シチュエーション。

## 正参照

今回の正参照は、ユーザーがこのチャットで添付したポノとママのみ。

- ポノ: 薄茶色のくま全身
- ママ: オレンジ茶色のくま全身

## 方針

- 身につけものは入れない
- 例外として、シチュエーション上必要な釣り竿だけを持たせる
- アヒル/ハリネズミなど他キャラは入れない
- 文字、ロゴ、UI、額縁は入れない

## Raw Files

- `raw/book_bonus_super_mama_pono_fishing_help_raw_20260701.png`
  - ママが座ってポノと一緒に竿を持つ案。
- `raw/book_bonus_super_mama_pono_fishing_pond_raw_20260701.png`
  - ポノが立って竿を持ち、ママが後ろから支える案。推奨候補。

## 未実施

- alpha/crop/最適化
- `assets/ui/gacha/stickers/` への配置
- `assets/data/game-stickers.json` 登録
- cache/sw 更新
