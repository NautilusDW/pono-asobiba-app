> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Book Bonus Super Rare Fishing Foil Raw Candidates

Batch: `1025-book-bonus-fishing-super-foil`
Date: 2026-07-01
Worker: Codex

## 目的

前回の「ママとポノのつり」がノーマル寄りだったため、スーパーレアとして見えるように箔押し・ホログラム・強いきらめき表現で再生成した raw 候補。

## 正参照

今回の正参照は、ユーザーがこのチャットで添付したポノとママのみ。

- ポノ: 薄茶色のくま全身
- ママ: オレンジ茶色のくま全身

## 方針

- シチュエーションは「ママとポノのつり」
- 身につけものは入れない
- 例外として、シチュエーション上必要な釣り竿だけを持たせる
- スーパーレア感は、金箔ふち、虹ホロ、星の反射、きらめき、水面のプリズムで出す
- アヒル/ハリネズミなど他キャラは入れない
- 文字、ロゴ、UI、カード枠は入れない

## Raw Files

- `raw/book_bonus_super_mama_pono_fishing_foil_day_raw_20260701.png`
  - 明るい池の虹ホロ案。派手さとキャラの読みやすさのバランスが良い。
- `raw/book_bonus_super_mama_pono_fishing_foil_night_raw_20260701.png`
  - 夜の池と月光の金箔ホロ案。特別感は強いが、全体はやや濃い。

## 推奨

まずは `book_bonus_super_mama_pono_fishing_foil_day_raw_20260701.png` を優先候補にする。スーパーレア感がありつつ、ポノとママの表情が読みやすい。

## 未実施

- alpha/crop/最適化
- `assets/ui/gacha/stickers/` への配置
- `assets/data/game-stickers.json` 登録
- cache/sw 更新
