> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Prompts

## `stage1_tidepool_asset_sheet_raw.png`

Use case: illustration-story
Asset type: raw game asset sheet for a children's educational ocean shooter/exploration game
Primary request: Create one raw asset sheet for Stage 1, "tide pool and shallow shore", with separate cutout-friendly subjects on a flat pure white (#FFFFFF) background. Do not add transparency; do not crop into separate files. The user will manually create alpha channels later.
Subjects to include, clearly separated with generous white space and no overlap: 1) friendly small submarine with a simple Pono bear face emblem on the side, cockpit not visible, side-view facing right; 2) straight glowing food pellet projectile; 3) arcing bomb-style food orb projectile, soft round and child-friendly, not a military bomb; 4) hermit crab; 5) small shrimp; 6) sea star; 7) tidepool goby/small bottom fish; 8) sea anemone; 9) boss horseshoe crab, larger than the others, ancient-creature feeling but cute and not scary.
Style/medium: polished watercolor + soft picture-book game sprite style, matching existing Pono ocean assets, clean outlines, gentle colors, child-friendly.
Composition/framing: asset sheet grid, each subject isolated with plenty of padding, full bodies visible, no shadows crossing onto other subjects.
Lighting/mood: bright, warm shallow-water mood, soft highlights.
Constraints: no text, no labels, no UI, no watermark, no transparent background, no colored background, no cast shadows, no cropped limbs, no scary realism, no weapons. Keep subjects readable at small game-sprite size. White background only.

## `stage1_tidepool_background_raw.png`

Use case: illustration-story
Asset type: raw side-scrolling game background for a children's educational ocean album game
Primary request: Create a wide Stage 1 background scene: tide pool and shallow shore under clear blue water, with sandy seafloor, small rocks, shells, gentle seaweed, sunlight rays, and shallow-water atmosphere. This is a background image, not a cutout sheet.
Style/medium: polished watercolor + soft picture-book game background, matching Pono ocean assets, child-friendly, bright and readable.
Composition/framing: 16:9 wide horizontal side-scrolling game background. Keep a clear playable middle lane for a submarine. Put tidepool rocks and sand along the bottom, soft water and light rays in the middle, and a gentle water surface near the top. No characters, no creatures, no text.
Lighting/mood: warm shallow water, bright and inviting, soft caustic light.
Color palette: aqua blue water, pale sand, muted green seaweed, small coral accents.
Constraints: no text, no labels, no UI, no watermark, no characters, no enemies, no hard black outlines, no dark scary cave. Full-bleed rectangular image; no transparency needed.
