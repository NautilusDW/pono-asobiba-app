# StickerBookThreeJS

Three.js page-flip prototype for the sticker book.

## Run

Start a static server from the project root:

```powershell
python -m http.server 4186 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:4186/Prototypes/StickerBookThreeJS/
```

Content plan viewer:

```text
http://127.0.0.1:4186/Prototypes/StickerBookThreeJS/sticker_book_content_plan.html
```

The prototype imports Three.js from the public CDN and loads project-local textures from:

```text
assets/_PonoSubmarine/Art/UI/StickerBook3D/
```

The current default texture set is generated as dedicated front-facing Three.js layers. Image2-generated source files are kept only as style/provenance references and cover sources; the inside-page runtime textures are now deterministic page-render outputs:

```text
assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_image2_texture_source.png
assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_image2_page_back_source.png
assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_generated_style_reference.png
```

Rebuild the generated texture pack:

```powershell
python tools/build_sticker_book_generated_texture_pack.py
```

## Notes

- Migrated from the Unity prototype workspace to `D:\AppDevelopment\pono-asobiba-app` on 2026-06-16. Runtime assets now live under lowercase `assets/`, and the generator lives under lowercase `tools/`.
- The copied `20260616-023` texture set is a reference snapshot only. The crop/mask approach from `sb3d_image2_texture_source.png` did not solve the visible side-tab/page-edge alignment problem.
- As of `20260618-644`, the inside left/right textures are no longer cropped or fitted from GPT Image 2 full-page art. They are generated as fixed-size production page renders (`1472x1536`) with stable frames, safe margins, and actual Sea Album stage content assets. In production, the app can replace those PNGs with screenshots/canvas renders of the real page UI without changing the Three.js book geometry.
- Page thickness is represented by dedicated transparent thickness textures derived from a GPT Image 2 generated strip atlas. The raw atlas still stores left/right examples separately, but runtime assets are now completed into full page-width strips with mirrored rounded end caps on both sides; do not render the half-atlas cut edge directly. As of `20260617-638`, all non-empty thickness levels share the same single tall source strip per side (`256px` texture height, about `240px` alpha height). The runtime uses that one source strip for `small/half/mostly/full`; the default tuning now starts with both left and right non-empty stacks at `scaleY=1` and `Y=0.85`, so the full source is visible higher on the page before manual adjustment.
- The closed cover uses the same `1472x1536` page ratio and rounded corner radius as the inside pages. Cover art should be generated as a normal front-facing rounded rectangle at `1472x1536` px, aspect `23:24` (`0.958333` width/height). The slight narrow top edge in the preview is only camera perspective; do not bake perspective into the generated cover image.
- Closed-cover preview now includes a tunable bottom thickness strip plus a tunable background-composite backing layer, so cover art can be checked against the actual dark scene background instead of as an isolated transparent object.
- As of `20260618-650`, the closed-cover thickness strip defaults to a wider/taller no-cut placement and uses `sb3d_cover_tuning_v2`, so older local cover tuning values do not keep the shorter strip.
- As of `20260618-652`, the preview canvas is composited over the existing warm desk background `assets/zukan/title/desk_bg.png`. The earlier sticker-book base image was close in mood but included another book under the 3D book, so it is not used as the runtime background.
- The binder is treated as an internal ring binder: rings are hidden on the closed cover and shown only on the inside spread as split, incomplete arcs.
- The inside spread now treats both left and right pages as free sticker-album pages. Lists, zukan detail pages, and game-specific indexes should be separate book/profile templates, not the default sticker album page.
- Cover textures use the rich GPT Image 2 source cover art composed into fixed-size generated cover renders, so the cover keeps its book-like artwork while still matching the Three.js page mask.
- The open spread includes lightweight left/right page-stack edge meshes. They are not real page piles; runtime selects `empty/small/half/mostly/full` logical thickness levels from `spread`, but every non-empty level uses the same tall texture asset and changes only its mesh scale. This keeps one editable source crop while preserving separate left/right and pair-specific tuning.
- Page-stack thickness is tied to `spread`, not to `progress`. `progress` is only the current single-page turn angle; a one-page flip should not visibly reshuffle the whole book thickness. Use `?spread=0`, `0.25`, `0.5`, `0.75`, or `1` to preview the static thickness variants for different opened spreads.
- As of `20260617-643`, the five dot controls above the toolbar jump between spread stops with a fast multi-page flutter. The animation interpolates `spread`, drives three to six translucent page meshes depending on jump distance, then snaps to the target spread with `progress=0`. Adjacent spread stops use three visible pages; end-to-end jumps use six.
- The active turning page now uses a subdivided copy of the hole-cut rounded `ShapeGeometry`, so its vertices can visibly bend while keeping the clean page outline and binder holes. The translucent flutter pages use a stronger bend than the main page to make the jump read softer without adding more visible page count noise.
- The page surface is a rigid `ShapeGeometry` with shared rounded corners and binder-hole cutouts, not CSS 3D and not the older deforming `BufferGeometry` path.
- The hinge travels from the right side of the binder gap toward the left side as the page turns, so the end position lines up with the left page.
- The page front uses the same texture as the visible right page, so the flipping page cannot drift in size or layout.
- The page back uses `sb3d_page_back_generated.png`, generated as a standalone page-back surface.
- Page, spine, and tab textures are dedicated generated layers. The runtime art uses full sticker illustrations and real cover artwork, not placeholder sticker-state circles.
- Page textures must not bake in metal rings or ring hardware.
- Page textures include alpha-cut binder holes on the inner edge, so the ring path reads as passing through the page instead of simply sitting above it.
- Page thickness is represented by the visible page texture and shadows. Do not render separate full-page underlay meshes behind the pages; that creates a visibly shifted duplicate sheet.
- The spine is a textured plane rendered below the page and tab layers, so it does not cover the flipping page or page artwork.
- The visible rings are narrow matte 3D half-ring tube meshes created in `main.js`. Page materials write depth, so a lifted/turning page can occlude ring ends while holes still reveal the ring path.
- Side tabs are separate transparent left/right generated layers behind the pages, using `sb3d_side_tabs_left_generated.png` and `sb3d_side_tabs_right_generated.png`.
- Side-tab alpha masks must only cover the colored tab bodies. Do not include the pale Image2 background around the tabs; it reads as shifted bookmark plates.
- Side-tab planes are tucked slightly under the left/right page edges. If the tab mask changes, check the page-edge contact at `?progress=0`, `?progress=0.82`, and `?progress=1`.
- `?book=boy|girl` switches the book variant. `?surface=inside|cover` switches between the sticker spread and a closed-cover-only preview.
- `sticker_book_content_plan.json` is the first content plan for production pages across the current app games. User-facing labels inside that file avoid kanji, classify stickers by view (`sea_friends`, `forest_friends`, `items`, `food`, `sounds`, `letters`, `badges`, `places`), and include sort/tier/unlock metadata so the app can switch views, sort entries, and render locked entries as gray silhouettes. `sticker_book_content_plan.html` renders the same JSON as a readable planning table for quick review.
- As of batch `649`, the current free/book-range games (`quizland`, `maze`, `oto`, `puzzle`, `bento`) each have 10 curated sticker candidates. These entries include `assetStatus`: `existing` uses an existing project image via `assetPath`, while `generate` marks only the missing reward-style images that should be created as new raw art.
- As of batch `652`, the free/book-range sticker candidates are collection-first rather than achievement-first. Forced proof/reward items such as medals, final balloons, generic stars, the maze plank, and the rhythm burst background were removed or replaced. `quizland` now uses the corrected lion asset `assets/images/quizland/illust/stage/lion_osu.png` and the centered bear `assets/images/word/kuma.png` instead of the cut choice images. `puzzle` stays on partner characters plus two generated puzzle-piece candidates, with no unrelated RPG/tablet/bridge assets.
- As of batch `653`, `quizland_kuma` and `quizland_penguin` use the actual in-game choice images (`assets/images/quizland/illust/choice/kuma.png` and `assets/images/quizland/illust/choice/penguin.png`). The weak `maze_rocket` sticker was replaced by `maze_chocho`, and `bento` was expanded with cat/bear lunch boxes, cat/bear rice bases, nori face parts, and cheek parts.
- As of batch `658`, the open inside spread no longer builds game-list pages. `main.js` builds deterministic CanvasTexture free-page templates for both left and right pages, and the book page buttons move by spread pairs (`1-2`, `3-4`, etc.).
- The sticker editor stores prototype page state in `localStorage` under `sb3d_sticker_editor_free_pages_v1`. Each sticker placement records page, sticker id, asset URL, `x`, `y`, `scale`, `rotation`, and `z`. Drawing strokes are stored separately per page as normalized points with pen/eraser, color, and size.
- The editor has two modes: `シール` shows the sticker library from `sticker_book_content_plan.json` and supports click-to-add, drag positioning, scale, rotation, front/back order, and delete; `おえかき` hides the library and shows the existing drawing-game style controls over the same page canvas. The drawing controls use the old drawing palette shape: 15 color swatches, three brush sizes, eraser, stamp picker, rainbow, sparkle, undo, and clear. The `保存` button writes the page state and regenerates the Three.js CanvasTexture for the active spread.
- As of batch `659`, the editor overlay is constrained to a 16:9 shell on desktop/landscape viewports. Portrait mobile keeps the stacked layout so the drawing controls remain scrollable instead of being crushed into a short 16:9 strip.
- As of batch `661`, the editor page preview no longer uses a CSS-only fake grid. It renders the same `1472x1536` CanvasTexture page template used by the Three.js book into a layered template canvas, then draws stickers and pen strokes over it. Drawing brush and stamp sizes are scaled from texture-space, so the saved book page and the editor preview keep the same relative line thickness. On desktop/landscape, transform/drawing controls move into a side rail so the page can use nearly the full vertical height.
- As of batch `662`, the editor has separate responsive shells for wide `16:9`, compact landscape `16:9`, and tablet-like `4:3`. Wide desktop keeps the right-side control rail, while `4:3` and compact landscape use bottom controls so sliders and action buttons do not squeeze the page or overflow. The editor page canvas uses container-size units to preserve the `1472:1536` page ratio regardless of whether width or height is the limiting dimension.
- As of batch `663`, the editor page jump button is labeled as the current page (`ページ 2`) instead of `もくじ`, because the sticker album does not have a real table of contents. Compact control bars use a short selected-sticker chip (`えらんでね` / sticker name) instead of a large instruction sentence, leaving more width for scale, rotation, layer, delete, and save controls.
- As of batch `664`, the sticker editor no longer shows the redundant `シールちょう` title, duplicate page count, or sticker search input. The close button lives in the mode switch row. Drawing controls reuse the existing local drawing-game illustration assets (`assets/images/icons/*` and `assets/images/mojikko/writing/*`) for undo, clear, pen, eraser, stamp, rainbow, sparkle, and stamp choices instead of text/emoji-only buttons.
- As of batch `666`, sticker transform controls moved from the page bottom/right area into the left menu, so the editable page side is dedicated to the canvas. The duplicate page arrows that used to sit over the canvas were removed; page movement is handled only by the left menu page row.
- As of batch `667`, the editor's remaining left-menu page row and selected-sticker instruction chip were removed. Page changes happen from the book view before opening the editor, and the left menu is now mode switch, category picker, library/drawing tools, and transform/save controls only.
- As of batch `668`, sticker drag/scale/rotation updates no longer rebuild the editor canvas DOM. The selected sticker now updates only its CSS variables, which prevents all sticker images from flashing and keeps the cyan selection frame from collapsing while images decode.
- As of batch `669`, the editor, tuning panel, and prototype controls are local-preview only. `?editor=1` / `?edit=1` / `?controls=1` / `?tune=1` work on `localhost`, `127.0.0.1`, `::1`, or `file://`; staging stays a viewer even if those query flags are present.
- As of batch `670`, staging ignores old `progress` / `spread` query values and opens as a flat spread. Book page arrows now trigger the same short flutter/turn animation used by the spread thickness preview, so page changes are visibly animated instead of only changing the page label. Runtime book textures were converted from PNG to WebP, reducing the loaded texture set from about 11.5 MB to about 2.7 MB.
- As of batch `672`, the page arrows animate one sheet and only commit the new spread after that turn finishes. Multi-page flutter is reserved for the center page-jump menu, where jumping several spreads away uses more sheets according to distance.
- Book page navigation now owns the normal thickness position: the round left/right buttons move through actual sticker album spread pairs and update the left/right paper stack balance. The bottom spread dots remain a local tuning preview and are hidden on staging.
- Long term, treat this as the first `sticker_album` book profile rather than a one-off screen. Future books should be added as separate profiles for the bookshelf, such as a sea-creature zukan, forest-creature zukan, or general album. They can share the same book viewer, page navigation, page texture generation, and shelf entry UI while using different page templates and source data.
- The content plan viewer shows the existing `assetPath` images directly on each card, and still falls back to the first label character for generated or missing-art candidates.
- Texture URLs include `ASSET_VERSION` in `main.js`, and `index.html` version-suffixes the module script, so the stable preview URL can stay the same while JS/PNG cache is invalidated.
- `?progress=0.82` can be added to the URL to open at a specific turn amount for screenshots.
- `?tune=1` shows the local tuning panel. In `surface=inside`, it exposes `spread` plus left/right stack X, Y, width scale, and height scale for quick visual alignment before hard-coding final values. Layer offsets are stored per thickness pair in `sb3d_layer_tuning_by_pair_v5`; `empty-full`, `small-mostly`, `half-half`, `mostly-small`, and `full-empty` can each keep different values. In `surface=cover`, it exposes the closed-cover thickness strip and the background-composite backing layer. The panel supports undo/redo and JSON copy output for both modes.

## Verification

Screenshots were captured with Playwright CLI:

```powershell
npx playwright screenshot --browser=chromium '--viewport-size=1280,800' --wait-for-selector=canvas --wait-for-timeout=4000 'http://127.0.0.1:4186/Prototypes/StickerBookThreeJS/?progress=0.82' Prototypes/StickerBookThreeJS/screenshots/desktop.png
npx playwright screenshot --browser=chromium '--viewport-size=390,844' --wait-for-selector=canvas --wait-for-timeout=4000 'http://127.0.0.1:4186/Prototypes/StickerBookThreeJS/?progress=0.82' Prototypes/StickerBookThreeJS/screenshots/mobile.png
python Prototypes/StickerBookThreeJS/verify_screenshots.py
```

Verified outputs:

- `screenshots/desktop.png`
- `screenshots/mobile.png`
- `screenshots/desktop_start.png`
- `screenshots/desktop_end.png`
