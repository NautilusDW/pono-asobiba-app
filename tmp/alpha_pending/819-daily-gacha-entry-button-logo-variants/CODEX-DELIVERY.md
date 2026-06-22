> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# 819 daily gacha entry button logo variants

Codex generated 4 raw button-logo concepts for the daily gacha entry button.

## User request

- Make the gacha button stand out from other buttons.
- Use a light-blue or pink capsule.
- Include text during generation.
- Make `1にち1かい` a separate diagonal tag.
- Make the main wording feel like a logo mark: `シールがもらえる ポノのガチャガチャ`.
- Generate multiple patterns.

## Deliverables

All files are raw generated PNGs on a white background. No alpha removal, cropping, asset placement, or `play.html` implementation was done.

| File | Size | Notes |
| --- | ---: | --- |
| `daily_gacha_entry_logo_variant_01_pink_capsule_raw.png` | 1822x863 | Pink open capsule, strongest premium/gold logo look. Text is close to the requested wording. |
| `daily_gacha_entry_logo_variant_02_blue_capsule_raw.png` | 1983x793 | Light-blue capsule, very bright and readable composition. Some generated dakuten in `ガチャ` may need close review. |
| `daily_gacha_entry_logo_variant_03_pink_blue_marquee_raw.png` | 1983x793 | Pink main capsule with light-blue accent, clearest diagonal ribbon tag and good logo balance. |
| `daily_gacha_entry_logo_variant_04_dual_capsule_emblem_raw.png` | 1931x814 | Dual blue/pink capsules, most compact emblem-like composition. |

## Review notes

- Capsule color requirement: OK. Variants use pink, light blue, or both.
- `1にち1かい` diagonal tag: OK in all 4 variants.
- Main logo direction: OK. Variants 1, 3, and 4 are strongest.
- Text accuracy: generated Japanese text should be checked before final use. Variant 2 is weakest because `ガチャ` dakuten may be ambiguous.
- Asset integration: not done. If one is chosen, the next step is Photoshop cleanup / optional alpha handling, then final placement under `assets/ui/gacha/` and `play.html` wiring by the implementation owner.
