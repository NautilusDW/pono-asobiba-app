> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# [batch:835-parent-heading-variants] 「お家の方へ」見出し画像 raw 納品

生成日: 2026-06-24
担当: Codex
生成方法: built-in image generation (GPT Image 2 workflow)

## ファイル

- `parent_heading_variant_01_home_badge_raw.png`
  - 既存「ココが育つ！」に近い赤い雲形ステッカー。
  - 家アイコンが大きめで、やや親しみ・可愛さ寄り。
- `parent_heading_variant_02_trust_note_raw.png`
  - 推奨案。
  - クリーム地 + 茶色文字で、しっかり読ませる「お家の方へ」に一番合う。
  - 目立つが、固すぎず、親向け注意書きとして自然。
- `parent_heading_variant_03_pop_sticker_raw.png`
  - 既存「ココが育つ！」に最も近いポップステッカー。
  - 視認性は高いが、少し元気寄り。

## 目視確認

- 3案とも文字は `お家の方へ` と読める。
- 背景は白の raw PNG。
- 既存の `assets/ui/growth_heading_pop_sticker_raw.png` と同系統の横長見出しとして使える。

## 後続候補

実装する場合は variant 02 を `assets/ui/parent_heading_trust_note_raw.png` などに配置し、LP 内の `おうちの方へ` / `お家の方へ` 見出しテキストを画像表示に差し替えるのが自然。
